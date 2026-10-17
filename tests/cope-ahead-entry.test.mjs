// The ways into Cope Ahead (docs/design/cope-ahead.md, *Where it starts*): the link contract
// (src/lib/copeAheadEntry.ts), the intent, DEAR MAN's summary link, Today's Rehearse the next time link, and
// their copy (cope-ahead.json). The links are walked on the review page (dev/review/copeAheadEntries.tsx,
// check.mjs checks every Cope Ahead href there).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");
const E = await importTs("src/lib/copeAheadEntry.ts");
const T = await importTs("src/data/tools.ts");
const CA = JSON.parse(read("src/data/content/cope-ahead.json")).content;
const ID = "0f8c2a9e-5b1d-4c3e-9a7f-2d6b8e4c1a03";
/** The shape check.mjs holds every rendered Cope Ahead link to. */
const HREF = /^#?\/tool\/cope-ahead(\?(first=[a-z][a-z0-9_]*(&part=[a-f0-9-]{36})?|part=[a-f0-9-]{36}))?$/i;

test("copeAheadLink: /tool/cope-ahead?first=<situationId>&part=<partId>, each left out when missing or malformed", () => {
  assert.equal(E.copeAheadLink({ situationId: "conversation", partId: ID }), `/tool/cope-ahead?first=conversation&part=${ID}`);
  assert.equal(E.copeAheadLink({ situationId: "someone" }), "/tool/cope-ahead?first=someone");
  assert.equal(E.copeAheadLink({ situationId: "conversation", partId: null }), "/tool/cope-ahead?first=conversation");
  assert.equal(E.copeAheadLink({ partId: ID }), `/tool/cope-ahead?part=${ID}`);
  assert.equal(E.copeAheadLink({}), "/tool/cope-ahead");
  assert.equal(E.copeAheadLink(), "/tool/cope-ahead");
  assert.equal(E.copeAheadLink({ situationId: "", partId: "" }), "/tool/cope-ahead");
  assert.equal(E.copeAheadLink({ situationId: "a b&c=d", partId: "not-an-id" }), "/tool/cope-ahead", "never an odd value in the address");
  for (const s of CA.situations) {
    for (const partId of [undefined, ID]) assert.match(E.copeAheadLink({ situationId: s.id, partId }), HREF, s.id);
  }
});

test("parseCopeAheadEntry: an unknown situation is dropped; a part only if it looks like an id", () => {
  const q = (s) => E.parseCopeAheadEntry(s, CA);
  assert.deepEqual(q(`?first=conversation&part=${ID}`), { firstSituationId: "conversation", presetPartId: ID });
  assert.deepEqual(q("first=someone"), { firstSituationId: "someone", presetPartId: null });
  assert.deepEqual(q(new URLSearchParams({ first: "someone", part: ID.toUpperCase() })), { firstSituationId: "someone", presetPartId: ID.toUpperCase() });
  assert.deepEqual(q(`?first=a_trip_to_mars&part=${ID}`), { firstSituationId: null, presetPartId: ID });
  assert.deepEqual(q("?first=conversation&part=runner"), { firstSituationId: "conversation", presetPartId: null });
  assert.deepEqual(q("?part=%3Cscript%3E"), { firstSituationId: null, presetPartId: null });
  assert.deepEqual(q(""), { firstSituationId: null, presetPartId: null });
  assert.deepEqual(q(null), { firstSituationId: null, presetPartId: null });
  assert.deepEqual(E.parseCopeAheadEntry("?first=conversation", null), { firstSituationId: null, presetPartId: null }, "no content, no situation");
  // Round trip: what the links send is what the page reads.
  for (const s of CA.situations) {
    const href = E.copeAheadLink({ situationId: s.id, partId: ID });
    assert.deepEqual(q(href.slice(href.indexOf("?"))), { firstSituationId: s.id, presetPartId: ID });
  }
  // The two situations the ways in use are in the content.
  for (const id of ["conversation", "someone"]) assert.ok(CA.situations.some((s) => s.id === id), id);
});

test("situationsWithFirst: the entry's situation first, the rest in their order; nothing pre-selected here", () => {
  const ids = CA.situations.map((s) => s.id);
  assert.deepEqual(E.situationsWithFirst(CA.situations, "someone").map((s) => s.id), ["someone", ...ids.filter((x) => x !== "someone")]);
  assert.deepEqual(E.situationsWithFirst(CA.situations, null).map((s) => s.id), ids);
  assert.deepEqual(E.situationsWithFirst(CA.situations, "nope").map((s) => s.id), ids);
});

test("the copy the ways in read ships in cope-ahead.json", () => {
  assert.deepEqual([...E.COPE_ENTRY_KEYS], ["entry_dear_man", "entry_recover"]);
  assert.equal(CA.copy.entry_dear_man, "Rehearse it");
  assert.equal(CA.copy.entry_recover, "Walk through it with Cope Ahead");
  assert.equal(CA.copy.settle_hold, "Hold while you breathe out, slowly.");
  assert.equal(CA.copy.settle_hold_hint, "Three times. Let go between them.");
  assert.equal(CA.copy.keep_failed, "Couldn't save that. Try again.");
  // Settle and KeepCard read them, with no stand-in in the code.
  assert.match(read("src/components/tools/copeAhead/Settle.tsx"), /label=\{copy\('settle_hold'\)\} hint=\{copy\('settle_hold_hint'\)\}/);
  assert.match(read("src/components/tools/copeAhead/KeepCard.tsx"), /\{copy\('keep_failed'\)\}<\/p>/);
  assert.doesNotMatch(read("src/components/tools/copeAhead/KeepCard.tsx"), /FAILED/);
});

test("the intent: Something's coming up that I'm dreading → Cope Ahead, after Ask someone; listed with its tool", () => {
  const i = T.allIntents.findIndex((x) => x.toolId === "cope-ahead");
  assert.ok(i > 0);
  assert.equal(T.allIntents[i].label, "Something's coming up that I'm dreading");
  assert.equal(T.allIntents[i - 1].toolId, "dear-man");
  assert.equal(T.allIntents.filter((x) => x.toolId === "cope-ahead").length, 1);
  // Shown while its tool is listed for everyone (Cope Ahead is link-only until its screens ship).
  const listed = T.getToolById("cope-ahead").listed === undefined;
  assert.equal(T.intents.some((x) => x.toolId === "cope-ahead"), listed);
  assert.deepEqual(T.intents, T.allIntents.filter((x) => T.getToolById(x.toolId).listed === undefined));
  for (const x of T.allIntents) assert.ok(T.getToolById(x.toolId), x.toolId);
});

test("the link: cope-ahead.json's label, the contract's href, nothing until the label is there", () => {
  const src = read("src/components/tools/copeAhead/CopeAheadEntryLink.tsx");
  assert.match(src, /<Link to=\{copeAheadLink\(entry\)\} data-cope-entry=\{copyKey\}/);
  assert.match(src, /getCopeAheadContent\(\)\.then\(\(c\) => \{ if \(live\) setLabel\(c\.copy\[copyKey\]\?\.trim\(\) \|\| null\); \}\)/);
  assert.match(src, /if \(!label\) return null;/);
  assert.match(src, /min-h-11/);
});

test("DEAR MAN: Rehearse it on the summary, beside How did it go?, the visit's part only with parts on", () => {
  const src = read("src/pages/tools/DearMan.tsx");
  const summary = src.slice(src.indexOf("if (phase === 'summary') {"), src.indexOf("After the conversation &rarr; How did it go?"));
  assert.match(summary, /<CopeAheadEntryLink copyKey="entry_dear_man" situationId="conversation" partId=\{partsOn \? copeAheadPartId : null\} \/>/);
  assert.equal(src.match(/<CopeAheadEntryLink /g).length, 1);
});

test("Recover: Today's Rehearse the next time gains Walk through it with Cope Ahead; the follow-up is unchanged", () => {
  const src = read("src/components/today/TodayCard.tsx");
  assert.match(src, /\{item\.type === RECOVER_FOLLOW_UP_TYPES\.rehearse && \(\s*<CopeAheadEntryLink copyKey="entry_recover" situationId="someone" \/>\s*\)\}/);
  assert.match(read("src/lib/spine/wrap.ts"), /rehearse: 'recover_rehearse',/);
  const spine = JSON.parse(read("src/data/content/spine.json")).content.followUpTypes.find((t) => t.id === "recover_rehearse");
  assert.equal(spine.resolveMode, "inline");
  assert.deepEqual(spine.choices.map((c) => c.id), ["did_it", "not_yet", "skip"]);
});

test("the review page shows both ways in, and check.mjs holds every Cope Ahead href to the contract's shape", () => {
  const rev = read("dev/review/copeAheadEntries.tsx");
  for (const id of ["dear_man", "dear_man_part", "today", "today_compact"]) assert.match(rev, new RegExp(`id: '${id}'`), id);
  assert.match(read("dev/review/surfaces.tsx"), /COPE_ENTRIES_SURFACE, \/\/ lane 2/);
  assert.match(read("dev/parts-review.tsx"), /copeHref: COPE_ENTRY_HREF,/);
  const check = read("dev/review/check.mjs");
  const m = check.match(/const COPE_HREF = (\/.*\/i);/);
  assert.ok(m, "check.mjs has COPE_HREF");
  assert.equal(m[1], HREF.toString());
  assert.match(check, /map\.copeHref\?\.\[v\.key\]/);
  // The shape refuses what the contract never sends.
  for (const bad of ["/tool/cope-ahead?first=", "/tool/cope-ahead?first=Conversation Plan", "/tool/cope-ahead?part=x", "/tool/cope-ahead?first=a&first=b", "/tool/cope-ahead&first=a"]) {
    assert.doesNotMatch(bad, HREF, bad);
  }
});
