import { HttpsError } from 'firebase-functions/v2/https';
import { ValidationError } from './validate';

export function invalid(message = 'Invalid request'): HttpsError {
  return new HttpsError('invalid-argument', message);
}

/** Run a validator; a ValidationError becomes `invalid-argument` with `message`. */
export function parseOrInvalid<T>(parse: () => T, message: string): T {
  try {
    return parse();
  } catch (error) {
    if (error instanceof ValidationError) throw invalid(message);
    throw error;
  }
}

/**
 * Map anything a handler throws to what the client sees:
 * - HttpsError → as is;
 * - ValidationError → `invalid-argument` (its message names a rule, never a value);
 * - Neo4j uniqueness violation → `already-exists` (a double tap or retry lost the race);
 * - anything else → logged as `label` + error code only (never the payload: it can hold therapy
 *   text) and returned as `internal` with `message`.
 */
export function toHttpsError(error: unknown, o: { message: string; label: string }): HttpsError {
  if (error instanceof HttpsError) return error;
  if (error instanceof ValidationError) return invalid(error.message);
  const code = (error as { code?: unknown } | null)?.code;
  if (code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
    return new HttpsError('already-exists', 'Already saved');
  }
  console.error(o.label, typeof code === 'string' ? code : 'unknown');
  return new HttpsError('internal', o.message);
}

/**
 * What may be logged about a caught error: its code and name, never the error itself (a driver
 * error's message can quote a parameter value, and so carry something personal).
 */
export function errorTag(error: unknown): { code: string; name: string } {
  const e = (error ?? null) as { code?: unknown; name?: unknown } | null;
  return {
    code: typeof e?.code === 'string' || typeof e?.code === 'number' ? String(e.code) : 'unknown',
    name: typeof e?.name === 'string' ? e.name : 'unknown',
  };
}
