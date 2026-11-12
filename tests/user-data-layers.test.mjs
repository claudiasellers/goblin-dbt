// PR-S1: the three data layers as code (functions/src/userdata/*), their constraints, the backfill,
// and the lint that keeps every :UserData write labelled with its layer.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { importTs } from "./lib/importTs.mjs";
import { splitStatements } from "../scripts/load-graph.mjs";

const { USER_DATA, LAYER_LABEL, ASK_FRESH_FIELDS, isAskFreshField, exportKeyFor, labelsOf } =
  await importTs("functions/src/userdata/layers.ts");
const { GUARDS, writable, toolSessionState } = await importTs("functions/src/userdata/lifecycle.ts");

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
export const functionSources = () => walk("functions/src").filter((f) => f.endsWith(".ts"));

test("every registered label has a layer; every non-system label an exportAs, unique", () => {
  const keys = [];
  for (const [label, d] of Object.entries(USER_DATA)) {
    assert.ok(["log", "profile", "system"].includes(d.layer), label);
    assert.match(d.rel, /^[A-Z_]+$/, label);
    if (d.layer !== "system") { assert.ok(d.exportAs, `${label} lacks exportAs`); keys.push(d.exportAs); }
    for (const c of d.children ?? []) assert.ok(USER_DATA[c], `${label} child ${c} is not registered`);
  }
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(exportKeyFor(["CheckIn", "UserData", "LogRecord"]), "checkIns");
  assert.equal(exportKeyFor(["PushToken", "UserData", "System"]), null);
  assert.deepEqual(labelsOf("profile").sort(), ["DenSnapshot", "MyPattern", "OwnLine", "Part", "PartLink", "Person", "ProfileFact"]);
  assert.deepEqual(LAYER_LABEL, { log: "LogRecord", profile: "ProfileItem", system: "System" });
});

test("every registered label has a unique constraint on key in constraints.cypher", () => {
  const ddl = readFileSync("schema/constraints.cypher", "utf8");
  for (const label of Object.keys(USER_DATA)) {
    assert.match(ddl, new RegExp(`FOR \\(\\w+:${label}\\) REQUIRE \\w+\\.key IS UNIQUE`), label);
  }
  assert.match(ddl, /CREATE INDEX user_data_owner IF NOT EXISTS FOR \(n:UserData\) ON \(n\.ownerId\)/);
});

test("ask-fresh fields: the plan's list, prefixed band families, never bandIntensity", () => {
  for (const f of ["band", "bandSource", "bandAt", "bandJson", "bandAtStart", "bandAtStartSource", "bandAtEnd",
    "thenVsNow", "thenVsNowDir", "actedOnUrge", "urgeIds", "fitsFacts", "wiseMindAnswer", "readiness", "eventIds",
    "feelTowardIds", "blendCheck"]) {
    assert.ok(isAskFreshField(f), f);
  }
  for (const f of ["bandIntensity", "quietHours", "name", "status", "emotionIds"]) assert.ok(!isAskFreshField(f), f);
  assert.ok(ASK_FRESH_FIELDS.includes("thenVsNowDir"));
});

test("parts (docs/design/parts.md): PartSession and PartCandidate are log, Part is profile; exported, deleted, retained by layer", () => {
  assert.deepEqual(USER_DATA.PartSession, { layer: "log", rel: "HAS_PART_SESSION", exportAs: "partSessions" });
  assert.deepEqual(USER_DATA.PartCandidate, { layer: "log", rel: "HAS_PART_CANDIDATE", exportAs: "partCandidates" });
  assert.deepEqual(USER_DATA.Part, { layer: "profile", rel: "HAS_PART", exportAs: "parts" });
  assert.deepEqual(USER_DATA.PartRevisit, { layer: "log", rel: "HAS_PART_REVISIT", exportAs: "partRevisits" });
  assert.equal(exportKeyFor(["PartRevisit", "UserData", "LogRecord"]), "partRevisits");
  assert.match(readFileSync("schema/constraints.cypher", "utf8"),
    /^CREATE CONSTRAINT part_revisit_key IF NOT EXISTS FOR \(n:PartRevisit\) REQUIRE n\.key IS UNIQUE;$/m);
  assert.match(readFileSync("functions/src/parts/delete.ts", "utf8"), /PARTS_DESIGN_LABELS = \[[^\]]*'PartRevisit'/, "deleteMyParts covers PartRevisit");
  // Say something to it: a log record, created once, deleted with the parts.
  assert.deepEqual(USER_DATA.PartMessage, { layer: "log", rel: "HAS_PART_MESSAGE", exportAs: "partMessages" });
  assert.equal(exportKeyFor(["PartMessage", "UserData", "LogRecord"]), "partMessages");
  assert.match(readFileSync("schema/constraints.cypher", "utf8"),
    /^CREATE CONSTRAINT part_message_key IF NOT EXISTS FOR \(n:PartMessage\) REQUIRE n\.key IS UNIQUE;$/m);
  assert.match(readFileSync("functions/src/parts/delete.ts", "utf8"), /PARTS_DESIGN_LABELS = \[[^\]]*'PartMessage'/, "deleteMyParts covers PartMessage");
  assert.equal(exportKeyFor(["PartSession", "UserData", "LogRecord"]), "partSessions");
  assert.equal(exportKeyFor(["PartCandidate", "UserData", "LogRecord"]), "partCandidates");
  assert.equal(exportKeyFor(["Part", "UserData", "ProfileItem"]), "parts");
  assert.ok(labelsOf("log").includes("PartSession") && labelsOf("log").includes("PartCandidate"));
  assert.ok(!labelsOf("log").includes("Part"));
  // Export and delete find every :UserData node by ownerId, whatever its label; retention deletes
  // :LogRecord only, so PartSession / PartCandidate expire and a kept Part never does.
  const ed = readFileSync("functions/src/userdata/exportDelete.ts", "utf8");
  assert.match(ed, /MATCH \(n:UserData \{ownerId: \$uid\}\) WHERE NOT n:System\s+RETURN labels\(n\)/, "export is by ownerId");
  assert.match(ed, /MATCH \(n:UserData \{ownerId: \$uid\}\)\s+CALL \{ WITH n DETACH DELETE n \}/, "delete is by ownerId");
  const retention = ed.slice(ed.indexOf("export async function applyRetention"));
  assert.match(retention, /MATCH \(n:LogRecord \{ownerId: \$uid\}\)/);
  assert.doesNotMatch(retention, /ProfileItem|:Part\b/);
  assert.ok(!isAskFreshField("partId") && !isAskFreshField("stopReason"));
});

test("lint: every :UserData write in functions/src carries its layer label", () => {
  const offenders = [];
  for (const f of functionSources()) {
    const lines = readFileSync(f, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (!/\b(SET|CREATE|MERGE)\b/.test(line)) return;
      for (const m of line.matchAll(/\w:UserData\b(?!:(?:LogRecord|ProfileItem|System)\b)/g)) {
        offenders.push(`${f}:${i + 1}: ${m[0]}`);
      }
      // A write that labels a node :LogRecord etc. must also label it :UserData.
      for (const m of line.matchAll(/(\w+)((?::\w+)*):(LogRecord|ProfileItem|System)\b/g)) {
        if (!/:UserData$/.test(m[2])) offenders.push(`${f}:${i + 1}: ${m[0]} without :UserData`);
      }
    });
  }
  assert.deepEqual(offenders, []);
});

test("lint: every registered label written with a layer label uses its registered layer", () => {
  for (const f of functionSources()) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/\((\w+):(\w+):UserData:(LogRecord|ProfileItem|System)\b/g)) {
      const d = USER_DATA[m[2]];
      assert.ok(d, `${f}: ${m[2]} is written as :UserData but not registered in layers.ts`);
      assert.equal(LAYER_LABEL[d.layer], m[3], `${f}: ${m[2]}`);
    }
  }
});

const H = 3_600_000;
const now = Date.parse("2026-10-01T12:00:00Z");
const iso = (dh) => new Date(now + dh * H).toISOString();

test("finalise-once: CheckIn", () => {
  assert.equal(writable("CheckIn", "upsert", { schemaVersion: 2, resultShownAt: iso(-1) }, now), true);
  assert.equal(writable("CheckIn", "upsert", { schemaVersion: 2, resultShownAt: iso(-3) }, now), false, "2 h after the result");
  assert.equal(writable("CheckIn", "upsert", { schemaVersion: 2, nextActionKind: "done" }, now), false, "next action is terminal");
  assert.equal(writable("CheckIn", "upsert", { schemaVersion: 1 }, now), false, "legacy check-ins are frozen");
  assert.equal(writable("CheckIn", "upsert", { schemaVersion: 2, pendingFullSave: true, nextActionKind: "tool" }, now), true,
    "a next-action stub waits for its full save");
  assert.equal(writable("CheckIn", "upsert", { schemaVersion: 2 }, now), true);
});

test("finalise-once: ToolSession, FollowUp, PatternOffer, ToolUsage, SkillPractice", () => {
  assert.equal(writable("ToolSession", "close", { status: "open", startedAt: iso(-30) }, now), true, "close whatever its age");
  assert.equal(writable("ToolSession", "close", { status: "completed" }, now), false);
  assert.equal(writable("ToolSession", "answer", { status: "completed", endedAt: iso(-11) }, now), true);
  assert.equal(writable("ToolSession", "answer", { status: "completed", endedAt: iso(-13) }, now), false);
  assert.equal(writable("ToolSession", "answer", { status: "completed", endedAt: iso(-1), answeredAt: iso(-1) }, now), false);
  assert.equal(writable("ToolSession", "answer", { status: "completed", endedAt: iso(-1), outcomeAskDismissed: true }, now), false);
  assert.equal(writable("ToolSession", "answer", { status: "open", startedAt: iso(-3) }, now), true, "abandoned sessions can be answered");
  assert.equal(writable("FollowUp", "update", { status: "scheduled" }, now), true);
  for (const s of ["done", "partly", "didnt", "dismissed", "cancelled"]) assert.equal(writable("FollowUp", "update", { status: s }, now), false);
  assert.equal(writable("PatternOffer", "answer", { status: "offered" }, now), true);
  assert.equal(writable("PatternOffer", "answer", { status: "declined" }, now), false);
  assert.equal(writable("ToolUsage", "outcome", { outcome: null }, now), true);
  assert.equal(writable("ToolUsage", "outcome", { outcome: "helped" }, now), false);
  assert.equal(writable("SkillPractice", "any", {}, now), false);
  assert.equal(writable("PartSession", "save", { status: "open" }, now), true);
  for (const s of ["saved", "completed", "stopped", "exited_early"]) assert.equal(writable("PartSession", "save", { status: s }, now), false);
  assert.equal(writable("PartSession", "keep", { status: "open" }, now), true, "keep from an open session");
  assert.equal(writable("PartSession", "keep", { status: "saved", savedAt: iso(-11) }, now), true, "keep within 12 h of the save");
  assert.equal(writable("PartSession", "keep", { status: "saved", savedAt: iso(-13) }, now), false);
  assert.equal(writable("PartCandidate", "accept", { status: "open" }, now), true);
  for (const s of ["accepted", "declined"]) assert.equal(writable("PartCandidate", "accept", { status: s }, now), false);
  assert.equal(writable("PartCandidate", "dismiss", { status: "open" }, now), true);
  for (const s of ["accepted", "dismissed"]) assert.equal(writable("PartCandidate", "dismiss", { status: s }, now), false);
  assert.equal(writable("ToolSession", "showLine", { status: "open", startedAt: iso(-30) }, now), true, "a beat inside an open session");
  assert.equal(writable("ToolSession", "showLine", { status: "completed", endedAt: iso(-11) }, now), true);
  assert.equal(writable("ToolSession", "showLine", { status: "completed", endedAt: iso(-13) }, now), false);
  assert.equal(toolSessionState({ status: "open", startedAt: iso(-3) }, now), "abandoned");
  assert.equal(toolSessionState({ status: "open", startedAt: iso(-1) }, now), "open");
  assert.equal(toolSessionState({ status: "exited_early" }, now), "exited_early");
});

test("the Cypher guards encode the same rules", () => {
  assert.match(GUARDS.CheckIn.upsert("c"), /c\.pendingFullSave = true/);
  assert.match(GUARDS.CheckIn.upsert("c"), /c\.nextActionKind IS NULL/);
  assert.match(GUARDS.CheckIn.upsert("c"), /duration\(\{hours: 2\}\)/);
  assert.equal(GUARDS.ToolSession.close("ts"), "ts.status = 'open'");
  assert.match(GUARDS.ToolSession.answer("ts"), /duration\(\{hours: 12\}\)/);
  assert.match(GUARDS.ToolSession.showLine("ts"), /^\(ts\.status = 'open' OR [\s\S]*duration\(\{hours: 12\}\)\)$/);
  assert.equal(GUARDS.FollowUp.update("f"), "f.status = 'scheduled'");
  assert.equal(GUARDS.PatternOffer.answer("o"), "o.status = 'offered'");
  assert.equal(GUARDS.ToolUsage.outcome("tu"), "tu.outcome IS NULL");
  assert.equal(GUARDS.PartSession.save("ps"), "ps.status = 'open'");
  assert.equal(GUARDS.PartSession.keep("ps"), "(ps.status = 'open' OR (ps.status = 'saved' AND ps.savedAt > datetime() - duration({hours: 12})))");
  assert.equal(GUARDS.PartCandidate.accept("c"), "c.status = 'open'");
  assert.equal(GUARDS.PartCandidate.dismiss("c"), "c.status = 'open'");
});

// Writers that update an existing log record must use the guard (grows with each PR).
const GUARDED_WRITERS = [
  ["functions/src/toolUsage/index.ts", "GUARDS.ToolUsage.outcome"],
  ["functions/src/checkin/index.ts", "GUARDS.CheckIn.upsert"],
  ["functions/src/spine/toolSession.ts", "GUARDS.ToolSession.close"],
  ["functions/src/spine/toolSession.ts", "GUARDS.ToolUsage.outcome"],
  ["functions/src/spine/toolSession.ts", "GUARDS.ToolSession.answer"],
  ["functions/src/spine/followUp.ts", "GUARDS.FollowUp.update"],
  ["functions/src/profile/patternOffers.ts", "GUARDS.PatternOffer.answer"],
  ["functions/src/witness/index.ts", "GUARDS.CheckIn.upsert"],
  ["functions/src/witness/index.ts", "GUARDS.ToolSession.showLine"],
  ["functions/src/parts/sessionQueries.ts", "GUARDS.PartSession.save"],
  ["functions/src/parts/keep.ts", "GUARDS.PartSession.keep"],
  ["functions/src/parts/keep.ts", "GUARDS.PartCandidate.accept"],
  ["functions/src/parts/candidateAnswer.ts", "GUARDS.PartCandidate.dismiss"],
];
test("writers that update log records use the lifecycle guards", () => {
  for (const [file, guard] of GUARDED_WRITERS) assert.ok(readFileSync(file, "utf8").includes(guard), `${file} lacks ${guard}`);
});

test("backfill (D-16a): every legacy label adopted, idempotent, no CREATE", () => {
  const src = readFileSync("schema/migrations/2026-10-user-data-backfill.cypher", "utf8");
  const stmts = splitStatements(src);
  for (const [label, d] of Object.entries(USER_DATA)) {
    if (!d.legacy) continue;
    assert.ok(stmts.some((s) => s.includes(`:${label}`) && /SET [\s\S]*:UserData:LogRecord/.test(s)), label);
  }
  for (const s of stmts) {
    assert.doesNotMatch(s, /(?<!ON )\bCREATE\b/, s.slice(0, 80));
    if (/\bSET\b/.test(s)) assert.ok(/ownerId IS NULL/.test(s) || /^MATCH[\s\S]*MERGE \(f:FollowUp \{key:/.test(s), s.slice(0, 80));
  }
  assert.ok(stmts.some((s) => /orphanCheckIns/.test(s)), "reports orphans");
});

test("CLAUDE.md documents the data layers (R11)", () => {
  const md = readFileSync("CLAUDE.md", "utf8");
  assert.match(md, /^## Data layers/m);
  assert.match(md, /functions\/src\/userdata\/layers\.ts/);
});

test("profile kinds (user-profile.md §4.2): a kept value never holds an ask-fresh field, refused or stripped", async () => {
  const { PROFILE_KINDS, checkValue } = await importTs("functions/src/profile/kinds.ts");
  const ok = { quiet_hours: { start: "22:00", end: "07:00" }, nightmare_script: { turnIds: ["door"], endingOwn: "I wake up" },
    cope_ahead_plan: { situationIds: ["conversation"], momentIds: ["go_blank"], movesIds: ["long_out"] },
    pros_cons: { pullIds: ["send"], longIds: ["regret"], keepsOwn: "I want to say it right" },
    abstinence_plan: { whatIds: ["drink"], spanIds: ["tonight"], lapseIds: ["tell"], buildOwn: "Ring my sister" },
    thing_i_like: { kindIds: ["colour"], kindOwn: "The blue mug" }, crisis_kit: { bodyIds: ["cold"], wordsOwn: "You can do hard things", placeIds: ["beach"] }, values: { mineIds: ["honesty", "calm"], keptIds: ["honesty"], keptOwn: "Being a good dad" }, i_can: { rungIds: ["admin_1"] }, person: { label: "Sam", role: "friend" } };
  for (const [kind, def] of Object.entries(PROFILE_KINDS)) {
    assert.ok(ok[kind], `${kind}: add a valid value here`);
    for (const f of ["thenVsNow", "fitsFacts", "bandLevel", "urgeIds"]) {
      let kept = null;
      try { kept = checkValue(def, { ...ok[kind], [f]: "x" }); } catch { kept = null; }
      assert.ok(kept === null || !(f in kept), `${kind}: ${f}`);
    }
  }
});
