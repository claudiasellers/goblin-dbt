// PR-S2: practice spine content (FollowUpType, SessionCloseFlow, PracticeSkill fields) and the
// scoped PracticeSkill DELETE in Recover's generated file (plan F5, ruling R6).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { LOAD_ORDER, splitStatements } from "../scripts/load-graph.mjs";
import { followUpTypes, closeFlow } from "./lib/practiceSpine.mjs";

const cypher = readFileSync("schema/practice-spine.cypher", "utf8");
const toolIds = new Set([...readFileSync("src/data/tools.ts", "utf8").matchAll(/^\s{4}id: '([a-z-]+)',$/gm)].map((m) => m[1]));

test("generated file is fresh (python3 scripts/practice-spine/build.py)", (t) => {
  let out;
  try { out = execFileSync("python3", ["scripts/practice-spine/build.py"], { encoding: "utf8" }); }
  catch { t.skip("python3 unavailable"); return; }
  assert.equal(out.trim(), cypher.trim(), "run build.py and commit schema/practice-spine.cypher");
});

test("loads after find-the-feeling (urge_surfing) and is in LOAD_ORDER once", () => {
  assert.ok(LOAD_ORDER.indexOf("practice-spine.cypher") > LOAD_ORDER.indexOf("find-the-feeling.cypher"));
});

test("every Phase A follow-up type exists; reserved ones are off", () => {
  const types = Object.fromEntries(followUpTypes().map((t) => [t.id, t]));
  for (const id of ["oa_plan", "recover_next_day", "recover_rehearse", "recover_log", "ps_step", "tool_outcome",
    "regulation_recheck", "pattern_offer", "profile_revisit", "resume_skill"]) assert.ok(types[id], id);
  for (const id of ["safety_checkin", "chain_nextday", "missed_step", "diary_daily", "practice_daily", "ask_outcome"]) {
    assert.ok(types[id]?.reserved && !types[id].enabled, id);
  }
  assert.equal(types.safety_checkin.tier, "safety");
  assert.equal(types.regulation_recheck.enabled, false, "D-09: off until push");
  assert.equal(types.profile_revisit.enabled, false);
  assert.equal(types.oa_plan.mode, "deeplink");
  assert.equal(types.recover_next_day.mode, "inline");
  // Recover windows (D-09): next day 10:00, +2 d 18:00, +3 d 18:00
  assert.deepEqual(types.recover_next_day.content.window, { kind: "at_local", days: 1, time: "10:00" });
  assert.deepEqual(types.recover_rehearse.content.window, { kind: "at_local", days: 2, time: "18:00" });
  assert.deepEqual(types.recover_log.content.window, { kind: "at_local", days: 3, time: "18:00" });
  for (const t of followUpTypes()) {
    assert.match(t.s, /t\.reviewStatus = "(draft|reviewed|approved)"/, t.id);
    assert.doesNotMatch(t.content.notification, /!/, t.id);
  }
});

test("close copy is the canonical then-vs-now per direction (R3)", () => {
  const f = closeFlow();
  const ids = (k) => f.kinds[k].choices.map((c) => c.id);
  assert.deepEqual(ids("regulation_down"), ["worse", "same", "better", "much_better"]);
  assert.deepEqual(ids("orienting"), ["worse", "same", "better", "much_better"]);
  assert.equal(f.kinds.regulation_down.dir, "down");
  assert.equal(f.kinds.orienting.dir, "orient");
  assert.deepEqual(f.kinds.regulation_down.choices.map((c) => c.label), ["Louder", "About the same", "Quieter", "Much quieter"]);
  assert.deepEqual(f.kinds.orienting.choices.map((c) => c.label), ["Further away", "About the same", "A bit more here", "More here"]);
  assert.ok(!("regulation_up" in f.kinds), "up wording is reserved for DT");
  assert.deepEqual(ids("urge"), ["no", "partly", "yes"]);
  // Hold to wait (DT-02) asks the PRD's three (no · partly · yes), then the pull now in its own words (urge_change).
  assert.deepEqual(f.byTool.pause.urge.choices.map((c) => c.id), ["no", "partly", "yes"]);
  assert.deepEqual(f.byTool.pause.regulation_down.choices.map((c) => c.id), ["worse", "same", "better", "much_better"]);
  assert.match(cypher, /SessionCloseFlow \{id: 'session_close'\}\)\nSET f\.version = "spine-v1", f\.reviewStatus = "(draft|reviewed|approved)"/);
});

test("PracticeSkill defaultFor names real app tools; new skills link to existing concepts", () => {
  const defaults = [...cypher.matchAll(/k\.defaultFor = (\[[^\]]*\])/g)].flatMap((m) => JSON.parse(m[1]));
  assert.ok(defaults.length >= 8);
  for (const id of defaults) assert.ok(toolIds.has(id), id);
  assert.match(cypher, /PracticeSkill \{id: "urge_surf"\}\), \(c:TherapyConcept \{id: "urge_surfing"\}\)/);
  assert.match(cypher, /PracticeSkill \{id: "problem_solve"\}\), \(c:TherapyConcept \{id: "dbt_problem_solving"\}\)/);
  // Wise mind: finishing a practice (markPracticed) logs a rep.
  assert.match(cypher, /PracticeSkill \{id: "wise_mind"\}\)\nSET k\.name = "Wise mind",[\s\S]*?k\.defaultFor = \["wise-mind"\]/);
  assert.match(cypher, /PracticeSkill \{id: "wise_mind"\}\), \(c:TherapyConcept \{id: "dbt_wise_mind"\}\)/);
});

test("no PracticeSkill DELETE is unscoped (Recover's reload used to strip every module's links)", () => {
  for (const f of LOAD_ORDER) {
    for (const s of splitStatements(readFileSync(`schema/${f}`, "utf8"))) {
      if (/PracticeSkill\)-\[r:[A-Z_|]+\]->\(\)/.test(s) && /DELETE r/.test(s)) {
        assert.match(s, /WHERE k\.id IN \[/, `${f}: ${s.slice(0, 120)}`);
      }
    }
  }
  const recover = readFileSync("schema/invalidation-recovery.cypher", "utf8");
  const scoped = recover.match(/MATCH \(k:PracticeSkill\)-\[r:PRACTICES\|SUPPORTED_BY\]->\(\) WHERE k\.id IN (\[[^\]]*\]) DELETE r;/);
  assert.ok(scoped, "Recover's DELETE is scoped");
  const ids = JSON.parse(scoped[1]);
  assert.ok(!ids.includes("urge_surf") && !ids.includes("problem_solve"));
  assert.ok(ids.includes("sigh") && ids.includes("must_prefer"));
});
