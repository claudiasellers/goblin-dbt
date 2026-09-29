// Stage it: the logical arrangement of the little set, how it is read, and the palettes.
import type { Band, Pull } from '../../script';
import type { SessionRecord } from '../../record';

export type ScenarioId = SessionRecord['scenarioId'];
export type FigId = 'you' | 'them' | 'o1' | 'o2' | 'o3';
export const OTHER_IDS: FigId[] = ['o1', 'o2', 'o3'];
export const FIG_IDS: FigId[] = ['you', 'them', ...OTHER_IDS];

export type Step =
  | 'set' | 'closest' | 'capacity' | 'pull' | 'breathe' | 'wake'
  | 'word' | 'validate' | 'need' | 'exits' | 'perform' | 'close' | 'shelf';

/** Stage radius (local units). Figures stay inside WALK. */
export const R = 1.6;
/** The whole set is turned a little for an isometric three-quarter view. */
export const STAGE_RY = -0.42;
/** World-intent (as seen from the front) to stage-local coordinates. */
export function wl(x: number, z: number): [number, number] {
  const c = Math.cos(STAGE_RY), s = Math.sin(STAGE_RY);
  return [x * c - z * s, x * s + z * c];
}
export const WALK = 1.38;
export const FIG_H = 0.9;

export interface P2 { x: number; z: number }
export interface Arr {
  you: P2 & { s: number };
  them: P2 & { s: number; turned: boolean; speech: boolean };
  others: P2[] | null;
  /** need step: the others open their circle toward you */
  open: boolean;
}

export const START_ARR = (): Arr => ({
  you: { x: -0.52, z: 0.34, s: 1 },
  them: { x: 0.5, z: 0.18, s: 1, turned: false, speech: false },
  others: null,
  open: false,
});

export const cloneArr = (a: Arr): Arr => ({
  you: { ...a.you },
  them: { ...a.them },
  others: a.others ? a.others.map(o => ({ ...o })) : null,
  open: a.open,
});

export const len = (x: number, z: number) => Math.hypot(x, z);
export const dist = (a: P2, b: P2) => Math.hypot(a.x - b.x, a.z - b.z);
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function clampToStage(p: P2, max = WALK): P2 {
  const l = len(p.x, p.z);
  if (l <= max) return p;
  return { x: (p.x / l) * max, z: (p.z / l) * max };
}

/** The others, huddled on the far side from you (the tap-alternative for "left out"). */
export function huddleFor(a: Arr): P2[] {
  const yl = Math.max(0.2, len(a.you.x, a.you.z));
  const ux = -a.you.x / yl, uz = -a.you.z / yl;
  const c = { x: ux * 0.9, z: uz * 0.9 - 0.25 };
  const cc = clampToStage(c, 0.95);
  return [0, 1, 2].map(i => {
    const ang = Math.PI * 0.35 + (i * Math.PI * 2) / 3;
    return clampToStage({ x: cc.x + Math.cos(ang) * 0.3, z: cc.z + Math.sin(ang) * 0.3 });
  });
}

export const centroid = (ps: P2[]): P2 => ({ x: ps.reduce((s, p) => s + p.x, 0) / ps.length, z: ps.reduce((s, p) => s + p.z, 0) / ps.length });

export type Cue = 'far' | 'turn' | 'tall' | 'small' | 'others' | 'speech';
const CUE_SCN: Record<Cue, ScenarioId> = { far: 'pulled-away', turn: 'brushed', tall: 'small', small: 'small', others: 'left-out', speech: 'mocked' };

/** Continuous reading of the arrangement. Returns the dominant scenario, or null if nothing reads yet. */
export function readScene(a: Arr, last: Cue | null): ScenarioId | null {
  const d = dist(a.you, a.them);
  const edge = len(a.them.x, a.them.z);
  const sc: Record<ScenarioId, number> = { brushed: 0, mocked: 0, 'left-out': 0, 'pulled-away': 0, small: 0 };
  if (a.them.turned) sc.brushed = 1;
  if (a.them.speech) sc.mocked = a.them.turned ? 0.55 : 1;
  sc['pulled-away'] = clamp((d - 1.45) / 0.55) * 0.6 + clamp((edge - 0.95) / 0.35) * 0.4;
  if (d < 1.3) sc['pulled-away'] *= 0.4;
  sc.small = clamp((a.them.s / a.you.s - 1.2) / 0.35);
  if (a.others) {
    const c = centroid(a.others);
    const spread = a.others.reduce((s, o) => s + dist(o, c), 0) / a.others.length;
    const apart = dist(a.you, c);
    sc['left-out'] = clamp((0.75 - spread) / 0.35) * clamp((apart - 0.7) / 0.5);
  }
  if (last) sc[CUE_SCN[last]] += 0.2;
  let best: ScenarioId | null = null, bv = 0.5;
  (Object.keys(sc) as ScenarioId[]).forEach(k => { if (sc[k] > bv) { bv = sc[k]; best = k; } });
  return best;
}

export const READING: Record<ScenarioId, string> = {
  brushed: 'they turned away from you.',
  mocked: 'they said something at you, and meant it to sting.',
  'left-out': 'they closed the circle without you.',
  'pulled-away': 'they went somewhere you can’t reach.',
  small: 'they towered, and you shrank.',
};

/** Which figure the gesture in scene three points at. */
export function readPull(start: P2, end: P2, them: P2, peakSpeed: number): Pull | null {
  const dx = end.x - start.x, dz = end.z - start.z;
  const m = Math.hypot(dx, dz);
  if (m < 0.22) return null;
  const tl = Math.max(0.001, dist(start, them));
  const along = (dx * (them.x - start.x) + dz * (them.z - start.z)) / tl / m; // cos angle
  const offEdge = len(end.x, end.z) > R * 0.96;
  if (along > 0.35 && !offEdge) return peakSpeed > 3.4 ? 'fight' : 'chase';
  return 'hide';
}

export const band2mood = (b: Band | null) => b;

// ---------------- palettes ----------------
export interface Pal {
  bg: string; bg2: string; floor: string; ink: string; ink2: string; line: string; paper: string; paperSolid: string;
  boards: string; boardsLine: string; drum: string; band: string; sky1: string; sky2: string; hill1: string; hill2: string;
  you: string; them: string; other: string; eye: string; speech: string; speechIn: string;
  blue: string; moon: string; star: string; accent: string; rust: string;
  amb: number; key: number; fill: number; rim: string; keyColor: string; cone: number;
  window: string; windowGlow: string; pool: string; floorGlow: number;
}

export const LIGHT: Pal = {
  bg: '#ECE4D6', bg2: '#E2D7C4', floor: '#DDD1BD', ink: '#2B241D', ink2: '#72675A', line: 'rgba(43,36,29,.16)',
  paper: 'rgba(251,247,240,.9)', paperSolid: '#FBF7F0',
  boards: '#F2E8D8', boardsLine: 'rgba(120,92,60,.13)', drum: '#B79C7C', band: '#C9A56A', sky1: '#C9D5DE', sky2: '#F1E4CF', hill1: '#DCC7A6', hill2: '#CDB08A',
  you: '#E0764A', them: '#7E8EA3', other: '#BCB2A4', eye: '#2B241D', speech: '#C9483A', speechIn: '#F6E3D6',
  blue: '#4E79B8', moon: '#F4E6C4', star: '#D9A441', accent: '#C4602F', rust: '#C9483A',
  amb: 0.95, key: 2.2, fill: 0.8, rim: '#fff3e2', keyColor: '#ffe2bd', cone: 0.0,
  window: '#F7F2E6', windowGlow: '#fff6df', pool: '#fff4df', floorGlow: 0.45,
};

export const DARK: Pal = {
  bg: '#1A1622', bg2: '#110E17', floor: '#221C2B', ink: '#F1E8DC', ink2: '#ADA2B4', line: 'rgba(241,232,220,.16)',
  paper: 'rgba(33,27,40,.88)', paperSolid: '#211B28',
  boards: '#4B3F4E', boardsLine: 'rgba(0,0,0,.2)', drum: '#2D2331', band: '#B08A55', sky1: '#1E1A3A', sky2: '#4A3452', hill1: '#33273F', hill2: '#281F33',
  you: '#F2885A', them: '#A3B4D6', other: '#8A8194', eye: '#1A1420', speech: '#E0604F', speechIn: '#3A1E22',
  blue: '#5B8FDB', moon: '#F3E4BD', star: '#F0C063', accent: '#F2885A', rust: '#E0604F',
  amb: 0.75, key: 3.2, fill: 0.55, rim: '#b7a6ff', keyColor: '#ffcf96', cone: 0.22,
  window: '#2C3C64', windowGlow: '#8FA6DC', pool: '#ffd9a8', floorGlow: 0.12,
};

/** Seed scenes for the shelf, one per starting word. */
export const SEEDS: { word: string; arr: Arr }[] = [
  { word: 'frustrated', arr: { you: { x: -0.4, z: 0.3, s: 1 }, them: { x: 0.45, z: 0.1, s: 1, turned: true, speech: false }, others: null, open: false } },
  { word: 'lonely', arr: { you: { x: -0.8, z: 0.5, s: 1 }, them: { x: 0.7, z: -0.3, s: 1, turned: true, speech: false }, others: [{ x: 0.4, z: -0.6 }, { x: 0.95, z: -0.65 }, { x: 0.55, z: -0.1 }], open: false } },
  { word: 'anxious', arr: { you: { x: -0.6, z: 0.5, s: 1 }, them: { x: 1.1, z: -0.6, s: 1, turned: false, speech: false }, others: null, open: false } },
  { word: 'tired', arr: { you: { x: -0.1, z: 0.25, s: 0.8 }, them: { x: 0.7, z: -0.3, s: 1.3, turned: false, speech: false }, others: null, open: false } },
];
