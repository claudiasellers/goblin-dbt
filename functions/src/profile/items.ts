/**
 * Profile item writes (PR-P1; the kind registry, docs/design/user-profile.md §4.2): by the person, from
 * the Me surface, a tool's "still true?", or a tool's *Keep this* (the runtime's keep step calls
 * keepProfileItem). Every write bumps User.profileVersion (the client cache key). Scheduled code must
 * never import this module (rule 4: nothing moves log → profile without the user's yes; a grep test
 * enforces it).
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { callable } from '../shared/callable';
import { writeTx } from '../shared/neo4j';
import { parseOrInvalid } from '../shared/errors';
import { encryptOwn } from '../shared/crypto';
import { ValidationError, obj, oneOf, str } from '../shared/validate';
import { int } from '../shared/values';
import { MERGE_USER, userKey } from '../userdata/ownership';
import { checkValue, itemLabels, kindDef, type ProfileKindDef } from './kinds';

export interface ProfileWriteResponse { version: number }
export interface KeepProfileItemResponse extends ProfileWriteResponse { id: string }

/** Profile item labels an item ref may name (a whitelist: the label is interpolated into Cypher). */
export const ITEM_LABELS = itemLabels();
type ItemLabel = keyof typeof ITEM_LABELS;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface KeepInput { kind: string; id: string; value: Record<string, unknown>; sourceSessionId: string | null }

/** Parse a keep / edit request: the kind, its id (`kind` itself for one-per-person kinds), the checked value. */
export function parseKeep(data: unknown): { def: ProfileKindDef; input: KeepInput } {
  const d = obj(data);
  const def = kindDef(d.kind);
  let id: string;
  if (!def.many) id = def.kind;
  else if (typeof d.id === 'string' && UUID.test(d.id)) id = d.id;
  else throw new ValidationError('Expected an item id');
  const sourceSessionId = d.sourceSessionId == null ? null : str(d.sourceSessionId, { max: 100 });
  return { def, input: { kind: def.kind, id, value: checkValue(def, d.value), sourceSessionId } };
}

/** The value as stored: own-words fields encrypted (shared/crypto.ts), then JSON. */
async function storedValue(tx: ManagedTransaction, uid: string, def: ProfileKindDef, value: Record<string, unknown>): Promise<string> {
  const out = { ...value };
  for (const f of def.ownFields) {
    if (typeof out[f] === 'string') out[f] = await encryptOwn(tx, uid, out[f] as string);
  }
  return JSON.stringify(out);
}

const REVISIT = `CASE WHEN k.revisitAfterDays IS NULL THEN null ELSE datetime() + duration({days: k.revisitAfterDays}) END`;

/** How many live items of a kind the person has, other than this one. */
export const countLiveQuery = (def: ProfileKindDef) => `MATCH (:User {id: $uid})-[:${def.rel}]->(x:${def.label} {kind: $kind})
  WHERE coalesce(x.status, 'active') <> 'set_aside' AND x.key <> $key
  RETURN count(x) AS n`;

/**
 * Create or replace an item on the person's yes. A `sourceSessionId` names the visit it was kept in
 * (the caller's own ToolSession only): `KEPT_FROM` → it and `source: 'tool:<toolId>'`.
 */
export const keepQuery = (def: ProfileKindDef) => `${MERGE_USER}
  WITH u
  MATCH (k:ProfileKind {id: $kind})
  OPTIONAL MATCH (u)-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $tsKey})
  MERGE (p:${def.label} {key: $key})
  ON CREATE SET p:UserData:ProfileItem, p.id = $id, p.ownerId = $uid, p.kind = $kind, p.area = k.area,
                p.createdAt = datetime(), p.schemaVersion = 1, p.reviewCount = 0,
                p.source = CASE WHEN ts IS NULL THEN 'user' ELSE 'tool:' + ts.toolId END
  SET p.valueJson = $valueJson, p.status = 'active', p.updatedAt = datetime(), p.confirmedAt = datetime(),
      p.revisitAt = ${REVISIT}
  MERGE (u)-[:${def.rel}]->(p)
  FOREACH (x IN CASE WHEN ts IS NULL THEN [] ELSE [ts] END | MERGE (p)-[:KEPT_FROM]->(x))
  SET u.profileVersion = coalesce(u.profileVersion, 0) + 1
  RETURN u.profileVersion AS version`;

/** Shared by keepProfileItem and the older upsertProfileFact. */
export async function keepTx(tx: ManagedTransaction, uid: string, email: string | null, def: ProfileKindDef, input: KeepInput): Promise<number> {
  const key = userKey(uid, input.id);
  const n = int((await tx.run(countLiveQuery(def), { uid, kind: def.kind, key })).records[0]?.get('n') ?? 0);
  if (n >= def.maxItems) throw new HttpsError('resource-exhausted', 'That list is full');
  const valueJson = await storedValue(tx, uid, def, input.value);
  const res = await tx.run(keepQuery(def), {
    uid, email, kind: def.kind, id: input.id, key, valueJson,
    tsKey: input.sourceSessionId ? userKey(uid, input.sourceSessionId) : null,
  });
  const rec = res.records[0];
  if (!rec) throw new HttpsError('failed-precondition', 'Profile content migration is required');
  return int(rec.get('version'));
}

export const keepProfileItem = callable<unknown, KeepProfileItemResponse>(
  { auth: 'required', label: 'keepProfileItem', errorMessage: 'Could not keep that' },
  async ({ uid, data, request }) => {
    const { def, input } = parseOrInvalid(() => parseKeep(data), 'Invalid profile item');
    const version = await writeTx((tx) => keepTx(tx, uid as string, request.auth?.token?.email ?? null, def, input));
    return { version, id: input.id };
  },
);

/** Kept for clients that still call it (quiet hours); the same write as keepProfileItem. */
export const upsertProfileFact = callable<unknown, ProfileWriteResponse>(
  { auth: 'required', label: 'upsertProfileFact', errorMessage: 'Could not save that' },
  async ({ uid, data, request }) => {
    const { def, input } = parseOrInvalid(() => {
      const d = obj(data);
      const k = kindDef(d.kind);
      if (k.label !== 'ProfileFact' || k.many) throw new ValidationError('Unknown profile kind');
      return parseKeep({ kind: k.kind, value: d.value });
    }, 'Invalid profile item');
    return { version: await writeTx((tx) => keepTx(tx, uid as string, request.auth?.token?.email ?? null, def, input)) };
  },
);

/** "Change": a new value through the kind's validator; confirmed now. */
export const editQuery = (def: ProfileKindDef) => `MATCH (u:User {id: $uid})-[:${def.rel}]->(p:${def.label} {key: $key})
  WHERE p.kind = $kind
  OPTIONAL MATCH (k:ProfileKind {id: p.kind})
  SET p.valueJson = $valueJson, p.updatedAt = datetime(), p.confirmedAt = datetime(), p.lastReviewedAt = datetime(),
      p.revisitAt = ${REVISIT}, u.profileVersion = coalesce(u.profileVersion, 0) + 1
  RETURN u.profileVersion AS version`;

export const editProfileItem = callable<unknown, ProfileWriteResponse>(
  { auth: 'required', label: 'editProfileItem', errorMessage: 'Could not save that' },
  async ({ uid, data }) => {
    const { def, input } = parseOrInvalid(() => parseKeep(data), 'Invalid profile item');
    return writeTx(async (tx) => {
      const valueJson = await storedValue(tx, uid as string, def, input.value);
      const rec = (await tx.run(editQuery(def), { uid, kind: def.kind, key: userKey(uid as string, input.id), valueJson })).records[0];
      if (!rec) throw new HttpsError('not-found', 'Not found');
      return { version: int(rec.get('version')) };
    });
  },
);

function parseRef(data: unknown): { id: string; label: ItemLabel } {
  const d = obj(data);
  return { id: str(d.id, { max: 100 }), label: oneOf(d.label, Object.keys(ITEM_LABELS) as ItemLabel[]) };
}

async function itemWrite(uid: string, data: unknown, set: string): Promise<ProfileWriteResponse> {
  const ref = parseOrInvalid(() => parseRef(data), 'Invalid profile item');
  const rel = ITEM_LABELS[ref.label];
  const res = await writeTx((tx) => tx.run(
    `MATCH (u:User {id: $uid})-[:${rel}]->(p:${ref.label} {key: $key})
     OPTIONAL MATCH (k:ProfileKind {id: p.kind})
     SET ${set}, p.updatedAt = datetime(), u.profileVersion = coalesce(u.profileVersion, 0) + 1
     RETURN u.profileVersion AS version`,
    { uid, key: userKey(uid, ref.id) },
  ));
  const rec = res.records[0];
  if (!rec) throw new HttpsError('not-found', 'Not found');
  return { version: int(rec.get('version')) };
}

/** "Still true?" → yes: confirmed now, next revisit per the kind's policy. */
export const confirmProfileItem = callable<unknown, ProfileWriteResponse>(
  { auth: 'required', label: 'confirmProfileItem', errorMessage: 'Could not save that' },
  async ({ uid, data }) => itemWrite(uid as string, data,
    `p.status = 'active', p.confirmedAt = datetime(), p.lastReviewedAt = datetime(), p.reviewCount = coalesce(p.reviewCount, 0) + 1,
     p.revisitAt = ${REVISIT}`),
);

/** "Not any more": set aside (kept and restorable, never deleted silently; excluded from slices). */
export const setAsideProfileItem = callable<unknown, ProfileWriteResponse>(
  { auth: 'required', label: 'setAsideProfileItem', errorMessage: 'Could not save that' },
  async ({ uid, data }) => itemWrite(uid as string, data, `p.status = 'set_aside', p.lastReviewedAt = datetime()`),
);

export const restoreProfileItem = callable<unknown, ProfileWriteResponse>(
  { auth: 'required', label: 'restoreProfileItem', errorMessage: 'Could not save that' },
  async ({ uid, data }) => itemWrite(uid as string, data,
    `p.status = 'active', p.confirmedAt = datetime(), p.lastReviewedAt = datetime(), p.revisitAt = ${REVISIT}`),
);

/**
 * "Delete this" (decision P4): the person's explicit choice in Me, behind a two-step confirm. The item and
 * its edges go; log records it came from stay (they describe a moment, not the item).
 */
export const deleteProfileItem = callable<unknown, ProfileWriteResponse>(
  { auth: 'required', label: 'deleteProfileItem', errorMessage: 'Could not delete that' },
  async ({ uid, data }) => {
    const ref = parseOrInvalid(() => parseRef(data), 'Invalid profile item');
    const rel = ITEM_LABELS[ref.label];
    const res = await writeTx((tx) => tx.run(
      `MATCH (u:User {id: $uid})-[:${rel}]->(p:${ref.label} {key: $key})
       DETACH DELETE p
       SET u.profileVersion = coalesce(u.profileVersion, 0) + 1
       RETURN u.profileVersion AS version`,
      { uid, key: userKey(uid as string, ref.id) },
    ));
    const rec = res.records[0];
    if (!rec) throw new HttpsError('not-found', 'Not found');
    return { version: int(rec.get('version')) };
  },
);
