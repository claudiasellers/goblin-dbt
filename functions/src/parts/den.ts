/**
 * The den's reads (docs/design/parts.md, "The den"): Me → Parts of me → See them together.
 *
 * getDen: the profile's `den` slice (declared for `me` only, server-side) plus one log aggregate, the
 * latest time the person spent with each part: a tag, a check-back answer or a still-true answer. That
 * and `lastVisitedAt` become a recency bucket (`near` / `a_while` / `not_lately`); no date or count of
 * them reaches the client. getDenSnapshot: one saved layout by id. Both return nothing with parts off.
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { ValidationError, obj } from '../shared/validate';
import { readProfileSlices } from '../profile/slices';
import type { ProfileSlices } from '../profile/types';
import { userKey } from '../userdata/ownership';
import { PART_CHECKBACK_TYPE } from './checkbackTypes';
import { DEN_SNAPSHOT_ID, parseDenLayout } from './denSnapshot';
import type { DenRecency, GetDenResponse, GetDenSnapshotRequest, GetDenSnapshotResponse } from './denTypes';

const DAY = 86_400_000;
/** Within this many days of the latest time together: in the light. */
export const DEN_NEAR_DAYS = 14;
/** Within this many: softer. Beyond (or never): in the dusk at the edge. Profile revisits propose rest at 60. */
export const DEN_A_WHILE_DAYS = 60;

/** The latest of the given times (ISO strings; unparsable ones ignored) → the bucket. */
export function recencyBucket(times: ReadonlyArray<string | null | undefined>, now: Date): DenRecency {
  const ms = times.map((t) => (t ? Date.parse(t) : NaN)).filter((n) => Number.isFinite(n));
  if (ms.length === 0) return 'not_lately';
  const days = (now.getTime() - Math.max(...ms)) / DAY;
  if (days <= DEN_NEAR_DAYS) return 'near';
  if (days <= DEN_A_WHILE_DAYS) return 'a_while';
  return 'not_lately';
}

/**
 * The latest touch per part in the room, through the caller's own edges only: a PartTag of it, an
 * answered (not skipped) part check-back about it, a still-true answer about it.
 */
export const DEN_TOUCHES_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART]->(pt:Part)
  WHERE coalesce(u.partsEnabled, false) AND pt.status IN ['active', 'resting']
  OPTIONAL MATCH (u)-[:HAS_PART_TAG]->(t:PartTag)-[:OF_PART]->(pt)
  WITH u, pt, max(coalesce(t.at, t.createdAt)) AS tagAt
  OPTIONAL MATCH (u)-[:HAS_FOLLOW_UP]->(f:FollowUp {type: $checkbackType})
  WHERE pt.id = f.partId AND f.status = 'done' AND f.resolvedAt IS NOT NULL
  WITH u, pt, tagAt, max(f.resolvedAt) AS checkbackAt
  OPTIONAL MATCH (u)-[:HAS_PART_REVISIT]->(r:PartRevisit)-[:OF_PART]->(pt)
  WITH pt, tagAt, checkbackAt, max(r.createdAt) AS revisitAt
  RETURN pt.id AS partId, toString(tagAt) AS tagAt, toString(checkbackAt) AS checkbackAt, toString(revisitAt) AS revisitAt
`;

/** One snapshot of the caller's, by key. */
export const DEN_SNAPSHOT_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_DEN_SNAPSHOT]->(s:DenSnapshot {key: $snapshotKey})
  WHERE coalesce(u.partsEnabled, false)
  RETURN s.layoutJson AS layoutJson, toString(s.takenAt) AS takenAt
`;

export interface DenDeps {
  /** The `den` slice (empty with parts off) and whether parts are on. */
  den(): Promise<{ partsOn: boolean; slice: ProfileSlices['den'] }>;
  /** Part id → the latest touch times from the log. */
  touches(): Promise<Map<string, Array<string | null>>>;
  snapshot(id: string): Promise<{ partsOn: boolean; layoutJson: string | null; takenAt: string | null }>;
}

/** The room. Parts off: nothing at all (the page shows the plain list's gate instead). */
export async function getDenHandler(deps: DenDeps, now: Date = new Date()): Promise<GetDenResponse> {
  const st = await deps.den();
  if (!st.partsOn) return { parts: [], links: [], snapshots: [] };
  const touches = st.slice.parts.length > 0 ? await deps.touches() : new Map<string, Array<string | null>>();
  const parts = st.slice.parts.map(({ lastVisitedAt, ...p }) => ({
    ...p, recency: recencyBucket([lastVisitedAt, ...(touches.get(p.id) ?? [])], now),
  }));
  return { parts, links: st.slice.links, snapshots: st.slice.snapshots };
}

export function validateSnapshotRef(raw: unknown): GetDenSnapshotRequest {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (k !== 'id') throw new ValidationError(`${k}: not accepted`);
  if (typeof o.id !== 'string' || !DEN_SNAPSHOT_ID.test(o.id)) throw new ValidationError('id: expected a snapshot id');
  return { id: o.id };
}

/** One past layout. Not the caller's, or parts off: no parts. */
export async function getDenSnapshotHandler(input: GetDenSnapshotRequest, deps: DenDeps): Promise<GetDenSnapshotResponse> {
  const st = await deps.snapshot(input.id);
  if (!st.partsOn) return { parts: [] };
  const parts = parseDenLayout(st.layoutJson);
  return st.takenAt ? { parts, takenAt: st.takenAt } : { parts };
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

export function denDeps(tx: ManagedTransaction, uid: string): DenDeps {
  return {
    async den() {
      const on = (await tx.run('OPTIONAL MATCH (u:User {id: $uid}) RETURN coalesce(u.partsEnabled, false) AS partsOn', { uid })).records[0];
      const partsOn = on?.get('partsOn') === true;
      if (!partsOn) return { partsOn, slice: { parts: [], links: [], snapshots: [] } };
      const { den } = await readProfileSlices(tx, uid, 'me');
      return { partsOn, slice: den };
    },
    async touches() {
      const out = new Map<string, Array<string | null>>();
      for (const r of (await tx.run(DEN_TOUCHES_QUERY, { uid, checkbackType: PART_CHECKBACK_TYPE })).records) {
        out.set(String(r.get('partId')), [str(r.get('tagAt')), str(r.get('checkbackAt')), str(r.get('revisitAt'))]);
      }
      return out;
    },
    async snapshot(id) {
      const on = (await tx.run('OPTIONAL MATCH (u:User {id: $uid}) RETURN coalesce(u.partsEnabled, false) AS partsOn', { uid })).records[0];
      const partsOn = on?.get('partsOn') === true;
      if (!partsOn) return { partsOn, layoutJson: null, takenAt: null };
      const r = (await tx.run(DEN_SNAPSHOT_QUERY, { uid, snapshotKey: userKey(uid, id) })).records[0];
      return { partsOn, layoutJson: str(r?.get('layoutJson')), takenAt: str(r?.get('takenAt')) };
    },
  };
}
