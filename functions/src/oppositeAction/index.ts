/**
 * Opposite Action: content, sessions, follow-ups.
 * Moved verbatim from the single-file functions/src/index.ts (A1-2); deploy names are the export names.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import neo4j, { Record as Neo4jRecord } from 'neo4j-driver';
import { getDriver, neo4jUri, neo4jUser, neo4jPassword } from '../shared/neo4j';
import { validateOppositeActionSession } from '../oppositeActionValidation';

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
  /** Urge-specific body cues for the somatic circuit-breaker, shown before the parent defaults. */
  somaticCues: string[];
  /** When true, ONLY the urge's cues are shown (e.g. freeze needs up-regulation, not relaxation). */
  somaticReplace: boolean;
}

interface ParentProtocol {
  label: string;
  fitsTheFactsWhen: string[];
  fitsFactsGuidance: string;
  whyItWorks: string;
  acknowledgment: string;
  bodyOpposite: string;
  defaultOpposites: { small: string; medium: string; bigger: string };
  /** Parent-level body cues for the somatic circuit-breaker (oa-guided-v2). */
  somaticCues: string[];
  urges: ActionUrgeResult[];
}

interface OppositeActionContentResult {
  flow: Record<string, unknown>;
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

    if (!Array.isArray(emotionIds) || emotionIds.length === 0 || emotionIds.length > 20 || emotionIds.some(id => typeof id !== 'string' || id.length > 100)) {
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
               c.somaticCues AS somaticCues,
               collect(DISTINCT u { .id, .label, .small, .medium, .bigger, .somaticCues, .somaticReplace }) AS urges
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
              somaticCues: Array.isArray(u.somaticCues)
                ? (u.somaticCues as unknown[]).filter((c): c is string => typeof c === 'string' && c.length > 0)
                : [],
              somaticReplace: u.somaticReplace === true,
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
            somaticCues: (record.get('somaticCues') || []).filter((c: unknown) => typeof c === 'string' && c),
            urges,
          };
        }
      }

      const flowResult = await session.run(
        "MATCH (p:OppositeActionFlow {id: 'opposite_action_flow'}) RETURN p.contentJson AS content"
      );
      const raw = flowResult.records[0]?.get('content');
      if (!raw) throw new HttpsError('failed-precondition', 'Opposite Action guided content migration is required');
      const flow = JSON.parse(raw);
      if (flow.version !== 'oa-guided-v2' || !flow.copy || !flow.choices || !flow.routes || !Array.isArray(flow.sourceIds)) {
        throw new HttpsError('failed-precondition', 'Invalid Opposite Action flow content');
      }
      return { emotions, parents, flow };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('Error getting opposite action content:', error);
      throw new HttpsError('internal', 'Failed to get opposite action content');
    } finally {
      await session.close();
    }
  }
);

const OA_SESSION_ID = /^[a-f0-9-]{36}$/i;

/** Integer 0-10 scores are stored as Neo4j integers; null stays null. */
function scoreInt(v: unknown) {
  return typeof v === 'number' && Number.isInteger(v) ? neo4j.int(v) : null;
}

function isAllowedOppositeActionTransition(from: unknown, to: string): boolean {
  if (from === undefined || from === null || from === 'planned') return true;
  if (from === 'missed') return to === 'missed' || to === 'practiced';
  if (from === 'practiced') return to === 'practiced';
  return false;
}

/**
 * Shape a saved session for the client. Scores come from the dataJson snapshot
 * (plain JSON numbers), never from the node's Neo4j integers. Returns null if
 * the snapshot cannot be parsed.
 */
export function toSavedOppositeActionSession(r: Neo4jRecord): Record<string, unknown> | null {
  let parsed: unknown;
  try { parsed = JSON.parse(r.get('dataJson')); } catch { return null; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return {
    ...(parsed as Record<string, unknown>),
    status: r.get('status'),
    createdAt: r.get('createdAt'),
    updatedAt: r.get('updatedAt'),
  };
}

const OA_SESSION_RETURN = `RETURN s.dataJson AS dataJson, toString(s.createdAt) AS createdAt,
                toString(s.updatedAt) AS updatedAt, s.status AS status`;

/** Explicit opt-in save. No LLM call; typed private evidence for future retrieval.
 * v2 follow-up reflections upsert the same session key (planned -> practiced | missed). */
export const saveOppositeActionSession = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to save');
    let data: Record<string, unknown>;
    try { data = validateOppositeActionSession(request.data); }
    catch { throw new HttpsError('invalid-argument', 'Invalid Opposite Action session'); }
    const userId = request.auth.uid;
    const key = `${userId}:${data.id}`;
    const isV2 = data.schemaVersion === 2;
    const session = getDriver().session();
    try {
      await session.executeWrite(async tx => {
        const knowledge = await tx.run(
          `MATCH (e:Emotion {id: $emotionId})-[:HAS_REGULATION_CONTENT]->(c:EmotionRegulationContent {dbtParent: $parentId})
           MATCH (p:OppositeActionFlow {id: 'opposite_action_flow', version: $contentVersion})
           OPTIONAL MATCH (c)-[:HAS_ACTION_URGE]->(urge:ActionUrge {id: $urgeId})
           WHERE e.oppositeActionApplicable = true
           RETURN e.oppositeActionApplicable AS applicable, urge.id AS urgeId, p.contentJson AS flow`,
          { emotionId: data.emotionId, parentId: data.parentId, contentVersion: data.contentVersion, urgeId: data.urgeId }
        );
        const record = knowledge.records[0];
        if (!record || !record.get('applicable') || (data.urgeId !== 'custom' && !record.get('urgeId'))) {
          throw new HttpsError('failed-precondition', 'Content changed; start a new exercise');
        }
        const flow = JSON.parse(record.get('flow'));
        if (flow.routes?.[`${data.facts}:${data.effectiveness}`] !== 'opposite') {
          throw new HttpsError('invalid-argument', 'This session does not route to opposite action');
        }

        // Status transitions: planned -> practiced | missed; missed -> practiced
        // (the user did it later). Practiced is final; nothing reverts to planned.
        const existing = await tx.run(
          `MATCH (s:OppositeActionSession {key: $key}) RETURN s.status AS status`,
          { key }
        );
        const existingStatus = existing.records[0]?.get('status');
        if (!isAllowedOppositeActionTransition(existingStatus, data.status as string)) {
          throw new HttpsError('failed-precondition', 'This exercise already has a reflection');
        }

        // Snapshot carries the latest status and the server's own sourceIds.
        const snapshot = { ...data, status: data.status, sourceIds: flow.sourceIds };
        const params = {
          userId, key, id: data.id, status: data.status, emotionId: data.emotionId,
          urgeId: data.urgeId, contentVersion: data.contentVersion, dataJson: JSON.stringify(snapshot),
          intensityBefore: scoreInt(data.intensityBefore), intensityAfter: scoreInt(data.intensityAfter),
          outcome: data.outcome ?? '',
          schemaVersion: neo4j.int(isV2 ? 2 : 1),
          urgeBefore: isV2 ? scoreInt(data.urgeBefore) : null,
          urgeAfterBody: isV2 ? scoreInt(data.urgeAfterBody) : null,
          urgeAfter: isV2 ? scoreInt(data.urgeAfter) : null,
          missedReason: isV2 ? data.missedReason ?? '' : null,
          cueId: isV2 ? data.cueId ?? '' : null,
          dueAt: isV2 && typeof data.dueAt === 'string' ? data.dueAt : '',
        };
        await tx.run(
          `MERGE (u:User {id: $userId})
           MERGE (s:OppositeActionSession {key: $key})
           ON CREATE SET s:UserData:LogRecord, s.createdAt = datetime(), s.id = $id, s.ownerId = $userId
           SET s.updatedAt = datetime(), s.status = $status, s.emotionId = $emotionId,
               s.urgeId = $urgeId, s.contentVersion = $contentVersion, s.dataJson = $dataJson,
               s.intensityBefore = $intensityBefore, s.intensityAfter = $intensityAfter,
               s.outcome = $outcome, s.schemaVersion = $schemaVersion,
               s.urgeBefore = $urgeBefore, s.urgeAfterBody = $urgeAfterBody, s.urgeAfter = $urgeAfter,
               s.missedReason = $missedReason, s.cueId = $cueId,
               s.dueAt = CASE WHEN $dueAt = '' THEN null ELSE datetime($dueAt) END
           MERGE (u)-[:COMPLETED_SESSION]->(s)
           WITH s
           OPTIONAL MATCH (s)-[old:FOCUSED_ON|TARGETED_URGE]->()
           DELETE old
           WITH DISTINCT s
           MATCH (e:Emotion {id: $emotionId})
           MERGE (s)-[:FOCUSED_ON]->(e)
           WITH s
           MATCH (p:OppositeActionFlow {id: 'opposite_action_flow'})
           MERGE (s)-[:USED_PROTOCOL]->(p)
           WITH s
           OPTIONAL MATCH (urge:ActionUrge {id: $urgeId})
           FOREACH (n IN CASE WHEN urge IS NULL THEN [] ELSE [urge] END | MERGE (s)-[:TARGETED_URGE]->(n))`,
          params
        );
      });
      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      // Do not log therapy text or request payloads.
      throw new HttpsError('internal', 'Could not save the exercise');
    } finally { await session.close(); }
  }
);

/** The signed-in user's saved guided (schemaVersion 2) sessions, newest first. */
export const getOppositeActionSessions = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to see saved exercises');
    const rawLimit = (request.data as { limit?: unknown } | null | undefined)?.limit;
    let limit = 20;
    if (rawLimit !== undefined && rawLimit !== null) {
      if (typeof rawLimit !== 'number' || !Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 50) {
        throw new HttpsError('invalid-argument', 'limit must be an integer from 1 to 50');
      }
      limit = rawLimit;
    }
    const userId = request.auth.uid;
    const session = getDriver().session();
    try {
      const result = await session.run(
        `MATCH (u:User {id: $userId})-[:COMPLETED_SESSION]->(s:OppositeActionSession)
         WHERE s.schemaVersion = 2
         ${OA_SESSION_RETURN}
         ORDER BY s.updatedAt DESC
         LIMIT $limit`,
        { userId, limit: neo4j.int(limit) }
      );
      const sessions = result.records
        .map(toSavedOppositeActionSession)
        .filter((x): x is Record<string, unknown> => x !== null);
      return { sessions };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      // Do not log therapy text.
      throw new HttpsError('internal', 'Could not load saved exercises');
    } finally { await session.close(); }
  }
);

/** One of the signed-in user's v2 sessions by id (follow-up deep links), or null. */
export const getOppositeActionSession = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to see saved exercises');
    const id = (request.data as { id?: unknown } | null | undefined)?.id;
    if (typeof id !== 'string' || !OA_SESSION_ID.test(id)) {
      throw new HttpsError('invalid-argument', 'Invalid session ID');
    }
    const userId = request.auth.uid;
    const session = getDriver().session();
    try {
      const result = await session.run(
        `MATCH (u:User {id: $userId})-[:COMPLETED_SESSION]->(s:OppositeActionSession {key: $key})
         WHERE s.schemaVersion = 2
         ${OA_SESSION_RETURN}
         LIMIT 1`,
        { userId, key: `${userId}:${id}` }
      );
      const record = result.records[0];
      return { session: record ? toSavedOppositeActionSession(record) : null };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Could not load the saved exercise');
    } finally { await session.close(); }
  }
);

const OA_FOLLOW_UP_COPY_KEYS = [
  'followUpCardDue', 'followUpCardUpcoming', 'followUpCardStale',
  'notificationBody', 'calendarTitle', 'calendarBody',
];

/**
 * Planned v2 sessions with a follow-up time (due within the last 7 days or
 * upcoming), soonest first, plus the graph copy the home card needs.
 */
export const getOppositeActionFollowUps = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to see follow-ups');
    const userId = request.auth.uid;
    const session = getDriver().session();
    try {
      const result = await session.run(
        `MATCH (u:User {id: $userId})-[:COMPLETED_SESSION]->(s:OppositeActionSession)
         WHERE s.schemaVersion = 2 AND s.status = 'planned'
           AND s.dueAt IS NOT NULL AND s.dueAt > datetime() - duration('P7D')
         ${OA_SESSION_RETURN}
         ORDER BY s.dueAt ASC
         LIMIT 10`,
        { userId }
      );
      const sessions = result.records
        .map(toSavedOppositeActionSession)
        .filter((x): x is Record<string, unknown> => x !== null);

      const copy: Record<string, string> = {};
      const flowResult = await session.run(
        "MATCH (p:OppositeActionFlow {id: 'opposite_action_flow'}) RETURN p.contentJson AS content"
      );
      const raw = flowResult.records[0]?.get('content');
      if (typeof raw === 'string') {
        try {
          const flowCopy = JSON.parse(raw)?.copy;
          if (flowCopy && typeof flowCopy === 'object') {
            for (const k of OA_FOLLOW_UP_COPY_KEYS) {
              if (typeof flowCopy[k] === 'string') copy[k] = flowCopy[k];
            }
          }
        } catch { /* tolerate malformed flow content: copy stays {} */ }
      }
      return { sessions, copy };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Could not load follow-ups');
    } finally { await session.close(); }
  }
);
