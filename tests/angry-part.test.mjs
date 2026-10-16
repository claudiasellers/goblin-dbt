// The angry-part card's pure rules (src/lib/angryPart.ts): which wording each line takes for parts on / off,
// a first name or none, a hurt or "Not sure", and the order the hurts are offered in (Recover's event via
// CAN_TOUCH first, then hit back's OFTEN_GUARDS rank). Run over the generated parts content
// (tests/fixtures/parts-content.json, from scripts/parts/content.py).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const { angryCopyFrom, orderHurts, resolveAngryCopy } = await importTs("src/lib/angryPart.ts");
const { ANGRY_LINES } = await importTs("src/data/partsTypes.ts");
const fixture = JSON.parse(readFileSync("tests/fixtures/parts-content.json", "utf8"));
const copy = angryCopyFrom(fixture);
const hurts = orderHurts(fixture.hurts, fixture.canTouch);
const brushed = hurts.find((h) => h.id === "brushed_off");
const strings = (r) => [r.unblend, r.unblendSub, r.protects, ...r.vote, r.hold, r.speak, r.speakLine, r.next, r.notSure, r.done].filter((s) => s !== null);
const ids = (list) => list.map((h) => h.id);

test("the copy: every line in both wordings and the three options, from the content", () => {
  for (const id of ANGRY_LINES) {
    assert.equal(copy[id], fixture.prompts[id].copy, id);
    assert.equal(copy[`${id}_plain`], fixture.prompts[`${id}_plain`].copy, `${id}_plain`);
  }
  assert.deepEqual([copy.angry_next, copy.angry_not_sure, copy.angry_done], ["Okay", "Not sure", "Done"]);
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
  assert.deepEqual(ids(orderHurts(fixture.hurts, fixture.canTouch, null)), ids(hurts));
  assert.deepEqual(ids(orderHurts(fixture.hurts, fixture.canTouch, "no_such_state")), ids(hurts));
  // A state CAN_TOUCH holds (no hurt names it) keeps the default order.
  assert.deepEqual(ids(orderHurts(fixture.hurts, fixture.canTouch, "blocked")), ids(hurts));
  assert.deepEqual(Object.keys(hurts[0]).sort(), ["feltPhrase", "id", "label", "matters"], "what the card needs, nothing else");
});

test("hurt order with a Recover state: what it can touch first, in CAN_TOUCH order, each hurt once", () => {
  assert.deepEqual(ids(orderHurts(fixture.hurts, fixture.canTouch, "ignored")),
    ["left_out", "not_mattering", "brushed_off", "made_small", "laughed_at", "alone_in_this"]);
  assert.deepEqual(ids(orderHurts(fixture.hurts, fixture.canTouch, "leaving")),
    ["left_out", "alone_in_this", "brushed_off", "made_small", "laughed_at", "not_mattering"]);
  assert.deepEqual(ids(orderHurts(fixture.hurts, fixture.canTouch, "mocked")),
    ["laughed_at", "brushed_off", "made_small", "not_mattering", "left_out", "alone_in_this"]);
  for (const state of Object.keys(fixture.canTouch)) {
    const order = ids(orderHurts(fixture.hurts, fixture.canTouch, state));
    assert.equal(new Set(order).size, 6, state);
    assert.deepEqual(order.slice(0, fixture.canTouch[state].length), fixture.canTouch[state], state);
  }
  // A CAN_TOUCH id the content doesn't have is dropped, never shown as an empty chip.
  assert.deepEqual(ids(orderHurts(fixture.hurts, { x: ["gone", "made_small"] }, "x")).slice(0, 2), ["made_small", "brushed_off"]);
});
