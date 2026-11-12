// Ride it out (PRD DT-05; urge surfing, MBRP; DBT DT Handout 21 adaptive denial; docs/design/ride-it-out.md) on the
// skill runtime: which urge, the wave (`urgeWave`: soft checks, no digits, no countdown), *not now* with something
// else and a five-minute round, bigger twice → the body or Hold to wait, the trace as a shape without axes
// (`waveTrace`), then the two-part close. Hurt myself opens safety.open first; flooded gets the body first. Tested
// through the same pure machine the player runs, and the wave's rules in src/lib/urgeWave.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const W = await importTs("src/lib/urgeWave.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "ride_it_out");
const WAVE_IDS = ["still_here", "fading", "gone", "bigger", "ended_gone", "ended_bigger", "ended_not_now", "ended_left", "ended_long"];
const embedOutputs = {
  urgeWave: { ids: WAVE_IDS, measures: ["durationSec", "doneCount"] },
  waveTrace: { ids: ["read"] },
  doseTimer: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
};
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const out = (...ids) => ({ type: "embedDone", output: { ids, durationSec: 200, doneCount: ids.length - 1 } });
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s);
const PULL = (p = "check") => [pick("pull", p), next];

test("the skill: tool urge-surfing, named Ride it out, the two-part close, played by the player; the old page stays", () => {
  assert.equal(skill.toolId, "urge-surfing");
  assert.equal(skill.start, "pull");
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'urge-surfing': 'ride_it_out',/);
  assert.match(readFileSync("src/data/tools.ts", "utf8"), /id: 'urge-surfing',\n\s+name: 'Ride it out',/);
  for (const f of ["src/lib/spine/close.ts", "functions/src/spine/tools.ts"])
    assert.match(readFileSync(f, "utf8"), /'urge-surfing': \{ module: 'dt', closeKind: 'urge_change' \}/, `${f}: R7`);
  assert.match(readFileSync("src/pages/tools/UrgeSurfing.tsx", "utf8"), /export function UrgeSurfing/, "C8: kept, unrouted");
});

test("the pulls are Hold to wait's, same ids and urges, so the session's urgeIds match across the two", () => {
  const hold = content.skills.find((s) => s.id === "hold_to_wait");
  const pulls = (sk) => sk.options.pull.map((o) => [o.value, o.urge]);
  assert.deepEqual(pulls(skill), pulls(hold));
  const s = run(PULL("use"));
  assert.deepEqual(M.runUrgeIds(ctx(), s), ["use"]);
});

test("the ride: PRD step 2's line, checks every 60-90 s, no digits or durations anywhere", () => {
  const s = run(PULL());
  assert.equal(s.stepId, "ride");
  const step = M.stepOf(skill, "ride");
  assert.equal(M.copyText(ctx(), step.title, s), "Urges rise and fall. The job is not to act while it's high.");
  assert.ok(step.props.checkSec >= 60 && step.props.checkSec <= 90, "PRD: every 60-90 s");
  assert.equal(W.checkMs(step.props), step.props.checkSec * 1000);
  // No promised durations (PRD risk line): no copy line says how long, or that it will pass, except the round the
  // person starts themselves.
  for (const [k, v] of Object.entries(skill.copy)) {
    if (k.startsWith("round_") || k === "not_now_hint") continue;
    assert.doesNotMatch(v, /\d|minute|second|will pass|always passes|won't last/i, `${k}: ${v}`);
  }
  const src = readFileSync("src/components/skillPlayer/UrgeWave.tsx", "utf8");
  assert.doesNotMatch(src, /secondsLeft|formatTime|toFixed/, "the wave shows no clock");
});

test("the wave's rules: gone ends it, bigger twice in a row ends it, the checks run out; the object answers", () => {
  assert.equal(W.afterTap([], "gone", 10), "ended_gone");
  assert.equal(W.afterTap(["bigger"], "bigger", 10), "ended_bigger");
  assert.equal(W.afterTap(["bigger", "fading"], "bigger", 10), null, "bigger twice means in a row");
  assert.equal(W.afterTap(["still_here", "still_here"], "still_here", 3), "ended_long");
  assert.ok(W.nextLevel(0.5, "bigger") > 0.5 && W.nextLevel(0.5, "fading") < 0.5 && W.nextLevel(0.5, "still_here") === 0.5);
  assert.equal(W.nextLevel(0.9, "gone"), 0);
  assert.ok(W.nextLevel(0.13, "fading") >= 0.12, "fading never empties it: only gone does");
  const o = W.rideOutput(["still_here", "fading", "gone"], "ended_gone", 151_400);
  assert.deepEqual(o, { ids: ["still_here", "fading", "gone", "ended_gone"], durationSec: 151, doneCount: 3 });
  assert.equal(W.rideOutput(Array(14).fill("still_here"), "ended_long", 0).ids.length, 12, "out ids ≤ 12 with the end marker");
  assert.equal(W.cameDown(["still_here", "fading", "ended_left"]), true);
  assert.equal(W.cameDown(["fading", "bigger", "ended_left"]), false);
  assert.match(W.tracePath(W.levels(["bigger", "fading", "gone"]), 300, 120), /^M [\d.]+ [\d.]+( C [\d., ]+)+$/);
  assert.match(W.tracePath(W.levels([]), 300, 120), /^M /, "an empty trace still draws");
});

test("the trace is categorical samples in order: recorded as the step's out and answer", () => {
  const s = run([...PULL(), out("still_here", "bigger", "fading", "gone", "ended_gone")]);
  assert.equal(s.stepId, "shape");
  assert.deepEqual(s.out.ride.ids, ["still_here", "bigger", "fading", "gone", "ended_gone"]);
  assert.equal(s.out.ride.durationSec, 200);
  assert.deepEqual(s.answers.ride.ids, ["still_here", "bigger", "fading", "gone", "ended_gone"]);
  const t = run([out("read")], ctx(), s);
  assert.equal(t.stepId, "end");
  assert.equal(M.handoffLine(ctx(), M.stepOf(skill, "end"), t), "You watched it come down.", "the close asks whether they acted; the card doesn't say");
  assert.deepEqual(offers(t), ["pros_cons"], "make a card for this pull (DT-10)");
  assert.ok(!M.stepOf(skill, "end").noClose, "the two-part close follows the end card");
});

test("leaving the ride early still draws what there was; leaving before any check goes straight to the end", () => {
  assert.equal(run([...PULL(), out("still_here", "ended_left")]).stepId, "shape");
  assert.equal(run([...PULL(), out("ended_left")]).stepId, "end");
  const s = run([...PULL(), out("ended_left")]);
  assert.equal(M.handoffLine(ctx(), M.stepOf(skill, "end"), s), "You stayed with it. That's the skill.");
});

test("bigger twice: the body or Hold to wait (the modality changes), or keep riding without not now", () => {
  const big = run([...PULL(), out("bigger", "bigger", "ended_bigger")]);
  assert.equal(big.stepId, "bigger");
  const sw = run([pick("bigger", "body"), next], ctx(), big);
  assert.equal(sw.stepId, "switch");
  assert.deepEqual(offers(sw), ["cool_down", "pause"]);
  const keep = run([pick("bigger", "keep"), next], ctx(), big);
  assert.equal(keep.stepId, "ride2");
  assert.ok(!("notNow" in M.stepOf(skill, "ride2").props), "the second ride has no not-now button");
  // Bigger twice again: the switch, without asking.
  assert.equal(run([out("bigger", "bigger", "ended_bigger")], ctx(), keep).stepId, "switch");
  const done = run([out("fading", "ended_left")], ctx(), keep);
  assert.equal(done.stepId, "shape");
});

test("not now (H21): something else per pull, never food or drink; a five-minute round, renewable once", () => {
  const nn = run([...PULL("send"), out("ended_not_now")]);
  assert.equal(nn.stepId, "not_now");
  const field = M.shownFields(ctx(), M.stepOf(skill, "not_now"), nn)[0];
  const ids = (s) => M.optionGroups(ctx(), field, s.answers).flatMap((g) => g.options.map((o) => o.value));
  assert.ok(!ids(nn).includes("call"), "texting someone isn't the swap when sending is the pull");
  assert.ok(ids(nn).includes("phone"));
  for (const o of skill.options.swap) assert.doesNotMatch(o.label, /\bcold\b|face/i, `cold on the face is First, the body's, after its self-check: ${o.label}`);
  const hurtish = run([...PULL("hit"), out("ended_not_now")]);
  assert.ok(ids(hurtish).includes("cold") && ids(hurtish).includes("squeeze"));
  for (const o of skill.options.swap)
    assert.doesNotMatch(o.label, /mint|drink|fizzy|sour|eat|snack|food|shop|buy|scroll/i, `C6.7: ${o.label}`);
  const r = run([pick("swap", "walk"), next], ctx(), nn);
  assert.equal(r.stepId, "round");
  assert.equal(M.stepOf(skill, "round").props.seconds, 300);
  assert.equal(M.copyText(ctx(), M.stepOf(skill, "round").title, r), "Not now. A walk for five minutes, even round the room.");
  const after = run([out("done")], ctx(), r);
  assert.equal(after.stepId, "after_round");
  const passed = run([pick("after_round", "passed"), next], ctx(), after);
  assert.equal(passed.stepId, "passed", "no checks before not now: nothing to draw");
  const drawn = run([...PULL(), out("still_here", "ended_not_now"), pick("swap", "walk"), next, out("done"), pick("after_round", "passed"), next]);
  assert.equal(drawn.stepId, "shape", "a ride before the round is drawn first");
  assert.equal(run([out("read")], ctx(), drawn).stepId, "passed");
  assert.equal(M.handoffLine(ctx(), M.stepOf(skill, "passed"), passed), "You told it not now, and it eased.");
  const again = run([pick("after_round", "again"), next, out("done")], ctx(), after);
  assert.equal(again.stepId, "after_round2");
  const f2 = M.shownFields(ctx(), M.stepOf(skill, "after_round2"), again)[0];
  assert.ok(!M.optionGroups(ctx(), f2, again.answers).flatMap((g) => g.options.map((o) => o.value)).includes("again"), "renewed once");
  assert.equal(run([pick("after_round2", "still"), next], ctx(), again).stepId, "ride2");
  assert.equal(run([pick("after_round", "still"), next], ctx(), after).stepId, "ride2");
});

test("hurt myself: safety.open first, the banner on every screen, no ride when not safe, its own end with no close", () => {
  const s = run(PULL("hurt"));
  assert.equal(s.stepId, "safe");
  assert.ok(M.opensSafety(ctx(), M.stepOf(skill, "safe"), s), "safetyFirst on arrival (C6.5)");
  for (const a of ["unsure", "no"]) {
    const r = run([pick("safe", a), next], ctx(), s);
    assert.equal(r.stepId, "reach");
    assert.ok(M.stepOf(skill, "reach").noClose);
  }
  const ride = run([pick("safe", "safe"), next], ctx(), s);
  assert.equal(ride.stepId, "ride");
  for (const st of skill.steps.filter((x) => x.id !== "pull")) assert.ok(st.crisis?.length, `${st.id} declares the crisis slot`);
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "ride"), ride)?.variant, "crisis");
  const end = run([out("fading", "gone", "ended_gone"), out("read")], ctx(), ride);
  assert.equal(end.stepId, "hurt_end");
  assert.ok(M.stepOf(skill, "hurt_end").noClose, "no *did you act on it?* after hurt myself");
  const nn = run([out("ended_not_now"), pick("swap", "walk"), next, out("done"), pick("after_round", "passed"), next], ctx(), ride);
  assert.equal(nn.stepId, "hurt_end");
  // Getting bigger: are you still safe?, with the resources opened again, never a menu of exercises.
  const big = run([out("bigger", "bigger", "ended_bigger")], ctx(), ride);
  assert.equal(big.stepId, "safe_again");
  assert.ok(M.opensSafety(ctx(), M.stepOf(skill, "safe_again"), big));
  assert.equal(run([pick("safe_again", "no"), next], ctx(), big).stepId, "reach");
  const sw = run([pick("safe_again", "safe"), next], ctx(), big);
  assert.equal(sw.stepId, "switch");
  assert.deepEqual(offers(sw), ["cool_down"], "after hurt myself: the body, never a phone-down wait");
  assert.match(M.handoffLine(ctx(), M.stepOf(skill, "switch"), sw), /Something for your body first/);
  const r2 = run([out("ended_not_now"), pick("swap", "walk"), next, out("done"), pick("after_round", "still"), next, out("bigger", "bigger", "ended_bigger")], ctx(), ride);
  assert.equal(r2.stepId, "safe_again", "the second ride re-checks too");
  // The swaps for hurt myself: no cold, no squeeze (a sensation substitute), cool water on the hands only.
  const nnHurt = run([out("ended_not_now")], ctx(), ride);
  const f = M.shownFields(ctx(), M.stepOf(skill, "not_now"), nnHurt)[0];
  assert.deepEqual(M.optionGroups(ctx(), f, nnHurt.answers).flatMap((g) => g.options.map((o) => o.value)), ["walk", "wash", "call", "just_wait"]);
});

test("flooded: settle first (the body, or Hold to wait) or ride now, two choices (T8); hurt myself never rides flooded", () => {
  const c = ctx({ band: "flooded" });
  const s = run(PULL(), c);
  assert.equal(s.stepId, "heads_up");
  assert.equal(skill.options.heads_up.length, 2, "T8: two choices at most");
  const body = run([pick("heads_up", "body"), next], c, s);
  assert.equal(body.stepId, "settle");
  assert.deepEqual(offers(body, c), ["cool_down", "pause"]);
  assert.equal(run([pick("heads_up", "now"), next], c, s).stepId, "ride");
  const hurt = run([...PULL("hurt"), pick("safe", "safe"), next], c);
  assert.equal(hurt.stepId, "settle", "as Hold to wait: the body first, no ride");
  assert.deepEqual(offers(hurt, c), ["cool_down"]);
  assert.match(M.handoffLine(c, M.stepOf(skill, "settle"), hurt), /your support is right here/);
});

test("leave: the ride says getting away to be safe isn't what it's for, before asking them not to act", () => {
  const s = run(PULL("leave"));
  assert.match(M.copyText(ctx(), M.stepOf(skill, "ride").title, s), /If you need to get away to be safe, go/);
  assert.equal(M.copyText(ctx(), M.stepOf(skill, "ride").title, run(PULL("send"))), "Urges rise and fall. The job is not to act while it's high.");
});

test("every screen has talk to someone now but the reach card, whose banner is the way", () => {
  for (const st of skill.steps) {
    if (st.id === "reach") continue;
    const links = [...(st.links ?? []), ...(st.fields ?? []).flatMap((f) => f.links ?? [])];
    assert.ok(links.some((l) => l.exit === "safety_open"), st.id);
  }
});

test("routing: urge-surfing's row is live (12 Nov 2026, default to connected)", () => {
  const cy = readFileSync("schema/recommended-for.cypher", "utf8");
  const rows = cy.split("\n").filter((l) => /\{id: "rf_[^"]*_urge-surfing"/.test(l));
  assert.ok(rows.length >= 1, "the worried row is there");
  for (const l of rows) {
    assert.match(l, /active: true/, l);
    assert.match(l, /review: "approved"/, l);
  }
});
