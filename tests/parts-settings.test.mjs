// Parts in Privacy & Data (docs/design/parts.md, "The switch", "Deleting"): the block renders only when
// all its copy is signed off, the switch is a real switch, and Delete your parts calls deleteMyParts.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const { PARTS_SETTINGS_PROMPTS, partsSettingsCopy } = await importTs("src/lib/partsSettings.ts");
const read = (f) => readFileSync(f, "utf8");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const shipped = JSON.parse(read("src/data/content/parts.json")).content;

test("the block needs every settings prompt, each one in the settings flow", () => {
  assert.equal(new Set(PARTS_SETTINGS_PROMPTS).size, PARTS_SETTINGS_PROMPTS.length);
  const inFlow = Object.entries(fixture.prompts).filter(([, p]) => p.flow === "settings").map(([id]) => id);
  assert.deepEqual([...PARTS_SETTINGS_PROMPTS].sort(), inFlow.sort(), "every settings prompt is used, and only those");
});

test("nothing renders until all of it is signed off; then each id maps to its copy", () => {
  const ready = { ...shipped, prompts: Object.fromEntries(PARTS_SETTINGS_PROMPTS.map((id) => [id, fixture.prompts[id]])) };
  const copy = partsSettingsCopy(ready);
  for (const id of PARTS_SETTINGS_PROMPTS) assert.equal(copy[id], fixture.prompts[id].copy, id);
  const missing = { ...ready, prompts: { ...ready.prompts } };
  delete missing.prompts.settings_delete_done;
  assert.equal(partsSettingsCopy(missing), null, "one id missing hides the whole block");
  assert.equal(partsSettingsCopy(null), null, "still loading");
  const shippedReady = PARTS_SETTINGS_PROMPTS.every((id) => shipped.prompts[id]);
  assert.equal(partsSettingsCopy(shipped) === null, !shippedReady, "the shipped file decides");
});

test("Privacy & Data: a real switch bound to partsEnabled, delete wired to deleteMyParts, all copy from content", () => {
  const page = read("src/pages/Profile.tsx");
  const privacy = page.slice(page.indexOf("function PrivacySection"), page.indexOf("function ToggleRow"));
  assert.match(privacy, /<PartsSettings enabled=\{partsEnabled\} onToggle=\{\(on\) => onUpdate\(\{ partsEnabled: on \}\)\} \/>/);
  const c = read("src/components/parts/PartsSettings.tsx");
  assert.match(c, /role="switch"/);
  assert.match(c, /aria-checked=\{enabled\}/);
  assert.match(c, /aria-describedby=\{blurbId\}/);
  assert.match(c, /await deleteMyParts\(\)/);
  assert.match(c, /if \(!copy\) return null;/);
  // No visible string of its own: every line is a signed-off prompt.
  const text = [...c.matchAll(/>\s*([^<>{}]*[A-Za-z][^<>{}]*?)\s*<\//g)].map((m) => m[1]);
  assert.deepEqual(text, [], `hard-coded copy: ${text.join(" | ")}`);
});
