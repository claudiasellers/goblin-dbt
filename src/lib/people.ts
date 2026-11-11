/**
 * The person picker's steps (IE-03 minimal + D4, docs/design/people.md): pure, so the rules are tested without a DOM.
 * src/components/people/PersonPicker.tsx renders them; DEAR MAN's prep opens with it.
 *
 *   list ─ pick someone kept ─┬─ answer fresh ──────────────► done
 *        │                    └─ never asked / > 90 days / *Things changed* ─► safe
 *        └─ Someone new ─► new (name optional, role) ─► safe
 *   safe ─ Yes, mostly ─► done (safe yes, risk none)
 *        └─ No / Not sure ─► risk ─► done (harm · invalidating · unstated)
 *
 * The safety question is never skipped for someone without a fresh answer: that is D4's point (no confrontation plan
 * for someone dangerous). A kept answer is never shown back as a label on the person.
 */
import type { ProfileSlices } from '../data/profileTypes';
import { needsSafetyAsk, personRoute, type PersonRisk, type PersonRoute, type PersonSafe } from './personSafety';

export type KeptPerson = ProfileSlices['people'][number];
export type PickerStage = 'list' | 'new' | 'safe' | 'risk';

/** Who the flow is about, once the picker is done. `personId` only when they are kept (signed in, named). */
export interface PickedPerson {
  personId: string | null;
  label: string | null;
  role: string;
  safe: PersonSafe;
  risk: PersonRisk;
  route: PersonRoute;
}

/** The person being picked, before the safety answer. */
export interface PickerDraft {
  /** A kept person's id, or null for someone new. */
  personId: string | null;
  label: string;
  role: string | null;
}

/** Where the picker opens: the list when there is anyone to list. */
export function pickerStart(people: readonly KeptPerson[] | null): PickerStage {
  return people && people.length > 0 ? 'list' : 'new';
}

/** After a kept person is tapped: straight on with their answer, or the question first. */
export function afterPick(p: KeptPerson, o: { reask: boolean; now: number }): 'safe' | 'done' {
  return o.reask || needsSafetyAsk(p, o.now) || !p.risk ? 'safe' : 'done';
}

/** The safety question's answer: *Yes, mostly* ends it; *No* / *Not sure* asks what kind. */
export function afterSafe(safe: PersonSafe): 'risk' | 'done' {
  return safe === 'yes' ? 'done' : 'risk';
}

/** The finished pick. */
export function picked(d: PickerDraft & { role: string }, safe: PersonSafe, risk: PersonRisk, personId: string | null): PickedPerson {
  const label = d.label.trim() || null;
  return { personId, label, role: d.role, safe, risk, route: personRoute(risk) };
}

/** A kept person picked with a fresh answer: no question, their answer stands. */
export function pickedKept(p: KeptPerson): PickedPerson {
  const safe = p.safe ?? 'unsure';
  const risk = p.risk ?? 'unstated';
  return { personId: p.id, label: p.label, role: p.role, safe, risk, route: personRoute(risk) };
}

/**
 * What to write for a finished pick (profile/kinds.ts `person`): someone new and named, signed in → a keep (the
 * screen said so before the tap); a kept person asked again → an edit with the whole value. Nothing for someone
 * unnamed, or signed out.
 */
export function personWrite(
  d: PickerDraft & { role: string }, safe: PersonSafe, risk: PersonRisk, o: { signedIn: boolean; nowIso: string },
): { op: 'keep' | 'edit'; value: Record<string, string> } | null {
  const label = d.label.trim();
  if (!o.signedIn || !label) return null;
  return { op: d.personId ? 'edit' : 'keep', value: { label, role: d.role, safe, risk, safeAskedAt: o.nowIso } };
}

/** `{who}` in the picker's copy: the person's name, else "them". */
export function fillWho(text: string, label: string | null | undefined): string {
  return text.replace(/\{who\}/g, label && label.trim() ? label.trim() : 'them');
}

/** The copy keys the picker needs (DearManSafetyCopy, or a skill's copy); it renders only when every one is there. */
export const PERSON_PICKER_COPY = [
  'personWho', 'personNew', 'personNameLabel', 'personNameHint', 'personRoleLabel', 'personKeepLine', 'personNoNameLine',
  'personSignedOutLine', 'personGoOn', 'personChanged', 'personChangedHint', 'safeQuestion', 'safeYes', 'safeNo',
  'safeUnsure', 'riskQuestion', 'riskHarm', 'riskBadly', 'riskUnsaid',
] as const;
export type PersonPickerCopy = Record<(typeof PERSON_PICKER_COPY)[number], string>;

/** The copy, when every key is there (else null: the host keeps its older step). */
export function pickerCopy(c: Partial<Record<string, string>> | null | undefined): PersonPickerCopy | null {
  if (!c) return null;
  for (const k of PERSON_PICKER_COPY) if (typeof c[k] !== 'string' || !c[k]) return null;
  return c as PersonPickerCopy;
}

/** The safety route screen's copy (DearManSafetyCopy). */
export const PERSON_SAFETY_ROUTE_COPY = ['safetyRouteHeading', 'safetyRouteBody', 'safetyRouteEnding', 'safetyRouteBack'] as const;

/**
 * The picker's answer folded back into the list it was picked from, for this visit (the mounted `people` slice
 * doesn't reload after a keep or edit). A kept person answered again carries the new answer, dated now when it was
 * asked (stale before, or changed); a newly kept person goes first. Without this, *This is about someone else* would
 * offer the old answer, a fresh *Yes, mostly* for someone just named as dangerous.
 */
export function withAnswer(people: readonly KeptPerson[] | null, p: PickedPerson, nowIso: string): KeptPerson[] | null {
  if (!p.personId) return people ? [...people] : null;
  const list = people ?? [];
  const old = list.find((k) => k.id === p.personId);
  if (old) {
    const changed = old.safe !== p.safe || old.risk !== p.risk;
    const asked = changed || needsSafetyAsk(old, Date.parse(nowIso));
    return list.map((k) => (k.id === p.personId
      ? { ...k, safe: p.safe, risk: p.risk, safeAskedAt: asked ? nowIso : k.safeAskedAt }
      : k));
  }
  if (!p.label) return [...list];
  const meta = {
    id: p.personId, kind: 'person', area: 'my_people', status: 'active', source: 'user',
    confirmedAt: nowIso, revisitAt: null, prompt: 'none',
  } as KeptPerson['meta'];
  return [{ id: p.personId, label: p.label, role: p.role, safe: p.safe, risk: p.risk, safeAskedAt: nowIso, meta }, ...list];
}
