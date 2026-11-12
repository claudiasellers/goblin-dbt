// Cope Ahead (DBT ER Handout 19; docs/design/cope-ahead.md) on the skill runtime (ER-B2): the port of the hand-built
// page keeps its behaviour (the old src/lib/copeAheadTool.ts tests are the reference): the situation from a link
// first, never pressed; the situation's moments; a danger moment's banner and its move first; moves by pull and
// situation; the "If" from the pull; one rehearsal and *once more*; settle, never skipped silently; *Keep this* keeps
// `cope_ahead_plan`; *Yes* schedules the after card at screen 1's when; and `ext.ca` from the run, so the after card,
// the part tag, Reflect and stats read what they read. Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const { validateExt } = await importTs("functions/src/spine/extSchemas.ts");
const { PROFILE_KINDS, checkValue } = await importTs("functions/src/profile/kinds.ts");
const { caFromRun } = await importTs("functions/src/copeAhead/projection.ts");
const { planIdsFromExt, partIdFromExt } = await importTs("functions/src/spine/copeAheadAfter.ts");
const P = await importTs("src/lib/copeAheadPlan.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const CA = JSON.parse(readFileSync("src/data/content/cope-ahead.json", "utf8")).content;
const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
const skill = content.skills.find((s) => s.id === "cope_ahead");
const embedOutputs = { holdRing: { ids: ["held", "partly", "skipped"], measures: ["durationSec", "doneCount", "earlyCount"] }, rehearsal: { ids: ["done"] } };
const GRID = new Set(["anxious", "nervous", "angry", "hurt", "embarrassed", "sad", "lonely"]);
const PART = "0f8c2a9e-5b1d-4c3e-9a7f-2d6b8e4c1a03";
const ctx = (ctxIn = {}, profile = null) => ({ skill, shared: content, carried: [], gridIds: GRID, emotionLabel: (x) => x, ctxIn, embedOutputs, profile });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const done = { type: "embedDone", output: { ids: ["done"] } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const chips = (c, s, stepId, fieldId) => M.optionGroups(c, M.stepOf(skill, stepId).fields.find((f) => f.id === fieldId), s.answers).flatMap((g) => g.options.map((o) => o.value));

const TO_PLAN = [pick("situation", "conversation"), pick("when", "tomorrow"), next, pick("feel", "anxious"), pick("pull", "blank"), next,
  pick("moment", "go_blank"), next];
const PLANNED = [...TO_PLAN, pick("moves", "feet"), pick("moves", "give_minute"), next];

test("the skill: tool cope-ahead, starts at what's coming, no close question, played by the player, takes a situation and a part", () => {
  assert.equal(skill.toolId, "cope-ahead");
  assert.equal(skill.start, "what");
  assert.deepEqual(skill.accepts, ["situationId", "partId"]);
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'cope-ahead': \{ module: 'er', closeKind: 'none' \}/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'cope-ahead': 'cope_ahead',/);
  assert.match(readFileSync("functions/src/skills/projections.ts", "utf8"), /'cope-ahead': projectCopeAhead/);
  // Its words are Cope Ahead's own (cope-ahead.json), by the same keys.
  for (const k of ["what_title", "moment_title", "plan_title", "keep_title", "settle_title"]) assert.equal(skill.copy[k], CA.copy[k], k);
});

test("a link's situation comes first and is never pressed (R12); an unknown one changes nothing", () => {
  const c = ctx({ situationId: "someone" });
  const s = M.initialRun(skill);
  assert.equal(chips(c, s, "what", "situation")[0], "someone");
  assert.equal(s.answers.situation, undefined, "nothing picked");
  assert.equal(M.canGoOn(c, s), false, "Next waits for a situation");
  assert.deepEqual(chips(ctx({ situationId: "mars" }), s, "what", "situation"), CA.situations.map((x) => x.id));
});

test("the situation's feelings and moments; own words alone are Something else", () => {
  const s = run([pick("situation", "work_school"), next]);
  const feel = M.shownFields(ctx(), M.stepOf(skill, "feel"), s).map((f) => f.id);
  assert.deepEqual(feel, ["feel", "pull"]);
  const field = M.stepOf(skill, "feel").fields.find((f) => f.id === "feel");
  assert.deepEqual(M.emotionChoices(ctx(), field, s.answers), ["anxious", "pressured", "inadequate", "exposed"]);
  assert.deepEqual(M.emotionChoices(ctx(), field, {}), CA.situations.find((x) => x.id === "other").likelyFeelings, "no situation yet: Something else's");
  const m = run([pick("situation", "work_school"), next, next]);
  assert.equal(m.stepId, "hard");
  assert.deepEqual(chips(ctx(), m, "hard", "moment"), ["go_blank", "criticised", "mistake_seen", "cant_answer"].sort((a, b) => CA.hardMoments.findIndex((x) => x.id === a) - CA.hardMoments.findIndex((x) => x.id === b)));
  const o = run([own("situation", "My sister's wedding"), next]);
  assert.deepEqual(M.emotionChoices(ctx(), field, o.answers), CA.situations.find((x) => x.id === "other").likelyFeelings);
  const om = run([own("situation", "My sister's wedding"), next, next]);
  assert.deepEqual(new Set(chips(ctx(), om, "hard", "moment")), new Set(CA.situations.find((x) => x.id === "other").hardMoments));
});

test("a danger moment: CrisisBanner alongside on the moment and plan screens (other_person for They might hurt me), its move first, never pressed", () => {
  for (const [sit, moment, variant, move] of [["conversation", "might_hurt", "other_person", "leave_safe"], ["alone", "might_hurt_self", "crisis", "reach_help"]]) {
    const s = run([pick("situation", sit), next, next, pick("moment", moment)]);
    assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "hard"), s)?.variant, variant, moment);
    const p = run([next], ctx(), s);
    assert.equal(p.stepId, "plan");
    assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "plan"), p)?.variant, variant);
    const moves = chips(ctx(), p, "plan", "moves");
    assert.equal(moves[0], move, "the danger move first");
    assert.equal(p.answers.moves, undefined, "not pre-selected: they choose it");
    assert.equal(moves.filter((x) => x === "leave_safe" || x === "reach_help").length, 1, "only its own danger move");
  }
  const calm = run([pick("situation", "conversation"), next, next, pick("moment", "go_blank")]);
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "hard"), calm), null);
  assert.deepEqual(M.fieldLinks(ctx(), M.stepOf(skill, "hard").fields[0], calm), [], "no safety link on a calm moment");
  assert.ok(!chips(ctx(), run([next], ctx(), calm), "plan", "moves").some((x) => x === "leave_safe" || x === "reach_help"), "a danger move never shows elsewhere");
});

test("a danger moment's plan holds only safe moves, for every situation and pull; I might hurt myself links to Talk to someone now", () => {
  const SAFE = {
    might_hurt: ["leave_safe", "long_out", "feet", "cold_water", "hold_something", "text_trust", "five_senses", "cool_down"],
    might_hurt_self: ["reach_help", "long_out", "feet", "cold_water", "hold_something", "give_minute", "step_out", "text_trust", "pause", "five_senses", "cool_down", "urge_surfing"],
  };
  for (const sit of CA.situations) {
    for (const moment of sit.hardMoments.filter((m) => m in SAFE)) {
      for (const pull of ["fight", "chase", "hide", "blank", "not_sure", null]) {
        const s = run([pick("situation", sit.id), next, ...(pull ? [pick("pull", pull)] : []), next, pick("moment", moment), next]);
        const moves = chips(ctx(), s, "plan", "moves");
        const unsafe = moves.filter((x) => !SAFE[moment].includes(x));
        assert.deepEqual(unsafe, [], `${sit.id} / ${moment} / ${pull}`);
        assert.equal(moves[0], SAFE[moment][0], "its own move first");
        // The rehearsal and the keep card carry the banner too.
        for (const st of ["walk", "keep"]) assert.ok(M.crisisFor(ctx(), M.stepOf(skill, st), s), `${st} keeps the banner`);
        assert.ok(!M.shownFields(ctx(), M.stepOf(skill, "plan"), s).some((f) => f.id === "forpull"), "the If stays the danger moment");
        const field = (st, id) => M.stepOf(skill, st).fields.find((f) => f.id === id);
        const links = [...M.fieldLinks(ctx(), field("hard", "moment"), s), ...M.fieldLinks(ctx(), field("plan", "moves"), s),
          ...M.stepLinks(ctx(), M.stepOf(skill, "walk"), s)].map((l) => l.exit.id);
        if (moment === "might_hurt_self") assert.deepEqual([...new Set(links)], ["safety_open"]);
        else assert.deepEqual(links, []);
      }
    }
  }
  assert.ok(skill.exits.some((x) => x.id === "safety_open" && x.safety));
});

test("moves follow the pull (else the general ones) and the situation; changing the pull drops moves it no longer offers", () => {
  const byPull = (pull, sit = "conversation") => {
    const s = run([pick("situation", sit), next, ...(pull ? [pick("pull", pull)] : []), next, pick("moment", sit === "conversation" ? "go_blank" : "go_blank"), next]);
    return chips(ctx(), s, "plan", "moves");
  };
  const fit = (pull, sit) => CA.moves.filter((m) => !m.forMoments.length && (!m.forSituations.length || m.forSituations.includes(sit))
    && (pull && pull !== "not_sure" ? m.forPulls.includes(pull) : m.general)).map((m) => m.id);
  for (const pull of ["fight", "chase", "hide", "blank", "not_sure", null]) {
    assert.deepEqual(new Set(byPull(pull)), new Set(fit(pull, "conversation")), String(pull));
    assert.deepEqual(new Set(byPull(pull, "work_school")), new Set(fit(pull, "work_school")), `${pull} at work`);
  }
  assert.ok(byPull("fight").includes("name_it") && !byPull("fight", "work_school").includes("name_it"), "a conversation move stays with conversations");
  let s = run([...TO_PLAN, pick("moves", "say_hard")]);
  assert.deepEqual(s.answers.moves.ids, ["say_hard"]);
  s = run([{ type: "back" }, { type: "back" }, pick("pull", "chase"), next, next], ctx(), s);
  assert.equal(s.stepId, "plan");
  assert.equal(s.answers.moves?.ids.includes("say_hard") ?? false, false, "a move for the old pull goes");
});

test("the If: the moment, or with a pull picked, the pull (one chip, pressed); never with Not sure", () => {
  const plan = M.stepOf(skill, "plan");
  assert.deepEqual(M.shownFields(ctx(), plan, run(TO_PLAN)).map((f) => f.id), ["forpull", "moves"]);
  const ns = run([pick("situation", "conversation"), next, pick("pull", "not_sure"), next, pick("moment", "go_blank"), next]);
  assert.deepEqual(M.shownFields(ctx(), plan, ns).map((f) => f.id), ["moves"]);
  const ca = (s) => P.planCaFromFields((f) => s.answers[f] ?? { ids: [], own: null });
  const s = run([...TO_PLAN, pick("moves", "feet")]);
  assert.equal(P.planLine(CA, ca(s)).text, "If I go blank, I'll feel my feet on the floor.");
  const t = run([pick("forpull", "pull")], ctx(), s);
  assert.equal(P.planLine(CA, ca(t)).text, "If I start to shut down, I'll feel my feet on the floor.");
  assert.equal(M.canGoOn(ctx(), run(TO_PLAN)), false, "a plan needs a move");
  const mine = run([own("moves", "Hold my keys.")], ctx(), run(TO_PLAN));
  assert.equal(P.planLine(CA, ca(mine)).text, "If I go blank, I'll Hold my keys.", "own words as typed, the full stop once");
});

test("rehearse, once more with something new (another moment, never the plan's or a danger one), keep or change the move", () => {
  let s = run(PLANNED);
  assert.equal(s.stepId, "walk");
  assert.equal(M.stepOf(skill, "walk").embed, "rehearsal");
  s = run([done], ctx(), s);
  assert.equal(s.stepId, "more");
  assert.equal(run([pick("again", "no"), next], ctx(), s).stepId, "calm");
  s = run([pick("again", "yes"), next], ctx(), s);
  assert.equal(s.stepId, "new");
  const others = chips(ctx(), s, "new", "new_moment");
  assert.ok(!others.includes("go_blank") && !others.includes("might_hurt"));
  assert.deepEqual(new Set(others), new Set(["voice_raised", "not_heard", "start_crying"]));
  s = run([pick("new_moment", "not_heard")], ctx(), s);
  assert.deepEqual(M.shownFields(ctx(), M.stepOf(skill, "new"), s).map((f) => f.id), ["new_moment", "change_move"]);
  assert.equal(M.canGoOn(ctx(), s), false, "keep or change, first");
  s = run([pick("change_move", "change")], ctx(), s);
  assert.equal(M.canGoOn(ctx(), s), false, "a changed plan needs a move");
  s = run([pick("new_moves", "feet"), next, done], ctx(), s);
  assert.equal(s.stepId, "calm");
  assert.deepEqual(s.path, ["what", "feel", "hard", "plan", "walk", "more", "new", "redo", "calm"]);
});

test("settle is a choice (never skipped silently), marks the visit complete; 5-4-3-2-1 leaves with the plan saved; breath holds", () => {
  const s = run([...PLANNED, done, pick("again", "no"), next]);
  const st = M.stepOf(skill, "calm");
  assert.ok(st.complete);
  assert.equal(M.canGoOn(ctx(), s), false);
  assert.deepEqual(st.fields[0].links.map((l) => l.exit), ["five_senses"]);
  assert.equal(skill.exits.find((x) => x.id === "five_senses").toolId, "five-senses");
  assert.equal(run([pick("settle", "breath"), next], ctx(), s).stepId, "hold");
  assert.equal(run([pick("settle", "ok"), next], ctx(), s).stepId, "keep");
  const b = run([pick("settle", "breath"), next, { type: "embedDone", output: { ids: ["held"], durationSec: 20 } }], ctx(), s);
  assert.equal(b.stepId, "keep");
});

const TO_KEEP = [...PLANNED, done, pick("again", "no"), next, pick("settle", "ok"), next];

test("keep: Keep this keeps the plan as cope_ahead_plan (the one primary is the yes); Not now is the quiet way on; the value passes its kind", () => {
  const s = run(TO_KEEP);
  assert.equal(s.stepId, "keep");
  const keepStep = M.stepOf(skill, "keep");
  assert.deepEqual([keepStep.primary, keepStep.secondary, keepStep.fields ?? []], ["keep_yes", "keep_no", []], "no chips: Keep this, then Not now quietly");
  assert.equal(keepStep.keep.done, "done_kept", "a kept plan says where it went, on the next screen");
  assert.equal(run([next], ctx(), s).stepId, "ask", "kept or not, the ask comes next");
  const k = M.keepFor(ctx(), keepStep, s);
  assert.equal(k.kind, "cope_ahead_plan");
  assert.deepEqual(k.value, { situationIds: ["conversation"], momentIds: ["go_blank"], pullIds: ["blank"], movesIds: ["feet", "give_minute"] });
  const { pullIds, ...stored } = k.value;
  assert.deepEqual(pullIds, ["blank"], "the client sends the pull");
  assert.deepEqual(checkValue(PROFILE_KINDS.cope_ahead_plan, k.value), stored, "the If is the moment: this visit's pull (ask-fresh) is never kept");
  const ifPull = { ...k.value, forpullIds: ["pull"] };
  assert.deepEqual(checkValue(PROFILE_KINDS.cope_ahead_plan, ifPull), ifPull, "the If is the pull: it is the plan's words, kept");
  assert.throws(() => checkValue(PROFILE_KINDS.cope_ahead_plan, { ...ifPull, pullIds: ["not_sure"] }), /Unexpected value/);
  const notSure = run([pick("situation", "conversation"), next, pick("pull", "not_sure"), next, pick("moment", "go_blank"), next,
    pick("moves", "feet"), next, done, pick("again", "no"), next, pick("settle", "ok"), next]);
  const kn = M.keepFor(ctx(), M.stepOf(skill, "keep"), notSure).value;
  assert.deepEqual(kn.pullIds, ["not_sure"]);
  assert.deepEqual(checkValue(PROFILE_KINDS.cope_ahead_plan, kn), { situationIds: ["conversation"], momentIds: ["go_blank"], movesIds: ["feet"] }, "Not sure: Keep this works, no pull stored");
  // Me composes it with the same plan line the keep card showed.
  assert.equal(P.planLine(CA, P.planCaFromKept(k.value)).text, "If I go blank, I'll feel my feet on the floor and say “Give me a minute”.");
  assert.throws(() => checkValue(PROFILE_KINDS.cope_ahead_plan, { situationIds: ["conversation"] }), /Nothing to keep/);
  assert.throws(() => checkValue(PROFILE_KINDS.cope_ahead_plan, { movesIds: ["feet"], momentIds: ["go_blank"], pullOwn: "x" }), /Unexpected field/);
  assert.deepEqual(PROFILE_KINDS.cope_ahead_plan.ownFields, ["situationOwn", "momentOwn", "movesOwn"]);
});

test("Want me to ask how it went? Yes schedules cope_ahead_after at screen 1's when; not answered, Later or not sure; No, nothing", () => {
  const step = M.stepOf(skill, "ask");
  assert.deepEqual(M.followUpFor(ctx(), step, run([...TO_KEEP, next, pick("ask", "yes")])), { type: "cope_ahead_after", chip: "tomorrow" });
  const noWhen = run([pick("situation", "conversation"), next, next, pick("moment", "go_blank"), next, pick("moves", "feet"), next, done,
    pick("again", "no"), next, pick("settle", "ok"), next, next, pick("ask", "yes")]);
  assert.deepEqual(M.followUpFor(ctx(), step, noWhen), { type: "cope_ahead_after", chip: "later" });
  assert.equal(M.followUpFor(ctx(), step, run([...TO_KEEP, next, pick("ask", "no")])), null);
  const type = spine.followUpTypes.find((t) => t.id === "cope_ahead_after");
  for (const w of CA.when) assert.ok(type.window.chips[w.id], `${w.id} is a chip of the after card's window`);
  const end = run([next], ctx(), run([...TO_KEEP, next, pick("ask", "no")]));
  assert.equal(end.stepId, "end");
  assert.equal(M.handoffLine(ctx(), M.stepOf(skill, "end"), end), skill.copy.done_line);
});

test("parts on, with a kept part: who might show up, the link's part first and never pressed; parts off, no step", () => {
  const parts = { parts: [{ id: PART, name: "Runner" }, { id: "1f8c2a9e-5b1d-4c3e-9a7f-2d6b8e4c1a04", name: null }] };
  const on = ctx({ partId: "1f8c2a9e-5b1d-4c3e-9a7f-2d6b8e4c1a04" }, parts);
  const s = run([pick("situation", "conversation"), next, next], on);
  assert.equal(s.stepId, "who");
  assert.deepEqual(chips(on, s, "who", "part"), ["1f8c2a9e-5b1d-4c3e-9a7f-2d6b8e4c1a04", PART]);
  assert.equal(s.answers.part, undefined);
  assert.equal(M.canGoOn(on, s), true, "Next is Not sure");
  const slot = M.stepOf(skill, "who").slots[0];
  assert.deepEqual([slot.after, slot.embed, slot.props], ["$title", "partsLine", { promptId: "cope_title_any", as: "heading" }]);
  assert.equal(run([pick("situation", "conversation"), next, next], ctx({}, { parts: [] })).stepId, "hard");
  assert.equal(run([pick("situation", "conversation"), next, next]).stepId, "hard", "signed out or loading: no parts step");
  // The anchor slot under the plan's moves shows only with a part picked.
  const anchor = M.stepOf(skill, "plan").slots.find((x) => x.embed === "partAnchor");
  assert.equal(anchor.after, "moves");
});

test("ext.ca from the run: the after card, the part tag and Reflect read what the hand-built page wrote", () => {
  const parts = { parts: [{ id: PART, name: "Runner" }] };
  const c = ctx({}, parts);
  const s = run([pick("situation", "conversation"), pick("when", "tomorrow"), next, pick("feel", "anxious"), pick("feel", "hurt"),
    pick("pull", "blank"), next, pick("part", PART), next, own("moment", "They bring up money"), next, pick("forpull", "pull"), pick("moves", "feet"),
    own("moves", "Hold my keys"), next, done, pick("again", "yes"), next, pick("new_moment", "not_heard"), pick("change_move", "change"),
    pick("new_moves", "say_hard"), next, done, pick("settle", "breath"), next, { type: "embedDone", output: { ids: ["held"], durationSec: 18 } },
    { type: "kept", stepId: "keep", kind: "cope_ahead_plan", id: PART }, next, pick("ask", "yes"),
    { type: "scheduled", stepId: "ask", followUpType: "cope_ahead_after", id: PART }], c);
  const rec = M.runRecord(c, s);
  assert.ok(validateExt({ run: rec }), "the run record is a valid ext.run");
  const ca = caFromRun(rec);
  assert.deepEqual(ca, {
    situationId: "conversation", when: "tomorrow", feelIds: ["anxious", "hurt"], pullIds: ["blank"], partId: PART,
    ifFrom: "pull", moveIds: ["feet"], rehearsed: 2,
    newMomentId: "not_heard", newMoveIds: ["say_hard"], settle: "breath", kept: true, followUp: true,
  });
  const ext = validateExt({ run: rec, ca });
  assert.ok(ext, "a valid ext with the run and the projection");
  assert.deepEqual(planIdsFromExt(ext), { situationId: "conversation", hardMomentId: null, hardMomentOwn: "They bring up money", ifFrom: "pull", pullIds: ["blank"], moveIds: ["feet"], moveOwn: "Hold my keys" });
  assert.equal(partIdFromExt(ext), PART);
  assert.deepEqual(M.runEmotionIds(c, s), ["anxious", "hurt"], "the feelings are the session's emotions");
  // 5-4-3-2-1 from settle: settle five_senses; own words alone: Something else.
  const five = caFromRun({ ...M.runRecord(ctx(), run([own("situation", "the dentist"), next, next, pick("moment", "go_blank"), next, pick("moves", "feet"), next, done, pick("again", "no"), next])), exitId: "five_senses" });
  assert.equal(five.settle, "five_senses");
  assert.equal(five.situationId, "other");
  assert.equal(five.situationOwn, undefined, "own words stay in the run");
  assert.equal(five.ifFrom, "moment");
});

test("resume after When is it?: the answer comes back, and the after card is booked once, at that time", () => {
  const toKeep = [pick("situation", "conversation"), pick("when", "tomorrow"), next, next, pick("moment", "go_blank"), next,
    pick("moves", "feet"), next, done, pick("again", "no"), next, pick("settle", "ok"), next];
  const s = run(toKeep);
  const atAsk = run([next], ctx(), s);
  assert.equal(atAsk.stepId, "ask");
  const back = M.resumeRun(ctx(), M.runRecord(ctx(), atAsk), "ask");
  assert.deepEqual(back.answers.when, { ids: ["tomorrow"], own: null }, "screen 1's answer, read back (not a reminder chip)");
  const askStep = M.stepOf(skill, "ask");
  assert.deepEqual(M.followUpFor(ctx(), askStep, run([pick("ask", "yes")], ctx(), back)), { type: "cope_ahead_after", chip: "tomorrow" });
  assert.equal(M.followUpFor(ctx(), askStep, run([pick("ask", "no")], ctx(), back)), null, "only on Yes");
  // Booked, then resumed past it: the ask step stays booked, so going back to it books nothing more.
  const booked = run([pick("ask", "yes"), { type: "scheduled", stepId: "ask", followUpType: "cope_ahead_after", id: "f1" }, next], ctx(), atAsk);
  const later = M.resumeRun(ctx(), M.runRecord(ctx(), booked), "end");
  assert.equal(later.stepId, "end");
  assert.ok(later.scheduled.ask, "already booked");
  assert.equal(M.followUpFor(ctx(), askStep, { ...later, answers: { ...later.answers, ask: { ids: ["yes"], own: null } } }), null);
  assert.deepEqual(M.resumeRun(ctx(), M.runRecord(ctx(), booked), "ask").scheduled, {}, "resumed at the booking step itself: a fresh Next");
});

test("the stored ext, { run, ca }, fits 4 KB at its longest: every field at its cap, own words in 3-byte characters", () => {
  const longest = (xs) => xs.reduce((a, b) => (b.length > a.length ? b : a), "");
  const stepId = longest(skill.steps.map((st) => st.id));
  const opts = (f) => (skill.options[f.options.list] ?? []).map((o) => o.value);
  const answers = skill.steps.flatMap((st) => st.fields ?? []).map((f) => {
    const values = f.options.emotions ? ["disappointed_in_myself", "disconnected_from_me"] : f.options.profile ? ["1f8c2a9e-5b1d-4c3e-9a7f-2d6b8e4c1a04"] : opts(f);
    const own = f.own ? "愛".repeat(Math.min(f.own.max ?? skill.ownMax, skill.ownMax)) : null;
    return { fieldId: f.id, optionIds: Array.from({ length: f.max }, (_, i) => values[i % values.length] ?? longest(values)), ...(own ? { valueOwn: own } : {}) };
  });
  answers.push({ fieldId: "rehearsed", optionIds: ["done"] }, { fieldId: "rehearsed2", optionIds: ["done"] }, { fieldId: "breath", optionIds: ["held"] });
  const run = {
    skillId: skill.id, versionId: skill.version, path: Array(48).fill(stepId), answers,
    ctx: { situationId: "x".repeat(64), partId: "x".repeat(64) },
    out: [{ embed: "rehearsal", stepId: "walk", optionIds: ["done"] }, { embed: "rehearsal", stepId: "redo", optionIds: ["done"] },
      { embed: "holdRing", stepId: "hold", optionIds: ["held"], durationSec: 3600 }],
    handoffs: [{ primitiveId: "sigh", completed: true, durationSec: 60, thenVsNow: "better", resumed: true, overridden: false }],
    offeredExitIds: skill.exits.map((x) => x.id), exitId: "five_senses", embedsShown: ["safety_open"],
    kept: ["cope_ahead_plan"], scheduled: ["cope_ahead_after"],
  };
  const ca = caFromRun(run);
  assert.ok(ca.partId && ca.moveIds.length === 2 && ca.feelIds.length === 2, "the projection at its fullest");
  const bytes = Buffer.byteLength(JSON.stringify({ run, ca }), "utf8");
  assert.ok(bytes <= 4096, `worst case ${bytes} bytes`);
  assert.ok(validateExt({ run, ca }));
});

test("the after card reads the hand-built page's own words from ext.ca, and the runtime's from ext.run", () => {
  const old = JSON.stringify({ ca: { situationId: "conversation", hardMomentOwn: "old words", ifFrom: "moment", moveIds: ["feet"], moveOwn: "my move" } });
  assert.deepEqual([planIdsFromExt(old).hardMomentOwn, planIdsFromExt(old).moveOwn], ["old words", "my move"]);
  const other = JSON.stringify({ run: { skillId: "check_the_facts", answers: [{ fieldId: "moment", valueOwn: "no" }] }, ca: { situationId: "work" } });
  assert.equal(planIdsFromExt(other).hardMomentOwn, null, "another skill's run is never read");
});

test("the embeds' plan: own words are the label past the ids; once more plays the new moment, with the changed moves only after Change", () => {
  const view = (answers) => ({
    answerIds: Object.fromEntries(Object.entries(answers).map(([k, a]) => [k, a.ids])),
    picked: Object.fromEntries(Object.entries(answers).map(([k, a]) => [k, [...a.ids, ...(a.own ? [a.own] : [])]])),
  });
  const A = { moment: { ids: ["go_blank"], own: null }, moves: { ids: ["feet"], own: "hold my keys" }, pull: { ids: ["blank"], own: null },
    forpull: { ids: ["pull"], own: null }, new_moment: { ids: [], own: "the lights go out" }, change_move: { ids: ["keep"], own: null }, new_moves: { ids: ["say_hard"], own: null } };
  assert.deepEqual(P.fieldAnswer(view(A), "moves"), { ids: ["feet"], own: "hold my keys" });
  const props1 = M.stepOf(skill, "walk").props;
  assert.equal(P.planLine(CA, P.runPlanCa({ ...view(A), props: props1 })).text, "If I start to shut down, I'll feel my feet on the floor and hold my keys.");
  const props2 = M.stepOf(skill, "redo").props;
  const kept = P.planLine(CA, P.runPlanCa({ ...view(A), props: props2 }, 2));
  assert.equal(kept.text, "If the lights go out, I'll feel my feet on the floor and hold my keys.", "pass 2: the new moment is the If");
  const changed = P.planLine(CA, P.runPlanCa({ ...view({ ...A, change_move: { ids: ["change"], own: null } }), props: props2 }, 2));
  assert.equal(changed.text, "If the lights go out, I'll say “This is hard for me”.");
});

test("moves: two at most, a third tap swaps out the oldest (no Add one more chip)", () => {
  const s = run([pick("situation", "conversation"), next, pick("pull", "hide"), next, pick("moment", "go_blank"), next,
    pick("moves", "feet"), pick("moves", "say_hard"), pick("moves", "text_trust")]);
  assert.deepEqual(s.answers.moves.ids, ["say_hard", "text_trust"]);
});
