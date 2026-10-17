// Cope Ahead's after card (docs/design/cope-ahead.md, "Today, afterwards"): the follow-up type and its
// chips, the card's words from cope-ahead.json, the plan line from the visit's ids, one resolve for both
// answers, the PracticeSkill. The server side is functions/test/unit/copeAheadAfter.test.cjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");
const A = await importTs("src/lib/copeAheadAfter.ts");
const P = await importTs("src/lib/copeAheadPlan.ts");
const W = await importTs("src/lib/spine/windows.ts");
const CA = JSON.parse(read("src/data/content/cope-ahead.json")).content;
const spine = JSON.parse(read("src/data/content/spine.json")).content;
const type = spine.followUpTypes.find((t) => t.id === "cope_ahead_after");

const plan = (o = {}) => ({ situationId: null, hardMomentId: null, hardMomentOwn: null, ifFrom: null, pullIds: [], moveIds: [], moveOwn: null, ...o });

test("the follow-up type: er, inline, the four when chips as ext.ca has them, stale like recover_log, in-tab only", () => {
  assert.ok(type, "spine.json carries the row");
  assert.equal(type.ownerModule, "er");
  assert.equal(type.resolveMode, "inline");
  assert.equal(type.enabled, true);
  assert.deepEqual(type.notify, { push: false, inTab: true, ics: false });
  const recoverLog = spine.followUpTypes.find((t) => t.id === "recover_log");
  assert.equal(type.staleAfterHours, recoverLog.staleAfterHours);
  assert.equal(type.missedPath, recoverLog.missedPath);
  assert.equal(type.notification, "A plan you made is ready.");
  // The chip ids are ext.ca's `when` values (functions/src/spine/extSchemas.ts) and the content's when ids.
  const ext = read("functions/src/spine/extSchemas.ts");
  const when = JSON.parse(/when: \{ t: 'one', of: (\[[^\]]*\]) \}/.exec(ext)[1].replace(/'/g, '"'));
  assert.deepEqual(W.chipsOf(type.window).sort(), [...when].sort());
  assert.deepEqual(CA.when.map((w) => w.id).sort(), [...when].sort());
  assert.deepEqual(type.window.chips, {
    today: { kind: "at_local", days: 0, time: "20:00" },
    tomorrow: { kind: "at_local", days: 1, time: "18:00" },
    this_week: { kind: "at_local", days: 4, time: "18:00" },
    later: { kind: "at_local", days: 7, time: "18:00" },
  });
  // The first question's choices: three resolve, It hasn't happened yet snoozes 24 h.
  assert.deepEqual(type.choices.map((c) => [c.id, c.status ?? null, c.snoozeHours ?? null]), [
    ["better", "done", null], ["as_expected", "done", null], ["harder", "done", null], ["not_yet", null, 24],
  ]);
  assert.deepEqual(A.HOW_CHOICES.map((c) => c.id), type.choices.map((c) => c.id), "the card's chips are the type's choices");
  // The server accepts the later window.
  assert.match(read("functions/src/spine/validation.ts"), /FOLLOW_UP_WINDOWS = \[[^\]]*'later'\]/);
});

test("afterScheduleItem: the chip's due time, the chip as the window", () => {
  const now = new Date(2026, 9, 17, 9, 0, 0);
  const at = (when) => new Date(A.afterScheduleItem(type, when, "f1", now).dueAt);
  assert.deepEqual([at("today").getDate(), at("today").getHours()], [17, 20]);
  assert.deepEqual([at("tomorrow").getDate(), at("tomorrow").getHours()], [18, 18]);
  assert.deepEqual([at("this_week").getDate(), at("this_week").getHours()], [21, 18]);
  assert.deepEqual([at("later").getDate(), at("later").getHours()], [24, 18]);
  const item = A.afterScheduleItem(type, "later", "f1", now);
  assert.equal(item.type, "cope_ahead_after");
  assert.equal(item.window, "later");
  assert.equal(A.afterScheduleItem(undefined, "today", "f1", now), null);
});

test("the card's words: cope-ahead.json's after lines, the situation's after name", () => {
  assert.ok(A.afterReady(CA));
  const c = A.afterCardCopy(CA, plan({ situationId: "conversation", hardMomentId: "go_blank", moveIds: ["long_out", "give_minute"] }));
  assert.equal(c.question, "How did the conversation go?");
  assert.deepEqual(c.how.map((x) => x.label), ["Better than I feared", "About what I expected", "Harder than I expected", "It hasn't happened yet"]);
  assert.equal(c.planQuestion, "Did your plan help?");
  assert.equal(c.planLine, "Your plan: If I go blank, I'll breathe out longer than in and say \"Give me a minute\".");
  assert.deepEqual(c.plan.map((x) => [x.id, x.label]), [["helped", "Used it, it helped"], ["unsure", "Used it, not sure"], ["unused", "Didn't use it"], [null, "Skip"]]);
  assert.equal(A.afterCardCopy(CA, plan({ situationId: "alone" })).question, "How did being on your own go?");
  assert.equal(A.afterCardCopy(CA, plan({ situationId: "hard_day" })).question, "How did the day go?");
});

test("a situation in the person's own words is \"it\" (never their words); no situation known, the same", () => {
  assert.equal(A.afterCardCopy(CA, plan({ situationId: "other" })).question, "How did it go?");
  assert.equal(A.afterCardCopy(CA, plan()).question, "How did it go?");
  assert.equal(A.afterCardCopy(CA, null).question, "How did it go?");
  assert.equal(A.afterCardCopy(CA, plan({ situationId: "gone" })).question, "How did it go?");
  // The plan's ids are all getToday sends: there is no situationOwn on the item (functions/src/spine/copeAheadAfter.ts).
  assert.doesNotMatch(read("src/services/spine.ts").match(/export interface CopeAheadPlanIds \{[\s\S]*?\n\}/)[0], /situationOwn|partId/);
});

test("the plan line on the card: own words in each slot, the pull, two moves; nothing composes, no line", () => {
  const line = (o) => A.afterCardCopy(CA, plan(o)).planLine;
  assert.equal(line({ hardMomentOwn: "Mum asks about work", moveOwn: "change the subject" }), "Your plan: If Mum asks about work, I'll change the subject.");
  assert.equal(line({ ifFrom: "pull", pullIds: ["blank"], hardMomentId: "go_blank", moveIds: ["feet"] }), "Your plan: If I start to shut down, I'll feel my feet on the floor.");
  assert.equal(line({ hardMomentId: "might_hurt", moveIds: ["leave_safe"] }), "Your plan: If they start to frighten me, I'll leave and get somewhere safe.");
  assert.equal(line({ hardMomentId: "go_blank", moveIds: ["gone"] }), null, "an id gone: no line, never an id");
  assert.equal(line({}), null);
  assert.equal(A.afterCardCopy(CA, null).planLine, null);
  // The same function the keep card and the rehearsal call.
  assert.equal(P.planLine(CA, { hardMomentId: "go_blank", moveIds: ["long_out"] }).text, "If I go blank, I'll breathe out longer than in.");
});

test("without every after line the card is Today's plain card", () => {
  const missing = { ...CA, after: { ...CA.after, after_plan_q: "" } };
  assert.equal(A.afterReady(missing), false);
  assert.equal(A.afterCardCopy(missing, plan()), null);
  const card = read("src/components/today/CopeAheadAfterCard.tsx");
  assert.match(card, /if \(!copy\) return <TodayCard item=\{item\} onDone=\{onDone\} compact=\{compact\} \/>;/);
});

test("the card: both answers in one resolve; It hasn't happened yet snoozes; leaving after the first sends it alone", () => {
  const card = read("src/components/today/CopeAheadAfterCard.tsx");
  assert.match(card, /if \(id === NOT_YET\) \{ void run\(\(\) => resolveFollowUp\(item\.id, NOT_YET\)\); return; \}/);
  assert.match(card, /pending\.current = id;\s+setFirst\(id\);/, "the first answer is held, not sent");
  assert.match(card, /void run\(\(\) => resolveCopeAheadAfter\(item\.id, first, helped\)/, "the second sends both");
  assert.match(card, /window\.addEventListener\('pagehide', flush\);\s+return \(\) => \{ window\.removeEventListener\('pagehide', flush\); flush\(\); \};/);
  assert.match(card, /void resolveCopeAheadAfter\(item\.id, how, null\)/, "leaving: the first alone");
  assert.match(card, /useEffect\(\(\) => \{ if \(first\) focusStepStart\(root\.current\); \}, \[first\]\);/, "focus to the second question");
  const svc = read("src/services/spine.ts");
  assert.match(svc, /await resolveFn\(\{ id, choiceId, \.\.\.\(planHelped \? \{ planHelped \} : \{\}\) \}\);/);
  const stack = read("src/components/today/TodayStack.tsx");
  assert.match(stack, /if \(item\.type === COPE_AHEAD_AFTER_TYPE\) return <CopeAheadAfterCard key=\{item\.id\} item=\{item\} onDone=\{done\} compact=\{compact\} \/>;/);
});

test("the PracticeSkill: Cope Ahead, Moderate, a completed visit is the rep", () => {
  const cy = read("schema/practice-spine.cypher");
  assert.match(cy, /PracticeSkill \{id: "cope_ahead"\}\)\nSET k\.name = "Cope Ahead", k\.displayLabel = "Cope Ahead", k\.evidenceGrade = "Moderate",[\s\S]*?k\.defaultFor = \["cope-ahead"\]/);
  assert.match(cy, /PracticeSkill \{id: "cope_ahead"\}\), \(c:TherapyConcept \{id: "dbt_cope_ahead"\}\)/);
});
