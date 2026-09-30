/**
 * Account: user node, settings-style profile, delete and export.
 * Moved verbatim from the single-file functions/src/index.ts (A1-2); deploy names are the export names.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Record as Neo4jRecord } from 'neo4j-driver';
import { getDriver, neo4jUri, neo4jUser, neo4jPassword, withSession } from '../shared/neo4j';
import { admin, authAdmin } from '../shared/admin';
import { applyRetention, deleteUserGraph, exportUserRecords, plain } from '../userdata/exportDelete';
import { toNumber } from '../shared/values';
import { toSavedOppositeActionSession } from '../oppositeAction';

/**
 * Ensure user exists in Neo4j (called after Firebase Auth signup/login)
 */
export const ensureUserExists = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    // Verify user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const email = request.auth.token.email || '';

    const session = getDriver().session();
    try {
      await session.run(
        `
        MERGE (u:User {id: $userId})
        ON CREATE SET u.email = $email, u.createdAt = datetime()
        `,
        { userId, email }
      );

      return { success: true };
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      throw new HttpsError('internal', 'Failed to create user');
    } finally {
      await session.close();
    }
  }
);

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

/**
 * An IANA time zone this runtime can use. Checked by constructing a formatter, not against
 * Intl.supportedValuesOf: that list holds one canonical name per zone and omits aliases browsers
 * report today (Node 22 lists Asia/Calcutta and Europe/Kiev, Chrome sends Asia/Kolkata and Europe/Kyiv).
 */
export function isTimeZone(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > 64 || !/^[A-Za-z][A-Za-z0-9_+\-/]*$/.test(v)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: v });
    return true;
  } catch {
    return false;
  }
}

const PROFILE_DEFAULTS = {
  displayName: null,
  photoURL: null,
  theme: 'light',
  palette: 'cool-steel',
  checkInReminder: false,
  reminderTime: '09:00',
  reminderDays: [1, 2, 3, 4, 5],
  weeklyDigest: false,
  dataRetentionDays: null,
  shareAnonymousData: false,
  timeZone: null,
};

/**
 * Get user profile -- returns User node properties merged with defaults
 */
export const getUserProfile = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const email = request.auth.token.email || '';

    const session = getDriver().session();
    try {
      const result = await session.run(
        `
        MATCH (u:User {id: $userId})
        RETURN u {.*} AS user
        `,
        { userId }
      );

      const userNode = result.records[0]?.get('user') || {};

      // Merge with defaults, ensuring all fields are present
      const profile = {
        ...PROFILE_DEFAULTS,
        email,
        ...userNode,
        // Clean up Neo4j integer types
        dataRetentionDays: userNode.dataRetentionDays != null ? toNumber(userNode.dataRetentionDays) : null,
        reminderDays: userNode.reminderDays ?? PROFILE_DEFAULTS.reminderDays,
      };

      // Remove internal fields. The settings profile is cached in localStorage for the theme paint:
      // it never carries profile-layer or system fields (PR-P2), nor the retired goal fields
      // (removed from User by schema/migrations/2026-10-remove-goal-fields.cypher).
      for (const k of ['id', 'createdAt', 'updatedAt', 'profileVersion', 'patternsEvaluatedAt',
        'dailyCheckInGoal', 'weeklyToolGoal', 'focusCategories']) {
        delete (profile as Record<string, unknown>)[k];
      }

      // Enforce data retention: delete check-ins older than dataRetentionDays
      const retentionDays = profile.dataRetentionDays != null
        ? toNumber(profile.dataRetentionDays)
        : null;

      if (retentionDays != null && retentionDays > 0) {
        try {
          // D-10: every log record older than the window; profile items never expire.
          await applyRetention(session, userId, retentionDays);
        } catch (cleanupErr) {
          // Don't fail the profile load if cleanup fails
          console.warn('Data retention cleanup failed:', cleanupErr);
        }
      }

      return { profile };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new HttpsError('internal', 'Failed to get profile');
    } finally {
      await session.close();
    }
  }
);

/**
 * Update user profile -- partial update of User node properties
 */
export const updateUserProfile = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const updates = request.data as Record<string, unknown>;

    if (!updates || typeof updates !== 'object') {
      throw new HttpsError('invalid-argument', 'Updates must be an object');
    }

    // Whitelist allowed fields
    const allowedFields = [
      'displayName', 'photoURL', 'theme', 'palette',
      'checkInReminder', 'reminderTime', 'reminderDays', 'weeklyDigest',
      'dataRetentionDays', 'shareAnonymousData', 'timeZone',
    ];

    const cleanUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        cleanUpdates[key] = updates[key];
      }
    }

    // Palette is a closed set; the ids match the data-palette blocks in src/index.css
    const allowedPalettes = ['cool-steel', 'slate-spruce', 'signal', 'giverny', 'clouds'];
    if ('palette' in cleanUpdates && !allowedPalettes.includes(String(cleanUpdates.palette))) {
      throw new HttpsError('invalid-argument', 'Unknown palette');
    }

    // IANA time zone (follow-up windows, quiet hours, later push). Unknown zones are dropped.
    if ('timeZone' in cleanUpdates && !isTimeZone(cleanUpdates.timeZone)) {
      delete cleanUpdates.timeZone;
    }

    if (Object.keys(cleanUpdates).length === 0) {
      return { success: true };
    }

    const session = getDriver().session();
    try {
      // Build SET clause dynamically
      const setClauses = Object.keys(cleanUpdates)
        .map((key) => `u.${key} = $${key}`)
        .join(', ');

      await session.run(
        `
        MERGE (u:User {id: $userId})
        ON CREATE SET u.createdAt = datetime(), u.email = $email
        SET ${setClauses}, u.updatedAt = datetime()${'displayName' in cleanUpdates ? ', u.profileVersion = coalesce(u.profileVersion, 0) + 1' : ''}
        `,
        { userId, email: request.auth.token.email || null, ...cleanUpdates }
      );

      // Sync displayName/photoURL to Firebase Auth so it persists across sessions
      const authUpdate: admin.auth.UpdateRequest = {};
      if ('displayName' in cleanUpdates) {
        authUpdate.displayName = cleanUpdates.displayName as string || undefined;
      }
      if ('photoURL' in cleanUpdates) {
        authUpdate.photoURL = cleanUpdates.photoURL as string || undefined;
      }
      if (Object.keys(authUpdate).length > 0) {
        await admin.auth().updateUser(userId, authUpdate);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new HttpsError('internal', 'Failed to update profile');
    } finally {
      await session.close();
    }
  }
);

/**
 * Delete all user data from Neo4j and, when `deleteAuth` is true (Delete Account), the Firebase
 * Auth user too (F2: the flag used to be ignored, leaving a live login). The graph goes first, so a
 * failed Auth delete can be retried. A user deleted in the Firebase console instead leaves their graph
 * data behind (there is no auth trigger: 1st-gen only, and the functions run on Node 24); run this
 * callable's delete for them, or DETACH DELETE by ownerId.
 */
export const deleteUserData = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const deleteAuth = (request.data as { deleteAuth?: unknown } | null | undefined)?.deleteAuth === true;

    try {
      await withSession((session) => deleteUserGraph(session, userId));
    } catch (error) {
      console.error('Error deleting user data:', (error as { code?: string })?.code ?? 'unknown');
      throw new HttpsError('internal', 'Failed to delete user data');
    }
    if (deleteAuth) {
      try {
        await authAdmin().deleteUser(userId);
      } catch (error) {
        if ((error as { code?: string })?.code !== 'auth/user-not-found') {
          console.error('Error deleting auth user:', (error as { code?: string })?.code ?? 'unknown');
          throw new HttpsError('internal', 'Your data was deleted, but the sign-in could not be removed. Try again.');
        }
      }
    }
    return { success: true, authDeleted: deleteAuth };
  }
);

/**
 * Export all user data as JSON
 */
export const exportUserData = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;

    const session = getDriver().session();
    try {
      // Get user profile
      const profileResult = await session.run(
        `MATCH (u:User {id: $userId}) RETURN u {.*} AS user`,
        { userId }
      );
      const userProfile = profileResult.records[0]?.get('user') || {};

      // Get all check-ins with body sensations
      const checkInsResult = await session.run(
        `
        MATCH (u:User {id: $userId})-[:LOGGED]->(c:CheckIn)
        OPTIONAL MATCH (c)-[:SENSED]->(s:BodySensation)
        WITH c, collect(s {.*}) AS sensations
        ORDER BY c.timestamp DESC
        RETURN c {.*} AS checkIn, sensations
        `,
        { userId }
      );

      const checkIns = checkInsResult.records.map((record: Neo4jRecord) => ({
        ...record.get('checkIn'),
        bodySensations: record.get('sensations'),
      }));

      const oaResult = await session.run(
        `MATCH (u:User {id: $userId})-[:COMPLETED_SESSION]->(s:OppositeActionSession)
         RETURN s.dataJson AS dataJson, toString(s.createdAt) AS createdAt,
                toString(s.updatedAt) AS updatedAt, s.status AS status
         ORDER BY s.updatedAt DESC`, { userId }
      );
      const recoveryResult = await session.run(
        `MATCH (u:User {id: $userId})-[:COMPLETED_SESSION]->(s:InvalidationRecoverySession)
         RETURN s.dataJson AS dataJson, toString(s.createdAt) AS createdAt
         ORDER BY s.createdAt DESC`, { userId }
      );
      const invalidationRecoverySessions = recoveryResult.records.flatMap((r: Neo4jRecord) => {
        try { return [{ ...JSON.parse(r.get('dataJson')), createdAt: r.get('createdAt') }]; }
        catch { return []; }
      });
      const dearManResult = await session.run(
        `MATCH (u:User {id: $userId})-[:COMPLETED_SESSION]->(s:DearManSession)
         RETURN s {.*, createdAt: toString(s.createdAt)} AS s
         ORDER BY s.createdAt DESC`, { userId }
      );
      const dearManSessions = dearManResult.records.map((r: Neo4jRecord) => plain(r.get('s')));
      const toolUsageResult = await session.run(
        `MATCH (u:User {id: $userId})-[:USED_TOOL]->(t:ToolUsage)
         RETURN t {.*, timestamp: toString(t.timestamp)} AS t`, { userId }
      );
      const toolUsage = toolUsageResult.records.map((r: Neo4jRecord) => plain(r.get('t')));
      const findResult = await session.run(
        `MATCH (u:User {id: $userId})-[:COMPLETED_SESSION]->(s:FindTheFeelingSession)
         RETURN s.dataJson AS dataJson, toString(s.createdAt) AS createdAt
         ORDER BY s.createdAt DESC`, { userId }
      );
      const findTheFeelingSessions = findResult.records.flatMap((r: Neo4jRecord) => {
        try { return [{ ...JSON.parse(r.get('dataJson')), createdAt: r.get('createdAt') }]; }
        catch { return []; }
      });
      const wordsResult = await session.run(
        `MATCH (u:User {id: $userId})-[fw:FOUND_WORD]->(e:Emotion)
         RETURN e.id AS emotionId, fw.count AS count, fw.ways AS ways,
                toString(fw.firstAt) AS firstAt, toString(fw.lastAt) AS lastAt`, { userId }
      );
      const feelingCollection = wordsResult.records.map((r: Neo4jRecord) => plain(r.toObject()));
      // Generic part (PR-S1): every :UserData label, grouped by the registry's exportAs, plus links.
      // The legacy keys above stay for format stability.
      const generic = await exportUserRecords(session, userId);
      return {
        data: {
          formatVersion: generic.formatVersion,
          records: generic.records,
          links: generic.links,
          // Export the plain JSON snapshot (not raw Neo4j Integer/DateTime objects).
          oppositeActionSessions: oaResult.records.map(toSavedOppositeActionSession).filter(Boolean),
          invalidationRecoverySessions,
          dearManSessions,
          findTheFeelingSessions,
          feelingCollection,
          toolUsage,
          exportedAt: new Date().toISOString(),
          profile: userProfile,
          checkIns,
          totalCheckIns: checkIns.length,
        },
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw new HttpsError('internal', 'Failed to export data');
    } finally {
      await session.close();
    }
  }
);
