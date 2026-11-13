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

Two more since ER-10 (Know this feeling, [`emotion-guide.md`](emotion-guide.md)): `feelingOf` (feeling guide → its
card row: `label`, `functionLine`, `prompts`, `urges`, `body`, `ladder`) and `feelingGuideOf` (grid word → its
guide: through its DBT parent's `GUIDES` edge, or `IN_GUIDE` for the happiness words, which have no parent).
`feelingOf`'s urges are the parent's emotion `ActionUrge`s only (never the behaviour urges, never a held one,
three at most); its body places are only signed-off `FELT_AS` rows of the guide's `BodyMap`, through
`placesFromFelt`, three at most. `functions/src/skills/feelingOf.ts` is the one shaping, used by
`getSkillContent` and the snapshot build; `scripts/skills/graph_tables.py` mirrors it without a database.

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
- **Slot** = a registered embed placed in an ask step, under one of its fields (`after: <fieldId>`) or under its
  title, above every field (`after: '$title'`, ER-B2: Cope Ahead's live plan sentence, its keepsake paper, and its
  parts step's question as a `partsLine` with `as: heading`), with `showWhen` and `record` (the name it's recorded
  under when it shows). Check the Facts' parts line is one.
- **Exit** = where the skill can send you: another tool (`toolId`, `query`, `carry` which answers go
  along as the hand-off's emotions) or `done`. Offer labels come from `src/data/tools.ts`, never the graph, unless the exit carries `label` (a copy key of the skill, DT-03: two exits into the same tool need their own names, *Open my kit* / *Make it yours*).

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
'general'}`, `{name: 'fitsParent', from: '$d.parent', table: 'fitsWhen', keep: 'key'}`. A derive on
`feelingOf` may take one `field` of the row (`{name: 'ladder', from: '$d.guide', table: 'feelingOf', field:
'ladder'}`); `build.py` allows `field` on that table only.

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
  query) and is never recorded (it is ask-fresh). `options.firstFrom: '$ctx.<key>'` (or a derived
  `'$d.<name>'`, e.g. a frame looked up through a table, or a profile slice `'$p.<slice>'` that holds one option id,
  e.g. Sleep reset's kept wake time) puts that option first, never selected.
- **Whole-screen embeds.** A step of kind `embed` hands the screen to a registered embed (props, `ctx`, and the
  run's answers as labels, `picked`). Its `onDone` output is cut to what its `EMBED_OUTPUTS` entry declares
  (ids, `ownText`, measures; content.py `EMBEDS` mirrors it), its ids become the `answerAs` answer (ids only),
  and the whole report goes in `out`. Own words from an embed are kept once, in `out`.
- **Embed props** (F2). Each embed declares what it takes in `EMBED_PROPS` (`copy`, `int` with a range, `enum`,
  `field`, `id`, and since ER-10 `row`: a ref whose value keys a shared table, the player handing the embed that
  table's row, or no prop when nothing matches; any may be `optional`), mirrored in content.py. `build.py` refuses an undeclared, mistyped or
  missing prop on any embed step or slot, and a `copy` prop must name a key in the skill's copy: the player
  passes its text (`resolveEmbedProps`), so an embed never carries its own words. Embeds also get `answerIds`.
  Shared embeds: `holdRing` (`press` · `timed` · `settle`; `src/lib/holdRing.ts`), `waitLock` (DT-02), `prosConsCard` / `prosConsReplay` (DT-10) and `witness` (the receive beat,
  logged against the visit's session). `dev/skills-review.html` shows every step of every skill and each embed.
- **Crisis slots.** `crisis: [{variant: 'crisis' | 'other_person', when}]` on any step (ask, embed, hand-off)
  shows the compact `CrisisBanner` while `when` holds. An option or embed id marked `danger` needs a slot of its
  variant that holds when it is picked (`build.py` and `tests/skill-contracts.test.mjs`).
- **Exits.** A `planned` exit (a tool not built yet) is recorded in content but never offered or linked. The
  reserved exit `safety_open` (`safety: true`, no tool, at most one per skill) opens `SafetyOpen` over the step,
  which stays mounted underneath, and records `safety_open` in `embedsShown`; it is not a way out.
- **`safetyFirst`** (DT-02): a step's condition; when the run arrives at the step and it holds, the player opens
  `safety.open` over it before it can be answered (once per arrival, a resumed run landing on it included). `build.py` requires the
  `safety_open` exit and a crisis slot on the step. Hold to wait's *Hurt myself* → `safe` is the first user.
- **Practice and `noClose`** (DT-02): a whole-screen embed's output other than `skipped` marks the session
  practiced; leaving a `noClose` card also dismisses Today's outcome card for the session (`answerToolOutcome`
  `dismissed`), so the question it didn't ask isn't asked later.
- **Done as the button** (DT-02): a hand-off card with nothing to offer shows Done as its primary button, not a
  quiet link (Gate 2: easy to miss when flooded).
- **Urge ids** (DT-02): an option's `urge` prop names the `ActionUrge` it stands for; the player sets the session's
  `urgeIds` (ask-fresh) from the run's picks. `build.py` checks every `urge` / `forUrges` id is an `ActionUrge`.
- **Embeds read the tool's profile slices** (DT-10): `EmbedProps.profile` is the same `$p.*` the conditions read
  (PROFILE_NEEDS, read-only, null while loading). Hold to wait's `prosConsReplay` shows the card kept for the pull.
- **A planned exit can wait for a frame** (DT-10): an exit to a built skill stays planned while it asks for a
  `frame` the skill doesn't accept (`build.py`, `tests/skill-contracts.test.mjs`); it is never offered. Ending's
  *Weigh it up* → `pros-cons` `{frame: 'stay_or_end'}` is the first.
- **The close, asked in the flow** (DT-01): a field with `askFresh: 'thenVsNow'` (one required pick of the spine's
  `worse` · `same` · `better` · `much_better`, nothing typed; `build.py` refuses any other shape) is the close, asked
  where the flow needs it, because what comes next depends on it (First, the body's *Quieter?* leads to the fork, a
  swap or lowering the demand). The latest answered one is the session's `thenVsNow` (ask-fresh, sent with whichever
  close happens, `setThenVsNow`), and leaving asks no close question after it. The direction is the tool's close
  kind's (the server derives `thenVsNowDir`), so the copy may word it for the state while the ids stay the spine's.
- **The `medical` crisis slot** (DT-01): `crisis: [{variant: 'medical'}]` and `danger: 'medical'` show the emergency
  number (chest pain, fainting, trouble breathing), never a crisis line; `CrisisBanner` holds the numbers.
- **An embed step's `hint`** (DT-01) shows under its title, as on an ask step. Before, embed steps dropped it, and
  an embed's own `hint` prop is for a screen reader only (First, the body's press: *Keep a thumb on the circle*).
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

- **A step only a reopened run starts on** (`reopens: {after}`, R9, ER-12; agreed with the plan thread).
  `?run=<id>&at=<step>` reopens a run at a step its path reached. A `reopens` step is the other case: no step leads to
  it and it is never the start, so a first visit never sees it. It holds only for a run whose path reached `after`
  (the step that made the plan it asks about); any other run doesn't reopen, so the page starts a whole first visit.
  Reopened there, the run comes back after its whole recorded path with every answer but the ask-fresh ones and the
  reminder chips, and with no detour back to an ask-fresh step: neither the reopens step nor any step after it may
  read an ask-fresh field (`build.py`). For a step that asks how it went afterwards: Problem Solve's *How did it go?*
  (Handout 12's evaluate step), opened from its `ps_review` card. A run reopened a second time (after a review led to
  a revised plan and a new card) has the step on its path already: it still comes back after the whole path, so the
  new plan's answers return; the latest loop decides, so a run whose last review led to a revised plan that never
  reached `after` again doesn't reopen. `again` names steps after it that keep the plan standing (Problem Solve's *Not yet*, which books the card again), so a run they ended reopens too. Reopened, the path runs to where the plan was last made, then the step, so earlier loops don't pile up. With several `reopens` steps on one path (Good things' week plan, ER-04 part 2: a card per good thing, each reopening its own step), the path runs to the latest plan any of them asks about, so reviewing one card's thing never cuts another's plan off the path. A reopened run also keeps the last round's answers to the fields its `reopens` step clears, readable in conditions as `$prev.<field>` (Build mastery's *done again at this rung*, ER-11 part 2). It is the previous round's record (a reopened run is a new visit that reads it back), so it is never a chip's selection (no pre-fill), never recorded, and never feeds a derive; `build.py` allows `$prev` only for a field exactly one `reopens` step clears. Every step's answers come back, including steps the capped path no longer
  holds. The player doesn't count the run's emotion ids again on a reopened visit (the feeling was the first visit's).
- **The path keeps its newest steps.** Forward and Back append and keep the last 48 (`PATH_MAX`), as resume does, so a
  long run that loops still records where it got to. A resume drops only the answers of steps the path reached after the resume point
  (and nowhere at or before it); a step that fell off the front of the path still brings its answers back.
- **A hand-off's title heads its card**, with its title slots, as an ask step's does (Problem Solve's *Your next step:
  …*). A title slot names a field (`labelOf`); when the field has the person's own words, the slot is their words.
- **Answers a step clears** (`clears: [field…]`, ER-12). Arriving at the step by a forward move drops those fields'
  answers, and so does a run reopened at a `reopens` step that lists them. For two ways to the same thing, so the old
  one doesn't stand in for the new: Problem Solve's guided step and own-words step each clear the other's. For a
  reopens step's own loop, so last time's *How did it go?* isn't read back as this time's. `build.py` refuses a field
  the skill doesn't have. Back never clears (it goes to a step, not past one).

Added by IE-08 (`docs/design/ending-relationships.md`, 10 Nov 2026):

- **Persist-nothing (R15).** `persist: {after, nothingWhen}` on a skill: `persistence()` is `wait` until the run
  leaves `after`, then `nothing` while `nothingWhen` holds, else `save`. A tool mounted with `deferSession`
  (`tools.ts`) writes no session at mount; the player calls `begin()` when the run reaches a `complete` hand-off or
  a step schedules a follow-up, and only on `save`. Never begun, a visit leaves no ToolSession and no compat
  ToolUsage. Keeps and follow-ups need `save`; a session that began and then turns `nothing` closes bare (status
  only). `build.py` requires `quickExit` with `persist` and refuses a keep or follow-up at or before `after`.
- **Quick exit.** `quickExit: true` puts the *Quick exit* button on every screen (`src/lib/quickExit.ts`).
- **Re-entry steps.** `resumeAt: [stepId]`: a check-in may reopen the run at that step even when its path never
  reached it (`?run=&at=`); the step's own answers are asked again, never restored. A
  `reopens` step wins over a re-entry when both could apply (a skill names one or the other today).
- **The carried band.** For a skill that accepts `band`, the player passes `band.current()` (≤ 20 min) when the
  route state carries none.
- These switches live in one `Skill.runtimeJson` property and are spread onto the served skill.
- **Ways into a persist-nothing tool** (ER-12, with the plan thread). A host run that offers or takes an exit to a
  `deferSession` tool (Ending) records it as `private` in its own `ext.run` (`offeredExitIds`, `exitId`), never by
  the exit's or tool's id, and the player opens it without `linkTo`, so the visit carries no `hostSessionId` and a
  saved Ending session has no `HANDED_OFF_FROM` back to the host. The host's record is kept; the trip is not in it.
  `RunContext.privateTools` (the player passes tools.ts' `deferSession` set); pinned in `tests/skill-contracts.test.mjs`.

Added by ER-B3 (`docs/design/opposite-action-v3.md`, *Runtime pieces*; agreed with the plan thread 12 Nov 2026):

- **Per-pick repeat (R16).** `each: <field>` on a step runs it once per pick of that field (up to 3), in pick order.
  Consecutive `each` steps over the same field are a segment: each pick goes through the whole segment before the
  next starts at the segment's entry (`eachEntry`), and after the last pick the run follows the transition out. The
  path records `step:index`. A per-pick step's answers are kept as `field@pick`; `answersOf(ctx, s)` is the view a step
  sees: its pick's answers under the plain field ids, plus `$each` (the pick, readable in conditions, `derive.from`
  and title slots as `{each}`). The session's emotion ids are the feelings field's picks, never the per-pick keys; its
  urge ids are every pick's. A pick no longer picked loses its answers; each pick's answers are checked against what
  its step offers for that pick.
- **Carry on with the others.** `carryOn: <step>` on a per-pick hand-off adds *Carry on with {others}* when other picks
  are still on their way: the pick is set aside (`aside`, skipped by every later segment) and the run goes on with the
  next pick, or to `carryOn` after the last. It records the offer (`offered`, which per-pick hand-offs add to), not an
  exit. An exit taken from a per-pick card carries only that pick. Back onto the card brings the pick back.
- **Ask-fresh, newest wins.** For a per-pick ask-fresh field, the answer of the per-pick screen latest on the path is the
  session's (`askFresh`).
- **The record** keeps `pick` on each per-pick answer (`ext.run.answers[].pick`, shape-checked on the server; a skill's
  projection that reads per-pick answers drops one whose `pick` isn't among the each-field's ids in the same record, and
  checks an emotion field's ids against the graph's words). Resume puts each pick's answers back under its key and
  comes back inside the right pick's sub-run.
- `build.py`: no `each` on the start step; `each` names a field of a step that isn't per-pick, `max ≤ 3`; no keep,
  follow-up, reopens or resume point per pick; one field per segment; the each field required (a segment entered with
  no pick left, every pick set aside, goes to the segment's way out); `carryOn` only on a per-pick hand-off, with the
  `carry_on` copy; the longest record stays within 40 answers (3 × per-pick fields + the rest) and 8 embed reports
  (3 × per-pick embed steps + the rest).
- **Back walks the screens back** (`trail`): every forward move pushes its screen and every Back pops one, so Back
  twice goes two screens back (before, Back appended the screen it returned to and the second tap found it and went
  forward again, in every skill). Kept apart from `path`, so a loop step whose next screen is the one before it (First,
  the body's check → swap, Ride it out's renewed round) is still a forward move. A resumed run has no trail and reads
  one from its path (`backTrail`), where such a loop reads as a step back. Pinned on every skill by seeded walks
  (`tests/skill-runtime-back.test.mjs`).
- **An embed that reports words** (`EmbedOutputSchema.emotions: n`): its ids are grid word ids; the machine keeps only
  words on the grid (`gridIds`), deduped, at most `n`, as the step's `answerAs` (Do the Opposite's `doorPicker`, the
  field its feelings repeat over). Its done is a choice, not practice (no `markPracticed`). Resume reads back the `answerAs`
  answer a per-pick step repeats over (an `each` names it) like a field's: before, only fields came back, so a reopened
  run lost the doors' words and every per-pick answer. Any other embed's report stays its own visit's. The real check
  is the projection's, against the graph.
- **Ask-fresh, newest on the path wins** (`askFresh`), per-pick or not: a once step's check after the per-pick ones
  (Do the Opposite's pull after trying, after each feeling's in the body) is the session's then-vs-now.
- **Which pick a screen is about** (`pickTrack`): with more than one pick, the player shows a small header over a
  per-pick step (*anxious · 1 of 2*; copy key `pick_of`), not a heading, so focus still lands on the title.
- **A reopened visit's urges** are only the ones picked on that visit (`visitUrgeIds`: the run's, less those read back
  with it), as its emotion ids are none; the first visit counted them.
- **Old links after a port** (`legacyLink` in `playerTools.ts`): a link the hand-built page still answers (Do the
  Opposite's `?followUp=` without `run`), removed with the page's route 7 days after the port deploys.

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
  to one (its output becomes the step's answers); a slot places one inside a step. Cope Ahead's
  (`CopeAheadEmbeds.tsx`, ER-B2): `planSentence`, `rehearsal` (whole screen, reports `done`), `keepCard` and
  `partAnchor`, each composing the plan with `planLine` from the run's answers.
- **A follow-up timed by an earlier answer** (ER-B2). An ask step's `followUp.whenFrom` may name a field of an earlier
  step (Cope Ahead's *When is it?* times the keep step's *Want me to ask how it went?*), with `whenDefault` the chip
  used when it wasn't answered. A hand-off's chips stay on its card.
- **Words that follow an earlier answer** (ER-B2). An emotion field's `options.emotionsFrom` is a `$d.<name>` ref to a
  lookup whose rows are lists of grid words (Cope Ahead's feelings by situation); `emotions` stays the fallback, used
  when the lookup finds no row. One field instead of one per earlier answer keeps the record small. Since ER-10 it may
  also name a `feelingOf` derive with `field: 'ladder'` (Know this feeling's *Which of these is closest?*).
- **A quiet way on, and a keep's confirmation** (ER-B2, Gate 2). An ask step's `secondary` (a copy key) is a quiet
  button under the primary that goes on without the step's keep or follow-up (Cope Ahead's *Not now* under *Keep
  this*); `keep.done` is a line shown on the next screen once the keep saved. A crisis slot that already holds as a
  step opens (raised on an earlier screen) renders under the title, not under the step's chips, so it is never
  pushed below the fold.
- **Projections** (R14, `functions/src/skills/projections.ts`). Cope Ahead's is the first: at close, `ext.ca` from
  `ext.run` (own words encrypted) and the visit's pull as `urgeIds`, so the old readers keep working.

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
wave (`mindfulness-emotions`) is a planned exit on the verdict card, and Let it be (`let-it-be`) is offered there since DT-04 shipped (11 Nov 2026). Departures:
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
  **inline mini-card** moves to ER-B5, with its first host (Do the Opposite's *clarify*). The danger-chip question
  it waited on is answered by the inline outcome (IE-B4, below): the host hears where the run ended and branches to
  its own crisis card.
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

Moved so far: Check the Facts, Rebel without the wreckage, It isn't working, Keep your self-respect, Rewrite the
nightmare, Ending a relationship, Problem Solve, Cope Ahead (ER-B2, the first with a projection and profile options).

Good next candidates, in order: Problem Solve (already wants a save and a follow-up), Pause / *Hold to
wait* (DT-02), the safety route (CORE-01, the plan's #1), then Do the Opposite's flow v3.

## Inline runs inside a skill (R8, IE-B4)

The first host of an inline run is another skill: FAST's Let go runs Let it be after a host's no. The pieces:

- **The `inlineSkill` embed** (`src/components/skillPlayer/InlineSkillEmbed.tsx`, runtime-owned): a whole-screen
  embed step whose props name the skill (`skill`, which must declare `inline`) and its entry (`enterAt`). It renders
  the player in `mode="inline"` with the host's ToolSession as `hostSessionId`, so the sub-run is its own
  ToolSession inside the host's visit, asks no close of its own and writes its change check as its then-vs-now.
  `build.py` refuses a host that names a skill without `inline`, an entry it doesn't list, or itself.
- **The outcome** (`inline.ends`, `inline.flags`; `inlineResult`): an inline run gives back the moment it reaches
  a hand-off, so whatever that card would have shown (a crisis slot, its offers) is lost unless the host shows it.
  The embed's output ids are the outcome for the hand-off it ended on (`ends`: `stopped`, `body`, `finished`; a step
  not named is `finished`, *Back to where I was* is `left`), then each flag whose condition holds on the sub-run's
  answers (`unsafe`, `body`). The host's transitions read them with `has` on `$a.<answerAs>.ids`. The five ids are
  fixed (`EMBED_OUTPUTS.inlineSkill`); `build.py` checks `ends` name hand-off steps and give outcome ids.
- **A skill's own outcomes** (ER-B5, `inline.outcomes`; first: Check the Facts' verdict `fits` · `partly` ·
  `doesnt_fit` · `unsure`): ids beyond the five that its `ends` and `flags` may give. `build.py` refuses one that
  reuses a fixed id or that no end or flag gives, requires such a skill to declare an `unsafe` flag, writes the list on
  each host step as its `outcomes` prop (never by hand; the machine accepts those ids from that step only), refuses a
  host that branches on an id its sub-skill can't give, and requires a host that branches on any of them to branch on
  `unsafe` first: a run can end on a verdict and still carry the danger flag, and the danger card wins.
- A way out of the sub-run (a link to another tool) leaves the page: the sub-run closes as left early and asks no
  close of its own, which would sit inside the host's screen without the step's crisis slot.
- Context in (ER-B5): only what the host's step hands it in its `ctx` prop (context key → a ref in the host's run:
  `$a.`, `$d.`, `$ctx.`, `$each`, read as the step renders), narrowed by the sub-skill's `accepts`; `build.py` checks
  both sides. Nothing else is carried (no band, frame or person), so a host runs it only where its own context makes
  that safe (Let go only after a host's no and never flooded: it accepts the band for that).
- **Seeded entry** (`inline.seed`, `inline.enterWhen`): at one of its `enterAt` steps the sub-run starts with answers
  from that context (`field` → `$ctx.<key>`: a grid word for an emotion field, else one of the field's options), and
  only when the entry's condition holds on them; otherwise it starts at its start with nothing seeded, an emotion
  value carried (first, never pre-selected). `build.py` requires every seeded entry to have a condition, so a run never
  opens on a screen that needs an answer it doesn't have (Check the Facts: `feel` from `feelingId`, entering at
  `event` only when `fitsParent` is set).
- **Ask-fresh answers stay with the inline run** (ER-B5): the sub-run is its own ToolSession inside the host's visit,
  and its ask-fresh fields (Check the Facts' `fitsFacts`) are recorded there only. `returns` never carries one to the
  host, so nothing is counted twice; the host's own record holds the outcome ids (`checked` on Do the Opposite).
- **The record's caps** (ER-B5): `ext.run.answers` holds 40 (32 before: Do the Opposite's longest real path, three
  feelings through the inline check, is 34) and `ext` 6 KB (4 KB before: that path with own words at the cap in
  3-byte characters is 4.3 KB; `tests/skill-opposite-action.test.mjs`). `build.py` checks both for every skill, the
  answer count and the longest record's bytes against the server's `EXT_MAX_BYTES`. The own-words encryption at close
  (`spine/extOwn.ts`) runs after the check and lengthens the stored string; Neo4j's string properties take it.

