// A1-5: relationship-only dedupe tooling (plan §3a, R6): no node merges, no APOC, never user data.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { LOAD_ORDER, splitStatements } from "../scripts/load-graph.mjs";
import { SCHEMA_REL_TYPES, DUPLICATE_NODES_QUERY, DUPLICATE_RELS_QUERY } from "../scripts/lib/schemaDuplicates.mjs";
import { toJson, missingEndpoints } from "../scripts/graph-export.mjs";

const read = (f) => readFileSync(`schema/maintenance/${f}`, "utf8");
const code = (s) => s.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
const WRITES = /\b(CREATE|MERGE|DELETE|DETACH|SET|REMOVE|FOREACH|LOAD\s+CSV|CALL\s*\{)\b/i;
const dryRun = splitStatements(read("dedupe-dry-run.cypher"));
const apply = splitStatements(read("dedupe-apply-rels.cypher"));
const norm = (s) => s.replace(/\s+/g, " ").trim();

test("maintenance holds only the dry run and the relationship apply; nothing is loaded automatically", () => {
  assert.deepEqual(readdirSync("schema/maintenance").sort(), ["dedupe-apply-rels.cypher", "dedupe-dry-run.cypher"]);
  for (const f of LOAD_ORDER) assert.ok(!f.includes("dedupe"), f);
  for (const s of [...dryRun, ...apply]) assert.doesNotMatch(s, /\bapoc\./i, "no APOC");
});

test("the dry run is read-only and its duplicate queries are the loader's --verify queries", () => {
  assert.equal(dryRun.length, 5);
  for (const s of dryRun) assert.doesNotMatch(code(s), WRITES, s.slice(0, 80));
  assert.equal(norm(dryRun[0]), norm(DUPLICATE_NODES_QUERY));
  assert.equal(norm(dryRun[1]), norm(DUPLICATE_RELS_QUERY));
});

const typeList = (s) => JSON.parse(s.match(/type\(r\) IN (\[[^\]]*\])/)[1]);

test("the apply deletes only extra copies of the 55 schema relationship types, FELT_AS keyed on region", () => {
  assert.equal(apply.length, 1);
  const s = apply[0];
  assert.deepEqual(typeList(s), SCHEMA_REL_TYPES);
  assert.deepEqual(typeList(dryRun[2]), SCHEMA_REL_TYPES, "dry-run 2b counts the same set");
  assert.match(s, /CASE type\(r\) WHEN 'FELT_AS' THEN r\.region END AS k/);
  assert.match(s, /UNWIND tail\(rs\) AS extra\s+DELETE extra\s+RETURN/);
  const writes = [...code(s).matchAll(new RegExp(WRITES.source, "gi"))].map((m) => m[1].toUpperCase());
  assert.deepEqual(writes, ["DELETE"], "one plain DELETE of a relationship; no DETACH, no node writes");
  assert.doesNotMatch(s, /DELETE\s+[ab]\b/);
});

test("user-data relationship types are never deduplicated", () => {
  const types = typeList(apply[0]);
  for (const t of ["LOGGED", "SENSED", "MATCHED_PATTERN", "USED_TOOL", "FOLLOWED_CHECKIN", "COMPLETED_SESSION", "FOCUSED_ON",
    "TARGETED_URGE", "USED_PROTOCOL", "PRACTICED", "FOUND_WORD", "FOUND", "ABOUT", "NAMED_NEED", "TOOK_EXIT", "USED_FLOW"]) {
    assert.ok(!types.includes(t), t);
  }
});

test("graph export is read-only, gitignored, and serialises driver values", () => {
  const src = readFileSync("scripts/graph-export.mjs", "utf8");
  assert.match(src, /defaultAccessMode: neo4j\.session\.READ/);
  assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//, ""), /executeWrite|session\.run\(|\b(CREATE|MERGE|DELETE|SET)\s/);
  assert.match(readFileSync(".gitignore", "utf8"), /^backups\/$/m);

  const neo4j = createRequire(new URL("../functions/package.json", import.meta.url))("neo4j-driver");
  const dt = new neo4j.types.DateTime(2026, 9, 30, 10, 0, 0, 0, 0);
  assert.deepEqual(
    toJson({ n: neo4j.int(5), big: neo4j.int("9007199254740993"), at: dt, list: [neo4j.int(1), "x"], nested: { d: new neo4j.types.Date(2026, 9, 30) }, nil: null }, neo4j),
    { n: 5, big: "9007199254740993", at: dt.toString(), list: [1, "x"], nested: { d: "2026-09-30" }, nil: null },
  );
});

test("the backup fetches relationship endpoints written between its two reads (Codex, PR #15)", () => {
  const nodes = [{ elementId: "a" }, { elementId: "b" }];
  assert.deepEqual(missingEndpoints(nodes, [{ start: "a", end: "b" }]), []);
  assert.deepEqual(missingEndpoints(nodes, [{ start: "a", end: "c" }, { start: "c", end: "d" }, { start: "b", end: "a" }]), ["c", "d"]);
  const src = readFileSync("scripts/graph-export.mjs", "utf8");
  assert.match(src, /missingEndpoints\(data\.nodes, data\.relationships\)[\s\S]*elementId\(n\) IN \$ids[\s\S]*backup incomplete/);
});
