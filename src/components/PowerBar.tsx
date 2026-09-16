import React, { memo, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { COLORS } from '../game/constants';

interface Props {
  height: number;
  enabled: boolean;
  onChange: (power: number) => void;
  onRelease: (power: number) => void;
}

const WIDTH = 44;
const HANDLE = 26;

/**
 * Vertical pull-back power meter. Drag down along the track to load the shot;
 * release to strike. Sliding back to the very top cancels.
 */
export const PowerBar = memo(function PowerBar({ height, enabled, onChange, onRelease }: Props) {
  const power = useSharedValue(0);
  const active = useSharedValue(false);
  const trackH = Math.max(80, height - 40);
  const startY = useRef(0);
  const startPower = useRef(0);
  const current = useRef(0);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .enabled(enabled)
        .minDistance(0)
        .onBegin((e) => {
          startY.current = e.y;
          startPower.current = current.current;
          active.value = true;
        })
        .onUpdate((e) => {
          // relative drag: pulling down increases, pushing up decreases
          const p = Math.max(0, Math.min(1, startPower.current + (e.y - startY.current) / (trackH * 0.85)));
          current.current = p;
          power.value = p;
          onChange(p);
        })
        .onFinalize(() => {
          active.value = false;
          const p = current.current;
          current.current = 0;
          power.value = withTiming(0, { duration: 160 });
          onRelease(p);
        }),
    [enabled, trackH, onChange, onRelease, power, active],
  );

  const fillStyle = useAnimatedStyle(() => ({
    height: power.value * trackH,
    opacity: 0.55 + power.value * 0.45,
  }));
  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: power.value * (trackH - HANDLE) }, { scale: active.value ? 1.12 : 1 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: power.value }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.wrap, { height, opacity: enabled ? 1 : 0.35 }]}>
        <Text style={styles.label}>PWR</Text>
        <View style={[styles.track, { height: trackH }]}>
          <Animated.View style={[styles.fill, fillStyle]} />
          <Animated.View style={[styles.glow, glowStyle]} />
          <Animated.View style={[styles.handle, handleStyle]}>
            <View style={styles.handleBar} />
          </Animated.View>
        </View>
      </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: WIDTH + 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 8,
    fontWeight: '600',
  },
  track: {
    width: WIDTH,
    borderRadius: WIDTH / 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    alignItems: 'center',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.accent,
    borderBottomLeftRadius: WIDTH / 2,
    borderBottomRightRadius: WIDTH / 2,
  },
  glow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(6,182,212,0.12)',
  },
  handle: {
    position: 'absolute',
    top: 0,
    width: WIDTH - 8,
    height: HANDLE,
    borderRadius: (WIDTH - 8) / 2,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  handleBar: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
});
