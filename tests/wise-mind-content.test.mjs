// Wise mind's content (docs/design/wise-mind.md): scripts/wise-mind/content.py → schema/wise-mind.cypher,
// served by getWiseMindContent and shipped as src/data/content/wise-mind.json.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { LOAD_ORDER, splitStatements } from "../scripts/load-graph.mjs";
import { FLOW_DOC_FILES, lintFlowDocs, lintText } from "../scripts/voice-lint.mjs";

const read = (f) => readFileSync(f, "utf8");
const cypher = read("schema/wise-mind.cypher");
const fixture = JSON.parse(read("tests/fixtures/wise-mind-content.json"));
const tools = new Set([...read("src/data/tools.ts").matchAll(/^\s*id: '([a-z0-9-]+)',/gm)].map((m) => m[1]));

test("generated files are fresh: schema/wise-mind.cypher and the fixture", (t) => {
  let out;
  try { out = execFileSync("python3", ["scripts/wise-mind/build.py"], { encoding: "utf8" }); } catch { t.skip("python3 unavailable"); return; }
  assert.equal(out.trim(), cypher.trim());
  const before = read("tests/fixtures/wise-mind-content.json");
  execFileSync("python3", ["scripts/wise-mind/fixture.py"], { encoding: "utf8" });
  assert.equal(read("tests/fixtures/wise-mind-content.json"), before, "run python3 scripts/wise-mind/fixture.py");
});

test("loaded after Recover (its clinical source) and app-tool-ids; every label it merges has a constraint", () => {
  const at = (f) => LOAD_ORDER.indexOf(f);
  assert.ok(at("wise-mind.cypher") > at("invalidation-recovery.cypher") && at("wise-mind.cypher") > at("app-tool-ids.cypher"));
  const constraints = read("schema/constraints.cypher");
  for (const label of new Set([...cypher.matchAll(/MERGE \(\w+:(\w+) \{id:/g)].map((m) => m[1]))) {
    assert.match(constraints, new RegExp(`FOR \\(n:${label}\\) REQUIRE n\\.id IS UNIQUE`), label);
  }
  for (const s of splitStatements(cypher)) assert.doesNotMatch(s, /\bCREATE \(|SET \w+ = \{/, "MERGE + SET += only");
  assert.match(read("schema/app-tool-ids.cypher"), /\{c: "dbt_wise_mind", t: "wise-mind"\}/);
});

test("the content: six questions, 3-4 voices per mind each, three practices on dbt_wise_mind, answers to real tools", () => {
  assert.equal(fixture.version, "wise-mind-v1");
  assert.equal(fixture.ownMax, 140);
  assert.deepEqual(fixture.questions.map((q) => q.label), ["What to do next", "Whether to say something", "Whether to let it go",
    "What I actually need", "Whether to trust this feeling", "Nothing in particular, I want to settle"]);
  for (const q of fixture.questions) {
    for (const m of ["emotion", "reason"]) assert.ok(q.voices[m].length >= 3 && q.voices[m].length <= 4, `${q.id} ${m}`);
    assert.ok(fixture.practices.some((p) => p.id === q.defaultPracticeId), q.id);
  }
  assert.equal(fixture.questions.find((q) => q.id === "wm_q_settle").defaultPracticeId, "wm_stone", "no question: the stone");
  assert.equal(fixture.questions.find((q) => q.id === "wm_q_say").defaultPracticeId, "wm_ask");
  assert.deepEqual(fixture.practices.map((p) => [p.name, p.kind, p.breaths]),
    [["Stone on the lake", "drift", null], ["Wise in, mind out", "hold", 5], ["Ask and listen", "ask", 3]]);
  assert.equal((cypher.match(/MERGE \(t\)-\[:HAS_PRACTICE\]->\(p\)/g) ?? []).length, 3);
  for (const a of fixture.answers) for (const id of a.nextToolIds) assert.ok(tools.has(id), `${a.id} → ${id} is a real tool`);
  assert.deepEqual(fixture.answers.filter((a) => a.kind === "quiet").map((a) => [a.label, a.nextToolIds]), [["Nothing yet", []]]);
  assert.deepEqual(fixture.answers.find((a) => a.id === "wm_a_say").nextToolIds, ["dear-man"]);
  assert.deepEqual(fixture.answers.find((a) => a.id === "wm_a_care").nextToolIds, ["cool-down", "five-senses"]);
  assert.deepEqual(fixture.answers.find((a) => a.id === "wm_a_let_go").nextToolIds, ["pause"]);
  // Every line of the doc's screens.
  const c = fixture.copy;
  assert.equal(c.question.prompt, "What would you like wise mind's help with?");
  assert.equal(c.minds.witness, "Both make sense from where they stand.");
  assert.equal(c.dropIn.prompt, "Choose a way in.");
  assert.equal(c.dropIn.here, "I'm here");
  assert.equal(c.comes.prompt, "What does wise mind say?");
  assert.equal(c.comes.quiet, "Wise mind is often quiet. It can arrive later, on a walk or in the shower.");
  assert.deepEqual(c.feel.options, { calm: "Calm, settled", pushed: "Pushed, urgent", unsure: "Not sure" });
  assert.deepEqual(c.feel.lines, { calm: "That sounds like wise mind.", pushed: "That might be emotion mind talking.", unsure: "Keep it and see how it sits." });
  assert.equal(c.next.prompt, "What's one thing you'll do with it?");
  assert.equal(c.next.kept, "Wise mind said: {answer}");
});

test("the voice: the flow document is a linted flow doc with no findings, and so is every label and line on the nodes", () => {
  assert.ok(FLOW_DOC_FILES.includes("schema/wise-mind.cypher"));
  assert.deepEqual(lintFlowDocs(["schema/wise-mind.cypher"]), []);
  const strings = [
    ...fixture.questions.flatMap((q) => [q.label, ...q.voices.emotion.map((v) => v.label), ...q.voices.reason.map((v) => v.label)]),
    ...fixture.practices.flatMap((p) => [p.name, p.sub, ...p.lines]),
    ...fixture.answers.map((a) => a.label),
  ];
  for (const s of strings) {
    assert.deepEqual(lintText(s, { scope: "user_copy" }).filter((f) => f.severity !== "report"), [], s);
    assert.doesNotMatch(s, /\b(should|just|but)\b|!/i, s);
  }
  const baseline = read("scripts/witness/voice-baseline.json");
  assert.doesNotMatch(baseline, /wise-mind/, "no baseline entries");
});

test("types mirror: src/data/wiseMindTypes.ts equals functions/src/wiseMind/types.ts (after the header)", () => {
  const body = (f) => read(f).split("\n").slice(4).join("\n");
  assert.equal(body("src/data/wiseMindTypes.ts"), body("functions/src/wiseMind/types.ts"));
});

test("the app reads the shipped file as its own chunk, never the callable", () => {
  const svc = read("src/services/wiseMind.ts");
  assert.match(svc, /import\('\.\.\/data\/content\/wise-mind\.json'\)/);
  assert.doesNotMatch(svc, /httpsCallable|getWiseMindContent'\)/);
});
