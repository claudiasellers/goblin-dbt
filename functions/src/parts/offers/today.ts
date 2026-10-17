/**
 * Trail offers on Today (docs/design/parts.md, "When an offer may appear"): only on Today, never inside a
 * flow or on a check-in result, and never in a push (parts has no push path; none is added).
 *
 * - The source (`trailOfferItems`) shows at most one offer: the newest still open (offered or seen, not
 *   cooling down after Not now), only through the offer gate (gate.ts), checked as the card is about to
 *   render, and only when every phrase its statement needs is signed off.
 * - The prepare step (`prepareTrailOffers`) runs the evaluator at most once a day (`User.trailsEvaluatedAt`)
 *   and writes the top candidate that is enabled, not blocked, new, and through the same gate.
 * - Shapes A, B and C only (TODAY_SHAPES). Rule D ("Was this {name}?") is never a push: Reflect shows it
 *   and answers it in a batch (a later surface, which can build on writeTrailOffer and offerGate).
 * - A safety-line move (turn_on_myself, rule A only) is not offered on Today: parts.md wants crisis
 *   resources alongside any part with that move, and the card has no such seam yet.
 *
 * The evaluator is the trails engine (functions/src/parts/trails/): `readTrailState` then
 * `trailsFromState` with `blocked` (blockedTrails), its candidates in the engine's rank order.
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { readTx, writeTx } from '../../shared/neo4j';
import { readTrailState, trailsFromState } from '../trails';
import { registerTodayPrepare, registerTodaySource } from '../../spine/today';
import type { TodayItem } from '../../spine/todayOrder';
import { blockedTrails, isBlocked, trailOfferId } from './blocked';
import { checkOfferGate, OPEN_OFFER_QUERY, readOfferPolicy, readOfferStates, readPhrases } from './queries';
import { writeTrailOffer } from './record';
import { TODAY_SHAPES, type BlockedTrail, type OfferableTrail, type TrailShape } from './types';

const DAY = 86_400_000;

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const s = (v: unknown): string | null => (typeof v === 'string' ? v : null);

// ---- The source ----

/** Today's trail offer card, or nothing. */
export async function trailOfferItems(tx: ManagedTransaction, uid: string, now: Date): Promise<TodayItem[]> {
  const r = (await tx.run(OPEN_OFFER_QUERY, { uid, shapes: [...TODAY_SHAPES] })).records[0];
  if (!r) return [];
  const offer = {
    id: String(r.get('id')), ruleId: String(r.get('ruleId')), shape: r.get('shape') as TrailShape,
    pulls: strs(r.get('pullIds')), contextId: s(r.get('contextId')), offeredAt: s(r.get('offeredAt')),
  };
  if (!TODAY_SHAPES.includes(offer.shape)) return [];
  const state = await readOfferPolicy(tx, uid);
  const rule = state.rules.find((x) => x.id === offer.ruleId);
  if (!rule?.approved || !rule.statementTemplate) return [];
  const gate = await checkOfferGate(tx, uid, state, offer.ruleId, now, offer.id);
  if (!gate.open) return [];

  // Every phrase the statement uses must be signed off; anything missing, no card.
  const { moves, context } = await readPhrases(tx, offer.pulls, offer.contextId);
  const pulls = offer.pulls.map((m) => moves.get(m) ?? null);
  if (pulls.length === 0 || pulls.some((p) => p === null)) return [];
  if (offer.contextId && !context) return [];
  return [{
    id: offer.id, kind: 'trail_offer', type: 'trail_offer', tier: 'skills', state: 'due',
    dueAt: offer.offeredAt, resolveMode: 'inline', deepLink: null, choices: [],
    // The card's words are the parts copy (offer_eyebrow / offer_ask) and the statement below.
    copy: { title: '' },
    trail: {
      ruleId: offer.ruleId, shape: offer.shape as 'A' | 'B' | 'C', template: rule.statementTemplate,
      pulls: pulls as string[], context: offer.contextId ? context : null,
    },
  }];
}

// ---- The prepare step ----

/**
 * Finds the person's trails, ranked (lane 1's `evaluateTrails` over their episodes), skipping `blocked`.
 * Runs in a read transaction.
 */
export type TrailEvaluator = (tx: ManagedTransaction, uid: string, blocked: readonly BlockedTrail[], now: Date) => Promise<OfferableTrail[]>;

/** The trails engine over the person's records (enabled rules only; nothing while parts is off). */
export const TRAIL_EVALUATOR: TrailEvaluator = async (tx, uid, blocked, now) => {
  const state = await readTrailState(tx, uid, { now: now.getTime() });
  if (!state.partsOn) return [];
  return trailsFromState(state, now.getTime(), { blocked: blocked.map((b) => ({ ...b, moveIds: [...b.moveIds] })) }).candidates;
};

/** When the person's trails were last evaluated (once a day, like what_helps' `patternsEvaluatedAt`). */
export const EVALUATED_AT_QUERY = `MATCH (u:User {id: $uid}) RETURN toString(u.trailsEvaluatedAt) AS at`;
export const STAMP_EVALUATED_QUERY = `MATCH (u:User {id: $uid}) SET u.trailsEvaluatedAt = datetime()`;

/**
 * At most once a day: nothing while parts or offers are off or no rule is enabled; otherwise the first
 * candidate (the evaluator's order) whose rule is enabled, that isn't blocked or already offered, and that
 * the gate lets through, written by writeTrailOffer. At most one offer per run.
 */
export async function prepareTrailOffers(uid: string, now: Date, evaluate: TrailEvaluator | null = TRAIL_EVALUATOR): Promise<string | null> {
  if (!evaluate) return null;
  const pick = await readTx(async (tx) => {
    const state = await readOfferPolicy(tx, uid);
    const enabled = new Set(state.rules.filter((r) => r.enabled).map((r) => r.id));
    if (!state.partsOn || !state.offersEnabled || enabled.size === 0) return null;
    const last = (await tx.run(EVALUATED_AT_QUERY, { uid })).records[0]?.get('at') as string | null | undefined;
    if (last && Date.parse(last) > now.getTime() - DAY) return null;
    const offers = await readOfferStates(tx, uid);
    const blocked = blockedTrails(offers, now);
    const known = new Set(offers.map((o) => o.id));
    const candidates = await evaluate(tx, uid, blocked, now);
    for (const c of candidates) {
      // Rule D is Reflect's, never Today's.
      if (!TODAY_SHAPES.includes(c.shape) || c.safetyLine) continue;
      if (!enabled.has(c.ruleId) || isBlocked(c, blocked, now) || known.has(trailOfferId(c))) continue;
      const gate = await checkOfferGate(tx, uid, state, c.ruleId, now);
      // A closed gate holds every candidate back today (the gate is about the person, not the trail).
      return { trail: gate.open ? c : null };
    }
    return { trail: null };
  });
  if (!pick) return null;
  return writeTx(async (tx) => {
    const id = pick.trail ? await writeTrailOffer(tx, uid, pick.trail) : null;
    await tx.run(STAMP_EVALUATED_QUERY, { uid });
    return id;
  });
}

registerTodayPrepare((uid, now) => prepareTrailOffers(uid, now).then(() => undefined));
registerTodaySource(trailOfferItems);
