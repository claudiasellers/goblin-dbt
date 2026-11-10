// It isn't working (PRD ER-14, DBT ER Handout 24; docs/design/er-troubleshoot.md) on the skill runtime: the
// validation line first, Handout 24's seven checks one tap each, the first yes gets its fix ("first yes wins"),
// a not-sure is never a yes except where the PRD routes it (did it fit? → Check the Facts), hopelessness opens
// the crisis slot and puts someone to talk to first, and a carried flooded band offers settling first without
// locking anything. Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const { validateExt } = await importTs("functions/src/spine/extSchemas.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "er_troubleshoot");
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const run = (events, c = ctx()) => events.reduce((s, e) => M.runNext(c, s, e), M.initialRun(skill));

const CHECKS = ["body", "fit", "way", "env", "will", "much", "belief"];
// One "no" answer per check, so a run can walk past it.
const NO = { body: "body_no", fit: "fit_no", way: "way_all", env: "env_no", will: "will_yes", much: "much_no", belief: "myth_no" };
const UNSURE = { body: "body_unsure", way: "way_unsure", env: "env_unsure", will: "will_unsure", much: "much_unsure", belief: "myth_unsure" };
const upTo = (check) => CHECKS.slice(0, CHECKS.indexOf(check)).flatMap((c) => [pick(c, NO[c]), next]);

test("the skill: tool er-troubleshoot, starts at the body check, Handout 24's seven checks in order, no close question", () => {
  assert.equal(skill.toolId, "er-troubleshoot");
  assert.equal(skill.start, "body");
  assert.deepEqual(skill.steps.filter((s) => s.kind === "ask").map((s) => s.id), CHECKS);
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'er-troubleshoot': \{ module: 'er', closeKind: 'none' \}/);
});

test("validation before diagnosis: the first screen opens with the line, before any question is answered", () => {
  const body = M.stepOf(skill, "body");
  assert.equal(skill.copy[body.hint], "When a skill doesn't help, that's information. It isn't proof you can't do this.");
});

test("every check needs one tap, and Next waits for it", () => {
  for (const check of CHECKS) {
    const s = run(upTo(check));
    assert.equal(s.stepId, check);
    assert.equal(M.canGoOn(ctx(), s), false, `${check}: Next waits`);
    assert.equal(M.runNext(ctx(), s, next).stepId, check);
  }
});

test("first yes wins: each check's yes goes to its fix, skipping the rest", () => {
  const yes = {
    body: ["body_yes", "fix_body"], fit: ["fit_yes", "fix_fit"], way: ["way_part", "fix_way"], env: ["env_back_off", "fix_env"],
    will: ["will_not", "fix_will"], much: ["much_yes", "fix_much"], belief: ["myth_true", "fix_belief"],
  };
  for (const check of CHECKS) {
    const [value, fix] = yes[check];
    const s = run([...upTo(check), pick(check, value), next]);
    assert.equal(s.stepId, fix, check);
    assert.deepEqual(s.path, [...CHECKS.slice(0, CHECKS.indexOf(check) + 1), fix]);
    assert.equal(M.stepOf(skill, fix).kind, "handoff");
    assert.equal(M.stepOf(skill, fix).done, "done", `${fix}: Done is always there`);
  }
  // Every reinforcer chip is a yes.
  for (const v of ["env_back_off", "env_get_out", "env_step_in"]) assert.equal(run([...upTo("env"), pick("env", v), next]).stepId, "fix_env");
});

test("not sure goes on to the next check, except did-it-fit, where not sure is the cue to check the facts", () => {
  for (const [check, value] of Object.entries(UNSURE)) {
    const s = run([...upTo(check), pick(check, value), next]);
    const i = CHECKS.indexOf(check);
    assert.equal(s.stepId, CHECKS[i + 1] ?? "none", check);
  }
  const s = run([...upTo("fit"), pick("fit", "fit_unsure"), next]);
  assert.equal(s.stepId, "fix_fit_unsure");
  assert.deepEqual(s.offered, ["check_the_facts"]);
});

test("nothing stood out: all seven answered no ends on the none card, which offers nothing built yet and Done", () => {
  const s = run(CHECKS.flatMap((c) => [pick(c, NO[c]), next]));
  assert.equal(s.stepId, "none");
  assert.deepEqual(s.offered, [], "missing links (CORE-11) is planned, so not shown");
  assert.match(M.handoffLine(ctx(), M.stepOf(skill, "none"), s), /isn't on you/);
});

test("each fix offers its PRD move: planned tools are written and never shown", () => {
  const at = (check, value) => run([...upTo(check), pick(check, value), next]);
  assert.deepEqual(at("body", "body_yes").offered, [], "Running low (ER-07) is planned");
  assert.deepEqual(at("fit", "fit_yes").offered, ["problem_solve"]);
  assert.deepEqual(at("way", "way_part").offered, [], "the line is the move: retry the same skill, smaller and all the way");
  assert.deepEqual(at("env", "env_get_out").offered, ["problem_solve"]);
  assert.deepEqual(at("will", "will_not").offered, [], "Let it be (DT-04) is planned");
  assert.deepEqual(at("much", "much_yes").offered, ["problem_solve", "five_senses"], "grounding, never cold, without DT-01's self-check");
  assert.deepEqual(at("belief", "myth_failing").offered, [], "the myth cards (ER-10) are planned");
  const planned = skill.exits.filter((x) => x.planned).map((x) => x.toolId).sort();
  assert.deepEqual(planned, ["emotion-guide", "let-it-be", "mindfulness-emotions", "missing-links", "please-skill"]);
  // It fits: the situation, or (planned) making room for it, as Check the Facts' verdict table does.
  assert.deepEqual(M.stepOf(skill, "fix_fit").offers.map((o) => o.exit), ["problem_solve", "mindfulness_emotions", "let_it_be"]);
  assert.ok(!JSON.stringify(skill.exits).includes("cool-down"), "no cold-water exit");
});

test("hopelessness: Nothing will ever help me shows the crisis slot; its card offers only someone to talk to and Done, no reappraisal", () => {
  const c = ctx();
  const belief = M.stepOf(skill, "belief");
  const opt = skill.options.belief.find((o) => o.value === "myth_nothing");
  assert.equal(opt.danger, "self");
  let s = run([...upTo("belief"), pick("belief", "myth_nothing")], c);
  assert.equal(M.crisisFor(c, belief, s).variant, "crisis");
  assert.deepEqual(M.fieldLinks(c, belief.fields[0], s), [], "the banner carries the lines; no second link");
  s = M.runNext(c, s, next);
  assert.equal(s.stepId, "fix_belief");
  const fix = M.stepOf(skill, "fix_belief");
  assert.equal(M.crisisFor(c, fix, s).variant, "crisis");
  assert.deepEqual(s.offered, ["safety_open"], "someone to talk to, and Done; no myth cards");
  const line = M.handoffLine(c, fix, s);
  assert.match(line, /You don't have to hold it alone/);
  assert.doesNotMatch(line, /not a fact|belief/i, "no reappraisal in crisis speech (voice.md S9)");
  // safety.open never ends the run.
  assert.equal(M.runNext(c, s, { type: "exit", exitId: "safety_open" }).exitId, null);
  // Another belief: no banner, the plain line.
  const other = run([...upTo("belief"), pick("belief", "myth_past_it"), next], c);
  assert.equal(M.crisisFor(c, fix, other), null);
  assert.ok(!other.offered.includes("safety_open"));
});

test("someone to talk to is a quiet link on the belief screen whatever is picked, own words included", () => {
  const c = ctx();
  const belief = M.stepOf(skill, "belief");
  const links = (s) => M.fieldLinks(c, belief.fields[0], s).map((l) => l.exit.id);
  assert.deepEqual(links(run(upTo("belief"), c)), ["safety_open"]);
  assert.deepEqual(links(run([...upTo("belief"), { type: "own", fieldId: "belief", text: "anything at all" }], c)), ["safety_open"]);
  assert.deepEqual(links(run([...upTo("belief"), pick("belief", "myth_true")], c)), ["safety_open"]);
});

test("a belief in the person's own words is a yes, and gets the plain line", () => {
  const s = run([...upTo("belief"), { type: "own", fieldId: "belief", text: "Skills are for other people" }, next]);
  assert.equal(s.stepId, "fix_belief");
  assert.match(M.handoffLine(ctx(), M.stepOf(skill, "fix_belief"), s), /Beliefs like that/);
});

test("flooded only from a carried band: a quiet settle-first link on the first screen; going on is never locked", () => {
  const body = M.stepOf(skill, "body");
  const links = (c) => M.fieldLinks(c, body.fields[0], M.initialRun(skill)).map((l) => l.exit.toolId);
  assert.deepEqual(links(ctx()), []);
  assert.deepEqual(links(ctx({ band: "stirred" })), []);
  assert.deepEqual(links(ctx({ band: "flooded" })), ["five-senses"], "grounding: direction-safe in any state");
  const s = run([pick("body", "body_no"), next], ctx({ band: "flooded" }));
  assert.equal(s.stepId, "fit", "the checks go on");
  // The skill never asks for a band or infers one: no field reads or writes it.
  assert.ok(!JSON.stringify(skill.steps.flatMap((x) => x.fields ?? []).map((f) => f.id)).includes("band"));
});

test("the attempt record: ids only, the path to the fix, validates on the server; band is never recorded", () => {
  const c = ctx({ band: "flooded" });
  let s = run([pick("body", "body_no"), next, pick("fit", "fit_no"), next, pick("way", "way_part"), next], c);
  s = M.runNext(c, s, { type: "exit", exitId: "done" });
  const rec = M.runRecord(c, s);
  assert.equal(rec.skillId, "er_troubleshoot");
  assert.equal(rec.versionId, "et-v1-1");
  assert.deepEqual(rec.path, ["body", "fit", "way", "fix_way"]);
  assert.deepEqual(rec.answers.map((a) => [a.fieldId, a.optionIds]), [["body", ["body_no"]], ["fit", ["fit_no"]], ["way", ["way_part"]]]);
  assert.equal(rec.offeredExitIds, undefined);
  assert.equal(rec.exitId, "done");
  assert.equal(rec.ctx, undefined, "band steers; it is never kept");
  assert.doesNotThrow(() => validateExt({ run: rec }));
});

test("v1.1: a nudge to try again on the cards whose move is another go; a chip schedules try_again as the card is left", () => {
  const c = ctx();
  const at = (check, value) => run([...upTo(check), pick(check, value), next], c);
  const withChips = skill.steps.filter((st) => st.followUp).map((st) => st.id).sort();
  assert.deepEqual(withChips, ["fix_body", "fix_much", "fix_way", "fix_will", "none"]);
  assert.ok(!M.stepOf(skill, "fix_belief").fields, "never on the belief card, so never beside the crisis banner");
  const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
  const type = spine.followUpTypes.find((t) => t.id === "try_again");
  assert.ok(type?.enabled);
  assert.deepEqual(skill.options.again.map((o) => o.value).sort(), Object.keys(type.window.chips).sort());
  assert.deepEqual(skill.options.again.map((o) => o.label), ["Tonight", "Tomorrow", "Later this week"], "vague, no dates");
  let s = at("way", "way_part");
  const fix = M.stepOf(skill, "fix_way");
  const [field] = fix.fields;
  assert.equal(skill.copy[field.label], "Want a nudge to try it again?");
  assert.equal(M.followUpFor(c, fix, s), null, "no chip, nothing scheduled");
  const before = [M.handoffLine(c, fix, s), M.offersFor(c, fix, s)];
  s = M.runNext(c, s, pick(field.id, "tomorrow"));
  assert.equal(s.stepId, "fix_way", "a chip tap stays on the card");
  assert.deepEqual([M.handoffLine(c, fix, s), M.offersFor(c, fix, s)], before, "the card doesn't change under the thumb");
  assert.deepEqual(M.followUpFor(c, fix, s), { type: "try_again", chip: "tomorrow" });
  s = M.runNext(c, s, pick(field.id, "this_week"));
  assert.deepEqual(M.followUpFor(c, fix, s), { type: "try_again", chip: "this_week" }, "changed before leaving");
  s = M.runNext(c, s, { type: "scheduled", stepId: "fix_way", followUpType: "try_again", id: "fu1" });
  assert.equal(M.followUpFor(c, fix, s), null, "once per step per run");
  s = M.runNext(c, s, { type: "exit", exitId: "done" });
  const rec = M.runRecord(c, s);
  assert.deepEqual(rec.answers.at(-1), { fieldId: "again_fix_way", optionIds: ["this_week"] });
  assert.doesNotThrow(() => validateExt({ run: rec }));
  // Nothing stood out gets it too.
  const none = run(CHECKS.flatMap((ch) => [pick(ch, NO[ch]), next]), c);
  assert.equal(M.stepOf(skill, none.stepId).followUp.type, "try_again");
});
