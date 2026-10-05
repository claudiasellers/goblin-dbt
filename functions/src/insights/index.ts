/**
 * Insights (Reflect) data in one call.
 *
 * Reflect R1: the logic lives in pure modules (compute.ts: the numbers; handler.ts: which graph
 * content to look up) over an injected query layer (queries.ts), the recommendation engine's
 * shape. Outcomes come from the practice spine's close answers; see compute.ts for what changed.
 */
import { callable } from '../shared/callable';
import { getInsightsHandler } from './handler';
import { graphDeps } from './queries';
import { TIME_RANGES, type InsightsPayload, type TimeRange } from './types';

/** An unknown or missing range is 30 days (as before R1); never an error. */
export function parseTimeRange(data: unknown): TimeRange {
  const raw = data && typeof data === 'object' ? (data as { timeRange?: unknown }).timeRange : undefined;
  return (TIME_RANGES as readonly unknown[]).includes(raw) ? (raw as TimeRange) : '30d';
}

export const getInsightsData = callable<unknown, InsightsPayload>(
  { auth: 'required', label: 'getInsightsData', authMessage: 'User must be logged in', errorMessage: 'Failed to get insights data' },
  async ({ uid, data }) => getInsightsHandler(parseTimeRange(data), graphDeps(uid as string)),
);
