import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import neo4j, { Driver, Record as Neo4jRecord } from 'neo4j-driver';

// Initialize Firebase Admin (for updating Auth profiles)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Define secrets - these are securely stored in Firebase and injected at runtime
const neo4jUri = defineSecret('NEO4J_URI');
const neo4jUser = defineSecret('NEO4J_USER');
const neo4jPassword = defineSecret('NEO4J_PASSWORD');

// Neo4j driver singleton
let driver: Driver | null = null;

function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      neo4jUri.value(),
      neo4j.auth.basic(neo4jUser.value(), neo4jPassword.value())
    );
  }
  return driver;
}

// Types
interface BodySensation {
  x: number;
  y: number;
  region: string;
  intensity: { x: number; y: number };
  tags: string[];
}

interface CheckInData {
  emotion: string;
  quadrant: string;
  intensity: { x: number; y: number };
  bodySensations: BodySensation[];
  note: string;
  timestamp: string; // ISO string from frontend
  activationPatternId?: string;
  confidence?: number;
}

// ============================================
// CLOUD FUNCTIONS
// ============================================

/**
 * Save a new check-in for the authenticated user
 */
export const saveCheckIn = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    // Verify user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const checkIn = request.data as CheckInData;

    // Validate required fields
    if (!checkIn.emotion || !checkIn.quadrant) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    const session = getDriver().session();
    try {
      const result = await session.run(
        `
        CREATE (c:CheckIn {
          id: randomUUID(),
          timestamp: datetime($timestamp),
          emotion: $emotion,
          quadrant: $quadrant,
          intensityX: $intensityX,
          intensityY: $intensityY,
          note: $note,
          activationPatternId: $activationPatternId,
          confidence: $confidence
        })
        WITH c
        MATCH (u:User {id: $userId})
        MERGE (u)-[:LOGGED]->(c)
        WITH c
        FOREACH (_ IN CASE WHEN $activationPatternId IS NOT NULL THEN [1] ELSE [] END |
          MERGE (ap:ActivationPattern {id: $activationPatternId})
          MERGE (c)-[:MATCHED_PATTERN]->(ap)
        )
        WITH c
        UNWIND $bodySensations AS sensation
        CREATE (s:BodySensation {
          x: sensation.x,
          y: sensation.y,
          region: sensation.region,
          intensityX: sensation.intensity.x,
          intensityY: sensation.intensity.y,
          tags: sensation.tags
        })
        MERGE (c)-[:SENSED]->(s)
        RETURN c.id AS id
        `,
        {
          userId,
          timestamp: checkIn.timestamp || new Date().toISOString(),
          emotion: checkIn.emotion,
          quadrant: checkIn.quadrant,
          intensityX: checkIn.intensity?.x ?? 0,
          intensityY: checkIn.intensity?.y ?? 0,
          note: checkIn.note || '',
          bodySensations: checkIn.bodySensations || [],
          activationPatternId: checkIn.activationPatternId || null,
          confidence: checkIn.confidence ?? null,
        }
      );

      const id = result.records[0]?.get('id') || '';
      return { id };
    } catch (error) {
      console.error('Error saving check-in:', error);
      throw new HttpsError('internal', 'Failed to save check-in');
    } finally {
      await session.close();
    }
  }
);

/**
 * Get check-ins for the authenticated user
 */
export const getCheckInsByUser = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    // Verify user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const limit = (request.data?.limit as number) || 50;

    const session = getDriver().session();
    try {
      const result = await session.run(
        `
        MATCH (u:User {id: $userId})-[:LOGGED]->(c:CheckIn)
        OPTIONAL MATCH (c)-[:SENSED]->(s:BodySensation)
        WITH c, collect(s) AS sensations
        ORDER BY c.timestamp DESC
        LIMIT $limit
        RETURN c {
          .id,
          .emotion,
          .quadrant,
          .note,
          .activationPatternId,
          .confidence,
          timestamp: toString(c.timestamp),
          intensity: {x: c.intensityX, y: c.intensityY}
        } AS checkIn,
        [s IN sensations | {
          x: s.x,
          y: s.y,
          region: s.region,
          tags: s.tags,
          intensity: {x: s.intensityX, y: s.intensityY}
        }] AS bodySensations
        `,
        { userId, limit: neo4j.int(limit) }
      );

      const checkIns = result.records.map((record: Neo4jRecord) => {
        const checkIn = record.get('checkIn');
        const bodySensations = record.get('bodySensations');
        return {
          id: checkIn.id,
          userId,
          emotion: checkIn.emotion,
          quadrant: checkIn.quadrant,
          intensity: checkIn.intensity,
          bodySensations: bodySensations || [],
          note: checkIn.note,
          timestamp: checkIn.timestamp,
          activationPatternId: checkIn.activationPatternId || null,
          confidence: checkIn.confidence ?? null,
        };
      });

      return { checkIns };
    } catch (error) {
      console.error('Error fetching check-ins:', error);
      throw new HttpsError('internal', 'Failed to fetch check-ins');
    } finally {
      await session.close();
    }
  }
);

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

/**
 * Initialize Neo4j schema (admin function - run once during setup)
 * In production, you might want to restrict this to admin users
 */
export const initializeSchema = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    // Verify user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const session = getDriver().session();
    try {
      // Create constraints and indexes
      await session.run(`
        CREATE CONSTRAINT user_id IF NOT EXISTS
        FOR (u:User) REQUIRE u.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT checkin_id IF NOT EXISTS
        FOR (c:CheckIn) REQUIRE c.id IS UNIQUE
      `);

      await session.run(`
        CREATE INDEX checkin_timestamp IF NOT EXISTS
        FOR (c:CheckIn) ON (c.timestamp)
      `);

      await session.run(`
        CREATE CONSTRAINT emotion_id IF NOT EXISTS
        FOR (e:Emotion) REQUIRE e.id IS UNIQUE
      `);

      return { success: true, message: 'Schema initialized successfully' };
    } catch (error) {
      console.error('Error initializing schema:', error);
      throw new HttpsError('internal', 'Failed to initialize schema');
    } finally {
      await session.close();
    }
  }
);

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

const PROFILE_DEFAULTS = {
  displayName: null,
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
        dailyCheckInGoal: toNumber(userNode.dailyCheckInGoal) ?? PROFILE_DEFAULTS.dailyCheckInGoal,
        weeklyToolGoal: toNumber(userNode.weeklyToolGoal) ?? PROFILE_DEFAULTS.weeklyToolGoal,
        dataRetentionDays: userNode.dataRetentionDays != null ? toNumber(userNode.dataRetentionDays) : null,
        reminderDays: userNode.reminderDays ?? PROFILE_DEFAULTS.reminderDays,
        focusCategories: userNode.focusCategories ?? PROFILE_DEFAULTS.focusCategories,
      };

      // Remove internal fields
      delete profile.id;
      delete profile.createdAt;

      // Enforce data retention: delete check-ins older than dataRetentionDays
      const retentionDays = profile.dataRetentionDays != null
        ? toNumber(profile.dataRetentionDays)
        : null;

      if (retentionDays != null && retentionDays > 0) {
        try {
          await session.run(
            `
            MATCH (u:User {id: $userId})-[:LOGGED]->(c:CheckIn)
            WHERE c.timestamp < datetime() - duration({days: $days})
            OPTIONAL MATCH (c)-[:SENSED]->(s:BodySensation)
            DETACH DELETE s, c
            `,
            { userId, days: neo4j.int(retentionDays) }
          );
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
      'displayName', 'photoURL', 'theme',
      'checkInReminder', 'reminderTime', 'reminderDays', 'weeklyDigest',
      'dailyCheckInGoal', 'weeklyToolGoal', 'focusCategories',
      'dataRetentionDays', 'shareAnonymousData',
    ];

    const cleanUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        cleanUpdates[key] = updates[key];
      }
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
        MATCH (u:User {id: $userId})
        SET ${setClauses}, u.updatedAt = datetime()
        `,
        { userId, ...cleanUpdates }
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
 * Delete all user data from Neo4j
 */
export const deleteUserData = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;

    const session = getDriver().session();
    try {
      // Delete all check-ins and their body sensations
      await session.run(
        `
        MATCH (u:User {id: $userId})-[:LOGGED]->(c:CheckIn)
        OPTIONAL MATCH (c)-[:SENSED]->(s:BodySensation)
        DETACH DELETE s, c
        `,
        { userId }
      );

      // Delete the user node
      await session.run(
        `
        MATCH (u:User {id: $userId})
        DETACH DELETE u
        `,
        { userId }
      );

      return { success: true };
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw new HttpsError('internal', 'Failed to delete user data');
    } finally {
      await session.close();
    }
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

      return {
        data: {
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

/** Helper to convert Neo4j Integer to JS number */
function toNumber(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null && 'toNumber' in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val) || null;
}

// ============================================
// TOOL USAGE TRACKING
// ============================================

/**
 * Track that a user opened/used a tool
 */
export const trackToolUsage = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const { toolId } = request.data as { toolId: string };

    if (!toolId) {
      throw new HttpsError('invalid-argument', 'toolId is required');
    }

    const session = getDriver().session();
    try {
      await session.run(
        `
        MATCH (u:User {id: $userId})
        CREATE (tu:ToolUsage {
          id: randomUUID(),
          toolId: $toolId,
          timestamp: datetime()
        })
        MERGE (u)-[:USED_TOOL]->(tu)
        WITH u, tu
        OPTIONAL MATCH (u)-[:LOGGED]->(c:CheckIn)
        WHERE c.timestamp <= tu.timestamp
        WITH tu, c ORDER BY c.timestamp DESC LIMIT 1
        FOREACH (_ IN CASE WHEN c IS NOT NULL THEN [1] ELSE [] END |
          MERGE (tu)-[:FOLLOWED_CHECKIN]->(c)
        )
        `,
        { userId, toolId }
      );

      return { success: true };
    } catch (error) {
      console.error('Error tracking tool usage:', error);
      throw new HttpsError('internal', 'Failed to track tool usage');
    } finally {
      await session.close();
    }
  }
);

/**
 * Get the count of tool usages in the last 7 days for the authenticated user
 */
export const getWeeklyToolUsageCount = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;

    const session = getDriver().session();
    try {
      const result = await session.run(
        `
        MATCH (u:User {id: $userId})-[:USED_TOOL]->(tu:ToolUsage)
        WHERE tu.timestamp >= datetime() - duration({days: 7})
        RETURN count(tu) AS count
        `,
        { userId }
      );

      const count = result.records[0]?.get('count');
      return { count: toNumber(count) ?? 0 };
    } catch (error) {
      console.error('Error getting weekly tool usage:', error);
      throw new HttpsError('internal', 'Failed to get tool usage count');
    } finally {
      await session.close();
    }
  }
);

// ============================================
// TOOL OUTCOME RECORDING
// ============================================

/**
 * Record the outcome of a tool usage (did it help?)
 * Finds the user's most recent ToolUsage with null outcome.
 */
export const recordToolOutcome = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const { outcome } = request.data as { outcome: 'helped' | 'somewhat' | 'not_really' };

    if (!outcome || !['helped', 'somewhat', 'not_really'].includes(outcome)) {
      throw new HttpsError('invalid-argument', 'outcome must be helped, somewhat, or not_really');
    }

    const session = getDriver().session();
    try {
      await session.run(
        `
        MATCH (u:User {id: $userId})-[:USED_TOOL]->(tu:ToolUsage)
        WHERE tu.outcome IS NULL
        WITH tu ORDER BY tu.timestamp DESC LIMIT 1
        SET tu.outcome = $outcome, tu.outcomeTimestamp = datetime()
        WITH tu
        WHERE NOT (tu)-[:FOLLOWED_CHECKIN]->()
        OPTIONAL MATCH (u:User {id: $userId})-[:LOGGED]->(c:CheckIn)
        WHERE c.timestamp <= tu.timestamp
        WITH tu, c ORDER BY c.timestamp DESC LIMIT 1
        FOREACH (_ IN CASE WHEN c IS NOT NULL THEN [1] ELSE [] END |
          MERGE (tu)-[:FOLLOWED_CHECKIN]->(c)
        )
        `,
        { userId, outcome }
      );

      return { success: true };
    } catch (error) {
      console.error('Error recording tool outcome:', error);
      throw new HttpsError('internal', 'Failed to record tool outcome');
    } finally {
      await session.close();
    }
  }
);

// ============================================
// INSIGHTS DATA
// ============================================

/**
 * Get all insights data for the Insights page in a single call.
 * Computes formulation, proactive alert, growth evidence, somatic correlation,
 * tool effectiveness, and continuity prompt.
 */
export const getInsightsData = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const driver = getDriver();

    // Neo4j sessions can only run one query at a time, so use separate sessions for parallel queries
    const session1 = driver.session();
    const session2 = driver.session();
    const session3 = driver.session();
    let seqSession: ReturnType<typeof driver.session> | null = null;

    try {
      // Run parallel queries for raw data
      const [checkInsResult, toolUsageResult, continuityResult] = await Promise.all([
        // 1. Recent check-ins (last 30 days)
        session1.run(
          `
          MATCH (u:User {id: $userId})-[:LOGGED]->(c:CheckIn)
          WHERE c.timestamp >= datetime() - duration({days: 30})
          OPTIONAL MATCH (c)-[:SENSED]->(s:BodySensation)
          WITH c, collect(DISTINCT s.region) AS bodyRegions, collect(s.tags) AS tagArrays
          OPTIONAL MATCH (e:Emotion {id: c.emotion})
          WITH c, bodyRegions, tagArrays, e.dbtParent AS dbtParent
          ORDER BY c.timestamp DESC
          RETURN c.id AS id,
                 toString(c.timestamp) AS timestamp,
                 c.emotion AS emotion,
                 c.quadrant AS quadrant,
                 c.intensityX AS intensityX,
                 c.intensityY AS intensityY,
                 c.activationPatternId AS activationPatternId,
                 bodyRegions,
                 tagArrays,
                 dbtParent
          `,
          { userId }
        ),
        // 2. Tool usage with outcomes (last 30 days)
        session2.run(
          `
          MATCH (u:User {id: $userId})-[:USED_TOOL]->(tu:ToolUsage)
          WHERE tu.timestamp >= datetime() - duration({days: 30})
          OPTIONAL MATCH (tu)-[:FOLLOWED_CHECKIN]->(c:CheckIn)
          RETURN tu.toolId AS toolId,
                 tu.outcome AS outcome,
                 toString(tu.timestamp) AS timestamp,
                 c.activationPatternId AS patternId,
                 c.id AS checkInId
          ORDER BY tu.timestamp DESC
          `,
          { userId }
        ),
        // 3. Continuity prompt — most recent ToolUsage with null outcome
        session3.run(
          `
          MATCH (u:User {id: $userId})-[:USED_TOOL]->(tu:ToolUsage)
          WHERE tu.outcome IS NULL
          RETURN tu.toolId AS toolId, toString(tu.timestamp) AS timestamp
          ORDER BY tu.timestamp DESC
          LIMIT 1
          `,
          { userId }
        ),
      ]);

      // Parse check-ins
      const checkIns = checkInsResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        timestamp: r.get('timestamp'),
        emotion: r.get('emotion'),
        quadrant: r.get('quadrant'),
        intensityX: toNumber(r.get('intensityX')) ?? 0,
        intensityY: toNumber(r.get('intensityY')) ?? 0,
        activationPatternId: r.get('activationPatternId') || null,
        bodyRegions: (r.get('bodyRegions') || []).filter(Boolean) as string[],
        sensationTags: ((r.get('tagArrays') || []) as string[][]).flat().filter(Boolean) as string[],
        dbtParent: r.get('dbtParent') || null,
      }));

      // Parse tool usage
      const toolUsages = toolUsageResult.records.map((r: Neo4jRecord) => ({
        toolId: r.get('toolId'),
        outcome: r.get('outcome') || null,
        timestamp: r.get('timestamp'),
        patternId: r.get('patternId') || null,
        checkInId: r.get('checkInId') || null,
      }));

      // Parse continuity
      const continuityRec = continuityResult.records[0];
      const continuityPrompt = continuityRec ? {
        toolId: continuityRec.get('toolId'),
        timestamp: continuityRec.get('timestamp'),
      } : null;

      // Close parallel sessions, open one for sequential follow-up queries
      await Promise.all([session1.close(), session2.close(), session3.close()]);
      const session = driver.session();
      seqSession = session;

      // ── Compute pattern frequencies ──
      const patternCounts: Record<string, number> = {};
      for (const ci of checkIns) {
        if (ci.activationPatternId) {
          patternCounts[ci.activationPatternId] = (patternCounts[ci.activationPatternId] || 0) + 1;
        }
      }
      const patternFrequencies = Object.entries(patternCounts)
        .map(([patternId, count]) => ({ patternId, count }))
        .sort((a, b) => b.count - a.count);

      // ── Compute formulation ──
      // Use full 30-day window. Show formulation if ANY pattern exists (even 1 check-in).
      // Filter out positive_state — it's a fallback for pleasant quadrants, not a clinical
      // pattern in the graph. Leaving it in blocks formulation when it's the dominant count.
      const sortedPatterns = Object.entries(patternCounts)
        .filter(([id]) => id !== 'positive_state')
        .sort((a, b) => b[1] - a[1]);
      const dominantPattern = sortedPatterns[0]; // may be count=1
      const secondaryPattern = sortedPatterns[1];

      let formulation = null;

      // Co-occurrence: both patterns appear 2+ times
      if (dominantPattern && secondaryPattern && dominantPattern[1] >= 2 && secondaryPattern[1] >= 2) {
        const coResult = await session.run(
          `
          MATCH (p1:ActivationPattern {id: $pid1})-[r:CO_OCCURS_WITH]-(p2:ActivationPattern {id: $pid2})
          RETURN r.combined_formulation_headline AS headline,
                 r.combined_formulation_body AS body,
                 r.combined_mechanism_narrative AS mechanism
          LIMIT 1
          `,
          { pid1: dominantPattern[0], pid2: secondaryPattern[0] }
        );

        if (coResult.records.length > 0 && coResult.records[0].get('headline')) {
          const rec = coResult.records[0];
          const effectiveTools = getEffectiveToolsForPattern(toolUsages, dominantPattern[0]);
          formulation = {
            type: 'co_occurrence' as const,
            primaryPatternId: dominantPattern[0],
            secondaryPatternId: secondaryPattern[0],
            headline: rec.get('headline'),
            body: rec.get('body'),
            mechanism: rec.get('mechanism'),
            effectiveTools,
            episodeCount: dominantPattern[1],
          };
        }
      }

      // Single pattern formulation — show for ANY pattern, even count=1
      // Use dominant if 2+, otherwise use most recent check-in's pattern
      if (!formulation && dominantPattern) {
        const patternIdToUse = dominantPattern[1] >= 2
          ? dominantPattern[0]
          : (checkIns.find(ci => ci.activationPatternId)?.activationPatternId || dominantPattern[0]);

        const patResult = await session.run(
          `
          MATCH (p:ActivationPattern {id: $patternId})
          RETURN p.formulation_headline AS headline,
                 p.formulation_body AS body,
                 p.mechanism_narrative AS mechanism
          `,
          { patternId: patternIdToUse }
        );

        if (patResult.records.length > 0 && patResult.records[0].get('headline')) {
          const rec = patResult.records[0];
          const effectiveTools = getEffectiveToolsForPattern(toolUsages, patternIdToUse);
          const count = patternCounts[patternIdToUse] || 1;
          formulation = {
            type: 'single' as const,
            primaryPatternId: patternIdToUse,
            secondaryPatternId: null,
            headline: rec.get('headline'),
            body: rec.get('body'),
            mechanism: rec.get('mechanism'),
            effectiveTools,
            episodeCount: count,
          };
        }
      }

      // ── Compute proactive alert ──
      let proactiveAlert = null;

      if (dominantPattern) {
        // Check for escalation path from the dominant (or most recent) pattern
        const escResult = await session.run(
          `
          MATCH (p1:ActivationPattern {id: $patternId})-[r:CAN_ESCALATE_TO]->(p2:ActivationPattern)
          RETURN r.escalation_narrative AS narrative,
                 r.escalation_suggested_tool AS suggestedTool,
                 p2.id AS targetPatternId
          LIMIT 1
          `,
          { patternId: dominantPattern[0] }
        );

        if (escResult.records.length > 0 && escResult.records[0].get('narrative')) {
          const rec = escResult.records[0];
          // Check intensity trend (are recent check-ins getting more intense?)
          const patternCheckIns = checkIns
            .filter(ci => ci.activationPatternId === dominantPattern[0])
            .slice(0, 4);

          let intensityTrending = false;
          if (patternCheckIns.length >= 2) {
            const recentAvg = patternCheckIns.slice(0, 2).reduce((s, ci) => s + ci.intensityY, 0) / 2;
            const olderAvg = patternCheckIns.slice(-2).reduce((s, ci) => s + ci.intensityY, 0) / 2;
            intensityTrending = recentAvg > olderAvg + 0.05;
          }

          if (intensityTrending || dominantPattern[1] >= 2) {
            proactiveAlert = {
              narrative: rec.get('narrative'),
              suggestedTool: rec.get('suggestedTool'),
              sourcePatternId: dominantPattern[0],
              targetPatternId: rec.get('targetPatternId'),
            };
          }
        }
      }

      // ── Compute growth evidence ──
      // Split check-ins into two halves (older vs newer). Needs 4+ total over 5+ days.
      let growthEvidence = null;

      if (checkIns.length >= 4) {
        const sorted = [...checkIns].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        const firstTs = new Date(sorted[0].timestamp).getTime();
        const lastTs = new Date(sorted[sorted.length - 1].timestamp).getTime();
        const daySpan = (lastTs - firstTs) / (1000 * 60 * 60 * 24);

        if (daySpan >= 5) {
          const mid = Math.floor(sorted.length / 2);
          const olderHalf = sorted.slice(0, mid);
          const newerHalf = sorted.slice(mid);
          const midTimestamp = sorted[mid].timestamp;

          if (olderHalf.length >= 2 && newerHalf.length >= 2) {
            const insights: Array<{ key: string; text: string; data: Record<string, number> }> = [];

            // 1. Emotional vocabulary expanding
            const olderEmotions = new Set(olderHalf.map(ci => ci.emotion));
            const newerEmotions = new Set(newerHalf.map(ci => ci.emotion));
            if (newerEmotions.size > olderEmotions.size && newerEmotions.size >= 3) {
              insights.push({
                key: 'emotion-vocabulary',
                text: 'Naming emotions precisely is itself a regulation skill.',
                data: { current: newerEmotions.size, previous: olderEmotions.size },
              });
            }

            // 2. Emotion family breadth
            const olderFamilies = new Set(olderHalf.map(ci => ci.dbtParent).filter(Boolean));
            const newerFamilies = new Set(newerHalf.map(ci => ci.dbtParent).filter(Boolean));
            if (newerFamilies.size > olderFamilies.size && newerFamilies.size >= 3) {
              insights.push({
                key: 'emotion-family-breadth',
                text: "You're not collapsing everything into one feeling.",
                data: { current: newerFamilies.size, previous: olderFamilies.size },
              });
            }

            // 3. Catching it earlier (intensity drop)
            const recentAvgIntensity = newerHalf.reduce((s, ci) => s + ci.intensityY, 0) / newerHalf.length;
            const priorAvgIntensity = olderHalf.reduce((s, ci) => s + ci.intensityY, 0) / olderHalf.length;
            if (priorAvgIntensity - recentAvgIntensity > 0.08) {
              insights.push({
                key: 'catching-earlier',
                text: "You're catching things before they escalate.",
                data: { current: Math.round(recentAvgIntensity * 100), previous: Math.round(priorAvgIntensity * 100) },
              });
            }

            // 4. Activation pattern diversity
            const olderPatterns = new Set(olderHalf.map(ci => ci.activationPatternId).filter(Boolean));
            const newerPatterns = new Set(newerHalf.map(ci => ci.activationPatternId).filter(Boolean));
            if (olderPatterns.size <= 2 && newerPatterns.size > olderPatterns.size) {
              insights.push({
                key: 'pattern-diversity',
                text: "You're reading your internal signals more accurately.",
                data: { current: newerPatterns.size, previous: olderPatterns.size },
              });
            }

            // 5. Body sensation richness (tag variety)
            const olderTags = new Set(olderHalf.flatMap(ci => ci.sensationTags));
            const newerTags = new Set(newerHalf.flatMap(ci => ci.sensationTags));
            if (newerTags.size > olderTags.size + 2 && newerTags.size >= 3) {
              insights.push({
                key: 'sensation-richness',
                text: "More body detail means earlier warning signals.",
                data: { current: newerTags.size, previous: olderTags.size },
              });
            }

            // 6. Body region awareness
            const olderBodyAvg = olderHalf.reduce((s, ci) => s + ci.bodyRegions.length, 0) / olderHalf.length;
            const recentBodyAvg = newerHalf.reduce((s, ci) => s + ci.bodyRegions.length, 0) / newerHalf.length;
            if (recentBodyAvg > olderBodyAvg + 0.3 && recentBodyAvg > 0.5) {
              insights.push({
                key: 'body-awareness',
                text: "Growing body awareness gives you a head start.",
                data: { current: Math.round(recentBodyAvg * 10) / 10, previous: Math.round(olderBodyAvg * 10) / 10 },
              });
            }

            // 7. Tool follow-through (check-ins that led to tool use)
            const checkInIds = new Set(checkIns.map(ci => ci.id));
            const checkInsWithToolFollow = new Set(
              toolUsages.filter(tu => tu.checkInId && checkInIds.has(tu.checkInId)).map(tu => tu.checkInId)
            );
            const followThroughRate = checkInsWithToolFollow.size / checkIns.length;
            if (followThroughRate >= 0.4 && checkInsWithToolFollow.size >= 3) {
              insights.push({
                key: 'tool-follow-through',
                text: "Notice it, then do something about it — that's the whole loop.",
                data: { numerator: checkInsWithToolFollow.size, denominator: checkIns.length },
              });
            }

            // 8. Tool repertoire broadening
            const olderToolIds = new Set(
              toolUsages.filter(tu => tu.timestamp < midTimestamp).map(tu => tu.toolId)
            );
            const newerToolIds = new Set(
              toolUsages.filter(tu => tu.timestamp >= midTimestamp).map(tu => tu.toolId)
            );
            if (newerToolIds.size > olderToolIds.size && newerToolIds.size >= 3) {
              insights.push({
                key: 'tool-repertoire',
                text: "More options for different situations.",
                data: { current: newerToolIds.size, previous: olderToolIds.size },
              });
            }

            // 9. Positive outcomes increasing
            const olderOutcomes = toolUsages.filter(tu => tu.timestamp < midTimestamp && tu.outcome);
            const newerOutcomes = toolUsages.filter(tu => tu.timestamp >= midTimestamp && tu.outcome);
            if (newerOutcomes.length >= 2) {
              const newerPositiveRate = newerOutcomes.filter(tu => tu.outcome === 'helped').length / newerOutcomes.length;
              const olderPositiveRate = olderOutcomes.length >= 2
                ? olderOutcomes.filter(tu => tu.outcome === 'helped').length / olderOutcomes.length
                : 0;
              if (newerPositiveRate > olderPositiveRate && newerPositiveRate >= 0.5) {
                insights.push({
                  key: 'positive-outcomes',
                  text: "What you're doing is working.",
                  data: { current: Math.round(newerPositiveRate * 100), previous: Math.round(olderPositiveRate * 100) },
                });
              }
            }

            if (insights.length > 0) {
              growthEvidence = { insights };
            }
          }
        }
      }

      // ── Compute somatic correlation ──
      // Threshold: 2+ check-ins with body data. Uses pattern if available, falls back to quadrant.
      let somaticCorrelation = null;

      const checkInsWithBody = checkIns.filter(ci => ci.bodyRegions.length > 0);
      if (checkInsWithBody.length >= 2) {
        const regionKeyMap: Record<string, Record<string, number>> = {};
        for (const ci of checkInsWithBody) {
          // Use pattern if available, otherwise use quadrant as grouping key
          const key = ci.activationPatternId || ci.quadrant;
          for (const region of ci.bodyRegions) {
            if (!regionKeyMap[region]) regionKeyMap[region] = {};
            regionKeyMap[region][key] = (regionKeyMap[region][key] || 0) + 1;
          }
        }

        const correlations: Array<{ region: string; patternId: string; count: number }> = [];
        for (const [region, keys] of Object.entries(regionKeyMap)) {
          const top = Object.entries(keys).sort((a, b) => b[1] - a[1])[0];
          if (top && top[1] >= 2) {
            correlations.push({ region, patternId: top[0], count: top[1] });
          }
        }

        // If strict 2+ threshold finds nothing, show any region that appears 2+ times total
        if (correlations.length === 0 && checkInsWithBody.length >= 3) {
          const regionTotals: Record<string, number> = {};
          for (const ci of checkInsWithBody) {
            for (const region of ci.bodyRegions) {
              regionTotals[region] = (regionTotals[region] || 0) + 1;
            }
          }
          for (const [region, count] of Object.entries(regionTotals)) {
            if (count >= 2) {
              // Find most common quadrant for this region
              const quadrantCounts: Record<string, number> = {};
              for (const ci of checkInsWithBody) {
                if (ci.bodyRegions.includes(region)) {
                  quadrantCounts[ci.quadrant] = (quadrantCounts[ci.quadrant] || 0) + 1;
                }
              }
              const topQ = Object.entries(quadrantCounts).sort((a, b) => b[1] - a[1])[0];
              correlations.push({ region, patternId: topQ[0], count });
            }
          }
        }

        if (correlations.length > 0) {
          somaticCorrelation = {
            correlations: correlations.sort((a, b) => b.count - a.count).slice(0, 3),
          };
        }
      }

      // ── Compute tool effectiveness ──
      let toolEffectiveness = null;

      const usagesWithOutcome = toolUsages.filter(tu => tu.outcome);
      if (usagesWithOutcome.length >= 1) {
        const toolOutcomes: Record<string, { helped: number; somewhat: number; not_really: number; total: number }> = {};
        for (const tu of usagesWithOutcome) {
          if (!toolOutcomes[tu.toolId]) {
            toolOutcomes[tu.toolId] = { helped: 0, somewhat: 0, not_really: 0, total: 0 };
          }
          toolOutcomes[tu.toolId][tu.outcome as 'helped' | 'somewhat' | 'not_really']++;
          toolOutcomes[tu.toolId].total++;
        }

        const tools = Object.entries(toolOutcomes)
          .filter(([, data]) => data.total >= 1)
          .map(([toolId, data]) => ({
            toolId,
            helpedPct: Math.round(((data.helped + data.somewhat * 0.5) / data.total) * 100),
            totalUses: data.total,
          }))
          .sort((a, b) => b.helpedPct - a.helpedPct)
          .slice(0, 4);

        if (tools.length > 0) {
          toolEffectiveness = { tools };
        }
      }

      return {
        formulation,
        proactiveAlert,
        growthEvidence,
        somaticCorrelation,
        toolEffectiveness,
        continuityPrompt,
        patternFrequencies,
        totalCheckIns: checkIns.length,
      };
    } catch (error) {
      console.error('Error getting insights data:', error);
      throw new HttpsError('internal', 'Failed to get insights data');
    } finally {
      await Promise.all([
        session1.close().catch(() => {}),
        session2.close().catch(() => {}),
        session3.close().catch(() => {}),
        seqSession?.close().catch(() => {}),
      ]);
    }
  }
);

/** Helper: find tools that helped for a given pattern */
function getEffectiveToolsForPattern(
  toolUsages: Array<{ toolId: string; outcome: string | null; patternId: string | null }>,
  patternId: string
): string[] {
  const toolScores: Record<string, number> = {};
  for (const tu of toolUsages) {
    if (tu.patternId === patternId && tu.outcome) {
      const score = tu.outcome === 'helped' ? 1 : tu.outcome === 'somewhat' ? 0.5 : 0;
      toolScores[tu.toolId] = (toolScores[tu.toolId] || 0) + score;
    }
  }
  return Object.entries(toolScores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([toolId]) => toolId);
}

// ============================================
// KNOWLEDGE GRAPH QUERY FUNCTIONS
// These power the neural state matching and tool recommendations
// ============================================

interface CheckInInput {
  quadrant: string;
  emotions?: string[];
  intensity?: { x: number; y: number };
  bodySensations?: Array<{ region: string; tags?: string[] }>;
  discriminatingAnswers?: Array<{ questionId: string; responseId: string }>;
}

interface ActivationPatternResult {
  id: string;
  userFacingLabel: string;
  description: string;
  evidenceGrade: string;
  safetyConstraints: string[];
  clinicalNotes: string;
  confidence: number;
}

interface ToolRecommendation {
  id: string;
  name: string;
  description: string;
  whenToUse: string;
  dbtBasis?: string;
  relevance: string;
}

interface CoOccurrence {
  clinicalLabel: string;
  combinedUserFacingLabel: string;
  primaryPatternId: string;
  frequency: string;
  sequencingNote: string;
}

interface GuidedActivityRecommendation {
  activityId: string;
  patternId: string;
}

interface StateResult {
  pattern: ActivationPatternResult;
  tools: ToolRecommendation[];
  safetyFlag?: {
    id: string;
    type: string;
    trigger: string;
    action: string;
  };
  secondaryPattern?: ActivationPatternResult;
  coOccurrence?: CoOccurrence;
  guidedActivity?: GuidedActivityRecommendation;
}

/**
 * Get the activation pattern and recommended tools based on check-in data
 * This is the main "What's happening right now" query
 */
export const getStateAndTools = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request): Promise<StateResult> => {
    const input = request.data as CheckInInput;

    if (!input.quadrant) {
      throw new HttpsError('invalid-argument', 'Quadrant is required');
    }

    const session = getDriver().session();
    try {
      // Map quadrant to likely patterns with base scores
      const quadrantPatternMap: Record<string, string[]> = {
        'high-unpleasant': ['acute_alarm', 'chronic_vigilance', 'emotional_flooding', 'social_threat_shame'],
        'low-unpleasant': ['conservation_freeze', 'dissociation_overmodulation', 'rumination_loop', 'reward_drive_low'],
        'high-pleasant': [],
        'low-pleasant': [],
      };

      const candidatePatterns = quadrantPatternMap[input.quadrant] || [];

      // Positive quadrant — no intervention needed
      if (candidatePatterns.length === 0) {
        return {
          pattern: {
            id: 'positive_state',
            userFacingLabel: "You're in a good place right now",
            description: "Your system is balanced and regulated",
            evidenceGrade: 'N/A',
            safetyConstraints: [],
            clinicalNotes: '',
            confidence: 1.0,
          },
          tools: [],
        };
      }

      // ============================================
      // PHASE 1: Build per-pattern confidence scores
      // Start from emotion-based evidence, then layer
      // discriminating question evidence on top.
      // ============================================

      // Initialize scores for all candidate patterns
      const patternScores: Record<string, number> = {};
      for (const pid of candidatePatterns) {
        patternScores[pid] = 0.25; // base score
      }

      // --- Emotion-based scoring ---
      if (input.emotions && input.emotions.length > 0) {
        const emotionIds = input.emotions.map(e =>
          e.toLowerCase().replace(/\s+/g, '_')
        );

        const emotionQuery = `
          MATCH (p:ActivationPattern)-[r:ASSOCIATED_WITH]->(e:Emotion)
          WHERE p.id IN $candidatePatterns
            AND e.id IN $emotionIds
          WITH p.id as patternId, count(r) as matches, collect(r.strength) as strengths
          RETURN patternId, matches,
                 CASE
                   WHEN 'strong' IN strengths THEN 0.3
                   WHEN 'moderate' IN strengths THEN 0.2
                   ELSE 0.1
                 END as strengthBonus
        `;
        const emotionResult = await session.run(emotionQuery, {
          candidatePatterns,
          emotionIds,
        });

        for (const rec of emotionResult.records) {
          const pid = rec.get('patternId') as string;
          const matches = (rec.get('matches') as { toNumber?: () => number });
          const matchCount = typeof matches === 'object' && matches.toNumber ? matches.toNumber() : Number(matches);
          const bonus = (rec.get('strengthBonus') as { toNumber?: () => number });
          const strengthBonus = typeof bonus === 'object' && bonus.toNumber ? bonus.toNumber() : Number(bonus);
          patternScores[pid] = (patternScores[pid] || 0) +
            (matchCount / emotionIds.length) * 0.4 + strengthBonus;
        }
      } else {
        // No emotions — use intensity heuristic
        const intensityY = input.intensity?.y ?? 0.5;
        for (const pid of candidatePatterns) {
          if (intensityY > 0.7 && ['acute_alarm', 'emotional_flooding'].includes(pid)) {
            patternScores[pid] += 0.3;
          } else if (intensityY > 0.7 && ['chronic_vigilance', 'social_threat_shame'].includes(pid)) {
            patternScores[pid] += 0.15;
          } else if (intensityY < 0.3 && ['conservation_freeze', 'reward_drive_low'].includes(pid)) {
            patternScores[pid] += 0.3;
          } else if (intensityY < 0.3 && ['dissociation_overmodulation', 'rumination_loop'].includes(pid)) {
            patternScores[pid] += 0.15;
          }
        }
      }

      // --- Discriminating question evidence (weighted ~2x emotion evidence) ---
      if (input.discriminatingAnswers && input.discriminatingAnswers.length > 0) {
        const responseIds = input.discriminatingAnswers.map(a => a.responseId);
        const evidenceQuery = `
          MATCH (r:QuestionResponse)-[e:EVIDENCE_FOR]->(p:ActivationPattern)
          WHERE r.id IN $responseIds
            AND p.id IN $candidatePatterns
          RETURN p.id as patternId, sum(e.weight) as totalWeight
        `;
        const evidenceResult = await session.run(evidenceQuery, {
          responseIds,
          candidatePatterns,
        });

        for (const rec of evidenceResult.records) {
          const pid = rec.get('patternId') as string;
          const weight = (rec.get('totalWeight') as { toNumber?: () => number });
          const totalWeight = typeof weight === 'object' && weight.toNumber ? weight.toNumber() : Number(weight);
          // Weight discriminating evidence at ~2x
          patternScores[pid] = (patternScores[pid] || 0) + totalWeight * 2.0;
        }
      }

      // ============================================
      // PHASE 2: Select primary (and secondary) pattern
      // ============================================

      console.log('Pattern scores after all evidence:', JSON.stringify(patternScores));
      if (input.discriminatingAnswers) {
        console.log('Discriminating answers received:', JSON.stringify(input.discriminatingAnswers));
      }

      const sortedPatterns = Object.entries(patternScores)
        .sort(([, a], [, b]) => b - a);

      const primaryId = sortedPatterns[0][0];
      const primaryScore = sortedPatterns[0][1];
      const secondaryId = sortedPatterns.length > 1 ? sortedPatterns[1][0] : null;
      const secondaryScore = sortedPatterns.length > 1 ? sortedPatterns[1][1] : 0;

      // Fetch primary pattern details
      const patternDetailQuery = `
        MATCH (p:ActivationPattern {id: $patternId})
        RETURN p.id as id,
               p.userFacingLabel as userFacingLabel,
               p.description as description,
               p.evidenceGrade as evidenceGrade,
               p.safetyConstraints as safetyConstraints,
               p.clinicalNotes as clinicalNotes
      `;
      const primaryResult = await session.run(patternDetailQuery, { patternId: primaryId });

      if (primaryResult.records.length === 0) {
        throw new HttpsError('not-found', `No matching pattern found for quadrant: ${input.quadrant}`);
      }

      const pRec = primaryResult.records[0];
      let pattern: ActivationPatternResult = {
        id: pRec.get('id'),
        userFacingLabel: pRec.get('userFacingLabel'),
        description: pRec.get('description'),
        evidenceGrade: pRec.get('evidenceGrade'),
        safetyConstraints: pRec.get('safetyConstraints') || [],
        clinicalNotes: pRec.get('clinicalNotes') || '',
        confidence: Math.min(primaryScore, 1.0),
      };

      // ============================================
      // PHASE 3: Co-occurrence detection
      // ============================================

      let secondaryPattern: ActivationPatternResult | undefined;
      let coOccurrence: CoOccurrence | undefined;

      if (secondaryId && secondaryScore > 0.35) {
        // Check for CO_OCCURS_WITH relationship (bidirectional check)
        const coQuery = `
          MATCH (p1:ActivationPattern {id: $pid1})-[r:CO_OCCURS_WITH]-(p2:ActivationPattern {id: $pid2})
          RETURN r.clinicalLabel as clinicalLabel,
                 r.combinedUserFacingLabel as combinedUserFacingLabel,
                 r.primaryPatternId as primaryPatternId,
                 r.frequency as frequency,
                 r.sequencingNote as sequencingNote
          LIMIT 1
        `;
        const coResult = await session.run(coQuery, { pid1: primaryId, pid2: secondaryId });

        if (coResult.records.length > 0) {
          const coRec = coResult.records[0];
          const graphPrimaryId = coRec.get('primaryPatternId') as string;

          coOccurrence = {
            clinicalLabel: coRec.get('clinicalLabel'),
            combinedUserFacingLabel: coRec.get('combinedUserFacingLabel'),
            primaryPatternId: graphPrimaryId,
            frequency: coRec.get('frequency'),
            sequencingNote: coRec.get('sequencingNote'),
          };

          // Fetch secondary pattern details
          const secResult = await session.run(patternDetailQuery, { patternId: secondaryId });
          if (secResult.records.length > 0) {
            const sRec = secResult.records[0];
            secondaryPattern = {
              id: sRec.get('id'),
              userFacingLabel: sRec.get('userFacingLabel'),
              description: sRec.get('description'),
              evidenceGrade: sRec.get('evidenceGrade'),
              safetyConstraints: sRec.get('safetyConstraints') || [],
              clinicalNotes: sRec.get('clinicalNotes') || '',
              confidence: Math.min(secondaryScore, 1.0),
            };
          }

          // Swap primary/secondary if the graph says to AND the scores are close
          // enough to indicate genuine co-occurrence (not one pattern dominating).
          // Only swap when the secondary scored at least 60% of the primary.
          const scoreRatio = secondaryScore / primaryScore;
          if (graphPrimaryId !== primaryId && secondaryPattern && scoreRatio >= 0.6) {
            const temp = pattern;
            pattern = { ...secondaryPattern, confidence: Math.min(primaryScore, 1.0) };
            secondaryPattern = { ...temp, confidence: Math.min(secondaryScore, 1.0) };
          }
        }
      }

      // ============================================
      // PHASE 4: Get recommended tools
      // ============================================

      const toolsQuery = `
        MATCH (p:ActivationPattern {id: $patternId})-[:ASSOCIATED_WITH]->(e:Emotion)
        MATCH (tc:TherapyConcept)-[r:ADDRESSES|REDUCES|TARGETS]->(e)
        WHERE tc.id STARTS WITH 'dbt_'
        WITH tc, count(DISTINCT e) as relevanceScore
        ORDER BY relevanceScore DESC
        LIMIT 2
        RETURN tc.id as id,
               tc.name as name,
               tc.description as description,
               tc.whenToUse as whenToUse,
               tc.dbtBasis as dbtBasis,
               CASE
                 WHEN relevanceScore > 2 THEN 'high'
                 WHEN relevanceScore > 1 THEN 'medium'
                 ELSE 'relevant'
               END as relevance
      `;

      const toolsResult = await session.run(toolsQuery, { patternId: pattern.id });

      const tools: ToolRecommendation[] = toolsResult.records.map((rec: Neo4jRecord) => ({
        id: rec.get('id'),
        name: rec.get('name') || rec.get('id').replace('dbt_', '').replace(/_/g, ' '),
        description: rec.get('description') || '',
        whenToUse: rec.get('whenToUse') || '',
        dbtBasis: rec.get('dbtBasis'),
        relevance: rec.get('relevance'),
      }));

      // ============================================
      // PHASE 5: Safety flags (skip for low-unpleasant — these patterns
      // should never route to crisis resources)
      // ============================================

      let safetyFlag: { id: string; type: string; trigger: string; action: string } | undefined;

      if (input.quadrant !== 'low-unpleasant') {
        const safetyQuery = `
          MATCH (p:ActivationPattern {id: $patternId})-[:TRIGGERS_SAFETY]->(sf:SafetyFlag)
          RETURN sf.id as id, sf.type as type, sf.trigger as trigger, sf.action as action
          LIMIT 1
        `;

        const safetyResult = await session.run(safetyQuery, { patternId: pattern.id });

        safetyFlag = safetyResult.records.length > 0 ? {
          id: safetyResult.records[0].get('id'),
          type: safetyResult.records[0].get('type'),
          trigger: safetyResult.records[0].get('trigger'),
          action: safetyResult.records[0].get('action'),
        } : undefined;
      }

      // ============================================
      // PHASE 6: Guided activity mapping (low-unpleasant only)
      // Safety flag overrides — omit guided activity if present
      // ============================================

      let guidedActivity: GuidedActivityRecommendation | undefined;

      if (input.quadrant === 'low-unpleasant') {
        const activityMap: Record<string, string> = {
          conservation_freeze: 'gentle-movement',
          dissociation_overmodulation: 'sensory-anchor',
          rumination_loop: 'attention-shift',
          reward_drive_low: 'micro-win',
        };
        const activityId = activityMap[pattern.id];
        if (activityId) {
          guidedActivity = { activityId, patternId: pattern.id };
        }
      }

      console.log('Returning result:', {
        patternId: pattern.id,
        confidence: pattern.confidence,
        hasGuidedActivity: !!guidedActivity,
        guidedActivity,
        hasCoOccurrence: !!coOccurrence,
        hasSafetyFlag: !!safetyFlag,
      });

      return { pattern, tools, safetyFlag, secondaryPattern, coOccurrence, guidedActivity };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.error('Error getting state and tools:', {
        message: errorMessage,
        stack: errorStack,
        quadrant: input.quadrant,
        emotions: input.emotions,
      });

      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to analyze emotional state: ${errorMessage}`);
    } finally {
      await session.close();
    }
  }
);

/**
 * Get discriminating questions for a quadrant.
 * Returns questions with their responses and conditional flow (TRIGGERS_NEXT).
 */
export const getDiscriminatingQuestions = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request): Promise<{ questions: Array<{
    id: string;
    text: string;
    subtext: string;
    order: number;
    required: boolean;
    responses: Array<{
      id: string;
      label: string;
      subtext: string;
      order: number;
      isEscapeHatch: boolean;
      triggersNextQuestionId?: string;
    }>;
  }> }> => {
    const { quadrant } = request.data as { quadrant: string };

    if (!quadrant) {
      throw new HttpsError('invalid-argument', 'Quadrant is required');
    }

    const session = getDriver().session();
    try {
      const query = `
        MATCH (q:DiscriminatingQuestion)-[hr:HAS_RESPONSE]->(r:QuestionResponse)
        WHERE $quadrant IN q.applicableQuadrants
        OPTIONAL MATCH (r)-[:TRIGGERS_NEXT]->(nextQ:DiscriminatingQuestion)
        RETURN q.id as questionId,
               q.text as questionText,
               q.subtext as questionSubtext,
               q.order as questionOrder,
               q.required as questionRequired,
               r.id as responseId,
               r.label as responseLabel,
               r.subtext as responseSubtext,
               r.order as responseOrder,
               r.isEscapeHatch as isEscapeHatch,
               nextQ.id as triggersNextQuestionId
        ORDER BY q.order, r.order
      `;

      const result = await session.run(query, { quadrant });

      // Group by question
      const questionsMap = new Map<string, {
        id: string;
        text: string;
        subtext: string;
        order: number;
        required: boolean;
        responses: Array<{
          id: string;
          label: string;
          subtext: string;
          order: number;
          isEscapeHatch: boolean;
          triggersNextQuestionId?: string;
        }>;
      }>();

      for (const rec of result.records) {
        const qId = rec.get('questionId') as string;
        if (!questionsMap.has(qId)) {
          questionsMap.set(qId, {
            id: qId,
            text: rec.get('questionText'),
            subtext: rec.get('questionSubtext'),
            order: typeof rec.get('questionOrder') === 'object'
              ? (rec.get('questionOrder') as { toNumber: () => number }).toNumber()
              : Number(rec.get('questionOrder')),
            required: rec.get('questionRequired') as boolean,
            responses: [],
          });
        }

        const nextQId = rec.get('triggersNextQuestionId') as string | null;
        questionsMap.get(qId)!.responses.push({
          id: rec.get('responseId'),
          label: rec.get('responseLabel'),
          subtext: rec.get('responseSubtext'),
          order: typeof rec.get('responseOrder') === 'object'
            ? (rec.get('responseOrder') as { toNumber: () => number }).toNumber()
            : Number(rec.get('responseOrder')),
          isEscapeHatch: rec.get('isEscapeHatch') as boolean,
          ...(nextQId ? { triggersNextQuestionId: nextQId } : {}),
        });
      }

      const questions = Array.from(questionsMap.values())
        .sort((a, b) => a.order - b.order);

      return { questions };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error getting discriminating questions:', errorMessage);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', `Failed to get discriminating questions: ${errorMessage}`);
    } finally {
      await session.close();
    }
  }
);

/**
 * Get related emotions based on shared neural substrates
 * Powers the "You might also be feeling..." feature
 */
export const getRelatedEmotions = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request): Promise<{ relatedEmotions: Array<{ id: string; name: string; reason: string }> }> => {
    const { emotionId, quadrant } = request.data as { emotionId: string; quadrant?: string };

    if (!emotionId) {
      throw new HttpsError('invalid-argument', 'Emotion ID is required');
    }

    const session = getDriver().session();
    try {
      const query = `
        MATCH (e1:Emotion {id: $emotionId})

        // 1) Explicit opposite relationships
        OPTIONAL MATCH (e1)-[:OPPOSITE_OF]-(opp:Emotion)
        WHERE opp.id <> e1.id
          ${quadrant ? 'AND opp.quadrant = $quadrant' : ''}
        WITH e1, collect(DISTINCT {
          id: opp.id,
          name: opp.name,
          reason: 'opposite emotion',
          score: 5
        }) AS oppositeRows

        // 2) Explicit related relationships (same wheel branch, etc.)
        OPTIONAL MATCH (e1)-[:RELATED_TO]-(rel:Emotion)
        WHERE rel.id <> e1.id
          ${quadrant ? 'AND rel.quadrant = $quadrant' : ''}
        WITH e1, oppositeRows, collect(DISTINCT {
          id: rel.id,
          name: rel.name,
          reason: 'related feeling',
          score: 4
        }) AS relatedRows

        // 3) Neural-substrate overlap fallback
        CALL {
          WITH e1
          OPTIONAL MATCH (bs:BrainStructure)-[:ACTIVATES_DURING]->(e1)
          OPTIONAL MATCH (bs)-[:ACTIVATES_DURING]->(e2:Emotion)
          WHERE e2.id <> e1.id
            ${quadrant ? 'AND e2.quadrant = $quadrant' : ''}
          WITH e1, e2, count(DISTINCT bs) AS sharedCount
          WHERE e2 IS NOT NULL AND sharedCount >= 1
          OPTIONAL MATCH (p:ActivationPattern)-[:ASSOCIATED_WITH]->(e1)
          OPTIONAL MATCH (p)-[:ASSOCIATED_WITH]->(e2)
          WITH e2, sharedCount, count(DISTINCT p) AS patternOverlap
          RETURN collect(DISTINCT {
            id: e2.id,
            name: e2.name,
            reason: CASE
              WHEN patternOverlap > 0 AND sharedCount > 1 THEN 'often occurs together'
              WHEN sharedCount > 1 THEN 'similar body response'
              ELSE 'related feeling'
            END,
            score: CASE
              WHEN patternOverlap > 0 AND sharedCount > 1 THEN 3
              WHEN sharedCount > 1 THEN 2
              ELSE 1
            END
          }) AS neuralRows
        }

        WITH oppositeRows + relatedRows + coalesce(neuralRows, []) AS allRows
        UNWIND allRows AS row
        WITH row
        WHERE row.id IS NOT NULL
        WITH row.id AS id, row.name AS name, row.reason AS reason, max(row.score) AS score
        ORDER BY score DESC, name ASC
        RETURN id, name, reason
        LIMIT 6
      `;

      const result = await session.run(query, { emotionId, quadrant });

      const relatedEmotions = result.records.map((rec: Neo4jRecord) => ({
        id: rec.get('id'),
        name: rec.get('name') || rec.get('id').replace(/_/g, ' '),
        reason: rec.get('reason'),
      }));

      return { relatedEmotions };
    } catch (error) {
      console.error('Error getting related emotions:', error);
      throw new HttpsError('internal', 'Failed to find related emotions');
    } finally {
      await session.close();
    }
  }
);

// ============================================
// OPPOSITE ACTION CONTENT
// Queries the graph for everything the Opposite Action tool needs.
// ============================================

interface OppositeActionEmotionResult {
  emotionId: string;
  applicable: boolean;
  dbtParent: string | null;
  clinicalNote: string;
  alternativeSkill: string | null;
}

interface ActionUrgeResult {
  id: string;
  label: string;
  small: string;
  medium: string;
  bigger: string;
}

interface ParentProtocol {
  label: string;
  fitsTheFactsWhen: string[];
  fitsFactsGuidance: string;
  whyItWorks: string;
  acknowledgment: string;
  bodyOpposite: string;
  defaultOpposites: { small: string; medium: string; bigger: string };
  urges: ActionUrgeResult[];
}

interface OppositeActionContentResult {
  emotions: OppositeActionEmotionResult[];
  parents: Record<string, ParentProtocol>;
}

/**
 * Get opposite action content for a set of emotions.
 * Returns per-emotion OA applicability + per-parent protocol data.
 * No auth required — this is public emotion knowledge.
 */
export const getOppositeActionContent = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request): Promise<OppositeActionContentResult> => {
    const { emotionIds } = request.data as { emotionIds: string[] };

    if (!emotionIds || !Array.isArray(emotionIds) || emotionIds.length === 0) {
      throw new HttpsError('invalid-argument', 'emotionIds array is required');
    }

    const session = getDriver().session();
    try {
      const result = await session.run(
        `
        MATCH (e:Emotion) WHERE e.id IN $emotionIds
        OPTIONAL MATCH (e)-[:HAS_REGULATION_CONTENT]->(c:EmotionRegulationContent)
        OPTIONAL MATCH (c)-[:HAS_ACTION_URGE]->(u:ActionUrge)
        RETURN e.id AS emotionId,
               coalesce(e.oppositeActionApplicable, false) AS applicable,
               e.oaClinicalNote AS clinicalNote,
               e.oaAlternativeSkill AS alternativeSkill,
               c.dbtParent AS dbtParent,
               c.label AS parentLabel,
               c.fitsTheFactsWhen AS fitsTheFactsWhen,
               c.fitsFactsGuidance AS fitsFactsGuidance,
               c.whyItWorks AS whyItWorks,
               c.acknowledgment AS acknowledgment,
               c.bodyOpposite AS bodyOpposite,
               c.defaultOppositeSmall AS defaultOppositeSmall,
               c.defaultOppositeMedium AS defaultOppositeMedium,
               c.defaultOppositeBigger AS defaultOppositeBigger,
               collect(DISTINCT u { .id, .label, .small, .medium, .bigger }) AS urges
        `,
        { emotionIds }
      );

      const emotions: OppositeActionEmotionResult[] = [];
      const parents: Record<string, ParentProtocol> = {};

      for (const record of result.records) {
        const emotionId = record.get('emotionId');
        const applicable = record.get('applicable');
        const dbtParent = record.get('dbtParent');

        emotions.push({
          emotionId,
          applicable,
          dbtParent: dbtParent || null,
          clinicalNote: record.get('clinicalNote') || '',
          alternativeSkill: record.get('alternativeSkill') || null,
        });

        // Build parent protocol data (deduplicated by dbtParent key)
        if (applicable && dbtParent && !parents[dbtParent]) {
          const urgesRaw = record.get('urges') || [];
          // Filter out empty urge objects (from OPTIONAL MATCH with no ActionUrge)
          const urges: ActionUrgeResult[] = urgesRaw
            .filter((u: Record<string, unknown>) => u.id != null)
            .map((u: Record<string, unknown>) => ({
              id: u.id as string,
              label: u.label as string,
              small: u.small as string,
              medium: u.medium as string,
              bigger: u.bigger as string,
            }));

          parents[dbtParent] = {
            label: record.get('parentLabel') || dbtParent,
            fitsTheFactsWhen: record.get('fitsTheFactsWhen') || [],
            fitsFactsGuidance: record.get('fitsFactsGuidance') || '',
            whyItWorks: record.get('whyItWorks') || '',
            acknowledgment: record.get('acknowledgment') || '',
            bodyOpposite: record.get('bodyOpposite') || '',
            defaultOpposites: {
              small: record.get('defaultOppositeSmall') || '',
              medium: record.get('defaultOppositeMedium') || '',
              bigger: record.get('defaultOppositeBigger') || '',
            },
            urges,
          };
        }
      }

      return { emotions, parents };
    } catch (error) {
      console.error('Error getting opposite action content:', error);
      throw new HttpsError('internal', 'Failed to get opposite action content');
    } finally {
      await session.close();
    }
  }
);

// ============================================
// DEAR MAN CONTENT + SESSION
// ============================================

/**
 * Get all DEAR MAN content from the graph in one call.
 * No auth required — this is public therapeutic content (same as OA).
 */
export const getDearManContent = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async () => {
    const session = getDriver().session();
    try {
      // 1. Situation types
      const sitResult = await session.run(`
        MATCH (s:DearManSituationType)
        RETURN s.id AS id, s.label AS label, s.sublabel AS sublabel,
               s.emoji AS emoji, s.sortOrder AS sortOrder
        ORDER BY s.sortOrder
      `);

      // 2. Describe options with situation type
      const descResult = await session.run(`
        MATCH (d:DearManDescribeOption)-[:FOR_SITUATION]->(s:DearManSituationType)
        RETURN d.id AS id, d.label AS label, d.sortOrder AS sortOrder,
               s.id AS situationId
        ORDER BY d.sortOrder
      `);

      // 3. Assert options with situation type
      const assertResult = await session.run(`
        MATCH (a:DearManAssertOption)-[:FOR_SITUATION]->(s:DearManSituationType)
        RETURN a.id AS id, a.label AS label, a.hasPlaceholder AS hasPlaceholder,
               a.sortOrder AS sortOrder, s.id AS situationId
        ORDER BY a.sortOrder
      `);

      // 4. Reinforce options
      const reinfResult = await session.run(`
        MATCH (r:DearManReinforceOption)
        RETURN r.id AS id, r.label AS label, r.sortOrder AS sortOrder
        ORDER BY r.sortOrder
      `);

      // 5. Barriers + coaching
      const barrierResult = await session.run(`
        MATCH (b:DearManBarrier)
        OPTIONAL MATCH (c:DearManBarrierCoaching)-[:ADDRESSES]->(b)
        RETURN b.id AS barrierId, b.label AS barrierLabel,
               c.id AS coachingId, c.title AS coachingTitle, c.body AS coachingBody
      `);

      // 6. Default coaching
      const defaultCoachResult = await session.run(`
        MATCH (c:DearManBarrierCoaching {isDefault: true})
        RETURN c.title AS title, c.body AS body
      `);

      // 7. Anchor phrases
      const anchorResult = await session.run(`
        MATCH (a:DearManAnchorPhrase)
        RETURN a.id AS id, a.label AS label
        ORDER BY a.sortOrder
      `);

      // 8. Negotiate options
      const negResult = await session.run(`
        MATCH (n:DearManNegotiateOption)
        RETURN n.id AS id, n.label AS label, n.type AS type
        ORDER BY n.sortOrder
      `);

      // 9. Feeling chips
      const feelResult = await session.run(`
        MATCH (f:DearManFeelingChip)
        RETURN f.id AS id, f.label AS label
        ORDER BY f.sortOrder
      `);

      // 10. Step insights
      const insightResult = await session.run(`
        MATCH (i:DearManStepInsight)
        RETURN i.step AS step, i.text AS text
      `);

      // 11. Debrief options
      const debriefResult = await session.run(`
        MATCH (d:DearManDebriefOption)
        RETURN d.id AS id, d.label AS label, d.type AS type
        ORDER BY d.sortOrder
      `);

      // 12. Reveal text + coaching from TherapyConcept
      const tcResult = await session.run(`
        MATCH (tc:TherapyConcept {id: 'dbt_dear_man'})
        RETURN tc.revealText AS revealText,
               tc.confidentCoaching AS confidentCoaching,
               tc.confidentBarrierNoRight AS confidentBarrierNoRight,
               tc.assertBarrierGuilty AS assertBarrierGuilty,
               tc.negotiateHintObjective AS hintObjective,
               tc.negotiateHintRelationship AS hintRelationship,
               tc.negotiateHintSelfRespect AS hintSelfRespect
      `);

      // --- Shape the response ---

      const situationTypes = sitResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        sublabel: r.get('sublabel'),
        emoji: r.get('emoji'),
        sortOrder: toNumber(r.get('sortOrder')) ?? 0,
      }));

      const describeOptions: Record<string, Array<{ id: string; label: string; sortOrder: number }>> = {};
      for (const r of descResult.records) {
        const sitId = r.get('situationId');
        if (!describeOptions[sitId]) describeOptions[sitId] = [];
        describeOptions[sitId].push({
          id: r.get('id'),
          label: r.get('label'),
          sortOrder: toNumber(r.get('sortOrder')) ?? 0,
        });
      }

      const assertOptions: Record<string, Array<{ id: string; label: string; hasPlaceholder: boolean; sortOrder: number }>> = {};
      for (const r of assertResult.records) {
        const sitId = r.get('situationId');
        if (!assertOptions[sitId]) assertOptions[sitId] = [];
        assertOptions[sitId].push({
          id: r.get('id'),
          label: r.get('label'),
          hasPlaceholder: r.get('hasPlaceholder') ?? false,
          sortOrder: toNumber(r.get('sortOrder')) ?? 0,
        });
      }

      const reinforceOptions = reinfResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        sortOrder: toNumber(r.get('sortOrder')) ?? 0,
      }));

      const barriers: Array<{ id: string; label: string }> = [];
      const barrierCoaching: Record<string, { title: string; body: string }> = {};
      const seenBarriers = new Set<string>();
      for (const r of barrierResult.records) {
        const bid = r.get('barrierId');
        if (!seenBarriers.has(bid)) {
          seenBarriers.add(bid);
          barriers.push({ id: bid, label: r.get('barrierLabel') });
        }
        if (r.get('coachingId')) {
          barrierCoaching[bid] = {
            title: r.get('coachingTitle'),
            body: r.get('coachingBody'),
          };
        }
      }

      const defaultCoachRec = defaultCoachResult.records[0];
      const defaultCoaching = {
        title: defaultCoachRec?.get('title') ?? 'Staying present',
        body: defaultCoachRec?.get('body') ?? '',
      };

      const anchorPhrases = anchorResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
      }));

      const middleGround: Array<{ id: string; label: string }> = [];
      const walkAway: Array<{ id: string; label: string }> = [];
      for (const r of negResult.records) {
        const item = { id: r.get('id'), label: r.get('label') };
        if (r.get('type') === 'middle_ground') middleGround.push(item);
        else walkAway.push(item);
      }

      const feelingChips = feelResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
      }));

      const stepInsights: Record<string, string> = {};
      for (const r of insightResult.records) {
        stepInsights[r.get('step')] = r.get('text');
      }

      const wentWell: Array<{ id: string; label: string }> = [];
      const toChange: Array<{ id: string; label: string }> = [];
      for (const r of debriefResult.records) {
        const item = { id: r.get('id'), label: r.get('label') };
        if (r.get('type') === 'went_well') wentWell.push(item);
        else toChange.push(item);
      }

      const tc = tcResult.records[0];

      return {
        situationTypes,
        describeOptions,
        assertOptions,
        reinforceOptions,
        barriers,
        barrierCoaching,
        defaultCoaching,
        anchorPhrases,
        negotiateOptions: { middleGround, walkAway },
        negotiateHints: {
          objective: tc?.get('hintObjective') ?? '',
          relationship: tc?.get('hintRelationship') ?? '',
          'self-respect': tc?.get('hintSelfRespect') ?? '',
        },
        feelingChips,
        stepInsights,
        debriefOptions: { wentWell, toChange },
        revealText: tc?.get('revealText') ?? '',
        confidentCoaching: tc?.get('confidentCoaching') ?? '',
        confidentBarrierNoRight: tc?.get('confidentBarrierNoRight') ?? '',
        assertBarrierGuilty: tc?.get('assertBarrierGuilty') ?? '',
      };
    } catch (error) {
      console.error('Error fetching DEAR MAN content:', error);
      throw new HttpsError('internal', 'Failed to fetch DEAR MAN content');
    } finally {
      await session.close();
    }
  }
);

interface DearManSessionData {
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
  debriefCurrentFeelings?: string[];
  turningPointIds?: string[];
  momentResponseIds?: string[];
  bodySignalIds?: string[];
  thoughtPatternIds?: string[];
  underneathIds?: string[];
  copeAheadId?: string;
  reflectionLanded?: 'yes' | 'sort_of' | 'not_really';
}

export const saveDearManSession = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const data = request.data as DearManSessionData;

    const session = getDriver().session();
    try {
      await session.run(
        `
        MATCH (u:User {id: $userId})
        CREATE (s:DearManSession {
          id: randomUUID(),
          type: $type,
          relationshipType: $relationshipType,
          situationType: $situationType,
          priorities: $priorities,
          barriers: $barriers,
          describeId: $describeId,
          describeCustom: $describeCustom,
          feelings: $feelings,
          assertId: $assertId,
          assertCustom: $assertCustom,
          reinforceIds: $reinforceIds,
          anchorPhrase: $anchorPhrase,
          middleGroundId: $middleGroundId,
          middleGroundCustom: $middleGroundCustom,
          walkAwayId: $walkAwayId,
          walkAwayCustom: $walkAwayCustom,
          debriefOverall: $debriefOverall,
          debriefWentWell: $debriefWentWell,
          debriefToChange: $debriefToChange,
          debriefCurrentFeelings: $debriefCurrentFeelings,
          turningPointIds: $turningPointIds,
          momentResponseIds: $momentResponseIds,
          bodySignalIds: $bodySignalIds,
          thoughtPatternIds: $thoughtPatternIds,
          underneathIds: $underneathIds,
          copeAheadId: $copeAheadId,
          reflectionLanded: $reflectionLanded,
          createdAt: datetime()
        })
        MERGE (u)-[:COMPLETED_SESSION]->(s)
        RETURN s.id AS id
        `,
        {
          userId,
          type: data.type,
          relationshipType: data.relationshipType || '',
          situationType: data.situationType || '',
          priorities: data.priorities || [],
          barriers: data.barriers || [],
          describeId: data.describeId || null,
          describeCustom: data.describeCustom || '',
          feelings: data.feelings || [],
          assertId: data.assertId || null,
          assertCustom: data.assertCustom || '',
          reinforceIds: data.reinforceIds || [],
          anchorPhrase: data.anchorPhrase || '',
          middleGroundId: data.middleGroundId || null,
          middleGroundCustom: data.middleGroundCustom || '',
          walkAwayId: data.walkAwayId || null,
          walkAwayCustom: data.walkAwayCustom || '',
          debriefOverall: data.debriefOverall || null,
          debriefWentWell: data.debriefWentWell || [],
          debriefToChange: data.debriefToChange || [],
          debriefCurrentFeelings: data.debriefCurrentFeelings || [],
          turningPointIds: data.turningPointIds || [],
          momentResponseIds: data.momentResponseIds || [],
          bodySignalIds: data.bodySignalIds || [],
          thoughtPatternIds: data.thoughtPatternIds || [],
          underneathIds: data.underneathIds || [],
          copeAheadId: data.copeAheadId || null,
          reflectionLanded: data.reflectionLanded || null,
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Error saving DEAR MAN session:', error);
      throw new HttpsError('internal', 'Failed to save session');
    } finally {
      await session.close();
    }
  }
);

/**
 * Get all DEAR MAN debrief content from the graph in one call.
 * Returns turning points, moment responses, body signals, thought patterns,
 * underneath emotions, and overall response text.
 */
export const getDearManDebriefContent = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async () => {
    const session = getDriver().session();
    try {
      const tpResult = await session.run(`
        MATCH (tp:TurningPoint)
        RETURN tp.id AS id, tp.label AS label, tp.validationText AS validationText, tp.sortOrder AS sortOrder
        ORDER BY tp.sortOrder
      `);

      const mrResult = await session.run(`
        MATCH (mr:MomentResponse)
        RETURN mr.id AS id, mr.label AS label, mr.sortOrder AS sortOrder
        ORDER BY mr.sortOrder
      `);

      const bsResult = await session.run(`
        MATCH (bs:BodySignal)
        RETURN bs.id AS id, bs.label AS label, bs.sortOrder AS sortOrder
        ORDER BY bs.sortOrder
      `);

      const tpattResult = await session.run(`
        MATCH (tp:ThoughtPattern)
        RETURN tp.id AS id, tp.label AS label, tp.theme AS theme, tp.sortOrder AS sortOrder
        ORDER BY tp.sortOrder
      `);

      const undResult = await session.run(`
        MATCH (u:Underneath)
        RETURN u.id AS id, u.label AS label, u.sortOrder AS sortOrder
        ORDER BY u.sortOrder
      `);

      const tcResult = await session.run(`
        MATCH (tc:TherapyConcept {id: 'dbt_dear_man'})
        RETURN tc.debriefResponseBad AS bad,
               tc.debriefResponseMixed AS mixed,
               tc.debriefResponseGood AS good,
               tc.debriefResponseNotYet AS notYet
      `);

      const turningPoints = tpResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        validationText: r.get('validationText'),
        sortOrder: toNumber(r.get('sortOrder')) ?? 0,
      }));

      const momentResponses = mrResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        sortOrder: toNumber(r.get('sortOrder')) ?? 0,
      }));

      const bodySignals = bsResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        sortOrder: toNumber(r.get('sortOrder')) ?? 0,
      }));

      const thoughtPatterns = tpattResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        theme: r.get('theme'),
        sortOrder: toNumber(r.get('sortOrder')) ?? 0,
      }));

      const underneathEmotions = undResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        sortOrder: toNumber(r.get('sortOrder')) ?? 0,
      }));

      const tc = tcResult.records[0];
      const overallResponses = {
        bad: tc?.get('bad') ?? '',
        mixed: tc?.get('mixed') ?? '',
        good: tc?.get('good') ?? '',
        notYet: tc?.get('notYet') ?? '',
      };

      return {
        turningPoints,
        momentResponses,
        bodySignals,
        thoughtPatterns,
        underneathEmotions,
        overallResponses,
      };
    } catch (error) {
      console.error('Error fetching DEAR MAN debrief content:', error);
      throw new HttpsError('internal', 'Failed to fetch debrief content');
    } finally {
      await session.close();
    }
  }
);

/**
 * Get a personalized reflection and cope-ahead options for a
 * turning-point + moment-response combination.
 */
export const getDearManReflection = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    const { turningPointIds, momentResponseIds } = request.data as {
      turningPointIds: string[];
      momentResponseIds: string[];
    };

    if (!turningPointIds?.length || !momentResponseIds?.length) {
      throw new HttpsError('invalid-argument', 'turningPointIds and momentResponseIds are required');
    }

    const session = getDriver().session();
    try {
      // Try specific reflections matching any TP × any Response combo, fall back to default
      const refResult = await session.run(`
        OPTIONAL MATCH (r:Reflection)-[:REFLECTS_ON]->(tp:TurningPoint)
        WHERE tp.id IN $turningPointIds
          AND ANY(mrid IN $momentResponseIds WHERE (r)-[:FOR_RESPONSE]->(:MomentResponse {id: mrid}))
        WITH collect(DISTINCT r.text) AS texts
        OPTIONAL MATCH (d:Reflection {isDefault: true})
        WITH CASE WHEN size(texts) > 0 THEN texts ELSE [d.text] END AS allTexts
        UNWIND allTexts AS reflection
        RETURN reflection
      `, { turningPointIds, momentResponseIds });

      // Cope-ahead: specific to any selected response + universals
      const caResult = await session.run(`
        MATCH (ca:CopeAhead)
        WHERE ca.isUniversal = true
           OR ANY(mrid IN $momentResponseIds WHERE (ca)-[:FOR_RESPONSE]->(:MomentResponse {id: mrid}))
        RETURN DISTINCT ca.id AS id, ca.label AS label, ca.rehearsal AS rehearsal
      `, { momentResponseIds });

      const reflections = refResult.records
        .map((r: Neo4jRecord) => r.get('reflection') as string | null)
        .filter((t): t is string => t != null);
      const reflection = reflections.length > 0
        ? reflections.join('\n\n')
        : 'Whatever happened in that moment, your nervous system was doing its best with what it had. Let\'s build something you can reach for next time.';

      const copeAheadOptions = caResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        rehearsal: r.get('rehearsal'),
      }));

      return { reflection, copeAheadOptions };
    } catch (error) {
      console.error('Error fetching DEAR MAN reflection:', error);
      throw new HttpsError('internal', 'Failed to fetch reflection');
    } finally {
      await session.close();
    }
  }
);

/**
 * Get fallback tools based on quadrant when no specific pattern match
 * Used for the "Help me now" minimal-input path
 */
export const getQuickTools = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request): Promise<{ tools: ToolRecommendation[]; message: string }> => {
    const { quadrant, intensity } = request.data as { 
      quadrant: string; 
      intensity?: { x: number; y: number } 
    };

    if (!quadrant) {
      throw new HttpsError('invalid-argument', 'Quadrant is required');
    }

    const session = getDriver().session();
    try {
      // For high-unpleasant, recommend TIPP (autonomic regulation)
      // For low-unpleasant, recommend gentle activation
      const intensityY = intensity?.y ?? 0.5;
      
      let message: string;
      let toolIds: string[];

      if (quadrant === 'high-unpleasant') {
        if (intensityY > 0.7) {
          message = "When emotions are this intense, your body needs to calm first";
          toolIds = ['dbt_tipp', 'dbt_paced_breathing'];
        } else {
          message = "Let's help you find some ground";
          toolIds = ['dbt_grounding', 'dbt_opposite_action'];
        }
      } else if (quadrant === 'low-unpleasant') {
        message = "Sometimes we need gentle activation, not more calming";
        toolIds = ['dbt_behavioral_activation', 'dbt_pleasant_activities'];
      } else {
        message = "You're in a good place - keep doing what you're doing";
        toolIds = [];
      }

      if (toolIds.length === 0) {
        return { tools: [], message };
      }

      const query = `
        MATCH (tc:TherapyConcept)
        WHERE tc.id IN $toolIds
        RETURN tc.id as id,
               tc.name as name,
               tc.description as description,
               tc.whenToUse as whenToUse,
               tc.dbtBasis as dbtBasis
      `;

      const result = await session.run(query, { toolIds });

      const tools: ToolRecommendation[] = result.records.map((rec: Neo4jRecord) => ({
        id: rec.get('id'),
        name: rec.get('name') || rec.get('id').replace('dbt_', '').replace(/_/g, ' '),
        description: rec.get('description') || '',
        whenToUse: rec.get('whenToUse') || '',
        dbtBasis: rec.get('dbtBasis'),
        relevance: 'recommended',
      }));

      return { tools, message };
    } catch (error) {
      console.error('Error getting quick tools:', error);
      throw new HttpsError('internal', 'Failed to get tools');
    } finally {
      await session.close();
    }
  }
);

/**
 * Get saved DEAR MAN sessions for the authenticated user.
 * Returns sessions sorted by createdAt descending.
 */
export const getDearManSessions = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const limit = (request.data as { limit?: number })?.limit ?? 20;

    const session = getDriver().session();
    try {
      const result = await session.run(
        `
        MATCH (u:User {id: $userId})-[:COMPLETED_SESSION]->(s:DearManSession)
        RETURN s.id AS id,
               s.type AS type,
               s.relationshipType AS relationshipType,
               s.situationType AS situationType,
               s.priorities AS priorities,
               s.barriers AS barriers,
               s.describeId AS describeId,
               s.describeCustom AS describeCustom,
               s.feelings AS feelings,
               s.assertId AS assertId,
               s.assertCustom AS assertCustom,
               s.reinforceIds AS reinforceIds,
               s.anchorPhrase AS anchorPhrase,
               s.middleGroundId AS middleGroundId,
               s.middleGroundCustom AS middleGroundCustom,
               s.walkAwayId AS walkAwayId,
               s.walkAwayCustom AS walkAwayCustom,
               s.debriefOverall AS debriefOverall,
               s.debriefWentWell AS debriefWentWell,
               s.debriefToChange AS debriefToChange,
               s.debriefCurrentFeelings AS debriefCurrentFeelings,
               s.createdAt AS createdAt
        ORDER BY s.createdAt DESC
        LIMIT $limit
        `,
        { userId, limit: neo4j.int(limit) }
      );

      const sessions = result.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        type: r.get('type'),
        relationshipType: r.get('relationshipType') || '',
        situationType: r.get('situationType') || '',
        priorities: r.get('priorities') || [],
        barriers: r.get('barriers') || [],
        describeId: r.get('describeId'),
        describeCustom: r.get('describeCustom') || '',
        feelings: r.get('feelings') || [],
        assertId: r.get('assertId'),
        assertCustom: r.get('assertCustom') || '',
        reinforceIds: r.get('reinforceIds') || [],
        anchorPhrase: r.get('anchorPhrase') || '',
        middleGroundId: r.get('middleGroundId'),
        middleGroundCustom: r.get('middleGroundCustom') || '',
        walkAwayId: r.get('walkAwayId'),
        walkAwayCustom: r.get('walkAwayCustom') || '',
        debriefOverall: r.get('debriefOverall'),
        debriefWentWell: r.get('debriefWentWell') || [],
        debriefToChange: r.get('debriefToChange') || [],
        debriefCurrentFeelings: r.get('debriefCurrentFeelings') || [],
        createdAt: r.get('createdAt')?.toString() || new Date().toISOString(),
      }));

      return { sessions };
    } catch (error) {
      console.error('Error fetching DEAR MAN sessions:', error);
      throw new HttpsError('internal', 'Failed to fetch sessions');
    } finally {
      await session.close();
    }
  }
);

// ============================================
// PROBLEM SOLVE CONTENT
// ============================================

interface ProblemSolveEmotionResult {
  emotionId: string;
  applicable: boolean;
  dbtParent: string | null;
  clinicalNote: string;
  alternativeSkill: string | null;
}

interface SolutionDirectionResult {
  id: string;
  label: string;
  description: string;
  small: string;
  medium: string;
  bigger: string;
  linkedToolId: string | null;
  sortOrder: number;
}

interface ProblemTypeResult {
  id: string;
  label: string;
  description: string;
  recognitionPrompt: string;
  sortOrder: number;
  solutionDirections: SolutionDirectionResult[];
}

interface ProblemSolveParentProtocol {
  label: string;
  psAcknowledgment: string;
  problemDefinitionPrompts: string[];
  cannotChangeGuidance: string;
  psInterpersonalHint: string | null;
  ruminationRiskLevel: string;
  ruminationGuardMessage: string | null;
  psCompanionTools: string[];
  problemTypes: ProblemTypeResult[];
}

interface ProblemSolveProtocolResult {
  readinessCheck: string;
  readinessRedirectMessage: string;
  readinessRedirectTools: string[];
  changeabilityQuestions: string[];
  nothingCanChangeMessage: string;
  nothingCanChangeTools: string[];
  everythingIsPilingUpMessage: string;
  interpersonalDetectionPrompt: string;
  interpersonalRedirectTools: string[];
  notMyProblemPrompt: string;
  commitmentFraming: string[];
  commitmentValidation: string;
  completionAcknowledgment: string;
  completionFollowUp: string;
  copeAheadBridge: string;
  copeAheadBridgeToolId: string;
}

interface ProblemSolveContentResult {
  emotions: ProblemSolveEmotionResult[];
  parents: Record<string, ProblemSolveParentProtocol>;
  protocol: ProblemSolveProtocolResult;
}

/**
 * Get problem solve content for a set of emotions.
 * Returns per-emotion PS applicability, per-parent protocol data
 * with problem types and solution directions, plus the singleton protocol node.
 * No auth required — this is public emotion knowledge.
 */
export const getProblemSolveContent = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request): Promise<ProblemSolveContentResult> => {
    const { emotionIds } = request.data as { emotionIds: string[] };

    if (!emotionIds || !Array.isArray(emotionIds) || emotionIds.length === 0) {
      throw new HttpsError('invalid-argument', 'emotionIds array is required');
    }

    const session = getDriver().session();
    try {
      // Query 1: Per-emotion + per-parent content with problem types and solution directions
      const contentResult = await session.run(
        `
        MATCH (e:Emotion) WHERE e.id IN $emotionIds
        OPTIONAL MATCH (e)-[:HAS_REGULATION_CONTENT]->(c:EmotionRegulationContent)
        OPTIONAL MATCH (c)-[:HAS_PROBLEM_TYPE]->(pt:ProblemType)
        OPTIONAL MATCH (pt)-[:HAS_SOLUTION_DIRECTION]->(sd:SolutionDirection)
        RETURN e.id AS emotionId,
               coalesce(e.problemSolveApplicable, false) AS applicable,
               e.psClinicalNote AS clinicalNote,
               e.psAlternativeSkill AS alternativeSkill,
               e.dbtParent AS emotionDbtParent,
               c.dbtParent AS dbtParent,
               c.label AS parentLabel,
               c.psAcknowledgment AS psAcknowledgment,
               c.problemDefinitionPrompts AS problemDefinitionPrompts,
               c.cannotChangeGuidance AS cannotChangeGuidance,
               c.psInterpersonalHint AS psInterpersonalHint,
               c.ruminationRiskLevel AS ruminationRiskLevel,
               c.ruminationGuardMessage AS ruminationGuardMessage,
               c.psCompanionTools AS psCompanionTools,
               c.psRedirectGuidance AS psRedirectGuidance,
               pt.id AS problemTypeId,
               pt.label AS problemTypeLabel,
               pt.description AS problemTypeDescription,
               pt.recognitionPrompt AS problemTypeRecognitionPrompt,
               pt.sortOrder AS problemTypeSortOrder,
               collect(DISTINCT sd {
                 .id, .label, .description,
                 .small, .medium, .bigger,
                 .linkedToolId, .sortOrder
               }) AS solutionDirections
        `,
        { emotionIds }
      );

      // Query 2: Protocol singleton node
      const protocolResult = await session.run(
        `MATCH (ps:ProblemSolveProtocol {id: 'problem_solve_protocol'}) RETURN ps {.*} AS protocol`
      );

      // Shape emotions array
      const emotions: ProblemSolveEmotionResult[] = [];
      const seenEmotions = new Set<string>();
      const parents: Record<string, ProblemSolveParentProtocol> = {};

      for (const record of contentResult.records) {
        const emotionId = record.get('emotionId');
        const applicable = record.get('applicable');
        const dbtParent = record.get('dbtParent');

        // Deduplicate emotions (multiple records per emotion due to JOINs)
        if (!seenEmotions.has(emotionId)) {
          seenEmotions.add(emotionId);
          emotions.push({
            emotionId,
            applicable,
            dbtParent: dbtParent || null,
            clinicalNote: record.get('clinicalNote') || '',
            alternativeSkill: record.get('alternativeSkill') || null,
          });
        }

        // Build parent protocol data (deduplicated by dbtParent key)
        if (applicable && dbtParent && !parents[dbtParent]) {
          parents[dbtParent] = {
            label: record.get('parentLabel') || dbtParent,
            psAcknowledgment: record.get('psAcknowledgment') || '',
            problemDefinitionPrompts: record.get('problemDefinitionPrompts') || [],
            cannotChangeGuidance: record.get('cannotChangeGuidance') || '',
            psInterpersonalHint: record.get('psInterpersonalHint') || null,
            ruminationRiskLevel: record.get('ruminationRiskLevel') || 'low',
            ruminationGuardMessage: record.get('ruminationGuardMessage') || null,
            psCompanionTools: record.get('psCompanionTools') || [],
            problemTypes: [],
          };
        }

        // Collect problem types per parent (deduplicated)
        if (applicable && dbtParent && parents[dbtParent]) {
          const ptId = record.get('problemTypeId');
          if (ptId && !parents[dbtParent].problemTypes.some(pt => pt.id === ptId)) {
            const sdRaw = record.get('solutionDirections') || [];
            const solutionDirections: SolutionDirectionResult[] = sdRaw
              .filter((sd: Record<string, unknown>) => sd.id != null)
              .map((sd: Record<string, unknown>) => ({
                id: sd.id as string,
                label: sd.label as string,
                description: sd.description as string,
                small: sd.small as string,
                medium: sd.medium as string,
                bigger: sd.bigger as string,
                linkedToolId: (sd.linkedToolId as string) || null,
                sortOrder: typeof sd.sortOrder === 'object' && sd.sortOrder !== null
                  ? (sd.sortOrder as { low: number }).low ?? 0
                  : (sd.sortOrder as number) ?? 0,
              }))
              .sort((a: SolutionDirectionResult, b: SolutionDirectionResult) => a.sortOrder - b.sortOrder);

            parents[dbtParent].problemTypes.push({
              id: ptId,
              label: record.get('problemTypeLabel') || '',
              description: record.get('problemTypeDescription') || '',
              recognitionPrompt: record.get('problemTypeRecognitionPrompt') || '',
              sortOrder: typeof record.get('problemTypeSortOrder') === 'object'
                ? record.get('problemTypeSortOrder')?.low ?? 0
                : record.get('problemTypeSortOrder') ?? 0,
              solutionDirections,
            });
          }
        }
      }

      // Sort problem types by sortOrder within each parent
      for (const parent of Object.values(parents)) {
        parent.problemTypes.sort((a, b) => a.sortOrder - b.sortOrder);
      }

      // Shape protocol
      const protocolRaw = protocolResult.records[0]?.get('protocol') || {};
      const protocol: ProblemSolveProtocolResult = {
        readinessCheck: protocolRaw.readinessCheck || '',
        readinessRedirectMessage: protocolRaw.readinessRedirectMessage || '',
        readinessRedirectTools: protocolRaw.readinessRedirectTools || [],
        changeabilityQuestions: protocolRaw.changeabilityQuestions || [],
        nothingCanChangeMessage: protocolRaw.nothingCanChangeMessage || '',
        nothingCanChangeTools: protocolRaw.nothingCanChangeTools || [],
        everythingIsPilingUpMessage: protocolRaw.everythingIsPilingUpMessage || '',
        interpersonalDetectionPrompt: protocolRaw.interpersonalDetectionPrompt || '',
        interpersonalRedirectTools: protocolRaw.interpersonalRedirectTools || [],
        notMyProblemPrompt: protocolRaw.notMyProblemPrompt || '',
        commitmentFraming: protocolRaw.commitmentFraming || [],
        commitmentValidation: protocolRaw.commitmentValidation || '',
        completionAcknowledgment: protocolRaw.completionAcknowledgment || '',
        completionFollowUp: protocolRaw.completionFollowUp || '',
        copeAheadBridge: protocolRaw.copeAheadBridge || '',
        copeAheadBridgeToolId: protocolRaw.copeAheadBridgeToolId || 'cope-ahead',
      };

      return { emotions, parents, protocol };
    } catch (error) {
      console.error('Error getting problem solve content:', error);
      throw new HttpsError('internal', 'Failed to get problem solve content');
    } finally {
      await session.close();
    }
  }
);
