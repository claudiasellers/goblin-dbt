// The parts accessibility pass (parts-a11y-pass). The full check runs the real components in Chromium
// (dev/review/a11y.mjs, not part of npm test: it needs the harness build); these pin what it found and
// fixed, so it can't quietly come back: focus never dropped to the page when a control goes away, no
// `disabled` under a focused control while it saves, polite announcements only, and a press-and-hold a
// keyboard or switch user can complete.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");
const { focusLost, focusLine, focusStepStart } = await importTs("src/components/parts/stepFocus.ts");
const { afterRemoval } = await importTs("src/lib/focusStart.ts");

/** A minimal element: tag, focusability, children found by querySelector in document order. */
function el(tag, { focusable = false, kids = [] } = {}) {
  const attrs = new Map();
  const node = {
    tag, kids, focused: 0,
    get tabIndex() { return attrs.has("tabindex") ? Number(attrs.get("tabindex")) : focusable ? 0 : -1; },
    hasAttribute: (a) => attrs.has(a),
    setAttribute: (a, v) => attrs.set(a, v),
    focus() { node.focused += 1; globalThis.document.activeElement = node; },
    querySelector(sel) {
      const tags = sel.split(",").map((s) => s.trim().split(/[[:]/)[0]);
      const walk = (n) => { for (const k of n.kids) { if (tags.includes(k.tag)) return k; const f = walk(k); if (f) return f; } return null; };
      return walk(node);
    },
  };
  return node;
}
const body = el("body");
const setActive = (a) => { globalThis.document = { body, documentElement: el("html"), activeElement: a }; };

test("focusStepStart: only when focus fell to the page; heading, else line, else control, else the root", () => {
  const h = el("h2"); const p = el("p"); const b = el("button", { focusable: true });
  setActive(body);
  assert.equal(focusLost(), true);
  focusStepStart(el("div", { kids: [p, h, b] }));
  assert.equal(h.focused, 1, "the heading first, wherever it sits");
  assert.equal(h.hasAttribute("tabindex"), true, "made focusable by script only (tabIndex -1)");

  setActive(body);
  const p2 = el("p");
  focusStepStart(el("div", { kids: [el("div", { kids: [p2] }), el("button", { focusable: true })] }));
  assert.equal(p2.focused, 1, "no heading: the first line");

  setActive(body);
  const b2 = el("button", { focusable: true });
  focusStepStart(el("div", { kids: [b2] }));
  assert.equal(b2.focused, 1);
  assert.equal(b2.hasAttribute("tabindex"), false, "a control keeps its own tab order");

  setActive(body);
  const empty = el("div");
  focusStepStart(empty);
  assert.equal(empty.focused, 1, "a row that folded away keeps focus where it was");

  const stays = el("button", { focusable: true });
  setActive(stays);
  const h3 = el("h3");
  focusStepStart(el("div", { kids: [h3] }));
  assert.equal(h3.focused, 0, "focus that is still somewhere (a Prompt took it, a control stayed) is left alone");

  setActive(null);
  assert.equal(focusLost(), true);
  focusLine(null); // no element: nothing to do
});

test("every parts surface that replaces a pressed control moves focus to what replaced it", () => {
  const uses = {
    "src/components/spine/PartTagRow.tsx": /useStepFocus\(root, state\)/,
    "src/components/parts/PartCheckbackCard.tsx": /useStepFocus\(root, aftercare\)/,
    "src/components/parts/TrailOfferCard.tsx": /useStepFocus\(root, splitting \? 'split' : evidence \? 'evidence' : 'offer'\)/,
    "src/components/parts/CopeAheadStep.tsx": /useStepFocus\(panel, view\)/,
    "src/components/parts/PartsSettings.tsx": /useStepFocus\(deleteArea, done \? 'done' : confirming \? 'confirm' : 'ask'\)/,
    "src/components/parts/PartLaterLine.tsx": /useStepFocus\(root, state === 'done'\)/,
    "src/components/parts/AngryPartCard.tsx": /useStepFocus\(laterRoot, laterState === 'done'\)/,
    "src/pages/tools/MeetAPart.tsx": /useStepFocus\(stepRoot, `\$\{phase\.k\}:\$\{st\.step\}:\$\{own\}`\)/,
  };
  for (const [f, re] of Object.entries(uses)) assert.match(read(f), re, f);
  // The tag row folds to an empty anchor, but only after it was shown: a second mount still renders nothing.
  const row = read("src/components/spine/PartTagRow.tsx");
  assert.match(row, /if \(state === 'gone' && shown\) return <div ref=\{root\} tabIndex=\{-1\}/);
  assert.match(row, /const \[shown\] = useState\(state !== 'gone'\);/);
});

test("a control that stays while it saves is aria-disabled, never disabled (disabled drops keyboard focus)", () => {
  assert.match(read("src/components/parts/PartLaterLine.tsx"), /aria-disabled=\{state === 'sending' \|\| undefined\}/);
  assert.match(read("src/components/parts/AngryPartCard.tsx"), /aria-disabled=\{laterState === 'sending' \|\| undefined\} onClick=\{askLater\}/);
  const card = read("src/components/parts/PartCheckbackCard.tsx");
  assert.match(card, /aria-disabled=\{busy \|\| undefined\}/);
  assert.match(card, /if \(busy\) return;/);
  const offer = read("src/components/parts/TrailOfferCard.tsx");
  assert.doesNotMatch(offer, /[^-]disabled=\{busy/);
  assert.match(offer, /const run = async \(fn: \(\) => Promise<void>\) => \{\s*if \(busy\) return;/);
  const cope = read("src/components/parts/CopeAheadStep.tsx");
  assert.match(cope, /disabled=\{!ready\} aria-disabled=\{saving \|\| undefined\}/);
  const settings = read("src/components/parts/PartsSettings.tsx");
  assert.doesNotMatch(settings, /disabled=\{deleting\}/);
  assert.match(settings, /if \(deleting\) return;/);
});

test("announcements are polite: the cope save failure sits in a status region that is there before it; nothing assertive", () => {
  const cope = read("src/components/parts/CopeAheadStep.tsx");
  assert.match(cope, /<div role="status">\s*\{failed && \(\s*<p data-testid="cope-save-failed"/);
  const files = [
    ...readdirSync("src/components/parts").filter((f) => f.endsWith(".tsx")).map((f) => `src/components/parts/${f}`),
    "src/components/parts/meet/MeetScreens.tsx", "src/components/spine/PartTagRow.tsx", "src/components/me/PartsOfMe.tsx",
    "src/components/insights/PartsReflect.tsx", "src/pages/tools/MeetAPart.tsx",
  ];
  for (const f of files) assert.doesNotMatch(read(f), /role="alert"|aria-live="assertive"/, f);
});

test("press and hold: Space held, or a quick key / a switch or screen-reader activation fills it hands-free", () => {
  // The gesture lives in useHoldGesture (shared with the skill player's holdRing); HoldButton spreads it.
  const hold = read("src/hooks/useHoldGesture.ts");
  assert.match(hold, /export const HOLD_TAP_MS = 350;/);
  assert.match(hold, /if \(byKey\.current && performance\.now\(\) - start\.current < HOLD_TAP_MS\) run\('auto'\);/, "a quick key is a tap");
  assert.match(hold, /if \(e\.detail !== 0\) return;/, "a click with no pointer or key behind it");
  assert.match(hold, /onBlur: cancelPress/, "blur ends a press, never the hands-free fill");
  assert.match(hold, /const cancelPress = \(\) => \{ swallowUp\.current = false; if \(modeRef\.current === 'press'\) letGo\(\); \};/);
  const button = read("src/components/parts/LightHold.tsx");
  assert.match(button, /data-hold="" aria-describedby=\{hintId\} \{\.\.\.handlers\}/, "HoldButton spreads the shared gesture");
  assert.match(button, /data-hold=""/, "the checker finds every hold by it");
});

test("targets: the parts switch and the delete buttons are 44 px; Me's quiet links are at least 44 wide", () => {
  const settings = read("src/components/parts/PartsSettings.tsx");
  // The switch is shared with Me's parts-off card (PartsSwitch).
  assert.match(read("src/components/parts/PartsSwitch.tsx"), /role="switch"[\s\S]*?className="-my-\[11px\] -mr-0\.5 min-w-11 min-h-11/);
  for (const f of ["src/components/parts/PartsSettings.tsx", "src/components/parts/PartsOffCard.tsx"]) assert.match(read(f), /<PartsSwitch /, f);
  assert.equal((settings.match(/className="min-h-11 px-/g) ?? []).length, 3, "Delete your parts, Delete them, Keep them");
  assert.match(read("src/components/me/PartsOfMe.tsx"), /const link = 'inline-flex items-center justify-center min-h-11 min-w-11 /);
});

test("the checker exists, is dev-only and names its check command", () => {
  const checker = read("dev/review/a11y.mjs");
  assert.match(checker, /npx vite build --config dev\/vite\.harness\.config\.ts/);
  assert.match(checker, /node dev\/review\/a11y\.mjs/);
  assert.doesNotMatch(read("package.json"), /a11y\.mjs/, "not in npm test: it needs the harness build and a browser");
});

// parts-a11y-followups

test("the hold hint: one draft line, the description of every press-and-hold, never part of its name", async () => {
  const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
  const { HOLD_HINT } = await importTs("src/data/partsTypes.ts");
  assert.equal(HOLD_HINT, "hold_hint");
  assert.deepEqual([fixture.prompts.hold_hint.flow, fixture.prompts.hold_hint.step], ["common", "hold"]);
  assert.match(fixture.prompts.hold_hint.copy, /^Hold to fill it, or press once and wait\.$/);
  // Required by both surfaces that show a hold, in both of the angry card's wordings.
  const { angryPromptIds } = await importTs("src/lib/angryPart.ts");
  const { meetPromptIds } = await importTs("src/lib/meetAPartSave.ts");
  for (const ids of [angryPromptIds(true), angryPromptIds(false), meetPromptIds(), meetPromptIds({ paused: true })]) assert.ok(ids.includes(HOLD_HINT));
  const { HoldButton } = await importTs("src/components/parts/LightHold.tsx");
  const html = renderToStaticMarkup(h(HoldButton, { label: "Hold", hint: "Hold to fill it.", ms: 10, onProgress() {}, onLetGo() {}, onComplete() {} }));
  const id = html.match(/<span id="([^"]+)" hidden="">Hold to fill it\.<\/span><button[^>]*aria-describedby="([^"]+)"/);
  assert.ok(id, html);
  assert.equal(id[1], id[2], "the button is described by the hint");
  assert.doesNotMatch(html.slice(html.indexOf("<button")), /Hold to fill it/, "outside the button: not in its name");
  assert.match(read("src/components/parts/AngryPartCard.tsx"), /<HoldButton label=\{c\.hold\} hint=\{c\.holdHint\}/);
  assert.equal((read("src/pages/tools/MeetAPart.tsx").match(/holdHint=\{P\(HOLD_HINT\)\}/g) ?? []).length, 2, "both of Meet a part's holds");
});

test("no hard-coded controls: the angry card's Back and Next and Meet a part's Back / Next / Done come from content", async () => {
  const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
  const label = (flow, id) => Object.values(fixture.options[flow]).flat().find((o) => o.id === id)?.label;
  assert.deepEqual(["angry_back", "angry_vote_next"].map((id) => label("angry", id)), ["Back", "Next"]);
  assert.deepEqual(["meet_back", "meet_next", "meet_finish"].map((id) => label("meet", id)), ["Back", "Next", "Done"]);
  const { meetChrome, MEET_REQUIRED_OPTIONS } = await importTs("src/lib/meetAPartSave.ts");
  assert.deepEqual(meetChrome({ options: fixture.options }), { back: "Back", next: "Next", finish: "Done" });
  assert.deepEqual(meetChrome({ options: {} }), { back: "", next: "", finish: "" }, "not shipped: the gate keeps the visit dark");
  for (const id of ["meet_back", "meet_next", "meet_finish"]) assert.ok(MEET_REQUIRED_OPTIONS.includes(id), id);
  const card = read("src/components/parts/AngryPartCard.tsx");
  assert.match(card, /\{c\.back\}/);
  assert.match(card, /\{c\.voteNext\}/);
  assert.doesNotMatch(card, />\s*(Back|Next)\s*</);
});

test("Today: after a card goes, the card that took its place, else the new last one, else Today's heading", () => {
  assert.equal(afterRemoval(0, 2), 0, "the next card slid into its place");
  assert.equal(afterRemoval(1, 2), 1);
  assert.equal(afterRemoval(2, 2), 1, "it was the last: the new last one");
  assert.equal(afterRemoval(-1, 3), 0, "unknown: the first");
  assert.equal(afterRemoval(0, 0), null, "none left: Today's heading");
  const stack = read("src/components/today/TodayStack.tsx");
  assert.match(stack, /<div ref=\{root\} onFocus=\{onFocus\} /, "the stack knows which card had focus");
  assert.match(stack, /const done = \(id: string\) => \{ setLeaving\(\{ id, at: focusedAt \}\); today\.drop\(id\); today\.refresh\(\); \};/);
  assert.match(stack, /if \(!gone \|\| !leaving \|\| !focusLost\(\)\) return;/, "only once it's gone, and only when focus went with it");
  assert.match(stack, /focusStepStart\(i === null \? todayHeading\(\) : left\[i\]\);/);
  assert.match(stack, /document\.getElementById\('today-panel-heading'\), document\.getElementById\('today-sheet-heading'\)/);
  assert.match(read("src/components/today/TodayPanel.tsx"), /<h2 id="today-panel-heading"/);
  assert.match(read("src/components/today/TodayButton.tsx"), /<h2 id="today-sheet-heading"/);
  // The last card gone closes the panel or the sheet with the stack (same commit): the page's own start.
  assert.match(stack, /const fallback = useFocusFallback\(todayHeading\);/);
  assert.match(stack, /onFocus=\{onFocus\} onBlur=\{fallback\.onBlur\}/);
  assert.match(stack, /const onFocus = \(e: FocusEvent<HTMLDivElement>\) => \{ fallback\.onFocus\(\);/);
  const hook = read("src/hooks/useFocusFallback.ts");
  assert.match(hook, /if \(held\.current\) requestAnimationFrame\(\(\) => \{ if \(focusLost\(\)\) focusStepStart\(to\.current\(\)\); \}\);/, "only on unmount, only while it held focus");
  assert.match(hook, /if \(to && !e\.currentTarget\.contains\(to\)\) inside\.current = false;/, "a removed control's blur (nowhere to go) isn't leaving");
});

test("Reflect's trails: saving is aria-disabled, never disabled (lane 3 hands focus on after Done / Remove)", () => {
  const c = read("src/components/insights/TrailsReflect.tsx");
  assert.doesNotMatch(c, /\sdisabled=\{/, "disabled under a focused control drops it");
  assert.equal((c.match(/aria-disabled=\{busy/g) ?? []).length, 4, "the answer chips, Done, Not now and the ×");
  assert.match(c, /const close = async \(c: KnownPartReviewClose\) => \{\s*if \(busy\) return;/);
  assert.match(c, /const remove = async \(offerId: string\) => \{\s*if \(busy\) return;/);
});

