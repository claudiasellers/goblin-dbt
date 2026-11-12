import { useEffect, useId, useState } from 'react';
import type { SkillDef } from '../../data/skillTypes';
import { habitPlanLines, type KeptHabitPlan as Kept } from '../../lib/habitPlan';
import { getSkillsContent, peekSkillsContent } from '../../services/skills';

/**
 * A kept habit plan in Me (DT-09, docs/design/habit-plan.md): the behaviour, what they'll turn to when a craving
 * comes and what they'll do if they slip, named through the plan's own skill. Renders nothing until the skill loads.
 */
export function KeptHabitPlan({ value }: { value: Record<string, unknown> }) {
  const uid = useId();
  const [skill, setSkill] = useState<SkillDef | null>(() => peekSkillsContent()?.skills.find((s) => s.id === 'habit_plan') ?? null);
  useEffect(() => {
    if (skill) return;
    let live = true;
    getSkillsContent().then((c) => { if (live) setSkill(c.skills.find((s) => s.id === 'habit_plan') ?? null); }).catch(() => {});
    return () => { live = false; };
  }, [skill]);
  if (!skill) return null;
  const { what, craving, slip } = habitPlanLines(value as Kept, skill);
  // Each list is named by its label (role="list": Tailwind's reset drops the list semantics in Safari).
  const list = (key: string, label: string, lines: string[]) => lines.length > 0 && (
    <div className="mt-1">
      {label && <p id={`${uid}-${key}`} className="text-xs text-[var(--color-text-tertiary)]">{label}</p>}
      <ul role="list" aria-labelledby={label ? `${uid}-${key}` : undefined}>
        {lines.map((l, i) => <li key={i} className="font-serif text-[var(--color-text-primary)]">{l}</li>)}
      </ul>
    </div>
  );
  return (
    <div className="text-sm text-[var(--color-text-secondary)]" data-kept-habit-plan="">
      {what && <p>{what}</p>}
      {list('craving', skill.copy.me_craving ?? '', craving)}
      {list('slip', skill.copy.me_slip ?? '', slip)}
    </div>
  );
}
