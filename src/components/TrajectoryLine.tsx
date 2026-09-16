import React, { memo } from 'react';
import { Circle, DashPathEffect, Group, Line, Path, Skia, vec } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { BALL_R, COLORS } from '../game/constants';
import { TableLayout } from '../utils/layout';
import { TrajectoryRender } from './renderValues';

interface Props {
  layout: TableLayout;
  trajectory: SharedValue<TrajectoryRender>;
}

const ZERO = vec(0, 0);

/** Aim guide: cue ball path (with cushion bounces), ghost ball and post-impact stubs. */
export const TrajectoryLine = memo(function TrajectoryLine({ layout, trajectory }: Props) {
  const r = BALL_R * layout.scale;

  const path = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const t = trajectory.value;
    if (!t.visible || t.pts.length < 4) return p;
    p.moveTo(t.pts[0], t.pts[1]);
    for (let i = 2; i < t.pts.length; i += 2) p.lineTo(t.pts[i], t.pts[i + 1]);
    return p;
  });

  const opacity = useDerivedValue(() => (trajectory.value.visible ? 1 : 0));
  const ghostOpacity = useDerivedValue(() => (trajectory.value.visible && trajectory.value.ghost ? 1 : 0));
  const ghostCx = useDerivedValue(() => trajectory.value.ghost?.[0] ?? -100);
  const ghostCy = useDerivedValue(() => trajectory.value.ghost?.[1] ?? -100);

  const objOpacity = useDerivedValue(() => (trajectory.value.visible && trajectory.value.object ? 1 : 0));
  const objP1 = useDerivedValue(() => {
    const o = trajectory.value.object;
    return o ? vec(o[0], o[1]) : ZERO;
  });
  const objP2 = useDerivedValue(() => {
    const o = trajectory.value.object;
    return o ? vec(o[2], o[3]) : ZERO;
  });

  const cueOpacity = useDerivedValue(() => (trajectory.value.visible && trajectory.value.cue ? 0.7 : 0));
  const cueP1 = useDerivedValue(() => {
    const o = trajectory.value.cue;
    return o ? vec(o[0], o[1]) : ZERO;
  });
  const cueP2 = useDerivedValue(() => {
    const o = trajectory.value.cue;
    return o ? vec(o[2], o[3]) : ZERO;
  });

  const pocketOpacity = useDerivedValue(() => (trajectory.value.visible && trajectory.value.pocket ? 1 : 0));
  const pocketCx = useDerivedValue(() => trajectory.value.pocket?.[0] ?? -100);
  const pocketCy = useDerivedValue(() => trajectory.value.pocket?.[1] ?? -100);

  return (
    <Group opacity={opacity}>
      <Path path={path} style="stroke" strokeWidth={2} color={COLORS.accent} strokeCap="round" strokeJoin="round" opacity={0.9}>
        <DashPathEffect intervals={[7, 6]} />
      </Path>
      <Circle cx={ghostCx} cy={ghostCy} r={r} style="stroke" strokeWidth={1.5} color={COLORS.accent} opacity={ghostOpacity} />
      <Circle cx={ghostCx} cy={ghostCy} r={r} color="rgba(6,182,212,0.12)" opacity={ghostOpacity} />
      <Line p1={objP1} p2={objP2} strokeWidth={3} strokeCap="round" color={COLORS.accent} opacity={objOpacity} />
      <Line p1={cueP1} p2={cueP2} strokeWidth={2} strokeCap="round" color="#F8FAFC" opacity={cueOpacity} />
      <Circle cx={pocketCx} cy={pocketCy} r={r * 0.6} color={COLORS.accent} opacity={pocketOpacity} />
    </Group>
  );
});
