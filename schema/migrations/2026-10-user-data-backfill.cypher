// ============================================================
// USER-DATA BACKFILL — PR-S1, decision D-16 (a): wrap + backfill.
//
// Adopts every pre-convention user node into the three-layer conventions
// (functions/src/userdata/layers.ts): labels :UserData:LogRecord, ownerId,
// key = ownerId + ':' + id, createdAt, schemaVersion. Mirrors saved Opposite
// Action plans as FollowUp (type oa_plan), the only follow-ups that exist today.
//
// Run AFTER `node scripts/load-graph.mjs --only constraints` (the *_key
// constraints), and run it TWICE: the second run must change nothing
// (every statement is guarded by `ownerId IS NULL` or MERGEs on key).
//   node scripts/load-graph.mjs --file schema/migrations/2026-10-user-data-backfill.cypher
// Not in LOAD_ORDER: it touches user data. Live on 2026-09-30: 1 user,
// 5 check-ins, 6 body sensations, 205 ToolUsage, 18 sessions, 0 OA sessions.
// ============================================================

// 1. Check-ins (log)
MATCH (u:User)-[:LOGGED]->(c:CheckIn) WHERE c.ownerId IS NULL
SET c:UserData:LogRecord, c.ownerId = u.id, c.key = u.id + ':' + c.id,
    c.createdAt = coalesce(c.createdAt, c.timestamp), c.schemaVersion = coalesce(c.schemaVersion, 1);

// 2. Body sensations (log, child of CheckIn). They had no id; one is minted once.
MATCH (u:User)-[:LOGGED]->(c:CheckIn)-[:SENSED]->(s:BodySensation) WHERE s.ownerId IS NULL
SET s:UserData:LogRecord, s.ownerId = u.id, s.id = coalesce(s.id, randomUUID()),
    s.createdAt = coalesce(s.createdAt, c.timestamp), s.schemaVersion = coalesce(s.schemaVersion, 1)
SET s.key = u.id + ':' + s.id;

// 3. The four legacy session labels (log). DEAR MAN sessions had no key.
MATCH (u:User)-[:COMPLETED_SESSION]->(s) WHERE s.ownerId IS NULL
  AND (s:OppositeActionSession OR s:InvalidationRecoverySession OR s:DearManSession OR s:FindTheFeelingSession)
SET s:UserData:LogRecord, s.ownerId = u.id, s.key = coalesce(s.key, u.id + ':' + s.id),
    s.schemaVersion = coalesce(s.schemaVersion, 1);

// 4. Tool usage (log, compat)
MATCH (u:User)-[:USED_TOOL]->(t:ToolUsage) WHERE t.ownerId IS NULL
SET t:UserData:LogRecord, t.ownerId = u.id, t.key = u.id + ':' + t.id,
    t.createdAt = coalesce(t.createdAt, t.timestamp), t.schemaVersion = coalesce(t.schemaVersion, 1);

// 5. Opposite Action plans → FollowUp oa_plan (same id as the session; status mirrors OA's own)
MATCH (u:User)-[:COMPLETED_SESSION]->(s:OppositeActionSession)
WHERE s.schemaVersion = 2 AND s.dueAt IS NOT NULL
MERGE (f:FollowUp {key: u.id + ':' + s.id})
ON CREATE SET f:UserData:LogRecord, f.id = s.id, f.ownerId = u.id, f.type = 'oa_plan', f.ownerModule = 'er',
              f.sourceToolId = 'opposite-action', f.sourceSessionId = s.id, f.priorityTier = 'quality',
              f.createdAt = s.createdAt, f.attempts = 0, f.notifyInTab = true, f.notifyPush = false,
              f.notifyIcs = false, f.backfilled = true, f.schemaVersion = 1
SET f.dueAt = s.dueAt, f.cueId = s.cueId,
    f.status = CASE s.status WHEN 'planned' THEN 'scheduled'
                 WHEN 'practiced' THEN CASE s.outcome WHEN 'partial' THEN 'partly' ELSE 'done' END
                 ELSE 'didnt' END,
    f.missedReason = CASE WHEN s.status = 'missed' THEN s.missedReason ELSE null END,
    f.outcome = CASE WHEN s.outcome IS NULL OR s.outcome = '' THEN null ELSE s.outcome END,
    f.resolvedAt = CASE WHEN s.status = 'planned' THEN null ELSE s.updatedAt END
MERGE (u)-[:HAS_FOLLOW_UP]->(f)
MERGE (f)-[:DETAIL]->(s);

// 6. Report only: check-ins with no owner (the old CREATE-before-MATCH bug). 0 live on 2026-09-30;
//    they can't be attributed, so nothing here touches them.
MATCH (c:CheckIn) WHERE NOT ()-[:LOGGED]->(c) RETURN count(c) AS orphanCheckIns;

// 7. Report: what the conventions now cover (compare run 1 and run 2: identical)
MATCH (n:UserData) UNWIND labels(n) AS label WITH label, count(*) AS n
WHERE NOT label IN ['UserData', 'LogRecord', 'ProfileItem', 'System']
RETURN label, n ORDER BY label;
