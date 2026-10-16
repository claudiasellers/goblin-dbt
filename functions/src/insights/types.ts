/**
 * Insights (Reflect) types. Pure, type imports only. The payload half is mirrored by hand in
 * src/services/neo4j.ts (the client's InsightsPayload); add fields there in the same change.
 */
import type { PartReflect } from '../parts/statsTypes';

export type TimeRange = '7d' | '30d' | 'all';
export const TIME_RANGES: readonly TimeRange[] = ['7d', '30d', 'all'];

// ── Rows the query layer returns (one user's log) ──

export interface CheckInRow {
  id: string;
  /** ISO string; rows arrive newest first. */
  timestamp: string;
  /** Display string: the chosen words joined with ", ", or the quadrant when no word was chosen. */
  emotion: string;
  /** Graph Emotion ids of the chosen words (PR-C1); empty on older records. */
  emotionIds: string[];
  quadrant: string;
  intensityX: number;
  intensityY: number;
  band: string | null;
  activationPatternId: string | null;
  /** Place ids, each once per check-in. */
  bodyRegions: string[];
  sensationTags: string[];
  /** DBT parent (or wheel family) of each word, distinct. */
  families: string[];
}

export type ThenVsNow = 'much_better' | 'better' | 'same' | 'worse';
export type ActedOnUrge = 'no' | 'partly' | 'yes' | 'not_yet';

/**
 * One ToolSession (the practice spine, PR-S3). `checkInId` is an explicit link only (FROM_CHECKIN
 * or the id the session was opened with), never the "latest check-in before it" guess the compat
 * ToolUsage row makes.
 */
export interface SessionRow {
  id: string;
  toolId: string;
  /** The session's own pattern, else the pattern of the check-in it was opened from. */
  patternId: string | null;
  checkInId: string | null;
  /** ISO: coalesce(endedAt, startedAt), the same clock the pattern-offer rule uses. */
  at: string;
  closeKind: string | null;
  thenVsNow: ThenVsNow | null;
  actedOnUrge: ActedOnUrge | null;
}

/** A pre-spine ToolUsage (no ToolSession behind it): trackToolUsage + recordToolOutcome era. */
export interface LegacyUsageRow {
  toolId: string;
  outcome: 'helped' | 'somewhat' | 'not_really' | null;
  timestamp: string;
  patternId: string | null;
  /** FOLLOWED_CHECKIN (for these rows it was always the latest check-in before the tool). */
  checkInId: string | null;
}

// ── Graph content the handler looks up ──

export interface FormulationContent { headline: string; body: string; mechanism: string }
export interface EscalationContent { narrative: string; suggestedTool: string | null; targetPatternId: string }

// ── Payload ──

export interface FormulationInsight {
  type: 'single' | 'co_occurrence';
  primaryPatternId: string;
  secondaryPatternId: string | null;
  headline: string;
  body: string;
  mechanism: string;
  effectiveTools: string[];
  episodeCount: number;
}

export interface ProactiveAlert {
  narrative: string;
  suggestedTool: string;
  sourcePatternId: string;
  targetPatternId: string;
}

export interface GrowthInsight { key: string; text: string; data: Record<string, number> }
export interface GrowthEvidenceInsight { insights: GrowthInsight[] }

export interface SomaticCorrelationData {
  correlations: Array<{ region: string; patternId: string; count: number }>;
  narrative: string;
}

/**
 * How a tool's close is measured. `then_vs_now`: the regulation / orienting close (R3), and
 * pre-spine ratings mapped back onto it. `urge`: whether the user acted on the urge.
 */
export type OutcomeMeasure = 'then_vs_now' | 'urge';

/** The then-vs-now direction the user answered in (R3): quieter (down) or more here (orient). */
export type OutcomeDirection = 'down' | 'orient';

export interface ToolOutcomeSummary {
  toolId: string;
  measure: OutcomeMeasure;
  /** then_vs_now only: the direction of the most recent spine close; null for pre-spine ratings. */
  direction: OutcomeDirection | null;
  /** Closes with an answer. */
  answered: number;
  /** then_vs_now: better or much better. urge: didn't act on it. */
  wentWell: number;
  /** Kept for clients from before Reflect R1: round(wentWell / answered × 100). */
  helpedPct: number;
  /** Same as `answered` (pre-R1 name). */
  totalUses: number;
}

export interface ToolEffectivenessData { tools: ToolOutcomeSummary[] }

export interface PatternFrequency { patternId: string; count: number }

export interface InsightsPayload {
  formulation: FormulationInsight | null;
  proactiveAlert: ProactiveAlert | null;
  growthEvidence: GrowthEvidenceInsight | null;
  somaticCorrelation: SomaticCorrelationData | null;
  toolEffectiveness: ToolEffectivenessData | null;
  /** Retired (PR-S5 moved "did it help?" to Today). Always null; kept so old clients don't break. */
  continuityPrompt: null;
  patternFrequencies: PatternFrequency[];
  totalCheckIns: number;
  /**
   * The parts the person knows, each with its lines past their thresholds (functions/src/parts/stats.ts),
   * all time (not the range: they read across weeks). null with parts off; [] when no part has a line.
   */
  parts: PartReflect[] | null;
}
