/**
 * The query layer behind getStateAndTools (plan E4-1): Cypher plus record → row mapping, nothing
 * else. `graphDeps(tx)` is what the callable hands to the pure handler.
 */
import { evaluateSafetyFlag, type QueryRunner } from '../safety/checkinSafetyFlag';
import type { StateDeps } from './handler';
import type { CoOccurrence, EmotionEvidenceRow, LegacyToolRow, PatternDetail, ResponseEvidenceRow } from './types';

/** Neo4j Integer / float / null → number. */
export function toNum(v: unknown): number {
  if (v && typeof v === 'object' && typeof (v as { toNumber?: unknown }).toNumber === 'function') {
    return (v as { toNumber: () => number }).toNumber();
  }
  return Number(v);
}

/** One row per (pattern, matched word, edge): the pure scorer counts words and picks the bonus. */
export const EMOTION_EVIDENCE_QUERY = `
  MATCH (p:ActivationPattern)-[r:ASSOCIATED_WITH]->(e:Emotion)
  WHERE p.id IN $candidatePatterns
    AND e.id IN $emotionIds
  RETURN p.id AS patternId, e.id AS emotionId, r.strength AS strength
`;

export const RESPONSE_EVIDENCE_QUERY = `
  MATCH (r:QuestionResponse)-[e:EVIDENCE_FOR]->(p:ActivationPattern)
  WHERE r.id IN $responseIds
    AND p.id IN $candidatePatterns
  RETURN p.id as patternId, sum(e.weight) as totalWeight
`;

export const PATTERN_DETAIL_QUERY = `
  MATCH (p:ActivationPattern {id: $patternId})
  RETURN p.id as id,
         p.userFacingLabel as userFacingLabel,
         p.description as description,
         p.evidenceGrade as evidenceGrade,
         p.safetyConstraints as safetyConstraints,
         p.clinicalNotes as clinicalNotes
`;

export const CO_OCCURRENCE_QUERY = `
  MATCH (p1:ActivationPattern {id: $pid1})-[r:CO_OCCURS_WITH]-(p2:ActivationPattern {id: $pid2})
  RETURN r.clinicalLabel as clinicalLabel,
         r.combinedUserFacingLabel as combinedUserFacingLabel,
         r.primaryPatternId as primaryPatternId,
         r.frequency as frequency,
         r.sequencingNote as sequencingNote
  LIMIT 1
`;

/** Every `dbt_*` concept touching the pattern's emotions; legacy.ts ranks them (no LIMIT here). */
export const LEGACY_TOOLS_QUERY = `
  MATCH (p:ActivationPattern {id: $patternId})-[:ASSOCIATED_WITH]->(e:Emotion)
  MATCH (tc:TherapyConcept)-[:ADDRESSES|REDUCES|TARGETS]->(e)
  WHERE tc.id STARTS WITH 'dbt_'
  WITH tc, count(DISTINCT e) AS relevanceScore
  RETURN tc.id AS id, tc.appToolId as appToolId, tc.name AS name, tc.description AS description,
         tc.whenToUse AS whenToUse, tc.dbtBasis AS dbtBasis, relevanceScore
`;

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function graphDeps(tx: QueryRunner): StateDeps {
  return {
    async emotionEvidence(candidatePatterns, emotionIds): Promise<EmotionEvidenceRow[]> {
      const res = await tx.run(EMOTION_EVIDENCE_QUERY, { candidatePatterns, emotionIds });
      return res.records.map((r) => ({
        patternId: r.get('patternId') as string,
        emotionId: r.get('emotionId') as string,
        strength: str(r.get('strength')),
      }));
    },
    async responseEvidence(candidatePatterns, responseIds): Promise<ResponseEvidenceRow[]> {
      const res = await tx.run(RESPONSE_EVIDENCE_QUERY, { responseIds, candidatePatterns });
      return res.records.map((r) => ({ patternId: r.get('patternId') as string, weight: toNum(r.get('totalWeight')) }));
    },
    async patternDetail(patternId): Promise<PatternDetail | null> {
      const res = await tx.run(PATTERN_DETAIL_QUERY, { patternId });
      const r = res.records[0];
      if (!r) return null;
      return {
        id: r.get('id') as string,
        userFacingLabel: r.get('userFacingLabel') as string,
        description: r.get('description') as string,
        evidenceGrade: r.get('evidenceGrade') as string,
        safetyConstraints: (r.get('safetyConstraints') as string[] | null) || [],
        clinicalNotes: (r.get('clinicalNotes') as string | null) || '',
      };
    },
    async coOccurrence(pid1, pid2): Promise<CoOccurrence | null> {
      const res = await tx.run(CO_OCCURRENCE_QUERY, { pid1, pid2 });
      const r = res.records[0];
      if (!r) return null;
      return {
        clinicalLabel: r.get('clinicalLabel') as string,
        combinedUserFacingLabel: r.get('combinedUserFacingLabel') as string,
        primaryPatternId: r.get('primaryPatternId') as string,
        frequency: r.get('frequency') as string,
        sequencingNote: r.get('sequencingNote') as string,
      };
    },
    async legacyTools(patternId): Promise<LegacyToolRow[]> {
      const res = await tx.run(LEGACY_TOOLS_QUERY, { patternId });
      return res.records.map((r) => ({
        conceptId: r.get('id') as string,
        appToolId: str(r.get('appToolId')),
        name: str(r.get('name')),
        description: str(r.get('description')),
        whenToUse: str(r.get('whenToUse')),
        dbtBasis: str(r.get('dbtBasis')),
        score: toNum(r.get('relevanceScore')),
      }));
    },
    safetyFlag: (patternId, quadrant) => evaluateSafetyFlag(tx, patternId, quadrant),
  };
}
