// Rehearse it (PRD IE-02, DBT IE Handouts 5, 6 and 8; docs/design/rehearse.md) on the skill runtime, part 1: who first
// (the picker's safety route never reaches the skill), the kind of conversation, the first line, how they'll respond
// (band-gated, practising a way out always there), the stage (src/lib/rehearsal.ts, pure), an if-then after the
// hardest version, the close in the flow, and the way on. Tested through the pure machine and the stage's pure lib.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const R = await importTs("src/lib/rehearsal.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "rehearse");
const OUT = { rehearsalStage: { ids: ["again", "acknowledge", "name", "middle", "turn", "break", "done", "aloud", "finished", "stopped", "lost_it", "stepped_out"], measures: ["doneCount"] } };
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs: OUT, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const stage = (ids) => ({ type: "embedDone", output: { ids, doneCount: 3 } });
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const title = (s, c = ctx()) => M.copyText(c, M.stepOf(skill, s.stepId).title, s, M.titleSlots(c, M.stepOf(skill, s.stepId), s));
const line = (s, c = ctx()) => M.handoffLine(c, M.stepOf(skill, s.stepId), s);
const values = (s, fieldId, c = ctx()) => {
  const f = M.stepOf(skill, s.stepId).fields.find((x) => x.id === fieldId);
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s);
const toStage = (kind = "ask", tier = "realistic", c = ctx()) => run([pick("kind", kind), next, pick("line", `${kind}_1`), next, pick("tier", tier), next], c);

test("the skill: tool rehearse on the new concept dbt_behavioral_rehearsal, after the person picker, the close in the flow", () => {
  assert.equal(skill.toolId, "rehearse");
  assert.match(readFileSync("schema/knowledge-graph.cypher", "utf8"), /MERGE \(behavioral_rehearsal:TherapyConcept \{id: "dbt_behavioral_rehearsal"\}\)\nSET behavioral_rehearsal \+= \{[^}]*module: "Interpersonal Effectiveness"/);
  assert.match(readFileSync("schema/relationships.cypher", "utf8"), /\{id: "dbt_behavioral_rehearsal"\}\), \(mod:TherapyConcept \{id: "dbt_interpersonal_effectiveness"\}\)\nMERGE \(c\)-\[:PART_OF\]->\(mod\);/);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_behavioral_rehearsal", t: "rehearse"\}/);
  for (const f of ["functions/src/spine/tools.ts", "src/lib/spine/close.ts"]) {
    assert.match(readFileSync(f, "utf8"), /'rehearse': \{ module: 'ie', closeKind: 'regulation_down' \}/, f);
  }
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'rehearse',\n\s+name: 'Rehearse it',[\s\S]*?module: 'interpersonal-effectiveness'/);
  assert.match(tools, /label: 'Practise a hard conversation', toolId: 'rehearse'/, "the PRD's Tools intent");
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'rehearse': \['rehearse'\]/);
  assert.match(readFileSync("src/pages/tools/Rehearse.tsx", "utf8"), /<PersonFirstSkill skillId="rehearse" toolId="rehearse" questionKey="personWhoRehearse" headingKey="safetyRouteRehearseHeading"/);
  for (const f of ["functions/src/profile/types.ts", "src/data/profileTypes.ts"]) assert.match(readFileSync(f, "utf8"), /'rehearse': \['people'\]/, f);
  assert.deepEqual(skill.accepts, ["personId", "band", "situationId", "frame"]);
  assert.equal(M.stepOf(skill, "close").fields[0].askFresh, "thenVsNow");
  assert.match(skill.copy.picker_safetyRouteRehearseHeading, /^With \{who\}, your safety comes before any practice conversation\./);
});

test("the kind of conversation (a host's first), its starter lines or own words", () => {
  const s = M.initialRun(skill);
  assert.equal(title(s), "What's the conversation?");
  assert.deepEqual(values(s, "kind"), ["ask", "say_no", "boundary", "address", "repair"]);
  assert.deepEqual(values(s, "kind", ctx({ situationId: "repair" }))[0], "repair", "first, never picked");
  assert.deepEqual(s.answers, {});
  const ln = run([pick("kind", "say_no"), next]);
  assert.equal(ln.stepId, "line");
  assert.deepEqual(values(ln, "line"), ["say_no_1", "say_no_2", "say_no_3"]);
  assert.ok(M.stepOf(skill, "line").fields[0].own, "own words");
});

test("how they'll respond: chosen by the person, band-gated, practising a way out always there", () => {
  const t = run([pick("kind", "ask"), next, pick("line", "ask_1"), next]);
  assert.equal(t.stepId, "tier");
  assert.deepEqual(values(t, "tier"), ["easy", "realistic", "hardest", "leave"]);
  assert.deepEqual(values(t, "tier", ctx({ band: "stirred" })), ["easy", "realistic", "leave"], "stirred: no hardest");
  assert.deepEqual(values(t, "tier", ctx({ band: "flooded" })), ["easy", "leave"], "flooded: the easy version only, and leaving");
  assert.deepEqual(values(t, "tier", ctx({ frame: "heads_up" })), ["easy", "realistic", "leave"], "it tends to go badly: no hardest version with them");
  assert.equal(skill.copy[M.stepOf(skill, "tier").hint], "You choose how hard. Stopping always counts.");
  assert.equal(line(t, ctx({ frame: "heads_up" })), "With them, practising a calm way out can help too.");
  const fl = ctx({ band: "flooded" });
  assert.match(line(M.initialRun(skill), fl), /^Practising works better once your body settles/);
  assert.deepEqual(M.fieldLinks(fl, M.stepOf(skill, "kind").fields[0], M.initialRun(skill)).map((l) => l.exit.id), ["cool_down", "safety_open"]);
});

test("the scripts: three plain replies for every kind and tier, practising a way out for any kind, moves that exist", () => {
  const turns = skill.options.turn;
  const moves = new Set(skill.options.move.map((m) => m.value));
  const poses = new Set(["open", "neutral", "closer", "arms", "turn_away", "still"]);
  for (const kind of skill.options.kind.map((k) => k.value)) {
    for (const tier of ["easy", "realistic", "hardest"]) {
      const sc = R.scriptFor(turns, kind, tier);
      assert.equal(sc.length, 3, `${kind} ${tier}`);
      for (const t of sc) {
        assert.ok(poses.has(t.pose), t.value);
        assert.ok(t.moves.length >= 2 && t.moves.every((m) => moves.has(m)), t.value);
      }
    }
    assert.equal(R.scriptFor(turns, kind, "leave").length, 3, "practise leaving, whatever the kind");
    // Practising leaving holds the exit through their push (Gate 1): *Say it again* repeats the step-out line.
    assert.deepEqual(R.scriptFor(turns, kind, "leave")[0].moves, ["again", "break", "done"], "a way out, held");
    // Nobody steps closer on the hardest version or the way out (Gate 2: no physical-intimidation cue).
    for (const t of [...R.scriptFor(turns, kind, "hardest"), ...R.scriptFor(turns, kind, "leave")]) assert.notEqual(t.pose, "closer", t.value);
  }
  // A repair never repeats the apology (FAST: no extra apologies); a firm no isn't traded for a middle.
  for (const t of R.scriptFor(turns, "repair", "realistic")) assert.ok(!t.moves.includes("again"), t.value);
  for (const t of R.scriptFor(turns, "say_no", "realistic")) assert.ok(!t.moves.includes("middle"), t.value);
  // No line that re-invalidates (Recover's whole subject).
  for (const t of turns) assert.doesNotMatch(t.label, /too sensitive|big deal out of nothing|overreact/i, t.label);
  // Never abusive (PRD step 5): no slurs, threats or swearing; nothing about hurting anyone.
  for (const t of turns) assert.doesNotMatch(t.label, /\b(hurt|hit|kill|stupid|idiot|hate|shut up|damn|hell)\b/i, t.label);
  assert.ok(R.scriptFor(turns, "ask", "hardest").some((t) => t.moves.includes("lost_it")), "*I'd lose it here* on the hardest version");
});

test("the stage (pure): say it, their reply, your move; Stop and leaving end it; the last reply takes no move", () => {
  const turns = R.scriptFor(skill.options.turn, "ask", "realistic");
  const moves = R.movesFrom(skill.options.move);
  const mv = (id) => moves.find((m) => m.value === id);
  let s = R.startStage("I need help.");
  assert.equal(s.phase, "say");
  s = R.said(s, turns, true);
  assert.equal(s.phase, "their");
  assert.equal(turns[s.at].line, "Can we talk about this later?");
  s = R.moved(s, mv("again"), "I need help.");
  assert.equal(s.yours, "I need help.", "say it again: your own line");
  s = R.said(s, turns, false);
  s = R.moved(s, mv("acknowledge"), "I need help.");
  assert.equal(s.yours, "I hear you. And this still matters to me.");
  s = R.said(s, turns, false);
  assert.ok(R.isLast(s, turns), "their last reply");
  s = R.finished(s, turns);
  assert.deepEqual(R.stageOutput(s), { ids: ["again", "acknowledge", "aloud", "finished"], doneCount: 3 });
  const left = R.moved(R.said(R.startStage("No."), turns, false), mv("break"), "No.");
  assert.equal(left.end, "stepped_out");
  assert.deepEqual(R.stageOutput(R.stopped(R.startStage("No."))), { ids: ["stopped"], doneCount: 0 }, "Stop counts at any point");
  const lost = R.moved(R.said(R.startStage("No."), R.scriptFor(skill.options.turn, "ask", "hardest"), false), mv("lost_it"), "No.");
  assert.deepEqual(R.stageOutput(lost).ids, ["lost_it"]);
});

test("after the hardest version or *I'd lose it here*: one if-then; otherwise straight to the close", () => {
  const st = toStage("boundary", "hardest");
  assert.equal(st.stepId, "stage");
  assert.equal(M.stepOf(skill, "stage").embed, "rehearsalStage");
  assert.equal(run([stage(["acknowledge", "finished"])], ctx(), st).stepId, "ifthen");
  assert.equal(run([stage(["lost_it"])], ctx(), toStage("ask", "realistic")).stepId, "ifthen");
  assert.equal(run([stage(["again", "finished"])], ctx(), toStage("ask", "realistic")).stepId, "close");
  assert.equal(run([stage(["stopped"])], ctx(), st).stepId, "close", "stopping on the hardest version: no if-then");
});

test("the close: stopping counts; then could you say it for real; the way on", () => {
  const stopped = run([stage(["stopped"])], ctx(), toStage());
  assert.equal(title(stopped), "Saying it for real feels…");
  assert.equal(line(stopped), "You stopped. That counts too.");
  const done = run([stage(["again", "finished"])], ctx(), toStage());
  assert.equal(line(done), "You practised it. That counts.");
  assert.deepEqual(skill.options.tvn.map((o) => o.value), ["worse", "same", "better", "much_better"]);
  const ready = run([pick("close", "better"), next], ctx(), done);
  assert.equal(ready.stepId, "ready");
  const end = run([pick("ready", "think_so"), next], ctx(), ready);
  assert.equal(title(end), "That's the practice.");
  assert.equal(line(end), "The real conversation is yours to choose. Planning it can help.");
  assert.deepEqual(offers(end), ["plan", "again"]);
  assert.equal(line(run([pick("ready", "not_sure"), next], ctx(), ready)), "Another practice can help. Pick a harder version when you're ready.");
  const harder = run([pick("close", "worse"), next], ctx(), done);
  assert.equal(harder.stepId, "end", "harder: no *could you say it for real?*");
  assert.match(line(harder), /^Saying it for real feels harder right now/);
  assert.deepEqual(offers(harder), ["cool_down", "again"], "harder: settle first, never plan it now");
  const plan = run([stage(["lost_it"]), pick("ifthen", "break"), next, pick("close", "same"), next, pick("ready", "sure"), next], ctx(), toStage());
  assert.equal(title(plan), "For the hard moment: Step out and come back later.");
  assert.deepEqual(offers(plan), ["plan", "cope_ahead", "again"]);
  // Losing it, a plan, then harder: settle first; no plan, no *For the hard moment* (Gate 2).
  const lostWorse = run([stage(["lost_it"]), pick("ifthen", "break"), next, pick("close", "worse"), next], ctx(), toStage());
  assert.deepEqual(offers(lostWorse), ["cool_down", "again"]);
  assert.equal(title(lostWorse), "That's the practice.");
  // The if-then is optional: someone who'd lose it isn't made to pick a plan to go on.
  assert.equal(run([stage(["lost_it"]), next], ctx(), toStage()).stepId, "close");
  // Practising leaving and stepping out count as practice (`stepped_out`, never the player's inline `left`).
  assert.equal(line(run([stage(["break", "stepped_out"])], ctx(), toStage("ask", "leave"))), "You practised it. That counts.");
  // The content-drift fallback reports nothing: neither line claims what didn't happen.
  assert.equal(line(run([{ type: "embedDone", output: { ids: [], doneCount: 0 } }], ctx(), toStage())), null);
  assert.deepEqual(skill.exits.find((e) => e.id === "again").query, { situationId: "$a.kind", person: "$ctx.personId" });
  assert.deepEqual(M.exitQuery(ctx({ personId: "none" }), skill.exits.find((e) => e.id === "again"), toStage("repair")), { situationId: "repair" });
});

test("Talk to someone now on every screen, on a field that is always shown", () => {
  for (const s of skill.steps) {
    const links = s.kind === "ask" ? s.fields.filter((f) => !f.showWhen).flatMap((f) => f.links ?? []) : (s.links ?? []);
    assert.ok(links.some((l) => l.exit === "safety_open"), s.id);
  }
});

test("the hosts open it with their kind and the person: Say no, Keep it warm, FAST, Ending, the debrief, the prep", () => {
  const want = {
    say_no: { situationId: "say_no", person: "$ctx.personId" }, give: { situationId: "repair", person: "$ctx.personId" },
    fast_review: { situationId: "boundary" }, ending_relationships: { situationId: "boundary" },
    dear_man_debrief: { situationId: "ask", person: "$ctx.personId" }, dear_man_prep: { situationId: "ask", person: "$ctx.personId" },
  };
  for (const [id, q] of Object.entries(want)) {
    const ex = content.skills.find((s) => s.id === id).exits.find((e) => e.toolId === "rehearse");
    assert.ok(ex && !ex.planned, id);
    assert.deepEqual(ex.query, q, id);
  }
  assert.ok(!content.skills.some((s) => s.exits.some((e) => e.toolId === "rehearse" && e.planned)), "no planned rehearse exit left");
});

test("routing: hesitant (On replay) → Check the Facts first, Rehearse it beside it", async () => {
  const { graph, fixtureDeps, withPolicyOn } = await import("./lib/recommendationFixture.mjs");
  const { getStateAndToolsHandler } = await importTs("functions/src/recommendation/handler.ts");
  const on = withPolicyOn(graph);
  const r = await getStateAndToolsHandler({ quadrant: "low-unpleasant", emotions: ["Hesitant"] }, fixtureDeps(on));
  assert.equal(r.pattern.id, "rumination_loop");
  assert.deepEqual(r.tools.map((t) => t.id), ["check-the-facts", "rehearse"]);
  const g = await getStateAndToolsHandler({ quadrant: "low-unpleasant", emotions: ["Guilty"] }, fixtureDeps(on));
  assert.ok(!g.tools.some((t) => t.id === "rehearse"), "not for guilt");
  const row = on.recommendedFor.find((x) => x.id === "rf_rumination_loop_words_say-it_rehearse");
  assert.equal(row.reviewStatus, "approved");
});
