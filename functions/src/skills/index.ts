/**
 * The skill runtime's content (docs/design/skill-runtime.md). Public content, no user data. The app reads
 * the generated src/data/content/skills.json (scripts/content-snapshot/build.mjs mirrors this Cypher).
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import { int } from '../shared/values';
import type { ExitDef, OptionDef, SkillDef, SkillsContent, StepDef } from './types';

export const SKILLS_VERSION = 'skills-v1';

const json = <T>(v: unknown, fallback: T): T => (typeof v === 'string' ? (JSON.parse(v) as T) : fallback);

/** Every skill, with the two shared tables (parentOf, fitsWhen) read from the emotion knowledge itself. */
export const getSkillContent = callable<unknown, SkillsContent>(
  { auth: 'public', label: 'getSkillContent', errorMessage: 'Could not load content' },
  async () => readTx(async (tx) => {
    const sRes = await tx.run(
      `MATCH (s:Skill) RETURN s.id AS id, s.toolId AS toolId, s.version AS version, s.contentVersion AS contentVersion,
              s.start AS start, s.accepts AS accepts, s.ownMax AS ownMax, s.emotionFields AS emotionFields, s.copyJson AS copy,
              s.tablesJson AS tables, s.deriveJson AS derive, s.inlineJson AS inline, s.runtimeJson AS runtime ORDER BY s.id`);
    if (!sRes.records.length || sRes.records.some((r) => r.get('contentVersion') !== SKILLS_VERSION)) {
      throw new HttpsError('failed-precondition', 'Skill content migration is required');
    }
    const stepRes = await tx.run(
      `MATCH (s:Skill)-[h:HAS_STEP]->(st:SkillStep)
       RETURN s.id AS skillId, st.step AS id, st.kind AS kind, st.specJson AS spec, h.order AS order ORDER BY s.id, h.order`);
    const nextRes = await tx.run(
      `MATCH (s:Skill)-[:HAS_STEP]->(a:SkillStep)-[n:NEXT]->(b:SkillStep)
       RETURN s.id AS skillId, a.step AS from, b.step AS to, n.order AS order, n.whenJson AS when ORDER BY n.order`);
    const offerRes = await tx.run(
      `MATCH (s:Skill)-[:HAS_STEP]->(a:SkillStep)-[o:OFFERS]->(x:SkillExit)
       RETURN s.id AS skillId, a.step AS from, x.exit AS exit, o.rowsJson AS rows`);
    const exitRes = await tx.run(
      `MATCH (s:Skill)-[:HAS_EXIT]->(x:SkillExit)
       RETURN s.id AS skillId, x.exit AS id, x.toolId AS toolId, x.queryJson AS query, x.carry AS carry, x.done AS done,
              x.planned AS planned, x.safety AS safety ORDER BY x.id`);
    const optRes = await tx.run(
      `MATCH (s:Skill)-[h:HAS_OPTION]->(o:SkillOption)
       OPTIONAL MATCH (o)-[:ALTERNATIVE_TO]->(story:SkillOption)
       RETURN s.id AS skillId, h.list AS list, h.order AS order, o.value AS value, o.label AS label, o.propsJson AS props,
              o.forOwn AS forOwn, story.value AS forStory ORDER BY s.id, h.order`);
    const parentRes = await tx.run(
      `MATCH (e:Emotion)-[:HAS_REGULATION_CONTENT]->(c:EmotionRegulationContent)
       RETURN e.id AS id, c.dbtParent AS parent ORDER BY e.id`);
    const fitsRes = await tx.run(
      `MATCH (c:EmotionRegulationContent) WHERE size(coalesce(c.fitsTheFactsWhen, [])) > 0
       RETURN c.dbtParent AS parent, c.label AS label, c.fitsTheFactsWhen AS lines ORDER BY c.dbtParent`);

    const skills: SkillDef[] = sRes.records.map((r) => ({
      id: r.get('id'), toolId: r.get('toolId'), version: r.get('version'), start: r.get('start'),
      accepts: (r.get('accepts') as SkillDef['accepts'] | null) ?? [], ownMax: int(r.get('ownMax')),
      emotionFields: (r.get('emotionFields') as string[] | null) ?? [], copy: json(r.get('copy'), {}), tables: json(r.get('tables'), {}),
      derive: json(r.get('derive'), []), steps: [], exits: [], options: {},
      // Served only when the skill can run inline (R8).
      ...(json<SkillDef['inline'] | null>(r.get('inline'), null) ? { inline: json<SkillDef['inline']>(r.get('inline'), undefined) } : {}),
      // Persist-nothing (R15), quick exit, re-entry steps: served only when the skill sets them.
      ...json<Pick<SkillDef, 'persist' | 'quickExit' | 'resumeAt'>>(r.get('runtime'), {}),
    }));
    const by = new Map(skills.map((s) => [s.id, s]));
    for (const r of stepRes.records) {
      const s = by.get(r.get('skillId'));
      if (s) s.steps.push({ id: r.get('id'), kind: r.get('kind'), ...json<Partial<StepDef>>(r.get('spec'), {}), next: [], offers: [] } as StepDef);
    }
    const step = (skillId: string, id: string) => by.get(skillId)?.steps.find((x) => x.id === id);
    for (const r of nextRes.records) {
      step(r.get('skillId'), r.get('from'))?.next.push({ to: r.get('to'), when: json(r.get('when'), null) });
    }
    const offerRows = new Map<StepDef, Array<{ exit: string; when: StepDef['offers'][number]['when']; order: number }>>();
    for (const r of offerRes.records) {
      const st = step(r.get('skillId'), r.get('from'));
      if (!st) continue;
      const rows = json<Array<{ order: number; when: StepDef['offers'][number]['when'] }>>(r.get('rows'), []);
      offerRows.set(st, [...(offerRows.get(st) ?? []), ...rows.map((x) => ({ exit: r.get('exit') as string, when: x.when, order: x.order }))]);
    }
    for (const [st, rows] of offerRows) st.offers = rows.sort((a, b) => a.order - b.order).map(({ exit, when }) => ({ exit, when }));
    for (const r of exitRes.records) {
      const e: ExitDef = { id: r.get('id'), toolId: (r.get('toolId') as string | null) ?? null, query: json(r.get('query'), {}),
        carry: (r.get('carry') as string[] | null) ?? [], done: r.get('done') === true,
        ...(r.get('planned') === true ? { planned: true } : {}), ...(r.get('safety') === true ? { safety: true } : {}) };
      by.get(r.get('skillId'))?.exits.push(e);
    }
    for (const r of optRes.records) {
      const s = by.get(r.get('skillId'));
      if (!s) continue;
      const forStory = r.get('forStory') as string | null;
      const o: OptionDef = { value: r.get('value'), label: r.get('label'), ...json<Record<string, unknown>>(r.get('props'), {}),
        ...(forStory ? { for: forStory } : r.get('forOwn') === true ? { for: '$own' } : {}) };
      (s.options[r.get('list') as string] ??= []).push(o);
    }
    const parentOf: Record<string, string> = {};
    for (const r of parentRes.records) parentOf[r.get('id')] = r.get('parent');
    const fitsWhen: SkillsContent['fitsWhen'] = {};
    for (const r of fitsRes.records) fitsWhen[r.get('parent')] = { label: (r.get('label') as string | null) ?? null, lines: r.get('lines') as string[] };
    return { version: SKILLS_VERSION, parentOf, fitsWhen, skills };
  }),
);
