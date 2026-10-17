import { useEffect, useRef, useState } from 'react';
import type { CopeAheadContent } from '../../../data/copeAheadTypes';
import { focusLine, focusLost } from '../../../lib/focusStart';
import { capFirst } from '../../../lib/partsContent';
import { PaperCard, paperLine } from '../../shared/PaperCard';
import { choiceButton, choiceSelected, linkButton, primaryButton } from '../oppositeAction/styles';
import { PlanSentence, type PlanParts } from './PlanSentence';

/**
 * Cope Ahead, screen 7: Keep it (docs/design/cope-ahead.md). *Here's your plan.* on the square paper Two
 * pulls' keepsake uses (src/components/shared/PaperCard.tsx), the part's anchor line under the plan when
 * there is one, *Keep this* / *Not now*, then *Want me to ask how it went?* and *Done*. Presentation only:
 * the page saves (`keep`), schedules the after card and closes the visit; this reports the taps.
 * After *Not now*, *Keep this* stays for a change of mind. A failed save says so and keeps the buttons.
 */
export interface KeepCardProps {
  content: CopeAheadContent;
  plan: PlanParts;
  /**
   * Parts on, a part chosen: "If {name} shows up: {line}". `lead` is that sentence's start as the parts
   * copy ships it, filled (src/lib/copeAhead.ts `anchorLead(partsContent, name)`, "If Runner shows up:");
   * without it the line reads "{name}: {line}".
   */
  anchor: { name: string; line: string; lead?: string } | null;
  /** The page owns the save. */
  keep: 'idle' | 'saving' | 'kept' | 'failed';
  onKeep: () => void;
  onNotNow: () => void;
  /** null: not answered yet. */
  askAfter: boolean | null;
  onAskAfter: (yes: boolean) => void;
  onDone: () => void;
}

function anchorText(anchor: NonNullable<KeepCardProps['anchor']>): string {
  const lead = anchor.lead?.trim() || `${capFirst(anchor.name.trim())}:`;
  return `${lead} ${anchor.line.trim()}`;
}

export function KeepCard({ content, plan, anchor, keep, onKeep, onNotNow, askAfter, onAskAfter, onDone }: KeepCardProps) {
  const copy = (k: string) => content.copy[k] ?? '';
  const [notNow, setNotNow] = useState(false);
  const answered = keep === 'kept' || notNow;
  const saving = keep === 'saving';
  const keepIt = () => { if (!saving && keep !== 'kept') onKeep(); };

  const title = useRef<HTMLHeadingElement>(null);
  const ask = useRef<HTMLHeadingElement>(null);
  useEffect(() => { focusLine(title.current); }, []);
  // The Keep buttons go once it's kept (or Not now is picked): focus moves on to the question.
  useEffect(() => { if (answered && focusLost()) focusLine(ask.current); }, [answered, keep]);

  const anchorLine = anchor ? anchorText(anchor) : null;
  return (
    <section className="space-y-5" data-testid="cope-keep" data-keep={keep}>
      <h2 ref={title} tabIndex={-1} className="text-lg font-medium text-[var(--color-text-primary)] text-balance focus:outline-none">{copy('keep_title')}</h2>
      <PaperCard label={anchorLine ? `${plan.text} ${anchorLine}` : plan.text} data={{ 'data-plan-card': '' }}>
        <p className={paperLine}><PlanSentence content={content} plan={plan} />.</p>
        {anchorLine && <p className="font-serif text-lg leading-snug text-[var(--color-text-secondary)] text-balance" data-anchor="">{anchorLine}</p>}
      </PaperCard>

      {keep !== 'kept' && (
        notNow
          ? (
            <div className="flex justify-center">
              <button type="button" className={linkButton} aria-disabled={saving || undefined} onClick={keepIt}>{copy('keep_yes')}</button>
            </div>
          )
          : (
            <div className="space-y-2">
              <button type="button" className={primaryButton} aria-disabled={saving || undefined} aria-busy={saving || undefined} onClick={keepIt}>{copy('keep_yes')}</button>
              <div className="flex justify-center">
                <button type="button" className={linkButton} onClick={() => { if (!saving) { setNotNow(true); onNotNow(); } }}>{copy('keep_no')}</button>
              </div>
            </div>
          )
      )}
      {keep === 'failed' && <p role="status" className="text-sm text-center text-[var(--color-text-secondary)]">{copy('keep_failed')}</p>}

      {answered && (
        <div className="space-y-3">
          <h3 ref={ask} tabIndex={-1} className="font-medium text-[var(--color-text-primary)] focus:outline-none">{copy('ask_after_q')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {([[true, 'ask_after_yes'], [false, 'ask_after_no']] as const).map(([yes, k]) => (
              <button key={k} type="button" aria-pressed={askAfter === yes}
                className={`${choiceButton} text-center ${askAfter === yes ? choiceSelected : ''}`} onClick={() => onAskAfter(yes)}>{copy(k)}</button>
            ))}
          </div>
          {askAfter !== null && <button type="button" className={primaryButton} onClick={onDone}>{copy('done')}</button>}
        </div>
      )}
    </section>
  );
}
