/**
 * FollowUp: schedule / resolve / snooze (PR-S5; E2 §A3.2). One-shot only in Phase A (`rrule`
 * reserved). Status scheduled → done | partly | didnt | dismissed | cancelled; `due` / `stale` are
 * derived at read (todayOrder.ts). Finalise-once: only a scheduled follow-up can be resolved or
 * snoozed (GUARDS.FollowUp.update).
 *
 * Parts follow-ups (parts/followUpTypes.ts) while the caller's parts are off: scheduling, resolving
 * and snoozing one is refused as not-found, the answer a missing or someone else's follow-up gets.
 *
 * Session-bound types (copeAheadAfter.ts FOLLOW_UP_SESSION_TOOL: `cope_ahead_after`) are scheduled only on
 * the caller's own session of their tool: scheduleFollowUp refuses anything else, and a close's `schedule`
 * from another tool skips them (like an unknown type).
 */
import { randomUUID } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { callable } from '../shared/callable';
import { writeTx } from '../shared/neo4j';
import { parseOrInvalid } from '../shared/errors';
import { obj, str, uuid } from '../shared/validate';
import { GUARDS } from '../userdata/lifecycle';
import { MERGE_USER, userKey } from '../userdata/ownership';
import { PARTS_FOLLOW_UP_TYPES, isPartsFollowUpType } from '../parts/followUpTypes';
import { validateResolve, validateSchedule, validateSnooze, type ScheduleInput } from './validation';
import { SPINE_TOOLS } from './tools';
import { tagDeps } from '../parts/tag';
import { COPE_AHEAD_AFTER, FOLLOW_UP_SESSION_TOOL, HOW_IT_WENT, partIdFromExt } from './copeAheadAfter';

/**
 * Schedule follow-ups inside an open write transaction. Each item must name an enabled
 * FollowUpType (unknown or disabled types are skipped, never fatal); idempotent by key.
 * Returns the ids written.
 */
export async function scheduleTx(
  tx: ManagedTransaction,
  uid: string,
  items: ScheduleInput[],
  source: { sourceSessionId: string | null; sourceToolId: string | null },
): Promise<string[]> {
  // A session-bound type only from its own tool's session (the close path passes the session's toolId).
  items = items.filter((i) => !FOLLOW_UP_SESSION_TOOL[i.type] || (source.sourceSessionId && FOLLOW_UP_SESSION_TOOL[i.type] === source.sourceToolId));
  if (items.length === 0) return [];
  const res = await tx.run(
    `MATCH (u:User {id: $uid})
     UNWIND $items AS it
     MATCH (t:FollowUpType {id: it.type}) WHERE t.enabled = true
     MERGE (f:FollowUp {key: $uid + ':' + it.id})
     ON CREATE SET f:UserData:LogRecord, f.id = it.id, f.ownerId = $uid, f.schemaVersion = 1, f.createdAt = datetime(),
       f.type = t.id, f.ownerModule = t.ownerModule, f.priorityTier = t.hierarchyTier, f.status = 'scheduled',
       f.dueAt = datetime(it.dueAt), f.window = it.window, f.cueId = it.cueId, f.attempts = 0,
       f.sourceToolId = $sourceToolId, f.sourceSessionId = $sourceSessionId,
       f.notifyPush = coalesce(it.push, t.notifyPush, false), f.notifyInTab = coalesce(it.inTab, t.notifyInTab, false),
       f.notifyIcs = coalesce(it.ics, false)
     MERGE (u)-[:HAS_FOLLOW_UP]->(f)
     WITH u, f
     OPTIONAL MATCH (u)-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $sourceSessionKey})
     FOREACH (x IN CASE WHEN ts IS NULL THEN [] ELSE [ts] END | MERGE (x)-[:SCHEDULED]->(f))
     RETURN collect(f.id) AS ids`,
    {
      uid,
      items: items.map((i) => ({ id: i.id, type: i.type, dueAt: i.dueAt, window: i.window, cueId: i.cueId,
        push: i.notify.push, inTab: i.notify.inTab, ics: i.notify.ics })),
      sourceToolId: source.sourceToolId,
      sourceSessionId: source.sourceSessionId,
      sourceSessionKey: source.sourceSessionId ? userKey(uid, source.sourceSessionId) : null,
    },
  );
  return (res.records[0]?.get('ids') as string[] | undefined) ?? [];
}

/** The caller's parts setting (absent = off). */
export const FOLLOW_UP_PARTS_ON_QUERY = `
  OPTIONAL MATCH (u:User {id: $uid})
  RETURN coalesce(u.partsEnabled, false) AS partsOn
`;

/** In a write's WHERE (with `u` and `f` bound): a parts follow-up takes no write while parts are off. */
const PARTS_ON_FOR = (u: string, f: string) => `(NOT ${f}.type IN $partsTypes OR coalesce(${u}.partsEnabled, false))`;

const followUpNotFound = () => new HttpsError('not-found', 'Follow-up not found');

/** The caller's own ToolSession a session-bound follow-up names: its tool, or no row. */
export const SCHEDULE_SESSION_QUERY = `
  MATCH (:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $key})
  RETURN ts.toolId AS toolId
`;

export const scheduleFollowUp = callable<unknown, { ids: string[] }>(
  { auth: 'required', label: 'scheduleFollowUp', errorMessage: 'Could not schedule that' },
  async ({ uid, data, request }) => {
    const now = new Date();
    const d = parseOrInvalid(() => obj(data), 'Invalid follow-up');
    const items = parseOrInvalid(() => validateSchedule(Array.isArray(d.items) ? d.items : [d], now), 'Invalid follow-up');
    const sourceSessionId = parseOrInvalid(() => (d.sourceSessionId == null ? null : uuid(d.sourceSessionId)), 'Invalid follow-up');
    const sourceToolId = parseOrInvalid(() => (d.sourceToolId == null ? null : str(d.sourceToolId, { max: 64 })), 'Invalid follow-up');
    if (sourceToolId && !SPINE_TOOLS[sourceToolId]) throw new HttpsError('invalid-argument', 'Invalid follow-up');
    const bound = [...new Set(items.map((i) => FOLLOW_UP_SESSION_TOOL[i.type]).filter((t): t is string => !!t))];
    if (bound.length > 1 || (bound.length === 1 && !sourceSessionId)) throw new HttpsError('invalid-argument', 'Invalid follow-up');
    const ids = await writeTx(async (tx) => {
      if (items.some((i) => isPartsFollowUpType(i.type))) {
        const on = (await tx.run(FOLLOW_UP_PARTS_ON_QUERY, { uid })).records[0]?.get('partsOn') === true;
        if (!on) throw followUpNotFound();
      }
      // Cope Ahead's after card: only on the caller's own cope-ahead visit (its plan is read from there).
      let toolId = sourceToolId;
      if (bound.length === 1) {
        const ts = (await tx.run(SCHEDULE_SESSION_QUERY, { uid, key: userKey(uid as string, sourceSessionId as string) })).records[0];
        if (!ts) throw new HttpsError('not-found', 'Session not found');
        if (ts.get('toolId') !== bound[0]) throw new HttpsError('failed-precondition', 'Not for this tool');
        toolId = bound[0];
      }
      await tx.run(MERGE_USER, { uid, email: request.auth?.token?.email ?? null });
      return scheduleTx(tx, uid as string, items, { sourceSessionId, sourceToolId: toolId });
    });
    return { ids };
  },
);

export interface ResolveFollowUpResponse {
  /** CORE-11 hook: `missing_links` flips on for missed-step types later. Phase A: always null. */
  next: 'missing_links' | null;
  status: string | null;
}

/**
 * Resolve from a Today card. The choice is looked up in the type's own choices (authoritative):
 * it resolves with its status, or snoozes by its hours. then-vs-now answers are stored in `outcome`
 * with the type's direction (R3). `oa_plan` is resolved only by Opposite Action's own screen.
 *
 * `cope_ahead_after` (copeAheadAfter.ts): the first answer is the choice (better / as_expected / harder,
 * stored as `howItWent`; It hasn't happened yet snoozes and stores nothing) and the second rides along as
 * `planHelped` (null: Skip, or the person left after the first). Both are written in this one resolve.
 * `helped` also tags the visit's part (parts on, ext.ca.partId the caller's active or resting part).
 */
export const resolveFollowUp = callable<unknown, ResolveFollowUpResponse>(
  { auth: 'required', label: 'resolveFollowUp', errorMessage: 'Could not save that' },
  async ({ uid, data }) => {
    const r = parseOrInvalid(() => validateResolve(data), 'Invalid follow-up');
    const key = userKey(uid as string, r.id);
    return writeTx(async (tx) => {
      const head = await tx.run(
        `MATCH (u:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {key: $key})
         OPTIONAL MATCH (t:FollowUpType {id: f.type})
         RETURN f.type AS type, f.status AS status, ${GUARDS.FollowUp.update('f')} AS open, t.contentJson AS content,
                coalesce(u.partsEnabled, false) AS partsOn`,
        { uid, key },
      );
      const rec = head.records[0];
      if (!rec) throw followUpNotFound();
      if (isPartsFollowUpType(rec.get('type')) && rec.get('partsOn') !== true) throw followUpNotFound();
      if (rec.get('open') !== true) return { next: null, status: rec.get('status') as string };
      if (rec.get('type') === 'oa_plan') throw new HttpsError('failed-precondition', 'Resolved in Opposite Action');
      // Its answer can pause the part (a Part write): answered only by parts' answerPartCheckback.
      if (rec.get('type') === 'part_checkback') throw new HttpsError('failed-precondition', 'Answered in parts');
      const content = JSON.parse((rec.get('content') as string | null) ?? '{}') as {
        dir?: string; choices?: Array<{ id: string; status?: string; snoozeHours?: number; thenVsNow?: string }>;
      };
      const choice = r.choiceId ? (content.choices ?? []).find((c) => c.id === r.choiceId) : undefined;
      if (r.choiceId && !choice) throw new HttpsError('invalid-argument', 'Unknown choice');
      if (choice?.snoozeHours) {
        await tx.run(
          `MATCH (u:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {key: $key}) WHERE ${GUARDS.FollowUp.update('f')} AND ${PARTS_ON_FOR('u', 'f')}
           SET f.snoozedUntil = datetime() + duration({hours: $hours}), f.updatedAt = datetime()`,
          { uid, key, hours: choice.snoozeHours, partsTypes: PARTS_FOLLOW_UP_TYPES },
        );
        return { next: null, status: 'scheduled' };
      }
      const status = (choice?.status ?? r.status) as string | undefined;
      if (!status) throw new HttpsError('invalid-argument', 'Invalid follow-up');
      // Cope Ahead's after card: how it went is the choice; whether the plan helped rides along.
      const after = rec.get('type') === COPE_AHEAD_AFTER;
      if (r.planHelped && !after) throw new HttpsError('invalid-argument', 'Invalid follow-up');
      const howItWent = after && choice && (HOW_IT_WENT as readonly string[]).includes(choice.id) ? choice.id : null;
      if (r.planHelped && !howItWent) throw new HttpsError('invalid-argument', 'Invalid follow-up');
      const planHelped = howItWent ? r.planHelped : null;
      const outcome = choice
        ? JSON.stringify({ choiceId: choice.id, ...(choice.thenVsNow ? { thenVsNow: choice.thenVsNow, thenVsNowDir: content.dir ?? null } : {}) })
        : null;
      await tx.run(
        `MATCH (u:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {key: $key}) WHERE ${GUARDS.FollowUp.update('f')} AND ${PARTS_ON_FOR('u', 'f')}
         SET f.status = $status, f.outcome = $outcome, f.missedReason = $missedReason,
             f.resolvedAt = datetime(), f.updatedAt = datetime()
         FOREACH (_ IN CASE WHEN $after THEN [1] ELSE [] END | SET f.howItWent = $howItWent, f.planHelped = $planHelped)`,
        { uid, key, status, outcome, missedReason: r.missedReason, partsTypes: PARTS_FOLLOW_UP_TYPES, after, howItWent, planHelped },
      );
      if (planHelped === 'helped') await tagCopeAheadPart(tx, uid as string, key);
      return { next: null, status };
    });
  },
);

export const SNOOZE_HEAD_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {key: $key})
  RETURN f.type AS type, coalesce(u.partsEnabled, false) AS partsOn
`;

export const SNOOZE_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {key: $key}) WHERE ${GUARDS.FollowUp.update('f')} AND ${PARTS_ON_FOR('u', 'f')}
  SET f.snoozedUntil = datetime($until), f.updatedAt = datetime()
`;

export const snoozeFollowUp = callable<unknown, { ok: true }>(
  { auth: 'required', label: 'snoozeFollowUp', errorMessage: 'Could not save that' },
  async ({ uid, data }) => {
    const s = parseOrInvalid(() => validateSnooze(data, new Date()), 'Invalid follow-up');
    const key = userKey(uid as string, s.id);
    await writeTx(async (tx) => {
      const head = (await tx.run(SNOOZE_HEAD_QUERY, { uid, key })).records[0];
      if (head && isPartsFollowUpType(head.get('type')) && head.get('partsOn') !== true) throw followUpNotFound();
      await tx.run(SNOOZE_QUERY, { uid, key, until: s.until, partsTypes: PARTS_FOLLOW_UP_TYPES });
    });
    return { ok: true };
  },
);

/** The visit a cope_ahead_after follow-up asks about: the caller's own cope-ahead session and its ext. */
export const COPE_AHEAD_VISIT_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {key: $key})<-[:SCHEDULED]-(ts:ToolSession)<-[:HAS_TOOL_SESSION]-(u)
  WHERE f.type = 'cope_ahead_after' AND ts.toolId = 'cope-ahead'
  RETURN ts.id AS sessionId, ts.ext AS ext
  LIMIT 1
`;

/**
 * "Used it, it helped" with a part named in the visit: PartTag {source: 'cope_ahead'} on that ToolSession
 * (parts/tag.ts; one per session, so a tag already there is left alone). Parts off, no part, or a part not
 * active or resting: nothing, and the answer is saved as usual.
 */
async function tagCopeAheadPart(tx: ManagedTransaction, uid: string, key: string): Promise<void> {
  const visit = (await tx.run(COPE_AHEAD_VISIT_QUERY, { uid, key })).records[0];
  const partId = visit ? partIdFromExt(visit.get('ext')) : null;
  if (!visit || !partId) return;
  const t = { id: randomUUID(), partId, toolSessionId: visit.get('sessionId') as string, source: 'cope_ahead' as const };
  const deps = tagDeps(tx, uid, null);
  const st = await deps.state(t);
  if (!st.partsOn || st.existingId || (st.partStatus !== 'active' && st.partStatus !== 'resting')) return;
  await deps.write(t);
}
