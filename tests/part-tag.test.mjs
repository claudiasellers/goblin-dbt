// "Was this a part you know?" (docs/design/parts.md, "the stronger signal"): the tag row's gate, its
// chips and copy (src/lib/partTag.ts, src/components/spine/PartTagRow.tsx, SessionClose), the hosts that
// declare `parts`, and tagPart's registration (the handler is pinned in functions/test/unit/parts.test.cjs).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture } from "./lib/partsContentFixture.mjs";
import { PARTS_SLOT_WIDTH } from "../scripts/voice-lint.mjs";

const read = (f) => readFileSync(f, "utf8");
const lib = await importTs("src/lib/partTag.ts");
const { REGIONS, REGION_IDS } = await importTs("src/data/bodyFigure.ts");
const { TOOL_CLOSE_KIND } = await importTs("src/lib/spine/close.ts");
const profileTypes = await importTs("src/data/profileTypes.ts");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const TAG_IDS = [...lib.TAG_PROMPTS, ...lib.TAG_OPTIONS, ...lib.UNNAMED_PROMPTS];
/** parts.json as it would be with the row's lines signed off. */
const content = partsFromFixture(fixture, (id) => TAG_IDS.includes(id));

test("copy: the row's lines, the later question's options, and the unnamed names (flow common)", () => {
  const opts = Object.values(fixture.options.tag).flat();
  assert.deepEqual(opts.map((o) => [o.id, o.label]),
    [["tag_new_one", "A new one"], ["tag_skip", "Skip"], ["tag_later_yes", "Yes"], ["tag_later_no", "No thanks"]]);
  assert.equal(fixture.prompts.tag_question.copy, "Was this a part you know?");
  for (const [id, copy] of [["part_unnamed_place", "The one in your {place}"], ["part_unnamed", "One you haven't named"]]) {
    assert.deepEqual([fixture.prompts[id].flow, fixture.prompts[id].step, fixture.prompts[id].copy], ["common", "name", copy], id);
  }
  // {place} fits every place label, lower case.
  for (const id of REGION_IDS) assert.ok(REGIONS[id].label.length <= PARTS_SLOT_WIDTH.place, id);
  assert.equal(Math.max(...REGION_IDS.map((id) => REGIONS[id].label.length)), PARTS_SLOT_WIDTH.place, "the width is the longest label");
  assert.deepEqual(lib.tagRowCopy(content), {
    question: "Was this a part you know?", later: "Want to come back to it later?", newOne: "A new one", skip: "Skip", yes: "Yes", no: "No thanks",
  });
});

test("gate: each condition off, no row", () => {
  const on = { partsOn: true, toolId: "five-senses", thenVsNow: "better", saved: true, content };
  assert.equal(lib.tagRowGate(on), true);
  assert.equal(lib.tagRowGate({ ...on, thenVsNow: "much_better" }), true);
  for (const [k, v] of [["partsOn", false], ["saved", false], ["thenVsNow", "same"], ["thenVsNow", "worse"], ["thenVsNow", null],
    ["toolId", "meet-a-part"], ["toolId", "help-now"], ["toolId", "micro-step"], ["toolId", "pause"], ["content", null]]) {
    assert.equal(lib.tagRowGate({ ...on, [k]: v }), false, `${k} = ${v}`);
  }
  // One line missing (today nothing is signed off): no row.
  for (const id of TAG_IDS) {
    assert.equal(lib.tagRowGate({ ...on, content: partsFromFixture(fixture, (x) => TAG_IDS.includes(x) && x !== id) }), false, id);
  }
  assert.equal(lib.tagRowGate({ ...on, content: partsFromFixture(fixture) }), fixture.prompts.tag_question.reviewStatus === "approved");
});

test("chips: up to four, in the slice's order (most recently visited first); names, else the unnamed lines", () => {
  const part = (id, name = null, firstPlace = null, status = "active") => ({ id, name, firstPlace, status });
  const chips = lib.tagChips([
    { ...part("a", "the one who chases"), shapeSig: [0.1, 0.2, 0.3, 0.4, 0.5] }, part("b", null, "upper_back"), part("c", null, null, "resting"), part("d", "  "), part("e", "fifth"),
  ], content);
  assert.deepEqual(chips, [
    { id: "a", label: "the one who chases", named: true, shapeSig: [0.1, 0.2, 0.3, 0.4, 0.5] },
    { id: "b", label: "The one in your upper back", named: false, shapeSig: null },
    { id: "c", label: "One you haven't named", named: false, shapeSig: null },
    { id: "d", label: "One you haven't named", named: false, shapeSig: null },
  ]);
  assert.equal(lib.partChipLabel(part("x", null, "nowhere"), content), "One you haven't named", "an unknown place");
  assert.equal(lib.partChipLabel(part("x", null, "body"), content), "The one in your whole body");
  assert.deepEqual(lib.tagChips([part("s", "set aside", null, "set_aside")], content), []);
  assert.deepEqual(lib.tagChips([], content), [], "no parts kept: the row renders nothing");
});

test("hosts: exactly the tools whose SessionClose asks then-vs-now, each declaring parts", () => {
  const toolPage = read("src/pages/ToolPage.tsx");
  const hosts = Object.entries(TOOL_CLOSE_KIND)
    .filter(([id, k]) => id !== "meet-a-part" && (k.closeKind === "orienting" || k.closeKind === "regulation_down"))
    .filter(([id]) => {
      const comp = toolPage.match(new RegExp(`'${id}': (\\w+),`))?.[1];
      const file = comp && toolPage.match(new RegExp(`import \\{ ${comp} \\} from '\\./tools/(\\w+)'`))?.[1];
      return file && /<SessionClose\b/.test(read(`src/pages/tools/${file}.tsx`));
    })
    .map(([id]) => id);
  assert.deepEqual([...lib.TAG_ROW_TOOLS], hosts);
  // Meet a part reads `parts` for its own screens (never a host: a part can't be tagged in its own
  // session) and Today for the check-back card's name; every other reader is a host.
  const withParts = Object.entries(profileTypes.PROFILE_NEEDS)
    .filter(([c, n]) => !["meet-a-part", "today"].includes(c) && n.includes("parts")).map(([c]) => c);
  assert.deepEqual(withParts, hosts, "PROFILE_NEEDS parts: the hosts, Meet a part and Today, nothing else");
});

test("the row: no hard-coded words, after the close is saved, fire-and-forget writes", () => {
  const row = read("src/components/spine/PartTagRow.tsx");
  const jsx = row.slice(row.indexOf("return ("));
  // JSX text: anything between a tag's ">" and the next "<" that isn't an expression.
  assert.deepEqual([...jsx.matchAll(/>([^<>{}()=;]*[A-Za-z][^<>{}()=;]*)</g)].map((m) => m[1].trim()), [], "every word comes from the content");
  assert.match(row, /tagPart\(\{ id: newId\(\), partId, toolSessionId \}\)\.catch/);
  assert.match(row, /queuePartCandidate\(\{ id: newId\(\), origin: 'new_one', moveIds: \[\], toolSessionId \}\)\.catch/);
  assert.match(row, /if \(yes\) queuePartCandidate/, "only Yes writes");
  assert.match(row, /useProfileContext\(toolId\)/, "the host tool's own needs");
  assert.match(row, /<PartFigure shapeSig=\{c\.shapeSig\} size=\{28\} \/>/, "each part's own figure beside its name");
  assert.doesNotMatch(row, /await /, "never blocks leaving");
  const close = read("src/components/spine/SessionClose.tsx");
  assert.match(close, /session\.close\(input\)\.then\(\(r\) => \{ if \(r\) setSaved\(true\); \}/);
  assert.match(close, /<PartTagRow toolId=\{toolId\} toolSessionId=\{session\.id\} content=\{parts\} \/>/);
  assert.match(close, /if \(!wantsRow \|\| parts\) return;/, "parts content read only for a row that may show");
});

test("tagPart: registered, signed in, wrapped; PartTag a log label with its constraints, exported and deleted", async () => {
  assert.match(read("functions/src/index.ts"), /^export \{ tagPart \} from '\.\/parts';$/m);
  assert.ok("tagPart" in JSON.parse(read("functions/test/fixtures/endpoints.json")));
  const matrix = read("functions/test/unit/auth-matrix.test.cjs");
  assert.ok(matrix.slice(matrix.indexOf("const AUTHED"), matrix.indexOf("const PUBLIC")).includes("'tagPart'"));
  assert.match(read("src/services/parts.ts"), /httpsCallable<TagPartRequest, TagPartResponse>\(functions, 'tagPart'\)/);
  const { USER_DATA } = await importTs("functions/src/userdata/layers.ts");
  assert.deepEqual(USER_DATA.PartTag, { layer: "log", rel: "HAS_PART_TAG", exportAs: "partTags" });
  const ddl = read("schema/constraints.cypher");
  assert.match(ddl, /CREATE CONSTRAINT part_tag_key IF NOT EXISTS FOR \(n:PartTag\) REQUIRE n\.key IS UNIQUE;/);
  assert.match(ddl, /CREATE CONSTRAINT part_tag_tagged_key IF NOT EXISTS FOR \(n:PartTag\) REQUIRE n\.taggedKey IS UNIQUE;/, "one tag per session");
  assert.match(read("functions/src/parts/delete.ts"), /'PartTag'/);
});
