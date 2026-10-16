/**
 * Episodes (parts.md, "Discovery: trails → Episodes"), pure. Records within
 * `PartsPolicy.episodeMergeHours` of an episode's FIRST record are one moment (a check-in → Find the
 * feeling → Recover hand-off); anchoring on the first record means a busy day can't chain into one
 * episode. Contexts: the first non-null value per key in time order; a later record that disagrees is
 * counted in `conflicts` (kept episodes only) and never guessed. `timeBand` comes from the first record in `User.timeZone`
 * (stats.ts's bands). A record with no moves still merges (its context can fill an episode); an episode
 * whose union has no moves is dropped at the end.
 */
import { localTime, whenBand } from '../stats';
import type { PartWhen } from '../statsTypes';
import type { Episode, EpisodeBuild, TrailPolicy, TrailRecord, TrailTimeBand } from './types';

const HOUR = 3_600_000;

/** stats.ts's plural bands → the TrailContext timeBand values. */
export const TIME_BANDS: Record<PartWhen, TrailTimeBand> = {
  mornings: 'morning', afternoons: 'afternoon', evenings: 'evening', nights: 'night',
};

export function timeBandOf(iso: string, timeZone: string | null): TrailTimeBand {
  return TIME_BANDS[whenBand(localTime(iso, timeZone).hour)];
}

const pushNew = <T>(list: T[], v: T): void => { if (!list.includes(v)) list.push(v); };

export function buildEpisodes(
  records: readonly TrailRecord[], policy: Pick<TrailPolicy, 'episodeMergeHours'>, timeZone: string | null,
): EpisodeBuild {
  const sorted = records
    .filter((r) => !Number.isNaN(Date.parse(r.at)))
    .slice()
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const groups: TrailRecord[][] = [];
  for (const r of sorted) {
    const cur = groups[groups.length - 1];
    if (cur && Date.parse(r.at) - Date.parse(cur[0].at) <= policy.episodeMergeHours * HOUR) cur.push(r);
    else groups.push([r]);
  }
  let conflicts = 0;
  const episodes: Episode[] = [];
  for (const g of groups) {
    const moveIds: string[] = [];
    const toolIds: string[] = [];
    const moveToolIds: Record<string, string[]> = {};
    const recordKeys: string[] = [];
    const taggedPartIds: string[] = [];
    const sources: TrailRecord['sources'] = [];
    const contexts: { trigger?: string; event?: string } = {};
    let disagreed = 0;
    for (const r of g) {
      for (const m of r.moveIds) {
        pushNew(moveIds, m);
        pushNew((moveToolIds[m] ??= []), r.toolId);
      }
      pushNew(toolIds, r.toolId);
      pushNew(recordKeys, r.key);
      for (const p of r.taggedPartIds) pushNew(taggedPartIds, p);
      for (const s of r.sources) if (!sources.some((x) => x.label === s.label && x.id === s.id)) sources.push({ ...s });
      for (const k of ['trigger', 'event'] as const) {
        const v = r.contexts[k];
        if (v == null) continue;
        if (contexts[k] == null) contexts[k] = v;
        else if (contexts[k] !== v) disagreed += 1;
      }
    }
    if (!moveIds.length) continue;
    conflicts += disagreed;
    episodes.push({
      at: g[0].at, endAt: g[g.length - 1].at, moveIds: moveIds.sort(),
      contexts: { ...contexts, timeBand: timeBandOf(g[0].at, timeZone) },
      toolIds, moveToolIds, recordKeys, taggedPartIds: taggedPartIds.sort(), sources,
    });
  }
  return { episodes, conflicts };
}
