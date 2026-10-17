// The parts stats in words and in Reflect (docs/design/parts.md, the integration readout): the copy
// (common/stats, reflect), its slot widths, the wording from ids (src/lib/partStats.ts), and Reflect's
// section (src/components/insights/PartsReflect.tsx). The numbers are pinned in
// functions/test/unit/partStats.test.cjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture } from "./lib/partsContentFixture.mjs";
import { PARTS_SLOT_WIDTH } from "../scripts/voice-lint.mjs";

const read = (f) => readFileSync(f, "utf8");
const lib = await importTs("src/lib/partStats.ts");
const partsTypes = await importTs("src/data/partsTypes.ts");
const { tools } = await importTs("src/data/tools.ts");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const IDS = [...lib.REFLECT_PROMPTS, ...Object.values(lib.WHEN_OPTIONS)];
/** parts.json with the section's lines and the feel answers signed off. */
const content = partsFromFixture(fixture, (id) => IDS.includes(id) || id.startsWith("feel_"));
const toolName = (id) => tools.find((t) => t.id === id)?.name ?? null;
const deps = { toolName, monthName: (m) => lib.monthName(m, "en-GB") };

test("copy: common/stats shared by Me and Reflect, the when options, Reflect's title", () => {
  const copy = Object.fromEntries(lib.STATS_PROMPTS.map((id) => [id, fixture.prompts[id].copy]));
  assert.deepEqual(copy, {
    stats_helped: "What's helped it settle",
    stats_helped_line: "{tool} helped {n} times",
    stats_helped_once: "{tool} helped once",
    stats_felt: "How you've felt toward it",
    stats_felt_then_now: "In {month}: {then}. Lately: {now}.",
    stats_felt_since: "Since {month}: {now}.",
    stats_when: "Mostly {when}",
    stats_steps: "Steps that helped: {steps}",
    stats_step_twice: "{step} (twice)",
    stats_step_times: "{step} ({n} times)",
  });
  for (const id of lib.STATS_PROMPTS) assert.deepEqual([fixture.prompts[id].flow, fixture.prompts[id].step], ["common", "stats"], id);
  assert.deepEqual([fixture.prompts.reflect_title.flow, fixture.prompts.reflect_title.copy], ["reflect", "The parts you know"]);
  assert.deepEqual(fixture.options.common.stats.map((o) => [o.id, o.label]),
    [["when_mornings", "mornings"], ["when_afternoons", "afternoons"], ["when_evenings", "evenings"], ["when_nights", "at night"]]);
  assert.deepEqual(Object.keys(lib.WHEN_OPTIONS), [...partsTypes.PART_WHENS]);
});

test("slot widths: the longest real value of each", () => {
  assert.equal(PARTS_SLOT_WIDTH.tool, Math.max(...tools.map((t) => t.name.length)), "the longest tool name");
  const feel = fixture.options.meet.feel.map((o) => o.label.length);
  assert.equal(PARTS_SLOT_WIDTH.then, Math.max(...feel));
  assert.equal(PARTS_SLOT_WIDTH.now, Math.max(...feel));
  assert.equal(PARTS_SLOT_WIDTH.when, Math.max(...fixture.options.common.stats.map((o) => o.label.length)));
  const months = Array.from({ length: 12 }, (_, i) => lib.monthName(`2026-${String(i + 1).padStart(2, "0")}`, "en-GB").length);
  assert.equal(PARTS_SLOT_WIDTH.month, Math.max(...months), "September");
  // a step's label is graph content (ActionUrge steps run to ~100 characters and wrap): the lint counts a
  // realistic one, and the joined list at the same width
  assert.equal(PARTS_SLOT_WIDTH.step, 60);
  assert.equal(PARTS_SLOT_WIDTH.steps, PARTS_SLOT_WIDTH.step);
});

test("lines: labels resolved by id; once and n times; then vs now and since; when", () => {
  const stats = {
    helped: [{ toolId: "pause", n: 3 }, { toolId: "cool-down", n: 1 }],
    felt: { month: "2026-07", then: "feel_tired", now: "feel_curious" },
    when: "evenings",
  };
  assert.deepEqual(lib.partStatLines(stats, content, deps), {
    when: "Mostly evenings",
    helped: { title: "What's helped it settle", lines: ["Pause helped 3 times", "Circuit Breaker helped once"] },
    steps: null,
    felt: { title: "How you've felt toward it", line: "In July: tired of it. Lately: curious." },
  });
  const since = lib.partStatLines({ helped: null, felt: { month: "2026-06", then: null, now: "feel_warm" }, when: "nights" }, content, deps);
  assert.deepEqual(since, { when: "Mostly at night", helped: null, steps: null, felt: { title: "How you've felt toward it", line: "Since June: warm toward it." } });
  assert.equal(lib.hasStatLine(lib.partStatLines({ helped: null, felt: null, when: null }, content, deps)), false);
});

test("lines: steps that helped, one line; a count only past once; the graph's labels as they come", () => {
  const steps = [
    { stepId: "oa:fear-avoid:small", label: "Stay in the room", n: 2 },
    { stepId: "recover:park", label: "Park the replay", n: 4 },
    { stepId: "oa:default_sadness:small", label: "Reach out to one person", n: 1 },
  ];
  const out = lib.partStatLines({ helped: null, felt: null, when: null, steps }, content, deps);
  assert.equal(out.steps, "Steps that helped: Stay in the room (twice) · Park the replay (4 times) · Reach out to one person");
  assert.equal(lib.hasStatLine(out), true, "a part with only steps has a line");
  // a label that brings a slot of its own is printed as it is, never filled
  assert.equal(lib.partStatLines({ helped: null, felt: null, when: null, steps: [{ stepId: "x", label: "{n} {steps}", n: 1 }] }, content, deps).steps,
    "Steps that helped: {n} {steps}");
  // nothing to say: null, never "Steps that helped: "
  for (const none of [null, undefined, [], [{ stepId: "x", label: "", n: 2 }], [{ stepId: "x", label: "Park", n: 0 }]]) {
    assert.equal(lib.partStatLines({ helped: null, felt: null, when: null, steps: none }, content, deps).steps, null, JSON.stringify(none));
  }
});

test("lines: three steps, or two when any of them has a label over 60 characters", () => {
  const short = (id, n = 1) => ({ stepId: id, label: `Step ${id}`, n });
  const long = { stepId: "oa:love-proximity:bigger", label: "Fill the time you'd spend thinking about them with something that builds your life", n: 1 };
  assert.equal(lib.STEPS_LONG_LABEL, 60);
  const line = (steps) => lib.partStatLines({ helped: null, felt: null, when: null, steps }, content, deps).steps;
  assert.equal(line([short("a"), short("b"), short("c")]), "Steps that helped: Step a · Step b · Step c");
  assert.equal(line([short("a"), short("b"), long]), "Steps that helped: Step a · Step b", "a long third: two");
  assert.equal(line([long, short("b"), short("c")]), `Steps that helped: ${long.label} · Step b`, "a long first: two");
  const sixty = { stepId: "x", label: "x".repeat(60), n: 1 };
  assert.deepEqual(lib.shownSteps([short("a"), short("b"), sixty]).length, 3, "60 is not over");
  assert.deepEqual(lib.shownSteps([short("a"), short("b"), short("c"), long]).length, 3, "a fourth never counts (the server sends three)");
});

test("lines: a line whose words don't ship is left out, never half-filled", () => {
  const unknownTool = lib.partStatLines({ helped: [{ toolId: "gone-tool", n: 4 }], felt: null, when: null }, content, deps);
  assert.equal(unknownTool.helped, null);
  const noFeel = partsFromFixture(fixture, (id) => IDS.includes(id) || (id.startsWith("feel_") && id !== "feel_tired"));
  assert.equal(lib.partStatLines({ helped: null, felt: { month: "2026-07", then: "feel_tired", now: "feel_curious" }, when: null }, noFeel, deps).felt, null);
  // the only numbers are the counts the copy carries
  const out = lib.partStatLines({ helped: [{ toolId: "pause", n: 12 }], felt: { month: "2026-07", then: null, now: "feel_open" }, when: "mornings" }, content, deps);
  assert.deepEqual([out.when, ...out.helped.lines, out.felt.line].join(" ").match(/\d+/g), ["12"]);
});

test("ready: the section needs every line (title, stats, unnamed names, when options)", () => {
  assert.equal(lib.reflectPartsReady(content), true);
  for (const id of IDS) {
    assert.equal(lib.reflectPartsReady(partsFromFixture(fixture, (x) => x !== id && (IDS.includes(x) || x.startsWith("feel_")))), false, id);
  }
  assert.equal(lib.reflectPartsReady(partsFromFixture(fixture)), false, "drafts today: Reflect is exactly as before");
});

test("Reflect: after its own sections, parts on, copy shipped; no hard-coded words, no other numbers", () => {
  const page = read("src/pages/Insights.tsx");
  assert.ok(page.indexOf("<PartsReflect") > page.indexOf("<ToolEffectiveness"), "after the existing sections");
  assert.match(page, /\{data\.parts && data\.parts\.length > 0 && <PartsReflect parts=\{data\.parts\} delay=\{nextDelay\(\)\} \/>\}/);
  const c = read("src/components/insights/PartsReflect.tsx");
  assert.match(c, /if \(!wanted \|\| !content \|\| !reflectPartsReady\(content\)\) return null;/);
  assert.match(c, /const wanted = partsOn && parts\.length > 0;/);
  assert.match(c, /if \(!wanted \|\| content\) return;/, "the parts copy is fetched only for a section that may show");
  const jsx = c.slice(c.indexOf("return (\n    <section"));
  assert.deepEqual([...jsx.matchAll(/>([^<>{}()=;]*[A-Za-z0-9][^<>{}()=;]*)</g)].map((m) => m[1].trim()), [], "every word from the content");
  assert.doesNotMatch(jsx, /\.length\}|\.n\}|stats\.\w+\}/, "no counts but through the copy");
  assert.doesNotMatch(c, /from '[^']*chart|<svg/i, "no chart (PartFigure draws the part)");
  assert.match(c, /<PartFigure shapeSig=\{p\.shapeSig\}/);
  assert.match(c, /partChipLabel\(p, content\)/, "the name, or the unnamed lines");
  // steps that helped: one line between what's helped and how you've felt, only when worded (and ready, above)
  const [helped, steps, felt] = ["{lines.helped && (", "{lines.steps && <p ", "{lines.felt && ("].map((x) => jsx.indexOf(x));
  assert.ok(helped > 0 && helped < steps && steps < felt, "helped, steps, felt");
  // the client mirrors the payload field
  assert.match(read("src/services/neo4j.ts"), /parts\?: PartReflect\[\] \| null;/);
  assert.match(read("functions/src/insights/types.ts"), /parts: PartReflect\[\] \| null;/);
});

test("for Me later: the compute is exported, the handler stays pure", () => {
  const stats = read("functions/src/parts/stats.ts");
  for (const name of ["partStats", "statsByPart", "partsReflect", "STATS_THRESHOLDS"]) assert.match(stats, new RegExp(`export (function|const) ${name}\\b`));
  assert.doesNotMatch(stats, /^import (?!type|\{ PART_WHENS|\{ NON_ANSWER \} from '\.\/keepPlan')/m, "pure: its types and keepPlan's NON_ANSWER only");
  const handler = read("functions/src/insights/handler.ts");
  assert.doesNotMatch(handler, /neo4j|readTx|statsQueries/, "the reads stay in the query layer");
  assert.match(handler, /deps\.parts\(\)/);
  assert.match(read("functions/src/insights/queries.ts"), /return partsReflect\(await readTx\(\(tx\) => readStatsRows\(tx, userId\)\)\);/);
});
