import { useEffect, useRef } from 'react';
import { useDeadlineTimer } from '../../hooks/useDeadlineTimer';
import { PaperCard, paperLine } from '../shared/PaperCard';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * Rewrite the nightmare's card (ER-15, PRD steps 5–6; docs/design/nightmare-rescript.md): the new version on the
 * square paper (src/components/shared/PaperCard.tsx, the keepsake Two pulls, Cope Ahead and Rebel share), where it
 * starts, what changes, how it ends now, each in the person's own pick or words; then one read-through, eyes open.
 *
 * *Read it through* starts a quiet clock (`seconds`, the deadline timer every hold uses; no digits, no chime: it
 * may be near bedtime). While it runs the card stays in view, with one line of what to do and *Stop* always
 * there. *Stop*, or *I'd rather stop here* before starting, reports `stopped`; the skill takes that to a card that
 * settles and orients, never back into the dream. The clock done, *Done* reports `read`. Both carry the seconds
 * read (a measurement, never a rating). A whole-screen embed: the skill answers its id as `read`.
 *
 * Every word arrives from the skill (copy props) or the run (`picked`: the answers' labels, own words last).
 * Presentation only: keeping it is the skill's keep step, on the person's tap.
 */
export const RESCRIPT_IDS = ['read', 'stopped'] as const;

export function RescriptCard({ props, picked = {}, onShown, onDone }: EmbedProps) {
  const text = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');
  const field = (k: string) => (typeof props[k] === 'string' ? (picked[props[k] as string] ?? []) : []);
  const lines = ([['startLabel', 'startField'], ['turnLabel', 'turnField'], ['endLabel', 'endField']] as const)
    .map(([label, f]) => ({ label: text(label), value: field(f).at(-1) ?? '' }))
    .filter((l) => l.value);
  const seconds = typeof props.seconds === 'number' ? props.seconds : 60;

  const shown = useRef(false);
  useEffect(() => { if (!shown.current) { shown.current = true; onShown(); } }, [onShown]);

  const doneRef = useRef<HTMLButtonElement>(null);
  const timer = useDeadlineTimer({ durationMs: seconds * 1000, chime: false, tickMs: 250 });
  const running = timer.state === 'running';
  const finished = timer.state === 'done';
  useEffect(() => { if (finished) doneRef.current?.focus({ preventScroll: true }); }, [finished]);
  const secs = () => Math.round(timer.elapsedMs / 1000);
  const stop = () => { const s = secs(); timer.stop(); onDone?.({ ids: ['stopped'], durationSec: s }); };

  const label = lines.length ? lines.map((l) => `${l.label}: ${l.value}`).join('. ') : text('fallback');
  return (
    <section className="space-y-6" data-testid="rescript-card" data-state={timer.state}>
      <div className="-rotate-1">
        <PaperCard label={label} data={{ 'data-rescript-card': '' }}>
          {lines.length === 0 && <p className={paperLine}>{text('fallback')}</p>}
          {lines.map((l, i) => (
            <div key={i} className="space-y-1" data-rescript-line={i}>
              <p className="font-sans text-sm text-[var(--color-text-secondary)]">{l.label}</p>
              <p className={paperLine}>{l.value}</p>
            </div>
          ))}
        </PaperCard>
      </div>
      {running && (
        <div className="space-y-3">
          <p role="status" className="text-center text-[var(--color-text-secondary)] text-balance">{text('runningLabel')}</p>
          {/* How far along, with no number: a thin line that fills. Still under reduced motion it just steps. */}
          <div aria-hidden="true" className="h-1 w-full rounded-full bg-[var(--color-border-subtle)] overflow-hidden">
            <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.round(timer.fraction * 100)}%` }} />
          </div>
        </div>
      )}
      <div className="space-y-2">
        {timer.state === 'idle' && (
          <button type="button" className={primaryButton} data-read="" onClick={() => timer.start()}>{text('readLabel')}</button>
        )}
        {running && (
          <button type="button" className={primaryButton} data-stop="" onClick={stop}>{text('stopLabel')}</button>
        )}
        {finished && (
          <button ref={doneRef} type="button" className={primaryButton} data-done=""
            onClick={() => onDone?.({ ids: ['read'], durationSec: seconds })}>{text('doneLabel')}</button>
        )}
        {timer.state === 'idle' && (
          <div className="flex justify-center">
            <button type="button" className={linkButton} data-skip="" onClick={() => onDone?.({ ids: ['stopped'], durationSec: 0 })}>{text('skipLabel')}</button>
          </div>
        )}
      </div>
    </section>
  );
}
