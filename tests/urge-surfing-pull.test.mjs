// Urge Surfing asks which pull it is (parts data fix 4): Find the feeling's own pull question and
// FeelingUrge chips, one optional tap, recorded as the session's urgeIds. The helper is pure (tested
// via the importTs transpile pattern of wave0-harm-patches.test.mjs); the component is pinned by
// static checks on its source, since the repo has no React component test setup.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import ts from "typescript";

async function importTs(path) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

const { pullChoices, pullQuestion } = await importTs("src/lib/urgeSurfing.ts");
const shipped = JSON.parse(readFileSync("src/data/content/find-the-feeling.json", "utf8")).content;

test("pullChoices: the urges in graph order, as { id, label, sub }", () => {
  const content = {
    urges: [
      { id: "b", label: "Second", sub: "two", order: 1, routes: ["pause"] },
      { id: "a", label: "First", sub: "one", order: 0, routes: [] },
      { id: "c", label: "No order", sub: "last" },
    ],
  };
  assert.deepEqual(pullChoices(content), [
    { id: "a", label: "First", sub: "one" },
    { id: "b", label: "Second", sub: "two" },
    { id: "c", label: "No order", sub: "last" },
  ]);
});

test("pullChoices: missing or malformed content gives [] (the question just isn't shown)", () => {
  for (const bad of [undefined, null, 0, "urges", [], {}, { urges: null }, { urges: "x" }, { urges: {} }]) {
    assert.deepEqual(pullChoices(bad), [], JSON.stringify(bad));
  }
  // Rows without an id or a label are dropped; a missing sub is an empty string.
  assert.deepEqual(pullChoices({ urges: [null, 3, { label: "x" }, { id: "y" }, { id: "z", label: "Z", order: 0 }] }),
    [{ id: "z", label: "Z", sub: "" }]);
  assert.equal(pullQuestion(null), "");
  assert.equal(pullQuestion({ flow: { copy: {} } }), "");
});

test("shipped content: FTF's pull question and its four chips, label and sub", () => {
  assert.equal(pullQuestion(shipped), shipped.flow.copy.pull.title);
  assert.ok(pullQuestion(shipped).length > 0);
  const choices = pullChoices(shipped);
  assert.deepEqual(choices.map((c) => c.id), ["fight", "chase", "hide", "blank"]);
  for (const c of choices) assert.ok(c.label && c.sub, `${c.id} shows a label and a sub`);
});

test("every surfed pull can be read as a protective move: each id is a mapped FeelingUrge in parts content", (t) => {
  let parts;
  try {
    parts = JSON.parse(execFileSync("python3", ["-c", [
      "import importlib.util, json",
      "spec = importlib.util.spec_from_file_location('parts_content', 'scripts/parts/content.py')",
      "C = importlib.util.module_from_spec(spec); spec.loader.exec_module(C)",
      "print(json.dumps({'expresses': {s: m for s, (m, _) in C.EXPRESSES['FeelingUrge'].items()},",
      "                  'moves': [m['id'] for m in C.MOVES]}))",
    ].join("\n")], { encoding: "utf8" }));
  } catch (e) {
    if (e.code === "ENOENT") return t.skip("python3 unavailable");
    throw e;
  }
  // Every move, offerable or not (the fixture lists only the offerable ones; blank → go_blank isn't).
  const { expresses } = parts;
  const moves = new Set(parts.moves);
  for (const { id } of pullChoices(shipped)) {
    assert.ok(id in expresses, `FeelingUrge "${id}" is not in EXPRESSES["FeelingUrge"] (scripts/parts/content.py)`);
    assert.ok(moves.has(expresses[id]), `"${id}" maps to "${expresses[id]}", which is not a ProtectiveMove`);
  }
});

test("Urge Surfing: the pull is optional, single, ask-fresh and recorded as urgeIds", () => {
  const src = readFileSync("src/pages/tools/UrgeSurfing.tsx", "utf8");
  // Graph content, not new copy: the chips and question come from the shipped FTF content.
  assert.match(src, /getFindTheFeelingContent\(\)/);
  assert.match(src, /pullChoices\(content\)/);
  for (const label of pullChoices(shipped).map((c) => c.label)) assert.ok(!src.includes(label), `hard-coded "${label}"`);
  // Tap again clears; the pick and the clear both reach the session.
  assert.match(src, /pulled === id \? null : id/);
  assert.match(src, /session\.setUrgeIds\(next \? \[next\] : \[\]\)/);
  // Start over asks fresh.
  assert.match(src, /const reset = \(\) => \{[\s\S]*?setPulled\(null\);\s*session\.setUrgeIds\(\[\]\);/);
  // Not answering is the skip: Start is never gated on the pick.
  assert.doesNotMatch(src, /disabled=/);
  // On the intro screen, after the how-it-works card and above the strength slider.
  const intro = src.slice(src.indexOf("How urge surfing works"), src.indexOf("How strong is your urge right now"));
  assert.match(intro, /pull\.choices\.map/);
});
