// Body map steps 4–5 (docs/design/body-map.md, canvas rows Y and Z): the body mirror. Which typical
// places it draws for the check-in's words, the tabs (one per map, at most three, in check-in order),
// the Together tab's shared places, and what a tapped place fills in. Run over the content the app
// ships (src/data/content/body-map.json) through the same service the body step calls.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const mirror = await importTs("src/lib/bodyMirror.ts");
const fig = await importTs("src/data/bodyFigure.ts");
const { getEmotionById, emotions } = await importTs("src/data/emotions.ts");
const { getBodyMapContent } = await importTs("src/services/bodyMap.ts");

const lookup = (id) => {
  const e = getEmotionById(id);
  return e ? { name: e.name, quadrant: e.quadrant } : undefined;
};
const tabsFor = async (ids) => mirror.mirrorTabs((await getBodyMapContent(ids)).maps, lookup);

test("every grid word with a live map gets one tab with 1–5 typical places, one per place, all on the figure", async () => {
  const shipped = JSON.parse(readFileSync("src/data/content/body-map.json", "utf8")).content;
  const mapped = new Set(shipped.maps.filter((m) => m.places.length).flatMap((m) => m.wordIds));
  let n = 0;
  for (const e of emotions) {
    const tabs = await tabsFor([e.id]);
    if (!mapped.has(e.id)) { assert.equal(tabs.length, 0, e.id); continue; }
    n++;
    assert.equal(tabs.length, 1, e.id);
    const [t] = tabs;
    assert.deepEqual(t.words, [e.name.toLowerCase()]);
    assert.equal(t.zone, mirror.zoneOfQuadrant(e.quadrant), `${e.id}: the tab takes its word's quarter`);
    assert.ok(t.ghosts.length >= 1 && t.ghosts.length <= mirror.MAX_GHOSTS, e.id);
    assert.equal(new Set(t.ghosts.map((g) => g.region)).size, t.ghosts.length, `${e.id}: one ghost per place`);
    for (const g of t.ghosts) assert.ok(fig.isRegionId(g.region), `${e.id}: ${g.region}`);
    const weights = t.ghosts.map((g) => g.weight);
    assert.deepEqual(weights, [...weights].sort((a, b) => b - a), `${e.id}: strongest first`);
  }
  assert.ok(n > 80, `most grid words have a map (${n})`);
});

test("words of one family share a tab; different families get their own, in check-in order, at most three", async () => {
  const one = await tabsFor(["anxious", "overwhelmed"]);
  assert.equal(one.length, 1);
  assert.deepEqual(one[0].words, ["anxious", "overwhelmed"]);

  const two = await tabsFor(["excited", "anxious"]);
  assert.deepEqual(two.map((t) => t.map.id), ["excitement", "fear"], "the first word picked leads");
  assert.deepEqual(two.map((t) => t.zone), ["hp", "hu"]);

  const many = await tabsFor(["anxious", "excited", "tired", "angry", "guilty"]);
  assert.equal(many.length, mirror.MAX_TABS);
  assert.deepEqual(many.map((t) => t.words[0]), ["anxious", "excited", "tired"]);
});

test("Together: only places two tabs both draw, with both colours in tab order", async () => {
  const tabs = await tabsFor(["anxious", "excited"]);
  const shared = mirror.sharedPlaces(tabs);
  const [a, b] = tabs.map((t) => new Set(t.ghosts.map((g) => g.region)));
  assert.deepEqual(shared.map((s) => s.region).sort(), [...a].filter((r) => b.has(r)).sort());
  for (const s of shared) assert.deepEqual(s.zones, ["hu", "hp"]);
  assert.deepEqual(mirror.sharedPlaces(tabs.slice(0, 1)), [], "one map shares nothing");
});

test("a tapped place fills in its word, both sides, and its weight only when the strength bar is on", () => {
  const g = { region: "chest", sensationId: "racing_heart", label: "Racing", weight: 0.876 };
  assert.deepEqual(mirror.prefillFrom(g, true), { side: "both", strength: 0.88, sensationIds: ["racing_heart"] });
  assert.deepEqual(mirror.prefillFrom(g, false), { side: "both", strength: null, sensationIds: ["racing_heart"] });
});

test("ghostsFor skips places the figure doesn't have and repeats of a place", () => {
  const map = { id: "x", label: "X", emotionIds: ["a"], places: [
    { region: "chest", sensationId: "a", label: "A", energy: "more", weight: 1 },
    { region: "chest", sensationId: "b", label: "B", energy: "more", weight: 0.9 },
    { region: "elbow", sensationId: "c", label: "C", energy: "more", weight: 0.8 },
    { region: "hands", sensationId: "d", label: "D", energy: "more", weight: 0.7 },
  ] };
  assert.deepEqual(mirror.ghostsFor(map).map((g) => [g.region, g.sensationId]), [["chest", "a"], ["hands", "d"]]);
  assert.equal(mirror.ghostsFor({ ...map, places: Array.from({ length: 9 }, (_, i) => ({ ...map.places[0], region: fig.REGION_IDS[i] })) }).length, mirror.MAX_GHOSTS);
});

test("the entry names one or two feelings, else 'your feelings'", () => {
  const t = (w) => ({ words: [w] });
  assert.deepEqual(mirror.entryWords([t("anxious")]), ["anxious"]);
  assert.deepEqual(mirror.entryWords([t("anxious"), t("excited")]), ["anxious", "excited"]);
  assert.equal(mirror.entryWords([t("a"), t("b"), t("c")]), null);
  assert.equal(mirror.listWords(["a", "b", "c"]), "a, b and c");
});

test("the body step hands the mirror the check-in's words, never on the body-first path, and saves fromMirror", () => {
  const checkIn = readFileSync("src/pages/CheckIn.tsx", "utf8");
  assert.match(checkIn, /emotionIds=\{entryPoint === 'somatic' \? \[\] : emotionIdsFor\(/);
  const step = readFileSync("src/components/checkin/body/BodyStep.tsx", "utf8");
  assert.match(step, /fromMirror: true/);
  assert.doesNotMatch(step, /colour: zoneColour\(tab\.zone\)[^\n]*strength/, "a mark never takes a tab's colour");
});
