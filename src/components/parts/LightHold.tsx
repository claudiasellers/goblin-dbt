import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import { buzz } from '../tools/regulation/hooks';

/**
 * The hold the parts flows share (the angry-part card's vote of confidence, Meet a part's Thanks and its
 * tender path): a soft light (you) a little apart from a figure (the part), and a press-and-hold that lets
 * the light reach it. Presentation only: the hosts own their copy and what happens after.
 */

/** Meet a part's hold: shorter than the angry card's vote, which carries three lines to read. */
export const LIGHT_HOLD_MS = 1400;

/**
 * A small figure (the part) a little apart from a soft light (you). `lit` 0–1: how far the light has
 * reached; at 1 it holds the figure. Reduced motion: no growth, the light arrives at 1. `figure` replaces
 * the faceless default (e.g. a PartFigure of 80×80); it fades in with the light the same way.
 */
export function PartScene({ lit, figure }: { lit: number; figure?: ReactNode }) {
  const reduce = useReducedMotion();
  const id = `light-hold-${useId().replace(/[^\w-]/g, '')}`;
  const t = reduce ? (lit >= 1 ? 1 : 0) : lit;
  return (
    <svg viewBox="0 0 320 140" className="block w-full h-auto rounded-3xl bg-[var(--color-bg-secondary)]" aria-hidden="true">
      <defs>
        <radialGradient id={id}>
          <stop offset="0" style={{ stopColor: 'var(--color-accent)', stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: 'var(--color-accent)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <circle cx="84" cy="70" r={44 + t * 190} fill={`url(#${id})`} />
      <circle cx="84" cy="70" r="7" style={{ fill: 'var(--color-accent)' }} opacity={0.85} />
      {figure
        ? <g transform="translate(196 30)" opacity={0.5 + t * 0.5}>{figure}</g>
        : (
          <g style={{ fill: 'var(--color-q-hu-fill)' }} opacity={0.5 + t * 0.5}>
            <circle cx="236" cy="54" r="12" />
            <path d="M221 104 C221 82 226 70 236 70 C246 70 251 82 251 104 Z" />
          </g>
        )}
    </svg>
  );
}

const HOLD_KEYS = new Set([' ', 'Enter']);

/**
 * Press and hold for `ms`. Letting go early resets it and reports a try (the host then offers a way
 * past; nothing punishes). Space / Enter hold like a pointer.
 */
export function HoldButton({ label, ms, onProgress, onLetGo, onComplete }: {
  label: string; ms: number; onProgress: (p: number) => void; onLetGo: () => void; onComplete: () => void;
}) {
  const [p, setP] = useState(0);
  const frame = useRef<number | null>(null);
  const start = useRef(0);
  const holding = useRef(false);
  const report = (v: number) => { setP(v); onProgress(v); };
  const stop = () => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; };
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);

  const down = () => {
    if (holding.current) return;
    holding.current = true;
    start.current = performance.now();
    const tick = (now: number) => {
      const v = Math.min(1, (now - start.current) / ms);
      report(v);
      if (v < 1) frame.current = requestAnimationFrame(tick);
      else { holding.current = false; frame.current = null; onComplete(); }
    };
    frame.current = requestAnimationFrame(tick);
  };
  const up = () => {
    if (!holding.current) return;
    holding.current = false;
    stop();
    report(0);
    onLetGo();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!HOLD_KEYS.has(e.key)) return;
    e.preventDefault();
    if (!e.repeat) down();
  };
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!HOLD_KEYS.has(e.key)) return;
    e.preventDefault();
    up();
  };

  return (
    <button type="button" onPointerDown={(e) => { if (e.pointerType !== 'mouse' || e.button === 0) down(); }}
      onPointerUp={up} onPointerLeave={up} onPointerCancel={up} onBlur={up} onKeyDown={onKeyDown} onKeyUp={onKeyUp}
      onContextMenu={(e) => e.preventDefault()}
      className="lift-primary relative w-full min-h-12 p-3 rounded-xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium overflow-hidden select-none touch-none [-webkit-touch-callout:none]">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-[var(--color-on-accent)] opacity-25 pointer-events-none" style={{ width: `${p * 100}%` }} />
      <span className="relative">{label}</span>
    </button>
  );
}

/**
 * One screen of hold: the scene, the host's lines, the hold, and once it is held its done line and
 * `next`. After a first try a quiet `next` link goes past it: nothing locks.
 */
export function LightHold({ title, sub, holdLabel, doneLabel, nextLabel, figure, ms = LIGHT_HOLD_MS, onDone }: {
  title: ReactNode; sub?: ReactNode; holdLabel: string; doneLabel?: string; nextLabel: string;
  figure?: ReactNode; ms?: number; onDone: (held: boolean) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [held, setHeld] = useState(false);
  const [tried, setTried] = useState(false);
  const justHeld = useRef(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (justHeld.current) { justHeld.current = false; nextRef.current?.focus(); } }, [held]);
  return (
    <section className="space-y-4" data-testid="light-hold">
      <PartScene lit={held ? 1 : progress} figure={figure} />
      {title}
      {sub}
      {held && doneLabel && <p role="status" className="text-sm text-[var(--color-text-secondary)]">{doneLabel}</p>}
      {held
        ? <button ref={nextRef} type="button" className={primaryButton} onClick={() => onDone(true)}>{nextLabel}</button>
        : <HoldButton label={holdLabel} ms={ms} onProgress={setProgress}
            onLetGo={() => setTried(true)} onComplete={() => { justHeld.current = true; setHeld(true); buzz(30); }} />}
      {!held && tried && <button type="button" className={linkButton} onClick={() => onDone(false)}>{nextLabel}</button>}
    </section>
  );
}
