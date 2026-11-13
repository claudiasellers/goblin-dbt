// Words everywhere, the read half (ER-10 part 3; docs/design/emotion-guide.md, *Words everywhere*): own words first in
// the check-in's word list and Find the feeling's offers (the `ownWords` slice, ordering only), and the feeling card as
// a quiet link after naming (on tap, never a screen before help; not beside a crisis banner). Claudia via the
// coordinator, 13 Nov: the recommended option for both.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import { importTs } from "./lib/importTs.mjs";

const out = join(tmpdir(), `words-everywhere-${process.pid}`);
mkdirSync(out, { recursive: true });
function emit(path, name) {
  const js = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  writeFileSync(join(out, `${name}.mjs`), js);
}
emit("src/lib/findTheFeeling.ts", "findTheFeeling");
emit("src/lib/findTheFeelingFlow.ts", "findTheFeelingFlow");
const ftf = await import(join(out, "findTheFeeling.mjs"));
const flowLib = await import(join(out, "findTheFeelingFlow.mjs"));
const square = await importTs("src/lib/feelingSquare.ts");
const guide = await importTs("src/lib/emotionGuide.ts");
const slices = await importTs("functions/src/profile/slices.ts");
const types = await importTs("functions/src/profile/types.ts");

const content = JSON.parse(readFileSync("tests/fixtures/find-the-feeling-content.json", "utf8"));
const byId = Object.fromEntries(content.families.flatMap((f) => f.words).map((w) => [w.emotionId, w]));

test("the ownWords slice: FOUND_WORD only (no log node), most used first, nothing under five, at most twelve", () => {
  const q = slices.SLICE_QUERIES.ownWords;
  assert.match(q, /^MATCH \(:User \{id: \$uid\}\)-\[w:FOUND_WORD\]->\(e:Emotion\)/);
  assert.match(q, /ORDER BY n DESC, lastAt DESC/);
  assert.match(q, /CASE WHEN size\(ids\) >= 5 THEN ids\[0\.\.12\] ELSE \[\] END AS ids/);
  assert.equal(slices.OWN_WORDS_MIN, 5, "the PRD's *once they have five*");
  assert.doesNotMatch(q, /:LogRecord\b|:CheckIn\b|:ToolSession\b|FOUND\]/, "the aggregate edge, never the records or their FOUND edges");
  assert.match(q, /WHERE coalesce\(e\.safetyScreen, false\) = false/, "a safety-screen word is never moved up");
  assert.deepEqual([...types.PROFILE_NEEDS.checkin], ["patterns", "ownWords"]);
  assert.deepEqual([...types.PROFILE_NEEDS["find-the-feeling"]], ["name", "parts", "ownWords"]);
  for (const [consumer, needs] of Object.entries(types.PROFILE_NEEDS)) {
    if (!["checkin", "find-the-feeling"].includes(consumer)) assert.ok(!needs.includes("ownWords"), `${consumer} reads ownWords`);
  }
});

test("the check-in's word list: up to three near own words lead, nearest first; far ones stay put; none is a no-op", () => {
  const ranked = square.wordsNear({ x: 0.85, y: 0.85 });
  const ids = ranked.map((e) => e.id);
  const far = ids[ids.length - 1];
  const got = square.ownWordsFirst(ranked, [far, ids[9], ids[3]]).map((e) => e.id);
  assert.deepEqual(got.slice(0, 2), [ids[3], ids[9]], "near own words first, nearest first");
  assert.equal(got.length, ids.length);
  assert.equal(got.indexOf(far), ids.indexOf(far), "an own word far from the touch keeps its place: the square decides");
  assert.deepEqual(got.slice(2), ids.filter((x) => ![ids[3], ids[9]].includes(x)), "the rest keep their distance order");
  const many = square.ownWordsFirst(ranked, [ids[12], ids[10], ids[8], ids[6], ids[4]]).map((e) => e.id);
  assert.deepEqual(many.slice(0, 4), [ids[8], ids[10], ids[12], ids[0]], "the three most used lead, then the nearest word");
  assert.deepEqual(square.ownWordsFirst(ranked, []).map((e) => e.id), ids);
  assert.equal(square.OWN_WORDS_WINDOW, 16, "two pages of the word list");
  assert.equal(square.OWN_WORDS_LEAD, 3);
  const pick = readFileSync("src/components/checkin/WordPick.tsx", "utf8");
  assert.match(pick, /const \[own\] = useState\(ownWords\);/, "taken when the list opens: a late slice never reshuffles");
  assert.match(pick, /ownWordsFirst\(wordsNear\(point\), own\)/);
  const checkInSrc = readFileSync("src/pages/CheckIn.tsx", "utf8");
  assert.match(checkInSrc, /useProfileContext\('checkin'\)\.slices\?\.ownWords/);
  assert.match(checkInSrc, /setCountedWordIds\(emotion && r\.toolSessionId \? \[emotion\.id\] : \[\]\)/,
    "only the word Find the feeling saved is left to its save; a body-first pick after it counts here");
  assert.match(readFileSync("src/lib/spine/checkInPayload.ts", "utf8"), /if \(s\.countedWordIds\?\.length\) req\.countedWordIds = s\.countedWordIds;/);
});

test("Find the feeling: an own word among a family's two nearest is offered first; the family order stays the shape's", () => {
  const found = { way: "shape", vec: byId.furious.shape };
  const plain = ftf.rankFamilies(content.families, found);
  const fam = plain[0];
  const second = fam.words[1].emotionId;
  const withOwn = ftf.rankFamilies(content.families, found, [second]);
  assert.deepEqual(withOwn.map((f) => f.id ?? f.order), plain.map((f) => f.id ?? f.order), "families unchanged");
  assert.equal(withOwn[0].words[0].emotionId, second, "the own word leads its family");
  assert.equal(withOwn[0].words.length, fam.words.length);
  if (fam.words.length > 2) {
    const third = fam.words[2].emotionId;
    assert.equal(ftf.rankFamilies(content.families, found, [third])[0].words[0].emotionId, fam.words[0].emotionId, "beyond reach: no jump");
  }
  assert.equal(ftf.OWN_WORD_REACH, 2);
});

test("Find the feeling's flow takes the own words as the word step opens, so the offers can't shift under them", () => {
  let own = [];
  const reducer = flowLib.makeFlowReducer(content, () => own);
  const found = { way: "shape", vec: byId.furious.shape };
  let h = { stack: [flowLib.initialFlow(content, "tool", "shape")] };
  assert.deepEqual(h.stack[0].own, []);
  for (const a of [{ t: "begin" }, { t: "found", found }]) h = reducer(h, a);
  const second = ftf.rankFamilies(content.families, found)[0].words[1].emotionId;
  own = [second];
  h = reducer(h, { t: "pull", pull: "fight" });
  const s = h.stack[h.stack.length - 1];
  assert.equal(s.step, "word");
  assert.deepEqual(s.own, [second]);
  assert.equal(flowLib.wordOnOffer(content, s).emotionId, second, "offered first");
  own = [];
  assert.equal(flowLib.wordOnOffer(content, s).emotionId, second, "a late change doesn't move the offer");
});

test("the feeling card link: the first named word with a card (a DBT parent); none, no link", () => {
  const parentOf = { annoyed: { parent: "anger" }, calm: { parent: null }, worried: { parent: "fear" } };
  assert.equal(guide.feelingCardWord(["calm", "annoyed", "worried"], parentOf), "annoyed");
  assert.equal(guide.feelingCardWord(["calm", "tired"], parentOf), null);
  assert.equal(guide.feelingCardWord([], parentOf), null);
});

test("the link sits under the check-in results, never after a safety visit, beside a banner or note, or flooded", () => {
  for (const f of ["src/components/checkin/StateResult.tsx", "src/components/checkin/LowEnergyStateResult.tsx"]) {
    const src = readFileSync(f, "utf8");
    assert.match(src, /\{!quietCard && !has\('crisis_banner'\) && !has\('clinical_note'\) && result\.routing\?\.band !== 'flooded' && \(\s+<FeelingCardLink className="mb-4" /, f);
    assert.match(src, /state=\{\(word\) => fromCheckIn\(checkInId, \[word\], pattern\.id\)\}/, f);
  }
  const checkIn = readFileSync("src/pages/CheckIn.tsx", "utf8");
  assert.equal(checkIn.match(/quietCard=\{safetyCheckId != null \|\| safetyPeople\}/g)?.length, 2, "both result screens");
  assert.match(readFileSync("src/services/neo4j.ts", "utf8"), /m\.getOppositeActionPickerContent\(\)/, "preloaded with the check-in");
  const ftfPage = readFileSync("src/pages/tools/FindTheFeeling.tsx", "utf8");
  assert.match(ftfPage, /state\.wordAccepted && state\.word && \(\s+<FeelingCardLink emotionIds=\{\[state\.word\]\}/);
  const link = readFileSync("src/components/checkin/FeelingCardLink.tsx", "utf8");
  assert.match(link, /to="\/tool\/emotion-guide"/);
  assert.match(link, /Get to know “\{name\}”/);
});
