"""Generate schema/recommended-for.cypher from content.py (the single editable source). Plan E4-2.

Usage (repo root; write to a temp file first so a failed build never empties the file):
  python3 scripts/recommendations/build.py > /tmp/rf.cypher && mv /tmp/rf.cypher schema/recommended-for.cypher
  python3 scripts/recommendations/fixture.py
Then run: node --test tests/recommendation-content.test.mjs
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import content as C  # noqa: E402
import vocabulary as V  # noqa: E402


def q(s):
    return json.dumps(s, ensure_ascii=False)  # Cypher accepts JSON-style double-quoted strings


def lit(v):
    """A Cypher literal for a Python value (maps with unquoted keys)."""
    if isinstance(v, dict):
        return "{" + ", ".join(f"{k}: {lit(x)}" for k, x in v.items()) + "}"
    if isinstance(v, list):
        return "[" + ", ".join(lit(x) for x in v) + "]"
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, float):
        return repr(v)
    return q(v)


SIDES = {"acceptance", "change", "both"}
KINDS = {"body", "orient", "hold", "change", "naming", "relational", "redirect", "values"}
DIRECTIONS = {"down", "up", "orient", "neutral"}


def check(rows):
    assert set(C.BLANK_PATTERNS) >= set(C.TABLE), "every table pattern has a blank tag"
    for tool, t in C.CONCEPT_TAGS.items():
        assert t["side"] in SIDES and t["skillKind"] in KINDS and t["direction"] in DIRECTIONS, tool
    ids = [r["id"] for r in rows]
    assert len(ids) == len(set(ids)), "row ids are unique"
    for r in rows:
        assert r["tool"] in C.CONCEPT_TAGS, r["id"]
        assert r["tool"] not in C.NO_ROWS, f"{r['id']}: {C.NO_ROWS.get(r['tool'])}"
        assert set(r["bands"]) <= set(C.BANDS) and r["bands"], r["id"]
        assert r["direction"] in DIRECTIONS, r["id"]
        assert r["emotionGate"] in (None, "addresses", "none_named", "words"), r["id"]
        if r["emotionGate"] == "words":
            assert r["words"], f"{r['id']}: a words gate names its words"
            off = [w for w in r["words"] if V.SIGNALS.get(w, (None,))[0] != r["pattern"]]
            assert not off, f"{r['id']}: {off} don't signal {r['pattern']}, so the rule could only fire beside another word"
        else:
            assert not r["words"], f"{r['id']}: words only go with a words gate"
        assert r["requiresPrior"] in (None, "up_regulation"), r["id"]
        assert r["side"] in (None, *SIDES), r["id"]
        if C.BLANK_PATTERNS.get(r["pattern"]):
            assert r["direction"] != "down", f"{r['id']}: blank patterns are never calmed"
        if "flooded" in r["bands"]:
            assert C.CONCEPT_TAGS[r["tool"]]["skillKind"] in ("body", "orient"), f"{r['id']}: flooded is body / orient only"
    if C.POLICY["enabled"]:
        drafts = [r["id"] for r in rows if r["active"] and r["reviewStatus"] != "approved"]
        assert not drafts, f"RoutingPolicy can't be enabled while active rows are drafts: {drafts[:5]}…"
        assert "checkin_result" in C.SIGNED_OFF, "sign the policy off too (SIGNED_OFF['checkin_result'])"


def grid_words():
    """src/data/emotions.ts → {id: quadrant}."""
    src = open(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "src/data/emotions.ts"), encoding="utf8").read()
    return {m[0]: m[1] for m in re.findall(r"makeEmotion\('([a-z_]+)', '[^']+', '([a-z-]+)'", src)}


def check_signals():
    grid = grid_words()
    unpleasant = {w for w, q in grid.items() if q in V.SIDE_PATTERNS}
    assert set(V.SIGNALS) == unpleasant, f"every unpleasant grid word has one reviewed pattern: {sorted(unpleasant ^ set(V.SIGNALS))}"
    for w, (p, why) in V.SIGNALS.items():
        assert p in V.SIDE_PATTERNS[grid[w]], f"{w} ({grid[w]}) can't signal {p}: the square's side decides"
        assert p != "emotional_flooding", f"{w}: no word signals Flooded (the crisis banner)"
        assert why and why.strip(), f"{w}: rationale"


def check_vocabulary():
    for word, (targets, why) in V.VOCABULARY.items():
        assert 1 <= len(targets) <= 2 and len(set(targets)) == len(targets), f"{word}: 1-2 distinct targets"
        assert set(targets) <= set(V.PATTERN_VOCABULARY), f"{word}: {targets} not in the pattern vocabulary"
        assert word not in V.PATTERN_VOCABULARY, f"{word} is already pattern vocabulary"
        assert not set(targets) & V.HELD_TARGETS, f"{word}: {sorted(set(targets) & V.HELD_TARGETS)} is a held target"
        assert why and why.strip(), f"{word}: rationale"
    for word, why in V.HELD.items():
        assert word not in V.VOCABULARY, f"{word} is both held and aliased"
        assert why and why.strip(), f"{word}: held without a reason"


def main():
    rows = C.rows()
    check(rows)
    check_vocabulary()
    check_signals()
    L = []
    A = L.append
    A(f"""// ============================================================
// RECOMMENDED_FOR — check-in result routing by activation pattern × capacity band ({C.VERSION})
// GENERATED by scripts/recommendations/build.py from content.py. Edit content.py, not this file.
// Plan E4-2 (ER-06 part 1, WMP-04 v0 side tags, CORE RoutingPolicy). Read by getStateAndTools
// (functions/src/recommendation/select.ts) only while RoutingPolicy.enabled is true; otherwise the
// legacy ranker runs. Every row is reviewStatus "draft" until Claudia signs it off (D-02, D-13).
// Run AFTER find-the-feeling.cypher (urge_surfing, dbt_find_the_feeling) and app-tool-ids.cypher.
// Idempotent: MERGE + SET only; stale {C.VERSION} rows are pruned by id at the end.
// Constraints (RoutingPolicy.id) live in constraints.cypher.
// Section 6 (plan E4-6) is generated from scripts/recommendations/vocabulary.py: SCORES_AS aliases
// from the check-in's grid words to the pattern vocabulary, read by the pattern-scoring query.
// ============================================================
""")

    A("// --- 1. Routing tags on the app-tool concepts (WMP-04 v0 side; engine skillKind; DT direction) ---")
    tags = [{"c": t["concept"], "side": t["side"], "kind": t["skillKind"], "dir": t["direction"]} for t in C.CONCEPT_TAGS.values()]
    A(f"UNWIND {lit(tags)} AS row\nMATCH (tc:TherapyConcept {{id: row.c}})\n"
      "SET tc.side = row.side, tc.skillKind = row.kind, tc.direction = row.dir;")

    A("\n// --- 2. Blank patterns (never calmed) ---")
    blanks = [{"p": p, "blank": b} for p, b in C.BLANK_PATTERNS.items()]
    A(f"UNWIND {lit(blanks)} AS row\nMATCH (p:ActivationPattern {{id: row.p}})\nSET p.blank = row.blank;")

    A("\n// --- 3. Routing policy (kill switch, card count, fallback, default band) ---")
    pol = C.POLICY
    A(f"MERGE (rp:RoutingPolicy {{id: \"checkin_result\"}})\n"
      f"SET rp.version = {lit(pol['version'])}, rp.enabled = {lit(pol['enabled'])}, rp.maxCards = {pol['maxCards']},\n"
      f"    rp.fallbackConceptId = {lit(pol['fallbackConceptId'])}, rp.defaultBand = {lit(pol['defaultBand'])},\n"
      f"    rp.floodedPatterns = {lit(pol['floodedPatterns'])}, rp.reviewStatus = {lit(C.review_status('checkin_result'))};")

    A("\n// --- 4. Pattern × band rows (P = priority 1, swap = 2; gated rows 0 / 1.5) ---")
    concept = {t: v["concept"] for t, v in C.CONCEPT_TAGS.items()}
    by_pattern = {}
    for r in rows:
        by_pattern.setdefault(r["pattern"], []).append(r)
    for pattern, rs in by_pattern.items():
        items = [{"id": r["id"], "c": concept[r["tool"]], "p": r["pattern"], "bands": r["bands"], "prio": r["priority"],
                  "dir": r["direction"], "req": r["requiresPrior"], "side": r["side"], "gate": r["emotionGate"], "words": r["words"],
                  "beside": r["beside"], "active": r["active"], "review": r["reviewStatus"], "why": r["why"]} for r in rs]
        A(f"// {pattern}")
        A("UNWIND [\n  " + ",\n  ".join(lit(i) for i in items) + "\n] AS row\n"
          "MATCH (tc:TherapyConcept {id: row.c}), (p:ActivationPattern {id: row.p})\n"
          "MERGE (tc)-[r:RECOMMENDED_FOR {id: row.id}]->(p)\n"
          "SET r.bands = row.bands, r.priority = row.prio, r.direction = row.dir, r.requiresPrior = row.req,\n"
          f"    r.side = row.side, r.emotionGate = row.gate, r.words = row.words, r.beside = row.beside, r.tier = \"quality_of_life\", r.surface = [\"checkin_result\"],\n"
          f"    r.active = row.active, r.version = {q(C.VERSION)}, r.reviewStatus = row.review, r.rationale = row.why;")

    A("\n// --- 4b. Contraindications (CONTRAINDICATED_FOR: the primary or the co-occurring pattern) ---")
    contra = [{"c": C.CONCEPT_TAGS[t]["concept"], "p": p} for t, ps in C.CONTRAINDICATIONS.items() for p in ps]
    A(f"UNWIND {lit(contra)} AS row\nMATCH (tc:TherapyConcept {{id: row.c}}), (p:ActivationPattern {{id: row.p}})\n"
      "MERGE (tc)-[r:CONTRAINDICATED_FOR]->(p)\nSET r.source = \"recommended-for\";")

    A("\n// --- 5. Prune rows removed from content.py (idempotent) ---")
    A("MATCH (:TherapyConcept)-[r:RECOMMENDED_FOR]->(:ActivationPattern)\n"
      f"WHERE r.version = {q(C.VERSION)} AND NOT r.id IN {lit([r['id'] for r in rows])}\nDELETE r;")
    for old in C.RETIRED_VERSIONS:
        A(f"MATCH (:TherapyConcept)-[r:RECOMMENDED_FOR]->(:ActivationPattern)\nWHERE r.version = {q(old)}\nDELETE r;")
    A(f"\n// --- 6. Grid vocabulary → pattern vocabulary (SCORES_AS aliases, {V.VERSION}; E4-6) ---")
    A("// Held (no alias yet; vocabulary.py HELD): " + ", ".join(sorted(V.HELD)))
    al = V.aliases()
    items = [{"id": f"{w}>{t}", "w": w, "e": t, "review": r, "why": why} for w, t, why, r in al]
    for k in range(0, len(items), 40):
        chunk = items[k:k + 40]
        A("UNWIND [\n  " + ",\n  ".join(lit(i) for i in chunk) + "\n] AS row\n"
          "MATCH (w:Emotion {id: row.w}), (e:Emotion {id: row.e})\n"
          "MERGE (w)-[r:SCORES_AS]->(e)\n"
          f"SET r.id = row.id, r.version = {q(V.VERSION)}, r.reviewStatus = row.review, r.rationale = row.why;")
    A("MATCH (:Emotion)-[r:SCORES_AS]->(:Emotion)\n"
      f"WHERE r.version = {q(V.VERSION)} AND NOT r.id IN {lit([i['id'] for i in items])}\nDELETE r;")
    A(f"\n// --- 7. Reviewed pattern per grid word (SIGNALS, {V.VERSION}; Oct 2026 review) ---")
    A("// While the policy is on, a word with a reviewed pattern matches only that pattern (a strong edge).")
    sig = [{"id": f"{w}>{p}", "w": w, "p": p, "review": r, "why": why} for w, p, why, r in V.signals()]
    for k in range(0, len(sig), 40):
        A("UNWIND [\n  " + ",\n  ".join(lit(i) for i in sig[k:k + 40]) + "\n] AS row\n"
          "MATCH (w:Emotion {id: row.w}), (p:ActivationPattern {id: row.p})\n"
          "MERGE (w)-[r:SIGNALS]->(p)\n"
          f"SET r.id = row.id, r.version = {q(V.VERSION)}, r.reviewStatus = row.review, r.rationale = row.why;")
    A("MATCH (:Emotion)-[r:SIGNALS]->(:ActivationPattern)\n"
      f"WHERE NOT r.id IN {lit([i['id'] for i in sig])}\nDELETE r;")
    print("\n".join(L))


if __name__ == "__main__":
    main()
