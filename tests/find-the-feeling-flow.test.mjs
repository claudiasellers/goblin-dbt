import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

/** Transpile TS modules into a temp dir so their relative imports resolve. */
const out = join(tmpdir(), `ftf-test-${process.pid}`);
mkdirSync(out, { recursive: true });
function emit(path, name) {
  const js = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  writeFileSync(join(out, `${name}.mjs`), js);
}
emit("src/lib/findTheFeeling.ts", "findTheFeeling");
emit("src/lib/findTheFeelingFlow.ts", "findTheFeelingFlow");
emit("functions/src/findTheFeelingValidation.ts", "validation");
const lib = await import(join(out, "findTheFeeling.mjs"));
const flowLib = await import(join(out, "findTheFeelingFlow.mjs"));
const { validateFindTheFeelingSession: validate, checkFindTheFeelingGates } = await import(join(out, "validation.mjs"));

const content = JSON.parse(readFileSync("tests/fixtures/find-the-feeling-content.json", "utf8"));
const g = content.flow.gates;
const words = content.families.flatMap((f) => f.words);
const byId = Object.fromEntries(words.map((w) => [w.emotionId, w]));

function run(actions, entry = "tool", way = "shape") {
  const reducer = flowLib.makeFlowReducer(content);
  let h = { stack: [flowLib.initialFlow(content, entry, way)] };
  for (const a of actions) h = reducer(h, a);
  return h;
}
const cur = (h) => h.stack[h.stack.length - 1];
const furious = { way: "shape", vec: byId.furious.shape };
const lonelySound = { way: "tune", vec: byId.lonely.sound };

test("fixture matches the generated migration (run fixture.py after editing content.py)", () => {
  const cypher = readFileSync("schema/find-the-feeling.cypher", "utf8");
  const flow = JSON.parse(JSON.parse(cypher.match(/f\.contentJson = (".*");/)[1]));
  assert.deepEqual(flow, content.flow);
});

test("a shape found exactly on a word's signature offers that word first", () => {
  for (const w of words) {
    const ranked = lib.rankFamilies(content.families, { way: "shape", vec: w.shape });
    assert.equal(lib.currentWord(ranked, lib.firstOffer()).emotionId, w.emotionId, w.emotionId);
  }
});

test("'no' jumps family; three refusals end with no word", () => {
  const ranked = lib.rankFamilies(content.families, furious);
  let s = lib.firstOffer();
  const seen = [];
  for (let i = 0; i < 3; i++) {
    const w = lib.currentWord(ranked, s);
    seen.push(w.emotionId);
    const r = lib.answerOffer(ranked, s, "no", g.maxWordsOffered);
    s = r.state;
    if (i < 2) assert.equal(r.done, false); else { assert.equal(r.done, true); assert.equal(r.word, null); }
  }
  const fams = seen.map((id) => content.families.find((f) => f.words.some((w) => w.emotionId === id)).id);
  assert.equal(new Set(fams).size, 3, "each refusal moves to another family");
});

/**
 * The capacity step is out (Claudia, 30 Sep): nothing in the flow sets a band. The band gates stay
 * (for when a band question comes back), so the flooded paths seed one on the initial state.
 */
function runWithBand(band, actions, entry = "tool", way = "shape") {
  const reducer = flowLib.makeFlowReducer(content);
  let h = { stack: [{ ...flowLib.initialFlow(content, entry, way), band }] };
  for (const a of actions) h = reducer(h, a);
  return h;
}
const SID = "3f2c9a0e-1b2c-4d5e-8f90-123456789abc";

test("no capacity step: find → pull → word → setOff → close → next, no band recorded", () => {
  assert.equal(flowLib.STEP_ORDER.includes("capacity"), false);
  const found = cur(run([{ t: "begin" }, { t: "found", found: furious }]));
  assert.equal(found.step, "pull", "the pull follows the find directly");
  assert.equal(found.band, null);
  const h = run([{ t: "begin" }, { t: "found", found: furious }, { t: "pull", pull: "fight" }]);
  assert.equal(cur(h).step, "word");
  assert.equal(cur(h).regulation, "none", "no band: a fight pull is never calmed first");
  const h2 = run([
    { t: "begin" }, { t: "found", found: furious }, { t: "pull", pull: "fight" },
    { t: "word", answer: "yes" }, { t: "setOff", value: "someone" }, { t: "close", value: "quieter" },
  ]);
  const s = cur(h2);
  assert.equal(s.step, "next");
  assert.equal(s.word, "furious");
  assert.deepEqual(s.routedTo, ["pause", "opposite-action"]);
  const session = flowLib.toSession(s, SID, content.version);
  assert.equal(session.band, null);
  assert.equal(checkFindTheFeelingGates(validate(session), g), null);
});

test("a band 'action' is no longer part of the flow", () => {
  const h = run([{ t: "begin" }, { t: "found", found: furious }, { t: "band", band: "flooded" }]);
  assert.equal(cur(h).band, null);
  assert.equal(cur(h).step, "pull");
});

test("flooded regulates before the word when a band is present (smooth for shape, tune for tune)", () => {
  const s = cur(runWithBand("flooded", [{ t: "begin" }, { t: "found", found: furious }, { t: "pull", pull: "fight" }]));
  assert.equal(s.step, "regulate");
  assert.equal(s.regulation, "smooth");
  const t = cur(runWithBand("flooded", [{ t: "begin" }, { t: "found", found: lonelySound }, { t: "pull", pull: "chase" }], "tool", "tune"));
  assert.equal(t.regulation, "tune");
  assert.equal(lib.regulationFor("shape", null, "fight", g), "none");
});

test("blank alone activates (never calms), with or without a band", () => {
  const s = cur(run([{ t: "begin" }, { t: "found", found: furious }, { t: "pull", pull: "blank" }]));
  assert.equal(s.regulation, "warm");
  const t = cur(run([{ t: "begin" }, { t: "found", found: lonelySound }, { t: "pull", pull: "blank" }], "tool", "tune"));
  assert.equal(t.regulation, "wake");
  assert.equal(lib.regulationFor("shape", "stirred", "blank", g), "warm");
  assert.equal(lib.ambientDescent({ stepsSinceStart: 3, band: null, pull: "blank", gates: g, enabled: true }).direction, "brighten");
  assert.equal(lib.ambientDescent({ stepsSinceStart: 3, band: "stirred", pull: "blank", gates: g, enabled: true }).direction, "brighten");
  const session = validate(flowLib.toSession(cur(run([
    { t: "begin" }, { t: "found", found: furious }, { t: "pull", pull: "blank" }, { t: "regulated", skipped: false },
    { t: "word", answer: "yes" }, { t: "setOff", value: null }, { t: "close", value: "same" },
  ])), SID, content.version));
  assert.equal(session.regulation, "warm");
  assert.equal(checkFindTheFeelingGates(session, g), null);
});

test("flooded + blank (band present): regulate → orient → no word → regulation routes only", () => {
  const h = runWithBand("flooded", [
    { t: "begin" }, { t: "found", found: furious }, { t: "pull", pull: "blank" }, { t: "regulated", skipped: false },
  ]);
  assert.equal(cur(h).step, "orient");
  const s = cur(runWithBand("flooded", [
    { t: "begin" }, { t: "found", found: furious }, { t: "pull", pull: "blank" },
    { t: "regulated", skipped: false }, { t: "oriented" }, { t: "setOff", value: null }, { t: "close", value: "same" },
  ]));
  assert.equal(s.word, null);
  assert.deepEqual(s.offer.offered, []);
  assert.deepEqual(s.routedTo, content.floodedBlankRoutes);
  assert.equal(lib.ambientDescent({ stepsSinceStart: 2, band: "flooded", pull: "blank", gates: g, enabled: true }).direction, "calm");
  const session = validate(flowLib.toSession(s, SID, content.version));
  assert.equal(checkFindTheFeelingGates(session, g), null);
  assert.equal(checkFindTheFeelingGates({ ...session, offered: ["numb"], word: "numb", wordAccepted: true }, g), "floodedBlankWord");
  assert.equal(checkFindTheFeelingGates({ ...session, routedTo: ["opposite-action"] }, g), "floodedBlankRoutes", "server keeps flooded+blank routes to regulation tools");
});

test("word routes come first, unless nothing set it off", () => {
  const hurtShape = { way: "shape", vec: byId.hurt.shape };
  const base = [{ t: "begin" }, { t: "found", found: hurtShape }, { t: "pull", pull: "hide" }, { t: "word", answer: "yes" }];
  assert.deepEqual(cur(run([...base, { t: "setOff", value: "someone" }, { t: "close", value: "quieter" }])).routedTo, ["recovering-from-invalidation", "opposite-action"]);
  assert.deepEqual(cur(run([...base, { t: "setOff", value: "nothing" }, { t: "close", value: "quieter" }])).routedTo, ["opposite-action"]);
});

test("check-in entry ends at handoff after the word, with nothing else recorded", () => {
  const s = cur(run([{ t: "begin" }, { t: "found", found: furious }, { t: "pull", pull: "fight" }, { t: "word", answer: "close" }], "checkin"));
  assert.equal(s.step, "handoff");
  const session = validate(flowLib.toSession(s, SID, content.version));
  assert.equal(session.close, null);
  assert.equal(session.band, null);
  assert.deepEqual(session.routedTo, []);
});

test("back restores the previous step; switching way is only possible before finding", () => {
  const h = run([{ t: "begin" }, { t: "found", found: furious }, { t: "pull", pull: "fight" }, { t: "back" }]);
  assert.equal(cur(h).step, "pull");
  assert.equal(cur(run([{ t: "begin" }, { t: "found", found: furious }, { t: "back" }])).step, "find");
  assert.equal(cur(run([{ t: "begin" }, { t: "switchWay", way: "tune" }])).way, "tune");
  assert.equal(cur(run([{ t: "begin" }, { t: "found", found: furious }, { t: "switchWay", way: "tune" }])).way, "shape");
});

test("ambient descent never touches the found snapshot and is capped", () => {
  const h = run([{ t: "begin" }, { t: "found", found: furious }, { t: "pull", pull: "fight" }, { t: "word", answer: "yes" }, { t: "setOff", value: null }]);
  const s = cur(h);
  assert.deepEqual(s.found.vec, byId.furious.shape);
  assert.ok(s.stepsSinceStart > 0, "descent counts from the find now that there's no capacity step");
  const a = lib.ambientDescent({ stepsSinceStart: 99, band: s.band, pull: s.pull, gates: g, enabled: true });
  assert.equal(a.level, g.ambientDescent.maxTotal);
  const drifted = lib.driftShape(s.found.vec, a.level, a.direction);
  assert.ok(drifted[0] < s.found.vec[0] && drifted[3] < s.found.vec[3], "sharper and buzzier ease down");
  assert.equal(lib.ambientDescent({ stepsSinceStart: 5, band: "flooded", pull: "fight", gates: g, enabled: false }).level, 0);
});

test("validator rejects mismatched vectors, unoffered words and missing closes", () => {
  const ok = {
    schemaVersion: 1, id: "3f2c9a0e-1b2c-4d5e-8f90-123456789abc", contentVersion: "find-v1", entry: "tool", way: "shape",
    switchedWay: false, shape: [0, 0, 0, 0, 0], sound: null, band: "steady", pull: "fight", regulation: "none",
    offered: ["frustrated"], word: "frustrated", wordAccepted: true, setOff: null, close: "same", routedTo: ["pause"], ambientDescent: true,
  };
  validate(ok);
  assert.throws(() => validate({ ...ok, sound: [0, 0, 0, 0] }));
  assert.throws(() => validate({ ...ok, shape: [2, 0, 0, 0, 0] }));
  assert.throws(() => validate({ ...ok, word: "furious" }));
  assert.throws(() => validate({ ...ok, close: null }));
  assert.throws(() => validate({ ...ok, routedTo: ["a", "b", "c"] }));
  assert.throws(() => validate({ ...ok, band: "loud" }));
  assert.equal(validate({ ...ok, band: null }).band, null, "no band: the capacity question isn't asked");
  assert.equal(checkFindTheFeelingGates(validate({ ...ok, band: null }), g), null);
  assert.equal(checkFindTheFeelingGates(validate({ ...ok, band: "flooded" }), g), "regulation", "sessions saved with a band still check");
  assert.equal(checkFindTheFeelingGates(validate({ ...ok, band: "flooded", regulation: "skipped" }), g), null);
});

test("every urge and word route points at a real app tool", () => {
  const tools = readFileSync("src/data/tools.ts", "utf8");
  const all = lib.allowedRoutes({ words, urgeRoutes: Object.fromEntries(content.urges.map((u) => [u.id, u.routes])), floodedBlankRoutes: content.floodedBlankRoutes });
  for (const id of all) assert.match(tools, new RegExp(`id: '${id}'`), id);
  assert.match(tools, /id: 'find-the-feeling'/);
});

test("late or duplicate actions are ignored (no extra offers, no pull after Back)", () => {
  const h = run([
    { t: "begin" }, { t: "found", found: furious }, { t: "pull", pull: "fight" },
    { t: "word", answer: "no" }, { t: "word", answer: "no" }, { t: "word", answer: "no" }, { t: "word", answer: "no" },
  ]);
  assert.equal(cur(h).step, "setOff");
  assert.equal(cur(h).offer.offered.length, 3);
  const b = run([{ t: "begin" }, { t: "found", found: furious }, { t: "back" }, { t: "pull", pull: "fight" }]);
  assert.equal(cur(b).step, "find");
  assert.equal(cur(b).pull, null);
});
