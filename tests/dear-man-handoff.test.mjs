import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

async function importTs(path) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
}

const { dearManGateState, nextAfterRating, summaryHeadsUp, handoffPrefill } =
  await importTs("src/lib/dearManSafety.ts");
const { isDearManHandoff } = await importTs("src/data/dearManHandoff.ts");

const safetyCypher = readFileSync("schema/dear-man-safety-gates.cypher", "utf8");
const dearManCypher = readFileSync("schema/dear-man-content.cypher", "utf8");
const recoveryCypher = readFileSync("schema/invalidation-recovery.cypher", "utf8");
const loader = readFileSync("scripts/load-graph.mjs", "utf8");
const tsx = readFileSync("src/pages/tools/DearMan.tsx", "utf8");

// Thresholds come from the graph, not from this test.
const flow = JSON.parse(JSON.parse(recoveryCypher.match(/f\.contentJson = (".*");/)[1]));
const gates = flow.gates;

const handoff = {
  source: "recovering-from-invalidation",
  emotionId: "hurt",
  emotionName: "Hurt",
  needLabel: "To be heard",
  intensity: 4,
  waitMinutes: 20,
  oneMessageOnly: true,
};

test("gate state follows the graph thresholds", () => {
  assert.equal(dearManGateState(gates.downshiftAt, gates), "downshift");
  assert.equal(dearManGateState(10, gates), "downshift");
  assert.equal(dearManGateState(gates.askMax + 1, gates), gates.askMax + 1 >= gates.downshiftAt ? "downshift" : "wait");
  assert.equal(dearManGateState(gates.askMax, gates), "clear");
  assert.equal(dearManGateState(0, gates), "clear");
  // Older graph / no rating: gates are skipped.
  assert.equal(dearManGateState(10, null), "clear");
  assert.equal(dearManGateState(null, gates), "clear");
});

test("downshift is offered once, then the flow continues", () => {
  assert.equal(nextAfterRating(9, gates, false), "breathe");
  assert.equal(nextAfterRating(9, gates, true), "scene");
  assert.equal(nextAfterRating(3, gates, false), "scene");
  assert.equal(nextAfterRating(9, null, false), "scene");
});

test("summary heads-up: shown only while it's still loud; the plan is never locked", () => {
  assert.equal(summaryHeadsUp({ latestIntensity: gates.askMax + 1, gates }), true);
  assert.equal(summaryHeadsUp({ latestIntensity: 10, gates }), true);
  assert.equal(summaryHeadsUp({ latestIntensity: gates.askMax, gates }), false);
  assert.equal(summaryHeadsUp({ latestIntensity: null, gates }), false);
  assert.equal(summaryHeadsUp({ latestIntensity: 10, gates: null }), false);
  assert.doesNotMatch(tsx, /WaitLock|blur-\[|planLocked/, "DEAR MAN must not lock or hide the plan");
});

test("handoff prefill matches feeling chips by label and verifies the situation id", () => {
  const content = {
    situationTypes: [{ id: "ask" }, { id: "address" }],
    feelingChips: [{ id: "feel_hurt", label: "hurt" }, { id: "feel_left_out", label: "Left out" }],
  };
  assert.deepEqual(handoffPrefill(handoff, content, "address"), {
    situationType: "address", feelings: ["feel_hurt"], feelingCustom: "",
  });
  // Graph id with underscores matches a spaced label.
  assert.deepEqual(
    handoffPrefill({ emotionId: "left_out", emotionName: "Excluded" }, content, "address").feelings,
    ["feel_left_out"],
  );
  // No chip: kept as the "something else" feeling. Unknown situation id: not preselected.
  assert.deepEqual(handoffPrefill({ emotionId: "humiliated", emotionName: "Humiliated" }, content, "nope"), {
    situationType: null, feelings: [], feelingCustom: "Humiliated",
  });
  assert.equal(handoffPrefill(handoff, content, undefined).situationType, null);
});

test("the handoff guard accepts the documented shape only", () => {
  assert.equal(isDearManHandoff(handoff), true);
  assert.equal(isDearManHandoff({ ...handoff, source: "elsewhere" }), false);
  assert.equal(isDearManHandoff({ ...handoff, waitMinutes: "20" }), false);
  assert.equal(isDearManHandoff(null), false);
});

test("safety cypher is idempotent: MERGE only, no bare CREATE", () => {
  assert.doesNotMatch(safetyCypher.replace(/CREATE (CONSTRAINT|INDEX)/g, ""), /\bCREATE\b/);
  assert.match(safetyCypher, /MERGE \(c:DearManSafetyCopy \{id: 'dear_man_safety_copy'\}\)/);
});

test("every safety copy key the page reads exists in the cypher", () => {
  const read = new Set([...tsx.matchAll(/\bsc\.([a-zA-Z]+)/g)].map((m) => m[1]));
  read.add("handoffSituationId"); // read from data.safetyCopy in the load callback
  assert.ok(read.size >= 10, "expected the page to read the safety copy");
  const set = new Set([...safetyCypher.matchAll(/\bc\.([a-zA-Z]+) = /g)].map((m) => m[1]));
  for (const key of read) assert.ok(set.has(key), `missing c.${key} in dear-man-safety-gates.cypher`);
});

test("the handoff situation id exists as a DEAR MAN situation type", () => {
  const id = safetyCypher.match(/c\.handoffSituationId = '([a-z_]+)'/)[1];
  assert.match(dearManCypher, new RegExp(`MERGE \\(s:DearManSituationType \\{id: '${id}'\\}\\)`));
});

test("the gates and shared copy the page relies on exist in the recovery flow", () => {
  for (const k of ["downshiftAt", "askMax", "waitMinutes"]) assert.equal(typeof gates[k], "number", k);
  for (const k of ["locked", "unlocked", "unlockedShort", "waiting", "done", "copy", "copied"]) {
    assert.equal(typeof flow.copy.wait[k], "string", `wait.${k}`);
  }
  for (const k of ["start", "skip", "done", "title", "sub"]) assert.equal(typeof flow.copy.breathe[k], "string", `breathe.${k}`);
  assert.ok(Array.isArray(flow.copy.breathe.phases) && typeof flow.copy.breathe.cycles === "number");
});

test("loader runs the safety file right after the recovery flow", () => {
  const order = [...loader.matchAll(/^\s*'([a-z0-9-]+\.cypher)'/gm)].map((m) => m[1]);
  const i = order.indexOf("invalidation-recovery.cypher");
  assert.ok(i >= 0);
  assert.equal(order[i + 1], "dear-man-safety-gates.cypher");
});
