/**
 * tagPart (docs/design/parts.md, "Was this a part you know?"): the person's own recognition of a part in
 * a ToolSession. Writes one `:PartTag:UserData:LogRecord` with `(:User)-[:HAS_PART_TAG]->`,
 * `(:PartTag)-[:TAGS]->(:ToolSession)` and `(:PartTag)-[:OF_PART]->(:Part)`. Edges run out of the new tag
 * only: the ToolSession may be finalised and the Part is profile data, so neither is written (keepPart
 * stays the only Part writer). Three sources:
 *
 * - `close` (the default; the tag row after a better close): the ToolSession the caller's, closed, with
 *   then-vs-now better or much better or actedOnUrge 'no' (Pause, Urge Surfing: holding off is their
 *   better close), and not Meet a part. Partly, went ahead, still deciding, same and worse are refused.
 * - `debrief` (DEAR MAN's debrief, "Did {name} show up?" / "Was one of your parts there?"): the
 *   ToolSession the caller's and DEAR MAN's, open or closed, with `strength` 'yes' or 'a_bit'. It says
 *   the part was there, not that a tool helped it settle, so the stats' *helped* never counts it.
 *
 * - `review` (rule D's "Was this {name}?", answered weeks later in a batch in Reflect): through tagPart,
 *   the caller's own closed ToolSession, not Meet a part. Reflect's batch writes its own (offers/review.ts
 *   REVIEW_TAGS_QUERY: any of the trail's evidence records, the same `taggedKey`). The person recognising
 *   the part is the evidence, so no close answer is asked; like a debrief tag, the stats never count it.
 *
 * - `wise_mind` (Wise mind's step back, the parts-aware form): the ToolSession the caller's and Wise
 *   mind's, open or closed. Placing a part in the room is the person's yes; no close answer is asked. It
 *   says the part was there, so, like a debrief tag, the stats never count it. One per session and part
 *   (the person may place several), so its `taggedKey` carries the part.
 *
 * - `cope_ahead` (Cope Ahead's after card, "Used it, it helped"): written by the server inside that
 *   resolve (spine/followUp.ts), never through tagPart, for the part the visit named (ext.ca.partId). The
 *   ToolSession the caller's and Cope Ahead's, with its cope_ahead_after follow-up answered `helped`. The
 *   person used the plan made for that part and it helped, so the stats count it with the close tags for
 *   *helped* (not for *when*: its time is the answer's, not the moment's).
 *
 * All: parts on; the part the caller's and active or resting.
 *
 * One tag per ToolSession per source (per part for `wise_mind`): the state read returns the session's existing tag of that source,
 * and a repeat (any id, any part) returns it and writes nothing. Two calls racing past that read are
 * stopped by the `part_tag_tagged_key` uniqueness constraint on `PartTag.taggedKey`: the session's key for
 * a close tag (as before), `<session key>:debrief` for a debrief tag, so one of each can coexist. The
 * loser's transaction fails, and the callable reads again and returns the winner's tag. A tag id the
 * caller already used (for any session) is answered as a repeat and writes nothing: a finalised tag never
 * takes another outgoing edge.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { ValidationError, obj, uuid } from '../shared/validate';
import { MERGE_USER, userKey } from '../userdata/ownership';
import { partsOff } from './keep';
import { TAG_SOURCES, TAG_STRENGTHS, type TagPartRequest, type TagPartResponse, type TagSource, type TagStrength } from './tagTypes';

/** Then-vs-now answers that count as "it helped" (the what_helps line). */
export const TAG_CLOSES = ['better', 'much_better'] as const;
/** Urge-close answers that count as "it helped": Held off (the urge close's better answer). */
export const TAG_URGE_CLOSES = ['no'] as const;
/** Tools whose close never shows the row (Meet a part is the part itself). */
export const TAG_NEVER_TOOLS = ['meet-a-part', 'two-pulls'] as const;
/** The tools a debrief tag may name: DEAR MAN's debrief only. */
export const TAG_DEBRIEF_TOOLS = ['dear-man'] as const;
/** The tools a wise_mind tag may name: Wise mind's step back only. */
export const TAG_WISE_MIND_TOOLS = ['wise-mind'] as const;
/** The tools a cope_ahead tag may name: Cope Ahead only. */
export const TAG_COPE_AHEAD_TOOLS = ['cope-ahead'] as const;
/** Sources only the server writes (tagPart refuses them). */
export const SERVER_TAG_SOURCES: readonly TagSource[] = ['cope_ahead'];

/**
 * The constraint's key: a close tag keeps the session's key (as before); other sources add theirs, and a
 * wise_mind tag its part too (one per session and part).
 */
export const taggedKeyOf = (sessionKey: string, source: TagSource, partKey?: string): string => {
  if (source === 'close') return sessionKey;
  if (source === 'wise_mind') return `${sessionKey}:wise_mind:${partKey ?? ''}`;
  return `${sessionKey}:${source}`;
};

export function validateTag(raw: unknown): TagPartRequest & { source: TagSource } {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['id', 'partId', 'toolSessionId', 'source', 'strength'].includes(k)) throw new ValidationError(`${k}: not accepted`);
  const source = o.source === undefined ? 'close' : o.source;
  if (!(TAG_SOURCES as readonly unknown[]).includes(source) || SERVER_TAG_SOURCES.includes(source as TagSource)) {
    throw new ValidationError('source: close, debrief, review or wise_mind');
  }
  const base = { id: uuid(o.id), partId: uuid(o.partId), toolSessionId: uuid(o.toolSessionId) };
  if (source === 'close' || source === 'review' || source === 'wise_mind') {
    if (o.strength !== undefined) throw new ValidationError('strength: debrief tags only');
    return { ...base, source };
  }
  if (!(TAG_STRENGTHS as readonly unknown[]).includes(o.strength)) throw new ValidationError('strength: yes or a_bit');
  return { ...base, source: source as TagSource, strength: o.strength as TagStrength };
}

export const TAG_STATE_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  OPTIONAL MATCH (u)-[:HAS_PART]->(pt:Part {key: $partKey})
  OPTIONAL MATCH (u)-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $sessionKey})
  OPTIONAL MATCH (same:PartTag {key: $key})
  OPTIONAL MATCH (u)-[:HAS_PART_TAG]->(prev:PartTag {taggedKey: $taggedKey})-[:TAGS]->(ts)
  WITH u, pt, ts, same, prev ORDER BY prev.createdAt
  RETURN coalesce(u.partsEnabled, false) AS partsOn, pt.status AS partStatus, same IS NOT NULL AS idTaken,
         ts IS NOT NULL AS sessionFound, ts.status AS sessionStatus, ts.thenVsNow AS thenVsNow,
         ts.actedOnUrge AS actedOnUrge, ts.toolId AS toolId,
         collect(prev.id)[0] AS existingId
`;

/** MERGE on key; the ToolSession and the Part are only matched, never set. Each source's own guard. */
export const TAG_QUERY = `
  ${MERGE_USER}
  WITH u
  MATCH (u)-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $sessionKey})
  WHERE coalesce(u.partsEnabled, false) AND NOT EXISTS { MATCH (:PartTag {key: $key}) } AND (
    ($source = 'close' AND ts.status <> 'open'
      AND (ts.thenVsNow IN $closes OR ts.actedOnUrge IN $urgeCloses) AND NOT ts.toolId IN $never)
    OR ($source = 'debrief' AND ts.toolId IN $debriefTools)
    OR ($source = 'wise_mind' AND ts.toolId IN $wiseMindTools)
    OR ($source = 'cope_ahead' AND ts.toolId IN $copeAheadTools
      AND EXISTS { MATCH (f:FollowUp {type: 'cope_ahead_after'})<-[:SCHEDULED]-(ts) WHERE f.planHelped = 'helped' })
    OR ($source = 'review' AND ts.status <> 'open' AND NOT ts.toolId IN $never))
  MATCH (u)-[:HAS_PART]->(pt:Part {key: $partKey}) WHERE pt.status IN ['active', 'resting']
  MERGE (t:PartTag {key: $key})
  ON CREATE SET t:UserData:LogRecord, t.id = $id, t.ownerId = $uid, t.createdAt = datetime(), t.schemaVersion = 1,
    t.at = datetime(), t.source = $source, t.taggedKey = $taggedKey, t.strength = $strength
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
  /** A tag with this id is already the caller's (a repeat, or an id reused for another session). */
  idTaken?: boolean;
}

type TagInput = TagPartRequest & { source: TagSource };

export interface TagDeps {
  state(t: TagInput): Promise<TagState>;
  /** The guarded write; false when the guard stopped it. */
  write(t: TagInput): Promise<boolean>;
}

export async function tagPartHandler(t: TagInput, deps: TagDeps): Promise<TagPartResponse> {
  const st = await deps.state(t);
  if (!st.partsOn) throw partsOff();
  if (!st.sessionFound) throw new HttpsError('not-found', 'Session not found');
  if (st.existingId) return { id: st.existingId, created: false };
  if (st.idTaken) return { id: t.id, created: false };
  if (t.source === 'review') {
    // Rule D's batch review: a closed session of the caller's, any close answer.
    if (st.sessionStatus === 'open') throw new HttpsError('failed-precondition', 'That session is still open');
    if ((TAG_NEVER_TOOLS as readonly (string | null)[]).includes(st.toolId)) throw new HttpsError('failed-precondition', 'Not for this tool');
  } else if (t.source === 'cope_ahead') {
    // Never through tagPart (validateTag refuses it): the after card's resolve writes it itself.
    throw new HttpsError('failed-precondition', 'Not for this tool');
  } else if (t.source === 'wise_mind') {
    // Wise mind's step back: its own session, open or closed; placing the part was the yes.
    if (!(TAG_WISE_MIND_TOOLS as readonly (string | null)[]).includes(st.toolId)) throw new HttpsError('failed-precondition', 'Not for this tool');
  } else if (t.source === 'debrief') {
    // DEAR MAN's debrief: its own session, open or closed; no close answer asked.
    if (!(TAG_DEBRIEF_TOOLS as readonly (string | null)[]).includes(st.toolId)) throw new HttpsError('failed-precondition', 'Not for this tool');
  } else {
    if (st.sessionStatus === 'open') throw new HttpsError('failed-precondition', 'That session is still open');
    const better = (TAG_CLOSES as readonly (string | null)[]).includes(st.thenVsNow)
      || (TAG_URGE_CLOSES as readonly (string | null)[]).includes(st.actedOnUrge);
    if (!better) throw new HttpsError('failed-precondition', 'Only after a better close');
    if ((TAG_NEVER_TOOLS as readonly (string | null)[]).includes(st.toolId)) throw new HttpsError('failed-precondition', 'Not for this tool');
  }
  if (st.partStatus !== 'active' && st.partStatus !== 'resting') throw new HttpsError('not-found', 'Part not found');
  if (!(await deps.write(t))) throw new HttpsError('failed-precondition', 'Could not tag that');
  return { id: t.id, created: true };
}

export function tagDeps(tx: ManagedTransaction, uid: string, email: string | null): TagDeps {
  const params = (t: TagInput) => {
    const sessionKey = userKey(uid, t.toolSessionId);
    const partKey = userKey(uid, t.partId);
    return {
      uid, email, id: t.id, key: userKey(uid, t.id), partKey, sessionKey,
      source: t.source, taggedKey: taggedKeyOf(sessionKey, t.source, partKey), strength: t.strength ?? null,
      closes: [...TAG_CLOSES], urgeCloses: [...TAG_URGE_CLOSES], never: [...TAG_NEVER_TOOLS], debriefTools: [...TAG_DEBRIEF_TOOLS],
      wiseMindTools: [...TAG_WISE_MIND_TOOLS], copeAheadTools: [...TAG_COPE_AHEAD_TOOLS],
    };
  };
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
        idTaken: r?.get('idTaken') === true,
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
