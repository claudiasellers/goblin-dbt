/**
 * Reading the shipped parts copy (src/data/content/parts.json). Only signed-off rows are in it, so a
 * prompt or option can be missing while the rest of its flow is there: a host asks `flowReady` for every
 * id its screens use and shows nothing of the flow until they are all present. Nothing renders half a flow.
 * Pure.
 */
import type { PartsContent, PartsOption } from '../data/partsContentTypes';

/** A prompt's copy, or null when it isn't signed off. */
export function promptCopy(content: PartsContent, id: string): string | null {
  return content.prompts[id]?.copy ?? null;
}

/** The signed-off options at a flow's step, in order (empty when none are). */
export function stepOptions(content: PartsContent, flow: string, step: string): PartsOption[] {
  return [...(content.options[flow]?.[step] ?? [])].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * The ids one surface's gate requires: every surface exports its own (e.g. `MEET_REQUIRED`, `angryRequired`)
 * and its gate checks exactly that with `surfaceReady`, so scripts/parts/review.mjs (the sign-off pack)
 * lists what the code needs and can't drift from it.
 */
export interface SurfaceIds { prompts: readonly string[]; options: readonly string[] }

/** A surface's gate: every id it requires is in the shipped content. */
export const surfaceReady = (content: PartsContent, ids: SurfaceIds): boolean => flowReady(content, ids.prompts, ids.options);

/** True only when every listed prompt and option is in the content. */
export function flowReady(content: PartsContent, promptIds: readonly string[], optionIds: readonly string[] = []): boolean {
  if (!promptIds.every((id) => content.prompts[id] !== undefined)) return false;
  const options = new Set(Object.values(content.options).flatMap((steps) => Object.values(steps).flat().map((o) => o.id)));
  return optionIds.every((id) => options.has(id));
}
