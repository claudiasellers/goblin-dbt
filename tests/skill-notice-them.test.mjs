// Notice them (PRD IE-10, DBT IE Handout 12; docs/design/notice-them.md) on the skill runtime, part 1: who first (the
// picker's safety route never reaches the skill), notice them or do one thing fully (an off-phone practice with the
// notice_back card that reopens the run), and look again (what they did, what I added, how sure, the not-knowing card,
// the two columns). Tested through the pure machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "notice_them");
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs: { twoColumns: { ids: ["read"] } }, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const read = { type: "embedDone", output: { ids: ["read"] } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const title = (s, c = ctx()) => M.copyText(c, M.stepOf(skill, s.stepId).title, s, M.titleSlots(c, M.stepOf(skill, s.stepId), s));
const line = (s, c = ctx()) => M.handoffLine(c, M.stepOf(skill, s.stepId), s);
const values = (s, fieldId, c = ctx()) => {
  const f = M.stepOf(skill, s.stepId).fields.find((x) => x.id === fieldId);
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s);
const label = (list, v) => skill.options[list].find((o) => o.value === v).label;

const booked = (way = "notice", what = "cares", c = ctx()) => run([pick("way", way), next,
  pick(way === "fully" ? "fully_what" : "notice_what", what), next, pick("when", "tomorrow"), pick("remind", "yes"), next], c);
const reopened = (b = booked(), c = ctx()) => M.resumeRun(c, M.runRecord(c, b), "back");
const LOOK = [pick("way", "look_again"), next];
const columns = (did, added, sure, nk) => run([...LOOK, ...did.map((d) => pick("did", d)), next, ...added.map((x) => pick("added", x)), next,
  ...(sure ? [pick("sure", sure), next] : []), ...(nk ? [pick("not_knowing", nk), next] : [])]);

test("the skill: tool mindfulness-of-others on the new concept dbt_mindfulness_of_others, after the person picker, no close question", () => {
  assert.equal(skill.toolId, "mindfulness-of-others");
  assert.match(readFileSync("schema/knowledge-graph.cypher", "utf8"), /MERGE \(mindfulness_of_others:TherapyConcept \{id: "dbt_mindfulness_of_others"\}\)\nSET mindfulness_of_others \+= \{[^}]*module: "Interpersonal Effectiveness"/);
  assert.match(readFileSync("schema/relationships.cypher", "utf8"), /\{id: "dbt_mindfulness_of_others"\}\), \(mod:TherapyConcept \{id: "dbt_interpersonal_effectiveness"\}\)\nMERGE \(c\)-\[:PART_OF\]->\(mod\);/);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_mindfulness_of_others", t: "mindfulness-of-others"\}/);
  for (const f of ["functions/src/spine/tools.ts", "src/lib/spine/close.ts"]) {
    assert.match(readFileSync(f, "utf8"), /'mindfulness-of-others': \{ module: 'ie', closeKind: 'none' \}/, f);
  }
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'mindfulness-of-others',\n\s+name: 'Notice them',[\s\S]*?module: 'interpersonal-effectiveness'/);
  assert.match(tools, /toolId: 'mindfulness-of-others'/, "a Tools intent");
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'mindfulness-of-others': \['notice_them'\]/);
  const page = readFileSync("src/pages/tools/NoticeThem.tsx", "utf8");
  assert.match(page, /<PersonFirstSkill skillId="notice_them" toolId="mindfulness-of-others" questionKey="personWhoNotice" headingKey="safetyRouteNoticeHeading"/);
  assert.match(readFileSync("src/pages/ToolPage.tsx", "utf8"), /'mindfulness-of-others': NoticeThem,/);
  for (const f of ["functions/src/profile/types.ts", "src/data/profileTypes.ts"]) {
    assert.match(readFileSync(f, "utf8"), /'mindfulness-of-others': \['people'\]/, f);
  }
  assert.deepEqual(skill.accepts, ["personId", "band", "situationId", "frame"]);
});

test("the picker: someone unsafe gets the safety screen with this skill's heading, never the practice", () => {
  assert.equal(skill.copy.picker_personWhoNotice, "Who's it about?");
  assert.match(skill.copy.picker_safetyRouteNoticeHeading, /^With \{who\}, noticing danger signs is the right kind of attention\./);
  for (const k of ["picker_safeQuestion", "picker_riskQuestion", "picker_riskHarm", "picker_safetyRouteBody", "picker_safetyRouteBack"]) {
    assert.ok(skill.copy[k], k);
  }
});

test("three ways in; a carried flooded reading never gets looking again (PRD: never while flooded)", () => {
  const s = M.initialRun(skill);
  assert.equal(title(s), "What would help with them?");
  assert.deepEqual(values(s, "way"), ["notice", "look_again", "fully"]);
  assert.equal(line(s), "Curiosity, not checking on them.");
  const fl = ctx({ band: "flooded" });
  assert.deepEqual(values(s, "way", fl), ["notice", "fully"]);
  assert.match(line(s, fl), /^Looking again at what happened works better once your body settles/);
  const links = M.fieldLinks(fl, M.stepOf(skill, "way").fields[0], s).map((l) => l.exit.id);
  assert.deepEqual(links, ["cool_down", "safety_open"]);
  assert.deepEqual(values(s, "way", ctx({ situationId: "look_again" })), ["look_again", "notice", "fully"], "a link puts one first, never picks it");
  assert.deepEqual(s.answers, {});
});

test("observe: one thing to notice, curiosity not monitoring, when, and the card", () => {
  const st = run([pick("way", "notice"), next]);
  assert.equal(st.stepId, "notice");
  assert.equal(title(st), "Next time you're with them, notice one thing with curiosity.");
  assert.match(skill.copy[M.stepOf(skill, "notice").hint], /^Not checking whether they're upset\./, "the hypervigilance guard");
  const b = booked();
  assert.equal(b.stepId, "set");
  assert.equal(title(b), "That's the practice.");
  assert.equal(line(b), "I'll ask how it went. Notice yourself too: how you are when you look at them this way.");
  const unbooked = run([pick("way", "notice"), next, pick("notice_what", "face"), next, pick("when", "today"), next]);
  assert.equal(line(unbooked), "Notice yourself too: how you are when you look at them this way.", "the closing cue either way");
  assert.deepEqual(M.stepOf(skill, "when").followUp, { type: "notice_back", whenFrom: "when", when: { eq: ["$a.remind", "yes"] } });
});

test("participate: one thing to do with them fully, own words allowed", () => {
  const st = run([pick("way", "fully"), next]);
  assert.equal(st.stepId, "fully");
  assert.equal(title(st), "Pick one thing to do with them fully.");
  assert.match(skill.copy[M.stepOf(skill, "fully").hint], /No phone, and go with it/);
  const o = run([own("fully_what", "Cook together"), next], ctx(), st);
  assert.equal(o.stepId, "when");
});

test("the notice_back card reopens at back: did you get to notice them (or do it fully)?", () => {
  const r = reopened();
  assert.equal(r.stepId, "back");
  assert.equal(title(r), "Did you get to notice them?");
  assert.equal(title(reopened(booked("fully", "walk"))), "Did you get to do it fully?");
  assert.deepEqual(values(r, "back"), ["yes", "forgot", "couldnt", "not_seen", "unsafe"]);
  const yes = run([pick("back", "yes"), next], ctx(), r);
  assert.equal(yes.stepId, "noticed");
  const end = run([next], ctx(), yes);
  assert.equal(end.stepId, "noticed_end", "what you noticed is optional");
  assert.equal(title(end), "That's mindfulness of someone else.");
  assert.equal(M.resumeRun(ctx(), M.runRecord(ctx(), run([pick("way", "notice"), next])), "back"), null, "a run that never booked doesn't reopen");
});

test("forgot or didn't see them: another go books a new card; couldn't is a real answer with looking again offered", () => {
  for (const v of ["forgot", "not_seen"]) {
    const ag = run([pick("back", v), next], ctx(), reopened());
    assert.equal(ag.stepId, "again", v);
    const set = run([pick("again", "new_time"), pick("again_when", "few_days"), next], ctx(), ag);
    assert.equal(set.stepId, "again_set");
    assert.equal(line(set), "I'll ask again then.");
    const leave = run([pick("again", "leave"), next], ctx(), ag);
    assert.equal(leave.stepId, "leave");
  }
  assert.deepEqual(M.stepOf(skill, "again").followUp, { type: "notice_back", whenFrom: "again_when" });
  const couldnt = run([pick("back", "couldnt"), next], ctx(), reopened());
  assert.equal(couldnt.stepId, "couldnt");
  assert.equal(line(couldnt), "Some days it's too much to be curious about someone. That's allowed.");
  assert.deepEqual(offers(couldnt), ["recover", "look_again"]);
  assert.equal(skill.copy[skill.exits.find((e) => e.id === "look_again").label], "Look again at what happened");
  assert.deepEqual(skill.exits.find((e) => e.id === "look_again").query, { situationId: "look_again", person: "$ctx.personId" });
});

test("look again: what a camera would catch, then what I added, as two columns on paper", () => {
  const did = run([...LOOK]);
  assert.equal(did.stepId, "did");
  assert.equal(title(did), "What did they actually say or do?");
  assert.equal(skill.copy[M.stepOf(skill, "did").hint], "What a camera would have caught.");
  assert.equal(M.stepOf(skill, "did").fields[0].max, 3);
  const added = run([pick("did", "no_reply"), next], ctx(), did);
  assert.equal(added.stepId, "added");
  assert.equal(title(added), "And what did you add?");
  assert.ok(values(added, "added").includes("nothing"), "nothing added is an answer");
  const st = columns(["no_reply", "short"], ["dont_care"], "think_so", "stressed");
  assert.equal(skill.copy[skill.exits.find((e) => e.id === "one_message").label], "Send them one clear message");
  assert.equal(st.stepId, "columns");
  const step = M.stepOf(skill, "columns");
  assert.equal(step.embed, "twoColumns");
  assert.deepEqual({ ...step.props }, { left: "did", right: "added", leftLabel: "col_did", rightLabel: "col_added", next: "next", foot: "not_knowing", footLabel: "col_maybe" });
  assert.equal(skill.copy[step.hint], "Notice yourself too: how is it to see them side by side?", "the PRD's closing cue");
  const end = run([read], ctx(), st);
  assert.equal(end.stepId, "end");
  assert.equal(line(end), "Holding your reading a bit looser can make the next conversation easier.");
  assert.deepEqual(offers(end), ["one_message"]);
  assert.equal(line(run([read], ctx(), columns(["no_reply"], ["angry"], "not_sure", "tired"))), "Not knowing leaves room. Holding it a bit looser can make the next conversation easier.");
});

test("never asks the person to doubt themselves: sure, when what they did outweighs what was added, or nothing added, skips the not-knowing card", () => {
  const sure = columns(["loud"], ["angry"], "sure");
  assert.equal(sure.stepId, "trust");
  assert.equal(M.stepOf(skill, "trust").props.foot, undefined);
  const end = run([read], ctx(), sure);
  assert.equal(title(end), "You're sure.");
  assert.equal(line(end), "You don't have to argue yourself out of it. What they did is on the left; what it meant to you is on the right.");
  assert.deepEqual(offers(end), ["fast_let_go"]);
  assert.equal(columns(["loud", "phone"], ["angry"], "sure").stepId, "trust", "more done than added");
  assert.equal(columns(["loud"], ["angry", "always"], "sure").stepId, "not_knowing", "PRD: most chips in what they did, and sure");
  const nothing = columns(["said_no"], ["nothing"]);
  assert.equal(nothing.stepId, "trust", "nothing added: no certainty question either");
  const nEnd = run([read], ctx(), nothing);
  assert.equal(title(nEnd), "You took it as it was.");
  assert.equal(line(nEnd), "That's the practice.");
  assert.deepEqual(offers(nEnd), []);
  assert.equal(columns(["said_no"], ["nothing", "angry"]).stepId, "sure", "nothing with something else is the something else");
});

test("they meant to hurt me is always a valid answer, and goes to FAST's Let go and Recover, never to more empathy", () => {
  const nk = columns(["criticised"], ["on_purpose"], "think_so");
  assert.equal(nk.stepId, "not_knowing");
  assert.deepEqual(values(nk, "not_knowing"), ["tired", "stressed", "didnt_notice", "disagrees", "defensive", "meant_harm", "dont_know"]);
  assert.equal(label("not_knowing", "meant_harm"), "They meant to hurt me");
  const harm = run([pick("not_knowing", "meant_harm"), next], ctx(), nk);
  assert.equal(harm.stepId, "harm_seen");
  assert.equal(line(harm), "You don't have to find a kinder reading. Looking after yourself with them comes first. If they might hurt or control you, there's help for that too.");
  assert.deepEqual(offers(harm), ["fast_let_go", "recover", "ending_careful"]);
  assert.ok(M.stepOf(skill, "harm_seen").noClose);
  assert.deepEqual(skill.exits.find((e) => e.id === "ending_careful").query, { frame: "careful" });
  assert.deepEqual(skill.exits.find((e) => e.id === "fast_let_go").query, { frame: "let_go" });
});

test("danger in what they did, or on the card, goes to the other-person resources and Ending, never the practice", () => {
  for (const v of ["threatened", "hurt"]) {
    assert.equal(skill.options.did.find((o) => o.value === v).danger, "other", v);
    const st = run([...LOOK, pick("did", v)]);
    assert.ok(M.stepOf(skill, "did").crisis.some((c) => c.variant === "other_person"));
    const un = run([next], ctx(), st);
    assert.equal(un.stepId, "unsafe", v);
    assert.equal(title(un), "Your safety comes first.");
    assert.match(line(un), /^You don't have to work out what they meant\./);
    assert.deepEqual(offers(un), ["ending_careful"]);
    assert.ok(M.stepOf(skill, "unsafe").noClose);
    assert.deepEqual(M.stepOf(skill, "unsafe").crisis, [{ variant: "other_person", when: { all: [] } }]);
  }
  const back = run([pick("back", "unsafe"), next], ctx(), reopened());
  assert.equal(back.stepId, "unsafe");
  assert.equal(label("back", "unsafe"), "I don't feel safe with them");
});

test("it tends to go badly (heads_up): what was added asked lightly, *they meant to hurt me* first, Recover leads", () => {
  const hu = ctx({ frame: "heads_up" });
  const added = run([...LOOK, pick("did", "short"), next], hu);
  assert.equal(line(added, hu), "If anything. Nothing is an answer too.");
  assert.equal(line(added), "The meaning you put on it. Most of us add something.");
  const nk = run([pick("added", "angry"), next, pick("sure", "think_so"), next], hu, added);
  assert.equal(values(nk, "not_knowing", hu)[0], "meant_harm");
  assert.equal(values(nk, "not_knowing")[0], "tired");
  const harm = run([pick("not_knowing", "meant_harm"), next], hu, nk);
  assert.deepEqual(offers(harm, hu), ["recover", "fast_let_go", "ending_careful"]);
});

test("the page sends heads_up from the picker's *it tends to go badly*", async () => {
  const { noticeCtx } = await importTs("src/lib/personFirst.ts");
  assert.deepEqual(noticeCtx({ personId: null, route: "heads_up" }), { personId: "none", frame: "heads_up" });
  assert.deepEqual(noticeCtx({ personId: null, route: "ok" }), { personId: "none" });
});

test("observe copy: curiosity, never a read on how they are", () => {
  assert.ok(!values(run([pick("way", "notice"), next]), "notice_what").includes("doing"));
  assert.match(skill.copy.notice_hint, /a song you like/);
  assert.equal(skill.copy.noticed_end_line, "Attention with curiosity, off the phone. It can get easier with practice.");
});

test("Talk to someone now on every screen, on a field that is always shown", () => {
  for (const s of skill.steps) {
    const links = s.kind === "ask" ? s.fields.filter((f) => !f.showWhen).flatMap((f) => f.links ?? []) : (s.links ?? []);
    assert.ok(links.some((l) => l.exit === "safety_open"), s.id);
  }
});

test("the entry points: the debrief after *they got defensive* (look again, with the person); not the prep (its 4 KB budget)", () => {
  const prep = content.skills.find((s) => s.id === "dear_man_prep");
  assert.ok(!prep.exits.some((e) => e.toolId === "mindfulness-of-others"), "one more exit takes the prep's worst case past 4 KB");
  const deb = content.skills.find((s) => s.id === "dear_man_debrief");
  assert.deepEqual(deb.exits.find((e) => e.id === "notice_them").query, { situationId: "look_again", person: "$ctx.personId" });
  for (const id of ["good", "fix"]) {
    const o = deb.steps.find((s) => s.id === id).offers.find((x) => x.exit === "notice_them");
    assert.deepEqual(o.when, { all: [{ has: ["$a.moment.ids", "tp_defensive"] }, { not: { has: ["$a.moment.ids", "tp_escalated"] } },
      { not: { has: ["$a.moment.ids", "tp_gave_in"] } }, { not: { in: ["$a.between", ["no", "unsafe"]] } }] }, id);
  }
});

test("saved: ext.run only (no Interaction: not an ask); yes on the card is the rep", async () => {
  const src = readFileSync("functions/src/skills/projections.ts", "utf8");
  assert.match(src, /notice_them: \{ toolId: 'mindfulness-of-others', happenedField: 'back', yes: 'yes', unansweredKeepsOwn: true \}/);
  assert.doesNotMatch(src, /'mindfulness-of-others': project/);
  const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content.followUpTypes.find((t) => t.id === "notice_back");
  assert.equal(spine.deepLinkTemplate, "/tool/mindfulness-of-others?run={sourceSessionId}&at=back&followUp={followUpId}");
  assert.deepEqual(Object.keys(spine.window.chips).sort(), skill.options.when.map((o) => o.value).sort(), "every when chip is a window chip");
  assert.doesNotMatch(spine.copy.title + spine.copy.body, /\{/, "content-free: never names the person");
});

test("routing: critical / dismissive on Watchful → Check the Facts first, Notice them beside it; never flooded", async () => {
  const { graph, fixtureDeps, withPolicyOn } = await import("./lib/recommendationFixture.mjs");
  const { getStateAndToolsHandler } = await importTs("functions/src/recommendation/handler.ts");
  const on = withPolicyOn(graph);
  for (const w of ["Critical", "Dismissive"]) {
    const r = await getStateAndToolsHandler({ quadrant: "high-unpleasant", emotions: [w] }, fixtureDeps(on));
    assert.equal(r.pattern.id, "chronic_vigilance", w);
    assert.deepEqual(r.tools.map((t) => t.id), ["check-the-facts", "mindfulness-of-others"], w);
  }
  const p = await getStateAndToolsHandler({ quadrant: "high-unpleasant", emotions: ["Persecuted"] }, fixtureDeps(on));
  assert.ok(!p.tools.some((t) => t.id === "mindfulness-of-others"), "never for persecuted");
  // Words are read one at a time: with critical as well, it still shows (the safety question and the danger picks
  // answer it; notice-them.md, Routing).
  const both = await getStateAndToolsHandler({ quadrant: "high-unpleasant", emotions: ["Critical", "Persecuted"] }, fixtureDeps(on));
  assert.ok(both.tools.some((t) => t.id === "mindfulness-of-others"), JSON.stringify(both.tools.map((t) => t.id)));
  const row = on.recommendedFor.find((x) => x.id === "rf_chronic_vigilance_words_others_mindfulness-of-others");
  assert.deepEqual(row.bands, ["steady", "stirred"]);
  assert.equal(row.reviewStatus, "approved");
});
