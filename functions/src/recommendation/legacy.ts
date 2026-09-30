/**
 * Today's tool step (the legacy ranker), extracted pure in plan E4-1: the winning pattern's
 * emotions → `dbt_*` concepts that ADDRESS / REDUCE / TARGET them → top two by how many of those
 * emotions each touches. The E4-3 engine runs this when RoutingPolicy is missing or disabled
 * (the kill switch), so it must stay byte-for-byte what the check-in showed before E4.
 *
 * Tie rule: equal scores order by concept id. The Cypher it replaces had no secondary sort key;
 * the live check on 2026-09-30 (tests/fixtures/live-routing-2026-09-30.json) returned both ties in
 * id order (emotional_flooding: Opposite Action before TIPP; social_threat_shame: Opposite Action
 * before Recover), so this pins what users saw.
 */
import type { LegacyToolRow, ToolRecommendation } from './types';

/** dbt_opposite_action → opposite-action. Fallback only: `appToolId` is the join key. */
export function normaliseConceptId(conceptId: string): string {
  if (!conceptId) return conceptId;
  return conceptId.replace(/^dbt_/, '').replace(/_/g, '-');
}

export function toolIdOf(row: { conceptId: string; appToolId: string | null }): string {
  return row.appToolId || normaliseConceptId(row.conceptId);
}

export function relevanceWord(score: number): string {
  if (score > 2) return 'high';
  if (score > 1) return 'medium';
  return 'relevant';
}

export const LEGACY_MAX_TOOLS = 2;

export function legacyTools(rows: readonly LegacyToolRow[]): ToolRecommendation[] {
  return rows
    .filter((r) => r.conceptId.startsWith('dbt_'))
    .slice()
    .sort((a, b) => b.score - a.score || (a.conceptId < b.conceptId ? -1 : a.conceptId > b.conceptId ? 1 : 0))
    .slice(0, LEGACY_MAX_TOOLS)
    .map((r) => {
      const id = toolIdOf(r);
      return {
        id,
        name: r.name || id.replace(/-/g, ' '),
        description: r.description || '',
        whenToUse: r.whenToUse || '',
        dbtBasis: r.dbtBasis ?? null,
        relevance: relevanceWord(r.score),
      };
    });
}
