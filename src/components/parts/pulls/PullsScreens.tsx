import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PartsOption } from '../../../data/partsContentTypes';
import type { SlotSegment } from '../../../lib/partsContent';
import { buzz } from '../../tools/regulation/hooks';
import { linkButton, primaryButton } from '../../tools/oppositeAction/styles';
import { HoldButton, LIGHT_HOLD_MS } from '../LightHold';
import { Chips } from '../meet/MeetScreens';
import { PullsStage, type StageSide } from './PullsStage';

/**
 * Two pulls' own screens (docs/design/parts.md, "Two pulls"): Step back and the keepsake. Presentation
 * only: every string arrives from the page (parts.json, or the person's own names); the page reports
 * events to the step machine (src/lib/twoPulls.ts).
 */

/**
 * Step back: the stage, and LightHold's press-and-hold, once per breath. Each held breath zooms the stage
 * out a step (`holds`, at most `max`); after one, Next goes on. After a first try a quiet Next goes past
 * it too: nothing locks.
 */
export function StepBack({ title, a, b, light, holds, max, holdLabel, holdHint, nextLabel, onBreath, onNext }: {
  title: ReactNode; a: StageSide; b: StageSide; light: readonly [number, number]; holds: number; max: number;
  holdLabel: string; holdHint: string; nextLabel: string; onBreath: () => void; onNext: () => void;
}) {
  const [tried, setTried] = useState(false);
  /** Remounts the hold after each breath, so the next one starts empty. */
  const [round, setRound] = useState(0);
  const root = useRef<HTMLElement>(null);
  // After a breath the hold is new: focus goes to it for the next breath, or to Next once there are no more.
  useEffect(() => {
    if (round === 0) return;
    const el = root.current?.querySelector<HTMLElement>('[data-hold]') ?? root.current?.querySelector<HTMLElement>('[data-step-back-next]');
    el?.focus({ preventScroll: true });
  }, [round]);
  return (
    // data-breaths: how many breaths were held (a repeating hold stays on screen; the a11y check reads this).
    <section ref={root} className="space-y-4" data-testid="pulls-step-back" data-breaths={holds}>
      <PullsStage a={a} b={b} light={light} zoom={holds} />
      {title}
      {holds < max && (
        <HoldButton key={round} label={holdLabel} hint={holdHint} ms={LIGHT_HOLD_MS} onProgress={() => {}} onLetGo={() => setTried(true)}
          onComplete={() => { buzz(30); onBreath(); setRound((r) => r + 1); }} />
      )}
      {holds > 0
        ? <button type="button" data-step-back-next="" className={primaryButton} onClick={onNext}>{nextLabel}</button>
        : tried && <button type="button" className={linkButton} onClick={onNext}>{nextLabel}</button>}
    </section>
  );
}

/**
 * The keepsake: square paper, the only shadow in the app, the two lines as the server will keep them.
 * "Keep this" and "Not now" (the page saves on Keep); after either, `after` (the Wise mind link) shows.
 * `first` is the first line as segments: the two names (slots A and B) are set in italics, as parts.md
 * draws it; without it the first line shows plain.
 */
export function Keepsake({ lines, first, options, picked, status, after, onPick }: {
  lines: readonly [string, string]; first?: readonly SlotSegment[] | null; options: readonly Pick<PartsOption, 'id' | 'label'>[]; picked: string | null;
  /** A line under the paper once answered (e.g. the save failed: "Couldn't save that. Try again."). */
  status?: ReactNode; after?: ReactNode; onPick: (id: string) => void;
}) {
  const paper = useRef<HTMLDivElement>(null);
  useEffect(() => { paper.current?.focus({ preventScroll: true }); }, []);
  return (
    <section className="space-y-5" data-testid="pulls-keepsake">
      <div ref={paper} tabIndex={-1} role="group" aria-label={`${lines[0]} ${lines[1]}`} data-keepsake=""
        className="mx-auto w-full max-w-[20rem] aspect-square rounded-md bg-[var(--color-bg-elevated)] p-7 flex flex-col justify-center gap-4 focus:outline-none"
        style={{ boxShadow: '0 18px 40px -18px color-mix(in oklab, var(--color-text-primary) 45%, transparent), 0 2px 6px -2px color-mix(in oklab, var(--color-text-primary) 20%, transparent)' }}>
        <p className="font-serif text-xl leading-snug text-[var(--color-text-primary)] text-balance">
          {first ? first.map((seg, i) => (seg.slot === 'A' || seg.slot === 'B' ? <em key={i}>{seg.text}</em> : seg.text)) : lines[0]}
        </p>
        <p className="font-serif text-xl leading-snug text-[var(--color-text-primary)] text-balance">{lines[1]}</p>
      </div>
      <Chips options={options} picked={picked} onPick={onPick} />
      {status}
      {after}
    </section>
  );
}
