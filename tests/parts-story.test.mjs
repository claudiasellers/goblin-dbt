// A part's story (docs/design/parts.md, "The part card" and "The den"): the server's pure builder
// (functions/src/parts/storyBuild.ts), the words (src/lib/partStory.ts) and its two ways in (the card in
// Parts of me, one figure in the den). The callable is pinned in functions/test/unit/partStory.test.cjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { PARTS_SLOT_WIDTH } from "../scripts/voice-lint.mjs";

const read = (f) => readFileSync(f, "utf8");
const B = await importTs("functions/src/parts/storyBuild.ts");
const S = await importTs("src/lib/partStory.ts");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const content = { prompts: fixture.prompts, options: fixture.options };

const A = "4a2c9a0e-1b2c-4d5e-8f90-123456789abc", C = "5b2c9a0e-1b2c-4d5e-8f90-123456789abc", D = "6c2c9a0e-1b2c-4d5e-8f90-123456789abc";
const NOW = new Date("2026-10-17T12:00:00Z");
const roomPart = (id, name, o = {}) => ({ id, name, status: "active", tender: false, shapeSig: null, mapX: 0.3, mapY: 0.3, safety: false, ...o });
const layout = (parts) => JSON.stringify(parts.map(([id, status = "active"]) => ({ id, mapX: 0.2, mapY: 0.2, status, tender: false })));
const rows = (o = {}) => ({
  timeZone: "UTC",
  part: { id: A, createdAt: "2026-06-20T10:00:00Z", tender: false, status: "active", jobIds: ["hide_rather_need_someone"], ownJob: null,
    jobHistoryJson: JSON.stringify([{ jobIds: ["hide_job_out_of_sight"], ownJob: null, until: "2026-08-12T10:00:00Z" }]), ...o.part },
  revisits: o.revisits ?? [],
  snapshots: o.snapshots ?? [],
  room: o.room ?? { parts: [roomPart(A, "Guard"), roomPart(C, "Critic")], links: [] },
  stats: o.stats ?? null,
});

test("builder: met, its job then and now, rested and back, oldest first; months only", () => {
  const story = B.buildPartStory(rows({
    snapshots: [
      { takenAt: "2026-06-20T10:00:01Z", layoutJson: layout([[A]]) },
      { takenAt: "2026-09-03T09:00:00Z", layoutJson: layout([[A, "resting"]]) },
    ],
    revisits: [{ at: "2026-10-05T09:00:00Z", answer: "back" }, { at: "2026-08-12T10:00:00Z", answer: "new" }],
  }), NOW);
  assert.deepEqual(story.moments, [
    { kind: "met", month: "2026-06" },
    { kind: "job", month: "2026-08", then: { jobIds: ["hide_job_out_of_sight"], ownJob: null }, now: { jobIds: ["hide_rather_need_someone"], ownJob: null } },
    { kind: "rested", month: "2026-09" },
    { kind: "back", month: "2026-10" },
  ]);
  assert.doesNotMatch(JSON.stringify(story), /\d{4}-\d{2}-\d{2}/, "no date");
  assert.deepEqual(story.helped, []);
  assert.equal(story.felt, undefined);
  assert.deepEqual(story.steps, []);
});

test("builder: each line only when its data exists; a still-true answer that keeps it active isn't a moment", () => {
  const bare = B.buildPartStory(rows({ part: { jobHistoryJson: null }, revisits: [{ at: "2026-07-01T00:00:00Z", answer: "same" }] }), NOW);
  assert.deepEqual(bare.moments, [{ kind: "met", month: "2026-06" }]);
  assert.deepEqual(bare.links, []);
  assert.equal(bare.rooms, undefined);
  const unkept = B.buildPartStory(rows({ part: { createdAt: null, jobHistoryJson: "not json" } }), NOW);
  assert.deepEqual(unkept.moments, []);
  // A resting part whose rest was never recorded: no "Rested" line made up.
  assert.deepEqual(B.buildPartStory(rows({ part: { status: "resting", jobHistoryJson: null } }), NOW).moments.map((m) => m.kind), ["met"]);
});

test("builder: a tender part's story has no job, and keeps the relationship lines", () => {
  const stats = { helped: [{ toolId: "cool-down", n: 3 }], felt: { month: "2026-07", then: "feel_steady", now: "feel_curious" }, when: "evenings",
    steps: [{ stepId: "s1", label: "Step outside for a minute", n: 2 }] };
  const story = B.buildPartStory(rows({ part: { tender: true }, stats, room: { parts: [roomPart(A, "Guard", { tender: true }), roomPart(C, "Critic")], links: [{ id: "l1", kind: "covers_for", aId: C, bId: A, bothWantId: null }] } }), NOW);
  assert.ok(!story.moments.some((m) => m.kind === "job"));
  assert.deepEqual(story.helped, stats.helped);
  assert.deepEqual(story.felt, stats.felt);
  assert.deepEqual(story.steps, stats.steps, "steps that helped, as the card has them");
  assert.deepEqual(story.links, [{ role: "behind", otherId: C, otherName: "Critic" }]);
  assert.equal("when" in story, false, "the story carries no when");
});

test("builder: months in the person's time zone", () => {
  const r = rows({ part: { createdAt: "2026-08-01T03:00:00Z", jobHistoryJson: null } });
  assert.equal(B.buildPartStory({ ...r, timeZone: "America/Los_Angeles" }, NOW).moments[0].month, "2026-07");
  assert.equal(B.buildPartStory({ ...r, timeZone: "Asia/Tokyo" }, NOW).moments[0].month, "2026-08");
  assert.equal(B.buildPartStory({ ...r, timeZone: "Not/AZone" }, NOW).moments[0].month, "2026-08", "unknown zone: UTC");
});

test("builder: where it stands, in words; an earlier month's room beside today's", () => {
  const room = {
    parts: [roomPart(A, "Guard"), roomPart(C, null), roomPart(D, "Planner")],
    links: [
      { id: "l1", kind: "covers_for", aId: A, bId: C, bothWantId: null },
      { id: "l2", kind: "two_pulls", aId: D, bId: A, bothWantId: null },
      { id: "l3", kind: "covers_for", aId: C, bId: D, bothWantId: null },
    ],
  };
  const story = B.buildPartStory(rows({
    room,
    snapshots: [
      { takenAt: "2026-07-02T10:00:00Z", layoutJson: layout([[C]]) },
      { takenAt: "2026-08-02T10:00:00Z", layoutJson: layout([[A], [C]]) },
      { takenAt: "2026-08-20T10:00:00Z", layoutJson: layout([[A, "resting"], [C]]) },
      { takenAt: "2026-10-02T10:00:00Z", layoutJson: layout([[A], [C], [D]]) },
    ],
  }), NOW);
  assert.deepEqual(story.links, [
    { role: "front", otherId: C, otherName: null },
    { role: "pulls", otherId: D, otherName: "Planner" },
  ]);
  assert.equal(story.rooms.thenMonth, "2026-08", "the earliest month before this one that holds the part");
  assert.deepEqual(story.rooms.then.map((p) => [p.id, p.status]), [[A, "resting"], [C, "active"]], "that month's latest");
  assert.deepEqual(story.rooms.now.map((p) => p.id), [A, C, D]);
  // Only this month's snapshots: no earlier room.
  assert.equal(B.buildPartStory(rows({ snapshots: [{ takenAt: "2026-10-02T10:00:00Z", layoutJson: layout([[A]]) }] }), NOW).rooms, undefined);
});

const deps = { toolName: (id) => ({ "cool-down": "Cool Down" })[id] ?? null, monthName: (m) => ({ "2026-06": "June", "2026-07": "July", "2026-08": "August", "2026-09": "September" })[m] ?? "" };

test("words: the copy gate; every line from the shipped copy; jobs as the card names them", () => {
  const copy = S.partStoryCopy(content);
  assert.ok(copy, "the fixture carries every story line");
  const missing = { ...content, prompts: { ...content.prompts } };
  delete missing.prompts.story_met;
  assert.equal(S.partStoryCopy(missing), null);
  const statsGone = { ...content, prompts: { ...content.prompts } };
  delete statsGone.prompts.stats_felt;
  assert.equal(S.partStoryCopy(statsGone), null, "the readout's lines are part of the gate");

  const story = {
    moments: [
      { kind: "met", month: "2026-06" },
      { kind: "job", month: "2026-08", then: { jobIds: ["hide_job_out_of_sight"], ownJob: null }, now: { jobIds: [], ownJob: "Lets me ask for help" } },
      { kind: "rested", month: "2026-09" },
    ],
    helped: [{ toolId: "cool-down", n: 3 }, { toolId: "gone-tool", n: 2 }],
    felt: { month: "2026-07", then: "feel_steady", now: "feel_curious" },
    links: [{ role: "front", otherId: C, otherName: "Critic" }, { role: "pulls", otherId: D, otherName: null }],
  };
  const v = S.storyView(story, content, copy, deps, false);
  assert.deepEqual(v.lines, [
    { kind: "text", key: "met-0", text: "Met in June" },
    { kind: "job", key: "job-then-1", before: "Its job then: ", words: "Keep me out of sight", after: "", own: false },
    { kind: "job", key: "job-now-1", before: "Its job now: ", words: "Lets me ask for help", after: "", own: true },
    { kind: "text", key: "rested-2", text: "Rested in September" },
  ]);
  assert.deepEqual(v.sections, [
    { key: "felt", title: "How you've felt toward it", lines: ["In July: steady. Lately: curious."] },
    { key: "helped", title: fixture.prompts.stats_helped.copy, lines: ["Cool Down helped 3 times"] },
    { key: "where", title: "Where it stands", lines: ["Stands in front of Critic", "Pulls against another part"] },
  ]);
  assert.equal(v.rooms, null);
  assert.doesNotMatch(JSON.stringify(v), /%|score/i);
});

test("words: tender parts and flagged chips are never named; a half-known job or month is left out", () => {
  const copy = S.partStoryCopy(content);
  const job = { kind: "job", month: "2026-08", then: { jobIds: ["hide_job_out_of_sight"], ownJob: null }, now: { jobIds: ["hide_rather_need_someone"], ownJob: null } };
  const story = { moments: [{ kind: "met", month: "2026-06" }, job], helped: [], links: [] };
  assert.deepEqual(S.storyView(story, content, copy, deps, true).lines.map((l) => l.key), ["met-0"], "tender: no job");
  assert.equal(S.storyView(story, content, copy, deps, false).lines.length, 3);
  // A job chip flagged tender or danger: never named, so that half (and the pair) goes.
  const flagged = structuredClone(content);
  flagged.options.meet.job = flagged.options.meet.job.map((o) => (o.id === "hide_job_out_of_sight" ? { ...o, flag: "tender" } : o));
  assert.deepEqual(S.storyView(story, flagged, copy, deps, false).lines.map((l) => l.key), ["met-0"]);
  assert.equal(S.jobWords(flagged, { jobIds: ["hide_job_out_of_sight", "hide_job_worse"], ownJob: null }).words, "Keep me from making it worse");
  // A month the locale can't word: no line.
  assert.deepEqual(S.storyView({ moments: [{ kind: "back", month: "2031-01" }], helped: [], links: [] }, content, copy, deps, false).lines, []);
});

test("ways in: the card's *Its story* opens it in place; one figure in the den offers it and Spend time with it", () => {
  const me = read("src/components/me/PartsOfMe.tsx");
  assert.match(me, /const story = partStoryCopy\(content\);/);
  assert.match(me, /\{story && \(\s+<button type="button" aria-expanded=\{storyOpen\} onClick=\{\(\) => setStoryOpen\(\(o\) => !o\)\} className=\{quiet\}>\s+\{story\.story_open\}/);
  assert.match(me, /\{story && storyOpen && <PartStory partId=\{partId\} tender=\{part\.tender\} content=\{content\} copy=\{story\} \/>\}/);
  const den = read("src/components/parts/den/Den.tsx");
  assert.match(den, /\{!pair && sel\.first && storyCopy && names\.has\(sel\.first\) && \(\(\) => \{/);
  assert.match(den, /const spend = meetAPartLink\(id\);/);
  assert.match(den, /<Link to=\{spend\.pathname\} state=\{spend\.state\} className=\{quiet\}>\{storyCopy\.story_spend_time\}<\/Link>/);
  assert.match(den, /\{storyOf === id && <PartStory partId=\{id\} tender=\{p\.tender\} content=\{content\} copy=\{storyCopy\} \/>\}/);
  assert.match(read("src/components/parts/den/PartsDenPage.tsx"), /storyCopy=\{partStoryCopy\(content\)\}/);
  // No new route: the story opens where it was asked for.
  assert.doesNotMatch(read("src/App.tsx"), /<Route path="[^"]*\bstory/i);
  // The small rooms reuse the den's renderer, still and never interactive.
  const story = read("src/components/parts/story/PartStory.tsx");
  assert.equal((story.match(/<DenRoom small /g) ?? []).length, 2);
  assert.doesNotMatch(story, /onMove|onTap|onUnlink/);
  assert.match(read("src/components/parts/den/DenRoom.tsx"), /const interactive = !!onMove && !small;/);
});

test("the job slots are linted at the longest job chip label (own words wrap)", () => {
  const labels = [...fixture.options.meet.job, ...fixture.options.meet.rather].map((o) => o.label.length);
  assert.equal(PARTS_SLOT_WIDTH.old, Math.max(...labels));
  assert.equal(PARTS_SLOT_WIDTH.new, Math.max(...labels));
});

test("words: steps that helped sit after what's helped it settle, worded as on the card, under the same gate", () => {
  const copy = S.partStoryCopy(content);
  const story = {
    moments: [], links: [], helped: [{ toolId: "cool-down", n: 3 }],
    steps: [{ stepId: "s1", label: "Step outside", n: 1 }, { stepId: "s2", label: "Say it slowly", n: 2 }, { stepId: "s3", label: "Text a friend", n: 4 }],
  };
  const v = S.storyView(story, content, copy, deps, false);
  assert.deepEqual(v.sections.map((s) => s.key), ["helped", "steps"]);
  assert.deepEqual(v.sections[1], { key: "steps", title: null, lines: ["Steps that helped: Step outside · Say it slowly (twice) · Text a friend (4 times)"] });
  // The card reads the same readout through the same function.
  const P = read("src/lib/partStory.ts");
  assert.match(P, /steps: story\.steps\?\.length \? story\.steps : null,/);
  // A story from a server before the steps shipped: no line, nothing breaks.
  assert.deepEqual(S.storyView({ moments: [], links: [], helped: [] }, content, copy, deps, false).sections, []);
  // Its words are part of the story's gate (the readout's own STATS_REQUIRED).
  for (const id of ["stats_steps", "stats_step_twice", "stats_step_times"]) assert.ok(S.PART_STORY_REQUIRED.prompts.includes(id), id);
  assert.match(read("src/components/parts/story/PartStory.tsx"), /\{s\.title && <h5/);
});

test("what they told it (say something to it): the month's latest, a chip or their own words, tender parts too; only once its line ships", () => {
  const story = B.buildPartStory({
    ...rows({ part: { tender: true } }),
    messages: [
      { at: "2026-08-03T10:00:00Z", chipId: "say_thanks", own: null },
      { at: "2026-08-20T10:00:00Z", chipId: "say_listening", own: null },
      { at: "2026-09-02T10:00:00Z", chipId: null, own: "I see you" },
      { at: "2026-09-04T10:00:00Z", chipId: null, own: "   " },
      { at: "not a date", chipId: "say_rest", own: null },
    ],
  }, NOW);
  assert.deepEqual(story.moments.filter((m) => m.kind === "told"), [
    { kind: "told", month: "2026-08", chipId: "say_listening", own: null },
    { kind: "told", month: "2026-09", chipId: null, own: "I see you" },
  ]);
  const copy = S.partStoryCopy(content);
  const v = S.storyView(story, content, copy, deps, true);
  const told = v.lines.filter((l) => l.key.startsWith("told-"));
  assert.deepEqual(told.map((l) => [l.before, l.words, l.after, l.own]), [
    ["In August you told it: ", "I'm listening", "", false],
    ["In September you told it: ", "I see you", "", true],
  ]);
  const noLine = { ...content, prompts: { ...content.prompts } };
  delete noLine.prompts.say_story;
  assert.ok(S.partStoryCopy(noLine), "the story never waits on it");
  assert.deepEqual(S.storyView(story, noLine, copy, deps, true).lines.filter((l) => l.key.startsWith("told-")), []);
});
