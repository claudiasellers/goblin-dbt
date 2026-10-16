import { emotionIdsFor } from './checkInPayload';

/**
 * Route state for links into a tool. Keeps the shapes tools already read (`checkinEmotions`,
 * `activationPatternId` for OA / Problem Solve / DEAR MAN) and adds `spine`, which the tool
 * session provider (PR-S3) reads to link the session to its check-in or host.
 */
export type ToolEntry =
  | 'checkin_result' | 'checkin_grid' | 'tools' | 'followup' | 'today' | 'handoff' | 'embedded' | 'insights' | 'direct';

export interface SpineLinkState {
  entry: ToolEntry;
  checkInId?: string;
  hostSessionId?: string;
  followUpId?: string;
}

/** Which result card was tapped (E4-4). Carried for WMP-04 v1 (`ToolSession.routing`); read by nothing yet. */
export interface RoutingLinkState {
  slot: 'primary' | 'swap';
  ruleId?: string;
}

export interface ToolLinkState {
  checkinEmotions?: string[];
  activationPatternId?: string;
  spine?: SpineLinkState;
  routing?: RoutingLinkState;
}

/** A tool opened from a check-in result. */
export function fromCheckIn(
  checkInId: string | null | undefined, checkinEmotions?: string[], activationPatternId?: string, routing?: RoutingLinkState,
): ToolLinkState {
  return {
    ...(checkinEmotions?.length ? { checkinEmotions } : {}),
    ...(activationPatternId ? { activationPatternId } : {}),
    spine: { entry: 'checkin_result', ...(checkInId ? { checkInId } : {}) },
    ...(routing ? { routing: { slot: routing.slot, ...(routing.ruleId ? { ruleId: routing.ruleId } : {}) } } : {}),
  };
}

/** Read `spine` from `location.state`, tolerating anything. */
export function spineFrom(state: unknown): SpineLinkState | null {
  if (!state || typeof state !== 'object') return null;
  const s = (state as { spine?: unknown }).spine;
  if (!s || typeof s !== 'object') return null;
  const o = s as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const entry = str(o.entry) as ToolEntry | undefined;
  if (!entry) return null;
  return { entry, checkInId: str(o.checkInId), hostSessionId: str(o.hostSessionId), followUpId: str(o.followUpId) };
}

/** What the server takes as a tool session's emotion ids (GRAPH_ID, at most 20; one bad id fails the call). */
const SESSION_EMOTION_ID = /^[a-z0-9][a-z0-9_-]{0,99}$/;
const MAX_SESSION_EMOTIONS = 20;

/**
 * Graph emotion ids for a tool session. `checkinEmotions` is display names from a check-in result
 * but ids when one tool hands off to another, so both are read (as `emotionIdsFor` does); anything
 * the server would refuse is dropped, never sent.
 */
export function sessionEmotionIds(emotions: readonly unknown[]): string[] {
  const words = emotions.filter((e): e is string => typeof e === 'string' && e.length > 0);
  return emotionIdsFor(words).filter((id) => SESSION_EMOTION_ID.test(id)).slice(0, MAX_SESSION_EMOTIONS);
}

/** The emotion ids a link into a tool carries (`checkinEmotions`), tolerating anything. */
export function emotionIdsFromLink(state: unknown): string[] {
  if (!state || typeof state !== 'object') return [];
  const raw = (state as { checkinEmotions?: unknown }).checkinEmotions;
  return Array.isArray(raw) ? sessionEmotionIds(raw) : [];
}
