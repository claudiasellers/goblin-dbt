// Find your people (PRD IE-09, DBT IE Handouts 10–11; docs/design/find-your-people.md) on the skill runtime, part 1:
// where to start, one small step (smallest only on a stirred reading), the prediction, when, the reach_out_outcome card
// that reopens the run at *Did you do it?*, the gap in one flat sentence, and the Interaction {kind: 'reach_out'}.
// Tested through the pure machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "finding_connection");
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs: { holdRing: { ids: ["held", "partly", "skipped"] } }, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const held = { type: "embedDone", output: { ids: ["held"] } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const title = (s, c = ctx()) => M.copyText(c, M.stepOf(skill, s.stepId).title, s, M.titleSlots(c, M.stepOf(skill, s.stepId), s));
const line = (s, c = ctx()) => M.handoffLine(c, M.stepOf(skill, s.stepId), s);
const values = (s, fieldId, c = ctx()) => {
  const f = M.stepOf(skill, s.stepId).fields.find((x) => x.id === fieldId);
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s);

const TO_PREDICT = (area = "friend", step = "friend_thought", c = ctx()) => run([pick("area", area), next, pick("step", step), next], c);
const booked = (predict = "badly", liking = "not_much", c = ctx()) =>
  run([pick("predict", predict), ...(liking ? [pick("liking", liking)] : []), next, held, pick("when", "tomorrow"), pick("remind", "yes"), next], c, TO_PREDICT("friend", "friend_thought", c));
const reopened = (b = booked(), c = ctx()) => M.resumeRun(c, M.runRecord(c, b), "back");

test("the skill: tool finding-connection, the new concept dbt_building_relationships, no close question, listed under IE", () => {
  assert.equal(skill.toolId, "finding-connection");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_building_relationships"\}\), \(s:Skill \{id: "finding_connection"\}\)/);
  assert.match(readFileSync("schema/knowledge-graph.cypher", "utf8"), /MERGE \(building_relationships:TherapyConcept \{id: "dbt_building_relationships"\}\)/);
  assert.match(readFileSync("schema/relationships.cypher", "utf8"), /\{id: "dbt_building_relationships"\}\), \(mod:TherapyConcept \{id: "dbt_interpersonal_effectiveness"\}\)\nMERGE \(c\)-\[:PART_OF\]->\(mod\);/);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_building_relationships", t: "finding-connection"\}/);
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'finding-connection': \{ module: 'ie', closeKind: 'none' \}/);
  assert.match(readFileSync("src/lib/spine/close.ts", "utf8"), /'finding-connection': \{ module: 'ie', closeKind: 'none' \}/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'finding-connection',\n\s+name: 'Find your people',[\s\S]*?module: 'interpersonal-effectiveness'/);
  assert.match(tools, /label: 'Feel less alone', toolId: 'finding-connection'/, "the PRD's Tools intent");
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'finding-connection': 'finding_connection'/);
  assert.deepEqual(skill.accepts, ["band", "frame"]);
});

test("where to start: the five areas of H10–11, each with its own steps, smallest first", () => {
  const s = M.initialRun(skill);
  assert.equal(title(s), "Where do you want to start?");
  assert.deepEqual(values(s, "area"), ["around", "like_me", "talk", "friend", "join"]);
  for (const area of values(s, "area")) {
    const st = run([pick("area", area), next]);
    assert.equal(st.stepId, "step");
    const vs = values(st, "step");
    assert.ok(vs.length >= 4, area);
    const tiers = vs.map((v) => skill.options.step.find((o) => o.value === v).tier);
    for (const v of vs) assert.equal(skill.options.step.find((o) => o.value === v).area, area, v);
    assert.deepEqual(tiers, [...tiers].sort(), `${area}: smallest first`);
    assert.equal(tiers[0], 1);
  }
  assert.equal(M.stepOf(skill, "step").fields[0].own.countsAsPick, true, "own words are the escape hatch");
});

test("the band: stirred sees the smallest only; flooded gets the body first or a small one anyway; never a lock", () => {
  const stirred = ctx({ band: "stirred" });
  const st = run([pick("area", "talk"), next], stirred);
  const small = values(st, "step", stirred);
  assert.ok(small.length >= 2);
  for (const v of small) assert.equal(skill.options.step.find((o) => o.value === v).tier, 1, v);
  assert.ok(small.length < values(run([pick("area", "talk"), next]), "step").length);
  assert.equal(line(st, stirred), "The smallest ones for now. Bigger ones are here on a steadier day.");
  assert.equal(line(run([pick("area", "talk"), next])), "Smallest first. A small one done counts for more than a big one planned.", "steady: the general hint");
  assert.equal(M.stepOf(skill, "step").hint, undefined, "one line above the chips, never the low line and the hint twice");
  const joinLow = values(run([pick("area", "join"), next], stirred), "step", stirred);
  assert.ok(joinLow.length >= 2, "every area has a real choice at the smallest size");
  const fl = ctx({ band: "flooded" });
  const h = run([pick("area", "friend"), next], fl);
  assert.equal(h.stepId, "heads_up");
  const settle = run([pick("heads_up", "settle"), next], fl, h);
  assert.equal(settle.stepId, "settle");
  assert.deepEqual(offers(settle, fl), ["cool_down"]);
  const tried = run([pick("heads_up", "try"), next], fl, h);
  assert.equal(tried.stepId, "step");
  for (const v of values(tried, "step", fl)) assert.equal(skill.options.step.find((o) => o.value === v).tier, 1, v);
});

test("every step is an outward action: no reassurance-seeking, no venting (PRD risks)", () => {
  const text = skill.options.step.map((o) => o.label).join(" | ");
  assert.doesNotMatch(text, /still like|if they like|are you mad|reassur|vent|complain|tell them how bad|unload/i);
  const all = [...Object.values(skill.copy), ...Object.values(skill.options).flat().map((o) => o.label)].join(" | ");
  assert.doesNotMatch(all, /!|\bshould\b|\bjust\b|\bbut\b/i, "the voice");
});

test("predict: how it'll go is asked, the liking guess is optional; then when books reach_out_outcome on the yes", () => {
  const p = TO_PREDICT();
  assert.equal(p.stepId, "predict");
  assert.deepEqual(values(p, "predict"), ["well", "mixed", "badly", "no_answer"]);
  assert.deepEqual(values(p, "liking"), ["not_much", "some", "a_lot"]);
  const pic = run([pick("predict", "mixed"), next], ctx(), p);
  assert.equal(pic.stepId, "picture", "the liking guess can be left");
  const hold = M.stepOf(skill, "picture");
  assert.deepEqual([hold.embed, hold.props.variant, hold.props.seconds], ["holdRing", "timed", 15]);
  assert.doesNotMatch(skill.copy.picture_hint, /breath/i);
  const w = run([held], ctx(), pic);
  assert.equal(w.stepId, "when");
  const step = M.stepOf(skill, "when");
  assert.deepEqual(M.followUpFor(ctx(), step, run([pick("when", "evening"), pick("remind", "yes")], ctx(), w)), { type: "reach_out_outcome", chip: "evening" });
  assert.equal(M.followUpFor(ctx(), step, run([pick("when", "evening")], ctx(), w)), null, "no yes, no card");
  const set = run([pick("when", "tomorrow"), pick("remind", "yes"), next], ctx(), w);
  assert.equal(set.stepId, "set");
  assert.equal(title(set), "Your step: Send someone a message that says you thought of them.");
  assert.equal(line(set), "I'll ask how it went. Doing it is the experiment; how it goes is information, not a verdict about you.");
  assert.equal(line(run([pick("when", "tomorrow"), next], ctx(), w)), "Doing it is the experiment. How it goes is information, not a verdict about you.");
});

test("reach_out_outcome: registered, the deep link reopens at back, content-free, resolved by opening, bound to the tool", () => {
  const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8"));
  const t = spine.content.followUpTypes.find((x) => x.id === "reach_out_outcome");
  assert.equal(t.deepLinkTemplate, "/tool/finding-connection?run={sourceSessionId}&at=back&followUp={followUpId}");
  assert.deepEqual(skill.options.when.map((o) => o.value).sort(), Object.keys(t.window.chips).sort(), "each when is a chip");
  assert.doesNotMatch(JSON.stringify(t.copy), /message|friend|group|class/i, "never names the step");
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /OPEN_RESOLVES = \[[^\]]*'reach_out_outcome'/);
  assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), /reach_out_outcome: 'finding-connection'/);
  assert.match(readFileSync("schema/practice-spine.cypher", "utf8"), /MERGE \(t:FollowUpType \{id: "reach_out_outcome"\}\)/);
});

test("back: did you do it? names the step, asked fresh; a run that never reached when doesn't reopen", () => {
  assert.deepEqual(M.stepOf(skill, "back").reopens, { after: "when" });
  const r = reopened();
  assert.equal(r?.stepId, "back");
  assert.equal(title(r), "Earlier you picked: Send someone a message that says you thought of them. Your guess: Badly.", "the guess reads back before the check");
  assert.equal(r.answers.happened, undefined);
  assert.deepEqual(r.answers.predict.ids, ["badly"], "the prediction reads back, so the gap can be worked out");
  assert.equal(M.resumeRun(ctx(), M.runRecord(ctx(), TO_PREDICT()), "back"), null);
});

const gap = (predict, went, liking = null, liked = null) => {
  const r = reopened(booked(predict, liking));
  return run([pick("happened", "did"), next, pick("went", went), ...(liked ? [pick("liked", liked)] : []), next], ctx(), r);
};

test("the gap, in one flat sentence: better, same, worse; a bad outcome is never proof, predicted or not", () => {
  const better = gap("badly", "well");
  assert.equal(better.stepId, "gap");
  assert.equal(title(better), "It went better than you predicted.");
  assert.equal(line(better), "That gap is worth noticing.");
  assert.equal(title(gap("no_answer", "mixed")), "It went better than you predicted.", "someone responded");
  const same = gap("mixed", "mixed");
  assert.equal(title(same), "It went about how you predicted.");
  assert.equal(line(same), "Each try tells you a bit more about how people actually respond.");
  const worse = gap("well", "badly");
  assert.equal(worse.stepId, "gap_hard");
  assert.equal(title(worse), "It went worse than you predicted.");
  assert.equal(line(worse), "One try is information, not a verdict about you.");
  assert.deepEqual(offers(worse), ["recover"]);
  assert.deepEqual(offers(gap("well", "mixed")), [], "Recover only when it went badly");
  // Gate 3: predicted badly and it went badly is never read back as confirmation.
  const hard = gap("badly", "badly");
  assert.equal(title(hard), "That was hard, and you did it.");
  assert.equal(line(hard), "One try is information, not a verdict about you.");
  assert.deepEqual(offers(hard), ["recover"]);
  // Gate 3: predicted no response, and a response that went badly, is never "better".
  const noBad = gap("no_answer", "badly");
  assert.equal(title(noBad), "You did it.");
  assert.equal(line(noBad), "One try is information, not a verdict about you.");
  const none = gap("well", "no_answer");
  assert.equal(title(none), "No response yet.", "no reply is never called worse");
  assert.equal(line(none), "People miss messages, get busy, forget. It says little about you.");
  assert.equal(title(gap("badly", "no_answer")), "No response yet.");
});

test("the rehearsal names the step and shows its guidance on screen", () => {
  const st = run([held], ctx(), run([pick("predict", "mixed"), next], ctx(), TO_PREDICT()));
  const pic = run([pick("predict", "mixed"), next], ctx(), TO_PREDICT());
  assert.equal(pic.stepId, "picture");
  assert.equal(title(pic), "Picture it for a few seconds: Send someone a message that says you thought of them.");
  assert.equal(skill.copy[M.stepOf(skill, "picture").hint], "Where you are, the first thing you do or say, and you doing it anyway if it feels awkward.");
  assert.equal(st.stepId, "when");
});

test("after a rejection or no reply the safety link says I might hurt myself; otherwise Talk to someone now", () => {
  const link = (st) => M.stepLinks(ctx(), M.stepOf(skill, st.stepId), st).map((l) => ({ exit: l.exit.id, label: l.label }));
  for (const [p, w] of [["well", "badly"], ["badly", "badly"], ["well", "no_answer"]]) {
    const st = gap(p, w);
    assert.equal(st.stepId, "gap_hard");
    assert.deepEqual(link(st).map((l) => [l.exit, l.label]), [["safety_open", "I might hurt myself"]]);
  }
  const ok = gap("mixed", "well");
  assert.equal(ok.stepId, "gap");
  assert.deepEqual(link(ok).map((l) => l.label), ["Talk to someone now"]);
});

test("the liking gap: shown only when the person's own answers show it; a bad outcome keeps its line", () => {
  const LINE = "They seemed to like you more than you guessed. People often guess low on that.";
  assert.equal(line(gap("mixed", "mixed", "not_much", "some")), LINE);
  assert.equal(line(gap("badly", "well", "some", "a_lot")), LINE);
  assert.notEqual(line(gap("mixed", "mixed", "some", "some")), LINE);
  assert.notEqual(line(gap("mixed", "mixed", "a_lot", "some")), LINE);
  assert.notEqual(line(gap("mixed", "mixed", "not_much", "cant_tell")), LINE);
  assert.notEqual(line(gap("mixed", "mixed", null, "a_lot")), LINE, "no guess, no gap");
  assert.equal(line(gap("well", "badly", "not_much", "a_lot")), "One try is information, not a verdict about you.");
  assert.equal(line(gap("badly", "badly", "not_much", "a_lot")), "One try is information, not a verdict about you.");
});

test("a step with nobody on the other end asks no liking questions and has no 'no one will respond'", () => {
  const solo = run([pick("area", "around"), next, pick("step", "around_cafe"), next]);
  assert.equal(solo.stepId, "predict_solo");
  assert.deepEqual(values(solo, "predict"), ["well", "mixed", "badly"]);
  assert.equal(M.stepOf(skill, "predict_solo").fields.length, 1);
  const b = run([pick("predict", "mixed"), next, held, pick("when", "tomorrow"), pick("remind", "yes"), next], ctx(), solo);
  const went = run([pick("happened", "did"), next], ctx(), M.resumeRun(ctx(), M.runRecord(ctx(), b), "back"));
  assert.equal(went.stepId, "went_solo");
  assert.deepEqual(values(went, "went"), ["well", "mixed", "badly"]);
  assert.equal(TO_PREDICT("join", "join_help").stepId, "predict", "offering to help has someone on the other end");
  assert.equal(run([pick("area", "friend"), next, own("step", "Text Sam"), next]).stepId, "predict", "own words: asked");
});

test("a bigger step picked on a steady day survives its card opened on a stirred one (Codex on #114)", () => {
  const b = run([pick("predict", "well"), next, held, pick("when", "tomorrow"), pick("remind", "yes"), next], ctx(), TO_PREDICT("friend", "friend_invite"));
  const stirred = ctx({ band: "stirred" });
  const r = M.resumeRun(stirred, M.runRecord(stirred, b), "back");
  assert.equal(r.stepId, "back");
  assert.deepEqual(r.answers.step.ids, ["friend_invite"]);
  assert.equal(title(r, stirred), "Earlier you picked: Invite someone to something low-key. Your guess: Well.");
  const smaller = run([pick("happened", "not_yet"), next, pick("again", "smaller"), next], stirred, r);
  assert.equal(smaller.stepId, "step");
  assert.ok(!values(smaller, "step", stirred).includes("friend_invite"), "a smaller step is still the smallest");
});

test("pick a smaller step: the smallest only, whatever the band", () => {
  const again = run([pick("happened", "not_yet"), next], ctx(), reopened(booked()));
  const st = run([pick("again", "smaller"), next], ctx(), again);
  assert.equal(st.stepId, "step");
  for (const v of values(st, "step")) assert.equal(skill.options.step.find((o) => o.value === v).tier, 1, v);
  assert.equal(line(st), "The smallest ones. Any of these counts.");
});

test("frames: after a no or an ending the steps are for other people; a low-energy check-in sees the smallest", async () => {
  const el = ctx({ frame: "elsewhere" });
  assert.equal(line(M.initialRun(skill), el), "This is about other people in your life, not the one this was about.");
  assert.equal(line(M.initialRun(skill)), null);
  for (const id of ["fast_let_go", "ending_relationships", "dear_man_debrief"]) {
    const ex = content.skills.find((s) => s.id === id).exits.find((e) => e.toolId === "finding-connection");
    assert.deepEqual(ex.query, { frame: "elsewhere" }, id);
  }
  const low = ctx({ frame: "low" });
  const st = run([pick("area", "join"), next], low);
  for (const v of values(st, "step", low)) assert.equal(skill.options.step.find((o) => o.value === v).tier, 1, v);
  const { cardHref } = await importTs("src/lib/recommendation.ts");
  assert.equal(cardHref("finding-connection", "reward_drive_low"), "/tool/finding-connection?frame=low");
  assert.equal(cardHref("finding-connection", "rumination_loop"), "/tool/finding-connection");
  assert.equal(cardHref("please-skill", "reward_drive_low"), "/tool/please-skill");
  assert.match(readFileSync("src/components/checkin/RecommendationCards.tsx", "utf8"), /to=\{cardHref\(tool\.id, activationPatternId\)\}/);
});

test("not yet: a new time books a new card, a smaller step, or leave it; decided not to is a real answer", () => {
  const r = reopened();
  const again = run([pick("happened", "not_yet"), next], ctx(), r);
  assert.equal(again.stepId, "again");
  const w = run([pick("again", "new_time"), next], ctx(), again);
  assert.equal(w.stepId, "when");
  assert.deepEqual(M.followUpFor(ctx(), M.stepOf(skill, "when"), run([pick("when", "few_days")], ctx(), w)), { type: "reach_out_outcome", chip: "few_days" }, "the yes to a reminder stands from the first round");
  assert.equal(run([pick("again", "smaller"), next], ctx(), again).stepId, "step");
  const leave = run([pick("again", "leave"), next], ctx(), again);
  assert.equal(leave.stepId, "leave");
  assert.ok(M.stepOf(skill, "leave").noClose);
  const no = run([pick("happened", "decided_not"), next], ctx(), r);
  assert.equal(no.stepId, "not_doing");
  assert.equal(title(no), "That's a real answer.");
  assert.equal(line(no), "Deciding not to is allowed. Your step is here when you want it.");
});

test("Talk to someone now on every screen", () => {
  for (const st of skill.steps) {
    const links = st.kind === "ask" ? st.fields.at(-1).links : st.links;
    assert.ok((links ?? []).some((l) => l.exit === "safety_open"), st.id);
  }
});

test("own words are kept on the run, never on the Interaction", async () => {
  const P = await importTs("functions/src/findingConnection/projection.ts");
  const b = run([pick("predict", "badly"), next, held, pick("when", "tomorrow"), pick("remind", "yes"), next], ctx(),
    run([pick("area", "friend"), next, own("step", "Text Sam about the gig"), next]));
  const r = run([pick("happened", "did"), next, pick("went", "well"), next], ctx(), reopened(b));
  const rec = M.runRecord(ctx(), r);
  const f = P.reachOutFields(rec);
  assert.deepEqual(f, { happened: "did", area: "friend", stepId: null, predicted: "badly", likingPrediction: null, outcome: "well", liked: null });
  assert.ok(!JSON.stringify(f).includes("Sam"));
});

test("the four planned links are built now: FAST's Let go, Ending's after, the debrief's can't-give fix, Problem Solve", () => {
  for (const id of ["fast_let_go", "ending_relationships", "dear_man_debrief", "problem_solve"]) {
    const sk = content.skills.find((s) => s.id === id);
    const ex = sk.exits.find((e) => e.toolId === "finding-connection");
    assert.ok(ex, id);
    assert.ok(!ex.planned, `${id}: the exit is live`);
  }
});

test("routing: lonely / isolated on Low drive lead with Find your people, Running low beside it; never flooded", async () => {
  const { graph, fixtureDeps, withPolicyOn } = await import("./lib/recommendationFixture.mjs");
  const { getStateAndToolsHandler } = await importTs("functions/src/recommendation/handler.ts");
  const on = withPolicyOn(graph);
  for (const w of ["Lonely", "Isolated"]) {
    const r = await getStateAndToolsHandler({ quadrant: "low-unpleasant", emotions: [w], discriminatingAnswers: [{ questionId: "q", responseId: "lu_body_flat" }] }, fixtureDeps(on));
    assert.equal(r.pattern.id, "reward_drive_low", w);
    assert.deepEqual(r.tools.map((t) => t.id), ["finding-connection", "please-skill"], w);
  }
  const row = on.recommendedFor.find((x) => x.id === "rf_reward_drive_low_words_cut-off_finding-connection");
  assert.deepEqual(row.bands, ["steady", "stirred"]);
  assert.equal(row.reviewStatus, "approved");
});
