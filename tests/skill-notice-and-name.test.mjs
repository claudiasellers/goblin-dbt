// Notice what's here (PRD MF-01 Notice it, name it; observe and describe: DBT Mindfulness Handouts 4, 4a, 4b;
// docs/design/notice-and-name.md) on the skill runtime: pick a way to notice (outside in), a minute of noticing with a
// pebble for each return, a word or two for it, what else showed up, the orienting close asked in the flow, and an
// optional off-phone rep the next day. Tested through the same pure machine the player runs, plus the pebble bowl's
// pure rules (src/lib/pebbleBowl.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const B = await importTs("src/lib/pebbleBowl.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "notice_and_name");
const embedOutputs = {
  pebbleBowl: { ids: ["done", "partly", "skipped", "room"], measures: ["durationSec", "doneCount"] },
  squeezeRelease: { ids: ["done", "partly", "skipped"], measures: ["durationSec", "doneCount"] },
  orientFind: { ids: ["done", "partly", "skipped"], measures: ["doneCount"] },
};
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const bowl = { type: "embedDone", output: { ids: ["done"], durationSec: 60, doneCount: 4 } };
const toRoom = { type: "embedDone", output: { ids: ["room"], durationSec: 12, doneCount: 1 } };
const unstarted = { type: "embedDone", output: { ids: ["skipped"], durationSec: 0, doneCount: 0 } };
const found = { type: "embedDone", output: { ids: ["done"], doneCount: 3 } };
const pressed = { type: "embedDone", output: { ids: ["done"], durationSec: 30, doneCount: 3 } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s);
const ids = (s, step, c = ctx()) => {
  const f = M.shownFields(c, M.stepOf(skill, step), s)[0];
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const line = (s, c = ctx()) => M.handoffLine(c, M.stepOf(skill, s.stepId), s);
const title = (s, c = ctx()) => M.copyText(c, M.stepOf(skill, s.stepId).title, s, M.titleSlots(c, M.stepOf(skill, s.stepId), s));
const links = (s, c = ctx()) => {
  const st = M.stepOf(skill, s.stepId);
  return [...M.stepLinks(c, st, s), ...M.shownFields(c, st, s).flatMap((f) => M.fieldLinks(c, f, s))].map((l) => l.exit.id);
};
const FLOODED = ctx({ band: "flooded" });
const LISTEN = [pick("way", "listen"), next, bowl];
const TO_CLOSE = [...LISTEN, pick("name", "listen_near"), next, next];
const booked = (when = "morning", c = ctx()) => run([...TO_CLOSE, pick("close", "better"), next, pick("when", when)], c);
const reopened = (b = booked(), c = ctx()) => M.resumeRun(c, M.runRecord(c, b), "offphone");

test("the skill: tool notice-and-name on dbt_observe, listed under Mindfulness, the orienting close asked in the flow", () => {
  assert.equal(skill.toolId, "notice-and-name");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /MATCH \(t:TherapyConcept \{id: "dbt_observe"\}\), \(s:Skill \{id: "notice_and_name"\}\)/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'notice-and-name': 'notice_and_name',/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'notice-and-name',\n\s+name: 'Notice what\\'s here',[\s\S]*?module: 'mindfulness',/);
  assert.doesNotMatch(tools, /toolId: 'notice-and-name'/, "no intent line (PRD MF-01: MF adds only two intents)");
  for (const f of ["src/lib/spine/close.ts", "functions/src/spine/tools.ts"])
    assert.match(readFileSync(f, "utf8"), /'notice-and-name': \{ module: 'mf', closeKind: 'orienting' \}/, f);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_observe", t: "notice-and-name"\}/);
  const close = M.stepOf(skill, "close").fields[0];
  assert.equal(close.askFresh, "thenVsNow");
  assert.deepEqual(skill.options.tvn.map((o) => o.label), ["Further away", "About the same", "A bit more here", "More here"]);
});

test("Mindfulness is listed first on Tools (PRD Q11: DBT teaches it first)", () => {
  const mods = readFileSync("src/data/modules.ts", "utf8");
  assert.ok(mods.indexOf("id: 'mindfulness'") < mods.indexOf("id: 'distress-tolerance'"));
  assert.match(mods, /id: 'mindfulness', name: 'Mindfulness', order: 1/);
});

test("pick a way: outside in, a host's frame lists one first (never picks it)", () => {
  assert.deepEqual(ids(M.initialRun(skill), "way"), ["look", "listen", "touch", "contact", "inside"]);
  assert.deepEqual(ids(M.initialRun(skill), "way", ctx({ frame: "listen" })), ["listen", "look", "touch", "contact"]);
  assert.deepEqual(ids(M.initialRun(skill), "way", ctx({ frame: "blank" })), ["contact", "look", "listen", "touch", "inside"]);
  assert.equal(M.initialRun(skill).answers.way, undefined, "nothing preselected");
  for (const [w, to] of [["look", "look_what"], ["listen", "listen"], ["touch", "touch"], ["contact", "contact"], ["inside", "inside_where"]])
    assert.equal(run([pick("way", w), next]).stepId, to, w);
});

test("never inward when flooded, far away or watchful; a carried flooded reading gets Look or Listen and the body first", () => {
  const far = ctx({ frame: "far" });
  assert.deepEqual(ids(M.initialRun(skill), "way", far), ["look", "listen", "touch", "contact"]);
  assert.deepEqual(ids(M.initialRun(skill), "way", ctx({ frame: "listen" })), ["listen", "look", "touch", "contact"], "a watchful result's card: no Inside");
  const start = M.initialRun(skill);
  assert.deepEqual(ids(start, "way", FLOODED), ["look", "listen"]);
  assert.equal(title(start, FLOODED), "Your body's loud right now.");
  assert.deepEqual(links(start, FLOODED), ["cool_down"]);
  assert.deepEqual(links(start), [], "the body-first link is for a carried flooded reading only");
  assert.equal(skill.exits.find((x) => x.id === "cool_down").toolId, "cool-down");
  // Flooded: no word step (PRD: no words, or one). Straight to the close, then an end with no off-phone offer.
  assert.equal(run(LISTEN, FLOODED).stepId, "close");
  const end = run([...LISTEN, pick("close", "better"), next], FLOODED);
  assert.equal(end.stepId, "end_flooded");
  assert.equal(M.stepOf(skill, "end_flooded").fields, undefined);
  assert.equal(title(end, FLOODED), "You noticed something while your body was loud. That counts.");
});

test("look: a quality to find, three finds with today's date on screen", () => {
  const s = run([pick("way", "look"), next, pick("what", "blue"), next]);
  assert.equal(s.stepId, "look");
  assert.equal(title(s), "Find three things that are blue.");
  const props = M.stepOf(skill, "look").props;
  assert.equal(props.count, 3);
  assert.equal(props.variant, "find");
  assert.equal(run([found], ctx(), s).stepId, "name");
});

test("listen, touch and inside run the pebble bowl; feet on the floor is a press and let go", () => {
  for (const [step, secs] of [["listen", 60], ["touch", 45], ["inside", 30]]) {
    const st = M.stepOf(skill, step);
    assert.equal(st.embed, "pebbleBowl", step);
    assert.equal(st.props.seconds, secs, step);
  }
  assert.equal(skill.copy.bowl_dropped, "A pebble in the bowl.", "the screen reader hears a pebble, never a count");
  for (const step of ["listen", "touch", "inside"])
    assert.equal(M.stepOf(skill, step).props.tapLabel, "came_back", `${step}: a pebble is a return, never a new sound (rule 6)`);
  assert.doesNotMatch(skill.copy.listen_task, /each time a new sound/i, "listening, not detecting");
  const c = M.stepOf(skill, "contact");
  assert.equal(c.embed, "squeezeRelease");
  assert.equal(run([pick("way", "contact"), next, pressed]).stepId, "name");
  for (const k of ["contact_step1", "contact_step2", "listen_task", "touch_task", "inside_task"])
    assert.doesNotMatch(skill.copy[k], /breath|close your eyes|danger|exit/i, k);
});

test("inside: the body map's places outside in from the contact points, never the chest, throat or whole body", () => {
  const where = run([pick("way", "inside"), next]);
  const places = ids(where, "inside_where");
  assert.deepEqual(places.slice(0, 3), ["feet", "legs", "hands"]);
  for (const no of ["chest", "throat", "body"]) assert.ok(!places.includes(no), no);
  assert.equal(places.at(-1), "none");
  assert.match(skill.copy.inside_where_hint, /one tap away/);
  assert.match(skill.copy.inside_task, /^Eyes open\./);
  const feet = run([pick("place", "feet"), next], ctx(), where);
  assert.equal(feet.stepId, "inside");
  assert.match(title(feet), /^Feet\. Stay with it for a little while\.$/);
  assert.equal(title(run([pick("place", "none"), next], ctx(), where)), "Stay with where you touch the chair or the floor.");
});

test("name it: guesses for the way they noticed, one at most, their own word or no words (a full answer)", () => {
  const s = run(LISTEN);
  assert.equal(s.stepId, "name");
  const words = ids(s, "name");
  assert.ok(words.every((w) => w.startsWith("listen_") || w === "no_words"), words.join());
  assert.ok(words.includes("no_words"));
  const inside = run([pick("way", "inside"), next, pick("place", "belly"), next, bowl]);
  assert.ok(ids(inside, "name").includes("inside_tension"), "inside: the check-in's sensation words");
  assert.match(readFileSync("schema/skills.cypher", "utf8"), /SensationType \{id: "tension"\}/);
  assert.equal(M.stepOf(skill, "name").fields[0].max, 1);
  assert.equal(run([pick("name", "no_words"), next], ctx(), s).stepId, "else");
  assert.equal(run([own("name", "fizzy"), next], ctx(), s).stepId, "else");
});

test("what else showed up is optional, and the end card points on to what showed up", () => {
  const s = run([...LISTEN, pick("name", "listen_far"), next]);
  assert.equal(s.stepId, "else");
  assert.equal(M.stepOf(skill, "else").fields[0].required, false);
  const end = run([pick("else", "feeling"), pick("else", "thought"), next, pick("close", "same"), next], ctx(), s);
  assert.equal(end.stepId, "end");
  assert.deepEqual(offers(end), ["find_the_feeling", "thoughts_passing"]);
  assert.match(line(end), /A feeling showed up/);
  const plain = run([...TO_CLOSE, pick("close", "much_better"), next]);
  assert.deepEqual(offers(plain), []);
  assert.equal(title(plain), "Wandering is the practice. Each time you came back, that was the skill.");
  const looked = run([pick("way", "look"), next, pick("what", "round"), next, found, pick("name", "look_still"), next, next, pick("close", "same"), next]);
  assert.equal(title(looked), "You noticed what was here. That counts.", "no return taps on Look: no praise for returns");
});

test("never Thoughts passing through on a watchful or far-away entry (rumination alongside contraindicates it)", () => {
  for (const frame of ["listen", "far"]) {
    const c = ctx({ frame });
    const end = run([pick("way", "look"), next, pick("what", "old"), next, found, pick("name", "no_words"), next, pick("else", "thought"), next, pick("close", "same"), next], c);
    assert.equal(end.stepId, "end", frame);
    assert.deepEqual(offers(end, c), [], frame);
    assert.match(line(end, c), /A thought showed up/, "the line still validates");
  }
});

test("an urge that showed up puts *If the urge is to hurt yourself* on the end card", () => {
  const end = run([...LISTEN, pick("name", "listen_near"), next, pick("else", "urge"), next, pick("close", "same"), next]);
  assert.deepEqual(links(end), ["safety_open"]);
  assert.equal(skill.copy.safety_urge, "If the urge is to hurt yourself");
  assert.deepEqual(links(run([...TO_CLOSE, pick("close", "same"), next])), []);
});

test("further away: back to the room, then a plain line, someone to talk to on both screens, no blame", () => {
  const room = run([...TO_CLOSE, pick("close", "worse"), next]);
  assert.equal(room.stepId, "room");
  assert.equal(M.stepOf(skill, "room").embed, "orientFind");
  assert.deepEqual(links(room), ["safety_open"]);
  const far = run([found], ctx(), room);
  assert.equal(far.stepId, "far");
  assert.deepEqual(links(far), ["safety_open"]);
  assert.equal(title(far), "Feeling further away can happen when attention turns in.");
  assert.match(line(far), /a doctor or therapist can help/);
  assert.equal(skill.copy.far_safety, "If it comes with thoughts of hurting yourself");
  assert.deepEqual(offers(far), ["five_senses"]);
});

test("Back to the room while noticing: a stop that lands (PRD rule 3), no word step, no close", () => {
  for (const [way, pre] of [["listen", []], ["touch", []], ["inside", [pick("place", "hands"), next]]]) {
    assert.equal(M.stepOf(skill, way).props.room, "back_to_room", way);
    const stop = run([pick("way", way), next, ...pre, toRoom]);
    assert.equal(stop.stepId, "room_stop", way);
    assert.deepEqual(links(stop), ["safety_open"]);
    const end = run([found], ctx(), stop);
    assert.equal(end.stepId, "room_end");
    assert.ok(M.stepOf(skill, "room_end").noClose);
  }
  assert.equal(run([pick("way", "touch"), next, unstarted]).stepId, "close", "a bowl never started skips the words");
  assert.ok(skill.exits.find((x) => x.id === "safety_open").safety);
});

test("the off-phone rep: optional chips book offphone_rep, which reopens the run at *without the app?*", () => {
  const end = M.stepOf(skill, "end");
  assert.deepEqual(end.followUp, { type: "offphone_rep", whenFrom: "when" });
  assert.equal(end.fields[0].required, undefined);
  const r = reopened();
  assert.ok(r, "a run that reached the end card reopens");
  assert.equal(r.stepId, "offphone");
  assert.equal(title(r), "Did you get to notice something without the app?");
  const yes = run([pick("offphone", "yes"), next], ctx(), r);
  assert.equal(yes.stepId, "offphone_end");
  assert.ok(M.stepOf(skill, "offphone_end").noClose);
  assert.equal(M.resumeRun(ctx(), M.runRecord(ctx(), run(LISTEN)), "offphone"), null, "a run that never reached the end doesn't reopen");
  const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content.followUpTypes.find((t) => t.id === "offphone_rep");
  assert.ok(spine, "spine.json ships the type");
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /OPEN_RESOLVES = \[[^\]]*'offphone_rep'/, "opening the card resolves it (Codex, PR #145)");
  assert.equal(spine.deepLinkTemplate, "/tool/notice-and-name?run={sourceSessionId}&at=offphone&followUp={followUpId}");
  const ps = readFileSync("schema/practice-spine.cypher", "utf8");
  assert.match(ps, /FollowUpType \{id: "offphone_rep"\}/);
  assert.match(readFileSync("functions/src/skills/projections.ts", "utf8"),
    /notice_and_name: \{ toolId: 'notice-and-name', happenedField: 'offphone', yes: 'yes', unansweredKeepsOwn: true \}/);
});

test("reps: a completed visit is an observe and a describe rep (Moderate, the PRD's grade)", () => {
  const ps = readFileSync("schema/practice-spine.cypher", "utf8");
  assert.match(ps, /PracticeSkill \{id: "observe"\}\)\nSET k\.name = "Observe",[^\n]*k\.evidenceGrade = "Moderate"[\s\S]*?k\.defaultFor = \["notice-and-name"\]/);
  assert.match(ps, /PracticeSkill \{id: "describe"\}\)\nSET k\.name = "Describe",[\s\S]*?k\.defaultFor = \["notice-and-name"\]/);
  assert.match(ps, /PracticeSkill \{id: "observe"\}\), \(c:TherapyConcept \{id: "dbt_observe"\}\)/);
});

test("routing: a watchful result leads with Notice what's here on Listen; Five senses stays the backup", () => {
  const rf = readFileSync("schema/recommended-for.cypher", "utf8");
  assert.match(rf, /id: "rf_chronic_vigilance_default_notice-and-name", c: "dbt_observe", p: "chronic_vigilance", bands: \["steady", "stirred"\], prio: 1\.0[^}]*active: true, review: "approved"/);
  assert.match(rf, /id: "rf_chronic_vigilance_backup_five-senses"[^}]*prio: 3\.0[^}]*active: true/);
  assert.match(readFileSync("src/lib/recommendation.ts", "utf8"), /'notice-and-name': \{ chronic_vigilance: 'listen' \}/);
});

test("the pebble bowl: a minute by default, outcomes by how much of the time ran, a count that's a measure only", () => {
  assert.equal(B.bowlMs({}), 60000);
  assert.equal(B.bowlMs({ seconds: 45 }), 45000);
  assert.equal(B.bowlMs({ seconds: 5 }), 60000, "out of range falls back");
  assert.equal(B.bowlOutcome(false, 0), "skipped");
  assert.equal(B.bowlOutcome(true, 0.4), "partly");
  assert.equal(B.bowlOutcome(true, 1), "done");
  assert.deepEqual(B.bowlOutput(true, 1, 60400, 7), { ids: ["done"], durationSec: 60, doneCount: 7 });
  assert.deepEqual(B.bowlOutput(false, 0, 0, 0), { ids: ["skipped"], durationSec: 0, doneCount: 0 });
  // Pebbles rest in the bowl, the same place each time: each one above the curve under it and below the rim.
  const spots = Array.from({ length: B.BOWL_SHOWN }, (_, i) => B.pebbleSpot(i));
  assert.deepEqual(B.pebbleSpot(5), B.pebbleSpot(5));
  for (const s of spots) {
    const floor = Math.min(B.bowlFloor(s.x - s.r * 0.7), B.bowlFloor(s.x), B.bowlFloor(s.x + s.r * 0.7));
    assert.ok(s.y + s.r <= floor && s.y - s.r >= B.BOWL.rimY && s.y + s.r <= B.BOWL.height, JSON.stringify(s));
  }
  assert.deepEqual(B.pebbleSpot(99), B.pebbleSpot(B.BOWL_SHOWN - 1), "a full bowl stays full");
  const src = readFileSync("src/components/skillPlayer/PebbleBowl.tsx", "utf8");
  assert.doesNotMatch(src, /\{pebbles\}<|>\{pebbles\}/, "the count is never rendered");
  assert.match(src, /chime: false/);
});
