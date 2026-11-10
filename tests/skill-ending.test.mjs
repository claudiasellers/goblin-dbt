// Ending a relationship that's hurting you (IE-08, DBT IE Handout 13) on the skill runtime, pinned against PRD
// IE-08 and docs/design/ending-relationships.md: safety first, always; the safety branch (the other-person
// resources, no scripts, no rehearsal, no check-ins, nothing saved unless saved privately: R15); body first when
// flooded; Handout 13's categories; try to change it first when it isn't harmful; Not yet as a real answer; the
// plan (channel, one line, the decision plainly, logistics only, the card, when, an opt-in check-in); the after
// check-in re-entering at `after` (resumeAt). Every rule is a row, tested through the pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const shipped = JSON.parse(readFileSync("src/data/content/skills.json", "utf8")).content;
const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
const tools = readFileSync("src/data/tools.ts", "utf8");
const skill = content.skills.find((s) => s.id === "ending_relationships");
const embedOutputs = { boundaryLine: { ids: ["copied"] } };
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs });

function run(events, c = ctx()) {
  let s = M.initialRun(skill);
  for (const e of events) s = M.runNext(c, s, e);
  return s;
}
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const card = (ids = []) => ({ type: "embedDone", output: { ids } });
const step = (id) => skill.steps.find((s) => s.id === id);
const answer = (id, v) => [pick(id, v), next];

const safe = answer("safety", "no");
const toDecide = (what = "harms", safety = safe) => [...safety, ...answer("what", what)];
const toCard = (decide = "end") => [...toDecide(), ...answer("decide", decide), ...answer("channel", "message"),
  ...answer("open_line", "thinking"), ...answer("decision_line", decide === "end" ? "ending" : "less_contact"), next];
const unsafe = (v = "maybe") => [...answer("safety", v), ...answer("go", "think")];

test("the screens, and the safe path to the plan: safety, what, decide, channel, the lines, the card, when, ahead", () => {
  assert.equal(skill.toolId, "ending-relationships");
  assert.equal(skill.start, "safety");
  const s = run([...toCard(), card(["copied"]), ...answer("checkin", "yes"), ...answer("when", "this_week")]);
  assert.deepEqual(s.path, ["safety", "what", "decide", "channel", "open_line", "decision_line", "practical", "card", "checkin", "when", "ahead"]);
  assert.deepEqual(s.offered, ["cope_ahead"], "rehearse is planned (IE-02), so only Cope Ahead shows");
  assert.equal(skill.exits.find((x) => x.id === "cope_ahead").query.first, "conversation");
  assert.equal(M.crisisFor(ctx(), step("ahead"), s), null, "no resources on the safe path");
});

test("safety first, always: every answer but No is the safety branch, with the other-person resources", () => {
  assert.deepEqual(skill.options.safety.map((o) => o.value), ["no", "maybe", "yes", "rather_not"]);
  for (const v of ["maybe", "yes", "rather_not"]) {
    const s = run(answer("safety", v));
    assert.equal(s.stepId, "safe_first", v);
    assert.equal(M.crisisFor(ctx(), step("safe_first"), s)?.variant, "other_person", v);
  }
  // Nothing is locked: the person can still think it through, with the resources on every screen after.
  const s = run([...unsafe(), pick("what", "harms")]);
  assert.equal(s.stepId, "what");
  for (const id of ["what", "try_first", "change", "decide", "save", "advocate", "steady"]) {
    assert.equal(M.crisisFor(ctx(), step(id), s)?.variant, "other_person", id);
  }
  // That's enough for now: a calm ending, with the resources, and no close question.
  const done = run([...answer("safety", "yes"), ...answer("go", "enough")]);
  assert.equal(done.stepId, "safe_done");
  assert.equal(step("safe_done").noClose, true);
  assert.equal(M.crisisFor(ctx(), step("safe_done"), done)?.variant, "other_person");
});

test("the safety branch never plans the conversation: no script, no rehearsal, no cope ahead, no check-in", () => {
  for (const decide of ["end", "step_back", "not_yet"]) {
    const s = run([...unsafe(), ...answer("what", "harms"), ...answer("decide", decide)]);
    assert.equal(s.stepId, "save", decide);
    const end = run([...unsafe(), ...answer("what", "harms"), ...answer("decide", decide), ...answer("save", "yes")]);
    assert.equal(end.stepId, "advocate", decide);
    assert.deepEqual(end.offered, [], `${decide}: advocates, never a script`);
    for (const id of ["channel", "open_line", "decision_line", "practical", "card", "when", "ahead", "not_yet"]) {
      assert.ok(!end.path.includes(id), `${decide}: ${id}`);
    }
  }
  assert.equal(step("advocate").noClose, true);
  const notYet = run([...unsafe(), ...answer("what", "harms"), ...answer("decide", "not_yet"), ...answer("save", "no")]);
  assert.match(M.handoffLine(ctx(), step("advocate"), notYet), /Whenever you want to plan anything/);
  // Hard right now or interfering, while unsafe: no invitation to work on it; straight to the decision.
  for (const what of ["hard", "interferes"]) assert.equal(run([...unsafe(), ...answer("what", what)]).stepId, "decide", what);
  // Stay and work on it, while unsafe: saved or not first, then advocates (never DEAR MAN, GIVE or Problem Solve).
  const stay = run([...unsafe(), ...answer("what", "hard"), ...answer("decide", "work_on")]);
  assert.equal(stay.stepId, "save");
  // The change hand-off itself, if a forced unsafe state reached it: no offers, the planning-safely line.
  const forced = { answers: { safety: { ids: ["yes"], own: null } } };
  assert.deepEqual(M.offersFor(ctx(), step("change"), forced), []);
  assert.match(M.handoffLine(ctx(), step("change"), forced), /safely/);
  // No Wise mind or pros-and-cons link in the branch (Wise mind saves what's written there).
  const unsure = run([...unsafe(), pick("what", "unsure")]);
  assert.deepEqual(M.fieldLinks(ctx(), step("what").fields[0], unsure), []);
  const deciding = run([...unsafe(), ...answer("what", "harms")]);
  assert.deepEqual(M.fieldLinks(ctx(), step("decide").fields[0], deciding), []);
  // No step with a check-in or a keep is reachable from the branch (build.py also refuses a keep or follow-up at or
  // before persist.after).
  for (const st of skill.steps) assert.equal(st.keep, undefined, st.id);
});

test("persist-nothing (R15): nothing before the safety answer; nothing in the safety branch unless saved privately", () => {
  assert.equal(skill.quickExit, true, "a quick exit on every screen");
  assert.deepEqual(skill.persist.after, "safety");
  assert.equal(M.persistence(ctx(), M.initialRun(skill)), "wait", "the first screen writes nothing");
  assert.equal(M.persistence(ctx(), run([pick("safety", "no")])), "wait", "a pick isn't the answer until Next");
  assert.equal(M.persistence(ctx(), run(safe)), "save");
  for (const v of ["maybe", "yes", "rather_not"]) {
    assert.equal(M.persistence(ctx(), run(answer("safety", v))), "nothing", v);
  }
  const branch = [...unsafe(), ...answer("what", "harms"), ...answer("decide", "end")];
  assert.equal(M.persistence(ctx(), run([...branch, ...answer("save", "no")])), "nothing", "Leave it unsaved");
  assert.equal(M.persistence(ctx(), run([...branch, ...answer("save", "yes")])), "save", "Save it to my account");
  assert.deepEqual(skill.options.save.map((o) => [o.value, o.label]), [["no", "Leave it unsaved"], ["yes", "Save it to my account"]],
    "leaving it unsaved is the first choice");
  // Going back to the first screen waits again: nothing is decided while the question is open.
  const back = M.runNext(ctx(), run(answer("safety", "yes")), { type: "back" });
  assert.equal(back.stepId, "safety");
  assert.equal(M.persistence(ctx(), back), "wait");
});

test("a run that writes nothing schedules nothing, even where a step would", () => {
  const notYet = (safety) => [...safety, ...answer("what", "unsure"), ...answer("decide", "not_yet"), pick("revisit", "yes")];
  const s = run(notYet(safe));
  assert.equal(s.stepId, "not_yet");
  assert.deepEqual(M.followUpFor(ctx(), step("not_yet"), s), { type: "ending_revisit", chip: null });
  // A forced unsafe state on the same step (unreachable in the flow): still nothing.
  const forced = { ...s, answers: { ...s.answers, safety: { ids: ["yes"], own: null } } };
  assert.equal(M.followUpFor(ctx(), step("not_yet"), forced), null);
});

test("body first when flooded (a carried or host band), then on; never asked or inferred", () => {
  assert.deepEqual(skill.accepts, ["band", "frame"]);
  const flooded = ctx({ band: "flooded" });
  const s = run(safe, flooded);
  assert.equal(s.stepId, "steady");
  const links = M.fieldLinks(flooded, step("steady").fields[0], s).map((l) => l.exit.id);
  assert.deepEqual(links, ["cool_down", "pause"]);
  assert.equal(run([...safe, ...answer("first", "anyway")], flooded).stepId, "what");
  // The safety branch comes first, flooded or not.
  assert.equal(run(answer("safety", "maybe"), flooded).stepId, "safe_first");
  assert.equal(run(unsafe(), flooded).stepId, "steady");
  assert.equal(run(safe, ctx({ band: "stirred" })).stepId, "what");
});

test("IE Handout 13: harmful, interfering, hard right now, not sure; not destructive tries to change it first", () => {
  assert.deepEqual(skill.options.what.map((o) => o.value), ["harms", "interferes", "hard", "unsure"]);
  assert.equal(run(toDecide("harms")).stepId, "decide");
  assert.equal(run(toDecide("interferes")).stepId, "try_first", "H13: repair an interfering relationship first");
  assert.equal(run(toDecide("hard")).stepId, "try_first");
  const change = run([...toDecide("hard"), ...answer("try", "try")]);
  assert.equal(change.stepId, "change");
  assert.deepEqual(change.offered, ["dear_man", "problem_solve"], "GIVE is planned (IE-06)");
  assert.equal(run([...toDecide("hard"), ...answer("try", "still")]).stepId, "decide");
  // Not sure: wise mind as a link (pros and cons planned); the decision's title says it's OK not to know.
  const unsure = run([...safe, pick("what", "unsure")]);
  assert.deepEqual(M.fieldLinks(ctx(), step("what").fields[0], unsure).map((l) => l.exit.id), ["wise_mind"]);
  const decide = run(toDecide("unsure"));
  assert.match(M.copyText(ctx(), step("decide").title, decide), /OK not to know/);
  // Decide from wise mind (PRD #12): the link on the decision, for everyone who is safe.
  assert.deepEqual(M.fieldLinks(ctx(), step("decide").fields[0], run(toDecide("harms"))).map((l) => l.exit.id), ["wise_mind"]);
  // Staying is an answer too: it goes to trying to change it.
  assert.equal(run([...toDecide("harms"), ...answer("decide", "work_on")]).stepId, "change");
  // Harmful: the channel question says a message is often safer.
  assert.match(M.copyText(ctx(), step("channel").title, run([...toDecide("harms"), ...answer("decide", "end")])), /a message is often safer/);
  assert.equal(M.copyText(ctx(), step("channel").title, run([...toDecide("interferes"), ...answer("try", "still"), ...answer("decide", "end")])), "How will you tell them?");
});

test("Not yet is a real answer: accepted, with an optional check-in in two weeks that opens a fresh visit", () => {
  assert.deepEqual(skill.options.decide.map((o) => o.value), ["end", "step_back", "work_on", "not_yet"]);
  const s = run([...toDecide(), ...answer("decide", "not_yet"), ...answer("revisit", "no")]);
  assert.equal(s.stepId, "not_yet_done");
  assert.ok(!s.path.includes("channel"));
  const t = spine.followUpTypes.find((x) => x.id === "ending_revisit");
  assert.equal(t.deepLinkTemplate, "/tool/ending-relationships?followUp={followUpId}", "from the start: safety asked again, nothing filled in");
});

test("the decision line matches the decision; the card is the lines in order, copyable, never locked", () => {
  const lines = (decide) => {
    const s = run([...toDecide(), ...answer("decide", decide), ...answer("channel", "call"), ...answer("open_line", "thinking")]);
    return M.optionGroups(ctx(), step("decision_line").fields[0], s.answers).flatMap((g) => g.options.map((o) => o.value));
  };
  assert.deepEqual(lines("end"), ["ending", "made_up"]);
  assert.deepEqual(lines("step_back"), ["less_contact", "space"]);
  const c = step("card");
  assert.equal(c.embed, "boundaryLine");
  assert.deepEqual([c.props.field, c.props.field2, c.props.field3, c.props.shape], ["open_line", "decision_line", "practical", "line"]);
  const s = run([...toDecide(), ...answer("decide", "end"), ...answer("channel", "message"), ...answer("open_line", "honest"),
    own("decision_line", "I'm done, and I'm sure."), next, pick("practical", "things"), next]);
  assert.equal(s.stepId, "card");
  const picked = M.pickedLabels(ctx(), s);
  assert.deepEqual([...picked.open_line, ...picked.decision_line, ...picked.practical],
    ["I care about you, and I need to be honest with you.", "I'm done, and I'm sure.", "I'll arrange to get my things back."]);
  // Practical is optional: the card shows with nothing there.
  assert.equal(run(toCard()).stepId, "card");
  // No line in the content apologises or explains (FAST); none says the person should leave.
  for (const o of [...skill.options.open_line, ...skill.options.decision_line, ...skill.options.practical]) {
    assert.doesNotMatch(o.label, /sorry|because|should/i, o.value);
  }
  for (const [k, v] of Object.entries(skill.copy)) assert.doesNotMatch(v, /\bshould\b|\bjust\b|!/, k);
});

test("the after check-in is opt-in and content-free; it re-enters at `after`, asking again", () => {
  const s = run([...toCard(), card(), ...answer("checkin", "no"), ...answer("when", "today")]);
  assert.equal(M.followUpFor(ctx(), step("when"), run([...toCard(), card(), ...answer("checkin", "no"), pick("when", "today")])), null);
  assert.equal(s.stepId, "ahead");
  const yes = run([...toCard(), card(), ...answer("checkin", "yes"), pick("when", "today")]);
  assert.deepEqual(M.followUpFor(ctx(), step("when"), yes), { type: "ending_after", chip: "today" });
  for (const id of ["ending_after", "ending_again", "ending_revisit"]) {
    const t = spine.followUpTypes.find((x) => x.id === id);
    assert.ok(t, id);
    assert.equal(t.ownerModule, "ie");
    assert.deepEqual([t.copy.title, t.copy.body], ["A check-in you asked for", "Open it when you're ready."], `${id}: says nothing about what it's for`);
    assert.deepEqual(t.notify, { push: false, inTab: true, ics: false }, `${id}: never a push or a calendar file`);
  }
  // The check-in opens the run at `after`, off its path (resumeAt).
  assert.deepEqual(skill.resumeAt, ["after"]);
  const rec = M.runRecord(ctx(), s);
  const back = M.resumeRun(ctx(), rec, "after");
  assert.equal(back.stepId, "after");
  assert.deepEqual(back.path.slice(-2), ["ahead", "after"]);
  assert.equal(M.persistence(ctx(), back), "save");
  // A step not named in resumeAt and not on the path doesn't open.
  assert.equal(M.resumeRun(ctx(), rec, "after_next").stepId, "ahead");
  // Asked again: a later check-in never fills in the last one's answer.
  const answered = M.runNext(ctx(), M.runNext(ctx(), back, pick("after", "pull")), pick("again", "week"));
  const again = M.resumeRun(ctx(), M.runRecord(ctx(), M.runNext(ctx(), answered, next)), "after");
  assert.equal(again.stepId, "after");
  assert.equal(again.answers.after, undefined);
  assert.equal(again.answers.again, undefined);
  assert.equal(again.answers.decide.ids[0], "end", "the run's own earlier answers stay");
});

test("after: the pull back is expected; going back isn't failure; I don't feel safe is the safety branch", () => {
  const back = M.resumeRun(ctx(), M.runRecord(ctx(), run([...toCard(), card(), ...answer("checkin", "yes"), ...answer("when", "today")])), "after");
  const at = (v, again) => {
    let s = M.runNext(ctx(), back, pick("after", v));
    if (again) s = M.runNext(ctx(), s, pick("again", again));
    return M.runNext(ctx(), s, next);
  };
  const pull = at("pull", "week");
  assert.equal(pull.stepId, "after_next");
  assert.deepEqual(pull.offered, ["opposite_action"], "finding connection and let it be are planned");
  assert.match(M.handoffLine(ctx(), step("after_next"), pull), /pull back is expected/);
  assert.match(M.handoffLine(ctx(), step("after_next"), at("went_back")), /Going back happens/);
  const unsafeNow = at("unsafe");
  assert.equal(unsafeNow.stepId, "after_unsafe");
  assert.equal(M.crisisFor(ctx(), step("after_unsafe"), unsafeNow)?.variant, "other_person");
  assert.equal(step("after_unsafe").noClose, true);
  // ...and nothing from that check-in is saved (R15), though the first visit's answer was No.
  assert.equal(M.persistence(ctx(), unsafeNow), "nothing");
  assert.equal(M.persistence(ctx(), pull), "save");
  // A really bad place: the crisis slot and safety.open, no further check-in; a quiet link there on every answer.
  const low = at("low");
  assert.equal(low.stepId, "after_low");
  assert.equal(M.crisisFor(ctx(), step("after_low"), low)?.variant, "crisis");
  assert.deepEqual(low.offered, ["safety_open"]);
  assert.equal(M.crisisFor(ctx(), step("after"), M.runNext(ctx(), back, pick("after", "low")))?.variant, "crisis");
  assert.deepEqual(M.fieldLinks(ctx(), step("after").fields[0], back).map((l) => l.exit.id), ["safety_open"]);
  // I don't feel safe: no "another check-in?", and nothing scheduled.
  const asked = M.runNext(ctx(), back, pick("after", "unsafe"));
  assert.deepEqual(M.shownFields(ctx(), step("after"), asked).map((f) => f.id), ["after"]);
  assert.equal(M.followUpFor(ctx(), step("after"), M.runNext(ctx(), asked, pick("again", "week"))), null);
  assert.deepEqual(M.followUpFor(ctx(), step("after"), M.runNext(ctx(), M.runNext(ctx(), back, pick("after", "holding")), pick("again", "month"))),
    { type: "ending_again", chip: "month" });
});

test("listed for everyone under Interpersonal Effectiveness; deferred session; no close question; no routing rows", () => {
  assert.match(tools, /id: 'ending-relationships'[\s\S]*?deferSession: true/);
  assert.equal(shipped.skills.some((s) => s.id === "ending_relationships" && s.quickExit === true && s.persist?.after === "safety"), true,
    "the runtime switches ship in skills.json");
  const rf = readFileSync("schema/recommended-for.cypher", "utf8");
  assert.doesNotMatch(rf, /dbt_ending_relationships/, "PRD: no intent row; never a check-in card");
});

test("quick exit replaces the page with a neutral one; the player shows it on every step and begins the visit late", async () => {
  const q = await importTs("src/lib/quickExit.ts");
  const went = [];
  q.quickExit((url) => went.push(url));
  assert.deepEqual(went, ["https://www.google.com/search?q=weather"]);
  assert.match(readFileSync("src/lib/quickExit.ts", "utf8"), /window\.location\.replace\(url\)/, "replace, so Back doesn't return here");
  const player = readFileSync("src/components/skillPlayer/SkillPlayer.tsx", "utf8");
  assert.match(player, /\{skill\.quickExit && !inline && <QuickExit \/>\}/);
  // R15 in the player: the visit begins only at the run's end or a check-in, and only when the run may save.
  assert.match(player, /if \(persist === 'save' && step\.complete\) toolSession\.begin\(\);/);
  assert.match(player, /toolSession\.begin\(\);\n\s+if \(!\(await toolSession\.ready\(\)\)\) throw new Error\('no session'\);/);
  assert.equal((player.match(/toolSession\.begin\(\)/g) ?? []).length, 3, "the end, a check-in, a keep");
  assert.match(player, /toolSession\.setBare\(persist !== 'save'\);/, "bare while waiting on the first question again");
  const provider = readFileSync("src/contexts/ToolSessionContext.tsx", "utf8");
  assert.match(provider, /if \(!uid \|\| !begun\.current \|\| started\.current \|\| closed\.current\) return;/, "never begun, never written");
  assert.match(provider, /persisted: uid !== null && !deferStart/);
});

test("from Rebel's someone I'm scared of (frame=careful): the safety branch whatever the answer (D4, C6.6)", () => {
  const careful = ctx({ frame: "careful" });
  assert.match(M.copyText(careful, step("safety").title, M.initialRun(skill)), /Earlier you said you're scared of them/);
  const s = run(safe, careful);
  assert.equal(s.stepId, "safe_first", "No here doesn't undo what they said in Rebel");
  assert.equal(M.persistence(careful, s), "nothing");
  const end = run([...safe, ...answer("go", "think"), ...answer("what", "harms"), ...answer("decide", "end")], careful);
  assert.equal(end.stepId, "save", "never a script");
  const rebel = content.skills.find((x) => x.id === "alternate_rebellion");
  assert.deepEqual(rebel.exits.find((x) => x.id === "ending").query, { frame: "careful" }, "a word that says nothing in the address bar");
  assert.equal(M.contextIn(skill, { frame: "careful" }).frame, "careful");
});
