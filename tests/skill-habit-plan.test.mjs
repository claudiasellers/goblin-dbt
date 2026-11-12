// When it's a habit (PRD DT-09; dialectical abstinence and the DBT-SUD skills, DBT DT Handouts 16–21;
// docs/design/habit-plan.md) on the skill runtime: one behaviour, substances included; all in for a stretch you can
// keep, a lapse plan written in calm, bridges burned and built, kept in Me; the habit_renew card reopens the run when
// the stretch ends, and a slip shows the lapse plan before anything else. Tested through the same pure machine the
// player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const H = await importTs("src/lib/habitPlan.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "habit_plan");
const embedOutputs = {
  doseTimer: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
  boundaryLine: { ids: ["copied"] },
};
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const timed = { type: "embedDone", output: { ids: ["done"], durationSec: 30 } };
const read = { type: "embedDone", output: { ids: [] } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s);
const ids = (s, step, c = ctx()) => {
  const f = M.shownFields(c, M.stepOf(skill, step), s)[0];
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const FLOODED = ctx({ band: "flooded" });
// gamble: no medical or eating step; span → lapse → burn → risky → build (no image) → reinforce → card → remind.
const TO_REMIND = (what = "gamble", span = "few_days") => [pick("what", what), next, pick("span", span), next,
  pick("lapse", "tell"), pick("lapse", "recommit"), next, next, next, pick("build", "move"), next, next, read];

test("the skill: tool habit-plan, its own concept, close kind none, played by the player, listed under DT", () => {
  assert.equal(skill.toolId, "habit-plan");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_dialectical_abstinence"\}\), \(s:Skill \{id: "habit_plan"\}\)/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'habit-plan': 'habit_plan',/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'habit-plan',\n\s+name: 'When it\\'s a habit',/);
  assert.match(tools, /label: 'Something I keep doing', toolId: 'habit-plan'/);
  for (const f of ["src/lib/spine/close.ts", "functions/src/spine/tools.ts"])
    assert.match(readFileSync(f, "utf8"), /'habit-plan': \{ module: 'dt', closeKind: 'none' \}/, f);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_dialectical_abstinence", t: "habit-plan"\}/);
  assert.match(readFileSync("schema/relationships.cypher", "utf8"), /dbt_dialectical_abstinence"\}\), \(mod:TherapyConcept \{id: "dbt_distress_tolerance"\}\)/);
  assert.ok(skill.ownMax <= 60);
});

test("what: substances and behaviours, or their own words; hurting myself is a route, never a plan", () => {
  assert.deepEqual(ids(M.initialRun(skill), "what"), ["drink", "drugs", "smoke", "binge", "gamble", "spend", "scroll", "check", "porn", "hurt"]);
  const o = run([own("what", "Xanax most nights"), next]);
  assert.equal(o.stepId, "medical", "their own words count as the pick, and could be a substance: the withdrawal line, worded for it");
  assert.equal(M.copyText(ctx(), M.stepOf(skill, "medical").title, o), skill.copy.medical_title_own);
  const h = run([pick("what", "hurt"), next]);
  assert.equal(h.stepId, "harm");
  const harm = M.stepOf(skill, "harm");
  assert.ok(harm.noClose, "no close");
  assert.ok(M.opensSafety(ctx(), harm, h), "the resources open over it as it arrives");
  assert.equal(M.crisisFor(ctx(), harm, h)?.variant, "crisis");
  assert.deepEqual(offers(h), [], "no plan, no exercise: the kit is planned, someone to talk to is the link");
  assert.ok(M.stepLinks(ctx(), harm, h).some((l) => l.exit.id === "safety_open"));
});

test("drink or drugs: the medical line first, one optional tap, never a gate; bingeing: never not eating", () => {
  for (const w of ["drink", "drugs"]) {
    const s = run([pick("what", w), next]);
    assert.equal(s.stepId, "medical", w);
    assert.match(skill.copy.medical_title, /alcohol, benzos or opioids all at once can be dangerous/);
    assert.ok(M.canGoOn(ctx(), s), "Next without an answer");
    assert.equal(run([next], ctx(), s).stepId, "span");
  }
  const e = run([pick("what", "binge"), next]);
  assert.equal(e.stepId, "eating");
  assert.match(skill.copy.eating_title, /never means not eating/);
  assert.ok(M.canGoOn(ctx(), e));
  for (const w of ["smoke", "gamble", "spend", "scroll", "check", "porn"]) assert.equal(run([pick("what", w), next]).stepId, "span", w);
});

test("a carried flooded reading: a heads-up first, the body or ride it out, or make the plan anyway", () => {
  const h = run([pick("what", "drink"), next], FLOODED);
  assert.equal(h.stepId, "heads_up");
  assert.deepEqual(ids(h, "heads_up", FLOODED), ["settle", "plan"], "two choices in an acute state (T8)");
  const body = run([pick("heads_up", "settle"), next], FLOODED, h);
  assert.equal(body.stepId, "settle");
  assert.deepEqual(offers(body, FLOODED), ["cool_down", "urge_surfing"]);
  assert.equal(run([pick("heads_up", "plan"), next], FLOODED, h).stepId, "medical", "the medical line still comes for drink");
  assert.equal(run([pick("what", "hurt"), next], FLOODED).stepId, "harm", "hurting myself never waits behind a heads-up");
});

test("the stretch is the renewal's chips; the lapse plan is required, up to three", () => {
  const s = run([pick("what", "spend"), next]);
  assert.deepEqual(ids(s, "span"), ["hour", "tonight", "few_days", "this_week"]);
  assert.equal(M.canGoOn(ctx(), s), false, "a stretch is a commitment: pick one");
  const l = run([pick("span", "tonight"), next], ctx(), s);
  assert.equal(l.stepId, "lapse");
  assert.equal(M.canGoOn(ctx(), l), false, "the lapse plan is the point");
  assert.equal(M.stepOf(skill, "lapse").fields[0].max, 3);
  assert.equal(run([own("lapse", "Ring Jo")], ctx(), l).stepId, "lapse");
});

test("burning bridges and what leads back are per behaviour, optional; own words get the general ones", () => {
  const at = (w) => run([pick("what", w), next, ...(["drink", "drugs", "binge"].includes(w) ? [next] : []), pick("span", "hour"), next, pick("lapse", "tell"), next]);
  assert.equal(at("drugs").stepId, "burn");
  assert.deepEqual(ids(at("drugs"), "burn"), ["dealer", "stash", "people", "cash", "tell"]);
  assert.deepEqual(ids(at("check"), "burn"), ["bedroom", "mute", "logout", "history"]);
  assert.ok(ids(at("binge"), "burn").includes("meals"), "bingeing: regular meals, never fewer");
  const o = run([own("what", "Vaping at work"), next, pick("span", "hour"), next, pick("lapse", "tell"), next]);
  assert.deepEqual(ids(o, "burn"), ["stash", "easy", "routine", "tell"]);
  assert.ok(M.canGoOn(ctx(), at("gamble")), "optional");
  const r = run([next], ctx(), at("scroll"));
  assert.equal(r.stepId, "risky");
  assert.ok(ids(r, "risky").includes("phone_bed"));
  assert.ok(!ids(r, "risky").includes("payday"));
});

test("new bridges: never food, drink or shopping; the competing image is rehearsed for 30 s", () => {
  const b = run([pick("what", "binge"), next, next, pick("span", "hour"), next, pick("lapse", "tell"), next, next, next]);
  assert.equal(b.stepId, "build");
  const labels = skill.options.build.map((o) => o.label).join(" ");
  assert.doesNotMatch(labels, /eat|food|snack|drink|sweet|buy|shop/i);
  const img = run([pick("build", "image"), next], ctx(), b);
  assert.equal(img.stepId, "imagine");
  assert.equal(M.stepOf(skill, "imagine").props.seconds, 30);
  assert.equal(run([timed], ctx(), img).stepId, "reinforce");
  assert.equal(run([pick("build", "text"), next], ctx(), b).stepId, "reinforce");
});

test("the card, the check-in when the stretch ends (habit_renew, timed by the stretch), and the keep", () => {
  const card = run(TO_REMIND().slice(0, -1));
  assert.equal(card.stepId, "card");
  assert.deepEqual(M.stepOf(skill, "card").props, { field: "lapse", shape: "list", next: "card_next" });
  const r = run(TO_REMIND());
  assert.equal(r.stepId, "remind");
  const step = M.stepOf(skill, "remind");
  assert.deepEqual(M.followUpFor(ctx(), step, run([pick("remind", "yes")], ctx(), r)), { type: "habit_renew", chip: "few_days" });
  assert.equal(M.followUpFor(ctx(), step, run([pick("remind", "no")], ctx(), r)), null);
  const k = run([pick("remind", "yes"), next], ctx(), r);
  assert.equal(k.stepId, "keep");
  const kept = M.keepFor(ctx(), M.stepOf(skill, "keep"), run([pick("keepit", "keep")], ctx(), k));
  assert.equal(kept.kind, "abstinence_plan");
  assert.deepEqual(kept.value, { whatIds: ["gamble"], spanIds: ["few_days"], lapseIds: ["tell", "recommit"], buildIds: ["move"] });
  assert.equal(M.keepFor(ctx(), M.stepOf(skill, "keep"), run([pick("keepit", "not_now")], ctx(), k)), null);
  const end = run([pick("keepit", "keep"), next], ctx(), k);
  assert.equal(end.stepId, "end");
  assert.match(M.handoffLine(ctx(), M.stepOf(skill, "end"), end), /^It's in Me\. All in on not doing it, and a plan ready if you slip/);
  assert.deepEqual(offers(end), ["urge_surfing", "pros_cons"]);
});

test("the renewal: kept to it → the next stretch; a slip → the lapse plan first, then recommit; not ready → no shame", () => {
  const renew = M.stepOf(skill, "renew");
  assert.deepEqual(renew.reopens, { after: "remind", again: ["again"] });
  const booked = run([...TO_REMIND(), pick("remind", "yes"), next, pick("keepit", "keep"), next]);
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), booked), "renew");
  assert.equal(r?.stepId, "renew");
  assert.equal(M.resumeRun(ctx(), M.runRecord(ctx(), run(TO_REMIND().slice(0, -1))), "renew"), null, "a plan that never reached the check-in doesn't reopen");
  // Kept to it.
  const held = run([pick("renew", "held"), next], ctx(), r);
  assert.equal(held.stepId, "again");
  assert.deepEqual(M.followUpFor(ctx(), M.stepOf(skill, "again"), run([pick("again_span", "this_week")], ctx(), held)), { type: "habit_renew", chip: "this_week" });
  const heldEnd = run([pick("again_span", "this_week"), next], ctx(), held);
  assert.equal(M.handoffLine(ctx(), M.stepOf(skill, "again_end"), heldEnd), skill.copy.again_end_held);
  // A slip on gambling: the lapse plan they wrote, before anything else (PRD step 2).
  const slip = run([pick("renew", "slip"), next], ctx(), r);
  assert.equal(slip.stepId, "slipped");
  assert.equal(skill.copy.slipped_title, "A slip isn't a relapse. Here's what you planned.");
  assert.deepEqual(M.pickedLabels(ctx(), slip).lapse, ["Tell someone I trust", "Recommit straight away"], "the first visit's lapse plan");
  const again = run([read], ctx(), slip);
  assert.equal(again.stepId, "again");
  assert.equal(M.copyText(ctx(), M.stepOf(skill, "again").title, again), "What stretch can you keep from here?");
  const slipEnd = run([pick("again_span", "hour"), next], ctx(), again);
  assert.equal(M.handoffLine(ctx(), M.stepOf(skill, "again_end"), slipEnd), "You're choosing it again. A slip is information, not who you are.");
  assert.deepEqual(offers(slipEnd), ["urge_surfing"]);
  // Not ready.
  const stop = run([pick("renew", "stop"), next], ctx(), r);
  assert.equal(stop.stepId, "stop");
  assert.deepEqual(offers(stop), ["urge_surfing", "pros_cons"]);
  // The next stretch's card reopens again.
  const twice = M.resumeRun(ctx(), M.runRecord(ctx(), heldEnd), "renew");
  assert.equal(twice?.stepId, "renew");
  assert.equal(twice.answers.renew, undefined, "the renewal is asked fresh each time");
});

test("habit_renew: registered, deep link reopens at renew, never names the behaviour, resolved by opening, bound to habit-plan", () => {
  const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8"));
  const t = spine.content.followUpTypes.find((x) => x.id === "habit_renew");
  assert.equal(t.deepLinkTemplate, "/tool/habit-plan?run={sourceSessionId}&at=renew&followUp={followUpId}");
  assert.deepEqual(Object.keys(t.window.chips).sort(), ["few_days", "hour", "this_week", "tonight"]);
  assert.doesNotMatch(JSON.stringify([t.copy, t.notification]), /drink|drug|gambl|binge|smok|spend|porn|habit/i);
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /OPEN_RESOLVES = \[[^\]]*'habit_renew'/);
  assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), /habit_renew: 'habit-plan'/);
  assert.match(readFileSync("schema/practice-spine.cypher", "utf8"), /MERGE \(t:FollowUpType \{id: "habit_renew"\}\)/);
});

test("abstinence_plan: a profile kind, own words encrypted, never self-harm, and Me names it through the skill", async () => {
  const { PROFILE_KINDS } = await importTs("functions/src/profile/kinds.ts");
  const k = PROFILE_KINDS.abstinence_plan;
  assert.equal(k.area, "my_plans");
  assert.ok(k.many);
  assert.deepEqual(k.ownFields, ["whatOwn", "lapseOwn", "burnOwn", "riskyOwn", "buildOwn", "reinforceOwn"]);
  assert.deepEqual(k.validate({ whatIds: ["drink"], spanIds: ["hour"], lapseIds: ["tell"] }), { whatIds: ["drink"], spanIds: ["hour"], lapseIds: ["tell"] });
  assert.throws(() => k.validate({ whatIds: ["hurt"], lapseIds: ["tell"] }), /Not a habit plan/);
  assert.throws(() => k.validate({ whatIds: ["drink"] }), /lapse plan/);
  assert.throws(() => k.validate({ whatIds: ["drink"], lapseIds: ["tell"], spanOwn: "forever" }));
  assert.throws(() => k.validate({ whatIds: ["drink"], lapseIds: ["tell"], urgeIds: ["use"] }));
  const lines = H.habitPlanLines({ whatIds: ["drink"], lapseIds: ["tell"], lapseOwn: "Ring Jo", buildIds: ["cold"] }, {
    ...skill, options: Object.fromEntries(Object.entries(skill.options)),
  });
  assert.deepEqual(lines, { what: "Drinking", craving: ["Cold water, or hold something cold"], slip: ["Tell someone I trust", "Ring Jo"] });
  assert.equal(H.habitPlanLines({ whatOwn: "Vaping", whatIds: [] }, skill).what, "Vaping");
});

test("hosts: Hold to wait's next card and Ride it out's end cards offer it for the use and check pulls", () => {
  const htw = content.skills.find((s) => s.id === "hold_to_wait");
  assert.equal(htw.exits.find((x) => x.id === "habit_plan")?.toolId, "habit-plan");
  assert.ok(M.stepOf(htw, "next").offers.some((o) => o.exit === "habit_plan" && JSON.stringify(o.when) === JSON.stringify({ in: ["$a.pull", ["use", "check"]] })));
  const rio = content.skills.find((s) => s.id === "ride_it_out");
  assert.equal(rio.exits.find((x) => x.id === "habit_plan")?.toolId, "habit-plan");
  for (const id of ["end", "passed"])
    assert.ok(M.stepOf(rio, id).offers.some((o) => o.exit === "habit_plan" && JSON.stringify(o.when) === JSON.stringify({ in: ["$a.pull", ["use", "check"]] })), id);
});

test("talk to someone now on every screen; nothing counts days or calls a slip a failure", () => {
  for (const st of skill.steps) {
    if (st.kind === "embed" || st.kind === "handoff") assert.ok((st.links ?? []).some((l) => l.exit === "safety_open"), st.id);
    else assert.ok(st.fields.every((f) => (f.links ?? []).some((l) => l.exit === "safety_open")), st.id);
  }
  const words = JSON.stringify([skill.copy, Object.values(skill.options).flat().map((o) => o.label)]);
  assert.doesNotMatch(words, /\bfail|relapsed|days clean|sober for|start again from|back to zero|weak/i);
});

test("a slip on drink or drugs (or own words): the overdose risk first, with the medical banner, then the lapse plan", () => {
  const drink = [pick("what", "drink"), next, next, pick("span", "tonight"), next, pick("lapse", "tell"), next, next, next, pick("build", "text"), next, next, read, pick("remind", "yes"), next];
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), run(drink)), "renew");
  const a = run([pick("renew", "slip"), next], ctx(), r);
  assert.equal(a.stepId, "after_use");
  assert.match(skill.copy.after_use_hint, /emergency help if someone's hard to wake/);
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "after_use"), a)?.variant, "medical");
  assert.ok(M.canGoOn(ctx(), a), "optional");
  assert.equal(run([next], ctx(), a).stepId, "slipped");
  assert.equal(M.copyText(ctx(), M.stepOf(skill, "span").title, run([pick("what", "drugs"), next, next])), skill.copy.span_title_sub, "a doctor's plan counts");
  assert.match(skill.copy.medical_hint, /seizure after stopping: get help now/);
});

test("bingeing: no chip that echoes purging, restriction or compensation", () => {
  const b = (n) => run([pick("what", "binge"), next, next, pick("span", "hour"), next, ...n]);
  const lapse = ids(b([]), "lapse");
  assert.ok(lapse.includes("next_meal") && !lapse.includes("rid") && !lapse.includes("recommit"), lapse.join());
  const risky = ids(b([pick("lapse", "tell"), next, next]), "risky");
  assert.ok(!risky.includes("one") && !risky.includes("spare"), risky.join());
  const build = ids(b([pick("lapse", "tell"), next, next, next]), "build");
  assert.ok(!build.includes("move"), build.join());
  assert.ok(ids(run([pick("what", "gamble"), next, pick("span", "hour"), next]), "lapse").includes("rid"), "other behaviours keep them");
});
