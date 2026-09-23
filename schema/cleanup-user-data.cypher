// ONE-TIME: Remove all user data nodes from Neo4j
// Run this AFTER confirming all reads/writes use Firestore
// This does NOT touch knowledge graph nodes (ActivationPattern, Emotion, etc.)

// Delete BodySensation nodes
MATCH (s:BodySensation)
DETACH DELETE s;

// Delete CheckIn nodes
MATCH (c:CheckIn)
DETACH DELETE c;

// Delete ToolUsage nodes
MATCH (tu:ToolUsage)
DETACH DELETE tu;

// Delete DearManSession nodes
MATCH (s:DearManSession)
DETACH DELETE s;

// Delete User nodes
MATCH (u:User)
DETACH DELETE u;

// Drop user-data indexes and constraints
DROP CONSTRAINT user_id IF EXISTS;
DROP CONSTRAINT checkin_id IF EXISTS;
DROP INDEX checkin_timestamp IF EXISTS;
