// One message on the skill runtime (IE-01 Mode A, IE-B3 second PR; docs/design/one-message.md): the skill
// (scripts/skills/dear_man_one.py) through the same pure machine the player runs, the message card in its `parts`
// order, the page before it (src/components/tools/dearMan/DearManOne.tsx over PersonFirstSkill and
// src/lib/dearManOne.ts), Recover's chase hand-off and the two cards. The projection is pinned in
// functions/test/unit/dearManOne.test.cjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");
const M = await importTs("src/lib/skillRuntime/machine.ts");
const MC = await importTs("src/lib/messageComposer.ts");
const PF = await importTs("src/lib/personFirst.ts");
const ONE = await importTs("src/lib/dearManOne.ts");
const content = JSON.parse(read("tests/fixtures/skills-content.json"));
const skill = content.skills.find((s) => s.id === "dear_man_one");
const embedOutputs = { messageComposer: { ids: ["copied", "opened", "dropped_sorry"] }, waitLock: { ids: ["waited", "back_early"] } };
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs });
const step = (id) => skill.steps.find((s) => s.id === id);
const exitOf = (id) => skill.exits.find((x) => x.id === id);

function play(events, c = ctx(), from = M.initialRun(skill)) {
  let s = from;
  for (const e of events) s = M.runNext(c, s, e);
  return s;
}
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const values = (c, stepId, fieldId, s) =>
  M.optionGroups(c, step(stepId).fields.find((f) => f.id === fieldId), s.answers).flatMap((g) => g.options.map((o) => o.value));
const toMessage = (source = "calm", c = ctx(), about = "address") => play([
  pick("source", source), next, pick("about", about), next, pick("fact", "f_didnt_follow"), next, pick("felt", "let_down"), next,
  pick("give", "g_not_agree"), next, pick("ask", "a_follow_through"), next, next,
], c);

test("skill: under the dear-man tool id (D11), takes the person, the frame, a carried band, a carried word and a refusal", () => {
  assert.equal(skill.toolId, "dear-man");
  assert.equal(skill.version, "dm-one-v1");
  assert.deepEqual(skill.accepts, ["personId", "frame", "band", "emotionId", "refused"]);
  assert.equal(skill.start, "source");
  assert.deepEqual(skill.options.source.map((o) => o.value), ["calm", "hot", "unsure"], "wise_mind_check: where it's coming from");
  assert.deepEqual(skill.options.about.map((o) => o.value), ["ask", "address", "pattern"], "DEAR MAN's situation types, so the debrief counts refusals");
});

test("skill: the path is source → about → fact → felt → give → ask → why → the message card", () => {
  const s = toMessage();
  assert.equal(s.stepId, "message");
  assert.deepEqual(s.path, ["source", "about", "fact", "felt", "give", "ask", "why", "message"]);
  assert.equal(step("message").embed, "messageComposer");
  assert.deepEqual(step("message").props.parts, ["fact", "felt", "give", "ask", "why"]);
  assert.equal(step("message").props.repeatLabel, undefined, "one message, said once: no line to repeat");
  assert.equal(step("ask").fields[0].max, 1, "one ask (PRD Mode A)");
});

test("skill: the facts and asks follow what it's about; *it tends to go badly* leaves out asks to be heard", () => {
  const s = play([pick("source", "calm"), next, pick("about", "ask"), next]);
  const facts = values(ctx(), "fact", "fact", s);
  assert.ok(facts.includes("f_need_help") && !facts.includes("f_didnt_follow"));
  const toAsk = (c) => play([pick("source", "calm"), next, pick("about", "address"), next, pick("fact", "f_said_hurtful"), next, pick("felt", "hurt"), next, next], c);
  const asks = values(ctx(), "ask", "ask", toAsk(ctx()));
  assert.ok(asks.includes("a_hear_me") && asks.includes("a_acknowledge"));
  const badly = ctx({ frame: "heads_up" });
  const practical = values(badly, "ask", "ask", toAsk(badly));
  assert.ok(practical.length > 0);
  assert.ok(!practical.includes("a_hear_me") && !practical.includes("a_acknowledge"), "no validation asks with someone it goes badly with");
  assert.ok(practical.includes("a_check_first"));
  assert.equal(M.copyText(badly, step("about").title, M.initialRun(skill)), skill.copy.about_title_heads_up);
  for (const o of skill.options.ask) assert.equal(typeof o.validation, "boolean", o.value);
});

test("skill: a refused ask to be heard offers Let go beside the asks, never instead of them", () => {
  const s = play([pick("source", "calm"), next, pick("about", "pattern"), next, pick("fact", "f_keeps"), next, pick("felt", "hurt"), next, next]);
  assert.equal(s.stepId, "ask");
  const links = (c) => M.fieldLinks(c, step("ask").fields[0], s).map((l) => [l.exit.toolId, l.exit.query]);
  assert.deepEqual(links(ctx({ refused: "validation" })), [["fast", { frame: "let_go" }]]);
  assert.deepEqual(links(ctx()), []);
  assert.ok(values(ctx({ refused: "validation" }), "ask", "ask", s).includes("a_hear_me"), "the asks are all still there");
});

test("skill: a word Recover carried comes first on *How did it feel?*, never picked for them", () => {
  const s = play([pick("source", "hot"), next, pick("about", "address"), next, pick("fact", "f_said_hurtful"), next]);
  assert.equal(s.stepId, "felt");
  const c = ctx({ emotionId: "dismissed" });
  assert.equal(values(c, "felt", "felt", s)[0], "dismissed");
  assert.equal(skill.options.felt.find((o) => o.value === "dismissed").label, "I felt unheard", "a feeling, not what they meant (Gate 3)");
  assert.ok(!skill.options.felt.some((o) => /pushed away|brushed off|disrespected/.test(o.label)));
  assert.deepEqual(s.answers.felt, undefined);
  assert.equal(values(ctx({ emotionId: "not_a_word" }), "felt", "felt", s)[0], "hurt");
});

test("skill: calm goes to the card then the prediction; hot, not sure or a stirred body gets the cooling screen BEFORE the card, never a lock", () => {
  assert.equal(toMessage("calm").stepId, "message");
  assert.deepEqual(play([next], ctx(), toMessage("calm")).stepId, "predict");
  assert.equal(toMessage("hot").stepId, "cool", "the pause comes before Copy (Gate 3)");
  assert.equal(toMessage("unsure").stepId, "cool");
  const stirred = ctx({ band: "stirred" });
  assert.equal(toMessage("calm", stirred).stepId, "cool");
  const cool = toMessage("hot");
  assert.ok(!cool.path.includes("message"), "no Copy before the cooling screen");
  assert.deepEqual(skill.options.cool.map((o) => o.value), ["aloud", "hold", "later", "settle", "wise", "send"]);
  const send = play([pick("cool", "send"), next], ctx(), cool);
  assert.equal(send.stepId, "message", "sending is never locked: the card, then the prediction");
  assert.equal(play([next], ctx(), send).stepId, "predict");
  // Settle my body first keeps the message: saved with a reminder, and the body exit offered there.
  const settle = play([pick("cool", "settle"), next], ctx(), cool);
  assert.equal(settle.stepId, "later");
  assert.deepEqual(step("later").offers, [{ exit: "cool_down", when: { eq: ["$a.cool", "settle"] } }]);
  assert.equal(M.copyText(ctx(), step("later").lines[0].key, settle), skill.copy.settle_line);
  const aloud = play([pick("cool", "aloud"), next], ctx(), cool);
  assert.equal(aloud.stepId, "aloud");
  assert.equal(step("aloud").embed, "messageComposer", "the message stays copyable");
  const hold = play([pick("cool", "hold"), next], ctx(), cool);
  assert.equal(hold.stepId, "wait");
  assert.equal(step("wait").embed, "waitLock");
  assert.equal(step("resend").embed, "messageComposer");
  assert.deepEqual(step("wait").next.map((n) => n.to), ["resend"]);
  assert.equal(play([pick("cool", "later"), next], ctx(), cool).stepId, "later");
  const flooded = ctx({ band: "flooded" });
  assert.deepEqual(M.fieldLinks(flooded, step("source").fields[0], M.initialRun(skill)).map((l) => l.exit.toolId), ["cool-down"]);
  assert.deepEqual(M.fieldLinks(ctx(), step("source").fields[0], M.initialRun(skill)), []);
});

test("skill: *Save it and remind me* books ask_delayed; its card reopens at *Still want to send it?*", () => {
  const later = step("later");
  assert.deepEqual(later.followUp, { type: "ask_delayed", whenFrom: "later_when" });
  assert.deepEqual(skill.options.later.map((o) => o.value), ["hour", "today", "tomorrow"]);
  assert.match(skill.copy.later_line, /won't say who it's for or what it says/);
  assert.match(skill.copy.later_line, /^Pick a time/, "never says a reminder is booked before a time is picked (Gate 1)");
  assert.deepEqual(step("back").reopens, { after: "later" });
  assert.deepEqual(step("back").next.map((n) => n.to), ["later", "dropped", "resend"]);
  const path = [...toMessage("hot").path, "cool", "later"];
  const rec = { skillId: "dear_man_one", versionId: skill.version, path, answers: [{ fieldId: "about", optionIds: ["address"] }, { fieldId: "ask", optionIds: ["a_follow_through"] }], ctx: {} };
  const r = M.resumeRun(ctx(), rec, "back");
  assert.equal(r?.stepId, "back");
  assert.deepEqual(r.answers.ask.ids, ["a_follow_through"], "the message comes back with the run");
  assert.equal(M.resumeRun(ctx(), { ...rec, path: toMessage("hot").path }, "back"), null, "never saved: nothing to come back to");
  const yes = play([pick("back", "send"), next], ctx(), r);
  assert.equal(yes.stepId, "resend");
  assert.equal(play([pick("back", "dropped"), next], ctx(), r).stepId, "dropped");
});

test("skill: the prediction, then *Want me to ask how it went?* books ask_outcome (DEAR MAN's debrief)", () => {
  assert.deepEqual(skill.options.predict.map((o) => o.value), ["well", "mixed", "badly", "no_answer"]);
  assert.deepEqual(skill.options.sure.map((o) => o.value), ["sure", "think_so", "not_sure"]);
  assert.deepEqual(step("sent").followUp, { type: "ask_outcome", whenFrom: "again" });
  assert.deepEqual(skill.options.again.map((o) => o.value), ["today", "tomorrow", "this_week"]);
  const p = play([next, pick("predict", "badly"), next], ctx(), toMessage("calm"));
  assert.equal(p.stepId, "sure", "one question a screen (Gate 2)");
  const s = play([next], ctx(), p);
  assert.equal(s.stepId, "sent", "how sure is optional");
  assert.equal(M.copyText(ctx(), step("sent").lines[0].key, s), skill.copy.sent_line_badly);
});

test("message card: the parts in the order they're said; *Take the sorry out* works on the whole message", () => {
  const msg = MC.composeMessage([["You said you'd do something, and it didn't happen"], ["I felt let down"], ["I'm not asking you to agree with me"], ["Could you let me know if plans change?"], undefined]);
  assert.equal(msg, "You said you'd do something, and it didn't happen. I felt let down. I'm not asking you to agree with me. Could you let me know if plans change?");
  assert.equal(MC.dropSorry("I'm sorry, I felt let down. Could you call?"), "I felt let down. Could you call?");
  assert.equal(MC.dropSorry("Sorry to bring this up, but you cancelled again."), "You cancelled again.", "own words' usual apology (Gate 2)");
  assert.equal(MC.dropSorry("Sorry to ask, could you call?"), "Could you call?");
  assert.match(read("src/components/skillPlayer/MessageComposer.tsx"), /sorry > 0 && canDrop && text\('sorryLine'\)/, "the sorry line only with its button");
  const card = read("src/components/skillPlayer/MessageComposer.tsx");
  assert.match(card, /order \? order\.map\(\(f\) => picked\?\.\[f\]\) : \[of\('opener'\), of\('field'\), of\('reason'\), of\('alt'\)\]/);
  assert.match(read("src/components/skillPlayer/embeds.ts"), /parts: \{ type: 'fields', optional: true \}/);
  assert.doesNotMatch(card, /fetch\(|callable|httpsCallable/, "the app never sends on the person's behalf");
});

test("page: who it's for first, the safety route never reaches the skill; the context it passes", () => {
  const page = read("src/components/tools/dearMan/DearManOne.tsx");
  assert.match(page, /<PersonFirstSkill skillId="dear_man_one" toolId="dear-man" questionKey="personWhoOne" headingKey="safetyRouteOneHeading" ctxFor=\{oneMessageCtx\} \/>/);
  assert.equal(skill.copy.picker_personWhoOne, "Who's the message for?");
  assert.match(read("schema/dear-man-safety-gates.cypher"), /c\.safetyRouteOneHeading = /);
  assert.equal(PF.personFirstPickerCopy(skill.copy, "personWhoOne").personWho, "Who's the message for?");
  assert.ok(PF.personFirstSafetyCopy(skill.copy, "safetyRouteOneHeading"));
  const p = { personId: "p1", label: "Sam", role: "friend", safe: "yes", risk: "none", route: "ok" };
  assert.deepEqual(ONE.oneMessageCtx(p, [{ id: "p1", refusalsValidation: 0 }]), { personId: "p1" });
  assert.deepEqual(ONE.oneMessageCtx(p, [{ id: "p1", refusalsValidation: 1 }]), { personId: "p1", refused: "validation" });
  assert.deepEqual(ONE.oneMessageCtx({ ...p, personId: null, route: "heads_up" }, null), { personId: "none", frame: "heads_up" });
  assert.deepEqual(ONE.oneMessageCtx(p, null), { personId: "p1" }, "no list: nothing counted");
});

test("Recover: *Ask them* after the chase pull opens One message with the word and the band; other asks keep the prep", () => {
  const h = { source: "recovering-from-invalidation", emotionId: "rejected", emotionName: "Rejected", needLabel: "x", intensity: 4, band: "stirred", waitMinutes: 20, oneMessageOnly: true };
  assert.deepEqual(ONE.oneMessageState(h), { emotionId: "rejected", band: "stirred" });
  assert.deepEqual(ONE.oneMessageState({ ...h, band: undefined }), { emotionId: "rejected" });
  assert.equal(ONE.ONE_MESSAGE_PATH, "/tool/dear-man?mode=one");
  const rec = read("src/pages/tools/InvalidationRecovery.tsx");
  assert.match(rec, /if \(handoff\?\.oneMessageOnly\) \{\s*\/\/[^\n]*\n\s*navigate\(ONE_MESSAGE_PATH, \{ state: \{ skillCtx: oneMessageState\(withBand\(/,
    "the player reads its context from state.skillCtx (Gate 1)");
  assert.ok(rec.indexOf("handoff?.oneMessageOnly") < rec.indexOf("navigate('/tool/dear-man', { state: { dearManHandoff"), "the chase check comes first");
});

test("reopened: the person and frame the first visit recorded carry into the reopened visit (Gate 1)", () => {
  const P = "7a2c9a0e-1b2c-4d5e-8f90-123456789abc";
  assert.deepEqual(PF.recordedPersonCtx({ ctx: { personId: P, frame: "heads_up", band: "flooded" } }), { personId: P, frame: "heads_up" });
  assert.deepEqual(PF.recordedPersonCtx({ ctx: { personId: "none" } }), { personId: "none" });
  assert.deepEqual(PF.recordedPersonCtx({ ctx: { personId: "Sam" } }), {});
  assert.deepEqual(PF.recordedPersonCtx(null), {});
  assert.match(read("src/components/people/PersonFirstSkill.tsx"), /reopen\.kind === 'skill'\) return <SkillPlayer skillId=\{skillId\} ctx=\{recordedPersonCtx\(checked\)\} resumeRecord=\{checked\} \/>/);
});

test("Gate 3 wording: camera facts, Truthful warm line, a hedged hint, Let go only for being heard", () => {
  const label = (f, v) => skill.options[f].find((o) => o.value === v).label;
  assert.equal(label("fact", "f_how_we_do"), "We've been doing this the same way for a while");
  assert.equal(label("give", "g_not_mean"), "I'm not assuming you meant it that way");
  assert.deepEqual(skill.options.give.find((o) => o.value === "g_not_mean").about, ["address"]);
  assert.match(skill.copy.sorry_line, /Keep it only if it's for something you did/);
  assert.equal(skill.copy.ask_hint, "One small ask is often easier to say yes to.");
  const need = play([pick("source", "calm"), next, pick("about", "ask"), next, pick("fact", "f_need_help"), next, pick("felt", "hurt"), next, next]);
  assert.equal(need.stepId, "ask");
  assert.deepEqual(M.fieldLinks(ctx({ refused: "validation" }), step("ask").fields[0], need), [], "no Let go for something I need");
  assert.ok(!values(ctx(), "give", "give", need).includes("g_not_mean"));
});

test("wiring: the cards, the projection, the Tools intent and the player's skills", async () => {
  const spine = JSON.parse(read("src/data/content/spine.json"));
  const delayed = spine.content.followUpTypes.find((t) => t.id === "ask_delayed");
  assert.equal(delayed.deepLinkTemplate, "/tool/dear-man?mode=one&run={sourceSessionId}&at=back&followUp={followUpId}");
  assert.doesNotMatch(JSON.stringify([delayed.copy, delayed.notification]), /message|send|\{label\}|\{who\}/i, "tech safety: the card says nothing about who or what");
  assert.match(read("functions/src/spine/copeAheadAfter.ts"), /ask_delayed: 'dear-man'/);
  assert.match(read("functions/src/spine/toolSession.ts"), /'ask_delayed'[^\]]*\] as const/);
  assert.match(read("functions/src/skills/projections.ts"), /'dear-man': projectDearMan,/);
  assert.match(read("src/lib/skillRuntime/playerTools.ts"), /'dear-man': \['dear_man_debrief', 'dear_man_one', 'dear_man_prep'\]/);
  const T = await importTs("src/data/tools.ts");
  const intent = T.intents.find((i) => i.id === "one_message");
  assert.deepEqual([intent.toolId, intent.query], ["dear-man", "mode=one"]);
  assert.match(read("src/pages/Tools.tsx"), /\$\{intent\.query \? `\?\$\{intent\.query\}` : ''\}/);
  assert.deepEqual([exitOf("let_go").toolId, exitOf("let_go").query], ["fast", { frame: "let_go" }]);
});
