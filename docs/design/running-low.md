# Running low (ER-07)

Written 12 Nov 2026. Status: **built on the skill runtime** (batch ER-B4 of [the modules plan](dbt-modules-plan.md),
first of its three skills). Source: `scripts/skills/please_skill.py`; played by the skill player
(`src/lib/skillRuntime/playerTools.ts`, `'please-skill': 'please_skill'`); tests `tests/skill-please.test.mjs`.
Spec: PRD ER-07 in `PRD – Emotion Regulation.md` (§5), DBT ER Handout 20 (PLEASE: reducing vulnerability to emotion
mind). Tool id `please-skill`, named "Running low" (plan D6); the PRD's five rows reusing closed PR #33's copy (D8).

## What it is for

"Everything is too much today and I don't know why." Short sleep, a skipped meal, pain or a missed dose turn every
feeling up, and on those days it reads as a feeling problem. This names the body's part in it in words, and ends on
one small thing for today. It is the lowest-effort skill in the module: five taps, one pick, done.

## The flow

| Step | Screen | Notes |
|---|---|---|
| `sleep` | *How was your sleep last night?* Enough · Short · Broken · Too much · Not sure | Hint: running low makes every feeling louder; any row can be skipped. A carried flooded reading adds a quiet *settle your body first* link (First, the body); going on is the default |
| `food` | *How's food been today?* Regular so far · Skipped something · All over the place · Not sure | ED-safe: no calories, amounts, weight or "too much" |
| `body` | *How's your body today?* Okay · Ill or sore · In pain · Missed my meds | |
| `subs` | *Any alcohol or drugs in the last day?* None · Some · Rather not say | No judgment copy; *rather not say* is a complete answer and never counts as loud |
| `moved` | *Have you moved much today?* Yes · A bit · Not yet | |
| `fix` | The readout as the title, *"Sleep is part of why the volume's up today."*, then one fix | Shown only when a row is loud. The title names the loudest row in a fixed order: body, sleep, food, last night, moving (pain and missed meds matter most). The options are every fix for the loud answers picked, plus *Shrink today to the one thing that has to happen*, always; or own words. Sleep or moving loud adds *Rest doesn't refill me: find the feeling* (PR #33's tired-or-heavy check) |
| `when` | *When will you do it?* Now · Later today; on Later, *Want me to ask tonight if it happened?* | The chip books `please_fix` at 20:00 |
| `set` | *Looking after your body is the skill* | One line for now, later, or later with the check. Sleep loud offers Sleep reset (ER-13, planned: not shown until it ships) |
| `none` | *Nothing obvious from the body today* | Nothing loud: "it may be a feeling more than the body", Find the feeling, Done |
| `back` | *Did the fix happen?* Yes · Partly · No | The `please_fix` card reopens the run here (a `reopens` step, R9; only a run that reached `when`) |
| `back_end` | One line per answer, no close question | *No* gets "Days like that happen. Tomorrow's another go, and a smaller thing can count." |

Every row is one tap, words only: no hours, amounts, or scales anywhere (the test pins it). Nothing is required
until the fix, so a person who'd rather not answer a row skips it.

### The fixes

Small enough to do while depleted (PR #33's right-now list). Each names the answers it's for (`on`), filtered on the
fix screen with `where: has($opt.on, $a.<row>)`:

| Fix | For |
|---|---|
| Eat something with some protein in it, in the next hour | skipped, all over the place, some last night |
| A glass of water now | skipped, ill, some last night, short sleep |
| A proper meal, even a small one | all over the place |
| A 20-minute lie-down before 3pm, with an alarm | short, broken |
| Five minutes outside, or by an open window | broken, too much sleep, not moved yet |
| Treat it like being sick: rest, fluids, warmth | ill or sore |
| Whatever you'd usually do for the pain · Sit or lie down for 15 minutes | in pain |
| Check what's due and take it as prescribed | missed my meds (never advice: only what's already prescribed) |
| Food and water before any big decisions | some last night |
| Walk around the block, or the room, for five minutes | not moved yet, too much sleep |
| Shrink today to the one thing that has to happen | always |

## Saved

- **`ext.run`** (plan D2): the five answers, the fix (own words encrypted at close), now or later, and on a reopened
  visit *did it happen*. No `SkillPractice` rep of its own and no new log label.
- **Close kind `none`** (`functions/src/spine/tools.ts`, `src/lib/spine/close.ts`): "how strong is it now?" means
  nothing right after picking a fix for later; the outcome is the evening card's answer.
- **`please_fix`** (`scripts/practice-spine/content.py`): one chip, `evening` (20:00 today), stale after 16 hours,
  no missed path, in-tab only. In `OPEN_RESOLVES` (opening the card resolves it) and `FOLLOW_UP_SESSION_TOOL`
  (only from a Running low visit).

## Connected

- **Check-in routing** (`scripts/recommendations/content.py`): Low drive's default cell is now Running low, with Do
  the Opposite ('get active') as its swap (`rf_reward_drive_low_default_please-skill`, signed off 12 Nov under
  *default to connected*). Body-kind and neutral: it refills, never calms, so the blank-pattern ban keeps it.
  Routing's planned `running-low` concept is renamed to the tool id; `dbt_please.appToolId = 'please-skill'`.
- **Built exits flipped**: It isn't working's body fix, Let it be's *still in my hands*, Problem Solve's *Look after
  the basics* (and its directions and barrier redirects that name `please-skill`).
- **Do the Opposite's door picker**: *tired*, *bored*, *sleepy*, *unfocused*, *apathetic* and *indifferent* already
  name `please-skill` as their alternative; the skipped-words link now reads *Try Running Low* instead of *See other
  tools*, with no code change.
- **Tools page**: listed under Emotion Regulation; intent *Everything feels like too much today*.

## Departures from the PRD

Each with its reason and the batch that picks it up.

| PRD | Built | Why | Batch |
|---|---|---|---|
| The readout names every loud row | The loudest row, in a fixed order; the fixes cover every loud row | One named cause and one fix is the PRD's own transform; a list of factors reads as a report card | — |
| One check a day, upserted | One check per visit | The daily record is CORE's diary (CORE-04), not built; a skill run is one visit (D2) | CORE |
| Weekly pattern card; *sleep short 3 of 7 → Sleep reset*; monthly *something you've been putting off* | Not built | Each is an aggregate over past visits or a monthly schedule, which a live flow never reads (data layers); Reflect or Today can show them | CORE / Reflect |
| Hide rows in settings (profile read) | Every row skippable; food and substances have *not sure* / *rather not say* | Skipping covers the same need without a settings surface; a hidden-rows profile kind can come with Me's next pass | ER-B5 |
| Sleep reset from the sleep row | Planned exit | ER-13 isn't built | ER-B5 |

## Safety

- No medical advice: medication is only *as prescribed*; pain is *whatever you'd usually do*.
- Not offered flooded as a lock: a carried flooded reading gets the quiet settle-first link and nothing else changes.
- Eating: no calories, amounts, weight, or "too much"; *All over the place* is the loud answer.
- Substances: no judgment copy, *rather not say* never counts as loud, and the fix is food and water first.
