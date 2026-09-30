// Wave-0 harm patches (Build Plan – Phase A, A0-1 and A0-2).
//
// The repo has no React component test setup, so the render decisions live in
// pure functions under src/lib/ (tested here via the same importTs transpile
// pattern as opposite-action.test.mjs) and the components are pinned by static
// checks on their source.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

async function importTs(path) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
}

const read = (path) => readFileSync(path, "utf8");

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const { coolDownView, coolDownTimerAllowed } = await importTs("src/lib/coolDown.ts");
const { isCrisisFlag, resultSections, bailoutSections } = await importTs(
  "src/lib/crisisBanner.ts",
);

// ---------------------------------------------------------------- Cool Down

test("coolDownView gates cold water on the face behind the self-check", () => {
  assert.equal(coolDownView("cold-water", "unasked"), "check");
  assert.equal(coolDownView("cold-water", "clear"), "cold");
  assert.equal(coolDownView("cold-water", "skip"), "exhale");
  assert.equal(coolDownView("ice-cubes", "unasked"), "technique");
  assert.equal(coolDownView("ice-cubes", "skip"), "technique");
  for (const check of ["unasked", "clear", "skip"]) {
    assert.equal(coolDownView(null, check), "none");
  }
});

test("the Cool Down timer can't start from the self-check or with nothing selected", () => {
  assert.equal(coolDownTimerAllowed("check"), false);
  assert.equal(coolDownTimerAllowed("none"), false);
  for (const view of ["cold", "exhale", "technique"]) {
    assert.equal(coolDownTimerAllowed(view), true);
  }
});

test("Cool Down: cold-water copy sits behind the 'cold' view, breath-hold optional, 'not sure' skips", () => {
  const src = read("src/pages/tools/CoolDown.tsx");
  assert.match(src, /view === 'cold' \? COLD_WATER_FACE/);
  assert.match(src, /view === 'exhale' \? \{ id: 'exhale', \.\.\.LONG_EXHALE \}/);
  // Breath-hold is optional, never prescribed.
  assert.doesNotMatch(src, /instruction: 'Hold your breath/);
  assert.match(src, /Hold your breath if that\\'s okay, or breathe out slowly/);
  // Every self-check item from D-06 / DT PRD §3.5 item 1.
  for (const item of [
    /heart medication/,
    /Fainting/,
    /Eating disorder or very low weight/,
    /Pregnant/,
    /Raynaud/,
    /Been drinking or using today/,
  ]) {
    assert.match(src, item);
  }
  assert.match(src, /skip: 'One of these, or not sure'/);
  assert.match(src, /setColdCheck\('skip'\)/);
  // Never persisted.
  assert.doesNotMatch(src, /localStorage|sessionStorage/);
});

// ------------------------------------------------------------ Crisis banner

const crisis = { type: "crisis" };

test("isCrisisFlag matches only the crisis type", () => {
  assert.equal(isCrisisFlag(crisis), true);
  assert.equal(isCrisisFlag({ type: "clinical_referral" }), false);
  assert.equal(isCrisisFlag(undefined), false);
  assert.equal(isCrisisFlag(null), false);
});

test("crisis flag: banner on top, pattern, tools, Done and bailout still render below it", () => {
  const sections = resultSections({
    variant: "standard",
    safetyFlag: crisis,
    patternId: "emotional_flooding",
    toolCount: 2,
    canAddMoreDetail: true,
  });
  assert.deepEqual(sections, [
    "crisis_banner",
    "pattern",
    "tools",
    "done",
    "add_detail",
    "bailout",
  ]);
});

test("crisis flag with no tools still leaves Done (no dead end)", () => {
  const sections = resultSections({
    variant: "standard",
    safetyFlag: crisis,
    patternId: "emotional_flooding",
    toolCount: 0,
  });
  assert.deepEqual(sections, ["crisis_banner", "pattern", "done"]);
});

test("no crisis flag: no banner, and the result is otherwise identical", () => {
  for (const safetyFlag of [undefined, null, { type: "clinical_referral" }]) {
    const withFlag = resultSections({
      variant: "standard",
      safetyFlag: crisis,
      patternId: "acute_alarm",
      toolCount: 2,
    });
    const without = resultSections({
      variant: "standard",
      safetyFlag,
      patternId: "acute_alarm",
      toolCount: 2,
    });
    assert.equal(without.includes("crisis_banner"), false);
    assert.deepEqual(
      without.filter((s) => s !== "clinical_note"),
      withFlag.filter((s) => s !== "crisis_banner"),
    );
  }
  assert.deepEqual(
    resultSections({
      variant: "standard",
      safetyFlag: { type: "clinical_referral" },
      patternId: "acute_alarm",
      toolCount: 1,
    }),
    ["pattern", "clinical_note", "tools", "done", "bailout"],
  );
});

test("low-energy result: banner on top, guided activity, tools, Done and bailout below", () => {
  assert.deepEqual(
    resultSections({
      variant: "low_energy",
      safetyFlag: crisis,
      patternId: "conservation_freeze",
      toolCount: 1,
      hasGuidedActivity: true,
      canAddMoreDetail: true,
    }),
    ["crisis_banner", "pattern", "guided_activity", "tools", "done", "add_detail", "bailout"],
  );
  // Bailout is available from a guided activity alone (unchanged rule).
  assert.deepEqual(
    resultSections({
      variant: "low_energy",
      safetyFlag: crisis,
      patternId: "conservation_freeze",
      toolCount: 0,
      hasGuidedActivity: true,
    }),
    ["crisis_banner", "pattern", "guided_activity", "done", "bailout"],
  );
});

test("the micro-step screen keeps the banner above the step when the flag is crisis", () => {
  assert.deepEqual(bailoutSections(crisis), ["crisis_banner", "micro_step"]);
  assert.deepEqual(bailoutSections(undefined), ["micro_step"]);
  assert.deepEqual(bailoutSections({ type: "clinical_referral" }), ["micro_step"]);
});

test("both result screens render CrisisBanner above the result instead of returning a crisis screen", () => {
  for (const path of [
    "src/components/checkin/StateResult.tsx",
    "src/components/checkin/LowEnergyStateResult.tsx",
  ]) {
    const src = read(path);
    assert.match(src, /import \{ CrisisBanner \} from '\.\.\/safety\/CrisisBanner'/, path);
    assert.match(src, /resultSections\(\{/, path);
    assert.match(src, /bailoutSections\(safetyFlag\)\.includes\('crisis_banner'\) && <CrisisBanner \/>/, path);
    // No early return on the crisis flag.
    assert.doesNotMatch(src, /safetyFlag\.type === 'crisis'\)\s*\{\s*return/, path);
    // In the main view the banner comes before the pattern label and the tools.
    const main = src.slice(src.lastIndexOf('<div className="py-4">'));
    const banner = main.indexOf("{has('crisis_banner') && <CrisisBanner />}");
    assert.ok(banner > 0, `${path}: banner in main view`);
    assert.ok(banner < main.indexOf("{has('tools')"), `${path}: banner above tools`);
    assert.ok(banner < main.indexOf("{has('bailout')"), `${path}: banner above bailout`);
    assert.ok(banner < main.indexOf("Done"), `${path}: banner above Done`);
  }
});

test("CrisisBanner keeps today's resources and shows the user-facing line, not SafetyFlag.action", () => {
  const src = read("src/components/safety/CrisisBanner.tsx");
  assert.match(src, /href="tel:988"/);
  assert.match(src, /href="sms:741741\?body=HELLO"/);
  assert.match(src, /Text HOME to 741741/);
  assert.match(src, /you don't have to carry it alone/);
  for (const path of filesUnder("src/components")) {
    assert.doesNotMatch(read(path), /safetyFlag\.action/, path);
  }
});

// -------------------------------------------------------------- Five senses

test("Five senses keeps eyes open", () => {
  const src = read("src/pages/tools/FiveSenses.tsx");
  assert.doesNotMatch(src, /close your eyes/i);
  assert.match(src, /eyes open/);
});

// ------------------------------------------------------ A0-2: DT copy fixes

const { startWave, updateWave } = await importTs("src/lib/urgeSurfing.ts");

test("Urge Surfing: the peak starts at the entered reading and only rises", () => {
  // Old bug: peak initialised at 7 whatever the user entered.
  let wave = startWave(3);
  assert.deepEqual(wave, { current: 3, peak: 3 });
  wave = updateWave(wave, 5);
  assert.deepEqual(wave, { current: 5, peak: 5 });
  wave = updateWave(wave, 2);
  assert.deepEqual(wave, { current: 2, peak: 5 });
  assert.ok(wave.peak >= wave.current);
  assert.deepEqual(updateWave(startWave(9), 4), { current: 4, peak: 9 });
});

test("Urge Surfing: no duration promise or praise; peak state comes from startWave/updateWave", () => {
  const src = read("src/pages/tools/UrgeSurfing.tsx");
  assert.doesNotMatch(src, /20-30 minutes/);
  assert.doesNotMatch(src, /makes you stronger/);
  assert.match(src, /startWave\(intensity\)/);
  assert.match(src, /updateWave\(/);
  assert.doesNotMatch(src, /setPeakIntensity\(\d+\)/);
});

test("Pause: T is 'Take a step back', S is 'Stop. Hands still', one long slow breath out", () => {
  const src = read("src/pages/tools/Pause.tsx");
  assert.match(src, /title: 'Take a step back'/);
  assert.match(src, /Stop\. Hands still for a moment\./);
  assert.match(src, /one long, slow breath out/i);
  assert.doesNotMatch(src, /Freeze/);
  assert.doesNotMatch(src, /deep breaths?/i);
  assert.doesNotMatch(src, /title: 'Take a breath'/);
});

test("Cool Down: no cold shower option, whenToUse has no numbers", async () => {
  const src = read("src/pages/tools/CoolDown.tsx");
  assert.doesNotMatch(src, /cold-shower|cold shower/i);
  const { tools } = await importTs("src/data/tools.ts");
  const coolDown = tools.find((t) => t.id === "cool-down");
  assert.ok(coolDown);
  assert.doesNotMatch(coolDown.whenToUse, /\d/);
  assert.equal(coolDown.whenToUse, "When your body is too loud to think.");
});

test("DEAR MAN debrief 'Cool down first' goes to an existing tool", async () => {
  const src = read("src/pages/tools/DearMan.tsx");
  assert.doesNotMatch(src, /\/tool\/tipp/);
  assert.match(src, /navigate\('\/tool\/cool-down'\)/);
  const { tools } = await importTs("src/data/tools.ts");
  assert.ok(tools.some((t) => t.id === "cool-down"));
});
