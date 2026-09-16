import { MutableRefObject, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { BALL_R } from '../game/constants';
import { GameEngine } from '../game/engine';
import { cueBall } from '../game/physics';
import { PlacementRegion } from '../game/table';
import { TableLayout, toScreenX, toScreenY, toWorldX, toWorldY } from '../utils/layout';
import { wrapAngle } from '../utils/vector';

export interface InteractionState {
  /** Whether the player may aim / place the cue ball right now. */
  canAim: boolean;
  ballInHand: 'none' | PlacementRegion;
}

/**
 * Touch handling on the table:
 *  - drag anywhere: rotate the aim around the cue ball (relative rotation, so
 *    dragging far from the ball gives fine control)
 *  - tap: point the cue straight at the tapped spot (coarse aim)
 *  - drag starting on the cue ball while "ball in hand": move the cue ball
 */
export function useCueGesture(
  engine: GameEngine,
  layoutRef: MutableRefObject<TableLayout>,
  stateRef: MutableRefObject<InteractionState>,
  onInteract?: () => void,
) {
  const mode = useRef<'none' | 'aim' | 'place'>('none');
  const prevAngle = useRef(0);
  const grabOffset = useRef({ x: 0, y: 0 });

  return useMemo(() => {
    const cueScreen = () => {
      const l = layoutRef.current;
      const c = cueBall(engine.world);
      return { x: toScreenX(l, c.x), y: toScreenY(l, c.y) };
    };

    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(3)
      .maxPointers(1)
      .onBegin((e) => {
        const st = stateRef.current;
        if (!st.canAim) {
          mode.current = 'none';
          return;
        }
        const c = cueScreen();
        const l = layoutRef.current;
        const dx = e.x - c.x;
        const dy = e.y - c.y;
        const grabRadius = Math.max(30, BALL_R * l.scale * 2.4);
        if (st.ballInHand !== 'none' && Math.hypot(dx, dy) <= grabRadius) {
          mode.current = 'place';
          grabOffset.current = { x: c.x - e.x, y: c.y - e.y };
        } else {
          mode.current = 'aim';
          prevAngle.current = Math.atan2(dy, dx);
        }
      })
      .onUpdate((e) => {
        const st = stateRef.current;
        if (!st.canAim || mode.current === 'none') return;
        const l = layoutRef.current;
        if (mode.current === 'place') {
          const region = st.ballInHand === 'none' ? 'anywhere' : st.ballInHand;
          engine.placeCueBall(
            toWorldX(l, e.x + grabOffset.current.x),
            toWorldY(l, e.y + grabOffset.current.y),
            region,
          );
          onInteract?.();
          return;
        }
        const c = cueScreen();
        const dx = e.x - c.x;
        const dy = e.y - c.y;
        if (Math.hypot(dx, dy) < 24) return; // too close to the ball for stable rotation
        const cur = Math.atan2(dy, dx);
        const delta = wrapAngle(cur - prevAngle.current);
        prevAngle.current = cur;
        engine.setAngle(wrapAngle(engine.aim.angle + delta));
        onInteract?.();
      })
      .onFinalize(() => {
        mode.current = 'none';
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(220)
      .maxDistance(6)
      .onEnd((e) => {
        const st = stateRef.current;
        if (!st.canAim) return;
        const c = cueScreen();
        const dx = e.x - c.x;
        const dy = e.y - c.y;
        if (Math.hypot(dx, dy) < 30) return;
        engine.setAngle(Math.atan2(dy, dx));
        onInteract?.();
      });

    return Gesture.Race(pan, tap);
  }, [engine, layoutRef, stateRef, onInteract]);
}
