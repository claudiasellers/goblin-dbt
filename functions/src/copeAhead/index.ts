/**
 * Cope Ahead: content (docs/design/cope-ahead.md). Public content, no user data. The app reads the
 * generated src/data/content/cope-ahead.json (scripts/content-snapshot/build.mjs mirrors this Cypher).
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import { int } from '../shared/values';
import type { CopeAheadContent, CopeMoveItem, CopeSituationItem, HardMomentItem, RehearsalBeatItem } from './types';

export const COPE_AHEAD_VERSION = 'cope-ahead-v1';

const list = (v: unknown): string[] => (v as string[] | null) ?? [];

/** The flow copy, the situations, the hardest moments, the moves and the rehearsal, in one call. */
export const getCopeAheadContent = callable<unknown, CopeAheadContent>(
  { auth: 'public', label: 'getCopeAheadContent', errorMessage: 'Could not load content' },
  async () => readTx(async (tx) => {
    const flowRes = await tx.run(
      `MATCH (f:CopeAheadFlow {id: 'cope_ahead_flow'}) RETURN f.version AS version, f.contentJson AS content`);
    const rec = flowRes.records[0];
    if (!rec || rec.get('version') !== COPE_AHEAD_VERSION) {
      throw new HttpsError('failed-precondition', 'Cope Ahead content migration is required');
    }
    const flow = JSON.parse(rec.get('content') as string) as Pick<CopeAheadContent, 'ownMax' | 'moveOwnMax' | 'when' | 'copy' | 'pullIf' | 'after'>;
    const sRes = await tx.run(
      `MATCH (:TherapyConcept {id: 'dbt_cope_ahead'})-[:HAS_SITUATION]->(s:CopeSituation)
       RETURN s.id AS id, s.label AS label, s.afterName AS afterName, s.likelyFeelings AS likelyFeelings,
              s.hardMoments AS hardMoments, s.dangerMomentIds AS dangerMomentIds, s.order AS order
       ORDER BY s.order`);
    const hRes = await tx.run(
      `MATCH (:TherapyConcept {id: 'dbt_cope_ahead'})-[:HAS_HARD_MOMENT]->(m:HardMoment)
       RETURN m.id AS id, m.label AS label, m.ifText AS ifText, m.order AS order
       ORDER BY m.order`);
    const mRes = await tx.run(
      `MATCH (:TherapyConcept {id: 'dbt_cope_ahead'})-[:HAS_MOVE]->(m:CopeMove)
       RETURN m.id AS id, m.kind AS kind, m.label AS label, m.line AS line, m.forPulls AS forPulls,
              m.general AS general, m.appToolId AS appToolId, m.forMoments AS forMoments, m.forSituations AS forSituations, m.order AS order
       ORDER BY m.order`);
    const bRes = await tx.run(
      `MATCH (:TherapyConcept {id: 'dbt_cope_ahead'})-[:HAS_BEAT]->(b:RehearsalBeat)
       RETURN b.id AS id, b.text AS text, b.order AS order
       ORDER BY b.order`);
    const situations: CopeSituationItem[] = sRes.records.map((r) => ({
      id: r.get('id'), label: r.get('label'), afterName: r.get('afterName'), likelyFeelings: list(r.get('likelyFeelings')),
      hardMoments: list(r.get('hardMoments')), dangerMomentIds: list(r.get('dangerMomentIds')), order: int(r.get('order')),
    }));
    const hardMoments: HardMomentItem[] = hRes.records.map((r) => ({
      id: r.get('id'), label: r.get('label'), ifText: r.get('ifText'), order: int(r.get('order')),
    }));
    const moves: CopeMoveItem[] = mRes.records.map((r) => ({
      id: r.get('id'), kind: r.get('kind'), label: r.get('label'), line: r.get('line'),
      forPulls: list(r.get('forPulls')) as CopeMoveItem['forPulls'], general: r.get('general') === true,
      appToolId: (r.get('appToolId') as string | null) ?? null, forMoments: list(r.get('forMoments')), forSituations: list(r.get('forSituations')), order: int(r.get('order')),
    }));
    const beats: RehearsalBeatItem[] = bRes.records.map((r) => ({ id: r.get('id'), text: r.get('text'), order: int(r.get('order')) }));
    return {
      version: COPE_AHEAD_VERSION, ownMax: flow.ownMax, moveOwnMax: flow.moveOwnMax, when: flow.when, copy: flow.copy,
      pullIf: flow.pullIf, after: flow.after, situations, hardMoments, moves, beats,
    };
  }),
);
