/**
 * sayToPart: something the person says to one of their kept parts, between visits (Parts of me, *Say
 * something to it*) or after Thanks in Meet a part. IFS works through the relationship with each part;
 * this is the smallest piece of it. Writes one `:PartMessage:UserData:LogRecord` with
 * `(:User)-[:HAS_PART_MESSAGE]->` and `(:PartMessage)-[:TO_PART]->(:Part)`. The edge runs out of the new
 * message only: the Part is profile data and is never written here (keepPart stays the only Part writer).
 *
 * What it holds: `chipId` (a PartOption of flow `say`; a tender part takes the gentle set, step
 * `say_tender`) or `own` (their own words, ≤ SAY_OWN_MAX, kept as written, never linted), and `at`.
 * Finalise-once: created whole on the first call; the same id again returns it and writes nothing.
 * Parts on; the part the caller's and active or resting.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { GRAPH_ID, ValidationError, obj, uuid } from '../shared/validate';
import { MERGE_USER, userKey } from '../userdata/ownership';
import { partsOff } from './keep';
import { SAY_OWN_MAX, type SayToPartResponse } from './sayTypes';

/** The steps of flow `say` whose chips a message may name: the gentle set for a tender part. */
export const SAY_STEPS = { usual: 'say', tender: 'say_tender' } as const;

export interface SayInput { id: string; partId: string; chipId: string | null; own: string | null }

export function validateSay(raw: unknown): SayInput {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['id', 'partId', 'chipId', 'own'].includes(k)) throw new ValidationError(`${k}: not accepted`);
  const hasChip = o.chipId !== undefined && o.chipId !== null;
  const hasOwn = o.own !== undefined && o.own !== null;
  if (hasChip === hasOwn) throw new ValidationError('expected exactly one of chipId or own');
  let chipId: string | null = null;
  let own: string | null = null;
  if (hasChip) {
    if (typeof o.chipId !== 'string' || !GRAPH_ID.test(o.chipId)) throw new ValidationError('chipId: expected an id');
    chipId = o.chipId;
  } else {
    if (typeof o.own !== 'string') throw new ValidationError('own: expected text');
    // Kept as written: line breaks fold to a space and control characters go, nothing else is touched.
    // eslint-disable-next-line no-control-regex
    own = o.own.replace(/[\r\n\t]+/g, ' ').replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim();
    if (!own || own.length > SAY_OWN_MAX) throw new ValidationError(`own: 1 to ${SAY_OWN_MAX} characters`);
  }
  return { id: uuid(o.id), partId: uuid(o.partId), chipId, own };
}

export const SAY_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PART]->(pt:Part {key: $partKey})
  OPTIONAL MATCH (same:PartMessage {key: $key})
  OPTIONAL MATCH (o:PartOption {id: $chipId}) WHERE o.flow = 'say'
  RETURN coalesce(u.partsEnabled, false) AS partsOn, pt.status AS partStatus, coalesce(pt.tender, false) AS tender,
         same IS NOT NULL AS repeat, o.step AS chipStep
`;

/** MERGE on key, created whole once; the Part is only matched. The guard repeats the state's checks. */
export const SAY_QUERY = `
  ${MERGE_USER}
  WITH u
  MATCH (u)-[:HAS_PART]->(pt:Part {key: $partKey})
  WHERE coalesce(u.partsEnabled, false) AND pt.status IN ['active', 'resting']
    AND NOT EXISTS { MATCH (:PartMessage {key: $key}) }
  MERGE (m:PartMessage {key: $key})
  ON CREATE SET m:UserData:LogRecord, m.id = $id, m.ownerId = $uid, m.createdAt = datetime(), m.schemaVersion = 1, m.at = datetime(), m.chipId = $chipId, m.own = $own
  MERGE (u)-[:HAS_PART_MESSAGE]->(m)
  MERGE (m)-[:TO_PART]->(pt)
  RETURN m.id AS id
`;

export interface SayState {
  partsOn: boolean;
  partStatus: string | null;
  tender: boolean;
  /** This id is already the caller's message (keys carry the owner): a repeat. */
  repeat: boolean;
  /** The chip's step in flow `say`, or null when it isn't one. */
  chipStep: string | null;
}

export interface SayDeps {
  state(s: SayInput): Promise<SayState>;
  /** The guarded write; false when the guard stopped it. */
  write(s: SayInput): Promise<boolean>;
}

export async function sayToPartHandler(s: SayInput, deps: SayDeps): Promise<SayToPartResponse> {
  const st = await deps.state(s);
  if (!st.partsOn) throw partsOff();
  if (st.repeat) return { id: s.id, created: false };
  if (st.partStatus !== 'active' && st.partStatus !== 'resting') throw new HttpsError('not-found', 'Part not found');
  if (s.chipId !== null && st.chipStep !== (st.tender ? SAY_STEPS.tender : SAY_STEPS.usual)) {
    throw new HttpsError('invalid-argument', 'Not one of its chips');
  }
  if (!(await deps.write(s))) throw new HttpsError('failed-precondition', 'Could not save that');
  return { id: s.id, created: true };
}

export function sayDeps(tx: ManagedTransaction, uid: string, email: string | null): SayDeps {
  const params = (s: SayInput) => ({
    uid, email, id: s.id, key: userKey(uid, s.id), partKey: userKey(uid, s.partId), chipId: s.chipId, own: s.own,
  });
  return {
    async state(s) {
      const r = (await tx.run(SAY_STATE_QUERY, params(s))).records[0];
      const str = (v: unknown) => (typeof v === 'string' ? v : null);
      return {
        partsOn: r?.get('partsOn') === true,
        partStatus: str(r?.get('partStatus')),
        tender: r?.get('tender') === true,
        repeat: r?.get('repeat') === true,
        chipStep: str(r?.get('chipStep')),
      };
    },
    async write(s) {
      return (await tx.run(SAY_QUERY, params(s))).records.length > 0;
    },
  };
}

/** The latest message to each of the caller's parts (Me's card): one read, newest first per part. */
export const LATEST_MESSAGES_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART_MESSAGE]->(m:PartMessage)-[:TO_PART]->(pt:Part)
  WHERE coalesce(u.partsEnabled, false) AND (u)-[:HAS_PART]->(pt)
  WITH pt, m ORDER BY m.at DESC
  WITH pt, collect(m)[0] AS m
  RETURN pt.id AS partId, m.chipId AS chipId, m.own AS own, toString(m.at) AS at
`;

/** One part's messages, oldest first (its story keeps the latest of each month). */
export const PART_MESSAGES_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART_MESSAGE]->(m:PartMessage)-[:TO_PART]->(pt:Part {key: $partKey})
  WHERE coalesce(u.partsEnabled, false) AND (u)-[:HAS_PART]->(pt)
  RETURN m.chipId AS chipId, m.own AS own, toString(m.at) AS at
  ORDER BY m.at LIMIT 400
`;
