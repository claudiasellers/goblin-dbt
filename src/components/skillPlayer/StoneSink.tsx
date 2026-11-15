import { useCallback, useEffect, useRef, useState } from 'react';
import type { WiseMindPracticeItem } from '../../data/wiseMindTypes';
import { StoneLake } from '../tools/wiseMind/Practices';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * The stone (MF-04's wise mind check, MF-owned; docs/design/wise-mind-check.md): the person lets it go with one tap,
 * and Wise mind's own Stone on the lake (src/components/tools/wiseMind/Practices.tsx) drifts it down through clear
 * water to rest on the sand over `seconds`, one line per third. No countdown and no score; reduced motion gets three
 * still frames. The way on is always there (a quiet link before the stone rests, never a lock). Reports `done` when
 * it rested, `partly` when the person moved on while it sank, `skipped` when they never let it go, with the seconds.
 *
 * Props (copy props arrive as text): `line1`–`line3`, `seconds`, `start` (the tap that lets it go), `next`.
 */
export function StoneSink({ props, onShown, onDone }: EmbedProps) {
  const text = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');
  const seconds = typeof props.seconds === 'number' ? props.seconds : 20;
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [rested, setRested] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const shown = useRef(false);
  useEffect(() => { if (!shown.current) { shown.current = true; onShown(); } }, [onShown]);
  useEffect(() => { if (rested) nextRef.current?.focus({ preventScroll: true }); }, [rested]);
  const [practice] = useState<WiseMindPracticeItem>(() => ({
    id: 'check_stone', name: '', sub: '', kind: 'drift', lines: [text('line1'), text('line2'), text('line3')],
    breaths: null, seconds, order: 0,
  }));
  const onEnd = useCallback(() => setRested(true), []);
  const finish = () => {
    const durationSec = startedAt === null ? 0 : Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    onDone?.({ ids: [startedAt === null ? 'skipped' : rested ? 'done' : 'partly'], durationSec });
  };

  if (startedAt === null) {
    return (
      <section className="space-y-5" data-testid="stone-sink" data-state="ready">
        <p className="font-serif text-xl text-center text-[var(--color-text-primary)] text-balance">{text('line1')}</p>
        <button type="button" className={primaryButton} onClick={() => setStartedAt(Date.now())}>{text('start')}</button>
        <div className="flex justify-center">
          <button type="button" className={linkButton} onClick={finish}>{text('next')}</button>
        </div>
      </section>
    );
  }
  return (
    <section className="space-y-5" data-testid="stone-sink" data-state={rested ? 'rested' : 'sinking'}>
      <StoneLake practice={practice} onEnd={onEnd} />
      {rested
        ? <button ref={nextRef} type="button" className={primaryButton} onClick={finish}>{text('next')}</button>
        : (
          <div className="flex justify-center">
            <button type="button" className={linkButton} onClick={finish}>{text('next')}</button>
          </div>
        )}
    </section>
  );
}
