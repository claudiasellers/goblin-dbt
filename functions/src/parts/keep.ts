/**
 * Every writer of a kept part (docs/design/parts.md: "`keepPart` is the only writer"; rule 4 of
 * Five decisions). A `Part` is profile data, so it is written only on the person's yes, and only
 * here: tests/parts-entry.test.mjs fails if any other file under functions/src MERGEs, CREATEs or
 * SETs a `:Part` (deleteMyParts may only DETACH DELETE). Later part-card writers (rename, rest,
 * tender, set aside, restore) join this file as more `*_QUERY` constants and handlers of the same
 * shape: a state read (parts on, the caller's own part), then one guarded write.
 *
 * keepPart (9b's yes) builds the part from the stored PartSession, never from client fields.
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
import type { KeepPartResponse } from './keepTypes';

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
         CASE WHEN ps IS NULL THEN null ELSE ps {.trailheadKind, .partId, .candidateId, .moveIds, .stepIdsJson,
           .stopReason, .bodyPlaces, .shapeSig, .soundSig, .ownVoice, .ownJob, .ownFear,
           keepable: ${GUARDS.PartSession.keep('ps')}} END AS session,
         CASE WHEN p IS NULL THEN null ELSE p {.tender, .places, .shapeSig, .soundSig, .ageId, .voiceIds, .jobIds,
           .fearIds, .preferredRoleIds, .ownVoice, .ownJob, .ownFear} END AS part,
         linked.id AS linkedPartId, pol.nameMaxChars AS nameMaxChars, k.revisitAfterDays AS revisitAfterDays
`;

/** The profile edges a keep adds (never removes): moves, guarded hurts, the candidate it answers. */
const KEEP_EDGES = `
  WITH u, p
  OPTIONAL MATCH (m:ProtectiveMove) WHERE m.id IN $moveIds
  WITH u, p, collect(m) AS moves
  OPTIONAL MATCH (h:ProtectedHurt) WHERE h.id IN $guardIds
  WITH u, p, moves, collect(h) AS hurts
  OPTIONAL MATCH (u)-[:HAS_PART_CANDIDATE]->(c:PartCandidate {key: $candidateKey})
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
    sessionId: input.sessionId, partId: input.partId, candidateId: st.session.candidateId,
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
          trailheadKind: str(s.trailheadKind), partId: str(s.partId), candidateId: str(s.candidateId),
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
