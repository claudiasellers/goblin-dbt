/**
 * Quick exit (PRD IE-08 safety branch; the IE architecture map gives `quickExit()` to CORE, which hasn't built it
 * yet, so it starts here and CORE's safety batch takes it over).
 *
 * Leaves the app for a neutral page at once, replacing this page in the browser's history so Back doesn't return
 * to it. What it can't do, said plainly in docs/design/ending-relationships.md: earlier pages in this tab stay in
 * history, and nothing is cleared from the device. The visit's session, if it began, stays open (read as
 * abandoned); a run that wrote nothing still wrote nothing.
 */
export const QUICK_EXIT_URL = 'https://www.google.com/search?q=weather';

export function quickExit(go: (url: string) => void = (url) => window.location.replace(url)): void {
  go(QUICK_EXIT_URL);
}
