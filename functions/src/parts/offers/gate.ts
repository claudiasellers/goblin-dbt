/**
 * The offer gate (docs/design/parts.md, "When an offer may appear"): one pure function that both the
 * Today source (when the card would render) and the daily evaluation (before an offer is written) call.
 * An offer is an intervention, so it waits for an opening. It may show only when all of these hold:
 *
 * - parts are on, `PartsPolicy.offersEnabled` is on, and the offer's `TrailRule.enabled` is on;
 * - no check-in in the last `floodGateHours` (2) matched `emotional_flooding`, carried the spiraling
 *   answer `hu_exp_flooding`, or carried a crisis flag;
 * - no crisis flag in the last `crisisPauseHours` (48);
 * - fewer than `dissociationCount` (2) dissociation / freeze results in the last `dissociationDays` (14);
 * - no harm signal for the person (harm.ts's `harmSignalsFor`, over their own rows, the report's
 *   definitions and numbers);
 * - no other offer, what_helps or trail, in the last week (profile/offerBudget.ts, the shared budget).
 *
 * Every window includes both ends (a check-in exactly 2 h ago still holds the offer back), except the
 * weekly budget, whose rule is profile/offerBudget.ts's. Pure: no firebase imports.
 */
import { offerBudgetSpent } from '../../profile/offerBudget';
import { DEFAULT_HARM_POLICY, harmSignalsFor, resolveHarmPolicy, type HarmPolicy, type HarmRows } from '../harm';

export interface OfferPolicy {
  floodGateHours: number;
  crisisPauseHours: number;
  dissociationCount: number;
  dissociationDays: number;
  harm: HarmPolicy;
}

/** scripts/parts/content.py POLICY's numbers (the defaults when the graph has no PartsPolicy). */
export const DEFAULT_OFFER_POLICY: OfferPolicy = {
  floodGateHours: 2, crisisPauseHours: 48, dissociationCount: 2, dissociationDays: 14, harm: DEFAULT_HARM_POLICY,
};

const positive = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** A PartsPolicy node's values over the defaults; anything not a positive number keeps its default. */
export function resolveOfferPolicy(raw: Record<string, unknown> | null | undefined): OfferPolicy {
  const r = raw ?? {};
  return {
    floodGateHours: positive(r.floodGateHours) ?? DEFAULT_OFFER_POLICY.floodGateHours,
    crisisPauseHours: positive(r.crisisPauseHours) ?? DEFAULT_OFFER_POLICY.crisisPauseHours,
    dissociationCount: positive(r.dissociationCount) ?? DEFAULT_OFFER_POLICY.dissociationCount,
    dissociationDays: positive(r.dissociationDays) ?? DEFAULT_OFFER_POLICY.dissociationDays,
    harm: resolveHarmPolicy(r),
  };
}

/** One of the person's check-ins, reduced to what the gate reads. */
export interface GateCheckIn {
  /** ISO (CheckIn.timestamp). */
  at: string;
  /** Matched `emotional_flooding`, or carried `hu_exp_flooding`. */
  flooding: boolean;
  /** Carried a crisis flag (`safetyFlagId`). */
  crisis: boolean;
  /** Matched `dissociation_overmodulation` or `conservation_freeze`. */
  dissociation: boolean;
}

export interface OfferGateInput {
  partsOn: boolean;
  offersEnabled: boolean;
  /** The rule behind the offer (false when the rule is missing). */
  ruleEnabled: boolean;
  checkIns: readonly GateCheckIn[];
  harm: HarmRows;
  /** Every offer of either kind (PatternOffer, TrailOffer) the person has, with when it was made. */
  offers: ReadonlyArray<{ id: string; offeredAt: string | null }>;
  /** The offer being shown, which doesn't count against itself (Today); absent when deciding a new one. */
  offerId?: string | null;
}

export type OfferGateReason =
  | 'parts_off' | 'offers_off' | 'rule_off' | 'flooding' | 'crisis' | 'dissociation' | 'harm' | 'budget';

export interface OfferGate { open: boolean; reasons: OfferGateReason[] }

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function offerGate(input: OfferGateInput, policy: OfferPolicy = DEFAULT_OFFER_POLICY, now: Date = new Date()): OfferGate {
  const t = now.getTime();
  const reasons: OfferGateReason[] = [];
  if (!input.partsOn) reasons.push('parts_off');
  if (!input.offersEnabled) reasons.push('offers_off');
  if (!input.ruleEnabled) reasons.push('rule_off');
  const within = (at: string, ms: number) => {
    const x = Date.parse(at);
    return Number.isFinite(x) && x >= t - ms && x <= t;
  };
  if (input.checkIns.some((c) => (c.flooding || c.crisis) && within(c.at, policy.floodGateHours * HOUR))) reasons.push('flooding');
  if (input.checkIns.some((c) => c.crisis && within(c.at, policy.crisisPauseHours * HOUR))) reasons.push('crisis');
  if (input.checkIns.filter((c) => c.dissociation && within(c.at, policy.dissociationDays * DAY)).length >= policy.dissociationCount) {
    reasons.push('dissociation');
  }
  if (harmSignalsFor(input.harm, now, policy.harm).any) reasons.push('harm');
  if (offerBudgetSpent(input.offers.filter((o) => o.id !== input.offerId).map((o) => o.offeredAt), t)) reasons.push('budget');
  return { open: reasons.length === 0, reasons };
}
