import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassPanel, IconButton } from '../components/ui';
import { COLORS } from '../game/constants';
import { useGame } from '../store/gameStore';
import { FeltColor, feltColor, useSettings } from '../store/settingsStore';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const closeSettings = useGame((s) => s.closeSettings);
  const { felt, sound, haptics, guide, spin, setFelt, toggle } = useSettings();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.topBar}>
        <IconButton label="Back" glyph="‹" onPress={closeSettings} />
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <GlassPanel style={styles.section}>
        <Text style={styles.sectionLabel}>Table felt</Text>
        <View style={styles.feltRow}>
          {(['green', 'charcoal'] as FeltColor[]).map((f) => (
            <Pressable key={f} onPress={() => setFelt(f)} style={[styles.feltOption, felt === f && styles.feltOptionActive]}>
              <View style={[styles.feltSwatch, { backgroundColor: feltColor(f) }]} />
              <Text style={[styles.feltName, felt === f && { color: COLORS.text }]}>{f === 'green' ? 'Classic green' : 'Charcoal'}</Text>
            </Pressable>
          ))}
        </View>
      </GlassPanel>

      <GlassPanel style={styles.section}>
        <Row label="Sound effects" value={sound} onToggle={() => toggle('sound')} />
        <Divider />
        <Row label="Haptics" value={haptics} onToggle={() => toggle('haptics')} />
        <Divider />
        <Row label="Aim guide" hint="Trajectory line with cushion bounces" value={guide} onToggle={() => toggle('guide')} />
        <Divider />
        <Row label="Spin control" hint="Top, back and side spin picker" value={spin} onToggle={() => toggle('spin')} />
      </GlassPanel>

      <Text style={styles.footer}>Ad-free, offline, no accounts. Ever.</Text>
    </View>
  );
}

function Row({ label, hint, value, onToggle }: { label: string; hint?: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(6,182,212,0.6)' }}
        thumbColor={value ? COLORS.accent : '#CBD5E1'}
      />
    </View>
  );
}

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 16, gap: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52 },
  title: { color: COLORS.text, fontSize: 15, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  section: { padding: 14 },
  sectionLabel: { color: COLORS.textMuted, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  feltRow: { flexDirection: 'row', gap: 10 },
  feltOption: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  feltOptionActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  feltSwatch: { height: 44, borderRadius: 8 },
  feltName: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  rowLabel: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  rowHint: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border },
  footer: { color: 'rgba(148,163,184,0.6)', fontSize: 12, textAlign: 'center', marginTop: 'auto' },
});
