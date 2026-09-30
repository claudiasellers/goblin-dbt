import { CallableFunction, CallableRequest, onCall } from 'firebase-functions/v2/https';
import { NEO4J_SECRETS } from './neo4j';
import { requireUid } from './auth';
import { toHttpsError } from './errors';

export interface CallableContext<Req> {
  /** Firebase Auth uid; always a string when `auth: 'required'`. */
  uid: string | null;
  data: Req;
  request: CallableRequest<Req>;
}

/**
 * The standard shape for new callables: `onCall({ secrets: NEO4J_SECRETS })` (the same deploy
 * manifest as every existing callable), `requireUid` when `auth: 'required'`, and every error
 * mapped through `toHttpsError`. Register the export in functions/src/index.ts, the endpoints
 * fixture and the auth matrix.
 *
 *   export const getThing = callable({ auth: 'required', label: 'getThing' }, async ({ uid, data }) =>
 *     readTx(async (tx) => …));
 */
export function callable<Req = unknown, Res = unknown>(
  o: { auth: 'required' | 'public'; label: string; authMessage?: string; errorMessage?: string },
  handler: (ctx: CallableContext<Req>) => Promise<Res>,
): CallableFunction<Req, Promise<Res>> {
  return onCall<Req, Promise<Res>>({ secrets: NEO4J_SECRETS }, async (request) => {
    const uid = o.auth === 'required'
      ? requireUid(request as CallableRequest<unknown>, o.authMessage)
      : request.auth?.uid ?? null;
    try {
      return await handler({ uid, data: request.data, request });
    } catch (error) {
      throw toHttpsError(error, { message: o.errorMessage ?? 'Something went wrong', label: o.label });
    }
  });
}
