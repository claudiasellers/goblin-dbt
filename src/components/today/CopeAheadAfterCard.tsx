import { useEffect, useRef, useState } from 'react';
import type { CopeAheadContent } from '../../data/copeAheadTypes';
import type { PlanHelped, TodayItem } from '../../services/spine';
import { dismissFollowUp, resolveCopeAheadAfter, resolveFollowUp } from '../../services/spine';
import { getCopeAheadContent } from '../../services/copeAhead';
import { afterCardCopy, NOT_YET, type HowChoiceId } from '../../lib/copeAheadAfter';
import { focusStepStart } from '../../lib/focusStart';
import { TodayCard } from './TodayCard';

const chip = 'min-h-11 px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] hover:text-[var(--color-text-primary)] aria-disabled:opacity-50 transition-colors';

/**
 * Cope Ahead's after card (docs/design/cope-ahead.md, "Today, afterwards"): "How did {afterName} go?", then
 * "Did your plan help?" with "Your plan: {plan}" above the chips, the plan composed from the visit's ids
 * (src/lib/copeAheadAfter.ts). Both answers go in one resolve when the second is tapped; It hasn't happened
 * yet snoozes. Leaving after the first answer (the card unmounts, or the page goes away) sends the first
 * alone, so nothing said is lost. Until cope-ahead.json loads the card waits; without its lines it is
 * Today's plain card (the type's own choices).
 */
export function CopeAheadAfterCard({ item, onDone, compact = false }: { item: TodayItem; onDone: (id: string) => void; compact?: boolean }) {
  const [content, setContent] = useState<CopeAheadContent | null | 'failed'>(null);
  useEffect(() => {
    let live = true;
    getCopeAheadContent().then((c) => { if (live) setContent(c); }).catch(() => { if (live) setContent('failed'); });
    return () => { live = false; };
  }, []);
  const [first, setFirst] = useState<HowChoiceId | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const root = useRef<HTMLElement>(null);

  // The first answer, until it is sent: leaving the card (or the page) sends it alone.
  const pending = useRef<HowChoiceId | null>(null);
  useEffect(() => {
    const flush = () => {
      const how = pending.current;
      if (!how) return;
      pending.current = null;
      void resolveCopeAheadAfter(item.id, how, null).catch(() => { /* it stays on Today, asked again */ });
    };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, [item.id]);

  // The first answer swaps the question: focus goes to the second (the chip that had it is gone).
  useEffect(() => { if (first) focusStepStart(root.current); }, [first]);

  if (content === null) return null;
  const copy = content === 'failed' ? null : afterCardCopy(content, item.plan);
  if (!copy) return <TodayCard item={item} onDone={onDone} compact={compact} />;

  const run = async (fn: () => Promise<unknown>) => {
    // aria-disabled while it saves, not disabled: a disabled button would drop keyboard focus.
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await fn();
    } catch {
      setBusy(false);
      setFailed(true);
      return;
    }
    onDone(item.id);
  };
  const how = (id: HowChoiceId) => {
    if (id === NOT_YET) { void run(() => resolveFollowUp(item.id, NOT_YET)); return; }
    pending.current = id;
    setFirst(id);
  };
  const plan = (helped: PlanHelped | null) => {
    if (!first) return;
    pending.current = null;
    void run(() => resolveCopeAheadAfter(item.id, first, helped).catch((e) => { pending.current = first; throw e; }));
  };
  const size = compact ? 'text-sm' : '';

  return (
    <section ref={root} aria-label={first ? copy.planQuestion : copy.question} data-testid="cope-ahead-after" data-step={first ? 'plan' : 'how'}
      className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      {!first ? (
        <>
          <p className={`font-medium text-[var(--color-text-primary)] ${size}`}>{copy.question}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {copy.how.map((c) => (
              <button key={c.id} type="button" aria-disabled={busy || undefined} className={chip} onClick={() => how(c.id)}>{c.label}</button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className={`font-medium text-[var(--color-text-primary)] ${size}`}>{copy.planQuestion}</p>
          {copy.planLine && <p className="mt-1 font-serif text-sm text-[var(--color-text-secondary)]" data-testid="cope-ahead-plan-line">{copy.planLine}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {copy.plan.map((c) => (
              <button key={c.id ?? 'skip'} type="button" aria-disabled={busy || undefined} className={chip} onClick={() => plan(c.id)}>{c.label}</button>
            ))}
          </div>
        </>
      )}
      {failed && <p role="status" className="mt-2 text-xs text-[var(--color-text-secondary)]">That didn't save. Try again when you're ready.</p>}
      {!first && (
        <div className="mt-1 flex justify-end">
          <button type="button" aria-disabled={busy || undefined} onClick={() => void run(() => dismissFollowUp(item.id))}
            className="min-h-11 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">
            Not any more
          </button>
        </div>
      )}
    </section>
  );
}
