/**
 * The next-day check-back card (docs/design/parts.md, Meet a part step 10): which signed-off copy it
 * needs, and what it says. Every word comes from the shipped parts content; the card renders only
 * when all of it is there (`flowReady`), so nothing shows until Claudia signs the copy off. Pure.
 */
import type { PartsContent, PartsOption } from '../data/partsContentTypes';
import type { PartCheckbackAnswer } from '../data/partsTypes';
import type { TodayItem } from '../services/spine';
import { flowReady, promptCopy, stepOptions } from './partsContent';

export const PART_CHECKBACK_TYPE = 'part_checkback';

/** The question (named and unnamed), and Louder's aftercare line. */
export const CHECKBACK_PROMPTS = ['checkback_title', 'checkback_title_noname', 'aftercare_louder'] as const;
/** The four answers, then aftercare's body tools and Not now. */
export const CHECKBACK_OPTIONS = [
  'checkback_settled', 'checkback_same', 'checkback_louder', 'checkback_skip', 'louder_body', 'louder_not_now',
] as const;

/** Option id → the answer answerPartCheckback takes. */
export const CHECKBACK_ANSWER_OF: Readonly<Record<string, PartCheckbackAnswer>> = {
  checkback_settled: 'settled', checkback_same: 'same', checkback_louder: 'louder', checkback_skip: 'skip',
};

export function checkbackReady(content: PartsContent | null): boolean {
  return !!content && flowReady(content, CHECKBACK_PROMPTS, CHECKBACK_OPTIONS);
}

/** Today without check-backs the card can't show (content not signed off, or parts off on this device). */
export function withReadyCheckbacks(items: TodayItem[], ready: boolean): TodayItem[] {
  return ready ? items : items.filter((i) => i.type !== PART_CHECKBACK_TYPE);
}

/** "How's {name} today?", or the unnamed wording when the part has no name. Never the part's tenderness. */
export function checkbackTitle(content: PartsContent, name: string | null | undefined): string {
  const n = name?.trim();
  return n ? (promptCopy(content, 'checkback_title') ?? '').replace('{name}', n) : promptCopy(content, 'checkback_title_noname') ?? '';
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
