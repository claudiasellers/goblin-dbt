// Keep your self-respect (FAST, DBT IE Handout 7; docs/design/fast.md) on the skill runtime: the review's four
// branches (A, S, T, F), the boundary line card's output, the hand-offs, the Let go route, and which skill the
// page opens. Through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const { fastSkillFor } = await importTs("src/lib/fastSkill.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const review = content.skills.find((s) => s.id === "fast_review");
const letGo = content.skills.find((s) => s.id === "fast_let_go");
const embedOutputs = { boundaryLine: { ids: ["copied"] }, inlineSkill: { ids: ["finished", "left", "stopped", "body", "unsafe"] } };
const ctx = (skill, ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (id) => id, embedOutputs, ctxIn });
function run(skill, events, ctxIn = {}) {
  const c = ctx(skill, ctxIn);
  let s = M.initialRun(skill);
  for (const e of events) s = M.runNext(c, s, e);
  return s;
}
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const copied = { type: "embedDone", output: { ids: ["copied"] } };
const notCopied = { type: "embedDone", output: { ids: [] } };

test("both skills are the one fast tool; nothing in either is a planned exit offered as a link", () => {
  for (const s of [review, letGo]) {
    assert.equal(s.toolId, "fast");
  }
  assert.deepEqual(review.exits.filter((x) => x.planned).map((x) => x.toolId), [], "Rehearse it is built (IE-02)");
  assert.deepEqual(review.exits.find((x) => x.id === "rehearse").query, { situationId: "boundary" });
  assert.deepEqual(letGo.exits.filter((x) => x.planned).map((x) => x.toolId).sort(), [], "Find your people is built (IE-09)");
});

test("A: a sorry for a real wrong is kept to one; the card shows the instead line; Check the Facts is offered", () => {
  const s = run(review, [pick("what", "over_sorry"), next, pick("sorry", "real_wrong"), next, pick("sorry_instead", "thanks"), next]);
  assert.deepEqual(s.path, ["what", "sorry", "sorry_instead", "card_a"]);
  const done = M.runNext(ctx(review), s, copied);
  assert.equal(done.stepId, "next");
  assert.deepEqual(done.answers.card_a_copied.ids, ["copied"]);
  assert.deepEqual(done.offered, ["check_the_facts", "rehearse"], "DEAR MAN only for a dropped ask");
  assert.equal(M.handoffLine(ctx(review), M.stepOf(review, "next"), done), review.copy.next_line_wrong);
});

test("A: no wrong done gives the plain line and no Check the Facts", () => {
  const s = run(review, [pick("what", "over_sorry"), next, pick("sorry", "no_wrong"), next, pick("sorry_instead", "matters"), next, notCopied]);
  assert.deepEqual(s.offered, ["rehearse"], "practising the line (IE-02) is always offered");
  assert.deepEqual(s.answers.card_a_copied.ids, []);
  assert.equal(M.handoffLine(ctx(review), M.stepOf(review, "next"), s), review.copy.next_line);
});

test("S: the values, two at most, a third swaps; the card is a list, not copyable", () => {
  const s = run(review, [pick("what", "went_along"), next, pick("values", review.options.values[0].value),
    pick("values", review.options.values[1].value), pick("values", review.options.values[2].value)]);
  assert.equal(s.stepId, "values");
  assert.equal(s.answers.values.ids.length, 2);
  const card = M.stepOf(review, "card_s");
  assert.equal(card.props.shape, "list");
  assert.equal(M.stepOf(review, "card_a").props.shape, "line");
  assert.deepEqual(run(review, [pick("what", "went_along"), next, pick("values", review.options.values[0].value), next]).path, ["what", "values", "card_s"]);
});

test("A: not sure about the sorry gets its own line and Check the Facts", () => {
  const s = run(review, [pick("what", "over_sorry"), next, pick("sorry", "unsure"), next, pick("sorry_instead", "matters"), next, notCopied]);
  assert.deepEqual(s.offered, ["check_the_facts", "rehearse"]);
  assert.equal(M.handoffLine(ctx(review), M.stepOf(review, "next"), s), review.copy.next_line_unsure);
});

test("T covers excuses as well as bending the truth; F has the other person's side", () => {
  assert.deepEqual(run(review, [pick("what", "made_excuse"), next, pick("truth", "real_answer"), next]).path, ["what", "truth", "card_t"]);
  assert.ok(review.options.instead.some((o) => o.value === "both_sides"));
});

test("T and F: truth and instead each lead to their card; a dropped ask or own words offer DEAR MAN", () => {
  assert.deepEqual(run(review, [pick("what", "bent_truth"), next, pick("truth", "plainly"), next]).path, ["what", "truth", "card_t"]);
  const f = run(review, [pick("what", "dropped_ask"), next, pick("instead", "heres_what"), next, notCopied]);
  assert.deepEqual(f.path, ["what", "instead", "card_f", "next"]);
  assert.deepEqual(f.offered, ["rehearse", "dear_man"]);
  const o = run(review, [own("what", "I agreed to cover their shift again"), next, pick("instead", "still_want"), next, notCopied]);
  assert.deepEqual(o.path, ["what", "instead", "card_f", "next"]);
  assert.deepEqual(o.offered, ["rehearse", "dear_man"]);
});

test("the card only keeps what boundaryLine declares", () => {
  const s = run(review, [pick("what", "bent_truth"), next, pick("truth", "plainly"), next,
    { type: "embedDone", output: { ids: ["copied", "sneaky"], own: "not declared" } }]);
  assert.deepEqual(s.out.card_t.ids, ["copied"]);
  assert.equal(s.out.card_t.own, null);
});

test("Let go: a line, the card, then elsewhere with Recover; I don't need to say anything skips the card", () => {
  assert.deepEqual(letGo.options.line.map((o) => o.value), ["not_keep_asking", "none", "hear_no", "not_today", "another_way", "not_argue"],
    "five lines and saying nothing, second, so the screen fits a phone");
  const first = letGo.options.line[0].value;
  const s = run(letGo, [pick("line", first), next, copied]);
  assert.deepEqual(s.path, ["line", "card", "elsewhere"]);
  assert.deepEqual(s.offered, ["let_it_be", "recover", "finding_connection"], "Let it be (DT-04) and Find your people (IE-09) are built");
  assert.equal(M.handoffLine(ctx(letGo), M.stepOf(letGo, "elsewhere"), s), letGo.copy.elsewhere_line);
  const heard = run(letGo, [pick("line", first), next, copied], { frame: "let_go" });
  assert.equal(heard.stepId, "room", "after a host's no: the acknowledgement and Let it be here");
  assert.equal(M.handoffLine(ctx(letGo, { frame: "let_go" }), M.stepOf(letGo, "room"), heard), letGo.copy.elsewhere_line_no,
    "the acknowledgement only after a host's no, never on a flooded entry where no one may have said no");
  const none = run(letGo, [pick("line", "none"), next]);
  assert.deepEqual(none.path, ["line", "elsewhere"]);
  assert.equal(M.handoffLine(ctx(letGo), M.stepOf(letGo, "elsewhere"), none), letGo.copy.elsewhere_line_none);
});

test("the page opens Let go for ?frame=let_go or a carried flooded reading, the review otherwise", () => {
  assert.equal(fastSkillFor("let_go", null), "fast_let_go");
  assert.equal(fastSkillFor(null, "flooded"), "fast_let_go");
  assert.equal(fastSkillFor(null, "stirred"), "fast_review");
  assert.equal(fastSkillFor(null, undefined), "fast_review");
  assert.equal(fastSkillFor("other", null), "fast_review");
});

test("Let go after a host's no (IE-B4): *make some room for it here* runs Let it be inline; where it ended picks the card", () => {
  const c = { frame: "let_go" };
  const at = run(letGo, [pick("line", "none"), next], c);
  assert.equal(at.stepId, "room", "saying nothing still gets the acknowledgement and the offer");
  assert.equal(M.handoffLine(ctx(letGo, c), M.stepOf(letGo, "room"), at), letGo.copy.elsewhere_line_none);
  const later = run(letGo, [pick("line", "none"), next, pick("room", "later"), next], c);
  assert.equal(later.stepId, "after");
  assert.deepEqual(later.offered, ["recover", "finding_connection"], "Recover, then Find your people (IE-09)");
  const accept = M.stepOf(letGo, "accept");
  assert.deepEqual([accept.embed, accept.props.skill, accept.props.enterAt], ["inlineSkill", "let_it_be", "what"]);
  const here = [pick("line", "none"), next, pick("room", "here"), next];
  const end = (ids) => run(letGo, [...here, { type: "embedDone", output: { ids } }], c);
  assert.equal(end(["finished"]).stepId, "after");
  assert.equal(end(["left"]).stepId, "after", "going back early is fine: no close of its own");
  for (const ids of [["finished", "unsafe"], ["stopped", "unsafe"], ["left", "unsafe"]]) {
    const s = end(ids);
    assert.equal(s.stepId, "unsafe", `never acceptance of ongoing harm: ${ids}`);
    assert.equal(M.crisisFor(ctx(letGo, c), M.stepOf(letGo, "unsafe"), s)?.variant, "other_person");
    assert.deepEqual(s.offered, ["safety_open", "ending_careful"]);
  }
  for (const ids of [["body"], ["finished", "body"]]) assert.equal(end(ids).stepId, "body", `grief too much or louder: ${ids}`);
  assert.deepEqual(end(["body"]).offered, ["cool_down"]);
  const flooded = run(letGo, [pick("line", "none"), next]);
  assert.equal(flooded.stepId, "elsewhere", "a flooded entry with no frame keeps the link (Let it be asks about the body itself)");
  const heardFlooded = run(letGo, [pick("line", "none"), next], { frame: "let_go", band: "flooded" });
  assert.equal(heardFlooded.stepId, "elsewhere", "flooded after a no: no room offer either (an inline run carries no band)");
  assert.ok(letGo.accepts.includes("band"));
  const both = end(["finished", "unsafe", "body"]);
  assert.equal(both.stepId, "unsafe", "unsafe wins over body");
  assert.deepEqual(both.offered, ["safety_open", "cool_down", "ending_careful"], "the body stays offered beside the resources");
  assert.equal(M.handoffLine(ctx(letGo, c), M.stepOf(letGo, "unsafe"), both), letGo.copy.unsafe_line_made_room, "going on for what already happened counted");
  assert.equal(M.handoffLine(ctx(letGo, c), M.stepOf(letGo, "unsafe"), end(["stopped", "unsafe"])), letGo.copy.unsafe_line);
});

test("Let it be runs inline from *what can't change*: its hand-offs become the host's outcome, the danger check a flag", () => {
  const lib = content.skills.find((s) => s.id === "let_it_be");
  assert.deepEqual(lib.inline.enterAt, ["what"]);
  assert.equal(lib.inline.thenVsNowFrom, "close");
  assert.deepEqual(lib.inline.ends, { still_stop: "stopped", too_much: "body", settle: "body", end: "finished" });
  const c = { skill: lib, shared: content, carried: [], gridIds: new Set(), emotionLabel: (id) => id, embedOutputs: {}, ctxIn: {} };
  const s0 = M.initialRun(lib, "what");
  assert.equal(s0.stepId, "what");
  let s = M.runNext(c, s0, own("what", "their no"));
  s = M.runNext(c, s, next);
  assert.equal(s.stepId, "still", "anything in their own words gets the danger check first");
  const unsafe = M.runNext(c, s, pick("still", "sometimes"));
  assert.deepEqual(M.inlineResult(c, unsafe).ids, ["finished", "unsafe"]);
  assert.deepEqual(M.inlineResult(c, { ...unsafe, stepId: "still_stop" }).ids, ["stopped", "unsafe"]);
  const safe = M.runNext(c, s, pick("still", "no"));
  assert.deepEqual(M.inlineResult(c, safe).ids, ["finished"]);
  assert.deepEqual(M.inlineResult(c, { ...s0, answers: { close: { ids: ["worse"], own: null } }, stepId: "end" }).ids, ["finished", "body"]);
});
