/**
 * The lapse plan after an acted *yes* (DT-09 part 2, docs/design/habit-plan.md): when an urge tool's close says the
 * person acted on the pull (Hold to wait, Ride it out: *yes* or *partly*), and they kept a habit plan for a behaviour
 * that pull covers, the close shows the plan they wrote for a slip, under "A slip isn't a relapse. Here's what you
 * planned." Pure: the slice, the visit's urge, and When it's a habit's own content (its copy, its behaviour → urge
 * props, its behaviour and lapse labels), so nothing here duplicates the skill.
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
/** At most this many plans under one close (one pull, e.g. *use*, can cover several behaviours). */
const MOST = 3;

export interface LapsePlan {
  planId: string;
  /** The behaviour's label, shown only when more than one plan matches (which plan is which). */
  behaviour: string | null;
  /** The lapse plan, in the order kept: chip labels, then the person's own words. */
  items: string[];
}

export interface LapseSlot {
  title: string;
  plans: LapsePlan[];
  /** Any matching plan for drink or drugs: tolerance drops after a break (the skill's after_use title and hint). */
  afterUse: { title: string; hint: string } | null;
}

/**
 * What to show, or null: the tool reads the slice, the person acted on it, and the visit picked a pull that a kept
 * plan's behaviour shares (When it's a habit's `what` options carry the urge id). Hold to wait's *use* covers drinking,
 * drugs, smoking, bingeing, gambling and spending, and the app can't tell which one this was, so every matching
 * behaviour's newest plan shows, each under its behaviour, newest first. A plan in the person's own words names no
 * behaviour the app can match, so it's never guessed at.
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
  const whats = (habit.options.what ?? []).filter((o) => typeof o.urge === 'string' && urgeIds.includes(o.urge as string) && o.value !== 'hurt');
  const behaviourLabel = new Map(whats.map((o) => [o.value, o.label]));
  const lapseLabel = new Map((habit.options.lapse ?? []).map((o) => [o.value, o.label]));
  const seen = new Set<string>();
  const matched: Array<{ plan: ProfileSlices['abstinencePlans'][number]; what: string; items: string[] }> = [];
  for (const plan of plans) {
    const what = plan.whatIds.find((w) => behaviourLabel.has(w));
    if (!what || seen.has(what)) continue;
    const items = [...plan.lapseIds.map((id) => lapseLabel.get(id)).filter((x): x is string => !!x), ...(plan.lapseOwn ? [plan.lapseOwn] : [])];
    if (!items.length) continue;
    seen.add(what);
    matched.push({ plan, what, items });
    if (matched.length >= MOST) break;
  }
  if (!matched.length) return null;
  const many = matched.length > 1;
  const substance = matched.some((m) => SUBSTANCES.includes(m.what));
  return {
    title: habit.copy.slipped_title,
    plans: matched.map((m) => ({ planId: m.plan.id, behaviour: many ? behaviourLabel.get(m.what) ?? null : null, items: m.items })),
    afterUse: substance ? { title: habit.copy.after_use_title, hint: habit.copy.after_use_hint } : null,
  };
}
