// The feeling as an object. Every dimension is signed: 0 is neutral grey clay.
//   sharp  -1 soft/rounded  ..  +1 spiky, ridged
//   heat   -1 cool blue-grey ..  +1 hot red/orange
//   weight -1 light, floats  ..  +1 heavy, sags
//   buzz   -1 perfectly still .. +1 fast jittery pulsing
//   clench -1 hollow, dented ..  +1 small, tight, dense
export type Dim = 'sharp' | 'heat' | 'weight' | 'buzz' | 'clench';
export type Feel = Record<Dim, number> & { grey: number };

export const NEUTRAL: Feel = { sharp: 0, heat: 0, weight: 0, buzz: 0, clench: 0, grey: 0 };
export const clamp = (v: number, a = -1, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const copyFeel = (f: Feel): Feel => ({ ...f });

/** Five forced-choice rounds. `plus` is the +1 end of the dimension. */
export const ROUNDS: { dim: Dim; plus: string; minus: string; title: string }[] = [
  { dim: 'sharp', plus: 'sharp', minus: 'soft', title: 'Edge' },
  { dim: 'heat', plus: 'hot', minus: 'cool', title: 'Temperature' },
  { dim: 'weight', plus: 'heavy', minus: 'light', title: 'Weight' },
  { dim: 'buzz', plus: 'buzzing', minus: 'still', title: 'Motion' },
  { dim: 'clench', plus: 'clenched', minus: 'hollow', title: 'Density' },
];
export const STEP = 0.62;

/** Word prototypes in feature space. Unspecified dims are 0. */
const PROTOS: { word: string; f: Partial<Record<Dim, number>> }[] = [
  { word: 'furious', f: { sharp: 0.95, heat: 0.95, buzz: 0.8, clench: 0.3 } },
  { word: 'frustrated', f: { sharp: 0.6, heat: 0.55, buzz: 0.55, clench: 0.1 } },
  { word: 'humiliated', f: { heat: 0.75, weight: 0.75, sharp: 0.15, clench: -0.2 } },
  { word: 'embarrassed', f: { heat: 0.6, weight: 0.35, buzz: 0.35 } },
  { word: 'hurt', f: { weight: 0.6, heat: -0.35, buzz: -0.5, clench: -0.3 } },
  { word: 'ashamed', f: { weight: 0.85, heat: -0.15, buzz: -0.45, clench: 0.35 } },
  { word: 'scared', f: { clench: 0.85, buzz: 0.8, heat: -0.6, weight: -0.2 } },
  { word: 'anxious', f: { clench: 0.55, buzz: 0.7, heat: -0.3, sharp: 0.3 } },
  { word: 'lonely', f: { clench: -0.8, heat: -0.6, buzz: -0.6, weight: 0.2 } },
  { word: 'abandoned', f: { clench: -0.7, heat: -0.45, buzz: -0.3, weight: 0.55 } },
  { word: 'invisible', f: { clench: -0.9, heat: -0.7, buzz: -0.8, weight: -0.5 } },
];
const DIMS: Dim[] = ['sharp', 'heat', 'weight', 'buzz', 'clench'];

/** Rank word hypotheses by distance to the shape. Returns the three closest. */
export function candidates(f: Feel): string[] {
  return PROTOS
    .map(p => ({ w: p.word, d: DIMS.reduce((s, k) => s + (f[k] - (p.f[k] ?? 0)) ** 2, 0) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map(x => x.w);
}

/** Museum "medium" line, e.g. "Clay, ridged and hot, sitting low." */
export function medium(f: Feel): string {
  const bits: string[] = [];
  if (f.sharp > 0.3) bits.push('ridged'); else if (f.sharp < -0.3) bits.push('smoothed');
  if (f.heat > 0.3) bits.push('hot'); else if (f.heat < -0.3) bits.push('cool');
  if (f.clench > 0.3) bits.push('pressed tight'); else if (f.clench < -0.3) bits.push('hollowed');
  if (f.buzz > 0.3) bits.push('trembling'); else if (f.buzz < -0.3) bits.push('still');
  const tail = f.weight > 0.3 ? ', sitting low' : f.weight < -0.3 ? ', barely resting' : '';
  if (!bits.length) return `Clay, unfired${tail}.`;
  const list = bits.length > 1 ? `${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]}` : bits[0];
  return `Clay, ${list}${tail}.`;
}

/** Plausible shapes for the pre-seeded collection. */
export const SEED_SHAPES: Record<string, Feel> = {
  frustrated: { sharp: 0.6, heat: 0.65, weight: 0, buzz: 0.45, clench: 0.1, grey: 0 },
  lonely: { sharp: -0.3, heat: -0.6, weight: 0.1, buzz: -0.7, clench: -0.85, grey: 0.15 },
  anxious: { sharp: 0.25, heat: -0.45, weight: -0.3, buzz: 0.8, clench: 0.7, grey: 0 },
  tired: { sharp: -0.5, heat: -0.2, weight: 0.95, buzz: -0.9, clench: 0, grey: 0.45 },
};
