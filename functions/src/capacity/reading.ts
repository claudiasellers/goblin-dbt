/**
 * The capacity reading validator and its flattening onto log records (R1). Pure.
 *
 *   SET c += readingProps('band', reading)          // CheckIn
 *   SET ts += readingProps('bandAtStart', reading)  // ToolSession / SkillPractice
 */
import { ValidationError, obj, str, uuid, oneOf, isoDateTime } from '../shared/validate';
import {
  BAND_FRAMINGS, BAND_SOURCES, BANDS, PROBE_WORDINGS,
  type BandSource, type CapacityReading, type ThenVsNow, type ThenVsNowDir,
} from './types';

const CONTEXT = /^(checkin|[a-z][a-z0-9-]{0,63})$/;
const MINUTE = 60_000;

/**
 * Validate a client reading. Unknown keys are dropped. Throws ValidationError on anything else.
 * - value/source/framing/wording enums; id uuid; context `checkin` or an app tool id
 * - `at` within [now − 12 h, now + 5 min]
 * - source `carried` | `handoff` ⇒ `carriedFrom` present and (at − carriedFrom.at) ≤ freshMinutes
 */
export function validateCapacityReading(raw: unknown, opts: {
  now: Date; allowSources: readonly BandSource[]; freshMinutes: number;
}): CapacityReading {
  const r = obj(raw);
  const source = oneOf(r.source, BAND_SOURCES);
  if (!opts.allowSources.includes(source)) throw new ValidationError('Reading source not allowed here');
  const value = oneOf(r.value, BANDS);
  const viaCantTell = r.viaCantTell === true;
  if (viaCantTell && value !== 'stirred') throw new ValidationError("I can't tell reads as stirred");
  const at = isoDateTime(r.at);
  const t = Date.parse(at);
  const now = opts.now.getTime();
  if (t < now - 12 * 60 * MINUTE || t > now + 5 * MINUTE) throw new ValidationError('Reading time out of range');
  const out: CapacityReading = {
    id: uuid(r.id),
    value,
    viaCantTell,
    source,
    framing: oneOf(r.framing ?? 'now', BAND_FRAMINGS),
    wording: oneOf(r.wording ?? 'default', PROBE_WORDINGS),
    context: str(r.context, { max: 64, pattern: CONTEXT }),
    probeVersion: str(r.probeVersion, { max: 40 }),
    at,
  };
  if (r.hostSessionId != null) out.hostSessionId = uuid(r.hostSessionId);
  if (source === 'carried' || source === 'handoff') {
    const c = obj(r.carriedFrom);
    const cAt = isoDateTime(c.at);
    if (t - Date.parse(cAt) > opts.freshMinutes * MINUTE || Date.parse(cAt) > t + MINUTE) {
      throw new ValidationError('Carried reading is not fresh');
    }
    out.carriedFrom = { readingId: uuid(c.readingId), context: str(c.context, { max: 64, pattern: CONTEXT }), at: cAt };
  }
  return out;
}

/** Optional reading: null/undefined → null; anything invalid → null (never fatal on a save). */
export function optionalReading(raw: unknown, opts: Parameters<typeof validateCapacityReading>[1]): CapacityReading | null {
  if (raw == null) return null;
  try { return validateCapacityReading(raw, opts); } catch { return null; }
}

export type ReadingPrefix = 'band' | 'bandAtStart' | 'bandAtEnd';

/**
 * Flatten a reading onto a log record: `{band, bandSource, bandViaCantTell, bandAt, bandJson}` (or the
 * `bandAtStart*` / `bandAtEnd*` family). A null reading yields nulls, so a SET clears nothing it
 * shouldn't: callers only SET when a reading was given. `…At` is an ISO string; the Cypher wraps it
 * in datetime().
 */
export function readingProps(prefix: ReadingPrefix, r: CapacityReading | null): Record<string, string | boolean | null> {
  return {
    [prefix]: r?.value ?? null,
    [`${prefix}Source`]: r?.source ?? null,
    [`${prefix}ViaCantTell`]: r ? r.viaCantTell : null,
    [`${prefix}At`]: r?.at ?? null,
    [`${prefix}Json`]: r ? JSON.stringify(r) : null,
  };
}

/** FTF's stored `close` → the canonical pair (R3): louder→worse, same, quieter→better, much→much_better; dir down. */
export function thenVsNowFromFtf(close: string | null | undefined): { thenVsNow: ThenVsNow; thenVsNowDir: ThenVsNowDir } | null {
  const map: Record<string, ThenVsNow> = { louder: 'worse', same: 'same', quieter: 'better', much: 'much_better' };
  const v = close ? map[close] : undefined;
  return v ? { thenVsNow: v, thenVsNowDir: 'down' } : null;
}

/** Compat `ToolUsage.outcome` (R3, D-03): much_better→helped, better→somewhat, same|worse→not_really. */
export function legacyOutcome(v: ThenVsNow | null | undefined): 'helped' | 'somewhat' | 'not_really' | null {
  if (v === 'much_better') return 'helped';
  if (v === 'better') return 'somewhat';
  if (v === 'same' || v === 'worse') return 'not_really';
  return null;
}
