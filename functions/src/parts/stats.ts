/**
 * The integration readout per part (docs/design/parts.md, "The part card", and Reflect): what has helped
 * it settle (the person's own tags), how they've felt toward it over their visits, and when it tends to
 * show up. Pure: rows in (statsQueries.ts reads them), counts and ids out; the app words them from the
 * shipped copy (common/stats). Reflect reads it through insights/queries.ts; Me's card can attach the
 * same `partStats` to each part (getMe, later).
 *
 * The thresholds are what stops the app from over-reading a few data points: below one, that line is
 * null, and a part below all of them gets no block at all.
 */
import { NON_ANSWER } from './keepPlan';
import { PART_WHENS, type PartReflect, type PartStats, type PartWhen } from './statsTypes';

export const STATS_THRESHOLDS = {
  /** helped: the part's tags in all (parts.md: "after 3+ tags"). */
  helpedMinTags: 3,
  /** helped: tools shown at most. */
  helpedMaxTools: 3,
  /** felt: visits whose first feel-toward answer says something, in each half (so at least twice this in all). */
  feltMinPerHalf: 3,
  /** when: the part's tags in all; one band must also hold more than half of them. */
  whenMinTags: 3,
} as const;

/** A kept part as the stats query returns it (the caller's own, through their User). */
export interface StatsPartRow {
  id: string;
  name: string | null;
  status: string;
  firstPlace: string | null;
  shapeSig: number[] | null;
}
/** One PartTag: the tagged ToolSession's tool and when the tag was made. */
export interface StatsTagRow { partId: string; toolId: string; at: string }
/**
 * One Meet a part visit of the part with a feel-toward answer: only its FIRST answer (how they arrived,
 * which is what changes as the relationship does). feelTowardIds is ask-fresh: the query returns the
 * head alone and nothing here returns it raw, only the most common per half.
 */
export interface StatsSessionRow { partId: string; at: string; firstFeel: string }

export interface StatsRows {
  partsOn: boolean;
  /** User.timeZone (IANA, kept in step with the device); null or unknown → UTC. */
  timeZone: string | null;
  parts: StatsPartRow[];
  tags: StatsTagRow[];
  sessions: StatsSessionRow[];
}

const byTime = (a: { at: string }, b: { at: string }) => Date.parse(a.at) - Date.parse(b.at);

/** The local hour (0–23) and month (`YYYY-MM`) of an instant in a time zone; UTC when the zone is unknown. */
export function localTime(iso: string, timeZone: string | null): { hour: number; month: string } {
  const d = new Date(iso);
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC', year: 'numeric', month: '2-digit', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(d);
  } catch {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { hour: Number(get('hour')) % 24, month: `${get('year')}-${get('month')}` };
}

/** 05–12 mornings, 12–17 afternoons, 17–22 evenings, 22–05 nights. */
export function whenBand(hour: number): PartWhen {
  if (hour >= 5 && hour < 12) return 'mornings';
  if (hour >= 12 && hour < 17) return 'afternoons';
  if (hour >= 17 && hour < 22) return 'evenings';
  return 'nights';
}

/** Tools by tag count, most first, ties by the most recent tag; only with ≥ 3 tags in all; ≤ 3 tools. */
export function helpedFor(tags: readonly StatsTagRow[]): PartStats['helped'] {
  if (tags.length < STATS_THRESHOLDS.helpedMinTags) return null;
  const by = new Map<string, { n: number; last: number }>();
  for (const t of tags) {
    const at = Date.parse(t.at);
    const e = by.get(t.toolId) ?? { n: 0, last: -Infinity };
    by.set(t.toolId, { n: e.n + 1, last: Math.max(e.last, at) });
  }
  return [...by.entries()]
    .sort(([a, x], [b, y]) => y.n - x.n || y.last - x.last || a.localeCompare(b))
    .slice(0, STATS_THRESHOLDS.helpedMaxTools)
    .map(([toolId, { n }]) => ({ toolId, n }));
}

/** The most common answer; a tie goes to the one given most recently (rows oldest first). */
function mostCommon(rows: readonly StatsSessionRow[]): string {
  const n = new Map<string, number>();
  const last = new Map<string, number>();
  rows.forEach((r, i) => { n.set(r.firstFeel, (n.get(r.firstFeel) ?? 0) + 1); last.set(r.firstFeel, i); });
  return [...n.keys()].sort((a, b) => n.get(b)! - n.get(a)! || last.get(b)! - last.get(a)!)[0];
}

/**
 * Visits oldest first, split in two (the earlier half is the smaller one when the count is odd); each
 * half needs ≥ 3. Then vs now when the halves' most common first answers differ, else "since". A visit
 * whose first answer is a non-answer ("not sure", "nothing": keepPlan's NON_ANSWER) isn't counted:
 * "Lately: not sure" would read as a verdict when it's the absence of one.
 */
export function feltFor(sessions: readonly StatsSessionRow[], timeZone: string | null): PartStats['felt'] {
  const rows = sessions.filter((s) => !NON_ANSWER.test(s.firstFeel)).sort(byTime);
  const half = Math.floor(rows.length / 2);
  const earlier = rows.slice(0, half);
  const later = rows.slice(half);
  if (earlier.length < STATS_THRESHOLDS.feltMinPerHalf || later.length < STATS_THRESHOLDS.feltMinPerHalf) return null;
  const then = mostCommon(earlier);
  const now = mostCommon(later);
  return { month: localTime(earlier[0].at, timeZone).month, then: then === now ? null : then, now };
}

/** The band more than half of the tags fall in (≥ 3 tags); a half-and-half split says nothing. */
export function whenFor(tags: readonly StatsTagRow[], timeZone: string | null): PartWhen | null {
  if (tags.length < STATS_THRESHOLDS.whenMinTags) return null;
  const n = new Map<PartWhen, number>();
  for (const t of tags) {
    const b = whenBand(localTime(t.at, timeZone).hour);
    n.set(b, (n.get(b) ?? 0) + 1);
  }
  return PART_WHENS.find((b) => (n.get(b) ?? 0) * 2 > tags.length) ?? null;
}

/** One part's lines from its own tags and visits. */
export function partStats(tags: readonly StatsTagRow[], sessions: readonly StatsSessionRow[], timeZone: string | null): PartStats {
  return { helped: helpedFor(tags), felt: feltFor(sessions, timeZone), when: whenFor(tags, timeZone) };
}

export const hasLine = (s: PartStats): boolean => s.helped !== null || s.felt !== null || s.when !== null;

/**
 * Every active or resting part's stats, keyed by part id (parts below every threshold included, with
 * all-null stats): what getMe will attach to each part item. Rows for any other part are ignored.
 */
export function statsByPart(rows: StatsRows): Map<string, PartStats> {
  const out = new Map<string, PartStats>();
  if (!rows.partsOn) return out;
  const kept = rows.parts.filter((p) => p.status === 'active' || p.status === 'resting');
  for (const p of kept) {
    out.set(p.id, partStats(rows.tags.filter((t) => t.partId === p.id), rows.sessions.filter((s) => s.partId === p.id), rows.timeZone));
  }
  return out;
}

/** Reflect's parts section: null with parts off; else the parts with at least one line, in the rows' order. */
export function partsReflect(rows: StatsRows): PartReflect[] | null {
  if (!rows.partsOn) return null;
  const stats = statsByPart(rows);
  return rows.parts.flatMap((p) => {
    const s = stats.get(p.id);
    return s && hasLine(s) ? [{ id: p.id, name: p.name, firstPlace: p.firstPlace, shapeSig: p.shapeSig, stats: s }] : [];
  });
}
