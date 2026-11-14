// Good things: moving a missed good thing to another day (ER-04; docs/design/good-things.md). *Not today* on either
// card asks *Want to try it another day?*: a day books the same card again (good_thing, or the slot's good_week card),
// skipping leaves it; the next card reopens the round with a clean slate. Tested through the pure machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
const skill = content.skills.find((s) => s.id === "good_things");
const embedOutputs = { holdRing: { ids: ["held", "partly", "skipped"], measures: ["durationSec"] }, orientFind: { ids: ["done", "partly", "skipped"], measures: ["doneCount"] } };
const ctx = () => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn: {}, embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const line = (s) => M.handoffLine(ctx(), M.stepOf(skill, s.stepId), s);

const booked = () => run([pick("start", "one"), next, pick("energy", "little"), next, pick("pick", skill.options.activity.find((o) => o.energy === "little").value), next,
  pick("when", "evening"), pick("remind", "yes"), next]);

test("level 1: not today → move it; a day books good_thing again; skipping leaves it", () => {
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), booked()), "back");
  const mv = run([pick("happened", "no"), next], ctx(), r);
  assert.equal(mv.stepId, "move");
  const st = M.stepOf(skill, "move");
  assert.equal(st.fields[0].required, false);
  assert.deepEqual(M.followUpFor(ctx(), st, run([pick("move", "day_after")], ctx(), mv)), { type: "good_thing", chip: "day_after" });
  assert.equal(M.followUpFor(ctx(), st, mv), null);
  const moved = run([pick("move", "tomorrow"), next], ctx(), mv);
  assert.equal(moved.stepId, "not_today");
  assert.equal(line(moved), skill.copy.move_line);
  assert.equal(line(run([next], ctx(), mv)), skill.copy.no_line, "left: the kind line, as before");
  // The moved card reopens the round again, asked fresh.
  const again = M.resumeRun(ctx(), M.runRecord(ctx(), moved), "back");
  assert.equal(again.stepId, "back");
  assert.equal(again.answers.happened, undefined);
  assert.equal(again.answers.move, undefined);
});

test("the week: not today on a slot's card books that slot's card again", () => {
  const planned = run([pick("start", "week"), next, pick("wk1", "walk"), pick("day1", "tomorrow"), pick("more1", "enough"), next,
    { type: "embedDone", output: { ids: ["held"], durationSec: 10 } }, next]);
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), planned), "back_w1");
  const mv = run([pick("hap1", "no"), next], ctx(), r);
  assert.equal(mv.stepId, "move_w1");
  const st = M.stepOf(skill, "move_w1");
  assert.deepEqual(M.followUpFor(ctx(), st, run([pick("mv1", "few_days")], ctx(), mv)), { type: "good_week_one", chip: "few_days" });
  assert.deepEqual(M.stepOf(skill, "back_w1").reopens, { after: "week_1", again: ["move_w1"] });
  const moved = run([pick("mv1", "few_days"), next], ctx(), mv);
  assert.equal(line(moved), skill.copy.move_line);
  assert.equal(M.resumeRun(ctx(), M.runRecord(ctx(), moved), "back_w1").stepId, "back_w1");
});

test("every move chip is a chip of both cards' windows; the copy never blames", () => {
  for (const id of ["good_thing", "good_week_one", "good_week_two", "good_week_three"]) {
    const t = spine.followUpTypes.find((x) => x.id === id);
    for (const o of skill.options.move) assert.ok(o.value in t.window.chips, `${id}: ${o.value}`);
  }
  assert.doesNotMatch(`${skill.copy.move_title} ${skill.copy.move_hint} ${skill.copy.move_line}`, /should|just|but|fail|!/i);
});
