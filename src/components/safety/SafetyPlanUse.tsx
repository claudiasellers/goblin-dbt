import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SafetyContent, SafetyCountry } from '../../data/safetyTypes';
import { pickedLabels, saferChips, stepsToUse, type SafetyPlan } from '../../lib/safetyPlan';
import { PlanPeopleRow, SafetyPeople } from './SafetyPeople';

const quiet = 'min-h-11 px-2 text-sm underline underline-offset-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-transparent border-none cursor-pointer';
const primary = 'w-full min-h-11 px-4 py-3 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary';
const tile = 'flex items-center justify-between gap-3 min-h-12 px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] no-underline';

/** Where use mode was, for this browser session: opening a tool from step 2 and coming back picks up there. */
const AT_KEY = 'goblin.safety.planAt.v1';
const readAt = (): number => { try { return Number(sessionStorage.getItem(AT_KEY)) || 0; } catch { return 0; } };
const writeAt = (n: number | null) => { try { if (n === null) sessionStorage.removeItem(AT_KEY); else sessionStorage.setItem(AT_KEY, String(n)); } catch { /* private mode */ } };

/**
 * Use mode (CORE-02): any state, one step per screen, large targets. The plan's people (with a number) and the
 * emergency number are pinned on top of every step; the person's own line comes first. Each step: *I did this* or
 * *Next step*; nothing is required. Step 2 opens the crisis kit or a tool (and comes back here); step 4 calls or
 * texts with the message the person wrote. The end shows the lines again.
 */
export function SafetyPlanUse({ content, country, onCountry, plan, onDone, onContact, resume = false }: {
  content: SafetyContent; country: SafetyCountry | null; onCountry: (id: string) => void; plan: SafetyPlan;
  onDone: () => void; onContact?: (how: 'line' | 'person') => void; resume?: boolean;
}) {
  const c = content.flow.plan;
  const steps = stepsToUse(plan);
  const [i, setI] = useState(() => (resume ? Math.min(readAt(), steps.length) : 0));
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); writeAt(i); }, [i]);
  const finish = () => { writeAt(null); onDone(); };
  const title = (t: string) => <h2 ref={heading} tabIndex={-1} className="m-0 text-xl font-semibold leading-snug text-[var(--color-text-primary)] outline-none">{t}</h2>;
  const pinned = <PlanPeopleRow content={content} country={country} plan={plan} onContact={onContact} />;

  if (i >= steps.length) {
    return (
      <div className="space-y-4" data-testid="plan-use-end">
        {title(c.use.end)}
        <SafetyPeople content={content} country={country?.id ?? null} onCountry={onCountry} onContact={() => onContact?.('line')} />
        <button type="button" className={primary} onClick={finish}>{c.use.done}</button>
      </div>
    );
  }

  const step = steps[i];
  const stepTitle = step === 'hear' ? plan.hearOwn : (c.steps.find((s) => s.id === step)?.title ?? '');
  const list = (lines: string[]) => <ul className="m-0 pl-5 space-y-1 text-[var(--color-text-primary)] text-lg">{lines.map((l, k) => <li key={k}>{l}</li>)}</ul>;
  let body = null;
  switch (step) {
    case 'hear':
      body = null;
      break;
    case 'signs': case 'distract': case 'reasons':
      body = list([...pickedLabels(plan, step, c).map((x) => x.label), plan[`${step}Own`]].filter(Boolean));
      break;
    case 'safer': {
      const ok = new Set(saferChips(c, country).map((x) => x.id));
      body = list([...pickedLabels(plan, 'safer', c).filter((x) => ok.has(x.id)).map((x) => x.label), plan.saferOwn].filter(Boolean));
      break;
    }
    case 'coping':
      body = (
        <div className="space-y-2">
          {plan.kit && <Link to="/tool/crisis-kit?frame=crisis" className={tile}><span className="font-medium">{c.kit.open}</span><span aria-hidden>›</span></Link>}
          {pickedLabels(plan, 'coping', c).map((x) => x.toolId
            ? <Link key={x.id} to={`/tool/${x.toolId}`} className={tile}><span>{x.label}</span><span className="text-sm text-[var(--color-text-secondary)]">{c.use.openTool}</span></Link>
            : <p key={x.id} className={`${tile} m-0`}>{x.label}</p>)}
          {plan.copingOwn && <p className={`${tile} m-0`}>{plan.copingOwn}</p>}
        </div>
      );
      break;
    case 'people':
      body = <PlanPeopleRow content={content} country={null} plan={plan} onContact={onContact} full />;
      break;
    case 'pros':
      body = (
        <div className="space-y-3">
          {plan.pros.filter((p) => p.name || p.phone).map((p, k) => (
            <div key={k} className={tile}>
              <span>{[c.pros.roles.find((r) => r.id === p.role)?.label, p.name].filter(Boolean).join(' · ')}</span>
              {p.phone && <a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`} onClick={() => onContact?.('person')} className="font-medium underline">{c.use.call}</a>}
            </div>
          ))}
          <SafetyPeople content={content} country={country?.id ?? null} onCountry={onCountry} onContact={() => onContact?.('line')} heading={false} />
        </div>
      );
      break;
  }

  return (
    <div className="space-y-4 motion-safe:animate-[stepEnter_300ms_ease-out]" data-testid={`plan-use-${step}`}>
      {step !== 'people' && pinned}
      {step !== 'hear' && <p className="m-0 text-xs text-[var(--color-text-tertiary)]">{c.use.title}</p>}
      {title(stepTitle)}
      {body}
      {step === 'hear' ? (
        <button type="button" className={primary} onClick={() => setI(i + 1)}>{c.use.next}</button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={primary} onClick={() => setI(i + 1)}>{c.use.did}</button>
          <button type="button" onClick={() => setI(i + 1)}
            className="w-full min-h-11 px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] font-medium">{c.use.next}</button>
        </div>
      )}
      <div className="flex justify-between">
        {i > 0 ? <button type="button" className={quiet} onClick={() => setI(i - 1)}>{c.back}</button> : <span />}
        <button type="button" className={quiet} onClick={finish}>{content.flow.exit.button}</button>
      </div>
    </div>
  );
}
