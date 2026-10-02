// Body map step 2 (docs/design/body-map.md): the figure's places match the graph's, and the region
// migration covers every name the old figure saved.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const figure = readFileSync("src/data/bodyFigure.ts", "utf8");
const figureIds = JSON.parse(figure.match(/REGION_IDS = (\[[\s\S]*?\]) as const/)[1].replace(/'/g, '"').replace(/,\s*\]/, "]"));
const graph = JSON.parse(readFileSync("tests/fixtures/body-map-content.json", "utf8"));
const migration = readFileSync("schema/migrations/2026-10-body-regions.cypher", "utf8");

test("the figure and the graph share one place vocabulary, in the same order", () => {
  assert.deepEqual(figureIds, graph.regions);
});

test("every place has a definition, and paired places glow on both sides", () => {
  for (const id of figureIds) {
    const def = figure.match(new RegExp(`\\n  ${id}: \\{[\\s\\S]*?\\n  (?:[a-z_]+: \\{|\\};)`));
    assert.ok(def, id);
    const paired = /paired: true/.test(def[0]);
    const glows = (def[0].match(/glow: \[([^\]]*)\]/)[1].match(/cx:/g) || []).length;
    assert.equal(glows, paired ? 2 : 1, `${id} glow count`);
  }
});

test("the region migration covers every name the old figure saved, and maps to known places", () => {
  const oldNames = ["Head", "Face", "Neck", "Chest", "Stomach", "Hips",
    ...["Shoulder", "Arm", "Hand", "Thigh", "Knee", "Calf", "Foot"].flatMap((p) => [`Left ${p}`, `Right ${p}`])];
  for (const name of oldNames) {
    const m = migration.match(new RegExp("`" + name + "`: \\['([a-z_]+)', (null|'left'|'right')\\]"));
    assert.ok(m, name);
    assert.ok(figureIds.includes(m[1]), `${name} → ${m[1]}`);
    assert.equal(m[2] === "null" ? null : m[2].replace(/'/g, ""), name.startsWith("Left") ? "left" : name.startsWith("Right") ? "right" : null, name);
  }
  assert.match(migration, /WHERE s\.region IN keys\(m\)/, "idempotent: a second run matches nothing");
  assert.doesNotMatch(migration, /DELETE/);
});

test("nothing in the app reads the retired frontend mappings", () => {
  for (const f of ["src/components/checkin/EmotionSuggestion.tsx", "src/pages/CheckIn.tsx"]) {
    assert.doesNotMatch(readFileSync(f, "utf8"), /sensationMappings|bodyRegions'/, f);
  }
});

test("saves map old region names the same way as the migration (old clients still open in a tab)", () => {
  const ts = readFileSync("functions/src/checkin/validation.ts", "utf8");
  const block = ts.match(/LEGACY_REGIONS[^=]*= \{([\s\S]*?)\n\};/)[1];
  const fromTs = Object.fromEntries([...block.matchAll(/'?([A-Z][A-Za-z ]+)'?: \['([a-z_]+)', (null|'left'|'right')\]/g)]
    .map((m) => [m[1], [m[2], m[3] === "null" ? null : m[3].replace(/'/g, "")]]));
  const fromCypher = Object.fromEntries([...migration.matchAll(/`([A-Z][A-Za-z ]+)`: \['([a-z_]+)', (null|'left'|'right')\]/g)]
    .map((m) => [m[1], [m[2], m[3] === "null" ? null : m[3].replace(/'/g, "")]]));
  assert.ok(Object.keys(fromTs).length >= 20);
  assert.deepEqual(fromTs, fromCypher);
});
