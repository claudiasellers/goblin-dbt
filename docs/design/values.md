# What matters to me (ER-09)

**Status:** built 12 Nov 2026 on the skill runtime (batch ER-B4 of [the modules plan](dbt-modules-plan.md), the
third of its three skills). Tool `values-clarification`, listed under Emotion Regulation with the Tools intent *Work
out what matters to me*, on the new concept `dbt_values_priorities` (`appToolId: 'values-clarification'`, PART_OF the
ER module). Source: `scripts/skills/values.py`. Tests: `tests/skill-values.test.mjs`. New profile kind `values` and
its slice `values`, new follow-up type `value_step`. No new embed (the `pileSort` embed is a departure, below). Close
kind `none`: the outcome is the `value_step` card's answer. Rolling back is removing `'values-clarification'` from
`src/lib/skillRuntime/playerTools.ts` and the tool from `src/data/tools.ts` (Problem Solve's link goes back to
planned with it: `BUILT` in `scripts/skills/problem_solve.py`).

Spec: PRD ER-09 in `PRD – Emotion Regulation.md` (§5), DBT ER Handouts 17 (building a life worth living: values →
goals → action steps) and 18 (values and priorities list), ACT's values work.

## What it is for

Guilt and shame checks ask whether something went against *your* values, and "effective" means serving your goals,
but nothing on record says what those are. Many people with BPD have an unsteady sense of what they care about. This
gives them a few, in their words or plain ones, held lightly (*for now*), and one small step in that direction. The
person's own values become the measure of a good outcome, not the app's.

## The flow

| Step | What the person sees | PRD ER-09 |
|---|---|---|
| `start` | First time: *What matters to you?* (*There are no right answers, and they can change. A few minutes is enough.*) *Let's look*. With values kept: *Your values are here.* Take a small step for one of them · Sort them again | Moment: `steady`, a quiet evening; 1 min later |
| `heads_up` | A carried flooded reading: *Your body's loud right now.* (*This works better once it settles a little.*) Look after the next few minutes first → `settle` (First, the body) · Try it anyway | `steady` moment |
| `sort` | *Which of these sound like you?* (*Pick as many as fit. If you're not sure, pick none. That's a full answer.*) 24 value cards in plain words, or *Add your own* | Step 1, sort; *add your own* |
| `not_sure` | Nothing picked: *Not sure yet is fine. What matters can take a while to find. Come back any time.* | Identity diffusion: *not sure yet* is a full answer |
| `keep` | *If you could only keep three for now, which?* (*Two can pull different ways. Both can matter. Not sure yet is a full answer.*) Up to three of the sort, or own words. *Save* keeps `values` either way | Step 2, keep three; conflicting values → both can matter |
| `sorted` | None kept: *Your sort is in Me. You can pick three another time.* | *not sure yet* saves the sort |
| `one` / `one_kept` | *Which one do you want to take a small step for?* (*One is enough for this week.*) This visit's three, or (coming back) the ones kept before, named from the `values` slice | Step 3, one value |
| `step` | *One small step this week.* (*Small enough that you'd likely do it. It's a direction, not a rule.*) That value's three steps, or own words | Steps 3–4, a direction and a step sized to succeed |
| `when` | *When could you do it?* Tomorrow · In a few days · Sometime this week; *Want me to ask how it went?* Yes books `value_step` | Step 4 → FollowUp |
| `set` | *Your step: {step}.* *It's a direction, not a rule. Doing part of it counts.* | Values as directions, not shoulds |

### When the card comes back

`value_step` (Today card *Your small step*: *A step you picked for something that matters to you. Did it happen?*,
never naming either) reopens the run at `back` (R9 `reopens`, only on a run that reached `when`):

| Step | What the person sees |
|---|---|
| `back` | *Earlier you picked: {step}.* *Did it happen?* Yes · Partly · Not this time |
| `back_yes` | *That was {value} in action.* *Steps like that are what a value looks like from the outside.* |
| `back_no` | *That's okay.* *Values are directions, not rules. A smaller step still counts, any time.* |

*Talk to someone now* is on every screen.

### The cards

Paraphrasing H18's themes in plain words, no verbatim list: belonging, being someone people can count on, fairness,
making things, learning, looking after my body, fun and play, being independent, honesty, caring for others, calm and
peace, adventure and new things, faith or meaning, getting things done, beauty and nature, family, friendship,
standing up for myself, kindness, respect, community, self-respect, love and closeness, work that matters to me.

Each card carries three small steps for this week (e.g. friendship: *Reach out to a friend · See a friend in person ·
Be a bit more honest with a friend*). Nothing is a rule, and nothing says what wasn't done.

## Saved

- **`values`** (`ProfileFact`, one per person, About me, own words encrypted; `functions/src/profile/kinds.ts`): kept
  on the keep screen's *Save* (`mineIds` / `mineOwn`: every card that sounded like them; `keptIds` / `keptOwn`: up to
  three, or none). A re-sort replaces it. Revisited after 30 days in Me (*Are these still yours?*), the PRD's monthly
  re-sort as a sampling, not a declaration. The **`values`** slice (`PROFILE_NEEDS['values-clarification']`) returns
  the kept ones named from the graph (`SkillOption values:value:<id>`, never a copy), their own words with the id
  `own`. Me lists the item under About me with its kept values joined, and *Set aside*.
- **`ext.run`** (plan D2): the visit's answers, the keep and the booked follow-up; a kept value picked again is its id.
  No `SkillPractice` rep of its own.
- **`value_step`** (`scripts/practice-spine/content.py`): chips `tomorrow` (next day 18:00), `few_days` (three days,
  18:00), `this_week` (six days, 18:00); stale after 72 h, no missed path, in-tab only; in `OPEN_RESOLVES` and
  `FOLLOW_UP_SESSION_TOOL`.

## Connected

- **Problem Solve**'s companion and solution links to `values-clarification` resolve now (`BUILT`).
- **Tools page**: listed under Emotion Regulation; intent *Work out what matters to me*.
- No routing rows by design: it's a `steady` skill for a quiet moment, not a check-in result.

## Departures from the PRD

| PRD | Built | Why | Batch |
|---|---|---|---|
| A pile sort, each card *that's me · sometimes · not now* (`pileSort`) | A chip sort: *sounds like me*, the rest unpicked | `pileSort` reports card ids, which the embed contract can't declare yet (a runtime change for the plan thread); the chips keep the PRD's *add your own* and *not sure yet* | ER-B4 part 2 |
| `ValueGoal` (a direction) then `ValueStep` (a step) | One chip: a small step that is the direction | Two screens of chips for one small step was more than the moment holds; the directions are in the step wording | ER-B4 part 2 |
| `ValueCard -[:RELATES_TO]->` OA goals, IE priorities | Not linked | Their hosts (OA's guilt fit card, FAST's values, IE-09) read the slice once they adopt it | IE / ER-B5 |
| Catch it after the fact: other tools' readouts show *That was standing up for myself*, a values-action rep | Not built; the step card's *That was {value} in action* is the one catch | Needs each host to map its choices to values | ER-B5 |
| A monthly *Still yours?* re-sort card | Me's 30-day *Are these still yours?*, and *Sort them again* on the start screen | Me's revisit already samples kept items; a Today card waits for the catches | ER-B4 part 2 |
| Steps done, catches confirmed, re-sorts, own-label share | Not counted | Metrics read past visits | ER-B4 part 2 |
| Entry points: OA guilt / shame fit card, MF-03 / MF-08, FAST, CORE orientation, ER-04 level 2 | Problem Solve's links and the Tools list | The hosts aren't built, or adopt it later (FAST's values list switches to the slice in the IE lane) | IE / MF / CORE / ER-B4 part 2 |

## Safety

- Values as shoulds: every line frames a direction (*a direction, not a rule*, *doing part of it counts*), and
  nothing says what wasn't done.
- Identity diffusion: picking nothing, or keeping none, is a full answer, and the sort is still kept.
- Conflicting values: *Two can pull different ways. Both can matter.*
- A carried flooded reading gets the body first or *Try it anyway*, never a lock.
- *Talk to someone now* on every screen opens `safety.open`. The Today card is content-free.
