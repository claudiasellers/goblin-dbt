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
const partSafety = await importTs("functions/src/safety/partSafetyFlag.ts");
const toolIds = new Set([...readFileSync("src/data/tools.ts", "utf8").matchAll(/^\s{4}id: '([a-z-]+)',$/gm)].map((m) => m[1]));
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

test("types mirror: src/data/profileTypes.ts equals functions/src/profile/types.ts (after the header)", () => {
  const body = (f) => readFileSync(f, "utf8").split("\n").slice(8).join("\n");
  assert.equal(body("src/data/profileTypes.ts"), body("functions/src/profile/types.ts"));
});

test("PROFILE_NEEDS: consumers are app tools or reserved consumers; plan §5.4 Phase A needs", () => {
  for (const [consumer, needs] of Object.entries(types.PROFILE_NEEDS)) {
    assert.ok(toolIds.has(consumer) || ["checkin", "today", "witness", "me", "safety"].includes(consumer), consumer);
    for (const s of needs) assert.ok(types.SLICE_IDS.includes(s), `${consumer}: ${s}`);
  }
  assert.deepEqual(types.PROFILE_NEEDS["recovering-from-invalidation"], ["name"]);
  assert.deepEqual(types.PROFILE_NEEDS["find-the-feeling"], ["name", "parts", "ownWords"], "the tag row on its close; own words first in its offers (ER-10 part 3)");
  assert.deepEqual(types.PROFILE_NEEDS["opposite-action"], ["parts"], "the tag row on its close (ER-B3 port)");
  assert.deepEqual(types.PROFILE_NEEDS["cool-down"], ["parts"], "the tag row on its close");
  assert.deepEqual(types.PROFILE_NEEDS.checkin, ["patterns", "ownWords"], "R20: consumer is `checkin`; own words first in the word pick (ER-10 part 3)");
  assert.deepEqual(types.PROFILE_NEEDS.today, ["quietHours", "parts"], "parts: the check-back card's name (part-checkback)");
  assert.deepEqual(types.PROFILE_NEEDS.witness, ["name", "ownLines", "savedLines"], "R16");
  assert.deepEqual(types.PROFILE_NEEDS["five-senses"], ["parts"], "the tag row on its close");
  assert.deepEqual(types.PROFILE_NEEDS.pause, ["parts", "prosCons"], "the tag row on its urge close; the kept card's replay (DT-10)");
  // The kept pros & cons cards (DT-10): Hold to wait replays them and the crisis kit (DT-03) plays them as cards; Me
  // reads every kept item through getMe.
  assert.deepEqual(types.PROFILE_NEEDS["crisis-kit"], ["crisisKit", "prosCons"], "the kept kit and pros & cons cards (DT-03)");
  // The safety plan (CORE-02): Help & safety and the route read it, with the kit its step 2 references.
  assert.deepEqual(types.PROFILE_NEEDS.safety, ["safetyPlan", "crisisKit"], "the plan and its kit (CORE-02)");
  for (const [consumer, needs] of Object.entries(types.PROFILE_NEEDS)) {
    if (!["pause", "crisis-kit"].includes(consumer)) assert.ok(!needs.includes("prosCons"), `${consumer} reads prosCons`);
    if (!["crisis-kit", "safety"].includes(consumer)) assert.ok(!needs.includes("crisisKit"), `${consumer} reads crisisKit`);
  }
  assert.deepEqual(types.PROFILE_NEEDS["urge-surfing"], ["parts"], "the tag row on its urge close");
  assert.deepEqual(types.PROFILE_NEEDS["check-the-facts"], ["parts"], "the tag row on its close");
  assert.deepEqual(types.SERVER_ONLY_CONSUMERS, ["witness", "me"]);
  // The den (Me only, server-side: getDen adds the recency bucket from the log); no other consumer reads it.
  assert.deepEqual(types.PROFILE_NEEDS.me, ["den"]);
  for (const [consumer, needs] of Object.entries(types.PROFILE_NEEDS)) {
    if (consumer !== "me") assert.ok(!needs.includes("den"), `${consumer} reads den`);
  }
  // Parts: the slices exist; no tool reads them before it renders them. Meet a part reads them (it
  // renders them); Phase 3's tag row is the first render on other tools' closes: exactly the tools that
  // can show it read `parts`, and none of them partDetail (tests/part-tag.test.mjs pins TAG_ROW_TOOLS).
  assert.deepEqual(types.SLICE_IDS.slice(-5), ["parts", "partDetail", "partAnchors", "den", "prosCons"]);
  assert.deepEqual(types.PROFILE_NEEDS["meet-a-part"], ["name", "parts", "partDetail"]);
  // DEAR MAN's cope ahead (Phase 3) shows parts, their anchors and the kept lines to pick one from;
  // never partDetail (fears and jobs it never shows).
  assert.deepEqual(types.PROFILE_NEEDS["dear-man"], ["parts", "ownLines", "savedLines", "partAnchors", "people"]);
  // Cope Ahead reuses that step as is on its screen 2, and sets the anchor under its plan (docs/design/cope-ahead.md).
  // DEAR MAN alone adds `people` (the picker, IE-03).
  assert.deepEqual(types.PROFILE_NEEDS["cope-ahead"], types.PROFILE_NEEDS["dear-man"].filter((s) => s !== "people"));
  // `today` renders parts too (the check-back card's name, part-checkback); partDetail stays Meet a part's.
  for (const [consumer, needs] of Object.entries(types.PROFILE_NEEDS)) {
    if (consumer === "meet-a-part") continue;
    if (consumer !== "dear-man" && consumer !== "cope-ahead") assert.ok(!needs.includes("partAnchors"), `${consumer} reads partAnchors`);
    assert.ok(!needs.includes("partDetail"), `${consumer} reads partDetail before its phase`);
    if (needs.includes("parts")) assert.ok(["today", "cool-down", "five-senses", "pause", "urge-surfing", "let-it-be", "mind-job", "soothe", "thoughts-passing", "alternate-rebellion", "find-the-feeling", "check-the-facts", "opposite-action", "fast", "dear-man", "cope-ahead", "two-pulls", "wise-mind"].includes(consumer), `${consumer} reads parts but is neither Today, a tag-row host, DEAR MAN's cope ahead (or Cope Ahead's), Two pulls nor Wise mind's step back`);
  }
  assert.deepEqual(types.PROFILE_AREAS, ["about_me", "my_people", "my_body", "my_words", "my_plans", "my_patterns", "my_parts", "my_progress"]);
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

test("parts slices: gated on partsEnabled, HAS_PART only, active / resting only, ≤ 50, no log", () => {
  for (const id of ["parts", "partDetail", "partAnchors"]) {
    const q = slices.SLICE_QUERIES[id];
    assert.ok(q, id);
    assert.match(q, /^MATCH \(u:User \{id: \$uid\}\) WHERE coalesce\(u\.partsEnabled, false\)\s+MATCH \(u\)-\[:HAS_PART\]->\(p:Part\) WHERE p\.status IN \['active', 'resting'\]/, id);
    assert.doesNotMatch(q, /set_aside/, id);
    assert.match(q, /LIMIT 50/, id);
    assert.match(q, /ORDER BY p\.lastVisitedAt IS NULL, p\.lastVisitedAt DESC, p\.confirmedAt IS NULL, p\.confirmedAt DESC/, id);
    assert.doesNotMatch(q, /:LogRecord\b|:PartSession\b|:PartTag\b|:PartCandidate\b|:TrailOffer\b|:PartRevisit\b/, `${id} reads the log`);
  }
  assert.match(slices.SLICE_QUERIES.parts, /OPTIONAL MATCH \(p\)-\[:USES\]->\(m:ProtectiveMove\)/);
  assert.match(slices.SLICE_QUERIES.partDetail, /OPTIONAL MATCH \(p\)-\[:GUARDS\]->\(h:ProtectedHurt\)/);
  // The light slice never carries what partDetail holds (jobs, fears, own words). The one read of fears is
  // the part safety seam's own predicate, which returns a boolean (functions/src/safety/partSafetyFlag.ts).
  assert.ok(slices.SLICE_QUERIES.parts.includes(`${partSafety.partSafetyCypher("p")} AS safety`), "the safety seam");
  assert.doesNotMatch(slices.SLICE_QUERIES.parts.replace(partSafety.partSafetyCypher("p"), ""), /jobIds|fearIds|ownJob|ownFear|ownVoice/);
  // Anchors: own words first, else the kept line, read only through the caller's own edges; nothing else.
  const anchors = slices.SLICE_QUERIES.partAnchors;
  assert.match(anchors, /OPTIONAL MATCH \(u\)-\[:HAS_OWN_LINE\]->\(o:OwnLine \{status: 'active'\}\) WHERE o\.id = p\.anchorLineId/);
  assert.match(anchors, /OPTIONAL MATCH \(u\)-\[:SAVED_LINE\]->\(l:ValidationLine\) WHERE l\.id = p\.anchorLineId/);
  assert.match(anchors, /coalesce\(p\.anchorOwn, head\(collect\(o\.text\)\), head\(collect\(l\.text\)\)\) AS text/);
  assert.doesNotMatch(anchors, /jobIds|fearIds|ownJob|ownFear|ownVoice|GUARDS/);
});

test("den slice: gated on partsEnabled, active / resting parts, links between two parts in the room, no log, no fears or own words", () => {
  const q = slices.SLICE_QUERIES.den;
  assert.match(q, /^MATCH \(u:User \{id: \$uid\}\) WHERE coalesce\(u\.partsEnabled, false\)\s+OPTIONAL MATCH \(u\)-\[:HAS_PART\]->\(p:Part\) WHERE p\.status IN \['active', 'resting'\]/);
  assert.doesNotMatch(q, /set_aside/);
  assert.doesNotMatch(q, /:LogRecord\b|:PartSession\b|:PartTag\b|:PartCandidate\b|:TrailOffer\b|:PartRevisit\b|:FollowUp\b/);
  assert.ok(q.includes(partSafety.partSafetyCypher("p")), "the safety seam");
  assert.doesNotMatch(q.replace(partSafety.partSafetyCypher("p"), ""), /jobIds|fearIds|ownJob|ownFear|ownVoice|places/);
  assert.match(q, /la\.id = l\.aId AND la\.status IN \['active', 'resting'\]/);
  assert.match(q, /lb\.id = l\.bId AND lb\.status IN \['active', 'resting'\]/);
  assert.match(q, /\[\.\.50\] AS parts/);
});

test("den resolver: coordinates outside 0..1 are null, unknown link kinds dropped, nothing without a row", async () => {
  const run = async (row) => {
    const tx = { run: async () => ({ records: row ? [{ get: (k) => row[k], has: (k) => k in row }] : [] }) };
    return (await slices.readProfileSlices(tx, "u1", "me")).den;
  };
  assert.deepEqual(await run(null), { parts: [], links: [], snapshots: [] });
  const den = await run({
    parts: [{ id: "p1", name: "the one who hides", status: "resting", tender: null, shapeSig: [0.1, 0.2, 0.3, 0.4, 0.5], mapX: 1.2, mapY: 0.5, lastVisitedAt: "2026-10-01T10:00:00Z", safety: true }],
    links: [{ id: "l1", kind: "covers_for", aId: "p1", bId: "p2", bothWantId: null }, { id: "l2", kind: "other", aId: "p1", bId: "p2" }],
    snapshots: [{ id: "den_2026-10-01", takenAt: "2026-10-01T10:00:00Z" }],
  });
  assert.deepEqual(den.parts, [{ id: "p1", name: "the one who hides", status: "resting", tender: false, shapeSig: [0.1, 0.2, 0.3, 0.4, 0.5], mapX: null, mapY: 0.5, lastVisitedAt: "2026-10-01T10:00:00Z", safety: true }]);
  assert.deepEqual(den.links.map((l) => l.id), ["l1"]);
  assert.deepEqual(den.snapshots, [{ id: "den_2026-10-01", takenAt: "2026-10-01T10:00:00Z" }]);
});

/** A read transaction that answers each query from `rows(query)`; records which queries ran. */
const fakeTx = (rows) => {
  const ran = [];
  return {
    ran,
    run: async (q) => {
      ran.push(q);
      return { records: (rows(q) ?? []).map((r) => ({ get: (k) => r[k], has: (k) => k in r })) };
    },
  };
};

test("parts resolvers: absent arrays are [], absent strings null, ids sorted, resting kept as resting", async (t) => {
  const now = Date.parse("2026-10-01T12:00:00Z");
  const tx = fakeTx((q) => {
    if (/USES/.test(q)) return [
      { p: { id: "p1", kind: "part", area: "my_parts", status: "resting", source: "made", name: "the one who hides", tender: true, firstPlace: "chest", shapeSig: [0.2, 0.4, 0.6, 0.8, 1],
             confirmedAt: "2026-08-01T00:00:00Z", revisitAt: "2026-08-31T00:00:00Z", lastVisitedAt: "2026-09-02T00:00:00Z", pausedUntil: "2026-10-04T00:00:00Z" },
        moveIds: ["withdraw", "appease", "withdraw"] },
      { p: { id: "p2", kind: "part", area: "my_parts", status: "active", source: "made", revisitAt: null }, moveIds: [] },
    ];
    if (/GUARDS/.test(q)) return [
      { p: { id: "p1", ageId: "age_teen", voiceIds: ["v_quiet"], ownVoice: "soft", jobIds: ["j_hide"], ownJob: "keep me safe",
             fearIds: ["f_too_much"], ownFear: null, preferredRoleIds: ["r_tell_me"], anchorLineId: "l1", places: ["chest"], shapeSig: [0.2, 0.4, 0.6, 0.8, 1] },
        hurtIds: ["rejected", "alone"] },
      { p: { id: "p2" }, hurtIds: [] },
    ];
    return [];
  });
  // Meet a part's own read (its name slice answers from the fake's empty rows).
  const read = (t) => slices.readProfileSlices(t, "u1", "meet-a-part", now);
  const { name: _name, ...out } = await read(tx);
  assert.deepEqual(out.parts.map(({ meta: m, ...rest }) => [rest, m.status, m.area, m.prompt]), [
    [{ id: "p1", name: "the one who hides", status: "resting", tender: true, moveIds: ["appease", "withdraw"], firstPlace: "chest", shapeSig: [0.2, 0.4, 0.6, 0.8, 1],
       lastVisitedAt: "2026-09-02T00:00:00Z", pausedUntil: "2026-10-04T00:00:00Z", safety: false }, "resting", "my_parts", "ask"],
    [{ id: "p2", name: null, status: "active", tender: false, moveIds: [], firstPlace: null, shapeSig: null, lastVisitedAt: null, pausedUntil: null, safety: false }, "active", "my_parts", "none"],
  ]);
  assert.deepEqual(out.partDetail, [
    { id: "p1", ageId: "age_teen", voiceIds: ["v_quiet"], ownVoice: "soft", jobIds: ["j_hide"], ownJob: "keep me safe", fearIds: ["f_too_much"],
      ownFear: null, preferredRoleIds: ["r_tell_me"], anchorLineId: "l1", places: ["chest"], shapeSig: [0.2, 0.4, 0.6, 0.8, 1], hurtIds: ["alone", "rejected"] },
    { id: "p2", ageId: null, voiceIds: [], ownVoice: null, jobIds: [], ownJob: null, fearIds: [], ownFear: null, preferredRoleIds: [],
      anchorLineId: null, places: [], shapeSig: null, hurtIds: [] },
  ]);
  // Parts off: the gated queries return no rows, so the slices are empty.
  const { name: _off, ...off } = await read(fakeTx(() => []));
  assert.deepEqual(off, { parts: [], partDetail: [] });
});

test("partAnchors: own words or the kept line's text, by part id; parts off or no text → nothing; dear-man only", async () => {
  const tx = fakeTx((q) => (/anchorLineId/.test(q) && /AS text/.test(q) ? [
    { partId: "p1", text: "I can take a breath before I answer" },
    { partId: "p2", text: "You're allowed to be scared." },
    { partId: "p3", text: null },
    { partId: "p4", text: "   " },
  ] : []));
  const out = await slices.readProfileSlices(tx, "u1", "dear-man");
  assert.deepEqual(Object.keys(out), ["parts", "ownLines", "savedLines", "partAnchors", "people"]);
  assert.deepEqual(out.partAnchors, { p1: "I can take a breath before I answer", p2: "You're allowed to be scared." });
  assert.ok(!tx.ran.some((q) => /GUARDS/.test(q)), "dear-man never reads partDetail");
  const off = await slices.readProfileSlices(fakeTx(() => []), "u1", "dear-man");
  assert.deepEqual([off.parts, off.partAnchors], [[], {}]);
});

test("people (IE-03): kept people with their label read back; nobody kept → []", async () => {
  const row = { id: "6f1c0d3a-1111-4222-8333-444455556666", kind: "person", area: "my_people", status: "active", source: "user",
    valueJson: JSON.stringify({ label: "Sam", role: "parent", safe: "no", risk: "invalidating", safeAskedAt: "2026-11-01T00:00:00Z" }),
    confirmedAt: "2026-11-01T00:00:00Z", revisitAt: null };
  const tx = fakeTx((q) => (/HAS_PERSON/.test(q) ? [{ p: row }] : []));
  const out = await slices.readProfileSlices(tx, "u1", "dear-man");
  assert.equal(out.people.length, 1);
  const { meta: m, ...p } = out.people[0];
  assert.deepEqual(p, { id: row.id, label: "Sam", role: "parent", safe: "no", risk: "invalidating", safeAskedAt: "2026-11-01T00:00:00Z", refusalsValidation: 0, safetyRecheckAt: null });
  assert.equal(m.area, "my_people");
  const none = await slices.readProfileSlices(fakeTx(() => []), "u1", "dear-man");
  assert.deepEqual(none.people, []);
  // IE-B2: the debrief's count of refused asks to be heard rides on the person (a whole number, never negative).
  const counted = await slices.readProfileSlices(fakeTx((q) => (/HAS_PERSON/.test(q) ? [{ p: { ...row, refusalsValidation: 2 } }] : [])), "u1", "dear-man");
  assert.equal(counted.people[0].refusalsValidation, 2);
  const odd = await slices.readProfileSlices(fakeTx((q) => (/HAS_PERSON/.test(q) ? [{ p: { ...row, refusalsValidation: -3 } }] : [])), "u1", "dear-man");
  assert.equal(odd.people[0].refusalsValidation, 0);
});

test("status: resting is live (still checked back with), set aside is not", () => {
  const now = Date.parse("2026-10-01T12:00:00Z");
  assert.equal(meta.profileItemPrompt("2026-09-30T00:00:00Z", "resting", now), "ask");
  const m = meta.metaFrom({ id: "p1", kind: "part", area: "my_parts", status: "resting", revisitAt: "2026-12-30T00:00:00Z" }, now);
  assert.deepEqual([m.status, m.prompt], ["resting", "quiet"]);
  assert.equal(meta.metaFrom({ id: "x", status: "weird" }, now).status, "active", "unknown still reads as active");
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
    // FTF also reads its own words from the same call (ER-10 part 3), so it keeps the slices in a const.
    assert.match(src, f === "FindTheFeeling"
      ? /const profile = useProfileContext\('find-the-feeling'\)\.slices;\s+const name = profile\?\.name\.firstName \?\? null/
      : new RegExp(`useProfileContext\\('${id}'\\)\\.slices\\?\\.name\\.firstName \\?\\? null`), f);
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

test("content: fresh, 8 areas, kinds the code uses, rule what_helps_better off (D-10, R3)", (t) => {
  const cypher = readFileSync("schema/profile-layer.cypher", "utf8");
  try { assert.equal(execFileSync("python3", ["scripts/profile-layer/build.py"], { encoding: "utf8" }).trim(), cypher.trim()); }
  catch (e) { if (e.code === "ENOENT") t.diagnostic("python3 unavailable"); else throw e; }
  const st = splitStatements(cypher);
  assert.equal(st.filter((s) => s.startsWith("MERGE (a:ProfileArea")).length, 8);
  for (const k of ["quiet_hours", "what_helps", "own_line", "part"]) assert.ok(st.some((s) => s.startsWith(`MERGE (k:ProfileKind {id: "${k}"})`)), k);
  assert.match(cypher, /MERGE \(k:ProfileKind \{id: "quiet_hours"\}\)\nSET k\.area = "my_body", k\.label = "Quiet hours", k\.revisitAfterDays = 180/);
  assert.match(cypher, /MERGE \(k:ProfileKind \{id: "what_helps"\}\)\nSET k\.area = "my_patterns", k\.label = "What helps", k\.revisitAfterDays = 60/);
  assert.match(cypher, /MERGE \(a:ProfileArea \{id: "my_parts"\}\)\nSET a\.label = "Parts of me", [^\n]*a\.order = 6,/);
  assert.match(cypher, /MERGE \(k:ProfileKind \{id: "part"\}\)\nSET k\.area = "my_parts", k\.label = "A part", k\.revisitAfterDays = 30, k\.stillTrueCopy = "Is \{name\} still doing the same job\?"/);
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
