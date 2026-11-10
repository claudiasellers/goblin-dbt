/**
 * Check-in result types (getStateAndTools). Pure, no imports: the engine modules and the root
 * golden tests load it. Mirrored by hand in src/services/neo4j.ts.
 */

export type Quadrant = 'high-unpleasant' | 'low-unpleasant' | 'high-pleasant' | 'low-pleasant';
export const QUADRANTS: readonly Quadrant[] = ['high-unpleasant', 'low-unpleasant', 'high-pleasant', 'low-pleasant'];

export type Band = 'steady' | 'stirred' | 'flooded';
export const BANDS: readonly Band[] = ['steady', 'stirred', 'flooded'];
/** Where the routing band came from. `inferred`: no band was given (never stored as `band*`, R1). */
export type RoutingBandSource = 'probe' | 'ftf' | 'carried' | 'inferred';
export const REQUEST_BAND_SOURCES: readonly Exclude<RoutingBandSource, 'inferred'>[] = ['probe', 'ftf', 'carried'];
export type Surface = 'checkin' | 'dear_man_debrief';
export const SURFACES: readonly Surface[] = ['checkin', 'dear_man_debrief'];
export type Side = 'acceptance' | 'change' | 'both';
export type Direction = 'down' | 'up' | 'orient' | 'neutral';
export type SkillKind = 'body' | 'orient' | 'hold' | 'change' | 'naming' | 'relational' | 'redirect';
export type RejectReason = 'band' | 'direction' | 'contraindicated' | 'emotion_gate' | 'diversity';
export type Slot = 'primary' | 'swap';

export interface CheckInInput {
  quadrant: string;
  /** Display names or graph ids; normalised server-side (lower case, spaces → `_`). */
  emotions?: string[];
  intensity?: { x: number; y: number };
  /** Accepted and still unread (as before E4). */
  bodySensations?: Array<{ region: string; tags?: string[] }>;
  discriminatingAnswers?: Array<{ questionId: string; responseId: string }>;
  /** E4-3: the check-in's band (E3's probe, FTF, or carried ≤ 20 min). Absent → inferred. */
  band?: Band;
  bandSource?: Exclude<RoutingBandSource, 'inferred'>;
  /** E4-3: FTF's pull was `blank` (never calm this state). */
  blank?: boolean;
  /** E4-3: which screen asked (logged; rows are filtered to `checkin_result` either way). */
  surface?: Surface;
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
  /** The graph concept's name (compat). The UI shows the tool's own name from src/data/tools.ts. */
  name: string;
  description: string;
  whenToUse: string;
  dbtBasis?: string | null;
  /** Legacy: 'high' | 'medium' | 'relevant'. rf-v1: the slot ('primary' | 'swap'); never shown. */
  relevance: string;
  // --- rf-v1 only (absent from legacy results) ---
  slot?: Slot;
  side?: Side;
  skillKind?: SkillKind;
  direction?: Direction;
  /** A `requiresPrior` row in the swap slot: shown as "once you've moved a little". */
  sequence?: 'after_primary';
  /** RECOMMENDED_FOR.id, or 'fallback'. */
  ruleId?: string;
  reason?: 'pattern_band' | 'emotion_gate' | 'fallback';
}

/** How the result was routed (E4-3). Present on every non-positive result. */
export interface Routing {
  version: string;                 // RoutingPolicy.version ('rf-v1') or 'legacy' (kill switch)
  band: Band;
  bandSource: RoutingBandSource;
  blank: boolean;
  recommendedToolIds: string[];    // what the engine chose, primary first
  ruleIds: string[];
  filtered: Array<{ toolId: string; ruleId: string; reason: RejectReason }>;
  /** WMP-04 v0: the first card is a change skill (A5's beat renders first either way, R21). */
  receiveFirst: boolean;
  surface: Surface;
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
  routing?: Routing;
}

// ---- The routing slice (graph content the E4-3 selector reads) ----

export interface RoutingConcept {
  id: string;
  appToolId: string;
  name: string | null;
  description: string | null;
  whenToUse: string | null;
  dbtBasis: string | null;
  side: Side;
  skillKind: SkillKind;
  direction: Direction;
  /** Emotion ids the concept ADDRESSES / REDUCES / TARGETS (the `addresses` gate and a tie-break). */
  addresses: string[];
  /** CONTRAINDICATED_FOR targets (hook; no edges authored in Phase A). */
  contraPatterns: string[];
  contraFlags: string[];
}

export interface RoutingRow {
  id: string;
  bands: Band[];
  priority: number;
  direction: Direction | null;
  side: Side | null;
  requiresPrior: string | null;
  /**
   * `addresses`: a user word is in the concept's ADDRESSES set; `none_named`: no words;
   * `words`: one of the user's words (as sent) is in `words` (a reviewed per-word rule, Oct 2026).
   */
  emotionGate: 'addresses' | 'none_named' | 'words' | null;
  /** The words a `words` gate fires on (grid ids as sent); empty otherwise. */
  words: string[];
  active: boolean;
}

export interface PatternSlice {
  id: string;
  blank: boolean;
  emotions: string[];
  rows: Array<{ row: RoutingRow; concept: RoutingConcept }>;
}

export interface RoutingPolicy {
  version: string;
  enabled: boolean;
  maxCards: number;
  fallbackConceptId: string;
  defaultBand: Band;
  floodedPatterns: string[];
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
