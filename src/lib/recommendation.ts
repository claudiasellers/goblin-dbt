/**
 * The check-in result's cards (plan E4-4). Pure, so it's tested without React.
 *
 * Join pattern (CLAUDE.md): the engine says which tool (by id); src/data/tools.ts says how to show
 * it. Ids with no tool there are dropped (the `alternate-rebellion` class of bug), graph names
 * ("TIPP") and relevance words are never shown. What renders is what the check-in stores as
 * `recommendedToolIds`, crisis-banner results included (the banner sits above the cards, R12).
 */
import { getToolById, type Tool } from '../data/tools';
import { ROUTING_LABELS } from '../data/routingLabels';

export interface CardInput {
  id: string;
  slot?: 'primary' | 'swap';
  side?: 'acceptance' | 'change' | 'both';
  sequence?: 'after_primary';
  ruleId?: string;
}

export interface RecommendationCard {
  tool: Tool;
  slot: 'primary' | 'swap';
  /** Heading above this card (null: none). */
  label: string | null;
  ruleId: string | null;
}

/** Both result screens render at most two cards: one recommendation and one swap. */
export const MAX_CARDS = 2;

/** Labels for up to two cards (WMP-04 v0). Legacy results (no side) get none. */
export function cardLabels(cards: ReadonlyArray<Pick<CardInput, 'side' | 'sequence'>>): Array<string | null> {
  const labels: Array<string | null> = cards.map(() => null);
  if (cards.length < 2 || !cards[0].side || !cards[1].side) return labels;
  const [a, b] = cards;
  if (b.sequence === 'after_primary') {
    labels[1] = ROUTING_LABELS.afterPrimary;
    return labels;
  }
  const sides = new Set([a.side, b.side]);
  if (sides.has('change') && sides.has('acceptance')) {
    labels[0] = ROUTING_LABELS[a.side as 'change' | 'acceptance'];
    labels[1] = ROUTING_LABELS[b.side as 'change' | 'acceptance'];
    return labels;
  }
  labels[1] = ROUTING_LABELS.swap;
  return labels;
}

/** The cards the result renders: known tools only, at most two, primary first, with labels. */
export function recommendationCards(result: { tools?: ReadonlyArray<CardInput> } | null | undefined): RecommendationCard[] {
  const known = (result?.tools ?? [])
    .map((t) => ({ t, tool: getToolById(t.id) }))
    .filter((x): x is { t: CardInput; tool: Tool } => Boolean(x.tool))
    .slice(0, MAX_CARDS);
  const labels = cardLabels(known.map((x) => x.t));
  return known.map((x, i) => ({
    tool: x.tool,
    slot: x.t.slot ?? (i === 0 ? 'primary' : 'swap'),
    label: labels[i],
    ruleId: x.t.ruleId ?? null,
  }));
}

/** What rendered, for CheckIn.recommendedToolIds (≤ 2, banner results included). */
export function shownToolIds(result: { tools?: ReadonlyArray<CardInput> } | null | undefined): string[] {
  return recommendationCards(result).map((c) => c.tool.id);
}
