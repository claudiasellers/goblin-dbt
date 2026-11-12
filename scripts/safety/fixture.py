"""Write tests/fixtures/safety-content.json: what src/data/content/safety.json ships, built from
content.py without a database (scripts/content-snapshot/build.mjs buildSafety builds the same from
the graph; tests/content-snapshot.test.mjs and tests/safety-route.test.mjs hold the three equal).

  python3 scripts/safety/fixture.py           # the fixture
  python3 scripts/safety/fixture.py --ship    # and src/data/content/safety.json, before the graph has it
"""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
import content as C  # noqa: E402
import build  # noqa: E402,F401  (runs the checks; its cypher goes to stdout, so silence it)
ROOT = os.path.dirname(os.path.dirname(here))


def payload():
    by_id = {l[0]: l for l in C.LINES}

    def line(lid):
        _, _, name, kind, phone, sms, body, chat, hours, langs, _ = by_id[lid]
        return {"id": lid, "name": name, "kind": kind, "phone": phone, "sms": sms, "smsBody": body,
                "chatUrl": chat, "hours": hours, "languages": langs}

    return {
        "version": C.VERSION,
        "flow": C.FLOW,
        "flags": {fid: p["userCopy"] for fid, p in sorted(C.FLAGS.items()) if "userCopy" in p},
        "countries": [{"id": code, "name": name, "emergency": em, "firearmPrompt": fa, "lines": [line(l) for l in lines]}
                      for code, name, em, fa, lines in sorted(C.COUNTRIES)],
    }


def write(path, obj):
    with open(path, "w") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(path, file=sys.stderr)


if __name__ == "__main__":
    p = payload()
    write(os.path.join(ROOT, "tests/fixtures/safety-content.json"), p)
    if "--ship" in sys.argv:
        write(os.path.join(ROOT, "src/data/content/safety.json"),
              {"source": {"file": "scripts/safety/fixture.py (from content.py)", "exportedAt": None}, "content": p})
