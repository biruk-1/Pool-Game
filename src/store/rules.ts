import { isSolid, isStripe } from '../game/constants';

export type GameMode = 'pass-play' | 'practice';
export type Group = 'solids' | 'stripes';
export type PlayerIndex = 0 | 1;
export type BallInHand = 'none' | 'anywhere' | 'kitchen';

export interface RulesState {
  mode: GameMode;
  currentPlayer: PlayerIndex;
  groups: [Group | null, Group | null];
  isBreak: boolean;
  ballInHand: BallInHand;
  winner: PlayerIndex | null;
  /** All pocketed object balls, in order. */
  pocketed: number[];
  message: string;
  foul: string | null;
  shotCount: number;
}

/** What happened during one shot, gathered from physics events. */
export interface ShotSummary {
  pocketed: number[];
  firstContact: number | null;
  cushionAfterContact: boolean;
  cueScratched: boolean;
  /** Distinct object balls that touched a cushion (used for the break). */
  ballsToRail: number;
}

export interface ShotResolution {
  state: RulesState;
  /** The 8-ball was pocketed on the break and must be re-spotted. */
  respot8: boolean;
  /** The cue ball must be put back on the table for placement. */
  cueReset: boolean;
  outcome: 'continue' | 'switch' | 'foul' | 'win' | 'loss' | 'cleared';
}

export const PLAYER_NAMES = ['Player 1', 'Player 2'] as const;

export function createRulesState(mode: GameMode): RulesState {
  return {
    mode,
    currentPlayer: 0,
    groups: [null, null],
    isBreak: true,
    ballInHand: 'kitchen',
    winner: null,
    pocketed: [],
    message: mode === 'practice' ? 'Practice — place the cue ball and break' : 'Player 1 to break',
    foul: null,
    shotCount: 0,
  };
}

export const groupOf = (id: number): Group | null => (isSolid(id) ? 'solids' : isStripe(id) ? 'stripes' : null);

export const other = (p: PlayerIndex): PlayerIndex => (p === 0 ? 1 : 0);

export function groupBalls(group: Group): number[] {
  return group === 'solids' ? [1, 2, 3, 4, 5, 6, 7] : [9, 10, 11, 12, 13, 14, 15];
}

export function remainingForGroup(state: RulesState, group: Group | null): number[] {
  if (!group) return [];
  return groupBalls(group).filter((id) => !state.pocketed.includes(id));
}

function groupCleared(pocketedBefore: number[], group: Group | null): boolean {
  if (!group) return false;
  return groupBalls(group).every((id) => pocketedBefore.includes(id));
}

export function resolveShot(prev: RulesState, shot: ShotSummary): ShotResolution {
  const state: RulesState = {
    ...prev,
    groups: [...prev.groups] as [Group | null, Group | null],
    pocketed: [...prev.pocketed],
    shotCount: prev.shotCount + 1,
    foul: null,
  };
  const objectPocketed = shot.pocketed.filter((id) => id !== 0);
  for (const id of objectPocketed) if (!state.pocketed.includes(id)) state.pocketed.push(id);
  const eightPocketed = objectPocketed.includes(8);

  // ---------------- Practice ----------------
  if (state.mode === 'practice') {
    state.isBreak = false;
    const remaining = 15 - state.pocketed.length;
    if (shot.cueScratched) {
      state.ballInHand = 'anywhere';
      state.foul = 'Scratch';
      state.message = 'Scratch — place the cue ball anywhere';
    } else {
      state.ballInHand = 'none';
      state.message =
        remaining === 0
          ? 'Table cleared — reset to rack again'
          : objectPocketed.length > 0
            ? `${objectPocketed.length} ball${objectPocketed.length > 1 ? 's' : ''} pocketed · ${remaining} left`
            : `${remaining} ball${remaining !== 1 ? 's' : ''} remaining`;
    }
    return {
      state,
      respot8: false,
      cueReset: shot.cueScratched,
      outcome: remaining === 0 ? 'cleared' : shot.cueScratched ? 'foul' : 'continue',
    };
  }

  // ---------------- Pass & Play (8-ball) ----------------
  const shooter = state.currentPlayer;
  const opponent = other(shooter);
  const myGroup = state.groups[shooter];
  const tableOpen = myGroup === null;
  const clearedBeforeShot = groupCleared(prev.pocketed, myGroup);

  let foul: string | null = null;
  if (shot.cueScratched) foul = 'Scratch';
  else if (shot.firstContact === null) foul = 'No ball contacted';
  else if (!state.isBreak) {
    const firstGroup = groupOf(shot.firstContact);
    if (shot.firstContact === 8 && !clearedBeforeShot) foul = 'Hit the 8-ball first';
    else if (!tableOpen && firstGroup !== null && firstGroup !== myGroup && !(shot.firstContact === 8 && clearedBeforeShot))
      foul = 'Wrong ball hit first';
    else if (!shot.cushionAfterContact && objectPocketed.length === 0) foul = 'No rail after contact';
  } else if (objectPocketed.length === 0 && shot.ballsToRail < 4 && !shot.cueScratched) {
    foul = 'Weak break';
  }

  // ---- 8-ball outcomes ----
  if (eightPocketed) {
    if (state.isBreak) {
      // Re-spot the 8; shooter keeps shooting unless they scratched.
      state.isBreak = false;
      if (foul) {
        state.currentPlayer = opponent;
        state.ballInHand = 'anywhere';
        state.foul = foul;
        state.message = `${foul} — ${PLAYER_NAMES[opponent]} has ball in hand`;
        return { state, respot8: true, cueReset: shot.cueScratched, outcome: 'foul' };
      }
      state.ballInHand = 'none';
      state.message = `8-ball re-spotted — ${PLAYER_NAMES[shooter]} continues`;
      return { state, respot8: true, cueReset: false, outcome: 'continue' };
    }
    const legalWin = clearedBeforeShot && !foul;
    state.winner = legalWin ? shooter : opponent;
    state.ballInHand = 'none';
    state.foul = legalWin ? null : foul ?? (clearedBeforeShot ? null : '8-ball pocketed early');
    state.message = legalWin
      ? `${PLAYER_NAMES[shooter]} wins!`
      : `${PLAYER_NAMES[shooter]} pocketed the 8-ball ${foul ? 'on a foul' : 'early'} — ${PLAYER_NAMES[opponent]} wins`;
    return { state, respot8: false, cueReset: false, outcome: legalWin ? 'win' : 'loss' };
  }

  // ---- Group assignment (open table, legal shot that pocketed something) ----
  if (tableOpen && !foul && !state.isBreak && objectPocketed.length > 0) {
    const first = objectPocketed.find((id) => id !== 8);
    if (first !== undefined) {
      const g = groupOf(first)!;
      state.groups[shooter] = g;
      state.groups[opponent] = g === 'solids' ? 'stripes' : 'solids';
    }
  }

  const wasBreak = state.isBreak;
  state.isBreak = false;

  if (foul) {
    state.currentPlayer = opponent;
    // Break fouls hand the table over behind the head string; later fouls anywhere.
    state.ballInHand = wasBreak ? 'kitchen' : 'anywhere';
    state.foul = foul;
    state.message = `${foul} — ${PLAYER_NAMES[opponent]} has ball in hand`;
    return { state, respot8: false, cueReset: shot.cueScratched || wasBreak, outcome: 'foul' };
  }

  // Legal shot: does the shooter continue?
  const assigned = state.groups[shooter];
  const pocketedOwn = assigned
    ? objectPocketed.some((id) => groupOf(id) === assigned)
    : objectPocketed.length > 0; // still open after the break: any ball keeps the turn
  state.ballInHand = 'none';

  if (pocketedOwn) {
    const left = remainingForGroup(state, assigned).length;
    state.message = assigned
      ? left === 0
        ? `${PLAYER_NAMES[shooter]} — sink the 8-ball!`
        : `${PLAYER_NAMES[shooter]} on ${assigned} · ${left} left`
      : `${PLAYER_NAMES[shooter]} continues — table open`;
    return { state, respot8: false, cueReset: false, outcome: 'continue' };
  }

  state.currentPlayer = opponent;
  const oppGroup = state.groups[opponent];
  const oppLeft = remainingForGroup(state, oppGroup).length;
  state.message = oppGroup
    ? oppLeft === 0
      ? `${PLAYER_NAMES[opponent]} — sink the 8-ball!`
      : `${PLAYER_NAMES[opponent]} on ${oppGroup} · ${oppLeft} left`
    : `${PLAYER_NAMES[opponent]} to shoot — table open`;
  return { state, respot8: false, cueReset: false, outcome: 'switch' };
}

/** Which balls a player still needs (for the HUD). */
export function targetDescription(state: RulesState, player: PlayerIndex): string {
  const g = state.groups[player];
  if (state.mode === 'practice') return 'Free play';
  if (!g) return 'Open table';
  const left = remainingForGroup(state, g).length;
  return left === 0 ? '8-ball' : `${g === 'solids' ? 'Solids' : 'Stripes'} · ${left} left`;
}
