/**
 * Where auth is on this page load. Firebase restores a saved session from IndexedDB and checks it over the
 * network (accounts:lookup, plus a token refresh when the token is over an hour old) before it says who is
 * signed in; until then `user` is null for everyone. Treating that null as "signed out" showed signed-in
 * people the signed-out app on every reload. Signed-out UI waits for `signed_out`.
 */
export type AuthPhase = 'resolving' | 'signed_in' | 'signed_out';

export function authPhase(auth: { signedIn: boolean; loading: boolean }): AuthPhase {
  if (auth.signedIn) return 'signed_in';
  return auth.loading ? 'resolving' : 'signed_out';
}

/**
 * The last signed-in uid on this device, so a reload can seed the cached profile (name, settings) while
 * Firebase is still resolving. Set when auth settles with a user, cleared when it settles with none.
 */
export const LAST_UID_KEY = 'goblin-dbt-last-uid';

/** What to store under LAST_UID_KEY after auth settles: the uid, or null to remove it. Resolving keeps it. */
export function lastUidAfter(phase: AuthPhase, uid: string | null): string | null | undefined {
  if (phase === 'resolving') return undefined;
  return phase === 'signed_in' ? uid : null;
}
