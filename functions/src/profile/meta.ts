/**
 * Profile item meta ("still true?") — pure.
 */
import type { ItemPrompt, ProfileAreaId, ProfileItemMeta } from './types';

/** ask when past revisitAt; none when the kind has no revisit policy; quiet otherwise (fresh). */
export function profileItemPrompt(revisitAt: string | null, status: 'active' | 'set_aside', now: number): ItemPrompt {
  if (status !== 'active' || !revisitAt) return 'none';
  const t = Date.parse(revisitAt);
  if (Number.isNaN(t)) return 'none';
  return t <= now ? 'ask' : 'quiet';
}

/** Build the meta from a node's properties (dates already strings). */
export function metaFrom(p: Record<string, unknown>, now: number): ProfileItemMeta {
  const status = p.status === 'set_aside' ? 'set_aside' : 'active';
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
