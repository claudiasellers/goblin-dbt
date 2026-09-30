/**
 * Profile item writes (PR-P1): by the user, from the Me surface or a tool's "still true?".
 * Every write bumps User.profileVersion (the client cache key). Scheduled code must never import
 * this module (rule 4: nothing moves log → profile without the user's yes; a grep test enforces it).
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { callable } from '../shared/callable';
import { writeTx } from '../shared/neo4j';
import { parseOrInvalid } from '../shared/errors';
import { ValidationError, obj, oneOf, str } from '../shared/validate';
import { int } from '../shared/values';
import { MERGE_USER, userKey } from '../userdata/ownership';
import { HHMM } from './meta';

export interface ProfileWriteResponse { version: number }

/** Profile item labels an item ref may name (a whitelist: the label is interpolated into Cypher). */
export const ITEM_LABELS = { ProfileFact: 'HAS_PROFILE_FACT', MyPattern: 'HAS_PATTERN' } as const;
type ItemLabel = keyof typeof ITEM_LABELS;

/** Phase A fact kinds and their value validators. */
const FACT_VALUES: Record<string, (v: unknown) => unknown> = {
  quiet_hours: (v) => {
    const o = obj(v);
    const start = str(o.start, { max: 5, pattern: HHMM });
    const end = str(o.end, { max: 5, pattern: HHMM });
    if (start === end) throw new ValidationError('Quiet hours need a start and an end');
    return { start, end };
  },
};

export const upsertProfileFact = callable<unknown, ProfileWriteResponse>(
  { auth: 'required', label: 'upsertProfileFact', errorMessage: 'Could not save that' },
  async ({ uid, data, request }) => {
    const { kind, valueJson } = parseOrInvalid(() => {
      const d = obj(data);
      const k = oneOf(d.kind, Object.keys(FACT_VALUES));
      return { kind: k, valueJson: JSON.stringify(FACT_VALUES[k](d.value)) };
    }, 'Invalid profile item');
    const res = await writeTx((tx) => tx.run(
      `${MERGE_USER}
       WITH u
       MATCH (k:ProfileKind {id: $kind})
       MERGE (p:ProfileFact {key: $key})
       ON CREATE SET p:UserData:ProfileItem, p.id = $kind, p.ownerId = $uid, p.kind = $kind, p.area = k.area,
                     p.createdAt = datetime(), p.schemaVersion = 1, p.reviewCount = 0, p.source = 'user'
       SET p.valueJson = $valueJson, p.status = 'active', p.updatedAt = datetime(), p.confirmedAt = datetime(),
           p.revisitAt = CASE WHEN k.revisitAfterDays IS NULL THEN null ELSE datetime() + duration({days: k.revisitAfterDays}) END
       MERGE (u)-[:HAS_PROFILE_FACT]->(p)
       SET u.profileVersion = coalesce(u.profileVersion, 0) + 1
       RETURN u.profileVersion AS version`,
      { uid, email: request.auth?.token?.email ?? null, kind, key: userKey(uid as string, kind), valueJson },
    ));
    const rec = res.records[0];
    if (!rec) throw new HttpsError('failed-precondition', 'Profile content migration is required');
    return { version: int(rec.get('version')) };
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
     p.revisitAt = CASE WHEN k.revisitAfterDays IS NULL THEN null ELSE datetime() + duration({days: k.revisitAfterDays}) END`),
);

/** "Not any more": set aside (kept and restorable, never deleted silently; excluded from slices). */
export const setAsideProfileItem = callable<unknown, ProfileWriteResponse>(
  { auth: 'required', label: 'setAsideProfileItem', errorMessage: 'Could not save that' },
  async ({ uid, data }) => itemWrite(uid as string, data, `p.status = 'set_aside', p.lastReviewedAt = datetime()`),
);

export const restoreProfileItem = callable<unknown, ProfileWriteResponse>(
  { auth: 'required', label: 'restoreProfileItem', errorMessage: 'Could not save that' },
  async ({ uid, data }) => itemWrite(uid as string, data,
    `p.status = 'active', p.confirmedAt = datetime(), p.lastReviewedAt = datetime(),
     p.revisitAt = CASE WHEN k.revisitAfterDays IS NULL THEN null ELSE datetime() + duration({days: k.revisitAfterDays}) END`),
);
