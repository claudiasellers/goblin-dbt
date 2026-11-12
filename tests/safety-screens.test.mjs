// The safety route's screens (CORE-01 PR 2, docs/design/safety-route.md): the pure step machine
// (src/lib/safetyRoute.ts) every entry plays, what saveSafetyCheck receives (never method), and the wiring
// that makes the route reachable from the check-in, the header, Help me now, Today and every skill.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const R = await importTs("src/lib/safetyRoute.ts");
const content = JSON.parse(readFileSync("src/data/content/safety.json", "utf8")).content;
const read = (p) => readFileSync(p, "utf8");

const play = (entry, events, signedIn = true) =>
  events.reduce((s, e) => R.step(s, e, signedIn), R.startState(entry));
const screens = (entry, events, signedIn = true) => {
  const out = [];
  let s = R.startState(entry);
  for (const e of events) { s = R.step(s, e, signedIn); out.push(s.screen); }
  return out;
};

test("the check-in's question keeps No; the said entries never offer it and put people first", () => {
  assert.ok(R.questionFor(content, "checkin").choices.some((c) => c.id === "no"));
  for (const entry of ["said", "help_now"]) {
    const q = R.questionFor(content, entry);
    assert.ok(!q.choices.some((c) => c.id === "no"), entry);
    assert.ok(R.peopleFirst(R.startState(entry)), entry);
  }
  assert.equal(R.questionFor(content, "help_now").title, content.flow.question.helpNowTitle);
  assert.ok(!R.peopleFirst(R.startState("checkin")));
});

test("each answer opens its own screen", () => {
  assert.equal(play("checkin", [{ type: "answer", id: "no" }]).screen, "done");
  assert.equal(play("checkin", [{ type: "answer", id: "declined" }]).screen, "declined");
  assert.equal(play("checkin", [{ type: "answer", id: "passing" }]).screen, "passing");
  assert.equal(play("checkin", [{ type: "answer", id: "strong" }]).screen, "means");
  assert.equal(play("checkin", [{ type: "answer", id: "plan" }]).screen, "act");
});

test("an act goes to medical first, then means, then the strong screen", () => {
  assert.deepEqual(
    screens("said", [
      { type: "answer", id: "plan" }, { type: "act", id: "yes" }, { type: "kind", id: "took" },
      { type: "medical", id: "getting_help" }, { type: "means", id: "yes" }, { type: "means_done", ids: ["give_someone", "bogus"] },
    ]),
    ["act", "kind", "medical", "means", "means_actions", "strong"],
  );
  const s = play("said", [{ type: "answer", id: "plan" }, { type: "act", id: "no" }]);
  assert.equal(s.screen, "means");
  assert.equal(R.recordedAnswer(s), "plan");
  assert.equal(R.recordedAnswer(play("said", [{ type: "answer", id: "plan" }, { type: "act", id: "yes" }])), "act");
});

test("It's not that kind of hurt only after a known injury, never after something taken", () => {
  const took = play("said", [{ type: "answer", id: "plan" }, { type: "act", id: "yes" }, { type: "kind", id: "took" }]);
  assert.ok(!R.medicalChoices(content, took).some((c) => c.id === "not_that_kind"));
  assert.equal(R.step(took, { type: "medical", id: "not_that_kind" }, true).screen, "medical");
  const hurt = play("said", [{ type: "answer", id: "plan" }, { type: "act", id: "yes" }, { type: "kind", id: "injury" }]);
  assert.ok(R.medicalChoices(content, hurt).some((c) => c.id === "not_that_kind"));
  assert.equal(R.step(hurt, { type: "medical", id: "not_that_kind" }, true).screen, "first_aid");
  const unsure = play("said", [{ type: "answer", id: "plan" }, { type: "act", id: "not_sure" }, { type: "kind", id: "injury" }]);
  assert.ok(!R.medicalChoices(content, unsure).some((c) => c.id === "not_that_kind"));
});

test("the exit offers the morning check only signed in and above no", () => {
  const passing = [{ type: "answer", id: "passing" }, { type: "leave" }, { type: "exit", id: "stop" }];
  assert.equal(play("checkin", passing).screen, "checkin");
  assert.equal(play("checkin", passing, false).screen, "done");
  assert.equal(play("checkin", [{ type: "answer", id: "passing" }, { type: "carry_on" }]).screen, "checkin");
  const done = play("checkin", [...passing, { type: "checkin", id: "yes" }]);
  assert.equal(done.screen, "done");
  assert.equal(done.morningCheck, "yes");
  // The exit closes the visit server-side, so it is held back until the morning answer goes with it.
  const base = { id: "x", source: "checkin", country: null };
  assert.equal(R.recordFor(play("checkin", passing), base).exit, null);
  assert.deepEqual([R.recordFor(done, base).exit, R.recordFor(done, base).morningCheck], ["stop", "yes"]);
  assert.equal(R.recordFor(play("checkin", passing, false), base).exit, "stop");
  // Carry on closes the visit too.
  assert.equal(R.recordFor(play("checkin", [{ type: "answer", id: "passing" }, { type: "carry_on" }, { type: "checkin", id: "no" }]), base).exit, "stop");
});

test("the morning's I'm not safe starts the said route fresh; Back retraces", () => {
  const s = play("morning", [{ type: "morning", id: "not_safe" }]);
  assert.equal(s.entry, "said");
  assert.equal(s.screen, "question");
  assert.equal(play("morning", [{ type: "morning", id: "hard" }]).screen, "morning_answer");
  assert.equal(play("checkin", [{ type: "answer", id: "plan" }, { type: "back" }]).screen, "question");
});

test("the record carries ids and enums only: never the kind of act, never own words", () => {
  const s = play("said", [
    { type: "answer", id: "plan" }, { type: "act", id: "yes" }, { type: "kind", id: "injury" },
    { type: "medical", id: "got_help" }, { type: "means", id: "no" }, { type: "leave" }, { type: "exit", id: "contacted" },
  ]);
  const r = R.recordFor(s, { id: "00000000-0000-4000-8000-000000000000", source: "header", country: "US" });
  assert.deepEqual(Object.keys(r).sort(), ["answer", "contacted", "country", "exit", "id", "meansActions", "meansAsked", "medical", "morningCheck", "source", "sourceSessionId", "usedPlan"]);
  assert.equal(r.answer, "act");
  assert.equal(r.contacted, "person");
  assert.ok(!JSON.stringify(r).includes("injury"));
  assert.equal(R.recordFor(R.startState("checkin"), { id: "x", source: "checkin", country: null }), null);
});

test("the check-in asks once per browser session, only when the result says so", () => {
  assert.ok(R.shouldAsk({ safetyAsk: { ask: true } }, false));
  assert.ok(!R.shouldAsk({ safetyAsk: { ask: true } }, true));
  assert.ok(!R.shouldAsk({ safetyAsk: { ask: false } }, false));
  assert.ok(!R.shouldAsk({}, false));
});

test("labels shown before the content loads equal the content", () => {
  assert.equal(R.HELP_AND_SAFETY_LABEL, content.flow.header.label);
  assert.equal(R.SAY_LABEL, content.flow.header.say);
});

test("the route is reachable from every place it should be", () => {
  assert.match(read("src/App.tsx"), /<Route path="\/safety" element=\{<Safety \/>\} \/>/);
  assert.match(read("src/components/DashboardLayout.tsx"), /to="\/safety"[\s\S]*HELP_AND_SAFETY_LABEL/);
  assert.match(read("src/components/checkin/HelpNowInterim.tsx"), /to=\{HELP_NOW_SAY_HREF\}/);
  assert.match(read("src/components/safety/SafetyOpen.tsx"), /<SafetyRoute entry="said" source=\{toolId \? `module:\$\{toolId\}` : 'header'\}/);
  assert.match(read("src/components/skillPlayer/SkillPlayer.tsx"), /<SafetyOpen toolId=\{skill\.toolId\}/);
  const checkIn = read("src/pages/CheckIn.tsx");
  assert.match(checkIn, /<SafetyRoute\s+entry="checkin"\s+source="checkin"\s+sourceSessionId=\{checkInId\}/);
  // The result never renders while the question is open; asked already, the people go above it instead.
  assert.match(checkIn, /step === 'result' && stateResult && !safetyAsking && \(/);
  assert.match(checkIn, /setSafetyPeople\(!!result\.safetyAsk\?\.ask\)/);
  assert.match(checkIn, /safetyPeople && <SafetyPeopleCard \/>/);
  // Saved as the result is decided (leaving mid-route keeps the check-in), then again with the visit's id.
  assert.match(checkIn, /\}, \[user, step, stateResult, safetyCheckId\]\);/);
  const page = read("src/pages/Safety.tsx");
  assert.match(page, /entry="morning" source="followup" followUpId=\{checkin\}/);
  assert.match(page, /entry=\{fromHelpNow \? 'help_now' : 'said'\}/);
});

test("the check-in stores the visit's id, kept once set", () => {
  assert.match(read("functions/src/checkin/validation.ts"), /safetyCheckId: typeof raw\.safetyCheckId === 'string' && UUID\.test\(raw\.safetyCheckId\)/);
  assert.match(read("functions/src/checkin/index.ts"), /c\.safetyCheckId = coalesce\(\$safetyCheckId, c\.safetyCheckId\)/);
  assert.match(read("src/lib/spine/checkInPayload.ts"), /if \(s\.safetyCheckId\) req\.safetyCheckId = s\.safetyCheckId;/);
});

test("only a client that can show the route gets it; any other keeps the old crisis flag (no gap mid-deploy)", async () => {
  const { parseStateRequest } = await importTs("functions/src/recommendation/validation.ts");
  assert.equal(parseStateRequest({ quadrant: "high-unpleasant" }).safetyRoute, undefined);
  assert.equal(parseStateRequest({ quadrant: "high-unpleasant", safetyRoute: "yes" }).safetyRoute, undefined);
  assert.equal(parseStateRequest({ quadrant: "high-unpleasant", safetyRoute: true }).safetyRoute, true);
  // Without the caller's uid the route stays off (queries.ts), so the old flag decides.
  assert.match(read("functions/src/recommendation/index.ts"), /graphDeps\(tx, input\.safetyRoute \? \(uid as string\) : undefined\)/);
  assert.match(read("functions/src/recommendation/queries.ts"), /if \(!uid \|\| !\(await safetyPolicyEnabled\(tx\)\)\) return null;/);
  assert.match(read("src/pages/CheckIn.tsx"), /safetyRoute: true,/);
});
