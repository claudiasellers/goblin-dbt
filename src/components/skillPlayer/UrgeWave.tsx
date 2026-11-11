import { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useDeadlineTimer } from '../../hooks/useDeadlineTimer';
import {
  afterTap, cameDown, checkMs, levels, maxChecks, nextLevel, rideOutput, SAMPLES, tracePath,
  type WaveEnd, type WaveSample,
} from '../../lib/urgeWave';
import { buzz } from '../tools/regulation/hooks';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * Ride it out's wave (DT-05, docs/design/ride-it-out.md; plan C3b `urgeWave`). The urge is an object on the screen,
 * watched, not fought. A soft check comes every so often on the deadline clock (*still here · fading · gone ·
 * bigger*), and the object answers: it swells, softens or settles. No digits and no countdown: nothing promises how
 * long it lasts. *Not now* (adaptive denial, H21) is there the whole time, and so is the way on. The rules are
 * src/lib/urgeWave.ts (pure).
 *
 * Output: the samples in order, then how the ride ended (`ended_gone` · `ended_bigger` · `ended_not_now` ·
 * `ended_left` · `ended_long`), with the seconds it ran and the checks answered.
 *
 * `waveTrace` draws a ride's samples (the field `rideField`, and `againField` when there was a second ride) as one
 * line without axes, with its line: came down, or rode it as far as it went.
 */

const text = (props: Record<string, unknown>, k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');

/** Milliseconds since `t` (read in a handler, never during render). */
const msSince = (t: number) => Date.now() - t;

function useShownOnce(onShown: () => void) {
  const shown = useRef(false);
  useEffect(() => { if (!shown.current) { shown.current = true; onShown(); } }, [onShown]);
}

export function UrgeWave({ props, answerIds = {}, onShown, onDone, covered }: EmbedProps) {
  useShownOnce(onShown);
  const reduce = useReducedMotion();
  const max = maxChecks(props);
  const checkId = useId();
  const [trace, setTrace] = useState<WaveSample[]>([]);
  // A second ride carries on from where the first left the object, so the trace at the close is what they saw.
  const [level, setLevel] = useState(() => {
    const ls = levels(answerIds[text(props, 'continueFrom')] ?? []);
    return ls[ls.length - 1];
  });
  const [due, setDue] = useState(false);
  const [said, setSaid] = useState('');
  const started = useRef<number>(0);
  const finished = useRef(false);
  const ridingRef = useRef<HTMLParagraphElement>(null);
  const tapped = useRef(false);
  const coveredRef = useRef(covered);
  useEffect(() => { coveredRef.current = covered; }, [covered]);
  useEffect(() => { started.current = Date.now(); }, []);
  // The keep-awake while riding is the deadline timer's own (useKeepAwake while running). No buzz while the
  // resources or P2 sit over the step: the check waits on the screen for when they're back.
  const timer = useDeadlineTimer({
    durationMs: checkMs(props), chime: false, tickMs: 500,
    onDone: () => { if (!coveredRef.current) buzz(20); setDue(true); setSaid(text(props, 'checkTitle')); },
  });
  // The first wait starts on arrival; each later one after a tap.
  const { start } = timer;
  useEffect(() => { start(); }, [start]);
  // After a check tap the chip that had focus is gone: focus goes to the riding line, never left on nothing. Never
  // moved when a check arrives (it's announced instead).
  useEffect(() => {
    if (!due && tapped.current) { tapped.current = false; ridingRef.current?.focus({ preventScroll: true }); }
  }, [due]);

  const end = (how: WaveEnd, t = trace) => {
    if (finished.current) return;
    finished.current = true;
    onDone?.(rideOutput(t, how, msSince(started.current)));
  };
  const tap = (s: WaveSample) => {
    const t = [...trace, s];
    setTrace(t);
    setLevel((l) => nextLevel(l, s));
    setSaid(text(props, s));
    const over = afterTap(trace, s, max);
    if (over) { end(over, t); return; }
    tapped.current = true;
    setDue(false);
    start();
  };

  const size = 72 + level * 120;
  return (
    <section className="space-y-6" data-testid="urge-wave" data-checks={trace.length}>
      <div className="flex justify-center items-center h-[220px]" aria-hidden="true">
        <motion.span className="block" animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
          transition={reduce ? undefined : { duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
          <span className="block rounded-[46%] bg-[var(--color-accent)]"
            style={{ width: size, height: size * 0.82, opacity: 0.18 + level * 0.3, transition: reduce ? 'none' : 'all 900ms ease-in-out' }} />
        </motion.span>
      </div>
      {/* One live region, mounted for the whole ride: the check arriving, then the tap. */}
      <p className="sr-only" aria-live="polite">{said}</p>
      {/* The slot keeps its height either way, so a check arriving never moves the buttons under a finger. */}
      <div className="min-h-[9.5rem] flex flex-col justify-center">
        {due ? (
          <div className="space-y-3" role="group" aria-labelledby={checkId}>
            <p id={checkId} className="text-lg font-medium text-[var(--color-text-primary)]">{text(props, 'checkTitle')}</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button key={s} type="button" className="den-chip den-chip--small" onClick={() => tap(s)}>{text(props, s)}</button>
              ))}
            </div>
          </div>
        ) : (
          <p ref={ridingRef} tabIndex={-1} className="text-center text-[var(--color-text-secondary)] focus:outline-none">{text(props, 'riding')}</p>
        )}
      </div>
      {text(props, 'notNow') && (
        <button type="button" className={primaryButton} data-not-now="" onClick={() => end('ended_not_now')}>{text(props, 'notNow')}</button>
      )}
      <div className="flex justify-center">
        <button type="button" className={linkButton} onClick={() => end('ended_left')}>{text(props, 'next')}</button>
      </div>
    </section>
  );
}

export function WaveTrace({ props, answerIds = {}, onShown, onDone }: EmbedProps) {
  useShownOnce(onShown);
  const ride = answerIds[text(props, 'rideField')] ?? [];
  const again = answerIds[text(props, 'againField')] ?? [];
  const all = [...ride, ...again];
  const down = cameDown(again.length ? again : ride);
  // *It rose, crested and came down* only when it was seen to rise (a *bigger* tap); else the plain down line.
  const line = down ? (all.includes('bigger') && text(props, 'riseLine') ? 'riseLine' : 'downLine') : 'heldLine';
  const ls = levels(all);
  const W = 300;
  const H = 120;
  return (
    <section className="space-y-5" data-testid="wave-trace" data-down={down ? 'yes' : 'no'}>
      <div className="rounded-2xl bg-[var(--color-bg-elevated)] p-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-hidden="true">
          <path d={tracePath(ls, W, H)} fill="none" stroke="var(--color-accent)" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-lg leading-snug text-[var(--color-text-primary)] text-balance">{text(props, line)}</p>
      <button type="button" className={primaryButton} onClick={() => onDone?.({ ids: ['read'] })}>{text(props, 'next')}</button>
    </section>
  );
}
