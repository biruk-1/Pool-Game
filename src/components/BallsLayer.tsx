import React, { memo, useMemo } from 'react';
import { Platform } from 'react-native';
import { Circle, Group, matchFont, RadialGradient, Rect, rect, rrect, SkFont, Text, vec } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { BALL_COLORS, BALL_R, isStripe } from '../game/constants';
import { TableLayout } from '../utils/layout';

interface Props {
  layout: TableLayout;
  balls: SharedValue<number[]>;
}

function useBallFont(size: number): SkFont | null {
  return useMemo(() => {
    try {
      return matchFont({
        fontFamily: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'sans-serif' }),
        fontSize: size,
        fontWeight: 'bold',
      });
    } catch {
      return null;
    }
  }, [size]);
}

export const BallsLayer = memo(function BallsLayer({ layout, balls }: Props) {
  const r = BALL_R * layout.scale;
  const font = useBallFont(r * 0.95);
  return (
    <Group>
      {Array.from({ length: 16 }, (_, id) => (
        <BallView key={id} id={id} balls={balls} r={r} font={font} />
      ))}
    </Group>
  );
});

interface BallProps {
  id: number;
  balls: SharedValue<number[]>;
  r: number;
  font: SkFont | null;
}

const BallView = memo(function BallView({ id, balls, r, font }: BallProps) {
  const transform = useDerivedValue(() => [{ translateX: balls.value[id * 3] }, { translateY: balls.value[id * 3 + 1] }]);
  const opacity = useDerivedValue(() => balls.value[id * 3 + 2]);
  const color = BALL_COLORS[id];
  const stripe = isStripe(id);
  const clip = useMemo(() => rrect(rect(-r, -r, r * 2, r * 2), r, r), [r]);
  const label = String(id);
  const textWidth = font ? font.getTextWidth(label) : 0;

  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={r * 0.1} cy={r * 0.16} r={r} color="rgba(0,0,0,0.32)" />
      <Group clip={clip}>
        <Circle cx={0} cy={0} r={r} color={stripe ? '#F8FAFC' : color} />
        {stripe && <Rect x={-r} y={-r * 0.52} width={r * 2} height={r * 1.04} color={color} />}
        {id !== 0 && <Circle cx={0} cy={0} r={r * 0.46} color="#F8FAFC" />}
        {id !== 0 && font && (
          <Text x={-textWidth / 2} y={r * 0.34} text={label} font={font} color={id === 8 ? '#0B0F19' : '#111827'} />
        )}
        <Circle cx={0} cy={0} r={r}>
          <RadialGradient
            c={vec(-r * 0.38, -r * 0.42)}
            r={r * 1.25}
            colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.0)', 'rgba(0,0,0,0.30)']}
            positions={[0, 0.5, 1]}
          />
        </Circle>
      </Group>
    </Group>
  );
});
