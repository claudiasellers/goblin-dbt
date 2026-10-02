// E4-1: today's check-in routing, pinned. The pure engine (functions/src/recommendation/*) runs over
// a fixture replayed from schema/*.cypher, and that fixture is checked against the live graph's
// committed summary (tests/fixtures/live-routing-2026-09-30.json, verified 2026-09-30).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";
import { graph, fixtureDeps } from "./lib/recommendationFixture.mjs";
import { routingSummary, diffRouting, parseGrid } from "../scripts/lib/liveRoutingReport.mjs";

const { getStateAndToolsHandler } = await importTs("functions/src/recommendation/handler.ts");
const scoring = await importTs("functions/src/recommendation/patternScoring.ts");
const { legacyTools } = await importTs("functions/src/recommendation/legacy.ts");

const live = JSON.parse(readFileSync("tests/fixtures/live-routing-2026-09-30.json", "utf8"));
const grid = parseGrid(readFileSync("src/data/emotions.ts", "utf8"));
const run = (input, g = graph) => getStateAndToolsHandler(input, fixtureDeps(g));
const ids = (r) => r.tools.map((t) => t.id);

test("the fixture is fresh: scripts/recommendations/fixture.py replays the schema to the committed file", (t) => {
  let out;
  try { out = execFileSync("python3", ["scripts/recommendations/fixture.py", "--stdout"], { encoding: "utf8", maxBuffer: 32 << 20 }); } catch { t.skip("python3 unavailable"); return; }
  assert.equal(out, readFileSync("tests/fixtures/recommendation-graph.json", "utf8"));
});

// Deliberate grid changes since the live check (each with its plan id). Everything else must match.
const MOVED = { "high-unpleasant:numb": ["acute_alarm", null], "low-unpleasant:numb": [null, "conservation_freeze"] }; // E4-5
const expectedWinner = (key) => (key in MOVED ? MOVED[key][1] : live.grid.winners[key]);

test("the schema-derived fixture routes exactly like the live graph did on 2026-09-30 (bar the deliberate moves)", () => {
  const { changes, warnings } = diffRouting(live, graph, { grid });
  const unexpected = changes.filter((c) => !(c.what === "grid.winnerDistribution" || c.what.replace("grid.winner ", "") in MOVED));
  assert.deepEqual(unexpected, []);
  assert.deepEqual(changes.filter((c) => c.what.startsWith("grid.winner ")).map((c) => [c.what, c.before, c.after]),
    Object.entries(MOVED).map(([k, [a, b]]) => [`grid.winner ${k}`, a, b]));
  assert.deepEqual(warnings, [], "tie order is pinned (concept id), and matches live");
  const s = routingSummary(graph, { grid });
  // + the 18 calm-side grid words synced into the graph in Oct 2026 (tests/emotion-wheel-sync.test.mjs);
  // pleasant words never reach routing, so no winner moves.
  assert.equal(s.emotionNodeCount, live.emotionNodeCount + 18);
  assert.deepEqual(s.grid.winnerDistribution, { "high-unpleasant → acute_alarm": 48, "low-unpleasant → conservation_freeze": 37 });
});

test("the TS engine agrees with the live check for every one-word grid check-in (85 names; no aliases, as live)", async () => {
  const unpleasant = grid.filter((g) => g.quadrant.endsWith("unpleasant"));
  assert.equal(unpleasant.length, 85);
  const asLive = { ...graph, aliases: {} }; // live had no SCORES_AS aliases on 2026-09-30 (E4-6 adds them)
  for (const g of unpleasant) {
    const r = await run({ quadrant: g.quadrant, emotions: [g.name] }, asLive);
    assert.equal(r.pattern.id, expectedWinner(`${g.quadrant}:${g.sent}`), g.name);
    assert.equal(r.pattern.confidence, 0.25, `${g.name}: no word reaches a pattern (F1)`);
  }
});

test("legacy tools per pattern equal the live tools query (top two, ties by concept id)", async () => {
  for (const [pid, expected] of Object.entries(live.toolsByPattern)) {
    const rows = await fixtureDeps().legacyTools(pid);
    assert.deepEqual(legacyTools(rows).map((t) => t.id), expected.map((t) => t.appToolId ?? t.id.replace(/^dbt_/, "").replace(/_/g, "-")), pid);
  }
});

// ---- Goldens (E4 §5), legacy ranker ----

test("golden: high-unpleasant grid word → acute_alarm, Cool Down (TIPP, 'medium') + Do the Opposite; no flag", async () => {
  const r = await run({ quadrant: "high-unpleasant", emotions: ["Anxious"] });
  assert.equal(r.pattern.id, "acute_alarm");
  assert.deepEqual(r.tools.map((t) => [t.id, t.name, t.relevance]), [["cool-down", "TIPP", "medium"], ["opposite-action", "Opposite Action", "relevant"]]);
  assert.equal(r.safetyFlag, undefined);
  assert.equal(r.guidedActivity, undefined);
});

test("golden: low-unpleasant, answers skipped → conservation_freeze, OA, gentle movement, no flag", async () => {
  const r = await run({ quadrant: "low-unpleasant", emotions: ["Empty"] });
  assert.equal(r.pattern.id, "conservation_freeze");
  assert.deepEqual(ids(r), ["opposite-action"]);
  assert.deepEqual(r.guidedActivity, { activityId: "gentle-movement", patternId: "conservation_freeze" });
  assert.equal(r.safetyFlag, undefined, "low-unpleasant is never flagged");
});

test("golden: discriminating answers decide low-unpleasant (looping → rumination; numb body → dissociation)", async () => {
  const rum = await run({ quadrant: "low-unpleasant", emotions: ["Sad"], discriminatingAnswers: [{ questionId: "lu_mind_quality", responseId: "lu_mind_looping" }] });
  assert.equal(rum.pattern.id, "rumination_loop");
  assert.equal(rum.safetyFlag, undefined, "rumination's crisis flag is skipped for low-unpleasant (pinned)");
  const dis = await run({ quadrant: "low-unpleasant", emotions: ["Empty"], discriminatingAnswers: [{ questionId: "lu_body_quality", responseId: "lu_body_numb" }] });
  assert.equal(dis.pattern.id, "dissociation_overmodulation");
  assert.deepEqual(ids(dis), ["opposite-action"]);
  assert.equal(dis.guidedActivity.activityId, "sensory-anchor");
});

test("golden: related-suggestion ids reach patterns; flooding carries the crisis flag", async () => {
  const r = await run({ quadrant: "high-unpleasant", emotions: ["panic", "overwhelm", "anger", "sadness"] });
  assert.equal(r.pattern.id, "emotional_flooding");
  assert.equal(r.safetyFlag?.type, "crisis");
  assert.equal(r.safetyFlag?.id, "crisis_self_harm");
  assert.deepEqual(ids(r), ["opposite-action", "cool-down"], "tie 3/3 in concept-id order, as live");
});

test("golden: no emotions → intensity heuristic (high → acute_alarm; low → conservation_freeze)", async () => {
  assert.equal((await run({ quadrant: "high-unpleasant", intensity: { x: 0.2, y: 0.9 } })).pattern.id, "acute_alarm");
  assert.equal((await run({ quadrant: "low-unpleasant", intensity: { x: 0.2, y: 0.1 } })).pattern.id, "conservation_freeze");
});

test("golden: pleasant quadrants → positive_state without a query", async () => {
  const calls = [];
  const r = await getStateAndToolsHandler({ quadrant: "high-pleasant", emotions: ["Joyful"] }, fixtureDeps(graph, calls));
  assert.equal(r.pattern.id, "positive_state");
  assert.deepEqual(r.tools, []);
  assert.deepEqual(calls, []);
});

test("golden: chronic_vigilance has no legacy card (the gap E4-3 closes)", async () => {
  const rows = await fixtureDeps().legacyTools("chronic_vigilance");
  assert.deepEqual(legacyTools(rows), []);
});

test("pure scoring: words / sent × 0.4 + strongest bonus; answers × 2; ties keep candidate order", () => {
  const cands = scoring.candidatesFor("high-unpleasant");
  const s = scoring.scorePatterns({
    candidates: cands, emotionIds: ["anxiety", "x"],
    emotionRows: [{ patternId: "acute_alarm", emotionId: "anxiety", strength: "moderate" }, { patternId: "chronic_vigilance", emotionId: "anxiety", strength: null }],
    responseRows: [{ patternId: "social_threat_shame", weight: 0.1 }],
  });
  assert.equal(s.acute_alarm, 0.25 + 0.2 + 0.2);
  assert.equal(s.chronic_vigilance, 0.25 + 0.2 + 0.1);
  assert.equal(s.social_threat_shame, 0.25 + 0.2);
  assert.equal(scoring.rankPatterns({ a: 0.25, b: 0.25 }).primaryId, "a");
  assert.equal(scoring.normaliseEmotionId("Let down"), "let_down");
  assert.deepEqual(scoring.candidatesFor("nope"), []);
});

test("the handler rejects a missing quadrant; the safety seam is one module", async () => {
  await assert.rejects(getStateAndToolsHandler({}, fixtureDeps()), /Quadrant is required/);
  const handler = readFileSync("functions/src/recommendation/handler.ts", "utf8");
  assert.doesNotMatch(handler, /TRIGGERS_SAFETY|firebase-|neo4j-driver/, "pure: no queries, no firebase");
  assert.match(readFileSync("functions/src/safety/checkinSafetyFlag.ts", "utf8"), /LIMIT 1/);
});
