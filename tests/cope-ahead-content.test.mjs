// Cope Ahead's content (docs/design/cope-ahead.md): scripts/cope-ahead/content.py → schema/cope-ahead.cypher,
// served by getCopeAheadContent and shipped as src/data/content/cope-ahead.json.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { LOAD_ORDER, splitStatements } from "../scripts/load-graph.mjs";
import { FLOW_DOC_FILES, lintFlowDocs, lintText } from "../scripts/voice-lint.mjs";

const read = (f) => readFileSync(f, "utf8");
const cypher = read("schema/cope-ahead.cypher");
const fixture = JSON.parse(read("tests/fixtures/cope-ahead-content.json"));
const toolsSrc = read("src/data/tools.ts");
const toolName = Object.fromEntries([...toolsSrc.matchAll(/^\s*id: '([a-z0-9-]+)',\n\s*name: '((?:[^'\\]|\\.)*)',/gm)].map((m) => [m[1], m[2]]));
const grid = new Set([...read("src/data/emotions.ts").matchAll(/makeEmotion\('([a-z_]+)'/g)].map((m) => m[1]));
const PULLS = ["fight", "chase", "hide", "blank"];

test("generated files are fresh: schema/cope-ahead.cypher and the fixture", (t) => {
  let out;
  try { out = execFileSync("python3", ["scripts/cope-ahead/build.py"], { encoding: "utf8" }); } catch { t.skip("python3 unavailable"); return; }
  assert.equal(out.trim(), cypher.trim());
  const before = read("tests/fixtures/cope-ahead-content.json");
  execFileSync("python3", ["scripts/cope-ahead/fixture.py"], { encoding: "utf8" });
  assert.equal(read("tests/fixtures/cope-ahead-content.json"), before, "run python3 scripts/cope-ahead/fixture.py");
});

test("loaded after Wise mind and app-tool-ids, before recommended-for; every label it merges has a constraint", () => {
  const at = (f) => LOAD_ORDER.indexOf(f);
  assert.equal(at("cope-ahead.cypher"), at("wise-mind.cypher") + 1);
  assert.ok(at("cope-ahead.cypher") < at("recommended-for.cypher"));
  assert.ok(at("cope-ahead.cypher") > at("app-tool-ids.cypher"));
  const constraints = read("schema/constraints.cypher");
  const labels = new Set([...cypher.matchAll(/MERGE \(\w+:(\w+) \{id:/g)].map((m) => m[1]));
  for (const l of ["CopeAheadFlow", "CopeSituation", "HardMoment", "CopeMove", "RehearsalBeat"]) assert.ok(labels.has(l), l);
  labels.delete("ClinicalSource"); // the sources: constraints.cypher's clinical_source_id
  for (const label of labels) assert.match(constraints, new RegExp(`FOR \\(n:${label}\\) REQUIRE n\\.id IS UNIQUE`), label);
  for (const s of splitStatements(cypher)) assert.doesNotMatch(s, /\bCREATE \(|SET \w+ = \{/, "MERGE + SET += only");
  assert.match(read("schema/app-tool-ids.cypher"), /\{c: "dbt_cope_ahead", t: "cope-ahead"\}/);
  for (const rel of ["HAS_SITUATION", "HAS_HARD_MOMENT", "HAS_MOVE", "HAS_BEAT", "IMPLEMENTED_BY_FLOW"]) {
    assert.ok(splitStatements(cypher).some((x) => x.includes("(t:TherapyConcept {id: 'dbt_cope_ahead'})") && x.includes(`MERGE (t)-[:${rel}]->`)), `${rel} hangs off dbt_cope_ahead`);
  }
});

test("every likelyFeelings id is a check-in grid word, four per situation", () => {
  for (const s of fixture.situations) {
    assert.equal(s.likelyFeelings.length, 4, s.id);
    for (const w of s.likelyFeelings) assert.ok(grid.has(w), `${s.id}: ${w} is a grid word`);
  }
});

test("every situation's hardMoments exist, danger ids are last and listed as dangerMomentIds", () => {
  const moments = new Set(fixture.hardMoments.map((m) => m.id));
  const danger = new Set(["might_hurt", "might_hurt_self"]);
  for (const s of fixture.situations) {
    for (const id of s.hardMoments) assert.ok(moments.has(id), `${s.id}: ${id}`);
    const d = s.hardMoments.filter((id) => danger.has(id));
    assert.deepEqual(s.dangerMomentIds, d, s.id);
    assert.deepEqual(s.hardMoments.slice(s.hardMoments.length - d.length), d, `${s.id}: danger moments last`);
  }
  const on = (id) => fixture.situations.filter((s) => s.dangerMomentIds.includes(id)).map((s) => s.id);
  assert.deepEqual(on("might_hurt"), ["conversation", "someone"]);
  assert.deepEqual(on("might_hurt_self"), ["hard_day", "alone"]);
});

test("moves: forPulls are the four pulls, tool labels are the tools' names, one move per danger moment", () => {
  for (const m of fixture.moves) {
    for (const p of m.forPulls) assert.ok(PULLS.includes(p), `${m.id}: ${p}`);
    assert.ok(["body", "words", "action", "tool"].includes(m.kind), m.id);
    assert.equal(m.kind === "tool", !!m.appToolId, m.id);
    if (m.appToolId) assert.equal(m.label, toolName[m.appToolId], `${m.id}: label = the name of ${m.appToolId} in src/data/tools.ts`);
  }
  assert.equal(toolName["cool-down"], "Circuit Breaker");
  for (const d of ["might_hurt", "might_hurt_self"]) {
    const ms = fixture.moves.filter((m) => m.forMoments.includes(d));
    assert.equal(ms.length, 1, d);
    assert.deepEqual(ms[0].forPulls, [], `${d}: shown only for its moment`);
    assert.equal(ms[0].general, false);
  }
  assert.equal(fixture.moves.find((m) => m.forMoments.includes("might_hurt")).label, "Leave and get somewhere safe");
  assert.equal(fixture.moves.find((m) => m.forMoments.includes("might_hurt_self")).label, "Call or text someone who can help, now");
  assert.ok(!fixture.moves.some((m) => m.appToolId === "dear-man"), "DEAR MAN is prep, not a move");
  assert.deepEqual(Object.keys(fixture.pullIf).sort(), [...PULLS].sort());
});

test("the doc's copy, as written", () => {
  assert.equal(fixture.version, "cope-ahead-v1");
  assert.deepEqual([fixture.ownMax, fixture.moveOwnMax], [140, 90]);
  assert.deepEqual(fixture.situations.map((s) => [s.id, s.label, s.afterName]), [
    ["conversation", "A conversation I'm dreading", "the conversation"], ["someone", "Seeing someone in particular", "seeing them"],
    ["work_school", "Something at work or school", "it"], ["place_event", "A place or an event", "it"],
    ["hard_day", "A day that's hard every year", "the day"], ["alone", "Being on my own", "being on your own"], ["other", "Something else", "it"],
  ]);
  const m = Object.fromEntries(fixture.hardMoments.map((x) => [x.id, x]));
  assert.deepEqual([m.might_hurt.label, m.might_hurt.ifText], ["They might hurt me", "they start to frighten me"]);
  assert.deepEqual([m.might_hurt_self.label, m.might_hurt_self.ifText], ["I might hurt myself", "I feel like hurting myself"]);
  assert.equal(fixture.hardMoments.length, 23);
  assert.equal(fixture.moves.length, 18);
  assert.deepEqual(fixture.pullIf, { fight: "I want to say something sharp", chase: "I want to text them over and over", hide: "I want to disappear", blank: "I start to shut down" });
  assert.deepEqual(fixture.beats.map((b) => [b.order, b.id]), [[1, "arrive"], [2, "around"], [3, "moment"], [4, "notice"], [5, "plan"], [6, "through"], [7, "over"]]);
  assert.equal(fixture.beats[2].text, "Then it happens: {moment}.");
  assert.equal(fixture.beats[4].text, "You do your plan: {plan}.");
  assert.deepEqual(fixture.when.map((w) => [w.id, fixture.copy[w.key]]), [["today", "Today"], ["tomorrow", "Tomorrow"], ["this_week", "This week"], ["later", "Later, or not sure"]]);
  const c = fixture.copy;
  assert.equal(Object.keys(c).length, 41);
  assert.equal(c.rehearse_intro, "Picture it as if it's happening now. You're in it, not watching.");
  assert.equal(c.plan_title, "If it happens, I'll…");
  assert.deepEqual([c.settle_breath, c.settle_five, c.settle_ok], ["Three long breaths out", "5-4-3-2-1", "I'm OK"]);
  assert.equal(fixture.after.after_q, "How did {afterName} go?");
  assert.equal(fixture.after.after_plan_line, "Your plan: {plan}");
  assert.equal(Object.keys(fixture.after).length, 11);
});

test("the voice: the flow document is a linted flow doc with no findings, and so is every label and line on the nodes", () => {
  assert.ok(FLOW_DOC_FILES.includes("schema/cope-ahead.cypher"));
  assert.match(cypher, /f\.contentJson = "/, "linted: lintFlowDocs reads `x.contentJson = \"…\"`");
  assert.deepEqual(lintFlowDocs(["schema/cope-ahead.cypher"]), []);
  const strings = [
    ...fixture.situations.flatMap((s) => [s.label, s.afterName]),
    ...fixture.hardMoments.flatMap((x) => [x.label, x.ifText]),
    ...fixture.moves.flatMap((x) => [x.label, x.line]),
    ...fixture.beats.map((b) => b.text),
    ...Object.values(fixture.copy), ...Object.values(fixture.pullIf), ...Object.values(fixture.after),
  ];
  for (const s of strings) {
    assert.deepEqual(lintText(s, { scope: "user_copy" }).filter((f) => f.severity !== "report"), [], s);
    assert.doesNotMatch(s, /\b(should|just|but)\b|!/i, s);
  }
  assert.doesNotMatch(read("scripts/witness/voice-baseline.json"), /cope-ahead/, "no baseline entries");
});

test("types mirror: src/data/copeAheadTypes.ts equals functions/src/copeAhead/types.ts (after the header)", () => {
  const body = (f) => read(f).split("\n").slice(4).join("\n");
  assert.equal(body("src/data/copeAheadTypes.ts"), body("functions/src/copeAhead/types.ts"));
});

test("the app reads the shipped file as its own chunk, never the callable", () => {
  const svc = read("src/services/copeAhead.ts");
  assert.match(svc, /import\('\.\.\/data\/content\/cope-ahead\.json'\)/);
  assert.doesNotMatch(svc, /httpsCallable|getCopeAheadContent'\)/);
});
