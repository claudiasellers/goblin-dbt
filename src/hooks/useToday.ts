import { createContext, useContext, useEffect } from 'react';
import type { TodayItem } from '../services/spine';
import type { PendingFollowUp } from './useOppositeActionFollowUps';

export interface TodayValue {
  items: TodayItem[];
  more: TodayItem[];
  /** A flooded band collapsed the stack (nothing hidden; one tap expands). */
  holding: boolean;
  /** True once the first fetch for this user finished. */
  ready: boolean;
  /** Re-fetch now (after a resolve, a close, a pattern-offer answer). */
  refresh: () => void;
  /** Remove an item locally right away (the server is the source of truth on the next fetch). */
  drop: (id: string) => void;
  /** A screen asked for Today to stay out of sight (a check-in in progress: D-09). */
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
  /** OA plan ids hidden with the OA card's "Hide for now" (this visit only; a new plan shows again). */
  oaHidden: ReadonlySet<string>;
  hideOa: (ids: string[]) => void;
}

const EMPTY: TodayValue = { items: [], more: [], holding: false, ready: false, refresh: () => {}, drop: () => {}, hidden: false, setHidden: () => {}, oaHidden: new Set(), hideOa: () => {} };

export const TodayContext = createContext<TodayValue | null>(null);

/** The Today stack; empty outside TodayProvider. */
export function useToday(): TodayValue {
  return useContext(TodayContext) ?? EMPTY;
}

/** The cards the stack draws itself (OA plans render through OA's own card instead). */
export function todayCards(t: Pick<TodayValue, 'items' | 'more'>): TodayItem[] {
  return [...t.items, ...t.more].filter((i) => i.type !== 'oa_plan');
}

/** The OA plans the stack shows: all of them, unless every one was hidden with "Hide for now". */
export function visibleOaPending(pending: PendingFollowUp[], oaHidden: ReadonlySet<string>): PendingFollowUp[] {
  return pending.some((p) => !oaHidden.has(p.session.id)) ? pending : [];
}

/**
 * Keep Today (the side panel and the header button) out of sight while `hide` is true; cleared on
 * unmount. The check-in uses it from the first spot on, so follow-ups never sit beside a check-in,
 * a result or the crisis banner (D-09).
 */
export function useHideToday(hide: boolean): void {
  const { setHidden } = useToday();
  useEffect(() => {
    setHidden(hide);
    return () => setHidden(false);
  }, [hide, setHidden]);
}
