// Rewrite the nightmare (PRD ER-15, DBT ER Handout 20a; docs/design/nightmare-rescript.md) on the skill runtime:
// never for a replay of something real; nothing asks what happens in the nightmare; the person authors the change
// and the ending; Stop is always there and goes to grounding, never back into the dream; someone to talk to on
// every screen; a kept version only on the person's tap; each read-through reminder set by the person, one at a
// time. Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const { validateExt } = await importTs("functions/src/spine/extSchemas.ts");
const { PROFILE_KINDS, checkValue } = await importTs("functions/src/profile/kinds.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
const skill = content.skills.find((s) => s.id === "nightmare_rescript");
// What the two embeds may report (embeds.ts EMBED_OUTPUTS; the contract test keeps it equal to content.py).
const embedOutputs = {
  holdRing: { ids: ["held", "partly", "skipped"], measures: ["durationSec", "doneCount", "earlyCount"] },
  rescriptCard: { ids: ["read", "stopped"], measures: ["durationSec"] },
};
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const embed = (ids, durationSec = 60) => ({ type: "embedDone", output: { ids, durationSec } });
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);

const SETTLED = [embed(["held"], 15)];
const TO_CARD = [pick("replay", "no"), next, ...SETTLED, pick("setting", "home"), next, pick("turn", "door"), next,
  own("ending", "I walk out into the garden and it's morning"), next];
const READ = [...TO_CARD, embed(["read"])];

test("the skill: tool nightmare-rescript, starts at the replay question, no close question, played by the player", () => {
  assert.equal(skill.toolId, "nightmare-rescript");
  assert.equal(skill.start, "replay");
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'nightmare-rescript': \{ module: 'er', closeKind: 'none' \}/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'nightmare-rescript': 'nightmare_rescript',/);
  assert.equal(M.stepOf(skill, "rehearse").embed, "rescriptCard");
});

test("never for a replay: yes or partly goes to the clinician card, which rewrites nothing and offers grounding and someone to talk to", () => {
  for (const v of ["yes", "partly"]) {
    const s = run([pick("replay", v), next]);
    assert.equal(s.stepId, "clinician", v);
    assert.deepEqual(s.path, ["replay", "clinician"], `${v}: no step of the rewrite is reached`);
    const card = M.stepOf(skill, "clinician");
    assert.equal(card.kind, "handoff");
    assert.ok(card.noClose, "no close question after that");
    assert.deepEqual(M.offersFor(ctx(), card, s), ["five_senses", "sleep_reset", "safety_open"], "Sleep reset (ER-13) for tonight");
    assert.match(M.handoffLine(ctx(), card, s), /clinician/);
  }
  for (const v of ["no", "unsure"]) assert.equal(run([pick("replay", v), next]).stepId, "settle", v);
  assert.match(skill.copy[M.stepOf(skill, "replay").note], /clinician can help/, "the plain clinician line, for everyone, on the first screen");
});

test("not sure about a replay: the settle step says they can stop if it starts to feel like a memory", () => {
  const s = run([pick("replay", "unsure"), next]);
  assert.match(M.copyText(ctx(), M.stepOf(skill, "settle").title, s), /feel like a memory, you can stop/);
  const t = run([pick("replay", "no"), next]);
  assert.doesNotMatch(M.copyText(ctx(), M.stepOf(skill, "settle").title, t), /memory/);
});

test("nothing asks what happens in it: only where it starts, what changes before the bad part, and how it ends now", () => {
  const asks = skill.steps.filter((s) => s.kind === "ask").map((s) => s.id);
  assert.deepEqual(asks, ["replay", "start", "turn", "ending", "after", "plan"]);
  const words = skill.steps.flatMap((s) => [s.title, s.hint].flat().filter(Boolean).map((k) => (typeof k === "string" ? k : k.key)))
    .map((k) => skill.copy[k] ?? "").join(" ");
  assert.doesNotMatch(words, /what happen(s|ed) in|describe|tell me about|write (down )?(the|your) nightmare/i);
  assert.match(skill.copy.start_hint, /You don't need to say what happens/);
  assert.deepEqual(skill.options.setting.map((o) => o.value), ["home", "outside", "work", "travelling", "unknown"], "places only");
});

test("the person authors the new version: the ending's own-words box is open first, chips are starters, nothing is pre-picked", () => {
  const ending = M.stepOf(skill, "ending").fields[0];
  assert.equal(ending.own.open, true);
  assert.equal(ending.own.countsAsPick, true);
  const s = run(TO_CARD.slice(0, -2));
  assert.equal(s.stepId, "ending");
  assert.equal(s.answers.ending, undefined, "no ending written for them");
  assert.equal(M.canGoOn(ctx(), s), false, "Next waits for their ending");
  for (const f of ["turn", "ending"]) assert.ok(M.stepOf(skill, f).fields[0].own, `${f}: say it your way`);
});

test("the read-through: the paper card, then Stop always goes to the stop card (grounding, never back into the dream)", () => {
  const s = run(TO_CARD);
  assert.equal(s.stepId, "rehearse");
  for (const ids of [["stopped"]]) {
    const t = M.runNext(ctx(), s, embed(ids, 12));
    assert.equal(t.stepId, "stopped");
    const card = M.stepOf(skill, "stopped");
    assert.ok(card.noClose);
    assert.deepEqual(M.offersFor(ctx(), card, t), ["five_senses", "safety_open"]);
    assert.match(M.handoffLine(ctx(), card, t), /Stopping is part of this/);
  }
  assert.equal(run(READ).stepId, "after");
});

test("after a read-through: a memory goes to the clinician; not feeling safe raises the crisis banner and puts someone to talk to first", () => {
  const memory = run([...READ, pick("after", "memory"), next]);
  assert.equal(memory.stepId, "clinician");
  assert.match(M.handoffLine(ctx(), M.stepOf(skill, "clinician"), memory), /good place to stop/);
  const picked = run([...READ, pick("after", "unsafe")]);
  assert.deepEqual(M.crisisFor(ctx(), M.stepOf(skill, "after"), picked), { variant: "crisis", when: { eq: ["$a.after", "unsafe"] } });
  assert.equal(M.fieldLinks(ctx(), M.stepOf(skill, "after").fields[0], picked).length, 0, "the banner carries the lines instead of the quiet link");
  const unsafe = M.runNext(ctx(), picked, next);
  assert.equal(unsafe.stepId, "stopped");
  assert.deepEqual(M.offersFor(ctx(), M.stepOf(skill, "stopped"), unsafe), ["safety_open", "five_senses"], "someone to talk to first");
  assert.ok(M.crisisFor(ctx(), M.stepOf(skill, "stopped"), unsafe));
  for (const v of ["all_right", "stirred"]) assert.equal(run([...READ, pick("after", v), next]).stepId, "settle_again", v);
  // Far away or foggy (dissociation, C6.3): orient, never a settling hold; the stop card with 5-4-3-2-1 first.
  const far = run([...READ, pick("after", "far"), next]);
  assert.equal(far.stepId, "stopped");
  assert.deepEqual(M.offersFor(ctx(), M.stepOf(skill, "stopped"), far), ["five_senses", "safety_open"]);
  assert.match(M.handoffLine(ctx(), M.stepOf(skill, "stopped"), far), /back to the room/);
  assert.equal(M.crisisFor(ctx(), M.stepOf(skill, "stopped"), far), null, "not a danger answer: no banner");
  assert.deepEqual(skill.options.after.find((o) => o.value === "unsafe").danger, "self");
});

test("someone to talk to on every screen: a quiet link or an offer on every step, and a crisis slot on every step", () => {
  const s0 = M.initialRun(skill);
  for (const st of skill.steps) {
    assert.ok(st.crisis?.length, `${st.id}: declares the crisis slot`);
    const shown = st.kind === "ask" ? st.fields.flatMap((f) => M.fieldLinks(ctx(), f, s0)) : M.stepLinks(ctx(), st, s0);
    const offered = M.offersFor(ctx(), st, s0);
    assert.ok(shown.some((l) => l.exit.id === "safety_open") || offered.includes("safety_open"), `${st.id}: Talk to someone now`);
  }
  for (const id of ["clinician", "stopped"]) assert.ok(M.stepOf(skill, id).offers.some((o) => o.exit === "safety_open"), id);
});

test("a carried flooded band: the first screen says it's one for a calmer moment and offers grounding first; nothing locks", () => {
  const c = ctx({ band: "flooded" });
  const s = M.initialRun(skill);
  assert.match(M.copyText(c, M.stepOf(skill, "replay").title, s), /calmer moment/);
  assert.deepEqual(M.fieldLinks(c, M.stepOf(skill, "replay").fields[0], s).map((l) => l.exit.id), ["five_senses", "safety_open"]);
  assert.equal(run([pick("replay", "no"), next], c).stepId, "settle", "going on stays possible");
  assert.deepEqual(M.fieldLinks(ctx(), M.stepOf(skill, "replay").fields[0], s).map((l) => l.exit.id), ["safety_open"], "no band: no settle link");
});

test("keep: only on the person's Keep it in Me; the kept value is the three answers, own words to the kind's encrypted fields", () => {
  const atPlan = run([...READ, pick("after", "all_right"), next, embed(["held"], 15)]);
  assert.equal(atPlan.stepId, "plan");
  const plan = M.stepOf(skill, "plan");
  assert.equal(M.keepFor(ctx(), plan, atPlan), null, "nothing tapped: nothing kept");
  assert.equal(M.keepFor(ctx(), plan, M.runNext(ctx(), atPlan, pick("keepit", "no"))), null, "Not this time keeps nothing");
  const yes = M.runNext(ctx(), atPlan, pick("keepit", "yes"));
  const k = M.keepFor(ctx(), plan, yes);
  assert.deepEqual(k, { kind: "nightmare_script", value: { settingIds: ["home"], turnIds: ["door"], endingOwn: "I walk out into the garden and it's morning" }, id: null });
  const def = PROFILE_KINDS.nightmare_script;
  assert.equal(def.many, true);
  assert.deepEqual([...def.ownFields].sort(), ["endingOwn", "settingOwn", "turnOwn"]);
  assert.deepEqual(checkValue(def, k.value), k.value);
  assert.throws(() => checkValue(def, { settingIds: ["home"] }), /Nothing to keep/);
  assert.throws(() => checkValue(def, { turnIds: ["door"], whatHappens: "x" }), /Unexpected field/);
  assert.throws(() => checkValue(def, { endingOwn: "x".repeat(91) }));
  // The close card says it's in Me only when it was kept.
  const closed = M.runNext(ctx(), yes, next);
  assert.equal(closed.stepId, "close");
  assert.match(M.handoffLine(ctx(), M.stepOf(skill, "close"), closed), /It's in Me/);
  const notKept = run([pick("keepit", "no"), next], ctx(), atPlan);
  assert.doesNotMatch(M.handoffLine(ctx(), M.stepOf(skill, "close"), notKept), /in Me/);
});

test("the read-through reminder: a chip on the keep step schedules nightmare_rehearse; its link reopens this run at the read-through", () => {
  const type = spine.followUpTypes.find((t) => t.id === "nightmare_rehearse");
  assert.ok(type?.enabled);
  assert.equal(type.resolveMode, "deeplink");
  assert.equal(type.deepLinkTemplate, "/tool/nightmare-rescript?run={sourceSessionId}&at=rehearse&enterAt=rehearse&followUp={followUpId}");
  assert.deepEqual(skill.options.remind.map((o) => o.value).sort(), Object.keys(type.window.chips).sort());
  assert.doesNotMatch(`${type.copy.title} ${type.copy.body} ${type.notification}`, /nightmare|dream/i, "Today and notifications never name it");
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /OPEN_RESOLVES = \[[^\]]*'nightmare_rehearse'/, "opening it resolves it");
  const atPlan = run([...READ, pick("after", "all_right"), next, embed(["held"], 15), pick("keepit", "no")]);
  const plan = M.stepOf(skill, "plan");
  assert.equal(M.followUpFor(ctx(), plan, atPlan), null, "no chip, no reminder");
  assert.deepEqual(M.followUpFor(ctx(), plan, M.runNext(ctx(), atPlan, pick("remind", "tonight"))), { type: "nightmare_rehearse", chip: "tonight" });
});

test("the reminder chips: tonight on a first visit, tomorrow before bed on a read-through visit, daytime only after a stir", () => {
  const values = (field, st) => M.optionGroups(ctx(), field, st.answers).flatMap((g) => g.options.map((o) => o.value));
  const remind = M.stepOf(skill, "plan").fields.find((f) => f.id === "remind");
  const again = M.stepOf(skill, "again").fields[0];
  const at = (v) => run([...READ, pick("after", v), next, embed(["held"], 15)]);
  assert.deepEqual(values(remind, at("all_right")), ["tonight", "tomorrow"]);
  assert.deepEqual(values(remind, at("stirred")), ["tomorrow"]);
  assert.deepEqual(values(again, at("all_right")), ["tomorrow_night", "tomorrow"], "never tonight again within the hour");
  assert.deepEqual(values(again, at("stirred")), ["tomorrow"]);
  assert.deepEqual(skill.options.remind.filter((o) => o.night).map((o) => o.value), ["tonight", "tomorrow_night"]);
});

test("the ending's chips are starters: a tap writes their words into the box to change, and never erases words the person wrote", () => {
  const atEnding = run(TO_CARD.slice(0, TO_CARD.findIndex((e) => e.fieldId === "ending")));
  assert.equal(atEnding.stepId, "ending");
  const f = M.stepOf(skill, "ending").fields[0];
  assert.equal(f.own.seed, true);
  const started = M.runNext(ctx(), atEnding, pick("ending", "safe"));
  assert.deepEqual(started.answers.ending, { ids: [], own: "I end up somewhere safe" });
  const theirs = M.runNext(ctx(), started, own("ending", "I end up somewhere safe, at my gran's"));
  assert.equal(M.runNext(ctx(), theirs, pick("ending", "calm")), theirs, "a tap after they've written changes nothing");
  assert.equal(M.copyText(ctx(), f.label, atEnding), "Write your own, or start from one of these and change it.");
});

test("the read-through card: anything opening over the running clock counts as Stop; focus follows the one control there", () => {
  const card = readFileSync("src/components/skillPlayer/RescriptCard.tsx", "utf8");
  assert.match(card, /useEffect\(\(\) => \{ if \(covered && running\) stopNow\.current\(\); \}, \[covered, running\]\);/);
  assert.match(card, /if \(running\) stopRef\.current\?\.focus/);
  assert.match(card, /<button ref=\{stopRef\}/);
  const s = M.resumeRun(ctx({ enterAt: "rehearse" }), M.runRecord(ctx(), run(READ)), "rehearse");
  assert.match(M.copyText(ctx({ enterAt: "rehearse" }), M.stepOf(skill, "rehearse").title, s), /Feet on the floor first/, "a read-through visit opens on the body cue");
  assert.equal(M.copyText(ctx(), M.stepOf(skill, "rehearse").title, run(TO_CARD)), "Your new version");
});

test("a read-through visit (resume at the read-through): no question is pre-filled, it ends on its own card, and sets the next reminder only on a tap", () => {
  const first = run([...READ, pick("after", "stirred"), next, embed(["held"], 15), pick("keepit", "yes"), pick("remind", "tomorrow"), next]);
  const rec = M.runRecord(ctx(), first);
  assert.doesNotThrow(() => validateExt({ run: rec }));
  const c = ctx(M.contextIn(skill, { run: "x", at: "rehearse", enterAt: "rehearse" }));
  assert.deepEqual(c.ctxIn, { enterAt: "rehearse" });
  const s = M.resumeRun(c, rec, "rehearse");
  assert.equal(s.stepId, "rehearse");
  assert.deepEqual(Object.keys(s.answers).sort(), ["ending", "replay", "setting", "turn"], "only the answers up to the read-through come back (an embed's report is its own)");
  // The safety shape of a first visit: How was that? (memory → clinician, not safe → crisis, far away → orient),
  // then settle again, then its own end card instead of the keep step.
  const after = M.runNext(c, s, embed(["read"]));
  assert.equal(after.stepId, "after");
  assert.equal(after.answers.after, undefined, "how it went last time isn't read back");
  assert.equal(M.runNext(c, M.runNext(c, after, pick("after", "memory")), next).stepId, "clinician");
  const unsafe = M.runNext(c, after, pick("after", "unsafe"));
  assert.ok(M.crisisFor(c, M.stepOf(skill, "after"), unsafe));
  assert.equal(M.runNext(c, unsafe, next).stepId, "stopped");
  assert.equal(M.runNext(c, M.runNext(c, after, pick("after", "far")), next).stepId, "stopped");
  const settling = M.runNext(c, M.runNext(c, after, pick("after", "all_right")), next);
  assert.equal(settling.stepId, "settle_again");
  const again = M.runNext(c, settling, embed(["held"], 15));
  assert.equal(again.stepId, "again", "its own end card: the keep step is a first visit's");
  const card = M.stepOf(skill, "again");
  assert.equal(M.followUpFor(c, card, again), null, "last time's reminder chip isn't picked again for them");
  assert.deepEqual(M.followUpFor(c, card, M.runNext(c, again, pick("again_remind", "tomorrow_night"))), { type: "nightmare_rehearse", chip: "tomorrow_night" });
  assert.equal(M.runNext(c, s, embed(["stopped"], 5)).stepId, "stopped", "Stop works the same on a read-through visit");
});

test("a reminder link whose run can't be reopened: the fresh run is a whole first visit, with the keep step", () => {
  // The player drops the link's enterAt when the resume finds nothing (too old, another version, a failed read).
  const c = ctx(M.ctxAfterResume(M.contextIn(skill, { run: "x", at: "rehearse", enterAt: "rehearse" }), false));
  assert.deepEqual(c.ctxIn, {});
  const s = run([...READ, pick("after", "all_right"), next, embed(["held"], 15)], c);
  assert.equal(s.stepId, "plan", "How was that?, settle again, then the keep step");
});

test("the longest run's record validates; own words stay within their caps", () => {
  const long = run([pick("replay", "unsure"), next, ...SETTLED, own("setting", "s".repeat(60)), next, own("turn", "t".repeat(90)), next,
    own("ending", "e".repeat(90)), next, embed(["read"]), pick("after", "stirred"), next, embed(["held"], 15),
    pick("keepit", "yes"), pick("remind", "tonight"), next]);
  assert.equal(long.stepId, "close");
  assert.doesNotThrow(() => validateExt({ run: M.runRecord(ctx(), long) }));
  assert.equal(M.stepOf(skill, "start").fields[0].own.max, 60);
});
