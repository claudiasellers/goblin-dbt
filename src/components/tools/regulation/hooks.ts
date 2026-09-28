import { useEffect, useRef } from 'react';

export function buzz(pattern: number | number[] = 12) {
  try { navigator.vibrate?.(pattern); } catch { /* unsupported: vibration is a nicety */ }
}

/** Keeps the latest callback without re-running effects (timers call the current one). */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; });
  return ref;
}

