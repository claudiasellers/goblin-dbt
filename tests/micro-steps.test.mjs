// The micro-steps as graph content (DT-01 part 2, docs/design/first-the-body.md): scripts/micro-steps/content.py →
// schema/micro-steps.cypher → src/data/content/micro-steps.json, read by src/lib/microSteps.ts. Pinned: the schema is
// fresh, the shipped file equals the content and the schema replayed, every engine pattern has a set, the old
// hand-written frontend copy is gone, and the reader keeps the old behaviour (fallback, rotation, environment skip).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";
import { buildMicroSteps, indexGraph } from "../scripts/content-snapshot/build.mjs";

const fixture = JSON.parse(readFileSync("tests/fixtures/micro-steps-content.json", "utf8"));
const shipped = JSON.parse(readFileSync("src/data/content/micro-steps.json", "utf8"));
const M = await importTs("src/lib/microSteps.ts");

test("the schema is fresh and the shipped file equals the content", () => {
  execFileSync("python3", ["scripts/micro-steps/build.py", "--check"]);
  const fresh = JSON.parse(execFileSync("python3", ["-c", [
    "import json,sys; sys.path.insert(0,'scripts/micro-steps'); from content import VERSION, SETS",
    "print(json.dumps({'version': VERSION, 'sets': {k: [{'id': i, 'text': t, 'subtext': s, 'modality': m, 'requiresEnvironment': e} for i, t, s, m, e in SETS[k]] for k in sorted(SETS)}}))",
  ].join("\n")], { encoding: "utf8" }));
  assert.deepEqual(fixture, fresh, "tests/fixtures/micro-steps-content.json is stale: run scripts/micro-steps/fixture.py");
  assert.deepEqual(shipped.content, fixture);
  assert.equal(shipped.content.version, M.MICRO_STEPS_VERSION);
});

test("the snapshot builder makes the shipped file from the schema, replayed", () => {
  const replay = JSON.parse(execFileSync("python3", ["scripts/content-snapshot/schema_export.py"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
  assert.deepEqual(buildMicroSteps(indexGraph(replay)), shipped.content);
  assert.equal(buildMicroSteps(indexGraph({ scope: "content-only", nodes: [], relationships: [] })), null, "no micro-step yet: the committed file is kept");
});

test("every engine pattern has its own set, plus the fallback; 3 to 5 steps each; one needs nothing", () => {
  const patterns = ["acute_alarm", "chronic_vigilance", "emotional_flooding", "social_threat_shame", "reactive_aggression",
    "conservation_freeze", "dissociation_overmodulation", "rumination_loop", "reward_drive_low", "grief_yearning"];
  assert.deepEqual(Object.keys(fixture.sets).sort(), [...patterns, "fallback"].sort());
  for (const [k, steps] of Object.entries(fixture.sets)) {
    assert.ok(steps.length >= 3 && steps.length <= 5, k);
    assert.ok(steps.some((s) => !s.requiresEnvironment), k);
    for (const s of steps) assert.ok(s.text.split(/\s+/).length <= 8, `${s.id}: at most 8 words`);
  }
  // Freeze never gets a calming breath (calming tools worsen it); flooding never a thinking task.
  assert.ok(!fixture.sets.conservation_freeze.some((s) => /breath|breathe/i.test(s.text)));
  assert.ok(fixture.sets.emotional_flooding.every((s) => ["autonomic", "proprioceptive"].includes(s.modality)));
});

test("the graph is the source: no frontend file holds the steps by hand", () => {
  assert.ok(!existsSync("src/data/microSteps.ts"));
  const lib = readFileSync("src/lib/microSteps.ts", "utf8");
  for (const s of Object.values(fixture.sets).flat()) assert.ok(!lib.includes(s.text), s.id);
  for (const f of ["src/components/checkin/StateResult.tsx", "src/components/checkin/LowEnergyStateResult.tsx", "src/components/checkin/HelpNowInterim.tsx"]) {
    assert.match(readFileSync(f, "utf8"), /from '\.\.\/\.\.\/lib\/microSteps'/, f);
  }
  assert.match(readFileSync("scripts/load-graph.mjs", "utf8"), /'micro-steps\.cypher'/);
  const cons = readFileSync("schema/constraints.cypher", "utf8");
  assert.match(cons, /FOR \(n:Intervention\) REQUIRE n\.id IS UNIQUE/);
  assert.match(cons, /FOR \(n:CrisisState\) REQUIRE n\.id IS UNIQUE/);
});

test("the reader keeps the old behaviour: an unknown pattern gets the fallback; rotation; skipping what needs a place", () => {
  assert.deepEqual(M.getMicroStepsForPattern("nope").map((s) => s.id), fixture.sets.fallback.map((s) => s.id));
  const aa = M.getMicroStepsForPattern("acute_alarm");
  assert.deepEqual(aa.map((s) => s.id), ["aa-1", "aa-2", "aa-3", "aa-4", "aa-5"]);
  assert.equal(aa[0].subtext, "Press down hard. Feel the pressure.");
  assert.equal(aa[0].requiresEnvironment, undefined, "absent unless it needs one");
  assert.equal(aa[1].requiresEnvironment, true);
  assert.deepEqual(M.getMicroStep("acute_alarm", 4), { step: aa[0], index: 0 }, "next wraps round");
  for (let i = 0; i < 20; i++) assert.ok(!M.getMicroStep("acute_alarm", undefined, true).step.requiresEnvironment);
});
