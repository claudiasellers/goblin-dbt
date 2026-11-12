// Running low (PRD ER-07, DBT ER Handout 20 PLEASE; docs/design/running-low.md) on the skill runtime: five rows one
// tap each, words only and every one skippable; the loudest row named in a fixed order (the body first); one fix
// for today from the fixes for what was picked, plus *shrink today* always; now or later, with an optional evening
// check (please_fix) that reopens the run at *Did the fix happen?*; nothing loud → no fix, Find the feeling; a
// carried flooded reading offers settling first without locking anything. Tested through the pure machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
const skill = content.skills.find((s) => s.id === "please_skill");
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);

const ROWS = ["sleep", "food", "body", "subs", "moved"];
const CALM = { sleep: "sleep_enough", food: "food_regular", body: "body_okay", subs: "subs_none", moved: "moved_yes" };
const rows = (over = {}) => ROWS.flatMap((r) => [pick(r, over[r] ?? CALM[r]), next]);
const fixValues = (s) => M.optionGroups(ctx(), M.stepOf(skill, "fix").fields[0], s.answers).flatMap((g) => g.options.map((o) => o.value));
const title = (s, step = "fix") => M.copyText(ctx(), M.stepOf(skill, step).title, s);
const line = (s) => M.handoffLine(ctx(), M.stepOf(skill, s.stepId), s);

test("the skill: tool please-skill, five rows in the PRD's order, no close question, listed under Emotion Regulation", () => {
  assert.equal(skill.toolId, "please-skill");
  assert.equal(skill.start, "sleep");
  assert.deepEqual(skill.steps.slice(0, 5).map((s) => s.id), ROWS);
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'please-skill': \{ module: 'er', closeKind: 'none' \}/);
  assert.match(readFileSync("src/lib/spine/close.ts", "utf8"), /'please-skill': \{ module: 'er', closeKind: 'none' \}/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'please-skill',\n\s+name: 'Running Low',[\s\S]*?module: 'emotion-regulation'/);
  assert.match(tools, /toolId: 'please-skill'/, "an intent opens it from the Tools page");
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'please-skill': 'please_skill'/);
});

test("every row is one tap and can be skipped: nothing is required, Next always goes on", () => {
  let s = M.initialRun(skill);
  for (const r of ROWS) {
    assert.equal(s.stepId, r);
    assert.ok(M.stepOf(skill, r).fields.every((f) => !f.required && f.max === 1), r);
    assert.equal(M.canGoOn(ctx(), s), true, `${r}: Next goes on without an answer`);
    s = M.runNext(ctx(), s, next);
  }
  assert.equal(s.stepId, "none", "all skipped: nothing loud");
});

test("words only: no hours, amounts, calories, weight or scales; food is ED-safe; substances can go unsaid", () => {
  const labels = ROWS.flatMap((r) => skill.options[r].map((o) => o.label));
  const all = [...labels, ...Object.values(skill.copy)].join(" | ");
  assert.doesNotMatch(all, /\b\d+\s*(h|hrs?|hours?)\b|calorie|weigh|kg|lbs|portion|units?\b|out of 10|rate/i);
  assert.doesNotMatch(skill.options.food.map((o) => o.label).join(" "), /too much|overeat|binge|junk|healthy|\bbad\b/i);
  assert.ok(skill.options.subs.some((o) => o.value === "subs_rather_not"), "rather not say is a complete answer");
  assert.ok(skill.options.food.some((o) => o.value === "food_unsure"));
  // Rather not say and not sure never turn the volume up.
  for (const v of ["subs_rather_not", "food_unsure", "sleep_unsure"]) {
    const r = v.split("_")[0];
    assert.equal(run(rows({ [r]: v })).stepId, "none", v);
  }
});

test("the readout names the loudest row in a fixed order: the body, sleep, food, last night, moving", () => {
  const cases = [
    [{ moved: "moved_not_yet" }, "vol_moved"],
    [{ subs: "subs_some", moved: "moved_not_yet" }, "vol_subs"],
    [{ food: "food_skipped", subs: "subs_some" }, "vol_food"],
    [{ sleep: "sleep_short", food: "food_skipped" }, "vol_sleep"],
    [{ sleep: "sleep_broken", body: "body_meds" }, "vol_body"],
  ];
  for (const [over, key] of cases) {
    const s = run(rows(over));
    assert.equal(s.stepId, "fix", key);
    assert.equal(title(s), skill.copy[key], key);
  }
});

test("one fix for today: only the fixes for what was picked, plus shrink today always; own words count", () => {
  const sleep = run(rows({ sleep: "sleep_short" }));
  assert.deepEqual(fixValues(sleep), ["fix_water", "fix_lie_down", "fix_one_thing"]);
  const pain = run(rows({ body: "body_pain" }));
  assert.deepEqual(fixValues(pain), ["fix_usual", "fix_sit", "fix_one_thing"]);
  const meds = run(rows({ body: "body_meds" }));
  assert.deepEqual(fixValues(meds), ["fix_meds", "fix_one_thing"], "medication: only what's already prescribed");
  assert.match(skill.options.fix.find((o) => o.value === "fix_meds").label, /as prescribed/);
  // Several loud rows: every loud row's fixes, each once.
  const many = fixValues(run(rows({ food: "food_skipped", moved: "moved_not_yet" })));
  assert.deepEqual(many, ["fix_protein", "fix_water", "fix_daylight", "fix_move", "fix_one_thing"]);
  // A calm answer never offers a fix of its own (sleep_enough is on no list).
  for (const o of skill.options.fix) assert.ok(o.on.every((x) => x === "always" || ROWS.some((r) => skill.options[r].some((y) => y.value === x))), o.value);
  // Required: one pick or own words.
  assert.equal(M.canGoOn(ctx(), sleep), false);
  assert.equal(M.canGoOn(ctx(), run([pick("fix", "fix_water")], ctx(), sleep)), true);
  const mine = run([own("fix", "Ask for a lift home"), next], ctx(), sleep);
  assert.equal(mine.stepId, "when");
});

test("tired or heavy: sleep or moving loud offers a quiet link to Find the feeling on the fix screen", () => {
  const f = M.stepOf(skill, "fix").fields[0];
  const ids = (s) => M.fieldLinks(ctx(), f, s).map((l) => l.exit.id);
  assert.deepEqual(ids(run(rows({ sleep: "sleep_much" }))), ["find_the_feeling"]);
  assert.deepEqual(ids(run(rows({ moved: "moved_not_yet" }))), ["find_the_feeling"]);
  assert.deepEqual(ids(run(rows({ food: "food_skipped" }))), []);
});

test("now: the set card says why it counts; later without the chip: on for later, no card scheduled", () => {
  const atWhen = run([...rows({ food: "food_skipped" }), pick("fix", "fix_protein"), next]);
  assert.equal(atWhen.stepId, "when");
  assert.deepEqual(M.shownFields(ctx(), M.stepOf(skill, "when"), atWhen).map((f) => f.id), ["when"], "the evening chip waits for Later");
  const now = run([pick("when", "now"), next], ctx(), atWhen);
  assert.equal(now.stepId, "set");
  assert.equal(line(now), skill.copy.set_now);
  assert.equal(M.followUpFor(ctx(), M.stepOf(skill, "when"), run([pick("when", "now")], ctx(), atWhen)), null);
  const later = run([pick("when", "later")], ctx(), atWhen);
  assert.deepEqual(M.shownFields(ctx(), M.stepOf(skill, "when"), later).map((f) => f.id), ["when", "remind"]);
  assert.equal(M.followUpFor(ctx(), M.stepOf(skill, "when"), later), null, "no chip, no card");
  assert.equal(line(run([next], ctx(), later)), skill.copy.set_later);
  assert.deepEqual(run([next], ctx(), later).offered, [], "Sleep reset only when sleep was loud (and planned)");
});

test("the evening check: the chip schedules please_fix, whose card reopens the run at Did the fix happen?", () => {
  const atWhen = run([...rows({ sleep: "sleep_short" }), pick("fix", "fix_lie_down"), next]);
  const s = run([pick("when", "later"), pick("remind", "evening")], ctx(), atWhen);
  assert.deepEqual(M.followUpFor(ctx(), M.stepOf(skill, "when"), s), { type: "please_fix", chip: "evening" });
  const set = run([next], ctx(), s);
  assert.equal(line(set), skill.copy.set_remind);
  const ft = spine.followUpTypes.find((x) => x.id === "please_fix");
  assert.ok(ft && ft.enabled);
  assert.equal(ft.deepLinkTemplate, "/tool/please-skill?run={sourceSessionId}&at=back&followUp={followUpId}");
  assert.deepEqual(Object.keys(ft.window.chips), skill.options.remind.map((o) => o.value));
  assert.ok(ft.staleAfterHours <= 24, "about today only");
  const rec = M.runRecord(ctx(), { ...set, scheduled: { when: { type: "please_fix", id: "f1" } } });
  for (const [v, key] of [["done_yes", "back_yes"], ["done_partly", "back_partly"], ["done_no", "back_no"]]) {
    const r = M.resumeRun(ctx(), rec, "back");
    assert.equal(r?.stepId, "back");
    assert.equal(M.canGoOn(ctx(), r), false);
    const end = run([pick("happened", v), next], ctx(), r);
    assert.equal(end.stepId, "back_end");
    assert.equal(line(end), skill.copy[key]);
    assert.equal(M.stepOf(skill, "back_end").noClose, true);
  }
  // Only a run that reached `when` reopens there.
  assert.equal(M.resumeRun(ctx(), M.runRecord(ctx(), run(rows({ sleep: "sleep_short" }))), "back")?.stepId === "back", false);
  // The server side: opening the card resolves it, and it belongs to this tool.
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /OPEN_RESOLVES = \[[^\]]*'please_fix'/);
  assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), /please_fix: 'please-skill'/);
});

test("nothing loud: no fix, a line that it may be a feeling, Find the feeling and Done", () => {
  const s = run(rows());
  assert.equal(s.stepId, "none");
  assert.equal(line(s), skill.copy.none_line);
  assert.deepEqual(s.offered, ["find_the_feeling"]);
  assert.equal(M.stepOf(skill, "none").done, "done");
});

test("sleep loud: Sleep reset is written as a planned exit, never offered until ER-13 ships", () => {
  const s = run([...rows({ sleep: "sleep_broken" }), pick("fix", "fix_daylight"), next, pick("when", "now"), next]);
  assert.equal(s.stepId, "set");
  assert.deepEqual(s.offered, []);
  assert.ok(skill.exits.find((x) => x.id === "sleep_reset").planned);
});

test("a carried flooded reading offers settling the body first; going on is the default", () => {
  const f = M.stepOf(skill, "sleep").fields[0];
  const s = M.initialRun(skill);
  assert.deepEqual(M.fieldLinks(ctx({ band: "flooded" }), f, s).map((l) => [l.exit.toolId, l.label]), [["cool-down", skill.copy.settle_first]]);
  assert.deepEqual(M.fieldLinks(ctx({ band: "stirred" }), f, s), []);
  assert.deepEqual(M.fieldLinks(ctx(), f, s), []);
  assert.equal(M.runNext(ctx({ band: "flooded" }), s, next).stepId, "food", "nothing locks");
});

test("connected: Low drive's check-in result leads with Running low; It isn't working, Let it be and Problem Solve open it", () => {
  const graph = JSON.parse(readFileSync("tests/fixtures/recommendation-graph.json", "utf8"));
  const row = graph.recommendedFor.find((r) => r.id === "rf_reward_drive_low_default_please-skill");
  assert.ok(row && row.active && row.reviewStatus === "approved");
  assert.equal(graph.concepts.dbt_please.appToolId, "please-skill");
  for (const id of ["er_troubleshoot", "let_it_be", "problem_solve"]) {
    const ex = content.skills.find((s) => s.id === id).exits.find((x) => x.toolId === "please-skill");
    assert.ok(ex && !ex.planned, id);
  }
});
