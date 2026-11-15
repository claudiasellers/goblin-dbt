// Take a moment apart (PRD MF-07; DBT Mindfulness Worksheets 8, 9; docs/design/moment-apart.md) on the skill runtime:
// one moment taken apart into body, thoughts and feeling, whether you noticed it while it happened, and a good one
// savoured and kept in Things I like. Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "moment_apart");
const embedOutputs = { holdRing: { ids: ["held", "partly", "skipped"], measures: ["durationSec", "doneCount", "earlyCount"] } };
const GRID = new Set(["happy", "content", "calm", "thankful", "proud", "loving", "relaxed", "excited", "hopeful", "peaceful",
  "sad", "anxious", "angry", "hurt", "frustrated", "embarrassed", "lonely", "disappointed", "guilty", "ashamed", "tired",
  "bored", "interested", "confused", "thoughtful", "worthless"]);
const ctx = (ctxIn = {}, carried = []) => ({ skill, shared: content, carried, gridIds: GRID, emotionLabel: (x) => x, ctxIn: M.contextIn(skill, ctxIn), embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const held = { type: "embedDone", output: { ids: ["held"], durationSec: 10 } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const step = (id) => M.stepOf(skill, id);
const title = (s, c = ctx()) => M.copyText(c, step(s.stepId).title, s, M.titleSlots(c, step(s.stepId), s));
const fieldOf = (s, fid, c = ctx()) => M.shownFields(c, step(s.stepId), s).find((f) => f.id === fid);
const ids = (s, fid, c = ctx()) => M.optionGroups(c, fieldOf(s, fid, c), s.answers).flatMap((g) => g.options.map((o) => o.value));
const line = (s, c = ctx()) => M.handoffLine(c, step(s.stepId), s);
const GOOD = [pick("valence", "good"), next];
const HARD = [pick("valence", "hard"), next];
const MID = [pick("valence", "mid"), next];
const THROUGH = [pick("what", "alone"), next, next, pick("thoughts", "me"), next];

test("the skill: the moment-apart tool on dbt_mindful_events, listed under Mindfulness with its intent; a describe rep", () => {
  assert.equal(skill.toolId, "moment-apart");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_mindful_events"\}\), \(s:Skill \{id: "moment_apart"\}\)/);
  assert.match(readFileSync("schema/knowledge-graph.cypher", "utf8"), /MERGE \(mindful_events:TherapyConcept \{id: "dbt_mindful_events"\}\)[^;]*module: "Mindfulness"/);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_mindful_events", t: "moment-apart"\}/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'moment-apart': 'moment_apart',/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'moment-apart',\s+name: 'Take a moment apart',[\s\S]*?module: 'mindfulness'/);
  assert.match(tools, /label: 'Work out what a moment was made of', toolId: 'moment-apart'/);
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'moment-apart': \{ module: 'mf', closeKind: 'none' \}/);
  assert.match(readFileSync("schema/practice-spine.cypher", "utf8"), /PracticeSkill \{id: "describe"\}\)\nSET k\.mfOrder = 2, [^\n]*"moment-apart"/);
});

test("which moment: good, hard or in between; the situation chips, own words", () => {
  assert.deepEqual(ids(M.initialRun(skill), "valence"), ["good", "hard", "mid"]);
  const s = run(GOOD);
  assert.equal(s.stepId, "what");
  assert.deepEqual(ids(s, "what"), ["someone", "alone", "work", "outside", "online"]);
  assert.equal(run([...GOOD, own("what", "the bus"), next]).stepId, "body");
});

test("a hard moment: put down → Recover; threatened or hurt → the danger route; frightening → stop, no replay; hurting myself → crisis", () => {
  const s = run(HARD);
  const ROUTES = ["hurt_by", "threatened", "frightening", "self_harm"];
  assert.deepEqual(ids(s, "what").slice(-4), ROUTES);
  assert.deepEqual(ids(run(MID), "what").slice(-4), ROUTES, "in between too");
  assert.ok(!ids(run(GOOD), "what").some((v) => ROUTES.includes(v)), "never on a good moment");
  const labels = Object.fromEntries(skill.options.what.map((o) => [o.value, o.label]));
  assert.equal(labels.hurt_by, "Someone put me down, brushed me off or left me out", "Recover's chip is never the danger chip");
  assert.equal(labels.threatened, "Someone threatened me, scared me or hurt me");
  const rec = run([...HARD, pick("what", "hurt_by"), next]);
  assert.equal(rec.stepId, "recover");
  assert.deepEqual(M.offersFor(ctx(), step("recover"), rec), ["recover"]);
  assert.equal(skill.exits.find((x) => x.id === "recover").toolId, "recovering-from-invalidation");
  const danger = run([...HARD, pick("what", "threatened"), next]);
  assert.equal(danger.stepId, "danger");
  assert.ok(step("danger").crisis.some((c) => c.variant === "other_person"));
  assert.ok(step("what").crisis.some((c) => c.variant === "other_person" && JSON.stringify(c.when).includes("threatened")));
  assert.deepEqual(M.offersFor(ctx(), step("danger"), danger), ["safety_open", "ending_careful", "five_senses"]);
  assert.deepEqual(skill.exits.find((x) => x.id === "ending_careful").query, { frame: "careful" });
  const stop = run([...HARD, pick("what", "frightening"), next]);
  assert.equal(stop.stepId, "stop");
  assert.ok(!(step("stop").crisis ?? []).some((c) => c.variant === "other_person"), "an accident gets no domestic-violence banner");
  assert.deepEqual(M.offersFor(ctx(), step("stop"), stop), ["safety_open", "five_senses"]);
  const hurt = run([...HARD, pick("what", "self_harm"), next]);
  assert.equal(hurt.stepId, "hurt");
  assert.ok(step("hurt").crisis.some((c) => c.variant === "crisis"));
  assert.ok(step("hurt").safetyFirst, "someone to talk to opens straight away");
  for (const id of ["recover", "danger", "stop", "hurt"]) {
    assert.equal(step(id).complete, false, `${id}: no rep, no close`);
    assert.equal(step(id).noClose, true, id);
  }
});

test("a thought of hurting myself is a route, not a kind of thought; back to the room while taking a hard moment apart", () => {
  const thoughts = run([...HARD, pick("what", "alone"), next, next]);
  assert.equal(thoughts.stepId, "thoughts");
  assert.ok(ids(thoughts, "thoughts").includes("self_harm_thought"));
  assert.ok(!ids(run([...GOOD, pick("what", "alone"), next, next]), "thoughts").includes("self_harm_thought"), "never on a good moment");
  assert.ok(step("thoughts").crisis.some((c) => c.variant === "crisis"));
  assert.equal(run([pick("thoughts", "self_harm_thought"), next], ctx(), thoughts).stepId, "hurt");
  const roomOn = (st, s) => M.shownFields(ctx(), step(st), s).flatMap((f) => M.fieldLinks(ctx(), f, s)).some((l) => l.exit.id === "five_senses");
  const hardBody = run([...HARD, pick("what", "alone"), next]);
  const goodBody = run([...GOOD, pick("what", "alone"), next]);
  for (const st of ["body", "thoughts", "feel", "aware"]) {
    assert.ok(roomOn(st, hardBody), `${st}: back to the room on a hard moment`);
    assert.ok(!roomOn(st, goodBody), `${st}: not on a good one`);
  }
});

test("a hard moment on a flooded reading is offered a good one instead too; the end card's labels ship on the exits", () => {
  const fl = ctx({ band: "flooded" });
  const heads = run(HARD, fl);
  assert.equal(heads.stepId, "heads_up");
  assert.equal(run([pick("heads_up", "go"), next], fl, heads).stepId, "heads_up_hard");
  const body = run([pick("heads_up", "body"), next], fl, heads);
  assert.equal(title(body, fl), "Settle your body first.", "not the heads-up again");
  for (const [id, label] of [["good_things", "more_label"], ["find_the_feeling", "ftf_label"], ["unpack", "unpack_label"]]) {
    assert.equal(skill.exits.find((x) => x.id === id).label, label, id);
  }
  // A skipped savour doesn't ask for a good bit; Partly gets its own line.
  const savour = run([...GOOD, pick("what", "alone"), next, next, next, next, pick("aware", "partly"), next]);
  assert.equal(savour.stepId, "savour");
  const end = run([{ type: "embedDone", output: { ids: ["skipped"], durationSec: 0 } }], ctx(), savour);
  assert.equal(end.stepId, "end");
  assert.equal(M.handoffLine(ctx(), step("end"), end), "And you caught some of it while it happened.");
  assert.equal(run([held], ctx(), savour).stepId, "keep");
});

test("body, thoughts and feeling: each optional, words led by the moment's side; can't tell is a full answer", () => {
  const body = run([...GOOD, pick("what", "alone"), next]);
  assert.equal(body.stepId, "body");
  const good = ids(body, "words");
  assert.ok(good.includes("warmth") && !good.includes("knotted"));
  const hardBody = run([...HARD, pick("what", "alone"), next]);
  assert.ok(ids(hardBody, "words").includes("knotted") && !ids(hardBody, "words").includes("smiling"));
  assert.ok(ids(body, "where").includes("chest"));
  const thoughts = run([next], ctx(), body);
  assert.equal(thoughts.stepId, "thoughts", "the body can be skipped");
  assert.deepEqual(ids(thoughts, "thoughts"), ["me", "them", "next", "meant", "none"]);
  const feel = run([next], ctx(), thoughts);
  assert.equal(feel.stepId, "feel");
  assert.deepEqual(M.emotionChoices(ctx(), fieldOf(feel, "feel"), feel.answers).slice(0, 3), ["happy", "content", "calm"]);
  const hardFeel = run([...THROUGH], ctx(), run(HARD));
  assert.deepEqual(M.emotionChoices(ctx(), fieldOf(hardFeel, "feel"), hardFeel.answers).slice(0, 2), ["sad", "anxious"]);
  const carried = ctx({}, ["worthless"]);
  const cf = run(THROUGH, carried, run(HARD, carried));
  assert.equal(M.emotionChoices(carried, fieldOf(cf, "feel", carried), cf.answers)[0], "worthless", "a carried word first");
  assert.equal(run([pick("unsure", "unsure"), next], ctx(), feel).stepId, "aware");
  assert.equal(run([next], ctx(), feel).stepId, "aware");
});

test("aware, then a good moment is savoured (10 s) and can be kept in Things I like (Good things' kinds)", () => {
  const aware = run([...THROUGH, next], ctx(), run(GOOD));
  assert.equal(aware.stepId, "aware");
  assert.deepEqual(ids(aware, "aware"), ["yes", "partly", "later"]);
  const sv = run([pick("aware", "yes"), next], ctx(), aware);
  assert.equal(sv.stepId, "savour");
  assert.equal(step("savour").embed, "holdRing");
  assert.equal(step("savour").props.seconds, 10);
  const keep = run([held], ctx(), sv);
  assert.equal(keep.stepId, "keep");
  assert.deepEqual(step("keep").keep, { kind: "thing_i_like", many: true, when: { eq: ["$a.keepit", "keep"] }, from: ["kind"] });
  // The same ids as Good things' kinds, so Me and the slice name a kept one.
  const gt = content.skills.find((s) => s.id === "good_things");
  const gtKinds = new Set(gt.options.kind.map((o) => o.value));
  for (const v of ids(keep, "kind")) assert.ok(gtKinds.has(v), v);
  const end = run([pick("kind", "view"), pick("keepit", "keep"), next], ctx(), keep);
  assert.equal(end.stepId, "end");
  assert.equal(title(end), "Kept. Good things are worth finding again.");
  assert.equal(line(end), "And you noticed it while it happened.");
  assert.ok(M.offersFor(ctx(), step("end"), end).includes("good_things"));
});

test("a hard moment closes without judgment (PRD), and a thought about me offers Unpack a judgment; can't tell offers Find the feeling", () => {
  const aware = run(THROUGH, ctx(), run(HARD));
  const end = run([next, pick("aware", "later"), next], ctx(), aware);
  assert.equal(end.stepId, "end");
  assert.equal(title(end), "That was hard. You took it apart instead of carrying it whole.");
  assert.equal(line(end), "Next time, see if you notice one while it's happening.");
  const offers = M.offersFor(ctx(), step("end"), end);
  assert.ok(offers.includes("unpack"));
  assert.ok(offers.includes("find_the_feeling"), "nothing named: the word");
  assert.ok(!offers.includes("good_things"));
  const named = run([pick("feel", "sad"), next, pick("aware", "yes"), next], ctx(), aware);
  assert.ok(!M.offersFor(ctx(), step("end"), named).includes("find_the_feeling"));
  const mid = run([...THROUGH, next, pick("aware", "partly"), next], ctx(), run(MID));
  assert.equal(title(mid), "You took one moment apart. That's the skill.");
  assert.equal(step("end").complete, true);
  assert.equal(step("end").noClose, true);
});

test("a carried flooded reading: the question stays, then the body first or go on, never a lock; stirred and hard: a good one instead", () => {
  const fl = ctx({ band: "flooded" });
  assert.equal(title(M.initialRun(skill), fl), "Which moment do you want to take apart?");
  const hu = run(GOOD, fl);
  assert.equal(hu.stepId, "heads_up");
  assert.equal(run([pick("heads_up", "body"), next], fl, hu).stepId, "body_first");
  assert.equal(run([pick("heads_up", "go"), next], fl, hu).stepId, "what");
  const st = ctx({ band: "stirred" });
  assert.equal(run(GOOD, st).stepId, "what", "stirred is fine for a good moment");
  const hh = run(HARD, st);
  assert.equal(hh.stepId, "heads_up_hard");
  const swap = run([pick("heads_up_hard", "good"), next], st, hh);
  assert.equal(swap.stepId, "which", "back to the question, to pick a good one");
  const after = run([pick("valence", "good"), next], st, swap);
  assert.equal(after.stepId, "what");
  assert.ok(!ids(after, "what", st).includes("frightening"));
  assert.equal(run([pick("heads_up_hard", "go"), next], st, hh).stepId, "what");
});

test("Talk to someone now on every screen; no copy asks to be grateful", () => {
  for (const st of skill.steps) {
    if (st.kind === "ask") assert.ok(st.fields[0].links.some((l) => l.exit === "safety_open"), st.id);
    else if (!["hurt", "stop", "danger"].includes(st.id)) assert.ok((st.links ?? []).some((l) => l.exit === "safety_open"), st.id);
  }
  assert.ok(!Object.values(skill.copy).some((t) => /grateful|gratitude|just /i.test(t)));
});
