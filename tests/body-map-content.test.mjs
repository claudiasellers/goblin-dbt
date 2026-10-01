// Body map build step 1 (docs/design/body-map.md): content in schema/body-map.cypher, generated from
// scripts/body-map/content.py, and the fixture the dev harness reads.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { LOAD_ORDER, splitStatements } from "../scripts/load-graph.mjs";

const cypher = readFileSync("schema/body-map.cypher", "utf8");
const stmts = splitStatements(cypher);
const fixture = JSON.parse(readFileSync("tests/fixtures/body-map-content.json", "utf8"));
const gridWords = [...readFileSync("src/data/emotions.ts", "utf8").matchAll(/makeEmotion\('([a-z_]+)'/g)].map((m) => m[1]);
const ZONES = ["hu", "lu", "hp", "lp"];

for (const [name, script, file] of [
  ["schema/body-map.cypher", "scripts/body-map/build.py", "schema/body-map.cypher"],
  ["tests/fixtures/body-map-content.json", "scripts/body-map/fixture.py", null],
]) {
  test(`generated file is fresh: ${name}`, (t) => {
    let out;
    try { out = execFileSync("python3", [script], { encoding: "utf8" }); } catch { t.skip("python3 unavailable"); return; }
    if (file) assert.equal(out.trim(), readFileSync(file, "utf8").trim());
    else assert.deepEqual(JSON.parse(readFileSync("tests/fixtures/body-map-content.json", "utf8")), fixture);
  });
}

test("every grid word mirrors exactly one body map", () => {
  const owner = new Map();
  for (const m of fixture.maps) for (const w of m.wordIds) {
    assert.ok(!owner.has(w), `${w} mirrors ${owner.get(w)} and ${m.id}`);
    owner.set(w, m.id);
  }
  assert.deepEqual(gridWords.filter((w) => !owner.has(w)), [], "grid words without a map");
  assert.deepEqual([...owner.keys()].filter((w) => !gridWords.includes(w)), [], "map words that aren't grid words");
});

test("maps: 3 to 6 places, on known regions, each with a pad word allowed there", () => {
  const words = new Map(fixture.padWords.map((w) => [w.id, w]));
  for (const m of fixture.maps) {
    assert.ok(m.places.length >= 3 && m.places.length <= 6, m.id);
    for (const p of m.places) {
      assert.ok(fixture.regions.includes(p.region), `${m.id}: ${p.region}`);
      const w = words.get(p.sensationId);
      assert.ok(w, `${m.id}: ${p.sensationId}`);
      assert.ok(w.regions.length === 0 || w.regions.includes(p.region), `${m.id}: ${p.sensationId} at ${p.region}`);
      assert.ok(p.weight > 0 && p.weight <= 1);
    }
  }
});

test("pad words: every place has at least one word in every quarter of the pad", () => {
  for (const region of fixture.regions) for (const zone of ZONES) {
    assert.ok(fixture.padWords.some((w) => w.zones.includes(zone) && (w.regions.length === 0 || w.regions.includes(region))),
      `${region} / ${zone}`);
  }
  for (const w of fixture.padWords) {
    assert.ok(w.zones.length > 0 && w.zones.every((z) => ZONES.includes(z)), w.id);
    assert.ok(["more", "less"].includes(w.energy), w.id);
    assert.doesNotMatch(w.label, /!/);
  }
});

test("nothing is live without sign-off (SIGNED_OFF in content.py)", () => {
  const signed = readFileSync("scripts/body-map/content.py", "utf8").match(/^SIGNED_OFF = (\{.*\})$/m)[1];
  const ids = [...signed.matchAll(/"([a-z_:]+)"\s*:/g)].map((m) => m[1]);
  const live = [
    ...fixture.maps.filter((m) => m.status === "live").map((m) => `map:${m.id}`),
    ...fixture.padWords.filter((w) => w.status === "live").map((w) => `word:${w.id}`),
  ];
  assert.deepEqual(live.sort(), ids.sort());
  for (const s of stmts.filter((x) => x.startsWith("MERGE (m:BodyMap "))) {
    const st = s.match(/status: "(\w+)"/)[1];
    assert.ok(st === "draft" || st === "live");
  }
});

test("pad words removed from content.py are retired, never served (shared SensationType kept)", () => {
  const retire = stmts.find((x) => /SET s\.padStatus = 'retired'/.test(x));
  assert.ok(retire, "retire statement");
  const ids = JSON.parse(retire.match(/NOT s\.id IN (\[.*\])/)[1]);
  assert.deepEqual(ids.sort(), fixture.padWords.map((w) => w.id).sort());
  assert.doesNotMatch(retire, /DELETE/);
  assert.match(readFileSync("functions/src/bodyMap/index.ts", "utf8"), /s\.padStatus = 'live'/);
});

test("loads after knowledge-graph (SensationType); no DDL; constraints for every new label", () => {
  assert.ok(LOAD_ORDER.indexOf("body-map.cypher") > LOAD_ORDER.indexOf("knowledge-graph.cypher"));
  assert.ok(!stmts.some((s) => /^CREATE (CONSTRAINT|INDEX)/.test(s)));
  const constraints = readFileSync("schema/constraints.cypher", "utf8");
  for (const label of ["BodyMapContent", "BodyMap", "BodyMapPlace", "SensationType"]) {
    assert.match(constraints, new RegExp(`FOR \\(\\w+:${label}\\) REQUIRE \\w+\\.id IS UNIQUE`), label);
  }
});

test("the callable's version matches the content", () => {
  const fn = readFileSync("functions/src/bodyMap/index.ts", "utf8");
  assert.equal(fn.match(/BODY_MAP_VERSION = '([^']+)'/)[1], fixture.version);
  assert.match(cypher, new RegExp(`c\\.version = "${fixture.version}"`));
});

test("types mirror: src/data/bodyMapTypes.ts equals functions/src/bodyMap/types.ts (after the header)", () => {
  const body = (f) => readFileSync(f, "utf8").split("\n").slice(4).join("\n");
  assert.equal(body("src/data/bodyMapTypes.ts"), body("functions/src/bodyMap/types.ts"));
});
