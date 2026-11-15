# Take a moment apart (MF-07)

**Status:** built 15 Nov 2026 on the skill runtime (MF-B7; [the modules plan](dbt-modules-plan.md) §5.3a). Tool
`moment-apart` on the new concept `dbt_mindful_events` (DBT Mindfulness Worksheets 8 and 9, pleasant and unpleasant
events), listed under Mindfulness with the intent *Work out what a moment was made of*. Source:
`scripts/skills/moment_apart.py`. Tests: `tests/skill-moment-apart.test.mjs`. No new embed. Rolling back is removing
`'moment-apart'` from `src/lib/skillRuntime/playerTools.ts` and its entry in `src/data/tools.ts`.

## What it is

PRD MF-07: people can say "today was bad" or "that was nice" but not what the moment was made of. One moment split
into body, thoughts and feeling, then *were you aware of it while it happened?*. It's the most structured describe
exercise in the curriculum, and a direct alexithymia drill (KB §2.3). The good version is the bridge from neutral
attention to good things: a good moment can go into ER-04's Things I like. Two to three minutes, in a calm moment.

## The flow

| Step | What the person sees | PRD MF-07 |
|---|---|---|
| `which` | *Which moment do you want to take apart?* (*One moment from today or lately. Small is fine.*) Something good, even small · Something hard · Something in between | Step 1 |
| `heads_up` | A carried flooded reading: *Your body's loud right now.* / *This one works better once it has settled.* My body first (First, the body) · Go on anyway. The question is never replaced | Capacity: not flooded, never a lock |
| `heads_up_hard` | A hard moment on a carried stirred reading: *A hard moment can stir things up again.* Take apart a good one instead (back to `which`) · My body first · Go on anyway | Capacity: unpleasant only when settled |
| `what` | *What was going on?* With someone · On my own · At work or study · Outside · Online · own words. For a hard or in-between moment also *Someone hurt me or put me down* · *Something frightening or violent happened* · *I hurt myself, or thought about it* | Step 1's situation chips; step 7's routes |
| `recover` | *Someone hurt you or put you down.* / *That's worth more than taking apart. Recover is made for it.* Open Recover. No rep, no close | Step 7: offer Recover instead of continuing (MF Arch Map row 33) |
| `stop` | *Let's not go back into that one.* The `other_person` resources, Talk to someone now, Back to the room (Five senses). No rep, no close | Step 7: frightening or violent → stop and offer support; the trauma exclusion |
| `hurt` | The crisis banner and someone to talk to, opened straight away (`safetyFirst`). No rep, no close | Crisis route |
| `body` | *What did your body do then?* Where (up to two of the check-in's places, or nothing stands out) and what it felt like (the check-in's sensation words, led by the moment's side; up to three, or no words). Both optional | Step 2 |
| `thoughts` | *What went through your mind?* (*Not the words, only what kind.*) About me · about someone else · about what happens next · about what it meant · no thoughts I noticed. Up to two | Step 3 |
| `feel` | *What were you feeling?* Grid words as guesses, led by the moment's side, a carried word first, *Something else* for the full list; *I can't tell* (or nothing) is a full answer | Step 4 |
| `aware` | *Were you aware of it while it was happening?* Yes · Partly · Only now (*Noticing later counts.*) | Step 5 |
| `savour` | Good only: *Stay with the good bit for a few seconds.* (`holdRing`, 10 s, no breath instruction) | Step 6 |
| `keep` | *What was the good bit?* Good things' own kinds (the same ids, so Me and the Things I like slice name a kept one) or own words, and *Keep it in Things I like?* (`thing_i_like`, R4: the tap is the yes) | Step 6's hand-off to ER |
| `end` | Good: *Kept. Good things are worth finding again.* or *You took a good moment apart. It's easier to find the next one.*; hard: *That was hard. You took it apart instead of carrying it whole.*; in between: *You took one moment apart. That's the skill.* Then *And you noticed it while it happened.* or *Next time, see if you notice one while it's happening.* Offers: Plan more of this (Good things) for a good moment, Find the word for the feeling when it was hard to tell, Look at the thought about me (Unpack a judgment) for a hard moment with a thought about me | Step 7's close |

*Talk to someone now* (`safety.open`) is on every screen. Close kind `none`: the description is the outcome
(`noClose`). A completed visit is a `describe` rep: `moment-apart` joins the `describe` PracticeSkill's tools
(`MF_SEQUENCE`), so the Practice home lists it under *Name*. The three routes are not completed visits, so they log no rep.

## Where it departs from the PRD

- **No silhouette.** The body step uses the check-in's places as chips instead of the Shape silhouette; the
  sensation words are the check-in's `SensationType`s (the same graph nodes), so a body tag means the same everywhere.
- **No Stage for *what happened*.** Chips only.
- **The anhedonia guard is copy, not history.** The PRD keeps the good prompt from someone whose last three check-ins
  were low drive or freeze until a neutral Notice what's here closed *here*. Skills don't read check-in history, so
  the good option says *even small*, *in between* is always there, and no line asks for gratitude (test-pinned). The
  history rule waits for the Practice home's reading history (part 2).
- **One moment a day isn't enforced.** One moment a visit, and nothing reopens the run (no follow-up). A daily limit
  needs the visit history (part 2).
- **No `MomentPrompt` / `DescribeWord` nodes.** The situation and thought chips are skill options carrying those labels
  (`graphLabel`), the body words and places `PRESENTS` their `SensationType` / `BodyRegion` nodes.
- **The FTF short word isn't embedded.** Grid words as guesses, the full list behind *Something else*, and Find the
  feeling offered at the end when the feeling was hard to tell.
- **ER's "more of this".** The end card opens Good things (its plan for today) instead of a card booked from here.

## Part 2

| Item | Why it waits |
|---|---|
| Fade: one channel, then only the awareness question, then off-phone noticing reported in the evening | The Practice home's fade levels |
| The evening practice by default for an evening time (PRD open question) | The Practice home's pick weights |
| The anhedonia history rule, one a day | Reading history on the home |
| The silhouette and Stage rooms | The shared rooms |
| Entries: the positive-state result's *Keep this moment?*, Notice what's here's Look graduation, the diary card | Each host |
