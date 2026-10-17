// Me → Parts of me (docs/design/parts.md, "Parts of me (Me)", "The part card"): cards shown only with
// parts on and the card copy signed off; never a fear on a tender part, never the own-words fear; labels
// from the shipped parts content by id; links into Meet a part. The card's actions (lane 2's writers),
// set-aside rows with Bring it back, and the 30-day check-back (its own copy gate).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture } from "./lib/partsContentFixture.mjs";

const lib = await importTs("src/lib/partsOfMe.ts");
const edit = await importTs("functions/src/parts/editPlan.ts");
const read = (f) => readFileSync(f, "utf8");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const shipped = JSON.parse(read("src/data/content/parts.json")).content;
const opt = (step, i = 0) => fixture.options.meet[step][i];
const plainFear = fixture.options.meet.fear.find((o) => o.flag === null);
const tenderFear = fixture.options.meet.fear.find((o) => o.flag === "tender");
const part = (o = {}) => ({ name: null, tender: false, places: [], shapeSig: null, jobIds: [], ownJob: null, fearIds: [], preferredRoleIds: [], moveIds: [], lastVisitedAt: null, ...o });
const item = (id, o = {}, meta = {}) => ({ label: "Part", title: "A part", summary: "", editor: null, stillTrueCopy: "", setAsideCopy: "",
  meta: { id, kind: "part", area: "my_parts", status: "active", source: "made", confirmedAt: null, revisitAt: null, prompt: "none", ...meta }, part: part(o) });

// The check-back (step revisit) and the candidate list (step candidate) have their own gates; every
// other me-flow prompt is the area's.
const OWN_GATE = new Set(["revisit", "candidate"]);

test("the area's copy: every me / card prompt, all or nothing", () => {
  const inFlow = Object.entries(fixture.prompts).filter(([, p]) => p.flow === "me" && !OWN_GATE.has(p.step)).map(([id]) => id);
  assert.deepEqual([...lib.PARTS_OF_ME_PROMPTS].sort(), inFlow.sort());
  for (const id of lib.PARTS_OF_ME_PROMPTS) assert.equal(fixture.prompts[id].reviewStatus, "draft", `${id}: signed off? update this pin`);
  const ready = { ...shipped, prompts: Object.fromEntries(lib.PARTS_OF_ME_PROMPTS.map((id) => [id, fixture.prompts[id]])) };
  assert.equal(lib.partsOfMeCopy(ready).card_visit, fixture.prompts.card_visit.copy);
  const missing = { ...ready, prompts: { ...ready.prompts } };
  delete missing.prompts.card_resting;
  assert.equal(lib.partsOfMeCopy(missing), null);
  assert.equal(lib.partsOfMeCopy(null), null);
  assert.equal(lib.partsOfMeCopy(shipped) === null, !lib.PARTS_OF_ME_PROMPTS.every((id) => shipped.prompts[id]), "the shipped file decides");
});

test("Me's gate: parts off or copy missing → exactly as before", () => {
  const me = read("src/components/me/MeSection.tsx");
  assert.match(me, /const partsCopy = partsOn \? partsOfMeCopy\(partsContent\) : null;/);
  assert.match(me, /const shown: ProfileAreaId\[\] = partsCopy \? \[\.\.\.PHASE_A_AREAS, 'my_parts'\] : PHASE_A_AREAS;/);
  assert.match(me, /const partsOn = profile\.partsEnabled === true;/);
  assert.match(me, /if \(!partsOn\) return;/, "the content isn't even fetched with parts off");
  assert.match(me, /i\.label !== 'Part'/, "a part never lands in the generic still-true list");
  assert.match(me, /<PartsOfMe items=\{a\.items\} [^>]*copy=\{partsCopy\}\s+onWrite=\{partWrite\} /,
    "set-aside parts: the area's own rows (restorePart), not the generic restoreProfileItem row");
  assert.match(me, /const partWrite = \(p: Promise<\{ version: number \}>\) => after\(p\.then\(\(r\) => r\.version\)\);/,
    "a part write refreshes Me the way every other Me write does");
  assert.doesNotMatch(me, /renderSetAside|setAsidePart/);
});

test("card rows: labels by id, own-words job wins, no fear on a tender part or from a tender / danger chip", () => {
  const p = part({ places: ["chest", "throat", "nowhere_known"], jobIds: [opt("job").id, "not_signed_off"], fearIds: [plainFear.id, tenderFear.id],
    preferredRoleIds: [opt("rather", 1).id] });
  assert.deepEqual(lib.partCardRows(p, fixture), {
    where: ["Chest", "Throat"], job: { labels: [opt("job").label] }, fears: [plainFear.label], rather: [opt("rather", 1).label],
  });
  assert.deepEqual(lib.partCardRows({ ...p, ownJob: "  keep me safe " }, fixture).job, { own: "keep me safe" });
  assert.deepEqual(lib.partCardRows({ ...p, tender: true }, fixture).fears, [], "tender: no fear row");
  assert.equal(lib.partCardRows(part(), fixture).job, null);
});

test("the own-words fear never reaches the app, the card, or getMe's projection", () => {
  for (const f of ["src/components/me/PartsOfMe.tsx", "src/lib/partsOfMe.ts"]) assert.doesNotMatch(read(f), /ownFear/, f);
  const svc = read("src/services/profile.ts");
  assert.doesNotMatch(svc.slice(svc.indexOf("export interface MePart"), svc.indexOf("}", svc.indexOf("export interface MePart"))), /ownFear/);
  assert.doesNotMatch(read("functions/src/profile/me.ts"), /\.ownFear\b|ownFear:/);
});

test("order: most recently visited first, then newest kept, then id", () => {
  const items = [
    item("a", {}, { confirmedAt: "2026-09-01T00:00:00Z" }),
    item("b", { lastVisitedAt: "2026-10-01T00:00:00Z" }),
    item("c", { lastVisitedAt: "2026-10-05T00:00:00Z" }),
    item("d", {}, { confirmedAt: "2026-09-05T00:00:00Z" }),
  ];
  assert.deepEqual(lib.sortPartItems(items).map((i) => i.meta.id), ["c", "b", "d", "a"]);
});

test("links into Meet a part carry the trailhead and, for a card, the part", async () => {
  assert.deepEqual(lib.meetAPartLink(), { pathname: "/tool/meet-a-part", state: { parts: { trailheadKind: "me" } } });
  assert.deepEqual(lib.meetAPartLink("p1"), { pathname: "/tool/meet-a-part", state: { parts: { trailheadKind: "me", partId: "p1" } } });
  // Meet a part reads exactly this shape.
  const { parseMeetEntry } = await importTs("src/lib/meetAPartSave.ts");
  const id = "3f2c9a0e-1b2c-4d5e-8f90-123456789abc";
  const entry = parseMeetEntry(lib.meetAPartLink(id).state);
  assert.deepEqual([entry.trailheadKind, entry.partId], ["me", id]);
  assert.equal(parseMeetEntry(lib.meetAPartLink().state).partId, null);
});

test("the cards: headed list items, the figure, no hard-coded copy (unnamed falls back to the kind's label)", () => {
  const c = read("src/components/me/PartsOfMe.tsx");
  assert.match(c, /<li className=/);
  assert.match(c, /<h4 [\s\S]*?\{part\.name \?\? item\.title\}/);
  assert.match(c, /<PartFigure shapeSig=\{part\.shapeSig\}/);
  assert.match(c, /const partId = item\.meta\.id;/);
  assert.match(c, /meetAPartLink\(partId\)/);
  assert.match(c, /const resting = item\.meta\.status === 'resting';/);
  assert.match(c, /\{resting && [\s\S]*?\{copy\.card_resting\}/);
  const text = [...c.matchAll(/>\s*([^<>{}]*[A-Za-z][^<>{}]*?)\s*<\//g)].map((m) => m[1]);
  assert.deepEqual(text, [], `hard-coded copy: ${text.join(" | ")}`);
});

// ---- The card's actions ----

const ID = "3f2c9a0e-1b2c-4d5e-8f90-123456789abc";
const RID = "5a2c9a0e-1b2c-4d5e-8f90-123456789abc";
const copy = Object.fromEntries(lib.PARTS_OF_ME_PROMPTS.map((id) => [id, fixture.prompts[id].copy]));
// Everything approved: the shipped file's shape, built from the fixture (as Meet a part's tests do).
const ALL = partsFromFixture(fixture, () => true);
const shape = (a) => ({ id: a.id, label: a.label, fn: a.call?.fn ?? null, req: a.call?.req ?? null });

test("the row: Rename, Rest it, Set aside, It feels young or hurt, with lane 2's payloads", () => {
  assert.deepEqual(lib.partActions(item(ID), copy).map(shape), [
    { id: "rename", label: "Rename", fn: null, req: null },
    { id: "rest", label: "Rest it", fn: "restPart", req: { partId: ID, resting: true } },
    { id: "set_aside", label: "Set aside", fn: "setAsidePart", req: { partId: ID } },
    { id: "tender", label: "It feels young or hurt", fn: "setPartTender", req: { partId: ID } },
  ]);
  // Every payload is what lane 2's validators accept.
  for (const a of lib.partActions(item(ID), copy).filter((x) => x.call)) {
    if (a.call.fn === "restPart") assert.deepEqual(edit.validateRest(a.call.req), a.call.req);
    else assert.deepEqual(edit.validatePartRef(a.call.req), a.call.req);
  }
});

test("the row's variations: resting shows It's back, tender drops its action, set aside has no card", () => {
  const resting = lib.partActions(item(ID, {}, { status: "resting" }), copy);
  assert.deepEqual(resting.map((a) => a.id), ["rename", "back", "set_aside", "tender"]);
  assert.deepEqual(shape(resting[1]), { id: "back", label: "It's back", fn: "restPart", req: { partId: ID, resting: false } });
  assert.deepEqual(lib.partActions(item(ID, { tender: true }), copy).map((a) => a.id), ["rename", "rest", "set_aside"], "no unmark");
  assert.deepEqual(lib.partActions(item(ID, {}, { status: "set_aside" }), copy), []);
  assert.deepEqual(lib.restoreCall(ID), { fn: "restorePart", req: { partId: ID } });
  assert.deepEqual(edit.validatePartRef(lib.restoreCall(ID).req), { partId: ID });
});

test("rename: the person's words trimmed, 40 at most, an empty save clears the name", () => {
  assert.equal(lib.PART_NAME_MAX, 40);
  assert.match(read("functions/src/parts/keepPlan.ts"), new RegExp(`DEFAULT_NAME_MAX = ${lib.PART_NAME_MAX};`), "the server's limit");
  assert.deepEqual(lib.renameCall(ID, "  Ash  "), { fn: "renamePart", req: { partId: ID, name: "Ash" } });
  assert.deepEqual(lib.renameCall(ID, "   ").req, { partId: ID, name: null });
  assert.deepEqual(lib.renameCall(ID, "").req.name, null);
  assert.equal(lib.renameCall(ID, "x".repeat(50)).req.name.length, 40);
  assert.equal(lib.renameCall(ID, "should just my but").req.name, "should just my but", "never linted");
  assert.deepEqual(edit.validateRename(lib.renameCall(ID, "Ash").req), { partId: ID, name: "Ash" });
  const c = read("src/components/me/PartsOfMe.tsx");
  assert.match(c, /<input type="text" value=\{draft\} maxLength=\{PART_NAME_MAX\}/);
  assert.match(c, /font-serif text-xl/);
  assert.match(c, /run\(renameCall\(partId, draft\), \(\) => setRenaming\(false\)\)/);
  assert.match(c, /setDraft\(part\.name \?\? ''\)/, "starts from the current name");
});

test("the card sends exactly the call it built, one at a time, disabled while saving, silent on failure", () => {
  const c = read("src/components/me/PartsOfMe.tsx");
  for (const fn of ["renamePart", "restPart", "setAsidePart", "restorePart", "setPartTender", "answerPartRevisit"]) {
    assert.match(c, new RegExp(`case '${fn}': return ${fn}\\(c\\.req\\);`), fn);
  }
  assert.match(c, /partActions\(item, copy\)/);
  assert.match(c, /run\(restoreCall\(item\.meta\.id\)\)/);
  assert.match(c, /if \(busy\) return;/);
  assert.match(c, /try \{ await onWrite\(send\(c\)\); done\?\.\(\); \} catch \{/);
  assert.doesNotMatch(c, /window\.confirm|confirm\(/, "set aside needs no confirm");
});

// ---- The 30-day check-back ----

test("the check-back's copy: its own drafts, and its own gate", () => {
  const inStep = Object.entries(fixture.prompts).filter(([, p]) => p.flow === "me" && p.step === "revisit").map(([id]) => id);
  assert.deepEqual([...lib.PART_REVISIT_PROMPTS].sort(), inStep.sort());
  assert.deepEqual([...lib.PART_REVISIT_OPTIONS].sort(), fixture.options.me.revisit.map((o) => o.id).sort());
  for (const id of lib.PART_REVISIT_PROMPTS) assert.equal(fixture.prompts[id].reviewStatus, "draft", id);
  for (const o of fixture.options.me.revisit) assert.equal(o.reviewStatus, "draft", o.id);
  assert.equal(lib.partRevisitCopy(shipped), null, "nothing signed off: no card asks");
  assert.equal(lib.partRevisitCopy(null), null);
  const r = lib.partRevisitCopy(ALL);
  assert.deepEqual(r.active.map((c) => [c.answer, c.label]), [["same", "Yes"], ["less", "Less than before"], ["new", "It's doing something new"], ["resting", "It's resting"]]);
  assert.deepEqual(r.resting.map((c) => [c.answer, c.label]), [["still_quiet", "Still quiet"], ["back", "It's back"]]);
  // Each set is what the server takes from a part in that state.
  for (const c of r.active) assert.notEqual(edit.revisitTransition("active", c.answer), null, c.answer);
  for (const c of r.resting) assert.notEqual(edit.revisitTransition("resting", c.answer), null, c.answer);
  for (const id of [...lib.PART_REVISIT_PROMPTS, ...lib.PART_REVISIT_OPTIONS]) {
    const without = { ...ALL, prompts: { ...ALL.prompts }, options: { ...ALL.options, me: { ...ALL.options.me, revisit: ALL.options.me.revisit.filter((o) => o.id !== id) } } };
    delete without.prompts[id];
    assert.equal(lib.partRevisitCopy(without), null, `without ${id}`);
  }
});

test("when a card asks: past its revisit date, active or resting; never set aside", () => {
  assert.equal(lib.partAsksBack(item(ID, {}, { prompt: "ask" })), true);
  assert.equal(lib.partAsksBack(item(ID, {}, { prompt: "ask", status: "resting" })), true);
  assert.equal(lib.partAsksBack(item(ID, {}, { prompt: "ask", status: "set_aside" })), false);
  assert.equal(lib.partAsksBack(item(ID, {}, { prompt: "quiet" })), false);
  assert.equal(lib.partAsksBack({ ...item(ID, {}, { prompt: "ask" }), part: undefined }), false);
  const c = read("src/components/me/PartsOfMe.tsx");
  assert.match(c, /\{revisit && partAsksBack\(item\) && !answered && \(/, "gated, and folds away once answered");
  assert.match(c, /const revisit = partRevisitCopy\(content\);/);
});

test("the question: {name} filled with the person's name, else the unnamed lines", () => {
  const r = lib.partRevisitCopy(ALL);
  assert.equal(lib.revisitQuestion(r, part({ name: "Ash" }), false), "Is Ash still doing the same job?");
  assert.equal(lib.revisitQuestion(r, part({ name: "Ash" }), true), "Ash has been resting. Still quiet?");
  assert.equal(lib.revisitQuestion(r, part(), false), "Is this part still doing the same job?");
  assert.equal(lib.revisitQuestion(r, part({ name: "  " }), true), "This part has been resting. Still quiet?");
  assert.equal(lib.revisitQuestion(r, part({ name: "$& {name}" }), false), "Is $& {name} still doing the same job?", "typed words go in as typed");
});

test("It's doing something new: the would-rather chips, non-answers out, the part's moves first, 1 to 3", () => {
  const all = lib.revisitRatherOptions(ALL, part());
  assert.ok(all.length > 3);
  assert.ok(all.every((o) => !lib.NON_ANSWER.test(o.id) && o.flag === null));
  assert.ok(!all.some((o) => o.id === "rather_not_sure"));
  const hide = lib.revisitRatherOptions(ALL, part({ moveIds: ["hide"] }));
  assert.ok(hide.length > 0 && hide.every((o) => o.moves.length === 0 || o.moves.includes("hide")));
  assert.ok(hide[0].moves.includes("hide"), "its own move's chips first");
  const lone = lib.revisitRatherOptions(ALL, part({ moveIds: ["not_a_move"] }));
  assert.deepEqual(lone.map((o) => o.id), all.map((o) => o.id), "no chip for its moves: all of them");
  const r = lib.partRevisitCopy(ALL);
  assert.deepEqual(lib.revisitChoices(r, ALL, part(), false).map((c) => c.answer), ["same", "less", "new", "resting"]);
  assert.deepEqual(lib.revisitChoices(r, ALL, part(), true).map((c) => c.answer), ["still_quiet", "back"]);
  const noChips = { ...ALL, options: { ...ALL.options, meet: { ...ALL.options.meet, rather: ALL.options.meet.rather.filter((o) => o.id === "rather_not_sure") } } };
  assert.deepEqual(lib.revisitChoices(r, noChips, part(), false).map((c) => c.answer), ["same", "less", "resting"], "no dead end");
  // The client's non-answer rule is the server's.
  const server = read("functions/src/parts/keepPlan.ts").match(/export const NON_ANSWER = (\/.*\/);/)[1];
  assert.equal(String(lib.NON_ANSWER), server);

  let picked = [];
  for (const o of all.slice(0, 5)) picked = lib.toggleRather(picked, o.id);
  assert.deepEqual(picked, all.slice(0, 3).map((o) => o.id), "never past three");
  assert.deepEqual(lib.toggleRather(picked, all[0].id), all.slice(1, 3).map((o) => o.id));

  assert.equal(lib.revisitCall(RID, ID, "new", []), null, "Save needs a pick");
  assert.equal(lib.revisitCall(RID, ID, "new", all.slice(0, 4).map((o) => o.id)), null);
  assert.equal(lib.revisitCall(RID, ID, "new", ["rather_not_sure"]), null);
  const call = lib.revisitCall(RID, ID, "new", [all[0].id, all[0].id, "rather_not_sure", all[1].id]);
  assert.deepEqual(call, { fn: "answerPartRevisit", req: { id: RID, partId: ID, answer: "new", ratherIds: [all[0].id, all[1].id] } });
  assert.deepEqual(edit.validateRevisit(call.req), call.req);
  for (const a of ["same", "less", "resting", "still_quiet", "back"]) {
    const c = lib.revisitCall(RID, ID, a, [all[0].id]);
    assert.deepEqual(c.req, { id: RID, partId: ID, answer: a }, "chips only with new");
    assert.deepEqual(edit.validateRevisit(c.req), { ...c.req, ratherIds: [] });
  }
  const c = read("src/components/me/PartsOfMe.tsx");
  assert.match(c, /revisitCall\(newId\(\), partId, a, ratherIds\)/, "a fresh uuid per answer");
  assert.match(c, /c\.answer === 'new' \? setPicking\(true\) : answer\(c\.answer\)/);
  assert.match(c, /disabled=\{busy \|\| \(!on && picked\.length >= RATHER_IDS_MAX\)\}/);
  assert.match(c, /disabled=\{busy \|\| picked\.length === 0\}/);
});

// ---- To come back to (open PartCandidates) ----

const CID = "6b2c9a0e-1b2c-4d5e-8f90-123456789abc";
const cand = (o = {}) => ({ id: CID, origin: "new_one", moveIds: ["hide"], createdAt: "2026-10-01T00:00:00Z", ...o });

test("the list's copy: its own drafts and gate; the move's phrase fills the line", () => {
  const inStep = Object.entries(fixture.prompts).filter(([, p]) => p.flow === "me" && p.step === "candidate").map(([id]) => id);
  assert.deepEqual([...lib.PART_CANDIDATE_PROMPTS].sort(), inStep.sort());
  for (const id of lib.PART_CANDIDATE_PROMPTS) assert.equal(fixture.prompts[id].reviewStatus, "draft", id);
  assert.equal(lib.partCandidateCopy(shipped), null, "nothing signed off: no list");
  assert.equal(lib.partCandidateCopy(null), null);
  for (const id of lib.PART_CANDIDATE_PROMPTS) {
    const without = { ...ALL, prompts: { ...ALL.prompts } };
    delete without.prompts[id];
    assert.equal(lib.partCandidateCopy(without), null, `without ${id}`);
  }
  const c = lib.partCandidateCopy(ALL);
  const hide = ALL.moves.find((m) => m.id === "hide");
  assert.equal(lib.candidateLine(c, ALL, cand()), `The one that ${hide.unblendPhrase}`);
  assert.equal(lib.candidateLine(c, ALL, cand({ moveIds: [] })), "One you wanted to come back to");
  assert.equal(lib.candidateLine(c, ALL, cand({ moveIds: ["not_shipped"] })), "One you wanted to come back to", "the move doesn't ship");
  assert.equal(lib.candidateLine(c, ALL, cand({ moveIds: ["not_shipped", "hide"] })), `The one that ${hide.unblendPhrase}`, "the first that ships");
  assert.equal(lib.candidateLine(c, { ...ALL, moves: [] }, cand()), "One you wanted to come back to");
});

test("Get to know it: Meet a part on the candidate trailhead, with the move the line names", async () => {
  const { parseMeetEntry } = await importTs("src/lib/meetAPartSave.ts");
  const link = lib.candidateMeetLink(ALL, cand());
  assert.deepEqual(link, { pathname: "/tool/meet-a-part", state: { parts: { trailheadKind: "candidate", candidateId: CID, moveId: "hide" } } });
  assert.deepEqual(parseMeetEntry(link.state), { trailheadKind: "candidate", partId: null, candidateId: CID, moveId: "hide" });
  const plain = lib.candidateMeetLink(ALL, cand({ moveIds: [] }));
  assert.deepEqual(plain.state, { parts: { trailheadKind: "candidate", candidateId: CID } });
  assert.deepEqual(parseMeetEntry(plain.state), { trailheadKind: "candidate", partId: null, candidateId: CID, moveId: null });
  assert.deepEqual(lib.dismissCandidateRequest(CID), { candidateId: CID, answer: "dismiss" });
  const { validateCandidateAnswer } = await importTs("functions/src/parts/candidateAnswer.ts");
  assert.deepEqual(validateCandidateAnswer(lib.dismissCandidateRequest(CID)), { candidateId: CID, answer: "dismiss" });
});

test("the rows: after the cards, only with the list's copy, a neutral figure, Not any more via answerPartCandidate", () => {
  const c = read("src/components/me/PartsOfMe.tsx");
  assert.match(c, /const candidateCopy = partCandidateCopy\(content\);/);
  assert.match(c, /\{candidateCopy && candidates\.length > 0 && \(/);
  assert.ok(c.indexOf("<SetAsideRow") < c.indexOf("<CandidateRow"), "after the cards and set-aside rows");
  assert.match(c, /<PartFigure shapeSig=\{null\} size=\{40\} \/>/);
  assert.match(c, /candidateMeetLink\(content, candidate\)/);
  assert.match(c, /await onDismiss\(candidate\.id\)/);
  const me = read("src/components/me/MeSection.tsx");
  assert.match(me, /candidates=\{me\.partCandidates \?\? \[\]\}/);
  assert.match(me, /await answerPartCandidate\(dismissCandidateRequest\(id\)\);\s*setReload\(\(r\) => r \+ 1\);/);
  // The area itself is unchanged: still only with parts on and its copy signed off (no parts → the link plus candidates).
  assert.match(me, /\{a\.id === 'my_parts' && partsCopy && partsContent && \(/);
});

// ---- The readout (lane 4's stats, Reflect's lines) ----

test("the readout: Reflect's own gate helper, shared, not a second one", async () => {
  const S = await importTs("src/lib/partStats.ts");
  const src = read("src/lib/partStats.ts");
  assert.match(src, /export const STATS_REQUIRED: SurfaceIds = \{ prompts: STATS_PROMPTS, options: Object\.values\(WHEN_OPTIONS\) \};/);
  assert.match(src, /export const statsReady = \(content: PartsContent\): boolean => surfaceReady\(content, STATS_REQUIRED\);/);
  assert.match(src, /statsReady\(content\) && surfaceReady\(content, REFLECT_REQUIRED\)/, "Reflect builds on it");
  assert.equal(S.statsReady(shipped), false, "nothing signed off: no readout");
  assert.equal(S.statsReady(ALL), true);
  const noWhen = partsFromFixture(fixture, (id) => id !== "when_nights");
  assert.equal(S.statsReady(noWhen), false, "a missing when option hides it all");
  const c = read("src/components/me/PartsOfMe.tsx");
  assert.match(c, /const showStats = statsReady\(content\);/);
  assert.doesNotMatch(c, /flowReady\(|surfaceReady\(/, "no gate of its own");
});

test("the card's readout: Mostly {when} under the name, then what's helped and how you've felt, tender parts too", async () => {
  const c = read("src/components/me/PartsOfMe.tsx");
  assert.match(c, /const stats: PartStatLines \| null = showStats && part\.stats \? partStatLines\(part\.stats, content, statDeps\) : null;/,
    "only when computed and signed off; tender is no exception");
  const name = c.indexOf("{part.name ?? item.title}");
  const when = c.indexOf("{stats?.when && ");
  const rather = c.indexOf("row(copy.card_rather");
  const helped = c.indexOf("{stats?.helped && row(stats.helped.title");
  const felt = c.indexOf("{stats?.felt && row(stats.felt.title, stats.felt.line)}");
  assert.ok(name > 0 && name < when && when < rather && rather < helped && helped < felt, "in that order");
  assert.match(c, /toolName: \(id: string\) => getToolById\(id\)\?\.name \?\? null, monthName: \(m: string\) => monthName\(m\)/);
  assert.doesNotMatch(c, /stats\.\w+\.n\b|\.length\}/, "no numbers but the counts the copy carries");
  // The lines themselves are Reflect's (src/lib/partStats.ts) over the shipped copy.
  const S = await importTs("src/lib/partStats.ts");
  const feel = ALL.options.meet.feel;
  const lines = S.partStatLines({ helped: [{ toolId: "pause", n: 3 }, { toolId: "nope", n: 2 }], felt: { month: "2026-07", then: feel[0].id, now: feel[1].id }, when: "evenings" },
    ALL, { toolName: (id) => (id === "pause" ? "Pause" : null), monthName: () => "July" });
  assert.equal(lines.when, "Mostly evenings");
  assert.deepEqual(lines.helped, { title: "What's helped it settle", lines: ["Pause helped 3 times"] }, "an unknown tool is left out");
  assert.equal(lines.felt.title, "How you've felt toward it");
  assert.equal(lines.felt.line, `In July: ${feel[0].label}. Lately: ${feel[1].label}.`);
});

test("the card's layout: every row stacked (small muted label over a body-style value), own words in the serif at body size, one rhythm", () => {
  const c = read("src/components/me/PartsOfMe.tsx");
  const card = c.slice(c.indexOf("function PartCard("), c.indexOf("function CheckBack("));
  assert.match(card, /const row = \(label: string, value: ReactNode\) => \(\s*<div>\s*<dt className="text-xs text-\[var\(--color-text-tertiary\)\]">\{label\}<\/dt>\s*<dd className="text-sm text-\[var\(--color-text-primary\)\] break-words">\{value\}<\/dd>\s*<\/div>/,
    "label above, value below; no inline label/value rows");
  assert.doesNotMatch(card, /flex flex-wrap gap-x-2">\s*<dt/, "no inline row left");
  assert.match(card, /<dl className="mt-2 space-y-2">/, "one spacing token between rows");
  assert.match(card, /row\(copy\.card_job_own, <span className="font-serif text-base leading-snug">\{rows\.job\.own\}<\/span>\)/, "the person's words: serif, body size");
  assert.match(card, /row\(copy\.card_job, rows\.job\.labels\.join\(', '\)\)/, "chip-picked values stay in the sans");
  for (const r of ["copy.card_where", "copy.card_fear", "copy.card_rather", "stats.helped.title", "stats.felt.title"]) assert.ok(card.includes(`row(${r}`), r);
  const name = card.indexOf("{part.name ?? item.title}");
  const when = card.indexOf("{stats?.when && <p className=\"text-sm text-[var(--color-text-tertiary)]\">{stats.when}</p>}");
  const dl = card.indexOf("<dl ");
  assert.ok(name > 0 && name < when && when < dl, "Mostly {when}: a quiet line directly under the name");
});
