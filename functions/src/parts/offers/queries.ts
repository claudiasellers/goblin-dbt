/**
 * The query layer behind trail offers: Cypher plus record → value mapping. Every user read is the
 * caller's own (through their User, or `ownerId: $uid`); windows are parameters, never interpolated.
 * Reads no own-words field anywhere (the gate reads check-in patterns, flags and times; the offers read
 * ids, times and statuses; the phrases read signed-off content only).
 */
import neo4j, { type ManagedTransaction } from 'neo4j-driver';
import { OFFER_EVERY_DAYS, offerBudgetAt } from '../../profile/offerBudget';
import { toNumber } from '../../shared/values';
import { DISSOCIATION_PATTERNS } from '../gate';
import { readHarmRows } from '../harmRows';
import type { OfferState } from './blocked';
import { offerGate, resolveOfferPolicy, type GateCheckIn, type OfferGate, type OfferPolicy } from './gate';
import type { TrailShape } from './types';
import { ruleLive } from '../trails/rules';

/**
 * A rule is live only switched on and signed off (`enabled && approved`): the prepare step, Today, Reflect
 * and the gate all ask this, so a rule switched on while still a draft writes nothing, spends no budget
 * and is never marked offered. Whether offers are on at all is PartsPolicy.offersEnabled, unchanged here.
 */
export { ruleLive };

export interface TrailRuleRow {
  id: string;
  shape: TrailShape;
  enabled: boolean;
  cooldownDays: number | null;
  statementTemplate: string | null;
  /** The template is signed off (reviewStatus approved). */
  approved: boolean;
}

/** Parts on, the policy (offersEnabled and the numbers) and every TrailRule, in one read. */
export const OFFER_POLICY_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (pol:PartsPolicy {id: 'parts'})
  OPTIONAL MATCH (r:TrailRule)
  RETURN coalesce(u.partsEnabled, false) AS partsOn, coalesce(pol.offersEnabled, false) AS offersEnabled,
         pol {.floodGateHours, .crisisPauseHours, .dissociationCount, .dissociationDays, .harmWindowDays,
              .tenderRepeatCount, .tooManyPartsCount, .tooManyPartsDays} AS policy,
         collect(r {.id, .shape, .enabled, .cooldownDays, .statementTemplate,
                    approved: r.reviewStatus = 'approved' AND r.pending IS NULL}) AS rules
`;

/** The caller's check-ins in the gate's longest window: flooding, crisis and dissociation, as booleans. */
export const GATE_CHECKINS_QUERY = `
  MATCH (c:CheckIn {ownerId: $uid})
  WHERE c.timestamp >= datetime() - duration({hours: $hours})
  RETURN toString(c.timestamp) AS at,
         (c.activationPatternId = 'emotional_flooding' OR 'hu_exp_flooding' IN coalesce(c.discResponseIds, [])) AS flooding,
         c.safetyFlagId IS NOT NULL AS crisis,
         coalesce(c.activationPatternId IN $dissociation, false) AS dissociation
`;

/**
 * Offers of both kinds in the budget window (ids and times only): the shared weekly budget. Each counts
 * from the later of when it was offered and answered (offerBudget.ts `offerBudgetAt`), so a Not now that
 * comes back and is answered is that week's offer.
 */
export const OFFER_TIMES_QUERY = `
  MATCH (:User {id: $uid})-[:HAS_PATTERN_OFFER|HAS_TRAIL_OFFER]->(o)
  WHERE (o:PatternOffer OR o:TrailOffer) AND o.offeredAt IS NOT NULL
    AND ${offerBudgetAt('o')} > datetime() - duration({days: $days})
  RETURN o.id AS id, toString(${offerBudgetAt('o')}) AS offeredAt
`;

/** Every trail offer the caller has, as much as blocking needs (blocked.ts). */
export const OFFER_STATES_QUERY = `
  MATCH (:User {id: $uid})-[:HAS_TRAIL_OFFER]->(o:TrailOffer)
  RETURN o.id AS id, o.ruleId AS ruleId, o.moveIds AS moveIds, o.contextId AS contextId, o.partId AS partId,
         o.status AS status, o.answer AS answer, toString(o.cooldownUntil) AS cooldownUntil, o.noKeys AS noKeys
`;

/**
 * Today's one offer: the newest still open (offered or seen), not cooling down, of a Today shape
 * ($shapes: A–C). Parts on and offers on only, so with either off nothing else is read.
 */
export const OPEN_OFFER_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_TRAIL_OFFER]->(o:TrailOffer)
  WHERE coalesce(u.partsEnabled, false) AND o.status IN ['offered', 'seen'] AND o.shape IN $shapes
    AND (o.cooldownUntil IS NULL OR o.cooldownUntil <= datetime())
    AND EXISTS { MATCH (pol:PartsPolicy {id: 'parts'}) WHERE pol.offersEnabled = true }
  RETURN o.id AS id, o.ruleId AS ruleId, o.shape AS shape, coalesce(o.pullIds, o.moveIds) AS pullIds,
         o.contextId AS contextId, o.partId AS partId, toString(o.offeredAt) AS offeredAt
  ORDER BY o.offeredAt DESC LIMIT 1
`;

/** The signed-off phrases a statement needs: each move's trailPhrase (offerable moves) and the context's phrase. */
export const PHRASES_QUERY = `
  OPTIONAL MATCH (m:ProtectiveMove)
  WHERE m.id IN $moveIds AND m.offerable = true AND m.reviewStatus = 'approved' AND m.pending IS NULL
  WITH collect(m {.id, .trailPhrase}) AS moves
  OPTIONAL MATCH (c:TrailContext {id: $contextId})
  WHERE c.reviewStatus = 'approved' AND c.pending IS NULL
  RETURN moves, c.phrase AS context
`;

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const s = (v: unknown): string | null => (typeof v === 'string' ? v : null);
/** Whole numbers go as Neo4j integers; a tuned fractional value stays a float. */
const num = (n: number) => (Number.isInteger(n) ? neo4j.int(n) : n);

export interface OfferPolicyState {
  partsOn: boolean;
  offersEnabled: boolean;
  policy: OfferPolicy;
  rules: TrailRuleRow[];
}

export async function readOfferPolicy(tx: ManagedTransaction, uid: string): Promise<OfferPolicyState> {
  const r = (await tx.run(OFFER_POLICY_QUERY, { uid })).records[0];
  const raw = (r?.get('policy') as Record<string, unknown> | null | undefined) ?? null;
  const policy = resolveOfferPolicy(raw ? Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, toNumber(v)])) : null);
  const rules = ((r?.get('rules') as Record<string, unknown>[] | null | undefined) ?? []).map((x) => ({
    id: String(x.id), shape: x.shape as TrailShape, enabled: x.enabled === true,
    cooldownDays: toNumber(x.cooldownDays), statementTemplate: s(x.statementTemplate), approved: x.approved === true,
  }));
  return { partsOn: r?.get('partsOn') === true, offersEnabled: r?.get('offersEnabled') === true, policy, rules };
}

export async function readOfferStates(tx: ManagedTransaction, uid: string): Promise<Array<OfferState & { id: string }>> {
  const res = await tx.run(OFFER_STATES_QUERY, { uid });
  return res.records.map((r) => ({
    id: String(r.get('id')), ruleId: String(r.get('ruleId')), moveIds: strs(r.get('moveIds')),
    contextId: s(r.get('contextId')), partId: s(r.get('partId')), status: String(r.get('status') ?? ''),
    answer: s(r.get('answer')), cooldownUntil: s(r.get('cooldownUntil')), noKeys: strs(r.get('noKeys')),
  }));
}

/**
 * The gate for one rule, read and decided in the caller's transaction: their check-ins over the longest
 * window, the shared budget, and their harm rows. `offerId`: the offer being shown (Today), which doesn't
 * count against the budget itself.
 */
export async function checkOfferGate(
  tx: ManagedTransaction, uid: string, state: OfferPolicyState, ruleId: string, now: Date, offerId: string | null = null,
): Promise<OfferGate> {
  const p = state.policy;
  const hours = Math.max(p.floodGateHours, p.crisisPauseHours, p.dissociationDays * 24);
  const ci = await tx.run(GATE_CHECKINS_QUERY, { uid, hours: num(hours), dissociation: [...DISSOCIATION_PATTERNS] });
  const checkIns: GateCheckIn[] = ci.records.map((r) => ({
    at: String(r.get('at')), flooding: r.get('flooding') === true, crisis: r.get('crisis') === true, dissociation: r.get('dissociation') === true,
  }));
  const times = await tx.run(OFFER_TIMES_QUERY, { uid, days: num(OFFER_EVERY_DAYS) });
  const offers = times.records.map((r) => ({ id: String(r.get('id')), offeredAt: s(r.get('offeredAt')) }));
  const harm = await readHarmRows(tx, uid, p.harm);
  const rule = state.rules.find((x) => x.id === ruleId);
  return offerGate({
    partsOn: state.partsOn, offersEnabled: state.offersEnabled, ruleEnabled: ruleLive(rule),
    checkIns, harm, offers, offerId,
  }, p, now);
}

export async function readPhrases(tx: ManagedTransaction, moveIds: readonly string[], contextId: string | null): Promise<{ moves: Map<string, string>; context: string | null }> {
  const r = (await tx.run(PHRASES_QUERY, { moveIds: [...moveIds], contextId: contextId ?? '' })).records[0];
  const moves = new Map<string, string>();
  for (const m of ((r?.get('moves') as Record<string, unknown>[] | null | undefined) ?? [])) {
    const phrase = s(m.trailPhrase);
    if (phrase && typeof m.id === 'string') moves.set(m.id, phrase);
  }
  return { moves, context: s(r?.get('context')) };
}
