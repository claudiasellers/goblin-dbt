// PR-S3: tool-session validators, ext schemas (R18), the close-kind registry and its mirrors.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const v = await importTs("functions/src/spine/validation.ts");
const ext = await importTs("functions/src/spine/extSchemas.ts");
const tools = await importTs("functions/src/spine/tools.ts");
const close = await importTs("src/lib/spine/close.ts");

const ID = "3f2c9a0e-1b2c-4d5e-8f90-123456789abc";
const now = new Date();

test("types mirror: src/data/spineTypes.ts equals functions/src/spine/types.ts (after the header)", () => {
  const body = (f) => readFileSync(f, "utf8").split("\n").slice(5).join("\n");
  assert.equal(body("src/data/spineTypes.ts"), body("functions/src/spine/types.ts"));
});

test("every interactive tool declares its close; client and server registries agree", () => {
  const page = readFileSync("src/pages/ToolPage.tsx", "utf8");
  const block = page.slice(page.indexOf("const toolComponents"), page.indexOf("};", page.indexOf("const toolComponents")));
  // Hand-built pages, plus the tools the skill player plays (src/lib/skillRuntime/playerTools.ts).
  const played = readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8");
  const playedIds = [...played.slice(played.indexOf("PLAYER_TOOLS")).matchAll(/^\s*'([a-z-]+)': '/gm)].map((m) => m[1]);
  // A port keeps its old page in the tree until a follow-up deletes it (C8.4), so a tool can be in both lists.
  const components = [...new Set([...[...block.matchAll(/'([a-z-]+)':/g)].map((m) => m[1]), ...playedIds])];
  assert.equal(components.length, 24);
  for (const id of components) {
    assert.ok(tools.SPINE_TOOLS[id], `${id}: add it to functions/src/spine/tools.ts`);
    assert.ok(close.TOOL_CLOSE_KIND[id], `${id}: add it to src/lib/spine/close.ts`);
  }
  assert.deepEqual(close.TOOL_CLOSE_KIND, tools.SPINE_TOOLS);
  assert.equal(close.closeKindFor("pause"), "urge_change");
  assert.equal(close.dirFor("regulation_down"), "down");
  assert.equal(close.dirFor("orienting"), "orient");
  assert.equal(tools.thenVsNowDirFor("urge"), null);
});

test("startToolSession: tool and module come from the registry; reserved ids only from their entries", () => {
  const s = v.validateStart({ id: ID, toolId: "cool-down", entry: "checkin_result", checkInId: ID, module: "wmp" }, now);
  assert.deepEqual([s.module, s.closeKind, s.entry, s.checkInId], ["dt", "regulation_down", "checkin_result", ID]);
  assert.throws(() => v.validateStart({ id: "nope", toolId: "cool-down" }, now));
  assert.throws(() => v.validateStart({ id: ID, toolId: "made-up-tool" }, now), /Unknown tool/);
  assert.throws(() => v.validateStart({ id: ID, toolId: "cool-down", entry: "somewhere" }, now));
  assert.equal(v.validateStart({ id: ID, toolId: "micro-step", entry: "checkin_result" }, now).closeKind, "none");
  assert.throws(() => v.validateStart({ id: ID, toolId: "micro-step", entry: "tools" }, now), /entry/);
  assert.throws(() => v.validateStart({ id: ID, toolId: "help-now", entry: "checkin_result" }, now), /entry/);
  assert.equal(v.validateStart({ id: ID, toolId: "pause" }, now).entry, "direct");
});

test("closeToolSession: canonical answers only; the answer must be one the tool asks", () => {
  const c = v.validateClose({ id: ID, status: "completed", thenVsNow: "much_better", practiced: true, durationSec: 42 }, now, "regulation_down");
  assert.deepEqual([c.thenVsNow, c.practiced, c.durationSec, c.repSource], ["much_better", true, 42, "standalone"]);
  assert.throws(() => v.validateClose({ id: ID, status: "completed", thenVsNow: "much_quieter" }, now), "E2's old enum is gone (R3)");
  assert.throws(() => v.validateClose({ id: ID, status: "completed", thenVsNow: "better" }, now, "urge"));
  assert.throws(() => v.validateClose({ id: ID, status: "completed", actedOnUrge: "no" }, now, "orienting"));
  assert.equal(v.validateClose({ id: ID, status: "exited_early", actedOnUrge: "not_yet" }, now, "urge").actedOnUrge, "not_yet");
  assert.throws(() => v.validateClose({ id: ID, status: "open" }, now), "close status is completed | exited_early");
  assert.throws(() => v.validateClose({ id: ID, status: "completed", durationSec: -1 }, now));
  assert.throws(() => v.validateClose({ id: ID, status: "completed", detail: { kind: "journal", id: ID } }, now));
  assert.deepEqual(v.validateClose({ id: ID, status: "completed", detail: { kind: "dear_man", id: ID } }, now).detail, { kind: "dear_man", id: ID });
});

test("ext (R18): namespaced, ids/enums only, integers only on *Sec / *Count, ≤ 4 KB", () => {
  assert.equal(ext.validateExt(undefined), null);
  assert.equal(ext.validateExt({ dt: {} }), null);
  assert.deepEqual(JSON.parse(ext.validateExt({ dt: { techniqueId: "cold-water" } })), { dt: { techniqueId: "cold-water" } });
  assert.deepEqual(JSON.parse(ext.validateExt({ er: { handoffs: [{ primitiveId: "sigh", completed: true, durationSec: 40 }] } })).er.handoffs[0].durationSec, 40);
  assert.throws(() => ext.validateExt({ zz: {} }), /unknown namespace/);
  assert.throws(() => ext.validateExt({ dt: { mood: "sad" } }), /not registered/);
  assert.throws(() => ext.validateExt({ dt: { techniqueId: 7 } }), /expected an id/, "no numbers (no scales)");
  assert.throws(() => ext.validateExt({ dt: { techniqueId: "I felt awful today" } }), /expected an id/, "no free text");
  assert.throws(() => ext.validateExt({ er: { handoffs: Array(5).fill({ primitiveId: "sigh" }) } }), /up to 4/);
  const big = { core: { routing: { slot: "a".repeat(64), ruleId: "b".repeat(64) }, microStepId: "c".repeat(64), patternId: "d".repeat(64), activityId: "e".repeat(64) } };
  assert.ok(ext.validateExt(big).length < 4096);
  // An integer field on a key not ending in Sec/Count is refused even if registered.
  ext.EXT_SCHEMAS.mf.intensity = { t: "int", max: 10 };
  try { assert.throws(() => ext.validateExt({ mf: { intensity: 7 } }), /Sec \/ \*Count/); } finally { delete ext.EXT_SCHEMAS.mf.intensity; }
});

test("ext wm: Wise mind's ids, and the person's own words on *Own keys only (≤ 140, never linted)", () => {
  const wm = {
    questionId: "wm_q_next", form: "minds", emotionSaysIds: ["wm_v_next_emotion_1"], reasonSaysIds: ["wm_v_next_reason_2"],
    practiceId: "wm_breath", feel: "pushed", onceMore: true, nextToolId: "dear-man", kept: true,
    partIds: ["p1", "p2"], stillCloseIds: ["p2"],
  };
  assert.deepEqual(JSON.parse(ext.validateExt({ wm })).wm, wm);
  const own = JSON.parse(ext.validateExt({ wm: { questionOwn: " Whether to\nmove out ", answerOwn: "x".repeat(140), emotionSaysOwn: "Run.", reasonSaysOwn: "Stay put." } })).wm;
  assert.equal(own.questionOwn, "Whether to move out");
  assert.equal(own.answerOwn.length, 140);
  assert.throws(() => ext.validateExt({ wm: { answerOwn: "x".repeat(141) } }), /1 to 140/);
  assert.throws(() => ext.validateExt({ wm: { answerOwn: " \n " } }), /1 to 140/);
  assert.throws(() => ext.validateExt({ wm: { answerOwn: 7 } }), /1 to 140/);
  for (const key of ["questionId", "practiceId", "feel", "nextToolId"]) {
    assert.throws(() => ext.validateExt({ wm: { [key]: "wait, not now" } }), /expected an id/, `${key}: no free text`);
  }
  assert.throws(() => ext.validateExt({ wm: { partNames: ["the critic"] } }), /not registered/, "parts are ids only");
  ext.EXT_SCHEMAS.mf.note = { t: "text", max: 10 };
  try { assert.throws(() => ext.validateExt({ mf: { note: "hi" } }), /\*Own keys/); } finally { delete ext.EXT_SCHEMAS.mf.note; }
});

test("ext ca: Cope Ahead's ids and closed sets, own words on *Own keys only (situation and moment ≤ 140, move ≤ 90, never linted)", () => {
  const ca = {
    situationId: "conversation", when: "this_week", feelIds: ["anxious", "hurt"], pullIds: ["blank"], partId: "p1",
    hardMomentId: "go_blank", ifFrom: "pull", moveIds: ["long_out", "give_minute"], rehearsed: 2, newMomentId: "not_heard",
    newMoveIds: ["step_out"], settle: "five_senses", kept: true, followUp: true,
  };
  assert.deepEqual(JSON.parse(ext.validateExt({ ca })).ca, ca);
  const own = JSON.parse(ext.validateExt({ ca: { situationOwn: " My sister's\nwedding ", hardMomentOwn: "x".repeat(140), moveOwn: "y".repeat(90), newMomentOwn: "z", newMoveOwn: "w" } })).ca;
  assert.equal(own.situationOwn, "My sister's wedding");
  assert.equal(own.hardMomentOwn.length, 140);
  assert.throws(() => ext.validateExt({ ca: { situationOwn: "x".repeat(141) } }), /1 to 140/);
  assert.throws(() => ext.validateExt({ ca: { hardMomentOwn: "x".repeat(141) } }), /1 to 140/);
  assert.throws(() => ext.validateExt({ ca: { moveOwn: "x".repeat(91) } }), /1 to 90/);
  assert.throws(() => ext.validateExt({ ca: { rehearsed: 3 } }), /one of 1, 2/, "rehearsed is 1 or 2");
  assert.throws(() => ext.validateExt({ ca: { rehearsed: "2" } }), /one of 1, 2/);
  assert.throws(() => ext.validateExt({ ca: { settle: "nap" } }), /one of breath, five_senses, ok/);
  assert.throws(() => ext.validateExt({ ca: { ifFrom: "both" } }), /one of moment, pull/);
  assert.throws(() => ext.validateExt({ ca: { when: "next_year" } }), /one of/);
  assert.throws(() => ext.validateExt({ ca: { feelIds: ["a", "b", "c"] } }), /up to 2/);
  assert.throws(() => ext.validateExt({ ca: { moveIds: ["a", "b", "c"] } }), /up to 2/);
  assert.throws(() => ext.validateExt({ ca: { hardMomentId: "they raise their voice" } }), /expected an id/, "no free text");
  assert.throws(() => ext.validateExt({ ca: { plan: "If I go blank" } }), /not registered/, "the plan line is never stored, only its parts");
  assert.deepEqual(tools.SPINE_TOOLS["cope-ahead"], { module: "er", closeKind: "none" });
});

test("close: wiseMindAnswer is an id (ask-fresh, on the session only)", () => {
  assert.equal(v.validateClose({ id: ID, status: "completed", wiseMindAnswer: "wm_a_wait" }, now, "orienting").wiseMindAnswer, "wm_a_wait");
  assert.equal(v.validateClose({ id: ID, status: "completed" }, now, "orienting").wiseMindAnswer, null);
  assert.throws(() => v.validateClose({ id: ID, status: "completed", wiseMindAnswer: "Wait, not now" }, now, "orienting"));
  const src = readFileSync("functions/src/spine/toolSession.ts", "utf8");
  assert.match(src, /wiseMindAnswer: rec\.get\('toolId'\) === 'wise-mind' \? c\.wiseMindAnswer : null/, "another tool's answer is dropped");
  assert.ok(!tools.NOT_WHAT_HELPS.includes("wise-mind"), "a More here after Wise mind counts toward what helps");
});

test("ext er: Problem Solve keeps what got in the way as ids (parts data fix 2)", () => {
  const er = { barrierTypeId: "know-but-cant", barrierSubId: "cant-ambivalent", ambivalenceId: "ambiv-change-might-not-help", confidence: "low" };
  assert.deepEqual(JSON.parse(ext.validateExt({ er })).er, er);
  for (const key of Object.keys(er)) {
    assert.throws(() => ext.validateExt({ er: { [key]: "part of me doesn't want this to change" } }), /expected an id/, `${key}: no free text`);
    assert.throws(() => ext.validateExt({ er: { [key]: "a".repeat(65) } }), /expected an id/, `${key}: ≤ 64 chars`);
    assert.throws(() => ext.validateExt({ er: { [key]: 3 } }), /expected an id/, `${key}: no numbers`);
  }
  assert.throws(() => ext.validateExt({ er: { barrierText: "x" } }), /not registered/);
});

test("ext er: Do the Opposite keeps the check's result as ids (parts data fix 3)", () => {
  const er = { oaFacts: "fits", oaEffect: "helpful", oaRoute: "problem" };
  assert.deepEqual(JSON.parse(ext.validateExt({ er })).er, er);
  assert.deepEqual(JSON.parse(ext.validateExt({ er: { oaRoute: "support" } })).er, { oaRoute: "support" });
  // Recheck / Previous send nulls: dropped, and nothing left is no ext at all.
  assert.equal(ext.validateExt({ er: { oaFacts: null, oaEffect: null, oaRoute: null } }), null);
  for (const key of Object.keys(er)) {
    assert.throws(() => ext.validateExt({ er: { [key]: "it fits the facts, mostly" } }), /expected an id/, `${key}: no free text`);
    assert.throws(() => ext.validateExt({ er: { [key]: "a".repeat(65) } }), /expected an id/, `${key}: ≤ 64 chars`);
    assert.throws(() => ext.validateExt({ er: { [key]: 2 } }), /expected an id/, `${key}: no numbers`);
  }
  assert.throws(() => ext.validateExt({ er: { oaUrgeText: "x" } }), /not registered/);
  assert.throws(() => ext.validateExt({ er: { oaSafety: "safe" } }), /not registered/);
});

test("ext wmp: the angry-part card in Recover keeps the hurt, the hold and where it ended, as ids", () => {
  const wmp = { angryHurtId: "brushed_off", angryVoteHeld: true, angryExit: "speak" };
  assert.deepEqual(JSON.parse(ext.validateExt({ wmp })).wmp, wmp);
  // Not sure: no hurt id at all; Not now: skipped, nothing held.
  assert.deepEqual(JSON.parse(ext.validateExt({ wmp: { angryHurtId: undefined, angryVoteHeld: false, angryExit: "skipped" } })).wmp,
    { angryVoteHeld: false, angryExit: "skipped" });
  for (const key of ["angryHurtId", "angryExit"]) {
    assert.throws(() => ext.validateExt({ wmp: { [key]: "I felt brushed off" } }), /expected an id/, `${key}: no free text`);
    assert.throws(() => ext.validateExt({ wmp: { [key]: "a".repeat(65) } }), /expected an id/, `${key}: ≤ 64 chars`);
    assert.throws(() => ext.validateExt({ wmp: { [key]: 1 } }), /expected an id/, `${key}: no numbers`);
  }
  assert.throws(() => ext.validateExt({ wmp: { angryVoteHeld: "yes" } }), /expected a boolean/);
  assert.throws(() => ext.validateExt({ wmp: { angryVoteHeld: 1 } }), /expected a boolean/);
  assert.throws(() => ext.validateExt({ wmp: { angrySpeakLine: "I felt brushed off." } }), /not registered/);
  // "Spend a minute with it later?" taken (parts on): a bool, never the candidate's id or text.
  assert.deepEqual(JSON.parse(ext.validateExt({ wmp: { angryLater: true } })).wmp, { angryLater: true });
  assert.throws(() => ext.validateExt({ wmp: { angryLater: "yes" } }), /expected a boolean/);
});

test("close: emotion ids picked in the tool are ids only, at most 20; none given is []", () => {
  assert.deepEqual(v.validateClose({ id: ID, status: "completed", emotionIds: ["hurt", "anxious", "hurt"] }, now).emotionIds, ["hurt", "anxious"]);
  assert.deepEqual(v.validateClose({ id: ID, status: "completed" }, now).emotionIds, []);
  assert.throws(() => v.validateClose({ id: ID, status: "completed", emotionIds: ["I feel awful"] }, now));
  assert.throws(() => v.validateClose({ id: ID, status: "completed", emotionIds: Array.from({ length: 21 }, (_, i) => `e${i}`) }, now));
  assert.throws(() => v.validateClose({ id: ID, status: "completed", emotionIds: "hurt" }, now));
  assert.deepEqual(v.validateStart({ id: ID, toolId: "problem-solve", emotionIds: ["hurt"] }, now).emotionIds, ["hurt"]);
});

test("record = start + close with the registry's close kind", () => {
  const { start, close: c } = v.validateRecord({ id: ID, toolId: "guided-activity", entry: "checkin_result", status: "exited_early", ext: { core: { activityId: "shake-out" } } }, now);
  assert.equal(start.toolId, "guided-activity");
  assert.equal(c.status, "exited_early");
  assert.equal(JSON.parse(c.ext).core.activityId, "shake-out");
  assert.throws(() => v.validateRecord({ id: ID, toolId: "micro-step", entry: "checkin_result", status: "completed", thenVsNow: "better" }, now));
});

test("close question: the tool's own wording wins; kinds that don't ask get none", () => {
  const content = { kinds: { urge: { question: "Q", choices: [] }, regulation_down: { question: "D", choices: [] } },
    byTool: { pause: { urge: { question: "P", choices: [] } } }, skip: "Skip", saved: "Noted." };
  assert.equal(close.closeQuestion(content, "pause", "urge").question, "P");
  assert.equal(close.closeQuestion(content, "urge-surfing", "urge").question, "Q");
  assert.equal(close.closeQuestion(content, "cool-down", "none"), null);
  assert.equal(close.closeQuestion(content, "problem-solve", "plan"), null);
  assert.equal(close.durationSec(0, 90_400), 90);
  assert.equal(close.durationSec(10, 0), 0);
});

test("the five silent tools use the session and render the close on completion", () => {
  for (const f of ["FiveSenses", "Pause", "UrgeSurfing"]) {
    const src = readFileSync(`src/pages/tools/${f}.tsx`, "utf8");
    assert.match(src, /useToolSession\(\)/, f);
    assert.match(src, /markComplete\(\)/, f);
    assert.match(src, /<SessionClose \/>/, f);
    assert.match(src, /markPracticed\(\)/, f);
  }
  // Circuit Breaker (cool-down) asks its own check-in and closes the session with the answer.
  const cb = readFileSync("src/pages/tools/CoolDown.tsx", "utf8");
  assert.match(cb, /useToolSession\(\)/);
  assert.match(cb, /markPracticed\(\)/);
  assert.match(cb, /markComplete\(\)/);
  assert.match(cb, /session\.close\(\{ status: 'completed', thenVsNow/);
  const ps = readFileSync("src/pages/tools/ProblemSolve.tsx", "utf8");
  assert.match(ps, /useToolSession\(\)/);
  assert.match(ps, /session\.markComplete\(\)/);
  const page = readFileSync("src/pages/ToolPage.tsx", "utf8");
  assert.match(page, /<ToolSessionProvider key=\{location\.key\} toolId=\{tool\.id\} deferStart=\{!!tool\.deferSession\}>/);
  assert.doesNotMatch(page, /trackToolUsage\(/, "startToolSession writes the compat ToolUsage");
});

test("two-part close (urge_change, plan R7): the urge question, then then-vs-now down; both answers accepted", () => {
  const content = { kinds: { urge: { question: "Q", choices: [] }, regulation_down: { question: "D", choices: [] } },
    byTool: { pause: { regulation_down: { question: "PD", choices: [] } } }, skip: "Skip", saved: "Noted." };
  assert.equal(close.closeQuestion(content, "x", "urge_change").question, "Q");
  assert.equal(close.secondCloseQuestion(content, "x", "urge_change").question, "D");
  assert.equal(close.secondCloseQuestion(content, "pause", "urge_change").question, "PD");
  assert.equal(close.secondCloseQuestion(content, "x", "urge"), null, "a one-part kind has no second question");
  assert.ok(close.asksAtClose("urge_change"));
  assert.equal(close.dirFor("urge_change"), "down");
  assert.equal(tools.thenVsNowDirFor("urge_change"), "down");
  const now = new Date();
  const c = v.validateClose({ id: ID, status: "completed", actedOnUrge: "no", thenVsNow: "better" }, now, "urge_change");
  assert.equal(c.actedOnUrge, "no");
  assert.equal(c.thenVsNow, "better");
  assert.throws(() => v.validateClose({ id: ID, status: "completed", actedOnUrge: "no" }, now, "regulation_down"));
});

test("every chip a follow-up window offers is a window the server accepts (scheduleFollowUp)", async () => {
  const { FOLLOW_UP_WINDOWS } = await importTs("functions/src/spine/validation.ts");
  const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
  const bad = spine.followUpTypes.flatMap((t) => (t.window?.kind === "chip" ? Object.keys(t.window.chips) : [])
    .filter((c) => !FOLLOW_UP_WINDOWS.includes(c)).map((c) => `${t.id}.${c}`));
  assert.deepEqual(bad, [], "a chip the server refuses never schedules (the person only sees 'didn't save')");
});
