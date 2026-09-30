import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';

/**
 * The signed-in user's id, from the verified Firebase Auth token only (never from request data).
 * Throws `unauthenticated` when there is no auth context.
 */
export function requireUid(request: CallableRequest<unknown>, message?: string): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', message ?? 'User must be logged in');
  return uid;
}
