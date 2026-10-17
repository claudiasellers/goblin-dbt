/**
 * The den's snapshots (docs/design/parts.md, "The den": "Then and now"). The one writer of a
 * `DenSnapshot` (tests/parts-den-data.test.mjs): the server writes it, never the client, when a part is
 * kept, rested or woken, or given a new job (keep.ts' writers call `snapshotDen` in their own
 * transaction, after their write). At most one per day (UTC): the day's latest wins.
 *
 * A snapshot holds the room's layout only: part ids, positions, status and tender. No names, no own
 * words: a renamed or deleted part simply isn't named by it.
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { toNumber } from '../shared/values';
import { userKey } from '../userdata/ownership';
import type { DenSnapshotPart } from './denTypes';

/** The parts in the room now (active and resting), in a stable order. */
export const DEN_LAYOUT_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART]->(p:Part)
  WHERE coalesce(u.partsEnabled, false) AND p.status IN ['active', 'resting']
  RETURN p.id AS id, p.mapX AS mapX, p.mapY AS mapY, p.status AS status, coalesce(p.tender, false) AS tender
  ORDER BY p.id LIMIT 50
`;

/** The day's snapshot: created once, its layout and time replaced by every later one that day. */
export const WRITE_DEN_SNAPSHOT_QUERY = `
  MATCH (u:User {id: $uid}) WHERE coalesce(u.partsEnabled, false)
  MERGE (s:DenSnapshot {key: $snapshotKey})
  ON CREATE SET s:UserData:ProfileItem, s.id = $snapshotId, s.ownerId = $uid, s.createdAt = datetime(),
    s.schemaVersion = 1, s.kind = 'den_snapshot', s.source = 'server'
  SET s.takenAt = datetime(), s.layoutJson = $layoutJson
  MERGE (u)-[:HAS_DEN_SNAPSHOT]->(s)
  RETURN s.id AS id
`;

/** `den_YYYY-MM-DD` (UTC): one per day. */
export const denSnapshotId = (now: Date): string => `den_${now.toISOString().slice(0, 10)}`;
export const DEN_SNAPSHOT_ID = /^den_\d{4}-\d{2}-\d{2}$/;

const unit = (v: unknown): number | null => {
  const n = toNumber(v);
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
};

/** Rows → the stored layout (and back: `parseDenLayout`). Only the four fields; anything else is dropped. */
export function denLayout(rows: ReadonlyArray<Record<string, unknown>>): DenSnapshotPart[] {
  return rows
    .filter((r) => typeof r.id === 'string')
    .map((r) => ({
      id: r.id as string, mapX: unit(r.mapX), mapY: unit(r.mapY),
      status: r.status === 'resting' ? 'resting' as const : 'active' as const, tender: r.tender === true,
    }));
}

export function parseDenLayout(json: unknown): DenSnapshotPart[] {
  if (typeof json !== 'string') return [];
  try {
    const v = JSON.parse(json) as unknown;
    return Array.isArray(v) ? denLayout(v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')) : [];
  } catch {
    return [];
  }
}

/** Take today's snapshot of the room. Nothing in the room (or parts off): nothing written. */
export async function snapshotDen(tx: Pick<ManagedTransaction, 'run'>, uid: string, now: Date = new Date()): Promise<string | null> {
  const rows = (await tx.run(DEN_LAYOUT_QUERY, { uid })).records.map((r) => ({
    id: r.get('id'), mapX: r.get('mapX'), mapY: r.get('mapY'), status: r.get('status'), tender: r.get('tender'),
  }));
  const layout = denLayout(rows);
  if (layout.length === 0) return null;
  const id = denSnapshotId(now);
  const r = (await tx.run(WRITE_DEN_SNAPSHOT_QUERY, {
    uid, snapshotKey: userKey(uid, id), snapshotId: id, layoutJson: JSON.stringify(layout),
  })).records[0];
  return r ? (r.get('id') as string) : null;
}
