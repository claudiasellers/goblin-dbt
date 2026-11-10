# Problem Solve on the skill runtime (ER-12)

Built 10 Nov 2026 (ER-B1, third PR). The port of the hand-built page to the skill player, behind the same tool id and
URL (plan C8.1). Source: `scripts/skills/problem_solve.py`. The old page (`src/pages/tools/ProblemSolve.tsx`) stays
in the tree, unrouted, until Claudia has used the port and a follow-up PR deletes it (C8.4); rolling back is removing
`'problem-solve'` from `src/lib/skillRuntime/playerTools.ts`.

DBT ER Handout 12 (and 12a): (1) name the problem, (2) the goal, (3) brainstorm, (4) pick one that fits, (5) pros
and cons, (6) do it, (7) evaluate. The old page covered 1 and 3–6 with an MI barrier check in the middle. The port
keeps that and adds step 7, which the plan asked for: the evaluation card, through resume.

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
| `feel` | *What's the feeling that's pointing at a problem?* Ten curated words, carried words first, any word behind *Something else* | `not_fit` unless the word fits (below); else `ready` |
| `ready` | *Can you think about this fairly clearly right now, or is the feeling too loud?* | *It's too loud right now* → `not_now`; else `problem` |
| `problem` | The parent's acknowledgment, then *Which of these sounds closest?*: its problem types, *It's not one thing. Everything feels like too much*, or own words (80) | piling → `triage`; *My safety is at risk* → `solutions`; else `barrier` |
| `triage` | *When everything piles up, one thing is a foothold…* (the same problem types, one pick) | safety → `solutions`; else `barrier` |
| `barrier` | *What's in the way of doing something about it?* (the five MI barriers) | know-but-can't / involves a person / tried everything → `sub`; outside my control → `decompose`; not sure what → `solutions` |
| `sub` | *Can you say a bit more?* (after *tried everything*, the demoralization line first) | `sub_reply` |
| `sub_reply` | What to say to that answer, then *What would help now?* chips from the answer's flags: look at what it protects me from, see how sure I feel, show me some options, keep problem-solving. Its tools are quiet links | `ambivalence` / `confidence` / `solutions` |
| `ambivalence` | *What does staying the same protect you from?* Each answer's tool is a quiet link. With parts on, the parts line (`partLater`) | `ambiv_reply` |
| `ambiv_reply` | What to say to that answer | `solutions` |
| `confidence` | *How sure are you that you could do the smallest version of this?* Tools per level as quiet links | `conf_reply` |
| `conf_reply` | What to say to that level | *I could do this if I decided to* → `own_step`; else `solutions` |
| `decompose` | *Some parts of this are facts. Some are up to other people. Some are in your hands.* Two questions over the problem's parts: *Which are in your hands?*, *Which are up to someone else?* (DEAR MAN as a quiet link once someone else's part is picked) | anything picked → `solutions`; nothing → `accept` |
| `solutions` | *Which direction feels right?* (the problem type's directions). The title says *start small* after *thinking about it constantly* or *a small version*, and *here's what's in your hands* after *outside my control* | `size` |
| `size` | *{direction}. Pick what feels doable.* (its small, medium and bigger steps) | `commit` |
| `own_step` | *What's the step you already know you need to take?* (own words, with four starters that fill the box) and *How big is it?* | `commit` |
| `commit` | *Your next step: {step}*, one line, *Want me to ask how it went?* (Tonight · Tomorrow · Later this week → `ps_review`), offers: the direction's own tool, and Cope Ahead for a medium or bigger step | Done |
| `review` | *You planned: {step}. How did it go?* (I did it · I did part of it · I didn't · Not yet). Only a reopened run starts here | did it → `review_done`; not yet → `review_later`; else `review_next` |
| `review_next` | *What would help with the rest?* / *What would help next time?*: a smaller version, a different direction, something got in the way | `size` (or `own_step`) / `solutions` / `barrier` |
| `review_done` | *You took the step. That's the whole loop…* | Done |
| `review_later` | *It can wait.* *Want me to ask again?* (the same chips) | Done |
| `not_now` | *Bring it down a little first, then come back to this.* | Cool Down, 5-4-3-2-1, Pause |
| `not_fit` | A line for shame, for not-clear-yet, or for anything else | Do the Opposite / Check the Facts / Find the feeling (self-validation, body scan and the wave planned) |
| `accept` | *Most of this is facts or other people's choices… the skill is carrying it, not solving it.* | Let it be, willingness, turning the mind (all planned): Done for now |

**Who fits.** A word fits when the graph marks it `problemSolveApplicable` and its DBT parent has problem types: fear,
anger, sadness, guilt, disgust, envy, jealousy, love. Shame has none. The graph says shame "isn't a problem to solve",
so a shame-parent word goes to `not_fit`'s shame line and Do the Opposite. So do *ashamed* and *humiliated*, which the
graph sends to Opposite Action. *Confused*, *perplexed* and *skeptical* go to Check the Facts. Anything else goes to
Find the feeling: pleasant words, *numb*, and words with no DBT parent such as *busy* or *tired*. The table is
`psFit`, computed at build time from the graph files.

**Safety.** *My safety is at risk* (`fear-safety-threat`: "Someone or something could hurt me or someone I love
right now") is marked `danger: other`. It shows the `other_person` crisis slot (911, the DV hotline, 988) on the
problem screen, and on every step after it through the commit card. It skips the barrier questions and goes straight
to its directions (*Get safe now*, *Get help*, *Plan for next time*). Own words on the problem and on the step get a
quiet *Talk to someone now*, since own words are never read. *This is too much right now* (P2) is under every screen,
as on every skill.

## The evaluation (Handout 12 step 7)

The commit card's chips schedule `ps_review`, a deeplink follow-up. Its Today card opens
`/tool/problem-solve?run=<the visit>&at=review`. `review` is a `reopens` step, a runtime addition agreed with the plan
thread (docs/design/skill-runtime.md):
- Only a reopened run starts there, and only a run that reached `commit`.
- The run comes back after its whole path with every answer, so the title can name the step.
- Opening the card resolves it, as for `resume_skill`.
- A run that didn't get to the commit card doesn't reopen; the page starts a whole first visit.

The answer is recorded on the new visit's ToolSession, in `ext.run`, like any run. *Did part* and *didn't* go back
into the loop: a smaller version, a different direction, or the barrier question.

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
- **The three-bucket sort is two questions.** Facts, others and yours become *in your hands* and *up to someone
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
