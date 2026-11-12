import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SafetyContent } from '../data/safetyTypes';
import { QUICK_PLAN_KEY } from '../lib/safetyRoute';
import { getSafetyContent } from '../services/safety';
import { SafetyRoute } from '../components/safety/SafetyRoute';
import { SafetyPeople, useSafetyCountry } from '../components/safety/SafetyPeople';

/**
 * Help & safety (`/safety`, CORE-01): reached from the header on every screen, Help me now and Today.
 *   - no query: people first, *I'm thinking about hurting myself*, and the kept quick plan;
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
  const [content, setContent] = useState<SafetyContent | null>(null);
  const [country, setCountry] = useSafetyCountry(content);
  const [plan] = useState(() => {
    try { const v = localStorage.getItem(QUICK_PLAN_KEY); return v ? (JSON.parse(v) as Record<string, string>) : null; } catch { return null; }
  });
  useEffect(() => { void getSafetyContent().then(setContent).catch(() => { /* the fallback line below */ }); }, []);
  if (!content) {
    return <p className="text-[var(--color-text-primary)]">If you're in danger, call your local emergency number now.</p>;
  }
  const h = content.flow.header;
  return (
    <>
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] m-0">{h.label}</h1>
      <SafetyPeople content={content} country={country} onCountry={setCountry} />
      <button type="button" onClick={onSay}
        className="w-full min-h-11 px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-left font-medium text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)]">
        {h.say}
      </button>
      {plan && (
        <section aria-label={h.plan} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <h2 className="m-0 mb-2 text-base font-semibold text-[var(--color-text-primary)]">{h.plan}</h2>
          <ul className="m-0 pl-5 space-y-1 text-[var(--color-text-primary)]">
            {content.flow.quickPlan.steps.map((st) => (plan[st.id] ? <li key={st.id}>{plan[st.id]}</li> : null))}
          </ul>
        </section>
      )}
    </>
  );
}
