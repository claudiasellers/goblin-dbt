/**
 * Deployed callables. Every export here is a Cloud Function whose deploy name is its export name:
 * renaming or removing one is a breaking change for the client (src/services/neo4j.ts).
 * Named re-exports only (never `export *`), so a helper can never become a callable by accident.
 * functions/test/unit/exports.test.cjs pins this list against test/fixtures/endpoints.json.
 */
import './shared/admin'; // initialise firebase-admin once, before any callable module loads

export { saveCheckIn, setCheckInNextAction, getCheckInsByUser } from './checkin';
export { ensureUserExists, getUserProfile, updateUserProfile, deleteUserData, exportUserData } from './account';
export { onUserCreated, onUserDeleted } from './account/triggers';
export { applyRetentionDaily } from './userdata/retention';
export { trackToolUsage, recordToolOutcome } from './toolUsage';
export { getInsightsData } from './insights';
export { getStateAndTools, getDiscriminatingQuestions, getRelatedEmotions } from './recommendation';
export { getOppositeActionContent, saveOppositeActionSession, getOppositeActionSessions, getOppositeActionSession, getOppositeActionFollowUps } from './oppositeAction';
export { getDearManContent, saveDearManSession, getDearManDebriefContent, getDearManReflection, getDearManSessions } from './dearMan';
export { getProblemSolveContent } from './problemSolve';
export { getInvalidationRecoveryContent, saveInvalidationRecoverySession, getInvalidationRecoveryProgress } from './invalidationRecovery';
export { getFindTheFeelingContent, saveFindTheFeelingSession, getFeelingCollection } from './findTheFeeling';
export { getCapacityContent } from './capacity';
export { getWiseMindContent } from './wiseMind';
export { getCopeAheadContent } from './copeAhead';
export { getSkillContent } from './skills';
export { getSkillRun } from './skills/run';
export { getBodyMapContent, suggestEmotionsFromBody } from './bodyMap';
export { getWitnessLines, recordWitnessBeat } from './witness';
export {
  startToolSession, closeToolSession, recordToolSession, answerToolOutcome, getSpineContent,
  scheduleFollowUp, resolveFollowUp, snoozeFollowUp, getToday,
} from './spine';
export {
  getProfileContext, getMe, upsertProfileFact, keepProfileItem, editProfileItem, deleteProfileItem,
  confirmProfileItem, setAsideProfileItem, restoreProfileItem,
  answerPatternOffer,
} from './profile';
export { getPartsEntry, startPartSession, savePartSession, keepPart, queuePartCandidate } from './parts';
export { deleteMyParts, countMyPartsLines } from './parts';
export { answerPartCandidate } from './parts';
export { tagPart } from './parts';
export { sayToPart } from './parts';
export { renamePart, restPart, setAsidePart, restorePart, setPartTender, answerPartRevisit } from './parts';
export { schedulePartCheckback, answerPartCheckback } from './parts';
export { setPartAnchor } from './parts';
export { getTrailOfferEvidence, answerTrailOffer, getReflectTrails, answerKnownPartReview, removeTrailPattern } from './parts';
export { startPullsSession, savePullsSession, keepPullsKeepsake, schedulePullsCheckback } from './parts';
export { setPartShape } from './parts';
export { getDen, getDenSnapshot, updatePartLayout, linkParts, unlinkParts } from './parts';
export { getPartStory } from './parts';
export { saveSafetyCheck } from './safety';
