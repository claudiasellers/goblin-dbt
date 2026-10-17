/**
 * Where keyboard and screen-reader focus goes when the control that had it goes away (a step change,
 * a card answered): the new thing's heading or first line, as the app's TapCard / OppositeAction do.
 * DOM only, no React: parts screens (src/components/parts/stepFocus.ts), Today's stack and DEAR MAN's
 * parts hand-backs share it. Focus that is still somewhere is always left alone.
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
 * The start inside `root`: its first heading, else its first line, else its first control, else `root`
 * itself. Only when focus was lost.
 */
export function focusStepStart(root: HTMLElement | null): void {
  if (!root || !focusLost()) return;
  focusLine(root.querySelector<HTMLElement>('h1, h2, h3, h4')
    ?? root.querySelector<HTMLElement>('p')
    ?? root.querySelector<HTMLElement>('button, a[href], input, textarea')
    ?? root);
}

/**
 * Which of the `left` items takes focus after the one at `at` went away: the one that slid into its
 * place, else the new last one; null when none is left. `at` -1 (unknown) is the first.
 */
export function afterRemoval(at: number, left: number): number | null {
  if (left <= 0) return null;
  return Math.min(Math.max(at, 0), left - 1);
}
