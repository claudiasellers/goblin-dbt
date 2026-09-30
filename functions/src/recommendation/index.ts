/**
 * Check-in result: activation pattern, tools, discriminating questions, related emotions.
 * Moved verbatim from the single-file functions/src/index.ts (A1-2); deploy names are the export names.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Record as Neo4jRecord } from 'neo4j-driver';
import { getDriver, neo4jUri, neo4jUser, neo4jPassword } from '../shared/neo4j';
import { appToolId } from '../shared/toolIds';

// ============================================
// KNOWLEDGE GRAPH QUERY FUNCTIONS
// These power the neural state matching and tool recommendations
// ============================================

interface CheckInInput {
  quadrant: string;
  emotions?: string[];
  intensity?: { x: number; y: number };
  bodySensations?: Array<{ region: string; tags?: string[] }>;
  discriminatingAnswers?: Array<{ questionId: string; responseId: string }>;
}

interface ActivationPatternResult {
  id: string;
  userFacingLabel: string;
  description: string;
  evidenceGrade: string;
  safetyConstraints: string[];
  clinicalNotes: string;
  confidence: number;
}

interface ToolRecommendation {
  id: string;
  name: string;
  description: string;
  whenToUse: string;
  dbtBasis?: string;
  relevance: string;
}

interface CoOccurrence {
  clinicalLabel: string;
  combinedUserFacingLabel: string;
  primaryPatternId: string;
  frequency: string;
  sequencingNote: string;
}

interface GuidedActivityRecommendation {
  activityId: string;
  patternId: string;
}

interface StateResult {
  pattern: ActivationPatternResult;
  tools: ToolRecommendation[];
  safetyFlag?: {
    id: string;
    type: string;
    trigger: string;
    action: string;
  };
  secondaryPattern?: ActivationPatternResult;
  coOccurrence?: CoOccurrence;
  guidedActivity?: GuidedActivityRecommendation;
}

/**
 * Get the activation pattern and recommended tools based on check-in data
 * This is the main "What's happening right now" query
 */
export const getStateAndTools = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request): Promise<StateResult> => {
    const input = request.data as CheckInInput;

    if (!input.quadrant) {
      throw new HttpsError('invalid-argument', 'Quadrant is required');
    }

    const session = getDriver().session();
    try {
      // Map quadrant to likely patterns with base scores
      const quadrantPatternMap: Record<string, string[]> = {
        'high-unpleasant': ['acute_alarm', 'chronic_vigilance', 'emotional_flooding', 'social_threat_shame'],
        'low-unpleasant': ['conservation_freeze', 'dissociation_overmodulation', 'rumination_loop', 'reward_drive_low'],
        'high-pleasant': [],
        'low-pleasant': [],
      };

      const candidatePatterns = quadrantPatternMap[input.quadrant] || [];

      // Positive quadrant — no intervention needed
      if (candidatePatterns.length === 0) {
        return {
          pattern: {
            id: 'positive_state',
            userFacingLabel: "You're in a good place right now",
            description: "Your system is balanced and regulated",
            evidenceGrade: 'N/A',
            safetyConstraints: [],
            clinicalNotes: '',
            confidence: 1.0,
          },
          tools: [],
        };
      }

      // ============================================
      // PHASE 1: Build per-pattern confidence scores
      // Start from emotion-based evidence, then layer
      // discriminating question evidence on top.
      // ============================================

      // Initialize scores for all candidate patterns
      const patternScores: Record<string, number> = {};
      for (const pid of candidatePatterns) {
        patternScores[pid] = 0.25; // base score
      }

      // --- Emotion-based scoring ---
      if (input.emotions && input.emotions.length > 0) {
        const emotionIds = input.emotions.map(e =>
          e.toLowerCase().replace(/\s+/g, '_')
        );

        const emotionQuery = `
          MATCH (p:ActivationPattern)-[r:ASSOCIATED_WITH]->(e:Emotion)
          WHERE p.id IN $candidatePatterns
            AND e.id IN $emotionIds
          WITH p.id as patternId, count(r) as matches, collect(r.strength) as strengths
          RETURN patternId, matches,
                 CASE
                   WHEN 'strong' IN strengths THEN 0.3
                   WHEN 'moderate' IN strengths THEN 0.2
                   ELSE 0.1
                 END as strengthBonus
        `;
        const emotionResult = await session.run(emotionQuery, {
          candidatePatterns,
          emotionIds,
        });

        for (const rec of emotionResult.records) {
          const pid = rec.get('patternId') as string;
          const matches = (rec.get('matches') as { toNumber?: () => number });
          const matchCount = typeof matches === 'object' && matches.toNumber ? matches.toNumber() : Number(matches);
          const bonus = (rec.get('strengthBonus') as { toNumber?: () => number });
          const strengthBonus = typeof bonus === 'object' && bonus.toNumber ? bonus.toNumber() : Number(bonus);
          patternScores[pid] = (patternScores[pid] || 0) +
            (matchCount / emotionIds.length) * 0.4 + strengthBonus;
        }
      } else {
        // No emotions — use intensity heuristic
        const intensityY = input.intensity?.y ?? 0.5;
        for (const pid of candidatePatterns) {
          if (intensityY > 0.7 && ['acute_alarm', 'emotional_flooding'].includes(pid)) {
            patternScores[pid] += 0.3;
          } else if (intensityY > 0.7 && ['chronic_vigilance', 'social_threat_shame'].includes(pid)) {
            patternScores[pid] += 0.15;
          } else if (intensityY < 0.3 && ['conservation_freeze', 'reward_drive_low'].includes(pid)) {
            patternScores[pid] += 0.3;
          } else if (intensityY < 0.3 && ['dissociation_overmodulation', 'rumination_loop'].includes(pid)) {
            patternScores[pid] += 0.15;
          }
        }
      }

      // --- Discriminating question evidence (weighted ~2x emotion evidence) ---
      if (input.discriminatingAnswers && input.discriminatingAnswers.length > 0) {
        const responseIds = input.discriminatingAnswers.map(a => a.responseId);
        const evidenceQuery = `
          MATCH (r:QuestionResponse)-[e:EVIDENCE_FOR]->(p:ActivationPattern)
          WHERE r.id IN $responseIds
            AND p.id IN $candidatePatterns
          RETURN p.id as patternId, sum(e.weight) as totalWeight
        `;
        const evidenceResult = await session.run(evidenceQuery, {
          responseIds,
          candidatePatterns,
        });

        for (const rec of evidenceResult.records) {
          const pid = rec.get('patternId') as string;
          const weight = (rec.get('totalWeight') as { toNumber?: () => number });
          const totalWeight = typeof weight === 'object' && weight.toNumber ? weight.toNumber() : Number(weight);
          // Weight discriminating evidence at ~2x
          patternScores[pid] = (patternScores[pid] || 0) + totalWeight * 2.0;
        }
      }

      // ============================================
      // PHASE 2: Select primary (and secondary) pattern
      // ============================================

      console.log('Pattern scores after all evidence:', JSON.stringify(patternScores));
      if (input.discriminatingAnswers) {
        console.log('Discriminating answers received:', JSON.stringify(input.discriminatingAnswers));
      }

      const sortedPatterns = Object.entries(patternScores)
        .sort(([, a], [, b]) => b - a);

      const primaryId = sortedPatterns[0][0];
      const primaryScore = sortedPatterns[0][1];
      const secondaryId = sortedPatterns.length > 1 ? sortedPatterns[1][0] : null;
      const secondaryScore = sortedPatterns.length > 1 ? sortedPatterns[1][1] : 0;

      // Fetch primary pattern details
      const patternDetailQuery = `
        MATCH (p:ActivationPattern {id: $patternId})
        RETURN p.id as id,
               p.userFacingLabel as userFacingLabel,
               p.description as description,
               p.evidenceGrade as evidenceGrade,
               p.safetyConstraints as safetyConstraints,
               p.clinicalNotes as clinicalNotes
      `;
      const primaryResult = await session.run(patternDetailQuery, { patternId: primaryId });

      if (primaryResult.records.length === 0) {
        throw new HttpsError('not-found', `No matching pattern found for quadrant: ${input.quadrant}`);
      }

      const pRec = primaryResult.records[0];
      let pattern: ActivationPatternResult = {
        id: pRec.get('id'),
        userFacingLabel: pRec.get('userFacingLabel'),
        description: pRec.get('description'),
        evidenceGrade: pRec.get('evidenceGrade'),
        safetyConstraints: pRec.get('safetyConstraints') || [],
        clinicalNotes: pRec.get('clinicalNotes') || '',
        confidence: Math.min(primaryScore, 1.0),
      };

      // ============================================
      // PHASE 3: Co-occurrence detection
      // ============================================

      let secondaryPattern: ActivationPatternResult | undefined;
      let coOccurrence: CoOccurrence | undefined;

      if (secondaryId && secondaryScore > 0.35) {
        // Check for CO_OCCURS_WITH relationship (bidirectional check)
        const coQuery = `
          MATCH (p1:ActivationPattern {id: $pid1})-[r:CO_OCCURS_WITH]-(p2:ActivationPattern {id: $pid2})
          RETURN r.clinicalLabel as clinicalLabel,
                 r.combinedUserFacingLabel as combinedUserFacingLabel,
                 r.primaryPatternId as primaryPatternId,
                 r.frequency as frequency,
                 r.sequencingNote as sequencingNote
          LIMIT 1
        `;
        const coResult = await session.run(coQuery, { pid1: primaryId, pid2: secondaryId });

        if (coResult.records.length > 0) {
          const coRec = coResult.records[0];
          const graphPrimaryId = coRec.get('primaryPatternId') as string;

          coOccurrence = {
            clinicalLabel: coRec.get('clinicalLabel'),
            combinedUserFacingLabel: coRec.get('combinedUserFacingLabel'),
            primaryPatternId: graphPrimaryId,
            frequency: coRec.get('frequency'),
            sequencingNote: coRec.get('sequencingNote'),
          };

          // Fetch secondary pattern details
          const secResult = await session.run(patternDetailQuery, { patternId: secondaryId });
          if (secResult.records.length > 0) {
            const sRec = secResult.records[0];
            secondaryPattern = {
              id: sRec.get('id'),
              userFacingLabel: sRec.get('userFacingLabel'),
              description: sRec.get('description'),
              evidenceGrade: sRec.get('evidenceGrade'),
              safetyConstraints: sRec.get('safetyConstraints') || [],
              clinicalNotes: sRec.get('clinicalNotes') || '',
              confidence: Math.min(secondaryScore, 1.0),
            };
          }

          // Swap primary/secondary if the graph says to AND the scores are close
          // enough to indicate genuine co-occurrence (not one pattern dominating).
          // Only swap when the secondary scored at least 60% of the primary.
          const scoreRatio = secondaryScore / primaryScore;
          if (graphPrimaryId !== primaryId && secondaryPattern && scoreRatio >= 0.6) {
            const temp = pattern;
            pattern = { ...secondaryPattern, confidence: Math.min(primaryScore, 1.0) };
            secondaryPattern = { ...temp, confidence: Math.min(secondaryScore, 1.0) };
          }
        }
      }

      // ============================================
      // PHASE 4: Get recommended tools
      // ============================================

      const toolsQuery = `
        MATCH (p:ActivationPattern {id: $patternId})-[:ASSOCIATED_WITH]->(e:Emotion)
        MATCH (tc:TherapyConcept)-[r:ADDRESSES|REDUCES|TARGETS]->(e)
        WHERE tc.id STARTS WITH 'dbt_'
        WITH tc, count(DISTINCT e) as relevanceScore
        ORDER BY relevanceScore DESC
        LIMIT 2
        RETURN tc.id as id,
               tc.appToolId as appToolId,
               tc.name as name,
               tc.description as description,
               tc.whenToUse as whenToUse,
               tc.dbtBasis as dbtBasis,
               CASE
                 WHEN relevanceScore > 2 THEN 'high'
                 WHEN relevanceScore > 1 THEN 'medium'
                 ELSE 'relevant'
               END as relevance
      `;

      const toolsResult = await session.run(toolsQuery, { patternId: pattern.id });

      const tools: ToolRecommendation[] = toolsResult.records.map((rec: Neo4jRecord) => ({
        id: appToolId(rec),
        name: rec.get('name') || appToolId(rec).replace(/-/g, ' '),
        description: rec.get('description') || '',
        whenToUse: rec.get('whenToUse') || '',
        dbtBasis: rec.get('dbtBasis'),
        relevance: rec.get('relevance'),
      }));

      // ============================================
      // PHASE 5: Safety flags (skip for low-unpleasant — these patterns
      // should never route to crisis resources)
      // ============================================

      let safetyFlag: { id: string; type: string; trigger: string; action: string } | undefined;

      if (input.quadrant !== 'low-unpleasant') {
        const safetyQuery = `
          MATCH (p:ActivationPattern {id: $patternId})-[:TRIGGERS_SAFETY]->(sf:SafetyFlag)
          RETURN sf.id as id, sf.type as type, sf.trigger as trigger, sf.action as action
          LIMIT 1
        `;

        const safetyResult = await session.run(safetyQuery, { patternId: pattern.id });

        safetyFlag = safetyResult.records.length > 0 ? {
          id: safetyResult.records[0].get('id'),
          type: safetyResult.records[0].get('type'),
          trigger: safetyResult.records[0].get('trigger'),
          action: safetyResult.records[0].get('action'),
        } : undefined;
      }

      // ============================================
      // PHASE 6: Guided activity mapping (low-unpleasant only)
      // Safety flag overrides — omit guided activity if present
      // ============================================

      let guidedActivity: GuidedActivityRecommendation | undefined;

      if (input.quadrant === 'low-unpleasant') {
        const activityMap: Record<string, string> = {
          conservation_freeze: 'gentle-movement',
          dissociation_overmodulation: 'sensory-anchor',
          rumination_loop: 'attention-shift',
          reward_drive_low: 'micro-win',
        };
        const activityId = activityMap[pattern.id];
        if (activityId) {
          guidedActivity = { activityId, patternId: pattern.id };
        }
      }

      console.log('Returning result:', {
        patternId: pattern.id,
        confidence: pattern.confidence,
        hasGuidedActivity: !!guidedActivity,
        guidedActivity,
        hasCoOccurrence: !!coOccurrence,
        hasSafetyFlag: !!safetyFlag,
      });

      return { pattern, tools, safetyFlag, secondaryPattern, coOccurrence, guidedActivity };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.error('Error getting state and tools:', {
        message: errorMessage,
        stack: errorStack,
        quadrant: input.quadrant,
        emotions: input.emotions,
      });

      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to analyze emotional state: ${errorMessage}`);
    } finally {
      await session.close();
    }
  }
);

/**
 * Get discriminating questions for a quadrant.
 * Returns questions with their responses and conditional flow (TRIGGERS_NEXT).
 */
export const getDiscriminatingQuestions = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
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
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
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
