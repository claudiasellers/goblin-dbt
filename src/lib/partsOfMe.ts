/**
 * Parts of me in Me (docs/design/parts.md, "Parts of me (Me)", "The part card"): which signed-off
 * prompts the area needs, what each card shows, the order, and the links into Meet a part. Pure.
 *
 * Card rules: no stats yet. A fear is never shown on a tender part (the conservative branch told the
 * person "we'll leave that be"), nor a fear chip flagged tender or danger on any part, and the person's
 * own-words fear is never shown at all (getMe doesn't send it). Option ids that aren't signed off, and place ids the figure doesn't know, are left out.
 */
import { REGIONS, isRegionId } from '../data/bodyFigure';
import type { PartsContent } from '../data/partsContentTypes';
import type { MeItem, MePart } from '../services/profile';
import { flowReady } from './partsContent';

/** Every line the area uses. It renders only when all are signed off. */
export const PARTS_OF_ME_PROMPTS = [
  'me_get_to_know', 'card_where', 'card_job', 'card_job_own', 'card_fear', 'card_rather', 'card_visit', 'card_resting',
] as const;
export type PartsOfMePromptId = (typeof PARTS_OF_ME_PROMPTS)[number];

/** The area's copy by id, or null while any of it is missing (Me then renders as before). */
export function partsOfMeCopy(content: PartsContent | null): Record<PartsOfMePromptId, string> | null {
  if (!content || !flowReady(content, PARTS_OF_ME_PROMPTS)) return null;
  return Object.fromEntries(PARTS_OF_ME_PROMPTS.map((id) => [id, content.prompts[id].copy])) as Record<PartsOfMePromptId, string>;
}

/** The card's rows, already labelled. `job` is the person's own words when they gave them, else chips. */
export interface PartCardRows {
  where: string[];
  job: { own: string } | { labels: string[] } | null;
  fears: string[];
  rather: string[];
}

function labels(content: PartsContent, step: string, ids: readonly string[], plainOnly = false): string[] {
  const byId = new Map((content.options.meet?.[step] ?? []).filter((o) => !plainOnly || o.flag === null).map((o) => [o.id, o.label]));
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}

export function partCardRows(part: MePart, content: PartsContent): PartCardRows {
  const jobs = labels(content, 'job', part.jobIds);
  const own = part.ownJob?.trim();
  return {
    where: part.places.filter(isRegionId).map((id) => REGIONS[id].label),
    job: own ? { own } : jobs.length ? { labels: jobs } : null,
    // A fear that sent Meet a part down its tender or danger branch is never echoed either.
    fears: part.tender ? [] : labels(content, 'fear', part.fearIds, true),
    rather: labels(content, 'rather', part.preferredRoleIds),
  };
}

/** Most recently visited first; never-visited ones after, newest kept first; then by id. */
export function sortPartItems(items: readonly MeItem[]): MeItem[] {
  const t = (v: string | null | undefined) => {
    const n = v ? Date.parse(v) : Number.NaN;
    return Number.isNaN(n) ? -Infinity : n;
  };
  return [...items].sort((a, b) =>
    t(b.part?.lastVisitedAt) - t(a.part?.lastVisitedAt) || t(b.meta.confirmedAt) - t(a.meta.confirmedAt)
    || (a.meta.id < b.meta.id ? -1 : a.meta.id > b.meta.id ? 1 : 0));
}

export interface MeetAPartLink {
  pathname: '/tool/meet-a-part';
  state: { parts: { trailheadKind: 'me'; partId?: string } };
}

/** "Get to know a part" (no partId) or "Spend time with it" (this part). */
export function meetAPartLink(partId?: string): MeetAPartLink {
  return { pathname: '/tool/meet-a-part', state: { parts: { trailheadKind: 'me', ...(partId ? { partId } : {}) } } };
}
