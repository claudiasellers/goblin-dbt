/**
 * How a marked place looks on the heat figure (docs/design/body-map.md, step 3). Pure.
 *
 * - The colour comes from the words picked for the place: each pad word in the graph has a home
 *   quarter (its first `zone`), and the mark glows in that quarter's colour on the feeling square,
 *   so the body speaks the square's language: Tight or Racing in the intense-unpleasant colour,
 *   Heavy or Numb in the low-unpleasant one, Fizzy in the bright-pleasant one, Settled or Loose in
 *   the calm one (2 Oct 2026: before, calm words glowed the same cool as drained ones). Words from
 *   two quarters blend; no words yet, a warm mid-tone. Colour is never skin temperature.
 * - How big and bright the glow is comes from the optional strength bar; not used, a middle glow.
 */
import type { PadZone } from '../data/bodyMapTypes';

export const HEAT = 'color-mix(in oklab, var(--color-q-hu-fill), var(--color-q-hp-fill))';

export const zoneColour = (zone: PadZone): string => `var(--color-q-${zone}-fill)`;

/** `homes`: the home quarter of each word picked for the place, in the order picked. */
export function markColour(homes: PadZone[]): string {
  const distinct = [...new Set(homes)];
  if (distinct.length === 0) return HEAT;
  if (distinct.length === 1) return zoneColour(distinct[0]);
  return `color-mix(in oklab, ${zoneColour(distinct[0])}, ${zoneColour(distinct[1])})`;
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
