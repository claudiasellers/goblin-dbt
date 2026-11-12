// Say no on the skill runtime (IE-B3; docs/design/say-no.md): the skill (scripts/skills/say_no.py) through the
// same pure machine the player runs, the message card's rules (src/lib/messageComposer.ts), the page before it
// (src/pages/tools/SayNo.tsx over src/components/people/PersonFirstSkill.tsx and src/lib/personFirst.ts) and the
// no_outcome card that reopens it. The projection is pinned in functions/test/unit/sayNo.test.cjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");
const M = await importTs("src/lib/skillRuntime/machine.ts");
const MC = await importTs("src/lib/messageComposer.ts");
const PF = await importTs("src/lib/personFirst.ts");
const content = JSON.parse(read("tests/fixtures/skills-content.json"));
const skill = content.skills.find((s) => s.id === "say_no");
const embedOutputs = { messageComposer: { ids: ["copied", "opened", "dropped_sorry"] }, boundaryLine: { ids: ["copied"] } };
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs });
const step = (id) => skill.steps.find((s) => s.id === id);
const exitTool = (id) => skill.exits.find((x) => x.id === id);

function play(events, c = ctx(), from = M.initialRun(skill)) {
  let s = from;
  for (const e of events) s = M.runNext(c, s, e);
  return s;
}
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const firm = (answers, nudge = "right") => [
  ...["f_cost", "f_values", "f_fair", "f_given", "f_later"].map((f, i) => pick(f, answers[i])), next, pick("nudge", nudge),
];
const toLevel = (answers, c) => play([pick("asking", "favour"), next, pick("pressure", "disappointed"), next, pick("why", "keep_no"), next, ...firm(answers)], c);

test("skill: under the say-no tool id, takes the person, the frame and a carried band; starts with what they're asking", () => {
  assert.equal(skill.toolId, "say-no");
  assert.deepEqual(skill.accepts, ["personId", "frame", "band"]);
  assert.equal(skill.start, "ask");
  assert.match(skill.copy.ask_hint, /allowed to say no/);
  assert.deepEqual(skill.options.asking.map((o) => o.value), ["time", "money", "favour", "listen", "physical", "values", "plans", "take_back"]);
});

test("skill: the usual path is ask → pressure → why → firm → level → compose → message → predict → sent", () => {
  let s = play([pick("asking", "time"), next, pick("pressure", "angry"), next]);
  assert.equal(s.stepId, "why");
  s = play([pick("why", "them_ok"), next, ...firm(["yes", "yes", "no", "no", "not_sure"]), next], ctx(), s);
  assert.equal(s.stepId, "compose");
  assert.deepEqual(s.path, ["ask", "pressure", "why", "firm", "level", "compose"]);
  assert.equal(step("compose").next[0].to, "message");
  assert.equal(step("message").embed, "messageComposer");
  assert.deepEqual(step("message").next.map((n) => n.to), ["predict"]);
  assert.deepEqual(step("predict").next.map((n) => n.to), ["sent"]);
});

test("skill: *I'm scared of what they'd do* or anything sexual or physical is No is enough: no sizing, no reasons, the other-person resources", () => {
  for (const events of [
    [pick("asking", "money"), next, pick("pressure", "scared"), next],
    [pick("asking", "physical"), next, pick("pressure", "hard"), next],
  ]) {
    const s = play(events);
    assert.equal(s.stepId, "enough", JSON.stringify(events));
    const after = play([pick("safe_line", "safe_no"), next], ctx(), s);
    assert.equal(after.stepId, "safe_card");
    assert.equal(step("safe_card").embed, "boundaryLine");
    assert.ok(!after.path.includes("why") && !after.path.includes("firm") && !after.path.includes("compose"));
  }
  const scared = play([pick("asking", "money"), next, pick("pressure", "scared"), next]);
  assert.equal(M.crisisFor(ctx(), step("enough"), scared)?.variant, "other_person");
  assert.equal(M.crisisFor(ctx(), step("safe_end"), play([pick("asking", "physical"), next, pick("pressure", "hard"), next]))?.variant, "other_person", "the end card always shows them");
  const physical = play([pick("asking", "physical"), next, pick("pressure", "push"), next]);
  assert.equal(M.crisisFor(ctx(), step("enough"), physical)?.variant, "other_person", "sexual or physical: the resources from the first No is enough screen");
  assert.equal(M.crisisFor(ctx(), step("safe_card"), physical)?.variant, "other_person");
  assert.ok(M.offersFor(ctx(), step("safe_end"), physical).includes("ending_careful"));
  assert.equal(M.crisisFor(ctx(), step("pressure"), play([pick("asking", "time"), next, pick("pressure", "push")]))?.variant, undefined, "not on an ordinary no");
  const end = step("safe_end");
  assert.equal(end.noClose, true);
  assert.deepEqual(M.offersFor(ctx(), end, scared).map((x) => exitTool(x).safety ? "safety.open" : exitTool(x).toolId).sort(), ["ending-relationships", "safety.open"]);
  assert.deepEqual(exitTool("ending_careful").query, { frame: "careful" });
  assert.equal(skill.options.pressure.find((o) => o.value === "scared").danger, "other");
});

test("skill: a carried flooded reading skips the sizing and offers Cool Down first", () => {
  const c = ctx({ band: "flooded" });
  const first = M.fieldLinks(c, step("ask").fields[0], M.initialRun(skill));
  assert.deepEqual(first.map((l) => l.exit.toolId), ["cool-down"]);
  assert.deepEqual(M.fieldLinks(ctx(), step("ask").fields[0], M.initialRun(skill)), [], "only when flooded");
  const s = play([pick("asking", "time"), next, pick("pressure", "push"), next], c);
  assert.equal(s.stepId, "compose");
  assert.equal(M.copyText(c, step("compose").title, s), skill.copy.compose_title_flooded);
  const all = M.optionGroups(c, step("compose").fields.find((f) => f.id === "no"), s.answers).flatMap((g) => g.options).length;
  assert.equal(all, skill.options.no.length, "unsized: every line shows");
});

test("skill: how firm is counted (IE-07, never a number shown) and named; the nudge moves it one step", () => {
  const level = (answers, nudge) => {
    const s = play([pick("asking", "favour"), next, pick("pressure", "push"), next, pick("why", "keep_no"), next, ...firm(answers, nudge ?? "right")]);
    return M.derive(ctx(), s.answers);
  };
  assert.equal(level(["no", "no", "no", "no", "no"]).level, "yes_part");
  assert.equal(level(["yes", "no", "no", "not_sure", "no"]).level, "gentle");
  assert.equal(level(["yes", "yes", "not_sure", "no", "no"]).level, "offer");
  assert.equal(level(["yes", "yes", "yes", "not_sure", "no"]).level, "firm");
  assert.equal(level(["yes", "yes", "yes", "yes", "yes"]).level, "firm_hold");
  assert.equal(level(["yes", "yes", "yes", "not_sure", "no"], "softer").final, "offer");
  assert.equal(level(["yes", "yes", "not_sure", "no", "no"], "firmer").final, "firm");
  const s = toLevel(["yes", "yes", "yes", "yes", "yes"]);
  assert.equal(M.copyText(ctx(), step("level").title, s), skill.copy.level_firm_hold);
  for (const v of Object.values(skill.copy).filter((x) => typeof x === "string")) assert.doesNotMatch(v, /\b\d+ ?(points?|\/ ?5)\b/, "no score on screen");
});

test("skill: the no lines match the level; a firm no never offers *I'd rather not*", () => {
  const lines = (answers, nudge = "right") => {
    const s = play([pick("asking", "favour"), next, pick("pressure", "push"), next, pick("why", "keep_no"), next, ...firm(answers, nudge), next]);
    assert.equal(s.stepId, "compose");
    return M.optionGroups(ctx(), step("compose").fields.find((f) => f.id === "no"), s.answers).flatMap((g) => g.options.map((o) => o.value));
  };
  const firmHold = lines(["yes", "yes", "yes", "yes", "yes"]);
  assert.ok(firmHold.includes("no_plain"));
  assert.ok(!firmHold.includes("no_rather_not"));
  const soft = lines(["no", "no", "no", "no", "no"]);
  assert.ok(soft.includes("no_part") && soft.includes("no_not_yet"));
  assert.ok(!soft.includes("no_plain"));
  for (const o of skill.options.no) assert.ok(o.levels.length > 0, o.value);
});

test("skill: why sets compose's lead line; the heads-up frame keeps it short and written", () => {
  const at = (why, c = ctx()) => {
    const s = play([pick("asking", "favour"), next, pick("pressure", "push"), next, pick("why", why), next, ...firm(["yes", "no", "no", "no", "no"]), next], c);
    return M.copyText(c, step("compose").title, s);
  };
  assert.equal(at("them_ok"), skill.copy.compose_title_warm);
  assert.equal(at("me_ok"), skill.copy.compose_title_self);
  assert.equal(at("keep_no"), skill.copy.compose_title);
  assert.equal(at("them_ok", ctx({ frame: "heads_up" })), skill.copy.compose_title_heads_up);
});

test("skill: the no_outcome card reopens the run at *Did you say no?*, asked fresh each time", () => {
  const sent = step("sent");
  assert.deepEqual(sent.followUp, { type: "no_outcome", whenFrom: "again" });
  assert.deepEqual(skill.options.again.map((o) => o.value), ["today", "tomorrow", "this_week"]);
  assert.deepEqual(step("said").reopens, { after: "sent" });
  assert.deepEqual(step("said").clears, ["said", "held", "proud"]);
  assert.deepEqual(step("said").next.map((n) => n.to), ["not_said", "partly", "held"]);
  assert.deepEqual(step("held").next.map((n) => n.to), ["gave_in", "proud"]);
  // *I gave in* is met flatly, then a rehearsal (planned) and Check the Facts for the guilt; not proud → FAST.
  assert.deepEqual(step("gave_in").offers.map((o) => o.exit), ["rehearse", "check_the_facts"]);
  assert.equal(exitTool("rehearse").planned, true);
  assert.deepEqual(step("held_end").offers.map((o) => o.exit), ["fast"]);
  assert.equal(M.offersFor(ctx(), step("held_end"), { answers: { proud: { ids: ["yes"], own: null } } }).length, 0);
});

test("skill: voice: no exclamation marks, should, just or but in the copy", () => {
  for (const [k, v] of Object.entries(skill.copy)) {
    if (k.startsWith("picker_")) continue;
    assert.doesNotMatch(v, /!|\bshould\b|\bjust\b|\bbut\b/i, `${k}: ${v}`);
  }
});

test("message card: the parts in order as one message; empty parts drop out; own words get a full stop", () => {
  assert.equal(MC.composeMessage([["I know this matters to you."], ["No, I'm not going to do that."], undefined, []]), "I know this matters to you. No, I'm not going to do that.");
  assert.equal(MC.composeMessage([[], ["can't make it"], ["I've got too much on."]]), "can't make it. I've got too much on.");
  assert.equal(MC.composeMessage([[" "], undefined]), "");
});

test("message card: the FAST strip finds a sorry and takes it out, keeping the rest", () => {
  const card = read("src/components/skillPlayer/MessageComposer.tsx");
  assert.equal(MC.sorryCount("I'm so sorry, but I can't. Sorry!"), 2);
  assert.equal(MC.sorryCount("No, I'm not going to do that."), 0);
  assert.equal(MC.dropSorry("I'm so sorry, but I can't do that."), "I can't do that.");
  assert.equal(MC.dropSorry("Sorry. No, I'm not going to do that."), "No, I'm not going to do that.");
  assert.equal(MC.dropSorry("I apologise, but that doesn't work for me."), "That doesn't work for me.");
  assert.equal(MC.dropSorry("No, I'm not going to do that."), "No, I'm not going to do that.", "nothing else touched");
  assert.equal(MC.dropSorry("I'm sorry to hear that, but no."), "No.");
  for (const t of ["I'm sorry to hear that, but no.", "Sorry to say this, but I can't.", "I'm sorry for that, but no."]) assert.equal(MC.sorryCount(MC.dropSorry(t)), 0, t);
  assert.equal(MC.dropSorry("No, sorry to disappoint you."), "No.");
  assert.equal(MC.dropSorry("No, I'm sorry, I can't."), "No, I can't.");
  assert.equal(MC.dropSorry("Sorry but no"), "No.");
  assert.equal(MC.dropSorry("Sorry about this, I can't."), "I can't.");
  // Only a whole apology clause goes: never the person's own words around one, never a meaning flipped.
  for (const t of ["sorry to the team but I can't come", "I can't. Sorry to all of you.", "Sorry for the late reply, I can't.",
    "I'm sorry that's how it is.", "I'm not sorry, I won't do it.", "No sorry state of affairs", "I'm sorry to hear about your mum, but no.",
    "I'm sorry to bother you mum but no.", "She apologises for nothing. No."]) assert.equal(MC.dropSorry(t), t, t);
  assert.equal(MC.sorryCount("I apologised already, no."), 0);
  assert.match(card, /const canDrop = !dropped && !!cleaned && cleaned !== composed\.trim\(\);/, "the button shows only when it can take one out");
  assert.equal(MC.overExplains(["I've got too much on."]), false);
  assert.equal(MC.overExplains(["x".repeat(MC.LONG_REASON + 1)]), true);
  assert.equal(MC.messagesHref("No & thanks"), "sms:?&body=No%20%26%20thanks");
  assert.doesNotMatch(card, /fetch\(|callable|httpsCallable/, "the app never sends on the person's behalf");
});

test("page: who's asking first, the safety route never reaches the skill; a reopened run skips the picker", () => {
  const page = read("src/pages/tools/SayNo.tsx");
  assert.match(page, /<PersonFirstSkill skillId="say_no" toolId="say-no" questionKey="personWhoSayNo" headingKey="safetyRouteSayNoHeading"/);
  const pfs = read("src/components/people/PersonFirstSkill.tsx");
  assert.match(pfs, /if \(reopen\.kind === 'skill'\) return <SkillPlayer skillId=\{skillId\} ctx=\{recordedPersonCtx\(checked\)\} resumeRecord=\{checked\} \/>;/, "a reopened run plays only once it has loaded, the record the gate checked");
  assert.match(pfs, /resumeRecord: resumeAfterPicker\(checked, who\)/, "after the picker: the same person reopens, anyone else is fresh");
  const player = read("src/components/skillPlayer/SkillPlayer.tsx");
  assert.match(player, /\(resumeRecord !== undefined \? Promise\.resolve\(resumeRecord\) : getSkillRun\(resumeFrom\.run, skill\.toolId\)\)/, "no second read");
  assert.match(player, /if \(inline \|\| resumeRecord === null\) return null;/, "null: the link's ?run= is ignored");
  assert.doesNotMatch(read("src/services/skills.ts"), /recentRuns/, "runs are never cached across users");
  assert.match(pfs, /if \(reopen\.kind === 'safety'\) \{\s*return \(\s*<PersonSafetyRoute/);
  assert.match(pfs, /\.catch\(\(\) => \{ if \(live\) setReopen\(\{ kind: 'picker' \}\); \}\)/, "a failed read is the picker, never a fresh run without it");
  assert.ok(pfs.indexOf("if (!pickerCopy || !safetyCopy)") < pfs.indexOf("if (reopen.kind === 'skill')"), "the reopened run needs the copy too");
  assert.match(pfs, /if \(who\.route === 'safety'\) \{\s*return \(\s*<PersonSafetyRoute/);
  assert.match(pfs, /if \(copyFailed\) return <ToolLoadError/, "fails closed");
  assert.equal(skill.copy.picker_personWhoSayNo, "Who's asking?");
  assert.match(read("schema/dear-man-safety-gates.cypher"), /c\.safetyRouteSayNoHeading = /);
  const picker = PF.personFirstPickerCopy(skill.copy, "personWhoSayNo");
  assert.equal(picker.personWho, "Who's asking?");
  assert.equal(PF.personFirstSafetyCopy(skill.copy, "safetyRouteSayNoHeading").safetyRouteHeading, skill.copy.picker_safetyRouteSayNoHeading);
  const p = { personId: "p1", label: "Sam", role: "friend", safe: "yes", risk: "none", route: "ok" };
  assert.deepEqual(PF.sayNoCtx(p), { personId: "p1" });
  assert.deepEqual(PF.sayNoCtx({ ...p, personId: null, route: "heads_up" }), { personId: "none", frame: "heads_up" });
});

test("reopen gate: only a run the player will reopen skips the picker; someone now on the safety route gets the safety screen", () => {
  const NOW = Date.parse("2026-11-11T12:00:00Z");
  const kept = (o) => ({ id: "p1", label: "Sam", role: "friend", safe: "yes", risk: "none", safeAskedAt: "2026-11-01T00:00:00Z", ...o });
  const sent = ["ask", "pressure", "why", "firm", "level", "compose", "message", "predict", "sent"];
  const run = (personId, o = {}) => ({ skillId: "say_no", versionId: skill.version, path: sent, answers: [], ctx: personId ? { personId } : {}, ...o });
  // The player's own test, as PersonFirstSkill passes it.
  const reopens = (at) => (r) => M.resumeRun(ctx(), r, at) !== null;
  const gate = (r, people, at = "said") => PF.reopenGate(r, people, reopens(at), NOW);
  assert.deepEqual(gate(null, [kept()]), { kind: "picker" });
  assert.deepEqual(gate(run("p1", { versionId: "say-no-v0" }), [kept()]), { kind: "picker" }, "another version would start fresh: ask first");
  assert.deepEqual(gate(run("p1", { skillId: "fast_review" }), [kept()]), { kind: "picker" });
  assert.deepEqual(gate(run("p1", { path: ["ask", "pressure", "why"] }), [kept()]), { kind: "picker" }, "never reached sent: nothing to ask about");
  assert.deepEqual(gate(run("p1", { path: [...sent, "said", "held", "proud", "held_end"] }), [kept()]), { kind: "picker" }, "already answered (the link opened again)");
  assert.deepEqual(gate(run("p1"), [kept()]), { kind: "skill" });
  assert.deepEqual(gate(run("none"), null), { kind: "skill" }, "nobody kept");
  assert.deepEqual(gate(run(null), null), { kind: "skill" });
  assert.deepEqual(gate(run("p1"), null), { kind: "picker" }, "the list couldn't be read: fail closed");
  assert.deepEqual(gate(run("gone"), [kept()]), { kind: "skill" }, "forgotten since: nothing to check against");
  for (const risk of ["harm", "unstated"]) {
    const g = gate(run("p1"), [kept({ safe: "no", risk })]);
    assert.equal(g.kind, "safety", risk);
    assert.equal(g.person.label, "Sam");
  }
  assert.deepEqual(gate(run("p1"), [kept({ risk: null })]), { kind: "picker" }, "never answered: ask");
  assert.deepEqual(gate(run("p1"), [kept({ safeAskedAt: "2026-07-01T00:00:00Z" })]), { kind: "picker" }, "older than 90 days: ask again");
  assert.deepEqual(gate(run("p1"), [kept({ safetyRecheckAt: "2026-11-05T00:00:00Z" })]), { kind: "picker" }, "a debrief said not safe since");
  const picked = (personId) => ({ personId, label: "Sam", role: "friend", safe: "yes", risk: "none", route: "ok" });
  assert.equal(PF.resumeAfterPicker(run("p1"), picked("p1"))?.skillId, "say_no", "the same person: the run reopens");
  assert.equal(PF.resumeAfterPicker(run("p1"), picked("p2")), null, "someone else: a fresh run, never A's outcome with B");
  assert.equal(PF.resumeAfterPicker(run("p1"), picked(null)), null);
  assert.equal(PF.resumeAfterPicker(run("none"), picked(null)), null);
  assert.equal(PF.resumeAfterPicker(null, picked("p1")), null);
  assert.ok(PF.RUN_ID.test("3f2c9a0e-1b2c-4d5e-8f90-123456789abc"));
  assert.equal(PF.RUN_ID.test("1"), false);
  const pfs = read("src/components/people/PersonFirstSkill.tsx");
  assert.match(pfs, /reopenGate\(run, profile\.slices\?\.people \?\? null, \(r\) => !!runCtx && resumeRun\(runCtx, r, at\) !== null, Date\.now\(\)\)/);
});

test("wiring: listed under Interpersonal Effectiveness with its intent; close kind none; reads people; the card's deep link", async () => {
  const T = await importTs("src/data/tools.ts");
  const tool = T.tools.find((t) => t.id === "say-no");
  assert.equal(tool.module, "interpersonal-effectiveness");
  assert.equal(tool.listed, undefined, "for everyone");
  assert.ok(T.intents.some((i) => i.toolId === "say-no"));
  assert.match(read("src/lib/spine/close.ts"), /'say-no': \{ module: 'ie', closeKind: 'none' \}/);
  assert.match(read("functions/src/spine/tools.ts"), /'say-no': \{ module: 'ie', closeKind: 'none' \}/);
  assert.match(read("src/data/profileTypes.ts"), /'say-no': \['people'\]/);
  const spine = JSON.parse(read("src/data/content/spine.json"));
  const types = spine.followUpTypes ?? spine.content?.followUpTypes;
  const t = types.find((x) => x.id === "no_outcome");
  assert.equal(t.deepLinkTemplate, "/tool/say-no?run={sourceSessionId}&at=said&followUp={followUpId}");
  assert.deepEqual(Object.keys(t.window.chips).sort(), ["this_week", "today", "tomorrow"]);
});
