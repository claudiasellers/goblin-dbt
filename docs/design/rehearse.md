# Rehearse it (IE-02)

**Status:** part 1 built 12 Nov 2026 on the skill runtime (batch IE-B5 of [the modules plan](dbt-modules-plan.md), the
last of its three skills).
- **Tool:** `rehearse`, listed under Interpersonal Effectiveness with the Tools intent *Practise a hard conversation*.
- **Concept:** the new `dbt_behavioral_rehearsal` (`appToolId: 'rehearse'`, `PART_OF` `dbt_interpersonal_effectiveness`).
- **Source:** `scripts/skills/rehearse.py`.
- **Page:** `src/pages/tools/Rehearse.tsx`, which uses `PersonFirstSkill`, so the picker and D4's safety question come first.
- **New embed:** `rehearsalStage` (`src/components/skillPlayer/RehearsalStage.tsx` over the pure `src/lib/rehearsal.ts`).
- **Test:** `tests/skill-rehearse.test.mjs`.
- **Close kind:** `regulation_down`, asked in the flow (`askFresh: 'thenVsNow'`): *Saying it for real feels… harder · about the same · easier · much easier*.
- **No projection, no follow-up type:** `ToolSession.ext.run` only (D2).
- **Rolling back:** remove `'rehearse'` from `PAGE_SKILLS` and `toolComponents`, remove the tool from `src/data/tools.ts`, and set the hosts' `rehearse` exits back to `planned`.

**Spec:** PRD IE-02 in `PRD – Interpersonal Effectiveness.md`; DBT IE Handouts 5 (DEAR MAN, broken record, appear confident, negotiate), 6 (GIVE) and 8; McFall 1973 on behavioural rehearsal.

## What it is for

The person says *I know what I want to say. I'll freeze or cave when they push back.* The skill gives the feared
conversation a script, a rehearsed middle and an ending the person has already been through once. They choose how hard
the other person is, and stopping always counts.

## Who first

The page asks *Who's the conversation with?* with the person picker, then D4's safety question when that answer isn't fresh.
- If they might hurt or control the person, or the person would rather not say, the safety screen shows: *With {who}, your safety comes before any practice conversation.* It shows the other-person resources and Ending with `frame=careful`, and never the skill.
- *It tends to go badly* is the `heads_up` frame: the tier screen adds *With them, practising a calm way out can help too.*
- A kept person's own label names their figure on the stage (the `people` slice); otherwise it's *Them*.

## The flow

| Step | What the person sees | PRD IE-02 |
|---|---|---|
| `kind` | *What's the conversation?* Asking for something · Saying no · Setting a limit · Bringing up a problem · Making a repair. A host's `?situationId=` puts its kind first. A carried flooded reading sees *Practising works better once your body settles. The easy version is here if you want it now.* and *Settle my body first* | 1. Set up (the situation type) |
| `line` | *What's the first thing you'll say?* Three starter lines for the kind, or own words (90 characters) | 1. One lead line |
| `tier` | *How will they respond?* (*You choose how hard. Stopping always counts.*) The easy version · Realistic · The hardest likely · Practise leaving. Stirred, or *it tends to go badly*: no hardest. Flooded: easy or leaving only | 2. Band; 3. Choose how they'll respond |
| `stage` | The two figures (`rehearsalStage`). Your line in your bubble: *I said it out loud* / *I said it in my head*. Their reply from the script with a pose (open, closer, arms folded, turned away, still). Your move from that reply's chips. Three replies, with your line and their reply both on screen. Stop always on screen (on their last reply it counts as finished). Practise leaving starts from the step-out line, and *Say it again* holds it while they push. Each tap moves focus to what's new, and a pose is read with its line (*Them, arms folded: …*) | 4–7. Your line, their response, your move, repeat |
| `ifthen` | After the hardest version (finished or stepped out, not stopped) or *I'd lose it here*, and optional: *If it goes that way for real, what will you do?* Say my line again, calmly · Acknowledge them, then come back to it · Name what's happening · Step out and come back later · End the conversation | 8. If it goes badly (one if-then) |
| `close` | *Saying it for real feels…* Harder · About the same · Easier · Much easier, with *You practised it. That counts.* or *You stopped. That counts too.* *Harder* goes straight to the end | 9. Then vs now |
| `ready` | *Could you say it for real?* Sure · I think so · Not sure | 9. Readiness |
| `end` | *That's the practice.* (or *For the hard moment: {plan}.*) Then *The real conversation is yours to choose. Planning it can help.*, or *Another practice can help…* on not sure, or *Saying it for real feels harder right now. Settle your body first, or leave it for today.* on harder. Offers: Plan the conversation (the prep, with the person; never after harder) · Plan for the hardest moment (Cope Ahead, after an if-then, never after harder) · Practise again (the same kind, with the person) · Settle my body (after harder) | 9. Schedule the real conversation or another rehearsal |

*Talk to someone now* is on every screen. No screen shows a number.

### The moves

Each move is a DEAR MAN, GIVE or FAST move, or the walk-away point, and the figure says it:

| Move | Letter | What you say |
|---|---|---|
| Say it again | M (broken record) | your own line |
| Acknowledge, then come back | GIVE V + M | *I hear you. And this still matters to me.* |
| Name what's happening | M (mindful, stays on it) | *I notice we keep moving away from it.* |
| Offer a middle | N | *Could we find something in between?* |
| Ask what would work for them | N (turn the tables) | *What would work for you?* |
| Step out, come back later | walk-away point (GIVE's break) | *I'm going to take a break and come back to this.* (ends it) |
| End the conversation | walk-away point | *I'm done with this conversation for now.* (ends it) |
| I'd lose it here | | ends it at once, then the if-then |

Easy replies offer again, acknowledge, ask what would work and end it. Realistic replies offer again, acknowledge, a middle, ask what would work and step out. The hardest offer again, acknowledge, name it, step out, end it and *I'd lose it here*. Practising leaving offers say it again (the step-out line), step out and end it. A repair never offers *Say it again* (FAST: no extra apologies), and a no never offers a middle.

### The scripts

Five kinds × three tiers, three replies each, plus one *practise leaving* script for any kind (16, all in `SCRIPTS`).
Every line is plain and never abusive: no slurs, threats or swearing, and nothing about hurting anyone (test-pinned). No line re-invalidates (*too sensitive* and the like are out), and nobody steps closer on the hardest version or the way out: their pressure to stay is words, never blocking the way (Gate 2).
A line in brackets is what they do (*(They go quiet and look away.)*), shown in italics.

## Saved

- `ToolSession.ext.run` holds the run: the kind, the line (own words encrypted at close), the tier, the stage's output (the moves used, `aloud`, how it ended: `finished` · `stopped` · `lost_it` · `stepped_out`, never the player's inline `left`, which records no rep; the exchanges as `doneCount`), the if-then and readiness.
- The close's answer is the session's `thenVsNow` (ask-fresh).
- No `RehearsalSession` label (D2).

## Routing

`CONCEPT_TAGS['rehearse']`: side change, skillKind relational, direction neutral.

One word row is live (12 Nov 2026): *hesitant* (On replay) shows Check the Facts first and Rehearse it beside it. Not
*guilty* or *remorseful* (Check the Facts, then Keep it warm's repair). No `ADDRESSES` edges, as for Notice them.

## Entry points

- The Tools list and the intent *Practise a hard conversation*.
- DEAR MAN's prep end card: *Practise it out loud* (`situationId=ask`, the person).
- DEAR MAN's debrief: *no words* (not after it escalated) and *not yet* (`situationId=ask`, the person).
- Say no: *I gave in* and *said it in person* (`situationId=say_no`, the person).
- Keep it warm: the repair's sent card (`situationId=repair`, the person).
- FAST's review end card (`situationId=boundary`).
- Ending a relationship, after the line, on the safe path only and never when it harms them (`situationId=boundary`). Ending saves nothing by default; a rehearsal from there is a normal visit and saves its own run.
- The check-in result for *hesitant* (Routing above).

## Departures from the PRD, and the batch that picks each up

| PRD | Part 1 | Later |
|---|---|---|
| 5 kinds × 3 tiers × 2 variants = 30 scripts | One script per kind and tier (15) plus practise leaving | More variants, and ending and repair kinds of their own, once the debrief's turning points are read per kind |
| `RehearsalScenario`, `RehearsalTurn`, `RehearsalMove`, `RehearsalFlow` nodes `IMPLEMENTS` the DBT concepts | The skill's options (graph content through `skills.cypher`); each move carries its letter | When a second surface needs them |
| Prompt fade (full line → first three words → blank), tier advance, off-phone reps after three blank-prompt rehearsals | Not built: no reading of past rehearsals yet. The full line always shows | A runtime read of the person's own past runs (the MF fade, D3) |
| Cap of two rehearsals per plan per day | Not built (as above) | The same |
| Close schedules the real conversation (IE-01 FollowUp) or another rehearsal | The end card opens the prep, whose saved plan books `ask_outcome`; *Practise again* restarts with the same kind | A `rehearse_again` follow-up if people ask for it |
| Unsafe person: only *practise leaving* | The picker's safety route shows the other-person resources and Ending, never the skill. *Practise leaving* is offered to everyone | A clinician review of exit practice for someone at risk |
| Cope Ahead's if-then embedded inline | One if-then in the flow, and Cope Ahead (`situationId=conversation`) as an end-card exit | Inline Cope Ahead (R8) once its inline entry fits |
| Stage room (3D) with distance and height from Recover v2 | 2D only (D12), fixed distance | The Stage room, with Recover v2 |
| `SkillPractice` rep `rehearsed` tagged with the letters | The close; the moves are in the run | CORE reps |
| Metrics: rehearsed vs unrehearsed plans, prompt level, *used my line* | Not wired | Insights |
| Voice memo, LLM-generated turns (open questions) | Neither: fully scripted, no recording | Open |

## Risks (PRD) and what answers them

- **Re-exposure to feared or abusive scenes:** the person picks the tier; the safety route before the skill; no abusive line in any script; Stop on every exchange, and stopping counts; *Talk to someone now* on every screen.
- **Rehearsal becoming worry:** the end card always plans the real conversation or ends; *harder* on the close settles the body and never plans it now. The daily cap is a departure (above).
- **Low-end phones:** the stage is one small SVG and CSS transitions, `motion-safe` only.
