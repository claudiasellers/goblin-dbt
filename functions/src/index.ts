/**
 * Deployed callables. Every export here is a Cloud Function whose deploy name is its export name:
 * renaming or removing one is a breaking change for the client (src/services/neo4j.ts).
 * Named re-exports only (never `export *`), so a helper can never become a callable by accident.
 * functions/test/unit/exports.test.cjs pins this list against test/fixtures/endpoints.json.
 */
import './shared/admin'; // initialise firebase-admin once, before any callable module loads

export { saveCheckIn, getCheckInsByUser } from './checkin';
export { ensureUserExists, getUserProfile, updateUserProfile, deleteUserData, exportUserData } from './account';
export { trackToolUsage, recordToolOutcome } from './toolUsage';
export { getInsightsData } from './insights';
export { getStateAndTools, getDiscriminatingQuestions, getRelatedEmotions } from './recommendation';
export { getOppositeActionContent, saveOppositeActionSession, getOppositeActionSessions, getOppositeActionSession, getOppositeActionFollowUps } from './oppositeAction';
export { getDearManContent, saveDearManSession, getDearManDebriefContent, getDearManReflection, getDearManSessions } from './dearMan';
export { getProblemSolveContent } from './problemSolve';
export { getInvalidationRecoveryContent, saveInvalidationRecoverySession, getInvalidationRecoveryProgress } from './invalidationRecovery';
export { getFindTheFeelingContent, saveFindTheFeelingSession, getFeelingCollection } from './findTheFeeling';
