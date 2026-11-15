// The Practice home (MF-02, MF-B3, docs/design/practice-home.md): the server's numbers, the daily pick, the catch-one
// rules, the daily card type and the MF sequence in the graph.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";

const compute = await importTs("functions/src/practice/compute.ts");
const lib = await importTs("src/lib/practiceHome.ts");
const v = await importTs("functions/src/spine/validation.ts");
const tools = await importTs("functions/src/spine/tools.ts");
const close = await importTs("src/lib/spine/close.ts");
const kinds = await importTs("functions/src/profile/kinds.ts");
const copy = await importTs("src/data/practiceHome.ts");

const ID = "3f2c9a0e-1b2c-4d5e-8f90-123456789abc";
const NOW = Date.parse("2026-11-15T12:00:00Z");
const day = (n) => new Date(NOW - n * 86_400_000).toISOString();

const META = [
  { id: "describe", label: "Name", order: 2, tools: ["notice-and-name", "find-the-feeling"] },
  { id: "observe", label: "Notice", order: 1, tools: ["notice-and-name", "five-senses"] },
  { id: "nonjudge", label: "Without judging", order: 3, tools: ["unpack-a-judgment"] },
  { id: "wise_mind", label: "Wise mind", order: 5, tools: ["wise-mind"] },
];

test("types mirror: src/data/practiceTypes.ts equals functions/src/practice/types.ts (after the header)", () => {
  const body = (f) => readFileSync(f, "utf8").split("\n").slice(5).join("\n");
  assert.equal(body("src/data/practiceTypes.ts"), body("functions/src/practice/types.ts"));
});

test("practiceHome: the sequence's order, reps per skill, a visit counted once, recent tools without the catch tool", () => {
  const reps = [
    { skillId: "observe", sessionKey: "u:a", practiceId: "notice-and-name", at: day(1), offPhone: false, source: "in_app" },
    { skillId: "describe", sessionKey: "u:a", practiceId: "notice-and-name", at: day(1), offPhone: false, source: "in_app" },
    { skillId: "nonjudge", sessionKey: "u:b", practiceId: "practice", at: day(0.5), offPhone: false, source: "catch" },
    { skillId: "observe", sessionKey: "u:c", practiceId: "practice", at: day(2), offPhone: true, source: "followup_offphone" },
    { skillId: "wise_mind", sessionKey: "u:d", practiceId: "wise-mind", at: day(10), offPhone: false, source: "in_app" },
  ];
  const r = compute.practiceHome(META, reps, [{ id: "f1", waiting: true }, { id: "f0", waiting: false }], "worse", NOW);
  assert.deepEqual(r.skills.map((s) => s.id), ["observe", "describe", "nonjudge", "wise_mind"]);
  assert.deepEqual(r.skills.map((s) => s.reps), [2, 1, 1, 1]);
  assert.deepEqual(r.skills.map((s) => s.weekReps), [2, 1, 1, 0]);
  assert.deepEqual(r.skills.map((s) => s.offPhone), [1, 0, 1, 0]);
  // Four visits, three this week (the Notice visit logs two skills: one rep on the ring).
  assert.equal(r.weekReps, 3);
  assert.equal(r.offPhoneReps, 2);
  assert.deepEqual(r.recentTools, ["notice-and-name", "wise-mind"]);
  assert.equal(r.dailyPending, true);
  assert.equal(r.dailyWaitingId, "f1");
  assert.deepEqual(r.staleDailyIds, ["f0"]);
  assert.equal(r.noticeFar, true);
  const empty = compute.practiceHome(META, [], [], "better", NOW);
  assert.deepEqual(empty.skills.map((s) => s.reps), [0, 0, 0, 0]);
  assert.deepEqual([empty.dailyPending, empty.dailyWaitingId, empty.noticeFar], [false, null, false]);
});

test("dailyPick: least practised first, never the last tool, the swap a different tool; unbuilt tools skipped", () => {
  const rows = compute.practiceHome(META, [], [], null, NOW).skills;
  const all = () => true;
  assert.deepEqual(lib.dailyPick(rows, [], all).pick, { skillId: "observe", toolId: "notice-and-name" });
  // observe and describe share a tool: the swap skips to the next skill with a different one.
  assert.deepEqual(lib.dailyPick(rows, [], all).swap, { skillId: "nonjudge", toolId: "unpack-a-judgment" });
  // Yesterday's tool is never today's pick.
  assert.equal(lib.dailyPick(rows, ["notice-and-name"], all).pick.skillId, "nonjudge");
  // Least practised wins over earlier in the sequence.
  const practised = rows.map((s) => ({ ...s, reps: s.id === "wise_mind" ? 0 : 4 }));
  assert.equal(lib.dailyPick(practised, [], all).pick.skillId, "wise_mind");
  // A skill whose tools aren't built isn't offered.
  const pick = lib.dailyPick(rows, [], (t) => t !== "notice-and-name");
  assert.deepEqual(pick.pick, { skillId: "observe", toolId: "five-senses" });
  assert.deepEqual(lib.dailyPick(rows, [], () => false), { pick: null, swap: null });
  assert.deepEqual(lib.library(rows, (t) => t === "wise-mind").map((x) => x.skill.id), ["wise_mind"]);
});

test("booking, levels and the ring: a time books when none waits; a cue books nothing; levels never decay; no empty ring for a miss", () => {
  assert.equal(lib.shouldBookDaily("evening", false), true);
  assert.equal(lib.shouldBookDaily("evening", true), false);
  assert.equal(lib.shouldBookDaily(null, false), false);
  assert.deepEqual([0, 1, 3, 7, 15, 30, 99].map(lib.levelOf), [0, 1, 2, 3, 4, 5, 5]);
  assert.equal(lib.weekFraction(0), 0);
  assert.equal(lib.weekFraction(2), 2 / 3);
  assert.equal(lib.weekFraction(3), 1);
  assert.equal(lib.weekFraction(20), 1);
});

test("catch-one: only the two catches record under `practice`; a catch is refused for any other tool", () => {
  const rec = (o) => ({ id: ID, toolId: "practice", entry: "direct", status: "completed", durationSec: 0, ...o });
  const now = new Date(NOW);
  const ok1 = v.validateRecord(rec({ skillIds: ["nonjudge"], repSource: "catch" }), now);
  assert.equal(ok1.close.repSource, "catch");
  assert.ok(v.validateRecord(rec({ skillIds: ["observe"], repSource: "followup_offphone" }), now));
  assert.throws(() => v.validateRecord(rec({ skillIds: ["observe"], repSource: "catch" }), now));
  assert.throws(() => v.validateRecord(rec({ skillIds: ["nonjudge", "observe"], repSource: "catch" }), now));
  assert.throws(() => v.validateRecord(rec({ skillIds: ["nonjudge"], repSource: "catch", status: "exited_early" }), now));
  assert.throws(() => v.validateRecord(rec({}), now));
  // Nothing else rides on a catch: no feelings, detail or follow-ups.
  assert.throws(() => v.validateRecord(rec({ skillIds: ["nonjudge"], repSource: "catch", emotionIds: ["anxiety"] }), now));
  assert.throws(() => v.validateRecord(rec({ skillIds: ["nonjudge"], repSource: "catch", urgeIds: ["send"] }), now));
  assert.throws(() => v.validateRecord({ id: ID, toolId: "wise-mind", entry: "direct", status: "completed", skillIds: ["nonjudge"], repSource: "catch" }, now));
  // `practice` is reserved (no visit of its own) and mirrored on the client.
  assert.deepEqual(tools.SPINE_TOOLS.practice, { module: "mf", closeKind: "none" });
  assert.deepEqual(close.TOOL_CLOSE_KIND.practice, { module: "mf", closeKind: "none" });
  assert.deepEqual([...tools.RESERVED_ENTRIES.practice], ["direct"]);
});

test("server: the catch is logged as a self-report (the refusals run over the fake driver in functions/test/unit/practiceHome.test.cjs)", () => {
  const src = readFileSync("functions/src/spine/toolSession.ts", "utf8");
  assert.match(src, /repSource === 'catch' \? 'self_report'/);
  assert.match(src, /'practice'/);
});

test("practice_prefs: a time or a cue (never both), own words only with `own`, breath defaults to no", () => {
  const k = kinds.PROFILE_KINDS.practice_prefs;
  assert.ok(k, "kind registered");
  assert.deepEqual(k.ownFields, ["cueOwn"]);
  assert.deepEqual(k.validate({ time: "evening", breath: "yes" }), { time: "evening", breath: "yes" });
  assert.equal(k.validate({ cue: "kettle" }).breath, "no");
  assert.equal(k.validate({ cue: "own", cueOwn: "I park the car", breath: "no" }).cueOwn, "I park the car");
  assert.throws(() => k.validate({ time: "evening", cue: "kettle", breath: "no" }));
  assert.throws(() => k.validate({ cue: "kettle", cueOwn: "x", breath: "no" }));
  assert.throws(() => k.validate({ time: "noon", breath: "no" }));
  // The page's chips are the validator's ids.
  assert.deepEqual(copy.PRACTICE_TIMES.map((t) => t.id), [...kinds.PRACTICE_TIMES]);
  assert.deepEqual(copy.PRACTICE_CUES.map((t) => t.id), [...kinds.PRACTICE_CUES]);
  assert.deepEqual(copy.PRACTICE_BREATH.map((t) => t.id), [...kinds.PRACTICE_BREATH]);
});

test("graph: practice_daily is live with the three times; the MF sequence orders observe, describe, nonjudge, one thing, wise mind, effectively, kind wishes", () => {
  const spine = JSON.parse(execFileSync("python3", ["-c", [
    "import json,sys; sys.path.insert(0,'scripts/practice-spine'); import content as c",
    "d=[t for t in c.FOLLOW_UP_TYPES if t['id']=='practice_daily'][0]",
    "print(json.dumps({'daily': d, 'seq': c.MF_SEQUENCE, 'reserved': list(getattr(c,'RESERVED',[]))}, default=str))",
  ].join("\n")], { encoding: "utf8" }));
  assert.notEqual(spine.daily.enabled, false);
  assert.deepEqual(spine.seq.map((s) => s[0]), ["observe", "describe", "nonjudge", "one_thing", "wise_mind", "effectively", "kind_wishes"]);
  assert.ok(!JSON.stringify(spine.reserved).includes("practice_daily"));
  const cypher = readFileSync("schema/practice-spine.cypher", "utf8");
  assert.match(cypher, /FollowUpType \{id: "practice_daily"\}/);
  assert.match(cypher, /\/practice\?followUp=\{followUpId\}/);
  for (const w of ["morning", "midday", "evening"]) assert.ok(v.FOLLOW_UP_WINDOWS.includes(w), w);
  assert.match(cypher, /mfOrder = 1/);
});

test("copy: no counts on the home and no breath in a practice without the person's yes", () => {
  const all = JSON.stringify(copy.PRACTICE_COPY);
  assert.doesNotMatch(all, /streak/i);
  assert.equal(copy.PRACTICE_COPY.skillLevel(0), "Not tried yet");
  const page = readFileSync("src/pages/Practice.tsx", "utf8");
  // The ring has a label and no figure; nothing renders a rep count.
  assert.doesNotMatch(page, />\s*\{(home\.weekReps|home\.offPhoneReps|skill\.reps|skill\.weekReps|weekReps)\}/);
});
