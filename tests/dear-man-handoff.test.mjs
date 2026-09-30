// DEAR MAN's band gate (A4-4) and the hand-off from Recover. The 0–10 rating and Recover's numeric
// thresholds are gone from DEAR MAN; the band decides (graph BandRule dear-man:*).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const { dearManBandGate, summaryHeadsUpForBand, handoffPrefill, withBand } = await importTs("src/lib/dearManSafety.ts");
const { isDearManHandoff } = await importTs("src/data/dearManHandoff.ts");
const resume = await importTs("src/lib/dearManResume.ts");

const safetyCypher = readFileSync("schema/dear-man-safety-gates.cypher", "utf8");
const dearManCypher = readFileSync("schema/dear-man-content.cypher", "utf8");
const recoveryCypher = readFileSync("schema/invalidation-recovery.cypher", "utf8");
const loader = readFileSync("scripts/load-graph.mjs", "utf8");
const tsx = readFileSync("src/pages/tools/DearMan.tsx", "utf8");
const capacity = JSON.parse(readFileSync("tests/fixtures/capacity-content.json", "utf8"));

// Recover's thresholds still exist (Recover reads them until WMP-02); DEAR MAN only derives a band.
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

test("band gate follows the graph's BandRule rows: steady clear · stirred heads-up · flooded hand-off", () => {
  const rules = capacity.bandRules;
  assert.equal(dearManBandGate("steady", rules), "clear");
  assert.equal(dearManBandGate("stirred", rules), "headsUp");
  assert.equal(dearManBandGate("flooded", rules), "handoff");
  // No band (not asked, content unavailable): no gate. No rules loaded: the same mapping.
  assert.equal(dearManBandGate(null, rules), "clear");
  assert.equal(dearManBandGate("flooded", null), "handoff");
  assert.equal(dearManBandGate("stirred", []), "headsUp");
  // A content change moves the gate (flooded → full, no heads-up).
  assert.equal(dearManBandGate("flooded", [{ skillId: "dear-man", band: "flooded", mode: "full" }]), "clear");
});

test("summary heads-up when the band isn't steady; the plan is never locked; no 0–10 anywhere", () => {
  assert.equal(summaryHeadsUpForBand("stirred"), true);
  assert.equal(summaryHeadsUpForBand("flooded"), true);
  assert.equal(summaryHeadsUpForBand("steady"), false);
  assert.equal(summaryHeadsUpForBand(null), false);
  assert.equal(summaryHeadsUpForBand("flooded", "much_better"), false, "the user said much quieter: no 'still loud'");
  assert.equal(summaryHeadsUpForBand("flooded", "better"), true);
  assert.doesNotMatch(tsx, /WaitLock|blur-\[|planLocked/, "DEAR MAN must not lock or hide the plan");
  assert.doesNotMatch(tsx, /UrgeScale|checkStep|downshifted|safetyGates|intensityQuestion|rerateQuestion/);
  assert.match(tsx, /<BandGate context="dear-man" wording="relational" force=\{gateForce\} reaskIfFlooded/);
  assert.match(tsx, /<BreakdownHandoff host="dear-man"/);
  assert.match(tsx, /<TooMuchLink host="dear-man"/);
  assert.match(tsx, /session\.setBandAtStart\(r\)/);
  assert.match(tsx, /er: \{ handoffs: handoffExt\(handoffs\.current\) \}/);
});

test("Recover hands over a band derived from its own gates (bandFromLegacyScore)", () => {
  const at = new Date("2026-10-01T12:00:00Z");
  assert.equal(withBand({ ...handoff, intensity: gates.askMax }, gates, at).band, "steady");
  assert.equal(withBand({ ...handoff, intensity: gates.askMax + 1 }, gates, at).band, gates.askMax + 1 >= gates.downshiftAt ? "flooded" : "stirred");
  assert.equal(withBand({ ...handoff, intensity: gates.downshiftAt }, gates, at).band, "flooded");
  assert.equal(withBand(handoff, gates, at).bandAt, at.toISOString());
  assert.match(readFileSync("src/pages/tools/InvalidationRecovery.tsx", "utf8"), /dearManHandoff: withBand\(/);
});

test("resume draft: step ids round-trip; unknown ids resume at the scene; draft guard", () => {
  for (const st of [{ phase: "scene", sceneStep: 2 }, { phase: "assert", sceneStep: 0 }, { phase: "summary", sceneStep: 0 }]) {
    assert.deepEqual(resume.dearManStepFromId(resume.dearManStepId(st)), st);
  }
  assert.deepEqual(resume.dearManStepFromId("debrief-route"), { phase: "scene", sceneStep: 0 });
  assert.deepEqual(resume.dearManStepFromId(null), { phase: "scene", sceneStep: 0 });
  const d = resume.dearManDraftOf({ relationshipType: "boss", situationType: "ask", priorities: ["objective"], barriers: [], barriersCustom: "",
    describeId: null, describeCustom: "they moved the deadline", feelings: ["feel_hurt"], feelingCustom: "", assertIds: [], assertDetails: {},
    assertCustom: "", reinforceIds: [], reinforceCustom: "", anchorPhrase: "", middleGroundId: null, middleGroundCustom: "", walkAwayId: null, walkAwayCustom: "" });
  assert.equal(resume.isDearManDraft(d), true);
  assert.equal(resume.isDearManDraft({ ...d, v: 2 }), false);
  assert.equal(resume.isDearManDraft({ ...d, feelings: "x" }), false);
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

test("the handoff guard accepts the documented shape only (band optional)", () => {
  assert.equal(isDearManHandoff(handoff), true);
  assert.equal(isDearManHandoff({ ...handoff, band: "stirred", bandAt: "2026-10-01T12:00:00Z" }), true);
  assert.equal(isDearManHandoff({ ...handoff, band: "7" }), false);
  assert.equal(isDearManHandoff({ ...handoff, band: "flooded", bandAt: "later" }), false);
  assert.equal(isDearManHandoff({ ...handoff, source: "elsewhere" }), false);
  assert.equal(isDearManHandoff({ ...handoff, waitMinutes: "20" }), false);
  assert.equal(isDearManHandoff(null), false);
});

test("safety cypher is idempotent: MERGE only, no bare CREATE", () => {
  assert.doesNotMatch(safetyCypher.replace(/CREATE (CONSTRAINT|INDEX)/g, ""), /\bCREATE\b/);
  assert.match(safetyCypher, /MERGE \(c:DearManSafetyCopy \{id: 'dear_man_safety_copy'\}\)/);
  assert.match(safetyCypher, /c\.version = 'dear-man-safety-v3'/);
  for (const k of ["intensityQuestion", "intensityHint", "intensityLow", "intensityHigh", "downshiftLead", "rerateQuestion", "rerateHint"]) {
    assert.doesNotMatch(safetyCypher, new RegExp(`c\\.${k} = `), `${k} is no longer set`);
    assert.match(safetyCypher, new RegExp(`REMOVE[^;]*c\\.${k}`), `${k} is removed from the live node`);
  }
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

test("Recover's own gates and copy still exist in its flow (read by Recover until WMP-02)", () => {
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
