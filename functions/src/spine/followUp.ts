/**
 * FollowUp: schedule / resolve / snooze (PR-S5; E2 §A3.2). One-shot only in Phase A (`rrule`
 * reserved). Status scheduled → done | partly | didnt | dismissed | cancelled; `due` / `stale` are
 * derived at read (todayOrder.ts). Finalise-once: only a scheduled follow-up can be resolved or
 * snoozed (GUARDS.FollowUp.update).
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { callable } from '../shared/callable';
import { writeTx } from '../shared/neo4j';
import { parseOrInvalid } from '../shared/errors';
import { obj, str, uuid } from '../shared/validate';
import { GUARDS } from '../userdata/lifecycle';
import { MERGE_USER, userKey } from '../userdata/ownership';
import { validateResolve, validateSchedule, validateSnooze, type ScheduleInput } from './validation';
import { SPINE_TOOLS } from './tools';

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

export const scheduleFollowUp = callable<unknown, { ids: string[] }>(
  { auth: 'required', label: 'scheduleFollowUp', errorMessage: 'Could not schedule that' },
  async ({ uid, data, request }) => {
    const now = new Date();
    const d = parseOrInvalid(() => obj(data), 'Invalid follow-up');
    const items = parseOrInvalid(() => validateSchedule(Array.isArray(d.items) ? d.items : [d], now), 'Invalid follow-up');
    const sourceSessionId = parseOrInvalid(() => (d.sourceSessionId == null ? null : uuid(d.sourceSessionId)), 'Invalid follow-up');
    const sourceToolId = parseOrInvalid(() => (d.sourceToolId == null ? null : str(d.sourceToolId, { max: 64 })), 'Invalid follow-up');
    if (sourceToolId && !SPINE_TOOLS[sourceToolId]) throw new HttpsError('invalid-argument', 'Invalid follow-up');
    const ids = await writeTx(async (tx) => {
      await tx.run(MERGE_USER, { uid, email: request.auth?.token?.email ?? null });
      return scheduleTx(tx, uid as string, items, { sourceSessionId, sourceToolId });
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
 */
export const resolveFollowUp = callable<unknown, ResolveFollowUpResponse>(
  { auth: 'required', label: 'resolveFollowUp', errorMessage: 'Could not save that' },
  async ({ uid, data }) => {
    const r = parseOrInvalid(() => validateResolve(data), 'Invalid follow-up');
    const key = userKey(uid as string, r.id);
    return writeTx(async (tx) => {
      const head = await tx.run(
        `MATCH (:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {key: $key})
         OPTIONAL MATCH (t:FollowUpType {id: f.type})
         RETURN f.type AS type, f.status AS status, ${GUARDS.FollowUp.update('f')} AS open, t.contentJson AS content`,
        { uid, key },
      );
      const rec = head.records[0];
      if (!rec) throw new HttpsError('not-found', 'Follow-up not found');
      if (rec.get('open') !== true) return { next: null, status: rec.get('status') as string };
      if (rec.get('type') === 'oa_plan') throw new HttpsError('failed-precondition', 'Resolved in Opposite Action');
      const content = JSON.parse((rec.get('content') as string | null) ?? '{}') as {
        dir?: string; choices?: Array<{ id: string; status?: string; snoozeHours?: number; thenVsNow?: string }>;
      };
      const choice = r.choiceId ? (content.choices ?? []).find((c) => c.id === r.choiceId) : undefined;
      if (r.choiceId && !choice) throw new HttpsError('invalid-argument', 'Unknown choice');
      if (choice?.snoozeHours) {
        await tx.run(
          `MATCH (:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {key: $key}) WHERE ${GUARDS.FollowUp.update('f')}
           SET f.snoozedUntil = datetime() + duration({hours: $hours}), f.updatedAt = datetime()`,
          { uid, key, hours: choice.snoozeHours },
        );
        return { next: null, status: 'scheduled' };
      }
      const status = (choice?.status ?? r.status) as string | undefined;
      if (!status) throw new HttpsError('invalid-argument', 'Invalid follow-up');
      const outcome = choice
        ? JSON.stringify({ choiceId: choice.id, ...(choice.thenVsNow ? { thenVsNow: choice.thenVsNow, thenVsNowDir: content.dir ?? null } : {}) })
        : null;
      await tx.run(
        `MATCH (:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {key: $key}) WHERE ${GUARDS.FollowUp.update('f')}
         SET f.status = $status, f.outcome = $outcome, f.missedReason = $missedReason,
             f.resolvedAt = datetime(), f.updatedAt = datetime()`,
        { uid, key, status, outcome, missedReason: r.missedReason },
      );
      return { next: null, status };
    });
  },
);

export const snoozeFollowUp = callable<unknown, { ok: true }>(
  { auth: 'required', label: 'snoozeFollowUp', errorMessage: 'Could not save that' },
  async ({ uid, data }) => {
    const s = parseOrInvalid(() => validateSnooze(data, new Date()), 'Invalid follow-up');
    await writeTx((tx) => tx.run(
      `MATCH (:User {id: $uid})-[:HAS_FOLLOW_UP]->(f:FollowUp {key: $key}) WHERE ${GUARDS.FollowUp.update('f')}
       SET f.snoozedUntil = datetime($until), f.updatedAt = datetime()`,
      { uid, key: userKey(uid as string, s.id), until: s.until },
    ));
    return { ok: true };
  },
);
