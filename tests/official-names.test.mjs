// The admin "Official DBT names" switch: the names file (from the graph), the label rule, the admin gate,
// and the list surfaces that read it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importTs } from "./lib/importTs.mjs";
import { buildToolNames, indexGraph } from "../scripts/content-snapshot/build.mjs";

const { toolLabel, hasOfficialName, isAdmin, parseAdminUids, storageKey, MODULE_CODES } = await importTs("src/lib/officialNames.ts");
const { tools } = await importTs("src/data/tools.ts");

const concepts = (rows) => ({
  scope: "content-only",
  nodes: rows.map((props, i) => ({ elementId: `c${i}`, labels: ["TherapyConcept"], props })),
  relationships: [],
});

test("buildToolNames: TherapyConcept.name by appToolId; a dbt_ concept wins a shared tool, then by id", () => {
  const out = buildToolNames(indexGraph(concepts([
    { id: "urge_surfing", name: "Urge Surfing", appToolId: "urge-surfing" },
    { id: "zz_other", name: "Other", appToolId: "pause" },
    { id: "dbt_stop", name: " STOP ", appToolId: "pause" },
    { id: "dbt_no_tool", name: "No tool" },
    { id: "dbt_no_name", appToolId: "nameless" },
  ])));
  assert.deepEqual(out, { tools: { pause: "STOP", "urge-surfing": "Urge Surfing" } });
});

test("shipped tool-names.json is the schema's concept names (the next graph load rewrites it from Aura)", () => {
  const f = JSON.parse(readFileSync("src/data/content/tool-names.json", "utf8"));
  assert.match(f.source.file, /^(graph-content-only-.*\.json|tests\/fixtures\/recommendation-graph\.json \(from the schema files\))$/);
  const fx = JSON.parse(readFileSync("tests/fixtures/recommendation-graph.json", "utf8"));
  const expected = buildToolNames(indexGraph(concepts(Object.entries(fx.concepts).map(([id, c]) => ({ id, ...c })))));
  assert.deepEqual(f.content, expected);
  // The examples the switch was asked for.
  assert.equal(f.content.tools["urge-surfing"], "Urge Surfing");
  assert.equal(f.content.tools["let-it-be"], "Radical Acceptance");
  assert.equal(f.content.tools["cool-down"], "TIPP");
  assert.equal(f.content.tools.pause, "STOP");
});

test("toolLabel: official name and module code when on; the friendly name when off or unnamed", () => {
  const names = JSON.parse(readFileSync("src/data/content/tool-names.json", "utf8")).content.tools;
  const byId = Object.fromEntries(tools.map((t) => [t.id, t]));
  assert.equal(toolLabel(byId["urge-surfing"], names), "Urge Surfing (DT)");
  assert.equal(toolLabel(byId["check-the-facts"], names), "Check the Facts (ER)");
  assert.equal(toolLabel(byId["dear-man"], names), "DEAR MAN (IE)");
  assert.equal(toolLabel(byId["wise-mind"], names), "Wise Mind (MF)");
  assert.equal(toolLabel(byId["urge-surfing"], null), "Ride it out");
  assert.equal(toolLabel(byId["meet-a-part"], names), "Meet a part");
  assert.equal(hasOfficialName(byId["meet-a-part"], names), false);
  for (const t of tools) assert.ok(MODULE_CODES[t.module], `${t.id}: module ${t.module} has a code`);
});

test("admin gate: the allowlist (comma or space separated), any dev build, nobody signed out", () => {
  const admins = parseAdminUids(" uidA, uidB\nuidC ,");
  assert.deepEqual(admins, ["uidA", "uidB", "uidC"]);
  assert.deepEqual(parseAdminUids(undefined), []);
  assert.equal(isAdmin("uidB", admins), true);
  assert.equal(isAdmin("someoneElse", admins), false);
  assert.equal(isAdmin(null, admins), false);
  assert.equal(isAdmin(null, [], true), true);
  assert.notEqual(storageKey("uidA"), storageKey("uidB"));
});

test("every tool list reads the switch", () => {
  for (const f of [
    "src/components/ToolCard.tsx", "src/pages/Tools.tsx", "src/pages/ToolPage.tsx",
    "src/components/checkin/RecommendationCards.tsx", "src/components/checkin/HelpNowInterim.tsx",
    "src/components/today/TodayCard.tsx", "src/components/insights/ToolEffectiveness.tsx",
    "src/components/insights/FormulationCard.tsx", "src/components/insights/ProactiveAlert.tsx",
  ]) {
    const src = readFileSync(f, "utf8");
    assert.match(src, /useOfficialNames\(\)/, f);
    assert.doesNotMatch(src, /(?<!In the app: )\{tool\??\.name\b/, `${f} renders tool.name directly`);
  }
  assert.match(readFileSync("src/pages/Tools.tsx", "utf8"), /<OfficialNamesToggle \/>/);
});
