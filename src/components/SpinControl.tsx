import React, { memo, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { COLORS } from '../game/constants';

interface Props {
  size?: number;
  enabled: boolean;
  onChange: (top: number, side: number) => void;
}

/**
 * Cue-ball "english" picker. Drag the contact point: up = topspin (follow),
 * down = backspin (draw), left/right = side spin.
 */
export const SpinControl = memo(function SpinControl({ size = 68, enabled, onChange }: Props) {
  const radius = size / 2;
  const limit = radius * 0.72;
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const hasSpin = useSharedValue(0);
  const last = useRef({ x: 0, y: 0 });

  const apply = (px: number, py: number) => {
    let x = px - radius;
    let y = py - radius;
    const d = Math.hypot(x, y);
    if (d > limit) {
      x = (x / d) * limit;
      y = (y / d) * limit;
    }
    last.current = { x, y };
    dx.value = x;
    dy.value = y;
    hasSpin.value = withTiming(Math.hypot(x, y) > 2 ? 1 : 0, { duration: 120 });
    onChange(-y / limit, x / limit);
  };

  const reset = () => {
    last.current = { x: 0, y: 0 };
    dx.value = withTiming(0, { duration: 150 });
    dy.value = withTiming(0, { duration: 150 });
    hasSpin.value = withTiming(0, { duration: 120 });
    onChange(0, 0);
  };

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .enabled(enabled)
        .minDistance(0)
        .onBegin((e) => apply(e.x, e.y))
        .onUpdate((e) => apply(e.x, e.y)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, radius, limit],
  );

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }, { translateY: dy.value }],
  }));
  const resetStyle = useAnimatedStyle(() => ({ opacity: hasSpin.value }));

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={gesture}>
        <View style={[styles.ball, { width: size, height: size, borderRadius: radius, opacity: enabled ? 1 : 0.4 }]}>
          <View style={[styles.crossH, { width: size * 0.6 }]} />
          <View style={[styles.crossV, { height: size * 0.6 }]} />
          <View style={[styles.limitRing, { width: limit * 2 + 12, height: limit * 2 + 12, borderRadius: limit + 6 }]} />
          <Animated.View style={[styles.dot, dotStyle]} />
        </View>
      </GestureDetector>
      <View style={styles.captionRow}>
        <Text style={styles.caption}>SPIN</Text>
        <Animated.View style={resetStyle}>
          <Pressable onPress={reset} hitSlop={10}>
            <Text style={styles.reset}>reset</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  ball: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 3px 8px rgba(0,0,0,0.45)',
  },
  crossH: { position: 'absolute', height: 1, backgroundColor: 'rgba(15,23,42,0.18)' },
  crossV: { position: 'absolute', width: 1, backgroundColor: 'rgba(15,23,42,0.18)' },
  limitRing: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(15,23,42,0.12)' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.danger,
    borderWidth: 1.5,
    borderColor: '#7F1D1D',
  },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, height: 14 },
  caption: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 1.5, fontWeight: '600' },
  reset: { color: COLORS.accent, fontSize: 11, fontWeight: '600' },
});
