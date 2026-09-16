import React, { memo, useMemo } from 'react';
import { Circle, Group, LinearGradient, Path, Rect, Skia, vec } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { BALL_R, COLORS } from '../game/constants';
import { TableLayout } from '../utils/layout';
import { AimRender } from './renderValues';

interface Props {
  layout: TableLayout;
  aim: SharedValue<AimRender>;
}

/** Max pull-back distance (world units) at 100% power. */
const PULL_MAX = 0.32;
const CUE_LENGTH = 1.15;
const CUE_GAP = 0.014;

/** Cue stick drawn behind the cue ball, rotated to the aim and pulled back by power. */
export const CueStick = memo(function CueStick({ layout, aim }: Props) {
  const { scale } = layout;
  const r = BALL_R * scale;
  const pullMax = PULL_MAX * scale;
  const length = CUE_LENGTH * scale;
  const tipX = -(r + CUE_GAP * scale);
  const buttX = tipX - length;
  const tipW = 0.007 * scale;
  const buttW = 0.014 * scale;

  const transform = useDerivedValue(() => {
    const a = aim.value;
    return [{ translateX: a.cx }, { translateY: a.cy }, { rotate: a.angle }, { translateX: -a.power * pullMax }];
  });
  const opacity = useDerivedValue(() => (aim.value.showCue ? 1 : 0));
  const ringOpacity = useDerivedValue(() => (aim.value.ballInHand ? 1 : 0));
  const ringCx = useDerivedValue(() => aim.value.cx);
  const ringCy = useDerivedValue(() => aim.value.cy);

  const shaft = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(tipX, -tipW);
    p.lineTo(buttX, -buttW);
    p.lineTo(buttX, buttW);
    p.lineTo(tipX, tipW);
    p.close();
    return p;
  }, [tipX, buttX, tipW, buttW]);

  const shadow = useMemo(() => {
    const p = Skia.Path.Make();
    const o = 0.012 * scale;
    p.moveTo(tipX + o, -tipW + o);
    p.lineTo(buttX + o, -buttW + o);
    p.lineTo(buttX + o, buttW + o);
    p.lineTo(tipX + o, tipW + o);
    p.close();
    return p;
  }, [tipX, buttX, tipW, buttW, scale]);

  const ferruleLen = 0.05 * scale;
  const wrapStart = buttX + length * 0.32;
  const wrapLen = length * 0.24;

  return (
    <Group>
      {/* ball-in-hand indicator */}
      <Circle cx={ringCx} cy={ringCy} r={r * 1.7} style="stroke" strokeWidth={1.5} color={COLORS.accent} opacity={ringOpacity} />
      <Circle cx={ringCx} cy={ringCy} r={r * 1.7} color="rgba(6,182,212,0.12)" opacity={ringOpacity} />

      <Group transform={transform} opacity={opacity}>
        <Path path={shadow} color="rgba(0,0,0,0.30)" />
        <Path path={shaft}>
          <LinearGradient start={vec(tipX, 0)} end={vec(buttX, 0)} colors={['#E8CBA3', '#C08A55', '#7A4A24', '#3F2612']} positions={[0, 0.35, 0.8, 1]} />
        </Path>
        {/* wrap */}
        <Rect x={wrapStart} y={-buttW * 0.9} width={wrapLen} height={buttW * 1.8} color="rgba(15,23,42,0.75)" />
        {/* ferrule + tip */}
        <Rect x={tipX - ferruleLen} y={-tipW} width={ferruleLen} height={tipW * 2} color="#F1F5F9" />
        <Rect x={tipX - 0.012 * scale} y={-tipW} width={0.012 * scale} height={tipW * 2} color="#60A5FA" />
      </Group>
    </Group>
  );
});
