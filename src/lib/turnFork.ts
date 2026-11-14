/**
 * The turning-the-mind fork (DT-04 part 2, docs/design/let-it-be.md; plan C3b `turnFork`, DT-owned): the rules behind
 * src/components/skillPlayer/TurnFork.tsx, pure. Two paths part at a fork: the fight with it, and letting it be. Each
 * tap turns the small figure toward letting it be and leaves a footprint there: the turns are visible, never counted
 * in digits. The mind turns back, and that's expected (DT Handout 12: turn it again, and again).
 */

export type TurnOutcome = 'turned' | 'skipped';

/** At most this many footprints are drawn (later turns still count in the report). */
export const MAX_PRINTS = 12;

/**
 * Where footprint `i` (0-based) sits on the letting-it-be path, in the 240 × 200 drawing: alternating left and right
 * feet, walking up the right-hand path from the fork. Past MAX_PRINTS, null (not drawn).
 */
export function printAt(i: number): { x: number; y: number; r: number } | null {
  if (!Number.isInteger(i) || i < 0 || i >= MAX_PRINTS) return null;
  const t = (i + 1) / (MAX_PRINTS + 1);
  // On the drawn path: the curve from the fork (120, 150) through (150, 110) to (200, 30).
  const u = 1 - t;
  const x = u * u * 120 + 2 * u * t * 150 + t * t * 200 + (i % 2 ? 6 : -6);
  const y = u * u * 150 + 2 * u * t * 110 + t * t * 30;
  return { x: Math.round(x), y: Math.round(y), r: i % 2 ? -18 : 18 };
}

/** What the embed reports: `turned` once there was at least one turn, else `skipped`; the turns and whole seconds. */
export function turnOutput(turns: number, ms: number): { ids: [TurnOutcome]; doneCount: number; durationSec: number } {
  const n = Number.isInteger(turns) && turns > 0 ? Math.min(turns, 100) : 0;
  return { ids: [n > 0 ? 'turned' : 'skipped'], doneCount: n, durationSec: Math.max(0, Math.min(3600, Math.round(ms / 1000))) };
}
