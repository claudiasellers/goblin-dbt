// The parts charter's "Never" list (docs/design/parts.md, *Never*), one describe per item. Each opens
// by quoting the item and naming the existing tests that already enforce part of it; the checks here
// are the ones nothing else made. Content comes from the fixture (tests/fixtures/parts-content.json) and
// from every `// @parts-copy-json` row in schema/parts.cypher (drafts included: every user-visible
// string, tests/parts-content.test.mjs "nothing visible escapes the rows"); code from src/ and
// functions/src/. Copy that breaks an item is a finding to report, never to edit here.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { importTs } from "./lib/importTs.mjs";
import { partsCopyFromCypher, RULESET } from "../scripts/voice-lint.mjs";

const read = (f) => readFileSync(f, "utf8");
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
/** Source without comments, so the design notes that name what we never do don't count. */
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const fixture = JSON.parse(read("tests/fixtures/parts-content.json"));
const ROWS = partsCopyFromCypher(read("schema/parts.cypher"));
const PROMPTS = Object.entries(fixture.prompts).map(([id, p]) => ({ id, ...p }));
const OPTIONS = Object.values(fixture.options).flatMap((steps) => Object.values(steps).flat());
const TEXTS = [
  ...ROWS.map((r) => [`${r.id}.${r.field} [${r.kind}]`, r.text]),
  ...PROMPTS.map((p) => [`prompt ${p.id}`, p.copy]),
  ...OPTIONS.map((o) => [`option ${o.id}`, o.label]),
  ...fixture.keepsake.map((k) => [`keepsake ${k.id}`, k.copy]),
  ...fixture.moves.flatMap((m) => ["label", "unblendPhrase", "trailPhrase", "nameHint"].filter((f) => m[f]).map((f) => [`move ${m.id}.${f}`, m[f]])),
];
const hits = (re) => TEXTS.filter(([, t]) => re.test(t)).map(([where, t]) => `${where}: ${t}`);

/** Every parts source file the app or the server runs (the parts surfaces and their pure logic). */
const PARTS_SRC = [
  ...walk("functions/src/parts"),
  "functions/src/safety/partSafetyFlag.ts",
  ...walk("src/components/parts"),
  "src/components/me/PartsOfMe.tsx", "src/components/spine/PartTagRow.tsx", "src/components/spine/PartTagSlot.tsx",
  "src/components/insights/PartsReflect.tsx", "src/pages/tools/MeetAPart.tsx",
  "src/services/parts.ts", "src/services/partsContent.ts", "src/hooks/useUnblendLine.ts",
  ...readdirSync("src/lib").filter((f) => /^(part|meetAPart|angryPart|unblend|oaGoalLine|copeAhead|debriefWho|psAmbivalence|trailOffer|dearManHurt|tagRowOnce)/i.test(f)).map((f) => join("src/lib", f)),
].filter((f) => /\.(ts|tsx)$/.test(f));
const COMPONENTS = PARTS_SRC.filter((f) => f.endsWith(".tsx"));

test("the corpus is all there: rows, prompts, options, keepsakes, moves, and the parts sources", () => {
  assert.ok(ROWS.length > 300 && PROMPTS.length > 100 && OPTIONS.length > 100, `${ROWS.length} rows`);
  assert.ok(PARTS_SRC.length > 40, `${PARTS_SRC.length} files`);
  for (const f of PARTS_SRC) assert.ok(statSync(f).isFile(), f);
});

describe("1. Exile witnessing, do-over, retrieval or unburdening. Legacy or \"unattached\" burdens.", () => {
  // Also: tests/voice-lint-parts.test.mjs "no_role_labels: plain 'burden' passes, role words fail" (exile,
  // unburdening, legacy burden fail in every parts scope) and tests/parts-content.test.mjs "voice contract"
  // (every row is linted). Not a lint rule yet: a new rule needs a witness load for its VoiceRule node.
  const EXILE_WORK = /\b(exiles?|inner child|little one|witness(es|ed|ing)?|go(ing)? back (to|there|in time)|went back|retriev\w*|rescu\w*|heal(s|ed|ing)?|unburden\w*|burdens|legacy|unattached|do-?over|re-?do)\b/i;

  test("the pattern catches the work and spares the fear \"I'd be a burden\"", () => {
    for (const bad of ["Can you witness what it saw?", "Go back to that room", "Let's heal the little one", "Retrieve it from there", "Release its burdens", "a do-over"]) {
      assert.match(bad, EXILE_WORK, bad);
    }
    for (const ok of ["I'd be a burden", "Coming back into the room comes first.", "Help me take a break, then come back"]) assert.doesNotMatch(ok, EXILE_WORK, ok);
  });

  test("no parts line, drafts included, asks to witness, go back, retrieve, rescue, heal or unburden", () => {
    assert.deepEqual(hits(EXILE_WORK), []);
  });

  test("Meet a part has no step for it, and no step id names one", () => {
    const steps = [...read("src/lib/meetAPart.ts").match(/export const MEET_STEPS = \[([^\]]*)\]/)[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
    assert.ok(steps.length > 10);
    const flowSteps = Object.entries(fixture.options).flatMap(([flow, s]) => Object.keys(s).map((k) => `${flow}/${k}`));
    for (const s of [...steps, ...flowSteps, ...PROMPTS.map((p) => `${p.flow}/${p.step}`)]) {
      assert.doesNotMatch(s, /witness|retriev|rescu|unburden|exile|burden|redo|do_?over|heal|past|origin|memory/i, s);
    }
  });
});

describe("2. Questions about the past, or a suggested origin story.", () => {
  // Also: parts.md *Why never* 2 ("the age chip asks for a felt sense ... not a memory"); nothing else
  // pinned it. The age step stays at protector level, in the present: "How old does it seem?".
  const PAST = /\b(when did|first time|back then|how old were you|when you were (little|young|small|a (child|kid))|as a (child|kid)|growing up|childhood|came from|comes from|where (it|this|that|they) (came|comes|started|began)|origins?|remember|memor(y|ies)|in your past|used to happen)\b/i;

  test("the pattern catches origin questions and spares the present", () => {
    for (const bad of ["When did it start?", "Where did this come from? Where it came from matters", "How old were you?", "Do you remember the first time?"]) {
      assert.match(bad, PAST, bad);
    }
    for (const ok of ["How old does it seem?", "Help me start small", "If you start to feel far away, stop any time."]) assert.doesNotMatch(ok, PAST, ok);
  });

  test("no parts line asks about the past or suggests where a part came from", () => {
    assert.deepEqual(hits(PAST), []);
  });

  test("the age step asks how old it seems now, its chips are felt ages, and little goes gentle", () => {
    assert.equal(fixture.prompts.meet_age.copy, "How old does it seem?");
    const ages = fixture.options.meet.age;
    assert.deepEqual(ages.map((o) => o.id).sort(), ["age_cant_tell", "age_little", "age_now", "age_older", "age_school", "age_teen"]);
    for (const o of ages) assert.doesNotMatch(o.label, /\b(was|were|when|ago|years?)\b/i, o.id);
    assert.equal(ages.find((o) => o.id === "age_little").branch, "tender_offer", "a young part is offered the gentle path");
    assert.doesNotMatch(read("functions/src/parts/keepPlan.ts"), /\b(origin|since|startedAt|firstSeen)\w*\s*:/, "a Part stores no origin");
  });
});

describe("3. Visible manager / firefighter / exile labels, archetype names or numbered parts.", () => {
  // Also: tests/voice-lint-parts.test.mjs "severity matrix" (no_role_labels and no_role_manager are errors
  // in all three parts scopes) and tests/parts-content.test.mjs "voice contract" (every row, drafts too, is
  // linted, and nothing visible escapes the rows). Names: tests/parts-of-me.test.mjs "rename" (the
  // person's words only). Here: the components' own strings, numbered names, ids as text.
  const ROLE = /\b(exiles?|firefighters?|managers?|protectors?|unburden\w*|self-energy|inner child|archetypes?|critic|saboteur)\b/i;

  test("both role rules are in the voice contract", () => {
    for (const id of ["no_role_labels", "no_role_manager"]) assert.ok(RULESET.rules.some((r) => r.id === id), id);
  });

  test("no parts component or lib says a role word outside its comments", () => {
    for (const f of PARTS_SRC) {
      if (f.startsWith("functions/")) continue;
      assert.doesNotMatch(code(f), ROLE, f);
    }
  });

  test("no part is given a numbered or default name: the unnamed lines have no number, the server keeps only the person's", () => {
    const unnamed = ROWS.filter((r) => /unnamed|noname/.test(r.id));
    assert.ok(unnamed.length > 0);
    for (const r of unnamed) assert.doesNotMatch(r.text, /\d|#/, r.id);
    for (const m of fixture.moves) if (m.nameHint) assert.doesNotMatch(m.nameHint, /\d|^the [A-Z]/, `${m.id}: a description, never a number or an archetype`);
    for (const f of PARTS_SRC) {
      assert.doesNotMatch(code(f), /[`'"]\s*[Pp]art\s*#?\s*(\$\{|['"`]\s*\+)|[Pp]art\s*#?\d/, `${f}: builds a numbered part name`);
    }
    const keepPlan = read("functions/src/parts/keepPlan.ts");
    assert.match(keepPlan, /export function keptName\(name: string \| null \| undefined, max: number\)/);
    assert.match(read("functions/src/parts/keep.ts"), /const name = keptName\(input\.name, st\.nameMax\);/, "the name is the person's input or none");
  });

  test("ProtectiveMove ids never reach the screen as text", () => {
    for (const f of COMPONENTS) {
      assert.doesNotMatch(code(f), />\s*\{\s*[\w.?]*(\.id|[mM]oveIds?|\bmove|\.moveId)\s*\}\s*</, `${f}: renders an id`);
    }
    for (const m of fixture.moves) assert.ok(m.label && m.label !== m.id, `${m.id} has its own label`);
  });
});

describe("4. Creating a part automatically, or inferring a role.", () => {
  // Also: tests/parts-entry.test.mjs "single writer: only functions/src/parts/keep.ts MERGEs, CREATEs or SETs
  // a :Part"; functions/test/unit/parts.test.cjs "validateKeep: only the session id, the part id and the
  // name; any part field is refused" and "keepPart: parts off, someone else's session, a closed visit".
  test("one path creates a Part: keepPart, from Meet a part's yes; no trail, offer, candidate, tag or check-back reaches it", () => {
    const creates = walk("functions/src").filter((f) => f.endsWith(".ts") && /\bMERGE\s*\(\w*:Part\s*\{/.test(read(f)));
    assert.deepEqual(creates, ["functions/src/parts/keep.ts"]);
    for (const f of walk("functions/src").filter((x) => x.endsWith(".ts") && !/parts\/(keep|index)\.ts$/.test(x))) {
      assert.doesNotMatch(read(f), /\b(keepPartHandler|keepDeps|KEEP_NEW_QUERY|KEEP_REVISIT_QUERY)\b/, `${f} reaches the keep step`);
    }
    const callers = walk("src").filter((f) => /\.(ts|tsx)$/.test(f) && /\bkeepPart\(/.test(read(f)));
    assert.deepEqual(callers.sort(), ["src/pages/tools/MeetAPart.tsx", "src/services/parts.ts"]);
    assert.match(read("src/pages/tools/MeetAPart.tsx"), /const keep = keepRequest\(st, psId, newPartId\);/);
    assert.match(read("src/lib/meetAPartSave.ts"), /if \(s\.kept !== true\) return null;/, "9b's yes, nothing else");
    // Every other yes stops short of a Part: a trail offer's yes opens Meet a part; More than one queues candidates.
    const answer = read("functions/src/parts/offers/answer.ts");
    assert.match(answer, /next: 'meet'/);
    assert.doesNotMatch(answer, /:Part\s*\{/);
  });

  test("no field holds a role: a Part's fields, the trail candidates and the content", () => {
    const fields = [...read("functions/src/parts/keepPlan.ts").match(/export interface PartFields \{([\s\S]*?)\n\}/)[1].matchAll(/^\s*(\w+)\??:/gm)].map((m) => m[1]);
    assert.ok(fields.includes("jobIds"));
    // preferredRoleIds is the would-rather answers ("Tell me when something matters"): a job the person
    // chose for it, never a manager / firefighter / exile type.
    for (const f of fields.filter((x) => x !== "preferredRoleIds")) assert.doesNotMatch(f, /role|type|archetype|manager|firefighter|exile|protector/i, f);
    const keepSet = read("functions/src/parts/keep.ts").match(/ON CREATE SET ([\s\S]*?)\n\s*MERGE \(u\)/)[1];
    assert.doesNotMatch(keepSet.replace("p.kind = 'part'", ""), /\b(role|type|kind|archetype)\b/, "the one kind is the profile item's, 'part'");
    const cand = read("functions/src/parts/trails/types.ts").match(/export interface TrailCandidate \{([\s\S]*?)\n\}/)[1];
    assert.doesNotMatch(cand, /^\s*(role|type|kind|archetype)\w*\??:/m);
    for (const o of OPTIONS) for (const k of Object.keys(o)) assert.doesNotMatch(k, /^(role|archetype|partType)$/, `${o.id}.${k}`);
  });

  test("a move's kind (proactive / reactive) is rule logic only: no code reads it", () => {
    for (const f of [...walk("src"), ...walk("functions/src")].filter((x) => /\.(ts|tsx)$/.test(x))) {
      assert.doesNotMatch(code(f), /['"](proactive|reactive)['"]\s*[)=:]|\.kind\s*===?\s*['"](proactive|reactive|either)['"]/, f);
    }
  });
});

describe("5. Naming a specific part in the moment.", () => {
  // Also: tests/angry-part.test.mjs "parts on, with a name and a hurt: distanced self-talk in the person's
  // name" and "every combination"; tests/oa-goal-line.test.mjs "copy: ... {move} and {goal}, no {hurt}";
  // tests/unblend-lines.test.mjs "unblendLine: the move's phrase". Debrief ("Did {name} show up?"), cope
  // ahead ("If {name} shows up:") and the tag row name a part before or after the moment, never in it.
  const MOMENT = PROMPTS.filter((p) => ["unblend", "oa", "gate", "angry"].includes(p.flow));

  test("in-the-moment lines have no part-name slot; the angry card's {name} is the person's own", () => {
    assert.ok(MOMENT.length > 20);
    for (const p of MOMENT) {
      const slots = [...p.copy.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      if (p.flow === "angry") assert.ok(slots.every((s) => ["name", "matters", "felt"].includes(s)), p.id);
      else assert.ok(slots.every((s) => ["move", "goal"].includes(s)), `${p.id}: ${slots}`);
    }
    assert.match(read("src/pages/tools/InvalidationRecovery.tsx"), /const firstName = useProfileContext\('recovering-from-invalidation'\)\.slices\?\.name\.firstName \?\? null;/);
    assert.match(read("src/pages/tools/InvalidationRecovery.tsx"), /<AngryPartCard [^>]*name=\{firstName\}/);
  });

  test("the moment's hosts never read a part's name", async () => {
    const { PROFILE_NEEDS } = await importTs("functions/src/profile/types.ts");
    assert.ok(!PROFILE_NEEDS["recovering-from-invalidation"].some((s) => /^part/.test(s)), "Recover reads no parts");
    // Do the Opposite on the skill player (ER-B3) reads `parts` for the tag row on its close only ("Was this a part you
    // know?", after the moment, as Check the Facts and Find the feeling do); its in-the-moment lines (the hand-built
    // page's unblend and goal lines) read none, and never partDetail.
    assert.deepEqual([...PROFILE_NEEDS["opposite-action"]], ["parts"]);
    assert.doesNotMatch(code("src/pages/tools/OppositeAction.tsx"), /useProfileContext|slices\??\.parts|partDetail/);
    assert.ok(!JSON.stringify(JSON.parse(read("src/data/content/skills.json")).content.skills.find((x) => x.id === "opposite_action")).includes("{name}"),
      "no step of the skill names a part");
    for (const f of ["src/lib/unblendLine.ts", "src/hooks/useUnblendLine.ts", "src/lib/oaGoalLine.ts", "src/lib/angryPart.ts", "src/lib/angryPartCopy.ts"]) {
      assert.doesNotMatch(code(f), /useProfileContext|slices\??\.parts|partDetail|\.part\.name|partName/, f);
    }
  });
});

describe("6. Parts on check-in results or routing cards.", () => {
  // Also: tests/parts-content.test.mjs "safety pins" (no TherapyConcept and no RECOMMENDED_FOR in
  // parts.cypher); tests/trail-offers.test.mjs "Today shows at most one trail offer" (offers only on Today).
  const PARTS_IMPORT = /from\s+['"][^'"]*(\/parts\b|\/parts\/|[Pp]arts[A-Z]|\/part[A-Z]|meetAPart|angryPart|unblend|trailOffer|oaGoalLine|copeAhead|debriefWho|dearManHurt|psAmbivalence)[^'"]*['"]/;

  test("the result screens, the cards, Help now and the engine import nothing from parts", () => {
    const files = [
      "src/components/checkin/StateResult.tsx", "src/components/checkin/LowEnergyStateResult.tsx",
      "src/components/checkin/RecommendationCards.tsx", "src/components/checkin/HelpNowInterim.tsx", "src/lib/recommendation.ts",
      ...walk("functions/src/recommendation").filter((f) => f.endsWith(".ts")),
      "functions/src/safety/checkinSafetyFlag.ts",
    ];
    for (const f of files) assert.doesNotMatch(read(f), PARTS_IMPORT, f);
  });

  test("Meet a part is never a routable tool", () => {
    for (const f of ["schema/app-tool-ids.cypher", "schema/recommended-for.cypher", "scripts/recommendations/content.py"]) {
      assert.doesNotMatch(read(f), /meet-a-part|meet_a_part/, f);
    }
  });

  test("the witness beat on the result never reads parts", async () => {
    const { PROFILE_NEEDS } = await importTs("functions/src/profile/types.ts");
    assert.ok(!PROFILE_NEEDS.witness.some((s) => /^part/.test(s)), `witness reads ${PROFILE_NEEDS.witness}`);
    assert.ok(!PROFILE_NEEDS.checkin.some((s) => /^part/.test(s)), `checkin reads ${PROFILE_NEEDS.checkin}`);
    for (const f of [...walk("functions/src/witness"), ...walk("src/components/witness"), "src/lib/witness.ts"].filter((x) => /\.(ts|tsx)$/.test(x))) {
      assert.doesNotMatch(read(f), PARTS_IMPORT, f);
    }
  });
});

describe("7. An AI speaking as a part, or as the person's Self.", () => {
  // Also: tests/voice-lint-parts.test.mjs "severity matrix" (voice_distance is an error on parts_prompt:
  // the app's lines never say I / my / me). How the check tells them apart: a row's kind. A prompt is the
  // app (second person); a chip, keepsake ("I can hear both of them") or first_person row is the person's
  // own sentence, which they choose; a voice row is what a part says, offered only as a chip the person
  // picks ("What does it say?"), never as a line the app says.
  test("no parts code calls a model, or anything but its own callables", () => {
    for (const f of PARTS_SRC) {
      assert.doesNotMatch(code(f), /\bfetch\(|XMLHttpRequest|axios|https?:\/\/|anthropic|openai|generativelanguage|vertexai|completions?\(/i, f);
    }
    assert.match(read("src/services/parts.ts"), /httpsCallable/);
  });

  test("the app never speaks as a part or as Self: no prompt in the first person, part voices only as chips", () => {
    assert.ok(RULESET.rules.find((r) => r.id === "voice_distance").severity.parts_prompt === "error");
    for (const r of ROWS.filter((x) => x.kind === "prompt")) assert.doesNotMatch(r.text, /\b(I|I'm|I've|my|me)\b/, `${r.id}.${r.field}`);
    assert.deepEqual(hits(/\bI('m| am) (the|a|your|this) part\b|\b(your|the|my) Self\b|\bas (your )?Self\b|\bSelf (says|speaks|wants)\b/), []);
    const voices = ROWS.filter((r) => r.kind === "voice");
    assert.ok(voices.length > 0);
    const voiceOptions = new Set(OPTIONS.filter((o) => o.kind === "voice").map((o) => o.id));
    for (const r of voices) assert.ok(voiceOptions.has(r.id), `${r.id}: a part's words are a chip the person picks`);
    for (const p of PROMPTS) assert.notEqual(p.copyKind, "voice", p.id);
  });
});

describe("8. Collection mechanics, streaks, \"parts discovered\" counts or shareable cards.", () => {
  // Also: tests/part-stats.test.mjs "Reflect: ... no hard-coded words, no other numbers"; tests/meet-a-part-page.test.mjs
  // "too many parts lately: one line on the first real screen of a new part's visit, never a block".
  test("no parts line counts, collects, unlocks or shares", () => {
    assert.deepEqual(hits(/\b(discover(ed|y)|unlock\w*|collect\w*|streaks?|badges?|share|shareable|progress|score|points|achievements?|level up|\d+ parts?|parts? (made|found|met|so far))\b/i), []);
  });

  test("no parts component shows a count or a share action", () => {
    for (const f of COMPONENTS) {
      const src = code(f);
      assert.doesNotMatch(src, /\{\s*[\w.?]+\.length\s*\}/, `${f}: renders a count`);
      assert.doesNotMatch(src, /navigator\.share|\bshare\w*\s*\(|download=|streak|unlocked|discovered/i, f);
    }
  });

  test("Reflect and Insights never count parts made; too many lately is a guard with no number", () => {
    const reflect = read("functions/src/parts/statsTypes.ts").match(/export interface PartReflect \{([\s\S]*?)\n\}/)[1];
    const fields = [...reflect.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/^\s*(\w+)\??:/gm)].map((m) => m[1]);
    assert.deepEqual(fields, ["id", "name", "firstPlace", "shapeSig", "stats"], "one row per part, no tally");
    for (const f of [...walk("functions/src/insights"), "functions/src/parts/stats.ts", "functions/src/parts/statsQueries.ts"].filter((x) => x.endsWith(".ts"))) {
      assert.doesNotMatch(code(f), /count\(\s*\w*\s*\)\s*AS\s*parts|parts?(Made|Count|Total|Kept)\b|count\(\w*:Part\)/i, f);
    }
    assert.match(read("functions/src/parts/types.ts"), /tooMany\?: true;/, "a flag, never a number");
    const line = ROWS.find((r) => r.id === "aftercare_too_many");
    assert.ok(line);
    assert.doesNotMatch(line.text, /\d|\{/, "no number and no slot for one");
  });
});

describe("9. Parts language by default.", () => {
  // Also: tests/parts-entry.test.mjs "partsEnabled is a setting (off by default)"; functions/test/unit/parts.test.cjs
  // "partsEnabled: false by default", "parts off: both writers refuse", "part writers: parts off is
  // failed-precondition", "getPartsEntry with parts off"; partsOffFollowUps.test.cjs; the surfaces' own
  // gates: tests/part-tag.test.mjs "gate: each condition off", tests/parts-of-me.test.mjs "Me's gate",
  // tests/dear-man-cope-ahead.test.mjs "gate", tests/debrief-who.test.mjs "gate", tests/oa-goal-line.test.mjs
  // "the gate", tests/unblend-lines.test.mjs "the hook", tests/meet-a-part-page.test.mjs "hidden";
  // the angry card's plain wording: tests/angry-part.test.mjs "parts off never says part" and
  // tests/parts-content.test.mjs "the angry-part card ... the plain one never says part".
  // The rule: every writer refuses with parts off (failed-precondition); a reader in READERS_EMPTY returns
  // nothing instead (its every array empty), so a screen simply has no parts section. The list is named
  // here, so a writer can't slip through by returning: every other callable must throw.
  const READERS_EMPTY = ["getReflectTrails", "getDen", "getDenSnapshot", "getPartStory"];
  test("every parts writer refuses with parts off; every reader returns nothing (deleteMyParts excepted; the entry gate answers clear)", () => {
    const index = read("functions/src/parts/index.ts") + read("functions/src/parts/offers/index.ts") + read("functions/src/parts/pulls/index.ts");
    const callables = [...index.matchAll(/export const (\w+) = callable<[\s\S]*?\n\);/g)].map((m) => [m[1], m[0]]);
    const deployed = [...read("functions/src/index.ts").matchAll(/export \{([^}]*)\} from '\.\/parts';/g)]
      .flatMap((m) => m[1].split(",").map((x) => x.trim())).filter((x) => x && x !== "deleteMyParts" && x !== "countMyPartsLines"); // both work with parts off (delete.ts)
    assert.deepEqual(callables.map(([n]) => n).sort(), deployed.sort(), "every deployed parts callable is checked");
    // The part editors (rename, rest, set aside, ...) all open with keep.ts' ownPart, which refuses first.
    const OWN_PART_REFUSES = /async function ownPart\([^)]*\) \{\n\s*const st = await deps\.state\(q\);\n\s*if \(!st\.partsOn\) throw partsOff\(\);/.test(read("functions/src/parts/keep.ts"));
    const sources = walk("functions/src/parts").filter((f) => f.endsWith(".ts")).map(read).join("\n");
    for (const [name, body] of callables) {
      const handler = body.match(/(\w+Handler)\(/)?.[1];
      assert.ok(handler, `${name}: delegates to a handler`);
      const def = sources.match(new RegExp(`export async function ${handler}\\([\\s\\S]*?\\n\\}`))?.[0];
      assert.ok(def, `${name}: ${handler} found`);
      if (name === "getPartsEntry") assert.match(def, /if \(!\(await deps\.partsOn\(\)\)\) return \{ \.\.\.PARTS_OFF_ENTRY/, name);
      else if (READERS_EMPTY.includes(name)) {
        const ret = def.match(/if \(!\w+\.partsOn\) return \{([^}]*)\};/)?.[1];
        assert.ok(ret !== undefined, `${name}: returns nothing with parts off`);
        const fields = ret.split(",").map((x) => x.trim()).filter(Boolean);
        assert.ok(fields.length > 0 && fields.every((f) => /^\w+: \[\]$/.test(f)), `${name}: every array empty with parts off (${ret})`);
        assert.doesNotMatch(def, /\bwrite|MERGE|SET /, `${name}: a reader writes nothing`);
      } else if (/await ownPart\(/.test(def)) assert.ok(OWN_PART_REFUSES, `${name}: ownPart refuses with parts off`);
      else assert.match(def, /if \(!\w+\.partsOn\) throw partsOff\(\);/, `${name}: refuses with parts off`);
    }
    for (const name of READERS_EMPTY) assert.ok(callables.some(([n]) => n === name), `${name} is a parts callable`);
    assert.doesNotMatch(index, /export const deleteMyParts/, "deleteMyParts (works with parts off) lives in delete.ts");
  });

  test("off unless stored true, on the server and in the app", () => {
    assert.match(read("functions/src/account/index.ts"), /partsEnabled: false,/);
    assert.match(read("src/services/neo4j.ts"), /partsEnabled: false,/);
    for (const q of ["parts", "partDetail", "partAnchors"]) {
      assert.match(read("functions/src/profile/slices.ts"), new RegExp(`${q}: \`MATCH \\(u:User \\{id: \\$uid\\}\\) WHERE coalesce\\(u\\.partsEnabled, false\\)`), q);
    }
  });
});
