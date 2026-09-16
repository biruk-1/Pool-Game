export interface Vec {
  x: number;
  y: number;
}

export const vec = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
export const len = (a: Vec): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

export const norm = (a: Vec): Vec => {
  const l = Math.hypot(a.x, a.y);
  return l > 1e-12 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
};

/** Perpendicular pointing to the right of `a` in screen coordinates (y down). */
export const rightPerp = (a: Vec): Vec => ({ x: -a.y, y: a.x });

export const fromAngle = (angle: number): Vec => ({ x: Math.cos(angle), y: Math.sin(angle) });
export const angleOf = (a: Vec): number => Math.atan2(a.y, a.x);

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** Reflect direction `d` about unit normal `n`. */
export const reflect = (d: Vec, n: Vec): Vec => {
  const k = 2 * dot(d, n);
  return { x: d.x - k * n.x, y: d.y - k * n.y };
};

/** Wrap an angle to (-PI, PI]. */
export const wrapAngle = (a: number): number => {
  let r = a % (Math.PI * 2);
  if (r <= -Math.PI) r += Math.PI * 2;
  if (r > Math.PI) r -= Math.PI * 2;
  return r;
};

/** Closest point on segment AB to point P. */
export const closestPointOnSegment = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): Vec => {
  const abx = bx - ax;
  const aby = by - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-12) return { x: ax, y: ay };
  let t = ((px - ax) * abx + (py - ay) * aby) / ab2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { x: ax + abx * t, y: ay + aby * t };
};

/**
 * Ray / circle intersection. Returns the smallest positive t such that
 * |o + d t - c| = r, or null when the ray misses (or starts inside).
 */
export const rayCircle = (o: Vec, d: Vec, c: Vec, r: number): number | null => {
  const fx = o.x - c.x;
  const fy = o.y - c.y;
  const b = 2 * (fx * d.x + fy * d.y);
  const cc = fx * fx + fy * fy - r * r;
  if (cc < 0) return null; // starts inside
  const disc = b * b - 4 * cc;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / 2;
  return t > 1e-9 ? t : null;
};

/**
 * Ray / capsule intersection: the point where a circle of radius `r` moving
 * along the ray first touches segment AB. Returns { t, normal } or null.
 */
export const rayCapsule = (
  o: Vec,
  d: Vec,
  a: Vec,
  b: Vec,
  r: number,
): { t: number; normal: Vec } | null => {
  let best: { t: number; normal: Vec } | null = null;
  const ab = sub(b, a);
  const abLen = len(ab);
  if (abLen < 1e-9) return null;
  const u = scale(ab, 1 / abLen);
  const n = { x: -u.y, y: u.x };

  // Two offset lines at ±r
  for (const s of [1, -1]) {
    const off = scale(n, r * s);
    const a2 = add(a, off);
    const denom = d.x * n.x + d.y * n.y;
    if (Math.abs(denom) < 1e-12) continue;
    const t = ((a2.x - o.x) * n.x + (a2.y - o.y) * n.y) / denom;
    if (t <= 1e-9) continue;
    const hit = add(o, scale(d, t));
    const proj = dot(sub(hit, a2), u);
    if (proj < 0 || proj > abLen) continue;
    if (!best || t < best.t) best = { t, normal: scale(n, s) };
  }
  // End caps
  for (const p of [a, b]) {
    const t = rayCircle(o, d, p, r);
    if (t !== null && (!best || t < best.t)) {
      const hit = add(o, scale(d, t));
      best = { t, normal: norm(sub(hit, p)) };
    }
  }
  return best;
};
