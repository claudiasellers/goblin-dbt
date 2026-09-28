/**
 * The Tune room's sound space: what the strings and the synth need to know, and the closer/further
 * search through it. Presentation only: no words, no clinical content. The 4-number vector is the
 * graph's SoundVec [rough, grit, register, pulse]; the rest is how the instrument renders it.
 */
import type { SoundVec } from '../../../../data/findTheFeelingTypes';
import { NEUTRAL_SOUND, clampSound } from '../../../../lib/findTheFeeling';

export interface Sound {
  rough: number;    // detune between the strings -> beating
  grit: number;     // sine -> saw/noise -> jagged line
  register: number; // low/thick/long waves -> high/thin/short waves
  pulse: number;    // tremolo rate + depth -> shimmer
  loud: number;     // level -> brightness/glow
  glide: number;    // breath: 1 = second string pulled up into tune
  bloom: number;    // consonant fifth
  warm: number;     // colour warmth (waking the strings)
  hush: number;     // 1 = strings faded out entirely
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const NEUTRAL: Sound = {
  rough: NEUTRAL_SOUND[0], grit: NEUTRAL_SOUND[1], register: NEUTRAL_SOUND[2], pulse: NEUTRAL_SOUND[3],
  loud: 0.18, glide: 0, bloom: 0, warm: 0.2, hush: 0,
};

/** Loudness follows the character: rough/gritty/fast sounds are louder, pure slow ones are quiet. */
export function soundFrom(v: readonly number[], extra: Partial<Sound> = {}): Sound {
  const [rough, grit, register, pulse] = v;
  const loud = clamp01(0.22 + 0.42 * Math.max(rough, grit) + 0.18 * pulse + 0.08 * register);
  return { rough, grit, register, pulse, loud, glide: 0, bloom: 0, warm: 0.35, hush: 0, ...extra };
}

/** Shared mapping so the eyes and ears agree. */
export const baseFreq = (register: number) => 98 * Math.pow(2, register * 1.7); // G2 .. ~C#4
/** Beat rate between the two strings, Hz. Glide pulls the second string up into tune. */
export const beatHz = (s: Sound) => 0.35 + s.rough * (1 - 0.88 * s.glide) * 8;
export const tremHz = (pulse: number) => 0.6 + pulse * 8.5;

// ─── Closer / further ────────────────────────────────────────────────────

const norm = (d: number[]) => { const l = Math.hypot(...d) || 1; return d.map(x => x / l) as SoundVec; };
const randDir = () => norm([0, 0, 0, 0].map(() => Math.random() * 2 - 1));
const add = (a: SoundVec, d: SoundVec, s: number) => clampSound(a.map((x, i) => x + d[i] * s));
const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(...a.map((x, i) => x - b[i]));
const dot = (a: readonly number[], b: readonly number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

/**
 * Adaptive hot/cold search. Each proposal is compared with the last accepted point.
 * Closer: step there, keep the heading (momentum), step a little bigger.
 * Further: stay put, try the opposite heading first, then an unexplored one; steps shrink.
 */
export class Search {
  x: SoundVec = [0.5, 0.5, 0.5, 0.5];
  d: SoundVec = randDir();
  s = 0.42;
  cand: SoundVec;
  tried: SoundVec[] = [];
  taps = 0;

  constructor() {
    this.d = this.pickDir();
    this.cand = add(this.x, this.d, this.s);
  }

  private pickDir(): SoundVec {
    let best = randDir(); let bestScore = -Infinity;
    for (let i = 0; i < 24; i++) {
      const d = randDir();
      const moved = dist(add(this.x, d, this.s), this.x);
      const away = this.tried.length ? Math.min(...this.tried.map(t => 1 - dot(t, d))) : 1;
      const score = moved * 1.2 + away;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return best;
  }

  closer() {
    this.taps++;
    this.x = this.cand;
    this.tried = [];
    const jitter = randDir();
    this.d = norm(this.d.map((v, i) => v + jitter[i] * 0.3));
    this.s = Math.min(this.s * 1.15, 0.45) * Math.pow(0.94, this.taps);
    this.propose();
  }

  further() {
    this.taps++;
    this.tried.push(this.d);
    this.d = this.tried.length === 1 ? (this.d.map(v => -v) as SoundVec) : this.pickDir();
    this.s = Math.max(this.s * 0.82, 0.12) * Math.pow(0.97, this.taps);
    this.propose();
  }

  private propose() {
    let c = add(this.x, this.d, this.s);
    if (dist(c, this.x) < 0.06) { this.tried.push(this.d); this.d = this.pickDir(); c = add(this.x, this.d, this.s); }
    this.cand = c;
  }
}

// ─── Scene sounds (what the instrument plays in each part of the flow) ────

/** After a completed "breathe into tune": slow soft beating, a little bloom. */
export const settled = (s: Sound): Sound =>
  ({ ...s, rough: Math.min(s.rough, 0.04), grit: s.grit * 0.4, pulse: s.pulse * 0.4, loud: Math.min(s.loud, 0.4), bloom: 0.5, warm: 0.55 });

/** After a completed "wake": warmer, a little brighter. */
export const woken = (s: Sound): Sound =>
  ({ ...s, register: Math.max(s.register, 0.45), loud: Math.max(s.loud, 0.45), warm: 0.85, pulse: Math.max(s.pulse, 0.1) });

/** Flooded start: the second string pulled well out of tune. */
export const detuned = (s: Sound): Sound => ({ ...s, rough: Math.max(0.6, s.rough), loud: Math.max(0.55, s.loud) });

/** Breath n of total: the beating slows, grit and tremolo fall away; the last breath brings them into tune. */
export function breathSound(start: Sound, n: number, total: number): Sound {
  const r0 = Math.max(0.6, start.rough);
  const done = n >= total;
  const k = Math.pow(0.6, n * (5 / Math.max(1, total)));
  return {
    ...start, rough: done ? 0.02 : r0 * k, grit: start.grit * Math.pow(0.72, n), pulse: start.pulse * Math.pow(0.7, n),
    loud: Math.max(0.35, Math.max(0.55, start.loud) - n * 0.04), bloom: done ? 1 : 0, warm: 0.35 + Math.min(1, n / total) * 0.5,
  };
}

/** Pluck n of total while waking (n = 0: dim, low, nearly still): brighter, warmer, louder. */
export function wakeSound(start: Sound, n: number, total: number): Sound {
  const k = Math.min(1, n / Math.max(1, total));
  return { ...NEUTRAL, register: start.register * 0.7 + k * 0.3, loud: 0.05 + k * 0.6, warm: k, rough: 0.03, grit: 0, pulse: k * 0.15 };
}

/** A harp string's pitch for a collected word: its own register, up an octave. */
export const harpFreq = (sound: SoundVec | null, i: number) =>
  sound ? baseFreq(sound[2]) * 2 : 196 * Math.pow(2, [0, 2, 4, 7, 9][i % 5] / 12);
