// A5-3: the witness beat on the check-in result (src/lib/witness.ts, WitnessBeat.tsx, both result screens).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { lintText } from "../scripts/voice-lint.mjs";

const w = await importTs("src/lib/witness.ts");
const read = (f) => readFileSync(f, "utf8");
const beat = read("src/components/witness/WitnessBeat.tsx");

const g = (id, level = 5, extra = {}) => ({ id, source: "graph", text: `t ${id}`, level, kind: "receive", voice: "you", tentative: false, ...extra });

test("fillWitnessLine: you by default, the authored name form only when asked and a name is known", () => {
  const line = { text: "Of course that stung. You got {phrase}.", textNamed: "{N}, of course that stung. You got {phrase}." };
  assert.equal(w.fillWitnessLine(line, { phrase: "brushed off" }), "Of course that stung. You got brushed off.");
  assert.equal(w.fillWitnessLine(line, { name: "Claudia", phrase: "brushed off" }, "name"), "Claudia, of course that stung. You got brushed off.");
  assert.equal(w.fillWitnessLine(line, { phrase: "brushed off" }, "name"), "Of course that stung. You got brushed off.", "no name → you");
  assert.equal(w.fillWitnessLine({ text: "It makes sense to feel {word}." }, {}), "It makes sense to feel {word}.", "unknown slots stay visible");
  assert.equal(w.fillWitnessLine({ text: "It makes sense to feel {word}." }, { word: "let down" }), "It makes sense to feel let down.");
});

test("echo: the user's own words, as chosen", () => {
  assert.equal(w.echoText(["Anxious"]), "Anxious.");
  assert.equal(w.echoText(["Anxious", "Let down"]), "Anxious, let down.");
  assert.equal(w.echoText([]), "");
});

test("band and placement: every non-positive result; no band → stirred; flooded → header", () => {
  assert.equal(w.showsWitnessBeat("acute_alarm"), true);
  assert.equal(w.showsWitnessBeat("emotional_flooding"), true);
  assert.equal(w.showsWitnessBeat("positive_state"), false);
  assert.equal(w.beatBand(null), "stirred");
  assert.equal(w.beatBand("flooded"), "flooded");
  assert.equal(w.beatVariant("flooded"), "header");
  assert.equal(w.beatVariant("steady"), "standalone");
  assert.deepEqual(w.RECEIVE_STEP, { kind: "receive", maxLines: 2, allowOwn: true });
});

test("questions: never at flooded; level 3 asks close · not that; landed only when the server says so", () => {
  const line = g("a");
  assert.equal(w.beatQuestion({ band: "flooded", askLanded: true, line, answered: false }), null);
  assert.equal(w.beatQuestion({ band: "steady", askLanded: true, line, answered: false }), "landed");
  assert.equal(w.beatQuestion({ band: "steady", askLanded: false, line, answered: false }), null);
  assert.equal(w.beatQuestion({ band: "steady", askLanded: false, line: g("t", 3, { tentative: true }), answered: false }), "tentative");
  assert.equal(w.beatQuestion({ band: "steady", askLanded: true, line, answered: true }), null);
  assert.equal(w.tentativeLanded("close"), "sort_of");
  assert.equal(w.tentativeLanded("not_that"), "no");
});

test("No → the alternate at another level, at most two lines, then the postponement line", () => {
  const lines = [g("a", 4), g("b", 5), g("c", 6)];
  assert.deepEqual(w.afterNo(lines, 0), { next: 1 });
  assert.deepEqual(w.afterNo(lines, 1), { postpone: true });
  assert.deepEqual(w.afterNo([g("a")], 0), { postpone: true });
});

test("results and the recordWitnessBeat request: graph lines shown, own line by id, keep only a shown line", () => {
  const own = { id: "0b9f3c1e-6d2a-4c8e-9f0a-1b2c3d4e5f60", source: "own", text: "mine", level: null, kind: "self", voice: "none", tentative: false };
  const lines = [own, g("b", 5)];
  const answers = { landed: { b: "no" }, skipped: false, noneFit: false, keepLineId: "b" };
  const r = w.beatResult(lines, 1, answers);
  assert.deepEqual(r.shownLineIds, ["b"]);
  assert.equal(r.ownLineShownId, own.id);
  const req = w.beatRequest({ checkInId: "c1", moment: "checkin_result", band: "stirred", lines, result: r, emotionIds: ["anxious"] });
  assert.deepEqual(req, {
    hostKind: "checkin", hostId: "c1", moment: "checkin_result", band: "stirred",
    shown: [{ lineId: "b", landed: "no" }], skipped: false, noneFit: false, ownLineShownId: own.id, keepLineId: "b",
  });
  const first = w.beatResult([g("a"), g("b")], 0, { landed: {}, skipped: false, noneFit: false });
  assert.deepEqual(first.shownLineIds, ["a"], "the alternate isn't logged until it is shown");
  const withOwn = w.beatRequest({ checkInId: "c1", moment: "checkin_result", band: "steady", lines: [g("a")], emotionIds: ["x", "y"],
    result: { ...first, ownLine: { id: own.id, text: "my words" } } });
  assert.deepEqual(withOwn.ownLine, { id: own.id, text: "my words", emotionIds: ["x", "y"] });
});

test("WitnessBeat: skip, none of these fit and say it my way always render (skip_always); keep is explicit", () => {
  for (const key of ["skip", "none-fit", "say-it-my-way", "keep"]) assert.match(beat, new RegExp(`data-witness="${key}"`), key);
  assert.match(beat, /Did that land\?/);
  assert.match(beat, /maxLength=\{OWN_MAX\}/);
  assert.match(beat, /const OWN_MAX = 140/);
  assert.match(beat, /useReducedMotion/);
  assert.doesNotMatch(beat, /from ['"][^'"]*confetti|navigator\.vibrate/i);
  assert.doesNotMatch(beat, /[\u{1F300}-\u{1FAFF}\u{2728}]/u, "no emoji");
});

test("WitnessBeat copy is inside the voice contract", () => {
  const strings = [...beat.matchAll(/>([^<>{}\n]{2,})</g)].map((m) => m[1].trim()).filter(Boolean);
  strings.push(beat.match(/const POSTPONE = "([^"]+)"/)[1]);
  for (const s of strings) {
    const errs = lintText(s, { scope: "feeling_copy" }).filter((f) => f.severity === "error" || f.severity === "warn");
    assert.deepEqual(errs, [], s);
  }
});

test("both result screens: the beat sits below the banner and the label, above the tools, never on positive_state", () => {
  for (const f of ["src/components/checkin/StateResult.tsx", "src/components/checkin/LowEnergyStateResult.tsx"]) {
    const src = read(f);
    const main = src.slice(src.lastIndexOf('<div className="py-4">'));
    const banner = main.indexOf("{has('crisis_banner') && <CrisisBanner />}");
    const label = main.indexOf("</h2>");
    const beatAt = main.indexOf("<WitnessBeat");
    const tools = main.indexOf("{has('tools')");
    assert.ok(banner >= 0 && banner < label && label < beatAt && beatAt < tools, f);
    assert.match(main, /\{showsWitnessBeat\(pattern\.id\) && \(/, f);
    assert.match(main, /moment="checkin_result"/, f);
    assert.match(main, /band=\{beatBand\(band\)\} variant=\{beatVariant\(beatBand\(band\)\)\}/, f);
  }
  const low = read("src/components/checkin/LowEnergyStateResult.tsx");
  const lowMain = low.slice(low.lastIndexOf('<div className="py-4">'));
  assert.ok(lowMain.indexOf("<WitnessBeat") < lowMain.indexOf("{has('guided_activity')"));
});

test("CheckIn: the beat's log waits for the render save, and the next action waits for the beat", () => {
  const src = read("src/pages/CheckIn.tsx");
  assert.match(src, /beatQueue\.current = beatQueue\.current\s*\.then\(\(\) => saved\)\s*\.then\(\(ok\) => \(ok \? recordWitnessBeat\(req\) : null\)\)/);
  assert.match(src, /const pending = \(savePromise\.current \?\? Promise\.resolve\(false\)\)\.then\(\(saved\) => beats\.then\(\(\) => saved\)\)/);
  assert.equal((src.match(/witness=\{witness\}/g) ?? []).length, 2);
});

test("check-in re-saves are serialized: 'add more detail' waits for the save in flight (Codex, PR #16)", () => {
  const src = readFileSync("src/pages/CheckIn.tsx", "utf8");
  assert.match(src, /const payload = buildCheckInPayload\(payloadState\(\), stateResult\);\s*const prev = savePromise\.current \?\? Promise\.resolve\(true\);\s*savePromise\.current = prev\s*\.then\(\(\) => saveCheckIn\(payload\)\)/);
});

test("the resume_skill deep link carries its follow-up id, so opening it resolves the card (Codex, PR #17)", () => {
  const cy = readFileSync("schema/practice-spine.cypher", "utf8");
  assert.match(cy, /\/tool\/\{sourceToolId\}\?resume=\{sourceSessionId\}&followUp=\{followUpId\}/);
  assert.match(readFileSync("functions/src/spine/today.ts", "utf8"), /followUpId: r\.get\('id'\)/);
});
