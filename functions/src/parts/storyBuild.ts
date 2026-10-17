/**
 * A part's story, built (pure): rows in (story.ts reads them), the story out. Month granularity only, in
 * the person's time zone (stats.ts `localTime`); no date leaves here. Every line only when its data
 * exists; a tender part's story never carries a job (the relationship lines only: met, rested and back,
 * how they've felt toward it, what's helped, where it stands).
 *
 * Rested and back come from what was recorded: the den's snapshots (taken when a part is rested, woken,
 * kept or given a new job: its status that day) and the still-true answers. A rename isn't stored with a
 * date, so the story has no "Named … in …" line.
 */
import type { PartStats } from './statsTypes';
import { localTime } from './stats';
import { parseDenLayout } from './denSnapshot';
import type { DenLink, DenPart } from './denTypes';
import type { GetPartStoryResponse, PartStoryJob, PartStoryLink, PartStoryMoment, PartStoryRooms } from './storyTypes';

export interface StoryPartRow {
  id: string;
  createdAt: string | null;
  tender: boolean;
  status: 'active' | 'resting';
  jobIds: string[];
  ownJob: string | null;
  jobHistoryJson: string | null;
}

export interface StoryRows {
  timeZone: string | null;
  part: StoryPartRow;
  /** The part's still-true answers (PartRevisit), any order. */
  revisits: Array<{ at: string; answer: string }>;
  /** The caller's den snapshots, any order. */
  snapshots: Array<{ takenAt: string; layoutJson: string | null }>;
  /** The room now (the den slice): its parts and confirmed links. */
  room: { parts: Array<Omit<DenPart, 'recency'>>; links: DenLink[] };
  /** This part's readout (stats.ts), or null. */
  stats: PartStats | null;
}

const ms = (iso: string | null | undefined): number => (iso ? Date.parse(iso) : Number.NaN);

/** A still-true answer → the status it leaves the part in (the active answers keep it active). */
export function revisitStatus(answer: string): 'active' | 'resting' | null {
  if (answer === 'resting' || answer === 'still_quiet') return 'resting';
  if (answer === 'back' || answer === 'same' || answer === 'less' || answer === 'new') return 'active';
  return null;
}

function jobHistory(json: string | null): Array<PartStoryJob & { until: string }> {
  if (!json) return [];
  try {
    const a = JSON.parse(json) as unknown;
    if (!Array.isArray(a)) return [];
    return a.flatMap((x) => {
      if (!x || typeof x !== 'object') return [];
      const o = x as Record<string, unknown>;
      const jobIds = Array.isArray(o.jobIds) ? o.jobIds.filter((v): v is string => typeof v === 'string') : [];
      const ownJob = typeof o.ownJob === 'string' && o.ownJob.trim() ? o.ownJob : null;
      if (typeof o.until !== 'string' || (jobIds.length === 0 && !ownJob)) return [];
      return [{ jobIds, ownJob, until: o.until }];
    });
  } catch {
    return [];
  }
}

/**
 * Rested and back, in time order: the part's status through its snapshots and still-true answers,
 * starting active when it was kept; a line each time it changes.
 */
export function restMoments(rows: Pick<StoryRows, 'part' | 'revisits' | 'snapshots'>): Array<{ kind: 'rested' | 'back'; at: number }> {
  const id = rows.part.id;
  const kept = ms(rows.part.createdAt);
  const seen: Array<{ at: number; status: 'active' | 'resting' }> = [];
  for (const s of rows.snapshots) {
    const p = parseDenLayout(s.layoutJson).find((x) => x.id === id);
    if (p) seen.push({ at: ms(s.takenAt), status: p.status });
  }
  for (const r of rows.revisits) {
    const status = revisitStatus(r.answer);
    if (status) seen.push({ at: ms(r.at), status });
  }
  const out: Array<{ kind: 'rested' | 'back'; at: number }> = [];
  let cur: 'active' | 'resting' = 'active';
  for (const e of seen.filter((x) => Number.isFinite(x.at) && !(x.at < kept)).sort((a, b) => a.at - b.at)) {
    if (e.status !== cur) out.push({ kind: e.status === 'resting' ? 'rested' : 'back', at: e.at });
    cur = e.status;
  }
  return out;
}

/** The part's den links in words' terms: front / behind (covers_for, `aId` in front), pulls (two_pulls). */
export function storyLinks(id: string, room: StoryRows['room']): PartStoryLink[] {
  const names = new Map(room.parts.map((p) => [p.id, p.name]));
  return room.links.flatMap((l) => {
    if (l.aId !== id && l.bId !== id) return [];
    const otherId = l.aId === id ? l.bId : l.aId;
    if (!names.has(otherId)) return [];
    const role = l.kind === 'two_pulls' ? 'pulls' as const : l.aId === id ? 'front' as const : 'behind' as const;
    return [{ role, otherId, otherName: names.get(otherId) ?? null }];
  });
}

/** The earliest month before this one whose snapshot holds the part (that month's latest layout), beside today's room. */
export function storyRooms(rows: Pick<StoryRows, 'part' | 'snapshots' | 'room' | 'timeZone'>, now: Date): PartStoryRooms | undefined {
  const thisMonth = localTime(now.toISOString(), rows.timeZone).month;
  if (!rows.room.parts.some((p) => p.id === rows.part.id)) return undefined;
  const byMonth = new Map<string, { at: number; layout: ReturnType<typeof parseDenLayout> }>();
  for (const s of rows.snapshots) {
    const at = ms(s.takenAt);
    if (!Number.isFinite(at)) continue;
    const month = localTime(s.takenAt, rows.timeZone).month;
    if (month >= thisMonth) continue;
    const layout = parseDenLayout(s.layoutJson);
    if (!layout.some((p) => p.id === rows.part.id)) continue;
    const prev = byMonth.get(month);
    if (!prev || at > prev.at) byMonth.set(month, { at, layout });
  }
  const thenMonth = [...byMonth.keys()].sort()[0];
  if (!thenMonth) return undefined;
  return {
    thenMonth,
    then: byMonth.get(thenMonth)!.layout,
    now: rows.room.parts.map((p) => ({
      id: p.id, name: p.name, status: p.status, tender: p.tender, shapeSig: p.shapeSig, mapX: p.mapX, mapY: p.mapY,
    })),
    links: rows.room.links.map((l) => ({ id: l.id, kind: l.kind, aId: l.aId, bId: l.bId, bothWantId: l.bothWantId })),
  };
}

/** The story. */
export function buildPartStory(rows: StoryRows, now: Date): GetPartStoryResponse {
  const tz = rows.timeZone;
  const month = (at: number) => localTime(new Date(at).toISOString(), tz).month;
  const timed: Array<{ at: number; order: number; m: PartStoryMoment }> = [];
  const kept = ms(rows.part.createdAt);
  if (Number.isFinite(kept)) timed.push({ at: kept, order: 0, m: { kind: 'met', month: month(kept) } });
  for (const r of restMoments(rows)) timed.push({ at: r.at, order: 1, m: { kind: r.kind, month: month(r.at) } });

  // Its job, then and now: the first job it had and today's, dated when it took up today's. Never tender.
  const past = jobHistory(rows.part.jobHistoryJson);
  const nowJob: PartStoryJob = { jobIds: rows.part.jobIds, ownJob: rows.part.ownJob?.trim() ? rows.part.ownJob : null };
  const changed = ms(past[past.length - 1]?.until);
  if (!rows.part.tender && past.length > 0 && (nowJob.jobIds.length > 0 || nowJob.ownJob) && Number.isFinite(changed)) {
    const first = past[0];
    timed.push({ at: changed, order: 2, m: { kind: 'job', month: month(changed), then: { jobIds: first.jobIds, ownJob: first.ownJob }, now: nowJob } });
  }
  timed.sort((a, b) => a.at - b.at || a.order - b.order);

  const out: GetPartStoryResponse = {
    moments: timed.map((t) => t.m),
    helped: rows.stats?.helped ?? [],
    steps: rows.stats?.steps ?? [],
    links: storyLinks(rows.part.id, rows.room),
  };
  if (rows.stats?.felt) out.felt = rows.stats.felt;
  const rooms = storyRooms(rows, now);
  if (rooms) out.rooms = rooms;
  return out;
}
