// People (IE-03 minimal) and the safety question (D4), docs/design/people.md: the `person` profile kind, the people
// slice, the picker's steps (src/lib/people.ts), the one safety seam (functions/src/safety/personSafety.ts mirrored
// in src/lib/personSafety.ts), DEAR MAN's prep opening with the picker, and the server refusing a plan for someone
// on the safety route.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");
const after = (src) => src.slice(src.indexOf("*/") + 2);
const server = await importTs("functions/src/safety/personSafety.ts");
const client = await importTs("src/lib/personSafety.ts");
const people = await importTs("src/lib/people.ts");
const { PERSON_ROLES } = await importTs("src/data/people.ts");
const kinds = await importTs("functions/src/profile/kinds.ts");

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-11T12:00:00Z");
const kept = (o = {}) => ({
  id: "6f1c0d3a-1111-4222-8333-444455556666", label: "Sam", role: "parent", safe: "yes", risk: "none",
  safeAskedAt: new Date(NOW - 10 * DAY).toISOString(), meta: {}, ...o,
});

test("the safety seam: server and client say the same thing", () => {
  assert.equal(after(read("functions/src/safety/personSafety.ts")), after(read("src/lib/personSafety.ts")));
  assert.equal(server.PEOPLE_SAFE_REASK_DAYS, 90);
});

test("routes: harm and rather-not-say are the safety route; goes badly is a heads-up; never answered is ok only for the server", () => {
  for (const m of [server, client]) {
    assert.equal(m.personRoute("harm"), "safety");
    assert.equal(m.personRoute("unstated"), "safety");
    assert.equal(m.personRoute("invalidating"), "heads_up");
    assert.equal(m.personRoute("none"), "ok");
    assert.equal(m.personRoute(null), "ok");
    assert.equal(m.storedRisk(JSON.stringify({ risk: "harm" })), "harm");
    assert.equal(m.storedRisk("not json"), null);
    assert.equal(m.storedRisk(JSON.stringify({ risk: "bogus" })), null);
  }
});

test("the question is asked when never answered, after 90 days, or when the date can't be read", () => {
  const { needsSafetyAsk } = client;
  assert.equal(needsSafetyAsk({ safe: null, safeAskedAt: null }, NOW), true);
  assert.equal(needsSafetyAsk({ safe: "yes", safeAskedAt: null }, NOW), true);
  assert.equal(needsSafetyAsk({ safe: "yes", safeAskedAt: "garbage" }, NOW), true);
  assert.equal(needsSafetyAsk({ safe: "yes", safeAskedAt: new Date(NOW - 89 * DAY).toISOString() }, NOW), false);
  assert.equal(needsSafetyAsk({ safe: "no", safeAskedAt: new Date(NOW - 91 * DAY).toISOString() }, NOW), true);
});

test("picker steps: list when anyone is kept; a fresh answer goes straight on; Things changed, stale or no risk asks again", () => {
  assert.equal(people.pickerStart(null), "new");
  assert.equal(people.pickerStart([]), "new");
  assert.equal(people.pickerStart([kept()]), "list");
  assert.equal(people.afterPick(kept(), { reask: false, now: NOW }), "done");
  assert.equal(people.afterPick(kept(), { reask: true, now: NOW }), "safe");
  assert.equal(people.afterPick(kept({ safeAskedAt: new Date(NOW - 100 * DAY).toISOString() }), { reask: false, now: NOW }), "safe");
  assert.equal(people.afterPick(kept({ risk: null }), { reask: false, now: NOW }), "safe");
  assert.equal(people.afterSafe("yes"), "done");
  assert.equal(people.afterSafe("no"), "risk");
  assert.equal(people.afterSafe("unsure"), "risk");
});

test("a kept person with a fresh harm answer is the safety route again, without being asked", () => {
  const p = people.pickedKept(kept({ safe: "no", risk: "harm" }));
  assert.equal(p.route, "safety");
  assert.equal(p.personId, kept().id);
});

test("an answer given this visit replaces the mounted list's: no stale safe answer after Things changed", () => {
  const iso = new Date(NOW).toISOString();
  const k = kept();
  const harm = { personId: k.id, label: k.label, role: k.role, safe: "no", risk: "harm", route: "safety" };
  const [after] = people.withAnswer([k], harm, iso);
  assert.equal(after.risk, "harm");
  assert.equal(after.safeAskedAt, iso);
  assert.equal(people.pickedKept(after).route, "safety", "picked again: the safety route, not the old yes");
  // A fresh answer picked unchanged keeps its date; a newly kept person goes first; nothing kept, nothing changes.
  assert.equal(people.withAnswer([k], people.pickedKept(k), iso)[0].safeAskedAt, k.safeAskedAt);
  const fresh = people.withAnswer([k], { personId: "new-id", label: "Jo", role: "boss", safe: "yes", risk: "none", route: "ok" }, iso);
  assert.deepEqual(fresh.map((x) => x.id), ["new-id", k.id]);
  assert.deepEqual(people.withAnswer([k], { ...harm, personId: null }, iso), [k]);
  assert.match(read("src/pages/tools/DearMan.tsx"), /people=\{answeredPeople \?\? copeProfile\.slices\?\.people \?\? null\}/);
});

test("what gets kept: only someone named, only signed in; the screen's keep line names them first", () => {
  const d = { personId: null, label: "  Sam ", role: "parent" };
  const iso = "2026-11-11T12:00:00.000Z";
  assert.deepEqual(people.personWrite(d, "no", "invalidating", { signedIn: true, nowIso: iso }),
    { op: "keep", value: { label: "Sam", role: "parent", safe: "no", risk: "invalidating", safeAskedAt: iso } });
  assert.equal(people.personWrite({ ...d, label: "   " }, "yes", "none", { signedIn: true, nowIso: iso }), null);
  assert.equal(people.personWrite(d, "yes", "none", { signedIn: false, nowIso: iso }), null);
  assert.equal(people.personWrite({ ...d, personId: kept().id }, "yes", "none", { signedIn: true, nowIso: iso }).op, "edit");
  assert.equal(people.fillWho("Is it safe to bring hard things up with {who}?", " Sam "), "Is it safe to bring hard things up with Sam?");
  assert.equal(people.fillWho("with {who}", ""), "with them");
});

test("the person kind: label own words (encrypted), roles shared with the picker, answers checked", () => {
  const def = kinds.PROFILE_KINDS.person;
  assert.equal(def.label, "Person");
  assert.equal(def.rel, "HAS_PERSON");
  assert.equal(def.slice, "people");
  assert.deepEqual([...def.ownFields], ["label"]);
  assert.deepEqual(PERSON_ROLES.map((r) => r.id), [...kinds.PERSON_ROLES]);
  const ok = { label: "Sam", role: "parent", safe: "no", risk: "harm", safeAskedAt: "2026-11-11T12:00:00.000Z" };
  assert.deepEqual(kinds.checkValue(def, ok), ok);
  assert.deepEqual(kinds.checkValue(def, { label: "Sam", role: "friend" }), { label: "Sam", role: "friend" });
  const bad = [
    { role: "friend" },
    { label: "  ", role: "friend" },
    { label: "x".repeat(41), role: "friend" },
    { label: "Sam", role: "landlord" },
    { label: "Sam", role: "friend", safe: "yes", risk: "harm", safeAskedAt: "2026-11-11" },
    { label: "Sam", role: "friend", safe: "no" },
    { label: "Sam", role: "friend", note: "x" },
  ];
  for (const v of bad) assert.throws(() => kinds.checkValue(def, v), JSON.stringify(v));
  // DEAR MAN's older relationship ids are all roles, so a plan's relationshipType is still the role.
  for (const r of ["partner", "boss", "friend", "parent", "roommate", "coworker", "other"]) assert.ok(kinds.PERSON_ROLES.includes(r), r);
});

test("Person is registered (profile layer, export, constraint), and DEAR MAN reads the people slice", () => {
  assert.match(read("functions/src/userdata/layers.ts"), /Person: \{ layer: 'profile', rel: 'HAS_PERSON', exportAs: 'people' \}/);
  assert.match(read("schema/constraints.cypher"), /CREATE CONSTRAINT person_key IF NOT EXISTS FOR \(n:Person\) REQUIRE n\.key IS UNIQUE;/);
  assert.match(read("functions/src/profile/types.ts"), /'dear-man': \[[^\]]*'people'\]/);
  assert.match(read("schema/profile-layer.cypher"), /ProfileKind \{id: "person"\}/);
});

test("the people slice: active people only, never the log; labels decrypted; an unreadable label is left out", async () => {
  const slices = read("functions/src/profile/slices.ts");
  const q = /people: `([^`]*)`/.exec(slices)[1];
  assert.match(q, /\[:HAS_PERSON\]->\(p:Person \{status: 'active'\}\)/);
  assert.doesNotMatch(q, /LogRecord|DearManSession|Interaction/);
  const { personValue } = await importTs("functions/src/profile/slices.ts");
  const dec = (v) => (v === "enc:v1:sam" ? "Sam" : v === "enc:v1:bad" ? null : v);
  assert.deepEqual(personValue(JSON.stringify({ label: "enc:v1:sam", role: "ex", safe: "no", risk: "harm", safeAskedAt: "2026-11-01" }), dec),
    { label: "Sam", role: "ex", safe: "no", risk: "harm", safeAskedAt: "2026-11-01" });
  assert.equal(personValue(JSON.stringify({ label: "enc:v1:bad", role: "ex" }), dec), null);
  assert.deepEqual(personValue(JSON.stringify({ label: "Ana", role: "boss", safe: "maybe" }), dec),
    { label: "Ana", role: "boss", safe: null, risk: null, safeAskedAt: null });
});

test("saveDearManSession refuses a prep for someone on the safety route, and links only the caller's own person", () => {
  const src = read("functions/src/dearMan/index.ts");
  assert.match(src, /personRoute\(storedRisk\(p\.records\[0\]\.get\('v'\)\)\) === 'safety'/);
  assert.match(src, /throw new HttpsError\('failed-precondition', 'Not a plan for this person'\)/);
  assert.match(src, /MATCH \(:User \{id: \$userId\}\)-\[:HAS_PERSON\]->\(p:Person \{key: \$personKey\}\)/);
  assert.match(src, /OPTIONAL MATCH \(u\)-\[:HAS_PERSON\]->\(p:Person \{key: \$personKey\}\)/);
  assert.match(src, /MERGE \(s\)-\[:WITH_PERSON\]->\(x\)/);
  assert.match(src, /if \(error instanceof HttpsError\) throw error;/);
});

test("DEAR MAN's prep opens with the picker; the safety route has the other-person resources and Ending, no plan", () => {
  const dm = read("src/pages/tools/DearMan.tsx");
  assert.match(dm, /<PersonPicker key=\{pickerKey\}/);
  assert.match(dm, /if \(p\.route === 'safety'\) setPhase\('person-safety'\)/);
  assert.match(dm, /<PersonSafetyRoute copy=\{routeCopy\}/);
  assert.match(dm, /personId: person\?\.personId \?\? null/);
  const route = read("src/components/people/PersonSafetyRoute.tsx");
  assert.match(route, /<CrisisBanner variant="other_person" \/>/);
  assert.match(route, /<QuickExit \/>/, "the other person may be close by");
  assert.match(route, /\/tool\/ending-relationships\?frame=careful/);
  assert.doesNotMatch(route, /fast|cope-ahead|dear-man/, "nothing that composes words to them");
});

test("D4 copy ships in DearManSafetyCopy, in the voice (no exclamation, should, just or but)", () => {
  const cypher = read("schema/dear-man-safety-gates.cypher");
  const copy = people.PERSON_PICKER_COPY.concat(people.PERSON_SAFETY_ROUTE_COPY, ["badlyHeadsUp"]);
  for (const k of copy) assert.match(cypher, new RegExp(`c\\.${k} = `), k);
  const lines = cypher.split("\n").filter((l) => /c\.(person|safe|risk|safetyRoute|badly)\w* = /.test(l));
  assert.ok(lines.length >= copy.length);
  for (const l of lines) assert.doesNotMatch(l.replace(/^[^=]*= /, ""), /!|\bshould\b|\bjust\b|\bbut\b/i, l);
});

test("fixes: Body Reminder comes from the graph (ConfidenceCue), Done for now goes home", () => {
  const dm = read("src/pages/tools/DearMan.tsx");
  assert.doesNotMatch(dm, /Shoulders back, steady voice, feet on the ground/);
  assert.match(dm, /content\.confidenceCues!\.map/);
  assert.doesNotMatch(dm, /\/category\/better-relationships/);
  assert.match(read("schema/dear-man-content.cypher"), /MERGE \(cue:ConfidenceCue \{id: c\.id\}\)[\s\S]*MERGE \(cue\)-\[:IMPLEMENTS\]->\(tc\);/);
  assert.match(read("functions/src/dearMan/index.ts"), /MATCH \(c:ConfidenceCue\)-\[:IMPLEMENTS\]->\(:TherapyConcept \{id: 'dbt_dear_man'\}\)/);
});

test("Me lists people under My people with Set aside and a two-step Forget them; never the safety answer", () => {
  const me = read("functions/src/profile/me.ts");
  assert.match(me, /HAS_PERSON\|HAS_PART\]->\(p:ProfileItem\)/);
  assert.match(me, /value = \{ label: value\.label, role: value\.role \};/);
  const ui = read("src/components/me/MeSection.tsx");
  assert.match(ui, /'my_people'/);
  assert.match(ui, /<ForgetPerson itemRef=\{ref\(i\)\} after=\{after\} \/>/);
  assert.match(read("src/components/me/ForgetPerson.tsx"), /deleteProfileItem\(itemRef\)/);
});

test("a resumed draft keeps the person, and never a safety-route one", async () => {
  const { isDearManDraft } = await importTs("src/lib/dearManResume.ts");
  const base = {
    v: 1, relationshipType: "parent", situationType: "ask", priorities: [], barriers: [], barriersCustom: "", describeId: null,
    describeCustom: "", feelings: [], feelingCustom: "", assertIds: [], assertDetails: {}, assertCustom: "", reinforceIds: [],
    reinforceCustom: "", anchorPhrase: "", middleGroundId: null, middleGroundCustom: "", walkAwayId: null, walkAwayCustom: "",
  };
  const p = { personId: null, label: "Sam", role: "parent", safe: "no", risk: "invalidating", route: "heads_up" };
  assert.equal(isDearManDraft(base), true);
  assert.equal(isDearManDraft({ ...base, person: p }), true);
  assert.equal(isDearManDraft({ ...base, person: null }), true);
  assert.equal(isDearManDraft({ ...base, person: { ...p, risk: "harm", route: "safety" } }), false);
  // A draft with no person resumes at the picker (scene 0), so the safety question comes before any plan step.
  assert.match(read("src/pages/tools/DearMan.tsx"), /resumed\?\.token && \(resumed\.token\.draft as DearManDraft\)\.person\s+\? dearManStepFromId\(resumed\.token\.stepId\) : \{ phase: 'scene', sceneStep: 0 \}/);
});
