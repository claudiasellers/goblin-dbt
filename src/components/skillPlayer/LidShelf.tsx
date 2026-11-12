import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useHoldGesture } from '../../hooks/useHoldGesture';
import { containerOf, lidHoldMs, lidLift, lidOutput, type Container } from '../../lib/lidShelf';
import { buzz } from '../tools/regulation/hooks';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * lidShelf (DT-06 Give your mind a job, docs/design/mind-job.md; plan C3b, DT-owned): the too-much goes into the jar,
 * tin or box the person picked, then they press and hold the lid shut, and it sits on the shelf. The drawing is the
 * only progress (no digits). Letting go early keeps nothing back: after the first try a quiet way past appears, and
 * nothing locks. Reduced motion keeps the swirl still; the lid still moves with the hold on purpose, since it is the
 * only progress. Rules in src/lib/lidShelf.ts.
 *
 * Props (copy props arrive as text): containerField (the field whose pick is the container), put, hold, holding, hint
 * (what a screen reader hears with the hold), holdSec, done, next, skip (the way on with the lid open). Reports `shut` · `partly` · `skipped` and the seconds
 * held.
 */
export function LidShelf({ props, answerIds, onShown, onDone }: EmbedProps) {
  const text = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');
  const field = typeof props.containerField === 'string' ? props.containerField : '';
  const container = containerOf(answerIds?.[field]?.[0]);
  const ms = lidHoldMs(props);
  const [inside, setInside] = useState(false);
  const [shut, setShut] = useState(false);
  const [tried, setTried] = useState(false);
  const reachedAny = useRef(false);
  const heldMs = useRef(0);
  const pressedAt = useRef<number | null>(null);
  const hintId = useId();
  const doneId = useId();
  const nextRef = useRef<HTMLButtonElement>(null);
  const holdRef = useRef<HTMLButtonElement>(null);

  const shown = useRef(false);
  useEffect(() => { if (!shown.current) { shown.current = true; onShown(); } }, [onShown]);
  useEffect(() => { if (shut) nextRef.current?.focus({ preventScroll: true }); }, [shut]);
  useEffect(() => { if (inside) holdRef.current?.focus({ preventScroll: true }); }, [inside]);

  const endPress = () => {
    if (pressedAt.current !== null) heldMs.current += performance.now() - pressedAt.current;
    pressedAt.current = null;
  };
  const { p, mode, handlers } = useHoldGesture({
    ms,
    onProgress: (v) => { if (v > 0 && pressedAt.current === null) pressedAt.current = performance.now(); },
    onLetGo: (r) => { endPress(); if (r > 0) reachedAny.current = true; setTried(true); },
    onComplete: () => { endPress(); reachedAny.current = true; buzz(30); setShut(true); },
  });
  const finish = () => onDone?.(lidOutput(shut, reachedAny.current, heldMs.current));
  const lift = shut ? 0 : lidLift(mode === 'idle' ? 0 : p);

  return (
    <section className="space-y-5" data-testid="lid-shelf" data-container={container} data-phase={shut ? 'shut' : inside ? 'in' : 'empty'}>
      <div className="flex justify-center">
        <Drawing container={container} inside={inside} lift={lift} shelf={shut} />
      </div>
      {shut ? (
        <>
          <p id={doneId} className="text-center text-[var(--color-text-secondary)]">{text('done')}</p>
          <button ref={nextRef} type="button" aria-describedby={doneId} className={primaryButton} onClick={finish}>{text('next')}</button>
        </>
      ) : inside ? (
        <>
          <span id={hintId} hidden>{text('hint')}</span>
          <button ref={holdRef} type="button" data-hold="" aria-describedby={hintId} {...handlers}
            className={`${primaryButton} select-none touch-none [-webkit-touch-callout:none]`}>
            {mode === 'idle' ? text('hold') : text('holding')}
          </button>
          <p className="sr-only" aria-live="polite">{mode === 'idle' ? '' : text('holding')}</p>
          {tried && <div className="flex justify-center pt-4"><button type="button" className={linkButton} onClick={finish}>{text('skip')}</button></div>}
        </>
      ) : (
        <button type="button" className={primaryButton} data-put="" onClick={() => { buzz(15); setInside(true); }}>{text('put')}</button>
      )}
    </section>
  );
}

const DOTS = [[-22, 8], [14, -6], [-4, 22], [24, 18], [-18, -14], [6, 4]] as const;

/** The container (jar, tin or box), the swirl going in, the lid above the rim by `lift` px, and the shelf when shut. */
function Drawing({ container, inside, lift, shelf }: { container: Container; inside: boolean; lift: number; shelf: boolean }) {
  const reduce = useReducedMotion();
  const body = container === 'tin'
    ? { x: 50, y: 92, w: 100, h: 70, r: 10 }
    : container === 'box'
      ? { x: 46, y: 80, w: 108, h: 82, r: 4 }
      : { x: 58, y: 76, w: 84, h: 86, r: 18 };
  const lid = container === 'tin'
    ? { x: 44, w: 112, h: 12, r: 6 }
    : container === 'box'
      ? { x: 40, w: 120, h: 14, r: 3 }
      : { x: 64, w: 72, h: 14, r: 5 };
  const cx = body.x + body.w / 2;
  const cy = body.y + body.h / 2 + 2;
  // The swirl stays inside the body: the lowest dot (dy 22, r 7) is scaled to clear the bottom edge.
  const k = Math.min(1, (body.h / 2 - 10) / 29);
  return (
    <svg viewBox="0 0 200 200" width="200" height="200" aria-hidden="true" className="overflow-visible">
      {shelf && <rect x="18" y={body.y + body.h} width="164" height="6" rx="3" fill="var(--color-text-tertiary)" opacity="0.5" />}
      <rect x={body.x} y={body.y} width={body.w} height={body.h} rx={body.r}
        fill="var(--color-bg-card)" stroke="var(--color-text-secondary)" strokeWidth="2.5" />
      {DOTS.map(([dx, dy], i) => (
        <circle key={i} r={i % 2 ? 5 : 7} fill="var(--color-accent)" opacity={inside ? 0.75 : 0}
          cx={cx + dx * k} cy={cy + dy * k}
          style={{ transform: inside ? 'none' : `translateY(${-(cy + dy * k - 16)}px)`,
            transition: reduce ? undefined : `transform 900ms ease-in ${i * 80}ms, opacity 400ms ease-in ${i * 80}ms` }} />
      ))}
      <rect x={lid.x} y={body.y - lid.h} width={lid.w} height={lid.h} rx={lid.r}
        fill="var(--color-text-secondary)" opacity={inside ? 1 : 0.6}
        style={{ transform: `translateY(${-lift}px)`, transition: reduce ? undefined : 'transform 80ms linear, opacity 300ms ease' }} />
    </svg>
  );
}
