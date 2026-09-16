import { useEffect, useRef } from 'react';

/**
 * Runs `onFrame(dtSeconds)` every animation frame while `active` is true.
 * The callback is kept in a ref so the loop never has to restart.
 */
export function useGameLoop(active: boolean, onFrame: (dt: number) => void): void {
  const cb = useRef(onFrame);
  cb.current = onFrame;

  useEffect(() => {
    if (!active) return;
    let handle = 0;
    let last = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      const dt = last === 0 ? 1 / 60 : Math.min(0.1, (now - last) / 1000);
      last = now;
      cb.current(dt);
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(handle);
    };
  }, [active]);
}
