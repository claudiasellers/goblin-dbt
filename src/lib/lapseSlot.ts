/**
 * The lapse plan after an acted *yes* (DT-09 part 2, docs/design/habit-plan.md): when an urge tool's close says the
 * person acted on the pull (Hold to wait, Ride it out: *yes* or *partly*), and they kept a habit plan for the same
 * behaviour, the close shows the plan they wrote for a slip, under "A slip isn't a relapse. Here's what you planned."
 * Pure: the slice, the visit's urge, and When it's a habit's own content (its copy, its behaviour → urge props and its
 * lapse labels), so nothing here duplicates the skill.
 */
import type { ProfileSlices } from '../data/profileTypes';
import type { SkillDef } from '../data/skillTypes';
import type { ActedOnUrge } from '../data/spineTypes';

/** The tools whose close asks *Did you act on it?* and read the `abstinencePlans` slice. */
export const LAPSE_SLOT_TOOLS = ['pause', 'urge-surfing'] as const;
/** The answers that mean they acted on it (fully or partly). */
export const ACTED: readonly ActedOnUrge[] = ['yes', 'partly'];
/** Behaviours whose slip carries the overdose line (the skill's `after_use` step: drink or drugs). */
const SUBSTANCES = ['drink', 'drugs'];

export interface LapseSlot {
  planId: string;
  title: string;
  /** The lapse plan, in the order kept: chip labels, then the person's own words. */
  items: string[];
  /** Drink or drugs: tolerance drops after a break (the skill's after_use title and hint). */
  afterUse: { title: string; hint: string } | null;
}

/**
 * The plan to show, or null: the tool reads the slice, the person acted on it, the visit picked a pull that a kept
 * plan's behaviour shares (When it's a habit's `what` options carry the urge id), newest plan first. A plan in the
 * person's own words names no behaviour the app can match, so it's never guessed at.
 */
export function lapseSlotFor(
  toolId: string,
  acted: ActedOnUrge | null | undefined,
  urgeIds: readonly string[],
  plans: ProfileSlices['abstinencePlans'] | undefined,
  habit: SkillDef | undefined,
): LapseSlot | null {
  if (!(LAPSE_SLOT_TOOLS as readonly string[]).includes(toolId) || !acted || !ACTED.includes(acted)) return null;
  if (!plans?.length || !urgeIds.length || !habit) return null;
  const behaviours = new Set(
    (habit.options.what ?? []).filter((o) => typeof o.urge === 'string' && urgeIds.includes(o.urge as string) && o.value !== 'hurt').map((o) => o.value),
  );
  const plan = plans.find((p) => p.whatIds.some((w) => behaviours.has(w)));
  if (!plan) return null;
  const label = new Map((habit.options.lapse ?? []).map((o) => [o.value, o.label]));
  const items = [...plan.lapseIds.map((id) => label.get(id)).filter((x): x is string => !!x), ...(plan.lapseOwn ? [plan.lapseOwn] : [])];
  if (!items.length) return null;
  const substance = plan.whatIds.some((w) => SUBSTANCES.includes(w));
  return {
    planId: plan.id,
    title: habit.copy.slipped_title,
    items,
    afterUse: substance ? { title: habit.copy.after_use_title, hint: habit.copy.after_use_hint } : null,
  };
}
