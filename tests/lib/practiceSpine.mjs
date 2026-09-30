// Parse schema/practice-spine.cypher (PR-S2) for tests.
import { readFileSync } from "node:fs";
import { splitStatements } from "../../scripts/load-graph.mjs";

const cypher = () => readFileSync("schema/practice-spine.cypher", "utf8");

/** FollowUpType rows as {id, enabled, reserved, mode, tier, content, s}. */
export function followUpTypes(src = cypher()) {
  return splitStatements(src).filter((s) => s.startsWith("MERGE (t:FollowUpType")).map((s) => {
    const id = s.match(/\{id: "([a-z_]+)"\}/)[1];
    const content = JSON.parse(JSON.parse(s.match(/t\.contentJson = (".*");?$/s)[1]));
    const flag = (k) => new RegExp(`t\\.${k} = true`).test(s);
    return { id, enabled: flag("enabled"), reserved: flag("reserved"), mode: s.match(/t\.resolveMode = "(\w+)"/)[1],
      tier: s.match(/t\.hierarchyTier = "(\w+)"/)[1], content, s };
  });
}

/** The SessionCloseFlow content. */
export function closeFlow(src = cypher()) {
  const s = splitStatements(src).find((x) => x.startsWith("MERGE (f:SessionCloseFlow"));
  return JSON.parse(JSON.parse(s.match(/f\.contentJson = (".*")$/s)[1]));
}
