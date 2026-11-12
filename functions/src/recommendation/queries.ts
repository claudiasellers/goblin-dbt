/**
 * The query layer behind getStateAndTools (plan E4-1): Cypher plus record → row mapping, nothing
 * else. `graphDeps(tx)` is what the callable hands to the pure handler.
 */
import { evaluateReferralFlag, evaluateSafetyFlag, type QueryRunner } from '../safety/checkinSafetyFlag';
import { evaluateSafetyAsk, safetyPolicyEnabled } from '../safety/safetyAsk';
import type { StateDeps } from './handler';
import type {
  Band, CoOccurrence, Direction, EmotionEvidenceRow, LegacyToolRow, PatternDetail, PatternSlice, ResponseEvidenceRow,
  RoutingConcept, RoutingPolicy, RoutingRow, Side, SkillKind,
} from './types';

/** Neo4j Integer / float / null → number. */
export function toNum(v: unknown): number {
  if (v && typeof v === 'object' && typeof (v as { toNumber?: unknown }).toNumber === 'function') {
    return (v as { toNumber: () => number }).toNumber();
  }
  return Number(v);
}

/**
 * One row per (pattern, matched word, edge): the pure scorer counts words and picks the bonus.
 * E4-6: a word matches a pattern emotion directly or, when `$useAliases` (RoutingPolicy on), through
 * its SCORES_AS aliases (grid words → pattern vocabulary, scripts/recommendations/vocabulary.py).
 * Oct 2026 review: when the policy is on and the word has a reviewed pattern
 * ((:Emotion)-[:SIGNALS]->(:ActivationPattern), vocabulary.py SIGNALS), that pattern is the word's only
 * match, as a strong edge; aliases and direct edges apply only to words without one.
 * `emotionId` is always the word as sent.
 */
export const EMOTION_EVIDENCE_QUERY = `
  UNWIND $emotionIds AS sent
  OPTIONAL MATCH (:Emotion {id: sent})-[:SIGNALS]->(sp:ActivationPattern)
  WHERE $useAliases
  WITH sent, collect(DISTINCT sp.id) AS signalled
  OPTIONAL MATCH (:Emotion {id: sent})-[:SCORES_AS]->(alias:Emotion)
  WHERE $useAliases AND size(signalled) = 0
  WITH sent, signalled, [sent] + collect(DISTINCT alias.id) AS targets
  OPTIONAL MATCH (p:ActivationPattern)-[r:ASSOCIATED_WITH]->(e:Emotion)
  WHERE size(signalled) = 0 AND p.id IN $candidatePatterns AND e.id IN targets
  WITH sent, signalled, collect(CASE WHEN p IS NULL THEN null ELSE {p: p.id, s: r.strength} END) AS viaEmotion
  UNWIND (CASE WHEN size(signalled) > 0
            THEN [x IN signalled WHERE x IN $candidatePatterns | {p: x, s: 'strong'}]
            ELSE viaEmotion END) AS hit
  RETURN hit.p AS patternId, sent AS emotionId, hit.s AS strength
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

/**
 * Every `dbt_*` concept touching the pattern's emotions; legacy.ts ranks them (no LIMIT here). Edges written with
 * `legacy: false` (added after the routing review, e.g. FAST's) are left out, so the kill switch restores the
 * pre-review routing whole.
 */
export const LEGACY_TOOLS_QUERY = `
  MATCH (p:ActivationPattern {id: $patternId})-[:ASSOCIATED_WITH]->(e:Emotion)
  MATCH (tc:TherapyConcept)-[t:ADDRESSES|REDUCES|TARGETS]->(e)
  WHERE tc.id STARTS WITH 'dbt_' AND coalesce(t.legacy, true)
  WITH tc, count(DISTINCT e) AS relevanceScore
  RETURN tc.id AS id, tc.appToolId as appToolId, tc.name AS name, tc.description AS description,
         tc.whenToUse AS whenToUse, tc.dbtBasis AS dbtBasis, relevanceScore
`;

/** RoutingPolicy + its fallback concept (E4-3). One row, nulls when the policy isn't loaded. */
export const ROUTING_POLICY_QUERY = `
  OPTIONAL MATCH (rp:RoutingPolicy {id: 'checkin_result'})
  OPTIONAL MATCH (fb:TherapyConcept {id: rp.fallbackConceptId})
  RETURN rp { .version, .enabled, .maxCards, .fallbackConceptId, .defaultBand, .floodedPatterns, .answerWeight, .tieBreak } AS policy,
         fb { .id, .appToolId, .name, .description, .whenToUse, .dbtBasis, .side, .skillKind, .direction } AS fallback
`;

/**
 * The routing slice (E4 §4.2): per pattern, its blank flag and emotions, and every active
 * `checkin_result` RECOMMENDED_FOR row with its concept's tags, the emotions the concept addresses
 * and its CONTRAINDICATED_FOR targets (the hook; nothing authored in Phase A).
 */
export const ROUTING_SLICE_QUERY = `
  MATCH (p:ActivationPattern) WHERE p.id IN $patternIds
  OPTIONAL MATCH (p)-[:ASSOCIATED_WITH]->(pe:Emotion)
  WITH p, collect(DISTINCT pe.id) AS patternEmotions
  OPTIONAL MATCH (tc:TherapyConcept)-[r:RECOMMENDED_FOR]->(p)
    WHERE tc.appToolId IS NOT NULL AND coalesce(r.active, true)
      AND 'checkin_result' IN coalesce(r.surface, ['checkin_result'])
  OPTIONAL MATCH (tc)-[:ADDRESSES|REDUCES|TARGETS]->(e:Emotion)
  WITH p, patternEmotions, tc, r, collect(DISTINCT e.id) AS addresses
  OPTIONAL MATCH (tc)-[:CONTRAINDICATED_FOR]->(cp:ActivationPattern)
  WITH p, patternEmotions, tc, r, addresses, collect(DISTINCT cp.id) AS contraPatterns
  OPTIONAL MATCH (tc)-[:CONTRAINDICATED_FOR]->(mf:MedicalFlag)
  RETURN p.id AS patternId, coalesce(p.blank, false) AS blank, patternEmotions,
         tc { .id, .appToolId, .name, .description, .whenToUse, .dbtBasis, .side, .skillKind, .direction } AS concept,
         CASE WHEN r IS NULL THEN null ELSE r { .id, .bands, .direction, .side, .requiresPrior, .emotionGate, .words, .beside, .active, priority: toFloat(r.priority) } END AS edge,
         addresses, contraPatterns, collect(DISTINCT mf.id) AS contraFlags
`;

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
type Obj = Record<string, unknown>;

/** A concept map from the graph → RoutingConcept (null when it has no app tool id). Untagged concepts are neutral. */
export function toRoutingConcept(c: Obj | null | undefined, extra: { addresses?: unknown; contraPatterns?: unknown; contraFlags?: unknown } = {}): RoutingConcept | null {
  if (!c || typeof c.appToolId !== 'string' || typeof c.id !== 'string') return null;
  return {
    id: c.id, appToolId: c.appToolId,
    name: str(c.name), description: str(c.description), whenToUse: str(c.whenToUse), dbtBasis: str(c.dbtBasis),
    side: (str(c.side) ?? 'both') as Side,
    skillKind: (str(c.skillKind) ?? 'change') as SkillKind,
    direction: (str(c.direction) ?? 'neutral') as Direction,
    addresses: strs(extra.addresses), contraPatterns: strs(extra.contraPatterns), contraFlags: strs(extra.contraFlags),
  };
}

export function toRoutingRow(e: Obj): RoutingRow {
  const gate = str(e.emotionGate);
  return {
    id: String(e.id),
    bands: strs(e.bands) as Band[],
    priority: toNum(e.priority),
    direction: str(e.direction) as Direction | null,
    side: str(e.side) as Side | null,
    requiresPrior: str(e.requiresPrior),
    emotionGate: gate === 'addresses' || gate === 'none_named' || gate === 'words' ? gate : null,
    words: strs(e.words),
    beside: strs(e.beside),
    active: e.active !== false,
  };
}

/** Slice query records → one PatternSlice per pattern (rows without a concept or edge are skipped). */
export function toGraphSlice(records: Array<{ get(key: string): unknown }>): PatternSlice[] {
  const byId = new Map<string, PatternSlice>();
  for (const r of records) {
    const id = r.get('patternId') as string;
    const slice = byId.get(id) ?? { id, blank: r.get('blank') === true, emotions: strs(r.get('patternEmotions')), rows: [] };
    byId.set(id, slice);
    const edge = r.get('edge') as Obj | null;
    const concept = toRoutingConcept(r.get('concept') as Obj | null, {
      addresses: r.get('addresses'), contraPatterns: r.get('contraPatterns'), contraFlags: r.get('contraFlags'),
    });
    if (edge && concept) slice.rows.push({ row: toRoutingRow(edge), concept });
  }
  return [...byId.values()];
}

export function toRoutingPolicy(p: Obj | null | undefined): RoutingPolicy | null {
  if (!p || typeof p.version !== 'string') return null;
  const band = str(p.defaultBand);
  return {
    version: p.version,
    enabled: p.enabled === true,
    maxCards: p.maxCards == null ? 2 : toNum(p.maxCards),
    fallbackConceptId: str(p.fallbackConceptId) ?? 'se_orienting',
    defaultBand: (band === 'steady' || band === 'stirred' || band === 'flooded' ? band : 'stirred'),
    floodedPatterns: strs(p.floodedPatterns),
    ...(answerWeight(p.answerWeight) != null ? { answerWeight: answerWeight(p.answerWeight) as number } : {}),
    ...(p.tieBreak === 'words' ? { tieBreak: 'words' as const } : {}),
  };
}

/** A usable answer weight (0 < w ≤ 4), else null: a bad value falls back to the default, never to 0. */
function answerWeight(v: unknown): number | null {
  if (v == null) return null;
  const n = toNum(v);
  return Number.isFinite(n) && n > 0 && n <= 4 ? n : null;
}

/** `uid`: the caller (the safety route reads their own SafetyChecks); without it the route stays off. */
export function graphDeps(tx: QueryRunner, uid?: string): StateDeps {
  return {
    async emotionEvidence(candidatePatterns, emotionIds, useAliases): Promise<EmotionEvidenceRow[]> {
      const res = await tx.run(EMOTION_EVIDENCE_QUERY, { candidatePatterns, emotionIds, useAliases });
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
    async safetyRoute(a) {
      if (!uid || !(await safetyPolicyEnabled(tx))) return null;
      const ask = await evaluateSafetyAsk(tx, uid, a);
      const flag = await evaluateReferralFlag(tx, a.patternIds[0]);
      return { ask, ...(flag ? { flag } : {}) };
    },
    async routingPolicy() {
      const res = await tx.run(ROUTING_POLICY_QUERY, {});
      const r = res.records[0];
      if (!r) return { policy: null, fallback: null };
      return { policy: toRoutingPolicy(r.get('policy') as Obj | null), fallback: toRoutingConcept(r.get('fallback') as Obj | null) };
    },
    async routingSlice(patternIds) {
      const res = await tx.run(ROUTING_SLICE_QUERY, { patternIds });
      return toGraphSlice(res.records);
    },
  };
}
