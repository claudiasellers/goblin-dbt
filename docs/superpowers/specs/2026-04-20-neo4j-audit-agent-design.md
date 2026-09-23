# Neo4j Audit Agent — Phase 1: Data Integrity

## Context

The Neo4j knowledge graph is the brain of Goblin DBT — it encodes emotions, brain structures, activation patterns, therapy concepts, and tools plus the relationships that power recommendations. As schema files grow and content is authored incrementally, subtle data integrity issues accumulate: orphaned nodes, missing properties, dangling references. These defects degrade recommendation quality silently.

We want a Claude Code subagent that can be invoked on demand to audit the graph for data integrity problems using the Neo4j MCP server. This is phase 1 of a multi-phase audit capability (later phases: clinical content quality, schema drift, coverage gaps).

## Goal

A single Claude Code subagent, invocable on demand, that runs a fixed set of data integrity checks against the live Neo4j database via `mcp__neo4j__*` tools and returns a structured, actionable report.

## Scope — Phase 1 checks

1. **Orphaned nodes** — nodes with zero relationships
2. **Duplicate IDs** — same `id` property on multiple nodes sharing a label
3. **Missing required properties** — per-label required property list (e.g., all nodes require `id`; `Emotion` requires `dbtParent`)
4. **Invalid enum values** — evidence grades outside `{Strong, Moderate, Preliminary}`; activation pattern IDs outside the known 8
5. **Broken expected links** — every `Emotion` has ≥1 `FELT_AS`; every `ActivationPattern` connects to `BrainStructure` and recommends ≥1 tool; every DBT parent `Emotion` has `HAS_REGULATION_CONTENT`
6. **Dangling references** — property values that look like node references but don't resolve (e.g., `Emotion.dbtParent` pointing at a non-existent emotion ID)

Out of scope for phase 1: naming-convention linting, schema-drift detection, clinical content quality, coverage gaps.

## Design

### Agent definition

A project-local Claude Code subagent at `.claude/agents/neo4j-auditor.md` with:

- **name**: `neo4j-auditor`
- **description**: triggers when the user asks to audit / check integrity of / validate the Neo4j graph
- **tools** (read-only only): `mcp__neo4j__get-schema`, `mcp__neo4j__read-cypher`. Explicitly NOT `mcp__neo4j__write-cypher`.
- **system prompt**: contains the six checks, the Cypher for each, and the reporting format

### Execution flow

1. User asks: "audit the neo4j graph" (or similar phrasing).
2. Main Claude dispatches the `neo4j-auditor` subagent via the Agent tool.
3. Subagent runs `get-schema` first to confirm labels and relationship types present.
4. Subagent runs one `read-cypher` query per check (≥6 queries), collecting results.
5. Subagent returns a single structured markdown report grouped by check, listing offending node IDs/relationship details.

### Report format

```
# Neo4j Data Integrity Audit — <date>

## Summary
- Total issues: N
- By check: 1:N  2:N  3:N  4:N  5:N  6:N

## 1. Orphaned nodes (N found)
- `(:Label {id: "foo"})` — no relationships
- ...

## 2. Duplicate IDs (N found)
...

(one section per check; empty sections say "✓ No issues")
```

### Representative queries

Finalized when the agent file is authored. Shapes:

- **Orphans**: `MATCH (n) WHERE NOT (n)--() RETURN labels(n), n.id`
- **Duplicate IDs**: `MATCH (n) WITH labels(n)[0] AS lbl, n.id AS id, count(*) AS c WHERE c > 1 RETURN lbl, id, c`
- **Missing `id`**: `MATCH (n) WHERE n.id IS NULL RETURN labels(n), elementId(n)`
- **Missing `Emotion.dbtParent`**: `MATCH (e:Emotion) WHERE e.dbtParent IS NULL RETURN e.id`
- **Invalid evidence grades**: `MATCH ()-[r]->() WHERE r.evidence IS NOT NULL AND NOT r.evidence IN ['Strong','Moderate','Preliminary'] RETURN type(r), r.evidence, count(*)`
- **Invalid activation pattern IDs**: compare against the 8 known IDs in CLAUDE.md
- **Emotions missing `FELT_AS`**: `MATCH (e:Emotion) WHERE NOT (e)-[:FELT_AS]->() RETURN e.id`
- **ActivationPatterns missing brain-structure / tool links**: two queries
- **DBT parents missing regulation content**: `MATCH (e:Emotion) WHERE e.id IN ['fear','anger','disgust','envy','jealousy','love','sadness','shame','guilt'] AND NOT (e)-[:HAS_REGULATION_CONTENT]->() RETURN e.id`
- **Dangling `dbtParent`**: `MATCH (e:Emotion) WHERE e.dbtParent IS NOT NULL AND NOT EXISTS { MATCH (p:Emotion {id: e.dbtParent}) } RETURN e.id, e.dbtParent`

## Files

- **New**: `.claude/agents/neo4j-auditor.md`

No code, no Cloud Functions, no schema changes.

## Verification

1. Open a new Claude Code session in this repo.
2. Ask: "audit the neo4j graph for integrity issues."
3. Confirm the `neo4j-auditor` subagent is dispatched.
4. Confirm it runs `get-schema` + ≥6 `read-cypher` calls and does NOT attempt any `write-cypher`.
5. Confirm the returned report has all six sections with either findings or "✓ No issues".
6. Spot-check one finding manually via the Neo4j MCP to verify it's real.

## Future phases (not built now)

- Phase 2: clinical content quality (outdated language, missing narratives)
- Phase 3: schema drift (DB state vs `schema/*.cypher`)
- Phase 4: coverage gaps (under-connected nodes)
