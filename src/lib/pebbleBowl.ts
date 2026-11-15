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

// Rows from the bottom up: each row holds as many pebbles as the bowl is wide there (at least 2r - 2 apart), filled from
// the middle outward, alternating sides, so a part-filled row never leaves a pebble hanging on one wall.
const R = 10;
const STEP = 2 * R - 2;
const RISE = 2 * R - 4;

function halfWidthAt(y: number): number {
  const depth = bowlFloor((BOWL.left + BOWL.right) / 2) - BOWL.rimY;
  return ((BOWL.right - BOWL.left) / 2) * Math.sqrt(Math.max(0, 1 - (y - BOWL.rimY) / depth));
}

const SPOTS: ReadonlyArray<{ x: number; y: number; r: number }> = (() => {
  const mid = (BOWL.left + BOWL.right) / 2;
  const out: Array<{ x: number; y: number; r: number }> = [];
  for (let row = 0; out.length < BOWL_SHOWN && row < 12; row++) {
    const y = bowlFloor(mid) - R - 2 - row * RISE;
    if (y - R < BOWL.rimY + 4) break;
    const half = Math.max(0, halfWidthAt(y + R * 0.5) - R - 1);
    const fits = Math.max(1, Math.floor((2 * half) / STEP) + 1);
    // Centre-out offsets: 0, +1, -1, +2, -2… (odd counts), or ±0.5, ±1.5… (even counts).
    const offsets = Array.from({ length: fits }, (_, k) => (fits % 2 ? Math.ceil(k / 2) * (k % 2 ? 1 : -1) : (Math.floor(k / 2) + 0.5) * (k % 2 ? -1 : 1)));
    for (const o of offsets) {
      if (out.length >= BOWL_SHOWN) break;
      const n = out.length;
      const r = R - ((n * 13) % 3) * 0.75;
      const x = mid + o * STEP + (((n * 37) % 5) - 2) * 0.5;
      // Seated: it drops onto the wall, or onto the pebbles under it, whichever it meets first; never floating.
      const floor = Math.min(bowlFloor(x - r * 0.7), bowlFloor(x), bowlFloor(x + r * 0.7));
      let py = floor - r - 1;
      while (py > BOWL.rimY + r && out.some((p) => Math.hypot(p.x - x, p.y - py) < p.r + r - 3)) py -= 1;
      out.push({ x, y: py, r });
    }
  }
  return out;
})();

/**
 * Where pebble `i` rests in the bowl, in the SVG's units ({x, y} the centre, r the radius). Deterministic (the same
 * pebble always lands in the same place, so a re-render never shuffles them): rows fill from the bottom of the curve
 * up, each from the middle out, with a small fixed variation in size so it reads as a heap, not a grid. Every pebble
 * sits inside the curve (tests/skill-notice-and-name.test.mjs).
 */
export function pebbleSpot(i: number): { x: number; y: number; r: number } {
  return SPOTS[Math.max(0, Math.min(SPOTS.length - 1, Math.floor(i)))];
}
