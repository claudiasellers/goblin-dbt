/**
 * Reflect's trails (docs/design/parts.md, Rules → rule D; The offer card's "It's how things go"): rule D's
 * batch ("Was this {name}?", a block per part, a row per moment with Yes · No · Not sure, then Done / Not
 * now) and the trails kept as plain patterns (no parts language, × to remove). Which signed-off copy each
 * needs, the statement, the rows and the request. Every word is shipped parts content or signed-off graph
 * content the server resolved (the rule's template, the statements' phrases, the rows' context phrases
 * and source labels); tool names come from src/data/tools.ts by id; the part's own name as they kept it.
 * Nothing else the person wrote appears. Each renders only when all of its copy is there (`surfaceReady`),
 * and the server sends no block while offers, the rule or the gate are closed. Pure.
 */
import type { PartsContent } from '../data/partsContentTypes';
import type {
  AnswerKnownPartReviewRequest, KnownPartReviewBlock, KnownPartReviewClose, KnownPartRowAnswer, PlainTrailPattern,
} from '../data/partsTypes';
import { fillPartsLine, promptCopy, stepOptions, surfaceReady, type SurfaceIds } from './partsContent';
import { partChipLabel } from './partTag';
import { evidenceRows, trailStatement, type EvidenceRowView } from './trailOfferCard';

/** Rule D's block: the unnamed part's question, the three row answers, Done and Not now. */
export const KNOWN_PART_REVIEW_PROMPTS = ['review_noname', 'part_unnamed_place', 'part_unnamed'] as const;
export const KNOWN_PART_REVIEW_OPTIONS = ['review_yes', 'review_no', 'review_not_sure', 'review_done', 'review_not_now'] as const;
/** What rule D's gate requires (scripts/parts/review.mjs reads it). */
export const KNOWN_PART_REVIEW_REQUIRED: SurfaceIds = { prompts: KNOWN_PART_REVIEW_PROMPTS, options: KNOWN_PART_REVIEW_OPTIONS };

/** The plain patterns' heading and the ×'s label. */
export const PLAIN_PATTERNS_REQUIRED: SurfaceIds = { prompts: ['patterns_title'], options: ['patterns_remove'] };

export function knownPartReviewReady(content: PartsContent | null): boolean {
  return !!content && surfaceReady(content, KNOWN_PART_REVIEW_REQUIRED);
}

export function plainPatternsReady(content: PartsContent | null): boolean {
  return !!content && surfaceReady(content, PLAIN_PATTERNS_REQUIRED);
}

/** Option id → the row's answer. */
export const ROW_ANSWER_OF: Readonly<Record<string, KnownPartRowAnswer>> = { review_yes: 'yes', review_no: 'no', review_not_sure: 'not_sure' };

export interface KnownPartReviewCopy {
  answers: Array<{ id: string; label: string; answer: KnownPartRowAnswer }>;
  done: string;
  notNow: string;
}

export function knownPartReviewCopy(content: PartsContent): KnownPartReviewCopy {
  const block = stepOptions(content, 'review', 'block');
  const label = (id: string) => block.find((o) => o.id === id)?.label ?? '';
  return {
    answers: stepOptions(content, 'review', 'row').filter((o) => ROW_ANSWER_OF[o.id]).map((o) => ({ id: o.id, label: o.label, answer: ROW_ANSWER_OF[o.id] })),
    done: label('review_done'), notNow: label('review_not_now'),
  };
}

/**
 * The block's heading (the part's chip label: its name, or "The one in your {place}") and question: the
 * rule's template with `{name}` for a named part, `review_noname` for one with no name. Null when the
 * template asks for anything else, or the copy is missing.
 */
export function knownPartStatement(block: Pick<KnownPartReviewBlock, 'template' | 'name' | 'firstPlace'>, content: PartsContent): { heading: string; question: string } | null {
  const heading = partChipLabel(block, content);
  if (!heading) return null;
  const name = block.name?.trim();
  if (!name) {
    const q = promptCopy(content, 'review_noname');
    return q ? { heading, question: q } : null;
  }
  const question = fillPartsLine(block.template, { name }, { strict: true });
  return question === null ? null : { heading, question };
}

/** One row per moment: the offer's evidence row view (date, tool, context, labels), keyed by its episode. */
export function reviewRows(block: Pick<KnownPartReviewBlock, 'rows'>, locale?: string): Array<EvidenceRowView & { episodeId: string }> {
  const views = evidenceRows(block.rows, locale);
  return block.rows.map((r, i) => ({ ...views[i], key: r.episodeId, episodeId: r.episodeId }));
}

/** The request: the answered rows (a row left alone is Not sure, and sending it changes nothing). */
export function reviewRequest(
  id: string, block: Pick<KnownPartReviewBlock, 'partId' | 'rows'>, answers: Readonly<Record<string, KnownPartRowAnswer>>, close: KnownPartReviewClose,
): AnswerKnownPartReviewRequest {
  const rows = block.rows
    .filter((r) => answers[r.episodeId] === 'yes' || answers[r.episodeId] === 'no')
    .map((r) => ({ episodeId: r.episodeId, answer: answers[r.episodeId] }));
  return { id, partId: block.partId, close, rows };
}

/** A plain pattern's statement (Today's card's fill: every slot or nothing). Rule D never is one. */
export function plainPatternStatement(p: PlainTrailPattern): string | null {
  if (/\{name\}/.test(p.template)) return null;
  return trailStatement({ ruleId: '', shape: p.shape, template: p.template, pulls: p.pulls, context: p.context });
}

export function plainPatternsCopy(content: PartsContent): { title: string; remove: string } {
  return {
    title: promptCopy(content, 'patterns_title') ?? '',
    remove: stepOptions(content, 'reflect', 'patterns').find((o) => o.id === 'patterns_remove')?.label ?? '',
  };
}
