// Trail offers (Phase 4, docs/design/parts.md "The offer card"; built off): the card's copy and gate,
// the statement and evidence rows as ids rendered as labels, at most one offer on Today (never with a
// flooded band, never rule D), the one writer of :TrailOffer, the offer trailhead into Meet a part, and
// the client mirror of the callables' types.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { importTs } from "./lib/importTs.mjs";
import { partsFromFixture } from "./lib/partsContentFixture.mjs";

const read = (f) => readFileSync(f, "utf8");
const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const shipped = JSON.parse(read("src/data/content/parts.json")).content;
const lib = { ...(await importTs("src/lib/trailOffer.ts")), ...(await importTs("src/lib/trailOfferCard.ts")) };
const meet = await importTs("src/lib/meetAPartSave.ts");
const order = await importTs("functions/src/spine/todayOrder.ts");
const option = (flow, step, id) => fixture.options[flow]?.[step]?.find((o) => o.id === id);
const ids = [...lib.TRAIL_OFFER_PROMPTS, ...lib.TRAIL_OFFER_OPTIONS];
const ready = partsFromFixture(fixture, (id) => ids.includes(id) || fixture.moves.some((m) => m.id === id));

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

test("copy pins: the card, the evidence step and the split, all drafts; nothing ships yet", () => {
  const prompts = {
    offer_eyebrow: ["card", "Something keeps showing up"], offer_ask: ["card", "Want to take a look?"],
    offer_evidence: ["evidence", "What the app saw"], offer_question: ["evidence", "Does this feel like a part of you?"],
    offer_split: ["split", "Which of these feels like its own thing?"],
  };
  for (const [id, [step, copy]] of Object.entries(prompts)) {
    assert.deepEqual([fixture.prompts[id]?.flow, fixture.prompts[id]?.step, fixture.prompts[id]?.copy], ["offer", step, copy], id);
  }
  assert.deepEqual(fixture.options.offer.card.map((o) => [o.id, o.label]), [["offer_show", "Show me"], ["offer_not_now", "Not now"], ["offer_no", "No"]]);
  assert.deepEqual(fixture.options.offer.evidence.map((o) => o.id), ["offer_yes_part", "offer_more_than_one", "offer_how_it_goes", "offer_not_me"]);
  assert.deepEqual([option("offer", "split", "offer_split_keep")?.label, option("offer", "split", "offer_split_keep")?.branch], ["Keep these", "candidate"]);
  for (const id of ids) {
    const row = fixture.prompts[id] ?? Object.values(fixture.options.offer).flat().find((o) => o.id === id);
    assert.equal(row?.reviewStatus, "draft", id);
  }
  assert.equal(lib.trailOfferReady(shipped), false, "the card can't show today");
});

test("the gate constant: every id it needs is in the content; any one missing hides the card; the stack drops it", () => {
  assert.deepEqual([...lib.TRAIL_OFFER_REQUIRED.prompts], ["offer_eyebrow", "offer_ask", "offer_evidence", "offer_question", "offer_split"]);
  assert.deepEqual([...lib.TRAIL_OFFER_REQUIRED.options], ["offer_show", "offer_not_now", "offer_no", "offer_yes_part", "offer_more_than_one", "offer_how_it_goes", "offer_not_me", "offer_split_keep"]);
  assert.equal(lib.trailOfferReady(ready), true);
  for (const id of ids) {
    assert.equal(lib.trailOfferReady(partsFromFixture(fixture, (x) => ids.includes(x) && x !== id)), false, `${id} missing hides the card`);
  }
  assert.equal(lib.trailOfferReady(null), false);
  const items = [{ id: "a", kind: "trail_offer" }, { id: "b", kind: "follow_up" }];
  assert.deepEqual(lib.withReadyTrailOffers(items, false).map((i) => i.id), ["b"]);
  assert.deepEqual(lib.withReadyTrailOffers(items, true).map((i) => i.id), ["a", "b"]);
  // The sign-off pack lists the surface from this constant.
  assert.match(read("scripts/parts/review.mjs"), /export \{ TRAIL_OFFER_REQUIRED \} from '\.\/src\/lib\/trailOffer';/);
  assert.match(read("scripts/parts/review.mjs"), /groups: \[\{ label: null, ids: g\.TRAIL_OFFER_REQUIRED \}\]/);
});

test("the statement: the rule's template with the server's signed-off phrases; a missing slot (or a name) is no statement", () => {
  const t = (o) => ({ ruleId: "r", shape: "C", template: "When {context}, two pulls: to {pull} and to {pull2}.", pulls: ["chase it", "hide"], context: "someone pulls away", ...o });
  assert.equal(lib.trailStatement(t({})), "When someone pulls away, two pulls: to chase it and to hide.");
  assert.equal(lib.trailStatement(t({ shape: "A", template: "When {context}, the pull is to {pull}.", pulls: ["hide"] })), "When someone pulls away, the pull is to hide.");
  assert.equal(lib.trailStatement(t({ shape: "B", template: "After the pull to {pull}, the pull to {pull2} often comes next.", context: null })),
    "After the pull to chase it, the pull to hide often comes next.");
  assert.equal(lib.trailStatement(t({ pulls: ["chase it"] })), null, "a phrase not signed off");
  assert.equal(lib.trailStatement(t({ context: null })), null);
  assert.equal(lib.trailStatement(t({ template: "Was this {name}?" })), null, "rule D never on Today");
  assert.equal(lib.trailStatement(undefined), null);
});

test("the evidence rows: dates in the locale, tool names from tools.ts by id (unknown dropped), phrases and graph labels from the server", () => {
  const rows = lib.evidenceRows([
    { at: "2026-09-14T09:00:00Z", toolIds: ["nope", "recovering-from-invalidation"], context: "someone pulls away", sources: ["Chase them down"] },
    { at: "2026-09-18T09:00:00Z", toolIds: ["nope"], context: null, sources: [] },
  ], "en-GB");
  assert.deepEqual(rows.map((r) => [r.date, r.tool, r.context, r.source]), [
    ["Mon 14 Sept", "Recover from a hurtful moment", "someone pulls away", "Chase them down"],
    ["Fri 18 Sept", null, null, null],
  ].map(([d, ...rest]) => [rows[0] && d ? new Date(d === "Mon 14 Sept" ? "2026-09-14T09:00:00Z" : "2026-09-18T09:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : d, ...rest]));
  const tools = read("src/data/tools.ts");
  assert.match(tools, /id: ['"]recovering-from-invalidation['"]/);
});

test("answers: the card's No is Not me; the evidence step's four; the split's chips are the offer's moves or nothing; Yes opens Meet a part on the offer", () => {
  assert.deepEqual(lib.TRAIL_ANSWER_OF, {
    offer_not_now: "not_now", offer_no: "not_me", offer_yes_part: "yes", offer_more_than_one: "more_than_one", offer_how_it_goes: "how_it_goes", offer_not_me: "not_me",
  });
  assert.deepEqual(lib.evidenceAnswers(ready).map((o) => [o.label, o.answer]),
    [["Yes, a part of me", "yes"], ["More than one", "more_than_one"], ["It's how things go", "how_it_goes"], ["Not me", "not_me"]]);
  assert.deepEqual(lib.trailCardCopy(ready), { eyebrow: "Something keeps showing up", ask: "Want to take a look?", show: "Show me", notNow: "Not now", no: "No" });
  assert.deepEqual(lib.splitChips(ready, ["chase", "hide"]).map((m) => m.label), ["Chase it, fix it now", "Hide"]);
  assert.deepEqual(lib.splitChips(ready, ["chase", "go_blank"]), [], "a move the app doesn't ship: no split");
  const OID = "trail_two_pulls:chase+hide:ctx_event_leaving";
  const link = lib.offerMeetLink(ready, OID, ["chase", "hide"]);
  assert.deepEqual(link, { pathname: "/tool/meet-a-part", state: { parts: { trailheadKind: "offer", offerId: OID, moveId: "chase" } } });
  // Meet a part reads it as the offer trailhead and starts its session with the offer.
  const entry = meet.parseMeetEntry(link.state);
  assert.deepEqual([entry.trailheadKind, entry.offerId, entry.moveId], ["offer", OID, "chase"]);
  assert.deepEqual(meet.startRequest("s1", { move: "chase", partId: null }, entry), { id: "s1", trailheadKind: "offer", offerId: OID, moveIds: ["chase"] });
  assert.equal(meet.parseMeetEntry({ parts: { trailheadKind: "offer" } }).trailheadKind, "me", "no offer id: from Me");
  assert.equal(meet.parseMeetEntry({ parts: { trailheadKind: "offer", offerId: "x; DROP" } }).offerId ?? null, null);
  assert.equal(meet.parseMeetEntry({ parts: { trailheadKind: "me", offerId: OID } }).offerId ?? null, null, "only the offer trailhead carries one");
});

test("the card: no hard-coded user-facing strings, nothing the person wrote, the statement in the serif, gated in TodayProvider and drawn by TodayStack", () => {
  const card = read("src/components/parts/TrailOfferCard.tsx");
  const jsx = card.slice(card.indexOf("if (evidence && splitting)"));
  let bare = jsx;
  for (let prev = ""; prev !== bare;) { prev = bare; bare = bare.replace(/\{[^{}]*\}/g, ""); }
  assert.doesNotMatch(bare, /<[a-z]+[^>]*>\s*[A-Za-z][^<{]*</, "text between tags comes from content");
  assert.doesNotMatch(card, /(aria-label|label)="[A-Z]/, "no literal labels");
  assert.doesNotMatch(card, /\bown(Voice|Job|Fear|Words)\b|\.name\b/, "nothing the person wrote, no part name");
  assert.match(card, /if \(!content \|\| !trailOfferReady\(content\) \|\| !statement\) return null;/);
  assert.match(card, /className="mt-1 font-serif[^"]*">\{statement\}<\/p>/);
  assert.match(card, /onClick=\{\(\) => void answer\('not_me'\)\}>\{copy\.no\}/, "No is Not me");
  assert.match(card, /getTrailOfferEvidence\(\{ offerId: item\.id \}\)/);
  const provider = read("src/contexts/TodayContext.tsx");
  assert.match(provider, /const offersShown = partsOn && trailOfferReady\(partsContent\);/);
  assert.match(provider, /withReadyTrailOffers\(/);
  assert.match(read("src/components/today/TodayStack.tsx"), /item\.kind === TRAIL_OFFER_KIND\) return <TrailOfferCard/);
});

test("Today shows at most one trail offer, drops it with a flooded band, and never offers rule D", () => {
  const it = (id, h) => ({ id, kind: "trail_offer", type: "trail_offer", tier: "skills", state: "due", dueAt: new Date(Date.now() - h * 3_600_000).toISOString(), resolveMode: "inline", deepLink: null, choices: [], copy: { title: "" } });
  const out = order.orderToday([it("a", 5), it("b", 2), it("c", 9)]);
  assert.deepEqual([...out.items, ...out.more].map((x) => x.id), ["b"]);
  assert.deepEqual(order.orderToday([it("a", 5)], "flooded"), { items: [], more: [], holding: false });
  const q = read("functions/src/parts/offers/queries.ts");
  assert.match(q, /ORDER BY o\.offeredAt DESC LIMIT 1/);
  const types = read("functions/src/parts/offers/types.ts");
  assert.match(types, /export const TODAY_SHAPES: readonly TrailShape\[\] = \['A', 'B', 'C'\];/);
  const today = read("functions/src/parts/offers/today.ts");
  assert.match(today, /if \(!TODAY_SHAPES\.includes\(c\.shape\) \|\| c\.safetyLine\) continue;/, "the prepare step skips D and safety-line moves");
  assert.match(today, /if \(!TODAY_SHAPES\.includes\(offer\.shape\)\) return \[\];/, "the source skips D");
  assert.match(today, /registerTodaySource\(trailOfferItems\)/);
  assert.match(today, /from '\.\.\/trails'/, "the evaluator is the trails engine");
  const code = today.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(code, /push|notif|messaging/i, "no push path");
  assert.match(read("functions/src/parts/index.ts"), /from '\.\/offers'/, "registers when the parts module loads");
  assert.match(read("functions/src/parts/offers/index.ts"), /import '\.\/today';/);
});

test("record.ts is the one writer of :TrailOffer (writeTrailOffer; Reflect's writeKnownPartReview); the gate is exported for a Reflect surface", () => {
  const writers = walk("functions/src").filter((f) => f.endsWith(".ts"))
    .filter((f) => /(MERGE|CREATE)\s*\(\w*:TrailOffer\b/.test(read(f)));
  assert.deepEqual(writers, ["functions/src/parts/offers/record.ts"]);
  const record = read("functions/src/parts/offers/record.ts");
  assert.match(record, /export async function writeTrailOffer\(tx: ManagedTransaction, uid: string, trail: OfferableTrail\)/);
  // Everyone else changes an offer only under its guards.
  for (const f of walk("functions/src").filter((x) => x.endsWith(".ts") && x !== "functions/src/parts/offers/record.ts")) {
    const src = read(f);
    for (const m of src.matchAll(/:TrailOffer \{key: \$key\}\)[\s\S]{0,40}?\n\s*WHERE ([^\n]*)\n\s*SET o\./g)) {
      assert.match(m[1], /\$\{GUARDS\.TrailOffer\.(see|answer|removePattern)\('o'\)\}/, `${f}: an offer write without its guard`);
    }
  }
  assert.match(read("functions/src/parts/offers/gate.ts"), /export function offerGate\(/);
  assert.match(read("functions/src/parts/offers/queries.ts"), /export async function checkOfferGate\(/);
});

test("the shared budget: one helper, re-exported from patternOffers.ts, read by the parts gate", () => {
  const po = read("functions/src/profile/patternOffers.ts");
  assert.match(po, /export \{ OFFER_EVERY_DAYS, offerBudgetSpent \} from '\.\/offerBudget';/);
  assert.doesNotMatch(po, /OFFER_EVERY_DAYS = 7/, "the 7 lives in one place");
  assert.match(read("functions/src/profile/offerBudget.ts"), /export const OFFER_EVERY_DAYS = 7;/);
  assert.match(read("functions/src/parts/offers/gate.ts"), /import \{ offerBudgetSpent \} from '\.\.\/\.\.\/profile\/offerBudget';/);
});

test("the client mirror: the callables' types appear in src/data/partsTypes.ts; the services call them by name", () => {
  const mirror = read("src/data/partsTypes.ts");
  for (const s of [
    "export type TrailOfferAnswer = 'not_now' | 'not_me' | 'yes' | 'more_than_one' | 'how_it_goes';",
    "export interface GetTrailOfferEvidenceRequest { offerId: string }",
    "next: 'meet' | 'candidates' | 'none';",
    "offerId?: string;",
    "export type TagSource = 'close' | 'debrief' | 'review' | 'wise_mind';",
  ]) assert.ok(mirror.includes(s), s);
  const types = read("functions/src/parts/offers/types.ts");
  for (const s of ["export type TrailOfferAnswer = 'not_now' | 'not_me' | 'yes' | 'more_than_one' | 'how_it_goes';", "next: 'meet' | 'candidates' | 'none';"]) {
    assert.ok(types.includes(s), s);
  }
  const svc = read("src/services/parts.ts");
  assert.match(svc, /httpsCallable<GetTrailOfferEvidenceRequest, GetTrailOfferEvidenceResponse>\(functions, 'getTrailOfferEvidence'\)/);
  assert.match(svc, /httpsCallable<AnswerTrailOfferRequest, AnswerTrailOfferResponse>\(functions, 'answerTrailOffer'\)/);
});

test("Recover's evidence rows have a source label: PullOption.label is Recover's own pull label, imported, never copied", () => {
  const recover = read("schema/invalidation-recovery.cypher");
  const want = Object.fromEntries([...recover.matchAll(/\{\\"id\\": \\"(\w+)\\", \\"label\\": \\"([^"\\]+)\\", \\"sub\\"/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(Object.keys(want).sort(), ["chase", "fight", "freeze", "hide"]);
  const parts = read("schema/parts.cypher");
  const got = [...parts.matchAll(/MERGE \(p:PullOption \{id: "(\w+)"\}\)\nSET p \+= \{flow: "recover", pullId: "(\w+)", label: "([^"]+)"/g)];
  assert.equal(got.length, 4, "every PullOption has a label");
  for (const [, id, pull, label] of got) assert.equal(label, want[pull], id);
  const content = read("scripts/parts/content.py");
  assert.match(content, /"invalidation-recovery", "content\.py"/, "imported from Recover's content");
  assert.match(content, /PULL_LABELS = \{pid: RECOVER_PULL_LABELS\[pull\] for pid, flow, pull in PULL_OPTIONS/, "derived, no second copy");
  assert.doesNotMatch(content, /"recover_\w+":\s*"/, "no hand-written PullOption label");
  // The evidence rows read every source's own `label` (the one shared predicate, PullOption among them).
  const answer = read("functions/src/parts/offers/answer.ts");
  assert.match(answer, /collect\(DISTINCT src\.label\)/);
  assert.match(read("functions/src/parts/sessionMoves.ts"), /\$\{src\}:PullOption AND \$\{d\}:InvalidationRecoverySession/);
});

test("importTs keeps Node's own modules as they are (review.ts imports node:crypto)", async () => {
  const review = await importTs("functions/src/parts/offers/review.ts");
  assert.equal(typeof review.REVIEW_EXISTS_QUERY, "string");
});
