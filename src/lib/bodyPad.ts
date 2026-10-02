/**
 * The sensation pad (docs/design/body-map.md, step 3): a small feeling square for one marked place.
 * Up is more intense, right is more comfortable. The dot picks the mark's colour on the figure and
 * which of the graph's pad words show (each word's `zones`). Pure; the words themselves come from
 * the graph (`getBodyMapContent`).
 */
import { clamp01, squareColor, type SquarePoint } from './feelingSquare';
import type { PadWord, PadZone } from '../data/bodyMapTypes';

/** A mark nobody has placed on the pad yet keeps the middle (the saved default). */
export const PAD_UNSET: SquarePoint = { x: 0.5, y: 0.5 };

/** Marks glow this warm mid-tone until their pad is touched. */
export const HEAT = 'color-mix(in oklab, var(--color-q-hu-fill), var(--color-q-hp-fill))';

/** Within this distance of the pad's middle lines, the words from the neighbouring quarter show too. */
export const PAD_BLEND = 0.12;

export function isPadSet(p: SquarePoint | null | undefined): p is SquarePoint {
  return Boolean(p) && !(p!.x === PAD_UNSET.x && p!.y === PAD_UNSET.y);
}

export function markColour(p: SquarePoint | null | undefined): string {
  return isPadSet(p) ? squareColor(p) : HEAT;
}

/** The quarter the dot is in, first, then any quarter it is close to (all four near the middle). */
export function padZones(p: SquarePoint | null | undefined): PadZone[] {
  if (!isPadSet(p)) return ['hu', 'lu', 'hp', 'lp'];
  const x = clamp01(p.x), y = clamp01(p.y);
  const ys: ('h' | 'l')[] = y >= 0.5 ? ['h'] : ['l'];
  const xs: ('u' | 'p')[] = x >= 0.5 ? ['p'] : ['u'];
  if (Math.abs(y - 0.5) < PAD_BLEND) ys.push(ys[0] === 'h' ? 'l' : 'h');
  if (Math.abs(x - 0.5) < PAD_BLEND) xs.push(xs[0] === 'p' ? 'u' : 'p');
  return ys.flatMap((a) => xs.map((b) => `${a}${b}` as PadZone));
}

/**
 * The words for a place at the pad's dot: words for this place (or anywhere) in the dot's quarters,
 * the dot's own quarter first, graph order within. Words already picked always stay, so moving the
 * dot never hides a choice.
 */
export function wordsForPad(words: PadWord[], region: string, p: SquarePoint | null | undefined, picked: string[] = []): PadWord[] {
  const zones = padZones(p);
  const rank = (w: PadWord) => Math.min(...w.zones.map((z) => (zones.includes(z) ? zones.indexOf(z) : 99)));
  return words
    .filter((w) => w.regions.length === 0 || w.regions.includes(region))
    .map((w, i) => ({ w, i, r: picked.includes(w.id) ? Math.min(rank(w), 98) : rank(w) }))
    .filter(({ r }) => r < 99)
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(({ w }) => w);
}

/** Says the dot back in plain words: how strong, then how comfortable. */
export function describePad(p: SquarePoint | null | undefined): string {
  if (!isPadSet(p)) return 'Touch to place the dot.';
  const strength = p.y > 0.66 ? 'Strong' : p.y < 0.34 ? 'Faint' : 'Medium';
  if (p.x < 0.4) return `${strength} and uncomfortable`;
  if (p.x > 0.6) return `${strength} and comfortable`;
  return `${strength}, not clearly either`;
}
