// Good things (PRD ER-04, DBT ER Handouts 15–16; docs/design/good-things.md) on the skill runtime, part 1: find one
// okay thing and stay with it (level 0), stay with a good moment from a pleasant check-in (`frame=savour`), one good
// thing for today (level 1) with the person's own things first, the good_thing card that reopens the run at *Did it
// happen?*, and Things I like (`thing_i_like`, the `thingsILike` slice). Tested through the pure machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "good_things");
const embedOutputs = { orientFind: { ids: ["done", "partly", "skipped"] }, holdRing: { ids: ["held", "partly", "skipped"] } };
const KEPT_ID = "3f2a1c4e-0000-4000-8000-000000000001";
const LIKES = { thingsILike: [{ id: KEPT_ID, label: "The blue mug", meta: {} }] };
const ctx = (ctxIn = {}, profile = null) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const done = (id) => ({ type: "embedDone", output: { ids: [id] } });
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const title = (s, c = ctx()) => M.copyText(c, M.stepOf(skill, s.stepId).title, s, M.titleSlots(c, M.stepOf(skill, s.stepId), s));
const line = (s, c = ctx()) => M.handoffLine(c, M.stepOf(skill, s.stepId), s);
const values = (s, fieldId, c = ctx()) => {
  const f = M.stepOf(skill, s.stepId).fields.find((x) => x.id === fieldId);
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s);

const TO_WHEN = (energy = "little", p = "outside", c = ctx()) => run([pick("start", "one"), next, pick("energy", energy), next, pick("pick", p), next], c);

test("the skill: tool good-things, concept dbt_accumulate_positives, no close question, listed under Emotion Regulation", () => {
  assert.equal(skill.toolId, "good-things");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_accumulate_positives"\}\), \(s:Skill \{id: "good_things"\}\)/);
  assert.equal(skill.start, "start");
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'good-things': \{ module: 'er', closeKind: 'none' \}/);
  assert.match(readFileSync("src/lib/spine/close.ts", "utf8"), /'good-things': \{ module: 'er', closeKind: 'none' \}/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'good-things',\n\s+name: 'Good Things',[\s\S]*?module: 'emotion-regulation'/);
  assert.match(tools, /label: 'Find something good', toolId: 'good-things'/, "the PRD's Tools intent");
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'good-things': 'good_things'/);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_accumulate_positives", t: "good-things"\}/);
  assert.deepEqual(skill.accepts, ["band", "frame"]);
});

test("where to start: find one okay thing or one good thing; the good moment only from a pleasant check-in", () => {
  const s = M.initialRun(skill);
  assert.deepEqual(values(s, "start"), ["find", "one"]);
  assert.equal(title(s), "Where do you want to start?");
  const sv = ctx({ frame: "savour" });
  assert.deepEqual(values(s, "start", sv), ["savour", "find", "one"]);
  assert.equal(title(s, sv), "Something's good right now. Want to stay with it a moment?");
  assert.equal(run([pick("start", "savour"), next], sv).stepId, "stay", "the good moment goes straight to staying with it");
  assert.match(readFileSync("src/components/checkin/StateResult.tsx", "utf8"), /to="\/tool\/good-things\?frame=savour"/, "the positive-state result opens it");
  assert.doesNotMatch(readFileSync("src/components/checkin/StateResult.tsx", "utf8"), /No action needed/, "a good moment is no longer a dead end");
});

test("a carried flooded reading: the body first or try anyway; never a lock", () => {
  const c = ctx({ band: "flooded" });
  const h = run([pick("start", "find"), next], c);
  assert.equal(h.stepId, "heads_up");
  const settle = run([pick("heads_up", "settle"), next], c, h);
  assert.equal(settle.stepId, "settle");
  assert.deepEqual(offers(settle, c), ["cool_down"]);
  assert.equal(run([pick("heads_up", "try"), next], c, h).stepId, "find", "try anyway goes where they chose");
});

test("level 0: find one okay thing, stay with it 15 s, name it, keep it in Things I like on the yes only", () => {
  const f = run([pick("start", "find"), next]);
  assert.equal(f.stepId, "find");
  assert.deepEqual(M.stepOf(skill, "find").props.count, 1);
  assert.equal(M.stepOf(skill, "find").embed, "orientFind");
  const stay = run([done("done")], ctx(), f);
  assert.equal(stay.stepId, "stay");
  const hold = M.stepOf(skill, "stay");
  assert.equal(hold.embed, "holdRing");
  assert.equal(hold.props.variant, "timed");
  assert.equal(hold.props.seconds, 15);
  assert.doesNotMatch(skill.copy.stay_hint, /breath/i, "no breath instruction (PRD)");
  const name = run([done("held")], ctx(), stay);
  assert.equal(name.stepId, "name");
  const step = M.stepOf(skill, "name");
  const kept = M.keepFor(ctx(), step, run([pick("kind", "colour"), pick("keepit", "keep")], ctx(), name));
  assert.deepEqual(kept && { kind: kept.kind, value: kept.value }, { kind: "thing_i_like", value: { kindIds: ["colour"] } });
  const ownKept = M.keepFor(ctx(), step, run([own("kind", "Rain on the window"), pick("keepit", "keep")], ctx(), name));
  assert.deepEqual(ownKept.value, { kindOwn: "Rain on the window" });
  assert.equal(M.keepFor(ctx(), step, run([pick("kind", "sound"), pick("keepit", "not_now")], ctx(), name)), null, "not this time keeps nothing");
  const end = run([pick("kind", "colour"), pick("keepit", "keep"), next], ctx(), name);
  assert.equal(end.stepId, "name_end");
  assert.match(line(end), /^It's in Things I like/);
  assert.equal(line(run([pick("kind", "colour"), pick("keepit", "not_now"), next], ctx(), name)), "You found one. Noticing it is the practice.");
});

test("level 1: the list follows the energy there is, own things first, the anhedonia line on screen", () => {
  const e = run([pick("start", "one"), next]);
  assert.equal(e.stepId, "energy");
  const p = (energy, c = ctx()) => run([pick("energy", energy), next], c, e);
  const none = values(p("none"), "pick");
  const little = values(p("little"), "pick");
  const all = values(p("some"), "pick");
  assert.ok(none.length >= 5 && none.length < little.length && little.length < all.length);
  for (const v of none) assert.equal(skill.options.activity.find((o) => o.value === v).energy, "none", v);
  assert.equal(all.length, skill.options.activity.length);
  assert.deepEqual(values(p("little", ctx({}, LIKES)), "pick", ctx({}, LIKES))[0], KEPT_ID, "the person's own things come first");
  assert.equal(skill.copy.pick_hint, "If nothing sounds good, that's part of feeling low. Pick the one that sounds least bad.");
  // PRD: impulsive pleasures are not in the catalogue; no gratitude push.
  const text = [...skill.options.activity.map((o) => o.label), ...Object.values(skill.copy)].join(" | ");
  assert.doesNotMatch(text, /shop|buy|drink|wine|beer|snack|treat yourself|chocolate|scroll|grateful|gratitude|streak/i);
});

test("when: now books the card an hour on, the rest at their time, only on the yes; the end card names the pick", () => {
  const w = TO_WHEN();
  assert.equal(w.stepId, "when");
  const step = M.stepOf(skill, "when");
  assert.deepEqual(M.followUpFor(ctx(), step, run([pick("when", "hour"), pick("remind", "yes")], ctx(), w)), { type: "good_thing", chip: "hour" });
  assert.deepEqual(M.followUpFor(ctx(), step, run([pick("when", "evening"), pick("remind", "yes")], ctx(), w)), { type: "good_thing", chip: "evening" });
  assert.equal(M.followUpFor(ctx(), step, run([pick("when", "evening")], ctx(), w)), null, "no yes, no card");
  const set = run([pick("when", "afternoon"), pick("remind", "yes"), next], ctx(), w);
  assert.equal(set.stepId, "set");
  assert.equal(title(set), "Your good thing: Step outside for five minutes.");
  assert.match(line(set), /^I'll ask how it went/);
});

test("good_thing: registered, the deep link reopens at back, content-free, resolved by opening, bound to good-things", () => {
  const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8"));
  const t = spine.content.followUpTypes.find((x) => x.id === "good_thing");
  assert.equal(t.deepLinkTemplate, "/tool/good-things?run={sourceSessionId}&at=back&followUp={followUpId}");
  assert.deepEqual(Object.keys(t.window.chips).sort(), ["afternoon", "evening", "hour", "tomorrow"]);
  assert.deepEqual(skill.options.when.map((o) => o.value).sort(), Object.keys(t.window.chips).sort(), "each when is a chip");
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /OPEN_RESOLVES = \[[^\]]*'good_thing'/);
  assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), /good_thing: 'good-things'/);
  assert.match(readFileSync("schema/practice-spine.cypher", "utf8"), /MERGE \(t:FollowUpType \{id: "good_thing"\}\)/);
});

const booked = (c = ctx(), p = "outside") => run([pick("when", "evening"), pick("remind", "yes"), next], c, TO_WHEN("little", p, c));

test("back: did it happen? names the pick; lighter offers Things I like; flat gets the reps line; not today → Running low", () => {
  assert.deepEqual(M.stepOf(skill, "back").reopens, { after: "when" });
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), booked()), "back");
  assert.equal(r?.stepId, "back");
  assert.equal(title(r), "Did it happen? Step outside for five minutes");
  assert.equal(M.resumeRun(ctx(), M.runRecord(ctx(), run([pick("start", "one"), next, pick("energy", "little"), next])), "back"), null, "a run that never reached when doesn't reopen");
  const after = run([pick("happened", "yes"), next], ctx(), r);
  assert.equal(after.stepId, "after");
  const keep = run([pick("compared", "lighter"), pick("mind", "here"), next], ctx(), after);
  assert.equal(keep.stepId, "keep_more");
  const kept = M.keepFor(ctx(), M.stepOf(skill, "keep_more"), run([pick("keep_more", "keep")], ctx(), keep));
  assert.deepEqual(kept.value, { pickIds: ["outside"] });
  const keptEnd = run([pick("keep_more", "keep"), next], ctx(), keep);
  assert.equal(line(keptEnd), "It's in Things I like.");
  const flat = run([pick("compared", "same"), next], ctx(), after);
  assert.equal(flat.stepId, "after_end");
  assert.equal(line(flat), "Enjoying it comes later. Doing it is the rep.");
  assert.match(line(run([pick("compared", "heavier"), pick("mind", "elsewhere"), next], ctx(), after)), /^Next time your mind drifts to worries/);
  const no = run([pick("happened", "no"), next], ctx(), r);
  assert.equal(no.stepId, "not_today");
  assert.equal(line(no), "A smaller one tomorrow still counts.");
  assert.deepEqual(offers(no), ["please_skill"]);
  assert.equal(r.answers.happened, undefined, "asked fresh when the card opens");
});

test("a kept thing picked again: named by what the person kept, display only; never kept twice; gone → generic copy", () => {
  const c = ctx({}, LIKES);
  const b = booked(c, KEPT_ID);
  assert.equal(title(b, c), "Your good thing: The blue mug.");
  const rec = M.runRecord(c, b);
  assert.ok(JSON.stringify(rec).includes(KEPT_ID), "the record keeps the id");
  assert.ok(!JSON.stringify(rec).includes("The blue mug"), "never the label (it can be decrypted own words)");
  const r = M.resumeRun(c, rec, "back");
  assert.equal(title(r, c), "Did it happen? The blue mug");
  const lighter = run([pick("happened", "yes"), next, pick("compared", "lighter"), next], c, r);
  assert.equal(lighter.stepId, "after_end", "already in Things I like: not offered again");
  // Set aside since the visit: the slice no longer has it, and the title never shows the id or a raw {pick}.
  const gone = ctx({}, { thingsILike: [] });
  const rg = M.resumeRun(gone, rec, "back");
  assert.equal(title(rg, gone), "Did it happen? something you like");
  assert.equal(run([pick("happened", "yes"), next, pick("compared", "lighter"), next], gone, rg).stepId, "after_end", "nothing to keep");
});

test("thing_i_like: a profile kind in My words, own words encrypted, the thingsILike slice for good-things", async () => {
  const { PROFILE_KINDS } = await importTs("functions/src/profile/kinds.ts");
  const k = PROFILE_KINDS.thing_i_like;
  assert.equal(k.area, "my_words");
  assert.equal(k.slice, "thingsILike");
  assert.ok(k.many);
  assert.deepEqual(k.ownFields, ["kindOwn", "pickOwn"]);
  assert.deepEqual(k.validate({ kindIds: ["colour"] }), { kindIds: ["colour"] });
  assert.deepEqual(k.validate({ pickOwn: "Baking bread" }), { pickOwn: "Baking bread" });
  assert.throws(() => k.validate({}), /Nothing to keep/);
  assert.throws(() => k.validate({ kindIds: ["colour"], label: "x" }), /Unexpected field/);
  assert.throws(() => k.validate({ kindOwn: "x".repeat(41) }));
  for (const p of ["functions/src/profile/types.ts", "src/data/profileTypes.ts"]) {
    assert.match(readFileSync(p, "utf8"), /'good-things': \['thingsILike'\]/, p);
  }
  // Every catalogue and chip id the slice names is a SkillOption the graph holds.
  const cy = readFileSync("schema/skills.cypher", "utf8");
  for (const o of [...skill.options.activity.map((x) => `activity:${x.value}`), ...skill.options.kind.map((x) => `kind:${x.value}`)]) {
    assert.match(cy, new RegExp(`MERGE \\(o:SkillOption \\{id: "good_things:${o}"\\}\\)`), o);
  }
  assert.match(readFileSync("functions/src/profile/slices.ts", "utf8"), /kind: 'good_things:kind:', pick: 'good_things:activity:'/);
});

test("routing: Low drive's bored, apathetic and indifferent get Good things as the second card, signed off", async () => {
  const rc = readFileSync("scripts/recommendations/content.py", "utf8");
  assert.match(rc, /"rf_reward_drive_low_words_flat_good-things": "2026-11-12"/);
  assert.match(rc, /CONCEPT_TAGS\["good-things"\] = \{"concept": "dbt_accumulate_positives", "side": "change", "skillKind": "redirect", "direction": "up"\}/);
});
