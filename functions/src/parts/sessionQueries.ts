/**
 * The query layer behind startPartSession / savePartSession, bound to one write transaction and
 * one user. Every match is through the caller's User (keys are `uid:id`), so another person's
 * session, part, candidate or trail offer can't be found, let alone written.
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { GUARDS } from '../userdata/lifecycle';
import { MERGE_USER, userKey } from '../userdata/ownership';
import type { PartSessionDeps } from './sessions';

export const POLICY_QUERY = `
  OPTIONAL MATCH (p:PartsPolicy {id: 'parts'})
  RETURN p.maxNonSelfAnswers AS maxNonSelfAnswers
`;

export const START_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PART]->(p:Part {key: $partKey})
  OPTIONAL MATCH (u)-[:HAS_PART_CANDIDATE]->(c:PartCandidate {key: $candidateKey})
  OPTIONAL MATCH (u)-[:HAS_PART_SESSION]->(s:PartSession {key: $key})
  OPTIONAL MATCH (u)-[:HAS_TRAIL_OFFER]->(o:TrailOffer {key: $offerKey})
  WHERE o.answer = 'yes' AND o.shape <> 'D'
  RETURN coalesce(u.partsEnabled, false) AS partsOn, p IS NOT NULL AS partFound,
         c IS NOT NULL AS candidateFound, s.status AS status,
         o IS NOT NULL AS offerFound, coalesce(o.moveIds, []) AS offerMoves
`;

/** Create once (MERGE on key); moves are kept only when they are ProtectiveMove ids. */
export const CREATE_QUERY = `
  ${MERGE_USER}
  MERGE (ps:PartSession {key: $key})
  ON CREATE SET ps:UserData:LogRecord, ps.id = $id, ps.ownerId = $uid, ps.createdAt = datetime(),
    ps.schemaVersion = 1, ps.status = 'open', ps.trailheadKind = $trailheadKind,
    ps.partId = $partId, ps.candidateId = $candidateId, ps.offerId = $offerId,
    ps.moveIds = [m IN $moveIds WHERE EXISTS { MATCH (:ProtectiveMove {id: m}) }]
  MERGE (u)-[:HAS_PART_SESSION]->(ps)
  WITH u, ps
  OPTIONAL MATCH (u)-[:HAS_PART]->(p:Part {key: $partKey})
  OPTIONAL MATCH (u)-[:HAS_PART_CANDIDATE]->(c:PartCandidate {key: $candidateKey})
  OPTIONAL MATCH (u)-[:HAS_TRAIL_OFFER]->(o:TrailOffer {key: $offerKey})
  FOREACH (x IN CASE WHEN p IS NULL THEN [] ELSE [p] END | MERGE (ps)-[:OF_PART]->(x))
  FOREACH (x IN CASE WHEN c IS NULL THEN [] ELSE [c] END | MERGE (ps)-[:FROM_CANDIDATE]->(x))
  FOREACH (x IN CASE WHEN o IS NULL THEN [] ELSE [o] END | MERGE (ps)-[:FROM_OFFER]->(x))
`;

export const SAVE_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PART_SESSION]->(ps:PartSession {key: $key})
  RETURN coalesce(u.partsEnabled, false) AS partsOn, ps.status AS status, ps.stepIdsJson AS stepIdsJson
`;

/** The guarded merge: only while open; `final` freezes it. A `null` in $props removes that property. */
export const SAVE_QUERY = `
  MATCH (:User {id: $uid})-[:HAS_PART_SESSION]->(ps:PartSession {key: $key})
  WHERE ${GUARDS.PartSession.save('ps')}
  SET ps += $props, ps.stepIdsJson = $stepIdsJson, ps.updatedAt = datetime(),
      ps.status = CASE WHEN $final THEN 'saved' ELSE ps.status END,
      ps.savedAt = CASE WHEN $final THEN datetime() ELSE ps.savedAt END
  RETURN ps.status AS status
`;

export function sessionDeps(tx: ManagedTransaction, uid: string, email: string | null): PartSessionDeps {
  const keys = (id: string, partId: string | null = null, candidateId: string | null = null, offerId: string | null = null) => ({
    uid, key: userKey(uid, id),
    partKey: partId ? userKey(uid, partId) : null,
    candidateKey: candidateId ? userKey(uid, candidateId) : null,
    offerKey: offerId ? userKey(uid, offerId) : null,
  });
  return {
    async maxNonSelfAnswers() {
      const r = (await tx.run(POLICY_QUERY)).records[0];
      const v = r?.get('maxNonSelfAnswers') as { toNumber?: () => number } | number | null | undefined;
      return v && typeof v === 'object' && v.toNumber ? v.toNumber() : v ?? null;
    },
    async startState(s) {
      const r = (await tx.run(START_STATE_QUERY, keys(s.id, s.partId, s.candidateId, s.offerId))).records[0];
      const has = (k: string) => (r && typeof r.has === 'function' ? r.has(k) : false);
      return {
        partsOn: r?.get('partsOn') === true,
        partFound: r?.get('partFound') === true,
        candidateFound: r?.get('candidateFound') === true,
        offerFound: has('offerFound') && r?.get('offerFound') === true,
        offerMoves: has('offerMoves') ? ((r?.get('offerMoves') as unknown[] | null) ?? []).filter((x): x is string => typeof x === 'string') : [],
        status: (r?.get('status') as string | null | undefined) ?? null,
      };
    },
    async create(s) {
      await tx.run(CREATE_QUERY, {
        ...keys(s.id, s.partId, s.candidateId, s.offerId), email, id: s.id, trailheadKind: s.trailheadKind,
        partId: s.partId, candidateId: s.candidateId, offerId: s.offerId, moveIds: s.moveIds,
      });
    },
    async saveState(id) {
      const r = (await tx.run(SAVE_STATE_QUERY, keys(id))).records[0];
      return {
        partsOn: r?.get('partsOn') === true,
        status: (r?.get('status') as string | null | undefined) ?? null,
        stepIdsJson: (r?.get('stepIdsJson') as string | null | undefined) ?? null,
      };
    },
    async save(id, props, stepIdsJson, final) {
      const r = (await tx.run(SAVE_QUERY, { ...keys(id), props, stepIdsJson, final })).records[0];
      return r ? ((r.get('status') as string | null) ?? null) : null;
    },
  };
}
