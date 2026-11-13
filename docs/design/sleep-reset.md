# Sleep reset (ER-13)

**Status:** part 1 built 13 Nov 2026 on the skill runtime (ER-B5; [the modules plan](dbt-modules-plan.md) §5.1, D3).
New tool `sleep-reset` (the id Running low and Rewrite the nightmare already pointed at as planned), named *Sleep
Reset*, listed under Emotion Regulation with the Tools intent *I can't sleep*. New concept `dbt_sleep_hygiene`
(`PART_OF dbt_reducing_vulnerability`, beside PLEASE; `appToolId: 'sleep-reset'`). Source:
`scripts/skills/sleep_reset.py`. Tests: `tests/skill-sleep-reset.test.mjs`. New follow-up type `sleep_morning`
(`scripts/practice-spine/content.py`). Close kind `none`. Rolling back is removing `'sleep-reset'` from
`src/lib/skillRuntime/playerTools.ts` and the tool from `src/data/tools.ts`, and marking Running low's and Rewrite the
nightmare's `sleep_reset` exits `planned` again.

## The decision this part rests on

The plan row marked ER-13 as waiting on CORE's night mode (Index §5.1 #13) and profile anchor times. Part 1 ships
without both (the lane's call, 13 Nov, under *default to connected*): the night path is written for the dark (short
screens, nothing that wakes the body, no clock), and the wake time lives in the run the morning card reopens. Night
mode and profile anchors (Me → My body) are part 2; neither changes this flow, they add to it.

## What it is

DBT ER Handout 20b for two moments. At night, awake and stewing: put the thought down, a slow breath, then get up for
a bit instead of lying there (stimulus control), or rest; resting counts, problems wait for the morning. In the day,
setting it up: one wake time every day (the anchor that resets sleep more than any bedtime), one wind-down thing, and
an optional morning check.

## The flow

| Step | What the person sees | H20b / PRD |
|---|---|---|
| `mode` | *What do you need?* I can't sleep · Set up my sleep times. A carried flooded reading adds *Settle my body first* (First, the body) when they pick the plan side | Two entries |
| `night` | *What's keeping you up?* (*You don't have to fix the night. Resting counts.*) My mind won't stop · My body's wired · A bad dream woke me · Thoughts of hurting myself · I don't know | Don't catastrophise |
| `safe` | Thoughts of hurting myself: the resources open over the screen first (`safetyFirst`), then *Are you safe right now?* with the crisis banner. Not sure / No → `reach` (someone to talk to, nothing in its place). Safe for now → `hurt_end`: *Getting through the night is the job.* Someone to talk to, the kit (`frame=crisis`), 5-4-3-2-1. No sleep coaching follows | C6.5, S9 |
| `dream` | *Back to the room first.* 5-4-3-2-1 or Held; *Rewriting it can wait for the daytime.* | Never ER-15 at night |
| `park` | My mind won't stop (not flooded): *Put it down for the night.* A worry · Something to do tomorrow · Something that happened, or their own words; optional. *Give my mind a job instead* as a quiet link | Write it down, solve it tomorrow |
| `breathe` | *Slow breaths, out longer than in* (`breathPacer` 4 in, 6 out, two minutes; *No need to check the time.*) | Calm the body without waking it |
| `now` | *How is it now?* Sleepy now · Still wide awake | |
| `sleepy` | *Back to bed.* and the wake anchor | |
| `up` | *Try getting up for a bit.* (*Lying awake teaches the bed it's for being awake. Being awake is uncomfortable, not dangerous.*) Another room, lights low · Something calm on paper · I'd rather rest here | Get out of bed; stimulus control |
| `night_end` | *Back to bed when your eyes get heavy.* Rest: *Resting with your eyes closed still counts…*; always *Go back when you're sleepy, not by the clock.* and *Whatever time you fall asleep, get up at your usual time.* Give your mind a job for a mind that won't stop | Don't give up and get up for the day |
| `wake` | *What time will you get up, every day?* 6:00 to 9:30 by half hours (*The same time on weekends too.*) | Regular schedule |
| `wind` | *Pick one thing for the hour before bed.* Screens off · Lights low · Write tomorrow's one thing down, then put it away · A warm shower or bath · Something quiet, or their own words; *Check in with me that morning?* | Wind down 30–60 min |
| `plan_end` | *Up at 7:30, every day.* the card line when asked, *If you can't sleep, come back here…*, and *If sleep's been bad for weeks, a doctor can help.* | Referral, quietly |
| `morning` | The `sleep_morning` card reopens the run here: *Morning. How was the night?* Slept okay · Broken · Barely slept; *Up at your time?*; *Did a bad dream wake you?* | The morning log |
| `again` | *Up at your time, even so. That's the reset working.* or *One morning doesn't undo it.* above *Same again tomorrow?* (yes books the card again at the same wake time) | |
| `morning_end` | *That's the reset.* Barely: skip the nap, bed when sleepy; not up yet: light and moving. A bad dream → Rewrite the nightmare (daylight); barely slept → Running low | ER-15, ER-07 |

*Talk to someone now* on every screen, once (the offer where someone to talk to is one). No screen asks for a
number of hours, a bedtime or a clock time on the night path, and nothing on it wakes the body (no cold water,
no marching).

## The morning card

`sleep_morning` (practice, deeplink, opening resolves it): `/tool/sleep-reset?run=…&at=morning&followUp=…`, a chip
window whose chips are the wake times (`at_local`, the next morning). Booked on the plan's `wind` step when the person
says yes, timed by the `wake` answer (`whenFrom`), and booked again only by the morning's *Same again tomorrow?*.
Content-free on Today (*Morning check*: no time, no night). Stale after 8 hours.

## The links that now open it

- Running low's set card when the sleep row was loud (was planned).
- Rewrite the nightmare's clinician card, for tonight (was planned).

## What it records

`ext.run` only: the path, the night's answers or the plan (wake time, wind-down, own words), the morning's answers.
No ask-fresh field, no keep, no projection.

## Routing

No row and no concept tags, by design (as Rewrite the nightmare): a night isn't a check-in state, and the check-in is
never where someone at 3am should land. Its entries are the Tools intent, Running low and Rewrite the nightmare.

## Deferred (ER-13 part 2)

- CORE's night mode (dimmed look app-wide) and opening Sleep reset from it.
- Profile anchors (wake time kept in Me → My body, *still true?*), so the morning card isn't tied to one plan.
- A sleep diary over days (a `SleepLog` label), the two-week pattern, and the three-week referral line.
- The PRD's *a nightmare woke me ×3 in two weeks* (part 1 offers Rewrite the nightmare each morning one woke them).
- Wind-down reminders in the evening, caffeine and nap timing, Running low's *sleep short 3 of 7* offer.
- The night path's own grounding embed (a 9-to-0 count with the breath), sounds.

## Departures from the PRD

- No night mode and no profile anchors (above).
- A plan made after midnight books the next day's morning, not that morning (the window's days are relative to the
  local date); the copy says *that morning* without naming a day.
- Thoughts of hurting myself is an answer on the night screen, not only the header link: at night it is likely enough
  to deserve a first-class tap, and it ends the sleep coaching.

## Clinician pass (open)

The night screen's answers, whether *Barely slept* should ever skip Running low, the wake-time range (6:00 to 9:30)
for shift workers, and the referral line's placement.
