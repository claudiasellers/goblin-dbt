/**
 * The trails query layer: read-only, the caller's own records only. One read of the log
 * (TRAIL_RECORDS_QUERY), the trail content, `User.timeZone`, and the claimed parts through the
 * profile `parts` slice (readProfileSlices(tx, uid, 'today')): never a direct Part read here.
 *
 * Records (each reduced to a TrailRecord; finalised or closed only):
 *  - ToolSession (HAS_TOOL_SESSION, status not 'open', not Meet a part), anchored on `startedAt`:
 *      urgeIds → ActionUrge / FeelingUrge (Do the Opposite, Urge Surfing); ext's `er.barrierSubId` →
 *      BarrierSubResponse (Problem Solve; matched as the exact `"barrierSubId":"<id>"` in the validated,
 *      ids-only ext JSON); and through DETAIL its detail session (below).
 *  - A detail session no ToolSession points at (COMPLETED_SESSION; e.g. Find the feeling inside the
 *    check-in, a plan saved before the spine), anchored on `createdAt`.
 *      OppositeActionSession: `urgeId` → ActionUrge (its saved urge; 'custom' matches nothing). Its
 *        `dataJson` holds the person's own words and is never read.
 *      FindTheFeelingSession: `pull` → FeelingUrge; trigger from `setOff` (someone / situation / body;
 *        nothing / not sure → none), read as the exact `"setOff":"<value>"` in its `dataJson`, which
 *        holds only ids and enums (findTheFeelingValidation.ts: no free text is accepted). The only
 *        `dataJson` read, and only under `d:FindTheFeelingSession` (test-enforced).
 *      InvalidationRecoverySession: `pull` → PullOption {flow: 'recover'}; trigger someone; event = `stateId`.
 *      DearManSession: momentResponseIds / turningPointIds / thoughtPatternIds → MomentResponse /
 *        TurningPoint / ThoughtPattern (debrief), `barriers` → DearManBarrier (prep); trigger someone.
 *  - CheckIn (LOGGED, result shown), anchored on `timestamp`: discResponseIds → QuestionResponse.
 * Moves come only through EXPRESSES edges with reviewStatus 'approved' ($drafts: the dry run's flag
 * also counts drafts). Tags: (:User)-[:HAS_PART_TAG]->(:PartTag)-[:TAGS]->(record), and the tag's
 * OF_PART target's id only.
 *
 * Every property the records query reads is in TRAIL_READ_PROPERTIES (test-enforced); none is in
 * OWN_WORDS_PROPERTIES.
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { readProfileSlices } from '../../profile/slices';
import { sessionSourceMatch } from '../sessionMoves';
import { int, toNumber } from '../../shared/values';
import type { ClaimedPart, TrailContextKey, TrailContextRow, TrailMove, TrailPair, TrailPolicy, TrailRecord, TrailRule, TrailShape } from './types';

type Tx = Pick<ManagedTransaction, 'run'>;

/** The graph labels a trail source can carry (scripts/parts/content.py EXPRESSES). */
export const SOURCE_LABELS = [
  'ActionUrge', 'FeelingUrge', 'PullOption', 'MomentResponse', 'TurningPoint', 'ThoughtPattern',
  'DearManBarrier', 'BarrierSubResponse', 'QuestionResponse',
] as const;

/** Visits that are no pull moment (Meet a part is the part itself). */
export const SKIP_TOOLS = ['meet-a-part', 'two-pulls'] as const;

/** FTF `setOff` values that are a trigger context (nothing / not sure are none). */
export const SET_OFF_TRIGGERS = ['someone', 'situation', 'body'] as const;

/** The window when no rule names one: the doc's 42 days. */
export const DEFAULT_WINDOW_DAYS = 42;

/** PartsPolicy fallbacks when the policy node is missing (content.py POLICY). */
export const DEFAULT_TRAIL_POLICY: TrailPolicy = { episodeMergeHours: 2, louderPauseHours: 72 };

const setOffCase = SET_OFF_TRIGGERS
  .map((v) => `WHEN d:FindTheFeelingSession AND d.dataJson CONTAINS '"setOff":"${v}"' THEN '${v}'`).join('\n         ');

export const TRAIL_RECORDS_QUERY = `
MATCH (u:User {id: $uid})
CALL {
  WITH u
  MATCH (u)-[:HAS_TOOL_SESSION]->(r:ToolSession)
  WHERE r.ownerId = $uid AND r.status <> 'open' AND NOT r.toolId IN $skipTools
    AND r.startedAt > datetime() - duration({days: $days})
  OPTIONAL MATCH (r)-[:DETAIL]->(d) WHERE d.ownerId = $uid
  RETURN r, d, r.toolId AS toolId, r.startedAt AS at
  UNION
  WITH u
  MATCH (u)-[:COMPLETED_SESSION]->(d)
  WHERE (d:FindTheFeelingSession OR d:InvalidationRecoverySession OR d:DearManSession OR d:OppositeActionSession)
    AND d.ownerId = $uid AND d.createdAt > datetime() - duration({days: $days})
    AND NOT EXISTS { MATCH (:ToolSession)-[:DETAIL]->(d) }
  RETURN d AS r, d,
         CASE WHEN d:FindTheFeelingSession THEN 'find-the-feeling' WHEN d:DearManSession THEN 'dear-man'
              WHEN d:OppositeActionSession THEN 'opposite-action' ELSE 'recovering-from-invalidation' END AS toolId,
         d.createdAt AS at
  UNION
  WITH u
  MATCH (u)-[:LOGGED]->(r:CheckIn)
  WHERE r.ownerId = $uid AND r.resultShownAt IS NOT NULL AND r.timestamp > datetime() - duration({days: $days})
  RETURN r, null AS d, 'checkin' AS toolId, r.timestamp AS at
}
WITH u, r, d, toolId, at,
     CASE WHEN d:InvalidationRecoverySession OR d:DearManSession THEN 'someone'
         ${setOffCase}
     END AS trigger,
     CASE WHEN d:InvalidationRecoverySession THEN d.stateId END AS event
OPTIONAL MATCH (src)-[x:EXPRESSES]->(m:ProtectiveMove)
  WHERE (x.reviewStatus = 'approved' OR $drafts = true) AND (
       ${sessionSourceMatch('src', 'r', 'd')}
    OR (src:QuestionResponse AND r:CheckIn AND src.id IN coalesce(r.discResponseIds, []))
  )
WITH u, r, toolId, at, trigger, event,
     collect(DISTINCT CASE WHEN src IS NULL THEN null
                           ELSE {label: head([l IN labels(src) WHERE l IN $sourceLabels]), id: src.id} END) AS sources,
     collect(DISTINCT m.id) AS moveIds
OPTIONAL MATCH (u)-[:HAS_PART_TAG]->(t:PartTag)-[:TAGS]->(r)
OPTIONAL MATCH (t)-[:OF_PART]->(tp)
RETURN r.key AS key, toString(at) AS at, toolId, trigger, event, sources, moveIds, collect(DISTINCT tp.id) AS taggedPartIds
ORDER BY at, key
`;

/** Every `variable.property` TRAIL_RECORDS_QUERY reads (test-enforced). */
export const TRAIL_READ_PROPERTIES = [
  // ToolSession / CheckIn / detail sessions (u is the caller)
  'ownerId', 'status', 'toolId', 'startedAt', 'createdAt', 'timestamp', 'resultShownAt', 'key',
  'urgeIds', 'urgeId', 'ext', 'pull', 'stateId', 'dataJson', 'momentResponseIds', 'turningPointIds',
  'thoughtPatternIds', 'barriers', 'discResponseIds',
  // graph content and edges
  'id', 'flow', 'pullId', 'reviewStatus',
] as const;

export const TRAIL_USER_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  RETURN coalesce(u.partsEnabled, false) AS partsOn, u.timeZone AS timeZone
`;
export const TRAIL_RULES_QUERY = `
  MATCH (t:TrailRule)
  RETURN t {.id, .shape, .minEpisodes, .windowDays, .minSpanDays, .minTools, .contextShare, .withinHours, .lift,
            .cooldownDays, .enabled, .statementTemplate, approved: t.reviewStatus = 'approved' AND t.pending IS NULL} AS t
  ORDER BY t.id
`;
export const TRAIL_CONTEXTS_QUERY = `MATCH (c:TrailContext) RETURN c.id AS id, c.key AS key, c.value AS value, c.phrase AS phrase ORDER BY c.id`;
export const TRAIL_MOVES_QUERY = `
  MATCH (m:ProtectiveMove)
  RETURN m.id AS id, coalesce(m.offerable, false) AS offerable, coalesce(m.safetyLine, false) AS safetyLine, m.trailPhrase AS trailPhrase
  ORDER BY m.id
`;
export const TRAIL_PAIRS_QUERY = `MATCH (p:PolarityPair) RETURN p.id AS id, p.a AS a, p.b AS b ORDER BY p.id`;
export const TRAIL_POLICY_QUERY = `
  OPTIONAL MATCH (p:PartsPolicy {id: 'parts'})
  RETURN p.episodeMergeHours AS episodeMergeHours, p.louderPauseHours AS louderPauseHours, coalesce(p.offersEnabled, false) AS offersEnabled
`;

const num = (v: unknown): number | null => toNumber(v);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const SHAPES: readonly TrailShape[] = ['A', 'B', 'C', 'D'];
const KEYS: readonly TrailContextKey[] = ['trigger', 'event', 'timeBand'];

export function ruleFrom(t: Record<string, unknown>): TrailRule | null {
  const shape = String(t.shape) as TrailShape;
  if (!SHAPES.includes(shape) || typeof t.id !== 'string') return null;
  return {
    id: t.id, shape, minEpisodes: int(t.minEpisodes), windowDays: num(t.windowDays), minSpanDays: num(t.minSpanDays),
    minTools: num(t.minTools), contextShare: num(t.contextShare), withinHours: num(t.withinHours), lift: num(t.lift),
    cooldownDays: int(t.cooldownDays), enabled: t.enabled === true, approved: t.approved === true,
    statementTemplate: String(t.statementTemplate ?? ''),
  };
}

export interface TrailContent {
  rules: TrailRule[];
  contexts: TrailContextRow[];
  moves: TrailMove[];
  pairs: TrailPair[];
  policy: TrailPolicy;
  offersEnabled: boolean;
}

export async function readTrailContent(tx: Tx): Promise<TrailContent> {
  const rules = (await tx.run(TRAIL_RULES_QUERY)).records
    .map((r) => ruleFrom(r.get('t') as Record<string, unknown>)).filter((r): r is TrailRule => r !== null);
  const contexts = (await tx.run(TRAIL_CONTEXTS_QUERY)).records
    .map((r) => ({ id: String(r.get('id')), key: String(r.get('key')) as TrailContextKey, value: String(r.get('value')), phrase: String(r.get('phrase') ?? '') }))
    .filter((c) => KEYS.includes(c.key));
  const moves = (await tx.run(TRAIL_MOVES_QUERY)).records.map((r) => ({
    id: String(r.get('id')), offerable: r.get('offerable') === true, safetyLine: r.get('safetyLine') === true, trailPhrase: str(r.get('trailPhrase')),
  }));
  const pairs = (await tx.run(TRAIL_PAIRS_QUERY)).records.map((r) => ({ id: String(r.get('id')), a: String(r.get('a')), b: String(r.get('b')) }));
  const p = (await tx.run(TRAIL_POLICY_QUERY)).records[0];
  const policy: TrailPolicy = {
    episodeMergeHours: num(p?.get('episodeMergeHours')) ?? DEFAULT_TRAIL_POLICY.episodeMergeHours,
    louderPauseHours: num(p?.get('louderPauseHours')) ?? DEFAULT_TRAIL_POLICY.louderPauseHours,
  };
  return { rules, contexts, moves, pairs, policy, offersEnabled: p?.get('offersEnabled') === true };
}

/** The widest window the rules name (the records read covers it). */
export function readDays(rules: readonly TrailRule[]): number {
  const days = rules.map((r) => r.windowDays ?? 0).filter((d) => d > 0);
  return days.length ? Math.max(...days) : DEFAULT_WINDOW_DAYS;
}

/** One query row → a TrailRecord; contexts only when a TrailContext row phrases the value. */
export function toTrailRecord(row: Record<string, unknown>, contexts: readonly TrailContextRow[]): TrailRecord {
  const phrasable = (key: TrailContextKey, v: unknown) =>
    (typeof v === 'string' && contexts.some((c) => c.key === key && c.value === v) ? v : undefined);
  const trigger = phrasable('trigger', row.trigger);
  const event = phrasable('event', row.event);
  const sources = (Array.isArray(row.sources) ? row.sources : [])
    .filter((s): s is { label: string; id: string } => !!s && typeof (s as { label?: unknown }).label === 'string' && typeof (s as { id?: unknown }).id === 'string')
    .map((s) => ({ label: s.label, id: s.id }));
  return {
    key: String(row.key), at: String(row.at), toolId: String(row.toolId), sources,
    moveIds: [...new Set(strs(row.moveIds))].sort(),
    contexts: { ...(trigger ? { trigger } : {}), ...(event ? { event } : {}) },
    taggedPartIds: [...new Set(strs(row.taggedPartIds))].sort(),
  };
}

/** Rows sharing a key (a session with two DETAILs) merge into one record. */
function mergeByKey(records: TrailRecord[]): TrailRecord[] {
  const by = new Map<string, TrailRecord>();
  for (const r of records) {
    const prev = by.get(r.key);
    if (!prev) { by.set(r.key, r); continue; }
    by.set(r.key, {
      ...prev,
      sources: [...prev.sources, ...r.sources.filter((s) => !prev.sources.some((x) => x.label === s.label && x.id === s.id))],
      moveIds: [...new Set([...prev.moveIds, ...r.moveIds])].sort(),
      contexts: { ...r.contexts, ...prev.contexts },
      taggedPartIds: [...new Set([...prev.taggedPartIds, ...r.taggedPartIds])].sort(),
    });
  }
  return [...by.values()];
}

export async function readTrailRecords(
  tx: Tx, uid: string, opts: { days: number; drafts: boolean; contexts: readonly TrailContextRow[] },
): Promise<TrailRecord[]> {
  const r = await tx.run(TRAIL_RECORDS_QUERY, {
    uid, days: opts.days, drafts: opts.drafts, skipTools: [...SKIP_TOOLS], sourceLabels: [...SOURCE_LABELS],
  });
  return mergeByKey(r.records.map((rec) => toTrailRecord(rec.toObject() as Record<string, unknown>, opts.contexts)));
}

/** The claimed parts, through the profile slice only (parts off: none). */
export async function readClaimedParts(tx: ManagedTransaction, uid: string, now: number): Promise<ClaimedPart[]> {
  const { parts } = await readProfileSlices(tx, uid, 'today', now);
  return parts.map((p) => ({
    id: p.id, status: p.status, moveIds: p.moveIds, lastVisitedAt: p.lastVisitedAt ?? null,
    pausedUntil: p.pausedUntil ?? null, confirmedAt: p.meta.confirmedAt,
  }));
}

export interface TrailState extends TrailContent {
  partsOn: boolean;
  timeZone: string | null;
  records: TrailRecord[];
  parts: ClaimedPart[];
}

/** Everything the evaluator needs for one person, in one read transaction. Writes nothing. */
export async function readTrailState(tx: ManagedTransaction, uid: string, opts: { drafts?: boolean; now?: number } = {}): Promise<TrailState> {
  const now = opts.now ?? Date.now();
  const u = (await tx.run(TRAIL_USER_QUERY, { uid })).records[0];
  const content = await readTrailContent(tx);
  const records = await readTrailRecords(tx, uid, { days: readDays(content.rules), drafts: opts.drafts === true, contexts: content.contexts });
  const parts = await readClaimedParts(tx, uid, now);
  return { ...content, partsOn: u?.get('partsOn') === true, timeZone: str(u?.get('timeZone')), records, parts };
}
