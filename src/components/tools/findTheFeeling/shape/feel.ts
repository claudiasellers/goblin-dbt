/**
 * Presentation maths for the Shape room: how a shape vector looks, how the displayed object reacts
 * to the flow (capacity, urge, regulation, ambient descent). No clinical content: every value that
 * decides what happens next comes from the flow state and the graph gates.
 */
import type { Band, FindTheFeelingGates, ShapeVec, UrgeId } from '../../../../data/findTheFeelingTypes';
import type { FlowState } from '../../../../lib/findTheFeelingFlow';
import { ambientDescent, driftShape, regulationFor } from '../../../../lib/findTheFeeling';

/** The ShapeVec dims plus `grey` (derived visually: drained colour when blank). */
export interface Feel { sharp: number; heat: number; weight: number; buzz: number; clench: number; grey: number }
export const DIMS = ['sharp', 'heat', 'weight', 'buzz', 'clench'] as const;
export type Dim = (typeof DIMS)[number];
export const FEEL_KEYS = [...DIMS, 'grey'] as const;

/** How far one forced-choice pick moves a dimension. */
export const ROUND_STEP = 0.62;

export const clamp = (v: number, a = -1, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
export const easeInOut = (x: number) => { const t = clamp(x, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

export const fromVec = (v: readonly number[], grey = 0): Feel =>
  ({ sharp: v[0] ?? 0, heat: v[1] ?? 0, weight: v[2] ?? 0, buzz: v[3] ?? 0, clench: v[4] ?? 0, grey });
export const toVec = (f: Feel): ShapeVec => [f.sharp, f.heat, f.weight, f.buzz, f.clench];
export const copyFeel = (f: Feel): Feel => ({ ...f });
export const assignFeel = (to: Feel, from: Feel) => { for (const k of FEEL_KEYS) to[k] = from[k]; };

/** One variant in a find round: the current object nudged along one dimension. */
export function variant(f: Feel, dim: number, sign: 1 | -1): Feel {
  const k = DIMS[dim] ?? 'sharp';
  return { ...f, [k]: clamp(f[k] + sign * ROUND_STEP) };
}

/** The object's visible reaction to capacity and urge (display only; state.found is never touched). */
export function react(f: Feel, band: Band | null, pull: UrgeId | null): Feel {
  const m = copyFeel(f);
  if (band === 'flooded') { m.sharp = Math.max(m.sharp, 0.45); m.buzz = Math.max(m.buzz, 0.45); }
  if (band === 'stirred') m.sharp = clamp(m.sharp + 0.15);
  if (pull === 'blank') {
    m.grey = 1; m.buzz = -1; m.weight = Math.max(m.weight, 0.7); m.heat = Math.min(m.heat, -0.35); m.sharp = Math.min(m.sharp, 0);
  }
  return m;
}

export type RegKind = 'smooth' | 'warm';

/** Regulation progress 0..1 applied to the object: smooth calms it; warm brings colour and life back. */
export function regulate(b: Feel, kind: RegKind, p: number): Feel {
  const m = copyFeel(b);
  if (kind === 'smooth') {
    m.sharp = lerp(b.sharp, Math.min(b.sharp, -0.45), p);
    m.heat = lerp(b.heat, b.heat > 0 ? 0 : b.heat, p);
    m.buzz = lerp(b.buzz, Math.min(b.buzz, -0.6), p);
    m.clench = lerp(b.clench, b.clench * 0.45, p);
    // flooded + blank: calming also lets a little colour back in
    m.grey = lerp(b.grey, b.grey * 0.55, p);
  } else {
    m.grey = lerp(b.grey, 0, p);
    m.heat = lerp(b.heat, 0.42, p);
    m.buzz = lerp(b.buzz, 0.15, p);
    m.weight = lerp(b.weight, 0.1, p);
  }
  return m;
}

/** Which regulation this run calls for (from the graph gates), even after it was skipped. */
export function regKindFor(s: FlowState, gates: FindTheFeelingGates): RegKind | null {
  if (!s.band || !s.pull) return null;
  const r = regulationFor(s.way, s.band, s.pull, gates);
  return r === 'smooth' || r === 'warm' ? r : null;
}

/**
 * The object as currently displayed, from capacity onward: the found snapshot, its reaction to
 * band/urge, regulation (full once done, partial if skipped), then ambient descent.
 */
export function displayedFeel(s: FlowState, gates: FindTheFeelingGates, regProgress: number, pickedPull: UrgeId | null): Feel {
  if (!s.found || s.found.way !== 'shape') return fromVec([0, 0, 0, 0, 0]);
  let f = react(fromVec(s.found.vec), s.band, s.pull ?? pickedPull);
  const kind = regKindFor(s, gates);
  if (kind) {
    const p = s.step === 'regulate' ? regProgress : s.regulation === kind ? 1 : s.regulation === 'skipped' ? regProgress : 0;
    f = regulate(f, kind, p);
  }
  const d = ambientDescent({ stepsSinceStart: s.stepsSinceStart, band: s.band, pull: s.pull, gates, enabled: s.ambientDescent });
  if (d.level > 0) {
    const v = driftShape(toVec(f), d.level, d.direction);
    f = { ...fromVec(v), grey: d.direction === 'brighten' ? f.grey * (1 - d.level) : f.grey };
  }
  return f;
}

// ─── Colour ──────────────────────────────────────────────────────────────

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
export const COOL = hex('#71829a');
export const CLAY = hex('#b3a697');
export const WARM = hex('#c27a45');
export const HOT = hex('#b3301a');
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Clay colour for a feel (linear-ish sRGB 0..1), before grey. */
export function clayColor(f: Pick<Feel, 'heat' | 'clench'>): RGB {
  const heat = clamp(f.heat);
  let c = heat >= 0.5 ? mix(WARM, HOT, (heat - 0.5) * 2) : heat >= 0 ? mix(CLAY, WARM, heat * 2) : mix(CLAY, COOL, -heat);
  const k = 1 - 0.22 * Math.max(f.clench, 0) + 0.08 * Math.max(-f.clench, 0);
  c = [c[0] * k, c[1] * k, c[2] * k];
  return c;
}

export function greyed(c: RGB, grey: number): RGB {
  const lum = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const g = clamp(grey, 0, 1);
  return mix(c, [lum * 0.85, lum * 0.85, lum * 0.85], g);
}

export const css = (c: RGB, a = 1) => `rgba(${Math.round(clamp(c[0], 0, 1) * 255)},${Math.round(clamp(c[1], 0, 1) * 255)},${Math.round(clamp(c[2], 0, 1) * 255)},${a})`;
export const shade = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
export const tint = (c: RGB, t: number): RGB => mix(c, [1, 1, 1], t);

/** Approximate lowest point of the displaced form (local units), so it sits on its plinth. */
export function bottomOf(v: Feel) {
  const c = Math.max(v.clench, 0), h = Math.max(-v.clench, 0), H = Math.max(v.weight, 0), L = Math.max(-v.weight, 0);
  const b = -(1 - 0.26 * c) * (1 - 0.14 * h) * (1 - 0.3 * H + 0.1 * L) - 0.05 - Math.max(v.sharp, 0) * 0.12;
  return b + (Math.max(b, -0.6) - b) * H;
}

/**
 * Live values shared by the scene and the regulation surface without re-rendering React. Mutated
 * through methods so render-side code only ever reads it.
 */
export class LiveStore {
  main: Feel = { sharp: 0, heat: 0, weight: 0, buzz: 0, clench: 0, grey: 0 };
  /** Pending flinch impulse (consumed by the main object). */
  private flinchAmt = 0;
  /** Bumped on each pick so the main object pops. */
  pop = 0;
  /** Projected position/radius of the main object in room pixels (for stroking). */
  screen = { x: 0, y: 0, r: 60 };
  reduce = false;
  setMain(f: Feel) { this.main = f; }
  setReduce(r: boolean) { this.reduce = r; }
  flinch(a: number) { this.flinchAmt = Math.max(this.flinchAmt, a); }
  takeFlinch() { const a = this.flinchAmt; this.flinchAmt = 0; return a; }
  bumpPop() { this.pop++; }
  setScreen(x: number, y: number, r: number) { this.screen.x = x; this.screen.y = y; this.screen.r = r; }
}

export type UrgeMode = UrgeId | null;
