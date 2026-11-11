// Type definitions for DEAR MAN Cloud Function responses.
// All content lives in the knowledge graph. This file is pure types.

export interface DearManContentResult {
  situationTypes: SituationType[];
  describeOptions: Record<string, DescribeOption[]>;
  assertOptions: Record<string, AssertOption[]>;
  reinforceOptions: SelectableOption[];
  barriers: SelectableOption[];
  barrierCoaching: Record<string, CoachingCard>;
  defaultCoaching: CoachingCard;
  anchorPhrases: AnchorPhrase[];
  anchorNeeds: AnchorNeed[];
  anchorGeneratorIntro: string;
  anchorGeneratorMakeItYours: string;
  negotiateOptions: {
    middleGround: SelectableOption[];
    walkAway: SelectableOption[];
  };
  negotiateHints: Record<string, string>;
  feelingChips: FeelingChip[];
  feelingGroups: FeelingGroup[];
  stepInsights: Record<string, string>;
  debriefOptions: {
    wentWell: SelectableOption[];
    toChange: SelectableOption[];
  };
  revealText: string;
  confidentCoaching: string;
  confidentBarrierNoRight: string;
  assertBarrierGuilty: string;
  /**
   * DEPRECATED (A4-4): Recover's numeric gates. DEAR MAN reads the band (getCapacityContent) and
   * never these; kept on the wire for one release, removed with WMP-02.
   */
  safetyGates?: DearManSafetyGates | null;
  /** DEAR MAN-specific gate copy (DearManSafetyCopy node); null on an older graph. */
  safetyCopy?: DearManSafetyCopy | null;
  /** Appear confident: body and voice cues for the plan card, in order (ConfidenceCue); absent from an older server. */
  confidenceCues?: Array<{ id: string; label: string; kind: string }>;
}

export interface DearManSafetyGates {
  gates: { downshiftAt: number; askMax: number; waitMinutes: number; [k: string]: number };
  /** WaitLockCopy strings (flow.copy.wait). */
  waitCopy: {
    locked: string; unlocked: string; unlockedShort: string;
    waiting: string; done: string; copy: string; copied: string;
  };
  /** Breathing pacer copy (flow.copy.breathe). */
  breatheCopy: {
    phases: Array<{ key: 'in' | 'sip' | 'out'; label: string; ms: number }>;
    cycles: number; start: string; skip: string; done: string; title: string; sub: string;
  };
}

/** DEAR MAN-specific gate copy (schema/dear-man-safety-gates.cypher). {emotion}/{need}/{minutes} are filled client-side. */
export interface DearManSafetyCopy {
  handoffSituationId?: string;
  carriedOver?: string;
  carriedOverDismiss?: string;
  oneMessageOnly?: string;
  hotHeading?: string;
  hotBody?: string;
  hotCoolDown?: string;
  hotReady?: string;
  hotBodyCue?: string;
  hotCooled?: string;
  /** People and safety (IE-B2): the picker and the safety question (src/components/people/PersonPicker.tsx). */
  personWho?: string;
  personNew?: string;
  personNameLabel?: string;
  personNameHint?: string;
  personRoleLabel?: string;
  personKeepLine?: string;
  personNoNameLine?: string;
  personSignedOutLine?: string;
  personGoOn?: string;
  personChanged?: string;
  personChangedHint?: string;
  safeQuestion?: string;
  safeYes?: string;
  safeNo?: string;
  safeUnsure?: string;
  riskQuestion?: string;
  riskHarm?: string;
  riskBadly?: string;
  riskUnsaid?: string;
  safetyRouteHeading?: string;
  safetyRouteBody?: string;
  safetyRouteEnding?: string;
  safetyRouteBack?: string;
  badlyHeadsUp?: string;
  /** The debrief's picker question (IE-B2); the prep's saved screen (ask_outcome) and Let go after a refused ask. */
  personWhoDebrief?: string;
  askOutcomeQuestion?: string;
  askOutcomeToday?: string;
  askOutcomeTomorrow?: string;
  askOutcomeWeek?: string;
  askOutcomeSet?: string;
  letGoLine?: string;
  letGoLink?: string;
}

export interface SituationType {
  id: string;
  label: string;
  sublabel: string;
  emoji: string;
  sortOrder: number;
  /** Fallback mirroring text when the user wrote their own description */
  mirrorText?: string;
  typicalFeelingIds?: string[];
}

export interface SelectableOption {
  id: string;
  label: string;
  sortOrder?: number;
}

export interface DescribeOption extends SelectableOption {
  /** "How this might typically make someone feel" — mirroring for alexithymia */
  mirrorText?: string;
  typicalFeelingIds?: string[];
}

export interface AssertOption extends SelectableOption {
  hasPlaceholder: boolean;
  /** Prompt shown when the user chooses to elaborate on this option */
  elaboratePrompt?: string;
}

export interface FeelingChip extends SelectableOption {
  groupId?: string | null;
}

export interface FeelingGroup {
  id: string;
  label: string;
  /** Presentation hint; the frontend maps it to a theme token */
  colorKey: string;
}

export interface AnchorPhrase extends SelectableOption {
  needIds?: string[];
  barrierIds?: string[];
}

export interface AnchorNeed {
  id: string;
  label: string;
  barrierIds?: string[];
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
  barriersCustom?: string;
  describeId: string | null;
  describeCustom: string;
  feelings: string[];
  /** First selected assert option (kept for backward compatibility) */
  assertId: string | null;
  assertIds?: string[];
  /** Optional elaboration per selected assert option, keyed by option id */
  assertDetails?: Record<string, string>;
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
  /** IE-03: the person picked (their Person id), when they were kept. The server refuses a prep for someone on the safety route. */
  personId?: string | null;
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
