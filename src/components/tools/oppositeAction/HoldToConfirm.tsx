import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { fill } from "../../../lib/oppositeAction";

interface HoldToConfirmProps {
  /** The body cue, as a short imperative (graph copy or a micro-step). */
  text: string;
  subtext?: string;
  done: boolean;
  onComplete: () => void;
  /** Graph copy: visible hint while idle (c.bodyHold). */
  holdLabel: string;
  /** Graph copy: shown while pressing (c.bodyHolding). */
  holdingLabel: string;
  /** Graph copy with {seconds}: shown during the hands-free timer (c.bodyCountdown). */
  countdownLabel: string;
  /** Graph copy with {seconds}: screen-reader instructions (c.bodyHoldHint). */
  srHint: string;
  /** Graph copy: c.bodyDone. */
  doneLabel: string;
  holdMs?: number;
  countdownMs?: number;
}

type Mode = "idle" | "press" | "countdown";

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const HOLD_KEYS = new Set([" ", "Enter"]);
/** A release sooner than this counts as a tap (starts the hands-free timer). */
const TAP_MS = 350;

function buzz() {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(30);
    }
  } catch {
    // Vibration is a nicety; ignore unsupported or blocked calls.
  }
}

/**
 * Tap OR hold. A tap starts a hands-free countdown (so cues like "open your
 * hands" or "put your phone down" are doable); pressing and holding completes
 * sooner. Tapping during the countdown cancels it. Keyboard: Space/Enter
 * behave exactly like a pointer.
 */
export function HoldToConfirm({
  text,
  subtext,
  done,
  onComplete,
  holdLabel,
  holdingLabel,
  countdownLabel,
  srHint,
  doneLabel,
  holdMs = 3000,
  countdownMs = 5000,
}: HoldToConfirmProps) {
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<Mode>("idle");
  const modeRef = useRef<Mode>("idle");
  const startedAt = useRef(0);
  const frame = useRef<number | null>(null);
  /** Set when a press cancelled a running countdown, so its release is ignored. */
  const swallowUp = useRef(false);
  const hintId = useId();

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  function setModeBoth(m: Mode) {
    modeRef.current = m;
    setMode(m);
  }

  function stopFrame() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }

  function reset() {
    stopFrame();
    setModeBoth("idle");
    setProgress(0);
  }

  function complete() {
    stopFrame();
    setModeBoth("idle");
    setProgress(1);
    buzz();
    onComplete();
  }

  function tick(now: number) {
    const m = modeRef.current;
    if (m === "idle") return;
    const duration = m === "press" ? holdMs : countdownMs;
    const p = Math.min(1, (now - startedAt.current) / duration);
    setProgress(p);
    if (p >= 1) complete();
    else frame.current = requestAnimationFrame(tick);
  }

  function run(m: Mode) {
    stopFrame();
    startedAt.current = performance.now();
    setModeBoth(m);
    setProgress(0);
    frame.current = requestAnimationFrame(tick);
  }

  function down() {
    if (done) return;
    if (modeRef.current === "countdown") {
      swallowUp.current = true;
      reset();
      return;
    }
    if (modeRef.current === "idle") run("press");
  }

  function up() {
    if (swallowUp.current) {
      swallowUp.current = false;
      return;
    }
    if (modeRef.current !== "press") return;
    if (performance.now() - startedAt.current < TAP_MS) run("countdown");
    else reset();
  }

  /** Scroll/gesture takeover or focus loss cancels a press (not a running timer). */
  function cancelPress() {
    swallowUp.current = false;
    if (modeRef.current === "press") reset();
  }

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    down();
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

  const shown = done ? 1 : mode === "idle" ? 0 : progress;
  const secondsLeft = Math.max(1, Math.ceil(((1 - progress) * countdownMs) / 1000));
  const status = done
    ? `✓ ${doneLabel}`
    : mode === "press"
      ? holdingLabel
      : mode === "countdown"
        ? fill(countdownLabel, { seconds: secondsLeft })
        : holdLabel;

  return (
    <div className="space-y-1">
      <button
        type="button"
        aria-pressed={done}
        aria-describedby={hintId}
        onPointerDown={onPointerDown}
        onPointerUp={up}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative overflow-hidden w-full min-h-16 p-4 rounded-2xl border text-left select-none touch-pan-y [-webkit-touch-callout:none] flex items-center gap-4 disabled:opacity-50 ${
          done || mode !== "idle"
            ? "border-[var(--color-accent)] bg-[var(--color-bg-elevated)]"
            : "border-[var(--color-border)] bg-[var(--color-bg-elevated)] lift-secondary"
        }`}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-[var(--color-accent-muted)] pointer-events-none"
          style={{ width: `${shown * 100}%`, opacity: done ? 0.5 : 1 }}
        />
        <svg aria-hidden="true" viewBox="0 0 44 44" className="relative shrink-0 w-11 h-11 -rotate-90">
          <circle cx="22" cy="22" r={RADIUS} fill="none" strokeWidth="4" stroke="var(--color-border)" />
          <circle
            cx="22"
            cy="22"
            r={RADIUS}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            stroke="var(--color-accent)"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - shown)}
          />
        </svg>
        <span className="relative min-w-0 flex-1">
          <span className="block font-medium text-[var(--color-text-primary)]">{text}</span>
          {subtext && (
            <span className="block text-sm text-[var(--color-text-secondary)] mt-0.5">{subtext}</span>
          )}
          <span className="block text-xs mt-1 text-[var(--color-accent)] font-medium">{status}</span>
        </span>
      </button>
      <span id={hintId} className="sr-only">
        {done ? doneLabel : fill(srHint, { seconds: Math.round(countdownMs / 1000) })}
      </span>
      <span className="sr-only" aria-live="polite">
        {done ? `${text}: ${doneLabel}` : ""}
      </span>
    </div>
  );
}
