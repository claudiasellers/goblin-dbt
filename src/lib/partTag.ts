/**
 * "Was this a part you know?" (docs/design/parts.md, "the stronger signal"; component:
 * src/components/spine/PartTagRow.tsx, rendered by SessionClose). Pure: when the row shows, its copy
 * and its chips. All words come from the shipped parts content; a part's own name is the person's.
 */
import type { PartsContent } from '../data/partsContentTypes';
import type { ProfileSlices } from '../data/profileTypes';
import type { ThenVsNow } from '../data/capacityTypes';
import { REGIONS, type RegionId } from '../data/bodyFigure';
import { fill } from './invalidationRecovery';
import { flowReady } from './partsContent';

export const TAG_PROMPTS = ['tag_question', 'tag_new_later'] as const;
export const TAG_OPTIONS = ['tag_new_one', 'tag_skip', 'tag_later_yes', 'tag_later_no'] as const;
/** A kept part with no name (flow `common`, step `name`): for every surface that lists parts. */
export const UNNAMED_PROMPTS = ['part_unnamed_place', 'part_unnamed'] as const;

/**
 * The tools whose close can show the row: SessionClose asks then-vs-now there (orienting or
 * regulation down), and the tool isn't Meet a part. Help now, micro-steps and guided activities close
 * with no question. Each declares `parts` in PROFILE_NEEDS (tests/part-tag.test.mjs keeps them equal).
 */
export const TAG_ROW_TOOLS = ['five-senses'] as const;
export type TagRowTool = (typeof TAG_ROW_TOOLS)[number];

/** The closes that count as "it helped" (the server refuses any other: functions/src/parts/tag.ts). */
export const TAG_CLOSES: readonly ThenVsNow[] = ['better', 'much_better'];

/** At most this many parts, most recently visited first (the `parts` slice's order). */
export const MAX_TAG_CHIPS = 4;

export const isTagRowTool = (toolId: string): toolId is TagRowTool => (TAG_ROW_TOOLS as readonly string[]).includes(toolId);

/**
 * Everything but the person's parts, which are read only once this is true: parts on, the close saved
 * with better or much better, a tool that can show the row, and every line of it shipped.
 */
export function tagRowGate(g: {
  partsOn: boolean; toolId: string; thenVsNow: ThenVsNow | null | undefined; saved: boolean; content: PartsContent | null;
}): boolean {
  return g.partsOn && g.saved && isTagRowTool(g.toolId) && !!g.thenVsNow && TAG_CLOSES.includes(g.thenVsNow)
    && !!g.content && flowReady(g.content, [...TAG_PROMPTS, ...UNNAMED_PROMPTS], [...TAG_OPTIONS]);
}

export interface TagRowCopy { question: string; newOne: string; skip: string; later: string; yes: string; no: string }

const option = (content: PartsContent, id: string) =>
  Object.values(content.options.tag ?? {}).flat().find((o) => o.id === id)?.label ?? '';

export function tagRowCopy(content: PartsContent): TagRowCopy {
  return {
    question: content.prompts.tag_question?.copy ?? '',
    later: content.prompts.tag_new_later?.copy ?? '',
    newOne: option(content, 'tag_new_one'),
    skip: option(content, 'tag_skip'),
    yes: option(content, 'tag_later_yes'),
    no: option(content, 'tag_later_no'),
  };
}

type SlicePart = Pick<ProfileSlices['parts'][number], 'id' | 'name' | 'status' | 'firstPlace'>;

/** A part's chip: its own name, else "The one in your {place}" (first place), else "One you haven't named". */
export function partChipLabel(part: SlicePart, content: Pick<PartsContent, 'prompts'>): string {
  const name = part.name?.trim();
  if (name) return name;
  const region = part.firstPlace ? REGIONS[part.firstPlace as RegionId] : undefined;
  const placed = content.prompts.part_unnamed_place?.copy;
  if (region && placed) return fill(placed, { place: region.label.toLowerCase() });
  return content.prompts.part_unnamed?.copy ?? '';
}

export interface TagChip { id: string; label: string; named: boolean }

/** Up to four active or resting parts, in the slice's order (most recently visited first). */
export function tagChips(parts: readonly SlicePart[], content: Pick<PartsContent, 'prompts'>): TagChip[] {
  return parts
    .filter((p) => p.status === 'active' || p.status === 'resting')
    .slice(0, MAX_TAG_CHIPS)
    .map((p) => ({ id: p.id, label: partChipLabel(p, content), named: Boolean(p.name?.trim()) }))
    .filter((c) => c.label.length > 0);
}
