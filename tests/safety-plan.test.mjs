// The safety plan (CORE-02, docs/design/safety-route.md PR 3): the content (FLOW.plan in scripts/safety/content.py),
// the pure client lib (src/lib/safetyPlan.ts), the profile kind and slice (functions/src/profile/), the month-on
// review follow-up, and the wiring (Help & safety first, the route plays it in place, /safety/plan).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const content = JSON.parse(readFileSync("src/data/content/safety.json", "utf8")).content;
const plan = content.flow.plan;
const P = await importTs("src/lib/safetyPlan.ts");
const K = await importTs("functions/src/profile/kinds.ts");
const read = (p) => readFileSync(p, "utf8");

test("content: nine steps in Stanley–Brown's order, unique chip ids, coping chips open real tools", async () => {
  assert.deepEqual(plan.steps.map((s) => s.id), ["signs", "coping", "distract", "people", "pros", "safer", "reasons", "hear", "review"]);
  assert.deepEqual([...P.PLAN_STEPS], plan.steps.map((s) => s.id));
  assert.deepEqual(plan.signGroups.map((g) => g.id), ["thoughts", "body", "situations", "actions"]);
  const { tools } = await importTs("src/data/tools.ts");
  const ids = new Set(tools.map((t) => t.id));
  for (const c of plan.coping.filter((x) => x.toolId)) assert.ok(ids.has(c.toolId), c.toolId);
  // No food, drink, shopping or scrolling as coping (the crisis kit's rule).
  assert.ok(!JSON.stringify(plan.coping).match(/eat|drink|shop|scroll/i));
  assert.deepEqual(plan.safer.filter((c) => c.firearm).map((c) => c.id), ["firearm_hold"]);
  assert.ok(!/promise|should|family/i.test(JSON.stringify(plan)));
});

test("the firearm chip shows only where the country asks", () => {
  const us = content.countries.find((c) => c.id === "US");
  const gb = content.countries.find((c) => c.id === "GB");
  assert.ok(P.saferChips(plan, us).some((c) => c.id === "firearm_hold"));
  assert.ok(!P.saferChips(plan, gb).some((c) => c.id === "firearm_hold"));
  assert.ok(!P.saferChips(plan, null).some((c) => c.id === "firearm_hold"));
});

test("the quick plan is the plan's draft", () => {
  const p = P.planFromQuick({ sign: " can't sleep ", do: "a shower", contact: "Sam" }, plan.person.textDefault);
  assert.equal(p.signsOwn, "can't sleep");
  assert.equal(p.copingOwn, "a shower");
  assert.deepEqual(p.people, [{ name: "Sam", phone: "", text: plan.person.textDefault }]);
  assert.ok(!P.planHas(P.planFromQuick(null, "")));
});

test("what's kept: catalogue ids only, empty fields out, the contact lists as one own-words string each; the server takes it", () => {
  const p = { ...P.emptyPlan(), signsIds: ["cant_sleep", "retired_chip"], hearOwn: "  This passes ", kit: true,
    people: [{ name: "Sam", phone: "07700 900123abc", text: "Rough night" }, { name: "", phone: "", text: "x" }],
    pros: [{ role: "therapist", name: "Dr Lee", phone: "" }], saferIds: ["meds_small"] };
  const v = P.toKeep(p, plan);
  assert.deepEqual(v.signsIds, ["cant_sleep"]);
  assert.equal(v.hearOwn, "This passes");
  assert.equal(v.kit, true);
  assert.ok(!("copingIds" in v) && !("reasonsOwn" in v));
  assert.deepEqual(JSON.parse(v.peopleOwn), [{ name: "Sam", phone: "07700 900123", text: "Rough night" }]);
  const def = K.PROFILE_KINDS.safety_plan;
  const kept = K.checkValue(def, v);
  assert.deepEqual(JSON.parse(kept.peopleOwn), JSON.parse(v.peopleOwn));
  // Every own-words field is encrypted at rest (items.ts storedValue), the lists included.
  for (const f of ["signsOwn", "copingOwn", "distractOwn", "peopleOwn", "prosOwn", "saferOwn", "reasonsOwn", "hearOwn"]) assert.ok(def.ownFields.includes(f), f);
  assert.equal(def.many, false);
  assert.equal(def.slice, "safetyPlan");
});

test("the server refuses an empty plan, unknown fields, a bad number and a long list", () => {
  const def = K.PROFILE_KINDS.safety_plan;
  assert.throws(() => def.validate({}), /at least one/);
  assert.throws(() => def.validate({ hearOwn: "x", urgeIds: ["send"] }), /Unexpected/);
  assert.throws(() => def.validate({ peopleOwn: JSON.stringify([{ name: "A", phone: "call me maybe" }]) }));
  assert.throws(() => def.validate({ peopleOwn: JSON.stringify(Array.from({ length: 6 }, () => ({ name: "A" }))) }));
  assert.throws(() => def.validate({ prosOwn: JSON.stringify([{ role: "priest", name: "A" }]) }));
  assert.throws(() => def.validate({ kit: "yes" }));
  assert.deepEqual(K.planContacts(JSON.stringify([{ role: "gp", name: "Dr K", phone: "+44 20" }]), "pros"), [{ role: "gp", name: "Dr K", phone: "+44 20" }]);
});

test("use mode: their own line first, then each step with something in it; the lines always", () => {
  const p = { ...P.emptyPlan(), hearOwn: "You've got through nights like this", reasonsIds: ["pet"], kit: true };
  assert.deepEqual(P.stepsToUse(p), ["hear", "coping", "pros", "reasons"]);
  assert.deepEqual(P.stepsToUse(P.emptyPlan()), ["pros"]);
  assert.deepEqual(P.pinnedPeople({ ...P.emptyPlan(), people: [{ name: "Sam", phone: "", text: "" }, { name: "Jo", phone: "0123", text: "" }] }).map((x) => x.name), ["Jo"]);
});

test("the device copy reads back, and anything unreadable drops", () => {
  const p = { ...P.emptyPlan(), signsOwn: "alone at night", pros: [{ role: "gp", name: "Dr K", phone: "1" }, { role: "nope", name: "x", phone: "" }] };
  const back = P.planFromJson(JSON.parse(JSON.stringify(p)));
  assert.equal(back.signsOwn, "alone at night");
  assert.deepEqual(back.pros.map((x) => x.role), ["gp"]);
  assert.equal(P.planFromJson({ nonsense: true }), null);
  assert.equal(P.planFromJson(null), null);
});

test("build mode gets a heads-up on a carried flooded reading; use mode never asks", () => {
  assert.ok(P.buildNeedsHeadsUp("flooded"));
  assert.ok(!P.buildNeedsHeadsUp("stirred"));
  assert.ok(!P.buildNeedsHeadsUp(null));
});

test("profile: the safetyPlan slice is read by Help & safety and the route only, with the kit for step 2", async () => {
  const server = await importTs("functions/src/profile/types.ts");
  const client = await importTs("src/data/profileTypes.ts");
  assert.deepEqual([...server.PROFILE_NEEDS.safety], ["safetyPlan", "crisisKit"]);
  assert.deepEqual([...client.PROFILE_NEEDS.safety], ["safetyPlan", "crisisKit"]);
  const owners = Object.entries(server.PROFILE_NEEDS).filter(([, s]) => s.includes("safetyPlan")).map(([k]) => k);
  assert.deepEqual(owners, ["safety"], "the plan isn't browsed from other tools (PRD open question 2)");
  const slices = read("functions/src/profile/slices.ts");
  assert.match(slices, /safetyPlan: `MATCH \(:User \{id: \$uid\}\)-\[:HAS_PROFILE_FACT\]->\(p:ProfileFact \{kind: 'safety_plan', status: 'active'\}\)/);
  assert.match(read("schema/profile-layer.cypher"), /MERGE \(k:ProfileKind \{id: "safety_plan"\}\)\nSET k\.area = "my_plans", k\.label = "My safety plan"/);
});

test("the month-on review: a safety-tier deep link the server will schedule", async () => {
  const spine = JSON.parse(read("src/data/content/spine.json")).content.followUpTypes;
  const t = spine.find((x) => x.id === "safety_plan_review");
  assert.ok(t?.enabled);
  assert.equal(t.tier, "safety");
  assert.equal(t.deepLinkTemplate, "/safety/plan?review={followUpId}");
  assert.deepEqual(Object.keys(t.window.chips), ["month"]);
  assert.match(read("schema/practice-spine.cypher"), /safety_plan_review/);
  const v = await importTs("functions/src/spine/validation.ts");
  const now = new Date("2026-11-12T12:00:00Z");
  const due = new Date(now.getTime() + 30 * 86_400_000).toISOString();
  const r = v.validateSchedule([{ id: "00000000-0000-4000-8000-000000000001", type: "safety_plan_review", dueAt: due, window: "month", notify: { inTab: true } }], now);
  assert.equal(r[0].window, "month");
  assert.match(read("src/services/safety.ts"), /type: 'safety_plan_review', dueAt: due\.toISOString\(\), window: 'month'/);
});

test("wiring: /safety/plan, My safety plan first on Help & safety, the route plays it in place", () => {
  assert.match(read("src/App.tsx"), /<Route path="\/safety\/plan" element=\{<SafetyPlan \/>\} \/>/);
  const hub = read("src/pages/Safety.tsx");
  assert.ok(hub.indexOf('data-testid="hub-plan"') < hub.indexOf("<SafetyPeople "), "the plan comes before the lines");
  const route = read("src/components/safety/SafetyRoute.tsx");
  // In the route the plan plays in place with the route's people (the lines) above every step.
  assert.match(route, /return plan\s*\? frame\(<>\s*\{people\}\s*<SafetyPlanUse [\s\S]{0,200}?embedded/);
  assert.match(route, /<PlanPeopleRow content=\{content\} country=\{null\} plan=\{plan\}/);
  assert.match(read("src/components/safety/SafetyPlanUse.tsx"), /to="\/tool\/crisis-kit\?frame=crisis"/);
  assert.match(read("src/components/safety/SafetyPlanBuild.tsx"), /to="\/tool\/crisis-kit\?frame=build"/);
});

test("the device copy is read only under the uid it was made under; a signed-out copy is offered to whoever signs in", () => {
  const plan = { ...P.emptyPlan(), hearOwn: "This passes" };
  assert.equal(P.devicePlanFor({ owner: "a", plan }, "b"), null, "someone else's");
  assert.equal(P.devicePlanFor({ owner: "a", plan }, null), null, "signed out doesn't see an account's copy");
  assert.equal(P.devicePlanFor({ owner: "a", plan }, "a").plan.hearOwn, "This passes");
  assert.equal(P.devicePlanFor({ owner: null, plan }, "b").owner, null);
  assert.ok(P.deviceOwnedBy({ owner: "a", plan }, "a") && !P.deviceOwnedBy({ owner: null, plan }, "a"));
  assert.match(read("src/contexts/BandContext.tsx"), /clearDevicePlanOf\(prev\)/, "cleared when that account signs out");
  assert.notEqual(P.planPrint(plan), P.planPrint({ ...plan, hearOwn: "x" }));
});

test("Me lists the plan, never its contents; the review card is done only once a change is saved", () => {
  assert.match(read("functions/src/profile/me.ts"), /if \(meta\.kind === 'safety_plan'\) value = undefined;/);
  const page = read("src/pages/SafetyPlan.tsx");
  assert.match(page, /setParams\(\{ changing: review \}\)/);
  assert.match(page, /if \(r === 'account' && changing\) void completeFollowUp\(changing\)/);
  // Only a first plan or a save from a review books the next review (never every edit).
  assert.match(read("src/hooks/useSafetyPlan.ts"), /if \(!hadAccount \|\| opts\.review\) void scheduleSafetyPlanReview\(\)/);
});
