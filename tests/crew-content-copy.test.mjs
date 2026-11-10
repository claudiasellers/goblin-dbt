// The Slack crew's own content-only copy of the graph (scripts/crew/load-content-copy.mjs;
// docs/design/user-profile.md §8 #2): never people's data, never the production database.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertCrewExport, assertNotProduction, hostOf, nodeBatches, relBatches, USER_LABELS } from "../scripts/crew/load-content-copy.mjs";

const node = (id, labels, props = {}) => ({ elementId: id, labels, props: { id, ...props } });
const rel = (type, start, end, props = {}) => ({ elementId: `${type}:${start}:${end}`, type, start, end, props });

test("only a content-only export with no user data and no dangling edges loads", () => {
  const base = { scope: "content-only", nodes: [node("calm", ["Emotion"]), node("fear", ["Emotion"])], relationships: [rel("RELATED_TO", "calm", "fear")] };
  assert.doesNotThrow(() => assertCrewExport(base));
  for (const scope of ["all", "no-profile", undefined]) assert.throws(() => assertCrewExport({ ...base, scope }), /--content-only/);
  for (const label of USER_LABELS) {
    assert.throws(() => assertCrewExport({ ...base, nodes: [...base.nodes, node("x", ["CheckIn", label])] }), /user-data/, label);
  }
  assert.throws(() => assertCrewExport({ ...base, relationships: [rel("RELATED_TO", "calm", "gone")] }), /doesn't contain/);
});

test("the refused labels are the content snapshot's, and cover every user-data layer", () => {
  assert.match(readFileSync("scripts/crew/load-content-copy.mjs", "utf8"), /from '\.\.\/content-snapshot\/build\.mjs'/);
  for (const l of ["User", "UserData", "LogRecord", "ProfileItem", "System"]) assert.ok(USER_LABELS.includes(l), l);
});

test("the production database is refused whatever the URI scheme", () => {
  assert.equal(hostOf("neo4j+s://abc.databases.neo4j.io"), "abc.databases.neo4j.io");
  assert.equal(hostOf("bolt://ABC.databases.neo4j.io:7687/"), "abc.databases.neo4j.io:7687");
  assert.throws(() => assertNotProduction(undefined, "neo4j+s://p.io"), /CREW_NEO4J_URI/);
  assert.throws(() => assertNotProduction("neo4j://P.io/", "neo4j+s://p.io"), /production/);
  assert.doesNotThrow(() => assertNotProduction("neo4j+s://crew.io", "neo4j+s://p.io"));
  assert.doesNotThrow(() => assertNotProduction("neo4j+s://crew.io", undefined));
});

test("batches group by label set and type, and refuse anything that isn't a plain name", () => {
  const b = nodeBatches([node("a", ["Emotion"]), node("b", ["Emotion"]), node("c", ["TherapyConcept", "Concept"])]);
  assert.deepEqual(b.map((x) => [x.labels, x.rows.length]), [[":Emotion", 2], [":Concept:TherapyConcept", 1]]);
  assert.throws(() => nodeBatches([node("a", ["Emotion) DETACH DELETE (m"])]), /Unexpected label/);
  const r = relBatches([rel("FELT_AS", "a", "b"), rel("FELT_AS", "a", "c"), rel("RELATED_TO", "a", "b")]);
  assert.deepEqual(r.map((x) => [x.type, x.rows.length]), [["FELT_AS", 2], ["RELATED_TO", 1]]);
  assert.throws(() => relBatches([rel("X]->() DELETE (", "a", "b")]), /Unexpected relationship/);
});
