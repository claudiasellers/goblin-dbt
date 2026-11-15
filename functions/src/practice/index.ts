/**
 * The Practice home (MF-02, MF-B3, docs/design/practice-home.md): one read for `/practice`. The MF skills in their
 * sequence (`PracticeSkill.mfOrder`, graph content), the person's own reps of them (the shared `SkillPractice` log,
 * aggregates only: never used to pre-fill a flow), and whether the daily card is already booked. Writes go through the
 * spine: catch-one taps are `recordToolSession` one-shots (tool `practice`), the daily card is `scheduleFollowUp`.
 */
import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import { practiceHome } from './compute';
import type { PracticeHomeResponse, RepRow, SkillMetaRow } from './types';

const SKILLS_QUERY = `MATCH (k:PracticeSkill) WHERE k.mfOrder IS NOT NULL
  RETURN k.id AS id, coalesce(k.practiceLabel, k.displayLabel, k.name) AS label, k.mfOrder AS mfOrder,
         coalesce(k.defaultFor, []) AS tools`;

const REPS_QUERY = `MATCH (:User {id: $uid})-[:HAS_SKILL_PRACTICE]->(sp:SkillPractice)-[:PRACTICED]->(k:PracticeSkill)
  WHERE k.mfOrder IS NOT NULL
  OPTIONAL MATCH (ts:ToolSession)-[:LOGGED_REP]->(sp)
  RETURN k.id AS skillId, coalesce(ts.key, sp.key) AS sessionKey, coalesce(sp.practiceId, '') AS practiceId,
         toString(sp.at) AS at, coalesce(sp.offPhone, false) AS offPhone, coalesce(sp.source, '') AS source
  ORDER BY sp.at DESC LIMIT 2000`;

// Waiting = scheduled and not yet stale (staleAfterHours 12): a missed day's card never blocks the next one.
const DAILY_QUERY = `OPTIONAL MATCH (:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {type: 'practice_daily', status: 'scheduled'})
  WHERE f.dueAt > datetime() - duration({hours: 12})
  RETURN count(f) > 0 AS pending`;

const num = (v: unknown): number => (typeof v === 'number' ? v : typeof (v as { toNumber?: () => number })?.toNumber === 'function' ? (v as { toNumber: () => number }).toNumber() : Number(v));

export const getPracticeHome = callable<unknown, PracticeHomeResponse>(
  { auth: 'required', label: 'getPracticeHome', errorMessage: 'Could not load Practice' },
  async ({ uid }) => readTx(async (tx) => {
    // One after another: a transaction runs one query at a time.
    const skills = await tx.run(SKILLS_QUERY);
    const reps = await tx.run(REPS_QUERY, { uid });
    const daily = await tx.run(DAILY_QUERY, { uid });
    const meta: SkillMetaRow[] = skills.records.map((r) => ({
      id: r.get('id') as string, label: r.get('label') as string, order: num(r.get('mfOrder')),
      tools: (r.get('tools') as unknown[]).filter((t): t is string => typeof t === 'string'),
    }));
    const rows: RepRow[] = reps.records.map((r) => ({
      skillId: r.get('skillId') as string, sessionKey: r.get('sessionKey') as string,
      practiceId: r.get('practiceId') as string, at: r.get('at') as string,
      offPhone: r.get('offPhone') === true, source: r.get('source') as string,
    }));
    return practiceHome(meta, rows, daily.records[0]?.get('pending') === true, Date.now());
  }),
);
