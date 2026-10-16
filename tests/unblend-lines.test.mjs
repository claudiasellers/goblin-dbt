// The in-the-moment unblend line (src/lib/unblendLine.ts, src/hooks/useUnblendLine.ts): parts.json's
// `expresses`, the pure helper, its three hosts (Find the feeling after the pull, Do the Opposite after the
// urge, Recover after the pull unless the angry card does the unblending), `unblendShown` on each host's
// ext, and no hard-coded copy.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture } from "./lib/partsContentFixture.mjs";

const U = await importTs("src/lib/unblendLine.ts");
const ext = await importTs("functions/src/spine/extSchemas.ts");
const { SPINE_TOOLS } = await importTs("functions/src/spine/tools.ts");
const { offerAngryCard } = await importTs("src/lib/invalidationRecoveryFlow.ts");

const read = (f) => readFileSync(f, "utf8");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const ALL = partsFromFixture(fixture, () => true);
const SHIPPED = JSON.parse(read("src/data/content/parts.json")).content;
const without = (drop) => partsFromFixture(fixture, (id) => !drop.includes(id));

test("expresses: approved edges to moves that ship, by source label; the fixture carries every edge with its review", () => {
  assert.deepEqual(Object.keys(fixture.expresses).sort(),
    ["ActionUrge", "BarrierSubResponse", "DearManBarrier", "FeelingUrge", "MomentResponse", "PullOption", "QuestionResponse", "ThoughtPattern", "TurningPoint"]);
  for (const label of Object.values(U.UNBLEND_SOURCES)) assert.ok(label in fixture.expresses, label);
  assert.equal(fixture.expresses.FeelingUrge.blank.moveId, "go_blank", "in the fixture, as a review row");
  assert.ok(!("blank" in ALL.expresses.FeelingUrge), "a move never offered never ships");
  assert.ok(!Object.values(ALL.expresses).some((t) => Object.values(t).some((m) => m === "go_blank" || m === "zone_out")));
  assert.deepEqual(ALL.expresses.FeelingUrge, { chase: "chase", fight: "hit_back", hide: "hide" });
  assert.deepEqual(ALL.expresses.PullOption, { recover_chase: "chase", recover_fight: "hit_back", recover_hide: "hide" });
  // An edge ships with its move: a draft move drops every edge to it.
  assert.ok(!("fight" in partsFromFixture(fixture, (id) => id !== "hit_back").expresses.FeelingUrge));
  // An edge is reviewed by its source id.
  assert.ok(!("fight" in partsFromFixture(fixture, (id) => id !== "fight").expresses.FeelingUrge));
  // Today nothing is signed off: no id has a line yet.
  assert.deepEqual(SHIPPED.expresses, {});
});

test("unblendLine: the move's phrase in unblend_line, or null", () => {
  assert.equal(fixture.prompts[U.UNBLEND_PROMPT].copy, "A part of you {move} right now.");
  assert.equal(U.unblendLine(ALL, "ftf", "hide"), "A part of you wants to hide right now.");
  assert.equal(U.unblendLine(ALL, "ftf", "fight"), "A part of you wants to hit back right now.");
  assert.equal(U.unblendLine(ALL, "oa", "guilt-punish"), "A part of you is turning on you right now.");
  assert.equal(U.unblendLine(ALL, "recover", U.recoverPullOption("chase")), "A part of you wants to chase this down right now.");
  // Shutdown picks (go_blank / zone_out) never have a line.
  assert.equal(U.unblendLine(ALL, "ftf", "blank"), null);
  assert.equal(U.unblendLine(ALL, "recover", U.recoverPullOption("freeze")), null);
  assert.equal(U.unblendLine(ALL, "oa", "fear-freeze"), null);
  assert.equal(U.unblendLine(ALL, "oa", "sad-scroll"), null);
  // Unknown ids, ids on another host's label, nothing picked, no content.
  for (const [src, id] of [["oa", "custom"], ["oa", "nope"], ["ftf", "anger-lash"], ["recover", "fight"], ["ftf", "constructor"], ["ftf", "__proto__"]]) {
    assert.equal(U.unblendLine(ALL, src, id), null, `${src} ${id}`);
  }
  assert.equal(U.unblendLine(ALL, "ftf", null), null);
  assert.equal(U.unblendLine(ALL, "ftf", []), null);
  assert.equal(U.unblendLine(null, "ftf", "hide"), null);
  // Unshipped copy: the line, or the move (its phrase), or the edge.
  assert.equal(U.unblendLine(without([U.UNBLEND_PROMPT]), "ftf", "hide"), null);
  assert.equal(U.unblendLine(without(["hide"]), "ftf", "hide"), null);
  assert.equal(U.unblendLine(without(["fight"]), "ftf", "fight"), null);
  assert.equal(U.unblendLine(without(["fight"]), "ftf", "hide"), "A part of you wants to hide right now.");
  assert.equal(U.unblendLine({ ...ALL, prompts: { ...ALL.prompts, unblend_line: { ...ALL.prompts.unblend_line, copy: "No slot." } } }, "ftf", "hide"), null);
  // Today's shipped file: nothing.
  for (const id of ["fight", "chase", "hide", "blank"]) assert.equal(U.unblendLine(SHIPPED, "ftf", id), null);
});

test("unblendLine with several picks: a line only when every pick has an edge and they share one move", () => {
  assert.equal(U.unblendLine(ALL, "oa", ["anger-lash", "anger-criticize"]), "A part of you wants to hit back right now.");
  assert.equal(U.unblendLine(ALL, "oa", ["anger-lash", "shame-hide"]), null, "two moves: no guess");
  assert.equal(U.unblendLine(ALL, "oa", ["anger-lash", "nope"]), null, "one pick without an edge");
  assert.equal(U.unblendLine(ALL, "oa", ["anger-lash", "fear-freeze"]), null, "one pick on a move never offered");
});

test("every line fits the voice contract's 90 characters, and every offerable move has a phrase", () => {
  for (const m of ALL.moves) {
    assert.ok(m.unblendPhrase, m.id);
    const line = ALL.prompts.unblend_line.copy.replace("{move}", m.unblendPhrase);
    assert.ok(line.length <= 90, `${m.id}: ${line.length}`);
  }
});

test("Recover's pull ids map onto their PullOption ids (content.py PULL_OPTIONS)", () => {
  const rows = [...read("schema/parts.cypher").matchAll(/MERGE \(p:PullOption \{id: "([a-z_]+)"\}\)\nSET p \+= \{flow: "recover", pullId: "([a-z_]+)"/g)];
  assert.equal(rows.length, 4);
  for (const [, id, pull] of rows) assert.equal(U.recoverPullOption(pull), id);
});

test("unblendShown: one bool in each host's own ext namespace", () => {
  for (const [source, tool] of [["ftf", "find-the-feeling"], ["oa", "opposite-action"], ["recover", "recovering-from-invalidation"]]) {
    const ns = U.UNBLEND_EXT_NS[source];
    assert.equal(SPINE_TOOLS[tool].module, ns, tool);
    assert.deepEqual(ext.EXT_SCHEMAS[ns].unblendShown, { t: "bool" });
    assert.equal(ext.validateExt({ [ns]: { unblendShown: true } }), JSON.stringify({ [ns]: { unblendShown: true } }));
    assert.throws(() => ext.validateExt({ [ns]: { unblendShown: "yes" } }), /boolean/);
  }
});

test("the hook: parts on and the host's say-so, then the line; recorded once it renders", () => {
  const hook = read("src/hooks/useUnblendLine.ts");
  assert.match(hook, /const partsOn = useUserProfile\(\)\.profile\.partsEnabled;/);
  assert.match(hook, /if \(!partsOn\) return;\s*let live = true;\s*getPartsContent\(\)/, "parts content is read only with parts on");
  assert.match(hook, /const line = partsOn && show \? unblendLine\(content, source, ids\) : null;/);
  assert.match(hook, /if \(line\) toolSession\.setExt\(\{ \[ns\]: \{ unblendShown: true \} \}\);/);
});

test("hosts: FTF on the step after the pull (the tool only), OA once an urge is picked, Recover after the pull unless the angry card unblends", () => {
  const ftf = read("src/pages/tools/FindTheFeeling.tsx");
  assert.match(ftf, /const afterPull = entry === 'tool' && state\.step !== 'pull' && history\.stack\[history\.stack\.length - 2\]\?\.step === 'pull';/);
  assert.match(ftf, /useUnblendLine\('ftf', state\.pull, afterPull\)/);
  assert.match(read("src/components/tools/findTheFeeling/shape/ShapeRoom.tsx"), /\{slots\.unblend && <p className="sr-small sr-unblend" role="status"[^>]*>\{slots\.unblend\}<\/p>\}/);
  assert.match(read("src/components/tools/findTheFeeling/tune/TuneRoom.tsx"), /\{slots\.unblend && \(\s*<p role="status"[^>]*>\{slots\.unblend\}<\/p>/);

  const oa = read("src/pages/tools/OppositeAction.tsx");
  assert.match(oa, /useUnblendLine\("oa", draft\.urgeId && draft\.urgeId !== "custom" \? draft\.urgeId : null, stage === "urge"\)/);
  assert.match(oa, /\{chosen && \(\s*<div[^>]*>\s*\{unblend && <p role="status" className=\{secondaryText\}>\{unblend\}<\/p>\}\s*<UrgeScale/, "above what comes next");

  const recover = read("src/pages/tools/InvalidationRecovery.tsx");
  assert.match(recover, /const cardThisVisit = angry !== null \|\| offerAngryCard\(\{ pull: 'fight', now: 0 \}, g, Boolean\(parts && angryReady\(parts, partsOn\)\), false\);/);
  assert.match(recover, /useUnblendLine\('recover', pull \? recoverPullOption\(pull\) : null, unblendOk && !\(pull === 'fight' && cardThisVisit\)\)/);
  assert.match(recover, /unblendOk=\{parts !== null\} cardThisVisit=\{cardThisVisit\}/);
  assert.match(recover, /<\/fieldset>\s*\{unblend && <p role="status" className=\{secondaryText\}>\{unblend\}<\/p>\}/);
  // The gate it leans on: a card that is ready and not yet offered may come for fight at any reading under the line.
  const g = { downshiftAt: 7 };
  assert.equal(offerAngryCard({ pull: "fight", now: 0 }, g, true, false), true, "card ready: no line for fight");
  assert.equal(offerAngryCard({ pull: "fight", now: 0 }, g, false, false), false, "card not ready: fight gets its line");

  // Nothing parts-related in a host's own source: the copy is all content.
  for (const f of ["src/pages/tools/FindTheFeeling.tsx", "src/pages/tools/OppositeAction.tsx", "src/pages/tools/InvalidationRecovery.tsx",
    "src/lib/unblendLine.ts", "src/hooks/useUnblendLine.ts", "src/components/tools/findTheFeeling/shape/ShapeRoom.tsx",
    "src/components/tools/findTheFeeling/tune/TuneRoom.tsx"]) {
    const code = read(f).replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, "");
    assert.doesNotMatch(code, /A part of you/, f);
    for (const m of ALL.moves) assert.ok(!code.includes(m.unblendPhrase), `${f}: ${m.unblendPhrase}`);
  }
});
