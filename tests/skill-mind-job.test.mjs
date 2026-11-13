// Give your mind a job (PRD DT-06; Wise Mind ACCEPTS with a return, the attention ladder, the lid: DBT DT Handouts
// 7 and 9; docs/design/mind-job.md) on the skill runtime: every way in has a return (the check straight after the
// tasks, a break's return card, the lid's reopen), the tasks get warmer or cooler by the person's own tap, a carried
// flooded reading gets the body first or the coolest tasks only, and nothing on the shelf is thrown away unopened.
// Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const L = await importTs("src/lib/lidShelf.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "mind_job");
const embedOutputs = {
  orientFind: { ids: ["done", "partly", "skipped"], measures: ["doneCount"] },
  bodyCard: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
  lidShelf: { ids: ["shut", "partly", "skipped"], measures: ["durationSec"] },
};
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const found = { type: "embedDone", output: { ids: ["done"], doneCount: 3 } };
const stayed = { type: "embedDone", output: { ids: ["done"], durationSec: 10 } };
const shut = { type: "embedDone", output: { ids: ["shut"], durationSec: 3 } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s);
const ids = (s, step, c = ctx()) => {
  const f = M.shownFields(c, M.stepOf(skill, step), s)[0];
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const FLOODED = ctx({ band: "flooded" });
const LOOP = [pick("what", "loop"), next];
const BLUE = [...LOOP, pick("warmth", "find"), next, pick("to_find", "blue"), next, found];
const LID = [pick("what", "lid"), next, pick("lid_pick", "tin"), next, shut];

test("the skill: tool mind-job, named Give your mind a job, its close asked in the flow, played by the player", () => {
  assert.equal(skill.toolId, "mind-job");
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'mind-job': 'mind_job',/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'mind-job',\n\s+name: 'Give your mind a job',/);
  assert.match(tools, /label: 'My mind won\\'t stop', toolId: 'mind-job'/);
  for (const f of ["src/lib/spine/close.ts", "functions/src/spine/tools.ts"])
    assert.match(readFileSync(f, "utf8"), /'mind-job': \{ module: 'dt', closeKind: 'regulation_down' \}/, f);
  const back = M.stepOf(skill, "back").fields[0];
  assert.equal(back.askFresh, "thenVsNow");
  assert.deepEqual(skill.resumeAt, ["back"]);
});

test("three ways in, and each one comes back: the tasks, a break, the lid", () => {
  assert.deepEqual(ids(M.initialRun(skill), "what"), ["loop", "break", "lid"]);
  assert.equal(run(LOOP).stepId, "warmth");
  assert.equal(run([pick("what", "break"), next]).stepId, "break");
  assert.equal(run([pick("what", "lid"), next]).stepId, "lid_pick");
});

test("a task, then how it was: about right stays, more goes warmer, too much goes cooler, enough goes back to it", () => {
  const s = run(BLUE);
  assert.equal(s.stepId, "how_find");
  assert.equal(run([pick("how_find", "right"), next], ctx(), s).stepId, "to_find");
  assert.equal(run([pick("how_find", "more"), next], ctx(), s).stepId, "to_like");
  assert.equal(run([pick("how_find", "enough"), next], ctx(), s).stepId, "back");
  const like = run([pick("how_find", "more"), next, pick("to_like", "soft"), next, found], ctx(), s);
  assert.equal(like.stepId, "how_like");
  assert.equal(run([pick("how_like", "too_much"), next], ctx(), like).stepId, "to_find");
  assert.equal(run([pick("how_like", "more"), next], ctx(), like).stepId, "to_good");
  // The warmest tasks stay with what they found for a few seconds, then ask the same.
  const good = run([pick("how_like", "more"), next, pick("to_good", "made"), next, found], ctx(), like);
  assert.equal(good.stepId, "stay");
  assert.equal(run([stayed], ctx(), good).stepId, "how_good");
  assert.equal(run([stayed, pick("how_good", "more"), next], ctx(), good).stepId, "to_good", "the warmest stays warmest");
  assert.equal(run([stayed, pick("how_good", "too_much"), next], ctx(), good).stepId, "to_like");
  // Too much at the coolest: the body first.
  const cool = run([pick("how_find", "too_much"), next], ctx(), s);
  assert.equal(cool.stepId, "too_much");
  assert.deepEqual(offers(cool), ["cool_down"]);
});

test("the tasks: eyes open and outward at every warmth (the plan one included), never numbered, never compared with anyone", () => {
  const levels = Object.fromEntries(["find", "like", "good"].map((lv) => [lv, skill.options[`task_${lv}`].map((o) => o.value)]));
  assert.deepEqual(levels, { find: ["blue", "sound", "round", "edges"], like: ["look", "soft", "hum"], good: ["made", "liked", "ahead"] });
  for (const st of skill.steps.filter((x) => x.embed === "orientFind")) {
    assert.ok(["find", "listen"].includes(st.props.variant), st.id);
    assert.ok(st.links.some((l) => l.exit === "safety_open"), `${st.id}: a quiet way to someone`);
  }
  const text = Object.values(skill.copy).join(" ");
  assert.doesNotMatch(text, /level \d|\bother people\b|\beveryone else\b|close your eyes|\bthink of\b/i);
});

test("a carried flooded reading: the body first, or the coolest tasks only; more never goes warmer", () => {
  const s = run(LOOP, FLOODED);
  assert.equal(s.stepId, "heads_up");
  const body = run([pick("heads_up", "body"), next], FLOODED, s);
  assert.equal(body.stepId, "settle");
  assert.deepEqual(offers(body, FLOODED), ["cool_down"]);
  const find = run([pick("heads_up", "find"), next], FLOODED, s);
  assert.equal(find.stepId, "to_find");
  assert.deepEqual(ids(find, "to_find", FLOODED), ["blue", "sound"], "two choices while flooded (T8)");
  const how = run([pick("to_find", "sound"), next, found], FLOODED, find);
  assert.deepEqual(ids(how, "how_find", FLOODED), ["too_much", "enough"]);
  assert.equal(run([pick("how_find", "more"), next], FLOODED, how).stepId, "how_find", "more isn't there to pick");
  assert.equal(run([pick("how_find", "too_much"), next], FLOODED, how).stepId, "too_much");
  assert.equal(run([pick("how_find", "enough"), next], FLOODED, how).stepId, "back");
  // A break asks first too; the lid doesn't (holding it shut is containing).
  assert.equal(run([pick("what", "break"), next], FLOODED).stepId, "heads_up");
  assert.equal(run([pick("what", "lid"), next], FLOODED).stepId, "lid_pick");
});

test("the return: louder goes to the body; otherwise the fork (change → Problem Solve or DEAR MAN, can't → Let it be, later → the lid)", () => {
  const back = run([...BLUE, pick("how_find", "enough"), next]);
  assert.deepEqual(ids(back, "back"), ["worse", "same", "better", "much_better"]);
  const louder = run([pick("back", "worse"), next], ctx(), back);
  assert.equal(louder.stepId, "louder");
  assert.deepEqual(offers(louder), ["cool_down"]);
  assert.equal(M.stepOf(skill, "louder").noClose, true);
  const fork = run([pick("back", "better"), next], ctx(), back);
  assert.equal(fork.stepId, "fork");
  const end = (v) => run([pick("fork", v), next], ctx(), fork);
  assert.deepEqual(offers(end("change")), ["problem_solve", "dear_man"]);
  assert.deepEqual(offers(end("cant")), ["let_it_be"]);
  assert.deepEqual(offers(end("gone")), []);
  assert.equal(end("later").stepId, "lid_pick");
  assert.deepEqual(M.askFresh(ctx(), fork), { thenVsNow: "better" });
  // The end after the in-flow close takes the answered-close path (the parts tag row can follow); the other ends don't ask.
  assert.ok(!M.stepOf(skill, "end").noClose);
  for (const id of ["louder", "too_much", "settle", "break_ok", "lid_end", "lid_off"]) assert.equal(M.stepOf(skill, id).noClose, true, id);
});

test("a break: one family of ACCEPTS (never food, shopping or scrolling), then when to come back books the return card", () => {
  const s = run([pick("what", "break"), next]);
  assert.deepEqual(ids(s, "break"), ["move", "hands", "kind", "feeling", "cold"]);
  assert.deepEqual([...new Set(skill.options.break.map((o) => o.family))].sort(), ["Activities", "Contributing", "Emotions", "Sensations"]);
  assert.doesNotMatch(skill.options.break.map((o) => o.label).join(" "), /food|eat|snack|shop|drink|scroll|phone|show/i);
  const at = run([own("break", "walk the dog"), next], ctx(), s);
  assert.equal(at.stepId, "break_at");
  assert.deepEqual(ids(at, "break_at"), ["m5", "m15", "m30", "m60"]);
  const step = M.stepOf(skill, "break_at");
  assert.equal(M.followUpFor(ctx(), step, at), null, "no chip, no card");
  assert.deepEqual(M.followUpFor(ctx(), step, run([pick("break_at", "m15")], ctx(), at)), { type: "mind_job_back", chip: "m15" });
  const done = run([pick("break_at", "m15"), next], ctx(), at);
  assert.equal(done.stepId, "break_ok");
  assert.equal(M.stepOf(skill, "break_ok").noClose, true);
});

test("the return card reopens a break at its check (resumeAt), and the check goes on to the fork as before", () => {
  const rec = M.runRecord(ctx(), run([pick("what", "break"), next, pick("break", "move"), next, pick("break_at", "m30"), next]));
  const back = M.resumeRun(ctx(), rec, "back");
  assert.equal(back?.stepId, "back");
  assert.equal(run([pick("back", "same"), next], ctx(), back).stepId, "fork");
});

test("the lid: pick a container, put it in and hold the lid shut, an optional label, then when to open it (always booked)", () => {
  const s = run(LID);
  assert.equal(s.stepId, "lid_name");
  const lid = M.stepOf(skill, "lid_shut");
  assert.equal(lid.embed, "lidShelf");
  assert.equal(lid.props.containerField, "lid_pick");
  assert.equal(lid.props.holdSec, 3);
  assert.equal(skill.copy[lid.props.skip], "Leave it open for now", "the way on after a let-go says what it does");
  const when = run([next], ctx(), s);
  assert.equal(when.stepId, "lid_when", "the label can be skipped");
  assert.equal(M.canGoOn(ctx(), when), false, "the reopen time can't be skipped");
  assert.deepEqual(ids(when, "lid_when"), ["tonight", "tomorrow", "few_days"]);
  assert.deepEqual(M.followUpFor(ctx(), M.stepOf(skill, "lid_when"), run([pick("lid_when", "tomorrow")], ctx(), when)), { type: "lid_reopen", chip: "tomorrow" });
  const end = run([pick("lid_when", "tonight"), next], ctx(), when);
  assert.equal(end.stepId, "lid_end");
  assert.equal(M.stepOf(skill, "lid_end").noClose, true);
});

test("the reopen: only a lid that was booked reopens; open it → name it → what can be done; not yet puts it back with a new time", () => {
  const reopen = M.stepOf(skill, "reopen");
  assert.deepEqual(reopen.reopens, { after: "lid_when", again: ["repark"] });
  const booked = run([...LID, pick("lid_name", "worry"), next, pick("lid_when", "tomorrow"), next]);
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), booked), "reopen");
  assert.equal(r?.stepId, "reopen");
  assert.equal(M.resumeRun(ctx(), M.runRecord(ctx(), run(LID)), "reopen"), null, "a lid never booked doesn't reopen");
  const opened = run([pick("reopen", "open"), next], ctx(), r);
  assert.equal(opened.stepId, "opened");
  const can = run([pick("opened", "worry"), next], ctx(), opened);
  assert.equal(can.stepId, "can_do");
  const off = (v) => run([pick("can_do", v), next], ctx(), can);
  assert.deepEqual(offers(off("change")), ["problem_solve"]);
  assert.deepEqual(offers(off("facts")), ["check_the_facts"]);
  assert.deepEqual(offers(off("cant")), ["let_it_be", "mindfulness_emotions"], "the feeling it brings: Let it be a wave (ER-08, the containment return)");
  assert.deepEqual(offers(off("gone")), []);
  assert.equal(off("gone").stepId, "lid_off");
  // Not yet: back on the shelf with a new time, and that card reopens too.
  const later = run([pick("reopen", "not_yet"), next], ctx(), r);
  assert.equal(later.stepId, "repark");
  assert.deepEqual(M.followUpFor(ctx(), M.stepOf(skill, "repark"), run([pick("repark", "few_days")], ctx(), later)), { type: "lid_reopen", chip: "few_days" });
  const again = M.resumeRun(ctx(), M.runRecord(ctx(), run([pick("repark", "few_days"), next], ctx(), later)), "reopen");
  assert.equal(again?.stepId, "reopen");
  assert.equal(again.answers.reopen, undefined, "the last reopen's answers don't come back");
  // Gone straight away: the end card says so, nothing else to do.
  const gone = run([pick("reopen", "gone"), next], ctx(), r);
  assert.equal(gone.stepId, "lid_off");
  assert.match(M.handoffLine(ctx(), M.stepOf(skill, "lid_off"), gone), /You came back to check/, "never 'you opened it' when they didn't");
  assert.match(M.handoffLine(ctx(), M.stepOf(skill, "lid_off"), off("gone")), /You opened it/);
  // A carried flooded reading when the card is opened: the body first, or back on the shelf (never opened at the worst moment).
  const fr = M.resumeRun(FLOODED, M.runRecord(ctx(), booked), "reopen");
  const heads = run([pick("reopen", "open"), next], FLOODED, fr);
  assert.equal(heads.stepId, "re_heads");
  assert.equal(run([pick("re_heads", "body"), next], FLOODED, heads).stepId, "settle");
  assert.equal(run([pick("re_heads", "later"), next], FLOODED, heads).stepId, "repark");
});

test("every screen has a quiet way to someone", () => {
  for (const st of skill.steps) {
    const links = [...(st.links ?? []), ...(st.fields ?? []).flatMap((f) => f.links ?? [])];
    assert.ok(links.some((l) => l.exit === "safety_open"), st.id);
  }
});

test("the follow-up types: a break's return (minutes) and the lid's reopen (times of day), both reopening this tool", () => {
  const spine = readFileSync("scripts/practice-spine/content.py", "utf8");
  assert.match(spine, /"deepLinkTemplate": "\/tool\/mind-job\?run=\{sourceSessionId\}&at=back&followUp=\{followUpId\}"/);
  assert.match(spine, /"deepLinkTemplate": "\/tool\/mind-job\?run=\{sourceSessionId\}&at=reopen&followUp=\{followUpId\}"/);
  const opens = readFileSync("functions/src/spine/toolSession.ts", "utf8");
  for (const t of ["mind_job_back", "lid_reopen"]) assert.match(opens, new RegExp(`'${t}'`), t);
});

test("the lid's rules: the container, the hold's length, the lid's lift and what it reports", () => {
  assert.equal(L.containerOf("tin"), "tin");
  assert.equal(L.containerOf("box"), "box");
  assert.equal(L.containerOf(undefined), "jar");
  assert.equal(L.containerOf("vase"), "jar");
  assert.equal(L.lidHoldMs({ holdSec: 3 }), 3000);
  assert.equal(L.lidHoldMs({}), 3000);
  assert.equal(L.lidHoldMs({ holdSec: 0 }), 3000);
  assert.equal(L.lidHoldMs({ holdSec: 2.5 }), 3000);
  assert.equal(L.lidHoldMs({ holdSec: 10 }), 10000);
  assert.equal(L.lidLift(0), 36);
  assert.equal(L.lidLift(1), 0);
  assert.equal(L.lidLift(0.5), 18);
  assert.equal(L.lidLift(-1), 36);
  assert.deepEqual(L.lidOutput(true, true, 3200), { ids: ["shut"], durationSec: 3 });
  assert.deepEqual(L.lidOutput(false, true, 1400), { ids: ["partly"], durationSec: 1 });
  assert.deepEqual(L.lidOutput(false, false, 0), { ids: ["skipped"], durationSec: 0 });
});
