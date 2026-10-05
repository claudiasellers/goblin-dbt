/**
 * getInsightsData as a function of the time range and an injected query layer (the
 * recommendation engine's shape, E4-1). Pure apart from `deps`: the callable passes graphDeps
 * (queries.ts); tests pass plain functions over fixed rows.
 */
import {
  POSITIVE_STATE, alertDue, effectiveToolsForPattern, formulationPlan, growthEvidence, outcomeRows, somaticCorrelation,
  tallyPatterns, thresholdsFor, toolEffectiveness,
} from './compute';
import type {
  CheckInRow, EscalationContent, FormulationContent, FormulationInsight, InsightsPayload, LegacyUsageRow, ProactiveAlert,
  SessionRow, SomaticCorrelationData, TimeRange,
} from './types';

export interface InsightsDeps {
  /** The user's check-ins in the range, newest first, quadrant set. */
  checkIns(range: TimeRange): Promise<CheckInRow[]>;
  /** The user's tool sessions in the range (by coalesce(endedAt, startedAt)). */
  sessions(range: TimeRange): Promise<SessionRow[]>;
  /** Pre-spine ToolUsage rows (no ToolSession behind them) in the range. */
  legacyUsages(range: TimeRange): Promise<LegacyUsageRow[]>;
  coOccurrenceFormulation(a: string, b: string): Promise<FormulationContent | null>;
  patternFormulation(patternId: string): Promise<FormulationContent | null>;
  escalation(patternId: string): Promise<EscalationContent | null>;
  /** ActivationPattern.somatic_narrative, else SomaticQuadrantNarrative.narrative, else ''. */
  somaticNarrative(id: string): Promise<string>;
}

export async function getInsightsHandler(range: TimeRange, deps: InsightsDeps): Promise<InsightsPayload> {
  // The three reads are independent; the query layer gives each its own transaction.
  const [checkIns, sessions, legacy] = await Promise.all([deps.checkIns(range), deps.sessions(range), deps.legacyUsages(range)]);
  const th = thresholdsFor(range);
  const tally = tallyPatterns(checkIns);
  const outcomes = outcomeRows(sessions, legacy);

  // Formulation: the pair's combined copy when it exists, else the single pattern's.
  let formulation: FormulationInsight | null = null;
  const plan = formulationPlan(checkIns, tally, th);
  if (plan.pair && tally.dominant) {
    const c = await deps.coOccurrenceFormulation(plan.pair[0], plan.pair[1]);
    if (c?.headline) {
      formulation = {
        type: 'co_occurrence', primaryPatternId: plan.pair[0], secondaryPatternId: plan.pair[1], ...c,
        effectiveTools: effectiveToolsForPattern(outcomes, plan.pair[0]), episodeCount: tally.dominant[1],
      };
    }
  }
  if (!formulation && plan.single) {
    const c = await deps.patternFormulation(plan.single);
    if (c?.headline) {
      formulation = {
        type: 'single', primaryPatternId: plan.single, secondaryPatternId: null, ...c,
        effectiveTools: effectiveToolsForPattern(outcomes, plan.single), episodeCount: tally.counts[plan.single] || 1,
      };
    }
  }

  // Heads-up: the dominant pattern's escalation path, when it repeats (or its banded intensity rises).
  let proactiveAlert: ProactiveAlert | null = null;
  if (tally.dominant && tally.dominant[0] !== POSITIVE_STATE) {
    const e = await deps.escalation(tally.dominant[0]);
    if (e?.narrative && alertDue(checkIns, tally.dominant, th)) {
      proactiveAlert = {
        narrative: e.narrative, suggestedTool: e.suggestedTool ?? '', sourcePatternId: tally.dominant[0], targetPatternId: e.targetPatternId,
      };
    }
  }

  let somatic: SomaticCorrelationData | null = null;
  const s = somaticCorrelation(checkIns, th);
  if (s) somatic = { correlations: s.correlations, narrative: await deps.somaticNarrative(s.narrativeId) };

  return {
    formulation,
    proactiveAlert,
    growthEvidence: growthEvidence(checkIns, sessions, legacy, outcomes, th),
    somaticCorrelation: somatic,
    toolEffectiveness: toolEffectiveness(outcomes),
    continuityPrompt: null,
    patternFrequencies: tally.frequencies,
    totalCheckIns: checkIns.length,
  };
}
