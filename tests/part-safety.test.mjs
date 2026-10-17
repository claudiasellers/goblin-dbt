// The part safety seam (docs/design/parts.md, *The vocabulary* and *Safety*): a part whose moves include a
// `safetyLine` move, or that carries a `danger` fear, shows the app's CrisisBanner alongside its card, its
// check-backs and a visit to it, never instead; never on the tag row. One seam
// (functions/src/safety/partSafetyFlag.ts), mirrored in src/lib/partSafetyFlag.ts.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture } from "./lib/partsContentFixture.mjs";

const read = (f) => readFileSync(f, "utf8");
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const server = await importTs("functions/src/safety/partSafetyFlag.ts");
const client = await importTs("src/lib/partSafetyFlag.ts");
const { CrisisBanner } = await importTs("src/components/safety/CrisisBanner.tsx");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const ALL = partsFromFixture(fixture, () => true);

const CONTENT = {
  moves: [{ id: "turn_on_myself", safetyLine: true }, { id: "hide", safetyLine: false }, { id: "chase" }],
  fears: [{ id: "turn_fear_hurt_myself", flag: "danger" }, { id: "hide_fear_regret", flag: null }, { id: "small_fear_burden", flag: "tender" }],
};
const CASES = [
  [{ moveIds: ["turn_on_myself"], fearIds: [] }, true, "a safety-line move"],
  [{ moveIds: ["hide"], fearIds: ["turn_fear_hurt_myself"] }, true, "a danger fear"],
  [{ moveIds: ["hide", "chase"], fearIds: ["hide_fear_regret", "small_fear_burden"] }, false, "neither (a tender fear is not danger)"],
  [{ moveIds: [], fearIds: [] }, false, "nothing"],
  [{ moveIds: ["unknown"], fearIds: ["unknown"] }, false, "ids content doesn't know"],
];

test("the seam: a safety-line move or a danger fear flags a part; neither doesn't; server and client agree", () => {
  for (const [part, want, why] of CASES) {
    assert.equal(server.partSafetyFlag(part, CONTENT), want, why);
    assert.equal(client.partSafetyFlag(part, CONTENT), server.partSafetyFlag(part, CONTENT), `agree: ${why}`);
  }
  // The same function body on both sides.
  const body = (f) => read(f).slice(read(f).indexOf("export interface PartSafetyContent"), read(f).indexOf("return part.moveIds.some"));
  assert.equal(body("src/lib/partSafetyFlag.ts"), body("functions/src/safety/partSafetyFlag.ts"));
});

test("the seam reads content, never a hard-coded id: the fixture's safety-line move and danger fears flag", () => {
  const lines = fixture.moves.filter((m) => m.safetyLine).map((m) => m.id);
  assert.ok(lines.length > 0, "content has a safety-line move");
  for (const id of lines) assert.equal(client.partSafetyFromContent({ moveIds: [id], fearIds: [] }, ALL), true, id);
  const danger = Object.values(ALL.options).flatMap((s) => Object.values(s).flat()).filter((o) => o.flag === "danger").map((o) => o.id);
  assert.ok(danger.length > 0, "content has danger fears");
  for (const id of danger) assert.equal(client.partSafetyFromContent({ moveIds: [], fearIds: [id] }, ALL), true, id);
  assert.equal(client.partSafetyFromContent({ moveIds: ["hide"], fearIds: [] }, ALL), false);
  for (const f of ["functions/src/safety/partSafetyFlag.ts", "src/lib/partSafetyFlag.ts"]) {
    assert.doesNotMatch(read(f), /turn_on_myself|_fear_/, `${f}: no move or fear id`);
  }
  const q = server.partSafetyCypher("p");
  assert.match(q, /\(p\)-\[:USES\]->\(sm:ProtectiveMove\) WHERE sm\.safetyLine = true/);
  assert.match(q, /so\.flag = 'danger' AND so\.id IN coalesce\(p\.fearIds, \[\]\)/);
  assert.doesNotMatch(q, /tender|reviewStatus/, "a tender part's fears count; content can only add a banner");
});

test("the flag rides on the parts slice, getMe's part and the check-back's part, computed server-side", () => {
  const seam = "${partSafetyCypher('p')}";
  assert.ok(read("functions/src/profile/slices.ts").includes(`${seam} AS safety`), "parts slice");
  assert.ok(read("functions/src/profile/me.ts").includes(`CASE type(r) WHEN 'HAS_PART' THEN ${seam} ELSE false END AS safety`), "getMe");
  assert.match(read("functions/src/parts/checkback.ts"), /part: \{ id: part\.id, name: part\.name, tender: part\.tender, safety: part\.safety \}/);
  for (const f of ["functions/src/profile/types.ts", "src/data/profileTypes.ts"]) assert.match(read(f), /\n {4}safety: boolean;\n/, f);
});

test("CrisisBanner is the one crisis seam: the numbers live only there; compact is the same resources", () => {
  const files = walk("src").filter((f) => /\.(ts|tsx|json)$/.test(f) && f !== join("src", "components", "safety", "CrisisBanner.tsx"));
  for (const f of files) assert.doesNotMatch(read(f), /\b988\b|741741|Crisis Lifeline/, f);
  assert.doesNotMatch(read("scripts/parts/content.py"), /\b988\b|741741|Lifeline/, "no crisis copy in parts content");
  const full = renderToStaticMarkup(h(CrisisBanner));
  const compact = renderToStaticMarkup(h(CrisisBanner, { compact: true }));
  for (const html of [full, compact]) {
    assert.match(html, /href="tel:988"/);
    assert.match(html, /href="sms:741741\?body=HELLO"/);
  }
  assert.match(compact, /data-testid="crisis-banner-compact"/);
  assert.doesNotMatch(compact, /We hear you|🆘/, "quiet: no heading, no emoji");
});

test("the check-back card: the banner under the answers, alongside them, only for a flagged part (and its aftercare)", () => {
  // (Rendering the card pulls in firebase; the card is checked from its source, CrisisBanner by rendering above.)
  const card = read("src/components/parts/PartCheckbackCard.tsx");
  assert.match(card, /const crisis = item\.part\?\.safety === true \|\| item\.parts\?\.some\(\(p\) => p\.safety === true\) \? <div className="mt-3"><CrisisBanner compact \/><\/div> : null;/, "either of Two pulls' parts too");
  assert.equal((card.match(/\{crisis\}/g) ?? []).length, 2, "the card and its aftercare");
  const main = card.slice(card.indexOf('data-testid="part-checkback"'));
  assert.ok(main.indexOf("checkbackChoices(content).map") < main.indexOf("{crisis}"), "after the answers, which all stay");
  const after = card.slice(card.indexOf('data-testid="part-checkback-aftercare"'), card.indexOf('data-testid="part-checkback"'));
  assert.ok(after.indexOf("after.notNow") < after.indexOf("{crisis}"), "after the aftercare's own choices");
  assert.doesNotMatch(card, /if \([^)]*safety[^)]*\) return/, "never instead of the card");
});

test("Parts of me: the banner under the card's actions (its 30-day check-back is inside the card, above)", () => {
  const me = read("src/components/me/PartsOfMe.tsx");
  const card = me.slice(me.indexOf("function PartCard("), me.indexOf("function CheckBack("));
  assert.match(card, /\{part\.safety === true && <div className="mt-3"><CrisisBanner compact \/><\/div>\}\s*<\/li>/, "last in the card");
  assert.ok(card.indexOf("<CheckBack") < card.indexOf("<CrisisBanner"), "the check-back first, the banner beside it");
  assert.ok(card.indexOf("partActions(item, copy)") < card.indexOf("<CrisisBanner"), "under the actions");
  assert.doesNotMatch(me.slice(me.indexOf("function SetAsideRow(")), /CrisisBanner/, "a set-aside part's row stays as it is");
});

test("Meet a part: a visit to a flagged part shows the banner from the first screen, beside the flow", () => {
  const page = read("src/pages/tools/MeetAPart.tsx");
  assert.match(page, /const partCrisis = visited\?\.safety === true;/);
  assert.match(page, /const entryCrisis = \(plan\.open === 'p2' && plan\.crisis\) \|\| partCrisis;/);
  assert.equal((page.match(/\{entryCrisis && <CrisisBanner \/>\}/g) ?? []).length, 3, "p2, ended, heads-up");
  assert.match(page, /\{\(st\.crisis \|\| entryCrisis\) && <CrisisBanner \/>\}/, "the flow, every step");
  assert.match(page, /type KnownPart = \{[^}]*safety\?: boolean \};/);
});

test("the tag row never shows it, and says why", () => {
  const row = read("src/components/spine/PartTagRow.tsx");
  assert.doesNotMatch(row.replace(/\/\*[\s\S]*?\*\//g, ""), /CrisisBanner|\.safety\b/);
  assert.match(row, /No crisis banner here[\s\S]*isn't the moment/);
});
