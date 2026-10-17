// The next-day check-back after a meeting (docs/design/parts.md, Meet a part step 10; part-checkback):
// its copy is drafts in parts content, its follow-up type is a spine row, Today reads the part's name
// through the 'today' profile slice, and the card renders only when every word of it is signed off.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture } from "./lib/partsContentFixture.mjs";
import { followUpTypes } from "./lib/practiceSpine.mjs";

const read = (f) => readFileSync(f, "utf8");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const shipped = JSON.parse(read("src/data/content/parts.json")).content;
const lib = await importTs("src/lib/partCheckback.ts");
const option = (flow, step, id) => fixture.options[flow]?.[step]?.find((o) => o.id === id);

test("copy pins: the check-back, its answers and the close question, all drafts until Claudia signs them off", () => {
  const prompts = {
    checkback_title: ["checkback", "checkback", "How's {name} today?"],
    checkback_title_noname: ["checkback", "checkback", "How's the part you met yesterday?"],
    close_checkback: ["meet", "close", "Check back with it tomorrow?"],
    aftercare_louder: ["aftercare", "louder", "Things can get louder after time with a part."],
  };
  for (const [id, [flow, step, copy]] of Object.entries(prompts)) {
    assert.deepEqual([fixture.prompts[id]?.flow, fixture.prompts[id]?.step, fixture.prompts[id]?.copy], [flow, step, copy], id);
  }
  const options = [
    ["checkback", "checkback", "checkback_settled", "Settled", "end"], ["checkback", "checkback", "checkback_same", "Same", "end"],
    ["checkback", "checkback", "checkback_louder", "Louder", "aftercare"], ["checkback", "checkback", "checkback_skip", "Skip", "end"],
    ["meet", "close", "close_checkback_yes", "Yes", "checkback"], ["meet", "close", "close_checkback_no", "No thanks", "end"],
    ["aftercare", "louder", "louder_body", "Something for my body", "body_first"], ["aftercare", "louder", "louder_not_now", "Not now", "end"],
  ];
  for (const [flow, step, id, label, branch] of options) {
    assert.deepEqual([option(flow, step, id)?.label, option(flow, step, id)?.branch], [label, branch], id);
  }
  assert.deepEqual(fixture.options.checkback.checkback.map((o) => o.id), ["checkback_settled", "checkback_same", "checkback_louder", "checkback_skip"]);
  for (const id of ["checkback_title", "checkback_title_noname", "close_checkback"]) assert.equal(fixture.prompts[id].reviewStatus, "draft", id);
  for (const id of ["checkback_title", "checkback_title_noname", "close_checkback"]) assert.ok(!shipped.prompts[id], `${id} ships only signed off`);
});

test("the part_checkback follow-up type: mf, quality, inline, tomorrow 10:00, stale after 36 h, no reminders; drafts mirror the parts copy", () => {
  const t = followUpTypes().find((x) => x.id === "part_checkback");
  assert.ok(t, "row exists");
  assert.match(t.s, /t\.ownerModule = "mf"/);
  assert.deepEqual([t.tier, t.mode, t.enabled], ["quality", "inline", true]);
  assert.deepEqual(t.content.window, { kind: "at_local", days: 1, time: "10:00" });
  assert.match(t.s, /t\.staleAfterHours = 36/);
  assert.match(t.s, /t\.notifyPush = false, t\.notifyInTab = false/);
  assert.equal(t.content.copy.title, fixture.prompts.checkback_title.copy);
  assert.deepEqual(t.content.choices.map((c) => [c.id, c.label, c.status]),
    [["settled", "Settled", "done"], ["same", "Same", "done"], ["louder", "Louder", "done"], ["skip", "Skip", "dismissed"]]);
  for (const c of t.content.choices) assert.equal(c.label, option("checkback", "checkback", `checkback_${c.id}`).label, c.id);
  const spine = JSON.parse(read("src/data/content/spine.json")).content;
  assert.ok(spine.followUpTypes.some((x) => x.id === "part_checkback"), "spine.json carries the row");
});

test("Today's card gate: no flowReady, no card (and the stack drops it); every id it needs is in the content", () => {
  const ids = [...lib.CHECKBACK_PROMPTS, ...lib.CHECKBACK_OPTIONS];
  for (const id of lib.CHECKBACK_PROMPTS) assert.ok(fixture.prompts[id], id);
  for (const id of lib.CHECKBACK_OPTIONS) assert.ok(Object.values(fixture.options).some((s) => Object.values(s).flat().some((o) => o.id === id)), id);
  const ready = partsFromFixture(fixture, (id) => ids.includes(id));
  assert.equal(lib.checkbackReady(ready), true);
  for (const id of ids) {
    const without = partsFromFixture(fixture, (x) => ids.includes(x) && x !== id);
    assert.equal(lib.checkbackReady(without), false, `${id} missing hides the card`);
  }
  assert.equal(lib.checkbackReady(null), false);
  assert.equal(lib.checkbackReady(shipped), ids.every((id) => shipped.prompts[id] || Object.values(shipped.options).some((s) => Object.values(s).flat().some((o) => o.id === id))));
  const items = [{ id: "a", type: "part_checkback" }, { id: "b", type: "recover_log" }];
  assert.deepEqual(lib.withReadyCheckbacks(items, false).map((i) => i.id), ["b"]);
  assert.deepEqual(lib.withReadyCheckbacks(items, true).map((i) => i.id), ["a", "b"]);
  // What the card says comes from the content: the name filled, the unnamed wording without one.
  assert.equal(lib.checkbackTitle(ready, " the watcher "), "How's the watcher today?");
  assert.equal(lib.checkbackTitle(ready, null), "How's the part you met yesterday?");
  assert.equal(lib.checkbackTitle(ready, "  "), "How's the part you met yesterday?");
  assert.deepEqual(lib.checkbackChoices(ready).map((c) => [c.label, c.answer]), [["Settled", "settled"], ["Same", "same"], ["Louder", "louder"], ["Skip", "skip"]]);
  assert.deepEqual(Object.values(lib.louderAftercare(ready)).map((x) => (typeof x === "string" ? x : x.label)),
    ["Things can get louder after time with a part.", "Something for my body", "Not now"]);
});

test("the card: no hard-coded user-facing strings; Louder's body tools are the too-much link's P2; gated in TodayProvider", () => {
  const card = read("src/components/parts/PartCheckbackCard.tsx");
  const jsx = card.slice(card.indexOf("return ("));
  assert.doesNotMatch(jsx.replace(/\{[^{}]*\}/g, ""), />\s*[A-Za-z][^<]*</, "text between tags comes from content");
  assert.doesNotMatch(card, /(aria-label|label)="[A-Z]/, "no literal labels");
  assert.match(card, /if \(!content \|\| !\(two \? twoCheckbackReady\(content\) : checkbackReady\(content\)\)\) return null;/);
  assert.match(card, /<TooMuchLink host="meet-a-part" label=\{after\.body\.label\}/);
  assert.match(card, /answerPartCheckback\(\{ id: item\.id, answer: a \}\)/);
  const provider = read("src/contexts/TodayContext.tsx");
  assert.match(provider, /const partsOn = useUserProfile\(\)\.profile\.partsEnabled === true;/);
  assert.match(provider, /const checkbacksShown = partsOn && checkbackReady\(partsContent\);/);
  assert.match(provider, /items: withReadyCheckbacks\(/);
  assert.match(read("src/components/today/TodayStack.tsx"), /item\.type === PART_CHECKBACK_TYPE \|\| item\.type === TWO_PULLS_CHECKBACK_TYPE\) return <PartCheckbackCard/);
  assert.match(provider, /const twoCheckbacksShown = partsOn && twoCheckbackReady\(partsContent\);/, "Two pulls' card: its two-names question ships too");
});

test("server: spine leaves the type to parts; the name comes through the 'today' slice; spine never imports profile/", () => {
  const today = read("functions/src/spine/today.ts");
  assert.match(today, /AND NOT t\.id IN \$owned/);
  const cb = read("functions/src/parts/checkback.ts");
  assert.match(cb, /readProfileSlices\(tx, uid, 'today', now\.getTime\(\)\)/);
  assert.match(cb, /registerTodaySource\(partCheckbackItems, \[PART_CHECKBACK_TYPE\]\)/);
  assert.match(cb, /GUARDS\.FollowUp\.update\('f'\)/, "resolves under spine's own guard");
  assert.match(cb, /from '\.\/keep'/, "Louder's pause is a keep.ts query");
  assert.match(read("functions/src/parts/index.ts"), /from '\.\/checkback'/, "the Today source registers when the module loads");
});
