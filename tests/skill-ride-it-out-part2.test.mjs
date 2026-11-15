// Ride it out part 2 (DT-05, docs/design/ride-it-out.md): the morning card. After a ride (never after Hurt myself, never
// on the not-safe route) an optional `ride_morning` card on Today the next 08:00 at least four hours on: no push, no
// time-of-day condition, the spine's own `next_local` window. The card reopens the visit at `morning` (R9): how it is
// this morning, asked fresh, then a line and, when it's back, ride again, a card for next time or a habit plan.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const Win = await importTs("src/lib/spine/windows.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
const skill = content.skills.find((s) => s.id === "ride_it_out");
const WAVE_IDS = ["still_here", "fading", "gone", "bigger", "ended_gone", "ended_bigger", "ended_not_now", "ended_left", "ended_long"];
const embedOutputs = {
  urgeWave: { ids: WAVE_IDS, measures: ["durationSec", "doneCount"] },
  waveTrace: { ids: ["read"] },
  doseTimer: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
};
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const skipCard = { type: "next", quiet: true };
const out = (...ids) => ({ type: "embedDone", output: { ids, durationSec: 200, doneCount: ids.length - 1 } });
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const step = (id) => M.stepOf(skill, id);
const offers = (s) => M.offersFor(ctx(), step(s.stepId), s);
const reopen = (s, at) => M.resumeRun(ctx(), M.runRecord(ctx(), s), at);
const RODE = (p = "check") => [pick("pull", p), next, out("still_here", "fading", "gone", "ended_gone"), out("read")];

test("after a ride: the morning card's offer, optional, *No card* the quiet way on, before the end card", () => {
  const s = run(RODE());
  assert.equal(s.stepId, "morning_ask");
  const st = step("morning_ask");
  assert.equal(M.copyText(ctx(), st.title, s), "Want a card in the morning, to look back on it?");
  assert.equal(st.secondary, "morning_skip");
  assert.equal(skill.copy.morning_skip, "No card");
  assert.equal(st.fields[0].required, undefined, "never a must");
  assert.deepEqual(skill.options.remind.map((o) => o.value), ["morning"]);
  assert.equal(run([skipCard], ctx(), s).stepId, "end");
  assert.equal(run([pick("remind", "morning"), next], ctx(), s).stepId, "end");
  assert.ok(st.fields[0].links.some((l) => l.exit === "safety_open"), "the safety link stays");
});

test("the card is booked only on *In the morning*; a passed round still ends on its own card", () => {
  const s = run(RODE());
  assert.equal(M.followUpFor(ctx(), step("morning_ask"), s), null, "nothing tapped, nothing booked");
  assert.deepEqual(M.followUpFor(ctx(), step("morning_ask"), run([pick("remind", "morning")], ctx(), s)), { type: "ride_morning", chip: null });
  const round = run([pick("pull", "check"), next, out("ended_not_now"), pick("swap", "walk"), next, out("done"), pick("after_round", "passed"), next]);
  assert.equal(round.stepId, "morning_ask");
  assert.equal(run([skipCard], ctx(), round).stepId, "passed");
});

test("never offered after Hurt myself or on the not-safe route", () => {
  const ride = run([pick("pull", "hurt"), next, pick("safe", "safe"), next]);
  assert.equal(run([out("fading", "gone", "ended_gone"), out("read")], ctx(), ride).stepId, "hurt_end");
  assert.equal(run([out("ended_not_now"), pick("swap", "walk"), next, out("done"), pick("after_round", "passed"), next], ctx(), ride).stepId, "hurt_end");
  for (const a of ["unsure", "no"]) assert.equal(run([pick("pull", "hurt"), next, pick("safe", a), next]).stepId, "reach");
  // Statically: every way into morning_ask is guarded by not-hurt first.
  for (const st of skill.steps) {
    const nx = Array.isArray(st.next) ? st.next : [];
    const i = nx.findIndex((r) => r.to === "morning_ask");
    if (i < 0) continue;
    assert.ok(nx.slice(0, i).some((r) => JSON.stringify(r.when ?? {}).includes('"hurt"') && /hurt_end|safe/.test(r.to)), `${st.id}: hurt routed away first`);
  }
});

test("the card reopens the visit at morning, asked fresh; the visit's urge close isn't asked again", () => {
  const booked = run([pick("remind", "morning"), next], ctx(), run(RODE()));
  const r = reopen(booked, "morning");
  assert.equal(r.stepId, "morning");
  assert.equal(r.answers.morning, undefined, "asked fresh");
  assert.deepEqual(step("morning").reopens, { after: "morning_ask" });
  assert.deepEqual(step("morning").clears, ["morning"]);
  assert.equal(reopen(run(RODE().slice(0, 2)), "morning"), null, "a visit that never reached the offer doesn't reopen here");
  assert.equal(step("morning_end").noClose, true);
  assert.equal(step("morning_end").complete, true);
  assert.equal(M.copyText(ctx(), step("morning").title, r), "The urge you rode out. How is it this morning?");
});

test("this morning: a line for each answer; back and strong gets ride again, a card, a habit plan for check or use", () => {
  const at = (p, answer) => run([pick("morning", answer), next], ctx(), reopen(run([pick("remind", "morning"), next], ctx(), run(RODE(p))), "morning"));
  for (const a of ["gone", "quieter"]) {
    const s = at("check", a);
    assert.equal(s.stepId, "morning_end");
    assert.equal(M.handoffLine(ctx(), step("morning_end"), s), "You rode it out, and here's the morning.");
    assert.deepEqual(offers(s), []);
  }
  const same = at("check", "same");
  assert.equal(M.handoffLine(ctx(), step("morning_end"), same), "It's still around, and you still got through it.");
  assert.deepEqual(offers(same), ["pros_cons", "habit_plan"]);
  const strong = at("check", "strong");
  assert.match(M.handoffLine(ctx(), step("morning_end"), strong), /^It's back\. You've ridden it once/);
  assert.deepEqual(offers(strong), ["ride_again", "pros_cons", "habit_plan"]);
  assert.deepEqual(offers(at("send", "strong")), ["ride_again", "pros_cons"], "send: no habit plan");
  const again = skill.exits.find((e) => e.id === "ride_again");
  assert.deepEqual(again.query, { urgeId: "$a.pull" }, "a fresh ride, the same pull listed first");
  assert.equal(again.toolId, "urge-surfing");
});

test("the card: registered, content-free, resolved on open, a morning window with no push", () => {
  const t = spine.followUpTypes.find((x) => x.id === "ride_morning");
  assert.ok(t && t.enabled);
  assert.equal(t.deepLinkTemplate, "/tool/urge-surfing?run={sourceSessionId}&at=morning&followUp={followUpId}");
  assert.deepEqual(t.window, { kind: "next_local", time: "08:00", minAheadHours: 4 });
  assert.doesNotMatch(`${t.copy.title} ${t.copy.body} ${t.notification}`, /urge|hurt|drink|\buse\b|\bsend\b|\bhit\b|checking/i, "never says what it was");
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /'ride_morning'/);
  assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), /ride_morning: 'urge-surfing'/);
  // A ride at 2 a.m. gets it that morning; one at 3 p.m. or 11 p.m., the next.
  const due = (h) => Win.dueAtFor(t.window, new Date(2026, 10, 15, h, 0));
  assert.equal(due(2).getDate(), 15);
  assert.equal(due(2).getHours(), 8);
  assert.equal(due(15).getDate(), 16);
  assert.equal(due(23).getDate(), 16);
  assert.equal(due(5).getDate(), 16, "within four hours of 08:00: the next morning, not in three hours");
});

test("the new copy keeps the voice: no should, just, but or exclamation", () => {
  for (const id of ["morning_title", "morning_hint", "back_title", "back_hint", "back_eased", "back_same", "back_strong", "ride_again"]) {
    assert.doesNotMatch(skill.copy[id], /\bshould\b|\bjust\b|\bbut\b|!/i, id);
  }
  for (const id of ["morning_ask", "morning", "morning_end"]) assert.ok(step(id).crisis?.length, `${id} declares the crisis slot`);
});
