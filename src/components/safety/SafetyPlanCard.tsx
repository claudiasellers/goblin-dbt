import type { SafetyContent, SafetyCountry, PlanStepId } from '../../data/safetyTypes';
import { pickedLabels, saferChips, stepHas, type SafetyPlan } from '../../lib/safetyPlan';
import { fill } from '../../lib/safetyRoute';

/**
 * The plan as one card (CORE-02 build step 9, the saved screen): each step that holds something, in Stanley–Brown's
 * order, the person's own words beside the chips. `onEdit` puts a change link on each step (the review step).
 */
export function PlanCard({ content, country, plan, kitCards, onEdit }: {
  content: SafetyContent; country: SafetyCountry | null; plan: SafetyPlan; kitCards: number; onEdit?: (s: PlanStepId) => void;
}) {
  const c = content.flow.plan;
  const titleOf = (s: PlanStepId) => c.steps.find((x) => x.id === s)?.title ?? s;
  const roleOf = (id: string) => c.pros.roles.find((r) => r.id === id)?.label ?? '';
  const safer = new Set(saferChips(c, country).map((x) => x.id));
  const rows: Array<{ step: PlanStepId; lines: string[] }> = [
    { step: 'hear', lines: plan.hearOwn ? [plan.hearOwn] : [] },
    { step: 'signs', lines: [...pickedLabels(plan, 'signs', c).map((x) => x.label), plan.signsOwn].filter(Boolean) },
    { step: 'coping', lines: [
      ...(plan.kit && kitCards > 0 ? [fill(c.kit.has, { count: String(kitCards) })] : []),
      ...pickedLabels(plan, 'coping', c).map((x) => x.label), plan.copingOwn].filter(Boolean) },
    { step: 'distract', lines: [...pickedLabels(plan, 'distract', c).map((x) => x.label), plan.distractOwn].filter(Boolean) },
    { step: 'people', lines: plan.people.filter((p) => p.name || p.phone).map((p) => [p.name, p.phone].filter(Boolean).join(' · ')) },
    { step: 'pros', lines: plan.pros.filter((p) => p.name || p.phone).map((p) => [roleOf(p.role), p.name, p.phone].filter(Boolean).join(' · ')) },
    { step: 'safer', lines: [...pickedLabels(plan, 'safer', c).filter((x) => safer.has(x.id)).map((x) => x.label), plan.saferOwn].filter(Boolean) },
    { step: 'reasons', lines: [...pickedLabels(plan, 'reasons', c).map((x) => x.label), plan.reasonsOwn].filter(Boolean) },
  ];
  return (
    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] space-y-3" data-testid="plan-card">
      {rows.map(({ step, lines }) => (
        <section key={step} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="m-0 text-sm font-semibold text-[var(--color-text-primary)]">{titleOf(step)}</h3>
            {onEdit && <button type="button" onClick={() => onEdit(step)}
              className="min-h-11 px-2 text-sm underline underline-offset-4 text-[var(--color-text-secondary)] bg-transparent border-none cursor-pointer">{c.edit}</button>}
          </div>
          {stepHas(plan, step) || (step === 'coping' && lines.length)
            ? <ul className="m-0 pl-5 space-y-0.5 text-sm text-[var(--color-text-primary)]">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
            : <p className="m-0 text-sm text-[var(--color-text-tertiary)]">{c.empty}</p>}
        </section>
      ))}
    </div>
  );
}
