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
// REMOVED - These were for direct Neo4j access
// ============================================
// The following functions are no longer needed since we don't connect directly:
// - getDriver()
// - getSession()
// - closeDriver()
//
// Neo4j credentials are now securely stored as Firebase secrets
// and only accessible to Cloud Functions running on the server.
