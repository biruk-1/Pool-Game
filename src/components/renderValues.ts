import { SharedValue, useSharedValue } from 'react-native-reanimated';
import { BALL_R } from '../game/constants';
import { GameEngine } from '../game/engine';
import { STUB_LENGTH } from '../game/trajectory';
import { TableLayout, toScreenX, toScreenY } from '../utils/layout';

/**
 * Everything the Skia canvas needs, published from the JS game loop into
 * Reanimated shared values so the UI thread can redraw without React re-renders.
 * All coordinates are already in canvas pixels.
 */
export interface AimRender {
  cx: number;
  cy: number;
  angle: number;
  power: number;
  showCue: boolean;
  ballInHand: boolean;
}

export interface TrajectoryRender {
  visible: boolean;
  /** Flat [x0, y0, x1, y1, ...] polyline for the cue ball path. */
  pts: number[];
  ghost: [number, number] | null;
  object: [number, number, number, number] | null;
  cue: [number, number, number, number] | null;
  pocket: [number, number] | null;
}

export interface RenderValues {
  /** Flat [x, y, visible] per ball, 16 balls. */
  balls: SharedValue<number[]>;
  aim: SharedValue<AimRender>;
  trajectory: SharedValue<TrajectoryRender>;
}

export const HIDDEN_TRAJECTORY: TrajectoryRender = {
  visible: false,
  pts: [],
  ghost: null,
  object: null,
  cue: null,
  pocket: null,
};

export function useRenderValues(): RenderValues {
  const balls = useSharedValue<number[]>(new Array(48).fill(0));
  const aim = useSharedValue<AimRender>({ cx: 0, cy: 0, angle: -Math.PI / 2, power: 0, showCue: false, ballInHand: false });
  const trajectory = useSharedValue<TrajectoryRender>(HIDDEN_TRAJECTORY);
  return { balls, aim, trajectory };
}

export interface PublishOptions {
  canAim: boolean;
  ballInHand: boolean;
  showGuide: boolean;
}

export function publishRender(engine: GameEngine, layout: TableLayout, values: RenderValues, opts: PublishOptions): void {
  const world = engine.world;
  const arr: number[] = new Array(world.balls.length * 3);
  for (let i = 0; i < world.balls.length; i++) {
    const b = world.balls[i];
    arr[i * 3] = toScreenX(layout, b.x);
    arr[i * 3 + 1] = toScreenY(layout, b.y);
    arr[i * 3 + 2] = b.pocketed ? 0 : 1;
  }
  values.balls.value = arr;

  const cue = world.balls[0];
  const cx = toScreenX(layout, cue.x);
  const cy = toScreenY(layout, cue.y);
  values.aim.value = {
    cx,
    cy,
    angle: engine.aim.angle,
    power: engine.aim.power,
    showCue: opts.canAim && !cue.pocketed,
    ballInHand: opts.canAim && opts.ballInHand && !cue.pocketed,
  };

  if (!opts.canAim || !opts.showGuide || cue.pocketed) {
    if (values.trajectory.value.visible) values.trajectory.value = HIDDEN_TRAJECTORY;
    return;
  }

  const t = engine.trajectory();
  if (!t) {
    values.trajectory.value = HIDDEN_TRAJECTORY;
    return;
  }
  const pts: number[] = [];
  const rPx = BALL_R * layout.scale;
  for (let i = 0; i < t.points.length; i++) {
    let px = toScreenX(layout, t.points[i].x);
    let py = toScreenY(layout, t.points[i].y);
    if (i === 0 && t.points.length > 1) {
      // start the guide at the edge of the cue ball rather than its center
      const nx = toScreenX(layout, t.points[1].x) - px;
      const ny = toScreenY(layout, t.points[1].y) - py;
      const d = Math.hypot(nx, ny);
      if (d > rPx) {
        px += (nx / d) * rPx;
        py += (ny / d) * rPx;
      }
    }
    pts.push(px, py);
  }

  let ghost: TrajectoryRender['ghost'] = null;
  let object: TrajectoryRender['object'] = null;
  let cueStub: TrajectoryRender['cue'] = null;
  if (t.hit) {
    ghost = [toScreenX(layout, t.hit.ghost.x), toScreenY(layout, t.hit.ghost.y)];
    const target = world.balls.find((b) => b.id === t.hit!.ballId);
    if (target) {
      const len = STUB_LENGTH * (0.35 + 0.65 * t.hit.objectStrength) * layout.scale;
      const ox = toScreenX(layout, target.x) + t.hit.objectDir.x * rPx;
      const oy = toScreenY(layout, target.y) + t.hit.objectDir.y * rPx;
      object = [ox, oy, ox + t.hit.objectDir.x * len, oy + t.hit.objectDir.y * len];
    }
    if (t.hit.cueStrength > 0.05) {
      const len = STUB_LENGTH * 0.8 * t.hit.cueStrength * layout.scale;
      cueStub = [ghost[0], ghost[1], ghost[0] + t.hit.cueDir.x * len, ghost[1] + t.hit.cueDir.y * len];
    }
  }
  const last = t.points[t.points.length - 1];
  values.trajectory.value = {
    visible: true,
    pts,
    ghost,
    object,
    cue: cueStub,
    pocket: t.pocket !== null ? [toScreenX(layout, last.x), toScreenY(layout, last.y)] : null,
  };
}
