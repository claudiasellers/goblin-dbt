// E4-6: pattern reachability. Grid words reach the activation patterns through SCORES_AS aliases
// (scripts/recommendations/vocabulary.py → schema/recommended-for.cypher → the scoring query),
// high-unpleasant check-ins get their discriminating questions, and the DEAR MAN debrief shows the
// crisis banner above its tools.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { graph, fixtureDeps, withPolicyOn } from "./lib/recommendationFixture.mjs";
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

test("every one of the 85 unpleasant grid words has 1–2 aliases into the live pattern vocabulary (drafts, with a rationale)", () => {
  assert.equal(unpleasant.length, 85);
  assert.deepEqual([...vocabulary].sort(), Object.values(live.patternEmotionVocabulary).flat().filter((v, i, a) => a.indexOf(v) === i).sort());
  const cypher = read("schema/recommended-for.cypher");
  for (const g of unpleasant) {
    const targets = graph.aliases[g.sent];
    assert.ok(targets && targets.length >= 1 && targets.length <= 2, `${g.name} (${g.sent})`);
    for (const t of targets) {
      assert.ok(vocabulary.has(t), `${g.sent} → ${t} is not pattern vocabulary`);
      assert.ok(graph.emotions[t], `${t} is an Emotion node`);
      assert.match(cypher, new RegExp(`\\{id: "${g.sent}>${t}", w: "${g.sent}", e: "${t}", review: "draft", why: "[^"]+"\\}`));
    }
    assert.ok(graph.emotions[g.sent], `${g.sent} is an Emotion node (the alias's start)`);
  }
  const pleasant = grid.filter((g) => !CANDIDATES[g.quadrant]);
  assert.ok(pleasant.every((g) => !graph.aliases[g.sent]), "pleasant words never score, so they get none");
});

test("every unpleasant grid word now reaches ≥ 1 of its quadrant's patterns (was 0 of 85 live)", async () => {
  for (const g of unpleasant) {
    const r = await run({ quadrant: g.quadrant, emotions: [g.name] });
    assert.ok(r.pattern.confidence > 0.25, `${g.name}: still at the base score`);
  }
  const s = routingSummary(graph, { grid }).gridViaAliases;
  assert.equal(s.namesReachingACandidate, 85);
  assert.deepEqual(s.namesNotReaching, []);
  assert.equal(s.aliasEdges, 110);
});

test("all four high-unpleasant patterns (and all four low-unpleasant ones) are reachable from one grid word", async () => {
  const won = { "high-unpleasant": new Set(), "low-unpleasant": new Set() };
  for (const g of unpleasant) won[g.quadrant].add((await run({ quadrant: g.quadrant, emotions: [g.name] })).pattern.id);
  assert.deepEqual([...won["high-unpleasant"]].sort(), ["acute_alarm", "chronic_vigilance", "emotional_flooding", "social_threat_shame"]);
  assert.deepEqual([...won["low-unpleasant"]].sort(), ["conservation_freeze", "dissociation_overmodulation", "reward_drive_low", "rumination_loop"]);
});

test("golden distribution of one-word check-ins (update deliberately when vocabulary.py changes)", () => {
  const s = routingSummary(graph, { grid }).gridViaAliases;
  assert.deepEqual(s.winnerDistribution, {
    "high-unpleasant → acute_alarm": 12, "high-unpleasant → chronic_vigilance": 7, "high-unpleasant → emotional_flooding": 7,
    "high-unpleasant → social_threat_shame": 22, "low-unpleasant → conservation_freeze": 15, "low-unpleasant → dissociation_overmodulation": 3,
    "low-unpleasant → reward_drive_low": 13, "low-unpleasant → rumination_loop": 6,
  });
  // CO_OCCURS_WITH now matters (runner-ups pass 0.35): sadness words score rumination first, and the
  // graph's ruminative-collapse edge makes freeze primary; disappointment words tie rumination /
  // reward and the edge makes reward primary.
  assert.equal(s.winners["low-unpleasant:sad"], "conservation_freeze");
  assert.equal(s.winners["low-unpleasant:disappointed"], "reward_drive_low");
  const floodingWords = Object.entries(s.winners).filter(([, p]) => p === "emotional_flooding").map(([k]) => k.split(":")[1]).sort();
  assert.deepEqual(floodingWords, ["aggressive", "angry", "furious", "hostile", "infuriated", "mad", "provoked"],
    "only high-arousal anger lands on flooding (and its crisis banner); milder anger is mapped elsewhere");
});

test("the live check's replica (scripts/lib/liveRoutingReport.mjs) agrees with the TS engine for all 85 words", async () => {
  const s = routingSummary(graph, { grid }).gridViaAliases;
  for (const g of unpleasant) {
    const r = await run({ quadrant: g.quadrant, emotions: [g.name] });
    assert.equal(s.winners[`${g.quadrant}:${g.sent}`], r.pattern.id, g.name);
  }
  // Before E4-6 is loaded, the same replica over the live vocabulary reports nothing reaching.
  const pairs = Object.entries(live.patternEmotionVocabulary).flatMap(([p, es]) => es.map((e) => ({ p, e, s: null })));
  assert.equal(gridViaAliases(grid, pairs, {}).namesReachingACandidate, 0);
});

test("a later live report with the aliases compares against this fixture word by word", () => {
  const s = routingSummary(graph, { grid });
  const moved = structuredClone(s);
  moved.gridViaAliases.winners["high-unpleasant:angry"] = "acute_alarm";
  const { changes } = diffRouting(s, moved);
  assert.deepEqual(changes.map((c) => c.what), ["gridViaAliases.winner high-unpleasant:angry"]);
  const src = read("scripts/verify-live-routing.mjs");
  assert.match(src, /MATCH \(w:Emotion\)-\[:SCORES_AS\]->\(a:Emotion\)/);
  assert.match(src, /gridViaAliases\(grid, assoc, report\.aliases, coOccurs\)/);
});

test("the scoring query reads the aliases; a word counts once per pattern", () => {
  assert.match(EMOTION_EVIDENCE_QUERY, /OPTIONAL MATCH \(:Emotion \{id: sent\}\)-\[:SCORES_AS\]->\(alias:Emotion\)/);
  assert.match(EMOTION_EVIDENCE_QUERY, /RETURN p\.id AS patternId, sent AS emotionId, r\.strength AS strength/);
});

test("goldens after reachability: grid words move the pattern; flooding shows the banner with cards below (never a dead end)", async () => {
  const angry = await run({ quadrant: "high-unpleasant", emotions: ["Furious"] }, on);
  assert.equal(angry.pattern.id, "emotional_flooding");
  assert.equal(angry.safetyFlag.type, "crisis");
  assert.deepEqual(angry.tools.map((t) => t.id), ["cool-down", "five-senses"]);
  const stressed = await run({ quadrant: "high-unpleasant", emotions: ["Stressed"], band: "steady" }, on);
  assert.equal(stressed.pattern.id, "chronic_vigilance");
  assert.deepEqual(stressed.tools.map((t) => t.id), ["five-senses", "problem-solve"]);
  const rejected = await run({ quadrant: "high-unpleasant", emotions: ["Rejected"], band: "stirred" }, on);
  assert.equal(rejected.pattern.id, "social_threat_shame");
  assert.deepEqual(rejected.tools.map((t) => t.id), ["recovering-from-invalidation", "pause"]);
  const legacyAngry = await run({ quadrant: "high-unpleasant", emotions: ["Furious"] });
  assert.equal(legacyAngry.pattern.id, "emotional_flooding", "pattern selection isn't behind the policy flag");
  assert.deepEqual(legacyAngry.tools.map((t) => t.id), ["opposite-action", "cool-down"], "legacy ranker, as live today");
  // Discriminating answers still dominate a word (evidence weighs ×2).
  const answered = await run({ quadrant: "high-unpleasant", emotions: ["Furious"], discriminatingAnswers: [{ questionId: "hu_experience_quality", responseId: "hu_exp_vigilance" }] });
  assert.equal(answered.pattern.id, "chronic_vigilance");
});

test("the check-in asks high-unpleasant discriminating questions too; the DEAR MAN debrief shows the banner above its tools", () => {
  const ci = read("src/pages/CheckIn.tsx");
  assert.match(ci, /if \(asksDiscriminatingQuestions\(inferredQuadrant\)\) \{\s*try \{\s*const questions = await getDiscriminatingQuestions\(inferredQuadrant\);/);
  assert.match(ci, /return quadrant === 'high-unpleasant' \|\| quadrant === 'low-unpleasant';/);
  assert.deepEqual(graph.questions["high-unpleasant"], ["hu_experience_quality", "hu_body_activation"], "the graph has them");
  const dm = read("src/pages/tools/DearMan.tsx");
  const route = dm.slice(dm.indexOf("// ─── DEBRIEF: ROUTE ───"));
  const banner = route.indexOf("{isCrisisFlag(stateResult?.safetyFlag) && <CrisisBanner />}");
  assert.ok(banner > 0 && banner < route.indexOf("{topTools.length > 0 && ("), "banner above the debrief's tools");
});
