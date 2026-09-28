import { m, useReducedMotion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { primaryButton, linkButton, secondaryText } from '../oppositeAction/styles';
import type { Pull } from '../../../data/invalidationRecoveryTypes';
import { Choice, Pill } from './shared';
import { buzz } from '../regulation/hooks';
import { WaitLock, type WaitLockCopy } from '../regulation/WaitLock';

/** Copy blocks come straight from the graph flow document (flow.copy.*). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Copy = Record<string, any>;

export interface ExitResult { skills: string[] }

// ── Let it land: grieve, optional boundary, meet the need elsewhere ──
export function LetItLand({ c, pull, tooHot, elsewhere, onDone }: {
  c: Copy; pull: Pull; tooHot: boolean; elsewhere: { title: string; act: string; skill: string; social: string }; onDone: (r: ExitResult) => void;
}) {
  const [i, setI] = useState(0);
  const [stage, setStage] = useState<'grieve' | 'boundary' | 'elsewhere'>('grieve');
  const [copied, setCopied] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  const grief: string[] = c.grief;
  // Shutdown and hiding get an orienting cue, never a relaxation cue.
  const cue = pull === 'freeze' || pull === 'hide' ? c.cueOrient : c.cueCalm;

  if (stage === 'grieve') return (
    <div className="space-y-5">
      <p className={`${secondaryText} p-4 rounded-2xl bg-[var(--color-bg-secondary)]`}>{cue}</p>
      <div className="min-h-36 space-y-2" aria-live="polite">
        {grief.slice(0, i + 1).map((l, n) => (
          <p key={l} className={`text-lg leading-snug font-medium motion-safe:transition-opacity ${n === i ? '' : 'opacity-50'}`}>{l}</p>
        ))}
      </div>
      <button type="button" className={primaryButton} onClick={() => (i < grief.length - 1 ? setI(i + 1) : setStage('boundary'))}>
        {i < grief.length - 1 ? c.next : c.continue}
      </button>
    </div>
  );
  if (stage === 'boundary') return (
    <div className="space-y-4">
      <p className={secondaryText}>{c.boundaryIntro}</p>
      <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-lg leading-relaxed font-medium">{c.boundary}</div>
      {tooHot
        ? <p className={`${secondaryText} p-3 rounded-xl bg-[var(--color-bg-secondary)]`}>{c.boundaryLocked}</p>
        : (
          <button type="button" className={primaryButton} onClick={async () => { try { await navigator.clipboard.writeText(c.boundary); setCopied(true); } catch { /* selection fallback */ } }}>
            {copied ? c.copied : c.copy}
          </button>
        )}
      <button type="button" className={linkButton} onClick={() => setStage('elsewhere')}>{copied ? c.continue : c.skipBoundary}</button>
    </div>
  );
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">{c.elsewhere}</p>
      <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] space-y-1">
        <p className="text-lg font-semibold">{elsewhere.title}</p>
        <p className={secondaryText}>{elsewhere.act}</p>
      </div>
      {elsewhere.social === 'worth' && (
        <div className="flex flex-wrap gap-2">{(c.values as string[]).map(v => <Pill key={v} selected={value === v} onClick={() => setValue(v)}>{v}</Pill>)}</div>
      )}
      <button type="button" className={primaryButton} disabled={elsewhere.social === 'worth' && !value}
        onClick={() => onDone({ skills: ['accept', elsewhere.skill] })}>{c.commit}</button>
    </div>
  );
}

// ── Do the opposite, matched to the pull ──
export function OppositeStep({ c, wait, pull, chaseMinutes, onDone, renderHold }: {
  c: Copy; wait: WaitLockCopy; pull: Pull; chaseMinutes: number; onDone: (r: ExitResult) => void;
  /** HoldToConfirm, provided by the page so its copy stays with the other hold labels. */
  renderHold: (text: string, onComplete: () => void, done: boolean) => ReactNode;
}) {
  const [pick, setPick] = useState<number | null>(null);
  const [held, setHeld] = useState(false);
  if (pull === 'chase') return (
    <div className="space-y-4">
      <p className="text-base">{c.chase.lead}</p>
      <WaitLock minutes={chaseMinutes} text={null} c={wait} />
      <button type="button" className={primaryButton} onClick={() => onDone({ skills: ['opposite', 'wait_lock'] })}>{c.continue}</button>
    </div>
  );
  if (pull === 'fight') return (
    <div className="space-y-4">
      <p className="text-base">{c.fight.lead}</p>
      <div className="space-y-2">{(c.fight.options as string[]).map((t, n) => <Choice key={t} selected={pick === n} onClick={() => setPick(n)}>{t}</Choice>)}</div>
      <p className={secondaryText}>{c.fight.note}</p>
      <button type="button" className={primaryButton} disabled={pick === null} onClick={() => onDone({ skills: ['opposite'] })}>{c.commit}</button>
    </div>
  );
  const options = c.hide.options as { size: string; text: string }[];
  return (
    <div className="space-y-4">
      <p className="text-base">{pull === 'freeze' ? c.freeze.lead : c.hide.lead}</p>
      <div className="space-y-2">{options.map((o, n) => <Choice key={o.text} selected={pick === n} sub={o.size} onClick={() => { setPick(n); setHeld(false); }}>{o.text}</Choice>)}</div>
      {pick !== null && renderHold(options[pick].text, () => setHeld(true), held)}
      <button type="button" className={primaryButton} disabled={!held} onClick={() => onDone({ skills: ['opposite'] })}>{c.continue}</button>
    </div>
  );
}

// ── Park the replay (postponement, with the rationale) ──
export function ParkIt({ c, onDone }: { c: Copy; onDone: (r: ExitResult) => void }) {
  const reduce = useReducedMotion();
  const [when, setWhen] = useState<string | null>(null);
  const [parked, setParked] = useState(false);
  return (
    <div className="space-y-4">
      <p className={`${secondaryText} p-4 rounded-2xl bg-[var(--color-bg-secondary)]`}>{c.why}</p>
      <div className="flex flex-wrap gap-2">{(c.times as string[]).map(t => <Pill key={t} selected={when === t} onClick={() => setWhen(t)}>{t}</Pill>)}</div>
      <div aria-hidden="true" className="relative h-32 rounded-3xl overflow-hidden grid place-items-center bg-[var(--color-bg-secondary)]">
        <m.div className="absolute px-4 py-2 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm font-medium"
          initial={false} animate={parked ? { y: 36, scale: 0.4, opacity: 0 } : { y: -16, scale: 1, opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.8 }}>{c.thought}</m.div>
        <div className={`absolute bottom-3 w-32 h-12 rounded-xl border-2 grid place-items-center text-xs ${parked ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'}`}>
          {parked ? when : c.spot}
        </div>
      </div>
      {parked
        ? <button type="button" className={primaryButton} onClick={() => onDone({ skills: ['park'] })}>{c.back}</button>
        : <button type="button" className={primaryButton} disabled={!when} onClick={() => { buzz([10, 30, 20]); setParked(true); }}>{c.cta}</button>}
    </div>
  );
}

// ── Must → prefer (REBT) ──
export function MustPrefer({ c, onDone }: { c: Copy; onDone: (r: ExitResult) => void }) {
  const [i, setI] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const musts = c.musts as { must: string; prefer: string }[];
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="font-medium mb-2">{c.prompt}</legend>
        {musts.map((x, n) => <Choice key={x.must} selected={i === n} onClick={() => { setI(n); setFlipped(false); }}>{x.must}</Choice>)}
      </fieldset>
      {i !== null && (
        <button type="button" onClick={() => { buzz(12); setFlipped(true); }} aria-live="polite"
          className="w-full text-left p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          {flipped
            ? <span className="text-lg leading-snug"><strong>{musts[i].prefer}</strong>{c.tail}</span>
            : <span className="text-lg leading-snug"><s className="text-[var(--color-text-secondary)]">{musts[i].must}</s> <span className="text-sm font-medium text-[var(--color-accent)]">{c.tapToRewrite}</span></span>}
        </button>
      )}
      <p className={secondaryText}>{c.note}</p>
      <button type="button" className={primaryButton} disabled={!flipped} onClick={() => onDone({ skills: ['must_prefer'] })}>{c.continue}</button>
    </div>
  );
}
