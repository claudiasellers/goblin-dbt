import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { useDeadlineTimer } from '../../hooks/useDeadlineTimer';
import { useHoldGesture } from '../../hooks/useHoldGesture';
import {
  breathPace, breathPhase, breathScale, doseMs, findCount, findOutput, leadCount, leadInSeconds, nowLines,
  leftAt, SQUEEZE_COUNTS_FROM, squeezeOutput, squeezePlan, timedOutput,
} from '../../lib/bodyModes';
import { ProgressRing } from '../tools/regulation/ProgressRing';
import { buzz } from '../tools/regulation/hooks';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * First, the body's modes (DT-01, docs/design/first-the-body.md): one body mode per screen, no digits on the acute
 * path, every timer on the deadline clock (R13) with the screen kept awake and a chime with a buzz at the end. The
 * rules are src/lib/bodyModes.ts (pure). Every word arrives as a copy prop. Nothing locks: the way on is there from
 * the start, as a quiet link until the mode is done, then as the button.
 *
 * - `doseTimer`: up to three steps and a caution line, then tap to start a hands-free dose after a short lead-in
 *   (Circuit Breaker, cold on the face, with its art).
 * - `bodyCard`: one cue and a ring that fills hands-free (wake up, something strong, nothing to do).
 * - `breathPacer`: in and out at a set pace, the out-breath longer; *Dizzy or tingly?* stops it at once.
 * - `squeezeRelease`: press and hold to squeeze on the in-breath, let go to drop on the out-breath, a few rounds.
 * - `orientFind`: today's date and the time, then *Found one* a few times.
 *
 * Each reports `done` · `partly` · `skipped` (the breath pacer also `dizzy`) and the seconds it ran: measurements,
 * never ratings.
 */

const text = (props: Record<string, unknown>, k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');

function useShownOnce(onShown: () => void) {
  const shown = useRef(false);
  useEffect(() => { if (!shown.current) { shown.current = true; onShown(); } }, [onShown]);
}

/** The way on: a quiet link until the mode is done (nothing locks), then the button, which takes focus. */
function WayOn({ done, label, onGo }: { done: boolean; label: string; onGo: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (done) ref.current?.focus({ preventScroll: true }); }, [done]);
  return done
    ? <button ref={ref} type="button" className={primaryButton} onClick={onGo}>{label}</button>
    : <div className="flex justify-center"><button type="button" className={linkButton} onClick={onGo}>{label}</button></div>;
}

/** A tap-to-start ring on the deadline clock: tap starts, tap again stops where it is. */
function TimedRing({ ms, leadIn = 0, label, running, leadLabel, onStop, onEnd, autoStart = false, finished = false, liveRef, children }: {
  ms: number; leadIn?: number; label: string; running: string; leadLabel?: (n: number) => string; autoStart?: boolean;
  /** The dose is done: the ring stays mounted (full, inert) so the timer's end chime isn't cut off by an unmount. */
  finished?: boolean;
  /** Where a running dose is, kept fresh every tick, so leaving mid-dose reports what was done (not `skipped`). */
  liveRef?: { current: { fraction: number; ranMs: number } | null };
  onStop: (fraction: number, ranMs: number) => void; onEnd: () => void; children?: ReactNode;
}) {
  const total = ms + leadIn * 1000;
  const timer = useDeadlineTimer({ durationMs: total, tickMs: 100, onDone: onEnd });
  const on = timer.state === 'running';
  // A card with nothing to do (`still`) runs on its own: asking for a tap would be one more thing to do.
  const started = useRef(false);
  useEffect(() => { if (autoStart && !started.current) { started.current = true; timer.start(); } }, [autoStart, timer]);
  const lead = on ? leadCount(leadIn, timer.elapsedMs) : null;
  const doseFraction = Math.max(0, (timer.elapsedMs - leadIn * 1000) / ms);
  const ranMs = Math.max(0, timer.elapsedMs - leadIn * 1000);
  useEffect(() => { if (liveRef) liveRef.current = on ? { fraction: Math.min(1, doseFraction), ranMs } : null; });
  const toggle = () => {
    if (on) { timer.stop(); onStop(Math.min(1, doseFraction), Math.max(0, timer.elapsedMs - leadIn * 1000)); }
    else timer.start();
  };
  return (
    <div className="flex flex-col items-center gap-3">
      {children}
      <button type="button" aria-pressed={on} onClick={toggle} data-dose="" disabled={finished}
        className="rounded-full select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]">
        <ProgressRing value={finished || timer.state === 'done' ? 1 : lead !== null ? 0 : doseFraction} size={200} stroke={5} smooth={false}>
          <span role={lead !== null ? 'timer' : undefined} aria-live={lead !== null ? 'assertive' : undefined}
            className="block max-w-[9rem] text-center text-lg font-medium text-[var(--color-text-primary)] text-balance">
            {finished ? '' : lead !== null && leadLabel ? leadLabel(lead) : on ? running : label}
          </span>
        </ProgressRing>
      </button>
    </div>
  );
}

/** The steps and the caution line a dose or card shows above its ring. */
function Steps({ props }: { props: Record<string, unknown> }) {
  const steps = ['step1', 'step2', 'step3'].map((k) => text(props, k)).filter(Boolean);
  const caution = text(props, 'caution');
  if (!steps.length && !caution) return null;
  return (
    <div className="space-y-2">
      {steps.length > 0 && (
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-lg leading-snug text-[var(--color-text-primary)]">
              <span aria-hidden="true" className="shrink-0 w-7 h-7 rounded-full grid place-items-center text-sm bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}
      {caution && <p className="text-sm text-[var(--color-text-secondary)]" data-caution="">{caution}</p>}
    </div>
  );
}

const COLD_ART = '/tools/circuit-breaker/face.png';

export function DoseTimer({ props, onShown, onDone }: EmbedProps) {
  useShownOnce(onShown);
  const [result, setResult] = useState<{ fraction: number; ranMs: number }>({ fraction: 0, ranMs: 0 });
  const liveRef = useRef<{ fraction: number; ranMs: number } | null>(null);
  const ms = doseMs(props, 30);
  const lead = leadInSeconds(props);
  const done = result.fraction >= 1;
  const leadWord = text(props, 'lead');
  return (
    <section className="space-y-5" data-testid="dose-timer" data-art={text(props, 'art') || 'none'}>
      {props.art === 'cold' && (
        <img src={COLD_ART} alt="" aria-hidden="true" draggable={false} className="mx-auto h-28 w-auto select-none pointer-events-none" />
      )}
      <Steps props={props} />
      <TimedRing ms={ms} leadIn={lead} label={text(props, 'start')} running={text(props, 'running')} finished={done} liveRef={liveRef}
        leadLabel={leadWord ? (n) => `${leadWord} ${n}` : undefined}
        onStop={(fraction, ranMs) => setResult({ fraction, ranMs })}
        onEnd={() => { buzz(30); setResult({ fraction: 1, ranMs: ms }); }} />
      {done && <p role="status" className="text-center text-[var(--color-text-secondary)]">{text(props, 'done')}</p>}
      <WayOn done={done} label={text(props, 'next')} onGo={() => { const r = leftAt(result, liveRef.current); onDone?.(timedOutput(r.fraction, r.ranMs)); }} />
    </section>
  );
}

export function BodyCard({ props, onShown, onDone }: EmbedProps) {
  useShownOnce(onShown);
  const [result, setResult] = useState<{ fraction: number; ranMs: number }>({ fraction: 0, ranMs: 0 });
  const liveRef = useRef<{ fraction: number; ranMs: number } | null>(null);
  const ms = doseMs(props, 30);
  const done = result.fraction >= 1;
  return (
    <section className="space-y-5" data-testid="body-card" data-kind={text(props, 'kind')}>
      {text(props, 'cue') && <p className="text-lg leading-snug text-[var(--color-text-primary)] text-balance">{text(props, 'cue')}</p>}
      <Steps props={props} />
      <TimedRing ms={ms} label={text(props, 'start')} running={text(props, 'running')} autoStart={props.kind === 'still'} finished={done} liveRef={liveRef}
        onStop={(fraction, ranMs) => setResult({ fraction, ranMs })}
        onEnd={() => setResult({ fraction: 1, ranMs: ms })} />
      {done && <p role="status" className="text-center text-[var(--color-text-secondary)]">{text(props, 'done')}</p>}
      <WayOn done={done} label={text(props, 'next')} onGo={() => { const r = leftAt(result, liveRef.current); onDone?.(timedOutput(r.fraction, r.ranMs)); }} />
    </section>
  );
}

export function BreathPacer({ props, onShown, onDone }: EmbedProps) {
  useShownOnce(onShown);
  const reduce = useReducedMotion();
  const pace = breathPace(props);
  const ms = doseMs(props, 90);
  const [ended, setEnded] = useState<{ fraction: number; ranMs: number } | null>(null);
  const timer = useDeadlineTimer({ durationMs: ms, tickMs: 100, onDone: () => setEnded({ fraction: 1, ranMs: ms }) });
  const on = timer.state === 'running';
  const b = breathPhase(pace, timer.elapsedMs);
  const scale = on ? breathScale(b.phase, b.t) : 0.6;
  const done = ended?.fraction === 1;
  const stop = (dizzy: boolean) => {
    const ranMs = on ? timer.elapsedMs : ended?.ranMs ?? 0;
    const fraction = on ? timer.fraction : ended?.fraction ?? 0;
    timer.stop();
    if (dizzy) onDone?.({ ids: ['dizzy'], durationSec: Math.round(ranMs / 1000) });
    else onDone?.(timedOutput(fraction, ranMs));
  };
  return (
    <section className="space-y-5" data-testid="breath-pacer" data-phase={on ? b.phase : 'idle'}>
      <Steps props={props} />
      <div className="flex flex-col items-center gap-3">
        <button type="button" aria-pressed={on} disabled={done}
          onClick={() => { if (on) { timer.stop(); setEnded({ fraction: timer.fraction, ranMs: timer.elapsedMs }); } else timer.start(); }}
          className="relative w-[200px] h-[200px] rounded-full grid place-items-center select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]">
          <span aria-hidden="true" className="absolute inset-0 rounded-full bg-[var(--color-accent)] opacity-20"
            style={{ transform: `scale(${reduce ? 1 : scale})`, transition: reduce ? 'none' : 'transform 100ms linear' }} />
          <span aria-live="polite" className="relative block max-w-[9rem] text-center text-lg font-medium text-[var(--color-text-primary)] text-balance">
            {done ? text(props, 'done') : on ? text(props, b.phase === 'in' ? 'inLabel' : 'outLabel') : text(props, 'start')}
          </span>
        </button>
      </div>
      {/* The stop rule (PRD DT-01): never a must-do; dizzy or tingly ends it at once and the flow switches modality. */}
      <div className="flex justify-center">
        <button type="button" className={linkButton} onClick={() => stop(true)} data-dizzy="">{text(props, 'dizzy')}</button>
      </div>
      <WayOn done={done} label={text(props, 'next')} onGo={() => stop(false)} />
    </section>
  );
}

export function SqueezeRelease({ props, onShown, onDone }: EmbedProps) {
  useShownOnce(onShown);
  const reduce = useReducedMotion();
  const plan = squeezePlan(props);
  const [doneCount, setDoneCount] = useState(0);
  const [squeezedMs, setSqueezedMs] = useState(0);
  const [dropping, setDropping] = useState(false);
  const finished = doneCount >= plan.rounds;
  const drop = useDeadlineTimer({ durationMs: plan.dropMs, chime: false, tickMs: 100, onDone: () => setDropping(false) });
  const end = (reached: number) => {
    setSqueezedMs((m) => m + Math.round(plan.squeezeMs * Math.min(1, reached)));
    if (reached >= SQUEEZE_COUNTS_FROM) { buzz(30); setDoneCount((n) => n + 1); setDropping(true); drop.start(); }
  };
  const { p, mode, handlers } = useHoldGesture({ ms: plan.squeezeMs, onLetGo: end, onComplete: () => end(1) });
  const squeezing = mode !== 'idle';
  // The blob: tight while squeezing, melting while it drops.
  const blob = squeezing ? 1 - 0.25 * p : dropping ? 0.75 + 0.25 * drop.fraction : 1;
  return (
    <section className="space-y-5" data-testid="squeeze-release" data-rounds={doneCount}>
      <Steps props={props} />
      <ol aria-hidden="true" className="flex justify-center gap-2">
        {Array.from({ length: plan.rounds }, (_, i) => (
          <li key={i} className={`h-2.5 w-2.5 rounded-full ${i < doneCount ? 'bg-[var(--color-accent)]' : 'border border-[var(--color-text-tertiary)]'}`} />
        ))}
      </ol>
      {finished
        ? <p role="status" className="text-center text-[var(--color-text-secondary)]">{text(props, 'done')}</p>
        : (
          <div className="flex justify-center">
            <button type="button" data-hold="" disabled={dropping} {...handlers}
              className="rounded-full select-none touch-none [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]">
              <ProgressRing value={squeezing ? p : 0} size={200} stroke={5} smooth={false}>
                <span aria-hidden="true" className="absolute inset-0 m-auto w-24 h-24 rounded-[45%] bg-[var(--color-accent)] opacity-25"
                  style={{ transform: `scale(${reduce ? 1 : blob})`, transition: reduce ? 'none' : 'transform 150ms ease-out' }} />
                <span aria-live="polite" className="relative block max-w-[9rem] text-center text-lg font-medium text-[var(--color-text-primary)] text-balance">
                  {dropping ? text(props, 'dropLabel') : squeezing ? text(props, 'squeezeLabel') : text(props, 'start')}
                </span>
              </ProgressRing>
            </button>
          </div>
        )}
      <WayOn done={finished} label={text(props, 'next')} onGo={() => onDone?.(squeezeOutput(plan.rounds, doneCount, squeezedMs))} />
    </section>
  );
}

export function OrientFind({ props, onShown, onDone }: EmbedProps) {
  useShownOnce(onShown);
  const count = findCount(props);
  const [found, setFound] = useState(0);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 15_000); return () => window.clearInterval(id); }, []);
  const { date, time } = nowLines(now);
  const done = found >= count;
  return (
    <section className="space-y-5" data-testid="orient-find" data-variant={text(props, 'variant')} data-found={found}>
      <div className="text-center space-y-1">
        <p className="text-sm text-[var(--color-text-secondary)]">{text(props, 'here')}</p>
        <p className="font-serif text-2xl text-[var(--color-text-primary)]">{date}</p>
        <p className="font-serif text-xl text-[var(--color-text-secondary)]">{time}</p>
      </div>
      <p className="text-lg leading-snug text-[var(--color-text-primary)] text-balance">{text(props, 'task')}</p>
      <ol aria-hidden="true" className="flex justify-center gap-2">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className={`h-3 w-3 rounded-full ${i < found ? 'bg-[var(--color-accent)]' : 'border border-[var(--color-text-tertiary)]'}`} />
        ))}
      </ol>
      {done
        ? <p role="status" className="text-center text-[var(--color-text-secondary)]">{text(props, 'done')}</p>
        : (
          <button type="button" className={primaryButton} data-found-one="" onClick={() => { buzz(20); setFound((n) => n + 1); }}>
            {text(props, 'foundLabel')}
          </button>
        )}
      <WayOn done={done} label={text(props, 'next')} onGo={() => onDone?.(findOutput(count, found))} />
    </section>
  );
}
