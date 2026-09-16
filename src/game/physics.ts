import {
  BALL_D,
  BALL_R,
  BALL_RESTITUTION,
  CUSHION_RESTITUTION,
  CUSHION_TANGENT_RETAIN,
  LINEAR_DAMPING,
  ROLLING_DECEL,
  SIDE_SPIN_CUSHION_TRANSFER,
  SIDE_SPIN_DECAY,
  SPIN_DECAY,
  STOP_SPEED,
  SUBSTEPS,
  TABLE_H,
  TABLE_W,
} from './constants';
import { Ball, createRackedBalls, CUSHIONS, POCKETS } from './table';
import { closestPointOnSegment } from '../utils/vector';

export interface World {
  balls: Ball[];
  time: number;
}

export type PhysicsEvent =
  | { type: 'ballBall'; a: number; b: number; speed: number }
  | { type: 'cushion'; id: number; speed: number }
  | { type: 'pocket'; id: number; pocket: number };

export function createWorld(): World {
  return { balls: createRackedBalls(), time: 0 };
}

export function cloneWorld(world: World): World {
  return { balls: world.balls.map((b) => ({ ...b })), time: world.time };
}

export function cueBall(world: World): Ball {
  return world.balls[0];
}

export function isSettled(world: World): boolean {
  for (const b of world.balls) {
    if (!b.pocketed && (b.vx !== 0 || b.vy !== 0)) return false;
  }
  return true;
}

const BALL_D2 = BALL_D * BALL_D;
const BALL_R2 = BALL_R * BALL_R;
const OUT_MARGIN = 0.07;

/**
 * Advance the world by `dt` seconds using several substeps for stable
 * high-speed collisions. Collision events are appended to `events`.
 */
export function stepWorld(world: World, dt: number, events: PhysicsEvent[]): void {
  const sdt = dt / SUBSTEPS;
  const balls = world.balls;
  const n = balls.length;
  const spinDecay = Math.max(0, 1 - SPIN_DECAY * sdt);
  const sideDecay = Math.max(0, 1 - SIDE_SPIN_DECAY * sdt);
  const damping = Math.max(0, 1 - LINEAR_DAMPING * sdt);

  for (let s = 0; s < SUBSTEPS; s++) {
    // --- integrate ---
    for (let i = 0; i < n; i++) {
      const b = balls[i];
      if (b.pocketed) continue;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 0) {
        let ns = (sp - ROLLING_DECEL * sdt) * damping;
        if (ns < STOP_SPEED) {
          b.vx = 0;
          b.vy = 0;
        } else {
          const k = ns / sp;
          b.vx *= k;
          b.vy *= k;
          b.x += b.vx * sdt;
          b.y += b.vy * sdt;
        }
        b.topSpin *= spinDecay;
        b.omega *= sideDecay;
      }
    }

    // --- ball / ball ---
    for (let i = 0; i < n; i++) {
      const a = balls[i];
      if (a.pocketed) continue;
      for (let j = i + 1; j < n; j++) {
        const b = balls[j];
        if (b.pocketed) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= BALL_D2 || d2 < 1e-12) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;

        // positional correction
        const push = (BALL_D - d) / 2 + 1e-5;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;

        const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rvn >= 0) continue; // separating

        // remember pre-collision direction of any ball carrying follow/draw
        let spinBall: Ball | null = null;
        let sdx = 0;
        let sdy = 0;
        if (a.topSpin !== 0 || b.topSpin !== 0) {
          spinBall = Math.abs(a.topSpin) >= Math.abs(b.topSpin) ? a : b;
          const sp = Math.hypot(spinBall.vx, spinBall.vy);
          if (sp > 1e-9) {
            sdx = spinBall.vx / sp;
            sdy = spinBall.vy / sp;
          } else {
            spinBall = null;
          }
        }

        const jImp = (-(1 + BALL_RESTITUTION) * rvn) / 2;
        a.vx -= jImp * nx;
        a.vy -= jImp * ny;
        b.vx += jImp * nx;
        b.vy += jImp * ny;

        if (spinBall) {
          spinBall.vx += sdx * spinBall.topSpin;
          spinBall.vy += sdy * spinBall.topSpin;
          spinBall.topSpin = 0;
        }

        events.push({ type: 'ballBall', a: a.id, b: b.id, speed: -rvn });
      }
    }

    // --- ball / cushion ---
    for (let i = 0; i < n; i++) {
      const b = balls[i];
      if (b.pocketed) continue;
      for (let k = 0; k < CUSHIONS.length; k++) {
        const seg = CUSHIONS[k];
        const cp = closestPointOnSegment(b.x, b.y, seg.ax, seg.ay, seg.bx, seg.by);
        const dx = b.x - cp.x;
        const dy = b.y - cp.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= BALL_R2 || d2 < 1e-14) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        b.x = cp.x + nx * (BALL_R + 1e-5);
        b.y = cp.y + ny * (BALL_R + 1e-5);

        const vn = b.vx * nx + b.vy * ny;
        if (vn >= 0) continue;

        // split into normal / tangential components
        const tx = b.vx - vn * nx;
        const ty = b.vy - vn * ny;
        const newVn = -vn * CUSHION_RESTITUTION;
        let ntx = tx * CUSHION_TANGENT_RETAIN;
        let nty = ty * CUSHION_TANGENT_RETAIN;

        // side spin: the surface of the ball at the contact point moves along the
        // tangent; the cushion's friction pushes the ball the opposite way.
        if (b.omega !== 0) {
          // contact normal points from cushion into the ball; the point on the
          // ball touching the cushion is at -n. Clockwise rotation (screen coords)
          // moves that point along (-(-n).y, (-n).x) = (n.y, -n.x).
          const sx = ny;
          const sy = -nx;
          const impulse = b.omega * SIDE_SPIN_CUSHION_TRANSFER;
          ntx -= sx * impulse;
          nty -= sy * impulse;
          b.omega *= 0.45;
        }

        b.vx = nx * newVn + ntx;
        b.vy = ny * newVn + nty;
        events.push({ type: 'cushion', id: b.id, speed: -vn });
      }
    }

    // --- pockets ---
    for (let i = 0; i < n; i++) {
      const b = balls[i];
      if (b.pocketed) continue;
      for (let p = 0; p < POCKETS.length; p++) {
        const pk = POCKETS[p];
        const dx = b.x - pk.x;
        const dy = b.y - pk.y;
        if (dx * dx + dy * dy < pk.r * pk.r) {
          pocketBall(b, p, events);
          break;
        }
      }
      if (
        !b.pocketed &&
        (b.x < -OUT_MARGIN || b.x > TABLE_W + OUT_MARGIN || b.y < -OUT_MARGIN || b.y > TABLE_H + OUT_MARGIN)
      ) {
        // Escaped through a jaw gap: drop it into the nearest pocket.
        let best = 0;
        let bestD = Infinity;
        for (let p = 0; p < POCKETS.length; p++) {
          const dd = Math.hypot(b.x - POCKETS[p].x, b.y - POCKETS[p].y);
          if (dd < bestD) {
            bestD = dd;
            best = p;
          }
        }
        pocketBall(b, best, events);
      }
    }
  }

  world.time += dt;
}

function pocketBall(b: Ball, pocket: number, events: PhysicsEvent[]) {
  b.pocketed = true;
  b.vx = 0;
  b.vy = 0;
  b.topSpin = 0;
  b.omega = 0;
  b.x = POCKETS[pocket].x;
  b.y = POCKETS[pocket].y;
  events.push({ type: 'pocket', id: b.id, pocket });
}
