// What works here (PRD MF-08, effectively; DBT Mindfulness Handout 5; docs/design/what-works.md) on the skill runtime:
// validate first, what you want out of it, being right and what works side by side, one move that works from how
// things are, and what to set down for now. Problem Solve's two `effectiveness` directions open it with their
// grievance. Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "effectively");
const ps = content.skills.find((s) => s.id === "problem_solve");
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn,
  embedOutputs: { twoColumns: { ids: ["read"] } }, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const read = { type: "embedDone", output: { ids: ["read"] } };
const run = (events, c = ctx(), from = M.pageStart(c)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const step = (id) => M.stepOf(skill, id);
const ids = (s, id, c = ctx()) => {
  const f = M.shownFields(c, step(id), s)[0];
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const copy = (s, key, c = ctx()) => M.copyText(c, key, s, M.titleSlots(c, step(s.stepId), s));
const title = (s, c = ctx()) => copy(s, step(s.stepId).title, c);
// The line a screen shows: the first of its lines that holds.
const lines = (s, c = ctx()) => [M.handoffLine(c, step(s.stepId), s)].filter(Boolean);
const offers = (s, c = ctx()) => M.offersFor(c, step(s.stepId), s).map((o) => o.id ?? o);
const links = (s, c = ctx()) => {
  const st = step(s.stepId);
  return [...M.stepLinks(c, st, s), ...M.shownFields(c, st, s).flatMap((f) => M.fieldLinks(c, f, s))].map((l) => l.exit.id);
};
// A connected goal, both piles, what works, a move, nothing set down.
const BOTH = [pick("goal", "connected"), next, pick("right", "admit"), pick("works", "together"), next, read];

test("the skill: tool effectiveness on dbt_effectively, listed under Mindfulness with its intent, close kind none", () => {
  assert.equal(skill.toolId, "effectiveness");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_effectively"\}\), \(s:Skill \{id: "effectively"\}\)/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'effectiveness': 'effectively',/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'effectiveness',\n\s+name: 'What works here',[\s\S]*?module: 'mindfulness',/);
  assert.match(tools, /label: 'Being right is getting in the way', toolId: 'effectiveness'/);
  for (const f of ["src/lib/spine/close.ts", "functions/src/spine/tools.ts"])
    assert.match(readFileSync(f, "utf8"), /'effectiveness': \{ module: 'mf', closeKind: 'none' \}/, f);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_effectively", t: "effectiveness"\}/);
});

test("validate first: a plain visit names the pull; Problem Solve's grievances are said plainly before the question", () => {
  const s0 = M.pageStart(ctx());
  assert.equal(s0.stepId, "goal");
  assert.equal(title(s0), "What do you most want out of this?");
  assert.equal(lines(s0)[0], "Being right and getting what matters can pull apart.");
  const F = ctx({ frame: "anger-blocked-goal" });
  assert.equal(lines(M.pageStart(F), F)[0], "Maybe they are in the wrong. That's real.");
  const U = ctx({ frame: "envy-unfair-advantage" });
  assert.equal(lines(M.pageStart(U), U)[0], "It isn't fair. That's real.");
  const FL = ctx({ frame: "anger-blocked-redirect", band: "flooded" });
  assert.equal(title(M.pageStart(FL), FL), "What do you most want out of this?", "a flooded reading keeps the question");
  assert.equal(lines(M.pageStart(FL), FL)[0], "Maybe they are in the wrong. That's real.", "and the validation line");
  // Self-respect is always a goal (PRD risk: never heard as "give in"), and own words are a goal too.
  assert.deepEqual(ids(s0, "goal"), ["connected", "boundary", "progress", "repair", "respect", "unsafe"]);
  assert.equal(run([own("goal", "Keep my job"), next]).stepId, "want");
});

test("scared of them: the other_person resources and Ending careful, no moves, no rep, no close; from the move and the card too", () => {
  assert.ok(step("goal").crisis.some((c) => c.variant === "other_person"));
  assert.equal(skill.options.goal.find((o) => o.value === "unsafe").label, "Someone threatened me, scared me or hurt me");
  const s = run([pick("goal", "unsafe"), next]);
  assert.equal(s.stepId, "unsafe");
  assert.equal(step("unsafe").complete, false, "a safety-routed visit is no rep");
  const mv = run([...BOTH, pick("pull", "works"), next, pick("move", "unsafe"), next]);
  assert.equal(mv.stepId, "unsafe");
  assert.ok(step("move").crisis.some((c) => c.variant === "other_person"));
  const booked = run([...BOTH, pick("pull", "works"), next, pick("move", "conn_ask"), next, next, pick("remind", "tomorrow")]);
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), booked), "back");
  assert.equal(run([pick("back", "unsafe"), next], ctx(), r).stepId, "unsafe");
  assert.ok(step("back").crisis.some((c) => c.variant === "other_person"));
  assert.deepEqual(step("unsafe").crisis, [{ variant: "other_person", when: { all: [] } }]);
  assert.deepEqual(offers(s), ["safety_open", "ending_careful"]);
  assert.ok(step("unsafe").noClose);
  assert.deepEqual(skill.exits.find((e) => e.id === "ending_careful").query, { frame: "careful" });
});

test("both piles on one screen, then on paper; an empty pile skips the paper", () => {
  const w = run([pick("goal", "connected"), next]);
  assert.equal(w.stepId, "want");
  assert.deepEqual(M.shownFields(ctx(), step("want"), w).map((f) => f.id), ["right", "works"]);
  assert.ok(step("want").fields.every((f) => f.required === false), "none is required");
  const p = run([pick("goal", "connected"), next, pick("right", "admit"), pick("works", "together"), next]);
  assert.equal(p.stepId, "piles");
  assert.equal(step("piles").embed, "twoColumns");
  assert.deepEqual([step("piles").props.left, step("piles").props.right], ["right", "works"]);
  assert.equal(run(BOTH).stepId, "pull");
  assert.equal(run([pick("goal", "connected"), next, pick("works", "together"), next]).stepId, "pull", "one pile: nothing to weigh");
  assert.equal(run([pick("goal", "connected"), next, next]).stepId, "pull");
});

test("the move: the goal's three, the host's direction first, general ones for an own-words goal", () => {
  const m = run([...BOTH, pick("pull", "works"), next]);
  assert.equal(m.stepId, "move");
  assert.deepEqual(ids(m, "move"), ["conn_one", "conn_break", "conn_ask", "unsafe"]);
  const F = ctx({ frame: "anger-blocked-goal" });
  const mf = run([pick("goal", "progress"), next, next, pick("pull", "works"), next], F);
  assert.deepEqual(ids(mf, "move", F), ["fight_ask", "fight_hold", "fight_let", "prog_step", "prog_who", "prog_where", "unsafe"]);
  const U = ctx({ frame: "envy-unfair-advantage" });
  const mu = run([pick("goal", "respect"), next, next, pick("pull", "works"), next], U);
  assert.deepEqual(ids(mu, "move", U).slice(0, 3), ["unfair_have", "unfair_plan", "unfair_own"]);
  const mo = run([own("goal", "Keep my job"), next, next, pick("pull", "unsure"), next]);
  assert.deepEqual(ids(mo, "move"), ["any_step", "any_pause", "any_ask", "unsafe"]);
  // The host's moves present Problem Solve's SolutionDirection nodes.
  const cy = readFileSync("schema/skills.cypher", "utf8");
  assert.match(cy, /SolutionDirection \{id: "anger-blocked-redirect"\}/);
  assert.match(cy, /SolutionDirection \{id: "envy-unfair-effective"\}/);
});

test("being right about this one is accepted without rescue: no host moves, no set-down step, its own end line", () => {
  const m = run([...BOTH, pick("pull", "right"), next]);
  assert.equal(title(m), "Then one move that keeps your self-respect, from where things stand.");
  assert.deepEqual(ids(m, "move"), ["conn_one", "conn_break", "conn_ask", "resp_proud", "resp_leave", "resp_hold", "unsafe"]);
  const F = ctx({ frame: "anger-blocked-redirect" });
  const mf = run([pick("goal", "progress"), next, next, pick("pull", "right"), next], F);
  assert.ok(!ids(mf, "move", F).some((v) => v.startsWith("fight_")), "never the host's de-escalation steps");
  const e = run([pick("move", "conn_one"), next], ctx(), m);
  assert.equal(e.stepId, "end");
  assert.equal(title(e), "What works here: Say the one thing that matters most, and leave the rest");
  assert.equal(lines(e)[0], "Sometimes being right is the point. You know which this one is.");
  // Getting even (They pay for it): offered to set down, and the end card keeps self-respect apart from it.
  const even = run([pick("goal", "respect"), next, pick("right", "pay"), next, pick("pull", "right"), next, pick("move", "resp_proud"), next]);
  assert.equal(even.stepId, "set_down");
  const ee = run([next], ctx(), even);
  assert.equal(lines(ee)[0], "Self-respect can be the point. Getting even tends to cost you more than it costs them.");
  assert.ok(offers(ee).includes("fast"));
});

test("set down for now (optional), the end line by what was chosen, the goal's next tool", () => {
  const sd = run([...BOTH, pick("pull", "works"), next, pick("move", "conn_break"), next]);
  assert.equal(sd.stepId, "set_down");
  assert.equal(copy(sd, step("set_down").hint), "Nothing is given up for good.");
  const e = run([pick("set_down", "right"), pick("set_down", "even"), next], ctx(), sd);
  assert.equal(e.stepId, "end");
  assert.equal(lines(e)[0], "The rest can wait. Setting it down for now isn't giving in.");
  assert.deepEqual(offers(e), ["give", "dear_man"]);
  const none = run([next], ctx(), sd);
  assert.equal(lines(none)[0], "Right, or what works? Asking it is the skill.");
  const unsure = run([pick("goal", "boundary"), next, next, pick("pull", "unsure"), next, pick("move", "bound_once"), next, next]);
  assert.equal(lines(unsure)[0], "Not knowing is fine. You have one move either way.");
  assert.deepEqual(offers(unsure), ["dear_man", "fast", "say_no"]);
  const prog = run([pick("goal", "progress"), next, next, pick("pull", "works"), next, pick("move", "prog_step"), next, next]);
  assert.deepEqual(offers(prog), ["problem_solve", "build_mastery"]);
  assert.ok(step("end").noClose, "close kind none: the move is the outcome");
});

test("ask how it went: optional chips book effective_move, which reopens the run at back", () => {
  const end = step("end");
  assert.deepEqual(end.followUp, { type: "effective_move", whenFrom: "remind" });
  assert.equal(end.fields[0].required, undefined, "optional");
  const booked = run([...BOTH, pick("pull", "works"), next, pick("move", "conn_ask"), next, next, pick("remind", "tomorrow")]);
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), booked), "back");
  assert.ok(r);
  assert.equal(r.stepId, "back");
  assert.equal(title(r), "How did it go? You planned: Ask what they need from this");
  const didnt = run([pick("back", "didnt"), next], ctx(), r);
  assert.equal(didnt.stepId, "back_end");
  assert.deepEqual(offers(didnt), ["problem_solve"]);
  // Not yet: the card can come again (optional), and the card's visit logs no rep (OFF_PHONE_SKILLS).
  const ny = run([pick("back", "not_yet"), next], ctx(), r);
  assert.equal(ny.stepId, "again");
  assert.deepEqual(step("again").followUp, { type: "effective_move", whenFrom: "again" });
  assert.equal(lines(run([pick("again", "few_days"), next], ctx(), ny))[0], "The card will come back then.");
  assert.equal(lines(run([next], ctx(), ny))[0], "It'll be here when you're ready.");
  assert.match(readFileSync("functions/src/skills/projections.ts", "utf8"), /effectively: \{ toolId: 'effectiveness', happenedField: 'back', yes: \['helped', 'didnt'\]/);
  assert.equal(M.resumeRun(ctx(), M.runRecord(ctx(), run([pick("goal", "connected"), next])), "back"), null, "a run that never reached the end doesn't reopen");
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /'effective_move'/);
  assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), /effective_move: 'effectiveness'/);
});

test("a carried flooded reading: the heads-up and My body first, never a lock; Talk to someone now on every screen", () => {
  const F = ctx({ band: "flooded" });
  const h = run([pick("goal", "connected"), next], F);
  assert.equal(h.stepId, "heads_up");
  assert.equal(title(h, F), "Your body's loud right now.");
  assert.equal(lines(h, F)[0], skill.copy.flooded_hint);
  assert.equal(run([pick("heads_up", "body"), next], F, h).stepId, "body_first");
  assert.deepEqual(offers(run([pick("heads_up", "body"), next], F, h), F), ["cool_down"]);
  assert.equal(run([pick("heads_up", "go"), next], F, h).stepId, "want", "it can still go on");
  assert.equal(run([pick("goal", "connected"), next]).stepId, "want", "no heads-up without the reading");
  for (const st of skill.steps) {
    const ls = [...(st.links ?? []), ...(st.fields ?? []).flatMap((f) => f.links ?? [])];
    assert.ok(ls.some((l) => l.exit === "safety_open"), `${st.id}: Talk to someone now`);
  }
});

test("Problem Solve: the two directions open What works here, built, with the direction picked as the frame", () => {
  const ex = ps.exits.find((e) => e.toolId === "effectiveness");
  assert.ok(ex && !ex.planned, "built");
  // The direction, so a piled-up problem's focus (problem = piling) still carries its grievance.
  assert.deepEqual(ex.query, { frame: "$a.solutions" });
  const tools = ps.options.direction.filter((o) => o.tool === "effectiveness").map((o) => o.value).sort();
  assert.deepEqual(tools, ["anger-blocked-redirect", "envy-unfair-effective"]);
  assert.deepEqual(Object.keys(skill.tables.grievanceOf).sort(), ["anger-blocked-goal", "anger-blocked-redirect", "envy-unfair-advantage", "envy-unfair-effective", "fight", "unfair"]);
  const F = ctx({ frame: "envy-unfair-effective" });
  assert.equal(lines(M.pageStart(F), F)[0], "It isn't fair. That's real.");
});

test("the practice spine: an effectively PracticeSkill, order 6 in the MF sequence, the card in spine.json", () => {
  const spine = JSON.parse(execFileSync("python3", ["-c", [
    "import json,sys; sys.path.insert(0,'scripts/practice-spine'); import content as c",
    "s=[x for x in c.NEW_SKILLS if x[0]=='effectively'][0]",
    "t=[x for x in c.FOLLOW_UP_TYPES if x['id']=='effective_move'][0]",
    "print(json.dumps({'skill': s, 'seq': c.MF_SEQUENCE, 'type': t}, default=str))",
  ].join("\n")], { encoding: "utf8" }));
  assert.equal(spine.skill[4], "dbt_effectively");
  assert.deepEqual(spine.skill[spine.skill.length - 1], ["effectiveness"]);
  assert.deepEqual(spine.seq.find((x) => x[0] === "effectively").slice(0, 3), ["effectively", 6, "What works"]);
  assert.match(spine.type.deepLinkTemplate, /\/tool\/effectiveness\?run=\{sourceSessionId\}&at=back&followUp=\{followUpId\}/);
  const shipped = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content.followUpTypes;
  assert.deepEqual(shipped.find((t) => t.id === "effective_move").deepLinkTemplate, spine.type.deepLinkTemplate);
});
