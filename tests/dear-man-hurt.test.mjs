// Recover → DEAR MAN: the hurt picked on Recover's angry-part card, as the first "I felt" chip in Express, not
// selected (src/lib/dearManHurt.ts). Only a hurt the shipped parts content has, with a felt phrase. The hand-built prep
// that showed it is gone (IE-B4); carrying it into the prep skill is open (docs/design/dear-man-prep.md), and these
// rules are what that port composes. History still reads saved hurt ids.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture } from "./lib/partsContentFixture.mjs";

const { hurtFeelingChip, feelingLabel, feelingEmotionWords, hurtLabel, chipCase } = await importTs("src/lib/dearManHurt.ts");
const { getPartsContent } = await importTs("src/services/partsContent.ts");
const fixture = JSON.parse(readFileSync("tests/fixtures/parts-content.json", "utf8"));
const recover = readFileSync("src/pages/tools/InvalidationRecovery.tsx", "utf8");
const chips = [{ id: "feel_hurt", label: "Hurt" }, { id: "feel_disrespected", label: "Disrespected" }];
/** parts.json as it would be with these hurts signed off. */
const shippedWith = (ids) => partsFromFixture(fixture, (id) => ids.includes(id));

test("the chip: the hurt's felt phrase alone, only for a hurt the shipped content has", async () => {
  const hurts = shippedWith(["brushed_off", "not_mattering"]).hurts;
  // Displayed like the other chips: first letter capitalised, the rest as written; saved as the id.
  assert.deepEqual(hurtFeelingChip("brushed_off", hurts), { id: "brushed_off", label: "Brushed off", emotionIds: ["disrespected", "hurt"] });
  assert.equal(hurtFeelingChip("not_mattering", hurts).label, "Like I didn't matter");
  assert.equal(chipCase("  alone in this "), "Alone in this");
  // A draft hurt (not in parts.json), an unknown id, no hurt, or no content: no chip.
  assert.equal(hurtFeelingChip("left_out", hurts), null);
  assert.equal(hurtFeelingChip("nope", hurts), null);
  assert.equal(hurtFeelingChip(undefined, hurts), null);
  assert.equal(hurtFeelingChip("brushed_off", null), null);
  // A hurt without its felt phrase isn't offered.
  assert.equal(hurtFeelingChip("brushed_off", hurts.map((h) => ({ ...h, feltPhrase: " " }))), null);
  // Every hurt signed off 17 Oct (Claudia: ship it all): the shipped file offers each one's chip, the
  // same chip the fixture's row makes, and a hurt it lacks still gets none.
  const shippedHurts = (await getPartsContent()).hurts;
  assert.deepEqual(shippedHurts.map((h) => h.id).sort(), fixture.hurts.filter((h) => h.reviewStatus === "approved").map((h) => h.id).sort());
  for (const h of fixture.hurts) {
    assert.equal(h.reviewStatus, "approved", h.id);
    assert.notEqual(hurtFeelingChip(h.id, shippedHurts), null, h.id);
    // The same chip: id, label and NAMED_AS words (the snapshot and the fixture order those words differently).
    const norm = (c) => ({ ...c, emotionIds: [...c.emotionIds].sort() });
    assert.deepEqual(norm(hurtFeelingChip(h.id, shippedHurts)), norm(hurtFeelingChip(h.id, fixture.hurts)), h.id);
  }
  assert.equal(hurtFeelingChip("brushed_off", shippedHurts.filter((h) => h.id !== "brushed_off")), null);
  // Nothing parts-worded, parts on or off: every shipped felt phrase is the chip as it stands.
  for (const h of fixture.hurts) {
    const chip = hurtFeelingChip(h.id, fixture.hurts);
    assert.equal(chip.label, chipCase(h.feltPhrase));
    assert.equal(chip.label.toLowerCase(), h.feltPhrase.trim().toLowerCase());
    assert.doesNotMatch(chip.label, /\bparts?\b/i, h.id);
  }
});

test("a resumed draft keeps a saved hurt's chip, so it can be seen and unpicked", () => {
  const hurts = shippedWith(["laughed_at"]).hurts;
  assert.equal(hurtFeelingChip(null, hurts, ["feel_hurt", "laughed_at"]).id, "laughed_at");
  assert.equal(hurtFeelingChip(null, hurts, ["feel_hurt"]), null);
  assert.equal(hurtFeelingChip(null, hurts, ["left_out"]), null, "a hurt that doesn't ship stays unworded");
});

test("what Express reads back: the chip's words in the summary, its NAMED_AS words for the visit", () => {
  const hurts = shippedWith(["brushed_off"]).hurts;
  const chip = hurtFeelingChip("brushed_off", hurts);
  assert.deepEqual(["feel_hurt", "brushed_off", "gone"].map((id) => feelingLabel(id, chips, hurts)), ["Hurt", "Brushed off", ""]);
  assert.deepEqual(feelingEmotionWords(["feel_hurt", "brushed_off"], chips, chip), ["Hurt", "disrespected", "hurt"]);
  // No hurt in play: exactly the DEAR MAN chips' labels, as before; an id that isn't one is dropped.
  assert.deepEqual(feelingEmotionWords(["feel_hurt", "brushed_off"], chips, null), ["Hurt"]);
  assert.deepEqual(feelingEmotionWords(["feel_disrespected"], chips, null), ["Disrespected"]);
});

test("the saved value: a hurt id beside the feel_* ids in DearManSession.feelings, stored as given", () => {
  assert.match(readFileSync("functions/src/dearMan/index.ts", "utf8"), /feelings: data\.feelings \|\| \[\],/);
});

test("Recover hands over the card's hurt only when there is one", () => {
  assert.match(recover, /\.\.\.\(angryHurtId \? \{ hurtId: angryHurtId \} : \{\}\)/);
  assert.match(recover, /setAngryHurtId\(r\.hurtId\)/, "Not sure ends with null");
  assert.match(recover, /onSkip=\{\(\) => \{ setAngryHurtId\(null\);/, "Not now hands over none");
  assert.match(recover, /setAngryHurtId\(null\);\s*dispatch\(\{ type: 'reset' \}\)/, "a new round starts without it");
});

test("History shows a saved hurt as DEAR MAN showed it: the shipped phrase in chip case, else the readable id", () => {
  const hurts = shippedWith(["not_mattering"]).hurts;
  assert.equal(hurtLabel("not_mattering", hurts), "Like I didn't matter");
  assert.equal(hurtLabel("brushed_off", hurts), null, "a hurt that doesn't ship: History humanizes the id");
  assert.equal(hurtLabel("feel_hurt", hurts), null);
  const history = readFileSync("src/pages/History.tsx", "utf8");
  assert.match(history, /session\.feelings\.map\(f => hurtLabel\(f, hurts\) \?\? humanize\(f, feelingLabels\)\)/);
  assert.match(history, /if \(!anyHurt \|\| hurts\) return;/, "parts content read only when a session holds a hurt id");
});
