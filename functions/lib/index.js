"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSchema = exports.ensureUserExists = exports.getCheckInsByUser = exports.saveCheckIn = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
// Define secrets - these are securely stored in Firebase and injected at runtime
const neo4jUri = (0, params_1.defineSecret)('NEO4J_URI');
const neo4jUser = (0, params_1.defineSecret)('NEO4J_USER');
const neo4jPassword = (0, params_1.defineSecret)('NEO4J_PASSWORD');
// Neo4j driver singleton
let driver = null;
function getDriver() {
    if (!driver) {
        driver = neo4j_driver_1.default.driver(neo4jUri.value(), neo4j_driver_1.default.auth.basic(neo4jUser.value(), neo4jPassword.value()));
    }
    return driver;
}
// ============================================
// CLOUD FUNCTIONS
// ============================================
/**
 * Save a new check-in for the authenticated user
 */
exports.saveCheckIn = (0, https_1.onCall)({ secrets: [neo4jUri, neo4jUser, neo4jPassword] }, async (request) => {
    var _a, _b, _c, _d, _e;
    // Verify user is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const userId = request.auth.uid;
    const checkIn = request.data;
    // Validate required fields
    if (!checkIn.emotion || !checkIn.quadrant) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields');
    }
    const session = getDriver().session();
    try {
        const result = await session.run(`
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
        `, {
            userId,
            timestamp: checkIn.timestamp || new Date().toISOString(),
            emotion: checkIn.emotion,
            quadrant: checkIn.quadrant,
            intensityX: (_b = (_a = checkIn.intensity) === null || _a === void 0 ? void 0 : _a.x) !== null && _b !== void 0 ? _b : 0,
            intensityY: (_d = (_c = checkIn.intensity) === null || _c === void 0 ? void 0 : _c.y) !== null && _d !== void 0 ? _d : 0,
            note: checkIn.note || '',
            bodySensations: checkIn.bodySensations || [],
        });
        const id = ((_e = result.records[0]) === null || _e === void 0 ? void 0 : _e.get('id')) || '';
        return { id };
    }
    catch (error) {
        console.error('Error saving check-in:', error);
        throw new https_1.HttpsError('internal', 'Failed to save check-in');
    }
    finally {
        await session.close();
    }
});
/**
 * Get check-ins for the authenticated user
 */
exports.getCheckInsByUser = (0, https_1.onCall)({ secrets: [neo4jUri, neo4jUser, neo4jPassword] }, async (request) => {
    var _a;
    // Verify user is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const userId = request.auth.uid;
    const limit = ((_a = request.data) === null || _a === void 0 ? void 0 : _a.limit) || 50;
    const session = getDriver().session();
    try {
        const result = await session.run(`
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
        `, { userId, limit: neo4j_driver_1.default.int(limit) });
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
    }
    catch (error) {
        console.error('Error fetching check-ins:', error);
        throw new https_1.HttpsError('internal', 'Failed to fetch check-ins');
    }
    finally {
        await session.close();
    }
});
/**
 * Ensure user exists in Neo4j (called after Firebase Auth signup/login)
 */
exports.ensureUserExists = (0, https_1.onCall)({ secrets: [neo4jUri, neo4jUser, neo4jPassword] }, async (request) => {
    // Verify user is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const userId = request.auth.uid;
    const email = request.auth.token.email || '';
    const session = getDriver().session();
    try {
        await session.run(`
        MERGE (u:User {id: $userId})
        ON CREATE SET u.email = $email, u.createdAt = datetime()
        `, { userId, email });
        return { success: true };
    }
    catch (error) {
        console.error('Error ensuring user exists:', error);
        throw new https_1.HttpsError('internal', 'Failed to create user');
    }
    finally {
        await session.close();
    }
});
/**
 * Initialize Neo4j schema (admin function - run once during setup)
 * In production, you might want to restrict this to admin users
 */
exports.initializeSchema = (0, https_1.onCall)({ secrets: [neo4jUri, neo4jUser, neo4jPassword] }, async (request) => {
    // Verify user is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
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
    }
    catch (error) {
        console.error('Error initializing schema:', error);
        throw new https_1.HttpsError('internal', 'Failed to initialize schema');
    }
    finally {
        await session.close();
    }
});
//# sourceMappingURL=index.js.map