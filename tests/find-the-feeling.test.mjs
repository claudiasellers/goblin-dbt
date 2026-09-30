import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const read = (f) => readFileSync(`schema/${f}.cypher`, "utf8");
const cypher = read("find-the-feeling");
const flow = JSON.parse(JSON.parse(cypher.match(/f\.contentJson = (".*");/)[1]));
const baseGraph = ["knowledge-graph", "incremental-update", "emotion-wheel-sync", "invalidation-recovery"].map(read).join("\n");

/** Emotion ids declared anywhere in the base graph (CREATE blocks + emotion-wheel-sync rows). */
const emotionIds = (() => {
  const ids = new Set([...baseGraph.matchAll(/CREATE \(\w+:Emotion \{\s*id: "([a-z_]+)"/g)].map((m) => m[1]));
  for (const m of read("emotion-wheel-sync").matchAll(/\{id: "([a-z_]+)", name:/g)) ids.add(m[1]);
  return ids;
})();
const conceptIds = new Set(
  [...(baseGraph + cypher).matchAll(/TherapyConcept \{\s*id: ["']([a-z_]+)["']/g)].map((m) => m[1]),
);
const signatureWords = [...cypher.matchAll(/MATCH \(e:Emotion \{id: "([a-z_]+)"\}\)\nMERGE \(g:FeelingSignature/g)].map((m) => m[1]);

test("generated migration is up to date with content.py", () => {
  let out;
  try {
    out = execFileSync("python3", ["scripts/find-the-feeling/build.py"], { encoding: "utf8" });
  } catch {
    return; // python3 unavailable: skip freshness check
  }
  assert.equal(out.trim(), cypher.trim(), "run build.py and commit schema/find-the-feeling.cypher");
});

test("every signature word is an existing Emotion node (MATCH would silently skip it)", () => {
  assert.ok(signatureWords.length >= 25);
  for (const w of signatureWords) assert.ok(emotionIds.has(w), `unknown emotion ${w}`);
  assert.equal(new Set(signatureWords).size, signatureWords.length, "duplicate word");
});

test("offers words across pleasant and unpleasant, not only the hurt cluster", () => {
  for (const w of ["peaceful", "hopeful", "hurt", "anxious", "lonely", "numb"]) assert.ok(signatureWords.includes(w), w);
});

test("routing and USES targets exist; every urge routes somewhere", () => {
  for (const m of cypher.matchAll(/UNWIND (\[[^\]]*\]) AS row\nMATCH \(u:FeelingUrge/g)) {
    const rows = [...m[1].matchAll(/c: "([a-z_]+)"/g)].map((x) => x[1]);
    assert.ok(rows.length > 0);
    for (const c of rows) assert.ok(conceptIds.has(c), `unknown concept ${c}`);
  }
  for (const u of ["fight", "chase", "hide", "blank"]) assert.match(cypher, new RegExp(`FeelingUrge \\{id: "${u}"\\}`));
  const uses = JSON.parse(cypher.match(/UNWIND (\[[^\]]*\]) AS cid\nMATCH \(t:TherapyConcept \{id: 'dbt_find_the_feeling'\}\)/)[1]);
  for (const c of uses) assert.ok(conceptIds.has(c), `unknown concept ${c}`);
  assert.ok(uses.includes("affect_labeling"), "USES affect_labeling keeps the co-occurrence contraindication in force");
});

test("appToolId values point at real app tools (except the one this change adds)", () => {
  const tools = readFileSync("src/data/tools.ts", "utf8");
  const src = read("app-tool-ids") + cypher;
  const rows = [...src.matchAll(/\{c: "([a-z_]+)", t: "([a-z-]+)"\}/g)].map((m) => [m[1], m[2]]);
  assert.ok(rows.length >= 9);
  for (const [c, t] of rows) {
    assert.ok(conceptIds.has(c), `unknown concept ${c}`);
    if (t !== "find-the-feeling") assert.match(tools, new RegExp(`id: '${t}'`), t);
  }
  // Every urge route target must have an app tool id, or the card would point nowhere.
  const withApp = new Set(rows.map(([c]) => c));
  for (const m of cypher.matchAll(/UNWIND (\[[^\]]*\]) AS row\nMATCH \(u:FeelingUrge/g)) {
    for (const c of [...m[1].matchAll(/c: "([a-z_]+)"/g)].map((x) => x[1])) assert.ok(withApp.has(c), `route target ${c} has no appToolId`);
  }
});

test("loader runs app-tool-ids before find-the-feeling", () => {
  const order = [...readFileSync("scripts/load-graph.mjs", "utf8").matchAll(/^\s*'([a-z0-9-]+\.cypher)'/gm)].map((m) => m[1]);
  assert.ok(order.indexOf("app-tool-ids.cypher") >= 0 && order.indexOf("app-tool-ids.cypher") < order.indexOf("find-the-feeling.cypher"));
});

test("functions prefer appToolId over string normalization", () => {
  // All function sources (split into functions/src/<domain>/ in A1-2): the tools query in
  // recommendation/ (getQuickTools, the second hit, was removed in A1-7); suggestedAppTool is in insights/.
  const fn = readdirSync("functions/src", { recursive: true })
    .filter((f) => f.endsWith(".ts"))
    .map((f) => readFileSync(`functions/src/${f}`, "utf8"))
    .join("\n");
  assert.equal((fn.match(/tc\.appToolId as appToolId/g) || []).length, 1);
  assert.match(fn, /suggestedAppTool/);
});

test("never recommended for dissociation/flooding states where labelling must wait", () => {
  const addr = JSON.parse(cypher.match(/UNWIND (\[[^\]]*\]) AS eid\nMATCH \(t:TherapyConcept \{id: 'dbt_find_the_feeling'\}\)/)[1]);
  for (const bad of ["numb", "empty", "overwhelmed"]) assert.ok(!addr.includes(bad), bad);
  assert.equal(flow.gates.floodedBlank, "regulate_then_orient_no_label");
  assert.deepEqual(flow.gates.regulateBands, ["flooded"]);
  assert.deepEqual(flow.gates.activateUrges, ["blank"]);
});

test("no numeric rating scales in user-facing copy", () => {
  const copy = JSON.stringify(flow.copy);
  assert.doesNotMatch(copy, /\b(0|1)\s*(-|–|to)\s*10\b|\/10\b|out of 10|\brat(e|ing)\b|\bnumber\b|\bscale\b/i);
  assert.deepEqual(Object.keys(flow.copy.capacity.options).sort(), ["flooded", "steady", "stirred"]);
  assert.deepEqual(Object.keys(flow.copy.close.options).sort(), ["louder", "much", "quieter", "same"]);
});

test("every cited source exists", () => {
  for (const s of flow.sourceIds) assert.match(baseGraph + cypher, new RegExp(`ClinicalSource \\{id: "${s}"\\}`), s);
});
