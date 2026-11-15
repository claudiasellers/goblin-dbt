import { useEffect, useId, useRef, useState } from 'react';
import { useDeadlineTimer } from '../../hooks/useDeadlineTimer';
import { offerResult, wishLines } from '../../lib/kindWishes';
import { ProgressRing } from '../tools/regulation/ProgressRing';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * The offer (MF-06 Kind wishes, MF-owned; docs/design/kind-wishes.md): the picked wishes, one at a time, each with its
 * own ring. A tap offers the wish: the ring fills slowly on the deadline clock (R13, screen kept awake) while the wish
 * stays on screen; a second tap stops it there. The next wish waits for its own tap: no auto-advance, no countdown, no
 * digits. The quiet way on is always there (never a lock). Reports `offered` (every wish), `partly` or `skipped`, with
 * the seconds and how many wishes were offered (a measure, never shown).
 *
 * Props (copy props arrive as text): `wishes` (the field whose picks are the wishes, own words last), `line` (the
 * template, *May you {wish}.*), `seconds` (per wish), `start` (inside the ring), `running` (inside it while it fills),
 * `hint` (what a screen reader hears with the ring), `done` (after the last wish), `next`, `skip`.
 */
export function WishOffer({ props, picked, onShown, onDone }: EmbedProps) {
  const text = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');
  const seconds = typeof props.seconds === 'number' ? props.seconds : 20;
  const field = text('wishes');
  const [lines] = useState(() => wishLines(field ? picked?.[field] : undefined, text('line')));
  const [index, setIndex] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const finished = index >= lines.length;
  const nextRef = useRef<HTMLButtonElement>(null);
  const shown = useRef(false);
  useEffect(() => { if (!shown.current) { shown.current = true; onShown(); } }, [onShown]);
  useEffect(() => { if (finished) nextRef.current?.focus({ preventScroll: true }); }, [finished]);
  const finish = (offered: number) => onDone?.({
    ids: [offerResult(lines.length, offered)],
    durationSec: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
    doneCount: offered,
  });

  if (finished) {
    return (
      <section className="space-y-5" data-testid="wish-offer" data-state="done">
        <div className="flex justify-center"><ProgressRing value={1} size={200} stroke={5}><span className="sr-only">{text('done')}</span></ProgressRing></div>
        {lines.length > 0 && <p role="status" className="text-center text-[var(--color-text-secondary)]">{text('done')}</p>}
        <button ref={nextRef} type="button" className={primaryButton} onClick={() => finish(index)}>{text('next')}</button>
      </section>
    );
  }
  return (
    <section className="space-y-5" data-testid="wish-offer" data-state="offering" data-wish={index}>
      <p aria-live="polite" className="font-serif text-2xl text-center text-[var(--color-text-primary)] text-balance">{lines[index]}</p>
      <WishRing key={index} seconds={seconds} first={index === 0} label={text('start')} running={text('running')} hint={text('hint')}
        onEnd={(full) => { if (full) setIndex((i) => i + 1); }} />
      {lines.length > 1 && (
        <ol aria-hidden="true" className="flex justify-center gap-2">
          {lines.map((_, i) => (
            <li key={i} className={`h-2.5 w-2.5 rounded-full ${i < index ? 'bg-[var(--color-accent)]' : 'border border-[var(--color-text-tertiary)]'}`} />
          ))}
        </ol>
      )}
      <div className="flex justify-center">
        <button type="button" className={linkButton} onClick={() => finish(index)}>{text('skip') || text('next')}</button>
      </div>
    </section>
  );
}

/** One wish's ring: a tap starts a slow, hands-free fill; a second tap stops it, and a tap again starts it over. */
function WishRing({ seconds, first, label, running: runningLabel, hint, onEnd }: {
  seconds: number; first: boolean; label: string; running: string; hint: string; onEnd: (full: boolean) => void;
}) {
  const hintId = useId();
  const ref = useRef<HTMLButtonElement>(null);
  // The next wish's ring takes focus, so a keyboard or switch user keeps their place.
  useEffect(() => { if (!first) ref.current?.focus({ preventScroll: true }); }, [first]);
  const timer = useDeadlineTimer({ durationMs: seconds * 1000, chime: false, tickMs: 100, onDone: () => onEnd(true) });
  const running = timer.state === 'running';
  const toggle = () => {
    if (running) { timer.stop(); onEnd(false); }
    else timer.start();
  };
  return (
    <div className="flex justify-center">
      <span id={hintId} hidden>{hint}</span>
      <button ref={ref} type="button" aria-describedby={hintId} aria-pressed={running} onClick={toggle}
        className="rounded-full select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]">
        <ProgressRing value={timer.fraction} size={200} stroke={5} smooth={false}>
          <span className="block max-w-[9rem] text-center text-lg font-medium text-[var(--color-text-primary)] text-balance">{running ? runningLabel : label}</span>
        </ProgressRing>
      </button>
    </div>
  );
}
