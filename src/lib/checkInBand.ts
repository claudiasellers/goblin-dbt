/**
 * The check-in's band (A4-3, E3 §A4.2.8). Pure.
 *
 * Unpleasant check-ins may carry a band; pleasant ones don't (D-07). The band question (the capacity
 * probe) is no longer asked anywhere (Claudia, 30 Sep): a reading this check-in already has is kept
 * (Find the feeling's, from before the removal), a current reading (≤ 20 min, e.g. from a tool's
 * hand-off) is carried, and otherwise the check-in has no band and the engine infers one.
 */
import type { CapacityContent, CapacityReading } from '../data/capacityTypes';

export const BAND_QUADRANTS = ['high-unpleasant', 'low-unpleasant'] as const;

export function asksBand(quadrant: string | null | undefined): boolean {
  return !!quadrant && (BAND_QUADRANTS as readonly string[]).includes(quadrant);
}

export type BandStep = { next: 'skip'; keep: CapacityReading | null; carry: boolean };

/**
 * After the feelings are in: keep this check-in's own reading, carry the current one (`carry: true`:
 * the caller mints the carried reading), or go on with no band. Nothing is asked. A current
 * `flooded` is not carried (D-07): a new check-in inside 20 minutes is exactly when that may have
 * changed, and a stale flooded would set this check-in's band, beat and routing without the user
 * saying so. With no band the engine infers one (`flooded` for flooding, else `stirred`).
 */
export function bandStepFor(
  quadrant: string | null | undefined,
  own: CapacityReading | null,
  current: CapacityReading | null,
): BandStep {
  if (!asksBand(quadrant)) return { next: 'skip', keep: null, carry: false };
  if (own) return { next: 'skip', keep: own, carry: false };
  if (current && current.value !== 'flooded') return { next: 'skip', keep: null, carry: true };
  return { next: 'skip', keep: null, carry: false };
}

/**
 * The compatibility intensity (`CheckIn.intensityY`) for a banded check-in: the graph's
 * bandIntensity, with the emotion's x. Unbanded check-ins keep what they had (null → 0.5 later).
 */
export function checkInIntensity(
  capacity: CapacityReading | null,
  content: Pick<CapacityContent, 'bandIntensity'> | null,
  emotionX: number | null | undefined,
  fallback: { x: number; y: number } | null,
): { x: number; y: number } | null {
  if (!capacity || !content) return fallback;
  return { x: emotionX ?? fallback?.x ?? 0.5, y: content.bandIntensity[capacity.value] };
}

/** The History word for a check-in: the band's display label, else the legacy intensity word. */
export function historyBandLabel(
  checkIn: { band?: string | null; intensity: { y: number } },
  labels: Partial<Record<string, string>> | null,
): { kind: 'band' | 'legacy'; text: string } {
  if (checkIn.band) {
    const b = checkIn.band;
    return { kind: 'band', text: labels?.[b] ?? b.charAt(0).toUpperCase() + b.slice(1) };
  }
  const y = checkIn.intensity.y;
  return { kind: 'legacy', text: y > 0.66 ? 'High' : y > 0.33 ? 'Medium' : 'Low' };
}
