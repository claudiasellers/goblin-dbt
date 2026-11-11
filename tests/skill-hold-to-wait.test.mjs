// Hold to wait (PRD DT-02, STOP rebuilt; DBT DT Handout 4; docs/design/hold-to-wait.md) on the skill runtime:
// hurt myself opens safety.open before anything else, every time, and the crisis banner stays on every screen
// after it; not safe or not sure ends on someone to talk to, with no "did you act on it?"; a carried flooded
// reading takes the short path (hold, step back, body first, a come-back on Today); the phone-down wait never
// locks; the moves are the pull's own, and a move into a tool not built yet is never a chip. Tested through the
// same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
const skill = content.skills.find((s) => s.id === "hold_to_wait");
const embedOutputs = {
  holdRing: { ids: ["held", "partly", "skipped"], measures: ["durationSec", "doneCount", "earlyCount"] },
  waitLock: { ids: ["waited", "back_early"], measures: ["durationSec"] },
};
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const embed = (ids, durationSec = 60) => ({ type: "embedDone", output: { ids, durationSec } });
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const FLOODED = ctx({ band: "flooded" });
const HELD = embed(["held"], 90);
const moves = (s) => M.optionGroups(ctx(), M.stepOf(skill, "proceed").fields.find((f) => f.id === "move"), s.answers)
  .flatMap((g) => g.options.map((o) => o.value));
const toProceed = (pull) => [...(typeof pull === "string" ? [pick("pull", pull)] : [pull]), next,
  ...(pull === "hurt" ? [pick("safe", "safe"), next] : []), HELD, pick("step_back", "sit"), next, next];

test("the skill: tool pause (Hold to wait), starts at the pull, two-part close, played by the player", () => {
  assert.equal(skill.toolId, "pause");
  assert.equal(skill.start, "pull");
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'pause': \{ module: 'dt', closeKind: 'urge_change' \}/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'pause': 'hold_to_wait',/);
  assert.match(readFileSync("src/data/tools.ts", "utf8"), /id: 'pause',\n\s+name: 'Hold to wait',/);
  assert.match(readFileSync("src/pages/ToolPage.tsx", "utf8"), /import \{ Pause \} from '\.\/tools\/Pause';/, "the old page stays in the tree, unrouted (C8)");
  const byTool = spine.closeFlow.byTool.pause;
  assert.equal(byTool.urge.question, "Did you act on it?");
  assert.deepEqual(byTool.urge.choices.map((c) => c.id), ["no", "partly", "yes"]);
  assert.match(byTool.regulation_down.question, /the pull now/);
});

test("hurt myself is on the first row and opens safety.open first, every time, before the one question", () => {
  const pulls = M.optionGroups(ctx(), M.stepOf(skill, "pull").fields[0], {}).flatMap((g) => g.options);
  assert.ok(pulls.findIndex((o) => o.value === "hurt") < 3, "on the first row (D5): hiding it signals shame");
  for (let i = 0; i < 5; i++) {
    const s = run([pick("pull", "hurt"), next]);
    assert.equal(s.stepId, "safe");
    assert.ok(M.opensSafety(ctx(), M.stepOf(skill, "safe"), s), "safetyFirst on arrival, 100% of the time");
  }
  for (const p of ["send", "check", "hit", "leave", "use"]) {
    const s = run([pick("pull", p), next]);
    assert.equal(s.stepId, "hold", p);
    assert.equal(M.opensSafety(ctx(), M.stepOf(skill, s.stepId), s), false, p);
  }
  assert.ok(skill.steps.every((st) => !st.safetyFirst || st.id === "safe"), "only the safe question opens it unasked");
});

test("after hurt myself the crisis banner is on every screen the run reaches", () => {
  const s0 = run([pick("pull", "hurt")]);
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "pull"), s0)?.variant, "crisis", "from the tap on");
  for (const st of skill.steps) assert.equal(M.crisisFor(ctx(), st, s0)?.variant, "crisis", st.id);
  const plain = run([pick("pull", "send")]);
  for (const st of skill.steps) assert.equal(M.crisisFor(ctx(), st, plain), null, `${st.id}: no banner without it`);
});

test("not safe or not sure: straight to someone to talk to, nothing in its place, no close question", () => {
  for (const v of ["unsure", "no"]) {
    const s = run([pick("pull", "hurt"), next, pick("safe", v), next]);
    assert.equal(s.stepId, "reach", `${v}: no hold first (S9: nothing offered in place of crisis support)`);
    assert.deepEqual(s.path, ["pull", "safe", "reach"]);
    const reach = M.stepOf(skill, "reach");
    assert.ok(reach.noClose);
    assert.equal(M.crisisFor(ctx(), reach, s)?.variant, "crisis", "the banner is the way to them");
    assert.deepEqual(M.offersFor(ctx(), reach, s), [], "no second button competing with the banner; the kit is planned");
    assert.match(M.handoffLine(ctx(), reach, s), /reach out to someone now/);
  }
  const safe = run([pick("pull", "hurt"), next, pick("safe", "safe"), next]);
  assert.equal(safe.stepId, "hold", "safe for now: the hold, the banner still up");
});

test("hurt myself, safe for now: no phone-down step, and its own end card with no close question", () => {
  const backs = (c, s) => M.optionGroups(c, M.stepOf(skill, "step_back").fields[0], s.answers).flatMap((g) => g.options.map((o) => o.value));
  const atBack = run([pick("pull", "hurt"), next, pick("safe", "safe"), next, HELD]);
  assert.deepEqual(backs(ctx(), atBack), ["sit", "room", "outside", "lap"], "the phone stays in reach of the support");
  const end = (move) => run([...toProceed("hurt"), pick("move", move), next]);
  const card = M.stepOf(skill, "hurt_end");
  for (const move of ["cool", "call"]) {
    const s = end(move);
    assert.equal(s.stepId, "hurt_end", move);
    assert.ok(card.noClose, "never 'did you act on it?' after hurt myself");
    assert.equal(M.handoffLine(ctx(), card, s), "You gave it some room. If it comes back, your support is right here.");
    assert.equal(M.crisisFor(ctx(), card, s)?.variant, "crisis");
  }
  assert.deepEqual(M.offersFor(ctx(), card, end("cool")), ["cool_down"]);
  assert.deepEqual(M.offersFor(ctx(), card, end("call")), ["safety_open"], "the kit and Held are planned");
  // Flooded and hurt: the step back, then this card (body first), never the settle card's close.
  const f = run([pick("pull", "hurt"), next, pick("safe", "safe"), next, HELD, pick("step_back", "sit"), next], FLOODED);
  assert.equal(f.stepId, "hurt_end");
  assert.deepEqual(M.offersFor(FLOODED, card, f), ["cool_down"]);
  assert.match(M.handoffLine(FLOODED, card, f), /Settle it first/);
  assert.ok(M.stepOf(skill, "next").lines.every((l) => l.key !== "next_hurt"));
});

test("the hold: a witness line first, a way past after one try, someone to talk to under it", () => {
  const s = run([pick("pull", "send"), next]);
  const hold = M.stepOf(skill, "hold");
  assert.equal(M.copyText(ctx(), hold.title, s), "That's a strong pull. It makes sense it's this strong.");
  assert.equal(hold.embed, "holdRing");
  assert.equal(hold.props.variant, "press");
  assert.deepEqual(M.stepLinks(ctx(), hold, s).map((l) => l.exit.id), ["safety_open"]);
  for (const ids of [["held"], ["partly"], ["skipped"]]) assert.equal(run([embed(ids, 4)], ctx(), s).stepId, "step_back", ids[0]);
});

test("a carried flooded reading: hold, step back, then the body first, and a come-back on Today", () => {
  const atHold = run([pick("pull", "hit"), next], FLOODED);
  assert.match(M.copyText(FLOODED, M.stepOf(skill, "hold").title, atHold), /Your body's loud/);
  const atBack = run([HELD], FLOODED, atHold);
  const st = run([pick("step_back", "sit")], FLOODED, atBack);
  assert.deepEqual(M.followUpFor(FLOODED, M.stepOf(skill, "step_back"), st), { type: "hold_come_back", chip: null });
  const s = run([next], FLOODED, st);
  assert.equal(s.stepId, "settle", "observe and proceed wait for the come-back");
  assert.deepEqual(M.offersFor(FLOODED, M.stepOf(skill, "settle"), s), ["cool_down"]);
  const backs = M.optionGroups(FLOODED, M.stepOf(skill, "step_back").fields[0], atBack.answers).flatMap((g) => g.options.map((o) => o.value));
  assert.deepEqual(backs, ["sit", "lap"], "two choices at most when flooded (T8)");
  assert.ok(!s.path.includes("observe") && !s.path.includes("proceed"));
  // No band, or any other band: the standard path (D1).
  for (const band of [undefined, "steady", "stirred"]) {
    const c = ctx(band ? { band } : {});
    assert.equal(run([pick("pull", "hit"), next, HELD, pick("step_back", "sit"), next], c).stepId, "observe", String(band));
  }
});

test("the phone down: a ten-minute wait that never locks, then a come-back on Today", () => {
  const st = run([pick("pull", "check"), next, HELD, pick("step_back", "phone_down")]);
  assert.deepEqual(M.followUpFor(ctx(), M.stepOf(skill, "step_back"), st), { type: "hold_come_back", chip: null });
  const s = run([next], ctx(), st);
  assert.equal(s.stepId, "wait");
  const wait = M.stepOf(skill, "wait");
  assert.equal(wait.embed, "waitLock");
  assert.equal(wait.props.minutes, 10);
  for (const ids of [["waited"], ["back_early"]]) assert.equal(run([embed(ids, 30)], ctx(), s).stepId, "observe", ids[0]);
  assert.equal(M.followUpFor(ctx(), M.stepOf(skill, "step_back"), run([pick("pull", "check"), next, HELD, pick("step_back", "sit")])), null, "no reminder otherwise");
  const type = spine.followUpTypes.find((t) => t.id === "hold_come_back");
  assert.ok(type?.enabled);
  assert.equal(type.deepLinkTemplate, "/tool/pause?run={sourceSessionId}&at=step_back&followUp={followUpId}", "reopens the visit at the step back (R9); Next goes on to observe");
  // The reopened run (the flooded visit, closed at its settle card): back at the step back, whose Next leads to observe.
  const rec = { skillId: skill.id, versionId: skill.version, path: ["pull", "hold", "step_back", "settle"],
    answers: [{ fieldId: "pull", optionIds: ["check"] }, { fieldId: "hold", optionIds: ["held"] }, { fieldId: "step_back", optionIds: ["sit"] }] };
  const back = M.resumeRun(ctx(), rec, "step_back");
  assert.equal(back.stepId, "step_back");
  assert.equal(run([next], ctx(), back).stepId, "observe");
  assert.deepEqual(type.window, { kind: "after", minutes: 10 });
  assert.doesNotMatch(`${type.copy.title} ${type.copy.body} ${type.notification}`, /hurt|harm|drink|use|send|text/i, "Today never names the urge");
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /f\.type IN \[[^\]]*'hold_come_back'\]/, "opening it resolves it");
});

test("observe is one tap each and skippable; proceed offers the pull's own moves only", () => {
  const atObserve = run([pick("pull", "send"), next, HELD, pick("step_back", "sit"), next]);
  assert.equal(atObserve.stepId, "observe");
  assert.ok(M.canGoOn(ctx(), atObserve), "nothing required");
  assert.deepEqual(moves(run(toProceed("send"))), ["later", "tell", "ask"]);
  assert.deepEqual(moves(run(toProceed("check"))), ["phone_room", "look_once"]);
  assert.deepEqual(moves(run(toProceed("hurt"))), ["cool", "call"]);
  assert.deepEqual(moves(run(toProceed("hit"))), ["cool", "rebel"], "no confrontation line while aroused enough to hit");
  assert.deepEqual(moves(run(toProceed("leave"))), ["boundary", "step_out", "rebel"]);
  assert.deepEqual(moves(run(toProceed("use"))), ["cool", "ride", "not_now"]);
  assert.deepEqual(moves(run(toProceed(own("pull", "text my ex")))), ["cool", "ride"], "own words: the general moves");
});

test("the end card: the move's own line or the plain one, its tool as the one offer, planned tools never shown", () => {
  const end = (pull, move) => run([...toProceed(pull), pick("move", move), next]);
  const card = M.stepOf(skill, "next");
  const s1 = end("send", "ask");
  assert.equal(s1.stepId, "next");
  assert.deepEqual(M.offersFor(ctx(), card, s1), ["dear_man"]);
  assert.equal(M.handoffLine(ctx(), card, s1), "You gave the pull some room. What you do next is yours.");
  const s2 = end("send", "later");
  assert.deepEqual(M.offersFor(ctx(), card, s2), []);
  assert.match(M.handoffLine(ctx(), card, s2), /Saving it for later is a choice/);
  assert.deepEqual(M.offersFor(ctx(), card, end("check", "phone_room")), [], "mind job is planned");
  assert.deepEqual(M.offersFor(ctx(), card, end("use", "ride")), ["urge_surfing"]);
  assert.deepEqual(M.offersFor(ctx(), card, end("leave", "boundary")), ["fast"]);
  assert.deepEqual(M.offersFor(ctx(), card, end("hit", "rebel")), ["alternate_rebellion"]);
  const planned = new Set(skill.exits.filter((x) => x.planned).map((x) => x.id));
  assert.deepEqual([...planned].sort(), ["crisis_kit", "held", "mind_job"]);
  for (const o of skill.options.move) assert.ok(!planned.has(o.handsOn), `${o.value}: no chip into a planned tool`);
});

test("the session's urge ids: the pull's ActionUrge, own words record none", () => {
  const urges = new Set([...readFileSync("schema/opposite-action-data.cypher", "utf8").matchAll(/\{id: "([a-z0-9_-]+)", label:/g)].map((m) => m[1]));
  for (const [p, u] of [["send", "send"], ["check", "check"], ["hurt", "self_harm"], ["hit", "hit"], ["leave", "leave"], ["use", "use"]]) {
    assert.deepEqual(M.runUrgeIds(ctx(), run([pick("pull", p)])), [u], p);
    assert.ok(urges.has(u), `${u} is an ActionUrge`);
  }
  assert.deepEqual(M.runUrgeIds(ctx(), run([own("pull", "something else")])), []);
});

test("copy: no rating, no numbers to read, nothing about food or shopping as a move", () => {
  const all = Object.values(skill.copy).join(" ");
  assert.doesNotMatch(all, /\b(rate|scale|out of 10|0-10)\b/i);
  for (const o of skill.options.move) assert.doesNotMatch(o.label, /\b(eat|snack|buy|shop|scroll)\b/i, o.value);
  for (const st of skill.steps) if (st.kind === "ask") assert.ok(st.crisis?.length, `${st.id}: a crisis slot`);
  // Parity with the old page's harm patches (tests/wave0-harm-patches.test.mjs): no "freeze", no deep breaths,
  // and T is "take a step back".
  const words = [all, ...Object.values(skill.options).flat().map((o) => o.label)].join(" ");
  assert.doesNotMatch(words, /freeze/i);
  assert.doesNotMatch(words, /deep breath/i);
  assert.match(skill.copy.back_title, /take one step back/i);
  assert.doesNotMatch(skill.copy.next_line + skill.copy.pull_hint, /yours to decide/, "no permission framing beside hurt myself");
});

test("the player: safetyFirst opens the resources once per arrival; the run's urge ids reach the session; the wait embed never locks", () => {
  const p = readFileSync("src/components/skillPlayer/SkillPlayer.tsx", "utf8");
  assert.match(p, /toolSession\.setUrgeIds\(runUrgeIds\(ctx, st\)\)/);
  assert.match(p, /if \(resuming \|\| safetyAt\.current === st\.path\.length\) return;/);
  assert.match(p, /if \(opensSafety\(ctx, stepOf\(skill, st\.stepId\), st\)\) \{/);
  const w = readFileSync("src/components/skillPlayer/WaitLockEmbed.tsx", "utf8");
  assert.match(w, /<WaitLock minutes=\{minutes\} text=\{null\} clock=\{false\}/, "a plain wait: no digits, no padlock");
  assert.match(w, /<button type="button" className=\{primaryButton\} onClick=\{finish\}>\{next\}<\/button>/, "I'm back from the first second");
  assert.match(w, /ids: \[over \? 'waited' : 'back_early'\]/);
});
