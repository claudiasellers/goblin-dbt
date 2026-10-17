import { useEffect, useRef, type RefObject } from 'react';

/**
 * Keyboard and screen-reader focus across a parts screen's changes (the app's convention: the new step's
 * heading takes focus, as TapCard and OppositeAction do). Pressing a control that then goes away (a chip
 * that moves the step on, a button replaced by its done line) drops focus to <body>; these put it on what
 * replaced it instead. Focus that is still somewhere (a Prompt that took it, a control that stayed) is
 * left alone.
 */

/** Focus fell out of the page: the focused control unmounted, or was disabled under it. */
export function focusLost(): boolean {
  const a = document.activeElement;
  return !a || a === document.body || a === document.documentElement;
}

/** Focus `el` (made focusable by script only, tabIndex -1, when it isn't) without scrolling. */
export function focusLine(el: HTMLElement | null): void {
  if (!el) return;
  if (el.tabIndex < 0 && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

/**
 * The new step's start inside `root`: its first heading, else its first line, else its first control,
 * else `root` itself (a row that folded away keeps focus where it was).
 */
export function focusStepStart(root: HTMLElement | null): void {
  if (!root || !focusLost()) return;
  focusLine(root.querySelector<HTMLElement>('h1, h2, h3, h4')
    ?? root.querySelector<HTMLElement>('p')
    ?? root.querySelector<HTMLElement>('button, a[href], input, textarea')
    ?? root);
}

/** After `step` changes (never on the first render), focusStepStart(ref.current). */
export function useStepFocus(ref: RefObject<HTMLElement | null>, step: unknown): void {
  const last = useRef(step);
  useEffect(() => {
    if (Object.is(last.current, step)) return;
    last.current = step;
    focusStepStart(ref.current);
  }, [ref, step]);
}
