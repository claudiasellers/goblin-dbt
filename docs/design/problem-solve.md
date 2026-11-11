# Problem Solve on the skill runtime (ER-12)

Built 10 Nov 2026 (ER-B1, third PR). The port of the hand-built page to the skill player, behind the same tool id and
URL (plan C8.1). Source: `scripts/skills/problem_solve.py`. The old page (`src/pages/tools/ProblemSolve.tsx`) stays
in the tree, unrouted, until Claudia has used the port and a follow-up PR deletes it (C8.4); rolling back is removing
`'problem-solve'` from `src/lib/skillRuntime/playerTools.ts`.

DBT ER Handout 12 (and 12a): (1) check the facts and name the problem, (2) the goal, (3) brainstorm, (4) pick one
that fits, (5) pros and cons, (6) do it, (7) evaluate. The old page covered 1, 3, 4 and 6 with an MI barrier check in
the middle. The port keeps that and adds step 7, which the plan asked for: the evaluation card, through resume, which
asks whether the step got done and then whether it helped. Steps 2 and 5, and the facts half of step 1, are
departures (below).

## Where the content lives

The clinical content stays in the graph files it was always in. `schema/problem-solve-data.cypher` holds the problem
types per DBT parent, the solution directions and their three step sizes, and each emotion's applicability.
`schema/problem-solve-barriers.cypher` holds the parts of a problem (decomposition aspects), the five barriers,
their sub-answers and the ambivalence answers. `scripts/skills/ps_graph.py` reads them from the schema files without
a database, the way `graph_tables.py` reads the shared tables. `problem_solve.py` turns them into the skill's
options. Each option keeps a `PRESENTS` edge to the node it shows (`build.py`), so
`(:SkillOption)-[:PRESENTS]->(:ProblemType)` keeps the knowledge queryable as knowledge.

What changed on the way:
- **Screen copy is new**, in the house voice. The protocol's sentences (`ProblemSolveProtocol`, the parents'
  `psAcknowledgment`, the barriers' `therapeuticResponse`, the ambivalence follows) predate the voice rules. They
  carry em dashes, "just", "but", and in one place physiology ("partially offline"). Each one is rewritten in
  `COPY`, keeping its meaning. The graph keeps the originals for the still-deployed `getProblemSolveContent`.
- **Chip labels are the graph's**, through `voiced()`: a spaced dash becomes a colon, and "not just" becomes "not
  only". One label is rewritten in `LABELS`: *I know what to do, and I can't make myself do it*.
- **The recognition prompts and direction descriptions aren't shown.** A chip is its label. The labels are first
  person and stand alone (*Someone crossed a line*, *Get safe now*).

## The flow

| Step | What it asks | Goes to |
|---|---|---|
| `feel` | *What's the feeling that's pointing at a problem?* Ten curated words, carried words first, any word behind *Something else* | a carried flooded band → `not_now`; `not_fit` unless the word fits (below); else `ready` |
| `ready` | *Can you think about this fairly clearly right now, or is the feeling too loud?* | *It's too loud right now* → `not_now`; else `problem` |
| `problem` | The parent's acknowledgment (for a routed word, *Something is asking a lot of you right now…*), then *Which of these sounds closest?*: its problem types, *It's not one thing. Everything feels like too much*, or own words (80). A quiet *Talk to someone now* with own words or a hopeless word | piling → `triage`; *My safety is at risk* → `solutions`; else `barrier` |
| `triage` | *When everything piles up, one thing is a foothold…* (the same problem types, one pick, or own words (80) with the quiet *Talk to someone now*) | safety → `solutions`; else `barrier` |
| `barrier` | *What's in the way of doing something about it?* (the five MI barriers) | know-but-can't / involves a person / tried everything → `sub`; outside my control → `decompose`; not sure what → `solutions` |
| `sub` | *Can you say a bit more?* (after *tried everything*, the demoralization line first) | `sub_reply` |
| `sub_reply` | What to say to that answer, then *What would help now?* chips from the answer's flags: look at what it protects me from, see how sure I feel, show me some options, keep problem-solving; *Stop here for now* first after *no energy* and *exhausted*. Its tools are quiet links (and *Talk to someone now* after *exhausted*) | `rest` / `ambivalence` / `confidence` / `solutions` |
| `ambivalence` | *What does staying the same protect you from?* Each answer's tool is a quiet link. With parts on, the parts line (`partLater`) | `ambiv_reply` |
| `ambiv_reply` | What to say to that answer | `solutions` |
| `confidence` | *How sure are you that you could do the smallest version of this?* Tools per level as quiet links | `conf_reply` |
| `conf_reply` | What to say to that level | *I could do this if I decided to* → `own_step`; else `solutions` |
| `decompose` | *Some parts of this are facts. Some are up to other people. Some are in your hands.* *Which of these are in your hands?* over the problem's parts | something picked → `solutions`; else `theirs` |
| `theirs` | *Which parts are up to someone else?* (DEAR MAN as a quiet link once one is picked) | something picked → `accept`; nothing → `solutions`, starting small |
| `solutions` | *Which direction feels right?* (the problem type's directions, and *My own idea*). The title says *start small* after *thinking about it constantly*, *a small version*, or *outside my control* with nothing picked, and *here's what's in your hands* after something in their hands. Arriving clears an own-words step | own idea → `own_step`; else `size` |
| `size` | *{direction}. Pick what feels doable.* (its small, medium and bigger steps) | `commit` |
| `own_step` | *What's the step you already know you want to take?* (own words, with four starters that fill the box) and *How big is it?*. Arriving clears a guided step | `commit` |
| `commit` | *Your next step: {step}* (their own words for their own step), one line (on the danger path: *If it gets more dangerous, call now…*), *Want me to ask how it went?* (Tonight · Tomorrow · Later this week, not on the danger path → `ps_review`), offers: the direction's own tool, and Cope Ahead for a medium or bigger step off the danger path | Done |
| `review` | *How did it go? You planned: {step}* (their own words for their own step) (I did it · I did part of it · I didn't · Not yet). Only a reopened run starts here (after the commit card, or after *Not yet* booked the card again); it clears the last review's answers, `ready`, and what got in the way last time (asked again if they go back to it) | did it → `review_help`; not yet → `review_later`; else `review_next` |
| `review_help` | *You took the step. Did it help with the problem?* (It helped · Some · Not really) | not really → `review_next`; else `review_done` |
| `review_next` | *What would help with the rest?* / *next time?* / *now?* (after *Not really*): a smaller version (not after *Not really*), a different direction, something got in the way. On the danger path, *I didn't* / *part of it* gets *If you're not safe now, call. Or pick another way.* instead of *next time?* CORE-11's missing links as a planned link after *I didn't* | `size` (guided) or `own_step` / `solutions` / `barrier` (on the danger path, `solutions`) |
| `review_done` | *You took the step and saw what it did. That's the whole loop…* | Done |
| `review_later` | *It can wait.* (on the danger path: *If it gets more dangerous, call now…*) *Want me to ask again?* (the same chips) | Done |
| `not_now` | *It may help to bring it down a little first, then come back to this.* | Cool Down, 5-4-3-2-1, Pause |
| `rest` | *Stopping here is a real choice. You can come back to this when you have more in the tank.* | Look after the basics (planned), 5-4-3-2-1, Done: refilling, nothing that calms down |
| `not_fit` | A line for shame, for not-clear-yet, or for anything else | Do the Opposite / Check the Facts / Find the feeling (self-validation, body scan and the wave planned) |
| `accept` | *Most of this is facts or other people's choices… Here the skill is to carry it, not solve it.* | DEAR MAN (what to say to them); let it be, willingness, turning the mind (all planned) |

**Who fits.** A word fits when the graph marks it `problemSolveApplicable` and its DBT parent has problem types: fear,
anger, sadness, guilt, disgust, envy, jealousy, love. Shame has none. The graph says shame "isn't a problem to solve",
so a shame-parent word goes to `not_fit`'s shame line and Do the Opposite. So do *ashamed* and *humiliated*, which the
graph sends to Opposite Action. *Confused*, *perplexed* and *skeptical* go to Check the Facts. Anything else goes to
Find the feeling: pleasant words, *numb*, and words with no DBT parent such as *tired*. The table is `psFit`, computed
at build time from the graph files, plus `ROUTED_IN`: the words the check-in's routing sends here (word rules for
`problem-solve`) that the graph doesn't mark applicable, each with the parent whose problems it starts from (*busy*
and *rushed* with fear, as *stressed*; *helpless* with sadness), so nobody routed here is turned away on screen 1. A
test keeps every routed word fitting. **For Claudia's review** with the routing words.

**Safety.** *My safety is at risk* (`fear-safety-threat`: "Someone or something could hurt me or someone I love
right now") is marked `danger: other`. It shows the `other_person` crisis slot (911, the DV hotline, 988) on the
problem screen and on every step after it, the review loop included (a reopened run has the answer back). It skips
the barrier questions, on the first visit and on the review's *Something got in the way*, and goes straight to its
directions (*Get safe now*, *Get help*, *Plan for next time*). Its commit card leads with *If it gets more dangerous,
call now*, has no rehearse line or Cope Ahead offer for *Get safe now* or *Get help* (*Plan for next time* keeps
its own linked tool, Cope Ahead, at every size), and has no *Later this week*. Its *Not yet* on the review is never
told it can wait. Own words alone never
pick the danger type: with only own words, the parent's general problem type stands in (`OWN_FALLBACK`: fear's is
*Something bad might happen*, never safety or health), and *Talk to someone now* stays on the planning screens
(`decompose`, `solutions`, `size`). A quiet
*Talk to someone now* sits under own words on the problem and on the step (own words are never read), under a
hopeless word (*hopeless*, *despair*, *depressed*, *worthless*, *helpless*, *powerless*) on the problem screen and on every hand-off the run ends on, and under *I'm exhausted* after
*tried everything*. A carried flooded band goes to grounding first (C6.2). *This is too much right now* (P2) is under
every screen, as on every skill.

## The evaluation (Handout 12 step 7)

The commit card's chips schedule `ps_review`, a deeplink follow-up. Its Today card opens
`/tool/problem-solve?run=<the visit>&at=review`. `review` is a `reopens` step, a runtime addition agreed with the plan
thread (docs/design/skill-runtime.md):
- Only a reopened run starts there, and only a run that reached `commit`.
- The run comes back after its whole path with every answer, so the title can name the step.
- Opening the card resolves it, as for `resume_skill`.
- A run that didn't get to the commit card doesn't reopen; the page starts a whole first visit.

The answer is recorded on the new visit's ToolSession, in `ext.run`, like any run. *I did it* asks whether it helped
(Handout 12 evaluates the result, not only the doing); *Not really* goes to another direction or the barrier question.
*Did part* and *didn't* go back into the loop: a smaller version, a different direction, or the barrier question. A
revised plan replaces the old one (`solutions` and `own_step` each clear the other's answers), and its own card
reopens after the whole path, so the second review names the new step. A review visit doesn't count the first
visit's feeling again, and `sessionSourceMatch` skips its `sub` answer (a ToolSession RESOLVING a `ps_review`), since
the run is the first visit's read back. `ps_review`'s missed path is CORE-11's missing links, as `ps_step`'s was.

`ps_step` stays registered: the old page's cards still answer in place (Did it · Did part · Didn't). Nothing
schedules it any more.

## The attempt record

`ext.run` replaces `ext.er`'s Problem Solve keys:

| Old (`ext.er`) | Now (`ext.run.answers`) |
|---|---|
| `problemTypeId` | `problem` (or `focus` after triage) |
| `directionId`, `size` | `solutions`, `size` (`<direction>:<size>`), or `mystep` + `mysize` |
| `barrierTypeId`, `barrierSubId` | `barrier`, `sub` |
| `ambivalenceId` | `ambiv` |
| `confidence` | `conf` |
| `psLater` (the yes) | `embedsShown: ps_later` (the line showed). The yes is the PartCandidate itself |

The two readers of the old keys, the parts predicate `sessionSourceMatch` (queuePartCandidate and the trails
records), keep the `"barrierSubId":"<id>"` match. They also match a Problem Solve run's `sub` answer as
`"fieldId":"sub","optionIds":["<id>"`. That relies on `runRecord` writing `fieldId` before `optionIds`, which
`functions/test/unit/sessionMoves.test.cjs` pins. An R14 projection would be cleaner; it isn't needed while the pin
holds.

## Departures from the old page

- **One feeling, one problem type, one direction.** The old page took several emotions and several problem types, and
  offered the union. The runtime derives one parent from one word, and directions follow one problem type. The
  check-in's carried words come first in the chips.
- **The rumination guard is gone.** It counted re-entries to the define screen, and the runtime has no loop counter.
  The barrier question (*I've been thinking about it constantly* → start small) covers the same ground.
- **The three-bucket sort is two questions, one a screen.** Facts, others and yours become *in your hands* and *up to someone
  else*; what neither question picks is a fact. There are no default buckets; the pile-sort embed (`pileSort`,
  ER-B4) can bring the sort back.
- **The interpersonal hint is a quiet DEAR MAN link** on *up to someone else*, not a screen of its own. *Keep it
  warm* (give) is a planned exit.
- **The define prompts and the commitment framing aren't shown.** The size chips say it in a few words (*Small: in
  the next hour*).
- **Acceptance offers only Done for now.** Let it be, willingness and turning the mind are all planned (DT-B4). The
  old page linked to all three, dead.
- **Every dead link is a planned exit**: give, dialectics, PLEASE, build mastery, finding connection, effectiveness,
  chain analysis, values clarification, ending relationships, self-validation, body scan, the wave. All are recorded
  and never shown, so they light up when their tool ships.
- **Pros and cons (Handout 12 step 5)** waits for DT-10's card, inline (plan: *DT-10 inline later*).
- **No separate goal step (Handout 12 step 2), and no facts check on the problem (step 1).** The old page had
  neither. The problem types are first-person and specific (*Someone crossed a line*), and each direction carries its
  goal in its name (*Get safe now*, *Repair it*), so a goal question would ask the person to say again what the next
  chip says. A word that is about unclear facts goes to Check the Facts (`not_fit`). Both can come back with DT-10's
  inline pros and cons, which needs a goal to weigh against.
- **Brainstorm is a curated list with an own idea.** The graph's two or three directions per problem type, plus *My
  own idea*, which goes to the step they already know.
- **No rep at the define screen.** The old page called `markPracticed` when the problem was named; the skill player
  marks no step practiced (as for every skill on the runtime), so a visit left before the commit card earns no rep.
  A runtime way to mark a step practiced is a plan-thread question, not this PR's.
- **Opening the review card resolves it** (as `resume_skill` and `nightmare_rehearse`), whatever the answer. `ps_step`
  answered in place with Did it · Did part · Didn't as statuses; the answer now lives on the visit's run.
