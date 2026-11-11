# The skill runtime: skills as graph data, one player

Written 4 Nov 2026. Status: **built for Check the Facts** (the first skill on it); Keep your self-respect (`fast`, two skills under one tool id, `docs/design/fast.md`) since 10 Nov. Thread 3 of
[the path forward](https://claude.ai/artifact/QnR4Q9J8HEucUZXsPdq4T2): the DBT catalogue becomes data the
graph holds, one player runs any of it, and every run leaves one record a router can learn from.

The 30 Sep PRD Index already named the pieces: the *InterventionPlayer* (§9: one intervention, a swap,
stop anytime counts, step kinds), the shared primitives that never navigate away from their host, and
`session.record` / `session.close`. This doc is the concrete shape of the first two and the reuse of the
third.

---

## Why

Today every tool is its own page. The workbook's logic ("if the feeling fits, go to Problem Solving; if
it doesn't, act opposite to its urge; if you can't tell, ask wise mind") lives in 13 hand-written step
machines (`copeAheadTool.ts`, `wiseMind.ts`, …). Nothing outside a page can see it: not a router, not
Reflect, not the next tool. Adding a skill means writing a new page, a new machine, a new ext namespace
and a new Cloud Function.

With the runtime, a skill is rows in the graph: its screens, the questions on them, the chips, which
screen comes next under which answers, and where it hands you on. The "go to page 495" jumps are edges
you can query (`(:SkillStep)-[:OFFERS]->(:SkillExit)-[:OPENS]->(:TherapyConcept)`). The player is one
React component that runs whichever skill it's given.

## What it is not

- **Not a form builder.** A step can host a rich experience (a registered embed: Cope Ahead's rehearsal,
  a parts card, a body moment) as easily as chips. Chips are just the first kind built.
- **Not the router.** The router (thread 5) picks *which* skill. This doc only makes sure every run
  records what the router needs.
- **Not a rewrite of the existing tools.** They keep their pages. Each moves onto the runtime when it is
  next reworked, one per PR, behind the same tool id.

---

## The data model

### In the graph (`schema/skills.cypher`, generated from `scripts/skills/`)

```
(:TherapyConcept {appToolId})-[:HAS_SKILL]->(:Skill {id, toolId, version, start, ownMax,
                                                     copyJson, tablesJson, deriveJson, contentVersion})
(:Skill)-[:HAS_STEP {order}]->(:SkillStep {id, skillId, kind, specJson})
(:SkillStep)-[:NEXT {order, whenJson}]->(:SkillStep)          // transitions: first match wins
(:Skill)-[:HAS_EXIT]->(:SkillExit {id, skillId, toolId, queryJson, carry, done})
(:SkillExit)-[:OPENS]->(:TherapyConcept)                       // where a hand-off goes, by appToolId
(:SkillStep)-[:OFFERS {order, whenJson}]->(:SkillExit)         // a hand-off card's offers
(:SkillStep)-[:LINKS {order, field, whenJson}]->(:SkillExit)   // a quiet link under one question
(:Skill)-[:HAS_OPTION {list, order}]->(:SkillOption {id, value, label, propsJson})
```

Clinical content keeps clinical edges as well, so it stays queryable as knowledge and not only as UI:
a Check the Facts story is `(:SkillOption:Interpretation)` hung off its DBT parent with
`(:EmotionRegulationContent)-[:HAS_INTERPRETATION]->`; its other ways to see it are
`(:SkillOption:Alternative)-[:ALTERNATIVE_TO]->(:Interpretation)`; threats are `:ThreatChip`, event kinds
`:FactsEventKind`. The player reads `ALTERNATIVE_TO` for an alternative's story, not a copied field.

Two tables are emotion knowledge the graph already has, so every skill shares them and none copies them:
`parentOf` (grid word → DBT parent, from `HAS_REGULATION_CONTENT`) and `fitsWhen` (parent → its
`EmotionRegulationContent.fitsTheFactsWhen`, unchanged).

**Why JSON on steps.** A step's fields (question, chips source, how many picks, own words, when it shows)
are presentation config that nothing traverses; Neo4j can't store nested maps; and the structure a router
or a review needs (steps, transitions, offers, exits, options) is real nodes and edges. `copyJson` is
linted by the voice gate like every flow document; `specJson` holds no copy, only keys into `copyJson`.

### A skill, as the player sees it (`src/data/skillTypes.ts`)

- **Skill**: `id`, `toolId` (the spine and `tools.ts` id), `version`, `start` (first step), `ownMax`,
  `copy`, `tables` (the skill's own lookups, e.g. DBT parent → story set), `derive`, `steps`, `exits`,
  `options` (by list).
- **Step** = one screen: `kind` (`ask` | `handoff` | `embed`), `title` (copy key, or conditional keys),
  `hint`, `fields`, `slots`, `next` (transitions), and for a hand-off, `lines` and `offers`. An embed or
  hand-off step may carry its own quiet `links` (an ask step's are on its fields).
- **Field** = one question on a screen: `id` (its answer key), `options` (a list from the skill, with a
  `where` filter, optionally grouped per pick of another field, or the grid words), `max` picks (`swap`:
  a tap past the cap replaces the oldest), `own` (the own-words escape hatch, counts as a pick or not),
  `showWhen`, `required`, `list` (a table read to show above the chips, e.g. `fitsWhen`), `askFresh` (the
  answer is also an ask-fresh field on the session, e.g. `fitsFacts`), `links` (quiet exits). `own.seed` makes
  the chips starters for an open own-words box (a tap writes their words in to change; they step aside once the
  words are the person's).
- **Slot** = a registered embed placed in a step (`after: <fieldId>`), with `showWhen` and `record` (the
  name it's recorded under when it shows). Check the Facts' parts line is one.
- **Exit** = where the skill can send you: another tool (`toolId`, `query`, `carry` which answers go
  along as the hand-off's emotions) or `done`. Offer labels come from `src/data/tools.ts`, never the graph.

### Conditions (`src/lib/skillRuntime/conditions.ts`)

One small, total, JSON condition language, used by transitions, `showWhen`, option filters, offers,
links and conditional copy. No `eval`, nothing Turing-complete; the build checks every reference.

| Form | True when |
|---|---|
| `{"set": ref}` | the ref has a value (a pick, own words, a derived value) |
| `{"eq": [ref, v]}` / `{"in": [ref, [v…]]}` | the ref's value is `v` / one of them |
| `{"has": [ref, v]}` | the ref is a list containing `v` (`v` may be a ref) |
| `{"own": fieldId}` | the field has own words |
| `{"some": [fieldId, cond]}` | a picked option of that field satisfies `cond` (`$opt.*` bound to it) |
| `{"all": […]}`, `{"any": […]}`, `{"not": c}` | as named |

Refs: `$a.<field>` (first pick), `$a.<field>.ids` (all picks), `$a.<field>.own`, `$d.<name>` (derived),
`$opt.<prop>` (the option under test), `$ctx.<key>` (context in: one id, no suffix; only keys the skill
`accepts`). Derived values are lookups through tables: `{name: 'parent', from:
'$a.feel', table: 'parentOf'}`, `{name: 'set', from: '$d.parent', table: 'storySetOf', default:
'general'}`, `{name: 'fitsParent', from: '$d.parent', table: 'fitsWhen', keep: 'key'}`.

### The run (`src/lib/skillRuntime/machine.ts`, pure)

State: `{ stepId, path, answers: {fieldId: {ids, own}}, shown: embed records, offered, exitId, out: {stepId:
embed report} }`. Events: `pick`, `own`, `next`, `back`, `exit`, `shown`, `embedDone`. Rules every skill gets
for free:

- A pick past `max` swaps out the oldest (`swap`) or is ignored.
- Picks of a field another field is grouped by (alternatives per story) are pruned when their group goes.
- Answers of fields hidden by `showWhen` are dropped when leaving the step, so nothing hidden is saved.
- `next` follows the first transition whose `when` holds; a step with `required` fields waits for them.
- Answers are asked fresh each visit. Nothing is pre-filled from a past run.

Added by F1 (docs/design/dbt-modules-plan.md §4, 10 Nov 2026):

- **Context in.** A skill declares `accepts` (`urgeId`, `personId`, `frame`, `enterAt`, `situationId`, `partId`,
  `band`, `returnTo`). `contextIn` keeps only those keys, ids only; `returnTo` must be an in-app path and is
  never recorded; `band` must be one of the three bands, never comes from a link (the player strips it from the
  query) and is never recorded (it is ask-fresh). `options.firstFrom: '$ctx.<key>'` puts that option first,
  never selected.
- **Whole-screen embeds.** A step of kind `embed` hands the screen to a registered embed (props, `ctx`, and the
  run's answers as labels, `picked`). Its `onDone` output is cut to what its `EMBED_OUTPUTS` entry declares
  (ids, `ownText`, measures; content.py `EMBEDS` mirrors it), its ids become the `answerAs` answer (ids only),
  and the whole report goes in `out`. Own words from an embed are kept once, in `out`.
- **Embed props** (F2). Each embed declares what it takes in `EMBED_PROPS` (`copy`, `int` with a range, `enum`,
  `field`, `id`; any may be `optional`), mirrored in content.py. `build.py` refuses an undeclared, mistyped or
  missing prop on any embed step or slot, and a `copy` prop must name a key in the skill's copy: the player
  passes its text (`resolveEmbedProps`), so an embed never carries its own words. Embeds also get `answerIds`.
  Shared embeds: `holdRing` (`press` · `timed` · `settle`; `src/lib/holdRing.ts`), `waitLock` (DT-02) and `witness` (the receive beat,
  logged against the visit's session). `dev/skills-review.html` shows every step of every skill and each embed.
- **Crisis slots.** `crisis: [{variant: 'crisis' | 'other_person', when}]` on any step (ask, embed, hand-off)
  shows the compact `CrisisBanner` while `when` holds. An option or embed id marked `danger` needs a slot of its
  variant that holds when it is picked (`build.py` and `tests/skill-contracts.test.mjs`).
- **Exits.** A `planned` exit (a tool not built yet) is recorded in content but never offered or linked. The
  reserved exit `safety_open` (`safety: true`, no tool, at most one per skill) opens `SafetyOpen` over the step,
  which stays mounted underneath, and records `safety_open` in `embedsShown`; it is not a way out.
- **`safetyFirst`** (DT-02): a step's condition; when the run arrives at the step and it holds, the player opens
  `safety.open` over it before it can be answered (once per arrival, never on a resume). `build.py` requires the
  `safety_open` exit and a crisis slot on the step. Hold to wait's *Hurt myself* → `safe` is the first user.
- **Urge ids** (DT-02): an option's `urge` prop names the `ActionUrge` it stands for; the player sets the session's
  `urgeIds` (ask-fresh) from the run's picks. `build.py` checks every `urge` / `forUrges` id is an `ActionUrge`.
- **Counting derive** (`kind: 'count'`: weighted picks summed, the table row with the largest threshold at or
  below the total) and a per-field `own.max` under the skill's `ownMax` (≤ 140).
- **Follow-up on a hand-off** (R5, ER-B1 second PR, agreed with the plan thread). A step's `followUp`
  (`{type, whenFrom, when?}`, a `FollowUpType` from the spine's registry) runs on an ask step's primary tap,
  or on a hand-off. On a hand-off, `whenFrom` names the card's one field, the reminder chips (the type's
  window chips): a list, one pick, optional, never ask-fresh, no own words, links or `showWhen`. The card shows
  them under the line; a tap picks or changes a chip and nothing more; leaving the card by its move or *Done*
  schedules the reminder before anything navigates (`safety_open` isn't leaving). No chip, nothing scheduled.
  Once per step per run, through the same `scheduled` event. Nothing on the card (lines, offers, crisis slots)
  may read the chip, so the card can't change under the person's thumb. `build.py` refuses every other shape
  (`tests/skill-contracts.test.mjs`). An inline run gives back on its hand-off, so it never shows the chips.

### The attempt record (what a router reads)

There is no new label. A run **is** a `ToolSession` (the spine's per-visit log record), with one generic
ext namespace, `ext.run`, registered once in `functions/src/spine/extSchemas.ts` for every skill:

```
ext.run = {
  skillId, versionId,                  // which skill and which version of it ran
  path: [stepId…],                     // the screens it went through, in order (≤ 48)
  answers: [{fieldId, optionIds, valueOwn?}…],  // what was chosen (≤ 32; own words length-checked only)
  ctx: {urgeId?, personId?, frame?, enterAt?, situationId?, partId?},  // context in, ids only (never band, returnTo)
  out: [{embed, stepId, optionIds?, valueOwn?, durationSec?, doneCount?, earlyCount?}…],  // embed reports (≤ 8)
  offeredExitIds: [exitId…],           // what the hand-off offered (the router's counterfactual)
  exitId,                              // where it went: another tool, `done`, or absent (left early)
  embedsShown: [name…],                // e.g. `unblend`: the parts line showed
  handoffs: [P2 hand-offs]             // "This is too much right now", same shape as ext.er.handoffs
}
```

The spine already records the rest of what a router needs: `toolId`, `entry` (tools list, check-in,
hand-off, Today), `checkInId` / `hostSessionId` (where it came from), `emotionIds`, `status`
(completed / exited early / abandoned), `exitStep`, `durationSec`, and the close answer (`thenVsNow` for
regulation skills: *did it help*). The next tool's session carries this one as its `hostSessionId`, so a
chain (Check the Facts → Do the Opposite → better) is a path in the graph. One skill-specific answer is
promoted to an ask-fresh field when the skill says so (`askFresh`), so aggregates don't parse ext:
`fitsFacts` for Check the Facts.

**Why not a `SkillRun` label.** A second record per visit would split "what ran" from "did it help" and
every reader (Insights, Today, Reflect, export, retention) would have to join them. The ToolSession is
already the per-visit log record with the close on it; `ext.run` is the generic detail.

**What a router can ask of it** (thread 5, not built): for this person, for this word or pattern, which
skill runs ended *better*; which exits from a skill led to a *better* close downstream; which offers are
shown and never taken. All of it is `ToolSession` + `ext.run` + the `hostSessionId` chain, no free text.

---

## The player (`src/components/skillPlayer/`)

`SkillPlayer` takes a skill id, loads `skills.json` (generated from the graph, shipped with the app like
every other content file), and runs it inside the page's `ToolSessionProvider`:

- **Screens.** Each step renders its title (focus lands on it), hint, fields (chips with `aria-pressed`,
  44 px targets, own words ≤ `ownMax`, never linted), slots, and *Next*. A hand-off step renders one card:
  the line, its reminder chips if it has a follow-up, the offers as buttons named from `tools.ts` (first
  primary), and a quiet *Done*.
- **Safety and overwhelm, preserved.** `TooMuchLink` (P2) sits under every screen, as the rules require
  of a tool that doesn't gate on the band; its hand-offs are recorded in `ext.run.handoffs`. The player
  never adds a band gate or the capacity question (out since 30 Sep). A skill whose content can carry
  danger declares a `CrisisBanner` slot the same way (Cope Ahead's pattern): Check the Facts v1.1's
  camera chips for danger from a person (`other_person`), It isn't working's *Nothing will ever help me*
  (`crisis`). When CORE-01's safety route ships, it becomes a slot the player shows on any skill.
- **The session.** Every state change writes `setStep` (the step id), `setExt({run})`, `setEmotionIds`
  (the fields the skill marks as the feeling) and the ask-fresh field. Reaching the hand-off marks the
  visit complete.
- **The close before leaving.** Taking an offer or *Done* asks the tool's close question first
  (`SessionClose`, so *regulation_down* for Check the Facts), then leaves through `linkTo`, carrying the
  exit's emotions and query, so the next tool's session is linked to this one.
- **Embeds.** `src/components/skillPlayer/embeds.ts` is the registry: a name → a component that gets
  the run's context and reports what it showed or returned. A step of kind `embed` hands the whole screen
  to one (its output becomes the step's answers); a slot places one inside a step.

## Check the Facts on it

`scripts/skills/check_the_facts.py` is the whole skill: seven screens (feel, event, story, alt, threat,
fits, next), the copy from `check-the-facts.md`, the stories, alternatives, threats and event kinds, the
transitions (screen 5 only for the fear, anger and shame sets or a story that predicts), and the hand-off
table. `src/pages/tools/CheckTheFacts.tsx` is one line: `<SkillPlayer skillId="check_the_facts" />`.

Differences from the hand-built contract in `check-the-facts-handover.md`, all deliberate:

- **`ext.run` instead of `ext.cf`.** Same information (emotion, event kind and own words, stories,
  alternatives, threat, likely, getting through, hand-off, unblend shown), in the generic shape.
- **No `checkFactsTool.ts` / `checkFactsHandoff.ts` / screen components.** Their rules are rows: the
  machine, `storySet`, `showsThreat`, `threatsFor` and `handoffFor` are conditions in the skill, pinned by
  `tests/skill-check-the-facts.test.mjs` against the handover's tables.
- **`getSkillContent` instead of `getCheckFactsContent`**, and `skills.json` instead of
  `check-the-facts.json`: one callable and one file for every skill.
- **There was no old page to keep.** The handover's build never started (no Check the Facts code existed
  on any branch), so parity is against the spec and the handover's contract, test by test.

**v1.1 (10 Nov 2026, ER-B1 first PR; PRD ER-02 "Safety rules" and verdict table).** Built: the camera chips
*Someone threatened me*, *Someone hurt me*, *I'm not safe with them* (`danger: 'other'`) show the `other_person`
crisis slot and skip screens 3–5 to a `safe` hand-off ("Your read of danger is the one that counts here"), Done
only; camera own words get a quiet *Talk to someone now* (`safety_open`), since own words are never read; the
wave (`mindfulness-emotions`) and Let it be (`let-it-be`) are planned exits on the verdict card. Departures:
- The PRD's "→ CORE safety resources / OA support copy" is the `other_person` slot plus the `safe` card; the
  OA support copy isn't built, and the full safety route waits for CORE-01.
- `Person.safe = false` (IE) skipping screens 3–5 waits for IE-03 and the safety batch.
- "Fits, can be changed" and "fits, can't be changed" are still one `fits` answer, and "the wave if there's no
  urge" is unconditional on *doesn't fit*. **Before the planned exits flip** (ER-B5, DT-B4), the flip PR adds
  the changeable split (or another condition), or *fits* would offer four moves (Problem Solve, DEAR MAN, the
  wave, Let it be) instead of one plus a swap.
- **v1.2** (ER-B1 second PR): *I'm not sure* goes by a `missing` step first: one fact to find out (*Ask them ·
  Wait a while and see · Look into it · Ask someone I trust*, or own words up to 60 characters, which keep the
  worst-case record under 4 KB) and *Want me to ask later if you found out?* (*Tonight · Tomorrow · Later this
  week*). A chip schedules `check_fact` ("Did you find out?") on Next. Both fields are optional. The fact's
  own words get the same quiet *Talk to someone now* as the camera's. Departures from the PRD: its other move
  for *still don't know*, *Park it*, waits for DT/MF's postponement skill; the `check_fact` answers resolve in
  place, where the PRD sends *didn't fit* on to Do the Opposite and *fit* to Problem Solve (an answer that opens
  a tool needs a Today card that can link; tracked for ER-B3).
- Not built: the **loop guard** ("you've checked this twice today") is an aggregate over past runs, which a
  live flow never reads (data layers); it waits for a server-side read the router or Today can own. The
  **inline mini-card** moves to ER-B3, with its first host (Do the Opposite's *clarify*): an inline run gives
  back as soon as it reaches a hand-off, so a danger chip would return to the host without the `safe` card's
  line, and that needs deciding with a real host, not ahead of one.
- The `safe` card is `noClose`: leaving it closes the visit without the close question.

## Moving the next skill

1. Write `scripts/skills/<skill>.py` (copy `check_the_facts.py`) and add it to `SKILLS` in
   `scripts/skills/content.py`. Run `build.py` and `fixture.py`; copy the fixture into `skills.json`
   (or load the graph, which refreshes it).
2. Anything the screens need that chips, own words, lists and hand-offs can't do becomes a registered
   embed: wrap the existing component (Cope Ahead's `Rehearse`, `PartFigure`, Cool Down's timer) so it
   takes the run's context and returns an output. The embed is code; where it sits and when it shows is data.
3. Point the tool's page at `SkillPlayer`, declare its close in `functions/src/spine/tools.ts` and
   `src/lib/spine/close.ts` if new, and delete its hand-built machine once its tests pass on the skill.
4. Its old ext namespace stays readable (old sessions keep it); new sessions write `ext.run`.

Good next candidates, in order: Problem Solve (already wants a save and a follow-up), Pause / *Hold to
wait* (DT-02), the safety route (CORE-01, the plan's #1), then Do the Opposite's flow v3.
