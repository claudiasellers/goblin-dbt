// E4-6: pattern reachability. Grid words reach the activation patterns through SCORES_AS aliases
// (scripts/recommendations/vocabulary.py → schema/recommended-for.cypher → the scoring query),
// high-unpleasant check-ins get their discriminating questions, and the DEAR MAN debrief shows the
// crisis banner above its tools.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { graph, rawGraph, fixtureDeps, withPolicyOn } from "./lib/recommendationFixture.mjs";
import { parseGrid, routingSummary, gridViaAliases, diffRouting, CANDIDATES } from "../scripts/lib/liveRoutingReport.mjs";

const { getStateAndToolsHandler } = await importTs("functions/src/recommendation/handler.ts");
const { EMOTION_EVIDENCE_QUERY } = await importTs("functions/src/recommendation/queries.ts");
const read = (f) => readFileSync(f, "utf8");
const grid = parseGrid(read("src/data/emotions.ts"));
const unpleasant = grid.filter((g) => CANDIDATES[g.quadrant]);
const vocabulary = new Set(Object.values(graph.patterns).flatMap((p) => p.emotions.map((e) => e.id)));
const live = JSON.parse(read("tests/fixtures/live-routing-2026-09-30.json"));
const on = withPolicyOn(graph);
const run = (input, g = graph) => getStateAndToolsHandler(input, fixtureDeps(g));

const cypher = read("schema/recommended-for.cypher");
/** Words vocabulary.py holds back (no alias yet), from the comment build.py writes into the cypher. */
const held = cypher.match(/^\/\/ Held \(no alias yet; vocabulary\.py HELD\): (.*)$/m)[1].split(", ");
const HELD_ANGER = ["aggressive", "angry", "furious", "hostile", "infuriated", "mad", "provoked"];

test("every one of the 85 unpleasant grid words has 1–2 aliases into the live pattern vocabulary (drafts, with a rationale) or is held", () => {
  assert.equal(unpleasant.length, 85);
  assert.deepEqual([...vocabulary].sort(), Object.values(live.patternEmotionVocabulary).flat().filter((v, i, a) => a.indexOf(v) === i).sort());
  assert.deepEqual(held, HELD_ANGER, "plain anger words are held: one anger word must not raise the crisis banner (update deliberately)");
  for (const g of unpleasant) {
    const targets = graph.aliases[g.sent];
    assert.ok(graph.emotions[g.sent], `${g.sent} is an Emotion node (the alias's start)`);
    if (held.includes(g.sent)) {
      assert.equal(targets, undefined, `${g.sent} is held, so it has no alias`);
      continue;
    }
    assert.ok(targets && targets.length >= 1 && targets.length <= 2, `${g.name} (${g.sent})`);
    for (const t of targets) {
      assert.ok(vocabulary.has(t), `${g.sent} → ${t} is not pattern vocabulary`);
      assert.ok(graph.emotions[t], `${t} is an Emotion node`);
      assert.match(cypher, new RegExp(`\\{id: "${g.sent}>${t}", w: "${g.sent}", e: "${t}", review: "(?:draft|approved)", why: "[^"]+"\\}`));
    }
  }
  const pleasant = grid.filter((g) => !CANDIDATES[g.quadrant]);
  assert.ok(pleasant.every((g) => !graph.aliases[g.sent]), "pleasant words never score, so they get none");
  assert.ok(Object.values(graph.aliases).every((ts) => !ts.includes("anger")), "anger is a held target (it only ever adds crisis-flagged flooding)");
});

test("Oct 2026 review: every unpleasant grid word has one reviewed pattern on its own side (SIGNALS); with the policy on it lands there, and no one word raises the crisis banner", async () => {
  const side = { "high-unpleasant": ["acute_alarm", "chronic_vigilance", "social_threat_shame", "reactive_aggression"], "low-unpleasant": ["conservation_freeze", "dissociation_overmodulation", "rumination_loop", "reward_drive_low"] };
  assert.equal(Object.keys(graph.signals).length, 85);
  for (const g of unpleasant) {
    const [p, ...more] = graph.signals[g.sent] || [];
    assert.ok(p && more.length === 0, `${g.name}: exactly one reviewed pattern`);
    assert.ok(side[g.quadrant].includes(p), `${g.name} → ${p}: the square's side decides`);
    assert.match(cypher, new RegExp(`\\{id: "${g.sent}>${p}", w: "${g.sent}", p: "${p}", review: "(?:draft|approved)", why: "[^"]+"\\}`));
    const r = await run({ quadrant: g.quadrant, emotions: [g.name] }, on);
    assert.equal(r.pattern.id, p, g.name);
    assert.ok(r.pattern.confidence > 0.25, g.name);
    assert.equal(r.safetyFlag, undefined, `${g.name}: no crisis banner from one word`);
  }
  assert.ok(Object.values(graph.signals).flat().every((p) => p !== "emotional_flooding"), "no word signals Flooded");
  const s = routingSummary(graph, { grid }).gridViaAliases;
  assert.equal(s.namesReachingACandidate, 85);
  assert.deepEqual(s.namesNotReaching, []);
  assert.equal(s.aliasEdges, 94);
  assert.equal(s.signalEdges, 85);
});

test("the kill switch covers reachability: policy off routes every grid word exactly as live did (no aliases, high-unpleasant answers ignored)", async () => {
  const asLive = { ...graph, aliases: {} };
  for (const g of unpleasant) {
    const input = { quadrant: g.quadrant, emotions: [g.name] };
    const off = await run(input);
    const liveLike = await run(input, asLive);
    assert.equal(off.pattern.id, liveLike.pattern.id, g.name);
    assert.deepEqual(off.tools.map((t) => t.id), liveLike.tools.map((t) => t.id), g.name);
    assert.ok(off.tools.length > 0, `${g.name}: never a dead end under the legacy ranker`);
    assert.equal(off.safetyFlag, undefined, g.name);
  }
  const answered = await run({ quadrant: "high-unpleasant", emotions: ["Stressed"], discriminatingAnswers: [{ questionId: "hu_experience_quality", responseId: "hu_exp_vigilance" }] });
  assert.equal(answered.pattern.id, "acute_alarm", "high-unpleasant answers only count once the policy is on");
  assert.deepEqual(answered.tools.map((t) => t.id), ["cool-down", "opposite-action"]);
  const lowAnswered = await run({ quadrant: "low-unpleasant", discriminatingAnswers: [{ questionId: "lu_mind_quality", responseId: "lu_mind_looping" }] });
  assert.equal(lowAnswered.pattern.id, "rumination_loop", "low-unpleasant answers count as they do live");
});

test("with the policy on, all four high-unpleasant patterns plus Ready to fight (and all four low-unpleasant ones) are reachable; flooding only through spiraling", async () => {
  const won = { "high-unpleasant": new Set(), "low-unpleasant": new Set() };
  for (const g of unpleasant) won[g.quadrant].add((await run({ quadrant: g.quadrant, emotions: [g.name] }, on)).pattern.id);
  assert.deepEqual([...won["high-unpleasant"]].sort(), ["acute_alarm", "chronic_vigilance", "reactive_aggression", "social_threat_shame"], "no single word reaches the crisis-flagged pattern");
  assert.deepEqual([...won["low-unpleasant"]].sort(), ["conservation_freeze", "reward_drive_low", "rumination_loop"]);
  const diss = await run({ quadrant: "low-unpleasant", discriminatingAnswers: [{ questionId: "lu_mind_quality", responseId: "lu_mind_faraway" }] }, on);
  assert.equal(diss.pattern.id, "dissociation_overmodulation", "Disconnected comes from the answers");
  // An answer that isn't about flooding never tips a word into it ("I don't know what triggered it").
  for (const g of unpleasant.filter((x) => x.quadrant === "high-unpleasant")) {
    const r = await run({ quadrant: g.quadrant, emotions: [g.name], discriminatingAnswers: [{ questionId: "hu_experience_quality", responseId: "hu_exp_unsure" }] }, on);
    assert.notEqual(r.pattern.id, "emotional_flooding", g.name);
  }
  const spiraling = { questionId: "hu_experience_quality", responseId: "hu_exp_flooding" };
  const shaking = { questionId: "hu_body_activation", responseId: "hu_body_overwhelmed" };
  assert.equal(graph.evidence.find((e) => e.responseId === "hu_exp_flooding" && e.patternId === "emotional_flooding").weight, 0.85);
  for (const words of [[], ["Furious"], ["Overwhelmed"]]) {
    const r = await run({ quadrant: "high-unpleasant", emotions: words, discriminatingAnswers: [spiraling] }, on);
    assert.equal(r.pattern.id, "emotional_flooding", `spiraling + ${words}`);
    assert.equal(r.safetyFlag.type, "crisis");
  }
  for (const words of [[], ["Overwhelmed"], ["Anxious"]]) {
    const r = await run({ quadrant: "high-unpleasant", emotions: words, discriminatingAnswers: [shaking] }, on);
    assert.notEqual(r.pattern.id, "emotional_flooding", `"Shaking or crying, can't stop" alone + ${words}: not Flooded`);
  }
  const both = await run({ quadrant: "high-unpleasant", discriminatingAnswers: [spiraling, shaking] }, on);
  assert.equal(both.pattern.id, "emotional_flooding");
});

test("golden distribution of one-word check-ins (update deliberately when vocabulary.py changes)", () => {
  const s = routingSummary(graph, { grid }).gridViaAliases;
  assert.deepEqual(s.winnerDistribution, {
    "high-unpleasant → acute_alarm": 14, "high-unpleasant → chronic_vigilance": 9, "high-unpleasant → reactive_aggression": 10,
    "high-unpleasant → social_threat_shame": 15, "low-unpleasant → conservation_freeze": 4,
    "low-unpleasant → reward_drive_low": 14, "low-unpleasant → rumination_loop": 19,
  });
  const floodingWords = Object.entries(s.winners).filter(([, p]) => p === "emotional_flooding").map(([k]) => k.split(":")[1]).sort();
  assert.deepEqual(floodingWords, [], "no one-word check-in lands on flooding (and its crisis banner)");
});

test("the live check's replica (scripts/lib/liveRoutingReport.mjs) agrees with the TS engine for all 85 words", async () => {
  const s = routingSummary(graph, { grid }).gridViaAliases;
  for (const g of unpleasant) {
    const r = await run({ quadrant: g.quadrant, emotions: [g.name] }, on);
    assert.equal(s.winners[`${g.quadrant}:${g.sent}`], r.pattern.id, g.name);
  }
  // Before E4-6 is loaded, the same replica over the live vocabulary reports nothing reaching.
  const pairs = Object.entries(live.patternEmotionVocabulary).flatMap(([p, es]) => es.map((e) => ({ p, e, s: null })));
  assert.equal(gridViaAliases(grid, pairs, {}).namesReachingACandidate, 0);
});

test("a later live report with the aliases compares against this fixture word by word", () => {
  const s = routingSummary(graph, { grid });
  const moved = structuredClone(s);
  moved.gridViaAliases.winners["high-unpleasant:angry"] = "emotional_flooding";
  const { changes } = diffRouting(s, moved);
  assert.deepEqual(changes.map((c) => c.what), ["gridViaAliases.winner high-unpleasant:angry"]);
  const src = read("scripts/verify-live-routing.mjs");
  assert.match(src, /MATCH \(w:Emotion\)-\[:SCORES_AS\]->\(a:Emotion\)/);
  assert.match(src, /gridViaAliases\(grid, assoc, report\.aliases, coOccurs, report\.signals\)/);
  assert.match(src, /MATCH \(w:Emotion\)-\[:SIGNALS\]->\(p:ActivationPattern\)/);
});

test("the scoring query reads reviewed patterns and aliases only while the policy is on; a reviewed pattern replaces the aliases; a word counts once per pattern", () => {
  assert.match(EMOTION_EVIDENCE_QUERY, /OPTIONAL MATCH \(:Emotion \{id: sent\}\)-\[:SIGNALS\]->\(sp:ActivationPattern\)\s+WHERE \$useAliases/);
  assert.match(EMOTION_EVIDENCE_QUERY, /OPTIONAL MATCH \(:Emotion \{id: sent\}\)-\[:SCORES_AS\]->\(alias:Emotion\)\s+WHERE \$useAliases AND size\(signalled\) = 0/);
  assert.match(EMOTION_EVIDENCE_QUERY, /THEN \[x IN signalled WHERE x IN \$candidatePatterns \| \{p: x, s: 'strong'\}\]/);
  assert.match(EMOTION_EVIDENCE_QUERY, /RETURN hit\.p AS patternId, sent AS emotionId, hit\.s AS strength/);
});

test("goldens after reachability: grid words move the pattern; anger has its own pattern; flooding shows the banner with cards below (never a dead end)", async () => {
  const angry = await run({ quadrant: "high-unpleasant", emotions: ["Furious"] }, on);
  assert.equal(angry.pattern.id, "reactive_aggression", "Ready to fight: no crisis flag");
  assert.equal(angry.safetyFlag, undefined);
  assert.deepEqual(angry.tools.map((t) => t.id), ["pause", "cool-down"]);
  const flooding = await run({ quadrant: "high-unpleasant", emotions: ["Furious"], discriminatingAnswers: [{ questionId: "hu_experience_quality", responseId: "hu_exp_flooding" }] }, on);
  assert.equal(flooding.pattern.id, "emotional_flooding");
  assert.equal(flooding.safetyFlag.type, "crisis");
  assert.deepEqual(flooding.tools.map((t) => t.id), ["cool-down", "five-senses"]);
  const stressed = await run({ quadrant: "high-unpleasant", emotions: ["Stressed"], band: "steady" }, on);
  assert.equal(stressed.pattern.id, "acute_alarm");
  assert.deepEqual(stressed.tools.map((t) => t.id), ["problem-solve", "cool-down"]);
  const rejected = await run({ quadrant: "high-unpleasant", emotions: ["Rejected"], band: "stirred" }, on);
  assert.equal(rejected.pattern.id, "social_threat_shame");
  assert.deepEqual(rejected.tools.map((t) => t.id), ["recovering-from-invalidation", "opposite-action"]);
  const legacyStressed = await run({ quadrant: "high-unpleasant", emotions: ["Stressed"] });
  assert.equal(legacyStressed.pattern.id, "acute_alarm", "pattern selection's reach is behind the policy flag");
  assert.deepEqual(legacyStressed.tools.map((t) => t.id), ["cool-down", "opposite-action"], "legacy ranker, as live today");
  const legacyAngry = await run({ quadrant: "high-unpleasant", emotions: ["Furious"] });
  assert.equal(legacyAngry.pattern.id, "acute_alarm", "Ready to fight is a candidate only while the policy is on");
  // Discriminating answers still dominate a word (evidence weighs ×2).
  const answered = await run({ quadrant: "high-unpleasant", emotions: ["Rejected"], discriminatingAnswers: [{ questionId: "hu_experience_quality", responseId: "hu_exp_vigilance" }] }, on);
  assert.equal(answered.pattern.id, "chronic_vigilance");
});

test("the check-in asks high-unpleasant discriminating questions too; DEAR MAN's debrief no longer routes (IE-B2)", () => {
  const ci = read("src/pages/CheckIn.tsx");
  assert.match(ci, /if \(asksDiscriminatingQuestions\(inferredQuadrant\)\) \{\s*try \{\s*const questions = await getDiscriminatingQuestions\(inferredQuadrant\);/);
  assert.match(ci, /return quadrant === 'high-unpleasant' \|\| quadrant === 'low-unpleasant';/);
  assert.deepEqual(graph.questions["high-unpleasant"], ["hu_experience_quality", "hu_body_activation"], "the graph has them");
  // Claudia, 11 Nov: the debrief's end cards and its silent check-in are gone (docs/design/dear-man-debrief.md).
  assert.doesNotMatch(read("src/pages/tools/DearMan.tsx"), /getStateAndTools|saveCheckIn/);
});

test("\"I can't tell — it's all too much\" reads as overwhelm, not crisis: it never raises the banner or overrides the word (Claudia, 2026-09-30)", async () => {
  const unclear = { questionId: "hu_body_activation", responseId: "hu_body_unclear" };
  const high = unpleasant.filter((g) => g.quadrant === "high-unpleasant");
  const ev = graph.evidence.filter((e) => e.responseId === "hu_body_unclear");
  assert.deepEqual(Object.fromEntries(ev.map((e) => [e.patternId, e.weight])), { acute_alarm: 0.2, emotional_flooding: 0.05 }, "tie-breaker weights (update deliberately)");
  for (const w of high) {
    const alone = await run({ quadrant: "high-unpleasant", emotions: [w.name] }, on);
    const withUnclear = await run({ quadrant: "high-unpleasant", emotions: [w.name], discriminatingAnswers: [unclear] }, on);
    assert.equal(withUnclear.pattern.id, alone.pattern.id, `${w.name}: the escape-hatch answer must not override the word`);
    assert.notEqual(withUnclear.safetyFlag?.type, "crisis", `${w.name}: "I can't tell" alone must not raise the crisis banner`);
  }
});

// Default to connected (12 Nov 2026): an active row the diversity rule always rejects is a draft in disguise. FAST is
// the alternative to Recover (betrayed, disrespected) and to Check the Facts (bitter, resentful); Wise mind is the
// alternative on the watchful words. Each must actually show, not only be active.
test("the FAST and Wise mind rows show on the check-in result, not only sit active", async () => {
  const live = rawGraph.routingPolicy.enabled ? rawGraph : withPolicyOn(rawGraph);
  const shown = async (emotion) => (await run({ quadrant: "high-unpleasant", emotions: [emotion] }, live)).tools.map((t) => t.id);
  for (const w of ["Betrayed", "Disrespected"]) assert.deepEqual(await shown(w), ["recovering-from-invalidation", "fast"], w);
  for (const w of ["Bitter", "Resentful"]) assert.deepEqual(await shown(w), ["check-the-facts", "fast"], w);
  for (const w of ["Skeptical", "Jealous", "Critical"]) assert.ok((await shown(w)).includes("wise-mind"), w);
});
