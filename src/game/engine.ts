import {
  FIXED_DT,
  HEAD_SPOT,
  MAX_SHOT_SPEED,
  MAX_STEPS_PER_FRAME,
  MIN_SHOT_SPEED,
  SIDE_SPIN_FACTOR,
  TOP_SPIN_FACTOR,
} from './constants';
import { cloneWorld, createWorld, cueBall, isSettled, PhysicsEvent, stepWorld, World } from './physics';
import { clampToRegion, findRespotPosition, overlapsAnyBall, PlacementRegion } from './table';
import { predictTrajectory, Trajectory } from './trajectory';
import { ShotSummary } from '../store/rules';
import { fromAngle } from '../utils/vector';

export interface AimState {
  /** Direction the cue ball will travel, radians (screen coords, y down). */
  angle: number;
  /** 0..1 pull-back power. */
  power: number;
  /** -1..1, positive = topspin (follow). */
  spinTop: number;
  /** -1..1, positive = right english. */
  spinSide: number;
}

interface ShotTracker {
  firstContact: number | null;
  cushionAfterContact: boolean;
  pocketed: number[];
  cueScratched: boolean;
  railBalls: Set<number>;
}

/**
 * Owns the mutable physics world and everything that changes at frame rate.
 * React only reads from it (through shared values) and issues commands.
 */
export class GameEngine {
  world: World = createWorld();
  aim: AimState = { angle: -Math.PI / 2, power: 0, spinTop: 0, spinSide: 0 };
  /** Set whenever something visible changed and the renderer should re-publish. */
  dirty = true;
  private accumulator = 0;
  private tracker: ShotTracker | null = null;
  private history: World[] = [];
  private lastTrajectory: Trajectory | null = null;
  private trajectoryDirty = true;

  reset(): void {
    this.world = createWorld();
    this.aim = { angle: -Math.PI / 2, power: 0, spinTop: 0, spinSide: 0 };
    this.history = [];
    this.tracker = null;
    this.accumulator = 0;
    this.markDirty();
  }

  markDirty(): void {
    this.dirty = true;
    this.trajectoryDirty = true;
  }

  isMoving(): boolean {
    return !isSettled(this.world);
  }

  setAngle(angle: number): void {
    if (angle !== this.aim.angle) {
      this.aim.angle = angle;
      this.markDirty();
    }
  }

  setPower(power: number): void {
    const p = Math.max(0, Math.min(1, power));
    if (p !== this.aim.power) {
      this.aim.power = p;
      this.dirty = true;
    }
  }

  setSpin(top: number, side: number): void {
    this.aim.spinTop = Math.max(-1, Math.min(1, top));
    this.aim.spinSide = Math.max(-1, Math.min(1, side));
    this.dirty = true;
  }

  /** Try to move the cue ball (ball in hand). Returns true when the position is legal. */
  placeCueBall(x: number, y: number, region: PlacementRegion): boolean {
    const p = clampToRegion(x, y, region);
    if (overlapsAnyBall(this.world.balls, p.x, p.y, 0)) return false;
    const cue = cueBall(this.world);
    cue.x = p.x;
    cue.y = p.y;
    cue.vx = 0;
    cue.vy = 0;
    cue.pocketed = false;
    this.markDirty();
    return true;
  }

  /** Put the cue ball back after a scratch, ready for placement. */
  resetCueBall(region: PlacementRegion): void {
    const cue = cueBall(this.world);
    const start = region === 'kitchen' ? { ...HEAD_SPOT } : { x: 0.5, y: 1.25 };
    let pos = clampToRegion(start.x, start.y, region);
    if (overlapsAnyBall(this.world.balls, pos.x, pos.y, 0)) {
      // slide down the center line until a free spot is found
      for (let k = 1; k < 40; k++) {
        const cand = clampToRegion(start.x, start.y + k * 0.05, region);
        if (!overlapsAnyBall(this.world.balls, cand.x, cand.y, 0)) {
          pos = cand;
          break;
        }
      }
    }
    cue.pocketed = false;
    cue.x = pos.x;
    cue.y = pos.y;
    cue.vx = 0;
    cue.vy = 0;
    this.markDirty();
  }

  respotBall(id: number): void {
    const ball = this.world.balls.find((b) => b.id === id);
    if (!ball) return;
    const pos = findRespotPosition(this.world.balls, id);
    ball.pocketed = false;
    ball.x = pos.x;
    ball.y = pos.y;
    ball.vx = 0;
    ball.vy = 0;
    this.markDirty();
  }

  shoot(power: number): boolean {
    if (this.isMoving()) return false;
    const p = Math.max(0, Math.min(1, power));
    if (p <= 0.02) return false;
    this.history.push(cloneWorld(this.world));
    if (this.history.length > 20) this.history.shift();

    const cue = cueBall(this.world);
    const speed = MIN_SHOT_SPEED + (MAX_SHOT_SPEED - MIN_SHOT_SPEED) * p * p; // quadratic feel
    const d = fromAngle(this.aim.angle);
    cue.vx = d.x * speed;
    cue.vy = d.y * speed;
    cue.topSpin = this.aim.spinTop * TOP_SPIN_FACTOR * speed;
    cue.omega = -this.aim.spinSide * SIDE_SPIN_FACTOR * speed;

    this.tracker = {
      firstContact: null,
      cushionAfterContact: false,
      pocketed: [],
      cueScratched: false,
      railBalls: new Set(),
    };
    this.aim.power = 0;
    this.aim.spinTop = 0;
    this.aim.spinSide = 0;
    this.accumulator = 0;
    this.markDirty();
    return true;
  }

  /** Advance the simulation with a fixed timestep. Returns the events that occurred. */
  update(dtSeconds: number): PhysicsEvent[] {
    const events: PhysicsEvent[] = [];
    if (!this.isMoving()) return events;
    this.accumulator += Math.min(dtSeconds, 0.1);
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      stepWorld(this.world, FIXED_DT, events);
      this.accumulator -= FIXED_DT;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
    if (events.length) this.track(events);
    this.markDirty();
    return events;
  }

  private track(events: PhysicsEvent[]): void {
    const t = this.tracker;
    if (!t) return;
    for (const e of events) {
      if (e.type === 'ballBall') {
        if (t.firstContact === null && (e.a === 0 || e.b === 0)) t.firstContact = e.a === 0 ? e.b : e.a;
      } else if (e.type === 'cushion') {
        if (e.id !== 0) t.railBalls.add(e.id);
        if (t.firstContact !== null) t.cushionAfterContact = true;
      } else if (e.type === 'pocket') {
        t.pocketed.push(e.id);
        if (e.id === 0) t.cueScratched = true;
      }
    }
  }

  /** Call once the balls have stopped to collect the shot summary. */
  finishShot(): ShotSummary {
    const t = this.tracker ?? {
      firstContact: null,
      cushionAfterContact: false,
      pocketed: [],
      cueScratched: false,
      railBalls: new Set<number>(),
    };
    this.tracker = null;
    return {
      pocketed: t.pocketed,
      firstContact: t.firstContact,
      cushionAfterContact: t.cushionAfterContact,
      cueScratched: t.cueScratched,
      ballsToRail: t.railBalls.size,
    };
  }

  canUndo(): boolean {
    return this.history.length > 0 && !this.isMoving();
  }

  undo(): boolean {
    const prev = this.history.pop();
    if (!prev) return false;
    this.world = prev;
    this.tracker = null;
    this.markDirty();
    return true;
  }

  trajectory(): Trajectory | null {
    if (!this.trajectoryDirty && this.lastTrajectory) return this.lastTrajectory;
    if (cueBall(this.world).pocketed) return null;
    this.lastTrajectory = predictTrajectory(this.world, fromAngle(this.aim.angle));
    this.trajectoryDirty = false;
    return this.lastTrajectory;
  }
}

/** Single engine instance shared for the app session (lets Home resume a game). */
export const engine = new GameEngine();
