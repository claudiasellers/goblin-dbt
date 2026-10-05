// Oct 2026 (Claudia): the spiral path's optional, direct self-harm question (schema/checkin-safety.cypher),
// the calm 988 line for flooding without a yes, and rf-v2.1's word tie-break. Run end to end over the
// schema fixture (tests/fixtures/recommendation-graph.json) through the real handler.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { graph, rawGraph, withPolicyOn, fixtureDeps } from "./lib/recommendationFixture.mjs";

const { getStateAndToolsHandler } = await importTs("functions/src/recommendation/handler.ts");
const scoring = await importTs("functions/src/recommendation/patternScoring.ts");
const safety = await importTs("functions/src/safety/checkinSafetyFlag.ts");
const banner = await importTs("src/lib/crisisBanner.ts");
const payload = await importTs("src/lib/spine/checkInPayload.ts");
const { SAFETY_LINE } = await importTs("src/components/safety/SafetyLine.tsx");

const on = withPolicyOn(graph);
const run = (input, g = on) => getStateAndToolsHandler(input, fixtureDeps(g));
const ans = (...ids) => ids.map((responseId) => ({ questionId: responseId.startsWith("hu_safety") ? "hu_safety_urge" : "q", responseId }));
const spiral = (...more) => ({ quadrant: "high-unpleasant", emotions: ["Let down", "Threatened"], discriminatingAnswers: ans("hu_exp_flooding", ...more) });
const read = (f) => readFileSync(f, "utf8");

// ── The graph ──

test("the question follows only the spiral answer, scores nothing, and only Yes / Not sure raise the flag", () => {
  assert.equal(rawGraph.triggersNext.hu_exp_flooding, "hu_safety_urge");
  assert.deepEqual(Object.entries(rawGraph.triggersNext).filter(([, q]) => q === "hu_safety_urge").map(([r]) => r), ["hu_exp_flooding"]);
  assert.equal(rawGraph.questionKinds.hu_safety_urge, "safety");
  assert.deepEqual(rawGraph.evidence.filter((e) => e.responseId.startsWith("hu_safety")), [], "safety answers never move the pattern");
  assert.deepEqual(Object.keys(rawGraph.raisesSafety).sort(), ["hu_safety_unsure", "hu_safety_yes"]);
  for (const flags of Object.values(rawGraph.raisesSafety)) assert.deepEqual(flags.map((f) => [f.id, f.type]), [["crisis_self_harm", "crisis"]]);
  assert.equal(rawGraph.safety.emotional_flooding[0].withoutSignal, "line");
  // No other pattern's flag changed.
  for (const [p, flags] of Object.entries(rawGraph.safety)) if (p !== "emotional_flooding") for (const f of flags) assert.equal(f.withoutSignal ?? null, null, p);
});

test("the schema file is MERGE-only, loads after what it needs, and the question is optional", () => {
  const src = read("schema/checkin-safety.cypher");
  assert.doesNotMatch(src, /\bCREATE \(/);
  const order = read("scripts/load-graph.mjs");
  const at = (f) => order.indexOf(`'${f}'`);
  assert.ok(at("relationships.cypher") < at("checkin-safety.cypher") && at("discriminating-questions.cypher") < at("checkin-safety.cypher"));
  assert.match(src, /required: false/);
});

// ── The engine ──

test("spiraling with no answer, No, or Skip: flooding with the calm line (level 'line'), cards still come", async () => {
  for (const input of [spiral(), spiral("hu_safety_no")]) {
    const r = await run(input);
    assert.equal(r.pattern.id, "emotional_flooding");
    assert.equal(r.safetyFlag.type, "crisis");
    assert.equal(r.safetyFlag.level, "line");
    assert.ok(r.tools.length > 0, "the line never replaces the tools");
  }
});

test("Yes or Not sure: the full crisis banner (no level), and the pattern is unchanged by the answer", async () => {
  for (const a of ["hu_safety_yes", "hu_safety_unsure"]) {
    const r = await run(spiral(a));
    assert.equal(r.pattern.id, "emotional_flooding", a);
    assert.deepEqual([r.safetyFlag.id, r.safetyFlag.type, r.safetyFlag.level], ["crisis_self_harm", "crisis", undefined], a);
    assert.ok(r.tools.length > 0, `${a}: the banner sits above the cards (R12)`);
  }
});

test("an explicit yes is never gated: with the routing switch off, in any quadrant, on any pattern", async () => {
  const off = await run(spiral("hu_safety_yes"), graph);
  assert.equal(off.safetyFlag?.type, "crisis", "policy off: high-unpleasant answers don't score, the yes still counts");
  assert.equal(off.safetyFlag?.level, undefined);
  const raised = rawGraph.raisesSafety.hu_safety_yes;
  assert.equal(safety.safetyFlagFor("low-unpleasant", [], raised)?.type, "crisis", "low-unpleasant is skipped for pattern flags, not for a yes");
  const alarm = await run({ quadrant: "high-unpleasant", emotions: ["Scared"], discriminatingAnswers: ans("hu_safety_yes") });
  assert.equal(alarm.pattern.id, "acute_alarm");
  assert.equal(alarm.safetyFlag?.type, "crisis", "a yes raises the banner whatever the pattern");
});

test("nothing else changed: no word alone, and no other answer, raises a flag of any level", async () => {
  const hu = rawGraph.questions["high-unpleasant"];
  assert.ok(hu.includes("hu_safety_urge"));
  for (const a of [...new Set(rawGraph.evidence.map((e) => e.responseId))].filter((id) => id !== "hu_exp_flooding")) {
    for (const w of ["Anxious", "Overwhelmed", "Humiliated", "Angry", "Tired", "Numb"]) {
      const q = a.startsWith("hu_") ? "high-unpleasant" : "low-unpleasant";
      const r = await run({ quadrant: q, emotions: [w], discriminatingAnswers: ans(a) });
      if (r.pattern.id !== "emotional_flooding") assert.equal(r.safetyFlag?.type === "crisis", false, `${w} + ${a}`);
    }
  }
});

// ── rf-v2.1 tie-break ──

test("rf-v2.1: a tie goes to the person's words; without the policy's tieBreak, candidate order as before", () => {
  const scores = { acute_alarm: 2.2, chronic_vigilance: 2.2000000000000002 };
  const words = { acute_alarm: 0.55, chronic_vigilance: 0.35 };
  assert.equal(scoring.rankPatterns(scores, words).primaryId, "acute_alarm", "within epsilon is a tie; the words favour alarm");
  assert.equal(scoring.rankPatterns({ a: 0.25, b: 0.25 }, { a: 0, b: 0.1 }).primaryId, "b");
  assert.equal(scoring.rankPatterns({ a: 0.25, b: 0.25 }).primaryId, "a", "no tie-break: candidate order (pre-rf-v2.1, kill switch)");
  assert.equal(scoring.rankPatterns({ a: 0.3, b: 0.25 }, { a: 0, b: 1 }).primaryId, "a", "the words only break ties");
});

test("Claudia's 21:42 check-in: an exact alarm / vigilance tie, now decided by her five alarm words", async () => {
  const input = {
    quadrant: "high-unpleasant",
    emotions: ["Rushed", "Pressured", "Stressed", "Busy", "Anxious", "Overwhelmed", "Angry", "Disrespected"],
    discriminatingAnswers: ans("hu_exp_alarm", "hu_body_tense"),
  };
  const r = await run(input);
  assert.equal(r.pattern.id, "acute_alarm");
  assert.equal(r.routing.version, "rf-v2.1");
  // The tie is real at ×2: the words decide it now, the list order did before.
  const parts = scoring.scorePatternParts({
    candidates: scoring.candidatesFor("high-unpleasant", true),
    emotionIds: input.emotions.map(scoring.normaliseEmotionId),
    emotionRows: await fixtureDeps(on).emotionEvidence(scoring.candidatesFor("high-unpleasant", true), input.emotions.map(scoring.normaliseEmotionId), true),
    responseRows: await fixtureDeps(on).responseEvidence(scoring.candidatesFor("high-unpleasant", true), ["hu_exp_alarm", "hu_body_tense"]),
  });
  assert.ok(Math.abs(parts.scores.acute_alarm - parts.scores.chronic_vigilance) < scoring.SCORE_EPSILON);
  assert.ok(parts.wordScores.acute_alarm > parts.wordScores.chronic_vigilance);
});

test("answers stay ×2 in rf-v2.1 (×1.5 swapped 18 'My mind keeps looping' check-ins away from rumination)", async () => {
  assert.equal(rawGraph.routingPolicy.answerWeight, 2);
  const r = await run({ quadrant: "low-unpleasant", emotions: ["Sad"], discriminatingAnswers: ans("lu_mind_looping") });
  assert.equal(r.pattern.id, "rumination_loop");
  const at15 = structuredClone(on); at15.routingPolicy.answerWeight = 1.5;
  assert.equal((await run({ quadrant: "low-unpleasant", emotions: ["Sad"], discriminatingAnswers: ans("lu_mind_looping") }, at15)).pattern.id,
    "reward_drive_low", "the knob works (and why it stays at 2)");
});

// ── The app ──

test("banner logic: level 'line' is the calm line everywhere the banner would be; no level stays the banner", () => {
  const line = { type: "crisis", level: "line" };
  assert.equal(banner.isCrisisFlag(line), false);
  assert.equal(banner.isSafetyLine(line), true);
  assert.equal(banner.isCrisisFlag({ type: "crisis" }), true, "a server from before `level` still gets the banner");
  assert.equal(banner.isCrisisFlag({ type: "crisis", level: "banner" }), true);
  assert.deepEqual(banner.resultSections({ variant: "standard", safetyFlag: line, patternId: "emotional_flooding", toolCount: 2 }),
    ["safety_line", "pattern", "tools", "done", "bailout"]);
  assert.deepEqual(banner.bailoutSections(line), ["safety_line", "micro_step"]);
  for (const f of ["src/components/checkin/StateResult.tsx", "src/components/checkin/LowEnergyStateResult.tsx"]) {
    const src = read(f);
    assert.match(src, /\{has\('safety_line'\) && <SafetyLine \/>\}/, f);
    assert.match(src, /bailoutSections\(safetyFlag\)\.includes\('safety_line'\) && <SafetyLine \/>/, f);
  }
  assert.match(read("src/pages/tools/DearMan.tsx"), /\{isSafetyLine\(stateResult\?\.safetyFlag\) && <SafetyLine \/>\}/);
});

test("the line keeps 988 one tap away and its copy passes the voice rules", () => {
  const src = read("src/components/safety/SafetyLine.tsx");
  assert.match(src, /href="tel:988"/);
  assert.match(src, /href="sms:988"/);
  const rules = JSON.parse(read("scripts/witness/voice-rules.json")).rules
    .filter((r) => ["no_cheer", "no_should", "no_minimising", "no_diagnosis", "no_physiology"].includes(r.id));
  const q = JSON.parse(read("src/data/content/discriminating-questions.json")).content["high-unpleasant"].find((x) => x.id === "hu_safety_urge");
  const copy = [SAFETY_LINE, q.text, q.subtext, ...q.responses.flatMap((r) => [r.label, r.subtext]).filter(Boolean)];
  for (const text of copy) for (const r of rules) assert.doesNotMatch(text, new RegExp(r.pattern, r.flags.replace("u", "")), `${r.id}: ${text}`);
});

test("the shipped question: after the spiral answer, kind 'safety', optional, no clinical notes", () => {
  const hu = JSON.parse(read("src/data/content/discriminating-questions.json")).content["high-unpleasant"];
  const q = hu.find((x) => x.id === "hu_safety_urge");
  assert.equal(q.kind, "safety");
  assert.equal(q.required, false);
  assert.deepEqual(q.responses.map((r) => r.id), ["hu_safety_yes", "hu_safety_unsure", "hu_safety_no"]);
  const spiralAnswer = hu.flatMap((x) => x.responses).find((r) => r.id === "hu_exp_flooding");
  assert.equal(spiralAnswer.triggersNextQuestionId, "hu_safety_urge");
  assert.ok(!/clinical|keyCitations/.test(JSON.stringify(q)));
  assert.equal(hu.find((x) => x.required)?.id, "hu_experience_quality", "the first question is still the first one shown");
});

test("Skip on a follow-up keeps the answers so far (skipping the safety question keeps 'I'm spiraling')", () => {
  const src = read("src/components/checkin/DiscriminatingQuestions.tsx");
  assert.match(src, /onClick=\{answers\.length > 0 \? \(\) => onComplete\(answers\) : onSkip\}/);
});

test("the safety answer goes to the engine and is never saved with the check-in", () => {
  const questions = [{ id: "hu_experience_quality" }, { id: "hu_safety_urge", kind: "safety" }];
  const answers = ans("hu_exp_flooding", "hu_safety_yes").map((a, i) => ({ ...a, questionId: i ? "hu_safety_urge" : "hu_experience_quality" }));
  const kept = payload.savedAnswers(answers, questions);
  assert.deepEqual(kept.map((a) => a.responseId), ["hu_exp_flooding"]);
  const req = payload.buildCheckInPayload({
    id: "3f2c9a0e-1b2c-4d5e-8f90-123456789abc", quadrant: "high-unpleasant", emotions: ["Let down"], intensity: null,
    bodySensations: [], note: "", startedAt: new Date("2026-10-05T19:00:00Z"), source: "grid", discriminatingAnswers: kept,
  }, null);
  assert.ok(!JSON.stringify(req).includes("hu_safety"), "no safety answer in the saved request");
  const ci = read("src/pages/CheckIn.tsx");
  assert.match(ci, /discriminatingAnswers: savedAnswers\(discriminatingAnswers, discriminatingQuestions\)/, "the saved state strips it");
  assert.match(ci, /discriminatingAnswers: discAnsw\.length > 0 \? discAnsw : undefined/, "the engine still gets every answer");
});
