/** Capacity band content (getCapacityContent), cached per page load. */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { CapacityContent } from '../data/capacityTypes';

const getCapacityContentFn = httpsCallable<void, CapacityContent>(functions, 'getCapacityContent', { timeout: 20_000 });

let cached: Promise<CapacityContent> | null = null;

export function getCapacityContent(): Promise<CapacityContent> {
  if (!cached) {
    cached = getCapacityContentFn().then((r) => r.data).catch((e) => {
      cached = null; // a failed load can be retried
      throw e;
    });
  }
  return cached;
}

/**
 * "Come back to this later" from P2 (E3 §A4.2.6): a `resume_skill` follow-up whose Today card deep
 * links to `/tool/<id>?resume=<hostSessionId>`. Resolves the follow-up id, or null when the type
 * isn't enabled (the chips are then pointless, but the draft is still on the device).
 */
export async function scheduleResumeLater(toolId: string, hostSessionId: string, chip: '1h' | 'evening' | 'tomorrow'): Promise<string | null> {
  const [{ getSpineContent, scheduleFollowUps }, { dueAtFor }, { newId }] = await Promise.all([
    import('./spine'), import('../lib/spine/windows'), import('../lib/spine/ids'),
  ]);
  const content = await getSpineContent();
  const type = content.followUpTypes.find((t) => t.id === 'resume_skill' && t.enabled);
  const due = type ? dueAtFor(type.window, new Date(), chip) : null;
  if (!type || !due) return null;
  const ids = await scheduleFollowUps(
    [{ id: newId(), type: 'resume_skill', dueAt: due.toISOString(), window: chip, notify: { inTab: true, push: false } }],
    { sourceSessionId: hostSessionId, sourceToolId: toolId },
  );
  return ids[0] ?? null;
}
