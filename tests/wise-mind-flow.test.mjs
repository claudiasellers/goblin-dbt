// Wise mind, piece 2 (docs/design/wise-mind.md): the step machine's branches, what a visit saves, the
// keep, the tool's registration (listed, intents, lazy, the close kind) and the page's wiring.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const wm = await importTs("src/lib/wiseMind.ts");
const toolsMod = await importTs("src/data/tools.ts");
const close = await importTs("src/lib/spine/close.ts");
const spineTools = await importTs("functions/src/spine/tools.ts");
const ext = await importTs("functions/src/spine/extSchemas.ts");
const content = JSON.parse(readFileSync("src/data/content/wise-mind.json", "utf8")).content;
const read = (f) => readFileSync(f, "utf8");

const run = (events, from = wm.initialWise()) => events.reduce((s, e) => wm.wiseNext(s, e, content), from);
const toAnswer = [
  { type: "question", id: "wm_q_say" },
  { type: "says", side: "emotion", id: "wm_v_say_emotion_1" },
  { type: "nothing", side: "reason" },
  { type: "continue" },
  { type: "start" },
  { type: "here" },
];

test("the default path: question → both minds → drop in → what comes → feel → next → enough → close", () => {
  let s = run([{ type: "question", id: "wm_q_say" }]);
  assert.equal(s.step, "minds");
  s = run([{ type: "side", side: "reason" }], s);
  assert.equal(s.side, "reason");
  s = run([{ type: "says", side: "reason", id: "wm_v_say_reason_1" }], s);
  assert.equal(s.side, "emotion", "the other circle opens next");
  assert.equal(wm.mindsHeard(s), false);
  s = run([{ type: "says", side: "emotion", id: "wm_v_say_emotion_2" }], s);
  assert.equal(wm.mindsHeard(s), true);
  assert.equal(s.side, null, "both heard: the witness line, nothing open");
  s = run([{ type: "continue" }], s);
  assert.equal(s.step, "dropIn");
  assert.equal(wm.defaultPracticeId(s, content), "wm_ask", "a question highlights Ask and listen");
  s = run([{ type: "start" }], s);
  assert.deepEqual([s.step, s.practiceId, s.dropped], ["practice", "wm_ask", true]);
  s = run([{ type: "skip" }], s);
  assert.equal(s.step, "practice", "the practice is the one screen that isn't skipped");
  s = run([{ type: "here" }, { type: "answer", id: "wm_a_wait" }, { type: "feel", feel: "calm" }, { type: "continue" }], s);
  assert.equal(s.step, "next");
  assert.deepEqual(wm.nextToolIdsFor(s, content), ["pause"]);
  s = run([{ type: "enough" }], s);
  assert.equal(s.step, "close");
  assert.equal(wm.wiseMindAnswerOf(s), "wm_a_wait");
});

test("Nothing comes on either circle, and the stone for Nothing in particular", () => {
  const s = run([{ type: "question", id: "wm_q_settle" }, { type: "nothing", side: "emotion" }, { type: "nothing", side: "reason" }]);
  assert.equal(wm.mindsHeard(s), true);
  assert.deepEqual([s.emotion.nothing, s.reason.nothing], [true, true]);
  assert.equal(wm.defaultPracticeId(run([{ type: "continue" }], s), content), "wm_stone");
  assert.equal(wm.defaultPracticeId(run([{ type: "skip" }]), content), "wm_stone", "no question: the stone");
  assert.equal(run([{ type: "skip" }]).step, "dropIn", "skipping the question goes to the practice");
});

test("own words: the question, each mind and the answer; capped at 140; blank is ignored", () => {
  let s = run([{ type: "questionOwn", text: "  Whether to\n move out " }]);
  assert.deepEqual([s.step, s.questionOwn, s.questionId], ["minds", "Whether to move out", null]);
  assert.equal(wm.defaultPracticeId(s, content), "wm_ask");
  assert.deepEqual(wm.voicesFor(s, content, "emotion"), [], "own question: own words only");
  s = run([{ type: "saysOwn", side: "emotion", text: "x".repeat(200) }], s);
  assert.equal(s.emotion.own.length, 140);
  assert.equal(run([{ type: "saysOwn", side: "reason", text: "   " }], s).reason, null);
  s = run([{ type: "saysOwn", side: "reason", text: "Stay" }, { type: "continue" }, { type: "start" }, { type: "here" }, { type: "answerOwn", text: "Sleep on it" }], s);
  assert.deepEqual([s.step, s.answerOwn, wm.wiseMindAnswerOf(s)], ["feel", "Sleep on it", "own"]);
  assert.equal(run([{ type: "questionOwn", text: " " }]).step, "question");
});

test("Nothing yet: the quiet line, then the close; nothing to keep", () => {
  let s = run([...toAnswer, { type: "answer", id: "wm_a_nothing" }]);
  assert.equal(s.step, "quiet");
  assert.equal(wm.canKeep(s, content), false);
  assert.equal(wm.keptLine(s, content, content.copy.next.kept), null);
  s = run([{ type: "continue" }], s);
  assert.equal(s.step, "close");
  assert.equal(wm.wiseMindAnswerOf(s), "wm_a_nothing");
  assert.equal(run([...toAnswer, { type: "skip" }]).step, "close", "skipping what comes: the close");
});

test("Pushed, urgent → Drop in once more (only once) → asked fresh; Keep it anyway; Not sure", () => {
  let s = run([...toAnswer, { type: "answer", id: "wm_a_say" }, { type: "feel", feel: "pushed" }]);
  assert.equal(wm.offersOnceMore(s), true);
  assert.equal(run([{ type: "continue" }], s).step, "feel", "pushed moves on only by its own two choices");
  s = run([{ type: "onceMore" }], s);
  assert.deepEqual([s.step, s.onceMore, s.answerId, s.feel], ["dropIn", true, null, null], "back to the practice, the answer asked fresh");
  s = run([{ type: "start" }, { type: "here" }, { type: "answer", id: "wm_a_say" }, { type: "feel", feel: "pushed" }], s);
  assert.equal(wm.offersOnceMore(s), false, "once");
  assert.equal(run([{ type: "onceMore" }], s).step, "feel", "a second once-more does nothing");
  s = run([{ type: "keepAnyway" }], s);
  assert.equal(s.step, "next", "never a block");
  const unsure = run([...toAnswer, { type: "answer", id: "wm_a_say" }, { type: "feel", feel: "unsure" }, { type: "continue" }]);
  assert.equal(unsure.step, "next");
  assert.equal(run([...toAnswer, { type: "answer", id: "wm_a_say" }, { type: "skip" }]).step, "next", "the feel can be skipped");
  assert.equal(run([...toAnswer, { type: "answer", id: "wm_a_say" }, { type: "feel", feel: "unsure" }, { type: "keepAnyway" }]).step, "feel");
});

test("hand-off: only a tool the answer offers; Keep once, only with something said", () => {
  let s = run([...toAnswer, { type: "answer", id: "wm_a_care" }, { type: "skip" }]);
  assert.deepEqual(wm.nextToolIdsFor(s, content), ["cool-down", "five-senses"]);
  assert.equal(run([{ type: "handoff", toolId: "dear-man" }], s).step, "next", "not on offer");
  assert.equal(wm.canKeep(s, content), true);
  s = run([{ type: "keep" }], s);
  assert.equal(s.kept, true);
  assert.equal(wm.canKeep(s, content), false, "kept once");
  s = run([{ type: "handoff", toolId: "five-senses" }], s);
  assert.deepEqual([s.step, s.nextToolId], ["handoff", "five-senses"]);
  // Every offered tool is a real one.
  for (const a of content.answers) for (const t of a.nextToolIds) assert.ok(toolsMod.getToolById(t), t);
});

test("the kept line: the chip in the person's voice, or their own words as written", () => {
  const frame = content.copy.next.kept;
  const at = (id) => run([...toAnswer, { type: "answer", id }]);
  assert.equal(wm.keptLine(at("wm_a_wait"), content, frame), "Wise mind said: wait, not now.");
  assert.equal(wm.keptLine(at("wm_a_know"), content, frame), "Wise mind said: I already know what to do.", "never a lower-case I");
  assert.equal(wm.keptLine(run([...toAnswer, { type: "answerOwn", text: "go for a walk first" }]), content, frame), "go for a walk first");
});

test("ext.wm: what a visit saves passes the server's schema; own words only on *Own keys", () => {
  let s = run([{ type: "questionOwn", text: "Move out?" }, { type: "says", side: "emotion", id: "x" }]);
  s = run([{ type: "saysOwn", side: "emotion", text: "Go" }, { type: "nothing", side: "reason" }, { type: "continue" },
    { type: "practice", id: "wm_breath" }, { type: "start" }, { type: "here" }, { type: "answerOwn", text: "Not yet" },
    { type: "feel", feel: "pushed" }, { type: "onceMore" }, { type: "start" }, { type: "here" }, { type: "answer", id: "wm_a_wait" },
    { type: "feel", feel: "calm" }, { type: "continue" }, { type: "keep" }, { type: "handoff", toolId: "pause" }], s);
  const out = wm.wiseExt(s);
  assert.deepEqual(out, {
    form: "minds", questionOwn: "Move out?", emotionSaysOwn: "Go", practiceId: "wm_breath", feel: "calm", onceMore: true, nextToolId: "pause", kept: true,
  });
  assert.deepEqual(JSON.parse(ext.validateExt({ wm: out })).wm, out);
  const chips = wm.wiseExt(run([...toAnswer, { type: "answer", id: "wm_a_say" }]));
  assert.deepEqual(chips, { form: "minds", questionId: "wm_q_say", emotionSaysIds: ["wm_v_say_emotion_1"], practiceId: "wm_ask" });
  assert.equal(wm.wiseExt(wm.initialWise()).practiceId, undefined, "no practice until one starts");
  assert.ok(JSON.parse(ext.validateExt({ wm: chips })).wm);
});

test("the entry may put one question first, never pressed; unknown ids are ignored", () => {
  const e = wm.parseWiseEntry("?first=wm_q_say", content);
  assert.equal(e.firstQuestionId, "wm_q_say");
  assert.deepEqual(wm.orderedQuestions(content, e).map((q) => q.id).slice(0, 2), ["wm_q_say", "wm_q_next"]);
  assert.equal(wm.parseWiseEntry("?first=nope", content).firstQuestionId, null);
  assert.equal(wm.orderedQuestions(content, { firstQuestionId: null })[0].id, "wm_q_next");
  assert.equal(wm.initialWise().questionId, null, "never pre-selected");
});

test("every line the screens read is in the shipped copy", () => {
  const c = wm.wiseCopy(content.copy);
  assert.equal(wm.wiseCopyReady(c), true);
  assert.equal(c.dropIn.holdHint, "Hold to fill it, or press once and wait.");
  assert.equal(wm.wiseCopyReady(wm.wiseCopy({ ...content.copy, dropIn: { ...content.copy.dropIn, here: "" } })), false);
});

test("the tool: listed for everyone, in Mindfulness, in the intents, bare; its close is orienting and counts toward what helps", () => {
  const t = toolsMod.getToolById("wise-mind");
  assert.deepEqual([t.name, t.module, t.emoji, t.bare, t.listed], ["Wise mind", "mindfulness", "🪨", true, undefined]);
  assert.equal(t.dbtBasis, "DBT Mindfulness: wise mind (states of mind; ideas for practising wise mind)");
  assert.ok(toolsMod.listedTools().some((x) => x.id === "wise-mind"));
  assert.deepEqual(toolsMod.intents.filter((i) => i.toolId === "wise-mind").map((i) => i.label), ["I'm torn about what to do", "Check a decision before I act"]);
  assert.deepEqual(close.TOOL_CLOSE_KIND["wise-mind"], { module: "mf", closeKind: "orienting" });
  assert.deepEqual(spineTools.SPINE_TOOLS["wise-mind"], { module: "mf", closeKind: "orienting" });
  assert.ok(!spineTools.NOT_WHAT_HELPS.includes("wise-mind"));
});

test("the page: no band gate, TooMuchLink on every screen, the keep through the witness own-line writer, the hand-off through linkTo", () => {
  const page = read("src/pages/tools/WiseMind.tsx");
  assert.doesNotMatch(page, /BandGate|useBand\(/, "no band gate");
  assert.equal((page.match(/<TooMuchLink /g) ?? []).length, 1);
  assert.match(page, /<div key=\{`\$\{s\.step\}:\$\{own \?\? ''\}`\}[\s\S]*?<\/div>\s*<div className="flex justify-center">\s*<TooMuchLink host=\{HOST\}/, "outside the step: on every screen");
  // The keep: one OwnLine through recordWitnessBeat, on the tap only, on this visit's own session.
  assert.match(page, /recordWitnessBeat\(\{\s*hostKind: 'tool_session', hostId: toolSession\.id, moment: 'wise_mind', shown: \[\], skipped: false, noneFit: false,\s*ownLine: \{ id: newId\(\), text, emotionIds: \[\] \},/);
  assert.equal((page.match(/recordWitnessBeat\(/g) ?? []).length, 1);
  assert.match(page, /onClick=\{\(\) => \{ void keepIt\(\); \}\}/);
  assert.match(page, /const to = toolSession\.linkTo\(toolId\);\s*navigate\(to\.pathname, \{ state: to\.state \}\);/);
  assert.match(page, /toolSession\.setWiseMindAnswer\(wiseMindAnswerOf\(s\)\)/);
  assert.match(page, /<SessionClose kind="orienting" onAnswered=\{focusDone\} onSkipped=\{focusDone\} \/>/);
  assert.doesNotMatch(page, /localStorage|sessionStorage/, "the answer is never kept on the device to pre-fill");
});

test("wiseMindAnswer rides on whichever close happens, never pre-filled", () => {
  const ctx = read("src/contexts/ToolSessionContext.tsx");
  assert.match(ctx, /\.\.\.\(wiseMindAnswer\.current \? \{ wiseMindAnswer: wiseMindAnswer\.current \} : \{\}\)/);
  assert.match(ctx, /setWiseMindAnswer: \(a\) => \{ wiseMindAnswer\.current = a; \}/);
  const layers = read("functions/src/userdata/layers.ts");
  assert.match(layers, /'wiseMindAnswer'/, "an ask-fresh field");
});

test("the parts form's seam (screen 2p, lane 4): the step back after the question, part ids only, back to the two minds", () => {
  assert.equal(wm.initialWise().form, "minds", "the default form");
  let s = run([{ type: "question", id: "wm_q_next" }], wm.initialWise("parts"));
  assert.equal(s.step, "stepBack");
  assert.equal(run([{ type: "useMinds" }], s).step, "minds");
  assert.equal(run([{ type: "useMinds" }], s).form, "minds");
  assert.equal(run([{ type: "skip" }], s).step, "dropIn");
  s = run([{ type: "steppedBack", partIds: ["p1", "p2", "p1", ""], stillCloseIds: ["p2", "p9"] }], s);
  assert.deepEqual([s.step, s.partIds, s.stillCloseIds], ["dropIn", ["p1", "p2"], ["p2"]], "deduplicated; still close only among the placed");
  const out = wm.wiseExt(s);
  assert.deepEqual([out.form, out.partIds, out.stillCloseIds], ["parts", ["p1", "p2"], ["p2"]]);
  assert.ok(JSON.parse(ext.validateExt({ wm: out })).wm.partIds);
  assert.equal(wm.wiseExt(run([{ type: "useMinds" }], run([{ type: "question", id: "wm_q_next" }], wm.initialWise("parts")))).partIds, undefined);
  assert.equal(wm.WISE_EXIT_STEP.stepBack, "step_back");
});

test("screen 5's Pushed, urgent line switches on the form; ?a=&b= is passed on as presetPartIds", () => {
  const c = wm.wiseCopy(content.copy);
  const pushed = (form) => run([{ type: "skip" }, { type: "start" }, { type: "here" }, { type: "answer", id: "wm_a_say" }, { type: "feel", feel: "pushed" }], wm.initialWise(form));
  assert.equal(wm.feelLine(pushed("minds"), c, "A part might still be close."), "That might be emotion mind talking.");
  assert.equal(wm.feelLine(pushed("parts"), c, "A part might still be close."), "A part might still be close.");
  assert.equal(wm.feelLine(pushed("parts"), c, null), "That might be emotion mind talking.", "until the parts line ships");
  assert.deepEqual(wm.parseWiseEntry("?a=part_1&b=part_2", content).presetPartIds, ["part_1", "part_2"]);
  assert.deepEqual(wm.parseWiseEntry("?a=part_1&b=part_1", content).presetPartIds, ["part_1"]);
  assert.deepEqual(wm.parseWiseEntry("?a=<x>&b=", content).presetPartIds, []);
  const page = read("src/pages/tools/WiseMind.tsx");
  assert.match(page, /useState<WiseState>\(\(\) => initialWise\(stepBack \? 'parts' : 'minds'\)\)/);
  assert.match(page, /<Room question=\{questionText\} presetPartIds=\{entry\.presetPartIds\}/);
});

test("a heard circle holds what it said: the chip's label, own words, or Nothing comes; reopening keeps the pick", () => {
  let s = run([{ type: "question", id: "wm_q_say" }]);
  assert.equal(wm.mindWords(s, content, "emotion"), null, "unheard: nothing under the name");
  s = run([{ type: "side", side: "emotion" }, { type: "says", side: "emotion", id: "wm_v_say_emotion_1" }], s);
  const label = content.questions.find((q) => q.id === "wm_q_say").voices.emotion.find((v) => v.id === "wm_v_say_emotion_1").label;
  assert.deepEqual(wm.mindWords(s, content, "emotion"), { kind: "words", text: label, own: false });
  s = run([{ type: "saysOwn", side: "reason", text: "  Wait till Monday  " }], s);
  assert.deepEqual(wm.mindWords(s, content, "reason"), { kind: "words", text: "Wait till Monday", own: true });
  // Tapping a heard circle reopens its chips with the pick still there; a new pick replaces it.
  s = run([{ type: "side", side: "emotion" }], s);
  assert.equal(s.side, "emotion");
  assert.equal(s.emotion.id, "wm_v_say_emotion_1");
  s = run([{ type: "nothing", side: "emotion" }], s);
  assert.deepEqual(wm.mindWords(s, content, "emotion"), { kind: "nothing" });
  assert.equal(s.side, null, "both heard again: nothing open");
});

test("the diagram: words under each name (own words clamped to two lines), a quiet … for Nothing comes, a static overlap step", () => {
  const src = read("src/components/tools/wiseMind/TwoMinds.tsx");
  assert.match(src, /font-serif text-sm[^"`]*\$\{w\.own \? 'line-clamp-2' : ''\}/);
  assert.match(src, /aria-hidden="true" data-testid=\{`said-\$\{side\}`\}[^>]*>…</);
  assert.match(src, /opacity=\{both \? 0\.2 : 0\.12\} data-both=\{both \? 'true' : 'false'\} \/>/, "the overlap has no transition class");
  const page = read("src/pages/tools/WiseMind.tsx");
  assert.match(page, /said=\{\{ emotion: mindWords\(s, content, 'emotion'\), reason: mindWords\(s, content, 'reason'\) \}\}/);
  assert.match(page, /ownPressed=\{!!s\[side\]\?\.own\}/);
});
