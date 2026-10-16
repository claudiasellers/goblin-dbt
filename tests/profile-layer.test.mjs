// PR-P1: the profile layer. One read path (getProfileContext), per-tool declared slices, resolvers
// that never read the log, "still true?" meta, the in-memory cache, pattern offers (rule 4).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";
import { LOAD_ORDER, splitStatements } from "../scripts/load-graph.mjs";

const types = await importTs("functions/src/profile/types.ts");
const slices = await importTs("functions/src/profile/slices.ts");
const meta = await importTs("functions/src/profile/meta.ts");
const offers = await importTs("functions/src/profile/patternOffers.ts");
const cache = await importTs("src/lib/profileCache.ts");
const layers = await importTs("functions/src/userdata/layers.ts");
const toolIds = new Set([...readFileSync("src/data/tools.ts", "utf8").matchAll(/^\s{4}id: '([a-z-]+)',$/gm)].map((m) => m[1]));
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

test("types mirror: src/data/profileTypes.ts equals functions/src/profile/types.ts (after the header)", () => {
  const body = (f) => readFileSync(f, "utf8").split("\n").slice(8).join("\n");
  assert.equal(body("src/data/profileTypes.ts"), body("functions/src/profile/types.ts"));
});

test("PROFILE_NEEDS: consumers are app tools or reserved consumers; plan §5.4 Phase A needs", () => {
  for (const [consumer, needs] of Object.entries(types.PROFILE_NEEDS)) {
    assert.ok(toolIds.has(consumer) || ["checkin", "today", "witness"].includes(consumer), consumer);
    for (const s of needs) assert.ok(types.SLICE_IDS.includes(s), `${consumer}: ${s}`);
  }
  assert.deepEqual(types.PROFILE_NEEDS["recovering-from-invalidation"], ["name"]);
  assert.deepEqual(types.PROFILE_NEEDS["find-the-feeling"], ["name"]);
  assert.deepEqual(types.PROFILE_NEEDS["opposite-action"], []);
  assert.deepEqual(types.PROFILE_NEEDS["cool-down"], []);
  assert.deepEqual(types.PROFILE_NEEDS.checkin, ["patterns"], "R20: consumer is `checkin`");
  assert.deepEqual(types.PROFILE_NEEDS.today, ["quietHours"]);
  assert.deepEqual(types.PROFILE_NEEDS.witness, ["name", "ownLines", "savedLines"], "R16");
  assert.deepEqual(types.SERVER_ONLY_CONSUMERS, ["witness"]);
  for (const s of types.SLICE_IDS) assert.ok(!layers.isAskFreshField(s), `${s} is ask-fresh`);
});

test("lint: slice resolvers never read a log record", () => {
  const logLabels = layers.labelsOf("log");
  for (const [slice, q] of Object.entries(slices.SLICE_QUERIES)) {
    assert.doesNotMatch(q, /:LogRecord\b/, slice);
    for (const l of logLabels) assert.doesNotMatch(q, new RegExp(`:${l}\\b`), `${slice} reads ${l}`);
  }
  assert.ok(Object.keys(slices.SLICE_QUERIES).length >= 3);
});

test("still-true meta: ask past revisitAt, quiet when fresh, none without a policy or when set aside", () => {
  const now = Date.parse("2026-10-01T12:00:00Z");
  assert.equal(meta.profileItemPrompt("2026-09-30T00:00:00Z", "active", now), "ask");
  assert.equal(meta.profileItemPrompt("2026-12-30T00:00:00Z", "active", now), "quiet");
  assert.equal(meta.profileItemPrompt(null, "active", now), "none");
  assert.equal(meta.profileItemPrompt("2026-09-30T00:00:00Z", "set_aside", now), "none");
  assert.equal(meta.metaFrom({ id: "quiet_hours", kind: "quiet_hours", area: "my_body", status: "active", revisitAt: "2026-09-30T00:00:00Z" }, now).prompt, "ask");
  assert.ok(meta.HHMM.test("22:30") && !meta.HHMM.test("24:00") && !meta.HHMM.test("7:00"));
});

test("cache: per user, bumped by a newer version, stale after 10 minutes; never localStorage", () => {
  const c = new cache.ProfileCache();
  c.setUser("u1");
  c.set("find-the-feeling", 3, "A", 0);
  assert.equal(c.get("find-the-feeling", 1000), "A");
  assert.equal(c.get("find-the-feeling", cache.PROFILE_CACHE_TTL_MS + 1), null, "10 min");
  c.set("x", 3, "B", 0);
  c.bump(4);
  assert.equal(c.get("x", 1), null, "a profile write invalidates");
  c.set("y", 4, "C", 0);
  c.setUser("u2");
  assert.equal(c.get("y", 1), null, "sign-out / another user");
  assert.doesNotMatch(readFileSync("src/lib/profileCache.ts", "utf8") + readFileSync("src/hooks/useProfileContext.ts", "utf8"), /localStorage\./);
});

test("pilot: Recover and FTF read the name through getProfileContext", () => {
  for (const [f, id] of [["InvalidationRecovery", "recovering-from-invalidation"], ["FindTheFeeling", "find-the-feeling"]]) {
    const src = readFileSync(`src/pages/tools/${f}.tsx`, "utf8");
    assert.match(src, new RegExp(`useProfileContext\\('${id}'\\)\\.slices\\?\\.name\\.firstName \\?\\? null`), f);
    assert.doesNotMatch(src, /displayName/, `${f} reads the profile ad hoc`);
  }
});

test("rule 4: only answerPatternOffer creates a MyPattern; scheduled code never imports profile writers", () => {
  const files = walk("functions/src").filter((f) => f.endsWith(".ts"));
  const writers = files.filter((f) => /MERGE \(\w+:MyPattern \{key/.test(readFileSync(f, "utf8")));
  assert.deepEqual(writers, ["functions/src/profile/patternOffers.ts"]);
  const answer = readFileSync("functions/src/profile/patternOffers.ts", "utf8");
  assert.match(answer, /MERGE \(m\)-\[:ACCEPTED_FROM\]->\(o\)/);
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    if (/onSchedule|pubsub\.schedule/.test(src)) assert.doesNotMatch(src, /profile\/(items|patternOffers)/, f);
  }
  for (const f of files.filter((x) => x.includes("/spine/"))) assert.doesNotMatch(readFileSync(f, "utf8"), /from '\.\.\/profile\//, `${f} imports the profile layer`);
});

test("content: fresh, 7 areas, kinds the code uses, rule what_helps_better off (D-10, R3)", (t) => {
  const cypher = readFileSync("schema/profile-layer.cypher", "utf8");
  try { assert.equal(execFileSync("python3", ["scripts/profile-layer/build.py"], { encoding: "utf8" }).trim(), cypher.trim()); }
  catch (e) { if (e.code === "ENOENT") t.diagnostic("python3 unavailable"); else throw e; }
  const st = splitStatements(cypher);
  assert.equal(st.filter((s) => s.startsWith("MERGE (a:ProfileArea")).length, 7);
  for (const k of ["quiet_hours", "what_helps", "own_line"]) assert.ok(st.some((s) => s.startsWith(`MERGE (k:ProfileKind {id: "${k}"})`)), k);
  assert.match(cypher, /MERGE \(k:ProfileKind \{id: "quiet_hours"\}\)\nSET k\.area = "my_body", k\.label = "Quiet hours", k\.revisitAfterDays = 180/);
  assert.match(cypher, /MERGE \(k:ProfileKind \{id: "what_helps"\}\)\nSET k\.area = "my_patterns", k\.label = "What helps", k\.revisitAfterDays = 60/);
  assert.match(cypher, /MERGE \(p:PatternRule \{id: "what_helps_better"\}\)[\s\S]*p\.enabled = false/);
  const i = LOAD_ORDER.indexOf("profile-layer.cypher");
  assert.ok(i > LOAD_ORDER.indexOf("practice-spine.cypher") && i < LOAD_ORDER.indexOf("capacity.cypher"), "R14 order");
});

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-01T12:00:00Z");
const ago = (d) => new Date(NOW - d * DAY).toISOString();
const rule = { id: "what_helps_better", patternKind: "what_helps", windowDays: 30, minEvidence: 3, ofLast: 4, cooldownDays: 14, enabled: true, statementTemplate: "", offerCopy: "" };
const ses = (id, d, tvn, toolId = "cool-down", patternId = "acute_alarm") => ({ id, toolId, patternId, thenVsNow: tvn, at: ago(d) });
test("pattern offers (pure): 3 of the last 4 better within 30 days; cooldown; declined never again; 1 a week", () => {
  const good = [ses("a", 1, "better"), ses("b", 2, "much_better"), ses("c", 3, "same"), ses("d", 4, "better"), ses("e", 5, "worse")];
  const c = offers.evaluateRule(good, rule, [], NOW);
  assert.deepEqual([c.toolId, c.patternId, c.evidenceIds.sort()], ["cool-down", "acute_alarm", ["a", "b", "d"]]);
  assert.equal(offers.evaluateRule(good, { ...rule, enabled: false }, [], NOW), null, "off by default");
  assert.equal(offers.evaluateRule([ses("a", 1, "better"), ses("b", 2, "better"), ses("c", 3, "same"), ses("d", 4, "same")], rule, [], NOW), null, "2 of 4");
  assert.equal(offers.evaluateRule([ses("a", 31, "better"), ses("b", 32, "better"), ses("c", 33, "better")], rule, [], NOW), null, "outside the window");
  assert.equal(offers.evaluateRule(good.map((s) => ({ ...s, patternId: null })), rule, [], NOW), null, "needs a pattern");
  const offer = (o) => ({ ruleId: rule.id, toolId: "cool-down", patternId: "acute_alarm", status: "offered", offeredAt: ago(20), cooldownUntil: null, ...o });
  assert.equal(offers.evaluateRule(good, rule, [offer({ status: "declined" })], NOW), null, "declined: never again");
  assert.equal(offers.evaluateRule(good, rule, [offer({ status: "accepted" })], NOW), null);
  assert.equal(offers.evaluateRule(good, rule, [offer({ cooldownUntil: new Date(NOW + DAY).toISOString() })], NOW), null, "cooling down");
  assert.equal(offers.evaluateRule(good, rule, [offer({ toolId: "pause", offeredAt: ago(2) })], NOW), null, "one new offer a week app-wide");
  assert.ok(offers.evaluateRule(good, rule, [offer({ toolId: "pause", offeredAt: ago(8) })], NOW), "another tool after a week");
});

test("pattern offers (pure): Meet a part's \"more here\" is never what_helps evidence", () => {
  const meet = [ses("a", 1, "much_better", "meet-a-part"), ses("b", 2, "better", "meet-a-part"), ses("c", 3, "better", "meet-a-part")];
  assert.equal(offers.evaluateRule(meet, rule, [], NOW), null);
  const mixed = [...meet, ses("d", 1, "better"), ses("e", 2, "better")];
  assert.equal(offers.evaluateRule(mixed, rule, [], NOW), null, "its closes don't count toward another tool either");
});
