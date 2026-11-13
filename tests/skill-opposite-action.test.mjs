// Do the Opposite (DBT ER Handouts 9-11; docs/design/opposite-action-v3.md) on the skill runtime (ER-B3, part 2): the
// doors, the goal and the safety split once, up to three feelings each run in turn (R16), the route per feeling, the
// body first, the step, then what you expect and when; a plan for later reopens the run (oa_try); and the projection's
// pure part (one OppositeActionSession v3 per feeling that reached its step). Tested through the same pure machine
// the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const { validateExt, EXT_MAX_BYTES } = await importTs("functions/src/spine/extSchemas.ts");
const { oaFromRun, repairRule } = await importTs("functions/src/oppositeAction/projection.ts");
const { legacyLink } = await importTs("src/lib/skillRuntime/playerTools.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
const skill = content.skills.find((s) => s.id === "opposite_action");
const embedOutputs = { holdRing: { ids: ["held", "partly", "skipped"], measures: ["durationSec", "doneCount", "earlyCount"] }, doorPicker: { emotions: 3 }, inlineSkill: { ids: ["finished", "left", "stopped", "body", "unsafe"] } };
const GRID = new Set(["anxious", "angry", "guilty", "sad", "ashamed", "happy", "lonely"]);
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: GRID, emotionLabel: (x) => x, ctxIn, embedOutputs });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const doors = (...ids) => ({ type: "embedDone", output: { ids } });
const held = { type: "embedDone", output: { ids: ["held"], durationSec: 4 } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const chips = (c, s, stepId, fieldId) => M.optionGroups(c, M.stepOf(skill, stepId).fields.find((f) => f.id === fieldId), M.answersOf(c, s)).flatMap((g) => g.options.map((o) => o.value));
const line = (s) => M.handoffLine(ctx(), M.stepOf(skill, s.stepId), { answers: M.answersOf(ctx(), s) });
const offers = (s) => M.offersFor(ctx(), M.stepOf(skill, s.stepId), { answers: M.answersOf(ctx(), s) });
const title = (s) => M.copyText(ctx(), M.stepOf(skill, s.stepId).title, { answers: M.answersOf(ctx(), s) });

const SAFE = [pick("goal", "connection"), next, pick("safety", "safe"), next];
/** One feeling from its validation screen to the step, on the opposite route. */
const OPPOSITE = (urge, size) => [pick("urge", urge), next, pick("want", "yes"), next, pick("fits", "not_fit"), next,
  pick("help", "unhelpful"), next];
const BODY = (cue, size) => [pick("cue", cue), next, held, pick("tvnb", "better"), next, pick("size", size), next];

test("the skill: tool opposite-action, starts at the doors, played by the player, close in the flow, a projection", () => {
  assert.equal(skill.toolId, "opposite-action");
  assert.equal(skill.start, "door");
  assert.deepEqual(skill.accepts, ["urgeId", "band"]);
  assert.deepEqual(skill.emotionFields, ["feel"]);
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'opposite-action': \{ module: 'er', closeKind: 'regulation_down' \}/);
  assert.match(readFileSync("src/lib/spine/close.ts", "utf8"), /'opposite-action': \{ module: 'er', closeKind: 'regulation_down' \}/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'opposite-action': 'opposite_action',/);
  assert.match(readFileSync("functions/src/skills/projections.ts", "utf8"), /'opposite-action': projectOppositeAction/);
});

test("the doors report grid words only, three at most, in order; a carried flooded reading settles the body first", () => {
  let s = run([doors("sad", "not_a_word", "angry", "anxious", "guilty")]);
  assert.deepEqual(s.answers.feel.ids, ["sad", "angry", "anxious"]);
  assert.equal(s.stepId, "goal");
  s = run([doors("sad")], ctx({ band: "flooded" }));
  assert.equal(s.stepId, "calm");
  s = run([held], ctx({ band: "flooded" }), s);
  assert.equal(s.stepId, "goal");
});

test("the safety split, once and before any feeling: danger, a boundary and not sure never reach a feeling", () => {
  const at = (safety) => run([doors("angry"), pick("goal", "boundary"), next, pick("safety", safety), next]);
  const dang = at("danger");
  assert.equal(dang.stepId, "dang");
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "dang"), dang)?.variant, "other_person");
  assert.deepEqual(offers(dang), ["ending", "pause"]);
  const bnd = at("boundary");
  assert.equal(bnd.stepId, "bnd");
  assert.deepEqual(offers(bnd), ["fast", "dear_man", "pause"]);
  const uns = at("unsure");
  assert.equal(uns.stepId, "uns");
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "uns"), uns)?.variant, "other_person");
  assert.equal(skill.exits.find((x) => x.id === "ending").query.frame, "careful");
  // The safety screen (its own, one question) shows the slot as soon as danger is picked; no close after a safety card.
  const picking = run([doors("angry"), pick("goal", "boundary"), next, pick("safety", "danger")]);
  assert.equal(picking.stepId, "safe");
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "safe"), picking)?.variant, "other_person");
  assert.ok(["dang", "bnd", "uns"].every((id) => M.stepOf(skill, id).noClose));
});

test("validation first: the parent's acknowledgment titles the urge screen, its urges only, a link's urge first", () => {
  const s = run([doors("anxious"), ...SAFE]);
  assert.equal(s.stepId, "vald");
  const title = M.copyText(ctx(), M.stepOf(skill, "vald").title, s, M.titleSlots(ctx(), M.stepOf(skill, "vald"), s));
  assert.equal(title, skill.copy.ack_fear);
  assert.ok(Object.keys(skill.copy).filter((k) => k.startsWith("ack_")).every((k) => skill.copy[k].length <= 90), "a title stays a line");
  const urges = chips(ctx(), s, "vald", "urge");
  assert.ok(urges.length >= 4 && urges.every((u) => u.startsWith("fear-")), urges.join());
  const linked = run([doors("anxious"), ...SAFE], ctx({ urgeId: "fear-cancel" }));
  assert.equal(chips(ctx({ urgeId: "fear-cancel" }), linked, "vald", "urge")[0], "fear-cancel");
  assert.equal(linked.answers["urge@anxious"], undefined, "never pressed");
});

test("the route, per feeling: opposite, clarify (its own line for not fit + helpful), problem, too big, repair", () => {
  const to = (feel, fits, help, goal = "connection") => run([doors(feel), pick("goal", goal), next, pick("safety", "safe"), next,
    pick("urge", chips(ctx(), run([doors(feel), ...SAFE]), "vald", "urge")[0]), next, pick("want", "yes"), next, pick("fits", fits), next, pick("help", help), next]);
  assert.equal(to("anxious", "not_fit", "unhelpful").stepId, "cue");
  // Only *I still do not know* checks the facts inline (ER-B5, Gate 2); the other clarify rows keep the clarify card.
  const clar = to("anxious", "not_fit", "helpful");
  assert.equal(clar.stepId, "clar");
  assert.equal(line(clar), skill.copy.clar_not_fit);
  assert.deepEqual(offers(clar), ["check_the_facts"]);
  assert.equal(line(to("anxious", "fits", "unsure")), skill.copy.clar_line);
  for (const help of ["helpful", "unhelpful", "unsure"]) assert.equal(to("anxious", "unsure", help).stepId, "ctf", help);
  const prob = to("angry", "fits", "helpful");
  assert.equal(prob.stepId, "prob");
  assert.deepEqual(offers(prob), ["problem_solve"]);
  assert.deepEqual(offers(to("angry", "excessive", "helpful")), ["cool_down", "problem_solve"]);
  const repr = to("guilty", "fits", "unhelpful", "repair");
  assert.equal(repr.stepId, "repr");
  assert.deepEqual(offers(repr), ["problem_solve_repair"], "Problem Solve opened on repair (H11), not on its feeling screen's not-fit card");
  const ex = skill.exits.find((e) => e.id === "problem_solve_repair");
  assert.deepEqual([ex.toolId, ex.query, ex.planned ?? false], ["problem-solve", { frame: "repair" }, false]);
  assert.deepEqual(M.carried(ex, repr, ctx()), ["guilty"], "the word goes with it, first on Problem Solve's feeling screen");
  assert.ok(content.skills.find((x) => x.id === "problem_solve").accepts.includes("frame"));
  assert.equal(to("guilty", "fits", "unhelpful", "connection").stepId, "cue", "repair only with the repair goal");
  assert.equal(to("sad", "fits", "unhelpful", "repair").stepId, "cue", "repair only for guilt or shame");
});

const toCheck = (feel, help, { goal = "connection", urge = null } = {}) => run([doors(feel), pick("goal", goal), next,
  pick("safety", "safe"), next, pick("urge", urge ?? chips(ctx(), run([doors(feel), ...SAFE]), "vald", "urge").find((u) => u !== "guilt-punish")), next,
  pick("want", "yes"), next, pick("fits", "unsure"), next, pick("help", help), next]);
const back = (from, ...ids) => run([{ type: "embedDone", output: { ids } }], ctx(), from);

test("Check the Facts inline on I still do not know (ER-B5): the verdict joins will it help? in the table, unsafe wins", () => {
  const ctf = toCheck("anxious", "unsure");
  assert.equal(ctf.stepId, "ctf");
  const step = M.stepOf(skill, "ctf");
  assert.equal(step.props.skill, "check_the_facts");
  assert.deepEqual(step.props.outcomes, ["fits", "partly", "doesnt_fit", "unsure"], "build.py writes the sub-skill's outcomes on the step");
  assert.deepEqual(M.inlineCtxFor(ctx(), ctf, step.props), { feelingId: "anxious" }, "the feeling it's on goes in");
  assert.equal(title(ctf), "A closer look at the fear", "the parent's noun, never the grid word");
  // The graph's table on the verdict (fits → fits, partly → excessive, doesnt_fit → not_fit) and the help answer.
  const flow = readFileSync("schema/opposite-action-flow.cypher", "utf8").match(/p\.contentJson = "((?:[^"\\]|\\.)*)"/)[1];
  const routes = JSON.parse(JSON.parse(`"${flow}"`)).routes;
  const STEP = { opposite: "cue", problem: "prob", clarify: "clar" };
  for (const help of ["helpful", "unhelpful", "unsure"]) {
    const from = toCheck("anxious", help);
    for (const [v, f] of [["fits", "fits"], ["partly", "excessive"], ["doesnt_fit", "not_fit"]]) {
      assert.equal(back(from, v).stepId, STEP[routes[`${f}:${help}`]], `${v}:${help}`);
    }
    assert.equal(back(from, "unsure").stepId, "clar", `unsure:${help}`);
  }
  const prob = back(toCheck("anxious", "helpful"), "fits");
  assert.equal(title(prob), skill.copy.prob_title_checked);
  const partly = back(toCheck("anxious", "helpful"), "partly");
  assert.equal(title(partly), skill.copy.prob_title_partly);
  assert.equal(line(partly), skill.copy.prob_partly);
  assert.deepEqual(offers(partly), ["cool_down", "problem_solve"]);
  // Doesn't fit, and acting on it seems useful: another goal? Wise mind, no second check.
  const other = back(toCheck("anxious", "helpful"), "doesnt_fit");
  assert.equal(other.stepId, "clar");
  assert.equal(line(other), skill.copy.clar_checked_helpful);
  assert.deepEqual(offers(other), ["wise_mind"]);
  const open = back(toCheck("anxious", "unsure"), "fits");
  assert.equal(title(open), skill.copy.clar_title_open);
  assert.equal(line(open), skill.copy.clar_checked_open);
  const notFitOpen = back(toCheck("anxious", "unsure"), "doesnt_fit");
  assert.equal(line(notFitOpen), skill.copy.clar_checked_notfit_open);
  const unsure = back(ctf, "unsure");
  assert.equal(title(unsure), skill.copy.clar_title_unsure);
  assert.equal(line(unsure), skill.copy.clar_unsure);
  assert.deepEqual(offers(unsure), ["wise_mind"]);
  // Leaving the check early: the facts will keep, the full check as a link.
  const left = back(ctf, "left");
  assert.equal(left.stepId, "clar");
  assert.equal(title(left), skill.copy.clar_title_left);
  assert.equal(line(left), skill.copy.clar_left);
  assert.deepEqual(offers(left), ["check_the_facts"]);
  // Leaving from the verdict screen still sends its flags back: leaving wins over every verdict (Codex, #116).
  for (const v of ["fits", "partly", "doesnt_fit"]) {
    for (const help of ["helpful", "unhelpful"]) assert.equal(back(toCheck("anxious", help), "left", v).stepId, "clar", `left + ${v}:${help}`);
  }
  assert.equal(back(toCheck("ashamed", "unhelpful", { goal: "repair" }), "left", "fits").stepId, "clar", "never repair on a leave");
  assert.equal(back(ctf, "left", "unsafe").stepId, "cdng", "unsafe still wins over leaving");
  // A danger chip, then a verdict: the danger card wins, the other-person resources, no close, no carrying on.
  const cdng = M.stepOf(skill, "cdng");
  assert.equal(cdng.noClose, true);
  assert.equal(cdng.carryOn, undefined, "nothing is practised after a danger card");
  for (const ids of [["fits", "unsafe"], ["doesnt_fit", "unsafe"], ["stopped", "unsafe"], ["stopped"]]) {
    const d = back(ctf, ...ids);
    assert.equal(d.stepId, "cdng", ids.join("+"));
    assert.equal(M.crisisFor(ctx(), cdng, d)?.variant, "other_person");
  }
  // An id the sub-skill can't give is dropped (the machine keeps only the declared ones).
  assert.equal(back(ctf, "made_up").stepId, "clar");
});

test("the inline check keeps the safety rules (Gate 3): Punish yourself, repair, a flooded reading", () => {
  // Punish yourself that fits is never "work on the situation": its own hand-off, the banner still on.
  for (const v of ["fits", "partly"]) {
    const s = back(toCheck("guilty", "helpful", { urge: "guilt-punish" }), v);
    assert.equal(s.stepId, "pun", v);
    assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "pun"), s)?.variant, "crisis");
  }
  assert.equal(back(toCheck("guilty", "unhelpful", { urge: "guilt-punish" }), "unsafe", "fits").stepId, "cdng");
  assert.ok(M.stepOf(skill, "cdng").crisis.some((c) => c.variant === "crisis"), "the Punish banner stays on the danger card");
  // Fits, but acting on it won't help: the opposite.
  assert.equal(back(toCheck("anxious", "unhelpful"), "fits").stepId, "cue");
  assert.equal(back(toCheck("anxious", "unhelpful"), "partly").stepId, "cue");
  // Guilt that fits with the repair goal: repair (H11).
  assert.equal(back(toCheck("guilty", "unhelpful", { goal: "repair" }), "fits").stepId, "repr");
  // A flooded reading never opens the check: the clarify card, the body first.
  const fc = ctx({ band: "flooded" });
  let f = run([doors("anxious"), held], fc);
  const urge = chips(fc, run([...SAFE], fc, f), "vald", "urge")[0];
  f = run([...SAFE, pick("urge", urge), next, pick("want", "yes"), next, pick("help", "unsure"), next], fc, f);
  assert.equal(f.stepId, "clar");
  assert.equal(M.handoffLine(fc, M.stepOf(skill, "clar"), { answers: M.answersOf(fc, f) }), skill.copy.clar_flooded);
  assert.equal(M.offersFor(fc, M.stepOf(skill, "clar"), { answers: M.answersOf(fc, f) })[0], "cool_down");
});

test("the projection's re-check is the skill's route: opposite exactly where the skill reaches the cue (every fit, help, goal)", () => {
  const flow = readFileSync("schema/opposite-action-flow.cypher", "utf8").match(/p\.contentJson = "((?:[^"\\]|\\.)*)"/)[1];
  const routes = JSON.parse(JSON.parse(`"${flow}"`)).routes;
  const parentOf = { guilty: "guilt", sad: "sadness", ashamed: "shame" };
  for (const feel of Object.keys(parentOf)) {
    const urge = chips(ctx(), run([doors(feel), ...SAFE]), "vald", "urge").find((u) => u !== "guilt-punish");
    for (const goal of ["connection", "repair"]) for (const fits of ["fits", "excessive", "not_fit", "unsure"]) for (const help of ["helpful", "unhelpful", "unsure"]) {
      const s = run([doors(feel), pick("goal", goal), next, pick("safety", "safe"), next, pick("urge", urge), next, pick("want", "yes"), next,
        pick("fits", fits), next, pick("help", help), next]);
      const server = routes[`${fits}:${help}`] === "opposite" && !repairRule(parentOf[feel], fits, goal);
      assert.equal(s.stepId === "cue", server, `${feel} ${goal} ${fits}:${help} → ${s.stepId}`);
    }
  }
});

test("Punish yourself opens safety.open over the next screen and keeps the crisis banner on that feeling's screens", () => {
  let s = run([doors("guilty"), ...SAFE, pick("urge", "guilt-punish"), next]);
  assert.equal(s.stepId, "want");
  assert.ok(M.opensSafety(ctx(), M.stepOf(skill, "want"), s));
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "want"), s)?.variant, "crisis");
  s = run([pick("want", "yes"), next, pick("fits", "not_fit"), next], ctx(), s);
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, s.stepId), s)?.variant, "crisis");
  const other = run([doors("guilty"), ...SAFE, pick("urge", "guilt-apologize"), next]);
  assert.equal(M.opensSafety(ctx(), M.stepOf(skill, "want"), other), false);
  assert.ok(skill.steps.every((st) => !st.safetyFirst || st.id === "want"));
  // Kept, or "acting on it helps": never "worth keeping" or a plan to act on it; the banner stays (Gate 3).
  const kept = run([doors("guilty"), ...SAFE, pick("urge", "guilt-punish"), next, pick("want", "no"), next]);
  assert.equal(kept.stepId, "pun");
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "pun"), kept)?.variant, "crisis");
  assert.deepEqual(offers(kept), ["problem_solve", "ride"]);
  const helps = run([doors("guilty"), ...SAFE, pick("urge", "guilt-punish"), next, pick("want", "yes"), next, pick("fits", "fits"), next, pick("help", "helpful"), next]);
  assert.equal(helps.stepId, "pun");
  assert.ok(!/keep|acting on it/i.test(skill.copy.pun_title + skill.copy.pun_line));
  const clarHelps = run([doors("guilty"), ...SAFE, pick("urge", "guilt-punish"), next, pick("want", "yes"), next, pick("fits", "not_fit"), next, pick("help", "helpful"), next]);
  assert.equal(clarHelps.stepId, "pun", "punish that seems helpful never reaches clarify");
});

test("three feelings in turn: a kept feeling offers Carry on, the next runs its own sub-run, then once after all", () => {
  let s = run([doors("sad", "angry"), ...SAFE, pick("urge", chips(ctx(), run([doors("sad"), ...SAFE]), "vald", "urge")[0]), next, pick("want", "no"), next]);
  assert.equal(s.stepId, "keep");
  assert.deepEqual(M.carryOnOthers(ctx(), s), ["angry"]);
  s = run([{ type: "carryOn" }], ctx(), s);
  assert.equal(s.stepId, "vald");
  const t = M.copyText(ctx(), M.stepOf(skill, "vald").title, s, M.titleSlots(ctx(), M.stepOf(skill, "vald"), s));
  assert.equal(t, skill.copy.ack_anger, "the second feeling's own acknowledgment");
  s = run([...OPPOSITE("anger-lash"), ...BODY(chips(ctx(), s, "cue", "cue")[0], "anger-lash:small")], ctx(), s);
  // The cue list was read before the urge was picked: pick from the real list.
  assert.equal(s.stepId, "pred");
  assert.deepEqual(s.answers["size@angry"].ids, ["anger-lash:small"]);
  assert.equal(s.answers["size@sad"], undefined);
});

test("the cue and the step follow the urge: its own steps, the parent's defaults for an urge in your own words", () => {
  let s = run([doors("sad"), ...SAFE, ...OPPOSITE("sad-bed")]);
  assert.equal(s.stepId, "cue");
  const cues = chips(ctx(), s, "cue", "cue");
  assert.ok(cues.length > 0);
  s = run([pick("cue", cues[0]), next, held, pick("tvnb", "same"), next], ctx(), s);
  assert.deepEqual(chips(ctx(), s, "size", "size"), ["sad-bed:small", "sad-bed:medium", "sad-bed:bigger"]);
  let o = run([doors("sad"), ...SAFE, own("urge", "Eat the whole cake"), next, pick("want", "yes"), next, pick("fits", "not_fit"), next, pick("help", "unhelpful"), next]);
  o = run([pick("cue", chips(ctx(), o, "cue", "cue")[0]), next, held, pick("tvnb", "same"), next], ctx(), o);
  assert.deepEqual(chips(ctx(), o, "size", "size"), ["sadness:small", "sadness:medium", "sadness:bigger"]);
  // The hold's title is the cue picked.
  const h = run([doors("sad"), ...SAFE, ...OPPOSITE("sad-bed"), pick("cue", cues[0]), next]);
  assert.equal(h.stepId, "hold");
  assert.equal(M.copyText(ctx(), M.stepOf(skill, "hold").title, h, M.titleSlots(ctx(), M.stepOf(skill, "hold"), h)),
    skill.options.cue.find((x) => x.value === cues[0]).label);
});

const TO_PRED = () => {
  const s = run([doors("sad"), ...SAFE, ...OPPOSITE("sad-bed")]);
  return run(BODY(chips(ctx(), s, "cue", "cue")[0], "sad-bed:small"), ctx(), s);
};

test("try it now: what happened, then one readout line (the prediction gap first); no numbers anywhere", () => {
  let s = run([pick("predict", "badly"), next, pick("when", "now"), next], ctx(), TO_PRED());
  assert.equal(s.stepId, "try");
  s = run([next, pick("outcome", "toward_goal"), next, pick("actual", "nothing"), next, pick("tvna", "better"), next], ctx(), s);
  assert.equal(s.stepId, "read");
  assert.equal(line(s), skill.copy.read_gap);
  const badly = run([pick("predict", "badly"), next, pick("when", "now"), next, next, pick("outcome", "partial"), next, pick("actual", "badly"), next, pick("tvna", "same"), next], ctx(), TO_PRED());
  assert.equal(line(badly), skill.copy.read_part, "\"It didn't\" never answers \"It went badly\"");
  const worseGap = run([pick("predict", "worse"), next, pick("when", "now"), next, next, pick("outcome", "toward_goal"), next, pick("actual", "badly"), next, pick("tvna", "same"), next], ctx(), TO_PRED());
  assert.notEqual(line(worseGap), skill.copy.read_worse_gap);
  // *It felt unsafe* never gets a line that says it went fine, and the title isn't "You did the opposite".
  for (const actual of ["nothing", "better"]) for (const predict of ["badly", "worse", "react"]) {
    const unsafe = run([pick("predict", predict), next, pick("when", "now"), next, next, pick("outcome", "unsafe"), next, pick("actual", actual), next, pick("tvna", "same"), next], ctx(), TO_PRED());
    assert.equal(line(unsafe), skill.copy.read_unsafe, `${predict} / unsafe / ${actual}`);
    assert.equal(M.copyText(ctx(), M.stepOf(skill, "read").title, { answers: M.answersOf(ctx(), unsafe) }), skill.copy.read_unsafe_title);
  }
  assert.equal(M.askFresh(ctx(), s).thenVsNow, "better", "the pull after trying is the session's then-vs-now");
  // The body's check (per feeling, "better") comes first on the path; after trying ("worse") is newer, so it wins.
  const worse = run([pick("predict", "badly"), next, pick("when", "now"), next, next, pick("outcome", "partial"), next, next, pick("tvna", "worse"), next], ctx(), TO_PRED());
  assert.equal(M.askFresh(ctx(), worse).thenVsNow, "worse", "the newest answer on the path is the session's, per-pick or not");
  assert.equal(M.askFresh(ctx(), TO_PRED()).thenVsNow, "better", "before trying, the body's check is the newest");
  // A per-pick check whose step fell off the front of the capped path (or was restored on resume) still counts.
  const capped = { ...TO_PRED(), path: TO_PRED().path.filter((e) => !e.startsWith("aftb")) };
  assert.equal(M.askFresh(ctx(), capped).thenVsNow, "better", "off the path, the last pick's own answer is kept");
  const unsafe = run([next, pick("when", "now"), next, next, pick("outcome", "unsafe"), next, next, pick("tvna", "same"), next], ctx(), TO_PRED());
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "read"), unsafe)?.variant, "other_person");
  assert.deepEqual(offers(unsafe), ["pause"]);
  assert.ok(!JSON.stringify(skill.copy).match(/\b(0|10)\b|out of 10|rate/i), "no 0-10 scale in the copy");
});

test("a plan for later: a chip schedules oa_try, whose card reopens the run at Did you get to try it?", () => {
  const s = run([next, pick("when", "today"), pick("due", "evening")], ctx(), TO_PRED());
  assert.deepEqual(M.followUpFor(ctx(), M.stepOf(skill, "when"), s), { type: "oa_try", chip: "evening" });
  const none = run([next, pick("when", "next_time")], ctx(), TO_PRED());
  assert.equal(M.followUpFor(ctx(), M.stepOf(skill, "when"), none), null, "no chip, no card");
  const ft = spine.followUpTypes.find((x) => x.id === "oa_try");
  assert.ok(ft && ft.enabled);
  assert.equal(ft.deepLinkTemplate, "/tool/opposite-action?run={sourceSessionId}&at=back&followUp={followUpId}");
  assert.deepEqual(Object.keys(ft.window.chips).sort(), skill.options.due.map((o) => o.value).sort());
  const planned = run([next], ctx(), s);
  assert.equal(planned.stepId, "plan");
  // Reopened at back: tried → what happened (no pull asked: a reopen reads nothing ask-fresh) → readout; or why not.
  const rec = { ...M.runRecord(ctx(), { ...planned, scheduled: { when: { type: "oa_try", id: "f1" } } }) };
  let r = M.resumeRun(ctx(), rec, "back");
  assert.equal(r?.stepId, "back");
  r = run([pick("tried", "yes"), next, pick("outcome", "partial"), next, next], ctx(), r);
  assert.equal(r.stepId, "read2");
  assert.equal(line(r), skill.copy.read_part);
  const miss = run([pick("tried", "too_strong"), next], ctx(), M.resumeRun(ctx(), rec, "back"));
  assert.equal(miss.stepId, "miss");
  assert.deepEqual(offers(miss), ["pause"]);
});

test("the longest record fits ext: three feelings, own words everywhere, ≤ 40 answers", () => {
  let s = run([doors("sad", "angry", "anxious"), ...SAFE]);
  for (let i = 0; i < 3; i++) {
    s = run([own("urge", "x".repeat(90)), next, pick("want", "yes"), next, pick("fits", "not_fit"), next, pick("help", "unhelpful"), next], ctx(), s);
    s = run([pick("cue", chips(ctx(), s, "cue", "cue")[0]), next, held, pick("tvnb", "same"), next, own("size", "y".repeat(90)), next], ctx(), s);
  }
  assert.equal(s.stepId, "pred");
  s = run([pick("predict", "worse"), next, pick("when", "now"), next, next, pick("outcome", "toward_goal"), next, pick("actual", "better"), next, pick("tvna", "much_better"), next], ctx(), s);
  assert.equal(s.stepId, "read");
  const rec = M.runRecord(ctx(), s);
  assert.ok(rec.answers.length <= 40, String(rec.answers.length));
  const ext = validateExt({ run: rec });
  assert.ok(ext && JSON.stringify(ext).length <= 4096, String(JSON.stringify(ext ?? {}).length));
});

test("the longest real record through the inline check fits ext: three feelings, own words at the cap, ≤ 40 answers, ≤ EXT_MAX_BYTES", () => {
  // Every feeling goes the longest way: urge in own words, the clarify route, Check the Facts inline (it doesn't fit),
  // then a cue, the hold, the change check and a step in own words. Own words at the skill's cap in 3-byte characters.
  const W = (c) => c.repeat(skill.ownMax);
  let s = run([doors("sad", "angry", "anxious"), ...SAFE]);
  for (let i = 0; i < 3; i++) {
    s = run([own("urge", W("愛")), next, pick("want", "yes"), next, pick("fits", "unsure"), next, pick("help", "unhelpful"), next], ctx(), s);
    assert.equal(s.stepId, "ctf");
    s = run([{ type: "embedDone", output: { ids: ["doesnt_fit"] } }], ctx(), s);
    assert.equal(s.stepId, "cue");
    s = run([pick("cue", chips(ctx(), s, "cue", "cue")[0]), next, held, pick("tvnb", "same"), next, own("size", W("愛")), next], ctx(), s);
  }
  assert.equal(s.stepId, "pred");
  s = run([pick("predict", "worse"), next, pick("when", "now"), next, next, pick("outcome", "toward_goal"), next, pick("actual", "better"), next, pick("tvna", "much_better"), next], ctx(), s);
  const rec = M.runRecord(ctx(), s);
  assert.equal(rec.answers.filter((x) => x.fieldId === "checked").length, 3);
  assert.ok(rec.answers.length <= 40, String(rec.answers.length));
  const ext = validateExt({ run: rec });
  assert.ok(ext, "the server's schema takes it");
  // 4.3 KB: over the old 4 KB, the reason EXT_MAX_BYTES is 6 KB (ER-B5).
  assert.ok(Buffer.byteLength(JSON.stringify(ext), "utf8") <= EXT_MAX_BYTES, String(Buffer.byteLength(JSON.stringify(ext), "utf8")));
});

test("a carried flooded reading (ER-B5): *will it help?* first, the fit check only after the body, once the pull is weaker", () => {
  const fc = ctx({ band: "flooded" });
  const start = (feel, goal = "connection") => {
    const f = run([doors(feel), held], fc);
    const urge = chips(fc, run([pick("goal", goal), next, pick("safety", "safe"), next], fc, f), "vald", "urge")[0];
    return run([pick("goal", goal), next, pick("safety", "safe"), next, pick("urge", urge), next, pick("want", "yes"), next], fc, f);
  };
  let s = start("anxious");
  assert.equal(s.stepId, "help", "no fit question while the body is loud");
  // It won't help: H10's own reason for the opposite. The body first.
  s = run([pick("help", "unhelpful"), next], fc, s);
  assert.equal(s.stepId, "cue");
  const cue = chips(fc, s, "cue", "cue")[0];
  // The pull weaker after the hold: now the fit check, with its line.
  const settled = run([pick("cue", cue), next, held, pick("tvnb", "better"), next], fc, s);
  assert.equal(settled.stepId, "lfit");
  assert.equal(M.handoffLine(fc, M.stepOf(skill, "lfit"), { answers: M.answersOf(fc, settled) }), skill.copy.fits_quieter);
  for (const v of ["fits", "excessive", "not_fit"]) assert.equal(run([pick("fitl", v), next], fc, settled).stepId, "size", v);
  const unsure = run([pick("fitl", "unsure"), next], fc, settled);
  assert.equal(unsure.stepId, "clar", "not sure, even calmer: the opposite can wait");
  assert.equal(M.copyText(fc, M.stepOf(skill, "clar").title, { answers: M.answersOf(fc, unsure) }), skill.copy.clar_title_unsure);
  assert.equal(M.handoffLine(fc, M.stepOf(skill, "clar"), { answers: M.answersOf(fc, unsure) }), skill.copy.clar_unsure);
  assert.deepEqual(M.offersFor(fc, M.stepOf(skill, "clar"), { answers: M.answersOf(fc, unsure) }), ["check_the_facts", "wise_mind"], "the body was already done");
  // Not weaker: the fit stays unasked, and only the small step is offered.
  const loud = run([pick("cue", cue), next, held, pick("tvnb", "same"), next], fc, s);
  assert.equal(loud.stepId, "size");
  const sizes = chips(fc, loud, "size", "size");
  assert.ok(sizes.length >= 1 && sizes.every((v) => v.endsWith(":small")), sizes.join());
  assert.equal(M.handoffLine(fc, M.stepOf(skill, "size"), { answers: M.answersOf(fc, loud) }), skill.copy.size_small_only);
  const settledSizes = chips(fc, run([pick("fitl", "not_fit"), next], fc, settled), "size", "size");
  assert.ok(settledSizes.some((v) => v.endsWith(":bigger")), "once the fit is known, every size");
  // Going back never leaves a late fit standing (Gate 1): back to *the pull is…*, now the same → small only again;
  // back to *will it help?*, now it would help → the clarify card with its flooded line and the body first.
  const atSize = run([pick("fitl", "not_fit"), next], fc, settled);
  const back = { type: "back" };
  const sameNow = run([back, back, pick("tvnb", "same"), next], fc, atSize);
  assert.equal(sameNow.stepId, "size");
  assert.ok(chips(fc, sameNow, "size", "size").every((v) => v.endsWith(":small")));
  const helpNow = run([back, back, back, back, back, pick("help", "helpful"), next], fc, atSize);
  assert.equal(helpNow.stepId, "clar");
  assert.equal(M.handoffLine(fc, M.stepOf(skill, "clar"), { answers: M.answersOf(fc, helpNow) }), skill.copy.clar_flooded);
  assert.equal(M.offersFor(fc, M.stepOf(skill, "clar"), { answers: M.answersOf(fc, helpNow) })[0], "cool_down");
  // No cue picked: straight to the small step, the fit unasked.
  assert.equal(run([next], fc, s).stepId, "size");
  // It would help, or not sure: the clarify card, the body first (as before).
  for (const h of ["helpful", "unsure"]) {
    const c = run([pick("help", h), next], fc, start("anxious"));
    assert.equal(c.stepId, "clar", h);
    assert.equal(M.handoffLine(fc, M.stepOf(skill, "clar"), { answers: M.answersOf(fc, c) }), skill.copy.clar_flooded);
  }
  // Guilt with the repair goal waits for the facts: never the opposite unasked.
  assert.equal(run([pick("help", "unhelpful"), next], fc, start("guilty", "repair")).stepId, "clar");
  // Not flooded: unchanged, the fit before *will it help?*.
  assert.equal(run([doors("anxious"), ...SAFE, pick("urge", chips(ctx(), run([doors("anxious"), ...SAFE]), "vald", "urge")[0]), next, pick("want", "yes"), next]).stepId, "fits");
  // The record: the unasked fit still reaches the projection's reading, on *won't help*.
  const done = run([pick("size", sizes[0]), next, next, pick("when", "now"), next, next, pick("outcome", "toward_goal"), next, next, pick("tvna", "better"), next], fc, loud);
  const oa = oaFromRun(M.runRecord(fc, done));
  assert.deepEqual(oa.picks.map((p) => [p.emotionId, p.facts, p.effectiveness]), [["anxious", null, "unhelpful"]]);
});

test("the projection's reading: one record per feeling that reached its step, the size from the option id, own words custom", () => {
  let s = run([doors("sad", "angry"), ...SAFE, ...OPPOSITE("sad-bed")]);
  s = run(BODY(chips(ctx(), s, "cue", "cue")[0], "sad-bed:medium"), ctx(), s);
  s = run([own("urge", "Snap at them"), next, pick("want", "yes"), next, pick("fits", "not_fit"), next, pick("help", "unhelpful"), next], ctx(), s);
  s = run([pick("cue", chips(ctx(), s, "cue", "cue")[0]), next, held, pick("tvnb", "better"), next, own("size", "Walk away"), next], ctx(), s);
  s = run([next, pick("when", "now"), next, next, pick("outcome", "toward_goal"), next, next, pick("tvna", "better"), next], ctx(), s);
  const oa = oaFromRun(M.runRecord(ctx(), s));
  assert.equal(oa.status, "practiced");
  assert.deepEqual(oa.picks.map((p) => [p.emotionId, p.urgeId, p.actionSize]), [["sad", "sad-bed", "medium"], ["angry", "custom", "custom"]]);
  assert.equal(oa.safety, "safe");
  assert.equal(oa.outcome, "toward_goal");
  const viaCheck = oaFromRun({ answers: [{ fieldId: "feel", optionIds: ["sad"] }, { fieldId: "urge", pick: "sad", optionIds: ["sad-bed"] },
    { fieldId: "fits", pick: "sad", optionIds: ["unsure"] }, { fieldId: "help", pick: "sad", optionIds: ["unsure"] },
    { fieldId: "checked", pick: "sad", optionIds: ["doesnt_fit"] }, { fieldId: "size", pick: "sad", optionIds: ["sad-bed:small"] }], path: ["read"] });
  assert.equal(viaCheck.picks[0].checked, "doesnt_fit");
  const unsafeCheck = oaFromRun({ answers: [{ fieldId: "feel", optionIds: ["sad"] }, { fieldId: "urge", pick: "sad", optionIds: ["sad-bed"] },
    { fieldId: "fits", pick: "sad", optionIds: ["unsure"] }, { fieldId: "help", pick: "sad", optionIds: ["unsure"] },
    { fieldId: "checked", pick: "sad", optionIds: ["doesnt_fit", "unsafe"] }, { fieldId: "size", pick: "sad", optionIds: ["sad-bed:small"] }], path: ["read"] });
  assert.equal(unsafeCheck.picks[0].checked, null);
  // A kept feeling never reached its step: no record.
  const kept = run([doors("sad"), ...SAFE, pick("urge", "sad-bed"), next, pick("want", "no"), next]);
  assert.deepEqual(oaFromRun(M.runRecord(ctx(), kept)).picks, []);
  assert.equal(repairRule("guilt", "fits", "repair"), true);
  assert.equal(repairRule("sadness", "fits", "repair"), false);
});

test("a reopened visit counts only its own urges: the first visit's, read back, are left out", () => {
  let s = run([doors("sad"), ...SAFE, ...OPPOSITE("sad-bed")]);
  s = run([...BODY(chips(ctx(), s, "cue", "cue")[0], "sad-bed:small"), next, pick("when", "today"), pick("due", "hour"), next], ctx(), s);
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), { ...s, scheduled: { when: { type: "oa_try", id: "f1" } } }), "back");
  const readBack = M.runUrgeIds(ctx(), r);
  assert.deepEqual(readBack, ["sad-bed"]);
  assert.deepEqual(M.visitUrgeIds(ctx(), r, readBack), []);
  // An urge picked on the reopened visit itself is this visit's (as a review screen with urge options would add).
  const picked = { ...r, answers: { ...r.answers, "urge@sad": { ids: ["sad-isolate"], own: null } } };
  assert.deepEqual(M.visitUrgeIds(ctx(), picked, readBack), ["sad-isolate"]);
  assert.match(readFileSync("src/components/skillPlayer/SkillPlayer.tsx", "utf8"), /setUrgeIds\(visitUrgeIds\(ctx, st, reopenUrges\.current\)\)/);
});

test("old plan links still open the hand-built page; the skill's own reopen link goes to the player", () => {
  assert.equal(legacyLink("opposite-action", "?followUp=0f8c2a9e-5b1d-4c3e-9a7f-2d6b8e4c1a03"), true);
  assert.equal(legacyLink("opposite-action", "?run=a&at=back&followUp=b"), false);
  assert.equal(legacyLink("opposite-action", ""), false);
  assert.equal(legacyLink("problem-solve", "?followUp=x"), false);
});

test("each screen says which feeling it's about: the parent's noun in titles, 1 of 2, the step card, the size names", () => {
  const s = run([doors("anxious", "sad"), ...SAFE, pick("urge", "fear-escape"), next]);
  assert.equal(M.copyText(ctx(), M.stepOf(skill, "want").title, s, {}), "Do you want to turn the fear down?");
  assert.deepEqual(M.pickTrack(ctx(), s), { label: "anxious", index: 0, count: 2 });
  assert.equal(M.pickTrack(ctx(), run([doors("sad"), ...SAFE])), null, "one feeling: no track");
  assert.ok(!JSON.stringify(skill.copy).includes("{each}"), "never the grid word inside a sentence");
  const sizes = skill.options.size.filter((o) => o.urgeFor === "fear-escape").map((o) => o.label);
  assert.ok(sizes.every((l) => /^(A small start|A little further|Fuller practice): /.test(l)), sizes.join(" | "));
  for (const id of ["when", "try", "back"]) assert.ok(M.stepOf(skill, id).slots?.some((x) => x.embed === "oaSteps"), id);
  // The cue is optional (the old page's *None of these work for me*): no cue, no hold, straight to the step.
  const noCue = run([doors("sad"), ...SAFE, ...OPPOSITE("sad-bed"), next]);
  assert.equal(noCue.stepId, "size");
});

test("H10 step 5, all the way: the size step's hint brings in thoughts and words, alongside the body (ER-B5)", () => {
  const size = skill.steps.find((x) => x.id === "size");
  assert.equal(size.hint, "size_hint");
  assert.match(skill.copy.size_hint, /thoughts and words do the opposite too/);
  assert.doesNotMatch(skill.copy.size_hint, /\b(should|just|must)\b/i);
});
