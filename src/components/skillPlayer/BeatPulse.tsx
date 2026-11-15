import { useEffect, useRef, useState } from 'react';
import { useDeadlineTimer } from '../../hooks/useDeadlineTimer';
import { beatBpm, beatIntervalMs, beatMs, beatOutput } from '../../lib/beatPulse';
import { buzz } from '../tools/regulation/hooks';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * The beat (MF-10 Join in; docs/design/join-in.md): a steady pulse to move, hum or tap along to for one round. The
 * circle swells on each beat and is the tap target; tapping along is optional and never counted on screen (the taps
 * are a measure in the report). Sound is off until the person turns it on (MF rule 8), and a soft tick follows the
 * beat while it's on; every step works muted. The circle swells on every beat and settles back within it. Reduced
 * motion: it brightens on the beat instead of swelling, at the same timing.
 *
 * Nothing locks: the quiet way on is there from the start (`skip`), and the button once the round is up. While
 * something covers the step (safety.open, P2) the beat stops there and the round ends as it was (no tick under a
 * dialog, no focus taken), and the end line is left out for a round cut short. The end makes a short buzz for anyone
 * moving with their eyes off the screen, and focus goes to the end line, not to Next, so a key still tapping along
 * doesn't press Next. The rules are
 * src/lib/beatPulse.ts (pure).
 */

const text = (props: Record<string, unknown>, k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');

export function BeatPulse({ props, onShown, onDone, covered }: EmbedProps) {
  const shown = useRef(false);
  useEffect(() => { if (!shown.current) { shown.current = true; onShown(); } }, [onShown]);
  const ms = beatMs(props);
  const interval = beatIntervalMs(beatBpm(props));
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [ranMs, setRanMs] = useState(0);
  const [sound, setSound] = useState(false);
  const [on, setOn] = useState(false);
  const taps = useRef(0);
  const coveredRef = useRef(!!covered);
  coveredRef.current = !!covered;
  const timer = useDeadlineTimer({
    durationMs: ms, tickMs: 250, chime: false,
    onDone: () => { if (!coveredRef.current) buzz(30); setRanMs(ms); setEnded(true); },
  });
  const running = timer.state === 'running';
  const reduce = timer.reduceMotion;
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const cues = timer.cues;

  // The beat itself: a swell on every beat, settling back within it, while the round runs.
  useEffect(() => {
    if (!running) return;
    let off: number | undefined;
    const id = window.setInterval(() => {
      setOn(true);
      window.clearTimeout(off);
      off = window.setTimeout(() => setOn(false), Math.round(interval * 0.35));
      if (soundRef.current) cues.tick();
    }, interval);
    return () => { window.clearInterval(id); window.clearTimeout(off); setOn(false); };
  }, [running, interval, cues]);

  // Covered while running: the beat stops there and the round ends as it was.
  useEffect(() => {
    if (covered && running) {
      setRanMs(timer.elapsedMs);
      timer.stop();
      setEnded(true);
    }
  }, [covered, running, timer]);

  const tapRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (started && !ended) tapRef.current?.focus({ preventScroll: true }); }, [started, ended]);
  // The end line takes focus (announced), not Next: a key still tapping along in time would press Next.
  useEffect(() => { if (ended && !covered) endRef.current?.focus({ preventScroll: true }); }, [ended, covered]);
  const full = ended && ranMs >= ms;

  const start = () => { setStarted(true); timer.start(); };
  const toggleSound = () => {
    // Inside the tap: iOS only unlocks audio from a user gesture.
    if (!sound) cues.unlock();
    setSound((s) => !s);
  };
  const report = () => {
    const ran = ended ? ranMs : running ? timer.elapsedMs : 0;
    const fraction = ended && ranMs >= ms ? 1 : ran / ms;
    timer.stop();
    onDone?.(beatOutput(started, fraction, ran, taps.current));
  };
  const quiet = text(props, 'skip') || text(props, 'next');

  return (
    <section className="space-y-5" data-testid="beat-pulse" data-state={ended ? 'done' : running ? 'running' : 'idle'}>
      <p className="text-lg leading-snug text-[var(--color-text-primary)] text-balance">{text(props, 'task')}</p>

      <div className="flex flex-col items-center gap-4">
        {/* One slot the same size for Start, the beat and the end line, so the screen never jumps. */}
        <div className="h-48 w-full grid place-items-center">
          {!started && (
            <button type="button" className={primaryButton} data-beat-start="" onClick={start}>{text(props, 'start')}</button>
          )}
          {started && !ended && (
            <button ref={tapRef} type="button" data-beat-tap="" aria-label={text(props, 'tap')} onClick={() => { taps.current += 1; buzz(10); }}
              className="w-44 h-44 rounded-full grid place-items-center select-none border-2 border-[var(--color-accent)] text-lg font-medium text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
              style={{
                background: `color-mix(in srgb, var(--color-accent) ${on ? 34 : 14}%, var(--color-bg-elevated))`,
                transform: reduce ? undefined : `scale(${on ? 1.08 : 1})`,
                transition: `transform ${Math.min(180, interval / 3)}ms ease-out, background-color ${Math.min(180, interval / 3)}ms ease-out`,
              }}>
              <span aria-hidden="true" className="max-w-[8rem] text-center text-balance">{text(props, 'tap')}</span>
            </button>
          )}
          {ended && <p ref={endRef} tabIndex={-1} role="status" className="text-center text-[var(--color-text-secondary)] focus:outline-none">{full ? text(props, 'done') : ''}</p>}
        </div>
        <button type="button" aria-pressed={sound} onClick={toggleSound} data-beat-sound=""
          className={`min-h-11 px-4 rounded-full border text-sm ${sound ? 'border-[var(--color-accent)] bg-[var(--color-accent-fill)] text-[var(--color-on-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)]'}`}>
          {text(props, 'sound')}
        </button>
      </div>

      {started && !ended && <p className="text-center text-sm text-[var(--color-text-secondary)]">{text(props, 'running')}</p>}
      {ended
        ? <button type="button" className={primaryButton} onClick={report}>{text(props, 'next')}</button>
        : <div className="flex justify-center"><button type="button" className={linkButton} onClick={report}>{quiet}</button></div>}
    </section>
  );
}
