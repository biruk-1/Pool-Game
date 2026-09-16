import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;
let lastImpact = 0;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

function impact(style: Haptics.ImpactFeedbackStyle, minGapMs: number) {
  if (!enabled || !supported) return;
  const now = Date.now();
  if (now - lastImpact < minGapMs) return;
  lastImpact = now;
  Haptics.impactAsync(style).catch(() => undefined);
}

/** Light tap when two balls collide. */
export const hapticBallHit = () => impact(Haptics.ImpactFeedbackStyle.Light, 45);
/** Medium bump when a ball hits a cushion. */
export const hapticRail = () => impact(Haptics.ImpactFeedbackStyle.Medium, 60);
/** Heavy thump when a ball drops in a pocket. */
export const hapticPocket = () => impact(Haptics.ImpactFeedbackStyle.Heavy, 0);
/** Cue-stick contact with the cue ball. */
export const hapticCueStrike = () => impact(Haptics.ImpactFeedbackStyle.Rigid, 0);
/** Selection tick for UI controls. */
export const hapticSelect = () => {
  if (!enabled || !supported) return;
  Haptics.selectionAsync().catch(() => undefined);
};

export function hapticOutcome(kind: 'win' | 'loss' | 'foul') {
  if (!enabled || !supported) return;
  const type =
    kind === 'win'
      ? Haptics.NotificationFeedbackType.Success
      : kind === 'loss'
        ? Haptics.NotificationFeedbackType.Error
        : Haptics.NotificationFeedbackType.Warning;
  Haptics.notificationAsync(type).catch(() => undefined);
}
