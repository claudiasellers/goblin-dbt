/**
 * Tool usage tracking and "did it help?" outcomes.
 * Moved verbatim from the single-file functions/src/index.ts (A1-2); deploy names are the export names.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getDriver, neo4jUri, neo4jUser, neo4jPassword } from '../shared/neo4j';

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
