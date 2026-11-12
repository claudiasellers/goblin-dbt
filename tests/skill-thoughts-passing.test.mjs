// Thoughts passing through (PRD DT-08; mindfulness of current thoughts: DBT DT Handout 15;
// docs/design/thoughts-passing.md) on the skill runtime: catch the thought, file it as a kind of thought, one way to
// hold it further off, back to the room, the close asked in the flow. A replay and a thought that isn't their own are
// routes to grounding, never watched. Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "thoughts_passing");
const embedOutputs = {
  doseTimer: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
  boundaryLine: { ids: ["copied"] },
  orientFind: { ids: ["done", "partly", "skipped"], measures: ["doneCount"] },
};
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const timed = { type: "embedDone", output: { ids: ["done"], durationSec: 30 } };
const found = { type: "embedDone", output: { ids: ["done"], doneCount: 3 } };
const read = { type: "embedDone", output: { ids: [] } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s);
const ids = (s, step, c = ctx()) => {
  const f = M.shownFields(c, M.stepOf(skill, step), s)[0];
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const FLOODED = ctx({ band: "flooded" });
const TO_MOVE = (kind = "judgement") => [pick("catch", "thought_too_much"), next, pick("file", kind), next];
const TO_CLOSE = (kind) => [...TO_MOVE(kind), pick("move", "slow"), next, timed, found];

test("the skill: tool thoughts-passing, its own concept, its close asked in the flow, played by the player", () => {
  assert.equal(skill.toolId, "thoughts-passing");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_mindfulness_current_thoughts"\}\), \(s:Skill \{id: "thoughts_passing"\}\)/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'thoughts-passing': 'thoughts_passing',/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'thoughts-passing',\n\s+name: 'Thoughts passing through',/);
  assert.match(tools, /label: 'A thought feels like a fact', toolId: 'thoughts-passing'/);
  for (const f of ["src/lib/spine/close.ts", "functions/src/spine/tools.ts"])
    assert.match(readFileSync(f, "utf8"), /'thoughts-passing': \{ module: 'dt', closeKind: 'regulation_down' \}/, f);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_mindfulness_current_thoughts", t: "thoughts-passing"\}/);
  assert.match(readFileSync("schema/relationships.cypher", "utf8"), /dbt_mindfulness_current_thoughts"\}\), \(mod:TherapyConcept \{id: "dbt_distress_tolerance"\}\)/);
  assert.equal(M.stepOf(skill, "close").fields[0].askFresh, "thenVsNow");
});

test("catch it: DEAR MAN's thought patterns (the same nodes) and a few general ones, or their own words", () => {
  const catchIds = ids(M.initialRun(skill), "catch");
  assert.deepEqual(catchIds.slice(0, 5), ["thought_too_much", "thought_my_fault", "thought_cant_handle", "thought_wrong", "thought_will_leave"], "only the ones that read outside an ask");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /PRESENTS\]->\(:ThoughtPattern|ThoughtPattern \{id: "thought_too_much"\}/);
  assert.equal(run([pick("catch", "hate_me"), next]).stepId, "file");
  assert.equal(run([own("catch", "I ruin everything"), next]).stepId, "file", "their own words count as the pick");
  assert.ok(skill.ownMax <= 60);
});

test("a carried flooded reading: a heads-up first, the body or try it anyway", () => {
  const h = run([pick("catch", "thought_too_much"), next], FLOODED);
  assert.equal(h.stepId, "heads_up");
  const body = run([pick("heads_up", "body"), next], FLOODED, h);
  assert.equal(body.stepId, "settle");
  assert.ok(M.stepOf(skill, "settle").noClose);
  assert.deepEqual(offers(body, FLOODED), ["cool_down"]);
  assert.equal(skill.exits.find((x) => x.id === "cool_down").toolId, "cool-down");
  assert.equal(run([pick("heads_up", "try"), next], FLOODED, h).stepId, "file");
});

test("file it: six kinds of thought; a replay and a thought not their own are routes to grounding, never watched", () => {
  assert.deepEqual(ids(run([pick("catch", "thought_wrong"), next]), "file"),
    ["judgement", "prediction", "ought", "about_me", "about_them", "memory", "replay", "not_mine", "harm"]);
  for (const k of ["judgement", "prediction", "memory", "ought", "about_them", "about_me"])
    assert.equal(run(TO_MOVE(k)).stepId, "move", k);
  for (const k of ["replay", "not_mine"]) {
    const s = run(TO_MOVE(k));
    assert.equal(s.stepId, k);
    assert.ok(M.stepOf(skill, k).noClose, `${k}: no close question`);
    assert.deepEqual(offers(s), ["five_senses", "safety_open"]);
  }
  // A thought about hurting themselves gets no exercise: the crisis banner and someone to talk to (voice.md S9).
  const harm = run(TO_MOVE("harm"));
  assert.equal(harm.stepId, "harm");
  assert.ok(M.stepOf(skill, "harm").noClose);
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "harm"), harm)?.variant, "crisis");
  assert.deepEqual(offers(harm), ["safety_open"]);
  assert.match(skill.copy.replay_line, /someone trained in trauma/);
  assert.match(skill.copy.not_mine_line, /a doctor, or your care team if you have one/);
  assert.equal(skill.exits.find((x) => x.id === "five_senses").toolId, "five-senses");
});

test("one way to hold it further off, each to the room, then the close; silly voices are left out", () => {
  const m = run(TO_MOVE());
  assert.deepEqual(ids(m, "move"), ["having", "slow", "leaf", "screen"]);
  assert.doesNotMatch(skill.copy.leaf_step2 + skill.copy.leaf_step3, /float off/, "at its own pace: watching, not pushing it away");
  assert.doesNotMatch(skill.options.move.map((o) => o.label).join(" "), /voice/i);
  // I'm having the thought that…: their thought on paper, then the frame in front of it.
  const h = run([pick("move", "having"), next], ctx(), m);
  assert.equal(h.stepId, "having");
  assert.equal(M.stepOf(skill, "having").props.field, "catch");
  const f = run([read], ctx(), h);
  assert.equal(f.stepId, "frame");
  assert.equal(run([timed], ctx(), f).stepId, "room");
  for (const [mv, sec] of [["slow", 30], ["leaf", 45], ["screen", 45]]) {
    const s = run([pick("move", mv), next], ctx(), m);
    assert.equal(s.stepId, mv);
    assert.equal(M.stepOf(skill, mv).embed, "doseTimer");
    assert.equal(M.stepOf(skill, mv).props.seconds, sec);
    const room = run([timed], ctx(), s);
    assert.equal(room.stepId, "room");
    assert.equal(M.stepOf(skill, "room").embed, "orientFind");
    assert.equal(run([found], ctx(), room).stepId, "close");
  }
});

test("the close in the flow: louder → the body first; as loud still counts, and Check the Facts when it might not be true", () => {
  const c = run(TO_CLOSE("prediction"));
  assert.deepEqual(ids(c, "close"), ["worse", "same", "better", "much_better"], "the order First, the body and Let it be use");
  assert.deepEqual(skill.options.tvn.map((o) => o.label), ["Louder", "About as loud", "A bit further away", "Much further away"]);
  const louder = run([pick("close", "worse"), next], ctx(), c);
  assert.equal(louder.stepId, "louder");
  assert.deepEqual(M.askFresh(ctx(), louder), { thenVsNow: "worse" });
  assert.deepEqual(offers(louder), ["cool_down"]);
  const same = run([pick("close", "same"), next], ctx(), c);
  assert.equal(same.stepId, "end");
  assert.deepEqual(offers(same), ["check_the_facts"]);
  assert.equal(M.handoffLine(ctx(), M.stepOf(skill, "end"), same), skill.copy.end_same_facts, "one line: the card shows the first match");
  assert.equal(skill.exits.find((x) => x.id === "check_the_facts").toolId, "check-the-facts");
  // A memory isn't something to fact-check.
  assert.deepEqual(offers(run([...TO_CLOSE("memory"), pick("close", "same"), next])), []);
  const further = run([pick("close", "better"), next], ctx(), c);
  assert.equal(M.handoffLine(ctx(), M.stepOf(skill, "end"), further), skill.copy.end_further);
  assert.deepEqual(offers(further), []);
  for (const id of ["louder", "end"]) assert.ok(!M.stepOf(skill, id).noClose, `${id}: after the in-flow close`);
});

test("every screen has a quiet way to someone; nothing argues with the thought or asks the person to close their eyes", () => {
  for (const st of skill.steps) {
    const links = [...(st.links ?? []), ...(st.fields ?? []).flatMap((f) => f.links ?? [])];
    assert.ok(links.some((l) => l.exit === "safety_open"), st.id);
  }
  const all = Object.values(skill.copy).join(" ");
  assert.doesNotMatch(all, /close your eyes|\bshould\b|!|not true|isn't true|not a fact|irrational|distort/i);
});

test("the hosts that hand on to it: Let it be's willful threat and the DEAR MAN debrief's worry", () => {
  const lib = content.skills.find((s) => s.id === "let_it_be");
  assert.equal(lib.exits.find((x) => x.id === "thoughts").toolId, "thoughts-passing");
  const threat = M.stepOf(lib, "end").offers.find((o) => o.exit === "thoughts").when;
  assert.deepEqual(threat, { all: [{ set: "$a.threat" }, { not: { eq: ["$a.close", "worse"] } }] }, "after Louder, the body first, not a thought to watch");
  const dm = content.skills.find((s) => s.id === "dear_man_debrief");
  assert.equal(dm.exits.find((x) => x.id === "thoughts").toolId, "thoughts-passing");
  assert.deepEqual(M.stepOf(dm, "fix").offers.find((o) => o.exit === "thoughts").when, { eq: ["$a.factor", "belief"] });
});
