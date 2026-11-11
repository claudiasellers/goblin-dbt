import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { buzz, useLatest } from '../components/tools/regulation/hooks';
import { readDeadline, type DeadlineReading } from '../lib/timer/deadline';

/**
 * The timer every hold, dose and wait embed uses (docs/design/dbt-modules-plan.md C3a R13), lifted from Cool
 * Down and the wait lock: a timestamp deadline (src/lib/timer/deadline.ts), the screen kept awake while it runs
 * (a locked phone pauses the page, so the end cue would only fire once it wakes), and the end cue as a chime
 * with a buzz (iOS web can't vibrate, so the sound is the twin). `start` must run inside the tap that starts
 * it: iOS only unlocks audio from a user gesture. `reduceMotion` is passed through for the embed's visuals;
 * the count and cues don't change with it.
 */
export function useDeadlineTimer({ durationMs, onDone, onSecond, tickMs = 250, chime = true }: {
  durationMs: number;
  onDone?: () => void;
  /** Each whole second left that changes (a tick cue, a spoken count). */
  onSecond?: (secondsLeft: number) => void;
  tickMs?: number;
  chime?: boolean;
}): DeadlineReading & {
  start: () => void; stop: () => void; reduceMotion: boolean; cues: Cues;
} {
  const reduceMotion = !!useReducedMotion();
  const cues = useCues();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const done = useLatest(onDone);
  const second = useLatest(onSecond);
  const lastSecond = useRef<number | null>(null);
  const fired = useRef(false);
  const reading = readDeadline({ startedAt, durationMs }, now);

  const running = reading.state === 'running';
  useKeepAwake(running);

  // Ticks only while running; once the deadline passes the reading stays done until the next start.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [running, tickMs]);

  useEffect(() => {
    if (reading.state === 'running' && reading.secondsLeft !== lastSecond.current) {
      lastSecond.current = reading.secondsLeft;
      second.current?.(reading.secondsLeft);
    }
    if (reading.state === 'done' && !fired.current) {
      fired.current = true;
      if (chime) cues.chime();
      done.current?.();
    }
  }, [reading.state, reading.secondsLeft, chime, cues, done, second]);

  const start = useCallback(() => {
    cues.unlock();
    fired.current = false;
    lastSecond.current = null;
    const t = Date.now();
    setNow(t);
    setStartedAt(t);
  }, [cues]);
  const stop = useCallback(() => { setStartedAt(null); }, []);

  return { ...reading, start, stop, reduceMotion, cues };
}

export interface Cues { unlock: () => void; beat: () => void; tick: () => void; chime: () => void }

/** Heard cues with a buzz twin (lifted from Cool Down). The person's hands may be busy, so cues are sounds. */
export function useCues(): Cues {
  const ctx = useRef<AudioContext | null>(null);
  useEffect(() => () => { void ctx.current?.close().catch(() => {}); }, []);
  const [cues] = useState<Cues>(() => {
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
      /** Must run inside the tap (iOS only unlocks audio from a user gesture). */
      unlock: () => {
        try {
          if (!ctx.current) {
            const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (AC) ctx.current = new AC();
          }
          if (ctx.current?.state === 'suspended') void ctx.current.resume();
        } catch { /* no audio: the visuals still run */ }
      },
      /** Lub-dub: a pitch-dropping thud, audible on phone speakers. */
      beat: () => { tone('sine', 150, 58, 0.9, 0, 0.22); tone('sine', 150, 58, 0.55, 0.16, 0.22); buzz([38, 120, 24]); },
      tick: () => { tone('sine', 520, 520, 0.25, 0, 0.18); buzz(30); },
      chime: () => { tone('sine', 660, 660, 0.35, 0, 1.1); tone('sine', 880, 880, 0.35, 0.22, 1.1); buzz([220, 120, 220]); },
    };
  });
  return cues;
}

/**
 * Keep the screen on while `active`. Re-acquired if the page comes back into view mid-run (the browser drops
 * the lock when it's hidden). Unsupported or denied: a no-op, and the count still runs on timestamps.
 */
export function useKeepAwake(active: boolean) {
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
      } catch { /* denied (battery saver, not visible) */ }
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
