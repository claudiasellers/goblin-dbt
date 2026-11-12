// First, the body (PRD DT-01; DBT DT Handouts 1-3, 6; docs/design/first-the-body.md) on the skill runtime: one tap for
// the state, one body mode per screen, the close asked in the flow (quieter → the fork; not quieter → one swap, then
// lowering the demand with someone on the screen). Cold carries its caution line (D4, changed 12 Nov); frozen and far away
// never get a calming mode (C6.3); chest pain or fainting gets the emergency number; a pull to do something goes to
// Hold to wait. Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const B = await importTs("src/lib/bodyModes.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "first_body");
const embedOutputs = {
  holdRing: { ids: ["held", "partly", "skipped"], measures: ["durationSec", "doneCount", "earlyCount"] },
  doseTimer: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
  bodyCard: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
  breathPacer: { ids: ["done", "partly", "skipped", "dizzy"], measures: ["durationSec"] },
  squeezeRelease: { ids: ["done", "partly", "skipped"], measures: ["durationSec", "doneCount"] },
  orientFind: { ids: ["done", "partly", "skipped"], measures: ["doneCount"] },
};
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const did = (id = "done") => ({ type: "embedDone", output: { ids: [id], durationSec: 10 } });
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const offers = (s) => M.offersFor(ctx(), M.stepOf(skill, s.stepId), s);
const CALMING = ["cold", "exhale", "squeeze"];

// The first mode for each state, as far as its first check.
const WAVE_COLD = [pick("state", "wave"), next, pick("cold_near", "yes"), next, did()];
const FIRST = {
  wave: WAVE_COLD,
  frozen: [pick("state", "frozen"), next, did("held")],
  far_away: [pick("state", "far_away"), next, did()],
  loop: [pick("state", "loop"), next, did()],
};

test("the skill: tool cool-down, named First, the body, then-vs-now close kind, played by the player", () => {
  assert.equal(skill.toolId, "cool-down");
  assert.equal(skill.start, "state");
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'cool-down': 'first_body',/);
  assert.match(readFileSync("src/data/tools.ts", "utf8"), /id: 'cool-down',\n\s+name: 'First, the body',/);
  assert.match(readFileSync("src/lib/spine/close.ts", "utf8"), /'cool-down': \{ module: 'dt', closeKind: 'regulation_down' \}/);
  assert.match(readFileSync("src/pages/tools/CoolDown.tsx", "utf8"), /export function CoolDown/, "the old page stays, unrouted (C8)");
  assert.match(skill.copy.cold_title, /^Circuit Breaker/, "D6: the cold mode keeps the name");
});

test("each state gets its own first mode", () => {
  const at = (state) => run([pick("state", state), next]).stepId;
  assert.equal(at("wave"), "cold_near", "the wave: is there something cold near you?");
  assert.equal(at("frozen"), "press");
  assert.equal(at("far_away"), "orient");
  assert.equal(at("loop"), "find");
  assert.equal(at("urge"), "urge");
  assert.equal(at("restless"), "move", "restless or buzzing: the move burst");
  assert.equal(at("medical"), "medical");
});

test("D4 (changed 12 Nov): no self-check before cold; the cold card carries the one caution line", () => {
  const wave = (near) => run([pick("state", "wave"), next, pick("cold_near", near), next]).stepId;
  assert.equal(wave("yes"), "cold");
  assert.equal(wave("no"), "squeeze", "nothing cold near: squeeze and drop");
  assert.equal(skill.steps.find((s) => s.id === "screen"), undefined, "no screen step");
  assert.equal(skill.steps.find((s) => s.id === "cool"), undefined, "no not-sure cool cloth (it hung on the screen)");
  const cold = M.stepOf(skill, "cold").props;
  assert.ok(cold.seconds <= 30, "15-30 s");
  const caution = skill.copy[cold.caution];
  assert.match(caution, /Never in a shower or a bath/);
  for (const flag of [/heart trouble/, /fainting/, /eating disorder/, /pregnancy/, /cold allergy/, /drinking or using today/])
    assert.match(caution, flag, "the caution line names who should skip cold");
  for (const s of skill.steps) for (const t of s.next ?? []) {
    if (t.to === "cold") assert.equal(s.id, "cold_near", `${s.id} → cold`);
  }
});

test("C6.3: frozen and far away never get a calming mode, first or swap, and their check is worded for here", () => {
  for (const state of ["frozen", "far_away"]) {
    const first = run(FIRST[state]);
    assert.equal(first.stepId, "check1_here", state);
    const swap = run([pick("check1_here", "same"), next], ctx(), first);
    assert.ok(!CALMING.includes(swap.stepId), `${state} swap: ${swap.stepId}`);
    assert.equal(swap.stepId, state === "frozen" ? "wake" : "strong");
    assert.equal(run([did()], ctx(), swap).stepId, "check2_here");
  }
  assert.deepEqual(skill.options.tvn_here.map((o) => o.label), ["Further away", "About the same", "A bit more here", "More here"]);
});

test("the wave's swap is the long out-breath, with its stop rule; dizzy switches to squeeze and drop", () => {
  const first = run(FIRST.wave);
  assert.equal(first.stepId, "check1");
  const swap = run([pick("check1", "worse"), next], ctx(), first);
  assert.equal(swap.stepId, "exhale");
  const p = M.stepOf(skill, "exhale").props;
  assert.ok(p.outSec > p.inSec, "the out-breath is longer");
  assert.match(skill.copy[p.dizzy], /Dizzy or tingly\? Stop/);
  assert.equal(run([did("dizzy")], ctx(), swap).stepId, "squeeze_still", "a different modality");
  const still = skill.steps.find((x) => x.id === "squeeze_still");
  for (const k of [still.props.step1, still.props.step2]) assert.doesNotMatch(skill.copy[k], /breathe (in|out)/i, "no paced breath after dizziness (Gate 3)");
  assert.equal(run([did("done")], ctx(), swap).stepId, "check2");
  // When squeeze already ran (nothing cold near), dizzy goes straight to the check.
  const flagged = run([pick("state", "wave"), next, pick("cold_near", "no"), next, did(), next, pick("check1", "same"), next]);
  assert.equal(flagged.stepId, "exhale");
  assert.equal(run([did("dizzy")], ctx(), flagged).stepId, "check2");
});

test("a loop gets the eyes a job, then the ears", () => {
  const first = run(FIRST.loop);
  assert.equal(first.stepId, "check1");
  assert.equal(run([pick("check1", "same"), next], ctx(), first).stepId, "listen");
});

test("the close in the flow: quieter goes to the fork; the latest answer is the session's then-vs-now", () => {
  const first = run(FIRST.wave);
  const quieter = run([pick("check1", "better"), next], ctx(), first);
  assert.equal(quieter.stepId, "fork");
  assert.equal(M.askFresh(ctx(), quieter).thenVsNow, "better");
  const second = run([pick("check1", "same"), next, did(), pick("check2", "much_better"), next], ctx(), first);
  assert.equal(second.stepId, "fork");
  assert.equal(M.askFresh(ctx(), second).thenVsNow, "much_better", "the swap's answer wins");
  for (const id of ["check1", "check1_here", "check2", "check2_here"]) {
    const f = M.stepOf(skill, id).fields[0];
    assert.equal(f.askFresh, "thenVsNow", id);
    assert.equal(f.required, true, id);
  }
  // The player leaves with it and asks no close question after it.
  const player = readFileSync("src/components/skillPlayer/SkillPlayer.tsx", "utf8");
  assert.match(player, /const asked = askFresh\(ctx, st\)\.thenVsNow/);
  assert.match(player, /toolSession\.close\(\{ status: 'completed', thenVsNow: asked \}\)/);
  assert.match(player, /toolSession\.setThenVsNow\(/);
});

test("twice not quieter: lower the demand, then someone to talk to on the screen", () => {
  const s = run([...FIRST.wave, pick("check1", "same"), next, did(), pick("check2", "worse"), next]);
  assert.equal(s.stepId, "lower");
  assert.match(skill.copy[M.stepOf(skill, "lower").title], /You don't have to make this go away/);
  const someone = run([did()], ctx(), s);
  assert.equal(someone.stepId, "someone");
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "someone"), someone)?.variant, "crisis");
  assert.deepEqual(offers(someone), ["safety_open", "crisis_kit"], "someone to talk to first, then the kit (DT-03)");
});

test("chest pain or fainting: the emergency number, no body mode; a pull to do something: Hold to wait first", () => {
  const med = run([pick("state", "medical")]);
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "state"), med)?.variant, "medical", "the banner shows as soon as it's tapped");
  const card = run([next], ctx(), med);
  assert.equal(card.stepId, "medical");
  assert.equal(M.stepOf(skill, "medical").noClose, true);
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "medical"), card)?.variant, "medical");
  const banner = readFileSync("src/components/safety/CrisisBanner.tsx", "utf8");
  assert.match(banner, /const MEDICAL_LINE = 'Chest pain, fainting, or trouble breathing\? Call 911 now\.'/);
  assert.match(banner, /if \(variant === 'medical'\) return <MedicalBanner/);
  const urge = run([pick("state", "urge"), next]);
  assert.deepEqual(offers(urge), ["pause"]);
  assert.equal(M.stepOf(skill, "urge").noClose, true);
});

test("the fork: something can be done → Problem Solve, DEAR MAN, Do the Opposite; how things are → Let it be; not right now → Give your mind a job", () => {
  const fork = run([...FIRST.wave, pick("check1", "much_better"), next]);
  const end = (v) => run([pick("fork", v), next], ctx(), fork);
  assert.deepEqual(offers(end("change")), ["problem_solve", "dear_man", "opposite_action"]);
  assert.deepEqual(offers(end("accept")), ["let_it_be"], "Let it be (DT-04, built)");
  assert.deepEqual(offers(end("park")), ["mind_job"], "Give your mind a job (DT-06, built)");
  assert.deepEqual(offers(end("through")), []);
  const planned = Object.fromEntries(skill.exits.map((e) => [e.id, !!e.planned]));
  assert.deepEqual([planned.let_it_be, planned.mind_job, planned.crisis_kit], [false, false, false], "the kit is built (DT-03)");
  assert.match(M.handoffLine(ctx(), M.stepOf(skill, "end"), end("through")), /You got through it/);
});

test("every screen has a quiet way to someone, and nothing locks: each mode's way on is there from the start", () => {
  for (const s of skill.steps) {
    if (["medical", "someone"].includes(s.id)) continue; // their banner is the way
    const links = [...(s.links ?? []), ...(s.fields ?? []).flatMap((f) => f.links ?? [])].map((l) => l.exit);
    assert.ok(links.includes("safety_open"), s.id);
  }
  const src = readFileSync("src/components/skillPlayer/BodyEmbeds.tsx", "utf8");
  assert.match(src, /function WayOn\(/);
  for (const c of ["DoseTimer", "BodyCard", "BreathPacer", "SqueezeRelease", "OrientFind"]) {
    const body = src.slice(src.indexOf(`export function ${c}(`));
    assert.match(body.slice(0, body.indexOf("\nexport function", 10) > 0 ? body.indexOf("\nexport function", 10) : undefined), /<WayOn /, c);
  }
});

test("C6.7: no chip or cue is food, drink, shopping or scrolling as a comfort; no showers, baths or ice water", () => {
  const words = [...Object.values(skill.options).flat().map((o) => o.label), ...Object.values(skill.copy)].join(" \n ").toLowerCase();
  assert.doesNotMatch(words, /\b(eat|snack|treat|shop|scroll|drink a|tea|coffee|ice water|ice-cold water)\b/);
  assert.doesNotMatch(words.replace(/never in a shower or a bath/g, ""), /shower|bath/);
});

test("the body modes' rules (src/lib/bodyModes.ts)", () => {
  assert.equal(B.doseMs({ seconds: 30 }), 30_000);
  assert.equal(B.doseMs({ seconds: 9999 }), 30_000, "out of range falls back");
  assert.equal(B.leadCount(3, 0), 3);
  assert.equal(B.leadCount(3, 2500), 1);
  assert.equal(B.leadCount(3, 3000), null);
  assert.deepEqual(B.timedOutput(1, 30_000), { ids: ["done"], durationSec: 30 });
  assert.deepEqual(B.timedOutput(0.4, 12_400), { ids: ["partly"], durationSec: 12 });
  assert.deepEqual(B.timedOutput(0, 0), { ids: ["skipped"], durationSec: 0 });
  const pace = B.breathPace({ inSec: 4, outSec: 3 });
  assert.ok(pace.outMs > pace.inMs, "the out-breath is always the longer");
  const p = B.breathPace({ inSec: 4, outSec: 7 });
  assert.deepEqual(B.breathPhase(p, 2000), { phase: "in", t: 0.5, breaths: 0 });
  assert.deepEqual(B.breathPhase(p, 4000 + 3500), { phase: "out", t: 0.5, breaths: 0 });
  assert.equal(B.breathPhase(p, 11_000 * 2 + 100).breaths, 2);
  assert.equal(B.breathScale("in", 0), 0.6);
  assert.equal(B.breathScale("in", 1), 1);
  assert.equal(B.breathScale("out", 1), 0.6);
  assert.deepEqual(B.squeezePlan({ rounds: 3, squeezeSec: 5 }), { rounds: 3, squeezeMs: 5000, dropMs: 7000 });
  assert.deepEqual(B.squeezeOutput(3, 3, 15_000), { ids: ["done"], durationSec: 15, doneCount: 3 });
  assert.deepEqual(B.squeezeOutput(3, 1, 4000), { ids: ["partly"], durationSec: 4, doneCount: 1 });
  assert.deepEqual(B.findOutput(3, 5), { ids: ["done"], doneCount: 3 });
  assert.deepEqual(B.findOutput(3, 0), { ids: ["skipped"], doneCount: 0 });
  const { date, time } = B.nowLines(new Date(2026, 10, 11, 21, 5), "en-US");
  assert.equal(date, "Wednesday, November 11");
  assert.match(time, /^9:05\s?PM$/);
});

test("press: the instruction is on screen, not only for a screen reader (embed steps show their hint)", () => {
  const press = skill.steps.find((s) => s.id === "press");
  assert.equal(press.hint, "press_hint");
  assert.match(skill.copy.press_hint, /thumb on the circle/);
  const player = readFileSync("src/components/skillPlayer/SkillPlayer.tsx", "utf8");
  const embedStep = player.slice(player.indexOf("function EmbedStep"), player.indexOf("function StepLinks"));
  assert.match(embedStep, /step\.hint && ctx\.skill\.copy\[step\.hint\]/);
});

test("a finished dose keeps its ring mounted, so the end chime isn't cut off (the timer closes its audio on unmount)", () => {
  const src = readFileSync("src/components/skillPlayer/BodyEmbeds.tsx", "utf8");
  for (const name of ["DoseTimer", "BodyCard"]) {
    const body = src.slice(src.indexOf(`export function ${name}`), src.indexOf("export function", src.indexOf(`export function ${name}`) + 10));
    assert.match(body, /<TimedRing [^>]*finished=\{done\}/, name);
    assert.doesNotMatch(body, /done\s*\?[^:]*:\s*\(\s*<TimedRing/, `${name}: the ring is not swapped out when done`);
  }
});

test("leaving mid-dose reports how far it ran, not skipped", () => {
  assert.deepEqual(B.leftAt({ fraction: 0, ranMs: 0 }, { fraction: 0.5, ranMs: 15_000 }), { fraction: 0.5, ranMs: 15_000 });
  assert.deepEqual(B.leftAt({ fraction: 0.4, ranMs: 12_000 }, null), { fraction: 0.4, ranMs: 12_000 });
  assert.deepEqual(B.timedOutput(B.leftAt({ fraction: 0, ranMs: 0 }, { fraction: 0.5, ranMs: 15_000 }).fraction, 15_000), { ids: ["partly"], durationSec: 15 });
  const src = readFileSync("src/components/skillPlayer/BodyEmbeds.tsx", "utf8");
  assert.equal((src.match(/leftAt\(result, liveRef\.current\)/g) ?? []).length, 2, "DoseTimer and BodyCard both read the running dose");
});

test("Gate 3: frozen and far away lower the demand without anything passive; the urge goes on without a Done", () => {
  const lh = skill.steps.find((x) => x.id === "lower_here");
  assert.match(skill.copy[lh.props.cue], /Eyes open, feet on the floor/);
  const c2 = skill.steps.find((x) => x.id === "check2_here");
  assert.deepEqual(c2.next.map((t) => t.to), ["fork", "lower_here"]);
  assert.equal(skill.steps.find((x) => x.id === "urge").done, undefined);
  assert.doesNotMatch(skill.copy.medical_line, /come back/, "never reads as permission to skip care");
  assert.ok(skill.copy.medical_line.length <= 90);
  assert.equal(skill.steps.find((x) => x.id === "press").props.wayOn, "from_start", "the frozen path never locks (Gate 2)");
});

test("the move burst: a minute of marching, ungated (Claudia, 11 Nov), with a pace line; its swap is the long out-breath", () => {
  const move = skill.steps.find((x) => x.id === "move");
  assert.equal(move.embed, "doseTimer");
  assert.equal(move.props.seconds, 60);
  assert.match(skill.copy[move.props.caution], /own pace/);
  const after = run([pick("state", "restless"), next, did()]);
  assert.equal(after.stepId, "check1");
  assert.equal(run([pick("check1", "same"), next], ctx(), after).stepId, "exhale");
  assert.equal(run([pick("check1", "better"), next], ctx(), after).stepId, "fork");
});
