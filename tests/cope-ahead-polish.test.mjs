// Cope Ahead polish (cope-ahead-polish): typographic quotes in the words moves, *Kept in My words.* after
// Keep this, and CrisisBanner's `other_person` resources for *They might hurt me* (911, the National
// Domestic Violence Hotline, 988 last), *I might hurt myself* keeping the default banner.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { importTs } from "./lib/importTs.mjs";

const read = (f) => readFileSync(f, "utf8");
const ca = await importTs("src/lib/copeAheadTool.ts");
const { CrisisBanner } = await importTs("src/components/safety/CrisisBanner.tsx");
const content = JSON.parse(read("src/data/content/cope-ahead.json")).content;
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

const run = (events, from = ca.initialCope()) => events.reduce((s, e) => ca.copeNext(s, e, content), from);
const toPlan = (situation, moment) => run([
  { type: "situation", id: situation }, { type: "when", when: "tomorrow" }, { type: "next" }, { type: "next" },
  { type: "moment", id: moment }, { type: "next" },
]);

test("the words moves quote typographically, chip and plan line alike; no straight quotes left in moves", () => {
  const m = (id) => content.moves.find((x) => x.id === id);
  assert.deepEqual([m("give_minute").label, m("give_minute").line], ["Say “Give me a minute”", "say “Give me a minute”"]);
  assert.deepEqual([m("say_hard").label, m("say_hard").line], ["Say “This is hard for me”", "say “This is hard for me”"]);
  assert.deepEqual([m("come_back").label, m("come_back").line], ["Say “I'll come back to you on that”", "say “I'll come back to you on that”"]);
  for (const x of content.moves) for (const t of [x.label, x.line]) assert.doesNotMatch(t, /"/, `${x.id}: ${t}`);
});

test("Keep this, kept: Kept in My words., a polite status line where the buttons were", () => {
  assert.equal(content.copy.keep_done, "Kept in My words.");
  const card = read("src/components/tools/copeAhead/KeepCard.tsx");
  assert.match(card, /\{keep === 'kept'\s*\? <p role="status"[^>]*data-testid="cope-keep-done">\{copy\('keep_done'\)\}<\/p>\s*: \(/);
  assert.ok(card.indexOf("cope-keep-done") < card.indexOf("copy('keep_yes')"), "in the buttons' place, under the paper");
  assert.ok(card.indexOf("</PaperCard>") < card.indexOf("cope-keep-done"));
  assert.doesNotMatch(card, /role="alert"|aria-live="assertive"/);
});

test("CrisisBanner other_person: 911 first, the Hotline by call and text, 988 last; no crisis text line", () => {
  for (const compact of [true, false]) {
    const html = renderToStaticMarkup(h(CrisisBanner, { compact, variant: "other_person" }));
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(hrefs, ["tel:911", "tel:18007997233", "sms:88788?body=START", "tel:988"], compact ? "compact" : "full");
    assert.match(html, /If you(&#x27;|')re in danger now, call 911\./);
    assert.match(html, /National Domestic Violence Hotline/);
    assert.doesNotMatch(html, /741741|We hear you|🆘/);
    assert.match(html, /aria-label="Support right now"/);
    assert.match(html, /data-variant="other_person"/);
    assert.doesNotMatch(html, /role="alert"|aria-live="assertive"|aria-modal/, "alongside, never blocking");
    assert.equal(/data-testid="crisis-banner-compact"/.test(html), compact);
  }
  // Compact packs into three rows (DT lane, gate 2): short visible labels, each carrying the full name to a screen reader.
  const compact = renderToStaticMarkup(h(CrisisBanner, { compact: true, variant: "other_person" }));
  assert.match(compact, /aria-label="Call 1-800-799-7233 \(National Domestic Violence Hotline\)"[^>]*>Call</);
  assert.match(compact, /aria-label="Text START to 88788 \(National Domestic Violence Hotline\)"[^>]*>Text</);
  assert.match(compact, />Call 911</);
  assert.match(compact, />Call 988 \(Suicide &amp; Crisis Lifeline\)</);
  // The default is unchanged.
  const plain = renderToStaticMarkup(h(CrisisBanner, { compact: true }));
  assert.match(plain, /href="tel:988"[\s\S]*href="sms:741741\?body=HELLO"/);
  assert.doesNotMatch(plain, /911|88788|other_person/);
  // The numbers still live only in CrisisBanner.
  const files = walk("src").filter((f) => /\.(ts|tsx|json)$/.test(f) && f !== join("src", "components", "safety", "CrisisBanner.tsx"));
  for (const f of files) assert.doesNotMatch(read(f), /\b911\b|7997233|88788|Domestic Violence Hotline/, f);
});

test("Cope Ahead: They might hurt me shows the other_person banner; I might hurt myself the default; a calm moment none", () => {
  assert.equal(ca.dangerBanner(toPlan("someone", "might_hurt"), content), "other_person");
  assert.equal(ca.dangerBanner(toPlan("alone", "might_hurt_self"), content), "crisis");
  assert.equal(ca.dangerBanner(toPlan("conversation", "go_blank"), content), null);
  // Every danger moment the content has is one of the two (a new one fails here until it's placed).
  const danger = new Set(content.situations.flatMap((s) => s.dangerMomentIds));
  assert.deepEqual([...danger].sort(), ["might_hurt", "might_hurt_self"]);
  const page = read("src/pages/tools/CopeAhead.tsx");
  assert.match(page, /const banner = dangerBanner\(s, content\);\s*const danger = banner \? <CrisisBanner compact variant=\{banner\} \/> : null;/);
});
