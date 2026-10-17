// The parts review report (scripts/parts/report.cypher) and the harm definitions it shares with
// functions/src/parts/harm.ts (parts-harm-report): read-only, no person's words or names, an opaque
// person key, and the same thresholds and rules as the server's harmSignalsFor.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { splitStatements } from "../scripts/load-graph.mjs";

const read = (f) => readFileSync(f, "utf8");
const source = read("scripts/parts/report.cypher");
const statements = splitStatements(source);
const code = statements.join("\n;\n");
const harm = await importTs("functions/src/parts/harm.ts");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));

test("report: two read-only statements, run by hand (the header says how)", () => {
  assert.equal(statements.length, 2);
  assert.match(source, /^\/\/ Parts review report/);
  assert.match(source, /node scripts\/load-graph\.mjs --file scripts\/parts\/report\.cypher --no-content-refresh/);
  assert.doesNotMatch(code, /\b(MERGE|CREATE|SET|DELETE|DETACH|REMOVE|FOREACH|LOAD CSV)\b/, "read-only");
  assert.doesNotMatch(code, /CALL apoc\.(?!util\.sha256|map\.fromPairs)/, "only the two pure apoc functions");
  assert.match(statements[0], /RETURN 'harm' AS section, left\(apoc\.util\.sha256\(\[u\.id\]\), 12\) AS person,\s+louder, crisisAfterMeet, tenderStops, tenderRepeat, notSelfStops, notSelfRepeat,\s+toString\(date\(lastAt\)\) AS lastDate/);
  assert.match(statements[1], /RETURN 'integration' AS section, row\[0\] AS metric, row\[1\] AS value$/);
  // Integration rows are aggregates: no per-person key at all.
  assert.doesNotMatch(statements[1], /sha256|\bperson\b|ownerId AS/);
});

test("report: never a name, own words, an anchor, line text or an account id", () => {
  // Every own-words property the parts records hold (sessions and parts), the part's name, anchors.
  const ownWords = new Set([
    ...read("functions/src/parts/sessionTypes.ts").matchAll(/\b(own[A-Z]\w*)\??:/g),
    ...read("functions/src/parts/keep.ts").matchAll(/\bp\.(own[A-Z]\w*)\b/g),
  ].map((m) => m[1]));
  for (const p of ["ownVoice", "ownJob", "ownFear", "ownUpdate"]) assert.ok(ownWords.has(p), `found ${p}`);
  for (const p of [...ownWords, "name", "keptName", "anchorOwn", "anchorLineId", "text", "textNamed", "displayName", "email", "note", "valueJson", "outcomeNote"]) {
    assert.doesNotMatch(code, new RegExp(`\\.${p}\\b`), `the report reads .${p}`);
  }
  // The account id appears only hashed (the person key) or as a match key, never returned.
  const uses = [...code.matchAll(/[^\n]{0,40}\bu\.id\b[^\n]{0,10}/g)].map((m) => m[0]);
  assert.ok(uses.length >= 2);
  for (const u of uses) assert.match(u, /apoc\.util\.sha256\(\[u\.id\]\)|\{ownerId: u\.id\}/, u);
  assert.doesNotMatch(code, /\bAS (uid|userId|ownerId|email|name)\b/);
});

test("thresholds: the report's defaults, harm.ts's defaults and PartsPolicy's numbers are one set", () => {
  const def = harm.DEFAULT_HARM_POLICY;
  const props = harm.HARM_POLICY_PROPS;
  const inReport = Object.fromEntries([...code.matchAll(/coalesce\(pol\.(\w+), (\d+)\)/g)].map((m) => [m[1], Number(m[2])]));
  for (const [key, prop] of Object.entries(props)) {
    assert.equal(inReport[prop], def[key], `report default for ${prop}`);
    assert.equal(fixture.policy[prop], def[key], `PartsPolicy.${prop} (scripts/parts/content.py)`);
  }
  assert.deepEqual(Object.keys(inReport).sort(), Object.values(props).sort(), "the report reads exactly harm.ts's policy numbers");
  assert.equal(fixture.policy.reviewStatus, "approved", "PartsPolicy signed off 17 Oct (Claudia: ship it all)");
});

test("definitions: the report applies harm.ts's rules", () => {
  const s1 = statements[0];
  // Louder: answered check-backs with the harm flag, by when they were answered, inside the window.
  assert.match(s1, new RegExp(`\\(f:FollowUp \\{type: '${harm.CHECKBACK_TYPE}'\\}\\)\\s+WHERE f\\.harmSignal = true AND f\\.resolvedAt >= since AND f\\.resolvedAt <= now`));
  // Crisis after Meet: the session in the window; the crisis strictly after its start, at most crisisPauseHours later.
  assert.match(s1, /WHERE ps\.createdAt >= since AND ps\.createdAt <= now\s+OPTIONAL MATCH \(c:CheckIn \{ownerId: u\.id\}\)/);
  assert.match(s1, /c\.safetyFlagId IS NOT NULL AND c\.timestamp > ps\.createdAt\s+AND c\.timestamp <= ps\.createdAt \+ duration\(\{hours: crisisHours\}\)/);
  assert.match(s1, /count\(DISTINCT CASE WHEN c IS NOT NULL THEN ps END\) AS crisisAfterMeet/, "once per session");
  // Repeats: the same stop reasons, at or over the policy's count.
  const tender = `[${harm.TENDER_STOPS.map((r) => `'${r}'`).join(", ")}]`;
  assert.ok(s1.includes(`ps.stopReason IN ${tender} THEN 1 END) AS tenderStops`), tender);
  assert.ok(s1.includes(`ps.stopReason = '${harm.NOT_SELF_STOP}' THEN 1 END) AS notSelfStops`));
  assert.match(s1, /tenderStops >= repeatCount AS tenderRepeat, notSelfStops >= repeatCount AS notSelfRepeat/);
  assert.match(s1, /WHERE louder > 0 OR crisisAfterMeet > 0 OR tenderRepeat OR notSelfRepeat/, "any");
  // lastAt: only from signals that are on.
  assert.match(s1, /\[louderAt, crisisAt, CASE WHEN tenderRepeat THEN tenderAt END, CASE WHEN notSelfRepeat THEN notSelfAt END\]/);
  // Watched: [t, t + days), at or over the count; P2 and running things counted, never harms.
  const s2 = statements[1];
  assert.match(s2, /x >= t AND x < t \+ duration\(\{days: manyDays\}\)/);
  assert.match(s2, /most >= manyCount/);
  assert.match(s2, /ps\.handoffsJson IS NOT NULL THEN 1 END\) AS p2Opened/);
  assert.match(s2, /ps\.blendCheck = 'running' THEN 1 END\) AS blendRunning/);
  // Not recorded today: null in both, and no tracking added.
  assert.match(s2, /\['watched_parts_deleted', null\], \['watched_parts_turned_off', null\], \['not_me_rate', null\]/);
  const s = harm.harmSignalsFor({ checkbacks: [], sessions: [], crisisCheckIns: [], partsMade: [] });
  assert.deepEqual([s.watched.partsDeleted, s.watched.partsTurnedOff, s.watched.notMeRate], [null, null, null]);
});

test("integration: the metrics Claudia reviews", () => {
  const metrics = [...statements[1].matchAll(/\['([a-z_]+)', /g)].map((m) => m[1]);
  for (const m of ["parts_kept", "visits", "feel_shift_parts", "unblend_lines_shown", "tags_by_source", "checkback_answers",
    "louder_share", "still_true_answers", "candidates_queued", "candidates_accepted", "candidates_dismissed"]) {
    assert.ok(metrics.includes(m), m);
  }
  // The feel-toward shift reads the feel options' selfLike flag, never a hard-coded list.
  assert.match(statements[1], /\(o:PartOption \{flow: 'meet', step: 'feel'\}\) WHERE o\.selfLike IS NOT NULL/);
  assert.match(statements[1], /nonSelfAt\[0\] < selfAt\[-1\]/);
  assert.ok(fixture.options.meet.feel.some((o) => o.selfLike === true) && fixture.options.meet.feel.some((o) => o.selfLike === false));
});
