/**
 * Today stack: follow-up state and ordering (PR-S5). Pure: no firebase imports.
 *
 * - `due` / `stale` / `upcoming` are derived at read time, never stored (a stored `due` would need a
 *   writer on a clock).
 * - Order: tier safety > practice > quality > skills; within a tier due > stale > upcoming; due and
 *   upcoming soonest first, stale newest first (the order OA's card already uses).
 * - The first 3 are `items`, the rest `more`. `flooded` (a fresh band, A4) collapses the stack:
 *   nothing is hidden, one tap expands it ("Your plans will keep").
 */
export type Tier = 'safety' | 'practice' | 'quality' | 'skills';
export type TodayState = 'due' | 'stale' | 'upcoming';
export type TodayKind = 'follow_up' | 'tool_outcome' | 'pattern_offer' | 'profile_revisit';

export interface TodayChoice {
  id: string;
  label: string;
  status?: 'done' | 'partly' | 'didnt' | 'dismissed';
  snoozeHours?: number;
}

export interface TodayItem {
  id: string;
  kind: TodayKind;
  type: string;
  tier: Tier;
  state: TodayState;
  dueAt: string | null;
  resolveMode: 'inline' | 'deeplink';
  deepLink: string | null;
  choices: TodayChoice[];
  /** May contain {toolName}; the client fills it from src/data/tools.ts. */
  copy: { title: string; body?: string };
  source?: { toolId?: string; toolSessionId?: string; detailId?: string };
}

export const TODAY_VISIBLE = 3;
/** Follow-ups due within this window show as upcoming. */
export const UPCOMING_HOURS = 2;
/** A stale follow-up stays in Today this long after it went stale. */
export const STALE_KEEP_HOURS = 24 * 7;

const TIER_ORDER: Record<Tier, number> = { safety: 0, practice: 1, quality: 2, skills: 3 };
const STATE_ORDER: Record<TodayState, number> = { due: 0, stale: 1, upcoming: 2 };
const HOUR = 3_600_000;

/** State of a scheduled follow-up at `now`, or null when it isn't in Today (too far out / too old). */
export function followUpState(dueAt: string, staleAfterHours: number, now: number): TodayState | null {
  const t = Date.parse(dueAt);
  if (Number.isNaN(t)) return null;
  if (t > now + UPCOMING_HOURS * HOUR) return null;
  if (t > now) return 'upcoming';
  const age = now - t;
  if (age <= staleAfterHours * HOUR) return 'due';
  if (age <= (staleAfterHours + STALE_KEEP_HOURS) * HOUR) return 'stale';
  return null;
}

export function compareToday(a: TodayItem, b: TodayItem): number {
  const tier = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
  if (tier) return tier;
  const st = STATE_ORDER[a.state] - STATE_ORDER[b.state];
  if (st) return st;
  const ta = a.dueAt ? Date.parse(a.dueAt) : 0;
  const tb = b.dueAt ? Date.parse(b.dueAt) : 0;
  return a.state === 'stale' ? tb - ta : ta - tb;
}

/**
 * Order the stack. At most one derived `tool_outcome` and one `pattern_offer` are kept (the newest).
 * A flooded band empties `items` and sets `holding`: everything stays one tap away in `more`.
 */
export function orderToday(all: TodayItem[], band?: 'steady' | 'stirred' | 'flooded' | null): { items: TodayItem[]; more: TodayItem[]; holding: boolean } {
  const onceKinds = new Set<TodayKind>();
  const kept: TodayItem[] = [];
  for (const it of [...all].sort((a, b) => (b.dueAt ? Date.parse(b.dueAt) : 0) - (a.dueAt ? Date.parse(a.dueAt) : 0))) {
    if (it.kind === 'tool_outcome' || it.kind === 'pattern_offer') {
      if (onceKinds.has(it.kind)) continue;
      onceKinds.add(it.kind);
    }
    kept.push(it);
  }
  const sorted = kept.sort(compareToday);
  if (band === 'flooded') return { items: [], more: sorted, holding: sorted.length > 0 };
  return { items: sorted.slice(0, TODAY_VISIBLE), more: sorted.slice(TODAY_VISIBLE), holding: false };
}

/** Fill a deep link template: {detailId}, {sourceToolId}, {sourceSessionId}. Unfilled → null. */
export function fillDeepLink(template: string | null, v: Record<string, string | null | undefined>): string | null {
  if (!template) return null;
  let missing = false;
  const out = template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const x = v[k];
    if (!x) { missing = true; return ''; }
    return encodeURIComponent(x);
  });
  return missing ? null : out;
}
