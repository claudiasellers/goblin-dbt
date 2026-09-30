// A5-1: the witness corpus (schema/witness.cypher, generated from scripts/witness/content.py) and
// Recover's projection of it (RecoveryProtocol.validationLines).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { LOAD_ORDER, splitStatements, isDdl } from "../scripts/load-graph.mjs";
import { corpusFromCypher } from "../scripts/voice-lint.mjs";

const read = (f) => readFileSync(`schema/${f}`, "utf8");
const cypher = read("witness.cypher");
const stmts = splitStatements(cypher);
const rows = corpusFromCypher(cypher);
const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
/** Cypher map literals `{line: "a", to: "b"}` → objects. */
const maps = (list) => JSON.parse(list.replace(/([{,]\s*)(\w+):/g, '$1"$2":'));

/** Content edges per relationship type: [{line, to, label}]. */
const edges = {};
for (const s of stmts) {
  const m = s.match(/^UNWIND (\[.*\]) AS row\nMATCH \(l:ValidationLine \{id: row\.line\}\), \(t:(\w+) \{(\w+): row\.to\}\)\nMERGE \(l\)-\[:(\w+)\]->\(t\)$/s);
  if (!m) continue;
  for (const e of maps(m[1])) (edges[m[4]] ??= []).push({ ...e, label: m[2], key: m[3] });
}
const targetsOf = (type, id) => (edges[type] ?? []).filter((e) => e.line === id).map((e) => e.to);

const ids = (file, label) => new Set([...read(file).matchAll(new RegExp(`\\(\\w+:${label} \\{id: ['"]([a-z0-9_]+)['"]\\}\\)`, "g"))].map((m) => m[1]));
const emotionIds = new Set([
  ...ids("knowledge-graph.cypher", "Emotion"),
  ...[...read("emotion-wheel-sync.cypher").matchAll(/\{id: "([a-z_]+)", name:/g)].map((m) => m[1]),
]);

test("generated file is fresh: witness", (t) => {
  let out;
  try { out = execFileSync("python3", ["scripts/witness/build.py"], { encoding: "utf8" }); } catch { t.skip("python3 unavailable"); return; }
  assert.equal(out.trim(), cypher.trim(), "run: python3 scripts/witness/build.py > /tmp/w.cypher && mv /tmp/w.cypher schema/witness.cypher");
});

test("MERGE-only, no DDL (constraints live in constraints.cypher, R13)", () => {
  for (const s of stmts) {
    assert.ok(!isDdl(s), s.slice(0, 80));
    assert.doesNotMatch(s.replace(/"(?:[^"\\]|\\.)*"/g, '""'), /\bCREATE\b/, s.slice(0, 80));
  }
  const constraints = read("constraints.cypher");
  for (const label of ["ValidationLine", "ToolMoment", "VoiceRule"]) {
    assert.match(constraints, new RegExp(`FOR \\(n:${label}\\) REQUIRE n\\.id IS UNIQUE`), label);
  }
});

test("loads after capacity and after every label it links to (R14)", () => {
  const at = (f) => LOAD_ORDER.indexOf(f);
  assert.equal(at("witness.cypher"), at("capacity.cypher") + 1);
  for (const dep of ["invalidation-recovery.cypher", "emotion-regulation-content.cypher", "opposite-action-data.cypher", "dear-man-debrief-content.cypher", "emotion-wheel-sync.cypher"]) {
    assert.ok(at(dep) >= 0 && at(dep) < at("witness.cypher"), dep);
  }
});

test("lines: unique ids, known enums, a status and a review marker", () => {
  assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
  for (const r of rows) {
    assert.ok([1, 2, 3, 4, 5, 6].includes(r.level), r.id);
    assert.ok(["receive", "urge", "both", "after_miss", "after_louder", "self", "function"].includes(r.kind), r.id);
    assert.ok(["you", "name", "none"].includes(r.voice), r.id);
    assert.ok(["live", "draft", "retired"].includes(r.status), r.id);
    assert.ok(["reviewed", "draft"].includes(r.reviewStatus), r.id);
    assert.ok(r.bands.length && r.bands.every((b) => ["steady", "stirred", "flooded"].includes(b)), r.id);
    if (r.reviewStatus === "draft") assert.notEqual(r.status, "live", `${r.id}: a draft is never live`);
  }
});

test("every edge points at content that exists in the schema", () => {
  const moments = new Set(maps(stmts.find((s) => s.includes("MERGE (m:ToolMoment")).match(/^UNWIND (\[.*\]) AS row/s)[1]).map((m) => m.id));
  const known = {
    ToolMoment: moments,
    RecoveryProtocol: ids("invalidation-recovery.cypher", "RecoveryProtocol"),
    TurningPoint: ids("dear-man-debrief-content.cypher", "TurningPoint"),
    Emotion: emotionIds,
    ActionUrge: new Set([...read("opposite-action-data.cypher").matchAll(/id: "([a-z_]+)"/g)].map((m) => m[1])),
    EmotionRegulationContent: new Set([...read("emotion-regulation-content.cypher").matchAll(/EmotionRegulationContent \{dbtParent: '([a-z]+)'\}/g)].map((m) => m[1])),
  };
  assert.equal(known.EmotionRegulationContent.size, 9);
  for (const [type, list] of Object.entries(edges)) {
    for (const e of list) {
      assert.ok(byId[e.line], `${type}: unknown line ${e.line}`);
      assert.ok(known[e.label]?.has(e.to), `${type}: ${e.line} → ${e.label} ${e.to} doesn't exist`);
    }
  }
  assert.ok(stmts.some((s) => /MERGE \(l\)-\[:GROUNDED_IN\]->\(t\)/.test(s)), "lines are grounded in the validation sources");
});

test("every line has a moment or a target (no accidental everywhere-lines)", () => {
  for (const r of rows) {
    const targeted = ["FOR_MOMENT", "FOR_SITUATION", "VALIDATES", "VALIDATES_FAMILY", "FOR_URGE"].some((t) => targetsOf(t, r.id).length);
    assert.ok(targeted, r.id);
  }
});

test("Recover: 16 live, reviewed lines (4 per protocol) with the three D-04 edits", () => {
  const rv = rows.filter((r) => targetsOf("FOR_MOMENT", r.id).includes("recover_validate"));
  assert.equal(rv.length, 16);
  for (const r of rv) {
    assert.equal(r.status, "live", r.id);
    assert.equal(r.reviewStatus, "reviewed", r.id);
    assert.equal(targetsOf("FOR_SITUATION", r.id).length, 1, r.id);
  }
  const texts = rv.map((r) => r.textNamed ?? r.text);
  assert.ok(texts.includes("Both can be true: {N} is sensitive to this, and it hurt."));
  assert.ok(texts.includes("Both can be true: this felt wrong, and {N} gets to decide what happens next."));
  assert.ok(texts.includes("This is real pain. Being pushed away hurts anyone."));
  assert.ok(!texts.some((t) => /unkind|this was wrong|oversensitiv|alarm systems/.test(t)));
});

test("RecoveryProtocol.validationLines is the corpus projection, by id order", () => {
  const ir = read("invalidation-recovery.cypher");
  for (const protocol of ["not_received", "diminished_self", "blocked_wronged", "attachment_alarm"]) {
    const projected = JSON.parse(ir.match(new RegExp(`MERGE \\(p:RecoveryProtocol \\{id: "${protocol}"\\}\\)\\nSET p\\.label = "[^"]+", p\\.validationLines = (\\[.*\\]);`))[1]);
    const corpus = rows.filter((r) => targetsOf("FOR_SITUATION", r.id).includes(protocol)).sort((a, b) => a.order - b.order);
    assert.deepEqual(projected, corpus.map((r) => r.textNamed ?? r.text), protocol);
  }
  assert.match(readFileSync("scripts/invalidation-recovery/content.py", "utf8"), /witness_lines\("recover_validate", "not_received"\)/);
});

test("host drafts (OA, Problem Solve, DEAR MAN debrief) are drafts, one per family / turning point", () => {
  const draftsFor = (moment) => rows.filter((r) => targetsOf("FOR_MOMENT", r.id).includes(moment));
  for (const moment of ["oa_start", "ps_define"]) {
    const d = draftsFor(moment);
    assert.equal(d.length, 9, moment);
    assert.deepEqual(d.flatMap((r) => targetsOf("VALIDATES_FAMILY", r.id)).sort(), ["anger", "disgust", "envy", "fear", "guilt", "jealousy", "love", "sadness", "shame"]);
    for (const r of d) assert.equal(r.status, "draft", r.id);
  }
  assert.ok(draftsFor("oa_start").every((r) => r.kind === "function"));
  const dm = draftsFor("debrief_turning_point");
  assert.equal(dm.length, 8);
  assert.ok(dm.every((r) => r.status === "draft" && targetsOf("FOR_SITUATION", r.id).length === 1));
});

test("lines dropped from the source are retired, never deleted", () => {
  assert.ok(stmts.some((s) => /^MATCH \(l:ValidationLine\) WHERE NOT l\.id IN \[.*\]\nSET l\.status = 'retired'$/s.test(s)));
  assert.ok(!stmts.some((s) => /DELETE l\b|DETACH DELETE/.test(s)));
});
