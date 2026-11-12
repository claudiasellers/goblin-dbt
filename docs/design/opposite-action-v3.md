# Do the Opposite v3 on the skill runtime (ER-03, batch ER-B3)

Status: **part 2 built** (12 Nov 2026; *As built* below says where the build departs from the design tables). The PRD is `prd-emotion-regulation.md` ER-03 (audit §3.3); D7 and D9 in
`dbt-modules-plan.md` decide its scope: PR #48's doors are merged first and kept as an embed, multi-feeling becomes
per-feeling sub-runs (R16), and every clinical change in ER-03 is in, as the PRD has it. Tool id, URL and
`OppositeActionSession` stay; the hand-built page stays in the tree, unrouted (C8.4), and rolling back is removing
`'opposite-action'` from `src/lib/skillRuntime/playerTools.ts`.

Two PRs:

1. **The hand-built page, refreshed** (built, #89): PR #48 replayed onto main (D7: "merge it as it is first"), the two
   route fixes the old page can take now (`not_fit:helpful → clarify`; clarify opens Check the Facts), the interpersonal
   urges, and the support route's `other_person` resources with Ending careful before Pause (plan C6 rules 4 and 8).
   Everything else in ER-03 is part 2, below, with the batch ER-B3.
2. **The port** (this design): `scripts/skills/opposite_action.py`, its embeds, the `OppositeActionSession` v3
   projection, and the runtime pieces it needs (each its own `runtime:` commit for the plan
   thread).

## As built (part 2)

`scripts/skills/opposite_action.py`, played under the `opposite-action` tool id (`playerTools.ts`). Steps, in order:
`door` (the `doorPicker` embed: #48's start screen as it is; reports up to three grid words, loudest first) → `calm`
(a settle hold, only for a carried flooded reading) → `goal` → `safe` (the goal, then the safety split on its own screen, once) → `dang` / `bnd` /
`uns` (danger: the `other_person` slot, Ending careful, Hold to wait; a boundary: FAST, DEAR MAN, Hold to wait; not
sure: the slot and Hold to wait) or, per feeling, `vald` (the first sentence of the parent's acknowledgment as the
title, ≤ 90 characters; its urges, own
words) → `want` (*No* → `keep`: Problem Solve, DEAR MAN, Ride it out) → `fits` (the parent's fit statements above the
verdict; *Check the facts properly* quietly) → `help` → the route: `repr` (guilt or shame, fits, goal repair), `prob`
(fits or too big + helpful; too big offers First, the body first), `cue` (the graph's `opposite`), else `clar` (Check
the Facts; its own line for doesn't fit + helpful). Each route hand-off offers *Carry on with the next feeling*; with two or three feelings, every per-feeling screen says which one it is about (the parent's noun in its title, and the player's small *anxious · 1 of 2* header, `pickTrack`). On the
opposite route: `cue` (the urge's own cues, or the parent's unless the urge replaces them) → `hold` (press and hold the
cue) → `aftb` (the pull compared with before, `thenVsNow`) → `size` (the urge's three steps, or the parent's defaults
for an urge in your own words). Then once: `pred` (what you expect, optional) → `when` → `try` → `aftr` → `act` → `tvna` (what
happened, what actually happened, the pull, one per screen: `thenVsNow`, newest wins) → `read` (one line: the prediction gap first,
only when it went well (*Nothing much* or *Better than I thought*), then partial / unclear, then the pull); or `plan`, whose chip books **`oa_try`** (*Did you get to try it?*), which
reopens the run at `back` → `aft2` → `act2` → `read2` (no pull asked: a reopened run reads nothing ask-fresh) or `miss` (the
reason; too strong offers Hold to wait).

Safety: *Punish yourself* (`guilt-punish`, `danger: self`) opens `safety.open` over `want` (`safetyFirst`) and keeps the
crisis banner on that feeling's screens. Kept (*No, I want to keep it*) or answered helpful (whatever the fit), it
goes to `pun` instead (*The pull to punish yourself deserves care*: Problem Solve or Ride it out, never "worth
keeping" or a plan to act on it; the banner stays). The danger and not-sure answers keep the `other_person` slot; *It felt
unsafe* shows it on the readout, which then says *Your safety comes first* and never a prediction-gap line, and offers Hold to wait.

Saved: `ext.run`; close kind `regulation_down` (the in-flow then-vs-now is the close); `urgeIds` are each feeling's urge
(option `urge` props); the projection (`functions/src/oppositeAction/projection.ts`) writes one `OppositeActionSession`
**v3** per feeling that reached `size` (ids only: `emotionId`, `parentId`, `urgeId` or `custom`, `actionSize`, `goal`,
`facts`, `effectiveness`, `cueId`, `outcome`, `predict`, `actual`, `thenVsNowBody`, `status`), `DETAIL` from the visit,
after re-checking the word (`oppositeActionApplicable`), the urge (its parent's) and the route (the graph's `opposite`,
not the repair rule) on the server. A reopened visit moves the first visit's records to `practiced` or `missed`; its rep is off the phone when it was
tried and none when it wasn't (`OFF_PHONE_SKILLS.opposite_action`), as the hand-built page logged none for a missed plan. The
parts stats read v3 as they read v2 (`actionSize` in `dataJson`, `TARGETED_URGE`); the hand-built page's lists read v2
only. With parts on, the close's tag row (`TAG_ROW_TOOLS`, `PROFILE_NEEDS['opposite-action'] = ['parts']`).

Old links: `?followUp=<id>` without `run` (the `oa_plan` cards the hand-built page booked) still opens the hand-built
page (`legacyLink`). **Remove it, and the hand-built page's route, 7 days after this port deploys** (`oa_plan` goes
stale after 168 h).

Departures from the tables below. Each says why, and the batch that picks it up (ER-B5 is the ER lane's next
polish batch, with Check the Facts' inline mini-card; "none" means it stays this way by design):

- No `elsewhere` step: the doors offer only words Do the Opposite works on, and #48's start screen says the rest on
  screen. *None.*
- `flood`: a settle hold before the goal, then the same flow. The small step is always listed first, for everyone; it
  is never pre-selected (nothing is pre-filled), so there is no band- or then-vs-now-driven default and no deferred fit
  check yet. *ER-B5* (the deferred fit check).
- `bodyReset`: per-feeling cue chips (the urge's own body cues, or the parent's) and a press-and-hold of the one picked,
  instead of the hand-built page's card grid; the cue is optional (the old *None of these work for me*). The rich
  moment is the hold. *ER-B5* if the gallery shows the grid is missed.
- `stepPicker`: the size step's three options, each led by its size name (*A small start*, *A little further*,
  *Fuller practice*), plus your own; the step card (`oaSteps`) shows the chosen steps on *When*, *Try it now* and
  *Did you get to try it?*. *None.*
- Prediction and what happened are asked **once per visit**, after every feeling, not per feeling: with up to three
  feelings, three predictions in a row read as a form. The projection copies the one answer into each feeling's record.
  *None* (revisit if per-feeling predictions are asked for).
- `fits`: the fit statements as a list above the verdict, not the `fitStack` card embed. *ER-B5.*
- `readout`: a hand-off with one line, not the `urgeReadout` embed; no then-vs-now bar. *ER-B5.*
- Parts lines (the unblend line under the urge, the goal line above `help`): not placed yet (the old page has them).
  *ER-B5*, with the parts lane.
- H10 step 5's "all the way" opposite thoughts and words: only the body is worked (the cue and its hold); the
  steps carry the action. *ER-B5* (a line on the cue or step screen).
- `repr` opens Problem Solve with no frame (Problem Solve doesn't accept `repair` yet). *ER-B5.*
- `oa_plan` → `oa_try` (a skill follow-up whose card reopens the run, as `ps_review`; `followUpResume` is the runtime's
  R9 reopen); one card per visit, not per feeling. `ext.er.oaFacts / oaEffect / oaRoute` are not written (the run
  holds them; Reflect reads close answers). *None.*
- The check-in's `activationPatternId` (route state the hand-built page read for its tool suggestions) isn't read: the
  skill's exits don't depend on it. *None.*
- `UrgeTrend` stays on the hand-built page; v3 has no numbers to trend. *None.*
- The readout's *Not sure* re-ask and the loop guard (third same/louder in 7 days) need server-side reads. *ER-B5.*

## The flow (design)

One visit, in order. Steps marked *(per feeling)* run once for each picked feeling, loudest first (R16, below).
Copy is re-voiced in `COPY`; the clinical content stays in the graph (`schema/opposite-action-data.cypher`,
`schema/opposite-action-flow.cypher`), read without a database through the schema replay (`scripts/skills/oa_graph.py`,
as Problem Solve's `ps_graph.py` does), and every option keeps a `PRESENTS` edge to the node it shows
(`ActionUrge`, `EmotionRegulationContent`).

| Step | Kind | What it asks / does | Notes |
|---|---|---|---|
| `door` | embed `doorPicker` | One door per DBT parent, led by its typical urge; the three other ways in (the urge, the body, not sure) and search, as in #48. Up to three, ranked loudest first | Answer `feel` (grid ids, loudest first). A hand-off's words arrive pre-ticked on their doors (carried, the same visit's), never chosen for the person: one carried word still needs its tap |
| `elsewhere` | handoff | A word Do the Opposite doesn't cover: its alternative skill (`oaAlternativeSkill`) | Check the Facts built; `mindfulness-emotions`, `body-scan`, `please-skill`, `name-it` are planned exits (never offered until built); *Done* always |
| `valid` *(per feeling)* | ask | **Validation first** (item 1): the parent's acknowledgment as the title, then *What is it pushing you to do?* (the parent's urges in `order`, plus own words) | The unblend line (`partsLine`, parts on) under the urge. `$ctx.urgeId` first, never selected |
| `flood` *(per feeling, flooded only)* | embed `bodyReset` | A carried flooded reading (item 2): the body reset before anything else | Then straight to `step` with the small size first; the fit check is deferred to the follow-up |
| `want` *(per feeling)* | ask | **Do I want to change it?** (item 3): *Yes, turn it down · Not sure · No, I want to keep it* | *No* → `keep_it`. *Not sure* goes on; the readout asks again |
| `keep_it` | handoff | "Some feelings are worth keeping. Want help acting on it well?" | Problem Solve, DEAR MAN, Ride it out. Nothing recorded as a failure; the visit is complete |
| `fits` *(per feeling)* | ask | **Fits the facts as a card stack** (item 4): the parent's `fitsTheFactsWhen`, one per card, *Yes · Not really · Can't tell* (embed `fitStack`), then the verdict on the same screen | Verdict chips: fits · fits but too big · doesn't fit · can't tell. *Check the facts properly* is a quiet link (Check the Facts) |
| `goal` *(once)* | ask | *What do you want this moment to help you do?* and the **safety split**: *Safe to try something different · There's danger · There's a boundary I need to keep · I'm not sure what's safe* | Danger → `other_person` crisis slot from here on; boundary and not sure → `support`. Asked once for every feeling (as #48) |
| `help` *(per feeling)* | ask | *If you follow this urge, will it help that?* | The goal line (parts on) above it |
| route | handoffs | **Route table v3** (item 5), graph-owned (`OppositeActionFlow.routes`, read into transitions at build): | |
| | `clarify` | doesn't fit + helpful, or can't tell: "It may be serving a different goal." **Check the Facts** (item 6) | ER-B5 (built 12 Nov, Gates 2–3): *I still do not know* runs Check the Facts inline (the `ctf` step, *A closer look at {the feeling}*), never with a flooded reading (this card says the facts can wait, with First, the body). The verdict stands in for *does it fit?* in the graph's table with the earlier *will it help?* (fits → fits, partly → excessive, doesn't fit → not fit), after three rules: a danger chip or the safe card → this feeling's danger card (`cdng`: the other-person resources, the Punish banner kept, Ending careful, Pause, no close, no carry-on); guilt or shame that fits with the repair goal → repair; *Punish yourself* that fits → its own hand-off. A verdict that leaves a question gets this card with its own line and Wise mind; not sure is *You don't have to decide yet*; leaving early is *The facts will keep*, with the full check as a link. Every other clarify row keeps this card as it was. The projection records a feeling that reached its step through the check (`factsChecked: doesnt_fit`) |
| | `problem` | fits + helpful; fits-but-too-big + helpful gets the **down-regulation offer first** (First, the body), then Problem Solve | |
| | `repair` | guilt or shame, fits, goal *repair harm* (H11): Problem Solve opened on repair | `?frame=repair` (planned exit until Problem Solve accepts the frame; until then Problem Solve with no frame) |
| | `support` | not safe, boundary, not sure | Pause (Hold to wait); danger keeps the `other_person` slot |
| `body` *(once)* | embed `bodyReset` | The body reset (#48: up to three cues taken in turn from each feeling's urge, loudest first; `somaticReplace` honoured) | Output: cues done, the escape used |
| `after_body` *(per feeling)* | ask | *The pull to {urge}, compared with before?* | `askFresh: thenVsNow` (the spine's four ids; no number) |
| `step` *(per feeling)* | ask | **Pick a step**: small · a little further · fuller practice · my own (the urge's graduated opposites, else the parent's defaults); the body-opposite line under it | Flooded or `after_body` *worse*: small first (replaces `capacityDefaultSize`'s ≥7) |
| `predict` *(per feeling)* | ask | **If you do it, what do you expect?** (item 7): *It'll go badly · I'll feel worse · They'll react badly · Nothing much · Not sure* | Optional |
| `when` *(once)* | ask | *When will you try it?* now · next chance today · when this urge shows up again; due window for later | Later: `oa_plan` (R5, `whenFrom`), the reminder `.ics` stays a quiet link |
| `try` | ask | Now: *Try it, then come back.* *I tried it · Plan it for later* | |
| `after` *(per feeling)* | ask | *What happened?* (outcome), **What actually happened?** (the prediction chips), *The pull, compared with before?* (`thenVsNow`) | |
| `readout` | embed `urgeReadout` | **Readout v3** (item 10): the behaviour fact first, then the prediction gap ("You expected it to go badly. It didn't."), then the urge as a then-vs-now bar. No "n/10" | *Not sure* on `want`: "Do you want to keep working on this one?" |
| `review` | ask, `reopens: {after: 'when'}` | The follow-up (R9), from Today's `oa_plan` card: *Did you get to it?*, *What actually happened?*, missed reasons and their routes; for a flooded start, the deferred fit check | Opened by `?run=<id>&at=review` |

**Interpersonal urges** (item 8, built in part 1): *Text them again* (love), *Check their profile* (jealousy, love),
*Pull away from them* (shame, sadness), *Fire back* (anger), *Go quiet on them* (shame, sadness): new `ActionUrge`s with
graduated opposites and cues, each mapped in `scripts/parts/content.py`. Gate 3 on #89 moved them off sadness where the
urge reaches toward someone (sadness's opposite is approach) and off anger where `anger-stonewall` already covers it,
and made *Fire back*'s steps the opposite of anger rather than assertiveness.

**Engine contraindication** (item 9) is already routing content: Do the Opposite is `CONTRAINDICATED_FOR`
dissociation, and the freeze row `requiresPrior: up_regulation`. Inside, `numb`-family words keep their redirect
(`elsewhere`).

## What's saved (design)

The run is the `ToolSession` with `ext.run`, as every skill. The projection (`PROJECTIONS['opposite-action']`,
R14) writes, in the same transaction:

- one `OppositeActionSession` **schemaVersion 3** per feeling that reached `step` (as #48: one per feeling), `DETAIL`
  from the visit's session: `wantChange`, `fitCardAnswers[]`, `facts`, `effectiveness`, `route`, `prediction`,
  `actual`, `bandAtStart`, `urgeThenVsNowAfterBody`, `urgeThenVsNowAfterTry`, `actionSize`, `action` (own words
  encrypted), `cueId`, `dueAt`, `status`. **No numbers.** Readers (Today's card, `UrgeTrend`, Reflect, parts stats)
  handle v1–v3: v3 has no `urgeBefore`, so the trend shows then-vs-now and v1/v2 keep their numbers.
- the `oa_plan` follow-up for a plan for later (one per feeling, as #48), and `ext.er.oaFacts / oaEffect / oaRoute`
  for Reflect.
- a review visit (`review`, RESOLVING the `oa_plan`): updates the feeling's session (`planned → practiced | missed`,
  `missed → practiced`, never back) and resolves the follow-up. `oa_plan` joins `OPEN_RESOLVES`.

The server keeps re-validating the route: the projection recomputes it from the stored answers against the graph's
table and refuses a session whose step was reached on any route but `opposite`.

The session's `urgeIds` are the visit's picks (one per feeling), `emotionIds` the picked words, `thenVsNow` the latest
`after` answer (newest wins across feelings). Close kind becomes `regulation_down` (the plan thread, 12 Nov: an in-flow
check alone is DT-01's kind; `urge_change` is the two-part close), so the then-vs-now answers mean what they say; the
in-flow answers are the close, and no `SessionClose` follows. `urge_change` with *Did you act on the urge?* on the
review visit, when the person knows, can follow with the review step.

## Runtime pieces (for the plan thread)

1. **R16 per-pick repeat.** `forEach: {field, steps: [stepId…]}` on the skill: the listed steps run once per pick of
   `field`, in pick order. Inside, `$each` is the current pick (and `$d.*` derives from it: `parent` from `$each`);
   answers are stored per pick and recorded with `pick: <id>` in `ext.run.answers` (≤ 3 picks, so the 32-answer
   cap holds: OA's longest is 3 × 7 + 6). Back steps within a sub-run, then into the previous pick's last step.
   A sub-run that leaves to a route hand-off sets that pick aside (#48's "Carry on with …"): the hand-off offers
   *Carry on with the others* when others are still on the opposite route.
2. **Carried words in an embed.** `EmbedProps.carried` (the run's carried grid ids), so the doors can pre-tick them.
3. **An embed answer that is an emotion field.** `answerAs` an `emotionFields` entry: the ids must be grid words
   (checked like an emotion pick), so `setEmotionIds` and `$d.parent` read them.
4. **Close kind `regulation_down`** with the in-flow `thenVsNow` (DT-01's rule), no `SessionClose` after it.

Agreed by the plan thread (12 Nov), with: per-pick answers keyed by pick (conditions and derives read `$each`'s; the
newest in-flow check across picks is the session's `thenVsNow`; `emotionIds` from the feelings field only); `pick` in
the server's `ext.run` schema and a contract test for the longest record (3 × 7 + 6 answers, 12 ids each, under 4 KB
and 32 answers, since `runRecord` would otherwise truncate silently); R9 resume keeps the pick in each path entry and
drops only within the sub-run it resumes; a set-aside pick's hand-off carries only that pick's emotion, and *Carry on
with the others* records the offer, not the exit; the grid check on an embed's emotion answer runs on the server too.

## Also in part 2 (from #89's gates)

- *Punish yourself* (`guilt-punish`) can mean self-harm: on the port its pick opens `safety.open` first (C6.5), as Hold
  to wait's *Hurt myself* does, with the crisis slot after.
- The `not_fit:helpful` clarify card gets its own line: "The feeling doesn't fit the facts, and acting on it still seems
  helpful. It may be serving a different goal."
- The readout's *It felt unsafe* shows the `other_person` slot today (988 is on it); the danger / boundary / not-sure
  split decides whose danger it is and which variant shows.

## Departures from the hand-built page (for sign-off)

- No 0–10 numbers anywhere: urge strength becomes then-vs-now after the body and after trying; the feeling rating is
  dropped (PRD open question: dropped, not kept as an optional line).
- Validation before the check; *Do I want to change it?* is back (one tap).
- Fit statements are cards, not a collapsed list; the observe / meaning boxes move to Check the Facts.
- `not_fit:helpful → clarify`; clarify opens Check the Facts; a repair route for guilt and shame.
- The safety question splits danger (crisis slot, other person) from a boundary and not sure.
- Prediction vs what happened, asked once per visit and stored on each feeling's record.
- The small step is listed first for everyone and never pre-selected; no size default from a number ≥ 7.
- Repair (PRD open question): Problem Solve with the repair frame, not a plan inside Do the Opposite.
