// Know this feeling, Walk the wave (PRD ER-10 part 2, DBT ER Handout 5; docs/design/emotion-guide.md, *Walk the
// wave*): the third skill under the `emotion-guide` tool, opened by `?frame=wave`. One episode as the model's seven
// slots, entered where it's clearest, any slot skippable, the name last as a guess, then the strip on paper and what's
// next. Danger from a person and Hurt myself carry their crisis slots to the end. Tested through the pure machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const { emotionGuideSkillFor } = await importTs("src/lib/emotionGuide.ts");
const { emotions } = await importTs("src/data/emotions.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "walk_the_wave");
const ctf = content.skills.find((s) => s.id === "check_the_facts");
const hold = content.skills.find((s) => s.id === "hold_to_wait");
const gridIds = new Set(emotions.map((e) => e.id));
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds, ctxIn, embedOutputs: { episodeStrip: { ids: ["read"] } },
  emotionLabel: (id) => (emotions.find((e) => e.id === id)?.name ?? id).toLowerCase() });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const read = { type: "embedDone", output: { ids: ["read"] } };
const run = (events, c = ctx()) => events.reduce((s, e) => M.runNext(c, s, e), M.initialRun(skill));
const step = (s) => M.stepOf(skill, s.stepId);
const line = (s, c = ctx()) => M.handoffLine(c, step(s), s);
const offers = (s, c = ctx()) => M.offersFor(c, step(s), s);
const ORDER = ["before", "event", "mind", "body", "urge", "did", "after"];
// Walk from a start to the name step, skipping every slot; returns the path of step ids.
const walk = (start, c = ctx()) => {
  let s = run([pick("start", start), next], c);
  const path = [];
  while (ORDER.includes(s.stepId)) { path.push(s.stepId); s = M.runNext(c, s, next); }
  return { s, path };
};

test("the skill: emotion-guide on dbt_model_of_emotions, picked by ?frame=wave, the guess is the visit's emotion", () => {
  assert.equal(skill.toolId, "emotion-guide");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_model_of_emotions"\}\), \(s:Skill \{id: "walk_the_wave"\}\)/);
  assert.equal(emotionGuideSkillFor("wave"), "walk_the_wave");
  assert.equal(emotionGuideSkillFor("myths"), "emotion_myths");
  assert.equal(emotionGuideSkillFor(null), "emotion_guide");
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'emotion-guide': \['emotion_guide', 'emotion_myths', 'walk_the_wave'\]/);
  assert.deepEqual(skill.emotionFields, ["name"]);
  assert.deepEqual(skill.accepts, ["band"]);
  for (const st of skill.steps.filter((x) => x.kind === "handoff")) assert.ok(st.noClose && st.complete, st.id);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /key: 'wave', name: 'Walk the wave',[^}]*query: 'frame=wave'/);
  assert.match(tools, /id: 'feeling-wave', label: 'Look back at a feeling, start to finish', toolId: 'emotion-guide', query: 'frame=wave'/);
});

test("the episodeStrip embed is registered on both sides with its props", () => {
  const embeds = readFileSync("src/components/skillPlayer/embeds.ts", "utf8");
  assert.match(embeds, /episodeStrip: EpisodeStrip,/);
  assert.match(embeds, /episodeStrip: \{ ids: \['read'\] \}/);
  assert.match(readFileSync("scripts/skills/content.py", "utf8"), /"episodeStrip": \{"ids": \["read"\]\}/);
  const st = M.stepOf(skill, "strip");
  assert.equal(st.embed, "episodeStrip");
  assert.deepEqual(st.props.fields, ORDER, "the model's order, whatever the start");
  assert.equal(skill.copy.strip_names.split(" · ").length, ORDER.length);
});

test("enter anywhere: the start slot first, then the others in the model's order, then the name", () => {
  const want = {
    before: ORDER,
    event: ["event", "before", "mind", "body", "urge", "did", "after"],
    body: ["body", "before", "event", "mind", "urge", "did", "after"],
    urge: ["urge", "before", "event", "mind", "body", "did", "after"],
    did: ["did", "before", "event", "mind", "body", "urge", "after"],
  };
  for (const [start, path] of Object.entries(want)) {
    const w = walk(start);
    assert.deepEqual(w.path, path, start);
    assert.equal(w.s.stepId, "name", `${start}: every slot can be skipped`);
  }
});

test("the chips come from the skills that own them: Check the Facts' events, Hold to wait's pulls with their urge ids", () => {
  const ids = (sk, f) => sk.options[f].map((o) => o.value);
  for (const v of ids(ctf, "event")) assert.ok(ids(skill, "event").includes(v), v);
  for (const o of hold.options.pull) {
    const mine = skill.options.urge.find((x) => x.value === o.value);
    assert.ok(mine, o.value);
    assert.equal(mine.urge, o.urge, `${o.value}: the same ActionUrge id`);
  }
  for (const f of ORDER) assert.ok(M.stepOf(skill, f).fields[0].own, `${f}: own words too`);
  for (const f of ORDER) assert.equal(M.stepOf(skill, f).fields[0].required, false, f);
});

test("a whole wave: the strip, the guess as the visit's word, then the card, the story and next time", () => {
  const c = ctx();
  let s = run([pick("start", "body"), next, pick("body", "body_chest"), next, pick("before", "before_sleep"), next,
    pick("event", "said"), next, pick("mind", "mind_dont_care"), next, pick("urge", "urge_snap"), next, pick("did", "did_said"), next,
    pick("after", "after_regret"), next], c);
  assert.equal(s.stepId, "name");
  s = [pick("name", "frustrated"), next].reduce((x, e) => M.runNext(c, x, e), s);
  assert.equal(s.stepId, "strip");
  s = M.runNext(c, s, read);
  assert.equal(s.stepId, "end");
  assert.equal(line(s), skill.copy.end_line);
  assert.deepEqual(offers(s), ["emotion_guide", "check_the_facts", "cope_ahead"]);
  for (const id of ["emotion_guide", "check_the_facts"]) assert.deepEqual(M.carried(skill.exits.find((e) => e.id === id), s, c), ["frustrated"], id);
  // No guess and no story: next time only.
  const bare = M.runNext(c, walk("before").s, next);
  assert.equal(bare.stepId, "strip");
  assert.deepEqual(offers(M.runNext(c, bare, read)), ["cope_ahead"]);
});

test("danger from a person: the other_person slot from then on, Ending (careful) and someone to talk to, no plan", () => {
  const c = ctx();
  let s = run([pick("start", "event"), pick("event", "said"), pick("event", "hurt_me"), next], c);
  assert.equal(M.crisisFor(c, step(s), s)?.variant, "other_person", "on the next slot already");
  while (s.stepId !== "end") s = M.runNext(c, s, s.stepId === "strip" ? read : next);
  assert.equal(M.crisisFor(c, step(s), s)?.variant, "other_person");
  assert.equal(line(s), skill.copy.end_danger);
  assert.equal(M.copyText(c, step(s).title, s, M.titleSlots(c, step(s), s)), skill.copy.end_title_danger);
  assert.deepEqual(offers(s), ["safety_open", "ending_careful"]);
});

test("Hurt myself: the resources first and are you safe?; not sure → someone to talk to; safe → on, banner to the end", () => {
  const c = ctx();
  let s = run([pick("start", "urge"), next, pick("urge", "send"), pick("urge", "hurt"), next], c);
  assert.equal(s.stepId, "safe");
  assert.ok(M.stepOf(skill, "safe").safetyFirst, "the resources open over the screen first");
  assert.equal(M.crisisFor(c, step(s), s)?.variant, "crisis");
  const reach = [pick("safe", "unsure"), next].reduce((x, e) => M.runNext(c, x, e), s);
  assert.equal(reach.stepId, "reach");
  assert.deepEqual(offers(reach), ["safety_open"]);
  s = [pick("safe", "safe"), next].reduce((x, e) => M.runNext(c, x, e), s);
  assert.equal(s.stepId, "before", "the walk goes on from the urge");
  while (s.stepId !== "mind") s = M.runNext(c, s, next);
  s = M.runNext(c, s, pick("mind", "mind_cant_cope"));
  while (s.stepId !== "name") s = M.runNext(c, s, next);
  s = M.runNext(c, s, pick("name", "frustrated"));
  while (s.stepId !== "end") s = M.runNext(c, s, s.stepId === "strip" ? read : next);
  assert.equal(M.crisisFor(c, step(s), s)?.variant, "crisis");
  assert.match(line(s), /talk to someone now/);
  assert.deepEqual(offers(s), ["safety_open"], "no feeling card, no story check, no plan, while the pull may be live (Codex, #127)");
});

test("both dangers: the other_person banner (it lists 988 too), one line naming both, no second Talk link", () => {
  const c = ctx();
  let s = run([pick("start", "event"), next, pick("event", "unsafe"), next], c);
  while (s.stepId !== "urge") s = M.runNext(c, s, next);
  s = [pick("urge", "hurt"), next, pick("safe", "safe"), next].reduce((x, e) => M.runNext(c, x, e), s);
  while (s.stepId !== "end") s = M.runNext(c, s, s.stepId === "strip" ? read : next);
  assert.equal(M.crisisFor(c, step(s), s)?.variant, "other_person");
  assert.equal(line(s), skill.copy.end_both);
  assert.deepEqual(offers(s), ["safety_open", "ending_careful"]);
  assert.deepEqual(M.stepOf(skill, "end").links[0].when, { not: { any: [M.stepOf(skill, "urge").next[0].when, M.stepOf(skill, "event").crisis[0].when] } }, "the link hides when the offer is there");
});

test("a carried flooded reading: a heads-up after the start, the body or walk it anyway (never a lock)", () => {
  const f = ctx({ band: "flooded" });
  const h = run([pick("start", "urge"), next], f);
  assert.equal(h.stepId, "heads_up");
  const settle = [pick("heads_up", "settle"), next].reduce((x, e) => M.runNext(f, x, e), h);
  assert.equal(settle.stepId, "settle");
  assert.deepEqual(offers(settle, f), ["cool_down"]);
  assert.equal([pick("heads_up", "try"), next].reduce((x, e) => M.runNext(f, x, e), h).stepId, "urge", "back to where they chose to start");
  assert.equal(run([pick("start", "urge"), next], ctx({ band: "stirred" })).stepId, "urge");
});

test("Talk to someone now on every screen (a link, or the offer itself); a way out on every slot", () => {
  for (const st of skill.steps) {
    const links = [...(st.links ?? []), ...(st.fields ?? []).flatMap((x) => x.links ?? []), ...(st.offers ?? [])];
    assert.ok(links.some((l) => l.exit === "safety_open"), st.id);
  }
  for (const f of ORDER) assert.ok(M.stepOf(skill, f).fields[0].links.some((l) => l.exit === "cool_down" && l.label === "too_much"), f);
});
