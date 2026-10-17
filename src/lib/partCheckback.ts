/**
 * The next-day check-back card (docs/design/parts.md, Meet a part step 10): which signed-off copy it
 * needs, and what it says. Every word comes from the shipped parts content; the card renders only
 * when all of it is there (`flowReady`), so nothing shows until Claudia signs the copy off. Pure.
 */
import type { PartsContent, PartsOption } from '../data/partsContentTypes';
import type { PartCheckbackAnswer } from '../data/partsTypes';
import type { TodayItem } from '../services/spine';
import { fillParts, promptCopy, stepOptions, surfaceReady, type SurfaceIds } from './partsContent';

export const PART_CHECKBACK_TYPE = 'part_checkback';

/** The question (named and unnamed), and Louder's aftercare line. */
export const CHECKBACK_PROMPTS = ['checkback_title', 'checkback_title_noname', 'aftercare_louder'] as const;
/** The four answers, then aftercare's body tools and Not now. */
export const CHECKBACK_OPTIONS = [
  'checkback_settled', 'checkback_same', 'checkback_louder', 'checkback_skip', 'louder_body', 'louder_not_now',
] as const;

/** Two pulls' week check-back: the same card and answers, with both names. */
export const TWO_PULLS_CHECKBACK_TYPE = 'two_pulls_checkback';
export const PARTS_CHECKBACK_TYPES: readonly string[] = [PART_CHECKBACK_TYPE, TWO_PULLS_CHECKBACK_TYPE];
/** Its question, with both names or without. */
export const CHECKBACK_TWO_PROMPTS = ['checkback_title_two', 'checkback_title_two_noname'] as const;
export const TWO_PULLS_CHECKBACK_REQUIRED: SurfaceIds = { prompts: [...CHECKBACK_PROMPTS, ...CHECKBACK_TWO_PROMPTS], options: CHECKBACK_OPTIONS };

/** What the card's gate requires (scripts/parts/review.mjs reads it). */
export const PART_CHECKBACK_REQUIRED: SurfaceIds = { prompts: CHECKBACK_PROMPTS, options: CHECKBACK_OPTIONS };

/** Option id → the answer answerPartCheckback takes. */
export const CHECKBACK_ANSWER_OF: Readonly<Record<string, PartCheckbackAnswer>> = {
  checkback_settled: 'settled', checkback_same: 'same', checkback_louder: 'louder', checkback_skip: 'skip',
};

export function checkbackReady(content: PartsContent | null): boolean {
  return !!content && surfaceReady(content, PART_CHECKBACK_REQUIRED);
}

/** The two-names card's gate: the card's own lines and its two-names question. */
export function twoCheckbackReady(content: PartsContent | null): boolean {
  return !!content && surfaceReady(content, TWO_PULLS_CHECKBACK_REQUIRED);
}

/**
 * Today without check-backs the card can't show (content not signed off, or parts off on this device).
 * `twoReady`: the two-names question ships too (Two pulls' check-back); without it that card is dropped.
 */
export function withReadyCheckbacks(items: TodayItem[], ready: boolean, twoReady = false): TodayItem[] {
  return items.filter((i) => (i.type === PART_CHECKBACK_TYPE ? ready : i.type === TWO_PULLS_CHECKBACK_TYPE ? ready && twoReady : true));
}

/** "How's {name} today?", or the unnamed wording when the part has no name. Never the part's tenderness. */
export function checkbackTitle(content: PartsContent, name: string | null | undefined): string {
  const n = name?.trim();
  return n ? fillParts(promptCopy(content, 'checkback_title') ?? '', { name: n }) : promptCopy(content, 'checkback_title_noname') ?? '';
}

/** "How are {A} and {B} today?", or the no-name wording when either has no name. */
export function checkbackTitleTwo(content: PartsContent, names: readonly (string | null | undefined)[]): string {
  const [a, b] = names.map((n) => n?.trim() || null);
  const tpl = promptCopy(content, 'checkback_title_two');
  if (a && b && tpl) return fillParts(tpl, { A: a, B: b });
  return promptCopy(content, 'checkback_title_two_noname') ?? '';
}

/** The card's question for either check-back. */
export function checkbackItemTitle(content: PartsContent, item: Pick<TodayItem, 'type' | 'part' | 'parts'>): string {
  if (item.type === TWO_PULLS_CHECKBACK_TYPE) return checkbackTitleTwo(content, (item.parts ?? []).map((p) => p.name));
  return checkbackTitle(content, item.part?.name);
}

/** The four answers, in content order, each with its answer id. */
export function checkbackChoices(content: PartsContent): Array<PartsOption & { answer: PartCheckbackAnswer }> {
  return stepOptions(content, 'checkback', 'checkback')
    .filter((o) => CHECKBACK_ANSWER_OF[o.id])
    .map((o) => ({ ...o, answer: CHECKBACK_ANSWER_OF[o.id] }));
}

/** After Louder: the line, then "Something for my body" (the too-much list) and "Not now". */
export function louderAftercare(content: PartsContent): { line: string; body: PartsOption | null; notNow: PartsOption | null } {
  const opts = stepOptions(content, 'aftercare', 'louder');
  return {
    line: promptCopy(content, 'aftercare_louder') ?? '',
    body: opts.find((o) => o.id === 'louder_body') ?? null,
    notNow: opts.find((o) => o.id === 'louder_not_now') ?? null,
  };
}
