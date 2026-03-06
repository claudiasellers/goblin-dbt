// Type definitions for DEAR MAN Cloud Function responses.
// All content lives in the knowledge graph. This file is pure types.

export interface DearManContentResult {
  situationTypes: SituationType[];
  describeOptions: Record<string, SelectableOption[]>;
  assertOptions: Record<string, AssertOption[]>;
  reinforceOptions: SelectableOption[];
  barriers: SelectableOption[];
  barrierCoaching: Record<string, CoachingCard>;
  defaultCoaching: CoachingCard;
  anchorPhrases: SelectableOption[];
  negotiateOptions: {
    middleGround: SelectableOption[];
    walkAway: SelectableOption[];
  };
  negotiateHints: Record<string, string>;
  feelingChips: SelectableOption[];
  stepInsights: Record<string, string>;
  debriefOptions: {
    wentWell: SelectableOption[];
    toChange: SelectableOption[];
  };
  revealText: string;
  confidentCoaching: string;
  confidentBarrierNoRight: string;
  assertBarrierGuilty: string;
}

export interface SituationType {
  id: string;
  label: string;
  sublabel: string;
  emoji: string;
  sortOrder: number;
}

export interface SelectableOption {
  id: string;
  label: string;
  sortOrder?: number;
}

export interface AssertOption extends SelectableOption {
  hasPlaceholder: boolean;
}

export interface CoachingCard {
  title: string;
  body: string;
}

export interface DearManSessionData {
  type: 'prep' | 'debrief';
  relationshipType: string;
  situationType: string;
  priorities: string[];
  barriers: string[];
  describeId: string | null;
  describeCustom: string;
  feelings: string[];
  assertId: string | null;
  assertCustom: string;
  reinforceIds: string[];
  anchorPhrase: string;
  middleGroundId: string | null;
  middleGroundCustom: string;
  walkAwayId: string | null;
  walkAwayCustom: string;
  debriefOverall?: string;
  debriefWentWell?: string[];
  debriefToChange?: string[];
  // Debrief chain analysis fields
  debriefCurrentFeelings?: string[];
  turningPointIds?: string[];
  momentResponseIds?: string[];
  bodySignalIds?: string[];
  thoughtPatternIds?: string[];
  underneathIds?: string[];
  copeAheadId?: string;
  reflectionLanded?: 'yes' | 'sort_of' | 'not_really';
}

export interface DearManDebriefContentResult {
  turningPoints: Array<{ id: string; label: string; validationText: string; sortOrder: number }>;
  momentResponses: Array<{ id: string; label: string; sortOrder: number }>;
  bodySignals: Array<{ id: string; label: string; sortOrder: number }>;
  thoughtPatterns: Array<{ id: string; label: string; theme: string; sortOrder: number }>;
  underneathEmotions: Array<{ id: string; label: string; sortOrder: number }>;
  overallResponses: { bad: string; mixed: string; good: string; notYet: string };
}

export interface DearManReflectionResult {
  reflection: string;
  copeAheadOptions: Array<{ id: string; label: string; rehearsal: string }>;
}
