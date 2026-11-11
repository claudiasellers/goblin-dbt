import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import { ValidationError, obj, uuid } from '../shared/validate';
import { parseOrInvalid } from '../shared/errors';
import { userKey } from '../userdata/ownership';
import { decryptExtOwn } from '../spine/extOwn';

/** How far back a run can be reopened (R9): the follow-ups that resume one are due within a fortnight. */
export const RESUME_DAYS = 14;
/**
 * Tools whose check-ins come back later than that: Ending's after check-in can be a month out (`ending_again`,
 * IE-08), plus the days a card waits on Today.
 */
export const RESUME_DAYS_FOR: Readonly<Record<string, number>> = { 'ending-relationships': 45 };

/**
 * Resume (docs/design/dbt-modules-plan.md C3a R9): the caller's own run of a skill, its `ext.run` with own words
 * readable again, so the player can reopen it at a step (`?run=<sessionId>&at=<stepId>`). The same visit's
 * answers read back, not a pre-fill from memory: the player never restores ask-fresh fields. Only the caller's
 * own session, only for the tool asked, only within RESUME_DAYS; anything else is `{ run: null }`.
 */
export const getSkillRun = callable<unknown, { run: Record<string, unknown> | null }>(
  { auth: 'required', label: 'getSkillRun', errorMessage: 'Could not load that' },
  async ({ uid, data }) => {
    const { sessionId, toolId } = parseOrInvalid(() => {
      const d = obj(data);
      const t = d.toolId;
      if (typeof t !== 'string' || !/^[a-z0-9-]{1,64}$/.test(t)) throw new ValidationError('toolId');
      return { sessionId: uuid(d.sessionId), toolId: t };
    }, 'Invalid run');
    return readTx(async (tx) => {
      const res = await tx.run(
        `MATCH (:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $key})
         WHERE ts.toolId = $toolId AND ts.startedAt > datetime() - duration({days: $days})
         RETURN ts.ext AS ext`,
        { uid, key: userKey(uid as string, sessionId), toolId, days: RESUME_DAYS_FOR[toolId] ?? RESUME_DAYS },
      );
      const ext = res.records[0]?.get('ext');
      if (typeof ext !== 'string' || !ext) return { run: null };
      const plain = await decryptExtOwn(tx, uid as string, ext);
      const run = (typeof plain === 'string' ? JSON.parse(plain) : plain as Record<string, unknown> | null)?.run;
      return { run: run && typeof run === 'object' ? (run as Record<string, unknown>) : null };
    });
  },
);
