// The hand-off from Recover into DEAR MAN (A4-4): Recover derives a band from its own gates; DEAR MAN's prep reads
// only the band (prepEntryCtx, tests/dear-man-prep.test.mjs). The hand-built prep's band gate, heads-up, prefill and
// resume draft went with that page (IE-B4).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const { withBand } = await importTs("src/lib/dearManSafety.ts");

const safetyCypher = readFileSync("schema/dear-man-safety-gates.cypher", "utf8");
const dearManCypher = readFileSync("schema/dear-man-content.cypher", "utf8");
const recoveryCypher = readFileSync("schema/invalidation-recovery.cypher", "utf8");
const loader = readFileSync("scripts/load-graph.mjs", "utf8");

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

test("Recover hands over a band derived from its own gates (bandFromLegacyScore)", () => {
  const at = new Date("2026-10-01T12:00:00Z");
  assert.equal(withBand({ ...handoff, intensity: gates.askMax }, gates, at).band, "steady");
  assert.equal(withBand({ ...handoff, intensity: gates.askMax + 1 }, gates, at).band, gates.askMax + 1 >= gates.downshiftAt ? "flooded" : "stirred");
  assert.equal(withBand({ ...handoff, intensity: gates.downshiftAt }, gates, at).band, "flooded");
  assert.equal(withBand(handoff, gates, at).bandAt, at.toISOString());
  assert.match(readFileSync("src/pages/tools/InvalidationRecovery.tsx", "utf8"), /dearManHandoff: withBand\(/);
});

test("safety cypher is idempotent: MERGE only, no bare CREATE", () => {
  assert.doesNotMatch(safetyCypher.replace(/CREATE (CONSTRAINT|INDEX)/g, ""), /\bCREATE\b/);
  assert.match(safetyCypher, /MERGE \(c:DearManSafetyCopy \{id: 'dear_man_safety_copy'\}\)/);
  assert.match(safetyCypher, /c\.version = 'dear-man-safety-v3'/);
  for (const k of ["intensityQuestion", "intensityHint", "intensityLow", "intensityHigh", "downshiftLead", "rerateQuestion", "rerateHint"]) {
    assert.doesNotMatch(safetyCypher, new RegExp(`c\\.${k} = `), `${k} is no longer set`);
    // Kept on the live node for one release, for tabs still running the pre-M3 page (Codex, PR #17).
    assert.doesNotMatch(safetyCypher, new RegExp(`REMOVE[^;]*c\\.${k}`), `${k} stays on the live node for now`);
  }
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
