// E4-4: result cards (src/lib/recommendation.ts, RecommendationCards.tsx, both result screens,
// the DEAR MAN debrief) and what the check-in stores about them.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const rec = await importTs("src/lib/recommendation.ts");
const { ROUTING_LABELS } = await importTs("src/data/routingLabels.ts");
const p = await importTs("src/lib/spine/checkInPayload.ts");
const link = await importTs("src/lib/spine/toolLink.ts");
const v = await importTs("functions/src/checkin/validation.ts");
const read = (f) => readFileSync(f, "utf8");

const card = (id, o = {}) => ({ id, name: "graph name", description: "", whenToUse: "", relevance: "primary", ...o });

test("side labels (WMP-04 v0): change + acceptance → both; same side / both → 'Or try this'; after_primary; legacy none", () => {
  assert.deepEqual(rec.cardLabels([{ side: "change" }, { side: "acceptance" }]), [ROUTING_LABELS.change, ROUTING_LABELS.acceptance]);
  assert.deepEqual(rec.cardLabels([{ side: "acceptance" }, { side: "change" }]), ["Make room for what you can't", "Change what you can"]);
  assert.deepEqual(rec.cardLabels([{ side: "both" }, { side: "acceptance" }]), [null, "Or try this"]);
  assert.deepEqual(rec.cardLabels([{ side: "acceptance" }, { side: "acceptance" }]), [null, "Or try this"]);
  assert.deepEqual(rec.cardLabels([{ side: "acceptance" }, { side: "change", sequence: "after_primary" }]), [null, "Once you've moved a little"]);
  assert.deepEqual(rec.cardLabels([{}, {}]), [null, null], "legacy results carry no side");
  assert.deepEqual(rec.cardLabels([{ side: "change" }]), [null]);
  assert.ok(["draft", "approved"].includes(ROUTING_LABELS.reviewStatus));
});

test("cards: names, emoji and tagline from tools.ts; unknown ids dropped; ≤ 2; no graph name, no relevance word", () => {
  const cards = rec.recommendationCards({ tools: [
    card("tipp-typo"), card("cool-down", { name: "TIPP", relevance: "medium", slot: "primary", side: "both", ruleId: "rf_x" }),
    card("five-senses", { slot: "swap", side: "acceptance" }), card("pause"),
  ] });
  assert.deepEqual(cards.map((c) => [c.tool.id, c.tool.name, c.slot, c.label, c.ruleId]), [
    ["cool-down", "First, the body", "primary", null, "rf_x"],
    ["five-senses", "5-4-3-2-1", "swap", "Or try this", null],
  ]);
  assert.deepEqual(rec.recommendationCards(null), []);
  const comp = read("src/components/checkin/RecommendationCards.tsx");
  assert.doesNotMatch(comp, /\.relevance|\.description|whenToUse|getToolById/);
  assert.match(comp, /\{tool\.name\}/);
  assert.match(comp, /\{tool\.tagline\}/);
});

test("what the check-in stores: the rendered ids (crisis-banner results too) and the routing version / band", () => {
  const ID = "3f2c9a0e-1b2c-4d5e-8f90-123456789abc";
  const state = { id: ID, quadrant: "high-unpleasant", emotions: ["Anxious"], intensity: null, bodySensations: [], note: "",
    startedAt: new Date("2026-10-01T10:00:00Z"), source: "grid" };
  const result = {
    pattern: { id: "emotional_flooding", confidence: 0.9 }, safetyFlag: { id: "crisis_self_harm", type: "crisis" },
    tools: [card("tipp-typo"), card("cool-down"), card("five-senses")],
    routing: { version: "rf-v1", band: "flooded", bandSource: "inferred", blank: false, recommendedToolIds: [], ruleIds: [], filtered: [], receiveFirst: false, surface: "checkin" },
  };
  const req = p.buildCheckInPayload(state, result);
  assert.deepEqual(req.recommendedToolIds, ["cool-down", "five-senses"], "what rendered, not what was sent");
  assert.deepEqual(rec.shownToolIds(result), req.recommendedToolIds);
  assert.equal(req.safetyFlagId, "crisis_self_harm");
  assert.deepEqual([req.routingVersion, req.routingBand, req.routingBandSource], ["rf-v1", "flooded", "inferred"]);
  assert.ok(!("capacity" in req), "an inferred routing band is never stored as the user's band (R1)");

  const out = v.validateSaveCheckIn({ ...req, routingVersion: "rf-v1", routingBand: "flooded", routingBandSource: "inferred" }, new Date("2026-10-01T10:05:00Z"));
  assert.deepEqual([out.routingVersion, out.routingBand, out.routingBandSource], ["rf-v1", "flooded", "inferred"]);
  const bad = v.validateSaveCheckIn({ ...req, routingVersion: "RF V1!", routingBand: "calm", routingBandSource: "guess" }, new Date("2026-10-01T10:05:00Z"));
  assert.deepEqual([bad.routingVersion, bad.routingBand, bad.routingBandSource], [null, null, null], "dropped, never fatal");
  assert.match(read("functions/src/checkin/index.ts"), /c\.routingVersion = \$routingVersion, c\.routingBand = \$routingBand, c\.routingBandSource = \$routingBandSource/);
});

test("link state keeps the keys tools read and adds the tapped slot", () => {
  const s = link.fromCheckIn("c1", ["Anxious"], "acute_alarm", { slot: "swap", ruleId: "rf_x" });
  assert.deepEqual(s, { checkinEmotions: ["Anxious"], activationPatternId: "acute_alarm", spine: { entry: "checkin_result", checkInId: "c1" }, routing: { slot: "swap", ruleId: "rf_x" } });
  assert.deepEqual(link.fromCheckIn("c1"), { spine: { entry: "checkin_result", checkInId: "c1" } });
});

test("both result screens render RecommendationCards below the banner and the beat (A0-1, A5-3 kept)", () => {
  for (const [f, variant] of [["src/components/checkin/StateResult.tsx", ""], ["src/components/checkin/LowEnergyStateResult.tsx", 'variant="compact"']]) {
    const src = read(f);
    assert.match(src, /const cards = recommendationCards\(result\);/, f);
    assert.match(src, /toolCount: cards\.length/, f);
    assert.doesNotMatch(src, /tools\.slice\(|tool\.relevance|tool\.name/, f);
    const main = src.slice(src.lastIndexOf('<div className="py-4">'));
    const at = (needle) => main.indexOf(needle);
    assert.ok(at("<CrisisBanner />") < at("<WitnessBeat") && at("<WitnessBeat") < at("<RecommendationCards"), f);
    if (variant) assert.match(main, /<RecommendationCards variant="compact"/, f);
  }
});

test("CheckIn sends band source, FTF blank and the surface; DEAR MAN's debrief no longer shows cards (IE-B2)", () => {
  const ci = read("src/pages/CheckIn.tsx");
  assert.match(ci, /bandSource: routingBandSource\(cap\)/);
  assert.match(ci, /\.\.\.\(ftfBlank\.current \? \{ blank: true \} : \{\}\)/);
  assert.match(ci, /surface: 'checkin'/);
  assert.match(read("src/pages/tools/FindTheFeeling.tsx"), /blank: state\.pull === 'blank'/);
  const dm = read("src/pages/tools/DearMan.tsx");
  assert.doesNotMatch(dm, /surface: 'dear_man_debrief'|recommendationCards/);
});
