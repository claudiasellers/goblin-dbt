/**
 * When it's a habit (DT-09, docs/design/habit-plan.md), pure: a kept plan (`abstinence_plan`) as Me shows it, its ids
 * named through the skill's own options (never a copy of its labels).
 */
import type { SkillDef } from '../data/skillTypes';

/** A kept plan's value (functions/src/profile/kinds.ts `abstinence_plan`). */
export interface KeptHabitPlan {
  whatIds?: string[]; whatOwn?: string | null; spanIds?: string[];
  lapseIds?: string[]; lapseOwn?: string | null; buildIds?: string[]; buildOwn?: string | null;
}

export interface HabitPlanLines { what: string | null; craving: string[]; slip: string[] }

/** The behaviour (their words, else the chip), what they'll turn to and what they'll do if they slip (picks, then own words). */
export function habitPlanLines(plan: KeptHabitPlan, skill: SkillDef): HabitPlanLines {
  const name = (list: string, ids: string[] | undefined) => (ids ?? [])
    .map((id) => skill.options[list]?.find((o) => o.value === id)?.label)
    .filter((x): x is string => !!x);
  const own = (x: string | null | undefined) => (x && x.trim() ? [x.trim()] : []);
  return {
    what: plan.whatOwn?.trim() || name('what', plan.whatIds)[0] || null,
    craving: [...name('build', plan.buildIds), ...own(plan.buildOwn)],
    slip: [...name('lapse', plan.lapseIds), ...own(plan.lapseOwn)],
  };
}
