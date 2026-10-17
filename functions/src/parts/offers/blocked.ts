/**
 * A trail offer's identity and what the person's answers block (docs/design/parts.md, "The offer card").
 * Pure, no imports.
 *
 * `id = ruleId:moves:context(:part)`: the rule, the moves sorted and joined with `+`, the TrailContext id
 * (or `none`), and for rule D the part. The same trail always has the same id, so it can't be offered twice
 * (writeTrailOffer never touches an offer that exists). The moves are sorted for the id and the block, so
 * "chase then hide" and "hide then chase" (rule B) are one trail as far as an answer is concerned (the
 * conservative reading: a "Not me" holds for both orders).
 */
import type { BlockedTrail, OfferableTrail, TrailOfferAnswer, TrailOfferStatus } from './types';

/** An offer id as trailOfferId builds it (the callables refuse anything else). */
export const TRAIL_OFFER_ID = /^[a-z0-9_]{1,60}:[a-z0-9_]{1,60}(\+[a-z0-9_]{1,60}){0,7}:[a-z0-9_]{1,60}(:[0-9a-f-]{36})?$/;
/** The id's context part when the trail has none (B, D). */
export const NO_CONTEXT = 'none';

const HOUR = 3_600_000;

export const sortedMoves = (ids: readonly string[]): string[] => [...new Set(ids)].sort();

type TrailIdentity = Pick<OfferableTrail, 'ruleId' | 'moveIds' | 'contextId' | 'partId'>;

export function trailOfferId(t: TrailIdentity): string {
  return [t.ruleId, sortedMoves(t.moveIds).join('+'), t.contextId ?? NO_CONTEXT, ...(t.partId ? [t.partId] : [])].join(':');
}

/** One stored offer, as much of it as blocking needs. */
export interface OfferState {
  ruleId: string;
  moveIds: readonly string[];
  contextId: string | null;
  partId: string | null;
  status: TrailOfferStatus | string;
  answer: TrailOfferAnswer | string | null;
  /** ISO, Not now's (and a rule D review's, Done or Not now). */
  cooldownUntil: string | null;
  /** A rule D review's No rows: the records said not to be that part. */
  noKeys?: readonly string[];
}

/**
 * The `blocked` list lane 1's evaluator takes:
 * - an answered offer (Not me; Yes, More than one, It's how things go as an offer): for good;
 * - Not now: until `cooldownUntil` (TrailRule.cooldownDays after the answer); past it, nothing;
 * - an offer still open (offered or seen, no answer yet): while it is open, i.e. `until: null`. It is
 *   already on Today; a second copy of it would be the same id anyway;
 * - a rule D review (Reflect's batch, the only TrailOffer with a part): the part until its `cooldownUntil`
 *   (Done or Not now), and its No rows' records for good (`recordKeys`, kept after the cooldown ends).
 */
export function blockedTrails(offers: readonly OfferState[], now: Date | number): BlockedTrail[] {
  const t = typeof now === 'number' ? now : now.getTime();
  const out: BlockedTrail[] = [];
  for (const o of offers) {
    const key = { ruleId: o.ruleId, moveIds: sortedMoves(o.moveIds), contextId: o.contextId ?? null, partId: o.partId ?? null };
    if (o.partId) {
      const until = o.cooldownUntil ? Date.parse(o.cooldownUntil) : Number.NaN;
      // Kept past its cooldown (an `until` behind now blocks nothing) so the No rows still hold.
      const end = Number.isFinite(until) ? until : t + 24 * HOUR;
      out.push({ ...key, until: new Date(end).toISOString(), recordKeys: [...(o.noKeys ?? [])].sort() });
      continue;
    }
    if (o.status === 'answered') { out.push({ ...key, until: null }); continue; }
    if (o.answer === 'not_now') {
      const until = o.cooldownUntil ? Date.parse(o.cooldownUntil) : Number.NaN;
      // A Not now without a readable cooldown blocks for a day rather than never.
      const end = Number.isFinite(until) ? until : t + 24 * HOUR;
      if (end > t) out.push({ ...key, until: new Date(end).toISOString() });
      continue;
    }
    out.push({ ...key, until: null });
  }
  return out;
}

/** Whether `blocked` holds this trail now (rule + sorted moves + context + part; `until` null or ahead). */
export function isBlocked(trail: TrailIdentity, blocked: readonly BlockedTrail[], now: Date | number): boolean {
  const t = typeof now === 'number' ? now : now.getTime();
  const moves = sortedMoves(trail.moveIds).join('+');
  return blocked.some((b) => b.ruleId === trail.ruleId && sortedMoves(b.moveIds).join('+') === moves
    && (b.contextId ?? null) === (trail.contextId ?? null) && (b.partId ?? null) === (trail.partId ?? null)
    && (b.until === null || Date.parse(b.until) > t));
}

/**
 * An offer still open and not cooling down: on Today now (offered or seen, or a Not now whose cooldown has
 * ended). While one is, the prepare step writes no other: Today shows one offer, and a Not now that has
 * cooled down takes the week's place it comes back to, instead of a newer offer hiding it.
 */
export function showableOffer(offers: readonly OfferState[], now: Date | number): boolean {
  const t = typeof now === 'number' ? now : now.getTime();
  return offers.some((o) => !o.partId && (o.status === 'offered' || o.status === 'seen')
    && (o.cooldownUntil == null || !(Date.parse(o.cooldownUntil) > t)));
}
