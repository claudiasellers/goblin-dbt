import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import neo4j, { Driver } from 'neo4j-driver';

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
          note: $note
        })
        WITH c
        MATCH (u:User {id: $userId})
        MERGE (u)-[:LOGGED]->(c)
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

      const checkIns = result.records.map((record) => {
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
// KNOWLEDGE GRAPH QUERY FUNCTIONS
// These power the neural state matching and tool recommendations
// ============================================

interface CheckInInput {
  quadrant: string;
  emotions?: string[];
  intensity?: { x: number; y: number };
  bodySensations?: Array<{ region: string; tags?: string[] }>;
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

interface StateResult {
  pattern: ActivationPatternResult;
  tools: ToolRecommendation[];
  safetyFlag?: {
    id: string;
    type: string;
    trigger: string;
    action: string;
  };
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
      // This is the "minimal input" path - just from quadrant selection
      const quadrantPatternMap: Record<string, string[]> = {
        'high-unpleasant': ['acute_alarm', 'chronic_vigilance', 'emotional_flooding', 'social_threat_shame'],
        'low-unpleasant': ['conservation_freeze', 'dissociation_overmodulation', 'rumination_loop', 'reward_drive_low'],
        'high-pleasant': [], // Positive states - no intervention needed
        'low-pleasant': [], // Calm states - no intervention needed
      };

      const candidatePatterns = quadrantPatternMap[input.quadrant] || [];

      // If positive quadrant, return a "you're doing well" response
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

      // Build the pattern matching query
      // If emotions provided, match patterns associated with those emotions
      // If not, use quadrant-based heuristics
      let patternQuery: string;
      let queryParams: Record<string, unknown>;

      if (input.emotions && input.emotions.length > 0) {
        // Convert emotion names to lowercase IDs for matching
        const emotionIds = input.emotions.map(e => 
          e.toLowerCase().replace(/\s+/g, '_')
        );

        patternQuery = `
          // Find patterns associated with the user's reported emotions
          MATCH (p:ActivationPattern)-[r:ASSOCIATED_WITH]->(e:Emotion)
          WHERE p.id IN $candidatePatterns
            AND e.id IN $emotionIds
          WITH p, count(r) as emotionMatches, collect(r.strength) as strengths
          
          // Calculate confidence based on emotion matches and strength
          WITH p, emotionMatches,
               CASE 
                 WHEN 'strong' IN strengths THEN 0.3
                 WHEN 'moderate' IN strengths THEN 0.2
                 ELSE 0.1
               END as strengthBonus
          
          // Get pattern details
          RETURN p.id as id,
                 p.userFacingLabel as userFacingLabel,
                 p.description as description,
                 p.evidenceGrade as evidenceGrade,
                 p.safetyConstraints as safetyConstraints,
                 p.clinicalNotes as clinicalNotes,
                 (toFloat(emotionMatches) / $emotionCount + strengthBonus) as confidence
          ORDER BY confidence DESC
          LIMIT 1
        `;
        queryParams = {
          candidatePatterns,
          emotionIds,
          emotionCount: emotionIds.length,
        };
      } else {
        // No emotions provided - use intensity-based heuristics
        // High intensity + high-unpleasant → more likely acute_alarm or emotional_flooding
        // Low intensity + low-unpleasant → more likely conservation_freeze or reward_drive_low
        const intensityY = input.intensity?.y ?? 0.5;
        
        patternQuery = `
          MATCH (p:ActivationPattern)
          WHERE p.id IN $candidatePatterns
          WITH p,
               CASE 
                 WHEN $intensityY > 0.7 AND p.id IN ['acute_alarm', 'emotional_flooding'] THEN 0.8
                 WHEN $intensityY > 0.7 AND p.id IN ['chronic_vigilance', 'social_threat_shame'] THEN 0.6
                 WHEN $intensityY < 0.3 AND p.id IN ['conservation_freeze', 'reward_drive_low'] THEN 0.8
                 WHEN $intensityY < 0.3 AND p.id IN ['dissociation_overmodulation', 'rumination_loop'] THEN 0.6
                 ELSE 0.5
               END as confidence
          RETURN p.id as id,
                 p.userFacingLabel as userFacingLabel,
                 p.description as description,
                 p.evidenceGrade as evidenceGrade,
                 p.safetyConstraints as safetyConstraints,
                 p.clinicalNotes as clinicalNotes,
                 confidence
          ORDER BY confidence DESC
          LIMIT 1
        `;
        queryParams = {
          candidatePatterns,
          intensityY,
        };
      }

      const patternResult = await session.run(patternQuery, queryParams);
      
      if (patternResult.records.length === 0) {
        // Log which patterns were searched for debugging
        console.error('No patterns found. Searched for:', candidatePatterns, 'Quadrant:', input.quadrant);
        throw new HttpsError('not-found', `No matching pattern found for quadrant: ${input.quadrant}. Patterns searched: ${candidatePatterns.join(', ')}`);
      }

      const record = patternResult.records[0];
      const pattern: ActivationPatternResult = {
        id: record.get('id'),
        userFacingLabel: record.get('userFacingLabel'),
        description: record.get('description'),
        evidenceGrade: record.get('evidenceGrade'),
        safetyConstraints: record.get('safetyConstraints') || [],
        clinicalNotes: record.get('clinicalNotes') || '',
        confidence: record.get('confidence'),
      };

      // Now get recommended tools for this pattern
      // Tools are linked via TherapyConcept → ADDRESSES/REDUCES → Emotion ← ASSOCIATED_WITH ← Pattern
      const toolsQuery = `
        // Find emotions associated with this pattern
        MATCH (p:ActivationPattern {id: $patternId})-[:ASSOCIATED_WITH]->(e:Emotion)
        
        // Find therapy concepts that address these emotions
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
      
      const tools: ToolRecommendation[] = toolsResult.records.map(rec => ({
        id: rec.get('id'),
        name: rec.get('name') || rec.get('id').replace('dbt_', '').replace(/_/g, ' '),
        description: rec.get('description') || '',
        whenToUse: rec.get('whenToUse') || '',
        dbtBasis: rec.get('dbtBasis'),
        relevance: rec.get('relevance'),
      }));

      // Check for safety flags
      const safetyQuery = `
        MATCH (p:ActivationPattern {id: $patternId})-[:TRIGGERS_SAFETY]->(sf:SafetyFlag)
        RETURN sf.id as id, sf.type as type, sf.trigger as trigger, sf.action as action
        LIMIT 1
      `;

      const safetyResult = await session.run(safetyQuery, { patternId: pattern.id });
      
      const safetyFlag = safetyResult.records.length > 0 ? {
        id: safetyResult.records[0].get('id'),
        type: safetyResult.records[0].get('type'),
        trigger: safetyResult.records[0].get('trigger'),
        action: safetyResult.records[0].get('action'),
      } : undefined;

      return { pattern, tools, safetyFlag };
    } catch (error) {
      // Enhanced error logging for debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.error('Error getting state and tools:', {
        message: errorMessage,
        stack: errorStack,
        quadrant: input.quadrant,
        emotions: input.emotions,
      });
      
      // Re-throw HttpsError as-is, wrap others
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
      // Find emotions that share brain structure activations (neural substrates)
      // This is the graph traversal: Emotion ← ACTIVATES_DURING ← BrainStructure → ACTIVATES_DURING → OtherEmotion
      const query = `
        // Start with the selected emotion
        MATCH (e1:Emotion {id: $emotionId})
        
        // Find brain structures that activate during this emotion
        MATCH (bs:BrainStructure)-[:ACTIVATES_DURING]->(e1)
        
        // Find other emotions activated by the same structures
        MATCH (bs)-[:ACTIVATES_DURING]->(e2:Emotion)
        WHERE e2.id <> e1.id
          ${quadrant ? 'AND e2.quadrant = $quadrant' : ''}
        
        // Count shared substrates and get the structure names
        WITH e2, collect(DISTINCT bs.name) as sharedStructures, count(DISTINCT bs) as sharedCount
        WHERE sharedCount >= 1
        
        // Also check if they appear in same activation patterns
        OPTIONAL MATCH (p:ActivationPattern)-[:ASSOCIATED_WITH]->(e1)
        OPTIONAL MATCH (p)-[:ASSOCIATED_WITH]->(e2)
        WITH e2, sharedStructures, sharedCount, count(DISTINCT p) as patternOverlap
        
        RETURN e2.id as id,
               e2.name as name,
               CASE 
                 WHEN patternOverlap > 0 AND sharedCount > 1 
                   THEN 'often occurs together'
                 WHEN sharedCount > 1 
                   THEN 'similar body response'
                 ELSE 'related feeling'
               END as reason
        ORDER BY (sharedCount + patternOverlap) DESC
        LIMIT 3
      `;

      const result = await session.run(query, { emotionId, quadrant });

      const relatedEmotions = result.records.map(rec => ({
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

      const tools: ToolRecommendation[] = result.records.map(rec => ({
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
