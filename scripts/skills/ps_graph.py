"""Problem Solve's clinical content, read from the schema files it lives in (schema/problem-solve-data.cypher,
schema/problem-solve-barriers.cypher), without a database. Those files stay the one editable source of the
knowledge (problem types per DBT parent, solution directions and their three step sizes, the parts of a problem,
the MI barriers and what to say to each); problem_solve.py turns it into the skill's options, and each option keeps
a PRESENTS edge back to the node it shows (build.py), so the knowledge stays queryable as knowledge.

What is read:
  problemTypes   (EmotionRegulationContent)-[:HAS_PROBLEM_TYPE]->(ProblemType), per parent, by sortOrder
  directions     (ProblemType)-[:HAS_SOLUTION_DIRECTION]->(SolutionDirection) {small, medium, bigger, linkedToolId}
  aspects        (ProblemType)-[:HAS_DECOMPOSITION_ASPECT]->(DecompositionAspect) {defaultBucket}
  barriers       (ProblemSolveProtocol)-[:HAS_BARRIER_TYPE]->(BarrierType)-[:HAS_SUB_RESPONSE]->(BarrierSubResponse)
                 -[:HAS_AMBIVALENCE_OPTION]->(AmbivalenceOption)
  protocol       ProblemSolveProtocol's tool lists (readiness, nothing-can-change, confidence)
  fit            each Emotion's problemSolveApplicable / psAlternativeSkill. schema_graph.py skips the UNWIND rows,
                 so they are read here, statement by statement (as graph_tables.py reads HAS_REGULATION_CONTENT).

The screens' copy is not read: problem_solve.py has its own (the protocol's sentences predate the voice rules).
"""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
# By path, not on sys.path: scripts/recommendations has its own build.py, which would shadow scripts/skills/build.py.
import importlib.util  # noqa: E402
_spec = importlib.util.spec_from_file_location("schema_graph", os.path.join(ROOT, "scripts/recommendations/schema_graph.py"))
_sg = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_sg)
load, split_statements = _sg.load, _sg.split_statements

SET_FIT = re.compile(r"problemSolveApplicable\s*=\s*(true|false).*?psAlternativeSkill\s*=\s*(null|\"([a-z0-9-]+)\")", re.S)


def _by_order(nodes):
    return sorted(nodes, key=lambda n: (n.get("sortOrder", 0), n["id"]))


def _fit():
    """Emotion id → (applicable, alternative tool id or None), as the last statement that set it says."""
    out = {}
    src = open(os.path.join(ROOT, "schema/problem-solve-data.cypher"), encoding="utf8").read()
    for stmt in split_statements(src):
        m = SET_FIT.search(stmt)
        if not m or "Emotion" not in stmt:
            continue
        applicable, alt = m.group(1) == "true", m.group(3)
        u = re.search(r"UNWIND\s*\[(.*?)\]\s*AS id", stmt, re.S)
        w = re.search(r"WHERE e\.id IN \[(.*?)\]", stmt, re.S)
        one = re.search(r"MATCH \(e:Emotion \{id: '([a-z_]+)'\}\)", stmt)
        ids = re.findall(r"[\"']([a-z_]+)[\"']", (u or w).group(1)) if (u or w) else [one.group(1)] if one else []
        for i in ids:
            out[i] = (applicable, alt)
    return out


def content():
    g = load()
    erc = {n.props["dbtParent"]: n.props for n in g.find("EmotionRegulationContent")}
    types = {}
    for r in g.rels("HAS_PROBLEM_TYPE", "EmotionRegulationContent", "ProblemType"):
        types.setdefault(r.start.props["dbtParent"], []).append(dict(r.end.props))
    directions, aspects = {}, {}
    for r in g.rels("HAS_SOLUTION_DIRECTION", "ProblemType", "SolutionDirection"):
        directions.setdefault(r.start.props["id"], []).append(dict(r.end.props))
    for r in g.rels("HAS_DECOMPOSITION_ASPECT", "ProblemType", "DecompositionAspect"):
        aspects.setdefault(r.start.props["id"], []).append(dict(r.end.props))
    subs, ambiv = {}, {}
    for r in g.rels("HAS_SUB_RESPONSE", "BarrierType", "BarrierSubResponse"):
        subs.setdefault(r.start.props["id"], []).append(dict(r.end.props))
    for r in g.rels("HAS_AMBIVALENCE_OPTION", "BarrierSubResponse", "AmbivalenceOption"):
        ambiv.setdefault(r.start.props["id"], []).append(dict(r.end.props))
    barriers = _by_order([dict(r.end.props) for r in g.rels("HAS_BARRIER_TYPE", "ProblemSolveProtocol", "BarrierType")])
    protocol = next(iter(g.find("ProblemSolveProtocol"))).props
    return {
        "parents": {p: {k: v for k, v in n.items() if k.startswith("ps") or k == "ruminationRiskLevel"} for p, n in sorted(erc.items())},
        "problemTypes": {p: _by_order(v) for p, v in sorted(types.items())},
        "directions": {k: _by_order(v) for k, v in directions.items()},
        "aspects": {k: _by_order(v) for k, v in aspects.items()},
        "barriers": barriers,
        "subs": {k: _by_order(v) for k, v in subs.items()},
        "ambivalence": {k: _by_order(v) for k, v in ambiv.items()},
        "protocol": protocol,
        "fit": _fit(),
    }


if __name__ == "__main__":
    import json
    c = content()
    print(json.dumps({k: (len(v) if isinstance(v, (dict, list)) else v) for k, v in c.items()}, indent=1))
