import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

async function importTs(path) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

const { validateInvalidationRecoverySession: validate, expectedRecoveryGate } = await importTs(
  "functions/src/invalidationRecoveryValidation.ts",
);
const cypher = readFileSync("schema/invalidation-recovery.cypher", "utf8");
const flow = JSON.parse(JSON.parse(cypher.match(/f\.contentJson = (".*");/)[1]));
const read = (f) => readFileSync(`schema/${f}.cypher`, "utf8");
const baseGraph = ["knowledge-graph", "emotion-wheel-sync"].map(read).join("\n");
/** Ids declared for one label: `MERGE (x:Label {id: "..."})` statements, plus emotion-wheel-sync rows. */
const idsOf = (label) => {
  const ids = new Set([...baseGraph.matchAll(new RegExp(`MERGE \\(\\w+:${label} \\{\\s*id: "([a-z_]+)"`, "g"))].map((m) => m[1]));
  if (label === "Emotion") {
    const rows = read("emotion-wheel-sync").split("MERGE (e:Emotion")[0];
    for (const m of rows.matchAll(/\{id: "([a-z_]+)", name:/g)) ids.add(m[1]);
  }
  return ids;
};

const valid = () => ({
  schemaVersion: 1,
  id: "3f2c9a0e-1b2c-4d5e-8f90-123456789abc",
  contentVersion: "recovery-v1",
  stateId: "brushed",
  pull: "fight",
  gate: "downshift",
  emotionId: "hurt",
  needId: "heard",
  exitId: "ask",
  zone: "both",
  safe: "yes",
  asks: 1,
  startIntensity: 8,
  startUrge: 9,
  readings: [8, 6, 4, 3],
  endIntensity: 3,
  endUrge: 2,
  skills: ["stop", "sigh", "label", "validate", "need", "request", "wait_lock"],
  followUps: ["tomorrow"],
});

test("accepts a complete session", () => {
  assert.equal(validate(valid()).exitId, "ask");
});

test("rejects free text and unknown shapes", () => {
  assert.throws(() => validate(null));
  assert.throws(() => validate({ ...valid(), schemaVersion: 2 }));
  assert.throws(() => validate({ ...valid(), id: "not-a-uuid" }));
  assert.throws(() => validate({ ...valid(), stateId: "They brushed me off" }));
  assert.throws(() => validate({ ...valid(), skills: ["sigh", "sigh"] }));
  assert.throws(() => validate({ ...valid(), followUps: ["email-them"] }));
});

test("scores are integers 0–10 and readings bracket the session", () => {
  assert.throws(() => validate({ ...valid(), startIntensity: 11 }));
  assert.throws(() => validate({ ...valid(), endUrge: 2.5 }));
  assert.throws(() => validate({ ...valid(), readings: [8] }));
  assert.throws(() => validate({ ...valid(), readings: [7, 3] }), /start and end/);
  assert.throws(() => validate({ ...valid(), readings: Array(9).fill(3) }));
});

test("the ask exit requires a safe person who has not refused twice", () => {
  assert.throws(() => validate({ ...valid(), safe: "no" }), /Ask exit/);
  assert.throws(() => validate({ ...valid(), asks: 2 }), /Ask exit/);
  assert.throws(() => validate({ ...valid(), safe: null, asks: null }), /Ask exit/);
  assert.equal(validate({ ...valid(), exitId: "land", safe: "no", asks: 2 }).exitId, "land");
});

test("migration only uses MERGE for content nodes (idempotent)", () => {
  assert.doesNotMatch(cypher.replace(/CREATE (CONSTRAINT|INDEX)/g, ""), /\bCREATE\b/);
});

test("every Emotion id the migration links to exists in the base graph", () => {
  const ids = idsOf("Emotion");
  const referenced = [...cypher.matchAll(/\{id: "([a-z_]+)", rank: \d+\}/g)].map((m) => m[1]);
  const addressed = JSON.parse(cypher.match(/UNWIND (\[[^\]]+\]) AS eid/)[1]);
  assert.ok(referenced.length >= 40 && addressed.length >= 5, "found the linked emotions");
  const missing = [...referenced, ...addressed].filter((id) => !ids.has(id));
  assert.deepEqual(missing, []);
});

test("every TherapyConcept / ActivationPattern referenced exists or is created here", () => {
  const created = new Set([...cypher.matchAll(/MERGE \(c:TherapyConcept \{id: "([a-z_]+)"\}\)/g)].map((m) => m[1]));
  const base = idsOf("TherapyConcept");
  const concepts = [
    ...[...cypher.matchAll(/UNWIND (\[[^\]]+\]) AS cid/g)].flatMap((m) => JSON.parse(m[1])),
    ...[...cypher.matchAll(/\(c:TherapyConcept \{id: "([a-z_]+)"\}\)\nMERGE \((s|k|x|p)\)/g)].map((m) => m[1]),
    ...[...cypher.matchAll(/\(m:TherapyConcept \{id: "([a-z_]+)"\}\)/g)].map((m) => m[1]),
  ];
  assert.ok(concepts.length >= 30, "found the linked concepts");
  assert.deepEqual(concepts.filter((id) => !created.has(id) && !base.has(id)), []);
  const patterns = [...cypher.matchAll(/UNWIND (\[[^\]]+\]) AS pid/g)].flatMap((m) => JSON.parse(m[1]));
  const patternIds = idsOf("ActivationPattern");
  assert.ok(patterns.length >= 8);
  assert.deepEqual(patterns.filter((id) => !patternIds.has(id)), []);
});

test("flow document carries gates, copy and only known source ids", () => {
  assert.equal(flow.version, "recovery-v1");
  const g = flow.gates;
  assert.ok(g.coldAt > g.downshiftAt && g.downshiftAt > g.askMax, "gate thresholds are ordered");
  assert.deepEqual(flow.pulls.map((p) => p.id), ["fight", "chase", "hide", "freeze"]);
  const sources = new Set([...cypher.matchAll(/MERGE \(s:ClinicalSource \{id: "([a-z0-9_]+)"\}\)/g)].map((m) => m[1]));
  assert.deepEqual(flow.sourceIds.filter((id) => !sources.has(id)), []);
});

test("validator edge cases", () => {
  assert.equal(validate({ ...valid(), asks: 0 }).asks, 0);
  assert.throws(() => validate({ ...valid(), asks: 3 }));
  assert.throws(() => validate({ ...valid(), asks: "1" }));
  const { zone, ...noZone } = valid();
  assert.throws(() => validate(noZone), /zone/);
  assert.throws(() => validate({ ...valid(), pull: "flee" }));
  assert.throws(() => validate({ ...valid(), gate: "calm" }));
  assert.throws(() => validate({ ...valid(), contentVersion: "x".repeat(41) }));
  assert.throws(() => validate({ ...valid(), skills: Array.from({ length: 26 }, (_, i) => `s${i}`) }));
  assert.throws(() => validate({ ...valid(), readings: [8, 5.5, 3] }));
  assert.equal(validate({ ...valid(), skills: ["wait_lock"] }).skills[0], "wait_lock");
});

test("skill and state ids in the graph satisfy the validator's id rule", () => {
  const ids = [...cypher.matchAll(/MERGE \((?:k:PracticeSkill|w:InvalidationEvent|n:UnmetNeed) \{id: "([^"]+)"\}\)/g)].map((m) => m[1]);
  assert.ok(ids.length >= 30);
  for (const id of ids) assert.match(id, /^[a-z][a-z0-9_]*$/, `${id} is snake_case`);
});

test("server gate rule follows the flow thresholds", () => {
  const g = flow.gates;
  const calm = { highRisk: false, lowArousal: false };
  assert.equal(expectedRecoveryGate(g.downshiftAt, "fight", calm, g), "downshift");
  assert.equal(expectedRecoveryGate(g.coldAt, "chase", calm, g), "downshift-cold");
  assert.equal(expectedRecoveryGate(g.downshiftAt, "fight", { highRisk: true, lowArousal: false }, g), "downshift-cold");
  assert.equal(expectedRecoveryGate(g.downshiftAt - 1, "fight", calm, g), "none");
  // Shutdown never gets a calming routine, at any intensity.
  for (let i = 0; i <= 10; i++) assert.equal(expectedRecoveryGate(i, "freeze", calm, g), "orient");
  assert.equal(expectedRecoveryGate(g.downshiftAt, "hide", calm, g), "orient");
  assert.equal(expectedRecoveryGate(g.orientLowArousalAt, "hide", { highRisk: false, lowArousal: true }, g), "orient");
});

test("each invalidation event has exactly one primary protocol and a default emotion", () => {
  const states = [...cypher.matchAll(/MERGE \(w:InvalidationEvent \{id: "([a-z_]+)"\}\)/g)].map((m) => m[1]);
  for (const id of states) {
    const primaries = cypher.match(new RegExp(`\\(w:InvalidationEvent \\{id: "${id}"\\}\\), \\(p:RecoveryProtocol \\{id: "[a-z_]+"\\}\\)\\nMERGE \\(w\\)-\\[r:HAS_PROTOCOL\\]->\\(p\\) SET r.primary = true`, "g")) ?? [];
    assert.equal(primaries.length, 1, id);
    assert.match(cypher, new RegExp(`\\{id: "[a-z_]+", rank: 0\\}[^\\n]*\\nMATCH \\(w:InvalidationEvent \\{id: "${id}"\\}\\)`), id);
  }
});

test("pulls and follow-ups in the flow match the validator enums", () => {
  const src = readFileSync("functions/src/invalidationRecoveryValidation.ts", "utf8");
  const list = (name) => JSON.parse(src.match(new RegExp(`const ${name} = (\\[[^\\]]+\\])`))[1].replace(/'/g, '"'));
  assert.deepEqual(flow.pulls.map((p) => p.id), list("PULLS"));
  assert.deepEqual(flow.copy.follow.options.map((o) => o.id), list("FOLLOW_UPS"));
});

// ── Client rules (src/lib) ───────────────────────────────────────────────────
const lib = await importTs("src/lib/invalidationRecovery.ts");
const flowLib = await importTs("src/lib/invalidationRecoveryFlow.ts");

test("client gateFor and server expectedRecoveryGate agree on every input", () => {
  const g = flow.gates;
  for (let i = 0; i <= 10; i++)
    for (const pull of ["fight", "chase", "hide", "freeze"])
      for (const highRisk of [false, true])
        for (const lowArousal of [false, true]) {
          const st = { highRisk, lowArousal };
          assert.equal(lib.gateFor(i, pull, st, g), expectedRecoveryGate(i, pull, st, g), `${i} ${pull} ${highRisk} ${lowArousal}`);
        }
});

test("asking is hard-locked for unsafe people, two refusals, and deliberate caricature", () => {
  const base = { state: { id: "brushed", protocol: "not_received", highRisk: false }, pull: "fight", intensityNow: 3, safe: "yes", asks: 0, zone: "both", gates: flow.gates };
  const ask = (r) => lib.routeExits(r).find((o) => o.id === "ask");
  assert.equal(ask(base).lock, null);
  assert.equal(ask({ ...base, safe: "no" }).lock, "unsafe");
  assert.equal(ask({ ...base, asks: 2 }).lock, "refused");
  assert.equal(ask({ ...base, state: { id: "mocked", protocol: "not_received", highRisk: true }, zone: "real" }).lock, "deliberate");
  assert.equal(ask({ ...base, intensityNow: flow.gates.askMax + 1 }).lock, "tooHot");
  // The recommended option is always usable.
  for (const safe of ["yes", "no"]) for (const asks of [0, 1, 2]) for (const now of [2, 8]) {
    const opts = lib.routeExits({ ...base, safe, asks, intensityNow: now });
    const rec = opts.filter((o) => o.recommended);
    assert.equal(rec.length, 1);
    assert.equal(rec[0].lock, null);
  }
});

test("step machine: fight at 8 goes lock → breathe → re-rate; shutdown never breathes", () => {
  const A = { protocol: "not_received", secondaryProtocol: null };
  const d = { ...flowLib.EMPTY_FLOW, gate: "downshift" };
  assert.equal(flowLib.nextStep("loud", d, A), "stop");
  assert.equal(flowLib.nextStep("stop", d, A), "breathe");
  assert.equal(flowLib.nextStep("stop", { ...d, gate: "downshift-cold" }, A), "cold");
  assert.equal(flowLib.nextStep("loud", { ...d, gate: "orient" }, A), "orient");
  assert.equal(flowLib.nextStep("breathe", d, A), "rerate");
  assert.equal(flowLib.nextStep("need", d, A), "certainty");
  assert.equal(flowLib.nextStep("need", d, { protocol: "diminished_self", secondaryProtocol: null }), "them");
  assert.equal(flowLib.nextStep("rerate", { ...d, rerateTo: "route" }, A), "route");
  const D = { protocol: "not_received", secondaryProtocol: "attachment_alarm" };
  assert.equal(flowLib.nextStep("rerate", d, D), "secure");
  assert.equal(flowLib.nextStep("rerate", { ...d, skills: ["secure"] }, D), "label");
});

test("Back restores the data snapshot, and double pushes are ignored", () => {
  let h = { stack: [{ step: "what", data: flowLib.EMPTY_FLOW }] };
  h = flowLib.flowReducer(h, { type: "go", step: "loud", patch: { stateId: "brushed" } });
  h = flowLib.flowReducer(h, { type: "go", step: "loud", patch: { stateId: "mocked" } });
  assert.equal(h.stack.length, 2);
  h = flowLib.flowReducer(h, { type: "go", step: "rerate", patch: { mids: [6], rerateTo: "route" } });
  h = flowLib.flowReducer(h, { type: "back" });
  const top = h.stack[h.stack.length - 1].data;
  assert.deepEqual(top.mids, []);
  assert.equal(top.rerateTo, "label");
  assert.equal(top.stateId, "brushed");
});

test("validation lines render in distanced or second-person voice", () => {
  const line = "{N}'s hurt makes sense. {N} can know this hurt without needing them to be the villain.";
  assert.equal(lib.renderValidationLine(line, "Sam", "x"), "Sam's hurt makes sense. Sam can know this hurt without needing them to be the villain.");
  assert.equal(lib.renderValidationLine(line, null, "x"), "Your hurt makes sense. You can know this hurt without needing them to be the villain.");
  assert.equal(lib.renderValidationLine("{N}, of course that stung. You got {phrase}.", null, "brushed off"), "Of course that stung. You got brushed off.");
  assert.equal(lib.masteryOf(0).level, 0);
  assert.equal(lib.masteryOf(7).level, 3);
  assert.equal(lib.masteryOf(30).level, 5);
});

test("every skill id the client can credit is a PracticeSkill in the graph", () => {
  const graphSkills = new Set([...cypher.matchAll(/MERGE \(k:PracticeSkill \{id: "([a-z_]+)"\}\)/g)].map((m) => m[1]));
  const sources = ["src/pages/tools/InvalidationRecovery.tsx", "src/components/tools/invalidationRecovery/exits.tsx"]
    .map((f) => readFileSync(f, "utf8")).join("\n");
  const credited = new Set([
    ...[...sources.matchAll(/withSkills\(([^)]*)\)/g)].flatMap((m) => [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1])),
    ...[...sources.matchAll(/skills: \[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1])),
    ...[...cypher.matchAll(/s\.practiceSkill = "([a-z_]+)"/g)].map((m) => m[1]),
  ]);
  assert.ok(credited.size >= 12, `found ${credited.size} credited skills`);
  assert.deepEqual([...credited].filter((id) => !graphSkills.has(id)), []);
});

test("ids the client routes on exist in the graph", () => {
  const src = readFileSync("src/lib/invalidationRecovery.ts", "utf8") + readFileSync("src/lib/invalidationRecoveryFlow.ts", "utf8");
  const events = new Set([...cypher.matchAll(/MERGE \(w:InvalidationEvent \{id: "([a-z_]+)"\}\)/g)].map((m) => m[1]));
  const protocols = new Set([...cypher.matchAll(/MERGE \(p:RecoveryProtocol \{id: "([a-z_]+)"\}\)/g)].map((m) => m[1]));
  for (const m of src.matchAll(/state\.id === '([a-z_]+)'/g)) assert.ok(events.has(m[1]), `event ${m[1]}`);
  for (const m of src.matchAll(/protocol === '([a-z_]+)'/g)) assert.ok(protocols.has(m[1]), `protocol ${m[1]}`);
  assert.ok(flow.gates.certaintyReal > flow.gates.certaintyBoth);
});

test("the checked-in migration matches its generator", async () => {
  const { execFileSync } = await import("node:child_process");
  let generated;
  try { generated = execFileSync("python3", ["scripts/invalidation-recovery/build.py"], { encoding: "utf8" }); }
  catch { return; } // python3 unavailable: skip
  assert.equal(generated, cypher, "run: python3 scripts/invalidation-recovery/build.py > /tmp/ir.cypher && mv /tmp/ir.cypher schema/invalidation-recovery.cypher");
});
