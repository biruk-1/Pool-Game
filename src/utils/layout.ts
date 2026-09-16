import { RAIL_W, TABLE_H, TABLE_W } from '../game/constants';

/** Maps world units (playing surface = 1 × 2) into canvas pixels. */
export interface TableLayout {
  /** Canvas size in pixels. */
  width: number;
  height: number;
  /** Pixel position of world (0, 0) — the top-left corner of the felt. */
  originX: number;
  originY: number;
  /** Pixels per world unit. */
  scale: number;
}

export function computeLayout(width: number, height: number): TableLayout {
  const totalW = TABLE_W + RAIL_W * 2;
  const totalH = TABLE_H + RAIL_W * 2;
  const scale = Math.max(1, Math.min(width / totalW, height / totalH));
  const originX = (width - TABLE_W * scale) / 2;
  const originY = (height - TABLE_H * scale) / 2;
  return { width, height, originX, originY, scale };
}

export const toScreenX = (l: TableLayout, x: number) => l.originX + x * l.scale;
export const toScreenY = (l: TableLayout, y: number) => l.originY + y * l.scale;
export const toWorldX = (l: TableLayout, px: number) => (px - l.originX) / l.scale;
export const toWorldY = (l: TableLayout, py: number) => (py - l.originY) / l.scale;
