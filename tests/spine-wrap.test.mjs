// PR-S4: the four existing session types wrapped in the spine (src/lib/spine/wrap.ts + tool wiring).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { followUpTypes } from "./lib/practiceSpine.mjs";

const wrap = await importTs("src/lib/spine/wrap.ts");
const content = { followUpTypes: followUpTypes().map((t) => ({ id: t.id, enabled: t.enabled, window: t.content.window })) };

test("Recover's three follow-ups become scheduled follow-ups at the D-09 windows", () => {
  const now = new Date(2026, 9, 1, 12, 0, 0);
  const s = wrap.recoverSchedule(["tomorrow", "rehearse", "experiment", "bogus"], content, now);
  assert.deepEqual(s.map((x) => x.type), ["recover_next_day", "recover_rehearse", "recover_log"]);
  const d = s.map((x) => new Date(x.dueAt));
  assert.deepEqual([d[0].getDate(), d[0].getHours()], [2, 10]);
  assert.deepEqual([d[1].getDate(), d[1].getHours()], [3, 18]);
  assert.deepEqual([d[2].getDate(), d[2].getHours()], [4, 18]);
  for (const x of s) assert.match(x.id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(wrap.recoverSchedule(["tomorrow"], null, now), [], "no content, no schedule (the close still links)");
});

test("reps: OA only when practised; DEAR MAN debrief is off-phone", () => {
  assert.equal(wrap.oaSkillIds("practiced"), undefined, "defaultFor → opposite");
  assert.deepEqual(wrap.oaSkillIds("planned"), []);
  assert.deepEqual(wrap.oaSkillIds("missed"), []);
  assert.equal(wrap.dearManRepSource("prep"), "standalone");
  assert.equal(wrap.dearManRepSource("debrief"), "followup_offphone");
});

test("each wrapped tool closes its session with its detail kind; FTF embeds inside the check-in", () => {
  const src = (f) => readFileSync(`src/pages/tools/${f}.tsx`, "utf8");
  assert.match(src("OppositeAction"), /detail: \{ kind: "opposite_action", id: fresh\.id \}/);
  assert.match(src("InvalidationRecovery"), /detail: \{ kind: 'invalidation_recovery', id: sessionId \}[\s\S]*skillIds: used[\s\S]*schedule: recoverSchedule/);
  assert.match(src("DearMan"), /detail: \{ kind: 'dear_man', id: savedId \}, repSource: dearManRepSource\('prep'\)/);
  assert.match(src("DearMan"), /repSource: dearManRepSource\('debrief'\)/);
  const ftf = src("FindTheFeeling");
  assert.match(ftf, /recordToolSession\(\{ id: embedId, toolId: 'find-the-feeling', entry: 'embedded'/);
  assert.match(ftf, /thenVsNowFromFtf\(state\.close\)/);
  assert.match(ftf, /state\.word \? \{\} : \{ skillIds: \[\] as string\[\] \}/, "a label rep only when a word was accepted");
  assert.match(readFileSync("src/pages/CheckIn.tsx", "utf8"), /embeddedToolSessionIds: embeddedIds/);
});
