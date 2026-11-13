// Let it be a wave (PRD ER-08; mindfulness of current emotion: DBT ER Handout 22;
// docs/design/mindfulness-emotions.md) on the skill runtime: the feeling, where it sits in the body, the wave (DT-05's
// `urgeWave` with the feeling's copy) headed by don't push it away, don't hold on to it, bigger twice → the body or
// keep watching, then *You're the one noticing it* above the close asked in the flow. A blank or far-away word never
// gets the wave; a good feeling gets savouring, with no then-vs-now. Tested through the same pure machine the player
// runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const { emotions } = await importTs("src/data/emotions.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "mindfulness_emotions");
const WAVE_IDS = ["still_here", "fading", "gone", "bigger", "ended_gone", "ended_bigger", "ended_not_now", "ended_left", "ended_long"];
const embedOutputs = { urgeWave: { ids: WAVE_IDS, measures: ["durationSec", "doneCount"] } };
const gridIds = new Set(emotions.map((e) => e.id));
const ctx = (ctxIn = {}, carried = []) => ({ skill, shared: content, carried, gridIds, ctxIn, embedOutputs, profile: null,
  emotionLabel: (id) => (emotions.find((e) => e.id === id)?.name ?? id).toLowerCase() });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const out = (...ids) => ({ type: "embedDone", output: { ids, durationSec: 90, doneCount: ids.length - 1 } });
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s);
const line = (s, c = ctx()) => M.handoffLine(c, M.stepOf(skill, s.stepId), s);
const title = (s, c = ctx()) => M.copyText(c, M.stepOf(skill, s.stepId).title, s, M.titleSlots(c, M.stepOf(skill, s.stepId), s));
const ids = (s, step, c = ctx()) => {
  const f = M.shownFields(c, M.stepOf(skill, step), s)[0];
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const TO_WAVE = (feel = "sad") => [pick("feel", feel), next, pick("where", "chest"), next];
const TO_CLOSE = (feel = "sad") => [...TO_WAVE(feel), out("still_here", "fading", "ended_left")];

test("the skill: tool mindfulness-emotions, named Let it be a wave, its own ER concept, the close asked in the flow", () => {
  assert.equal(skill.toolId, "mindfulness-emotions");
  assert.equal(skill.start, "feel");
  assert.deepEqual(skill.emotionFields, ["feel"]);
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_mindfulness_current_emotion"\}\), \(s:Skill \{id: "mindfulness_emotions"\}\)/);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_mindfulness_current_emotion", t: "mindfulness-emotions"\}/);
  assert.match(readFileSync("schema/relationships.cypher", "utf8"), /\{id: "dbt_mindfulness_current_emotion"\}\), \(mod:TherapyConcept \{id: "dbt_emotion_regulation_module"\}\)/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'mindfulness-emotions': 'mindfulness_emotions',/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'mindfulness-emotions',\n\s+name: 'Let it be a wave',[\s\S]*?module: 'emotion-regulation'/);
  assert.match(tools, /label: 'Let a feeling be', toolId: 'mindfulness-emotions'/);
  for (const f of ["src/lib/spine/close.ts", "functions/src/spine/tools.ts"])
    assert.match(readFileSync(f, "utf8"), /'mindfulness-emotions': \{ module: 'er', closeKind: 'regulation_down' \}/, f);
});

test("the feeling: carried words first, any word behind More words; every chip a grid word", () => {
  const f = M.stepOf(skill, "feel").fields[0];
  assert.equal(f.emotion, true);
  assert.equal(f.options.carriedFirst, true);
  for (const w of f.options.emotions) assert.ok(gridIds.has(w), w);
});

test("a blank or far-away word never gets the wave: grounding, and someone to talk to for numb and empty", () => {
  for (const w of ["numb", "empty", "apathetic", "indifferent"]) {
    const s = run([pick("feel", w), next]);
    assert.equal(s.stepId, "blank", w);
    assert.ok(M.stepOf(skill, "blank").noClose);
    assert.deepEqual(offers(s), ["numb", "empty"].includes(w) ? ["five_senses", "safety_open"] : ["five_senses"], w);
    // Someone to talk to once: the offer for numb and empty, else the quiet link (Gate 2: never two of the same button).
    const links = M.stepLinks(ctx(), M.stepOf(skill, "blank"), s).map((l) => l.exit.id);
    assert.deepEqual(links, ["numb", "empty"].includes(w) ? [] : ["safety_open"], w);
  }
  // Even with a flooded reading: grounding first, not a choice about the body.
  assert.equal(run([pick("feel", "numb"), next], ctx({ band: "flooded" })).stepId, "blank");
});

test("a carried flooded reading: a heads-up first, the body or try it anyway", () => {
  const F = ctx({ band: "flooded" });
  const s = run([pick("feel", "angry"), next], F);
  assert.equal(s.stepId, "heads_up");
  const body = run([pick("heads_up", "body"), next], F, s);
  assert.equal(body.stepId, "settle");
  assert.deepEqual(offers(body, F), ["cool_down"]);
  assert.ok(M.stepOf(skill, "settle").noClose);
  assert.equal(run([pick("heads_up", "try"), next], F, s).stepId, "where");
});

test("where it sits: the body's places (the BodyRegion nodes), one, or I can't find it", () => {
  const s = run([pick("feel", "sad"), next]);
  assert.equal(s.stepId, "where");
  assert.deepEqual(ids(s, "where"), ["head", "face", "jaw", "throat", "neck", "shoulders", "chest", "upper_back", "stomach",
    "lower_back", "arms", "hands", "legs", "feet", "body", "cant_find"]);
  assert.equal(M.stepOf(skill, "where").fields[0].max, 1, "one place (Gate 2: never a place and I can't find it together)");
  const cypher = readFileSync("schema/skills.cypher", "utf8");
  assert.match(cypher, /MATCH \(o:SkillOption \{id: "mindfulness_emotions:where:chest"\}\), \(c:BodyRegion \{id: "chest"\}\)\nMERGE \(o\)-\[:PRESENTS\]->\(c\);/);
  assert.equal(run([pick("where", "cant_find"), next], ctx(), s).stepId, "wave", "a full answer");
});

test("the wave: the two errors in words, a soft check every 30 s, four at most, no durations, the room in view", () => {
  const s = run(TO_WAVE());
  assert.equal(s.stepId, "wave");
  assert.equal(title(s), "Don't push it away. Don't hold on to it.");
  const w = M.stepOf(skill, "wave");
  assert.equal(w.embed, "urgeWave");
  assert.equal(w.props.checkSec, 30);
  assert.equal(w.props.maxChecks, 4);
  assert.equal(w.props.notNow, undefined, "nothing to say not now to: it's a feeling, not an urge");
  assert.match(skill.copy[w.props.riding], /^Pushing makes it stick\. Holding on makes it bigger\./, "the PRD's words");
  assert.doesNotMatch(skill.copy[w.props.riding], /eyes/i, "nothing raises eyes closed");
  // Stopping early, gone, or four checks: all go on to noticing it.
  for (const end of [["ended_left"], ["fading", "gone", "ended_gone"], ["still_here", "still_here", "still_here", "fading", "ended_long"]])
    assert.equal(run([out(...end)], ctx(), s).stepId, "close", end.join());
});

test("bigger twice: something for my body or keep watching from where it was; bigger twice again → the body", () => {
  const s = run([out("bigger", "bigger", "ended_bigger")], ctx(), run(TO_WAVE()));
  assert.equal(s.stepId, "bigger");
  const body = run([pick("bigger", "body"), next], ctx(), s);
  assert.equal(body.stepId, "switch");
  assert.deepEqual(offers(body), ["cool_down"]);
  const keep = run([pick("bigger", "keep"), next], ctx(), s);
  assert.equal(keep.stepId, "wave2");
  assert.equal(M.stepOf(skill, "wave2").props.continueFrom, "wave");
  assert.equal(run([out("bigger", "bigger", "ended_bigger")], ctx(), keep).stepId, "switch");
  assert.equal(run([out("fading", "ended_left")], ctx(), keep).stepId, "close");
});

test("you're the one noticing it, above the close asked in the flow: louder → the body; about the same is the skill", () => {
  const c = run(TO_CLOSE());
  assert.equal(c.stepId, "close");
  assert.equal(title(c), "You're the one noticing it.");
  assert.equal(skill.copy[M.stepOf(skill, "close").fields[0].label], "How is the feeling now?");
  assert.deepEqual(ids(c, "close"), ["worse", "same", "better", "much_better"]);
  assert.deepEqual(skill.options.tvn.map((o) => o.label), ["Louder", "About the same", "A bit quieter", "Much quieter"], "PRD step 6");
  const louder = run([pick("close", "worse"), next], ctx(), c);
  assert.equal(louder.stepId, "louder");
  assert.deepEqual(M.askFresh(ctx(), louder), { thenVsNow: "worse" });
  assert.deepEqual(offers(louder), ["cool_down"]);
  const same = run([pick("close", "same"), next], ctx(), c);
  assert.equal(same.stepId, "end");
  assert.equal(line(same), "It doesn't have to go anywhere. You let it be here, and that's the skill.", "PRD step 6, word for word bar a comma");
  assert.equal(line(run([pick("close", "better"), next], ctx(), c)), skill.copy.end_quieter);
  for (const id of ["louder", "end"]) assert.ok(!M.stepOf(skill, id).noClose, `${id}: after the in-flow close`);
});

test("a safety-screen word: the line about not being here on the where screen and the end card, never a gate", () => {
  const where = run([pick("feel", "worthless"), next]);
  assert.equal(where.stepId, "where", "never a gate");
  assert.equal(line(where), skill.copy.heavy_line);
  assert.equal(line(run([pick("feel", "sad"), next])), null);
  const end = run([pick("close", "same"), next], ctx(), run(TO_CLOSE("despair")));
  assert.equal(line(end), `${skill.copy.end_same} ${skill.copy.heavy_line}`);
  const quieter = run([pick("close", "better"), next], ctx(), run(TO_CLOSE("helpless")));
  assert.equal(line(quieter), `${skill.copy.end_quieter} ${skill.copy.heavy_line}`);
});

test("savouring a good feeling: let it be, it doesn't have to last; no then-vs-now; Good things to keep it", () => {
  for (const w of ["happy", "proud", "calm", "loving", "excited", "awe"]) {
    const s = run(TO_WAVE(w));
    assert.equal(s.stepId, "savour_wave", w);
    assert.equal(title(s), "Let it be as big as it is. You don't have to make it last.");
    const end = run([out("still_here", "ended_left")], ctx(), s);
    assert.equal(end.stepId, "savour_end");
    assert.deepEqual(offers(end), ["good_things"]);
    assert.ok(M.stepOf(skill, "savour_end").noClose, "a good feeling easing isn't the outcome");
    assert.deepEqual(M.askFresh(ctx(), end), {});
  }
  assert.equal(skill.exits.find((x) => x.id === "good_things").toolId, "good-things");
  assert.deepEqual(skill.exits.find((x) => x.id === "good_things").query, { frame: "savour" });
  // Surprises that aren't good feelings get the wave, and so do aroused and powerful (Gate 3: activation that can run away).
  for (const w of ["shocked", "confused", "dismayed", "startled", "aroused", "powerful"]) assert.equal(run(TO_WAVE(w)).stepId, "wave", w);
  // Savouring that keeps getting bigger: the body, not "that counts".
  assert.equal(run([out("bigger", "bigger", "ended_bigger")], ctx(), run(TO_WAVE("excited"))).stepId, "switch");
  assert.equal(skill.copy[skill.exits.find((x) => x.id === "good_things").label], "Keep it in Things I like");
});

test("a word that can mean danger now asks once: anything but no is the safety branch, no wave (Gate 3)", () => {
  for (const w of ["threatened", "violated", "persecuted", "victimized"]) {
    const s = run([pick("feel", w), next]);
    assert.equal(s.stepId, "safe", w);
    for (const v of ["yes", "sometimes", "unsure"]) {
      const u = run([pick("safe", v), next], ctx(), s);
      assert.equal(u.stepId, "unsafe", v);
      assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "unsafe"), u)?.variant, "other_person");
      assert.deepEqual(offers(u), ["safety_open", "ending"]);
      assert.ok(M.stepOf(skill, "unsafe").noClose);
    }
    assert.equal(run([pick("safe", "no"), next], ctx(), s).stepId, "where");
  }
  assert.deepEqual(skill.exits.find((x) => x.id === "ending").query, { frame: "careful" });
  assert.equal(run([pick("feel", "threatened"), next, pick("safe", "no"), next], ctx({ band: "flooded" })).stepId, "heads_up");
  assert.equal(run([pick("feel", "sad"), next]).stepId, "where", "other words aren't asked");
});

test("a word that means flooding gets the heads-up without a carried reading (Gate 3)", () => {
  for (const w of ["overwhelmed", "out_of_control"]) assert.equal(run([pick("feel", w), next]).stepId, "heads_up", w);
});

test("a safety-screen word getting bigger or louder: no keep watching, someone to talk to first, the line again (Gate 3)", () => {
  const big = run([out("bigger", "bigger", "ended_bigger")], ctx(), run(TO_WAVE("despair")));
  assert.equal(big.stepId, "switch");
  assert.deepEqual(offers(big), ["safety_open", "cool_down"]);
  assert.equal(line(big), `${skill.copy.switch_line} ${skill.copy.heavy_line}`);
  const loud = run([pick("close", "worse"), next], ctx(), run(TO_CLOSE("depressed")));
  assert.deepEqual(offers(loud), ["safety_open", "cool_down"]);
  assert.equal(line(loud), `${skill.copy.louder_line} ${skill.copy.heavy_line}`);
  assert.deepEqual(offers(run([pick("close", "worse"), next], ctx(), run(TO_CLOSE("sad")))), ["cool_down"]);
});

test("bigger can be a memory pulling in: grounding, never more watching (Gate 3)", () => {
  const s = run([out("bigger", "bigger", "ended_bigger"), pick("bigger", "memory"), next], ctx(), run(TO_WAVE("scared")));
  assert.equal(s.stepId, "memory");
  assert.deepEqual(offers(s), ["five_senses", "safety_open"]);
  assert.ok(M.stepOf(skill, "memory").noClose);
});

test("every screen has a quiet way to someone; nothing asks the person to close their eyes or go back to a memory", () => {
  for (const st of skill.steps) {
    const links = [...(st.links ?? []), ...(st.fields ?? []).flatMap((f) => f.links ?? [])];
    assert.ok(links.some((l) => l.exit === "safety_open"), st.id);
  }
  const all = Object.values(skill.copy).join(" ");
  assert.doesNotMatch(all, /close your eyes|\bshould\b|!|go back to when|remember when|\d+ (seconds|minutes)/i);
});

test("the hosts that hand on to it carry the word: Check the Facts, Do the Opposite's keep card, Problem Solve, It isn't working, the lid", () => {
  const byId = (id) => content.skills.find((s) => s.id === id);
  const cf = byId("check_the_facts").exits.find((x) => x.id === "mindfulness_emotions");
  assert.ok(!cf.planned);
  assert.deepEqual(cf.carry, ["feel"]);
  const oa = byId("opposite_action");
  const wave = oa.exits.find((x) => x.id === "wave");
  assert.equal(wave.toolId, "mindfulness-emotions");
  assert.deepEqual(wave.carry, ["feel"]);
  assert.ok(!wave.planned);
  assert.ok(M.stepOf(oa, "keep").offers.some((o) => o.exit === "wave"));
  const ps = byId("problem_solve").exits.find((x) => x.toolId === "mindfulness-emotions");
  assert.ok(!ps.planned);
  assert.deepEqual(ps.carry, ["feel"]);
  assert.ok(!byId("er_troubleshoot").exits.find((x) => x.id === "mindfulness_emotions").planned);
  const mj = byId("mind_job");
  assert.deepEqual(M.stepOf(mj, "lid_off").offers.find((o) => o.exit === "mindfulness_emotions").when, { eq: ["$a.can_do", "cant"] });
  // A carried word opens the wave on it.
  assert.equal(M.emotionChoices(ctx({}, ["lonely"]), M.stepOf(skill, "feel").fields[0], {})[0], "lonely", "a carried word first, never pre-picked");
  assert.deepEqual(M.initialRun(skill).answers, {});
});
