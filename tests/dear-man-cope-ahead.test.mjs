// DEAR MAN's cope ahead per part (docs/design/parts.md, the DEAR MAN row and Phase 3;
// dearman-cope-ahead): "Who might show up in this conversation?" in prep, the part's anchor set from
// kept lines or own words (setPartAnchor), carried to the Summary under the script, the part id in
// ext.er and the device-only resume draft. Nothing shows until the copy is signed off.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture } from "./lib/partsContentFixture.mjs";

const read = (f) => readFileSync(f, "utf8");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const shipped = JSON.parse(read("src/data/content/parts.json")).content;
const all = partsFromFixture(fixture, () => true);
const lib = await importTs("src/lib/copeAhead.ts");
const resume = await importTs("src/lib/dearManResume.ts");
const ext = await importTs("functions/src/spine/extSchemas.ts");
const clientTypes = await importTs("src/data/profileTypes.ts");
const tsx = read("src/pages/tools/DearMan.tsx");
const step = read("src/components/parts/CopeAheadStep.tsx");
const PID = "0f3c2b1a-9d8e-4c7b-a6f5-e4d3c2b1a098";

const part = (id, name = null, shapeSig = null) => ({
  id, name, status: "active", tender: false, moveIds: [], shapeSig,
  meta: { id, kind: "part", area: "my_parts", status: "active", source: "made", confirmedAt: null, revisitAt: null, prompt: "none" },
});

test("copy pins: flow dearman, step cope, every row a draft (nothing ships today)", () => {
  const prompts = {
    cope_title: "Who might show up in this conversation?",
    cope_anchor: "If {name} shows up:",
    cope_anchor_noname: "If that part shows up:",
    cope_set_anchor: "What would help if {name} shows up?",
    cope_set_anchor_noname: "What would help if that part shows up?",
    cope_unnamed: "A part",
  };
  for (const [id, copy] of Object.entries(prompts)) {
    const p = fixture.prompts[id];
    assert.deepEqual([p?.flow, p?.step, p?.copy, p?.reviewStatus], ["dearman", "cope", copy, "draft"], id);
    assert.ok(!shipped.prompts[id], `${id} ships only signed off`);
  }
  assert.deepEqual(fixture.options.dearman.cope.map((o) => [o.id, o.label, o.kind, o.reviewStatus]), [
    ["cope_not_sure", "Not sure", "chip", "draft"], ["cope_skip", "Skip", "chip", "draft"], ["cope_own", "In my words", "chip", "draft"],
    ["cope_change", "Change it", "chip", "draft"], ["cope_save", "Save", "chip", "draft"],
  ]);
  assert.deepEqual([...lib.COPE_PROMPTS].sort(), Object.keys(prompts).sort());
  assert.equal(lib.copeReady(shipped), false, "no visible change today");
  assert.equal(lib.copeReady(all), true, "with the copy signed off, the screen can show");
  assert.equal(lib.copeReady(null), false);
  // {anchor} is the person's own text or a kept line: a 90-wide slot, so it isn't in the prompt (the lint's
  // 90-character prompt limit) and the app draws it on its own line, in the serif.
  assert.match(read("scripts/voice-lint.mjs"), /anchor: 90,/);
  for (const id of Object.keys(prompts)) assert.doesNotMatch(fixture.prompts[id].copy, /\{anchor\}/, id);
});

test("gate: parts on, a kept part, the copy signed off, not flooded; each off → no screen", () => {
  const on = { partsOn: true, partCount: 1, ready: true, band: null };
  assert.equal(lib.showCopeAhead(on), true);
  assert.equal(lib.showCopeAhead({ ...on, band: "stirred" }), true);
  assert.equal(lib.showCopeAhead({ ...on, band: "steady" }), true);
  for (const off of [{ partsOn: false }, { partCount: 0 }, { ready: false }, { band: "flooded" }]) {
    assert.equal(lib.showCopeAhead({ ...on, ...off }), false, JSON.stringify(off));
  }
  // DEAR MAN wires it: parts on reads 'dear-man' (and nothing while off), the band is the visit's.
  assert.match(tsx, /useProfileContext\('dear-man', \{ enabled: partsOn \}\)/);
  assert.match(tsx, /const partsOn = useUserProfile\(\)\.profile\.partsEnabled;/);
  assert.match(tsx, /band: bandReading\?\.value \?\? band\.current\(\)\?\.value \?\? null,/);
  assert.match(tsx, /ready: copeReady\(copeCopy\)/);
  assert.match(tsx, /if \(!partsOn \|\| copeContent !== null\) return;/, "parts content read only with parts on");
});

test("placement: after What makes this hard?, before the script; back and resume follow it", () => {
  assert.match(tsx, /<button onClick=\{\(\) => setPhase\(copeShown \? 'cope' : 'describe'\)\}/);
  const cope = tsx.slice(tsx.indexOf("// ─── COPE AHEAD"), tsx.indexOf("// ─── DESCRIBE ───"));
  assert.ok(cope.length > 200, "the cope phase sits right before Describe");
  assert.ok(tsx.indexOf("What makes this hard?") < tsx.indexOf("// ─── COPE AHEAD"));
  assert.match(cope, /if \(!copeShown \|\| !copeCopy \|\| !copeSlices\) return null;/);
  assert.match(cope, /onGoOn=\{\(\) => setPhase\('describe'\)\}/);
  assert.match(tsx, /case 'cope': setSceneStep\(3\); setPhase\('scene'\); break;/);
  assert.match(tsx, /case 'describe':\s*if \(copeShown\) setPhase\('cope'\);\s*else \{ setSceneStep\(3\); setPhase\('scene'\); \}/);
  assert.match(tsx, /if \(phase === 'cope' && !copeShown && !copePending\) setPhase\('describe'\);/, "parts gone on resume: on to the script");
  // A plan step: the too-much link is under it, and its overlay covers it (P2 is never under the screen's chips).
  assert.deepEqual(resume.TOO_MUCH_PHASES.slice(0, 3), ["scene", "cope", "describe"]);
});

test("part chips: slice order (most recently visited first), at most four; names as given, unnamed → the kind label", () => {
  const parts = ["a", "b", "c", "d", "e"].map((id) => part(id, id === "b" ? null : `the ${id}`));
  assert.deepEqual(lib.copeParts(parts).map((p) => p.id), ["a", "b", "c", "d"]);
  assert.deepEqual(lib.copeParts(null), []);
  assert.deepEqual(lib.partChipLabel(all, { name: " the watcher " }), { text: "the watcher", named: true });
  assert.deepEqual(lib.partChipLabel(all, { name: null }), { text: "A part", named: false });
  assert.equal(lib.anchorLead(all, "the $& one"), "If the $& one shows up:", "a name is filled as typed");
  assert.equal(lib.anchorLead(all, ""), "If that part shows up:");
  assert.equal(lib.setAnchorLine(all, "Sam's critic"), "What would help if Sam's critic shows up?");
  assert.equal(lib.setAnchorLine(all, null), "What would help if that part shows up?");
  // The chip draws the part (PartFigure small) and the name in the serif.
  assert.match(step, /<PartFigure shapeSig=\{p\.shapeSig\} size=\{28\} \/>/);
  assert.match(step, /label\.named \? 'font-serif/);
});

test("kept lines to anchor with: own and kept witness lines, newest first, at most four, the same words once", () => {
  const own = (id, text, at) => ({ id, text, emotionIds: [], situationId: null, moment: null, uses: 0, lastUsedAt: null, meta: { confirmedAt: at } });
  const lines = lib.keptLines(
    [own("o1", "I can take a breath first", "2026-10-05T00:00:00Z"), own("o2", "  ", "2026-10-09T00:00:00Z"), own("o3", "That sounds hard.", "2026-10-01T00:00:00Z")],
    [{ lineId: "w1", text: "That sounds hard.", confirmedAt: "2026-10-08T00:00:00Z" }, { lineId: "w2", text: "Of course that hurt.", confirmedAt: "2026-10-07T00:00:00Z" },
      { lineId: "w3", text: "You're allowed to want this.", confirmedAt: "2026-10-06T00:00:00Z" }, { lineId: "w4", text: "Old one", confirmedAt: null }],
  );
  assert.deepEqual(lines.map((l) => l.lineId), ["w1", "w2", "w3", "o1"]);
  assert.deepEqual(lib.keptLines(null, undefined), []);
  assert.equal(lib.ownAnchor("  breathe  "), "breathe");
  assert.equal(lib.ownAnchor("   "), null);
  assert.equal(lib.ownAnchor("x".repeat(91)), null);
  assert.equal(lib.COPE_OWN_MAX, 90);
  assert.match(step, /maxLength=\{COPE_OWN_MAX\}/);
  // Save goes to the one writer with exactly one of the two.
  assert.match(step, /setPartAnchor\(line \? \{ partId: part\.id, lineId: line\.lineId \} : \{ partId: part\.id, own: text \}\)/);
  assert.match(tsx, /profileCache\.bump\(version\);/);
});

test("the anchor is carried to the Summary, under the script, quietly", () => {
  const summary = tsx.slice(tsx.indexOf("if (phase === 'summary')"), tsx.indexOf("// ─── DEBRIEF") > 0 ? tsx.indexOf("// ─── DEBRIEF") : undefined);
  const at = (s) => { const i = summary.indexOf(s); assert.ok(i > 0, s); return i; };
  assert.ok(at("Why It Matters") < at('data-testid="cope-carry"'));
  assert.ok(at('data-testid="cope-carry"') < at("My Anchor"));
  assert.match(summary, /<p className="text-sm text-\[var\(--color-text-secondary\)\]">\{copeCarry\.lead\}<\/p>/);
  assert.match(summary, /<p className="font-serif [^"]*">\{copeCarry\.anchor\}<\/p>/);
  assert.match(tsx, /const copeCarry = partsOn && copeCopy && copeReady\(copeCopy\) && copePart && copeAnchorMap\[copePart\.id\]/);
});

test("ext: copeAheadPartId under er, an id only (never the anchor); Not sure / Skip clear it", () => {
  assert.deepEqual(ext.EXT_SCHEMAS.er.copeAheadPartId, { t: "id" });
  assert.deepEqual(JSON.parse(ext.validateExt({ er: { copeAheadPartId: PID } })), { er: { copeAheadPartId: PID } });
  assert.equal(ext.validateExt({ er: { copeAheadPartId: null } }), null, "null clears it");
  assert.throws(() => ext.validateExt({ er: { copeAheadPartId: "If they push back: breathe" } }), /expected an id/);
  assert.throws(() => ext.validateExt({ er: { copeAnchor: "breathe" } }), /not registered/);
  assert.deepEqual(lib.copeExt(PID), { er: { copeAheadPartId: PID } });
  assert.deepEqual(lib.copeExt(null), { er: { copeAheadPartId: null } });
  assert.match(tsx, /setCopeAheadPartId\(id\);\s*session\.setExt\(copeExt\(id\)\);/);
  assert.match(step, /const goOn = \(\) => \{ clearForm\(\); onPick\(null\); onGoOn\(\); \};/, "Not sure / Skip write nothing and go on");
});

test("resume draft: carries the part id, not the anchor; old drafts still resume; 'cope' is a step", () => {
  const base = {
    relationshipType: "boss", situationType: "ask", priorities: [], barriers: [], barriersCustom: "", describeId: null,
    describeCustom: "", feelings: [], feelingCustom: "", assertIds: [], assertDetails: {}, assertCustom: "",
    reinforceIds: [], reinforceCustom: "", anchorPhrase: "", middleGroundId: null, middleGroundCustom: "", walkAwayId: null, walkAwayCustom: "",
  };
  assert.equal(resume.isDearManDraft(resume.dearManDraftOf(base)), true, "a draft from before cope ahead");
  const d = resume.dearManDraftOf({ ...base, copeAheadPartId: PID });
  assert.equal(resume.isDearManDraft(d), true);
  assert.equal(resume.isDearManDraft({ ...d, copeAheadPartId: null }), true);
  assert.equal(resume.isDearManDraft({ ...d, copeAheadPartId: 7 }), false);
  assert.deepEqual(Object.keys(d).filter((k) => /cope/i.test(k)), ["copeAheadPartId"], "no anchor text in the draft");
  assert.deepEqual(resume.dearManStepFromId(resume.dearManStepId({ phase: "cope", sceneStep: 0 })), { phase: "cope", sceneStep: 0 });
  assert.match(tsx, /walkAwayId, walkAwayCustom, copeAheadPartId,\n {2}\}\);/);
  assert.match(tsx, /setCopeAheadPartId\(d\.copeAheadPartId \?\? null\);/);
});

test("no hard-coded user-facing strings in the cope screen; DEAR MAN reads only its declared slices", () => {
  // JSX text, string-literal labels and placeholders: every word on the screen is content or the person's own.
  assert.doesNotMatch(step, />\s*[A-Za-z][^<>{}]*</, "JSX text");
  assert.doesNotMatch(step, /(aria-label|placeholder|title)="[^"]+"/, "a literal label");
  assert.doesNotMatch(step, /'[A-Z][a-z]+ [a-z]+[^']*'/, "an English phrase in a string");
  assert.deepEqual(clientTypes.PROFILE_NEEDS["dear-man"], ["parts", "ownLines", "savedLines", "partAnchors"]);
  assert.ok(!clientTypes.PROFILE_NEEDS["dear-man"].includes("partDetail"));
});
