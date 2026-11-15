// Rebel without the wreckage (DT-11) on the skill runtime, pinned against PRD DT-11 and the plan's safety rules
// (docs/design/dbt-modules-plan.md C6; docs/design/alternate-rebellion.md): the screens, the function-matched
// rebellions, the cost check on own rebellions, the card, the real squeeze's routes, the other-person resources,
// the safety link, the treatment heads-up and the flooded path. Every rule is a row, so it's tested through the
// same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const { validateExt } = await importTs("functions/src/spine/extSchemas.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "alternate_rebellion");
// What the player passes: the embed's declared outputs (embeds.ts EMBED_OUTPUTS = content.py EMBEDS, test-pinned).
const embedOutputs = { rebellionCard: { ids: ["now", "today", "week"] } };
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs });

function run(events, c = ctx()) {
  let s = M.initialRun(skill);
  for (const e of events) s = M.runNext(c, s, e);
  return s;
}
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const card = (when) => ({ type: "embedDone", output: { ids: [when] } });
const toPick = (squeeze = ["rules"], fn = "freedom") => [next, ...squeeze.map((x) => pick("squeeze", x)), next, pick("function", fn), next];
// Later today or this week: the *card later?* step, skipped here (its own test is skill-alternate-rebellion-part2).
const toReal = (squeeze, rebellion = "say_no", when = "today") => [...toPick(squeeze, "freedom"), pick("pick", rebellion), next, card(when), ...(when === "now" ? [] : [next])];
const step = (id) => skill.steps.find((s) => s.id === id);

test("the screens, in order: open, squeeze, function, pick, (heads-up), (sleep on it), card, (itch | later), (back, still: reopened only), real, next", () => {
  assert.deepEqual(skill.steps.map((s) => s.id), ["open", "squeeze", "function", "pick", "heads_up", "sleep_on", "card", "later", "itch", "back", "still", "real", "next"]);
  assert.equal(skill.toolId, "alternate-rebellion");
  const s = run([...toReal(["rules"], "say_no", "now"), pick("itch", "a_bit"), next, pick("real", "change"), next]);
  assert.deepEqual(s.path, ["open", "squeeze", "function", "pick", "card", "itch", "real", "next"]);
  assert.deepEqual(s.offered, ["problem_solve"]);
});

test("the opening is the witness line (PRD step 1), with no question to answer when no band is carried", () => {
  assert.equal(M.copyText(ctx(), step("open").title, M.initialRun(skill)), "Wanting to rebel usually means something's squeezing you. That's worth listening to.");
  assert.equal(step("open").hint, undefined, "no hint to trail under the flooded line");
  assert.equal(M.shownFields(ctx(), step("open"), M.initialRun(skill)).length, 0);
  assert.equal(M.canGoOn(ctx(), M.initialRun(skill)), true);
});

test("flooded only from a carried or host band (C6.2): body first as quiet links, keep going anyway always there", () => {
  const c = ctx({ band: "flooded" });
  const s0 = M.initialRun(skill);
  assert.match(M.copyText(c, step("open").title, s0), /body's loud/);
  assert.ok(M.copyText(c, step("open").title, s0).split(/\s+/).length <= 8, "flooded copy is 8 words or fewer");
  const [f] = M.shownFields(c, step("open"), s0);
  assert.deepEqual(M.fieldLinks(c, f, s0).map((l) => l.exit.toolId), ["cool-down", "pause"]);
  assert.equal(M.canGoOn(c, s0), false, "keep going anyway is a tap, not a default");
  assert.equal(run([pick("first", "anyway"), next], c).stepId, "squeeze");
  // The band never comes from the query string (F1): only route state or a host.
  assert.deepEqual(M.contextIn(skill, { band: "stirred" }), { band: "stirred" });
  assert.equal(M.shownFields(ctx({ band: "stirred" }), step("open"), s0).length, 0, "stirred is the standard path");
});

test("what's squeezing: up to two, own words count; the safety link is always there and opens safety.open, not a tool", () => {
  const s = run([next, pick("squeeze", "rules"), pick("squeeze", "stuck"), pick("squeeze", "told_who")]);
  assert.deepEqual(s.answers.squeeze.ids, ["stuck", "told_who"], "a third tap swaps out the oldest");
  const f = step("squeeze").fields[0];
  const links = M.fieldLinks(ctx(), f, run([next]));
  assert.equal(links.length, 1);
  assert.equal(links[0].exit.safety, true);
  assert.equal(links[0].label, "If the urge is to hurt yourself");
  const pickLinks = M.fieldLinks(ctx(), step("pick").fields[0], run(toPick()));
  assert.deepEqual(pickLinks.map((l) => l.exit.safety), [true], "and where they might write their own rebellion");
  assert.equal(M.canGoOn(ctx(), run([next, own("squeeze", "my landlord")])), true);
});

test("someone I'm scared of: the other-person resources show on every screen from the squeeze on (C6.4)", () => {
  const s = run([next, pick("squeeze", "scared")]);
  assert.equal(M.crisisFor(ctx(), step("squeeze"), s).variant, "other_person");
  assert.equal(M.crisisFor(ctx(), step("squeeze"), run([next, pick("squeeze", "controlling")])), null, "being controlled alone isn't danger");
  const end = run([...toReal(["scared"]), pick("real", "say"), next]);
  for (const id of ["squeeze", "function", "pick", "heads_up", "card", "itch", "real", "next"]) {
    assert.equal(M.crisisFor(ctx(), step(id), end)?.variant, "other_person", id);
  }
  const plain = run([...toReal(["controlling"]), pick("real", "say"), next]);
  for (const id of ["function", "pick", "card", "itch", "real", "next"]) assert.equal(M.crisisFor(ctx(), step(id), plain), null, id);
});

test("someone I'm scared of: only quiet rebellions (nothing they'd notice, phone kept, usual way home), at least three per function", () => {
  for (const fn of skill.options.function.map((o) => o.value)) {
    const s = run(toPick(["scared"], fn));
    const [g] = M.optionGroups(ctx(), step("pick").fields[0], s.answers);
    assert.ok(g.options.length >= 3, `${fn}: ${g.options.length}`);
    for (const o of g.options) {
      assert.equal(o.quiet, true, o.value);
      assert.equal(o.visibility, "private", o.value);
      assert.ok(!["phone_away", "different_route", "my_order", "walk_fast"].includes(o.value), o.value);
    }
  }
  assert.match(M.copyText(ctx(), step("pick").title, run(toPick(["scared"]))), /nobody else has to see/);
  const plain = M.optionGroups(ctx(), step("pick").fields[0], run(toPick(["controlling"], "freedom")).answers)[0].options.map((o) => o.value);
  assert.ok(plain.includes("phone_away") && plain.includes("say_no"), "the full list otherwise");
});

test("never a confrontation plan for someone they're scared of (D4): no DEAR MAN, no FAST; Ending a relationship is offered", () => {
  // (Someone they're scared of narrows the rebellions to private ones, so the run picks one that's on that list.)
  const scared = run([...toReal(["scared"], "daydream"), pick("real", "say"), next]);
  assert.equal(scared.stepId, "next");
  assert.deepEqual(scared.offered, ["ending"], "IE-08 is built (it asks about safety first); never DEAR MAN or FAST");
  const offers = step("next").offers;
  for (const x of ["problem_solve", "dear_man", "fast", "let_it_be"]) {
    const o = offers.find((y) => y.exit === x);
    assert.ok(JSON.stringify(o.when).includes('{"not":{"has":["$a.squeeze.ids","scared"]}}'), `${x} is never offered with someone they're scared of`);
  }
  assert.equal(M.handoffLine(ctx(), step("next"), scared), "You named someone you're scared of. You don't have to work that out alone.");
  const plain = run([...toReal(["controlling"]), pick("real", "say"), next]);
  assert.deepEqual(plain.offered, ["dear_man", "fast"], "FAST is built (IE-B1)");
  assert.ok(!skill.exits.find((x) => x.id === "ending").planned);
});

test("the function picks the rebellions (PRD step 4): every one matched, reversible, costing nothing, at least three per function", () => {
  for (const fn of skill.options.function.map((o) => o.value)) {
    const s = run(toPick(["rules"], fn));
    const [g] = M.optionGroups(ctx(), step("pick").fields[0], s.answers);
    assert.ok(g.options.length >= 3, `${fn}: ${g.options.length}`);
    assert.ok(g.options.length <= 6, `${fn}: fits one phone screen`);
    for (const o of g.options) assert.ok(o.functions.includes(fn) && o.reversible === true && o.cost === "none", o.value);
  }
});

test("plan C6.7: no food, alcohol, shopping or scrolling in a rebellion, no amounts, no meds", () => {
  const all = skill.options.rebellion.map((o) => o.label).join(" | ");
  assert.ok(!skill.options.rebellion.some((o) => o.value === "small_version"), "no open-ended dare");
  assert.doesNotMatch(all, /\b(eat|food|dessert|snack|drink|alcohol|wine|beer|buy|shop|purchase|spend|scroll|meds?|medication|pill)/i);
  assert.doesNotMatch(all, /\b\d+\b/);
});

test("an own rebellion asks if it'll cost tomorrow; yes gets a heads-up and a choice (lighter goes back, keep goes on)", () => {
  let s = run([...toPick(), own("pick", "quit my job by email tonight")]);
  assert.deepEqual(M.shownFields(ctx(), step("pick"), s).map((f) => f.id), ["pick", "cost", "undo"]);
  assert.equal(M.canGoOn(ctx(), s), false, "the cost question is asked");
  s = M.runNext(ctx(), M.runNext(ctx(), M.runNext(ctx(), s, pick("cost", "yes")), pick("undo", "yes")), next);
  assert.equal(s.stepId, "heads_up");
  const back = M.runNext(ctx(), M.runNext(ctx(), s, pick("heads_up", "lighter")), next);
  assert.equal(back.stepId, "pick");
  const kept = M.runNext(ctx(), M.runNext(ctx(), s, pick("heads_up", "keep")), next);
  assert.equal(kept.stepId, "card");
  assert.equal(run([...toPick(), own("pick", "paint a wall"), pick("cost", "a_little"), pick("undo", "yes"), next]).stepId, "card");
  assert.equal(run([...toPick(), pick("pick", "say_no"), next]).stepId, "card", "a curated one isn't asked");
  assert.ok(step("pick").fields[0].own.max <= 90, "it fits on the card");
});

test("an own rebellion with someone they're scared of also asks whether they'd notice; yes or not sure gets the heads-up", () => {
  let s = run([...toPick(["scared"]), own("pick", "dye my hair blue")]);
  assert.deepEqual(M.shownFields(ctx(), step("pick"), s).map((f) => f.id), ["pick", "cost", "noticed", "undo"]);
  s = M.runNext(ctx(), M.runNext(ctx(), M.runNext(ctx(), M.runNext(ctx(), s, pick("cost", "no")), pick("noticed", "not_sure")), pick("undo", "yes")), next);
  assert.equal(s.stepId, "heads_up");
  assert.match(M.copyText(ctx(), step("heads_up").title, s), /If they'd notice it/);
  const quiet = run([...toPick(["scared"]), own("pick", "hum a song"), pick("cost", "no"), pick("noticed", "no"), pick("undo", "yes"), next]);
  assert.equal(quiet.stepId, "card");
  assert.deepEqual(M.shownFields(ctx(), step("pick"), run([...toPick(["rules"]), own("pick", "x")])).map((f) => f.id), ["pick", "cost", "undo"], "only with someone they're scared of");
});

test("treatment: never a rebellion; screen 4 says to talk to the care team first, and nothing offered skips something", () => {
  const s = run(toPick(["treatment"]));
  assert.match(M.copyText(ctx(), step("pick").title, s), /^Treatment you didn't pick is a real squeeze\. Changing it is a talk with your care team first\./);
  for (const fn of skill.options.function.map((o) => o.value)) {
    const [g] = M.optionGroups(ctx(), step("pick").fields[0], run(toPick(["treatment"], fn)).answers);
    assert.ok(g.options.length >= 3, `${fn}: ${g.options.length}`);
    for (const o of g.options) assert.ok(o.skips !== true && o.exerts !== true, `${fn}: ${o.value}`);
  }
  // Both: quiet, nothing skipped, no exercise; still three per function; the title keeps both.
  for (const fn of skill.options.function.map((o) => o.value)) {
    const [g] = M.optionGroups(ctx(), step("pick").fields[0], run(toPick(["treatment", "scared"], fn)).answers);
    assert.ok(g.options.length >= 3, `both, ${fn}: ${g.options.length}`);
    for (const o of g.options) assert.ok(o.quiet === true && o.skips !== true && o.exerts !== true, `both, ${fn}: ${o.value}`);
  }
  assert.match(M.copyText(ctx(), step("pick").title, run(toPick(["treatment", "scared"]))), /care team first\. Pick one nobody else has to see\./);
  // No rebellion is framed as a secret or hides an object.
  assert.doesNotMatch(skill.options.rebellion.map((o) => o.label).join(" | "), /tell no one|only you know|secret|hide/i);
  assert.equal(M.copyText(ctx(), step("pick").title, run(toPick(["rules"]))), "Pick one that gives you that, without the wreckage.");
});

test("the card: the run's answers as labels for it; now asks if it scratched the itch, later goes on to the squeeze", () => {
  const s = run([...toPick(["rules", "be_fine"], "control"), pick("pick", "rearrange"), next]);
  assert.equal(s.stepId, "card");
  const p = M.pickedLabels(ctx(), s);
  assert.deepEqual(p.squeeze, ["Rules I didn't pick", "Expected to be fine"]);
  assert.deepEqual(p.function, ["Control back"]);
  assert.deepEqual(p.pick, ["Rearrange your room tonight"]);
  assert.equal(M.runNext(ctx(), s, card("now")).stepId, "itch");
  assert.equal(M.runNext(ctx(), s, card("week")).stepId, "later", "later: a card to ask how it went, optional");
  assert.equal(M.runNext(ctx(), s, card("never")).stepId, "later", "an undeclared id is dropped");
});

test("on the player (F2): the tool plays this skill, no page of its own; the card's words are declared copy keys", () => {
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'alternate-rebellion': 'alternate_rebellion',/);
  assert.doesNotMatch(readFileSync("src/pages/ToolPage.tsx", "utf8"), /AlternateRebellion/);
  const props = step("card").props;
  assert.deepEqual([props.squeezeField, props.functionField, props.pickField], ["squeeze", "function", "pick"]);
  for (const k of ["against", "for", "fallback", "whenLabel", "now", "today", "week"]) {
    assert.ok(typeof skill.copy[props[k]] === "string" && skill.copy[props[k]].length > 0, `${k} -> ${props[k]} is skill copy`);
  }
  assert.equal(skill.copy[props.today], "Later today");
});

test("the real squeeze (PRD step 6): change → Problem Solve, a person → DEAR MAN and FAST, can't → Let it be, not now → Done", () => {
  const offered = (real) => run([...toReal(["rules"]), pick("real", real), next]).offered;
  assert.deepEqual(offered("change"), ["problem_solve"]);
  assert.deepEqual(offered("say"), ["dear_man", "fast"]);
  assert.deepEqual(offered("cant"), ["let_it_be"]);
  assert.deepEqual(offered("not_now"), []);
  const done = run([...toReal(["rules"]), pick("real", "not_now"), next]);
  assert.equal(M.handoffLine(ctx(), step("next"), done), "The rebellion's yours. The squeeze can wait until you're ready.");
});

test("the record: no numbers, no free text but own words, within the server's schema; the urge close asks about the blow-up", () => {
  const s = M.runNext(ctx(), run([...toPick(["rules"]), own("pick", "x".repeat(200)), pick("cost", "no"), pick("undo", "yes"), next, card("today"), next, pick("real", "change"), next]),
    { type: "exit", exitId: "problem_solve" });
  assert.equal(s.answers.pick.own.length, 90);
  const rec = M.runRecord(ctx(), s);
  assert.doesNotThrow(() => validateExt({ run: rec }));
  assert.equal(rec.exitId, "problem_solve");
  const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
  assert.equal(spine.closeFlow.byTool["alternate-rebellion"].urge.question, "And the urge to blow it all up?");
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'alternate-rebellion': \{ module: 'dt', closeKind: 'urge_change' \}/, "the two-part close (part 2)");
});

test("the rebellion is clinical content in the graph: each option SERVES its functions", () => {
  const cy = readFileSync("schema/skills.cypher", "utf8");
  for (const o of skill.options.rebellion) {
    for (const fn of o.functions) {
      assert.ok(cy.includes(`MATCH (o:SkillOption {id: "alternate_rebellion:rebellion:${o.value}"}), (f:SkillOption {id: "alternate_rebellion:function:${fn}"})\nMERGE (o)-[:SERVES]->(f);`), `${o.value} → ${fn}`);
    }
  }
  assert.match(cy, /SET o:SkillOption:RebellionSqueeze/);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_alternate_rebellion", t: "alternate-rebellion"\}/);
});
