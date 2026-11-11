// PR-P2 (D-10): the Me surface replaces "Profile Settings"; the unused Goals module is gone.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { splitStatements } from "../scripts/load-graph.mjs";

const read = (f) => readFileSync(f, "utf8");

test("nav says Me; the page leads with Me and keeps settings below", () => {
  const nav = read("src/components/Sidebar.tsx");
  assert.doesNotMatch(nav, />Profile</);
  assert.equal((nav.match(/>Me</g) ?? []).length, 2, "desktop + mobile");
  const page = read("src/pages/Profile.tsx");
  assert.ok(page.indexOf("<MeSection />") < page.indexOf("<BasicInfoSection"), "Me first, then settings");
  assert.match(page, /title="Reminders"/);
});

test("Goals and focus categories are gone everywhere (no reader ever existed)", () => {
  for (const f of ["src/pages/Profile.tsx", "src/services/neo4j.ts"]) {
    assert.doesNotMatch(read(f), /GoalsSection|dailyCheckInGoal|weeklyToolGoal|focusCategories/, f);
  }
  const acct = read("functions/src/account/index.ts");
  const whitelist = acct.slice(acct.indexOf("const allowedFields"), acct.indexOf("];", acct.indexOf("const allowedFields")));
  assert.doesNotMatch(whitelist, /dailyCheckInGoal|weeklyToolGoal|focusCategories/);
  const stmts = splitStatements(read("schema/migrations/2026-10-remove-goal-fields.cypher"));
  assert.equal(stmts.length, 1);
  assert.match(stmts[0], /WHERE u\.dailyCheckInGoal IS NOT NULL OR[\s\S]*REMOVE u\.dailyCheckInGoal, u\.weeklyToolGoal, u\.focusCategories/);
});

test("the localStorage settings profile never carries profile-layer data", () => {
  const svc = read("src/services/neo4j.ts");
  const type = svc.slice(svc.indexOf("export interface UserProfile {"), svc.indexOf("}", svc.indexOf("export interface UserProfile {")));
  for (const k of ["quietHours", "patterns", "ownLines", "people", "bodyFlags", "profileVersion"]) assert.doesNotMatch(type, new RegExp(`\\b${k}\\b`), k);
});

test("Me: Phase A areas; stale items first; set aside is restorable, never a delete; offers answered, not promoted", () => {
  const me = read("src/components/me/MeSection.tsx");
  assert.match(me, /PHASE_A_AREAS: ProfileAreaId\[\] = \['about_me', 'my_body', 'my_words', 'my_patterns'\]/);
  assert.match(me, /A few things to check/);
  // My plans (ER-15's kept nightmare) shows once it holds something, so a kept version can be set aside.
  assert.match(me, /\[\.\.\.PHASE_A_AREAS, 'my_people', 'my_plans'/);
  assert.match(me, /if \(a\.id === 'my_plans' \|\| a\.id === 'my_people'\) return a\.items\.length > 0;/);
  assert.match(me, /restoreProfileItem/);
  assert.doesNotMatch(me, /delete/i);
  // "A few things to check" gathers only from the areas Me renders (a kept part's area isn't one yet).
  assert.match(me, /const stale = areas\.flatMap\(\(a\) => a\.items\)/);
  assert.doesNotMatch(me, /me\.areas\.flatMap/);
  const still = read("src/components/me/StillTrue.tsx");
  assert.match(still, /if \(meta\.status === 'set_aside'\) return null;/, "resting still gets its check-back");
  assert.match(read("src/services/profile.ts"), /export type MeItemLabel = 'ProfileFact' \| 'MyPattern' \| 'OwnLine' \| 'Part' \| 'Person';/);
  for (const label of ["Yes", "Not any more", "Change"]) assert.match(still, new RegExp(`>\\s*${label}\\s*<`));
  assert.match(read("src/components/me/PatternOfferCard.tsx"), /answerPatternOffer\(id, a\)/);
  assert.match(read("src/components/today/TodayStack.tsx"), /item\.kind === 'pattern_offer'/);
});

test("the positive_state stub cleanup only ever removes a bare stub (rehearsal finding)", () => {
  const stmts = splitStatements(read("schema/migrations/2026-10-remove-positive-state-stub.cypher"));
  assert.equal(stmts.length, 1);
  const s = stmts[0];
  assert.match(s, /MATCH \(p:ActivationPattern \{id: 'positive_state'\}\)/);
  assert.match(s, /keys\(p\) = \['id'\]/, "only a node with no property but id");
  assert.match(s, /type\(r\) = 'MATCHED_PATTERN' AND startNode\(r\):CheckIn AND endNode\(r\) = p/, "only while its only edges are check-in links");
  // No schema file makes positive_state a pattern, and the check-in writer no longer MERGEs patterns.
  for (const f of readdirSync("schema").filter((n) => n.endsWith(".cypher"))) assert.doesNotMatch(read(`schema/${f}`), /positive_state/, f);
  assert.doesNotMatch(read("functions/src/checkin/index.ts"), /MERGE \(ap:ActivationPattern/);
});
