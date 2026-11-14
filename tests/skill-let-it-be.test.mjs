// Let it be (PRD DT-04; radical acceptance, turning the mind, willingness, willing hands: DBT DT Handouts 10-14;
// docs/design/let-it-be.md) on the skill runtime: validation first, what's to accept, never acceptance of ongoing
// harm (the still-happening check), the fight noticed, willing or digging in (each threat met with its own line),
// willing hands, one statement on paper, room for grief, what's still in their hands, and the close on the fight.
// Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "let_it_be");
const embedOutputs = {
  bodyCard: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
  boundaryLine: { ids: ["copied"] },
};
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const did = (id = "done") => ({ type: "embedDone", output: { ids: [id], durationSec: 40 } });
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s);
const ids = (s, step, c = ctx()) => {
  const f = M.shownFields(c, M.stepOf(skill, step), s)[0];
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const START = [pick("checked", "yes"), next];
const LOST = [...START, pick("what", "lost"), next];

test("the skill: tool let-it-be, named Let it be, its close asked in the flow, played by the player", () => {
  assert.equal(skill.toolId, "let-it-be");
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'let-it-be': 'let_it_be',/);
  assert.match(readFileSync("src/data/tools.ts", "utf8"), /id: 'let-it-be',\n\s+name: 'Let it be',/);
  assert.match(readFileSync("src/data/tools.ts", "utf8"), /label: 'Stop fighting something I can\\'t change', toolId: 'let-it-be'/);
  for (const f of ["src/lib/spine/close.ts", "functions/src/spine/tools.ts"])
    assert.match(readFileSync(f, "utf8"), /'let-it-be': \{ module: 'dt', closeKind: 'regulation_down' \}/, f);
  const close = M.stepOf(skill, "close").fields[0];
  assert.equal(close.askFresh, "thenVsNow");
  assert.match(skill.copy.close_title, /the fight with it/);
});

test("from the Tools list: not sure whether it can change → Problem Solve first, with continue anyway", () => {
  const s = run([pick("checked", "unsure"), next]);
  assert.equal(s.stepId, "check_first");
  const links = M.fieldLinks(ctx(), M.stepOf(skill, "check_first").fields[0], s).map((l) => l.exit.id);
  assert.ok(links.includes("problem_solve"));
  assert.equal(run([pick("check_first", "anyway"), next], ctx(), s).stepId, "what");
});

test("validation comes first: the first thing about what they can't change says the fight makes sense", () => {
  const s = run(START);
  assert.equal(s.stepId, "what");
  assert.match(skill.copy.what_title, /^It makes sense you're fighting this\. It matters to you\./);
});

test("never acceptance of ongoing harm: person and harm things ask once; yes or sometimes opens the support and goes on only for the past", () => {
  for (const what of ["happened", "wont_change", "wont_give", "unfair"]) assert.equal(run([...START, pick("what", what), next]).stepId, "still", what);
  assert.equal(run([...START, own("what", "my job"), next]).stepId, "still", "own words ask too");
  for (const what of ["lost", "limit"]) assert.equal(run([...START, pick("what", what), next]).stepId, "fight", what);
  const s = run([...START, pick("what", "wont_change"), next]);
  for (const a of ["yes", "sometimes", "unsure"]) {
    const r = run([pick("still", a), next], ctx(), s);
    assert.equal(r.stepId, "still_line");
    assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "still_line"), r)?.variant, "other_person");
    assert.match(skill.copy.still_line_title, /isn't accepting you have to stay in it/);
    const links = M.fieldLinks(ctx(), M.stepOf(skill, "still_line").fields[0], r).map((l) => l.exit);
    const ending = links.find((x) => x.id === "ending");
    assert.equal(ending.toolId, "ending-relationships");
    assert.deepEqual(ending.query, { frame: "careful" }, "the careful frame: the safety branch whatever they answer");
    const on = run([pick("still_go", "go_on"), next], ctx(), r);
    assert.equal(on.stepId, "fight");
    assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "fight"), on)?.variant, "other_person", "the support stays");
  }
  assert.equal(run([pick("still", "no"), next], ctx(), s).stepId, "fight");
  // Stop here: the support stays, Ending offered, no close.
  const stop = run([pick("still", "yes"), next, pick("still_go", "stop"), next], ctx(), s);
  assert.equal(stop.stepId, "still_stop");
  assert.ok(M.stepOf(skill, "still_stop").noClose);
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "still_stop"), stop)?.variant, "other_person");
  assert.deepEqual(offers(stop), ["ending"]);
});

test("still happening: no statement reads as accepting more of it; the still lines are offered instead", () => {
  const to = (still) => run([...START, pick("what", "wont_change"), next, pick("still", still), next,
    ...(still === "no" ? [] : [pick("still_go", "go_on"), next]), pick("fight", "replay"), next, pick("willing", "willing"), next, did()]);
  const past = ids(to("no"), "statement");
  assert.ok(past.includes("who_they_are") && !past.includes("wasnt_okay") && !past.includes("not_more"));
  const now = ids(to("yes"), "statement");
  assert.ok(!now.includes("who_they_are") && !now.includes("need_real"), "no person line while it's still happening");
  assert.ok(now.includes("wasnt_okay") && now.includes("not_more") && now.includes("what_happened"));
  assert.match(skill.copy.statement_hint, /^Accepting isn't approving\./, "every path hears it, not only digging in");
});

test("willing or digging in: digging in asks what letting it be threatens, and each threat gets its own line", () => {
  const w = run([...LOST, pick("fight", "replay"), pick("fight", "bitter"), next]);
  assert.equal(w.stepId, "willing");
  assert.equal(run([pick("willing", "willing"), next], ctx(), w).stepId, "hands");
  assert.equal(run([pick("willing", "unsure"), next], ctx(), w).stepId, "hands");
  const t = run([pick("willing", "willful"), next], ctx(), w);
  assert.equal(t.stepId, "threat");
  for (const o of skill.options.threat) {
    const l = run([pick("threat", o.value), next], ctx(), t);
    assert.equal(l.stepId, "threat_line");
    assert.equal(M.copyText(ctx(), M.stepOf(skill, "threat_line").title, l), skill.copy[`threat_${o.value}`]);
    assert.ok(!M.stepOf(skill, "threat_line").fields[0].required, "Next goes on without an answer");
    assert.equal(run([next], ctx(), l).stepId, "hands");
  }
  assert.match(skill.copy.threat_line_hint, /isn't approving.*isn't giving up on what can change/);
});

test("willing hands, then one statement (category-matched, or their own) on paper", () => {
  const h = run([...LOST, pick("fight", "replay"), next, pick("willing", "willing"), next]);
  const card = M.stepOf(skill, "hands");
  assert.equal(card.embed, "bodyCard");
  assert.equal(card.props.kind, "willing");
  assert.match(skill.copy[card.props.caution], /You don't have to smile/, "the half-smile is offered, never required");
  const st = run([did()], ctx(), h);
  assert.equal(st.stepId, "statement");
  const lost = ids(st, "statement");
  assert.ok(lost.includes("it_mattered") && lost.includes("what_happened"));
  assert.ok(!lost.includes("who_they_are"), "category-matched");
  const paper = run([pick("statement", "it_mattered"), next], ctx(), st);
  assert.equal(paper.stepId, "statement_card");
  assert.equal(M.stepOf(skill, "statement_card").embed, "boundaryLine");
  const cp = M.stepOf(skill, "statement_card").props;
  for (const k of ["copyLabel", "copiedLabel", "selectedLabel", "next"]) assert.ok(skill.copy[cp[k]], `the card's ${k} is copy`);
  assert.equal(run([own("statement", "It's over, and I'm still here."), next], ctx(), st).stepId, "statement_card");
  assert.equal(run([did("copied")], ctx(), paper).stepId, "grief");
});

test("grief is allowed; hand on heart; too much goes to the body, with no close", () => {
  const g = run([...LOST, pick("fight", "replay"), next, pick("willing", "willing"), next, did(), pick("statement", "causes"), next, did("copied")]);
  assert.equal(g.stepId, "grief");
  assert.match(skill.copy.grief_title, /It isn't going backwards/);
  assert.equal(run([pick("grief", "ok"), next], ctx(), g).stepId, "hands_still");
  const heart = run([pick("grief", "heart"), next], ctx(), g);
  assert.equal(M.stepOf(skill, heart.stepId).props.kind, "hand_heart");
  assert.equal(run([did()], ctx(), heart).stepId, "hands_still");
  const much = run([pick("grief", "much"), next], ctx(), g);
  assert.equal(much.stepId, "too_much");
  assert.ok(M.stepOf(skill, "too_much").noClose);
  assert.deepEqual(offers(much), ["cool_down", "soothe"], "the body first, or Held (DT-07, built)");
});

test("what's still in my hands routes; the close on the fight, then the end card", () => {
  const hs = run([...LOST, pick("fight", "replay"), next, pick("willing", "willing"), next, did(), pick("statement", "causes"), next, did("copied"), pick("grief", "ok"), next]);
  // After the close: when the fight comes back, and a reminder (both skippable, DT-04 part 2), then the end card.
  const at = (v) => run([pick("hands_still", v), next, pick("close", "better"), next, next, next], ctx(), hs);
  assert.equal(run([pick("hands_still", "need"), next], ctx(), hs).stepId, "close");
  assert.equal(at("need").stepId, "end");
  assert.deepEqual(offers(at("need")), ["recover"]);
  assert.deepEqual(offers(at("boundary")), ["fast"]);
  assert.deepEqual(offers(at("small")), ["good_things"], "one small thing: Good things (ER-04, built)");
  assert.equal(M.handoffLine(ctx(), M.stepOf(skill, "end"), at("nothing")), "Doing nothing more today is okay. Letting it be was enough.");
  assert.deepEqual(M.askFresh(ctx(), at("need")), { thenVsNow: "better" });
  const louder = run([pick("hands_still", "need"), next, pick("close", "worse"), next], ctx(), hs);
  assert.equal(M.handoffLine(ctx(), M.stepOf(skill, "end"), louder), skill.copy.end_louder, "no success claim after Louder");
  assert.deepEqual(offers(louder), ["cool_down", "recover"]);
});

test("stirred: the short path (no fight, no grief); flooded: the body first, or try it now", () => {
  const st = ctx({ band: "stirred" });
  const s = run(LOST, st);
  assert.equal(s.stepId, "hands", "★ steps only");
  const after = run([did(), pick("statement", "causes"), next, did("copied")], st, s);
  assert.equal(after.stepId, "hands_still", "no grief step on the short path");
  const fl = ctx({ band: "flooded" });
  const h = run(START, fl);
  assert.equal(h.stepId, "heads_up");
  const body = run([pick("heads_up", "body"), next], fl, h);
  assert.equal(body.stepId, "settle");
  assert.deepEqual(offers(body, fl), ["cool_down"]);
  const anyway = run([pick("heads_up", "anyway"), next, pick("what", "lost"), next], fl, h);
  assert.equal(anyway.stepId, "hands", "try it now: the short path");
});

test("every screen has talk to someone now; no copy says just, should or but (voice)", () => {
  for (const st of skill.steps) {
    const links = [...(st.links ?? []), ...(st.fields ?? []).flatMap((f) => f.links ?? [])];
    assert.ok(links.some((l) => l.exit === "safety_open"), st.id);
  }
  for (const [k, v] of Object.entries(skill.copy)) assert.doesNotMatch(v, /\b(just|should|but|get over)\b/i, k);
});

test("the links that waited on it now open it: First, the body's fork, Check the Facts, FAST, It isn't working, the debrief, Rebel, Ending, Problem Solve", () => {
  for (const id of ["first_body", "check_the_facts", "fast_let_go", "er_troubleshoot", "dear_man_debrief", "alternate_rebellion", "ending_relationships", "problem_solve"]) {
    const sk = content.skills.find((s) => s.id === id);
    const x = sk.exits.find((e) => e.toolId === "let-it-be");
    assert.ok(x, id);
    assert.ok(!x.planned, `${id}: the let-it-be exit is built`);
  }
});

test("routing: the three rows are let-it-be now (D6), live (12 Nov 2026, default to connected)", () => {
  const cy = readFileSync("schema/recommended-for.cypher", "utf8");
  assert.doesNotMatch(cy, /_radical-acceptance"/);
  const rows = cy.split("\n").filter((l) => /\{id: "rf_[^"]*_let-it-be"/.test(l));
  assert.equal(rows.length, 3);
  for (const l of rows) { assert.match(l, /active: true/); assert.match(l, /review: "approved"/); }
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_radical_acceptance", t: "let-it-be"\}/);
});
