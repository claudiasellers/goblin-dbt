/**
 * Reflect's presentation helpers. Pure (tests/reflect-insights.test.mjs).
 */
import type { ToolLinkState } from './spine/toolLink';

/** History reads at most this many check-ins (getCheckInsByUser's ceiling). */
export const HISTORY_LIMIT = 500;

const PLEASANT = new Set(['high-pleasant', 'low-pleasant']);
/** The smallest distance from the middle line a dot is drawn at, so a check-in never reads as neutral. */
export const MIN_PLEASANTNESS = 0.1;

/**
 * Pleasantness, −1 (unpleasant) to +1 (pleasant), for the mood line.
 *
 * `intensity.x` is where the check-in sat on the feeling square's pleasantness axis (0–1; it is
 * the touch point, or the chosen word's spot). The line used to plot `intensity.y`, which is
 * energy, so a buzzy, mildly unpleasant moment drew as deeply unpleasant. The side comes from the
 * quadrant (the routed truth; older records saved x = 0.5), the distance from x.
 */
export function pleasantness(ci: { quadrant: string; intensity: { x: number } }): number {
  const sign = PLEASANT.has(ci.quadrant) ? 1 : -1;
  const x = Number.isFinite(ci.intensity?.x) ? Math.min(1, Math.max(0, ci.intensity.x)) : 0.5;
  return sign * Math.max(MIN_PLEASANTNESS, Math.abs(2 * x - 1));
}

/**
 * The words of one check-in for display. `emotion` is the chosen words joined with ", ", or the
 * quadrant id when none was chosen (no words then).
 */
export function checkInWords(ci: { emotion: string; quadrant: string }): string[] {
  if (!ci.emotion || ci.emotion === ci.quadrant) return [];
  return [...new Set(ci.emotion.split(',').map((w) => w.trim()).filter(Boolean))];
}

/**
 * Most used words, one bar per word (a check-in with two words counts once for each). The colour
 * is the quadrant of the word's most recent use. `checkIns` newest first.
 */
export function topWords(
  checkIns: Array<{ emotion: string; quadrant: string }>, limit = 5,
): Array<{ word: string; count: number; quadrant: string }> {
  const by = new Map<string, { word: string; count: number; quadrant: string; first: number }>();
  checkIns.forEach((ci, i) => {
    for (const w of checkInWords(ci)) {
      const k = w.toLowerCase();
      const cur = by.get(k);
      if (cur) cur.count++;
      else by.set(k, { word: w, count: 1, quadrant: ci.quadrant, first: i });
    }
  });
  return [...by.values()]
    .sort((a, b) => b.count - a.count || a.first - b.first)
    .slice(0, limit)
    .map(({ word, count, quadrant }) => ({ word, count, quadrant }));
}

/** Route state for a tool opened from Reflect: the spine's reserved `insights` entry. */
export const fromReflect = (): ToolLinkState => ({ spine: { entry: 'insights' } });

/**
 * How a tool's closes went, in the words the user answered with (the close's own labels: "Quieter"
 * for down, "A bit more here" / "More here" for orient), never a percentage.
 */
export function outcomeLine(t: {
  measure?: 'then_vs_now' | 'urge'; direction?: 'down' | 'orient' | null; answered?: number; wentWell?: number;
  totalUses: number; helpedPct: number;
}): string {
  const answered = t.answered ?? t.totalUses;
  const well = t.wentWell ?? Math.round((t.helpedPct / 100) * answered);
  const of = `${well} of ${answered} ${answered === 1 ? 'time' : 'times'}`;
  if (t.measure === 'urge') return `Didn't act on the urge ${of}`;
  if (t.direction === 'down') return `Quieter after, ${of}`;
  if (t.direction === 'orient') return `More here after, ${of}`;
  return `Helped ${of}`;
}
