/**
 * startPullsSession / savePullsSession (docs/design/parts.md, "Two pulls"): a `PullsSession` log record
 * per visit, finalise-once (GUARDS.PullsSession.save), as Meet a part's PartSession is. Handlers over an
 * injected query layer bound to one write transaction (plain functions in tests).
 *
 * The checks run before any write: parts must be on; two parts must both be the caller's own, kept
 * (active or resting), each using its side's move; a pair must exist with its sides in order; a trail
 * offer must be the caller's own rule C offer answered More than one, for that pair. The ask-fresh fields
 * (feelTowardIds, blendCheck) are stored here only, never on a part.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { GUARDS } from '../../userdata/lifecycle';
import { MERGE_USER, userKey } from '../../userdata/ownership';
import { partsOff } from '../keep';
import { validateSavePulls, type PullsProps, type PullsStartInput } from './validation';
import type { PullsSessionResponse } from './types';

export interface PullsStartState {
  partsOn: boolean;
  aFound: boolean;
  bFound: boolean;
  /** The moves each part USES. */
  aMoves: string[];
  bMoves: string[];
  /** The pair's sides, when `pairId` names one. */
  pair: { a: string; b: string } | null;
  /** The caller's own rule C offer, answered More than one, and the pair it was about. */
  offerFound: boolean;
  offerPairId: string | null;
  status: string | null;
}

export interface PullsSessionDeps {
  startState(s: PullsStartInput): Promise<PullsStartState>;
  create(s: PullsStartInput): Promise<void>;
  saveState(id: string): Promise<{ partsOn: boolean; status: string | null }>;
  /** The guarded write; the status after it, or null when the guard refused. */
  save(id: string, props: PullsProps, final: boolean): Promise<string | null>;
}

const frozen = () => new HttpsError('failed-precondition', 'This session is already saved');
const notFound = () => new HttpsError('not-found', 'Not found');

export async function startPullsSessionHandler(s: PullsStartInput, deps: PullsSessionDeps): Promise<PullsSessionResponse> {
  const st = await deps.startState(s);
  if (!st.partsOn) throw partsOff();
  if (s.aId && (!st.aFound || !st.bFound)) throw notFound();
  if (s.pairId && !st.pair) throw notFound();
  if (s.offerId && (!st.offerFound || st.offerPairId !== s.pairId)) throw notFound();
  // Each side's move is its part's own (or the pair's side, in order).
  if (s.aId && (!st.aMoves.includes(s.moveA) || !st.bMoves.includes(s.moveB))) throw new HttpsError('invalid-argument', 'Not that part\'s move');
  if (st.pair && (st.pair.a !== s.moveA || st.pair.b !== s.moveB)) throw new HttpsError('invalid-argument', 'Not that pair\'s sides');
  if (st.status === 'open') return { id: s.id, status: 'open' };
  if (st.status) throw frozen();
  await deps.create(s);
  return { id: s.id, status: 'open' };
}

export async function savePullsSessionHandler(raw: unknown, deps: PullsSessionDeps): Promise<PullsSessionResponse> {
  const input = validateSavePulls(raw);
  const st = await deps.saveState(input.id);
  if (!st.partsOn) throw partsOff();
  if (!st.status) throw new HttpsError('not-found', 'Session not found');
  if (st.status !== 'open') throw frozen();
  const status = await deps.save(input.id, input.props, input.final);
  if (status === null) throw frozen();
  return { id: input.id, status: status === 'saved' ? 'saved' : 'open' };
}

const kept = (v: string) => `${v}.status IN ['active', 'resting']`;

export const PULLS_START_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PART]->(pa:Part {key: $aKey}) WHERE ${kept('pa')}
  OPTIONAL MATCH (u)-[:HAS_PART]->(pb:Part {key: $bKey}) WHERE ${kept('pb')}
  OPTIONAL MATCH (pair:PolarityPair {id: $pairId})
  OPTIONAL MATCH (u)-[:HAS_PULLS_SESSION]->(s:PullsSession {key: $key})
  OPTIONAL MATCH (u)-[:HAS_TRAIL_OFFER]->(o:TrailOffer {key: $offerKey}) WHERE o.shape = 'C' AND o.answer = 'more_than_one'
  RETURN coalesce(u.partsEnabled, false) AS partsOn, pa IS NOT NULL AS aFound, pb IS NOT NULL AS bFound,
         CASE WHEN pa IS NULL THEN [] ELSE [(pa)-[:USES]->(m:ProtectiveMove) | m.id] END AS aMoves,
         CASE WHEN pb IS NULL THEN [] ELSE [(pb)-[:USES]->(m:ProtectiveMove) | m.id] END AS bMoves,
         pair.a AS pairA, pair.b AS pairB, s.status AS status, o IS NOT NULL AS offerFound, o.pairId AS offerPairId
`;

/** Create once (MERGE on key), linked to its parts (OF_PART {side}), its pair and its offer. */
export const PULLS_CREATE_QUERY = `
  ${MERGE_USER}
  MERGE (ps:PullsSession {key: $key})
  ON CREATE SET ps:UserData:LogRecord, ps.id = $id, ps.ownerId = $uid, ps.createdAt = datetime(), ps.schemaVersion = 1,
    ps.status = 'open', ps.entry = $entry, ps.aId = $aId, ps.bId = $bId, ps.pairId = $pairId, ps.offerId = $offerId,
    ps.moveA = $moveA, ps.moveB = $moveB
  MERGE (u)-[:HAS_PULLS_SESSION]->(ps)
  WITH u, ps
  OPTIONAL MATCH (u)-[:HAS_PART]->(pa:Part {key: $aKey})
  OPTIONAL MATCH (u)-[:HAS_PART]->(pb:Part {key: $bKey})
  OPTIONAL MATCH (pair:PolarityPair {id: $pairId})
  OPTIONAL MATCH (u)-[:HAS_TRAIL_OFFER]->(o:TrailOffer {key: $offerKey})
  FOREACH (x IN CASE WHEN pa IS NULL THEN [] ELSE [pa] END | MERGE (ps)-[r:OF_PART]->(x) SET r.side = 'a')
  FOREACH (x IN CASE WHEN pb IS NULL THEN [] ELSE [pb] END | MERGE (ps)-[r:OF_PART]->(x) SET r.side = 'b')
  FOREACH (x IN CASE WHEN pair IS NULL THEN [] ELSE [pair] END | MERGE (ps)-[:ABOUT_PAIR]->(x))
  FOREACH (x IN CASE WHEN o IS NULL THEN [] ELSE [o] END | MERGE (ps)-[:FROM_OFFER]->(x))
`;

export const PULLS_SAVE_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PULLS_SESSION]->(ps:PullsSession {key: $key})
  RETURN coalesce(u.partsEnabled, false) AS partsOn, ps.status AS status
`;

/** The guarded merge: only while open; `final` freezes it. A `null` in $props removes that property. */
export const PULLS_SAVE_QUERY = `
  MATCH (:User {id: $uid})-[:HAS_PULLS_SESSION]->(ps:PullsSession {key: $key})
  WHERE ${GUARDS.PullsSession.save('ps')}
  SET ps += $props, ps.updatedAt = datetime(),
      ps.status = CASE WHEN $final THEN 'saved' ELSE ps.status END,
      ps.savedAt = CASE WHEN $final THEN datetime() ELSE ps.savedAt END
  RETURN ps.status AS status
`;

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function pullsSessionDeps(tx: ManagedTransaction, uid: string, email: string | null): PullsSessionDeps {
  const keys = (s: Pick<PullsStartInput, 'id'> & Partial<PullsStartInput>) => ({
    uid, key: userKey(uid, s.id),
    aKey: s.aId ? userKey(uid, s.aId) : null,
    bKey: s.bId ? userKey(uid, s.bId) : null,
    offerKey: s.offerId ? userKey(uid, s.offerId) : null,
    pairId: s.pairId ?? null,
  });
  return {
    async startState(s) {
      const r = (await tx.run(PULLS_START_STATE_QUERY, keys(s))).records[0];
      const a = str(r?.get('pairA'));
      const b = str(r?.get('pairB'));
      return {
        partsOn: r?.get('partsOn') === true,
        aFound: r?.get('aFound') === true,
        bFound: r?.get('bFound') === true,
        aMoves: strs(r?.get('aMoves')),
        bMoves: strs(r?.get('bMoves')),
        pair: a && b ? { a, b } : null,
        offerFound: r?.get('offerFound') === true,
        offerPairId: str(r?.get('offerPairId')),
        status: str(r?.get('status')),
      };
    },
    async create(s) {
      await tx.run(PULLS_CREATE_QUERY, {
        ...keys(s), email, id: s.id, entry: s.aId ? 'parts' : 'pair', aId: s.aId, bId: s.bId, offerId: s.offerId,
        moveA: s.moveA, moveB: s.moveB,
      });
    },
    async saveState(id) {
      const r = (await tx.run(PULLS_SAVE_STATE_QUERY, keys({ id }))).records[0];
      return { partsOn: r?.get('partsOn') === true, status: str(r?.get('status')) };
    },
    async save(id, props, final) {
      const r = (await tx.run(PULLS_SAVE_QUERY, { ...keys({ id }), props, final })).records[0];
      return r ? str(r.get('status')) : null;
    },
  };
}
