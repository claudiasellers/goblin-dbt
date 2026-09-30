// E4-2: RECOMMENDED_FOR content (schema/recommended-for.cypher, generated from
// scripts/recommendations/content.py), as replayed into tests/fixtures/recommendation-graph.json.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { LOAD_ORDER, splitStatements } from "../scripts/load-graph.mjs";
import { graph, rawGraph } from "./lib/recommendationFixture.mjs";

const cypher = readFileSync("schema/recommended-for.cypher", "utf8");
const stmts = splitStatements(cypher);
const rows = graph.recommendedFor;
const tool = (r) => graph.concepts[r.conceptId].appToolId;
const toolIds = [...readFileSync("src/data/tools.ts", "utf8").matchAll(/^\s+id: '([a-z-]+)',/gm)].map((m) => m[1]);

test("generated file is fresh: scripts/recommendations/build.py", (t) => {
  let out;
  try { out = execFileSync("python3", ["scripts/recommendations/build.py"], { encoding: "utf8" }); } catch { t.skip("python3 unavailable"); return; }
  assert.equal(out.trim(), cypher.trim());
});

test("55 rows: 9 patterns × 3 bands (47 cells' rows) + 8 emotion-gated rows, every id unique and rf-v1", () => {
  assert.equal(rows.length, 55);
  assert.equal(new Set(rows.map((r) => r.id)).size, 55);
  assert.equal(rows.filter((r) => r.emotionGate).length, 8);
  for (const r of rows) {
    assert.equal(r.version, "rf-v1");
    assert.match(r.id, /^rf_[a-z_]+_(steady|stirred|flooded|addresses|none_named)_[a-z-]+$/);
    assert.ok(r.id.endsWith(`_${tool(r)}`), r.id);
    assert.deepEqual(r.surface, ["checkin_result"]);
    assert.equal(r.tier, "quality_of_life");
    assert.ok(r.rationale && r.rationale.length > 10, r.id);
  }
  const patterns = new Set(rows.filter((r) => !r.emotionGate).map((r) => r.patternId));
  assert.equal(patterns.size, 9);
  assert.ok(!patterns.has("grief_yearning"));
});

test("rows are drafts until signed off; the policy can only be enabled once every active row is approved (R7, D-02)", () => {
  assert.ok(rows.every((r) => ["draft", "approved"].includes(r.reviewStatus)), "reviewStatus comes from SIGNED_OFF in content.py");
  const p = rawGraph.routingPolicy;
  const { enabled, reviewStatus, ...shape } = p;
  assert.deepEqual(shape, { version: "rf-v1", maxCards: 2, fallbackConceptId: "se_orienting", defaultBand: "stirred", floodedPatterns: ["emotional_flooding"] });
  assert.ok(["draft", "approved"].includes(reviewStatus));
  if (enabled) {
    assert.equal(reviewStatus, "approved", "sign the policy off (SIGNED_OFF['checkin_result']) before enabling it");
    for (const r of rawGraph.recommendedFor.filter((x) => x.active !== false)) assert.equal(r.reviewStatus, "approved", `${r.id} is active but still a draft`);
  }
});

test("D-02 defaults: Urge Surfing inactive, no DEAR MAN rows, reactive_aggression authored, Pause active", () => {
  for (const r of rows) {
    assert.notEqual(tool(r), "dear-man", r.id);
    assert.equal(r.active, tool(r) !== "urge-surfing", r.id);
  }
  assert.ok(rows.some((r) => tool(r) === "urge-surfing"), "authored, just switched off");
  assert.ok(rows.some((r) => tool(r) === "pause" && r.active));
  assert.equal(rows.filter((r) => r.patternId === "reactive_aggression").length, 6);
});

test("tags (WMP-04 v0 side, skillKind, direction) on the 9 app-tool concepts; D-13: FTF acceptance, Cool Down both", () => {
  const tags = Object.fromEntries(Object.values(graph.concepts).filter((c) => c.side).map((c) => [c.appToolId, [c.side, c.skillKind, c.direction]]));
  assert.deepEqual(tags, {
    "cool-down": ["both", "body", "down"], pause: ["both", "hold", "down"], "five-senses": ["acceptance", "orient", "orient"],
    "urge-surfing": ["acceptance", "hold", "neutral"], "opposite-action": ["change", "change", "neutral"],
    "find-the-feeling": ["acceptance", "naming", "neutral"], "problem-solve": ["change", "change", "neutral"],
    "dear-man": ["change", "relational", "neutral"], "recovering-from-invalidation": ["both", "relational", "neutral"],
  });
  for (const id of Object.keys(tags)) assert.ok(toolIds.includes(id), id);
});

test("blank patterns are never calmed and flooded rows are body / orient only (defence in depth over the engine)", () => {
  const blank = Object.entries(graph.patterns).filter(([, p]) => p.blank).map(([id]) => id).sort();
  assert.deepEqual(blank, ["conservation_freeze", "dissociation_overmodulation", "reward_drive_low"]);
  for (const r of rows) {
    if (graph.patterns[r.patternId].blank) assert.notEqual(r.direction, "down", r.id);
    if (r.bands.includes("flooded")) assert.ok(["body", "orient"].includes(graph.concepts[r.conceptId].skillKind), r.id);
  }
  const oa = rows.find((r) => r.id === "rf_conservation_freeze_steady_opposite-action");
  assert.equal(oa.requiresPrior, "up_regulation");
  assert.equal(oa.direction, "up");
  assert.equal(oa.priority, 2);
});

test("Opposite Action is in 6 of 27 cells (was every high-unpleasant result)", () => {
  const cells = new Set(rows.filter((r) => !r.emotionGate && tool(r) === "opposite-action").map((r) => `${r.patternId}:${r.bands[0]}`));
  assert.equal(cells.size, 6);
});

test("loads last (after the concepts it tags); MERGE-only; prunes stale rf-v1 ids; no DDL (R13, R14)", () => {
  assert.equal(LOAD_ORDER.at(-1), "recommended-for.cypher");
  assert.ok(LOAD_ORDER.indexOf("recommended-for.cypher") > LOAD_ORDER.indexOf("find-the-feeling.cypher"));
  assert.ok(!stmts.some((s) => /^CREATE\b/.test(s)));
  assert.match(readFileSync("schema/constraints.cypher", "utf8"), /routing_policy_id IF NOT EXISTS FOR \(rp:RoutingPolicy\) REQUIRE rp\.id IS UNIQUE/);
  const prune = stmts.find((s) => s.startsWith("MATCH (:TherapyConcept)-[r:RECOMMENDED_FOR]"));
  assert.match(prune, /WHERE r\.version = "rf-v1" AND NOT r\.id IN \[/);
  const kept = JSON.parse(prune.match(/NOT r\.id IN (\[.*\])/s)[1]);
  assert.deepEqual(kept.sort(), rows.map((r) => r.id).sort());
});
