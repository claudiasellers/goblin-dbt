/**
 * One message (IE-01 Mode A, IE-B3 second PR; docs/design/one-message.md): pure rules for the page before the skill
 * (`dear_man_one`, scripts/skills/dear_man_one.py) and for Recover's way in.
 *
 *   /tool/dear-man?mode=one  ─► who's it for? (the picker; the safety route never reaches the skill)
 *     ─► the skill, with `$ctx.personId`, `frame: heads_up` after *it tends to go badly*, and `refused: validation`
 *        once an ask to be heard by them has been turned down (Let go offered beside the asks, never in the way)
 *   Recover's *Ask them* after the chase pull ─► here, with the hurt word (`emotionId`) and its band as route state
 */
import type { DearManHandoff } from '../data/dearManHandoff';
import type { KeptPerson, PickedPerson } from './people';

export const ONE_MESSAGE_PATH = '/tool/dear-man?mode=one';

/** The skill's context for the person picked: as Say no's, plus a refused ask to be heard (Person.refusalsValidation ≥ 1). */
export function oneMessageCtx(p: PickedPerson, people: readonly KeptPerson[] | null): Record<string, string> {
  const kept = p.personId ? people?.find((k) => k.id === p.personId) : undefined;
  const refused = ((kept as { refusalsValidation?: number | null } | undefined)?.refusalsValidation ?? 0) >= 1;
  return {
    personId: p.personId ?? 'none',
    ...(p.route === 'heads_up' ? { frame: 'heads_up' } : {}),
    ...(refused ? { refused: 'validation' } : {}),
  };
}

/**
 * Recover's hand-off when the pull was to chase (`oneMessageOnly`): One message, not the full prep. Only what the skill
 * accepts goes across: the word they picked (first on *How did it feel?*, never picked for them) and the band.
 */
export function oneMessageState(h: DearManHandoff): { emotionId: string; band?: string } {
  return { emotionId: h.emotionId, ...(h.band ? { band: h.band } : {}) };
}
