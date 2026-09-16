import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameCanvas } from '../components/GameCanvas';
import { PlayerPanel, StatusBanner, TopBar } from '../components/HUD';
import { PowerBar } from '../components/PowerBar';
import { publishRender, useRenderValues } from '../components/renderValues';
import { SpinControl } from '../components/SpinControl';
import { Button, GlassPanel } from '../components/ui';
import { COLORS } from '../game/constants';
import { engine } from '../game/engine';
import { PhysicsEvent } from '../game/physics';
import { InteractionState, useCueGesture } from '../hooks/useCueGesture';
import { useGameLoop } from '../hooks/useGameLoop';
import { useGame } from '../store/gameStore';
import { PLAYER_NAMES, ShotResolution } from '../store/rules';
import { feltColor, useSettings } from '../store/settingsStore';
import { impactVolume, initAudio, playSound, setSoundEnabled } from '../utils/audio';
import {
  hapticBallHit,
  hapticCueStrike,
  hapticOutcome,
  hapticPocket,
  hapticRail,
  setHapticsEnabled,
} from '../utils/haptics';
import { computeLayout } from '../utils/layout';

export function GameScreen() {
  const insets = useSafeAreaInsets();
  const mode = useGame((s) => s.mode);
  const phase = useGame((s) => s.phase);
  const rules = useGame((s) => s.rules);
  const canUndo = useGame((s) => s.canUndo);
  const worldVersion = useGame((s) => s.worldVersion);
  const { goHome, openSettings, resetTable, undo, beginShot, startGame } = useGame.getState();

  const felt = useSettings((s) => s.felt);
  const sound = useSettings((s) => s.sound);
  const haptics = useSettings((s) => s.haptics);
  const guide = useSettings((s) => s.guide);
  const spinEnabled = useSettings((s) => s.spin);

  const render = useRenderValues();
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const layout = useMemo(() => computeLayout(canvasSize.width, canvasSize.height), [canvasSize]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const interaction = useRef<InteractionState>({ canAim: false, ballInHand: 'none' });
  interaction.current = {
    canAim: phase === 'aiming',
    ballInHand: rules.ballInHand === 'none' ? 'none' : rules.ballInHand,
  };
  const guideRef = useRef(guide);
  guideRef.current = guide;

  const gesture = useCueGesture(engine, layoutRef, interaction);

  useEffect(() => {
    void initAudio();
  }, []);
  useEffect(() => setSoundEnabled(sound), [sound]);
  useEffect(() => setHapticsEnabled(haptics), [haptics]);

  // Anything that changes what the canvas should show forces a re-publish.
  useEffect(() => {
    engine.markDirty();
  }, [layout, worldVersion, phase, rules.ballInHand, guide]);

  const handleEvents = useCallback((events: PhysicsEvent[]) => {
    for (const e of events) {
      if (e.type === 'ballBall') {
        if (e.speed < 0.15) continue;
        playSound('click', impactVolume(e.speed, 5));
        if (e.speed > 0.4) hapticBallHit();
      } else if (e.type === 'cushion') {
        if (e.speed < 0.2) continue;
        playSound('rail', impactVolume(e.speed, 4) * 0.8);
        if (e.speed > 0.5) hapticRail();
      } else if (e.type === 'pocket') {
        playSound('pocket', 0.9);
        hapticPocket();
      }
    }
  }, []);

  const onOutcome = useCallback((res: ShotResolution) => {
    if (res.outcome === 'win') hapticOutcome('win');
    else if (res.outcome === 'loss') hapticOutcome('loss');
    else if (res.outcome === 'foul') hapticOutcome('foul');
  }, []);

  useGameLoop(true, (dt) => {
    const st = useGame.getState();
    if (st.phase === 'shooting') {
      const events = engine.update(dt);
      if (events.length) handleEvents(events);
      if (!engine.isMoving()) {
        const res = st.completeShot(engine.finishShot());
        onOutcome(res);
      }
    }
    if (engine.dirty && layoutRef.current.width > 0) {
      engine.dirty = false;
      const now = useGame.getState();
      publishRender(engine, layoutRef.current, render, {
        canAim: now.phase === 'aiming',
        ballInHand: now.rules.ballInHand !== 'none',
        showGuide: guideRef.current,
      });
    }
  });

  const onCanvasLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const onPowerChange = useCallback((p: number) => engine.setPower(p), []);
  const onPowerRelease = useCallback(
    (p: number) => {
      if (useGame.getState().phase !== 'aiming' || p < 0.04) {
        engine.setPower(0);
        return;
      }
      if (engine.shoot(p)) {
        beginShot();
        playSound('cue', 0.5 + p * 0.5);
        hapticCueStrike();
      } else {
        engine.setPower(0);
      }
    },
    [beginShot],
  );
  const onSpinChange = useCallback((top: number, side: number) => engine.setSpin(top, side), []);

  const aiming = phase === 'aiming';
  const gameOver = phase === 'gameOver';
  const tone = rules.winner !== null ? 'win' : rules.foul ? 'foul' : 'neutral';
  const hint = gameOver
    ? ''
    : phase === 'shooting'
      ? 'Balls rolling…'
      : rules.ballInHand !== 'none'
        ? rules.ballInHand === 'kitchen'
          ? 'Drag the cue ball behind the line, then aim'
          : 'Drag the cue ball to place it, then aim'
        : 'Drag to aim · Pull the power bar to shoot';

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 10) }]}>
      <TopBar
        title={mode === 'practice' ? 'Practice' : 'Pass & Play'}
        showUndo={mode === 'practice'}
        canUndo={canUndo && aiming}
        onBack={goHome}
        onUndo={undo}
        onReset={resetTable}
        onSettings={openSettings}
      />
      <PlayerPanel rules={rules} shooting={phase === 'shooting'} />
      <StatusBanner message={rules.message} foul={rules.foul} tone={tone} />

      <View style={styles.tableRow}>
        <View style={styles.canvasWrap} onLayout={onCanvasLayout}>
          {layout.width > 0 && (
            <GameCanvas
              layout={layout}
              felt={feltColor(felt)}
              showKitchen={aiming && rules.ballInHand === 'kitchen'}
              render={render}
              gesture={gesture}
            />
          )}
          {gameOver && (
            <View style={styles.overlay} pointerEvents="box-none">
              <GlassPanel style={styles.resultCard}>
                <Text style={styles.resultTitle}>{rules.winner !== null ? `${PLAYER_NAMES[rules.winner]} wins` : 'Game over'}</Text>
                <Text style={styles.resultSub}>{rules.foul ? rules.foul : 'Legal 8-ball'}</Text>
                <Button title="Rematch" onPress={() => mode && startGame(mode)} style={styles.resultBtn} />
                <Button title="Menu" variant="ghost" onPress={goHome} />
              </GlassPanel>
            </View>
          )}
        </View>
        <PowerBar height={canvasSize.height} enabled={aiming} onChange={onPowerChange} onRelease={onPowerRelease} />
      </View>

      <View style={styles.bottomBar}>
        {spinEnabled ? <SpinControl enabled={aiming} onChange={onSpinChange} /> : <View style={{ width: 68 }} />}
        <Text style={styles.hint} numberOfLines={2}>
          {hint}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  tableRow: { flex: 1, flexDirection: 'row', paddingLeft: 8, paddingRight: 2, marginTop: 4 },
  canvasWrap: { flex: 1, justifyContent: 'center' },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  resultCard: {
    padding: 22,
    width: '78%',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,23,42,0.88)',
  },
  resultTitle: { color: COLORS.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  resultSub: { color: COLORS.textMuted, fontSize: 13, marginBottom: 8 },
  resultBtn: { alignSelf: 'stretch' },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 18,
    paddingTop: 8,
    minHeight: 96,
  },
  hint: { flex: 1, color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
});
