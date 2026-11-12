/**
 * DEAR MAN's prep on the skill player (IE-01 Mode B, IE-B4 first PR; docs/design/dear-man-prep.md): pure rules for the
 * page before the skill (`dear_man_prep`, scripts/skills/dear_man_prep.py).
 *
 *   the prep page  ─► who's it with? (the picker; the safety route never reaches the skill)
 *     ─► the skill, with `$ctx.personId`, `frame: heads_up` after *it tends to go badly*, `refused: validation` once an
 *        ask to be heard by them has been turned down (Let go beside the asks), and what the way in carried:
 *        Recover's *Ask them* → the situation (`address`), the feeling chip its word names, and its band (fresh only);
 *        the check-in → the feeling chip its first matching word names
 */
import type { DearManHandoff } from '../data/dearManHandoff';
import { oneMessageCtx } from './dearManOne';
import type { KeptPerson, PickedPerson } from './people';

/** A word's DEAR MAN feeling chip id (`feel_<slug>`): the chips are named after the words ("Hurt" → `feel_hurt`). */
export function feelingChipId(word: string | null | undefined): string | null {
  const slug = (word ?? '').trim().toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_+|_+$/g, '');
  return slug ? `feel_${slug}` : null;
}

/** What the way in carries into the skill, ids only. A chip id the skill doesn't list is ignored by the player. */
export function prepEntryCtx(state: unknown, now: number = Date.now(), freshMinutes = 20): Record<string, string> {
  const s = (state && typeof state === 'object' ? state : {}) as { dearManHandoff?: unknown; checkinEmotions?: unknown };
  const h = s.dearManHandoff as Partial<DearManHandoff> | undefined;
  if (h && h.source === 'recovering-from-invalidation') {
    const out: Record<string, string> = { situationId: 'address' };
    const chip = feelingChipId(h.emotionName) ?? feelingChipId(h.emotionId);
    if (chip) out.feelingId = chip;
    const fresh = !!h.band && !!h.bandAt && now - Date.parse(h.bandAt) <= freshMinutes * 60_000;
    if (fresh && h.band) out.band = h.band;
    return out;
  }
  const words = Array.isArray(s.checkinEmotions) ? s.checkinEmotions.filter((w): w is string => typeof w === 'string') : [];
  const chip = feelingChipId(words[0]);
  return chip ? { feelingId: chip } : {};
}

/** The skill's context for the person picked (as One message's), plus what the way in carried. */
export function prepCtx(p: PickedPerson, people: readonly KeptPerson[] | null, entry: Readonly<Record<string, string>>): Record<string, string> {
  return { ...entry, ...oneMessageCtx(p, people) };
}
