import type { OppositeActionFlow, OppositeActionSession, SavedOppositeActionSession } from '../data/oppositeActionTypes';
import type { InvalidationRecoveryContent, InvalidationRecoveryProgress, InvalidationRecoverySession } from '../data/invalidationRecoveryTypes';
import { httpsCallable } from 'firebase/functions';
import { DEFAULT_PALETTE, type PaletteId } from '../data/palettes';
import { auth, functions } from './firebase';
import type { CollectedWord, FindTheFeelingContent, FindTheFeelingSession } from '../data/findTheFeelingTypes';
import type { CheckInNextAction, SaveCheckInRequest } from '../lib/spine/checkInPayload';
import type { PartReflect, PartsFeel } from '../data/partsTypes';

/**
 * Read-only content shipped with the app (src/data/content/, generated from the graph by
 * scripts/content-snapshot/build.mjs). Each file is its own chunk, fetched the first time it is
 * needed and kept for the page's life; a failed fetch can be retried.
 */
interface RelatedWordRow { id: string; name: string | null; quadrant: string | null; reason: string }
function shipped<T>(load: () => Promise<{ default: { content: unknown } }>): () => Promise<T> {
  let p: Promise<T> | null = null;
  return () => (p ??= load().then((m) => m.default.content as T).catch((e) => { p = null; throw e; }));
}
const relatedWordsFile = shipped<Record<string, RelatedWordRow[]>>(() => import('../data/content/related-words.json'));
const findTheFeelingFile = shipped<FindTheFeelingContent>(() => import('../data/content/find-the-feeling.json'));
const discriminatingQuestionsFile = shipped<Record<string, DiscriminatingQuestion[]>>(() => import('../data/content/discriminating-questions.json'));
export type { CheckInNextAction, SaveCheckInRequest } from '../lib/spine/checkInPayload';

// Types (same as before, for consistency across the app)
export interface CheckInRecord {
  id: string;
  userId: string;
  emotion: string;
  quadrant: string;
  intensity: { x: number; y: number };
  bodySensations: BodySensationRecord[];
  note: string;
  timestamp: Date;
  activationPatternId?: string | null;
  confidence?: number | null;
  emotionIds?: string[];
  source?: string | null;
  band?: string | null;
  nextAction?: { kind: string; toolId: string | null } | null;
}

export interface BodySensationRecord {
  x: number;
  y: number;
  /** A place id from src/data/bodyFigure.ts (older records were migrated to these). */
  region: string;
  /** Which side of a paired place; null on records from before the body map. */
  side?: 'both' | 'left' | 'right' | null;
  intensity: { x: number; y: number };
  /** Display labels of the picked words. */
  tags: string[];
  /** Stable SensationType ids of the picked words (empty on older records). */
  sensationIds?: string[];
  /** How strong, 0–1, from the body step's optional strength bar; null / absent when not used. */
  strength?: number | null;
  /** The place came from the body mirror (a typical place the user tapped to keep). */
  fromMirror?: boolean;
}

/** Bounded timeout for content loads so a stalled request becomes a recoverable error. */
const CONTENT_TIMEOUT_MS = 20_000;

// Cloud Function references
const saveCheckInFn = httpsCallable<SaveCheckInRequest, { id: string }>(functions, 'saveCheckIn');
const setCheckInNextActionFn = httpsCallable<{ checkInId: string; nextAction: CheckInNextAction }, { ok: true }>(
  functions, 'setCheckInNextAction');

// Response type from the Cloud Function
interface CheckInResponse {
  id: string;
  userId: string;
  emotion: string;
  quadrant: string;
  intensity: { x: number; y: number };
  bodySensations: BodySensationRecord[];
  note: string;
  timestamp: string; // ISO string from server
  activationPatternId?: string | null;
  confidence?: number | null;
  emotionIds?: string[];
  source?: string | null;
  band?: string | null;
  nextAction?: { kind: string; toolId: string | null } | null;
}

const getCheckInsByUserFn = httpsCallable<
  { limit?: number },
  { checkIns: CheckInResponse[] }
>(functions, 'getCheckInsByUser');

const ensureUserExistsFn = httpsCallable<void, { success: boolean }>(
  functions,
  'ensureUserExists'
);

// ============================================
// API FUNCTIONS (call Cloud Functions)
// ============================================

/**
 * Save (upsert) a check-in via Cloud Function (PR-C1). Idempotent by `id`: the check-in page saves
 * when the result renders and again, with the same id, after "add more detail". Always resolves to
 * the saved id. The user ID comes from Firebase Auth on the server.
 */
export async function saveCheckIn(request: SaveCheckInRequest): Promise<string> {
  const result = await saveCheckInFn(request);
  return result.data.id;
}

/** What the user did after the result (the check-in's terminal event; the first one wins). */
export async function setCheckInNextAction(checkInId: string, nextAction: CheckInNextAction): Promise<void> {
  await setCheckInNextActionFn({ checkInId, nextAction });
}

/**
 * Get check-ins for the authenticated user via Cloud Function
 * The user ID is automatically extracted from Firebase Auth on the server
 */
export async function getCheckInsByUser(
  _userId: string, // Kept for API compatibility, but not used (server gets it from auth)
  limit = 50
): Promise<CheckInRecord[]> {
  const result = await getCheckInsByUserFn({ limit });

  // Convert timestamp strings back to Date objects
  return result.data.checkIns.map((checkIn) => ({
    ...checkIn,
    timestamp: new Date(checkIn.timestamp),
  }));
}

/**
 * Ensure the user's graph node exists. AuthContext calls it once per signed-in uid per page load
 * (belt and braces with the onUserCreated trigger); the server extracts the user from Firebase Auth.
 */
export async function ensureUserExists(): Promise<void> {
  await ensureUserExistsFn();
}

// ============================================
// KNOWLEDGE GRAPH QUERY FUNCTIONS
// These power the neural state matching and recommendations
// ============================================

// Types for state analysis
export interface ActivationPatternResult {
  id: string;
  userFacingLabel: string;
  description: string;
  evidenceGrade: string;
  safetyConstraints: string[];
  clinicalNotes: string;
  confidence: number;
}

export type RoutingSide = 'acceptance' | 'change' | 'both';
export type RoutingDirection = 'down' | 'up' | 'orient' | 'neutral';
export type RoutingSkillKind = 'body' | 'orient' | 'hold' | 'change' | 'naming' | 'relational' | 'redirect' | 'values';

/** Mirrors functions/src/recommendation/types.ts. Cards are named from src/data/tools.ts, never from here. */
export interface ToolRecommendation {
  id: string;
  /** The graph concept's name ("TIPP"): compat only, never shown. */
  name: string;
  description: string;
  whenToUse: string;
  dbtBasis?: string | null;
  /** Legacy 'high' | 'medium' | 'relevant', or the rf-v1 slot. Never shown (E4-4). */
  relevance: string;
  slot?: 'primary' | 'swap';
  side?: RoutingSide;
  skillKind?: RoutingSkillKind;
  direction?: RoutingDirection;
  sequence?: 'after_primary';
  ruleId?: string;
  reason?: 'pattern_band' | 'emotion_gate' | 'fallback';
}

/** How the result was routed (E4-3); absent on positive_state. */
export interface Routing {
  version: string;
  band: 'steady' | 'stirred' | 'flooded';
  bandSource: 'probe' | 'ftf' | 'carried' | 'inferred';
  blank: boolean;
  recommendedToolIds: string[];
  ruleIds: string[];
  filtered: Array<{ toolId: string; ruleId: string; reason: string }>;
  receiveFirst: boolean;
  surface: 'checkin' | 'dear_man_debrief';
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

export interface DiscriminatingQuestion {
  id: string;
  text: string;
  subtext: string;
  order: number;
  required: boolean;
  responses: DiscriminatingResponse[];
}

export interface DiscriminatingResponse {
  id: string;
  label: string;
  subtext: string;
  order: number;
  isEscapeHatch: boolean;
  triggersNextQuestionId?: string;
}

export interface RelatedEmotion {
  id: string;
  name: string;
  reason: string;
}

// Cloud Function references for graph queries
const getStateAndToolsFn = httpsCallable<
  {
    quadrant: string;
    emotions?: string[];
    intensity?: { x: number; y: number };
    bodySensations?: Array<{ region: string; tags?: string[] }>;
    discriminatingAnswers?: Array<{ questionId: string; responseId: string }>;
    band?: 'steady' | 'stirred' | 'flooded';
    bandViaCantTell?: boolean;
    bandSource?: 'probe' | 'ftf' | 'carried';
    blank?: boolean;
    surface?: 'checkin' | 'dear_man_debrief';
  },
  StateResult
>(functions, 'getStateAndTools');



/**
 * Get the activation pattern and recommended tools based on check-in data
 * This is the main "What's happening right now" query
 */
const warmStateAndToolsFn = httpsCallable<{ warm: true }, { warm: true }>(functions, 'getStateAndTools');
let lastWarm = 0;

/**
 * Wake getStateAndTools (and its Neo4j connection) before the result screen needs it, so the check-in
 * result doesn't wait on a cold Cloud Function. Signed-in only (the function requires it); at most
 * once every 2 minutes; never throws (a failed warm-up just means the real call is cold).
 */
export function warmCheckInEngine(): void {
  const now = Date.now();
  if (now - lastWarm < 120_000) return;
  lastWarm = now;
  warmStateAndToolsFn({ warm: true }).catch(() => { lastWarm = 0; });
}

export async function getStateAndTools(input: {
  quadrant: string;
  emotions?: string[];
  intensity?: { x: number; y: number };
  bodySensations?: Array<{ region: string; tags?: string[] }>;
  discriminatingAnswers?: Array<{ questionId: string; responseId: string }>;
  /** The check-in's band (A4-3): the engine routes by pattern × band (E4-3). */
  band?: 'steady' | 'stirred' | 'flooded';
  bandViaCantTell?: boolean;
  /** Where the band came from (the reading's source; `handoff` etc. are sent as `carried`). */
  bandSource?: 'probe' | 'ftf' | 'carried';
  /** Find the feeling's pull was `blank`: never calm this state. */
  blank?: boolean;
  surface?: 'checkin' | 'dear_man_debrief';
}): Promise<StateResult> {
  const result = await getStateAndToolsFn(input);
  return result.data;
}

/**
 * The check-in's follow-up questions for a quadrant (to tell activation patterns apart). Read from
 * the file the app ships (src/data/content/discriminating-questions.json, generated from the graph
 * by scripts/content-snapshot/build.mjs), so "Continue" never waits on a Cloud Function.
 */
export async function getDiscriminatingQuestions(
  quadrant: string
): Promise<DiscriminatingQuestion[]> {
  return (await discriminatingQuestionsFile())[quadrant] ?? [];
}

/**
 * Start loading the check-in's files (related words, follow-up questions) when the check-in opens,
 * so neither the first word tap nor "Continue" waits even for a file. Errors are left to the real
 * calls, which retry.
 */
export function preloadCheckInContent(): void {
  relatedWordsFile().catch(() => {});
  discriminatingQuestionsFile().catch(() => {});
}

/**
 * "Often alongside": the words the graph relates to `emotionId` (RELATED_TO, then shared brain
 * structures), best first, at most 6, optionally only from one quadrant. Read from the file the app
 * ships (src/data/content/related-words.json, generated from the graph by
 * scripts/content-snapshot/build.mjs), so a tap never waits on a Cloud Function. Opposite emotions
 * are not included: they are the opposite of "alongside".
 */
export async function getRelatedEmotions(
  emotionId: string,
  quadrant?: string
): Promise<RelatedEmotion[]> {
  const rows = (await relatedWordsFile())[emotionId] ?? [];
  return rows
    .filter((r) => !quadrant || r.quadrant === quadrant)
    .slice(0, 6)
    .map((r) => ({ id: r.id, name: r.name || r.id.replace(/_/g, ' '), reason: r.reason }));
}

// ============================================
// OPPOSITE ACTION CONTENT
// ============================================

export interface ActionUrgeData {
  id: string;
  label: string;
  small: string;
  medium: string;
  bigger: string;
  /** Urge-specific body cues, shown before the parent defaults. */
  somaticCues?: string[];
  /** When true, ONLY the urge's cues are shown (e.g. freeze needs up-regulation). */
  somaticReplace?: boolean;
}

export interface ParentProtocol {
  label: string;
  fitsTheFactsWhen: string[];
  fitsFactsGuidance: string;
  whyItWorks: string;
  acknowledgment: string;
  bodyOpposite: string;
  defaultOpposites: { small: string; medium: string; bigger: string };
  /** Atomic do-it-now body cues for the somatic circuit-breaker (graph: c.somaticCues). */
  somaticCues: string[];
  urges: ActionUrgeData[];
}

export interface OppositeActionEmotionMapping {
  emotionId: string;
  applicable: boolean;
  dbtParent: string | null;
  clinicalNote: string;
  alternativeSkill: string | null;
}

export interface OppositeActionContent {
  flow?: OppositeActionFlow;
  emotions: OppositeActionEmotionMapping[];
  parents: Record<string, ParentProtocol>;
}

const getOppositeActionContentFn = httpsCallable<
  { emotionIds: string[] },
  OppositeActionContent
>(functions, 'getOppositeActionContent', { timeout: CONTENT_TIMEOUT_MS });

/**
 * Get opposite action content for a set of emotions.
 * Returns per-emotion OA applicability + per-parent protocol data
 * including fits-the-facts criteria, graduated urge opposites, etc.
 */
export async function getOppositeActionContent(
  emotionIds: string[]
): Promise<OppositeActionContent> {
  const result = await getOppositeActionContentFn({ emotionIds });
  return result.data;
}

// ============================================
// PROBLEM SOLVE CONTENT
// ============================================

export interface SolutionDirectionData {
  id: string;
  label: string;
  description: string;
  small: string;
  medium: string;
  bigger: string;
  linkedToolId: string | null;
  sortOrder: number;
}

export interface DecompositionAspectData {
  id: string;
  label: string;
  defaultBucket: string;
  sortOrder: number;
}

export interface ProblemTypeData {
  id: string;
  label: string;
  description: string;
  recognitionPrompt: string;
  sortOrder: number;
  solutionDirections: SolutionDirectionData[];
  decompositionAspects: DecompositionAspectData[];
}

export interface ProblemSolveParentProtocol {
  label: string;
  psAcknowledgment: string;
  problemDefinitionPrompts: string[];
  cannotChangeGuidance: string;
  psInterpersonalHint: string | null;
  ruminationRiskLevel: string;
  ruminationGuardMessage: string | null;
  psCompanionTools: string[];
  problemTypes: ProblemTypeData[];
}

export interface ProblemSolveEmotionMapping {
  emotionId: string;
  applicable: boolean;
  dbtParent: string | null;
  clinicalNote: string;
  alternativeSkill: string | null;
}

export interface AmbivalenceOptionData {
  id: string;
  label: string;
  therapeuticFollow: string;
  redirectToolId: string | null;
  sortOrder: number;
}

export interface BarrierSubResponseData {
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
  ambivalenceOptions: AmbivalenceOptionData[];
}

export interface BarrierTypeData {
  id: string;
  label: string;
  description: string;
  sortOrder: number;
  skipsSolutions: boolean;
  subResponses: BarrierSubResponseData[];
}

export interface ProblemSolveProtocol {
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

export interface ProblemSolveContent {
  emotions: ProblemSolveEmotionMapping[];
  parents: Record<string, ProblemSolveParentProtocol>;
  protocol: ProblemSolveProtocol;
  barrierTypes: BarrierTypeData[];
}

const getProblemSolveContentFn = httpsCallable<
  { emotionIds: string[] },
  ProblemSolveContent
>(functions, 'getProblemSolveContent', { timeout: CONTENT_TIMEOUT_MS });

/**
 * Get problem solve content for a set of emotions.
 * Returns per-emotion PS applicability, per-parent protocol data
 * with problem types and solution directions, plus the cross-cutting protocol.
 */
export async function getProblemSolveContent(
  emotionIds: string[]
): Promise<ProblemSolveContent> {
  const result = await getProblemSolveContentFn({ emotionIds });
  return result.data;
}

// ============================================
// TOOL USAGE TRACKING
// ============================================

const trackToolUsageFn = httpsCallable<
  { toolId: string },
  { success: boolean }
>(functions, 'trackToolUsage');

/**
 * Track that the user opened/used a tool (fire-and-forget)
 */
export async function trackToolUsage(toolId: string): Promise<void> {
  try {
    await trackToolUsageFn({ toolId });
  } catch {
    // Silently fail -- don't break the tool experience
  }
}

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

export interface UserProfile {
  displayName: string | null;
  email: string;
  photoURL: string | null;
  theme: 'dark' | 'light' | 'system';
  palette: PaletteId;
  checkInReminder: boolean;
  reminderTime: string;
  reminderDays: number[];
  weeklyDigest: boolean;
  dataRetentionDays: number | null;
  shareAnonymousData: boolean;
  /** IANA zone, synced from the browser (follow-up windows, quiet hours). */
  timeZone: string | null;
  /** Parts on (Settings → Privacy & Data). Off by default; turning it off deletes nothing. */
  partsEnabled: boolean;
}

export const DEFAULT_PROFILE: UserProfile = {
  displayName: null,
  email: '',
  photoURL: null,
  theme: 'light',
  palette: DEFAULT_PALETTE,
  checkInReminder: false,
  reminderTime: '09:00',
  reminderDays: [1, 2, 3, 4, 5],
  weeklyDigest: false,
  dataRetentionDays: null,
  shareAnonymousData: false,
  timeZone: null,
  partsEnabled: false,
};

const getUserProfileFn = httpsCallable<void, { profile: UserProfile }>(
  functions,
  'getUserProfile'
);

const updateUserProfileFn = httpsCallable<
  Partial<UserProfile>,
  { success: boolean }
>(functions, 'updateUserProfile');

const deleteUserDataFn = httpsCallable<
  { deleteAuth?: boolean },
  { success: boolean }
>(functions, 'deleteUserData');

const exportUserDataFn = httpsCallable<
  void,
  { data: Record<string, unknown> }
>(functions, 'exportUserData');

/**
 * Get the authenticated user's profile
 */
export async function getUserProfile(): Promise<UserProfile> {
  const result = await getUserProfileFn();
  return result.data.profile;
}

/**
 * Update profile fields (partial update)
 */
export async function updateUserProfile(
  updates: Partial<UserProfile>
): Promise<void> {
  await updateUserProfileFn(updates);
}

/**
 * Delete all user data from Neo4j (and optionally Firebase Auth)
 */
export async function deleteUserData(
  deleteAuth = false
): Promise<void> {
  await deleteUserDataFn({ deleteAuth });
}

/**
 * Export all user data as JSON
 */
export async function exportUserData(): Promise<Record<string, unknown>> {
  const result = await exportUserDataFn();
  return result.data.data;
}

// ============================================
// DEAR MAN CONTENT + SESSION
// ============================================

import type { DearManContentResult, DearManSessionData, DearManDebriefContentResult, DearManReflectionResult } from '../data/dearManTypes';
export type { DearManContentResult, DearManSessionData, DearManDebriefContentResult, DearManReflectionResult };

const getDearManContentFn = httpsCallable<void, DearManContentResult>(
  functions, 'getDearManContent', { timeout: CONTENT_TIMEOUT_MS }
);

/**
 * Get all DEAR MAN content from the graph in one call.
 * Returns situation types, curated options, coaching content, etc.
 */
export async function getDearManContent(): Promise<DearManContentResult> {
  const result = await getDearManContentFn();
  return result.data;
}

const saveDearManSessionFn = httpsCallable<
  DearManSessionData,
  { success: boolean; id?: string | null }
>(functions, 'saveDearManSession');

/** Resolves to the saved session's id (PR-S4; null from an older server). */
export async function saveDearManSession(
  data: DearManSessionData
): Promise<string | null> {
  const result = await saveDearManSessionFn(data);
  return result.data.id ?? null;
}

const getDearManDebriefContentFn = httpsCallable<void, DearManDebriefContentResult>(
  functions, 'getDearManDebriefContent', { timeout: CONTENT_TIMEOUT_MS }
);

export async function getDearManDebriefContent(): Promise<DearManDebriefContentResult> {
  const result = await getDearManDebriefContentFn();
  return result.data;
}

const getDearManReflectionFn = httpsCallable<
  { turningPointIds: string[]; momentResponseIds: string[] },
  DearManReflectionResult
>(functions, 'getDearManReflection');

export async function getDearManReflection(
  turningPointIds: string[],
  momentResponseIds: string[]
): Promise<DearManReflectionResult> {
  const result = await getDearManReflectionFn({ turningPointIds, momentResponseIds });
  return result.data;
}

// Saved session record returned from getDearManSessions
export interface DearManSessionRecord {
  id: string;
  type: 'prep' | 'debrief';
  /** `one_message`: a One message prep (docs/design/one-message.md); `plan` for a prep made on the skill player (docs/design/dear-man-prep.md); empty for an older full prep and the debrief. */
  mode?: string;
  relationshipType: string;
  situationType: string;
  priorities: string[];
  barriers: string[];
  barriersCustom: string;
  describeId: string | null;
  describeCustom: string;
  feelings: string[];
  assertId: string | null;
  assertIds: string[];
  assertDetails: Record<string, string>;
  assertCustom: string;
  reinforceIds: string[];
  anchorPhrase: string;
  middleGroundId: string | null;
  middleGroundCustom: string;
  walkAwayId: string | null;
  walkAwayCustom: string;
  debriefOverall: string | null;
  debriefWentWell: string[];
  debriefToChange: string[];
  debriefCurrentFeelings: string[];
  createdAt: Date;
}

const getDearManSessionsFn = httpsCallable<
  { limit?: number },
  { sessions: Array<Omit<DearManSessionRecord, 'createdAt'> & { createdAt: string }> }
>(functions, 'getDearManSessions');

export async function getDearManSessions(limit = 20): Promise<DearManSessionRecord[]> {
  const result = await getDearManSessionsFn({ limit });
  return result.data.sessions.map((s) => ({
    ...s,
    createdAt: new Date(s.createdAt),
  }));
}

// ============================================
// INSIGHTS DATA
// ============================================

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

export interface GrowthEvidenceInsight {
  insights: Array<{ key: string; text: string; data: Record<string, number> }>;
}

export interface SomaticCorrelationData {
  correlations: Array<{ region: string; patternId: string; count: number }>;
  narrative: string;
}

/** Mirrors functions/src/insights/types.ts ToolOutcomeSummary (Reflect R1). */
export interface ToolOutcomeSummary {
  toolId: string;
  /** Absent from a server older than Reflect R1. */
  measure?: 'then_vs_now' | 'urge' | 'plan';
  direction?: 'down' | 'orient' | null;
  answered?: number;
  wentWell?: number;
  helpedPct: number;
  totalUses: number;
}

export interface ToolEffectivenessData {
  tools: ToolOutcomeSummary[];
}

export interface PatternFrequency {
  patternId: string;
  count: number;
}

export interface InsightsPayload {
  formulation: FormulationInsight | null;
  proactiveAlert: ProactiveAlert | null;
  growthEvidence: GrowthEvidenceInsight | null;
  somaticCorrelation: SomaticCorrelationData | null;
  toolEffectiveness: ToolEffectivenessData | null;
  /** Retired in Reflect R1 ("did it help?" lives in Today since PR-S5); always null. */
  continuityPrompt: null;
  patternFrequencies: PatternFrequency[];
  totalCheckIns: number;
  /**
   * Mirrors functions/src/insights/types.ts: the parts the person knows, each with its lines past their
   * thresholds (all time). null with parts off; absent from a server older than part-stats-reflect.
   */
  parts?: PartReflect[] | null;
  /**
   * Mirrors functions/src/insights/types.ts: how the person has met their parts lately, across all of
   * them (feel-toward ids). null below its threshold or with parts off; absent from an older server.
   */
  partsFeel?: PartsFeel | null;
}

const getInsightsDataFn = httpsCallable<
  { timeRange?: '7d' | '30d' | 'all' },
  InsightsPayload
>(functions, 'getInsightsData');

const recordToolOutcomeFn = httpsCallable<
  { outcome: 'helped' | 'somewhat' | 'not_really' },
  { success: boolean }
>(functions, 'recordToolOutcome');

/** How long one Insights answer is reused: long enough for Reflect and its side panel, which ask together; short enough that coming back from a tool reads fresh. */
export const INSIGHTS_REUSE_MS = 5_000;
const insightsCache = new Map<string, { at: number; promise: Promise<InsightsPayload> }>();

/**
 * Insights for Reflect. Calls for the same user and range within INSIGHTS_REUSE_MS share one
 * request (the page and the side panel used to compute the whole thing twice); a failed request
 * is forgotten at once. `fresh` skips the reuse.
 */
export async function getInsightsData(
  timeRange: '7d' | '30d' | 'all' = '30d',
  { fresh = false }: { fresh?: boolean } = {},
): Promise<InsightsPayload> {
  const key = `${auth.currentUser?.uid ?? ''}:${timeRange}`;
  const hit = insightsCache.get(key);
  if (!fresh && hit && Date.now() - hit.at < INSIGHTS_REUSE_MS) return hit.promise;
  const promise = getInsightsDataFn({ timeRange }).then((r) => r.data);
  insightsCache.set(key, { at: Date.now(), promise });
  promise.catch(() => { if (insightsCache.get(key)?.promise === promise) insightsCache.delete(key); });
  return promise;
}

/**
 * Record outcome of most recent tool usage
 */
export async function recordToolOutcome(
  outcome: 'helped' | 'somewhat' | 'not_really'
): Promise<void> {
  await recordToolOutcomeFn({ outcome });
}

const saveOppositeActionSessionFn = httpsCallable<OppositeActionSession, { success: boolean }>(
  functions, 'saveOppositeActionSession', { timeout: CONTENT_TIMEOUT_MS }
);
export async function saveOppositeActionSession(data: OppositeActionSession): Promise<void> {
  await saveOppositeActionSessionFn(data);
}

const getOppositeActionSessionsFn = httpsCallable<
  { limit?: number },
  { sessions: SavedOppositeActionSession[] }
>(functions, 'getOppositeActionSessions', { timeout: CONTENT_TIMEOUT_MS });

/**
 * The signed-in user's recent Opposite Action sessions (newest first, schema v2 only).
 * Used for follow-up check-ins on plans tried later and per-urge trends.
 */
export async function getOppositeActionSessions(
  limit = 20
): Promise<SavedOppositeActionSession[]> {
  const result = await getOppositeActionSessionsFn({ limit });
  return result.data.sessions;
}

const getOppositeActionSessionFn = httpsCallable<
  { id: string },
  { session: SavedOppositeActionSession | null }
>(functions, 'getOppositeActionSession', { timeout: CONTENT_TIMEOUT_MS });

/** One of the signed-in user's sessions by id (for follow-up deep links), or null. */
export async function getOppositeActionSession(
  id: string
): Promise<SavedOppositeActionSession | null> {
  const result = await getOppositeActionSessionFn({ id });
  return result.data.session;
}

const getOppositeActionFollowUpsFn = httpsCallable<
  Record<string, never>,
  { sessions: SavedOppositeActionSession[]; copy: Record<string, string> }
>(functions, 'getOppositeActionFollowUps', { timeout: CONTENT_TIMEOUT_MS });

/**
 * Planned (not yet reflected) sessions that have a follow-up time, soonest first,
 * plus the small set of graph copy the home card and reminders need.
 */
export async function getOppositeActionFollowUps(): Promise<{
  sessions: SavedOppositeActionSession[];
  copy: Record<string, string>;
}> {
  const result = await getOppositeActionFollowUpsFn({});
  return result.data;
}

// ============================================
// INVALIDATION RECOVERY ("Recover from a hurtful moment")
// ============================================

const getInvalidationRecoveryContentFn = httpsCallable<void, InvalidationRecoveryContent>(
  functions, 'getInvalidationRecoveryContent', { timeout: CONTENT_TIMEOUT_MS }
);
/** All graph content for the flow: states, protocols, needs, exits, skill deck and the flow document. */
export async function getInvalidationRecoveryContent(): Promise<InvalidationRecoveryContent> {
  return (await getInvalidationRecoveryContentFn()).data;
}

const saveInvalidationRecoverySessionFn = httpsCallable<InvalidationRecoverySession, { success: boolean }>(
  functions, 'saveInvalidationRecoverySession', { timeout: CONTENT_TIMEOUT_MS }
);
/** Explicit save at close. No free text is sent. */
export async function saveInvalidationRecoverySession(data: InvalidationRecoverySession): Promise<void> {
  await saveInvalidationRecoverySessionFn(data);
}

const getInvalidationRecoveryProgressFn = httpsCallable<void, InvalidationRecoveryProgress>(
  functions, 'getInvalidationRecoveryProgress', { timeout: CONTENT_TIMEOUT_MS }
);
export async function getInvalidationRecoveryProgress(): Promise<InvalidationRecoveryProgress> {
  return (await getInvalidationRecoveryProgressFn()).data;
}

// ── Find the feeling (Shape it / Tune it) ──

/** Find the feeling's content, from the file the app ships (src/data/content/find-the-feeling.json). */
export async function getFindTheFeelingContent(): Promise<FindTheFeelingContent> {
  return findTheFeelingFile();
}

const saveFindTheFeelingSessionFn = httpsCallable<FindTheFeelingSession, { success: boolean }>(
  functions, 'saveFindTheFeelingSession', { timeout: CONTENT_TIMEOUT_MS }
);
/** Explicit save at the end. No free text is sent. */
export async function saveFindTheFeelingSession(data: FindTheFeelingSession): Promise<void> {
  await saveFindTheFeelingSessionFn(data);
}

const getFeelingCollectionFn = httpsCallable<void, { words: CollectedWord[] }>(
  functions, 'getFeelingCollection', { timeout: CONTENT_TIMEOUT_MS }
);
export async function getFeelingCollection(): Promise<CollectedWord[]> {
  return (await getFeelingCollectionFn()).data.words;
}
