import { BALL_D, BALL_R, TRAJECTORY_MAX_BOUNCES, TRAJECTORY_MAX_LENGTH, TRAJECTORY_STUB_LENGTH } from './constants';
import { World } from './physics';
import { CUSHIONS, POCKETS } from './table';
import { add, dot, norm, rayCapsule, rayCircle, reflect, scale, sub, Vec } from '../utils/vector';

export interface Trajectory {
  /** Cue ball path, starting at the cue ball center (world units). */
  points: Vec[];
  /** Ghost-ball position and hit info when the path ends on an object ball. */
  hit: {
    ballId: number;
    ghost: Vec;
    objectDir: Vec;
    objectStrength: number; // 0..1 fraction of energy transferred
    cueDir: Vec;
    cueStrength: number;
  } | null;
  /** Set when the cue ball path ends in a pocket. */
  pocket: number | null;
}

/**
 * Predict the cue ball's path by ray casting a circle of radius BALL_R through
 * the static scene: other balls (as circles of radius 2R), cushions (as capsules)
 * and pockets. Cloth friction is ignored; the guide only shows direction.
 */
export function predictTrajectory(world: World, dir: Vec): Trajectory {
  const cue = world.balls[0];
  let origin: Vec = { x: cue.x, y: cue.y };
  let d = norm(dir);
  const points: Vec[] = [origin];
  let remaining = TRAJECTORY_MAX_LENGTH;
  let bounces = 0;

  while (remaining > 0 && bounces <= TRAJECTORY_MAX_BOUNCES) {
    let bestT = remaining;
    let kind: 'none' | 'ball' | 'cushion' | 'pocket' = 'none';
    let hitBallId = -1;
    let hitNormal: Vec = { x: 0, y: 0 };
    let hitPocket = -1;

    for (const b of world.balls) {
      if (b.id === 0 || b.pocketed) continue;
      const t = rayCircle(origin, d, { x: b.x, y: b.y }, BALL_D);
      if (t !== null && t < bestT) {
        bestT = t;
        kind = 'ball';
        hitBallId = b.id;
      }
    }

    for (let i = 0; i < POCKETS.length; i++) {
      const p = POCKETS[i];
      const t = rayCircle(origin, d, { x: p.x, y: p.y }, p.r);
      if (t !== null && t < bestT) {
        bestT = t;
        kind = 'pocket';
        hitPocket = i;
      }
    }

    for (const seg of CUSHIONS) {
      const r = rayCapsule(origin, d, { x: seg.ax, y: seg.ay }, { x: seg.bx, y: seg.by }, BALL_R);
      if (r && r.t < bestT) {
        bestT = r.t;
        kind = 'cushion';
        hitNormal = r.normal;
      }
    }

    const end = add(origin, scale(d, bestT));
    points.push(end);
    remaining -= bestT;

    if (kind === 'ball') {
      const target = world.balls.find((b) => b.id === hitBallId)!;
      const n = norm(sub({ x: target.x, y: target.y }, end));
      const along = dot(d, n); // 0..1
      const objectDir = n;
      const cueDirRaw = sub(d, scale(n, along));
      const cueStrength = Math.sqrt(Math.max(0, 1 - along * along));
      return {
        points,
        hit: {
          ballId: hitBallId,
          ghost: end,
          objectDir,
          objectStrength: Math.max(0, along),
          cueDir: cueStrength > 1e-4 ? norm(cueDirRaw) : { x: 0, y: 0 },
          cueStrength,
        },
        pocket: null,
      };
    }
    if (kind === 'pocket') {
      return { points, hit: null, pocket: hitPocket };
    }
    if (kind === 'none') {
      return { points, hit: null, pocket: null };
    }

    // cushion bounce
    d = norm(reflect(d, hitNormal));
    origin = end;
    bounces++;
  }

  return { points, hit: null, pocket: null };
}

export const STUB_LENGTH = TRAJECTORY_STUB_LENGTH;
