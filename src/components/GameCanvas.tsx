import React, { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { ComposedGesture, GestureDetector, GestureType } from 'react-native-gesture-handler';
import { TableLayout } from '../utils/layout';
import { BallsLayer } from './BallsLayer';
import { CueStick } from './CueStick';
import { RenderValues } from './renderValues';
import { TableLayer } from './TableLayer';
import { TrajectoryLine } from './TrajectoryLine';

interface Props {
  layout: TableLayout;
  felt: string;
  showKitchen: boolean;
  render: RenderValues;
  gesture: ComposedGesture | GestureType;
}

/** The Skia scene: table → balls → aim guide → cue. */
export const GameCanvas = memo(function GameCanvas({ layout, felt, showKitchen, render, gesture }: Props) {
  // Skia's Canvas expects a flat style object (arrays break the web renderer).
  const style = useMemo(
    () => StyleSheet.flatten([styles.canvas, { width: layout.width, height: layout.height }]),
    [layout.width, layout.height],
  );
  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={style}>
        <TableLayer layout={layout} felt={felt} showKitchen={showKitchen} />
        <BallsLayer layout={layout} balls={render.balls} />
        <TrajectoryLine layout={layout} trajectory={render.trajectory} />
        <CueStick layout={layout} aim={render.aim} />
      </Canvas>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  canvas: {
    alignSelf: 'center',
  },
});
