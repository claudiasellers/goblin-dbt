// The parts accessibility pass (parts-a11y-pass). The full check runs the real components in Chromium
// (dev/review/a11y.mjs, not part of npm test: it needs the harness build); these pin what it found and
// fixed, so it can't quietly come back: focus never dropped to the page when a control goes away, no
// `disabled` under a focused control while it saves, polite announcements only, and a press-and-hold a
// keyboard or switch user can complete.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");
const { focusLost, focusLine, focusStepStart } = await importTs("src/components/parts/stepFocus.ts");

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
  const hold = read("src/components/parts/LightHold.tsx");
  assert.match(hold, /export const HOLD_TAP_MS = 350;/);
  assert.match(hold, /if \(byKey\.current && performance\.now\(\) - start\.current < HOLD_TAP_MS\) run\('auto'\);/, "a quick key is a tap");
  assert.match(hold, /if \(e\.detail !== 0\) return;/, "a click with no pointer or key behind it");
  assert.match(hold, /onBlur=\{cancelPress\}/, "blur ends a press, never the hands-free fill");
  assert.match(hold, /const cancelPress = \(\) => \{ swallowUp\.current = false; if \(mode\.current === 'press'\) letGo\(\); \};/);
  assert.match(hold, /data-hold=""/, "the checker finds every hold by it");
});

test("targets: the parts switch and the delete buttons are 44 px; Me's quiet links are at least 44 wide", () => {
  const settings = read("src/components/parts/PartsSettings.tsx");
  assert.match(settings, /role="switch"[\s\S]*?className="-my-\[11px\] -mr-0\.5 min-w-11 min-h-11/);
  assert.equal((settings.match(/className="min-h-11 px-/g) ?? []).length, 3, "Delete your parts, Delete them, Keep them");
  assert.match(read("src/components/me/PartsOfMe.tsx"), /const link = 'inline-flex items-center justify-center min-h-11 min-w-11 /);
});

test("the checker exists, is dev-only and names its check command", () => {
  const checker = read("dev/review/a11y.mjs");
  assert.match(checker, /npx vite build --config dev\/vite\.harness\.config\.ts/);
  assert.match(checker, /node dev\/review\/a11y\.mjs/);
  assert.doesNotMatch(read("package.json"), /a11y\.mjs/, "not in npm test: it needs the harness build and a browser");
});
