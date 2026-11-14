/**
 * The skill runtime's content (docs/design/skill-runtime.md). Public content, no user data. The app reads
 * the generated src/data/content/skills.json (scripts/content-snapshot/build.mjs mirrors this Cypher).
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import { int, toNumber } from '../shared/values';
import type { ExitDef, OptionDef, SkillDef, SkillsContent, StepDef } from './types';
import { feelingOf, type GuideRow } from './feelingOf';

export const SKILLS_VERSION = 'skills-v1';

const json = <T>(v: unknown, fallback: T): T => (typeof v === 'string' ? (JSON.parse(v) as T) : fallback);

/**
 * Every skill, with the shared tables read from the emotion knowledge itself: parentOf, fitsWhen, and the feeling
 * guide's feelingOf / feelingGuideOf (ER-10; only signed-off body places, only emotion urges).
 */
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
              x.planned AS planned, x.safety AS safety, x.label AS label ORDER BY x.id`);
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
    const guideRes = await tx.run(
      `MATCH (g:FeelingGuide)
       OPTIONAL MATCH (g)-[:GUIDES]->(:EmotionRegulationContent)-[:HAS_ACTION_URGE]->(u:ActionUrge)
       WITH g, collect(DISTINCT {id: u.id, label: u.label, order: u.order, kind: u.kind}) AS urges
       OPTIONAL MATCH (g)-[:FELT_LIKE]->(:BodyMap {status: 'live'})-[:GROUPS]->(e:Emotion)-[f:FELT_AS {status: 'live'}]->(s:SensationType {padStatus: 'live'})
       OPTIONAL MATCH (r:BodyRegion {id: f.region})
       RETURN g.id AS id, g.label AS label, g.contentJson AS contentJson, g.ladder AS ladder, g.urgesHeld AS urgesHeld, urges,
              collect({emotionId: e.id, region: f.region, regionName: r.name, sensationId: s.id, label: s.padLabel, energy: s.energy, weight: f.weight}) AS felt
       ORDER BY id`);
    const guideOfRes = await tx.run(
      `MATCH (e:Emotion)-[:HAS_REGULATION_CONTENT]->(:EmotionRegulationContent)<-[:GUIDES]-(g:FeelingGuide) RETURN e.id AS id, g.id AS guide, 0 AS via
       UNION
       MATCH (e:Emotion)-[:IN_GUIDE]->(g:FeelingGuide) RETURN e.id AS id, g.id AS guide, 1 AS via`);

    const skills: SkillDef[] = sRes.records.map((r) => ({
      id: r.get('id'), toolId: r.get('toolId'), version: r.get('version'), start: r.get('start'),
      accepts: (r.get('accepts') as SkillDef['accepts'] | null) ?? [], ownMax: int(r.get('ownMax')),
      emotionFields: (r.get('emotionFields') as string[] | null) ?? [], copy: json(r.get('copy'), {}), tables: json(r.get('tables'), {}),
      derive: json(r.get('derive'), []), steps: [], exits: [], options: {},
      // Served only when the skill can run inline (R8).
      ...(json<SkillDef['inline'] | null>(r.get('inline'), null) ? { inline: json<SkillDef['inline']>(r.get('inline'), undefined) } : {}),
      // Persist-nothing (R15), quick exit, re-entry steps: served only when the skill sets them.
      ...runtimeOf(json<Record<string, unknown>>(r.get('runtime'), {})),
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
        ...(r.get('planned') === true ? { planned: true } : {}), ...(r.get('safety') === true ? { safety: true } : {}),
        ...(typeof r.get('label') === 'string' ? { label: r.get('label') as string } : {}) };
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
    const guides: GuideRow[] = guideRes.records.map((r) => ({
      id: r.get('id'), label: r.get('label'), contentJson: r.get('contentJson') ?? null, ladder: r.get('ladder') ?? null,
      urgesHeld: r.get('urgesHeld') ?? null,
      urges: (r.get('urges') as GuideRow['urges']).map((u) => ({ ...u, order: u.order === null || u.order === undefined ? null : toNumber(u.order) })),
      felt: (r.get('felt') as GuideRow['felt']).map((f) => ({ ...f, weight: f.weight === null || f.weight === undefined ? null : toNumber(f.weight) })),
    }));
    const feelingGuideOf: Record<string, string> = {};
    // A parent's guide first, IN_GUIDE after (it wins, as in the snapshot build and graph_tables.py), then by id.
    const via = (r: { get: (k: string) => unknown }) => toNumber(r.get('via') ?? 0) ?? 0;
    const rows = [...guideOfRes.records].sort((a, b) => via(a) - via(b) || String(a.get('id')).localeCompare(String(b.get('id'))));
    for (const r of rows) feelingGuideOf[r.get('id')] = r.get('guide');
    const sortedGuideOf = Object.fromEntries(Object.entries(feelingGuideOf).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    return { version: SKILLS_VERSION, parentOf, fitsWhen, feelingOf: feelingOf(guides), feelingGuideOf: sortedGuideOf, skills };
  }),
);

/** The runtime switches a skill may carry (R15, quick exit, re-entry): only these keys are served. */
function runtimeOf(r: Record<string, unknown>): Partial<Pick<SkillDef, 'persist' | 'quickExit' | 'resumeAt' | 'entries'>> {
  const out: Partial<Pick<SkillDef, 'persist' | 'quickExit' | 'resumeAt' | 'entries'>> = {};
  if (r.persist && typeof r.persist === 'object') out.persist = r.persist as SkillDef['persist'];
  if (r.quickExit === true) out.quickExit = true;
  if (Array.isArray(r.resumeAt)) out.resumeAt = r.resumeAt.filter((x): x is string => typeof x === 'string');
  if (r.entries && typeof r.entries === 'object' && !Array.isArray(r.entries)) {
    out.entries = Object.fromEntries(Object.entries(r.entries as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string'));
  }
  return out;
}
