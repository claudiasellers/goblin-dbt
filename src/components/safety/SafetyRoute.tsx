import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { SafetyAnswer, SafetyChoice, SafetyContent } from '../../data/safetyTypes';
import {
  MORNING_KEY, QUICK_PLAN_KEY, medicalChoices, peopleFirst, questionFor, recordFor, startState, step, twiceHard,
  type SafetyEntry, type SafetyEvent, type SafetyRouteState,
} from '../../lib/safetyRoute';
import { newId } from '../../lib/spine/ids';
import { completeSafetyCheckin, getSafetyContent, saveSafetyCheck, scheduleSafetyCheckin } from '../../services/safety';
import { PlanPeopleRow, PoisonLines, SafetyPeople } from './SafetyPeople';
import { SafetyPlanUse } from './SafetyPlanUse';
import { useSafetyPlan } from '../../hooks/useSafetyPlan';
import type { SafetyPlan } from '../../lib/safetyPlan';
import { useSafetyCountry } from '../../hooks/useSafetyCountry';

export interface SafetyRouteResult {
  /** The SafetyCheck id, once an answer was given (the check-in stores it as `safetyCheckId`). */
  safetyCheckId: string | null;
  answer: SafetyAnswer | null;
}

interface Props {
  entry: SafetyEntry;
  /** `checkin` · `help_now` · `header` · `followup` · `module:<toolId>` (checkRecord.ts SAFETY_SOURCES). */
  source: string;
  sourceSessionId?: string | null;
  /** The morning check's follow-up, resolved when it's answered. */
  followUpId?: string | null;
  onDone: (r: SafetyRouteResult) => void;
  /** *Back to where I was*, when the route opened over something (a skill, a tool). */
  onBack?: () => void;
}

const card = 'p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]';
const choiceCls = 'w-full min-h-11 px-4 py-3 text-left rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)] transition-colors bg-[var(--color-bg-card)]';
const quiet = 'min-h-11 px-2 text-sm underline underline-offset-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-transparent border-none cursor-pointer';
const primary = 'w-full min-h-11 px-4 py-3 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary';

function Choices({ choices, onPick }: { choices: SafetyChoice[]; onPick: (id: string) => void }) {
  return (
    <div className="space-y-2" role="group">
      {choices.map((c) => <button key={c.id} type="button" className={choiceCls} onClick={() => onPick(c.id)}>{c.label}</button>)}
    </div>
  );
}

function readJson<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function writeJson(key: string, v: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode: kept for this visit only */ }
}

/**
 * The safety route (CORE-01, docs/design/safety-route.md) over the step machine `src/lib/safetyRoute.ts`.
 * Signed in, each step saves the visit (`saveSafetyCheck`, ids and enums only); signed out, nothing leaves the
 * device. The morning answers and the quick plan (the safety plan's draft) stay on the device; a saved plan (CORE-02)
 * plays in place of the quick plan, and its people show under the lines.
 * People are one tap away on every screen after the question, and *Back to where I was* whenever it opened over
 * something. Focus moves to each screen's heading.
 */
export function SafetyRoute({ entry, source, sourceSessionId, followUpId, onDone, onBack }: Props) {
  const { user } = useAuth();
  const signedIn = !!user;
  const [content, setContent] = useState<SafetyContent | null>(null);
  const [failed, setFailed] = useState(false);
  const [s, setS] = useState<SafetyRouteState>(() => startState(entry));
  const [country, setCountry] = useSafetyCountry(content);
  // CORE-02: the person's plan (account or device). Its people sit under the lines on every screen, and *Open your
  // plan* plays it in place; with none, the quick plan (three lines, the plan's draft).
  const { plan } = useSafetyPlan();
  const [visit, setVisit] = useState(() => ({ id: newId(), source }));
  const heading = useRef<HTMLHeadingElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    let live = true;
    getSafetyContent().then((c) => { if (live) setContent(c); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);

  const send = (e: SafetyEvent) => {
    // Not safe in the morning: a new visit, from the follow-up.
    if (e.type === 'morning' && e.id === 'not_safe') setVisit({ id: newId(), source: 'followup' });
    setS((prev) => step(prev, e, signedIn));
  };

  // Save the visit as it moves (the server only moves it forward). Best effort: the route never waits on it.
  const record = useMemo(() => recordFor(s, { id: visit.id, source: visit.source, sourceSessionId, country }), [s, visit, sourceSessionId, country]);
  const sentKey = useRef('');
  useEffect(() => {
    if (!signedIn || !record) return;
    const key = JSON.stringify(record);
    if (key === sentKey.current) return;
    sentKey.current = key;
    void saveSafetyCheck(record).catch(() => { /* offline or refused: the screens go on */ });
  }, [signedIn, record]);

  useEffect(() => { heading.current?.focus(); }, [s.screen]);

  useEffect(() => {
    if (s.screen !== 'done' || finished.current) return;
    finished.current = true;
    onDone({ safetyCheckId: record ? visit.id : null, answer: record?.answer ?? null });
  }, [s.screen, record, visit.id, onDone]);

  if (failed) {
    return (
      <div className={card}>
        <p className="m-0 text-[var(--color-text-primary)]">If you're in danger, call your local emergency number now.</p>
        <button type="button" className={quiet} onClick={onBack ?? (() => onDone({ safetyCheckId: null, answer: null }))}>
          {onBack ? 'Back' : 'Go on'}
        </button>
      </div>
    );
  }
  if (!content) return <div className="py-8 text-center text-[var(--color-text-secondary)]" role="status">…</div>;

  const f = content.flow;
  const people = (
    <>
      <SafetyPeople content={content} country={country} onCountry={setCountry} onContact={() => send({ type: 'contacted', how: 'line' })} />
      <PlanPeopleRow content={content} country={null} plan={plan} onContact={(how) => send({ type: 'contacted', how })} />
    </>
  );
  const leave = <button type="button" className={quiet} onClick={() => send({ type: 'leave' })}>{f.exit.button}</button>;
  const back = s.trail.length > 0 && s.screen !== 'done'
    ? <button type="button" className={quiet} onClick={() => send({ type: 'back' })}>Back</button> : null;
  const title = (t: string) => (
    <h2 ref={heading} tabIndex={-1} className="m-0 text-xl font-semibold leading-snug text-[var(--color-text-primary)] outline-none">{t}</h2>
  );
  const frame = (body: ReactNode, opts: { exit?: boolean } = {}) => (
    <div className="space-y-4 motion-safe:animate-[stepEnter_300ms_ease-out]" data-testid={`safety-${s.screen}`}>
      {body}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>{back}</div>
        <div className="flex flex-wrap gap-2">
          {opts.exit && leave}
          {onBack && <button type="button" className={quiet} onClick={onBack}>{f.exit.back}</button>}
        </div>
      </div>
    </div>
  );

  switch (s.screen) {
    case 'question': {
      const q = questionFor(content, s.entry);
      return frame(<>
        {peopleFirst(s) && people}
        {title(q.title)}
        <Choices choices={q.choices} onPick={(id) => send({ type: 'answer', id: id as SafetyAnswer })} />
      </>);
    }
    case 'declined':
      return frame(<>
        {title(f.declined.line)}
        {people}
        <button type="button" className={primary} onClick={() => send({ type: 'carry_on' })}>{f.passing.continue}</button>
      </>);
    case 'passing':
      return frame(<>
        {title(f.passing.line)}
        {people}
        <QuickPlanLink content={content} onOpen={() => send({ type: 'quick_plan' })} label={f.passing.makePlan} sub={f.passing.makePlanSub} plan={plan} />
        <button type="button" className={primary} onClick={() => send({ type: 'carry_on' })}>{f.passing.continue}</button>
      </>);
    case 'act':
      return frame(<>
        {title(f.act.title)}
        <Choices choices={f.act.choices} onPick={(id) => send({ type: 'act', id: id as 'yes' | 'no' | 'not_sure' })} />
        {people}
      </>, { exit: true });
    case 'kind':
      return frame(<>
        {title(f.act.kindTitle)}
        <Choices choices={f.act.kinds} onPick={(id) => send({ type: 'kind', id: id as 'took' | 'injury' | 'not_sure' })} />
        {people}
      </>, { exit: true });
    case 'medical':
      return frame(<>
        {title(f.act.medicalTitle)}
        <p className="m-0 text-[var(--color-text-primary)] font-medium">{f.act.medicalLine}</p>
        {s.kind !== 'injury' && <p className="m-0 text-[var(--color-text-secondary)]">{f.act.tookLine}</p>}
        {people}
        {s.kind !== 'injury' && <PoisonLines content={content} country={country} onContact={() => send({ type: 'contacted', how: 'line' })} />}
        <Choices choices={medicalChoices(content, s)} onPick={(id) => send({ type: 'medical', id: id as 'got_help' | 'getting_help' | 'not_that_kind' })} />
      </>);
    case 'first_aid':
      return frame(<>
        {title(f.act.firstAid)}
        <button type="button" className={primary} onClick={() => send({ type: 'first_aid_done' })}>{f.means.did}</button>
        {people}
      </>, { exit: true });
    case 'means':
      return frame(<>
        {s.answer === 'strong' && <p className="m-0 text-[var(--color-text-secondary)]">{f.strong.meansFirst}</p>}
        {title(f.means.title)}
        <Choices choices={f.means.choices} onPick={(id) => send({ type: 'means', id: id as 'yes' | 'not_sure' | 'no' })} />
        {people}
      </>, { exit: true });
    case 'means_actions':
      return frame(<MeansActions content={content} firearm={!!content.countries.find((c) => c.id === country)?.firearmPrompt}
        heading={title(f.means.actionsTitle)} onDone={(ids) => send({ type: 'means_done', ids })} />, { exit: true });
    case 'strong':
      return frame(<>
        {title(f.strong.title)}
        {people}
        <QuickPlanLink content={content} onOpen={() => send({ type: 'quick_plan' })} label={f.strong.quickPlan} sub={f.strong.quickPlanSub} plan={plan} />
      </>, { exit: true });
    case 'quick_plan':
      return plan
        ? frame(<SafetyPlanUse content={content} country={content.countries.find((c) => c.id === country) ?? null} onCountry={setCountry} plan={plan}
            onContact={(how) => send({ type: 'contacted', how })} onDone={() => { send({ type: 'plan_kept' }); send({ type: 'back' }); }} />)
        : frame(<QuickPlan content={content} heading={(t) => title(t)} onKept={() => send({ type: 'plan_kept' })} onClose={() => send({ type: 'back' })} />, { exit: true });
    case 'exit':
      return frame(<>
        {title(f.exit.title)}
        <Choices choices={f.exit.choices} onPick={(id) => send({ type: 'exit', id: id as 'plan' | 'contacted' | 'stop' })} />
        {people}
      </>);
    case 'checkin':
      return frame(<>
        {title(f.checkin.title)}
        <Choices choices={f.checkin.choices} onPick={(id) => {
          if (id === 'yes') void scheduleSafetyCheckin().catch(() => { /* offline: no card tomorrow */ });
          send({ type: 'checkin', id: id as 'yes' | 'no' });
        }} />
      </>);
    case 'morning':
      return frame(<>
        {title(f.morning.title)}
        <Choices choices={f.morning.choices} onPick={(id) => {
          const prev = readJson<{ answer: string; at: number }>(MORNING_KEY);
          writeJson(MORNING_KEY, { answer: id, at: Date.now(), prevHard: twiceHard(prev, Date.now()) });
          if (followUpId && signedIn) void completeSafetyCheckin(followUpId).catch(() => { /* card stays; it goes stale */ });
          send({ type: 'morning', id: id as 'okay' | 'hard' | 'not_safe' });
        }} />
      </>);
    case 'morning_answer': {
      const hard = s.morningAnswer === 'hard';
      const twice = hard && !!readJson<{ prevHard?: boolean }>(MORNING_KEY)?.prevHard;
      return frame(<>
        {title(hard ? f.morning.hard : f.morning.okay)}
        {twice && <p className="m-0 text-[var(--color-text-secondary)]">{f.morning.twiceHard}</p>}
        {hard && people}
        {hard && <QuickPlanLink content={content} onOpen={() => send({ type: 'quick_plan' })} label={f.strong.plan} sub="" onlyIfKept plan={plan} />}
        <button type="button" className={primary} onClick={() => onDone({ safetyCheckId: null, answer: null })}>Done</button>
      </>);
    }
    case 'done':
      return null;
  }
}

function MeansActions({ content, firearm, heading, onDone }: { content: SafetyContent; firearm: boolean; heading: ReactNode; onDone: (ids: string[]) => void }) {
  const m = content.flow.means;
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <>
      {heading}
      <div className="space-y-2" role="group">
        {m.actions.map((a) => (
          <button key={a.id} type="button" aria-pressed={picked.includes(a.id)} onClick={() => toggle(a.id)}
            className={`${choiceCls}${picked.includes(a.id) ? ' border-[var(--color-border-accent)] bg-[var(--color-accent-soft,var(--color-bg-elevated))]' : ''}`}>
            {a.label}
          </button>
        ))}
      </div>
      {firearm && <p className="m-0 text-sm text-[var(--color-text-secondary)]">{m.firearm}</p>}
      <button type="button" className={primary} onClick={() => onDone(picked)}>{m.did}</button>
    </>
  );
}

interface KeptQuickPlan { sign: string; do: string; contact: string; at: number }

function QuickPlanLink({ content, onOpen, label, sub, onlyIfKept, plan }: { content: SafetyContent; onOpen: () => void; label: string; sub: string; onlyIfKept?: boolean; plan: SafetyPlan | null }) {
  const kept = plan ?? readJson<KeptQuickPlan>(QUICK_PLAN_KEY);
  if (onlyIfKept && !kept) return null;
  return (
    <button type="button" onClick={onOpen} className={`${card} w-full text-left hover:border-[var(--color-border-accent)]`}>
      <span className="block font-medium text-[var(--color-text-primary)]">{kept ? content.flow.strong.plan : label}</span>
      {!kept && sub && <span className="block text-sm text-[var(--color-text-secondary)]">{sub}</span>}
    </button>
  );
}

/** Three screens, about a minute: kept on this device as the plan's draft (`/safety/plan` starts from it, CORE-02). */
function QuickPlan({ content, heading, onKept, onClose }: { content: SafetyContent; heading: (t: string) => ReactNode; onKept: () => void; onClose: () => void }) {
  const q = content.flow.quickPlan;
  const [kept] = useState(() => readJson<KeptQuickPlan>(QUICK_PLAN_KEY));
  const [vals, setVals] = useState<Record<string, string>>(() => ({ sign: kept?.sign ?? '', do: kept?.do ?? '', contact: kept?.contact ?? '' }));
  const [i, setI] = useState(0);
  const [saved, setSaved] = useState(false);
  if (saved) {
    return (
      <>
        {heading(q.deviceSaved)}
        <ul className="m-0 pl-5 space-y-1 text-[var(--color-text-primary)]">
          {q.steps.map((st) => vals[st.id] ? <li key={st.id}>{vals[st.id]}</li> : null)}
        </ul>
        <button type="button" className={primary} onClick={onClose}>Done</button>
      </>
    );
  }
  const st = q.steps[i];
  const last = i === q.steps.length - 1;
  return (
    <>
      {heading(st.title)}
      <label className="block">
        <span className="sr-only">{st.title}</span>
        <input type="text" value={vals[st.id]} maxLength={q.ownMax} placeholder={st.placeholder} autoComplete="off"
          onChange={(e) => setVals((v) => ({ ...v, [st.id]: e.target.value }))}
          className="w-full min-h-11 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)]" />
      </label>
      <button type="button" className={primary} onClick={() => {
        if (!last) { setI(i + 1); return; }
        writeJson(QUICK_PLAN_KEY, { sign: vals.sign.trim(), do: vals.do.trim(), contact: vals.contact.trim(), at: Date.now() });
        setSaved(true);
        onKept();
      }}>{last ? q.save : 'Next'}</button>
      {i > 0 && <button type="button" className={quiet} onClick={() => setI(i - 1)}>Back</button>}
    </>
  );
}
