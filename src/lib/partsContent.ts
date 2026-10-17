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

/* ───────── filling a line's slots ───────── */

/**
 * Where a slot opens a sentence: the start of the line, or after ". ", "? " or "! " (a line break too).
 */
export const opensSentence = (before: string): boolean => /(^|[.?!]\s+|\n)\s*$/.test(before);

/**
 * The first letter upper-cased when it is a lower-case letter; an emoji, a digit or a capital is left as
 * is. Render only: a stored name is never changed.
 */
export const capFirst = (s: string): string => s.replace(/^\p{Ll}/u, (c) => c.toLocaleUpperCase());

/** A filled line in pieces: plain text, or a slot's value (`slot` names it, so a screen can set it apart). */
export interface SlotSegment { text: string; slot?: string }

/**
 * Every parts line's slots ({name}, {A}, {B}, {move}, …) filled for display, in one place: each value as
 * written (a function replacement, so `$&` stays literal), except that a value opening a sentence takes a
 * capital first letter ("the one who chases and …" → "The one who chases and …"). A slot with no value is
 * left as written, or makes the line null with `strict`.
 */
export function fillPartsSegments(template: string, slots: Readonly<Record<string, string | null | undefined>>, o: { strict?: boolean } = {}): SlotSegment[] | null {
  const out: SlotSegment[] = [];
  let text = '';
  let at = 0;
  for (const m of template.matchAll(/\{(\w+)\}/g)) {
    const lit = template.slice(at, m.index);
    if (lit) out.push({ text: lit });
    text += lit;
    at = (m.index ?? 0) + m[0].length;
    const v = slots[m[1]];
    if (v === undefined || v === null || v === '') {
      if (o.strict) return null;
      out.push({ text: m[0] });
      text += m[0];
      continue;
    }
    const shown = opensSentence(text) ? capFirst(v) : v;
    out.push({ text: shown, slot: m[1] });
    text += shown;
  }
  const rest = template.slice(at);
  if (rest) out.push({ text: rest });
  return out;
}

/** fillPartsSegments as one string (null only with `strict` and a slot missing). */
export function fillPartsLine(template: string, slots: Readonly<Record<string, string | null | undefined>>, o: { strict?: boolean } = {}): string | null {
  const segs = fillPartsSegments(template, slots, o);
  return segs ? segs.map((s) => s.text).join('') : null;
}

/** fillPartsLine for a slot set that is always complete (unknown slots stay as written): never null. */
export const fillParts = (template: string, slots: Readonly<Record<string, string | null | undefined>>): string =>
  fillPartsLine(template, slots) ?? template;
