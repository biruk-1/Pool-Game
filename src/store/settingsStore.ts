import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { COLORS } from '../game/constants';

export type FeltColor = 'green' | 'charcoal';

interface SettingsState {
  felt: FeltColor;
  sound: boolean;
  haptics: boolean;
  guide: boolean;
  spin: boolean;
  setFelt: (felt: FeltColor) => void;
  toggle: (key: 'sound' | 'haptics' | 'guide' | 'spin') => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      felt: 'green',
      sound: true,
      haptics: true,
      guide: true,
      spin: true,
      setFelt: (felt) => set({ felt }),
      toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<SettingsState>),
    }),
    {
      name: 'pool-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ felt: s.felt, sound: s.sound, haptics: s.haptics, guide: s.guide, spin: s.spin }),
    },
  ),
);

export const feltColor = (felt: FeltColor) => (felt === 'green' ? COLORS.feltGreen : COLORS.feltCharcoal);
