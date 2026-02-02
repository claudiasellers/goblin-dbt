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
}

export interface BodySensationRecord {
  x: number;
  y: number;
  region: string;
  intensity: { x: number; y: number };
  tags: string[];
}

// Cloud Function references
const saveCheckInFn = httpsCallable<
  Omit<CheckInRecord, 'id' | 'userId' | 'timestamp'> & { timestamp: string },
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

export interface StateResult {
  pattern: ActivationPatternResult;
  tools: ToolRecommendation[];
  safetyFlag?: SafetyFlag;
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
  },
  StateResult
>(functions, 'getStateAndTools');

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
}): Promise<StateResult> {
  const result = await getStateAndToolsFn(input);
  return result.data;
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
// REMOVED - These were for direct Neo4j access
// ============================================
// The following functions are no longer needed since we don't connect directly:
// - getDriver()
// - getSession()
// - closeDriver()
//
// Neo4j credentials are now securely stored as Firebase secrets
// and only accessible to Cloud Functions running on the server.
