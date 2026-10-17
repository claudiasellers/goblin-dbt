// The den's screen (docs/design/parts.md, "The den"): src/lib/den.ts (pure) and the room in
// src/components/parts/den/. Its server is pinned in tests/parts-den-data.test.mjs and functions/test/unit/den.test.cjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");
const den = await importTs("src/lib/den.ts");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
/** The fixture as the app reads parts.json once every row is signed off. */
const content = { prompts: fixture.prompts, options: fixture.options };

const A = "4a2c9a0e-1b2c-4d5e-8f90-123456789abc", B = "5b2c9a0e-1b2c-4d5e-8f90-123456789abc", C = "6c2c9a0e-1b2c-4d5e-8f90-123456789abc";

test("gate: every den line in the content, or nothing; the link needs two parts", () => {
  const copy = den.denCopy(content);
  assert.ok(copy, "the fixture carries every den line");
  for (const id of den.DEN_PROMPTS) assert.equal(typeof copy[id], "string", id);
  const missing = { ...content, prompts: { ...content.prompts } };
  delete missing.prompts.den_room;
  assert.equal(den.denCopy(missing), null);
  assert.equal(den.denCopy(null), null);
  assert.equal(den.showDenLink(1, copy), false);
  assert.equal(den.showDenLink(2, copy), true);
  assert.equal(den.showDenLink(5, null), false);
  assert.equal(den.DEN_PATH, "/me/parts/den");
  // The light is never labelled: no den line names the person or "Self".
  for (const id of den.DEN_PROMPTS) assert.doesNotMatch(copy[id], /\bself\b|\byou are the light\b/i, id);
});

test("placement: the person's places kept; the rest arrive round the edge of the light, overlapping nobody", () => {
  const spots = den.placeParts([
    { id: A, mapX: 0.2, mapY: 0.8 }, { id: B, mapX: null, mapY: null }, { id: C, mapX: null, mapY: 0.4 },
  ]);
  assert.deepEqual(spots.get(A), { x: 0.2, y: 0.8 });
  for (const id of [B, C]) {
    const s = spots.get(id);
    const r = Math.hypot(s.x - den.LIGHT.x, s.y - den.LIGHT.y);
    assert.ok(Math.abs(r - den.ARRIVE_RADIUS) < 1e-9, `${id} at the edge of the light`);
  }
  const all = [...spots.values()];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    assert.ok(Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y) >= den.MIN_GAP, "no overlap");
  }
  // Out-of-room places are kept inside the edge; the same input lays out the same way (positions survive a reload).
  assert.deepEqual(den.placeParts([{ id: A, mapX: 1, mapY: 0 }]).get(A), { x: 1 - den.EDGE, y: den.EDGE });
  const many = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, mapX: null, mapY: null }));
  assert.deepEqual([...den.placeParts(many)], [...den.placeParts(many)]);
});

test("light: near in the light, a while softer, not lately in the dusk; resting a little dimmer; never a number shown", () => {
  const near = den.figureLight("near", false), soft = den.figureLight("a_while", false), dusk = den.figureLight("not_lately", false);
  assert.ok(near.glow > soft.glow && soft.glow > dusk.glow && dusk.glow === 0);
  assert.ok(near.opacity > soft.opacity && soft.opacity > dusk.opacity);
  const resting = den.figureLight("near", true);
  assert.ok(resting.opacity < near.opacity && resting.glow < near.glow);
  const room = read("src/components/parts/den/DenRoom.tsx");
  assert.doesNotMatch(room, /recency\}|\{p\.recency\b(?!\s*\?)/, "the bucket is never rendered as text");
});

test("keyboard: Enter / Space picks up, arrows move, Enter puts down (a save), in place is a tap, Escape puts it back", () => {
  const s = { x: 0.5, y: 0.2 };
  const pick = den.denKey("Enter", A, s, null);
  assert.equal(pick.kind, "pick");
  const moved = den.denKey("ArrowRight", A, s, pick.held);
  assert.equal(moved.kind, "move");
  assert.deepEqual(moved.held.at, { x: 0.54, y: 0.2 });
  const down = den.denKey("ArrowDown", A, s, moved.held);
  assert.deepEqual(down.held.at, { x: 0.54, y: 0.24 });
  assert.deepEqual(den.denKey(" ", A, s, down.held), { kind: "drop", id: A, at: { x: 0.54, y: 0.24 } });
  assert.deepEqual(den.denKey("Enter", A, s, pick.held), { kind: "tap", id: A });
  assert.deepEqual(den.denKey("Escape", A, s, down.held), { kind: "cancel", id: A, at: s });
  assert.deepEqual(den.denKey("ArrowLeft", A, s, null), { kind: "none" }, "arrows move only a picked-up figure");
  assert.deepEqual(den.denKey("ArrowLeft", B, s, pick.held), { kind: "none" }, "only the one picked up");
  // The edge holds.
  let h = { id: A, from: { x: 0.1, y: 0.1 }, at: { x: 0.1, y: 0.1 } };
  for (let i = 0; i < 5; i++) h = den.denKey("ArrowUp", A, h.at, h).held;
  assert.equal(h.at.y, den.EDGE);
});

test("taps: one, then another opens the sheet; the same one again lets go; a covers_for has the front one as aId", () => {
  let sel = den.tapFigure(den.NO_SELECTION, A);
  assert.deepEqual(sel, { first: A, pair: null });
  assert.deepEqual(den.tapFigure(sel, A), den.NO_SELECTION);
  sel = den.tapFigure(sel, B);
  assert.deepEqual(sel, { first: null, pair: [A, B] });
  assert.deepEqual(den.tapFigure(sel, C), { first: C, pair: null }, "a new tap starts again");
  assert.deepEqual(den.coversForRequest(B, [A, B]), { kind: "covers_for", aId: B, bId: A });
  assert.deepEqual(den.coversForRequest(A, [A, B]), { kind: "covers_for", aId: A, bId: B });
  assert.deepEqual(den.twoPullsLink([A, B]), { pathname: "/tool/two-pulls", search: `?a=${A}&b=${B}` });
});

test("then and now: each past month's latest snapshot, never this month's, newest first", () => {
  const now = new Date(2026, 9, 17, 12);
  const at = (y, m, d) => new Date(y, m, d, 12).toISOString();
  const months = den.pastMonths([
    { id: "den_2026-10-02", takenAt: at(2026, 9, 2) }, { id: "den_2026-08-03", takenAt: at(2026, 7, 3) },
    { id: "den_2026-08-20", takenAt: at(2026, 7, 20) }, { id: "den_2026-07-01", takenAt: at(2026, 6, 1) },
  ], now);
  assert.deepEqual(months, [{ id: "den_2026-08-20", month: "2026-08" }, { id: "den_2026-07-01", month: "2026-07" }]);
  assert.deepEqual(den.pastMonths([{ id: "den_2026-10-02", takenAt: at(2026, 9, 2) }], now), []);
  assert.equal(den.thenLabel({ den_then: "How it looked in {month}" }, "July"), "How it looked in July");
});

test("the route: its own lazy chunk; the gate is parts on and DEN_REQUIRED, else back to Me", () => {
  const app = read("src/App.tsx");
  assert.match(app, /<Route path="\/me\/parts\/den" element=\{<Suspense fallback=\{null\}><LazyPartsDenPage \/><\/Suspense>\} \/>/);
  const page = read("src/components/parts/den/PartsDenPage.tsx");
  assert.match(page, /const partsOn = profile\.partsEnabled === true;/);
  assert.match(page, /if \(!partsOn \|\| content === 'failed' \|\| den === 'failed'\) return <Navigate to="\/profile" replace \/>;/);
  assert.match(page, /const copy = denCopy\(content\);\s+if \(!copy\) return <Navigate to="\/profile" replace \/>;/);
  assert.match(page, /if \(!partsOn\) return;\s+let live = true;/, "nothing fetched with parts off");
  assert.match(page, /twoPullsAvailable=\{!!getToolById\('two-pulls'\)\}/, "Two pulls is offered only once it is built");
  // Parts of me's link: above the cards, two parts, the den's copy.
  const me = read("src/components/me/PartsOfMe.tsx");
  assert.match(me, /\{den && showDenLink\(live\.length, den\) && \(\s+<Link to=\{DEN_PATH\}/);
});

test("the room: saves on drop, unlinks by id, the light is not a control, tender parts never uncovered, no motion but drag", () => {
  const room = read("src/components/parts/den/DenRoom.tsx");
  const view = read("src/components/parts/den/Den.tsx");
  assert.match(view, /await updatePartLayout\(\{ positions: \[\{ partId: id, mapX: at\.x, mapY: at\.y \}\] \}\);/);
  assert.match(view, /if \(before\) setSpots\(\(m\) => new Map\(m\)\.set\(id, before\)\);/, "a failed save puts it back");
  assert.match(view, /await unlinkParts\(\{ linkId: l\.id \}\);/);
  assert.match(view, /await linkParts\(coversForRequest\(frontId, sel\.pair\)\);/, "the link is written on the tap that says which is in front");
  assert.match(view, /\{safety && <div className="max-w-md mx-auto"><CrisisBanner compact \/><\/div>\}/, "alongside, under the room");
  assert.match(room, /<circle cx="50" cy="50" r="30" fill=\{`url\(#\$\{uid\}-lamp\)`\} data-den-light="" \/>/);
  assert.equal((room.match(/data-den-light/g) ?? []).length, 1);
  assert.doesNotMatch(room.slice(room.indexOf("data-den-light") - 120, room.indexOf("data-den-light")), /onClick|button/);
  assert.match(room, /\{p\.tender \? <TenderCover size=\{fig\} \/> : <PartFigure shapeSig=\{p\.shapeSig\} size=\{fig\} still \/>\}/);
  assert.doesNotMatch(room + view, /\btransition|\banimate[=-]|motion\/react/, "no motion on entry, no transitions");
  assert.match(room, /if \(r\.kind === 'drop'\) onMove\?\.\(id, r\.at\);/);
  assert.match(room, /if \(at\) \{ dragged\.current = true; onMove\?\.\(p\.id, at\); \}/, "a drop saves");
  assert.match(room, /onClick=\{\(\) => \{\s+if \(dragged\.current\) \{ dragged\.current = false; return; \}\s+onTap\?\.\(p\.id\);/, "a press and lift in place (or assistive tech's click) is a tap; a drag is not");
  // Set-aside parts never reach the room: the server sends active and resting only.
  assert.doesNotMatch(room + view, /set_aside/);
});
