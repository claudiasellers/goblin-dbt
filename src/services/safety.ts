/**
 * The safety route's content and saves (CORE-01, docs/design/safety-route.md). Content ships as
 * src/data/content/safety.json (generated from the graph); the record goes to saveSafetyCheck, signed in only.
 */
import type { SafetyContent } from '../data/safetyTypes';
import type { SafetyCheckRecord } from '../lib/safetyRoute';

let cached: Promise<SafetyContent> | null = null;

/** Its own chunk, fetched the first time it's needed and kept; a failed fetch can be retried. */
export function getSafetyContent(): Promise<SafetyContent> {
  if (!cached) {
    cached = import('../data/content/safety.json').then((m) => m.default.content as unknown as SafetyContent).catch((e) => {
      cached = null;
      throw e;
    });
  }
  return cached;
}

/** Start the chunk early (the check-in, once its result says it will ask). */
export function preloadSafetyContent(): void {
  void getSafetyContent().catch(() => { /* retried on open */ });
}

async function call<T, R>(name: string, data: T): Promise<R> {
  const [{ httpsCallable }, { functions }] = await Promise.all([import('firebase/functions'), import('./firebase')]);
  return (await httpsCallable<T, R>(functions, name)(data)).data;
}

/** One visit's whole state each time (the server only moves it forward). */
export function saveSafetyCheck(record: SafetyCheckRecord): Promise<{ id: string; saved: boolean }> {
  return call('saveSafetyCheck', record);
}

/** *Can I check in with you tomorrow morning?* → yes: the content-free `safety_checkin` card, 09:30 tomorrow. */
export async function scheduleSafetyCheckin(): Promise<string | null> {
  const [{ getSpineContent, scheduleFollowUps }, { dueAtFor }, { newId }] = await Promise.all([
    import('./spine'), import('../lib/spine/windows'), import('../lib/spine/ids'),
  ]);
  const content = await getSpineContent();
  const type = content.followUpTypes.find((t) => t.id === 'safety_checkin' && t.enabled);
  const due = type ? dueAtFor(type.window, new Date(), 'tomorrow') : null;
  if (!type || !due) return null;
  const ids = await scheduleFollowUps([{ id: newId(), type: 'safety_checkin', dueAt: due.toISOString(), window: 'tomorrow', notify: { inTab: true, push: false } }]);
  return ids[0] ?? null;
}

/** The morning check answered: the card is done. The answer itself is never sent. */
export function completeSafetyCheckin(followUpId: string): Promise<unknown> {
  return call('resolveFollowUp', { id: followUpId, status: 'done' });
}

/** The safety plan saved (CORE-02): the review card a month on (`safety_plan_review`, 10:00 in 30 days). */
export async function scheduleSafetyPlanReview(): Promise<string | null> {
  const [{ getSpineContent, scheduleFollowUps }, { dueAtFor }, { newId }] = await Promise.all([
    import('./spine'), import('../lib/spine/windows'), import('../lib/spine/ids'),
  ]);
  const content = await getSpineContent();
  const type = content.followUpTypes.find((t) => t.id === 'safety_plan_review' && t.enabled);
  const due = type ? dueAtFor(type.window, new Date(), 'month') : null;
  if (!type || !due) return null;
  const ids = await scheduleFollowUps([{ id: newId(), type: 'safety_plan_review', dueAt: due.toISOString(), window: 'month', notify: { inTab: true, push: false } }]);
  return ids[0] ?? null;
}

/** The review card answered (keep as is, or changed and saved): the card is done. */
export function completeFollowUp(followUpId: string): Promise<unknown> {
  return call('resolveFollowUp', { id: followUpId, status: 'done' });
}
