// Body map step 3 (docs/design/body-map.md): the drag on the figure (regionAt) and the sensation
// pad (src/lib/bodyPad.ts): which place is under the finger, which words the dot shows, the colour.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const fig = await importTs("src/data/bodyFigure.ts");
const pad = await importTs("src/lib/bodyPad.ts");
const content = JSON.parse(readFileSync("tests/fixtures/body-map-content.json", "utf8"));

const centreOf = (s) => (s.kind === "ellipse" ? [s.cx, s.cy] : s.kind === "rect" ? [s.x + s.w / 2, s.y + s.h / 2] : null);

test("every tap target's centre is its own place, on both sides", () => {
  for (const id of fig.REGION_IDS) {
    for (const s of fig.REGIONS[id].hits) {
      const c = centreOf(s);
      if (c) assert.equal(fig.regionAt(...c), id, `${id} at ${c}`);
    }
  }
  // Arms and legs are polygons: a point well inside each.
  assert.equal(fig.regionAt(45, 170), "arms");
  assert.equal(fig.regionAt(155, 170), "arms");
  assert.equal(fig.regionAt(82, 320), "legs");
  assert.equal(fig.regionAt(120, 320), "legs");
});

test("overlaps go to the smaller place; seams snap; off the body is nothing", () => {
  assert.equal(fig.regionAt(34, 238), "hands", "hand over the end of the arm");
  assert.equal(fig.regionAt(100, 45), "face", "face over the bottom of the head");
  assert.equal(fig.regionAt(100, 163), "chest", "the seam between chest and stomach snaps to the nearer");
  assert.equal(fig.regionAt(100, 200), "stomach");
  assert.equal(fig.regionAt(190, 20), null);
  assert.equal(fig.regionAt(100, 425 + fig.SNAP), null);
  assert.equal(fig.regionAt(-8, 300), null);
});

test("an untouched pad is the middle: warm mid-tone, every quarter, a prompt", () => {
  assert.equal(pad.isPadSet(pad.PAD_UNSET), false);
  assert.equal(pad.isPadSet(null), false);
  assert.equal(pad.markColour({ x: 0.5, y: 0.5 }), pad.HEAT);
  assert.deepEqual(pad.padZones(null), ["hu", "lu", "hp", "lp"]);
  assert.match(pad.describePad(null), /dot/);
  assert.match(pad.markColour({ x: 0.2, y: 0.8 }), /^color-mix\(/);
  assert.notEqual(pad.markColour({ x: 0.2, y: 0.8 }), pad.HEAT);
});

test("the dot's quarter first; near a middle line the neighbour too; all four near the centre", () => {
  assert.deepEqual(pad.padZones({ x: 0.1, y: 0.9 }), ["hu"]);
  assert.deepEqual(pad.padZones({ x: 0.9, y: 0.1 }), ["lp"]);
  assert.deepEqual(pad.padZones({ x: 0.55, y: 0.9 }), ["hp", "hu"]);
  assert.deepEqual(pad.padZones({ x: 0.1, y: 0.45 }), ["lu", "hu"]);
  assert.deepEqual(new Set(pad.padZones({ x: 0.52, y: 0.48 })), new Set(["hu", "lu", "hp", "lp"]));
  assert.equal(pad.padZones({ x: 0.52, y: 0.48 })[0], "lp");
});

test("words follow the dot and the place; picked words never disappear", () => {
  const words = content.padWords;
  const ids = (p, region, picked) => pad.wordsForPad(words, region, p, picked).map((w) => w.id);
  const chestHu = ids({ x: 0.1, y: 0.9 }, "chest");
  assert.ok(chestHu.includes("racing_heart") && chestHu.includes("tension"));
  assert.ok(!chestHu.includes("heaviness") && !chestHu.includes("warmth"), "no other quarter's words");
  assert.ok(!chestHu.includes("clenched"), "clenched is jaw / hands / stomach only");
  const stomachLp = ids({ x: 0.9, y: 0.1 }, "stomach");
  assert.ok(stomachLp.includes("settled") && !stomachLp.includes("churning"));
  // A picked word from another quarter stays, after the quarter's own words.
  const kept = ids({ x: 0.9, y: 0.1 }, "stomach", ["churning"]);
  assert.equal(kept.at(-1), "churning");
  // Every word that shows is for this place (or anywhere).
  for (const id of chestHu) {
    const w = words.find((x) => x.id === id);
    assert.ok(w.regions.length === 0 || w.regions.includes("chest"), id);
  }
});

test("the read-back says strength, then comfort", () => {
  assert.equal(pad.describePad({ x: 0.1, y: 0.9 }), "Strong and uncomfortable");
  assert.equal(pad.describePad({ x: 0.9, y: 0.1 }), "Faint and comfortable");
  assert.equal(pad.describePad({ x: 0.5, y: 0.5001 }), "Medium, not clearly either");
});

test("the body step uses the drag and the pad, and saves the pad point", () => {
  const step = readFileSync("src/components/checkin/body/BodyStep.tsx", "utf8");
  assert.match(step, /<FeelingSquare[^>]*axes=\{PAD_AXES\}/);
  assert.match(step, /intensity: pad \?\? PAD_UNSET/);
  assert.match(step, /onHover=\{setHover\}/);
  const heat = readFileSync("src/components/checkin/body/HeatFigure.tsx", "utf8");
  assert.match(heat, /regionAt\(/);
  assert.match(heat, /onPointerUp: handleUp/);
});
