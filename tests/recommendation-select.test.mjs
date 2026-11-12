// E4-3: the check-in result routed by pattern × band (functions/src/recommendation/select.ts) behind
// RoutingPolicy.enabled. Goldens and invariants from E4 §5 (with the plan's §10 amendments: the
// crisis banner sits above the cards, so a crisis result still shows them, R12), run end to end over
// the schema fixture with the policy switched on (what the D-02 flip does). The kill switch
// restores the E4-1 output byte-for-byte.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { graph, fixtureDeps, withPolicyOn, routingConcept } from "./lib/recommendationFixture.mjs";
import { parseGrid } from "../scripts/lib/liveRoutingReport.mjs";

const { getStateAndToolsHandler } = await importTs("functions/src/recommendation/handler.ts");
const { selectRecommendations } = await importTs("functions/src/recommendation/select.ts");
const { resolveBand } = await importTs("functions/src/recommendation/band.ts");
const { parseStateRequest } = await importTs("functions/src/recommendation/validation.ts");

const on = withPolicyOn(graph);
const run = (input, g = on) => getStateAndToolsHandler(input, fixtureDeps(g));
const ids = (r) => r.tools.map((t) => t.id);
const hu = (extra = {}) => ({ quadrant: "high-unpleasant", ...extra });
const lu = (extra = {}) => ({ quadrant: "low-unpleasant", ...extra });
const ans = (...rs) => rs.map((responseId) => ({ questionId: "q", responseId }));
const grid = parseGrid(readFileSync("src/data/emotions.ts", "utf8"));
const toolIds = [...readFileSync("src/data/tools.ts", "utf8").matchAll(/^\s+id: '([a-z-]+)',/gm)].map((m) => m[1]);
const toolComponents = readFileSync("src/pages/ToolPage.tsx", "utf8");
const PATTERNS = Object.keys(graph.patterns).filter((p) => graph.recommendedFor.some((r) => r.patternId === p));
const BANDS = ["steady", "stirred", "flooded"];

/** The fixture's slice for one pattern, for pattern-level goldens (a word was named unless `words: []`). */
async function slice(pid, g = on) {
  return (await fixtureDeps(g).routingSlice([pid]))[0];
}
async function cell(pid, band, { words = ["anxious"], blank = false, g = on, secondary = null } = {}) {
  const primary = await slice(pid, g);
  const fallback = routingConcept(g, g.routingPolicy.fallbackConceptId, { withAddresses: false });
  return selectRecommendations({
    primary, secondary: secondary ? await slice(secondary, g) : null, band,
    blank: blank || primary.blank, userEmotionIds: words, policy: g.routingPolicy, fallback, medicalFlags: [],
  });
}
const pickIds = (sel) => sel.picks.map((p) => p.concept.appToolId);

// ---- Goldens ----

test("#1–3 Anxious → On guard (its reviewed pattern): Do the Opposite + 5-4-3-2-1 whatever the band but flooded; flooded: Cool Down + 5-4-3-2-1", async () => {
  const r1 = await run(hu({ emotions: ["Anxious"] }));
  assert.equal(r1.pattern.id, "chronic_vigilance");
  assert.deepEqual([r1.routing.band, r1.routing.bandSource, r1.routing.version], ["stirred", "inferred", "rf-v2"]);
  assert.deepEqual(ids(r1), ["opposite-action", "five-senses"]);
  assert.equal(r1.tools[0].ruleId, "rf_chronic_vigilance_words_anticipatory_opposite-action");
  assert.deepEqual(ids(await run(hu({ emotions: ["Anxious"], band: "steady", bandSource: "probe" }))), ["opposite-action", "five-senses"], "no capacity split");
  const r3 = await run(hu({ emotions: ["Anxious"], band: "flooded" }));
  assert.deepEqual(ids(r3), ["cool-down", "five-senses"]);
  assert.equal(r3.routing.bandSource, "probe");
  assert.equal(r3.safetyFlag, undefined);
});

test("#4 a wound word leads to Recover on every pattern but Flooded (R7 everywhere, Oct 2026 review)", async () => {
  const h = await run(hu({ emotions: ["Humiliated"] }));
  assert.equal(h.pattern.id, "social_threat_shame");
  assert.deepEqual(ids(h), ["recovering-from-invalidation", "cool-down"], "Recover leads; the review's Cool Down follows");
  assert.equal(h.tools[0].ruleId, "rf_social_threat_shame_addresses_recovering-from-invalidation");
  for (const pid of PATTERNS.filter((p) => p !== "emotional_flooding")) {
    const sel = await cell(pid, "stirred", { words: ["hurt"] });
    assert.equal(pickIds(sel)[0], "recovering-from-invalidation", pid);
    assert.equal(sel.picks[0].reason, "emotion_gate", pid);
  }
  assert.ok(!pickIds(await cell("emotional_flooding", "flooded", { words: ["hurt"] })).includes("recovering-from-invalidation"), "flooded: body first");
  const hurt = await run(lu({ emotions: ["Hurt"] }));
  assert.equal(hurt.pattern.id, "rumination_loop", "Hurt is low-energy: On replay, and Recover now reaches it");
  assert.deepEqual(ids(hurt), ["recovering-from-invalidation", "problem-solve"]);
});

test("#5 nothing named (somatic skip) → Alarm: Cool Down + Find the feeling", async () => {
  const r = await run(hu({ band: "steady" }));
  assert.equal(r.pattern.id, "acute_alarm");
  assert.deepEqual(ids(r), ["cool-down", "find-the-feeling"]);
});

test("#6 freeze: 5-4-3-2-1, then OA only 'once you've moved a little'; gentle movement; no flag", async () => {
  const r = await run(lu({ emotions: ["Empty"], band: "steady", discriminatingAnswers: ans("lu_mind_blank", "lu_body_heavy") }));
  assert.equal(r.pattern.id, "conservation_freeze");
  assert.deepEqual(ids(r), ["five-senses", "opposite-action"]);
  assert.equal(r.tools[1].sequence, "after_primary");
  assert.equal(r.tools[1].slot, "swap");
  assert.equal(r.guidedActivity.activityId, "gentle-movement");
  assert.equal(r.safetyFlag, undefined);
});

test("#7 dissociation (any band): 5-4-3-2-1 only, never OA, no flag", async () => {
  for (const band of BANDS) {
    const r = await run(lu({ band, discriminatingAnswers: ans("lu_body_numb", "lu_mind_faraway") }));
    assert.equal(r.pattern.id, "dissociation_overmodulation");
    assert.deepEqual(ids(r), ["five-senses"], band);
    assert.equal(r.safetyFlag, undefined);
    assert.equal(r.routing.blank, true);
  }
});

test("#8 Low drive: Do the Opposite ('get active'), never 5-4-3-2-1 for vegetative states, never Cool Down or Pause", async () => {
  const r = await run(lu({ emotions: ["Bored"], discriminatingAnswers: ans("lu_body_flat") }));
  assert.equal(r.pattern.id, "reward_drive_low");
  assert.deepEqual(ids(r), ["opposite-action"]);
  assert.equal(r.guidedActivity.activityId, "micro-win");
});

test("#9 rumination steady: Problem Solve + 5-4-3-2-1", async () => {
  const r = await run(lu({ emotions: ["Sad"], band: "steady", discriminatingAnswers: ans("lu_mind_looping") }));
  assert.equal(r.pattern.id, "rumination_loop");
  assert.deepEqual(ids(r), ["problem-solve", "five-senses"]);
  assert.equal(r.guidedActivity.activityId, "attention-shift");
});

test("#10 Social threat: Recover + Do the Opposite (unhiding) in any band but flooded", async () => {
  assert.deepEqual(pickIds(await cell("social_threat_shame", "steady")), ["recovering-from-invalidation", "opposite-action"]);
  assert.deepEqual(pickIds(await cell("social_threat_shame", "stirred")), ["recovering-from-invalidation", "opposite-action"]);
});

test("#11 On guard always has a card: 5-4-3-2-1 + Problem Solve; Urge Surfing stays off (D-02)", async () => {
  assert.deepEqual(pickIds(await cell("chronic_vigilance", "steady", { words: ["stressed"] })), ["five-senses", "problem-solve"]);
  assert.deepEqual(pickIds(await cell("chronic_vigilance", "stirred", { words: ["stressed"] })), ["five-senses", "problem-solve"]);
  assert.deepEqual(pickIds(await cell("chronic_vigilance", "flooded")), ["cool-down", "five-senses"]);
  assert.ok(!pickIds(await cell("chronic_vigilance", "stirred", { words: ["worried"] })).includes("urge-surfing"));
});

test("#12 flooding: crisis flag as today, and the cards still come (banner above them, R12)", async () => {
  const r = await run(hu({ emotions: ["panic", "overwhelm", "anger", "sadness"] }));
  assert.equal(r.pattern.id, "emotional_flooding");
  assert.equal(r.safetyFlag.type, "crisis");
  assert.deepEqual([r.routing.band, r.routing.bandSource], ["flooded", "inferred"], "flooded patterns infer flooded");
  assert.deepEqual(ids(r), ["cool-down", "five-senses"]);
});

test("#13 co-occurring blank pattern: nothing calming and no Do the Opposite (acute_alarm + dissociation, stirred → 5-4-3-2-1 alone)", async () => {
  const sel = await cell("acute_alarm", "stirred", { blank: true, secondary: "dissociation_overmodulation" });
  assert.deepEqual(pickIds(sel), ["five-senses"]);
  assert.deepEqual(sel.filtered.filter((f) => f.reason !== "emotion_gate").map((f) => [f.toolId, f.reason]), [["cool-down", "direction"], ["opposite-action", "contraindicated"]]);
  assert.deepEqual(sel.filtered.filter((f) => f.reason === "emotion_gate").map((f) => f.toolId).sort(), ["find-the-feeling", "five-senses", "opposite-action", "pause", "problem-solve", "recovering-from-invalidation", "say-no"], "gated rows that didn't fire are logged (word rules too)");
});

test("#14 FTF flooded + blank → 5-4-3-2-1 only (no Cool Down, D-02)", async () => {
  const r = await run(hu({ emotions: ["Anxious"], band: "flooded", bandSource: "ftf", blank: true }));
  assert.deepEqual(ids(r), ["five-senses"]);
  assert.equal(r.routing.blank, true);
});

test("#15 positive quadrant: positive_state, no tools, no routing", async () => {
  const r = await run({ quadrant: "low-pleasant", emotions: ["Calm"] });
  assert.equal(r.pattern.id, "positive_state");
  assert.deepEqual(r.tools, []);
  assert.equal(r.routing, undefined);
});

test("#16 the contraindication hook: a synthetic CONTRAINDICATED_FOR drops OA with reason contraindicated", async () => {
  const g = structuredClone(on);
  g.contraindicated = [{ conceptId: "dbt_opposite_action", targetId: "social_threat_shame" }];
  const sel = await cell("social_threat_shame", "steady", { g });
  assert.ok(!pickIds(sel).includes("opposite-action"));
  assert.deepEqual(sel.filtered.find((f) => f.toolId === "opposite-action").reason, "contraindicated");
  const flagged = structuredClone(on);
  flagged.contraindicated = [{ conceptId: "dbt_tipp", targetId: "cold_exposure_risk" }];
  const primary = await slice("acute_alarm", flagged);
  const sel2 = selectRecommendations({ primary, band: "flooded", blank: false, userEmotionIds: [], policy: { maxCards: 2 }, fallback: null, medicalFlags: ["cold_exposure_risk"] });
  assert.deepEqual(pickIds(sel2), ["five-senses"], "a medical flag (safety batch) filters too");
});

test("#17 diversity: two change tools can't share a result; the second is rejected as diversity", async () => {
  const g = structuredClone(on);
  g.recommendedFor = g.recommendedFor.filter((r) => r.patternId !== "rumination_loop");
  const row = (id, conceptId, priority) => ({ id, conceptId, patternId: "rumination_loop", bands: ["steady"], priority, direction: null, side: null, requiresPrior: null, emotionGate: null, active: true, surface: ["checkin_result"] });
  g.recommendedFor.push(row("x_ps", "dbt_problem_solving", 1), row("x_oa", "dbt_opposite_action", 2), row("x_fs", "se_orienting", 3));
  const sel = await cell("rumination_loop", "steady", { g });
  assert.deepEqual(pickIds(sel), ["problem-solve", "five-senses"]);
  assert.deepEqual(sel.filtered, [{ toolId: "opposite-action", ruleId: "x_oa", reason: "diversity" }]);
});

test("#18 kill switch: policy off (as shipped) or missing → the E4-1 output byte-for-byte, routing 'legacy'", async () => {
  const noPolicy = structuredClone(graph);
  noPolicy.routingPolicy = null;
  const inputs = [
    ...grid.filter((g) => g.quadrant.endsWith("unpleasant")).map((g) => ({ quadrant: g.quadrant, emotions: [g.name] })),
    hu({ emotions: ["panic", "overwhelm", "anger", "sadness"], band: "flooded" }),
    lu({ emotions: ["Sad"], discriminatingAnswers: ans("lu_mind_looping") }),
    hu({ intensity: { x: 0.2, y: 0.9 } }),
  ];
  for (const input of inputs) {
    const off = await run(input, graph);
    const missing = await run(input, noPolicy);
    // What E4-1 returned: the same handler without the routing step.
    const pinned = { ...off };
    delete pinned.routing;
    assert.equal(off.routing.version, "legacy");
    assert.deepEqual(off.routing.recommendedToolIds, ids(off));
    assert.ok(off.tools.every((t) => !("slot" in t)), "legacy cards keep the legacy shape");
    const { routing: _r, ...rest } = missing;
    assert.deepEqual(rest, pinned, JSON.stringify(input));
  }
  const a = await run(hu({ emotions: ["Anxious"] }), graph);
  assert.deepEqual(a.tools.map((t) => [t.id, t.relevance]), [["cool-down", "medium"], ["opposite-action", "relevant"]]);
});

test("the fallback (5-4-3-2-1) answers when every row is filtered", async () => {
  const g = structuredClone(on);
  g.recommendedFor = g.recommendedFor.filter((r) => r.patternId !== "acute_alarm");
  const r = await run(hu({ emotions: ["Fearful"] }), g);
  assert.deepEqual(ids(r), ["five-senses"]);
  assert.deepEqual([r.tools[0].ruleId, r.tools[0].reason], ["fallback", "fallback"]);
});

// ---- Invariants over all 27 cells and every gated variant ----

test("invariants: 1–2 cards, ≤1 change skill, distinct kinds, no calming when blank, flooded body/orient only, no OA for dissociation, real tools only, no DEAR MAN, requiresPrior never first, deterministic", async () => {
  let oaCells = 0;
  const variants = [{ words: [] }, { words: ["humiliated"] }, { words: ["hurt"] }, { words: ["anxious"] }];
  for (const pid of PATTERNS) {
    for (const band of BANDS) {
      for (const v of [...variants, { ...variants[3], blank: true }]) {
        const sel = await cell(pid, band, v);
        const picks = sel.picks;
        const label = `${pid}/${band}/${JSON.stringify(v)}`;
        assert.ok(picks.length >= 1 && picks.length <= 2, label);
        assert.ok(picks.filter((p) => p.side === "change").length <= 1, label);
        assert.equal(new Set(picks.map((p) => p.skillKind)).size, picks.length, label);
        if (v.blank || graph.patterns[pid].blank) assert.ok(picks.every((p) => p.direction !== "down" && p.concept.direction !== "down"), label);
        if (band === "flooded") assert.ok(picks.every((p) => ["body", "orient"].includes(p.skillKind)), label);
        if (pid === "dissociation_overmodulation") assert.ok(!pickIds(sel).includes("opposite-action"), label);
        assert.ok(!pickIds(sel).includes("dear-man"), label);
        assert.equal(picks[0].sequence, undefined, label);
        for (const id of pickIds(sel)) {
          assert.ok(toolIds.includes(id), `${label}: ${id} not in tools.ts`);
          assert.ok(toolComponents.includes(`'${id}':`) || toolComponents.includes(`'${id}'`), `${label}: ${id} has no component`);
        }
        assert.deepEqual(await cell(pid, band, v), sel, `${label}: deterministic`);
      }
      if (pickIds(await cell(pid, band, { words: ["anxious"] })).includes("opposite-action")) oaCells += 1;
    }
  }
  assert.equal(PATTERNS.length * BANDS.length, 27);
  // Oct 2026 review: the thinking tools are no longer held back by capacity, so Do the Opposite shows in more
  // cells (pinned, so a change is deliberate): Alarm, Social threat, Shut down (after moving), Low drive and
  // On guard's anxiety words, each in the two non-flooded bands.
  assert.equal(oaCells, 10);
});

test("band: the request's own answer, else inferred (flooded patterns → flooded, else the default)", () => {
  const policy = { defaultBand: "stirred", floodedPatterns: ["emotional_flooding"] };
  assert.deepEqual(resolveBand({ band: "steady", bandSource: "ftf" }, "acute_alarm", policy), { band: "steady", bandSource: "ftf" });
  assert.deepEqual(resolveBand({ band: "steady" }, "acute_alarm", policy), { band: "steady", bandSource: "probe" });
  assert.deepEqual(resolveBand({}, "emotional_flooding", policy), { band: "flooded", bandSource: "inferred" });
  assert.deepEqual(resolveBand({}, "acute_alarm", null), { band: "stirred", bandSource: "inferred" });
});

test("request validation: bad band / source / blank / surface / quadrant are errors; old fields stay lenient", () => {
  assert.throws(() => parseStateRequest({}), /Quadrant is required/);
  assert.throws(() => parseStateRequest({ quadrant: "nope" }), /Unknown quadrant/);
  assert.throws(() => parseStateRequest(hu({ band: "calm" })), /Unknown band/);
  assert.throws(() => parseStateRequest(hu({ band: "steady", bandSource: "inferred" })), /Unknown band source/);
  assert.throws(() => parseStateRequest(hu({ blank: "yes" })), /blank/);
  assert.throws(() => parseStateRequest(hu({ surface: "home" })), /Unknown surface/);
  const ok = parseStateRequest(hu({
    emotions: ["Anxious", 3, ""], intensity: { x: 2, y: 0.5 }, band: "flooded", bandViaCantTell: false,
    discriminatingAnswers: [{ questionId: "hu_experience_quality", responseId: "hu_exp_alarm" }, { questionId: "X Y", responseId: "z" }],
    surface: "dear_man_debrief", blank: false,
  }));
  assert.deepEqual(ok, {
    quadrant: "high-unpleasant", emotions: ["Anxious"], band: "flooded", surface: "dear_man_debrief", blank: false,
    discriminatingAnswers: [{ questionId: "hu_experience_quality", responseId: "hu_exp_alarm" }],
  });
});

test("#19 Numb (E4-5, D-14; Oct 2026 review): Shut down; with the 'numb or disconnected' answer the graph's freeze + dissociation co-occurrence keeps Shut down first, and nothing that needs engagement shows", async () => {
  const numb = grid.find((g) => g.id === "numb");
  assert.equal(numb.quadrant, "low-unpleasant");
  assert.match(readFileSync("src/data/emotions.ts", "utf8"), /makeEmotion\('numb', 'Numb', 'low-unpleasant', 'angry'/, "family kept");
  assert.match(readFileSync("schema/emotion-wheel-sync.cypher", "utf8"), /\{id: "numb", name: "Numb", quadrant: "low-unpleasant", family: "angry"\}/);
  assert.equal(graph.emotions.numb.quadrant, "low-unpleasant");
  const r = await run(lu({ emotions: ["Numb"], discriminatingAnswers: ans("lu_body_numb") }));
  assert.equal(r.pattern.id, "conservation_freeze");
  assert.equal(r.secondaryPattern.id, "dissociation_overmodulation");
  assert.deepEqual(ids(r), ["five-senses"], "Do the Opposite is contraindicated with dissociation alongside");
  assert.equal(r.safetyFlag, undefined);
  assert.equal(r.guidedActivity.activityId, "gentle-movement");
});

test("DT-11's row (signed off 10 Nov): Pause leads and Rebel without the wreckage is the swap on the push-back words, never flooded", async () => {
  const id = "rf_reactive_aggression_words_rebel_alternate-rebellion";
  assert.ok(on.recommendedFor.some((r) => r.id === id && r.active), "the row is live");
  for (const word of ["Provoked", "Indignant"]) {
    const r = await run(hu({ emotions: [word] }));
    assert.equal(r.pattern.id, "reactive_aggression", word);
    assert.deepEqual(ids(r), ["pause", "alternate-rebellion"], word);
    assert.equal(r.tools[1].ruleId, id, word);
    assert.ok(!ids(await run(hu({ emotions: [word], band: "flooded" }))).includes("alternate-rebellion"), `${word}, flooded`);
  }
  // Switched back off, the swap is Cool Down again.
  const off = { ...on, recommendedFor: on.recommendedFor.map((r) => (r.id === id ? { ...r, active: false } : r)) };
  assert.deepEqual(ids(await run(hu({ emotions: ["Provoked"] }), off)), ["pause", "cool-down"]);
});
