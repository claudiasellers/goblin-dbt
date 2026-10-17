import { useEffect, useRef, useState } from 'react';
import type { CopeAheadContent } from '../../../data/copeAheadTypes';
import { focusLine } from '../../../lib/focusStart';
import { HoldButton } from '../../parts/LightHold';
import { choiceButton, linkButton } from '../oppositeAction/styles';

/**
 * Cope Ahead, screen 6: Settle (docs/design/cope-ahead.md). *Let your body come back to now.* and three
 * choices. *Three long breaths out* is three holds of `HoldButton` (as Wise mind's *Wise in, mind out*
 * uses it: press and hold, or a quick press, a screen reader's or a switch's activation for the hands-free
 * fill), then `onChoose('breath')`. *5-4-3-2-1* and *I'm OK* call `onChoose` straight away. Nothing is
 * skipped silently: *I'm OK* is a choice. Presentation only: the page saves and hands off.
 */
export interface SettleProps {
  content: CopeAheadContent;
  onChoose: (s: 'breath' | 'five_senses' | 'ok') => void;
}

/** How many long breaths out. */
export const SETTLE_BREATHS = 3;
/** One long breath out, held (within the review's 4.4 s Space hold). */
export const SETTLE_HOLD_MS = 4000;
/** Letting go after this much of the hold still counts as the breath: nothing is a miss once it's begun. */
const COUNTS_FROM = 0.25;

export function Settle({ content, onChoose }: SettleProps) {
  const copy = (k: string) => content.copy[k] ?? '';
  const [breathing, setBreathing] = useState(false);
  const [done, setDone] = useState(0);
  const progress = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { focusLine(title.current); }, []);
  // Keyboard and switch users keep their place: focus goes to each new hold as the last one ends.
  useEffect(() => {
    if (breathing) box.current?.querySelector<HTMLElement>('[data-hold]')?.focus({ preventScroll: true });
  }, [breathing, done]);

  const breathed = () => {
    progress.current = 0;
    const n = done + 1;
    setDone(n);
    if (n >= SETTLE_BREATHS) onChoose('breath');
  };

  return (
    <section className="space-y-5" data-testid="cope-settle">
      <h2 ref={title} tabIndex={-1} className="text-lg font-medium text-[var(--color-text-primary)] text-balance focus:outline-none">{copy('settle_title')}</h2>
      {!breathing ? (
        <div className="space-y-2">
          <button type="button" className={choiceButton} onClick={() => setBreathing(true)}>{copy('settle_breath')}</button>
          <button type="button" className={choiceButton} onClick={() => onChoose('five_senses')}>{copy('settle_five')}</button>
          <button type="button" className={choiceButton} onClick={() => onChoose('ok')}>{copy('settle_ok')}</button>
        </div>
      ) : (
        <div ref={box} className="space-y-3" data-breaths={done}>
          <ol aria-hidden="true" className="flex justify-center gap-2">
            {Array.from({ length: SETTLE_BREATHS }, (_, i) => (
              <li key={i} className={`h-2.5 w-2.5 rounded-full ${i < done ? 'bg-[var(--color-accent)]' : 'border border-[var(--color-text-tertiary)]'}`} />
            ))}
          </ol>
          {done < SETTLE_BREATHS && (
            <HoldButton key={done} label={copy('settle_hold') || copy('settle_breath')} hint={copy('settle_hold_hint')} ms={SETTLE_HOLD_MS}
              onProgress={(p) => { if (p > 0) progress.current = p; }}
              onLetGo={() => { if (progress.current >= COUNTS_FROM) breathed(); else progress.current = 0; }}
              onComplete={breathed} />
          )}
          {/* A way past that is also a choice: nothing locks on the holds. */}
          <div className="flex justify-center">
            <button type="button" className={linkButton} onClick={() => onChoose('ok')}>{copy('settle_ok')}</button>
          </div>
        </div>
      )}
    </section>
  );
}
