/**
 * A skill that asks who first (DEAR MAN's debrief, Say no; people.md): the screen before the skill, pure. The page
 * shows the person picker from the skill's own copy (`picker_<key>`, one source in scripts/dear-man/content.py), with
 * the safety question when the answer isn't fresh; the safety route gets the safety screen and never the skill.
 */
import { PERSON_PICKER_COPY, pickedKept, pickerCopy, type KeptPerson, type PersonPickerCopy, type PickedPerson } from './people';

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

/**
 * A reopened visit (`?run=`, R9: a card asking how it went) skips the picker only when the run really reopens, and
 * never for someone now on the safety route (Gate 3): `skill` plays it; `safety` shows the safety screen for that
 * person (answered since the first visit); `picker` when there's nothing to reopen (no run, a failed read, a bad id),
 * a run of another version, so a fresh run never starts without who it's with and the safety question.
 */
export function reopenGate(run: Readonly<Record<string, unknown>> | null, people: readonly KeptPerson[] | null,
  skill: { id: string; version: string } | null):
  { kind: 'skill' } | { kind: 'safety'; person: PickedPerson } | { kind: 'picker' } {
  if (!run || typeof run !== 'object' || !skill) return { kind: 'picker' };
  // The player reopens only this skill's run of this version (resumeRun); anything else would start fresh.
  if (run.skillId !== skill.id || run.versionId !== skill.version || !Array.isArray(run.path)) return { kind: 'picker' };
  const ctx = run.ctx && typeof run.ctx === 'object' ? run.ctx as Record<string, unknown> : {};
  const id = typeof ctx.personId === 'string' ? ctx.personId : null;
  const kept = id ? (people ?? []).find((p) => p.id === id) : undefined;
  // Kept but never answered (an older record): ask, as a link's preset would.
  if (kept && !kept.risk) return { kind: 'picker' };
  if (kept) {
    const picked = pickedKept(kept);
    if (picked.route === 'safety') return { kind: 'safety', person: picked };
  }
  return { kind: 'skill' };
}

/** A `?run=` value the player can reopen (a session id). */
export const RUN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
