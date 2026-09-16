/**
 * World units: the playing surface is 1 unit wide (short side) and 2 units long.
 * All physics constants are expressed in these units (a 9ft table is ~1.27m wide,
 * so 1 unit ≈ 1.27m). Screen coordinates are derived by a single scale factor.
 *
 * Coordinate system matches the screen: +x right, +y down. The head (break) end
 * of the table is at the bottom (y = 2), the foot (rack) end at the top (y = 0).
 */

export const TABLE_W = 1;
export const TABLE_H = 2;

/** Ball radius: 2.25" diameter on a 50" wide playing surface. */
export const BALL_R = 0.045;
export const BALL_D = BALL_R * 2;

/** Visual rail (wood) width around the playing surface. */
export const RAIL_W = 0.11;

/** Pocket geometry */
export const CORNER_MOUTH = 0.1; // gap along each side at a corner pocket
export const SIDE_MOUTH = 0.125; // width of a side pocket mouth
export const JAW_DEPTH = 0.05; // how far jaw segments run outward
export const CORNER_POCKET_OFFSET = 0.03; // pocket center offset outside the corner
export const SIDE_POCKET_OFFSET = 0.05; // pocket center offset outside the side rail
export const CORNER_CAPTURE_R = 0.095;
export const SIDE_CAPTURE_R = 0.09;

/** Spots */
export const FOOT_SPOT = { x: 0.5, y: 0.5 };
export const HEAD_SPOT = { x: 0.5, y: 1.5 };
export const HEAD_STRING_Y = 1.5;

/** Simulation */
export const FIXED_DT = 1 / 120;
export const SUBSTEPS = 4;
export const MAX_STEPS_PER_FRAME = 6;

/** Ball motion */
export const MAX_SHOT_SPEED = 7.5; // units / s at 100% power
export const MIN_SHOT_SPEED = 0.35;
export const ROLLING_DECEL = 0.4; // constant deceleration from cloth friction, units / s²
export const LINEAR_DAMPING = 0.22; // proportional damping, 1 / s
export const STOP_SPEED = 0.025; // below this the ball is snapped to rest

/** Collisions */
export const BALL_RESTITUTION = 0.94;
export const CUSHION_RESTITUTION = 0.72;
export const CUSHION_TANGENT_RETAIN = 0.88;

/** Spin (english) */
export const TOP_SPIN_FACTOR = 0.45; // follow/draw speed as fraction of shot speed
export const SIDE_SPIN_FACTOR = 0.45; // surface speed as fraction of shot speed
export const SIDE_SPIN_CUSHION_TRANSFER = 0.5;
export const SPIN_DECAY = 0.45; // 1 / s
export const SIDE_SPIN_DECAY = 0.25; // 1 / s

/** Trajectory prediction */
export const TRAJECTORY_MAX_BOUNCES = 3;
export const TRAJECTORY_MAX_LENGTH = 4.5;
export const TRAJECTORY_STUB_LENGTH = 0.32;

/** Colors */
export const COLORS = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#111C31',
  border: 'rgba(255,255,255,0.10)',
  glass: 'rgba(255,255,255,0.06)',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  accent: '#06B6D4',
  accentSoft: 'rgba(6,182,212,0.25)',
  danger: '#F87171',
  success: '#34D399',
  feltGreen: '#059669',
  feltCharcoal: '#334155',
  rail: '#1E293B',
  railEdge: '#0B1120',
  pocket: '#020617',
} as const;

export const BALL_COLORS: Record<number, string> = {
  0: '#F8FAFC',
  1: '#FACC15',
  2: '#2563EB',
  3: '#EF4444',
  4: '#7C3AED',
  5: '#F97316',
  6: '#16A34A',
  7: '#9F1239',
  8: '#0B0F19',
  9: '#FACC15',
  10: '#2563EB',
  11: '#EF4444',
  12: '#7C3AED',
  13: '#F97316',
  14: '#16A34A',
  15: '#9F1239',
};

export const isSolid = (id: number) => id >= 1 && id <= 7;
export const isStripe = (id: number) => id >= 9 && id <= 15;
