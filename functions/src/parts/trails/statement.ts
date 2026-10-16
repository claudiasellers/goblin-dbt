/**
 * A candidate's statement, filled from its rule's `statementTemplate` exactly as an offer would say
 * it: {pull} / {pull2} from the moves' `trailPhrase`, {context} from the TrailContext `phrase`, {name}
 * from the part's name (D; the caller reads it through the profile slice). Pure. A slot with nothing
 * to fill stays visible as `{slot}`, so the dry run shows a gap instead of hiding it.
 */
import type { TrailCandidate, TrailContextRow, TrailMove, TrailRule } from './types';

export function trailStatement(
  c: TrailCandidate, rule: Pick<TrailRule, 'statementTemplate'>, moves: readonly TrailMove[],
  contexts: readonly TrailContextRow[], partName: string | null = null,
): string {
  const phrase = (id: string | undefined) => (id ? moves.find((m) => m.id === id)?.trailPhrase ?? null : null);
  const fill: Record<string, string | null> = {
    pull: phrase(c.moveIds[0]),
    pull2: phrase(c.moveIds[1]),
    context: c.contextId ? contexts.find((x) => x.id === c.contextId)?.phrase ?? null : null,
    name: partName,
  };
  return rule.statementTemplate.replace(/\{(\w+)\}/g, (m, k: string) => fill[k] ?? m);
}
