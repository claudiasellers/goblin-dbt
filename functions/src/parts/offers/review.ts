/**
 * Reflect's trails (docs/design/parts.md, Rules → rule D, "Never a push. Shown in Reflect as 'Was this
 * {name}?', answered in a batch", and The offer card's "It's how things go: the trail stays a plain
 * pattern in Reflect"). Three callables as handlers over an injected query layer (tests drive them with
 * plain functions or the fake driver):
 *
 * getReflectTrails
 * - Rule D's blocks: for each claimed part with a rule D candidate (lane 1's evaluator, `trail_known_part`),
 *   at most REVIEW_MAX_PARTS at once, only through the offer gate (gate.ts: parts on, offers on, the rule
 *   on and its template signed off; no flooding, crisis, repeated dissociation or harm signal). The shared
 *   weekly budget is the one gate reason rule D doesn't take: it is never a push, and its batch doesn't
 *   spend the budget either (record.ts). Each block: the template, the part as the profile slice gives it
 *   (never a direct Part read), and a row per episode as labels only (date, tool ids, the context's
 *   signed-off phrase, the graph labels of the picks behind it). Never anything the person wrote.
 * - The plain patterns: the caller's trails answered *It's how things go* and not removed, parts on only,
 *   each with every phrase its statement needs signed off (as Today's card); no parts language.
 *
 * answerKnownPartReview: the caller's own live part and their own records only. The answered episodes
 * must be that part's rule D episodes now (rules.ts `knownPartEpisodes`, threshold aside). Writes the
 * batch as a rule D TrailOffer (record.ts `writeKnownPartReview`: Done or Not now, the rule's cooldown,
 * the No rows' record keys) and a `PartTag {source: 'review'}` on each record of each Yes row (one per
 * record per source, `taggedKey` `<record key>:review`). Not sure writes nothing. A batch id already
 * saved is a repeat; a part still cooling down from a batch is refused.
 *
 * removeTrailPattern: the ×, once, under GUARDS.TrailOffer.removePattern.
 */
import { randomUUID } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { readProfileSlices } from '../../profile/slices';
import { ValidationError, obj, oneOf, uuid } from '../../shared/validate';
import { toNumber } from '../../shared/values';
import { GUARDS } from '../../userdata/lifecycle';
import { userKey } from '../../userdata/ownership';
import { partsOff } from '../keep';
import { sessionSourceMatch } from '../sessionMoves';
import { TAG_NEVER_TOOLS, taggedKeyOf } from '../tag';
import {
  buildEpisodes, evidenceOf, isBlocked as trailBlocked, knownPartEpisodes, readTrailState,
} from '../trails';
import { blockedTrails, TRAIL_OFFER_ID, type OfferState } from './blocked';
import type { OfferGate } from './gate';
import { checkOfferGate, readOfferPolicy, readOfferStates, readPhrases, type OfferPolicyState } from './queries';
import { writeKnownPartReview, type KnownPartReview } from './record';
import { TRAIL_EVALUATOR } from './today';
import {
  KNOWN_PART_REVIEW_CLOSES, KNOWN_PART_ROW_ANSWERS, TODAY_SHAPES,
  type AnswerKnownPartReviewRequest, type AnswerKnownPartReviewResponse, type BlockedTrail, type GetReflectTrailsResponse,
  type KnownPartReviewBlock, type OfferableTrail, type PlainTrailPattern, type RemoveTrailPatternResponse,
  type TrailEvidence, type TrailShape,
} from './types';

/** At most this many parts' blocks at once (the brief: "at most two parts at once"). */
export const REVIEW_MAX_PARTS = 2;
/** Rule D's cooldown when its rule has none (TrailRule.cooldownDays ships as 14 for D). */
export const KNOWN_PART_COOLDOWN_DAYS = 14;
/** The most rows one batch answers (an episode per row; rule D's window is the records' 42 days). */
export const REVIEW_MAX_ROWS = 60;
/** The gate reasons rule D doesn't take: it is never a push, so the shared weekly budget isn't its. */
export const REVIEW_IGNORES: readonly OfferGate['reasons'][number][] = ['budget'];

const fail = (m: string): never => { throw new ValidationError(m); };
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const s = (v: unknown): string | null => (typeof v === 'string' ? v : null);
/** A record key is `ownerId:id`; the id is what a row's answer names (never the uid). */
export const idOfKey = (key: string): string => key.slice(key.indexOf(':') + 1);

// ---- validation ----

export type KnownPartReviewInput = AnswerKnownPartReviewRequest;

export function validateKnownPartReview(raw: unknown): KnownPartReviewInput {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['id', 'partId', 'close', 'rows'].includes(k)) fail(`${k}: not accepted`);
  const rows = o.rows === undefined ? [] : o.rows;
  if (!Array.isArray(rows) || rows.length > REVIEW_MAX_ROWS) fail(`rows: at most ${REVIEW_MAX_ROWS}`);
  const out = (rows as unknown[]).map((r) => {
    const x = obj(r);
    for (const k of Object.keys(x)) if (!['episodeId', 'answer'].includes(k)) fail(`rows.${k}: not accepted`);
    return { episodeId: uuid(x.episodeId), answer: oneOf(x.answer, KNOWN_PART_ROW_ANSWERS) };
  });
  if (new Set(out.map((r) => r.episodeId)).size !== out.length) fail('rows: one answer per row');
  return { id: uuid(o.id), partId: uuid(o.partId), close: oneOf(o.close, KNOWN_PART_REVIEW_CLOSES), rows: out };
}

export function validateRemovePattern(raw: unknown): { offerId: string } {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (k !== 'offerId') fail(`${k}: not accepted`);
  const id = o.offerId;
  return { offerId: typeof id === 'string' && id.length <= 400 && TRAIL_OFFER_ID.test(id) ? id : fail('offerId: expected an offer id') };
}

// ---- getReflectTrails ----

/** The caller's trails answered *It's how things go*, not removed, of a Today shape; newest answer first. */
export const PLAIN_PATTERNS_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_TRAIL_OFFER]->(o:TrailOffer)
  WHERE coalesce(u.partsEnabled, false) AND o.status = 'answered' AND o.answer = 'how_it_goes'
    AND o.patternRemovedAt IS NULL AND o.shape IN $shapes
  RETURN o.id AS id, o.ruleId AS ruleId, o.shape AS shape, coalesce(o.pullIds, o.moveIds) AS pullIds, o.contextId AS contextId
  ORDER BY o.answeredAt DESC, o.id
`;

/**
 * Labels only: per record of the caller's (by key), the graph labels of the picks that express the part's
 * moves through approved edges; and the signed-off phrase of each context id.
 */
export const REVIEW_LABELS_QUERY = `
  OPTIONAL MATCH (r:LogRecord) WHERE r.key IN $recordKeys AND r.ownerId = $uid
  OPTIONAL MATCH (r)-[:DETAIL]->(dd) WHERE dd.ownerId = $uid
  // A detail session without a ToolSession is its own record (as the trails records query reads it).
  WITH r, CASE WHEN r:ToolSession THEN dd ELSE r END AS d
  OPTIONAL MATCH (src)-[x:EXPRESSES]->(m:ProtectiveMove)
    WHERE r IS NOT NULL AND x.reviewStatus = 'approved' AND m.id IN $moveIds AND (
         ${sessionSourceMatch('src', 'r', 'd')}
      OR (src:QuestionResponse AND r:CheckIn AND src.id IN coalesce(r.discResponseIds, []))
    )
  WITH r, [l IN collect(DISTINCT src.label) WHERE l IS NOT NULL] AS labels
  WITH collect(CASE WHEN r IS NULL THEN null ELSE {key: r.key, labels: labels} END) AS records
  OPTIONAL MATCH (c:TrailContext)
  WHERE c.id IN $contextIds AND c.reviewStatus = 'approved' AND c.pending IS NULL
  RETURN records, collect(c {.id, .phrase}) AS contexts
`;

export interface ReviewPart {
  id: string; name: string | null; firstPlace: string | null; shapeSig: number[] | null; safety: boolean; moveIds: string[];
}
export interface PlainPatternRow { id: string; ruleId: string; shape: TrailShape; pullIds: string[]; contextId: string | null }

export interface ReflectTrailsDeps {
  policy(): Promise<OfferPolicyState>;
  gate(ruleId: string): Promise<OfferGate>;
  offers(): Promise<OfferState[]>;
  /** The engine's candidates (enabled rules), skipping `blocked`. */
  candidates(blocked: readonly BlockedTrail[]): Promise<OfferableTrail[]>;
  /** The caller's kept parts through the profile slice. */
  parts(): Promise<ReviewPart[]>;
  labels(recordKeys: string[], moveIds: string[], contextIds: string[]): Promise<{ records: Map<string, string[]>; contexts: Map<string, string> }>;
  patterns(): Promise<PlainPatternRow[]>;
  phrases(moveIds: string[], contextId: string | null): Promise<{ moves: Map<string, string>; context: string | null }>;
}

/** The episode's context: its first signed-off one. */
const contextOf = (e: TrailEvidence, phrases: Map<string, string>): string | null =>
  e.contextIds.map((c) => phrases.get(c)).find((p): p is string => !!p) ?? null;

async function plainPatterns(st: OfferPolicyState, deps: ReflectTrailsDeps): Promise<PlainTrailPattern[]> {
  const out: PlainTrailPattern[] = [];
  for (const p of await deps.patterns()) {
    if (!TODAY_SHAPES.includes(p.shape)) continue;
    const rule = st.rules.find((r) => r.id === p.ruleId);
    if (!rule?.approved || !rule.statementTemplate || /\{name\}/.test(rule.statementTemplate)) continue;
    // Every phrase the statement uses must be signed off; anything missing, no line.
    const { moves, context } = await deps.phrases(p.pullIds, p.contextId);
    const pulls = p.pullIds.map((m) => moves.get(m) ?? null);
    if (pulls.length === 0 || pulls.some((x) => x === null)) continue;
    if (p.contextId && !context) continue;
    out.push({ offerId: p.id, shape: p.shape as 'A' | 'B' | 'C', template: rule.statementTemplate, pulls: pulls as string[], context: p.contextId ? context : null });
  }
  return out;
}

async function knownPartBlocks(st: OfferPolicyState, deps: ReflectTrailsDeps, now: Date): Promise<KnownPartReviewBlock[]> {
  const rule = st.rules.find((r) => r.shape === 'D');
  if (!st.offersEnabled || !rule?.enabled || !rule.approved || !rule.statementTemplate) return [];
  const gate = await deps.gate(rule.id);
  if (gate.reasons.some((r) => !REVIEW_IGNORES.includes(r))) return [];
  const blocked = blockedTrails(await deps.offers(), now);
  const parts = new Map((await deps.parts()).map((p) => [p.id, p]));
  const picks = (await deps.candidates(blocked))
    .filter((c) => c.shape === 'D' && c.ruleId === rule.id && c.partId && parts.has(c.partId))
    .slice(0, REVIEW_MAX_PARTS);
  const out: KnownPartReviewBlock[] = [];
  for (const c of picks) {
    const part = parts.get(c.partId as string)!;
    const evidence = [...c.evidence].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const { records, contexts } = await deps.labels(
      [...new Set(evidence.flatMap((e) => e.recordKeys))], [...c.moveIds], [...new Set(evidence.flatMap((e) => e.contextIds))],
    );
    out.push({
      partId: part.id, template: rule.statementTemplate, name: part.name, firstPlace: part.firstPlace,
      shapeSig: part.shapeSig, safety: part.safety,
      rows: evidence.filter((e) => e.recordKeys.length > 0).map((e) => ({
        episodeId: idOfKey(e.recordKeys[0]), at: e.at, toolIds: [...e.toolIds], context: contextOf(e, contexts),
        sources: [...new Set(e.recordKeys.flatMap((k) => records.get(k) ?? []))].sort(),
      })),
    });
  }
  return out;
}

export async function getReflectTrailsHandler(deps: ReflectTrailsDeps, now: Date = new Date()): Promise<GetReflectTrailsResponse> {
  const st = await deps.policy();
  // Parts off: nothing at all (no error; Reflect simply has no trails section).
  if (!st.partsOn) return { reviews: [], patterns: [] };
  return { reviews: await knownPartBlocks(st, deps, now), patterns: await plainPatterns(st, deps) };
}

function labelsFrom(r: { get(k: string): unknown } | undefined) {
  const records = new Map<string, string[]>();
  for (const x of ((r?.get('records') as Record<string, unknown>[] | null | undefined) ?? [])) {
    if (x && typeof x.key === 'string') records.set(x.key, strs(x.labels));
  }
  const contexts = new Map<string, string>();
  for (const c of ((r?.get('contexts') as Record<string, unknown>[] | null | undefined) ?? [])) {
    if (typeof c.id === 'string' && typeof c.phrase === 'string') contexts.set(c.id, c.phrase);
  }
  return { records, contexts };
}

export function reflectTrailsDeps(tx: ManagedTransaction, uid: string, now: Date): ReflectTrailsDeps {
  let policy: OfferPolicyState | null = null;
  return {
    async policy() { policy = await readOfferPolicy(tx, uid); return policy; },
    async gate(ruleId) { return checkOfferGate(tx, uid, policy ?? await readOfferPolicy(tx, uid), ruleId, now); },
    async offers() { return readOfferStates(tx, uid); },
    async candidates(blocked) { return TRAIL_EVALUATOR(tx, uid, blocked, now); },
    async parts() {
      const { parts } = await readProfileSlices(tx, uid, 'today', now.getTime());
      return parts.map((p) => ({
        id: p.id, name: p.name, firstPlace: p.firstPlace, shapeSig: p.shapeSig, safety: p.safety === true, moveIds: p.moveIds,
      }));
    },
    async labels(recordKeys, moveIds, contextIds) {
      return labelsFrom((await tx.run(REVIEW_LABELS_QUERY, { uid, recordKeys, moveIds, contextIds })).records[0]);
    },
    async patterns() {
      const res = await tx.run(PLAIN_PATTERNS_QUERY, { uid, shapes: [...TODAY_SHAPES] });
      return res.records.map((r) => ({
        id: String(r.get('id')), ruleId: String(r.get('ruleId')), shape: r.get('shape') as TrailShape,
        pullIds: strs(r.get('pullIds')), contextId: s(r.get('contextId')),
      }));
    },
    async phrases(moveIds, contextId) { return readPhrases(tx, moveIds, contextId); },
  };
}

// ---- answerKnownPartReview ----

export const REVIEW_EXISTS_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_TRAIL_OFFER]->(o:TrailOffer {key: $key})
  RETURN coalesce(u.partsEnabled, false) AS partsOn, o IS NOT NULL AS exists
`;

/**
 * Yes: a review tag on each of the row's records the caller owns (a closed ToolSession, never Meet a part;
 * a detail session; a check-in), of the caller's live part; once per record per source.
 */
export const REVIEW_TAGS_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART]->(pt:Part {key: $partKey})
  WHERE coalesce(u.partsEnabled, false) AND pt.status IN ['active', 'resting']
  UNWIND $tags AS tag
  MATCH (r:LogRecord {key: tag.recordKey})
  WHERE r.ownerId = $uid AND NOT (r:ToolSession AND (r.status = 'open' OR r.toolId IN $never))
    AND NOT EXISTS { MATCH (:PartTag {taggedKey: tag.taggedKey}) } AND NOT EXISTS { MATCH (:PartTag {key: tag.key}) }
  MERGE (t:PartTag {key: tag.key})
  ON CREATE SET t:UserData:LogRecord, t.id = tag.id, t.ownerId = $uid, t.createdAt = datetime(), t.schemaVersion = 1,
    t.at = datetime(), t.source = 'review', t.taggedKey = tag.taggedKey, t.strength = null
  MERGE (u)-[:HAS_PART_TAG]->(t)
  MERGE (t)-[:TAGS]->(r)
  MERGE (t)-[:OF_PART]->(pt)
  RETURN count(t) AS n
`;

export interface KnownPartEligible {
  ruleId: string | null;
  cooldownDays: number | null;
  /** The part, when it is the caller's live claimed part. */
  part: { id: string; moveIds: string[] } | null;
  /** Its rule D episodes now (threshold aside), as evidence rows. */
  evidence: TrailEvidence[];
}

export interface KnownPartReviewDeps {
  state(): Promise<{ partsOn: boolean; exists: boolean }>;
  offers(): Promise<OfferState[]>;
  eligible(partId: string, blocked: readonly BlockedTrail[]): Promise<KnownPartEligible>;
  write(trail: Pick<OfferableTrail, 'ruleId' | 'moveIds' | 'partId' | 'evidence'>, review: KnownPartReview): Promise<boolean>;
  tag(partId: string, recordKeys: string[]): Promise<number>;
}

const already = () => new HttpsError('failed-precondition', 'That part was already looked at');

export async function answerKnownPartReviewHandler(
  input: KnownPartReviewInput, deps: KnownPartReviewDeps, now: Date = new Date(),
): Promise<AnswerKnownPartReviewResponse> {
  const st = await deps.state();
  if (!st.partsOn) throw partsOff();
  if (st.exists) return { id: input.id, created: false, tagged: 0 };
  const blocked = blockedTrails(await deps.offers(), now);
  const el = await deps.eligible(input.partId, blocked);
  if (!el.part || !el.ruleId) throw new HttpsError('not-found', 'Part not found');
  if (trailBlocked(blocked, { ruleId: el.ruleId, moveIds: [], contextId: null, partId: el.part.id }, now.getTime())) throw already();
  if (el.evidence.length === 0) throw new HttpsError('failed-precondition', 'Nothing to look at for that part');

  // Each row names one of the part's episodes now (by any of its records' ids); one answer per episode.
  const byRow = input.rows.map((r) => ({ r, e: el.evidence.find((e) => e.recordKeys.some((k) => idOfKey(k) === r.episodeId)) }));
  if (byRow.some((x) => !x.e)) throw new HttpsError('failed-precondition', 'That changed; open Reflect again');
  if (new Set(byRow.map((x) => x.e)).size !== byRow.length) throw new HttpsError('invalid-argument', 'rows: one answer per row');
  const keysOf = (a: string) => [...new Set(byRow.filter((x) => x.r.answer === a).flatMap((x) => x.e!.recordKeys))];
  const yesKeys = keysOf('yes');
  const noKeys = keysOf('no');

  const moveIds = [...new Set(el.evidence.flatMap((e) => e.moveIds.filter((m) => el.part!.moveIds.includes(m))))].sort();
  const cooldownDays = el.cooldownDays && el.cooldownDays > 0 ? el.cooldownDays : KNOWN_PART_COOLDOWN_DAYS;
  const wrote = await deps.write(
    { ruleId: el.ruleId, moveIds, partId: el.part.id, evidence: el.evidence },
    { id: input.id, close: input.close, cooldownDays, noKeys, yesKeys },
  );
  if (!wrote) throw already();
  const tagged = yesKeys.length ? await deps.tag(el.part.id, yesKeys) : 0;
  return { id: input.id, created: true, tagged };
}

export function knownPartReviewDeps(tx: ManagedTransaction, uid: string, id: string, now: Date): KnownPartReviewDeps {
  const key = userKey(uid, id);
  return {
    async state() {
      const r = (await tx.run(REVIEW_EXISTS_QUERY, { uid, key })).records[0];
      return { partsOn: r?.get('partsOn') === true, exists: r?.get('exists') === true };
    },
    async offers() { return readOfferStates(tx, uid); },
    async eligible(partId, blocked) {
      const state = await readTrailState(tx, uid, { now: now.getTime() });
      const rule = state.rules.find((r) => r.shape === 'D') ?? null;
      const part = state.partsOn ? state.parts.find((p) => p.id === partId) ?? null : null;
      if (!rule || !part || !['active', 'resting'].includes(part.status)) {
        return { ruleId: rule?.id ?? null, cooldownDays: rule?.cooldownDays ?? null, part: null, evidence: [] };
      }
      const { episodes } = buildEpisodes(state.records, state.policy, state.timeZone);
      const eps = knownPartEpisodes(rule.id, episodes, part, blocked.map((b) => ({ ...b, moveIds: [...b.moveIds] })));
      return {
        ruleId: rule.id, cooldownDays: rule.cooldownDays, part: { id: part.id, moveIds: [...part.moveIds] },
        evidence: eps.map((e) => evidenceOf(e, state.contexts)),
      };
    },
    async write(trail, review) { return (await writeKnownPartReview(tx, uid, trail, review)) !== null; },
    async tag(partId, recordKeys) {
      const tags = recordKeys.map((recordKey) => {
        const tagId = randomUUID();
        return { id: tagId, key: userKey(uid, tagId), recordKey, taggedKey: taggedKeyOf(recordKey, 'review') };
      });
      const r = (await tx.run(REVIEW_TAGS_QUERY, { uid, partKey: userKey(uid, partId), tags, never: [...TAG_NEVER_TOOLS] })).records[0];
      return toNumber(r?.get('n')) ?? 0;
    },
  };
}

// ---- removeTrailPattern ----

export const REMOVE_PATTERN_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_TRAIL_OFFER]->(o:TrailOffer {key: $key})
  RETURN coalesce(u.partsEnabled, false) AS partsOn, o IS NOT NULL AS found, o.answer AS answer,
         o.patternRemovedAt IS NOT NULL AS removed
`;

export const REMOVE_PATTERN_QUERY = `
  MATCH (:User {id: $uid})-[:HAS_TRAIL_OFFER]->(o:TrailOffer {key: $key})
  WHERE ${GUARDS.TrailOffer.removePattern('o')}
  SET o.patternRemovedAt = datetime()
  RETURN o.id AS id
`;

export interface RemovePatternDeps {
  state(): Promise<{ partsOn: boolean; found: boolean; answer: string | null; removed: boolean }>;
  remove(): Promise<boolean>;
}

export async function removeTrailPatternHandler(input: { offerId: string }, deps: RemovePatternDeps): Promise<RemoveTrailPatternResponse> {
  const st = await deps.state();
  if (!st.partsOn) throw partsOff();
  if (!st.found) throw new HttpsError('not-found', 'Not found');
  if (st.answer !== 'how_it_goes') throw new HttpsError('failed-precondition', 'Not a pattern');
  if (st.removed) return { offerId: input.offerId, removed: false };
  return { offerId: input.offerId, removed: await deps.remove() };
}

export function removePatternDeps(tx: ManagedTransaction, uid: string, offerId: string): RemovePatternDeps {
  const key = userKey(uid, offerId);
  return {
    async state() {
      const r = (await tx.run(REMOVE_PATTERN_STATE_QUERY, { uid, key })).records[0];
      return { partsOn: r?.get('partsOn') === true, found: r?.get('found') === true, answer: s(r?.get('answer')), removed: r?.get('removed') === true };
    },
    async remove() { return (await tx.run(REMOVE_PATTERN_QUERY, { uid, key })).records.length > 0; },
  };
}
