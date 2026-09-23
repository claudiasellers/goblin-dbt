"use strict";
/**
 * ONE-TIME MIGRATION: Copy all user data from Neo4j to Firestore.
 *
 * Prerequisites:
 *   1. Firebase Admin credentials — either:
 *      - Set GOOGLE_APPLICATION_CREDENTIALS to a service account key JSON, OR
 *      - Run `gcloud auth application-default login` for local credentials
 *   2. Neo4j credentials as environment variables:
 *      - NEO4J_URI
 *      - NEO4J_USER
 *      - NEO4J_PASSWORD
 *
 * Usage:
 *   NEO4J_URI=neo4j+s://xxx.databases.neo4j.io \
 *   NEO4J_USER=neo4j \
 *   NEO4J_PASSWORD=xxx \
 *   npx ts-node scripts/migrate-neo4j-to-firestore.ts
 *
 * Or if you prefer, get Neo4j secrets from Firebase:
 *   firebase functions:secrets:access NEO4J_URI
 *   firebase functions:secrets:access NEO4J_USER
 *   firebase functions:secrets:access NEO4J_PASSWORD
 *
 * This script is READ-ONLY against Neo4j (it only creates data in Firestore).
 * Safe to run multiple times — uses Firestore set() which overwrites existing docs.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
// ── Config ──
const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
if (!NEO4J_URI || !NEO4J_USER || !NEO4J_PASSWORD) {
    console.error('Missing required environment variables: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD');
    process.exit(1);
}
// Initialize Firebase Admin
admin.initializeApp({ projectId: 'goblindbt' });
const db = admin.firestore();
// Initialize Neo4j
const driver = neo4j_driver_1.default.driver(NEO4J_URI, neo4j_driver_1.default.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
// ── Helpers ──
/** Convert Neo4j datetime/integer to JS values */
function toJsDate(neo4jDateTime) {
    if (!neo4jDateTime)
        return new Date();
    if (neo4jDateTime instanceof Date)
        return neo4jDateTime;
    // Neo4j DateTime has toString() that returns ISO-like string
    if (typeof neo4jDateTime === 'object' && neo4jDateTime !== null && 'toString' in neo4jDateTime) {
        return new Date(neo4jDateTime.toString());
    }
    if (typeof neo4jDateTime === 'string')
        return new Date(neo4jDateTime);
    return new Date();
}
function toNumber(val) {
    if (val == null)
        return 0;
    if (typeof val === 'number')
        return val;
    if (typeof val === 'object' && val !== null && 'toNumber' in val) {
        return val.toNumber();
    }
    return Number(val) || 0;
}
/** Write docs in batches of 500 (Firestore limit) */
async function commitBatch(ops) {
    for (let i = 0; i < ops.length; i += 500) {
        const batch = db.batch();
        ops.slice(i, i + 500).forEach(op => batch.set(op.ref, op.data));
        await batch.commit();
    }
}
// ── Migration Functions ──
async function migrateUsers() {
    const session = driver.session();
    try {
        const result = await session.run(`
      MATCH (u:User)
      RETURN u.id AS id, u.email AS email, u.createdAt AS createdAt,
             u.displayName AS displayName, u.photoURL AS photoURL,
             u.theme AS theme, u.checkInReminder AS checkInReminder,
             u.reminderTime AS reminderTime, u.reminderDays AS reminderDays,
             u.weeklyDigest AS weeklyDigest, u.dailyCheckInGoal AS dailyCheckInGoal,
             u.weeklyToolGoal AS weeklyToolGoal, u.focusCategories AS focusCategories,
             u.dataRetentionDays AS dataRetentionDays, u.shareAnonymousData AS shareAnonymousData
    `);
        const userIds = [];
        const ops = [];
        for (const rec of result.records) {
            const userId = rec.get('id');
            if (!userId)
                continue;
            userIds.push(userId);
            const data = {
                email: rec.get('email') || '',
                createdAt: admin.firestore.Timestamp.fromDate(toJsDate(rec.get('createdAt'))),
            };
            // Only include non-null optional fields
            const optionalFields = [
                'displayName', 'photoURL', 'theme', 'checkInReminder',
                'reminderTime', 'weeklyDigest', 'shareAnonymousData',
            ];
            for (const field of optionalFields) {
                const val = rec.get(field);
                if (val != null)
                    data[field] = val;
            }
            // Handle numeric fields
            const numericFields = ['dailyCheckInGoal', 'weeklyToolGoal', 'dataRetentionDays'];
            for (const field of numericFields) {
                const val = rec.get(field);
                if (val != null)
                    data[field] = toNumber(val);
            }
            // Handle array fields
            const arrayFields = ['reminderDays', 'focusCategories'];
            for (const field of arrayFields) {
                const val = rec.get(field);
                if (val != null)
                    data[field] = val;
            }
            ops.push({ ref: db.doc(`users/${userId}`), data });
        }
        await commitBatch(ops);
        console.log(`Migrated ${userIds.length} users`);
        return userIds;
    }
    finally {
        await session.close();
    }
}
async function migrateCheckIns(userId) {
    var _a;
    const session = driver.session();
    try {
        const result = await session.run(`
      MATCH (u:User {id: $userId})-[:LOGGED]->(c:CheckIn)
      OPTIONAL MATCH (c)-[:SENSED]->(s:BodySensation)
      WITH c, collect(s {
        x: s.x, y: s.y, region: s.region,
        intensityX: s.intensityX, intensityY: s.intensityY, tags: s.tags
      }) AS sensations
      ORDER BY c.timestamp DESC
      RETURN c.id AS id, c.emotion AS emotion, c.quadrant AS quadrant,
             c.intensityX AS intensityX, c.intensityY AS intensityY,
             c.note AS note, c.timestamp AS timestamp,
             c.activationPatternId AS activationPatternId,
             c.confidence AS confidence, sensations
      `, { userId });
        const ops = [];
        // Map Neo4j check-in IDs to Firestore doc IDs (use same ID for consistency)
        const idMap = new Map();
        for (const rec of result.records) {
            const neo4jId = rec.get('id');
            if (!neo4jId)
                continue;
            const sensations = (rec.get('sensations') || []).map((s) => ({
                x: toNumber(s.x),
                y: toNumber(s.y),
                region: s.region || '',
                intensityX: toNumber(s.intensityX),
                intensityY: toNumber(s.intensityY),
                tags: s.tags || [],
            }));
            const ts = toJsDate(rec.get('timestamp'));
            const data = {
                emotion: rec.get('emotion') || '',
                quadrant: rec.get('quadrant') || '',
                intensityX: toNumber(rec.get('intensityX')),
                intensityY: toNumber(rec.get('intensityY')),
                note: rec.get('note') || '',
                bodySensations: sensations,
                activationPatternId: rec.get('activationPatternId') || null,
                confidence: (_a = rec.get('confidence')) !== null && _a !== void 0 ? _a : null,
                timestamp: admin.firestore.Timestamp.fromDate(ts),
                createdAt: admin.firestore.Timestamp.fromDate(ts),
            };
            // Use the Neo4j UUID as the Firestore doc ID for consistency
            const docRef = db.doc(`users/${userId}/checkIns/${neo4jId}`);
            idMap.set(neo4jId, neo4jId);
            ops.push({ ref: docRef, data });
        }
        await commitBatch(ops);
        return { count: ops.length, idMap };
    }
    finally {
        await session.close();
    }
}
async function migrateToolUsages(userId, checkInIdMap) {
    const session = driver.session();
    try {
        const result = await session.run(`
      MATCH (u:User {id: $userId})-[:USED_TOOL]->(tu:ToolUsage)
      OPTIONAL MATCH (tu)-[:FOLLOWED_CHECKIN]->(c:CheckIn)
      RETURN tu.id AS id, tu.toolId AS toolId, tu.timestamp AS timestamp,
             tu.outcome AS outcome, tu.outcomeTimestamp AS outcomeTimestamp,
             c.id AS linkedCheckInId
      ORDER BY tu.timestamp DESC
      `, { userId });
        const ops = [];
        for (const rec of result.records) {
            const neo4jId = rec.get('id');
            if (!neo4jId)
                continue;
            const ts = toJsDate(rec.get('timestamp'));
            const neo4jCheckInId = rec.get('linkedCheckInId');
            // Map to Firestore check-in ID (same ID since we preserved them)
            const linkedCheckInId = neo4jCheckInId && checkInIdMap.has(neo4jCheckInId)
                ? checkInIdMap.get(neo4jCheckInId)
                : null;
            const data = {
                toolId: rec.get('toolId') || '',
                timestamp: admin.firestore.Timestamp.fromDate(ts),
                outcome: rec.get('outcome') || null,
                outcomeTimestamp: rec.get('outcomeTimestamp')
                    ? admin.firestore.Timestamp.fromDate(toJsDate(rec.get('outcomeTimestamp')))
                    : null,
                linkedCheckInId,
                createdAt: admin.firestore.Timestamp.fromDate(ts),
            };
            const docRef = db.doc(`users/${userId}/toolUsages/${neo4jId}`);
            ops.push({ ref: docRef, data });
        }
        await commitBatch(ops);
        return ops.length;
    }
    finally {
        await session.close();
    }
}
async function migrateDearManSessions(userId) {
    const session = driver.session();
    try {
        const result = await session.run(`
      MATCH (u:User {id: $userId})-[:COMPLETED_SESSION]->(s:DearManSession)
      RETURN s.id AS id, s.type AS type,
             s.relationshipType AS relationshipType, s.situationType AS situationType,
             s.priorities AS priorities, s.barriers AS barriers,
             s.describeId AS describeId, s.describeCustom AS describeCustom,
             s.feelings AS feelings, s.assertId AS assertId,
             s.assertCustom AS assertCustom, s.reinforceIds AS reinforceIds,
             s.anchorPhrase AS anchorPhrase,
             s.middleGroundId AS middleGroundId, s.middleGroundCustom AS middleGroundCustom,
             s.walkAwayId AS walkAwayId, s.walkAwayCustom AS walkAwayCustom,
             s.debriefOverall AS debriefOverall,
             s.debriefWentWell AS debriefWentWell, s.debriefToChange AS debriefToChange,
             s.debriefCurrentFeelings AS debriefCurrentFeelings,
             s.turningPointIds AS turningPointIds, s.momentResponseIds AS momentResponseIds,
             s.bodySignalIds AS bodySignalIds, s.thoughtPatternIds AS thoughtPatternIds,
             s.underneathIds AS underneathIds, s.copeAheadId AS copeAheadId,
             s.reflectionLanded AS reflectionLanded, s.createdAt AS createdAt
      ORDER BY s.createdAt DESC
      `, { userId });
        const ops = [];
        for (const rec of result.records) {
            const neo4jId = rec.get('id');
            if (!neo4jId)
                continue;
            const data = {
                type: rec.get('type') || 'prep',
                relationshipType: rec.get('relationshipType') || '',
                situationType: rec.get('situationType') || '',
                priorities: rec.get('priorities') || [],
                barriers: rec.get('barriers') || [],
                describeId: rec.get('describeId') || null,
                describeCustom: rec.get('describeCustom') || '',
                feelings: rec.get('feelings') || [],
                assertId: rec.get('assertId') || null,
                assertCustom: rec.get('assertCustom') || '',
                reinforceIds: rec.get('reinforceIds') || [],
                anchorPhrase: rec.get('anchorPhrase') || '',
                middleGroundId: rec.get('middleGroundId') || null,
                middleGroundCustom: rec.get('middleGroundCustom') || '',
                walkAwayId: rec.get('walkAwayId') || null,
                walkAwayCustom: rec.get('walkAwayCustom') || '',
                debriefOverall: rec.get('debriefOverall') || null,
                debriefWentWell: rec.get('debriefWentWell') || [],
                debriefToChange: rec.get('debriefToChange') || [],
                debriefCurrentFeelings: rec.get('debriefCurrentFeelings') || [],
                turningPointIds: rec.get('turningPointIds') || [],
                momentResponseIds: rec.get('momentResponseIds') || [],
                bodySignalIds: rec.get('bodySignalIds') || [],
                thoughtPatternIds: rec.get('thoughtPatternIds') || [],
                underneathIds: rec.get('underneathIds') || [],
                copeAheadId: rec.get('copeAheadId') || null,
                reflectionLanded: rec.get('reflectionLanded') || null,
                createdAt: admin.firestore.Timestamp.fromDate(toJsDate(rec.get('createdAt'))),
            };
            const docRef = db.doc(`users/${userId}/dearManSessions/${neo4jId}`);
            ops.push({ ref: docRef, data });
        }
        await commitBatch(ops);
        return ops.length;
    }
    finally {
        await session.close();
    }
}
// ── Main ──
async function main() {
    console.log('Starting Neo4j → Firestore migration...');
    console.log(`Neo4j: ${NEO4J_URI}`);
    console.log(`Firestore project: goblindbt\n`);
    try {
        // Step 1: Migrate all users
        const userIds = await migrateUsers();
        if (userIds.length === 0) {
            console.log('No users found in Neo4j. Nothing to migrate.');
            return;
        }
        // Step 2: For each user, migrate their data
        let totalCheckIns = 0;
        let totalToolUsages = 0;
        let totalDearMan = 0;
        for (const userId of userIds) {
            const { count: checkInCount, idMap } = await migrateCheckIns(userId);
            const toolCount = await migrateToolUsages(userId, idMap);
            const dearManCount = await migrateDearManSessions(userId);
            totalCheckIns += checkInCount;
            totalToolUsages += toolCount;
            totalDearMan += dearManCount;
            console.log(`  User ${userId}: ${checkInCount} check-ins, ${toolCount} tool usages, ${dearManCount} DEAR MAN sessions`);
        }
        console.log(`\nMigration complete!`);
        console.log(`  ${userIds.length} users`);
        console.log(`  ${totalCheckIns} check-ins`);
        console.log(`  ${totalToolUsages} tool usages`);
        console.log(`  ${totalDearMan} DEAR MAN sessions`);
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
    finally {
        await driver.close();
        process.exit(0);
    }
}
main();
//# sourceMappingURL=migrate-neo4j-to-firestore.js.map