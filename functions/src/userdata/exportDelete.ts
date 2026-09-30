/**
 * Generic export and delete over the user subgraph (plan §5.5, E2 §P.2). Every :UserData node is
 * found by `ownerId`, so a label registered in ./layers.ts is covered without touching this file.
 */
import neo4j, { Session } from 'neo4j-driver';
import { USER_DATA, exportKeyFor } from './layers';

/** Plain JSON only: Neo4j Integers become numbers, temporal and other driver types become strings. */
export function plain(v: unknown): unknown {
  if (neo4j.isInt(v)) return (v as { toNumber: () => number }).toNumber();
  if (Array.isArray(v)) return v.map(plain);
  if (v !== null && typeof v === 'object') {
    if ((v as object).constructor === Object) {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, plain(x)]));
    }
    return String(v);
  }
  return v;
}

export interface ExportLink { from: string; type: string; to: string | null; props: Record<string, unknown> }
export interface UserRecordsExport {
  formatVersion: 2;
  /** `records.<exportAs>[]`: every non-system :UserData node's properties. */
  records: Record<string, Array<Record<string, unknown>>>;
  /** Edges out of the user's data (and the user's own edges to graph content), with their properties. */
  links: ExportLink[];
}

/** Everything the user owns, grouped by the registry's `exportAs`, plus every outgoing edge. */
export async function exportUserRecords(session: Session, uid: string): Promise<UserRecordsExport> {
  const records: UserRecordsExport['records'] = {};
  const nodes = await session.run(
    `MATCH (n:UserData {ownerId: $uid}) WHERE NOT n:System
     RETURN labels(n) AS labels, properties(n) AS props`,
    { uid },
  );
  for (const r of nodes.records) {
    const key = exportKeyFor(r.get('labels') as string[]) ?? 'unregistered';
    (records[key] ??= []).push(plain(r.get('props')) as Record<string, unknown>);
  }
  const links: ExportLink[] = [];
  const rels = await session.run(
    `MATCH (a:UserData {ownerId: $uid})-[r]->(b) WHERE NOT a:System
     RETURN a.key AS from, type(r) AS type, coalesce(b.key, b.id) AS to, properties(r) AS props
     UNION ALL
     MATCH (:User {id: $uid})-[r]->(b) WHERE NOT b:UserData
     RETURN 'user' AS from, type(r) AS type, b.id AS to, properties(r) AS props`,
    { uid },
  );
  for (const r of rels.records) {
    links.push({
      from: r.get('from') as string,
      type: r.get('type') as string,
      to: (r.get('to') as string | null) ?? null,
      props: plain(r.get('props')) as Record<string, unknown>,
    });
  }
  return { formatVersion: 2, records, links };
}

/**
 * Pre-convention labels deleted by relationship as well, for nodes the backfill hasn't reached.
 * Children first (BodySensation hangs off CheckIn).
 */
const LEGACY_DELETES = [
  `MATCH (:User {id: $uid})-[:LOGGED]->(c:CheckIn) OPTIONAL MATCH (c)-[:SENSED]->(s:BodySensation) DETACH DELETE s, c`,
  ...Object.entries(USER_DATA)
    .filter(([label, d]) => d.legacy && label !== 'CheckIn' && label !== 'BodySensation')
    .map(([label, d]) => `MATCH (:User {id: $uid})-[:${d.rel}]->(n:${label}) DETACH DELETE n`),
];

/**
 * Delete the user's whole subgraph and the User node. Needs an auto-commit session (`CALL … IN
 * TRANSACTIONS` can't run inside a managed transaction). Idempotent: a second run deletes nothing.
 */
export async function deleteUserGraph(session: Session, uid: string): Promise<void> {
  await session.run(
    `MATCH (n:UserData {ownerId: $uid})
     CALL { WITH n DETACH DELETE n } IN TRANSACTIONS OF 500 ROWS`,
    { uid },
  );
  for (const q of LEGACY_DELETES) await session.run(q, { uid });
  await session.run(`MATCH (u:User {id: $uid}) DETACH DELETE u`, { uid });
}

/**
 * Retention (D-10): log records older than `days` are deleted; profile items never expire.
 * Legacy check-ins the backfill hasn't labelled are covered by relationship, as before.
 */
export async function applyRetention(session: Session, uid: string, days: number): Promise<void> {
  const params = { uid, days: neo4j.int(days) };
  await session.run(
    `MATCH (n:LogRecord {ownerId: $uid})
     WHERE coalesce(n.createdAt, n.timestamp, n.startedAt) < datetime() - duration({days: $days})
     OPTIONAL MATCH (n)-[:SENSED]->(s:BodySensation)
     DETACH DELETE s, n`,
    params,
  );
  await session.run(
    `MATCH (:User {id: $uid})-[:LOGGED]->(c:CheckIn)
     WHERE c.timestamp < datetime() - duration({days: $days})
     OPTIONAL MATCH (c)-[:SENSED]->(s:BodySensation)
     DETACH DELETE s, c`,
    params,
  );
}
