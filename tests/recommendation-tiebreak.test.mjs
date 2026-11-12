// rf-v2.1 (Claudia, 5 Oct 2026; ported from #47's routing half, 12 Nov 2026): a pattern tie goes to the
// person's words instead of candidate order, and each discriminating answer's weight is a policy knob
// (answerWeight, kept at 2). Run end to end over the schema fixture through the real handler.
import test from "node:test";
import assert from "node:assert/strict";
import { importTs } from "./lib/importTs.mjs";
import { graph, rawGraph, withPolicyOn, fixtureDeps } from "./lib/recommendationFixture.mjs";

const { getStateAndToolsHandler, reachFor, NO_REACH } = await importTs("functions/src/recommendation/handler.ts");
const scoring = await importTs("functions/src/recommendation/patternScoring.ts");
const { toRoutingPolicy } = await importTs("functions/src/recommendation/queries.ts");

const on = withPolicyOn(graph);
const run = (input, g = on) => getStateAndToolsHandler(input, fixtureDeps(g));
const ans = (...ids) => ids.map((responseId) => ({ questionId: "q", responseId }));

test("a tie goes to the person's words; without the policy's tieBreak, candidate order as before", () => {
  const scores = { acute_alarm: 0.3, chronic_vigilance: 0.1 + 0.2 };
  const words = { acute_alarm: 0.55, chronic_vigilance: 0.35 };
  assert.equal(scoring.rankPatterns(scores, words).primaryId, "acute_alarm", "within epsilon is a tie; the words favour alarm");
  assert.equal(scoring.rankPatterns({ a: 0.25, b: 0.25 }, { a: 0, b: 0.1 }).primaryId, "b");
  assert.equal(scoring.rankPatterns({ a: 0.25, b: 0.25 }).primaryId, "a", "no tie-break: candidate order (pre-rf-v2.1, kill switch)");
  assert.equal(scoring.rankPatterns({ a: 0.3, b: 0.25 }, { a: 0, b: 1 }).primaryId, "a", "the words only break ties");
  assert.equal(scoring.rankPatterns({ a: 0.25, b: 0.25 }, { a: 0.1, b: 0.1 }).primaryId, "a", "a tie in the words too: candidate order");
});

test("only the top tie: the runner-up is picked as before, so an answer's signal alongside still filters", async () => {
  assert.deepEqual(Object.values(scoring.rankPatterns({ a: 1, b: 0.5, c: 0.5 }, { a: 0, b: 0, c: 1 })).slice(0, 3), ["a", 1, "b"]);
  // Guilty + "I can't tell what my body feels": dissociation (the answer) ties rumination (the word) for second.
  const r = await run({ quadrant: "low-unpleasant", emotions: ["Guilty"], discriminatingAnswers: ans("lu_body_unclear") });
  assert.equal(r.pattern.id, "conservation_freeze");
  assert.equal(r.secondaryPattern?.id, "dissociation_overmodulation");
  assert.ok(!r.tools.some((t) => t.id === "opposite-action"), "Do the Opposite stays filtered (dissociation alongside)");
});

test("with the switch off (no tie-break) the sort is exactly the old one, float noise included", () => {
  const noisy = { a: 0.3, b: 0.1 + 0.2 }; // 0.30000000000000004: a float hair apart
  assert.equal(scoring.rankPatterns(noisy).primaryId, "b", "no epsilon without tieBreak: the larger float wins, as before");
  assert.equal(scoring.rankPatterns(noisy, { a: 1, b: 0 }).primaryId, "a", "with tieBreak it's a tie, and the words decide");
});

test("scorePatternParts keeps the words' share apart; scorePatterns is its total", () => {
  const o = {
    candidates: ["a", "b"], emotionIds: ["x"],
    emotionRows: [{ patternId: "a", emotionId: "x", strength: "strong" }],
    responseRows: [{ patternId: "b", responseId: "r", weight: 0.5 }],
  };
  const p = scoring.scorePatternParts(o);
  assert.ok(Math.abs(p.wordScores.a - 0.7) < 1e-9);
  assert.equal(p.wordScores.b, 0, "answers never count as words");
  assert.ok(Math.abs(p.scores.b - p.scores.a + 0.7 - 1.0) < 1e-9, "the answer adds weight × 2 by default");
  assert.deepEqual(scoring.scorePatterns(o), p.scores);
  assert.ok(Math.abs(scoring.scorePatternParts({ ...o, answerWeight: 1.5 }).scores.b - (p.scores.b - 0.25)) < 1e-9);
});

test("totals add up bit for bit as before rf-v2.1 (the plain sort has no epsilon, so the kill switch needs it)", () => {
  // The pre-rf-v2.1 scorer, verbatim in its order of addition.
  const BONUS = (st) => (st.includes("strong") ? 0.3 : st.includes("moderate") ? 0.2 : 0.1);
  const old = (o) => {
    const s = {}; for (const p of o.candidates) s[p] = 0.25;
    const by = new Map();
    for (const r of o.emotionRows) { const e = by.get(r.patternId) ?? { w: new Set(), st: [] }; e.w.add(r.emotionId); e.st.push(r.strength); by.set(r.patternId, e); }
    for (const [p, e] of by) s[p] = (s[p] || 0) + (e.w.size / o.emotionIds.length) * 0.4 + BONUS(e.st);
    for (const r of o.responseRows) s[r.patternId] = (s[r.patternId] || 0) + r.weight * 2.0;
    return s;
  };
  // The reviewer's case: three words, a weak edge to dissociation, a strong one to low drive, "not sure".
  const o = {
    candidates: ["dissociation_overmodulation", "reward_drive_low"], emotionIds: ["a", "b", "c"],
    emotionRows: [{ patternId: "dissociation_overmodulation", emotionId: "a", strength: "weak" }, { patternId: "reward_drive_low", emotionId: "b", strength: "strong" }],
    responseRows: [{ patternId: "dissociation_overmodulation", weight: 0.25 }, { patternId: "reward_drive_low", weight: 0.15 }],
  };
  assert.deepEqual(scoring.scorePatterns(o), old(o));
  assert.equal(scoring.rankPatterns(scoring.scorePatterns(o)).primaryId, scoring.rankPatterns(old(o)).primaryId);
  for (let n = 1; n <= 7; n++) for (let k = 1; k <= n; k++) for (const st of ["weak", "moderate", "strong"]) for (const w of [0.1, 0.15, 0.25, 0.35, 0.4]) {
    const c = { candidates: ["p"], emotionIds: Array.from({ length: n }, (_, i) => `e${i}`),
      emotionRows: Array.from({ length: k }, (_, i) => ({ patternId: "p", emotionId: `e${i}`, strength: st })), responseRows: [{ patternId: "p", weight: w }] };
    assert.equal(scoring.scorePatterns(c).p, old(c).p, `${k}/${n} ${st} ${w}`);
  }
});

test("the policy turns the knobs on; off or missing is the pre-review scoring whole", () => {
  assert.deepEqual(reachFor(null), NO_REACH);
  assert.deepEqual(reachFor({ enabled: false, answerWeight: 1, tieBreak: "words" }), NO_REACH, "the kill switch ignores the knobs");
  assert.deepEqual(reachFor({ enabled: true, tieBreak: "words", answerWeight: 1.5 }),
    { aliases: true, highUnpleasantAnswers: true, answerWeight: 1.5, wordTieBreak: true });
  assert.equal(reachFor({ enabled: true }).answerWeight, 2);
  assert.equal(reachFor({ enabled: true }).wordTieBreak, false);
});

test("a bad answerWeight in the graph falls back to the default, never to 0", () => {
  const base = { version: "rf-v2.1", enabled: true };
  assert.equal(toRoutingPolicy({ ...base, answerWeight: 1.5 }).answerWeight, 1.5);
  for (const bad of [0, -1, 9, "x", null, undefined]) assert.equal(toRoutingPolicy({ ...base, answerWeight: bad }).answerWeight, undefined, String(bad));
  assert.equal(toRoutingPolicy({ ...base, tieBreak: "words" }).tieBreak, "words");
  assert.equal(toRoutingPolicy({ ...base, tieBreak: "other" }).tieBreak, undefined);
});

test("Claudia's 21:42 check-in: an exact alarm / vigilance tie, now decided by her alarm words", async () => {
  const input = {
    quadrant: "high-unpleasant",
    emotions: ["Rushed", "Pressured", "Stressed", "Busy", "Anxious", "Overwhelmed", "Angry", "Disrespected"],
    discriminatingAnswers: ans("hu_exp_alarm", "hu_body_tense"),
  };
  const r = await run(input);
  assert.equal(r.pattern.id, "acute_alarm");
  assert.equal(r.routing.version, "rf-v2.1");
  const candidates = scoring.candidatesFor("high-unpleasant", true);
  const emotionIds = input.emotions.map(scoring.normaliseEmotionId);
  const deps = fixtureDeps(on);
  const parts = scoring.scorePatternParts({
    candidates, emotionIds,
    emotionRows: await deps.emotionEvidence(candidates, emotionIds, true),
    responseRows: await deps.responseEvidence(candidates, ["hu_exp_alarm", "hu_body_tense"]),
  });
  assert.ok(Math.abs(parts.scores.acute_alarm - parts.scores.chronic_vigilance) < scoring.SCORE_EPSILON, "the tie is real at ×2");
  assert.ok(parts.wordScores.acute_alarm > parts.wordScores.chronic_vigilance, "and the words favour alarm");
});

test("answers stay ×2 in rf-v2.1 (×1.5 swapped 'My mind keeps looping' check-ins away from rumination)", async () => {
  assert.equal(rawGraph.routingPolicy.answerWeight, 2);
  assert.equal(rawGraph.routingPolicy.tieBreak, "words");
  const input = { quadrant: "low-unpleasant", emotions: ["Sad"], discriminatingAnswers: ans("lu_mind_looping") };
  assert.equal((await run(input)).pattern.id, "rumination_loop");
  const at15 = structuredClone(on); at15.routingPolicy.answerWeight = 1.5;
  assert.equal((await run(input, at15)).pattern.id, "reward_drive_low", "the knob works (and why it stays at 2)");
});
