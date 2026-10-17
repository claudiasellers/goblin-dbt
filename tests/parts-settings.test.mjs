// Parts in Privacy & Data (docs/design/parts.md, "The switch", "Deleting"): the block renders only when
// all its copy is signed off, the switch is a real switch, and Delete your parts calls deleteMyParts.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const { PARTS_SETTINGS_PROMPTS, SETTINGS_LINES_REQUIRED, partsSettingsCopy, keptLinesQuestion } = await importTs("src/lib/partsSettings.ts");
const read = (f) => readFileSync(f, "utf8");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const shipped = JSON.parse(read("src/data/content/parts.json")).content;

test("the block needs every settings prompt, each one in the settings flow", () => {
  assert.equal(new Set(PARTS_SETTINGS_PROMPTS).size, PARTS_SETTINGS_PROMPTS.length);
  const inFlow = Object.entries(fixture.prompts).filter(([, p]) => p.flow === "settings").map(([id]) => id);
  assert.deepEqual([...PARTS_SETTINGS_PROMPTS, ...SETTINGS_LINES_REQUIRED.prompts].sort(), inFlow.sort(), "every settings prompt is used, and only those");
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
  const sw = read("src/components/parts/PartsSwitch.tsx");
  assert.match(sw, /role="switch"/);
  assert.match(sw, /aria-checked=\{enabled\}/);
  assert.match(sw, /aria-labelledby=\{labelledBy\}\s+aria-describedby=\{describedBy\}/);
  assert.match(c, /<PartsSwitch enabled=\{enabled\} onClick=\{toggle\} labelledBy=\{labelId\} describedBy=\{blurbId\} \/>/);
  assert.match(c, /await deleteMyParts\(\{ keptLines: removeLines && linesQuestion !== null \}\);/, "kept lines only on their own yes");
  assert.match(c, /setFailed\(true\); \/\/ the confirm stays open/);
  assert.match(c, /\{failed && <p role="status"[^>]*>\{copy\.settings_delete_failed\}<\/p>\}/);
  assert.match(c, /if \(!copy\) return null;/);
  // No visible string of its own: every line is a signed-off prompt.
  const text = [...c.matchAll(/>\s*([^<>{}]*[A-Za-z][^<>{}]*?)\s*<\//g)].map((m) => m[1]);
  assert.deepEqual(text, [], `hard-coded copy: ${text.join(" | ")}`);
});

test("right after turning parts on: one Get to know a part link, gated by Meet a part, this visit only", async () => {
  const c = read("src/components/parts/PartsSettings.tsx");
  // Set only by this switch's success, and cleared on any toggle; state, so a later visit starts without it.
  assert.match(c, /const \[justOn, setJustOn\] = useState\(false\);/);
  assert.match(c, /setJustOn\(false\);\s*onToggle\(on\)\.then\(\(\) => setJustOn\(on\)\)/);
  assert.doesNotMatch(c, /localStorage|sessionStorage/, "never remembered across visits");
  assert.match(c, /\{justOn && enabled && getToKnow && <GetToKnowLink label=\{getToKnow\} \/>\}/);
  assert.match(c, /const meet = useToolGate\('meet-a-part'\);\s*if \(meet !== 'open'\) return null;/, "Meet a part's own gate, reused");
  assert.match(c, /surfaceReady\(c, SETTINGS_LINK_REQUIRED\)/, "the line is the signed-off me_get_to_know");
  const { SETTINGS_LINK_REQUIRED } = await importTs("src/lib/partsSettings.ts");
  assert.deepEqual(SETTINGS_LINK_REQUIRED, { prompts: ["me_get_to_know"], options: [] });
  const { settingsMeetLink } = await importTs("src/lib/partsOfMe.ts");
  const { parseMeetEntry } = await importTs("src/lib/meetAPartSave.ts");
  assert.deepEqual(settingsMeetLink(), { pathname: "/tool/meet-a-part", state: { parts: { trailheadKind: "settings" } } });
  assert.equal(parseMeetEntry(settingsMeetLink().state).trailheadKind, "settings");
});

test("kept Two pulls lines: asked separately, only when there are some and the line ships; unticked; flag on the call", () => {
  assert.deepEqual([...SETTINGS_LINES_REQUIRED.prompts], ["settings_delete_lines_one", "settings_delete_lines"]);
  const ready = { ...shipped, prompts: { ...shipped.prompts, ...Object.fromEntries(SETTINGS_LINES_REQUIRED.prompts.map((id) => [id, fixture.prompts[id]])) } };
  assert.equal(keptLinesQuestion(ready, 2), "Also remove 2 kept lines that name your parts?", "parts.md's own wording");
  assert.equal(keptLinesQuestion(ready, 1), "Also remove 1 kept line that names your parts?");
  for (const n of [0, -1, 1.5, Number.NaN]) assert.equal(keptLinesQuestion(ready, n), null, String(n));
  assert.equal(keptLinesQuestion(null, 2), null);
  const noLine = { ...ready, prompts: { ...ready.prompts } };
  delete noLine.prompts.settings_delete_lines;
  assert.equal(keptLinesQuestion(noLine, 2), null, "not signed off: nothing asked, nothing extra deleted");
  const c = read("src/components/parts/PartsSettings.tsx");
  assert.match(c, /const \[removeLines, setRemoveLines\] = useState\(false\);/, "unticked by default");
  assert.match(c, /if \(!confirming \|\| !content \|\| !surfaceReady\(content, SETTINGS_LINES_REQUIRED\)\) return;/, "counted only for the confirm, and only if it can be asked");
  assert.match(c, /<input type="checkbox" checked=\{removeLines\}/);
  assert.match(c, /setConfirming\(false\); setFailed\(false\); setRemoveLines\(false\);/, "Keep them clears it");
  const svc = read("src/services/parts.ts");
  assert.match(svc, /deleteMyPartsFn\(opts\.keptLines \? \{ keptLines: true \} : \{\}\)/);
  assert.match(svc, /httpsCallable<Record<string, never>, \{ keptLines: number \}>\(functions, 'countMyPartsLines'\)/);
});
