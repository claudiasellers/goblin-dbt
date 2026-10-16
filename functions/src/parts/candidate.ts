/**
 * queuePartCandidate (docs/design/parts.md, "Data model → User data", `PartCandidate`): a part to get
 * to know another time, written only when the person says yes ("Want to get to know that one another
 * time?", the angry card's "Spend a minute with it later?", Problem Solve's ambivalence exit). A log
 * record, idempotent per id. Nothing is written while parts are off, whatever the origin.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { GRAPH_ID, ValidationError, obj, oneOf, uuid } from '../shared/validate';
import { toNumber } from '../shared/values';
import { MERGE_USER, userKey } from '../userdata/ownership';
import { partsOff } from './keep';
import { CANDIDATE_ORIGINS, type CandidateOrigin, type QueuePartCandidateResponse } from './keepTypes';

const MAX_MOVES = 4;

export interface CandidateInput { id: string; origin: CandidateOrigin; moveIds: string[]; sessionId: string | null }

const fail = (m: string): never => { throw new ValidationError(m); };

export function validateCandidate(raw: unknown): CandidateInput {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['id', 'origin', 'moveIds', 'sessionId'].includes(k)) fail(`${k}: not accepted`);
  const moves = o.moveIds ?? [];
  if (!Array.isArray(moves) || moves.length > MAX_MOVES) fail(`moveIds: expected up to ${MAX_MOVES} ids`);
  const moveIds = (moves as unknown[]).map((x) => (typeof x === 'string' && GRAPH_ID.test(x) ? x : fail('moveIds: expected ids')));
  if (new Set(moveIds).size !== moveIds.length) fail('moveIds: duplicate ids');
  return {
    id: uuid(o.id),
    origin: oneOf(o.origin, CANDIDATE_ORIGINS),
    moveIds,
    sessionId: o.sessionId === undefined || o.sessionId === null ? null : uuid(o.sessionId),
  };
}

export const CANDIDATE_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PART_SESSION]->(ps:PartSession {key: $sessionKey})
  OPTIONAL MATCH (m:ProtectiveMove) WHERE m.id IN $moveIds
  RETURN coalesce(u.partsEnabled, false) AS partsOn, ps IS NOT NULL AS sessionFound, count(DISTINCT m) AS knownMoves
`;

export const CANDIDATE_QUERY = `
  ${MERGE_USER}
  MERGE (c:PartCandidate {key: $key})
  ON CREATE SET c:UserData:LogRecord, c.id = $id, c.ownerId = $uid, c.createdAt = datetime(), c.schemaVersion = 1,
    c.origin = $origin, c.moveIds = $moveIds, c.status = 'open'
  MERGE (u)-[:HAS_PART_CANDIDATE]->(c)
  WITH u, c
  OPTIONAL MATCH (u)-[:HAS_PART_SESSION]->(ps:PartSession {key: $sessionKey})
  FOREACH (x IN CASE WHEN ps IS NULL THEN [] ELSE [ps] END | MERGE (x)-[:QUEUED]->(c))
  RETURN c.id AS id
`;

export interface CandidateDeps {
  state(c: CandidateInput): Promise<{ partsOn: boolean; sessionFound: boolean; knownMoves: number }>;
  write(c: CandidateInput): Promise<void>;
}

export async function queuePartCandidateHandler(c: CandidateInput, deps: CandidateDeps): Promise<QueuePartCandidateResponse> {
  const st = await deps.state(c);
  if (!st.partsOn) throw partsOff();
  if (st.knownMoves !== c.moveIds.length) throw new HttpsError('invalid-argument', 'Unknown move');
  if (c.sessionId && !st.sessionFound) throw new HttpsError('not-found', 'Session not found');
  await deps.write(c);
  return { id: c.id };
}

export function candidateDeps(tx: ManagedTransaction, uid: string, email: string | null): CandidateDeps {
  const params = (c: CandidateInput) => ({
    uid, email, key: userKey(uid, c.id), id: c.id, origin: c.origin, moveIds: c.moveIds,
    sessionKey: c.sessionId ? userKey(uid, c.sessionId) : null,
  });
  return {
    async state(c) {
      const r = (await tx.run(CANDIDATE_STATE_QUERY, params(c))).records[0];
      return {
        partsOn: r?.get('partsOn') === true,
        sessionFound: r?.get('sessionFound') === true,
        knownMoves: toNumber(r?.get('knownMoves')) ?? 0,
      };
    },
    async write(c) {
      await tx.run(CANDIDATE_QUERY, params(c));
    },
  };
}
