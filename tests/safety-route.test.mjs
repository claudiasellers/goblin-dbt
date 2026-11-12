// The safety route, PR 1 (CORE-01, docs/design/safety-route.md): the content (scripts/safety/content.py →
// schema/safety-route.cypher, src/data/content/safety.json), when the check-in asks (functions/src/safety/
// safetyAsk.ts), the SafetyCheck record (functions/src/safety/checkRecord.ts) and the switch, off.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";
import { LOAD_ORDER, splitStatements } from "../scripts/load-graph.mjs";
import { buildSafety, indexGraph } from "../scripts/content-snapshot/build.mjs";

const read = (f) => readFileSync(f, "utf8");
const py = (args) => execFileSync("python3", args, { encoding: "utf8", maxBuffer: 1 << 26 });
const cypher = read("schema/safety-route.cypher");
const stmts = splitStatements(cypher);
const fixture = JSON.parse(read("tests/fixtures/safety-content.json"));
const shipped = JSON.parse(read("src/data/content/safety.json")).content;
const ask = await importTs("functions/src/safety/safetyAsk.ts");
const rec = await importTs("functions/src/safety/checkRecord.ts");
const { getStateAndToolsHandler } = await importTs("functions/src/recommendation/handler.ts");
const { GUARDS, writable } = await importTs("functions/src/userdata/lifecycle.ts");
const { USER_DATA } = await importTs("functions/src/userdata/layers.ts");

test("generated files are fresh: build.py → the schema file, fixture.py → the fixture, and safety.json ships it", () => {
  assert.equal(py(["scripts/safety/build.py"]), cypher, "run scripts/safety/build.py");
  const before = read("tests/fixtures/safety-content.json");
  py(["scripts/safety/fixture.py"]);
  assert.equal(read("tests/fixtures/safety-content.json"), before, "run python3 scripts/safety/fixture.py --ship");
  assert.deepEqual(shipped, fixture);
});

test("loads after the graph it touches and before routing; MERGE-only; constraints for every label it merges", () => {
  const i = LOAD_ORDER.indexOf("safety-route.cypher");
  assert.ok(i > LOAD_ORDER.indexOf("knowledge-graph.cypher") && i > LOAD_ORDER.indexOf("emotion-wheel-sync.cypher"));
  assert.equal(LOAD_ORDER.at(-1), "recommended-for.cypher");
  assert.ok(!stmts.some((s) => /^CREATE\b/m.test(s)));
  const constraints = read("schema/constraints.cypher");
  for (const label of new Set([...cypher.matchAll(/MERGE \(\w+:(\w+) \{id:/g)].map((m) => m[1]))) {
    assert.match(constraints, new RegExp(`FOR \\(\\w+:${label}\\) REQUIRE \\w+\\.id IS UNIQUE`), label);
  }
  assert.match(constraints, /FOR \(n:SafetyCheck\) REQUIRE n\.key IS UNIQUE/);
});

test("the switch is off, and the content says so in one place", () => {
  assert.match(cypher, /MERGE \(p:SafetyPolicy \{id: "safety_route"\}\)\nSET p\.enabled = false/);
  assert.match(read("scripts/safety/content.py"), /POLICY = \{"id": "safety_route", "enabled": False/);
});

// The schema replayed in memory (scripts/recommendations/schema_graph.py), as a content-only export.
const exported = JSON.parse(py(["-c", `
import json, sys
sys.path.insert(0, 'scripts/recommendations')
from schema_graph import load
g = load(['knowledge-graph.cypher', 'relationships.cypher', 'emotion-wheel-sync.cypher', 'safety-route.cypher'])
ids = {id(n): f'n{i}' for i, n in enumerate(g.nodes)}
print(json.dumps({'scope': 'content-only',
  'nodes': [{'elementId': ids[id(n)], 'labels': sorted(n.labels), 'props': n.props} for n in g.nodes],
  'relationships': [{'type': r.type, 'start': ids[id(r.start)], 'end': ids[id(r.end)], 'props': r.props} for r in g.relationships]}))
`]));
const g = indexGraph(exported);

test("buildSafety (from the graph) equals what fixture.py ships (from content.py)", () => {
  assert.deepEqual(buildSafety(g), fixture);
  assert.equal(buildSafety(indexGraph({ scope: "content-only", nodes: [], relationships: [] })), null, "missing: the committed file is kept");
});

test("the audit never ships: no checkedAt, verifiedAt or source; clinician text never ships", () => {
  const text = JSON.stringify(shipped);
  assert.doesNotMatch(text, /checkedAt|verifiedAt|"source"|"action"|doNot|Immediate cessation|Safety anchor/);
  for (const n of g.nodes("CrisisLine")) {
    assert.equal(n.props.checkedAt, "2026-11-12", n.props.id);
    assert.ok(!("verifiedAt" in n.props), `${n.props.id}: verifiedAt waits for a person to confirm the line`);
    assert.match(n.props.source, /^https:\/\//, n.props.id);
  }
});

test("every country has an emergency number; every line a way to reach it; lines in order", () => {
  for (const c of shipped.countries) {
    assert.match(c.emergency, /^\d{2,4}$/, c.id);
    for (const l of c.lines) assert.ok(l.phone || l.sms || l.chatUrl, l.id);
  }
  const us = shipped.countries.find((c) => c.id === "US");
  assert.deepEqual(us.lines.map((l) => l.id), ["us_988", "us_crisis_text", "us_poison"]);
  assert.equal(us.emergency, "911");
  for (const id of ["GB", "IE", "CA", "AU", "NZ"]) assert.ok(shipped.countries.find((c) => c.id === id)?.lines.some((l) => l.kind === "crisis"), id);
  // A country with only an emergency number: the route links Find A Helpline.
  assert.deepEqual(shipped.countries.find((c) => c.id === "IT").lines, []);
  assert.equal(shipped.countries.find((c) => c.id === "FR").emergencyAlt, "15", "the medical number beside 112");
  assert.equal(shipped.flow.findAHelpline.url, "https://findahelpline.com");
});

test("the question: five answers, plain; no pledge, no method words, nothing about family", () => {
  const q = shipped.flow.question;
  assert.equal(q.title, "Sometimes feelings like this come with thoughts of hurting yourself or not wanting to be alive. Is that part of it right now?");
  assert.deepEqual(q.choices.map((c) => c.id), ["no", "passing", "strong", "plan", "declined"]);
  const text = JSON.stringify(shipped.flow).toLowerCase();
  for (const w of ["promise", "contract", "family", "calm down", "overdose", "pills", "knife", "rope", "!"]) assert.ok(!text.includes(w), w);
});

test("C: medical first; 'not that kind of hurt' only for an injury, never after something taken", () => {
  const act = shipped.flow.act;
  assert.deepEqual(act.medicalChoices.find((c) => c.id === "not_that_kind").showWhen, { act: "yes", kind: "injury" });
  assert.ok(act.medicalChoices.filter((c) => c.id !== "not_that_kind").every((c) => !c.showWhen));
  assert.doesNotMatch(act.medicalLine, /took|packaging/, "the injury path never reads as something taken");
  assert.ok(!shipped.flow.question.saidChoices.some((c) => c.id === "no"), "someone who said it isn't offered No");
  assert.match(act.tookLine, /hours later/);
  assert.deepEqual(shipped.flow.means.actions.map((a) => a.id), [...rec.MEANS_ACTIONS]);
  assert.deepEqual(shipped.flow.exit.choices.map((c) => c.id), ["plan", "contacted", "stop"]);
});

test("ASKS_SAFETY: the five patterns, low-unpleasant ones included; safetyScreen words; userCopy on every flag", () => {
  const asks = g.rels("ASKS_SAFETY", "ActivationPattern", "SafetyScreenFlow").map((r) => r.a.props.id).sort();
  assert.deepEqual(asks, ["conservation_freeze", "dissociation_overmodulation", "emotional_flooding", "reward_drive_low", "rumination_loop"]);
  const screens = g.nodes("Emotion").filter((n) => n.props.safetyScreen === true).map((n) => n.props.id).sort();
  assert.deepEqual(screens, ["despair", "empty", "helpless", "numb", "powerless", "worthless"]);
  const flags = g.nodes("SafetyFlag").map((n) => n.props);
  assert.equal(flags.length, 5);
  for (const f of flags) assert.equal(typeof f.userCopy, "string", f.id);
  assert.equal(flags.find((f) => f.id === "crisis_suicidal").doNot, "Show coping instead of, or before, people and crisis lines");
  assert.ok(g.nodes("TherapyConcept").some((n) => n.props.id === "core_safety_route" && !("appToolId" in n.props)), "appToolId comes with the page (PR 2)");
});

// ---- When to ask ------------------------------------------------------------------------------------
const H = 3_600_000;
const NOW = Date.parse("2026-11-12T12:00:00Z");
const none = { lastAnswer: null, lastAt: null, anyAboveNo: false };
const base = { quadrant: "high-unpleasant", patternAsks: false, wordScreens: false, band: null, history: none, now: NOW };

test("safetyAskFor: a trigger asks; nothing asks without one; pleasant never", () => {
  assert.deepEqual(ask.safetyAskFor(base), { ask: false, reasons: [] });
  assert.deepEqual(ask.safetyAskFor({ ...base, patternAsks: true }), { ask: true, reasons: ["pattern"] });
  assert.deepEqual(ask.safetyAskFor({ ...base, quadrant: "low-unpleasant", wordScreens: true }), { ask: true, reasons: ["word"] });
  assert.equal(ask.safetyAskFor({ ...base, quadrant: "high-pleasant", patternAsks: true }).ask, false);
  assert.equal(ask.safetyAskFor({ ...base, band: "flooded" }).ask, false, "flooded alone, no history: no");
  assert.deepEqual(ask.safetyAskFor({ ...base, band: "flooded", history: { ...none, anyAboveNo: true } }).reasons, ["flooded_history"]);
});

test("safetyAskFor: once per 12 h after a no; every time within 72 h of anything else", () => {
  const no = (h) => ({ ...base, patternAsks: true, history: { lastAnswer: "no", lastAt: NOW - h * H, anyAboveNo: false } });
  assert.equal(ask.safetyAskFor(no(2)).ask, false);
  assert.equal(ask.safetyAskFor(no(11.9)).ask, false);
  assert.equal(ask.safetyAskFor(no(12)).ask, true);
  const passing = (h) => ({ ...base, history: { lastAnswer: "passing", lastAt: NOW - h * H, anyAboveNo: true } });
  assert.deepEqual(ask.safetyAskFor(passing(1)), { ask: true, reasons: ["recent_answer"] }, "untriggered, but recent");
  assert.equal(ask.safetyAskFor(passing(71)).ask, true);
  assert.equal(ask.safetyAskFor(passing(73)).ask, false);
  assert.equal(ask.safetyAskFor({ ...passing(1), quadrant: "high-pleasant" }).ask, false);
  const declined = { ...base, history: { lastAnswer: "declined", lastAt: NOW - H, anyAboveNo: true } };
  assert.equal(ask.safetyAskFor(declined).ask, true, "rather not say counts as above no");
});

// ---- The handler seam --------------------------------------------------------------------------------
const pattern = { id: "emotional_flooding", name: "x", userFacingLabel: "x", userFacingDescription: "x", formulation: {} };
function deps({ route } = {}) {
  return {
    emotionEvidence: async () => [{ patternId: "emotional_flooding", emotionId: "overwhelmed", weight: 1 }],
    responseEvidence: async () => [],
    patternDetail: async () => pattern,
    coOccurrence: async () => null,
    legacyTools: async () => [],
    safetyFlag: async () => ({ id: "crisis_self_harm", type: "crisis", trigger: "t", action: "a" }),
    routingPolicy: async () => ({ policy: null, fallback: null }),
    routingSlice: async () => [],
    ...(route !== undefined ? { safetyRoute: async (a) => route(a) } : {}),
  };
}
const input = { quadrant: "high-unpleasant", emotionIds: ["overwhelmed"], responseIds: [] };

test("the switch off (or no route dep): the crisis flag exactly as before, no safetyAsk", async () => {
  for (const d of [deps(), deps({ route: () => null })]) {
    const r = await getStateAndToolsHandler(input, d);
    assert.equal(r.safetyFlag?.type, "crisis");
    assert.ok(!("safetyAsk" in r));
  }
});

test("the switch on: the question decides, the result carries a referral flag at most, never the crisis banner", async () => {
  let seen;
  const r = await getStateAndToolsHandler(input, deps({ route: (a) => { seen = a; return { ask: { ask: true, reasons: ["pattern"] } }; } }));
  assert.deepEqual(r.safetyAsk, { ask: true, reasons: ["pattern"] });
  assert.equal(r.safetyFlag, undefined);
  assert.deepEqual(seen.patternIds, ["emotional_flooding"]);
  assert.equal(seen.quadrant, "high-unpleasant");
  const ref = { id: "clinical_referral_shutdown", type: "clinical_referral", trigger: "t", action: "a", userCopy: "u" };
  const r2 = await getStateAndToolsHandler(input, deps({ route: () => ({ ask: { ask: false, reasons: [] }, flag: ref }) }));
  assert.equal(r2.safetyFlag.type, "clinical_referral");
});

test("queries: ids and enums only; the policy defaults off; referrals only on the route", async () => {
  assert.match(ask.SAFETY_POLICY_QUERY, /coalesce\(p\.enabled, false\)/);
  assert.match(ask.SAFETY_HISTORY_QUERY, /\(:User \{id: \$uid\}\)-\[:HAS_SAFETY_CHECK\]->\(s:SafetyCheck\)/);
  const flag = await importTs("functions/src/safety/checkinSafetyFlag.ts");
  assert.match(flag.REFERRAL_FLAG_QUERY, /WHERE sf\.type = 'clinical_referral'/);
  const q = read("functions/src/recommendation/queries.ts");
  assert.match(q, /if \(!uid \|\| !\(await safetyPolicyEnabled\(tx\)\)\) return null;/);
});

// ---- The record ------------------------------------------------------------------------------------
const id = "11111111-1111-4111-8111-111111111111";

test("SafetyCheck is a log record, registered and exported; finalise-once guard in the writer", () => {
  assert.deepEqual(USER_DATA.SafetyCheck, { layer: "log", rel: "HAS_SAFETY_CHECK", exportAs: "safetyChecks" });
  assert.ok(rec.SAVE_SAFETY_CHECK_QUERY.includes(GUARDS.SafetyCheck.update("prev")));
  assert.ok(writable("SafetyCheck", "update", { status: "open", at: new Date(NOW - H).toISOString() }, NOW));
  assert.ok(!writable("SafetyCheck", "update", { status: "open", at: new Date(NOW - 3 * H).toISOString() }, NOW));
  assert.ok(!writable("SafetyCheck", "update", { status: "closed", at: new Date(NOW).toISOString() }, NOW));
});

test("validateSafetyCheck: enums only, no own words or method fields, unknown keys refused", () => {
  const v = rec.validateSafetyCheck({ id, source: "checkin", answer: "strong", meansActions: ["lock_away", "lock_away"], country: "GB" });
  assert.deepEqual(v.meansActions, ["lock_away"]);
  assert.equal(v.exit, null);
  assert.equal(rec.validateSafetyCheck({ id, source: "module:pros-cons", answer: "passing" }).source, "module:pros-cons");
  for (const bad of [
    { id, source: "checkin", answer: "maybe" },
    { id, source: "elsewhere", answer: "no" },
    { id, source: "checkin", answer: "act", method: "x" },
    { id, source: "checkin", answer: "act", note: "words" },
    { id, source: "checkin", answer: "no", country: "gbr" },
    { id, source: "checkin", answer: "strong", meansActions: ["something"] },
  ]) assert.throws(() => rec.validateSafetyCheck(bad), JSON.stringify(bad));
});

test("the write moves forward only: answer rises, contacted only up, exit closes it", () => {
  const q = rec.SAVE_SAFETY_CHECK_QUERY;
  assert.match(q, /s\.answer = CASE WHEN \$rank > s\.answerRank THEN \$answer ELSE s\.answer END/);
  assert.match(q, /s\.medical = coalesce\(s\.medical, \$medical\)/);
  assert.match(q, /s\.exit = coalesce\(s\.exit, \$exit\)/);
  assert.match(q, /s\.status = CASE WHEN \$exit IS NULL THEN s\.status ELSE 'closed' END/);
  const p = rec.saveSafetyCheckParams("u1", null, rec.validateSafetyCheck({ id, source: "checkin", answer: "act", contacted: "line" }));
  assert.equal(p.key, `u1:${id}`);
  assert.equal(p.rank, 4);
  assert.equal(p.contactRank, 1);
  assert.deepEqual(Object.entries(ask.ANSWER_RANK), Object.entries(fixture.flow.answerRank), "server and content agree on the ranks");
});

test("the next-morning check is authored, content-free and a deep link into the route", () => {
  const spine = JSON.parse(read("src/data/content/spine.json")).content;
  const t = spine.followUpTypes.find((x) => x.id === "safety_checkin");
  assert.equal(t.tier, "safety");
  assert.equal(t.deepLinkTemplate, "/safety?checkin={followUpId}");
  assert.equal(t.copy.title, "Checking in");
  assert.equal(t.notification, "Checking in");
});
