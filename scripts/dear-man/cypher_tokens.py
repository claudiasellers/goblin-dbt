"""Cypher token streams, for proving two schema files run the same statements (scripts/dear-man/build.py --prove).

Comments and whitespace are dropped; a string literal is compared by its value, not its quotes or escapes.
Two files with equal token streams send Neo4j the same statements.
"""
import re

_TOKEN = re.compile(r"""
    (?P<ws>\s+)
  | (?P<line>//[^\n]*)
  | (?P<block>/\*.*?\*/)
  | (?P<str>'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")
  | (?P<num>\d+(?:\.\d+)?)
  | (?P<word>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op><>|<=|>=|\+=|->|<-|\.\.|[^\sA-Za-z0-9_])
""", re.S | re.X)

_ESC = {"n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f", "\\": "\\", "'": "'", '"': '"'}


def unquote(lit):
    body, out, i = lit[1:-1], [], 0
    while i < len(body):
        c = body[i]
        if c == "\\" and i + 1 < len(body):
            out.append(_ESC.get(body[i + 1], "\\" + body[i + 1]))
            i += 2
            continue
        out.append(c)
        i += 1
    return "".join(out)


def tokens(src):
    out, pos = [], 0
    while pos < len(src):
        m = _TOKEN.match(src, pos)
        if not m:
            raise ValueError(f"can't tokenise at {pos}: {src[pos:pos + 40]!r}")
        pos = m.end()
        kind = m.lastgroup
        if kind in ("ws", "line", "block"):
            continue
        text = m.group(kind)
        out.append(("str", unquote(text)) if kind == "str" else (kind, text))
    return out
