/**
 * A part's story in words (docs/design/parts.md, "The part card" and "The den"): on its card in Parts of
 * me (*Its story*) and from one figure in the den. Pure: the server sends months, ids and the readout's
 * counts (functions/src/parts/storyBuild.ts); every word comes from the shipped parts copy (flow `story`,
 * and the readout's own lines, common/stats), tool names from src/data/tools.ts.
 *
 * The readout's lines (felt, helped, steps) come from the same fields and words as the card's.
 * Rules: oldest first; a line only when its data and its words exist (never half-filled); no number but
 * the readout's own counts; never a fear; a tender part's story has no job (and no job chip flagged
 * tender or danger is ever named, on any part).
 */
import type { PartsContent } from '../data/partsContentTypes';
import type { GetPartStoryResponse, PartStoryJob, PartStoryRooms } from '../data/partsTypes';
import { fill } from './invalidationRecovery';
import { capFirst, fillParts, opensSentence, surfaceReady, type SurfaceIds } from './partsContent';
import { STATS_REQUIRED, partStatLines } from './partStats';
import { saidWords, sayStoryLine } from './sayToPart';

export const PART_STORY_PROMPTS = [
  'story_open', 'story_spend_time', 'story_met', 'story_job_then', 'story_job_now', 'story_rested', 'story_back',
  'story_where', 'story_front', 'story_behind', 'story_pulls', 'story_other', 'story_room_then', 'story_room_now',
] as const;
export type PartStoryPromptId = (typeof PART_STORY_PROMPTS)[number];
/** The story's own lines plus the readout's (how they've felt toward it, what's helped): scripts/parts/review.mjs reads it. */
export const PART_STORY_REQUIRED: SurfaceIds = {
  prompts: [...PART_STORY_PROMPTS, ...STATS_REQUIRED.prompts],
  options: STATS_REQUIRED.options,
};
export type PartStoryCopy = Record<PartStoryPromptId, string>;

/** The story's copy, or null while any line of it is missing (no *Its story* anywhere). */
export function partStoryCopy(content: PartsContent | null): PartStoryCopy | null {
  if (!content || !surfaceReady(content, PART_STORY_REQUIRED)) return null;
  return Object.fromEntries(PART_STORY_PROMPTS.map((id) => [id, content.prompts[id].copy])) as PartStoryCopy;
}

/** One line. A job line keeps its words apart so the card's serif can set them (own words or chip labels). */
export type StoryLine =
  | { kind: 'text'; key: string; text: string }
  | { kind: 'job'; key: string; before: string; words: string; after: string; own: boolean };

/** `title` null: a line that names itself (Steps that helped: …). */
export interface StorySection { key: 'felt' | 'helped' | 'steps' | 'where'; title: string | null; lines: string[] }

export interface StoryView {
  /** Met, rested, back, its job then and now: oldest first. */
  lines: StoryLine[];
  /** How you've felt toward it, what's helped it settle, where it stands: each only with a line. */
  sections: StorySection[];
  /** An earlier month's room beside today's, labelled. */
  rooms: (PartStoryRooms & { thenLabel: string; nowLabel: string }) | null;
}

/** A job as the card names it: the person's own words, else the signed-off chip labels (job or rather), none flagged. */
export function jobWords(content: PartsContent, job: PartStoryJob): { words: string; own: boolean } | null {
  const own = job.ownJob?.trim();
  if (own) return { words: own, own: true };
  const meet = content.options.meet ?? {};
  const byId = new Map([...(meet.job ?? []), ...(meet.rather ?? [])].filter((o) => o.flag === null).map((o) => [o.id, o.label]));
  const labels = job.jobIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  return labels.length ? { words: labels.join(', '), own: false } : null;
}

function jobLine(key: string, template: string, slot: string, w: { words: string; own: boolean }): StoryLine {
  const [before, after = ''] = template.split(`{${slot}}`);
  // Words that open a sentence take a capital at render time (shared rule, partsContent.ts).
  return { kind: 'job', key, before, words: opensSentence(before) ? capFirst(w.words) : w.words, after, own: w.own };
}

export function storyView(story: GetPartStoryResponse, content: PartsContent, copy: PartStoryCopy, deps: {
  toolName: (toolId: string) => string | null;
  monthName: (month: string) => string;
}, tender: boolean): StoryView {
  const lines: StoryLine[] = [];
  story.moments.forEach((m, i) => {
    if (m.kind === 'job') {
      if (tender) return;
      const then = jobWords(content, m.then);
      const now = jobWords(content, m.now);
      if (!then || !now || then.words === now.words) return;
      lines.push(jobLine(`job-then-${i}`, copy.story_job_then, 'old', then), jobLine(`job-now-${i}`, copy.story_job_now, 'new', now));
      return;
    }
    if (m.kind === 'told') {
      // "In {month} you told it: …": only once its own line ships (the story never waits on it).
      const template = sayStoryLine(content);
      const w = saidWords(content, m);
      const month = deps.monthName(m.month);
      if (!template || !w || !month) return;
      lines.push(jobLine(`told-${i}`, fill(template, { month }), 'said', w));
      return;
    }
    const month = deps.monthName(m.month);
    if (!month) return;
    const template = m.kind === 'met' ? copy.story_met : m.kind === 'rested' ? copy.story_rested : copy.story_back;
    lines.push({ kind: 'text', key: `${m.kind}-${i}`, text: fill(template, { month }) });
  });

  const stat = partStatLines({
    helped: story.helped.length ? story.helped : null, felt: story.felt ?? null, when: null,
    // `?? []`: a story from a server before the steps shipped has no field.
    steps: story.steps?.length ? story.steps : null,
  }, content, deps);
  const sections: StorySection[] = [];
  if (stat.felt) sections.push({ key: 'felt', title: stat.felt.title, lines: [stat.felt.line] });
  if (stat.helped) sections.push({ key: 'helped', title: stat.helped.title, lines: stat.helped.lines });
  // Steps that helped, after what's helped it settle, as the card has it.
  if (stat.steps) sections.push({ key: 'steps', title: null, lines: [stat.steps] });
  const where = story.links.map((l) => {
    const name = l.otherName ?? copy.story_other;
    return fillParts(l.role === 'front' ? copy.story_front : l.role === 'behind' ? copy.story_behind : copy.story_pulls, { name });
  });
  if (where.length) sections.push({ key: 'where', title: copy.story_where, lines: where });

  const thenMonth = story.rooms ? deps.monthName(story.rooms.thenMonth) : '';
  const rooms = story.rooms && thenMonth
    ? { ...story.rooms, thenLabel: fill(copy.story_room_then, { month: thenMonth }), nowLabel: copy.story_room_now }
    : null;
  return { lines, sections, rooms };
}
