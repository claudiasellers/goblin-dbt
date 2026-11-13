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
  assert.deepEqual(values(s, "start"), ["find", "one", "week"]);
  assert.equal(title(s), "Where do you want to start?");
  const sv = ctx({ frame: "savour" });
  assert.deepEqual(values(s, "start", sv), ["savour", "find", "one", "week"]);
  assert.equal(title(s, sv), "Where do you want to start?");
  assert.equal(run([pick("start", "savour"), next], sv).stepId, "stay", "the good moment goes straight to staying with it");
  const svName = run([done("held")], sv, run([pick("start", "savour"), next], sv));
  assert.equal(values(svName, "kind", sv)[0], "moment", "a good moment can be a moment, or how I felt");
  const findName = run([done("held")], ctx(), run([done("found")], ctx(), run([pick("start", "find"), next])));
  assert.ok(!values(findName, "kind").includes("moment"), "only when staying with a good moment");
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
  assert.equal(title(r), "Earlier you picked: Step outside for five minutes.");
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
  assert.match(line(run([pick("compared", "same"), pick("mind", "elsewhere"), next], ctx(), after)), /^If 'it won't last' or 'I don't deserve this' shows up/);
  // Heavier after trying: no blame, and somewhere to go (Gate 3).
  const heavy = run([pick("compared", "heavier"), pick("mind", "elsewhere"), next], ctx(), after);
  assert.equal(line(heavy), "That happens sometimes. It isn't a sign you did it wrong.");
  assert.deepEqual(offers(heavy), ["cool_down", "please_skill"]);
  assert.deepEqual(offers(flat), [], "only heavier gets the hand-offs");
  // An own-words pick is never offered for Things I like (CORE checks own additions; part 2).
  const ownBooked = run([pick("when", "evening"), pick("remind", "yes"), next], ctx(), run([own("pick", "Bake bread")], ctx(), run([pick("start", "one"), next, pick("energy", "little"), next])));
  const ownAfter = run([pick("happened", "yes"), next], ctx(), M.resumeRun(ctx(), M.runRecord(ctx(), run([next], ctx(), ownBooked)), "back"));
  assert.equal(run([pick("compared", "lighter"), next], ctx(), ownAfter).stepId, "after_end");
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
  assert.equal(title(r, c), "Earlier you picked: The blue mug.");
  const lighter = run([pick("happened", "yes"), next, pick("compared", "lighter"), next], c, r);
  assert.equal(lighter.stepId, "after_end", "already in Things I like: not offered again");
  // Set aside since the visit: the slice no longer has it, and the title never shows the id or a raw {pick}.
  const gone = ctx({}, { thingsILike: [] });
  const rg = M.resumeRun(gone, rec, "back");
  assert.equal(title(rg, gone), "Earlier you picked: something you like.");
  assert.equal(run([pick("happened", "yes"), next, pick("compared", "lighter"), next], gone, rg).stepId, "after_end", "nothing to keep");
});

test("a catalogue thing kept before shows once, as the person's own, and is never offered for keeping again", () => {
  const prof = { thingsILike: [{ id: KEPT_ID, label: "Step outside for five minutes", meta: {} }], thingsILikePicks: [{ id: "outside" }] };
  const c = ctx({}, prof);
  const p = run([pick("start", "one"), next, pick("energy", "little"), next], c);
  const vals = values(p, "pick", c);
  assert.equal(vals[0], KEPT_ID);
  assert.ok(!vals.includes("outside"), "no second copy in the catalogue");
  assert.ok(vals.includes("warm"));
  // A slice item kept only as a chip ("A colour") is not a thing to do: the slice offers pick-sourced or own words only.
  assert.match(readFileSync("functions/src/profile/slices.ts", "utf8"), /strings\(v\.pickIds\)\.slice\(0, 1\)\.map\(\(id\) => THING_OPTION\.pick \+ id\)/);
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
    assert.match(readFileSync(p, "utf8"), /'good-things': \['thingsILike', 'thingsILikePicks'\]/, p);
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

// --- Level 2: plan the week (part 2) ---
const W = await importTs("src/lib/spine/windows.ts");
const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
const WORD = { 1: "one", 2: "two", 3: "three" };
const WEEK = (c = ctx()) => run([
  pick("start", "week"), next,
  pick("wk1", "walk"), pick("day1", "tomorrow"), pick("more1", "more"), next,
  pick("wk2", "song"), pick("day2", "few_days"), pick("more2", "more"), next,
  pick("wk3", "message"), pick("day3", "this_week"), next,
  done("held"), next,
], c);

test("plan the week: up to three good things, a day each, a card each; never one twice; the best ten seconds pictured", () => {
  const w1 = run([pick("start", "week"), next]);
  assert.equal(w1.stepId, "week_1");
  assert.equal(title(w1), "Pick a good thing for this week.");
  assert.ok(values(w1, "wk1").includes("walk") && values(w1, "wk1").includes("song"), "the whole catalogue: the energy on the day isn't known yet");
  assert.deepEqual(values(w1, "day1"), ["evening", "tomorrow", "day_after", "few_days", "this_week"]);
  assert.match(skill.copy.week_hint, /^If nothing sounds good, that's part of feeling low\./, "the anhedonia line, as at level 1");
  assert.deepEqual(values(w1, "more1"), ["enough", "more"], "stopping at one comes first");
  assert.deepEqual(M.followUpFor(ctx(), M.stepOf(skill, "week_1"), run([pick("wk1", "walk"), pick("day1", "day_after")], ctx(), w1)),
    { type: "good_week_one", chip: "day_after" }, "the day books the card: the card is the plan");
  const w2 = run([pick("wk1", "walk"), pick("day1", "tomorrow"), pick("more1", "more"), next], ctx(), w1);
  assert.equal(w2.stepId, "week_2");
  assert.ok(!values(w2, "wk2").includes("walk"), "a good thing picked already isn't offered again");
  // The person's own things too (Gate 1): a kept thing planned once isn't offered for a second slot.
  const pc = ctx({}, LIKES);
  const k1 = run([pick("start", "week"), next], pc);
  assert.equal(values(k1, "wk1", pc)[0], KEPT_ID, "own things first");
  const k2 = run([pick("wk1", KEPT_ID), pick("day1", "tomorrow"), pick("more1", "more"), next], pc, k1);
  assert.ok(!values(k2, "wk2", pc).includes(KEPT_ID));
  assert.equal(run([pick("wk1", "walk"), pick("day1", "tomorrow"), pick("more1", "enough"), next], ctx(), w1).stepId, "picture", "one is enough");
  assert.equal(M.stepOf(skill, "week_3").fields.some((f) => f.id === "more3"), false, "three at most");
  const pic = run([pick("start", "week"), next, pick("wk1", "walk"), pick("day1", "tomorrow"), pick("more1", "enough"), next]);
  assert.equal(M.stepOf(skill, "picture").props.seconds, 10, "the best ten seconds (PRD)");
  const one = run([done("held"), next], ctx(), pic);
  assert.equal(one.stepId, "week_set");
  assert.equal(title(pic), "A short walk somewhere you like: picture the best ten seconds of it.", "one planned: named");
  assert.match(skill.copy.picture_hint, /If nothing comes, picturing where you'll be is enough\./);
  assert.equal(title(one), "Your good thing is planned.");
  const all = WEEK();
  assert.equal(title(all), "Your good things are planned.");
  assert.equal(line(all), "I'll check in on the evening of each day. Doing it counts, whether or not you enjoy it.");
});

test("good_week cards: one per slot, the evening of the day, content-free, each reopening its own step", () => {
  const at = new Date(2026, 10, 13, 10, 0);
  for (const n of [1, 2, 3]) {
    const t = spine.followUpTypes.find((x) => x.id === `good_week_${WORD[n]}`);
    assert.equal(t.deepLinkTemplate, `/tool/good-things?run={sourceSessionId}&at=back_w${n}&followUp={followUpId}`);
    assert.doesNotMatch(`${t.copy.title} ${t.copy.body}`, /\d|walk|song|monday|tuesday/i, "never names the thing or the day");
    for (const [chip, day, h] of [["evening", 13, 20], ["tomorrow", 14, 18], ["day_after", 15, 18], ["few_days", 16, 18], ["this_week", 19, 18]]) {
      const due = W.dueAtFor(t.window, at, chip);
      assert.deepEqual([due.getDate(), due.getHours()], [day, h], `${n} ${chip}`);
    }
    assert.doesNotMatch(t.copy.body, /today/i, "a card can sit on Today after its day");
    assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), new RegExp(`OPEN_RESOLVES = \\[[^\\]]*'good_week_${WORD[n]}'`));
    assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), new RegExp(`good_week_${WORD[n]}: 'good-things'`));
  }
  assert.ok(readFileSync("functions/src/spine/validation.ts", "utf8").includes("'day_after'"), "the server accepts the day chip");
  const bodies = [1, 2, 3].map((n) => spine.followUpTypes.find((x) => x.id === `good_week_${WORD[n]}`).copy.body);
  assert.equal(new Set(bodies).size, 3, "three on one evening aren't identical");
});

test("each card reopens its own good thing; reviewing one never cuts the others off; lighter offers Things I like", () => {
  const rec = M.runRecord(ctx(), WEEK());
  const r2 = M.resumeRun(ctx(), rec, "back_w2");
  assert.equal(r2?.stepId, "back_w2");
  assert.equal(title(r2), "The good thing you planned: Put on a song you like.");
  const keep = run([pick("hap2", "yes"), next, pick("compared", "lighter"), next], ctx(), r2);
  assert.equal(keep.stepId, "keep_more_w2");
  assert.deepEqual(M.keepFor(ctx(), M.stepOf(skill, "keep_more_w2"), run([pick("km2", "keep")], ctx(), keep)).value, { wk2Ids: ["song"] });
  const end2 = run([pick("km2", "keep"), next], ctx(), keep);
  assert.equal(line(end2), "It's in Things I like.");
  // Card 2 was reviewed first; cards 1 and 3 still reopen theirs, asked fresh, the other round's answers cleared.
  const rec2 = M.runRecord(ctx(), end2);
  const r1 = M.resumeRun(ctx(), rec2, "back_w1");
  assert.equal(title(r1), "The good thing you planned: A short walk somewhere you like.");
  assert.equal(r1.answers.hap2, undefined);
  assert.equal(r1.answers.km2, undefined, "one round, one good thing");
  const flat = run([pick("hap1", "yes"), next, pick("compared", "same"), next], ctx(), r1);
  assert.equal(line(flat), "Enjoying it comes later. Doing it is the rep.", "not the other round's kept line");
  const r3 = M.resumeRun(ctx(), M.runRecord(ctx(), flat), "back_w3");
  assert.equal(title(r3), "The good thing you planned: Send a message to someone you like.");
  assert.equal(run([pick("hap3", "no"), next], ctx(), r3).stepId, "not_today");
  // A slot never planned has no card to reopen.
  const onlyOne = run([pick("start", "week"), next, pick("wk1", "walk"), pick("day1", "tomorrow"), pick("more1", "enough"), next, done("held"), next]);
  assert.equal(M.resumeRun(ctx(), M.runRecord(ctx(), onlyOne), "back_w2"), null);
  // An own-words good thing is never offered for keeping (as at level 1).
  const ownWeek = run([pick("start", "week"), next, own("wk1", "Bake bread"), pick("day1", "tomorrow"), pick("more1", "enough"), next, done("held"), next]);
  const ownR = M.resumeRun(ctx(), M.runRecord(ctx(), ownWeek), "back_w1");
  assert.equal(run([pick("hap1", "yes"), next, pick("compared", "lighter"), next], ctx(), ownR).stepId, "after_end");
});

test("thing_i_like: a week pick keeps as a pick; only one at a time", async () => {
  const { PROFILE_KINDS } = await importTs("functions/src/profile/kinds.ts");
  const k = PROFILE_KINDS.thing_i_like;
  assert.deepEqual(k.validate({ wk2Ids: ["song"] }), { pickIds: ["song"] });
  assert.deepEqual(k.validate({ wk3Own: "Bake bread" }), { pickOwn: "Bake bread" });
  assert.throws(() => k.validate({ wk1Ids: ["song"], pickIds: ["walk"] }), /One pick/);
  assert.throws(() => k.validate({ wk4Ids: ["song"] }), /Unexpected field/);
});
