import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AngryCardCopy, AngryCardResult, AngryHurt, AngryLaterCopy, AngryStep } from '../../data/partsTypes';
import { resolveAngryCopy } from '../../lib/angryPartCopy';
import { Pill } from '../tools/invalidationRecovery/shared';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import { buzz } from '../tools/regulation/hooks';
import { HoldButton, PartScene } from './LightHold';
import { useStepFocus } from './stepFocus';

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
  /**
   * "Not now": a quiet link on the first screen, only when the host passes both. The label is the card's
   * own option in the person's wording (`copy[angryNotNowId(partsOn)]`), never a host's skip copy.
   */
  onSkip?(): void;
  skipLabel?: string;
  /**
   * Parts on only (angryLaterCopy): "Spend a minute with it later?" under Done on the last screen.
   * Tapping it is the yes: `onLater` queues the candidate; once it resolves the line becomes `done`. A
   * rejected call leaves the button (try again or go on); Done is never blocked.
   */
  later?: AngryLaterCopy | null;
  onLater?(): Promise<void>;
}

/**
 * The angry-part card: four screens, one decision each, for the fire back urge once someone is out of
 * the flooded band (alexithymia-first-interaction.md, "Anger: the angry part"). Unblend, what it
 * protects, a vote of confidence held for 4 s, then speak for it, not from it. Presentation and flow
 * only: no fetching, no saving; the host gets an AngryCardResult. Nothing locks: Back on screens 2–4,
 * a way past the hold after the first try, and the host's too-much link everywhere.
 */
export function AngryPartCard({ copy, hurts, partsOn, name, onDone, tooMuch, onStep, onSkip, skipLabel, later, onLater }: AngryPartCardProps) {
  const [step, setStep] = useState<AngryStep>('unblend');
  const [hurtId, setHurtId] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  const [tried, setTried] = useState(false);
  const [progress, setProgress] = useState(0);
  const [laterState, setLaterState] = useState<'ask' | 'sending' | 'done'>('ask');
  const laterRoot = useRef<HTMLDivElement>(null);
  useStepFocus(laterRoot, laterState === 'done');
  const askLater = () => {
    if (!onLater || laterState !== 'ask') return;
    setLaterState('sending');
    onLater().then(() => setLaterState('done'), () => setLaterState('ask'));
  };
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
          <span>{c.back}</span>
        </button>
      )}

      {step === 'unblend' && (
        <section className="space-y-4">
          <PartScene lit={0} />
          <Title className={STAMP_LINE}>{c.unblend}</Title>
          <p className="text-[var(--color-text-secondary)]">{c.unblendSub}</p>
          <button type="button" className={primaryButton} onClick={() => setStep('protects')}>{c.next}</button>
          {onSkip && skipLabel && (
            <div className="text-center"><button type="button" className={linkButton} onClick={onSkip}>{skipLabel}</button></div>
          )}
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
            : <HoldButton label={c.hold} hint={c.holdHint} ms={HOLD_MS} onProgress={setProgress}
                onLetGo={() => setTried(true)} onComplete={() => { justHeld.current = true; setHeld(true); buzz(30); }} />}
          {!held && tried && (
            <button type="button" className={linkButton} onClick={() => setStep('speak')}>{c.voteNext}</button>
          )}
        </section>
      )}

      {step === 'speak' && (
        <section className="space-y-4">
          <Title className="text-lg font-medium text-[var(--color-text-primary)]">{c.speak}</Title>
          {c.speakLine && <p className="font-serif text-2xl leading-snug text-[var(--color-text-primary)]">{c.speakLine}</p>}
          <button type="button" className={primaryButton}
            onClick={() => onDone({ hurtId, voteHeld: held, exitStep: 'speak' })}>{c.done}</button>
          {partsOn && later && onLater && (
            <div ref={laterRoot} className="text-center" aria-live="polite">
              {laterState === 'done'
                ? <p className="text-sm text-[var(--color-text-secondary)] focus:outline-none">{later.done}</p>
                : <button type="button" className={linkButton} aria-disabled={laterState === 'sending' || undefined} onClick={askLater}>{later.ask}</button>}
            </div>
          )}
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
