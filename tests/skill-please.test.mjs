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
const embedOutputs = { batteryRead: { ids: ["read"] } };
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const read = { type: "embedDone", output: { ids: ["read"] } };

const ROWS = ["sleep", "food", "body", "subs", "moved"];
const CALM = { sleep: "sleep_enough", food: "food_regular", body: "body_okay", subs: "subs_none", moved: "moved_yes" };
const rows = (over = {}) => ROWS.flatMap((r) => [pick(r, over[r] ?? CALM[r]), next]);
// The five rows, then the readout screen when something was loud: lands on the fix.
const toFix = (over) => [...rows(over), read];
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

test("the readout: the battery screen names the loudest row in a fixed order (body, sleep, food, last night, moving), then the fix", () => {
  const cases = [
    [{ moved: "moved_not_yet" }, "vol_moved"],
    [{ subs: "subs_some", moved: "moved_not_yet" }, "vol_subs"],
    [{ food: "food_skipped", subs: "subs_some" }, "vol_food"],
    [{ sleep: "sleep_short", food: "food_skipped" }, "vol_sleep"],
    [{ sleep: "sleep_broken", body: "body_meds" }, "vol_body"],
  ];
  for (const [over, key] of cases) {
    const s = run(rows(over));
    const row = key.slice(4);
    assert.equal(s.stepId, `read_${row}`, key);
    const step = M.stepOf(skill, s.stepId);
    assert.equal(step.embed, "batteryRead");
    assert.equal(title(s, s.stepId), skill.copy[key], key);
    assert.equal(step.props.low, row, "the loudest row's cell drains");
    assert.deepEqual(step.props.fields, ROWS);
    assert.equal(skill.copy[step.props.names].split(" · ").length, ROWS.length, "one name per cell");
    const f = run([read], ctx(), s);
    assert.equal(f.stepId, "fix");
    assert.equal(title(f), "One thing for today");
  }
});

test("one fix for today: the loudest row's fixes only (two or three), plus shrink today always; own words count", () => {
  const sleep = run(toFix({ sleep: "sleep_short" }));
  assert.deepEqual(fixValues(sleep), ["fix_water", "fix_rest", "fix_one_thing"]);
  assert.deepEqual(fixValues(run(toFix({ sleep: "sleep_broken" }))), ["fix_daylight", "fix_one_thing"], "no daytime nap for broken sleep");
  const pain = run(toFix({ body: "body_pain" }));
  assert.deepEqual(fixValues(pain), ["fix_usual", "fix_sit", "fix_one_thing"]);
  const meds = run(toFix({ body: "body_meds" }));
  assert.deepEqual(fixValues(meds), ["fix_meds", "fix_one_thing"]);
  assert.match(skill.options.fix.find((o) => o.value === "fix_meds").label, /label, or ask a pharmacist/, "a missed dose: never take it now");
  // Several loud rows: only the loudest row's, so the screen stays short.
  const many = fixValues(run(toFix({ food: "food_skipped", moved: "moved_not_yet" })));
  assert.deepEqual(many, ["fix_snack", "fix_water", "fix_one_thing"]);
  // Every loud answer, alone and in the worst case: at most three fixes before shrink today.
  for (const r of ROWS) for (const v of skill.options[r].map((o) => o.value)) {
    const n = fixValues(run(toFix({ [r]: v }))).length;
    if (run(rows({ [r]: v })).stepId !== "none") assert.ok(n >= 2 && n <= 4, `${v}: ${n}`);
  }
  const worst = fixValues(run(toFix({ sleep: "sleep_broken", food: "food_all_over", body: "body_ill", subs: "subs_some", moved: "moved_not_yet" })));
  assert.deepEqual(worst, ["fix_water", "fix_sick_care", "fix_one_thing"], "the body first: never a walk when ill or in pain");
  // Ill or in pain: the quiet doctor-or-pharmacist line, never a gate.
  const care = (s) => M.handoffLine(ctx(), M.stepOf(skill, "fix"), s);
  assert.equal(care(run(toFix({ body: "body_ill" }))), skill.copy.fix_care);
  assert.equal(care(pain), skill.copy.fix_care);
  assert.equal(care(meds), null);
  assert.equal(care(sleep), null);
  // Food is regular eating: no nutrient, size or "proper".
  assert.doesNotMatch(skill.options.fix.map((o) => o.label).join(" | "), /protein|proper|small one|calorie|portion/i);
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
  assert.deepEqual(ids(run(toFix({ sleep: "sleep_much" }))), ["find_the_feeling"]);
  assert.deepEqual(ids(run(toFix({ moved: "moved_not_yet" }))), ["find_the_feeling"]);
  assert.deepEqual(ids(run(toFix({ food: "food_skipped" }))), []);
});

test("now: the set card says why it counts; later without the chip: on for later, no card scheduled", () => {
  const atWhen = run([...toFix({ food: "food_skipped" }), pick("fix", "fix_snack"), next]);
  assert.equal(atWhen.stepId, "when");
  assert.deepEqual(M.shownFields(ctx(), M.stepOf(skill, "when"), atWhen).map((f) => f.id), ["when"], "the evening chip waits for Later");
  const now = run([pick("when", "now"), next], ctx(), atWhen);
  assert.equal(now.stepId, "set");
  assert.equal(line(now), skill.copy.set_now);
  assert.equal(M.copyText(ctx(), M.stepOf(skill, "set").title, now, M.titleSlots(ctx(), M.stepOf(skill, "set"), now)),
    "Your one thing for today: Something to eat in the next hour, whatever's easy", "the end card holds the fix");
  const mine = run([own("fix", "Ask for a lift home"), next, pick("when", "now"), next], ctx(), run(toFix({ food: "food_skipped" })));
  assert.equal(M.copyText(ctx(), M.stepOf(skill, "set").title, mine, M.titleSlots(ctx(), M.stepOf(skill, "set"), mine)), "Your one thing for today: Ask for a lift home");
  assert.equal(M.followUpFor(ctx(), M.stepOf(skill, "when"), run([pick("when", "now")], ctx(), atWhen)), null);
  const later = run([pick("when", "later")], ctx(), atWhen);
  assert.deepEqual(M.shownFields(ctx(), M.stepOf(skill, "when"), later).map((f) => f.id), ["when", "remind"]);
  assert.equal(M.followUpFor(ctx(), M.stepOf(skill, "when"), later), null, "no chip, no card");
  assert.equal(line(run([next], ctx(), later)), skill.copy.set_later);
  assert.deepEqual(run([next], ctx(), later).offered, [], "Sleep reset only when sleep was loud (and planned)");
});

test("the evening check: the chip schedules please_fix, whose card reopens the run at Did the fix happen?", () => {
  const atWhen = run([...toFix({ sleep: "sleep_short" }), pick("fix", "fix_rest"), next]);
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
    assert.match(M.copyText(ctx(), M.stepOf(skill, "back").title, r, M.titleSlots(ctx(), M.stepOf(skill, "back"), r)), /^Did it happen\? A short rest/, "the card names the fix");
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
  const s = run([...toFix({ sleep: "sleep_broken" }), pick("fix", "fix_daylight"), next, pick("when", "now"), next]);
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

test("rows left out in Me: each row's transitions skip them, the readout leaves them out; sleep is always asked", () => {
  const c = (hidden) => ({ ...ctx(), profile: { pleaseRows: hidden } });
  // Food and alcohol or drugs left out: sleep, body, moving, then the readout.
  let s = M.initialRun(skill);
  const seen = [];
  for (let i = 0; i < 3; i++) { seen.push(s.stepId); s = M.runNext(c(["food", "subs"]), s, next); }
  assert.deepEqual(seen, ["sleep", "body", "moved"]);
  assert.equal(s.stepId, "none", "nothing loud");
  // The last rows left out: the readout follows the last row asked.
  s = run([pick("sleep", "sleep_short"), next, pick("food", "food_regular"), next], c(["body", "subs", "moved"]));
  assert.equal(s.stepId, "read_sleep");
  // While the profile loads (null) or signed out, nothing is hidden: every row is asked.
  assert.equal(M.runNext({ ...ctx(), profile: null }, M.initialRun(skill), next).stepId, "food");
  assert.equal(M.runNext(ctx(), M.initialRun(skill), next).stepId, "food");
  for (const f of ["sleep", "food", "body", "subs"]) {
    assert.ok(skill.steps.find((x) => x.id === f).next.some((t) => JSON.stringify(t.when ?? {}).includes('"$p.pleaseRows"')), f);
  }
  assert.ok(skill.steps.filter((x) => x.embed === "batteryRead").every((x) => x.props.hidden === "pleaseRows"));
  const battery = readFileSync("src/components/skillPlayer/BatteryRead.tsx", "utf8");
  assert.match(battery, /\.filter\(\(c\) => !hidden\.has\(c\.id\)\)/, "a left-out row gets no cell");
});

test("the setting: kind please_rows in My body, one per person, the four rows but sleep; the slice for please-skill only", async () => {
  const kinds = readFileSync("functions/src/profile/kinds.ts", "utf8");
  assert.match(kinds, /export const PLEASE_HIDEABLE_ROWS = \['food', 'body', 'subs', 'moved'\] as const;/);
  assert.match(kinds, /please_rows: \{\n\s+kind: 'please_rows', label: 'ProfileFact', rel: 'HAS_PROFILE_FACT', area: 'my_body', slice: 'pleaseRows',\n\s+owner: 'ER', many: false, maxItems: 1, editor: 'please_rows', ownFields: \[\],/);
  const lib = await importTs("src/lib/pleaseRows.ts");
  assert.deepEqual([...lib.PLEASE_HIDEABLE_ROWS], ["food", "body", "subs", "moved"]);
  assert.match(readFileSync("scripts/skills/please_skill.py", "utf8"), /HIDEABLE = \["food", "body", "subs", "moved"\]/);
  assert.deepEqual(lib.pleaseRowsOf({ hidden: ["subs", "sleep", "food", 3] }), ["food", "subs"], "known rows only, in row order");
  assert.deepEqual(lib.pleaseRowsOf(null), []);
  assert.deepEqual(Object.values(lib.PLEASE_ROWS_COPY.names), ["Food", "Body", "Alcohol or drugs", "Moving"]);
  const editor = readFileSync("src/components/me/PleaseRows.tsx", "utf8");
  assert.doesNotMatch(editor, /getSkillsContent/, "Me never loads the skill catalogue for four labels");
  assert.match(editor, /hidden\.includes\('body'\) && <p[^>]*>\{C\.body\}/, "leaving out Body says what it takes away");
  assert.match(editor, /disabled=\{saving \|\| \(fresh && hidden\.length === 0\)\}/, "an empty setting is never kept");
  assert.match(lib.PLEASE_ROWS_COPY.body, /pain or missed meds/);
  const player = readFileSync("src/components/skillPlayer/SkillPlayer.tsx", "utf8");
  assert.match(player, /const waitsOnProfile = !profileSettled && step\.next\.some\(\(t\) => JSON\.stringify\(t\.when \?\? null\)\.includes\('"\$p\.'\)\);/,
    "Next waits for the profile on a step whose way on reads it: a quick tap can't take a left-out row");
  const types = await importTs("functions/src/profile/types.ts");
  assert.deepEqual([...types.PROFILE_NEEDS["please-skill"]], ["pleaseRows"]);
  for (const [consumer, needs] of Object.entries(types.PROFILE_NEEDS)) {
    if (consumer !== "please-skill") assert.ok(!needs.includes("pleaseRows"), consumer);
  }
  assert.match(readFileSync("functions/src/profile/slices.ts", "utf8"), /pleaseRows: `MATCH \(:User \{id: \$uid\}\)-\[:HAS_PROFILE_FACT\]->\(p:ProfileFact \{kind: 'please_rows', status: 'active'\}\)/);
  assert.match(readFileSync("scripts/profile-layer/content.py", "utf8"), /\("please_rows", "my_body", "Left out of Running low", None,/);
  const me = readFileSync("src/components/me/MeSection.tsx", "utf8");
  assert.match(me, /keepProfileItem\(\{ kind: 'please_rows', value: \{ hidden \} \}\)/);
  assert.match(me, /<PleaseRowsNew onSave=\{keepPleaseRows\} \/>/);
});
