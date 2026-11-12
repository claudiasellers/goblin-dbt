// Know this feeling (PRD ER-10 part 1, DBT ER Handouts 3–6; docs/design/emotion-guide.md): the feeling guide content
// (scripts/emotion-guide/content.py → schema/emotion-guide.cypher), the runtime's shared feelingOf / feelingGuideOf
// tables and the feelingCard embed, and the skill (a word, its card, its family ladder, then what next). The plan
// thread's pins: signed-off body places only, emotion urges only, happiness never grows Do the Opposite's doors or
// parentOf, ladders are the family's grid words, the copy goes through the voice lint. Tested through the pure machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";
import { LOAD_ORDER } from "../scripts/load-graph.mjs";
import { FLOW_DOC_FILES, lintFlowDocs } from "../scripts/voice-lint.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const { emotions } = await importTs("src/data/emotions.ts");
const { FEELING_CARD_PLACES, FEELING_CARD_URGES } = await importTs("functions/src/skills/feelingOf.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const bodyMap = JSON.parse(readFileSync("src/data/content/body-map.json", "utf8")).content;
const picker = JSON.parse(readFileSync("src/data/content/opposite-action-picker.json", "utf8")).content;
const skill = content.skills.find((s) => s.id === "emotion_guide");
const gridIds = new Set(emotions.map((e) => e.id));
const ctx = (ctxIn = {}, carried = []) => ({ skill, shared: content, carried, gridIds, ctxIn, embedOutputs: { feelingCard: { ids: ["read"] } },
  emotionLabel: (id) => (emotions.find((e) => e.id === id)?.name ?? id).toLowerCase() });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const read = { type: "embedDone", output: { ids: ["read"] } };
const run = (events, c = ctx()) => events.reduce((s, e) => M.runNext(c, s, e), M.initialRun(skill));
const title = (s, c = ctx()) => M.copyText(c, M.stepOf(skill, s.stepId).title, s, M.titleSlots(c, M.stepOf(skill, s.stepId), s));
const lines = (s, c = ctx()) => M.stepOf(skill, s.stepId).lines.filter((l) => M.handoffLine(c, { ...M.stepOf(skill, s.stepId), lines: [l] }, s)).map((l) => skill.copy[l.key]);
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s);
const field = (stepId, id) => M.stepOf(skill, stepId).fields.find((f) => f.id === id);
const py = (...args) => execFileSync("python3", args, { encoding: "utf8" });

test("the content is fresh, loaded after what it reads and before skills, constrained and voice-linted", () => {
  py("scripts/emotion-guide/build.py", "--check");
  const at = (f) => LOAD_ORDER.indexOf(f);
  for (const before of ["emotion-wheel-sync.cypher", "emotion-regulation-content.cypher", "opposite-action-data.cypher", "body-map.cypher"]) {
    assert.ok(at("emotion-guide.cypher") > at(before), before);
  }
  assert.equal(at("emotion-guide.cypher") + 1, at("skills.cypher"));
  assert.match(readFileSync("schema/constraints.cypher", "utf8"), /CREATE CONSTRAINT feeling_guide_id IF NOT EXISTS FOR \(n:FeelingGuide\) REQUIRE n\.id IS UNIQUE;/);
  assert.ok(FLOW_DOC_FILES.includes("schema/emotion-guide.cypher"), "function lines and prompts are flow copy");
  assert.deepEqual(lintFlowDocs(["schema/emotion-guide.cypher"]), []);
});

test("ten guides: the nine DBT parents and happiness; each card has what it's for and what sets it off", () => {
  assert.deepEqual(Object.keys(content.feelingOf).sort(), ["anger", "disgust", "envy", "fear", "guilt", "happiness", "jealousy", "love", "sadness", "shame"]);
  for (const [id, row] of Object.entries(content.feelingOf)) {
    assert.ok(row.label && row.functionLine, id);
    assert.ok(row.prompts.length >= 2 && row.prompts.length <= 4, id);
    assert.ok(row.urges.length <= FEELING_CARD_URGES && row.body.length <= FEELING_CARD_PLACES, id);
  }
});

test("pin 1, body: only signed-off places, the card's map's strongest, named by the body step's region names", () => {
  const live = new Map(bodyMap.maps.map((m) => [m.id, m.places]));
  const cypher = readFileSync("schema/emotion-guide.cypher", "utf8");
  const regionName = Object.fromEntries([...readFileSync("schema/body-map.cypher", "utf8").matchAll(/MERGE \(r:BodyRegion \{id: "([a-z_]+)"\}\)\nSET r \+= \{name: "([^"]+)"/g)].map((m) => [m[1], m[2]]));
  for (const [id, row] of Object.entries(content.feelingOf)) {
    const map = new RegExp(`FeelingGuide \\{id: "${id}"\\}\\), \\(m:BodyMap \\{id: "([a-z]+)"\\}\\)`).exec(cypher)?.[1];
    if (!map) { assert.deepEqual(row.body, [], `${id}: no map, no body`); continue; }
    // body-map.json ships only live maps, live FELT_AS and live words (getBodyMapContent's filter).
    const want = live.get(map).slice(0, FEELING_CARD_PLACES).map((p) => ({ region: regionName[p.region], label: p.label }));
    assert.deepEqual(row.body, want, id);
  }
});

const HELD = new Set(["guilt-punish", "shame-hide", "love-proximity"]);
test("pin 2, urges: the parent's emotion urges by order, never a behaviour urge, never one the guide holds", () => {
  const behaviour = ["send", "check", "hit", "leave", "use", "self_harm"];
  const oa = readFileSync("schema/opposite-action-data.cypher", "utf8");
  const behaviourLabels = new Set(behaviour.map((b) => new RegExp(`\\{id: "${b}", label: "([^"]+)"`).exec(oa)?.[1]).filter(Boolean));
  assert.equal(behaviourLabels.size, behaviour.length, "every behaviour urge found");
  for (const p of picker.parents) {
    const row = content.feelingOf[p.id];
    assert.ok(row, p.id);
    for (const u of row.urges) assert.ok(!behaviourLabels.has(u), `${p.id}: ${u}`);
    const want = p.urges.filter((u) => !HELD.has(u.id)).map((u) => u.label).slice(0, FEELING_CARD_URGES);
    assert.deepEqual(row.urges, want, p.id);
  }
  assert.ok(!content.feelingOf.guilt.urges.includes("Punish yourself"), "held: Do the Opposite meets it with safety.open");
  assert.ok(!content.feelingOf.shame.urges.some((u) => /disappear/i.test(u)), "held: ideation-adjacent next to humiliated (gate 3)");
  assert.deepEqual(content.feelingOf.happiness.urges, [], "happiness has no ActionUrges");
});

test("pin 3, happiness: Do the Opposite's doors, parentOf and fitsWhen don't grow", () => {
  assert.deepEqual(picker.parents.map((p) => p.id), ["anger", "disgust", "envy", "fear", "guilt", "jealousy", "love", "sadness", "shame"]);
  assert.ok(!Object.values(content.parentOf).includes("happiness"));
  assert.ok(!("happiness" in content.fitsWhen));
  const happy = Object.entries(content.feelingGuideOf).filter(([, g]) => g === "happiness").map(([w]) => w);
  assert.deepEqual(happy.sort(), ["content", "eager", "excited", "happy", "hopeful", "joyful", "optimistic", "playful", "proud", "satisfied"]);
  for (const w of happy) {
    assert.ok(!(w in content.parentOf), w);
    assert.ok(!(w in picker.words) || picker.words[w].parent === null, w);
  }
  // Every parent's words reach its guide.
  for (const [w, p] of Object.entries(content.parentOf)) assert.equal(content.feelingGuideOf[w], p, w);
});

test("pin 4, ladders: the family's own grid words, milder to stronger as written, none twice, none of one word", () => {
  for (const [id, row] of Object.entries(content.feelingOf)) {
    assert.notEqual(row.ladder.length, 1, id);
    assert.equal(new Set(row.ladder).size, row.ladder.length, id);
    for (const w of row.ladder) {
      assert.ok(gridIds.has(w), `${id}: ${w} is a grid word`);
      assert.equal(content.feelingGuideOf[w], id, `${id}: ${w} is the family's own`);
    }
  }
  assert.deepEqual(content.feelingOf.anger.ladder, ["annoyed", "frustrated", "angry", "furious"], "the PRD's example");
  assert.deepEqual(content.feelingOf.jealousy.ladder, []);
});

test("the skill: tool emotion-guide on dbt_model_of_emotions, no close, listed under Emotion Regulation", () => {
  assert.equal(skill.toolId, "emotion-guide");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_model_of_emotions"\}\), \(s:Skill \{id: "emotion_guide"\}\)/);
  assert.match(readFileSync("schema/knowledge-graph.cypher", "utf8"), /id: "dbt_model_of_emotions"\}\)\nSET model_of_emotions \+= \{[\s\S]*?module: "Emotion Regulation"/);
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'emotion-guide': \{ module: 'er', closeKind: 'none' \}/);
  assert.match(readFileSync("src/lib/spine/close.ts", "utf8"), /'emotion-guide': \{ module: 'er', closeKind: 'none' \}/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'emotion-guide',\n\s+name: 'Know This Feeling',[\s\S]*?module: 'emotion-regulation'/);
  assert.match(tools, /label: 'Get to know a feeling', toolId: 'emotion-guide'/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'emotion-guide': 'emotion_guide'/);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_model_of_emotions", t: "emotion-guide"\}/);
  assert.deepEqual(skill.emotionFields, ["feel", "closest"]);
  // It isn't working's myth-card exit waits for part 4's frame.
  const myths = content.skills.find((s) => s.id === "er_troubleshoot").exits.find((e) => e.toolId === "emotion-guide");
  assert.ok(myths.planned && myths.query.frame === "myths");
});

test("a word, its card (the guide's row through the `row` prop), its ladder, then Check the Facts and Do the Opposite", () => {
  let s = run([pick("feel", "worried"), next]);
  assert.equal(s.stepId, "card");
  assert.equal(title(s), "Feeling worried");
  const step = M.stepOf(skill, "card");
  assert.equal(step.props.guide, "$d.guide");
  // What the player hands the embed: the ref's value keys feelingOf.
  const key = M.derive(ctx(), s.answers).guide;
  assert.equal(key, "fear");
  assert.deepEqual(M.sharedRow(ctx(), "feelingOf", key), content.feelingOf.fear);
  assert.equal(M.sharedRow(ctx(), "feelingOf", "nope"), undefined);
  s = [read].reduce((x, e) => M.runNext(ctx(), x, e), run([pick("feel", "worried"), next]));
  assert.equal(s.stepId, "ladder");
  assert.equal(title(s), "You picked worried. Is one of these closer?", "their word, named");
  assert.deepEqual(M.emotionChoices(ctx(), field("ladder", "closest"), s.answers), ["worried", "nervous", "scared", "frightened"]);
  const end = [pick("closest", "scared"), next].reduce((x, e) => M.runNext(ctx(), x, e), s);
  assert.equal(end.stepId, "end");
  assert.equal(title(end), "You named it: scared.");
  assert.deepEqual(offers(end), ["check_the_facts_closest", "opposite_action_closest"]);
  // The closer word goes on, not the one they came with (Codex, #120).
  for (const id of offers(end)) assert.deepEqual(M.carried(skill.exits.find((e) => e.id === id), end, ctx()), ["scared"], id);
  assert.ok(lines(end).includes(skill.copy.end_fits));
  assert.ok(lines(end).includes(skill.copy.end_line), "a closer word was put to it");
  assert.ok(!lines(end).includes(skill.copy.end_heavy));
  // None of them is an answer too.
  const none = M.runNext(ctx(), s, next);
  assert.equal(none.stepId, "end");
  assert.equal(title(none), skill.copy.end_title);
  assert.ok(lines(none).includes(skill.copy.end_known) && !lines(none).includes(skill.copy.end_line), "no closer word, no claim it was put");
  assert.deepEqual(offers(none), ["check_the_facts", "opposite_action"]);
  for (const id of offers(none)) assert.deepEqual(M.carried(skill.exits.find((e) => e.id === id), none, ctx()), ["worried"], id);
  // A safety-screen word named: said plainly, never a gate (gate 3).
  const sad = [read].reduce((x, e) => M.runNext(ctx(), x, e), run([pick("feel", "sad"), next]));
  const heavy = [pick("closest", "despair"), next].reduce((x, e) => M.runNext(ctx(), x, e), sad);
  assert.equal(lines(heavy)[0], skill.copy.end_heavy);
  assert.deepEqual(offers(heavy), ["check_the_facts_closest", "opposite_action_closest"]);
  assert.ok(M.stepOf(skill, "end").noClose && M.stepOf(skill, "end").complete);
});

test("happiness: its card and ladder, then Good things to stay with it (never Check the Facts or Do the Opposite)", () => {
  const s = [read].reduce((x, e) => M.runNext(ctx(), x, e), run([pick("feel", "proud"), next]));
  assert.equal(s.stepId, "ladder");
  assert.deepEqual(M.emotionChoices(ctx(), field("ladder", "closest"), s.answers), ["content", "happy", "joyful"]);
  const end = M.runNext(ctx(), s, next);
  assert.deepEqual(offers(end), ["good_things"]);
  assert.deepEqual(lines(end), [skill.copy.end_happy], "no edge to take off joy");
  assert.deepEqual(content.skills.find((x) => x.id === "emotion_guide").exits.find((e) => e.id === "good_things").query, { frame: "savour" });
});

test("a family of one word skips the ladder; a word with no guide gets Find the feeling; carried words come first", () => {
  const j = [read].reduce((x, e) => M.runNext(ctx(), x, e), run([pick("feel", "jealous"), next]));
  assert.equal(j.stepId, "end");
  const calm = run([pick("feel", "calm"), next]);
  assert.equal(calm.stepId, "none");
  assert.equal(title(calm), "There's no card for “calm” yet.");
  assert.deepEqual(offers(calm), ["find_the_feeling"]);
  assert.equal(M.emotionChoices(ctx({}, ["let_down"]), field("feel", "feel"), {})[0], "let_down", "a carried word first, never pre-picked");
  assert.deepEqual(M.initialRun(skill).answers, {});
});

test("a carried flooded reading: a heads-up first, the body or the card anyway (never a lock)", () => {
  const f = ctx({ band: "flooded" });
  const h = run([pick("feel", "angry"), next], f);
  assert.equal(h.stepId, "heads_up");
  const settle = [pick("heads_up", "settle"), next].reduce((x, e) => M.runNext(f, x, e), h);
  assert.equal(settle.stepId, "settle");
  assert.deepEqual(offers(settle, f), ["cool_down"]);
  assert.equal([pick("heads_up", "try"), next].reduce((x, e) => M.runNext(f, x, e), h).stepId, "card");
});

test("Talk to someone now on every screen", () => {
  for (const st of skill.steps) {
    const links = [...(st.links ?? []), ...(st.fields ?? []).flatMap((x) => x.links ?? [])];
    assert.ok(links.some((l) => l.exit === "safety_open"), st.id);
  }
});
