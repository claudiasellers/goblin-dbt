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
