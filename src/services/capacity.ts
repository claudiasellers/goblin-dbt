/**
 * Capacity band content: band rules, hand-off primitives and copy. Read from the file the app ships
 * (src/data/content/capacity.json, generated from the graph by scripts/content-snapshot/build.mjs)
 * instead of the getCapacityContent Cloud Function, which every page load used to call.
 */
import type { CapacityContent } from '../data/capacityTypes';

let cached: Promise<CapacityContent> | null = null;

/** Fetched as its own chunk the first time it is needed, kept for the page's life; a failed fetch can be retried. */
export function getCapacityContent(): Promise<CapacityContent> {
  if (!cached) {
    cached = import('../data/content/capacity.json').then((m) => m.default.content as unknown as CapacityContent).catch((e) => {
      cached = null;
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
