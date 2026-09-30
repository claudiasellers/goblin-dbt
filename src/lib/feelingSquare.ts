/**
 * The feeling square: where a touch lands, what that place is called, which words live near it.
 *
 * Coordinates are the same ones src/data/emotions.ts uses: x is pleasantness (0 unpleasant,
 * 1 pleasant), y is energy (0 low, 1 high). The square draws high energy at the top, so screen
 * position converts with y = 1 - top.
 *
 * Presentation only: this decides which words to offer first and how to say back where the touch
 * landed. What the chosen words mean clinically still comes from the graph.
 */
import { emotions, getEmotionByName, getEmotionById, type Emotion } from '../data/emotions';
import type { RelatedEmotion } from '../services/neo4j';

export interface SquarePoint {
  /** Pleasantness, 0 (unpleasant) to 1 (pleasant). */
  x: number;
  /** Energy, 0 (low) to 1 (high). */
  y: number;
}

export type Quadrant = 'high-unpleasant' | 'high-pleasant' | 'low-unpleasant' | 'low-pleasant';

export const QUADRANT_ABBR: Record<string, 'hu' | 'hp' | 'lu' | 'lp'> = {
  'high-unpleasant': 'hu',
  'high-pleasant': 'hp',
  'low-unpleasant': 'lu',
  'low-pleasant': 'lp',
};

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function quadrantAt(p: SquarePoint): Quadrant {
  const high = p.y >= 0.5;
  const pleasant = p.x >= 0.5;
  if (high) return pleasant ? 'high-pleasant' : 'high-unpleasant';
  return pleasant ? 'low-pleasant' : 'low-unpleasant';
}

/**
 * The colour of a point on the square, as a CSS colour built from the room's own quadrant
 * fills (a bilinear mix, the same blend the square draws), so every room tints in its own colours.
 */
export function squareColor(p: SquarePoint): string {
  const a = Math.round((1 - clamp01(p.x)) * 100);
  const b = Math.round(clamp01(p.y) * 100);
  const top = `color-mix(in oklab, var(--color-q-hu-fill) ${a}%, var(--color-q-hp-fill))`;
  const bottom = `color-mix(in oklab, var(--color-q-lu-fill) ${a}%, var(--color-q-lp-fill))`;
  return `color-mix(in oklab, ${top} ${b}%, ${bottom})`;
}

/** Says back where the touch landed, in plain words. Energy first, then how it feels. */
export function describePlace(p: SquarePoint): string {
  const { x, y } = p;
  if (Math.abs(x - 0.5) < 0.1 && Math.abs(y - 0.5) < 0.1) {
    return 'Somewhere in the middle. That counts too.';
  }
  const energy =
    y > 0.75
      ? 'Lots of energy'
      : y > 0.5
        ? 'Some energy'
        : y > 0.25
          ? 'Not much energy'
          : x >= 0.5
            ? 'Slow and quiet'
            : 'Running very low';
  const feel =
    x < 0.25
      ? 'and it doesn’t feel good'
      : x < 0.5
        ? 'and it feels a bit off'
        : x < 0.75
          ? 'and it feels okay'
          : 'and it feels good';
  let close = '.';
  if (x < 0.3 && y > 0.7) close = '. That’s a hard place to be.';
  else if (x < 0.3 && y < 0.3) close = '. We’ll go gently.';
  else if (x > 0.7 && y > 0.7) close = '. Nice.';
  return `${energy}, ${feel}${close}`;
}

/** Short label for screen readers as the point moves. */
export function placeLabel(p: SquarePoint): string {
  const energy = p.y > 0.66 ? 'high energy' : p.y > 0.33 ? 'medium energy' : 'low energy';
  const feel = p.x < 0.33 ? 'unpleasant' : p.x > 0.66 ? 'pleasant' : 'mixed';
  return `${energy}, ${feel}`;
}

/**
 * Every word, nearest the point first. Core words (the common ones) get pulled a little closer
 * so the first screen favours words people actually use over rarer neighbours.
 */
export function wordsNear(p: SquarePoint): Emotion[] {
  return emotions
    .filter((e) => typeof e.x === 'number' && typeof e.y === 'number')
    .map((e) => {
      const d = Math.hypot((e.x as number) - p.x, (e.y as number) - p.y);
      return { e, s: d * (e.core ? 0.72 : 1) };
    })
    .sort((a, b) => a.s - b.s)
    .map((r) => r.e);
}

export function formatEmotionName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Related words (graph results plus same-family neighbours), deduped, minus what is already chosen,
 * nudged toward the quadrants the person has picked from. Top `limit` (default three).
 */
export function rankRelatedEmotions(candidates: RelatedEmotion[], selected: string[], limit = 3): RelatedEmotion[] {
  const seen = new Set<string>();
  const selectedLower = new Set(selected.map((s) => s.toLowerCase()));
  const deduped = candidates.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return !selectedLower.has(formatEmotionName(c.name).toLowerCase());
  });

  const qCounts: Record<string, number> = {};
  let total = 0;
  for (const name of selected) {
    const e = getEmotionByName(name);
    if (e) {
      qCounts[e.quadrant] = (qCounts[e.quadrant] || 0) + 1;
      total++;
    }
  }

  return deduped
    .map((c, i) => {
      const e = getEmotionByName(formatEmotionName(c.name)) || getEmotionById(c.id);
      const boost = e && total > 0 ? (qCounts[e.quadrant] || 0) / total : 0;
      return { c, score: Math.max(0, 1 - i * 0.15) + boost };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.c);
}

/**
 * One place on the square and the words picked for it. A check-in can hold up to MAX_SPOTS spots,
 * for feelings that sit in different parts of the square at once (anxious and excited, say).
 */
export interface Spot {
  point: SquarePoint | null;
  words: string[];
}

export const MAX_SPOTS = 3;

export const emptySpot = (): Spot => ({ point: null, words: [] });

/** Every picked word across spots, first-picked first, no repeats. */
export function allWords(spots: Spot[]): string[] {
  return [...new Set(spots.flatMap((s) => s.words))];
}

/**
 * The spot whose words sit in the quadrant the check-in is routed on, so intensity comes from the
 * same place as the recommendation. Falls back to the first spot with a point.
 */
export function leadSpot(spots: Spot[], quadrant: string): Spot | undefined {
  return (
    spots.find((s) => s.point && s.words.some((w) => getEmotionByName(w)?.quadrant === quadrant)) ??
    spots.find((s) => s.point)
  );
}

export function listWords(words: string[]): string {
  const lower = words.map((w) => w.toLowerCase());
  if (lower.length <= 2) return lower.join(' and ');
  return `${lower[0]} +${lower.length - 1}`;
}
