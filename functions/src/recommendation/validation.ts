/**
 * getStateAndTools request validation (plan E4-3). Pure: no firebase imports.
 * Unknown quadrant and bad band / bandSource / blank / surface values are errors; the old optional
 * fields stay lenient (malformed entries are dropped, as before E4, so no client breaks).
 */
import { GRAPH_ID, ValidationError } from '../shared/validate';
import { BANDS, QUADRANTS, REQUEST_BAND_SOURCES, SURFACES, type CheckInInput } from './types';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const unit = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;

export function parseStateRequest(raw: unknown): CheckInInput {
  if (!isObj(raw) || !raw.quadrant) throw new ValidationError('Quadrant is required');
  if (!(QUADRANTS as readonly unknown[]).includes(raw.quadrant)) throw new ValidationError('Unknown quadrant');
  const out: CheckInInput = { quadrant: raw.quadrant as string };

  if (Array.isArray(raw.emotions)) {
    const emotions = raw.emotions.filter((e): e is string => typeof e === 'string' && e.trim().length > 0 && e.length <= 100).slice(0, 20);
    if (emotions.length) out.emotions = emotions;
  }
  if (isObj(raw.intensity) && unit(raw.intensity.x) && unit(raw.intensity.y)) out.intensity = { x: raw.intensity.x, y: raw.intensity.y };
  if (Array.isArray(raw.discriminatingAnswers)) {
    const answers = raw.discriminatingAnswers
      .filter(isObj)
      .filter((a) => typeof a.questionId === 'string' && GRAPH_ID.test(a.questionId) && typeof a.responseId === 'string' && GRAPH_ID.test(a.responseId))
      .slice(0, 10)
      .map((a) => ({ questionId: a.questionId as string, responseId: a.responseId as string }));
    if (answers.length) out.discriminatingAnswers = answers;
  }

  if (raw.band != null) {
    if (!(BANDS as readonly unknown[]).includes(raw.band)) throw new ValidationError('Unknown band');
    out.band = raw.band as CheckInInput['band'];
  }
  if (raw.bandSource != null) {
    if (!(REQUEST_BAND_SOURCES as readonly unknown[]).includes(raw.bandSource)) throw new ValidationError('Unknown band source');
    if (out.band) out.bandSource = raw.bandSource as CheckInInput['bandSource'];
  }
  if (raw.blank != null) {
    if (typeof raw.blank !== 'boolean') throw new ValidationError('Expected blank to be true or false');
    out.blank = raw.blank;
  }
  if (raw.surface != null) {
    if (!(SURFACES as readonly unknown[]).includes(raw.surface)) throw new ValidationError('Unknown surface');
    out.surface = raw.surface as CheckInInput['surface'];
  }
  return out;
}
