/**
 * Pure logic for DEAR MAN's arousal gates and the handoff from "Recover from a hurtful moment".
 * Thresholds and copy come from the graph (getDearManContent → safetyGates / safetyCopy);
 * nothing clinical is hard-coded here. Type-only imports keep this file dependency-free for tests.
 */
import type { DearManHandoff } from '../data/dearManHandoff';

export interface DearManGateThresholds {
  downshiftAt: number;
  askMax: number;
  waitMinutes: number;
}

/**
 * Where a 0–10 intensity rating lands:
 * - 'downshift': at or above downshiftAt → settle the body before planning
 * - 'wait':      above askMax → plan now, but the finished plan sits behind a wait lock
 * - 'clear':     at or under askMax (or no rating / no gates) → no gate
 */
export type DearManGateState = 'downshift' | 'wait' | 'clear';

export function dearManGateState(
  intensity: number | null | undefined,
  gates: DearManGateThresholds | null | undefined,
): DearManGateState {
  if (!gates || intensity == null || !Number.isFinite(intensity)) return 'clear';
  if (intensity >= gates.downshiftAt) return 'downshift';
  if (intensity > gates.askMax) return 'wait';
  return 'clear';
}

/**
 * After a rating, what comes next. The downshift is offered once: a re-rate that is
 * still high continues to the plan (with the wait lock) instead of looping.
 */
export function nextAfterRating(
  intensity: number,
  gates: DearManGateThresholds | null | undefined,
  alreadyDownshifted: boolean,
): 'breathe' | 'scene' {
  return dearManGateState(intensity, gates) === 'downshift' && !alreadyDownshifted ? 'breathe' : 'scene';
}

/**
 * Minutes the Summary stays locked, or null for no lock.
 * A handoff always carries its own wait (the user chose to ask from a hurtful moment);
 * otherwise the latest rating above askMax locks the plan for gates.waitMinutes.
 */
export function summaryWaitMinutes(opts: {
  handoff: DearManHandoff | null;
  latestIntensity: number | null;
  gates: DearManGateThresholds | null | undefined;
}): number | null {
  const { handoff, latestIntensity, gates } = opts;
  if (handoff) return handoff.waitMinutes > 0 ? handoff.waitMinutes : null;
  if (!gates || latestIntensity == null) return null;
  const state = dearManGateState(latestIntensity, gates);
  return state === 'clear' || gates.waitMinutes <= 0 ? null : gates.waitMinutes;
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
