// Reflect's trails (docs/design/parts.md, Rules → rule D; The offer card's "It's how things go"; built off):
// rule D's batch ("Was this {name}?") and the plain patterns. The copy (drafts), each gate's constant, the
// statement and rows (labels only, the part's own name the one word of theirs), the request, the plain
// statement (no parts language), the component's seams (CrisisBanner alongside a safety part; × labelled),
// Reflect hosting it, and the client mirror of the callables' types.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture, withoutIds } from "./lib/partsContentFixture.mjs";

const read = (f) => readFileSync(f, "utf8");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const shipped = JSON.parse(read("src/data/content/parts.json")).content;
const lib = await importTs("src/lib/knownPartReview.ts");
const all = partsFromFixture(fixture, () => true);
const reviewIds = [...lib.KNOWN_PART_REVIEW_REQUIRED.prompts, ...lib.KNOWN_PART_REVIEW_REQUIRED.options];
const patternIds = [...lib.PLAIN_PATTERNS_REQUIRED.prompts, ...lib.PLAIN_PATTERNS_REQUIRED.options];
const only = (ids) => partsFromFixture(fixture, (id) => ids.includes(id));

test("copy pins: the row answers, Done / Not now, the unnamed question, the heading and the ×, signed off 17 Oct (Claudia: ship it all)", () => {
  assert.deepEqual(fixture.options.review.row.map((o) => [o.id, o.label]), [["review_yes", "Yes"], ["review_no", "No"], ["review_not_sure", "Not sure"]]);
  assert.deepEqual(fixture.options.review.block.map((o) => [o.id, o.label, o.branch]), [["review_done", "Done", "end"], ["review_not_now", "Not now", "end"]]);
  assert.deepEqual([fixture.prompts.review_noname.flow, fixture.prompts.review_noname.copy], ["review", "Was this that part?"]);
  assert.deepEqual([fixture.prompts.patterns_title.flow, fixture.prompts.patterns_title.step, fixture.prompts.patterns_title.copy], ["reflect", "patterns", "How things tend to go"]);
  assert.deepEqual(fixture.options.reflect.patterns.map((o) => [o.id, o.label]), [["patterns_remove", "Remove"]]);
  for (const id of ["review_noname", "patterns_title"]) assert.equal(fixture.prompts[id].reviewStatus, "approved", id);
  for (const o of [...fixture.options.review.row, ...fixture.options.review.block, ...fixture.options.reflect.patterns]) assert.equal(o.reviewStatus, "approved", o.id);
  assert.equal(shipped.prompts.review_noname.copy, "Was this that part?");
  assert.equal(shipped.prompts.patterns_title.copy, "How things tend to go");
  assert.equal(lib.knownPartReviewReady(shipped), true, "the shipped file has every line");
  assert.equal(lib.plainPatternsReady(shipped), true);
  for (const id of reviewIds) assert.equal(lib.knownPartReviewReady(withoutIds(shipped, id)), false, `shipped file without ${id}`);
  for (const id of patternIds) assert.equal(lib.plainPatternsReady(withoutIds(shipped, id)), false, `shipped file without ${id}`);
  // No parts language in the plain heading.
  assert.doesNotMatch(fixture.prompts.patterns_title.copy, /\bparts?\b/i);
});

test("the gates: every id each needs; any one missing hides it", () => {
  assert.equal(lib.knownPartReviewReady(only(reviewIds)), true);
  assert.equal(lib.plainPatternsReady(only(patternIds)), true);
  for (const id of reviewIds) assert.equal(lib.knownPartReviewReady(only(reviewIds.filter((x) => x !== id))), false, id);
  for (const id of patternIds) assert.equal(lib.plainPatternsReady(only(patternIds.filter((x) => x !== id))), false, id);
  assert.equal(lib.knownPartReviewReady(null), false);
  assert.match(read("scripts/parts/review.mjs"), /export \{ KNOWN_PART_REVIEW_REQUIRED, PLAIN_PATTERNS_REQUIRED \} from '\.\/src\/lib\/knownPartReview';/);
});

test("the block's statement: the template with the part's name; an unnamed part gets its chip label and review_noname", () => {
  const b = { template: "Was this {name}?", name: "Wren", firstPlace: "chest" };
  assert.deepEqual(lib.knownPartStatement(b, all), { heading: "Wren", question: "Was this Wren?" });
  assert.deepEqual(lib.knownPartStatement({ ...b, name: "  " }, all), { heading: "The one in your chest", question: "Was this that part?" });
  assert.deepEqual(lib.knownPartStatement({ ...b, name: null, firstPlace: null }, all), { heading: "One you haven't named", question: "Was this that part?" });
  assert.equal(lib.knownPartStatement({ ...b, template: "Was this {name} when {context}?" }, all), null, "a slot it can't fill");
  assert.equal(lib.knownPartStatement({ ...b, name: null }, only(["part_unnamed"])), null, "no unnamed question shipped");
});

test("rows and the request: labels by episode; only Yes and No are sent; Done or Not now", () => {
  const block = {
    partId: "p", rows: [
      { episodeId: "e1", at: "2026-09-14T09:00:00Z", toolIds: ["nope", "recovering-from-invalidation"], context: "someone pulls away", sources: ["Hide away"] },
      { episodeId: "e2", at: "2026-09-18T09:00:00Z", toolIds: ["nope"], context: null, sources: [] },
      { episodeId: "e3", at: "2026-09-20T09:00:00Z", toolIds: ["checkin"], context: null, sources: [] },
    ],
  };
  const rows = lib.reviewRows(block, "en-GB");
  assert.deepEqual(rows.map((r) => [r.key, r.date, r.tool, r.context, r.source]), [
    ["e1", "Mon 14 Sept", "Recover from a hurtful moment", "someone pulls away", "Hide away"],
    ["e2", "Fri 18 Sept", null, null, null],
    ["e3", "Sun 20 Sept", rows[2].tool, null, null],
  ]);
  assert.deepEqual(lib.reviewRequest("id1", block, { e1: "yes", e2: "not_sure", e3: "no" }, "done"),
    { id: "id1", partId: "p", close: "done", rows: [{ episodeId: "e1", answer: "yes" }, { episodeId: "e3", answer: "no" }] });
  assert.deepEqual(lib.reviewRequest("id1", block, {}, "not_now").rows, []);
  const copy = lib.knownPartReviewCopy(all);
  assert.deepEqual(copy.answers.map((a) => [a.label, a.answer]), [["Yes", "yes"], ["No", "no"], ["Not sure", "not_sure"]]);
  assert.deepEqual([copy.done, copy.notNow], ["Done", "Not now"]);
});

test("a plain pattern: the trail's own statement, every slot or nothing, never rule D", () => {
  const p = { offerId: "o", shape: "A", template: "When {context}, the pull is to {pull}.", pulls: ["hide"], context: "someone pulls away" };
  assert.equal(lib.plainPatternStatement(p), "When someone pulls away, the pull is to hide.");
  assert.equal(lib.plainPatternStatement({ ...p, context: null }), null);
  assert.equal(lib.plainPatternStatement({ ...p, template: "Was this {name}?" }), null);
  assert.deepEqual(lib.plainPatternsCopy(all), { title: "How things tend to go", remove: "Remove" });
});

test("the component: crisis resources alongside a safety part, the × labelled, one batch id per block; Reflect hosts it", () => {
  const c = read("src/components/insights/TrailsReflect.tsx");
  assert.match(c, /\{block\.safety && <div className="mt-3"><CrisisBanner compact \/><\/div>\}/);
  assert.match(c, /aria-label=\{`\$\{copy\.remove\}: \$\{line\}`\}/);
  assert.match(c, /const batchId = useRef<string>\(crypto\.randomUUID\(\)\);/);
  assert.match(c, /aria-pressed=\{on\}/);
  assert.match(c, /knownPartReviewReady\(content\)/);
  assert.match(c, /plainPatternsReady\(content\)/);
  assert.match(read("src/pages/Insights.tsx"), /<TrailsReflect delay=\{nextDelay\(\)\} \/>/);
});

test("the client mirror: the callables' types appear in src/data/partsTypes.ts; the services call them by name", () => {
  const mirror = read("src/data/partsTypes.ts");
  for (const s of [
    "export type KnownPartRowAnswer = 'yes' | 'no' | 'not_sure';",
    "export type KnownPartReviewClose = 'done' | 'not_now';",
    "export interface RemoveTrailPatternRequest { offerId: string }",
    "export interface GetReflectTrailsResponse {",
    "export interface AnswerKnownPartReviewRequest {",
  ]) {
    assert.ok(mirror.includes(s), s);
    assert.ok(read("functions/src/parts/offers/types.ts").includes(s), `server: ${s}`);
  }
  const svc = read("src/services/parts.ts");
  for (const n of ["getReflectTrails", "answerKnownPartReview", "removeTrailPattern"]) {
    assert.match(svc, new RegExp(`httpsCallable<.+>\\(functions, '${n}'\\)`), n);
    assert.match(read("functions/src/index.ts"), new RegExp(`\\b${n}\\b`), n);
  }
});
