/**
 * The trail offer card's logic (src/components/parts/TrailOfferCard.tsx): the statement, the evidence
 * rows and what each answer does. Pure. Split from ./trailOffer.ts (the gate Today reads eagerly) so it
 * loads with the card, only when one can show.
 */
import type { PartsContent, PartsMove } from '../data/partsContentTypes';
import type { TrailOfferAnswer, TrailOfferEvidenceRow } from '../data/partsTypes';
import { getToolById } from '../data/tools';
import type { TodayItem } from '../services/spine';
import { promptCopy, stepOptions } from './partsContent';

/** Option id → the answer answerTrailOffer takes. The card's *No* is *Not me*. */
export const TRAIL_ANSWER_OF: Readonly<Record<string, TrailOfferAnswer>> = {
  offer_not_now: 'not_now', offer_no: 'not_me',
  offer_yes_part: 'yes', offer_more_than_one: 'more_than_one', offer_how_it_goes: 'how_it_goes', offer_not_me: 'not_me',
};

/**
 * The statement: the rule's template with `{context}` (the context's phrase), `{pull}` and `{pull2}`
 * (the moves' trailPhrases, in the statement's order). Null when any slot can't be filled, or the
 * template asks for a name (rule D is Reflect's, never Today's).
 */
export function trailStatement(trail: TodayItem['trail'] | null | undefined): string | null {
  if (!trail?.template) return null;
  const vars: Record<string, string | null | undefined> = { context: trail.context, pull: trail.pulls[0], pull2: trail.pulls[1] };
  let missing = false;
  const out = trail.template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    if (!v) { missing = true; return ''; }
    return v;
  });
  return missing ? null : out;
}

export interface TrailCardCopy { eyebrow: string; ask: string; show: string; notNow: string; no: string }

export function trailCardCopy(content: PartsContent): TrailCardCopy {
  const label = (id: string) => stepOptions(content, 'offer', 'card').find((o) => o.id === id)?.label ?? '';
  return {
    eyebrow: promptCopy(content, 'offer_eyebrow') ?? '', ask: promptCopy(content, 'offer_ask') ?? '',
    show: label('offer_show'), notNow: label('offer_not_now'), no: label('offer_no'),
  };
}

/** The evidence step's four answers, in content order, each with its answer. */
export function evidenceAnswers(content: PartsContent): Array<{ id: string; label: string; answer: TrailOfferAnswer }> {
  return stepOptions(content, 'offer', 'evidence')
    .filter((o) => TRAIL_ANSWER_OF[o.id])
    .map((o) => ({ id: o.id, label: o.label, answer: TRAIL_ANSWER_OF[o.id] }));
}

export interface EvidenceRowView { key: string; date: string; tool: string | null; context: string | null; source: string | null }

/**
 * One row per episode: the date in the locale, the first tool the app can name, the context's phrase,
 * and the picks' graph labels. Ids rendered as labels; an unknown tool id is dropped.
 */
export function evidenceRows(rows: readonly TrailOfferEvidenceRow[], locale?: string): EvidenceRowView[] {
  return rows.map((r, i) => {
    const t = Date.parse(r.at);
    const date = Number.isFinite(t) ? new Date(t).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }) : '';
    const tool = r.toolIds.map((id) => getToolById(id)?.name).find((n): n is string => !!n) ?? null;
    return { key: `${i}:${r.at}`, date, tool, context: r.context, source: r.sources.length ? r.sources.join(', ') : null };
  });
}

/** The split's chips: the offer's moves the app ships, by label. All of them, or none (no split). */
export function splitChips(content: PartsContent, moveIds: readonly string[]): PartsMove[] {
  const moves = moveIds.map((id) => content.moves.find((m) => m.id === id));
  return moves.every((m): m is PartsMove => !!m) ? moves : [];
}

export function splitCopy(content: PartsContent): { question: string; keep: string } {
  return {
    question: promptCopy(content, 'offer_split') ?? '',
    keep: stepOptions(content, 'offer', 'split').find((o) => o.id === 'offer_split_keep')?.label ?? '',
  };
}

export interface OfferMeetLink {
  pathname: '/tool/meet-a-part';
  state: { parts: { trailheadKind: 'offer'; offerId: string; moveId?: string } };
}

/** Yes: Meet a part on the offer's trailhead, opening on its first nameable move (as a candidate's link does). */
export function offerMeetLink(content: PartsContent, offerId: string, moveIds: readonly string[]): OfferMeetLink {
  const m = moveIds.map((id) => content.moves.find((x) => x.id === id)).find((x) => !!x?.unblendPhrase);
  return { pathname: '/tool/meet-a-part', state: { parts: { trailheadKind: 'offer', offerId, ...(m ? { moveId: m.id } : {}) } } };
}
