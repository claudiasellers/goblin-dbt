/**
 * Problem Solve content.
 * Moved verbatim from the single-file functions/src/index.ts (A1-2); deploy names are the export names.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getDriver } from '../shared/neo4j';
import { CALL_OPTS } from '../shared/callOptions';

// ============================================
// PROBLEM SOLVE CONTENT
// ============================================

interface ProblemSolveEmotionResult {
  emotionId: string;
  applicable: boolean;
  dbtParent: string | null;
  clinicalNote: string;
  alternativeSkill: string | null;
}

interface SolutionDirectionResult {
  id: string;
  label: string;
  description: string;
  small: string;
  medium: string;
  bigger: string;
  linkedToolId: string | null;
  sortOrder: number;
}

interface DecompositionAspectResult {
  id: string;
  label: string;
  defaultBucket: string;
  sortOrder: number;
}

interface ProblemTypeResult {
  id: string;
  label: string;
  description: string;
  recognitionPrompt: string;
  sortOrder: number;
  solutionDirections: SolutionDirectionResult[];
  decompositionAspects: DecompositionAspectResult[];
}

interface ProblemSolveParentProtocol {
  label: string;
  psAcknowledgment: string;
  problemDefinitionPrompts: string[];
  cannotChangeGuidance: string;
  psInterpersonalHint: string | null;
  ruminationRiskLevel: string;
  ruminationGuardMessage: string | null;
  psCompanionTools: string[];
  problemTypes: ProblemTypeResult[];
}

interface AmbivalenceOptionResult {
  id: string;
  label: string;
  therapeuticFollow: string;
  redirectToolId: string | null;
  sortOrder: number;
}

interface BarrierSubResponseResult {
  id: string;
  label: string;
  therapeuticResponse: string;
  redirectToolId: string | null;
  redirectToolIdSecondary: string | null;
  sortOrder: number;
  triggersAmbivalenceExploration: boolean;
  triggersConfidenceRuler: boolean;
  routesToSolutions: boolean;
  solutionSizeHint: string | null;
  ambivalenceOptions: AmbivalenceOptionResult[];
}

interface BarrierTypeResult {
  id: string;
  label: string;
  description: string;
  sortOrder: number;
  skipsSolutions: boolean;
  subResponses: BarrierSubResponseResult[];
}

interface ProblemSolveProtocolResult {
  readinessCheck: string;
  readinessRedirectMessage: string;
  readinessRedirectTools: string[];
  nothingCanChangeTools: string[];
  everythingIsPilingUpMessage: string;
  commitmentFraming: string[];
  commitmentValidation: string;
  completionAcknowledgment: string;
  completionFollowUp: string;
  copeAheadBridge: string;
  copeAheadBridgeToolId: string;
  barrierQuestion: string;
  barrierQuestionSubtext: string;
  confidenceRulerIntro: string;
  confidenceHigh: string;
  confidenceHighResponse: string;
  confidenceHighTools: string[];
  confidenceMedium: string;
  confidenceMediumResponse: string;
  confidenceLow: string;
  confidenceLowResponse: string;
  confidenceLowTools: string[];
  confidenceNone: string;
  confidenceNoneResponse: string;
  confidenceNoneTools: string[];
  demoralizationValidation: string;
  decompositionIntro: string;
  decompositionFactsLabel: string;
  decompositionOthersLabel: string;
  decompositionYoursLabel: string;
  decompositionNothingInYoursMessage: string;
  decompositionSomethingInYoursMessage: string;
}

interface ProblemSolveContentResult {
  emotions: ProblemSolveEmotionResult[];
  parents: Record<string, ProblemSolveParentProtocol>;
  protocol: ProblemSolveProtocolResult;
  barrierTypes: BarrierTypeResult[];
}

/**
 * Get problem solve content for a set of emotions.
 * Returns per-emotion PS applicability, per-parent protocol data
 * with problem types and solution directions, plus the singleton protocol node.
 * No auth required — this is public emotion knowledge.
 */
export const getProblemSolveContent = onCall(
  CALL_OPTS,
  async (request): Promise<ProblemSolveContentResult> => {
    const { emotionIds } = request.data as { emotionIds: string[] };

    if (!emotionIds || !Array.isArray(emotionIds) || emotionIds.length === 0) {
      throw new HttpsError('invalid-argument', 'emotionIds array is required');
    }

    const session = getDriver().session();
    try {
      // Query 1: Per-emotion + per-parent content with problem types, solution directions, and decomposition aspects
      const contentResult = await session.run(
        `
        MATCH (e:Emotion) WHERE e.id IN $emotionIds
        OPTIONAL MATCH (e)-[:HAS_REGULATION_CONTENT]->(c:EmotionRegulationContent)
        OPTIONAL MATCH (c)-[:HAS_PROBLEM_TYPE]->(pt:ProblemType)
        OPTIONAL MATCH (pt)-[:HAS_SOLUTION_DIRECTION]->(sd:SolutionDirection)
        OPTIONAL MATCH (pt)-[:HAS_DECOMPOSITION_ASPECT]->(da:DecompositionAspect)
        RETURN e.id AS emotionId,
               coalesce(e.problemSolveApplicable, false) AS applicable,
               e.psClinicalNote AS clinicalNote,
               e.psAlternativeSkill AS alternativeSkill,
               e.dbtParent AS emotionDbtParent,
               c.dbtParent AS dbtParent,
               c.label AS parentLabel,
               c.psAcknowledgment AS psAcknowledgment,
               c.problemDefinitionPrompts AS problemDefinitionPrompts,
               c.cannotChangeGuidance AS cannotChangeGuidance,
               c.psInterpersonalHint AS psInterpersonalHint,
               c.ruminationRiskLevel AS ruminationRiskLevel,
               c.ruminationGuardMessage AS ruminationGuardMessage,
               c.psCompanionTools AS psCompanionTools,
               c.psRedirectGuidance AS psRedirectGuidance,
               pt.id AS problemTypeId,
               pt.label AS problemTypeLabel,
               pt.description AS problemTypeDescription,
               pt.recognitionPrompt AS problemTypeRecognitionPrompt,
               pt.sortOrder AS problemTypeSortOrder,
               collect(DISTINCT sd {
                 .id, .label, .description,
                 .small, .medium, .bigger,
                 .linkedToolId, .sortOrder
               }) AS solutionDirections,
               collect(DISTINCT da {
                 .id, .label, .defaultBucket, .sortOrder
               }) AS decompositionAspects
        `,
        { emotionIds }
      );

      // Query 2: Protocol singleton node
      const protocolResult = await session.run(
        `MATCH (ps:ProblemSolveProtocol {id: 'problem_solve_protocol'}) RETURN ps {.*} AS protocol`
      );

      // Query 3: Barrier types with sub-responses
      const barrierResult = await session.run(
        `MATCH (ps:ProblemSolveProtocol {id: 'problem_solve_protocol'})-[:HAS_BARRIER_TYPE]->(bt:BarrierType)
         OPTIONAL MATCH (bt)-[:HAS_SUB_RESPONSE]->(sr:BarrierSubResponse)
         RETURN bt.id AS btId, bt.label AS btLabel, bt.description AS btDesc,
                bt.sortOrder AS btSort, bt.skipsSolutions AS skipsSolutions,
                collect(DISTINCT sr {
                  .id, .label, .therapeuticResponse, .redirectToolId,
                  .redirectToolIdSecondary, .sortOrder,
                  .triggersAmbivalenceExploration, .triggersConfidenceRuler,
                  .routesToSolutions, .solutionSizeHint
                }) AS subResponses
         ORDER BY bt.sortOrder`
      );

      // Query 4: Ambivalence options
      const ambivalenceResult = await session.run(
        `MATCH (sr:BarrierSubResponse {id: 'cant-ambivalent'})-[:HAS_AMBIVALENCE_OPTION]->(a:AmbivalenceOption)
         RETURN a { .id, .label, .therapeuticFollow, .redirectToolId, .sortOrder } AS option
         ORDER BY a.sortOrder`
      );

      // Shape emotions array
      const emotions: ProblemSolveEmotionResult[] = [];
      const seenEmotions = new Set<string>();
      const parents: Record<string, ProblemSolveParentProtocol> = {};

      for (const record of contentResult.records) {
        const emotionId = record.get('emotionId');
        const applicable = record.get('applicable');
        const dbtParent = record.get('dbtParent');

        // Deduplicate emotions (multiple records per emotion due to JOINs)
        if (!seenEmotions.has(emotionId)) {
          seenEmotions.add(emotionId);
          emotions.push({
            emotionId,
            applicable,
            dbtParent: dbtParent || null,
            clinicalNote: record.get('clinicalNote') || '',
            alternativeSkill: record.get('alternativeSkill') || null,
          });
        }

        // Build parent protocol data (deduplicated by dbtParent key)
        if (applicable && dbtParent && !parents[dbtParent]) {
          parents[dbtParent] = {
            label: record.get('parentLabel') || dbtParent,
            psAcknowledgment: record.get('psAcknowledgment') || '',
            problemDefinitionPrompts: record.get('problemDefinitionPrompts') || [],
            cannotChangeGuidance: record.get('cannotChangeGuidance') || '',
            psInterpersonalHint: record.get('psInterpersonalHint') || null,
            ruminationRiskLevel: record.get('ruminationRiskLevel') || 'low',
            ruminationGuardMessage: record.get('ruminationGuardMessage') || null,
            psCompanionTools: record.get('psCompanionTools') || [],
            problemTypes: [],
          };
        }

        // Collect problem types per parent (deduplicated)
        if (applicable && dbtParent && parents[dbtParent]) {
          const ptId = record.get('problemTypeId');
          if (ptId && !parents[dbtParent].problemTypes.some(pt => pt.id === ptId)) {
            const sdRaw = record.get('solutionDirections') || [];
            const solutionDirections: SolutionDirectionResult[] = sdRaw
              .filter((sd: Record<string, unknown>) => sd.id != null)
              .map((sd: Record<string, unknown>) => ({
                id: sd.id as string,
                label: sd.label as string,
                description: sd.description as string,
                small: sd.small as string,
                medium: sd.medium as string,
                bigger: sd.bigger as string,
                linkedToolId: (sd.linkedToolId as string) || null,
                sortOrder: typeof sd.sortOrder === 'object' && sd.sortOrder !== null
                  ? (sd.sortOrder as { low: number }).low ?? 0
                  : (sd.sortOrder as number) ?? 0,
              }))
              .sort((a: SolutionDirectionResult, b: SolutionDirectionResult) => a.sortOrder - b.sortOrder);

            const daRaw = record.get('decompositionAspects') || [];
            const decompositionAspects: DecompositionAspectResult[] = daRaw
              .filter((da: Record<string, unknown>) => da.id != null)
              .map((da: Record<string, unknown>) => ({
                id: da.id as string,
                label: da.label as string,
                defaultBucket: (da.defaultBucket as string) || 'fact',
                sortOrder: typeof da.sortOrder === 'object' && da.sortOrder !== null
                  ? (da.sortOrder as { low: number }).low ?? 0
                  : (da.sortOrder as number) ?? 0,
              }))
              .sort((a: DecompositionAspectResult, b: DecompositionAspectResult) => a.sortOrder - b.sortOrder);

            parents[dbtParent].problemTypes.push({
              id: ptId,
              label: record.get('problemTypeLabel') || '',
              description: record.get('problemTypeDescription') || '',
              recognitionPrompt: record.get('problemTypeRecognitionPrompt') || '',
              sortOrder: typeof record.get('problemTypeSortOrder') === 'object'
                ? record.get('problemTypeSortOrder')?.low ?? 0
                : record.get('problemTypeSortOrder') ?? 0,
              solutionDirections,
              decompositionAspects,
            });
          }
        }
      }

      // Sort problem types by sortOrder within each parent
      for (const parent of Object.values(parents)) {
        parent.problemTypes.sort((a, b) => a.sortOrder - b.sortOrder);
      }

      // Shape protocol
      const protocolRaw = protocolResult.records[0]?.get('protocol') || {};
      const protocol: ProblemSolveProtocolResult = {
        readinessCheck: protocolRaw.readinessCheck || '',
        readinessRedirectMessage: protocolRaw.readinessRedirectMessage || '',
        readinessRedirectTools: protocolRaw.readinessRedirectTools || [],
        nothingCanChangeTools: protocolRaw.nothingCanChangeTools || [],
        everythingIsPilingUpMessage: protocolRaw.everythingIsPilingUpMessage || '',
        commitmentFraming: protocolRaw.commitmentFraming || [],
        commitmentValidation: protocolRaw.commitmentValidation || '',
        completionAcknowledgment: protocolRaw.completionAcknowledgment || '',
        completionFollowUp: protocolRaw.completionFollowUp || '',
        copeAheadBridge: protocolRaw.copeAheadBridge || '',
        copeAheadBridgeToolId: protocolRaw.copeAheadBridgeToolId || 'cope-ahead',
        barrierQuestion: protocolRaw.barrierQuestion || '',
        barrierQuestionSubtext: protocolRaw.barrierQuestionSubtext || '',
        confidenceRulerIntro: protocolRaw.confidenceRulerIntro || '',
        confidenceHigh: protocolRaw.confidenceHigh || '',
        confidenceHighResponse: protocolRaw.confidenceHighResponse || '',
        confidenceHighTools: protocolRaw.confidenceHighTools || [],
        confidenceMedium: protocolRaw.confidenceMedium || '',
        confidenceMediumResponse: protocolRaw.confidenceMediumResponse || '',
        confidenceLow: protocolRaw.confidenceLow || '',
        confidenceLowResponse: protocolRaw.confidenceLowResponse || '',
        confidenceLowTools: protocolRaw.confidenceLowTools || [],
        confidenceNone: protocolRaw.confidenceNone || '',
        confidenceNoneResponse: protocolRaw.confidenceNoneResponse || '',
        confidenceNoneTools: protocolRaw.confidenceNoneTools || [],
        demoralizationValidation: protocolRaw.demoralizationValidation || '',
        decompositionIntro: protocolRaw.decompositionIntro || '',
        decompositionFactsLabel: protocolRaw.decompositionFactsLabel || '',
        decompositionOthersLabel: protocolRaw.decompositionOthersLabel || '',
        decompositionYoursLabel: protocolRaw.decompositionYoursLabel || '',
        decompositionNothingInYoursMessage: protocolRaw.decompositionNothingInYoursMessage || '',
        decompositionSomethingInYoursMessage: protocolRaw.decompositionSomethingInYoursMessage || '',
      };

      // Shape barrier types with sub-responses
      const ambivalenceOptions: AmbivalenceOptionResult[] = ambivalenceResult.records.map(r => {
        const opt = r.get('option');
        return {
          id: opt.id as string,
          label: opt.label as string,
          therapeuticFollow: opt.therapeuticFollow as string,
          redirectToolId: (opt.redirectToolId as string) || null,
          sortOrder: typeof opt.sortOrder === 'object' && opt.sortOrder !== null
            ? (opt.sortOrder as { low: number }).low ?? 0
            : (opt.sortOrder as number) ?? 0,
        };
      });

      const barrierTypes: BarrierTypeResult[] = barrierResult.records.map(record => {
        const srRaw = record.get('subResponses') || [];
        const subResponses: BarrierSubResponseResult[] = srRaw
          .filter((sr: Record<string, unknown>) => sr.id != null)
          .map((sr: Record<string, unknown>) => ({
            id: sr.id as string,
            label: sr.label as string,
            therapeuticResponse: (sr.therapeuticResponse as string) || '',
            redirectToolId: (sr.redirectToolId as string) || null,
            redirectToolIdSecondary: (sr.redirectToolIdSecondary as string) || null,
            sortOrder: typeof sr.sortOrder === 'object' && sr.sortOrder !== null
              ? (sr.sortOrder as { low: number }).low ?? 0
              : (sr.sortOrder as number) ?? 0,
            triggersAmbivalenceExploration: sr.triggersAmbivalenceExploration === true,
            triggersConfidenceRuler: sr.triggersConfidenceRuler === true,
            routesToSolutions: sr.routesToSolutions === true,
            solutionSizeHint: (sr.solutionSizeHint as string) || null,
            ambivalenceOptions: sr.triggersAmbivalenceExploration === true ? ambivalenceOptions : [],
          }))
          .sort((a: BarrierSubResponseResult, b: BarrierSubResponseResult) => a.sortOrder - b.sortOrder);

        const btSort = record.get('btSort');
        return {
          id: record.get('btId') as string,
          label: record.get('btLabel') as string,
          description: record.get('btDesc') as string,
          sortOrder: typeof btSort === 'object' && btSort !== null
            ? (btSort as { low: number }).low ?? 0
            : (btSort as number) ?? 0,
          skipsSolutions: record.get('skipsSolutions') === true,
          subResponses,
        };
      });

      return { emotions, parents, protocol, barrierTypes };
    } catch (error) {
      console.error('Error getting problem solve content:', error);
      throw new HttpsError('internal', 'Failed to get problem solve content');
    } finally {
      await session.close();
    }
  }
);
