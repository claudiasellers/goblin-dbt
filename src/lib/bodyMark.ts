/**
 * How a marked place looks on the heat figure (docs/design/body-map.md, step 3). Pure.
 *
 * - Warm or cool comes from the words picked for the place: each pad word in the graph says
 *   whether it is "more" (tight, racing, buzzing) or "less" (heavy, drained, numb), the
 *   Nummenmaa maps' warm = more activity, cool = less. No words yet: a warm mid-tone.
 * - How big and bright the glow is comes from the optional strength bar; not used, a middle glow.
 */
import type { BodyEnergy } from '../data/bodyMapTypes';

export const HEAT = 'color-mix(in oklab, var(--color-q-hu-fill), var(--color-q-hp-fill))';
export const WARM = 'var(--color-q-hu-fill)';
export const COOL = 'var(--color-q-lu-fill)';

export function markColour(energies: BodyEnergy[]): string {
  const more = energies.includes('more');
  const less = energies.includes('less');
  if (more && less) return `color-mix(in oklab, ${WARM}, ${COOL})`;
  if (more) return WARM;
  if (less) return COOL;
  return HEAT;
}

/** Glow size (× the place's glow) and opacity for a strength, 0–1; null = the bar wasn't used. */
export function glowLook(strength: number | null | undefined): { scale: number; opacity: number } {
  if (strength === null || strength === undefined || !Number.isFinite(strength)) return { scale: 1, opacity: 0.9 };
  const s = Math.max(0, Math.min(1, strength));
  return { scale: 0.6 + 0.5 * s, opacity: 0.35 + 0.6 * s };
}

/** The strength said back in a word (the bar's spoken value and the marks list). */
export function strengthWord(strength: number | null | undefined): string | null {
  if (strength === null || strength === undefined || !Number.isFinite(strength)) return null;
  return strength > 0.66 ? 'strong' : strength < 0.34 ? 'faint' : 'medium';
}

/** A value from a point on the bar: 1 at the top, 0 at the bottom, two decimals. */
export function strengthAt(offsetY: number, height: number): number {
  if (!(height > 0)) return 0.5;
  return Math.round(Math.max(0, Math.min(1, 1 - offsetY / height)) * 100) / 100;
}
