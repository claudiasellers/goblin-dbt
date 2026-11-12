// DEAR MAN's prep on the skill runtime (IE-01 Mode B, IE-B4 first PR; docs/design/dear-man-prep.md): the skill
// (scripts/skills/dear_man_prep.py) through the same pure machine the player runs, the pocket card (Mode C,
// src/lib/pocketCard.ts), the page before it (DearManPrepSkill over PersonFirstSkill and src/lib/dearManPrep.ts) and
// what the ways in carry. The projection is pinned in functions/test/unit/dearManPrep.test.cjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");
const M = await importTs("src/lib/skillRuntime/machine.ts");
const PC = await importTs("src/lib/pocketCard.ts");
const PREP = await importTs("src/lib/dearManPrep.ts");
const content = JSON.parse(read("tests/fixtures/skills-content.json"));
const skill = content.skills.find((s) => s.id === "dear_man_prep");
const embedOutputs = { pocketCard: { ids: ["seen_all", "copied"] }, breathPacer: { ids: ["done", "partly", "skipped", "dizzy"] } };
const ctx = (ctxIn = {}, profile = null) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile });
const step = (id) => skill.steps.find((s) => s.id === id);

function play(events, c = ctx(), from = M.initialRun(skill)) {
  let s = from;
  for (const e of events) s = M.runNext(c, s, e);
  return s;
}
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const values = (c, stepId, fieldId, s) =>
  M.optionGroups(c, step(stepId).fields.find((f) => f.id === fieldId), s.answers).flatMap((g) => g.options.map((o) => o.value));
const toAssert = (c = ctx(), situation = "address", describe = "addr_broke_promise") => play([
  pick("situation", situation), next, pick("matters", "relationship"), next, pick("hard", "barrier_angry"), next, next,
  pick("describe", describe), next, pick("express", "feel_disappointed"), next,
], c);
const toCard = (c = ctx()) => play([
  pick("assert", "addr_follow_through"), next, pick("reinforce", "reinf_more_trust"), next,
  pick("need", "need_reaction"), next, pick("phrase", "anchor_their_feelings"), next, pick("confident", "cue_feet"), next,
  pick("middle", "neg_trial"), next, pick("walk", "neg_yelled_at"), next,
], c, toAssert(c));

test("skill: under the dear-man tool id (D11), the third of its skills; takes the person, frame, band, refusal and what the way in carried", () => {
  assert.equal(skill.toolId, "dear-man");
  assert.equal(skill.version, "dm-prep-v1");
  assert.deepEqual(skill.accepts, ["personId", "frame", "band", "refused", "situationId", "feelingId"]);
  assert.equal(skill.start, "situation");
  assert.deepEqual(skill.options.situation.map((o) => o.value), ["ask", "boundary", "address", "pattern"], "DEAR MAN's situation ids, so the debrief counts refusals");
});

test("skill: the path is situation → matters → hard → thought → describe → express → assert → reinforce → mindful → phrase → confident → middle → walk → the pocket card → when", () => {
  const s = toCard();
  assert.equal(s.stepId, "card");
  assert.deepEqual(s.path, ["situation", "matters", "hard", "thought", "describe", "express", "assert", "reinforce", "mindful", "phrase", "confident", "middle", "walk", "card"]);
  assert.equal(step("card").embed, "pocketCard");
  const done = M.runNext(ctx(), s, { type: "embedDone", output: { ids: ["seen_all"] } });
  assert.equal(done.stepId, "when", "steady (no band): straight to *When is the conversation?*");
  assert.equal(step("when").followUp.type, "ask_outcome", "the card opens the debrief, which finds this plan");
  assert.deepEqual(skill.options.when.map((o) => o.value), ["today", "tomorrow", "this_week", "unsure"]);
});

test("skill: the options are DEAR MAN's own nodes (PRESENTS), per situation; the mirror line follows the description, under a plain question", () => {
  const s = play([pick("situation", "boundary"), next, pick("matters", "self_respect"), next, next, next]);
  const describe = values(ctx(), "describe", "describe", s);
  assert.ok(describe.includes("bound_pressure") && !describe.includes("addr_hurtful"));
  const cypher = read("schema/skills.cypher");
  for (const [label, key] of [["DearManDescribeOption", "describe"], ["DearManAssertOption", "assert"], ["DearManFeelingChip", "express"], ["DearManAnchorPhrase", "phrase"]]) {
    for (const o of skill.options[key]) {
      if (key === "express" && !o.value.startsWith("feel_")) continue;
      assert.ok(cypher.includes(`(c:${label} {id: "${o.value}"})\nMERGE (o)-[:PRESENTS]->(c)`), `${label} ${o.value} presents its DEAR MAN node`);
    }
  }
  const at = toAssert();
  const atExpress = play([pick("situation", "address"), next, pick("matters", "objective"), next, next, next, pick("describe", "addr_broke_promise"), next]);
  assert.equal(M.copyText(ctx(), step("express").title, atExpress), skill.copy.express_title, "the question stays the question (Gate 2)");
  assert.equal(M.handoffLine(ctx(), step("express"), atExpress), skill.copy.mirror_addr_broke_promise);
  assert.match(skill.copy.mirror_addr_broke_promise, /Only keep what fits\.$/, "what people often feel, never what you're supposed to");
  const own = { ...atExpress, answers: { ...atExpress.answers, describe: { ids: [], own: "x" } } };
  assert.equal(M.handoffLine(ctx(), step("express"), own), skill.copy.mirror_sit_address, "own words: the situation's line");
  assert.equal(at.stepId, "assert");
});

test("skill: an ask with a blank asks for the words (starters to change); the pocket card reads them into the blank", () => {
  const s = play([pick("assert", "ask_specific_help"), next], ctx(), toAssert(ctx(), "ask", "ask_need_help"));
  assert.equal(s.stepId, "fill");
  assert.equal(M.copyText(ctx(), step("fill").title, s), skill.copy.fill_ask_specific_help);
  assert.ok(values(ctx(), "fill", "fill", s).every((v) => v.startsWith("ask_specific_help_")), "only this ask's starters");
  assert.deepEqual(PC.fieldLines("assert", { assert: ["I'd like help with [this]"], fill: ["the shopping this week"] }, "assert", "fill"),
    ["I'd like help with the shopping this week"]);
  assert.deepEqual(PC.fieldLines("assert", { assert: ["I'd like help with [this]"] }, "assert", "fill"), ["I'd like help with [this]"], "a blank nobody filled stays");
  const noBlank = play([pick("assert", "addr_follow_through"), next], ctx(), toAssert());
  assert.equal(noBlank.stepId, "reinforce", "no blank, no fill screen");
});

test("skill: *it tends to go badly* leaves out asks to be heard and says so up front; a counted refusal offers Let go beside the asks", () => {
  const badly = ctx({ frame: "heads_up" });
  assert.equal(M.copyText(badly, step("situation").title, M.initialRun(skill)), skill.copy.situation_title_heads_up);
  const asks = values(badly, "assert", "assert", toAssert(badly));
  assert.ok(asks.length > 0 && !asks.includes("addr_hear_me") && !asks.includes("addr_acknowledge"));
  assert.ok(values(ctx(), "assert", "assert", toAssert()).includes("addr_hear_me"));
  const s = toAssert(ctx({ refused: "validation" }));
  const links = (c) => M.fieldLinks(c, step("assert").fields[0], s).map((l) => [l.exit.toolId, l.exit.query]);
  assert.deepEqual(links(ctx({ refused: "validation" })), [["fast", { frame: "let_go" }]]);
  assert.deepEqual(links(ctx()), []);
  const ask = toAssert(ctx({ refused: "validation" }), "ask", "ask_need_help");
  assert.deepEqual(M.fieldLinks(ctx({ refused: "validation" }), step("assert").fields[0], ask), [], "only for asks about something that happened or keeps happening");
});

test("skill: the anchor screen asks what you need to hear, with the coaching for the barrier picked first as a line; the phrases follow the need", () => {
  const s = play([pick("assert", "addr_follow_through"), next, next], ctx(), toAssert());
  assert.equal(s.stepId, "mindful");
  assert.equal(M.copyText(ctx(), step("mindful").title, s), skill.copy.mindful_title);
  assert.equal(M.handoffLine(ctx(), step("mindful"), s), skill.copy.coach_barrier_angry);
  const firstPicked = { ...s, answers: { ...s.answers, hard: { ids: ["barrier_guilty", "barrier_angry"], own: null } } };
  assert.equal(M.handoffLine(ctx(), step("mindful"), firstPicked), skill.copy.coach_barrier_guilty, "the barrier picked first, not the list's order");
  const none = { ...s, answers: { ...s.answers, hard: { ids: [], own: null } } };
  assert.equal(M.handoffLine(ctx(), step("mindful"), none), skill.copy.coach_default);
  const after = play([pick("need", "need_steady"), next], ctx(), s);
  const phrases = values(ctx(), "phrase", "phrase", after);
  assert.ok(phrases.includes("anchor_tears_ok") && !phrases.includes("anchor_their_feelings"));
});

test("skill: the middle-ground question carries the priority's hint", () => {
  const s = toCard();
  for (const m of ["objective", "relationship", "self_respect"]) {
    const t = M.copyText(ctx(), step("middle").title, { ...s, answers: { ...s.answers, matters: { ids: [m], own: null } } });
    assert.equal(t, skill.copy[`middle_title_${m}`]);
  }
});

test("skill: a carried band that isn't steady gets the heads-up after the plan, never before it; never a lock", () => {
  const hot = ctx({ band: "stirred" });
  const s = toCard(hot);
  assert.equal(s.stepId, "card", "the plan is built first (Claudia, 30 Sep)");
  const heads = M.runNext(hot, s, { type: "embedDone", output: { ids: [] } });
  assert.equal(heads.stepId, "hot");
  assert.equal(play([pick("hot", "ready"), next], hot, heads).stepId, "when", "I'm good to go goes straight on");
  const edge = play([pick("hot", "edge"), next], hot, heads);
  assert.equal(edge.stepId, "edge");
  assert.equal(step("edge").embed, "breathPacer");
  const again = M.runNext(hot, edge, { type: "embedDone", output: { ids: ["done"] } });
  assert.equal(again.stepId, "again");
  assert.equal(step("again").embed, "pocketCard");
});

test("skill: parts on with a kept part: who might show up comes after the barriers (the parts slice is empty with parts off)", () => {
  const withParts = ctx({}, { parts: [{ id: "p1", name: "the worrier" }] });
  const s = play([pick("situation", "ask"), next, pick("matters", "objective"), next, next, next], withParts);
  assert.equal(s.stepId, "who");
  const off = play([pick("situation", "ask"), next, pick("matters", "objective"), next, next, next]);
  assert.equal(off.stepId, "describe");
  // Never on a carried flooded reading (the old page's showCopeAhead rule).
  const flooded = play([pick("situation", "ask"), next, pick("matters", "objective"), next, next, next], ctx({ band: "flooded" }, { parts: [{ id: "p1", name: "the worrier" }] }));
  assert.equal(flooded.stepId, "describe");
});

test("skill: the debrief is one quiet link from the first screen (the old page's entry choice)", () => {
  const links = M.fieldLinks(ctx(), step("situation").fields[0], M.initialRun(skill)).map((l) => [l.exit.toolId, l.exit.query]);
  assert.deepEqual(links, [["dear-man", { mode: "debrief" }]]);
});

test("skill: a carried flooded reading offers the body first on the first screen and the heads-up (BandRule dear-man flooded), never a gate", () => {
  const flooded = ctx({ band: "flooded" });
  const first = M.fieldLinks(flooded, step("situation").fields[0], M.initialRun(skill)).map((l) => l.exit.toolId);
  assert.deepEqual(first, ["dear-man", "cool-down"]);
  assert.deepEqual(M.fieldLinks(ctx({ band: "stirred" }), step("situation").fields[0], M.initialRun(skill)).map((l) => l.exit.toolId), ["dear-man"]);
  const s = toCard(flooded);
  const heads = M.runNext(flooded, s, { type: "embedDone", output: { ids: [] } });
  assert.deepEqual(M.fieldLinks(flooded, step("hot").fields[0], heads).map((l) => l.exit.toolId), ["cool-down"]);
  assert.equal(play([pick("situation", "ask"), next], flooded).stepId, "matters", "planning still goes on");
});

test("skill: *I'm scared of what they'd do* stops the plan: the other-person resources, safety.open and Ending's careful frame, no close", () => {
  const at = play([pick("situation", "boundary"), next, pick("matters", "self_respect"), next, pick("hard", "scared")]);
  assert.equal(M.crisisFor(ctx(), step("hard"), at)?.variant, "other_person", "the banner as soon as it's tapped");
  const s = M.runNext(ctx(), at, next);
  assert.equal(s.stepId, "scared");
  const st = step("scared");
  assert.equal(st.noClose, true);
  assert.equal(M.crisisFor(ctx(), st, s)?.variant, "other_person");
  const exits = Object.fromEntries(skill.exits.map((x) => [x.id, x]));
  assert.deepEqual(st.offers.map((o) => o.exit), ["safety_open", "ending_careful"]);
  assert.deepEqual(exits.ending_careful.query, { frame: "careful" });
  assert.equal(skill.options.hard.find((o) => o.value === "scared").presents, undefined);
});

test("skill: *Rehearse it* is Cope Ahead for a conversation, carrying the part picked in who (an id read from the run, never a name)", () => {
  const ca = skill.exits.find((x) => x.id === "cope_ahead");
  assert.deepEqual(step("when").offers.map((o) => o.exit), ["cope_ahead", "notice_them"], "and Notice them, the PRD's *their side* (IE-10)");
  const withPart = { answers: { part: { ids: ["3f2c9a0e-1b2c-4d5e-8f90-123456789abc"], own: null } } };
  assert.deepEqual(M.exitQuery(ctx(), ca, withPart), { situationId: "conversation", partId: "3f2c9a0e-1b2c-4d5e-8f90-123456789abc" });
  assert.deepEqual(M.exitQuery(ctx(), ca, { answers: {} }), { situationId: "conversation" }, "no part: the key is left out");
  assert.deepEqual(M.exitQuery(ctx({ personId: "none" }), { ...ca, query: { personId: "$ctx.personId" } }, { answers: {} }), {}, "none is never carried");
});

test("skill: the visit names the feelings picked as emotion words (the old page sent the chip's label)", () => {
  assert.deepEqual(skill.emotionFields, ["express"]);
  const s = { answers: { express: { ids: ["feel_disappointed", "feel_hurt"], own: null } } };
  assert.deepEqual(M.runEmotionIds(ctx(), s), ["disappointed", "hurt"]);
});

test("pocket card: three sides in order, empty ones drop out, and Copy holds every side's heading and lines", () => {
  const props = step("card").props;
  assert.deepEqual([props.say, props.steady, props.push], [["describe", "express", "assert", "reinforce"], ["phrase", "confident"], ["middle", "walk"]]);
  const picked = { describe: ["They said they'd do something, and it didn't happen"], express: ["Disappointed"], assert: ["I need you to follow through"], phrase: ["Their feelings are theirs to hold"] };
  // As the player passes them: copy keys resolved to text.
  const c = (k) => skill.copy[props[k]];
  const resolved = { ...props, joinLead: c("joinLead"), labels: { [props.labelAField]: c("labelA"), [props.labelBField]: c("labelB") }, steadyNotes: [c("steadyNoteA"), c("steadyNoteB")] };
  const sides = PC.pocketSides(resolved, picked);
  assert.deepEqual(sides.map((s) => s.key), ["say", "steady"], "nothing to push back with: that side drops out");
  assert.deepEqual(sides[0].lines[1], { text: "I felt disappointed." }, "the feelings as one sentence (Gate 3)");
  assert.deepEqual(sides[1].lines.map((l) => l.text), ["Their feelings are theirs to hold", skill.copy.card_drift, skill.copy.card_attack], "Handout 5's Mindful on the steady card");
  const text = PC.pocketText(sides, (k) => k.toUpperCase());
  assert.match(text, /^SAY\nThey said/);
  assert.match(text, /\n\nSTEADY\nTheir feelings are theirs to hold\n/);
  assert.deepEqual(PC.pocketSides(resolved, {}), []);
  assert.deepEqual(PC.pocketSides(resolved, { phrase: [] }), [], "the notes never make a card on their own");
  const push = PC.pocketSides(resolved, { middle: ["They try it for a while"], walk: ["Being yelled at"] });
  assert.match(PC.pocketText(push, () => "PUSH"), new RegExp(`${skill.copy.card_middle}: They try it for a while\n${skill.copy.card_walk}: Being yelled at`));
  assert.equal(PC.joinWords(["hurt", "sad", "angry"]), "hurt, sad and angry");
});

test("page: the prep's ways in carry ids only (Recover: the situation, the feeling chip, a fresh band; the check-in: its first word's chip)", () => {
  const now = Date.parse("2026-11-12T10:00:00Z");
  const handoff = { source: "recovering-from-invalidation", emotionId: "dismissed", emotionName: "Dismissed", needLabel: "To be heard", intensity: 6, band: "stirred", bandAt: "2026-11-12T09:55:00Z", waitMinutes: 0, oneMessageOnly: false };
  assert.deepEqual(PREP.prepEntryCtx({ dearManHandoff: handoff }, now), { situationId: "address", feelingId: "feel_dismissed", band: "stirred" });
  assert.deepEqual(PREP.prepEntryCtx({ dearManHandoff: { ...handoff, bandAt: "2026-11-12T09:00:00Z" } }, now), { situationId: "address", feelingId: "feel_dismissed" }, "a stale band isn't carried");
  assert.equal(PREP.prepEntryCtx({ dearManHandoff: { ...handoff, band: "flooded" } }, now).band, "flooded", "a fresh flooded reading from Recover is carried, never dropped");
  assert.deepEqual(PREP.prepEntryCtx({ checkinEmotions: ["Hurt", "Angry"] }, now), { feelingId: "feel_hurt" });
  assert.deepEqual(PREP.prepEntryCtx(null, now), {});
  for (const v of Object.values(PREP.prepEntryCtx({ dearManHandoff: handoff }, now))) assert.match(v, /^[a-z_]+$/);
  const chips = new Set(skill.options.express.map((o) => o.value));
  assert.ok(chips.has("feel_dismissed") && chips.has("feel_hurt"), "the chip ids the ways in name are the skill's");
  assert.deepEqual(PREP.prepCtx({ personId: null, route: "heads_up", label: null, role: "friend" }, null, { situationId: "address" }),
    { situationId: "address", personId: "none", frame: "heads_up" });
});

test("page: the prep plays on PersonFirstSkill (the picker and safety question first); the hand-built page is gone, an old ?resume= link opens this", () => {
  const page = read("src/components/tools/dearMan/DearManPrepSkill.tsx");
  assert.match(page, /<PersonFirstSkill skillId="dear_man_prep" toolId="dear-man" questionKey="personWho" headingKey="safetyRouteHeading"/);
  const dm = read("src/pages/tools/DearMan.tsx");
  assert.match(dm, /return <Suspense fallback=\{<ToolLoading \/>\}><LazyDearManPrepSkill \/><\/Suspense>;\n\}/, "no mode, any query (?resume= too): the prep skill");
  assert.doesNotMatch(dm, /peekResumeToken|resumeLink|<DearManPrep \/>|PREP_ON_PLAYER/);
  assert.match(dm, /useEffect\(\(\) => \{ if \(resumeId\) dropResumeToken\(resumeId\); \}, \[resumeId\]\);/, "an old link's draft (own words) doesn't stay on the device");
  assert.ok(!existsSync("src/lib/dearManResume.ts"), "the hand-built prep's resume draft went with it");
  for (const k of ["picker_personWho", "picker_safetyRouteHeading", "picker_safeQuestion", "picker_riskHarm"]) assert.ok(skill.copy[k], k);
  assert.match(read("src/lib/skillRuntime/playerTools.ts"), /'dear-man': \['dear_man_debrief', 'dear_man_one', 'dear_man_prep'\]/);
  assert.match(read("functions/src/skills/projections.ts"), /await projectDearManPrep\(tx, input\);/);
});

test("skill: IE-12's thoughts about asking (DearManBarrier kind myth, PRESENTS) get their own optional screen after the barriers, up to two", () => {
  const f = step("thought").fields[0];
  assert.equal(f.id, "thought");
  assert.equal(f.max, 2);
  assert.ok(!f.required, "never required");
  assert.deepEqual(skill.options.thought.map((o) => o.value), ["myth_deserve", "myth_weak", "myth_matter", "myth_know", "myth_last", "myth_sure", "myth_alone"]);
  assert.ok(!/myth/i.test(skill.copy.thought_title + skill.copy.thought_hint), "the screen never calls them myths");
  assert.ok(!step("hard").fields.some((x) => x.id === "thought"), "not stacked under the barriers, so the safety banner stays in view");
  const scared = play([pick("situation", "address"), next, pick("matters", "relationship"), next, pick("hard", "scared"), next]);
  assert.equal(scared.stepId, "scared", "scared goes to safety, never to the thoughts");
});

test("skill: a picked thought's line leads the anchor screen, ahead of a barrier's; none picked keeps the barrier's", () => {
  const lines = step("mindful").lines;
  const first = (answers) => lines.find((l) => !l.when || (l.when.eq && answers[l.when.eq[0].slice(3)] === l.when.eq[1]))?.key;
  assert.equal(first({ hard: "barrier_angry", thought: "myth_matter" }), "coach_myth_matter");
  assert.equal(first({ hard: "barrier_angry" }), "coach_barrier_angry");
  assert.equal(first({}), "coach_default");
  const s = play([
    pick("situation", "address"), next, pick("matters", "relationship"), next, pick("hard", "barrier_angry"), next, pick("thought", "myth_deserve"), next,
  ]);
  assert.equal(s.stepId, "describe", "a thought never stops the plan");
  for (const l of lines) assert.ok(skill.copy[l.key], `${l.key} has copy`);
});
