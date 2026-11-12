// What matters to me (PRD ER-09, DBT ER Handouts 17–18; docs/design/values.md) on the skill runtime: sort plain-word
// value cards, keep up to three for now (*not sure yet* is a full answer), one small step this week for one, and the
// value_step card that reopens the run at *Did it happen?*. The `values` kind and slice. Tested through the pure
// machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "values");
const KEPT = { values: [{ id: "friendship", label: "Friendship", meta: {} }, { id: "own", label: "Being a good dad", meta: {} }] };
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
const SORTED = (c = ctx()) => run([next, pick("mine", "honesty"), pick("mine", "friendship"), pick("mine", "calm"), pick("mine", "fun"), next], c);

test("the skill: tool values-clarification, concept dbt_values_priorities, no close question, listed under Emotion Regulation", () => {
  assert.equal(skill.toolId, "values-clarification");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_values_priorities"\}\), \(s:Skill \{id: "values"\}\)/);
  assert.match(readFileSync("schema/knowledge-graph.cypher", "utf8"), /MERGE \(values_priorities:TherapyConcept \{id: "dbt_values_priorities"\}\)/);
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'values-clarification': \{ module: 'er', closeKind: 'none' \}/);
  assert.match(readFileSync("src/lib/spine/close.ts", "utf8"), /'values-clarification': \{ module: 'er', closeKind: 'none' \}/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'values-clarification',\n\s+name: 'What Matters to Me',[\s\S]*?module: 'emotion-regulation'/);
  assert.match(tools, /toolId: 'values-clarification'/, "a Tools intent");
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'values-clarification': 'values'/);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_values_priorities", t: "values-clarification"\}/);
  // Problem Solve's companion link to it is built now.
  const ps = content.skills.find((s) => s.id === "problem_solve").exits.find((e) => e.toolId === "values-clarification");
  assert.ok(ps && !ps.planned, "Problem Solve's values link resolves");
});

test("first time: the question, then the sort; nothing picked is a full answer (not sure yet)", () => {
  const s = M.initialRun(skill);
  assert.equal(title(s), "What matters to you?");
  assert.deepEqual(values(s, "start"), [], "nothing to choose the first time: Next goes to the sort");
  const sort = run([next]);
  assert.equal(sort.stepId, "sort");
  const cards = values(sort, "mine");
  assert.ok(cards.length >= 20 && cards.length <= 26, "about two dozen value cards");
  for (const v of ["friendship", "fairness", "honesty", "standing_up", "calm", "meaning"]) assert.ok(cards.includes(v), v);
  const none = run([next], ctx(), sort);
  assert.equal(none.stepId, "not_sure");
  assert.match(line(none), /^What matters can take a while to find/);
});

test("keep three: only from the sort, at most three; not sure yet still keeps the sort", () => {
  const k = SORTED();
  assert.equal(k.stepId, "keep");
  assert.deepEqual(values(k, "kept").sort(), ["calm", "friendship", "fun", "honesty"], "only what sounded like them");
  const field = M.stepOf(skill, "keep").fields[0];
  assert.equal(field.max, 3);
  assert.match(skill.copy.keep_hint, /Both can matter/, "conflicting values (PRD risks)");
  const step = M.stepOf(skill, "keep");
  const sortOnly = M.keepFor(ctx(), step, k);
  assert.deepEqual(sortOnly && { kind: sortOnly.kind, value: sortOnly.value }, { kind: "values", value: { mineIds: ["honesty", "friendship", "calm", "fun"] } });
  assert.equal(run([next], ctx(), k).stepId, "sorted", "not sure yet: the sort is kept, and that's the end");
  const three = run([pick("kept", "honesty"), pick("kept", "friendship"), own("kept", "Being a good dad")], ctx(), k);
  assert.deepEqual(M.keepFor(ctx(), step, three).value, { mineIds: ["honesty", "friendship", "calm", "fun"], keptIds: ["honesty", "friendship"], keptOwn: "Being a good dad" });
});

test("one value, one small step: the steps are that value's own; own words always", () => {
  const one = run([pick("kept", "honesty"), pick("kept", "friendship"), next], ctx(), SORTED());
  assert.equal(one.stepId, "one");
  assert.deepEqual(values(one, "focus").sort(), ["friendship", "honesty"]);
  const step = run([pick("focus", "friendship"), next], ctx(), one);
  assert.equal(step.stepId, "step");
  const steps = values(step, "step");
  assert.deepEqual(steps, ["friendship_1", "friendship_2", "friendship_3"]);
  assert.match(skill.copy.set_line, /direction, not a rule/, "values as directions, not shoulds (PRD risks)");
  assert.match(skill.copy.step_hint, /facing someone who hurts you, that's not the step/, "someone unsafe is never the step");
  const when = run([pick("step", "friendship_1"), next], ctx(), step);
  assert.equal(when.stepId, "when");
  const set = run([pick("when", "few_days"), pick("remind", "yes"), next], ctx(), when);
  assert.equal(set.stepId, "set");
  assert.equal(title(set), "Your step: Reach out to a friend.");
  assert.deepEqual(M.followUpFor(ctx(), M.stepOf(skill, "when"), run([pick("when", "few_days"), pick("remind", "yes")], ctx(), when)), { type: "value_step", chip: "few_days" });
  assert.equal(M.followUpFor(ctx(), M.stepOf(skill, "when"), run([pick("when", "few_days"), pick("remind", "no")], ctx(), when)), null);
});

test("kept only in their own words: straight to a step, with the general steps; a focus in own words too", () => {
  const ownOnly = run([own("kept", "Being a good dad"), next], ctx(), SORTED());
  assert.equal(ownOnly.stepId, "step", "never stuck on a choice of one with nothing to pick");
  assert.deepEqual(values(ownOnly, "step"), ["own_1", "own_2", "own_3"]);
  const one = run([pick("kept", "honesty"), next], ctx(), SORTED());
  const typed = run([own("focus", "Being brave"), next], ctx(), one);
  assert.equal(typed.stepId, "step");
  assert.deepEqual(values(typed, "step"), ["own_1", "own_2", "own_3"]);
});

test("coming back with values kept: a step for one of them (named from the slice), or sort again", () => {
  const c = ctx({}, KEPT);
  const s = M.initialRun(skill);
  assert.equal(title(s, c), "You've kept a few things that matter to you.");
  assert.deepEqual(values(s, "start", c), ["step", "sort"]);
  const one = run([pick("start", "step"), next], c);
  assert.equal(one.stepId, "one_kept");
  assert.deepEqual(values(one, "focus_kept", c), ["friendship", "own"], "only the kept ones");
  const step = run([pick("focus_kept", "friendship"), next], c, one);
  assert.deepEqual(values(step, "step", c), ["friendship_1", "friendship_2", "friendship_3"]);
  const ownStep = run([pick("focus_kept", "own"), next], c, one);
  assert.deepEqual(values(ownStep, "step", c), ["own_1", "own_2", "own_3"], "an own-words value: the general steps, or own words");
  assert.equal(run([pick("start", "sort"), next], c).stepId, "sort");
});

test("value_step: registered, content-free, reopens at back; yes names the value, not this time is no blame", () => {
  const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8"));
  const t = spine.content.followUpTypes.find((x) => x.id === "value_step");
  assert.equal(t.deepLinkTemplate, "/tool/values-clarification?run={sourceSessionId}&at=back&followUp={followUpId}");
  assert.deepEqual(Object.keys(t.window.chips).sort(), skill.options.when.map((o) => o.value).sort(), "each when is a chip");
  assert.doesNotMatch(JSON.stringify(t.copy), /friend|honest|value:/i, "never names the value or the step");
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /OPEN_RESOLVES = \[[^\]]*'value_step'/);
  assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), /value_step: 'values-clarification'/);
  assert.match(readFileSync("schema/practice-spine.cypher", "utf8"), /MERGE \(t:FollowUpType \{id: "value_step"\}\)/);
  const booked = run([pick("kept", "friendship"), next, pick("focus", "friendship"), next, pick("step", "friendship_2"), next, pick("when", "this_week"), pick("remind", "yes"), next], ctx(), SORTED());
  assert.deepEqual(M.stepOf(skill, "back").reopens, { after: "when" });
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), booked), "back");
  assert.equal(title(r), "Earlier you picked: See a friend in person.");
  const yes = run([pick("happened", "partly"), next], ctx(), r);
  assert.equal(yes.stepId, "back_yes");
  assert.equal(title(yes), "Friendship, in action.");
  assert.match(line(yes), /^Part of it counts/, "partly gets its own line");
  const no = run([pick("happened", "no"), next], ctx(), r);
  assert.equal(no.stepId, "back_no");
  assert.equal(title(no), "Not this time is a real answer.");
  assert.match(skill.copy.back_no_hint, /^Values are directions, not rules/);
  assert.deepEqual(values(no, "again"), ["smaller", "not_now"]);
  const smaller = run([pick("again", "smaller"), next], ctx(), no);
  assert.equal(smaller.stepId, "step", "a smaller step for the same value");
  assert.deepEqual(values(smaller, "step"), ["friendship_1", "friendship_2", "friendship_3"]);
  assert.equal(smaller.answers.step, undefined, "last time's step isn't picked for them");
  const again = run([pick("step", "friendship_1"), next, pick("when", "tomorrow"), pick("remind", "yes")], ctx(), smaller);
  assert.deepEqual(M.followUpFor(ctx(), M.stepOf(skill, "when"), again), { type: "value_step", chip: "tomorrow" }, "a smaller step books its own card");
  const later = run([pick("again", "not_now"), next], ctx(), no);
  assert.equal(later.stepId, "back_end");
  assert.deepEqual(offers(later), []);
  const hurt = run([pick("happened", "hurt"), next], ctx(), r);
  assert.equal(hurt.stepId, "back_hurt");
  assert.match(line(hurt), /isn't all on you/, "no blame when a step went badly");
  assert.deepEqual(offers(hurt), ["recover", "cool_down"]);
  // From a value kept before.
  const c = ctx({}, KEPT);
  const kb = run([pick("start", "step"), next, pick("focus_kept", "friendship"), next, pick("step", "friendship_1"), next, pick("when", "tomorrow"), next], c);
  const rk = M.resumeRun(c, M.runRecord(c, kb), "back");
  const full = run([pick("happened", "yes"), next], c, rk);
  assert.equal(title(full, c), "Friendship, in action.");
  assert.match(line(full, c), /^Steps like that/);
});

test("a carried flooded reading: the body first or try anyway; Talk to someone now on every screen", () => {
  const c = ctx({ band: "flooded" });
  const h = run([next], c);
  assert.equal(h.stepId, "heads_up");
  const settle = run([pick("heads_up", "settle"), next], c, h);
  assert.deepEqual(offers(settle, c), ["cool_down"]);
  assert.equal(run([pick("heads_up", "try"), next], c, h).stepId, "sort");
  // Coming back for a step with a flooded reading gets the heads-up too, then the kept ones.
  const ck = ctx({ band: "flooded" }, KEPT);
  const hk = run([pick("start", "step"), next], ck);
  assert.equal(hk.stepId, "heads_up");
  assert.equal(run([pick("heads_up", "try"), next], ck, hk).stepId, "one_kept");
  for (const st of skill.steps) {
    const links = st.kind === "ask" ? st.fields.flatMap((f) => f.links ?? []) : st.links ?? [];
    assert.ok(links.some((l) => l.exit === "safety_open"), st.id);
  }
});

test("values: a profile kind about me, one per person, own words encrypted, revisited monthly; the values slice for the tool", async () => {
  const { PROFILE_KINDS } = await importTs("functions/src/profile/kinds.ts");
  const k = PROFILE_KINDS.values;
  assert.equal(k.area, "about_me");
  assert.equal(k.slice, "values");
  assert.equal(k.many, false);
  assert.deepEqual(k.ownFields, ["mineOwn", "keptOwn"]);
  assert.deepEqual(k.validate({ mineIds: ["honesty"] }), { mineIds: ["honesty"] });
  assert.throws(() => k.validate({ keptIds: ["honesty"] }), /Nothing to keep/, "the sort is the thing kept");
  assert.throws(() => k.validate({ mineIds: ["a"], keptIds: ["a", "b", "c", "d"] }));
  assert.throws(() => k.validate({ mineIds: ["a"], note: "x" }), /Unexpected field/);
  assert.match(readFileSync("schema/profile-layer.cypher", "utf8"), /ProfileKind \{id: "values"\}/);
  assert.match(readFileSync("scripts/profile-layer/content.py", "utf8"), /\("values", "about_me", "What matters to me", 30,/);
  for (const p of ["functions/src/profile/types.ts", "src/data/profileTypes.ts"]) {
    assert.match(readFileSync(p, "utf8"), /'values-clarification': \['values'\]/, p);
  }
  // The slice names kept values from the graph's own options (never a copy).
  const cy = readFileSync("schema/skills.cypher", "utf8");
  for (const o of skill.options.value) assert.match(cy, new RegExp(`MERGE \\(o:SkillOption \\{id: "values:value:${o.value}"\\}\\)`), o.value);
  assert.match(readFileSync("functions/src/profile/slices.ts", "utf8"), /VALUE_OPTION = 'values:value:'/);
});
