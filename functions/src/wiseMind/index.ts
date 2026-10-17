/**
 * Wise mind: content (docs/design/wise-mind.md). Public content, no user data. The app reads the
 * generated src/data/content/wise-mind.json (scripts/content-snapshot/build.mjs mirrors this Cypher).
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import { int } from '../shared/values';
import type { MindSide, WiseMindAnswerItem, WiseMindContent, WiseMindPracticeItem, WiseMindQuestionItem } from './types';

export const WISE_MIND_VERSION = 'wise-mind-v1';

const num = (v: unknown): number | null => (v == null ? null : int(v));

/** The flow copy, the questions with what each mind says, the practices and the answers, in one call. */
export const getWiseMindContent = callable<unknown, WiseMindContent>(
  { auth: 'public', label: 'getWiseMindContent', errorMessage: 'Could not load content' },
  async () => readTx(async (tx) => {
    const flowRes = await tx.run(
      `MATCH (f:WiseMindFlow {id: 'wise_mind_flow'}) RETURN f.version AS version, f.contentJson AS content`);
    const rec = flowRes.records[0];
    if (!rec || rec.get('version') !== WISE_MIND_VERSION) {
      throw new HttpsError('failed-precondition', 'Wise mind content migration is required');
    }
    const flow = JSON.parse(rec.get('content') as string) as { ownMax: number; copy: Record<string, unknown> };
    const qRes = await tx.run(
      `MATCH (q:WiseMindQuestion)
       OPTIONAL MATCH (v:MindVoice)-[:VOICES]->(q)
       WITH q, v ORDER BY v.mind, v.order
       RETURN q.id AS id, q.label AS label, q.order AS order, q.defaultPracticeId AS defaultPracticeId,
              [x IN collect(v { .id, .label, .mind }) WHERE x.id IS NOT NULL] AS voices
       ORDER BY q.order`);
    const pRes = await tx.run(
      `MATCH (:TherapyConcept {id: 'dbt_wise_mind'})-[:HAS_PRACTICE]->(p:WiseMindPractice)
       RETURN p.id AS id, p.name AS name, p.sub AS sub, p.kind AS kind, p.lines AS lines,
              p.breaths AS breaths, p.seconds AS seconds, p.order AS order
       ORDER BY p.order`);
    const aRes = await tx.run(
      `MATCH (a:WiseMindAnswer)
       RETURN a.id AS id, a.label AS label, a.order AS order, a.nextToolIds AS nextToolIds, a.kind AS kind
       ORDER BY a.order`);
    const questions: WiseMindQuestionItem[] = qRes.records.map((r) => {
      const voices = r.get('voices') as Array<{ id: string; label: string; mind: MindSide }>;
      const side = (m: MindSide) => voices.filter((v) => v.mind === m).map(({ id, label }) => ({ id, label }));
      return {
        id: r.get('id'), label: r.get('label'), order: int(r.get('order')), defaultPracticeId: r.get('defaultPracticeId'),
        voices: { emotion: side('emotion'), reason: side('reason') },
      };
    });
    const practices: WiseMindPracticeItem[] = pRes.records.map((r) => ({
      id: r.get('id'), name: r.get('name'), sub: r.get('sub'), kind: r.get('kind'), lines: (r.get('lines') as string[] | null) ?? [],
      breaths: num(r.get('breaths')), seconds: num(r.get('seconds')), order: int(r.get('order')),
    }));
    const answers: WiseMindAnswerItem[] = aRes.records.map((r) => ({
      id: r.get('id'), label: r.get('label'), order: int(r.get('order')),
      nextToolIds: (r.get('nextToolIds') as string[] | null) ?? [], kind: (r.get('kind') as 'quiet' | null) ?? null,
    }));
    return { version: WISE_MIND_VERSION, ownMax: flow.ownMax, copy: flow.copy, questions, practices, answers };
  }),
);
