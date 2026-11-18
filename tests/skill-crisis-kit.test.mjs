// My crisis kit (PRD DT-03; DBT crisis survival skills; docs/design/crisis-kit.md) on the skill runtime: two skills
// under one tool. Open it plays the kept kit (or the starter cards) one card at a time, body first, a flooded reading
// body cards only, then the close in the flow and people; make it is one skippable section per screen, kept as one
// `crisis_kit`. Tested through the same pure machine the player runs, and the deck's pure logic (src/lib/crisisKit.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const K = await importTs("src/lib/crisisKit.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const build = content.skills.find((s) => s.id === "crisis_kit_build");
const use = content.skills.find((s) => s.id === "crisis_kit_use");
const pros = content.skills.find((s) => s.id === "pros_cons");
const embedOutputs = {
  kitDeck: { ids: ["body", "hands", "soothe", "words", "place", "reasons", "pros_cons", "starter"], measures: ["durationSec", "doneCount"] },
};
const ctxOf = (skill) => (ctxIn = {}, profile = null) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile });
const bctx = ctxOf(build);
const uctx = ctxOf(use);
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const own = (fieldId, text) => ({ type: "own", fieldId, text });
const next = { type: "next" };
const runOf = (skill, c0) => (events, c = c0(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const brun = runOf(build, bctx);
const urun = runOf(use, uctx);
const offers = (skill, s, c) => M.offersFor(c, M.stepOf(skill, s.stepId), s);
const deckDone = (ids = ["body", "starter"]) => ({ type: "embedDone", output: { ids, doneCount: 2, durationSec: 40 } });
const COPY = {
  secReasons: "Your reasons to get through tonight", secProsCons: "Your pros & cons card", placeHow: "Picture it.",
  wordsHow: "Read it slowly, twice.", reasonsLabel: "You wrote these on a calmer day.", copy: build.copy,
};

// Every kit option id that has shipped. A kept kit stores these ids, and CORE-02's safety plan will point at
// `section:id` cards, so an id is never renamed or removed: retire it (keep the option) and add a new one.
const SHIPPED = {
  body: ["cold", "breath_out", "squeeze", "march", "feet"],
  hands: ["count", "colours", "tidy", "puzzle", "sing", "rewatch"],
  soothe: ["warm", "hand_heart", "soft", "smell", "sound", "look"],
  words: ["minute", "before", "feeling", "next", "wave", "trying", "ask"],
  place: ["beach", "woods", "room", "with", "made_up"],
  reasons: ["tomorrow", "people", "pet", "looking_forward", "prove", "still_want"],
};

test("the tool: crisis-kit, its own concept, two skills picked by its page, listed under DT, in Help me now", () => {
  assert.equal(build.toolId, "crisis-kit");
  assert.equal(use.toolId, "crisis-kit");
  const cy = readFileSync("schema/skills.cypher", "utf8");
  for (const id of ["crisis_kit_build", "crisis_kit_use"])
    assert.match(cy, new RegExp(`MATCH \\(t:TherapyConcept \\{id: "dbt_crisis_survival_kit"\\}\\), \\(s:Skill \\{id: "${id}"\\}\\)`));
  assert.match(readFileSync("src/lib/skillRuntime/playerTools.ts", "utf8"), /'crisis-kit': \['crisis_kit_use', 'crisis_kit_build'\],/);
  assert.match(readFileSync("src/pages/ToolPage.tsx", "utf8"), /'crisis-kit': CrisisKit,/);
  const tools = readFileSync("src/data/tools.ts", "utf8");
  assert.match(tools, /id: 'crisis-kit',\n\s+name: 'My crisis kit',/);
  assert.match(tools, /label: 'Open my crisis kit', toolId: 'crisis-kit'/);
  assert.match(tools, /toolId: 'crisis-kit', query: 'frame=build'/);
  for (const f of ["src/lib/spine/close.ts", "functions/src/spine/tools.ts"])
    assert.match(readFileSync(f, "utf8"), /'crisis-kit': \{ module: 'dt', closeKind: 'regulation_down' \}/, f);
  assert.match(readFileSync("schema/app-tool-ids.cypher", "utf8"), /\{c: "dbt_crisis_survival_kit", t: "crisis-kit"\}/);
  assert.match(readFileSync("schema/relationships.cypher", "utf8"), /dbt_crisis_survival_kit"\}\), \(mod:TherapyConcept \{id: "dbt_distress_tolerance"\}\)/);
  assert.match(readFileSync("src/lib/spine/helpNow.ts", "utf8"), /HELP_NOW_TOOL_IDS = \['cool-down', 'five-senses', 'crisis-kit'\]/);
  assert.equal(K.crisisKitSkillFor("build"), "crisis_kit_build");
  for (const f of [null, "crisis", "anything"]) assert.equal(K.crisisKitSkillFor(f), "crisis_kit_use", String(f));
});

test("card ids are a contract: every shipped option is still there (retire one, never rename or delete it)", () => {
  for (const [section, ids] of Object.entries(SHIPPED)) {
    const have = new Set((build.options[section] ?? []).map((o) => o.value));
    for (const id of ids) assert.ok(have.has(id), `${section}:${id} was removed or renamed`);
  }
  assert.deepEqual([...K.KIT_SECTIONS], Object.keys(SHIPPED), "the sections and their order (body first)");
});

test("no card is food, drink, shopping or scrolling, nothing promises how long a feeling lasts, and cold carries its caution", () => {
  const banned = /\b(eat|food|snack|chocolate|drink|wine|beer|alcohol|shop|buy|scroll|social media|until it passes|minutes? (it|this) lasts)/i;
  for (const section of K.KIT_SECTIONS) {
    for (const o of build.options[section]) {
      const words = `${o.label} ${o.how ?? ""}`;
      // "drinking" appears only in cold's caution line, which is a copy key, not the card.
      assert.ok(!banned.test(words), `${section}:${o.value}: ${words}`);
    }
  }
  const cold = build.options.body.find((o) => o.value === "cold");
  assert.equal(cold.caution, "cold_caution");
  assert.match(build.copy.cold_caution, /heart trouble/);
  assert.equal(use.copy.cold_caution, build.copy.cold_caution, "the same caution in both skills");
  const firstBody = content.skills.find((x) => x.id === "first_body");
  assert.equal(build.copy.cold_caution, firstBody.copy.cold_caution, "First, the body's line, one source");
  assert.match(build.options.body.find((o) => o.value === "breath_out").how, /Dizzy or tingly\? Stop/);
  // The safe place is the person's own: no starter card.
  assert.ok(build.options.place.every((o) => o.starter !== true));
  assert.ok(build.options.reasons.every((o) => o.starter !== true));
});

test("make it: one section per screen, every one skippable, own words on each; nothing picked → no keep", () => {
  let s = brun([]);
  const seen = [];
  for (const section of K.KIT_SECTIONS) {
    assert.equal(s.stepId, section);
    seen.push(section);
    const step = M.stepOf(build, section);
    assert.equal(step.fields[0].required, false, `${section} can be skipped`);
    assert.ok(step.fields[0].own, `${section} takes own words`);
    s = brun([next], bctx(), s);
  }
  assert.deepEqual(seen, [...K.KIT_SECTIONS]);
  assert.equal(s.stepId, "end", "nothing picked: no keep step");
  assert.match(M.handoffLine(bctx(), M.stepOf(build, "end"), s), /Nothing picked this time/);
});

test("make it: the keep is one crisis_kit, ids and own words per section; keeping again replaces it", () => {
  const s = brun([pick("body", "cold"), pick("body", "march"), next, next, pick("soothe", "warm"), next,
    own("words", "You can do hard things"), next, pick("place", "beach"), next, pick("reasons", "pet"), next]);
  assert.equal(s.stepId, "keep");
  const step = M.stepOf(build, "keep");
  assert.equal(M.copyText(bctx(), step.title, s), "Keep this kit? It opens from Help me now and from Tools.");
  assert.equal(M.copyText(bctx({}, { crisisKit: { id: "crisis_kit", bodyIds: ["feet"] } }), step.title, s), "Keep this kit? It replaces the one you have now.");
  const kept = M.keepFor(bctx(), step, M.runNext(bctx(), s, pick("keepit", "keep")));
  assert.equal(kept.kind, "crisis_kit");
  assert.deepEqual(kept.value, { bodyIds: ["cold", "march"], sootheIds: ["warm"], wordsOwn: "You can do hard things", placeIds: ["beach"], reasonsIds: ["pet"] });
  assert.equal(M.keepFor(bctx(), step, M.runNext(bctx(), s, pick("keepit", "not_now"))), null);
  const end = brun([pick("keepit", "keep"), next], bctx(), s);
  assert.match(M.handoffLine(bctx(), M.stepOf(build, "end"), end), /^It's kept\. Try one card on an ordinary hard day/);
  assert.deepEqual(offers(build, end, bctx()), ["open_kit"]);
  assert.equal(build.exits.find((x) => x.id === "open_kit").label, "open_kit");
  assert.equal(build.copy.open_kit, "Open my kit");
});

test("the crisis_kit kind: one per person, own words encrypted, at least one card, nothing unknown", async () => {
  const { PROFILE_KINDS } = await importTs("functions/src/profile/kinds.ts");
  const k = PROFILE_KINDS.crisis_kit;
  assert.equal(k.many, false, "one kit: keeping it again replaces it (its id is the kind)");
  assert.equal(k.slice, "crisisKit");
  assert.deepEqual([...k.ownFields].sort(), ["bodyOwn", "handsOwn", "placeOwn", "reasonsOwn", "sootheOwn", "wordsOwn"]);
  assert.deepEqual(k.validate({ bodyIds: ["cold"], wordsOwn: "Breathe" }), { bodyIds: ["cold"], wordsOwn: "Breathe" });
  assert.throws(() => k.validate({}), /at least one card/);
  assert.throws(() => k.validate({ bodyIds: [] }), /at least one card/);
  assert.throws(() => k.validate({ bodyIds: ["cold"], peopleIds: ["mum"] }), /Unexpected field/);
  assert.throws(() => k.validate({ placeIds: ["beach", "woods"] }), "one place");
  const types = readFileSync("functions/src/profile/types.ts", "utf8");
  assert.match(types, /'crisis-kit': \['crisisKit', 'prosCons', 'rebellionCards'\],/);
});

test("make it, flooded: a heads-up and a choice after the first screen; nothing locks", () => {
  const f = bctx({ band: "flooded" });
  const s = brun([next], f);
  assert.equal(s.stepId, "heads_up");
  for (const [v, to] of [["open", "settle"], ["settle", "settle"], ["go", "hands"]])
    assert.equal(brun([pick("heads_up", v), next], f, s).stepId, to, v);
  const settle = brun([pick("heads_up", "open"), next], f, s);
  assert.deepEqual(offers(build, settle, f), ["open_kit", "cool_down"]);
  assert.equal(M.stepOf(build, "settle").noClose, true);
});

test("open it: the deck, the close in the flow, then people; harder → the body, and someone to talk to", () => {
  assert.equal(use.start, "deck");
  const deck = M.stepOf(use, "deck");
  assert.equal(deck.embed, "kitDeck");
  assert.equal(deck.props.fromSkill, "crisis_kit_build");
  assert.equal(deck.props.prosSkill, "pros_cons");
  const close = urun([deckDone()]);
  assert.equal(close.stepId, "close");
  const f = M.stepOf(use, "close").fields[0];
  assert.equal(f.askFresh, "thenVsNow");
  const reach = urun([pick("close", "better"), next], uctx(), close);
  assert.equal(reach.stepId, "reach");
  assert.equal(M.copyText(uctx(), M.stepOf(use, "reach").title, reach), "Is there anyone you could call or text, even for a few minutes?");
  assert.deepEqual(offers(use, reach, uctx()), ["safety_open", "make_kit"], "no kit yet, from Tools: people, then make it yours");
  assert.deepEqual(offers(use, reach, uctx({}, { crisisKit: { id: "crisis_kit", bodyIds: ["cold"] } })), ["safety_open"], "a kit already: people only");
  assert.deepEqual(offers(use, reach, uctx({ frame: "crisis" })), ["safety_open"], "from a crisis route: never a building task");
  assert.deepEqual(offers(use, reach, uctx({ frame: "now" })), ["safety_open"], "from Help me now: never a building task");
  assert.equal(use.exits.find((x) => x.id === "make_kit").query.frame, "build");
  const harder = urun([pick("close", "worse"), next], uctx(), close);
  assert.equal(harder.stepId, "harder");
  assert.deepEqual(offers(use, harder, uctx()), ["safety_open", "cool_down"], "harder still ends with people, first");
  assert.equal(M.copyText(uctx(), M.stepOf(use, "harder").title, harder), "Is there anyone you could call or text, even for a few minutes?");
  for (const id of ["harder", "reach"]) assert.equal(M.stepOf(use, id).noClose, true, `${id}: the close was asked in the flow`);
});

test("from a crisis route the banner sits above every card; Talk to someone now is on every screen of both skills", () => {
  for (const s of use.steps) {
    const crisis = M.crisisFor(uctx({ frame: "crisis" }), s, urun([]));
    assert.equal(crisis?.variant, "crisis", `${s.id}: the banner, above the card (never in its place)`);
    assert.equal(M.crisisFor(uctx(), s, urun([])), null, `${s.id}: no banner without a crisis route`);
  }
  for (const sk of [use, build]) {
    for (const s of sk.steps) {
      const links = [...(s.links ?? []), ...(s.fields ?? []).flatMap((f) => f.links ?? [])].map((l) => l.exit);
      assert.ok(links.includes("safety_open"), `${sk.id}.${s.id}`);
    }
  }
});

test("the deck: a kept kit's own words first, body first, each next card a different kind, place and reasons as one card", () => {
  const kit = { id: "crisis_kit", bodyIds: ["cold", "march"], bodyOwn: "Stamp my feet", handsIds: ["count"], wordsIds: ["before"],
    placeIds: ["beach"], placeOwn: "Gran's kitchen in the morning", reasonsIds: ["pet", "people"], reasonsOwn: "My sister's wedding" };
  const { cards, starter } = K.kitCards(kit, build, COPY);
  assert.equal(starter, false);
  assert.deepEqual(cards.map((c) => c.id), ["body:own", "body:cold", "body:march", "hands:count", "words:before", "place:place", "reasons"]);
  assert.equal(cards[0].title, "Stamp my feet");
  assert.equal(cards[1].caution, build.copy.cold_caution);
  assert.equal(cards.find((c) => c.section === "place").title, "Gran's kitchen in the morning", "their words describe the place");
  assert.deepEqual(cards.find((c) => c.section === "reasons").lines, ["My sister's wedding", "My pet", "People I care about"]);
  assert.equal(cards.find((c) => c.section === "words").how, COPY.wordsHow);
  const order = K.deckOrder(cards, false);
  assert.deepEqual(order.map((c) => c.section), ["body", "hands", "words", "place", "reasons", "body", "body"]);
  assert.deepEqual(K.deckOutput(order.slice(0, 2), false), ["body", "hands"]);
});

test("the deck: no kit → the starter cards; flooded → body cards only, one and one swap; kept pros & cons cards join", () => {
  const { cards, starter } = K.kitCards(null, build, COPY);
  assert.equal(starter, true);
  assert.deepEqual([...new Set(cards.map((c) => c.section))], ["body", "hands", "soothe", "words"], "no starter place or reasons");
  assert.ok(cards.every((c) => build.options[c.section].find((o) => `${c.section}:${o.value}` === c.id)?.starter === true));
  const flooded = K.deckOrder(cards, true);
  assert.equal(flooded.length, 2);
  assert.ok(flooded.every((c) => c.section === "body"));
  assert.deepEqual(K.deckOutput(flooded.slice(0, 1), true), ["body", "starter"]);
  // A kit with nothing for the body, flooded: the deck has nothing of its own (the embed falls back to the starter's body cards).
  assert.deepEqual(K.deckOrder(K.kitCards({ wordsIds: ["before"] }, build, COPY).cards, true), []);
  // playDeck tops a flooded deck up to one and one swap from the starter's body cards.
  const empty = K.playDeck(K.kitCards({ wordsIds: ["before"] }, build, COPY), cards, true);
  assert.deepEqual(empty.order.map((c) => c.id), ["body:cold", "body:breath_out"]);
  assert.equal(empty.starter, true);
  const one = K.playDeck(K.kitCards({ bodyIds: ["march"] }, build, COPY), cards, true);
  assert.deepEqual(one.order.map((c) => c.id), ["body:march", "body:cold"], "their card first, one starter swap");
  assert.equal(one.starter, false);
  assert.equal(K.playDeck(K.kitCards({ bodyIds: ["march"] }, build, COPY), cards, false).order.length, 1, "not flooded: their kit as it is");
  assert.equal(K.kitHasCards({ bodyIds: [], wordsOwn: "  " }), false);
  const card = { id: "pc1", pullIds: ["send"], longIds: ["unsend"], longOwn: "I'll regret it", keepsIds: [] };
  const withPros = K.kitCards({ bodyIds: ["cold"] }, build, COPY, { cards: [card, { ...card, id: "pc2" }, { ...card, id: "pc3" }], skill: pros });
  const pc = withPros.cards.filter((c) => c.section === "pros_cons");
  assert.equal(pc.length, 2, "two kept cards at most");
  assert.deepEqual(pc[0].lines, ["I'll regret it", "I can't take it back once it's sent"]);
  assert.equal(pc[0].how, pros.copy.card_reasons, "the pros & cons skill's own label");
});

test("the hosts open it: crisis routes with frame=crisis, Hold to wait's use pull without; people come before the kit", () => {
  const all = content.skills;
  for (const id of ["hold_to_wait", "ride_it_out", "first_body", "pros_cons", "habit_plan"]) {
    const sk = all.find((s) => s.id === id);
    const x = sk.exits.find((e) => e.id === "crisis_kit");
    assert.ok(x && !x.planned, `${id}: the kit is built`);
    assert.deepEqual(x.query, { frame: "crisis" }, id);
    // Wherever the kit is offered on a not-safe card, someone to talk to is offered first (CORE-01's rule).
    for (const s of sk.steps) {
      const o = (s.offers ?? []).map((y) => y.exit);
      if (o.includes("crisis_kit") && ["reach", "someone", "harm"].includes(s.id))
        assert.ok(o.indexOf("safety_open") > -1 && o.indexOf("safety_open") < o.indexOf("crisis_kit"), `${id}.${s.id}`);
    }
  }
  const hold = all.find((s) => s.id === "hold_to_wait");
  assert.deepEqual(hold.exits.find((e) => e.id === "kit").query, {});
});

test("Make my crisis kit has its own card under Distress Tolerance beside the kit (Claudia, 12 Nov)", async () => {
  const { tools, getToolsByModule } = await importTs("src/data/tools.ts");
  const kit = tools.find((t) => t.id === "crisis-kit");
  assert.ok(getToolsByModule("distress-tolerance").some((t) => t.id === "crisis-kit"));
  assert.deepEqual(kit.moreCards.map((m) => [m.name, m.query]), [["Make my crisis kit for hard nights", "frame=build"]]);
  // The mode card leads with its own name even with official names on, so it never reads as a copy of the kit's card (Cludes, 12 Nov).
  assert.match(readFileSync("src/components/ToolCard.tsx", "utf8"), /\{mode \? mode\.name : label\(tool\)\}/);
  const page = readFileSync("src/pages/Tools.tsx", "utf8");
  assert.match(page, /\(tool\.moreCards \?\? \[\]\)\.map\(m => \(\{ key: `\$\{tool\.id\}:\$\{m\.key\}`, node: <ToolCard tool=\{tool\} mode=\{m\} \/> \}\)\)/);
  assert.match(readFileSync("src/components/ToolCard.tsx", "utf8"), /to=\{`\/tool\/\$\{tool\.id\}\$\{mode \? `\?\$\{mode\.query\}` : ''\}`\}/);
});
