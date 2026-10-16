// Meet a part as an app tool (src/pages/tools/MeetAPart.tsx, src/lib/meetAPartSave.ts): hidden registration
// behind the parts switch and signed-off copy, the entry gate's outcomes, the session mapping onto lane 2's
// stored fields (checked with the server's own validators), keep / candidate requests, PartFigure's geometry,
// the shared LightHold, and no hard-coded copy on its screens.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture } from "./lib/partsContentFixture.mjs";

const M = await importTs("src/lib/meetAPart.ts");
const S = await importTs("src/lib/meetAPartSave.ts");
const F = await importTs("src/lib/partFigure.ts");
const T = await importTs("src/data/tools.ts");
const V = await importTs("functions/src/parts/validation.ts");
const K = await importTs("functions/src/parts/keepPlan.ts");
const C = await importTs("functions/src/parts/candidate.ts");
const { PartFigure } = await importTs("src/components/parts/PartFigure.tsx");

const fixture = JSON.parse(readFileSync("tests/fixtures/parts-content.json", "utf8"));
const ALL = partsFromFixture(fixture, () => true);
const SHIPPED = JSON.parse(readFileSync("src/data/content/parts.json", "utf8")).content;
const ROUNDS = JSON.parse(readFileSync("src/data/content/find-the-feeling.json", "utf8")).content.flow.copy.shape.rounds;
const read = (f) => readFileSync(f, "utf8");

const SID = "3f2c9a0e-1b2c-4d5e-8f90-123456789abc";
const PID = "4f2c9a0e-1b2c-4d5e-8f90-123456789abc";
const CTX = S.meetContext(ALL, { open: "flow" }, false);
const optionById = (id) => Object.values(ALL.options).flatMap((s) => Object.values(s).flat()).find((o) => o.id === id);
const ev = (x) => (typeof x === "string" ? { type: "option", option: optionById(x) ?? assert.fail(`no option ${x}`) } : x);
const run = (events, { ctx = CTX, move = "hide", state } = {}) => events.reduce((s, e) => {
  const next = M.meetNext(s, ev(e), ctx);
  assert.notEqual(next, s, `${JSON.stringify(e)} at ${s.step} did nothing`);
  return next;
}, state ?? M.initialMeet(ctx, { move, trailheadKind: "me" }));
const SHAPE = [[0.62, 0, 0, 0, 0], [0.62, -0.62, 0, 0, 0], [0.62, -0.62, 0.62, 0, 0], [0.62, -0.62, 0.62, 0, 0], [0.62, -0.62, 0.62, 0, -0.62]]
  .map((shape) => ({ type: "shape", shape }));
const hold = { type: "hold" };
const P2 = { resumed: true, overridden: false, thenVsNow: "better", primitivesRun: [{ id: "sigh", completed: true, durationSec: 31 }] };
// Every field the session can hold, in one visit: P2 at the blend check, own words, a hurt, Update's "not yet".
const FULL = ["find_something_else", { type: "find" }, "blend_running", { type: "p2", outcome: "resume", result: P2 },
  { type: "place", place: "chest" }, ...SHAPE, "age_now", { type: "ownWords", text: "go away" }, "feel_annoyed", "unblend_eased",
  "feel_curious", "hide_job_out_of_sight", "likes_tired", { type: "hurt", hurtId: "left_out" }, "hide_fear_regret", "update_no", "now_ask",
  hold, "hide_rather_need_someone", { type: "name", name: "Ash" }];

test("hidden: registered and reachable by link only, never in a list", () => {
  const tool = T.getToolById("meet-a-part");
  assert.deepEqual([tool.name, tool.module, tool.listed, tool.bare], ["Meet a part", "mindfulness", false, true]);
  assert.ok(!T.getToolsByModule("mindfulness").some((t) => t.id === "meet-a-part"));
  assert.ok(!T.listedTools().some((t) => t.id === "meet-a-part"));
  assert.ok(!T.intents.some((i) => i.toolId === "meet-a-part"));
  assert.equal(T.tools.filter((t) => t.listed === false).length, 1);
  // Lists read only listed tools: Tools.tsx through getToolsByModule; nothing else iterates `tools` to show them.
  assert.match(read("src/pages/Tools.tsx"), /import \{ getToolsByModule, intents \} from '\.\.\/data\/tools'/);
  const page = read("src/pages/ToolPage.tsx");
  assert.match(page, /'meet-a-part': MeetAPart,/);
  assert.match(page, /if \(!tool \|\| gate === 'closed'\) \{/, "parts off or copy missing: the existing not-found state");
  const gate = read("src/hooks/useToolGate.ts");
  assert.match(gate, /if \(!on\) return loading \? 'loading' : 'closed';/, "parts off: closed");
  assert.match(gate, /return ready \? 'open' : 'closed';/);
});

test("ready only with every prompt and option signed off, and Shape it's words: today's file says no", () => {
  assert.equal(S.meetReady(SHIPPED, ROUNDS), false, "nothing is signed off yet: ToolPage refuses");
  assert.equal(S.meetReady(ALL, ROUNDS), true, "with the whole fixture approved it opens");
  assert.equal(S.meetReady(ALL, ROUNDS.slice(0, 4)), false, "a round without words");
  for (const id of [...S.meetPromptIds(), ...S.MEET_REQUIRED_OPTIONS]) {
    const missing = partsFromFixture(fixture, (x) => x !== id);
    assert.equal(S.meetReady(missing, ROUNDS), false, `without ${id}`);
  }
  assert.equal(S.meetReady(partsFromFixture(fixture, (x) => x !== "keep_yes"), ROUNDS), false, "no way to keep");
});

test("entry: P2 first (flooded, orienting when dissociation is in the history, crisis alongside), the heads-up, or the flow", () => {
  assert.deepEqual(S.entryPlan({ open: "p2", band: "flooded", crisis: true, reasons: ["checkin_crisis", "dissociation_history"] }),
    { open: "p2", band: "flooded", blank: true, crisis: true });
  assert.deepEqual(S.entryPlan({ open: "p2", band: "flooded", crisis: false, reasons: ["recover_loud"] }),
    { open: "p2", band: "flooded", blank: false, crisis: false });
  assert.deepEqual(S.entryPlan({ open: "far_away", reasons: ["dissociation_history"] }), { open: "heads_up" });
  assert.deepEqual(S.entryPlan({ open: "clear", reasons: [] }), { open: "flow" });
  assert.deepEqual(S.entryPlan(null), { open: "flow" }, "a failed call never locks");
  // After P2 on entry the machine knows it: "running things" opens P2 on its last two choices, flooded.
  const ctx = S.meetContext(ALL, S.entryPlan({ open: "p2", band: "flooded", crisis: false, reasons: [] }), true);
  assert.deepEqual([ctx.p2OnEntry, ctx.p2Band, ctx.blendCheck, ctx.maxNonSelfAnswers], [true, "flooded", true, 2]);
  const s = run(["blend_running"], { ctx });
  assert.deepEqual([s.step, s.p2], ["blendBody", { band: "flooded", start: "later" }]);
  assert.equal(S.meetContext(ALL, { open: "heads_up" }, false).p2OnEntry, undefined);
  const page = read("src/pages/tools/MeetAPart.tsx");
  assert.match(page, /startLater=\{st\.p2\?\.start === 'later'\}/, "the lib's start reaches BreakdownHandoff");
  assert.match(page, /\{entryCrisis && <CrisisBanner \/>\}\s*<BreakdownHandoff host=\{HOST\} band="flooded"/);
  assert.match(page, /S?P\(HEADS_UP_PROMPT\)/);
  assert.match(page, /getPartsEntry\(\)\.then\(\(g\) => \{ if \(live\) setGate\(g\); \}\)\.catch\(\(\) => \{ if \(live\) setGate\(null\); \}\)/);
});

test("entry: router state, the first screen, and the starting move", () => {
  assert.deepEqual(S.parseMeetEntry(undefined), { trailheadKind: "me", partId: null, candidateId: null, moveId: null });
  assert.deepEqual(S.parseMeetEntry({ parts: { trailheadKind: "angry_card", partId: PID, moveId: "hit_back" } }),
    { trailheadKind: "angry_card", partId: PID, candidateId: null, moveId: "hit_back" });
  assert.deepEqual(S.parseMeetEntry({ parts: { trailheadKind: "nope", partId: "x", candidateId: 3, moveId: "Bad Id" } }),
    { trailheadKind: "me", partId: null, candidateId: null, moveId: null }, "anything malformed is dropped");
  assert.deepEqual(S.startingMove(ALL, S.parseMeetEntry({ parts: { moveId: "chase" } })), { move: "chase", named: true });
  assert.deepEqual(S.startingMove(ALL, S.parseMeetEntry({}), ["nope", "hide"]), { move: "hide", named: true }, "the visited part's move");
  assert.deepEqual(S.startingMove(ALL, S.parseMeetEntry({ parts: { moveId: "unknown_move" } })), { move: ALL.moves[0].id, named: false });
  assert.equal(M.firstStep(S.meetContext(ALL, { open: "flow" }, true)), "blend", "a named entry opens on the blending check");
  assert.equal(M.firstStep(S.meetContext(ALL, { open: "flow" }, false)), "find");
});

test("session: every field whatToSave keeps maps to a field lane 2's validators accept", () => {
  const full = run(FULL);
  assert.equal(full.step, "keep");
  const keys = Object.keys(M.whatToSave(run(["keep_yes", { type: "close", choiceId: "better" }], { state: full })).partSession);
  for (const k of [...keys, "youngId", "findId"]) assert.ok(S.SESSION_FIELD[k], `${k} has a stored home`);
  const patch = S.toPatch(full, [P2]);
  const checked = V.validateSavePartSession({ id: SID, patch, final: false });
  assert.deepEqual(Object.keys(checked.stepIds).sort(), ["age", "find", "fear", "guards", "job", "job_like", "update", "voice", "would_rather"].sort().filter((k) => patch.stepIds[k]));
  // Own words and chips are either-or at a step: three more visits cover the other side of each.
  const chipVoice = [...FULL.slice(0, 11), "hide_voice_see", ...FULL.slice(12, 15)];
  const others = [
    chipVoice.concat(FULL.slice(15)),
    chipVoice.concat({ type: "ownWords", text: "keeps me safe" }),
    chipVoice.concat("hide_job_out_of_sight", "likes_tired", "guards_not_sure", { type: "ownWords", text: "it all comes back" }),
  ].map((events) => S.toPatch(run(events)));
  for (const p of others) V.validateSavePartSession({ id: SID, patch: p });
  for (const target of new Set(Object.values(S.SESSION_FIELD))) {
    if (target.startsWith("start:")) continue;
    const [key, step] = target.split(".");
    const written = (p) => (key === "stepIds" ? !!p.stepIds?.[step] : key in p);
    assert.ok([patch, ...others].some(written), `${target} is written`);
  }
  assert.deepEqual(patch.stepIds.guards, ["left_out"]);
  assert.deepEqual(patch.stepIds.update, ["update_no", "now_ask"]);
  assert.deepEqual(patch.bodyPlaces, ["chest"]);
  assert.deepEqual(patch.shapeSig, [0.81, 0.19, 0.81, 0.5, 0.19], "-1..1 stored as 0–1");
  assert.equal(patch.ownVoice, "go away");
  assert.deepEqual([patch.steppedBack, patch.blendCheck, patch.exitStep, patch.stopReason], [true, "running", "keep", undefined]);
  assert.equal(patch.handoffs.length, 2, "the entry P2 and the blend check's");
  assert.ok(!JSON.stringify(patch).includes("Ash"), "the name is never in the log");
  const start = V.validateStartPartSession(S.startRequest(SID, full.session, S.parseMeetEntry({ parts: { candidateId: PID, trailheadKind: "candidate" } })));
  assert.deepEqual([start.trailheadKind, start.candidateId, start.moveIds], ["candidate", PID, ["hide"]]);
  const done = run(["keep_yes", { type: "close", choiceId: "better" }], { state: full });
  assert.deepEqual([S.toPatch(done).stopReason, S.toPatch(done).exitStep], ["done", undefined], "keep's exit stands from the save before");
});

test("session: stop reasons and exits in the stored set", () => {
  const base = ["find_something_else", { type: "find" }, "blend_notice", { type: "place", place: "chest" }, ...SHAPE];
  const tender = run([...base, "age_little", "young_gentle"]);
  const tp = S.toPatch(tender);
  assert.deepEqual([tp.stopReason, tp.exitStep, tp.stepIds.age], ["tender", "tender", ["age_little", "young_gentle"]]);
  assert.equal(K.isTender({ stepIdsJson: JSON.stringify(tp.stepIds), stopReason: null }), true, "lane 2's keep reads it as tender");
  assert.equal(K.partFromSession({ stepIdsJson: JSON.stringify(tp.stepIds), stopReason: tp.stopReason }).ageId, "age_little");
  const atEnd = run([...base, "age_now", "hide_voice_see", "feel_annoyed", "unblend_still"]);
  assert.deepEqual([atEnd.step, S.toPatch(atEnd).exitStep], ["unblendEnd", "unblend"]);
  const worried = run(["later_yes"], { state: atEnd });
  // The close is not a step of the part: the save omits exitStep, so the stored one ("unblend") stands.
  assert.deepEqual([worried.step, S.toPatch(worried).stopReason, "exitStep" in S.toPatch(worried)], ["close", "not_self", false]);
  const later = run(["find_something_else", { type: "find" }, "blend_running", { type: "p2", outcome: "later", result: P2 }, { type: "continue" }]);
  assert.deepEqual([later.step, S.toPatch(later).stopReason, S.toPatch(later).exitStep], ["done", "later", "blend"]);
  assert.equal(S.toPatch(later).shapeSig, undefined, "no shape was asked");
  const entry = S.entryLaterPatch([P2]);
  assert.deepEqual([entry.stopReason, entry.exitStep, entry.handoffs.length], ["later", "entry", 1]);
  V.validateSavePartSession({ id: SID, patch: entry, final: true });
  for (const [step, stored] of Object.entries(S.STEP_PART)) if (stored) V.validateSavePartSession({ id: SID, patch: { exitStep: stored } });
  assert.deepEqual(Object.keys(S.STEP_PART).sort(), [...M.MEET_STEPS].sort());
});

test("keep and candidate: ids and the name only; ask-fresh fields never reach keepPart", () => {
  const full = run(FULL);
  const yes = run(["keep_yes"], { state: full });
  const keep = S.keepRequest(yes, SID, PID);
  assert.deepEqual(keep, { sessionId: SID, partId: PID, name: "Ash" });
  assert.deepEqual(K.validateKeep(keep), { sessionId: SID, partId: PID, name: "Ash" });
  assert.equal(S.keepRequest(run(["keep_not_now"], { state: full }), SID, PID), null);
  const revisit = M.initialMeet(CTX, { move: "hide", partId: "5f2c9a0e-1b2c-4d5e-8f90-123456789abc" });
  assert.equal(S.keepRequest({ ...yes, session: { ...yes.session, partId: revisit.session.partId } }, SID, PID).partId, revisit.session.partId, "a revisit keeps that part");
  for (const f of ["feelTowardIds", "blendCheck", "handoffs", "steppedBack"]) assert.ok(!(f in keep), f);
  const worried = run(["find_something_else", { type: "find" }, "blend_notice", { type: "place", place: "chest" }, ...SHAPE, "age_now", "hide_voice_see",
    "feel_annoyed", "unblend_still", "later_yes"]);
  const cand = S.candidateRequest(worried, PID, SID);
  assert.deepEqual(cand, { id: PID, origin: "worried_part", moveIds: ["hide"], sessionId: SID });
  assert.deepEqual(C.validateCandidate(cand), { id: PID, origin: "worried_part", moveIds: ["hide"], sessionId: SID });
  assert.equal(S.candidateRequest(run(["keep_yes"], { state: full }), PID, SID), null);
  const page = read("src/pages/tools/MeetAPart.tsx");
  assert.match(page, /await keepPart\(keep\)/);
  assert.match(page, /await queuePartCandidate\(cand\)/);
});

test("PartFigure: the five numbers make the outline; null is a plain figure; room tokens only", () => {
  const plain = F.figurePath(null);
  assert.equal(F.figurePath([0.5, 0.5, 0.5, 0.5, 0.5]), plain, "0.5 is neutral");
  assert.notEqual(F.figurePath([1, 0.5, 0.5, 0.5, 0.5]), plain, "sharp changes the outline");
  assert.notEqual(F.figurePath([0.5, 0.5, 0.5, 0.5, 0]), plain, "hollow changes it");
  assert.equal(F.figurePath([1, 2]), plain, "malformed: plain");
  for (const sig of [null, [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [1, 0, 0, 1, 0]]) {
    const nums = F.figurePath(sig).match(/-?\d+(\.\d+)?/g).map(Number);
    assert.ok(nums.every((n) => n >= -2 && n <= 102), `inside the box: ${sig}`);
  }
  assert.deepEqual(F.vecToSig([-1, 0, 1, 0.5, -0.5]), [0, 0.5, 1, 0.75, 0.25]);
  assert.deepEqual(F.sigToVec([0, 0.5, 1, 0.75, 0.25]), [-1, 0, 1, 0.5, -0.5]);
  assert.equal(F.figureFill(null), "var(--color-border)");
  assert.match(F.figureFill([0.5, 1, 0.5, 0.5, 0.5]), /^color-mix\(in oklab, var\(--color-q-hu-fill\) 100%, var\(--color-q-lu-fill\)\)$/);
  assert.equal(F.figureFill([0.5, 1, 0.5, 0.5, 0.5], "var(--color-accent)"), "var(--color-accent)");
  const src = read("src/components/parts/PartFigure.tsx") + read("src/lib/partFigure.ts");
  assert.doesNotMatch(src, /#[0-9a-f]{3,6}\b|rgba?\(/i, "no literal colours");
  assert.match(read("src/components/parts/PartFigure.tsx"), /useReducedMotion\(\)[\s\S]*animate=\{reduce \? undefined/);
  const html = renderToStaticMarkup(h(PartFigure, { shapeSig: null, size: 40 }));
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /width="40"/);
});

test("LightHold: the angry card and Meet a part share one hold", () => {
  const card = read("src/components/parts/AngryPartCard.tsx");
  assert.match(card, /import \{ HoldButton, PartScene \} from '\.\/LightHold';/);
  assert.doesNotMatch(card, /function HoldButton|function PartScene/, "extracted, not copied");
  assert.match(card, /<HoldButton label=\{c\.hold\} ms=\{HOLD_MS\}/, "its 4 s vote is unchanged");
  const page = read("src/pages/tools/MeetAPart.tsx");
  assert.equal(page.match(/<LightHold /g)?.length, 2, "Thanks and the tender path");
  assert.match(read("dev/parts-harness.tsx"), /import \{ LightHold \} from '\.\.\/src\/components\/parts\/LightHold';/);
  assert.match(read("dev/parts-harness.tsx"), /import \{ PartFigure \} from '\.\.\/src\/components\/parts\/PartFigure';/);
});

test("no hard-coded copy: Meet a part's screens and page show only content, the person's words, and Back / Next", () => {
  const files = ["src/pages/tools/MeetAPart.tsx", ...readdirSync("src/components/parts/meet").map((f) => `src/components/parts/meet/${f}`)];
  const CHROME = new Set(["Back", "Next"]);
  const READ_ATTRS = new Set(["aria-label", "placeholder", "title", "alt", "label", "nextLabel", "holdLabel", "doneLabel", "sub"]);
  for (const f of files) {
    const sf = ts.createSourceFile(f, read(f), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const walk = (n) => {
      // Text a person reads: JSX text, string attributes, and string literals placed straight into JSX.
      if (ts.isJsxText(n) && /[A-Za-z]/.test(n.text)) assert.ok(CHROME.has(n.text.trim()), `${f}: "${n.text.trim()}"`);
      if (ts.isJsxAttribute(n) && n.initializer && ts.isStringLiteral(n.initializer) && READ_ATTRS.has(n.name.getText(sf))) {
        assert.ok(CHROME.has(n.initializer.text), `${f}: ${n.name.getText(sf)}="${n.initializer.text}"`);
      }
      if (ts.isJsxExpression(n) && n.expression && ts.isStringLiteral(n.expression) && n.parent && !ts.isJsxAttribute(n.parent)) {
        assert.ok(CHROME.has(n.expression.text), `${f}: {'${n.expression.text}'}`);
      }
      ts.forEachChild(n, walk);
    };
    walk(sf);
  }
  assert.match(read("src/components/parts/meet/MeetScreens.tsx"), /maxLength=\{max\}[\s\S]*font-serif/, "own words: a plain field, in the serif");
  assert.equal(S.MEET_OWN_WORDS_MAX, V.OWN_WORDS_MAX);
  assert.equal(S.MEET_NAME_MAX, K.DEFAULT_NAME_MAX);
  assert.equal(S.MEET_MAX_NON_SELF, V.DEFAULT_MAX_NON_SELF);
});
