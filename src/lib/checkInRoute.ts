/** The check-in is the app's index route (HashRouter: `#/`). */
export const CHECK_IN_PATH = '/';

/** True on the check-in itself, where a "Check in now" link would go nowhere. */
export function isCheckInRoute(pathname: string): boolean {
  return pathname === CHECK_IN_PATH || pathname === '';
}
