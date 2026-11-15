/**
 * The Practice home's calls (MF-02, docs/design/practice-home.md): the one read, the catch-one taps (spine one-shots
 * under the reserved tool `practice`), the setup (the `practice_prefs` profile kind) and the daily card
 * (`practice_daily`, booked from the setup's time of day, resolved when its card opens the home).
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { keepProfileItem } from './profile';
import { profileCache } from '../lib/profileCache';
import type { PracticeHomeResponse } from '../data/practiceTypes';

const homeFn = httpsCallable<Record<string, never>, PracticeHomeResponse>(functions, 'getPracticeHome');

export async function getPracticeHome(): Promise<PracticeHomeResponse> {
  return (await homeFn({})).data;
}

export type PracticeCatch = 'judgment' | 'off_phone';

/** One tap, one rep: a caught judgment (`nonjudge`, source `catch`) or one done without the app (`observe`, off-phone). */
export async function recordCatch(kind: PracticeCatch): Promise<void> {
  const [{ recordToolSession }, { newId }] = await Promise.all([import('./spine'), import('../lib/spine/ids')]);
  await recordToolSession({
    id: newId(), toolId: 'practice', entry: 'direct', status: 'completed', durationSec: 0,
    skillIds: [kind === 'judgment' ? 'nonjudge' : 'observe'],
    repSource: kind === 'judgment' ? 'catch' : 'followup_offphone',
  });
}

export interface PracticePrefsInput { time?: string; cue?: string; cueOwn?: string; breath: string }

/** The setup's Done: keeps `practice_prefs` (one per person; a re-save replaces it). */
export async function savePracticePrefs(prefs: PracticePrefsInput): Promise<void> {
  const r = await keepProfileItem({ kind: 'practice_prefs', value: prefs });
  profileCache.bump(r.version);
}

/** Book the next daily card at the setup's time of day (the next morning, midday or evening still ahead). */
export async function bookDaily(time: string): Promise<string | null> {
  const [{ getSpineContent, scheduleFollowUps }, { dueAtFor }, { newId }] = await Promise.all([
    import('./spine'), import('../lib/spine/windows'), import('../lib/spine/ids'),
  ]);
  const content = await getSpineContent();
  const type = content.followUpTypes.find((t) => t.id === 'practice_daily' && t.enabled);
  const due = type ? dueAtFor(type.window, new Date(), time) : null;
  if (!type || !due) return null;
  const ids = await scheduleFollowUps([{ id: newId(), type: 'practice_daily', dueAt: due.toISOString(), window: time, notify: { inTab: true, push: false } }]);
  return ids[0] ?? null;
}

/** A stale card, or one booked for a time the person has since changed: dismissed, nothing else said. */
export async function dismissDaily(followUpId: string): Promise<void> {
  const { resolveFollowUpStatus } = await import('./spine');
  await resolveFollowUpStatus(followUpId, 'dismissed');
}

/** The daily card opened the home: it's done (the home books the next one). */
export async function completeDaily(followUpId: string): Promise<void> {
  const { resolveFollowUpStatus } = await import('./spine');
  await resolveFollowUpStatus(followUpId, 'done');
}
