// Rebel without the wreckage, part 2 (DT-11; docs/design/alternate-rebellion.md): the two-part urge close, a card later
// for a rebellion picked for later today or this week (rebellion_after, reopening at `back`), and the 24-hour check on
// an own rebellion that can't be undone (rebellion_check, reopening at `still`). Tested through the pure machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
const skill = content.skills.find((s) => s.id === "alternate_rebellion");
const embedOutputs = { rebellionCard: { ids: ["now", "today", "week"] } };
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const card = (when) => ({ type: "embedDone", output: { ids: [when] } });
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const step = (id) => skill.steps.find((s) => s.id === id);
const toPick = (squeeze = ["rules"], fn = "freedom") => [next, ...squeeze.map((x) => pick("squeeze", x)), next, pick("function", fn), next];
const line = (s) => M.handoffLine(ctx(), step(s.stepId), s);
const reopen = (s, at) => M.resumeRun(ctx(), M.runRecord(ctx(), s), at);

test("later today or this week: an optional card to ask how it went; now asks the itch straight away", () => {
  const atCard = run([...toPick(), pick("pick", "say_no"), next]);
  assert.equal(M.runNext(ctx(), atCard, card("now")).stepId, "itch", "now: no card");
  const later = M.runNext(ctx(), atCard, card("today"));
  assert.equal(later.stepId, "later");
  assert.equal(step("later").secondary, "later_skip", "No card is a real answer");
  assert.equal(step("later").fields[0].required, undefined);
  assert.deepEqual(M.followUpFor(ctx(), step("later"), run([pick("remind", "evening")], ctx(), later)), { type: "rebellion_after", chip: "evening" });
  assert.equal(M.followUpFor(ctx(), step("later"), later), null, "nothing tapped, nothing booked");
  const skipped = run([pick("remind", "tomorrow"), { type: "next", quiet: true }], ctx(), later);
  assert.equal(skipped.stepId, "real");
  assert.equal(skipped.answers.remind, undefined, "No card drops a tapped chip");
});

test("the card later reopens the visit at back: did you do it → the itch → the squeeze, asked fresh", () => {
  const booked = run([...toPick(), pick("pick", "say_no"), next, card("week"), pick("remind", "few_days"), next, pick("real", "change"), next]);
  assert.equal(booked.stepId, "next");
  const r = reopen(booked, "back");
  assert.equal(r.stepId, "back");
  assert.equal(r.answers.real, undefined, "the squeeze is asked again");
  const did = run([pick("did", "yes"), next], ctx(), r);
  assert.equal(did.stepId, "itch");
  const end = run([pick("itch", "a_bit"), next, pick("real", "cant"), next], ctx(), did);
  assert.equal(end.stepId, "next");
  assert.deepEqual(end.offered, ["let_it_be"]);
  // Not yet: another card if they want one (the same card; it reopens here again), or none.
  const notYet = run([pick("did", "not_yet"), next], ctx(), r);
  assert.equal(notYet.stepId, "again_card");
  assert.deepEqual(M.followUpFor(ctx(), step("again_card"), run([pick("remind_again", "tomorrow")], ctx(), notYet)), { type: "rebellion_after", chip: "tomorrow" });
  const again = run([pick("remind_again", "few_days"), next, pick("real", "not_now"), next], ctx(), notYet);
  assert.equal(reopen(again, "back").stepId, "back", "the second card reopens it too");
  assert.equal(run([pick("remind_again", "tomorrow"), { type: "next", quiet: true }], ctx(), notYet).stepId, "real");
  assert.equal(run([pick("did", "no"), next], ctx(), r).stepId, "real");
  assert.deepEqual(step("back").reopens, { after: "later", again: ["again_card"] });
});

test("an own rebellion that can't be undone waits a day: no card today, a card tomorrow asks if they still want it", () => {
  let s = run([...toPick(), own("pick", "shave my head"), pick("cost", "no")]);
  assert.equal(M.canGoOn(ctx(), s), false, "could you undo it is asked");
  s = run([pick("undo", "no"), next], ctx(), s);
  assert.equal(s.stepId, "sleep_on");
  assert.equal(run([...toPick(), own("pick", "shave my head"), pick("cost", "no"), pick("undo", "not_sure"), next]).stepId, "sleep_on", "not sure waits too");
  assert.equal(M.followUpFor(ctx(), step("sleep_on"), run([pick("sleep", "tomorrow")], ctx(), s)).type, "rebellion_check");
  assert.equal(M.followUpFor(ctx(), step("sleep_on"), run([pick("sleep", "lighter")], ctx(), s)), null);
  assert.equal(run([pick("sleep", "lighter"), next], ctx(), s).stepId, "pick", "pick one I can undo: back to the list");
  const slept = run([pick("sleep", "tomorrow"), next], ctx(), s);
  assert.equal(slept.stepId, "real", "no card today");
  const end = run([pick("real", "not_now"), next], ctx(), slept);
  assert.ok(!end.path.includes("card"));
  assert.equal(line(end), skill.copy.next_slept);
  // A heads-up kept goes on to the wait, not the card.
  const kept = run([...toPick(), own("pick", "quit by email"), pick("cost", "yes"), pick("undo", "no"), next, pick("heads_up", "keep"), next]);
  assert.equal(kept.stepId, "sleep_on");
  // A curated rebellion is never asked: every one is reversible.
  assert.equal(run([...toPick(), pick("pick", "say_no"), next]).stepId, "card");
  assert.ok(skill.options.rebellion.every((o) => o.reversible === true));
});

test("a day later: still yes → the card; something undoable → the list, asked again; not any more → the squeeze", () => {
  const slept = run([...toPick(), own("pick", "shave my head"), pick("cost", "no"), pick("undo", "no"), next, pick("sleep", "tomorrow"), next, pick("real", "not_now"), next]);
  const r = reopen(slept, "still");
  assert.equal(r.stepId, "still");
  assert.equal(r.answers.undo, undefined);
  assert.equal(r.answers.cost, undefined);
  assert.equal(r.answers.pick.own, "shave my head", "their words stay");
  const yes = run([pick("still", "yes"), next], ctx(), r);
  assert.equal(yes.stepId, "card");
  assert.equal(M.runNext(ctx(), yes, card("today")).stepId, "later");
  const lighter = run([pick("still", "lighter"), next], ctx(), r);
  assert.equal(lighter.stepId, "pick");
  assert.equal(M.canGoOn(ctx(), lighter), false, "the cost and undo questions are asked again");
  const no = run([pick("still", "no"), next, pick("real", "change"), next], ctx(), r);
  assert.equal(no.stepId, "next");
  assert.equal(line(no), skill.copy.next_let_go);
  assert.deepEqual(step("still").reopens, { after: "sleep_on" });
});

test("the card's chips fit the answer: this evening for later today, a few days for this week", () => {
  const atCard = run([...toPick(), pick("pick", "say_no"), next]);
  const opts = (when) => M.optionGroups(ctx(), step("later").fields[0], M.runNext(ctx(), atCard, card(when)).answers)[0].options.map((o) => o.value);
  assert.deepEqual(opts("today"), ["evening", "tomorrow"]);
  assert.deepEqual(opts("week"), ["tomorrow", "few_days"]);
});

test("a second wait after the day-later card asks fresh: nothing booked unless tapped again, and the right end line", () => {
  const slept = run([...toPick(), own("pick", "shave my head"), pick("cost", "no"), pick("undo", "no"), next, pick("sleep", "tomorrow"), next, pick("real", "not_now"), next]);
  const r = reopen(slept, "still");
  assert.equal(r.answers.sleep, undefined);
  const again = run([pick("still", "lighter"), next, own("pick", "get a piercing"), pick("cost", "no"), pick("undo", "not_sure"), next], ctx(), r);
  assert.equal(again.stepId, "sleep_on");
  assert.equal(again.answers.sleep, undefined, "Ask me tomorrow isn't pre-picked");
  assert.equal(M.followUpFor(ctx(), step("sleep_on"), again), null);
  assert.equal(M.copyText(ctx(), step("sleep_on").title, again), skill.copy.sleep_title_unsure, "not sure isn't told it can't be undone");
  const end = run([pick("sleep", "tomorrow"), next, pick("real", "not_now"), next], ctx(), again);
  assert.equal(line(end), skill.copy.next_slept);
});

test("a day later with someone they're scared of, or next to treatment: yes goes back through the questions", () => {
  const wait = (squeeze) => run([...toPick(squeeze), own("pick", "move out tonight"), pick("cost", "no"), ...(squeeze.includes("scared") ? [pick("noticed", "no")] : []),
    pick("undo", "no"), next, pick("sleep", "tomorrow"), next, pick("real", "not_now"), next]);
  const scared = reopen(wait(["scared"]), "still");
  const yes = run([pick("still", "yes"), next], ctx(), scared);
  assert.equal(yes.stepId, "pick");
  assert.deepEqual(M.shownFields(ctx(), step("pick"), yes).map((f) => f.id), ["pick", "cost", "noticed", "undo"]);
  assert.equal(M.canGoOn(ctx(), yes), false, "would they notice it is asked again");
  const treat = reopen(wait(["treatment"]), "still");
  assert.match(M.copyText(ctx(), step("still").title, treat), /care team first/);
  assert.equal(run([pick("still", "yes"), next], ctx(), treat).stepId, "pick");
});

test("the two-part close: acted on the blow-up urge, then that urge now (urge_change)", () => {
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'alternate-rebellion': \{ module: 'dt', closeKind: 'urge_change' \}/);
  assert.match(readFileSync("src/lib/spine/close.ts", "utf8"), /'alternate-rebellion': \{ module: 'dt', closeKind: 'urge_change' \}/);
  const by = spine.closeFlow.byTool["alternate-rebellion"];
  assert.equal(by.urge.question, "And the urge to blow it all up?");
  assert.equal(by.regulation_down.dir, "down");
  assert.match(by.regulation_down.question, /now, compared to when you started/);
});

test("the cards: registered, content-free, resolved on open, only from a Rebel visit; chips equal the window's", () => {
  for (const [id, at] of [["rebellion_after", "back"], ["rebellion_check", "still"]]) {
    const t = spine.followUpTypes.find((x) => x.id === id);
    assert.ok(t && t.enabled, id);
    assert.equal(t.deepLinkTemplate, `/tool/alternate-rebellion?run={sourceSessionId}&at=${at}&followUp={followUpId}`);
    assert.doesNotMatch(`${t.copy.title} ${t.copy.body} ${t.notification}`, /rebel|tattoo|hair|quit|blow/i, "never says what it is");
    assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), new RegExp(`'${id}'`));
    assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), new RegExp(`${id}: 'alternate-rebellion'`));
  }
  const after = spine.followUpTypes.find((x) => x.id === "rebellion_after");
  assert.deepEqual(Object.keys(after.window.chips).sort(), skill.options.remind.map((o) => o.value).sort());
  assert.deepEqual(spine.followUpTypes.find((x) => x.id === "rebellion_check").window, { kind: "after", minutes: 1440 }, "a full day");
  for (const id of ["undo_q", "sleep_title", "sleep_hint", "still_title", "still_hint", "later_title", "back_title", "back_hint", "next_slept", "next_let_go"]) {
    assert.doesNotMatch(skill.copy[id], /should|just|but|!/i, id);
  }
});

test("the new screens keep the safety link and the other-person resources", () => {
  for (const id of ["sleep_on", "later", "back", "again_card", "still"]) {
    assert.ok(step(id).fields.at(-1).links.some((l) => l.exit === "safety_open"), id);
  }
  for (const id of ["sleep_on", "later", "back", "again_card", "still"]) assert.deepEqual(step(id).crisis.map((c) => c.variant), ["other_person"], id);
});
