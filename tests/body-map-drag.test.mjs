// Body map step 3 (docs/design/body-map.md, canvas row AA): the drag on the figure (regionAt), and
// how a mark looks (src/lib/bodyMark.ts): warm / cool from its words, glow from the strength bar.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const fig = await importTs("src/data/bodyFigure.ts");
const mark = await importTs("src/lib/bodyMark.ts");
const content = JSON.parse(readFileSync("tests/fixtures/body-map-content.json", "utf8"));

const centreOf = (s) => (s.kind === "ellipse" ? [s.cx, s.cy] : s.kind === "rect" ? [s.x + s.w / 2, s.y + s.h / 2] : null);

test("the figure box matches the viewBox the figure draws in", () => {
  assert.equal(fig.FIGURE_VIEWBOX, [fig.FIGURE_BOX.x, fig.FIGURE_BOX.y, fig.FIGURE_BOX.w, fig.FIGURE_BOX.h].join(" "));
});

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

test("a mark's colour comes from its words: more is warm, less is cool, both is a blend, none the mid-tone", () => {
  assert.equal(mark.markColour([]), mark.HEAT);
  assert.equal(mark.markColour(["more", "more"]), mark.WARM);
  assert.equal(mark.markColour(["less"]), mark.COOL);
  assert.match(mark.markColour(["more", "less"]), /^color-mix\(in oklab, var\(--color-q-hu-fill\), var\(--color-q-lu-fill\)\)$/);
  // Every pad word in the graph says which it is.
  for (const w of content.padWords) assert.ok(["more", "less"].includes(w.energy), w.id);
});

test("strength: a bigger, brighter glow; not used is a middle glow; said back in a word", () => {
  assert.deepEqual(mark.glowLook(null), { scale: 1, opacity: 0.9 });
  const faint = mark.glowLook(0), strong = mark.glowLook(1);
  assert.ok(strong.scale > faint.scale && strong.opacity > faint.opacity);
  assert.ok(strong.opacity <= 1);
  assert.equal(mark.strengthWord(null), null);
  assert.equal(mark.strengthWord(0.9), "strong");
  assert.equal(mark.strengthWord(0.5), "medium");
  assert.equal(mark.strengthWord(0.1), "faint");
  assert.equal(mark.strengthAt(0, 200), 1);
  assert.equal(mark.strengthAt(200, 200), 0);
  assert.equal(mark.strengthAt(-30, 200), 1, "clamped above");
  assert.equal(mark.strengthAt(50, 200), 0.75);
});

test("the body step: drag to choose, the strength bar beside the body (shown by default), words in one row, no pad", () => {
  const step = readFileSync("src/components/checkin/body/BodyStep.tsx", "utf8");
  assert.doesNotMatch(step, /FeelingSquare/, "the pad is gone");
  assert.match(step, /<StrengthBar/);
  assert.match(step, /\{barOn && \(/, "the toggle hides the bar");
  assert.match(step, /useState\(readBarPref\)/);
  assert.match(step, /localStorage\.getItem\(BAR_HIDDEN_KEY\) !== '1'/, "shown unless hidden");
  assert.match(step, /strength: draft\.strength/);
  assert.match(step, /onHover=\{setHover\}/);
  const heat = readFileSync("src/components/checkin/body/HeatFigure.tsx", "utf8");
  assert.match(heat, /regionAt\(/);
  assert.match(heat, /className=\{`heat-figure-wrap/, "the drag is on a wrapper div");
  assert.doesNotMatch(heat, /\.getScreenCTM\(/, "box mapping, not getScreenCTM");
  assert.match(heat, /glowLook\(m\.strength\)/);
});
