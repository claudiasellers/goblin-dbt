// Pros & cons card (PRD DT-10; DBT DT Handout 5; docs/design/pros-cons.md) on the skill runtime: own reasons first,
// what acting gives acknowledged (never listed for hurt myself), the card from the person's own words first, kept in
// Me as `pros_cons` (never an ask-fresh field), and replayed inside Hold to wait for the same pull. Hurt myself opens
// safety.open first and keeps the banner on; not sure, no, or leaning towards it ends on someone to talk to. A carried
// flooded reading gets a heads-up and a choice, never a lock. Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "pros_cons");
const hold = content.skills.find((s) => s.id === "hold_to_wait");
const embedOutputs = { prosConsCard: { ids: ["read"], measures: ["durationSec"] }, prosConsReplay: {} };
const ctx = (ctxIn = {}, profile = null, sk = skill) => ({
  skill: sk, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile,
});
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const READ = { type: "embedDone", output: { ids: ["read"], durationSec: 20 } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const optionsOf = (stepId, fieldId, s, c = ctx()) => M.optionGroups(c, M.stepOf(skill, stepId).fields.find((f) => f.id === fieldId), s.answers)
  .flatMap((g) => g.options.map((o) => o.value));
const FIRST_REASON = { send: "unsend", check: "keeps_hurt", hurt: "made_it", hit: "someone_hurt", leave: "comes_with", use: "health" };
const toCard = (pull, lean = "hold") => [pick("pull", pull), next, ...(pull === "hurt" ? [pick("safe", "safe"), next] : []),
  pick("long", FIRST_REASON[pull]), next, next, pick("cost", "longer"), next, pick("keeps", "no_regret"), next,
  pick("lean", lean), next];

test("the skill: tool pros-cons, listed under Distress Tolerance, no close question, played by the player", () => {
  assert.equal(skill.toolId, "pros-cons");
  assert.equal(skill.start, "pull");
  assert.match(readFileSync("functions/src/spine/tools.ts", "utf8"), /'pros-cons': \{ module: 'dt', closeKind: 'none' \}/);
  assert.match(readFileSync("src/lib/spine/close.ts", "utf8"), /'pros-cons': \{ module: 'dt', closeKind: 'none' \}/);
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'pros-cons': 'pros_cons',/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'pros-cons',\n\s+name: 'Pros & cons card',[\s\S]*?module: 'distress-tolerance'/);
  assert.match(tools, /toolId: 'pros-cons'/, "a Tools intent");
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_pros_cons", t: "pros-cons"\}/);
  assert.doesNotMatch(readFileSync("scripts/recommendations/content.py", "utf8"), /"pros-cons"\s*:/, "no routing rows by design");
});

test("own reasons first: the reasons not to come before what acting gives, and the card can't be made without one", () => {
  const order = skill.steps.map((s) => s.id);
  assert.ok(order.indexOf("long") < order.indexOf("gives"), "Miller & Rose 2015: lead with the reasons to hold off");
  const s = run([pick("pull", "send"), next, next]);
  assert.equal(s.stepId, "long", "a reason (a chip or their words) is required");
  const own1 = run([pick("pull", "send"), next, own("long", "I want to say it right"), next]);
  assert.equal(own1.stepId, "gives", "their own words count");
});

test("each pull gets its own reasons and pros; own words get the general ones", () => {
  const at = (pull) => run([pick("pull", pull), next]);
  assert.ok(optionsOf("long", "long", at("send")).includes("unsend"));
  assert.ok(!optionsOf("long", "long", at("check")).includes("unsend"));
  const mine = run([own("pull", "Quit my job by email"), next]);
  assert.equal(mine.stepId, "long");
  const gen = optionsOf("long", "long", mine);
  assert.ok(gen.includes("regret") && gen.includes("trust_me") && !gen.includes("unsend"), gen.join());
  for (const pull of ["send", "check", "hit", "leave", "use"]) {
    const s = run([pick("pull", pull), next, pick("long", optionsOf("long", "long", at(pull))[0]), next]);
    assert.equal(s.stepId, "gives", pull);
    assert.ok(optionsOf("gives", "gives", s).length >= 2, `${pull}: its pros`);
  }
});

test("hurt myself: safety.open first, the banner after, no pros listed, and leaning towards it ends on someone to talk to", () => {
  const s = run([pick("pull", "hurt"), next]);
  assert.equal(s.stepId, "safe");
  assert.ok(M.opensSafety(ctx(), M.stepOf(skill, "safe"), s), "safetyFirst on arrival");
  for (const st of skill.steps) assert.equal(M.crisisFor(ctx(), st, s)?.variant, "crisis", st.id);
  for (const v of ["unsure", "no"]) {
    const r = run([pick("pull", "hurt"), next, pick("safe", v), next]);
    assert.equal(r.stepId, "reach", v);
    assert.ok(M.stepOf(skill, "reach").noClose);
  }
  const g = run([pick("pull", "hurt"), next, pick("safe", "safe"), next, pick("long", "made_it"), next]);
  assert.equal(g.stepId, "gives");
  assert.deepEqual(M.shownFields(ctx(), M.stepOf(skill, "gives"), g).map((f) => f.id), [], "C6.7: nothing to pick");
  assert.match(M.copyText(ctx(), M.stepOf(skill, "gives").title, g), /does something for you in the moment/);
  assert.ok(skill.options.gives.every((o) => !o.hurt), "no pro is ever for hurt myself");
  const act = run(toCard("hurt", "act"));
  assert.equal(act.stepId, "reach", "leaning towards it: someone to talk to, not a card");
  const held = run(toCard("hurt", "hold"));
  assert.equal(held.stepId, "card");
  const plain = run([pick("pull", "send")]);
  for (const st of skill.steps) assert.equal(M.crisisFor(ctx(), st, plain), null, st.id);
});

test("a carried flooded reading: a heads-up and a choice, never a lock", () => {
  const F = ctx({ band: "flooded" });
  const s = run([pick("pull", "use"), next], F);
  assert.equal(s.stepId, "heads_up");
  assert.equal(run([pick("pull", "use"), next, pick("heads_up", "now"), next], F).stepId, "long", "make it now goes on");
  const settle = run([pick("pull", "use"), next, pick("heads_up", "settle"), next], F);
  assert.equal(settle.stepId, "settle");
  assert.deepEqual(M.offersFor(F, M.stepOf(skill, "settle"), settle), ["pause", "cool_down"]);
  const hurt = run([pick("pull", "hurt"), next, pick("safe", "safe"), next, pick("heads_up", "settle"), next], F);
  assert.deepEqual(M.offersFor(F, M.stepOf(skill, "settle"), hurt), ["cool_down"], "no hold after hurt myself: the support first");
  assert.equal(run([pick("pull", "use"), next]).stepId, "long", "no band: the standard path");
});

test("the card, then the keep: Keep it in Me keeps pros_cons with the pull (never urgeIds), Not this time keeps nothing", () => {
  const s = run([...toCard("send"), READ]);
  assert.equal(s.stepId, "keep");
  const kept = M.keepFor(ctx(), M.stepOf(skill, "keep"), run([pick("keepit", "keep")], ctx(), s));
  assert.equal(kept.kind, "pros_cons");
  assert.deepEqual(kept.value, { pullIds: ["send"], longIds: ["unsend"], costIds: ["longer"], keepsIds: ["no_regret"] });
  assert.ok(!("urgeIds" in kept.value), "urgeIds is ask-fresh: the field is `pull`");
  assert.equal(M.keepFor(ctx(), M.stepOf(skill, "keep"), run([pick("keepit", "not_now")], ctx(), s)), null);
  const end = run([pick("keepit", "keep"), next], ctx(), s);
  assert.match(M.handoffLine(ctx(), M.stepOf(skill, "end"), end), /Hold to wait will show it/);
  const unsure = run([...toCard("send", "unsure"), READ, pick("keepit", "keep"), next]);
  assert.deepEqual(M.offersFor(ctx(), M.stepOf(skill, "end"), unsure), ["wise_mind"]);
  const held = run([...toCard("send", "hold"), READ, pick("keepit", "keep"), next]);
  assert.deepEqual(M.offersFor(ctx(), M.stepOf(skill, "end"), held), [], "holding off: Done, nothing else");
});

test("the profile kind: validated, own words encrypted, ask-fresh fields stripped, many, listed under My plans", async () => {
  const { PROFILE_KINDS, checkValue } = await importTs("functions/src/profile/kinds.ts");
  const def = PROFILE_KINDS.pros_cons;
  assert.equal(def.label, "ProfileFact");
  assert.equal(def.area, "my_plans");
  assert.equal(def.slice, "prosCons");
  assert.ok(def.many);
  assert.deepEqual([...def.ownFields].sort(), ["costOwn", "givesOwn", "keepsOwn", "longOwn", "pullOwn"]);
  assert.deepEqual(checkValue(def, { pullIds: ["send"], longOwn: "I want to say it right" }), { pullIds: ["send"], longOwn: "I want to say it right" });
  assert.throws(() => checkValue(def, { longIds: ["regret"] }), /one pull/);
  assert.throws(() => checkValue(def, { pullIds: ["send"], givesIds: ["heard"] }), /Nothing to keep/);
  assert.throws(() => checkValue(def, { pullIds: ["send"], longIds: ["regret"], urgeIds: ["send"] }), /Unexpected/);
  assert.throws(() => checkValue(def, { pullIds: ["send"], longIds: ["a", "b", "c", "d"] }));
  assert.throws(() => checkValue(def, { pullIds: ["send"], longOwn: "x".repeat(91) }));
});

test("the prosCons slice: kept cards only, active, newest first, own words decrypted; only Hold to wait reads it", async () => {
  const slices = await importTs("functions/src/profile/slices.ts");
  const q = slices.SLICE_QUERIES.prosCons;
  assert.match(q, /\[:HAS_PROFILE_FACT\]->\(p:ProfileFact \{kind: 'pros_cons', status: 'active'\}\)/);
  assert.match(q, /ORDER BY p\.confirmedAt DESC/);
  assert.match(q, /LIMIT 12/);
  const src = readFileSync("functions/src/profile/slices.ts", "utf8");
  assert.match(src, /prosCons: async \(tx, uid, now\) => \{[\s\S]*?ownDecrypter\(tx, uid\)/);
  const types = await importTs("functions/src/profile/types.ts");
  assert.deepEqual(types.PROFILE_NEEDS.pause, ["parts", "prosCons"]);
});

test("Hold to wait replays the kept card for the same pull, on proceed, between what matters and the move", () => {
  const proceed = M.stepOf(hold, "proceed");
  const slot = proceed.slots.find((s) => s.embed === "prosConsReplay");
  assert.ok(slot, "the replay slot");
  assert.equal(slot.after, "goal");
  assert.equal(slot.record, "pros_cons_replay");
  assert.deepEqual({ pullField: slot.props.pullField, fromSkill: slot.props.fromSkill }, { pullField: "pull", fromSkill: "pros_cons" });
  // The same pull ids in both skills, so a card made here matches the pull picked there.
  assert.deepEqual(skill.options.pull.map((o) => [o.value, o.urge]), hold.options.pull.map((o) => [o.value, o.urge]));
});

test("the card's lines: own words first, two reasons at most, one pro or the plain fallback; the replay picks the newest card for the pull", async () => {
  const { cardLines, cardFor, keptLines } = await importTs("src/lib/prosConsCard.ts");
  assert.deepEqual(cardLines([{ own: null, picks: ["A", "B"] }, { own: "Mine", picks: ["C"] }], { own: null, picks: ["P"] }, "F"),
    { reasons: ["Mine", "A"], pro: "P" });
  assert.deepEqual(cardLines([{ own: null, picks: ["A"] }, { own: null, picks: [] }], { own: null, picks: [] }, "F"), { reasons: ["A"], pro: "F" });
  const slice = [{ id: "new", pullIds: ["send"], longIds: ["unsend"] }, { id: "old", pullIds: ["send"], longIds: ["regret"] }, { id: "c", pullIds: ["check"] }];
  assert.equal(cardFor(slice, "send").id, "new");
  assert.equal(cardFor(slice, "hit"), null);
  assert.equal(cardFor(null, "send"), null);
  assert.deepEqual(keptLines({ id: "x", pullIds: ["send"], longIds: ["unsend"], keepsOwn: "I mean it", givesIds: ["heard"] }, skill, "F"),
    { reasons: ["I mean it", "I can't take it back once it's sent"], pro: "Being heard, right now" });
});

test("C6.7: no chip is food, drink, shopping or scrolling as a comfort, no amounts, nothing about getting stronger", () => {
  const labels = Object.values(skill.options).flat().map((o) => o.label.toLowerCase());
  for (const l of labels) {
    assert.doesNotMatch(l, /\b(eat|snack|treat|shop|scroll|drink a|stronger)\b/, l);
    assert.doesNotMatch(l, /\d/, l);
  }
});

test("Gate 3: a typed pull lists no pros; hurt myself never gets people's trust; leave isn't argued out of getting safe", () => {
  // A pull in their own words could be self-harm or an eating-disorder behaviour: no pros listed (C6.7).
  const mine = run([own("pull", "Skip meals"), next, pick("long", "regret"), next]);
  assert.equal(mine.stepId, "gives");
  assert.deepEqual(optionsOf("gives", "gives", mine), [], "own words only");
  assert.ok(!skill.options.gives.some((o) => o.other), "no pro is offered for own words");
  const card = run([next, pick("cost", "longer"), next, next, pick("lean", "hold"), next], ctx(), mine);
  assert.equal(card.stepId, "card");
  // Hurt myself: trust frames self-harm as betraying others (S7).
  const hurt = run([pick("pull", "hurt"), next, pick("safe", "safe"), next, pick("long", "made_it"), next, next, next]);
  assert.equal(hurt.stepId, "keeps");
  assert.ok(!optionsOf("keeps", "keeps", hurt).includes("trust"));
  assert.ok(optionsOf("keeps", "keeps", run([pick("pull", "send"), next, pick("long", "unsend"), next, next, next])).includes("trust"));
  assert.ok(!optionsOf("cost", "cost", run([pick("pull", "hit"), next, pick("long", "someone_hurt"), next, next])).includes("not_knowing"));
  // Leave: no "it could cost me the relationship", and the step says the card isn't for getting safe.
  const leave = run([pick("pull", "leave"), next]);
  assert.ok(!optionsOf("long", "long", leave).includes("relationship"));
  assert.match(M.copyText(ctx(), M.stepOf(skill, "long").title, leave), /away to be safe/);
  assert.doesNotMatch(M.copyText(ctx(), M.stepOf(skill, "long").title, run([pick("pull", "send"), next])), /safe/);
  // The replay: a hurt card shows its reasons only; a leave card carries the note.
  const slot = M.stepOf(hold, "proceed").slots.find((s) => s.embed === "prosConsReplay");
  assert.deepEqual([slot.props.noProFor, slot.props.noteFor], ["hurt", "leave"]);
  assert.match(hold.copy[slot.props.note], /get away to be safe/);
  // No end line claims they were steady (a flooded *Make it now* reaches it too); a kept card says where it is.
  assert.doesNotMatch(skill.copy.end_line, /steady/);
  const actKept = run([...toCard("send", "act"), READ, pick("keepit", "keep"), next]);
  assert.match(M.handoffLine(ctx(), M.stepOf(skill, "end"), actKept), /It's in Me/);
});

test("the card's label reads once, one full stop per line, the replay's title first", async () => {
  const { cardLabel } = await importTs("src/lib/prosConsCard.ts");
  assert.equal(cardLabel({ reasonsLabel: "My reasons not to", reasons: ["I mean it.", "Regret"], proLabel: "It pulls because", pro: "Relief" }),
    "My reasons not to: I mean it. Regret. It pulls because: Relief.");
  assert.equal(cardLabel({ title: "Your card", reasonsLabel: "R", reasons: ["A"], pro: null }), "Your card. R: A.");
});

test("Me shows which pull a kept card is for and its reasons, so cards can be told apart and own-words cards read", async () => {
  const { keptPull, keptLines } = await importTs("src/lib/prosConsCard.ts");
  assert.equal(keptPull({ id: "a", pullIds: ["send"] }, skill), "Send or say something");
  assert.equal(keptPull({ id: "b", pullIds: [], pullOwn: "Quit by email" }, skill), "Quit by email");
  assert.deepEqual(keptLines({ id: "b", pullOwn: "Quit by email", longIds: ["regret"] }, skill, "").reasons, ["I'd regret it later"]);
  const me = readFileSync("src/components/me/MeSection.tsx", "utf8");
  assert.match(me, /i\.meta\.kind === 'pros_cons' && i\.value\s*\?\s*<KeptProsCons value=\{i\.value\} \/>/);
});
