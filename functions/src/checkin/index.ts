/**
 * Check-ins: save and list.
 * Moved verbatim from the single-file functions/src/index.ts (A1-2); deploy names are the export names.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import neo4j, { Record as Neo4jRecord } from 'neo4j-driver';
import { getDriver, neo4jUri, neo4jUser, neo4jPassword } from '../shared/neo4j';

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
