// The skill runtime's contracts (docs/design/skill-runtime.md): the generated files are fresh, the server
// callable's shape (mirrored in the snapshot builder) equals the fixture over what the load writes, the two
// copies of the types are one, every embed the content names is a component, the condition language, and
// Check the Facts' link contract.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";

const py = (...args) => execFileSync("python3", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const fixture = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));

test("schema/skills.cypher is what scripts/skills/build.py writes", () => {
  assert.equal(py("scripts/skills/build.py").trimEnd(), readFileSync("schema/skills.cypher", "utf8").trimEnd(),
    "stale: python3 scripts/skills/build.py > schema/skills.cypher");
});

test("the fixture is what scripts/skills/fixture.py writes", () => {
  const out = py("-c", "import sys,json; sys.path.insert(0,'scripts/skills'); from fixture import payload; print(json.dumps(payload()))");
  assert.deepEqual(JSON.parse(out), fixture, "stale: python3 scripts/skills/fixture.py --ship");
});

test("buildSkills (the callable's Cypher, mirrored) over the replayed load equals the fixture", async () => {
  const { buildSkills, indexGraph } = await import("../scripts/content-snapshot/build.mjs");
  const built = buildSkills(indexGraph(JSON.parse(py("scripts/skills/replay_export.py"))));
  assert.equal(built.version, fixture.version);
  assert.deepEqual(built.skills, fixture.skills);
  assert.deepEqual(built.fitsWhen, fixture.fitsWhen);
  // The replay doesn't run UNWIND, so it sees only part of HAS_ACTION_URGE's parents: what it sees agrees.
  for (const [id, parent] of Object.entries(built.parentOf)) assert.equal(fixture.parentOf[id], parent, id);
});

test("the skill types are mirrored between functions and the app", () => {
  const body = (p) => readFileSync(p, "utf8").replace(/^\/\*\*[\s\S]*?\*\/\s*/, "");
  assert.equal(body("functions/src/skills/types.ts"), body("src/data/skillTypes.ts"));
});

test("every embed the content can name is a component, and every step slot names one", () => {
  const listed = JSON.parse(py("-c", "import sys,json; sys.path.insert(0,'scripts/skills'); from content import EMBEDS; print(json.dumps(list(EMBEDS)))"));
  const src = readFileSync("src/components/skillPlayer/embeds.ts", "utf8");
  const block = /export const EMBEDS[^{]*\{([\s\S]*?)\};/.exec(src)[1];
  const keys = [...block.matchAll(/^\s*([A-Za-z]+)\s*[,:]/gm)].map((m) => m[1]);
  assert.deepEqual(keys.sort(), [...listed].sort());
  for (const sk of fixture.skills) for (const st of sk.steps) for (const sl of st.slots ?? []) assert.ok(listed.includes(sl.embed), `${st.id}: ${sl.embed}`);
});

const { holds, resolve } = await importTs("src/lib/skillRuntime/conditions.ts");
const scope = (answers, derived = {}, picked = {}) => ({ answers, derived, picked: (f) => picked[f] ?? [] });

test("conditions: refs, set/own, eq/in/has, some, all/any/not", () => {
  const s = scope({ a: { ids: ["x", "y"], own: null }, b: { ids: [], own: "my words" } }, { set: "anger" },
    { a: [{ id: "x", props: {}, predicts: false }, { id: "y", predicts: true }] });
  assert.equal(resolve("$a.a", s), "x");
  assert.deepEqual(resolve("$a.a.ids", s), ["x", "y"]);
  assert.equal(resolve("$a.b.own", s), "my words");
  assert.equal(resolve("$d.set", s), "anger");
  assert.equal(resolve("literal", s), "literal");
  assert.equal(resolve("$nope", s), null);
  assert.ok(holds(null, s));
  assert.ok(holds({ set: "$a.a" }, s) && holds({ set: "$a.b" }, s) && !holds({ set: "$a.c" }, s));
  assert.ok(holds({ own: "b" }, s) && !holds({ own: "a" }, s));
  assert.ok(holds({ eq: ["$a.a", "x"] }, s) && !holds({ eq: ["$a.a", "y"] }, s));
  assert.ok(holds({ in: ["$d.set", ["fear", "anger"]] }, s));
  assert.ok(holds({ has: ["$a.a.ids", "y"] }, s));
  assert.ok(holds({ some: ["a", { eq: ["$opt.predicts", true] }] }, s));
  assert.ok(!holds({ some: ["b", { eq: ["$opt.predicts", true] }] }, s));
  assert.ok(holds({ all: [{ set: "$a.a" }, { not: { set: "$a.c" } }] }, s));
  assert.ok(holds({ any: [{ set: "$a.c" }, { set: "$a.b" }] }, s));
  assert.ok(!holds({ bogus: 1 }, s), "an unknown operator never holds");
});

test("Check the Facts' link: a grid word or nothing, never pre-selected", async () => {
  const { checkFactsLink, parseCheckFactsEntry } = await importTs("src/lib/checkFactsEntry.ts");
  assert.equal(checkFactsLink(), "/tool/check-the-facts");
  assert.equal(checkFactsLink({ emotionId: "anxious" }), "/tool/check-the-facts?feel=anxious");
  assert.equal(checkFactsLink({ emotionId: "../x" }), "/tool/check-the-facts");
  const grid = new Set(["anxious"]);
  assert.deepEqual(parseCheckFactsEntry("?feel=anxious", grid), { firstEmotionId: "anxious" });
  assert.deepEqual(parseCheckFactsEntry("?feel=made_up", grid), { firstEmotionId: null });
  assert.deepEqual(parseCheckFactsEntry("", grid), { firstEmotionId: null });
});

test("build.py refuses a broken persist-nothing skill (R15, IE-08): quick exit, no keep or follow-up before the answer, real re-entry steps", () => {
  const broken = (mutation) => {
    try {
      py("-c", `import sys, copy; sys.path.insert(0, 'scripts/skills'); import build, ending_relationships as e
sk = copy.deepcopy(e.SKILL)
${mutation}
build.check(sk)`);
      return null;
    } catch (err) { return String(err.stderr); }
  };
  assert.equal(broken("pass"), null, "the shipped skill passes");
  assert.match(broken("del sk['quickExit']"), /Quick exit/);
  assert.match(broken("sk['quickExit'] = 'yes'"), /quickExit is true or absent/);
  assert.match(broken("sk['persist']['after'] = 'nope'"), /persist.after is a step/);
  assert.match(broken("sk['steps'][0]['followUp'] = {'type': 'ending_revisit'}"), /no keep or follow-up before persist.after/);
  assert.match(broken("sk['resumeAt'] = ['nope']"), /resumeAt names a step/);
  assert.notEqual(broken("sk['persist']['nothingWhen'] = {'eq': ['$a.nope', 'x']}"), null, "the condition names real fields");
});
