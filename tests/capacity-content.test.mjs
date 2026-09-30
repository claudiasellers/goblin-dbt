// A4-1: capacity content (schema/capacity.cypher) and its projections into FTF's flow document.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { LOAD_ORDER, splitStatements } from "../scripts/load-graph.mjs";

const cypher = readFileSync("schema/capacity.cypher", "utf8");
const stmts = splitStatements(cypher);
const json = (s, prop) => JSON.parse(JSON.parse(s.match(new RegExp(`${prop} = (".*?[^\\\\]")(?:,|;|$)`, "s"))[1]));
const probe = json(stmts.find((s) => s.startsWith("MERGE (p:CapacityProbe")), "p\\.contentJson");
const prim = (id) => json(stmts.find((s) => s.startsWith(`MERGE (h:HandoffPrimitive {id: "${id}"})`)), "h\\.copyJson");
const flowOf = (file) => JSON.parse(JSON.parse(readFileSync(file, "utf8").match(/f\.contentJson = (".*");/)[1]));
const ftf = flowOf("schema/find-the-feeling.cypher");
const recover = flowOf("schema/invalidation-recovery.cypher");

for (const [name, script, file] of [
  ["capacity", "scripts/capacity/build.py", "schema/capacity.cypher"],
  ["find-the-feeling (byte-identical after the import)", "scripts/find-the-feeling/build.py", "schema/find-the-feeling.cypher"],
]) {
  test(`generated file is fresh: ${name}`, (t) => {
    let out;
    try { out = execFileSync("python3", [script], { encoding: "utf8" }); } catch { t.skip("python3 unavailable"); return; }
    assert.equal(out.trim(), readFileSync(file, "utf8").trim());
  });
}

test("one probe source: FTF's copy.capacity and bandIntensity equal the capacity default wording", () => {
  assert.equal(probe.version, "capacity-v1");
  assert.equal(probe.freshMinutes, 20);
  assert.deepEqual(ftf.copy.capacity, probe.probe.wordings.default);
  assert.deepEqual(ftf.bandIntensity, probe.bandIntensity);
  assert.deepEqual(Object.keys(probe.probe.wordings.relational.options), ["steady", "stirred", "flooded"]);
  assert.ok(probe.probe.wordings.relational.someone, "someone fallback (no Person in Phase A)");
  assert.equal(probe.probe.cantTell, "I can't tell");
});

test("hand-off reread is the canonical then-vs-now, down wording (R3)", () => {
  assert.deepEqual(Object.keys(probe.handoff.reread.options), ["worse", "same", "better", "much_better"]);
  assert.deepEqual(Object.values(probe.handoff.reread.options), ["Louder", "About the same", "Quieter", "Much quieter"]);
  assert.deepEqual(probe.handoff.later.options.map((o) => o.id), ["1h", "evening", "tomorrow"]);
  assert.doesNotMatch(JSON.stringify(probe.handoff), /!|\bshould\b/);
});

test("primitive copy doesn't drift from the reviewed Recover breathe / FTF orient steps", () => {
  const sigh = prim("sigh");
  for (const k of ["title", "sub", "phases", "cycles", "start", "skip", "done"]) assert.deepEqual(sigh[k], recover.copy.breathe[k], k);
  assert.deepEqual(prim("orient"), ftf.copy.orient);
});

test("band rules: DEAR MAN only in Phase A (steady full, stirred full + heads-up, flooded hand-off)", () => {
  const rules = stmts.filter((s) => s.startsWith("MERGE (r:BandRule")).map((s) => s.match(/\{id: "([^"]+)"\}[\s\S]*r\.mode = "(\w+)", r\.copyJson = (".*")/).slice(1));
  assert.deepEqual(rules.map(([id, mode, c]) => [id, mode, JSON.parse(JSON.parse(c))]), [
    ["dear-man:steady", "full", {}], ["dear-man:stirred", "full", { headsUp: "summary" }], ["dear-man:flooded", "handoff", {}],
  ]);
});

test("loads after the files it links to; no DDL in the file (R13)", () => {
  const i = LOAD_ORDER.indexOf("capacity.cypher");
  assert.ok(i > LOAD_ORDER.indexOf("find-the-feeling.cypher") && i > LOAD_ORDER.indexOf("invalidation-recovery.cypher"));
  assert.ok(!stmts.some((s) => /^CREATE (CONSTRAINT|INDEX)/.test(s)));
  assert.match(cypher, /p\.reviewStatus = "draft"/);
});
