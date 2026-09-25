// The sound space and the warmer/colder search through it. No numbers ever reach the screen.

/** Everything the strings and the synth need to know, all 0..1. */
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

export type Vec4 = [number, number, number, number]; // rough, grit, register, pulse

export const NEUTRAL: Sound = { rough: 0.06, grit: 0.04, register: 0.45, pulse: 0.05, loud: 0.18, glide: 0, bloom: 0, warm: 0.2, hush: 0 };

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Loudness follows the character: rough/gritty/fast sounds are louder, pure slow ones are quiet. */
export function soundFrom(v: Vec4, extra: Partial<Sound> = {}): Sound {
  const [rough, grit, register, pulse] = v;
  const loud = clamp01(0.22 + 0.42 * Math.max(rough, grit) + 0.18 * pulse + 0.08 * register);
  return { rough, grit, register, pulse, loud, glide: 0, bloom: 0, warm: 0.35, hush: 0, ...extra };
}

const norm = (d: number[]) => { const l = Math.hypot(...d) || 1; return d.map(x => x / l) as Vec4; };
const randDir = () => norm([0, 0, 0, 0].map(() => Math.random() * 2 - 1));
const add = (a: Vec4, d: Vec4, s: number) => a.map((x, i) => clamp01(x + d[i] * s)) as Vec4;
const dist = (a: number[], b: number[]) => Math.hypot(...a.map((x, i) => x - b[i]));
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

/**
 * Adaptive hot/cold search. Each proposal is compared with the last accepted point.
 * Closer: step there, keep the heading (momentum), step a little bigger.
 * Further: stay put, try the opposite heading first, then an unexplored one; steps shrink.
 */
export class Search {
  x: Vec4 = [0.5, 0.5, 0.5, 0.5];
  d: Vec4 = randDir();
  s = 0.42;
  cand: Vec4;
  tried: Vec4[] = [];
  taps = 0;

  constructor() {
    // First heading: pick one that actually moves somewhere audible.
    this.d = this.pickDir();
    this.cand = add(this.x, this.d, this.s);
  }

  private pickDir(): Vec4 {
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
    this.d = this.tried.length === 1 ? (this.d.map(v => -v) as Vec4) : this.pickDir();
    this.s = Math.max(this.s * 0.82, 0.12) * Math.pow(0.97, this.taps);
    this.propose();
  }

  private propose() {
    let c = add(this.x, this.d, this.s);
    if (dist(c, this.x) < 0.06) { this.tried.push(this.d); this.d = this.pickDir(); c = add(this.x, this.d, this.s); }
    this.cand = c;
  }
}

/** Families of words, each with the sound that tends to carry it. Weighted toward the most telling cues. */
const FAMILIES: { words: string[]; p: Vec4 }[] = [
  { words: ['frustrated', 'furious'], p: [0.85, 0.8, 0.5, 0.75] },            // rough + gritty + fast
  { words: ['hurt', 'humiliated'], p: [0.8, 0.3, 0.15, 0.15] },               // rough + low + slow
  { words: ['anxious', 'scared'], p: [0.45, 0.3, 0.88, 0.88] },               // high + fast + tremolo
  { words: ['lonely', 'abandoned', 'invisible'], p: [0.1, 0.08, 0.18, 0.12] },// low + pure + slow + quiet
  { words: ['ashamed', 'small'], p: [0.35, 0.85, 0.12, 0.18] },               // low + gritty + slow
];

/** Ordered families, nearest first. */
export function rankFamilies(v: Vec4) {
  return FAMILIES.map(f => ({ ...f, d: dist(v, f.p) })).sort((a, b) => a.d - b.d);
}

/** Walks the hypotheses: "Close" stays in the family, "Not that" jumps family. */
export class WordWalk {
  fams: { words: string[] }[];
  fi = 0; wi = 0; offered = 0;
  constructor(v: Vec4) { this.fams = rankFamilies(v); }
  current() { return this.fams[this.fi]?.words[this.wi] ?? null; }
  next(kind: 'close' | 'not'): string | null {
    this.offered++;
    if (this.offered >= 3) return null;
    if (kind === 'close' && this.wi + 1 < this.fams[this.fi].words.length) this.wi++;
    else { this.fi++; this.wi = 0; }
    return this.current();
  }
}
