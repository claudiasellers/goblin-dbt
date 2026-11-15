// Wise mind check (PRD MF-04's check; DBT Mindfulness Handouts 3, 3a; docs/design/wise-mind-check.md) on the skill
// runtime: the decision, which mind is steering, the stone, what comes back, the yes checked, a wait on its own, and a
// look back tomorrow; inline (R8) in One message's cooling screen. Tested through the same pure machine the player
// runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const W = await importTs("src/lib/wiseMindCheck.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "wise_mind_check");
const embedOutputs = {
  stoneSink: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
  holdRing: { ids: ["held", "partly", "skipped"], measures: ["durationSec", "doneCount", "earlyCount"] },
  waitLock: { ids: ["waited", "back_early"], measures: ["durationSec"] },
};
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn: M.contextIn(skill, ctxIn), embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const sank = { type: "embedDone", output: { ids: ["done"], durationSec: 20 } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const step = (id) => M.stepOf(skill, id);
const title = (s, c = ctx()) => M.copyText(c, step(s.stepId).title, s, M.titleSlots(c, step(s.stepId), s));
const ids = (s, id, c = ctx()) => {
  const f = M.shownFields(c, step(id), s)[0];
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const links = (s, c = ctx()) => {
  const st = step(s.stepId);
  return [...M.stepLinks(c, st, s), ...M.shownFields(c, st, s).flatMap((f) => M.fieldLinks(c, f, s))].map((l) => l.exit.id);
};
const SEND = [pick("decision", "send"), next];
const cues = (...cs) => [...cs.map((x) => pick("cues", x)), next];

test("the skill: the wise-mind tool's check, on the player at ?frame=check (Help me decide) and a reopened run", () => {
  assert.equal(skill.toolId, "wise-mind");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_wise_mind"\}\), \(s:Skill \{id: "wise_mind_check"\}\)/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'wise-mind': \['wise_mind_check'\],/);
  assert.equal(W.isWiseMindCheck("?frame=check"), true);
  assert.equal(W.isWiseMindCheck("?run=abc&at=lookback&followUp=x"), true);
  assert.equal(W.isWiseMindCheck(""), false, "the practice stays the tool's default");
  assert.equal(W.isWiseMindCheck("?first=q1"), false);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /label: 'Help me decide before I act', toolId: 'wise-mind', query: 'frame=check'/);
  assert.match(tools, /key: 'check', name: 'Check a decision with wise mind',[^}]*query: 'frame=check'/);
  assert.match(readFileSync("src/pages/ToolPage.tsx", "utf8"), /isWiseMindCheck\(search\)/);
});

test("the decision, or own words; Hurting myself is never a wise mind check (the crisis route, no close)", () => {
  assert.deepEqual(ids(M.initialRun(skill), "decision"), ["send", "say", "leave", "quit", "buy_use", "hurt"]);
  assert.equal(run([own("decision", "move cities"), next]).stepId, "cues");
  const hurt = run([pick("decision", "hurt"), next]);
  assert.equal(hurt.stepId, "hurt");
  assert.equal(step("hurt").complete, false);
  assert.ok(step("hurt").crisis.some((c) => c.variant === "crisis"));
  assert.ok(step("decision").crisis.some((c) => c.variant === "crisis"));
  assert.deepEqual(M.offersFor(ctx(), step("hurt"), hurt), ["safety_open"]);
  for (const id of ["decision", "cues", "answer", "look"]) assert.ok(step(id).fields[0].links.some((l) => l.exit === "safety_open"), id);
});

test("which mind: emotion-mind cues read as emotion mind first, then reasonable, then wise, else can't tell", () => {
  const read = (events, c = ctx()) => title(run([...SEND, ...events], c), c);
  assert.match(read(cues("now")), /^Sounds like emotion mind is driving\. It isn't wrong\. It decides fast\.$/);
  assert.match(read(cues("calm", "hot")), /emotion mind/, "any emotion-mind cue wins: it's the one that costs");
  assert.match(read(cues("feelings")), /reasonable mind/);
  assert.match(read(cues("calm")), /could be wise mind/);
  assert.match(read(cues("calm"), ctx({ band: "flooded" })), /Hard to tell/, "calm with a flooded body isn't read as wise");
  assert.match(read(cues("unsure")), /Hard to tell/);
  assert.equal(run([...SEND, ...cues("now")]).stepId, "settle");
  assert.equal(step("settle").embed, "stoneSink");
});

test("a carried flooded reading: a heads-up and My body first, never a lock; not inside a host (its draft)", () => {
  const fl = ctx({ band: "flooded" });
  const s = run(SEND, fl);
  assert.equal(title(s, fl), "Wise mind is hard to reach this loud.");
  assert.ok(links(s, fl).includes("cool_down"));
  assert.ok(!links(run(SEND), ctx()).includes("cool_down"));
  const hosted = ctx({ band: "flooded", frame: "hosted", situationId: "send" });
  assert.ok(!links(M.inlineStart(hosted, "cues"), hosted).includes("cool_down"));
  assert.equal(run(cues("now"), fl, s).stepId, "settle", "it can still go on");
});

test("the answer: a quiet yes with emotion-mind cues or a hot body is checked (calm or urgent)", () => {
  const toAnswer = (cs, c = ctx()) => run([...SEND, ...cues(...cs), sank], c);
  assert.deepEqual(ids(toAnswer(["now"]), "answer"), ["yes", "no", "wait", "nothing"]);
  assert.equal(run([pick("answer", "yes"), next], ctx(), toAnswer(["now"])).stepId, "yes_check");
  assert.equal(run([pick("answer", "yes"), next], ctx(), toAnswer(["calm"])).stepId, "look", "a calm read's yes isn't second-guessed");
  const st = ctx({ band: "stirred" });
  assert.equal(run([pick("answer", "yes"), next], st, toAnswer(["calm"], st)).stepId, "yes_check");
});

test("on its own, waiting is offered: a minute and a half, twenty minutes, sleep on it, or go ahead anyway", () => {
  const toAnswer = run([...SEND, ...cues("hot"), sank]);
  const nothing = run([pick("answer", "nothing"), next], ctx(), toAnswer);
  assert.equal(nothing.stepId, "wait_pick");
  assert.deepEqual(ids(nothing, "wait_pick"), ["short", "long", "sleep", "anyway"]);
  const urgent = run([pick("answer", "yes"), next, pick("yes_check", "urgent"), next], ctx(), toAnswer);
  assert.equal(urgent.stepId, "wait_pick");
  const short = run([pick("wait_pick", "short"), next], ctx(), urgent);
  assert.equal(short.stepId, "hold");
  assert.equal(step("hold").props.seconds, 90);
  const after = run([{ type: "embedDone", output: { ids: ["held"], durationSec: 90 } }], ctx(), short);
  assert.equal(after.stepId, "after_wait");
  const look = run([pick("after", "yes"), next], ctx(), after);
  assert.equal(title(look), "A calm yes. That's yours to act on.", "after the wait, the second answer stands");
  assert.equal(run([pick("wait_pick", "long"), next], ctx(), urgent).stepId, "lock");
  assert.equal(step("lock").props.minutes, 20);
  assert.equal(title(run([pick("wait_pick", "anyway"), next], ctx(), urgent)), "You're going ahead. You checked first, and that counts.");
  assert.equal(title(run([pick("wait_pick", "sleep"), next], ctx(), nothing)), "Sleeping on it is a wise answer too.");
  // A quiet no isn't asked to wait.
  assert.equal(title(run([pick("answer", "no"), next], ctx(), toAnswer)), "A quiet no. That's worth listening to.");
});

test("the look-back: optional, tomorrow; the card reopens the check at what you did and whether it was wise mind", () => {
  const look = run([...SEND, ...cues("now"), sank, pick("answer", "no"), next]);
  assert.equal(look.stepId, "look");
  assert.deepEqual(step("look").followUp, { type: "wise_mind_lookback", whenFrom: "look" });
  assert.equal(step("look").fields[0].required, false);
  const end = run([pick("look", "tomorrow"), next], ctx(), look);
  assert.equal(end.stepId, "end");
  assert.equal(step("end").noClose, true, "the answer is the outcome");
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), end), "lookback");
  assert.equal(r.stepId, "lookback");
  assert.equal(title(r), "Yesterday you checked with wise mind about this: Send a message");
  assert.equal(run([pick("did", "waited"), pick("came", "yes"), next], ctx(), r).stepId, "sign");
  assert.equal(run([pick("did", "went"), pick("came", "no"), next], ctx(), r).stepId, "back_end");
  const signed = run([pick("did", "waited"), pick("came", "sort_of"), next, own("sign", "my shoulders drop"), next], ctx(), r);
  assert.equal(signed.stepId, "back_end");
  assert.equal(M.handoffLine(ctx(), step("back_end"), signed), "Some of it was. That's how it gets clearer.");
  assert.equal(M.resumeRun(ctx(), M.runRecord(ctx(), run(SEND)), "lookback"), null, "a check that never reached the look-back screen doesn't reopen");
  const spine = readFileSync("scripts/practice-spine/content.py", "utf8");
  assert.match(spine, /"id": "wise_mind_lookback", "ownerModule": "mf"[\s\S]*?"\/tool\/wise-mind\?run=\{sourceSessionId\}&at=lookback&followUp=\{followUpId\}"[\s\S]*?"staleAfterHours": 72/);
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /'wise_mind_lookback'/);
  assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), /wise_mind_lookback: 'wise-mind'/);
  const shipped = JSON.parse(readFileSync("src/data/content/spine.json", "utf8"));
  const types = JSON.stringify(shipped).includes('"id":"wise_mind_lookback"') || JSON.stringify(shipped).includes('"id": "wise_mind_lookback"');
  assert.ok(types, "the shipped follow-up types carry it");
});

test("inline (R8): entered at which mind with the decision seeded; gives back go · wait · no_go, and the host waits", () => {
  const hosted = ctx({ situationId: "send", frame: "hosted" });
  const s0 = M.inlineStart(hosted, "cues");
  assert.equal(s0.stepId, "cues");
  assert.deepEqual(s0.answers.decision, { ids: ["send"], own: null });
  assert.equal(M.inlineStart(ctx({ frame: "hosted" }), "cues").stepId, "decision", "no decision: start at the decision");
  const go = (events) => run(events, hosted, s0);
  const answered = (a) => go([...cues("hot"), sank, pick("answer", a), next]);
  assert.equal(answered("wait").stepId, "look", "inside a host, no wait screens: the host owns the wait");
  assert.deepEqual(M.inlineResult(hosted, run([next], hosted, answered("wait"))).ids, ["finished", "wait"]);
  assert.deepEqual(M.inlineResult(hosted, run([next], hosted, answered("no"))).ids, ["finished", "no_go"]);
  const calmYes = go([...cues("calm"), sank, pick("answer", "yes"), next, next]);
  assert.deepEqual(M.inlineResult(hosted, calmYes).ids, ["finished", "go"]);
  const urgent = go([...cues("hot"), sank, pick("answer", "yes"), next, pick("yes_check", "urgent"), next, next]);
  assert.deepEqual(M.inlineResult(hosted, urgent).ids, ["finished", "wait"], "an urgent yes is a wait");
  assert.deepEqual(skill.inline.outcomes, ["go", "wait", "no_go"]);
});

test("One message's cooling screen runs it inline: wait → hold it, a quiet no → save it and remind me, a yes → the card", () => {
  const one = content.skills.find((s) => s.id === "dear_man_one");
  const wise = one.steps.find((s) => s.id === "wise");
  assert.equal(wise.embed, "inlineSkill");
  assert.deepEqual(wise.props.ctx, { situationId: "send", frame: "hosted", band: "$ctx.band" });
  assert.equal(wise.props.enterAt, "cues");
  const to = Object.fromEntries(wise.next.map((n) => [n.to, n.when ?? null]));
  assert.match(JSON.stringify(wise.next[0].when), /unsafe/, "unsafe first");
  assert.equal(wise.next[0].to, "later");
  assert.match(JSON.stringify(to.wait), /"wait"/);
  assert.equal(to.message, null);
  assert.ok(one.options.cool.some((o) => o.value === "wise" && o.label === "Check it with wise mind first"));
});

test("reps and close: a completed check logs a wise_mind rep (the tool's PracticeSkill); no close asked", () => {
  const ps = readFileSync("scripts/practice-spine/content.py", "utf8");
  assert.match(ps, /\("wise_mind", "Wise mind", "Preliminary", "mind", "dbt_wise_mind",[\s\S]*?\["wise-mind"\]\)/);
  for (const id of ["end", "back_end", "hurt"]) assert.equal(step(id).noClose, true, id);
});
