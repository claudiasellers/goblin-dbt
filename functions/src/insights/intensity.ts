/**
 * Intensity-based Insights metrics, guarded (A4-3). Pure.
 *
 * Until A4-3 every standard check-in saved a constant intensity of 0.5 (the scale was never asked).
 * From A4-3 on, unpleasant check-ins carry a band whose compatibility intensity is 0.35 / 0.6 / 0.85.
 * Comparing across that regime change would read as an escalation or as "catching it earlier" when
 * nothing changed. So these metrics use only check-ins that carry a band, and need at least two in
 * each half; otherwise the metric is skipped.
 */
export interface IntensityPoint { intensityY: number; band: string | null }

export const MIN_PER_HALF = 2;

const banded = <T extends IntensityPoint>(xs: T[]): T[] => xs.filter((x) => typeof x.band === 'string' && x.band.length > 0);
const avg = (xs: IntensityPoint[]) => xs.reduce((s, x) => s + x.intensityY, 0) / xs.length;

/**
 * Are the most recent check-ins of a pattern getting more intense? `newestFirst` are that pattern's
 * check-ins, newest first. Compares the two newest banded with the two before them (+0.05).
 */
export function intensityTrending(newestFirst: IntensityPoint[], margin = 0.05): boolean {
  const b = banded(newestFirst).slice(0, MIN_PER_HALF * 2);
  if (b.length < MIN_PER_HALF * 2) return false;
  return avg(b.slice(0, MIN_PER_HALF)) > avg(b.slice(MIN_PER_HALF)) + margin;
}

/** "Catching it earlier": the newer half's banded average dropped by more than `dropMin`. */
export function intensityDrop(
  olderHalf: IntensityPoint[], newerHalf: IntensityPoint[], dropMin: number,
): { current: number; previous: number } | null {
  const older = banded(olderHalf);
  const newer = banded(newerHalf);
  if (older.length < MIN_PER_HALF || newer.length < MIN_PER_HALF) return null;
  const current = avg(newer);
  const previous = avg(older);
  return previous - current > dropMin ? { current, previous } : null;
}
