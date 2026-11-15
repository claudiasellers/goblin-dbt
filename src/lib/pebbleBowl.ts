/**
 * The pebble bowl (MF-01, docs/design/notice-and-name.md), pure: the rules the `pebbleBowl` embed shares with its
 * tests. One noticing task on screen for a set time; each time the person comes back to it (or, for Listen, each new
 * sound) they tap, and a pebble drops into the bowl. PRD – Mindfulness §4, runtime rule 6: returns are marks, not
 * numbers. The count is reported as a measure (`doneCount`), never shown as a figure and never judged.
 *
 * The timer runs on the deadline clock (src/hooks/useDeadlineTimer.ts, R13), with no chime: MF's runtime rule 8 has
 * sound off by default, and every step works muted.
 */

export type BowlOutcome = 'done' | 'partly' | 'skipped';

/** The bowl holds this many pebbles on screen; later taps still count (the measure), the bowl just stays full. */
export const BOWL_SHOWN = 24;

const int = (v: unknown, lo: number, hi: number, dflt: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : dflt;

/** The noticing time in ms, from props (build.py has checked the range; anything off falls back to a minute). */
export function bowlMs(props: Record<string, unknown>): number {
  return int(props.seconds, 10, 300, 60) * 1000;
}

/** The outcome: the whole time is `done`, any of it `partly`, never started `skipped`. */
export function bowlOutcome(started: boolean, fraction: number): BowlOutcome {
  if (!started) return 'skipped';
  return fraction >= 1 ? 'done' : 'partly';
}

/** What the embed reports: the outcome, the seconds it ran and how many pebbles dropped (a measure, never shown). */
export function bowlOutput(started: boolean, fraction: number, ranMs: number, pebbles: number): { ids: [BowlOutcome]; durationSec: number; doneCount: number } {
  return { ids: [bowlOutcome(started, fraction)], durationSec: Math.max(0, Math.round(ranMs / 1000)), doneCount: Math.max(0, Math.floor(pebbles)) };
}

/**
 * The bowl's shape, in the SVG's own units: a quadratic curve from one rim point to the other. Its x runs linearly
 * from `left` to `right`, so the floor under any x is a parabola: `rimY + 2 (ctrlY - rimY) u (1 - u)`.
 */
export const BOWL = { width: 220, height: 128, left: 10, right: 210, rimY: 24, ctrlY: 216 } as const;

/** The inside of the bowl's floor (y, top to bottom) under x. Outside the rim it's the rim. */
export function bowlFloor(x: number): number {
  const u = (x - BOWL.left) / (BOWL.right - BOWL.left);
  if (u <= 0 || u >= 1) return BOWL.rimY;
  return BOWL.rimY + 2 * (BOWL.ctrlY - BOWL.rimY) * u * (1 - u);
}

// Rows from the bottom up: each sits on the one below, and each row is spread across the width the bowl has there.
const ROWS = [3, 5, 7, 9]; // 24 in all (BOWL_SHOWN)
const R = 11;

/**
 * Where pebble `i` rests in the bowl, in the SVG's units ({x, y} the centre, r the radius). Deterministic (the same
 * pebble always lands in the same place, so a re-render never shuffles them): rows fill from the bottom of the curve
 * up, each row as wide as the bowl is there, with a small fixed jitter so it reads as a heap, not a grid. Every pebble
 * sits inside the curve (tests/skill-notice-and-name.test.mjs).
 */
export function pebbleSpot(i: number): { x: number; y: number; r: number } {
  const n = Math.max(0, Math.min(BOWL_SHOWN - 1, Math.floor(i)));
  let row = 0;
  let k = n;
  while (row < ROWS.length - 1 && k >= ROWS[row]) { k -= ROWS[row]; row += 1; }
  const perRow = ROWS[row];
  const mid = (BOWL.left + BOWL.right) / 2;
  const bottom = bowlFloor(mid) - 4;
  const r = R - ((n * 13) % 3);
  const y = bottom - R - row * (2 * R - 3) + ((n * 17) % 3) - 1;
  // The bowl's half-width a little under this row's centre, less a pebble, is where this row may spread.
  const depth = (bowlFloor(mid) - BOWL.rimY);
  const below = Math.min(bowlFloor(mid), y + R);
  const half = Math.max(0, ((BOWL.right - BOWL.left) / 2) * Math.sqrt(Math.max(0, 1 - (below - BOWL.rimY) / depth)) - R);
  const step = perRow > 1 ? (2 * half) / (perRow - 1) : 0;
  const jitter = (((n * 37) % 7) - 3) * 0.6;
  return { x: mid - half + k * step + jitter, y, r };
}
