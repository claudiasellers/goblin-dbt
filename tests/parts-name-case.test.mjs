// A part's name (or a move's phrase) that opens a sentence takes a capital at render time, in the one
// shared slot filler (src/lib/partsContent.ts `fillPartsSegments`); the stored name is never changed. The
// keepsake sets its two names in italics; the server's keepsake text capitalises the same way.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture } from "./lib/partsContentFixture.mjs";

const P = await importTs("src/lib/partsContent.ts");
const S = await importTs("src/lib/twoPullsSave.ts");
const K = await importTs("functions/src/parts/pulls/keepsake.ts");
const CB = await importTs("src/lib/partCheckback.ts");
const DW = await importTs("src/lib/debriefWho.ts");
const CA = await importTs("src/lib/copeAhead.ts");

const fixture = JSON.parse(readFileSync("tests/fixtures/parts-content.json", "utf8"));
const ALL = partsFromFixture(fixture, () => true);

test("the shared filler: a lowercase name opening a sentence takes a capital; a capital, a digit or an emoji is left", () => {
  for (const tpl of ["{name} has been resting.", "Fine. {name} came back", "Really? {name} came back", "Wow! {name} came back", "One\n{name} came back"]) {
    assert.match(P.fillParts(tpl, { name: "the one who hides" }), /(^|[.?!\n]\s*)The one who hides came back|^The one who hides has/, tpl);
  }
  assert.equal(P.fillParts("{name} has been resting.", { name: "Runner" }), "Runner has been resting.");
  assert.equal(P.fillParts("{name} has been resting.", { name: "🐢 slow one" }), "🐢 slow one has been resting.");
  assert.equal(P.fillParts("{name} has been resting.", { name: "3am voice" }), "3am voice has been resting.");
  // Mid-sentence, after a comma or a colon: as written.
  assert.equal(P.fillParts("If {name} shows up:", { name: "the one who hides" }), "If the one who hides shows up:");
  assert.equal(P.fillParts("Its job: {name}", { name: "the one who hides" }), "Its job: the one who hides");
  // Only the first letter; the rest of the name is never touched.
  assert.equal(P.fillParts("{name} is here", { name: "the iPhone one" }), "The iPhone one is here");
  // A missing slot stays as written; strict says null.
  assert.equal(P.fillParts("{name} is here", {}), "{name} is here");
  assert.equal(P.fillPartsLine("{name} is here", {}, { strict: true }), null);
  assert.deepEqual(P.fillPartsSegments("{A} and {B} both", { A: "the one", B: "Runner" }),
    [{ text: "The one", slot: "A" }, { text: " and " }, { text: "Runner", slot: "B" }, { text: " both" }]);
});

test("the keepsake: a lowercase own name that opens it is capitalised, client and server alike; the names are marked for italics", () => {
  const copy = Object.fromEntries(fixture.keepsake.map((k) => [k.id, k.copy]));
  const pairName = fixture.prompts.pulls_pair_name.copy;
  const PA = "4f2c9a0e-1b2c-4d5e-8f90-123456789aaa";
  const PB = "4f2c9a0e-1b2c-4d5e-8f90-123456789bbb";
  const want = "not to be left";
  const cases = [
    ["the one who chases", "the one who hides", "The one who chases and the one who hides both want me not to be left."],
    ["Runner", "the one who hides", "Runner and the one who hides both want me not to be left."],
    ["🐢 slow one", "Runner", "🐢 slow one and Runner both want me not to be left."],
    ["3am voice", "Runner", "3am voice and Runner both want me not to be left."],
  ];
  for (const [a, b, expected] of cases) {
    const known = [
      { id: PA, name: a, tender: false, moveIds: ["chase"], shapeSig: null },
      { id: PB, name: b, tender: false, moveIds: ["hide"], shapeSig: null },
    ];
    const v = S.resolveVisit(ALL, { kind: "parts", aId: PA, bId: PB }, known);
    const lines = S.keepsakeLines(ALL, v, want);
    assert.equal(lines[0], expected);
    assert.equal(v.a.name, a, "the stored name is never changed");
    const side = (s) => K.sideName({ name: s.part?.name ?? null, found: true, unblendPhrase: "x" }, pairName);
    assert.equal(S.keepsakeText(lines), K.keepsakeText(copy, side(v.a), side(v.b), want));
    const segs = S.keepsakeSegments(ALL, v, want);
    assert.deepEqual(segs.filter((x) => x.slot === "A" || x.slot === "B").map((x) => x.text), [expected.split(" and ")[0], b]);
  }
  const screens = readFileSync("src/components/parts/pulls/PullsScreens.tsx", "utf8");
  assert.match(screens, /seg\.slot === 'A' \|\| seg\.slot === 'B' \? <em key=\{i\}>\{seg\.text\}<\/em>/);
  assert.match(readFileSync("src/pages/tools/TwoPulls.tsx", "utf8"), /<Keepsake lines=\{lines\} first=\{first\}/);
});

test("checkback, debrief and cope ahead: through the shared filler", () => {
  assert.equal(CB.checkbackTitle(ALL, "the one who hides"), "How's the one who hides today?");
  assert.equal(DW.namedCopy(ALL, "the one who hides").question, "Did the one who hides show up?");
  assert.equal(CA.anchorLead(ALL, "the one who hides"), "If the one who hides shows up:");
  // A template that opens with the name: the same helper gives the capital wherever copy puts it first.
  const turned = { ...ALL, prompts: { ...ALL.prompts, checkback_title: { ...ALL.prompts.checkback_title, copy: "{name}: how is it today?" } } };
  assert.equal(CB.checkbackTitle(turned, "the one who hides"), "The one who hides: how is it today?");
});
