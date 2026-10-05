import { createContext, useContext, useEffect } from 'react';
import type { TodayItem } from '../services/spine';

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
}

const EMPTY: TodayValue = { items: [], more: [], holding: false, ready: false, refresh: () => {}, drop: () => {}, hidden: false, setHidden: () => {} };

export const TodayContext = createContext<TodayValue | null>(null);

/** The Today stack; empty outside TodayProvider. */
export function useToday(): TodayValue {
  return useContext(TodayContext) ?? EMPTY;
}

/** The cards the stack draws itself (OA plans render through OA's own card instead). */
export function todayCards(t: Pick<TodayValue, 'items' | 'more'>): TodayItem[] {
  return [...t.items, ...t.more].filter((i) => i.type !== 'oa_plan');
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
