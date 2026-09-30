// The check-in engine's query layer, answered from tests/fixtures/recommendation-graph.json instead
// of Neo4j (plan E4-1). Each method mirrors one query in functions/src/recommendation/queries.ts,
// so golden tests run whole check-ins through the real (pure) handler.
import { readFileSync } from "node:fs";
import { importTs } from "./importTs.mjs";

const safety = await importTs("functions/src/safety/checkinSafetyFlag.ts");

export const graph = JSON.parse(readFileSync("tests/fixtures/recommendation-graph.json", "utf8"));

/** Words a sent id scores as: itself plus its SCORES_AS aliases (E4-6), when the graph has any. */
export function scoringTargets(g, sent) {
  return [sent, ...((g.aliases || {})[sent] || [])];
}

export function fixtureDeps(g = graph, calls = []) {
  const log = (name, ...args) => calls.push([name, ...args]);
  return {
    async emotionEvidence(candidates, emotionIds) {
      log("emotionEvidence", candidates, emotionIds);
      const rows = [];
      for (const pid of candidates) {
        for (const e of g.patterns[pid]?.emotions || []) {
          for (const sent of new Set(emotionIds)) {
            if (scoringTargets(g, sent).includes(e.id)) rows.push({ patternId: pid, emotionId: sent, strength: e.strength ?? null });
          }
        }
      }
      return rows;
    },
    async responseEvidence(candidates, responseIds) {
      log("responseEvidence", candidates, responseIds);
      const sums = new Map();
      for (const e of g.evidence) {
        if (responseIds.includes(e.responseId) && candidates.includes(e.patternId)) sums.set(e.patternId, (sums.get(e.patternId) || 0) + e.weight);
      }
      return [...sums].map(([patternId, weight]) => ({ patternId, weight }));
    },
    async patternDetail(patternId) {
      log("patternDetail", patternId);
      const p = g.patterns[patternId];
      if (!p) return null;
      return {
        id: patternId, userFacingLabel: p.userFacingLabel, description: p.description, evidenceGrade: p.evidenceGrade,
        safetyConstraints: p.safetyConstraints || [], clinicalNotes: p.clinicalNotes || "",
      };
    },
    async coOccurrence(a, b) {
      log("coOccurrence", a, b);
      const c = g.coOccurrence.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
      if (!c) return null;
      const { clinicalLabel, combinedUserFacingLabel, primaryPatternId, frequency, sequencingNote } = c;
      return { clinicalLabel, combinedUserFacingLabel, primaryPatternId, frequency, sequencingNote };
    },
    async legacyTools(patternId) {
      log("legacyTools", patternId);
      const emotions = new Set((g.patterns[patternId]?.emotions || []).map((e) => e.id));
      return Object.entries(g.concepts)
        .filter(([id]) => id.startsWith("dbt_"))
        .map(([id, c]) => ({
          conceptId: id, appToolId: c.appToolId ?? null, name: c.name ?? null, description: c.description ?? null,
          whenToUse: c.whenToUse ?? null, dbtBasis: c.dbtBasis ?? null,
          score: c.addresses.filter((e) => emotions.has(e)).length,
        }))
        .filter((r) => r.score > 0);
    },
    async safetyFlag(patternId, quadrant) {
      log("safetyFlag", patternId, quadrant);
      return safety.safetyFlagFor(quadrant, g.safety[patternId] || []);
    },
    async routingPolicy() {
      log("routingPolicy");
      const p = g.routingPolicy;
      if (!p) return { policy: null, fallback: null };
      const policy = {
        version: p.version, enabled: p.enabled === true, maxCards: p.maxCards ?? 2, fallbackConceptId: p.fallbackConceptId,
        defaultBand: p.defaultBand, floodedPatterns: p.floodedPatterns || [],
      };
      return { policy, fallback: routingConcept(g, p.fallbackConceptId, { withAddresses: false }) };
    },
    async routingSlice(patternIds) {
      log("routingSlice", patternIds);
      return patternIds.filter((id) => g.patterns[id]).map((id) => ({
        id,
        blank: g.patterns[id].blank === true,
        emotions: g.patterns[id].emotions.map((e) => e.id),
        rows: g.recommendedFor
          .filter((r) => r.patternId === id && r.active !== false && (r.surface || ["checkin_result"]).includes("checkin_result"))
          .map((r) => ({ row: routingRow(r), concept: routingConcept(g, r.conceptId) }))
          .filter((x) => x.concept),
      }));
    },
  };
}

/** A fixture concept as the slice query returns it (untagged concepts read as neutral). */
export function routingConcept(g, conceptId, { withAddresses = true } = {}) {
  const c = g.concepts[conceptId];
  if (!c || !c.appToolId) return null;
  const contra = (g.contraindicated || []).filter((x) => x.conceptId === conceptId);
  return {
    id: conceptId, appToolId: c.appToolId, name: c.name ?? null, description: c.description ?? null,
    whenToUse: c.whenToUse ?? null, dbtBasis: c.dbtBasis ?? null,
    side: c.side ?? "both", skillKind: c.skillKind ?? "change", direction: c.direction ?? "neutral",
    addresses: withAddresses ? [...c.addresses] : [],
    contraPatterns: withAddresses ? contra.filter((x) => g.patterns[x.targetId]).map((x) => x.targetId) : [],
    contraFlags: withAddresses ? contra.filter((x) => !g.patterns[x.targetId]).map((x) => x.targetId) : [],
  };
}

function routingRow(r) {
  return {
    id: r.id, bands: [...r.bands], priority: r.priority, direction: r.direction ?? null, side: r.side ?? null,
    requiresPrior: r.requiresPrior ?? null, emotionGate: r.emotionGate ?? null, active: r.active !== false,
  };
}

/** A copy of the fixture with the routing policy switched on (what the D-02 flip does). */
export function withPolicyOn(g = graph) {
  const copy = structuredClone(g);
  copy.routingPolicy = { ...copy.routingPolicy, enabled: true };
  return copy;
}
