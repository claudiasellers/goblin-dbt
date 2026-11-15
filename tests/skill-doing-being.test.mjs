// Doing mind, being mind (PRD MF-09 skillful means; docs/design/doing-being.md) on the skill runtime: the library entry,
// the mode card on its own, a minute of being mind, and the weekly shape. Tested through the same pure machine the
// player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "doing_being");
const embedOutputs = { pebbleBowl: { ids: ["done", "partly", "skipped", "room"], measures: ["durationSec", "doneCount"] } };
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn: M.contextIn(skill, ctxIn), embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const run = (events, c = ctx(), from = M.pageStart(c)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const step = (id) => M.stepOf(skill, id);
const title = (s, c = ctx()) => M.copyText(c, step(s.stepId).title, s, M.titleSlots(c, step(s.stepId), s));
const ids = (s, fid, c = ctx()) => {
  const f = M.shownFields(c, step(s.stepId), s).find((x) => x.id === fid);
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const links = (s, c = ctx()) => {
  const st = step(s.stepId);
  return [...M.stepLinks(c, st, s), ...M.shownFields(c, st, s).flatMap((f) => M.fieldLinks(c, f, s))].map((l) => l.exit.id);
};
const offers = (s, c = ctx()) => M.offersFor(c, step(s.stepId), s).map((o) => o.exit?.id ?? o.id ?? o);

test("the skill: the doing-being tool on the new dbt_skillful_means, listed under Mindfulness with its intent; a skillful_means rep", () => {
  assert.equal(skill.toolId, "doing-being");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_skillful_means"\}\), \(s:Skill \{id: "doing_being"\}\)/);
  assert.match(readFileSync("schema/knowledge-graph.cypher", "utf8"), /MERGE \(skillful_means:TherapyConcept \{id: "dbt_skillful_means"\}\)[^;]*module: "Mindfulness"/);
  assert.match(readFileSync("schema/relationships.cypher", "utf8"), /\{id: "dbt_skillful_means"\}\), \(mod:TherapyConcept \{id: "dbt_mindfulness_module"\}\)\nMERGE \(c\)-\[:PART_OF\]->\(mod\)/);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_skillful_means", t: "doing-being"\}/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'doing-being': 'doing_being',/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'doing-being',\s+name: 'Doing mind, being mind',[\s\S]*?module: 'mindfulness'/);
  assert.match(tools, /toolId: 'doing-being', query: 'enterAt=mode'/);
  const ps = readFileSync("scripts/practice-spine/content.py", "utf8");
  assert.match(ps, /\("skillful_means", "Doing mind, being mind", "Preliminary", "mind", "dbt_skillful_means",[\s\S]*?\["doing-being"\]\)/);
  assert.doesNotMatch(ps, /\("skillful_means", \d+,/, "not in the Practice home's MF sequence (the PRD's sequence has no skillful means)");
  for (const st of skill.steps.filter((x) => x.kind === "handoff")) assert.equal(st.noClose, true, st.id);
});

test("about: the explainer (both are needed), then the card or the week; Talk to someone now on every screen", () => {
  const s0 = M.pageStart(ctx());
  assert.equal(s0.stepId, "about");
  assert.match(M.handoffLine(ctx(), step("about"), s0), /Doing mind works things out/);
  assert.deepEqual(ids(s0, "about"), ["mode", "week"]);
  assert.equal(run([pick("about", "mode"), next]).stepId, "mode");
  assert.equal(run([pick("about", "week"), next]).stepId, "week");
  assert.doesNotMatch(JSON.stringify(skill.copy), /doing mind is bad|should|just /i, "both modes are needed, never moralised");
  for (const st of skill.steps) {
    const has = (st.links ?? []).some((l) => l.exit === "safety_open") || (st.fields ?? []).some((f) => (f.links ?? []).some((l) => l.exit === "safety_open"));
    assert.ok(has, st.id);
  }
});

test("the mode card: yes or maybe → doing mind named, a minute of listening or not now, One thing as the swap; no → nothing to switch", () => {
  const card = ctx({ enterAt: "mode" });
  const s0 = M.pageStart(card);
  assert.equal(s0.stepId, "mode");
  assert.deepEqual(ids(s0, "mode", card), ["yes", "maybe", "no"]);
  const yes = run([pick("mode", "yes"), next], card);
  assert.equal(yes.stepId, "switch");
  assert.match(title(yes, card), /That sounds like doing mind/);
  assert.match(title(run([pick("mode", "maybe"), next], card), card), /That might be doing mind/);
  assert.deepEqual(ids(yes, "switch", card), ["listen", "not_now"]);
  assert.deepEqual(links(yes, card), ["one_thing", "safety_open"], "the one swap");
  const listen = run([pick("switch", "listen"), next], card, yes);
  assert.equal(listen.stepId, "listen");
  assert.equal(step("listen").embed, "pebbleBowl");
  assert.equal(step("listen").props.seconds, 60);
  const done = M.runNext(card, listen, { type: "embedDone", output: { ids: ["done"], durationSec: 60, doneCount: 4 } });
  assert.equal(done.stepId, "listen_end");
  assert.equal(step("listen_end").complete, true);
  assert.equal(run([pick("switch", "not_now"), next], card, yes).stepId, "not_now");
  const no = run([pick("mode", "no"), next], card);
  assert.equal(no.stepId, "mode_no");
  assert.match(title(no, card), /nothing to switch/);
  const ex = skill.exits.find((x) => x.id === "one_thing");
  assert.equal(ex.toolId ?? "one-thing", "one-thing");
});

test("a carried flooded reading: a heads-up first from the library, a line and the body as a link on a direct entry; never a lock", () => {
  const fl = ctx({ band: "flooded" });
  const heads = run([pick("about", "mode"), next], fl);
  assert.equal(heads.stepId, "heads_up");
  assert.equal(run([pick("heads_up", "body"), next], fl, heads).stepId, "body_first");
  assert.equal(step("body_first").complete, false);
  assert.equal(run([pick("heads_up", "go"), next], fl, heads).stepId, "mode");
  assert.equal(run([pick("about", "week"), next, pick("heads_up", "go"), next], fl).stepId, "week");
  const direct = ctx({ band: "flooded", enterAt: "week" });
  const w = M.pageStart(direct);
  assert.equal(w.stepId, "week");
  assert.deepEqual(links(w, direct), ["cool_down", "safety_open"]);
  assert.match(M.handoffLine(direct, step("week"), w), /once your body settles/);
  assert.deepEqual(links(w, ctx({ enterAt: "week" })), ["safety_open"]);
});

test("the weekly shape: mostly doing → a being break as a cue; drifting → one small doing (movement first when blank); mixed → balanced", () => {
  const wk = ctx({ enterAt: "week" });
  const s0 = M.pageStart(wk);
  assert.deepEqual(ids(s0, "week", wk), ["doing", "being", "mixed", "drifting"]);
  const cue = run([pick("week", "doing"), next], wk);
  assert.equal(cue.stepId, "cue");
  assert.deepEqual(ids(cue, "cue", wk), ["break", "drink", "hands", "travel", "bed"]);
  assert.doesNotMatch(JSON.stringify(skill.options.cue), /eat|lunch|food/i, "no eating moment");
  const end = run([pick("cue", "drink"), next], wk, cue);
  assert.equal(end.stepId, "cue_end");
  assert.match(title(end, wk), /Your being break: When I make a drink\./i);
  const ownEnd = run([own("cue", "after the school run"), next], wk, cue);
  assert.match(title(ownEnd, wk), /after the school run/);
  const drift = run([pick("week", "drifting"), next], wk);
  assert.equal(drift.stepId, "drift");
  assert.deepEqual(offers(drift, wk), ["build_mastery"]);
  const blank = ctx({ enterAt: "week", frame: "blank" });
  assert.deepEqual(offers(run([pick("week", "drifting"), next], blank), blank), ["join_in", "build_mastery"], "blank: movement first, never a being practice");
  assert.equal(run([pick("week", "mixed"), next], wk).stepId, "mixed_end");
  assert.equal(run([pick("week", "being"), next], wk).stepId, "being_end");
  assert.deepEqual(skill.exits.find((x) => x.id === "join_in").query, { frame: "blank" });
});

test("the being break: optional chips book being_break, which reopens the run at back; yes is the off-phone rep", () => {
  const wk = ctx({ enterAt: "week" });
  const booked = run([pick("week", "doing"), next, pick("cue", "hands"), next], wk);
  assert.deepEqual(step("cue_end").followUp, { type: "being_break", whenFrom: "remind" });
  assert.equal(step("cue_end").fields[0].required, undefined, "optional");
  const r = M.resumeRun(wk, M.runRecord(wk, booked), "back");
  assert.ok(r, "a run that reached the cue card reopens");
  assert.equal(r.stepId, "back");
  assert.match(title(r, wk), /Your being break: When I wash my hands\. Did you get to take one\?/);
  assert.equal(run([pick("back", "yes"), next], wk, r).stepId, "back_end");
  const ps = execFileSync("python3", ["-c", [
    "import json,sys; sys.path.insert(0,'scripts/practice-spine'); import content as c",
    "print(json.dumps([t for t in c.FOLLOW_UP_TYPES if t['id']=='being_break'][0]))",
  ].join("\n")], { encoding: "utf8" });
  const t = JSON.parse(ps);
  assert.equal(t.deepLinkTemplate, "/tool/doing-being?run={sourceSessionId}&at=back&followUp={followUpId}");
  const shipped = JSON.parse(readFileSync("src/data/content/spine.json", "utf8"));
  assert.ok(JSON.stringify(shipped).includes('"id": "being_break"') || JSON.stringify(shipped).includes('"id":"being_break"'));
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /'being_break'/);
  assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), /being_break: 'doing-being'/);
  assert.match(readFileSync("functions/src/skills/projections.ts", "utf8"), /doing_being: \{ toolId: 'doing-being', happenedField: 'back', yes: 'yes', unansweredKeepsOwn: true \}/);
});

test("hosts: Problem Solve's thinking-constantly links the card, the Practice home links the week", () => {
  const ps = content.skills.find((s) => s.id === "problem_solve");
  const sub = ps.steps.find((s) => s.id === "sub_reply");
  const l = sub.fields[0].links.find((x) => x.exit === "doing_being");
  assert.deepEqual(l.when, { eq: ["$a.sub", "tried-thinking-constantly"] });
  assert.deepEqual(ps.exits.find((x) => x.id === "doing_being").query, { enterAt: "mode" });
  assert.match(readFileSync("src/pages/Practice.tsx", "utf8"), /to="\/tool\/doing-being\?enterAt=week"/);
});
