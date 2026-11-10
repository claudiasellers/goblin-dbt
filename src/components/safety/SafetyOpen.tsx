import { useEffect, useRef } from 'react';
import { CrisisBanner } from './CrisisBanner';
import { linkButton } from '../tools/oppositeAction/styles';

/**
 * The interim `safety.open` (docs/design/dbt-modules-plan.md C3a R6, decision D5): crisis resources as the whole
 * screen, opened over a skill. The skill's run stays underneath, and *Back to where I was* returns to the same
 * screen. Nothing is asked and nothing is saved here beyond the run noting it opened. CORE-01's safety route
 * replaces this when the safety batch ships; every skill reaches it through this one component.
 */
export function SafetyOpen({ onBack }: { onBack: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div ref={ref} tabIndex={-1} className="space-y-4 outline-none" data-testid="safety-open">
      <CrisisBanner />
      <div className="flex justify-center">
        <button type="button" className={linkButton} onClick={onBack}>Back to where I was</button>
      </div>
    </div>
  );
}
