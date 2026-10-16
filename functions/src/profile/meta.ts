/**
 * Profile item meta ("still true?") — pure.
 */
import type { ItemPrompt, ProfileAreaId, ProfileItemMeta, ProfileItemStatus } from './types';

/**
 * ask when past revisitAt; none when the kind has no revisit policy or the item is set aside; quiet
 * otherwise (fresh). A resting part is live, so it is still checked back with.
 */
export function profileItemPrompt(revisitAt: string | null, status: ProfileItemStatus, now: number): ItemPrompt {
  if (status === 'set_aside' || !revisitAt) return 'none';
  const t = Date.parse(revisitAt);
  if (Number.isNaN(t)) return 'none';
  return t <= now ? 'ask' : 'quiet';
}

/** Build the meta from a node's properties (dates already strings). */
export function metaFrom(p: Record<string, unknown>, now: number): ProfileItemMeta {
  // Anything unknown reads as active, as before; resting is kept (a part gone quiet, not set aside).
  const status: ProfileItemStatus = p.status === 'set_aside' || p.status === 'resting' ? p.status : 'active';
  const revisitAt = (p.revisitAt as string | null | undefined) ?? null;
  return {
    id: String(p.id),
    kind: String(p.kind ?? ''),
    area: (p.area as ProfileAreaId) ?? 'about_me',
    status,
    source: String(p.source ?? 'user'),
    confirmedAt: (p.confirmedAt as string | null | undefined) ?? null,
    revisitAt,
    prompt: profileItemPrompt(revisitAt, status, now),
  };
}

/** HH:MM (24 h). */
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
