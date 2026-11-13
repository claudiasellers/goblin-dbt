// Sleep reset (PRD ER-13; DBT ER Handout 20b; docs/design/sleep-reset.md) on the skill runtime: two ways in. The
// night (what's keeping you up, a slow breath, then get up for a bit or rest; thoughts of hurting myself → the
// resources first and no sleep coaching; a bad dream → grounding, never the rewrite at night) and the plan (one wake
// time every day, one wind-down thing, a morning check that reopens the run at *How was the night?* and books itself
// again only on a yes). Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const { holds } = await importTs("src/lib/skillRuntime/conditions.ts");
const W = await importTs("src/lib/spine/windows.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
const skill = content.skills.find((s) => s.id === "sleep_reset");
const embedOutputs = { breathPacer: { ids: ["done", "partly", "skipped", "dizzy"], measures: ["durationSec"] } };
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const did = (id = "done") => ({ type: "embedDone", output: { ids: [id], durationSec: 120 } });
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const step = (id) => M.stepOf(skill, id);
const offers = (s, c = ctx()) => M.offersFor(c, step(s.stepId), s);
// A hand-off shows its first matching line only, so each line key is the whole card text.
const line = (s, c = ctx()) => (step(s.stepId).lines ?? []).find((l) => holds(l.when, M.scope(c, s)))?.key;
const links = (s, c = ctx()) => M.stepLinks(c, step(s.stepId), s).map((l) => l.exit.id);
const NIGHT = (why) => [pick("mode", "awake"), next, pick("night", why), next];
const PLAN = (wake = "w0700", remind = true) =>
  [pick("mode", "plan"), next, pick("wake", wake), next, pick("wind", "screens"), ...(remind ? [pick("remind", "yes")] : [])];

test("the skill: tool sleep-reset, named Sleep Reset under Emotion Regulation, its own concept, no close question", () => {
  assert.equal(skill.toolId, "sleep-reset");
  assert.equal(skill.start, "mode");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_sleep_hygiene"\}\), \(s:Skill \{id: "sleep_reset"\}\)/);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_sleep_hygiene", t: "sleep-reset"\}/);
  assert.match(readFileSync("schema/relationships.cypher", "utf8"), /\{id: "dbt_sleep_hygiene"\}\), \(rv:TherapyConcept \{id: "dbt_reducing_vulnerability"\}\)/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'sleep-reset': 'sleep_reset',/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'sleep-reset',\n\s+name: 'Sleep Reset',[\s\S]*?module: 'emotion-regulation'/);
  assert.match(tools, /label: 'I can\\'t sleep', toolId: 'sleep-reset'/);
  for (const f of ["src/lib/spine/close.ts", "functions/src/spine/tools.ts"])
    assert.match(readFileSync(f, "utf8"), /'sleep-reset': \{ module: 'er', closeKind: 'none' \}/, f);
  assert.equal(JSON.parse(readFileSync("src/data/content/tool-names.json", "utf8")).content.tools["sleep-reset"], "Sleep Hygiene Protocol");
});

test("talk to someone now on every screen, once: the quiet link, or the offer where someone to talk to is one", () => {
  for (const st of skill.steps) {
    const quiet = [...(st.links ?? []), ...(st.fields ?? []).flatMap((f) => f.links ?? [])].filter((l) => l.exit === "safety_open");
    const offered = (st.offers ?? []).some((o) => o.exit === "safety_open");
    assert.equal(quiet.length + (offered ? 1 : 0), 1, st.id);
  }
});

test("the night: a mind that won't stop puts it down first; the body or not knowing goes straight to the breath", () => {
  const mind = run(NIGHT("mind"));
  assert.equal(mind.stepId, "park");
  assert.equal(step("park").fields[0].required, undefined, "putting it down is optional");
  assert.ok(step("park").fields[0].own, "in their own words");
  assert.equal(run([next], ctx(), mind).stepId, "breathe");
  for (const why of ["body", "unsure"]) assert.equal(run(NIGHT(why)).stepId, "breathe", why);
  // A carried flooded reading: the breath first, no writing.
  assert.equal(run(NIGHT("mind"), ctx({ band: "flooded" })).stepId, "breathe");
  // The breath is slow (out longer than in), and nothing wakes the body: no cold, no marching.
  const p = step("breathe").props;
  assert.ok(p.outSec > p.inSec);
  assert.ok(!skill.exits.some((e) => e.toolId === "cool-down" && JSON.stringify(skill.steps.filter((s) => ["night", "park", "breathe", "now", "up", "night_end", "sleepy"].includes(s.id))).includes(`"${e.id}"`)),
    "First, the body (cold water, marching) is never offered on the night path");
});

test("after the breath: sleepy → back to bed with the wake anchor; still awake → get up for a bit or rest", () => {
  const atNow = run([...NIGHT("body"), did()]);
  assert.equal(atNow.stepId, "now");
  assert.doesNotMatch(JSON.stringify(skill.copy), /\d+ min/, "no clock times on the night path");
  const sleepy = run([pick("now", "sleepy"), next], ctx(), atNow);
  assert.equal(sleepy.stepId, "sleepy");
  assert.equal(line(sleepy), "sleepy_line");
  assert.equal(M.handoffLine(ctx(), step("sleepy"), sleepy), skill.copy.sleepy_line);
  assert.match(skill.copy.sleepy_line, /Phone face down/, "the phone goes away (stimulus control)");
  assert.match(skill.copy.sleepy_line, /get up at your usual time/);
  const up = run([pick("now", "awake"), next], ctx(), atNow);
  assert.equal(up.stepId, "up");
  assert.doesNotMatch(skill.copy.up_hint, /not dangerous/, "no reassurance that isn't true for everyone (Gate 3)");
  const rest = run([pick("up", "rest"), next], ctx(), up);
  assert.equal(rest.stepId, "night_end");
  assert.equal(line(rest), "night_end_rest");
  assert.equal(M.copyText(ctx(), step("night_end").title, rest), skill.copy.rest_title, "still in bed: rest is enough");
  assert.deepEqual(offers(rest), []);
  // A mind that won't stop gets Give your mind a job on the end card.
  const mindEnd = run([next, did(), pick("now", "awake"), next, pick("up", "dim"), next], ctx(), run(NIGHT("mind")));
  assert.equal(mindEnd.stepId, "night_end");
  assert.equal(line(mindEnd), "night_end_up");
  assert.equal(M.copyText(ctx(), step("night_end").title, mindEnd), skill.copy.night_end_title);
  assert.deepEqual(offers(mindEnd), ["mind_job"]);
});

test("thoughts of hurting myself: the resources open first, the banner stays, and no sleep coaching follows", () => {
  const s = run(NIGHT("hurt"));
  assert.equal(s.stepId, "safe");
  assert.ok(M.opensSafety(ctx(), step("safe"), s));
  assert.equal(M.crisisFor(ctx(), step("safe"), s)?.variant, "crisis");
  for (const v of ["not_sure", "no"]) {
    const r = run([pick("safe", v), next], ctx(), s);
    assert.equal(r.stepId, "reach", v);
    assert.deepEqual(offers(r), ["safety_open", "crisis_kit"], "someone to talk to first, the kit beside it");
  }
  const ok = run([pick("safe", "safe_now"), next], ctx(), s);
  assert.equal(ok.stepId, "hurt_end");
  assert.equal(M.crisisFor(ctx(), step("hurt_end"), ok)?.variant, "crisis");
  assert.deepEqual(offers(ok), ["safety_open", "crisis_kit"], "the kit carries the banner; nothing that would drop it");
  for (const id of ["reach", "hurt_end"]) assert.equal(step(id).noClose, true, id);
  assert.deepEqual(skill.exits.find((e) => e.id === "crisis_kit").query, { frame: "crisis" });
  for (const p of [ok.path, ...["not_sure", "no"].map((v) => run([pick("safe", v), next], ctx(), s).path)])
    for (const x of ["park", "breathe", "now", "up"]) assert.ok(!p.includes(x), `${x} never follows`);
});

test("a bad dream at night: back to the room or a hand on the heart, never the rewrite", () => {
  const s = run(NIGHT("dream"));
  assert.equal(s.stepId, "dream");
  assert.deepEqual(offers(s), ["five_senses", "soothe"]);
  assert.match(skill.copy.dream_line, /help for that in the daytime/);
  assert.doesNotMatch(skill.copy.dream_line, /rewrit/i, "never presumes a rewrite (a replay goes to a clinician)");
});

test("the plan: one wake time (the morning card's chips), one wind-down thing, then the card names the time", () => {
  const wake = step("wake").fields[0];
  assert.equal(wake.required, true);
  const ft = spine.followUpTypes.find((x) => x.id === "sleep_morning");
  assert.ok(ft && ft.enabled);
  const chips = Object.keys(ft.window.chips);
  assert.deepEqual(skill.options.wake.map((o) => o.value).sort(), chips.filter((c) => c.startsWith("w")).sort(), "every wake time is a chip");
  assert.deepEqual(Object.values(step("again").followUp.whenMap).sort(), chips.filter((c) => c.startsWith("n")), "and each has its tomorrow chip");
  for (const [k, w] of Object.entries(ft.window.chips)) {
    assert.equal(w.kind, "next_local", k);
    if (k.startsWith("n")) assert.equal(w.minAheadHours, 12, `${k}: the renewal is the next one after a rest, never the one just gone`);
    assert.equal(w.time.replace(":", ""), k.slice(1), k);
  }
  // Wind-down: never food, drink or pills.
  assert.doesNotMatch(skill.options.wind.map((o) => o.label).join(" "), /tea|milk|drink|eat|snack|pill|melatonin|alcohol/i);
  const end = run([...PLAN("w0730"), next]);
  assert.equal(end.stepId, "plan_end");
  assert.equal(M.copyText(ctx(), step("plan_end").title, end, M.titleSlots(ctx(), step("plan_end"), end)), "Up at 7:30, every day.");
  assert.equal(line(end), "plan_remind");
  const noRemind = run([...PLAN("w0730", false), next]);
  assert.equal(line(noRemind), "plan_line");
  for (const k of ["plan_remind", "plan_line"]) {
    assert.match(skill.copy[k], /a doctor can help/, `${k}: the referral line`);
    assert.match(skill.copy[k], /Caffeine in the hours before sleep and alcohol close to bedtime/, `${k}: H20b's substances`);
  }
  assert.match(skill.copy.wake_hint, /shifts/, "shift workers have a line");
});

test("the morning card: booked at the wake time only on a yes, the next morning, and it opens this run", () => {
  const atWind = run(PLAN("w0630"));
  assert.deepEqual(M.followUpFor(ctx(), step("wind"), atWind), { type: "sleep_morning", chip: "w0630" });
  assert.equal(M.followUpFor(ctx(), step("wind"), run(PLAN("w0630", false))), null, "no yes, no card");
  // 22:00 tonight → 06:30 tomorrow; 01:00 → 06:30 this morning (Gate 1: a plan made after midnight); 06:45, past it
  // (the morning's *Same again*) → tomorrow.
  const win = spine.followUpTypes.find((x) => x.id === "sleep_morning").window;
  const at = (h, m) => new Date(2026, 10, 13, h, m);
  for (const [now, day] of [[at(22, 0), 14], [at(1, 0), 13], [at(6, 45), 14], [at(6, 10), 14]]) {
    const due = W.dueAtFor(win, now, "w0630");
    assert.deepEqual([due.getDate(), due.getHours(), due.getMinutes()], [day, 6, 30], String(now));
  }
  const ft = spine.followUpTypes.find((x) => x.id === "sleep_morning");
  assert.equal(ft.deepLinkTemplate, "/tool/sleep-reset?run={sourceSessionId}&at=morning&followUp={followUpId}");
  assert.doesNotMatch(`${ft.copy.title} ${ft.copy.body}`, /\d|night was|wake time/i, "content-free: no time on the card");
  assert.ok(ft.staleAfterHours <= 12, "about one morning");
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /OPEN_RESOLVES = \[[^\]]*'sleep_morning'/);
  assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), /sleep_morning: 'sleep-reset'/);
  assert.match(readFileSync("schema/practice-spine.cypher", "utf8"), /sleep_morning/);
});

test("the morning: how was the night, up at your time; same again books the card for tomorrow at the same wake time", () => {
  const end = run([...PLAN("w0800"), next]);
  const rec = M.runRecord(ctx(), { ...end, scheduled: { wind: { type: "sleep_morning", id: "f1" } } });
  const r = M.resumeRun(ctx(), rec, "morning");
  assert.equal(r?.stepId, "morning");
  assert.equal(M.canGoOn(ctx(), r), false);
  const atAgain = run([pick("slept", "barely"), pick("up_at", "up_yes"), next], ctx(), r);
  assert.equal(atAgain.stepId, "again");
  assert.equal(M.copyText(ctx(), step("again").title, atAgain), skill.copy.again_title_up);
  const yes = run([pick("again", "again_yes")], ctx(), atAgain);
  assert.deepEqual(M.followUpFor(ctx(), step("again"), yes), { type: "sleep_morning", chip: "n0800" }, "tomorrow at the wake time from the plan");
  // Codex on #135: opened early (6:00 for an 8:00 wake), the renewal is still tomorrow, never this morning again.
  const win = spine.followUpTypes.find((x) => x.id === "sleep_morning").window;
  for (const [h, m] of [[6, 0], [7, 45], [8, 10], [11, 0]]) {
    const due = W.dueAtFor(win, new Date(2026, 10, 13, h, m), "n0800");
    assert.deepEqual([due.getDate(), due.getHours(), due.getMinutes()], [14, 8, 0], `${h}:${m}`);
  }
  assert.ok(readFileSync("functions/src/spine/validation.ts", "utf8").includes("'n0800'"), "the server accepts the renewal chips");
  assert.equal(M.followUpFor(ctx(), step("again"), run([pick("again", "again_no")], ctx(), atAgain)), null);
  const done = run([next], ctx(), yes);
  assert.equal(done.stepId, "morning_end");
  assert.equal(line(done), "morning_barely");
  assert.match(skill.copy.morning_barely, /don't drive drowsy/);
  assert.match(skill.copy.morning_barely, /full of energy, not tired\? Tell your doctor/, "bipolar: a short night with energy");
  assert.deepEqual(offers(done), ["please_skill"], "a short night: Running low for the day");
  // Reopened a second time (booked again on the yes): asked fresh, the wake time still there.
  const rec2 = M.runRecord(ctx(), { ...done, scheduled: { again: { type: "sleep_morning", id: "f2" } } });
  const r2 = M.resumeRun(ctx(), rec2, "morning");
  assert.equal(r2?.stepId, "morning");
  assert.equal(r2.answers.slept, undefined, "last morning's answers are cleared");
  assert.deepEqual(r2.answers.wake.ids, ["w0800"]);
  // A run that never reached the plan doesn't reopen there.
  assert.notEqual(M.resumeRun(ctx(), M.runRecord(ctx(), run(NIGHT("body"))), "morning")?.stepId, "morning");
});

test("the morning after a bad dream: Rewrite the nightmare, in daylight; not up yet gets the light line", () => {
  const end = run([...PLAN(), next]);
  const r = M.resumeRun(ctx(), M.runRecord(ctx(), end), "morning");
  const done = run([pick("slept", "broken"), pick("up_at", "up_not_yet"), pick("dream", "dream_yes"), next, pick("again", "again_no"), next], ctx(), r);
  assert.equal(done.stepId, "morning_end");
  assert.deepEqual(offers(done), ["nightmare_rescript"]);
  assert.equal(line(done), "morning_broken", "broken nights: the referral line, with snoring, gasping and restless legs");
  assert.match(skill.copy.morning_broken, /snoring, gasping or restless legs/);
  const fine = run([pick("slept", "okay"), pick("up_at", "up_not_yet"), next, pick("again", "again_no"), next], ctx(), r);
  assert.equal(line(fine), "morning_not_yet");
  const no = run([pick("slept", "okay"), pick("up_at", "up_yes"), next, pick("again", "again_no"), next], ctx(), r);
  assert.equal(line(no), "morning_again_no", "a no says how to start again");
});

test("a carried flooded reading: settle first is offered only on the plan side; the night breathes", () => {
  const F = ctx({ band: "flooded" });
  const plan = run([pick("mode", "plan")], F);
  assert.ok(M.shownFields(F, step("mode"), plan)[0].links.some((l) => l.exit === "cool_down"));
  assert.equal(run([pick("mode", "plan"), next], F).stepId, "wake");
  assert.equal(run(NIGHT("unsure"), F).stepId, "breathe");
});

test("hosts: Running low's sleep row and the nightmare clinician card open it (no longer planned)", () => {
  for (const id of ["please_skill", "nightmare_rescript"]) {
    const host = content.skills.find((s) => s.id === id);
    const e = host.exits.find((x) => x.id === "sleep_reset");
    assert.equal(e.toolId, "sleep-reset", id);
    assert.ok(!e.planned, id);
  }
});

// Part 2: the profile anchor (Me → My body). Kept on the wake screen's yes chip, or re-confirmed by picking the kept time
// again; listed first next time, never picked for them.
test("the anchor: kept on a yes, re-confirmed by picking it again, listed first next time but never picked", async () => {
  const title = (s, c = ctx()) => M.copyText(c, step(s.stepId).title, s, M.titleSlots(c, step(s.stepId), s));
  const fieldIds = (s, c = ctx()) => M.shownFields(c, step(s.stepId), s).map((f) => f.id);
  const toWake = (c = ctx()) => run([pick("mode", "plan"), next], c);
  // First time: no anchor, the plain title, the keep chip under the times.
  const first = run([pick("wake", "w0730")], ctx(), toWake());
  assert.equal(first.stepId, "wake");
  assert.equal(title(first), "What time will you get up, every day?");
  assert.deepEqual(fieldIds(first), ["wake", "hours", "keep"]);
  assert.equal(M.keepFor(ctx(), step("wake"), first), null, "no tap, no keep");
  const kept = M.keepFor(ctx(), step("wake"), run([pick("keep", "keep_yes")], ctx(), first));
  assert.equal(kept.kind, "sleep_anchor");
  assert.deepEqual(kept.value, { wakeIds: ["w0730"] });
  assert.equal(skill.copy[step("wake").primary], "Next", "the chip is the yes; the button stays Next");
  assert.equal(step("wind").keep, undefined, "the wind-down screen keeps nothing");
  // Coming back with an anchor: *Still your time?*, the kept time first, nothing picked.
  const withAnchor = { ...ctx(), profile: { sleepAnchor: "w0730" } };
  const wake = toWake(withAnchor);
  assert.equal(title(wake, withAnchor), "Still your time? It's at the top.");
  const groups = M.optionGroups(withAnchor, step("wake").fields[0], wake.answers);
  assert.equal(groups[0].options[0].value, "w0730", "the kept time leads");
  assert.equal(groups[0].options.length, 8, "every time is still there");
  assert.equal(wake.answers.wake, undefined, "never picked for them");
  // Picking it again answers *still your time?*: no chip, and the keep refreshes it (Me's revisit starts over).
  const same = run([pick("wake", "w0730")], withAnchor, wake);
  assert.deepEqual(fieldIds(same, withAnchor), ["wake", "hours"]);
  assert.deepEqual(M.keepFor(withAnchor, step("wake"), same).value, { wakeIds: ["w0730"] });
  // A new time: the chip again, kept only on its yes (keeping it replaces the old one).
  const moved = run([pick("wake", "w0800")], withAnchor, wake);
  assert.deepEqual(fieldIds(moved, withAnchor), ["wake", "hours", "keep"]);
  assert.equal(M.keepFor(withAnchor, step("wake"), moved), null);
  // Talk to someone now on the always-shown time field, so it never hides with the keep chip (Codex on #139).
  for (const [st, c] of [[first, ctx()], [same, withAnchor], [moved, withAnchor]])
    assert.equal(M.shownFields(c, step("wake"), st).flatMap((f) => f.links ?? []).filter((l) => l.exit === "safety_open").length, 1);
  // The kind: one per person, My body, a wake id only, the same ids as the skill's times; on the tool's needs.
  const { PROFILE_KINDS, SLEEP_WAKE_IDS } = await importTs("functions/src/profile/kinds.ts");
  assert.deepEqual([...SLEEP_WAKE_IDS], skill.options.wake.map((o) => o.value), "the server's wake ids are the skill's");
  const k = PROFILE_KINDS.sleep_anchor;
  assert.equal(k.many, false);
  assert.equal(k.area, "my_body");
  assert.deepEqual(k.ownFields, []);
  assert.deepEqual(k.validate({ wakeIds: ["w0630"] }), { wakeIds: ["w0630"] });
  assert.deepEqual(k.validate({ wakeIds: ["w1400"] }), { wakeIds: ["w1400"] }, "a night-shift time keeps too");
  assert.throws(() => k.validate({ wakeIds: ["w1130"] }));
  assert.throws(() => k.validate({ wakeIds: [] }), /One wake time/);
  assert.throws(() => k.validate({ wakeIds: ["w0700"], windIds: ["dim"] }), /Unexpected field/);
  const types = await importTs("src/data/profileTypes.ts");
  assert.deepEqual(types.PROFILE_NEEDS["sleep-reset"], ["sleepAnchor"]);
  assert.match(readFileSync("functions/src/profile/me.ts", "utf8"), /meta\.kind === 'sleep_anchor'[\s\S]{0,200}Up at \$\{Number\(m\[1\]\)\}:\$\{m\[2\]\}, every day/);
  assert.match(readFileSync("schema/profile-layer.cypher", "utf8"), /sleep_anchor/);
});

// Night shifts and late starts (Gate 3's open line, shipped): every hour of the day behind *My hours are different*,
// nothing asked about work, and the morning card books and renews at that hour like any other.
test("shift hours: every other hour of the day one tap away; a kept shift time shows without it; the card follows", () => {
  const shown = (s, c = ctx()) => M.optionGroups(c, step("wake").fields[0], s.answers).flatMap((g) => g.options.map((o) => o.value));
  const toWake = (c = ctx()) => run([pick("mode", "plan"), next], c);
  const plain = toWake();
  assert.deepEqual(shown(plain), ["w0600", "w0630", "w0700", "w0730", "w0800", "w0830", "w0900", "w0930"], "the morning times first, nothing else");
  assert.ok(M.shownFields(ctx(), step("wake"), plain).some((f) => f.id === "hours"), "the way to the other hours is on the screen");
  const shift = run([pick("hours", "shift")], ctx(), plain);
  const all = shown(shift);
  assert.equal(all.length, 28, "every hour of the day, the morning's half hours too");
  assert.deepEqual(all.slice(8, 12), ["w1000", "w1100", "w1200", "w1300"]);
  assert.ok(all.includes("w2200") && all.includes("w0000") && all.includes("w0500"), "nights: up in the evening or small hours");
  assert.equal(skill.options.wake.find((o) => o.value === "w1400").label, "14:00");
  assert.match(skill.copy.wake_hint, /shifts or nights/i);
  assert.doesNotMatch(JSON.stringify(skill.copy), /what (shift|job)|your work hours/i, "nothing asked about work");
  // The plan through to the card at 14:00, and its morning screen doesn't say morning.
  const plan = run([pick("wake", "w1400"), next, pick("wind", "dim"), pick("remind", "yes")], ctx(), shift);
  assert.equal(M.copyText(ctx(), step("plan_end").title, plan, M.titleSlots(ctx(), step("plan_end"), run([next], ctx(), plan))), "Up at 14:00, every day.");
  const ft = spine.followUpTypes.find((x) => x.id === "sleep_morning");
  assert.deepEqual(ft.window.chips.w1400, { kind: "next_local", time: "14:00" });
  assert.equal(step("again").followUp.whenMap.w1400, "n1400");
  assert.deepEqual(ft.window.chips.n1400, { kind: "next_local", minAheadHours: 12, time: "14:00" });
  const morning = { ...plan, stepId: "morning" };
  assert.equal(M.copyText(ctx(), step("morning").title, morning), skill.copy.morning_title_shift);
  assert.doesNotMatch(skill.copy.morning_title_shift, /morning|night/i);
  // The title follows the time, not the tap: tapped open but 7:00 picked is a morning.
  const early = run([pick("wake", "w0700")], ctx(), shift);
  assert.equal(M.copyText(ctx(), step("morning").title, { ...early, stepId: "morning" }), skill.copy.morning_title);
  // Nothing on the plan or morning cards assumes a night sleeper.
  for (const k of ["plan_remind", "plan_line", "morning_barely", "morning_not_yet", "morning_title_shift"])
    assert.doesNotMatch(skill.copy[k], /after midday|at night|tonight|it's morning|morning check|On a night/i, k);
  assert.doesNotMatch(JSON.stringify(ft.copy) + ft.notification, /morning|night/i, "the Today card says sleep, not morning");
  // The renewal: a 23:00 waker answering at 0:30 gets tonight's card, not the night after; a 7:00 waker answering at
  // 6:50 gets tomorrow's, not this morning's.
  const at = (y, mo, d, h, mi) => new Date(y, mo, d, h, mi);
  assert.deepEqual(W.dueAtFor(ft.window, at(2026, 10, 14, 0, 30), "n2300"), at(2026, 10, 14, 23, 0));
  assert.deepEqual(W.dueAtFor(ft.window, at(2026, 10, 14, 23, 10), "n2300"), at(2026, 10, 15, 23, 0));
  assert.deepEqual(W.dueAtFor(ft.window, at(2026, 10, 14, 6, 50), "n0700"), at(2026, 10, 15, 7, 0));
  assert.deepEqual(W.dueAtFor(ft.window, at(2026, 10, 14, 9, 0), "n0700"), at(2026, 10, 15, 7, 0));
  // A kept shift time is listed first next time without the tap, the other shift hours still behind it.
  const withAnchor = { ...ctx(), profile: { sleepAnchor: "w2200" } };
  const back = shown(toWake(withAnchor), withAnchor);
  assert.equal(back[0], "w2200");
  assert.equal(back.length, 9);
  // Picked from the top without the tap, it's a shift time all the same (the morning screen says so), and it stays the
  // run's time when the card reopens after the anchor has moved: the renewal books it, not the 7:00 default.
  const keptPick = run([pick("wake", "w2200")], withAnchor, toWake(withAnchor));
  assert.equal(M.copyText(withAnchor, step("morning").title, { ...keptPick, stepId: "morning" }), skill.copy.morning_title_shift);
  const moved = { ...ctx(), profile: { sleepAnchor: null } };
  assert.deepEqual(shown(keptPick, moved).slice(-1), ["w2200"], "the run's own pick is still an option");
  assert.equal(M.optionGroups(moved, step("wake").fields[0], keptPick.answers).length > 0, true);
  // The server accepts every chip it books.
  const v = readFileSync("functions/src/spine/validation.ts", "utf8");
  for (const c of Object.keys(ft.window.chips)) assert.match(v, new RegExp(`'${c}'`), c);
});
