/**
 * The trail offer on Today (docs/design/parts.md, "The offer card"): which signed-off copy it needs, the
 * statement, the evidence rows, and what each answer does. Every word is shipped parts content or
 * signed-off graph content the server resolved (the statement's phrases, the evidence's context phrases and
 * source labels); tool names come from src/data/tools.ts by id. Nothing the person wrote appears on an
 * offer. The card renders only when all of its copy is there (`surfaceReady`), so nothing shows until
 * Claudia signs it off, and the server sends no card while offers or the rule are off. Pure. This file
 * is the gate Today reads eagerly; what the card shows and does is ./trailOfferCard.ts, loaded with it.
 */
import type { PartsContent } from '../data/partsContentTypes';
import type { TodayItem } from '../services/spine';
import { surfaceReady, type SurfaceIds } from './partsContent';

export const TRAIL_OFFER_KIND = 'trail_offer';

/** The card's eyebrow and ask, the evidence step's heading and question, the split's question. */
export const TRAIL_OFFER_PROMPTS = ['offer_eyebrow', 'offer_ask', 'offer_evidence', 'offer_question', 'offer_split'] as const;
/** The card's three answers, the evidence step's four, and the split's keep. */
export const TRAIL_OFFER_OPTIONS = [
  'offer_show', 'offer_not_now', 'offer_no',
  'offer_yes_part', 'offer_more_than_one', 'offer_how_it_goes', 'offer_not_me',
  'offer_split_keep',
] as const;

/** What the card's gate requires (scripts/parts/review.mjs reads it). */
export const TRAIL_OFFER_REQUIRED: SurfaceIds = { prompts: TRAIL_OFFER_PROMPTS, options: TRAIL_OFFER_OPTIONS };

export function trailOfferReady(content: PartsContent | null): boolean {
  return !!content && surfaceReady(content, TRAIL_OFFER_REQUIRED);
}

/** Today without trail offers the card can't show (content not signed off, or parts off on this device). */
export function withReadyTrailOffers(items: TodayItem[], ready: boolean): TodayItem[] {
  return ready ? items : items.filter((i) => i.kind !== TRAIL_OFFER_KIND);
}
