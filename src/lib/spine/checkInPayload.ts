/**
 * The saveCheckIn request built from check-in state (PR-C1). Pure, so the mapping is tested
 * without React: display names → emotion ids, FTF band → a capacity reading, discriminating
 * answers, what the result rendered, and whether the crisis banner showed.
 */
import { getEmotionByName } from '../../data/emotions';
import type { CapacityReading } from '../../data/capacityTypes';
import { isCrisisFlag } from '../crisisBanner';
import { shownToolIds } from '../recommendation';

export type CheckInSource = 'grid' | 'ftf' | 'body' | 'dear_man_debrief';

export type CheckInNextAction =
  | { kind: 'tool'; toolId: string }
  | { kind: 'micro_step'; microStepId?: string }
  | { kind: 'activity' | 'activity_partial'; activityId?: string }
  | { kind: 'done' };

export interface SaveCheckInRequest {
  id: string;
  emotion: string;
  quadrant: string;
  intensity: { x: number; y: number };
  bodySensations: Array<{
    x: number; y: number; region: string; side?: 'both' | 'left' | 'right'; intensity: { x: number; y: number };
    tags: string[]; sensationIds?: string[]; strength?: number | null; fromMirror?: boolean;
  }>;
  note: string;
  timestamp: string;
  activationPatternId?: string;
  confidence?: number;
  source?: CheckInSource;
  emotionIds?: string[];
  capacity?: CapacityReading;
  discriminatingAnswers?: Array<{ questionId: string; responseId: string }>;
  recommendedToolIds?: string[];
  /** E4-4: how the result was routed ('rf-v1' | 'legacy') and on which band (R1: kept apart from `band*`). */
  routingVersion?: string;
  routingBand?: 'steady' | 'stirred' | 'flooded';
  routingBandSource?: 'probe' | 'ftf' | 'carried' | 'inferred';
  secondaryPatternId?: string;
  coOccurrenceLabel?: string;
  guidedActivityId?: string;
  safetyFlagId?: string;
  resultShown?: boolean;
  nextAction?: CheckInNextAction;
  embeddedToolSessionIds?: string[];
}

/** The parts of a StateResult the payload reads (structural, so tests can pass plain objects). */
export interface ResultLike {
  pattern: { id: string; confidence?: number };
  tools: Array<{ id: string }>;
  safetyFlag?: { id?: string; type?: string | null } | null;
  secondaryPattern?: { id: string } | null;
  coOccurrence?: { clinicalLabel?: string } | null;
  guidedActivity?: { activityId: string } | null;
  routing?: { version: string; band: 'steady' | 'stirred' | 'flooded'; bandSource: 'probe' | 'ftf' | 'carried' | 'inferred' } | null;
}

export interface CheckInState {
  id: string;
  quadrant: string;
  emotions: string[];            // display names (legacy `emotion` string) or graph ids from suggestions
  emotionIds?: string[];         // ids known up front (FTF word)
  intensity: { x: number; y: number } | null;
  bodySensations: SaveCheckInRequest['bodySensations'];
  note: string;
  startedAt: Date;
  source: CheckInSource;
  capacity?: CapacityReading | null;
  discriminatingAnswers?: Array<{ questionId: string; responseId: string }>;
  embeddedToolSessionIds?: string[];
}

/** Display names and suggestion ids → graph emotion ids (unknown names dropped; the server re-checks). */
export function emotionIdsFor(emotions: string[], known: string[] = []): string[] {
  const out = new Set(known);
  for (const e of emotions) {
    const byName = getEmotionByName(e);
    if (byName) out.add(byName.id);
    else if (/^[a-z0-9][a-z0-9_-]*$/.test(e)) out.add(e);
  }
  return [...out];
}


/**
 * The save for a check-in whose result rendered (`result` set) or whose analysis failed (null).
 * The crisis banner result is saved like any other; `safetyFlagId` records that it showed.
 */
export function buildCheckInPayload(s: CheckInState, result: ResultLike | null, nextAction?: CheckInNextAction): SaveCheckInRequest {
  const req: SaveCheckInRequest = {
    id: s.id,
    emotion: s.emotions.join(', ') || s.quadrant,
    quadrant: s.quadrant,
    intensity: s.intensity ?? { x: 0.5, y: 0.5 },
    bodySensations: s.bodySensations,
    note: s.note,
    timestamp: s.startedAt.toISOString(),
    source: s.source,
    emotionIds: emotionIdsFor(s.emotions, s.emotionIds),
  };
  if (s.capacity) req.capacity = s.capacity;
  if (s.discriminatingAnswers?.length) req.discriminatingAnswers = s.discriminatingAnswers;
  if (s.embeddedToolSessionIds?.length) req.embeddedToolSessionIds = s.embeddedToolSessionIds;
  if (result) {
    req.resultShown = true;
    req.activationPatternId = result.pattern.id;
    if (result.pattern.confidence != null) req.confidence = result.pattern.confidence;
    // What rendered (E4-4): known tools only, ≤ 2, crisis-banner results included.
    req.recommendedToolIds = shownToolIds(result);
    if (result.routing) {
      req.routingVersion = result.routing.version;
      req.routingBand = result.routing.band;
      req.routingBandSource = result.routing.bandSource;
    }
    if (result.secondaryPattern?.id) req.secondaryPatternId = result.secondaryPattern.id;
    if (result.coOccurrence?.clinicalLabel) req.coOccurrenceLabel = result.coOccurrence.clinicalLabel;
    if (result.guidedActivity?.activityId) req.guidedActivityId = result.guidedActivity.activityId;
    if (isCrisisFlag(result.safetyFlag) && result.safetyFlag?.id) req.safetyFlagId = result.safetyFlag.id;
  }
  if (nextAction) req.nextAction = nextAction;
  return req;
}

/** An FTF check-in reading (FTF's band is the probe answer; D-07 wording 'default'). */
export function ftfReading(id: string, band: CapacityReading['value'], at: Date = new Date()): CapacityReading {
  return {
    id, value: band, viaCantTell: false, source: 'ftf', framing: 'now', wording: 'default',
    context: 'checkin', probeVersion: 'capacity-v1', at: at.toISOString(),
  };
}
