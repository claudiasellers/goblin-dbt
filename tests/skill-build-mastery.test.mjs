// Build mastery (PRD ER-11, DBT ER Handout 19; docs/design/build-mastery.md) on the skill runtime: an area, one step
// from its three-rung ladder (a stretch you can manage today), when, and the mastery_step card that reopens the run
// at *How did it go?*: done or partly → the I can list on a yes and the next one up; not yet → a smaller one. The
// `i_can` kind. Tested through the pure machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "build_mastery");
const ctx = (ctxIn = {}, profile = null) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs: {}, profile });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const title = (s, c = ctx()) => M.copyText(c, M.stepOf(skill, s.stepId).title, s, M.titleSlots(c, M.stepOf(skill, s.stepId), s));
const line = (s, c = ctx()) => M.handoffLine(c, M.stepOf(skill, s.stepId), s);
const values = (s, fieldId, c = ctx()) => {
  const f = M.stepOf(skill, s.stepId).fields.find((x) => x.id === fieldId);
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s);
const booked = (rung, c = ctx()) => run([pick("area", "admin"), next, pick("rung", rung), next, pick("when", "tomorrow"), pick("remind", "yes"), next], c);
const reopen = (s, c = ctx()) => M.resumeRun(c, M.runRecord(c, s), "back");

test("the skill: tool build-mastery, concept dbt_build_mastery, no close question, listed under Emotion Regulation", () => {
  assert.equal(skill.toolId, "build-mastery");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_build_mastery"\}\), \(s:Skill \{id: "build_mastery"\}\)/);
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'build-mastery': \{ module: 'er', closeKind: 'none' \}/);
  assert.match(readFileSync("src/lib/spine/close.ts", "utf8"), /'build-mastery': \{ module: 'er', closeKind: 'none' \}/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'build-mastery',\n\s+name: 'Build Mastery',[\s\S]*?module: 'emotion-regulation'/);
  assert.match(tools, /label: 'Get one thing done', toolId: 'build-mastery'/, "the PRD's Tools intent");
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'build-mastery': 'build_mastery'/);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_build_mastery", t: "build-mastery"\}/);
  // Problem Solve's links to it (confidence answers, companions, two solution directions) are built now.
  const ps = content.skills.find((s) => s.id === "problem_solve").exits.find((e) => e.toolId === "build-mastery");
  assert.ok(ps && !ps.planned, "Problem Solve's build-mastery link resolves");
});

test("an area, then that area's three rungs, easier to harder; own words always", () => {
  const s = M.initialRun(skill);
  assert.equal(title(s), "Get one thing done.");
  assert.deepEqual(values(s, "area"), ["body", "home", "making", "learning", "work", "caring", "admin"]);
  const r = run([pick("area", "admin"), next]);
  assert.equal(r.stepId, "rung");
  assert.deepEqual(values(r, "rung"), ["admin_1", "admin_2", "admin_3"]);
  assert.deepEqual(skill.options.rung.filter((o) => o.area === "admin").map((o) => o.label), ["Open one letter", "Reply to one email", "Sort one pile"], "the PRD's admin ladder");
  assert.match(skill.copy.rung_hint, /Smaller is still mastery/);
  for (const area of values(s, "area")) assert.deepEqual(skill.options.rung.filter((o) => o.area === area).map((o) => o.rung), [1, 2, 3], area);
  // An area in their own words: three general rungs, or their own step; the area is named on the card so "it" keeps
  // its meaning.
  const typed = run([own("area", "the garden"), next]);
  assert.deepEqual(values(typed, "rung"), ["own_1", "own_2", "own_3"]);
  const set = run([pick("rung", "own_1"), next, pick("when", "today"), pick("remind", "yes"), next], ctx(), typed);
  assert.equal(title(set), "Your step for the garden: Spend five minutes on it.");
  assert.equal(title(reopen(set)), "Earlier you picked: Spend five minutes on it, for the garden.");
  // Competence, not fitness; caring only for someone safe; time-boxed tops (clinical gate).
  const labels = (area) => skill.options.rung.filter((o) => o.area === area).map((o) => o.label).join(" | ");
  assert.doesNotMatch(labels("body"), /walk|active|exercise|run/i);
  assert.match(labels("caring"), /someone safe/);
  assert.doesNotMatch(labels("home") + labels("making"), /whole|something new/);
  assert.equal(skill.options.area.find((o) => o.value === "caring").label, "Caring for someone or something");
});

test("when, and the card: done beats done well; ask me books mastery_step", () => {
  const w = run([pick("area", "admin"), next, pick("rung", "admin_2"), next]);
  assert.equal(w.stepId, "when");
  assert.deepEqual(values(w, "when"), ["today", "tomorrow", "few_days"]);
  const set = booked("admin_2");
  assert.equal(set.stepId, "set");
  assert.equal(title(set), "Your step: Reply to one email.");
  assert.match(line(set), /^I'll ask how it went/);
  assert.match(skill.copy.set_line, /Done beats done well/, "perfectionism (PRD risks)");
  const asked = run([pick("when", "few_days"), pick("remind", "yes")], ctx(), w);
  assert.deepEqual(M.followUpFor(ctx(), M.stepOf(skill, "when"), asked), { type: "mastery_step", chip: "few_days" });
  assert.equal(M.followUpFor(ctx(), M.stepOf(skill, "when"), run([pick("when", "few_days"), pick("remind", "no")], ctx(), w)), null);
});

test("mastery_step: registered, content-free, reopens at back", () => {
  const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8"));
  const t = spine.content.followUpTypes.find((x) => x.id === "mastery_step");
  assert.equal(t.deepLinkTemplate, "/tool/build-mastery?run={sourceSessionId}&at=back&followUp={followUpId}");
  assert.deepEqual(Object.keys(t.window.chips).sort(), skill.options.when.map((o) => o.value).sort(), "each when is a chip");
  assert.doesNotMatch(JSON.stringify(t.copy), /letter|email|admin|rung/i, "never names the step");
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /OPEN_RESOLVES = \[[^\]]*'mastery_step'/);
  assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), /mastery_step: 'build-mastery'/);
  assert.match(readFileSync("schema/practice-spine.cypher", "utf8"), /MERGE \(t:FollowUpType \{id: "mastery_step"\}\)/);
  assert.deepEqual(M.stepOf(skill, "back").reopens, { after: "when" });
  const r = reopen(booked("admin_2"));
  assert.equal(title(r), "Earlier you picked: Reply to one email.");
  assert.deepEqual(values(r, "happened"), ["done", "partly", "not_yet"]);
});

test("done or partly: the I can list on a yes, then the next one up (never past the top), the same, or enough", () => {
  const r = reopen(booked("admin_2"));
  const done = run([pick("happened", "done"), next], ctx(), r);
  assert.equal(done.stepId, "back_done");
  assert.equal(title(done), "You did it.");
  assert.equal(title(run([pick("happened", "partly"), next], ctx(), r)), "Part of it counts.");
  assert.deepEqual(values(done, "then"), ["same", "up", "rest"], "no rush to go up: the same again first");
  // Partly: the same or a smaller one, never up.
  assert.deepEqual(values(run([pick("happened", "partly"), next], ctx(), r), "then"), ["same", "smaller", "rest"]);
  const step = M.stepOf(skill, "back_done");
  const yes = run([pick("ican", "yes"), pick("then", "rest")], ctx(), done);
  assert.deepEqual((({ kind, value }) => ({ kind, value }))(M.keepFor(ctx(), step, yes)), { kind: "i_can", value: { areaIds: ["admin"], rungIds: ["admin_2"] } });
  assert.equal(M.keepFor(ctx(), step, run([pick("ican", "no"), pick("then", "rest")], ctx(), done)), null, "kept only on a yes");
  const end = run([next], ctx(), yes);
  assert.equal(end.stepId, "back_end");
  assert.match(line(end), /I can\u201d list in Me/);
  assert.match(line(run([pick("ican", "no"), pick("then", "rest"), next], ctx(), done)), /^That's done for now/);
  // Up: back to the ladder, last time's rung cleared, so the person picks afresh.
  const up = run([pick("ican", "no"), pick("then", "up"), next], ctx(), done);
  assert.equal(up.stepId, "rung");
  assert.equal(title(up), "Pick the next one up.");
  assert.equal(up.answers.rung, undefined);
  assert.deepEqual(values(up, "rung"), ["admin_1", "admin_2", "admin_3"]);
  const again = run([pick("rung", "admin_3"), next, pick("when", "tomorrow"), pick("remind", "yes")], ctx(), up);
  assert.deepEqual(M.followUpFor(ctx(), M.stepOf(skill, "when"), again), { type: "mastery_step", chip: "tomorrow" }, "the next rung books its own card");
  // The same again: straight to when, the step kept.
  const same = run([pick("ican", "no"), pick("then", "same"), next], ctx(), done);
  assert.equal(same.stepId, "when");
  assert.deepEqual(same.answers.rung.ids, ["admin_2"]);
  // From the top rung there's no next one up.
  const top = run([pick("happened", "done"), next], ctx(), reopen(booked("admin_3")));
  assert.deepEqual(values(top, "then"), ["same", "rest"]);
  // A ladder step already on the I can list isn't offered for keeping again (the list never reads as a count).
  const ic = ctx({}, { iCanRungs: [{ id: "admin_2" }] });
  const again2 = run([pick("happened", "done"), next], ic, reopen(booked("admin_2", ic), ic));
  const ican = M.stepOf(skill, "back_done").fields.find((f) => f.id === "ican");
  assert.deepEqual(ican.showWhen, { not: { has: ["$p.iCanRungs.ids", "$a.rung"] } });
  assert.equal(M.keepFor(ic, M.stepOf(skill, "back_done"), run([pick("then", "rest")], ic, again2)), null);
  for (const p of ["functions/src/profile/types.ts", "src/data/profileTypes.ts"]) {
    assert.match(readFileSync(p, "utf8"), /'build-mastery': \['iCanRungs'\]/, p);
  }
  // An own-words area's general rungs mean something different per area, so the slice never lists them.
  assert.match(readFileSync("functions/src/profile/slices.ts", "utf8"), /if \(!id\.startsWith\('own_'\)\) ids\.add\(id\)/);
  // Up with a carried flooded reading: the heads-up first, as on a first visit.
  const fc = ctx({ band: "flooded" });
  const fl = run([pick("happened", "done"), next, pick("then", "up"), next], fc, reopen(booked("admin_2")));
  assert.equal(fl.stepId, "heads_up");
});

test("not yet: a real answer; a smaller one (never below the bottom), the same again, or not now", () => {
  const r = reopen(booked("admin_2"));
  const no = run([pick("happened", "not_yet"), next], ctx(), r);
  assert.equal(no.stepId, "back_not");
  assert.equal(title(no), "Not yet is a real answer.");
  assert.match(skill.copy.not_hint, /Smaller is still mastery/);
  assert.deepEqual(values(no, "again"), ["smaller", "same", "stuck", "not_now"]);
  assert.match(skill.copy.not_hint, /Neither is a failing/);
  const smaller = run([pick("again", "smaller"), next], ctx(), no);
  assert.equal(smaller.stepId, "rung");
  assert.equal(title(smaller), "Pick a smaller one.");
  // Something keeps getting in the way: Problem Solve (the stand-in for "not yet twice" until part 2).
  const stuck = run([pick("again", "stuck"), next], ctx(), no);
  assert.equal(stuck.stepId, "back_stuck");
  assert.deepEqual(offers(stuck), ["problem_solve"]);
  assert.equal(run([pick("again", "same"), next], ctx(), no).stepId, "when");
  const later = run([pick("again", "not_now"), next], ctx(), no);
  assert.equal(later.stepId, "back_end");
  assert.match(line(later), /^It'll keep/);
  const bottom = run([pick("happened", "not_yet"), next], ctx(), reopen(booked("admin_1")));
  assert.deepEqual(values(bottom, "again"), ["smaller_own", "same", "stuck", "not_now"], "at the bottom: smaller in their own words");
  assert.equal(run([pick("again", "smaller_own"), next], ctx(), bottom).stepId, "rung");
  // No streaks, counts or scores anywhere in the copy.
  assert.doesNotMatch(JSON.stringify(skill.copy), /streak|score|\d+ (times|days) in a row|failed/i);
});

test("a carried flooded reading: the body first or try anyway; Talk to someone now on every screen", () => {
  const c = ctx({ band: "flooded" });
  const h = run([pick("area", "home"), next], c);
  assert.equal(h.stepId, "heads_up");
  assert.deepEqual(offers(run([pick("heads_up", "settle"), next], c, h), c), ["cool_down"]);
  assert.equal(run([pick("heads_up", "try"), next], c, h).stepId, "rung");
  for (const st of skill.steps) {
    const links = st.kind === "ask" ? st.fields.flatMap((f) => f.links ?? []) : st.links ?? [];
    assert.ok(links.some((l) => l.exit === "safety_open"), st.id);
  }
});

test("i_can: a profile kind about me, many, own words encrypted, named in Me from the graph's options", async () => {
  const { PROFILE_KINDS } = await importTs("functions/src/profile/kinds.ts");
  const k = PROFILE_KINDS.i_can;
  assert.equal(k.area, "about_me");
  assert.equal(k.many, true);
  assert.equal(k.slice, "iCanRungs");
  assert.deepEqual(k.ownFields, ["areaOwn", "rungOwn"]);
  assert.deepEqual(k.validate({ areaOwn: "the garden", rungIds: ["own_1"] }), { areaOwn: "the garden", rungIds: ["own_1"] });
  assert.deepEqual(k.validate({ rungIds: ["admin_1"] }), { rungIds: ["admin_1"] });
  assert.deepEqual(k.validate({ rungOwn: "Pull the weeds" }), { rungOwn: "Pull the weeds" });
  assert.throws(() => k.validate({}), /Nothing to keep/);
  assert.throws(() => k.validate({ rungIds: ["a", "b"] }));
  assert.throws(() => k.validate({ rungIds: ["admin_1"], note: "x" }), /Unexpected field/);
  assert.match(readFileSync("schema/profile-layer.cypher", "utf8"), /ProfileKind \{id: "i_can"\}/);
  const cy = readFileSync("schema/skills.cypher", "utf8");
  for (const o of skill.options.rung) assert.match(cy, new RegExp(`MERGE \\(o:SkillOption \\{id: "build_mastery:rung:${o.value}"\\}\\)`), o.value);
  assert.match(readFileSync("functions/src/profile/slices.ts", "utf8"), /RUNG_OPTION = 'build_mastery:rung:'/);
  assert.match(readFileSync("functions/src/profile/me.ts", "utf8"), /meta\.kind === 'i_can'/);
});

// Auto-adjust (PRD ER-11, part 2), within the visit's own loop: the last round is read as `$prev`, never a past visit.
test("done again at the same rung offers the next one up; not yet again, a smaller one; nothing counted or pre-picked", () => {
  const r1 = reopen(booked("admin_2"));
  assert.equal(r1.answers["prev.happened"], undefined, "a first card has no last round");
  const done1 = run([pick("happened", "done"), next], ctx(), r1);
  assert.equal(title(done1), "You did it.", "once is once");
  const again = run([pick("then", "same"), next, pick("when", "tomorrow"), pick("remind", "yes"), next], ctx(), done1);
  const r2 = reopen(again);
  assert.equal(r2.answers.happened, undefined, "asked fresh");
  assert.equal(r2.answers.then, undefined, "the last round's chip isn't pre-picked");
  const done2 = run([pick("happened", "done"), next], ctx(), r2);
  assert.equal(title(done2), "Done again. The next one up is there if you want it.");
  assert.ok(values(done2, "then").includes("up"), "offered, never pushed: every choice stays");
  assert.ok(!M.runRecord(ctx(), done2).answers.some((x) => x.fieldId.startsWith("prev.")), "never recorded");
  assert.equal(title(run([pick("happened", "partly"), next], ctx(), r2)), "Part of it counts.", "partly isn't done twice");
  // Up a rung after one done: the next done there is a first.
  const up = run([pick("then", "up"), next, pick("rung", "admin_3"), next, pick("when", "tomorrow"), pick("remind", "yes"), next], ctx(), done1);
  assert.equal(title(run([pick("happened", "done"), next], ctx(), reopen(up))), "You did it.");
  // At the top rung: no next one up to offer.
  const top = reopen(run([pick("then", "same"), next, pick("when", "tomorrow"), pick("remind", "yes"), next], ctx(), run([pick("happened", "done"), next], ctx(), reopen(booked("admin_3")))));
  assert.equal(title(run([pick("happened", "done"), next], ctx(), top)), "Done again. That counts.");
  // Not yet, then the same again, then not yet: a smaller one may fit better.
  const not1 = run([pick("happened", "not_yet"), next], ctx(), r1);
  assert.equal(title(not1), "Not yet is a real answer.");
  const r2n = reopen(run([pick("again", "same"), next, pick("when", "tomorrow"), pick("remind", "yes"), next], ctx(), not1));
  const not2 = run([pick("happened", "not_yet"), next], ctx(), r2n);
  assert.equal(title(not2), "Not yet is a real answer. A smaller one may fit better right now.");
  for (const k of ["done_twice_title", "done_twice_top_title", "not_twice_title"]) assert.doesNotMatch(skill.copy[k], /twice|\d|times/i, "no counts");
  assert.ok(values(not2, "again").includes("smaller") && values(not2, "again").includes("same"));
  // A done between two not-yets breaks the run of two.
  assert.equal(title(run([pick("happened", "not_yet"), next], ctx(), r2)), "Not yet is a real answer.");
});
