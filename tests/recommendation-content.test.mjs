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
const tool = (r) => graph.concepts[r.conceptId]?.appToolId;
const toolIds = [...readFileSync("src/data/tools.ts", "utf8").matchAll(/^\s+id: '([a-z-]+)',/gm)].map((m) => m[1]);

test("generated file is fresh: scripts/recommendations/build.py", (t) => {
  let out;
  try { out = execFileSync("python3", ["scripts/recommendations/build.py"], { encoding: "utf8" }); } catch { t.skip("python3 unavailable"); return; }
  assert.equal(out.trim(), cypher.trim());
});

test("rf-v2 (Oct 2026 review): one row set per pattern for every band but flooded, flooded as approved, gates and per-word rules; every id unique", () => {
  assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
  for (const r of rows) {
    assert.equal(r.version, "rf-v2");
    assert.match(r.id, /^rf_[a-z_]+_(default|backup|flooded|addresses|none_named|words_[a-z-]+|planned)_[a-z-]+$/);
    assert.deepEqual(r.surface, ["checkin_result"]);
    assert.equal(r.tier, "quality_of_life");
    assert.ok(r.rationale && r.rationale.length > 10, r.id);
    assert.ok(r.bands.includes("flooded") ? r.bands.length === 1 : r.bands.join() === "steady,stirred", `${r.id}: no capacity split but flooded`);
    assert.equal(r.emotionGate === "words", (r.words || []).length > 0, `${r.id}: words go with a words gate`);
  }
  const table = rows.filter((r) => !r.emotionGate);
  assert.equal(new Set(table.map((r) => r.patternId)).size, 9, "nine patterns (Ready to fight included)");
  assert.ok(!table.some((r) => r.patternId === "emotional_flooding" && !r.bands.includes("flooded")), "Flooded is always the flooded band");
  assert.ok(!rows.some((r) => r.patternId === "grief_yearning"));
  assert.equal(rows.filter((r) => r.emotionGate === "addresses").length, 8, "a hurt word puts Recover first on every pattern but Flooded (R7, everywhere)");
  assert.equal(rows.filter((r) => r.emotionGate === "none_named").length, 4);
});

test("rows are drafts until signed off; the policy can only be enabled once every active row is approved (R7, D-02)", () => {
  assert.ok(rows.every((r) => ["draft", "approved"].includes(r.reviewStatus)), "reviewStatus comes from SIGNED_OFF in content.py");
  const p = rawGraph.routingPolicy;
  const { enabled, reviewStatus, ...shape } = p;
  assert.deepEqual(shape, { version: "rf-v2", maxCards: 2, fallbackConceptId: "se_orienting", defaultBand: "stirred", floodedPatterns: ["emotional_flooding"] });
  assert.ok(["draft", "approved"].includes(reviewStatus));
  if (enabled) {
    assert.equal(reviewStatus, "approved", "sign the policy off (SIGNED_OFF['checkin_result']) before enabling it");
    for (const r of rawGraph.recommendedFor.filter((x) => x.active !== false)) assert.equal(r.reviewStatus, "approved", `${r.id} is active but still a draft`);
  }
});

test("D-02 defaults kept: Urge Surfing switched off, no DEAR MAN rows, Pause active; planned tools are written switched off", () => {
  const planned = ["dbt_accepts", "dbt_check_facts", "dbt_cope_ahead", "dbt_fast", "dbt_give", "dbt_please", "dbt_radical_acceptance", "dbt_wise_mind"];
  for (const r of rows) {
    assert.notEqual(r.conceptId, "dbt_dear_man", r.id);
    const off = r.conceptId === "urge_surfing" || planned.includes(r.conceptId);
    assert.equal(r.active, !off, r.id);
  }
  assert.deepEqual([...new Set(rows.filter((r) => !r.active).map((r) => r.conceptId))].sort(), [...planned, "urge_surfing"].sort());
  // Wise mind's module ships before its row is signed off: it has its app tool id, and the watchful row
  // stays switched off and a draft (Claudia signs it off separately; build.py refuses an active draft).
  for (const c of planned.filter((x) => x !== "dbt_wise_mind")) assert.ok(!graph.concepts[c]?.appToolId, `${c} has no app module yet`);
  assert.equal(graph.concepts.dbt_wise_mind.appToolId, "wise-mind");
  const wise = rows.filter((r) => r.conceptId === "dbt_wise_mind");
  assert.deepEqual(wise.map((r) => [r.id, r.active, r.reviewStatus]), [["rf_chronic_vigilance_words_watchful_wise-mind", false, "draft"]]);
  assert.ok(rows.some((r) => tool(r) === "pause" && r.active));
});

test("tags (WMP-04 v0 side, skillKind, direction) on the 10 app-tool concepts; D-13: FTF acceptance, Cool Down both", () => {
  const tags = Object.fromEntries(Object.values(graph.concepts).filter((c) => c.side).map((c) => [c.appToolId, [c.side, c.skillKind, c.direction]]));
  assert.deepEqual(tags, {
    "cool-down": ["both", "body", "down"], pause: ["both", "hold", "down"], "five-senses": ["acceptance", "orient", "orient"],
    "urge-surfing": ["acceptance", "hold", "neutral"], "opposite-action": ["change", "change", "neutral"],
    "find-the-feeling": ["acceptance", "naming", "neutral"], "problem-solve": ["change", "change", "neutral"],
    "dear-man": ["change", "relational", "neutral"], "recovering-from-invalidation": ["both", "relational", "neutral"],
    "wise-mind": ["both", "naming", "neutral"],
  });
  // wise-mind: its content ships first (wise-mind-content); the tool itself with the next change.
  for (const id of Object.keys(tags).filter((x) => x !== "wise-mind")) assert.ok(toolIds.includes(id), id);
});

test("blank patterns are never calmed and flooded rows are body / orient only (defence in depth over the engine)", () => {
  const blank = Object.entries(graph.patterns).filter(([, p]) => p.blank).map(([id]) => id).sort();
  assert.deepEqual(blank, ["conservation_freeze", "dissociation_overmodulation", "reward_drive_low"]);
  for (const r of rows) {
    if (graph.patterns[r.patternId].blank) assert.notEqual(r.direction, "down", r.id);
    if (r.bands.includes("flooded")) assert.ok(["body", "orient"].includes(graph.concepts[r.conceptId].skillKind), r.id);
    if (r.active) assert.ok(graph.concepts[r.conceptId]?.appToolId, `${r.id}: an active row names an app tool`);
  }
  const oa = rows.find((r) => r.id === "rf_conservation_freeze_default_opposite-action");
  assert.equal(oa.requiresPrior, "up_regulation");
  assert.equal(oa.direction, "up");
  assert.equal(oa.priority, 2);
});

test("Do the Opposite is a pattern-level pick in 4 of 9 patterns (was every high-unpleasant result); word rules add it where the review asked", () => {
  const patterns = new Set(rows.filter((r) => !r.emotionGate && tool(r) === "opposite-action").map((r) => r.patternId));
  assert.deepEqual([...patterns].sort(), ["acute_alarm", "conservation_freeze", "reward_drive_low", "social_threat_shame"]);
});

test("loads last (after the concepts it tags); MERGE-only; prunes stale rf-v2 ids and every rf-v1 row; no DDL (R13, R14)", () => {
  assert.equal(LOAD_ORDER.at(-1), "recommended-for.cypher");
  assert.ok(LOAD_ORDER.indexOf("recommended-for.cypher") > LOAD_ORDER.indexOf("find-the-feeling.cypher"));
  assert.ok(!stmts.some((s) => /^CREATE\b/.test(s)));
  assert.match(readFileSync("schema/constraints.cypher", "utf8"), /routing_policy_id IF NOT EXISTS FOR \(rp:RoutingPolicy\) REQUIRE rp\.id IS UNIQUE/);
  const prune = stmts.find((s) => s.startsWith("MATCH (:TherapyConcept)-[r:RECOMMENDED_FOR]") && s.includes("NOT r.id IN"));
  assert.match(prune, /WHERE r\.version = "rf-v2" AND NOT r\.id IN \[/);
  assert.ok(stmts.some((s) => /WHERE r\.version = "rf-v1"\nDELETE r$/.test(s)), "the rf-v1 rows (old ids) go");
  const kept = JSON.parse(prune.match(/NOT r\.id IN (\[.*\])/s)[1]);
  assert.deepEqual(kept.sort(), rows.map((r) => r.id).sort());
});
