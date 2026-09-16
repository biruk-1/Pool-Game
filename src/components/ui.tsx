import React, { PropsWithChildren } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BALL_COLORS, COLORS, isStripe } from '../game/constants';

/** Translucent "glass" card used for every HUD surface. */
export function GlassPanel({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.glass, style]}>{children}</View>;
}

interface IconButtonProps {
  label: string;
  glyph: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'default' | 'accent' | 'danger';
}

/** Round glass button with a single text glyph (keeps the bundle free of icon fonts). */
export function IconButton({ label, glyph, onPress, disabled, tone = 'default' }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconBtn,
        tone === 'accent' && styles.iconBtnAccent,
        tone === 'danger' && styles.iconBtnDanger,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.iconGlyph, tone === 'accent' && { color: COLORS.accent }, tone === 'danger' && { color: COLORS.danger }]}>
        {glyph}
      </Text>
    </Pressable>
  );
}

interface ButtonProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, subtitle, onPress, variant = 'primary', style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.buttonTitle, variant === 'primary' && { color: '#062A31' }, variant === 'ghost' && { color: COLORS.textMuted }]}>
        {title}
      </Text>
      {subtitle ? <Text style={[styles.buttonSubtitle, variant === 'primary' && { color: 'rgba(6,42,49,0.7)' }]}>{subtitle}</Text> : null}
    </Pressable>
  );
}

/** Tiny ball icon used in racks and group indicators. */
export function MiniBall({ id, size = 18, dim }: { id: number; size?: number; dim?: boolean }) {
  const color = BALL_COLORS[id];
  const stripe = isStripe(id);
  return (
    <View
      style={[
        styles.mini,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: stripe ? '#F8FAFC' : color, opacity: dim ? 0.25 : 1 },
      ]}
    >
      {stripe && <View style={[styles.miniStripe, { height: size * 0.5, backgroundColor: color }]} />}
      {id !== 0 && (
        <View style={[styles.miniLabel, { width: size * 0.56, height: size * 0.56, borderRadius: size * 0.28 }]}>
          <Text style={[styles.miniText, { fontSize: size * 0.4 }]}>{id}</Text>
        </View>
      )}
    </View>
  );
}

/** Abstract solids / stripes marker. */
export function GroupIcon({ group, size = 16 }: { group: 'solids' | 'stripes' | null; size?: number }) {
  if (!group) {
    return <View style={[styles.groupOpen, { width: size, height: size, borderRadius: size / 2 }]} />;
  }
  return (
    <View style={[styles.groupIcon, { width: size, height: size, borderRadius: size / 2, backgroundColor: group === 'solids' ? COLORS.accent : '#F8FAFC' }]}>
      {group === 'stripes' && <View style={[styles.miniStripe, { height: size * 0.45, backgroundColor: COLORS.accent }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: COLORS.glass,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconBtnAccent: { borderColor: 'rgba(6,182,212,0.4)', backgroundColor: 'rgba(6,182,212,0.10)' },
  iconBtnDanger: { borderColor: 'rgba(248,113,113,0.35)', backgroundColor: 'rgba(248,113,113,0.08)' },
  iconGlyph: { color: COLORS.text, fontSize: 18, lineHeight: 22, fontWeight: '600' },
  pressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.3 },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonPrimary: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  buttonSecondary: { backgroundColor: COLORS.glass },
  buttonGhost: { backgroundColor: 'transparent', borderColor: 'transparent', paddingVertical: 10 },
  buttonTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  buttonSubtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
  mini: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.35)',
  },
  miniStripe: { position: 'absolute', left: 0, right: 0 },
  miniLabel: { backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  miniText: { color: '#0F172A', fontWeight: '700' },
  groupIcon: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  groupOpen: { borderWidth: 1.5, borderColor: COLORS.textMuted, borderStyle: 'dashed' },
});
