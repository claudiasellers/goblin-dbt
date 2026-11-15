// Rebel without the wreckage, part 3 (DT-11; docs/design/alternate-rebellion.md): the rebellion menu in My crisis kit
// (a rebellion kept on *Keep it in my kit* as its own `rebellion_card` kind, played by the kit as one of its cards)
// and the curated rebellions that last (behind their own door, never offered with someone they're scared of, next to
// treatment or flooded, and always waiting a day). Tested through the pure machine, the kind and the kit's deck.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const K = await importTs("src/lib/crisisKit.ts");
const { PROFILE_KINDS, REBELLION_LASTING } = await importTs("functions/src/profile/kinds.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const skill = content.skills.find((s) => s.id === "alternate_rebellion");
const build = content.skills.find((s) => s.id === "crisis_kit_build");
const use = content.skills.find((s) => s.id === "crisis_kit_use");
const embedOutputs = { rebellionCard: { ids: ["now", "today", "week"] } };
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const card = (when) => ({ type: "embedDone", output: { ids: [when] } });
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const step = (id) => skill.steps.find((s) => s.id === id);
const toPick = (squeeze = ["rules"], fn = "freedom", c = ctx()) => [...(c.ctxIn.band === "flooded" ? [pick("first", "anyway")] : []), next, ...squeeze.map((x) => pick("squeeze", x)), next, pick("function", fn), next];
const listed = (s, c = ctx()) => M.optionGroups(c, step("pick").fields[0], s.answers)[0].options.map((o) => o.value);
const shown = (s, c = ctx()) => M.shownFields(c, step("pick"), s).map((f) => f.id);
const reopen = (s, at) => M.resumeRun(ctx(), M.runRecord(ctx(), s), at);
const lasting = skill.options.rebellion.filter((o) => o.lasting === true);

test("the ones that last: four, done by a studio or a hairdresser, never reversible, the kind's list the same ids", () => {
  assert.deepEqual(lasting.map((o) => o.value), ["tattoo", "piercing", "hair_short", "hair_colour"]);
  assert.deepEqual(lasting.map((o) => o.value), [...REBELLION_LASTING], "functions/src/profile/kinds.ts REBELLION_LASTING");
  for (const o of lasting) {
    assert.equal(o.reversible, false, o.value);
    assert.match(o.label, /at a studio|^Have your hair/, `${o.value}: a professional does it`);
    assert.doesNotMatch(o.label, /yourself|needle|blade|razor|scissors|at home|\b\d+\b/i, o.value);
  }
  assert.equal(skill.version, "ar-v4");
});

test("the list never shows one that lasts unless the door is open, for any function or squeeze", () => {
  for (const fn of skill.options.function.map((o) => o.value)) {
    for (const sq of [["rules"], ["scared"], ["treatment"], ["treatment", "scared"]]) {
      const ids = listed(run(toPick(sq, fn)));
      assert.ok(!ids.some((v) => REBELLION_LASTING.includes(v)), `${fn} / ${sq}: ${ids}`);
    }
  }
});

test("the door: only for a function one of them gives; never with someone they're scared of, next to treatment or flooded", () => {
  for (const fn of ["freedom", "seen", "alive", "control"]) assert.ok(shown(run(toPick(["rules"], fn))).includes("door"), fn);
  for (const fn of ["break", "prove"]) assert.ok(!shown(run(toPick(["rules"], fn))).includes("door"), fn);
  for (const sq of [["scared"], ["treatment"], ["stuck", "scared"], ["treatment", "be_fine"]]) {
    assert.ok(!shown(run(toPick(sq, "seen"))).includes("door"), sq.join("+"));
  }
  const f = ctx({ band: "flooded" });
  assert.ok(!shown(run(toPick(["rules"], "seen", f), f), f).includes("door"), "a carried flooded reading");
  const door = step("pick").fields.find((x) => x.id === "door");
  assert.equal(door.required, false, "a quiet chip, never a must");
  assert.equal(skill.options.door[0].label, "Something that lasts");
});

test("the door open: only the ones that last for that function, with the title that says they wait a day", () => {
  const s = run([...toPick(["rules"], "seen"), pick("door", "lasting")]);
  assert.deepEqual(listed(s), ["tattoo", "piercing", "hair_short", "hair_colour"]);
  assert.equal(M.copyText(ctx(), step("pick").title, s), skill.copy.pick_title_lasting);
  assert.deepEqual(listed(run([...toPick(["rules"], "control"), pick("door", "lasting")])), ["hair_short"]);
  // Tapped again, the door shuts: the ordinary list.
  const shut = run([pick("door", "lasting")], ctx(), s);
  assert.ok(!listed(shut).some((v) => REBELLION_LASTING.includes(v)));
});

test("one that lasts always waits a day: no card today, the day-later card, then the card with its label", () => {
  const s = run([...toPick(["rules"], "seen"), pick("door", "lasting"), pick("pick", "tattoo"), next]);
  assert.equal(s.stepId, "sleep_on");
  assert.equal(M.copyText(ctx(), step("sleep_on").title, s), skill.copy.sleep_title_lasting);
  const booked = run([pick("sleep", "tomorrow")], ctx(), s);
  assert.equal(M.followUpFor(ctx(), step("sleep_on"), booked).type, "rebellion_check");
  const slept = run([next, pick("real", "not_now"), next], ctx(), booked);
  assert.equal(slept.stepId, "next", "never offered to the kit");
  assert.ok(!slept.path.includes("card") && !slept.path.includes("kit"));
  const r = reopen(slept, "still");
  const yes = run([pick("still", "yes"), next], ctx(), r);
  assert.equal(yes.stepId, "card", "the wait is done: the card");
  assert.deepEqual(M.pickedLabels(ctx(), yes).pick, ["Get the tattoo you've been thinking about, at a studio"]);
  const after = run([card("week"), { type: "next", quiet: true }, pick("real", "not_now"), next], ctx(), yes);
  assert.equal(after.stepId, "next", "still never offered to the kit");
});

test("the day's wait is for the rebellion that waited: back from the card to the list, another one that lasts waits again", () => {
  const back = { type: "back" };
  const own1 = run([...toPick(["rules"], "seen"), own("pick", "move to another city"), pick("cost", "no"), pick("undo", "no"), next, pick("sleep", "tomorrow"), next, pick("real", "not_now"), next]);
  let s = run([pick("still", "yes"), next], ctx(), reopen(own1, "still"));
  assert.equal(s.stepId, "card");
  s = run([back, back, back], ctx(), s);
  assert.equal(s.stepId, "pick");
  assert.equal(run([pick("door", "lasting"), pick("pick", "tattoo"), next], ctx(), s).stepId, "sleep_on", "a tattoo never borrows another rebellion's day");
  const tat = run([...toPick(["rules"], "seen"), pick("door", "lasting"), pick("pick", "tattoo"), next, pick("sleep", "tomorrow"), next, pick("real", "not_now"), next]);
  let t = run([pick("still", "yes"), next, back, back, back], ctx(), reopen(tat, "still"));
  assert.equal(t.stepId, "pick");
  assert.equal(run([pick("pick", "piercing"), next], ctx(), t).stepId, "sleep_on", "switching to a piercing waits its own day");
  // The scared or treatment re-check still reaches the card after the yes (part 2's rule): the door is shut there.
  const sc = run([...toPick(["scared"], "seen"), own("pick", "cut my hair off"), pick("cost", "no"), pick("noticed", "no"), pick("undo", "no"), next, pick("sleep", "tomorrow"), next, pick("real", "not_now"), next]);
  const again = run([pick("still", "yes"), next, pick("cost", "no"), pick("noticed", "no"), pick("undo", "no"), next], ctx(), reopen(sc, "still"));
  assert.equal(again.stepId, "card");
});

test("asking for something lighter or undoable shuts the door for the visit: the ordinary list comes back", () => {
  const s = run([...toPick(["rules"], "seen"), pick("door", "lasting"), pick("pick", "piercing"), next, pick("sleep", "lighter"), next]);
  assert.equal(s.stepId, "pick");
  assert.ok(!shown(s).includes("door"));
  assert.ok(!listed(s).some((v) => REBELLION_LASTING.includes(v)));
  assert.notEqual(M.copyText(ctx(), step("pick").title, s), skill.copy.pick_title_lasting);
  const slept = run([...toPick(["rules"], "seen"), pick("door", "lasting"), pick("pick", "piercing"), next, pick("sleep", "tomorrow"), next, pick("real", "not_now"), next]);
  const lighter = run([pick("still", "lighter"), next], ctx(), reopen(slept, "still"));
  assert.equal(lighter.stepId, "pick");
  assert.ok(!listed(lighter).some((v) => REBELLION_LASTING.includes(v)), "something I can undo instead");
});

test("the kit card: after the squeeze, a curated rebellion is offered to the crisis kit; Keep it keeps rebellion_card", () => {
  const atKit = run([...toPick(["rules"], "alive"), pick("pick", "loud_song"), next, card("now"), next, pick("real", "not_now"), next]);
  assert.equal(atKit.stepId, "kit");
  const k = step("kit");
  assert.equal(k.primary, "kit_primary");
  assert.deepEqual(k.keep, { kind: "rebellion_card", many: true, from: ["function", "pick"], when: { eq: ["$a.kitit", "keep"] }, done: "kit_done" });
  assert.equal(M.keepFor(ctx(), k, run([pick("kitit", "not_now")], ctx(), atKit)), null, "Not this time keeps nothing");
  const kept = M.keepFor(ctx(), k, run([pick("kitit", "keep")], ctx(), atKit));
  assert.deepEqual(kept, { kind: "rebellion_card", value: { functionIds: ["alive"], pickIds: ["loud_song"] }, id: null });
  assert.deepEqual(PROFILE_KINDS.rebellion_card.validate(kept.value), kept.value, "the kind takes what the step keeps");
  const end = run([pick("kitit", "keep"), next], ctx(), atKit);
  assert.equal(end.stepId, "next");
  assert.deepEqual(end.offered, [], "not now → Done, as before");
  // Their own words, when it undoes and costs nothing: kept as their words.
  const mine = run([...toPick(["rules"], "freedom"), own("pick", "paint my nails black"), pick("cost", "no"), pick("undo", "yes"), next, card("now"), next, pick("real", "not_now"), next]);
  assert.equal(mine.stepId, "kit");
  assert.deepEqual(M.keepFor(ctx(), k, run([pick("kitit", "keep")], ctx(), mine)).value, { functionIds: ["freedom"], pickOwn: "paint my nails black" });
});

test("never offered to the kit: someone they're scared of, an own one that might not undo or would cost, let go, asked twice", () => {
  const scared = run([...toPick(["scared"], "alive"), pick("pick", "loud_song"), next, card("now"), next, pick("real", "not_now"), next]);
  assert.equal(scared.stepId, "next", "the kit is on their phone");
  const costs = run([...toPick(), own("pick", "quit by email"), pick("cost", "yes"), pick("undo", "yes"), next, pick("heads_up", "keep"), next, card("now"), next, pick("real", "not_now"), next]);
  assert.equal(costs.stepId, "next", "a heads-up kept anyway");
  const unsure = run([...toPick(), own("pick", "dye my hair green"), pick("cost", "no"), pick("undo", "not_sure"), next, pick("sleep", "tomorrow"), next, pick("real", "not_now"), next]);
  assert.equal(unsure.stepId, "next");
  const sleptYes = run([pick("still", "yes"), next, card("now"), next, pick("real", "not_now"), next], ctx(), reopen(unsure, "still"));
  assert.equal(sleptYes.stepId, "next", "an own one that might not undo stays out after the wait too");
  const letGo = run([pick("still", "no"), next, pick("real", "not_now"), next], ctx(), reopen(unsure, "still"));
  assert.equal(letGo.stepId, "next");
  // The card later reopens the visit at `back`: the kit question isn't asked again.
  const booked = run([...toPick(), pick("pick", "say_no"), next, card("week"), pick("remind", "few_days"), next, pick("real", "change"), next, pick("kitit", "keep"), next]);
  assert.equal(booked.stepId, "next");
  const back = run([pick("did", "yes"), next, pick("itch", "yes"), next, pick("real", "not_now"), next], ctx(), reopen(booked, "back"));
  assert.equal(back.stepId, "next");
  assert.ok(!back.path.slice(back.path.indexOf("back")).includes("kit"));
});

test("the rebellion_card kind: many, own words encrypted, one rebellion, never one that lasts, nothing unknown", () => {
  const k = PROFILE_KINDS.rebellion_card;
  assert.equal(k.many, true);
  assert.equal(k.maxItems, 12);
  assert.equal(k.slice, "rebellionCards");
  assert.equal(k.area, "my_plans");
  assert.deepEqual(k.ownFields, ["pickOwn"]);
  assert.throws(() => k.validate({ functionIds: ["seen"] }), /one rebellion/);
  assert.throws(() => k.validate({ pickIds: ["tattoo"] }), /lasts/);
  assert.throws(() => k.validate({ pickIds: ["say_no"], whenIds: ["now"] }), /Unexpected field/);
  assert.throws(() => k.validate({ pickIds: ["say_no", "sing"] }));
  assert.deepEqual(k.validate({ pickOwn: "Wear odd socks" }), { pickOwn: "Wear odd socks" });
  // Its own kind, not a section of the kit: keeping one never rewrites the crisis_kit record.
  assert.equal(PROFILE_KINDS.crisis_kit.many, false);
  assert.ok(!Object.keys(PROFILE_KINDS.crisis_kit.validate({ bodyIds: ["cold"] })).some((f) => f.startsWith("rebellion")));
});

const COPY = { secReasons: "R", secProsCons: "P", placeHow: "PH", wordsHow: "WH", reasonsLabel: "RL", rebellionFor: "What it gives you:", copy: build.copy };

test("the kit plays them: two at most, newest first, their words or Rebel's label, what it gives; one that lasts is dropped", () => {
  const rebels = [
    { id: "r1", functionIds: ["alive"], pickIds: ["loud_song"] },
    { id: "r2", functionIds: ["control"], pickOwn: "Make my bed at noon" },
    { id: "r3", functionIds: ["seen"], pickIds: ["hair"] },
  ];
  const { cards } = K.kitCards({ bodyIds: ["cold"] }, build, COPY, undefined, { cards: rebels, skill });
  const r = cards.filter((c) => c.section === "rebellion");
  assert.deepEqual(r.map((c) => c.id), ["rebellion:r1", "rebellion:r2"]);
  assert.equal(r[0].title, "Play the loud song in one earbud, all the way through");
  assert.equal(r[0].how, "What it gives you: feeling alive");
  assert.equal(r[1].title, "Make my bed at noon");
  assert.equal(r[1].how, "What it gives you: control back");
  const twice = K.kitCards(null, build, COPY, undefined, { cards: [rebels[0], { ...rebels[0], id: "r0" }, rebels[1]], skill });
  assert.deepEqual(twice.cards.filter((c) => c.section === "rebellion").map((c) => c.id), ["rebellion:r1", "rebellion:r2"], "kept twice, played once");
  const dropped = K.kitCards(null, build, COPY, undefined, { cards: [{ id: "x", pickIds: ["tattoo"] }, { id: "y", pickIds: ["gone_now"] }], skill });
  assert.equal(dropped.cards.filter((c) => c.section === "rebellion").length, 0);
  // With the starter kit too, and flooded: body cards only (a rebellion never plays then).
  const starter = K.kitCards(null, build, COPY, undefined, { cards: rebels, skill });
  assert.equal(starter.starter, true);
  assert.equal(starter.cards.filter((c) => c.section === "rebellion").length, 2);
  assert.ok(K.deckOrder(starter.cards, true).every((c) => c.section === "body"));
});

test("wired: the deck names Rebel's skill, its section and line are kit copy; never on a crisis route's kit", () => {
  const deck = use.steps.find((s) => s.id === "deck");
  assert.equal(deck.props.rebelSkill, "alternate_rebellion");
  assert.equal(use.copy[deck.props.secRebellion], "A rebellion without the wreckage");
  assert.equal(use.copy[deck.props.rebellionFor], "What it gives you:");
  const src = readFileSync("src/components/skillPlayer/KitDeck.tsx", "utf8");
  assert.match(src, /ctx\?\.frame !== 'crisis' && Array\.isArray\(profile\?\.rebellionCards\)/);
  assert.match(readFileSync("functions/src/profile/slices.ts", "utf8"), /REBELLION_OPTION = 'alternate_rebellion:rebellion:'/);
  assert.match(readFileSync("functions/src/profile/me.ts", "utf8"), /meta\.kind === 'rebellion_card'/);
  assert.match(readFileSync("src/components/me/MeSection.tsx", "utf8"), /i\.meta\.kind === 'rebellion_card'/);
});
