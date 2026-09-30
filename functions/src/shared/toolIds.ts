import { Record as Neo4jRecord } from 'neo4j-driver';

/** Convert graph tool IDs (dbt_opposite_action) to frontend format (opposite-action). */
export function normalizeToolId(graphId: string): string {
  if (!graphId) return graphId;
  return graphId.replace(/^dbt_/, '').replace(/_/g, '-');
}

/**
 * App tool id for a graph concept. `TherapyConcept.appToolId` (schema/app-tool-ids.cypher) is the
 * join key to src/data/tools.ts; the string normalization is only a fallback for concepts without it
 * (it turns dbt_tipp into "tipp", which isn't an app tool).
 */
export function appToolId(rec: Neo4jRecord): string {
  const explicit = rec.get('appToolId') as string | null | undefined;
  return explicit || normalizeToolId(rec.get('id'));
}
