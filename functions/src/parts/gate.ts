/**
 * The parts entry gate, pure (docs/design/parts.md, "The flood signal: the blending check", signal 1).
 * Since the capacity probe came out nothing records a band, so a parts flow reads the person's own
 * recent records on entry instead: flooding or a crisis flag lately opens the P2 hand-off first;
 * repeated dissociation / freeze results add the far-away heads-up. Nothing here ever locks.
 */
import type { PartsEntry, PartsEntryReason } from './types';

export interface PartsEntryPolicy {
  /** A flooding / crisis check-in (or a loud Recover) this recent opens on P2. */
  floodGateHours: number;
  /** This many dissociation / freeze results … */
  dissociationCount: number;
  /** … in this many days: the heads-up. */
  dissociationDays: number;
  /** Recover's own flooded line (its flow's `gates.downshiftAt`). */
  recoverDownshiftAt: number;
  /** This many parts made … */
  tooManyPartsCount: number;
  /** … in this many days: one aftercare line in Meet a part. */
  tooManyPartsDays: number;
}

/**
 * Defaults when the graph has no PartsPolicy node (or no Recover flow): the numbers
 * scripts/parts/content.py's POLICY and scripts/invalidation-recovery/content.py's gates ship with.
 */
export const DEFAULT_ENTRY_POLICY: PartsEntryPolicy = {
  floodGateHours: 2,
  dissociationCount: 2,
  dissociationDays: 14,
  recoverDownshiftAt: 7,
  tooManyPartsCount: 3,
  tooManyPartsDays: 7,
};

/** Patterns that count as dissociation history (the low-unpleasant shutdown pair). */
export const DISSOCIATION_PATTERNS = ['dissociation_overmodulation', 'conservation_freeze'] as const;

const positive = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** The policy from the graph's raw values; anything missing or not a positive number takes its default. */
export function resolveEntryPolicy(raw: Partial<Record<keyof PartsEntryPolicy, unknown>> | null | undefined): PartsEntryPolicy {
  const r = raw ?? {};
  return {
    floodGateHours: positive(r.floodGateHours) ?? DEFAULT_ENTRY_POLICY.floodGateHours,
    dissociationCount: positive(r.dissociationCount) ?? DEFAULT_ENTRY_POLICY.dissociationCount,
    dissociationDays: positive(r.dissociationDays) ?? DEFAULT_ENTRY_POLICY.dissociationDays,
    recoverDownshiftAt: positive(r.recoverDownshiftAt) ?? DEFAULT_ENTRY_POLICY.recoverDownshiftAt,
    tooManyPartsCount: positive(r.tooManyPartsCount) ?? DEFAULT_ENTRY_POLICY.tooManyPartsCount,
    tooManyPartsDays: positive(r.tooManyPartsDays) ?? DEFAULT_ENTRY_POLICY.tooManyPartsDays,
  };
}

export interface PartsEntrySignals {
  /** A check-in in the flood window matched flooding (pattern or the spiraling answer). */
  checkinFlooding: boolean;
  /** A check-in in the flood window carried a crisis flag. */
  checkinCrisis: boolean;
  /** A Recover session in the flood window read at or over its flooded line. */
  recoverLoud: boolean;
  /** Dissociation / freeze check-ins in the dissociation window. */
  dissociationCount: number;
}

export function entryGate(s: PartsEntrySignals, policy: PartsEntryPolicy = DEFAULT_ENTRY_POLICY): PartsEntry {
  const reasons: PartsEntryReason[] = [];
  if (s.checkinFlooding) reasons.push('checkin_flooding');
  if (s.checkinCrisis) reasons.push('checkin_crisis');
  if (s.recoverLoud) reasons.push('recover_loud');
  if (s.dissociationCount >= policy.dissociationCount) reasons.push('dissociation_history');
  if (s.checkinFlooding || s.checkinCrisis || s.recoverLoud) {
    return { open: 'p2', band: 'flooded', crisis: s.checkinCrisis, reasons };
  }
  if (reasons.includes('dissociation_history')) return { open: 'far_away', reasons };
  return { open: 'clear', reasons };
}
