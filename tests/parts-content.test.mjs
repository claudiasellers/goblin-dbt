// Parts content (docs/design/parts.md, Phase 0): schema/parts.cypher and tests/fixtures/parts-content.json,
// both generated from scripts/parts/content.py. Coverage runs against the real schema: every module's ids
// are replayed from schema/*.cypher (scripts/recommendations/schema_graph.py, which follows the UNWIND
// lists DEAR MAN and Do the Opposite MERGE through), so a new id in a module fails here until someone maps
// or holds it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { LOAD_ORDER, splitStatements } from "../scripts/load-graph.mjs";
import { gateProblems, lintPartsCopy, partsCopyFromCypher, PARTS_SLOT_WIDTH } from "../scripts/voice-lint.mjs";

const cypher = readFileSync("schema/parts.cypher", "utf8");
const stmts = splitStatements(cypher);
const fixture = JSON.parse(readFileSync("tests/fixtures/parts-content.json", "utf8"));
const rows = partsCopyFromCypher(cypher);
const HOW = "map it (EXPRESSES and friends) or hold it with a reason (HELD and friends) in scripts/parts/content.py, then rebuild";

// Replays every schema file before parts.cypher (recording which file first MERGEd each id), then
// parts.cypher itself, and prints what the tests below read. No database.
const PROBE = String.raw`
import importlib.util, json, os, re, sys
sys.path.insert(0, 'scripts/recommendations')
import schema_graph as sg
spec = importlib.util.spec_from_file_location('parts_content', 'scripts/parts/content.py')  # recommendations has a content.py too
C = importlib.util.module_from_spec(spec)
spec.loader.exec_module(C)
OWN = ['ProtectiveMove', 'PullOption', 'ProtectedHurt', 'PartPrompt', 'PartOption', 'PolarityPair', 'TrailRule',
       'TrailContext', 'PartsPolicy']
COVERED = [*C.EXPRESSES, 'BodySignal', 'InvalidationEvent', 'UnmetNeed', 'Underneath']
OTHER = ['BodyRegion', 'ThoughtPattern', 'AmbivalenceOption', 'Emotion']
TYPES = ['EXPRESSES', 'AT_PLACE', 'NAMED_AS', 'OFTEN_GUARDS', 'CAN_TOUCH', 'ANSWERS', 'SAME_AS', 'OFFERED_FOR',
         'HAS_SIDE', 'BOTH_WANT', 'WORRY']
pid = lambda n: n.props.get('id')
g, origin, skipped = sg.Graph(), {}, []
def run(f):
    for k, stmt in enumerate(sg.split_statements(open(os.path.join('schema', f), encoding='utf8').read())):
        try:
            sg.run_statement(g, stmt)
        except (sg.Unsupported, KeyError, IndexError, ValueError, TypeError) as e:
            skipped.append({'file': f, 'n': k + 1, 'why': str(e), 'stmt': stmt[:200]})
order = sg.load_order()
for f in order[:order.index('parts.cypher')]:
    run(f)
    for n in g.nodes:
        for l in n.labels:
            origin.setdefault(l + ':' + str(pid(n)), f)
schema = {l: {pid(n): {'file': origin.get(l + ':' + str(pid(n))), 'label': n.props.get('label')} for n in g.find(l)}
          for l in COVERED + OTHER}
merge_re = re.compile(r'MERGE \(\w*:(%s)\b' % '|'.join(COVERED + OTHER))
before = len(skipped)
run('parts.cypher')
out = {
    'schema': schema,
    'skippedMerges': [s for s in skipped[:before] if merge_re.search(s['stmt'])],
    'partsSkipped': skipped[before:],
    'nodes': {l: {pid(n): n.props for n in g.find(l)} for l in OWN},
    'rels': [{'type': r.type, 'from': sorted(r.start.labels)[0], 'fromId': pid(r.start), 'to': sorted(r.end.labels)[0],
              'toId': pid(r.end), 'props': r.props} for r in g.relationships if r.type in TYPES],
    'content': {'EXPRESSES': {l: {s: m for s, (m, _) in t.items()} for l, t in C.EXPRESSES.items()}, 'HELD': C.HELD,
                'BodySignal': [C.AT_PLACE, C.AT_PLACE_HELD], 'InvalidationEvent': [C.CAN_TOUCH, C.CAN_TOUCH_HELD],
                'UnmetNeed': [C.ANSWERS, C.ANSWERS_HELD], 'Underneath': [C.UNDERNEATH_SAME_AS, C.UNDERNEATH_HELD]},
}
print(json.dumps(out, ensure_ascii=False, default=str))
`;
let replay = null;
try { replay = JSON.parse(execFileSync("python3", ["-"], { input: PROBE, encoding: "utf8", maxBuffer: 64 << 20 })); } catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const needReplay = (t) => { if (!replay) t.skip("python3 unavailable"); return !!replay; };
const nodes = (label) => Object.values(replay.nodes[label]);
const rels = (type) => replay.rels.filter((r) => r.type === type);
const moveIds = (pred) => nodes("ProtectiveMove").filter(pred).map((m) => m.id);

test("generated file is fresh: schema/parts.cypher (python3 scripts/parts/build.py)", (t) => {
  let out;
  try { out = execFileSync("python3", ["scripts/parts/build.py"], { encoding: "utf8" }); } catch (e) {
    if (e.code === "ENOENT") { t.skip("python3 unavailable"); return; }
    throw e;
  }
  assert.equal(out.trim(), cypher.trim(), "run: python3 scripts/parts/build.py > /tmp/parts.cypher && mv /tmp/parts.cypher schema/parts.cypher");
});

test("generated file is fresh: tests/fixtures/parts-content.json (python3 scripts/parts/fixture.py)", (t) => {
  try { execFileSync("python3", ["scripts/parts/fixture.py"], { encoding: "utf8" }); } catch (e) {
    if (e.code === "ENOENT") { t.skip("python3 unavailable"); return; }
    throw e;
  }
  assert.deepEqual(JSON.parse(readFileSync("tests/fixtures/parts-content.json", "utf8")), fixture);
});

test("loads after every file it MATCHes, before recommended-for (which stays last); constraints for its labels", () => {
  const at = (f) => LOAD_ORDER.indexOf(f);
  assert.equal(LOAD_ORDER.filter((f) => f === "parts.cypher").length, 1);
  for (const f of ["opposite-action-data.cypher", "find-the-feeling.cypher", "dear-man-content.cypher", "dear-man-debrief-content.cypher",
    "problem-solve-barriers.cypher", "discriminating-questions.cypher", "invalidation-recovery.cypher", "body-map.cypher",
    "emotion-wheel-sync.cypher"]) {
    assert.ok(at("parts.cypher") > at(f), `parts.cypher loads after ${f}`);
  }
  const constraints = readFileSync("schema/constraints.cypher", "utf8");
  for (const l of ["ProtectiveMove", "PullOption", "ProtectedHurt", "PartPrompt", "PartOption", "PolarityPair", "TrailRule", "TrailContext", "PartsPolicy"]) {
    assert.match(constraints, new RegExp(`IF NOT EXISTS FOR \\(n:${l}\\) REQUIRE n\\.id IS UNIQUE;`), l);
  }
});

test("the replay runs every parts statement, and every edge statement lands (both ends exist)", (t) => {
  if (!needReplay(t)) return;
  assert.deepEqual(replay.partsSkipped, [], "schema_graph.py could not run these parts.cypher statements");
  const written = {};
  for (const s of stmts) {
    const m = s.match(/^MATCH \(a:\w+ \{id: "[^"]+"\}\), \(b:\w+ \{id: "[^"]+"\}\)\nMERGE \(a\)-\[r:([A-Z_]+)\]->\(b\)/);
    if (m) written[m[1]] = (written[m[1]] ?? 0) + 1;
  }
  const landed = {};
  for (const r of replay.rels) landed[r.type] = (landed[r.type] ?? 0) + 1;
  assert.deepEqual(landed, written, "an edge whose source or target id doesn't exist is silently a no-op in Neo4j");
});

test("coverage: every id a module MERGEs is mapped or held in scripts/parts/content.py, and nothing else is", (t) => {
  if (!needReplay(t)) return;
  const { schema, content } = replay;
  assert.deepEqual(replay.skippedMerges.map((s) => `${s.file} #${s.n}`), [],
    "the replay skipped a statement that MERGEs a covered label, so coverage can't see its ids: teach schema_graph.py the shape");
  const tables = Object.keys(content.EXPRESSES).filter((l) => l !== "PullOption")
    .map((l) => [l, content.EXPRESSES[l], content.HELD[l]])
    .concat(["BodySignal", "InvalidationEvent", "UnmetNeed", "Underneath"].map((l) => [l, ...content[l]]));
  for (const [label, mapped, held] of tables) {
    const ids = Object.keys(schema[label]);
    assert.ok(ids.length > 0, `no ${label} in the schema`);
    for (const id of ids) {
      assert.ok(id in mapped || id in held, `${label} "${id}" (MERGEd in schema/${schema[label][id].file}) is neither mapped nor held: ${HOW}`);
    }
    for (const id of [...Object.keys(mapped), ...Object.keys(held)]) {
      assert.ok(id in schema[label], `${label} "${id}" is mapped or held in scripts/parts/content.py but no schema file MERGEs it`);
    }
  }
  // PullOption is parts' own label: what it maps is exactly what it MERGEs.
  assert.deepEqual([...Object.keys(content.EXPRESSES.PullOption), ...Object.keys(content.HELD.PullOption)].sort(),
    Object.keys(replay.nodes.PullOption).sort());
});

test("targets are real: NAMED_AS words, the body map's 15 places, SAME_AS targets, ThoughtPattern-backed voice chips", (t) => {
  if (!needReplay(t)) return;
  let words;
  try { words = JSON.parse(execFileSync("python3", ["scripts/emotions/build.py", "--json"], { encoding: "utf8" })); } catch { t.skip("python3 unavailable"); return; }
  const known = new Set([...words.square, ...words.graphOnly].map((w) => (typeof w === "string" ? w : w.id)));
  const named = rels("NAMED_AS");
  assert.ok(named.length > 0);
  for (const r of named) assert.ok(known.has(r.toId), `${r.fromId} NAMED_AS ${r.toId}: not a check-in word (scripts/emotions/content.py)`);
  assert.deepEqual(fixture.hurts.flatMap((h) => h.namedAs.map((e) => `${h.id}:${e}`)).sort(), named.map((r) => `${r.fromId}:${r.toId}`).sort());

  const places = JSON.parse(readFileSync("tests/fixtures/body-map-content.json", "utf8")).regions;
  assert.equal(places.length, 15);
  for (const r of rels("AT_PLACE")) assert.ok(places.includes(r.toId), `${r.fromId} AT_PLACE ${r.toId}: not one of the body map's places`);

  const same = rels("SAME_AS");
  assert.deepEqual([...new Set(same.map((r) => `${r.from}->${r.to}`))].sort(),
    ["PartOption->AmbivalenceOption", "PartOption->ThoughtPattern", "Underneath->ProtectedHurt"]);
  for (const r of same.filter((x) => x.from === "PartOption")) {
    const target = replay.schema[r.to][r.toId];
    assert.ok(target, `${r.fromId} SAME_AS ${r.to} ${r.toId}: no such node`);
    if (r.to === "ThoughtPattern") {
      const o = replay.nodes.PartOption[r.fromId];
      assert.equal(o.kind, "voice", `${r.fromId}: a ThoughtPattern twin is a voice chip`);
      assert.equal(o.label, target.label, `${r.fromId}: the same answer reads the same in DEAR MAN and Meet a part`);
    }
  }
});

test("voice contract: every parts copy row passes the lint, the loader's gate covers parts.cypher, and nothing visible escapes the rows", (t) => {
  assert.deepEqual(lintPartsCopy(rows), []);
  assert.deepEqual(gateProblems(["parts.cypher"]), []);
  assert.ok(LOAD_ORDER.includes("parts.cypher"), "a full load's gate (voiceGate(LOAD_ORDER)) lints parts.cypher");
  // The lint really runs on these rows: an over-long chip is an error.
  assert.ok(lintPartsCopy([{ ...rows[0], text: "x".repeat(61) }]).some((f) => f.rule === "parts_max_length" && f.severity === "error"));
  if (!needReplay(t)) return;
  const have = new Map(rows.map((r) => [`${r.id}|${r.field}`, r]));
  assert.equal(have.size, rows.length, "one row per (id, field)");
  const visible = [
    ["ProtectiveMove", ["label", "unblendPhrase", "trailPhrase", "nameHint"]],
    ["ProtectedHurt", ["label", "hurtPhrase", "feltPhrase", "matters"]],
    ["PartPrompt", ["copy"]], ["PartOption", ["label"]], ["TrailRule", ["statementTemplate"]], ["TrailContext", ["phrase"]],
    ["PullOption", ["label"]], // Recover's own pull labels (imported), shown on the trail offer's evidence rows
  ];
  let n = 0;
  for (const [label, fields] of visible) {
    for (const node of nodes(label)) {
      for (const f of fields) {
        if (node[f] == null) continue;
        n++;
        const r = have.get(`${node.id}|${f}`);
        assert.ok(r, `${label} ${node.id}.${f} is user-visible but has no // @parts-copy-json row, so the lint never sees it`);
        assert.equal(r.text, node[f], `${label} ${node.id}.${f}: the row's text is what the graph stores`);
      }
    }
  }
  assert.equal(n, rows.length, "no row without a node behind it");
  const kinds = Object.fromEntries(rows.map((r) => [`${r.id}|${r.field}`, r.kind]));
  for (const o of nodes("PartOption")) assert.equal(kinds[`${o.id}|label`], o.kind, o.id);
  for (const p of nodes("PartPrompt")) assert.equal(kinds[`${p.id}|copy`], p.copyKind ?? "prompt", p.id);
});

test("fragment widths fit the slots they fill (PARTS_SLOT_WIDTH)", () => {
  const fits = (text, slot, what) => assert.ok(text.length <= PARTS_SLOT_WIDTH[slot], `${what} "${text}" is ${text.length} chars; {${slot}} counts ${PARTS_SLOT_WIDTH[slot]}`);
  for (const m of fixture.moves) {
    fits(m.unblendPhrase, "move", `${m.id} unblendPhrase`);
    fits(m.trailPhrase, "pull", `${m.id} trailPhrase`);
    fits(m.nameHint, "name", `${m.id} nameHint`);
  }
  for (const h of fixture.hurts) {
    fits(h.hurtPhrase, "hurt", `${h.id} hurtPhrase`);
    fits(h.matters, "matters", `${h.id} matters`);
    fits(h.feltPhrase, "felt", `${h.id} feltPhrase`);
  }
  for (const p of fixture.pairs) for (const w of p.bothWant) fits(w.label, "want", `${p.id} bothWant ${w.id}`);
  for (const c of fixture.contexts) fits(c.phrase, "context", `${c.id} phrase`);
});

test("the angry-part card: every line in both wordings, the plain one never says part, a matters per hurt", () => {
  const angry = Object.entries(fixture.prompts).filter(([, p]) => p.flow === "angry").map(([id]) => id);
  // Parts on only, no twin: the later line's "done" (content.py PARTS_ON_ONLY).
  const onOnly = ["angry_later_done"];
  const base = angry.filter((id) => !id.endsWith("_plain") && !onOnly.includes(id));
  assert.deepEqual(angry.filter((id) => onOnly.includes(id)), onOnly);
  assert.deepEqual(base, ["angry_unblend", "angry_unblend_sub", "angry_protects", "angry_vote", "angry_vote_noname",
    "angry_vote_unsure", "angry_vote_unsure_noname", "angry_vote_2", "angry_vote_3", "angry_vote_3_noname", "angry_hold",
    "angry_speak", "angry_speak_unsure", "angry_speak_line"]);
  assert.deepEqual(angry.sort(), [...base, ...base.map((id) => `${id}_plain`), ...onOnly].sort(), "every X has an X_plain, and nothing else");
  for (const id of angry.filter((x) => x.endsWith("_plain"))) {
    assert.doesNotMatch(fixture.prompts[id].copy, /\bparts?\b/i, `${id}: parts off means no parts words`);
  }
  // The person's sentence is theirs: linted without voice_distance, with only {felt}.
  for (const id of ["angry_speak_line", "angry_speak_line_plain"]) assert.equal(fixture.prompts[id].copyKind, "first_person", id);
  assert.deepEqual(Object.values(fixture.options.angry).flat().map((o) => [o.id, o.label]),
    [["angry_next", "Okay"], ["angry_not_now", "Not now"], ["angry_not_now_plain", "Not now"], ["angry_not_sure", "Not sure"],
      ["angry_done", "Done"], ["angry_later", "Spend a minute with it later?"], ["angry_back", "Back"], ["angry_vote_next", "Next"]]);
  // "Later" shows with parts on only, so its lines have no plain twin; tapping it queues a candidate.
  const later = fixture.options.angry.speak.find((o) => o.id === "angry_later");
  assert.equal(later.branch, "candidate");
  assert.equal(fixture.prompts.angry_later_done.step, "speak");
  assert.equal(fixture.prompts.angry_later_done_plain, undefined);
  assert.equal(Object.values(fixture.options.angry).flat().some((o) => o.id === "angry_later_plain"), false);
  // The card's own way past, one per wording, on its first screen, and it ends the card.
  for (const id of ["angry_not_now", "angry_not_now_plain"]) {
    const o = Object.values(fixture.options.angry).flat().find((x) => x.id === id);
    assert.equal(fixture.options.angry.unblend.includes(o), true, id);
    assert.equal(o.branch, "end", id);
  }
  assert.equal(fixture.hurts.length, 6);
  for (const h of fixture.hurts) assert.ok(h.matters?.trim(), `${h.id}: matters fills the vote of confidence`);
  // Recover's events pre-order the chips; every one points at real hurts.
  const hurtIds = new Set(fixture.hurts.map((h) => h.id));
  for (const [ev, t] of Object.entries(fixture.canTouch)) {
    assert.ok(t.hurts.length > 0 && ["draft", "approved"].includes(t.reviewStatus), ev);
    for (const h of t.hurts) assert.ok(hurtIds.has(h), `${ev} → ${h}`);
  }
  // The edges carry their order, so the shipped file (parts.json canTouch) keeps it.
  for (const [ev, t] of Object.entries(fixture.canTouch)) {
    t.hurts.forEach((h, i) => assert.ok(
      stmts.some((x) => x.includes(`{id: "${ev}"}`) && x.includes(`{id: "${h}"}`) && x.includes("CAN_TOUCH") && x.includes(`order: ${i}`)), `${ev} → ${h} order ${i}`));
  }
});

test("safety pins", (t) => {
  // Copy rows only: ids and numbers like windowDays aren't copy.
  for (const r of rows) assert.doesNotMatch(r.text, /\d{3}/, `${r.id}.${r.field}: crisis numbers come from the crisis seam, never from parts copy`);
  assert.ok(!stmts.some((s) => /RECOMMENDED_FOR|:TherapyConcept\b/.test(s)), "Meet a part is never routable: no TherapyConcept and no RECOMMENDED_FOR in parts.cypher");
  if (!needReplay(t)) return;
  for (const m of nodes("ProtectiveMove")) {
    for (const v of [m.id, m.label, m.unblendPhrase, m.trailPhrase, m.nameHint].filter(Boolean)) {
      assert.doesNotMatch(v, /disappear/i, `${m.id}: "A part of you wants to disappear" reads as the app echoing suicidal ideation`);
    }
  }
  for (const id of ["go_blank", "zone_out"]) {
    const m = replay.nodes.ProtectiveMove[id];
    assert.equal(m.offerable, false, `${id}: shutdown and far-away states are where parts language most often harms; never offered`);
    for (const f of ["unblendPhrase", "trailPhrase", "nameHint"]) assert.equal(m[f], undefined, `${id} has no ${f}: it is never shown`);
  }
  const offerable = new Set(moveIds((m) => m.offerable));
  for (const r of rels("OFFERED_FOR")) assert.ok(offerable.has(r.toId), `${r.fromId} is OFFERED_FOR ${r.toId}, a move that is never offered`);
  for (const r of rels("HAS_SIDE")) assert.ok(offerable.has(r.toId), `${r.fromId}: Two pulls pairs use offerable moves only (${r.toId})`);
  for (const m of moveIds((x) => x.safetyLine)) {
    const danger = rels("OFFERED_FOR").filter((r) => r.toId === m).map((r) => replay.nodes.PartOption[r.fromId])
      .filter((o) => o.step === "fear" && o.flag === "danger" && o.branch === "danger");
    assert.ok(danger.length > 0, `${m} has a safety line, so it needs a danger fear that shows crisis resources alongside`);
  }
  const policy = replay.nodes.PartsPolicy.parts;
  const off = "switch on in scripts/parts/content.py only after Claudia reviews the rules on real data";
  assert.equal(policy.offersEnabled, false, off);
  for (const r of nodes("TrailRule")) assert.equal(r.enabled, false, `${r.id}: ${off}`);
});

test("drafts until signed off: every node and edge carries reviewStatus, pending ids are marked", (t) => {
  if (!needReplay(t)) return;
  const signed = readFileSync("scripts/parts/content.py", "utf8").match(/^SIGNED_OFF = (\{[\s\S]*?\})$/m)[1];
  const signedIds = new Set([...signed.matchAll(/"([a-z0-9_:-]+)"\s*:/g)].map((m) => m[1]));
  const want = (id) => (signedIds.has(id) ? "approved" : "draft");
  for (const [label, byId] of Object.entries(replay.nodes)) {
    for (const [id, n] of Object.entries(byId)) {
      assert.equal(n.reviewStatus, want(id), `${label} ${id}`);
      assert.equal(n.version, fixture.version, `${label} ${id}`);
      assert.equal(n.pending, fixture.pending[id], `${label} ${id}: pending`);
    }
  }
  for (const r of replay.rels) assert.equal(r.props.reviewStatus, want(r.fromId), `${r.type} from ${r.fromId}: reviewed by its source id`);
  // Every pending id is a real node and carries its reason (holds for an empty map too).
  const byId = Object.assign({}, ...Object.values(replay.nodes));
  for (const [id, why] of Object.entries(fixture.pending)) {
    assert.ok(byId[id], `pending ${id}: no such node`);
    assert.ok(why, `pending ${id}: say what it waits on`);
    assert.equal(byId[id].pending, why, `pending ${id}: marked on the node`);
  }
});

test("the blending check is decided (Claudia, 16 Oct): drafts, not pending, in flow gate; Two pulls asks it about both", (t) => {
  const BLEND = {
    gate_blend_check: ["blend", null], blend_notice: ["blend", "continue"], blend_running: ["blend", "body_first"],
    blend_not_sure: ["blend", "continue"],
    gate_blend_check_pulls: ["blend_pulls", null], blend_pulls_notice: ["blend_pulls", "continue"],
    blend_pulls_running: ["blend_pulls", "body_first"], blend_pulls_not_sure: ["blend_pulls", "continue"],
  };
  for (const id of Object.keys(BLEND)) assert.ok(!(id in fixture.pending), `${id} is decided, not pending`);
  assert.equal(fixture.prompts.gate_blend_check_pulls.copy, "Right now, can you notice them both, or is one of them running things?");
  assert.deepEqual(Object.fromEntries((fixture.options.gate.blend_pulls ?? []).map((o) => [o.id, o.label])), {
    blend_pulls_notice: "I can notice them", blend_pulls_running: "One of them is running things", blend_pulls_not_sure: "Not sure",
  });
  for (const [id, [step, branch]] of Object.entries(BLEND)) {
    if (branch === null) {
      const p = fixture.prompts[id];
      assert.ok(p, id);
      assert.deepEqual([p.flow, p.step, p.reviewStatus, p.pending], ["gate", step, "draft", undefined], id);
    } else {
      const o = (fixture.options.gate[step] ?? []).find((x) => x.id === id);
      assert.ok(o, `${id}: an option at gate/${step}`);
      assert.deepEqual([o.kind, o.branch, o.reviewStatus, o.pending, o.moves], ["chip", branch, "draft", undefined, []], id);
    }
  }
  if (!needReplay(t)) return;
  for (const id of Object.keys(BLEND)) {
    const n = replay.nodes.PartPrompt[id] ?? replay.nodes.PartOption[id];
    assert.equal(n.pending, undefined, `${id}: the load clears pending (null) on the node`);
    assert.equal(n.reviewStatus, "draft", id);
  }
});

test("stale edges: each parts edge type is cleared, scoped to both ends, before it is merged again", () => {
  const types = [...new Set(stmts.map((s) => s.match(/^MATCH \(a:(\w+) [^\n]*\(b:(\w+) [^\n]*\nMERGE \(a\)-\[r:([A-Z_]+)\]/)).filter(Boolean)
    .map((m) => `${m[1]}|${m[3]}|${m[2]}`))];
  for (const key of types) {
    const [from, type, to] = key.split("|");
    const firstMerge = stmts.findIndex((s) => s.startsWith(`MATCH (a:${from} `) && s.includes(`(b:${to} `) && s.includes(`MERGE (a)-[r:${type}]`));
    // EXPRESSES comes from nine labels; it is parts' own type, so its clear is scoped by the target only.
    const start = type === "EXPRESSES" ? "" : `:${from}`;
    const clear = stmts.findIndex((s) => new RegExp(`^MATCH \\(${start}\\)-\\[r:([A-Z_]+\\|)*${type}(\\|[A-Z_]+)*\\]->\\(:${to}\\) DELETE r$`).test(s));
    assert.ok(clear >= 0 && clear < firstMerge, `${from}-[:${type}]->${to}: no scoped DELETE before the first MERGE`);
  }
  // Every DELETE names its target label, so it can only touch the edges this file writes.
  for (const s of stmts.filter((x) => /\bDELETE\b/.test(x))) assert.match(s, /^MATCH \((:\w+)?\)-\[r:[A-Z_|]+\]->\(:\w+\) DELETE r$/, s);
});

test("settings: the switch, about and Delete your parts prompts exist as drafts in the settings flow", () => {
  const want = {
    switch: ["settings_label", "settings_blurb", "settings_dissociation", "settings_off"],
    about: ["settings_about_1", "settings_about_2"],
    delete: ["settings_delete", "settings_delete_confirm", "settings_delete_yes", "settings_delete_no", "settings_delete_done", "settings_delete_failed"],
  };
  for (const [step, ids] of Object.entries(want)) {
    for (const id of ids) {
      const p = fixture.prompts[id];
      assert.ok(p, `${id} missing`);
      assert.deepEqual([p.flow, p.step], ["settings", step], id);
      assert.ok(p.copy.trim(), `${id}: no copy`);
      assert.equal(p.reviewStatus, "draft", `${id}: signed off? Then update this pin with the sign-off`);
    }
  }
});
