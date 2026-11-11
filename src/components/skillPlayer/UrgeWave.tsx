import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useDeadlineTimer, useKeepAwake } from '../../hooks/useDeadlineTimer';
import {
  afterTap, cameDown, checkMs, levels, maxChecks, nextLevel, rideOutput, SAMPLES, START_LEVEL, tracePath,
  type WaveEnd, type WaveSample,
} from '../../lib/urgeWave';
import { buzz } from '../tools/regulation/hooks';
import { Chip } from '../tools/wiseMind/bits';
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

export function UrgeWave({ props, onShown, onDone, covered }: EmbedProps) {
  useShownOnce(onShown);
  const reduce = useReducedMotion();
  const max = maxChecks(props);
  const [trace, setTrace] = useState<WaveSample[]>([]);
  const [level, setLevel] = useState(START_LEVEL);
  const [due, setDue] = useState(false);
  const started = useRef<number>(0);
  useEffect(() => { started.current = Date.now(); }, []);
  const timer = useDeadlineTimer({ durationMs: checkMs(props), chime: false, tickMs: 500, onDone: () => { buzz(20); setDue(true); } });
  useKeepAwake(!due);
  // The first wait starts on arrival; each later one after a tap. Covered (safety.open, P2) doesn't stop the clock:
  // the check waits on the screen for when they're back.
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; timer.start(); } }, [timer]);

  const end = (how: WaveEnd, t = trace) => onDone?.(rideOutput(t, how, msSince(started.current)));
  const tap = (s: WaveSample) => {
    const t = [...trace, s];
    setTrace(t);
    setLevel((l) => nextLevel(l, s));
    setDue(false);
    const over = afterTap(trace, s, max);
    if (over) { end(over, t); return; }
    timer.start();
  };
  void covered;

  const size = 72 + level * 120;
  return (
    <section className="space-y-6" data-testid="urge-wave" data-checks={trace.length}>
      <div className="flex justify-center items-center h-[220px]" aria-hidden="true">
        <span className={`block rounded-[46%] bg-[var(--color-accent)] ${reduce ? '' : 'animate-[pulse_4s_ease-in-out_infinite]'}`}
          style={{ width: size, height: size * 0.82, opacity: 0.18 + level * 0.3, transition: reduce ? 'none' : 'all 900ms ease-in-out' }} />
      </div>
      {due ? (
        <div className="space-y-3" role="group" aria-labelledby="urge-wave-check">
          <p id="urge-wave-check" className="text-lg font-medium text-[var(--color-text-primary)]" aria-live="polite">{text(props, 'checkTitle')}</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLES.map((s) => <Chip key={s} label={text(props, s)} pressed={false} onClick={() => tap(s)} />)}
          </div>
        </div>
      ) : (
        <p className="text-center text-[var(--color-text-secondary)]" aria-live="polite">{text(props, 'riding')}</p>
      )}
      <p className="sr-only" aria-live="polite">{trace.length ? text(props, trace[trace.length - 1]) : ''}</p>
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
  const ls = levels(all);
  const W = 300;
  const H = 120;
  return (
    <section className="space-y-5" data-testid="wave-trace" data-down={down ? 'yes' : 'no'}>
      <div className="rounded-2xl bg-[var(--color-bg-elevated)] p-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={text(props, down ? 'downLine' : 'heldLine')}>
          <path d={tracePath(ls, W, H)} fill="none" stroke="var(--color-accent)" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-lg leading-snug text-[var(--color-text-primary)] text-balance" role="status">{text(props, down ? 'downLine' : 'heldLine')}</p>
      <button type="button" className={primaryButton} onClick={() => onDone?.({ ids: ['read'] })}>{text(props, 'next')}</button>
    </section>
  );
}
