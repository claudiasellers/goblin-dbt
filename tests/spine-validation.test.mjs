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
  const components = [...block.matchAll(/'([a-z-]+)':/g)].map((m) => m[1]);
  assert.equal(components.length, 9);
  for (const id of components) {
    assert.ok(tools.SPINE_TOOLS[id], `${id}: add it to functions/src/spine/tools.ts`);
    assert.ok(close.TOOL_CLOSE_KIND[id], `${id}: add it to src/lib/spine/close.ts`);
  }
  assert.deepEqual(close.TOOL_CLOSE_KIND, tools.SPINE_TOOLS);
  assert.equal(close.closeKindFor("pause"), "urge");
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
  assert.match(page, /<ToolSessionProvider key=\{location\.key\} toolId=\{tool\.id\}>/);
  assert.doesNotMatch(page, /trackToolUsage\(/, "startToolSession writes the compat ToolUsage");
});
