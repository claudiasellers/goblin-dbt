/**
 * Input validation for new callables. Pure (no firebase imports), so tests can load it directly.
 * Every validator returns the typed value or throws ValidationError. Messages name the rule,
 * never the value: request payloads can hold therapy text and must not reach logs or clients.
 */
export class ValidationError extends Error {
  constructor(message = 'Invalid request') {
    super(message);
    this.name = 'ValidationError';
  }
}

const fail = (message: string): never => { throw new ValidationError(message); };

/** Graph content ids: emotion, urge, tool, pattern (lower-case, digits, `_`, `-`; ≤100). */
export const GRAPH_ID = /^[a-z0-9][a-z0-9_-]{0,99}$/;
/** Client-generated record ids (same rule as the Opposite Action session id). */
export const UUID = /^[a-f0-9-]{36}$/i;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

/** A plain object (not null, not an array). */
export function obj(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail('Expected an object');
  return v as Record<string, unknown>;
}

/** A string of `min`…`max` characters (defaults 1…1000), optionally matching `pattern`. */
export function str(v: unknown, o: { min?: number; max?: number; pattern?: RegExp } = {}): string {
  const { min = 1, max = 1000, pattern } = o;
  if (typeof v !== 'string') return fail('Expected a string');
  if (v.length < min || v.length > max) fail(`Expected ${min} to ${max} characters`);
  if (pattern && !pattern.test(v)) fail('Invalid format');
  return v;
}

/** `null` for null / undefined / '', otherwise a string of at most `max` (default 1000) characters. */
export function optStr(v: unknown, o: { max?: number } = {}): string | null {
  if (v === null || v === undefined || v === '') return null;
  return str(v, { min: 0, max: o.max });
}

export function graphId(v: unknown): string {
  return str(v, { max: 100, pattern: GRAPH_ID });
}

export function uuid(v: unknown): string {
  return str(v, { min: 36, max: 36, pattern: UUID });
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) fail('Unexpected value');
  return v as T;
}

/** An array of at most `max` (default 50) items, each passed through `item` (default `str`). */
export function strArray(v: unknown, o: { max?: number; item?: (x: unknown) => string } = {}): string[] {
  const { max = 50, item = (x: unknown) => str(x) } = o;
  if (!Array.isArray(v)) return fail('Expected a list');
  if (v.length > max) fail(`Expected at most ${max} items`);
  return v.map(item);
}

/** An integer in [min, max]. */
export function intIn(v: unknown, o: { min: number; max: number }): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < o.min || v > o.max) {
    fail(`Expected an integer from ${o.min} to ${o.max}`);
  }
  return v as number;
}

/** An ISO-8601 date-time with a zone (`Z` or `±hh:mm`), e.g. from `Date.toISOString()`. */
export function isoDateTime(v: unknown): string {
  const s = str(v, { max: 40, pattern: ISO_DATE_TIME });
  if (Number.isNaN(Date.parse(s))) fail('Invalid date');
  return s;
}
