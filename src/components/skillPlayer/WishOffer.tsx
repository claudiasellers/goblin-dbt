import { useEffect, useId, useRef, useState } from 'react';
import { useDeadlineTimer } from '../../hooks/useDeadlineTimer';
import { offerResult, offerWishes, wishLines } from '../../lib/kindWishes';
import { buzz } from '../tools/regulation/hooks';
import { ProgressRing } from '../tools/regulation/ProgressRing';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * The offer (MF-06 Kind wishes, MF-owned; docs/design/kind-wishes.md): the picked wishes, one at a time, each with its
 * own ring. A tap offers the wish: the ring fills slowly on the deadline clock (R13, screen kept awake) while the wish
 * stays on screen; a second tap stops it there. A short buzz marks each wish's end (no chime), for anyone offering
 * with their eyes closed. The next wish waits for its own tap: no auto-advance, no countdown, no digits. The quiet way
 * on is always there (never a lock). While something covers the step (safety.open, P2) the ring stops where it was,
 * without moving on, and takes no focus. Reports `offered` (every wish), `partly` or `skipped`, with the seconds and
 * how many wishes were offered (a measure, never shown).
 *
 * Props (copy props arrive as text): `wishes` (the field whose picks are the wishes, own words last), `line` (the
 * template, *May you {wish}.*), `seconds` (per wish), `start` (inside the ring; the ring's name is the wish and this),
 * `hint` (what a screen reader hears with the ring), `done` (after the last wish), `next`, `skip`; `chipsOnly` (1: the
 * chip picks only, for a step that offers wishes written for someone else) and `fallback` (the wish when none is left).
 */
export function WishOffer({ props, picked, answerIds, onShown, onDone, covered }: EmbedProps) {
  const text = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');
  const seconds = typeof props.seconds === 'number' ? props.seconds : 20;
  const field = text('wishes');
  const [lines] = useState(() => wishLines(
    offerWishes(field ? picked?.[field] : undefined, field ? answerIds?.[field]?.length ?? 0 : 0, props.chipsOnly === 1, text('fallback')),
    text('line'),
  ));
  const [index, setIndex] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const finished = index >= lines.length;
  const wishId = useId();
  const nextRef = useRef<HTMLButtonElement>(null);
  const shown = useRef(false);
  useEffect(() => { if (!shown.current) { shown.current = true; onShown(); } }, [onShown]);
  useEffect(() => { if (finished && !covered) nextRef.current?.focus({ preventScroll: true }); }, [finished, covered]);
  const finish = (offered: number) => onDone?.({
    ids: [offerResult(lines.length, offered)],
    durationSec: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
    doneCount: offered,
  });

  if (finished) {
    return (
      <section className="space-y-5" data-testid="wish-offer" data-state="done">
        <div aria-hidden="true" className="flex justify-center"><ProgressRing value={1} size={200} stroke={5} /></div>
        {lines.length > 0 && <p role="status" className="text-center text-[var(--color-text-secondary)]">{text('done')}</p>}
        <button ref={nextRef} type="button" className={primaryButton} onClick={() => finish(index)}>{text('next')}</button>
      </section>
    );
  }
  return (
    <section className="space-y-5" data-testid="wish-offer" data-state="offering" data-wish={index}>
      <p id={wishId} className="font-serif text-2xl text-center text-[var(--color-text-primary)] text-balance">{lines[index]}</p>
      <WishRing key={index} seconds={seconds} first={index === 0} wishId={wishId} label={text('start')} hint={text('hint')} covered={!!covered}
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

/**
 * One wish's ring: a tap starts a slow, hands-free fill; a second tap stops it, and a tap again starts it over. Its
 * name is the wish and the fixed label (*May you rest. Offer it*); `aria-pressed` carries whether it is filling.
 */
function WishRing({ seconds, first, wishId, label, hint, covered, onEnd }: {
  seconds: number; first: boolean; wishId: string; label: string; hint: string; covered: boolean; onEnd: (full: boolean) => void;
}) {
  const hintId = useId();
  const labelId = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const coveredRef = useRef(covered);
  coveredRef.current = covered;
  // The next wish's ring takes focus, so a keyboard or switch user keeps their place (never under a cover).
  useEffect(() => { if (!first && !covered) ref.current?.focus({ preventScroll: true }); }, [first, covered]);
  const timer = useDeadlineTimer({
    durationMs: seconds * 1000, chime: false, tickMs: 100,
    onDone: () => { if (coveredRef.current) return; buzz(15); onEnd(true); },
  });
  const running = timer.state === 'running';
  // Covered while filling: the ring stops where it was and the wish stays, to be offered again on return.
  useEffect(() => { if (covered && running) timer.stop(); }, [covered, running, timer]);
  const toggle = () => {
    if (running) { timer.stop(); onEnd(false); }
    else timer.start();
  };
  return (
    <div className="flex justify-center">
      <span id={hintId} hidden>{hint}</span>
      <button ref={ref} type="button" aria-labelledby={`${wishId} ${labelId}`} aria-describedby={hintId} aria-pressed={running} onClick={toggle}
        className="rounded-full select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]">
        <ProgressRing value={timer.fraction} size={200} stroke={5} smooth={false}>
          <span id={labelId} className="block max-w-[9rem] text-center text-lg font-medium text-[var(--color-text-primary)] text-balance">{label}</span>
        </ProgressRing>
      </button>
    </div>
  );
}
