// Keep it warm on the skill runtime (IE-B4; docs/design/give.md): the skill (scripts/skills/give.py) through the same
// pure machine the player runs, the page before it (src/pages/tools/Give.tsx over PersonFirstSkill and
// src/lib/personFirst.ts) and the two cards that reopen it. The projection is pinned in functions/test/unit/give.test.cjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");
const M = await importTs("src/lib/skillRuntime/machine.ts");
const PF = await importTs("src/lib/personFirst.ts");
const C = await importTs("src/lib/skillRuntime/conditions.ts");
const content = JSON.parse(read("tests/fixtures/skills-content.json"));
const skill = content.skills.find((s) => s.id === "give");
const embedOutputs = {
  messageComposer: { ids: ["copied", "opened", "dropped_sorry"] }, boundaryLine: { ids: ["copied"] },
  pocketCard: { ids: ["seen_all", "copied"] }, bodyCard: { ids: ["done", "partly", "skipped"] },
};
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
const values = (c, st, field, s) => M.optionGroups(c, st.fields.find((f) => f.id === field), s.answers).flatMap((g) => g.options.map((o) => o.value));
const ans = (o) => ({ answers: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ids: [v], own: null }])) });

test("skill: under the new give tool, takes the person, the frame, a carried band, a situation and a refusal; one tap to start", () => {
  assert.equal(skill.toolId, "give");
  assert.deepEqual(skill.accepts, ["personId", "frame", "band", "situationId", "refused"]);
  assert.equal(skill.start, "what");
  assert.deepEqual(skill.options.situation.map((o) => o.value), ["brought", "repair", "heated", "before_ask"]);
  assert.deepEqual(step("what").next.map((n) => n.to), ["break", "brought", "fight", "gentle"]);
  // `?situationId=` puts one first, never picked for them.
  assert.equal(step("what").fields[0].options.firstFrom, "$ctx.situationId");
});

test("skill: a carried flooded reading offers break and return only (you can't validate from flooded), with the body as a link", () => {
  const c = ctx({ band: "flooded" });
  const s0 = M.initialRun(skill);
  assert.deepEqual(values(c, step("what"), "situation", s0), ["heated"]);
  assert.equal(M.copyText(c, step("what").title, s0), skill.copy.situation_title_flooded);
  assert.deepEqual(M.fieldLinks(c, step("what").fields[0], s0).map((l) => l.exit.toolId), ["cool-down"]);
  assert.deepEqual(values(ctx(), step("what"), "situation", s0), ["brought", "repair", "heated", "before_ask"]);
  assert.deepEqual(M.fieldLinks(ctx(), step("what").fields[0], s0), [], "the body link only when flooded");
  assert.equal(play([pick("situation", "heated"), next], c).stepId, "break");
});

test("skill: someone brought something: their side first (one validation line, level-matched), then yours (FAST), then the pocket card", () => {
  let s = play([pick("situation", "brought"), next, pick("brought", "angry"), pick("angry_ok", "safe"), next]);
  assert.equal(s.stepId, "theirs");
  const lines = values(ctx(), step("theirs"), "validate", s);
  assert.ok(lines.includes("v_angry") && lines.includes("v_hear"));
  assert.ok(!lines.includes("v_lot"), "lines fit what they brought");
  assert.equal(step("theirs").fields.find((f) => f.id === "validate").max, 1, "one validation line: never a stack of them");
  s = play([pick("validate", "v_angry"), pick("interested", "q_need"), next], ctx(), s);
  assert.equal(s.stepId, "yours");
  assert.match(skill.copy.yours_title, /hear them and still disagree/);
  assert.ok(values(ctx(), step("yours"), "mine", play([pick("stance", "disagree")], ctx(), s)).every((v) => v !== "m_sorry"), "no apology offered for a view you don't share");
  s = play([pick("stance", "disagree"), next], ctx(), s);
  assert.equal(s.stepId, "b_card");
  assert.equal(step("b_card").embed, "pocketCard");
  assert.deepEqual(step("b_card").props.say, ["validate", "interested"]);
  assert.deepEqual(step("b_card").next.map((n) => n.to), ["b_end"]);
  const end = play([{ type: "embedDone", output: { ids: ["seen_all"] } }], ctx(), s);
  assert.equal(end.stepId, "b_end");
  assert.deepEqual(M.offersFor(ctx(), step("b_end"), end), ["one_message", "fast", "give_break"]);
  assert.deepEqual(exitOf("give_break").query, { situationId: "heated", person: "$ctx.personId" });
  assert.match(skill.copy.card_heats, /half an hour/, "the pocket card's break says when you'll be back");
  assert.deepEqual(exitOf("one_message").query, { mode: "one", person: "$ctx.personId" });
});

test("skill: they're angry at me asks if you're safe with them on the same screen; scared goes to the resources", () => {
  const s = play([pick("situation", "brought"), next, pick("brought", "angry")]);
  assert.equal(M.canGoOn(ctx(), s), false, "the safety check is required when they're angry");
  assert.equal(M.canGoOn(ctx(), play([pick("situation", "brought"), next, pick("brought", "request")])), true, "only when they're angry");
  const scared = play([pick("angry_ok", "scared")], ctx(), s);
  assert.equal(M.crisisFor(ctx(), step("brought"), scared)?.variant, "other_person");
  assert.equal(play([next], ctx(), scared).stepId, "scared");
  assert.equal(play([pick("angry_ok", "safe"), next], ctx(), s).stepId, "theirs");
});

test("skill: repair asks about safety first; physical or scared of them is the other-person resources and no repair", () => {
  const s = play([pick("situation", "repair"), next]);
  assert.equal(s.stepId, "fight");
  assert.match(skill.copy.fight_title, /physical/, "not *hurt*: after a fight that reads as hurt feelings");
  assert.deepEqual(skill.options.fight.map((o) => [o.value, o.danger]), [["no", undefined], ["physical", "other"], ["scared", "other"]]);
  assert.equal(play([pick("fight", "physical"), next], ctx(), s).stepId, "scared");
  const hurt = play([pick("fight", "scared")], ctx(), s);
  assert.equal(M.crisisFor(ctx(), step("fight"), hurt)?.variant, "other_person");
  const out = play([next], ctx(), hurt);
  assert.equal(out.stepId, "scared");
  assert.equal(step("scared").noClose, true);
  assert.equal(M.crisisFor(ctx(), step("scared"), out)?.variant, "other_person");
  assert.deepEqual(M.offersFor(ctx(), step("scared"), out).sort(), ["ending_careful", "safety_open"]);
  assert.deepEqual(exitOf("ending_careful").query, { frame: "careful" });
  assert.ok(!out.path.includes("guilt") && !out.path.includes("owning"));
});

test("skill: repair: guilt that fits gets one acknowledgement; guilt that doesn't gets the FAST line, never an apology", () => {
  const base = [pick("situation", "repair"), next, pick("fight", "no"), next];
  const mine = play([...base, pick("guilt", "mine"), next]);
  assert.equal(mine.stepId, "owning");
  assert.match(skill.copy.ack_title, /One sorry is enough/);
  assert.equal(step("owning").fields.find((f) => f.id === "ack").max, 1);
  const msg = play([pick("ack", "a_said"), next], ctx(), mine);
  assert.equal(msg.stepId, "r_msg");
  assert.equal(step("r_msg").embed, "messageComposer");
  assert.deepEqual(step("r_msg").props.parts, ["ack", "r_validate", "commit", "r_ask"], "acknowledge, repair, commit");
  assert.ok(!step("owning").fields.find((f) => f.id === "commit").required);
  assert.equal(step("r_msg").props.dropSorry, undefined, "a repair's sorry is the point: no *Take the sorry out*");
  const notMine = play([...base, pick("guilt", "not_mine"), next]);
  assert.equal(notMine.stepId, "no_sorry");
  assert.match(skill.copy.no_sorry_title, /don't owe an apology/);
  for (const o of skill.options.no_sorry) assert.doesNotMatch(o.label, /sorry|apologi/i, o.value);
  // Not sure: a choice, never a forced sorry; Check the Facts as a link.
  const unsure = play([...base, pick("guilt", "unsure"), next]);
  assert.equal(unsure.stepId, "unsure");
  assert.deepEqual(M.fieldLinks(ctx(), step("unsure").fields[0], unsure).map((l) => l.exit.toolId), ["check-the-facts"]);
  const warm = play([pick("unsure", "warm"), next], ctx(), unsure);
  assert.equal(warm.stepId, "no_sorry");
  assert.equal(M.copyText(ctx(), step("no_sorry").title, warm), skill.copy.no_sorry_title_unsure);
  const own = play([pick("unsure", "own_part"), next], ctx(), unsure);
  assert.equal(M.copyText(ctx(), step("owning").title, own), skill.copy.ack_title_unsure);
});

test("skill: the repair_outcome card reopens the run at *Did you get to say it?*, asked fresh each time", () => {
  assert.deepEqual(step("r_sent").followUp, { type: "repair_outcome", whenFrom: "again" });
  assert.deepEqual(skill.options.again.map((o) => o.value), ["today", "tomorrow", "this_week"]);
  assert.deepEqual(step("repaired").reopens, { after: "r_sent" });
  assert.deepEqual(step("repaired").clears, ["repaired", "between"]);
  assert.deepEqual(step("repaired").next.map((n) => n.to), ["r_later", "r_wait", "between"]);
  assert.deepEqual(M.offersFor(ctx(), step("r_wait"), ans({ repaired: "wait" })), ["fast_let_go"]);
  assert.deepEqual(exitOf("fast_let_go").query, { frame: "let_go" });
  assert.deepEqual(M.offersFor(ctx(), step("r_end"), ans({ between: "no" })), ["fast_let_go"]);
  assert.equal(exitOf("rehearse").planned, true);
});

test("skill: break and return: the line says the time, the card comes at that time, and *not yet* books it again", () => {
  const s = play([pick("situation", "heated"), next, pick("break_len", "m30")]);
  assert.deepEqual(values(ctx(), step("break"), "break_line", s), ["l_30", "c_30"], "only lines that say the time picked");
  assert.deepEqual(step("break").followUp, { type: "break_return", whenFrom: "break_len" });
  assert.deepEqual(skill.options.break_len.map((o) => o.value), ["m30", "m60", "tomorrow"]);
  const card = play([pick("break_line", "l_30"), next], ctx(), s);
  assert.equal(card.stepId, "b_line");
  assert.equal(step("b_line").embed, "boundaryLine");
  assert.deepEqual(step("back").reopens, { after: "break", again: ["more"] });
  assert.deepEqual(step("back").next.map((n) => n.to), ["scared", "more", "refused", "no_back", "still_ok"]);
  assert.deepEqual(M.offersFor(ctx(), step("refused"), ans({})), ["fast_let_go"]);
  assert.equal(step("no_back").followUp, undefined, "not going back: no card after it");
  // The break screen keeps a quiet way out for someone who isn't safe with them.
  assert.deepEqual(M.fieldLinks(ctx(), step("break").fields[0], s).map((l) => [l.exit.id, l.label]), [["safety_open", skill.copy.not_safe_link]]);
  assert.deepEqual(step("more").followUp, { type: "break_return", whenFrom: "more" });
  assert.deepEqual(M.offersFor(ctx(), step("back_end"), ans({ still_ok: "shaky" })), ["give_repair"]);
  assert.deepEqual(M.offersFor(ctx(), step("back_end"), ans({ still_ok: "yes" })), []);
  assert.deepEqual(exitOf("give_repair").query, { situationId: "repair", person: "$ctx.personId" });
  // The chips are the card's windows (scripts/practice-spine/content.py), and the server takes them.
  const spine = JSON.parse(read("src/data/content/spine.json")).content.followUpTypes;
  const br = spine.find((t) => t.id === "break_return");
  assert.deepEqual(Object.keys(br.window.chips).sort(), ["m30", "m60", "tomorrow"]);
  assert.equal(br.deepLinkTemplate, "/tool/give?run={sourceSessionId}&at=back&followUp={followUpId}");
  assert.equal(spine.find((t) => t.id === "repair_outcome").deepLinkTemplate, "/tool/give?run={sourceSessionId}&at=repaired&followUp={followUpId}");
  for (const t of ["break_return", "repair_outcome"]) assert.doesNotMatch(JSON.stringify(spine.find((x) => x.id === t).copy), /fight|sorry|break/i, `${t}: the card names nothing`);
});

test("skill: every visit a card reopens has a way out for *I don't feel safe with them*: the resources, no repair, no close", () => {
  for (const [st, field, value] of [["back", "back", "unsafe"], ["between", "between", "unsafe"], ["still_ok", "still_ok", "unsafe"]]) {
    const o = skill.options[step(st).fields[0].options.list].find((x) => x.value === value);
    assert.equal(o.danger, "other", st);
    assert.equal(M.crisisFor(ctx(), step(st), ans({ [field]: value }))?.variant, "other_person", st);
    assert.equal(step(st).next[0].to, "scared", st);
    assert.ok(step(st).next[0].when, st);
  }
});

test("skill: before an ask: GIVE's four rows, all optional, willing hands, then One message or the prep with the person", () => {
  const s = play([pick("situation", "before_ask"), next]);
  assert.equal(s.stepId, "gentle");
  assert.ok(step("gentle").fields.every((f) => !f.required), "every row optional");
  assert.deepEqual(step("gentle").fields.map((f) => f.id), ["swap", "g_question", "g_validate", "manner"]);
  for (const o of skill.options.manner) assert.doesNotMatch(o.label, /sarcas|tease|joke/i, "easy manner never sarcasm");
  const soft = play([next], ctx(), s);
  assert.equal(soft.stepId, "soft");
  assert.equal(step("soft").props.kind, "willing");
  assert.deepEqual(step("g_end").offers.map((o) => o.exit), ["fast_let_go", "one_message", "dear_man"]);
  assert.equal(step("g_card").props.steadyNoteA, "card_finish");
  assert.deepEqual(exitOf("dear_man").query, { person: "$ctx.personId" });
  // Two refused asks to be heard: GIVE for practical asks only (PRD), said on the screen.
  const lines = (c) => (step("gentle").lines ?? []).filter((l) => C.holds(l.when, M.scope(c, s))).map((l) => l.key);
  assert.deepEqual(lines(ctx({ refused: "validation" })), ["refused_line_ask"]);
  assert.deepEqual(M.offersFor(ctx({ refused: "validation" }), step("g_end"), s), ["fast_let_go", "one_message", "dear_man"], "Let go beside the asks");
  assert.deepEqual(M.offersFor(ctx(), step("g_end"), s), ["one_message", "dear_man"]);
  assert.deepEqual(lines(ctx()), []);
  assert.equal(M.copyText(ctx({ frame: "heads_up" }), step("gentle").title, s), skill.copy.gentle_title_heads_up);
});

test("skill: stirred hears its own side held first; voice: no exclamation marks, should, just or but", () => {
  for (const id of ["brought", "fight", "gentle"]) assert.ok((step(id).lines ?? []).some((l) => l.key === "stirred_line"), id);
  for (const [k, v] of Object.entries(skill.copy)) {
    if (k.startsWith("picker_")) continue;
    assert.doesNotMatch(v, /!|\bshould\b|\bjust\b|\bbut\b/i, `${k}: ${v}`);
  }
  for (const list of Object.values(skill.options)) for (const o of list) assert.doesNotMatch(o.label, /!|\bshould\b|\bjust\b/i, o.value);
});

test("page: who it's with first; the safety route's heading; two refused asks to be heard narrow it to practical asks", () => {
  assert.match(read("src/pages/tools/Give.tsx"), /<PersonFirstSkill skillId="give" toolId="give" questionKey="personWhoGive" headingKey="safetyRouteGiveHeading" ctxFor=\{giveCtx\} \/>/);
  assert.match(skill.copy.picker_safetyRouteGiveHeading, /Keeping it warm isn't your job with \{who\}/);
  const kept = (n) => [{ id: "p1", refusalsValidation: n }];
  assert.deepEqual(PF.giveCtx({ personId: "p1", route: "ok" }, kept(2)), { personId: "p1", refused: "validation" });
  assert.deepEqual(PF.giveCtx({ personId: "p1", route: "ok" }, kept(1)), { personId: "p1" });
  assert.deepEqual(PF.giveCtx({ personId: null, route: "heads_up" }, null), { personId: "none", frame: "heads_up" });
  assert.match(read("src/pages/ToolPage.tsx"), /'give': Give,/);
  assert.match(read("src/lib/skillRuntime/playerTools.ts"), /'give': \['give'\],/);
});

test("ways in: the debrief's shaky between you, Ending's try-to-change-it-first and Problem Solve's links all open it", () => {
  const exitTo = (id) => content.skills.find((s) => s.id === id).exits.find((x) => x.toolId === "give");
  assert.deepEqual([exitTo("dear_man_debrief").planned, exitTo("dear_man_debrief").query], [undefined, { situationId: "repair", person: "$ctx.personId" }]);
  assert.equal(exitTo("ending_relationships").planned, undefined);
  assert.equal(exitTo("problem_solve").planned, undefined);
  assert.ok(read("src/data/tools.ts").includes("{ id: 'give', label: 'Repair things after a fight, or keep it warm', toolId: 'give'"));
});
