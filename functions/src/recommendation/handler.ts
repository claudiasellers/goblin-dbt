/**
 * getStateAndTools as a function of its input and an injected query layer (plan E4-1). Pure apart
 * from `deps`: the callable passes graphDeps(tx) (queries.ts); the golden tests pass a twin over
 * tests/fixtures/recommendation-graph.json, so whole check-ins run end to end without Neo4j.
 */
import { ValidationError } from '../shared/validate';
import {
  GUIDED_ACTIVITY, POSITIVE_STATE, applyCoOccurrence, candidatesFor, normaliseEmotionId, rankPatterns,
  scorePatterns, wantsCoOccurrence, withConfidence,
} from './patternScoring';
import { legacyTools } from './legacy';
import type {
  ActivationPatternResult, CheckInInput, CoOccurrence, EmotionEvidenceRow, GuidedActivityRecommendation,
  LegacyToolRow, PatternDetail, ResponseEvidenceRow, SafetyFlag, StateResult,
} from './types';

export interface StateDeps {
  emotionEvidence(candidates: string[], emotionIds: string[]): Promise<EmotionEvidenceRow[]>;
  responseEvidence(candidates: string[], responseIds: string[]): Promise<ResponseEvidenceRow[]>;
  patternDetail(patternId: string): Promise<PatternDetail | null>;
  coOccurrence(a: string, b: string): Promise<CoOccurrence | null>;
  legacyTools(patternId: string): Promise<LegacyToolRow[]>;
  /** The safety seam (functions/src/safety/checkinSafetyFlag.ts). */
  safetyFlag(patternId: string, quadrant: string): Promise<SafetyFlag | undefined>;
}

export class PatternNotFoundError extends Error {
  constructor(quadrant: string) {
    super(`No matching pattern found for quadrant: ${quadrant}`);
    this.name = 'PatternNotFoundError';
  }
}

/** The pattern the check-in lands on (after co-occurrence), with everything the result shows about it. */
export interface PatternSelection {
  pattern: ActivationPatternResult;
  secondaryPattern?: ActivationPatternResult;
  coOccurrence?: CoOccurrence;
  emotionIds: string[];
}

export async function selectPattern(input: CheckInInput, candidates: string[], deps: StateDeps): Promise<PatternSelection> {
  const emotionIds = (input.emotions ?? []).map(normaliseEmotionId);
  const emotionRows = emotionIds.length > 0 ? await deps.emotionEvidence(candidates, emotionIds) : [];
  const responseIds = (input.discriminatingAnswers ?? []).map((a) => a.responseId);
  const responseRows = responseIds.length > 0 ? await deps.responseEvidence(candidates, responseIds) : [];
  const ranked = rankPatterns(scorePatterns({
    candidates, emotionIds, intensityY: input.intensity?.y, emotionRows, responseRows,
  }));

  const detail = await deps.patternDetail(ranked.primaryId);
  if (!detail) throw new PatternNotFoundError(input.quadrant);
  let pattern = withConfidence(detail, ranked.primaryScore);
  let secondaryPattern: ActivationPatternResult | undefined;
  let coOccurrence: CoOccurrence | undefined;

  if (wantsCoOccurrence(ranked)) {
    const co = await deps.coOccurrence(ranked.primaryId, ranked.secondaryId as string);
    if (co) {
      coOccurrence = co;
      const secDetail = await deps.patternDetail(ranked.secondaryId as string);
      const secondary = secDetail ? withConfidence(secDetail, ranked.secondaryScore) : undefined;
      ({ pattern, secondaryPattern } = applyCoOccurrence(ranked, pattern, secondary, co));
    }
  }
  return { pattern, secondaryPattern, coOccurrence, emotionIds };
}

export function guidedActivityFor(quadrant: string, patternId: string): GuidedActivityRecommendation | undefined {
  if (quadrant !== 'low-unpleasant') return undefined;
  const activityId = GUIDED_ACTIVITY[patternId];
  return activityId ? { activityId, patternId } : undefined;
}

export async function getStateAndToolsHandler(input: CheckInInput, deps: StateDeps): Promise<StateResult> {
  if (!input || !input.quadrant) throw new ValidationError('Quadrant is required');
  const candidates = candidatesFor(input.quadrant);
  if (candidates.length === 0) return { pattern: POSITIVE_STATE, tools: [] };

  const { pattern, secondaryPattern, coOccurrence } = await selectPattern(input, candidates, deps);
  const tools = legacyTools(await deps.legacyTools(pattern.id));
  const safetyFlag = await deps.safetyFlag(pattern.id, input.quadrant);
  const guidedActivity = guidedActivityFor(input.quadrant, pattern.id);
  return { pattern, tools, safetyFlag, secondaryPattern, coOccurrence, guidedActivity };
}
