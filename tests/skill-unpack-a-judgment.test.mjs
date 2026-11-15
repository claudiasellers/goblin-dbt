// Unpack a judgment (PRD MF-03; nonjudgmentally: DBT Mindfulness Handouts 5, 5a; docs/design/unpack-a-judgment.md) on
// the skill runtime: who the judgment is about, the judgment as said, seen as a judgment (or, with shame or guilt, the
// facts first), unpacked into what happened, what it cost, what I feel and what I wanted, put back together as a
// plain description, then closer · not quite · keep it for now. Tested through the same pure machine the player
// runs, plus the describe card's pure lines (src/lib/describeCard.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const D = await importTs("src/lib/describeCard.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "unpack_a_judgment");
// The feel chips plus the carried words the routes read (a carried word off the grid is dropped, as in the app).
const GRID = ["ashamed", "embarrassed", "guilty", "sad", "hurt", "lonely", "angry", "frustrated", "disappointed", "anxious",
  "worthless", "insecure"];
const embedOutputs = {
  describeCard: { ids: ["read"] },
  bodyCard: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
};
const ctx = (ctxIn = {}, carried = []) => ({ skill, shared: content, carried, gridIds: new Set(GRID), emotionLabel: (x) => x[0].toUpperCase() + x.slice(1), ctxIn, embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const read = { type: "embedDone", output: { ids: ["read"] } };
const handsDone = { type: "embedDone", output: { ids: ["done"], durationSec: 20 } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s);
const ids = (s, step, c = ctx()) => {
  const f = M.shownFields(c, M.stepOf(skill, step), s)[0];
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const line = (s, c = ctx()) => M.handoffLine(c, M.stepOf(skill, s.stepId), s);
const title = (s, c = ctx()) => M.copyText(c, M.stepOf(skill, s.stepId).title, s, M.titleSlots(c, M.stepOf(skill, s.stepId), s));
const links = (s, c = ctx()) => {
  const st = M.stepOf(skill, s.stepId);
  return [...M.stepLinks(c, st, s), ...M.shownFields(c, st, s).flatMap((f) => M.fieldLinks(c, f, s))].map((l) => l.exit.id);
};
const ME = [pick("about", "me"), next, pick("judge", "pathetic"), next];
const DOWN = [...ME, pick("see", "down"), next];
const PILES = [...DOWN, pick("happened", "didnt_go"), next, pick("cost", "missed_out"), next, pick("feel", "ashamed"), next,
  pick("want", "show_up"), next];

test("the skill: tool unpack-a-judgment on dbt_nonjudgmental, listed under Mindfulness, with the intent I'm being hard on myself", () => {
  assert.equal(skill.toolId, "unpack-a-judgment");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_nonjudgmental"\}\), \(s:Skill \{id: "unpack_a_judgment"\}\)/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'unpack-a-judgment': 'unpack_a_judgment',/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'unpack-a-judgment',\n\s+name: 'Unpack a judgment',[\s\S]*?module: 'mindfulness',/);
  assert.match(tools, /label: 'I\\'m being hard on myself', toolId: 'unpack-a-judgment'/, "PRD MF-03: MF's second intent");
  for (const f of ["src/lib/spine/close.ts", "functions/src/spine/tools.ts"])
    assert.match(readFileSync(f, "utf8"), /'unpack-a-judgment': \{ module: 'mf', closeKind: 'none' \}/, f);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_nonjudgmental", t: "unpack-a-judgment"\}/);
  assert.match(readFileSync("src/data/content/tool-names.json", "utf8"), /"unpack-a-judgment": "Non-judgmentally"/);
});

test("who it's about, then the PRD's judgments for that target, or their own words", () => {
  const s0 = M.initialRun(skill);
  assert.deepEqual(ids(s0, "about"), ["me", "feeling", "them", "should", "harm"]);
  const at = (t) => ids(run([pick("about", t), next]), "judge");
  assert.deepEqual(at("me"), ["too_much", "pathetic", "ruin", "lazy", "wrong_with_me"]);
  assert.deepEqual(at("feeling"), ["shouldnt_feel", "overreacting", "dramatic"]);
  assert.deepEqual(at("them"), ["selfish", "dont_care", "on_purpose"]);
  assert.deepEqual(at("should"), ["shouldnt_happen", "not_fair"]);
  const s = run([pick("about", "me"), next, own("judge", "I'm a mess"), next]);
  assert.equal(s.stepId, "see");
  assert.equal(title(s), "“I'm a mess”", "received exactly as said");
  const quoted = run([pick("about", "me"), next, own("judge", "“I'm a mess”"), next]);
  assert.equal(title(quoted), "“I'm a mess”", "own words already in quotes aren't quoted twice");
});

test("the self-harm chip is on the first screen and a link on every screen after; it opens the crisis route, no unpacking", () => {
  const s = run([pick("about", "harm"), next]);
  assert.equal(s.stepId, "harm");
  assert.deepEqual(offers(s), ["safety_open"]);
  assert.ok(M.stepOf(skill, "harm").crisis.some((c) => c.variant === "crisis"));
  for (const st of [run([pick("about", "me"), next]), run(ME), run(DOWN), run([...DOWN, next]), run([...DOWN, next, next])])
    assert.ok(links(st).includes("safety_open"), st.stepId);
  const link = M.stepOf(skill, "see").fields[0].links.find((l) => l.exit === "safety_open");
  assert.equal(skill.copy[link.label], "Thoughts of hurting myself or not being here");
  assert.equal(skill.options.about.find((o) => o.value === "harm").label,
    "It's more than a judgment. I'm thinking about hurting myself or not being here", "passive thoughts count too");
  // A heavy carried word (the self-worth row brings worthless here): the end cards say it plainly.
  const heavy = ctx({}, ["worthless"]);
  const kept = run([...PILES, read, pick("sit", "keep"), next], heavy);
  assert.match(line(kept, heavy), /thoughts of not being here/);
});

test("seen as a judgment: a witness line for its target first, no correction; Back to the room on every unpacking screen", () => {
  assert.equal(line(run(ME)), "That's a heavy thing to be carrying.");
  assert.equal(line(run([pick("about", "them"), next, pick("judge", "selfish"), next])), "Something they did got to you. Setting the verdict down isn't agreeing with what they did.");
  assert.deepEqual(ids(run(ME), "see"), ["down", "fact"]);
  assert.match(skill.copy.see_hint, /Minds make them all the time/, "don't judge the judging (Handout 5a)");
  assert.match(skill.copy.see_hint, /set it down/);
  for (const st of [run(ME), run(DOWN), run([...DOWN, next]), run([...DOWN, next, next]), run([...DOWN, next, next, next])])
    assert.ok(links(st).includes("five_senses"), st.stepId);
  assert.equal(skill.copy.back_to_room, "Back to the room");
  const all = JSON.stringify(skill.copy);
  assert.doesNotMatch(all, /don't judge|is it true|really true|better thought/i, "never disputes the judgment (KB 5.5)");
});

test("It feels like a fact, with shame or guilt (the chip's hint or a carried word) → Check the Facts or under it anyway; otherwise on to the piles", () => {
  const fact = run([...ME, pick("see", "fact"), next]);
  assert.equal(fact.stepId, "facts");
  assert.deepEqual(ids(fact, "facts"), ["check", "under"]);
  assert.match(line(fact), /looks at the feeling, not at whether the verdict is true/);
  const go = run([pick("facts", "check"), next], ctx(), fact);
  assert.equal(go.stepId, "facts_go");
  assert.deepEqual(offers(go), ["check_the_facts"]);
  assert.equal(run([pick("facts", "under"), next], ctx(), fact).stepId, "happened", "staying with the skill is a choice");
  assert.equal(run([...ME, pick("see", "fact"), next], ctx({ frame: "after_facts" })).stepId, "happened",
    "from Do the Opposite's facts: never a second trip to Check the Facts");
  const themCarried = [pick("about", "them"), next, pick("judge", "selfish"), next, pick("see", "fact"), next];
  assert.equal(run(themCarried, ctx({}, ["insecure"])).stepId, "happened", "a carried shame word doesn't make a verdict about them shame");
  const ruin = run([pick("about", "me"), next, pick("judge", "ruin"), next, pick("see", "fact"), next]);
  assert.equal(ruin.stepId, "facts", "guilt");
  const them = run([pick("about", "them"), next, pick("judge", "selfish"), next, pick("see", "fact"), next]);
  assert.equal(them.stepId, "happened", "anger: unpack");
  assert.equal(line(them), "It can feel like a fact. Start with what a camera would catch.");
  const ownWords = [pick("about", "me"), next, own("judge", "I'm a mess"), next, pick("see", "fact"), next];
  assert.equal(run(ownWords).stepId, "happened", "own words, nothing carried");
  const carried = ctx({}, ["ashamed"]);
  assert.equal(run(ownWords, carried).stepId, "facts", "own words with a carried shame word");
});

test("the piles: what happened per target (a camera's view), what it cost, grid words as guesses, what I wanted; each optional", () => {
  assert.deepEqual(ids(run(DOWN), "happened"), ["didnt_go", "late", "not_done", "forgot_thing", "stayed_in", "raised"]);
  for (const t of ["me", "feeling", "them", "should"]) {
    const s = run([pick("about", t), next, own("judge", "x"), next, pick("see", "down"), next]);
    assert.ok(ids(s, "happened").length <= 6 || t === "them", t);
    assert.ok(ids(s, "happened").filter((v) => v !== "threat").length <= 6, t);
    assert.ok(ids(run([next], ctx(), s), "cost").length <= 7, t);
  }
  const themCost = ids(run([pick("about", "them"), next, pick("judge", "selfish"), next, pick("see", "down"), next, next]), "cost");
  assert.ok(themCost.includes("on_my_own") && !themCost.includes("snapped"), "what their action cost, not only my reactions");
  const themDown = [pick("about", "them"), next, pick("judge", "dont_care"), next, pick("see", "down"), next];
  assert.ok(ids(run(themDown), "happened").includes("threat"));
  assert.ok(!ids(run(DOWN), "happened").includes("threat"));
  for (const [step, f] of [["happened", "happened"], ["cost", "cost"], ["feel", "feel"], ["want", "want"]]) {
    const fld = M.stepOf(skill, step).fields.find((x) => x.id === f);
    assert.equal(fld.required, false, `${f} can be skipped`);
  }
  assert.deepEqual(run([...DOWN, next, next, next]).stepId, "want", "skipping three piles lands on the last");
  assert.equal(run([...DOWN, next, next, next, next]).stepId, "noticed", "nothing picked anywhere: noticing it was the skill");
  const feel = M.stepOf(skill, "feel").fields[0];
  assert.equal(feel.emotion, true);
  assert.deepEqual(skill.emotionFields, ["feel"], "the session's words are the feelings picked, never a chip's hint");
  const g = ctx({}, ["guilty"]);
  const atFeel = run([...DOWN, next, next], g);
  assert.equal(M.emotionChoices(g, M.stepOf(skill, "feel").fields[0], atFeel.answers)[0], "guilty", "a carried word first");
});

test("someone else: to be safe leads the values, Not judging isn't agreeing; a threat is a danger route, never a pile", () => {
  const themDown = [pick("about", "them"), next, pick("judge", "dont_care"), next, pick("see", "down"), next];
  const want = run([...themDown, next, next, next]);
  assert.equal(want.stepId, "want");
  assert.deepEqual(ids(want, "want").slice(0, 3), ["safe", "stop", "distance"], "safety and boundaries first");
  assert.equal(line(want), "Not judging isn't agreeing. What you wanted still matters.");
  assert.equal(ids(run([...DOWN, next, next, next]), "want")[0], "show_up");
  const danger = run([...themDown, pick("happened", "threat"), next]);
  assert.equal(danger.stepId, "danger");
  assert.deepEqual(offers(danger), ["ending", "safety_open"]);
  assert.ok(M.stepOf(skill, "danger").crisis.some((c) => c.variant === "other_person"));
  assert.deepEqual(skill.exits.find((e) => e.id === "ending").query, { frame: "careful" });
});

test("the rebuild: the person's picks as a plain first-person description, then closer · not quite · keep it for now", () => {
  const s = run(PILES);
  assert.equal(s.stepId, "rebuild");
  const picked = M.pickedLabels(ctx(), s);
  const lines = D.describeLines(picked, { feelLead: skill.copy.feel_lead, wantLead: skill.copy.want_lead });
  assert.deepEqual(lines, ["I didn't go.", "I missed out on something.", "I feel ashamed.", "I wanted to be someone who shows up."]);
  const sit = run([...PILES, read]);
  assert.equal(sit.stepId, "sit");
  assert.deepEqual(skill.options.sit.map((o) => o.label), ["That's closer", "Not quite", "I'll keep the judgment for now"]);
  const kept = run([...PILES, read, pick("sit", "keep"), next]);
  assert.equal(kept.stepId, "kept");
  assert.equal(line(kept), "You noticed it as a judgment. That's the skill.");
  assert.equal(M.stepOf(skill, "kept").complete, true, "keeping it is a full answer");
});

test("not quite changes one pile, once, and comes straight back to the rebuild; emptying the last pile is still a rep", () => {
  const fix = run([...PILES, read, pick("sit", "not_quite"), next]);
  assert.equal(fix.stepId, "fix");
  assert.deepEqual(ids(fix, "fix"), ["happened", "cost", "feel", "want"]);
  const feel = run([pick("fix", "feel"), next], ctx(), fix);
  assert.equal(feel.stepId, "feel");
  const back = run([pick("feel", "hurt"), next], ctx(), feel);
  assert.equal(back.stepId, "rebuild");
  assert.deepEqual(M.pickedLabels(ctx(), back).feel, ["Ashamed", "Hurt"]);
  const cost = run([pick("fix", "cost"), next, next], ctx(), fix);
  assert.equal(cost.stepId, "rebuild", "a changed pile in the middle doesn't walk the rest again");
  assert.deepEqual(ids(run([read], ctx(), back), "sit"), ["closer", "keep"], "one change a visit: no loop over the card");
  const only = run([...ME, pick("see", "down"), next, next, next, pick("feel", "sad"), next, next, read, pick("sit", "not_quite"), next,
    pick("fix", "feel"), next]);
  assert.equal(run([{ type: "pick", fieldId: "feel", value: "sad" }, next], ctx(), only).stepId, "noticed", "nothing left: never an empty card");
});

test("closer: twenty optional seconds of willing hands, then the end card; values and Recover by what was found", () => {
  const q = run([...PILES, read, pick("sit", "closer"), next]);
  assert.equal(q.stepId, "hands_q");
  const hands = run([pick("hands_q", "yes"), next], ctx(), q);
  assert.equal(hands.stepId, "hands");
  assert.equal(M.stepOf(skill, "hands").props.kind, "willing");
  assert.equal(M.stepOf(skill, "hands").props.seconds, 20);
  const end = run([handsDone], ctx(), hands);
  assert.equal(end.stepId, "end");
  assert.equal(title(end), "You took it apart instead of carrying it whole.");
  assert.deepEqual(offers(end), ["values"]);
  assert.equal(run([pick("hands_q", "no"), next], ctx(), q).stepId, "end");
  const them = run([pick("about", "them"), next, pick("judge", "selfish"), next, pick("see", "down"), next,
    pick("happened", "no_reply"), next, next, next, pick("want", "respected"), next, read, pick("sit", "closer"), next,
    pick("hands_q", "no"), next]);
  assert.deepEqual(offers(them), ["values", "recover"]);
  assert.equal(line(them), "What you wanted still counts, whatever they did. Next time, noticing the judgment is the practice.");
  assert.ok(!JSON.stringify(skill.steps).includes("unpack_another"), "one unpack a visit (PRD: shame spiral)");
});

test("a carried flooded reading sets it down (body first); a carried stirred reading unpacks one pile", () => {
  const flooded = run([pick("about", "me"), next], ctx({ band: "flooded" }));
  assert.equal(flooded.stepId, "set_down", "straight from the first screen: no rehearsing the verdict");
  assert.equal(title(flooded, ctx({ band: "flooded" })), "A judgment can wait.");
  assert.deepEqual(offers(flooded, ctx({ band: "flooded" })), ["cool_down"]);
  const st = ctx({ band: "stirred" });
  const pickStep = run(DOWN, st);
  assert.equal(pickStep.stepId, "pick");
  assert.deepEqual(ids(pickStep, "pick", st), ["feel", "want"]);
  const felt = run([...DOWN, pick("pick", "feel"), next, pick("feel", "ashamed"), next], st);
  assert.equal(felt.stepId, "rebuild", "one pile, then the rebuild");
  const sit = run([read, pick("sit", "closer"), next], st, felt);
  assert.equal(sit.stepId, "end", "no willing hands on the short path");
  assert.deepEqual(ids(run([read, pick("sit", "not_quite"), next], st, felt), "fix", st), ["feel", "want"]);
  assert.equal(run([...DOWN, pick("pick", "want"), next, next], st).stepId, "noticed");
  // The short path skips what happened, so a danger from a person is caught on the see step.
  const themSee = run([pick("about", "them"), next, pick("judge", "on_purpose"), next], st);
  assert.deepEqual(ids(themSee, "see", st), ["down", "fact", "threat"]);
  const danger = run([pick("see", "threat"), next], st, themSee);
  assert.equal(danger.stepId, "danger");
  assert.ok(M.stepOf(skill, "see").crisis.some((c) => c.variant === "other_person"));
  assert.deepEqual(links(danger), [], "the danger card offers someone to talk to itself");
});

test("the describe card's lines: sentences kept, feelings joined, *I* never lower-cased, own words kept", () => {
  const L = { feelLead: "I feel", wantLead: "I wanted" };
  assert.deepEqual(D.describeLines({ happened: ["I didn't go."], feel: ["Ashamed", "Hurt", "Sad"], want: ["To rest"] }, L),
    ["I didn't go.", "I feel ashamed, hurt and sad.", "I wanted to rest."]);
  assert.deepEqual(D.describeLines({ happened: ["they left early"], feel: ["I don't know"] }, L), ["They left early.", "I feel I don't know."]);
  assert.deepEqual(D.describeLines({ want: ["I need them to stop", "I wanted a break", "Sam to call me", "to be heard"] }, L),
    ["I need them to stop.", "I wanted a break.", "Sam to call me.", "I wanted to be heard."], "own words that don't read on from the lead stand as written");
  assert.deepEqual(D.describeLines({}, L), []);
  assert.equal(D.sentence("Done?"), "Done?");
});

test("reps: a completed visit is a nonjudge rep (Preliminary); routes (facts, danger, harm, flooded) aren't completions", () => {
  const ps = readFileSync("scripts/practice-spine/content.py", "utf8");
  assert.match(ps, /\("nonjudge", "Nonjudgmentally", "Preliminary", "mind", "dbt_nonjudgmental",[\s\S]*?\["unpack-a-judgment"\]\)/);
  for (const id of ["facts_go", "danger", "harm", "set_down"]) assert.equal(M.stepOf(skill, id).complete, false, id);
  for (const id of ["kept", "noticed", "end"]) assert.equal(M.stepOf(skill, id).complete, true, id);
});

test("routing: the swap beside Recover on the self-worth words (Social threat); Do the Opposite's clarify links it for shame or guilt", async () => {
  const rf = readFileSync("schema/recommended-for.cypher", "utf8");
  assert.match(rf, /\{id: "rf_social_threat_shame_words_self-worth_unpack-a-judgment", c: "dbt_nonjudgmental", p: "social_threat_shame"[^}]*active: true, review: "approved"/);
  const oa = content.skills.find((s) => s.id === "opposite_action");
  assert.ok(oa.exits.some((e) => e.id === "unpack" && e.toolId === "unpack-a-judgment" && e.query?.frame === "after_facts"));
  assert.match(readFileSync("scripts/recommendations/content.py", "utf8"),
    /"unpack-a-judgment": \["dissociation_overmodulation", "conservation_freeze"\]/, "never in shame collapse or far away");
  const clar = oa.steps.find((s) => s.id === "clar");
  assert.ok(clar.offers.some((o) => o.exit === "unpack"));
});
