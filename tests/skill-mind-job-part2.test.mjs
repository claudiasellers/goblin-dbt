// Give your mind a job, part 2 (DT-06; docs/design/mind-job.md): level 3 from the person's own things I like (ER-04),
// the per-feeling ceilings (shame, grief, rejection keep the ladder at find and like), the re-park heads-up, and the
// runtime's `$carried` ref they read. Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const C = await importTs("src/lib/skillRuntime/conditions.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "mind_job");
const embedOutputs = {
  orientFind: { ids: ["done", "partly", "skipped"], measures: ["doneCount"] },
  doseTimer: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
  lidShelf: { ids: ["shut", "partly", "skipped"], measures: ["durationSec"] },
};
const GRID = new Set(["ashamed", "anxious", "lonely", "grief"]);
const THINGS = { thingsILike: [{ id: "t1", label: "Walking by the river" }, { id: "t2", label: "My guitar" }] };
const ctx = ({ ctxIn = {}, carried = [], profile = null } = {}) =>
  ({ skill, shared: content, carried, gridIds: GRID, emotionLabel: (x) => x, ctxIn, embedOutputs, profile });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const found = { type: "embedDone", output: { ids: ["done"], doneCount: 1 } };
const timed = { type: "embedDone", output: { ids: ["done"], durationSec: 180 } };
const shut = { type: "embedDone", output: { ids: ["shut"], durationSec: 3 } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const ids = (s, step, c) => {
  const f = M.shownFields(c, M.stepOf(skill, step), s)[0];
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const LOOP = [pick("what", "loop"), next];

test("$carried: the grid words a link carried, read with has; never a pick", () => {
  const sc = (carried) => ({ answers: {}, derived: {}, picked: () => [], carried });
  assert.equal(C.holds({ has: ["$carried", "ashamed"] }, sc(["ashamed"])), true);
  assert.equal(C.holds({ has: ["$carried", "ashamed"] }, sc([])), false);
  assert.equal(C.holds({ has: ["$carried", "ashamed"] }, { answers: {}, derived: {}, picked: () => [] }), false, "absent is empty");
  // The machine's scope keeps only real grid words.
  const s = M.scope(ctx({ carried: ["ashamed", "not_a_word"] }), M.initialRun(skill));
  assert.deepEqual(s.carried, ["ashamed"]);
});

test("level 3: one of their own things I like, only once something is kept; a few minutes with it, then the return", () => {
  assert.deepEqual(ids(run(LOOP), "warmth", ctx()), ["find", "like", "good"], "nothing kept: no level 3");
  const c = ctx({ profile: THINGS });
  let s = run(LOOP, c);
  assert.deepEqual(ids(s, "warmth", c), ["find", "like", "good", "mine"]);
  s = run([pick("warmth", "mine"), next], c, s);
  assert.equal(s.stepId, "to_mine");
  assert.deepEqual(ids(s, "to_mine", c), ["t1", "t2"], "their own things, with their own labels");
  s = run([pick("to_mine", "t2"), next], c, s);
  assert.equal(s.stepId, "mine_do");
  assert.equal(M.stepOf(skill, "mine_do").embed, "doseTimer");
  s = run([timed], c, s);
  assert.equal(s.stepId, "back", "the return straight after, as every way in has");
  const readsThings = (f) => new RegExp(`'mind-job': \\['parts', 'thingsILike'\\]`).test(readFileSync(f, "utf8"));
  assert.ok(readsThings("functions/src/profile/types.ts") && readsThings("src/data/profileTypes.ts"));
});

test("ceilings: after shame, grief or rejection the ladder stays at find and like", () => {
  for (const w of ["ashamed", "lonely", "grief"]) {
    const c = ctx({ carried: [w], profile: THINGS });
    const s = run(LOOP, c);
    assert.deepEqual(ids(s, "warmth", c), ["find", "like"], w);
    // More from like stays at like, never good.
    const like = run([pick("warmth", "like"), next, pick("to_like", "look"), next, found, pick("how_like", "more"), next], c, s);
    assert.equal(like.stepId, "to_like", w);
  }
  // Any other carried word: the whole ladder, and more from like goes warmer.
  const c = ctx({ carried: ["anxious"] });
  const s = run(LOOP, c);
  assert.deepEqual(ids(s, "warmth", c), ["find", "like", "good"]);
  assert.equal(run([pick("warmth", "like"), next, pick("to_like", "look"), next, found, pick("how_like", "more"), next], c, s).stepId, "to_good");
  // Never said on screen: no copy names the ceiling.
  for (const v of Object.values(skill.copy)) assert.doesNotMatch(v, /shame|grief|reject/i);
});

test("the re-park heads-up: put back before, said once plainly, never a lock", () => {
  const c = ctx();
  const LID = [pick("what", "lid"), next, pick("lid_pick", "tin"), next, shut, next, pick("lid_when", "tomorrow"), next];
  const booked = run(LID, c);
  const r1 = M.resumeRun(c, M.runRecord(c, booked), "reopen");
  const parked = run([pick("reopen", "not_yet"), next], c, r1);
  assert.equal(parked.stepId, "repark");
  assert.equal(M.copyText(c, M.stepOf(skill, "repark").title, parked), skill.copy.repark_title, "the first time: no heads-up");
  const r2 = M.resumeRun(c, M.runRecord(c, run([pick("repark", "few_days"), next], c, parked)), "reopen");
  const again = run([pick("reopen", "not_yet"), next], c, r2);
  assert.equal(again.stepId, "repark");
  assert.equal(M.copyText(c, M.stepOf(skill, "repark").title, again), skill.copy.repark_title_again);
  assert.ok(M.shownFields(c, M.stepOf(skill, "repark"), again)[0].options.list === "lid_when", "the same times, nothing taken away");
  assert.doesNotMatch(skill.copy.repark_title_again, /\d|times/);
});

test("the re-park heads-up after a flooded reopen that chose later", () => {
  const c = ctx();
  const F = ctx({ ctxIn: { band: "flooded" } });
  const LID = [pick("what", "lid"), next, pick("lid_pick", "tin"), next, shut, next, pick("lid_when", "tomorrow"), next];
  const r1 = M.resumeRun(F, M.runRecord(c, run(LID, c)), "reopen");
  const heads = run([pick("reopen", "open"), next], F, r1);
  assert.equal(heads.stepId, "re_heads");
  const parked = run([pick("re_heads", "later"), next], F, heads);
  assert.equal(parked.stepId, "repark");
  const r2 = M.resumeRun(c, M.runRecord(F, run([pick("repark", "few_days"), next], F, parked)), "reopen");
  const again = run([pick("reopen", "not_yet"), next], c, r2);
  assert.equal(M.copyText(c, M.stepOf(skill, "repark").title, again), skill.copy.repark_title_again);
});

test("level 3 is never a dead end, and nothing invites picturing: none doable now goes to the like rung", () => {
  const c = ctx({ profile: THINGS });
  const s = run([...LOOP, pick("warmth", "mine"), next], c);
  assert.equal(run([next], c, s).stepId, "to_like");
  assert.match(skill.copy.task_mine_hint, /doesn't hurt you/);
  assert.doesNotMatch(Object.values(skill.copy).join(" "), /\bpicture\b|\bimagine\b/i);
});

test("the ceiling words: every shame word in the graph, and grief and rejection's sadness words", () => {
  const parentOf = content.parentOf;
  const words = skill.steps.find((st) => st.id === "warmth").fields[0].options.where;
  const named = JSON.stringify(words);
  for (const w of ["inadequate", "inferior", "insignificant", "exposed", "let_down", "hurt", "despair", "rejected"]) assert.ok(named.includes(`"${w}"`), w);
  for (const w of ["anxious", "bored", "disappointed"]) assert.ok(!named.includes(`"${w}"`), w);
  assert.equal(parentOf.inadequate, "shame");
});

test("only warmth, like and good itself lead to the good or own rungs", () => {
  for (const st of skill.steps)
    for (const n of st.next ?? [])
      if (n.to === "to_good" || n.to === "to_mine") assert.ok(["warmth", "how_like", "how_good"].includes(st.id), `${st.id} → ${n.to}`);
});
