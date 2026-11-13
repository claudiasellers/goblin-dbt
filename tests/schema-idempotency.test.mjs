// A1-4: every loaded schema file is MERGE-only, constrained and free of duplicate sources,
// so a load (or two in a row) can never duplicate nodes or relationships.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { LOAD_ORDER, NOT_LOADED, splitStatements, isDdl, selectFiles } from "../scripts/load-graph.mjs";
import { SCHEMA_REL_TYPES, DUPLICATE_NODES_QUERY, DUPLICATE_RELS_QUERY } from "../scripts/lib/schemaDuplicates.mjs";

const read = (f) => readFileSync(`schema/${f}`, "utf8");
const statements = Object.fromEntries(LOAD_ORDER.map((f) => [f, splitStatements(read(f))]));
const all = () => Object.entries(statements).flatMap(([f, ss]) => ss.map((s) => ({ f, s })));
/** Blank out string literals so their contents can't look like Cypher. */
const code = (s) => s.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');

// Files whose inline DDL predates constraints.cypher (R13). Their statements are no-ops after it;
// no new file may declare DDL outside constraints.cypher.
const GRANDFATHERED_DDL = [
  "dear-man-content-v2.cypher", "dear-man-content.cypher", "dear-man-debrief-content.cypher",
  "dear-man-safety-gates.cypher", "find-the-feeling.cypher", "invalidation-recovery.cypher",
  "opposite-action-data.cypher", "opposite-action-flow.cypher", "problem-solve-barriers.cypher",
  "problem-solve-data.cypher",
];
// Node labels MERGEd on a natural key other than id/key.
const NATURAL_KEYS = { EmotionRegulationContent: "dbtParent" };

const ddlShape = (s) => {
  const m = code(s).match(/CREATE\s+(CONSTRAINT|INDEX)\b[^()]*\(\s*(\w+)\s*:\s*(\w+)\s*\)\s*(?:REQUIRE|ON)\s*\(?\s*\w+\.(\w+)/i);
  return m && { kind: m[1].toUpperCase(), label: m[3], prop: m[4] };
};
const constraints = splitStatements(read("constraints.cypher")).map(ddlShape);
const unique = new Set(constraints.filter((c) => c?.kind === "CONSTRAINT").map((c) => `${c.label}.${c.prop}`));

test("every schema file is loaded or deliberately not; constraints.cypher loads first", () => {
  const onDisk = readdirSync("schema").filter((f) => f.endsWith(".cypher")).sort();
  assert.deepEqual([...LOAD_ORDER, ...NOT_LOADED].sort(), onDisk);
  assert.equal(LOAD_ORDER[0], "constraints.cypher");
  assert.equal(new Set(LOAD_ORDER).size, LOAD_ORDER.length);
  assert.ok(!onDisk.includes("incremental-update.cypher"), "deleted in A1-4 (D-05)");
});

test("constraints.cypher holds only IF NOT EXISTS DDL", () => {
  for (const s of statements["constraints.cypher"]) {
    assert.ok(isDdl(s) && /IF NOT EXISTS/i.test(s) && ddlShape(s), s);
  }
});

test("no loaded statement CREATEs a node or relationship; all DDL is IF NOT EXISTS", () => {
  for (const { f, s } of all()) {
    assert.doesNotMatch(code(s), /\bCREATE\s*\(/, `${f}: ${s.slice(0, 100)}`);
    if (/\bCREATE\s+(CONSTRAINT|INDEX)\b/i.test(code(s))) assert.match(s, /IF NOT EXISTS/i, `${f}: ${s.slice(0, 100)}`);
  }
});

test("DDL outside constraints.cypher only in grandfathered files, and mirrored there", () => {
  const shapes = new Set(constraints.map((c) => `${c.kind} ${c.label}.${c.prop}`));
  for (const { f, s } of all()) {
    if (f === "constraints.cypher" || !isDdl(s)) continue;
    assert.ok(GRANDFATHERED_DDL.includes(f), `${f} declares DDL; put it in constraints.cypher`);
    const d = ddlShape(s);
    assert.ok(d && shapes.has(`${d.kind} ${d.label}.${d.prop}`), `${f}: ${s.replace(/\s+/g, " ")} is missing from constraints.cypher`);
  }
});

const nodeMerges = () => all().flatMap(({ f, s }) =>
  [...code(s).matchAll(/\bMERGE\s*\(\s*\w*\s*:\s*(\w+)\s*\{([^}]*)\}\s*\)/g)].map((m) => ({ f, label: m[1], keys: [...m[2].matchAll(/(\w+)\s*:/g)].map((k) => k[1]) })));

test("node MERGEs key on exactly one property: id or key (or a declared natural key)", () => {
  for (const { f, label, keys } of nodeMerges()) {
    const allowed = NATURAL_KEYS[label] ? [NATURAL_KEYS[label]] : ["id", "key"];
    assert.ok(keys.length === 1 && allowed.includes(keys[0]), `${f}: MERGE (:${label} {${keys.join(", ")}})`);
  }
});

test("every MERGEd label has a uniqueness constraint on its merge key in constraints.cypher", () => {
  const missing = [...new Set(nodeMerges().map(({ label, keys }) => `${label}.${keys[0]}`))].filter((k) => !unique.has(k));
  assert.deepEqual(missing, []);
});

test("relationship MERGEs carry inline properties only as FELT_AS {region} or RECOMMENDED_FOR {id}", () => {
  // RECOMMENDED_FOR (E4-2): several rows can join the same concept and pattern (one per band), so
  // each edge is keyed by its own stable id.
  for (const { f, s } of all()) {
    for (const m of code(s).matchAll(/\bMERGE\s*\([^()]*\)\s*<?-\s*\[\s*\w*\s*:\s*(\w+)\s*(\{[^}]*\})?\s*\]/g)) {
      if (!m[2]) continue;
      const ok = (m[1] === "FELT_AS" && /^\{\s*region\s*:\s*""\s*\}$/.test(m[2]))
        || (m[1] === "RECOMMENDED_FOR" && /^\{\s*id\s*:\s*row\.id\s*\}$/.test(m[2]));
      assert.ok(ok, `${f}: ${m[0]}`);
    }
  }
});

test("no file repeats a statement", () => {
  for (const [f, ss] of Object.entries(statements)) {
    const seen = new Map();
    for (const s of ss.map((x) => x.replace(/\s+/g, " "))) seen.set(s, (seen.get(s) || 0) + 1);
    const dups = [...seen].filter(([, n]) => n > 1);
    assert.deepEqual(dups, [], f);
  }
});

/** (startLabel:id, TYPE[, region], endLabel:id) for each relationship MERGE in a file. */
function relKeys(f) {
  const out = [];
  for (const s of statements[f]) {
    const vars = {};
    for (const m of s.matchAll(/\((\w+):(\w+) \{id: "([^"]+)"\}\)/g)) vars[m[1]] = `${m[2]}:${m[3]}`;
    for (const m of s.matchAll(/MERGE \((\w+)\)-\[\w*:([A-Z_]+)(?: \{region: "([^"]+)"\})?\]->\((\w+)\)/g)) {
      out.push({ type: m[2], key: `${vars[m[1]]}|${m[2]}${m[3] ? `|${m[3]}` : ""}|${vars[m[4]]}` });
    }
  }
  return out;
}

test("knowledge-graph.cypher is nodes only; count pins for the base files", () => {
  const kg = statements["knowledge-graph.cypher"];
  assert.equal(kg.length, 323, "316 until Oct 2026; the 8 old BodyRegion nodes moved to body-map.cypher; + dbt_troubleshooting (ER-14, Nov 2026); + dbt_nightmare_protocol (ER-15); + dbt_ending_relationships (IE-08); + dbt_saying_no (IE-04); + dbt_self_soothe (DT-07); + dbt_mindfulness_current_thoughts (DT-08); + dbt_dialectical_abstinence (DT-09); + dbt_crisis_survival_kit (DT-03); + dbt_values_priorities (ER-09); + dbt_building_relationships (IE-09); + dbt_mindfulness_of_others (IE-10); + dbt_model_of_emotions (ER-10); + dbt_behavioral_rehearsal (IE-02); + dbt_mindfulness_current_emotion (ER-08); + dbt_sleep_hygiene (ER-13)");
  for (const s of kg) {
    assert.match(s, /^MERGE \(\w+:\w+ \{id: "[^"]+"\}\)\nSET \w+ \+= \{/, s.slice(0, 80));
    assert.doesNotMatch(code(s), /\]->|<-\[/, s.slice(0, 80));
  }
  const rels = relKeys("relationships.cypher");
  const opposite = statements["relationships.cypher"].filter((s) => /MERGE \(\w+\)-\[:OPPOSITE_OF\]->\(\w+\) MERGE/.test(s));
  assert.equal(opposite.length, 16);
  const nonOpposite = rels.filter((r) => r.type !== "OPPOSITE_OF");
  // 575 until Oct 2026; the 40 FELT_AS edges moved to body-map.cypher (scripts/body-map/content.py).
  assert.equal(new Set(nonOpposite.map((r) => r.key)).size, 550); // + dbt_sleep_hygiene PART_OF (ER-13), + dbt_mindfulness_current_emotion PART_OF (ER-08), + dbt_behavioral_rehearsal PART_OF (IE-02), + dbt_model_of_emotions PART_OF (ER-10), + dbt_mindfulness_of_others PART_OF (IE-10), + dbt_building_relationships PART_OF (IE-09), + dbt_values_priorities PART_OF (ER-09), + dbt_troubleshooting PART_OF (ER-14), + dbt_nightmare_protocol PART_OF (ER-15), + dbt_ending_relationships (IE-08), + dbt_saying_no (IE-04), + dbt_self_soothe (DT-07), + dbt_mindfulness_current_thoughts (DT-08), + dbt_dialectical_abstinence (DT-09), + dbt_crisis_survival_kit (DT-03)
  assert.equal(nonOpposite.length, 550, "no relationship declared twice");
  assert.equal(statements["relationships.cypher"].length, 550 + 16);
});

test("FELT_AS region variants survive (the 66 original keys), now all in body-map.cypher", () => {
  // The old region "back" became upper_back when FELT_AS moved to the body map's 15 places (Oct 2026).
  const expected = JSON.parse(readFileSync("tests/fixtures/felt-as-keys.json", "utf8")).map((k) => k.replace("|back|", "|upper_back|"));
  const actual = relKeys("body-map.cypher").filter((r) => r.type === "FELT_AS")
    .map((r) => { const [a, , region, b] = r.key.split("|"); return `${a}|${region}|${b}`; });
  assert.equal(new Set(actual).size, actual.length, "no FELT_AS row declared twice");
  assert.deepEqual(expected.filter((k) => !actual.includes(k)), [], "every original row is still there");
  for (const f of ["relationships.cypher", "low-unpleasant-associations-patch.cypher"]) {
    assert.deepEqual(relKeys(f).filter((r) => r.type === "FELT_AS"), [], `${f} no longer writes FELT_AS`);
  }
});

test("the duplicate checks never touch user-data relationship types", () => {
  for (const t of ["LOGGED", "SENSED", "MATCHED_PATTERN", "USED_TOOL", "FOLLOWED_CHECKIN", "COMPLETED_SESSION",
    "FOCUSED_ON", "TARGETED_URGE", "USED_PROTOCOL", "PRACTICED", "FOUND_WORD", "FOUND", "ABOUT", "NAMED_NEED", "TOOK_EXIT"]) {
    assert.ok(!SCHEMA_REL_TYPES.includes(t), t);
  }
  assert.match(DUPLICATE_RELS_QUERY, /CASE type\(r\) WHEN 'FELT_AS' THEN r\.region END/);
  assert.match(DUPLICATE_NODES_QUERY, /EmotionRegulationContent/);
});

test("loader guards: --only knowledge-graph needs --force; --file runs one file", () => {
  assert.throws(() => selectFiles({ only: "knowledge-graph" }), /--force/);
  assert.deepEqual(selectFiles({ only: "knowledge-graph", force: true }).map((f) => f.name), ["knowledge-graph.cypher"]);
  assert.deepEqual(selectFiles({ only: "find-the-feeling" }).map((f) => f.name), ["find-the-feeling.cypher"]);
  assert.throws(() => selectFiles({ only: "no-such-file" }), /matches no file/);
  assert.equal(selectFiles({ file: "schema/validation-queries.cypher" })[0].name, "schema/validation-queries.cypher");
  assert.equal(selectFiles().length, LOAD_ORDER.length);
  assert.ok(isDdl("CREATE CONSTRAINT x IF NOT EXISTS FOR (n:N) REQUIRE n.id IS UNIQUE"));
  assert.ok(!isDdl("MERGE (n:N {id: 'x'})"));
});
