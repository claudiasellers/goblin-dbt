// A5-2: witness ranking (functions/src/witness/rank.ts), request validation, and the types mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const rank = await importTs("functions/src/witness/rank.ts");
const types = await importTs("functions/src/witness/types.ts");
const v = await importTs("functions/src/witness/validation.ts");

test("types mirror: src/data/witnessTypes.ts equals functions/src/witness/types.ts after the header", () => {
  const body = (f) => readFileSync(f, "utf8").split("\n").slice(10).join("\n");
  assert.equal(body("src/data/witnessTypes.ts"), body("functions/src/witness/types.ts"));
});

const c = (id, level, specificity = 0, extra = {}) => ({
  id, text: `line ${id}`, textNamed: null, level, kind: "receive", voice: "you", tentative: level === 3,
  order: 0, underneath: level === 3 ? "hurt" : null, specificity, ...extra,
});
const hist = (o = {}) => ({ landedYes: [], answers: 0, serves: 0, recentIds: [], savedIds: [], ownLineCount: 0, ownLineUses: 0, ...o });
const input = (o = {}) => ({
  band: "steady", moment: "checkin_result", emotionIds: ["anxious"], situationId: null,
  candidates: [], own: [], history: null, excludeIds: [], max: 2, ...o,
});
const ids = (lines) => lines.map((l) => l.id);

test("band → levels: flooded 1-2, stirred 4-5, steady 3-6", () => {
  assert.deepEqual(types.LEVELS_BY_BAND, { flooded: [1, 2], stirred: [4, 5], steady: [3, 4, 5, 6] });
  const all = [c("l1", 1), c("l2", 2), c("l3", 3), c("l4", 4), c("l5", 5), c("l6", 6)];
  const levels = (band) => rank.orderGraph(input({ band, candidates: all })).map((x) => x.level).sort();
  assert.deepEqual(levels("flooded"), [1, 2]);
  assert.deepEqual(levels("stirred"), [4, 5]);
  assert.deepEqual(levels("steady"), [3, 4, 5, 6]);
});

test("specificity first, then order, then id (deterministic)", () => {
  const cands = [c("b", 5, 0), c("a", 5, 0), c("fam", 5, 1), c("word", 5, 2), c("sit", 5, 4), c("urge", 5, 3)];
  assert.deepEqual(ids(rank.orderGraph(input({ candidates: cands }))), ["sit", "urge", "word", "fam", "a", "b"]);
  const ordered = [c("z", 4, 1, { order: 1 }), c("y", 4, 1, { order: 2 })];
  assert.deepEqual(ids(rank.orderGraph(input({ candidates: ordered }))), ["z", "y"]);
});

test("rotation: lines shown in the last 3 host records go behind the others at the same specificity", () => {
  const cands = [c("f1", 5, 1, { order: 1 }), c("f2", 5, 1, { order: 2 }), c("f3", 5, 1, { order: 3 })];
  const h = hist({ recentIds: ["f1", "f2"] });
  assert.deepEqual(ids(rank.orderGraph(input({ candidates: cands, history: h }))), ["f3", "f1", "f2"]);
  // rotation never outranks specificity: a recent specific line still beats a fresh generic one
  assert.equal(rank.orderGraph(input({ candidates: [c("gen", 5, 0), c("fam", 5, 1)], history: hist({ recentIds: ["fam"] }) }))[0].id, "fam");
});

test("landed-first from fade stage 1 (and kept lines always), unless shown recently", () => {
  const cands = [c("spec", 5, 2), c("liked", 5, 0)];
  assert.equal(rank.orderGraph(input({ candidates: cands, history: hist({ landedYes: ["liked"] }) }))[0].id, "spec", "stage 0: no landed-first");
  const stage1 = hist({ landedYes: ["liked", "x", "y"] });
  assert.equal(rank.fadeStageOf(stage1), 1);
  assert.equal(rank.orderGraph(input({ candidates: cands, history: stage1 }))[0].id, "liked");
  assert.equal(rank.orderGraph(input({ candidates: cands, history: { ...stage1, recentIds: ["liked"] } }))[0].id, "spec", "not every time");
  assert.equal(rank.orderGraph(input({ candidates: cands, history: hist({ savedIds: ["liked"] }) }))[0].id, "liked", "kept");
});

test("primary + alternate at a different level; flooded serves one short line", () => {
  const cands = [c("a4", 4, 2), c("b4", 4, 1), c("c5", 5, 0)];
  const lines = rank.rankWitnessLines(input({ band: "stirred", candidates: cands }));
  assert.deepEqual(ids(lines), ["a4", "c5"]);
  assert.deepEqual(ids(rank.rankWitnessLines(input({ band: "stirred", candidates: cands, max: 1 }))), ["a4"]);
  const flooded = [c("long", 1, 1, { text: "one two three four five six seven eight nine" }), c("short", 2, 0, { text: "A lot, right now." })];
  assert.deepEqual(ids(rank.rankWitnessLines(input({ band: "flooded", candidates: flooded, max: 3 }))), ["short"]);
});

test("excluded ids are never served", () => {
  assert.deepEqual(ids(rank.rankWitnessLines(input({ candidates: [c("a", 4), c("b", 5)], excludeIds: ["a"] }))), ["b"]);
});

test("own lines first only from fade stage 2, matched by situation or emotion", () => {
  const own = [
    { id: "o-anx", text: "You got through this before.", emotionIds: ["anxious"], situationId: null, moment: "checkin_result", lastUsedAt: null },
    { id: "o-sad", text: "Sad is allowed.", emotionIds: ["sad"], situationId: null, moment: "checkin_result", lastUsedAt: null },
  ];
  const cands = [c("g4", 4), c("g5", 5)];
  assert.deepEqual(ids(rank.rankWitnessLines(input({ candidates: cands, own, history: hist() }))), ["g4", "g5"], "stage 0");
  const stage2 = hist({ ownLineCount: 1 });
  assert.equal(rank.fadeStageOf(stage2), 2);
  const lines = rank.rankWitnessLines(input({ candidates: cands, own, history: stage2 }));
  assert.deepEqual(ids(lines), ["o-anx", "g4"]);
  assert.deepEqual(lines[0], { id: "o-anx", source: "own", text: "You got through this before.", level: null, kind: "self", voice: "none", tentative: false });
  assert.deepEqual(ids(rank.rankWitnessLines(input({ candidates: cands, own, history: stage2, emotionIds: ["angry"] }))), ["g4", "g5"], "no match");
});

test("own lines rotate by last use", () => {
  const own = ["b", "a"].map((id, i) => ({ id, text: id, emotionIds: ["anxious"], situationId: null, moment: null, lastUsedAt: i ? "2026-10-02T00:00:00Z" : "2026-10-01T00:00:00Z" }));
  assert.equal(rank.rankWitnessLines(input({ own, history: hist({ ownLineCount: 2 }) }))[0].id, "b");
});

test("fade stages 0-3 and the landed question (never flooded; 10 answers, then 1 in 5)", () => {
  assert.equal(rank.fadeStageOf(null), 0);
  assert.equal(rank.fadeStageOf(hist({ landedYes: Array(8).fill("x") })), 2);
  assert.equal(rank.fadeStageOf(hist({ ownLineCount: 2, ownLineUses: 5 })), 3);
  assert.equal(rank.askLandedOf("flooded", null), false);
  assert.equal(rank.askLandedOf("steady", null), true);
  assert.equal(rank.askLandedOf("stirred", hist({ answers: 9, serves: 20 })), true);
  assert.equal(rank.askLandedOf("stirred", hist({ answers: 10, serves: 20 })), false);
  assert.equal(rank.askLandedOf("stirred", hist({ answers: 10, serves: 24 })), true, "every 5th beat");
});

test("level 3 lines carry their guess", () => {
  const [line] = rank.rankWitnessLines(input({ candidates: [c("g3", 3, 1)], max: 1 }));
  assert.equal(line.tentative, true);
  assert.equal(line.underneathEmotionId, "hurt");
});

test("validation: getWitnessLines request", () => {
  const ok = v.parseGetWitnessLines({ hostToolId: "checkin", moment: "checkin_result", band: "stirred", emotionIds: ["anxious", "let_down"] });
  assert.deepEqual(ok, { hostToolId: "checkin", moment: "checkin_result", band: "stirred", emotionIds: ["anxious", "let_down"], situationId: null, urgeId: null, forOther: false, excludeIds: [], max: 2 });
  for (const bad of [
    { hostToolId: "checkin", moment: "nope", band: "steady" },
    { hostToolId: "checkin", moment: "checkin_result", band: "calm" },
    { hostToolId: "Check In", moment: "checkin_result", band: "steady" },
    { hostToolId: "checkin", moment: "checkin_result", band: "steady", emotionIds: ["a", "b", "c", "d", "e", "f"] },
    { hostToolId: "checkin", moment: "checkin_result", band: "steady", emotionIds: ["Anxious"] },
    { hostToolId: "checkin", moment: "checkin_result", band: "steady", max: 4 },
  ]) assert.throws(() => v.parseGetWitnessLines(bad), JSON.stringify(bad));
});

const HOST = "0b9f3c1e-6d2a-4c8e-9f0a-1b2c3d4e5f60";
const OWN = "1c9f3c1e-6d2a-4c8e-9f0a-1b2c3d4e5f61";
test("validation: recordWitnessBeat request", () => {
  const ok = v.parseRecordWitnessBeat({
    hostKind: "checkin", hostId: HOST, moment: "checkin_result", band: "steady",
    shown: [{ lineId: "ci_fear_l5_1", landed: "yes" }], skipped: false, noneFit: false, keepLineId: "ci_fear_l5_1",
    ownLine: { id: OWN, text: "  I have\nbeen here before.\u0007 ", emotionIds: ["anxious"] },
  });
  assert.equal(ok.ownLine.text, "I have been here before.");
  assert.equal(ok.keepLineId, "ci_fear_l5_1");
  assert.equal(ok.shown[0].landed, "yes");
  const base = { hostKind: "checkin", hostId: HOST, moment: "checkin_result", band: "steady", shown: [], skipped: true, noneFit: false };
  for (const bad of [
    { ...base, hostId: "not-a-uuid" },
    { ...base, hostKind: "user" },
    { ...base, shown: [{ lineId: "a", landed: "maybe" }] },
    { ...base, shown: [{ lineId: "a" }, { lineId: "a" }] },
    { ...base, shown: [{ lineId: "a" }, { lineId: "b" }, { lineId: "c" }, { lineId: "d" }] },
    { ...base, keepLineId: "not_shown" },
    { ...base, ownLine: { id: OWN, text: "x".repeat(141), emotionIds: [] } },
    { ...base, ownLine: { id: OWN, text: " \n\t ", emotionIds: [] } },
    { ...base, skipped: "yes" },
  ]) assert.throws(() => v.parseRecordWitnessBeat(bad), JSON.stringify(bad).slice(0, 80));
});

test("validation: Wise mind's keep is an own line with no band; a shown line still needs one", () => {
  const keep = v.parseRecordWitnessBeat({
    hostKind: "tool_session", hostId: HOST, moment: "wise_mind", shown: [], skipped: false, noneFit: false,
    ownLine: { id: OWN, text: "Wise mind said: wait, not now.", emotionIds: [] },
  });
  assert.equal(keep.band, undefined);
  assert.equal(keep.moment, "wise_mind");
  assert.equal(keep.ownLine.text, "Wise mind said: wait, not now.");
  assert.throws(() => v.parseRecordWitnessBeat({
    hostKind: "checkin", hostId: HOST, moment: "checkin_result", shown: [{ lineId: "ci_fear_l5_1", landed: null }],
  }), "a shown line is stored with its band");
  assert.throws(() => v.parseRecordWitnessBeat({ hostKind: "tool_session", hostId: HOST, moment: "wise_mind", band: "calm", shown: [] }));
});

test("own lines are never linted or sent anywhere: the witness module doesn't import the voice lint", () => {
  for (const f of ["index.ts", "rank.ts", "validation.ts"]) {
    assert.doesNotMatch(readFileSync(`functions/src/witness/${f}`, "utf8"), /voice-lint|lintText|fetch\(/, f);
  }
});
