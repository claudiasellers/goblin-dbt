// PR-C2 (D-08): Help me now interim. A safe step and two direction-split links; no check-in, no
// routing call (a guessed quadrant could show the crisis banner to someone who never reported risk).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const help = await importTs("src/lib/spine/helpNow.ts");
const micro = await importTs("src/data/microSteps.ts");
const tools = await importTs("functions/src/spine/tools.ts");

test("uses the universally safe fallback set and two links that split direction", () => {
  const steps = micro.getMicroStepsForPattern(help.HELP_NOW_MICRO_STEP_SET);
  assert.ok(steps.length >= 2);
  assert.ok(steps.every((s) => s.id.startsWith("fb-")));
  assert.deepEqual([...help.HELP_NOW_TOOL_IDS], ["cool-down", "five-senses", "crisis-kit"]);
  assert.equal(tools.SPINE_TOOLS["cool-down"].closeKind, "regulation_down");
  assert.equal(tools.SPINE_TOOLS["five-senses"].closeKind, "orienting");
  assert.deepEqual(help.helpNowLinkState("h"), { spine: { entry: "checkin_grid", hostSessionId: "h" }, skillCtx: { band: "flooded" } });
  assert.deepEqual(help.helpNowLinkState(null), { spine: { entry: "checkin_grid" }, skillCtx: { band: "flooded" } });
  assert.ok(tools.RESERVED_ENTRIES["help-now"].includes("checkin_grid"));
});

test("Help me now opens the interim; it never saves a check-in or calls the router", () => {
  const checkIn = readFileSync("src/pages/CheckIn.tsx", "utf8");
  const fn = checkIn.slice(checkIn.indexOf("function handleHelpMeNow()"), checkIn.indexOf("function handleSomaticEntry()"));
  assert.match(fn, /setStep\('help_now'\)/);
  assert.doesNotMatch(fn, /analyzeAndShowResult|getStateAndTools|saveCheckIn/);
  // Done goes back to the screen Help now was opened from (the square or the words).
  assert.match(checkIn, /\{step === 'help_now' && <HelpNowInterim onDone=\{\(\) => setStep\(helpReturn\)\} \/>\}/);
  assert.match(fn, /setHelpReturn\(step === 'word' \? 'word' : 'emotion'\)/);
  const comp = readFileSync("src/components/checkin/HelpNowInterim.tsx", "utf8");
  assert.doesNotMatch(comp, /getStateAndTools|saveCheckIn|CrisisBanner/);
  assert.match(comp, /toolId: 'help-now', entry: 'checkin_grid'/);
});
