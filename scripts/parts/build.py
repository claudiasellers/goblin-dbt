"""Generate schema/parts.cypher from content.py (the single editable source).

Usage (repo root; write to a temp file first so a failed build never empties the file):
  python3 scripts/parts/build.py > /tmp/parts.cypher && mv /tmp/parts.cypher schema/parts.cypher
Then: python3 scripts/parts/fixture.py && node --test tests/parts-content.test.mjs

Every user-visible string is also written as rows {id, field, kind, text} on single-line
`// @parts-copy-json ` markers (at most 30 rows each, just above the statements they describe), so the
voice lint (scripts/voice-lint.mjs: npm test and the loader's gate) reads the parts copy without Python.

None-valued properties are written as null: `+=` then removes the property, so a phrase or flag dropped
from content.py doesn't linger on the node. Edges are cleared per type before they are re-merged (scoped
to both ends, so only edges this file owns), so a dropped mapping leaves no stale edge.
"""
import ast, json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
from content import (VERSION, SIGNED_OFF, review_status, MOVES, PULL_OPTIONS, EXPRESSES, HELD,  # noqa: E402
                     AT_PLACE, AT_PLACE_HELD, HURTS, OFTEN_GUARDS, CAN_TOUCH, CAN_TOUCH_HELD, ANSWERS, ANSWERS_HELD,
                     UNDERNEATH_SAME_AS, UNDERNEATH_HELD, PROMPTS, PROMPT_KINDS, OPTIONS, OFFERABLE, SAFETY_LINE, PENDING,
                     PAIRS, KEEPSAKE, TRAIL_RULES, CONTEXTS, POLICY)

MOVE_IDS = [m["id"] for m in MOVES]
HURT_IDS = [h["id"] for h in HURTS]
PHRASES = ("unblendPhrase", "trailPhrase", "nameHint")
FLAGS = (None, "tender", "danger")
FLAG_BRANCH = {"tender": "conservative", "danger": "danger"}
# The two Settings lines that credit the source; nowhere else may name it (parts.md "Language").
ABOUT_IDS = ("settings_about_1", "settings_about_2")
# Prompt kinds other than "prompt" a PROMPTS line may take (PROMPT_KINDS); the keepsake is its own list.
PROMPT_COPY_KINDS = ("first_person",)
# Flows whose every prompt has two wordings: X (parts on) and X_plain (parts off).
TWO_WORDINGS = ("angry",)


def pair_chips():
    """Two pulls chips as PartOption rows, in PAIRS order. An id shared by two pairs is one chip."""
    out, seen = [], {}
    for p in PAIRS:
        for field, step in (("bothWant", "both_want"), ("worryA", "worry"), ("worryB", "worry")):
            for cid, label in p[field]:
                if cid in seen:
                    assert seen[cid] == (step, label), f"PartOption {cid} repeats with different text or step"
                    continue
                seen[cid] = (step, label)
                out.append(dict(id=cid, flow="pulls", step=step, label=label, kind="chip", moves=None, flag=None,
                                selfLike=None, branch="continue", sameAs=[]))
    return out


def all_options():
    return OPTIONS + pair_chips()


def strings(x):
    """Every string in a content structure (dict keys included)."""
    if isinstance(x, str):
        yield x
    elif isinstance(x, dict):
        for k, v in x.items():
            yield from strings(k)
            yield from strings(v)
    elif isinstance(x, (list, tuple)):
        for v in x:
            yield from strings(v)


def duplicate_dict_keys():
    """A repeated key in a dict literal silently keeps the last value, so read content.py's source."""
    tree = ast.parse(open(os.path.join(here, "content.py"), encoding="utf8").read())
    dups = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Dict):
            keys = [k.value for k in node.keys if isinstance(k, ast.Constant)]
            dups += sorted({k for k in keys if keys.count(k) > 1})
    return dups


def check():
    assert not duplicate_dict_keys(), f"repeated keys in content.py: {duplicate_dict_keys()}"

    # ids unique per label (a pair chip may repeat across PAIRS with identical text: pair_chips asserts that)
    options = all_options()
    for label, ids in (("ProtectiveMove", MOVE_IDS), ("PullOption", [p[0] for p in PULL_OPTIONS]),
                       ("ProtectedHurt", HURT_IDS), ("PartPrompt", [p[0] for p in PROMPTS] + [k[0] for k in KEEPSAKE]),
                       ("PartOption", [o["id"] for o in options]), ("PolarityPair", [p["id"] for p in PAIRS]),
                       ("TrailRule", [r["id"] for r in TRAIL_RULES]), ("TrailContext", [c[0] for c in CONTEXTS])):
        assert len(ids) == len(set(ids)), f"{label}: duplicate ids {sorted({i for i in ids if ids.count(i) > 1})}"

    # every move / hurt referenced exists
    for label, table in EXPRESSES.items():
        for src, (move, why) in table.items():
            assert move in MOVE_IDS, f"{label} {src} → unknown move {move}"
            assert why and why.strip(), f"{label} {src}: why"
    assert set(OFTEN_GUARDS) <= set(MOVE_IDS), set(OFTEN_GUARDS) - set(MOVE_IDS)
    for o in options:
        assert all(m in MOVE_IDS for m in (o["moves"] or [])), f"{o['id']}: unknown move"
    for p in PAIRS:
        assert p["a"] in MOVE_IDS and p["b"] in MOVE_IDS, p["id"]
    for name, table in (("OFTEN_GUARDS", OFTEN_GUARDS), ("CAN_TOUCH", CAN_TOUCH), ("ANSWERS", ANSWERS),
                        ("UNDERNEATH_SAME_AS", UNDERNEATH_SAME_AS)):
        for src, hurts in table.items():
            assert hurts and len(hurts) == len(set(hurts)), f"{name} {src}: empty or repeated hurts"
            assert set(hurts) <= set(HURT_IDS), f"{name} {src} → unknown hurt {set(hurts) - set(HURT_IDS)}"

    # mapped or held, never both (and every reason given)
    assert set(EXPRESSES) == set(HELD), "every EXPRESSES label has a HELD table (empty is fine)"
    for label in EXPRESSES:
        both = set(EXPRESSES[label]) & set(HELD[label])
        assert not both, f"{label}: {sorted(both)} both mapped and held"
    for name, mapped, held in (("AT_PLACE", AT_PLACE, AT_PLACE_HELD), ("CAN_TOUCH", CAN_TOUCH, CAN_TOUCH_HELD),
                               ("ANSWERS", ANSWERS, ANSWERS_HELD), ("UNDERNEATH", UNDERNEATH_SAME_AS, UNDERNEATH_HELD)):
        both = set(mapped) & set(held)
        assert not both, f"{name}: {sorted(both)} both mapped and held"
    for table in [*HELD.values(), AT_PLACE_HELD, CAN_TOUCH_HELD, ANSWERS_HELD, UNDERNEATH_HELD]:
        for src, why in table.items():
            assert why and why.strip(), f"held {src} without a reason"
    # PullOption is parts' own label, so its coverage is checked here (the others against the schema, in the test)
    pulls = {p[0] for p in PULL_OPTIONS}
    assert set(EXPRESSES["PullOption"]) | set(HELD["PullOption"]) == pulls, "every PullOption mapped or held"

    # offerable moves have every phrase; go_blank / zone_out have none
    for m in MOVES:
        if m["offerable"]:
            assert all(m[k] for k in PHRASES), f"{m['id']}: an offerable move needs {PHRASES}"
        else:
            assert all(m[k] is None for k in PHRASES), f"{m['id']}: a move that is never offered has no phrases"
            assert not m["safetyLine"], m["id"]
        assert m["kind"] in ("proactive", "reactive", "either"), m["id"]
    assert set(OFTEN_GUARDS) <= set(OFFERABLE), f"OFTEN_GUARDS on a move never offered: {set(OFTEN_GUARDS) - set(OFFERABLE)}"

    for p in PAIRS:
        assert p["a"] in OFFERABLE and p["b"] in OFFERABLE and p["a"] != p["b"], f"{p['id']}: two different offerable moves"
        assert p["bothWant"] and p["worryA"] and p["worryB"], f"{p['id']}: a bothWant and a worry per side"
        worry_ids = [c[0] for c in p["worryA"] + p["worryB"]]
        assert len(worry_ids) == len(set(worry_ids)), f"{p['id']}: a worry on both sides"

    for o in OPTIONS:
        assert o["moves"] is None or set(o["moves"]) <= set(OFFERABLE), f"{o['id']}: offered for a move never offered"
        assert o["moves"] is None or (o["moves"] and len(o["moves"]) == len(set(o["moves"]))), o["id"]
        assert o["flag"] in FLAGS, f"{o['id']}: flag {o['flag']}"
        if o["flag"]:
            assert o["branch"] == FLAG_BRANCH[o["flag"]], f"{o['id']}: a {o['flag']} chip takes the {FLAG_BRANCH[o['flag']]} branch"
        assert o["kind"] in ("chip", "voice"), f"{o['id']}: kind {o['kind']}"
        assert o["selfLike"] is None or o["step"] == "feel", f"{o['id']}: selfLike only at feel"
        for label, _ in o["sameAs"]:
            assert label in ("ThoughtPattern", "AmbivalenceOption"), f"{o['id']}: SAME_AS {label}"

    def has(move, step, unflagged=False):
        return any(o["step"] == step and o["moves"] and move in o["moves"] and not (unflagged and o["flag"]) for o in OPTIONS)
    for m in OFFERABLE:
        for step in ("voice", "job", "rather"):
            assert has(m, step), f"{m}: no {step} option"
        assert has(m, "fear", unflagged=True), f"{m}: no unflagged fear"
    for m in SAFETY_LINE:
        assert any(o["flag"] == "danger" and o["moves"] and m in o["moves"] for o in OPTIONS), f"{m}: safetyLine needs a danger fear"

    # the angry card: two wordings per line, the plain one never says "part"; each hurt says what matters
    prompt_ids = {p[0] for p in PROMPTS}
    for flow in TWO_WORDINGS:
        ids = {p[0] for p in PROMPTS if p[1] == flow}
        for pid in ids:
            twin = pid[:-len("_plain")] if pid.endswith("_plain") else pid + "_plain"
            assert twin in ids, f"{pid}: flow {flow} has two wordings per line, {twin} is missing"
    for pid, flow, step, copy in PROMPTS:
        if flow in TWO_WORDINGS and pid.endswith("_plain"):
            assert not re.search(r"\bparts?\b", copy, re.I), f"{pid}: the parts-off wording never says part: {copy!r}"
    for h in HURTS:
        assert h.get("matters") and h["matters"].strip(), f"{h['id']}: matters (the angry card's vote of confidence)"
    assert set(PROMPT_KINDS) <= prompt_ids, f"PROMPT_KINDS ids that aren't prompts: {set(PROMPT_KINDS) - prompt_ids}"
    assert set(PROMPT_KINDS.values()) <= set(PROMPT_COPY_KINDS), f"PROMPT_KINDS: {set(PROMPT_KINDS.values())}"

    # copy rules over everything in the source
    about = {p[3] for p in PROMPTS if p[0] in ABOUT_IDS}
    content = [MOVES, PULL_OPTIONS, EXPRESSES, HELD, AT_PLACE, AT_PLACE_HELD, HURTS, OFTEN_GUARDS, CAN_TOUCH,
               CAN_TOUCH_HELD, ANSWERS, ANSWERS_HELD, UNDERNEATH_SAME_AS, UNDERNEATH_HELD, PROMPTS, PROMPT_KINDS, OPTIONS, PENDING,
               PAIRS, KEEPSAKE, TRAIL_RULES, CONTEXTS, POLICY]
    for s in strings(content):
        assert "!" not in s, f"no '!' in parts content: {s!r}"
        assert not re.search(r"\d{3}", s), f"no digit run of 3+ (crisis numbers come from the crisis seam): {s!r}"
        if s not in about:
            assert not re.search(r"\bIFS\b|Internal Family Systems", s), f"IFS is named only in Settings' About lines: {s!r}"

    ids = set(MOVE_IDS) | pulls | set(HURT_IDS) | {p[0] for p in PROMPTS} | {k[0] for k in KEEPSAKE} \
        | {o["id"] for o in options} | {p["id"] for p in PAIRS} | {r["id"] for r in TRAIL_RULES} | {c[0] for c in CONTEXTS}
    assert set(PENDING) <= ids, f"PENDING ids that don't exist: {set(PENDING) - ids}"

    # The kill switch, mirroring scripts/recommendations/build.py: nothing turns on while it is a draft.
    for r in TRAIL_RULES:
        assert not r["enabled"] or r["id"] in SIGNED_OFF, f"TrailRule {r['id']} can't be enabled while it is a draft"
    if POLICY["offersEnabled"]:
        drafts = [r["id"] for r in TRAIL_RULES if r["enabled"] and r["id"] not in SIGNED_OFF] \
            + [m for m in OFFERABLE if m not in SIGNED_OFF]
        assert not drafts, f"PartsPolicy.offersEnabled can't be true while these are drafts: {drafts}"
        assert POLICY["id"] in SIGNED_OFF, "sign the policy off too (SIGNED_OFF['parts'])"


check()


# ---- output ----------------------------------------------------------------------------------

def lit(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float, str)):
        return json.dumps(v, ensure_ascii=False)  # Cypher accepts JSON-style double-quoted strings
    if isinstance(v, (list, tuple)):
        return "[" + ", ".join(lit(x) for x in v) + "]"
    raise TypeError(v)


def cmap(d):
    return "{" + ", ".join(f"{k}: {lit(v)}" for k, v in d.items()) + "}"


def meta(item_id):
    """What every node carries: its review status (keyed by its own id), the version, and pending."""
    return {"reviewStatus": review_status(item_id), "version": VERSION, "pending": PENDING.get(item_id)}


def edge_meta(source_id, **props):
    """Edges are reviewed by their SOURCE id (signing off "anger-lash" approves anger-lash → hit_back)."""
    out = dict(props, reviewStatus=review_status(source_id))
    if source_id in PENDING:
        out["pending"] = PENDING[source_id]
    return out


L = []
A = L.append


def node(label, item_id, props, var="n"):
    A(f"MERGE ({var}:{label} {{id: {lit(item_id)}}})\nSET {var} += {cmap(dict(props, **meta(item_id)))};")


def edge(a_label, a_id, rel, b_label, b_id, props):
    A(f"MATCH (a:{a_label} {{id: {lit(a_id)}}}), (b:{b_label} {{id: {lit(b_id)}}})\n"
      f"MERGE (a)-[r:{rel}]->(b)\nSET r += {cmap(props)};")


BATCH = 30


def with_copy(items, rows_of, write):
    """Write items in batches whose copy rows fit one marker line (≤ BATCH rows), marker first."""
    batch, rows = [], []

    def flush():
        if batch:
            A("// @parts-copy-json " + json.dumps(rows, ensure_ascii=False))
            for it in batch:
                write(it)
        batch.clear()
        rows.clear()

    for it in items:
        r = rows_of(it)
        if batch and len(rows) + len(r) > BATCH:
            flush()
        batch.append(it)
        rows.extend(r)
    flush()


def row(item_id, field, kind, text):
    return {"id": item_id, "field": field, "kind": kind, "text": text}


def main():
    A(f"""// ============================================================
// PARTS — {VERSION} (docs/design/parts.md, Phase 0: content only, nothing served yet)
// GENERATED by scripts/parts/build.py from content.py. Edit content.py, not this file.
// The protective-move vocabulary, every module's ids mapped onto it (EXPRESSES), body signals on the
// body map's places, the hurts a move may guard, and every line of parts copy (PartPrompt / PartOption),
// Two pulls pairs, trail rules (all off), trail contexts and the PartsPolicy kill switch (offers off).
// Every node and edge is a draft (reviewStatus "draft") until its id is signed off in content.py's
// SIGNED_OFF; an edge is reviewed by its source id.
// MATCHes ActionUrge (opposite-action-data), FeelingUrge (find-the-feeling), MomentResponse /
// TurningPoint / ThoughtPattern / Underneath / BodySignal (dear-man-debrief-content), DearManBarrier
// (dear-man-content), BarrierSubResponse / AmbivalenceOption (problem-solve-barriers),
// QuestionResponse (discriminating-questions), InvalidationEvent / UnmetNeed (invalidation-recovery),
// BodyRegion (body-map) and Emotion. Meet a part is never routable: no TherapyConcept, no RECOMMENDED_FOR.
// Idempotent: MERGE + SET only; constraints live in constraints.cypher. `// @parts-copy-json` lines are
// the voice lint's rows (scripts/voice-lint.mjs), not Cypher.
// ============================================================
""")

    A("// --- Protective moves ---")
    with_copy(
        [dict(m, order=i) for i, m in enumerate(MOVES)],
        lambda m: [row(m["id"], f, k, m[f]) for f, k in (("label", "chip"), ("unblendPhrase", "prompt"),
                                                         ("trailPhrase", "prompt"), ("nameHint", "chip")) if m[f] is not None],
        lambda m: node("ProtectiveMove", m["id"], {k: m[k] for k in ("label", *PHRASES, "kind", "offerable", "safetyLine", "order")}, "m"))

    A("\n// --- Recover's pulls (its flow JSON has no nodes; FTF's are FeelingUrge) ---")
    for pid, flow, pull in PULL_OPTIONS:
        node("PullOption", pid, {"flow": flow, "pullId": pull}, "p")

    A("\n// --- EXPRESSES: every module's ids on the vocabulary (HELD ids get no edge) ---")
    A("MATCH ()-[r:EXPRESSES]->(:ProtectiveMove) DELETE r;")
    for label, table in EXPRESSES.items():
        A(f"// {label}")
        for src, (move, why) in table.items():
            edge(label, src, "EXPRESSES", "ProtectiveMove", move, edge_meta(src, why=why))

    A("\n// --- DEAR MAN's body signals on the body map's places ---")
    A("MATCH (:BodySignal)-[r:AT_PLACE]->(:BodyRegion) DELETE r;")
    for sig, region in AT_PLACE.items():
        edge("BodySignal", sig, "AT_PLACE", "BodyRegion", region, edge_meta(sig))

    A("\n// --- Protected hurts: offering hypotheses for \"What do you think it's protecting?\", never a reading ---")
    with_copy(
        [dict(h, order=i) for i, h in enumerate(HURTS)],
        lambda h: [row(h["id"], "label", "chip", h["label"]), row(h["id"], "hurtPhrase", "prompt", h["hurtPhrase"]),
                   row(h["id"], "feltPhrase", "chip", h["feltPhrase"]), row(h["id"], "matters", "prompt", h["matters"])],
        lambda h: node("ProtectedHurt", h["id"], {k: h[k] for k in ("label", "hurtPhrase", "feltPhrase", "matters", "order")}, "h"))
    A("MATCH (:ProtectedHurt)-[r:NAMED_AS]->(:Emotion) DELETE r;")
    for h in HURTS:
        for e in h["namedAs"]:
            edge("ProtectedHurt", h["id"], "NAMED_AS", "Emotion", e, edge_meta(h["id"]))
    A("// the order the chips are offered in")
    A("MATCH (:ProtectiveMove)-[r:OFTEN_GUARDS]->(:ProtectedHurt) DELETE r;")
    for move, hurts in OFTEN_GUARDS.items():
        for rank, h in enumerate(hurts):
            edge("ProtectiveMove", move, "OFTEN_GUARDS", "ProtectedHurt", h, edge_meta(move, rank=rank))
    A("// Recover's \"what happened\"")
    A("MATCH (:InvalidationEvent)-[r:CAN_TOUCH]->(:ProtectedHurt) DELETE r;")
    for ev, hurts in CAN_TOUCH.items():
        for i, h in enumerate(hurts):
            edge("InvalidationEvent", ev, "CAN_TOUCH", "ProtectedHurt", h, edge_meta(ev, order=i))
    A("// Recover's \"Under this, I needed…\"")
    A("MATCH (:UnmetNeed)-[r:ANSWERS]->(:ProtectedHurt) DELETE r;")
    for need, hurts in ANSWERS.items():
        for h in hurts:
            edge("UnmetNeed", need, "ANSWERS", "ProtectedHurt", h, edge_meta(need))
    A("// DEAR MAN debrief's \"What was underneath\" (SAME_AS is also PartOption's: scoped by both ends)")
    A("MATCH (:Underneath)-[r:SAME_AS]->(:ProtectedHurt) DELETE r;")
    for u, hurts in UNDERNEATH_SAME_AS.items():
        for h in hurts:
            edge("Underneath", u, "SAME_AS", "ProtectedHurt", h, edge_meta(u))

    A("\n// --- Prompts (order: position within the flow; the keepsake follows Two pulls' prompts) ---")
    prompts, at = [], {}
    for pid, flow, step, copy in PROMPTS:
        prompts.append(dict(id=pid, flow=flow, step=step, order=at.setdefault(flow, [0])[0], copy=copy,
                            kind=PROMPT_KINDS.get(pid, "prompt")))
        at[flow][0] += 1
    for pid, copy in KEEPSAKE:
        prompts.append(dict(id=pid, flow="pulls", step="keepsake", order=at.setdefault("pulls", [0])[0], copy=copy,
                            kind="keepsake"))
        at["pulls"][0] += 1
    with_copy(
        prompts,
        lambda p: [row(p["id"], "copy", p["kind"], p["copy"])],
        lambda p: node("PartPrompt", p["id"], dict({k: p[k] for k in ("flow", "step", "order", "copy")},
                                                   **({"copyKind": p["kind"]} if p["kind"] != "prompt" else {})), "p"))

    A("\n// --- Options: chips the person taps (order: position within flow and step; Two pulls' chips last) ---")
    options, at = [], {}
    for o in all_options():
        key = (o["flow"], o["step"])
        options.append(dict(o, order=at.get(key, 0)))
        at[key] = at.get(key, 0) + 1
    with_copy(
        options,
        lambda o: [row(o["id"], "label", o["kind"], o["label"])],
        lambda o: node("PartOption", o["id"], {k: o[k] for k in ("flow", "step", "order", "label", "kind", "flag", "selfLike", "branch")}, "o"))
    A("// offered only for these moves (no edge: offered for any move)")
    A("MATCH (:PartOption)-[r:OFFERED_FOR]->(:ProtectiveMove) DELETE r;")
    for o in OPTIONS:
        for i, m in enumerate(o["moves"] or []):
            edge("PartOption", o["id"], "OFFERED_FOR", "ProtectiveMove", m, edge_meta(o["id"], order=i))
    A("// the same answer in another module")
    for label in ("ThoughtPattern", "AmbivalenceOption"):
        A(f"MATCH (:PartOption)-[r:SAME_AS]->(:{label}) DELETE r;")
    for o in OPTIONS:
        for label, target in o["sameAs"]:
            edge("PartOption", o["id"], "SAME_AS", label, target, edge_meta(o["id"]))

    A("\n// --- Two pulls: offerable moves only; each side's worries are what it fears if the other wins ---")
    for p in PAIRS:
        node("PolarityPair", p["id"], {"a": p["a"], "b": p["b"]}, "p")
    A("MATCH (:PolarityPair)-[r:HAS_SIDE]->(:ProtectiveMove) DELETE r;")
    A("MATCH (:PolarityPair)-[r:BOTH_WANT|WORRY]->(:PartOption) DELETE r;")
    for p in PAIRS:
        edge("PolarityPair", p["id"], "HAS_SIDE", "ProtectiveMove", p["a"], edge_meta(p["id"], side="a"))
        edge("PolarityPair", p["id"], "HAS_SIDE", "ProtectiveMove", p["b"], edge_meta(p["id"], side="b"))
        for i, (cid, _) in enumerate(p["bothWant"]):
            edge("PolarityPair", p["id"], "BOTH_WANT", "PartOption", cid, edge_meta(p["id"], order=i))
        for side, field in (("a", "worryA"), ("b", "worryB")):
            for i, (cid, _) in enumerate(p[field]):
                edge("PolarityPair", p["id"], "WORRY", "PartOption", cid, edge_meta(p["id"], side=side, order=i))

    A("\n// --- Trails (enabled false until Claudia reviews the rules on real data) ---")
    fields = []
    for r in TRAIL_RULES:
        fields += [k for k in r if k != "id" and k not in fields]
    with_copy(
        TRAIL_RULES,
        lambda r: [row(r["id"], "statementTemplate", "prompt", r["statementTemplate"])],
        lambda r: node("TrailRule", r["id"], {k: r.get(k) for k in fields}, "t"))
    A("// what fills {context}: only contexts the app already stores")
    with_copy(
        CONTEXTS,
        lambda c: [row(c[0], "phrase", "prompt", c[3])],
        lambda c: node("TrailContext", c[0], {"key": c[1], "value": c[2], "phrase": c[3]}, "c"))

    A("\n// --- The kill switch and the safety numbers (offersEnabled turns off offers only, never anyone's parts) ---")
    node("PartsPolicy", POLICY["id"], {k: v for k, v in POLICY.items() if k != "id"}, "p")
    print("\n".join(L))


if __name__ == "__main__":
    main()
