// Cope Ahead's closing screens (docs/design/cope-ahead.md, screens 5–7): Rehearse, Settle and KeepCard in
// src/components/tools/copeAhead/, presentational components the page (lane 1) mounts, and the square paper
// they share with Two pulls' keepsake (src/components/shared/PaperCard.tsx). Source pins: the behaviour is
// walked on the review page (dev/review/copeAheadClosing.tsx, check.mjs and a11y.mjs --only cope-ahead-closing).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f) => readFileSync(f, "utf8");
const DIR = "src/components/tools/copeAhead";
const FILES = ["Rehearse.tsx", "Settle.tsx", "KeepCard.tsx", "PlanSentence.tsx"].map((f) => `${DIR}/${f}`);
const CA = JSON.parse(read("src/data/content/cope-ahead.json")).content;
const importsOf = (src) => [...src.matchAll(/^import (?!type\b)[\s\S]*?from '([^']+)';/gm)].map((m) => m[1]);

test("the paper is shared: Two pulls' keepsake and the plan card both use PaperCard, which imports nothing from parts", () => {
  const paper = read("src/components/shared/PaperCard.tsx");
  for (const spec of importsOf(paper)) assert.doesNotMatch(spec, /parts/, spec);
  assert.match(paper, /aspect-square rounded-md bg-\[var\(--color-bg-elevated\)\]/);
  assert.match(paper, /boxShadow: '0 18px 40px -18px/);
  const pulls = read("src/components/parts/pulls/PullsScreens.tsx");
  assert.match(pulls, /<PaperCard label=\{`\$\{lines\[0\]\} \$\{lines\[1\]\}`\} focusOnMount data=\{\{ 'data-keepsake': '' \}\}>/);
  assert.doesNotMatch(pulls, /boxShadow/, "the keepsake keeps no copy of the paper");
  assert.match(read(`${DIR}/KeepCard.tsx`), /<PaperCard label=/);
});

test("no parts UI in the Cope Ahead components but the hold (as Wise mind's breath uses it); copy from cope-ahead.json", () => {
  for (const f of FILES) {
    for (const spec of importsOf(read(f))) {
      if (/components\/parts\//.test(spec) || /(^|\/)parts\//.test(spec)) assert.equal(spec, "../../parts/LightHold", `${f}: ${spec}`);
      assert.doesNotMatch(spec, /services\/parts|lib\/copeAhead$|copeAheadTool|copeAheadPlan/, `${f}: ${spec}`);
    }
    // Every screen string is read from the content: none of cope-ahead.json's lines is written in the code.
    const code = read(f).replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, "");
    for (const [k, v] of Object.entries(CA.copy)) {
      if (v.length > 6) assert.ok(!code.includes(v), `${f}: "${v}" (${k}) hard-coded`);
    }
    for (const b of CA.beats) assert.ok(!code.includes(b.text), `${f}: beat ${b.id} hard-coded`);
  }
});

test("Rehearse: one beat per tap, 7 under 6, pass 2 from beat 3 under the new problem, the panel brightens at the plan", () => {
  const src = read(`${DIR}/Rehearse.tsx`);
  assert.match(src, /1: \[\[1\], \[2\], \[3\], \[4\], \[5\], \[6, 7\]\],\s*2: \[\[3\], \[4\], \[5\], \[6, 7\]\],/);
  assert.match(src, /const PLAN_BEAT = 5;/);
  assert.match(src, /const bright = beats\[0\] >= PLAN_BEAT;/);
  assert.match(src, /pass === 1 \? copy\('rehearse_intro'\) : beats\[0\] === 3 \? copy\('rehearse_new_problem'\) : ''/);
  assert.match(src, /<div aria-live="polite"/);
  assert.match(src, /focusLine\(beat\.current\);/);
  assert.match(src, /const fade = reduce \? '' : 'transition-opacity/);
  assert.doesNotMatch(src, /setTimeout|setInterval/, "no timer");
  // The beats the screens read by order are the shipped ones.
  assert.deepEqual(CA.beats.map((b) => b.order).sort(), [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(CA.beats.find((b) => b.order === 3).text.includes("{moment}"));
  assert.ok(CA.beats.find((b) => b.order === 5).text.includes("{plan}"));
});

test("Settle: three holds then breath; 5-4-3-2-1 and I'm OK at once", () => {
  const src = read(`${DIR}/Settle.tsx`);
  assert.match(src, /export const SETTLE_BREATHS = 3;/);
  assert.match(src, /<HoldButton key=\{done\}/);
  assert.match(src, /if \(n >= SETTLE_BREATHS\) onChoose\('breath'\);/);
  assert.match(src, /onClick=\{\(\) => onChoose\('five_senses'\)\}/);
  assert.match(src, /onClick=\{\(\) => onChoose\('ok'\)\}/);
  assert.match(src, /data-breaths=\{done\}/);
  // Within the review's 4.4 s Space hold, as every hold in the app.
  assert.ok(Number(src.match(/SETTLE_HOLD_MS = (\d+)/)[1]) <= 4000);
});

test("KeepCard: the anchor only when set, a failed save keeps the buttons, then ask after and Done", () => {
  const src = read(`${DIR}/KeepCard.tsx`);
  assert.match(src, /\{anchorLine && <p /);
  assert.match(src, /\{keep !== 'kept' && \(/);
  assert.match(src, /\{keep === 'failed' && <p role="status"/);
  assert.match(src, /const answered = keep === 'kept' \|\| notNow;/);
  assert.match(src, /\{askAfter !== null && <button type="button" className=\{primaryButton\} onClick=\{onDone\}>/);
  // Saving keeps the button where focus is (aria-disabled, never disabled).
  assert.doesNotMatch(src, /[^-]disabled=\{/);
});

test("the review surface: every state the brief lists", () => {
  const h = read("dev/review/copeAheadClosing.tsx");
  for (const id of ["rehearse_1", "rehearse_2", "rehearse_long", "rehearse_2_plan", "rehearse_reduced", "settle_breath", "settle_five", "settle_ok",
    "keep_idle", "keep_saving", "keep_kept", "keep_failed", "keep_two_anchor", "keep_ask_yes", "keep_ask_no"]) assert.match(h, new RegExp(`id: '${id}'`), id);
  const long = h.match(/const LONG_MOMENT = '([^']*)'/)[1];
  assert.equal(long.length, CA.ownMax, "own words at the full length");
  assert.match(read("dev/review/surfaces.tsx"), /COPE_CLOSING_SURFACE, \/\/ lane 3/);
});
