import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CrisisBanner } from '../safety/CrisisBanner';
import { fillWho } from '../../lib/people';
import { focusStepStart } from '../../lib/focusStart';
import { linkButton, secondaryText } from '../tools/oppositeAction/styles';

/**
 * The safety route (IE-03 + D4, PRD IE-01 step 0): someone who might hurt or control the person, or *I'd rather
 * not say*. No plan to bring things up with them is offered (plan C6.6, and saveDearManSession refuses one); the
 * other-person resources (CrisisBanner's other_person variant: it holds the numbers), and Ending a relationship
 * that's hurting you in its safety branch (`?frame=careful`), offered and never pushed. *This is about someone
 * else* goes back to the picker. Nothing locks: the person can leave by any route.
 */
export function PersonSafetyRoute({ copy, label, onBack }: {
  copy: { safetyRouteHeading: string; safetyRouteBody: string; safetyRouteEnding: string; safetyRouteBack: string };
  label: string | null;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { focusStepStart(root.current); }, []);
  return (
    <div ref={root} className="space-y-4" data-testid="person-safety-route">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{fillWho(copy.safetyRouteHeading, label)}</h3>
      <p className={secondaryText}>{copy.safetyRouteBody}</p>
      <CrisisBanner variant="other_person" />
      <button type="button" onClick={() => navigate('/tool/ending-relationships?frame=careful')}
        className="w-full min-h-12 p-3 rounded-xl border border-[var(--color-border)] text-left text-[var(--color-text-primary)] lift-secondary">
        {copy.safetyRouteEnding}
      </button>
      <button type="button" onClick={onBack} className={linkButton}>{copy.safetyRouteBack}</button>
    </div>
  );
}
