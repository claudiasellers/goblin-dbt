/**
 * The Practice home (MF-02, MF-B3, docs/design/practice-home.md): one read for `/practice`. The MF skills in their
 * sequence (`PracticeSkill.mfOrder`, graph content), the person's own reps of them (the shared `SkillPractice` log,
 * aggregates only: never used to pre-fill a flow), and whether the daily card is already booked. Writes go through the
 * spine: catch-one taps are `recordToolSession` one-shots (tool `practice`), the daily card is `scheduleFollowUp`.
 */
import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import { practiceHome } from './compute';
import type { DailyCardRow, LifetimeTotals, PracticeHomeResponse, RepRow, SkillMetaRow } from './types';

const SKILLS_QUERY = `MATCH (k:PracticeSkill) WHERE k.mfOrder IS NOT NULL
  RETURN k.id AS id, coalesce(k.practiceLabel, k.displayLabel, k.name) AS label, k.mfOrder AS mfOrder,
         coalesce(k.defaultFor, []) AS tools`;

const REPS_QUERY = `MATCH (:User {id: $uid})-[:HAS_SKILL_PRACTICE]->(sp:SkillPractice)-[:PRACTICED]->(k:PracticeSkill)
  WHERE k.mfOrder IS NOT NULL
  OPTIONAL MATCH (ts:ToolSession)-[:LOGGED_REP]->(sp)
  RETURN k.id AS skillId, coalesce(ts.key, sp.key) AS sessionKey, coalesce(sp.practiceId, '') AS practiceId,
         toString(sp.at) AS at, coalesce(sp.offPhone, false) AS offPhone, coalesce(sp.source, '') AS source
  ORDER BY sp.at DESC LIMIT 2000`;

// Lifetime counts per skill, apart from the bounded recent rows above, so levels never go down however many reps
// there are. `selfVisits`: off-phone or caught visits, each counted once.
const TOTALS_QUERY = `MATCH (:User {id: $uid})-[:HAS_SKILL_PRACTICE]->(sp:SkillPractice)-[:PRACTICED]->(k:PracticeSkill)
  WHERE k.mfOrder IS NOT NULL
  OPTIONAL MATCH (ts:ToolSession)-[:LOGGED_REP]->(sp)
  WITH k, sp, coalesce(ts.key, sp.key) AS visit, (coalesce(sp.offPhone, false) OR sp.source = 'catch') AS self
  RETURN k.id AS skillId, count(DISTINCT visit) AS reps, count(DISTINCT CASE WHEN self THEN visit END) AS offPhone`;

const SELF_VISITS_QUERY = `MATCH (:User {id: $uid})-[:HAS_SKILL_PRACTICE]->(sp:SkillPractice)-[:PRACTICED]->(k:PracticeSkill)
  WHERE k.mfOrder IS NOT NULL AND (coalesce(sp.offPhone, false) OR sp.source = 'catch')
  OPTIONAL MATCH (ts:ToolSession)-[:LOGGED_REP]->(sp)
  RETURN count(DISTINCT coalesce(ts.key, sp.key)) AS n`;

// Waiting = scheduled and not yet stale (staleAfterHours 12): a missed day's card never blocks the next one, and the
// home dismisses the stale ones.
const DAILY_QUERY = `MATCH (:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {type: 'practice_daily', status: 'scheduled'})
  RETURN f.id AS id, f.dueAt > datetime() - duration({hours: 12}) AS waiting
  ORDER BY f.dueAt DESC LIMIT 20`;

// The last closed Notice what's here: *further away* (worse) opens the next one outside-only.
const NOTICE_QUERY = `MATCH (:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {toolId: 'notice-and-name'})
  WHERE ts.thenVsNow IS NOT NULL
  RETURN ts.thenVsNow AS last ORDER BY coalesce(ts.endedAt, ts.startedAt) DESC LIMIT 1`;

const num = (v: unknown): number => (typeof v === 'number' ? v : typeof (v as { toNumber?: () => number })?.toNumber === 'function' ? (v as { toNumber: () => number }).toNumber() : Number(v));

export const getPracticeHome = callable<unknown, PracticeHomeResponse>(
  { auth: 'required', label: 'getPracticeHome', errorMessage: 'Could not load Practice' },
  async ({ uid }) => readTx(async (tx) => {
    // One after another: a transaction runs one query at a time.
    const skills = await tx.run(SKILLS_QUERY);
    const reps = await tx.run(REPS_QUERY, { uid });
    const daily = await tx.run(DAILY_QUERY, { uid });
    const notice = await tx.run(NOTICE_QUERY, { uid });
    const totals = await tx.run(TOTALS_QUERY, { uid });
    const selfVisits = await tx.run(SELF_VISITS_QUERY, { uid });
    const meta: SkillMetaRow[] = skills.records.map((r) => ({
      id: r.get('id') as string, label: r.get('label') as string, order: num(r.get('mfOrder')),
      tools: (r.get('tools') as unknown[]).filter((t): t is string => typeof t === 'string'),
    }));
    const rows: RepRow[] = reps.records.map((r) => ({
      skillId: r.get('skillId') as string, sessionKey: r.get('sessionKey') as string,
      practiceId: r.get('practiceId') as string, at: r.get('at') as string,
      offPhone: r.get('offPhone') === true, source: r.get('source') as string,
    }));
    const cards: DailyCardRow[] = daily.records.map((r) => ({ id: r.get('id') as string, waiting: r.get('waiting') === true }));
    const last = notice.records[0]?.get('last');
    const lifetime: LifetimeTotals = {
      bySkill: Object.fromEntries(totals.records.map((r) => [r.get('skillId') as string,
        { reps: num(r.get('reps')), offPhone: num(r.get('offPhone')) }])),
      offPhoneVisits: num(selfVisits.records[0]?.get('n') ?? 0),
    };
    return practiceHome(meta, rows, cards, typeof last === 'string' ? last : null, Date.now(), lifetime);
  }),
);
