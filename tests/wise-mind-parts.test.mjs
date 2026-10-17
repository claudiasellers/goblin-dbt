// Wise mind's step back, the parts-aware form (docs/design/wise-mind.md, 2p): the copy, the gate, the
// room's state and what it writes (part ids only), the `?a=&b=` entry, the safety banner, and how the
// page gets it (src/hooks/useStepBackSlot.tsx, ToolPage). The server's side (the wise_mind tag source,
// the wise_mind candidate origin) is pinned in functions/test/unit/parts.test.cjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture, withoutIds } from "./lib/partsContentFixture.mjs";

const read = (f) => readFileSync(f, "utf8");
const W = await importTs("src/lib/wiseMindParts.ts");
const { StepBackRoom } = await importTs("src/components/tools/wiseMind/parts/StepBackRoom.tsx");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const shipped = JSON.parse(read("src/data/content/parts.json")).content;
const ALL = partsFromFixture(fixture, () => true);

const A = "00000000-0000-4000-8000-000000000101";
const B = "00000000-0000-4000-8000-000000000102";
const C = "00000000-0000-4000-8000-000000000103";
const part = (id, o = {}) => ({ id, name: `Part ${id.slice(-3)}`, status: "active", tender: false, moveIds: [], firstPlace: null, shapeSig: null,
  lastVisitedAt: null, pausedUntil: null, safety: false, meta: {}, ...o });

test("copy: every 2p line and screen 5's parts line, in flow wise_mind (signed off 17 Oct), in the review pack", () => {
  for (const id of W.WISE_MIND_PARTS_PROMPTS) assert.equal(fixture.prompts[id]?.flow, "wise_mind", id);
  const options = Object.values(fixture.options.wise_mind ?? {}).flat().map((o) => o.id);
  for (const id of W.WISE_MIND_PARTS_OPTIONS) assert.ok(options.includes(id), id);
  assert.equal(fixture.prompts.wm_pushed.copy, "A part might still be close.");
  assert.equal(fixture.prompts.wm_step_back.copy, "Ask everyone to take one step back.");
  assert.equal(fixture.prompts.wm_wont_line.copy, "That's fine. It might need its own time.");
  assert.ok(W.WISE_MIND_PARTS_REQUIRED.prompts.includes("hold_hint") && W.WISE_MIND_PARTS_REQUIRED.prompts.includes("part_unnamed"));
  assert.match(read("scripts/parts/review.mjs"), /id: 'wise_mind_parts', title: 'Wise mind\\'s step back'/);
});

test("the gate: parts on, an active or resting part, and the copy shipped; anything else is the two minds", () => {
  const parts = [part(A)];
  assert.equal(W.partsFormOn({ partsOn: true, parts, content: ALL }), true);
  assert.equal(W.partsFormOn({ partsOn: true, parts: [part(A, { status: "resting" })], content: ALL }), true);
  assert.equal(W.partsFormOn({ partsOn: false, parts, content: ALL }), false, "parts off");
  assert.equal(W.partsFormOn({ partsOn: true, parts: [], content: ALL }), false, "no parts");
  assert.equal(W.partsFormOn({ partsOn: true, parts: null, content: ALL }), false, "the slice didn't load");
  assert.equal(W.partsFormOn({ partsOn: true, parts, content: null }), false, "no copy");
  // Signed off 17 Oct (Claudia: ship it all): the shipped file opens the parts form; any one line out, the two minds.
  assert.equal(W.partsFormOn({ partsOn: true, parts, content: shipped }), true, "the shipped file");
  for (const id of [...W.WISE_MIND_PARTS_REQUIRED.prompts, ...W.WISE_MIND_PARTS_REQUIRED.options]) {
    assert.equal(W.partsFormOn({ partsOn: true, parts, content: withoutIds(shipped, id) }), false, `shipped file without ${id}`);
  }
  for (const id of ["wm_who", "wm_unmet", "hold_hint"]) {
    assert.equal(W.partsFormOn({ partsOn: true, parts, content: partsFromFixture(fixture, (x) => x !== id) }), false, id);
  }
  assert.equal(W.wiseMindPartsCopy(shipped).wm_unmet, "A part I haven't met");
  assert.equal(W.wiseMindPartsCopy(ALL).wm_unmet, "A part I haven't met");
});

test("the page: the slot's gate, waiting only for a parts-on person, the room lazy, screen 5's line from the slot", () => {
  const hook = read("src/hooks/useStepBackSlot.tsx");
  assert.match(hook, /useProfileContext\('wise-mind', \{ enabled: partsOn \}\)/, "the declared slice, read only with parts on");
  assert.match(hook, /partsFormOn\(\{ partsOn, parts, content: loaded \}\)/);
  assert.match(hook, /const pending = partsOn && \(ctx\.status === 'loading' \|\| content === null\);/, "parts off never waits");
  assert.match(hook, /return \{ Room, pushedLine: copy\[PUSHED_PARTS_LINE\] \};/);
  const page = read("src/pages/ToolPage.tsx");
  assert.match(page, /const \{ pending, slot \} = useStepBackSlot\(\);\s*if \(pending\) return <ToolLoading \/>;\s*return <Suspense fallback=\{<ToolLoading \/>\}><LazyWiseMind stepBack=\{slot\} \/><\/Suspense>;/);
  assert.equal(W.PUSHED_PARTS_LINE, "wm_pushed");
  const types = read("functions/src/profile/types.ts");
  assert.match(types, /'wise-mind': \['parts'\],/, "PROFILE_NEEDS: the parts slice (name, shape, tender, status, safety)");
  assert.match(read("functions/src/profile/slices.ts"), /\.name, \.tender, \.shapeSig[\s\S]*AS safety/);
});

test("?a=&b=: only the caller's active or resting parts, each once, in order", () => {
  const parts = [part(A), part(B, { status: "resting" })];
  assert.deepEqual(W.presetPartIds([A, B], parts), [A, B]);
  assert.deepEqual(W.presetPartIds([B, A, B], parts), [B, A]);
  assert.deepEqual(W.presetPartIds([A, C], parts), [A], "not theirs");
  assert.deepEqual(W.presetPartIds(["unmet", "x"], parts), []);
  const screen = read("src/components/tools/wiseMind/parts/StepBackScreen.tsx");
  assert.match(screen, /stepBackStart\(presetPartIds\(preset, sliceParts\)\)/, "both figures already placed");
  assert.deepEqual(W.stepBackStart([A, B]).placed, [A, B]);
});

test("the room's state: place and take back before the step back; after, It won't step back; nothing locks", () => {
  let s = W.stepBackStart();
  s = W.stepBackReducer(s, { type: "toggle", id: A });
  s = W.stepBackReducer(s, { type: "toggle", id: W.UNMET });
  s = W.stepBackReducer(s, { type: "toggle", id: B });
  s = W.stepBackReducer(s, { type: "toggle", id: B });
  assert.deepEqual(s.placed, [A, W.UNMET]);
  s = W.stepBackReducer(s, { type: "held" });
  assert.deepEqual(W.stepBackReducer(s, { type: "toggle", id: C }).placed, [A, W.UNMET], "after the step back a tap opens, never places");
  assert.equal(W.stepBackReducer(s, { type: "open", id: C }).open, null, "only a placed figure opens");
  s = W.stepBackReducer(s, { type: "wont", id: W.UNMET });
  assert.deepEqual([s.stillClose, s.open], [[W.UNMET], W.UNMET]);
  assert.equal(W.stepBackReducer(W.stepBackStart(), { type: "unmet_later" }).unmetLater, false);
  s = W.stepBackReducer(s, { type: "unmet_later" });
  assert.equal(s.unmetLater, true);
  // ext.wm: kept part ids only, never UNMET or a name
  assert.deepEqual(W.stepBackExt({ ...s, stillClose: [A, W.UNMET] }), { partIds: [A], stillCloseIds: [A] });
  // where they sit: near the light, then the edge; one that won't step back stays near
  const near = W.placedSpots({ placed: [A, B], stillClose: [] }, 0).get(A);
  const edge = W.placedSpots({ placed: [A, B], stillClose: [] }, 1).get(A);
  const stays = W.placedSpots({ placed: [A, B], stillClose: [A] }, 1).get(A);
  const dist = (p) => Math.hypot(p.x - 0.5, p.y - 0.5);
  assert.ok(Math.abs(dist(near) - W.NEAR) < 1e-9 && Math.abs(dist(edge) - W.EDGE) < 1e-9 && Math.abs(dist(stays) - W.NEAR) < 1e-9);
});

test("the tag write: one wise_mind tag per placed kept part on this visit's session, after the step back", () => {
  let n = 0;
  const s = { ...W.stepBackStart([A, W.UNMET, B]), held: true };
  assert.deepEqual(W.stepBackTags(s, "ts-1", () => `t${n++}`), [
    { id: "t0", partId: A, toolSessionId: "ts-1", source: "wise_mind" },
    { id: "t1", partId: B, toolSessionId: "ts-1", source: "wise_mind" },
  ]);
  const screen = read("src/components/tools/wiseMind/parts/StepBackScreen.tsx");
  assert.match(screen, /if \(sessionId\) for \(const t of stepBackTags\(state, sessionId, newId\)\) tagPart\(t\)\.catch\(/, "unsaved visit: no tags; a failed tag never stops it");
  assert.match(screen, /onDone\(stepBackExt\(state\)\);/);
  assert.match(screen, /onNoOne=\{\(\) => onDone\(\{ partIds: \[\], stillCloseIds: \[\] \}\)\}/);
});

test("the candidate write: A part I haven't met → Meet it another time queues one, origin wise_mind, on that tap", () => {
  assert.deepEqual(W.stepBackCandidate("c1"), { id: "c1", origin: "wise_mind", moveIds: [] });
  const screen = read("src/components/tools/wiseMind/parts/StepBackScreen.tsx");
  assert.match(screen, /queuePartCandidate\(stepBackCandidate\(newId\(\)\)\)\.then\(\(\) => dispatch\(\{ type: 'unmet_later' \}\)\)/, "done line only once it's queued");
  // a kept part's Meet it another time: Meet a part for it
  assert.deepEqual(W.stepBackMeetLink(A), { pathname: "/tool/meet-a-part", state: { parts: { trailheadKind: "wise_mind", partId: A } } });
  for (const f of ["functions/src/parts/sessionTypes.ts", "functions/src/parts/keepTypes.ts", "functions/src/parts/tagTypes.ts"]) {
    assert.match(read(f), /'wise_mind'/, f);
  }
});

const copy = W.wiseMindPartsCopy(ALL);
const roomParts = W.roomParts([part(A, { name: "the one who chases" }), part(B, { name: "the little one", tender: true }), part(C, { name: "the guard", safety: true })], ALL, copy);
const noop = () => {};
const render = (state) => renderToStaticMarkup(h(MemoryRouter, null, h(StepBackRoom, {
  parts: roomParts, copy, state, onToggle: noop, onNoOne: noop, onHeld: noop, onOpen: noop, onWont: noop, onUnmetLater: noop, onDone: noop, onUseMinds: noop,
})));

test("the room: the shelf, A part I haven't met, No one in particular, the hold once placed, the two minds link", () => {
  const who = render(W.stepBackStart());
  for (const t of ["Who&#x27;s here about this?", "the one who chases", "A part I haven&#x27;t met", "No one in particular", "Use the two minds instead"]) assert.ok(who.includes(t), t);
  assert.ok(!who.includes("Hold to ask"), "nothing placed: no hold");
  assert.match(who, /data-den-tender/, "tender covered on the shelf");
  const placed = render(W.stepBackStart([A, B]));
  assert.ok(placed.includes("Ask everyone to take one step back.") && placed.includes("Hold to ask"));
  assert.ok(!placed.includes("No one in particular"));
  assert.match(placed, /data-step-back-figure="[^"]*101"/);
  const held = render({ ...W.stepBackStart([A]), held: true });
  assert.ok(held.includes("From here, what&#x27;s the wise next step?") && !held.includes("Hold to ask"));
  const wont = render({ ...W.stepBackStart([A]), held: true, stillClose: [A], open: A });
  assert.ok(wont.includes("That&#x27;s fine. It might need its own time."));
  assert.match(wont, /href="\/tool\/meet-a-part"[^>]*>Meet it another time/, "a kept part: a link to Meet a part");
  const unmet = render({ ...W.stepBackStart([W.UNMET]), held: true, stillClose: [W.UNMET], open: W.UNMET });
  assert.match(unmet, /<button[^>]*>Meet it another time<\/button>/, "the unmet one: the host's candidate");
  assert.ok(render({ ...W.stepBackStart([W.UNMET]), held: true, stillClose: [W.UNMET], open: W.UNMET, unmetLater: true }).includes("It&#x27;s in Me for another time."));
});

test("the safety banner: compact under the room only while a part with the flag is placed", () => {
  assert.equal(W.showSafety(W.stepBackStart([A]), roomParts), false);
  assert.equal(W.showSafety(W.stepBackStart([C]), roomParts), true);
  assert.doesNotMatch(render(W.stepBackStart([A, B])), /crisis-banner-compact/);
  assert.doesNotMatch(render(W.stepBackStart()), /crisis-banner-compact/, "on the shelf it isn't in the room");
  const flagged = render(W.stepBackStart([C]));
  assert.match(flagged, /crisis-banner-compact/);
  assert.ok(flagged.indexOf("data-step-back-room") < flagged.indexOf("crisis-banner-compact"), "under the room");
});

test("Me: turning parts on from the card moves focus to Parts of me, not the page", () => {
  const me = read("src/components/me/MeSection.tsx");
  assert.match(me, /const partsArrived = useCallback\(\(el: HTMLElement \| null\) => \{ if \(el\) focusStepStart\(el\); \}, \[\]\);/);
  assert.match(me, /ref=\{a\.id === 'my_parts' && turnedOnHere \? partsArrived : undefined\}/);
});

test("from Two pulls: Ask wise mind what's next lands on the step back with both figures already placed", async () => {
  const S = await importTs("src/lib/twoPullsSave.ts");
  const WM = await importTs("src/lib/wiseMind.ts");
  const wise = JSON.parse(read("src/data/content/wise-mind.json")).content;
  const link = S.wiseMindLink(ALL, { entry: { kind: "parts", aId: A, bId: B } }, { session: { kept: true } }, true);
  const url = new URL(link.to, "https://x.invalid");
  assert.equal(url.pathname, "/tool/wise-mind");
  const entry = WM.parseWiseEntry(url.search, wise);
  // Screen 1: What to do next first, never pre-selected; then 2p, not the two minds.
  assert.equal(WM.orderedQuestions(wise, entry)[0].id, "wm_q_next");
  const start = WM.initialWise("parts");
  assert.equal(start.questionId, null);
  assert.equal(WM.wiseNext(start, { type: "question", id: "wm_q_next" }, wise).step, "stepBack");
  assert.equal(WM.wiseNext(start, { type: "skip", toStepBack: entry.presetPartIds.length > 0 }, wise).step, "stepBack", "skip still opens the room");
  assert.equal(WM.wiseNext(start, { type: "skip" }, wise).step, "dropIn", "no parts brought: skip goes to the practice");
  assert.equal(WM.wiseNext(WM.initialWise("minds"), { type: "skip", toStepBack: true }, wise).step, "dropIn", "the two minds form never opens the room");
  assert.match(read("src/pages/tools/WiseMind.tsx"), /send\(\{ type: 'skip', toStepBack: entry\.presetPartIds\.length > 0 \}\)/);
  // The room: both of the person's parts near the light, the hold showing.
  const state = W.stepBackStart(W.presetPartIds(entry.presetPartIds, [part(A), part(B)]));
  assert.deepEqual(state.placed, [A, B]);
  const html = render(state);
  for (const id of [A, B]) assert.ok(html.includes(`data-step-back-figure="${id}"`), id);
  assert.ok(html.includes("Hold to ask"));
});
