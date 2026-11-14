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
| `heads_up` | A carried flooded reading, for the tasks or a break: *Your body's loud right now.* My body first → `settle` (First, the body) · A short find task (two choices only, five blue things or the farthest sound; afterwards only *Too much* or *That's enough for now*, so it never goes warmer) | Capacity: flooded |
| `warmth` | *What kind of job?* Something to find · Something I like · Something good (*Some days the warmer ones are harder. Any is fine.*) | The ladder, levels 0–2 |
| `to_find` · `to_like` · `to_good` | One task to pick at that warmth. Find: five blue things, the farthest sound, three round things, four things with straight edges. Like: one thing I like the look of, something soft, a sound I don't mind. Good: something I chose or made, something that reminds me of a kind moment, something for a plan I'm looking forward to (all eyes open) | Level 0 neutral, 1 pleasant, 2 positive |
| `do_<task>` | The task, eyes open (`orientFind`: tap for each one found, or *Heard it* for the listening ones) | Every task outward |
| `stay` | Good tasks only: *Stay with it for a few seconds.* (`bodyCard` kind `still`, 10 s) | Level 2's savouring |
| `how_<warmth>` | *How was that?* Too much · About right · Could do more · That's enough for now. Too much goes a step cooler (at the coolest: `too_much`, First, the body); more a step warmer; about right another at the same warmth; enough goes back to it | The person's own tap moves the ladder |
| `back` | *Back. Is it louder, the same, quieter?* Louder · About the same · Quieter · Much quieter (the session's close, `askFresh: 'thenVsNow'`, `regulation_down`). Louder → `louder` (First, the body, no close) | The return |
| `fork` → `end` | *Can anything be done about it right now?* Yes → Problem Solve, DEAR MAN · No, it can't be changed → Let it be · Not now → the lid · It's gone for now (*Your mind did a job, and it's quieter. That's the skill.*) | The fork |
| `break` | *What could you do for a while?* Move my body · Something with my hands · One small kind thing for someone · A different feeling on purpose: a song I love · Something cold in my hand · own words (*Something else that doesn't hurt you*). Never food, shopping, alcohol, scrolling or a show | ACCEPTS' other families |
| `break_at` → `break_ok` | *When do you want to come back to it?* 5 · 15 · 30 minutes · When I'm done (about an hour). Books `mind_job_back`, whose card reopens this visit at `back` (`resumeAt`) | The return card |
| `lid_pick` | *Put it in something.* A jar · A tin · A box | The lid |
| `lid_shut` | *Put it in, then hold the lid shut.* (`lidShelf`: the swirl goes in, press and hold 3 s, the lid lowers, it sits on the shelf. Letting go early keeps nothing back; after the first try a quiet *Leave it open for now* appears). A flooded reading goes straight here: holding it shut is containing | The hold |
| `lid_name` | *Want to give it a label?* A worry · Something someone said · Something I did · A feeling · Nothing to name yet · own words (optional) | The label |
| `lid_when` → `lid_end` | *When will you open it again?* Tonight · Tomorrow · In a few days (required). Books `lid_reopen` | The lid always books a reopen |
| `reopen` | From the `lid_reopen` card (`reopens: {after: lid_when, again: [repark]}`): *It's still on the shelf. Open it for a few minutes?* Open it · Not yet → `repark` (a new time, once more booked; *If it keeps coming back, someone can look at it with you.*) · It's gone → `lid_off` (*You came back to check, and that's enough.*) | The reopen |
| `re_heads` | Open it with a carried flooded reading: *Your body's loud right now. It can stay shut until you're steadier.* My body first → First, the body · Put it back for now → `repark` | Capacity: flooded |
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
replay) are `mind-job` rows now, live since 12 Nov 2026 (Claudia: default to connected); strain words get it first (not *pressured*, where Say no sits beside Problem Solve),
Problem Solve after. It is `CONTRAINDICATED_FOR` dissociation, primary or alongside, like Do the Opposite. The concept keeps the
review's `side: acceptance`; its `skillKind` is `redirect` (it was `hold`), so it can sit beside Pause or Let it be as
a different kind of swap. `schema/app-tool-ids.cypher` gives `dbt_accepts` its `appToolId`.

## Part 2

- **The park links open the lid** (14 Nov 2026, page entries): First, the body's *Not right now*, Hold to wait's
  *checking* and the Tools intent *Put something away until later* open `?enterAt=lid`, straight at *Put it in
  something*.

## Deferred (DT-06 part 2)

- **The ladder remembered** (`AttentionLadderState`, the `attention_ladder` profile kind, §C2): the start level and
  graduation after easy visits. Part 1 lets the person pick the warmth each visit; remembering it needs a kept item
  and their yes.
- ~~**Level 3**~~ **Built 14 Nov 2026:** *One of my things I like* on the warmth step, shown only once the person has
  kept a thing they like (ER-04's `thingsILike` slice, in `PROFILE_NEEDS['mind-job']`): their own things with their
  own labels, three minutes with one (`doseTimer`), then the return (*Back. Is it louder…?*).
- ~~**The re-park heads-up**~~ **Built 14 Nov 2026:** when the last round was put back too (`$prev.reopen` *Not yet* or
  `$prev.re_heads` *Put it back for now*), the repark title says *It's been put back before. That's okay.* Never a
  count, never fewer choices. (The booking field's own answer isn't kept on a reopen, so the round's way to the shelf
  is what's read.)
- ~~**Per-feeling ceilings**~~ **Built 14 Nov 2026:** a carried word for shame (ashamed, embarrassed, humiliated,
  ridiculed, worthless), grief (grief, abandoned) or rejection (rejected, excluded, lonely, isolated) keeps the ladder at
  find and like: no *good* or level 3 on the warmth step, and *Could do more* from like stays at like. Read through the
  runtime's new `$carried` ref; never named on screen.
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
| Per-emotion ceilings (shame, grief, rejection stay at levels 0–1) | Built (part 2): a carried word in those families keeps find and like | Only a carried word steers it: a visit from the Tools list has none, so the person picks the warmth as before |
| The `Thoughts` family (a 3-minute visuospatial puzzle) | Not offered | Needs its own embed |
| Count back from seven in the room's objects | Four things with straight edges | Counting backwards reads as a test; the clinician pass can bring it back |
| Label: three word guesses from Find the feeling's signatures | A fixed short list, or own words | The FTF signature read isn't on the runtime |
| Reopen in MF-01's reopen mode (outward first) | Straight to *What's in there?* | MF-01 isn't built |
| Reopen time: *I'll choose later* | Not offered: the lid always books a time | A lid with no time is the avoidance the PRD warns about |
| Entry from the rumination results, the kit, Problem Solve's rumination guard, DT-09 | Not wired | Their hosts aren't built yet |
| The ladder starts where the last visit left off | The person picks the warmth each visit | Remembering needs a profile kind and the person's yes (part 2) |
| Level 3 (ER-04 things I like) | Their own kept things I like, three minutes with one | Only what they kept: the catalogue isn't offered here (Good things is for that) |
| Re-park: a heads-up after the third | A heads-up from the second, worded without a count; *Not yet* always puts it back | The runtime keeps one round back (`$prev`), not a count; nothing locks |
| Reopen times: worry time, after therapy | Tonight · Tomorrow · In a few days | Neither has a time to compute yet |
| *When I'm done* | A check-in after about an hour | A return card needs a time |
| The wave (ER-08) on the reopen fork | Not offered | ER-08 isn't built (ER-B5) |
| The lid as its own entry | A way in on this tool's first screen | One tool, three ways in; no separate tool id |

## DBT handouts, step by step

| Steps | DBT DT handout |
|---|---|
| `warmth`, `to_*`, `do_*`, `how_*` | Handout 7, ACCEPTS: Thoughts / Sensations (eyes-open finding and listening) |
| `stay` | Handout 9, IMPROVE: Imagery, a few seconds of something pleasant |
| `break` | Handout 7, ACCEPTS: Activities, Contributing, Emotions (a different one on purpose), Sensations (cold in the hand) |
| `lid_*`, `reopen`, `opened`, `can_do` | Handout 7, ACCEPTS: Pushing away (put it in a box, on a shelf), always with a time to come back |
| `back`, `fork`, `end` | Handout 7's point that distraction is for now: the return, then Problem Solve (ER 12), Check the Facts (ER 8) or radical acceptance (DT 11) |

## Clinician pass (open)

- The task lists at each warmth, and whether the warmest ones can still sting on a lonely or grieving day (no
  per-emotion ceiling yet).
- `skillKind: redirect` is shared with Rebel without the wreckage, so the diversity rule never pairs the two on one
  result.
- The break families and the excluded ones; whether *something cold in my hand* needs First, the body's cold
  caution line (it's a cold object, not cold water).
- Whether the lid itself should check in first when the person is flooded (it goes straight to the hold now).
- Louder on return goes to the body with no further question; whether it should also offer the lid.
