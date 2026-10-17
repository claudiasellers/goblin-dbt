import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotionConfig } from 'motion/react';
import type { WiseMindPracticeItem } from '../../../data/wiseMindTypes';
import { HoldButton } from '../../parts/LightHold';
import { choiceButton, choiceSelected } from '../oppositeAction/styles';

/**
 * Wise mind's three ways in (docs/design/wise-mind.md, screen 3; DBT Mindfulness Handout 3a). 2D, in the
 * room's colours. No countdown numbers and no progress score: the page's *I'm here* is always on screen
 * to move on early, and each practice calls `onEnd` when it has run its course (the page then moves
 * focus to *I'm here*; it never moves on by itself). Reduced motion (the device's, or a MotionConfig's):
 * still frames, no transitions.
 */

/** Breath timings (ms): an unhurried in-breath, a longer out-breath. Never shown. */
export const IN_MS = 4000;
export const OUT_MS = 5500;

export function PracticePicker({ practices, picked, onPick }: {
  practices: readonly WiseMindPracticeItem[]; picked: string | null; onPick: (id: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      {practices.map((p) => (
        <button key={p.id} type="button" aria-pressed={picked === p.id ? 'true' : 'false'} onClick={() => onPick(p.id)}
          className={`${choiceButton} ${picked === p.id ? choiceSelected : ''}`}>
          <span className="block font-medium">{p.name}</span>
          <span className="block text-sm">{p.sub}</span>
        </button>
      ))}
    </div>
  );
}

/** A circle's size as a scale about its own centre (a transform, so it can ease; `r` can't). */
const grow = (s: number) => ({ transform: `scale(${s})`, transformBox: 'fill-box' as const, transformOrigin: 'center' });

/** The practice's words, read out politely as they change. */
function Said({ children }: { children: string }) {
  return <p aria-live="polite" className="min-h-16 font-serif text-xl text-center text-[var(--color-text-primary)] text-balance">{children}</p>;
}

function useTimeline(steps: number[], onDone: () => void) {
  const [at, setAt] = useState(0);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);
  useEffect(() => {
    if (at >= steps.length) { done.current(); return; }
    const t = setTimeout(() => setAt((x) => x + 1), steps[at]);
    return () => clearTimeout(t);
  }, [at, steps]);
  return at;
}

/**
 * Stone on the lake: a flat stone drifts down through clear water and settles on the sand, over the
 * practice's `seconds`, one line per third. Reduced motion: three still frames, one per line.
 */
export function StoneLake({ practice, onEnd }: { practice: WiseMindPracticeItem; onEnd: () => void }) {
  const reduce = useReducedMotionConfig() === true;
  const id = useId().replace(/[^\w-]/g, '');
  const lines = practice.lines;
  const per = Math.round(((practice.seconds ?? 40) * 1000) / Math.max(1, lines.length));
  const [steps] = useState(() => lines.map(() => per));
  const at = useTimeline(steps, onEnd);
  const frame = Math.min(at, lines.length - 1);
  // Where the stone is: on the water, part way down, on the sand.
  const ys = [44, 108, 166];
  const y = reduce ? ys[Math.min(frame, ys.length - 1)] : at === 0 ? ys[0] : ys[2];
  const [sinking, setSinking] = useState(false);
  useEffect(() => { if (!reduce) { const r = requestAnimationFrame(() => setSinking(true)); return () => cancelAnimationFrame(r); } }, [reduce]);
  const style = reduce ? undefined : { transform: `translateY(${sinking ? ys[2] - ys[0] : 0}px)`, transition: `transform ${per * Math.max(1, lines.length - 1)}ms cubic-bezier(.3,.1,.3,1)` };
  return (
    <div className="space-y-4" data-testid="practice-stone">
      <svg viewBox="0 0 320 200" className="block w-full h-auto rounded-3xl bg-[var(--color-bg-secondary)]" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-w`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--color-q-lp-fill)', stopOpacity: 0.25 }} />
            <stop offset="1" style={{ stopColor: 'var(--color-q-lu-fill)', stopOpacity: 0.45 }} />
          </linearGradient>
        </defs>
        <rect x="0" y="40" width="320" height="160" fill={`url(#${id}-w)`} />
        <path d="M0 40 Q80 34 160 40 T320 40" fill="none" style={{ stroke: 'var(--color-text-secondary)' }} strokeOpacity="0.35" />
        <path d="M0 182 Q90 172 170 180 T320 178 V200 H0 Z" style={{ fill: 'var(--color-q-hp-fill)' }} opacity="0.45" />
        <g style={style}>
          <ellipse cx="160" cy={reduce ? y : ys[0]} rx="15" ry="5" style={{ fill: 'var(--color-text-secondary)' }} opacity="0.85" />
        </g>
      </svg>
      <Said>{lines[frame] ?? ''}</Said>
    </div>
  );
}

/**
 * Wise in, mind out: `breaths` breaths. Press and hold on the in-breath (*wise*), let go on the
 * out-breath (*mind*): the same press as LightHold's, with its hands-free tap and keyboard hold. Letting
 * go early is simply the out-breath: nothing is a miss.
 */
export function WiseBreath({ practice, holdLabel, holdHint, letGo, onEnd }: {
  practice: WiseMindPracticeItem; holdLabel: string; holdHint: string; letGo: string; onEnd: () => void;
}) {
  const reduce = useReducedMotionConfig() === true;
  const total = practice.breaths ?? 5;
  const [breath, setBreath] = useState(0);
  const [phase, setPhase] = useState<'in' | 'out' | 'end'>('in');
  const [fill, setFill] = useState(0);
  const ended = useRef(onEnd);
  useEffect(() => { ended.current = onEnd; }, [onEnd]);
  // Keyboard and switch users keep their place: focus stays with the breath (the hold, then the
  // out-breath line, then the next hold), never dropped to the page when the control changes.
  const box = useRef<HTMLDivElement>(null);
  const keep = useRef(false);
  const hadFocus = () => !!box.current && box.current.contains(document.activeElement);
  useEffect(() => {
    if (!keep.current) return;
    keep.current = false;
    box.current?.querySelector<HTMLElement>('[data-hold], [data-breath-out]')?.focus({ preventScroll: true });
  }, [phase, breath]);
  useEffect(() => {
    if (phase !== 'out') return;
    const t = setTimeout(() => {
      if (breath + 1 >= total) { setPhase('end'); ended.current(); }
      else { keep.current = hadFocus(); setBreath((b) => b + 1); setFill(0); setPhase('in'); }
    }, OUT_MS);
    return () => clearTimeout(t);
  }, [phase, breath, total]);
  const out = () => { if (phase === 'in') { keep.current = hadFocus(); setPhase('out'); } };
  const [inLine, outLine] = [practice.lines[0] ?? '', practice.lines[1] ?? ''];
  const r = phase === 'in' ? 34 + fill * 40 : phase === 'out' ? 34 : 50;
  return (
    <div ref={box} className="space-y-4" data-testid="practice-breath">
      <svg viewBox="0 0 320 170" className="block w-full h-auto rounded-3xl bg-[var(--color-bg-secondary)]" aria-hidden="true">
        <circle cx="160" cy="85" r="74" style={{ fill: 'var(--color-accent)', ...grow(reduce ? (phase === 'in' && fill > 0 ? 1 : 0.6) : r / 74) }} opacity="0.3"
          className={phase === 'out' && !reduce ? 'motion-safe:transition-transform motion-safe:duration-[5000ms] motion-safe:ease-out' : ''} />
        <circle cx="160" cy="85" r="6" style={{ fill: 'var(--color-accent)' }} opacity="0.85" />
      </svg>
      <Said>{phase === 'in' ? inLine : outLine}</Said>
      {phase === 'in'
        ? <HoldButton key={breath} label={holdLabel} hint={holdHint} ms={IN_MS} onProgress={setFill} onLetGo={out} onComplete={out} />
        : phase === 'out' && <p data-breath-out="" tabIndex={-1} className="min-h-12 grid place-items-center text-sm text-[var(--color-text-secondary)] focus:outline-none">{letGo}</p>}
    </div>
  );
}

/**
 * Ask and listen: `breaths` breaths. In: the question, in the person's words or the chip's. Out:
 * *Listen.* and nothing else.
 */
export function AskListen({ practice, question, onEnd }: { practice: WiseMindPracticeItem; question: string | null; onEnd: () => void }) {
  const reduce = useReducedMotionConfig() === true;
  const total = practice.breaths ?? 3;
  const [steps] = useState(() => Array.from({ length: total * 2 }, (_, i) => (i % 2 === 0 ? IN_MS : OUT_MS)));
  const at = useTimeline(steps, onEnd);
  const breathingIn = at < steps.length && at % 2 === 0;
  const [askLine, listen] = [practice.lines[0] ?? '', practice.lines[1] ?? ''];
  return (
    <div className="space-y-4" data-testid="practice-ask">
      <svg viewBox="0 0 320 170" className="block w-full h-auto rounded-3xl bg-[var(--color-bg-secondary)]" aria-hidden="true">
        <circle cx="160" cy="85" r="74" style={{ fill: 'var(--color-accent)', ...grow(reduce ? 0.68 : breathingIn ? 1 : 0.5) }} opacity="0.28"
          className={reduce ? '' : 'motion-safe:transition-transform motion-safe:duration-[4000ms] motion-safe:ease-in-out'} />
        <circle cx="160" cy="85" r="6" style={{ fill: 'var(--color-accent)' }} opacity="0.85" />
      </svg>
      {breathingIn
        ? (
          <div aria-live="polite" className="min-h-16 space-y-1 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">{askLine}</p>
            {question && <p className="font-serif text-xl text-[var(--color-text-primary)] text-balance">{question}</p>}
          </div>
        )
        : <Said>{listen}</Said>}
    </div>
  );
}
