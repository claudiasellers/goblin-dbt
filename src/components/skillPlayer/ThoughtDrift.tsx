import { useCallback, useEffect, useRef, useState } from 'react';
import { useDeadlineTimer } from '../../hooks/useDeadlineTimer';
import { doseMs, leftAt, timedOutput } from '../../lib/bodyModes';
import { leafAt, leafLabel, leafPosition, leavesOnWater, thoughtLine, thoughtWords, wordsShown, type Leaf } from '../../lib/thoughtDrift';
import { buzz } from '../tools/regulation/hooks';
import { linkButton } from '../tools/oppositeAction/styles';
import { Steps, WayOn } from './BodyEmbeds';
import type { EmbedProps } from './embeds';

/**
 * Thoughts passing through's two moves with the thought's own words on screen (DT-08 part 2,
 * docs/design/thoughts-passing.md; rules in src/lib/thoughtDrift.ts). `variant` `slow`: the thought arrives a word at
 * a time with wide gaps, then sits. `leaf`: the thought on a leaf floating across a stream at its own pace; *Another
 * leaf* puts it on the next one while the one before keeps floating (if it stays or comes back, that's fine; a new
 * leaf never takes an old one off the water), and an empty stream says it keeps going (`empty`). Both run on the deadline clock (R13), tap to
 * start, tap again to stop; the way on is there from the start (nothing locks). Reduced motion: the words appear
 * without fading in, and the leaf rests mid-stream (a new leaf replaces it in place).
 *
 * Props (EMBED_PROPS): `variant`, `field` (the thought: its labels, own words last), `seconds`, optional `step1`–`step3`,
 * `start`, `running`, `done`, `next`, and for the leaf `another` and `empty`. Reports `done` · `partly` · `skipped` and the seconds
 * it ran, and for the leaf how many leaves were set down, a restart's fresh leaf included (`doneCount`): measurements, never ratings.
 */
const text = (props: Record<string, unknown>, k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');

export function ThoughtDrift({ props, picked, onShown, onDone }: EmbedProps) {
  const shown = useRef(false);
  useEffect(() => { if (!shown.current) { shown.current = true; onShown(); } }, [onShown]);
  const leaf = props.variant === 'leaf';
  const field = typeof props.field === 'string' ? props.field : '';
  const line = thoughtLine(picked?.[field]);
  const ms = doseMs(props, leaf ? 45 : 30);
  const [result, setResult] = useState({ fraction: 0, ranMs: 0 });
  const end = useCallback(() => { buzz(30); setResult({ fraction: 1, ranMs: ms }); }, [ms]);
  const timer = useDeadlineTimer({ durationMs: ms, tickMs: 100, onDone: end });
  const on = timer.state === 'running';
  const done = result.fraction >= 1;
  // The leaves on the water, each floating at its own pace (a new one never takes an old one off), and how many were
  // set down (the start puts the first one on; a restart puts a fresh one on and counts it).
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const [setDown, setSetDown] = useState(0);
  const reduce = timer.reduceMotion;

  const toggle = () => {
    if (on) { timer.stop(); setResult({ fraction: timer.fraction, ranMs: timer.elapsedMs }); return; }
    timer.start();
    if (leaf) { setLeaves([{ key: setDown + 1, fromMs: 0 }]); setSetDown((n) => n + 1); }
  };
  const another = () => {
    const at = timer.elapsedMs;
    setLeaves((ls) => [...leavesOnWater(ls, at), { key: setDown + 1, fromMs: at }].slice(-MAX_ON_WATER));
    setSetDown((n) => n + 1);
  };
  const leave = () => {
    const r = leftAt(result, on ? { fraction: timer.fraction, ranMs: timer.elapsedMs } : null);
    timer.stop();
    onDone?.({ ...timedOutput(r.fraction, r.ranMs), ...(leaf ? { doneCount: setDown } : {}) });
  };

  const fraction = done ? 1 : on ? timer.fraction : result.fraction;
  const progress = (
    <div aria-hidden="true" className="h-1 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
      <div className="h-full bg-[var(--color-accent)]" style={{ width: `${Math.round(fraction * 100)}%` }} />
    </div>
  );

  return (
    <section className="space-y-5" data-testid="thought-drift" data-variant={leaf ? 'leaf' : 'slow'}>
      <Steps props={props} />
      {line && (leaf
        ? <Stream label={leafLabel(line)} leaves={streamLeaves(leaves, on ? timer.elapsedMs : result.ranMs, reduce)}
            moving={on && !reduce} still={!on} empty={on && !reduce ? text(props, 'empty') : ''} />
        : <SlowWords words={thoughtWords(line)} fraction={fraction} reduce={reduce} />)}
      {progress}
      <div className="flex flex-col items-center gap-2">
        {!done && (
          <button type="button" aria-pressed={on} onClick={toggle} data-dose=""
            className="min-h-11 px-6 rounded-full border border-[var(--color-border)] text-lg font-medium text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]">
            {on ? text(props, 'running') : text(props, 'start')}
          </button>
        )}
        {leaf && on && line && text(props, 'another') && (
          <button type="button" className={linkButton} onClick={another} data-another="">{text(props, 'another')}</button>
        )}
      </div>
      {done && <p role="status" className="text-center text-[var(--color-text-secondary)]">{text(props, 'done')}</p>}
      <WayOn done={done} label={text(props, 'next')} onGo={leave} />
    </section>
  );
}

/** At most this many leaves on the water at once (a fast run of taps doesn't flood the stream). */
const MAX_ON_WATER = 4;

/**
 * What the stream draws: before the start, the thought resting on a leaf upstream; with reduced motion, the newest leaf
 * resting mid-stream (it can't drift, so a new one takes its place); otherwise every leaf still on the water, where it is.
 */
function streamLeaves(leaves: readonly Leaf[], ms: number, reduce: boolean): { key: number; x: number }[] {
  if (!leaves.length) return [{ key: 0, x: 0 }];
  if (reduce) return [{ key: leaves[leaves.length - 1].key, x: 0.3 }];
  return leavesOnWater(leaves, ms).map((l) => ({ key: l.key, x: leafAt(ms - l.fromMs) }));
}

/** The thought a word at a time: each word fades in (or simply appears), the gaps wide and the letters spaced. */
function SlowWords({ words, fraction, reduce }: { words: string[]; fraction: number; reduce: boolean }) {
  const n = fraction > 0 ? wordsShown(fraction, words.length) : 0;
  return (
    <div className="min-h-24 rounded-2xl bg-[var(--color-bg-elevated)] px-5 py-6">
      {/* Read once, whole: the words arriving one by one would be a stream of fragments to a screen reader. */}
      <p className="sr-only">{words.join(' ')}</p>
      <p aria-hidden="true" className="flex flex-wrap justify-center content-center gap-x-6 gap-y-3 text-xl tracking-[0.12em] text-[var(--color-text-primary)] [overflow-wrap:anywhere]">
        {words.map((w, i) => (
          <span key={i} data-word={i < n ? 'shown' : 'waiting'} className="min-w-0"
            style={{ opacity: i < n ? 1 : 0, transition: reduce ? 'none' : 'opacity 1.4s ease-out' }}>{w}</span>
        ))}
      </p>
    </div>
  );
}

/** A stream with the thought on each leaf still on the water (`x` across: 0 upstream, 1 gone). */
function Stream({ label, leaves, moving, still, empty }: {
  label: string; leaves: { key: number; x: number }[]; moving: boolean; still: boolean; empty: string;
}) {
  return (
    <div className="space-y-2">
      <div className="relative h-40 rounded-2xl overflow-hidden bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-bg-elevated))]" aria-label={label} role="img">
        <svg aria-hidden="true" viewBox="0 0 320 160" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {[40, 80, 120].map((y) => (
            <path key={y} d={`M0 ${y} Q 40 ${y - 8} 80 ${y} T 160 ${y} T 240 ${y} T 320 ${y}`} fill="none"
              stroke="var(--color-accent)" strokeOpacity="0.25" strokeWidth="2" />
          ))}
        </svg>
        {leaves.map(({ key, x }) => {
          const pos = leafPosition(x);
          return (
            <div key={key} data-leaf={still ? 'resting' : 'floating'} aria-hidden="true"
              className="absolute top-1/2 w-[46%] max-w-[13rem] px-5 py-3 bg-[#cfe3c4] text-[#1f3320] text-sm leading-snug text-center shadow-sm [overflow-wrap:anywhere]"
              style={{
                borderRadius: '0 2.5rem 0 2.5rem',
                left: `${pos.leftPct}%`,
                transform: `translate(${pos.shiftPct}%, -50%) rotate(${-4 + x * 8}deg)`,
                transition: moving ? 'left 100ms linear, transform 100ms linear' : 'none',
              }}>
              {label}
            </div>
          );
        })}
      </div>
      {empty && !leaves.length && <p className="text-center text-sm text-[var(--color-text-secondary)]" data-empty="">{empty}</p>}
    </div>
  );
}
