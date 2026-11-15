# What works here (MF-08 effectively)

**Status:** built 15 Nov 2026 on the skill runtime (MF-B5; [the modules plan](dbt-modules-plan.md) §5.3a). New tool
`effectiveness` (the id Problem Solve's content already named), listed under Mindfulness as *What works here*, on the
existing concept `dbt_effectively` (`appToolId: 'effectiveness'`). Intent *Being right is getting in the way*. Source:
`scripts/skills/effectively.py`. Tests: `tests/skill-effectively.test.mjs`. No new embed: the two piles on paper are
IE-10's `twoColumns`. Rolling back is removing `'effectiveness'` from `src/lib/skillRuntime/playerTools.ts`, the tool and
its intent from `src/data/tools.ts`, and `"effectiveness"` from `BUILT` in `scripts/skills/problem_solve.py` (its two
directions go back to planned links, written and never shown).

## What it is

PRD MF-08 (DBT Mindfulness Handout 5, the third how skill: *effectively*, focus on what works, let go of being right)
for the moment being right and getting what matters pull apart: escalating a fight, refusing a workable deal because
it's unfair, envy that freezes action. Validate first, name what you want out of it, see being right and what works side
by side, one move that works from how things actually are, and what to set down for now. 60 to 90 seconds. Evidence is
Preliminary (clinical consensus; no trial isolates it).

## The flow

| Step | What the person sees | PRD MF-08 |
|---|---|---|
| `goal` | The validation line first (Problem Solve's *Decide if this fight is worth it*: *Maybe they are in the wrong. That's real.*; *Play the hand you have*: *It isn't fair. That's real.*; a plain visit: *Being right and getting what matters can pull apart.*), then *What do you want out of this, most?* (*One for now.*) Stay connected with them · Protect a boundary · Make progress on it · Put right what went wrong · Keep my self-respect · Something else (own words) · I'm scared of what they'd do | Steps 1, 2 |
| `unsafe` | *Your safety comes first.* *When someone might hurt you, what works is staying safe. Nothing here asks you to give ground to them.* The `other_person` crisis slot, Talk to someone now, Ending a relationship (careful frame). No moves, no close | Risk: never talk someone out of a boundary |
| `want` | *What are you after here? Tap any.* (*Both can matter.*) Two piles on one screen. *Being right*: they admit they were wrong · they feel what I felt · everyone sees it was unfair · I win this one · they pay for it. *Getting what matters*: it gets sorted out · we can still work together · I get what I need from this · things go better from here · I can live with how I handled it. Nothing required | Step 3 |
| `piles` | Both piles on paper (`twoColumns`): *Here's what you're after.* (*Both are real. They don't always fit together.*). Only when both have a pick | Step 3 |
| `pull` | *Right now, which matters more?* What works · Being right about this one · I can't tell | The fade question |
| `move` | *Given how things actually are, one move that works.* (*From where things stand today.*) The host direction's three steps first (re-voiced; each option PRESENTS its `SolutionDirection`), then the goal's three; a goal in own words gets three general ones; or own words. After *being right about this one*: *Then one move that keeps your self-respect, from how things actually are.* | Step 4 |
| `set_down` | *What could you set down, for now?* (*For now. Nothing is given up for good.*) Being right · Getting even · How unfair the start was; optional. Skipped after *being right about this one* | Step 5 |
| `end` | *What works here: {move}* and one line: *Sometimes being right is the point. You know which this one is.* (being right), *The rest can wait. Setting it down for now isn't giving in.* (something set down), *Not knowing is fine. You have one move either way.* (can't tell), else *Right, or what works? Asking it is the skill.* The goal's next tool: connected → Keep it warm, DEAR MAN; put it right → Keep it warm, DEAR MAN; a boundary → DEAR MAN, FAST, Say no; self-respect → FAST; progress → Problem Solve, Build mastery; own words → Problem Solve. *Want me to ask how it went?* Tomorrow · In a few days (optional) | Step 6 |
| `back` | Reopened from the `effective_move` card: *How did it go? You planned: {move}* I did it, and it helped · I did it, and it didn't help · Not yet | Follow-up |
| `back_end` | *That's what works, found and done.* / *It was worth trying. What works can change, and you can look again.* (with Problem Solve) / *It'll keep. The move is still there.* | |

A carried flooded reading puts *Your body's loud right now.* in the goal's title, *Working out what works is easier once
it settles. Start with your body, or go on anyway.* as its line, and *My body first* (First, the body) as a link; it can
still go on (PRD: DT first, never a lock). *Talk to someone now* (`safety.open`) is on every screen. Close kind `none`:
the move is the outcome, and the PRD asks no then-vs-now.

## Reps, links, the card

- **Reps.** Every completed visit logs an `effectively` rep (new `PracticeSkill effectively`, *Effectively*, Preliminary,
  `PRACTICES dbt_effectively`, `defaultFor ['effectiveness']`).
- **The Practice home.** `effectively` joins the MF sequence at `mfOrder` 6 (*What works*), so the daily pick and the
  library reach it with no client change.
- **Problem Solve.** `effectiveness` is in `BUILT`: the two directions that link to it (`anger-blocked-redirect`,
  `envy-unfair-effective`) offer it on the commit card, and the exit carries the problem type as the frame
  (`query: {frame: '$a.problem'}`, read through `exitQuery`). The skill's `grievanceOf` table turns
  `anger-blocked-goal` into *fight* and `envy-unfair-advantage` into *unfair* (a host can send `fight` / `unfair` too).
- **The card.** `effective_move` (new `FollowUpType`, owner `mf`, tier `practice`, deep link
  `/tool/effectiveness?run={sourceSessionId}&at=back&followUp={followUpId}`, chips tomorrow / few days at 18:00, stale
  after 72 h, *Not this time*). Opening it resolves it (`OPEN_RESOLVES`); only a What works visit can book it
  (`FOLLOW_UP_SESSION_TOOL`). Only a run that reached the end card reopens (`reopens: {after: 'end'}`).
- **Exits.** Recorded in `tests/fixtures/module-edges.json`, with the one host that waits: Do the Opposite's *No, it would
  make things harder* (the PRD's open question).
- **No routing row.** The PRD names no check-in cell for it; it is reached from Problem Solve, the Tools list and its
  intent.

## Where it departs from the PRD

- **No `EffectivenessStatement` nodes.** The piles are skill options carrying the `EffectivenessStatement` label (pile
  `right` / `effective` as a prop), the same for every goal; per-goal statements wait for content.
- **Two piles on one screen, not a drag sort.** The statements are already sorted (being right · getting what matters);
  the person taps what they want from each, then sees both on paper. Seeing both is the skill; a drag sort adds motor
  cost without changing what is seen.
- **The host's moves are re-voiced copies** of the two `SolutionDirection`s' steps (each option keeps a `PRESENTS` edge to
  its node), not read from the graph at run time.
- **Hand back is an offer, not a return.** A run opened from Problem Solve ends with the goal's next tool, Problem Solve
  among them for progress; it does not resume the Problem Solve run that opened it.
- **Person.safe.** The skill has no person picker, so *I'm scared of what they'd do* is the guard: the other_person
  resources and Ending careful, never a move list.
- **Do the Opposite** does not offer it yet (the PRD's open question; MF part 2).

## Part 2 (deferred)

| Item | Why it waits | Batch |
|---|---|---|
| Fade: full sort → goal and move → *Right, or what works?* embedded in hosts → nothing | Needs the fade levels on the Practice home | MF part 2 |
| Do the Opposite's *No, it would make things harder* offering it | The PRD's open question | MF part 2 |
| DEAR MAN's negotiate step and IE priorities as hosts | A hosted variant | MF part 2 |
| Per-goal `EffectivenessStatement` nodes | Content | MF part 2 |
