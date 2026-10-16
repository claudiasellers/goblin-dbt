import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { useToolSession } from '../../hooks/useToolSession';
import type { ThenVsNow } from '../../data/capacityTypes';
import { primaryButton } from '../../components/tools/oppositeAction/styles';
import { buzz } from '../../components/tools/regulation/hooks';
import { PartTagSlot } from '../../components/spine/PartTagSlot';

// Circuit Breaker (tool id stays `cool-down`): TIPP temperature, cold on the face.
// Interim frontend copy (D-06): moves to graph content with DT-01.
const COPY = {
  commands: [
    'Grab two ice cubes.',
    'Press hard under your eyes and on your cheekbones.',
    'Hold it there until numb.',
  ],
  caption: 'The cold shock forces your nervous system to reboot. Let it work.',
  start: 'Tap to start 30s system reset.',
  startSub: 'It buzzes when it’s done.',
  running: 'System reset running.',
  runningSub: 'Tap to stop.',
  lead: (n: number) => `Ice up. ${n}`,
  done: 'Done. Put the ice down.',
  checkQuestion: 'Check in. Reset?',
  quieterLine: 'Stay here as long as you want.',
  doneLink: 'Done',
  artIdle: 'Face with the cold spots marked under the eyes, on the cheekbones',
  artOn: 'Hands pressing two ice cubes under the eyes, on the cheekbones',
};

type ChoiceId = 'loud' | 'same' | 'quieter';
const CHOICES: { id: ChoiceId; label: string; thenVsNow: ThenVsNow }[] = [
  { id: 'loud', label: 'Still Loud', thenVsNow: 'same' },
  { id: 'same', label: 'About the Same', thenVsNow: 'same' },
  { id: 'quieter', label: 'Quieter', thenVsNow: 'better' },
];

const DOSE_MS = 30_000;
const LEAD_MS = 3_000;
const ART = { face: '/tools/circuit-breaker/face.png', hands: '/tools/circuit-breaker/hands.png' };

/** Hide the card's top border where the art crosses it (fractions of the card width, measured from the art). */
function edgeMask(handsIn: boolean): CSSProperties {
  // Hands in: the arms sweep across most of the width, so only the rounded corners keep their line.
  const [from, to] = handsIn ? [4, 96] : [24, 66];
  const top = `linear-gradient(90deg, #000 ${from}%, transparent ${from + 4}%, transparent ${to - 4}%, #000 ${to}%)`;
  const rest = 'linear-gradient(#000, #000)';
  return {
    WebkitMaskImage: `${top}, ${rest}`, maskImage: `${top}, ${rest}`,
    WebkitMaskSize: '100% 8px, 100% calc(100% - 8px)', maskSize: '100% 8px, 100% calc(100% - 8px)',
    WebkitMaskPosition: '0 0, 0 8px', maskPosition: '0 0, 0 8px',
    WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
  };
}

type Step = 'ready' | 'lead' | 'running' | 'done' | 'check';

// ── Sound: the user's hands are on their face, so the cues are heard (iOS web can't vibrate) ──
function useCues() {
  const ctx = useRef<AudioContext | null>(null);
  useEffect(() => () => { void ctx.current?.close().catch(() => {}); }, []);

  /** Must run inside the tap (iOS only unlocks audio from a user gesture). */
  const unlock = () => {
    try {
      if (!ctx.current) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) ctx.current = new AC();
      }
      if (ctx.current?.state === 'suspended') void ctx.current.resume();
    } catch { /* no audio: the visuals still run */ }
  };

  const tone = (type: OscillatorType, from: number, to: number, peak: number, at: number, len: number) => {
    const c = ctx.current;
    if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    if (to !== from) o.frequency.exponentialRampToValueAtTime(to, t + Math.min(0.12, len));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + len + 0.05);
  };

  return {
    unlock,
    /** Lub-dub: a pitch-dropping thud, audible on phone speakers. */
    beat: () => { tone('sine', 150, 58, 0.9, 0, 0.22); tone('sine', 150, 58, 0.55, 0.16, 0.22); buzz([38, 120, 24]); },
    tick: () => { tone('sine', 520, 520, 0.25, 0, 0.18); buzz(30); },
    chime: () => { tone('sine', 660, 660, 0.35, 0, 1.1); tone('sine', 880, 880, 0.35, 0.22, 1.1); buzz([220, 120, 220]); },
  };
}

/**
 * Keep the screen on while the timer runs. A locked phone pauses the page, so the end chime
 * and buzz would only fire once it wakes, and the user is holding ice until they hear it
 * (iOS auto-lock can be 30 s, shorter than lead-in + dose). Re-acquired if the page comes
 * back into view mid-run (the browser drops the lock when it's hidden). Unsupported: no-op.
 */
function useKeepAwake(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (cancelled) void next.release().catch(() => {});
        else lock = next;
      } catch { /* denied (battery saver, not visible): the dose still runs on timestamps */ }
    };
    void acquire();
    const onVisible = () => { void acquire(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}

export function CoolDown() {
  const session = useToolSession();
  const location = useLocation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const cues = useCues();

  const [step, setStep] = useState<Step>('ready');
  const [pick, setPick] = useState<ChoiceId | null>(null);
  // "Was this a part you know?" waits for the server to have the Quieter close (tagPart refuses an open one).
  const [closeSaved, setCloseSaved] = useState(false);
  const [, setNow] = useState(() => Date.now());
  const stepRef = useRef<Step>('ready');
  const leadEnds = useRef(0);
  const lastLead = useRef(0);
  const runStart = useRef(0);
  const lastWall = useRef(0);
  const phase = useRef(0);
  const progress = useRef(0);
  const closed = useRef(false);

  const go = (s: Step) => { stepRef.current = s; setStep(s); };

  useKeepAwake(step === 'lead' || step === 'running');

  // One clock for the lead-in and the dose. Timestamp-based, so a throttled background tab
  // doesn't stretch the count; the end cue itself needs the page awake (useKeepAwake).
  useEffect(() => {
    if (step !== 'lead' && step !== 'running') return;
    const id = window.setInterval(() => {
      const t = Date.now();
      if (stepRef.current === 'lead') {
        const left = Math.ceil((leadEnds.current - t) / 1000);
        if (left > 0 && left !== lastLead.current) { lastLead.current = left; cues.tick(); }
        if (t >= leadEnds.current) {
          runStart.current = t;
          lastWall.current = t;
          phase.current = 0.97;
          progress.current = 0;
          go('running');
        }
      } else if (stepRef.current === 'running') {
        const p = Math.min(DOSE_MS, t - runStart.current);
        const dt = Math.min(t - lastWall.current, 250);
        lastWall.current = t;
        progress.current = p;
        // The beat slows from 78 to 52 bpm over the dose.
        const bpm = 78 - 26 * (p / DOSE_MS);
        const prev = phase.current;
        phase.current += (dt * bpm) / 60000;
        if (Math.floor(phase.current) > Math.floor(prev)) cues.beat();
        if (p >= DOSE_MS) {
          cues.chime();
          session.markComplete();
          go('done');
        }
      }
      setNow(t);
    }, 50);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step !== 'done') return;
    const t = window.setTimeout(() => go('check'), 1800);
    return () => window.clearTimeout(t);
  }, [step]);

  const tap = () => {
    if (step === 'lead' || step === 'running') { go('ready'); return; }
    if (step !== 'ready') return;
    cues.unlock();
    session.setStep('timer');
    session.markPracticed();
    session.setExt({ dt: { techniqueId: 'ice-face' } });
    session.setSkillIds(['cold']);
    leadEnds.current = Date.now() + LEAD_MS;
    lastLead.current = 0;
    progress.current = 0;
    setPick(null);
    go('lead');
  };

  const choose = (c: (typeof CHOICES)[number]) => {
    setPick(c.id);
    if (c.id === 'quieter') {
      if (!closed.current) {
        closed.current = true;
        session.close({ status: 'completed', thenVsNow: c.thenVsNow }).then((r) => { if (r) setCloseSaved(true); }, () => { /* the close is optional */ });
      }
      return;
    }
    // Still loud / about the same: save this round's answer now (a session left open would close
    // with no outcome, and Reflect / pattern offers skip those), then start the next round as a
    // fresh session. Same address and link state; a new location key remounts ToolSessionProvider.
    if (!closed.current) { closed.current = true; void session.close({ status: 'completed', thenVsNow: c.thenVsNow }); }
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: location.state });
  };

  const on = step === 'lead' || step === 'running' || step === 'done';
  const slow = step === 'check' || (step === 'ready' && pick !== null);
  const running = step === 'lead' || step === 'running';
  const leadLeft = Math.max(1, Math.ceil((leadEnds.current - Date.now()) / 1000));
  const frac = step === 'done' || step === 'check' ? 1 : progress.current / DOSE_MS;
  const count = Math.max(0, Math.ceil((DOSE_MS - progress.current) / 1000));
  const showCheck = step === 'check' || (step === 'ready' && pick !== null);

  // Heartbeat envelope for the glow: lub at 0, dub at 0.16 of each beat.
  const f = phase.current - Math.floor(phase.current);
  const bump = (c: number) => (f >= c ? Math.exp(-(f - c) * 26) : 0);
  const env = step === 'running' && !reduce ? Math.max(bump(0), bump(0.16) * 0.7) : 0;

  const tr = (into: string, out: string): string | undefined => (reduce ? 'none' : on ? into : out);
  const layer: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' };
  // Hands glide in and fade into place on the cheekbones (no overshoot, no squeeze). Once they've
  // landed, the heartbeat glow is the only thing that moves.
  const side = (dir: 'L' | 'R'): CSSProperties => {
    const mask = dir === 'L'
      ? 'linear-gradient(90deg, #000 0%, #000 44%, transparent 49%)'
      : 'linear-gradient(270deg, #000 0%, #000 41%, transparent 46%)';
    return {
      ...layer,
      WebkitMaskImage: mask,
      maskImage: mask,
      transform: on ? 'none' : `translateX(${dir === 'L' ? '-24%' : '24%'})`,
      opacity: on ? 1 : 0,
      transition: tr(
        'transform 950ms cubic-bezier(.2,.7,.25,1), opacity 750ms ease-out',
        slow ? 'transform 900ms ease-in-out, opacity 700ms ease-in-out 200ms' : 'transform 320ms ease-in, opacity 260ms ease-in',
      ),
    };
  };
  const midMask = 'linear-gradient(90deg, transparent 42%, #000 47%, #000 55%, transparent 60%)';

  return (
    <div className="space-y-6">
      <h2 className="uppercase font-sans-heading text-2xl sm:text-3xl font-bold leading-tight tracking-wide text-[var(--color-text-primary)] space-y-1">
        {COPY.commands.map((line) => <span key={line} className="block">{line}</span>)}
      </h2>

      <div className="relative mt-[72px] p-5 rounded-2xl bg-[var(--color-bg-elevated)] flex flex-col items-center gap-4">
        {/* The card's edge, drawn on its own layer so its top line can stop behind the head
            (the wireframe is see-through). The gap widens while the hands are in. */}
        <div aria-hidden="true" className="absolute inset-0 rounded-2xl border border-[var(--color-border)] pointer-events-none" style={edgeMask(on)} />
        <div
          role="img"
          aria-label={on ? COPY.artOn : COPY.artIdle}
          className="relative self-stretch pointer-events-none overflow-hidden"
          style={{
            margin: 'calc(-20px - 0.11 * (100% + 40px)) -20px 0',
            aspectRatio: '774 / 284',
            filter: env > 0 ? `drop-shadow(0 0 ${Math.round(3 + 9 * env)}px rgba(110, 170, 255, ${(0.15 + 0.5 * env).toFixed(2)}))` : undefined,
          }}
        >
          <img src={ART.face} alt="" draggable={false} style={{ ...layer, opacity: on ? 0 : 1, transition: tr('opacity 420ms ease-in 360ms', slow ? 'opacity 700ms ease-out 300ms' : 'opacity 300ms ease-out 80ms') }} />
          <img src={ART.hands} alt="" draggable={false} style={{ ...layer, WebkitMaskImage: midMask, maskImage: midMask, opacity: on ? 1 : 0, transition: tr('opacity 420ms ease-out 360ms', 'opacity 200ms ease-in') }} />
          <img src={ART.hands} alt="" draggable={false} style={side('L')} />
          <img src={ART.hands} alt="" draggable={false} style={side('R')} />
        </div>

        {step === 'lead' && (
          <p role="timer" aria-live="assertive" className="text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">
            {COPY.lead(leadLeft)}
          </p>
        )}

        {(step === 'running' || step === 'done') && (
          <div className="w-full max-w-[280px] flex items-center gap-2.5">
            <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${(frac * 100).toFixed(1)}%` }} />
            </div>
            <span role="timer" className="min-w-7 text-right text-sm font-semibold tabular-nums text-[var(--color-text-secondary)]">{count}s</span>
          </div>
        )}

        <p className="text-sm text-center text-[var(--color-text-secondary)]">{COPY.caption}</p>

        {step !== 'check' && (
          <button
            type="button"
            onClick={tap}
            disabled={step === 'done'}
            aria-label={running ? 'Stop the timer' : 'Start the 30 second timer'}
            className={running
              ? 'min-h-22 w-full p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] lift-secondary flex flex-col items-center justify-center gap-1'
              : `${primaryButton} min-h-22 !p-4 flex flex-col items-center justify-center gap-1`}
          >
            <span className="uppercase font-semibold tracking-wide text-center">
              {step === 'done' ? COPY.done : running ? COPY.running : COPY.start}
            </span>
            {step !== 'done' && <span className="text-sm opacity-80">{running ? COPY.runningSub : COPY.startSub}</span>}
          </button>
        )}
      </div>

      {showCheck && (
        <section aria-label={COPY.checkQuestion} className="p-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] motion-safe:animate-[stepEnter_300ms_ease-out]">
          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">{COPY.checkQuestion}</p>
          <div className="grid grid-cols-3 gap-2">
            {CHOICES.map((c) => {
              const selected = pick === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => choose(c)}
                  className={`min-h-11 px-3 py-2 rounded-lg border text-sm transition-colors ${selected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-semibold ring-2 ring-[var(--color-accent)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] hover:text-[var(--color-text-primary)]'}`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          {pick === 'quieter' && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p role="status" className="text-sm text-[var(--color-text-tertiary)]">{COPY.quieterLine}</p>
              <Link to="/tools" className="min-h-11 inline-flex items-center px-2 text-sm underline underline-offset-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                {COPY.doneLink}
              </Link>
            </div>
          )}
          {pick === 'quieter' && (
            <PartTagSlot toolId="cool-down" toolSessionId={session.id} thenVsNow={CHOICES.find((x) => x.id === 'quieter')?.thenVsNow} saved={closeSaved} />
          )}
        </section>
      )}
    </div>
  );
}
