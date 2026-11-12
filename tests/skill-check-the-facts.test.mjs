// Check the Facts on the skill runtime (docs/design/skill-runtime.md), pinned against the build contract in
// docs/design/check-the-facts-handover.md: the step order, screen 5's skip, the two-story cap, the story
// sets, the threats per parent and the hand-off table are rows in the skill, so they are tested here
// through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const { emotions } = await importTs("src/data/emotions.ts");
const { validateExt } = await importTs("functions/src/spine/extSchemas.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "check_the_facts");
const gridIds = new Set(emotions.map((e) => e.id));
const ctx = (carried = []) => ({
  skill, shared: content, carried, gridIds,
  emotionLabel: (id) => (emotions.find((e) => e.id === id)?.name ?? id).toLowerCase(),
});

/** Run events from the start; returns the final state. */
function run(events, c = ctx()) {
  let s = M.initialRun(skill);
  for (const e of events) s = M.runNext(c, s, e);
  return s;
}
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const toFits = (feel, stories, event = "said") => [pick("feel", feel), next, pick("event", event), next, ...stories.map((x) => pick("story", x)), next, next];

test("the seven screens, in order: feel, event, story, alt, (threat), fits, (missing), next; then v1.1's safe hand-off", () => {
  assert.deepEqual(skill.steps.map((s) => s.id), ["feel", "event", "story", "alt", "threat", "fits", "missing", "next", "safe"]);
  assert.equal(skill.toolId, "check-the-facts");
  // anger skips nothing: screen 5 shows
  const s = run(toFits("annoyed", ["anger_on_purpose"]));
  assert.deepEqual(s.path, ["feel", "event", "story", "alt", "threat"]);
});

test("screen 1: the curated chips, carried emotions first and never pre-selected; one word", () => {
  const field = skill.steps[0].fields[0];
  const c = ctx(["lonely", "not_a_word"]);
  assert.deepEqual(M.emotionChoices(c, field, {}), ["lonely", "anxious", "worried", "annoyed", "angry", "hurt", "guilty", "ashamed", "embarrassed"]);
  const s0 = M.initialRun(skill);
  assert.equal(M.canGoOn(c, s0), false, "Next waits for a word");
  const s = run([pick("feel", "anxious"), pick("feel", "angry")], c);
  assert.deepEqual(s.answers.feel.ids, ["angry"], "one word: a second tap replaces it");
  assert.equal(run([pick("feel", "not_a_word")], c).answers.feel, undefined, "only grid words");
});

test("screen 2: an event kind is required; own words never stand in for it, and I can't name it is a full answer", () => {
  let s = run([pick("feel", "hurt"), next, own("event", "they left early")]);
  assert.equal(s.stepId, "event");
  assert.equal(M.canGoOn(ctx(), s), true, "own words alone also let it go on");
  s = run([pick("feel", "hurt"), next, pick("event", "cant_name"), next]);
  assert.equal(s.stepId, "story");
});

test("storySet: parents map to their set, both shames to shame, envy / jealousy / disgust / love and no parent to general", () => {
  const setOf = (w) => M.scope(ctx(), { answers: { feel: { ids: [w], own: null } } }).derived.set;
  assert.equal(setOf("anxious"), "fear");
  assert.equal(setOf("annoyed"), "anger");
  assert.equal(setOf("hurt"), "sadness");
  assert.equal(setOf("ashamed"), "shame");
  assert.equal(setOf("embarrassed"), "shame");
  assert.equal(setOf("guilty"), "guilt");
  assert.equal(setOf("jealous"), "general");
  assert.equal(content.parentOf.jealous, "jealousy");
  const noParent = [...gridIds].find((id) => !content.parentOf[id]);
  assert.ok(noParent, "some grid word has no parent");
  assert.equal(setOf(noParent), "general");
  for (const id of ["hot_shame", "cold_shame"]) assert.equal(content.parentOf[id], "shame");
});

test("screen 3: stories from the word's set; two at most, a third tap swaps out the older; own words count as one", () => {
  const field = skill.steps[2].fields[0];
  const answers = { feel: { ids: ["annoyed"], own: null } };
  const [g] = M.optionGroups(ctx(), field, answers);
  assert.deepEqual(g.options.map((o) => o.value), ["anger_on_purpose", "anger_no_respect", "anger_always", "anger_unfair"]);
  const base = [pick("feel", "annoyed"), next, pick("event", "said"), next];
  let s = run([...base, pick("story", "anger_on_purpose"), pick("story", "anger_always"), pick("story", "anger_unfair")]);
  assert.deepEqual(s.answers.story.ids, ["anger_always", "anger_unfair"]);
  s = run([...base, pick("story", "anger_on_purpose"), pick("story", "anger_always"), own("story", "They think I'm useless")]);
  assert.deepEqual([s.answers.story.ids, s.answers.story.own], [["anger_always"], "They think I'm useless"]);
  // Own words are a pick in time order too: given first, they are the older one a third tap swaps out.
  s = run([...base, own("story", "They think I'm useless"), pick("story", "anger_always"), pick("story", "anger_unfair")]);
  assert.deepEqual([s.answers.story.ids, s.answers.story.own], [["anger_always", "anger_unfair"], null]);
  // Given second, the older chip goes and the words stay; the next tap then swaps out the words.
  s = run([...base, pick("story", "anger_always"), own("story", "Mine"), pick("story", "anger_unfair")]);
  assert.deepEqual([s.answers.story.ids, s.answers.story.own], [["anger_unfair"], "Mine"]);
  s = run([...base, pick("story", "anger_always"), own("story", "Mine"), pick("story", "anger_unfair"), pick("story", "anger_on_purpose")]);
  assert.deepEqual([s.answers.story.ids, s.answers.story.own], [["anger_unfair", "anger_on_purpose"], null]);
  s = run([...base, own("story", "x".repeat(200))]);
  assert.equal(s.answers.story.own.length, 140, "own words are capped at 140");
  // Changing the word drops stories its new set doesn't offer.
  s = run([...base, pick("story", "anger_on_purpose"), { type: "back" }, { type: "back" }, pick("feel", "anxious")]);
  assert.equal(s.answers.story.ids.length, 0);
});

test("screen 4: alternatives grouped by story, own story gets its own three, un-picking a story drops its picks", () => {
  const field = skill.steps[3].fields[0];
  const answers = { feel: { ids: ["annoyed"], own: null }, story: { ids: ["anger_always"], own: "It's always me" } };
  const groups = M.optionGroups(ctx(), field, answers);
  assert.deepEqual(groups.map((g) => [g.key, g.label, g.options.length]), [["anger_always", "This always happens", 3], ["$own", "It's always me", 3]]);
  assert.deepEqual(groups[1].options.map((o) => o.value), ["own_alt_unknown", "own_alt_other_view", "own_alt_meaning"]);
  const base = [pick("feel", "annoyed"), next, pick("event", "said"), next, pick("story", "anger_always"), pick("story", "anger_unfair"), next];
  let s = run([...base, pick("alt", "anger_always_alt1"), pick("alt", "anger_unfair_alt3")]);
  assert.deepEqual(s.answers.alt.ids, ["anger_always_alt1", "anger_unfair_alt3"]);
  s = run([...base, pick("alt", "anger_always_alt1"), pick("alt", "anger_unfair_alt3"), { type: "back" }, pick("story", "anger_unfair")]);
  assert.deepEqual(s.answers.alt.ids, ["anger_always_alt1"]);
  assert.equal(M.canGoOn(ctx(), run(base)), true, "none is fine");
});

test("screen 5 shows for fear, anger and shame, or a story that predicts; otherwise it is skipped", () => {
  const after = (feel, stories) => run(toFits(feel, stories)).stepId;
  assert.equal(after("anxious", ["fear_wont_cope"]), "threat");
  assert.equal(after("annoyed", ["anger_on_purpose"]), "threat");
  assert.equal(after("ashamed", ["shame_think_less"]), "threat");
  assert.equal(after("hurt", ["sad_gone"]), "fits", "sadness, no prediction: skipped");
  assert.equal(after("hurt", ["sad_never_better"]), "threat", "a story that predicts");
  assert.equal(after("guilty", ["guilt_hurt_them"]), "fits");
  const predicts = skill.options.story.filter((o) => o.predicts).map((o) => o.value).sort();
  assert.deepEqual(predicts, ["anger_always", "fear_bad_coming", "fear_theyll_leave", "fear_theyll_see", "fear_wont_cope", "gen_against_me", "gen_go_wrong", "sad_never_better", "shame_if_they_knew"]);
});

test("threatsFor: the parent's threats, can't say and nothing like that last; every threat with no parent", () => {
  const field = skill.steps[4].fields[0];
  const forWord = (w) => M.optionGroups(ctx(), field, { feel: { ids: [w], own: null } })[0].options.map((o) => o.value);
  assert.deepEqual(forWord("annoyed"), ["hurt", "unfair", "cant_say", "none"]);
  assert.deepEqual(forWord("anxious"), ["hurt", "left", "embarrassed", "lose", "cant_say", "none"]);
  const noParent = [...gridIds].find((id) => !content.parentOf[id]);
  assert.deepEqual(forWord(noParent), ["hurt", "left", "embarrassed", "lose", "unfair", "cant_say", "none"]);
});

test("screen 5's parts appear in turn; Nothing like that hides them; the Cope Ahead link once getting-through is answered", () => {
  const step = skill.steps[4];
  const base = toFits("anxious", ["fear_wont_cope"]);
  const shown = (s) => M.shownFields(ctx(), step, s).map((f) => f.id);
  assert.deepEqual(shown(run(base)), ["threat"]);
  assert.deepEqual(shown(run([...base, pick("threat", "left")])), ["threat", "likely"]);
  assert.deepEqual(shown(run([...base, pick("threat", "left"), pick("likely", "either")])), ["threat", "likely", "through"]);
  assert.deepEqual(shown(run([...base, own("threat", "Losing the flat")])), ["threat", "likely"]);
  const none = run([...base, pick("threat", "left"), pick("likely", "either"), pick("threat", "none")]);
  assert.deepEqual(shown(none), ["threat"]);
  assert.equal(run([...base, pick("threat", "left"), pick("likely", "either"), pick("threat", "none"), next]).answers.likely, undefined, "hidden answers are not kept");
  const through = step.fields[2];
  assert.deepEqual(M.fieldLinks(ctx(), through, run([...base, pick("threat", "left"), pick("likely", "very")])), []);
  const [link] = M.fieldLinks(ctx(), through, run([...base, pick("threat", "left"), pick("likely", "very"), pick("through", "unsure")]));
  assert.deepEqual([link.exit.toolId, link.exit.query, link.label], ["cope-ahead", { first: "other" }, "Plan for it with Cope Ahead"]);
  assert.equal(M.canGoOn(ctx(), run(base)), true, "Next works from any point");
});

test("screen 6: the parent's fitsTheFactsWhen, unchanged, under 'feeling {word}'; no parent → the general title and no list", () => {
  const step = skill.steps[5];
  const c = ctx();
  let s = run([...toFits("hurt", ["sad_gone"])]);
  assert.equal(s.stepId, "fits");
  assert.equal(M.copyText(c, step.title, s, M.titleSlots(c, step, s)), "Here's when feeling hurt fits the facts. Does one of these match what happened?");
  assert.deepEqual(M.fieldList(c, step.fields[0], s), content.fitsWhen.sadness.lines);
  const erc = readFileSync("schema/emotion-regulation-content.cypher", "utf8");
  for (const line of content.fitsWhen.sadness.lines) assert.ok(erc.includes(JSON.stringify(line).slice(1, -1)) || erc.includes(line), line);
  const noParent = [...gridIds].find((id) => !content.parentOf[id]);
  s = run(toFits(noParent, ["gen_my_fault"]));
  assert.equal(s.stepId, "fits");
  assert.match(M.copyText(c, step.title, s, M.titleSlots(c, step, s)), /^Does feeling .+ fit what happened\?$/);
  assert.equal(M.fieldList(c, step.fields[0], s), null);
  assert.equal(M.canGoOn(c, s), false, "Next once an answer is picked");
  assert.deepEqual(M.askFresh(c, run([...toFits("hurt", ["sad_gone"]), pick("fits", "partly")])), { fitsFacts: "partly" });
});

test("handoffFor: the hand-off table, Done always there", () => {
  const offered = (fits, event) => {
    // I'm not sure goes by the missing fact first (v1.2); Next with nothing picked goes on.
    const s = run([...toFits("hurt", ["sad_gone"], event), pick("fits", fits), next, ...(fits === "unsure" ? [next] : [])]);
    assert.equal(s.stepId, "next");
    const step = M.stepOf(skill, "next");
    return [M.handoffLine(ctx(), step, s), s.offered.map((x) => skill.exits.find((e) => e.id === x).toolId)];
  };
  assert.deepEqual(offered("fits", "saw"), [skill.copy.next_fits, ["problem-solve", "let-it-be"]]);
  assert.deepEqual(offered("fits", "said"), [skill.copy.next_fits, ["problem-solve", "dear-man", "let-it-be"]]);
  assert.deepEqual(offered("fits", "didnt"), [skill.copy.next_fits, ["problem-solve", "dear-man", "let-it-be"]]);
  assert.deepEqual(offered("partly", "said"), [skill.copy.next_partly, ["opposite-action", "problem-solve"]]);
  assert.deepEqual(offered("doesnt_fit", "said"), [skill.copy.next_no, ["opposite-action"]]);
  assert.deepEqual(offered("unsure", "said"), [skill.copy.next_unsure, ["wise-mind"]]);
  assert.equal(M.stepOf(skill, "next").done, "done");
  const wise = skill.exits.find((e) => e.id === "wise_mind");
  assert.deepEqual(wise.query, { first: "wm_q_next" });
  for (const id of ["problem_solve", "opposite_action", "dear_man"]) assert.deepEqual(skill.exits.find((e) => e.id === id).carry, ["feel"]);
});

test("the attempt record: ext.run validates on the server, ids and own words only, nothing pre-filled", () => {
  const c = ctx();
  let s = run([pick("feel", "annoyed"), next, pick("event", "said"), own("event", "They left me on read"), next,
    pick("story", "anger_on_purpose"), next, pick("alt", "anger_on_purpose_alt2"), next, pick("threat", "unfair"), pick("likely", "not_that"),
    pick("through", "yes"), next, pick("fits", "partly"), next, { type: "shown", record: "unblend" }, { type: "exit", exitId: "opposite_action" }], c);
  const rec = M.runRecord(c, s);
  assert.equal(rec.skillId, "check_the_facts");
  assert.equal(rec.versionId, "cf-v1-2");
  assert.deepEqual(rec.path, ["feel", "event", "story", "alt", "threat", "fits", "next"]);
  assert.deepEqual(rec.offeredExitIds, ["opposite_action", "problem_solve"]);
  assert.equal(rec.exitId, "opposite_action");
  assert.deepEqual(rec.embedsShown, ["unblend"]);
  assert.deepEqual(rec.answers.find((a) => a.fieldId === "event"), { fieldId: "event", optionIds: ["said"], valueOwn: "They left me on read" });
  const stored = JSON.parse(validateExt({ run: rec }));
  assert.deepEqual(stored.run.path, rec.path);
  assert.deepEqual(M.runEmotionIds(c, s), ["annoyed"]);
  assert.deepEqual(M.initialRun(skill).answers, {}, "every visit starts empty");
  // A full run with every own-words box at 140 characters still fits in 4 KB.
  const long = "x".repeat(140);
  s = run([pick("feel", "anxious"), next, own("event", long), next, pick("story", "fear_wont_cope"), own("story", long), next,
    pick("alt", "fear_wont_cope_alt1"), pick("alt", "fear_wont_cope_alt2"), pick("alt", "fear_wont_cope_alt3"), pick("alt", "own_alt_unknown"), pick("alt", "own_alt_other_view"), pick("alt", "own_alt_meaning"), own("alt", long), next,
    own("threat", long), pick("likely", "very"), pick("through", "unsure"), next, pick("fits", "unsure"), next,
    own("fact", long), pick("when", "this_week"), next], c);
  assert.equal(M.runRecord(c, s).answers.find((a) => a.fieldId === "fact").valueOwn.length, 60, "one fact: 60 characters");
  assert.ok(validateExt({ run: M.runRecord(c, s) }));
});

test("never: no 'overreacting', no scale, no pre-selection, no story marked true, no part named", () => {
  const all = JSON.stringify(skill);
  assert.ok(!/overreact/i.test(all));
  assert.ok(!/%|\b(score|scale|rate)\b/i.test(JSON.stringify(skill.copy)));
  assert.ok(!/\ba part of (you|me)\b/i.test(JSON.stringify([skill.copy, skill.options])), "the skill's own copy never names a part (the parts line is parts copy)");
  assert.ok(skill.options.alt.every((o) => !("right" in o) && !("true" in o)));
});

// --- v1.1 (PRD ER-02; docs/design/dbt-modules-plan.md ER-B1): safety chips and planned exits ---------------

test("v1.1 safety chips: danger from a person shows the other_person resources and skips the story, readings and threat", () => {
  const c = ctx();
  const event = skill.steps.find((x) => x.id === "event");
  for (const chip of ["threatened", "hurt_me", "unsafe"]) {
    const opt = skill.options.event.find((o) => o.value === chip);
    assert.equal(opt.danger, "other", chip);
    let s = run([pick("feel", "anxious"), next, pick("event", chip)], c);
    assert.equal(M.crisisFor(c, event, s).variant, "other_person", `${chip}: the banner shows as soon as it's picked`);
    s = M.runNext(c, s, next);
    assert.equal(s.stepId, "safe");
    assert.deepEqual(s.path, ["feel", "event", "safe"]);
    const safe = M.stepOf(skill, "safe");
    assert.equal(M.crisisFor(c, safe, s).variant, "other_person", "and stays on the hand-off");
    assert.match(M.handoffLine(c, safe, s), /Your read of danger is the one that counts here/);
    assert.deepEqual(s.offered, [], "nothing to weigh, nothing to work on: Done only");
    assert.equal(M.askFresh(c, s).fitsFacts, undefined, "no verdict is asked for");
    assert.equal(safe.done, "done");
    assert.equal(safe.noClose, true, "no close question after a disclosure of danger");
  }
  // Own words are never read: once there are any, a quiet way to talk to someone shows under them.
  const field = event.fields[0];
  assert.deepEqual(M.fieldLinks(c, field, run([pick("feel", "anxious"), next, pick("event", "said")], c)), []);
  assert.deepEqual(M.fieldLinks(c, field, run([pick("feel", "anxious"), next, own("event", "he grabbed my arm")], c)).map((l) => l.exit.id), ["safety_open"]);
  // Other event kinds: no banner, the usual way on.
  const s = run([pick("feel", "anxious"), next, pick("event", "said")], c);
  assert.equal(M.crisisFor(c, event, s), null);
  assert.equal(M.runNext(c, s, next).stepId, "story");
});

test("v1.1 exits: let it be is offered when it fits (DT-04 built); the wave is written for fits and doesn't-fit, and never offered until it ships", () => {
  const planned = skill.exits.filter((x) => x.planned).map((x) => x.toolId).sort();
  assert.deepEqual(planned, ["mindfulness-emotions"]);
  const nextStep = M.stepOf(skill, "next");
  const offeredExits = nextStep.offers.map((o) => o.exit);
  assert.ok(offeredExits.includes("mindfulness_emotions") && offeredExits.includes("let_it_be"));
  for (const fits of ["fits", "doesnt_fit"]) {
    const s = run([...toFits("hurt", ["sad_gone"]), pick("fits", fits), next]);
    assert.ok(!s.offered.includes("mindfulness_emotions"), fits);
    assert.equal(s.offered.includes("let_it_be"), fits === "fits", fits);
  }
});

test("v1.2, still don't know: one missing fact and an optional check-in; a chip schedules check_fact, none schedules nothing", () => {
  const c = ctx();
  const unsure = [...toFits("hurt", ["sad_gone"]), pick("fits", "unsure"), next];
  let s = run(unsure, c);
  assert.equal(s.stepId, "missing");
  const step = M.stepOf(skill, "missing");
  assert.equal(skill.copy[step.hint], "Not knowing is an answer. The move is one fact, not a decision.");
  assert.deepEqual(skill.options.fact.map((o) => o.value), ["ask_them", "wait", "look", "ask_trusted"]);
  assert.equal(M.canGoOn(c, s), true, "both fields are optional");
  assert.equal(M.followUpFor(c, step, s), null, "no chip, no follow-up");
  s = run([...unsure, pick("fact", "ask_them"), pick("when", "tomorrow")], c);
  assert.deepEqual(M.followUpFor(c, step, s), { type: "check_fact", chip: "tomorrow" });
  s = M.runNext(c, s, { type: "scheduled", stepId: "missing", followUpType: "check_fact", id: "fu1" });
  assert.equal(M.followUpFor(c, step, s), null, "once per step per run");
  s = M.runNext(c, s, next);
  assert.equal(s.stepId, "next");
  assert.deepEqual(s.path, ["feel", "event", "story", "alt", "fits", "missing", "next"]);
  // The window chips are the follow-up type's own (scripts/practice-spine/content.py), and the type ships.
  const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
  const type = spine.followUpTypes.find((t) => t.id === "check_fact");
  assert.ok(type?.enabled);
  assert.deepEqual(skill.options.when.map((o) => o.value).sort(), Object.keys(type.window.chips).sort());
  assert.equal(type.notification, "A check-in you asked for is ready.", "content-free");
  // Own words for the fact aren't read: someone to talk to is a quiet tap away.
  const links = (st) => M.fieldLinks(c, step.fields[0], st).map((l) => l.exit.id);
  assert.deepEqual(links(run(unsure, c)), []);
  assert.deepEqual(links(run([...unsure, own("fact", "ask him what he meant")], c)), ["safety_open"]);
  // Every other answer goes straight to the card.
  for (const f of ["fits", "partly", "doesnt_fit"]) assert.equal(run([...toFits("hurt", ["sad_gone"]), pick("fits", f), next], c).stepId, "next");
});
