/**
 * Cope Ahead's after card on Today (docs/design/cope-ahead.md, "Today, afterwards"; FollowUpType
 * `cope_ahead_after`). Pure: the words from cope-ahead.json's `after` lines, the situation's after name and
 * the plan line from the visit's ids (getToday's `item.plan`, functions/src/spine/copeAheadAfter.ts).
 *
 * 1. "How did {afterName} go?" — Better than I feared · About what I expected · Harder than I expected ·
 *    It hasn't happened yet (snoozes 24 h, stores nothing).
 * 2. "Did your plan help?", with "Your plan: {plan}" above the chips — Used it, it helped · Used it, not
 *    sure · Didn't use it · Skip.
 *
 * Both answers go in one resolve when the second is tapped (resolveCopeAheadAfter). Leaving after the
 * first stores the first alone: the card sends it as it goes (CopeAheadAfterCard).
 */
import type { CopeAheadContent, CopeWhen } from '../data/copeAheadTypes';
import type { CopeAheadPlanIds, PlanHelped, ScheduleFollowUpInput } from '../services/spine';
import { planLine } from './copeAheadPlan';
import { dueAtFor } from './spine/windows';

export const COPE_AHEAD_AFTER_TYPE = 'cope_ahead_after';

/** The first question's chips: the follow-up type's choice id → its `after` line. */
export const HOW_CHOICES = [
  { id: 'better', key: 'after_better' },
  { id: 'as_expected', key: 'after_expected' },
  { id: 'harder', key: 'after_harder' },
  { id: 'not_yet', key: 'after_not_yet' },
] as const;
export type HowChoiceId = (typeof HOW_CHOICES)[number]['id'];
/** It hasn't happened yet: the type's snooze choice (24 h), never stored. */
export const NOT_YET: HowChoiceId = 'not_yet';

/** The second question's chips: the answer (null is Skip) → its `after` line. */
export const PLAN_CHOICES: ReadonlyArray<{ id: PlanHelped | null; key: string }> = [
  { id: 'helped', key: 'after_plan_helped' },
  { id: 'unsure', key: 'after_plan_unsure' },
  { id: 'unused', key: 'after_plan_unused' },
  { id: null, key: 'after_skip' },
];

/** Every `after` line the card says. Without all of them the card falls back to Today's plain card. */
export const AFTER_REQUIRED = ['after_q', 'after_plan_q', 'after_plan_line', ...HOW_CHOICES.map((c) => c.key), ...PLAN_CHOICES.map((c) => c.key)] as const;

export const afterReady = (content: Pick<CopeAheadContent, 'after'> | null | undefined): boolean =>
  !!content && AFTER_REQUIRED.every((k) => typeof content.after?.[k] === 'string' && content.after[k].trim() !== '');

const fill = (s: string, slots: Record<string, string>): string => s.replace(/\{(\w+)\}/g, (m, k: string) => slots[k] ?? m);

/** The situation's after name; one in the person's own words (or none known) is the "Something else" row's ("it"). */
export function afterName(content: Pick<CopeAheadContent, 'situations'>, plan: Pick<CopeAheadPlanIds, 'situationId'> | null | undefined): string {
  const named = plan?.situationId ? content.situations.find((s) => s.id === plan.situationId)?.afterName : undefined;
  return named || content.situations.find((s) => s.id === 'other')?.afterName || 'it';
}

export interface AfterCardCopy {
  question: string;
  how: Array<{ id: HowChoiceId; label: string }>;
  planQuestion: string;
  /** "Your plan: {plan}", or null when the visit's plan doesn't compose (nothing stored, or an id gone). */
  planLine: string | null;
  plan: Array<{ id: PlanHelped | null; label: string }>;
}

/** The card's words for this follow-up, or null when a line is missing. */
export function afterCardCopy(content: CopeAheadContent | null | undefined, plan: CopeAheadPlanIds | null | undefined): AfterCardCopy | null {
  if (!content || !afterReady(content)) return null;
  const a = content.after;
  const line = plan ? planLine(content, plan).text : '';
  return {
    question: fill(a.after_q, { afterName: afterName(content, plan) }),
    how: HOW_CHOICES.map((c) => ({ id: c.id, label: a[c.key] })),
    planQuestion: a.after_plan_q,
    planLine: line ? fill(a.after_plan_line, { plan: line }) : null,
    plan: PLAN_CHOICES.map((c) => ({ id: c.id, label: a[c.key] })),
  };
}

/**
 * The keep screen's "Want me to ask how it went?" Yes: the follow-up to schedule for screen 1's when
 * (ext.ca.when is the window chip: today 20:00, tomorrow 18:00, this week +4 days 18:00, later +7 days
 * 18:00, from the type's window in spine.json). Send it with scheduleFollowUps(items, { sourceSessionId:
 * the visit's ToolSession id }): the server takes it only on the caller's own cope-ahead session.
 */
export function afterScheduleItem(type: { window?: Record<string, unknown> } | undefined, when: CopeWhen, id: string, now: Date): ScheduleFollowUpInput | null {
  const due = dueAtFor(type?.window, now, when);
  return due ? { id, type: COPE_AHEAD_AFTER_TYPE, dueAt: due.toISOString(), window: when } : null;
}
