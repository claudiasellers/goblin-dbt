import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { routingSummary, diffRouting } from "../scripts/lib/liveRoutingReport.mjs";

const baseline = JSON.parse(readFileSync("tests/fixtures/live-routing-2026-09-30.json", "utf8"));
const clone = (x) => JSON.parse(JSON.stringify(x));

test("committed live summary records the §3a facts and nothing identifying", () => {
  assert.equal(baseline.kind, "live-routing-summary");
  assert.equal(baseline.patterns.length, 10);
  assert.deepEqual(baseline.grid.winnerDistribution, {
    "high-unpleasant → acute_alarm": 49,
    "low-unpleasant → conservation_freeze": 36,
  });
  assert.deepEqual(baseline.grid.namesWithAnyPatternEdge, []);
  assert.deepEqual(baseline.associatedWith, { edges: 48, distinctPairs: 48 });
  assert.equal(baseline.duplicateRelationshipsByEndpoints, 354);
  assert.equal(baseline.duplicateNodes, 0);
  for (const k of ["host", "userData", "practiceSkills", "checkInProperties", "nodeTotals"]) assert.ok(!(k in baseline), k);
});

test("a summary compares equal to itself, and summarising is idempotent", () => {
  assert.deepEqual(diffRouting(baseline, baseline), { changes: [], warnings: [] });
  assert.deepEqual(routingSummary(baseline), baseline);
});

test("removing duplicate edges is not a routing change", () => {
  const after = clone(baseline);
  after.duplicateRelationshipsByEndpoints = 12;
  after.duplicateRelationshipsKeyed = 0;
  assert.deepEqual(diffRouting(baseline, after).changes, []);
});

test("a different tool or winner is a change; a flipped tie is only a warning", () => {
  const moved = clone(baseline);
  moved.toolsByPattern.acute_alarm = [{ id: "dbt_opposite_action", appToolId: "opposite-action", score: 2 }];
  moved.grid.winners["high-unpleasant:anxious"] = "emotional_flooding";
  const { changes } = diffRouting(baseline, moved);
  assert.deepEqual(changes.map((c) => c.what).sort(), ["grid.winner high-unpleasant:anxious", "toolsByPattern.acute_alarm"]);

  const tie = clone(baseline);
  tie.toolsByPattern.emotional_flooding.reverse();
  const r = diffRouting(baseline, tie);
  assert.deepEqual(r.changes, []);
  assert.deepEqual(r.warnings.map((w) => w.what), ["toolsByPattern.emotional_flooding"]);
});

test("the live check is read-only", () => {
  const src = readFileSync("scripts/verify-live-routing.mjs", "utf8");
  assert.match(src, /defaultAccessMode: neo4j\.session\.READ/);
  assert.doesNotMatch(src, /executeWrite|session\.run\(|\b(CREATE|MERGE|DELETE|DETACH|SET|REMOVE)\s/);
  assert.match(readFileSync(".gitignore", "utf8"), /^scripts\/\.verify-live-routing-\*\.json$/m);
});
