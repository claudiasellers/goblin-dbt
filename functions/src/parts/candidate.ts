/**
 * queuePartCandidate (docs/design/parts.md, "Data model → User data", `PartCandidate`): a part to get
 * to know another time, written only when the person says yes ("Want to get to know that one another
 * time?", the angry card's "Spend a minute with it later?", Problem Solve's ambivalence exit). A log
 * record, idempotent per id. Nothing is written while parts are off, whatever the origin.
 *
 * With `toolSessionId` (the tag row's "A new one", on its later question's yes): the caller's own,
 * closed ToolSession. The ids it and its DETAIL session recorded (sessionMoves.ts: urge ids, Find the
 * feeling's and Recover's pull, DEAR MAN's debrief and barrier ids, Problem Solve's barrier) give the
 * moves through approved EXPRESSES edges, read in the same state query; the union with the client's
 * ids is capped at 4. The candidate links to it with FROM_SESSION, an edge out
 * of the new record (incoming to the finalised ToolSession, never out of it). `QUEUED` comes out of the
 * Meet a part session, so only while that session takes writes (GUARDS.PartSession.keep). A candidate id
 * the caller already used is a repeat: it writes nothing (an answered candidate takes no new edge).
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { GRAPH_ID, ValidationError, obj, oneOf, uuid } from '../shared/validate';
import { toNumber } from '../shared/values';
import { GUARDS } from '../userdata/lifecycle';
import { MERGE_USER, userKey } from '../userdata/ownership';
import { partsOff } from './keep';
import { sessionSourceMatch } from './sessionMoves';
import { CANDIDATE_ORIGINS, type CandidateOrigin, type QueuePartCandidateResponse } from './keepTypes';

const MAX_MOVES = 4;

export interface CandidateInput { id: string; origin: CandidateOrigin; moveIds: string[]; sessionId: string | null; toolSessionId?: string }

const fail = (m: string): never => { throw new ValidationError(m); };

export function validateCandidate(raw: unknown): CandidateInput {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['id', 'origin', 'moveIds', 'sessionId', 'toolSessionId'].includes(k)) fail(`${k}: not accepted`);
  const moves = o.moveIds ?? [];
  if (!Array.isArray(moves) || moves.length > MAX_MOVES) fail(`moveIds: expected up to ${MAX_MOVES} ids`);
  const moveIds = (moves as unknown[]).map((x) => (typeof x === 'string' && GRAPH_ID.test(x) ? x : fail('moveIds: expected ids')));
  if (new Set(moveIds).size !== moveIds.length) fail('moveIds: duplicate ids');
  return {
    id: uuid(o.id),
    origin: oneOf(o.origin, CANDIDATE_ORIGINS),
    moveIds,
    sessionId: o.sessionId === undefined || o.sessionId === null ? null : uuid(o.sessionId),
    ...(o.toolSessionId === undefined || o.toolSessionId === null ? {} : { toolSessionId: uuid(o.toolSessionId) }),
  };
}

export const CANDIDATE_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PART_SESSION]->(ps:PartSession {key: $sessionKey})
  OPTIONAL MATCH (u)-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $toolSessionKey})
  OPTIONAL MATCH (same:PartCandidate {key: $key})
  OPTIONAL MATCH (m:ProtectiveMove) WHERE m.id IN $moveIds
  WITH u, ps, ts, same, count(DISTINCT m) AS knownMoves
  OPTIONAL MATCH (ts)-[:DETAIL]->(d) WHERE d.ownerId = $uid
  OPTIONAL MATCH (src)-[x:EXPRESSES]->(dm:ProtectiveMove)
    WHERE ts IS NOT NULL AND x.reviewStatus = 'approved'
      AND (${sessionSourceMatch('src', 'ts', 'd')})
  RETURN coalesce(u.partsEnabled, false) AS partsOn, same IS NOT NULL AS idTaken, ps IS NOT NULL AS sessionFound, knownMoves,
         ts IS NOT NULL AS toolSessionFound, ts.status AS toolSessionStatus, collect(DISTINCT dm.id) AS derivedMoves
`;

export const CANDIDATE_QUERY = `
  ${MERGE_USER}
  WITH u WHERE NOT EXISTS { MATCH (:PartCandidate {key: $key}) }
  MERGE (c:PartCandidate {key: $key})
  ON CREATE SET c:UserData:LogRecord, c.id = $id, c.ownerId = $uid, c.createdAt = datetime(), c.schemaVersion = 1,
    c.origin = $origin, c.moveIds = $moveIds, c.status = 'open'
  MERGE (u)-[:HAS_PART_CANDIDATE]->(c)
  WITH u, c
  OPTIONAL MATCH (u)-[:HAS_PART_SESSION]->(ps:PartSession {key: $sessionKey}) WHERE ${GUARDS.PartSession.keep('ps')}
  FOREACH (x IN CASE WHEN ps IS NULL THEN [] ELSE [ps] END | MERGE (x)-[:QUEUED]->(c))
  WITH u, c
  OPTIONAL MATCH (u)-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $toolSessionKey})
  FOREACH (x IN CASE WHEN ts IS NULL THEN [] ELSE [ts] END | MERGE (c)-[:FROM_SESSION]->(x))
  RETURN c.id AS id
`;

export interface CandidateState {
  partsOn: boolean;
  /** A candidate with this id is already the caller's: a repeat, answered without a write. */
  idTaken?: boolean;
  sessionFound: boolean;
  knownMoves: number;
  /** Only read when the input names a toolSessionId (absent in an older fake: not found). */
  toolSessionFound?: boolean;
  toolSessionStatus?: string | null;
  /** The moves the tool session's urge / pull ids express (approved edges only). */
  derivedMoves?: string[];
}

export interface CandidateDeps {
  state(c: CandidateInput): Promise<CandidateState>;
  write(c: CandidateInput): Promise<void>;
}

/** The client's ids first, then the session's (sorted), each once, at most 4. */
export function candidateMoves(client: readonly string[], derived: readonly string[] = []): string[] {
  return [...new Set([...client, ...[...derived].sort()])].slice(0, MAX_MOVES);
}

export async function queuePartCandidateHandler(c: CandidateInput, deps: CandidateDeps): Promise<QueuePartCandidateResponse> {
  const st = await deps.state(c);
  if (!st.partsOn) throw partsOff();
  if (st.idTaken) return { id: c.id };
  if (st.knownMoves !== c.moveIds.length) throw new HttpsError('invalid-argument', 'Unknown move');
  if (c.sessionId && !st.sessionFound) throw new HttpsError('not-found', 'Session not found');
  if (c.toolSessionId) {
    if (!st.toolSessionFound) throw new HttpsError('not-found', 'Session not found');
    if (st.toolSessionStatus === 'open') throw new HttpsError('failed-precondition', 'That session is still open');
    await deps.write({ ...c, moveIds: candidateMoves(c.moveIds, st.derivedMoves) });
    return { id: c.id };
  }
  await deps.write(c);
  return { id: c.id };
}

export function candidateDeps(tx: ManagedTransaction, uid: string, email: string | null): CandidateDeps {
  const params = (c: CandidateInput) => ({
    uid, email, key: userKey(uid, c.id), id: c.id, origin: c.origin, moveIds: c.moveIds,
    sessionKey: c.sessionId ? userKey(uid, c.sessionId) : null,
    toolSessionKey: c.toolSessionId ? userKey(uid, c.toolSessionId) : null,
  });
  return {
    async state(c) {
      const r = (await tx.run(CANDIDATE_STATE_QUERY, params(c))).records[0];
      return {
        partsOn: r?.get('partsOn') === true,
        idTaken: r?.get('idTaken') === true,
        sessionFound: r?.get('sessionFound') === true,
        knownMoves: toNumber(r?.get('knownMoves')) ?? 0,
        // Read only when asked about a tool session.
        ...(c.toolSessionId ? {
          toolSessionFound: r?.get('toolSessionFound') === true,
          toolSessionStatus: (r?.get('toolSessionStatus') as string | null | undefined) ?? null,
          derivedMoves: ((r?.get('derivedMoves') as unknown[] | null | undefined) ?? []).filter((x): x is string => typeof x === 'string'),
        } : {}),
      };
    },
    async write(c) {
      await tx.run(CANDIDATE_QUERY, params(c));
    },
  };
}
