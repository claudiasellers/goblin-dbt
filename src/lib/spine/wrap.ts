/**
 * Wrapping the four existing session types in the spine (PR-S4). Pure mappings; the tools call
 * `session.close(...)` with what these return. The tools' own session nodes and readers stay
 * unchanged (R25: wrap, don't migrate); the ToolSession links to them with DETAIL.
 */
import type { SpineContent, ScheduleFollowUpInput } from '../../services/spine';
import { dueAtFor } from './windows';
import { newId } from './ids';

/** Recover's follow-up choices → FollowUpType ids (D-09 windows live on the types). */
export const RECOVER_FOLLOW_UP_TYPES: Record<string, string> = {
  tomorrow: 'recover_next_day',
  rehearse: 'recover_rehearse',
  experiment: 'recover_log',
};

/** The schedule for Recover's chosen follow-ups (unknown or disabled types are skipped). */
export function recoverSchedule(followUps: string[], content: Pick<SpineContent, 'followUpTypes'> | null, now: Date): ScheduleFollowUpInput[] {
  if (!content) return [];
  const out: ScheduleFollowUpInput[] = [];
  for (const f of followUps) {
    const typeId = RECOVER_FOLLOW_UP_TYPES[f];
    const type = content.followUpTypes.find((t) => t.id === typeId && t.enabled);
    const dueAt = type ? dueAtFor(type.window, now) : null;
    if (typeId && dueAt) out.push({ id: newId(), type: typeId, dueAt: dueAt.toISOString() });
  }
  return out;
}

/** OA: a practised session is a rep of opposite action; planning or missing it isn't. */
export function oaSkillIds(status: string): string[] | undefined {
  return status === 'practiced' ? undefined : [];
}
