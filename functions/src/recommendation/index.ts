/**
 * Check-in result: activation pattern, tools, discriminating questions, related emotions.
 * Moved verbatim from the single-file functions/src/index.ts (A1-2); deploy names are the export names.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Record as Neo4jRecord } from 'neo4j-driver';
import { getDriver, readTx } from '../shared/neo4j';
import { callable } from '../shared/callable';
import { parseOrInvalid } from '../shared/errors';
import { getStateAndToolsHandler, PatternNotFoundError } from './handler';
import { graphDeps } from './queries';
import { isWarmRequest, parseStateRequest } from './validation';
import type { StateResult } from './types';
import { CALL_OPTS } from '../shared/callOptions';

// ============================================
// KNOWLEDGE GRAPH QUERY FUNCTIONS
// These power the neural state matching and tool recommendations
// ============================================

/**
 * Get the activation pattern and recommended tools based on check-in data
 * This is the main "What's happening right now" query.
 *
 * The logic lives in pure modules behind getStateAndToolsHandler (E4-1): pattern selection
 * (patternScoring.ts), the tool step (select.ts by pattern × band when RoutingPolicy is enabled,
 * else the legacy ranker in legacy.ts: the kill switch), the crisis-flag seam
 * (../safety/checkinSafetyFlag.ts, unchanged). This callable validates, then supplies the query
 * layer (queries.ts) in one read transaction. Signed-in only since E4-3 (plan F9, D-12).
 */
export const getStateAndTools = callable<unknown, StateResult | { warm: true }>(
  { auth: 'required', label: 'getStateAndTools', errorMessage: 'Failed to analyze emotional state' },
  async ({ data }) => {
    // Warm-up (isWarmRequest): open the Neo4j connection with a trivial read and answer at once.
    // No routing, no log line, nothing stored.
    if (isWarmRequest(data)) {
      await readTx((tx) => tx.run('RETURN 1 AS ok'));
      return { warm: true as const };
    }
    const input = parseOrInvalid(() => parseStateRequest(data), 'Invalid check-in');
    let result: StateResult;
    try {
      result = await readTx((tx) => getStateAndToolsHandler(input, graphDeps(tx)));
    } catch (error) {
      if (error instanceof PatternNotFoundError) throw new HttpsError('not-found', error.message);
      throw error;
    }
    // One structured line per result: what was routed and why (ids and enums only, never the words).
    const r = result.routing;
    console.log('getStateAndTools', JSON.stringify({
      patternId: result.pattern.id,
      secondaryPatternId: result.secondaryPattern?.id ?? null,
      version: r?.version ?? null,
      band: r?.band ?? null,
      bandSource: r?.bandSource ?? null,
      blank: r?.blank ?? null,
      surface: r?.surface ?? null,
      toolIds: result.tools.map((t) => t.id),
      ruleIds: r?.ruleIds ?? [],
      filtered: r?.filtered ?? [],
      receiveFirst: r?.receiveFirst ?? null,
      safetyFlag: result.safetyFlag?.type ?? null,
    }));
    return result;
  },
);

/**
 * Get discriminating questions for a quadrant.
 * Returns questions with their responses and conditional flow (TRIGGERS_NEXT).
 */
export const getDiscriminatingQuestions = onCall(
  CALL_OPTS,
  async (request): Promise<{ questions: Array<{
    id: string;
    text: string;
    subtext: string;
    order: number;
    required: boolean;
    responses: Array<{
      id: string;
      label: string;
      subtext: string;
      order: number;
      isEscapeHatch: boolean;
      triggersNextQuestionId?: string;
    }>;
  }> }> => {
    const { quadrant } = request.data as { quadrant: string };

    if (!quadrant) {
      throw new HttpsError('invalid-argument', 'Quadrant is required');
    }

    const session = getDriver().session();
    try {
      const query = `
        MATCH (q:DiscriminatingQuestion)-[hr:HAS_RESPONSE]->(r:QuestionResponse)
        WHERE $quadrant IN q.applicableQuadrants
        OPTIONAL MATCH (r)-[:TRIGGERS_NEXT]->(nextQ:DiscriminatingQuestion)
        RETURN q.id as questionId,
               q.text as questionText,
               q.subtext as questionSubtext,
               q.order as questionOrder,
               q.required as questionRequired,
               r.id as responseId,
               r.label as responseLabel,
               r.subtext as responseSubtext,
               r.order as responseOrder,
               r.isEscapeHatch as isEscapeHatch,
               nextQ.id as triggersNextQuestionId
        ORDER BY q.order, r.order
      `;

      const result = await session.run(query, { quadrant });

      // Group by question
      const questionsMap = new Map<string, {
        id: string;
        text: string;
        subtext: string;
        order: number;
        required: boolean;
        responses: Array<{
          id: string;
          label: string;
          subtext: string;
          order: number;
          isEscapeHatch: boolean;
          triggersNextQuestionId?: string;
        }>;
      }>();

      for (const rec of result.records) {
        const qId = rec.get('questionId') as string;
        if (!questionsMap.has(qId)) {
          questionsMap.set(qId, {
            id: qId,
            text: rec.get('questionText'),
            subtext: rec.get('questionSubtext'),
            order: typeof rec.get('questionOrder') === 'object'
              ? (rec.get('questionOrder') as { toNumber: () => number }).toNumber()
              : Number(rec.get('questionOrder')),
            required: rec.get('questionRequired') as boolean,
            responses: [],
          });
        }

        const nextQId = rec.get('triggersNextQuestionId') as string | null;
        questionsMap.get(qId)!.responses.push({
          id: rec.get('responseId'),
          label: rec.get('responseLabel'),
          subtext: rec.get('responseSubtext'),
          order: typeof rec.get('responseOrder') === 'object'
            ? (rec.get('responseOrder') as { toNumber: () => number }).toNumber()
            : Number(rec.get('responseOrder')),
          isEscapeHatch: rec.get('isEscapeHatch') as boolean,
          ...(nextQId ? { triggersNextQuestionId: nextQId } : {}),
        });
      }

      const questions = Array.from(questionsMap.values())
        .sort((a, b) => a.order - b.order);

      return { questions };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error getting discriminating questions:', errorMessage);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', `Failed to get discriminating questions: ${errorMessage}`);
    } finally {
      await session.close();
    }
  }
);

/**
 * Get related emotions based on shared neural substrates
 * Powers the "You might also be feeling..." feature
 */
export const getRelatedEmotions = onCall(
  CALL_OPTS,
  async (request): Promise<{ relatedEmotions: Array<{ id: string; name: string; reason: string }> }> => {
    const { emotionId, quadrant } = request.data as { emotionId: string; quadrant?: string };

    if (!emotionId) {
      throw new HttpsError('invalid-argument', 'Emotion ID is required');
    }

    const session = getDriver().session();
    try {
      const query = `
        MATCH (e1:Emotion {id: $emotionId})

        // 1) Explicit opposite relationships
        OPTIONAL MATCH (e1)-[:OPPOSITE_OF]-(opp:Emotion)
        WHERE opp.id <> e1.id
          ${quadrant ? 'AND opp.quadrant = $quadrant' : ''}
        WITH e1, collect(DISTINCT {
          id: opp.id,
          name: opp.name,
          reason: 'opposite emotion',
          score: 5
        }) AS oppositeRows

        // 2) Explicit related relationships (same wheel branch, etc.)
        OPTIONAL MATCH (e1)-[:RELATED_TO]-(rel:Emotion)
        WHERE rel.id <> e1.id
          ${quadrant ? 'AND rel.quadrant = $quadrant' : ''}
        WITH e1, oppositeRows, collect(DISTINCT {
          id: rel.id,
          name: rel.name,
          reason: 'related feeling',
          score: 4
        }) AS relatedRows

        // 3) Neural-substrate overlap fallback
        CALL {
          WITH e1
          OPTIONAL MATCH (bs:BrainStructure)-[:ACTIVATES_DURING]->(e1)
          OPTIONAL MATCH (bs)-[:ACTIVATES_DURING]->(e2:Emotion)
          WHERE e2.id <> e1.id
            ${quadrant ? 'AND e2.quadrant = $quadrant' : ''}
          WITH e1, e2, count(DISTINCT bs) AS sharedCount
          WHERE e2 IS NOT NULL AND sharedCount >= 1
          OPTIONAL MATCH (p:ActivationPattern)-[:ASSOCIATED_WITH]->(e1)
          OPTIONAL MATCH (p)-[:ASSOCIATED_WITH]->(e2)
          WITH e2, sharedCount, count(DISTINCT p) AS patternOverlap
          RETURN collect(DISTINCT {
            id: e2.id,
            name: e2.name,
            reason: CASE
              WHEN patternOverlap > 0 AND sharedCount > 1 THEN 'often occurs together'
              WHEN sharedCount > 1 THEN 'similar body response'
              ELSE 'related feeling'
            END,
            score: CASE
              WHEN patternOverlap > 0 AND sharedCount > 1 THEN 3
              WHEN sharedCount > 1 THEN 2
              ELSE 1
            END
          }) AS neuralRows
        }

        WITH oppositeRows + relatedRows + coalesce(neuralRows, []) AS allRows
        UNWIND allRows AS row
        WITH row
        WHERE row.id IS NOT NULL
        WITH row.id AS id, row.name AS name, row.reason AS reason, max(row.score) AS score
        ORDER BY score DESC, name ASC
        RETURN id, name, reason
        LIMIT 6
      `;

      const result = await session.run(query, { emotionId, quadrant });

      const relatedEmotions = result.records.map((rec: Neo4jRecord) => ({
        id: rec.get('id'),
        name: rec.get('name') || rec.get('id').replace(/_/g, ' '),
        reason: rec.get('reason'),
      }));

      return { relatedEmotions };
    } catch (error) {
      console.error('Error getting related emotions:', error);
      throw new HttpsError('internal', 'Failed to find related emotions');
    } finally {
      await session.close();
    }
  }
);
