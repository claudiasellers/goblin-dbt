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
import { completeFollowUp, getSafetyContent, scheduleSafetyPlanReview } from '../services/safety';
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
 *   - `?review=<followUpId>`: the month-on review (`safety_plan_review`): keep as is (the next one a month on), or
 *     change something (`?changing=<id>`: build mode, the card done once the change is saved).
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
          // Kept as it is: this card is done and the next review is a month on.
          if (user) {
            void completeFollowUp(review).then(() => today.drop(review)).catch(() => { /* the card goes stale */ });
            void scheduleSafetyPlanReview().catch(() => { /* offline: no next card */ });
          }
          leave();
        }}>{c.review.keep}</button>
        {/* The card is done once the changed plan is saved (backing out leaves it on Today). */}
        <button type="button" className={quiet} onClick={() => setParams({ changing: review })}>{c.review.change}</button>
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
  const changing = params.get('changing');
  return (
    <div className="max-w-md mx-auto pb-8">
      <SafetyPlanBuild content={content} country={country} start={plan || quick ? start : emptyPlan()} isNew={!plan}
        fromDraft={!plan && !!quick} flooded={flooded} kitCards={kitCards} signedIn={!!user} uid={user?.uid ?? null}
        save={async (p) => {
          const r = await save(p, c, { review: !!changing });
          // From the review card: done now the change is saved (the save booked the next one).
          if (r === 'account' && changing) void completeFollowUp(changing).then(() => today.drop(changing)).catch(() => { /* goes stale */ });
          return r;
        }}
        onUse={() => setParams({ use: '1' })} onLeave={leave} />
    </div>
  );
}
