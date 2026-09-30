import * as admin from 'firebase-admin';

// Initialize Firebase Admin (for updating Auth profiles)
if (!admin.apps.length) {
  admin.initializeApp();
}

export { admin };

/** The Auth calls the functions make (a narrow surface so unit tests can substitute it). */
export interface AuthAdmin {
  deleteUser(uid: string): Promise<void>;
}

let authOverride: AuthAdmin | null = null;

/** firebase-admin Auth, or the test double set by setAuthAdminForTesting. */
export function authAdmin(): AuthAdmin {
  return authOverride ?? admin.auth();
}

/** Test seam (never re-exported from index.ts). `null` restores firebase-admin. */
export function setAuthAdminForTesting(a: AuthAdmin | null): void {
  authOverride = a;
}
