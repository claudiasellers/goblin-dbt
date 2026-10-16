/**
 * Every writer of a kept part (docs/design/parts.md: "`keepPart` is the only writer"; rule 4 of
 * Five decisions). A `Part` is profile data, so it is written only on the person's yes, and only
 * here: tests/parts-entry.test.mjs fails if any other file under functions/src MERGEs, CREATEs or
 * SETs a `:Part` (deleteMyParts may only DETACH DELETE). Every writer has the same shape: a state
 * read (parts on, the caller's own part), then one guarded write.
 *
 * keepPart (9b's yes) builds the part from the stored PartSession, never from client fields. The
 * part-card writers below (rename, rest, set aside, restore, tender, the 30-day still-true) change
 * a kept part on the person's own tap; each bumps `u.profileVersion` and returns `{ version }`.
 * The check-back's Louder pauses a part (PAUSE_PART_QUERY, last).
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { GUARDS } from '../userdata/lifecycle';
import { userKey } from '../userdata/ownership';
import { toNumber } from '../shared/values';
import {
  DEFAULT_NAME_MAX, DEFAULT_REVISIT_DAYS, keptName, mergeRevisit, partFromSession, partSource,
  type KeepInput, type PartFields, type StoredSession,
} from './keepPlan';
import type { KeepPartResponse, PartWriteResponse } from './keepTypes';
import {
  newJob, revisitTransition, type AnchorInput, type PartRef, type RenameInput, type RestInput, type RevisitInput,
} from './editPlan';

export const partsOff = () => new HttpsError('failed-precondition', 'Parts are off');

// ---- keepPart ----

export const KEEP_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PART_SESSION]->(ps:PartSession {key: $sessionKey})
  OPTIONAL MATCH (u)-[:HAS_PART]->(p:Part {key: $partKey})
  OPTIONAL MATCH (ps)-[:OF_PART]->(linked:Part)
  OPTIONAL MATCH (pol:PartsPolicy {id: 'parts'})
  OPTIONAL MATCH (k:ProfileKind {id: 'part'})
  RETURN coalesce(u.partsEnabled, false) AS partsOn,
         CASE WHEN ps IS NULL THEN null ELSE ps {.trailheadKind, .partId, .candidateId, .offerId, .moveIds, .stepIdsJson,
           .stopReason, .bodyPlaces, .shapeSig, .soundSig, .ownVoice, .ownJob, .ownFear,
           keepable: ${GUARDS.PartSession.keep('ps')}} END AS session,
         CASE WHEN p IS NULL THEN null ELSE p {.tender, .places, .shapeSig, .soundSig, .ageId, .voiceIds, .jobIds,
           .fearIds, .preferredRoleIds, .ownVoice, .ownJob, .ownFear} END AS part,
         linked.id AS linkedPartId, pol.nameMaxChars AS nameMaxChars, k.revisitAfterDays AS revisitAfterDays
`;

/**
 * The profile edges a keep adds (never removes): moves, guarded hurts, the candidate or trail offer it
 * answers (`ACCEPTED_FROM`, an edge into the finalised log record, never out of it).
 */
const KEEP_EDGES = `
  WITH u, p
  OPTIONAL MATCH (m:ProtectiveMove) WHERE m.id IN $moveIds
  WITH u, p, collect(m) AS moves
  OPTIONAL MATCH (h:ProtectedHurt) WHERE h.id IN $guardIds
  WITH u, p, moves, collect(h) AS hurts
  OPTIONAL MATCH (u)-[:HAS_PART_CANDIDATE]->(c:PartCandidate {key: $candidateKey})
  OPTIONAL MATCH (u)-[:HAS_TRAIL_OFFER]->(tof:TrailOffer {key: $offerKey})
  FOREACH (x IN CASE WHEN tof IS NULL THEN [] ELSE [tof] END |
    MERGE (p)-[r:ACCEPTED_FROM]->(x) ON CREATE SET r.confirmedAt = datetime(), r.source = $source)
  FOREACH (x IN moves | MERGE (p)-[r:USES]->(x) ON CREATE SET r.confirmedAt = datetime(), r.source = $source)
  FOREACH (x IN hurts | MERGE (p)-[r:GUARDS]->(x) ON CREATE SET r.confirmedAt = datetime(), r.source = $source)
  FOREACH (x IN CASE WHEN c IS NULL THEN [] ELSE [c] END |
    MERGE (p)-[r:ACCEPTED_FROM]->(x) ON CREATE SET r.confirmedAt = datetime(), r.source = $source
    SET x.acceptedAt = CASE WHEN ${GUARDS.PartCandidate.accept('x')} THEN datetime() ELSE x.acceptedAt END,
        x.status = CASE WHEN ${GUARDS.PartCandidate.accept('x')} THEN 'accepted' ELSE x.status END)
  RETURN p.id AS id
`;

/** A new part, on 9b's yes. MERGE on key: a repeat with the same ids writes nothing new. */
export const KEEP_NEW_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART_SESSION]->(ps:PartSession {key: $sessionKey})
  WHERE coalesce(u.partsEnabled, false) AND ${GUARDS.PartSession.keep('ps')}
  MERGE (p:Part {key: $partKey})
  ON CREATE SET p:UserData:ProfileItem, p += $fields, p.id = $partId, p.ownerId = $uid, p.createdAt = datetime(),
    p.schemaVersion = 1, p.kind = 'part', p.area = 'my_parts', p.status = 'active', p.source = $source,
    p.name = $name, p.confirmedAt = datetime(), p.revisitAt = datetime() + duration({days: $revisitDays}),
    p.lastVisitedAt = datetime()
  MERGE (u)-[:HAS_PART]->(p)
  MERGE (ps)-[:OF_PART]->(p)
  SET ps.partId = $partId
${KEEP_EDGES}`;

/** A visit to a part already kept: the merged fields (never fewer), the name only when a new one is given. */
export const KEEP_REVISIT_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART_SESSION]->(ps:PartSession {key: $sessionKey})
  WHERE coalesce(u.partsEnabled, false) AND ${GUARDS.PartSession.keep('ps')}
  MATCH (u)-[:HAS_PART]->(p:Part {key: $partKey})
  SET p += $fields, p.name = CASE WHEN $name IS NULL THEN p.name ELSE $name END,
      p.lastVisitedAt = datetime(), p.updatedAt = datetime()
  MERGE (ps)-[:OF_PART]->(p)
${KEEP_EDGES}`;

export interface KeepState {
  partsOn: boolean;
  session: (StoredSession & { partId: string | null; moveIds: string[]; keepable: boolean }) | null;
  /** The part keyed by the requested part id, if the caller has one. */
  part: Record<string, unknown> | null;
  /** The part this session already kept, if any. */
  linkedPartId: string | null;
  nameMax: number;
  revisitDays: number;
}

export interface KeepWrite {
  sessionId: string;
  partId: string;
  candidateId: string | null;
  /** The trail offer this visit answers (trailheadKind 'offer'). */
  offerId?: string | null;
  fields: PartFields;
  moveIds: string[];
  guardIds: string[];
  source: 'made' | 'candidate' | 'offer';
  name: string | null;
  revisitDays: number;
}

export interface KeepDeps {
  state(input: KeepInput): Promise<KeepState>;
  /** The guarded writes; false when the guard (or parts off) stopped them. */
  create(w: KeepWrite): Promise<boolean>;
  revisit(w: KeepWrite): Promise<boolean>;
}

export async function keepPartHandler(input: KeepInput, deps: KeepDeps): Promise<KeepPartResponse> {
  const st = await deps.state(input);
  if (!st.partsOn) throw partsOff();
  if (!st.session) throw new HttpsError('not-found', 'Session not found');
  if (!st.session.keepable) throw new HttpsError('failed-precondition', 'This visit is closed');
  const name = keptName(input.name, st.nameMax);
  const { guardIds, ...visit } = partFromSession(st.session);
  const base = {
    sessionId: input.sessionId, partId: input.partId, candidateId: st.session.candidateId, offerId: st.session.offerId ?? null,
    moveIds: st.session.moveIds, guardIds, source: partSource(st.session), revisitDays: st.revisitDays,
  };
  if (st.session.partId) {
    // A visit to a part already kept (or a repeat of this keep): that part, and only that part.
    if (st.session.partId !== input.partId) throw new HttpsError('invalid-argument', 'This visit is about another part');
    if (!st.part) throw new HttpsError('not-found', 'Part not found');
    const ok = await deps.revisit({ ...base, fields: mergeRevisit(st.part, visit), name: name ?? null });
    if (!ok) throw new HttpsError('failed-precondition', 'This visit is closed');
    return { partId: input.partId, created: false };
  }
  if (st.part || (st.linkedPartId && st.linkedPartId !== input.partId)) {
    throw new HttpsError('failed-precondition', 'That id belongs to another part');
  }
  const ok = await deps.create({ ...base, fields: visit, name: name ?? null });
  if (!ok) throw new HttpsError('failed-precondition', 'This visit is closed');
  return { partId: input.partId, created: true };
}

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const nums = (v: unknown): number[] | null => (Array.isArray(v) ? v.map((x) => toNumber(x) ?? 0) : null);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function keepDeps(tx: ManagedTransaction, uid: string): KeepDeps {
  const params = (w: KeepWrite) => ({
    uid, sessionKey: userKey(uid, w.sessionId), partKey: userKey(uid, w.partId), partId: w.partId,
    candidateKey: w.candidateId ? userKey(uid, w.candidateId) : null,
    offerKey: w.offerId ? userKey(uid, w.offerId) : null,
    fields: w.fields, moveIds: w.moveIds, guardIds: w.guardIds, source: w.source, name: w.name,
    revisitDays: w.revisitDays,
  });
  return {
    async state(input) {
      const r = (await tx.run(KEEP_STATE_QUERY, {
        uid, sessionKey: userKey(uid, input.sessionId), partKey: userKey(uid, input.partId),
      })).records[0];
      const s = r?.get('session') as Record<string, unknown> | null | undefined;
      const max = toNumber(r?.get('nameMaxChars'));
      const days = toNumber(r?.get('revisitAfterDays'));
      return {
        partsOn: r?.get('partsOn') === true,
        session: s ? {
          trailheadKind: str(s.trailheadKind), partId: str(s.partId), candidateId: str(s.candidateId), offerId: str(s.offerId),
          moveIds: strs(s.moveIds), stepIdsJson: str(s.stepIdsJson), stopReason: str(s.stopReason),
          bodyPlaces: strs(s.bodyPlaces), shapeSig: nums(s.shapeSig), soundSig: nums(s.soundSig),
          ownVoice: str(s.ownVoice), ownJob: str(s.ownJob), ownFear: str(s.ownFear), keepable: s.keepable === true,
        } : null,
        part: (r?.get('part') as Record<string, unknown> | null | undefined) ?? null,
        linkedPartId: str(r?.get('linkedPartId')),
        nameMax: max && max > 0 ? max : DEFAULT_NAME_MAX,
        revisitDays: days && days > 0 ? days : DEFAULT_REVISIT_DAYS,
      };
    },
    async create(w) {
      return (await tx.run(KEEP_NEW_QUERY, params(w))).records.length > 0;
    },
    async revisit(w) {
      return (await tx.run(KEEP_REVISIT_QUERY, params(w))).records.length > 0;
    },
  };
}

// ---- The part card: rename, rest, set aside, restore, tender, still-true ----

export const PART_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PART]->(p:Part {key: $partKey})
  OPTIONAL MATCH (u)-[:HAS_PART_REVISIT]->(r:PartRevisit {key: $revisitKey})
  OPTIONAL MATCH (pol:PartsPolicy {id: 'parts'})
  OPTIONAL MATCH (k:ProfileKind {id: 'part'})
  OPTIONAL MATCH (o:PartOption {flow: 'meet', step: 'rather'}) WHERE o.id IN $ratherIds
  OPTIONAL MATCH (u)-[:HAS_OWN_LINE]->(ol:OwnLine {key: $lineKey}) WHERE ol.status = 'active'
  OPTIONAL MATCH (u)-[:SAVED_LINE]->(vl:ValidationLine {id: $lineId})
  RETURN coalesce(u.partsEnabled, false) AS partsOn, coalesce(u.profileVersion, 0) AS version,
         CASE WHEN p IS NULL THEN null ELSE p {.status, .tender, .name, .jobIds, .ownJob, .jobHistoryJson,
           .preferredRoleIds, .anchorLineId, .anchorOwn} END AS part,
         r IS NOT NULL AS revisitLogged, pol.nameMaxChars AS nameMaxChars, k.revisitAfterDays AS revisitAfterDays,
         count(DISTINCT o) AS knownRather, (ol IS NOT NULL OR vl IS NOT NULL) AS lineOwned
`;

/** One write to the caller's own part, parts on, under `where`; every writer bumps the profile version. */
const partWrite = (where: string, set: string) => `
  MATCH (u:User {id: $uid})-[:HAS_PART]->(p:Part {key: $partKey})
  WHERE coalesce(u.partsEnabled, false) AND ${where}
  SET ${set}, p.updatedAt = datetime(), u.profileVersion = coalesce(u.profileVersion, 0) + 1
  RETURN u.profileVersion AS version
`;

export const RENAME_PART_QUERY = partWrite('true', 'p.name = $name');
/** Resting keeps `revisitAt`: a resting part is still checked back with. */
export const REST_PART_QUERY = partWrite('p.status = $from', 'p.status = $to');
/** Like setAsideProfileItem: kept and restorable; every field and edge stays. */
export const SET_ASIDE_PART_QUERY = partWrite("p.status <> 'set_aside'", "p.status = 'set_aside', p.lastReviewedAt = datetime()");
/** Like restoreProfileItem: active, confirmed now, a fresh revisit from the `part` kind. */
export const RESTORE_PART_QUERY = partWrite("p.status = 'set_aside'",
  "p.status = 'active', p.confirmedAt = datetime(), p.lastReviewedAt = datetime(), p.revisitAt = datetime() + duration({days: $revisitDays})");
export const SET_PART_TENDER_QUERY = partWrite('coalesce(p.tender, false) = false', 'p.tender = true');
/** DEAR MAN's cope ahead: one anchor, a kept line (by id) or the person's own words, never both. */
export const SET_PART_ANCHOR_QUERY = partWrite("p.status IN ['active', 'resting']", 'p.anchorLineId = $lineId, p.anchorOwn = $own');

/**
 * The 30-day still-true: logs the answer once (`PartRevisit`, create only: the same id again finds
 * it and writes nothing) and applies it to the part in the same statement.
 */
export const ANSWER_PART_REVISIT_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART]->(p:Part {key: $partKey})
  WHERE coalesce(u.partsEnabled, false) AND p.status = $from
    AND NOT EXISTS { MATCH (:PartRevisit {key: $revisitKey}) }
  MERGE (r:PartRevisit {key: $revisitKey})
  ON CREATE SET r:UserData:LogRecord, r.id = $id, r.ownerId = $uid, r.createdAt = datetime(), r.schemaVersion = 1,
    r.partId = $partId, r.answer = $answer, r.ratherIds = $ratherIds
  MERGE (u)-[:HAS_PART_REVISIT]->(r)
  MERGE (r)-[:OF_PART]->(p)
  SET p += $jobFields, p.status = $to, p.confirmedAt = datetime(), p.lastReviewedAt = datetime(),
      p.reviewCount = coalesce(p.reviewCount, 0) + 1, p.revisitAt = datetime() + duration({days: $revisitDays}),
      p.updatedAt = datetime(), u.profileVersion = coalesce(u.profileVersion, 0) + 1
  RETURN u.profileVersion AS version
`;

export interface PartEditState {
  partsOn: boolean;
  version: number;
  part: Record<string, unknown> | null;
  /** The still-true answer with this id is already logged (a repeat call). */
  revisitLogged: boolean;
  /** How many of the asked rather ids are the meet flow's `rather` options. */
  knownRather: number;
  /** The asked line is the caller's own: an active OwnLine, or a ValidationLine they SAVED_LINE'd. */
  lineOwned: boolean;
  nameMax: number;
  revisitDays: number;
}

export interface PartEditDeps {
  state(q: { partId: string; revisitId?: string; ratherIds?: string[]; lineId?: string }): Promise<PartEditState>;
  /** One of the queries above; the new profile version, or null when its guard stopped it. */
  write(query: string, params: Record<string, unknown>): Promise<number | null>;
}

const notFound = () => new HttpsError('not-found', 'Part not found');
const changed = () => new HttpsError('failed-precondition', 'That part changed; try again');

async function ownPart(deps: PartEditDeps, q: Parameters<PartEditDeps['state']>[0]) {
  const st = await deps.state(q);
  if (!st.partsOn) throw partsOff();
  if (!st.part) throw notFound();
  return { st, part: st.part, status: typeof st.part.status === 'string' ? st.part.status : 'active' };
}

async function written(deps: PartEditDeps, query: string, params: Record<string, unknown>): Promise<PartWriteResponse> {
  const version = await deps.write(query, params);
  if (version === null) throw changed();
  return { version };
}

/** Rename (`keptName`: trimmed, ≤ PartsPolicy.nameMaxChars, '' / null is "Not yet"). Never linted. */
export async function renamePartHandler(input: RenameInput, deps: PartEditDeps): Promise<PartWriteResponse> {
  const { st, part } = await ownPart(deps, { partId: input.partId });
  const name = keptName(input.name, st.nameMax) ?? null;
  if ((part.name ?? null) === name) return { version: st.version };
  return written(deps, RENAME_PART_QUERY, { partId: input.partId, name });
}

/** Rest (true: active → resting) or wake (false: resting → active). A set-aside part is restored instead. */
export async function restPartHandler(input: RestInput, deps: PartEditDeps): Promise<PartWriteResponse> {
  const { st, status } = await ownPart(deps, { partId: input.partId });
  if (status === 'set_aside') throw new HttpsError('failed-precondition', 'Set aside: restore it first');
  const to = input.resting ? 'resting' : 'active';
  if (status === to) return { version: st.version };
  return written(deps, REST_PART_QUERY, { partId: input.partId, from: status, to });
}

export async function setAsidePartHandler(input: PartRef, deps: PartEditDeps): Promise<PartWriteResponse> {
  const { st, status } = await ownPart(deps, { partId: input.partId });
  if (status === 'set_aside') return { version: st.version };
  return written(deps, SET_ASIDE_PART_QUERY, { partId: input.partId });
}

/** Restores a set-aside part; on an active or resting part it changes nothing (it isn't set aside). */
export async function restorePartHandler(input: PartRef, deps: PartEditDeps): Promise<PartWriteResponse> {
  const { st, status } = await ownPart(deps, { partId: input.partId });
  if (status !== 'set_aside') return { version: st.version };
  return written(deps, RESTORE_PART_QUERY, { partId: input.partId, revisitDays: st.revisitDays });
}

/**
 * Marks a part tender (gentler copy from now on). True only: there is no unmark in this phase
 * (Claudia's tender-parts question is still open), and a revisit never clears it either.
 */
export async function setPartTenderHandler(input: PartRef, deps: PartEditDeps): Promise<PartWriteResponse> {
  const { st, part } = await ownPart(deps, { partId: input.partId });
  if (part.tender === true) return { version: st.version };
  return written(deps, SET_PART_TENDER_QUERY, { partId: input.partId });
}

/**
 * DEAR MAN's cope ahead ("If {name} shows up: …"): the part's anchor is one of the caller's kept
 * lines (`anchorLineId`, clearing `anchorOwn`) or their own words (`anchorOwn`, clearing
 * `anchorLineId`; never linted). An active or resting part; a set-aside one is restored first.
 */
export async function setPartAnchorHandler(input: AnchorInput, deps: PartEditDeps): Promise<PartWriteResponse> {
  const { st, part, status } = await ownPart(deps, { partId: input.partId, ...(input.lineId ? { lineId: input.lineId } : {}) });
  if (status === 'set_aside') throw new HttpsError('failed-precondition', 'Set aside: restore it first');
  if (input.lineId && !st.lineOwned) throw new HttpsError('not-found', 'Line not found');
  if ((part.anchorLineId ?? null) === input.lineId && (part.anchorOwn ?? null) === input.own) return { version: st.version };
  return written(deps, SET_PART_ANCHOR_QUERY, { partId: input.partId, lineId: input.lineId, own: input.own });
}

/** The 30-day still-true for kind `part`, logged once per id as a `PartRevisit`. */
export async function answerPartRevisitHandler(
  input: RevisitInput, deps: PartEditDeps, today: string = new Date().toISOString().slice(0, 10),
): Promise<PartWriteResponse> {
  const { st, part, status } = await ownPart(deps, { partId: input.partId, revisitId: input.id, ratherIds: input.ratherIds });
  if (st.revisitLogged) return { version: st.version };
  const to = revisitTransition(status, input.answer);
  if (!to) throw new HttpsError('failed-precondition', `"${input.answer}" doesn't fit a ${status} part`);
  if (st.knownRather !== input.ratherIds.length) throw new HttpsError('invalid-argument', 'ratherIds: unknown option');
  const jobFields = input.answer === 'new' ? newJob(part, input.ratherIds, today) : {};
  return written(deps, ANSWER_PART_REVISIT_QUERY, {
    id: input.id, partId: input.partId, answer: input.answer, ratherIds: input.ratherIds,
    from: status, to, jobFields, revisitDays: st.revisitDays,
  });
}

export function partEditDeps(tx: ManagedTransaction, uid: string): PartEditDeps {
  return {
    async state(q) {
      const r = (await tx.run(PART_STATE_QUERY, {
        uid, partKey: userKey(uid, q.partId), revisitKey: q.revisitId ? userKey(uid, q.revisitId) : null,
        ratherIds: q.ratherIds ?? [], lineId: q.lineId ?? null, lineKey: q.lineId ? userKey(uid, q.lineId) : null,
      })).records[0];
      const max = toNumber(r?.get('nameMaxChars'));
      const days = toNumber(r?.get('revisitAfterDays'));
      return {
        partsOn: r?.get('partsOn') === true,
        version: toNumber(r?.get('version')) ?? 0,
        part: (r?.get('part') as Record<string, unknown> | null | undefined) ?? null,
        revisitLogged: r?.get('revisitLogged') === true,
        knownRather: toNumber(r?.get('knownRather')) ?? 0,
        lineOwned: q.lineId ? r?.get('lineOwned') === true : false,
        nameMax: max && max > 0 ? max : DEFAULT_NAME_MAX,
        revisitDays: days && days > 0 ? days : DEFAULT_REVISIT_DAYS,
      };
    },
    async write(query, params) {
      const r = (await tx.run(query, {
        uid, partKey: userKey(uid, params.partId as string),
        ...(typeof params.id === 'string' ? { revisitKey: userKey(uid, params.id) } : {}),
        ...params,
      })).records[0];
      return r ? toNumber(r.get('version')) ?? 0 : null;
    },
  };
}

// ---- The check-back's Louder (parts/checkback.ts runs it in the same transaction as the answer) ----

/** PartsPolicy.louderPauseHours when the policy is missing. */
export const DEFAULT_LOUDER_PAUSE_HOURS = 72;

/**
 * "Louder" after a meeting: no more of that part for PartsPolicy.louderPauseHours. Only the pause:
 * nothing else on the part changes, and it doesn't touch the profile version (no slice reads it).
 */
export const PAUSE_PART_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART]->(p:Part {key: $partKey})
  WHERE coalesce(u.partsEnabled, false)
  SET p.pausedUntil = datetime() + duration({hours: $hours}), p.updatedAt = datetime()
  RETURN p.id AS id
`;

export async function pausePart(tx: ManagedTransaction, uid: string, partId: string, hours: number): Promise<boolean> {
  return (await tx.run(PAUSE_PART_QUERY, { uid, partKey: userKey(uid, partId), hours })).records.length > 0;
}
