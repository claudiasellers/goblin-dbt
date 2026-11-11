# Keep your self-respect (FAST)

Built 10 Nov 2026 in IE-B1 (`docs/design/dbt-modules-plan.md` §5.2), from PRD IE-05
(`prd-interpersonal-effectiveness.md`). Tool id `fast`, concept `dbt_fast`, DBT IE Handout 7. Two skills on the skill
runtime (`docs/design/skill-runtime.md`), one tool, no screen code of its own. Source: `scripts/skills/fast.py`.

FAST is the self-respect half of interpersonal effectiveness: be **F**air (to yourself as well as to them), no
extra **A**pologies, **S**tick to your values, be **T**ruthful. In this app it does two jobs:

1. **The standalone review** (`fast_review`, calm time, 2 to 3 minutes): after a conversation where you gave
   yourself away a little, pick what happened, get one FAST card with its repair move, keep the line on paper.
2. **Let go** (`fast_let_go`, 60 to 90 seconds): after a no, a line that says where you stand (or none), then
   meeting the need somewhere else. This is the route the Wound PRD's *Let go* verb and Recover's Land exit
   have needed; it had no content until now.

## Which one opens

`src/pages/tools/Fast.tsx` decides once, when the page opens (`src/lib/fastSkill.ts`):

| Arrives with | Opens |
|---|---|
| `?frame=let_go` (a host that heard a no) | Let go |
| A carried `flooded` reading (`band.current()`, ≤ 20 min, plan D1) | Let go: the line now, the review another day |
| Anything else, including no band | The review |

The band is never asked, inferred or recorded here (D1, R2).

## The review (`fast_review`, `fast-review-v1`)

| Step | Kind | What it asks | Next |
|---|---|---|---|
| `what` | ask, one pick, own words count | *Looking back, which of these happened?* (*This happens to a lot of people. Pick the one you'd most like to change.*) | by letter, below |
| `sorry` → `sorry_instead` → `card_a` | **A** | Was there a real wrong? What takes the place of the extra sorries? | the card |
| `values` → `card_s` | **S** | Which value to keep (1–2, a third swaps out the older) | the card (a list, not copyable) |
| `truth` → `card_t` | **T** | The true version (no excuses, no helplessness, no exaggeration) | the card |
| `instead` → `card_f` | **F** | What you'd say instead | the card |
| `next` | hand-off, completes | one line; offers | exits |

`what` chips, each tagged with its letter in props: *I said sorry more than I meant* (A), *I went along with
something I don't agree with* (S), *I made it sound bigger or smaller than it was* (T), *I made up a reason
instead of saying what was true* (T), *I let them decide for me* (F), *I dropped what I was asking for* (F). Own words go to the F branch (what you'd say instead), since the
repair for an unnamed slip is your own next line.

Hand-off offers (`next`):

| When | Offer |
|---|---|
| `sorry` is *Yes, one thing* or *I'm not sure* | Check the Facts (does the guilt fit?) |
| `what` is *dropped my ask*, *let them decide*, or own words with no chip | Ask for what you need (DEAR MAN) |
| always | Rehearse it (`rehearse`, **planned**, hidden until IE-B5) |

A real wrong changes the hand-off line: *A sorry for a real wrong is part of keeping your self-respect. Check the
Facts can help with whether the guilt fits, and what would repair it.* *I'm not sure* gets *Not sure about the
sorry? Check the Facts can help sort it out.* Those lines are the guard against FAST read as "never apologise"
(PRD IE-05 risks), and they say why Check the Facts is offered, so it doesn't read as "check whether you were
really wrong".

## Let go (`fast_let_go`, `fast-let-go-v1`)

| Step | Kind | What it does |
|---|---|---|
| `line` | ask, one pick, own words | *Do you want a line that says where you stand?* Five boundary lines, each saying what **you** will do, with *I don't need to say anything* second |
| `card` | embed `boundaryLine` | The line on the keepsake paper, Copy, Next. Skipped for *I don't need to say anything* |
| `elsewhere` | hand-off, completes | After a host's no (`?frame=let_go`): *You said what you needed, and that counts. It's a no for now. What you needed still matters, and it can be met somewhere else.* (the acknowledgement and the one acceptance line, IE Arch #31). On a flooded entry with no frame, where no one may have said no: *What you needed still matters. It can be met somewhere else.* After *say nothing*: *Saying nothing is a choice too…* Offers Recover (from its start until IE-B4 gives it `enterAt`); Let it be (DT-04) and Find your people (IE-09) are **planned** |

The reviewed set is eight lines (PRD: ≥ 8) in `BOUNDARY_LINES`; Let go serves five of them plus saying nothing
(`SERVED_LINES`: *not_keep_asking*, *none*, *hear_no*, *not_today*, *another_way*, *not_argue*), so the screen and
its quiet link fit one phone screen on a flooded entry. *see_differently*, *another_time* and *space* are Python-only drafts (never options in the graph) until the
next hosts serve them (Recover's Land in IE-B4, Ending in IE-08). *not_argue* is Recover's *Let it land* line without its last
sentence. Every line is short and non-attacking, says what the person will do, and is usable while flooded.

## The `boundaryLine` embed

`src/components/skillPlayer/BoundaryLine.tsx`, registered in `embeds.ts` and mirrored in `scripts/skills/content.py`
`EMBEDS` with one output id, `copied`. Props: `from` (the fields whose picks make the line, their labels joined,
own words last), `copyable` (false for the values list), `labels`. **Never locked**, at any band: this is the
primitive that replaces Recover's `boundaryLocked` copy lock (the swap itself is IE-B4's, with Recover's other
locks). No clipboard falls back to selecting the line and saying so (*The line is selected, ready to copy.*, a
status line). Focus stays on the step's title. A copyable card is one line; only the values card is a list. The step records
`<card>_copied: ['copied']` when the copy went through, nothing otherwise.

## Mapping to the handout

| IE 7 | Here |
|---|---|
| **F**air to yourself and the other person | *I let them decide for me* / *I dropped what I was asking for* → what you'd say instead: fair to you (*I'm still asking for what I asked for*, *That doesn't work for me*) and to them (*Can we decide this together?*, *I can see your side. Here's mine.*) |
| No **A**pologies (unless one is warranted) | The one-sorry rule: one for a real wrong, none for having a need; the extra sorries swapped for *Thank you for hearing me out*, *This matters to me* |
| **S**tick to values | The value you'd keep next time, one or two |
| **T**ruthful (no lies, no excuses, no acting helpless, no exaggerating) | *I made it sound bigger or smaller* / *I made up a reason* → the true version: *It's hard, and I can do some of it*, *It happens sometimes, not every time*, *I don't want to, and that's a real answer* |

## What's saved

`ToolSession.ext.run` only (plan D2: no `FastSession`). Worst case 4 KB is test-enforced across both skills
(`tests/skill-contracts.test.mjs`), which is why own words on the line fields stop at 90 characters (one breath,
the same as Cope Ahead's moves and the witness lines). Own words are encrypted at close by the spine (PR #55).
Close kind `regulation_down` (`functions/src/spine/tools.ts`, `src/lib/spine/close.ts`), so with parts on the
close offers the tag row, like Check the Facts.

## Routing and links

- `dbt_fast` has `appToolId: 'fast'` (`schema/app-tool-ids.cypher`), so Problem Solve's seven `fast` links
  (`schema/problem-solve-data.cypher` ×5, `problem-solve-barriers.cypher` ×2) open the tool with no Problem Solve
  change.
- Two `RECOMMENDED_FOR` rows exist and are **off and drafts** (`BUILT_NOT_SIGNED_OFF` in
  `scripts/recommendations/content.py`, D15). Concept tags: `change`, `relational`, `neutral`.
- Listed under Interpersonal Effectiveness for everyone (`src/data/tools.ts`, emoji 🪶).
- Edges in `tests/fixtures/module-edges.json`: IE PRD IE-05 (fast → rehearse planned, dear-man, check-the-facts,
  let-it-be built 11 Nov), IE Arch #30 (→ Recover), #37 (→ finding-connection planned), #42 (problem-solve → fast).

## Departures from the PRD

| PRD IE-05 | Built | Why |
|---|---|---|
| Acknowledgement *You asked twice. That was brave, and it's enough.* | *You said what you needed, and that counts.* | No count of asks exists yet (IE-03), and the voice contract has no cheer |
| Values from the shared `Goal/Value` list | Eight values in `fast.py` | ER-09 owns values (C5); the list is replaced by ER-09's when it ships (ER-B4) |
| `FastFlow`, `FastCheck`, `SelfRespectRepair` labels | Skill rows (`Skill`, `SkillStep`, `SkillOption`) | The runtime's model (skill-runtime.md); chips keep their clinical labels on `SkillOption` |
| Byte-equivalent DEAR MAN regeneration | Token-equivalent | See below |

## Not in this batch

| What | Waits on |
|---|---|
| The inline FAST strip under a message preview (apology count, helpless / exaggeration chips, the 4-item self-check, the fade after 5 clean messages) | `messageComposer` (IE-B3) |
| Saving the boundary line on the person (`Person.boundaries`) and the user's own *instead* line served at the next compose with that person | IE-03 People (IE-B2) and the keep action (R4, F2) |
| Follow-up *next time with {label}*; the flooded *this is a tomorrow thing* follow-up | Follow-up action (R5, F2) and a `FollowUpType` row |
| Rehearse it after the review | IE-02 (IE-B5); the exit is in place, planned |
| Let it be inline in Let go | DT-04 (DT-B4); planned exit until then, inline in IE-B4 |
| Recover dropping `boundaryLocked` and using this embed | IE-B4 |
| The Witness deck as a place to meet the need (Arch #30) | WMP's witness pieces (F2 `witness` embed) |
| `SkillPractice` reps `self_respect` / `let_go` | The spine's reps from a run (F2) |
| Let go for an unsafe or refusing person (`reason=unsafe`): start on *I don't need to say anything* and hide the other lines (the PRD's "step away without saying anything") | The safety batch / IE-03. No host links `frame=let_go` until then |
| Hiding the Recover offer when Recover is the host (no loop), and opening Recover at its need step | IE-B4 (Recover's `enterAt`) |
| A shorter flooded line set (four lines plus *say nothing*) | A band ref in option conditions (`runtime:` PR) or a flooded skill; today's five lines are the compromise |
| Check the Facts opening with *guilty* first | Check the Facts accepting context (`firstFrom`) |

## Sign-off

The skill copy isn't gated on content sign-off (Check the Facts' precedent). For Claudia:

- **Boundary lines** (PRD IE-05 "≥ 8, reviewed"): `not_argue`, `not_keep_asking`, `hear_no`, `see_differently`,
  `not_today`, `another_time`, `space`, `another_way`. **Signed off as written (Claudia, 10 Nov 2026).** The
  clinical gate replaced two before this PR: *…when we can both talk calmly* (implies they weren't) and *That
  doesn't work for me, and that hasn't changed* (doesn't fit after their no to your ask).
- **Routing rows:** `self-respect` (betrayed, disrespected) and `grievance` (bitter, resentful) stay **off and
  drafts**. *Violated* is out of `self-respect` and the `victimized` row is deleted (Claudia, 10 Nov 2026, the
  clinical gate's call): after a violation, a review that opens on what *you* did reads as self-blame. Switching
  the two remaining rows on is a later call (drop them from `BUILT_NOT_SIGNED_OFF`, row by row).
- **`ADDRESSES` edges:** `dbt_fast` → cold shame, inferior, insignificant (Claudia, 10 Nov 2026), written from
  `fast.py` (`addresses` on `fast_review`; `build.py` rebuilds the set each load). Not the PRD's *unjustified
  guilt*: the graph has one guilt word, so the edge would claim all guilt. Live on load: Find the feeling's word
  routes can offer FAST for these three, and they break ties in check-in routing. Each edge carries
  `legacy: false`, which the kill-switch ranker (`LEGACY_TOOLS_QUERY`) skips, so switching routing off still
  restores the pre-review routing whole (without it, *Empty* would get FAST under the legacy ranker on a tie).
- The review copy, if you want it on the witness voice list.

## Open idea: a trauma-aware look back (not built)

Claudia, 10 Nov 2026: a retrospective after being hurt isn't a bad idea in itself, but today's review is the wrong
one for it, because it opens on the person's own conduct (*what did you do that you'd like to change?*). A
trauma-aware version would open on **what happened to them** and **what they want to protect** (a value, a limit,
their footing with this person), and only reach their own choices later, if at all, and by their choice. That is
the shape a route from *violated* or *victimized* would need. Nothing is built or routed for it; it needs its own
clinical design (who it's for, what it never asks, how it hands off to Recover and safety) before a batch.

## The DEAR MAN content source (same batch)

`scripts/dear-man/content.py` is now the editable source for the four DEAR MAN files (`dear-man-content.cypher`,
`-content-v2`, `-debrief-content`, `-safety-gates`); `build.py` writes them, `--check` is the freshness test
(`tests/dear-man-content.test.mjs`). No behaviour change: `python3 scripts/dear-man/build.py --prove <ref>`
compares every statement against a git ref token by token (whitespace and comments dropped, strings compared by
value) and reports *same statements* for all four. Byte equality wasn't kept because the hand-written files had
ragged hand padding; reproducing it would have meant encoding the padding as data. The test also pins that every
DEAR MAN debrief and barrier id is mapped in parts (`EXPRESSES` or `HELD`). ER-B2 links Cope Ahead's moves to these
ids, and IE-B2/B4 port DEAR MAN onto the runtime from this source.
