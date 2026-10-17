// The parts sign-off pack (scripts/parts/review.mjs): each surface's required ids come from the constant its
// own gate checks (so the pack can't drift from the code), the script runs, and every id any surface
// requires is in the document with the fixture's text (so a new line can't skip review).
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));

/** [file, gate, constant]: the gate's own body checks exactly that constant with surfaceReady. */
const GATES = [
  ["src/lib/unblendLine.ts", "function unblendLine", "surfaceReady(content, UNBLEND_REQUIRED)"],
  ["src/lib/angryPart.ts", "function angryReady", "surfaceReady(content, angryRequired(partsOn))"],
  ["src/lib/angryPart.ts", "function angryLaterCopy", "surfaceReady(content, ANGRY_LATER_REQUIRED)"],
  ["src/lib/meetAPartSave.ts", "function meetReady", "surfaceReady(content, meetRequired(opts))"],
  ["src/lib/meetAPartSave.ts", "function meetReady", "MEET_OPTION_STEPS.every("],
  ["src/lib/meetAPartSave.ts", "function offerCheckback", "surfaceReady(o.content, CLOSE_CHECKBACK_REQUIRED)"],
  ["src/lib/meetAPartSave.ts", "const frontReady", "surfaceReady(content, MEET_FRONT_REQUIRED)"],
  ["src/lib/partCheckback.ts", "function checkbackReady", "surfaceReady(content, PART_CHECKBACK_REQUIRED)"],
  ["src/lib/partTag.ts", "function tagRowGate", "surfaceReady(g.content, TAG_ROW_REQUIRED)"],
  ["src/lib/partShape.ts", "function shapeOfferReady", "surfaceReady(g.content, TAG_SHAPE_REQUIRED)"],
  ["src/lib/partsOfMe.ts", "function partsOfMeCopy", "surfaceReady(content, PARTS_OF_ME_REQUIRED)"],
  ["src/lib/partsOfMe.ts", "function partRevisitCopy", "surfaceReady(content, PART_REVISIT_REQUIRED)"],
  ["src/lib/partsOfMe.ts", "function partCandidateCopy", "surfaceReady(content, PART_CANDIDATE_REQUIRED)"],
  ["src/lib/partStats.ts", "const statsReady", "surfaceReady(content, STATS_REQUIRED)"],
  ["src/lib/partStats.ts", "const reflectPartsReady", "surfaceReady(content, REFLECT_REQUIRED)"],
  ["src/lib/partStats.ts", "const reflectFeelReady", "surfaceReady(content, REFLECT_FEEL_REQUIRED)"],
  ["src/lib/partsSettings.ts", "function partsSettingsCopy", "surfaceReady(content, PARTS_SETTINGS_REQUIRED)"],
  ["src/components/parts/PartsSettings.tsx", "useEffect(() => {", "surfaceReady(c, SETTINGS_LINK_REQUIRED)"],
  ["src/lib/copeAhead.ts", "function copeReady", "surfaceReady(content, COPE_REQUIRED)"],
  ["src/lib/debriefWho.ts", "function debriefWhoReady", "surfaceReady(content, DEBRIEF_WHO_REQUIRED)"],
  ["src/lib/psAmbivalence.ts", "function psLaterCopy", "surfaceReady(content, PS_LATER_REQUIRED)"],
  ["src/lib/oaGoalLine.ts", "function oaGoalLine", "surfaceReady(content, OA_GOAL_LINE_REQUIRED)"],
  ["src/lib/knownPartReview.ts", "function knownPartReviewReady", "surfaceReady(content, KNOWN_PART_REVIEW_REQUIRED)"],
  ["src/lib/knownPartReview.ts", "function plainPatternsReady", "surfaceReady(content, PLAIN_PATTERNS_REQUIRED)"],
  ["src/lib/den.ts", "function denCopy", "surfaceReady(content, DEN_REQUIRED)"],
  ["src/lib/wiseMindParts.ts", "const wiseMindPartsReady", "surfaceReady(content, WISE_MIND_PARTS_REQUIRED)"],
  ["src/lib/partStory.ts", "function partStoryCopy", "surfaceReady(content, PART_STORY_REQUIRED)"],
  ["src/lib/sayToPart.ts", "function sayCopy", "surfaceReady(content, SAY_TO_PART_REQUIRED)"],
  ["src/lib/sayToPart.ts", "const sayStoryLine", "surfaceReady(content, SAY_STORY_REQUIRED)"],
];

/** From the declaration to the next top-level declaration. */
function body(src, decl) {
  const i = src.indexOf(decl);
  assert.ok(i >= 0, `${decl} not found`);
  const next = src.slice(i + decl.length).search(/\n(export |function |const )/);
  return src.slice(i, next < 0 ? undefined : i + decl.length + next);
}

test("each surface's gate checks its own exported constant", () => {
  for (const [file, decl, call] of GATES) assert.ok(body(read(file), decl).includes(call), `${file} ${decl}: ${call}`);
  // No gate checks a list of its own: every flowReady goes through a surface's constant.
  for (const f of readdirSync("src/lib").filter((x) => x.endsWith(".ts") && x !== "partsContent.ts")) {
    assert.doesNotMatch(read(`src/lib/${f}`), /\bflowReady\(/, `src/lib/${f}: use surfaceReady with an exported *_REQUIRED`);
  }
  assert.match(read("src/lib/partsContent.ts"), /export const surfaceReady = \(content: PartsContent, ids: SurfaceIds\): boolean => flowReady\(content, ids\.prompts, ids\.options\);/);
});

test("the pack reads every surface constant there is", () => {
  const review = read("scripts/parts/review.mjs");
  const declared = readdirSync("src/lib").filter((x) => x.endsWith(".ts")).flatMap((f) =>
    [...read(`src/lib/${f}`).matchAll(/export const (\w+_REQUIRED|\w+Required)\b/g)].map((m) => m[1]));
  assert.ok(declared.length >= 15);
  for (const name of declared) assert.match(review, new RegExp(`\\b${name}\\b`), `${name} isn't in the review`);
});

test("the document: every id a surface requires, with the fixture's text, its status and lint scope", async () => {
  const doc = execFileSync("node", ["scripts/parts/review.mjs"], { encoding: "utf8" });
  const L = {
    ...(await importTs("src/lib/unblendLine.ts")), ...(await importTs("src/lib/angryPart.ts")), ...(await importTs("src/lib/meetAPartSave.ts")),
    ...(await importTs("src/lib/partCheckback.ts")), ...(await importTs("src/lib/partTag.ts")), ...(await importTs("src/lib/partsOfMe.ts")),
    ...(await importTs("src/lib/partStats.ts")), ...(await importTs("src/lib/partsSettings.ts")), ...(await importTs("src/lib/copeAhead.ts")),
    ...(await importTs("src/lib/psAmbivalence.ts")), ...(await importTs("src/lib/debriefWho.ts")),
    ...(await importTs("src/lib/oaGoalLine.ts")), ...(await importTs("src/lib/partShape.ts")),
    ...(await importTs("src/lib/knownPartReview.ts")), ...(await importTs("src/lib/den.ts")), ...(await importTs("src/lib/partStory.ts")),
    ...(await importTs("src/lib/wiseMindParts.ts")),
  };
  const sets = [
    L.UNBLEND_REQUIRED, L.angryRequired(true), L.angryRequired(false), L.ANGRY_LATER_REQUIRED, L.meetRequired({ paused: true }),
    L.CLOSE_CHECKBACK_REQUIRED, L.MEET_FRONT_REQUIRED, L.PART_CHECKBACK_REQUIRED, L.TAG_ROW_REQUIRED, L.PARTS_OF_ME_REQUIRED, L.PART_REVISIT_REQUIRED,
    L.PART_CANDIDATE_REQUIRED, L.STATS_REQUIRED, L.REFLECT_REQUIRED, L.REFLECT_FEEL_REQUIRED, L.PARTS_SETTINGS_REQUIRED, L.SETTINGS_LINK_REQUIRED, L.COPE_REQUIRED, L.PS_LATER_REQUIRED,
    L.DEBRIEF_WHO_REQUIRED, L.OA_GOAL_LINE_REQUIRED, L.TAG_SHAPE_REQUIRED, L.KNOWN_PART_REVIEW_REQUIRED, L.PLAIN_PATTERNS_REQUIRED, L.DEN_REQUIRED, L.PART_STORY_REQUIRED,
    L.WISE_MIND_PARTS_REQUIRED,
  ];
  const options = Object.values(fixture.options).flatMap((steps) => Object.values(steps).flat());
  const textOf = (id) => fixture.prompts[id]?.copy ?? options.find((o) => o.id === id)?.label;
  const ids = [...new Set(sets.flatMap((s) => [...s.prompts, ...s.options]))];
  assert.ok(ids.length > 150);
  for (const id of ids) {
    assert.ok(doc.includes(`\`${id}\``), `${id} is missing from the pack`);
    const text = textOf(id);
    assert.ok(text !== undefined, `${id}: not in the fixture`);
    assert.ok(doc.includes(text.replace(/\|/g, "\\|")), `${id}: its text "${text}" isn't in the pack`);
  }
  // Meet a part's choice steps: every option in them is listed.
  for (const [flow, step] of L.MEET_OPTION_STEPS) for (const o of fixture.options[flow][step]) assert.ok(doc.includes(`\`${o.id}\``), o.id);
  // The counts, the vocabulary and the numbers.
  // Every line there is: the fixture's prompts and options, plus the keepsake (its own list in content.py).
  const keepsake = [...read("scripts/parts/content.py").matchAll(/^\s+\("(keepsake_\w+)",/gm)].map((m) => m[1]);
  assert.ok(keepsake.length > 0);
  for (const id of [...Object.keys(fixture.prompts), ...options.map((o) => o.id), ...keepsake]) assert.ok(doc.includes(`\`${id}\``), `${id}: never shown for review`);
  const total = Object.keys(fixture.prompts).length + options.length + keepsake.length;
  assert.match(doc, new RegExp(`\\*\\*${total} lines in all: 0 signed off, ${total} drafts`));
  for (const m of fixture.moves) assert.ok(doc.includes(`\`${m.id}\``), m.id);
  for (const h of fixture.hurts) assert.ok(doc.includes(`| \`${h.id}\` | ${h.label} | ${h.feltPhrase} | ${h.matters} |`), h.id);
  for (const ev of Object.keys(fixture.canTouch)) assert.ok(doc.includes(`\`${ev}\``), ev);
  for (const [k, v] of Object.entries(fixture.policy)) if (!["id", "reviewStatus", "version", "pending"].includes(k)) assert.ok(doc.includes(`| \`${k}\` | ${v} |`), k);
  for (const h of ["## How sign-off works", "## Surfaces", "## The vocabulary", "## The numbers (PartsPolicy)"]) assert.ok(doc.includes(h), h);
  const order = ["The unblend line", "The angry-part card", "Meet a part", "The check-back card", "The tag row", "Parts of me", "Settings", "Reflect", "DEAR MAN", "Problem Solve", "Do the Opposite"]
    .map((t) => doc.search(new RegExp(`^### \\d+\\. ${t}$`, "m")));
  assert.ok(order.every((i, n) => i > 0 && (n === 0 || i > order[n - 1])), "most exposed first");
  assert.match(doc, /\| `part_unnamed` \| One you haven't named \|.*also in .*Reflect/, "shared lines are marked");
  assert.match(doc, /\| `angry_unblend` \| .* \| `angry_unblend_plain`: /, "the plain twin beside its line");
});
