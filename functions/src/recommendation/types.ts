/**
 * Check-in result types (getStateAndTools). Pure, no imports: the engine modules and the root
 * golden tests load it. Mirrored by hand in src/services/neo4j.ts.
 */

export type Quadrant = 'high-unpleasant' | 'low-unpleasant' | 'high-pleasant' | 'low-pleasant';
export const QUADRANTS: readonly Quadrant[] = ['high-unpleasant', 'low-unpleasant', 'high-pleasant', 'low-pleasant'];

export interface CheckInInput {
  quadrant: string;
  /** Display names or graph ids; normalised server-side (lower case, spaces → `_`). */
  emotions?: string[];
  intensity?: { x: number; y: number };
  /** Accepted and still unread (as before E4). */
  bodySensations?: Array<{ region: string; tags?: string[] }>;
  discriminatingAnswers?: Array<{ questionId: string; responseId: string }>;
}

export interface ActivationPatternResult {
  id: string;
  userFacingLabel: string;
  description: string;
  evidenceGrade: string;
  safetyConstraints: string[];
  clinicalNotes: string;
  confidence: number;
}

export interface ToolRecommendation {
  id: string;
  name: string;
  description: string;
  whenToUse: string;
  dbtBasis?: string | null;
  relevance: string;
}

export interface SafetyFlag {
  id: string;
  type: string;
  trigger: string;
  action: string;
}

export interface CoOccurrence {
  clinicalLabel: string;
  combinedUserFacingLabel: string;
  primaryPatternId: string;
  frequency: string;
  sequencingNote: string;
}

export interface GuidedActivityRecommendation {
  activityId: string;
  patternId: string;
}

export interface StateResult {
  pattern: ActivationPatternResult;
  tools: ToolRecommendation[];
  safetyFlag?: SafetyFlag;
  secondaryPattern?: ActivationPatternResult;
  coOccurrence?: CoOccurrence;
  guidedActivity?: GuidedActivityRecommendation;
}

/** An ActivationPattern's display fields as stored (confidence is added by the engine). */
export type PatternDetail = Omit<ActivationPatternResult, 'confidence'>;

/** One matched (pattern, user word) pair from the emotion-scoring query. */
export interface EmotionEvidenceRow {
  patternId: string;
  /** The user's word as sent (normalised), not the pattern's emotion id. */
  emotionId: string;
  strength: string | null;
}

/** Summed discriminating-question evidence for one pattern. */
export interface ResponseEvidenceRow {
  patternId: string;
  weight: number;
}

/** A `dbt_*` concept touching the pattern's emotions, with today's overlap score (legacy ranker). */
export interface LegacyToolRow {
  conceptId: string;
  appToolId: string | null;
  name: string | null;
  description: string | null;
  whenToUse: string | null;
  dbtBasis: string | null;
  score: number;
}
