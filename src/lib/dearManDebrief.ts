/**
 * DEAR MAN's debrief page (IE-B2, docs/design/dear-man-debrief.md): pure rules for the screen before the skill and
 * for the prep's links into it. The debrief itself is the `dear_man_debrief` skill (scripts/skills/dear_man_debrief.py).
 *
 *   ?mode=debrief[&person=<kept id>][&partId=<id>][&followUp=<id>]
 *     person kept, answer fresh, not the safety route ─► the skill, for them
 *     otherwise ─► the picker (people.md) ─┬─ safety route ─► the safety screen (never the skill)
 *                                          └─ else ─► the skill, `$ctx.personId` when they are kept
 */
import type { KeptPerson, PickedPerson } from './people';
import { pickedKept, type PersonPickerCopy } from './people';
import { personFirstPickerCopy, personFirstSafetyCopy, type PersonSafetyScreenCopy } from './personFirst';
import { needsSafetyAsk } from './personSafety';

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** The prep's "After the conversation → How did it go?" link: the same person (kept) and part, when there are. */
export function debriefLink(partId: string | null, personId: string | null): string {
  const q = new URLSearchParams({ mode: 'debrief' });
  if (personId && ID.test(personId)) q.set('person', personId);
  if (partId && ID.test(partId)) q.set('partId', partId);
  return `/tool/dear-man?${q.toString()}`;
}

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

/** The picker's copy from the skill's (`picker_<key>`, scripts/skills/dear_man_debrief.py), or null: the debrief's own question. */
export function debriefPickerCopy(copy: Readonly<Record<string, string>> | null | undefined): PersonPickerCopy | null {
  return personFirstPickerCopy(copy, 'personWhoDebrief');
}

/** The safety screen's copy on the debrief: its own heading (safety first, looking back can wait), or null. */
export function debriefSafetyCopy(copy: Readonly<Record<string, string>> | null | undefined): PersonSafetyScreenCopy | null {
  return personFirstSafetyCopy(copy, 'safetyRouteDebriefHeading');
}

/** DEAR MAN's situation types where the ask was to be heard (validation), as the debrief's projection counts them. */
export const VALIDATION_SITUATIONS: readonly string[] = ['address', 'pattern'];

/**
 * Let go (FAST's `?frame=let_go`) on the prep: once the debrief has counted a refused ask to be heard by this person
 * (Person.refusalsValidation ≥ 1), and this conversation is another ask to be heard. Offered, never in the way.
 */
export function offerLetGo(person: { refusalsValidation?: number | null } | null | undefined, situationType: string | null): boolean {
  return !!person && (person.refusalsValidation ?? 0) >= 1 && !!situationType && VALIDATION_SITUATIONS.includes(situationType);
}

/** The prep's "When is it happening?" chips, in order: the ask_outcome window's chip ids (practice-spine content.py). */
export const ASK_OUTCOME_CHIPS = ['today', 'tomorrow', 'this_week', 'unsure'] as const;
export type AskOutcomeChip = (typeof ASK_OUTCOME_CHIPS)[number];
