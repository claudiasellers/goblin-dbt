"""Write tests/fixtures/recommendation-graph.json: the slice of the graph the check-in routing reads,
replayed from schema/*.cypher (LOAD_ORDER) by schema_graph.py. No database.

  python3 scripts/recommendations/fixture.py

The golden tests run the pure engine over this file; tests/recommendation-legacy.test.mjs regenerates
it and fails when it is stale, so a schema edit that changes routing fails loudly. The same test
checks it against the committed live summary (tests/fixtures/live-routing-*.json).
"""
import json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
import schema_graph  # noqa: E402

ROOT = schema_graph.ROOT
OUT = os.path.join(ROOT, 'tests/fixtures/recommendation-graph.json')

# Statements the interpreter skipped must not touch anything routing reads.
ROUTING_TOKENS = re.compile(
    r'\[\w*:(ASSOCIATED_WITH|ADDRESSES|REDUCES|TARGETS|EVIDENCE_FOR|CO_OCCURS_WITH|TRIGGERS_SAFETY|HAS_RESPONSE|'
    r'RECOMMENDED_FOR|SCORES_AS|SIGNALS|CONTRAINDICATED_FOR|RAISES_SAFETY|TRIGGERS_NEXT)\b|\.appToolId\b|\.(side|skillKind|direction|blank)\s*=|'
    r':(ActivationPattern|SafetyFlag|DiscriminatingQuestion|QuestionResponse|RoutingPolicy)\b')
TOOL_EDGES = ('ADDRESSES', 'REDUCES', 'TARGETS')
PATTERN_FIELDS = ('userFacingLabel', 'description', 'evidenceGrade', 'safetyConstraints', 'clinicalNotes')
CONCEPT_FIELDS = ('appToolId', 'name', 'description', 'whenToUse', 'dbtBasis', 'side', 'skillKind', 'direction')
CO_FIELDS = ('clinicalLabel', 'combinedUserFacingLabel', 'primaryPatternId', 'frequency', 'sequencingNote')
RF_FIELDS = ('bands', 'priority', 'direction', 'side', 'requiresPrior', 'emotionGate', 'words', 'tier', 'surface', 'active',
             'version', 'reviewStatus', 'rationale')


def build(g):
    bad = [(f, k, why) for f, k, why, stmt in g.unsupported if ROUTING_TOKENS.search(stmt)]
    if bad:
        raise SystemExit(f'schema_graph skipped statements that routing depends on: {bad}')

    pid = lambda n: n.props['id']  # noqa: E731
    patterns = {}
    for n in sorted(g.find('ActivationPattern'), key=pid):
        emotions = sorted(({'id': pid(r.end), 'strength': r.props.get('strength')}
                           for r in g.rels('ASSOCIATED_WITH', 'ActivationPattern', 'Emotion') if r.start is n),
                          key=lambda e: e['id'])
        patterns[pid(n)] = dict({k: n.props.get(k) for k in PATTERN_FIELDS},
                                blank=n.props.get('blank'), emotions=emotions)

    addresses = {}
    for r in g.relationships:
        if r.type in TOOL_EDGES and 'TherapyConcept' in r.start.labels and 'Emotion' in r.end.labels:
            addresses.setdefault(pid(r.start), set()).add(pid(r.end))
    concepts = {}
    for n in sorted(g.find('TherapyConcept'), key=pid):
        if n.props.get('appToolId') or pid(n) in addresses:
            concepts[pid(n)] = dict({k: n.props.get(k) for k in CONCEPT_FIELDS},
                                    addresses=sorted(addresses.get(pid(n), ())))

    evidence = sorted(({'responseId': pid(r.start), 'patternId': pid(r.end), 'weight': r.props.get('weight')}
                       for r in g.rels('EVIDENCE_FOR', 'QuestionResponse', 'ActivationPattern')),
                      key=lambda e: (e['responseId'], e['patternId']))
    questions = {}
    for q in sorted(g.find('DiscriminatingQuestion'), key=lambda n: (n.props.get('order', 0), pid(n))):
        for quad in q.props.get('applicableQuadrants') or []:
            questions.setdefault(quad, []).append(pid(q))

    co = sorted((dict({'a': pid(r.start), 'b': pid(r.end)}, **{k: r.props.get(k) for k in CO_FIELDS})
                 for r in g.rels('CO_OCCURS_WITH', 'ActivationPattern', 'ActivationPattern')),
                key=lambda c: (c['a'], c['b']))

    # Declaration order: the callable takes the first flag (LIMIT 1), today's only defined order.
    safety = {}
    for r in sorted(g.rels('TRIGGERS_SAFETY', 'ActivationPattern', 'SafetyFlag'), key=lambda r: r.seq):
        f = r.end.props
        safety.setdefault(pid(r.start), []).append(dict({k: f.get(k) for k in ('id', 'type', 'trigger', 'action')},
                                                        withoutSignal=r.props.get('withoutSignal')))
    # An answer that raises a flag outright (checkin-safety.cypher), in declaration order.
    raises = {}
    for r in sorted(g.rels('RAISES_SAFETY', 'QuestionResponse', 'SafetyFlag'), key=lambda r: r.seq):
        f = r.end.props
        raises.setdefault(pid(r.start), []).append({k: f.get(k) for k in ('id', 'type', 'trigger', 'action')})
    next_q = {pid(r.start): pid(r.end) for r in g.rels('TRIGGERS_NEXT', 'QuestionResponse', 'DiscriminatingQuestion')}
    question_kind = {pid(q): q.props.get('kind') for q in g.find('DiscriminatingQuestion') if q.props.get('kind')}

    emotions = {pid(n): {'name': n.props.get('name'), 'quadrant': n.props.get('quadrant')}
                for n in sorted(g.find('Emotion'), key=pid)}

    aliases = {}
    for r in sorted(g.rels('SCORES_AS', 'Emotion', 'Emotion'), key=lambda r: (pid(r.start), pid(r.end))):
        aliases.setdefault(pid(r.start), []).append(pid(r.end))

    signals = {}
    for r in sorted(g.rels('SIGNALS', 'Emotion', 'ActivationPattern'), key=lambda r: (pid(r.start), pid(r.end))):
        signals.setdefault(pid(r.start), []).append(pid(r.end))

    rows = sorted((dict({'id': r.props.get('id'), 'conceptId': pid(r.start), 'patternId': pid(r.end)},
                        **{k: r.props.get(k) for k in RF_FIELDS})
                   for r in g.rels('RECOMMENDED_FOR', 'TherapyConcept', 'ActivationPattern')),
                  key=lambda x: x['id'])
    contra = sorted({(pid(r.start), pid(r.end)) for r in g.rels('CONTRAINDICATED_FOR', 'TherapyConcept')})
    rp = g.node('RoutingPolicy', 'checkin_result')
    policy = None
    if rp:
        policy = {k: rp.props.get(k) for k in ('version', 'enabled', 'maxCards', 'fallbackConceptId', 'defaultBand',
                                                'floodedPatterns', 'answerWeight', 'tieBreak', 'reviewStatus')}

    return {
        'kind': 'recommendation-graph',
        'generatedBy': 'scripts/recommendations/fixture.py (replays schema/*.cypher in LOAD_ORDER)',
        'patterns': patterns,
        'concepts': concepts,
        'evidence': evidence,
        'questions': questions,
        'coOccurrence': co,
        'safety': safety,
        'raisesSafety': raises,
        'triggersNext': next_q,
        'questionKinds': question_kind,
        'emotions': emotions,
        'aliases': aliases,
        'signals': signals,
        'recommendedFor': rows,
        'contraindicated': [{'conceptId': a, 'targetId': b} for a, b in contra],
        'routingPolicy': policy,
    }


def main():
    data = build(schema_graph.load())
    text = json.dumps(data, ensure_ascii=False, indent=1) + '\n'
    if '--stdout' in sys.argv:
        sys.stdout.write(text)
        return
    with open(OUT, 'w', encoding='utf8') as f:
        f.write(text)
    print(OUT)


if __name__ == '__main__':
    main()
