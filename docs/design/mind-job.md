# Give your mind a job (DT-06)

**Status:** built 12 Nov 2026 on the skill runtime (DT-B3, part 1; [the modules plan](dbt-modules-plan.md) §5.1).
New tool `mind-job` (routing's planned `accepts` renamed), listed under Distress Tolerance with the Tools intent
*My mind won't stop*. Source: `scripts/skills/mind_job.py`. The lid: `src/components/skillPlayer/LidShelf.tsx` over
`src/lib/lidShelf.ts`. Tests: `tests/skill-mind-job.test.mjs`. There was no old page (the low-energy result's
`attention-shift` guided activity is unchanged). Rolling back is removing `'mind-job'` from
`src/lib/skillRuntime/playerTools.ts` and the tool from `src/data/tools.ts`, and putting the `planned` flags back on
First, the body's and Hold to wait's `mind_job` exits.

## What it is

PRD DT-06 (Wise Mind ACCEPTS, DBT DT Handouts 7 and 9; Linehan 2015) for "my mind won't stop", or a feeling too big
to deal with now when nothing can be done tonight. Distraction helps, but with no return it turns into avoidance,
so every way in comes back: the tasks end in a check straight away, a break books a return card, and the lid books
a reopen. Nothing on the shelf is thrown away unopened.

## The flow

| Step | What the person sees | PRD DT-06 |
|---|---|---|
| `what` | *What would help right now?* My mind won't stop · A break from it for a while · Put it away until later | Entry |
| `heads_up` | A carried flooded reading, tasks only: *Your body's loud right now.* My body first → `settle` (First, the body) · A short find task (the coolest tasks only, and *more* never goes warmer) | Capacity: flooded |
| `warmth` | *What kind of job?* Something to find · Something I like · Something good (*Some days the warmer ones are harder. Any is fine.*) | The ladder, levels 0–2 |
| `to_find` · `to_like` · `to_good` | One task to pick at that warmth. Find: five blue things, the farthest sound, three round things, four things with straight edges. Like: one thing I like the look of, something soft, a sound I don't mind. Good: something I chose or made, something that reminds me of someone who likes me, something I'm looking forward to | Level 0 neutral, 1 pleasant, 2 positive |
| `do_<task>` | The task, eyes open (`orientFind`: tap for each one found, or *Heard it* for the listening ones) | Every task outward |
| `stay` | Good tasks only: *Stay with it for a few seconds.* (`bodyCard` kind `still`, 10 s) | Level 2's savouring |
| `how_<warmth>` | *How was that?* Too much · About right · Could do more · That's enough for now. Too much goes a step cooler (at the coolest: `too_much`, First, the body); more a step warmer; about right another at the same warmth; enough goes back to it | The person's own tap moves the ladder |
| `back` | *Back. Is it louder, the same, quieter?* Louder · About the same · Quieter · Much quieter (the session's close, `askFresh: 'thenVsNow'`, `regulation_down`). Louder → `louder` (First, the body, no close) | The return |
| `fork` → `end` | *Can anything be done about it right now?* Yes → Problem Solve, DEAR MAN · No, it can't be changed → Let it be · Not now → the lid · It's gone for now (*Your mind did a job, and it's quieter. That's the skill.*) | The fork |
| `break` | *What could you do for a while?* Move my body · Something with my hands · One small kind thing for someone · A different feeling on purpose · Something cold in my hand · own words. Never food, shopping, alcohol or scrolling | ACCEPTS' other families |
| `break_at` → `break_ok` | *When do you want to come back to it?* 5 · 15 · 30 minutes · When I'm done (about an hour). Books `mind_job_back`, whose card reopens this visit at `back` (`resumeAt`) | The return card |
| `lid_pick` | *Put it in something.* A jar · A tin · A box | The lid |
| `lid_shut` | *Put it in, then hold the lid shut.* (`lidShelf`: the swirl goes in, press and hold 3 s, the lid lowers, it sits on the shelf. Letting go early keeps nothing back; after the first try a quiet *Next* appears) | The hold |
| `lid_name` | *Want to give it a label?* A worry · Something someone said · Something I did · A feeling · Nothing to name yet · own words (optional) | The label |
| `lid_when` → `lid_end` | *When will you open it again?* Tonight · Tomorrow · In a few days (required). Books `lid_reopen` | The lid always books a reopen |
| `reopen` | From the `lid_reopen` card (`reopens: {after: lid_when, again: [repark]}`): *It's still on the shelf. Open it for five minutes?* Open it · Not yet → `repark` (a new time, once more booked) · It's gone → `lid_off` | The reopen |
| `opened` → `can_do` → `lid_off` | *Take the lid off. What's in there?* (pick the closest, optional), then *Can anything be done about it?* Yes → Problem Solve · It might not be as big as it felt → Check the Facts · No → Let it be · It's gone now | The reopen fork |

*Talk to someone now* is on every screen. Every end card (break, lid, louder, too much, settle) has no close
question; the close is the `back` check.

## The links that now open it

First, the body's fork (*Not right now*) and Hold to wait's end card for *checking* are built now (their planned
`mind_job` exits). First, the body's park line says *Then it can wait, with a time to come back to it.*

## What it records

`ToolSession.ext.run` (every answer and the path; each task's `done` / `partly` / `skipped` with the count found;
the lid's `shut` / `partly` / `skipped` with seconds held) and the spine's `thenVsNow` on the loop, direction down.
Own words (the break, the label) are capped at 40 characters and encrypted at close like every `ext` text field.
The return card and the reopen card are `FollowUp`s (`mind_job_back`, `lid_reopen`) whose deep links reopen the
run (R9); opening either resolves it (`OPEN_RESOLVES`).

## Routing

The three planned `accepts` rows (strain words on Alarm; annoyed as the alternative; disgust and hesitation on
replay) are `mind-job` rows now, built, switched off and drafts (`BUILT_NOT_SIGNED_OFF`). The concept keeps the
review's `side: acceptance`; its `skillKind` is `redirect` (it was `hold`), so it can sit beside Pause or Let it be as
a different kind of swap. `schema/app-tool-ids.cypher` gives `dbt_accepts` its `appToolId`.

## Deferred (DT-06 part 2)

- **The ladder remembered** (`AttentionLadderState`, the `attention_ladder` profile kind, §C2): the start level and
  graduation after easy visits. Part 1 lets the person pick the warmth each visit; remembering it needs a kept item
  and their yes.
- **Level 3** into ER-04's directory (*things I like*), when ER-B4 builds it.
- **The re-park heads-up** (*It's been put back a few times*) and counting re-parks.
- **Worry time** and **therapist-session** reopen times: the chips must equal the follow-up's window chips, and
  neither has a time to compute yet.
- **Comparisons with their own past** (*quieter than last time*), the Stage rooms' lid and the shelf as a place to
  look at, `cardDeck` (one card at a time; DT-03, DT-07 and ER-04 need it more), `holdRing` on the lid.
- The PRD's graph content: `AttentionTask`, `AcceptsOption`, `ReturnOption` and `ParkReopenOption` as their own nodes
  (the options carry those labels now), `ClinicalSource` rows, the `distract` rep.
- CORE-08 (the shelf on Today).

## Departures from the PRD

| PRD | Built | Why |
|---|---|---|
| The ladder starts where the last visit left off | The person picks the warmth each visit | Remembering needs a profile kind and the person's yes (part 2) |
| Level 3 (ER-04 things I like) | Not offered | ER-04 isn't built |
| Re-park: a heads-up after the third | *Not yet* always puts it back, with a new time | Counting needs part 2's record; nothing locks |
| Reopen times: worry time, after therapy | Tonight · Tomorrow · In a few days | Neither has a time to compute yet |
| *When I'm done* | A check-in after about an hour | A return card needs a time |
| The wave (ER-08) on the reopen fork | Not offered | ER-08 isn't built (ER-B5) |
| The lid as its own entry | A way in on this tool's first screen | One tool, three ways in; no separate tool id |

## Clinician pass (open)

- The task lists at each warmth, and whether *something that reminds you of someone who likes you* can sting on a
  lonely day (it's in the warmest list, which the person chooses).
- The break families and the excluded ones; whether *something cold in my hand* needs the DT-01 self-check (it's a
  cold object, not cold water).
- Whether the lid should ask anything before a reopen when the person was flooded when they put it away.
- Louder on return goes to the body with no further question; whether it should also offer the lid.
