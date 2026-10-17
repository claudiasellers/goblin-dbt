// "Say something to it" (17 Oct): the words and gate (src/lib/sayToPart.ts), the card in Parts of me (its
// button, panel and quiet "You told it" line) and Meet a part's step after Thanks. The callable is pinned in
// functions/test/unit/sayToPart.test.cjs; the step machine's skip rules in tests/meet-a-part-flow.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { lintPartsCopy } from "../scripts/voice-lint.mjs";

const read = (f) => readFileSync(f, "utf8");
const L = await importTs("src/lib/sayToPart.ts");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const content = { prompts: fixture.prompts, options: fixture.options };
const PID = "4a2c9a0e-1b2c-4d5e-8f90-123456789abc";
const MID = "9b1c2d3e-4f50-4a6b-8c7d-0e1f2a3b4c5d";

test("the gate: every line and both chip sets, or nothing shows; the story line has its own", () => {
  assert.ok(L.sayCopy(content), "the fixture has it all");
  assert.equal(L.sayCopy(null), null);
  for (const id of L.SAY_TO_PART_REQUIRED.prompts) {
    const prompts = { ...content.prompts };
    delete prompts[id];
    assert.equal(L.sayCopy({ ...content, prompts }), null, id);
  }
  const noTender = { ...content, options: { ...content.options, say: { say: content.options.say.say } } };
  assert.equal(L.sayCopy(noTender), null, "the gentle set is required too");
  assert.equal(L.sayStoryLine(content), "In {month} you told it: {said}");
  const noStory = { ...content, prompts: { ...content.prompts } };
  delete noStory.prompts.say_story;
  assert.equal(L.sayStoryLine(noStory), null);
  assert.ok(L.sayCopy(noStory), "the card and the Meet step never wait on the story line");
});

test("the question names the part, or says 'this part'; the chips: the usual set, the gentle one for a tender part", () => {
  const copy = L.sayCopy(content);
  assert.equal(L.sayQuestion(copy, "The Guard"), "What would you like to say to The Guard?");
  assert.equal(L.sayQuestion(copy, "  "), "What would you like to say to this part?");
  assert.equal(L.sayQuestion(copy, null), "What would you like to say to this part?");
  const usual = L.sayChoices(content, false);
  assert.deepEqual(usual.chips.map((o) => o.label), ["Thank you for trying", "I've got this one", "You can rest now", "I'm listening", "I see how hard you work"]);
  assert.equal(usual.own?.id, "say_own");
  const gentle = L.sayChoices(content, true);
  assert.deepEqual(gentle.chips.map((o) => o.label), ["I'm here", "You're safe with me now", "I'm listening"]);
  assert.equal(gentle.own?.id, "say_tender_own", "own words are allowed everywhere");
  for (const o of gentle.chips) assert.ok(!["say_rest", "say_got_this"].includes(o.id), "nothing asks a tender part to step back");
});

test("the request: exactly one of a chip or own words (trimmed, ≤ 140); nothing to send is null", () => {
  assert.deepEqual(L.sayRequest(MID, PID, { chipId: "say_thanks" }), { id: MID, partId: PID, chipId: "say_thanks" });
  assert.deepEqual(L.sayRequest(MID, PID, { own: "  thank you  " }), { id: MID, partId: PID, own: "thank you" });
  assert.equal(L.sayRequest(MID, PID, { own: "x".repeat(200) }).own.length, L.SAY_OWN_MAX);
  assert.equal(L.sayRequest(MID, PID, { own: "   " }), null);
  assert.equal(L.sayRequest(MID, PID, { chipId: "" }), null);
});

test("the card's line: 'You told it: …' with the chip's label or their own words (set apart), else nothing", () => {
  const copy = L.sayCopy(content);
  assert.deepEqual(L.toldLine(copy, content, { chipId: "say_thanks", own: null, at: "2026-10-01T10:00:00Z" }),
    { before: "You told it: ", words: "Thank you for trying", after: "", own: false });
  assert.deepEqual(L.toldLine(copy, content, { chipId: "say_safe", own: null, at: "2026-10-01T10:00:00Z" }).words, "You're safe with me now", "either set");
  assert.deepEqual(L.toldLine(copy, content, { chipId: null, own: "I hear you", at: "2026-10-01T10:00:00Z" }),
    { before: "You told it: ", words: "I hear you", after: "", own: true });
  assert.equal(L.toldLine(copy, content, { chipId: "gone_chip", own: null, at: "2026-10-01T10:00:00Z" }), null, "a chip that no longer ships");
  assert.equal(L.toldLine(copy, content, undefined), null);
});

test("the copy lints clean (the prompt in the app's voice, the chips in the person's) and fits", () => {
  // The say rows as the build writes them for the voice lint.
  const ids = [...L.SAY_TO_PART_REQUIRED.prompts, "say_story"];
  const cy = read("schema/parts.cypher");
  const all = [...cy.matchAll(/^\/\/ @parts-copy-json (.+)$/gm)].flatMap((m) => JSON.parse(m[1]));
  const say = all.filter((r) => ids.includes(r.id) || L.SAY_TO_PART_REQUIRED.options.includes(r.id));
  assert.equal(say.length, ids.length + L.SAY_TO_PART_REQUIRED.options.length, "every say row is linted");
  assert.deepEqual(lintPartsCopy(say), []);
  for (const r of say.filter((x) => L.SAY_TO_PART_REQUIRED.options.includes(x.id))) assert.equal(r.kind, "chip", r.id);
});

test("Parts of me: a text button on each active or resting card, the panel in place, the latest line under the readouts", () => {
  const src = read("src/components/me/PartsOfMe.tsx");
  assert.match(src, /const say = sayCopy\(content\);/);
  assert.match(src, /<PartCard [^>]*say=\{say\}/);
  assert.match(src, /\{say && \(\s+<button ref=\{sayButton\} type="button" aria-expanded=\{saying\}[\s\S]{0,80}?className=\{quiet\}>\s+\{say\.say_open\}/);
  // Under the readouts (after the felt row), quiet, own words in the serif; the latest (just said here, else getMe's).
  const card = src.slice(src.indexOf("function PartCard"), src.indexOf("function SayPanel"));
  assert.ok(card.indexOf("stats?.felt") < card.indexOf('data-testid="part-told"'), "under the readouts");
  assert.ok(card.indexOf('data-testid="part-told"') < card.indexOf("{copy.card_visit}"), "above the actions");
  assert.match(card, /const told = say \? toldLine\(say, content, justTold \?\? part\.told\) : null;/);
  assert.match(card, /className=\{told\.own \? 'font-serif text-base' : ''\}/);
  // The panel: the gentle set for a tender part; a failed write changes nothing; focus back to the button.
  assert.match(card, /<SayPanel partId=\{partId\} name=\{part\.name\} tender=\{part\.tender\}/);
  assert.match(card, /sayButton\.current\?\.focus\(\{ preventScroll: true \}\)/);
  const panel = src.slice(src.indexOf("function SayPanel"), src.indexOf("function CheckBack"));
  assert.match(panel, /sayChoices\(content, tender\)/);
  assert.match(panel, /maxLength=\{SAY_OWN_MAX\}/);
  assert.match(panel, /catch \{ \/\* unchanged: the chips stay \*\/ \}/);
  // Set-aside rows never get it.
  const row = src.slice(src.indexOf("function SetAsideRow"));
  assert.doesNotMatch(row, /say/i);
});

test("getMe and the card: the latest message rides on active and resting parts only", () => {
  const types = read("src/services/profile.ts");
  assert.match(types, /told\?: PartMessageLine;/);
});

test("Meet a part: the say step after Thanks, the gentle set on the tender path or a tender part, never waiting on the write", () => {
  const page = read("src/pages/tools/MeetAPart.tsx");
  assert.match(page, /\.\.\.\(say \? \{ sayReady: true \} : \{\}\)/);
  const step = page.slice(page.indexOf("case 'say': {"), page.indexOf("case 'rather':"));
  assert.match(step, /sayChoices\(parts, s\.tender \|\| to\?\.tender === true\)/);
  assert.match(step, /void sayToPart\(req\)\.catch/);
  assert.match(step, /send\(\{ type: 'said' \}\)/);
  assert.match(step, /max=\{SAY_OWN_MAX\}/);
});
