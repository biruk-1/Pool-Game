import {
  BALL_D,
  BALL_R,
  CORNER_CAPTURE_R,
  CORNER_MOUTH,
  CORNER_POCKET_OFFSET,
  FOOT_SPOT,
  HEAD_SPOT,
  HEAD_STRING_Y,
  JAW_DEPTH,
  SIDE_CAPTURE_R,
  SIDE_MOUTH,
  SIDE_POCKET_OFFSET,
  TABLE_H,
  TABLE_W,
} from './constants';

export interface Segment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

export interface Pocket {
  x: number;
  y: number;
  r: number;
  kind: 'corner' | 'side';
}

export interface Ball {
  id: number; // 0 = cue ball, 1..15 object balls
  x: number;
  y: number;
  vx: number;
  vy: number;
  pocketed: boolean;
  /** Follow (+) / draw (−) carried by the ball, in velocity units. Applied on first ball contact. */
  topSpin: number;
  /** Signed surface speed from side spin (clockwise positive in screen coords). */
  omega: number;
}

const c = CORNER_POCKET_OFFSET;
const s = SIDE_POCKET_OFFSET;

export const POCKETS: readonly Pocket[] = [
  { x: -c, y: -c, r: CORNER_CAPTURE_R, kind: 'corner' },
  { x: TABLE_W + c, y: -c, r: CORNER_CAPTURE_R, kind: 'corner' },
  { x: -s, y: TABLE_H / 2, r: SIDE_CAPTURE_R, kind: 'side' },
  { x: TABLE_W + s, y: TABLE_H / 2, r: SIDE_CAPTURE_R, kind: 'side' },
  { x: -c, y: TABLE_H + c, r: CORNER_CAPTURE_R, kind: 'corner' },
  { x: TABLE_W + c, y: TABLE_H + c, r: CORNER_CAPTURE_R, kind: 'corner' },
];

function buildCushions(): Segment[] {
  const W = TABLE_W;
  const H = TABLE_H;
  const cm = CORNER_MOUTH;
  const sm = SIDE_MOUTH / 2;
  const j = JAW_DEPTH;
  const sj = JAW_DEPTH * 0.45; // side pocket jaws open less steeply
  const midY = H / 2;

  const seg = (ax: number, ay: number, bx: number, by: number): Segment => ({ ax, ay, bx, by });

  return [
    // Left rail (two halves)
    seg(0, cm, 0, midY - sm),
    seg(0, midY + sm, 0, H - cm),
    // Right rail
    seg(W, cm, W, midY - sm),
    seg(W, midY + sm, W, H - cm),
    // Top (foot) rail
    seg(cm, 0, W - cm, 0),
    // Bottom (head) rail
    seg(cm, H, W - cm, H),

    // Corner jaws (angled 45° outward into the pockets)
    seg(0, cm, -j, cm - j),
    seg(cm, 0, cm - j, -j),
    seg(W, cm, W + j, cm - j),
    seg(W - cm, 0, W - cm + j, -j),
    seg(0, H - cm, -j, H - cm + j),
    seg(cm, H, cm - j, H + j),
    seg(W, H - cm, W + j, H - cm + j),
    seg(W - cm, H, W - cm + j, H + j),

    // Side pocket jaws
    seg(0, midY - sm, -j, midY - sm - sj),
    seg(0, midY + sm, -j, midY + sm + sj),
    seg(W, midY - sm, W + j, midY - sm - sj),
    seg(W, midY + sm, W + j, midY + sm + sj),
  ];
}

export const CUSHIONS: readonly Segment[] = buildCushions();

/** Standard 8-ball rack, apex first. Corners of the back row are one solid & one stripe. */
const RACK_ROWS: number[][] = [[1], [9, 2], [10, 8, 3], [4, 14, 7, 11], [12, 6, 15, 13, 5]];

export function makeBall(id: number, x: number, y: number): Ball {
  return { id, x, y, vx: 0, vy: 0, pocketed: false, topSpin: 0, omega: 0 };
}

export function createRackedBalls(): Ball[] {
  const balls: Ball[] = [makeBall(0, HEAD_SPOT.x, HEAD_SPOT.y)];
  const spacing = BALL_D * 1.003;
  const rowH = spacing * Math.cos(Math.PI / 6);
  RACK_ROWS.forEach((row, k) => {
    const y = FOOT_SPOT.y - k * rowH;
    row.forEach((id, i) => {
      const x = FOOT_SPOT.x + (i - k / 2) * spacing;
      balls.push(makeBall(id, x, y));
    });
  });
  balls.sort((a, b) => a.id - b.id);
  return balls;
}

export type PlacementRegion = 'anywhere' | 'kitchen';

/** Clamp a point into the region the cue ball is allowed to be placed in. */
export function clampToRegion(x: number, y: number, region: PlacementRegion) {
  const minX = BALL_R + 0.002;
  const maxX = TABLE_W - BALL_R - 0.002;
  const maxY = TABLE_H - BALL_R - 0.002;
  const minY = region === 'kitchen' ? HEAD_STRING_Y : BALL_R + 0.002;
  return {
    x: x < minX ? minX : x > maxX ? maxX : x,
    y: y < minY ? minY : y > maxY ? maxY : y,
  };
}

export function overlapsAnyBall(balls: readonly Ball[], x: number, y: number, ignoreId: number): boolean {
  for (const b of balls) {
    if (b.pocketed || b.id === ignoreId) continue;
    if (Math.hypot(b.x - x, b.y - y) < BALL_D) return true;
  }
  return false;
}

/**
 * Find a free spot for re-spotting a ball: the foot spot, or the nearest point
 * on the long center line toward the foot rail, then toward the head.
 */
export function findRespotPosition(balls: readonly Ball[], id: number) {
  const tryPos = (x: number, y: number) => !overlapsAnyBall(balls, x, y, id);
  if (tryPos(FOOT_SPOT.x, FOOT_SPOT.y)) return { ...FOOT_SPOT };
  for (let k = 1; k < 60; k++) {
    const up = FOOT_SPOT.y - k * BALL_D * 0.55;
    if (up > BALL_R && tryPos(FOOT_SPOT.x, up)) return { x: FOOT_SPOT.x, y: up };
    const down = FOOT_SPOT.y + k * BALL_D * 0.55;
    if (down < TABLE_H - BALL_R && tryPos(FOOT_SPOT.x, down)) return { x: FOOT_SPOT.x, y: down };
  }
  return { ...FOOT_SPOT };
}
