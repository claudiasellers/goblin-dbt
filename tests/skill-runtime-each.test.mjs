// R16, per-pick repeat (docs/design/opposite-action-v3.md, *Runtime pieces*; agreed with the plan thread 12 Nov):
// a step with `each` runs once per pick of a field, in pick order; its answers are kept per pick and recorded with
// `pick`; a per-pick hand-off can set its pick aside (*Carry on with the others*); the newest per-pick check is the
// session's ask-fresh answer; resume brings each pick's answers back to that pick.
import { test } from "node:test";
import assert from "node:assert/strict";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");

const always = { all: [] };
const SKILL = {
  id: "each_demo", toolId: "opposite-action", version: "each-v1", start: "door", ownMax: 140,
  copy: { t: "Which feelings?", u: "What is {each} pushing you to do?", carry_on: "Carry on with {others}", done: "Done" },
  tables: {}, derive: [{ name: "parent", from: "$each", table: "parentOf" }],
  emotionFields: ["feel"],
  steps: [
    { id: "door", kind: "ask", title: "t", fields: [{ id: "feel", options: { emotions: ["anxious", "angry", "ashamed"] }, max: 3, required: true }],
      next: [{ to: "urge", when: null }], offers: [] },
    { id: "urge", kind: "ask", title: "u", each: "feel",
      fields: [{ id: "urge", options: { list: "urge", where: { has: ["$opt.parents", "$d.parent"] } }, max: 1, required: true }],
      next: [{ to: "help", when: null }], offers: [] },
    { id: "help", kind: "ask", each: "feel",
      fields: [{ id: "help", options: { list: "help" }, max: 1, required: true }],
      next: [{ to: "route", when: { eq: ["$a.help", "helpful"] } }, { to: "body", when: null }], offers: [] },
    { id: "route", kind: "handoff", each: "feel", carryOn: "body", next: [], offers: [{ exit: "ps", when: always }], done: "done" },
    { id: "body", kind: "ask", fields: [{ id: "cue", options: { list: "cue" }, max: 1 }], next: [{ to: "rate", when: null }], offers: [] },
    { id: "rate", kind: "ask", each: "feel",
      fields: [{ id: "rate", options: { list: "tvn" }, max: 1, required: true, askFresh: "thenVsNow" }],
      next: [{ to: "end", when: null }], offers: [] },
    { id: "end", kind: "handoff", complete: true, next: [], offers: [], done: "done" },
  ],
  exits: [{ id: "ps", toolId: "problem-solve", carry: ["feel"] }, { id: "done", done: true, carry: [] }],
  options: {
    urge: [
      { value: "fear-avoid", label: "Avoid it", parents: ["fear"], urge: "fear-avoid" },
      { value: "anger-lash", label: "Lash out", parents: ["anger"], urge: "anger-lash" },
      { value: "shame-hide", label: "Hide", parents: ["shame"], urge: "shame-hide" },
    ],
    help: [{ value: "helpful", label: "Helps" }, { value: "unhelpful", label: "Doesn't" }],
    cue: [{ value: "c1", label: "Drop your shoulders" }],
    tvn: ["worse", "same", "better", "much_better"].map((v) => ({ value: v, label: v })),
  },
};
const ctx = {
  skill: SKILL, shared: { parentOf: { anxious: "fear", angry: "anger", ashamed: "shame" }, fitsWhen: {} },
  carried: [], gridIds: new Set(["anxious", "angry", "ashamed"]), emotionLabel: (id) => id,
};
const go = (events, s = M.initialRun(SKILL)) => events.reduce((x, e) => M.runNext(ctx, x, e), s);
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const three = [pick("feel", "anxious"), pick("feel", "angry"), pick("feel", "ashamed"), next];

test("R16: each pick gets its own sub-run, in pick order; its answers are kept per pick and its conditions read them", () => {
  let s = go(three);
  assert.equal(s.stepId, "urge");
  assert.equal(s.pick, 0);
  // `$d.parent` derives from `$each`: only the anxious feeling's urges are offered.
  assert.deepEqual(M.optionGroups(ctx, SKILL.steps[1].fields[0], M.answersOf(ctx, s))[0].options.map((o) => o.value), ["fear-avoid"]);
  assert.equal(M.copyText(ctx, "u", s, M.titleSlots(ctx, SKILL.steps[1], s)), "What is anxious pushing you to do?");
  s = go([pick("urge", "fear-avoid"), next, pick("help", "unhelpful"), next], s);
  // Out of the segment (help → body) with picks left: the next pick starts at the segment's entry.
  assert.equal(s.stepId, "urge");
  assert.equal(s.pick, 1);
  assert.equal(M.answersOf(ctx, s).urge, undefined, "the second pick's urge is asked fresh");
  s = go([pick("urge", "fear-avoid")], s);
  assert.equal(M.answersOf(ctx, s).urge, undefined, "a pick the second feeling's step doesn't offer is ignored");
  s = go([pick("urge", "anger-lash"), next, pick("help", "unhelpful"), next, pick("urge", "shame-hide"), next, pick("help", "unhelpful"), next], s);
  assert.equal(s.stepId, "body");
  assert.equal(s.pick, null);
  assert.deepEqual(s.path, ["door", "urge:0", "help:0", "urge:1", "help:1", "urge:2", "help:2", "body"]);
  assert.deepEqual(s.answers["urge@anxious"].ids, ["fear-avoid"]);
  assert.deepEqual(s.answers["urge@angry"].ids, ["anger-lash"]);
  // The session's emotions are the feelings field's picks, never the per-pick keys; urges are every pick's.
  assert.deepEqual(M.runEmotionIds(ctx, s), ["anxious", "angry", "ashamed"]);
  assert.deepEqual(M.runUrgeIds(ctx, s), ["fear-avoid", "anger-lash", "shame-hide"]);
  const rec = M.runRecord(ctx, s);
  assert.deepEqual(rec.answers.find((a) => a.fieldId === "urge" && a.pick === "angry"), { fieldId: "urge", optionIds: ["anger-lash"], pick: "angry" });
  assert.ok(!rec.answers.some((a) => a.fieldId === "$each"));
});

test("R16: a per-pick hand-off sets its pick aside (Carry on with the others): offered, not taken, and skipped after", () => {
  let s = go([...three, pick("urge", "fear-avoid"), next, pick("help", "helpful"), next]);
  assert.equal(s.stepId, "route");
  assert.equal(s.pick, 0);
  assert.deepEqual(M.carryOnOthers(ctx, s), ["angry", "ashamed"]);
  // Taken from this card, the hand-off carries only this pick's feeling.
  assert.deepEqual(M.carried(SKILL.exits[0], s, ctx), ["anxious"]);
  s = go([{ type: "carryOn" }], s);
  assert.equal(s.stepId, "urge");
  assert.equal(s.pick, 1);
  assert.deepEqual(s.aside, ["anxious"]);
  assert.equal(s.exitId, null, "carrying on records the offer, not an exit");
  assert.deepEqual(s.offered, ["ps"]);
  s = go([pick("urge", "anger-lash"), next, pick("help", "unhelpful"), next, pick("urge", "shame-hide"), next, pick("help", "helpful"), next], s);
  assert.equal(s.stepId, "route");
  assert.deepEqual(M.carryOnOthers(ctx, s), ["angry"]);
  s = go([{ type: "carryOn" }], s);
  // No pick left after it: the run goes on to carryOn's step with the others.
  assert.equal(s.stepId, "body");
  s = go([next], s);
  // The next segment skips the picks set aside.
  assert.equal(s.stepId, "rate");
  assert.equal(M.currentPick(ctx, s), "angry");
  s = go([pick("rate", "better"), next], s);
  assert.equal(s.stepId, "end");
  // The last pick's hand-off with nothing else on its way offers no carry-on.
  const alone = go([pick("feel", "angry"), next, pick("urge", "anger-lash"), next, pick("help", "helpful"), next]);
  assert.equal(alone.stepId, "route");
  assert.deepEqual(M.carryOnOthers(ctx, alone), []);
  assert.equal(go([{ type: "carryOn" }], alone), alone);
});

test("R16: Back steps within a sub-run, then into the previous pick; a pick set aside comes back on Back", () => {
  let s = go([...three, pick("urge", "fear-avoid"), next, pick("help", "helpful"), next, { type: "carryOn" }]);
  assert.equal(M.currentPick(ctx, s), "angry");
  s = go([{ type: "back" }], s);
  assert.equal(s.stepId, "route");
  assert.equal(M.currentPick(ctx, s), "anxious");
  assert.deepEqual(s.aside, [], "back on the card it was set aside from");
  s = go([{ type: "back" }, { type: "back" }], s);
  assert.equal(s.stepId, "urge");
  assert.equal(M.currentPick(ctx, s), "anxious");
  assert.deepEqual(M.answersOf(ctx, s).urge.ids, ["fear-avoid"], "its answers are still there");
  s = go([{ type: "back" }], s);
  assert.equal(s.stepId, "door");
  assert.equal(s.pick, null);
});

test("R16: the newest per-pick check is the session's ask-fresh answer (newest wins)", () => {
  let s = go([...three, ...["fear-avoid", "anger-lash", "shame-hide"].flatMap((u) => [pick("urge", u), next, pick("help", "unhelpful"), next]), next]);
  assert.equal(s.stepId, "rate");
  s = go([pick("rate", "worse"), next, pick("rate", "same"), next, pick("rate", "much_better")], s);
  assert.equal(M.askFresh(ctx, s).thenVsNow, "much_better");
  // Back to the first pick and answered again: newest on the path is that one, until the next pick's screen is
  // reached again with its own answer on it.
  s = go([{ type: "back" }, { type: "back" }, pick("rate", "better")], s);
  assert.equal(M.currentPick(ctx, s), "anxious");
  assert.equal(M.askFresh(ctx, s).thenVsNow, "better");
  s = go([next], s);
  assert.equal(M.currentPick(ctx, s), "angry");
  assert.equal(M.askFresh(ctx, s).thenVsNow, "same");
});

test("R16: removing a pick drops its answers; resume brings each pick's answers back to it and asks later ones again", () => {
  let s = go([...three, pick("urge", "fear-avoid"), next, pick("help", "unhelpful"), next, pick("urge", "anger-lash"), next]);
  const back = go([{ type: "back" }, { type: "back" }, { type: "back" }, { type: "back" }, { type: "back" }, pick("feel", "angry")], s);
  assert.equal(back.stepId, "door");
  assert.equal(back.answers["urge@angry"], undefined, "a pick no longer picked loses its answers");
  assert.deepEqual(back.answers["urge@anxious"].ids, ["fear-avoid"]);
  // Resume at the second pick's urge: the first pick's answers stay, the second's later answers are asked again.
  s = go([pick("help", "unhelpful"), next], s);
  const rec = M.runRecord(ctx, s);
  const r = M.resumeRun(ctx, rec, "help");
  assert.equal(r.stepId, "help");
  assert.equal(M.currentPick(ctx, r), "angry");
  assert.deepEqual(r.answers["urge@anxious"].ids, ["fear-avoid"]);
  assert.deepEqual(r.answers["urge@angry"].ids, ["anger-lash"]);
  assert.deepEqual(M.answersOf(ctx, r).help.ids, ["unhelpful"], "the resumed step's own answer comes back");
  assert.equal(r.eachEntry, "urge");
  const on = go([next], r);
  assert.equal(on.stepId, "urge", "and it goes on as before, to the third pick");
  assert.equal(M.currentPick(ctx, on), "ashamed");
});

test("Back twice keeps going back (it used to go forward again); a forward move to the previous screen reads as a step back", () => {
  assert.deepEqual(M.backTrail(["a", "b", "c", "b"]), ["a", "b"]);
  assert.deepEqual(M.backTrail(["a", "b", "c", "b", "a"]), ["a"]);
  assert.deepEqual(M.backTrail(["a", "b", "c", "b", "c", "d"]), ["a", "b", "c", "d"]);
  const s = go([pick("feel", "anxious"), next, pick("urge", "fear-avoid"), next, pick("help", "unhelpful"), next]);
  assert.equal(s.stepId, "body");
  const b = go([{ type: "back" }, { type: "back" }, { type: "back" }], s);
  assert.equal(b.stepId, "door");
});

test("R16: Next into a segment with every pick set aside goes to the segment's way out, never a dead Next", () => {
  let s = go([pick("feel", "anxious"), next, pick("urge", "fear-avoid"), next, pick("help", "unhelpful"), next]);
  assert.equal(s.stepId, "body");
  s = { ...s, aside: ["anxious"] };
  s = go([next], s);
  assert.equal(s.stepId, "end", "rate (per pick) had no pick left: its way out");
});

test("R16: a resumed run (no trail) still walks Back across a carry-on, onto the card it was set aside from", () => {
  const s = go([...three, pick("urge", "fear-avoid"), next, pick("help", "helpful"), next, { type: "carryOn" },
    pick("urge", "anger-lash"), next, pick("help", "unhelpful"), next]);
  assert.equal(s.stepId, "urge");
  assert.equal(M.currentPick(ctx, s), "ashamed");
  const r = M.resumeRun(ctx, M.runRecord(ctx, s), "help");
  assert.equal(r.trail, undefined, "a resumed run reads its trail from the path");
  assert.equal(M.currentPick(ctx, r), "angry");
  assert.deepEqual(r.aside, ["anxious"], "the pick set aside stays aside on resume");
  let b = go([{ type: "back" }], r);
  assert.equal(b.stepId, "urge");
  assert.equal(M.currentPick(ctx, b), "angry");
  b = go([{ type: "back" }], b);
  assert.equal(b.stepId, "route", "back across the carry-on");
  assert.equal(M.currentPick(ctx, b), "anxious");
  assert.deepEqual(b.aside, [], "and the pick set aside comes back");
});
