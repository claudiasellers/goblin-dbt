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
const PM = await importTs("src/lib/partsOfMe.ts");
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

test("listed only with parts on and its copy shipped (the gate ToolPage opens it with); never in the intents", () => {
  const tool = T.getToolById("meet-a-part");
  assert.deepEqual([tool.name, tool.module, tool.listed, tool.bare], ["Meet a part", "mindfulness", "parts", true]);
  assert.ok(!T.getToolsByModule("mindfulness").some((t) => t.id === "meet-a-part"), "parts off: not listed");
  assert.ok(!T.getToolsByModule("mindfulness", { parts: false }).some((t) => t.id === "meet-a-part"));
  assert.ok(!T.listedTools().some((t) => t.id === "meet-a-part"));
  assert.ok(T.getToolsByModule("mindfulness", { parts: true }).some((t) => t.id === "meet-a-part"), "parts on and ready: listed");
  assert.deepEqual(T.listedTools({ parts: true }).map((t) => t.id), T.tools.filter((t) => t.listed !== false).map((t) => t.id), "nothing else is held back (Two pulls is link-only)");
  assert.deepEqual(T.listedTools().map((t) => t.id), T.tools.filter((t) => t.id !== "meet-a-part" && t.id !== "two-pulls").map((t) => t.id));
  assert.ok(!T.intents.some((i) => i.toolId === "meet-a-part"));
  assert.deepEqual(T.tools.filter((t) => t.listed !== undefined).map((t) => t.id), ["meet-a-part", "two-pulls"]);
  assert.equal(T.getToolById("two-pulls").listed, false, "Two pulls: by link only, never listed");
  // Lists read only listed tools: Tools.tsx through getToolsByModule, with `parts` from Meet a part's own gate.
  const tools = read("src/pages/Tools.tsx");
  assert.match(tools, /import \{ getToolsByModule, intents \} from '\.\.\/data\/tools'/);
  assert.match(tools, /const parts = useToolGate\('meet-a-part'\) === 'open';/, "false while the gate loads: no flicker");
  assert.match(tools, /getToolsByModule\(mod\.id, \{ parts \}\)/);
  // A visit that starts from the list says so ('tools'); every other card carries no state.
  assert.match(tools, /<ToolCard key=\{tool\.id\} tool=\{tool\} state=\{tool\.id === 'meet-a-part' \? toolsMeetLink\(\)\.state : undefined\} \/>/);
  assert.deepEqual(S.parseMeetEntry(PM.toolsMeetLink().state), { trailheadKind: "tools", partId: null, candidateId: null, moveId: null });
  assert.equal(PM.toolsMeetLink().pathname, "/tool/meet-a-part");
  assert.equal(V.validateStartPartSession(S.startRequest(SID, { move: "hide", partId: null }, S.parseMeetEntry(PM.toolsMeetLink().state))).trailheadKind, "tools", "the server takes it");
  assert.match(read("src/components/ToolCard.tsx"), /to=\{`\/tool\/\$\{tool\.id\}`\}\s+state=\{state\}/);
  assert.match(tools, /\{intents\.map\(/, "the intents are the fixed list");
  const page = read("src/pages/ToolPage.tsx");
  assert.match(page, /'meet-a-part': MeetAPart,/);
  assert.match(page, /if \(!tool \|\| gate === 'closed'\) \{/, "parts off or copy missing: the existing not-found state");
  const gate = read("src/hooks/useToolGate.ts");
  assert.match(gate, /if \(!on\) return loading \? 'loading' : 'closed';/, "parts off: closed");
  assert.match(gate, /return ready\.ok \? 'open' : 'closed';/);
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
  assert.match(page, /getPartsEntry\(entry\.partId\)\.then\(\(g\) => \{ if \(live\) setGate\(g\); \}\)\.catch\(\(\) => \{ if \(live\) setGate\(null\); \}\)/);
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
  // 5d, with another part kept: the pick is stored by id.
  const FRONT_CTX = S.meetContext(ALL, { open: "flow" }, false, [{ id: PID, name: "Ash" }]);
  others.push(S.toPatch(run([...FULL.slice(0, 18), { type: "front", partId: PID }], { ctx: FRONT_CTX })));
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
  assert.match(card, /<HoldButton label=\{c\.hold\} hint=\{c\.holdHint\} ms=\{HOLD_MS\}/, "its 4 s vote is unchanged; the hold hint describes it");
  const page = read("src/pages/tools/MeetAPart.tsx");
  assert.equal(page.match(/<LightHold /g)?.length, 2, "Thanks and the tender path");
  assert.match(read("dev/parts-harness.tsx"), /import \{ LightHold \} from '\.\.\/src\/components\/parts\/LightHold';/);
  assert.match(read("dev/parts-harness.tsx"), /import \{ PartFigure \} from '\.\.\/src\/components\/parts\/PartFigure';/);
});

test("no hard-coded copy: Meet a part's screens and page show only content and the person's words (Back / Next / Done are meet_back / meet_next / meet_finish)", () => {
  const files = ["src/pages/tools/MeetAPart.tsx", ...readdirSync("src/components/parts/meet").map((f) => `src/components/parts/meet/${f}`)];
  const CHROME = new Set();
  const READ_ATTRS = new Set(["aria-label", "placeholder", "title", "alt", "label", "nextLabel", "backLabel", "fieldLabel", "holdLabel", "holdHint", "doneLabel", "sub"]);
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
});

test("limits: the shipped policy's two numbers when signed off, else the pinned defaults (the policy rows' own)", () => {
  assert.equal(S.MEET_NAME_MAX, K.DEFAULT_NAME_MAX);
  assert.equal(S.MEET_MAX_NON_SELF, V.DEFAULT_MAX_NON_SELF);
  assert.deepEqual([S.MEET_NAME_MAX, S.MEET_MAX_NON_SELF], [fixture.policy.nameMaxChars, fixture.policy.maxNonSelfAnswers], "pinned to PartsPolicy");
  assert.deepEqual(S.meetLimits(SHIPPED), { nameMaxChars: 40, maxNonSelfAnswers: 2 }, "the policy is a draft today: no limits key");
  assert.ok(!("limits" in SHIPPED));
  assert.deepEqual(ALL.limits, { nameMaxChars: 40, maxNonSelfAnswers: 2 }, "approved: shipped");
  assert.deepEqual(S.meetLimits({ limits: { nameMaxChars: 30, maxNonSelfAnswers: 1 } }), { nameMaxChars: 30, maxNonSelfAnswers: 1 });
  assert.deepEqual(S.meetLimits({ limits: { nameMaxChars: 0, maxNonSelfAnswers: "x" } }), { nameMaxChars: 40, maxNonSelfAnswers: 2 });
  assert.equal(S.meetContext({ ...ALL, limits: { nameMaxChars: 40, maxNonSelfAnswers: 1 } }, { open: "flow" }, false).maxNonSelfAnswers, 1);
  assert.match(read("src/pages/tools/MeetAPart.tsx"), /max=\{meetLimits\(parts\)\.nameMaxChars\}/);
});

test("the last screen: meet_done and Done, whichever way the visit ended; required by the ready check", () => {
  assert.equal(fixture.prompts.meet_done.copy, "You can come back to this any time.");
  assert.deepEqual([fixture.prompts.meet_done.flow, fixture.prompts.meet_done.step], ["meet", "close"]);
  assert.ok(S.meetPromptIds().includes("meet_done"));
  const page = read("src/pages/tools/MeetAPart.tsx");
  assert.match(page, /\{P\('meet_done'\)\}[\s\S]*<Link to=\{doneTarget\(entry\)\}[^>]*>\{chrome\.finish\}<\/Link>/);
  assert.equal(fixture.options.meet.chrome.find((o) => o.id === 'meet_finish').label, "Done");
  assert.ok(S.MEET_REQUIRED_OPTIONS.includes('meet_finish'));
  assert.equal(page.match(/\{finale\}|step === 'done' && finale/g)?.length, 3, "after the close, after P2's later, and after P2 on entry");
  assert.equal(S.doneTarget(S.parseMeetEntry({})), "/profile");
  assert.equal(S.doneTarget(S.parseMeetEntry({ parts: { trailheadKind: "angry_card" } })), "/");
  assert.equal(S.doneTarget(S.parseMeetEntry({ parts: { trailheadKind: "tools" } })), "/tools", "back to the Tools list");
});

test("too many parts lately: one line on the first real screen of a new part's visit, never a block", () => {
  const clear = { open: "clear", reasons: [] };
  assert.equal(S.showTooMany({ ...clear, tooMany: true }, S.parseMeetEntry({})), true);
  assert.equal(S.showTooMany(clear, S.parseMeetEntry({})), false);
  assert.equal(S.showTooMany(null, S.parseMeetEntry({})), false, "a failed gate call");
  assert.equal(S.showTooMany({ ...clear, tooMany: true }, S.parseMeetEntry({ parts: { partId: PID } })), false, "a visit to a kept part");
  assert.deepEqual(S.entryPlan({ ...clear, tooMany: true }), { open: "flow" }, "it never changes what opens");
  assert.equal(fixture.prompts[S.TOO_MANY_PROMPT].copy, "You don't need to get to know everyone at once.");
  const page = read("src/pages/tools/MeetAPart.tsx");
  assert.match(page, /\{tooMany && firstScreen && promptCopy\(parts, TOO_MANY_PROMPT\) && <p role="status"/);
  assert.match(page, /setFirstScreen\(false\); setSt\(/, "gone after the first answer");
});

test("a paused part (its check-back said Louder): one gentle line on the first real screen, required only when paused; never a lock", () => {
  const clear = { open: "clear", reasons: [] };
  const kept = S.parseMeetEntry({ parts: { partId: PID } });
  assert.equal(S.isPaused({ ...clear, paused: true }, kept), true);
  assert.equal(S.isPaused(clear, kept), false);
  assert.equal(S.isPaused(null, kept), false, "a failed gate call");
  assert.equal(S.isPaused({ ...clear, paused: true }, S.parseMeetEntry({})), false, "only for the part this visit opens on");
  assert.deepEqual(S.entryPlan({ ...clear, paused: true }), { open: "flow" }, "it never changes what opens");
  assert.deepEqual(S.entryPlan({ open: "p2", band: "flooded", crisis: false, reasons: ["checkin_flooding"], paused: true }),
    { open: "p2", band: "flooded", blank: false, crisis: false }, "P2 still comes first");

  const p = fixture.prompts[S.PAUSED_PROMPT];
  assert.deepEqual([p.flow, p.step, p.copy], ["meet", "entry", "Things got louder after last time. Going gently is fine, or come back another day."]);
  assert.ok(!S.meetPromptIds().includes(S.PAUSED_PROMPT));
  assert.ok(S.meetPromptIds({ paused: true }).includes(S.PAUSED_PROMPT));
  const noLine = partsFromFixture(fixture, (x) => x !== S.PAUSED_PROMPT);
  assert.equal(S.meetReady(noLine, ROUNDS), true, "an ordinary visit doesn't need it");
  assert.equal(S.meetReady(noLine, ROUNDS, { paused: true }), false, "a paused visit does");
  assert.equal(S.meetReady(ALL, ROUNDS, { paused: true }), true);

  const page = read("src/pages/tools/MeetAPart.tsx");
  assert.match(page, /getPartsEntry\(entry\.partId\)/, "the gate is asked about this visit's part");
  assert.match(page, /if \(paused && !meetReady\(content\.parts, content\.rounds, \{ paused \}\)\) return null;/);
  assert.match(page, /\{paused && firstScreen && <p role="status" className=\{secondaryText\}>\{P\(PAUSED_PROMPT\)\}<\/p>\}/);
  assert.match(page, /offerCheckback\(st, \{[^}]*paused \}\)/, "the close offers no check-back question for a paused part");
  assert.match(read("src/services/parts.ts"), /getPartsEntryFn\(partId \? \{ partId \} : \{\}\)/);
});

test("the check-back question at the close: kept or revisited, opened, shipped, type on; never after later, danger or a paused part", () => {
  const spine = JSON.parse(read("src/data/content/spine.json")).content;
  const type = spine.followUpTypes.find((t) => t.id === S.CHECKBACK_TYPE);
  assert.ok(type, "lane 2's follow-up type ships");
  const done = (session = {}, extra = {}) => ({ step: "done", later: false, session: { kept: true, partId: null, danger: false, ...session }, ...extra });
  const o = { content: ALL, type: { ...type, enabled: true }, opened: true, paused: false };
  assert.equal(S.offerCheckback(done(), o), true, "kept this visit");
  assert.equal(S.offerCheckback(done({ kept: null, partId: PID }), o), true, "a visit to a part already kept");
  assert.equal(S.offerCheckback(done({ kept: false }), o), false, "nothing to check back with");
  assert.equal(S.offerCheckback(done({}, { step: "close" }), o), false, "only after the orienting close");
  assert.equal(S.offerCheckback(done({}, { later: true }), o), false, "not after P2's later");
  assert.equal(S.offerCheckback(done({ danger: true }), o), false, "not after a danger ending");
  assert.equal(S.offerCheckback(done(), { ...o, paused: true }), false, "never for a paused part");
  assert.equal(S.offerCheckback(done(), { ...o, opened: false }), false, "no record on the server");
  assert.equal(S.offerCheckback(done(), { ...o, type: { ...type, enabled: false } }), false, "type off");
  assert.equal(S.offerCheckback(done(), { ...o, type: null }), false);
  assert.equal(S.offerCheckback(done(), { ...o, content: SHIPPED }), false, "copy not signed off (today)");
  assert.equal(S.offerCheckback(done(), { ...o, content: partsFromFixture(fixture, (x) => x !== S.CHECKBACK_NO) }), false);
  assert.deepEqual([fixture.prompts[S.CHECKBACK_PROMPT].copy, ...fixture.options.meet.close.map((x) => x.id)],
    ["Check back with it tomorrow?", S.CHECKBACK_YES, S.CHECKBACK_NO]);

  // Yes: due in the type's window (tomorrow 10:00 local).
  const now = new Date(2026, 9, 16, 21, 0, 0);
  const req = S.checkbackRequest(type, SID, PID, now);
  const due = new Date(req.dueAt);
  assert.deepEqual([due.getDate(), due.getHours(), due.getMinutes()], [17, 10, 0]);
  assert.deepEqual(Object.keys(req).sort(), ["dueAt", "id", "sessionId"]);
  assert.equal(S.checkbackRequest({ ...type, window: {} }, SID, PID, now), null);

  const page = read("src/pages/tools/MeetAPart.tsx");
  assert.match(page, /const askCheckback = offerCheckback\(st, \{ content: parts, type: checkType, opened, paused \}\);/);
  assert.match(page, /id === CHECKBACK_YES \? checkbackRequest\(checkType, newId\(\), psId, new Date\(\)\) : null;/, "only the yes schedules");
  assert.match(page, /if \(req\) enqueue\(async \(\) => \{ if \(await started\.current\) await schedulePartCheckback\(req\); \}\);/, "after the visit's saves and keep");
  assert.match(page, /\{\(askCheckback \|\| checkback\) && \(<>\s*<Prompt>\{P\(CHECKBACK_PROMPT\)\}<\/Prompt>/);
});

test("5d: optional copy (skipped, never the visit), named parts only, the pick saved by id and checked by lane 2's validator", () => {
  const known = [{ id: PID, name: "Ash" }, { id: SID, name: null }, { id: "5c2c9a0e-1b2c-4d5e-8f90-123456789abc", name: "  " }];
  assert.deepEqual(S.frontParts(known), [PID], "only parts with a name, in the slice's order");
  assert.deepEqual(S.meetContext(ALL, { open: "flow" }, false, known).frontParts, [PID]);
  assert.equal(S.meetContext(ALL, { open: "flow" }, false, []).frontParts, undefined, "no other part: no 5d");
  for (const id of [...S.MEET_FRONT_REQUIRED.prompts, ...S.MEET_FRONT_REQUIRED.options]) {
    const missing = partsFromFixture(fixture, (x) => x !== id);
    assert.equal(S.frontReady(missing), false, `without ${id}`);
    assert.equal(S.meetContext(missing, { open: "flow" }, false, known).frontParts, undefined, `without ${id}: 5d is skipped`);
    assert.equal(S.meetReady(missing, ROUNDS), true, `without ${id}: the visit still opens`);
  }
  assert.ok(!S.meetPromptIds().includes(S.FRONT_PROMPT) && !S.MEET_REQUIRED_OPTIONS.some((o) => o.startsWith("front_")), "never in the visit's own gate");
  const ctx = S.meetContext(ALL, { open: "flow" }, false, known);
  const at = run(FULL.slice(0, 18), { ctx });
  assert.equal(at.step, "front");
  assert.equal(S.STEP_PART.front, "guards");
  const patch = S.toPatch(run([{ type: "front", partId: PID }], { ctx, state: at }));
  assert.equal(patch.frontOfPartId, PID);
  assert.equal(V.validateSavePartSession({ id: SID, patch }).props.frontOfPartId, PID);
  for (const id of [S.FRONT_NONE, S.FRONT_NOT_SURE]) assert.ok(!("frontOfPartId" in S.toPatch(run([id], { ctx, state: at }))), `${id}: nothing saved`);
  // The page: the names as chips, then the two options; TooMuchLink as on every screen.
  const page = read("src/pages/tools/MeetAPart.tsx");
  assert.match(page, /meetContext\(parts, plan, start\.named, known\)/);
  assert.match(page, /case 'front': \{[\s\S]*?frontChoices\(s, ctx\)\.map\(\(id\) => <Chip key=\{id\} own label=\{byId\.get\(id\)\?\.name \?\? ''\} onClick=\{\(\) => send\(\{ type: 'front', partId: id \}\)\} \/>\)/);
  assert.match(page, /\{!p2Open && step !== 'done' && tooMuch\}/);
});
