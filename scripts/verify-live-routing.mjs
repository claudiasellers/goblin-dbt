#!/usr/bin/env node
/**
 * READ-ONLY check of the live Neo4j graph against the check-in routing logic
 * in functions/src/recommendation/index.ts (getStateAndTools, emotion scoring; functions/src/index.ts ~L1515-1545 before the A1-2 split).
 * Opens a READ session; never writes. Credentials come from .env (same as load-graph.mjs); never printed.
 * Usage (repo root):  node scripts/verify-live-routing.mjs
 *   --compare <file>   compare routing with an earlier report, a committed summary
 *                      (e.g. tests/fixtures/live-routing-2026-09-30.json) or the schema-derived
 *                      tests/fixtures/recommendation-graph.json (E4-1); exit 3 if routing moved
 *   --summary <file>   also write the routing summary (no host, no user data; safe to commit)
 * Writes: scripts/.verify-live-routing-report.json (gitignored: it names the host)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routingSummary, diffRouting, parseGrid, singleEmotionWinner, gridViaAliases, CANDIDATES } from './lib/liveRoutingReport.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'functions/package.json'));
const neo4j = require('neo4j-driver');

const argv = process.argv.slice(2);
const argAfter = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const comparePath = argAfter('--compare');
const summaryPath = argAfter('--summary');
// Read the baseline before this run overwrites the default report path.
// A committed summary, an earlier report, or tests/fixtures/recommendation-graph.json (the schema's view).
const baseline = comparePath ? JSON.parse(readFileSync(resolve(process.cwd(), comparePath), 'utf8')) : null;

for (const line of (existsSync(resolve(root, '.env')) ? readFileSync(resolve(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const { NEO4J_URI: uri, NEO4J_USER: user = 'neo4j', NEO4J_PASSWORD: pw } = process.env;
if (!uri || !pw) { console.error('Missing NEO4J_URI / NEO4J_PASSWORD in .env'); process.exit(1); }

// Grid vocabulary exactly as the check-in sends it: display name, lower-cased, spaces -> underscores
const src = readFileSync(resolve(root, 'src/data/emotions.ts'), 'utf8');
const grid = parseGrid(src);
const toNum = v => (v && typeof v.toNumber === 'function' ? v.toNumber() : Number(v));

const driver = neo4j.driver(uri, neo4j.auth.basic(user, pw));
const session = driver.session({ defaultAccessMode: neo4j.session.READ });
const q = async (cypher, params = {}) => (await session.executeRead(tx => tx.run(cypher, params))).records.map(r => r.toObject());
const report = { checkedAt: new Date().toISOString(), host: uri.replace(/^.*:\/\/([^.]{3})[^.]*/, '$1…') };
try {
  await driver.verifyConnectivity();
  report.patterns = (await q(`MATCH (p:ActivationPattern) RETURN p.id AS id ORDER BY id`)).map(r => r.id);
  report.emotionNodeCount = toNum((await q(`MATCH (e:Emotion) RETURN count(e) AS n`))[0].n);
  const assoc = await q(`MATCH (p:ActivationPattern)-[r:ASSOCIATED_WITH]->(e:Emotion) RETURN p.id AS p, e.id AS e, r.strength AS s`);
  report.associatedWith = { edges: assoc.length, distinctPairs: new Set(assoc.map(a => a.p + '>' + a.e)).size };
  report.patternEmotionVocabulary = {};
  for (const a of assoc) (report.patternEmotionVocabulary[a.p] ??= new Set()).add(a.e);
  for (const k in report.patternEmotionVocabulary) report.patternEmotionVocabulary[k] = [...report.patternEmotionVocabulary[k]].sort();

  const unpleasant = grid.filter(g => CANDIDATES[g.quadrant]);
  const sent = [...new Set(unpleasant.map(g => g.sent))];
  const existing = new Set((await q(`MATCH (e:Emotion) WHERE e.id IN $ids RETURN e.id AS id`, { ids: sent })).map(r => r.id));
  const assocByEmotion = {};
  for (const a of assoc) (assocByEmotion[a.e] ??= []).push(a);

  // Replicate the production scoring for a single-emotion check-in (no discriminating answers)
  const perEmotion = unpleasant.map(g => {
    const hits = (assocByEmotion[g.sent] || []).filter(a => CANDIDATES[g.quadrant].includes(a.p));
    return { name: g.name, sent: g.sent, quadrant: g.quadrant, emotionNodeExists: existing.has(g.sent), patternEdges: hits.length, winner: singleEmotionWinner(g.quadrant, hits) };
  });
  report.grid = {
    unpleasantNames: perEmotion.length,
    namesThatExistAsEmotionNodes: perEmotion.filter(x => x.emotionNodeExists).length,
    namesWithAnyPatternEdge: perEmotion.filter(x => x.patternEdges > 0).map(x => x.name),
    winnerDistribution: perEmotion.reduce((m, x) => ((m[`${x.quadrant} → ${x.winner}`] = (m[`${x.quadrant} → ${x.winner}`] || 0) + 1), m), {}),
    perEmotion,
  };
  // E4-6: the same one-word check-ins through the SCORES_AS aliases (what the scoring query reads
  // since E4-6). Before the aliases are loaded this reports aliasEdges 0 and every name not reaching.
  const aliasRows = await q(`MATCH (w:Emotion)-[:SCORES_AS]->(a:Emotion) RETURN w.id AS w, a.id AS a ORDER BY w, a`);
  report.aliases = {};
  for (const r of aliasRows) (report.aliases[r.w] ??= []).push(r.a);
  const coOccurs = await q(`MATCH (a:ActivationPattern)-[r:CO_OCCURS_WITH]->(b:ActivationPattern) RETURN a.id AS a, b.id AS b, r.primaryPatternId AS primaryPatternId ORDER BY a, b`);
  // Oct 2026 review: each grid word's reviewed pattern (SIGNALS) wins over its aliases.
  const signalRows = await q(`MATCH (w:Emotion)-[:SIGNALS]->(p:ActivationPattern) RETURN w.id AS w, p.id AS p ORDER BY w, p`);
  report.signals = {};
  for (const r of signalRows) (report.signals[r.w] ??= []).push(r.p);
  report.gridViaAliases = gridViaAliases(grid, assoc, report.aliases, coOccurs, report.signals);
  report.safetyTriggers = await q(`MATCH (p:ActivationPattern)-[:TRIGGERS_SAFETY]->(s:SafetyFlag) RETURN p.id AS pattern, s.type AS type, count(*) AS edges ORDER BY pattern`);
  report.safetyTriggers = report.safetyTriggers.map(r => ({ ...r, edges: toNum(r.edges) }));
  report.discriminatingEvidence = (await q(`MATCH (r:QuestionResponse)-[e:EVIDENCE_FOR]->(p:ActivationPattern) RETURN p.id AS pattern, count(e) AS edges ORDER BY pattern`)).map(r => ({ ...r, edges: toNum(r.edges) }));

  // ---- Audit of other live-dependent claims in the build plan ----
  // Duplicate relationships (same type, same endpoints) across the whole graph
  report.duplicateRelationships = (await q(`
    MATCH (a)-[r]->(b)
    WITH type(r) AS t, elementId(a) AS a, elementId(b) AS b, count(*) AS c
    WHERE c > 1
    RETURN t AS type, count(*) AS duplicatedPairs, sum(c - 1) AS extraEdges ORDER BY extraEdges DESC`))
    .map(r => ({ type: r.type, duplicatedPairs: toNum(r.duplicatedPairs), extraEdges: toNum(r.extraEdges) }));
  // Same, keyed like the schema MERGEs (FELT_AS also on region): what A1-5's dedupe removes, 0 after it
  report.duplicateRelationshipsKeyed = (await q(`
    MATCH (a)-[r]->(b)
    WITH type(r) AS t, elementId(a) AS a, elementId(b) AS b, CASE type(r) WHEN 'FELT_AS' THEN r.region END AS k, count(*) AS c
    WHERE c > 1
    RETURN t AS type, count(*) AS duplicatedPairs, sum(c - 1) AS extraEdges ORDER BY extraEdges DESC`))
    .map(r => ({ type: r.type, duplicatedPairs: toNum(r.duplicatedPairs), extraEdges: toNum(r.extraEdges) }));
  report.relationshipTotals = (await q(`MATCH ()-[r]->() RETURN type(r) AS type, count(*) AS n ORDER BY n DESC`)).map(r => ({ type: r.type, n: toNum(r.n) }));
  // Duplicate nodes (same label set + same id)
  report.duplicateNodes = (await q(`
    MATCH (n) WHERE n.id IS NOT NULL AND NOT n:UserData
    WITH labels(n) AS labels, n.id AS id, count(*) AS c WHERE c > 1
    RETURN labels, count(*) AS duplicatedIds, sum(c - 1) AS extraNodes ORDER BY extraNodes DESC`))
    .map(r => ({ labels: r.labels, duplicatedIds: toNum(r.duplicatedIds), extraNodes: toNum(r.extraNodes) }));
  report.nodeTotals = (await q(`MATCH (n) UNWIND labels(n) AS l RETURN l AS label, count(*) AS n ORDER BY n DESC`)).map(r => ({ label: r.label, n: toNum(r.n) }));
  // What each pattern recommends today (exact production tools query, functions/src/recommendation/index.ts)
  report.toolsByPattern = {};
  for (const pid of report.patterns) {
    report.toolsByPattern[pid] = (await q(`
      MATCH (p:ActivationPattern {id: $patternId})-[:ASSOCIATED_WITH]->(e:Emotion)
      MATCH (tc:TherapyConcept)-[r:ADDRESSES|REDUCES|TARGETS]->(e)
      WHERE tc.id STARTS WITH 'dbt_'
      WITH tc, count(DISTINCT e) as relevanceScore
      ORDER BY relevanceScore DESC
      LIMIT 2
      RETURN tc.id AS id, tc.appToolId AS appToolId, relevanceScore`, { patternId: pid }))
      .map(r => ({ id: r.id, appToolId: r.appToolId, score: toNum(r.relevanceScore) }));
  }
  // Emotions a user can reach via "related" suggestions (graph names) that DO have pattern edges
  report.relatedPathEmotionsWithEdges = [...new Set(assoc.map(a => a.e))].sort();
  // User data (counts only; no user content read)
  const one = async c => toNum((await q(c))[0].n);
  report.userData = {
    users: await one(`MATCH (u:User) RETURN count(u) AS n`),
    checkIns: await one(`MATCH (c:CheckIn) RETURN count(c) AS n`),
    checkInsWithoutUser: await one(`MATCH (c:CheckIn) WHERE NOT ( (:User)-[:LOGGED]->(c) ) RETURN count(c) AS n`),
    checkInsByPattern: (await q(`MATCH (c:CheckIn) RETURN coalesce(c.patternId, c.activationPattern, c.pattern, '(none)') AS p, count(*) AS n ORDER BY n DESC`)).map(r => ({ pattern: r.p, n: toNum(r.n) })),
    toolUsage: await one(`MATCH (t:ToolUsage) RETURN count(t) AS n`),
    sessions: (await q(`MATCH (s) WHERE any(l IN labels(s) WHERE l ENDS WITH 'Session') RETURN labels(s)[0] AS label, count(*) AS n, sum(CASE WHEN NOT ( (:User)-[:COMPLETED_SESSION]->(s) ) THEN 1 ELSE 0 END) AS withoutUser`)).map(r => ({ label: r.label, n: toNum(r.n), withoutUser: toNum(r.withoutUser) })),
  };
  report.practiceSkills = {
    nodes: await one(`MATCH (k:PracticeSkill) RETURN count(k) AS n`),
    contentEdges: await one(`MATCH (:PracticeSkill)-[r:PRACTICES|SUPPORTED_BY]->() RETURN count(r) AS n`),
    userPracticedEdges: await one(`MATCH ()-[r:PRACTICED]->() RETURN count(r) AS n`),
  };
  report.checkInProperties = (await q(`MATCH (c:CheckIn) WITH c LIMIT 200 UNWIND keys(c) AS k RETURN k, count(*) AS n ORDER BY k`)).map(r => ({ key: r.k, n: toNum(r.n) }));
} catch (e) {
  report.error = String(e && e.message || e);
} finally {
  await session.close(); await driver.close();
}
writeFileSync(resolve(root, 'scripts/.verify-live-routing-report.json'), JSON.stringify(report, null, 2));
if (report.error) { console.error('Error:', report.error); process.exit(1); }
console.log(`Patterns in live graph: ${report.patterns.length}`);
console.log(`Unpleasant grid names: ${report.grid.unpleasantNames}; exist as Emotion nodes: ${report.grid.namesThatExistAsEmotionNodes}; have any pattern edge: ${report.grid.namesWithAnyPatternEdge.length}`);
console.log('Single-emotion check-in → winning pattern:', report.grid.winnerDistribution);
const ga = report.gridViaAliases;
console.log(`Through SCORES_AS aliases (E4-6): ${ga.aliasEdges} alias edges; ${ga.namesReachingACandidate}/${report.grid.unpleasantNames} names reach a pattern` +
  (ga.namesNotReaching.length ? ` (not: ${ga.namesNotReaching.join(', ')})` : ''));
console.log('  winning pattern via aliases:', ga.winnerDistribution);
console.log('  patterns reachable by one grid word:', ga.patternsWon);
console.log('ASSOCIATED_WITH edges:', report.associatedWith);
console.log('Duplicate relationships:', report.duplicateRelationships.length ? report.duplicateRelationships : 'none');
console.log('Duplicate nodes:', report.duplicateNodes.length ? report.duplicateNodes : 'none');
console.log('Tools by pattern:', Object.fromEntries(Object.entries(report.toolsByPattern).map(([k,v])=>[k, v.map(x=>x.appToolId||x.id).join(', ')||'(none)'])));
console.log('User data:', JSON.stringify(report.userData));
console.log('Practice skills:', report.practiceSkills);
console.log('Duplicate relationships (FELT_AS keyed on region):', report.duplicateRelationshipsKeyed.length ? report.duplicateRelationshipsKeyed : 'none');
console.log('Report written to scripts/.verify-live-routing-report.json');
if (summaryPath) {
  writeFileSync(resolve(process.cwd(), summaryPath), JSON.stringify(routingSummary(report), null, 2) + '\n');
  console.log(`Routing summary written to ${summaryPath}`);
}
if (baseline) {
  const { changes, warnings } = diffRouting(baseline, report, { grid });
  for (const w of warnings) console.log(`~ ${w.what}: ${w.note}`);
  if (changes.length) {
    console.error(`\nRouting differs from ${comparePath} (${changes.length}):`);
    for (const c of changes) console.error(`  ✗ ${c.what}\n      before ${JSON.stringify(c.before)}\n      after  ${JSON.stringify(c.after)}`);
    process.exit(3);
  }
  console.log(`\nRouting identical to ${comparePath}.`);
}
