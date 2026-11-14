// Held part 2 (PRD DT-07; docs/design/held.md, *Part 2*): the outside-in body scan (trauma-sensitive: eyes open, a
// contact point first, the outside of the body before the inside, a check on being here, far away goes back outside
// with a referral line and no close) and the calm-day practice (`held_practice`, a fresh visit, only after it helped
// and never after Hurt myself). Problem Solve's body scan for numb and Do the Opposite's numb alternative open the
// scan. Tested through the same pure machine the player runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";

const M = await importTs("src/lib/skillRuntime/machine.ts");
const content = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const spine = JSON.parse(readFileSync("src/data/content/spine.json", "utf8")).content;
const skill = content.skills.find((s) => s.id === "held");
const embedOutputs = {
  bodyCard: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
  doseTimer: { ids: ["done", "partly", "skipped"], measures: ["durationSec"] },
  boundaryLine: { ids: ["copied"] },
};
const ctx = (ctxIn = {}) => ({ skill, shared: content, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs, profile: null });
const pick = (fieldId, value) => ({ type: "pick", fieldId, value });
const next = { type: "next" };
const done = { type: "embedDone", output: { ids: ["done"], durationSec: 30 } };
const run = (events, c = ctx(), from = M.initialRun(skill)) => events.reduce((s, e) => M.runNext(c, s, e), from);
const offers = (s, c = ctx()) => M.offersFor(c, M.stepOf(skill, s.stepId), s).map((o) => o.exit?.id ?? o.id ?? o);
const ids = (s, step, c = ctx()) => {
  const f = M.shownFields(c, M.stepOf(skill, step), s)[0];
  return M.optionGroups(c, f, s.answers).flatMap((g) => g.options.map((o) => o.value));
};
const SCAN = [pick("pick", "scan"), next, pick("scan", "feet"), next, done, done];

test("the scan starts outside: a contact point, then skin and clothes, then how here you are", () => {
  const s0 = run([pick("pick", "scan"), next]);
  assert.equal(s0.stepId, "scan");
  assert.deepEqual(ids(s0, "scan"), ["feet", "seat", "back", "hands"], "contact points only when calm");
  const contact = run([pick("scan", "seat"), next], ctx(), s0);
  assert.equal(contact.stepId, "scan_contact");
  assert.equal(M.stepOf(skill, "scan_contact").props.kind, "still");
  assert.equal(run([done], ctx(), contact).stepId, "scan_skin");
  assert.equal(run(SCAN).stepId, "scan_where");
  assert.deepEqual(ids(run(SCAN), "scan_where"), ["here", "partly", "far"]);
});

test("here goes a little further in; partly here presses the feet; both then the close", () => {
  const inside = run([...SCAN, pick("scan_where", "here"), next]);
  assert.equal(inside.stepId, "scan_in");
  assert.equal(run([done], ctx(), inside).stepId, "close");
  const press = run([...SCAN, pick("scan_where", "partly"), next]);
  assert.equal(press.stepId, "scan_press");
  assert.equal(M.stepOf(skill, "scan_press").props.kind, "press");
  assert.equal(run([done], ctx(), press).stepId, "close");
});

test("far away goes back outside: 5-4-3-2-1 or the body, a referral line, no close", () => {
  const far = run([...SCAN, pick("scan_where", "far"), next]);
  assert.equal(far.stepId, "scan_far");
  const st = M.stepOf(skill, "scan_far");
  assert.equal(st.noClose, true);
  assert.deepEqual(st.offers.map((o) => o.exit), ["five_senses", "cool_down"]);
  assert.equal(skill.exits.find((e) => e.id === "five_senses").toolId, "five-senses");
  assert.match(st.lines.map((l) => skill.copy[l.key]).join(" "), /not to go further in.*doctor or therapist/s);
});

test("nothing in the scan asks for closed eyes or a breath held; inside comes only after here", () => {
  const scanCopy = Object.entries(skill.copy).filter(([k]) => k.startsWith("scan")).map(([, v]) => v).join(" ");
  assert.doesNotMatch(scanCopy, /close your eyes|hold your breath|\bshould\b|!/i);
  assert.match(skill.copy.scan_hint, /Eyes open is fine/);
  // The only way to scan_in is through scan_where's here.
  for (const st of skill.steps)
    for (const n of st.next ?? []) if (n.to === "scan_in") assert.equal(st.id, "scan_where");
});

test("a carried flooded reading: the scan isn't on the first screen; opened at its entry, a hand on the heart is first-class", () => {
  const FLOODED = ctx({ band: "flooded" });
  assert.ok(!ids(M.initialRun(skill), "pick", FLOODED).includes("scan"));
  const c = ctx({ band: "flooded", enterAt: "scan" });
  const s0 = M.pageStart(c);
  assert.equal(s0.stepId, "scan");
  assert.equal(M.copyText(c, M.stepOf(skill, "scan").title, s0), skill.copy.scan_title_flooded);
  assert.deepEqual(ids(s0, "scan", c), ["heart", "feet", "seat", "back", "hands"], "the hand leads");
  const here = run([pick("scan", "feet"), next, done, done, pick("scan_where", "here"), next], c, s0);
  assert.equal(here.stepId, "scan_press", "flooded: never further in");
  assert.equal(run([pick("scan", "heart"), next], c, s0).stepId, "where");
  assert.ok(!ids(M.pageStart(ctx({ enterAt: "scan" })), "scan").includes("heart"), "calm: contact points only");
});

test("the calm-day practice: only after it helped, never after Hurt myself, skippable, booked by its chip", () => {
  const helped = run([...SCAN, pick("scan_where", "here"), next, done, pick("close", "better"), next, pick("reach", "not_now"), next]);
  assert.equal(helped.stepId, "practise");
  assert.deepEqual(ids(helped, "practise"), ["tomorrow", "few_days"]);
  const st = M.stepOf(skill, "practise");
  assert.deepEqual(st.followUp, { type: "held_practice", whenFrom: "practise" });
  assert.equal(st.fields[0].required, false);
  assert.equal(run([next], ctx(), helped).stepId, "end", "skipping books nothing and goes on");
  assert.deepEqual(M.followUpFor(ctx(), st, run([pick("practise", "few_days")], ctx(), helped)), { type: "held_practice", chip: "few_days" });
  assert.equal(M.followUpFor(ctx(), st, helped), null);
  const same = run([...SCAN, pick("scan_where", "here"), next, done, pick("close", "same"), next, pick("reach", "not_now"), next]);
  assert.equal(same.stepId, "end", "about the same: no practice ask");
  const hurt = ctx({ frame: "hurt", enterAt: "hand" });
  const h = run([pick("where", "chest"), next, { type: "embedDone", output: { ids: ["done"], durationSec: 60 } }, pick("close", "much_better"), next, pick("reach", "not_now"), next], hurt, M.pageStart(hurt));
  assert.equal(h.stepId, "end", "never after Hurt myself");
  const p = ctx({ frame: "practice" });
  assert.equal(run([...SCAN, pick("scan_where", "here"), next, done, pick("close", "better"), next, pick("reach", "not_now"), next], p).stepId, "end",
    "the practice visit never books another");
});

test("held_practice: a fresh visit to Held, content-free, resolved by opening it, bound to the soothe tool", () => {
  const t = spine.followUpTypes.find((x) => x.id === "held_practice");
  assert.ok(t && t.enabled);
  assert.equal(t.deepLinkTemplate, "/tool/soothe?frame=practice&followUp={followUpId}");
  assert.deepEqual(Object.keys(t.window.chips).sort(), ["few_days", "tomorrow"]);
  assert.doesNotMatch(`${t.copy.title} ${t.copy.body} ${t.notification}`, /hurt|hard|upset|cry|panic/i);
  assert.match(readFileSync("functions/src/spine/toolSession.ts", "utf8"), /'held_practice'/);
  assert.match(readFileSync("functions/src/spine/copeAheadAfter.ts", "utf8"), /held_practice: 'soothe'/);
});

test("numb opens the scan: Problem Solve's body scan and Do the Opposite's alternative", () => {
  const ps = content.skills.find((s) => s.id === "problem_solve");
  const e = ps.exits.find((x) => x.id === "body_scan");
  assert.equal(e.toolId, "soothe");
  assert.deepEqual(e.query, { enterAt: "scan" });
  assert.ok(!e.planned);
  assert.match(ps.copy[e.label], /outside in/);
  assert.match(readFileSync("src/components/tools/oppositeAction/OppositeActionStart.tsx", "utf8"), /"body-scan": \{ toolId: "soothe", query: "enterAt=scan" \}/);
});
