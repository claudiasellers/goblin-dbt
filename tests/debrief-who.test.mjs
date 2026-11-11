// DEAR MAN's debrief: who showed up? (docs/design/parts.md, the DEAR MAN row): src/lib/debriefWho.ts,
// src/components/parts/DebriefWho.tsx and its step in the debrief skill (src/components/skillPlayer/DebriefWhoEmbed.tsx). tagPart's debrief
// rules are pinned in functions/test/unit/parts.test.cjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture, withoutIds } from "./lib/partsContentFixture.mjs";

const read = (f) => readFileSync(f, "utf8");
const lib = await importTs("src/lib/debriefWho.ts");
const tagLib = await importTs("src/lib/partTag.ts");
const ext = await importTs("functions/src/spine/extSchemas.ts");
const resume = await importTs("src/lib/dearManResume.ts");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const IDS = [...lib.DEBRIEF_PROMPTS, ...lib.DEBRIEF_OPTIONS, ...tagLib.TAG_PROMPTS, ...tagLib.TAG_OPTIONS, ...tagLib.UNNAMED_PROMPTS];
const shipped = (ids) => partsFromFixture(fixture, (id) => ids.includes(id));
const content = shipped(IDS);
/** parts.json as the app ships it: every line signed off 17 Oct (Claudia: ship it all). */
const real = JSON.parse(read("src/data/content/parts.json")).content;

test("copy: dearman/debrief, its own lines only (the tag row's are reused, not copied)", () => {
  assert.deepEqual(lib.DEBRIEF_PROMPTS.map((id) => [id, fixture.prompts[id].flow, fixture.prompts[id].step, fixture.prompts[id].copy]), [
    ["debrief_who", "dearman", "debrief", "Was one of your parts there?"],
    ["debrief_who_named", "dearman", "debrief", "Did {name} show up?"],
  ]);
  assert.deepEqual(fixture.options.dearman.debrief.map((o) => [o.id, o.label]), [["debrief_yes", "Yes"], ["debrief_a_bit", "A bit"], ["debrief_no", "No"]]);
  const all = JSON.stringify(fixture.options.dearman.debrief) + JSON.stringify(Object.entries(fixture.prompts).filter(([, p]) => p.step === "debrief"));
  assert.doesNotMatch(all, /Skip|A new one|Want to come back/, "the tag row's lines are not duplicated");
});

test("gate: parts on, a kept part, every line shipped (its own and the tag row's)", () => {
  assert.equal(lib.debriefWhoReady(content), true);
  for (const id of IDS) assert.equal(lib.debriefWhoReady(shipped(IDS.filter((x) => x !== id))), false, `${id} missing`);
  assert.equal(lib.debriefWhoReady(null), false);
  assert.equal(lib.debriefWhoReady(real), true, "the shipped file: the screen shows");
  for (const id of IDS) assert.equal(lib.debriefWhoReady(withoutIds(real, id)), false, `shipped file without ${id}`);
  const on = { partsOn: true, partCount: 1, ready: true };
  assert.equal(lib.showDebriefWho(on), true);
  for (const [k, v] of [["partsOn", false], ["partCount", 0], ["ready", false], ["answered", true]]) assert.equal(lib.showDebriefWho({ ...on, [k]: v }), false, k);
});

test("form: named when this visit's prep chose a kept, named part; general otherwise", () => {
  const parts = [{ id: "p1", name: "The guard", status: "active" }, { id: "p2", name: null, status: "resting" }];
  assert.deepEqual(lib.debriefForm("p1", parts), { kind: "named", partId: "p1", name: "The guard" });
  assert.deepEqual(lib.debriefForm(null, parts), { kind: "general" }, "prep chose none (or a debrief-only visit)");
  assert.deepEqual(lib.debriefForm("gone", parts), { kind: "general" }, "set aside since: not in the slice");
  assert.deepEqual(lib.debriefForm("p2", parts), { kind: "general" }, "no name to ask with");
  assert.deepEqual(lib.namedCopy(content, "$& kid"), {
    question: "Did $& kid show up?",
    answers: [{ id: "yes", label: "Yes" }, { id: "a_bit", label: "A bit" }, { id: "no", label: "No" }],
    skip: "Skip",
  });
  assert.equal(lib.generalQuestion(content), "Was one of your parts there?");
});

test("payloads: Yes / A bit a debrief tag with its strength; ext.er.whoShowedUp an id", () => {
  assert.deepEqual(lib.debriefTag("t", "p1", "s", "a_bit"), { id: "t", partId: "p1", toolSessionId: "s", source: "debrief", strength: "a_bit" });
  for (const a of ["yes", "a_bit", "no"]) assert.deepEqual(JSON.parse(ext.validateExt({ er: { whoShowedUp: a } })).er, { whoShowedUp: a });
  assert.throws(() => ext.validateExt({ er: { whoShowedUp: "The guard showed up" } }), /expected an id/, "never the name");
  const card = read("src/components/parts/DebriefWho.tsx");
  assert.match(card, /if \(a !== 'no'\) tagPart\(debriefTag\(newId\(\), form\.partId, toolSessionId, a\)\)\.catch/, "No writes nothing");
  assert.match(card, /<button type="button" className=\{quiet\} onClick=\{skip\}>\{copy\.skip\}<\/button>/, "Skip writes nothing");
  assert.match(card, /const skip = \(\) => \{ markTagRowAnswered\(toolSessionId, 'debrief'\); onDone\(\); \};/, "but counts as answered");
  assert.match(card, /const answer = \(a: WhoShowedUp\) => \{\s*markTagRowAnswered\(toolSessionId, 'debrief'\);/);
  assert.match(card, /<PartTagRow toolId="dear-man" toolSessionId=\{toolSessionId\} content=\{content\} question=\{generalQuestion\(content\)\} debrief onGone=\{onDone\} \/>/,
    "the general form is the tag row's own chips");
  const jsx = card.slice(card.indexOf("return (\n    <section"));
  assert.deepEqual([...jsx.matchAll(/>([^<>{}()=;]*[A-Za-z][^<>{}()=;]*)</g)].map((m) => m[1].trim()), [], "every word from the content");
  assert.doesNotMatch(card, /await /, "never holds up the debrief");
});

test("DEAR MAN's debrief skill: its own step after Underneath, before the reflection; never under P2 or the overlay", () => {
  const skills = JSON.parse(read("src/data/content/skills.json")).content.skills;
  const dm = skills.find((s) => s.id === "dear_man_debrief");
  const step = (id) => dm.steps.find((s) => s.id === id);
  assert.deepEqual(step("underneath").next.map((n) => n.to), ["who"], "from Underneath");
  assert.equal(step("who").kind, "embed");
  assert.equal(step("who").embed, "debriefWho");
  assert.deepEqual(step("who").next.map((n) => n.to), ["reflect"]);
  const embed = read("src/components/skillPlayer/DebriefWhoEmbed.tsx");
  assert.match(embed, /const shown = settled && showDebriefWho\(\{\s*partsOn, partCount: profile\.slices\?\.parts\.length \?\? 0, ready: debriefWhoReady\(content \?\? null\),\s*answered: tagRowAnswered\(session\.id, 'debrief'\),\s*\}\);/);
  assert.match(embed, /useEffect\(\(\) => \{ if \(settled && !shown\) finish\('not_shown'\); \}\);/, "gate fails: straight on");
  assert.match(embed, /copeAheadPartId=\{ctx\?\.partId \?\? null\} toolSessionId=\{session\.id\}/, "the prep's pick, carried in as the part");
  assert.match(embed, /onDone=\{\(\) => finish\(answer\.current \?\? \(ctx\?\.partId \? 'skip' : 'general'\)\)\}/, "the named form's answer only");
  assert.ok(!resume.TOO_MUCH_PHASES.some((p) => p.startsWith("debrief")), "no too-much overlay over the debrief");
  assert.doesNotMatch(read("src/pages/tools/DearMan.tsx"), /DebriefWho|debrief-parts/, "the prep page carries no debrief step");
});
