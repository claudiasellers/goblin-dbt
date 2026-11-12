/**
 * DEAR MAN: content, sessions, debrief, reflection.
 * Moved verbatim from the single-file functions/src/index.ts (A1-2); deploy names are the export names.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import neo4j, { Record as Neo4jRecord } from 'neo4j-driver';
import { getDriver } from '../shared/neo4j';
import { toNumber } from '../shared/values';
import { CALL_OPTS } from '../shared/callOptions';
import { personRoute, storedRisk } from '../safety/personSafety';

// ============================================
// DEAR MAN CONTENT + SESSION
// ============================================

/**
 * Get all DEAR MAN content from the graph in one call.
 * No auth required — this is public therapeutic content (same as OA).
 */
export const getDearManContent = onCall(
  CALL_OPTS,
  async () => {
    interface DearManSafetyGatesResult {
      gates: { downshiftAt: number; askMax: number; waitMinutes: number; [k: string]: number };
      waitCopy: Record<string, string>;
      breatheCopy: Record<string, unknown>;
    }

    /**
     * Pull the arousal gates + shared wait/breathe copy out of the recovery flow document.
     * Returns null (gates skipped in the UI) when the node is absent or its JSON is unusable.
     */
    function parseDearManSafetyGates(raw: unknown): DearManSafetyGatesResult | null {
      if (typeof raw !== 'string' || !raw) return null;
      try {
        const flow = JSON.parse(raw);
        const g = flow?.gates;
        const wait = flow?.copy?.wait;
        const breathe = flow?.copy?.breathe;
        const nums = ['downshiftAt', 'askMax', 'waitMinutes'];
        if (!g || typeof g !== 'object' || !nums.every(k => typeof g[k] === 'number' && Number.isFinite(g[k]))) return null;
        if (!wait || typeof wait !== 'object' || !breathe || typeof breathe !== 'object'
          || !Array.isArray(breathe.phases) || typeof breathe.cycles !== 'number') return null;
        const gates = Object.fromEntries(
          Object.entries(g).filter((e): e is [string, number] => typeof e[1] === 'number')
        ) as DearManSafetyGatesResult['gates'];
        return { gates, waitCopy: wait, breatheCopy: breathe };
      } catch {
        return null;
      }
    }

    const session = getDriver().session();
    try {
      // 1. Situation types
      const sitResult = await session.run(`
        MATCH (s:DearManSituationType)
        RETURN s.id AS id, s.label AS label, s.sublabel AS sublabel,
               s.emoji AS emoji, s.sortOrder AS sortOrder,
               s.mirrorText AS mirrorText, s.typicalFeelingIds AS typicalFeelingIds
        ORDER BY s.sortOrder
      `);

      // 2. Describe options with situation type (+ mirroring text)
      const descResult = await session.run(`
        MATCH (d:DearManDescribeOption)-[:FOR_SITUATION]->(s:DearManSituationType)
        RETURN d.id AS id, d.label AS label, d.sortOrder AS sortOrder,
               s.id AS situationId,
               d.mirrorText AS mirrorText, d.typicalFeelingIds AS typicalFeelingIds
        ORDER BY d.sortOrder
      `);

      // 3. Assert options with situation type (+ elaboration prompt)
      const assertResult = await session.run(`
        MATCH (a:DearManAssertOption)-[:FOR_SITUATION]->(s:DearManSituationType)
        RETURN a.id AS id, a.label AS label, a.hasPlaceholder AS hasPlaceholder,
               a.sortOrder AS sortOrder, s.id AS situationId,
               a.elaboratePrompt AS elaboratePrompt
        ORDER BY a.sortOrder
      `);

      // 4. Reinforce options
      const reinfResult = await session.run(`
        MATCH (r:DearManReinforceOption)
        RETURN r.id AS id, r.label AS label, r.sortOrder AS sortOrder
        ORDER BY r.sortOrder
      `);

      // 5. Barriers + coaching
      const barrierResult = await session.run(`
        MATCH (b:DearManBarrier)
        OPTIONAL MATCH (c:DearManBarrierCoaching)-[:ADDRESSES]->(b)
        RETURN b.id AS barrierId, b.label AS barrierLabel,
               c.id AS coachingId, c.title AS coachingTitle, c.body AS coachingBody
      `);

      // 6. Default coaching
      const defaultCoachResult = await session.run(`
        MATCH (c:DearManBarrierCoaching {isDefault: true})
        RETURN c.title AS title, c.body AS body
      `);

      // 7. Anchor phrases (tagged by need + barrier for the generator)
      const anchorResult = await session.run(`
        MATCH (a:DearManAnchorPhrase)
        RETURN a.id AS id, a.label AS label,
               a.needIds AS needIds, a.barrierIds AS barrierIds
        ORDER BY a.sortOrder
      `);

      // 7b. Anchor needs ("what do you need to hear when it gets hard?")
      const needResult = await session.run(`
        MATCH (n:DearManAnchorNeed)
        RETURN n.id AS id, n.label AS label, n.barrierIds AS barrierIds
        ORDER BY n.sortOrder
      `);

      // 8. Negotiate options
      const negResult = await session.run(`
        MATCH (n:DearManNegotiateOption)
        RETURN n.id AS id, n.label AS label, n.type AS type
        ORDER BY n.sortOrder
      `);

      // 9. Feeling chips (+ color-coded group)
      const feelResult = await session.run(`
        MATCH (f:DearManFeelingChip)
        OPTIONAL MATCH (f)-[:IN_GROUP]->(g:DearManFeelingGroup)
        RETURN f.id AS id, f.label AS label, g.id AS groupId
        ORDER BY f.sortOrder
      `);

      // 9b. Feeling groups
      const groupResult = await session.run(`
        MATCH (g:DearManFeelingGroup)
        RETURN g.id AS id, g.label AS label, g.colorKey AS colorKey
        ORDER BY g.sortOrder
      `);

      // 10. Step insights
      const insightResult = await session.run(`
        MATCH (i:DearManStepInsight)
        RETURN i.step AS step, i.text AS text
      `);

      // 11. Debrief options
      const debriefResult = await session.run(`
        MATCH (d:DearManDebriefOption)
        RETURN d.id AS id, d.label AS label, d.type AS type
        ORDER BY d.sortOrder
      `);

      // 12. Reveal text + coaching from TherapyConcept
      const tcResult = await session.run(`
        MATCH (tc:TherapyConcept {id: 'dbt_dear_man'})
        RETURN tc.revealText AS revealText,
               tc.confidentCoaching AS confidentCoaching,
               tc.confidentBarrierNoRight AS confidentBarrierNoRight,
               tc.assertBarrierGuilty AS assertBarrierGuilty,
               tc.negotiateHintObjective AS hintObjective,
               tc.negotiateHintRelationship AS hintRelationship,
               tc.negotiateHintSelfRespect AS hintSelfRespect,
               tc.anchorGeneratorIntro AS anchorGeneratorIntro,
               tc.anchorGeneratorMakeItYours AS anchorGeneratorMakeItYours
      `);

      // 13. DEPRECATED (A4-4): DEAR MAN gates on the capacity band now (BandRule dear-man:*, read
      //     client-side from getCapacityContent). `safetyGates` (Recover's numeric thresholds +
      //     wait/breathe copy) is still returned for one release so cached PWA clients keep working;
      //     WMP-02 removes it with Recover's own move to bands. OPTIONAL MATCH: an older graph loads.
      const gateResult = await session.run(`
        OPTIONAL MATCH (f:InvalidationRecoveryFlow {id: 'invalidation_recovery_flow'})
        RETURN f.contentJson AS content
      `);

      // 14. DEAR MAN-specific safety copy (schema/dear-man-safety-gates.cypher)
      const safetyCopyResult = await session.run(`
        OPTIONAL MATCH (c:DearManSafetyCopy {id: 'dear_man_safety_copy'})
        RETURN c { .* } AS copy
      `);

      // 15. Appear confident: body and voice cues for the plan card (IE-B2, schema/dear-man-content.cypher §12)
      const cueResult = await session.run(`
        MATCH (c:ConfidenceCue)-[:IMPLEMENTS]->(:TherapyConcept {id: 'dbt_dear_man'})
        RETURN c.id AS id, c.label AS label, c.kind AS kind ORDER BY c.sortOrder
      `);

      // --- Shape the response ---

      const situationTypes = sitResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        sublabel: r.get('sublabel'),
        emoji: r.get('emoji'),
        sortOrder: toNumber(r.get('sortOrder')) ?? 0,
        mirrorText: r.get('mirrorText') ?? '',
        typicalFeelingIds: (r.get('typicalFeelingIds') as string[] | null) ?? [],
      }));

      const describeOptions: Record<string, Array<{ id: string; label: string; sortOrder: number; mirrorText: string; typicalFeelingIds: string[] }>> = {};
      for (const r of descResult.records) {
        const sitId = r.get('situationId');
        if (!describeOptions[sitId]) describeOptions[sitId] = [];
        describeOptions[sitId].push({
          id: r.get('id'),
          label: r.get('label'),
          sortOrder: toNumber(r.get('sortOrder')) ?? 0,
          mirrorText: r.get('mirrorText') ?? '',
          typicalFeelingIds: (r.get('typicalFeelingIds') as string[] | null) ?? [],
        });
      }

      const assertOptions: Record<string, Array<{ id: string; label: string; hasPlaceholder: boolean; sortOrder: number; elaboratePrompt: string }>> = {};
      for (const r of assertResult.records) {
        const sitId = r.get('situationId');
        if (!assertOptions[sitId]) assertOptions[sitId] = [];
        assertOptions[sitId].push({
          id: r.get('id'),
          label: r.get('label'),
          hasPlaceholder: r.get('hasPlaceholder') ?? false,
          sortOrder: toNumber(r.get('sortOrder')) ?? 0,
          elaboratePrompt: r.get('elaboratePrompt') ?? '',
        });
      }

      const reinforceOptions = reinfResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        sortOrder: toNumber(r.get('sortOrder')) ?? 0,
      }));

      const barriers: Array<{ id: string; label: string }> = [];
      const barrierCoaching: Record<string, { title: string; body: string }> = {};
      const seenBarriers = new Set<string>();
      for (const r of barrierResult.records) {
        const bid = r.get('barrierId');
        if (!seenBarriers.has(bid)) {
          seenBarriers.add(bid);
          barriers.push({ id: bid, label: r.get('barrierLabel') });
        }
        if (r.get('coachingId')) {
          barrierCoaching[bid] = {
            title: r.get('coachingTitle'),
            body: r.get('coachingBody'),
          };
        }
      }

      const defaultCoachRec = defaultCoachResult.records[0];
      const defaultCoaching = {
        title: defaultCoachRec?.get('title') ?? 'Staying present',
        body: defaultCoachRec?.get('body') ?? '',
      };

      const anchorPhrases = anchorResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        needIds: (r.get('needIds') as string[] | null) ?? [],
        barrierIds: (r.get('barrierIds') as string[] | null) ?? [],
      }));

      const anchorNeeds = needResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        barrierIds: (r.get('barrierIds') as string[] | null) ?? [],
      }));

      const middleGround: Array<{ id: string; label: string }> = [];
      const walkAway: Array<{ id: string; label: string }> = [];
      for (const r of negResult.records) {
        const item = { id: r.get('id'), label: r.get('label') };
        if (r.get('type') === 'middle_ground') middleGround.push(item);
        else walkAway.push(item);
      }

      const feelingChips = feelResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        groupId: r.get('groupId') ?? null,
      }));

      const feelingGroups = groupResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        colorKey: r.get('colorKey') ?? 'neutral',
      }));

      const stepInsights: Record<string, string> = {};
      for (const r of insightResult.records) {
        stepInsights[r.get('step')] = r.get('text');
      }

      const wentWell: Array<{ id: string; label: string }> = [];
      const toChange: Array<{ id: string; label: string }> = [];
      for (const r of debriefResult.records) {
        const item = { id: r.get('id'), label: r.get('label') };
        if (r.get('type') === 'went_well') wentWell.push(item);
        else toChange.push(item);
      }

      const tc = tcResult.records[0];

      const safetyGates = parseDearManSafetyGates(gateResult.records[0]?.get('content'));
      const rawSafetyCopy = safetyCopyResult.records[0]?.get('copy') as Record<string, unknown> | null | undefined;
      const safetyCopy: Record<string, string> | null = rawSafetyCopy
        ? Object.fromEntries(Object.entries(rawSafetyCopy).filter((e): e is [string, string] => typeof e[1] === 'string'))
        : null;

      return {
        situationTypes,
        describeOptions,
        assertOptions,
        reinforceOptions,
        barriers,
        barrierCoaching,
        defaultCoaching,
        anchorPhrases,
        anchorNeeds,
        anchorGeneratorIntro: tc?.get('anchorGeneratorIntro') ?? '',
        anchorGeneratorMakeItYours: tc?.get('anchorGeneratorMakeItYours') ?? '',
        negotiateOptions: { middleGround, walkAway },
        negotiateHints: {
          objective: tc?.get('hintObjective') ?? '',
          relationship: tc?.get('hintRelationship') ?? '',
          'self-respect': tc?.get('hintSelfRespect') ?? '',
        },
        feelingChips,
        feelingGroups,
        stepInsights,
        debriefOptions: { wentWell, toChange },
        revealText: tc?.get('revealText') ?? '',
        confidentCoaching: tc?.get('confidentCoaching') ?? '',
        confidentBarrierNoRight: tc?.get('confidentBarrierNoRight') ?? '',
        assertBarrierGuilty: tc?.get('assertBarrierGuilty') ?? '',
        safetyGates,
        safetyCopy,
        confidenceCues: cueResult.records.map((r: Neo4jRecord) => ({ id: String(r.get('id')), label: String(r.get('label')), kind: String(r.get('kind')) })),
      };
    } catch (error) {
      console.error('Error fetching DEAR MAN content:', error);
      throw new HttpsError('internal', 'Failed to fetch DEAR MAN content');
    } finally {
      await session.close();
    }
  }
);

interface DearManSessionData {
  type: 'prep' | 'debrief';
  relationshipType: string;
  situationType: string;
  priorities: string[];
  barriers: string[];
  barriersCustom?: string;
  describeId: string | null;
  describeCustom: string;
  feelings: string[];
  assertId: string | null;
  assertIds?: string[];
  assertDetails?: Record<string, string>;
  assertCustom: string;
  reinforceIds: string[];
  anchorPhrase: string;
  middleGroundId: string | null;
  middleGroundCustom: string;
  walkAwayId: string | null;
  walkAwayCustom: string;
  debriefOverall?: string;
  debriefWentWell?: string[];
  debriefToChange?: string[];
  debriefCurrentFeelings?: string[];
  turningPointIds?: string[];
  momentResponseIds?: string[];
  bodySignalIds?: string[];
  thoughtPatternIds?: string[];
  underneathIds?: string[];
  copeAheadId?: string;
  reflectionLanded?: 'yes' | 'sort_of' | 'not_really';
  /** IE-03: the person picked (the caller's own Person id), or null / absent. */
  personId?: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const saveDearManSession = onCall(
  CALL_OPTS,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const data = request.data as DearManSessionData;

    // IE-03 / D4: a plan with someone on the safety route is refused here as well as never offered on screen
    // (plan C6.6). An id that isn't the caller's own person is simply not linked.
    const personId = typeof data.personId === 'string' && UUID.test(data.personId) ? data.personId : null;
    const personKey = personId ? `${userId}:${personId}` : null;

    const session = getDriver().session();
    try {
      if (personKey && data.type === 'prep') {
        const p = await session.run(
          `MATCH (:User {id: $userId})-[:HAS_PERSON]->(p:Person {key: $personKey}) RETURN p.valueJson AS v`,
          { userId, personKey },
        );
        if (p.records.length && personRoute(storedRisk(p.records[0].get('v'))) === 'safety') {
          throw new HttpsError('failed-precondition', 'Not a plan for this person');
        }
      }
      const written = await session.run(
        `
        MERGE (u:User {id: $userId})
        ON CREATE SET u.createdAt = datetime(), u.email = $email
        CREATE (s:DearManSession {
          id: randomUUID(),
          type: $type,
          relationshipType: $relationshipType,
          situationType: $situationType,
          priorities: $priorities,
          barriers: $barriers,
          barriersCustom: $barriersCustom,
          describeId: $describeId,
          describeCustom: $describeCustom,
          feelings: $feelings,
          assertId: $assertId,
          assertIds: $assertIds,
          assertDetailsJson: $assertDetailsJson,
          assertCustom: $assertCustom,
          reinforceIds: $reinforceIds,
          anchorPhrase: $anchorPhrase,
          middleGroundId: $middleGroundId,
          middleGroundCustom: $middleGroundCustom,
          walkAwayId: $walkAwayId,
          walkAwayCustom: $walkAwayCustom,
          debriefOverall: $debriefOverall,
          debriefWentWell: $debriefWentWell,
          debriefToChange: $debriefToChange,
          debriefCurrentFeelings: $debriefCurrentFeelings,
          turningPointIds: $turningPointIds,
          momentResponseIds: $momentResponseIds,
          bodySignalIds: $bodySignalIds,
          thoughtPatternIds: $thoughtPatternIds,
          underneathIds: $underneathIds,
          copeAheadId: $copeAheadId,
          reflectionLanded: $reflectionLanded,
          createdAt: datetime()
        })
        SET s:UserData:LogRecord, s.ownerId = $userId, s.key = $userId + ':' + s.id, s.schemaVersion = 1
        MERGE (u)-[:COMPLETED_SESSION]->(s)
        WITH u, s
        OPTIONAL MATCH (u)-[:HAS_PERSON]->(p:Person {key: $personKey})
        FOREACH (x IN CASE WHEN p IS NULL THEN [] ELSE [p] END |
          SET s.personId = x.id, x.lastUsedAt = datetime()
          MERGE (s)-[:WITH_PERSON]->(x))
        RETURN s.id AS id
        `,
        {
          userId,
          email: request.auth.token.email || null,
          type: data.type,
          relationshipType: data.relationshipType || '',
          situationType: data.situationType || '',
          priorities: data.priorities || [],
          barriers: data.barriers || [],
          barriersCustom: data.barriersCustom || '',
          describeId: data.describeId || null,
          describeCustom: data.describeCustom || '',
          feelings: data.feelings || [],
          assertId: data.assertId || null,
          assertIds: data.assertIds || [],
          // Neo4j properties can't hold maps — store per-option detail as JSON
          assertDetailsJson: JSON.stringify(data.assertDetails || {}),
          assertCustom: data.assertCustom || '',
          reinforceIds: data.reinforceIds || [],
          anchorPhrase: data.anchorPhrase || '',
          middleGroundId: data.middleGroundId || null,
          middleGroundCustom: data.middleGroundCustom || '',
          walkAwayId: data.walkAwayId || null,
          walkAwayCustom: data.walkAwayCustom || '',
          debriefOverall: data.debriefOverall || null,
          debriefWentWell: data.debriefWentWell || [],
          debriefToChange: data.debriefToChange || [],
          debriefCurrentFeelings: data.debriefCurrentFeelings || [],
          turningPointIds: data.turningPointIds || [],
          momentResponseIds: data.momentResponseIds || [],
          bodySignalIds: data.bodySignalIds || [],
          thoughtPatternIds: data.thoughtPatternIds || [],
          underneathIds: data.underneathIds || [],
          copeAheadId: data.copeAheadId || null,
          reflectionLanded: data.reflectionLanded || null,
          personKey,
        }
      );

      // PR-S4: the id links the session to its ToolSession (DETAIL) and its reps.
      return { success: true, id: (written.records[0]?.get('id') as string | undefined) ?? null };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('Error saving DEAR MAN session:', error);
      throw new HttpsError('internal', 'Failed to save session');
    } finally {
      await session.close();
    }
  }
);

/**
 * Get all DEAR MAN debrief content from the graph in one call.
 * Returns turning points, moment responses, body signals, thought patterns,
 * underneath emotions, and overall response text.
 */
export const getDearManDebriefContent = onCall(
  CALL_OPTS,
  async () => {
    const session = getDriver().session();
    try {
      const tpResult = await session.run(`
        MATCH (tp:TurningPoint)
        RETURN tp.id AS id, tp.label AS label, tp.validationText AS validationText, tp.sortOrder AS sortOrder
        ORDER BY tp.sortOrder
      `);

      const mrResult = await session.run(`
        MATCH (mr:MomentResponse)
        RETURN mr.id AS id, mr.label AS label, mr.sortOrder AS sortOrder
        ORDER BY mr.sortOrder
      `);

      const bsResult = await session.run(`
        MATCH (bs:BodySignal)
        RETURN bs.id AS id, bs.label AS label, bs.sortOrder AS sortOrder
        ORDER BY bs.sortOrder
      `);

      const tpattResult = await session.run(`
        MATCH (tp:ThoughtPattern)
        RETURN tp.id AS id, tp.label AS label, tp.theme AS theme, tp.sortOrder AS sortOrder
        ORDER BY tp.sortOrder
      `);

      const undResult = await session.run(`
        MATCH (u:Underneath)
        RETURN u.id AS id, u.label AS label, u.sortOrder AS sortOrder
        ORDER BY u.sortOrder
      `);

      const tcResult = await session.run(`
        MATCH (tc:TherapyConcept {id: 'dbt_dear_man'})
        RETURN tc.debriefResponseBad AS bad,
               tc.debriefResponseMixed AS mixed,
               tc.debriefResponseGood AS good,
               tc.debriefResponseNotYet AS notYet
      `);

      const turningPoints = tpResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        validationText: r.get('validationText'),
        sortOrder: toNumber(r.get('sortOrder')) ?? 0,
      }));

      const momentResponses = mrResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        sortOrder: toNumber(r.get('sortOrder')) ?? 0,
      }));

      const bodySignals = bsResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        sortOrder: toNumber(r.get('sortOrder')) ?? 0,
      }));

      const thoughtPatterns = tpattResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        theme: r.get('theme'),
        sortOrder: toNumber(r.get('sortOrder')) ?? 0,
      }));

      const underneathEmotions = undResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        sortOrder: toNumber(r.get('sortOrder')) ?? 0,
      }));

      const tc = tcResult.records[0];
      const overallResponses = {
        bad: tc?.get('bad') ?? '',
        mixed: tc?.get('mixed') ?? '',
        good: tc?.get('good') ?? '',
        notYet: tc?.get('notYet') ?? '',
      };

      return {
        turningPoints,
        momentResponses,
        bodySignals,
        thoughtPatterns,
        underneathEmotions,
        overallResponses,
      };
    } catch (error) {
      console.error('Error fetching DEAR MAN debrief content:', error);
      throw new HttpsError('internal', 'Failed to fetch debrief content');
    } finally {
      await session.close();
    }
  }
);

/**
 * Get a personalized reflection and cope-ahead options for a
 * turning-point + moment-response combination.
 */
export const getDearManReflection = onCall(
  CALL_OPTS,
  async (request) => {
    const { turningPointIds, momentResponseIds } = request.data as {
      turningPointIds: string[];
      momentResponseIds: string[];
    };

    if (!turningPointIds?.length || !momentResponseIds?.length) {
      throw new HttpsError('invalid-argument', 'turningPointIds and momentResponseIds are required');
    }

    const session = getDriver().session();
    try {
      // Try specific reflections matching any TP × any Response combo, fall back to default
      const refResult = await session.run(`
        OPTIONAL MATCH (r:Reflection)-[:REFLECTS_ON]->(tp:TurningPoint)
        WHERE tp.id IN $turningPointIds
          AND ANY(mrid IN $momentResponseIds WHERE (r)-[:FOR_RESPONSE]->(:MomentResponse {id: mrid}))
        WITH collect(DISTINCT r.text) AS texts
        OPTIONAL MATCH (d:Reflection {isDefault: true})
        WITH CASE WHEN size(texts) > 0 THEN texts ELSE [d.text] END AS allTexts
        UNWIND allTexts AS reflection
        RETURN reflection
      `, { turningPointIds, momentResponseIds });

      // Cope-ahead: specific to any selected response + universals
      const caResult = await session.run(`
        MATCH (ca:CopeAhead)
        WHERE ca.isUniversal = true
           OR ANY(mrid IN $momentResponseIds WHERE (ca)-[:FOR_RESPONSE]->(:MomentResponse {id: mrid}))
        RETURN DISTINCT ca.id AS id, ca.label AS label, ca.rehearsal AS rehearsal
      `, { momentResponseIds });

      const reflections = refResult.records
        .map((r: Neo4jRecord) => r.get('reflection') as string | null)
        .filter((t): t is string => t != null);
      const reflection = reflections.length > 0
        ? reflections.join('\n\n')
        : 'Whatever happened in that moment, your nervous system was doing its best with what it had. Let\'s build something you can reach for next time.';

      const copeAheadOptions = caResult.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        label: r.get('label'),
        rehearsal: r.get('rehearsal'),
      }));

      return { reflection, copeAheadOptions };
    } catch (error) {
      console.error('Error fetching DEAR MAN reflection:', error);
      throw new HttpsError('internal', 'Failed to fetch reflection');
    } finally {
      await session.close();
    }
  }
);

/**
 * Get saved DEAR MAN sessions for the authenticated user.
 * Returns sessions sorted by createdAt descending.
 */
function parseJsonObject(raw: unknown): Record<string, string> {
  if (typeof raw !== 'string' || !raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export const getDearManSessions = onCall(
  CALL_OPTS,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = request.auth.uid;
    const limit = (request.data as { limit?: number })?.limit ?? 20;

    const session = getDriver().session();
    try {
      const result = await session.run(
        `
        MATCH (u:User {id: $userId})-[:COMPLETED_SESSION]->(s:DearManSession)
        RETURN s.id AS id,
               s.type AS type,
               s.mode AS mode,
               s.relationshipType AS relationshipType,
               s.situationType AS situationType,
               s.priorities AS priorities,
               s.barriers AS barriers,
               s.barriersCustom AS barriersCustom,
               s.describeId AS describeId,
               s.describeCustom AS describeCustom,
               s.feelings AS feelings,
               s.assertId AS assertId,
               s.assertIds AS assertIds,
               s.assertDetailsJson AS assertDetailsJson,
               s.assertCustom AS assertCustom,
               s.reinforceIds AS reinforceIds,
               s.anchorPhrase AS anchorPhrase,
               s.middleGroundId AS middleGroundId,
               s.middleGroundCustom AS middleGroundCustom,
               s.walkAwayId AS walkAwayId,
               s.walkAwayCustom AS walkAwayCustom,
               s.debriefOverall AS debriefOverall,
               s.debriefWentWell AS debriefWentWell,
               s.debriefToChange AS debriefToChange,
               s.debriefCurrentFeelings AS debriefCurrentFeelings,
               s.createdAt AS createdAt
        ORDER BY s.createdAt DESC
        LIMIT $limit
        `,
        { userId, limit: neo4j.int(limit) }
      );

      const sessions = result.records.map((r: Neo4jRecord) => ({
        id: r.get('id'),
        type: r.get('type'),
        mode: r.get('mode') || '',
        relationshipType: r.get('relationshipType') || '',
        situationType: r.get('situationType') || '',
        priorities: r.get('priorities') || [],
        barriers: r.get('barriers') || [],
        barriersCustom: r.get('barriersCustom') || '',
        describeId: r.get('describeId'),
        describeCustom: r.get('describeCustom') || '',
        feelings: r.get('feelings') || [],
        assertId: r.get('assertId'),
        assertIds: r.get('assertIds') || [],
        assertDetails: parseJsonObject(r.get('assertDetailsJson')),
        assertCustom: r.get('assertCustom') || '',
        reinforceIds: r.get('reinforceIds') || [],
        anchorPhrase: r.get('anchorPhrase') || '',
        middleGroundId: r.get('middleGroundId'),
        middleGroundCustom: r.get('middleGroundCustom') || '',
        walkAwayId: r.get('walkAwayId'),
        walkAwayCustom: r.get('walkAwayCustom') || '',
        debriefOverall: r.get('debriefOverall'),
        debriefWentWell: r.get('debriefWentWell') || [],
        debriefToChange: r.get('debriefToChange') || [],
        debriefCurrentFeelings: r.get('debriefCurrentFeelings') || [],
        createdAt: r.get('createdAt')?.toString() || new Date().toISOString(),
      }));

      return { sessions };
    } catch (error) {
      console.error('Error fetching DEAR MAN sessions:', error);
      throw new HttpsError('internal', 'Failed to fetch sessions');
    } finally {
      await session.close();
    }
  }
);
