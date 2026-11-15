// Join in (PRD MF-10 participate; docs/design/join-in.md) on the skill runtime: pick, the beat or the phone down, how
// much you were in it, and next time with someone. Not offered flooded or angry. Tested through the same pure machine
// the player runs, plus the beat's pure rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const B = await importTs("src/lib/beatPulse.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "join_in");
const embedOutputs = { beatPulse: { ids: ["done", "partly", "skipped"], measures: ["durationSec", "doneCount"] } };
const ctx = (ctxIn = {}, carried = []) => ({ skill, shared: content, carried, gridIds: new Set(carried), emotionLabel: (x) => x, ctxIn: M.contextIn(skill, ctxIn), embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const beat = (id = "done") => ({ type: "embedDone", output: { ids: [id], durationSec: 60, doneCount: 12 } });
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
const PICKS = ["song", "hum", "tap", "game", "chore", "own", "wound_up"];

test("the skill: the join-in tool on dbt_participate, listed under Mindfulness with its intent; a participate rep at order 7", () => {
  assert.equal(skill.toolId, "join-in");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_participate"\}\), \(s:Skill \{id: "join_in"\}\)/);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_participate", t: "join-in"\}/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'join-in': 'join_in',/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'join-in',\s+name: 'Join in',[\s\S]*?module: 'mindfulness'/);
  assert.match(tools, /toolId: 'join-in', emoji/);
  const seq = JSON.parse(execFileSync("python3", ["-c", "import json,sys; sys.path.insert(0,'scripts/practice-spine'); import content as c; print(json.dumps(c.MF_SEQUENCE))"], { encoding: "utf8" }));
  assert.deepEqual(seq.map((s) => [s[0], s[1]]).slice(-2), [["participate", 7], ["kind_wishes", 8]], "participate after effectively (the PRD's order), kind wishes last");
  const ps = readFileSync("scripts/practice-spine/content.py", "utf8");
  assert.match(ps, /\("participate", "Participate", "Preliminary", "mind", "dbt_participate",[\s\S]*?\["join-in"\]\)/);
  for (const st of skill.steps.filter((x) => x.kind === "handoff")) assert.equal(st.noClose, true, st.id);
  for (const st of skill.steps) {
    const has = (st.links ?? []).some((l) => l.exit === "safety_open") || (st.fields ?? []).some((f) => (f.links ?? []).some((l) => l.exit === "safety_open"));
    assert.ok(has, `${st.id}: Talk to someone now on every screen`);
  }
});

test("pick: the PRD's six in order, then I'm wound up or angry; the beat for move, hum and tap; the phone down for a game, a chore or my own", () => {
  const s0 = M.pageStart(ctx());
  assert.equal(s0.stepId, "pick");
  assert.deepEqual(ids(s0, "thing"), PICKS);
  assert.deepEqual(links(s0), ["safety_open"]);
  for (const v of ["song", "hum", "tap"]) assert.equal(run([pick("thing", v), next]).stepId, "play", v);
  for (const v of ["game", "chore", "own"]) assert.equal(run([pick("thing", v), next]).stepId, "away", v);
  assert.match(title(run([pick("thing", "hum"), next])), /Hum or sing along/);
  assert.equal(step("play").embed, "beatPulse");
  assert.equal(step("play").props.bpm, 100);
  assert.equal(skill.steps.find((s) => s.id === "pick").fields[0].own, undefined, "no open-ended writing");
});

test("not offered flooded or angry: Bring it down first is the one chip; the next card offers the body and a slower practice, no rep", () => {
  const fl = ctx({ band: "flooded" });
  const s0 = M.pageStart(fl);
  assert.deepEqual(ids(s0, "thing", fl), ["not_now"]);
  assert.deepEqual(links(s0, fl), ["safety_open"]);
  assert.match(title(s0, fl), /Your body's loud/);
  const angry = ctx({}, ["furious"]);
  assert.deepEqual(ids(s0, "thing", angry), ["not_now"]);
  assert.match(title(s0, angry), /This one turns things up/);
  const end = run([pick("thing", "not_now"), next], angry);
  assert.equal(end.stepId, "gate_end");
  assert.equal(step("gate_end").complete, false, "no rep");
  assert.equal(step("gate_end").noClose, true);
  assert.deepEqual(step("gate_end").offers.map((o) => o.exit), ["cool_down", "listen"]);
  assert.match(title(end, angry), /Not now is fine/);
  // No entry carries the check-in's words yet: the person can say it on the pick.
  const wound = run([pick("thing", "wound_up"), next]);
  assert.equal(wound.stepId, "gate_end");
  assert.match(title(wound), /Then bring it down first/);
  // A carried word that isn't anger, or a calm reading, keeps every pick.
  assert.deepEqual(ids(s0, "thing", ctx({}, ["sad"])), PICKS);
  assert.deepEqual(skill.exits.find((x) => x.id === "listen").query, { frame: "listen" });
});

test("tempo: stirred gets the moderate minute; blank gets short quicker rounds with a settle between", () => {
  const st = ctx({ band: "stirred" });
  const calm = run([pick("thing", "tap"), next], st);
  assert.equal(calm.stepId, "play_calm");
  assert.ok(step("play_calm").props.bpm < step("play").props.bpm);
  const bl = ctx({ frame: "blank" });
  const r1 = run([pick("thing", "song"), next], bl);
  assert.equal(r1.stepId, "play_blank");
  assert.ok(step("play_blank").props.seconds <= 30, "the somatic dose cap");
  assert.ok(step("play_blank").props.bpm > step("play").props.bpm);
  const settle = M.runNext(bl, r1, beat());
  assert.equal(settle.stepId, "settle");
  assert.equal(run([pick("settle", "again"), next], bl, settle).stepId, "play_blank2");
  assert.equal(run([pick("settle", "enough"), next], bl, settle).stepId, "with");
  // Move on in the second round still reaches the close: the first round happened.
  const r2 = run([pick("settle", "again"), next], bl, settle);
  assert.equal(M.runNext(bl, r2, beat("skipped")).stepId, "with");
});

test("close: in it, half in, watching myself, each answered plainly; Move on before it started is no rep", () => {
  const played = M.runNext(ctx(), run([pick("thing", "song"), next]), beat());
  assert.equal(played.stepId, "with");
  assert.deepEqual(ids(played, "with"), ["in", "half", "watching"]);
  const watched = run([pick("with", "watching"), next], ctx(), played);
  assert.equal(watched.stepId, "end");
  assert.match(M.handoffLine(ctx(), step("end"), watched), /Watching yourself is the thing you practise dropping/);
  assert.equal(step("end").complete, true);
  const skipped = M.runNext(ctx(), run([pick("thing", "song"), next]), beat("skipped"));
  assert.equal(skipped.stepId, "skip_end");
  assert.equal(step("skip_end").complete, false);
  const away = run([pick("thing", "game"), next, pick("away", "back"), next]);
  assert.equal(away.stepId, "with");
});

test("next time, with someone: optional chips book join_in_social, which reopens the run at social; yes is the off-phone rep", () => {
  const booked = run([pick("thing", "chore"), next, pick("away", "back"), next, pick("with", "in"), next]);
  assert.equal(booked.stepId, "end");
  assert.deepEqual(step("end").followUp, { type: "join_in_social", whenFrom: "when" });
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), booked), "social");
  assert.ok(r);
  assert.equal(r.stepId, "social");
  assert.equal(run([pick("social", "yes"), next], ctx(), r).stepId, "social_end");
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /'join_in_social'/);
  assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), /join_in_social: 'join-in'/);
  assert.match(readFileSync("functions/src/skills/projections.ts", "utf8"), /join_in: \{ toolId: 'join-in', happenedField: 'social', yes: 'yes', unansweredKeepsOwn: true \}/);
  assert.match(readFileSync("src/data/content/spine.json", "utf8"), /"deepLinkTemplate": "\/tool\/join-in\?run=\{sourceSessionId\}&at=social&followUp=\{followUpId\}"/);
});

test("the beat's pure rules: tempo and length clamped, outcomes, taps a measure; sound off until turned on", () => {
  assert.equal(B.beatBpm({}), 100);
  assert.equal(B.beatBpm({ bpm: 300 }), 140);
  assert.equal(B.beatIntervalMs(120), 500);
  assert.equal(B.beatMs({ seconds: 5 }), 15000);
  assert.deepEqual(B.beatOutput(false, 0, 0, 0).ids, ["skipped"]);
  assert.deepEqual(B.beatOutput(true, 0.4, 24000, 7), { ids: ["partly"], durationSec: 24, doneCount: 7 });
  assert.deepEqual(B.beatOutput(true, 1, 60000, 0).ids, ["done"]);
  const tsx = readFileSync("src/components/skillPlayer/BeatPulse.tsx", "utf8");
  assert.match(tsx, /const \[sound, setSound\] = useState\(false\);/, "sound starts off (MF rule 8)");
  assert.match(tsx, /aria-pressed=\{sound\}/);
  assert.match(tsx, /if \(covered && running\)/, "a dialog over the step stops the beat");
  assert.doesNotMatch(tsx, /\{taps\.current\}|doneCount\}/, "taps are never shown");
});

test("hosts: Notice what's here's blank frame offers another way; Doing mind's blank drifting leads with it", () => {
  const nn = content.skills.find((s) => s.id === "notice_and_name");
  const way = nn.steps.find((s) => s.id === "way");
  assert.ok(way.fields[0].links.some((l) => l.exit === "join_in"));
  assert.deepEqual(nn.exits.find((x) => x.id === "join_in").query, { frame: "blank" });
  const db = content.skills.find((s) => s.id === "doing_being");
  assert.ok(db.steps.find((s) => s.id === "drift").offers.some((o) => o.exit === "join_in"));
});
