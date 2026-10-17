/**
 * The offer's two callables (docs/design/parts.md, "The offer card"), as handlers over an injected query
 * layer bound to one write transaction (tests drive them with plain functions or the fake driver).
 *
 * getTrailOfferEvidence ("Show me"): the caller's own open offer, marked seen (GUARDS.TrailOffer.see), and
 * its evidence as rows: the episode's date and tool ids, its context as the signed-off TrailContext phrase,
 * and the graph labels of the picks behind it (an ActionUrge's or FeelingUrge's `label`, through approved
 * EXPRESSES edges to the offer's moves). Ids rendered as labels; nothing the person wrote.
 *
 * answerTrailOffer: one guarded write (GUARDS.TrailOffer.answer), then what the answer does:
 * - not_now: a cooldown (`TrailRule.cooldownDays`); the offer stays open and comes back after it;
 * - not_me / how_it_goes: recorded (blockedTrails then holds it for good);
 * - yes: recorded; the client opens Meet a part on the offer (`trailheadKind: 'offer'`), and keepPart
 *   writes `source: 'offer'` with `ACCEPTED_FROM` the offer;
 * - more_than_one: each kept move becomes a `PartCandidate` (`origin: 'trail'`, `FROM_OFFER` the offer).
 *   On a rule C trail (two pulls) it writes no candidates: the client opens Two pulls on the offer's pair
 *   (`next: 'two_pulls'`, `pairId`), and the split is not asked.
 *
 * Rule D ("Was this {name}?") is never a Today offer: it is shown in Reflect and answered in a batch
 * (parts.md's rules table: review.ts's answerKnownPartReview, which writes `PartTag`s, `source: 'review'`).
 * So this callable refuses a D offer; the batch's record keeps `partId` / `ABOUT_PART`.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { GRAPH_ID, ValidationError, obj, oneOf, uuid } from '../../shared/validate';
import { toNumber } from '../../shared/values';
import { GUARDS } from '../../userdata/lifecycle';
import { MERGE_USER, userKey } from '../../userdata/ownership';
import { partsOff } from '../keep';
import { sessionSourceMatch } from '../sessionMoves';
import { TRAIL_OFFER_ID } from './blocked';
import {
  SPLIT_MAX, TRAIL_CANDIDATE_ORIGIN, TRAIL_OFFER_ANSWERS, type AnswerTrailOfferResponse,
  type GetTrailOfferEvidenceResponse, type TrailEvidence, type TrailOfferAnswer, type TrailOfferEvidenceRow, type TrailShape,
} from './types';

/** Not now's cooldown when the rule has none (TrailRule.cooldownDays ships as 28, D's as 14). */
export const DEFAULT_COOLDOWN_DAYS = 28;

const fail = (m: string): never => { throw new ValidationError(m); };

const offerId = (v: unknown): string =>
  (typeof v === 'string' && v.length <= 400 && TRAIL_OFFER_ID.test(v) ? v : fail('offerId: expected an offer id'));

export function validateEvidenceRequest(raw: unknown): { offerId: string } {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (k !== 'offerId') fail(`${k}: not accepted`);
  return { offerId: offerId(o.offerId) };
}

export interface AnswerInput { offerId: string; answer: TrailOfferAnswer; split: string[]; candidateIds: string[] }

export function validateAnswer(raw: unknown): AnswerInput {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['offerId', 'answer', 'split', 'candidateIds'].includes(k)) fail(`${k}: not accepted`);
  const answer = oneOf(o.answer, TRAIL_OFFER_ANSWERS);
  const input: AnswerInput = { offerId: offerId(o.offerId), answer, split: [], candidateIds: [] };
  if (answer !== 'more_than_one') {
    if (o.split !== undefined || o.candidateIds !== undefined) fail('split: More than one only');
    return input;
  }
  // A rule C trail opens Two pulls instead of asking the split: no split at all is accepted (the handler
  // checks the shape), and then no candidate ids either.
  if (o.split === undefined && o.candidateIds === undefined) return input;
  const split = o.split;
  if (!Array.isArray(split) || split.length < 1 || split.length > SPLIT_MAX) fail(`split: 1 to ${SPLIT_MAX} move ids`);
  input.split = (split as unknown[]).map((x) => (typeof x === 'string' && GRAPH_ID.test(x) ? x : fail('split: expected move ids')));
  if (new Set(input.split).size !== input.split.length) fail('split: duplicate ids');
  const ids = o.candidateIds;
  if (!Array.isArray(ids) || ids.length !== input.split.length) fail('candidateIds: one per kept move');
  input.candidateIds = (ids as unknown[]).map((x) => uuid(x));
  if (new Set(input.candidateIds).size !== input.candidateIds.length) fail('candidateIds: duplicate ids');
  return input;
}

// ---- getTrailOfferEvidence ----

export const EVIDENCE_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_TRAIL_OFFER]->(o:TrailOffer {key: $key})
  RETURN coalesce(u.partsEnabled, false) AS partsOn,
         CASE WHEN o IS NULL THEN null ELSE o {.shape, .moveIds, .pullIds, .contextId, .evidenceJson, .status,
           open: ${GUARDS.TrailOffer.answer('o')}} END AS offer
`;

/** "Show me": offered → seen, once; a seen offer stays seen. */
export const MARK_SEEN_QUERY = `
  MATCH (:User {id: $uid})-[:HAS_TRAIL_OFFER]->(o:TrailOffer {key: $key})
  WHERE ${GUARDS.TrailOffer.see('o')}
  SET o.status = 'seen', o.seenAt = datetime()
  RETURN o.status AS status
`;

/**
 * Labels only: per evidence record the caller's offer points at, the graph labels of the picks that
 * express the offer's moves through approved edges; and the signed-off phrase of each context id.
 */
export const EVIDENCE_LABELS_QUERY = `
  MATCH (:User {id: $uid})-[:HAS_TRAIL_OFFER]->(o:TrailOffer {key: $key})
  OPTIONAL MATCH (o)-[:EVIDENCE]->(r:LogRecord {ownerId: $uid})
  OPTIONAL MATCH (r)-[:DETAIL]->(dd) WHERE dd.ownerId = $uid
  // A detail session without a ToolSession is its own record (as the trails records query reads it).
  WITH o, r, CASE WHEN r:ToolSession THEN dd ELSE r END AS d
  OPTIONAL MATCH (src)-[x:EXPRESSES]->(m:ProtectiveMove)
    WHERE r IS NOT NULL AND x.reviewStatus = 'approved' AND m.id IN o.moveIds AND (
         ${sessionSourceMatch('src', 'r', 'd')}
      OR (src:QuestionResponse AND r:CheckIn AND src.id IN coalesce(r.discResponseIds, []))
    )
  WITH r, [l IN collect(DISTINCT src.label) WHERE l IS NOT NULL] AS labels
  WITH collect(CASE WHEN r IS NULL THEN null ELSE {key: r.key, labels: labels} END) AS records
  OPTIONAL MATCH (c:TrailContext)
  WHERE c.id IN $contextIds AND c.reviewStatus = 'approved' AND c.pending IS NULL
  RETURN records, collect(c {.id, .phrase}) AS contexts
`;

export interface EvidenceOffer {
  shape: TrailShape;
  moveIds: string[];
  pullIds: string[];
  contextId: string | null;
  evidence: TrailEvidence[];
  status: string;
  open: boolean;
}

export interface EvidenceDeps {
  state(): Promise<{ partsOn: boolean; offer: EvidenceOffer | null }>;
  markSeen(): Promise<void>;
  labels(contextIds: string[]): Promise<{ records: Map<string, string[]>; contexts: Map<string, string> }>;
}

/** The episode's context: the offer's own when the episode carries it, else its first signed-off one. */
function contextOf(e: TrailEvidence, offerContext: string | null, phrases: Map<string, string>): string | null {
  if (offerContext && e.contextIds.includes(offerContext) && phrases.has(offerContext)) return phrases.get(offerContext)!;
  for (const c of e.contextIds) if (phrases.has(c)) return phrases.get(c)!;
  return null;
}

export async function getTrailOfferEvidenceHandler(input: { offerId: string }, deps: EvidenceDeps): Promise<GetTrailOfferEvidenceResponse> {
  const st = await deps.state();
  if (!st.partsOn) throw partsOff();
  if (!st.offer) throw new HttpsError('not-found', 'Offer not found');
  if (!st.offer.open) throw new HttpsError('failed-precondition', 'This offer was already answered');
  if (st.offer.status === 'offered') await deps.markSeen();
  const { records, contexts } = await deps.labels([...new Set(st.offer.evidence.flatMap((e) => e.contextIds))]);
  const rows: TrailOfferEvidenceRow[] = [...st.offer.evidence]
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .map((e) => ({
      at: e.at,
      toolIds: [...e.toolIds],
      context: contextOf(e, st.offer!.contextId, contexts),
      sources: [...new Set(e.recordKeys.flatMap((k) => records.get(k) ?? []))].sort(),
    }));
  const moveIds = st.offer.pullIds.length ? st.offer.pullIds : st.offer.moveIds;
  return { offerId: input.offerId, shape: st.offer.shape, moveIds, rows };
}

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const s = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/** The stored evidence (ids only); anything malformed is dropped. */
export function parseEvidence(json: unknown): TrailEvidence[] {
  if (typeof json !== 'string') return [];
  try {
    const v = JSON.parse(json) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((e) => e && typeof e === 'object' && typeof (e as { at?: unknown }).at === 'string').map((e) => {
      const x = e as Record<string, unknown>;
      return { at: x.at as string, toolIds: strs(x.toolIds), recordKeys: strs(x.recordKeys), moveIds: strs(x.moveIds), contextIds: strs(x.contextIds) };
    });
  } catch {
    return [];
  }
}

export function evidenceDeps(tx: ManagedTransaction, uid: string, id: string): EvidenceDeps {
  const key = userKey(uid, id);
  return {
    async state() {
      const r = (await tx.run(EVIDENCE_STATE_QUERY, { uid, key })).records[0];
      const o = r?.get('offer') as Record<string, unknown> | null | undefined;
      return {
        partsOn: r?.get('partsOn') === true,
        offer: o ? {
          shape: o.shape as TrailShape, moveIds: strs(o.moveIds), pullIds: strs(o.pullIds), contextId: s(o.contextId),
          evidence: parseEvidence(o.evidenceJson), status: String(o.status ?? ''), open: o.open === true,
        } : null,
      };
    },
    async markSeen() {
      await tx.run(MARK_SEEN_QUERY, { uid, key });
    },
    async labels(contextIds) {
      const r = (await tx.run(EVIDENCE_LABELS_QUERY, { uid, key, contextIds })).records[0];
      const records = new Map<string, string[]>();
      for (const x of ((r?.get('records') as Record<string, unknown>[] | null | undefined) ?? [])) {
        if (typeof x.key === 'string') records.set(x.key, strs(x.labels));
      }
      const contexts = new Map<string, string>();
      for (const c of ((r?.get('contexts') as Record<string, unknown>[] | null | undefined) ?? [])) {
        if (typeof c.id === 'string' && typeof c.phrase === 'string') contexts.set(c.id, c.phrase);
      }
      return { records, contexts };
    },
  };
}

// ---- answerTrailOffer ----

export const ANSWER_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_TRAIL_OFFER]->(o:TrailOffer {key: $key})
  OPTIONAL MATCH (r:TrailRule {id: o.ruleId})
  RETURN coalesce(u.partsEnabled, false) AS partsOn,
         CASE WHEN o IS NULL THEN null ELSE o {.shape, .moveIds, .pullIds, .status, .answer, .pairId,
           open: ${GUARDS.TrailOffer.answer('o')}} END AS offer,
         r.cooldownDays AS cooldownDays
`;

/** Not now: open, with a cooldown; it comes back on Today after it. */
export const ANSWER_NOT_NOW_QUERY = `
  MATCH (:User {id: $uid})-[:HAS_TRAIL_OFFER]->(o:TrailOffer {key: $key})
  WHERE ${GUARDS.TrailOffer.answer('o')}
  SET o.answer = 'not_now', o.answeredAt = datetime(), o.cooldownUntil = datetime() + duration({days: $cooldownDays}),
      o.notNowCount = coalesce(o.notNowCount, 0) + 1
  RETURN o.status AS status
`;

/** Every other answer: final. `splitMoveIds` only for More than one. */
export const ANSWER_FINAL_QUERY = `
  MATCH (:User {id: $uid})-[:HAS_TRAIL_OFFER]->(o:TrailOffer {key: $key})
  WHERE ${GUARDS.TrailOffer.answer('o')}
  SET o.status = 'answered', o.answer = $answer, o.answeredAt = datetime(), o.cooldownUntil = null,
      o.splitMoveIds = $split
  RETURN o.status AS status
`;

/** More than one: a PartCandidate per kept move (create once), FROM_OFFER the offer. */
export const SPLIT_CANDIDATES_QUERY = `
  ${MERGE_USER}
  WITH u
  MATCH (u)-[:HAS_TRAIL_OFFER]->(o:TrailOffer {key: $key})
  WHERE coalesce(u.partsEnabled, false)
  UNWIND $candidates AS cand
  MERGE (c:PartCandidate {key: cand.key})
  ON CREATE SET c:UserData:LogRecord, c.id = cand.id, c.ownerId = $uid, c.createdAt = datetime(), c.schemaVersion = 1,
    c.origin = $origin, c.moveIds = [cand.moveId], c.status = 'open'
  MERGE (u)-[:HAS_PART_CANDIDATE]->(c)
  MERGE (c)-[:FROM_OFFER]->(o)
  RETURN collect(c.id) AS ids
`;

export interface AnswerState {
  partsOn: boolean;
  offer: { shape: TrailShape; moveIds: string[]; pullIds: string[]; status: string; answer: string | null; open: boolean; pairId?: string | null } | null;
  cooldownDays: number | null;
}

export interface AnswerDeps {
  state(): Promise<AnswerState>;
  notNow(cooldownDays: number): Promise<boolean>;
  final(answer: TrailOfferAnswer, split: string[] | null): Promise<boolean>;
  candidates(c: { id: string; moveId: string }[]): Promise<string[]>;
}

const answered = () => new HttpsError('failed-precondition', 'This offer was already answered');

export async function answerTrailOfferHandler(input: AnswerInput, deps: AnswerDeps): Promise<AnswerTrailOfferResponse> {
  const st = await deps.state();
  if (!st.partsOn) throw partsOff();
  if (!st.offer) throw new HttpsError('not-found', 'Offer not found');
  // Rule D is answered in Reflect's batch, never here.
  if (st.offer.shape === 'D') throw new HttpsError('failed-precondition', 'Not answered here');
  if (!st.offer.open) throw answered();
  const base = { offerId: input.offerId, answer: input.answer };

  if (input.answer === 'not_now') {
    const days = st.cooldownDays && st.cooldownDays > 0 ? st.cooldownDays : DEFAULT_COOLDOWN_DAYS;
    if (!(await deps.notNow(days))) throw answered();
    return { ...base, status: st.offer.status === 'seen' ? 'seen' : 'offered', next: 'none' };
  }

  // Rule C (two pulls): More than one opens Two pulls on the offer's pair; nothing to split.
  const twoPulls = input.answer === 'more_than_one' && st.offer.shape === 'C' && !!st.offer.pairId;
  if (input.answer === 'more_than_one' && !twoPulls) {
    if (input.split.length === 0) throw new HttpsError('invalid-argument', 'Which moves feel like their own thing');
    const known = new Set(st.offer.moveIds);
    if (!input.split.every((m) => known.has(m))) throw new HttpsError('invalid-argument', 'Not one of this offer\'s moves');
  }
  if (!(await deps.final(input.answer, input.answer === 'more_than_one' && !twoPulls ? input.split : null))) throw answered();
  const done = { ...base, status: 'answered' as const };

  if (input.answer === 'yes') {
    return { ...done, next: 'meet', moveIds: st.offer.pullIds.length ? st.offer.pullIds : st.offer.moveIds };
  }
  if (twoPulls) return { ...done, next: 'two_pulls', pairId: st.offer.pairId as string };
  if (input.answer === 'more_than_one') {
    const ids = await deps.candidates(input.split.map((moveId, i) => ({ id: input.candidateIds[i], moveId })));
    return { ...done, next: 'candidates', candidateIds: ids };
  }
  return { ...done, next: 'none' };
}

export function answerDeps(tx: ManagedTransaction, uid: string, email: string | null, id: string): AnswerDeps {
  const key = userKey(uid, id);
  return {
    async state() {
      const r = (await tx.run(ANSWER_STATE_QUERY, { uid, key })).records[0];
      const o = r?.get('offer') as Record<string, unknown> | null | undefined;
      return {
        partsOn: r?.get('partsOn') === true,
        offer: o ? {
          shape: o.shape as TrailShape, moveIds: strs(o.moveIds), pullIds: strs(o.pullIds),
          status: String(o.status ?? ''), answer: s(o.answer), open: o.open === true, pairId: s(o.pairId),
        } : null,
        cooldownDays: toNumber(r?.get('cooldownDays')),
      };
    },
    async notNow(cooldownDays) {
      return (await tx.run(ANSWER_NOT_NOW_QUERY, { uid, key, cooldownDays })).records.length > 0;
    },
    async final(answer, split) {
      return (await tx.run(ANSWER_FINAL_QUERY, { uid, key, answer, split })).records.length > 0;
    },
    async candidates(c) {
      const rows = c.map((x) => ({ ...x, key: userKey(uid, x.id) }));
      return strs((await tx.run(SPLIT_CANDIDATES_QUERY, { uid, email, key, origin: TRAIL_CANDIDATE_ORIGIN, candidates: rows })).records[0]?.get('ids'));
    },
  };
}
