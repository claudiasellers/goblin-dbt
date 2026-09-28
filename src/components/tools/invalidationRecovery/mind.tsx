import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { primaryButton, linkButton, secondaryText } from '../oppositeAction/styles';
import { renderValidationLine, certaintyZone } from '../../../lib/invalidationRecovery';
import type { RecoveryGates, Zone } from '../../../data/invalidationRecoveryTypes';
import { Pill } from './shared';
import { buzz, useLatest } from '../regulation/hooks';

// ── Self-validation: pick up to `max` lines; they stamp into a card to read once ──
export function ValidationPick({ lines, name, phrase, max, stampLabel, doneLabel, voiceLabel, onDone }: {
  lines: string[]; name: string | null; phrase: string; max: number;
  stampLabel: string; doneLabel: string; voiceLabel: (voice: string) => string;
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const [useName, setUseName] = useState(Boolean(name));
  const [picked, setPicked] = useState<number[]>([]); // indices, so switching voice keeps the picks
  const render = (i: number) => renderValidationLine(lines[i], useName ? name : null, phrase);
  const toggle = (i: number) => {
    buzz(12);
    setPicked(p => (p.includes(i) ? p.filter(x => x !== i) : [...p, i].slice(-max)));
  };
  return (
    <div className="space-y-4">
      <div className="space-y-2.5" role="group">
        {lines.map((_, i) => {
          const on = picked.includes(i);
          return (
            <button key={i} type="button" aria-pressed={on} onClick={() => toggle(i)}
              className={`w-full text-left p-4 rounded-2xl border text-[15.5px] leading-snug motion-safe:transition-colors ${
                on ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)] bg-[var(--color-bg-elevated)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-elevated)] lift-secondary'}`}>
              {render(i)}
            </button>
          );
        })}
      </div>
      {name && (
        <button type="button" className={linkButton} onClick={() => setUseName(u => !u)}>
          {voiceLabel(useName ? `“${name}, …”` : '“you …”')}
        </button>
      )}
      <AnimatePresence>
        {picked.length > 0 && (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-5 rounded-3xl space-y-2 bg-[color-mix(in_oklab,var(--color-accent-fill)_12%,var(--color-bg-elevated))]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">{stampLabel}</p>
            {picked.map(i => (
              <m.p key={i} initial={reduce ? false : { scale: 1.2, opacity: 0, rotate: -2 }} animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }} className="text-lg leading-snug font-medium">
                {render(i)}
              </m.p>
            ))}
          </m.div>
        )}
      </AnimatePresence>
      <button type="button" className={primaryButton} disabled={!picked.length} onClick={onDone}>{doneLabel}</button>
    </div>
  );
}

function WarmGlow({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden="true" className="relative h-36 grid place-items-center overflow-hidden rounded-3xl bg-[var(--color-bg-secondary)]">
      <m.div className="absolute size-52 rounded-full"
        style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--color-q-hp-fill) 70%, transparent), transparent 70%)' }}
        animate={active && !reduce ? { scale: [0.75, 1.1, 0.9, 1.05], opacity: [0.5, 0.95, 0.7, 0.9] } : { scale: active ? 1 : 0.6, opacity: active ? 0.9 : 0.35 }}
        transition={{ duration: 6, repeat: active && !reduce ? Infinity : 0, repeatType: 'mirror' }} />
      <svg width="48" height="48" viewBox="0 0 24 24" className="relative">
        <path d="M12 21s-7.5-4.6-9.5-9.3C1.1 8.4 3.2 5 6.6 5c2 0 3.4 1.1 4.1 2.3h.6C12 6.1 13.4 5 15.4 5c3.4 0 5.5 3.4 4.1 6.7C19.5 16.4 12 21 12 21z"
          fill="var(--color-q-hp-fill)" opacity={active ? 1 : 0.5} />
      </svg>
    </div>
  );
}

// ── Self-compassion break, including the fierce line ────────────────────────
export function CompassionBreak({ steps, note, nextLabel, doneLabel, onDone }: {
  steps: { line: string; cue: string }[]; note: string; nextLabel: string; doneLabel: string; onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const last = i === steps.length - 1;
  return (
    <div className="space-y-4">
      <WarmGlow active={i >= 2} />
      <div className="flex gap-1.5" aria-hidden="true">
        {steps.map((_, n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= i ? 'bg-[var(--color-q-hp-fill)]' : 'bg-[var(--color-border)]'}`} />)}
      </div>
      <div className="min-h-24" aria-live="polite">
        <p className="text-xl font-medium leading-snug">{steps[i].line}</p>
        <p className={secondaryText}>{steps[i].cue}</p>
      </div>
      <button type="button" className={primaryButton} onClick={() => { buzz(10); if (last) onDone(); else setI(i + 1); }}>
        {last ? doneLabel : nextLabel}
      </button>
      <p className={secondaryText}>{note}</p>
    </div>
  );
}

// ── Secure-base prime ────────────────────────────────────────────────────────
export function SecurityPrime({ figures, prompts, prompt, startLabel, continueLabel, onDone }: {
  figures: string[]; prompts: string[]; prompt: string; startLabel: string; continueLabel: string; onDone: () => void;
}) {
  const done = useLatest(onDone);
  const [fig, setFig] = useState<string | null>(null);
  const [i, setI] = useState(-1);
  useEffect(() => {
    if (i < 0) return;
    const t = window.setTimeout(() => (i >= prompts.length - 1 ? done.current() : setI(i + 1)), 6000);
    return () => window.clearTimeout(t);
  }, [i, prompts.length, done]);

  if (i < 0) return (
    <div className="space-y-4">
      <p>{prompt}</p>
      <div className="flex flex-wrap gap-2">{figures.map(f => <Pill key={f} selected={fig === f} onClick={() => setFig(f)}>{f}</Pill>)}</div>
      <button type="button" className={primaryButton} disabled={!fig} onClick={() => setI(0)}>{startLabel}</button>
    </div>
  );
  return (
    <div className="space-y-4">
      <WarmGlow active />
      <p className="text-xl font-medium text-center min-h-14" aria-live="polite">{prompts[i]}</p>
      <button type="button" className={`${linkButton} block mx-auto`} onClick={() => done.current()}>{continueLabel}</button>
    </div>
  );
}

// ── Certainty: real invalidation vs. amplified (never concludes "my feeling is wrong") ──
export function CertaintyDial({ sureLabel, patternLabel, yesLabel, noLabel, zones, continueLabel, initialZone, gates, onDone }: {
  gates: Pick<RecoveryGates, 'certaintyReal' | 'certaintyBoth'>;
  sureLabel: string; patternLabel: string; yesLabel: string; noLabel: string;
  zones: Record<Zone, { title: string; body: string }>; continueLabel: string;
  /** After Back: restore an approximate position for the zone the user had reached. */
  initialZone?: Zone | null;
  onDone: (zone: Zone) => void;
}) {
  const [pct, setPct] = useState(initialZone === 'real' ? gates.certaintyReal : initialZone === 'check' ? Math.max(0, gates.certaintyBoth - 10) : 60);
  const [rep, setRep] = useState<boolean | null>(initialZone === 'real' ? true : null);
  const zone = certaintyZone(pct, rep === true, gates);
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex justify-between items-baseline gap-3">
          <label htmlFor="recovery-certainty" className="font-medium">{sureLabel}</label>
          <span className="text-2xl font-semibold tabular-nums">{pct}%</span>
        </div>
        <input id="recovery-certainty" type="range" min={0} max={100} step={5} value={pct} onChange={e => setPct(Number(e.target.value))}
          aria-valuetext={`${pct}%`} className="w-full accent-[var(--color-accent)] min-h-11" />
      </div>
      <fieldset className="space-y-2">
        <legend className="font-medium mb-2">{patternLabel}</legend>
        <div className="flex flex-wrap gap-2">
          <Pill selected={rep === true} onClick={() => setRep(true)}>{yesLabel}</Pill>
          <Pill selected={rep === false} onClick={() => setRep(false)}>{noLabel}</Pill>
        </div>
      </fieldset>
      {rep !== null && (
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]" aria-live="polite">
          <p className="font-semibold">{zones[zone].title}</p>
          <p className={secondaryText}>{zones[zone].body}</p>
        </div>
      )}
      <button type="button" className={primaryButton} disabled={rep === null} onClick={() => onDone(zone)}>{continueLabel}</button>
    </div>
  );
}
