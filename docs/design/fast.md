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
| `what` | ask, one pick, own words count | *Looking back, which of these happened?* (*Pick the one that sits worst.*) | by letter, below |
| `sorry` → `sorry_instead` → `card_a` | **A** | Was there a real wrong? What takes the place of the extra sorries? | the card |
| `values` → `card_s` | **S** | Which value to keep (1–2, a third swaps out the older) | the card (a list, not copyable) |
| `truth` → `card_t` | **T** | The true version (no helplessness, no exaggeration) | the card |
| `instead` → `card_f` | **F** | What you'd say instead | the card |
| `next` | hand-off, completes | one line; offers | exits |

`what` chips, each tagged with its letter in props: *I said sorry more than I meant* (A), *I went along with
something I don't agree with* (S), *I made it sound bigger or smaller than it was* (T), *I let them decide for me*
(F), *I dropped what I was asking for* (F). Own words go to the F branch (what you'd say instead), since the
repair for an unnamed slip is your own next line.

Hand-off offers (`next`):

| When | Offer |
|---|---|
| `sorry` is *Yes, one thing* or *I'm not sure* | Check the Facts (does the guilt fit?) |
| `what` is *dropped my ask*, *let them decide*, or own words with no chip | Ask for what you need (DEAR MAN) |
| always | Rehearse it (`rehearse`, **planned**, hidden until IE-B5) |

A real wrong changes the hand-off line: *A sorry for a real wrong is part of keeping your self-respect.* That
line is the guard against FAST read as "never apologise" (PRD IE-05 risks).

## Let go (`fast_let_go`, `fast-let-go-v1`)

| Step | Kind | What it does |
|---|---|---|
| `line` | ask, one pick, own words | *You said what you needed, and that counts. Do you want a line that says where you stand?* Eight boundary lines, each saying what **you** will do, plus *I don't need to say anything* |
| `card` | embed `boundaryLine` | The line on the keepsake paper, Copy, Next. Skipped for *I don't need to say anything* |
| `elsewhere` | hand-off, completes | *What you needed from them still matters. It can be met somewhere else.* Offers Recover; Let it be (DT-04) and Find your people (IE-09) are **planned** |

The first boundary line is Recover's *Let it land* line without its last sentence. Every line is short and
non-attacking by construction, so it is usable while flooded (PRD IE-05 band branching).

## The `boundaryLine` embed

`src/components/skillPlayer/BoundaryLine.tsx`, registered in `embeds.ts` and mirrored in `scripts/skills/content.py`
`EMBEDS` with one output id, `copied`. Props: `from` (the fields whose picks make the line, their labels joined,
own words last), `copyable` (false for the values list), `labels`. **Never locked**, at any band: this is the
primitive that replaces Recover's `boundaryLocked` copy lock (the swap itself is IE-B4's, with Recover's other
locks). No clipboard falls back to selecting the line so it can be copied by hand. The step records
`<card>_copied: ['copied']` when the copy went through, nothing otherwise.

## Mapping to the handout

| IE 7 | Here |
|---|---|
| **F**air to yourself and the other person | *I let them decide for me* / *I dropped what I was asking for* → what you'd say instead (*Can we decide this together?*, *I'm still asking for what I asked for*) |
| No **A**pologies (unless one is warranted) | The one-sorry rule: one for a real wrong, none for having a need; the extra sorries swapped for *Thank you for hearing me out*, *This matters to me* |
| **S**tick to values | The value you'd keep next time, one or two |
| **T**ruthful (no lies, no acting helpless, no exaggerating) | The true version: *It's hard, and I can do some of it*, *It happens sometimes, not every time* |

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
- Three `RECOMMENDED_FOR` rows exist and are **off and drafts** (`BUILT_NOT_SIGNED_OFF` in
  `scripts/recommendations/content.py`, D15). Concept tags: `change`, `relational`, `neutral`.
- Listed under Interpersonal Effectiveness for everyone (`src/data/tools.ts`, emoji 🪶).
- Edges in `tests/fixtures/module-edges.json`: IE PRD IE-05 (fast → rehearse planned, dear-man, check-the-facts,
  let-it-be planned), IE Arch #30 (→ Recover), #37 (→ finding-connection planned), #42 (problem-solve → fast).

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
| `ADDRESSES` edges (unjustified guilt, cold shame, inferior, insignificant) | Clinical review |
| `SkillPractice` reps `self_respect` / `let_go` | The spine's reps from a run (F2) |

## Sign-off

Nothing here is gated on content sign-off (Check the Facts' precedent). What Claudia signs off before it
matters: the three routing rows (drop from `BUILT_NOT_SIGNED_OFF`), and the eight boundary lines and the
review copy if she wants them on the witness voice list.

## The DEAR MAN content source (same batch)

`scripts/dear-man/content.py` is now the editable source for the four DEAR MAN files (`dear-man-content.cypher`,
`-content-v2`, `-debrief-content`, `-safety-gates`); `build.py` writes them, `--check` is the freshness test
(`tests/dear-man-content.test.mjs`). No behaviour change: `python3 scripts/dear-man/build.py --prove <ref>`
compares every statement against a git ref token by token (whitespace and comments dropped, strings compared by
value) and reports *same statements* for all four. Byte equality wasn't kept because the hand-written files had
ragged hand padding; reproducing it would have meant encoding the padding as data. The test also pins that every
DEAR MAN debrief and barrier id is mapped in parts (`EXPRESSES` or `HELD`). ER-B2 links Cope Ahead's moves to these
ids, and IE-B2/B4 port DEAR MAN onto the runtime from this source.
