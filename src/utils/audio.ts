import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

export type SoundName = 'click' | 'rail' | 'pocket' | 'cue';

const SOURCES: Record<SoundName, number> = {
  click: require('../assets/sounds/click.wav'),
  rail: require('../assets/sounds/rail.wav'),
  pocket: require('../assets/sounds/pocket.wav'),
  cue: require('../assets/sounds/cue.wav'),
};

const POOL_SIZE: Record<SoundName, number> = { click: 4, rail: 3, pocket: 2, cue: 1 };
const MIN_GAP_MS: Record<SoundName, number> = { click: 25, rail: 40, pocket: 60, cue: 0 };

class SoundPool {
  private players: AudioPlayer[] = [];
  private index = 0;
  private lastPlayed = 0;

  constructor(
    private readonly name: SoundName,
    private readonly source: number,
    private readonly size: number,
  ) {}

  private ensure() {
    if (this.players.length) return;
    for (let i = 0; i < this.size; i++) {
      try {
        this.players.push(createAudioPlayer(this.source));
      } catch {
        // Audio may be unavailable (e.g. web without a user gesture). Fail silently.
      }
    }
  }

  play(volume: number) {
    const now = Date.now();
    if (now - this.lastPlayed < MIN_GAP_MS[this.name]) return;
    this.ensure();
    if (!this.players.length) return;
    this.lastPlayed = now;
    const p = this.players[this.index];
    this.index = (this.index + 1) % this.players.length;
    try {
      p.volume = Math.max(0.05, Math.min(1, volume));
      void p.seekTo(0);
      p.play();
    } catch {
      /* ignore */
    }
  }

  release() {
    for (const p of this.players) {
      try {
        p.remove();
      } catch {
        /* ignore */
      }
    }
    this.players = [];
  }
}

const pools: Record<SoundName, SoundPool> = {
  click: new SoundPool('click', SOURCES.click, POOL_SIZE.click),
  rail: new SoundPool('rail', SOURCES.rail, POOL_SIZE.rail),
  pocket: new SoundPool('pocket', SOURCES.pocket, POOL_SIZE.pocket),
  cue: new SoundPool('cue', SOURCES.cue, POOL_SIZE.cue),
};

let enabled = true;
let initialised = false;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export async function initAudio() {
  if (initialised) return;
  initialised = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false });
  } catch {
    /* ignore */
  }
}

/** Play a sound with a volume derived from the impact speed (world units / s). */
export function playSound(name: SoundName, volume = 1) {
  if (!enabled) return;
  pools[name].play(volume);
}

export function releaseAudio() {
  for (const p of Object.values(pools)) p.release();
}

/** Map an impact speed to a 0..1 volume curve. */
export const impactVolume = (speed: number, scale = 4) => Math.min(1, Math.pow(speed / scale, 0.7));
