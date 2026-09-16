import React, { memo, useMemo } from 'react';
import {
  Circle,
  DashPathEffect,
  Group,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  RoundedRect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { COLORS, HEAD_STRING_Y, RAIL_W, TABLE_H, TABLE_W } from '../game/constants';
import { CUSHIONS, POCKETS } from '../game/table';
import { TableLayout, toScreenX, toScreenY } from '../utils/layout';

interface Props {
  layout: TableLayout;
  felt: string;
  showKitchen: boolean;
}

const DIAMONDS_LONG = [1, 2, 3, 5, 6, 7].map((k) => (k * TABLE_H) / 8);
const DIAMONDS_SHORT = [1, 2, 3].map((k) => (k * TABLE_W) / 4);

/** Static table artwork: rails, felt, cushions, pockets and sights. */
export const TableLayer = memo(function TableLayer({ layout, felt, showKitchen }: Props) {
  const { scale } = layout;
  const railPx = RAIL_W * scale;
  const feltX = toScreenX(layout, 0);
  const feltY = toScreenY(layout, 0);
  const feltW = TABLE_W * scale;
  const feltH = TABLE_H * scale;

  const cushionPath = useMemo(() => {
    const p = Skia.Path.Make();
    for (const s of CUSHIONS) {
      p.moveTo(toScreenX(layout, s.ax), toScreenY(layout, s.ay));
      p.lineTo(toScreenX(layout, s.bx), toScreenY(layout, s.by));
    }
    return p;
  }, [layout]);

  const pocketR = 0.078 * scale;

  return (
    <Group>
      {/* outer rail */}
      <RoundedRect x={feltX - railPx} y={feltY - railPx} width={feltW + railPx * 2} height={feltH + railPx * 2} r={0.07 * scale}>
        <LinearGradient start={vec(feltX, feltY - railPx)} end={vec(feltX + feltW, feltY + feltH + railPx)} colors={['#2A3A55', '#1B2740', '#131D33']} />
      </RoundedRect>
      <RoundedRect
        x={feltX - railPx}
        y={feltY - railPx}
        width={feltW + railPx * 2}
        height={feltH + railPx * 2}
        r={0.07 * scale}
        style="stroke"
        strokeWidth={1}
        color="rgba(255,255,255,0.08)"
      />

      {/* felt */}
      <Rect x={feltX} y={feltY} width={feltW} height={feltH} color={felt} />
      <Rect x={feltX} y={feltY} width={feltW} height={feltH}>
        <RadialGradient
          c={vec(feltX + feltW / 2, feltY + feltH / 2)}
          r={feltH * 0.72}
          colors={['rgba(255,255,255,0.06)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.28)']}
          positions={[0, 0.55, 1]}
        />
      </Rect>

      {/* head string (only while placing the cue ball in the kitchen) */}
      {showKitchen && (
        <Line
          p1={vec(feltX, toScreenY(layout, HEAD_STRING_Y))}
          p2={vec(feltX + feltW, toScreenY(layout, HEAD_STRING_Y))}
          color="rgba(255,255,255,0.35)"
          strokeWidth={1}
        >
          <DashPathEffect intervals={[6, 6]} />
        </Line>
      )}

      {/* cushion noses */}
      <Path path={cushionPath} style="stroke" strokeWidth={0.022 * scale} strokeCap="round" color="rgba(0,0,0,0.28)" />

      {/* pockets */}
      {POCKETS.map((p, i) => {
        const cx = toScreenX(layout, p.x);
        const cy = toScreenY(layout, p.y);
        return (
          <Group key={i}>
            <Circle cx={cx} cy={cy} r={pocketR * 1.18} color="rgba(0,0,0,0.35)" />
            <Circle cx={cx} cy={cy} r={pocketR} color={COLORS.pocket} />
            <Circle cx={cx} cy={cy} r={pocketR}>
              <RadialGradient c={vec(cx, cy)} r={pocketR} colors={['rgba(0,0,0,0)', 'rgba(255,255,255,0.10)']} positions={[0.7, 1]} />
            </Circle>
          </Group>
        );
      })}

      {/* diamond sights */}
      {DIAMONDS_LONG.map((y) => (
        <Group key={`l${y}`}>
          <Circle cx={feltX - railPx / 2} cy={toScreenY(layout, y)} r={0.011 * scale} color="rgba(255,255,255,0.32)" />
          <Circle cx={feltX + feltW + railPx / 2} cy={toScreenY(layout, y)} r={0.011 * scale} color="rgba(255,255,255,0.32)" />
        </Group>
      ))}
      {DIAMONDS_SHORT.map((x) => (
        <Group key={`s${x}`}>
          <Circle cx={toScreenX(layout, x)} cy={feltY - railPx / 2} r={0.011 * scale} color="rgba(255,255,255,0.32)" />
          <Circle cx={toScreenX(layout, x)} cy={feltY + feltH + railPx / 2} r={0.011 * scale} color="rgba(255,255,255,0.32)" />
        </Group>
      ))}
    </Group>
  );
});
