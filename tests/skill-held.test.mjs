// Held (PRD DT-07 part 1; self-soothe with the five senses and a hand on the heart: DBT DT Handouts 8, 8a;
// docs/design/held.md) on the skill runtime: touch-free ways are first-class, "I don't deserve this" is answered,
// every hold is a minute, the close is asked in the flow, backdraft gets something lighter (twice → someone to talk
// to), and the person is always offered a way outward. Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "held");
const embedOutputs = {
  bodyCard: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
  doseTimer: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
  boundaryLine: { ids: ["copied"] },
};
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const held = { type: "embedDone", output: { ids: ["done"], durationSec: 60 } };
const read = { type: "embedDone", output: { ids: [] } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s);
const line = (s, c = ctx()) => M.handoffLine(c, M.stepOf(skill, s.stepId), s);
const ids = (s, step, c = ctx()) => {
  const f = M.shownFields(c, M.stepOf(skill, step), s)[0];
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const FLOODED = ctx({ band: "flooded" });
const HEART = [pick("pick", "heart"), next, pick("where", "chest"), next, held];

test("the skill: tool soothe, named Held, its close asked in the flow, played by the player", () => {
  assert.equal(skill.toolId, "soothe");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_self_soothe"\}\), \(s:Skill \{id: "held"\}\)/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'soothe': 'held',/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'soothe',\n\s+name: 'Held',/);
  assert.match(tools, /label: 'Be kind to myself for a minute', toolId: 'soothe'/);
  for (const f of ["src/lib/spine/close.ts", "functions/src/spine/tools.ts"])
    assert.match(readFileSync(f, "utf8"), /'soothe': \{ module: 'dt', closeKind: 'regulation_down' \}/, f);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_self_soothe", t: "soothe"\}/);
  assert.match(readFileSync("schema/relationships.cypher", "utf8"), /dbt_self_soothe"\}\), \(mod:TherapyConcept \{id: "dbt_distress_tolerance"\}\)/);
  assert.equal(M.stepOf(skill, "close").fields[0].askFresh, "thenVsNow");
});

test("pick how to be held; a carried flooded reading keeps it to the hand, warmth and the chip, two choices after", () => {
  assert.deepEqual(ids(M.initialRun(skill), "pick"), ["heart", "warm", "sense", "words", "scan", "deserve"]);
  assert.deepEqual(ids(M.initialRun(skill), "pick", FLOODED), ["heart", "warm", "deserve"], "PRD: hand on heart or warmth only");
  assert.equal(run([pick("pick", "heart"), next]).stepId, "where");
  assert.deepEqual(ids(run([pick("pick", "heart"), next], FLOODED), "where", FLOODED), ["chest", "mug"], "one of them touch-free");
  assert.deepEqual(ids(run([pick("pick", "warm"), next], FLOODED), "warm", FLOODED), ["drink", "blanket"]);
  assert.equal(run([pick("pick", "warm"), next]).stepId, "warm");
  assert.equal(run([pick("pick", "sense"), next]).stepId, "way");
  assert.equal(run([pick("pick", "words"), next]).stepId, "words");
  assert.equal(run([pick("pick", "deserve"), next]).stepId, "deserve");
});

test("a hand on the heart, or a touch-free way: each a minute on its own card, then the close", () => {
  assert.deepEqual(ids(run([pick("pick", "heart"), next]), "where"), ["chest", "mug", "soft", "thighs"]);
  assert.match(skill.copy.where_hint, /If touch doesn't feel right/);
  for (const w of ["chest", "mug", "soft", "thighs"]) {
    const s = run([pick("pick", "heart"), next, pick("where", w), next]);
    assert.equal(s.stepId, `hold_${w}`);
    const st = M.stepOf(skill, s.stepId);
    assert.equal(st.embed, "bodyCard");
    assert.equal(st.props.kind, "hand_heart");
    assert.equal(st.props.seconds, 60);
    assert.equal(run([held], ctx(), s).stepId, "close");
  }
});

test("warmth (warm, not hot) and one sense, settling or waking up a bit: a minute each, never food, alcohol or shopping", () => {
  assert.match(skill.copy.warm_hint, /Warm, not hot/);
  const warm = run([pick("pick", "warm"), next, pick("warm", "water"), next]);
  assert.equal(warm.stepId, "warm_hold");
  assert.equal(M.stepOf(skill, "warm_hold").props.seconds, 60);
  assert.equal(run([held], ctx(), warm).stepId, "close");
  const way = (w) => run([pick("pick", "sense"), next, pick("way", w), next]);
  assert.deepEqual(ids(way("calm"), "sense_pick"), ["look_calm", "listen_calm", "smell_calm", "taste_calm", "touch_calm"]);
  assert.deepEqual(ids(way("wake"), "sense_pick"), ["look_wake", "listen_wake", "smell_wake", "taste_wake", "touch_wake"]);
  for (const o of skill.options.sense) assert.ok(["sight", "hearing", "smell", "taste", "touch"].includes(o.sense), o.value);
  const s = run([pick("sense_pick", "smell_wake"), next], ctx(), way("wake"));
  assert.equal(s.stepId, "sense_hold");
  assert.equal(run([held], ctx(), s).stepId, "close");
  assert.equal(run([own("sense_pick", "my cat"), next], ctx(), way("calm")).stepId, "sense_hold", "their own soother");
  const labels = [...skill.options.sense, ...skill.options.warm].map((o) => o.label).join(" ");
  assert.doesNotMatch(labels, /chocolate|snack|wine|beer|drink alcohol|shop|buy|scroll/i);
});

test("kind words, borrowed or their own: on paper once, then a hand on the heart while they land", () => {
  const w = run([pick("pick", "words"), next, own("words", "You got through today.")]);
  const card = run([next], ctx(), w);
  assert.equal(card.stepId, "words_card");
  assert.equal(M.stepOf(skill, "words_card").props.field, "words");
  const land = run([read], ctx(), card);
  assert.equal(land.stepId, "land");
  assert.equal(M.stepOf(skill, "land").props.kind, "hand_heart");
  assert.equal(run([held], ctx(), land).stepId, "close");
  assert.ok(skill.options.words.every((o) => o.label.length <= 90));
});

test("I don't deserve this: you don't have to deserve it, thirty seconds as an experiment; not today ends gently, no close", () => {
  const s = run([pick("pick", "deserve"), next]);
  assert.equal(skill.copy.deserve_title, "You don't have to deserve it.");
  assert.equal(skill.copy.deserve_hint, "Try thirty seconds, as an experiment.");
  const t = run([pick("deserve", "try"), next], ctx(), s);
  assert.equal(t.stepId, "try");
  assert.equal(M.stepOf(skill, "try").props.seconds, 30);
  assert.equal(run([held], ctx(), t).stepId, "close");
  const no = run([pick("deserve", "not_today"), next], ctx(), s);
  assert.equal(no.stepId, "not_today");
  assert.ok(M.stepOf(skill, "not_today").noClose);
  assert.deepEqual(offers(no), []);
});

test("the close in the flow: warmer or the same goes outward; the end says so, and never counts it against them", () => {
  const c = run(HEART);
  assert.deepEqual(ids(c, "close"), ["much_better", "better", "same", "worse"]);
  assert.deepEqual(skill.options.tvn.map((o) => o.label), ["Much easier", "A bit easier", "About the same", "Stirred up"], "fits the waking-up path too");
  const warmer = run([pick("close", "better"), next], ctx(), c);
  assert.equal(warmer.stepId, "reach");
  assert.deepEqual(M.askFresh(ctx(), warmer), { thenVsNow: "better" });
  const practise = run([pick("reach", "not_now"), next], ctx(), warmer);
  assert.equal(practise.stepId, "practise", "it helped: practise it once on a calmer day");
  assert.equal(line(run([next], ctx(), practise)), skill.copy.end_warmer);
  const same = run([pick("close", "same"), next, pick("reach", "not_now"), next], ctx(), c);
  assert.equal(same.stepId, "end");
  assert.equal(line(same), skill.copy.end_same);
  assert.ok(!M.stepOf(skill, "end").noClose, "the answered-close path: the parts tag row can follow");
});

test("stirred up (backdraft): lighter, press something, or stop; stirred up twice → lighter things only, and someone to talk to", () => {
  const st = run([...HEART, pick("close", "worse"), next]);
  assert.equal(st.stepId, "stirred");
  assert.match(skill.copy.stirred_title, /That happens/);
  const light = run([pick("stirred", "light"), next], ctx(), st);
  assert.equal(light.stepId, "light");
  assert.equal(M.stepOf(skill, "light").props.seconds, 30);
  const again = run([held], ctx(), light);
  assert.equal(again.stepId, "again");
  const twice = run([pick("again", "still"), next], ctx(), again);
  assert.equal(twice.stepId, "lighter");
  assert.match(M.stepOf(skill, "lighter").lines.map((l) => skill.copy[l.key]).join(" "), /Talking it through with someone/);
  const eased = run([pick("again", "easier"), next, pick("reach", "yes"), next], ctx(), again);
  assert.equal(eased.stepId, "end");
  assert.equal(line(eased), skill.copy.end_easier);
  assert.deepEqual(offers(twice), ["cool_down", "safety_open"], "someone to talk to, on the card itself");
  assert.deepEqual(ids(st, "stirred"), ["light", "deserve", "press", "talk", "stop"]);
  const press = run([pick("stirred", "press"), next], ctx(), st);
  assert.equal(press.stepId, "stirred_end");
  assert.deepEqual(offers(press), ["cool_down", "safety_open"]);
  assert.deepEqual(offers(run([pick("stirred", "talk"), next], ctx(), st)), ["safety_open"]);
  const stop = run([pick("stirred", "stop"), next], ctx(), st);
  assert.deepEqual(offers(stop), ["safety_open"]);
  // The thought itself, as backdraft: you don't have to deserve it, then the lighter hold.
  const dz = run([pick("stirred", "deserve"), next], ctx(), st);
  assert.equal(dz.stepId, "light_deserve");
  assert.equal(M.stepOf(skill, "light_deserve").title, "deserve_title");
  assert.equal(run([held], ctx(), dz).stepId, "again");
  assert.equal(line(stop), skill.copy.stop_line);
  for (const id of ["lighter", "stirred_end"]) assert.ok(!M.stepOf(skill, id).noClose, `${id}: after the in-flow close`);
});

test("outward: always offered, never pushed (skipping goes on)", () => {
  const r = run([...HEART, pick("close", "much_better"), next]);
  assert.equal(r.stepId, "reach");
  assert.deepEqual(ids(r, "reach"), ["yes", "not_now"], "not right now is a real answer");
  assert.equal(run([pick("reach", "not_now"), next], ctx(), r).stepId, "practise");
  const yes = run([pick("reach", "yes"), next], ctx(), r);
  assert.match(M.stepOf(skill, "end").lines.map((l) => l.key).join(" "), /end_reach/);
  assert.deepEqual(offers(yes), []);
});

test("once it helped, the end card offers a minute's noticing (MF-01, MF-B3); not after a close that didn't", () => {
  const helped = run([...HEART, pick("close", "much_better"), next, pick("reach", "not_now"), next, next]);
  assert.equal(helped.stepId, "end");
  assert.deepEqual(offers(helped), ["notice"]);
  assert.equal(skill.exits.find((e) => e.id === "notice").toolId, "notice-and-name");
  const same = run([...HEART, pick("close", "same"), next]);
  const end = same.stepId === "end" ? same : run([pick("reach", "not_now"), next], ctx(), same);
  assert.equal(end.stepId, "end");
  assert.deepEqual(offers(end), []);
});

test("every screen has a quiet way to someone; nothing asks the person to close their eyes", () => {
  for (const st of skill.steps) {
    const links = [...(st.links ?? []), ...(st.fields ?? []).flatMap((f) => f.links ?? [])];
    assert.ok(links.some((l) => l.exit === "safety_open"), st.id);
  }
  assert.doesNotMatch(Object.values(skill.copy).join(" "), /close your eyes|\bshould\b|!/i);
});

test("opened from Hold to wait's Hurt myself: the crisis banner on every screen, and no lighter hold after stirred up", () => {
  const HURT = ctx({ frame: "hurt" });
  for (const st of skill.steps) {
    assert.equal(M.crisisFor(HURT, st, M.initialRun(skill))?.variant, "crisis", st.id);
    assert.equal(M.crisisFor(ctx(), st, M.initialRun(skill)), null, `${st.id}: not otherwise`);
  }
  const st = run([...HEART, pick("close", "worse"), next], HURT);
  assert.deepEqual(ids(st, "stirred", HURT), ["press", "talk", "stop"]);
  const htw = content.skills.find((s) => s.id === "hold_to_wait");
  assert.deepEqual(htw.exits.find((x) => x.id === "held").query, { frame: "hurt", enterAt: "hand" });
});

test("the hosts that hand on to Held: Hold to wait's hand on the heart and Let it be's grief", () => {
  const htw = content.skills.find((s) => s.id === "hold_to_wait");
  assert.ok(!htw.exits.find((x) => x.id === "held").planned);
  assert.equal(htw.options.move.find((o) => o.value === "heart").handsOn, "held");
  const lib = content.skills.find((s) => s.id === "let_it_be");
  assert.ok(!lib.exits.find((x) => x.id === "soothe").planned);
});
