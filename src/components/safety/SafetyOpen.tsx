import { useEffect, useRef } from 'react';
import { SafetyRoute } from './SafetyRoute';

/**
 * `safety.open` (docs/design/dbt-modules-plan.md C3a R6): the safety route (CORE-01) as the whole screen, opened over
 * a skill. People come first, then *Thanks for saying it. Which is closest right now?* (no *No*: the person asked for
 * it). The skill's step stays mounted underneath (hidden and inert), so a hold keeps its time and *Back to where I
 * was* returns to the same screen. The visit is recorded as `module:<toolId>` (signed in; ids and enums only).
 * Every skill reaches it through this one component. Focus moves to the dialog, which is named.
 */
export function SafetyOpen({ onBack, toolId }: { onBack: () => void; toolId?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Support right now"
      className="space-y-2 outline-none motion-safe:animate-[stepEnter_300ms_ease-out]" data-testid="safety-open">
      <SafetyRoute entry="said" source={toolId ? `module:${toolId}` : 'header'} onDone={onBack} onBack={onBack} />
    </div>
  );
}
