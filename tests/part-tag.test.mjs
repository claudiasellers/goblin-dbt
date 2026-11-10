// "Was this a part you know?" (docs/design/parts.md, "the stronger signal"): the tag row's gate, its
// chips and copy (src/lib/partTag.ts, src/components/spine/PartTagRow.tsx, SessionClose), the hosts that
// declare `parts`, and tagPart's registration (the handler is pinned in functions/test/unit/parts.test.cjs).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture, withoutIds } from "./lib/partsContentFixture.mjs";
import { PARTS_SLOT_WIDTH } from "../scripts/voice-lint.mjs";

const read = (f) => readFileSync(f, "utf8");
const lib = await importTs("src/lib/partTag.ts");
const { REGIONS, REGION_IDS } = await importTs("src/data/bodyFigure.ts");
const { TOOL_CLOSE_KIND, dirFor } = await importTs("src/lib/spine/close.ts");
const profileTypes = await importTs("src/data/profileTypes.ts");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const TAG_IDS = [...lib.TAG_PROMPTS, ...lib.TAG_OPTIONS, ...lib.UNNAMED_PROMPTS];
/** parts.json as it would be with the row's lines signed off. */
const content = partsFromFixture(fixture, (id) => TAG_IDS.includes(id));

test("copy: the row's lines, the later question's options, and the unnamed names (flow common)", () => {
  // The row's own steps (step `shape` is Find the feeling's "Use this shape for {name}?": tests/part-shape.test.mjs).
  const opts = [...fixture.options.tag.tag, ...fixture.options.tag.new];
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
    ["toolId", "meet-a-part"], ["toolId", "help-now"], ["toolId", "micro-step"], ["toolId", "problem-solve"], ["content", null]]) {
    assert.equal(lib.tagRowGate({ ...on, [k]: v }), false, `${k} = ${v}`);
  }
  // An urge close: Held off only.
  const urge = { ...on, toolId: "pause", thenVsNow: null, actedOnUrge: "no" };
  assert.equal(lib.tagRowGate(urge), true);
  assert.equal(lib.tagRowGate({ ...urge, toolId: "urge-surfing" }), true);
  for (const a of ["partly", "yes", "not_yet", null, undefined]) assert.equal(lib.tagRowGate({ ...urge, actedOnUrge: a }), false, `actedOnUrge ${a}`);
  assert.equal(lib.tagRowGate({ ...urge, toolId: "meet-a-part" }), false);
  assert.equal(lib.tagRowGate({ ...urge, saved: false }), false);
  assert.deepEqual([...lib.TAG_URGE_CLOSES], ["no"]);
  // One line missing: no row.
  for (const id of TAG_IDS) {
    assert.equal(lib.tagRowGate({ ...on, content: partsFromFixture(fixture, (x) => TAG_IDS.includes(x) && x !== id) }), false, id);
  }
  // Signed off 17 Oct (Claudia: ship it all): the shipped file shows the row; any one line out of it, none.
  const shipped = JSON.parse(read("src/data/content/parts.json")).content;
  assert.equal(lib.tagRowGate({ ...on, content: shipped }), true, "the shipped file");
  for (const id of TAG_IDS) assert.equal(lib.tagRowGate({ ...on, content: withoutIds(shipped, id) }), false, `shipped file without ${id}`);
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

/** A tool's page file, from src/pages/ToolPage.tsx's toolComponents map. */
const toolPage = read("src/pages/ToolPage.tsx");
const playerTools = readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8");
const pageOf = (id) => {
  // A skill on the runtime (docs/design/skill-runtime.md; the switch, playerTools.ts) has no screens of its own:
  // the player closes it.
  if (playerTools.includes(`'${id}': '`)) return "src/components/skillPlayer/SkillPlayer.tsx";
  const comp = toolPage.match(new RegExp(`'${id}': (\\w+),`))?.[1];
  const file = comp && (toolPage.match(new RegExp(`import \\{ ${comp} \\} from '\\./tools/(\\w+)'`))?.[1]
    ?? toolPage.match(new RegExp(`const Lazy${comp} = lazy\\(\\(\\) => import\\('\\./tools/(\\w+)'\\)`))?.[1]);
  if (!file) return null;
  return `src/pages/tools/${file}.tsx`;
};
/**
 * Tools that may never show the row although their close asks then-vs-now. Wise mind: its parts form
 * tags the parts the person placed itself (PartTag source `wise_mind`, docs/design/wise-mind.md), so a
 * close tag after it would ask the same thing twice. Two pulls: the visit is about two parts already.
 */
const NEVER_HOSTS = ["meet-a-part", "two-pulls", "wise-mind"];

test("hosts: every tool whose close asks then-vs-now or about the urge, minus Meet a part, Two pulls and Wise mind, each declaring parts", () => {
  // Derived from the close kinds, so a new tool with a then-vs-now or an urge close joins (or fails here).
  const asks = Object.entries(TOOL_CLOSE_KIND)
    .filter(([, k]) => dirFor(k.closeKind) !== null || k.closeKind === "urge").map(([id]) => id);
  const hosts = asks.filter((id) => !NEVER_HOSTS.includes(id));
  assert.deepEqual([...lib.TAG_ROW_TOOLS], hosts);
  assert.deepEqual(hosts, ["cool-down", "five-senses", "pause", "urge-surfing", "find-the-feeling", "check-the-facts", "fast"], "the survey (Oct 2026), plus Check the Facts and Keep your self-respect (Nov 2026)");
  // Every page that closes with a then-vs-now is a host or never one (a tool recording it by hand
  // without a then-vs-now close kind would fail here).
  for (const id of Object.keys(TOOL_CLOSE_KIND)) {
    const page = pageOf(id);
    if (!page) continue;
    const src = read(page);
    const kind = TOOL_CLOSE_KIND[id].closeKind;
    if (/\.close\(\{[^}]*(thenVsNow|actedOnUrge)/.test(src) || /<SessionClose\b/.test(src) && (dirFor(kind) || kind === "urge")) {
      assert.ok(hosts.includes(id) || NEVER_HOSTS.includes(id), `${id} records then-vs-now but shows no tag row`);
    }
  }
  // Meet a part and Two pulls read `parts` for their own screens, Today for the check-back card's name, DEAR MAN
  // for its cope ahead ("Who might show up in this conversation?"), Cope Ahead for the same step (reused as
  // is) and Wise mind for its step back's room; every other reader is a host, and every host reads it.
  const withParts = Object.entries(profileTypes.PROFILE_NEEDS)
    .filter(([c, n]) => !["meet-a-part", "two-pulls", "today", "dear-man", "cope-ahead", "wise-mind"].includes(c) && n.includes("parts")).map(([c]) => c);
  assert.deepEqual(withParts.sort(), [...hosts].sort(), "PROFILE_NEEDS parts: the hosts, Meet a part, Two pulls, Today, DEAR MAN, Cope Ahead and Wise mind, nothing else");
});

test("each host mounts PartTagSlot under its saved close; the slot is the only gate", () => {
  for (const id of lib.TAG_ROW_TOOLS) {
    const src = read(pageOf(id));
    const viaClose = /<SessionClose\b/.test(src) && !/<SessionClose kind=/.test(src);
    const own = src.includes(`<PartTagSlot toolId="${id}" toolSessionId={`);
    assert.ok(viaClose !== own, `${id}: the row through SessionClose or its own close, exactly one`);
    if (own) {
      // Saved only when the close call resolves with a session (tagPart refuses an open one).
      assert.match(src, /\.then\(\(r\) => \{ if \(r\) setCloseSaved\(true\); \}/, id);
      assert.match(src, /saved=\{closeSaved\}/, id);
    }
  }
  const close = read("src/components/spine/SessionClose.tsx");
  assert.match(close, /session\.close\(input\)\.then\(\(r\) => \{ if \(r\) setSaved\(true\); \}/);
  assert.match(close, /<PartTagSlot toolId=\{session\.toolId\} toolSessionId=\{session\.id\} thenVsNow=\{closeAnswer\} actedOnUrge=\{closeActed\} saved=\{saved\} \/>/);
  assert.match(close, /actedOnUrge: choiceId as ActedOnUrge \};\n\s+setCloseActed\(choiceId as ActedOnUrge\);/);
  const slot = read("src/components/spine/PartTagSlot.tsx");
  assert.match(slot, /if \(!tagRowGate\(\{ partsOn, toolId, thenVsNow, actedOnUrge, saved, content: parts \}\)\) return null;/);
  assert.match(slot, /if \(!wantsRow \|\| parts\) return;/, "parts content read only for a row that may show");
  // Nothing else mounts the row or decides its gate.
  for (const f of ["src/components/spine/SessionClose.tsx", ...lib.TAG_ROW_TOOLS.map(pageOf)]) {
    const src = read(f);
    assert.doesNotMatch(src, /<PartTagRow\b/, f);
    assert.doesNotMatch(src, /tagRowGate\(/, f);
  }
  // Cool Down's Quieter is its one better answer; FTF's quieter / much map to better / much_better.
  assert.match(read(pageOf("cool-down")), /\{ id: 'quieter', label: 'Quieter', thenVsNow: 'better' \}/);
});

test("the row: no hard-coded words, after the close is saved, fire-and-forget writes", () => {
  const row = read("src/components/spine/PartTagRow.tsx");
  const jsx = row.slice(row.indexOf("return ("));
  // JSX text: anything between a tag's ">" and the next "<" that isn't an expression.
  assert.deepEqual([...jsx.matchAll(/>([^<>{}()=;]*[A-Za-z][^<>{}()=;]*)</g)].map((m) => m[1].trim()), [], "every word comes from the content");
  assert.match(row, /const req = debrief \? debriefTag\(newId\(\), c\.id, toolSessionId, 'yes'\) : \{ id: newId\(\), partId: c\.id, toolSessionId \};\n\s+tagPart\(req\)\.catch/,
    "a close tag by default; DEAR MAN's debrief tags its own source");
  assert.match(row, /queuePartCandidate\(\{ id: newId\(\), origin: 'new_one', moveIds: \[\], toolSessionId \}\)\.catch/);
  assert.match(row, /if \(yes\) queuePartCandidate/, "only Yes writes");
  assert.match(row, /useProfileContext\(toolId\)/, "the host tool's own needs");
  assert.match(row, /<PartFigure shapeSig=\{c\.shapeSig\} size=\{28\} \/>/, "each part's own figure beside its name");
  assert.doesNotMatch(row, /await /, "never blocks leaving");
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
