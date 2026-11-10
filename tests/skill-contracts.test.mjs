// The contracts every skill on the runtime holds to (docs/design/dbt-modules-plan.md §3 C1, C3, C4, C6), checked
// over the shipped skills (tests/fixtures/skills-content.json) and, for the runtime pieces no shipped skill uses
// yet, over a small synthetic skill. A lane's skill passes here before any review gate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { importTs } from "./lib/importTs.mjs";

const fixture = JSON.parse(readFileSync("tests/fixtures/skills-content.json", "utf8"));
const read = (p) => readFileSync(p, "utf8");
const py = (code) => JSON.parse(execFileSync("python3", ["-c", `import sys,json; sys.path.insert(0,'scripts/skills'); ${code}`], { encoding: "utf8" }));
const toolIds = new Set([...read("src/data/tools.ts").matchAll(/^\s*id: '([a-z0-9-]+)',/gm)].map((m) => m[1]));
const CTX_KEYS = new Set(["urgeId", "personId", "frame", "enterAt", "situationId", "partId", "band", "returnTo"]);
const EXT_MAX_BYTES = 4096;

const m = await importTs("src/lib/skillRuntime/machine.ts");
const { validateExt, EXT_SCHEMAS, RUN_OWN_MAX } = await importTs("functions/src/spine/extSchemas.ts");
const conditions = await importTs("src/lib/skillRuntime/conditions.ts");
const holdRing = await importTs("src/lib/holdRing.ts");
const embedProps = await importTs("src/lib/skillRuntime/embedProps.ts");
const witness = await importTs("src/lib/witness.ts");
const { WITNESS_MOMENTS } = await importTs("functions/src/witness/types.ts");
const profileTypes = await importTs("src/data/profileTypes.ts");
const { PROFILE_KINDS } = await importTs("functions/src/profile/kinds.ts");
/** content.py's EMBEDS: each embed's declared output (ids, ownText, measures, danger). */
const EMBEDS_PY = py("from content import EMBEDS; print(json.dumps(EMBEDS))");
/** embeds.ts's EMBED_OUTPUTS, read as the literal it is. */
const EMBED_OUTPUTS_TS = (() => {
  const src = read("src/components/skillPlayer/embeds.ts");
  const block = /export const EMBED_OUTPUTS[^=]*=\s*(\{[\s\S]*?\n\});/.exec(src)[1];
  return new Function(`return ${block}`)();
})();

const fields = (sk) => sk.steps.flatMap((s) => s.fields ?? []);

for (const sk of fixture.skills) {
  test(`${sk.id}: every step is reachable from the start, and every ask or embed step goes somewhere`, () => {
    const seen = new Set([sk.start]);
    const queue = [sk.start];
    while (queue.length) {
      const id = queue.shift();
      const st = sk.steps.find((s) => s.id === id);
      for (const t of st.next) if (!seen.has(t.to)) { seen.add(t.to); queue.push(t.to); }
    }
    for (const st of sk.steps) {
      assert.ok(seen.has(st.id), `${st.id} is unreachable`);
      if (st.kind !== "handoff") assert.ok(st.next.length, `${st.id} is a dead end`);
    }
  });

  test(`${sk.id}: exits open built tools, or are planned / safety.open / done; offers and links name real exits`, () => {
    const ids = new Set(sk.exits.map((x) => x.id));
    for (const x of sk.exits) {
      if (x.safety) assert.equal(x.toolId, null, x.id);
      else if (x.planned) assert.ok(x.toolId && !toolIds.has(x.toolId), `${x.id}: planned, but ${x.toolId} is built: flip it`);
      else assert.ok(x.done || toolIds.has(x.toolId), `${x.id}: ${x.toolId} is not a tool`);
    }
    for (const st of sk.steps) {
      for (const o of st.offers) assert.ok(ids.has(o.exit), `${st.id}: ${o.exit}`);
      for (const f of st.fields ?? []) for (const l of f.links ?? []) assert.ok(ids.has(l.exit), `${st.id}.${f.id}: ${l.exit}`);
    }
  });

  test(`${sk.id}: context in is only the keys it accepts, and exits to a skill carry only keys that skill accepts`, () => {
    for (const k of sk.accepts) assert.ok(CTX_KEYS.has(k), k);
    for (const x of sk.exits) {
      const target = fixture.skills.find((t) => t.toolId === x.toolId);
      if (!target) continue; // a page not on the runtime yet: its own entry contract (tests per tool)
      for (const key of Object.keys(x.query)) assert.ok(target.accepts.includes(key), `${x.id}: ${target.id} doesn't accept ${key}`);
    }
  });

  test(`${sk.id}: embed steps and slots name registered embeds`, () => {
    const embeds = Object.keys(EMBEDS_PY);
    for (const st of sk.steps) {
      if (st.kind === "embed") {
        assert.ok(embeds.includes(st.embed), `${st.id}: ${st.embed}`);
        assert.ok(!st.fields?.length, `${st.id}: an embed step has no fields`);
      }
      for (const sl of st.slots ?? []) assert.ok(embeds.includes(sl.embed), `${st.id}: ${sl.embed}`);
    }
  });

  test(`${sk.id}: picking anything that can carry danger shows a crisis slot of its variant on its step (C6.4)`, () => {
    // Not just "a slot exists": with that pick made, the step's slot holds. Embed ids an embed marks danger too.
    const ctx = { skill: sk, shared: fixture, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn: {}, embedOutputs: EMBEDS_PY };
    const want = (d) => (d === "other" ? "other_person" : "crisis");
    for (const st of sk.steps) {
      for (const f of st.fields ?? []) {
        for (const o of sk.options[f.options.list] ?? []) {
          if (!o.danger) continue;
          const slot = m.crisisFor(ctx, st, { answers: { [f.id]: { ids: [o.value], own: null } } });
          assert.equal(slot?.variant, want(o.danger), `${st.id}.${f.id}: ${o.value} needs a ${want(o.danger)} slot that holds`);
        }
      }
      if (st.kind === "embed" && st.answerAs) {
        for (const [v, d] of Object.entries(EMBEDS_PY[st.embed]?.danger ?? {})) {
          const slot = m.crisisFor(ctx, st, { answers: { [st.answerAs]: { ids: [v], own: null } } });
          assert.equal(slot?.variant, want(d), `${st.id}: ${st.embed} id ${v} needs a ${want(d)} slot that holds`);
        }
      }
    }
  });

  test(`${sk.id}: reads only the profile slices its tool declares; keeps only registered kinds, own words to own fields (C2)`, () => {
    const needs = profileTypes.PROFILE_NEEDS[sk.toolId] ?? [];
    const refs = JSON.stringify(sk.steps).match(/\$p\.[A-Za-z]+/g) ?? [];
    for (const r of refs) assert.ok(needs.includes(r.slice(3)), `${sk.id}: ${r} needs '${r.slice(3)}' in PROFILE_NEEDS['${sk.toolId}']`);
    for (const f of fields(sk)) {
      if (f.options.profile) assert.ok(needs.includes(f.options.profile), `${f.id}: lists ${f.options.profile}, not in PROFILE_NEEDS['${sk.toolId}']`);
    }
    for (const st of sk.steps) {
      if (!st.keep) continue;
      const def = PROFILE_KINDS[st.keep.kind];
      assert.ok(def, `${st.id}: keeps ${st.keep.kind}, which functions/src/profile/kinds.ts doesn't register`);
      assert.equal(st.keep.many, def.many, `${st.id}: keep.many must be ${def.many} for ${st.keep.kind}`);
      for (const fid of st.keep.from) {
        const f = fields(sk).find((x) => x.id === fid);
        if (f?.own) assert.ok(def.ownFields.includes(`${fid}Own`), `${st.id}: ${fid}Own is own words: list it in ${st.keep.kind}'s ownFields`);
      }
    }
  });

  test(`${sk.id}: its tool declares a close kind on both sides`, () => {
    const decl = new RegExp(`'${sk.toolId}': \\{ module: '[a-z]+', closeKind: '[a-z_]+' \\}`);
    assert.match(read("functions/src/spine/tools.ts"), decl);
    assert.match(read("src/lib/spine/close.ts"), decl);
  });

  test(`${sk.id}: its longest possible record fits ext's 4 KB and passes the server's schema`, () => {
    // Worst case: the path at its cap with the longest step id; every field at its max picks of its longest
    // option values, with own words at the cap in 3-byte characters; every exit offered; every embed shown.
    const longest = (xs) => xs.reduce((a, b) => (b.length > a.length ? b : a), "");
    const stepId = longest(sk.steps.map((s) => s.id));
    const answers = fields(sk).map((f) => {
      const values = f.options.emotions ? ["disappointed_in_myself"] : (sk.options[f.options.list] ?? []).map((o) => o.value);
      const pick = Array.from({ length: Math.min(f.max, 12) }, () => longest(values) || "x");
      const own = f.own ? "愛".repeat(Math.min(f.own.max ?? sk.ownMax, sk.ownMax)) : null;
      return { fieldId: f.id, optionIds: pick, ...(own ? { valueOwn: own } : {}) };
    });
    // Every recorded context key at the id cap, and each embed step's report at what its embed declares.
    const id64 = "x".repeat(64);
    const ctxRec = Object.fromEntries(Object.keys(EXT_SCHEMAS.run.ctx.of).map((k) => [k, id64]));
    const out = sk.steps.filter((st) => st.kind === "embed").slice(0, 8).map((st) => {
      const d = EMBEDS_PY[st.embed] ?? {};
      return {
        embed: st.embed, stepId: st.id,
        ...(d.ids?.length ? { optionIds: Array(12).fill(longest(d.ids)) } : {}),
        ...(d.ownText ? { valueOwn: "愛".repeat(sk.ownMax) } : {}),
        ...Object.fromEntries((d.measures ?? []).map((k) => [k, 3600])),
      };
    });
    const run = {
      skillId: sk.id, versionId: sk.version, path: Array(48).fill(stepId), answers: answers.slice(0, 32),
      ctx: ctxRec, ...(out.length ? { out } : {}),
      offeredExitIds: sk.exits.slice(0, 8).map((x) => x.id), exitId: longest(sk.exits.map((x) => x.id)),
      embedsShown: ["safety_open"],
      handoffs: [{ primitiveId: "sigh", completed: true, durationSec: 60, thenVsNow: "better", resumed: true, overridden: false }],
    };
    const bytes = Buffer.byteLength(JSON.stringify({ run }), "utf8");
    assert.ok(bytes <= EXT_MAX_BYTES, `${sk.id}: worst case ${bytes} bytes`);
    assert.doesNotThrow(() => validateExt({ run }));
  });
}

test("embeds: one registry in the player, the same names in content.py, and every embed declares what it reports", () => {
  const src = read("src/components/skillPlayer/embeds.ts");
  const keys = (name) => [...(new RegExp(`export const ${name}[^{]*\\{([\\s\\S]*?)\\n\\};`).exec(src)[1].matchAll(/^\s*([A-Za-z]+)\s*[,:]/gm))].map((x) => x[1]).sort();
  const listed = Object.keys(EMBEDS_PY).sort();
  assert.deepEqual(keys("EMBEDS"), listed);
  assert.deepEqual(Object.keys(EMBED_OUTPUTS_TS).sort(), listed);
  // What each embed may report is the same on both sides (the machine keeps only what is declared).
  assert.deepEqual(EMBED_OUTPUTS_TS, EMBEDS_PY);
});

/** embeds.ts's EMBED_PROPS, read as the literal it is. */
const EMBED_PROPS_TS = (() => {
  const block = /export const EMBED_PROPS[^=]*=\s*(\{[\s\S]*?\n\});/.exec(read("src/components/skillPlayer/embeds.ts"))[1];
  return new Function(`return ${block}`)();
})();
const EMBED_PROPS_PY = py("from content import EMBED_PROPS; print(json.dumps(EMBED_PROPS))");
/** build.py's check_embed_props on one set of props (copy keys `a`, `b`; fields `f`): null when it passes. */
const propsCheck = (name, props) => {
  try {
    execFileSync("python3", ["-c", `import sys,json; sys.path.insert(0,'scripts/skills'); import build
build.check_embed_props(${JSON.stringify(name)}, json.loads(sys.argv[1]), {"a": "A", "b": "B"}, {"f"}, "probe")`, JSON.stringify(props)], { stdio: "pipe" });
    return null;
  } catch (e) { return String(e.stderr); }
};

test("embed props: declared the same on both sides; build.py refuses undeclared, mistyped or missing props", () => {
  assert.deepEqual(EMBED_PROPS_TS, EMBED_PROPS_PY);
  assert.deepEqual(Object.keys(EMBED_PROPS_PY).sort(), Object.keys(EMBEDS_PY).sort(), "every embed declares its props");
  assert.deepEqual(EMBED_PROPS_PY.holdRing.variant.values, [...holdRing.HOLD_VARIANTS]);
  const ring = { variant: "press", seconds: 90, label: "a", hint: "b", next: "a" };
  assert.equal(propsCheck("holdRing", ring), null);
  assert.equal(propsCheck("holdRing", { ...ring, holds: 3, growthPct: 150, maxSeconds: 900, doneLabel: "b" }), null);
  assert.match(propsCheck("holdRing", { ...ring, colour: "red" }), /takes no such prop/);
  assert.match(propsCheck("holdRing", { ...ring, label: "Hold here" }), /copy key/, "words come from the skill's copy");
  assert.match(propsCheck("holdRing", { ...ring, seconds: 901 }), /in range/);
  assert.match(propsCheck("holdRing", { ...ring, seconds: true }), /in range/);
  assert.match(propsCheck("holdRing", { ...ring, variant: "spin" }), /one of/);
  const { next: _n, ...noNext } = ring;
  assert.match(propsCheck("holdRing", noNext), /needs next/);
  assert.equal(propsCheck("witness", { moment: "crisis", wordsFrom: "f", emotionsFrom: "f", next: "a" }), null);
  assert.match(propsCheck("witness", { moment: "crisis", wordsFrom: "g" }), /field of the skill/);
  assert.match(propsCheck("witness", { moment: "Not An Id" }), /is an id/);
  // Every witness step a skill ships names a moment the witness server knows.
  for (const sk of fixture.skills) {
    for (const st of sk.steps) {
      const uses = [...(st.embed === "witness" ? [st.props] : []), ...(st.slots ?? []).filter((x) => x.embed === "witness").map((x) => x.props)];
      for (const pr of uses) assert.ok(WITNESS_MOMENTS.includes(pr.moment), `${sk.id}.${st.id}: moment ${pr.moment}`);
    }
  }
});

test("embed props in the player: only what is declared, copy keys as the skill's text, a missing optional key dropped", () => {
  const spec = EMBED_PROPS_TS.holdRing;
  const copy = { hold: "Hold here", hint: "Press and hold", on: "Go on" };
  assert.deepEqual(
    embedProps.resolveEmbedProps(spec, { variant: "timed", seconds: 30, label: "hold", hint: "hint", next: "on", doneLabel: "gone", extra: 1 }, copy),
    { variant: "timed", seconds: 30, label: "Hold here", hint: "Press and hold", next: "Go on" },
  );
  assert.deepEqual(embedProps.resolveEmbedProps(undefined, { a: 1 }, copy), {});
  const player = read("src/components/skillPlayer/SkillPlayer.tsx");
  assert.equal((player.match(/props=\{embedProps\(ctx, /g) ?? []).length, 2, "slots and whole-screen embeds both get resolved props");
  assert.equal((player.match(/answerIds=\{answerIds\(st\)\}/g) ?? []).length, 2);
});

test("witness outcome: own words, skip and none-fit first, then the last line's landed; nothing answered is seen", () => {
  const r = (o) => ({ landed: {}, skipped: false, noneFit: false, shownLineIds: [], ...o });
  assert.equal(witness.witnessOutcome(null), "seen");
  assert.equal(witness.witnessOutcome(r({})), "seen");
  assert.equal(witness.witnessOutcome(r({ shownLineIds: ["a", "b"], landed: { a: "no", b: "yes" } })), "yes");
  assert.equal(witness.witnessOutcome(r({ shownLineIds: ["a"], landed: { a: "sort_of" }, skipped: true })), "skip");
  assert.equal(witness.witnessOutcome(r({ noneFit: true })), "none_fit");
  assert.equal(witness.witnessOutcome(r({ ownLine: { id: "x", text: "mine" }, skipped: true })), "own");
  for (const id of ["yes", "sort_of", "no", "none_fit", "own", "skip", "seen"]) assert.ok(EMBEDS_PY.witness.ids.includes(id));
  // The beat is logged against this visit's session once it's written, never against a check-in.
  const src = read("src/components/skillPlayer/WitnessEmbed.tsx");
  assert.match(src, /hostKind: 'tool_session'/);
  assert.match(src, /\.then\(\(\) => session\.ready\(\)\)/);
  assert.equal(witness.beatRequest({ checkInId: "s1", hostKind: "tool_session", moment: "crisis", band: "stirred", lines: [], result: r({}), emotionIds: [] }).hostKind, "tool_session");
  assert.equal(witness.beatRequest({ checkInId: "c1", moment: "checkin_result", band: "stirred", lines: [], result: r({}), emotionIds: [] }).hostKind, "checkin");
});

test("profile slices: build.py's lists are the app's", () => {
  const src = read("scripts/skills/build.py");
  const set = (name) => [...new RegExp(`^${name} = \\{([\\s\\S]*?)\\}`, "m").exec(src)[1].matchAll(/"([A-Za-z]+)"/g)].map((x) => x[1]).sort();
  assert.deepEqual(set("PROFILE_SLICES"), [...profileTypes.SLICE_IDS].sort());
  const optionSlices = /export type ProfileOptionSlice = ([^;]+);/.exec(read("src/data/skillTypes.ts"))[1];
  assert.deepEqual(set("PROFILE_OPTION_SLICES"), [...optionSlices.matchAll(/'([A-Za-z]+)'/g)].map((x) => x[1]).sort());
});

test("own-words cap: build.py and the server's schema agree", () => {
  const m2 = /^RUN_OWN_MAX = (\d+)/m.exec(read("scripts/skills/build.py"));
  assert.equal(Number(m2[1]), RUN_OWN_MAX);
});

test("ext.run: free text only on own-words keys, so every own-words value is one the server encrypts (C1 rule 7)", () => {
  // Walk the schema itself, nested objects included.
  const textKeys = [];
  const walk = (fields) => {
    for (const [k, f] of Object.entries(fields)) {
      if (f.t === "text") textKeys.push(k);
      if (f.t === "obj" || f.t === "objs") walk(f.of);
    }
  };
  walk(EXT_SCHEMAS.run);
  assert.ok(textKeys.length > 0);
  for (const k of textKeys) assert.match(k, /Own$/, k);
  // The machine records own words only as valueOwn (answers and embed outputs).
  const machine = read("src/lib/skillRuntime/machine.ts");
  assert.deepEqual([...new Set([...machine.matchAll(/(\w+Own): /g)].map((x) => x[1]))], ["valueOwn"]);
});

// --- The runtime pieces no shipped skill uses yet, over a synthetic skill -------------------------------------

const opt = (value, extra = {}) => ({ value, label: value, ...extra });
const SKILL = {
  id: "contract_probe", toolId: "contract-probe", version: "t1", start: "urge", accepts: ["urgeId", "situationId", "returnTo"],
  ownMax: 140, emotionFields: [],
  copy: { t: "T" }, tables: { level: { "0": "gentle", "2": "firm", "3.5": "insist" } },
  derive: [{ name: "level", kind: "count", fields: ["q1", "q2"], weights: { yes: 1, not_sure: 0.5, no: 0 }, table: "level", default: "gentle" }],
  steps: [
    { id: "urge", kind: "ask", title: "t", fields: [
      { id: "urge", options: { list: "urges", firstFrom: "$ctx.situationId" }, max: 1, showWhen: { not: { set: "$ctx.urgeId" } },
        own: { hint: "t", countsAsPick: true, max: 20 } },
    ], crisis: [{ variant: "crisis", when: { eq: ["$a.urge", "hurt_myself"] } }],
      next: [{ to: "hold", when: null }], offers: [] },
    { id: "hold", kind: "embed", embed: "partsLine", answerAs: "held", next: [{ to: "size", when: { eq: ["$a.held", "held"] } }, { to: "end", when: null }], offers: [] },
    { id: "size", kind: "ask", fields: [
      { id: "q1", options: { list: "yn" }, max: 1 }, { id: "q2", options: { list: "yn" }, max: 1 },
    ], next: [{ to: "end", when: null }], offers: [] },
    { id: "end", kind: "handoff", next: [], offers: [
      { exit: "built", when: null }, { exit: "later", when: null }, { exit: "safety_open", when: null },
    ], done: "done" },
  ],
  exits: [
    { id: "built", toolId: "problem-solve", query: {}, carry: [], done: false },
    { id: "done", toolId: null, query: {}, carry: [], done: true },
    { id: "safety_open", toolId: null, query: {}, carry: [], done: false, safety: true },
    { id: "later", toolId: "let-it-be", query: {}, carry: [], done: false, planned: true },
  ],
  options: {
    urges: [opt("send"), opt("leave"), opt("hurt_myself", { danger: "self" })],
    yn: [opt("yes"), opt("not_sure"), opt("no")],
  },
};
// The probe's embed declares what it reports here, as EMBED_OUTPUTS would.
const PROBE_OUTPUTS = { partsLine: { ids: ["held", "no"], measures: ["durationSec", "earlyCount"] } };
const ctxOf = (ctxIn, skill = SKILL) => ({
  skill, shared: { parentOf: {}, fitsWhen: {} }, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn, embedOutputs: PROBE_OUTPUTS,
});
const go = (ctx, events, s = m.initialRun(SKILL)) => events.reduce((st, e) => m.runNext(ctx, st, e), s);

test("context in: only accepted keys, ids only, returnTo an in-app path; $ctx refs read it", () => {
  assert.deepEqual(m.contextIn(SKILL, { urgeId: "send", personId: "p1", situationId: "../x", returnTo: "/tool/x?a=1", band: "flooded" }),
    { urgeId: "send", returnTo: "/tool/x?a=1" });
  assert.deepEqual(m.contextIn(SKILL, { returnTo: "//evil.example" }), {});
  // A context value is one id: suffixes mean nothing on it.
  assert.equal(conditions.resolve("$ctx.urgeId.ids", { answers: {}, derived: {}, ctx: { urgeId: "send" } }), null);
  const step = SKILL.steps[0];
  assert.equal(m.shownFields(ctxOf({}), step, m.initialRun(SKILL)).length, 1);
  assert.equal(m.shownFields(ctxOf({ urgeId: "send" }), step, m.initialRun(SKILL)).length, 0, "the host sent the urge: not asked");
});

test("band: only one of the three bands steers a run, and it is never recorded (C4.6)", () => {
  const withBand = { ...SKILL, accepts: [...SKILL.accepts, "band"] };
  assert.deepEqual(m.contextIn(withBand, { band: "flooded" }), { band: "flooded" });
  assert.deepEqual(m.contextIn(withBand, { band: "panicking" }), {});
  const ctx = ctxOf({ band: "flooded", urgeId: "send" }, withBand);
  const rec = m.runRecord(ctx, m.initialRun(withBand));
  assert.deepEqual(rec.ctx, { urgeId: "send" });
  assert.equal(EXT_SCHEMAS.run.ctx.of.band, undefined, "the server has no band in ext.run.ctx");
});

test("option first from context: first, never selected", () => {
  const ctx = ctxOf({ situationId: "leave" });
  const [g] = m.optionGroups(ctx, SKILL.steps[0].fields[0], {});
  assert.deepEqual(g.options.map((o) => o.value), ["leave", "send", "hurt_myself"]);
  assert.equal(m.initialRun(SKILL).answers.urge, undefined);
});

test("own words: a field's max caps them below the skill's", () => {
  const s = go(ctxOf({}), [{ type: "own", fieldId: "urge", text: "x".repeat(60) }]);
  assert.equal(s.answers.urge.own.length, 20);
});

test("crisis slot: shows while its condition holds", () => {
  const ctx = ctxOf({});
  const step = SKILL.steps[0];
  assert.equal(m.crisisFor(ctx, step, go(ctx, [{ type: "pick", fieldId: "urge", value: "send" }])), null);
  assert.equal(m.crisisFor(ctx, step, go(ctx, [{ type: "pick", fieldId: "urge", value: "hurt_myself" }])).variant, "crisis");
});

test("embed step: its output is answered as answerAs, measured in out, and the run goes on", () => {
  const ctx = ctxOf({ urgeId: "send" });
  let s = go(ctx, [{ type: "next" }]);
  assert.equal(s.stepId, "hold");
  s = m.runNext(ctx, s, { type: "embedDone", output: { ids: ["held", "../bad", "undeclared"], own: "secret", durationSec: 95, earlyCount: 2, doneCount: 3 } });
  assert.equal(s.stepId, "size");
  assert.deepEqual(s.answers.held, { ids: ["held"], own: null }, "answerAs takes ids only");
  // Only what the embed declares: no own words (no ownText), no doneCount (not a declared measure).
  assert.deepEqual(s.out.hold, { embed: "partsLine", stepId: "hold", ids: ["held"], own: null, durationSec: 95, doneCount: undefined, earlyCount: 2 });
  const quiet = m.runNext({ ...ctx, embedOutputs: {} }, go(ctx, [{ type: "next" }]), { type: "embedDone", output: { ids: ["held"], durationSec: 9 } });
  assert.deepEqual(quiet.out.hold.ids, [], "an embed with no entry reports nothing");
  assert.equal(quiet.out.hold.durationSec, undefined);
  const notHeld = m.runNext(ctx, go(ctx, [{ type: "next" }]), { type: "embedDone", output: { ids: [] } });
  assert.equal(notHeld.stepId, "end");
});

test("counting derive: weighted picks, the largest threshold at or below the total", () => {
  const ctx = ctxOf({});
  const at = (q1, q2) => m.derive(ctx, { q1: { ids: [q1], own: null }, q2: { ids: [q2], own: null } }).level;
  assert.equal(at("no", "no"), "gentle");
  assert.equal(at("yes", "not_sure"), "gentle"); // 1.5
  assert.equal(at("yes", "yes"), "firm"); // 2
  assert.equal(m.derive(ctx, {}).level, "gentle");
});

test("planned exits are never offered; safety.open is not a way out; the record carries ctx and out and passes the server", () => {
  const ctx = ctxOf({ urgeId: "send", situationId: "leave", returnTo: "/x" });
  let s = go(ctx, [{ type: "next" }, { type: "embedDone", output: { ids: ["no"] } }]);
  assert.equal(s.stepId, "end");
  assert.deepEqual(s.offered, ["built", "safety_open"]);
  assert.equal(m.runNext(ctx, s, { type: "exit", exitId: "safety_open" }).exitId, null);
  assert.equal(m.runNext(ctx, s, { type: "exit", exitId: "later" }).exitId, null);
  s = m.runNext(ctx, s, { type: "exit", exitId: "built" });
  const rec = m.runRecord(ctx, s);
  assert.deepEqual(rec.ctx, { urgeId: "send", situationId: "leave" }, "returnTo steers; it isn't kept");
  assert.deepEqual(rec.out, [{ embed: "partsLine", stepId: "hold", optionIds: ["no"] }]);
  assert.doesNotThrow(() => validateExt({ run: rec }));
});

test("picked labels: what an embed reads back, labels in pick order, own words last", () => {
  const ctx = ctxOf({});
  const picked = go(ctx, [{ type: "pick", fieldId: "urge", value: "leave" }, { type: "pick", fieldId: "q1", value: "not_sure" }]);
  assert.deepEqual(m.pickedLabels(ctx, picked), { urge: ["leave"], q1: ["not_sure"] });
  // The probe's urge counts own words as its one pick, so they replace the chip.
  const own = go(ctx, [{ type: "pick", fieldId: "urge", value: "leave" }, { type: "own", fieldId: "urge", text: "  slam it  " }]);
  assert.deepEqual(m.pickedLabels(ctx, own), { urge: ["slam it"] });
  const both = { answers: { urge: { ids: ["send"], own: "my way" } } };
  assert.deepEqual(m.pickedLabels(ctx, both), { urge: ["send", "my way"] });
  assert.deepEqual(m.pickedLabels(ctx, m.initialRun(SKILL)), {});
});

// --- F2: profile reads, keep and follow-up actions, inline runs and resume, over a second synthetic skill ------

const F2 = {
  id: "f2_probe", toolId: "f2-probe", version: "t2", start: "who", accepts: [], ownMax: 140, emotionFields: [],
  copy: { keep: "Keep this", profile_unnamed: "One without a name" }, tables: {}, derive: [],
  steps: [
    { id: "who", kind: "ask", fields: [
      { id: "part", options: { profile: "parts", list: "general" }, max: 1, showWhen: { set: "$p.parts" } },
      { id: "line", options: { list: "lines" }, max: 1, own: { hint: "keep", countsAsPick: true } },
    ], keep: { kind: "test_kind", many: true, from: ["line"], when: { set: "$a.line" } }, primary: "keep",
      next: [{ to: "when", when: null }], offers: [] },
    { id: "when", kind: "ask", fields: [{ id: "chip", options: { list: "chips" }, max: 1 }],
      followUp: { type: "resume_skill", whenFrom: "chip" }, next: [{ to: "check", when: null }], offers: [] },
    { id: "check", kind: "ask", fields: [{ id: "change", options: { list: "tvn" }, max: 1, askFresh: "fitsFacts" }],
      next: [{ to: "end", when: null }], offers: [] },
    { id: "end", kind: "handoff", next: [], offers: [], done: "done" },
  ],
  exits: [{ id: "done", toolId: null, query: {}, carry: [], done: true }],
  options: {
    general: [opt("someone")], lines: [opt("l1"), opt("l2")], chips: [opt("1h"), opt("tomorrow")],
    tvn: [opt("better"), opt("same")],
  },
  inline: { enterAt: ["when"], returns: ["line", "chip"], thenVsNowFrom: "change" },
};
const PARTS = [
  { id: "11111111-1111-4111-8111-111111111111", name: "The guard" },
  { id: "22222222-2222-4222-8222-222222222222", name: null },
];
const f2Ctx = (profile) => ({ skill: F2, shared: { parentOf: {}, fitsWhen: {} }, carried: [], gridIds: new Set(), emotionLabel: (x) => x, ctxIn: {}, profile });
const f2 = (ctx, events, s = m.initialRun(F2)) => events.reduce((st, e) => m.runNext(ctx, st, e), s);

test("profile reads: $p shows the field only with kept items; their items come first, never selected, labels shown not recorded", () => {
  const step = F2.steps[0];
  assert.equal(m.shownFields(f2Ctx(null), step, m.initialRun(F2)).length, 1, "loading or signed out: no parts, no field");
  assert.equal(m.shownFields(f2Ctx({ parts: [] }), step, m.initialRun(F2)).length, 1);
  const ctx = f2Ctx({ parts: PARTS });
  assert.equal(m.shownFields(ctx, step, m.initialRun(F2)).length, 2);
  const [g] = m.optionGroups(ctx, step.fields[0], {});
  assert.deepEqual(g.options.map((o) => [o.value, o.label]), [[PARTS[0].id, "The guard"], [PARTS[1].id, "One without a name"], ["someone", "someone"]]);
  const s = f2(ctx, [{ type: "pick", fieldId: "part", value: PARTS[0].id }]);
  assert.deepEqual(m.runRecord(ctx, s).answers, [{ fieldId: "part", optionIds: [PARTS[0].id] }], "the id, never the name");
  assert.deepEqual(conditions.resolve("$p.parts.ids", m.scope(ctx, s)), PARTS.map((p) => p.id));
});

test("keep: the from fields as <field>Ids / <field>Own, only while `when` holds; kept once per step, the id reused", () => {
  const ctx = f2Ctx(null);
  const step = F2.steps[0];
  assert.equal(m.keepFor(ctx, step, m.initialRun(F2)), null, "nothing answered: nothing to keep");
  const s = f2(ctx, [{ type: "own", fieldId: "line", text: " my words " }]);
  assert.deepEqual(m.keepFor(ctx, step, s), { kind: "test_kind", value: { lineOwn: "my words" }, id: null });
  const kept = m.runNext(ctx, s, { type: "kept", stepId: "who", kind: "test_kind", id: "33333333-3333-4333-8333-333333333333" });
  assert.equal(m.keepFor(ctx, step, kept).id, "33333333-3333-4333-8333-333333333333", "passed again: the same item");
  assert.equal(m.runNext(ctx, s, { type: "kept", stepId: "who", kind: "other_kind", id: "x" }).kept.who, undefined, "only the step's own kind");
  assert.deepEqual(m.runRecord(ctx, kept).kept, ["test_kind"]);
  assert.doesNotThrow(() => validateExt({ run: m.runRecord(ctx, kept) }));
});

test("follow-up: the chip picked on the step, once per run", () => {
  const ctx = f2Ctx(null);
  const step = F2.steps[1];
  let s = f2(ctx, [{ type: "next" }]);
  assert.equal(s.stepId, "when");
  assert.equal(m.followUpFor(ctx, step, s), null, "no chip yet");
  s = m.runNext(ctx, s, { type: "pick", fieldId: "chip", value: "tomorrow" });
  assert.deepEqual(m.followUpFor(ctx, step, s), { type: "resume_skill", chip: "tomorrow" });
  s = m.runNext(ctx, s, { type: "scheduled", stepId: "when", followUpType: "resume_skill", id: "44444444-4444-4444-8444-444444444444" });
  assert.equal(m.followUpFor(ctx, step, s), null, "scheduled already");
  assert.deepEqual(m.runRecord(ctx, s).scheduled, ["resume_skill"]);
});

test("inline: starts only at a step it declares; returns its returns fields and the change check as then-vs-now", () => {
  assert.equal(m.initialRun(F2, "when").stepId, "when");
  assert.equal(m.initialRun(F2, "check").stepId, "who", "not an enterAt step: the start");
  assert.equal(m.initialRun({ ...F2, inline: undefined }, "when").stepId, "who");
  const ctx = f2Ctx(null);
  const s = f2(ctx, [{ type: "pick", fieldId: "chip", value: "1h" }, { type: "next" }, { type: "pick", fieldId: "change", value: "better" }], m.initialRun(F2, "when"));
  assert.deepEqual(m.inlineResult(ctx, s), { answers: { chip: { ids: ["1h"], own: null } }, thenVsNow: "better" });
  assert.equal(m.inlineResult({ ...ctx, skill: SKILL }, s), null, "not an inline skill");
});

test("resume: the run's own answers read back at a step it reached; ask-fresh answers are asked again; another skill's record is ignored", () => {
  const ctx = f2Ctx(null);
  const rec = {
    skillId: "f2_probe", versionId: "t2", path: ["who", "when", "check", "end"],
    answers: [{ fieldId: "line", optionIds: ["l2"] }, { fieldId: "chip", optionIds: ["1h"] }, { fieldId: "change", optionIds: ["better"] }, { fieldId: "gone", optionIds: ["x"] }],
  };
  const s = m.resumeRun(ctx, rec, "check");
  assert.equal(s.stepId, "check");
  assert.deepEqual(s.path, ["who", "when", "check"]);
  assert.deepEqual(Object.keys(s.answers).sort(), ["chip", "line"], "the ask-fresh change check is asked again; unknown fields dropped");
  assert.equal(m.resumeRun(ctx, rec, "nowhere").stepId, "end", "a step it never reached: where it stopped");
  assert.equal(m.resumeRun(ctx, { ...rec, versionId: "t1" }, "check"), null, "another version's answers don't fit");
  assert.equal(m.resumeRun(ctx, { ...rec, skillId: "other" }, "check"), null);
});

test("noClose: only on a hand-off, and the player leaves it without the close question", () => {
  for (const sk of fixture.skills) {
    for (const st of sk.steps) {
      if (st.noClose === undefined) continue;
      assert.equal(st.kind, "handoff", `${sk.id}.${st.id}: noClose is for hand-offs`);
      assert.equal(st.noClose, true, `${sk.id}.${st.id}: noClose is true or absent`);
    }
  }
  const src = read("src/components/skillPlayer/SkillPlayer.tsx");
  assert.match(src, /stepOf\(skill, st\.stepId\)\.noClose/, "leave() reads the step's noClose");
  assert.match(src, /!quietLeave/, "SessionClose is skipped after a quiet leave");
  assert.match(read("scripts/skills/build.py"), /"noClose" not in s or \(s\["kind"\] == "handoff"/, "build.py refuses noClose off a hand-off");
});
