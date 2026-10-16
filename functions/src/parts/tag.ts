/**
 * tagPart (docs/design/parts.md, "Was this a part you know?"): the person's own recognition, after a
 * better close: then-vs-now better or much better, or an urge close answered Held off (Pause, Urge
 * Surfing: holding off is their better close). Writes one `:PartTag:UserData:LogRecord` (source 'close') with
 * `(:User)-[:HAS_PART_TAG]->`, `(:PartTag)-[:TAGS]->(:ToolSession)` and `(:PartTag)-[:OF_PART]->(:Part)`.
 * Edges run out of the new tag only: the ToolSession is finalised and the Part is profile data, so
 * neither is written (keepPart stays the only Part writer).
 *
 * The server enforces what the row's gate does: parts on; the part the caller's and active or resting;
 * the ToolSession the caller's, closed, with then-vs-now better or much better or actedOnUrge 'no',
 * and not Meet a part. Partly, went ahead, still deciding, same and worse are all refused.
 *
 * One tag per ToolSession: the state read returns the session's existing tag, and a call for a
 * session already tagged (any id, any part) returns that first tag and writes nothing. Two calls
 * racing past that read are stopped by the `part_tag_tagged_key` uniqueness constraint on
 * `PartTag.taggedKey` (the tagged record's key): the loser's transaction fails, and the callable reads
 * again and returns the winner's tag.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { ValidationError, obj, uuid } from '../shared/validate';
import { MERGE_USER, userKey } from '../userdata/ownership';
import { partsOff } from './keep';
import type { TagPartRequest, TagPartResponse } from './tagTypes';

/** Then-vs-now answers that count as "it helped" (the what_helps line). */
export const TAG_CLOSES = ['better', 'much_better'] as const;
/** Urge-close answers that count as "it helped": Held off (the urge close's better answer). */
export const TAG_URGE_CLOSES = ['no'] as const;
/** Tools whose close never shows the row (Meet a part is the part itself). */
export const TAG_NEVER_TOOLS = ['meet-a-part'] as const;

export function validateTag(raw: unknown): TagPartRequest {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['id', 'partId', 'toolSessionId'].includes(k)) throw new ValidationError(`${k}: not accepted`);
  return { id: uuid(o.id), partId: uuid(o.partId), toolSessionId: uuid(o.toolSessionId) };
}

export const TAG_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PART]->(pt:Part {key: $partKey})
  OPTIONAL MATCH (u)-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $sessionKey})
  OPTIONAL MATCH (u)-[:HAS_PART_TAG]->(prev:PartTag)-[:TAGS]->(ts)
  WITH u, pt, ts, prev ORDER BY prev.createdAt
  RETURN coalesce(u.partsEnabled, false) AS partsOn, pt.status AS partStatus,
         ts IS NOT NULL AS sessionFound, ts.status AS sessionStatus, ts.thenVsNow AS thenVsNow,
         ts.actedOnUrge AS actedOnUrge, ts.toolId AS toolId,
         collect(prev.id)[0] AS existingId
`;

/** MERGE on key; the ToolSession and the Part are only matched, never set. */
export const TAG_QUERY = `
  ${MERGE_USER}
  WITH u
  MATCH (u)-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $sessionKey})
  WHERE coalesce(u.partsEnabled, false) AND ts.status <> 'open'
    AND (ts.thenVsNow IN $closes OR ts.actedOnUrge IN $urgeCloses) AND NOT ts.toolId IN $never
  MATCH (u)-[:HAS_PART]->(pt:Part {key: $partKey}) WHERE pt.status IN ['active', 'resting']
  MERGE (t:PartTag {key: $key})
  ON CREATE SET t:UserData:LogRecord, t.id = $id, t.ownerId = $uid, t.createdAt = datetime(), t.schemaVersion = 1,
    t.at = datetime(), t.source = 'close', t.taggedKey = $sessionKey
  MERGE (u)-[:HAS_PART_TAG]->(t)
  MERGE (t)-[:TAGS]->(ts)
  MERGE (t)-[:OF_PART]->(pt)
  RETURN t.id AS id
`;

export interface TagState {
  partsOn: boolean;
  partStatus: string | null;
  sessionFound: boolean;
  sessionStatus: string | null;
  thenVsNow: string | null;
  actedOnUrge: string | null;
  toolId: string | null;
  /** The session's tag, if it has one already. */
  existingId: string | null;
}

export interface TagDeps {
  state(t: TagPartRequest): Promise<TagState>;
  /** The guarded write; false when the guard stopped it. */
  write(t: TagPartRequest): Promise<boolean>;
}

export async function tagPartHandler(t: TagPartRequest, deps: TagDeps): Promise<TagPartResponse> {
  const st = await deps.state(t);
  if (!st.partsOn) throw partsOff();
  if (!st.sessionFound) throw new HttpsError('not-found', 'Session not found');
  if (st.existingId) return { id: st.existingId, created: false };
  if (st.sessionStatus === 'open') throw new HttpsError('failed-precondition', 'That session is still open');
  const better = (TAG_CLOSES as readonly (string | null)[]).includes(st.thenVsNow)
    || (TAG_URGE_CLOSES as readonly (string | null)[]).includes(st.actedOnUrge);
  if (!better) throw new HttpsError('failed-precondition', 'Only after a better close');
  if ((TAG_NEVER_TOOLS as readonly (string | null)[]).includes(st.toolId)) throw new HttpsError('failed-precondition', 'Not for this tool');
  if (st.partStatus !== 'active' && st.partStatus !== 'resting') throw new HttpsError('not-found', 'Part not found');
  if (!(await deps.write(t))) throw new HttpsError('failed-precondition', 'Could not tag that');
  return { id: t.id, created: true };
}

export function tagDeps(tx: ManagedTransaction, uid: string, email: string | null): TagDeps {
  const params = (t: TagPartRequest) => ({
    uid, email, id: t.id, key: userKey(uid, t.id), partKey: userKey(uid, t.partId), sessionKey: userKey(uid, t.toolSessionId),
    closes: [...TAG_CLOSES], urgeCloses: [...TAG_URGE_CLOSES], never: [...TAG_NEVER_TOOLS],
  });
  const s = (v: unknown) => (typeof v === 'string' ? v : null);
  return {
    async state(t) {
      const r = (await tx.run(TAG_STATE_QUERY, params(t))).records[0];
      return {
        partsOn: r?.get('partsOn') === true,
        partStatus: s(r?.get('partStatus')),
        sessionFound: r?.get('sessionFound') === true,
        sessionStatus: s(r?.get('sessionStatus')),
        thenVsNow: s(r?.get('thenVsNow')),
        actedOnUrge: s(r?.get('actedOnUrge')),
        toolId: s(r?.get('toolId')),
        existingId: s(r?.get('existingId')),
      };
    },
    async write(t) {
      return (await tx.run(TAG_QUERY, params(t))).records.length > 0;
    },
  };
}

/** A second tag for one session raced past the read: the constraint stopped it. */
export const isTaggedTwice = (e: unknown): boolean => {
  const code = (e as { code?: unknown } | null)?.code;
  const msg = String((e as { message?: unknown } | null)?.message ?? '');
  return code === 'Neo.ClientError.Schema.ConstraintValidationFailed' && /taggedKey/.test(msg);
};
