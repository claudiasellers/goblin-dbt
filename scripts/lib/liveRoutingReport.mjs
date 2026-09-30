/**
 * Pure helpers for scripts/verify-live-routing.mjs (no driver, no I/O), so tests can import them.
 *
 * routingSummary(report)  → the routing-relevant part of a live report: no host, no user data,
 *                           safe to commit (tests/fixtures/live-routing-*.json). Also accepts the
 *                           schema-derived tests/fixtures/recommendation-graph.json (plan E4-1) when
 *                           given the grid: `routingSummary(graph, { grid })`.
 * diffRouting(base, cur)  → { changes, warnings }: changes are routing differences (exit 3);
 *                           warnings are tie-order flips between equally scored tools.
 * parseGrid(src)          → the check-in grid from src/data/emotions.ts, as the check-in sends it.
 * singleEmotionWinner()   → production pattern scoring for a one-word check-in (no answers).
 */

/** Candidate patterns per quadrant (functions/src/recommendation/patternScoring.ts). */
export const CANDIDATES = {
  'high-unpleasant': ['acute_alarm', 'chronic_vigilance', 'emotional_flooding', 'social_threat_shame'],
  'low-unpleasant': ['conservation_freeze', 'dissociation_overmodulation', 'rumination_loop', 'reward_drive_low'],
};

/** Grid vocabulary exactly as the check-in sends it: display name, lower-cased, spaces → underscores. */
export function parseGrid(emotionsTsSource) {
  return [...emotionsTsSource.matchAll(/makeEmotion\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'/g)]
    .map(([, id, name, quadrant]) => ({ id, name, quadrant, sent: name.toLowerCase().replace(/\s+/g, '_') }));
}

/**
 * The winning pattern for a one-word check-in without discriminating answers. `hits`: the pattern
 * edges the word reaches ([{ p, s }] pattern id + edge strength), directly or through SCORES_AS
 * aliases. Base 0.25; + (1 word / 1) × 0.4 + the strongest edge's bonus; ties keep candidate order.
 */
export function singleEmotionWinner(quadrant, hits) {
  const cands = CANDIDATES[quadrant];
  const scores = Object.fromEntries(cands.map((c) => [c, 0.25]));
  const byP = {};
  for (const h of hits.filter((x) => cands.includes(x.p))) (byP[h.p] ??= []).push(h.s);
  for (const [p, ss] of Object.entries(byP)) {
    scores[p] += 0.4 + (ss.includes('strong') ? 0.3 : ss.includes('moderate') ? 0.2 : 0.1);
  }
  return Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0];
}

/** Today's tool step over a recommendation-graph fixture: top two dbt_* concepts, ties by id. */
function legacyToolsFromGraph(graph, patternId) {
  const emotions = new Set((graph.patterns[patternId]?.emotions || []).map((e) => e.id));
  return Object.entries(graph.concepts)
    .filter(([id]) => id.startsWith('dbt_'))
    .map(([id, c]) => ({ id, appToolId: c.appToolId ?? null, score: c.addresses.filter((e) => emotions.has(e)).length }))
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 2);
}

/** The live-report summary shape, computed from the schema-derived fixture (no aliases: today's scoring). */
function summaryFromGraph(graph, grid) {
  if (!grid) throw new Error('routingSummary(recommendation-graph) needs { grid } (parseGrid of src/data/emotions.ts)');
  const patterns = Object.keys(graph.patterns).sort();
  const pairs = patterns.flatMap((p) => graph.patterns[p].emotions.map((e) => ({ p, e: e.id, s: e.strength })));
  const vocabulary = {};
  for (const { p, e } of pairs) (vocabulary[p] ??= []).push(e);
  const byEmotion = {};
  for (const a of pairs) (byEmotion[a.e] ??= []).push(a);
  const unpleasant = grid.filter((g) => CANDIDATES[g.quadrant]);
  const perEmotion = unpleasant.map((g) => ({ ...g, hits: byEmotion[g.sent] || [], winner: singleEmotionWinner(g.quadrant, byEmotion[g.sent] || []) }));
  const safety = [];
  for (const [pattern, flags] of Object.entries(graph.safety)) {
    const byType = {};
    for (const f of flags) byType[f.type] = (byType[f.type] || 0) + 1;
    for (const [type, edges] of Object.entries(byType)) safety.push({ pattern, type, edges });
  }
  const evidence = {};
  for (const e of graph.evidence) evidence[e.patternId] = (evidence[e.patternId] || 0) + 1;
  return {
    kind: 'live-routing-summary',
    source: 'recommendation-graph fixture',
    checkedAt: null,
    patterns,
    emotionNodeCount: Object.keys(graph.emotions).length,
    associatedWith: { edges: pairs.length, distinctPairs: new Set(pairs.map((a) => `${a.p}>${a.e}`)).size },
    patternEmotionVocabulary: vocabulary,
    grid: {
      unpleasantNames: unpleasant.length,
      namesThatExistAsEmotionNodes: unpleasant.filter((g) => graph.emotions[g.sent]).length,
      namesWithAnyPatternEdge: perEmotion.filter((x) => x.hits.length).map((x) => x.name).sort(),
      winnerDistribution: perEmotion.reduce((m, x) => ((m[`${x.quadrant} → ${x.winner}`] = (m[`${x.quadrant} → ${x.winner}`] || 0) + 1), m), {}),
      winners: Object.fromEntries(perEmotion.map((e) => [`${e.quadrant}:${e.sent}`, e.winner]).sort(([a], [b]) => a.localeCompare(b))),
    },
    toolsByPattern: Object.fromEntries(patterns.map((p) => [p, legacyToolsFromGraph(graph, p)])),
    safetyTriggers: safety.sort(byPatternType),
    discriminatingEvidence: Object.keys(evidence).sort().map((pattern) => ({ pattern, edges: evidence[pattern] })),
    relatedPathEmotionsWithEdges: [...new Set(pairs.map((a) => a.e))].sort(),
    duplicateRelationshipsByEndpoints: null,
    duplicateRelationshipsKeyed: null,
    duplicateNodes: null,
  };
}

const byPatternType = (a, b) => (a.pattern + a.type).localeCompare(b.pattern + b.type);

/** Accepts a full report, an existing summary or a recommendation-graph fixture; returns a summary. */
export function routingSummary(report, opts = {}) {
  if (report.kind === 'live-routing-summary') return report;
  if (report.kind === 'recommendation-graph') return summaryFromGraph(report, opts.grid);
  const tools = {};
  for (const [p, list] of Object.entries(report.toolsByPattern || {})) {
    tools[p] = list.map(({ id, appToolId, score }) => ({ id, appToolId: appToolId ?? null, score }));
  }
  const keyed = report.duplicateRelationshipsKeyed;
  return {
    kind: 'live-routing-summary',
    checkedAt: report.checkedAt,
    patterns: [...(report.patterns || [])].sort(),
    emotionNodeCount: report.emotionNodeCount,
    associatedWith: report.associatedWith,
    patternEmotionVocabulary: report.patternEmotionVocabulary,
    grid: {
      unpleasantNames: report.grid?.unpleasantNames,
      namesThatExistAsEmotionNodes: report.grid?.namesThatExistAsEmotionNodes,
      namesWithAnyPatternEdge: [...(report.grid?.namesWithAnyPatternEdge || [])].sort(),
      winnerDistribution: report.grid?.winnerDistribution,
      winners: Object.fromEntries((report.grid?.perEmotion || []).map((e) => [`${e.quadrant}:${e.sent}`, e.winner]).sort(([a], [b]) => a.localeCompare(b))),
    },
    toolsByPattern: tools,
    safetyTriggers: [...(report.safetyTriggers || [])].sort(byPatternType),
    discriminatingEvidence: report.discriminatingEvidence,
    relatedPathEmotionsWithEdges: report.relatedPathEmotionsWithEdges,
    // type + endpoints (the 2026-09-30 check); FELT_AS region variants count as "duplicates" here
    duplicateRelationshipsByEndpoints: sumExtra(report.duplicateRelationships),
    // type + endpoints (+ region for FELT_AS): what A1-5's dedupe removes; 0 after it runs.
    // null for reports written before this field existed.
    duplicateRelationshipsKeyed: keyed ? sumExtra(keyed) : null,
    duplicateNodes: sumExtra(report.duplicateNodes, 'extraNodes'),
  };
}

function sumExtra(list, field = 'extraEdges') {
  if (!Array.isArray(list)) return null;
  return list.reduce((n, r) => n + (r[field] || 0), 0);
}

/** JSON with object keys sorted (the live report's key order follows query row order). */
const canon = (x) => JSON.stringify(x, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v));
const same = (a, b) => canon(a) === canon(b);

/** Routing facts that must not move when only duplicates are removed (the M1 gate). */
const ROUTING_KEYS = ['patterns', 'associatedWith', 'patternEmotionVocabulary', 'safetyTriggers', 'discriminatingEvidence', 'relatedPathEmotionsWithEdges'];

export function diffRouting(baseline, current, opts = {}) {
  const a = routingSummary(baseline, opts);
  const b = routingSummary(current, opts);
  const changes = [];
  const warnings = [];
  for (const k of ROUTING_KEYS) {
    if (!same(a[k], b[k])) changes.push({ what: k, before: a[k], after: b[k] });
  }
  if (!same(a.grid.winnerDistribution, b.grid.winnerDistribution)) {
    changes.push({ what: 'grid.winnerDistribution', before: a.grid.winnerDistribution, after: b.grid.winnerDistribution });
  }
  for (const key of new Set([...Object.keys(a.grid.winners), ...Object.keys(b.grid.winners)])) {
    if (a.grid.winners[key] !== b.grid.winners[key]) changes.push({ what: `grid.winner ${key}`, before: a.grid.winners[key] ?? null, after: b.grid.winners[key] ?? null });
  }
  for (const p of new Set([...Object.keys(a.toolsByPattern), ...Object.keys(b.toolsByPattern)])) {
    const ta = a.toolsByPattern[p] || [];
    const tb = b.toolsByPattern[p] || [];
    if (same(ta, tb)) continue;
    const byScore = (l) => JSON.stringify([...l].sort((x, y) => y.score - x.score || x.id.localeCompare(y.id)));
    if (byScore(ta) === byScore(tb)) warnings.push({ what: `toolsByPattern.${p}`, note: 'tie order changed (same tools, same scores)', before: ta, after: tb });
    else changes.push({ what: `toolsByPattern.${p}`, before: ta, after: tb });
  }
  return { changes, warnings };
}
