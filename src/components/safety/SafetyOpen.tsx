import { useEffect, useRef } from 'react';
import { CrisisBanner } from './CrisisBanner';

/**
 * The interim `safety.open` (docs/design/dbt-modules-plan.md C3a R6, decision D5): crisis resources as the whole
 * screen, opened over a skill. The skill's step stays mounted underneath (hidden and inert), so a hold keeps its
 * time and *Back to where I was* returns to the same screen. Nothing is asked and nothing is saved here beyond
 * the run noting it opened. CORE-01's safety route replaces this when the safety batch ships; every skill reaches
 * it through this one component. Focus moves to the dialog, which is named, so a screen reader says where it is.
 */
export function SafetyOpen({ onBack }: { onBack: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Support right now"
      className="space-y-2 outline-none motion-safe:animate-[stepEnter_300ms_ease-out]" data-testid="safety-open">
      <CrisisBanner />
      <div className="flex justify-center">
        <button type="button" onClick={onBack}
          className="min-h-11 px-4 font-medium underline underline-offset-4 text-[var(--color-text-primary)] hover:opacity-80">
          Back to where I was
        </button>
      </div>
    </div>
  );
}
