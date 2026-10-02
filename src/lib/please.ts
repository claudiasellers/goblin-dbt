/**
 * PLEASE ("Running low") flow logic. Pure: every input is the graph's flow document plus what the
 * user tapped. The content itself (factors, options, copy) comes from getPleaseContent.
 */
import type { PleaseArea, PleaseCheck, PleaseContent, PleaseFactor, PleaseOption } from '../data/pleaseTypes';

/** How many factor-derived options a step offers before the always-offered ones. */
export const OPTION_CAP = 5;

/** Areas in acronym order, except that the first emotion word with a hint puts its area first. */
export function orderAreas(content: PleaseContent, emotionIds: readonly string[] = []): PleaseArea[] {
  const first = emotionIds.map((id) => content.areaFirst[id]).find(Boolean);
  if (!first) return content.areas;
  return [...content.areas.filter((a) => a.id === first), ...content.areas.filter((a) => a.id !== first)];
}

/** The factors of one area, in content order. */
export function factorsIn(content: PleaseContent, areaId: string): PleaseFactor[] {
  return content.factors.filter((f) => f.area === areaId);
}

function pick(
  content: PleaseContent, factorIds: readonly string[], key: 'now' | 'later',
  pool: PleaseOption[], always: readonly string[],
): PleaseOption[] {
  const byId = new Map(pool.map((o) => [o.id, o]));
  const chosen = content.factors.filter((f) => factorIds.includes(f.id));
  // Round-robin over the picked factors so each one's best option comes before anyone's second.
  const ordered: string[] = [];
  const depth = Math.max(0, ...chosen.map((f) => f[key].length));
  for (let i = 0; i < depth; i++) for (const f of chosen) if (f[key][i]) ordered.push(f[key][i]);
  // A factor that lists an always-offered option keeps it at the factor's rank; the cap counts only
  // the others, and the always-offered ones not yet placed go last.
  const seen = new Set<string>();
  const out: PleaseOption[] = [];
  let capped = 0;
  for (const id of ordered) {
    if (seen.has(id) || !byId.has(id)) continue;
    const isAlways = always.includes(id);
    if (!isAlways && capped >= OPTION_CAP) continue;
    if (!isAlways) capped++;
    seen.add(id);
    out.push(byId.get(id)!);
  }
  for (const id of always) if (byId.has(id) && !seen.has(id)) { seen.add(id); out.push(byId.get(id)!); }
  return out;
}

/** Right-now options for the picked factors (each factor's best first), then the always-offered ones. */
export function nowOptions(content: PleaseContent, factorIds: readonly string[]): PleaseOption[] {
  return pick(content, factorIds, 'now', content.now, content.nowAlways);
}

/** Protect-tomorrow options for the picked factors, then the always-offered ones. */
export function laterOptions(content: PleaseContent, factorIds: readonly string[]): PleaseOption[] {
  return pick(content, factorIds, 'later', content.later, content.laterAlways);
}

/**
 * Check the facts: 'feeling' when any picked statement points at an emotion that looks like
 * tiredness (rest doesn't restore, it came after something, it lifts with activity), else 'body'.
 * Nothing picked reads as 'body': the user goes on looking after the basics.
 */
export function checkVerdict(checks: readonly PleaseCheck[], picked: readonly string[]): 'body' | 'feeling' {
  return checks.some((c) => picked.includes(c.id) && c.points === 'feeling') ? 'feeling' : 'body';
}

/** Toggle an id in a multi-select, keeping at most `max` (the oldest pick drops off). */
export function toggle(list: readonly string[], id: string, max = Infinity): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id);
  const next = [...list, id];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** Plain-text own entry: trimmed, collapsed, capped; '' when empty. Never stored. */
export function ownText(raw: string, max = 140): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, max);
}
