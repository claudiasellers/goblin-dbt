/**
 * A skill that asks who first (DEAR MAN's debrief, Say no; people.md): the screen before the skill, pure. The page
 * shows the person picker from the skill's own copy (`picker_<key>`, one source in scripts/dear-man/content.py), with
 * the safety question when the answer isn't fresh; the safety route gets the safety screen and never the skill.
 */
import { PERSON_PICKER_COPY, pickerCopy, type PersonPickerCopy, type PickedPerson } from './people';

/** The picker's copy from a skill's: its own question (`questionKey`) and every other line the prep's. Or null. */
export function personFirstPickerCopy(copy: Readonly<Record<string, string>> | null | undefined, questionKey: string): PersonPickerCopy | null {
  if (!copy) return null;
  return pickerCopy(Object.fromEntries(PERSON_PICKER_COPY.map((k) => [k, copy[k === 'personWho' ? `picker_${questionKey}` : `picker_${k}`]])));
}

export interface PersonSafetyScreenCopy { safetyRouteHeading: string; safetyRouteBody: string; safetyRouteEnding: string; safetyRouteBack: string }

/** The safety screen's copy with the skill's own heading (`headingKey`), or null when any line is missing. */
export function personFirstSafetyCopy(copy: Readonly<Record<string, string>> | null | undefined, headingKey: string): PersonSafetyScreenCopy | null {
  const k = (key: string) => copy?.[`picker_${key}`] ?? '';
  const c = { safetyRouteHeading: k(headingKey), safetyRouteBody: k('safetyRouteBody'),
    safetyRouteEnding: k('safetyRouteEnding'), safetyRouteBack: k('safetyRouteBack') };
  return Object.values(c).every(Boolean) ? c : null;
}

/**
 * Say no's context (docs/design/say-no.md): the kept person's id, or `none` when nobody is kept, and *it tends to go
 * badly* as the `heads_up` frame (keep it short and written). The safety route never gets here.
 */
export function sayNoCtx(p: PickedPerson): Record<string, string> {
  return { personId: p.personId ?? 'none', ...(p.route === 'heads_up' ? { frame: 'heads_up' } : {}) };
}
