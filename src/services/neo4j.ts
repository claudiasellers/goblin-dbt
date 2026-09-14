import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

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
}

export interface BodySensationRecord {
  x: number;
  y: number;
  region: string;
  intensity: { x: number; y: number };
  tags: string[];
}

/** Bounded timeout for content loads so a stalled request becomes a recoverable error. */
const CONTENT_TIMEOUT_MS = 20_000;

// Cloud Function references
const saveCheckInFn = httpsCallable<
  Omit<CheckInRecord, 'id' | 'userId' | 'timestamp'> & { timestamp: string; activationPatternId?: string; confidence?: number },
  { id: string }
>(functions, 'saveCheckIn');

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
}

const getCheckInsByUserFn = httpsCallable<
  { limit?: number },
  { checkIns: CheckInResponse[] }
>(functions, 'getCheckInsByUser');

const ensureUserExistsFn = httpsCallable<void, { success: boolean }>(
  functions,
  'ensureUserExists'
);

const initializeSchemaFn = httpsCallable<void, { success: boolean; message: string }>(
  functions,
  'initializeSchema'
);

// ============================================
// API FUNCTIONS (call Cloud Functions)
// ============================================

/**
 * Save a check-in via Cloud Function
 * The user ID is automatically extracted from Firebase Auth on the server
 */
export async function saveCheckIn(
  _userId: string, // Kept for API compatibility, but not used (server gets it from auth)
  checkIn: Omit<CheckInRecord, 'id' | 'userId'>
): Promise<string> {
  const result = await saveCheckInFn({
    emotion: checkIn.emotion,
    quadrant: checkIn.quadrant,
    intensity: checkIn.intensity,
    bodySensations: checkIn.bodySensations,
    note: checkIn.note,
    timestamp: checkIn.timestamp.toISOString(),
    ...(checkIn.activationPatternId && { activationPatternId: checkIn.activationPatternId }),
    ...(checkIn.confidence != null && { confidence: checkIn.confidence }),
  });

  return result.data.id;
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
 * Ensure user exists in Neo4j via Cloud Function
 * Called after signup/login - the server extracts user info from Firebase Auth
 */
export async function ensureUserExists(
  _userId: string, // Kept for API compatibility, but not used
  _email: string // Kept for API compatibility, but not used
): Promise<void> {
  await ensureUserExistsFn();
}

/**
 * Initialize Neo4j schema via Cloud Function
 * Run once during initial setup
 */
export async function initializeSchema(): Promise<void> {
  await initializeSchemaFn();
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

export interface ToolRecommendation {
  id: string;
  name: string;
  description: string;
  whenToUse: string;
  dbtBasis?: string;
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
  },
  StateResult
>(functions, 'getStateAndTools');

const getDiscriminatingQuestionsFn = httpsCallable<
  { quadrant: string },
  { questions: DiscriminatingQuestion[] }
>(functions, 'getDiscriminatingQuestions');

const getRelatedEmotionsFn = httpsCallable<
  { emotionId: string; quadrant?: string },
  { relatedEmotions: RelatedEmotion[] }
>(functions, 'getRelatedEmotions');

const getQuickToolsFn = httpsCallable<
  { quadrant: string; intensity?: { x: number; y: number } },
  { tools: ToolRecommendation[]; message: string }
>(functions, 'getQuickTools');

/**
 * Get the activation pattern and recommended tools based on check-in data
 * This is the main "What's happening right now" query
 */
export async function getStateAndTools(input: {
  quadrant: string;
  emotions?: string[];
  intensity?: { x: number; y: number };
  bodySensations?: Array<{ region: string; tags?: string[] }>;
  discriminatingAnswers?: Array<{ questionId: string; responseId: string }>;
}): Promise<StateResult> {
  const result = await getStateAndToolsFn(input);
  return result.data;
}

/**
 * Get discriminating questions for a quadrant.
 * Used to differentiate between activation patterns within the same quadrant.
 */
export async function getDiscriminatingQuestions(
  quadrant: string
): Promise<DiscriminatingQuestion[]> {
  const result = await getDiscriminatingQuestionsFn({ quadrant });
  return result.data.questions;
}

/**
 * Get related emotions based on shared neural substrates
 * Powers the "You might also be feeling..." feature
 */
export async function getRelatedEmotions(
  emotionId: string,
  quadrant?: string
): Promise<RelatedEmotion[]> {
  const result = await getRelatedEmotionsFn({ emotionId, quadrant });
  return result.data.relatedEmotions;
}

/**
 * Get quick tools based on just quadrant and intensity
 * Used for the "Help me now" minimal-input path
 */
export async function getQuickTools(
  quadrant: string,
  intensity?: { x: number; y: number }
): Promise<{ tools: ToolRecommendation[]; message: string }> {
  const result = await getQuickToolsFn({ quadrant, intensity });
  return result.data;
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
}

export interface ParentProtocol {
  label: string;
  fitsTheFactsWhen: string[];
  fitsFactsGuidance: string;
  whyItWorks: string;
  acknowledgment: string;
  bodyOpposite: string;
  defaultOpposites: { small: string; medium: string; bigger: string };
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

const getWeeklyToolUsageCountFn = httpsCallable<
  void,
  { count: number }
>(functions, 'getWeeklyToolUsageCount');

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

/**
 * Get how many tools the user has used in the last 7 days
 */
export async function getWeeklyToolUsageCount(): Promise<number> {
  const result = await getWeeklyToolUsageCountFn();
  return result.data.count;
}

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

export interface UserProfile {
  displayName: string | null;
  email: string;
  photoURL: string | null;
  theme: 'dark' | 'light' | 'system';
  checkInReminder: boolean;
  reminderTime: string;
  reminderDays: number[];
  weeklyDigest: boolean;
  dailyCheckInGoal: number;
  weeklyToolGoal: number;
  focusCategories: string[];
  dataRetentionDays: number | null;
  shareAnonymousData: boolean;
}

export const DEFAULT_PROFILE: UserProfile = {
  displayName: null,
  email: '',
  photoURL: null,
  theme: 'light',
  checkInReminder: false,
  reminderTime: '09:00',
  reminderDays: [1, 2, 3, 4, 5],
  weeklyDigest: false,
  dailyCheckInGoal: 1,
  weeklyToolGoal: 3,
  focusCategories: [],
  dataRetentionDays: null,
  shareAnonymousData: false,
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
  { success: boolean }
>(functions, 'saveDearManSession');

export async function saveDearManSession(
  data: DearManSessionData
): Promise<void> {
  await saveDearManSessionFn(data);
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

export interface ToolEffectivenessData {
  tools: Array<{ toolId: string; helpedPct: number; totalUses: number }>;
}

export interface ContinuityPrompt {
  toolId: string;
  toolTimestamp: string;
  checkInEmotion: string;
  checkInTimestamp: string;
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
  continuityPrompt: ContinuityPrompt | null;
  patternFrequencies: PatternFrequency[];
  totalCheckIns: number;
}

const getInsightsDataFn = httpsCallable<
  { timeRange?: '7d' | '30d' | 'all' },
  InsightsPayload
>(functions, 'getInsightsData');

const recordToolOutcomeFn = httpsCallable<
  { outcome: 'helped' | 'somewhat' | 'not_really' },
  { success: boolean }
>(functions, 'recordToolOutcome');

/**
 * Get all insights data for the Insights page
 */
export async function getInsightsData(
  timeRange: '7d' | '30d' | 'all' = '30d'
): Promise<InsightsPayload> {
  const result = await getInsightsDataFn({ timeRange });
  return result.data;
}

/**
 * Record outcome of most recent tool usage
 */
export async function recordToolOutcome(
  outcome: 'helped' | 'somewhat' | 'not_really'
): Promise<void> {
  await recordToolOutcomeFn({ outcome });
}
