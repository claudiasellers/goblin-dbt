/**
 * Witness request validation (plan A5-2). Pure: no firebase imports.
 * Own-line text is length-checked and stripped of control characters only: it is never linted,
 * interpreted or sent to a model (WMP-01).
 */
import { ValidationError, graphId, obj, oneOf, str, strArray, uuid } from '../shared/validate';
import { BANDS, type Band } from '../capacity/types';
import {
  LANDED, OWN_LINE_MAX, WITNESS_MOMENTS,
  type GetWitnessLinesRequest, type Landed, type RecordWitnessBeatRequest, type WitnessMoment,
} from './types';

/** App tool ids (kebab-case) or `checkin`. */
const HOST_TOOL_ID = /^[a-z][a-z0-9-]{1,63}$/;

const optGraphId = (v: unknown): string | undefined => (v === undefined || v === null || v === '' ? undefined : graphId(v));
const bool = (v: unknown, dflt: boolean): boolean => {
  if (v === undefined || v === null) return dflt;
  if (typeof v !== 'boolean') throw new ValidationError('Expected true or false');
  return v;
};

export type ParsedGetWitnessLines = Required<Omit<GetWitnessLinesRequest, 'situationId' | 'urgeId'>> & {
  situationId: string | null; urgeId: string | null;
};

export function parseGetWitnessLines(data: unknown): ParsedGetWitnessLines {
  const d = obj(data);
  const max = d.max === undefined || d.max === null ? 2 : d.max;
  if (max !== 1 && max !== 2 && max !== 3) throw new ValidationError('Expected 1, 2 or 3');
  return {
    hostToolId: str(d.hostToolId, { max: 64, pattern: HOST_TOOL_ID }),
    moment: oneOf(d.moment, WITNESS_MOMENTS) as WitnessMoment,
    band: oneOf(d.band, BANDS) as Band,
    emotionIds: d.emotionIds === undefined || d.emotionIds === null ? [] : strArray(d.emotionIds, { max: 5, item: graphId }),
    situationId: optGraphId(d.situationId) ?? null,
    urgeId: optGraphId(d.urgeId) ?? null,
    forOther: bool(d.forOther, false),
    excludeIds: d.excludeIds === undefined || d.excludeIds === null ? [] : strArray(d.excludeIds, { max: 20, item: (x) => str(x, { max: 100 }) }),
    max: max as 1 | 2 | 3,
  };
}

/** Own-line text: control characters stripped (newlines become spaces), trimmed, 1…140 characters. */
export function cleanOwnLineText(v: unknown): string {
  if (typeof v !== 'string') throw new ValidationError('Expected a string');
  // eslint-disable-next-line no-control-regex
  const t = v.replace(/[\r\n\t]+/g, ' ').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, '').replace(/ {2,}/g, ' ').trim();
  if (!t.length || t.length > OWN_LINE_MAX) throw new ValidationError(`Expected 1 to ${OWN_LINE_MAX} characters`);
  return t;
}

export function parseRecordWitnessBeat(data: unknown): RecordWitnessBeatRequest {
  const d = obj(data);
  const shownRaw = d.shown === undefined || d.shown === null ? [] : d.shown;
  if (!Array.isArray(shownRaw) || shownRaw.length > 3) throw new ValidationError('Expected at most 3 lines');
  const shown = shownRaw.map((x) => {
    const s = obj(x);
    const landed = s.landed === undefined || s.landed === null ? null : (oneOf(s.landed, LANDED) as Landed);
    return { lineId: graphId(s.lineId), landed };
  });
  if (new Set(shown.map((s) => s.lineId)).size !== shown.length) throw new ValidationError('Duplicate line');
  const out: RecordWitnessBeatRequest = {
    hostKind: oneOf(d.hostKind, ['checkin', 'tool_session'] as const),
    hostId: uuid(d.hostId),
    moment: oneOf(d.moment, WITNESS_MOMENTS) as WitnessMoment,
    band: oneOf(d.band, BANDS) as Band,
    shown,
    skipped: bool(d.skipped, false),
    noneFit: bool(d.noneFit, false),
  };
  if (d.ownLineShownId !== undefined && d.ownLineShownId !== null) out.ownLineShownId = uuid(d.ownLineShownId);
  if (d.keepLineId !== undefined && d.keepLineId !== null) {
    out.keepLineId = graphId(d.keepLineId);
    if (!shown.some((s) => s.lineId === out.keepLineId)) throw new ValidationError('Only a line that was shown can be kept');
  }
  if (d.ownLine !== undefined && d.ownLine !== null) {
    const o = obj(d.ownLine);
    const situationId = optGraphId(o.situationId);
    out.ownLine = {
      id: uuid(o.id),
      text: cleanOwnLineText(o.text),
      emotionIds: o.emotionIds === undefined || o.emotionIds === null ? [] : strArray(o.emotionIds, { max: 5, item: graphId }),
      ...(situationId ? { situationId } : {}),
    };
  }
  return out;
}

