// The skills review page's pure part (dev/review/skillsReview.ts) and its review-only embeds skill
// (dev/review/embeds-skill.json): a way to every step, the answers that path gives, and props build.py accepts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";

const r = await importTs("dev/review/skillsReview.ts");
const shipped = JSON.parse(readFileSync("src/data/content/skills.json", "utf8")).content.skills;
const probe = JSON.parse(readFileSync("dev/review/embeds-skill.json", "utf8"));

test("every step of every shipped skill has a path from the start, and the review order starts there", () => {
  for (const sk of [...shipped, probe]) {
    const paths = r.stepPaths(sk);
    for (const st of sk.steps) {
      const p = paths[st.id];
      assert.ok(p, `${sk.id}.${st.id} unreachable`);
      assert.equal(p[0], sk.start);
      assert.equal(p.at(-1), st.id);
      // each hop is a transition, or the re-entry into a `resumeAt` step a check-in opens (R15, IE-08)
      for (let i = 1; i < p.length; i++) {
        assert.ok(sk.steps.find((s) => s.id === p[i - 1]).next.some((t) => t.to === p[i]) || (sk.resumeAt ?? []).includes(p[i]), "each hop is a transition");
      }
    }
    assert.equal(r.reviewOrder(sk)[0], sk.start);
    assert.equal(r.reviewOrder(sk).length, sk.steps.length);
  }
});

test("the made-up run: the skill's version, the path, each earlier field's first option; the player's resume reads it", async () => {
  const m = await importTs("src/lib/skillRuntime/machine.ts");
  const ctf = shipped.find((s) => s.id === "check_the_facts");
  // The last step on the main path, through the ask-fresh question (v1.1's `safe` card, the danger chips' end, skips it).
  const freshId = ctf.steps.find((s) => (s.fields ?? []).some((f) => f.askFresh))?.id;
  const last = ctf.steps.filter((s) => !freshId || r.stepPaths(ctf)[s.id].includes(freshId)).at(-1).id;
  const run = r.reviewRun(ctf, last);
  assert.equal(run.versionId, ctf.version);
  assert.deepEqual(run.path, r.stepPaths(ctf)[last]);
  assert.deepEqual(run.answers[0], { fieldId: "feel", optionIds: [ctf.steps[0].fields[0].options.emotions[0]] });
  const ctx = { skill: ctf, shared: { parentOf: {}, fitsWhen: {} }, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn: {} };
  assert.equal(m.resumeRun(ctx, run, last, { keepFresh: true }).stepId, last);
  const handoff = ctf.steps.find((s) => s.kind === "handoff" && s.offers.length);
  if (handoff) {
    const back = m.resumeRun(ctx, r.reviewRun(ctf, handoff.id), handoff.id, { keepFresh: true });
    assert.equal(back.stepId, handoff.id);
    assert.ok(back.offered.length, "the made-up run reaches a hand-off with something to offer");
    assert.deepEqual(back.offered, m.offersFor(ctx, handoff, back), "a hand-off reopened works out its offers again");
  }
  const freshStep = ctf.steps.find((s) => (s.fields ?? []).some((f) => f.askFresh));
  if (freshStep) assert.equal(m.resumeRun(ctx, run, last).stepId, freshStep.id, "in the app: back to the ask-fresh question");
});

test("the embeds skill's props pass build.py's embed check (copy keys, ranges, fields)", () => {
  const fields = probe.steps.flatMap((s) => [...(s.fields ?? []).map((f) => f.id), ...(s.answerAs ? [s.answerAs] : [])]);
  for (const st of probe.steps.filter((s) => s.kind === "embed")) {
    execFileSync("python3", ["-c", `import sys,json; sys.path.insert(0,'scripts/skills'); import build
a = json.loads(sys.argv[1]); build.check_embed_props(a["embed"], a["props"], a["copy"], set(a["fields"]), a["id"])`,
    JSON.stringify({ embed: st.embed, props: st.props, copy: probe.copy, fields, id: st.id })], { stdio: "pipe" });
  }
  assert.deepEqual([...new Set(probe.steps.filter((s) => s.embed).map((s) => s.embed))].sort(), ["holdRing", "witness"]);
});
