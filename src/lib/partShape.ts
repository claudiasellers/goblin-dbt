/**
 * "Use this shape for {name}?" (docs/design/parts.md, Find the feeling's over-weeks column): in the tag
 * row, right after a part chip is tapped, when the host is Find the feeling and the visit made a shape
 * (Shape it). A yes gives the part that shape (setPartShape: the server reads it from the visit's own
 * record, never from here); No thanks folds the row as before. Pure. All words come from the shipped
 * parts content; a part's own name is the person's.
 */
import type { PartsContent } from '../data/partsContentTypes';
import { fill } from './invalidationRecovery';
import { surfaceReady, type SurfaceIds } from './partsContent';
import type { TagChip } from './partTag';

export const SHAPE_PROMPTS = ['tag_use_shape', 'tag_use_shape_noname', 'tag_shape_done'] as const;
export const SHAPE_OPTIONS = ['tag_shape_yes', 'tag_shape_no'] as const;
/** What the offer requires (scripts/parts/review.mjs lists it under the tag row). */
export const TAG_SHAPE_REQUIRED: SurfaceIds = { prompts: SHAPE_PROMPTS, options: SHAPE_OPTIONS };

/** The hosts whose visit can make a shape: Find the feeling only (the server's SHAPE_TOOLS). */
export const SHAPE_HOSTS = ['find-the-feeling'] as const;

/** How long "Done." stays in place before the row folds away. */
export const SHAPE_DONE_MS = 1800;

/**
 * Whether a Find the feeling visit made a shape: Shape it's vector, moved from neutral (all zero is no
 * shape, as the server and Meet a part's keep read it). A Tune it visit has none.
 */
export function visitHasShape(found: { way: string; vec: readonly number[] } | null | undefined): boolean {
  return !!found && found.way === 'shape' && found.vec.length === 5 && found.vec.some((n) => n !== 0);
}

/** The offer's gate: parts on, a shape host whose visit made a shape, and every line shipped. */
export function shapeOfferReady(g: { partsOn: boolean; toolId: string; hasShape: boolean; content: PartsContent | null }): boolean {
  return g.partsOn && (SHAPE_HOSTS as readonly string[]).includes(g.toolId) && g.hasShape
    && !!g.content && surfaceReady(g.content, TAG_SHAPE_REQUIRED);
}

export interface ShapeOfferCopy { ask: string; yes: string; no: string; done: string }

const option = (content: PartsContent, id: string) => (content.options.tag?.shape ?? []).find((o) => o.id === id)?.label ?? '';

/** The offer for the chip just tapped: its name when it has one, else "that part". */
export function shapeOfferCopy(content: PartsContent, chip: Pick<TagChip, 'label' | 'named'>): ShapeOfferCopy {
  const named = chip.named && chip.label.trim().length > 0;
  return {
    ask: named ? fill(content.prompts.tag_use_shape?.copy ?? '', { name: chip.label.trim() }) : content.prompts.tag_use_shape_noname?.copy ?? '',
    yes: option(content, 'tag_shape_yes'),
    no: option(content, 'tag_shape_no'),
    done: content.prompts.tag_shape_done?.copy ?? '',
  };
}
