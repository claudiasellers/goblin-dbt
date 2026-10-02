// PLEASE ("Running low", app tool please-skill): generated content, the pure flow logic, and the
// joins that make it reachable (Opposite Action's alternative skill, Problem Solve links, tools.ts).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";
import { LOAD_ORDER } from "../scripts/load-graph.mjs";
import { FLOW_DOC_FILES } from "../scripts/voice-lint.mjs";

const please = await importTs("src/lib/please.ts");
const toolsTs = await importTs("src/data/tools.ts");
const cypher = readFileSync("schema/please.cypher", "utf8");
const content = JSON.parse(JSON.parse(cypher.match(/f\.contentJson = (".*");/)[1]));

test("generated file is fresh: please", (t) => {
  let out;
  try { out = execFileSync("python3", ["scripts/please/build.py"], { encoding: "utf8" }); } catch { t.skip("python3 unavailable"); return; }
  assert.equal(out.trim(), cypher.trim());
});

test("types mirror: src/data/pleaseTypes.ts equals functions/src/please/types.ts (after the header)", () => {
  const body = (f) => readFileSync(f, "utf8").split("\n").slice(4).join("\n");
  assert.equal(body("src/data/pleaseTypes.ts"), body("functions/src/please/types.ts"));
});

test("version matches the callable; loaded after its source; constraint; voice-linted", () => {
  assert.equal(content.version, "please-v1");
  assert.match(readFileSync("functions/src/please/index.ts", "utf8"), /PLEASE_VERSION = 'please-v1'/);
  assert.ok(LOAD_ORDER.indexOf("please.cypher") > LOAD_ORDER.indexOf("invalidation-recovery.cypher"));
  assert.match(readFileSync("schema/constraints.cypher", "utf8"), /FOR \(n:PleaseFlow\) REQUIRE n\.id IS UNIQUE/);
  assert.ok(FLOW_DOC_FILES.includes("schema/please.cypher"));
  assert.match(cypher, /MATCH \(c:TherapyConcept \{id: "dbt_please"\}\)\nSET c\.appToolId = "please-skill";/);
});

test("content: the five PLEASE areas in order; every factor's options exist; no cheer", () => {
  assert.deepEqual(content.areas.map((a) => a.letter), ["PL", "E", "A", "S", "E"]);
  const now = new Set(content.now.map((o) => o.id));
  const later = new Set(content.later.map((o) => o.id));
  for (const f of content.factors) {
    assert.ok(content.areas.some((a) => a.id === f.area), f.id);
    for (const id of f.now) assert.ok(now.has(id), `${f.id} now ${id}`);
    for (const id of f.later) assert.ok(later.has(id), `${f.id} later ${id}`);
  }
  for (const a of content.areas) assert.ok(content.factors.some((f) => f.area === a.id), `${a.id} has factors`);
  assert.doesNotMatch(JSON.stringify(content), /!|\bshould\b|\bjust\b/i);
});

test("the tool exists where the graph already points: OA's alternative skill and Problem Solve", () => {
  assert.ok(toolsTs.getToolById("please-skill"), "tools.ts");
  assert.match(readFileSync("src/pages/ToolPage.tsx", "utf8"), /'please-skill': Please/);
  const oa = readFileSync("schema/opposite-action-data.cypher", "utf8");
  for (const id of ["tired", "sleepy", "bored", "unfocused", "apathetic", "indifferent"]) {
    const row = oa.match(new RegExp(`\\{id: "${id}",[^\\n]*\\}`))[0];
    assert.match(row, /alt: "please-skill"/, id);
    assert.doesNotMatch(row, /vulnerability factors|Physical depletion/, `${id}: user-voice note`);
  }
  assert.match(readFileSync("schema/problem-solve-data.cypher", "utf8"), /please-skill/);
});

test("orderAreas: a hint word puts its area first, otherwise acronym order", () => {
  assert.deepEqual(please.orderAreas(content).map((a) => a.id), ["illness", "eating", "substances", "sleep", "exercise"]);
  assert.deepEqual(please.orderAreas(content, ["tired"]).map((a) => a.id), ["sleep", "illness", "eating", "substances", "exercise"]);
  assert.deepEqual(please.orderAreas(content, ["sad", "bored"])[0].id, "exercise");
  assert.equal(please.orderAreas(content, ["sad"])[0].id, "illness");
});

test("nowOptions: each picked factor's best option first, deduped, capped, then the always ones", () => {
  const none = please.nowOptions(content, []).map((o) => o.id);
  assert.deepEqual(none, content.nowAlways);
  const ids = please.nowOptions(content, ["short_sleep", "not_eaten"]).map((o) => o.id);
  assert.deepEqual(ids.slice(0, 2).sort(), ["eat_protein", "rest_alarm"], "round-robin: both factors' first choices lead");
  assert.equal(new Set(ids).size, ids.length);
  const all = please.nowOptions(content, content.factors.map((f) => f.id)).map((o) => o.id);
  assert.equal(all.filter((id) => !content.nowAlways.includes(id)).length, please.OPTION_CAP);
  for (const id of content.nowAlways) assert.ok(all.includes(id), id);
});

test("laterOptions: sleep factors lead with sleep hygiene; always ones are not duplicated", () => {
  const ids = please.laterOptions(content, ["short_sleep"]).map((o) => o.id);
  assert.equal(ids[0], "same_wake");
  assert.equal(ids.filter((x) => x === "same_wake").length, 1);
  assert.ok(ids.includes("cope_ahead"));
});

test("checkVerdict: any feeling-pointing statement wins; nothing picked is body", () => {
  assert.equal(please.checkVerdict(content.check, []), "body");
  assert.equal(please.checkVerdict(content.check, ["rest_restores"]), "body");
  assert.equal(please.checkVerdict(content.check, ["cant_tell"]), "body");
  assert.equal(please.checkVerdict(content.check, ["rest_flat"]), "feeling");
  assert.equal(please.checkVerdict(content.check, ["rest_restores", "after_event"]), "feeling");
});

test("toggle and ownText", () => {
  assert.deepEqual(please.toggle(["a"], "a"), []);
  assert.deepEqual(please.toggle(["a", "b"], "c", 2), ["b", "c"]);
  assert.equal(please.ownText("  hungry \n and   cold "), "hungry and cold");
  assert.equal(please.ownText("x".repeat(500)).length, 140);
});
