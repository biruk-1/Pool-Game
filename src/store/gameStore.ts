import { create } from 'zustand';
import { engine } from '../game/engine';
import { createRulesState, GameMode, resolveShot, RulesState, ShotResolution, ShotSummary } from './rules';

export type Screen = 'home' | 'game' | 'settings';
export type Phase = 'aiming' | 'shooting' | 'gameOver';

interface GameStore {
  screen: Screen;
  /** Screen to return to when leaving settings. */
  returnScreen: Screen;
  mode: GameMode | null;
  phase: Phase;
  rules: RulesState;
  canUndo: boolean;
  /** Bumps whenever the world was replaced (reset/undo) so the renderer re-publishes. */
  worldVersion: number;
  /** Last shot outcome, for transient HUD feedback. */
  lastOutcome: ShotResolution['outcome'] | null;

  startGame: (mode: GameMode) => void;
  resumeGame: () => void;
  goHome: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  beginShot: () => void;
  completeShot: (summary: ShotSummary) => ShotResolution;
  resetTable: () => void;
  undo: () => void;
}

const rulesHistory: RulesState[] = [];

export const useGame = create<GameStore>()((set, get) => ({
  screen: 'home',
  returnScreen: 'home',
  mode: null,
  phase: 'aiming',
  rules: createRulesState('practice'),
  canUndo: false,
  worldVersion: 0,
  lastOutcome: null,

  startGame: (mode) => {
    engine.reset();
    rulesHistory.length = 0;
    set((s) => ({
      screen: 'game',
      mode,
      phase: 'aiming',
      rules: createRulesState(mode),
      canUndo: false,
      lastOutcome: null,
      worldVersion: s.worldVersion + 1,
    }));
  },

  resumeGame: () => set({ screen: 'game' }),

  goHome: () => set({ screen: 'home' }),

  openSettings: () => set((s) => ({ screen: 'settings', returnScreen: s.screen === 'settings' ? 'home' : s.screen })),

  closeSettings: () => set((s) => ({ screen: s.returnScreen })),

  beginShot: () => {
    const { rules, mode } = get();
    if (mode === 'practice') {
      rulesHistory.push(rules);
      if (rulesHistory.length > 20) rulesHistory.shift();
    }
    set({ phase: 'shooting', lastOutcome: null });
  },

  completeShot: (summary) => {
    const { rules, mode } = get();
    const res = resolveShot(rules, summary);
    if (res.respot8) engine.respotBall(8);
    if (res.cueReset) engine.resetCueBall(res.state.ballInHand === 'kitchen' ? 'kitchen' : 'anywhere');
    set({
      rules: res.state,
      phase: res.state.winner !== null ? 'gameOver' : 'aiming',
      canUndo: mode === 'practice' && engine.canUndo(),
      lastOutcome: res.outcome,
    });
    return res;
  },

  resetTable: () => {
    const { mode } = get();
    if (!mode) return;
    engine.reset();
    rulesHistory.length = 0;
    set((s) => ({
      phase: 'aiming',
      rules: createRulesState(mode),
      canUndo: false,
      lastOutcome: null,
      worldVersion: s.worldVersion + 1,
    }));
  },

  undo: () => {
    const { mode, phase } = get();
    if (mode !== 'practice' || phase === 'shooting') return;
    const prevRules = rulesHistory.pop();
    if (!engine.undo()) return;
    set((s) => ({
      rules: prevRules ?? s.rules,
      phase: 'aiming',
      canUndo: engine.canUndo(),
      lastOutcome: null,
      worldVersion: s.worldVersion + 1,
    }));
  },
}));
