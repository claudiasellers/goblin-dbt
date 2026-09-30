// PR-C1: the saveCheckIn request built from check-in state (src/lib/spine/checkInPayload.ts),
// tool link state, and the check-in validator on the server (functions/src/checkin/validation.ts).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const p = await importTs("src/lib/spine/checkInPayload.ts");
const link = await importTs("src/lib/spine/toolLink.ts");
const v = await importTs("functions/src/checkin/validation.ts");

const ID = "3f2c9a0e-1b2c-4d5e-8f90-123456789abc";
const state = (o = {}) => ({ id: ID, quadrant: "high-unpleasant", emotions: ["Anxious", "Overwhelmed"], intensity: null,
  bodySensations: [], note: "", startedAt: new Date("2026-10-01T10:00:00Z"), source: "grid", ...o });
const result = (o = {}) => ({ pattern: { id: "acute_alarm", confidence: 0.4 }, tools: [{ id: "cool-down" }, { id: "opposite-action" }, { id: "extra" }], ...o });

test("display names become emotion ids; unknown names are dropped; suggestion ids pass through", () => {
  assert.deepEqual(p.emotionIdsFor(["Anxious", "Not A Feeling", "overwhelm"]), ["anxious", "overwhelm"]);
  assert.deepEqual(p.emotionIdsFor([], ["hurt"]), ["hurt"]);
});

test("result render: every result field, ≤2 rendered tools, legacy fields kept", () => {
  const r = p.buildCheckInPayload(state(), result({ secondaryPattern: { id: "chronic_vigilance" },
    coOccurrence: { clinicalLabel: "Alarm + vigilance" }, guidedActivity: { activityId: "shake-out" } }));
  assert.equal(r.id, ID);
  assert.equal(r.emotion, "Anxious, Overwhelmed");
  assert.deepEqual(r.intensity, { x: 0.5, y: 0.5 });
  assert.equal(r.timestamp, "2026-10-01T10:00:00.000Z");
  assert.deepEqual(r.emotionIds, ["anxious", "overwhelmed"]);
  assert.equal(r.resultShown, true);
  assert.equal(r.activationPatternId, "acute_alarm");
  assert.deepEqual(r.recommendedToolIds, ["cool-down", "opposite-action"]);
  assert.equal(r.secondaryPatternId, "chronic_vigilance");
  assert.equal(r.coOccurrenceLabel, "Alarm + vigilance");
  assert.equal(r.guidedActivityId, "shake-out");
  assert.ok(!("safetyFlagId" in r) && !("nextAction" in r));
});

test("crisis banner results are saved like any other, with safetyFlagId (no crisis_screen next action)", () => {
  const r = p.buildCheckInPayload(state(), result({ safetyFlag: { id: "crisis_flooding", type: "crisis" } }));
  assert.equal(r.safetyFlagId, "crisis_flooding");
  assert.deepEqual(r.recommendedToolIds, ["cool-down", "opposite-action"], "banner + cards");
  assert.ok(!("nextAction" in r));
  const clinical = p.buildCheckInPayload(state(), result({ safetyFlag: { id: "clinical_referral_x", type: "clinical_referral" } }));
  assert.ok(!("safetyFlagId" in clinical), "only the banner flag is recorded");
});

test("FTF source keeps the band as a capacity reading and the word id", () => {
  const reading = p.ftfReading("11111111-1b2c-4d5e-8f90-123456789abc", "flooded", new Date("2026-10-01T10:00:00Z"));
  const r = p.buildCheckInPayload(state({ source: "ftf", emotions: ["Hurt"], emotionIds: ["hurt"], capacity: reading }), result());
  assert.equal(r.source, "ftf");
  assert.deepEqual(r.emotionIds, ["hurt"]);
  assert.deepEqual(r.capacity, { id: reading.id, value: "flooded", viaCantTell: false, source: "ftf", framing: "now",
    wording: "default", context: "checkin", probeVersion: "capacity-v1", at: "2026-10-01T10:00:00.000Z" });
});

test("analysis failure saves without a pattern; discriminating answers flatten; next action inline", () => {
  const r = p.buildCheckInPayload(state({ discriminatingAnswers: [{ questionId: "q", responseId: "r" }] }), null, { kind: "done" });
  assert.ok(!("resultShown" in r) && !("activationPatternId" in r));
  assert.deepEqual(r.discriminatingAnswers, [{ questionId: "q", responseId: "r" }]);
  assert.deepEqual(r.nextAction, { kind: "done" });
  const partial = p.buildCheckInPayload(state(), result(), { kind: "activity_partial", activityId: "shake-out" });
  assert.deepEqual(partial.nextAction, { kind: "activity_partial", activityId: "shake-out" });
});

test("tool links keep the legacy state and add spine.checkInId", () => {
  assert.deepEqual(link.fromCheckIn(ID, ["Anxious"], "acute_alarm"),
    { checkinEmotions: ["Anxious"], activationPatternId: "acute_alarm", spine: { entry: "checkin_result", checkInId: ID } });
  assert.deepEqual(link.spineFrom({ spine: { entry: "checkin_result", checkInId: ID } }), { entry: "checkin_result", checkInId: ID, hostSessionId: undefined, followUpId: undefined });
  assert.equal(link.spineFrom(null), null);
  assert.equal(link.spineFrom({ spine: { checkInId: ID } }), null);
});

test("server validator: only the quadrant (and legacy emotion) is required; bad optional fields drop", () => {
  const now = new Date();
  const out = v.validateSaveCheckIn({ emotion: "x", quadrant: "low-unpleasant", id: "not-a-uuid", source: "nope",
    recommendedToolIds: ["pause", "BAD ID", "cool-down", "five-senses"], nextAction: { kind: "tool" }, confidence: 7,
    discriminatingAnswers: [{ questionId: "q1" }, { questionId: "q2", responseId: "r2" }] }, now);
  assert.equal(out.id, null);
  assert.equal(out.source, null);
  assert.deepEqual(out.recommendedToolIds, ["pause", "cool-down"]);
  assert.equal(out.nextAction, null);
  assert.equal(out.confidence, null);
  assert.deepEqual([out.discQuestionIds, out.discResponseIds], [["q2"], ["r2"]]);
  assert.throws(() => v.validateSaveCheckIn({ emotion: "x" }, now));
  assert.throws(() => v.validateSaveCheckIn({ emotion: "x", quadrant: "diagonal" }, now));
  assert.deepEqual(v.parseNextAction({ kind: "tool", toolId: "cool-down" }), { kind: "tool", toolId: "cool-down" });
  assert.equal(v.parseNextAction({ kind: "crisis_screen" }), null, "no crisis_screen kind (plan §10 amendment)");
  assert.deepEqual(v.nextActionParams({ kind: "micro_step", microStepId: "x" }), { nextKind: "micro_step", nextToolId: null });
});

test("server validator: an implausible client timestamp falls back to the server clock", () => {
  const now = new Date("2026-10-01T12:00:00.000Z");
  const at = (ts) => v.validateSaveCheckIn({ emotion: "x", quadrant: "low-unpleasant", timestamp: ts }, now).timestamp;
  assert.equal(at("2026-10-01T11:40:00.000Z"), "2026-10-01T11:40:00.000Z");
  assert.equal(at("2026-09-30T20:00:00.000Z"), null, "older than 12 h (a check-in screen left open all day)");
  assert.equal(at("2026-10-01T12:30:00.000Z"), null, "in the future");
  assert.equal(at("1970-01-01T00:00:00.000Z"), null);
});

test("both result screens render the arrow as a character, not the literal \\\\u2192 (F13)", () => {
  // E4-4: both screens render their cards through RecommendationCards, which builds the link state.
  for (const f of ["src/components/checkin/StateResult.tsx", "src/components/checkin/LowEnergyStateResult.tsx", "src/components/checkin/RecommendationCards.tsx"]) {
    const src = readFileSync(f, "utf8");
    assert.doesNotMatch(src, />\\u2192</, f);
  }
  assert.match(readFileSync("src/components/checkin/RecommendationCards.tsx", "utf8"), /fromCheckIn\(checkInId/);
});
