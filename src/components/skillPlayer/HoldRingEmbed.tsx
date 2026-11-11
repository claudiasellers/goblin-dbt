import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { useHoldGesture } from '../../hooks/useHoldGesture';
import { useDeadlineTimer, useKeepAwake } from '../../hooks/useDeadlineTimer';
import { EMPTY_TALLY, finished, holdMs, holdOutput, holdPlan, pulseMs, tally, type HoldPlan, type HoldTally } from '../../lib/holdRing';
import { ProgressRing } from '../tools/regulation/ProgressRing';
import { buzz } from '../tools/regulation/hooks';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * holdRing (docs/design/dbt-modules-plan.md C3b; owner DT, built in F2): one large round hold target, the
 * only progress the acute path shows (no digits, no step counter). The ring is ProgressRing; the press is the
 * parts flows' gesture (useHoldGesture: Space held, or a quick key / a switch or screen-reader activation fills
 * it hands-free); `timed` runs on the deadline clock (R13) with the screen kept awake. While it runs the ring
 * breathes at 1 Hz, each beat a little slower (lib/holdRing.ts `pulseMs`); reduced motion keeps it still.
 * Letting go early keeps the seconds held, and after the first try a quiet way past appears: nothing locks.
 * Every completed hold makes the next one longer when the step asks for growth. Its output: `held` · `partly`
 * · `skipped`, with the seconds held, holds done and early releases.
 *
 * Props (copy props arrive as text): variant, seconds, holds, growthPct, maxSeconds; label (inside the ring),
 * runningLabel (inside it while a hold runs, e.g. a timed ring's "Tap to stop"; else the label stays), hint (what a
 * screen reader hears with it), doneLabel (after the last hold), next (the way on), wayOn (`from_start`: the quiet way
 * on before any try).
 */
export function HoldRingEmbed({ props, onShown, onDone }: EmbedProps) {
  const plan = holdPlan(props);
  const label = String(props.label ?? '');
  const hint = String(props.hint ?? '');
  const runningLabel = typeof props.runningLabel === 'string' ? props.runningLabel : label;
  const doneLabel = typeof props.doneLabel === 'string' ? props.doneLabel : null;
  const next = String(props.next ?? '');
  const wayOnFromStart = props.wayOn === 'from_start';
  const [t, setT] = useState<HoldTally>(EMPTY_TALLY);
  const [tried, setTried] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const done = finished(plan, t);

  const shownOnce = useRef(false);
  useEffect(() => { if (!shownOnce.current) { shownOnce.current = true; onShown(); } }, [onShown]);
  // The way on takes focus once the last hold is done, so a keyboard or switch user isn't left on nothing.
  useEffect(() => { if (done) nextRef.current?.focus({ preventScroll: true }); }, [done]);

  const ended = (reached: number) => {
    const n = tally(plan, t, reached);
    if (n.doneCount > t.doneCount) buzz(30);
    if (n.earlyCount > t.earlyCount || reached > 0) setTried(true);
    setT(n);
  };
  const finish = () => onDone?.(holdOutput(plan, t));

  return (
    <section className="space-y-5" data-testid="hold-ring" data-variant={plan.variant} data-holds={t.doneCount}>
      {plan.holds > 1 && (
        <ol aria-hidden="true" className="flex justify-center gap-2">
          {Array.from({ length: plan.holds }, (_, i) => (
            <li key={i} className={`h-2.5 w-2.5 rounded-full ${i < t.doneCount ? 'bg-[var(--color-accent)]' : 'border border-[var(--color-text-tertiary)]'}`} />
          ))}
        </ol>
      )}
      {done ? (
        <div className="space-y-4">
          <div className="flex justify-center"><ProgressRing value={1} size={200} stroke={5}><span className="sr-only">{label}</span></ProgressRing></div>
          {doneLabel && <p role="status" className="text-center text-[var(--color-text-secondary)]">{doneLabel}</p>}
          <button ref={nextRef} type="button" className={primaryButton} onClick={finish}>{next}</button>
        </div>
      ) : (
        <>
          {plan.variant === 'timed'
            ? <TimedRing key={t.doneCount} plan={plan} done={t.doneCount} label={label} runningLabel={runningLabel} hint={hint} onEnd={ended} />
            : <PressRing key={t.doneCount} plan={plan} done={t.doneCount} label={label} runningLabel={runningLabel} hint={hint} onEnd={ended} />}
          {(tried || wayOnFromStart) && (
            <div className="flex justify-center">
              <button type="button" className={linkButton} onClick={finish}>{next}</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

interface RingProps { plan: HoldPlan; done: number; label: string; runningLabel: string; hint: string; onEnd: (reached: number) => void }

/** The next ring after a completed hold takes focus, so a keyboard or switch user keeps their place. */
function useFocusAfterFirst(done: number) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (done > 0) ref.current?.focus({ preventScroll: true }); }, [done]);
  return ref;
}

/** press / settle: hold the ring. Its length is this hold's (growth applied); a release ends it at how far it got. */
function PressRing({ plan, done, label, runningLabel, hint, onEnd }: RingProps) {
  const hintId = useId();
  const ref = useFocusAfterFirst(done);
  const { p, mode, handlers } = useHoldGesture({ ms: holdMs(plan, done), onLetGo: onEnd, onComplete: () => onEnd(1) });
  const running = mode !== 'idle';
  useKeepAwake(running);
  return (
    <div className="flex justify-center">
      <span id={hintId} hidden>{hint}</span>
      <button ref={ref} type="button" data-hold="" aria-describedby={hintId} {...handlers}
        className="rounded-full select-none touch-none [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]">
        <Breathing on={running}>
          <ProgressRing value={p} size={200} stroke={5} smooth={false}>
            <span className="block max-w-[9rem] text-center text-lg font-medium text-[var(--color-text-primary)] text-balance">{running ? runningLabel : label}</span>
          </ProgressRing>
        </Breathing>
      </button>
    </div>
  );
}

/** timed: a tap starts a hands-free fill on the deadline clock; a second tap stops it where it is. */
function TimedRing({ plan, done, label, runningLabel, hint, onEnd }: RingProps) {
  const hintId = useId();
  const ref = useFocusAfterFirst(done);
  const timer = useDeadlineTimer({ durationMs: holdMs(plan, done), chime: false, tickMs: 100, onDone: () => onEnd(1) });
  const running = timer.state === 'running';
  const toggle = () => {
    if (running) { const reached = timer.fraction; timer.stop(); onEnd(reached); }
    else timer.start();
  };
  return (
    <div className="flex justify-center">
      <span id={hintId} hidden>{hint}</span>
      <button ref={ref} type="button" aria-describedby={hintId} aria-pressed={running} onClick={toggle}
        className="rounded-full select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]">
        <Breathing on={running}>
          <ProgressRing value={timer.fraction} size={200} stroke={5} smooth={false}>
            <span className="block max-w-[9rem] text-center text-lg font-medium text-[var(--color-text-primary)] text-balance">{running ? runningLabel : label}</span>
          </ProgressRing>
        </Breathing>
      </button>
    </div>
  );
}

/**
 * The ring breathes while a hold runs: one breath (out and back) per beat, beat n lasting `pulseMs(n)`, so it
 * starts at 1 Hz and slows. Still under reduced motion.
 */
function Breathing({ on, children }: { on: boolean; children: ReactNode }) {
  const reduce = useReducedMotion();
  const [half, setHalf] = useState(0);
  useEffect(() => {
    if (!on || reduce) return;
    let h = 0;
    let id = 0;
    const step = () => { h += 1; setHalf(h); id = window.setTimeout(step, pulseMs(Math.floor(h / 2)) / 2); };
    id = window.setTimeout(step, pulseMs(0) / 2);
    return () => window.clearTimeout(id);
  }, [on, reduce]);
  const moving = on && !reduce;
  const up = moving && half % 2 === 1;
  return (
    <div className="transition-transform ease-in-out"
      style={{ transform: `scale(${up ? 1.035 : 1})`, transitionDuration: moving ? `${pulseMs(Math.floor(half / 2)) / 2}ms` : '0ms' }}>
      {children}
    </div>
  );
}
