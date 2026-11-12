/**
 * The safety plan (CORE-02, Stanley & Brown 2012; docs/design/safety-route.md), pure: the plan's shape on the client,
 * what goes to `keepProfileItem` (kind `safety_plan`), the quick plan as a draft, the device copy for someone signed
 * out, and which steps use mode plays.
 *
 * Build mode: nine steps, each skippable (`PLAN_STEPS`). Use mode: one step per screen, the person's own line first,
 * then only the steps that hold something (the professionals and lines always do: the country's lines are there).
 * Step 2 is the crisis kit (DT-03), referenced through `kit`, never copied.
 */
import type { PlanChip, SafetyCountry, SafetyPlanCopy, PlanStepId } from '../data/safetyTypes';
import type { ProfileSlices } from '../data/profileTypes';

export const PLAN_STEPS: readonly PlanStepId[] = ['signs', 'coping', 'distract', 'people', 'pros', 'safer', 'reasons', 'hear', 'review'];

/** Use mode's order: their own line first (PRD), then Stanley–Brown's order. */
export const USE_ORDER: readonly PlanStepId[] = ['hear', 'signs', 'coping', 'distract', 'people', 'pros', 'safer', 'reasons'];

/** The device copy, for someone signed out (nothing leaves the device). */
export const PLAN_KEY = 'goblin.safety.plan.v1';

export type ProRole = 'therapist' | 'gp' | 'care_team' | 'other';
export interface PlanPerson { name: string; phone: string; text: string }
export interface PlanPro { role: ProRole; name: string; phone: string }

export interface SafetyPlan {
  signsIds: string[]; signsOwn: string;
  copingIds: string[]; copingOwn: string; kit: boolean;
  distractIds: string[]; distractOwn: string;
  people: PlanPerson[];
  pros: PlanPro[];
  saferIds: string[]; saferOwn: string;
  reasonsIds: string[]; reasonsOwn: string;
  hearOwn: string;
}

export type ChipField = 'signs' | 'coping' | 'distract' | 'safer' | 'reasons';
const CHIP_FIELDS: readonly ChipField[] = ['signs', 'coping', 'distract', 'safer', 'reasons'];

export function emptyPlan(): SafetyPlan {
  return {
    signsIds: [], signsOwn: '', copingIds: [], copingOwn: '', kit: false, distractIds: [], distractOwn: '',
    people: [], pros: [], saferIds: [], saferOwn: '', reasonsIds: [], reasonsOwn: '', hearOwn: '',
  };
}

const t = (s: unknown): string => (typeof s === 'string' ? s.trim() : '');
const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** The quick plan (CORE-01's three lines, on the device) as the start of a full plan. */
export function planFromQuick(quick: { sign?: string; do?: string; contact?: string } | null, textDefault: string): SafetyPlan {
  const p = emptyPlan();
  if (!quick) return p;
  p.signsOwn = t(quick.sign);
  p.copingOwn = t(quick.do);
  const who = t(quick.contact);
  if (who) p.people = [{ name: who.slice(0, 40), phone: '', text: textDefault }];
  return p;
}

/** The `safetyPlan` slice (functions/src/profile/slices.ts) as a plan. */
export function planFromSlice(s: ProfileSlices['safetyPlan']): SafetyPlan | null {
  if (!s) return null;
  return {
    signsIds: ids(s.signsIds), signsOwn: t(s.signsOwn), copingIds: ids(s.copingIds), copingOwn: t(s.copingOwn), kit: s.kit === true,
    distractIds: ids(s.distractIds), distractOwn: t(s.distractOwn),
    people: (s.people ?? []).map((x) => ({ name: t(x.name), phone: t(x.phone), text: t(x.text) })),
    pros: (s.pros ?? []).map((x) => ({ role: x.role, name: t(x.name), phone: t(x.phone) })),
    saferIds: ids(s.saferIds), saferOwn: t(s.saferOwn), reasonsIds: ids(s.reasonsIds), reasonsOwn: t(s.reasonsOwn), hearOwn: t(s.hearOwn),
  };
}

/** A device copy read back (anything unreadable is dropped). */
export function planFromJson(v: unknown): SafetyPlan | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const p = emptyPlan();
  for (const f of CHIP_FIELDS) {
    p[`${f}Ids`] = ids(o[`${f}Ids`]);
    p[`${f}Own`] = t(o[`${f}Own`]);
  }
  p.kit = o.kit === true;
  p.hearOwn = t(o.hearOwn);
  const rows = (v: unknown, n: number): Record<string, unknown>[] =>
    (Array.isArray(v) ? v : []).slice(0, n).filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
  p.people = rows(o.people, 5).map((x) => ({ name: t(x.name), phone: t(x.phone), text: t(x.text) }));
  p.pros = rows(o.pros, 3)
    .filter((x) => ['therapist', 'gp', 'care_team', 'other'].includes(String(x.role)))
    .map((x) => ({ role: x.role as ProRole, name: t(x.name), phone: t(x.phone) }));
  return planHas(p) ? p : null;
}

const realPeople = (p: SafetyPlan) => p.people.filter((x) => t(x.name) || t(x.phone));
const realPros = (p: SafetyPlan) => p.pros.filter((x) => t(x.name) || t(x.phone));

/** Whether a step holds anything the person put there (pros: their own entries; the country's lines are extra). */
export function stepHas(p: SafetyPlan, step: PlanStepId): boolean {
  switch (step) {
    case 'signs': case 'distract': case 'safer': case 'reasons':
      return p[`${step}Ids`].length > 0 || !!t(p[`${step}Own`]);
    case 'coping': return p.kit || p.copingIds.length > 0 || !!t(p.copingOwn);
    case 'people': return realPeople(p).length > 0;
    case 'pros': return realPros(p).length > 0;
    case 'hear': return !!t(p.hearOwn);
    case 'review': return false;
  }
}

/** Whether the plan holds anything at all (the server refuses an empty one). */
export function planHas(p: SafetyPlan | null | undefined): boolean {
  return !!p && PLAN_STEPS.some((s) => stepHas(p, s));
}

/**
 * What `keepProfileItem({kind: 'safety_plan'})` receives (functions/src/profile/kinds.ts): empty fields left out,
 * ids filtered to the catalogue (a retired chip drops), the two contact lists as JSON strings (one own-words field
 * each, encrypted together).
 */
export function toKeep(p: SafetyPlan, copy: SafetyPlanCopy): Record<string, unknown> {
  const known: Record<ChipField, Set<string>> = {
    signs: new Set(copy.signGroups.flatMap((g) => g.chips.map((c) => c.id))),
    coping: new Set(copy.coping.map((c) => c.id)),
    distract: new Set(copy.distract.map((c) => c.id)),
    safer: new Set(copy.safer.map((c) => c.id)),
    reasons: new Set(copy.reasons.map((c) => c.id)),
  };
  const most: Record<ChipField, number> = { signs: 16, coping: 9, distract: 6, safer: 6, reasons: 6 };
  const out: Record<string, unknown> = {};
  for (const f of CHIP_FIELDS) {
    const picked = [...new Set(p[`${f}Ids`])].filter((id) => known[f].has(id)).slice(0, most[f]);
    if (picked.length) out[`${f}Ids`] = picked;
    const own = t(p[`${f}Own`]).slice(0, 200);
    if (own) out[`${f}Own`] = own;
  }
  if (p.kit) out.kit = true;
  const hear = t(p.hearOwn).slice(0, 200);
  if (hear) out.hearOwn = hear;
  const people = realPeople(p).slice(0, 5).map((x) => ({ name: t(x.name).slice(0, 40), phone: cleanPhone(x.phone), text: t(x.text).slice(0, 160) }));
  if (people.length) out.peopleOwn = JSON.stringify(people);
  const pros = realPros(p).slice(0, 3).map((x) => ({ role: x.role, name: t(x.name).slice(0, 40), phone: cleanPhone(x.phone) }));
  if (pros.length) out.prosOwn = JSON.stringify(pros);
  return out;
}

/** Only what a phone number can hold (the server's pattern), at most 30 characters. */
export function cleanPhone(s: string): string {
  return t(s).replace(/[^0-9+()\-\s.#*]/g, '').slice(0, 30);
}

/**
 * The steps use mode plays, in order: the person's own line first, then each step with something in it. The
 * professionals and lines always play (the country's lines are there even when the person added no one).
 */
export function stepsToUse(p: SafetyPlan): PlanStepId[] {
  return USE_ORDER.filter((s) => s === 'pros' || stepHas(p, s));
}

/** The labels a step's picked chips show, in the catalogue's order (a retired id shows nothing). */
export function pickedLabels(p: SafetyPlan, field: ChipField, copy: SafetyPlanCopy): PlanChip[] {
  const list: PlanChip[] = field === 'signs' ? copy.signGroups.flatMap((g) => g.chips) : copy[field];
  const set = new Set(p[`${field}Ids`]);
  return list.filter((c) => set.has(c.id));
}

/** The safer-space chips this country shows: the firearm one only where `Country.firearmPrompt`. */
export function saferChips(copy: SafetyPlanCopy, country: SafetyCountry | null | undefined): PlanChip[] {
  return copy.safer.filter((c) => !c.firearm || !!country?.firearmPrompt);
}

/** The people to show pinned above use mode and the route: the plan's people with a number, in their order. */
export function pinnedPeople(p: SafetyPlan | null): PlanPerson[] {
  return p ? realPeople(p).filter((x) => !!cleanPhone(x.phone)) : [];
}

/** Build mode opens with a heads-up on a carried flooded reading (PRD: build in calm); use mode never asks. */
export function buildNeedsHeadsUp(band: string | null | undefined): boolean {
  return band === 'flooded';
}
