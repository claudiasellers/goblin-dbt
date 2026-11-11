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

const TO_PLAN = [pick("situation", "conversation"), pick("when", "tomorrow"), next, pick("feel_conversation", "anxious"), pick("pull", "blank"), next,
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
  assert.deepEqual(feel, ["feel_work_school", "pull"]);
  assert.deepEqual(M.stepOf(skill, "feel").fields.find((f) => f.id === "feel_work_school").options.emotions, ["anxious", "pressured", "inadequate", "exposed"]);
  const m = run([pick("situation", "work_school"), next, next]);
  assert.equal(m.stepId, "moment");
  assert.deepEqual(chips(ctx(), m, "moment", "moment"), ["go_blank", "criticised", "mistake_seen", "cant_answer"].sort((a, b) => CA.hardMoments.findIndex((x) => x.id === a) - CA.hardMoments.findIndex((x) => x.id === b)));
  const o = run([own("situation", "My sister's wedding"), next]);
  assert.deepEqual(M.shownFields(ctx(), M.stepOf(skill, "feel"), o).map((f) => f.id), ["feel_other", "pull"]);
  const om = run([own("situation", "My sister's wedding"), next, next]);
  assert.deepEqual(new Set(chips(ctx(), om, "moment", "moment")), new Set(CA.situations.find((x) => x.id === "other").hardMoments));
});

test("a danger moment: CrisisBanner alongside on the moment and plan screens (other_person for They might hurt me), its move first, never pressed", () => {
  for (const [sit, moment, variant, move] of [["conversation", "might_hurt", "other_person", "leave_safe"], ["alone", "might_hurt_self", "crisis", "reach_help"]]) {
    const s = run([pick("situation", sit), next, next, pick("moment", moment)]);
    assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "moment"), s)?.variant, variant, moment);
    const p = run([next], ctx(), s);
    assert.equal(p.stepId, "plan");
    assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "plan"), p)?.variant, variant);
    const moves = chips(ctx(), p, "plan", "moves");
    assert.equal(moves[0], move, "the danger move first");
    assert.equal(p.answers.moves, undefined, "not pre-selected: they choose it");
    assert.equal(moves.filter((x) => x === "leave_safe" || x === "reach_help").length, 1, "only its own danger move");
  }
  const calm = run([pick("situation", "conversation"), next, next, pick("moment", "go_blank")]);
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "moment"), calm), null);
  assert.ok(!chips(ctx(), run([next], ctx(), calm), "plan", "moves").some((x) => x === "leave_safe" || x === "reach_help"), "a danger move never shows elsewhere");
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
  assert.equal(s.stepId, "rehearse");
  assert.equal(M.stepOf(skill, "rehearse").embed, "rehearsal");
  s = run([done], ctx(), s);
  assert.equal(s.stepId, "again");
  assert.equal(run([pick("again", "no"), next], ctx(), s).stepId, "settle");
  s = run([pick("again", "yes"), next], ctx(), s);
  assert.equal(s.stepId, "new_moment");
  const others = chips(ctx(), s, "new_moment", "new_moment");
  assert.ok(!others.includes("go_blank") && !others.includes("might_hurt"));
  assert.deepEqual(new Set(others), new Set(["voice_raised", "not_heard", "start_crying"]));
  s = run([pick("new_moment", "not_heard")], ctx(), s);
  assert.deepEqual(M.shownFields(ctx(), M.stepOf(skill, "new_moment"), s).map((f) => f.id), ["new_moment", "change_move"]);
  assert.equal(M.canGoOn(ctx(), s), false, "keep or change, first");
  s = run([pick("change_move", "change")], ctx(), s);
  assert.equal(M.canGoOn(ctx(), s), false, "a changed plan needs a move");
  s = run([pick("new_moves", "feet"), next, done], ctx(), s);
  assert.equal(s.stepId, "settle");
  assert.deepEqual(s.path, ["what", "feel", "moment", "plan", "rehearse", "again", "new_moment", "rehearse2", "settle"]);
});

test("settle is a choice (never skipped silently), marks the visit complete; 5-4-3-2-1 leaves with the plan saved; breath holds", () => {
  const s = run([...PLANNED, done, pick("again", "no"), next]);
  const st = M.stepOf(skill, "settle");
  assert.ok(st.complete);
  assert.equal(M.canGoOn(ctx(), s), false);
  assert.deepEqual(st.fields[0].links.map((l) => l.exit), ["five_senses"]);
  assert.equal(skill.exits.find((x) => x.id === "five_senses").toolId, "five-senses");
  assert.equal(run([pick("settle", "breath"), next], ctx(), s).stepId, "breathe");
  assert.equal(run([pick("settle", "ok"), next], ctx(), s).stepId, "keep");
  const b = run([pick("settle", "breath"), next, { type: "embedDone", output: { ids: ["held"], durationSec: 20 } }], ctx(), s);
  assert.equal(b.stepId, "keep");
});

const TO_KEEP = [...PLANNED, done, pick("again", "no"), next, pick("settle", "ok"), next];

test("keep: Keep this keeps the plan as cope_ahead_plan (the tap is the yes); Not now keeps nothing; the value passes its kind", () => {
  const s = run([...TO_KEEP, pick("keepit", "yes"), pick("ask", "no")]);
  const k = M.keepFor(ctx(), M.stepOf(skill, "keep"), s);
  assert.equal(k.kind, "cope_ahead_plan");
  assert.deepEqual(k.value, { situationIds: ["conversation"], momentIds: ["go_blank"], pullIds: ["blank"], movesIds: ["feet", "give_minute"] });
  assert.deepEqual(checkValue(PROFILE_KINDS.cope_ahead_plan, k.value), k.value);
  // Me composes it with the same plan line the keep card showed.
  assert.equal(P.planLine(CA, P.planCaFromKept(k.value)).text, "If I go blank, I'll feel my feet on the floor and say “Give me a minute”.");
  assert.equal(M.keepFor(ctx(), M.stepOf(skill, "keep"), run([...TO_KEEP, pick("keepit", "no"), pick("ask", "no")])), null);
  assert.throws(() => checkValue(PROFILE_KINDS.cope_ahead_plan, { situationIds: ["conversation"] }), /Nothing to keep/);
  assert.throws(() => checkValue(PROFILE_KINDS.cope_ahead_plan, { movesIds: ["feet"], momentIds: ["go_blank"], pullOwn: "x" }), /Unexpected field/);
  assert.deepEqual(PROFILE_KINDS.cope_ahead_plan.ownFields, ["situationOwn", "momentOwn", "movesOwn"]);
});

test("Want me to ask how it went? Yes schedules cope_ahead_after at screen 1's when; not answered, Later or not sure; No, nothing", () => {
  const step = M.stepOf(skill, "keep");
  assert.deepEqual(M.followUpFor(ctx(), step, run([...TO_KEEP, pick("keepit", "no"), pick("ask", "yes")])), { type: "cope_ahead_after", chip: "tomorrow" });
  const noWhen = run([pick("situation", "conversation"), next, next, pick("moment", "go_blank"), next, pick("moves", "feet"), next, done,
    pick("again", "no"), next, pick("settle", "ok"), next, pick("keepit", "no"), pick("ask", "yes")]);
  assert.deepEqual(M.followUpFor(ctx(), step, noWhen), { type: "cope_ahead_after", chip: "later" });
  assert.equal(M.followUpFor(ctx(), step, run([...TO_KEEP, pick("keepit", "no"), pick("ask", "no")])), null);
  const type = spine.followUpTypes.find((t) => t.id === "cope_ahead_after");
  for (const w of CA.when) assert.ok(type.window.chips[w.id], `${w.id} is a chip of the after card's window`);
  const end = run([next], ctx(), run([...TO_KEEP, pick("keepit", "yes"), pick("ask", "no")]));
  assert.equal(end.stepId, "end");
  assert.equal(M.handoffLine(ctx(), M.stepOf(skill, "end"), end), skill.copy.done_kept);
});

test("parts on, with a kept part: who might show up, the link's part first and never pressed; parts off, no step", () => {
  const parts = { parts: [{ id: PART, name: "Runner" }, { id: "1f8c2a9e-5b1d-4c3e-9a7f-2d6b8e4c1a04", name: null }] };
  const on = ctx({ partId: "1f8c2a9e-5b1d-4c3e-9a7f-2d6b8e4c1a04" }, parts);
  const s = run([pick("situation", "conversation"), next, next], on);
  assert.equal(s.stepId, "parts");
  assert.deepEqual(chips(on, s, "parts", "part"), ["1f8c2a9e-5b1d-4c3e-9a7f-2d6b8e4c1a04", PART]);
  assert.equal(s.answers.part, undefined);
  assert.equal(M.canGoOn(on, s), true, "Next is Not sure");
  const slot = M.stepOf(skill, "parts").slots[0];
  assert.deepEqual([slot.after, slot.embed, slot.props], ["$title", "partsLine", { promptId: "cope_title_any", as: "heading" }]);
  assert.equal(run([pick("situation", "conversation"), next, next], ctx({}, { parts: [] })).stepId, "moment");
  assert.equal(run([pick("situation", "conversation"), next, next]).stepId, "moment", "signed out or loading: no parts step");
  // The anchor slot under the plan's moves shows only with a part picked.
  const anchor = M.stepOf(skill, "plan").slots.find((x) => x.embed === "partAnchor");
  assert.equal(anchor.after, "moves");
});

test("ext.ca from the run: the after card, the part tag and Reflect read what the hand-built page wrote", () => {
  const parts = { parts: [{ id: PART, name: "Runner" }] };
  const c = ctx({}, parts);
  const s = run([pick("situation", "conversation"), pick("when", "tomorrow"), next, pick("feel_conversation", "anxious"), pick("feel_conversation", "hurt"),
    pick("pull", "blank"), next, pick("part", PART), next, own("moment", "They bring up money"), next, pick("forpull", "pull"), pick("moves", "feet"),
    own("moves", "Hold my keys"), next, done, pick("again", "yes"), next, pick("new_moment", "not_heard"), pick("change_move", "change"),
    pick("new_moves", "say_hard"), next, done, pick("settle", "breath"), next, { type: "embedDone", output: { ids: ["held"], durationSec: 18 } },
    pick("keepit", "yes"), pick("ask", "yes"), { type: "kept", stepId: "keep", kind: "cope_ahead_plan", id: PART },
    { type: "scheduled", stepId: "keep", followUpType: "cope_ahead_after", id: PART }], c);
  const rec = M.runRecord(c, s);
  assert.ok(validateExt({ run: rec }), "the run record is a valid ext.run");
  const ca = caFromRun(rec);
  assert.deepEqual(ca, {
    situationId: "conversation", when: "tomorrow", feelIds: ["anxious", "hurt"], pullIds: ["blank"], partId: PART,
    hardMomentOwn: "They bring up money", ifFrom: "pull", moveIds: ["feet"], moveOwn: "Hold my keys", rehearsed: 2,
    newMomentId: "not_heard", newMoveIds: ["say_hard"], settle: "breath", kept: true, followUp: true,
  });
  const ext = validateExt({ ca });
  assert.ok(ext, "a valid ext.ca");
  assert.deepEqual(planIdsFromExt(ext), { situationId: "conversation", hardMomentId: null, hardMomentOwn: "They bring up money", ifFrom: "pull", pullIds: ["blank"], moveIds: ["feet"], moveOwn: "Hold my keys" });
  assert.equal(partIdFromExt(ext), PART);
  assert.deepEqual(M.runEmotionIds(c, s), ["anxious", "hurt"], "the feelings are the session's emotions");
  // 5-4-3-2-1 from settle: settle five_senses; own words alone: Something else.
  const five = caFromRun({ ...M.runRecord(ctx(), run([own("situation", "the dentist"), next, next, pick("moment", "go_blank"), next, pick("moves", "feet"), next, done, pick("again", "no"), next])), exitId: "five_senses" });
  assert.equal(five.settle, "five_senses");
  assert.equal(five.situationId, "other");
  assert.equal(five.situationOwn, "the dentist");
  assert.equal(five.ifFrom, "moment");
});

test("the embeds' plan: own words are the label past the ids; once more plays the new moment, with the changed moves only after Change", () => {
  const view = (answers) => ({
    answerIds: Object.fromEntries(Object.entries(answers).map(([k, a]) => [k, a.ids])),
    picked: Object.fromEntries(Object.entries(answers).map(([k, a]) => [k, [...a.ids, ...(a.own ? [a.own] : [])]])),
  });
  const A = { moment: { ids: ["go_blank"], own: null }, moves: { ids: ["feet"], own: "hold my keys" }, pull: { ids: ["blank"], own: null },
    forpull: { ids: ["pull"], own: null }, new_moment: { ids: [], own: "the lights go out" }, change_move: { ids: ["keep"], own: null }, new_moves: { ids: ["say_hard"], own: null } };
  assert.deepEqual(P.fieldAnswer(view(A), "moves"), { ids: ["feet"], own: "hold my keys" });
  const props1 = M.stepOf(skill, "rehearse").props;
  assert.equal(P.planLine(CA, P.runPlanCa({ ...view(A), props: props1 })).text, "If I start to shut down, I'll feel my feet on the floor and hold my keys.");
  const props2 = M.stepOf(skill, "rehearse2").props;
  const kept = P.planLine(CA, P.runPlanCa({ ...view(A), props: props2 }, 2));
  assert.equal(kept.text, "If the lights go out, I'll feel my feet on the floor and hold my keys.", "pass 2: the new moment is the If");
  const changed = P.planLine(CA, P.runPlanCa({ ...view({ ...A, change_move: { ids: ["change"], own: null } }), props: props2 }, 2));
  assert.equal(changed.text, "If the lights go out, I'll say “This is hard for me”.");
});
