/**
 * getStateAndTools as a function of its input and an injected query layer (plan E4-1). Pure apart
 * from `deps`: the callable passes graphDeps(tx) (queries.ts); the golden tests pass a twin over
 * tests/fixtures/recommendation-graph.json, so whole check-ins run end to end without Neo4j.
 */
import { ValidationError } from '../shared/validate';
import {
  DEFAULT_ANSWER_WEIGHT, GUIDED_ACTIVITY, POSITIVE_STATE, applyCoOccurrence, candidatesFor, normaliseEmotionId, rankPatterns,
  scorePatternParts, wantsCoOccurrence, withConfidence,
} from './patternScoring';
import { legacyTools } from './legacy';
import { resolveBand } from './band';
import { selectRecommendations, type RoutingPick } from './select';
import type {
  ActivationPatternResult, CheckInInput, CoOccurrence, EmotionEvidenceRow, GuidedActivityRecommendation,
  LegacyToolRow, PatternDetail, PatternSlice, ResponseEvidenceRow, Routing, RoutingConcept, RoutingPolicy, SafetyFlag,
  StateResult, ToolRecommendation,
} from './types';

export interface StateDeps {
  /** `useAliases`: also match through the words' SCORES_AS aliases (E4-6; only while the policy is on). */
  emotionEvidence(candidates: string[], emotionIds: string[], useAliases: boolean): Promise<EmotionEvidenceRow[]>;
  responseEvidence(candidates: string[], responseIds: string[]): Promise<ResponseEvidenceRow[]>;
  patternDetail(patternId: string): Promise<PatternDetail | null>;
  coOccurrence(a: string, b: string): Promise<CoOccurrence | null>;
  legacyTools(patternId: string): Promise<LegacyToolRow[]>;
  /** The safety seam (functions/src/safety/checkinSafetyFlag.ts). */
  safetyFlag(patternId: string, quadrant: string, responseIds: string[]): Promise<SafetyFlag | undefined>;
  /** E4-3: RoutingPolicy {id: 'checkin_result'} and its fallback concept (both null if not loaded). */
  routingPolicy(): Promise<{ policy: RoutingPolicy | null; fallback: RoutingConcept | null }>;
  /** E4-3: RECOMMENDED_FOR rows (+ concept tags, addresses, contraindications) for these patterns. */
  routingSlice(patternIds: string[]): Promise<PatternSlice[]>;
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

/**
 * What E4-6 adds to pattern selection (SCORES_AS aliases, high-unpleasant answers). The handler turns
 * both on only while RoutingPolicy is enabled, so the kill switch restores today's routing whole:
 * with the legacy ranker, newly reachable patterns would get no card (chronic_vigilance) or the
 * flooding banner with OA.
 */
export interface Reachability {
  aliases: boolean;
  highUnpleasantAnswers: boolean;
  /** Each answer's evidence weight × this (rf-v2.1: the policy's answerWeight). */
  answerWeight: number;
  /** Break pattern ties toward the person's words (rf-v2.1: the policy's tieBreak "words"). */
  wordTieBreak: boolean;
}
export const FULL_REACH: Reachability = { aliases: true, highUnpleasantAnswers: true, answerWeight: DEFAULT_ANSWER_WEIGHT, wordTieBreak: false };
export const NO_REACH: Reachability = { aliases: false, highUnpleasantAnswers: false, answerWeight: DEFAULT_ANSWER_WEIGHT, wordTieBreak: false };

/** What the policy turns on. Off (or missing): NO_REACH, the pre-review scoring whole. */
export function reachFor(policy: RoutingPolicy | null): Reachability {
  if (!policy?.enabled) return NO_REACH;
  return { ...FULL_REACH, answerWeight: policy.answerWeight ?? DEFAULT_ANSWER_WEIGHT, wordTieBreak: policy.tieBreak === 'words' };
}

export async function selectPattern(
  input: CheckInInput, candidates: string[], deps: StateDeps, reach: Reachability = FULL_REACH,
): Promise<PatternSelection> {
  const emotionIds = (input.emotions ?? []).map(normaliseEmotionId);
  const emotionRows = emotionIds.length > 0 ? await deps.emotionEvidence(candidates, emotionIds, reach.aliases) : [];
  const answers = input.quadrant === 'high-unpleasant' && !reach.highUnpleasantAnswers ? [] : (input.discriminatingAnswers ?? []);
  const responseIds = answers.map((a) => a.responseId);
  const responseRows = responseIds.length > 0 ? await deps.responseEvidence(candidates, responseIds) : [];
  const parts = scorePatternParts({
    candidates, emotionIds, intensityY: input.intensity?.y, emotionRows, responseRows, answerWeight: reach.answerWeight,
  });
  const ranked = rankPatterns(parts.scores, reach.wordTieBreak ? parts.wordScores : undefined);

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

/** A pick as a result card (graph name etc. kept for compat; the UI names tools from src/data/tools.ts). */
export function toToolRecommendation(p: RoutingPick): ToolRecommendation {
  const c = p.concept;
  return {
    id: c.appToolId,
    name: c.name || c.appToolId.replace(/-/g, ' '),
    description: c.description || '',
    whenToUse: c.whenToUse || '',
    dbtBasis: c.dbtBasis ?? null,
    relevance: p.slot,
    slot: p.slot,
    side: p.side,
    skillKind: p.skillKind,
    direction: p.direction,
    ...(p.sequence ? { sequence: p.sequence } : {}),
    ruleId: p.ruleId,
    reason: p.reason,
  };
}

const emptySlice = (id: string): PatternSlice => ({ id, blank: false, emotions: [], rows: [] });

export async function getStateAndToolsHandler(input: CheckInInput, deps: StateDeps): Promise<StateResult> {
  if (!input || !input.quadrant) throw new ValidationError('Quadrant is required');
  if (candidatesFor(input.quadrant).length === 0) return { pattern: POSITIVE_STATE, tools: [] };

  const { policy, fallback } = await deps.routingPolicy();
  const candidates = candidatesFor(input.quadrant, policy?.enabled === true);
  const { pattern, secondaryPattern, coOccurrence, emotionIds } = await selectPattern(
    input, candidates, deps, reachFor(policy),
  );
  const { band, bandSource } = resolveBand(input, pattern.id, policy);
  const surface = input.surface ?? 'checkin';

  let tools: ToolRecommendation[];
  let routing: Routing;
  if (!policy || !policy.enabled) {
    // Kill switch: today's ranker, unchanged (E4-1 pins).
    tools = legacyTools(await deps.legacyTools(pattern.id));
    routing = {
      version: 'legacy', band, bandSource, blank: input.blank === true,
      recommendedToolIds: tools.map((t) => t.id), ruleIds: tools.map(() => 'legacy'), filtered: [], receiveFirst: false, surface,
    };
  } else {
    const slices = await deps.routingSlice(secondaryPattern ? [pattern.id, secondaryPattern.id] : [pattern.id]);
    const primary = slices.find((x) => x.id === pattern.id) ?? emptySlice(pattern.id);
    const secondary = secondaryPattern ? slices.find((x) => x.id === secondaryPattern.id) ?? null : null;
    const blank = primary.blank || input.blank === true || (!!coOccurrence && !!secondary?.blank);
    const sel = selectRecommendations({
      primary, secondary, band, blank, userEmotionIds: emotionIds, policy, fallback, medicalFlags: [],
    });
    tools = sel.picks.map(toToolRecommendation);
    routing = {
      version: policy.version, band, bandSource, blank,
      recommendedToolIds: tools.map((t) => t.id), ruleIds: sel.picks.map((p) => p.ruleId),
      filtered: sel.filtered, receiveFirst: sel.receiveFirst, surface,
    };
  }

  // Every answer as sent: a safety answer counts even while the policy holds back high-unpleasant answers.
  const safetyFlag = await deps.safetyFlag(pattern.id, input.quadrant, (input.discriminatingAnswers ?? []).map((a) => a.responseId));
  const guidedActivity = guidedActivityFor(input.quadrant, pattern.id);
  return { pattern, tools, safetyFlag, secondaryPattern, coOccurrence, guidedActivity, routing };
}
