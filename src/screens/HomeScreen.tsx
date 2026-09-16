import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, MiniBall } from '../components/ui';
import { COLORS } from '../game/constants';
import { useGame } from '../store/gameStore';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const mode = useGame((s) => s.mode);
  const phase = useGame((s) => s.phase);
  const { startGame, resumeGame, openSettings } = useGame.getState();
  const canResume = mode !== null && phase !== 'gameOver';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.hero}>
        <View style={styles.logoRow}>
          <MiniBall id={8} size={54} />
          <MiniBall id={1} size={38} />
          <MiniBall id={9} size={38} />
        </View>
        <Text style={styles.title}>POOL</Text>
        <Text style={styles.subtitle}>8-ball · no ads, no noise</Text>
      </View>

      <View style={styles.menu}>
        {canResume && (
          <Button title="Resume" subtitle={mode === 'practice' ? 'Practice' : 'Pass & Play'} onPress={resumeGame} />
        )}
        <Button
          title="Pass & Play"
          subtitle="Two players, one device"
          variant={canResume ? 'secondary' : 'primary'}
          onPress={() => startGame('pass-play')}
        />
        <Button title="Practice" subtitle="Free table with undo" variant="secondary" onPress={() => startGame('practice')} />
        <Button title="Settings" variant="ghost" onPress={openSettings} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 28, justifyContent: 'space-between' },
  hero: { alignItems: 'center', marginTop: 48 },
  logoRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 20 },
  title: { color: COLORS.text, fontSize: 44, fontWeight: '800', letterSpacing: 10 },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginTop: 6, letterSpacing: 0.5 },
  menu: { gap: 12, marginBottom: 12 },
});
