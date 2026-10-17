import { Fragment } from 'react';
import type { CopeAheadContent } from '../../../data/copeAheadTypes';
import type { PlanParts } from '../../../lib/copeAheadPlan';

/**
 * The plan's shape (docs/design/cope-ahead.md, "The plan line"): `PlanParts` from src/lib/copeAheadPlan.ts,
 * which `planLine(content, ca)` returns, so the page passes planLine's result straight in. Re-exported for
 * this folder's screens.
 */
export type { PlanParts };

/**
 * The plan as Cope Ahead's closing screens show it: *If* {ifText}*, I'll* {move}[ *and* {move}], the three
 * sentence words (cope-ahead.json `plan_if` / `plan_ill` / `plan_and`) in the serif's heavier weight. No
 * closing full stop (the host's sentence ends it). A plan with no "If" or no move falls back to
 * `plan.text`.
 */
export function PlanSentence({ content, plan }: { content: Pick<CopeAheadContent, 'copy'>; plan: PlanParts }) {
  if (!plan.ifText || plan.moves.length === 0) return <>{plan.text.replace(/\.$/, '')}</>;
  const word = (k: 'plan_if' | 'plan_ill' | 'plan_and') => <span className="font-semibold">{content.copy[k] ?? ''}</span>;
  return (
    <>
      {word('plan_if')} {plan.ifText}, {word('plan_ill')}{' '}
      {plan.moves.map((m, i) => (
        <Fragment key={i}>{i > 0 && <> {word('plan_and')} </>}{m}</Fragment>
      ))}
    </>
  );
}
