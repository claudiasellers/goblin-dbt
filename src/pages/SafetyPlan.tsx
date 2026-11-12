import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { SafetyContent } from '../data/safetyTypes';
import { useBand } from '../hooks/useBand';
import { useSafetyCountry } from '../hooks/useSafetyCountry';
import { useSafetyPlan } from '../hooks/useSafetyPlan';
import { useToday } from '../hooks/useToday';
import { QUICK_PLAN_KEY } from '../lib/safetyRoute';
import { buildNeedsHeadsUp, emptyPlan, planFromQuick } from '../lib/safetyPlan';
import { completeFollowUp, getSafetyContent } from '../services/safety';
import { SafetyPlanBuild } from '../components/safety/SafetyPlanBuild';
import { SafetyPlanUse } from '../components/safety/SafetyPlanUse';
import { PlanCard } from '../components/safety/SafetyPlanCard';

function readQuick(): { sign?: string; do?: string; contact?: string } | null {
  try { const v = localStorage.getItem(QUICK_PLAN_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}

const primary = 'w-full min-h-11 px-4 py-3 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary';
const quiet = 'min-h-11 px-2 text-sm underline underline-offset-4 text-[var(--color-text-secondary)] bg-transparent border-none cursor-pointer';

/**
 * My safety plan (`/safety/plan`, CORE-02; docs/design/safety-route.md), from Help & safety:
 *   - no query: build mode (a kept plan opens to change it; else the quick plan as a draft, else empty);
 *   - `?use=1`: use mode (back from a tool it picks up at the step it was on, for this browser session);
 *   - `?review=<followUpId>`: the month-on review (`safety_plan_review`): keep as is, or change something.
 * Works signed out: the plan stays on the device.
 */
export function SafetyPlan() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const band = useBand();
  const [content, setContent] = useState<SafetyContent | null>(null);
  const [countryId, setCountry] = useSafetyCountry(content);
  const { status, plan, kitCards, save } = useSafetyPlan();
  const today = useToday();
  const review = params.get('review');
  const use = params.get('use') === '1';
  const [flooded] = useState(() => buildNeedsHeadsUp(band.current()?.value));
  const quick = useMemo(() => readQuick(), []);

  useEffect(() => { void getSafetyContent().then(setContent).catch(() => { /* the fallback line below */ }); }, []);
  const leave = useCallback(() => navigate('/safety'), [navigate]);

  if (!content || status === 'loading') {
    return <div className="max-w-md mx-auto py-8 text-center text-[var(--color-text-secondary)]" role="status">…</div>;
  }
  const c = content.flow.plan;
  const country = content.countries.find((x) => x.id === countryId) ?? null;

  if (review) {
    return (
      <div className="max-w-md mx-auto space-y-4 pb-8" data-testid="plan-review">
        <h1 className="m-0 text-2xl font-semibold text-[var(--color-text-primary)]">{c.review.title}</h1>
        <p className="m-0 text-[var(--color-text-secondary)]">{c.review.line}</p>
        {plan && <PlanCard content={content} country={country} plan={plan} kitCards={kitCards} />}
        <button type="button" className={primary} onClick={() => {
          if (user) void completeFollowUp(review).then(() => today.drop(review)).catch(() => { /* the card goes stale */ });
          leave();
        }}>{c.review.keep}</button>
        <button type="button" className={quiet} onClick={() => {
          if (user) void completeFollowUp(review).then(() => today.drop(review)).catch(() => { /* the card goes stale */ });
          setParams({});
        }}>{c.review.change}</button>
      </div>
    );
  }

  if (use && plan) {
    return (
      <div className="max-w-md mx-auto pb-8">
        <SafetyPlanUse content={content} country={country} onCountry={setCountry} plan={plan} onDone={leave} resume />
      </div>
    );
  }

  const start = plan ?? planFromQuick(quick, c.person.textDefault);
  return (
    <div className="max-w-md mx-auto pb-8">
      <SafetyPlanBuild content={content} country={country} start={plan ? start : (quick ? start : emptyPlan())}
        fromDraft={!plan && !!quick} flooded={flooded} kitCards={kitCards} signedIn={!!user}
        save={(p) => save(p, c)} onUse={() => setParams({ use: '1' })} onLeave={leave} />
    </div>
  );
}
