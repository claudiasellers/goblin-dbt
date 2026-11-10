"""Generate schema/skills.cypher from content.py (docs/design/skill-runtime.md).

  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
  python3 scripts/skills/fixture.py
Then: node --test tests/skill-*.test.mjs
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from content import SKILLS, CONTENT_VERSION, STEP_KINDS, EMBEDS, GRAPH_TABLES  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF = re.compile(r"^\$(a|d|opt|ctx)\.[A-Za-z_][A-Za-z0-9_]*(\.(ids|own))?$")
# Context keys a skill may accept (src/data/skillTypes.ts CtxKey).
CTX_KEYS = {"urgeId", "personId", "frame", "enterAt", "situationId", "partId", "band", "returnTo"}
CRISIS_VARIANTS = {"crisis", "other_person"}
RUN_OWN_MAX = 140  # functions/src/spine/extSchemas.ts RUN_OWN_MAX (tests/skill-contracts.test.mjs keeps them equal)
SAFETY_EXIT_ID = "safety_open"  # the reserved exit (plan C3a R6); a skill has at most one
OPS = {"set", "eq", "in", "has", "own", "some", "all", "any", "not"}


def q(s): return json.dumps(s, ensure_ascii=False)
def js(o): return q(json.dumps(o, ensure_ascii=False, sort_keys=True))


def props(d):
    return "{" + ", ".join(f"{k}: {q(v)}" for k, v in d.items() if v is not None) + "}"


def tool_ids():
    src = open(os.path.join(ROOT, "src/data/tools.ts"), encoding="utf8").read()
    return set(re.findall(r"^\s*id: '([a-z0-9-]+)',", src, re.M))


def check_cond(c, fields, derived, where, accepts=None):
    """Every condition is total: known operators, refs to fields/derived values that exist."""
    if not isinstance(c, dict) or len(c) != 1:
        raise AssertionError(f"{where}: a condition is one operator, got {c!r}")
    (op, arg), = c.items()
    assert op in OPS, (where, op)

    def ref(r):
        if isinstance(r, str) and r.startswith("$"):
            assert REF.match(r), (where, r)
            kind, name = r[1:].split(".")[:2]
            if kind == "a":
                assert name in fields, (where, "unknown field", r)
            if kind == "d":
                assert name in derived, (where, "unknown derived value", r)
            if kind == "ctx":
                assert accepts is not None and name in accepts, (where, "context the skill doesn't accept", r)
                assert r.count(".") == 1, (where, "a context value is one id: no .ids / .own", r)
    if op in ("all", "any"):
        for x in arg:
            check_cond(x, fields, derived, where, accepts)
    elif op == "not":
        check_cond(arg, fields, derived, where, accepts)
    elif op == "set":
        ref(arg)
    elif op == "own":
        assert arg in fields, (where, arg)
    elif op == "some":
        assert arg[0] in fields, (where, arg)
        check_cond(arg[1], fields, derived, where, accepts)
    else:
        ref(arg[0])
        if isinstance(arg[1], str):
            ref(arg[1])


def check(skill):
    sid = skill["id"]
    copy = skill["copy"]
    accepts = set(skill.get("accepts", []))
    assert accepts <= CTX_KEYS, (sid, "unknown context keys", accepts - CTX_KEYS)
    assert skill["ownMax"] <= RUN_OWN_MAX, (sid, "ownMax over the record's limit")
    fields = {f["id"] for s in skill["steps"] for f in s.get("fields", [])} | {s["answerAs"] for s in skill["steps"] if s.get("answerAs")}
    derived = {d["name"] for d in skill["derive"]}
    steps = {s["id"] for s in skill["steps"]}
    exits = {e["id"] for e in skill["exits"]}
    lists = {o[0] for o in skill["options"]}
    tables = set(skill["tables"]) | set(GRAPH_TABLES)
    tools = tool_ids()
    assert skill["start"] in steps, sid
    assert len(steps) == len(skill["steps"]), (sid, "step ids are unique")
    values = [(o[0], o[1]) for o in skill["options"]]
    assert len(set(values)) == len(values), (sid, "option values are unique per list")
    for d in skill["derive"]:
        assert d["table"] in tables, (sid, d)
        if d.get("kind") == "count":
            assert d.get("fields") and all(f in fields for f in d["fields"]), (sid, "a count reads fields that exist", d)
            for k in skill["tables"].get(d["table"], {}):
                float(k)  # a count's table is keyed by thresholds
        else:
            assert d.get("kind", "lookup") == "lookup" and isinstance(d.get("from"), str), (sid, d)
    assert sum(1 for e in skill["exits"] if e.get("safety")) <= 1, (sid, "one safety.open exit at most")
    for e in skill["exits"]:
        if e.get("safety"):
            assert e["id"] == SAFETY_EXIT_ID, (sid, f"the safety.open exit has the reserved id {SAFETY_EXIT_ID}", e)
            assert not e.get("toolId") and not e.get("planned") and not e.get("done"), (sid, "safety.open opens no tool", e)
        else:
            assert e["id"] != SAFETY_EXIT_ID, (sid, f"{SAFETY_EXIT_ID} is reserved for safety.open", e)
            if e.get("planned"):
                assert e.get("toolId") and e["toolId"] not in tools, (sid, "a planned exit names a tool that isn't built (flip it when it is)", e)
            else:
                assert e.get("done") or e.get("toolId") in tools, (sid, e)
        for f in e.get("carry", []):
            assert f in fields, (sid, e)
    for s in skill["steps"]:
        w = f"{sid}.{s['id']}"
        assert s["kind"] in STEP_KINDS, w
        if s["kind"] == "embed":
            assert s.get("embed") in EMBEDS, (w, "a whole-screen embed the player has", s.get("embed"))
            assert not s.get("fields"), (w, "an embed step has no fields; its output is `answerAs`")
            for v, kind in EMBEDS[s["embed"]].get("danger", {}).items():
                want = "other_person" if kind == "other" else "crisis"
                assert any(c["variant"] == want for c in s.get("crisis", [])), (
                    w, f"embed id {v} can carry danger: the step declares a {want} crisis slot (plan C6.4)")
        else:
            assert "embed" not in s and "answerAs" not in s, (w, "only embed steps name an embed")
        for slot in s.get("crisis", []):
            assert slot["variant"] in CRISIS_VARIANTS, (w, slot)
            check_cond(slot["when"], fields, derived, w, accepts)

        titles = s.get("title")
        for t in ([titles] if isinstance(titles, str) else titles or []):
            key = t if isinstance(t, str) else t["key"]
            assert key in copy, (w, key)
            if isinstance(t, dict) and "when" in t:
                check_cond(t["when"], fields, derived, w, accepts)
        for k in ("hint", "note"):
            assert k not in s or s[k] in copy, (w, k)
        for t in s.get("next", []):
            assert t["to"] in steps, (w, t)
            if "when" in t:
                check_cond(t["when"], fields, derived, w, accepts)
        assert s["kind"] == "handoff" or s.get("next"), (w, "an ask step goes somewhere")
        for f in s.get("fields", []):
            o = f["options"]
            assert ("emotions" in o) != ("list" in o), (w, f["id"])
            if "list" in o:
                assert o["list"] in lists, (w, o)
                if "where" in o:
                    check_cond(o["where"], fields, derived, w, accepts)
                if "groupBy" in o:
                    assert o["groupBy"] in fields, (w, o)
            if "moreKey" in o:
                assert o["moreKey"] in copy, (w, o)
            for k in ("label",):
                assert k not in f or f[k] in copy, (w, f)
            if "own" in f:
                assert f["own"]["hint"] in copy, (w, f)
                assert f["own"].get("max", skill["ownMax"]) <= skill["ownMax"], (w, "own max above the skill's", f)
            if "firstFrom" in o:
                assert o["firstFrom"].startswith("$ctx."), (w, "firstFrom is a context ref", o)
                check_cond({"set": o["firstFrom"]}, fields, derived, w, accepts)
            if "list" in o:
                for x in (x for x in skill["options"] if x[0] == o["list"] and x[3].get("danger")):
                    assert x[3]["danger"] in ("self", "other"), (w, x[1])
                    want = "other_person" if x[3]["danger"] == "other" else "crisis"
                    assert any(slot["variant"] == want for slot in s.get("crisis", [])), (
                        w, f"option {x[1]} can carry danger: the step declares a {want} crisis slot (plan C6.4)")
            if "showWhen" in f:
                check_cond(f["showWhen"], fields, derived, w, accepts)
            if "list" in f:
                assert f["list"]["table"] in tables, (w, f)
            for ln in f.get("links", []):
                assert ln["exit"] in exits and ln["label"] in copy, (w, ln)
                check_cond(ln["when"], fields, derived, w, accepts)
        for sl in s.get("slots", []):
            assert sl["embed"] in EMBEDS and sl["after"] in fields, (w, sl)
            check_cond(sl["showWhen"], fields, derived, w, accepts)
        for ln in s.get("lines", []):
            assert ln["key"] in copy, (w, ln)
            check_cond(ln["when"], fields, derived, w, accepts)
        for of in s.get("offers", []):
            assert of["exit"] in exits, (w, of)
            check_cond(of["when"], fields, derived, w, accepts)
        assert "done" not in s or s["done"] in exits, w
    every = json.dumps([copy, [o[2] for o in skill["options"]]], ensure_ascii=False)
    assert "!" not in every and not re.search(r"\b(should|just|but|overreact\w*)\b", every, re.I), (sid, "house voice")


for sk in SKILLS:
    check(sk)


def spec_of(step):
    """What the step node stores as specJson: the screen, without its transitions/offers (those are edges)."""
    return {k: v for k, v in step.items() if k not in ("id", "kind", "next", "offers")}


L = []
A = L.append
A(f"""// ============================================================
// SKILLS — {CONTENT_VERSION}
// GENERATED by scripts/skills/build.py from scripts/skills/. Edit the skill's .py, not this file.
// The skill runtime (docs/design/skill-runtime.md): each skill's screens (SkillStep), the jumps between
// them (NEXT, with conditions), where it hands you on (SkillExit, OFFERS, LINKS, OPENS) and its chips
// (SkillOption, with their clinical labels and edges). Idempotent: MERGE + SET += only; constraints
// live in constraints.cypher. Run AFTER app-tool-ids.cypher and opposite-action-data.cypher.
// ============================================================
""")
for sk in SKILLS:
    sid = sk["id"]
    A(f"\n// --- {sid} ({sk['version']}) ---")
    A(f"MERGE (s:Skill {{id: {q(sid)}}})\nSET s += {props({'toolId': sk['toolId'], 'version': sk['version'], 'contentVersion': CONTENT_VERSION, 'start': sk['start'], 'ownMax': sk['ownMax'], 'emotionFields': sk['emotionFields'], 'accepts': sk.get('accepts', [])})}, s.copyJson = {js(sk['copy'])}, s.tablesJson = {js(sk['tables'])}, s.deriveJson = {js(sk['derive'])};")
    A(f"MATCH (t:TherapyConcept {{id: {q(sk['concept'])}}}), (s:Skill {{id: {q(sid)}}})\nMERGE (t)-[:HAS_SKILL]->(s);")
    # Edges are rebuilt each load (a removed step / jump / offer must disappear).
    A(f"MATCH (:SkillStep {{skillId: {q(sid)}}})-[r:NEXT|OFFERS|LINKS]->() DELETE r;")
    A(f"MATCH (:Skill {{id: {q(sid)}}})-[r:HAS_STEP|HAS_EXIT|HAS_OPTION]->() DELETE r;")
    for i, st in enumerate(sk["steps"]):
        nid = f"{sid}:{st['id']}"
        A(f"MERGE (n:SkillStep {{id: {q(nid)}}})\nSET n += {props({'skillId': sid, 'step': st['id'], 'kind': st['kind'], 'version': sk['version']})}, n.specJson = {js(spec_of(st))};")
        A(f"MATCH (s:Skill {{id: {q(sid)}}}), (n:SkillStep {{id: {q(nid)}}})\nMERGE (s)-[r:HAS_STEP]->(n)\nSET r += {{order: {i}}};")
    for e in sk["exits"]:
        nid = f"{sid}:{e['id']}"
        A(f"MERGE (x:SkillExit {{id: {q(nid)}}})\nSET x += {props({'skillId': sid, 'exit': e['id'], 'toolId': e.get('toolId'), 'done': bool(e.get('done')), 'carry': e.get('carry', []), 'planned': bool(e.get('planned')), 'safety': bool(e.get('safety'))})}, x.queryJson = {js(e.get('query', {}))};")
        A(f"MATCH (s:Skill {{id: {q(sid)}}}), (x:SkillExit {{id: {q(nid)}}})\nMERGE (s)-[:HAS_EXIT]->(x);")
        if e.get("toolId"):
            A(f"MATCH (x:SkillExit {{id: {q(nid)}}}), (t:TherapyConcept {{appToolId: {q(e['toolId'])}}})\nMERGE (x)-[:OPENS]->(t);")
    for st in sk["steps"]:
        a = f"{sid}:{st['id']}"
        for i, t in enumerate(st.get("next", [])):
            A(f"MATCH (a:SkillStep {{id: {q(a)}}}), (b:SkillStep {{id: {q(sid + ':' + t['to'])}}})\nMERGE (a)-[r:NEXT]->(b)\nSET r += {{order: {i}}}, r.whenJson = {js(t.get('when'))};")
        # One OFFERS edge per (step, exit): the same exit may be offered under two conditions (Problem Solve
        # after *fits* and after *partly*), so the edge carries every (order, when) row.
        offers = {}
        for i, of in enumerate(st.get("offers", [])):
            offers.setdefault(of["exit"], []).append({"order": i, "when": of["when"]})
        for ex, rows in offers.items():
            A(f"MATCH (a:SkillStep {{id: {q(a)}}}), (x:SkillExit {{id: {q(sid + ':' + ex)}}})\nMERGE (a)-[r:OFFERS]->(x)\nSET r += {{order: {rows[0]['order']}}}, r.rowsJson = {js(rows)};")
        for f in st.get("fields", []):
            for i, ln in enumerate(f.get("links", [])):
                A(f"MATCH (a:SkillStep {{id: {q(a)}}}), (x:SkillExit {{id: {q(sid + ':' + ln['exit'])}}})\nMERGE (a)-[r:LINKS]->(x)\nSET r += {props({'order': i, 'field': f['id'], 'label': ln['label']})}, r.whenJson = {js(ln['when'])};")
    for i, (lst, value, label, extra, clinical) in enumerate(sk["options"]):
        nid = f"{sid}:{lst}:{value}"
        labels = "SkillOption" + (f":{clinical}" if clinical else "")
        p = {k: v for k, v in extra.items() if k != "for"}
        A(f"MERGE (o:SkillOption {{id: {q(nid)}}})\nSET o:{labels}, o += {props({'skillId': sid, 'list': lst, 'value': value, 'label': label, 'version': sk['version']})}, o.propsJson = {js(p)}{', o.forOwn = true' if extra.get('for') == '$own' else ''};")
        A(f"MATCH (s:Skill {{id: {q(sid)}}}), (o:SkillOption {{id: {q(nid)}}})\nMERGE (s)-[r:HAS_OPTION]->(o)\nSET r += {props({'list': lst, 'order': i})};")
        if clinical == "Interpretation" and extra["set"] != "general":
            A(f"MATCH (c:EmotionRegulationContent {{dbtParent: {q(extra['set'])}}}), (o:SkillOption {{id: {q(nid)}}})\nMERGE (c)-[:HAS_INTERPRETATION]->(o);")
        if clinical == "Interpretation" and extra["set"] == "general":
            A(f"MATCH (s:Skill {{id: {q(sid)}}}), (o:SkillOption {{id: {q(nid)}}})\nMERGE (s)-[:HAS_INTERPRETATION]->(o);")
        if clinical == "Alternative" and extra["for"] != "$own":
            A(f"MATCH (o:SkillOption {{id: {q(nid)}}}), (st:SkillOption {{id: {q(sid + ':story:' + extra['for'])}}})\nMERGE (o)-[:ALTERNATIVE_TO]->(st);")
CYPHER = "\n".join(L)

if __name__ == "__main__":
    print(CYPHER)
