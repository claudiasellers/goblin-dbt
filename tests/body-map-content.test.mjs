// Body map content (docs/design/body-map.md): schema/body-map.cypher, generated from
// scripts/body-map/content.py, and the fixture tests and the harness read. FELT_AS is the one source
// of where each emotion is felt; body maps group emotions and mirror grid words, nothing more.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { LOAD_ORDER, splitStatements } from "../scripts/load-graph.mjs";
import { importTs } from "./lib/importTs.mjs";

const cypher = readFileSync("schema/body-map.cypher", "utf8");
const stmts = splitStatements(cypher);
const fixture = JSON.parse(readFileSync("tests/fixtures/body-map-content.json", "utf8"));
const gridWords = [...readFileSync("src/data/emotions.ts", "utf8").matchAll(/makeEmotion\('([a-z_]+)'/g)].map((m) => m[1]);
const ZONES = ["hu", "lu", "hp", "lp"];
const { placesFromFelt } = await importTs("functions/src/bodyMap/places.ts");
const schemaText = (f) => readFileSync(`schema/${f}`, "utf8");
const emotionIds = new Set([
  ...[...schemaText("knowledge-graph.cypher").matchAll(/MERGE \(\w+:Emotion \{id: "([a-z_]+)"\}\)/g)].map((m) => m[1]),
  ...[...schemaText("emotion-wheel-sync.cypher").matchAll(/\{id: "([a-z_]+)", name:/g)].map((m) => m[1]),
]);

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

test("FELT_AS rows: known emotions, known places, a sensation word offered at that place, weight in (0, 1]", () => {
  const words = new Map(fixture.padWords.map((w) => [w.id, w]));
  const seen = new Set();
  for (const f of fixture.felt) {
    assert.ok(emotionIds.has(f.emotionId), `${f.emotionId} is not an Emotion node`);
    assert.ok(fixture.regions.includes(f.region), `${f.emotionId}: ${f.region}`);
    const w = words.get(f.sensationId);
    assert.ok(w, `${f.emotionId}: ${f.sensationId}`);
    assert.ok(w.regions.length === 0 || w.regions.includes(f.region), `${f.sensationId} at ${f.region}`);
    assert.ok(f.weight > 0 && f.weight <= 1);
    const key = `${f.emotionId}:${f.region}:${f.sensationId}`;
    assert.ok(!seen.has(key), key);
    seen.add(key);
  }
});

test("FELT_AS has one source: no other loaded schema file writes it, and BodyRegion lives only here", () => {
  for (const f of LOAD_ORDER.filter((x) => x !== "body-map.cypher")) {
    const stmts2 = splitStatements(schemaText(f));
    assert.ok(!stmts2.some((x) => /\[:FELT_AS\b/.test(x) && /\bMERGE\b/.test(x)), `${f} writes FELT_AS`);
    assert.ok(!stmts2.some((x) => /MERGE \(\w*:BodyRegion\b/.test(x)), `${f} writes BodyRegion`);
  }
  assert.ok(stmts.some((x) => /MERGE \(e\)-\[r:FELT_AS \{region: /.test(x)));
  assert.ok(stmts.some((x) => /\[r:FELT_AS\]->[\s\S]*WHERE NOT \(e\.id \+ ':' \+ r\.region \+ ':' \+ s\.id\) IN[\s\S]*DELETE r/.test(x)),
    "rows removed from content.py are removed from the graph");
});

test("maps: groups of real emotions, at least 3 places, and places computed the way the callable does", () => {
  for (const m of fixture.maps) {
    assert.ok(m.groups.length > 0, m.id);
    for (const e of m.groups) assert.ok(emotionIds.has(e), `${m.id} groups ${e}, not an Emotion node`);
    assert.ok(m.places.length >= 3, `${m.id}: ${m.places.length} places`);
    const words = new Map(fixture.padWords.map((w) => [w.id, w]));
    const rows = fixture.felt.filter((f) => m.groups.includes(f.emotionId))
      .map((f) => ({ ...f, label: words.get(f.sensationId).label, energy: words.get(f.sensationId).energy }));
    assert.deepEqual(placesFromFelt(rows).map((p) => [p.region, p.sensationId, p.weight]),
      m.places.map((p) => [p.region, p.sensationId, p.weight]), `${m.id}: places.py and places.ts agree`);
  }
  assert.ok(!stmts.some((x) => /BodyMapPlace/.test(x) && !/DETACH DELETE/.test(x)), "no stored places");
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

test("nothing new is live without sign-off (SIGNED_OFF in content.py); the original FELT_AS rows stay live", () => {
  const signed = readFileSync("scripts/body-map/content.py", "utf8").match(/^SIGNED_OFF = (\{.*\})$/m)[1];
  const ids = [...signed.matchAll(/"([a-z_:]+)"\s*:/g)].map((m) => m[1]);
  const live = [
    ...fixture.maps.filter((m) => m.status === "live").map((m) => `map:${m.id}`),
    ...fixture.padWords.filter((w) => w.status === "live").map((w) => `word:${w.id}`),
    ...fixture.felt.filter((f) => f.origin === "new" && f.status === "live").map((f) => `felt:${f.emotionId}:${f.region}:${f.sensationId}`),
  ];
  assert.deepEqual(live.sort(), ids.sort());
  assert.ok(fixture.felt.filter((f) => f.origin === "base").every((f) => f.status === "live"));
  assert.equal(fixture.felt.filter((f) => f.origin === "base").length, 66, "the 66 FELT_AS rows the graph had");
  for (const x of stmts.filter((y) => y.startsWith("MERGE (m:BodyMap "))) {
    assert.match(x, /status: "(draft|live)"/);
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

test("loads after knowledge-graph and the wheel sync (Emotion nodes); no DDL; constraints for every label", () => {
  assert.ok(LOAD_ORDER.indexOf("body-map.cypher") > LOAD_ORDER.indexOf("knowledge-graph.cypher"));
  assert.ok(LOAD_ORDER.indexOf("body-map.cypher") > LOAD_ORDER.indexOf("emotion-wheel-sync.cypher"));
  assert.ok(!stmts.some((s) => /^CREATE (CONSTRAINT|INDEX)/.test(s)));
  const constraints = readFileSync("schema/constraints.cypher", "utf8");
  for (const label of ["BodyMapContent", "BodyMap", "BodyRegion", "SensationType"]) {
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
