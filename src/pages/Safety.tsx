import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SafetyContent } from '../data/safetyTypes';
import { QUICK_PLAN_KEY } from '../lib/safetyRoute';
import { getSafetyContent } from '../services/safety';
import { SafetyRoute } from '../components/safety/SafetyRoute';
import { PlanPeopleRow, SafetyPeople } from '../components/safety/SafetyPeople';
import { useSafetyPlan } from '../hooks/useSafetyPlan';
import { useSafetyCountry } from '../hooks/useSafetyCountry';

/**
 * Help & safety (`/safety`, CORE-01): reached from the header on every screen, Help me now and Today.
 *   - no query: *My safety plan* first once there is one (CORE-02), people, *I'm thinking about hurting myself*, and
 *     making or changing the plan (the quick plan is its draft);
 *   - `?say=1`: the route, said (`source: header`), or `&from=help_now` (Help me now's link);
 *   - `?checkin=<followUpId>`: the next-morning check (`safety_checkin`'s deep link).
 * Works signed out (nothing leaves the device) and offline once the content chunk has loaded.
 */
export function Safety() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const checkin = params.get('checkin');
  const say = params.get('say') === '1';
  const fromHelpNow = params.get('from') === 'help_now';
  const leave = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  }, [navigate]);

  return (
    <div className="max-w-md mx-auto space-y-4 pb-8">
      {checkin ? (
        <SafetyRoute key={`m:${checkin}`} entry="morning" source="followup" followUpId={checkin} onDone={leave} />
      ) : say ? (
        <SafetyRoute key="said" entry={fromHelpNow ? 'help_now' : 'said'} source={fromHelpNow ? 'help_now' : 'header'} onDone={leave} onBack={leave} />
      ) : (
        <SafetyHub onSay={() => setParams({ say: '1' })} />
      )}
    </div>
  );
}

function SafetyHub({ onSay }: { onSay: () => void }) {
  const navigate = useNavigate();
  const [content, setContent] = useState<SafetyContent | null>(null);
  const [country, setCountry] = useSafetyCountry(content);
  const { plan, devicePlan, save } = useSafetyPlan();
  const [moved, setMoved] = useState<'idle' | 'done' | 'no'>('idle');
  const [quick] = useState(() => {
    try { const v = localStorage.getItem(QUICK_PLAN_KEY); return v ? (JSON.parse(v) as Record<string, string>) : null; } catch { return null; }
  });
  useEffect(() => { void getSafetyContent().then(setContent).catch(() => { /* the fallback line below */ }); }, []);
  if (!content) {
    return <p className="text-[var(--color-text-primary)]">If you're in danger, call your local emergency number now.</p>;
  }
  const h = content.flow.header;
  const c = content.flow.plan;
  const tile = 'w-full min-h-11 px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-left text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)]';
  return (
    <>
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] m-0">{h.label}</h1>
      {/* CORE-02: *My safety plan* is the first item once there is one, its people pinned with it. */}
      {plan && (
        <>
          <button type="button" onClick={() => navigate('/safety/plan?use=1')} className={`${tile} font-semibold`} data-testid="hub-plan">{h.plan}</button>
          <PlanPeopleRow content={content} country={null} plan={plan} />
        </>
      )}
      {devicePlan && moved === 'idle' && (
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] space-y-2" data-testid="hub-move-plan">
          <p className="m-0 text-[var(--color-text-primary)]">{content.flow.signedOut.saveToAccount}</p>
          <div className="flex gap-3">
            <button type="button" className="min-h-11 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium"
              onClick={async () => setMoved((await save(devicePlan, c)) === 'account' ? 'done' : 'idle')}>{content.flow.signedOut.save}</button>
            <button type="button" className="min-h-11 px-2 text-sm underline text-[var(--color-text-secondary)] bg-transparent border-none" onClick={() => setMoved('no')}>
              {content.flow.signedOut.notNow}
            </button>
          </div>
        </div>
      )}
      <SafetyPeople content={content} country={country} onCountry={setCountry} />
      <button type="button" onClick={onSay} className={`${tile} font-medium`}>{h.say}</button>
      {plan ? (
        <button type="button" onClick={() => navigate('/safety/plan')} className={tile}>{c.edit}</button>
      ) : (
        <button type="button" onClick={() => navigate('/safety/plan')} className={tile} data-testid="hub-make-plan">
          <span className="block font-medium">{quick ? c.draftHub : h.makePlan}</span>
          <span className="block text-sm text-[var(--color-text-secondary)]">{quick ? c.draftHubSub : content.flow.passing.makePlanSub}</span>
        </button>
      )}
      {!plan && quick && (
        <section aria-label={h.plan} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <ul className="m-0 pl-5 space-y-1 text-[var(--color-text-primary)]">
            {content.flow.quickPlan.steps.map((st) => (quick[st.id] ? <li key={st.id}>{quick[st.id]}</li> : null))}
          </ul>
        </section>
      )}
    </>
  );
}
