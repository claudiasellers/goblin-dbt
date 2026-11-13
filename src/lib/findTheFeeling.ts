/**
 * Pure logic for "Find the feeling". Gates, thresholds, word signatures and routes all come from
 * the graph payload; this file only applies them. Type-only imports keep it dependency-free so
 * node:test can load it directly.
 */
import type {
  Band, FeelingFamily, FeelingWord, FindTheFeelingGates, Regulation, ShapeVec, SoundVec, UrgeId, Way,
} from '../data/findTheFeelingTypes';

export const SHAPE_DIMS = ['sharp', 'heat', 'weight', 'buzz', 'clench'] as const;
export const SOUND_DIMS = ['rough', 'grit', 'register', 'pulse'] as const;
export const NEUTRAL_SHAPE: ShapeVec = [0, 0, 0, 0, 0];
export const NEUTRAL_SOUND: SoundVec = [0.06, 0.04, 0.45, 0.05];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dist2 = (a: readonly number[], b: readonly number[]) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);

// ─── Gates ───────────────────────────────────────────────────────────────

/** Numb but flooded: the graph's flooding_triggered_shutdown rule. Regulate, orient, no word. */
export function isFloodedBlank(band: Band | null, pull: UrgeId | null): boolean {
  return band === 'flooded' && pull === 'blank';
}

/**
 * Which regulation step, if any. Flooded always calms first (bottom-up), including flooded+blank.
 * Blank alone activates and is never calmed. No band (the capacity question isn't asked): only the
 * pull decides.
 */
export function regulationFor(
  way: Way, band: Band | null, pull: UrgeId, gates: Pick<FindTheFeelingGates, 'regulateBands' | 'activateUrges'>,
): Exclude<Regulation, 'skipped'> {
  if (band && gates.regulateBands.includes(band)) return way === 'shape' ? 'smooth' : 'tune';
  if (gates.activateUrges.includes(pull)) return way === 'shape' ? 'warm' : 'wake';
  return 'none';
}

/** The regulation values a finished session may record for this band/pull (server re-checks the same). */
export function allowedRegulations(
  way: Way, band: Band | null, pull: UrgeId, gates: Pick<FindTheFeelingGates, 'regulateBands' | 'activateUrges'>,
): Regulation[] {
  const r = regulationFor(way, band, pull, gates);
  return r === 'none' ? ['none'] : [r, 'skipped'];
}

// ─── Words ───────────────────────────────────────────────────────────────

export type Found = { way: 'shape'; vec: ShapeVec } | { way: 'tune'; vec: SoundVec };

function wordVec(w: FeelingWord, found: Found): readonly number[] {
  return found.way === 'shape' ? w.shape : w.sound;
}

/** How far down a family's nearest words an own word may come from to be offered first (ER-10 part 3). */
export const OWN_WORD_REACH = 2;

/**
 * Families ordered by their nearest member to what the person found; words within a family by distance, then offer
 * order. `own` (the person's own words, most used first): an own word among a family's `OWN_WORD_REACH` nearest is
 * offered first in that family (words everywhere, ER-10 part 3). The family order stays the shape's or sound's.
 */
export function rankFamilies(families: FeelingFamily[], found: Found, own: readonly string[] = []): FeelingFamily[] {
  const scored = families.map(f => {
    const sorted = [...f.words]
      .map(w => ({ w, d: dist2(wordVec(w, found), found.vec) }))
      .sort((a, b) => a.d - b.d || a.w.offer - b.w.offer);
    const reach = sorted.slice(0, OWN_WORD_REACH).map(x => x.w.emotionId);
    const lead = own.find(id => reach.includes(id));
    const words = lead ? [...sorted.filter(x => x.w.emotionId === lead), ...sorted.filter(x => x.w.emotionId !== lead)] : sorted;
    return { f: { ...f, words: words.map(x => x.w) }, d: sorted.length ? sorted[0].d : Infinity };
  });
  return scored.filter(s => s.f.words.length).sort((a, b) => a.d - b.d || a.f.order - b.f.order).map(s => s.f);
}

export interface OfferState { familyIdx: number; wordIdx: number; offered: string[] }

export const firstOffer = (): OfferState => ({ familyIdx: 0, wordIdx: 0, offered: [] });

export function currentWord(ranked: FeelingFamily[], s: OfferState): FeelingWord | null {
  return ranked[s.familyIdx]?.words[s.wordIdx] ?? null;
}

/**
 * Answer to an offered word. "yes" and "close" accept it ("close enough"). "no" jumps to the nearest
 * word in the next family. After maxOffers refusals the word is null ("not knowing is fine").
 */
export function answerOffer(
  ranked: FeelingFamily[], s: OfferState, answer: 'yes' | 'close' | 'no', maxOffers: number,
): { state: OfferState; done: boolean; word: string | null } {
  const w = currentWord(ranked, s);
  if (!w) return { state: s, done: true, word: null };
  const offered = s.offered.includes(w.emotionId) ? s.offered : [...s.offered, w.emotionId];
  if (answer !== 'no') return { state: { ...s, offered }, done: true, word: w.emotionId };
  const next: OfferState = { familyIdx: s.familyIdx + 1, wordIdx: 0, offered };
  if (offered.length >= maxOffers || !currentWord(ranked, next)) return { state: next, done: true, word: null };
  return { state: next, done: false, word: null };
}

// ─── Routing ("where to next") ───────────────────────────────────────────

/**
 * At most two app tools. Word routes first (the graph concepts that ADDRESS the accepted emotion),
 * unless the person said nothing set it off; then the urge's routes. Flooded+blank gets
 * regulation tools only. Steady with no word route and a quiet urge may route nowhere.
 */
export function routeNext(opts: {
  band: Band | null; pull: UrgeId; word: FeelingWord | null; setOff: string | null;
  urgeRoutes: Record<string, string[]>; floodedBlankRoutes: string[]; exclude?: string[];
}): string[] {
  const { band, pull, word, setOff, urgeRoutes, floodedBlankRoutes, exclude = ['find-the-feeling'] } = opts;
  const out: string[] = [];
  const add = (ids: string[]) => { for (const id of ids) if (!out.includes(id) && !exclude.includes(id)) out.push(id); };
  if (isFloodedBlank(band, pull)) { add(floodedBlankRoutes); return out.slice(0, 2); }
  if (word && setOff !== 'nothing') add(word.addressedBy);
  add(urgeRoutes[pull] ?? []);
  return out.slice(0, 2);
}

/** Everything routeNext could ever return for this session: the server's subset check. */
export function allowedRoutes(opts: {
  words: FeelingWord[]; urgeRoutes: Record<string, string[]>; floodedBlankRoutes: string[];
}): Set<string> {
  const s = new Set<string>(opts.floodedBlankRoutes);
  for (const w of opts.words) for (const id of w.addressedBy) s.add(id);
  for (const ids of Object.values(opts.urgeRoutes)) for (const id of ids) s.add(id);
  return s;
}

// ─── Ambient descent ─────────────────────────────────────────────────────

/**
 * How far (0..maxTotal) the room has drifted since the start step. Direction: 'calm' normally and
 * for flooded+blank; 'brighten' for blank alone (shutdown needs activation, never calming).
 */
export function ambientDescent(opts: {
  stepsSinceStart: number; band: Band | null; pull: UrgeId | null;
  gates: Pick<FindTheFeelingGates, 'ambientDescent'>; enabled: boolean;
}): { level: number; direction: 'calm' | 'brighten' } {
  const a = opts.gates.ambientDescent;
  const direction = opts.pull === 'blank' ? (opts.band === 'flooded' ? a.floodedBlankDirection : a.blankDirection) : 'calm';
  if (!opts.enabled || opts.stepsSinceStart <= 0) return { level: 0, direction };
  return { level: Math.min(a.maxTotal, a.perStep * opts.stepsSinceStart), direction };
}

/** Apply ambient descent to a found shape: toward soft, cool-neutral, still; or toward warmer and a little livelier. */
export function driftShape(v: ShapeVec, level: number, direction: 'calm' | 'brighten'): ShapeVec {
  const target: ShapeVec = direction === 'calm' ? [-0.3, 0, v[2] * 0.5, -0.3, 0] : [v[0], 0.45, -0.2, 0.25, 0];
  return v.map((x, i) => clamp(x + (target[i] - x) * level, -1, 1)) as ShapeVec;
}

/** Apply ambient descent to a found sound: less beating, grit and tremolo; or brighter and livelier. */
export function driftSound(v: SoundVec, level: number, direction: 'calm' | 'brighten'): SoundVec {
  const target: SoundVec = direction === 'calm' ? [0.03, 0.03, v[2], 0.05] : [v[0], v[1], Math.max(v[2], 0.55), 0.35];
  return v.map((x, i) => clamp(x + (target[i] - x) * level, 0, 1)) as SoundVec;
}

// ─── Misc ────────────────────────────────────────────────────────────────

export const fill = (t: string, vars: Record<string, string | number>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

export const clampShape = (v: number[]): ShapeVec => SHAPE_DIMS.map((_, i) => clamp(v[i] ?? 0, -1, 1)) as ShapeVec;
export const clampSound = (v: number[]): SoundVec => SOUND_DIMS.map((_, i) => clamp(v[i] ?? 0, 0, 1)) as SoundVec;
