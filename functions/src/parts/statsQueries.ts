/**
 * The reads behind the parts stats (stats.ts): Cypher plus record → row mapping, nothing else. Every
 * match starts at the caller's User and goes through their own edges (HAS_PART, HAS_PART_TAG,
 * HAS_PART_SESSION, HAS_TOOL_SESSION), so nobody else's records can be counted; with parts off every
 * read returns nothing. Read-only: the part is matched (`pt`), never written (keep.ts is its one writer).
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { toNumber } from '../shared/values';
import type { StatsPartRow, StatsRows, StatsSessionRow, StatsStepRow, StatsTagRow } from './stats';

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
 * The caller's close and cope_ahead tags of their own active or resting parts, each with its own tagged
 * ToolSession's tool and its source. A DEAR MAN debrief tag says the part was there, not that a tool
 * helped it settle (so never *helped*), and its time is the debrief's, not the moment's (so not *when*
 * either). A cope_ahead tag (Cope Ahead's after card, "Used it, it helped") counts for *helped* only
 * (stats.ts): its time is the answer's.
 */
export const STATS_TAGS_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART_TAG]->(t:PartTag)-[:OF_PART]->(pt:Part)
  WHERE coalesce(u.partsEnabled, false) AND pt.status IN ['active', 'resting'] AND (u)-[:HAS_PART]->(pt)
    AND coalesce(t.source, 'close') IN ['close', 'cope_ahead']
  MATCH (t)-[:TAGS]->(ts:ToolSession)<-[:HAS_TOOL_SESSION]-(u)
  RETURN pt.id AS partId, ts.toolId AS toolId, toString(coalesce(t.at, t.createdAt)) AS at, coalesce(t.source, 'close') AS source
`;

/** The tagged-session prefix both halves of STATS_STEPS_QUERY share: STATS_TAGS_QUERY's, for one tool. */
const stepTagged = (toolId: string) => `
  MATCH (u:User {id: $uid})-[:HAS_PART_TAG]->(t:PartTag)-[:OF_PART]->(pt:Part)
  WHERE coalesce(u.partsEnabled, false) AND pt.status IN ['active', 'resting'] AND (u)-[:HAS_PART]->(pt)
    AND coalesce(t.source, 'close') = 'close'
  MATCH (t)-[:TAGS]->(ts:ToolSession {toolId: '${toolId}'})<-[:HAS_TOOL_SESSION]-(u)`;

/**
 * The step chosen in each close-tagged Do the Opposite and Recover session (its DETAIL record, the
 * caller's own through COMPLETED_SESSION). Ids and graph labels only, never the person's text:
 * - Do the Opposite: the size picked (small / medium / bigger) is tested inside the session snapshot
 *   with CONTAINS, so only the size leaves the graph ("custom", own words, matches none and drops out);
 *   the step is the targeted ActionUrge's, or, for "My urge is different", the protocol's default step
 *   of the session's DBT parent (the emotion's EmotionRegulationContent named in the snapshot).
 * - Recover: the path chosen (exitId), labelled by its RecoveryExit title.
 * Step ids are namespaced (`oa:<urge>:<size>`, `oa:default_<parent>:<size>`, `recover:<exit>`).
 */
export const STATS_STEPS_QUERY = `${stepTagged('opposite-action')}
  MATCH (ts)-[:DETAIL]->(d:OppositeActionSession)<-[:COMPLETED_SESSION]-(u)
  WITH pt, t, d,
       CASE WHEN d.dataJson CONTAINS '"actionSize":"small"' THEN 'small'
            WHEN d.dataJson CONTAINS '"actionSize":"medium"' THEN 'medium'
            WHEN d.dataJson CONTAINS '"actionSize":"bigger"' THEN 'bigger' END AS size
  WHERE size IS NOT NULL
  OPTIONAL MATCH (d)-[:TARGETED_URGE]->(au:ActionUrge)
  OPTIONAL MATCH (d)-[:FOCUSED_ON]->(:Emotion)-[:HAS_REGULATION_CONTENT]->(c:EmotionRegulationContent)
    WHERE d.urgeId = 'custom' AND d.dataJson CONTAINS ('"parentId":"' + c.dbtParent + '"')
  WITH pt, t, size, au, head(collect(c)) AS c
  WITH pt, t,
       CASE WHEN au IS NOT NULL THEN 'oa:' + au.id + ':' + size
            WHEN c IS NOT NULL THEN 'oa:default_' + c.dbtParent + ':' + size END AS stepId,
       CASE WHEN au IS NOT NULL THEN au[size]
            WHEN c IS NOT NULL THEN CASE size WHEN 'small' THEN c.defaultOppositeSmall
                                              WHEN 'medium' THEN c.defaultOppositeMedium
                                              ELSE c.defaultOppositeBigger END END AS label
  WHERE stepId IS NOT NULL AND label IS NOT NULL AND label <> ''
  RETURN pt.id AS partId, stepId, label, toString(coalesce(t.at, t.createdAt)) AS at
  UNION ALL${stepTagged('recovering-from-invalidation')}
  MATCH (ts)-[:DETAIL]->(d:InvalidationRecoverySession)<-[:COMPLETED_SESSION]-(u)
  MATCH (x:RecoveryExit {id: d.exitId})
  WHERE x.title IS NOT NULL AND x.title <> ''
  RETURN pt.id AS partId, 'recover:' + x.id AS stepId, x.title AS label, toString(coalesce(t.at, t.createdAt)) AS at
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
  if (!partsOn) return { partsOn: false, timeZone: null, parts: [], tags: [], sessions: [], steps: [] };
  const timeZone = str(user?.get('timeZone'));
  const parts: StatsPartRow[] = (await tx.run(STATS_PARTS_QUERY, { uid })).records.map((r) => ({
    id: r.get('id'), name: str(r.get('name')), status: r.get('status'),
    firstPlace: str(r.get('firstPlace')), shapeSig: nums(r.get('shapeSig')),
  }));
  if (parts.length === 0) return { partsOn, timeZone, parts, tags: [], sessions: [], steps: [] };
  const tags: StatsTagRow[] = (await tx.run(STATS_TAGS_QUERY, { uid })).records
    .map((r) => ({ partId: r.get('partId'), toolId: str(r.get('toolId')) ?? '', at: r.get('at'), source: r.has('source') && r.get('source') === 'cope_ahead' ? 'cope_ahead' as const : 'close' as const }))
    .filter((t) => t.toolId && typeof t.at === 'string');
  const sessions: StatsSessionRow[] = (await tx.run(STATS_SESSIONS_QUERY, { uid })).records
    .map((r) => ({ partId: r.get('partId'), at: r.get('at'), firstFeel: str(r.get('firstFeel')) ?? '' }))
    .filter((s) => s.firstFeel && typeof s.at === 'string');
  const steps: StatsStepRow[] = (await tx.run(STATS_STEPS_QUERY, { uid })).records
    .map((r) => ({ partId: r.get('partId'), stepId: str(r.get('stepId')) ?? '', label: str(r.get('label')) ?? '', at: r.get('at') }))
    .filter((s) => s.stepId && s.label && typeof s.at === 'string');
  return { partsOn, timeZone, parts, tags, sessions, steps };
}
