import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { primaryButton, linkButton, secondaryText } from '../oppositeAction/styles';
import { ProgressRing } from './ProgressRing';
import { buzz, useLatest } from './hooks';

// ── Cyclic sigh pacer ───────────────────────────────────────────────────────
export interface BreathPhase { key: 'in' | 'sip' | 'out'; label: string; ms: number }
const SCALE: Record<BreathPhase['key'], number> = { in: 0.86, sip: 1, out: 0.42 };

export function BreathOrb({ phases, cycles, startLabel, skipLabel, doneLabel, onDone, compact }: {
  phases: BreathPhase[]; cycles: number; startLabel: string; skipLabel: string; doneLabel: string;
  onDone: (completed: boolean) => void; compact?: boolean;
}) {
  const reduce = useReducedMotion();
  const done = useLatest(onDone);
  const finishedOnce = useRef(false);
  const [running, setRunning] = useState(false);
  const [i, setI] = useState(0);
  const total = cycles * phases.length;
  const finished = i >= total;
  const phase = phases[i % phases.length];

  const finish = (completed: boolean) => {
    if (finishedOnce.current) return;
    finishedOnce.current = true;
    done.current(completed);
  };

  useEffect(() => {
    if (!running || finished) return;
    buzz(phase.key === 'out' ? [8, 60, 8] : 10);
    const t = window.setTimeout(() => setI(n => n + 1), phase.ms);
    return () => window.clearTimeout(t);
  }, [running, i, finished, phase]);

  useEffect(() => {
    if (!finished) return;
    buzz([10, 50, 10, 50, 20]);
    const t = window.setTimeout(() => finish(true), 900);
    return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const size = compact ? 200 : 248;
  const scale = !running || finished ? 0.5 : SCALE[phase.key];
  const cycle = Math.min(Math.floor(i / phases.length), cycles - 1);
  const label = !running ? '' : finished ? doneLabel : phase.label;

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="relative grid place-items-center" style={{ width: size, height: size }} aria-hidden="true">
        <div className="absolute inset-0 rounded-full border border-dashed border-[var(--color-border)]" />
        <m.div className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--color-q-lp-fill) 70%, white), var(--color-accent-fill) 58%, color-mix(in oklab, var(--color-q-lu-fill) 75%, var(--color-accent-fill)))',
            boxShadow: '0 18px 50px -12px color-mix(in oklab, var(--color-accent-fill) 55%, transparent)',
          }}
          initial={false}
          animate={{ scale: reduce ? 0.75 : scale }}
          transition={{ duration: reduce || !running ? 0.3 : phase.ms / 1000, ease: phase.key === 'out' ? [0.33, 0, 0.2, 1] : [0.4, 0, 0.2, 1] }} />
      </div>
      {/* Label sits below the orb in body text colour: readable at any orb size, in both themes. */}
      <p className="min-h-7 text-lg font-semibold text-[var(--color-text-primary)]" aria-live="polite">
        <AnimatePresence mode="wait">
          <m.span key={label} className="inline-block" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }}>
            {label}
          </m.span>
        </AnimatePresence>
      </p>
      <div className="flex gap-2" aria-hidden="true">
        {Array.from({ length: cycles }, (_, c) => (
          <span key={c} className={`h-2 rounded-full motion-safe:transition-all ${c === cycle && running && !finished ? 'w-7' : 'w-2'} ${c < cycle || finished ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}`} />
        ))}
      </div>
      {!running
        ? <button type="button" className={primaryButton} onClick={() => setRunning(true)}>{startLabel}</button>
        : !finished && <button type="button" className={linkButton} onClick={() => finish(false)}>{skipLabel}</button>}
    </div>
  );
}

// ── Cold reset (TIPP temperature), timestamp-based so a backgrounded tab stays accurate ──
export function ColdReset({ steps, seconds, caution, startLabel, skipLabel, doneEarlyLabel, onDone, onSkip }: {
  steps: string[]; seconds: number; caution: string; startLabel: string; skipLabel: string; doneEarlyLabel: string;
  onDone: () => void; onSkip: () => void;
}) {
  const done = useLatest(onDone);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const left = endsAt === null ? seconds : Math.max(0, Math.ceil((endsAt - now) / 1000));

  useEffect(() => {
    if (endsAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endsAt]);
  useEffect(() => {
    if (endsAt === null || left > 0) return;
    buzz([20, 60, 20]);
    const t = window.setTimeout(() => done.current(), 600);
    return () => window.clearTimeout(t);
  }, [endsAt, left, done]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5 p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <ProgressRing value={endsAt === null ? 0 : 1 - left / seconds} size={96} label={`${left} seconds left`}>
          <span className="font-semibold text-2xl tabular-nums">{left}</span>
        </ProgressRing>
        <ol className="list-decimal pl-4 space-y-1 text-sm text-[var(--color-text-secondary)]">
          {steps.map(s => <li key={s}>{s}</li>)}
        </ol>
      </div>
      <p className={`${secondaryText} p-3 rounded-xl bg-[var(--color-bg-secondary)]`}>{caution}</p>
      {endsAt === null ? (
        <div className="space-y-2">
          <button type="button" className={primaryButton} onClick={() => { setNow(Date.now()); setEndsAt(Date.now() + seconds * 1000); }}>{startLabel}</button>
          <button type="button" className={linkButton} onClick={onSkip}>{skipLabel}</button>
        </div>
      ) : left > 0 && <button type="button" className={linkButton} onClick={() => done.current()}>{doneEarlyLabel}</button>}
    </div>
  );
}

// ── Orient + move: for hiding and shutdown. Up-regulates; never calms. ─────
export function Orient({ look, move, moveSeconds, startMoveLabel, skipLabel, seenLabel, onDone }: {
  look: string; move: string; moveSeconds: number; startMoveLabel: string;
  /** Always available: not everyone can stand, and orienting must never trap the user. */
  skipLabel: string;
  seenLabel: (n: number) => string; onDone: (completed: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const done = useLatest(onDone);
  const [seen, setSeen] = useState<boolean[]>([false, false, false]);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const count = seen.filter(Boolean).length;
  const left = endsAt === null ? moveSeconds : Math.max(0, Math.ceil((endsAt - now) / 1000));

  useEffect(() => {
    if (endsAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endsAt]);
  useEffect(() => {
    if (endsAt === null || left > 0) return;
    buzz([10, 40, 10]);
    const t = window.setTimeout(() => done.current(true), 500);
    return () => window.clearTimeout(t);
  }, [endsAt, left, done]);

  return (
    <div className="space-y-5">
      <p>{look}</p>
      <div className="flex gap-3" role="group" aria-label={seenLabel(count)}>
        {seen.map((on, i) => (
          <button key={i} type="button" aria-pressed={on} aria-label={seenLabel(i + 1)}
            onClick={() => { buzz(12); setSeen(s => s.map((v, j) => (j === i ? true : v))); }}
            className={`flex-1 aspect-square max-w-28 rounded-full grid place-items-center border-2 motion-safe:transition-colors ${
              on ? 'bg-[var(--color-accent-fill)] border-[var(--color-accent)] text-[var(--color-on-accent)]'
                : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>
            <svg width="34" height="34" viewBox="0 0 36 36" aria-hidden="true">
              <path d="M4 18 C 10 8, 26 8, 32 18 C 26 28, 10 28, 4 18 Z" fill="none" stroke="currentColor" strokeWidth="2.4" />
              {on && <circle cx="18" cy="18" r="4.5" fill="currentColor" />}
            </svg>
          </button>
        ))}
      </div>
      {count === 3 && (
        <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] space-y-4">
          <div className="flex items-center gap-4">
            <m.span aria-hidden="true" className="text-4xl"
              animate={endsAt !== null && left > 0 && !reduce ? { rotate: [-12, 12, -12] } : { rotate: 0 }}
              transition={{ duration: 0.3, repeat: endsAt !== null && left > 0 && !reduce ? Infinity : 0 }}>✋</m.span>
            <div>
              <p className="font-semibold">{move}</p>
              {endsAt !== null && <p className={`${secondaryText} tabular-nums`} aria-live="polite">{left}s</p>}
            </div>
          </div>
          {endsAt === null && (
            <button type="button" className={primaryButton} onClick={() => { setNow(Date.now()); setEndsAt(Date.now() + moveSeconds * 1000); }}>
              {startMoveLabel}
            </button>
          )}
        </div>
      )}
      <button type="button" className={linkButton} onClick={() => done.current(false)}>{skipLabel}</button>
    </div>
  );
}
