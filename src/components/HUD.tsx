import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../game/constants';
import { groupBalls, PLAYER_NAMES, PlayerIndex, RulesState, targetDescription } from '../store/rules';
import { GlassPanel, GroupIcon, IconButton, MiniBall } from './ui';

interface TopBarProps {
  title: string;
  canUndo: boolean;
  showUndo: boolean;
  onBack: () => void;
  onUndo: () => void;
  onReset: () => void;
  onSettings: () => void;
}

export const TopBar = memo(function TopBar({ title, canUndo, showUndo, onBack, onUndo, onReset, onSettings }: TopBarProps) {
  return (
    <View style={styles.topBar}>
      <IconButton label="Back to menu" glyph="‹" onPress={onBack} />
      <Text style={styles.title}>{title}</Text>
      <View style={styles.actions}>
        {showUndo && <IconButton label="Undo last shot" glyph="↶" onPress={onUndo} disabled={!canUndo} />}
        <IconButton label="Reset table" glyph="↻" onPress={onReset} />
        <IconButton label="Settings" glyph="⚙︎" onPress={onSettings} />
      </View>
    </View>
  );
});

interface PlayerPanelProps {
  rules: RulesState;
  shooting: boolean;
}

/** Turn indicator + pocketed racks. Renders one card in practice, two in pass & play. */
export const PlayerPanel = memo(function PlayerPanel({ rules, shooting }: PlayerPanelProps) {
  if (rules.mode === 'practice') {
    const remaining = 15 - rules.pocketed.length;
    return (
      <GlassPanel style={styles.practiceCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.playerName}>Practice</Text>
          <Text style={styles.target}>{remaining} on table</Text>
        </View>
        <Rack ids={rules.pocketed} />
      </GlassPanel>
    );
  }
  return (
    <View style={styles.players}>
      {([0, 1] as PlayerIndex[]).map((p) => (
        <PlayerCard key={p} player={p} rules={rules} active={rules.currentPlayer === p && rules.winner === null} shooting={shooting} />
      ))}
    </View>
  );
});

function PlayerCard({ player, rules, active, shooting }: { player: PlayerIndex; rules: RulesState; active: boolean; shooting: boolean }) {
  const group = rules.groups[player];
  const pocketed = group ? groupBalls(group).filter((id) => rules.pocketed.includes(id)) : [];
  const winner = rules.winner === player;
  return (
    <GlassPanel style={[styles.playerCard, active && styles.playerCardActive, winner && styles.playerCardWinner]}>
      <View style={styles.rowBetween}>
        <View style={styles.row}>
          <GroupIcon group={group} />
          <Text style={[styles.playerName, active && { color: COLORS.text }]}>{PLAYER_NAMES[player]}</Text>
        </View>
        {active && !shooting && <View style={styles.turnDot} />}
      </View>
      <Text style={styles.target}>{winner ? 'Winner' : targetDescription(rules, player)}</Text>
      {group ? <Rack ids={pocketed} size={14} all={groupBalls(group)} /> : <View style={{ height: 14 }} />}
    </GlassPanel>
  );
}

/** Row of mini balls; when `all` is provided, missing ones are drawn dimmed. */
function Rack({ ids, size = 16, all }: { ids: number[]; size?: number; all?: number[] }) {
  const list = all ?? ids;
  return (
    <View style={styles.rack}>
      {list.length === 0 && <Text style={styles.rackEmpty}>No balls pocketed yet</Text>}
      {list.map((id) => (
        <MiniBall key={id} id={id} size={size} dim={all ? !ids.includes(id) : false} />
      ))}
    </View>
  );
}

interface StatusProps {
  message: string;
  foul: string | null;
  tone: 'neutral' | 'foul' | 'win';
}

export const StatusBanner = memo(function StatusBanner({ message, foul, tone }: StatusProps) {
  return (
    <View style={styles.status}>
      {foul ? <Text style={styles.foulTag}>FOUL</Text> : null}
      <Text style={[styles.statusText, tone === 'foul' && { color: COLORS.danger }, tone === 'win' && { color: COLORS.success }]} numberOfLines={1}>
        {message}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: 52,
  },
  title: { color: COLORS.text, fontSize: 15, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  actions: { flexDirection: 'row', gap: 8 },
  players: { flexDirection: 'row', gap: 10, paddingHorizontal: 14 },
  playerCard: { flex: 1, padding: 12, gap: 6 },
  playerCardActive: { borderColor: 'rgba(6,182,212,0.55)', backgroundColor: 'rgba(6,182,212,0.08)' },
  playerCardWinner: { borderColor: 'rgba(52,211,153,0.6)', backgroundColor: 'rgba(52,211,153,0.08)' },
  practiceCard: { marginHorizontal: 14, padding: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playerName: { color: COLORS.textMuted, fontSize: 14, fontWeight: '700' },
  target: { color: COLORS.textMuted, fontSize: 12 },
  turnDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  rack: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, minHeight: 14, alignItems: 'center' },
  rackEmpty: { color: 'rgba(148,163,184,0.5)', fontSize: 11 },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, height: 26 },
  statusText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  foulTag: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.5)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
});
