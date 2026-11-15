// One thing (PRD MF-05 one-mindfully, with MF-09's mode card; DBT Mindfulness Handouts 5, 5c; docs/design/one-thing.md)
// on the skill runtime: one ordinary activity with your whole attention for a bounded time, with the phone (a pebble for
// each return) or without it; from a looping head a minute outside it and the doing-mind card first, and the loop asked
// in the flow. Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const R = await importTs("src/lib/recommendation.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "one_thing");
const embedOutputs = {
  pebbleBowl: { ids: ["done", "partly", "skipped", "room"], measures: ["durationSec", "doneCount"] },
  orientFind: { ids: ["done", "partly", "skipped"], measures: ["doneCount"] },
};
const ctx = (ctxIn = {}, profile = null) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const bowl = { type: "embedDone", output: { ids: ["done"], durationSec: 60, doneCount: 3 } };
const found = { type: "embedDone", output: { ids: ["done"], doneCount: 5 } };
const run = (events, c = ctx(), from = M.pageStart(c)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s).map((o) => o.id ?? o);
const ids = (s, step, c = ctx()) => {
  const f = M.shownFields(c, M.stepOf(skill, step), s)[0];
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const title = (s, c = ctx()) => M.copyText(c, M.stepOf(skill, s.stepId).title, s, M.titleSlots(c, M.stepOf(skill, s.stepId), s));
const links = (s, c = ctx()) => {
  const st = M.stepOf(skill, s.stepId);
  return [...M.stepLinks(c, st, s), ...M.shownFields(c, st, s).flatMap((f) => M.fieldLinks(c, f, s))].map((l) => l.exit.id);
};
const RUM = ctx({ enterAt: "outside", frame: "ruminate" });
// A dry activity with the phone, a minute: thing, how, length.
const DRINK = [pick("thing", "drink"), next, pick("how", "phone"), next, pick("length", "minute"), next];
const skipped = { type: "embedDone", output: { ids: ["skipped"], durationSec: 0, doneCount: 0 } };

test("the skill: tool one-thing on dbt_one_mindfully, listed under Mindfulness with its intent, close kind regulation_down", () => {
  assert.equal(skill.toolId, "one-thing");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_one_mindfully"\}\), \(s:Skill \{id: "one_thing"\}\)/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'one-thing': 'one_thing',/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'one-thing',\n\s+name: 'One thing',[\s\S]*?module: 'mindfulness',/);
  assert.match(tools, /label: 'Get out of my head', toolId: 'one-thing', query: 'enterAt=outside&frame=ruminate'/);
  for (const f of ["src/lib/spine/close.ts", "functions/src/spine/tools.ts"])
    assert.match(readFileSync(f, "utf8"), /'one-thing': \{ module: 'mf', closeKind: 'regulation_down' \}/, f);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_one_mindfully", t: "one-thing"\}/);
});

test("a plain visit: pick one thing, with the phone, a length → the pebble bowl titled with the thing's one instruction", () => {
  const s0 = M.pageStart(ctx());
  assert.equal(s0.stepId, "thing");
  assert.deepEqual(ids(s0, "thing"), ["hands", "drink", "teeth", "walk", "shower", "song", "washup", "eat"], "eating last");
  assert.equal(run([pick("thing", "drink"), next]).stepId, "how");
  assert.equal(run([pick("thing", "drink"), next, pick("how", "phone"), next]).stepId, "length");
  const doing = run(DRINK);
  assert.equal(doing.stepId, "do_minute");
  assert.equal(title(doing), skill.copy.ins_drink);
  // One song is its own length; wet hands go straight to without the phone.
  assert.equal(run([pick("thing", "song"), next, pick("how", "phone"), next]).stepId, "do_song");
  for (const w of ["hands", "shower", "washup"]) assert.equal(run([pick("thing", w), next]).stepId, "away", w);
  assert.equal(M.stepOf(skill, "do_minute").props.seconds, 60);
  assert.deepEqual(["do_minute", "do_song", "do_done"].map((id) => M.stepOf(skill, id).props.seconds), [60, 210, 300]);
  assert.equal(run([bowl], ctx(), doing).stepId, "with");
});

test("without the phone: the instruction, put it down, then I'm back; own words carry into the instruction", () => {
  const away = run([own("thing", "fold the laundry"), next, pick("how", "away"), next]);
  assert.equal(away.stepId, "away");
  assert.equal(title(away), "All of your attention on fold the laundry.");
  assert.equal(M.stepOf(skill, "away").hint, "away_hint");
  assert.equal(run([pick("away", "back"), next], ctx(), away).stepId, "with");
});

test("how much you were with it: every answer is the practice; a plain visit ends without the close card", () => {
  for (const w of ["with", "in_out", "elsewhere"]) {
    const end = run([...DRINK, bowl, pick("with", w), next]);
    assert.equal(end.stepId, "end", w);
  }
  const end = M.stepOf(skill, "end");
  assert.ok(end.noClose, "the with-it answer is the close");
  assert.equal(skill.copy.end_title, "You gave one thing your attention. Coming back is the skill.");
  // *Move on* before the bowl started: no praise, nothing asked.
  const skip = run([...DRINK, skipped]);
  assert.equal(skip.stepId, "skip_end");
  assert.ok(M.stepOf(skill, "skip_end").noClose);
  assert.ok(!M.stepOf(skill, "skip_end").followUp);
  assert.equal(M.stepOf(skill, "skip_end").complete, false, "Move on before it started is no practice: not complete, no rep");
  assert.equal(skill.copy.with_line, "In and out is the practice. Each time you came back, that was it.");
});

test("the rumination variant: a minute outside your head (Look or Listen), the doing-mind card, then one thing", () => {
  const s0 = M.pageStart(RUM);
  assert.equal(s0.stepId, "outside");
  assert.deepEqual(ids(s0, "outside", RUM), ["look", "listen"]);
  const look = run([pick("outside", "look"), next], RUM);
  assert.equal(look.stepId, "look");
  assert.equal(M.stepOf(skill, "look").embed, "orientFind");
  const mode = run([found], RUM, look);
  assert.equal(mode.stepId, "mode");
  const listen = run([pick("outside", "listen"), next], RUM);
  assert.equal(M.stepOf(skill, listen.stepId).embed, "pebbleBowl");
  assert.equal(run([bowl], RUM, listen).stepId, "mode");
  for (const m of ["yes", "maybe"]) assert.equal(run([pick("mode", m), next], RUM, mode).stepId, "mode_yes", m);
  assert.equal(title(run([pick("mode", "maybe"), next], RUM, mode), RUM), skill.copy.mode_maybe_title, "maybe is never told it's doing mind");
  assert.equal(run([pick("mode", "no"), next], RUM, mode).stepId, "mode_no");
  const thing = run([pick("mode", "yes"), next, pick("go", "go"), next], RUM, mode);
  assert.equal(thing.stepId, "thing");
});

test("the loop, asked in the flow: louder → the body or a job for your mind; quieter → the end; not now → a short end", () => {
  const loop = M.stepOf(skill, "loop").fields[0];
  assert.equal(loop.askFresh, "thenVsNow");
  assert.deepEqual(skill.options.loop.map((o) => o.label), ["Louder", "About the same", "Quieter", "Much quieter"]);
  const mode = run([pick("outside", "listen"), next, bowl], RUM);
  const did = run([pick("mode", "yes"), next, pick("go", "go"), next, ...DRINK, bowl, pick("with", "in_out"), next], RUM, mode);
  assert.equal(did.stepId, "loop");
  const louder = run([pick("loop", "worse"), next], RUM, did);
  assert.equal(louder.stepId, "louder");
  assert.deepEqual(offers(louder, RUM), ["cool_down", "mind_job", "safety_open"]);
  assert.equal(run([pick("loop", "better"), next], RUM, did).stepId, "end_loop");
  const short = run([pick("mode", "no"), next, pick("go_no", "not_now"), next], RUM, mode);
  assert.equal(short.stepId, "loop");
  assert.equal(run([pick("loop", "same"), next], RUM, short).stepId, "end_short");
  // *Move on* before the bowl started on the rumination variant: the loop, then the short end.
  const sk = run([pick("mode", "yes"), next, pick("go", "go"), next, ...DRINK, skipped], RUM, mode);
  assert.equal(sk.stepId, "loop");
  assert.equal(run([pick("loop", "same"), next], RUM, sk).stepId, "end_short");
  assert.ok(!M.stepOf(skill, "end_short").followUp, "no tomorrow card without a thing");
});

test("a carried flooded reading: the heads-up as the title and the body first as a link; it can still go on", () => {
  const F = ctx({ band: "flooded" });
  const s0 = M.pageStart(F);
  assert.equal(title(s0, F), skill.copy.flooded_title);
  assert.deepEqual(links(s0, F), ["cool_down", "safety_open"]);
  assert.deepEqual(links(s0, ctx()), ["safety_open"], "no body link otherwise");
  const FR = ctx({ band: "flooded", enterAt: "outside", frame: "ruminate" });
  assert.equal(title(M.pageStart(FR), FR), skill.copy.flooded_title);
  // MF-09 is any band but flooded: after the minute outside, straight to the thing, the heads-up not said twice.
  const t = run([pick("outside", "listen"), next, bowl], FR);
  assert.equal(t.stepId, "thing");
  assert.equal(title(t, FR), skill.copy.thing_title);
  assert.equal(run([pick("thing", "song"), next], F).stepId, "how", "flooded can still go on: song asks phone or not first");
});

test("eating is never offered to someone who left food out of Running low; a blank entry lists movement first", () => {
  const P = ctx({}, { pleaseRows: ["food"] });
  assert.ok(!ids(M.pageStart(P), "thing", P).includes("eat"));
  assert.ok(ids(M.pageStart(ctx()), "thing").includes("eat"));
  for (const f of ["src/data/profileTypes.ts", "functions/src/profile/types.ts"])
    assert.match(readFileSync(f, "utf8"), /'one-thing': \['pleaseRows'\]/, f);
  const B = ctx({ frame: "blank" });
  assert.equal(ids(M.pageStart(B), "thing", B)[0], "walk");
});

test("same thing tomorrow: optional chips book one_thing_again, which reopens the run; yes is the off-phone rep", () => {
  const end = M.stepOf(skill, "end");
  assert.deepEqual(end.followUp, { type: "one_thing_again", whenFrom: "when" });
  assert.equal(end.fields[0].required, undefined, "optional");
  const booked = run([...DRINK, bowl, pick("with", "with"), next, pick("when", "morning")]);
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), booked), "again");
  assert.ok(r, "a run that reached the end card reopens");
  assert.equal(r.stepId, "again");
  assert.equal(title(r), "Your one thing: Make a drink. Did you get to it with your whole attention?");
  // The rumination variant's end books the same card, and it reopens too.
  const loopEnd = run([pick("outside", "listen"), next, bowl, pick("mode", "yes"), next, pick("go", "go"), next, ...DRINK, bowl,
    pick("with", "in_out"), next, pick("loop", "better"), next, pick("when", "evening")], RUM);
  assert.equal(loopEnd.stepId, "end_loop");
  const r2 = M.resumeRun(RUM, M.runRecord(RUM, loopEnd), "again");
  assert.ok(r2, "an end_loop run reopens");
  assert.equal(r2.stepId, "again");
  const yes = run([pick("again", "yes"), next], ctx(), r);
  assert.equal(yes.stepId, "again_end");
  assert.ok(M.stepOf(skill, "again_end").noClose);
  const proj = readFileSync("functions/src/skills/projections.ts", "utf8");
  assert.match(proj, /one_thing: \{ toolId: 'one-thing', happenedField: 'again', yes: 'yes'/);
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /'one_thing_again'/);
});

test("the practice spine: a one_thing PracticeSkill, order 4 in the MF sequence, the again card in spine.json", () => {
  const spine = JSON.parse(execFileSync("python3", ["-c", [
    "import json,sys; sys.path.insert(0,'scripts/practice-spine'); import content as c",
    "s=[x for x in c.NEW_SKILLS if x[0]=='one_thing'][0]",
    "t=[x for x in c.FOLLOW_UP_TYPES if x['id']=='one_thing_again'][0]",
    "print(json.dumps({'skill': s, 'seq': c.MF_SEQUENCE, 'type': t}, default=str))",
  ].join("\n")], { encoding: "utf8" }));
  assert.equal(spine.skill[4], "dbt_one_mindfully");
  assert.deepEqual(spine.skill[spine.skill.length - 1], ["one-thing"]);
  assert.deepEqual(spine.seq.find((x) => x[0] === "one_thing").slice(0, 3), ["one_thing", 4, "One thing"]);
  assert.match(spine.type.deepLinkTemplate, /\/tool\/one-thing\?run=\{sourceSessionId\}&at=again&followUp=\{followUpId\}/);
  const shipped = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content.followUpTypes.map((t) => t.id);
  assert.ok(shipped.includes("one_thing_again"));
});

test("routing: the looping cell leads with One thing (Problem Solve beside it), opening the rumination variant", () => {
  const src = readFileSync("scripts/recommendations/content.py", "utf8");
  assert.match(src, /"rf_rumination_loop_default_one-thing"/);
  assert.equal(R.cardHref("one-thing", "rumination_loop"), "/tool/one-thing?enterAt=outside&frame=ruminate");
  assert.equal(R.cardHref("one-thing", "chronic_vigilance"), "/tool/one-thing");
});

test("Talk to someone now is on every screen", () => {
  for (const st of skill.steps) {
    const ls = [...(st.links ?? []), ...(st.fields ?? []).flatMap((f) => f.links ?? [])].map((l) => l.exit);
    const off = (st.offers ?? []).map((o) => o.exit);
    assert.ok(ls.includes("safety_open") || off.includes("safety_open"), st.id);
  }
  assert.ok(skill.exits.find((e) => e.id === "safety_open").safety);
});

test("no open-ended writing beyond the activity's few words; no breath instruction; no counts on screen", () => {
  const owns = skill.steps.flatMap((s) => (s.fields ?? []).filter((f) => f.own).map((f) => f.id));
  assert.deepEqual(owns, ["thing"]);
  assert.equal(skill.ownMax, 40);
  const copy = JSON.stringify(skill.copy);
  assert.doesNotMatch(copy, /breath|breathe/i);
  assert.doesNotMatch(copy, /streak|\b\d+ (times|reps|pebbles)\b/i);
});
