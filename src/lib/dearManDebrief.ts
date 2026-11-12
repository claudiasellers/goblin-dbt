/**
 * DEAR MAN's debrief page (IE-B2, docs/design/dear-man-debrief.md): pure rules for the screen before the skill and
 * the context it hands the skill. The debrief itself is the `dear_man_debrief` skill (scripts/skills/dear_man_debrief.py).
 *
 *   ?mode=debrief[&person=<kept id>][&partId=<id>][&followUp=<id>]
 *     person kept, answer fresh, not the safety route ─► the skill, for them
 *     otherwise ─► the picker (people.md) ─┬─ safety route ─► the safety screen (never the skill)
 *                                          └─ else ─► the skill, `$ctx.personId` when they are kept
 */
import type { KeptPerson, PickedPerson } from './people';
import { pickedKept } from './people';
import { needsSafetyAsk } from './personSafety';

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * The person a link names, when the picker can be skipped for them: kept, with an answer that is still fresh and
 * not the safety route. Anyone else (unknown id, stale or never answered, the safety route) goes through the picker.
 */
export function presetPerson(people: readonly KeptPerson[] | null, personId: string | null, now: number): PickedPerson | null {
  if (!people || !personId) return null;
  const p = people.find((k) => k.id === personId);
  if (!p || !p.risk || needsSafetyAsk(p, now)) return null;
  const picked = pickedKept(p);
  return picked.route === 'safety' ? null : picked;
}

/**
 * The context the skill gets: the kept person's id, or `none` when the picker was used and nobody is kept (it also
 * clears one a link carried, and tells the projection not to fall back to a prep's person), and the part.
 */
export function debriefCtx(p: PickedPerson, partId: string | null): Record<string, string> {
  return { personId: p.personId ?? 'none', ...(partId && ID.test(partId) ? { partId } : {}) };
}
