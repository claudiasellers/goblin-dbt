import { createContext, useContext } from 'react';
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
}

const EMPTY: TodayValue = { items: [], more: [], holding: false, ready: false, refresh: () => {}, drop: () => {} };

export const TodayContext = createContext<TodayValue | null>(null);

/** The Today stack; empty outside TodayProvider. */
export function useToday(): TodayValue {
  return useContext(TodayContext) ?? EMPTY;
}

/** The "did it help?" item, if Today has one (desktop ContinuityCard reads the same item). */
export function useToolOutcomeItem(): TodayItem | null {
  const t = useToday();
  return [...t.items, ...t.more].find((i) => i.kind === 'tool_outcome') ?? null;
}
