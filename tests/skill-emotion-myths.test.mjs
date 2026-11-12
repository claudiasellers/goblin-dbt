// Know this feeling, the myth cards (PRD ER-10 part 4, DBT ER Handout 3; docs/design/emotion-guide.md, *The myth
// cards*): the second skill under the `emotion-guide` tool, opened by `?frame=myths` from It isn't working's belief
// check and the Tools page. A belief, its other side, how it sits (every answer is an answer), one small way to test
// it, and where each belief goes next. Hopelessness is never a myth card. Tested through the pure machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const { emotionGuideSkillFor } = await importTs("src/lib/emotionGuide.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "emotion_myths");
const troubleshoot = content.skills.find((s) => s.id === "er_troubleshoot");
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), ctxIn, embedOutputs: {}, emotionLabel: (id) => id });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const run = (events, c = ctx()) => events.reduce((s, e) => M.runNext(c, s, e), M.initialRun(skill));
const step = (s) => M.stepOf(skill, s.stepId);
const titleOf = (s, c = ctx()) => M.copyText(c, step(s).title, s, M.titleSlots(c, step(s), s));
// What the player shows: one line, the first that holds (handoffLine; Codex, #123).
const lines = (s, c = ctx()) => [M.handoffLine(c, step(s), s)].filter(Boolean);
const offers = (s, c = ctx()) => M.offersFor(c, step(s), s);
const myths = skill.options.myth;
const goesTo = { myth_failing: "emotion_guide", myth_past_it: "let_it_be", myth_true: "check_the_facts", myth_right_way: "emotion_guide",
  myth_weak: null, myth_bad: "emotion_guide", myth_out_of_control: "pause", myth_no_reason: "emotion_guide", myth_ignore: null,
  myth_approval: "recover", myth_big: "dear_man" };

test("the skill: emotion-guide on dbt_model_of_emotions, picked by ?frame=myths, no close, nothing kept", () => {
  assert.equal(skill.toolId, "emotion-guide");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_model_of_emotions"\}\), \(s:Skill \{id: "emotion_myths"\}\)/);
  assert.equal(emotionGuideSkillFor("myths"), "emotion_myths");
  for (const f of [null, undefined, "", "other"]) assert.equal(emotionGuideSkillFor(f), "emotion_guide", String(f));
  assert.match(readFileSync("src/pages/ToolPage.tsx", "utf8"), /'emotion-guide': EmotionGuide/);
  assert.doesNotMatch(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /PLAYER_TOOLS[^\]]*'emotion-guide'/);
  assert.deepEqual(skill.accepts, ["band"]);
  assert.deepEqual(skill.emotionFields, []);
  for (const st of skill.steps.filter((x) => x.kind === "handoff")) assert.ok(st.noClose && st.complete, st.id);
  assert.ok(!skill.keep && !skill.followUps?.length, "no keep, no follow-up");
});

test("the Tools page: a card on Know this feeling and an intent, both opening the myths frame", () => {
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /key: 'myths', name: 'Beliefs about feelings',[^}]*query: 'frame=myths'/);
  assert.match(tools, /id: 'feeling-myths', label: 'A belief about feelings is in the way', toolId: 'emotion-guide', query: 'frame=myths'/);
});

test("It isn't working's beliefs are the same ids here; hopelessness is never a myth card", () => {
  const belief = troubleshoot.options.belief.map((o) => o.value);
  const ids = new Set(myths.map((o) => o.value));
  for (const id of belief.filter((v) => !["myth_nothing", "myth_no", "myth_unsure"].includes(v))) assert.ok(ids.has(id), id);
  assert.ok(!ids.has("myth_nothing"));
  for (const o of myths) assert.doesNotMatch(o.label, /nothing will ever help/i);
  // Its belief check opens this frame (no longer planned); hopelessness still gets someone to talk to.
  const exit = troubleshoot.exits.find((e) => e.id === "emotion_guide");
  assert.ok(!exit.planned && exit.query.frame === "myths");
});

test("every belief has its other side and one way to test it; the screens never say 'myth'", () => {
  assert.deepEqual(myths.map((o) => o.value).sort(), Object.keys(goesTo).sort());
  for (const { value } of myths) {
    assert.ok(skill.copy[`look_${value}`], value);
    assert.ok(skill.copy[`try_${value}`], value);
  }
  for (const [k, v] of Object.entries(skill.copy)) assert.doesNotMatch(v, /\bmyths?\b/i, k);
  for (const o of Object.values(skill.options).flat()) assert.doesNotMatch(o.label, /\bmyths?\b/i, o.value);
});

test("a belief, its other side, how it sits, then one small test and where that belief goes next", () => {
  for (const [id, exit] of Object.entries(goesTo)) {
    const look = run([pick("myth", id), next]);
    assert.equal(look.stepId, "look", id);
    assert.equal(titleOf(look), "A belief can feel like a fact.");
    assert.deepEqual(lines(look), [skill.copy[`look_${id}`]], id);
    const end = [pick("sits", "some"), next].reduce((x, e) => M.runNext(ctx(), x, e), look);
    assert.equal(end.stepId, "end", id);
    assert.deepEqual(lines(end), [skill.copy[`try_${id}`]], id);
    assert.deepEqual(offers(end), exit ? [exit] : [], id);
  }
});

test("every answer to how it sits is an answer, each with its own end title", () => {
  const look = run([pick("myth", "myth_true"), next]);
  assert.ok(M.stepOf(skill, "look").fields[0].required);
  const want = { some: skill.copy.end_title_some, not_yet: skill.copy.end_title_not_yet, unsure: skill.copy.end_title_unsure };
  for (const [v, t] of Object.entries(want)) {
    const end = [pick("sits", v), next].reduce((x, e) => M.runNext(ctx(), x, e), look);
    assert.equal(end.stepId, "end", v);
    assert.equal(titleOf(end), t, v);
    assert.equal(lines(end).length, 1, v);
    assert.equal(lines(end)[0].includes("more than one look"), v === "not_yet", v);
    assert.ok(lines(end)[0].endsWith(skill.copy.try_myth_true), `${v}: the belief's test is always there`);
    assert.deepEqual(offers(end), ["check_the_facts"], `${v}: the next step doesn't depend on agreeing`);
  }
});

test("own words: a general other side, a general test, and someone to talk to (own words aren't read)", () => {
  const look = run([own("myth", "Being angry makes me a bad person"), next]);
  assert.equal(look.stepId, "look");
  assert.deepEqual(lines(look), [skill.copy.look_own]);
  assert.match(lines(look)[0], /talk to someone now\.$/, "own words aren't read: the way to someone to talk to is said");
  const end = [pick("sits", "unsure"), next].reduce((x, e) => M.runNext(ctx(), x, e), look);
  assert.deepEqual(lines(end), [skill.copy.end_own]);
  assert.deepEqual(offers(end), ["safety_open"]);
  assert.equal(M.stepOf(skill, "myth").fields[0].own.max, 100);
});

test("a carried flooded reading: a heads-up first, the body or look anyway (never a lock)", () => {
  const f = ctx({ band: "flooded" });
  const h = run([pick("myth", "myth_bad"), next], f);
  assert.equal(h.stepId, "heads_up");
  const settle = [pick("heads_up", "settle"), next].reduce((x, e) => M.runNext(f, x, e), h);
  assert.equal(settle.stepId, "settle");
  assert.deepEqual(offers(settle, f), ["cool_down"]);
  assert.equal([pick("heads_up", "try"), next].reduce((x, e) => M.runNext(f, x, e), h).stepId, "look");
  assert.equal(run([pick("myth", "myth_bad"), next], ctx({ band: "stirred" })).stepId, "look", "stirred goes straight on");
});

test("Talk to someone now on every screen", () => {
  for (const st of skill.steps) {
    const links = [...(st.links ?? []), ...(st.fields ?? []).flatMap((x) => x.links ?? [])];
    assert.ok(links.some((l) => l.exit === "safety_open"), st.id);
  }
  assert.ok(skill.exits.find((e) => e.id === "safety_open").safety);
  // A chip pick never gets the safety offer as a card (it's the link); own words do.
  assert.ok(!offers([pick("sits", "some"), next].reduce((x, e) => M.runNext(ctx(), x, e), run([pick("myth", "myth_weak"), next]))).includes("safety_open"));
});
