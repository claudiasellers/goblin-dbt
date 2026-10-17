/**
 * Everything Two pulls shows, from the parts copy the app ships (signed-off rows only). Null when any of
 * it isn't ready, so neither ToolPage nor the page ever shows half a flow.
 */
import type { PartsContent } from '../data/partsContentTypes';
import { parsePullsEntry, resolveVisit, twoPullsReady, type PullsKnownPart } from '../lib/twoPullsSave';
import { getPartsContent } from './partsContent';
import { getProfileContext } from './profile';
import { profileCache } from '../lib/profileCache';

export async function loadTwoPullsContent(): Promise<PartsContent | null> {
  const parts = await getPartsContent();
  return twoPullsReady(parts) ? parts : null;
}

/**
 * ToolPage's gate for Two pulls: the copy ships and the address resolves (two parts the person keeps,
 * or a pair that ships). A failed profile read lets the page open (it decides again, and shows "not
 * found" itself if it still can't say who the visit is with).
 */
export async function twoPullsOpens(search: string): Promise<boolean> {
  const content = await loadTwoPullsContent();
  const entry = parsePullsEntry(search);
  if (!content || !entry) return false;
  if (entry.kind === 'pair') return resolveVisit(content, entry, []) !== null;
  try {
    // The same read the page makes next (useProfileContext): through the cache, so it isn't made twice.
    const cached = profileCache.get('two-pulls', Date.now()) as { version: number; slices: unknown } | null;
    let slices: unknown = cached?.slices;
    if (!cached) {
      const x = await getProfileContext('two-pulls');
      profileCache.set('two-pulls', x.version, { version: x.version, slices: x.slices }, Date.now());
      slices = x.slices;
    }
    const known = (slices as { parts?: PullsKnownPart[] | null } | null)?.parts ?? [];
    return resolveVisit(content, entry, known) !== null;
  } catch {
    return true;
  }
}
