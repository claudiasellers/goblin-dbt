/**
 * Recover from a hurtful moment: content, sessions, progress.
 * Moved verbatim from the single-file functions/src/index.ts (A1-2); deploy names are the export names.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import neo4j from 'neo4j-driver';
import { getDriver } from '../shared/neo4j';
import { int } from '../shared/values';
import { validateInvalidationRecoverySession, expectedRecoveryGate, type RecoveryGates } from '../invalidationRecoveryValidation';
import { CALL_OPTS } from '../shared/callOptions';

// ============================================
// INVALIDATION RECOVERY ("Recover from a hurtful moment", Walking the Middle Path) — recovery-v1
// Content lives in schema/invalidation-recovery.cypher. The client owns only
// presentation and the pure gate/routing functions, which read thresholds
// from the flow document returned here.
// ============================================

const RECOVERY_FLOW_VERSION = 'recovery-v1';

interface RecoveryFlowDoc {
  version: string;
  gates: RecoveryGates;
  pulls: { id: string }[];
  copy: { follow: { options: { id: string }[] } };
}

function parseRecoveryFlow(raw: unknown): RecoveryFlowDoc {
  let flow: RecoveryFlowDoc | null = null;
  try { flow = typeof raw === 'string' ? JSON.parse(raw) : null; } catch { flow = null; }
  if (!flow || flow.version !== RECOVERY_FLOW_VERSION || !flow.gates || !Array.isArray(flow.pulls) || !Array.isArray(flow.copy?.follow?.options)) {
    throw new HttpsError('failed-precondition', 'Invalid invalidation recovery flow content');
  }
  return flow;
}

/** All content for the flow in one call. Public therapeutic content (same as OA / DEAR MAN). */
export const getInvalidationRecoveryContent = onCall(
  CALL_OPTS,
  async () => {
    const session = getDriver().session({ defaultAccessMode: neo4j.session.READ });
    try {
      // One read transaction; queries run sequentially (a session can't run concurrent transactions).
      const [flowRes, stateRes, protoRes, needRes, exitRes, skillRes] = await session.executeRead(async tx => [
        await tx.run(
          `MATCH (f:InvalidationRecoveryFlow {id: 'invalidation_recovery_flow'})
           RETURN f.version AS version, f.contentJson AS content`),
        await tx.run(
          `MATCH (w:InvalidationEvent)-[:HAS_PROTOCOL {primary: true}]->(p:RecoveryProtocol)
           WITH w, collect(p.id)[0] AS protocol
           OPTIONAL MATCH (w)-[:HAS_PROTOCOL {primary: false}]->(p2:RecoveryProtocol)
           WITH w, protocol, collect(p2.id)[0] AS secondaryProtocol
           OPTIONAL MATCH (w)-[of:OFTEN_FEELS]->(e:Emotion)
           WITH w, protocol, secondaryProtocol,
                collect({id: e.id, name: coalesce(e.name, e.id), rank: of.rank}) AS emotions
           OPTIONAL MATCH (w)-[:SIGNALS]->(a:ActivationPattern)
           RETURN w { .id, .label, .phrase, .covers, .highRisk, .lowArousal } AS state, w.order AS ord,
                  protocol, secondaryProtocol, emotions, collect(DISTINCT a.id) AS patterns
           ORDER BY ord`),
        await tx.run(
          `MATCH (p:RecoveryProtocol) RETURN p.id AS id, p.label AS label, p.validationLines AS lines`),
        await tx.run(
          `MATCH (n:UnmetNeed)-[:THREATENS]->(s:SocialNeed)
           RETURN n { .id, .label } AS need, s { .id, .elsewhereTitle, .elsewhereAct, .practiceSkill } AS social,
                  n.order AS ord
           ORDER BY ord`),
        await tx.run(
          `MATCH (x:RecoveryExit) RETURN x { .id, .title, .sub, .chaseSub } AS exit, x.order AS ord ORDER BY ord`),
        await tx.run(
          `MATCH (k:PracticeSkill)
           OPTIONAL MATCH (k)-[:SUPPORTED_BY]->(s:ClinicalSource)
           WITH k, collect(s { .id, .title, .url }) AS sources
           RETURN k { .id, .name, .evidenceGrade, .evidenceBasis, .family, .why, sources: sources } AS skill,
                  k.order AS ord
           ORDER BY ord`),
      ]);

      const flowRecord = flowRes.records[0];
      if (!flowRecord || flowRecord.get('version') !== RECOVERY_FLOW_VERSION) {
        throw new HttpsError('failed-precondition', 'Interpersonal wound content migration is required');
      }
      const flow = parseRecoveryFlow(flowRecord.get('content'));

      const states = stateRes.records.map(r => ({
        ...r.get('state'),
        protocol: r.get('protocol'),
        secondaryProtocol: r.get('secondaryProtocol') ?? null,
        emotions: (r.get('emotions') as { id: string | null; name: string; rank: unknown }[])
          .filter(e => e.id)
          .sort((a, b) => int(a.rank) - int(b.rank))
          .map(({ id, name }) => ({ id, name })),
        patterns: r.get('patterns'),
      }));
      const protocols = Object.fromEntries(protoRes.records.map(r => [
        r.get('id'), { label: r.get('label'), validationLines: r.get('lines') ?? [] },
      ]));
      const needs = needRes.records.map(r => ({ ...r.get('need'), social: r.get('social').id }));
      const social = Object.fromEntries(needRes.records.map(r => {
        const s = r.get('social');
        return [s.id, { title: s.elsewhereTitle, act: s.elsewhereAct, skill: s.practiceSkill }];
      }));
      const exits = exitRes.records.map(r => r.get('exit'));
      const skills = skillRes.records.map(r => r.get('skill'));

      if (!states.length || !needs.length || !exits.length) {
        throw new HttpsError('failed-precondition', 'Interpersonal wound content is incomplete');
      }
      return { version: RECOVERY_FLOW_VERSION, flow, states, protocols, needs, social, exits, skills };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('Error getting invalidation recovery content:', error);
      throw new HttpsError('internal', 'Failed to get invalidation recovery content');
    } finally {
      await session.close();
    }
  }
);

/** Explicit save at the end of a session. Ids and clinical gates are verified against the graph; no free text is stored. */
export const saveInvalidationRecoverySession = onCall(
  CALL_OPTS,
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to save');
    let data: ReturnType<typeof validateInvalidationRecoverySession>;
    try { data = validateInvalidationRecoverySession(request.data); }
    catch { throw new HttpsError('invalid-argument', 'Invalid session'); }
    const userId = request.auth.uid;
    const key = `${userId}:${data.id}`;
    const session = getDriver().session();
    try {
      await session.executeWrite(async tx => {
        // Every id must exist at the flow version the client used. Any Emotion node is accepted
        // (curated chips plus "add your own"), not only the state's OFTEN_FEELS emotions.
        const check = await tx.run(
          `MATCH (f:InvalidationRecoveryFlow {id: 'invalidation_recovery_flow', version: $contentVersion})
           MATCH (w:InvalidationEvent {id: $stateId})
           MATCH (:Emotion {id: $emotionId})
           MATCH (:UnmetNeed {id: $needId})
           MATCH (:RecoveryExit {id: $exitId})
           OPTIONAL MATCH (k:PracticeSkill) WHERE k.id IN $skills
           RETURN f.contentJson AS flow, w.highRisk AS highRisk, w.lowArousal AS lowArousal,
                  count(DISTINCT k) AS knownSkills`,
          {
            contentVersion: data.contentVersion, stateId: data.stateId, emotionId: data.emotionId,
            needId: data.needId, exitId: data.exitId, skills: data.skills,
          }
        );
        const rec = check.records[0];
        if (!rec || int(rec.get('knownSkills')) !== data.skills.length) {
          throw new HttpsError('failed-precondition', 'Content changed; start a new exercise');
        }
        const flow = parseRecoveryFlow(rec.get('flow'));
        const followIds = flow.copy.follow.options.map(o => o.id);
        if (!flow.pulls.some(p => p.id === data.pull) || data.followUps.some(f => !followIds.includes(f))) {
          throw new HttpsError('invalid-argument', 'Invalid session');
        }
        // The same clinical gates the client applies, from the same thresholds.
        const expectedGate = expectedRecoveryGate(
          data.startIntensity, data.pull,
          { highRisk: rec.get('highRisk') === true, lowArousal: rec.get('lowArousal') === true },
          flow.gates,
        );
        const ratingBeforeExit = data.readings[data.readings.length - 2];
        const askTooHot = data.exitId === 'ask' && ratingBeforeExit > flow.gates.askMax;
        const askDeliberate = data.exitId === 'ask' && data.zone === 'real' && rec.get('highRisk') === true;
        if (data.gate !== expectedGate || askTooHot || askDeliberate) {
          throw new HttpsError('invalid-argument', 'Session does not match the protocol');
        }

        const written = await tx.run(
          `MATCH (f:InvalidationRecoveryFlow {id: 'invalidation_recovery_flow'}),
                 (w:InvalidationEvent {id: $stateId}), (e:Emotion {id: $emotionId}),
                 (n:UnmetNeed {id: $needId}), (x:RecoveryExit {id: $exitId})
           MERGE (u:User {id: $userId})
           CREATE (s:InvalidationRecoverySession {key: $key})
           SET s:UserData:LogRecord, s.id = $id, s.ownerId = $userId, s.schemaVersion = 1,
               s.createdAt = datetime(), s.contentVersion = $contentVersion,
               s.stateId = $stateId, s.exitId = $exitId, s.pull = $pull, s.gate = $gate,
               s.startIntensity = $startIntensity, s.endIntensity = $endIntensity,
               s.startUrge = $startUrge, s.endUrge = $endUrge,
               s.skills = $skills, s.dataJson = $dataJson
           CREATE (u)-[:COMPLETED_SESSION]->(s),
                  (s)-[:ABOUT]->(w), (s)-[:FOCUSED_ON]->(e), (s)-[:NAMED_NEED]->(n),
                  (s)-[:TOOK_EXIT]->(x), (s)-[:USED_PROTOCOL]->(f)
           WITH s
           OPTIONAL MATCH (k:PracticeSkill) WHERE k.id IN $skills
           FOREACH (kk IN CASE WHEN k IS NULL THEN [] ELSE [k] END | CREATE (s)-[:PRACTICED]->(kk))
           RETURN count(DISTINCT s) AS created`,
          {
            userId, key, id: data.id, contentVersion: data.contentVersion,
            stateId: data.stateId, emotionId: data.emotionId, needId: data.needId, exitId: data.exitId,
            pull: data.pull, gate: data.gate,
            startIntensity: neo4j.int(data.startIntensity), endIntensity: neo4j.int(data.endIntensity),
            startUrge: neo4j.int(data.startUrge), endUrge: neo4j.int(data.endUrge),
            skills: data.skills, dataJson: JSON.stringify(data),
          }
        );
        // All targets are matched before anything is created, so this is 1 or nothing was written.
        if (int(written.records[0]?.get('created')) !== 1) {
          throw new HttpsError('failed-precondition', 'Content changed; start a new exercise');
        }
      });
      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      const code = (error as { code?: string })?.code;
      // A double tap or retry races the uniqueness constraint on key: the first save won.
      if (code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
        throw new HttpsError('already-exists', 'This session is already saved');
      }
      console.error('saveInvalidationRecoverySession failed', code ?? 'unknown'); // error code only, never the payload
      throw new HttpsError('internal', 'Could not save the exercise');
    } finally { await session.close(); }
  }
);

/** Practice view: recent sessions plus skill-use counts (mastery levels are computed client-side). */
export const getInvalidationRecoveryProgress = onCall(
  CALL_OPTS,
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to see your practice');
    const userId = request.auth.uid;
    const session = getDriver().session({ defaultAccessMode: neo4j.session.READ });
    try {
      const [recent, uses] = await session.executeRead(async tx => [
        await tx.run(
          `MATCH (:User {id: $userId})-[:COMPLETED_SESSION]->(s:InvalidationRecoverySession)
           RETURN s.dataJson AS dataJson, toString(s.createdAt) AS createdAt
           ORDER BY s.createdAt DESC LIMIT 30`, { userId }),
        await tx.run(
          `MATCH (:User {id: $userId})-[:COMPLETED_SESSION]->(:InvalidationRecoverySession)-[:PRACTICED]->(k:PracticeSkill)
           RETURN k.id AS id, count(*) AS uses`, { userId }),
      ]);
      const sessions = recent.records.flatMap(r => {
        try { return [{ ...JSON.parse(r.get('dataJson')), createdAt: r.get('createdAt') }]; }
        catch { return []; }
      });
      const skillUses = Object.fromEntries(uses.records.map(r => [r.get('id'), int(r.get('uses'))]));
      return { sessions, skillUses };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('getInvalidationRecoveryProgress failed', (error as { code?: string })?.code ?? 'unknown');
      throw new HttpsError('internal', 'Could not load practice');
    } finally { await session.close(); }
  }
);
