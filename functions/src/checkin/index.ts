/**
 * Check-ins: save (idempotent upsert by key), next action, list. PR-C1 (CORE-05).
 *
 * The client saves when the result renders (crisis-banner results included) and again, by the same
 * id, after "add more detail"; then records what the user did next with setCheckInNextAction.
 * A CheckIn is finalise-once (userdata/lifecycle.ts): writable until its next action is set or 2 h
 * after the result showed; after that a replayed save returns the id and changes nothing.
 */
import { randomUUID } from 'node:crypto';
import neo4j, { ManagedTransaction, Record as Neo4jRecord } from 'neo4j-driver';
import { callable } from '../shared/callable';
import { readTx, writeTx } from '../shared/neo4j';
import { invalid, parseOrInvalid } from '../shared/errors';
import { obj, uuid } from '../shared/validate';
import { GUARDS } from '../userdata/lifecycle';
import { MERGE_USER, userKey } from '../userdata/ownership';
import { readingProps } from '../capacity/reading';
import { nextActionParams, parseNextAction, validateSaveCheckIn, type CheckInNextAction } from './validation';

export interface SaveCheckInResponse { id: string }

/** Only ids that exist as Emotion nodes are kept (unknown ids are dropped, never fatal). */
async function knownEmotionIds(tx: ManagedTransaction, raw: string[]): Promise<string[]> {
  if (raw.length === 0) return [];
  const res = await tx.run(`MATCH (e:Emotion) WHERE e.id IN $raw RETURN collect(e.id) AS ids`, { raw });
  const found = new Set((res.records[0]?.get('ids') as string[] | undefined) ?? []);
  return raw.filter((id) => found.has(id));
}

/**
 * Save (upsert) a check-in. Old clients without `id` still work: the server mints one.
 * Always returns a non-empty id (F3: `UNWIND []` used to drop the row and return '').
 */
export const saveCheckIn = callable<unknown, SaveCheckInResponse>(
  { auth: 'required', label: 'saveCheckIn', errorMessage: 'Failed to save check-in' },
  async ({ uid, data, request }) => {
    const input = parseOrInvalid(() => validateSaveCheckIn(data, new Date()), 'Missing required fields');
    const id = input.id ?? randomUUID();
    const key = userKey(uid as string, id);
    const email = request.auth?.token?.email ?? null;
    await writeTx(async (tx) => {
      // 1. The user and the check-in exist (a missing User is created, never an orphan: F3/F4).
      const head = await tx.run(
        `${MERGE_USER}
         MERGE (c:CheckIn {key: $key})
         ON CREATE SET c:UserData:LogRecord, c.id = $id, c.ownerId = $uid, c.createdAt = datetime(),
                       c.timestamp = CASE WHEN $timestamp IS NULL THEN datetime() ELSE datetime($timestamp) END,
                       c.schemaVersion = 2
         MERGE (u)-[:LOGGED]->(c)
         RETURN ${GUARDS.CheckIn.upsert('c')} AS open`,
        { uid, email, key, id, timestamp: input.timestamp },
      );
      if (head.records[0]?.get('open') !== true) return; // finalised: the save is a no-op
      const emotionIds = await knownEmotionIds(tx, input.emotionIds);
      const band = readingProps('band', input.capacity);
      const next = nextActionParams(input.nextAction);
      // 2. Every result field (re-analysis overwrites them); a next-action stub keeps its next action.
      await tx.run(
        `MATCH (u:User {id: $uid})-[:LOGGED]->(c:CheckIn {key: $key})
         WITH c, c.nextActionKind IS NULL AS noNext
         SET c.emotion = $emotion, c.quadrant = $quadrant, c.intensityX = $intensityX, c.intensityY = $intensityY,
             c.note = $note, c.activationPatternId = $activationPatternId, c.confidence = $confidence,
             c.source = $source, c.emotionIds = $emotionIds,
             c.discQuestionIds = $discQuestionIds, c.discResponseIds = $discResponseIds,
             c.recommendedToolIds = $recommendedToolIds, c.secondaryPatternId = $secondaryPatternId,
             c.routingVersion = $routingVersion, c.routingBand = $routingBand, c.routingBandSource = $routingBandSource,
             c.coOccurrenceLabel = $coOccurrenceLabel, c.guidedActivityId = $guidedActivityId,
             c.safetyFlagId = $safetyFlagId, c.embeddedToolSessionIds = $embeddedIds,
             c.resultShownAt = CASE WHEN $resultShown THEN coalesce(c.resultShownAt, datetime()) ELSE c.resultShownAt END,
             c.nextActionKind = CASE WHEN noNext THEN $nextKind ELSE c.nextActionKind END,
             c.nextActionToolId = CASE WHEN noNext THEN $nextToolId ELSE c.nextActionToolId END,
             c.nextActionAt = CASE WHEN noNext AND $nextKind IS NOT NULL THEN datetime() ELSE c.nextActionAt END,
             c.updatedAt = datetime()
         FOREACH (_ IN CASE WHEN $band IS NULL THEN [] ELSE [1] END |
           SET c.band = $band, c.bandSource = $bandSource, c.bandViaCantTell = $bandViaCantTell,
               c.bandAt = datetime($bandAt), c.bandJson = $bandJson)
         REMOVE c.pendingFullSave
         WITH c
         OPTIONAL MATCH (c)-[oldp:MATCHED_PATTERN]->()
         DELETE oldp
         WITH DISTINCT c
         OPTIONAL MATCH (ap:ActivationPattern {id: $activationPatternId})
         FOREACH (x IN CASE WHEN ap IS NULL THEN [] ELSE [ap] END | MERGE (c)-[:MATCHED_PATTERN]->(x))
         WITH DISTINCT c
         OPTIONAL MATCH (c)-[:SENSED]->(old:BodySensation)
         DETACH DELETE old
         WITH DISTINCT c
         FOREACH (s IN $bodySensations |
           CREATE (b:BodySensation:UserData:LogRecord {id: s.id, key: $uid + ':' + s.id, ownerId: $uid,
                   createdAt: datetime(), schemaVersion: 1, x: s.x, y: s.y, region: s.region,
                   intensityX: s.intensityX, intensityY: s.intensityY, tags: s.tags,
                   side: s.side, sensationIds: s.sensationIds, strength: s.strength, fromMirror: s.fromMirror})
           MERGE (c)-[:SENSED]->(b))
         WITH DISTINCT c
         OPTIONAL MATCH (:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession) WHERE ts.key IN $embeddedKeys
         FOREACH (x IN CASE WHEN ts IS NULL THEN [] ELSE [ts] END | MERGE (c)-[:EMBEDDED]->(x))
         // Tool sessions opened from this result before this save landed (they carry its id): link
         // them and their compat usage now. Either side may commit first (Codex, PR #16).
         WITH DISTINCT c
         OPTIONAL MATCH (:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts2:ToolSession {checkInId: $id})
           WHERE NOT (ts2)-[:FROM_CHECKIN]->()
         FOREACH (x IN CASE WHEN ts2 IS NULL THEN [] ELSE [ts2] END | MERGE (x)-[:FROM_CHECKIN]->(c))
         WITH DISTINCT c
         OPTIONAL MATCH (:User {id: $uid})-[:HAS_TOOL_SESSION]->(:ToolSession {checkInId: $id})-[:COMPAT_USAGE]->(tu:ToolUsage)
           WHERE NOT (tu)-[:FOLLOWED_CHECKIN]->()
         FOREACH (x IN CASE WHEN tu IS NULL THEN [] ELSE [tu] END | MERGE (x)-[:FOLLOWED_CHECKIN]->(c))`,
        {
          uid, key,
          emotion: input.emotion, quadrant: input.quadrant, intensityX: input.intensityX, intensityY: input.intensityY,
          note: input.note, activationPatternId: input.activationPatternId, confidence: input.confidence,
          source: input.source, emotionIds,
          discQuestionIds: input.discQuestionIds, discResponseIds: input.discResponseIds,
          recommendedToolIds: input.recommendedToolIds, secondaryPatternId: input.secondaryPatternId,
          routingVersion: input.routingVersion, routingBand: input.routingBand, routingBandSource: input.routingBandSource,
          coOccurrenceLabel: input.coOccurrenceLabel, guidedActivityId: input.guidedActivityId,
          safetyFlagId: input.safetyFlagId, resultShown: input.resultShown,
          ...next,
          ...band,
          bodySensations: input.bodySensations.map((s) => ({ ...s, id: randomUUID() })),
          embeddedKeys: input.embeddedToolSessionIds.map((t) => userKey(uid as string, t)),
          embeddedIds: input.embeddedToolSessionIds, id,
        },
      );
    });
    return { id };
  },
);

export interface SetCheckInNextActionResponse { ok: true }

/**
 * What the user did after the result: a tool, a micro-step, a guided activity (or its early exit),
 * or Done. The first next action is the terminal event (finalise-once). A MERGE, so it can't lose
 * a race with the render save: a stub (pendingFullSave) waits for the full save to fill it.
 */
export const setCheckInNextAction = callable<unknown, SetCheckInNextActionResponse>(
  { auth: 'required', label: 'setCheckInNextAction', errorMessage: 'Could not save that' },
  async ({ uid, data, request }) => {
    const d = obj(data);
    const checkInId = parseOrInvalid(() => uuid(d.checkInId), 'Invalid check-in');
    const action: CheckInNextAction | null = parseNextAction(d.nextAction);
    if (!action) throw invalid('Invalid next action');
    const { nextKind, nextToolId } = nextActionParams(action);
    const email = request.auth?.token?.email ?? null;
    await writeTx((tx) => tx.run(
      `${MERGE_USER}
       MERGE (c:CheckIn {key: $key})
       ON CREATE SET c:UserData:LogRecord, c.id = $id, c.ownerId = $uid, c.createdAt = datetime(),
                     c.timestamp = datetime(), c.schemaVersion = 2, c.pendingFullSave = true
       MERGE (u)-[:LOGGED]->(c)
       WITH c
       WHERE ${GUARDS.CheckIn.upsert('c')} AND c.nextActionKind IS NULL
       SET c.nextActionKind = $nextKind, c.nextActionToolId = $nextToolId, c.nextActionAt = datetime(),
           c.updatedAt = datetime()`,
      { uid, email, key: userKey(uid as string, checkInId), id: checkInId, nextKind, nextToolId },
    ));
    return { ok: true };
  },
);

/**
 * Get check-ins for the authenticated user (next-action stubs without a full save are skipped).
 */
export const getCheckInsByUser = callable<unknown, { checkIns: unknown[] }>(
  { auth: 'required', label: 'getCheckInsByUser', errorMessage: 'Failed to fetch check-ins' },
  async ({ uid, data }) => {
    const raw = (data as { limit?: unknown } | null | undefined)?.limit;
    const limit = typeof raw === 'number' && Number.isInteger(raw) && raw > 0 && raw <= 500 ? raw : 50;
    const result = await readTx((tx) => tx.run(
      `MATCH (u:User {id: $uid})-[:LOGGED]->(c:CheckIn)
       WHERE c.quadrant IS NOT NULL
       OPTIONAL MATCH (c)-[:SENSED]->(s:BodySensation)
       WITH c, collect(s) AS sensations
       ORDER BY c.timestamp DESC
       LIMIT $limit
       RETURN c {
         .id, .emotion, .quadrant, .note, .activationPatternId, .confidence,
         .emotionIds, .source, .band, .nextActionKind, .nextActionToolId,
         timestamp: toString(c.timestamp),
         intensity: {x: c.intensityX, y: c.intensityY}
       } AS checkIn,
       [s IN sensations | {x: s.x, y: s.y, region: s.region, side: s.side, tags: s.tags,
         sensationIds: coalesce(s.sensationIds, []), strength: s.strength, fromMirror: coalesce(s.fromMirror, false),
         intensity: {x: s.intensityX, y: s.intensityY}}] AS bodySensations`,
      { uid, limit: neo4j.int(limit) },
    ));
    const checkIns = result.records.map((record: Neo4jRecord) => {
      const c = record.get('checkIn');
      return {
        id: c.id,
        userId: uid,
        emotion: c.emotion,
        quadrant: c.quadrant,
        intensity: c.intensity,
        bodySensations: record.get('bodySensations') || [],
        note: c.note,
        timestamp: c.timestamp,
        activationPatternId: c.activationPatternId || null,
        confidence: c.confidence ?? null,
        emotionIds: c.emotionIds ?? [],
        source: c.source ?? null,
        band: c.band ?? null,
        nextAction: c.nextActionKind ? { kind: c.nextActionKind, toolId: c.nextActionToolId ?? null } : null,
      };
    });
    return { checkIns };
  },
);
