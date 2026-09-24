import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
const { urgeReadout, capacityDefaultSize, fill, urgePhrase } = await importTs(
  "src/lib/oppositeAction.ts",
);
const { dueAtFor, dueAtForNextTime, followUpState, buildFollowUpIcs } =
  await importTs("src/lib/oppositeActionFollowUp.ts");
const { validateOppositeActionSession } = await importTs(
  "functions/src/oppositeActionValidation.ts",
);
const flowCypher = readFileSync("schema/opposite-action-flow.cypher", "utf8");
const dataCypher = readFileSync("schema/opposite-action-data.cypher", "utf8");
const flow = JSON.parse(
  JSON.parse(flowCypher.match(/p.contentJson = (.*);/)[1]),
);

const NOW = new Date("2026-09-23T15:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const inHours = (h) => new Date(NOW.getTime() + h * HOUR).toISOString();
const validate = (s) => validateOppositeActionSession(s, NOW);

const base = {
  id: "12345678-1234-4234-8234-123456789012",
  schemaVersion: 2,
  contentVersion: "oa-guided-v2",
  emotionId: "anxious",
  parentId: "fear",
  urgeId: "fear-avoid",
  urgeLabel: "Avoid it entirely",
  customUrge: "",
  situation: "",
  observation: "",
  interpretation: "",
  goal: "progress",
  safety: "safe",
  facts: "excessive",
  effectiveness: "unhelpful",
  urgeBefore: 8,
  urgeAfterBody: 6,
  urgeAfter: null,
  intensityBefore: null,
  intensityAfter: null,
  bodyCues: ["Drop your shoulders away from your ears"],
  actionSize: "small",
  action: "Stay in the room 2 more minutes",
  cueId: "today",
  cue: "At the next opportunity today",
  dueAt: inHours(2),
  barrier: "",
  backup: "",
  status: "planned",
  outcome: "",
  missedReason: "",
  reflection: "",
  sourceIds: [],
};
const plannedNow = { ...base, cueId: "now", cue: "Now", dueAt: "" };
const practiced = {
  ...base,
  status: "practiced",
  urgeAfter: 0,
  outcome: "toward_goal",
};
const missed = { ...base, status: "missed", missedReason: "no_moment" };

test("v2 validator accepts planned-later, planned-now, practiced and missed", () => {
  const later = validate(base);
  assert.equal(later.schemaVersion, 2);
  assert.equal(later.dueAt, base.dueAt);
  assert.equal(validate(plannedNow).dueAt, "");
  assert.equal(validate(practiced).urgeAfter, 0);
  assert.equal(validate(missed).missedReason, "no_moment");
  assert.deepEqual(validate(base).bodyCues, base.bodyCues);
});

test("v2 validator rejects malformed or clinically unsafe sessions", () => {
  const cases = [
    ["no body cues", { ...base, bodyCues: [] }],
    ["missing body cues", { ...base, bodyCues: undefined }],
    ["empty cue text", { ...base, bodyCues: ["  "] }],
    ["urgeBefore 11", { ...base, urgeBefore: 11 }],
    ["dueAt > 48h", { ...base, dueAt: inHours(49) }],
    ["bad dueAt", { ...base, dueAt: "not a date" }],
    ["planned-later without dueAt", { ...base, dueAt: "" }],
    ["practiced without urgeAfter", { ...practiced, urgeAfter: null }],
    ["missed with outcome", { ...missed, outcome: "partial" }],
    ["missed without reason", { ...missed, missedReason: "" }],
    ["plan with reflection", { ...base, reflection: "It went fine" }],
    ["plan with outcome", { ...base, outcome: "partial" }],
    ["unsafe", { ...base, safety: "unsafe" }],
    ["unsure safety", { ...base, safety: "unsure" }],
    ["unsure facts", { ...base, facts: "unsure" }],
    ["helpful urge", { ...base, effectiveness: "helpful" }],
    ["unsure effectiveness", { ...base, effectiveness: "unsure" }],
    [
      "intensityAfter without intensityBefore",
      { ...practiced, intensityAfter: 3 },
    ],
    ["unknown cueId", { ...base, cueId: "someday" }],
  ];
  for (const [name, session] of cases)
    assert.throws(() => validate(session), undefined, name);
});

test("v2 backup plan is optional even when a snag is chosen", () => {
  assert.equal(validate({ ...base, barrier: "too_big" }).backup, "");
  assert.equal(validate({ ...base, barrier: "forget", backup: "Phone alarm" }).backup, "Phone alarm");
});

test("v2 validator strips attacker-supplied userId and sourceIds", () => {
  const out = validate({ ...base, userId: "attacker", sourceIds: ["invented"] });
  assert.equal(out.userId, undefined);
  assert.equal(out.sourceIds, undefined);
});

test("urge readout leads with urge change, unsafe first", () => {
  assert.equal(urgeReadout(8, 2, 1, "unsafe").key, "readoutUnsafe");
  assert.equal(urgeReadout(8, 6, null, "").key, "readoutUrgeLower");
  assert.equal(urgeReadout(8, 6, 7, "partial").key, "readoutUrgeSlight");
  assert.equal(urgeReadout(8, 8, null, "").key, "readoutUrgeSame");
  assert.equal(urgeReadout(8, null, null, "").key, "readoutUrgeSame");
  assert.equal(urgeReadout(5, 3, 7, "partial").key, "readoutUrgeHigher");
  const r = urgeReadout(9, 5, 4, "toward_goal");
  assert.deepEqual(r, { key: "readoutUrgeLower", from: 9, to: 4, drop: 5 });
  assert.equal(urgeReadout(6, null, null, "").to, null);
});

test("capacity default, fill and urgePhrase", () => {
  assert.equal(capacityDefaultSize(7), "small");
  assert.equal(capacityDefaultSize(10), "small");
  assert.equal(capacityDefaultSize(6), null);
  assert.equal(fill("From {from} to {to} ({x})", { from: 8, to: 3 }), "From 8 to 3 ({x})");
  assert.equal(fill(undefined, {}), "");
  assert.equal(urgePhrase("  Avoid it entirely "), "avoid it entirely");
  assert.equal(urgePhrase(""), "act on it");
});

test("follow-up due times and states", () => {
  const morning = new Date(2026, 8, 23, 10, 0, 0);
  assert.equal(dueAtFor("hour", morning).getTime(), morning.getTime() + HOUR);
  assert.equal(dueAtFor("afternoon", morning).getTime(), new Date(2026, 8, 23, 16).getTime());
  assert.equal(dueAtFor("evening", morning).getTime(), new Date(2026, 8, 23, 20).getTime());
  assert.equal(dueAtFor("unsure", morning).getTime(), morning.getTime() + 3 * HOUR);
  const lateAfternoon = new Date(2026, 8, 23, 15, 30);
  assert.equal(
    dueAtFor("afternoon", lateAfternoon).getTime(),
    lateAfternoon.getTime() + 2 * HOUR,
  );
  assert.equal(dueAtForNextTime(morning).getTime(), morning.getTime() + 24 * HOUR);
  for (const w of ["hour", "afternoon", "evening", "unsure"]) {
    const late = new Date(2026, 8, 23, 23, 30);
    const due = dueAtFor(w, late).getTime() - late.getTime();
    assert.ok(due > 0 && due <= 48 * HOUR, w);
  }

  const due = "2026-09-23T12:00:00.000Z";
  assert.equal(followUpState(due, new Date("2026-09-23T11:00:00Z")), "upcoming");
  assert.equal(followUpState(due, new Date("2026-09-23T12:00:00Z")), "due");
  assert.equal(followUpState(due, new Date("2026-09-24T23:00:00Z")), "due");
  assert.equal(followUpState(due, new Date("2026-09-25T01:00:00Z")), "stale");
  assert.equal(followUpState("garbage", NOW), "stale");
});

test("calendar reminder is content-free", () => {
  const ics = buildFollowUpIcs({
    uid: base.id,
    start: new Date("2026-09-23T16:00:00Z"),
    title: flow.copy.calendarTitle,
    body: flow.copy.calendarBody,
    url: "https://example.test/#/tool/opposite-action?followUp=" + base.id,
    now: NOW,
  });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20260923T160000Z/);
  assert.match(ics, /DTEND:20260923T161000Z/);
  const lower = ics.toLowerCase();
  for (const secret of [
    base.action,
    base.urgeLabel,
    base.emotionId,
    base.parentId,
    ...base.bodyCues,
  ])
    assert.ok(!lower.includes(secret.toLowerCase()), secret);
});

test("v2 copy keys and follow-up choices exist in the graph flow", () => {
  for (const key of [
    "readoutUrgeLower",
    "readoutUrgeSlight",
    "readoutUrgeSame",
    "readoutUrgeHigher",
    "readoutUnsafe",
    "bodyIntro",
    "bodyEscape",
    "urgeStrength",
    "missedTooStrong",
    "missedNoMoment",
    "missedForgot",
    "missedChoseNot",
    "calendarTitle",
    "calendarBody",
  ])
    assert.ok(flow.copy[key], key);
  assert.match(flow.copy.urgeStrength, /\{urge\}/);
  const ids = (k) => (flow.choices[k] ?? []).map((c) => c.id).sort();
  assert.deepEqual(ids("cue"), ["next_time", "now", "today"]);
  assert.deepEqual(ids("missedReason"), ["chose_not", "forgot", "no_moment", "too_strong"]);
  assert.deepEqual(ids("dueWindow"), ["afternoon", "evening", "hour", "unsure"]);
});

test("every DBT parent has somatic cues and urge overrides reference real urges", () => {
  const parents = [
    ...new Set(
      [...dataCypher.matchAll(/EmotionRegulationContent \{dbtParent: '(\w+)'\}/g)].map(
        (m) => m[1],
      ),
    ),
  ];
  assert.deepEqual(parents.sort(), [
    "anger", "disgust", "envy", "fear", "guilt", "jealousy", "love", "sadness", "shame",
  ]);
  for (const parent of parents) {
    const re = new RegExp(
      `EmotionRegulationContent \\{dbtParent: '${parent}'\\}\\)\\s*SET c\\.somaticCues = \\[([^\\]]+)\\]`,
    );
    const m = flowCypher.match(re);
    assert.ok(m, parent);
    assert.ok(/'[^']+'/.test(m[1]), parent);
  }
  const urgeIds = new Set(
    [...dataCypher.matchAll(/\{id: "([a-z-]+)", label:/g)].map((m) => m[1]),
  );
  const overrides = new Map(
    [
      ...flowCypher.matchAll(
        /\{id: '([a-z-]+)',\s*replace: (true|false),\s*cues: \[([^\]]*)\]\}/g,
      ),
    ].map((m) => [
      m[1],
      {
        replace: m[2] === "true",
        cues: [...m[3].matchAll(/'([^']+)'/g)].map((c) => c[1]),
      },
    ]),
  );
  assert.ok(overrides.size > 0);
  for (const [id, o] of overrides) {
    assert.ok(urgeIds.has(id), id);
    assert.ok(o.cues.length > 0, id);
  }
  assert.match(flowCypher, /SET u\.somaticCues = o\.cues, u\.somaticReplace = o\.replace/);
  assert.equal(overrides.get("fear-freeze")?.replace, true);
  assert.equal(overrides.get("sad-bed")?.replace, true);
  // Freeze needs up-regulation: no relaxation/down-regulation cues.
  for (const cue of overrides.get("fear-freeze").cues)
    assert.doesNotMatch(cue, /breathe out|drop your shoulders|unclench|relax|soften|slow/i, cue);
});

test("graph copy never overpromises", () => {
  for (const [key, text] of Object.entries(flow.copy))
    assert.doesNotMatch(text, /we will ask you|will remind you|guarantee|always works/i, key);
  for (const choices of Object.values(flow.choices))
    for (const c of choices)
      assert.doesNotMatch(`${c.label} ${c.detail ?? ""}`, /we will ask you|will remind you|guarantee|always works/i, c.id);
});
