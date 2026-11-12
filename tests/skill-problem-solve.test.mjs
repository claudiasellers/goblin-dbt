// Problem Solve (DBT ER Handout 12; ER-12, docs/design/problem-solve.md) on the skill runtime: the port of the
// hand-built page. The clinical content comes from the Problem Solve graph files (never copied into the skill by
// hand); a feeling it doesn't fit goes elsewhere; the MI barriers route as the old page did; safety from a person
// raises the crisis slot; every dead link is a planned exit; the evaluation (step 7) reopens the visit's own run.
// Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const { validateExt } = await importTs("functions/src/spine/extSchemas.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
const skill = content.skills.find((s) => s.id === "problem_solve");
const grid = JSON.parse(execFileSync("python3", ["scripts/emotions/build.py", "--json"], { encoding: "utf8" })).square;
const ps = JSON.parse(execFileSync("python3", ["-c", `import sys,json; sys.path.insert(0,'scripts/skills'); from ps_graph import content
c=content(); print(json.dumps({k: c[k] for k in ("problemTypes","directions","aspects","barriers","subs","ambivalence")}))`], { encoding: "utf8" }));

const ctx = (ctxIn = {}, carried = []) => ({ skill, shared: content, carried, gridIds: new Set(grid), emotionLabel: (x) => x, ctxIn });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const values = (fieldId, s) => {
  const f = skill.steps.flatMap((st) => st.fields ?? []).find((x) => x.id === fieldId);
  return M.optionGroups(ctx(), f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const READY = [pick("feel", "anxious"), next, pick("ready", "can"), next];

test("the skill: tool problem-solve, played by the player, its close kind unchanged (plan: no question at the close)", () => {
  assert.equal(skill.toolId, "problem-solve");
  assert.equal(skill.start, "feel");
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'problem-solve': 'problem_solve',/);
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'problem-solve': \{ module: 'er', closeKind: 'plan' \}/);
  assert.ok(readFileSync("src/pages/tools/ProblemSolve.tsx", "utf8").length, "the old page stays in the tree until the follow-up deletes it (C8.4)");
});

test("the content is the graph's: every problem type, direction, step size, part, barrier and answer, each PRESENTS its node", () => {
  const vals = (list) => skill.options[list].map((o) => o.value);
  assert.deepEqual(vals("problem").filter((v) => v !== "piling").sort(), Object.values(ps.problemTypes).flat().map((p) => p.id).sort());
  const dirs = Object.values(ps.directions).flat();
  assert.deepEqual(vals("direction").filter((v) => v !== "own").sort(), dirs.map((d) => d.id).sort(), "and the own idea");
  assert.equal(vals("step").length, dirs.length * 3, "small, medium and bigger for every direction");
  assert.deepEqual(vals("aspect").sort(), Object.values(ps.aspects).flat().map((x) => x.id).sort());
  assert.deepEqual(vals("barrier"), ps.barriers.map((b) => b.id));
  assert.deepEqual(vals("sub").sort(), Object.values(ps.subs).flat().map((x) => x.id).sort());
  assert.deepEqual(vals("ambiv").sort(), Object.values(ps.ambivalence).flat().map((x) => x.id).sort());
  const cypher = readFileSync("schema/skills.cypher", "utf8");
  for (const [label, id] of [["ProblemType", "fear-safety-threat"], ["SolutionDirection", dirs[0].id], ["BarrierSubResponse", "cant-ambivalent"],
    ["DecompositionAspect", Object.values(ps.aspects).flat()[0].id], ["AmbivalenceOption", "ambiv-losing-something"], ["BarrierType", "know-but-cant"]]) {
    assert.ok(cypher.includes(`(c:${label} {id: "${id}"})\nMERGE (o)-[:PRESENTS]->(c)`), `${label} ${id}`);
  }
  // A step's label is the graph's text in the house voice: the spaced dash a colon, never "just" or "but".
  for (const o of Object.values(skill.options).flat()) assert.doesNotMatch(o.label, /—|\bjust\b|\bbut\b|!/, o.value);
});

test("who fits: an applicable word whose parent has problem types; shame, unclear and anything else go elsewhere", () => {
  const t = skill.tables.psFit;
  for (const w of ["anxious", "angry", "sad", "guilty", "jealous", "disgusted"]) assert.equal(t[w], "fit", w);
  for (const w of ["ashamed", "humiliated", "worthless", "rejected"]) assert.equal(t[w], "shame", w);
  for (const w of ["confused", "perplexed", "skeptical"]) assert.equal(t[w], "facts", w);
  for (const w of ["happy", "numb", "tired"]) assert.equal(t[w], "other", w);
  // Every word the check-in's routing sends to Problem Solve fits, so nobody routed here is turned away on screen 1.
  const routed = JSON.parse(execFileSync("python3", ["-c", `import importlib.util,json
s=importlib.util.spec_from_file_location("rc","scripts/recommendations/content.py"); m=importlib.util.module_from_spec(s); s.loader.exec_module(m)
print(json.dumps(sorted({w for r in m.WORD_RULES if r["tool"]=="problem-solve" for w in r["words"]})))`], { encoding: "utf8" }));
  for (const w of routed) assert.equal(t[w], "fit", `routed here: ${w}`);
  for (const w of ["busy", "rushed", "helpless"]) assert.ok(skill.tables.psParent[w], `${w} has problems to start from`);
  const offers = (w) => { const s = run([pick("feel", w), next]); assert.equal(s.stepId, "not_fit", w); return s.offered; };
  assert.deepEqual(offers("ashamed"), ["opposite_action"], "self-validation is planned, so not shown");
  assert.deepEqual(offers("confused"), ["check_the_facts"]);
  assert.deepEqual(offers("happy"), ["find_the_feeling"], "the wave is planned");
  assert.deepEqual(offers("numb"), ["find_the_feeling"], "body scan is planned");
  assert.equal(run([pick("feel", "anxious"), next]).stepId, "ready");
  assert.equal(run([pick("feel", "anxious"), next], ctx({ band: "flooded" })).stepId, "not_now", "a carried flooded reading settles first (C6.2)");
  // Hopelessness, wherever it lands: someone to talk to, one quiet tap away.
  assert.deepEqual(M.stepLinks(ctx(), M.stepOf(skill, "not_fit"), run([pick("feel", "worthless"), next])).map((l) => l.exit.id), ["safety_open"]);
  assert.deepEqual(M.stepLinks(ctx(), M.stepOf(skill, "not_fit"), run([pick("feel", "ashamed"), next])), []);
  const chips = skill.steps[0].fields[0].options.emotions;
  assert.ok(chips.every((w) => t[w] === "fit"), "every curated chip fits");
  assert.deepEqual(M.emotionChoices(ctx({}, ["frustrated"]), skill.steps[0].fields[0], {})[0], "frustrated", "a carried word comes first");
});

test("too loud right now: grounding first, never a lock", () => {
  const s = run([pick("feel", "anxious"), next, pick("ready", "too_loud"), next]);
  assert.equal(s.stepId, "not_now");
  assert.deepEqual(s.offered, ["cool_down", "five_senses", "pause"]);
});

test("the problem: the parent's acknowledgment and its problem types; own words count; piling up picks one foothold", () => {
  const s = run(READY);
  assert.equal(s.stepId, "problem");
  assert.match(M.copyText(ctx(), M.stepOf(skill, "problem").title, s), /fear is pointing at something that matters to you/);
  const types = values("problem", s);
  assert.deepEqual(types, [...ps.problemTypes.fear.map((p) => p.id), "piling"]);
  assert.equal(run([...READY, own("problem", "my landlord won't fix the heating"), next]).stepId, "barrier", "own words go on");
  const t = run([...READY, pick("problem", "piling"), next]);
  assert.equal(t.stepId, "triage");
  assert.deepEqual(values("focus", t), ps.problemTypes.fear.map((p) => p.id), "the same types, without piling");
  assert.equal(run([...READY, pick("problem", "piling"), next, pick("focus", "fear-anticipatory"), next]).stepId, "barrier");
  const g = run([pick("feel", "angry"), next, pick("ready", "can"), next]);
  assert.deepEqual(values("problem", g), [...ps.problemTypes.anger.map((p) => p.id), "piling"], "anger's own types");
});

test("my safety is at risk: the other_person crisis slot to the commit card, and straight to getting safe", () => {
  const s = run([...READY, pick("problem", "fear-safety-threat")]);
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "problem"), s)?.variant, "other_person");
  const sol = run([...READY, pick("problem", "fear-safety-threat"), next]);
  assert.equal(sol.stepId, "solutions", "no barrier questions");
  assert.deepEqual(values("solutions", sol), [...ps.directions["fear-safety-threat"].map((d) => d.id), "own"], "and their own idea");
  const at = run([pick("solutions", ps.directions["fear-safety-threat"][0].id), next, pick("size", `${ps.directions["fear-safety-threat"][0].id}:small`), next], ctx(), sol);
  assert.equal(at.stepId, "commit");
  for (const id of ["solutions", "size", "commit"]) assert.equal(M.crisisFor(ctx(), M.stepOf(skill, id), at)?.variant, "other_person", id);
  for (const st of skill.steps.filter((x) => !["feel", "ready", "problem", "triage", "not_now", "not_fit"].includes(x.id))) {
    assert.equal(M.crisisFor(ctx(), st, at)?.variant, "other_person", `${st.id}: the banner never drops away, the review loop included`);
  }
  assert.match(M.handoffLine(ctx(), M.stepOf(skill, "commit"), at), /call now/, "call now beats any plan");
  const big = run([pick("size", `${ps.directions["fear-safety-threat"][0].id}:bigger`), next], ctx(), sol.stepId === "solutions" ? run([pick("solutions", ps.directions["fear-safety-threat"][0].id), next], ctx(), sol) : sol);
  assert.ok(!big.offered.includes("cope_ahead"), "a safety step is never sent to rehearse first");
  assert.deepEqual(values("when", big), ["today", "tomorrow"], "no Later this week on the danger path");
  const back = M.resumeRun(ctx(), M.runRecord(ctx(), run([pick("when", "today")], ctx(), at)), "review");
  assert.equal(run([pick("how", "didnt"), next, pick("then", "blocked"), next], ctx(), back).stepId, "solutions", "the barrier questions stay skipped");
  // Own words alone never hand someone the danger plan.
  const ownOnly = run([...READY, own("problem", "exam tomorrow"), next, pick("barrier", "not-sure-what"), next]);
  assert.ok(!values("solutions", ownOnly).some((v) => ps.directions["fear-safety-threat"].some((d) => d.id === v)));
  const viaTriage = run([...READY, pick("problem", "piling"), next, pick("focus", "fear-safety-threat")]);
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "triage"), viaTriage)?.variant, "other_person");
  // Own words are never read, so someone to talk to is one quiet tap away once there are any.
  const o = run([...READY, own("problem", "something")]);
  assert.deepEqual(M.fieldLinks(ctx(), M.stepOf(skill, "problem").fields[0], o).map((l) => l.exit.id), ["safety_open"]);
});

test("the barriers route as the old page did; each answer gets what to say and the old page's buttons as chips", () => {
  const at = (barrier) => run([...READY, pick("problem", "fear-anticipatory"), next, pick("barrier", barrier), next]);
  assert.equal(at("know-but-cant").stepId, "sub");
  assert.equal(at("involves-person").stepId, "sub");
  assert.equal(at("tried-nothing-works").stepId, "sub");
  assert.equal(at("outside-control").stepId, "decompose");
  assert.equal(at("not-sure-what").stepId, "solutions");
  assert.match(M.copyText(ctx(), M.stepOf(skill, "sub").title, at("tried-nothing-works")), /You've been trying/);
  assert.deepEqual(values("sub", at("involves-person")), ps.subs["involves-person"].map((x) => x.id));
  const reply = (barrier, sub) => run([pick("sub", sub), next], ctx(), at(barrier));
  const amb = reply("know-but-cant", "cant-ambivalent");
  assert.equal(amb.stepId, "sub_reply");
  assert.match(M.copyText(ctx(), M.stepOf(skill, "sub_reply").title, amb), /Both sides are real/);
  assert.deepEqual(values("go", amb), ["ambiv"]);
  assert.deepEqual(values("go", reply("know-but-cant", "cant-keep-putting-off")), ["ruler"]);
  assert.deepEqual(values("go", reply("tried-nothing-works", "tried-thinking-constantly")), ["options"]);
  assert.deepEqual(values("go", reply("involves-person", "person-scared-reaction")), ["keep"]);
  const links = (s) => M.fieldLinks(ctx(), M.stepOf(skill, "sub_reply").fields[0], s).map((l) => l.exit.id);
  assert.deepEqual(links(reply("involves-person", "person-scared-reaction")).sort(), ["cope_ahead", "dear_man"]);
  assert.deepEqual(links(reply("involves-person", "person-tried-they-dont-listen")), ["give"], "Keep it warm shipped (IE-06); dialectics is planned: never shown");
  const small = run([pick("go", "options"), next], ctx(), reply("tried-nothing-works", "tried-thinking-constantly"));
  assert.match(M.copyText(ctx(), M.stepOf(skill, "solutions").title, small), /start small/);
});

test("part of me doesn't want this to change: what staying the same protects; the parts line after it, with parts on", () => {
  const s = run([...READY, pick("problem", "fear-anticipatory"), next, pick("barrier", "know-but-cant"), next, pick("sub", "cant-ambivalent"), next, pick("go", "ambiv"), next]);
  assert.equal(s.stepId, "ambivalence");
  const slot = M.stepOf(skill, "ambivalence").slots[0];
  assert.equal(slot.embed, "partLater");
  assert.equal(slot.record, "ps_later");
  const r = run([pick("ambiv", "ambiv-hard-conversation"), next], ctx(), s);
  assert.equal(r.stepId, "ambiv_reply");
  assert.match(M.copyText(ctx(), M.stepOf(skill, "ambiv_reply").title, r), /Hard conversations carry real risk/);
  assert.equal(run([next], ctx(), r).stepId, "solutions");
  const embed = readFileSync("src/components/skillPlayer/PartLaterEmbed.tsx", "utf8");
  assert.match(embed, /psLaterCopy\(content, partsOn, sub\)/, "parts on, the barrier, and both lines shipped (src/lib/psAmbivalence.ts)");
  assert.match(embed, /queuePartCandidate\(psLaterCandidate\(id\.current\)\)/, "the tap is the yes");
});

test("how sure: what to say to each level; sure goes to the step they already know, the rest to the directions", () => {
  const s = run([...READY, pick("problem", "fear-anticipatory"), next, pick("barrier", "know-but-cant"), next, pick("sub", "cant-keep-putting-off"), next, pick("go", "ruler"), next]);
  assert.equal(s.stepId, "confidence");
  const high = run([pick("conf", "high"), next], ctx(), s);
  assert.match(M.copyText(ctx(), M.stepOf(skill, "conf_reply").title, high), /the how is there/);
  assert.equal(run([next], ctx(), high).stepId, "own_step");
  const medium = run([pick("conf", "medium"), next, next], ctx(), s);
  assert.equal(medium.stepId, "solutions");
  assert.match(M.copyText(ctx(), M.stepOf(skill, "solutions").title, medium), /start small/);
  // The step they already know: their words (starters fill the box), and a size.
  const own1 = run([next, pick("mystep", "call"), pick("mysize", "medium"), next], ctx(), high);
  assert.equal(own1.stepId, "commit");
  assert.equal(own1.answers.mystep.own, "Make the call", "a starter is written into the box, to change");
  assert.match(M.copyText(ctx(), M.stepOf(skill, "commit").title, own1, M.titleSlots(ctx(), M.stepOf(skill, "commit"), own1)), /^Your next step: Make the call$/, "their own words, in the title");
  assert.deepEqual(own1.offered, ["cope_ahead"], "a medium step: rehearse it");
});

test("outside my control: two questions over the problem's parts, one a screen; only other people's parts is the accept card", () => {
  const s = run([...READY, pick("problem", "fear-anticipatory"), next, pick("barrier", "outside-control"), next]);
  assert.deepEqual(values("mine", s), ps.aspects["fear-anticipatory"].map((x) => x.id));
  const t = run([next], ctx(), s);
  assert.equal(t.stepId, "theirs", "nothing in their hands: then what's up to someone else");
  const none = run([next], ctx(), t);
  assert.equal(none.stepId, "solutions", "nothing picked is not a verdict: the directions, starting small");
  assert.match(M.copyText(ctx(), M.stepOf(skill, "solutions").title, none), /start small/);
  const onlyTheirs = run([pick("others", ps.aspects["fear-anticipatory"][0].id), next], ctx(), t);
  assert.equal(onlyTheirs.stepId, "accept", "only other people's parts: carrying it");
  assert.deepEqual(onlyTheirs.offered, ["dear_man", "let_it_be"], "what to say to them, or let it be (DT-04); willingness and turning the mind are planned");
  const mine = run([pick("mine", ps.aspects["fear-anticipatory"][0].id), next], ctx(), s);
  assert.equal(mine.stepId, "solutions");
  assert.match(M.copyText(ctx(), M.stepOf(skill, "solutions").title, mine), /in your hands/);
  const theirs = run([pick("others", ps.aspects["fear-anticipatory"][0].id)], ctx(), t);
  assert.deepEqual(M.fieldLinks(ctx(), M.stepOf(skill, "theirs").fields[0], theirs).map((l) => l.exit.id), ["dear_man"]);
  // Only own words for the problem: fear's general type (something bad might happen), never safety or health, and
  // someone to talk to stays one tap away on the planning screens.
  const ownOnly = run([...READY, own("problem", "it's complicated"), next, pick("barrier", "outside-control"), next]);
  assert.deepEqual(values("mine", ownOnly), ps.aspects["fear-anticipatory"].map((x) => x.id));
  assert.deepEqual(M.fieldLinks(ctx(), M.stepOf(skill, "decompose").fields[0], ownOnly).map((l) => l.exit.id), ["safety_open"]);
  const ownSol = run([...READY, own("problem", "it's complicated"), next, pick("barrier", "not-sure-what"), next]);
  assert.deepEqual(values("solutions", ownSol), [...ps.directions["fear-anticipatory"].map((d) => d.id), "own"]);
  assert.deepEqual(M.fieldLinks(ctx(), M.stepOf(skill, "solutions").fields[0], ownSol).map((l) => l.exit.id), ["safety_open"]);
});

test("the commit card: the step, the direction's own tool, Cope Ahead for a bigger step, and the review chips", () => {
  const dir = ps.directions["anger-boundary-violation"].find((d) => d.linkedToolId === "dear-man") ?? ps.directions["anger-boundary-violation"][0];
  const base = [pick("feel", "angry"), next, pick("ready", "can"), next, pick("problem", "anger-boundary-violation"), next, pick("barrier", "not-sure-what"), next];
  assert.deepEqual(values("solutions", run(base)), [...ps.directions["anger-boundary-violation"].map((d) => d.id), "own"]);
  assert.equal(run([...base, pick("solutions", "own"), next]).stepId, "own_step", "their own idea: the step they already know");
  const s = run([...base, pick("solutions", dir.id), next]);
  assert.match(M.copyText(ctx(), M.stepOf(skill, "size").title, s, M.titleSlots(ctx(), M.stepOf(skill, "size"), s)), new RegExp(`^${dir.label.split(" ")[0]}`));
  assert.deepEqual(values("size", s), ["small", "medium", "bigger"].map((z) => `${dir.id}:${z}`));
  const small = run([pick("size", `${dir.id}:small`), next], ctx(), s);
  assert.equal(small.stepId, "commit");
  const title = M.copyText(ctx(), M.stepOf(skill, "commit").title, small, M.titleSlots(ctx(), M.stepOf(skill, "commit"), small));
  assert.ok(title.startsWith("Your next step: "), title);
  const want = dir.linkedToolId === "dear-man" ? ["dear_man"] : [];
  assert.deepEqual(small.offered, want, "a small step: the direction's own tool only");
  const big = run([pick("size", `${dir.id}:bigger`), next], ctx(), s);
  assert.deepEqual(big.offered, [...want, "cope_ahead"]);
  const commit = M.stepOf(skill, "commit");
  assert.deepEqual(commit.followUp, { type: "ps_review", whenFrom: "when" });
  assert.equal(M.followUpFor(ctx(), commit, small), null, "no chip, no card");
  assert.deepEqual(M.followUpFor(ctx(), commit, run([pick("when", "tomorrow")], ctx(), small)), { type: "ps_review", chip: "tomorrow" });
  assert.doesNotThrow(() => validateExt({ run: M.runRecord(ctx(), big) }));
});

test("the evaluation (Handout 12 step 7): ps_review reopens the visit's run at How did it go?, only after the commit card", () => {
  const type = spine.followUpTypes.find((t) => t.id === "ps_review");
  assert.ok(type?.enabled);
  assert.equal(type.resolveMode, "deeplink");
  assert.equal(type.deepLinkTemplate, "/tool/problem-solve?run={sourceSessionId}&at=review&followUp={followUpId}");
  assert.deepEqual(skill.options.when.map((o) => o.value).sort(), Object.keys(type.window.chips).sort());
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /OPEN_RESOLVES = \[[^\]]*'ps_review'/, "opening it resolves it");
  assert.ok(spine.followUpTypes.find((t) => t.id === "ps_step")?.enabled, "the old page's cards still answer in place");
  const review = M.stepOf(skill, "review");
  assert.deepEqual(review.reopens, { after: "commit", again: ["review_later"] });
  const dir = ps.directions["fear-anticipatory"][0];
  const done = run([...READY, pick("problem", "fear-anticipatory"), next, pick("barrier", "not-sure-what"), next, pick("solutions", dir.id), next,
    pick("size", `${dir.id}:small`), next, pick("when", "today")]);
  const rec = M.runRecord(ctx(), done);
  const back = M.resumeRun(ctx(), rec, "review");
  assert.equal(back.stepId, "review");
  assert.equal(back.answers.size.ids[0], `${dir.id}:small`, "the run's own answers: the title names the step");
  assert.equal(back.answers.when, undefined, "the reminder chip is never read back");
  assert.match(M.copyText(ctx(), review.title, back, M.titleSlots(ctx(), review, back)), /^How did it go\? You planned: .+$/);
  const unfinished = M.runRecord(ctx(), run([...READY, pick("problem", "fear-anticipatory"), next]));
  assert.equal(M.resumeRun(ctx(), unfinished, "review"), null, "a run that never reached the commit card doesn't reopen");
  const go = (how, more = []) => run([pick("how", how), next, ...more], ctx(), back);
  assert.equal(go("did_it").stepId, "review_help", "did it, then: did it help (the handout evaluates the result)");
  assert.equal(go("did_it", [pick("help", "helped"), next]).stepId, "review_done");
  assert.equal(go("did_it", [pick("help", "some"), next]).stepId, "review_done");
  const nohelp = go("did_it", [pick("help", "not_really"), next]);
  assert.equal(nohelp.stepId, "review_next");
  assert.match(M.copyText(ctx(), M.stepOf(skill, "review_next").title, nohelp), /didn't help/);
  assert.deepEqual(values("then", nohelp), ["other", "blocked"], "not a smaller version of a step that didn't help");
  assert.equal(go("not_yet").stepId, "review_later");
  assert.deepEqual(M.stepOf(skill, "review_later").followUp, { type: "ps_review", whenFrom: "again" });
  assert.equal(go("didnt", [pick("then", "smaller"), next]).stepId, "size");
  assert.equal(go("did_part", [pick("then", "other"), next]).stepId, "solutions");
  assert.equal(go("didnt", [pick("then", "blocked"), next]).stepId, "barrier");
  assert.doesNotThrow(() => validateExt({ run: M.runRecord(ctx(), go("did_it")) }));
});

test("a revised plan replaces the old one, and its own review reopens after it (the second card names the new plan)", () => {
  const dir = ps.directions["fear-anticipatory"].find((d) => !d.linkedToolId);
  const toOwn = [...READY, pick("problem", "fear-anticipatory"), next, pick("barrier", "know-but-cant"), next, pick("sub", "cant-keep-putting-off"), next,
    pick("go", "ruler"), next, pick("conf", "high"), next, next, pick("mystep", "call"), pick("mysize", "medium"), next, pick("when", "today")];
  const ownPlan = run(toOwn);
  assert.equal(ownPlan.stepId, "commit");
  const commitTitle = (s) => M.copyText(ctx(), M.stepOf(skill, "commit").title, s, M.titleSlots(ctx(), M.stepOf(skill, "commit"), s));
  // Own words, then *A different direction*: the guided step is the plan now, never the words written last time.
  const r1 = M.resumeRun(ctx(), M.runRecord(ctx(), ownPlan), "review");
  const guided = run([pick("how", "didnt"), next, pick("then", "other"), next, pick("solutions", dir.id), next, pick("size", `${dir.id}:small`), next], ctx(), r1);
  assert.equal(guided.stepId, "commit");
  assert.equal(guided.answers.mystep, undefined, "the own-words plan is cleared");
  assert.equal(guided.answers.mysize, undefined);
  assert.ok(commitTitle(guided).startsWith("Your next step: "), commitTitle(guided));
  assert.deepEqual(guided.offered, [], "a small guided step: no Cope Ahead from the old medium size");
  // The second card reopens after the whole path, so the new plan comes back, and the last review's answers don't.
  const r2 = M.resumeRun(ctx(), M.runRecord(ctx(), run([pick("when", "tomorrow")], ctx(), guided)), "review");
  assert.equal(r2.stepId, "review");
  assert.equal(r2.answers.size.ids[0], `${dir.id}:small`, "the revised plan");
  assert.equal(r2.answers.how, undefined, "How did it go? is asked again");
  assert.equal(r2.answers.then, undefined);
  assert.equal(r2.path.at(-1), "review");
  // Guided, then the step they already know: the guided answers are cleared on the way in.
  // What got in the way is asked again, never pre-picked from last time.
  const atBarrier = run([pick("how", "didnt"), next, pick("then", "blocked"), next], ctx(), r2);
  assert.equal(atBarrier.stepId, "barrier");
  assert.equal(atBarrier.answers.barrier, undefined);
  const back = run([pick("barrier", "know-but-cant"), next, pick("sub", "cant-keep-putting-off"), next, pick("go", "ruler"), next, pick("conf", "high"), next, next], ctx(), atBarrier);
  assert.equal(back.stepId, "own_step");
  assert.equal(back.answers.size, undefined);
  assert.equal(back.answers.solutions, undefined);
  // *A smaller version* goes back to the plan's own kind of step: own words to own words, a guided step to its sizes.
  assert.equal(run([pick("how", "didnt"), next, pick("then", "smaller"), next], ctx(), r1).stepId, "own_step");
  assert.equal(run([pick("how", "didnt"), next, pick("then", "smaller"), next], ctx(), r2).stepId, "size");
});

test("the second gate pass: never *it can wait* on the danger path; hopeless words on every hand-off; rest refills; routed words keep their name", () => {
  // A danger-path step not taken yet: call now, never *It can wait*, and no Later this week.
  const g = ps.directions["fear-safety-threat"][0];
  const at = run([...READY, pick("problem", "fear-safety-threat"), next, pick("solutions", g.id), next, pick("size", `${g.id}:small`), next, pick("when", "today")]);
  const back = M.resumeRun(ctx(), M.runRecord(ctx(), at), "review");
  const later = run([pick("how", "not_yet"), next], ctx(), back);
  assert.equal(later.stepId, "review_later");
  assert.match(M.handoffLine(ctx(), M.stepOf(skill, "review_later"), later), /call now/);
  assert.deepEqual(values("again", later), ["today", "tomorrow"]);
  // *Not yet*, again and again: every card reopens, the danger answer and its banner with it, and the path stays short.
  let rec = M.runRecord(ctx(), run([pick("again", "tomorrow")], ctx(), later));
  for (let i = 0; i < 30; i++) {
    const r = M.resumeRun(ctx(), rec, "review");
    assert.equal(r?.stepId, "review", `card ${i + 2} reopens`);
    assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "review"), r)?.variant, "other_person", `card ${i + 2}: the banner`);
    rec = M.runRecord(ctx(), run([pick("how", "not_yet"), next, pick("again", "today")], ctx(), r));
  }
  assert.ok(rec.path.length < 20, "earlier review loops don't pile up");
  // An ordinary resume of one long visit (past PATH_MAX with Back and forth) keeps the danger answer too.
  let long = run([...READY, pick("problem", "fear-safety-threat"), next, pick("solutions", g.id), next]);
  for (let i = 0; i < 30; i++) long = run([{ type: "back" }, next], ctx(), long);
  long = run([pick("size", `${g.id}:small`), next], ctx(), long);
  assert.equal(long.stepId, "commit");
  assert.ok(!long.path.includes("problem"), "the problem screen has fallen off the capped path");
  const resumed = M.resumeRun(ctx(), M.runRecord(ctx(), long), "size");
  assert.equal(resumed.stepId, "size");
  assert.equal(resumed.answers.problem?.ids[0], "fear-safety-threat", "the danger answer comes back");
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "size"), resumed)?.variant, "other_person", "and its banner");
  assert.equal(resumed.answers.when, undefined);
  assert.match(M.copyText(ctx(), M.stepOf(skill, "review_next").title, run([pick("how", "did_it"), next, pick("help", "not_really"), next], ctx(), back)), /If you're not safe now, call/);
  // Too loud with a hopeless word: someone to talk to, there too.
  const loud = run([pick("feel", "despair"), next, pick("ready", "too_loud"), next]);
  assert.equal(loud.stepId, "not_now");
  assert.deepEqual(M.stepLinks(ctx(), M.stepOf(skill, "not_now"), loud).map((l) => l.exit.id), ["safety_open"]);
  assert.deepEqual(M.stepLinks(ctx(), M.stepOf(skill, "not_now"), run([pick("feel", "anxious"), next, pick("ready", "too_loud"), next])), []);
  // Running low: stop, and nothing that calms down (Look after the basics is planned; 5-4-3-2-1 orients outward).
  const low = run([...READY, pick("problem", "fear-anticipatory"), next, pick("barrier", "know-but-cant"), next, pick("sub", "cant-no-energy"), next]);
  assert.equal(values("go", low)[0], "rest");
  const rest = run([pick("go", "rest"), next], ctx(), low);
  assert.equal(rest.stepId, "rest");
  assert.deepEqual(rest.offered, ["five_senses"]);
  // A word routed in from outside the graph's problem-solve words keeps its name: no parent named on screen.
  const busy = run([pick("feel", "busy"), next, pick("ready", "can"), next]);
  assert.match(M.copyText(ctx(), M.stepOf(skill, "problem").title, busy), /^Something is asking a lot of you/);
  // Everything piling up: own words for the foothold too.
  const tri = run([pick("problem", "piling"), next, own("focus", "the deadline"), next], ctx(), busy);
  assert.equal(tri.stepId, "barrier");
  assert.deepEqual(M.fieldLinks(ctx(), M.stepOf(skill, "triage").fields[0], tri).map((l) => l.exit.id), ["safety_open"]);
  assert.deepEqual(values("solutions", run([pick("barrier", "not-sure-what"), next], ctx(), tri)), [...ps.directions["fear-anticipatory"].map((d) => d.id), "own"]);
});

test("every dead link of the old page is a planned exit until its tool ships: recorded, never offered or linked", () => {
  const planned = skill.exits.filter((x) => x.planned).map((x) => x.toolId);
  assert.ok(!planned.includes("let-it-be"), "Let it be shipped (DT-04)");
  assert.ok(!planned.includes("give"), "Keep it warm shipped (IE-06)");
  for (const t of ["dialectics", "please-skill", "build-mastery", "willingness", "turning-the-mind", "self-validate"]) {
    assert.ok(planned.includes(t), t);
  }
  const tools = readFileSync("src/data/tools.ts", "utf8");
  for (const x of skill.exits.filter((e) => e.toolId && !e.planned)) assert.match(tools, new RegExp(`id: '${x.toolId}'`), x.toolId);
});

test("the final gate pass: a hopeless word keeps someone to talk to on every hand-off; the danger path's *I didn't* is never a lesson", () => {
  const hopeless = run([pick("feel", "powerless"), next]);
  const plain = run([pick("feel", "anxious"), next]);
  const handoffs = skill.steps.filter((st) => st.kind === "handoff");
  assert.deepEqual(handoffs.map((st) => st.id).sort(), ["accept", "commit", "not_fit", "not_now", "rest", "review_done", "review_later"]);
  for (const st of handoffs) {
    assert.ok(M.stepLinks(ctx(), st, hopeless).some((l) => l.exit.id === "safety_open"), `${st.id}: Talk to someone now`);
    assert.ok(!M.stepLinks(ctx(), st, plain).some((l) => l.exit.id === "safety_open"), `${st.id}: only for a hopeless word`);
  }
  const g = ps.directions["fear-safety-threat"][0];
  const at = run([...READY, pick("problem", "fear-safety-threat"), next, pick("solutions", g.id), next, pick("size", `${g.id}:small`), next, pick("when", "today")]);
  const back = M.resumeRun(ctx(), M.runRecord(ctx(), at), "review");
  for (const how of ["didnt", "did_part"]) {
    const s = run([pick("how", how), next], ctx(), back);
    assert.equal(s.stepId, "review_next");
    const t = M.copyText(ctx(), M.stepOf(skill, "review_next").title, s);
    assert.match(t, /If you're not safe now, call/, how);
    assert.doesNotMatch(t, /next time/, how);
  }
  // Off the danger path the plain copy stays.
  assert.match(skill.copy.review_next_didnt, /next time/);
});

test("Decide if this can be repaired: Ending a relationship only on the stay-or-leave step, behind Cope Ahead, never leading a repair step", () => {
  const dir = ps.directions["jealousy-broken-trust"].find((d) => d.id === "jealousy-trust-decide");
  assert.equal(dir.linkedToolId, "ending-relationships");
  const base = run([pick("feel", "jealous"), next, pick("ready", "can"), next, pick("problem", "jealousy-broken-trust"), next, pick("barrier", "not-sure-what"), next]);
  const sol = base.stepId === "solutions" ? base : run([next], ctx(), base);
  assert.equal(sol.stepId, "solutions");
  const at = (size) => run([pick("solutions", dir.id), next, pick("size", `${dir.id}:${size}`), next], ctx(), sol);
  assert.equal(at("small").stepId, "commit");
  assert.deepEqual(at("small").offered, [], "an honest question about repair gets no push to end it");
  assert.deepEqual(at("medium").offered, ["cope_ahead"]);
  assert.deepEqual(at("bigger").offered, ["cope_ahead", "ending_relationships"], "the choice itself: Ending second");
  // Another direction's bigger step never offers it.
  const other = ps.directions["jealousy-broken-trust"].find((d) => d.id !== dir.id && d.linkedToolId !== "ending-relationships");
  const o = run([pick("solutions", other.id), next, pick("size", `${other.id}:bigger`), next], ctx(), sol);
  assert.ok(!o.offered.includes("ending_relationships"));
});
