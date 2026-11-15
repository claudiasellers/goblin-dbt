// When it's a habit, part 2 (DT-09; docs/design/habit-plan.md): the weekly clear-mind check (DBT DT Handout 17:
// addict mind, clean mind, clear mind), booked on the plan and reopened from `clear_mind`, and the lapse plan shown
// under the urge tools' close after an acted yes on the same behaviour (the `abstinencePlans` slice, LapsePlanSlot).
// Tested through the same pure machine the player runs, and the pure slot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const L = await importTs("src/lib/lapseSlot.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
const skill = content.skills.find((s) => s.id === "habit_plan");
const embedOutputs = {
  doseTimer: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
  boundaryLine: { ids: ["copied"] },
};
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const read = { type: "embedDone", output: { ids: [] } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const offers = (s) => M.offersFor(ctx(), M.stepOf(skill, s.stepId), s).map((o) => o.exit?.id ?? o.id ?? o);
const title = (s) => M.copyText(ctx(), M.stepOf(skill, s.stepId).title, s);
const TO_WEEKLY = [pick("what", "gamble"), next, pick("span", "few_days"), next, pick("lapse", "tell"), pick("lapse", "recommit"), next,
  next, next, pick("build", "move"), next, next, read, pick("remind", "no"), next];

const booked = () => run([...TO_WEEKLY, pick("weekly", "week"), next, pick("keepit", "keep"), next]);
const reopened = () => M.resumeRun(ctx(), M.runRecord(ctx(), booked()), "clear");

test("the weekly check is offered on the plan: optional, its chip books clear_mind a week on", () => {
  const w = run(TO_WEEKLY);
  assert.equal(w.stepId, "weekly");
  const st = M.stepOf(skill, "weekly");
  assert.deepEqual(st.followUp, { type: "clear_mind", whenFrom: "weekly" });
  assert.equal(st.fields[0].required, false);
  assert.deepEqual(M.followUpFor(ctx(), st, run([pick("weekly", "week")], ctx(), w)), { type: "clear_mind", chip: "week" });
  assert.equal(M.followUpFor(ctx(), st, w), null, "skipping books nothing");
  assert.equal(run([next], ctx(), w).stepId, "keep");
  const t = spine.followUpTypes.find((x) => x.id === "clear_mind");
  assert.equal(t.deepLinkTemplate, "/tool/habit-plan?run={sourceSessionId}&at=clear&followUp={followUpId}");
  assert.deepEqual(Object.keys(t.window.chips), ["week"]);
  assert.equal(t.window.chips.week.days, 7);
  assert.doesNotMatch(`${t.copy.title} ${t.copy.body} ${t.notification}`, /drink|drug|gambl|habit|slip|plan/i, "never names the behaviour");
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /'clear_mind'/);
  assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), /clear_mind: 'habit-plan'/);
});

test("the card reopens at the check: signs of either mind, none is an answer, never a count", () => {
  const r = reopened();
  assert.equal(r.stepId, "clear");
  assert.deepEqual(M.stepOf(skill, "clear").reopens, { after: "weekly", again: ["clear_next"] });
  const minds = new Set(skill.options.mind_signs.map((o) => o.mind));
  assert.deepEqual([...minds].sort(), ["addict", "clean"]);
  assert.equal(M.stepOf(skill, "clear").fields[0].required, false);
  const none = run([next], ctx(), r);
  assert.equal(none.stepId, "clear_next");
  assert.equal(title(none), skill.copy.clear_clear);
  assert.doesNotMatch(Object.entries(skill.copy).filter(([k]) => k.startsWith("clear")).map(([, v]) => v).join(" "), /\d|times|score|streak|fail/i);
});

test("the week named by its loudest mind: addict first, then clean, then clear; each with its offers", () => {
  const r = reopened();
  const addict = run([pick("signs", "thinking"), pick("signs", "beaten"), next], ctx(), r);
  assert.equal(title(addict), skill.copy.clear_addict);
  const clean = run([pick("signs", "slide"), next], ctx(), r);
  assert.equal(title(clean), skill.copy.clear_clean);
  assert.deepEqual(offers(run([next], ctx(), addict)), ["urge_surfing", "pros_cons"]);
  assert.deepEqual(offers(run([next], ctx(), clean)), ["pros_cons"]);
  assert.deepEqual(offers(run([next, next], ctx(), r)), []);
});

test("I did it: the lapse plan they wrote first, then the week, then next week's check", () => {
  const r = reopened();
  const slip = run([pick("signs", "did_it"), next], ctx(), r);
  assert.equal(slip.stepId, "slipped_week");
  assert.equal(title(slip), skill.copy.slipped_title);
  assert.deepEqual(M.stepOf(skill, "slipped_week").props, { field: "lapse", shape: "list", next: "slipped_next" });
  const n = run([read], ctx(), slip);
  assert.equal(n.stepId, "clear_next");
  const st = M.stepOf(skill, "clear_next");
  assert.deepEqual(M.followUpFor(ctx(), st, run([pick("clear_next", "week")], ctx(), n)), { type: "clear_mind", chip: "week" });
  assert.equal(run([next], ctx(), n).stepId, "clear_end");
});

test("the next week's card reopens again with a clean slate", () => {
  const first = run([pick("signs", "did_it"), next, read, pick("clear_next", "week"), next], ctx(), reopened());
  const again = M.resumeRun(ctx(), M.runRecord(ctx(), first), "clear");
  assert.equal(again.stepId, "clear");
  assert.equal(again.answers.signs, undefined);
});

const habit = skill;
const plan = (whatIds, extra = {}) => ({ id: `p_${whatIds[0] ?? "own"}`, whatIds, lapseIds: ["tell", "kind"], lapseOwn: "Ring my sister", meta: {}, ...extra });

test("the lapse slot: an acted yes on the same behaviour shows their lapse plan, own words last", () => {
  const s = L.lapseSlotFor("pause", "yes", ["check"], [plan(["check"])], habit);
  assert.equal(s.title, habit.copy.slipped_title);
  assert.deepEqual(s.plans, [{ planId: "p_check", behaviour: null, items: ["Tell someone I trust", "Talk to myself like a friend would", "Ring my sister"] }]);
  assert.equal(s.afterUse, null);
  assert.ok(L.lapseSlotFor("urge-surfing", "partly", ["check"], [plan(["check"])], habit), "partly counts");
});

test("the lapse slot: use matches a substance or spending plan; drink and drugs carry the overdose line", () => {
  const s = L.lapseSlotFor("pause", "yes", ["use"], [plan(["drink"])], habit);
  assert.deepEqual(s.afterUse, { title: habit.copy.after_use_title, hint: habit.copy.after_use_hint });
  assert.equal(L.lapseSlotFor("pause", "yes", ["use"], [plan(["gamble"])], habit).afterUse, null);
  // One pull, several behaviours: each one's newest plan, under its behaviour, and the overdose line if any is a substance.
  const both = L.lapseSlotFor("pause", "yes", ["use"], [plan(["spend"]), plan(["drink"]), plan(["spend"], { id: "older" })], habit);
  assert.deepEqual(both.plans.map((p) => [p.planId, p.behaviour]), [["p_spend", "Spending or buying"], ["p_drink", "Drinking"]]);
  assert.ok(both.afterUse, "a drink plan among them: the overdose line");
  assert.match(readFileSync("src/components/spine/LapsePlanSlot.tsx", "utf8"), /<CrisisBanner compact variant="medical" \/>/, "with the emergency number");
});

test("the lapse slot stays away: held off, another tool, another behaviour, own-words plans, nothing kept", () => {
  assert.equal(L.lapseSlotFor("pause", "no", ["check"], [plan(["check"])], habit), null);
  assert.equal(L.lapseSlotFor("pause", "not_yet", ["check"], [plan(["check"])], habit), null);
  assert.equal(L.lapseSlotFor("cool-down", "yes", ["check"], [plan(["check"])], habit), null);
  assert.equal(L.lapseSlotFor("pause", "yes", ["send"], [plan(["check"])], habit), null);
  assert.equal(L.lapseSlotFor("pause", "yes", ["check"], [plan([], { whatOwn: "Checking his page" })], habit), null, "never guessed");
  assert.equal(L.lapseSlotFor("pause", "yes", ["self_harm"], [plan(["check"])], habit), null);
  assert.equal(L.lapseSlotFor("pause", "yes", ["check"], [], habit), null);
  assert.equal(L.lapseSlotFor("pause", "yes", [], [plan(["check"])], habit), null);
});

test("the slice and its readers: kind, PROFILE_NEEDS, and the close mounts the slot", () => {
  const kinds = readFileSync("functions/src/profile/kinds.ts", "utf8");
  assert.match(kinds, /kind: 'abstinence_plan', label: 'ProfileFact', rel: 'HAS_PROFILE_FACT', area: 'my_plans', slice: 'abstinencePlans'/);
  for (const f of ["functions/src/profile/types.ts", "src/data/profileTypes.ts"]) {
    const t = readFileSync(f, "utf8");
    assert.match(t, /'pause': \['parts', 'prosCons', 'abstinencePlans'\]/, f);
    assert.match(t, /'urge-surfing': \['parts', 'abstinencePlans'\]/, f);
  }
  const slices = readFileSync("functions/src/profile/slices.ts", "utf8");
  assert.match(slices, /abstinencePlans: `MATCH \(:User \{id: \$uid\}\)-\[:HAS_PROFILE_FACT\]->\(p:ProfileFact \{kind: 'abstinence_plan', status: 'active'\}\)/);
  const close = readFileSync("src/components/spine/SessionClose.tsx", "utf8");
  assert.match(close, /<LapsePlanSlot toolId=\{session\.toolId\} acted=\{closeActed\} urgeIds=\{session\.visitUrgeIds\(\)\} \/>/);
  assert.ok(close.indexOf("<LapsePlanSlot") < close.indexOf("<PartTagSlot"), "the lapse plan first after a slip");
  assert.doesNotMatch(slices.slice(slices.indexOf("abstinencePlans: async")), /^[\s\S]{0,800}whatOwn/, "own-words behaviours are never read");
});

test("the weekly check's I did it: drink, drugs or own words get the overdose line and the medical banner first", () => {
  const drink = run([pick("what", "drink"), next, next, pick("span", "few_days"), next, pick("lapse", "tell"), next, next, next, pick("build", "move"), next, next, read,
    pick("remind", "no"), next, pick("weekly", "week"), next, pick("keepit", "keep"), next]);
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), drink), "clear");
  assert.equal(r.stepId, "clear");
  const au = run([pick("signs", "did_it"), next], ctx(), r);
  assert.equal(au.stepId, "after_use_week");
  assert.deepEqual(M.stepOf(skill, "after_use_week").crisis, [{ variant: "medical", when: { all: [] } }]);
  assert.equal(title(au), skill.copy.after_use_title);
  assert.equal(run([next], ctx(), au).stepId, "slipped_week");
  // Gambling: straight to the lapse plan.
  assert.equal(run([pick("signs", "did_it"), next], ctx(), reopened()).stepId, "slipped_week");
});

test("the DBT names are DBT's, never a label; every sign can be picked", () => {
  for (const k of ["clear_addict", "clear_clean", "clear_clear"]) assert.match(skill.copy[k], /DBT calls that/);
  assert.equal(M.stepOf(skill, "clear").fields[0].max, skill.options.mind_signs.length);
});
