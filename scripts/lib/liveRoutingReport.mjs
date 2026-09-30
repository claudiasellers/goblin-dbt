/**
 * Pure helpers for scripts/verify-live-routing.mjs (no driver, no I/O), so tests can import them.
 *
 * routingSummary(report)  → the routing-relevant part of a live report: no host, no user data,
 *                           safe to commit (tests/fixtures/live-routing-*.json).
 * diffRouting(base, cur)  → { changes, warnings }: changes are routing differences (exit 3);
 *                           warnings are tie-order flips between equally scored tools.
 */

const byPatternType = (a, b) => (a.pattern + a.type).localeCompare(b.pattern + b.type);

/** Accepts a full report or an existing summary; always returns a summary. */
export function routingSummary(report) {
  if (report.kind === 'live-routing-summary') return report;
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

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Routing facts that must not move when only duplicates are removed (the M1 gate). */
const ROUTING_KEYS = ['patterns', 'associatedWith', 'patternEmotionVocabulary', 'safetyTriggers', 'discriminatingEvidence', 'relatedPathEmotionsWithEdges'];

export function diffRouting(baseline, current) {
  const a = routingSummary(baseline);
  const b = routingSummary(current);
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
    const canon = (l) => JSON.stringify([...l].sort((x, y) => y.score - x.score || x.id.localeCompare(y.id)));
    if (canon(ta) === canon(tb)) warnings.push({ what: `toolsByPattern.${p}`, note: 'tie order changed (same tools, same scores)', before: ta, after: tb });
    else changes.push({ what: `toolsByPattern.${p}`, before: ta, after: tb });
  }
  return { changes, warnings };
}
