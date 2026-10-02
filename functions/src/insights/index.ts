/**
 * Insights dashboard data.
 * Moved verbatim from the single-file functions/src/index.ts (A1-2); deploy names are the export names.
 */
import { intensityDrop, intensityTrending } from './intensity';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Record as Neo4jRecord } from 'neo4j-driver';
import { getDriver, neo4jUri, neo4jUser, neo4jPassword } from '../shared/neo4j';
import { toNumber } from '../shared/values';
import { normalizeToolId } from '../shared/toolIds';

// ============================================
// INSIGHTS DATA
// ============================================

/**
 * Get all insights data for the Insights page in a single call.
 * Computes formulation, proactive alert, growth evidence, somatic correlation,
 * tool effectiveness, and continuity prompt.
 */
export const getInsightsData = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const timeRange: string = request.data?.timeRange || '30d';
    const driver = getDriver();

    // Neo4j sessions can only run one query at a time, so use separate sessions for parallel queries
    const session1 = driver.session();
    const session2 = driver.session();
    const session3 = driver.session();
    let seqSession: ReturnType<typeof driver.session> | null = null;

    try {
      // Run parallel queries for raw data
      // Build time filter clause based on timeRange parameter
      const timeFilterDays = timeRange === '7d' ? 7 : timeRange === 'all' ? null : 30;
      const checkInTimeFilter = timeFilterDays !== null
        ? `WHERE c.timestamp >= datetime() - duration({days: ${timeFilterDays}})`
        : '';
      const toolTimeFilter = timeFilterDays !== null
        ? `WHERE tu.timestamp >= datetime() - duration({days: ${timeFilterDays}})`
        : '';

      const [checkInsResult, toolUsageResult, continuityResult] = await Promise.all([
        // 1. Recent check-ins (filtered by time range)
        session1.run(
          `
          MATCH (u:User {id: $userId})-[:LOGGED]->(c:CheckIn)
          ${checkInTimeFilter ? `${checkInTimeFilter} AND c.quadrant IS NOT NULL` : 'WHERE c.quadrant IS NOT NULL'}
          OPTIONAL MATCH (c)-[:SENSED]->(s:BodySensation)
          WITH c, collect(DISTINCT s.region) AS bodyRegions, collect(CASE WHEN size(coalesce(s.sensationIds, [])) > 0 THEN s.sensationIds ELSE s.tags END) AS tagArrays
          // Emotion families from the saved emotion ids (PR-C1; F12: c.emotion is a display string,
          // and no schema sets Emotion.dbtParent): DBT parent via HAS_REGULATION_CONTENT, else wheel family.
          OPTIONAL MATCH (e:Emotion) WHERE e.id IN coalesce(c.emotionIds, [])
          OPTIONAL MATCH (e)-[:HAS_REGULATION_CONTENT]->(rc:EmotionRegulationContent)
          WITH c, bodyRegions, tagArrays, collect(DISTINCT coalesce(e.dbtParent, rc.dbtParent, e.family)) AS families
          ORDER BY c.timestamp DESC
          RETURN c.id AS id,
                 toString(c.timestamp) AS timestamp,
                 c.emotion AS emotion,
                 c.quadrant AS quadrant,
                 c.intensityX AS intensityX,
                 c.intensityY AS intensityY,
                 c.band AS band,
                 c.activationPatternId AS activationPatternId,
                 bodyRegions,
                 tagArrays,
                 families
          `,
          { userId }
        ),
        // 2. Tool usage with outcomes (filtered by time range)
        session2.run(
          `
          MATCH (u:User {id: $userId})-[:USED_TOOL]->(tu:ToolUsage)
          ${toolTimeFilter}
          OPTIONAL MATCH (tu)-[:FOLLOWED_CHECKIN]->(c:CheckIn)
          RETURN tu.toolId AS toolId,
                 tu.outcome AS outcome,
                 toString(tu.timestamp) AS timestamp,
                 c.activationPatternId AS patternId,
                 c.id AS checkInId
          ORDER BY tu.timestamp DESC
          `,
          { userId }
        ),
        // 3. Continuity prompt — most recent unrated ToolUsage with a linked check-in
        session3.run(
          `
          MATCH (u:User {id: $userId})-[:USED_TOOL]->(tu:ToolUsage)-[:FOLLOWED_CHECKIN]->(c:CheckIn)
          WHERE tu.outcome IS NULL
          WITH c, tu ORDER BY tu.timestamp DESC LIMIT 1
          RETURN tu.toolId AS toolId, toString(tu.timestamp) AS toolTimestamp,
                 c.emotion AS checkInEmotion, toString(c.timestamp) AS checkInTimestamp
          `,
          { userId }
        ),
      ]);

      // Parse check-ins
      const checkIns = checkInsResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        timestamp: r.get('timestamp'),
        emotion: r.get('emotion'),
        quadrant: r.get('quadrant'),
        intensityX: toNumber(r.get('intensityX')) ?? 0,
        intensityY: toNumber(r.get('intensityY')) ?? 0,
        band: (r.get('band') as string | null) ?? null,
        activationPatternId: r.get('activationPatternId') || null,
        bodyRegions: (r.get('bodyRegions') || []).filter(Boolean) as string[],
        sensationTags: ((r.get('tagArrays') || []) as string[][]).flat().filter(Boolean) as string[],
        families: ((r.get('families') || []) as Array<string | null>).filter(Boolean) as string[],
      }));

      // Parse tool usage
      const toolUsages = toolUsageResult.records.map((r: Neo4jRecord) => ({
        toolId: r.get('toolId'),
        outcome: r.get('outcome') || null,
        timestamp: r.get('timestamp'),
        patternId: r.get('patternId') || null,
        checkInId: r.get('checkInId') || null,
      }));

      // Parse continuity
      const continuityRec = continuityResult.records[0];
      const continuityPrompt = continuityRec ? {
        toolId: continuityRec.get('toolId'),
        toolTimestamp: continuityRec.get('toolTimestamp'),
        checkInEmotion: continuityRec.get('checkInEmotion'),
        checkInTimestamp: continuityRec.get('checkInTimestamp'),
      } : null;

      // Close parallel sessions, open one for sequential follow-up queries
      await Promise.all([session1.close(), session2.close(), session3.close()]);
      const session = driver.session();
      seqSession = session;

      // ── Thresholds scaled by time range ──
      const thresholds = timeRange === '7d' ? {
        coOccurrenceMin: 1,        // patterns appear 1+ times each
        dominantRepeatMin: 1,      // show alert / use dominant at 1+
        growthCheckIns: 2,         // need 2+ check-ins
        growthDaySpan: 2,          // across 2+ days
        growthHalfMin: 1,          // each half needs 1+
        emotionVocabMin: 2,        // emotion count threshold
        emotionFamilyMin: 2,       // family count threshold
        intensityDropMin: 0.05,    // smaller intensity drop is meaningful
        sensationTagDelta: 1,      // tags gained threshold
        sensationTagMin: 2,        // minimum tag count
        bodyAvgDelta: 0.2,         // body region avg delta
        bodyAvgMin: 0.3,           // minimum body avg
        followThroughRate: 0.3,    // lower bar for follow-through
        followThroughCount: 1,     // 1+ tool uses
        toolRepertoireMin: 2,      // 2+ tools
        outcomeCountMin: 1,        // 1+ rated outcome
        somaticCheckInMin: 1,      // 1+ check-in with body data
        somaticRegionCount: 1,     // region appears 1+ time
        somaticFallbackMin: 2,     // fallback threshold
      } : timeRange === 'all' ? {
        coOccurrenceMin: 4,
        dominantRepeatMin: 3,
        growthCheckIns: 8,
        growthDaySpan: 14,
        growthHalfMin: 3,
        emotionVocabMin: 5,
        emotionFamilyMin: 4,
        intensityDropMin: 0.10,
        sensationTagDelta: 3,
        sensationTagMin: 5,
        bodyAvgDelta: 0.5,
        bodyAvgMin: 0.8,
        followThroughRate: 0.4,
        followThroughCount: 5,
        toolRepertoireMin: 4,
        outcomeCountMin: 3,
        somaticCheckInMin: 3,
        somaticRegionCount: 3,
        somaticFallbackMin: 4,
      } : {
        // 30d — current defaults
        coOccurrenceMin: 2,
        dominantRepeatMin: 2,
        growthCheckIns: 4,
        growthDaySpan: 5,
        growthHalfMin: 2,
        emotionVocabMin: 3,
        emotionFamilyMin: 3,
        intensityDropMin: 0.08,
        sensationTagDelta: 2,
        sensationTagMin: 3,
        bodyAvgDelta: 0.3,
        bodyAvgMin: 0.5,
        followThroughRate: 0.4,
        followThroughCount: 3,
        toolRepertoireMin: 3,
        outcomeCountMin: 2,
        somaticCheckInMin: 2,
        somaticRegionCount: 2,
        somaticFallbackMin: 3,
      };

      // ── Compute pattern frequencies ──
      const patternCounts: Record<string, number> = {};
      for (const ci of checkIns) {
        if (ci.activationPatternId) {
          patternCounts[ci.activationPatternId] = (patternCounts[ci.activationPatternId] || 0) + 1;
        }
      }
      const patternFrequencies = Object.entries(patternCounts)
        .map(([patternId, count]) => ({ patternId, count }))
        .sort((a, b) => b.count - a.count);

      // ── Compute formulation ──
      // Use selected time window. Show formulation if ANY pattern exists (even 1 check-in).
      // Filter out positive_state — it's a fallback for pleasant quadrants, not a clinical
      // pattern in the graph. Leaving it in blocks formulation when it's the dominant count.
      const sortedPatterns = Object.entries(patternCounts)
        .filter(([id]) => id !== 'positive_state')
        .sort((a, b) => b[1] - a[1]);
      const dominantPattern = sortedPatterns[0]; // may be count=1
      const secondaryPattern = sortedPatterns[1];

      let formulation = null;

      // Co-occurrence: both patterns appear enough times
      if (dominantPattern && secondaryPattern && dominantPattern[1] >= thresholds.coOccurrenceMin && secondaryPattern[1] >= thresholds.coOccurrenceMin) {
        const coResult = await session.run(
          `
          MATCH (p1:ActivationPattern {id: $pid1})-[r:CO_OCCURS_WITH]-(p2:ActivationPattern {id: $pid2})
          RETURN r.combined_formulation_headline AS headline,
                 r.combined_formulation_body AS body,
                 r.combined_mechanism_narrative AS mechanism
          LIMIT 1
          `,
          { pid1: dominantPattern[0], pid2: secondaryPattern[0] }
        );

        if (coResult.records.length > 0 && coResult.records[0].get('headline')) {
          const rec = coResult.records[0];
          const effectiveTools = getEffectiveToolsForPattern(toolUsages, dominantPattern[0]);
          formulation = {
            type: 'co_occurrence' as const,
            primaryPatternId: dominantPattern[0],
            secondaryPatternId: secondaryPattern[0],
            headline: rec.get('headline'),
            body: rec.get('body'),
            mechanism: rec.get('mechanism'),
            effectiveTools,
            episodeCount: dominantPattern[1],
          };
        }
      }

      // Single pattern formulation — show for ANY pattern, even count=1
      // Use dominant if 2+, otherwise use most recent check-in's pattern
      if (!formulation && dominantPattern) {
        const patternIdToUse = dominantPattern[1] >= thresholds.dominantRepeatMin
          ? dominantPattern[0]
          : (checkIns.find(ci => ci.activationPatternId)?.activationPatternId || dominantPattern[0]);

        const patResult = await session.run(
          `
          MATCH (p:ActivationPattern {id: $patternId})
          RETURN p.formulation_headline AS headline,
                 p.formulation_body AS body,
                 p.mechanism_narrative AS mechanism
          `,
          { patternId: patternIdToUse }
        );

        if (patResult.records.length > 0 && patResult.records[0].get('headline')) {
          const rec = patResult.records[0];
          const effectiveTools = getEffectiveToolsForPattern(toolUsages, patternIdToUse);
          const count = patternCounts[patternIdToUse] || 1;
          formulation = {
            type: 'single' as const,
            primaryPatternId: patternIdToUse,
            secondaryPatternId: null,
            headline: rec.get('headline'),
            body: rec.get('body'),
            mechanism: rec.get('mechanism'),
            effectiveTools,
            episodeCount: count,
          };
        }
      }

      // ── Compute proactive alert ──
      let proactiveAlert = null;

      if (dominantPattern) {
        // Check for escalation path from the dominant (or most recent) pattern
        const escResult = await session.run(
          `
          MATCH (p1:ActivationPattern {id: $patternId})-[r:CAN_ESCALATE_TO]->(p2:ActivationPattern)
          OPTIONAL MATCH (tc:TherapyConcept {id: r.escalation_suggested_tool})
          RETURN r.escalation_narrative AS narrative,
                 r.escalation_suggested_tool AS suggestedTool,
                 p2.id AS targetPatternId,
                 tc.appToolId AS suggestedAppTool
          LIMIT 1
          `,
          { patternId: dominantPattern[0] }
        );

        if (escResult.records.length > 0 && escResult.records[0].get('narrative')) {
          const rec = escResult.records[0];
          // Check intensity trend (are recent check-ins getting more intense?)
          const patternCheckIns = checkIns
            .filter(ci => ci.activationPatternId === dominantPattern[0]);

          // Banded check-ins only (A4-3): the old constant 0.5 must not read as a trend.
          const trending = intensityTrending(patternCheckIns);

          if (trending || dominantPattern[1] >= thresholds.dominantRepeatMin) {
            proactiveAlert = {
              narrative: rec.get('narrative'),
              suggestedTool: rec.get('suggestedAppTool') || normalizeToolId(rec.get('suggestedTool')),
              sourcePatternId: dominantPattern[0],
              targetPatternId: rec.get('targetPatternId'),
            };
          }
        }
      }

      // ── Compute growth evidence ──
      // Split check-ins into two halves (older vs newer). Needs 4+ total over 5+ days.
      let growthEvidence = null;

      if (checkIns.length >= thresholds.growthCheckIns) {
        const sorted = [...checkIns].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        const firstTs = new Date(sorted[0].timestamp).getTime();
        const lastTs = new Date(sorted[sorted.length - 1].timestamp).getTime();
        const daySpan = (lastTs - firstTs) / (1000 * 60 * 60 * 24);

        if (daySpan >= thresholds.growthDaySpan) {
          const mid = Math.floor(sorted.length / 2);
          const olderHalf = sorted.slice(0, mid);
          const newerHalf = sorted.slice(mid);
          const midTimestamp = sorted[mid].timestamp;

          if (olderHalf.length >= thresholds.growthHalfMin && newerHalf.length >= thresholds.growthHalfMin) {
            const insights: Array<{ key: string; text: string; data: Record<string, number> }> = [];

            // 1. Emotional vocabulary expanding
            const olderEmotions = new Set(olderHalf.map(ci => ci.emotion));
            const newerEmotions = new Set(newerHalf.map(ci => ci.emotion));
            if (newerEmotions.size > olderEmotions.size && newerEmotions.size >= thresholds.emotionVocabMin) {
              insights.push({
                key: 'emotion-vocabulary',
                text: 'Naming emotions precisely is itself a regulation skill.',
                data: { current: newerEmotions.size, previous: olderEmotions.size },
              });
            }

            // 2. Emotion family breadth
            const olderFamilies = new Set(olderHalf.flatMap(ci => ci.families));
            const newerFamilies = new Set(newerHalf.flatMap(ci => ci.families));
            if (newerFamilies.size > olderFamilies.size && newerFamilies.size >= thresholds.emotionFamilyMin) {
              insights.push({
                key: 'emotion-family-breadth',
                text: "You're not collapsing everything into one feeling.",
                data: { current: newerFamilies.size, previous: olderFamilies.size },
              });
            }

            // 3. Catching it earlier (intensity drop)
            // Banded check-ins only, ≥2 per half (A4-3); otherwise the metric is skipped.
            const drop = intensityDrop(olderHalf, newerHalf, thresholds.intensityDropMin);
            if (drop) {
              insights.push({
                key: 'catching-earlier',
                text: "You're catching things before they escalate.",
                data: { current: Math.round(drop.current * 100), previous: Math.round(drop.previous * 100) },
              });
            }

            // 4. Activation pattern diversity
            const olderPatterns = new Set(olderHalf.map(ci => ci.activationPatternId).filter(Boolean));
            const newerPatterns = new Set(newerHalf.map(ci => ci.activationPatternId).filter(Boolean));
            if (olderPatterns.size <= 2 && newerPatterns.size > olderPatterns.size) {
              insights.push({
                key: 'pattern-diversity',
                text: "You're reading your internal signals more accurately.",
                data: { current: newerPatterns.size, previous: olderPatterns.size },
              });
            }

            // 5. Body sensation richness (tag variety)
            const olderTags = new Set(olderHalf.flatMap(ci => ci.sensationTags));
            const newerTags = new Set(newerHalf.flatMap(ci => ci.sensationTags));
            if (newerTags.size > olderTags.size + thresholds.sensationTagDelta && newerTags.size >= thresholds.sensationTagMin) {
              insights.push({
                key: 'sensation-richness',
                text: "More body detail means earlier warning signals.",
                data: { current: newerTags.size, previous: olderTags.size },
              });
            }

            // 6. Body region awareness
            const olderBodyAvg = olderHalf.reduce((s, ci) => s + ci.bodyRegions.length, 0) / olderHalf.length;
            const recentBodyAvg = newerHalf.reduce((s, ci) => s + ci.bodyRegions.length, 0) / newerHalf.length;
            if (recentBodyAvg > olderBodyAvg + thresholds.bodyAvgDelta && recentBodyAvg > thresholds.bodyAvgMin) {
              insights.push({
                key: 'body-awareness',
                text: "Growing body awareness gives you a head start.",
                data: { current: Math.round(recentBodyAvg * 10) / 10, previous: Math.round(olderBodyAvg * 10) / 10 },
              });
            }

            // 7. Tool follow-through (check-ins that led to tool use)
            const checkInIds = new Set(checkIns.map(ci => ci.id));
            const checkInsWithToolFollow = new Set(
              toolUsages.filter(tu => tu.checkInId && checkInIds.has(tu.checkInId)).map(tu => tu.checkInId)
            );
            const followThroughRate = checkInsWithToolFollow.size / checkIns.length;
            if (followThroughRate >= thresholds.followThroughRate && checkInsWithToolFollow.size >= thresholds.followThroughCount) {
              insights.push({
                key: 'tool-follow-through',
                text: "Notice it, then do something about it — that's the whole loop.",
                data: { numerator: checkInsWithToolFollow.size, denominator: checkIns.length },
              });
            }

            // 8. Tool repertoire broadening
            const olderToolIds = new Set(
              toolUsages.filter(tu => tu.timestamp < midTimestamp).map(tu => tu.toolId)
            );
            const newerToolIds = new Set(
              toolUsages.filter(tu => tu.timestamp >= midTimestamp).map(tu => tu.toolId)
            );
            if (newerToolIds.size > olderToolIds.size && newerToolIds.size >= thresholds.toolRepertoireMin) {
              insights.push({
                key: 'tool-repertoire',
                text: "More options for different situations.",
                data: { current: newerToolIds.size, previous: olderToolIds.size },
              });
            }

            // 9. Positive outcomes increasing
            const olderOutcomes = toolUsages.filter(tu => tu.timestamp < midTimestamp && tu.outcome);
            const newerOutcomes = toolUsages.filter(tu => tu.timestamp >= midTimestamp && tu.outcome);
            if (newerOutcomes.length >= thresholds.outcomeCountMin) {
              const newerPositiveRate = newerOutcomes.filter(tu => tu.outcome === 'helped').length / newerOutcomes.length;
              const olderPositiveRate = olderOutcomes.length >= thresholds.outcomeCountMin
                ? olderOutcomes.filter(tu => tu.outcome === 'helped').length / olderOutcomes.length
                : 0;
              if (newerPositiveRate > olderPositiveRate && newerPositiveRate >= 0.5) {
                insights.push({
                  key: 'positive-outcomes',
                  text: "What you're doing is working.",
                  data: { current: Math.round(newerPositiveRate * 100), previous: Math.round(olderPositiveRate * 100) },
                });
              }
            }

            if (insights.length > 0) {
              growthEvidence = { insights };
            }
          }
        }
      }

      // ── Compute somatic correlation ──
      // Threshold: 2+ check-ins with body data. Uses pattern if available, falls back to quadrant.
      let somaticCorrelation = null;

      const checkInsWithBody = checkIns.filter(ci => ci.bodyRegions.length > 0);
      if (checkInsWithBody.length >= thresholds.somaticCheckInMin) {
        const regionKeyMap: Record<string, Record<string, number>> = {};
        for (const ci of checkInsWithBody) {
          // Use pattern if available, otherwise use quadrant as grouping key
          const key = ci.activationPatternId || ci.quadrant;
          for (const region of ci.bodyRegions) {
            if (!regionKeyMap[region]) regionKeyMap[region] = {};
            regionKeyMap[region][key] = (regionKeyMap[region][key] || 0) + 1;
          }
        }

        const correlations: Array<{ region: string; patternId: string; count: number }> = [];
        for (const [region, keys] of Object.entries(regionKeyMap)) {
          const top = Object.entries(keys).sort((a, b) => b[1] - a[1])[0];
          if (top && top[1] >= thresholds.somaticRegionCount) {
            correlations.push({ region, patternId: top[0], count: top[1] });
          }
        }

        // If strict 2+ threshold finds nothing, show any region that appears 2+ times total
        if (correlations.length === 0 && checkInsWithBody.length >= thresholds.somaticFallbackMin) {
          const regionTotals: Record<string, number> = {};
          for (const ci of checkInsWithBody) {
            for (const region of ci.bodyRegions) {
              regionTotals[region] = (regionTotals[region] || 0) + 1;
            }
          }
          for (const [region, count] of Object.entries(regionTotals)) {
            if (count >= thresholds.somaticRegionCount) {
              // Find most common quadrant for this region
              const quadrantCounts: Record<string, number> = {};
              for (const ci of checkInsWithBody) {
                if (ci.bodyRegions.includes(region)) {
                  quadrantCounts[ci.quadrant] = (quadrantCounts[ci.quadrant] || 0) + 1;
                }
              }
              const topQ = Object.entries(quadrantCounts).sort((a, b) => b[1] - a[1])[0];
              correlations.push({ region, patternId: topQ[0], count });
            }
          }
        }

        if (correlations.length > 0) {
          const sorted = correlations.sort((a, b) => b.count - a.count).slice(0, 3);
          const topPatternId = sorted[0].patternId;

          // Query somatic narrative from graph — try ActivationPattern first, fall back to SomaticQuadrantNarrative
          let somaticNarrative = "";
          const narrativeResult = await session.run(
            `OPTIONAL MATCH (ap:ActivationPattern {id: $pid})
             OPTIONAL MATCH (sq:SomaticQuadrantNarrative {id: $pid})
             RETURN ap.somatic_narrative AS patternNarrative, sq.narrative AS quadrantNarrative`,
            { pid: topPatternId }
          );
          if (narrativeResult.records.length > 0) {
            const rec = narrativeResult.records[0];
            somaticNarrative = rec.get("patternNarrative") || rec.get("quadrantNarrative") || "";
          }

          somaticCorrelation = {
            correlations: sorted,
            narrative: somaticNarrative,
          };
        }
      }

      // ── Compute tool effectiveness ──
      let toolEffectiveness = null;

      const usagesWithOutcome = toolUsages.filter(tu => tu.outcome);
      if (usagesWithOutcome.length >= 1) {
        const toolOutcomes: Record<string, { helped: number; somewhat: number; not_really: number; total: number }> = {};
        for (const tu of usagesWithOutcome) {
          if (!toolOutcomes[tu.toolId]) {
            toolOutcomes[tu.toolId] = { helped: 0, somewhat: 0, not_really: 0, total: 0 };
          }
          toolOutcomes[tu.toolId][tu.outcome as 'helped' | 'somewhat' | 'not_really']++;
          toolOutcomes[tu.toolId].total++;
        }

        const tools = Object.entries(toolOutcomes)
          .filter(([, data]) => data.total >= 1)
          .map(([toolId, data]) => ({
            toolId,
            helpedPct: Math.round(((data.helped + data.somewhat * 0.5) / data.total) * 100),
            totalUses: data.total,
          }))
          .sort((a, b) => b.helpedPct - a.helpedPct)
          .slice(0, 4);

        if (tools.length > 0) {
          toolEffectiveness = { tools };
        }
      }

      return {
        formulation,
        proactiveAlert,
        growthEvidence,
        somaticCorrelation,
        toolEffectiveness,
        continuityPrompt,
        patternFrequencies,
        totalCheckIns: checkIns.length,
      };
    } catch (error) {
      console.error('Error getting insights data:', error);
      throw new HttpsError('internal', 'Failed to get insights data');
    } finally {
      await Promise.all([
        session1.close().catch(() => {}),
        session2.close().catch(() => {}),
        session3.close().catch(() => {}),
        seqSession?.close().catch(() => {}),
      ]);
    }
  }
);

/** Helper: find tools that helped for a given pattern */
function getEffectiveToolsForPattern(
  toolUsages: Array<{ toolId: string; outcome: string | null; patternId: string | null }>,
  patternId: string
): string[] {
  const toolScores: Record<string, number> = {};
  for (const tu of toolUsages) {
    if (tu.patternId === patternId && tu.outcome) {
      const score = tu.outcome === 'helped' ? 1 : tu.outcome === 'somewhat' ? 0.5 : 0;
      toolScores[tu.toolId] = (toolScores[tu.toolId] || 0) + score;
    }
  }
  return Object.entries(toolScores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([toolId]) => toolId);
}
