import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import type { AngryCardCopy, AngryCardResult, AngryHurt, AngryStep } from '../../data/partsTypes';
import { resolveAngryCopy } from '../../lib/angryPart';
import { Pill } from '../tools/invalidationRecovery/shared';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import { buzz } from '../tools/regulation/hooks';

/** The vote of confidence is held for 4 s: long enough to read it, short enough to stay one move. */
const HOLD_MS = 4000;
/** Recover's validation stamp (ValidationPick): the house's look for distanced self-talk. */
const STAMP_LINE = 'text-lg leading-snug font-medium text-[var(--color-text-primary)]';

interface AngryPartCardProps {
  /** The angry flow's prompts (both wordings) and options, as strings (angryCopyFrom). */
  copy: AngryCardCopy;
  /** In the order to offer (orderHurts). */
  hurts: AngryHurt[];
  /** Picks every line's parts wording or its `_plain` twin. */
  partsOn: boolean;
  /** First name for distanced self-talk; null → the `_noname` lines. */
  name: string | null;
  onDone(result: AngryCardResult): void;
  /** The host's TooMuchLink, rendered on every screen. */
  tooMuch?: ReactNode;
  /** Each screen as it opens, so a host can resume or log where the person left (TooMuchLink's resume). */
  onStep?(step: AngryStep): void;
}

/**
 * The angry-part card: four screens, one decision each, for the fire back urge once someone is out of
 * the flooded band (alexithymia-first-interaction.md, "Anger: the angry part"). Unblend, what it
 * protects, a vote of confidence held for 4 s, then speak for it, not from it. Presentation and flow
 * only: no fetching, no saving; the host gets an AngryCardResult. Nothing locks: Back on screens 2–4,
 * a way past the hold after the first try, and the host's too-much link everywhere.
 */
export function AngryPartCard({ copy, hurts, partsOn, name, onDone, tooMuch, onStep }: AngryPartCardProps) {
  const [step, setStep] = useState<AngryStep>('unblend');
  const [hurtId, setHurtId] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  const [tried, setTried] = useState(false);
  const [progress, setProgress] = useState(0);
  // When the hold completes its button goes away: keyboard focus moves to what replaces it.
  const justHeld = useRef(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (justHeld.current) { justHeld.current = false; nextRef.current?.focus(); } }, [held]);
  const hurt = hurts.find((h) => h.id === hurtId) ?? null;
  const c = useMemo(() => resolveAngryCopy(copy, { partsOn, name, hurt }), [copy, partsOn, name, hurt]);
  useEffect(() => { onStep?.(step); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  /** A new answer at "What it protects" is a new vote, so its hold starts fresh. */
  const pick = (id: string | null) => {
    if (id !== hurtId) {
      setHurtId(id);
      setHeld(false);
      setTried(false);
      setProgress(0);
    }
    setStep('vote');
  };
  const back = { protects: 'unblend', vote: 'protects', speak: 'vote' } as const;

  return (
    <div className="space-y-5">
      {step !== 'unblend' && (
        <button type="button" onClick={() => setStep(back[step])}
          className="inline-flex items-center gap-1 min-h-11 px-2 -ml-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
          <span aria-hidden="true">←</span>
          <span>Back</span>
        </button>
      )}

      {step === 'unblend' && (
        <section className="space-y-4">
          <PartScene lit={0} />
          <Title className={STAMP_LINE}>{c.unblend}</Title>
          <p className="text-[var(--color-text-secondary)]">{c.unblendSub}</p>
          <button type="button" className={primaryButton} onClick={() => setStep('protects')}>{c.next}</button>
        </section>
      )}

      {step === 'protects' && (
        <section className="space-y-4">
          <Title className="text-lg font-medium text-[var(--color-text-primary)]">{c.protects}</Title>
          <div className="flex flex-wrap gap-2.5">
            {hurts.map((h) => <Pill key={h.id} selected={hurtId === h.id} onClick={() => pick(h.id)}>{h.label}</Pill>)}
            <Pill onClick={() => pick(null)}>{c.notSure}</Pill>
          </div>
        </section>
      )}

      {step === 'vote' && (
        <section className="space-y-4">
          <PartScene lit={held ? 1 : progress} />
          <div className="p-5 rounded-3xl space-y-2 bg-[color-mix(in_oklab,var(--color-accent-fill)_12%,var(--color-bg-elevated))]">
            {c.vote.map((line, i) => (i === 0
              ? <Title key={i} className={STAMP_LINE}>{line}</Title>
              : <p key={i} className={STAMP_LINE}>{line}</p>))}
          </div>
          {held
            ? <button ref={nextRef} type="button" className={primaryButton} onClick={() => setStep('speak')}>{c.next}</button>
            : <HoldButton label={c.hold} ms={HOLD_MS} onProgress={setProgress}
                onLetGo={() => setTried(true)} onComplete={() => { justHeld.current = true; setHeld(true); buzz(30); }} />}
          {!held && tried && (
            <button type="button" className={linkButton} onClick={() => setStep('speak')}>Next</button>
          )}
        </section>
      )}

      {step === 'speak' && (
        <section className="space-y-4">
          <Title className="text-lg font-medium text-[var(--color-text-primary)]">{c.speak}</Title>
          {c.speakLine && <p className="font-serif text-2xl leading-snug text-[var(--color-text-primary)]">{c.speakLine}</p>}
          <button type="button" className={primaryButton}
            onClick={() => onDone({ hurtId, voteHeld: held, exitStep: 'speak' })}>{c.done}</button>
        </section>
      )}

      {tooMuch && <div className="flex justify-center">{tooMuch}</div>}
    </div>
  );
}

/** Each screen's first line takes focus, so keyboard and screen-reader users land on the new screen. */
function Title({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return <h2 ref={ref} tabIndex={-1} className={`${className} text-balance focus:outline-none`}>{children}</h2>;
}

/**
 * A small faceless figure (the part) a little apart from a soft light (you). `lit` 0–1: how far the
 * light has reached; at 1 it holds the figure. Reduced motion: no growth, the light arrives at 1.
 */
function PartScene({ lit }: { lit: number }) {
  const reduce = useReducedMotion();
  const id = `angry-light-${useId().replace(/[^\w-]/g, '')}`;
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
      <g style={{ fill: 'var(--color-q-hu-fill)' }} opacity={0.5 + t * 0.5}>
        <circle cx="236" cy="54" r="12" />
        <path d="M221 104 C221 82 226 70 236 70 C246 70 251 82 251 104 Z" />
      </g>
    </svg>
  );
}

const HOLD_KEYS = new Set([' ', 'Enter']);

/**
 * Press and hold for `ms`. Letting go early resets it and reports a try (the host then offers a way
 * past; nothing punishes). Space / Enter hold like a pointer.
 */
function HoldButton({ label, ms, onProgress, onLetGo, onComplete }: {
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
