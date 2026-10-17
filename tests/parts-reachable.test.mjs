// Parts made reachable (parts-reachable): Meet a part in the Tools list with parts on and its copy
// shipped (tests/meet-a-part-page.test.mjs pins the list itself), and the parts switch findable from Me
// with parts off: a quiet card where Parts of me would be, with Settings' switch and lines, one write.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture } from "./lib/partsContentFixture.mjs";

const read = (f) => readFileSync(f, "utf8");
const S = await importTs("src/lib/partsSettings.ts");
const M = await importTs("src/lib/partsOfMe.ts");
const { PartsOffCard } = await importTs("src/components/parts/PartsOffCard.tsx");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const ALL = partsFromFixture(fixture, () => true);
const only = (ids) => partsFromFixture(fixture, (id) => ids.includes(id));

test("the Me card's copy: Settings' switch lines, and only once Parts of me's lines ship too", () => {
  assert.deepEqual([...S.PARTS_ME_OFF_PROMPTS], ["settings_label", "settings_blurb", "settings_dissociation", "settings_off"]);
  for (const id of [...S.PARTS_ME_OFF_PROMPTS, ...M.PARTS_OF_ME_REQUIRED.prompts]) assert.ok(S.PARTS_ME_OFF_REQUIRED.prompts.includes(id), id);
  assert.equal(S.partsMeOffCopy(null), null);
  assert.equal(S.partsMeOffCopy(partsFromFixture(fixture)), null, "nothing signed off today: no card");
  assert.equal(S.partsMeOffCopy(only([...S.PARTS_ME_OFF_PROMPTS])), null, "its own lines alone: turning on would show nothing");
  assert.equal(S.partsMeOffCopy(only([...M.PARTS_OF_ME_REQUIRED.prompts])), null);
  const copy = S.partsMeOffCopy(only([...S.PARTS_ME_OFF_REQUIRED.prompts]));
  assert.deepEqual(copy, Object.fromEntries(S.PARTS_ME_OFF_PROMPTS.map((id) => [id, ALL.prompts[id].copy])));
});

test("shown with parts off; after turning it on there, kept (switch on) until Parts of me is on screen, then gone", () => {
  const shown = (o) => S.partsOffCardShown({ copyReady: true, partsOn: false, turnedOnHere: false, partsAreaShown: false, ...o });
  assert.equal(shown({}), true, "parts off");
  assert.equal(shown({ copyReady: false }), false, "copy not shipped: nothing");
  assert.equal(shown({ partsOn: true, turnedOnHere: true }), true, "just turned on here, getMe not back yet");
  assert.equal(shown({ partsOn: true, turnedOnHere: true, partsAreaShown: true }), false, "Parts of me in its place");
  assert.equal(shown({ partsOn: true }), false, "parts on from before: Parts of me, never the card");
  assert.equal(shown({ partsOn: false, turnedOnHere: true }), true, "turned off again (or the write failed): the card");
});

test("the card: the switch's own lines, a labelled switch, one toggle", () => {
  const copy = S.partsMeOffCopy(ALL);
  const off = renderToStaticMarkup(h(PartsOffCard, { copy, enabled: false, onToggle: () => {} }));
  for (const id of S.PARTS_ME_OFF_PROMPTS) assert.ok(off.includes(copy[id].replace(/'/g, "&#x27;")), id);
  assert.match(off, /<h3 id="([^"]+)"[^>]*>Parts<\/h3>/);
  assert.match(off, /role="switch" aria-checked="false" aria-labelledby="[^"]+" aria-describedby="[^"]+"/);
  assert.match(renderToStaticMarkup(h(PartsOffCard, { copy, enabled: true, onToggle: () => {} })), /aria-checked="true"/);
  // Settings and the card share the switch.
  assert.match(read("src/components/parts/PartsSettings.tsx"), /<PartsSwitch enabled=\{enabled\} onClick=\{toggle\} labelledBy=\{labelId\} describedBy=\{blurbId\} \/>/);
  assert.match(read("src/components/parts/PartsOffCard.tsx"), /<PartsSwitch enabled=\{enabled\} onClick=\{\(\) => onToggle\(!enabled\)\}/);
});

test("Me: one write (partsEnabled, the context's updateProfile), getMe again on the switch, the card where Parts of me goes", () => {
  const me = read("src/components/me/MeSection.tsx");
  assert.equal((me.match(/updateProfile\(/g) ?? []).length, 1, "one write");
  assert.match(me, /updateProfile\(\{ partsEnabled: on \}\)/);
  assert.match(me, /const \{ profile, updateProfile \} = useUserProfile\(\);/, "the same path Settings writes through");
  assert.match(me, /\}, \[reload, partsOn\]\);/, "getMe again once parts switch, bringing the area");
  assert.match(me, /const showOffCard = partsOffCardShown\(\{ copyReady: offCopy !== null, partsOn, turnedOnHere, partsAreaShown: areas\.some\(\(a\) => a\.id === 'my_parts'\) \}\);/);
  // After the areas (Parts of me is the last one shown), so it sits where Parts of me appears.
  assert.match(me, /\)\)\}\n\s*\{showOffCard && offCopy && <PartsOffCard copy=\{offCopy\} enabled=\{partsOn\} onToggle=\{togglePartsHere\} \/>\}\n\s*<\/div>/);
  assert.match(me, /if \(on\) setTurnedOnHere\(true\);\s*updateProfile/, "marked before the write, so the card never blinks out");
  // The writers of the setting: Settings' switch (through Profile's onUpdate) and this card's host.
  assert.match(read("src/pages/Profile.tsx"), /onToggle=\{\(on\) => onUpdate\(\{ partsEnabled: on \}\)\}/);
  for (const f of ["src/components/parts/PartsOffCard.tsx", "src/components/parts/PartsSwitch.tsx", "src/components/parts/PartsSettings.tsx"]) {
    assert.doesNotMatch(read(f), /partsEnabled:|updateProfile|useUserProfile/, `${f} writes through its host`);
  }
});

test("the sign-off pack lists the card under Parts of me", async () => {
  const { loadGates, surfaces } = await import("../scripts/parts/review.mjs");
  const g = await loadGates();
  const me = surfaces(g).find((s) => s.id === "me");
  assert.ok(me.groups.some((gr) => gr.ids === g.PARTS_ME_OFF_REQUIRED && /parts off/i.test(gr.label)));
  assert.match(surfaces(g).find((s) => s.id === "meet").where, /Tools list/);
});
