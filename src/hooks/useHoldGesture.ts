import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';

const HOLD_KEYS = new Set([' ', 'Enter']);
/** A key released sooner than this is a tap: it starts the hands-free fill (as Do the Opposite's body step does). */
export const HOLD_TAP_MS = 350;

export type HoldMode = 'idle' | 'press' | 'auto';

/**
 * The press-and-hold gesture the holds share (lifted from the parts flows' HoldButton, unchanged): press and
 * hold for `ms`. Space / Enter hold like a pointer; for someone who can't hold a key or a switch, a quick
 * Space / Enter (released within HOLD_TAP_MS) or the click a screen reader or switch sends (no pointer, no
 * key: `detail` 0) fills it hands-free over the same `ms`. A pointer's quick tap stays a try: the hold is the
 * gesture there. Letting go early, or a second key or activation while it fills, stops it and reports a try
 * with how far it got (`onLetGo(p)`); nothing punishes. Spread `handlers` on the button.
 */
export function useHoldGesture({ ms, onProgress, onLetGo, onComplete }: {
  ms: number; onProgress?: (p: number) => void; onLetGo: (reached: number) => void; onComplete: () => void;
}) {
  const [p, setP] = useState(0);
  const [mode, setMode] = useState<HoldMode>('idle');
  const frame = useRef<number | null>(null);
  const start = useRef(0);
  const modeRef = useRef<HoldMode>('idle');
  const reached = useRef(0);
  /** What started the press: only a key's quick release becomes the hands-free fill. */
  const byKey = useRef(false);
  /** A press that stopped a hands-free fill: its release is not a tap. */
  const swallowUp = useRef(false);
  const setModeBoth = (m: HoldMode) => { modeRef.current = m; setMode(m); };
  const report = (v: number) => { reached.current = v; setP(v); onProgress?.(v); };
  const stop = () => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; };
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);

  const run = (m: HoldMode) => {
    stop();
    setModeBoth(m);
    start.current = performance.now();
    const tick = (now: number) => {
      const v = Math.min(1, (now - start.current) / ms);
      report(v);
      if (v < 1) frame.current = requestAnimationFrame(tick);
      else { setModeBoth('idle'); frame.current = null; onComplete(); }
    };
    frame.current = requestAnimationFrame(tick);
  };
  const letGo = () => { stop(); setModeBoth('idle'); const r = reached.current; report(0); onLetGo(r); };
  const down = (key: boolean) => {
    if (modeRef.current === 'auto') { swallowUp.current = true; letGo(); return; }
    if (modeRef.current === 'idle') { byKey.current = key; run('press'); }
  };
  const up = () => {
    if (swallowUp.current) { swallowUp.current = false; return; }
    if (modeRef.current !== 'press') return;
    if (byKey.current && performance.now() - start.current < HOLD_TAP_MS) run('auto');
    else letGo();
  };
  /** Focus or the pointer leaving ends a press, never a hands-free fill. */
  const cancelPress = () => { swallowUp.current = false; if (modeRef.current === 'press') letGo(); };

  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => { if (e.pointerType !== 'mouse' || e.button === 0) down(false); },
    onPointerUp: up,
    onPointerLeave: cancelPress,
    onPointerCancel: cancelPress,
    onBlur: cancelPress,
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      if (!HOLD_KEYS.has(e.key)) return;
      e.preventDefault();
      if (!e.repeat) down(true);
    },
    onKeyUp: (e: KeyboardEvent<HTMLButtonElement>) => {
      if (!HOLD_KEYS.has(e.key)) return;
      e.preventDefault();
      up();
    },
    /** A click with no pointer or key behind it (detail 0: a screen reader's or switch's activation) is a tap. */
    onClick: (e: MouseEvent<HTMLButtonElement>) => {
      if (e.detail !== 0) return;
      if (modeRef.current === 'auto') letGo();
      else if (modeRef.current === 'idle') run('auto');
    },
    onContextMenu: (e: MouseEvent<HTMLButtonElement>) => e.preventDefault(),
  };
  return { p, mode, handlers };
}
