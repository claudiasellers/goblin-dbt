import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ExerciseProgress } from '../../components/tools/ExerciseProgress';
import { ToolLoading } from '../../components/tools/ToolLoading';
import { ToolLoadError } from '../../components/tools/ToolLoadError';
import { choiceButton, choiceSelected, enterAnimation, inputField, linkButton, primaryButton, secondaryText } from '../../components/tools/oppositeAction/styles';
import { useToolSession } from '../../hooks/useToolSession';
import { getPleaseContent } from '../../services/please';
import { checkVerdict, factorsIn, laterOptions, nowOptions, orderAreas, ownText, toggle } from '../../lib/please';
import type { PleaseContent, PleaseOption } from '../../data/pleaseTypes';

type Stage = 'factors' | 'check' | 'feeling' | 'now' | 'later' | 'done';
const STEP: Record<Exclude<Stage, 'done'>, number> = { factors: 1, check: 2, feeling: 2, now: 3, later: 4 };
const OWN = 'own';

/**
 * "Running low" (PLEASE, DBT reducing vulnerability). For when the body is part of the problem:
 * tired, hungry, sick, hungover, not moving. Opposite Action sends tired / sleepy / bored /
 * unfocused / apathetic / indifferent here. All content from the graph (getPleaseContent);
 * nothing the user picks or writes is saved.
 */
export function Please() {
  const location = useLocation();
  const session = useToolSession();
  const emotionIds = useMemo(() => {
    const raw = (location.state as { checkinEmotions?: unknown } | null)?.checkinEmotions;
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  }, [location.state]);

  const [content, setContent] = useState<PleaseContent | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const [stage, setStage] = useState<Stage>('factors');
  const [factors, setFactors] = useState<string[]>([]);
  const [ownFactor, setOwnFactor] = useState('');
  const [checks, setChecks] = useState<string[]>([]);
  const [nowPick, setNowPick] = useState('');
  const [ownNow, setOwnNow] = useState('');
  const [later, setLater] = useState<string[]>([]);

  const fetchContent = useCallback(() => getPleaseContent()
    .then((c) => { setContent(c); setLoadError(false); })
    .catch(() => setLoadError(true))
    .finally(() => setRetrying(false)), []);
  useEffect(() => { void fetchContent(); }, [fetchContent]);
  const retry = () => { setRetrying(true); void fetchContent(); };

  const go = (next: Stage) => {
    if (next !== 'done') session.setStep(next);
    setStage(next);
  };

  if (loadError) return <ToolLoadError onRetry={retry} retrying={retrying} />;
  if (!content) return <ToolLoading label="Loading…" />;

  const c = content.copy;
  const nowList = nowOptions(content, factors);
  const laterList = laterOptions(content, factors);
  const label = (list: PleaseOption[], id: string) => list.find((o) => o.id === id)?.label ?? '';
  const nowLabel = nowPick === OWN ? ownText(ownNow) : label(content.now, nowPick);
  const canLeaveNow = nowPick === OWN ? ownText(ownNow).length > 0 : !!nowPick;

  const back: Partial<Record<Stage, Stage>> = { check: 'factors', feeling: 'check', now: 'check', later: 'now' };
  const progress = stage === 'done' ? null : (
    <ExerciseProgress
      current={STEP[stage]}
      total={4}
      stageName={c.stages[stage === 'feeling' ? 'check' : stage]}
      onBack={back[stage] ? () => go(back[stage]!) : undefined}
    />
  );

  const restart = () => {
    setFactors([]); setOwnFactor(''); setChecks([]); setNowPick(''); setOwnNow(''); setLater([]);
    go('factors');
  };

  let body: React.ReactNode;
  if (stage === 'factors') {
    body = (
      <>
        <Intro title={c.factors.title} text={c.factors.body} />
        {orderAreas(content, emotionIds).map((area) => (
          <fieldset key={area.id} className="space-y-2">
            <legend className="flex items-center gap-2 mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
              <span aria-hidden="true" className="inline-flex items-center justify-center min-w-8 h-8 px-1 rounded-lg bg-[var(--color-bg-secondary)] font-bold text-[var(--color-text-primary)]">
                {area.letter}
              </span>
              {area.name}
            </legend>
            {factorsIn(content, area.id).map((f) => (
              <Toggle key={f.id} on={factors.includes(f.id)} onClick={() => setFactors((l) => toggle(l, f.id))}>{f.label}</Toggle>
            ))}
          </fieldset>
        ))}
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">{c.factors.ownLabel}</span>
          <input maxLength={140} className={inputField} value={ownFactor} placeholder={c.factors.ownPlaceholder}
            onChange={(e) => setOwnFactor(e.target.value)} />
        </label>
        <button type="button" className={primaryButton} onClick={() => { session.markPracticed(); go('check'); }}>
          {factors.length || ownText(ownFactor) ? c.factors.next : c.factors.none}
        </button>
      </>
    );
  } else if (stage === 'check') {
    body = (
      <>
        <Intro title={c.check.title} text={c.check.body} />
        <div className="space-y-2" role="group" aria-label={c.check.title}>
          {content.check.map((k) => (
            <Toggle key={k.id} on={checks.includes(k.id)} onClick={() => setChecks((l) => toggle(l, k.id))}>{k.label}</Toggle>
          ))}
        </div>
        <button type="button" className={primaryButton}
          onClick={() => go(checkVerdict(content.check, checks) === 'feeling' ? 'feeling' : 'now')}>
          {c.check.next}
        </button>
      </>
    );
  } else if (stage === 'feeling') {
    // No emotion words are passed on: "tired" would send Opposite Action straight back here.
    const ftf = session.linkTo('find-the-feeling');
    const oa = session.linkTo('opposite-action');
    body = (
      <>
        <Intro title={c.feeling.title} text={c.feeling.body} />
        <Link className={`${choiceButton} block`} to={ftf.pathname} state={ftf.state}>{c.feeling.findTheFeeling} →</Link>
        <Link className={`${choiceButton} block`} to={oa.pathname} state={oa.state}>{c.feeling.oppositeAction} →</Link>
        <button type="button" className={linkButton} onClick={() => go('now')}>{c.feeling.continue}</button>
      </>
    );
  } else if (stage === 'now') {
    body = (
      <>
        <Intro title={c.now.title} text={c.now.body} />
        <div className="space-y-2" role="radiogroup" aria-label={c.now.title}>
          {nowList.map((o) => (
            <Toggle key={o.id} radio on={nowPick === o.id} onClick={() => setNowPick(o.id)}>{o.label}</Toggle>
          ))}
          <Toggle radio on={nowPick === OWN} onClick={() => setNowPick(OWN)}>{c.now.ownLabel}</Toggle>
        </div>
        {nowPick === OWN && (
          <input autoFocus maxLength={140} aria-label={c.now.ownLabel} className={inputField} value={ownNow}
            placeholder={c.now.ownPlaceholder} onChange={(e) => setOwnNow(e.target.value)} />
        )}
        <button type="button" className={primaryButton} disabled={!canLeaveNow} onClick={() => go('later')}>
          {c.now.next}
        </button>
      </>
    );
  } else if (stage === 'later') {
    const finish = (picked: string[]) => { setLater(picked); session.markComplete(); go('done'); };
    body = (
      <>
        <Intro title={c.later.title} text={c.later.body} />
        <div className="space-y-2" role="group" aria-label={c.later.title}>
          {laterList.map((o) => (
            <Toggle key={o.id} on={later.includes(o.id)} disabled={!later.includes(o.id) && later.length >= content.laterMax}
              onClick={() => setLater((l) => toggle(l, o.id, content.laterMax))}>{o.label}</Toggle>
          ))}
        </div>
        <button type="button" className={primaryButton} disabled={!later.length} onClick={() => finish(later)}>{c.later.next}</button>
        <button type="button" className={linkButton} onClick={() => finish([])}>{c.later.skip}</button>
      </>
    );
  } else {
    body = (
      <div className="p-6 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] space-y-4">
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">{c.done.title}</h3>
        <p className={secondaryText}>{c.done.body}</p>
        <PlanLine heading={c.done.nowLabel} items={[nowLabel]} />
        {later.length > 0 && <PlanLine heading={c.done.laterLabel} items={later.map((id) => label(content.later, id))} />}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="button" onClick={restart} className="py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary">
            {c.done.restart}
          </button>
          <Link to="/tools" className="py-3 px-4 rounded-lg border border-[var(--color-border)] text-center text-[var(--color-text-secondary)] lift-secondary">
            {c.done.otherTools}
          </Link>
        </div>
        <p className="text-sm text-[var(--color-text-tertiary)]">{c.done.footnote}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {progress}
      <div key={stage} className={`space-y-5 ${enterAnimation}`}>{body}</div>
    </div>
  );
}

function Intro({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className={secondaryText}>{text}</p>
    </div>
  );
}

function Toggle({ on, onClick, radio = false, disabled = false, children }: {
  on: boolean; onClick: () => void; radio?: boolean; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      role={radio ? 'radio' : undefined}
      aria-checked={radio ? on : undefined}
      aria-pressed={radio ? undefined : on}
      onClick={onClick}
      className={`${choiceButton} ${on ? choiceSelected : ''}`}
    >
      {on && <span aria-hidden="true">✓ </span>}
      {children}
    </button>
  );
}

function PlanLine({ heading, items }: { heading: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">{heading}</p>
      <ul className="space-y-1">
        {items.filter(Boolean).map((t) => <li key={t} className="text-[var(--color-text-primary)]">{t}</li>)}
      </ul>
    </div>
  );
}
