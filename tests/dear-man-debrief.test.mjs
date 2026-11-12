// DEAR MAN's debrief on the skill runtime (IE-B2 second PR; docs/design/dear-man-debrief.md): the skill
// (scripts/skills/dear_man_debrief.py), the page before it (src/components/tools/dearMan/DearManDebrief.tsx over
// src/lib/dearManDebrief.ts), the prep's links into it (ask_outcome, the summary link) and Let go after a refused ask.
// The projection is pinned in functions/test/unit/dearManDebrief.test.cjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");
const lib = await importTs("src/lib/dearManDebrief.ts");
const first = await importTs("src/lib/personFirst.ts");
const skills = JSON.parse(read("src/data/content/skills.json")).content.skills;
const dm = skills.find((s) => s.id === "dear_man_debrief");
const step = (id) => dm.steps.find((s) => s.id === id);
const nextTo = (id) => step(id).next.map((n) => n.to);
const DAY = 86_400_000;
const NOW = Date.parse("2026-11-11T12:00:00Z");
const kept = (o) => ({ id: "p1", label: "Sam", role: "friend", safe: "yes", risk: "none", safeAskedAt: new Date(NOW - DAY).toISOString(), refusalsValidation: 0, meta: {}, ...o });

test("skill: under the dear-man tool id, takes the person and the part, starts with how they are now", () => {
  assert.equal(dm.toolId, "dear-man");
  assert.deepEqual(dm.accepts, ["personId", "partId"]);
  assert.equal(dm.start, "feel");
  assert.deepEqual(nextTo("feel"), ["happened"]);
  const link = step("feel").fields[0].links[0];
  assert.equal(dm.exits.find((x) => x.id === link.exit).toolId, "cool-down", "shaky or wound up: settle the body first");
});

test("skill: not yet and decided not are answers, not failures; no chain for them", () => {
  assert.deepEqual(nextTo("happened"), ["not_yet", "decided_not", "outcome"]);
  assert.equal(step("decided_not").kind, "handoff");
  assert.deepEqual(step("decided_not").offers ?? [], [], "accepted without rescue");
  const offered = (step("not_yet").offers ?? []).map((o) => dm.exits.find((x) => x.id === o.exit).toolId);
  assert.deepEqual(offered.sort(), ["cope-ahead", "dear-man", "rehearse"]);
});

test("skill: a good outcome gets its readout and the chain only on request; a bad one asks what got in the way (IE-11)", () => {
  assert.deepEqual(nextTo("outcome"), ["between"]);
  assert.deepEqual(nextTo("proud"), ["later", "waiting", "factor", "went_well"], "shaky first, then no answer yet, then a refusal");
  assert.deepEqual(nextTo("between"), ["unsafe", "proud"]);
  assert.deepEqual(nextTo("went_well"), ["moment", "good"]);
  assert.deepEqual(step("factor").clears, ["factor"], "coming back from the chain asks again");
  assert.deepEqual(nextTo("factor"), ["moment", "fix"]);
  assert.deepEqual(nextTo("plan"), ["factor", "good"], "after the chain: a bad outcome comes back to the factor");
  const factors = dm.options.factor.map((o) => o.value);
  assert.deepEqual(factors, ["no_words", "unclear", "feelings", "belief", "quick_win", "power", "cant_give", "not_willing", "look"]);
  assert.equal(step("factor").fields[0].max, 1, "one chip");
});

test("skill: the chain runs moment → response → body → thought → underneath → who → reflect → cope → rehearse → plan", () => {
  const chain = ["moment", "response", "body", "thought", "underneath", "who", "reflect", "cope", "rehearse", "plan"];
  for (let i = 0; i < chain.length - 1; i++) assert.deepEqual(nextTo(chain[i]), [chain[i + 1]], chain[i]);
  assert.equal(step("thought").fields[0].own.max, 90, "own words, short");
  assert.equal(step("plan").embed, "boundaryLine");
  assert.equal(step("plan").props.shape, "list");
});

test("skill: every factor's fix has a line, and its offers are only the tools that do that fix", () => {
  const fix = step("fix");
  for (const f of ["no_words", "unclear", "feelings", "belief", "quick_win", "power", "cant_give", "not_willing"]) {
    assert.ok(fix.lines.some((l) => JSON.stringify(l.when) === JSON.stringify({ eq: ["$a.factor", f] })), f);
  }
  const tools = new Set(fix.offers.map((o) => dm.exits.find((x) => x.id === o.exit).toolId));
  assert.deepEqual([...tools].sort(), ["check-the-facts", "cope-ahead", "dear-man", "ending-relationships", "fast", "finding-connection", "let-it-be", "rehearse", "thoughts-passing"]);
  const letGo = dm.exits.find((x) => x.id === "fast_let_go");
  assert.deepEqual(letGo.query, { frame: "let_go" });
});

test("skill: the picker's lines come from DEAR MAN's one source, with the debrief's own question and safety heading", () => {
  const sc = read("schema/dear-man-safety-gates.cypher");
  for (const k of ["personWhoDebrief", "safetyRouteDebriefHeading", "personNew", "safeQuestion", "riskHarm"]) {
    assert.ok(dm.copy[`picker_${k}`], k);
    assert.match(sc, new RegExp(`c\\.${k} = `), `${k} is in DearManSafetyCopy`);
  }
  const copy = first.personFirstPickerCopy(dm.copy, "personWhoDebrief");
  assert.equal(copy.personWho, dm.copy.picker_personWhoDebrief, "Who was the conversation with?");
  assert.equal(first.personFirstSafetyCopy(dm.copy, "safetyRouteDebriefHeading").safetyRouteHeading, dm.copy.picker_safetyRouteDebriefHeading);
  assert.equal(first.personFirstPickerCopy({}, "personWhoDebrief"), null);
  assert.equal(first.personFirstSafetyCopy({ picker_safetyRouteBody: "x" }, "safetyRouteDebriefHeading"), null);
});

test("safety inside the run: unsafe with them → the resources and Ending (careful) only; hurt, defeated or can't handle it → Talk to someone now", () => {
  const unsafe = step("unsafe");
  assert.equal(unsafe.noClose, true);
  assert.deepEqual(unsafe.crisis.map((c) => c.variant), ["other_person"]);
  const exits = unsafe.offers.map((o) => dm.exits.find((x) => x.id === o.exit));
  assert.deepEqual(exits.map((x) => x.toolId ?? (x.safety ? "safety.open" : null)), ["ending-relationships", "safety.open"]);
  assert.deepEqual(exits[0].query, { frame: "careful" });
  assert.ok(!JSON.stringify(unsafe).includes("dear_man") && !JSON.stringify(unsafe).includes("rehearse"));
  const links = (id) => step(id).fields.flatMap((f) => f.links ?? []).map((l) => l.exit);
  assert.ok(links("feel").includes("safety_open"));
  assert.ok(links("thought").includes("safety_open"));
  for (const id of ["not_yet", "no_answer", "later"]) assert.equal(step(id).followUp.type, "ask_outcome", `${id} can ask again`);
  assert.equal(step("rehearse").primary, "next", "practising is offered, never a false tap");
  assert.deepEqual([step("plan").props.field, step("plan").props.field2, step("plan").props.field3], ["body", "thought", "cope"], "signal, thought, then the move");
});

test("page: a link's person skips the picker only when kept, answered fresh and not on the safety route", () => {
  const people = [kept(), kept({ id: "p2", safeAskedAt: new Date(NOW - 120 * DAY).toISOString() }), kept({ id: "p3", risk: "harm", safe: "no" }),
    kept({ id: "p4", risk: null, safe: null, safeAskedAt: null }), kept({ id: "p5", risk: "invalidating", safe: "no" })];
  assert.equal(lib.presetPerson(people, "p1", NOW)?.personId, "p1");
  assert.equal(lib.presetPerson(people, "p2", NOW), null, "stale: asked again");
  assert.equal(lib.presetPerson(people, "p3", NOW), null, "the safety route: the picker, then the safety screen");
  assert.equal(lib.presetPerson(people, "p4", NOW), null, "never asked");
  assert.equal(lib.presetPerson(people, "p5", NOW)?.route, "heads_up");
  assert.equal(lib.presetPerson(people, "nobody", NOW), null);
  assert.equal(lib.presetPerson(null, "p1", NOW), null);
  assert.equal(lib.presetPerson(people, null, NOW), null);
});

test("page: the context in is the kept person's id (empty clears a link's), and a plain part id", () => {
  assert.deepEqual(lib.debriefCtx({ personId: "p1" }, "part1"), { personId: "p1", partId: "part1" });
  assert.deepEqual(lib.debriefCtx({ personId: null }, null), { personId: "none" }, "nobody kept: said, so no prep's person stands in");
  assert.deepEqual(lib.debriefCtx({ personId: "p1" }, "a b"), { personId: "p1" });
});

test("page: DearMan picks the mode once; each mode is a lazy skill page, with no check-in or end cards", () => {
  const page = read("src/pages/tools/DearMan.tsx");
  assert.match(page, /const \[mode\] = useState\(\(\) => new URLSearchParams\(search\)\.get\('mode'\)\);/);
  assert.match(page, /if \(mode === 'debrief'\) return <Suspense fallback=\{<ToolLoading \/>\}><LazyDearManDebrief \/><\/Suspense>;/);
  assert.match(page, /if \(mode === 'one'\) return <Suspense fallback=\{<ToolLoading \/>\}><LazyDearManOne \/><\/Suspense>;/, "One message (IE-B3) on ?mode=one");
  assert.match(page, /const LazyDearManDebrief = lazy\(\(\) => import\('\.\.\/\.\.\/components\/tools\/dearMan\/DearManDebrief'\)/);
  for (const gone of ["getStateAndTools", "saveCheckIn", "getDearManDebriefContent", "getDearManReflection", "recommendationCards"]) {
    assert.ok(!page.includes(gone), `${gone} is not on the page (Claudia, 11 Nov: no end cards, no silent check-in)`);
  }
  // The prep's way into the debrief is its first screen's link, and its card's ask_outcome (tests/dear-man-prep.test.mjs).
});
test("page: picker first; the safety route gets the safety screen, never the skill; one visit, one session", () => {
  const page = read("src/components/people/PersonFirstSkill.tsx");
  assert.match(page, /<PersonPicker key=\{pickerKey\} people=\{profile\.slices\?\.people \?\? null\} copy=\{pickerCopy\}/);
  assert.match(page, /if \(who\.route === 'safety'\) \{\s*return \(\s*<PersonSafetyRoute copy=\{safetyCopy\}/);
  assert.match(page, /return <SkillPlayer skillId=\{skillId\} ctx=\{ctxFor\(who, profile\.slices\?\.people \?\? null\)\} \{\.\.\.\(reopening \? \{ resumeRecord: resumeAfterPicker\(checked, who\) \} : \{\}\)\} \/>;/);
  assert.match(page, /if \(copyFailed\) return <ToolLoadError/, "fails closed without the picker's copy");
  assert.doesNotMatch(page, /navigate\(/, "no navigation between the picker and the skill: the ToolSession (and a card's RESOLVING) stays");
  const debrief = read("src/components/tools/dearMan/DearManDebrief.tsx");
  assert.match(debrief, /<PersonFirstSkill skillId=\{SKILL_ID\} toolId="dear-man" questionKey="personWhoDebrief" headingKey="safetyRouteDebriefHeading"\s*ctxFor=\{\(who\) => debriefCtx\(who, partId\)\} \/>/);
  const player = read("src/components/skillPlayer/SkillPlayer.tsx");
  assert.match(player, /\.\.\.st, \.\.\.\(pageCtx \?\? \{\}\) \}\);/, "the page's context over the address's, narrowed by contextIn");
});

test("ask_outcome: on, a deep link into the debrief, session-bound to DEAR MAN, shipped in spine.json", () => {
  const spine = JSON.parse(read("src/data/content/spine.json")).content;
  const t = spine.followUpTypes.find((x) => x.id === "ask_outcome");
  assert.ok(t?.enabled);
  assert.equal(t.resolveMode, "deeplink");
  assert.equal(t.deepLinkTemplate, "/tool/dear-man?mode=debrief&followUp={followUpId}");
  assert.deepEqual(Object.keys(t.window.chips).sort(), ["this_week", "today", "tomorrow", "unsure"]);
  for (const id of ["not_yet", "no_answer", "later"]) {
    for (const o of dm.options.again) assert.ok(o.value in t.window.chips, `${o.value} is an ask_outcome chip`);
  }
  assert.doesNotMatch(JSON.stringify(t.copy) + t.notification, /\{who\}|label/, "the card names no one");
  assert.match(read("functions/src/spine/copeAheadAfter.ts"), /ask_outcome: 'dear-man',/);
  // Every DEAR MAN skill that schedules it does so from its own step's followUp, on its chips.
  for (const id of ["dear_man_prep", "dear_man_one"]) {
    const sk = skills.find((s) => s.id === id);
    const st = sk.steps.find((x) => x.followUp?.type === "ask_outcome");
    assert.ok(st, id);
    const list = st.fields.find((x) => x.id === st.followUp.whenFrom).options.list;
    for (const o of sk.options[list]) assert.ok(o.value in t.window.chips, `${id}: ${o.value} is an ask_outcome chip`);
  }
});

test("copy: the new DEAR MAN lines are in the voice (no exclamation, should, just or but)", () => {
  const sc = read("schema/dear-man-safety-gates.cypher");
  const lines = sc.split("\n").filter((l) => /c\.(personWhoDebrief|askOutcome\w*|letGo\w*) = /.test(l));
  assert.equal(lines.length, 10);
  for (const l of lines) assert.doesNotMatch(l.replace(/^[^=]*= /, ""), /!|\bshould\b|\bjust\b|\bbut\b/i, l);
});

test("the profile reads what the debrief wrote: the people slice carries safetyRecheckAt, and a projected close clears the cache", async () => {
  const { PROFILE_WRITING_CLOSES } = await importTs("src/lib/skillRuntime/playerTools.ts");
  const src = read("functions/src/skills/projections.ts");
  const block = /export const PROJECTIONS[^=]*=\s*\{([\s\S]*?)\};/.exec(src)[1];
  const projected = new Set([...block.matchAll(/'([a-z0-9-]+)'\s*:/g)].map((m) => m[1]));
  for (const t of PROFILE_WRITING_CLOSES) assert.ok(projected.has(t), `${t}: a profile-writing close has a projection`);
  // Cope Ahead's projection (ext.ca, urgeIds) writes the session's own log fields, and Do the Opposite's its log records
  // (OppositeActionSession v3): never profile data.
  assert.deepEqual([...projected].filter((t) => !PROFILE_WRITING_CLOSES.has(t)).sort(), ["cope-ahead", "opposite-action"], "every other projection writes profile data");
  const ctx = read("src/contexts/ToolSessionContext.tsx");
  assert.match(ctx, /if \(PROFILE_WRITING_CLOSES\.has\(toolId\) && mergedExt\.run\) profileCache\.clear\(\);\s*refreshToday\(\);/, "after the close lands");
  const people = /people: `([\s\S]*?)`/.exec(read("functions/src/profile/slices.ts"))[1];
  assert.match(people, /\.refusalsValidation, \.safetyRecheckAt,/, "both fields the projection writes are read back");
});
