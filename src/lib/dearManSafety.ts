/**
 * Pure logic for DEAR MAN's band gate and the handoff from "Recover from a hurtful moment".
 * Band rules and copy come from the graph (getCapacityContent → bandRules; getDearManContent →
 * safetyCopy). Type-only imports keep this file dependency-free for tests.
 */
import type { DearManHandoff } from '../data/dearManHandoff';
import type { Band, BandRule } from '../data/capacityTypes';
import { bandFromLegacyScore } from './band';

/**
 * DEAR MAN on the band (A4-4, ER-01 BandRule dear-man:*). Replaces the 0–10 rating and the
 * thresholds DEAR MAN used to borrow from Recover's flow document (F10):
 * - 'handoff': flooded → P2 (body first, then back to the same step)
 * - 'headsUp': stirred → plan now; the finished plan opens with a heads-up (never a lock)
 * - 'clear':   steady, or no band (not asked / content unavailable) → no gate
 * The graph's BandRule rows say the same (steady full · stirred full + summary heads-up · flooded
 * handoff); `dearManBandGate` follows them when given, so a content change moves the gate.
 */
export type DearManBandGate = 'handoff' | 'headsUp' | 'clear';

export function dearManBandGate(
  band: Band | null | undefined,
  rules?: Array<Pick<BandRule, 'skillId' | 'band' | 'mode' | 'headsUp'>> | null,
): DearManBandGate {
  if (!band) return 'clear';
  const rule = rules?.find((r) => r.skillId === 'dear-man' && r.band === band);
  if (rule) {
    if (rule.mode === 'handoff') return 'handoff';
    return rule.headsUp === 'summary' ? 'headsUp' : 'clear';
  }
  return band === 'flooded' ? 'handoff' : band === 'stirred' ? 'headsUp' : 'clear';
}

/**
 * Whether the Summary opens with the heads-up: the band isn't steady. The plan is never locked or
 * hidden. The person worked for it; the heads-up names the risk and offers a quick way to take the
 * edge off. No band (not asked) → no heads-up.
 */
export function summaryHeadsUpForBand(band: Band | null | undefined): boolean {
  return !!band && band !== 'steady';
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[_-]+/g, ' ');

export interface DearManHandoffPrefill {
  /** Situation type to preselect, or null if the graph doesn't have it. */
  situationType: string | null;
  /** Matched feeling chip ids. */
  feelings: string[];
  /** Kept as the "something else" feeling when no chip matches. */
  feelingCustom: string;
}

/**
 * Map a handoff onto DEAR MAN's own options. The feeling is matched by chip label, the same
 * way check-in emotions are (by name, also trying the graph id); the situation id comes from
 * graph copy and is only used if that situation type actually exists.
 */
export function handoffPrefill(
  handoff: Pick<DearManHandoff, 'emotionId' | 'emotionName'>,
  content: {
    situationTypes: Array<{ id: string }>;
    feelingChips: Array<{ id: string; label: string }>;
  },
  handoffSituationId: string | null | undefined,
): DearManHandoffPrefill {
  const situationType = handoffSituationId && content.situationTypes.some(s => s.id === handoffSituationId)
    ? handoffSituationId
    : null;
  const wanted = [handoff.emotionName, handoff.emotionId].filter(Boolean).map(norm);
  const chip = content.feelingChips.find(f => wanted.includes(norm(f.label)));
  return chip
    ? { situationType, feelings: [chip.id], feelingCustom: '' }
    : { situationType, feelings: [], feelingCustom: handoff.emotionName.trim() };
}

/**
 * Recover → DEAR MAN (A4-4): the hand-off carries the band as well as the number, derived from
 * Recover's own gates (bandFromLegacyScore: ≥ downshiftAt flooded, > askMax stirred, else steady)
 * until WMP-02 moves Recover onto the band. DEAR MAN reads only the band.
 */
export function withBand(h: DearManHandoff, gates: { downshiftAt: number; askMax: number }, at: Date = new Date()): DearManHandoff {
  return { ...h, band: bandFromLegacyScore(h.intensity, gates), bandAt: at.toISOString() };
}
