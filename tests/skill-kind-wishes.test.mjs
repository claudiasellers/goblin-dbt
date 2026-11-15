// Kind wishes (PRD MF-06 loving-kindness; docs/design/kind-wishes.md) on the skill runtime: who, the wishes, the offer
// one wish at a time, what came up, and backdraft held. Tested through the same pure machine the player runs, plus the
// offer's pure lines.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const K = await importTs("src/lib/kindWishes.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "kind_wishes");
const embedOutputs = {
  wishOffer: { ids: ["offered", "partly", "skipped"], measures: ["durationSec", "doneCount"] },
  bodyCard: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
};
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn: M.contextIn(skill, ctxIn), embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const offered = { type: "embedDone", output: { ids: ["offered"], durationSec: 60, doneCount: 3 } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const step = (id) => M.stepOf(skill, id);
const title = (s, c = ctx()) => M.copyText(c, step(s.stepId).title, s, M.titleSlots(c, step(s.stepId), s));
const ids = (s, fid, c = ctx()) => {
  const f = M.shownFields(c, step(s.stepId), s).find((x) => x.id === fid);
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const links = (s, c = ctx()) => {
  const st = step(s.stepId);
  return [...M.stepLinks(c, st, s), ...M.shownFields(c, st, s).flatMap((f) => M.fieldLinks(c, f, s))].map((l) => l.exit.id);
};
const WISH = [pick("wishes", "safe"), pick("wishes", "rest"), next];
const to = (who) => [pick("who", who), next];

test("the skill: the kind-wishes tool on the new dbt_loving_kindness, listed under Mindfulness with its intent; a kind_wishes rep", () => {
  assert.equal(skill.toolId, "kind-wishes");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_loving_kindness"\}\), \(s:Skill \{id: "kind_wishes"\}\)/);
  assert.match(readFileSync("schema/knowledge-graph.cypher", "utf8"), /MERGE \(loving_kindness:TherapyConcept \{id: "dbt_loving_kindness"\}\)[^;]*module: "Mindfulness"/);
  assert.match(readFileSync("schema/relationships.cypher", "utf8"), /\{id: "dbt_loving_kindness"\}\), \(mod:TherapyConcept \{id: "dbt_mindfulness_module"\}\)\nMERGE \(c\)-\[:PART_OF\]->\(mod\)/);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_loving_kindness", t: "kind-wishes"\}/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'kind-wishes': 'kind_wishes',/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'kind-wishes',\s+name: 'Kind wishes',[\s\S]*?module: 'mindfulness'/);
  assert.match(tools, /toolId: 'kind-wishes'/);
  const ps = readFileSync("scripts/practice-spine/content.py", "utf8");
  assert.match(ps, /\("kind_wishes", "Loving kindness", "Preliminary", "mind", "dbt_loving_kindness",[\s\S]*?\["kind-wishes"\]\)/);
  assert.match(ps, /\("kind_wishes", 7, "Kind wishes", \[\]\)/, "the Practice home's sequence, last");
  for (const id of ["end", "twice"]) assert.equal(step(id).noClose, true, id);
});

test("who: the PRD's tiers in order; stirred lists easy and neutral; Talk to someone now on every screen", () => {
  const s0 = M.initialRun(skill);
  assert.deepEqual(ids(s0, "who"), ["easy", "neutral", "self", "difficult", "everyone"]);
  const st = ctx({ band: "stirred" });
  assert.deepEqual(ids(s0, "who", st), ["easy", "neutral"], "everyone can include someone difficult: steady only");
  assert.match(M.handoffLine(st, step("who"), s0), /wishes for yourself or someone difficult can wait/);
  assert.ok(!M.handoffLine(ctx(), step("who"), s0));
  for (const st2 of skill.steps) {
    const hasSafety = (st2.links ?? []).some((l) => l.exit === "safety_open") || (st2.fields ?? []).some((f) => (f.links ?? []).some((l) => l.exit === "safety_open"))
      || (st2.offers ?? []).some((o) => o.exit === "safety_open");
    assert.ok(hasSafety, st2.id);
  }
});

test("a carried flooded reading: the heads-up before anyone is picked, someone easy only, the body and the hand as links; never a lock", () => {
  const fl = ctx({ band: "flooded" });
  const s0 = M.initialRun(skill);
  assert.equal(s0.stepId, "who");
  assert.equal(title(s0, fl), "Kind wishes work best on a calmer day.");
  assert.match(M.handoffLine(fl, step("who"), s0), /Settle it first, or offer them to someone easy/);
  assert.deepEqual(ids(s0, "who", fl), ["easy"]);
  assert.deepEqual(links(s0, fl), ["cool_down", "held_hand", "safety_open"]);
  assert.deepEqual(links(s0), ["safety_open"], "no body links on a calm day");
  assert.equal(run(to("easy"), fl).stepId, "wishes");
  assert.equal(skill.exits.find((e) => e.id === "cool_down").label, "body_first");
});

test("someone difficult: asked whether they hurt you; yes or not sure → never warmth toward them (other_person, Ending careful)", () => {
  const check = run(to("difficult"));
  assert.equal(check.stepId, "check");
  assert.equal(title(check), "Has this person ever threatened you, scared you or hurt you, or could they?");
  assert.deepEqual(ids(check, "check"), ["no", "yes", "unsure"]);
  assert.equal(run([pick("check", "no"), next], ctx(), check).stepId, "wishes");
  for (const v of ["yes", "unsure"]) {
    const not = run([pick("check", v), next], ctx(), check);
    assert.equal(not.stepId, "not_them", v);
    assert.ok(step("not_them").crisis.some((c) => c.variant === "other_person"));
    assert.ok(links(not).includes("ending_careful"));
    assert.ok(links(not).includes("safety_open"));
  }
  const self = run([pick("check", "yes"), next, pick("instead", "self"), next], ctx(), check);
  assert.equal(title(self), "Pick up to three wishes for yourself.");
  assert.equal(run(WISH, ctx(), self).stepId, "offer_self");
  const easyW = run([pick("check", "unsure"), next, pick("instead", "easy"), next], ctx(), check);
  assert.equal(title(easyW), "Pick up to three wishes for someone easy.");
  const easy = run(WISH, ctx(), easyW);
  assert.equal(easy.stepId, "offer_other");
  assert.match(title(easy), /Picture someone easy/);
  // Not today: a real answer, no rep, the resources still there.
  const stop = run([pick("check", "yes"), next, pick("instead", "stop"), next], ctx(), check);
  assert.equal(stop.stepId, "stop_safe");
  assert.equal(step("stop_safe").complete, false);
  assert.ok(step("stop_safe").crisis.some((c) => c.variant === "other_person"));
  assert.deepEqual(M.offersFor(ctx(), step("stop_safe"), stop), ["ending_careful", "held_hand"]);
  // An answer left behind by Back never steers: back to the check, *No*, and the wishes are for them, not for me.
  const viaBack = run([pick("check", "yes"), next, pick("instead", "self"), next, { type: "back" }, { type: "back" }, pick("check", "no"), next], ctx(), check);
  assert.equal(viaBack.stepId, "wishes");
  assert.equal(title(viaBack), "Pick up to three wishes for them.");
  assert.equal(run(WISH, ctx(), viaBack).stepId, "offer_other");
  assert.deepEqual(skill.exits.find((e) => e.id === "ending_careful").query, { frame: "careful" });
});

test("the wishes and the offer: up to three or own words; May you / May I / May everyone around me, one at a time", () => {
  assert.deepEqual(ids(run(to("easy")), "wishes"), ["safe", "ease", "cared", "rest", "free"]);
  assert.equal(run([...to("easy"), ...WISH]).stepId, "offer_other");
  assert.equal(run([...to("self"), ...WISH]).stepId, "offer_self");
  assert.equal(run([...to("everyone"), ...WISH]).stepId, "offer_all");
  assert.equal(run([...to("neutral"), own("wishes", "sleep well"), next]).stepId, "offer_other", "own words alone are enough");
  // Own words finish the tier's line, and the screen says so.
  const w = (who) => run(to(who));
  assert.match(M.handoffLine(ctx(), step("wishes"), w("easy")), /finish the line "May you…"/);
  assert.match(M.handoffLine(ctx(), step("wishes"), w("self")), /finish the line "May I…"/);
  assert.match(M.handoffLine(ctx(), step("wishes"), w("everyone")), /Leave out anyone who hurts or scares you/);
  assert.equal(skill.copy.wish_own, "My own wish");
  const lineOf = (id) => skill.copy[step(id).props.line];
  assert.equal(lineOf("offer_other"), "May you {wish}.");
  assert.equal(lineOf("offer_self"), "May I {wish}.");
  assert.equal(lineOf("offer_all"), "May everyone around me {wish}.");
  for (const id of ["offer_other", "offer_self", "offer_all", "offer_again"]) {
    assert.equal(step(id).embed, "wishOffer");
    assert.equal(step(id).props.wishes, "wishes");
  }
  assert.equal(skill.copy.offer_hint, "The wishes don't need to feel true. Offering them is the practice.");
  // The offer's lines.
  assert.deepEqual(K.wishLines(["Be safe", "Rest", "sleep well"], "May you {wish}."), ["May you be safe.", "May you rest.", "May you sleep well."]);
  assert.deepEqual(K.wishLines(["Be at ease"], "May I {wish}."), ["May I be at ease."]);
  assert.deepEqual(K.wishLines(["may you find peace", "May they be well!", "  "], "May you {wish}."), ["May you find peace.", "May they be well!"]);
  // Own words that already say who: shown as typed, capitalised, never garbled into the template.
  assert.deepEqual(K.wishLines(["I am enough", "i'm okay", "you deserve rest", "everyone gets home safe."], "May I {wish}."),
    ["I am enough.", "I'm okay.", "You deserve rest.", "Everyone gets home safe."]);
  assert.deepEqual(K.wishLines(["Happiness", "Feel loved"], "May you {wish}."), ["May you happiness.", "May you feel loved."]);
  // The step back to someone easier: chip picks only (own words come last), the fallback when there are none.
  assert.deepEqual(K.offerWishes(["Be safe", "forgive myself"], 1, true, "Be at ease"), ["Be safe"]);
  assert.deepEqual(K.offerWishes(["forgive myself"], 0, true, "Be at ease"), ["Be at ease"]);
  assert.deepEqual(K.offerWishes(["Be safe", "forgive myself"], 1, false, "Be at ease"), ["Be safe", "forgive myself"]);
  assert.deepEqual(K.offerWishes([], 0, false, ""), []);
  assert.deepEqual([step("offer_again").props.chipsOnly, skill.copy[step("offer_again").props.fallback]], [1, "Be at ease"]);
  assert.equal(step("offer_other").props.chipsOnly, undefined);
  assert.deepEqual(K.wishLines(undefined, "May you {wish}."), []);
  assert.deepEqual([K.offerResult(3, 3), K.offerResult(3, 1), K.offerResult(3, 0), K.offerResult(0, 0)], ["offered", "partly", "skipped", "skipped"]);
});

test("what came up: warmth or nothing much ends; sadness or stirred is backdraft, named, with the hand, someone easier or stop", () => {
  const came = run([...to("self"), ...WISH, offered]);
  assert.equal(came.stepId, "came");
  assert.deepEqual(ids(came, "came"), ["warmth", "nothing", "sad", "stirred", "undeserved"]);
  assert.deepEqual(ids(run([...to("easy"), ...WISH, offered]), "came"), ["warmth", "nothing", "sad", "stirred"], "I don't deserve it: the self tier only");
  const deserve = run([pick("came", "undeserved"), next], ctx(), came);
  assert.equal(deserve.stepId, "backdraft");
  assert.match(M.handoffLine(ctx(), step("backdraft"), deserve), /You don't have to deserve it/);
  const end = run([pick("came", "nothing"), next], ctx(), came);
  assert.equal(end.stepId, "end");
  assert.equal(title(end), "You offered kind wishes. That's the practice.", "reps, never feelings");
  const back = run([pick("came", "sad"), next], ctx(), came);
  assert.equal(back.stepId, "backdraft");
  assert.equal(title(back), "That's common. Warmth can wake old hurts.");
  assert.equal(M.handoffLine(ctx(), step("backdraft"), back), "It's called backdraft, and it isn't failure.");
  assert.deepEqual(ids(back, "step_down"), ["hand", "easier", "stop"]);
  const hand = run([pick("step_down", "hand"), next], ctx(), back);
  assert.equal(hand.stepId, "hand");
  assert.equal(step("hand").props.kind, "hand_heart");
  assert.equal(run([{ type: "embedDone", output: { ids: ["done"], durationSec: 30 } }], ctx(), hand).stepId, "end");
  const stop = run([pick("step_down", "stop"), next], ctx(), back);
  assert.equal(title(stop), "You stopped when it got heavy. That's looking after yourself.");
  assert.match(M.handoffLine(ctx(), step("end"), stop), /someone easy is a good place to begin/);
  // The next step only where there is one.
  const fine = (who) => run([...to(who), ...WISH, offered, pick("came", "warmth"), next]);
  assert.match(M.handoffLine(ctx(), step("end"), fine("easy")), /someone a little less easy/);
  assert.equal(M.handoffLine(ctx(), step("end"), fine("everyone")), "Next time, try them in your own words.");
  assert.equal(M.handoffLine(ctx(), step("end"), run([...to("difficult"), pick("check", "no"), next, ...WISH, offered, pick("came", "warmth"), next])), "Next time, try them in your own words.");
  // From someone easy, there's no easier step.
  const easyBack = run([...to("easy"), ...WISH, offered, pick("came", "stirred"), next]);
  assert.deepEqual(ids(easyBack, "step_down"), ["hand", "stop"]);
});

test("a skipped offer is no practice: straight to Not this time, no rep and nothing asked", () => {
  const skipped = { type: "embedDone", output: { ids: ["skipped"], durationSec: 2, doneCount: 0 } };
  for (const who of ["easy", "self", "everyone"]) {
    const s = run([...to(who), ...WISH, skipped]);
    assert.equal(s.stepId, "skip_end", who);
  }
  assert.equal(step("skip_end").complete, false);
  assert.equal(title(run([...to("easy"), ...WISH, skipped])), "Not this time.");
  // After a first offer, a skip of the step back still ends on the first offer's rep, without asking again.
  const again = run([...to("self"), ...WISH, offered, pick("came", "sad"), next, pick("step_down", "easier"), next]);
  assert.equal(run([skipped], ctx(), again).stepId, "end");
});

test("two backdraft closes in a row: easy next time and talking it through, with the hand and someone to talk to", () => {
  const back = run([...to("self"), ...WISH, offered, pick("came", "stirred"), next]);
  const again = run([pick("step_down", "easier"), next], ctx(), back);
  assert.equal(again.stepId, "offer_again");
  assert.equal(skill.copy[step("offer_again").props.line], "May you {wish}.");
  const came2 = run([offered], ctx(), again);
  assert.equal(came2.stepId, "came_again");
  const ok = run([pick("came_again", "warmth"), next], ctx(), came2);
  assert.equal(ok.stepId, "end");
  assert.match(M.handoffLine(ctx(), step("end"), ok), /someone easy is a good place to begin/);
  const twice = run([pick("came_again", "sad"), next], ctx(), came2);
  assert.equal(twice.stepId, "twice");
  assert.match(M.handoffLine(ctx(), step("twice"), twice), /talking through with someone you trust/);
  assert.deepEqual(M.offersFor(ctx(), step("twice"), twice), ["held_hand", "safety_open"]);
  const hand = skill.exits.find((e) => e.id === "held_hand");
  assert.deepEqual([hand.query, hand.label], [{ enterAt: "hand" }, "hand_offer"]);
  assert.match(readFileSync("scripts/skills/kind_wishes.py", "utf8"), /"id": "held_hand", "toolId": "soothe"/);
});

test("copy: no rating scale, no counts, no should, secular wishes", () => {
  const all = JSON.stringify(skill.copy) + JSON.stringify(Object.values(skill.options).flat().map((o) => o.label));
  assert.doesNotMatch(all, /\bshould\b|streak|\bjust\b|bless|pray|God/i);
});
