import { todayCards, useToday, visibleOaPending } from './useToday';
import { useOppositeActionFollowUpsContext } from './useOppositeActionFollowUps';

/**
 * How many things Today has to show: its own cards plus pending Opposite Action plans (drawn by
 * OA's card inside the stack). 0 means nothing to show anywhere.
 */
export function useTodayCount(): number {
  const today = useToday();
  const oa = useOppositeActionFollowUpsContext();
  return todayCards(today).length + (oa.ready ? visibleOaPending(oa.pending, today.oaHidden).length : 0);
}
