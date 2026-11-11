"""A small, read-only interpreter for the repo's schema/*.cypher files (plan E4-1).

It replays the loaded files in LOAD_ORDER (scripts/load-graph.mjs) into an in-memory graph, so the
check-in routing can be pinned and tested without Neo4j. It understands the statement shapes the
schema files actually use after A1-4's conversion:

  UNWIND <literal> AS v …                    (one row per element; several UNWINDs nest)
  MATCH / MERGE node patterns                (:Label {prop: expr}), (v:Label), (), (:Label)
  MATCH path patterns                        (a)-[r:T|U]->(b), <-, undirected -[r:T]-
  MERGE (a)-[r:T {key: expr}]->(b)           key properties are part of the identity
  WHERE a.p = x / a.p <> b.p / NOT a.p IN [..] joined by AND
  SET v.p = expr, v += {map}                 expr: literal, variable, variable.field
  SET v:Label:Other                          (adds labels; the skill runtime's clinical labels)
  WITH a, b                                  (pass-through of bound variables only)
  DELETE r

Anything else (FOREACH, WITH, RETURN, CALL, functions) is skipped and listed in `unsupported`, so a
caller can prove that nothing it depends on was skipped. MATCH semantics are kept: a MERGE of a
relationship whose endpoint doesn't exist is a no-op, exactly as in Neo4j.

  from schema_graph import load
  g = load()                   # Graph over every file in LOAD_ORDER
  g.node('ActivationPattern', 'acute_alarm')
  g.rels('ASSOCIATED_WITH', start_label='ActivationPattern')
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))


class Unsupported(Exception):
    pass


# ---------------------------------------------------------------------------------------------
# Statements and literals
# ---------------------------------------------------------------------------------------------

def load_order():
    src = open(os.path.join(ROOT, 'scripts/load-graph.mjs'), encoding='utf8').read()
    block = re.search(r'export const LOAD_ORDER = \[(.*?)\];', src, re.S).group(1)
    return re.findall(r"'([a-z0-9-]+\.cypher)'", block)


def split_statements(source):
    """Same rules as splitStatements in scripts/load-graph.mjs: ';' outside strings and comments."""
    out, cur, i, n = [], [], 0, len(source)
    while i < n:
        ch, nx = source[i], source[i + 1] if i + 1 < n else ''
        if ch == '/' and nx == '/':
            while i < n and source[i] != '\n':
                i += 1
            continue
        if ch == '/' and nx == '*':
            i += 2
            while i < n and not (source[i] == '*' and i + 1 < n and source[i + 1] == '/'):
                i += 1
            i += 2
            continue
        if ch in '\'"`':
            q = ch
            cur.append(ch)
            i += 1
            while i < n:
                c = source[i]
                cur.append(c)
                if c == '\\':
                    cur.append(source[i + 1] if i + 1 < n else '')
                    i += 2
                    continue
                i += 1
                if c == q:
                    break
            continue
        if ch == ';':
            s = ''.join(cur).strip()
            if s:
                out.append(s)
            cur = []
            i += 1
            continue
        cur.append(ch)
        i += 1
    s = ''.join(cur).strip()
    if s:
        out.append(s)
    return out


_ESC = {'n': '\n', 't': '\t', 'r': '\r', '\\': '\\', "'": "'", '"': '"', '/': '/', 'b': '\b', 'f': '\f'}


class Parser:
    """Recursive-descent parser for Cypher literals and simple expressions."""

    def __init__(self, text, pos=0):
        self.t, self.i = text, pos

    def ws(self):
        while self.i < len(self.t) and self.t[self.i].isspace():
            self.i += 1

    def peek(self):
        self.ws()
        return self.t[self.i] if self.i < len(self.t) else ''

    def eat(self, ch):
        if self.peek() != ch:
            raise Unsupported(f'expected {ch!r} at {self.t[self.i:self.i + 30]!r}')
        self.i += 1

    def ident(self):
        self.ws()
        m = re.compile(r'[A-Za-z_][A-Za-z0-9_]*|`[^`]+`').match(self.t, self.i)
        if not m:
            raise Unsupported(f'expected identifier at {self.t[self.i:self.i + 30]!r}')
        self.i = m.end()
        return m.group(0).strip('`')

    def string(self):
        q = self.t[self.i]
        self.i += 1
        out = []
        while self.i < len(self.t):
            c = self.t[self.i]
            if c == '\\':
                nxt = self.t[self.i + 1]
                if nxt == 'u':
                    out.append(chr(int(self.t[self.i + 2:self.i + 6], 16)))
                    self.i += 6
                    continue
                out.append(_ESC.get(nxt, nxt))
                self.i += 2
                continue
            self.i += 1
            if c == q:
                return ''.join(out)
            out.append(c)
        raise Unsupported('unterminated string')

    def expr(self):
        """A literal, `$param` (unsupported), `var` or `var.field` (returned as ('ref', [...]))."""
        c = self.peek()
        if c in '\'"':
            return self.string()
        if c == '[':
            self.i += 1
            items = []
            if self.peek() == ']':
                self.i += 1
                return items
            while True:
                items.append(self.expr())
                if self.peek() == ',':
                    self.i += 1
                    continue
                self.eat(']')
                return items
        if c == '{':
            return self.map()
        m = re.compile(r'-?\d+(\.\d+)?([eE][-+]?\d+)?').match(self.t, self.i)
        if m and (c.isdigit() or c == '-'):
            self.i = m.end()
            return float(m.group(0)) if ('.' in m.group(0) or 'e' in m.group(0).lower()) else int(m.group(0))
        word = self.ident()
        low = word.lower()
        if low == 'true':
            return True
        if low == 'false':
            return False
        if low == 'null':
            return None
        if self.peek() == '(':
            raise Unsupported(f'function call {word}()')
        path = [word]
        while self.peek() == '.':
            self.i += 1
            path.append(self.ident())
        return ('ref', path)

    def map(self):
        self.eat('{')
        out = {}
        if self.peek() == '}':
            self.i += 1
            return out
        while True:
            key = self.ident()
            self.eat(':')
            out[key] = self.expr()
            if self.peek() == ',':
                self.i += 1
                continue
            self.eat('}')
            return out


def is_ref(v):
    return isinstance(v, tuple) and len(v) == 2 and v[0] == 'ref'


def resolve(v, env):
    """Evaluate a parsed expression against a row (refs → values; lists / maps recursively)."""
    if is_ref(v):
        path = v[1]
        if path[0] not in env:
            raise Unsupported(f'unbound {path[0]}')
        cur = env[path[0]]
        for p in path[1:]:
            if isinstance(cur, Node):
                cur = cur.props.get(p)
            elif isinstance(cur, Rel):
                cur = cur.props.get(p)
            elif isinstance(cur, dict):
                cur = cur.get(p)
            else:
                raise Unsupported(f'cannot read .{p}')
        return cur
    if isinstance(v, list):
        return [resolve(x, env) for x in v]
    if isinstance(v, dict):
        return {k: resolve(x, env) for k, x in v.items()}
    return v


# ---------------------------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------------------------

class Node:
    __slots__ = ('labels', 'props')

    def __init__(self, labels, props):
        self.labels, self.props = set(labels), dict(props)

    def __repr__(self):
        return f"({':'.join(sorted(self.labels))} {self.props.get('id')})"


class Rel:
    __slots__ = ('type', 'start', 'end', 'props', 'seq')

    def __init__(self, type_, start, end, props, seq):
        self.type, self.start, self.end, self.props, self.seq = type_, start, end, dict(props), seq


class Graph:
    def __init__(self):
        self.nodes = []
        self.relationships = []
        self.unsupported = []   # [(file, index, reason, statement)]
        self._seq = 0

    # -- lookups used by fixture.py --
    def find(self, label, **props):
        return [n for n in self.nodes if label in n.labels and all(n.props.get(k) == v for k, v in props.items())]

    def node(self, label, id_):
        found = self.find(label, id=id_)
        return found[0] if found else None

    def rels(self, type_, start_label=None, end_label=None):
        return [r for r in self.relationships if r.type == type_
                and (start_label is None or start_label in r.start.labels)
                and (end_label is None or end_label in r.end.labels)]

    # -- mutation --
    def merge_node(self, labels, props):
        for n in self.nodes:
            if set(labels) <= n.labels and all(n.props.get(k) == v for k, v in props.items()):
                return n
        n = Node(labels, props)
        self.nodes.append(n)
        return n

    def merge_rel(self, type_, start, end, key):
        for r in self.relationships:
            if r.type == type_ and r.start is start and r.end is end and all(r.props.get(k) == v for k, v in key.items()):
                return r
        self._seq += 1
        r = Rel(type_, start, end, key, self._seq)
        self.relationships.append(r)
        return r


# ---------------------------------------------------------------------------------------------
# Statement evaluation
# ---------------------------------------------------------------------------------------------

KEYWORDS = ['OPTIONAL MATCH', 'DETACH DELETE', 'ON CREATE SET', 'ON MATCH SET', 'UNWIND', 'MATCH', 'MERGE',
            'SET', 'WHERE', 'DELETE', 'WITH', 'RETURN', 'FOREACH', 'REMOVE', 'CALL', 'CREATE', 'ORDER BY', 'LIMIT']
_KW = re.compile(r'\b(' + '|'.join(k.replace(' ', r'\s+') for k in KEYWORDS) + r')\b')


def clauses(stmt):
    """Split a statement into (KEYWORD, body) at depth 0, outside strings."""
    marks, depth, i, n = [], 0, 0, len(stmt)
    while i < n:
        c = stmt[i]
        if c in '\'"`':
            p = Parser(stmt, i)
            p.string() if c != '`' else None
            if c == '`':
                j = stmt.index('`', i + 1)
                i = j + 1
            else:
                i = p.i
            continue
        if c in '([{':
            depth += 1
        elif c in ')]}':
            depth -= 1
        elif depth == 0 and (i == 0 or not (stmt[i - 1].isalnum() or stmt[i - 1] == '_')):
            m = _KW.match(stmt, i)
            if m and stmt[i:i + 1].isupper():
                marks.append((i, re.sub(r'\s+', ' ', m.group(1)), m.end()))
                i = m.end()
                continue
        i += 1
    out = []
    for k, (start, kw, body_start) in enumerate(marks):
        end = marks[k + 1][0] if k + 1 < len(marks) else n
        out.append((kw, stmt[body_start:end].strip()))
    if not marks or marks[0][0] != 0:
        raise Unsupported('statement does not start with a keyword')
    return out


def split_top(text, sep=','):
    parts, depth, cur, i = [], 0, [], 0
    while i < len(text):
        c = text[i]
        if c in '\'"':
            p = Parser(text, i)
            p.string()
            cur.append(text[i:p.i])
            i = p.i
            continue
        if c in '([{':
            depth += 1
        elif c in ')]}':
            depth -= 1
        if c == sep and depth == 0:
            parts.append(''.join(cur).strip())
            cur = []
        else:
            cur.append(c)
        i += 1
    if ''.join(cur).strip():
        parts.append(''.join(cur).strip())
    return parts


def parse_node(p):
    """`(v:Label:Other {k: expr})` → (var, labels, props-exprs)."""
    p.eat('(')
    var, labels, props = None, [], {}
    if re.match(r'[A-Za-z_`]', p.peek() or ' '):
        var = p.ident()
    while p.peek() == ':':
        p.i += 1
        labels.append(p.ident())
    if p.peek() == '{':
        props = p.map()
    p.eat(')')
    return var, labels, props


def parse_pattern(text):
    """A node, or node-rel-node. Returns ('node', n) or ('path', a, rel, b, direction)."""
    p = Parser(text)
    a = parse_node(p)
    p.ws()
    if p.i >= len(p.t):
        return ('node', a)
    left = p.t[p.i:p.i + 2]
    direction = 'in' if left.startswith('<-') else 'out'
    p.i += 2 if left.startswith('<-') else 1
    p.eat('[')
    rvar, types, rprops = None, [], {}
    if re.match(r'[A-Za-z_]', p.peek() or ' '):
        rvar = p.ident()
    if p.peek() == ':':
        p.i += 1
        types.append(p.ident())
        while p.peek() == '|':
            p.i += 1
            if p.peek() == ':':
                p.i += 1
            types.append(p.ident())
    if p.peek() == '{':
        rprops = p.map()
    p.eat(']')
    p.ws()
    if p.t.startswith('->', p.i):
        if direction == 'in':
            raise Unsupported('<-[]->')
        p.i += 2
    elif p.t.startswith('-', p.i):
        p.i += 1
        if direction == 'out':
            direction = 'both'
    else:
        raise Unsupported('bad relationship pattern')
    b = parse_node(p)
    p.ws()
    if p.i < len(p.t):
        raise Unsupported('longer path')
    return ('path', a, (rvar, types, rprops), b, direction)


def node_matches(n, labels, props, env):
    return set(labels) <= n.labels and all(n.props.get(k) == resolve(v, env) for k, v in props.items())


def bind_node(g, spec, env, create):
    var, labels, props = spec
    if var and var in env and not labels and not props:
        return [env[var]]
    if create:
        return [g.merge_node(labels, {k: resolve(v, env) for k, v in props.items()})]
    if var and var in env:
        return [env[var]] if node_matches(env[var], labels, props, env) else []
    return [n for n in g.nodes if node_matches(n, labels, props, env)]


def match(g, env, pattern):
    kind = pattern[0]
    if kind == 'node':
        spec = pattern[1]
        out = []
        for n in bind_node(g, spec, env, False):
            e = dict(env)
            if spec[0]:
                e[spec[0]] = n
            out.append(e)
        return out
    _, a, (rvar, types, rprops), b, direction = pattern
    out = []
    for r in list(g.relationships):
        if types and r.type not in types:
            continue
        if not all(r.props.get(k) == resolve(v, env) for k, v in rprops.items()):
            continue
        ends = []
        if direction in ('out', 'both'):
            ends.append((r.start, r.end))
        if direction in ('in', 'both'):
            ends.append((r.end, r.start))
        for s, t in ends:
            if a[0] and a[0] in env and env[a[0]] is not s:
                continue
            if b[0] and b[0] in env and env[b[0]] is not t:
                continue
            if not node_matches(s, a[1], a[2], env) or not node_matches(t, b[1], b[2], env):
                continue
            e = dict(env)
            if a[0]:
                e[a[0]] = s
            if b[0]:
                e[b[0]] = t
            if rvar:
                e[rvar] = r
            out.append(e)
    return out


def where(env, cond):
    for part in re.split(r'\s+AND\s+', cond.strip()):
        m = re.fullmatch(r'NOT\s+(\w+)\.(\w+)\s+IN\s+(.+)', part, re.S)
        if m:
            val = resolve(('ref', [m.group(1), m.group(2)]), env)
            if val in resolve(Parser(m.group(3)).expr(), env):
                return False
            continue
        m = re.fullmatch(r'(\w+)\.(\w+)\s+IN\s+(.+)', part, re.S)
        if m:
            if resolve(('ref', [m.group(1), m.group(2)]), env) not in resolve(Parser(m.group(3)).expr(), env):
                return False
            continue
        m = re.fullmatch(r'(\w+)\.(\w+)\s*(=|<>)\s*(.+)', part, re.S)
        if not m:
            raise Unsupported(f'WHERE {part[:40]}')
        left = resolve(('ref', [m.group(1), m.group(2)]), env)
        right = resolve(Parser(m.group(4)).expr(), env)
        if (left == right) != (m.group(3) == '='):
            return False
    return True


def set_items(env, body):
    for item in split_top(body):
        m = re.fullmatch(r'(\w+)((?::\w+)+)', item.strip())
        if m:
            env[m.group(1)].labels.update(m.group(2).strip(':').split(':'))
            continue
        m = re.fullmatch(r'(\w+)\s*\+=\s*(\{.*\})', item, re.S)
        if m:
            target = env[m.group(1)]
            for k, v in resolve(Parser(m.group(2)).map(), env).items():
                if v is None:
                    target.props.pop(k, None)
                else:
                    target.props[k] = v
            continue
        m = re.fullmatch(r'(\w+)\.(\w+)\s*=\s*(.+)', item, re.S)
        if not m:
            raise Unsupported(f'SET {item[:40]}')
        target = env[m.group(1)]
        p = Parser(m.group(3))
        v = resolve(p.expr(), env)
        p.ws()
        if p.i < len(p.t):
            raise Unsupported(f'SET expression {m.group(3)[:40]}')
        if v is None:
            target.props.pop(m.group(2), None)
        else:
            target.props[m.group(2)] = v


def run_statement(g, stmt):
    cls = clauses(stmt)
    if cls[0][0] == 'CREATE' and re.match(r'(CONSTRAINT|INDEX)\b', cls[0][1]):
        return
    rows = [{}]
    for kw, body in cls:
        if kw == 'UNWIND':
            m = re.fullmatch(r'(.+)\s+AS\s+(\w+)', body, re.S)
            if not m:
                raise Unsupported('UNWIND')
            lit = Parser(m.group(1)).expr()
            rows = [dict(r, **{m.group(2): x}) for r in rows for x in resolve(lit, r)]
        elif kw == 'MATCH':
            for pat in split_top(body):
                parsed = parse_pattern(pat)
                rows = [e for r in rows for e in match(g, r, parsed)]
        elif kw == 'MERGE':
            parsed = parse_pattern(body)
            new_rows = []
            for r in rows:
                if parsed[0] == 'node':
                    spec = parsed[1]
                    n = bind_node(g, spec, r, True)[0]
                    new_rows.append(dict(r, **({spec[0]: n} if spec[0] else {})))
                    continue
                _, a, (rvar, types, rprops), b, direction = parsed
                if direction != 'out' or len(types) != 1:
                    raise Unsupported('MERGE relationship shape')
                sa = bind_node(g, a, r, False)
                sb = bind_node(g, b, r, False)
                if len(sa) != 1 or len(sb) != 1:
                    raise Unsupported('MERGE relationship endpoints must be bound')
                rel = g.merge_rel(types[0], sa[0], sb[0], {k: resolve(v, r) for k, v in rprops.items()})
                new_rows.append(dict(r, **({rvar: rel} if rvar else {})))
            rows = new_rows
        elif kw == 'WHERE':
            rows = [r for r in rows if where(r, body)]
        elif kw == 'SET':
            for r in rows:
                set_items(r, body)
        elif kw == 'WITH' and re.fullmatch(r'\w+(\s*,\s*\w+)*', body):
            keep = [v.strip() for v in body.split(',')]
            rows = [{k: r[k] for k in keep} for r in rows]
        elif kw == 'DELETE':
            doomed = {id(r[v.strip()]) for r in rows for v in body.split(',')}
            g.relationships = [x for x in g.relationships if id(x) not in doomed]
        else:
            raise Unsupported(kw)


def load(files=None):
    g = Graph()
    for f in files or load_order():
        for k, stmt in enumerate(split_statements(open(os.path.join(ROOT, 'schema', f), encoding='utf8').read())):
            # A skipped statement may have applied its first clauses; fixture.py proves that no skipped
            # statement touches what routing reads.
            try:
                run_statement(g, stmt)
            except (Unsupported, KeyError, IndexError, ValueError, TypeError) as e:
                g.unsupported.append((f, k + 1, f'{type(e).__name__}: {e}', stmt))
    return g


if __name__ == '__main__':
    g = load()
    print(f'{len(g.nodes)} nodes, {len(g.relationships)} relationships, {len(g.unsupported)} skipped statements')
    for u in g.unsupported:
        print('  skipped', u[0], u[1], u[2][:60], '|', u[3].split('\n')[0][:80])
