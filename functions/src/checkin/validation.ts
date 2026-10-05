/**
 * Check-in request validation (PR-C1). Pure: no firebase imports.
 *
 * Only a missing quadrant is an error (plus auth, checked by the callable). Every optional field
 * that fails validation is dropped, never fatal: an app that loses what you told it isn't a
 * container (E2 §A2.2).
 */
import { ValidationError, GRAPH_ID, UUID } from '../shared/validate';
import { optionalReading } from '../capacity/reading';
import type { CapacityReading } from '../capacity/types';

export const CHECKIN_SOURCES = ['grid', 'ftf', 'body', 'dear_man_debrief'] as const;
export type CheckInSource = (typeof CHECKIN_SOURCES)[number];
export const QUADRANTS = ['high-unpleasant', 'low-unpleasant', 'high-pleasant', 'low-pleasant'] as const;
/** `safety` is reserved for CORE-01 (safety.open); it is written through the same upsert later. */
export const NEXT_ACTION_KINDS = ['tool', 'micro_step', 'activity', 'activity_partial', 'done'] as const;
export type NextActionKind = (typeof NEXT_ACTION_KINDS)[number];

export type CheckInNextAction =
  | { kind: 'tool'; toolId: string }
  | { kind: 'micro_step'; microStepId?: string }
  | { kind: 'activity' | 'activity_partial'; activityId?: string }
  | { kind: 'done' };

const ROUTING_VERSION = /^[a-z0-9][a-z0-9.-]{0,19}$/;
const ROUTING_BANDS = ['steady', 'stirred', 'flooded'];
const ROUTING_BAND_SOURCES = ['probe', 'ftf', 'carried', 'inferred'];
const oneOfOrNull = (v: unknown, allowed: string[]): string | null => (typeof v === 'string' && allowed.includes(v) ? v : null);

/** App tool ids (kebab-case) and reserved spine tool ids. */
export const APP_TOOL_ID = /^[a-z][a-z0-9-]{0,63}$/;
const STEP_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

export interface SensationInput {
  x: number; y: number; region: string; intensityX: number; intensityY: number; tags: string[];
  /** Body map (docs/design/body-map.md): which side of a paired place; null from older clients. */
  side: 'both' | 'left' | 'right' | null;
  /** Stable SensationType ids of the picked pad words (tags are their display labels). */
  sensationIds: string[];
  /** Body map step 3: how strong, 0–1, from the optional strength bar; null when it wasn't used. */
  strength: number | null;
}

const SIDES = ['both', 'left', 'right'] as const;
const SENSATION_ID = /^[a-z][a-z0-9_]{0,63}$/;

export interface SaveCheckInInput {
  id: string | null;                 // null → old client; the server mints one
  emotion: string;
  quadrant: string;
  intensityX: number;
  intensityY: number;
  bodySensations: SensationInput[];
  note: string;
  timestamp: string | null;          // applied on create only
  activationPatternId: string | null;
  confidence: number | null;
  source: CheckInSource | null;
  emotionIds: string[];              // unvalidated against the graph yet (the callable filters)
  capacity: CapacityReading | null;
  discQuestionIds: string[];
  discResponseIds: string[];
  recommendedToolIds: string[];
  routingVersion: string | null;           // E4-4: 'rf-v2' (Oct 2026; 'rf-v1' before) | 'legacy'
  routingBand: string | null;              // the engine's band (may be inferred; never stored as band*, R1)
  routingBandSource: string | null;
  secondaryPatternId: string | null;
  coOccurrenceLabel: string | null;
  guidedActivityId: string | null;
  safetyFlagId: string | null;
  resultShown: boolean;
  nextAction: CheckInNextAction | null;
  embeddedToolSessionIds: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num01 = (v: unknown, dflt: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : dflt);
const id = (v: unknown, re: RegExp): string | null => (typeof v === 'string' && re.test(v) ? v : null);
const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
const ids = (v: unknown, re: RegExp, max: number): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && re.test(x)))].slice(0, max) : [];
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;
const iso = (v: unknown): string | null => (typeof v === 'string' && ISO.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
/** The client's check-in time, only when plausible ([now − 12 h, now + 5 min]); else null → the server's clock. */
export const TIMESTAMP_MAX_AGE_MS = 12 * 3_600_000;
const checkInTime = (v: unknown, now: Date): string | null => {
  const t = iso(v);
  if (!t) return null;
  const ms = Date.parse(t);
  return ms >= now.getTime() - TIMESTAMP_MAX_AGE_MS && ms <= now.getTime() + 5 * 60_000 ? t : null;
};

export function parseNextAction(raw: unknown): CheckInNextAction | null {
  if (!isObj(raw)) return null;
  switch (raw.kind) {
    case 'tool': {
      const toolId = id(raw.toolId, APP_TOOL_ID);
      return toolId ? { kind: 'tool', toolId } : null;
    }
    case 'micro_step': {
      const microStepId = id(raw.microStepId, STEP_ID);
      return microStepId ? { kind: 'micro_step', microStepId } : { kind: 'micro_step' };
    }
    case 'activity':
    case 'activity_partial': {
      const activityId = id(raw.activityId, STEP_ID);
      return activityId ? { kind: raw.kind, activityId } : { kind: raw.kind };
    }
    case 'done':
      return { kind: 'done' };
    default:
      return null;
  }
}

/**
 * The old body figure's names → place id + side. Applied on every save, so an old client still
 * open in a tab can't write names outside the shared vocabulary. Same table as
 * schema/migrations/2026-10-body-regions.cypher (which fixes records saved before; a test keeps
 * the two identical).
 */
export const LEGACY_REGIONS: Record<string, [string, 'left' | 'right' | null]> = {
  Head: ['head', null], Face: ['face', null], Neck: ['neck', null], Chest: ['chest', null],
  Stomach: ['stomach', null], Hips: ['lower_back', null],
  'Left Shoulder': ['shoulders', 'left'], 'Right Shoulder': ['shoulders', 'right'],
  'Left Arm': ['arms', 'left'], 'Right Arm': ['arms', 'right'],
  'Left Hand': ['hands', 'left'], 'Right Hand': ['hands', 'right'],
  'Left Thigh': ['legs', 'left'], 'Right Thigh': ['legs', 'right'],
  'Left Knee': ['legs', 'left'], 'Right Knee': ['legs', 'right'],
  'Left Calf': ['legs', 'left'], 'Right Calf': ['legs', 'right'],
  'Left Foot': ['feet', 'left'], 'Right Foot': ['feet', 'right'],
};

function sensation(raw: unknown): SensationInput | null {
  if (!isObj(raw)) return null;
  const given = typeof raw.region === 'string' && raw.region.trim() ? raw.region.slice(0, 64) : null;
  if (!given) return null;
  const legacy = Object.prototype.hasOwnProperty.call(LEGACY_REGIONS, given) ? LEGACY_REGIONS[given] : null;
  const region = legacy ? legacy[0] : given;
  const intensity = isObj(raw.intensity) ? raw.intensity : {};
  return {
    x: num01(raw.x, 0.5), y: num01(raw.y, 0.5), region,
    intensityX: num01(intensity.x, 0.5), intensityY: num01(intensity.y, 0.5),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string' && t.length > 0 && t.length <= 64).slice(0, 20) : [],
    side: legacy ? (legacy[1] ?? 'both')
      : (SIDES as readonly unknown[]).includes(raw.side) ? (raw.side as SensationInput['side']) : null,
    sensationIds: Array.isArray(raw.sensationIds)
      ? [...new Set(raw.sensationIds.filter((t): t is string => typeof t === 'string' && SENSATION_ID.test(t)))].slice(0, 20)
      : [],
    strength: typeof raw.strength === 'number' && Number.isFinite(raw.strength) && raw.strength >= 0 && raw.strength <= 1
      ? Math.round(raw.strength * 1000) / 1000 : null,
  };
}

/**
 * Normalise a saveCheckIn request. Throws ValidationError only for a missing/unknown quadrant.
 * `now` bounds the capacity reading (see capacity/reading.ts).
 */
export function validateSaveCheckIn(raw: unknown, now: Date): SaveCheckInInput {
  if (!isObj(raw)) throw new ValidationError('Missing required fields');
  const quadrant = typeof raw.quadrant === 'string' && (QUADRANTS as readonly string[]).includes(raw.quadrant) ? raw.quadrant : null;
  if (!quadrant) throw new ValidationError('Missing required fields');
  // Legacy clients sent `emotion` (display string); an empty one falls back to the quadrant.
  if (typeof raw.emotion !== 'string' || !raw.emotion.trim()) throw new ValidationError('Missing required fields');
  const intensity = isObj(raw.intensity) ? raw.intensity : {};
  const disc = Array.isArray(raw.discriminatingAnswers) ? raw.discriminatingAnswers.filter(isObj).slice(0, 10) : [];
  const pairs = disc
    .map((a) => [id(a.questionId, GRAPH_ID), id(a.responseId, GRAPH_ID)] as const)
    .filter((p): p is readonly [string, string] => Boolean(p[0] && p[1]));
  const confidence = typeof raw.confidence === 'number' && Number.isFinite(raw.confidence) && raw.confidence >= 0 && raw.confidence <= 1
    ? raw.confidence : null;
  return {
    id: id(raw.id, UUID),
    emotion: text(raw.emotion, 500),
    quadrant,
    intensityX: num01(intensity.x, 0.5),
    intensityY: num01(intensity.y, 0.5),
    bodySensations: (Array.isArray(raw.bodySensations) ? raw.bodySensations.slice(0, 30) : [])
      .map(sensation).filter((s): s is SensationInput => s !== null),
    note: text(raw.note, 2000),
    timestamp: checkInTime(raw.timestamp, now),
    activationPatternId: id(raw.activationPatternId, GRAPH_ID),
    confidence,
    source: typeof raw.source === 'string' && (CHECKIN_SOURCES as readonly string[]).includes(raw.source) ? (raw.source as CheckInSource) : null,
    emotionIds: ids(raw.emotionIds, GRAPH_ID, 20),
    capacity: optionalReading(raw.capacity, { now, allowSources: ['probe', 'ftf', 'carried'], freshMinutes: 20 }),
    discQuestionIds: pairs.map((p) => p[0]),
    discResponseIds: pairs.map((p) => p[1]),
    recommendedToolIds: ids(raw.recommendedToolIds, APP_TOOL_ID, 2),
    routingVersion: id(raw.routingVersion, ROUTING_VERSION),
    routingBand: oneOfOrNull(raw.routingBand, ROUTING_BANDS),
    routingBandSource: oneOfOrNull(raw.routingBandSource, ROUTING_BAND_SOURCES),
    secondaryPatternId: id(raw.secondaryPatternId, GRAPH_ID),
    coOccurrenceLabel: typeof raw.coOccurrenceLabel === 'string' && raw.coOccurrenceLabel ? raw.coOccurrenceLabel.slice(0, 200) : null,
    guidedActivityId: id(raw.guidedActivityId, STEP_ID),
    safetyFlagId: id(raw.safetyFlagId, GRAPH_ID),
    resultShown: raw.resultShown === true,
    nextAction: parseNextAction(raw.nextAction),
    embeddedToolSessionIds: ids(raw.embeddedToolSessionIds, UUID, 3),
  };
}

/** The flat Cypher params of a next action. */
export function nextActionParams(a: CheckInNextAction | null): { nextKind: NextActionKind | null; nextToolId: string | null } {
  if (!a) return { nextKind: null, nextToolId: null };
  return { nextKind: a.kind, nextToolId: a.kind === 'tool' ? a.toolId : null };
}
