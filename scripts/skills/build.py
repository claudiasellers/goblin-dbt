"""Generate schema/skills.cypher from content.py (docs/design/skill-runtime.md).

  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
  python3 scripts/skills/fixture.py
Then: node --test tests/skill-*.test.mjs
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from content import SKILLS, CONTENT_VERSION, STEP_KINDS, EMBEDS, EMBED_PROPS, GRAPH_TABLES  # noqa: E402
import importlib.util  # noqa: E402
_spec = importlib.util.spec_from_file_location(
    "practice_spine_content", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "practice-spine", "content.py"))
_spine = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_spine)
FOLLOW_UP_TYPES = _spine.FOLLOW_UP_TYPES  # the FollowUpType registry (scripts/practice-spine)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF = re.compile(r"^\$(a|d|opt|ctx|p)\.[A-Za-z_][A-Za-z0-9_]*(\.(ids|own))?$")
# Profile slices (src/data/profileTypes.ts SLICE_IDS; tests/skill-contracts.test.mjs keeps them equal). A skill
# may read only the ones its tool's PROFILE_NEEDS declares (checked there too).
PROFILE_SLICES = {
    "name", "quietHours", "patterns", "ownLines", "savedLines", "people", "bodyFlags", "values", "goals",
    "copeAheadPlans", "boundaryLines", "practicePrefs", "fadeLevels", "ownWords", "thingsILike", "crisisKit",
    "safetyPlan", "country", "parts", "partDetail", "partAnchors", "den",
}
# Slices a field may list as options (src/data/skillTypes.ts ProfileOptionSlice).
PROFILE_OPTION_SLICES = {"parts", "ownLines", "savedLines", "people", "values", "goals", "copeAheadPlans", "boundaryLines", "thingsILike"}
THEN_VS_NOW = {"worse", "same", "better", "much_better"}
FOLLOW_UPS = {t["id"]: t for t in FOLLOW_UP_TYPES}
# Context keys a skill may accept (src/data/skillTypes.ts CtxKey).
CTX_KEYS = {"urgeId", "personId", "frame", "enterAt", "situationId", "partId", "band", "returnTo"}
CRISIS_VARIANTS = {"crisis", "other_person"}
RUN_OWN_MAX = 140  # functions/src/spine/extSchemas.ts RUN_OWN_MAX (tests/skill-contracts.test.mjs keeps them equal)
SAFETY_EXIT_ID = "safety_open"  # the reserved exit (plan C3a R6); a skill has at most one
OPS = {"set", "eq", "in", "has", "own", "some", "all", "any", "not"}
# Content nodes an option may show (PRESENTS), loaded before skills.cypher: Problem Solve's (ps_graph.py), Cope Ahead's.
PRESENTS_LABELS = {"ProblemType", "SolutionDirection", "DecompositionAspect", "BarrierType", "BarrierSubResponse", "AmbivalenceOption",
                   # Cope Ahead's (schema/cope-ahead.cypher) and Find the feeling's pulls (schema/find-the-feeling.cypher).
                   "CopeSituation", "HardMoment", "CopeMove", "FeelingUrge"}


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
            if kind == "p":
                assert name in PROFILE_SLICES, (where, "unknown profile slice", r)
                assert not r.endswith(".own"), (where, "a profile slice has no .own", r)
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


ID = re.compile(r"^[a-z0-9][a-z0-9_:-]{0,63}$")


def check_embed_props(name, props, copy, fields, w):
    """A step's or slot's props against the embed's EMBED_PROPS: declared, typed, and every copy key in the skill."""
    spec = EMBED_PROPS[name]
    props = props or {}
    assert set(props) <= set(spec), (w, f"{name} takes no such prop", set(props) - set(spec))
    for k, sp in spec.items():
        if k not in props:
            assert sp.get("optional"), (w, f"{name} needs {k}")
            continue
        v = props[k]
        t = sp["type"]
        if t == "copy":
            assert isinstance(v, str) and v in copy, (w, f"{name}.{k} is a copy key of the skill", v)
        elif t == "int":
            assert isinstance(v, int) and not isinstance(v, bool) and sp["min"] <= v <= sp["max"], (w, f"{name}.{k} in range", v)
        elif t == "enum":
            assert v in sp["values"], (w, f"{name}.{k} is one of {sp['values']}", v)
        elif t == "field":
            assert v in fields, (w, f"{name}.{k} is a field of the skill", v)
        else:
            assert isinstance(v, str) and ID.match(v), (w, f"{name}.{k} is an id", v)


RUNTIME_KEYS = ("persist", "quickExit", "resumeAt")


def runtime_of(sk):
    """The skill's runtime switches (persist-nothing R15, quick exit, re-entry steps), served only when set."""
    return {k: sk[k] for k in RUNTIME_KEYS if sk.get(k)}


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
    for o in skill["options"]:
        if isinstance(o[4], tuple):
            assert len(o[4]) == 2 and o[4][0] in PRESENTS_LABELS and ID.match(o[4][1]), (sid, "an option presents a content node by label and id", o)
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
            check_embed_props(s["embed"], s.get("props"), copy, fields, w)
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
        tos = [t["to"] for t in s.get("next", [])]
        assert len(tos) == len(set(tos)), (w, "one jump per target (NEXT is one edge per step pair): join the conditions with any", tos)
        for t in s.get("next", []):
            assert t["to"] in steps, (w, t)
            if "when" in t:
                check_cond(t["when"], fields, derived, w, accepts)
        assert s["kind"] == "handoff" or s.get("next"), (w, "an ask step goes somewhere")
        for f in s.get("fields", []):
            o = f["options"]
            assert ("emotions" in o) != ("list" in o or "profile" in o), (w, f["id"])
            if "profile" in o:
                assert o["profile"] in PROFILE_OPTION_SLICES, (w, "a slice of kept items", o)
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
                if f["own"].get("seed"):
                    assert f["own"].get("open") and f.get("max") == 1 and "list" in o, (
                        w, "seed chips start the open own-words box of a one-pick list field", f)
                    cap = f["own"].get("max", skill["ownMax"])
                    long = [x[2] for x in skill["options"] if x[0] == o["list"] and len(x[2]) > cap]
                    assert not long, (w, "every starter fits the box (else it stops matching once written in)", long)
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
        # Step-level quiet links (an embed or hand-off screen has no field to hang them on; an ask step's are on its fields).
        assert not s.get("links") or s["kind"] in ("embed", "handoff"), (w, "an ask step's links live on its fields")
        for ln in s.get("links", []):
            assert ln["exit"] in exits and ln["label"] in copy, (w, ln)
            check_cond(ln["when"], fields, derived, w, accepts)
        # LINKS is one edge per (step, exit): one link per exit on a screen, whether on a field or the step.
        link_exits = [ln["exit"] for ln in s.get("links", [])] + [ln["exit"] for f in s.get("fields", []) for ln in f.get("links", [])]
        assert len(link_exits) == len(set(link_exits)), (w, "one quiet link per exit on a screen (LINKS is one edge per step and exit)", link_exits)
        for sl in s.get("slots", []):
            # Under a field of this step, or under the title (`$title`: above every field).
            assert sl["embed"] in EMBEDS and (sl["after"] == "$title" or sl["after"] in [f["id"] for f in s.get("fields", [])]), (w, sl)
            assert s["kind"] == "ask", (w, "slots live on ask steps")
            check_embed_props(sl["embed"], sl.get("props"), copy, fields, w)
            check_cond(sl["showWhen"], fields, derived, w, accepts)
        # A line or an offer with `when: None` always holds (a hand-off's default line, an offer for every path).
        for ln in s.get("lines", []):
            assert ln["key"] in copy, (w, ln)
            if ln.get("when") is not None:
                check_cond(ln["when"], fields, derived, w, accepts)
        for of in s.get("offers", []):
            assert of["exit"] in exits, (w, of)
            if of.get("when") is not None:
                check_cond(of["when"], fields, derived, w, accepts)
        assert "done" not in s or s["done"] in exits, w
        step_fields = {f["id"] for f in s.get("fields", [])}
        assert "primary" not in s or s["primary"] in copy, (w, "primary is a copy key", s.get("primary"))
        if "keep" in s:
            k = s["keep"]
            assert s["kind"] == "ask" and isinstance(k.get("kind"), str), (w, "a keep runs on an ask step's primary tap", k)
            assert isinstance(k.get("many"), bool), (w, "keep says whether its kind is many (profile/kinds.ts)", k)
            assert "primary" in s, (w, "a keep step's button says what it keeps: the tap is the yes (C2.2)")
            assert k["from"] and all(f in fields for f in k["from"]), (w, "keep from fields that exist", k)
            if "when" in k:
                check_cond(k["when"], fields, derived, w, accepts)
        if s["kind"] == "handoff" and s.get("fields"):
            # A hand-off's one field is its reminder chips (R5 on a hand-off): never a question in disguise.
            fu = s.get("followUp") or {}
            assert len(s["fields"]) == 1 and s["fields"][0]["id"] == fu.get("whenFrom"), (
                w, "a hand-off's only field is the chip field its followUp's whenFrom names")
            f = s["fields"][0]
            assert "list" in f["options"] and f.get("max") == 1, (w, "the reminder chips: a list, one pick", f)
            for k in ("required", "askFresh", "own", "links", "showWhen", "list"):
                assert not f.get(k), (w, f"the reminder chips take no {k}", f)
        if s["kind"] == "handoff" and s.get("followUp", {}).get("whenFrom"):
            # The card can't change under the person's thumb: nothing on it reads the chip.
            chip = s["followUp"]["whenFrom"]
            on_card = [c["when"] for c in s.get("lines", []) + s.get("offers", []) + s.get("crisis", [])]
            assert not any(re.search(rf'"(\$a\.)?{re.escape(chip)}(\.(ids|own))?"', json.dumps(c)) for c in on_card), (
                w, "lines, offers and crisis slots never read the reminder chip", chip)
        if "followUp" in s:
            fu = s["followUp"]
            t = FOLLOW_UPS.get(fu.get("type"))
            assert s["kind"] in ("ask", "handoff") and t, (w, "a follow-up type the spine registers, on an ask step or a hand-off", fu)
            if s["kind"] == "handoff":
                assert t["window"]["kind"] == "chip" and fu.get("whenFrom"), (w, "a hand-off's follow-up is picked by its chips", fu)
            if t["window"]["kind"] == "chip":
                # A hand-off's chips are on the card; an ask step may be timed by an earlier step's answer (Cope Ahead's
                # *When is it?*), with `whenDefault` for when it wasn't answered.
                here = fu.get("whenFrom") in step_fields
                assert here or (s["kind"] == "ask" and fu.get("whenFrom") in fields), (w, "a chip window needs the field that picks it", fu)
                f = next(f for st2 in skill["steps"] for f in st2.get("fields", []) if f["id"] == fu["whenFrom"])
                values = {x[1] for x in skill["options"] if x[0] == f["options"].get("list")}
                assert values and values <= set(t["window"]["chips"]), (w, "the field's options are the window's chips", values)
                assert not here or "whenDefault" not in fu, (w, "whenDefault is for a field answered earlier", fu)
                assert "whenDefault" not in fu or fu["whenDefault"] in values, (w, "whenDefault is one of the chips", fu)
            else:
                assert "whenFrom" not in fu and "whenDefault" not in fu, (w, "this type's window has no choice", fu)
            if "when" in fu:
                check_cond(fu["when"], fields, derived, w, accepts)
        assert "noClose" not in s or (s["kind"] == "handoff" and s["noClose"] is True), (w, "noClose is a hand-off's", s.get("noClose"))
        if "clears" in s:
            cl = s["clears"]
            assert isinstance(cl, list) and cl and len(set(cl)) == len(cl), (w, "clears is a list of fields", cl)
            assert set(cl) <= set(fields), (w, "clears names fields of the skill", cl)
        if s.get("reopens"):
            # R9: only a reopened run starts here, after the whole recorded path of a run that reached `after`. Nothing
            # leads to it, and it isn't the start, so a first visit never reaches it.
            ro = s["reopens"]
            assert isinstance(ro, dict) and "after" in ro and set(ro) <= {"after", "again"}, (w, "reopens is {after: <step>, again?: [<step>]}", ro)
            assert all(x in steps for x in ro.get("again", [])), (w, "reopens again names steps of the skill", ro)
            assert ro["after"] in steps and ro["after"] != s["id"], (w, "reopens after a step of the skill, not itself", ro)
            assert "again" not in ro or (ro["again"] and len(set(ro["again"])) == len(ro["again"])), (w, "reopens again is a non-empty list, no repeats", ro)
            assert s["id"] not in ro.get("again", []) and s["id"] != ro["after"], (w, "a step doesn't reopen after itself", ro)
            # Each step it reopens after books the same card that opens it (else nothing could reach it from there).
            by_id = {x["id"]: x for x in skill["steps"]}
            for x in [ro["after"], *ro.get("again", [])]:
                assert by_id[x].get("followUp"), (w, "a reopens step books a follow-up", x)
            assert len({by_id[x]["followUp"]["type"] for x in [ro["after"], *ro.get("again", [])]}) == 1, (w, "every reopens step books the same card", ro)
            assert s["id"] != skill["start"], (w, "a reopens step is never the start")
            into = [x["id"] for x in skill["steps"] if any(t["to"] == s["id"] for t in x.get("next", []))]
            assert not into, (w, "no step leads to a reopens step: only a reopened run starts there", into)
            assert s["kind"] == "ask", (w, "a reopens step asks how it went", s["kind"])
            # A reopen leaves ask-fresh answers unread, so neither the step nor anything after it may read one.
            fresh = {f["id"] for x in skill["steps"] for f in x.get("fields", []) if f.get("askFresh")}
            by_id = {x["id"]: x for x in skill["steps"]}
            seen, todo = set(), [s["id"]]
            while todo:
                x = todo.pop()
                if x in seen:
                    continue
                seen.add(x)
                todo += [t["to"] for t in by_id[x].get("next", [])]
            for x in seen:
                text = json.dumps({k: v for k, v in by_id[x].items() if k not in ("id", "kind")})
                reads = [f for f in fresh if re.search(rf'"(\$a\.)?{re.escape(f)}(\.(ids|own))?"', text)]
                assert not reads, (w, f"the reopens step and the steps after it never read an ask-fresh field ({x})", reads)
    inl = skill.get("inline")
    if inl:
        assert inl["enterAt"] and set(inl["enterAt"]) <= steps, (sid, "inline starts at steps that exist", inl)
        assert set(inl["returns"]) <= fields, (sid, "inline returns fields that exist", inl)
        if inl.get("thenVsNowFrom"):
            f = next((f for s in skill["steps"] for f in s.get("fields", []) if f["id"] == inl["thenVsNowFrom"]), None)
            values = {x[1] for x in skill["options"] if f and x[0] == f["options"].get("list")}
            assert f and values and values <= THEN_VS_NOW, (sid, "the change check's options are then-vs-now answers", values)
    per = skill.get("persist")
    if per:
        # R15: the session waits until the run leaves `after`, then writes nothing while `nothingWhen` holds.
        assert per["after"] in steps, (sid, "persist.after is a step", per)
        check_cond(per["nothingWhen"], fields, derived, sid, accepts)
        assert skill.get("quickExit"), (sid, "a skill that can write nothing has a Quick exit on every screen")
        # Nothing may be kept or scheduled before the safety answer (a keep / follow-up before `after` would run
        # while the visit hasn't decided whether to save: the machine refuses them, the build says so).
        order = [s["id"] for s in skill["steps"]]
        for s in skill["steps"]:
            if order.index(s["id"]) <= order.index(per["after"]):
                assert "keep" not in s and "followUp" not in s, (sid, s["id"], "no keep or follow-up before persist.after")
    assert "quickExit" not in skill or skill["quickExit"] is True, (sid, "quickExit is true or absent")
    for at in skill.get("resumeAt", []):
        assert at in steps, (sid, "resumeAt names a step", at)
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
    A(f"MERGE (s:Skill {{id: {q(sid)}}})\nSET s += {props({'toolId': sk['toolId'], 'version': sk['version'], 'contentVersion': CONTENT_VERSION, 'start': sk['start'], 'ownMax': sk['ownMax'], 'emotionFields': sk['emotionFields'], 'accepts': sk.get('accepts', [])})}, s.inlineJson = {js(sk.get('inline'))}, s.runtimeJson = {js(runtime_of(sk))}, s.copyJson = {js(sk['copy'])}, s.tablesJson = {js(sk['tables'])}, s.deriveJson = {js(sk['derive'])};")
    A(f"MATCH (t:TherapyConcept {{id: {q(sk['concept'])}}}), (s:Skill {{id: {q(sid)}}})\nMERGE (t)-[:HAS_SKILL]->(s);")
    if "addresses" in sk:
        # The concept's ADDRESSES set (Find the feeling's word routes, the routing tie-break), owned by this skill:
        # rebuilt each load so a dropped emotion disappears. `legacy: false` keeps them out of the kill-switch ranker
        # (legacy.ts), so switching routing off still restores the pre-review routing whole.
        A(f"MATCH (:TherapyConcept {{id: {q(sk['concept'])}}})-[r:ADDRESSES]->(:Emotion) DELETE r;")
        for eid in sk["addresses"]:
            A(f"MATCH (t:TherapyConcept {{id: {q(sk['concept'])}}}), (e:Emotion {{id: {q(eid)}}})\nMERGE (t)-[r:ADDRESSES]->(e)\nSET r += {{legacy: false}};")
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
        for i, ln in enumerate(st.get("links", [])):
            A(f"MATCH (a:SkillStep {{id: {q(a)}}}), (x:SkillExit {{id: {q(sid + ':' + ln['exit'])}}})\nMERGE (a)-[r:LINKS]->(x)\nSET r += {props({'order': i, 'field': '', 'label': ln['label']})}, r.whenJson = {js(ln['when'])};")
        for f in st.get("fields", []):
            for i, ln in enumerate(f.get("links", [])):
                A(f"MATCH (a:SkillStep {{id: {q(a)}}}), (x:SkillExit {{id: {q(sid + ':' + ln['exit'])}}})\nMERGE (a)-[r:LINKS]->(x)\nSET r += {props({'order': i, 'field': f['id'], 'label': ln['label']})}, r.whenJson = {js(ln['when'])};")
    for i, (lst, value, label, extra, clinical) in enumerate(sk["options"]):
        nid = f"{sid}:{lst}:{value}"
        # A clinical label, or (Label, id): the content node elsewhere in the graph the option shows (PRESENTS).
        presents = clinical if isinstance(clinical, tuple) else None
        clinical = None if presents else clinical
        labels = "SkillOption" + (f":{clinical}" if clinical else "")
        p = {k: v for k, v in extra.items() if k != "for"}
        A(f"MERGE (o:SkillOption {{id: {q(nid)}}})\nSET o:{labels}, o += {props({'skillId': sid, 'list': lst, 'value': value, 'label': label, 'version': sk['version']})}, o.propsJson = {js(p)}{', o.forOwn = true' if extra.get('for') == '$own' else ''};")
        A(f"MATCH (s:Skill {{id: {q(sid)}}}), (o:SkillOption {{id: {q(nid)}}})\nMERGE (s)-[r:HAS_OPTION]->(o)\nSET r += {props({'list': lst, 'order': i})};")
        if presents:
            A(f"MATCH (o:SkillOption {{id: {q(nid)}}}), (c:{presents[0]} {{id: {q(presents[1])}}})\nMERGE (o)-[:PRESENTS]->(c);")
        if clinical == "Interpretation" and extra["set"] != "general":
            A(f"MATCH (c:EmotionRegulationContent {{dbtParent: {q(extra['set'])}}}), (o:SkillOption {{id: {q(nid)}}})\nMERGE (c)-[:HAS_INTERPRETATION]->(o);")
        if clinical == "Interpretation" and extra["set"] == "general":
            A(f"MATCH (s:Skill {{id: {q(sid)}}}), (o:SkillOption {{id: {q(nid)}}})\nMERGE (s)-[:HAS_INTERPRETATION]->(o);")
        if clinical == "RebellionOption":
            # A rebellion serves the functions it's matched to (DT-11): queryable as knowledge, not only as UI.
            for fn in extra["functions"]:
                A(f"MATCH (o:SkillOption {{id: {q(nid)}}}), (f:SkillOption {{id: {q(sid + ':function:' + fn)}}})\nMERGE (o)-[:SERVES]->(f);")
        if clinical == "Alternative" and extra["for"] != "$own":
            A(f"MATCH (o:SkillOption {{id: {q(nid)}}}), (st:SkillOption {{id: {q(sid + ':story:' + extra['for'])}}})\nMERGE (o)-[:ALTERNATIVE_TO]->(st);")
CYPHER = "\n".join(L)

if __name__ == "__main__":
    print(CYPHER)
