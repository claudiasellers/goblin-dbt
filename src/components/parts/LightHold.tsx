import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
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
/** A key released sooner than this is a tap: it starts the hands-free fill (as Do the Opposite's body step does). */
export const HOLD_TAP_MS = 350;

type HoldMode = 'idle' | 'press' | 'auto';

/**
 * Press and hold for `ms`. Space / Enter hold like a pointer; for someone who can't hold a key or a
 * switch, a quick Space / Enter (released within HOLD_TAP_MS) or the click a screen reader or switch
 * sends (no pointer, no key: `detail` 0) fills it hands-free over the same `ms`, so they can complete it
 * too. A pointer's quick tap stays a try: the hold is the gesture there. Letting go early, or a second
 * key or activation while it fills, stops it and reports a try (the host then offers a way past;
 * nothing punishes). `hint` (the signed-off hold_hint) is what a screen reader says with the label.
 */
export function HoldButton({ label, hint, ms, onProgress, onLetGo, onComplete }: {
  label: string; hint: string; ms: number; onProgress: (p: number) => void; onLetGo: () => void; onComplete: () => void;
}) {
  const hintId = useId();
  const [p, setP] = useState(0);
  const frame = useRef<number | null>(null);
  const start = useRef(0);
  const mode = useRef<HoldMode>('idle');
  /** What started the press: only a key's quick release becomes the hands-free fill. */
  const byKey = useRef(false);
  /** A press that stopped a hands-free fill: its release is not a tap. */
  const swallowUp = useRef(false);
  const report = (v: number) => { setP(v); onProgress(v); };
  const stop = () => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; };
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);

  const run = (m: HoldMode) => {
    stop();
    mode.current = m;
    start.current = performance.now();
    const tick = (now: number) => {
      const v = Math.min(1, (now - start.current) / ms);
      report(v);
      if (v < 1) frame.current = requestAnimationFrame(tick);
      else { mode.current = 'idle'; frame.current = null; onComplete(); }
    };
    frame.current = requestAnimationFrame(tick);
  };
  const letGo = () => { stop(); mode.current = 'idle'; report(0); onLetGo(); };
  const down = (key: boolean) => {
    if (mode.current === 'auto') { swallowUp.current = true; letGo(); return; }
    if (mode.current === 'idle') { byKey.current = key; run('press'); }
  };
  const up = () => {
    if (swallowUp.current) { swallowUp.current = false; return; }
    if (mode.current !== 'press') return;
    if (byKey.current && performance.now() - start.current < HOLD_TAP_MS) run('auto');
    else letGo();
  };
  /** Focus or the pointer leaving ends a press, never a hands-free fill. */
  const cancelPress = () => { swallowUp.current = false; if (mode.current === 'press') letGo(); };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!HOLD_KEYS.has(e.key)) return;
    e.preventDefault();
    if (!e.repeat) down(true);
  };
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!HOLD_KEYS.has(e.key)) return;
    e.preventDefault();
    up();
  };
  /** A click with no pointer or key behind it (detail 0: a screen reader's or switch's activation) is a tap. */
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail !== 0) return;
    if (mode.current === 'auto') letGo();
    else if (mode.current === 'idle') run('auto');
  };

  return (
    <>
    {/* Before the button and outside it: not part of its name, and never a last child that takes spacing. */}
    <span id={hintId} hidden>{hint}</span>
    <button type="button" data-hold="" aria-describedby={hintId} onPointerDown={(e) => { if (e.pointerType !== 'mouse' || e.button === 0) down(false); }}
      onPointerUp={up} onPointerLeave={cancelPress} onPointerCancel={cancelPress} onBlur={cancelPress} onKeyDown={onKeyDown} onKeyUp={onKeyUp}
      onClick={onClick} onContextMenu={(e) => e.preventDefault()}
      className="lift-primary relative w-full min-h-12 p-3 rounded-xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium overflow-hidden select-none touch-none [-webkit-touch-callout:none]">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-[var(--color-on-accent)] opacity-25 pointer-events-none" style={{ width: `${p * 100}%` }} />
      <span className="relative">{label}</span>
    </button>
    </>
  );
}

/**
 * One screen of hold: the scene, the host's lines, the hold, and once it is held its done line and
 * `next`. After a first try a quiet `next` link goes past it: nothing locks.
 */
export function LightHold({ title, sub, holdLabel, holdHint, doneLabel, nextLabel, figure, ms = LIGHT_HOLD_MS, onDone }: {
  title: ReactNode; sub?: ReactNode; holdLabel: string; holdHint: string; doneLabel?: string; nextLabel: string;
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
        : <HoldButton label={holdLabel} hint={holdHint} ms={ms} onProgress={setProgress}
            onLetGo={() => setTried(true)} onComplete={() => { justHeld.current = true; setHeld(true); buzz(30); }} />}
      {!held && tried && <button type="button" className={linkButton} onClick={() => onDone(false)}>{nextLabel}</button>}
    </section>
  );
}
