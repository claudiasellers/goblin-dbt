// Witness line report (E3 §A5.2.2): how each served line lands, across users. Read-only; run in
// Aura Workspace or with `node scripts/load-graph.mjs --file scripts/witness/report.cypher`.
// Retirement is a human decision: a line under 30% landed after 20+ answers is a candidate; set
// its status to "retired" in scripts/witness/content.py (never delete it: SHOWED_LINE points at it).
MATCH (h)-[s:SHOWED_LINE]->(l:ValidationLine)
WHERE h:CheckIn OR h:ToolSession
WITH l, count(s) AS serves, count(s.landed) AS answers,
     sum(CASE WHEN s.landed = 'yes' THEN 1 ELSE 0 END) AS yes,
     sum(CASE WHEN s.landed = 'sort_of' THEN 1 ELSE 0 END) AS sortOf,
     sum(CASE WHEN coalesce(s.skipped, false) OR coalesce(s.noneFit, false) THEN 1 ELSE 0 END) AS passed
RETURN l.id AS line, l.level AS level, l.status AS status, serves, answers, yes, sortOf, passed,
       CASE WHEN answers = 0 THEN null ELSE round(100.0 * yes / answers) END AS landedPct,
       answers >= 20 AND 1.0 * yes / answers < 0.3 AS retireCandidate
ORDER BY retireCandidate DESC, landedPct ASC, serves DESC;
