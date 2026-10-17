/**
 * The query layer behind getInsightsData: Cypher plus record → row mapping, nothing else.
 * Every read runs in its own read transaction, so the handler's three user-data reads run in
 * parallel (as the pre-R1 version did with three sessions).
 */
import neo4j, { type Record as Neo4jRecord } from 'neo4j-driver';
import { readTx } from '../shared/neo4j';
import { toNumber } from '../shared/values';
import { normalizeToolId } from '../shared/toolIds';
import { partsFeel, partsReflect } from '../parts/stats';
import { readStatsRows } from '../parts/statsQueries';
import type { InsightsDeps } from './handler';
import type { ActedOnUrge, CheckInRow, LegacyUsageRow, SessionRow, ThenVsNow, TimeRange } from './types';

/** Days back for a range; null = everything. Passed as a parameter, never interpolated. */
export const rangeDays = (range: TimeRange): number | null => (range === '7d' ? 7 : range === 'all' ? null : 30);

export const CHECKINS_QUERY = `
  MATCH (u:User {id: $userId})-[:LOGGED]->(c:CheckIn)
  WHERE c.quadrant IS NOT NULL
    AND ($days IS NULL OR c.timestamp >= datetime() - duration({days: $days}))
  OPTIONAL MATCH (c)-[:SENSED]->(s:BodySensation)
  WITH c, collect(DISTINCT s.region) AS bodyRegions,
       collect(CASE WHEN size(coalesce(s.sensationIds, [])) > 0 THEN s.sensationIds ELSE s.tags END) AS tagArrays
  // Emotion families from the saved emotion ids (PR-C1; F12: c.emotion is a display string, and no
  // schema sets Emotion.dbtParent): DBT parent via HAS_REGULATION_CONTENT, else wheel family.
  OPTIONAL MATCH (e:Emotion) WHERE e.id IN coalesce(c.emotionIds, [])
  OPTIONAL MATCH (e)-[:HAS_REGULATION_CONTENT]->(rc:EmotionRegulationContent)
  WITH c, bodyRegions, tagArrays, collect(DISTINCT coalesce(e.dbtParent, rc.dbtParent, e.family)) AS families
  ORDER BY c.timestamp DESC
  RETURN c.id AS id, toString(c.timestamp) AS timestamp, c.emotion AS emotion,
         coalesce(c.emotionIds, []) AS emotionIds, c.quadrant AS quadrant,
         c.intensityX AS intensityX, c.intensityY AS intensityY, c.band AS band,
         c.activationPatternId AS activationPatternId, bodyRegions, tagArrays, families
`;

/**
 * Tool sessions (PR-S3). The pattern is the session's own, else its check-in's; the check-in is an
 * explicit link only (FROM_CHECKIN, else the id it was opened with).
 */
export const SESSIONS_QUERY = `
  MATCH (u:User {id: $userId})-[:HAS_TOOL_SESSION]->(ts:ToolSession)
  WHERE $days IS NULL OR coalesce(ts.endedAt, ts.startedAt) >= datetime() - duration({days: $days})
  OPTIONAL MATCH (ts)-[:FROM_CHECKIN]->(c:CheckIn)
  WITH ts, head(collect(c)) AS c
  RETURN ts.id AS id, ts.toolId AS toolId,
         coalesce(ts.patternId, c.activationPatternId) AS patternId,
         coalesce(c.id, ts.checkInId) AS checkInId,
         toString(coalesce(ts.endedAt, ts.startedAt)) AS at,
         ts.closeKind AS closeKind, ts.thenVsNow AS thenVsNow, ts.actedOnUrge AS actedOnUrge,
         // Cope Ahead: its after card's answer (the follow-up the visit scheduled, resolved).
         head([(ts)-[:SCHEDULED]->(f:FollowUp {type: 'cope_ahead_after'})
               WHERE f.status = 'done' AND f.planHelped IS NOT NULL | f.planHelped]) AS planHelped
  ORDER BY at DESC
`;

/** ToolUsage rows from before the spine: no ToolSession has them as its COMPAT_USAGE. */
export const LEGACY_USAGES_QUERY = `
  MATCH (u:User {id: $userId})-[:USED_TOOL]->(tu:ToolUsage)
  WHERE NOT ()-[:COMPAT_USAGE]->(tu)
    AND ($days IS NULL OR tu.timestamp >= datetime() - duration({days: $days}))
  OPTIONAL MATCH (tu)-[:FOLLOWED_CHECKIN]->(c:CheckIn)
  WITH tu, head(collect(c)) AS c
  RETURN tu.toolId AS toolId, tu.outcome AS outcome, toString(tu.timestamp) AS timestamp,
         c.activationPatternId AS patternId, c.id AS checkInId
  ORDER BY timestamp DESC
`;

export const CO_OCCURRENCE_QUERY = `
  MATCH (p1:ActivationPattern {id: $pid1})-[r:CO_OCCURS_WITH]-(p2:ActivationPattern {id: $pid2})
  RETURN r.combined_formulation_headline AS headline, r.combined_formulation_body AS body,
         r.combined_mechanism_narrative AS mechanism
  LIMIT 1
`;

export const PATTERN_FORMULATION_QUERY = `
  MATCH (p:ActivationPattern {id: $patternId})
  RETURN p.formulation_headline AS headline, p.formulation_body AS body, p.mechanism_narrative AS mechanism
`;

export const ESCALATION_QUERY = `
  MATCH (p1:ActivationPattern {id: $patternId})-[r:CAN_ESCALATE_TO]->(p2:ActivationPattern)
  OPTIONAL MATCH (tc:TherapyConcept {id: r.escalation_suggested_tool})
  RETURN r.escalation_narrative AS narrative, r.escalation_suggested_tool AS suggestedTool,
         p2.id AS targetPatternId, tc.appToolId AS suggestedAppTool
  LIMIT 1
`;

export const SOMATIC_NARRATIVE_QUERY = `
  OPTIONAL MATCH (ap:ActivationPattern {id: $pid})
  OPTIONAL MATCH (sq:SomaticQuadrantNarrative {id: $pid})
  RETURN ap.somatic_narrative AS patternNarrative, sq.narrative AS quadrantNarrative
`;

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0) : []);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const THEN_VS_NOW: readonly string[] = ['much_better', 'better', 'same', 'worse'];
const ACTED: readonly string[] = ['no', 'partly', 'yes', 'not_yet'];
const LEGACY: readonly string[] = ['helped', 'somewhat', 'not_really'];
const PLAN_HELPED: readonly string[] = ['helped', 'unsure', 'unused'];

export function checkInRow(r: Neo4jRecord): CheckInRow {
  return {
    id: r.get('id'),
    timestamp: r.get('timestamp'),
    emotion: (r.get('emotion') as string | null) ?? '',
    emotionIds: strs(r.get('emotionIds')),
    quadrant: r.get('quadrant'),
    intensityX: toNumber(r.get('intensityX')) ?? 0,
    intensityY: toNumber(r.get('intensityY')) ?? 0,
    band: strOrNull(r.get('band')),
    activationPatternId: strOrNull(r.get('activationPatternId')),
    bodyRegions: strs(r.get('bodyRegions')),
    sensationTags: ((r.get('tagArrays') || []) as unknown[]).flatMap(strs),
    families: strs(r.get('families')),
  };
}

export function sessionRow(r: Neo4jRecord): SessionRow {
  const tvn = r.get('thenVsNow');
  const acted = r.get('actedOnUrge');
  return {
    id: r.get('id'),
    toolId: (r.get('toolId') as string | null) ?? '',
    patternId: strOrNull(r.get('patternId')),
    checkInId: strOrNull(r.get('checkInId')),
    at: r.get('at'),
    closeKind: strOrNull(r.get('closeKind')),
    thenVsNow: THEN_VS_NOW.includes(tvn) ? (tvn as ThenVsNow) : null,
    actedOnUrge: ACTED.includes(acted) ? (acted as ActedOnUrge) : null,
    planHelped: PLAN_HELPED.includes(r.get('planHelped')) ? (r.get('planHelped') as SessionRow['planHelped']) : null,
  };
}

export function legacyUsageRow(r: Neo4jRecord): LegacyUsageRow {
  const outcome = r.get('outcome');
  return {
    toolId: (r.get('toolId') as string | null) ?? '',
    outcome: LEGACY.includes(outcome) ? (outcome as LegacyUsageRow['outcome']) : null,
    timestamp: r.get('timestamp'),
    patternId: strOrNull(r.get('patternId')),
    checkInId: strOrNull(r.get('checkInId')),
  };
}

const read = (query: string, params: Record<string, unknown>) => readTx((tx) => tx.run(query, params)).then((res) => res.records);

/** The production query layer for one user. */
export function graphDeps(userId: string): InsightsDeps {
  const byRange = (range: TimeRange) => {
    const days = rangeDays(range);
    return { userId, days: days === null ? null : neo4j.int(days) };
  };
  return {
    checkIns: async (range) => (await read(CHECKINS_QUERY, byRange(range))).map(checkInRow),
    sessions: async (range) => (await read(SESSIONS_QUERY, byRange(range))).map(sessionRow),
    legacyUsages: async (range) => (await read(LEGACY_USAGES_QUERY, byRange(range))).map(legacyUsageRow),
    async coOccurrenceFormulation(pid1, pid2) {
      const r = (await read(CO_OCCURRENCE_QUERY, { pid1, pid2 }))[0];
      return r?.get('headline') ? { headline: r.get('headline'), body: r.get('body') ?? '', mechanism: r.get('mechanism') ?? '' } : null;
    },
    async patternFormulation(patternId) {
      const r = (await read(PATTERN_FORMULATION_QUERY, { patternId }))[0];
      return r?.get('headline') ? { headline: r.get('headline'), body: r.get('body') ?? '', mechanism: r.get('mechanism') ?? '' } : null;
    },
    async escalation(patternId) {
      const r = (await read(ESCALATION_QUERY, { patternId }))[0];
      if (!r?.get('narrative')) return null;
      const raw = r.get('suggestedTool') as string | null;
      return {
        narrative: r.get('narrative'),
        suggestedTool: (r.get('suggestedAppTool') as string | null) || (raw ? normalizeToolId(raw) : null),
        targetPatternId: r.get('targetPatternId'),
      };
    },
    // Parts (all time, parts on only): the stats module's reads in one transaction, then its compute.
    // Optional and new: a failed read logs and leaves the section out, never the rest of Reflect.
    async parts() {
      try {
        const rows = await readTx((tx) => readStatsRows(tx, userId));
        return { parts: partsReflect(rows), feel: partsFeel(rows, new Date()) };
      } catch (e) {
        console.error('getInsightsData parts failed', (e as { code?: string } | null)?.code ?? 'unknown');
        return null;
      }
    },
    async somaticNarrative(pid) {
      const r = (await read(SOMATIC_NARRATIVE_QUERY, { pid }))[0];
      return (r?.get('patternNarrative') as string | null) || (r?.get('quadrantNarrative') as string | null) || '';
    },
  };
}
