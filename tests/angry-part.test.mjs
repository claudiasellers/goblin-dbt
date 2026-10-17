// The angry-part card's pure rules (src/lib/angryPart.ts): which wording each line takes for parts on / off,
// a first name or none, a hurt or "Not sure", and the order the hurts are offered in (Recover's event via
// CAN_TOUCH first, then hit back's OFTEN_GUARDS rank). Run over the generated parts content
// (tests/fixtures/parts-content.json, from scripts/parts/content.py).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const { angryCopyFrom, orderHurts } = await importTs("src/lib/angryPart.ts");
const { resolveAngryCopy } = await importTs("src/lib/angryPartCopy.ts");
const { ANGRY_LINES } = await importTs("src/data/partsTypes.ts");
const fixture = JSON.parse(readFileSync("tests/fixtures/parts-content.json", "utf8"));
const copy = angryCopyFrom(fixture);
// The fixture's CAN_TOUCH carries its review (by event); the hurt lists, drafts included, as orderHurts reads them.
const canTouch = Object.fromEntries(Object.entries(fixture.canTouch).map(([ev, t]) => [ev, t.hurts]));
const hurts = orderHurts(fixture.hurts, canTouch);
const brushed = hurts.find((h) => h.id === "brushed_off");
const strings = (r) => [r.unblend, r.unblendSub, r.protects, ...r.vote, r.hold, r.speak, r.speakLine, r.next, r.notSure, r.done, r.notNow].filter((s) => s !== null);
const ids = (list) => list.map((h) => h.id);

test("the copy: every line in both wordings and the three options, from the content", () => {
  for (const id of ANGRY_LINES) {
    assert.equal(copy[id], fixture.prompts[id].copy, id);
    assert.equal(copy[`${id}_plain`], fixture.prompts[`${id}_plain`].copy, `${id}_plain`);
  }
  assert.deepEqual([copy.angry_next, copy.angry_not_sure, copy.angry_done], ["Okay", "Not sure", "Done"]);
  // The card's own way past, one per wording (the host's skip link), never Recover's orient skip.
  assert.deepEqual([copy.angry_not_now, copy.angry_not_now_plain], ["Not now", "Not now"]);
  assert.equal(resolveAngryCopy(copy, { partsOn: true, name: null, hurt: null }).notNow, copy.angry_not_now);
  assert.equal(resolveAngryCopy(copy, { partsOn: false, name: "Sam", hurt: brushed }).notNow, copy.angry_not_now_plain);
  const missing = { ...fixture, prompts: { ...fixture.prompts } };
  delete missing.prompts.angry_vote_2_plain;
  assert.throws(() => angryCopyFrom(missing), /angry_vote_2_plain/, "a card with a blank line is worse than none");
});

test("parts on, with a name and a hurt: distanced self-talk in the person's name, the hurt's words", () => {
  const r = resolveAngryCopy(copy, { partsOn: true, name: "Sam", hurt: brushed });
  assert.equal(r.unblend, "A part of you is furious right now.");
  assert.equal(r.protects, "It's trying to protect something. What?");
  assert.deepEqual(r.vote, [
    "Sam, it's angry because being taken seriously matters to you.",
    "You don't have to let it drive, and you don't have to leave it behind.",
    "Sam can handle what comes next.",
  ]);
  assert.equal(r.speak, "If you say something, speak for it, not from it:");
  assert.equal(r.speakLine, "I felt brushed off.");
});

test("parts off, no name, not sure: second person, something here matters, no sentence to say", () => {
  const r = resolveAngryCopy(copy, { partsOn: false, name: null, hurt: null });
  assert.equal(r.unblend, "The anger is loud right now, and you're here too.");
  assert.deepEqual(r.vote, [
    "You're angry because something here matters to you.",
    "You don't have to let it drive, or pretend it isn't there.",
    "You can handle what comes next.",
  ]);
  assert.equal(r.speak, "If you say something, say what you felt, not what the anger wants to say.");
  assert.equal(r.speakLine, null);
});

test("every combination: slots filled, the name only when there is one, the hurt only when picked", () => {
  for (const partsOn of [true, false]) {
    for (const name of ["Sam", null, "  "]) {
      for (const hurt of [...hurts, null]) {
        const r = resolveAngryCopy(copy, { partsOn, name, hurt });
        const all = strings(r);
        const at = `partsOn ${partsOn}, name ${JSON.stringify(name)}, ${hurt?.id ?? "not sure"}`;
        for (const s of all) assert.doesNotMatch(s, /\{\w+\}/, `${at}: unfilled slot in "${s}"`);
        assert.equal(r.vote[0].startsWith("Sam, "), name === "Sam", `${at}: ${r.vote[0]}`);
        assert.equal(r.vote[2].startsWith("Sam "), name === "Sam", `${at}: ${r.vote[2]}`);
        if (hurt) {
          assert.ok(r.vote[0].includes(`because ${hurt.matters} matters`), `${at}: ${r.vote[0]}`);
          assert.equal(r.speakLine, `I felt ${hurt.feltPhrase}.`, at);
        } else {
          assert.ok(r.vote[0].includes("something here matters to you"), `${at}: ${r.vote[0]}`);
          assert.equal(r.speakLine, null, at);
        }
        // Parts on and off only ever differ by wording, never by which line is shown.
        const other = resolveAngryCopy(copy, { partsOn: !partsOn, name, hurt });
        assert.equal(other.speakLine === null, r.speakLine === null, at);
      }
    }
  }
});

test("parts off never says part (a whole word: 'apart' is fine); parts on does", () => {
  for (const name of ["Sam", null]) {
    for (const hurt of [...hurts, null]) {
      for (const s of strings(resolveAngryCopy(copy, { partsOn: false, name, hurt }))) {
        assert.doesNotMatch(s, /\bparts?\b/i, `parts off: "${s}"`);
      }
    }
  }
  const on = resolveAngryCopy(copy, { partsOn: true, name: null, hurt: null });
  assert.match(on.unblend, /\bpart\b/);
  assert.match(on.vote[0], /\bpart\b/);
});

test("hurt order without a Recover state: hit back's OFTEN_GUARDS rank, then the rest in content order", () => {
  assert.deepEqual(ids(hurts), ["brushed_off", "made_small", "laughed_at", "not_mattering", "left_out", "alone_in_this"]);
  assert.deepEqual(ids(orderHurts(fixture.hurts, canTouch, null)), ids(hurts));
  assert.deepEqual(ids(orderHurts(fixture.hurts, canTouch, "no_such_state")), ids(hurts));
  // A state CAN_TOUCH holds (no hurt names it) keeps the default order.
  assert.deepEqual(ids(orderHurts(fixture.hurts, canTouch, "blocked")), ids(hurts));
  assert.deepEqual(Object.keys(hurts[0]).sort(), ["feltPhrase", "id", "label", "matters"], "what the card needs, nothing else");
});

test("hurt order with a Recover state: what it can touch first, in CAN_TOUCH order, each hurt once", () => {
  assert.deepEqual(ids(orderHurts(fixture.hurts, canTouch, "ignored")),
    ["left_out", "not_mattering", "brushed_off", "made_small", "laughed_at", "alone_in_this"]);
  assert.deepEqual(ids(orderHurts(fixture.hurts, canTouch, "leaving")),
    ["left_out", "alone_in_this", "brushed_off", "made_small", "laughed_at", "not_mattering"]);
  assert.deepEqual(ids(orderHurts(fixture.hurts, canTouch, "mocked")),
    ["laughed_at", "brushed_off", "made_small", "not_mattering", "left_out", "alone_in_this"]);
  for (const state of Object.keys(canTouch)) {
    const order = ids(orderHurts(fixture.hurts, canTouch, state));
    assert.equal(new Set(order).size, 6, state);
    assert.deepEqual(order.slice(0, canTouch[state].length), canTouch[state], state);
  }
  // A CAN_TOUCH id the content doesn't have is dropped, never shown as an empty chip.
  assert.deepEqual(ids(orderHurts(fixture.hurts, { x: ["gone", "made_small"] }, "x")).slice(0, 2), ["made_small", "brushed_off"]);
});

// ---- Recover's host: is the card ready, from the shipped (signed-off only) parts content ----
const { angryReady, angryPromptIds, angryOptionIds } = await importTs("src/lib/angryPart.ts");
const { getPartsContent } = await importTs("src/services/partsContent.ts");
const { partsFromFixture } = await import("./lib/partsContentFixture.mjs");
const ANGRY_OPTION_IDS = ["angry_next", "angry_not_sure", "angry_done", "angry_back", "angry_vote_next"];
/** parts.json as it would be with these ids signed off (and everything else as the fixture has it). */
const shippedWith = (ids) => partsFromFixture(fixture, (id) => ids.has(id) || ["hit_back", ...fixture.hurts.map((h) => h.id)].includes(id));

test("ready: today nothing is signed off, so the shipped file never shows the card", async () => {
  const shipped = await getPartsContent();
  const signed = (id) => fixture.prompts[id]?.reviewStatus === "approved";
  assert.equal(angryReady(shipped, true), angryPromptIds(true).every(signed));
  assert.equal(angryReady(shipped, false), angryPromptIds(false).every(signed));
});

test("ready: only the person's wording is needed, every option, and complete hurts", () => {
  assert.deepEqual(angryOptionIds(true), [...ANGRY_OPTION_IDS, "angry_not_now"]);
  assert.deepEqual(angryOptionIds(false), [...ANGRY_OPTION_IDS, "angry_not_now_plain"]);
  const on = new Set([...angryPromptIds(true), ...angryOptionIds(true)]);
  const off = new Set([...angryPromptIds(false), ...angryOptionIds(false)]);
  assert.equal(angryReady(shippedWith(on), true), true);
  assert.equal(angryReady(shippedWith(on), false), false, "parts off needs its own _plain lines");
  assert.equal(angryReady(shippedWith(off), false), true);
  assert.equal(angryReady(shippedWith(off), true), false);
  // One line or one option missing: no card at all, never half of one.
  const lessLine = new Set(on); lessLine.delete("angry_vote_unsure");
  assert.equal(angryReady(shippedWith(lessLine), true), false);
  const lessOption = new Set(on); lessOption.delete("angry_not_sure");
  assert.equal(angryReady(shippedWith(lessOption), true), false);
  // Its own "Not now" in the person's wording: without it the card has no way past, so it doesn't show.
  const noWayPast = new Set(on); noWayPast.delete("angry_not_now");
  assert.equal(angryReady(shippedWith(noWayPast), true), false);
  const offNoWayPast = new Set(off); offNoWayPast.delete("angry_not_now_plain");
  offNoWayPast.add("angry_not_now");
  assert.equal(angryReady(shippedWith(offNoWayPast), false), false, "the other wording's Not now doesn't stand in");
  // Hurts: none signed off, or one without its matters, is not ready.
  const content = shippedWith(on);
  assert.equal(angryReady({ ...content, hurts: [] }, true), false);
  assert.equal(angryReady({ ...content, hurts: content.hurts.map((h, i) => (i ? h : { ...h, matters: undefined })) }, true), false);
  // The copy for one wording builds from that wording alone; the resolver never reads the other.
  const copyOff = angryCopyFrom(shippedWith(off), false);
  assert.equal(copyOff.angry_unblend, "", "the parts wording isn't shipped and isn't needed");
  assert.equal(copyOff.angry_not_now, "");
  assert.equal(copyOff.angry_not_now_plain, "Not now");
  const r = resolveAngryCopy(copyOff, { partsOn: false, name: "Sam", hurt: brushed });
  for (const s of strings(r)) assert.ok(s.length > 0 && !/\bparts?\b/i.test(s), `parts off: "${s}"`);
  assert.throws(() => angryCopyFrom(shippedWith(off), true), /no prompt angry_unblend/);
});

test("orderHurts offers only complete hurts", () => {
  const partial = fixture.hurts.map((h) => (h.id === "made_small" ? { ...h, matters: "" } : h));
  assert.deepEqual(ids(orderHurts(partial, {})), ["brushed_off", "laughed_at", "not_mattering", "left_out", "alone_in_this"]);
});

test("Recover's event orders the hurts from the shipped canTouch: approved edges only, shipped hurts only", () => {
  const on = new Set([...angryPromptIds(true), ...angryOptionIds(true)]);
  // Nothing signed off: no event ships, so Recover's order is hit back's.
  assert.deepEqual(shippedWith(on).canTouch, {});
  assert.deepEqual(ids(orderHurts(shippedWith(on).hurts, shippedWith(on).canTouch, "ignored")), ids(hurts));
  // "ignored" signed off: its hurts lead, in CAN_TOUCH order; "leaving" (not signed off) keeps the default.
  const content = shippedWith(new Set([...on, "ignored"]));
  assert.deepEqual(content.canTouch, { ignored: ["left_out", "not_mattering"] });
  assert.deepEqual(ids(orderHurts(content.hurts, content.canTouch, "ignored")),
    ["left_out", "not_mattering", "brushed_off", "made_small", "laughed_at", "alone_in_this"]);
  assert.deepEqual(ids(orderHurts(content.hurts, content.canTouch, "leaving")), ids(hurts));
  // A hurt that doesn't ship leaves its event's list; an event left with none is absent.
  const fewer = partsFromFixture(fixture, (id) => on.has(id) || ["hit_back", "ignored", "mocked", "brushed_off", "not_mattering"].includes(id));
  assert.deepEqual(fewer.canTouch, { ignored: ["not_mattering"] });
});

test("Recover hands the card its own Not now and the shipped canTouch", () => {
  const src = readFileSync("src/pages/tools/InvalidationRecovery.tsx", "utf8");
  assert.match(src, /skipLabel=\{angry\.copy\[angryNotNowId\(angry\.partsOn\)\]\}/);
  assert.match(src, /orderHurts\(parts\.hurts, parts\.canTouch, merged\.stateId\)/);
  assert.doesNotMatch(src, /_not_now'|NO_CAN_TOUCH/, "no fallback to other flows' Not now, no empty CAN_TOUCH");
});

// ---- "Spend a minute with it later?" (parts on only) ----
const { angryLaterCopy, ANGRY_MOVE } = await importTs("src/lib/angryPart.ts");

test("later: parts on and both lines shipped, else absent; the plain wording never shows it", () => {
  const on = new Set([...angryPromptIds(true), ...angryOptionIds(true)]);
  const both = shippedWith(new Set([...on, "angry_later", "angry_later_done"]));
  assert.deepEqual(angryLaterCopy(both, true), { ask: "Spend a minute with it later?", done: "It's in Me when you want it." });
  assert.equal(angryLaterCopy(both, false), null, "parts off: no later line, whatever ships");
  assert.equal(angryLaterCopy(shippedWith(new Set([...on, "angry_later"])), true), null, "its done line missing");
  assert.equal(angryLaterCopy(shippedWith(new Set([...on, "angry_later_done"])), true), null, "its ask missing");
  assert.equal(angryLaterCopy(shippedWith(on), true), null);
  // The card is ready without it: the later line is extra, never a reason to hide the card.
  assert.equal(angryReady(shippedWith(on), true), true);
});

test("later: the yes queues a candidate for the fight pull's move, records angryLater, and never blocks Done", () => {
  // Recover's fight pull expresses hit back (content.py EXPRESSES PullOption).
  assert.match(readFileSync("scripts/parts/content.py", "utf8"), new RegExp(`"recover_fight":\\s+\\("${ANGRY_MOVE}",`));
  const recover = readFileSync("src/pages/tools/InvalidationRecovery.tsx", "utf8");
  assert.match(recover, /queuePartCandidate\(\{ id: laterId\.current, origin: 'angry_card', moveIds: \[ANGRY_MOVE\] \}\)/);
  assert.match(recover, /laterId\.current \?\?= newId\(\);/, "one id per visit: a retry is the same record");
  assert.match(recover, /await queuePartCandidate[^\n]*\n\s*toolSession\.setExt\(\{ wmp: \{ angryLater: true \} \}\);/, "recorded only once queued");
  assert.match(recover, /later: angryLaterCopy\(parts, partsOn\)/);
  const card = readFileSync("src/components/parts/AngryPartCard.tsx", "utf8");
  assert.match(card, /\{partsOn && later && onLater && \(/);
  assert.match(card, /onLater\(\)\.then\(\(\) => setLaterState\('done'\), \(\) => setLaterState\('ask'\)\)/, "a failed call leaves the button");
  // Done comes first and is never disabled by the later line.
  const speak = card.slice(card.indexOf("{step === 'speak' && ("));
  assert.ok(speak.indexOf("{c.done}") < speak.indexOf("later.ask"));
});
