import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { PlanChip, SafetyContent, SafetyCountry } from '../../data/safetyTypes';
import {
  PLAN_STEPS, cleanPhone, saferChips, type ChipField, type PlanPerson, type PlanPro, type ProRole, type SafetyPlan,
} from '../../lib/safetyPlan';
import { fill } from '../../lib/safetyRoute';
import type { PlanSaved } from '../../hooks/useSafetyPlan';
import { PlanCard } from './SafetyPlanCard';

const choiceCls = 'min-h-11 px-3 py-2 text-left rounded-lg border text-[var(--color-text-primary)] transition-colors bg-[var(--color-bg-card)]';
const quiet = 'min-h-11 px-2 text-sm underline underline-offset-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-transparent border-none cursor-pointer';
const primary = 'w-full min-h-11 px-4 py-3 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary';
const input = 'w-full min-h-11 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)]';
const card = 'p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]';

/** The build in progress, kept for this browser session so leaving to make the crisis kit loses nothing. */
const BUILD_KEY = 'goblin.safety.planBuild.v1';
function readBuild(): { plan: SafetyPlan; i: number } | null {
  try { const v = sessionStorage.getItem(BUILD_KEY); return v ? (JSON.parse(v) as { plan: SafetyPlan; i: number }) : null; } catch { return null; }
}
function writeBuild(v: { plan: SafetyPlan; i: number } | null): void {
  try { if (v) sessionStorage.setItem(BUILD_KEY, JSON.stringify(v)); else sessionStorage.removeItem(BUILD_KEY); } catch { /* private mode */ }
}

function Chips({ chips, picked, onToggle }: { chips: PlanChip[]; picked: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {chips.map((c) => {
        const on = picked.includes(c.id);
        return (
          <button key={c.id} type="button" aria-pressed={on} onClick={() => onToggle(c.id)}
            className={`${choiceCls} ${on ? 'border-[var(--color-border-accent)] bg-[var(--color-accent-soft,var(--color-bg-elevated))]' : 'border-[var(--color-border)]'}`}>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

function Own({ label, value, max, onChange }: { label: string; value: string; max: number; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block mb-1 text-sm text-[var(--color-text-secondary)]">{label}</span>
      <textarea value={value} maxLength={max} rows={2} onChange={(e) => onChange(e.target.value)} autoComplete="off"
        className={`${input} py-2`} />
    </label>
  );
}

interface Props {
  content: SafetyContent;
  country: SafetyCountry | null;
  /** The plan to start from: the kept one (changing it), the quick plan as a draft, or empty. */
  start: SafetyPlan;
  fromDraft: boolean;
  /** A carried flooded reading: a heads-up first (PRD: build in calm). */
  flooded: boolean;
  /** How many cards the person's crisis kit has (0: offer to make one). */
  kitCards: number;
  signedIn: boolean;
  save: (p: SafetyPlan) => Promise<PlanSaved>;
  onUse: () => void;
  onLeave: () => void;
}

/**
 * Build mode (CORE-02): nine steps, one per screen, every one skippable, in Stanley–Brown's order. The review step
 * shows the plan as one card and saves it. Kept for this browser session as it goes (leaving to make the crisis kit
 * and coming back picks up where it was).
 */
export function SafetyPlanBuild({ content, country, start, fromDraft, flooded, kitCards, signedIn, save, onUse, onLeave }: Props) {
  const c = content.flow.plan;
  const [state, setState] = useState(() => readBuild() ?? { plan: { ...start, kit: start.kit || kitCards > 0 }, i: -1 });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<PlanSaved | null>(null);
  const [headsUp, setHeadsUp] = useState(flooded);
  const heading = useRef<HTMLHeadingElement>(null);
  const { plan, i } = state;
  useEffect(() => { writeBuild(result ? null : state); }, [state, result]);
  useEffect(() => { heading.current?.focus(); }, [i, result, headsUp]);

  const set = (patch: Partial<SafetyPlan>) => setState((s) => ({ ...s, plan: { ...s.plan, ...patch } }));
  const go = (n: number) => setState((s) => ({ ...s, i: n }));
  const toggle = (field: ChipField, id: string) => {
    const k = `${field}Ids` as const;
    set({ [k]: plan[k].includes(id) ? plan[k].filter((x) => x !== id) : [...plan[k], id] } as Partial<SafetyPlan>);
  };
  const title = (t: string) => <h2 ref={heading} tabIndex={-1} className="m-0 text-xl font-semibold leading-snug text-[var(--color-text-primary)] outline-none">{t}</h2>;

  if (headsUp) {
    return (
      <div className="space-y-4" data-testid="plan-flooded">
        {title(c.flooded)}
        <button type="button" className={primary} onClick={() => setHeadsUp(false)}>{c.floodedGo}</button>
        <button type="button" className={quiet} onClick={onLeave}>{c.floodedLater}</button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-4" data-testid="plan-saved">
        {title(result === 'account' ? c.saved : result === 'device' ? c.savedDevice : c.saveFailed)}
        <PlanCard content={content} country={country} plan={plan} kitCards={kitCards} />
        <button type="button" className={primary} onClick={onUse}>{c.use.title}</button>
        <button type="button" className={quiet} onClick={onLeave}>{c.use.done}</button>
      </div>
    );
  }

  if (i < 0) {
    return (
      <div className="space-y-4" data-testid="plan-intro">
        {title(c.title)}
        <p className="m-0 text-[var(--color-text-secondary)]">{c.intro}</p>
        {fromDraft && <p className="m-0 text-sm text-[var(--color-text-secondary)]">{c.fromDraft}</p>}
        <button type="button" className={primary} onClick={() => go(0)}>{c.next}</button>
        <button type="button" className={quiet} onClick={onLeave}>{c.floodedLater}</button>
      </div>
    );
  }

  const step = c.steps[i];
  const last = PLAN_STEPS[i] === 'review';
  let body: ReactNode = null;
  switch (step.id) {
    case 'signs':
      body = <>
        {c.signGroups.map((g) => (
          <fieldset key={g.id} className="space-y-2 border-none p-0 m-0">
            <legend className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">{g.label}</legend>
            <Chips chips={g.chips} picked={plan.signsIds} onToggle={(id) => toggle('signs', id)} />
          </fieldset>
        ))}
        <Own label={c.ownLabel} value={plan.signsOwn} max={c.ownMax} onChange={(v) => set({ signsOwn: v })} />
      </>;
      break;
    case 'coping':
      body = <>
        <div className={card}>
          {kitCards > 0 ? (
            <>
              <label className="flex items-center gap-3 min-h-11 text-[var(--color-text-primary)] font-medium">
                <input type="checkbox" checked={plan.kit} onChange={(e) => set({ kit: e.target.checked })} className="w-5 h-5" />
                {fill(c.kit.has, { count: String(kitCards) })}
              </label>
              <Link to="/tool/crisis-kit?frame=build" className={quiet}>{c.kit.edit}</Link>
            </>
          ) : (
            <Link to="/tool/crisis-kit?frame=build" className="block no-underline">
              <span className="block font-medium text-[var(--color-text-primary)]">{c.kit.make}</span>
              <span className="block text-sm text-[var(--color-text-secondary)]">{c.kit.makeSub}</span>
            </Link>
          )}
        </div>
        <Chips chips={c.coping} picked={plan.copingIds} onToggle={(id) => toggle('coping', id)} />
        <Own label={c.ownLabel} value={plan.copingOwn} max={c.ownMax} onChange={(v) => set({ copingOwn: v })} />
      </>;
      break;
    case 'distract':
      body = <>
        <Chips chips={c.distract} picked={plan.distractIds} onToggle={(id) => toggle('distract', id)} />
        <Own label={c.ownLabel} value={plan.distractOwn} max={c.ownMax} onChange={(v) => set({ distractOwn: v })} />
      </>;
      break;
    case 'people':
      body = <PeopleRows content={content} people={plan.people} onChange={(people) => set({ people })} />;
      break;
    case 'pros':
      body = <>
        {country && country.lines.length > 0 && (
          <ul className="m-0 pl-5 space-y-1 text-[var(--color-text-secondary)] text-sm">
            {country.lines.filter((l) => l.kind !== 'poison').map((l) => <li key={l.id}>{l.name}</li>)}
          </ul>
        )}
        <ProRows content={content} pros={plan.pros} onChange={(pros) => set({ pros })} />
      </>;
      break;
    case 'safer':
      body = <>
        <p className="m-0 text-sm text-[var(--color-text-secondary)]">{content.flow.means.medsLine}</p>
        <Chips chips={saferChips(c, country)} picked={plan.saferIds} onToggle={(id) => toggle('safer', id)} />
        {country?.firearmPrompt && <p className="m-0 text-sm text-[var(--color-text-secondary)]">{content.flow.means.firearm}</p>}
        <Own label={c.saferOwn} value={plan.saferOwn} max={c.ownMax} onChange={(v) => set({ saferOwn: v })} />
      </>;
      break;
    case 'reasons':
      body = <>
        <Chips chips={c.reasons} picked={plan.reasonsIds} onToggle={(id) => toggle('reasons', id)} />
        <Own label={c.ownLabel} value={plan.reasonsOwn} max={c.ownMax} onChange={(v) => set({ reasonsOwn: v })} />
      </>;
      break;
    case 'hear':
      body = <Own label={c.ownLabel} value={plan.hearOwn} max={c.ownMax} onChange={(v) => set({ hearOwn: v })} />;
      break;
    case 'review':
      body = <PlanCard content={content} country={country} plan={plan} kitCards={kitCards} onEdit={(s) => go(PLAN_STEPS.indexOf(s))} />;
      break;
  }

  return (
    <div className="space-y-4 motion-safe:animate-[stepEnter_300ms_ease-out]" data-testid={`plan-step-${step.id}`}>
      <p className="m-0 text-xs text-[var(--color-text-tertiary)]">{i + 1} / {PLAN_STEPS.length}</p>
      {title(step.title)}
      <p className="m-0 text-sm text-[var(--color-text-secondary)]">{step.hint}</p>
      {body}
      {last ? (
        <button type="button" className={primary} disabled={saving} onClick={async () => {
          setSaving(true);
          const r = await save(plan);
          setSaving(false);
          setResult(r);
        }}>{c.save}</button>
      ) : (
        <button type="button" className={primary} onClick={() => go(i + 1)}>{c.next}</button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className={quiet} onClick={() => go(i - 1)}>{c.back}</button>
        {!last && <button type="button" className={quiet} onClick={() => go(i + 1)}>{c.skip}</button>}
      </div>
      {!signedIn && last && <p className="m-0 text-xs text-[var(--color-text-tertiary)]">{content.flow.quickPlan.deviceSaved}</p>}
    </div>
  );
}

function PeopleRows({ content, people, onChange }: { content: SafetyContent; people: PlanPerson[]; onChange: (p: PlanPerson[]) => void }) {
  const c = content.flow.plan.person;
  const rows = people.length ? people : [{ name: '', phone: '', text: c.textDefault }];
  const put = (i: number, patch: Partial<PlanPerson>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className={`${card} space-y-2`} data-testid="plan-person">
          <input className={input} aria-label={c.name} placeholder={c.name} value={r.name} maxLength={40} autoComplete="off"
            onChange={(e) => put(i, { name: e.target.value })} />
          <input className={input} aria-label={c.phone} placeholder={c.phone} value={r.phone} maxLength={30} type="tel" inputMode="tel" autoComplete="off"
            onChange={(e) => put(i, { phone: cleanPhone(e.target.value) })} />
          <textarea className={`${input} py-2`} aria-label={c.text} value={r.text} maxLength={160} rows={2}
            onChange={(e) => put(i, { text: e.target.value })} />
          <div className="flex gap-3">
            {i > 0 && <button type="button" className={quiet} onClick={() => {
              const next = [...rows]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; onChange(next);
            }}>{c.up}</button>}
            <button type="button" className={quiet} onClick={() => onChange(rows.filter((_, j) => j !== i))}>{c.remove}</button>
          </div>
        </div>
      ))}
      {rows.length < c.max && (
        <button type="button" className={quiet} onClick={() => onChange([...rows, { name: '', phone: '', text: c.textDefault }])}>{c.add}</button>
      )}
    </div>
  );
}

function ProRows({ content, pros, onChange }: { content: SafetyContent; pros: PlanPro[]; onChange: (p: PlanPro[]) => void }) {
  const c = content.flow.plan;
  const put = (i: number, patch: Partial<PlanPro>) => onChange(pros.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-3">
      {pros.map((r, i) => (
        <div key={i} className={`${card} space-y-2`} data-testid="plan-pro">
          <select className={input} value={r.role} aria-label={c.pros.roles.find((x) => x.id === r.role)?.label}
            onChange={(e) => put(i, { role: e.target.value as ProRole })}>
            {c.pros.roles.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
          <input className={input} aria-label={c.person.name} placeholder={c.person.name} value={r.name} maxLength={40} autoComplete="off"
            onChange={(e) => put(i, { name: e.target.value })} />
          <input className={input} aria-label={c.person.phone} placeholder={c.person.phone} value={r.phone} maxLength={30} type="tel" inputMode="tel" autoComplete="off"
            onChange={(e) => put(i, { phone: cleanPhone(e.target.value) })} />
          <button type="button" className={quiet} onClick={() => onChange(pros.filter((_, j) => j !== i))}>{c.person.remove}</button>
        </div>
      ))}
      {pros.length < c.pros.max && (
        <button type="button" className={quiet} onClick={() => onChange([...pros, { role: 'therapist', name: '', phone: '' }])}>{c.pros.add}</button>
      )}
    </div>
  );
}
