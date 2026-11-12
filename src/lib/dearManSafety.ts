/**
 * Recover → DEAR MAN's hand-off band (A4-4). DEAR MAN's prep reads the carried band through `prepEntryCtx`
 * (src/lib/dearManPrep.ts); the hand-built prep's band gate, heads-up and prefill went with that page (IE-B4).
 * Type-only imports keep this file dependency-free for tests.
 */
import type { DearManHandoff } from '../data/dearManHandoff';
import { bandFromLegacyScore } from './band';
/**
 * Recover → DEAR MAN (A4-4): the hand-off carries the band as well as the number, derived from
 * Recover's own gates (bandFromLegacyScore: ≥ downshiftAt flooded, > askMax stirred, else steady)
 * until WMP-02 moves Recover onto the band. DEAR MAN reads only the band.
 */
export function withBand(h: DearManHandoff, gates: { downshiftAt: number; askMax: number }, at: Date = new Date()): DearManHandoff {
  return { ...h, band: bandFromLegacyScore(h.intensity, gates), bandAt: at.toISOString() };
}
