/**
 * The reads behind the parts stats (stats.ts): Cypher plus record → row mapping, nothing else. Every
 * match starts at the caller's User and goes through their own edges (HAS_PART, HAS_PART_TAG,
 * HAS_PART_SESSION, HAS_TOOL_SESSION), so nobody else's records can be counted; with parts off every
 * read returns nothing. Read-only: the part is matched (`pt`), never written (keep.ts is its one writer).
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { toNumber } from '../shared/values';
import type { StatsPartRow, StatsRows, StatsSessionRow, StatsTagRow } from './stats';

export const STATS_USER_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  RETURN coalesce(u.partsEnabled, false) AS partsOn, u.timeZone AS timeZone
`;

/** Active and resting parts, most recently visited first (the profile `parts` slice's order). */
export const STATS_PARTS_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART]->(pt:Part)
  WHERE coalesce(u.partsEnabled, false) AND pt.status IN ['active', 'resting']
  RETURN pt.id AS id, pt.name AS name, pt.status AS status, head(coalesce(pt.places, [])) AS firstPlace,
         pt.shapeSig AS shapeSig
  ORDER BY pt.lastVisitedAt IS NULL, pt.lastVisitedAt DESC, pt.confirmedAt IS NULL, pt.confirmedAt DESC, pt.id
  LIMIT 50
`;

/**
 * The caller's close tags of their own active or resting parts, each with its own tagged ToolSession's
 * tool. Close tags only: a DEAR MAN debrief tag says the part was there, not that a tool helped it settle
 * (so never *helped*), and its time is the debrief's, not the moment's (so not *when* either).
 */
export const STATS_TAGS_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART_TAG]->(t:PartTag)-[:OF_PART]->(pt:Part)
  WHERE coalesce(u.partsEnabled, false) AND pt.status IN ['active', 'resting'] AND (u)-[:HAS_PART]->(pt)
    AND coalesce(t.source, 'close') = 'close'
  MATCH (t)-[:TAGS]->(ts:ToolSession)<-[:HAS_TOOL_SESSION]-(u)
  RETURN pt.id AS partId, ts.toolId AS toolId, toString(coalesce(t.at, t.createdAt)) AS at
`;

/** The caller's Meet a part visits of those parts with a feel-toward answer: the first answer only. */
export const STATS_SESSIONS_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART_SESSION]->(ps:PartSession)-[:OF_PART]->(pt:Part)
  WHERE coalesce(u.partsEnabled, false) AND pt.status IN ['active', 'resting'] AND (u)-[:HAS_PART]->(pt)
    AND size(coalesce(ps.feelTowardIds, [])) > 0
  RETURN pt.id AS partId, toString(ps.createdAt) AS at, ps.feelTowardIds[0] AS firstFeel
`;

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const nums = (v: unknown): number[] | null => {
  if (!Array.isArray(v)) return null;
  const out = v.map((x) => toNumber(x)).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  return out.length === v.length && out.length > 0 ? out : null;
};

/** Every row the stats need for one user, in one read transaction. */
export async function readStatsRows(tx: Pick<ManagedTransaction, 'run'>, uid: string): Promise<StatsRows> {
  const user = (await tx.run(STATS_USER_QUERY, { uid })).records[0];
  const partsOn = user?.get('partsOn') === true;
  if (!partsOn) return { partsOn: false, timeZone: null, parts: [], tags: [], sessions: [] };
  const timeZone = str(user?.get('timeZone'));
  const parts: StatsPartRow[] = (await tx.run(STATS_PARTS_QUERY, { uid })).records.map((r) => ({
    id: r.get('id'), name: str(r.get('name')), status: r.get('status'),
    firstPlace: str(r.get('firstPlace')), shapeSig: nums(r.get('shapeSig')),
  }));
  if (parts.length === 0) return { partsOn, timeZone, parts, tags: [], sessions: [] };
  const tags: StatsTagRow[] = (await tx.run(STATS_TAGS_QUERY, { uid })).records
    .map((r) => ({ partId: r.get('partId'), toolId: str(r.get('toolId')) ?? '', at: r.get('at') }))
    .filter((t) => t.toolId && typeof t.at === 'string');
  const sessions: StatsSessionRow[] = (await tx.run(STATS_SESSIONS_QUERY, { uid })).records
    .map((r) => ({ partId: r.get('partId'), at: r.get('at'), firstFeel: str(r.get('firstFeel')) ?? '' }))
    .filter((s) => s.firstFeel && typeof s.at === 'string');
  return { partsOn, timeZone, parts, tags, sessions };
}
