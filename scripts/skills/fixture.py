"""Write tests/fixtures/skills-content.json: the payload getSkillContent returns, built from scripts/skills/
and the schema files without a database. src/data/content/skills.json ships exactly this content (a graph
load refreshes it from Aura; tests/content-snapshot.test.mjs pins the two).

  python3 scripts/skills/fixture.py            # the fixture
  python3 scripts/skills/fixture.py --ship     # and src/data/content/skills.json, before the graph has the
                                               # content (after a load, the load's refresh writes it from Aura)
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from content import SKILLS, CONTENT_VERSION  # noqa: E402
from build import spec_of, runtime_of  # noqa: E402  (also runs the content checks)
from graph_tables import tables  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))


def served(sk):
    """One skill as getSkillContent shapes it (the order of every list is its graph order)."""
    steps = []
    for st in sk["steps"]:
        s = {"id": st["id"], "kind": st["kind"], **spec_of(st)}
        s["next"] = [{"to": t["to"], "when": t.get("when")} for t in st.get("next", [])]
        rows = sorted(({"exit": o["exit"], "when": o.get("when"), "order": i} for i, o in enumerate(st.get("offers", []))),
                      key=lambda r: r["order"])
        s["offers"] = [{"exit": r["exit"], "when": r["when"]} for r in rows]
        steps.append(s)
    options = {}
    for lst, value, label, extra, _clinical in sk["options"]:
        o = {"value": value, "label": label, **{k: v for k, v in extra.items() if k != "for"}}
        if "for" in extra:
            o["for"] = extra["for"]
        options.setdefault(lst, []).append(o)
    exits = [{"id": e["id"], "toolId": e.get("toolId"), "query": e.get("query", {}), "carry": e.get("carry", []),
              "done": bool(e.get("done")), **({"planned": True} if e.get("planned") else {}),
              **({"safety": True} if e.get("safety") else {}), **({"label": e["label"]} if e.get("label") else {})} for e in sorted(sk["exits"], key=lambda e: e["id"])]
    return {
        "id": sk["id"], "toolId": sk["toolId"], "version": sk["version"], "start": sk["start"],
        "accepts": sk.get("accepts", []), "ownMax": sk["ownMax"],
        "emotionFields": sk["emotionFields"], "copy": sk["copy"], "tables": sk["tables"], "derive": sk["derive"],
        "steps": steps, "exits": exits, "options": options,
        **({"inline": sk["inline"]} if sk.get("inline") else {}),
        **runtime_of(sk),
    }


def payload():
    parent_of, fits_when = tables()
    return {"version": CONTENT_VERSION, "parentOf": parent_of, "fitsWhen": fits_when,
            "skills": [served(sk) for sk in sorted(SKILLS, key=lambda s: s["id"])]}


if __name__ == "__main__":
    out = os.path.join(ROOT, "tests/fixtures/skills-content.json")
    with open(out, "w") as f:
        json.dump(payload(), f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(out)
    if "--ship" in sys.argv:
        ship = os.path.join(ROOT, "src/data/content/skills.json")
        with open(ship, "w") as f:
            source = {"file": "scripts/skills/fixture.py (from the schema files)", "exportedAt": None}
            f.write(json.dumps({"source": source, "content": payload()}, ensure_ascii=False, indent=2) + "\n")
        print(ship)
