# Build mastery (ER-11)

**Status:** built 12 Nov 2026 on the skill runtime (batch ER-B5 of [the modules plan](dbt-modules-plan.md)). Tool
`build-mastery`, listed under Emotion Regulation with the Tools intent *Get one thing done*, on the existing concept
`dbt_build_mastery` (`appToolId: 'build-mastery'`, PART_OF reducing vulnerability). Source:
`scripts/skills/build_mastery.py`. Tests: `tests/skill-build-mastery.test.mjs`. New profile kind `i_can` and its slice
`iCanRungs`, new follow-up type `mastery_step`. No new embed. Close kind `none`: the outcome is the `mastery_step` card's
answer. Rolling back is removing `'build-mastery'` from `src/lib/skillRuntime/playerTools.ts` and the tool from
`src/data/tools.ts` (Problem Solve's links go back to planned with it: `BUILT` in `scripts/skills/problem_solve.py`).

Spec: PRD ER-11 in `PRD – Emotion Regulation.md` (§5), DBT ER Handout 19 (build mastery), behavioural activation's
mastery half.

## What it is for

Shame-prone, low-drive people have little evidence that they can do hard things, and big goals fail and feed the
shame. This is one thing that's a stretch you can manage today, picked from a three-rung ladder, and a record of what got done
(*I can*) that the person keeps on a yes. Done beats done well; smaller is still mastery.

## The flow

| Step | What the person sees | PRD ER-11 |
|---|---|---|
| `start` | *Get one thing done.* (*Something small enough to finish. Done beats done well.*) *Which part of life?* My body · Home · Making something · Learning · Work or study · Caring for someone or something · Admin and paperwork, or *Something else* | Step 1, `MasteryArea` |
| `heads_up` | A carried flooded reading: *Your body's loud right now.* Look after the next few minutes first → `settle` (*This will keep. First, the body.*) · Try it anyway; again before going back to the ladder from the card | `flooded` → not offered (here a heads-up, never a lock) |
| `rung` | *Pick one that's a stretch you can manage today.* (*Pick the next one up.* / *Pick a smaller one.* when coming back for one) (*They go from easier to harder. Go by what you can do today. Smaller is still mastery.*) That area's three rungs, an own-words area's three general ones, or *My own step*. Notes: body *Go by what your body can do today.*; caring *If caring is already wearing you out, another area may suit today better. If someone there hurts you, this isn't the step.*; admin *If something could bring bad news, pick a time with someone around.* | Step 2, `MasteryStep` easy / medium / harder |
| `when` | *When could you do it?* Later today · Tomorrow · In a few days; *Want me to ask how it went?* Yes books `mastery_step` | Step 3 → FollowUp |
| `set` | *Your step: {rung}.* (an own-words area: *Your step for {area}: {rung}.*) *Done beats done well. Doing part of it counts.* (with a reminder: *I'll ask how it went. Done beats done well.*) | Perfectionism risk |

### When the card comes back

`mastery_step` (Today card *Your step*: *A step you picked to get one thing done. How did it go?*, never naming it)
reopens the run at `back` (R9 `reopens`, only on a run that reached `when`):

| Step | What the person sees |
|---|---|
| `back` | *Earlier you picked: {rung}.* (own-words area: *…, for {area}.*) *How did it go?* Done · Partly · Not yet |
| `back_done` | Done: *You did it.* Partly: *Part of it counts.* (*That counts. It's evidence you can do things that feel hard.*) *Keep this on your “I can” list in Me?* Yes, add it · Not now (hidden for a ladder step already on the list); *What next? No rush.* The same one again · Try the next one up (done only, not from the top rung) · Try a smaller one (partly only, not from the bottom) · That's enough for now |
| `back_not` | *Not yet is a real answer.* (*Smaller is still mastery. If it keeps not happening, the step may be too big or life too full right now. Neither is a failing.*) Pick a smaller one (at the bottom rung: *Make it smaller my own way*) · Try the same one again · Something keeps getting in the way (→ `back_stuck`: Problem Solve) · Not now |
| `back_end` | Kept: *It's on your “I can” list in Me.*; done or partly: *That's done for now. Come back any time for another.*; else *It'll keep. Come back to it any time.* |

Up and smaller go back to the ladder with last time's rung, when and reminder cleared, so the person picks afresh (an
own-words rung keeps both). The same one again goes straight to *When?*. *Talk to someone now* is on every screen.

### The ladders

Seven areas, three rungs each, every rung sized to finish today; nothing names what wasn't done. Admin, from the PRD:
*Open one letter · Reply to one email · Sort one pile*. Work or study starts at *Open the file I need*. My body is about
competence, not fitness (*Stretch or move gently for two minutes · Have a shower or get properly dressed · Move in a
way that suits my body for ten minutes*: nothing that feeds compulsive exercise or fails a body in pain). Caring adds
no load and names only someone safe (*Do one small caring thing (a plant, a pet, a person) · Send one kind message to
someone safe · Plan one thing with someone safe*). Top rungs are time-boxed or small (*Tidy one room for twenty
minutes*, *Make one small thing from start to end*), so they can always be finished. An area in their own words gets
*Spend five minutes on it · Do the first small part of it · Spend twenty minutes on it*.

## Saved

- **`i_can`** (`ProfileFact`, many, About me, own words encrypted; `functions/src/profile/kinds.ts`): kept on the
  done card's *Yes, add it* (`rungIds`, the rung's option id, or `rungOwn`; with the area, `areaIds` or `areaOwn`). Me
  lists each under About me, named from the graph's option (`SkillOption build_mastery:rung:<id>`) or their words, an
  own-words area after it (*Spend five minutes on it (the garden)*), with *Set aside*; no dates or counts. The
  **`iCanRungs`** slice (`PROFILE_NEEDS['build-mastery']`) is the ladder ids already kept, so the done card doesn't
  offer one twice (the list never reads as a count). An own-words area's general rungs (`own_1`..`own_3`) are left
  out: each means something different per area, so it's always offered.
- **`ext.run`** (plan D2): the visit's answers and the booked follow-up. No `SkillPractice` rep of its own.
- **`mastery_step`** (`scripts/practice-spine/content.py`): chips `today` (20:00), `tomorrow` (next day 18:00),
  `few_days` (three days, 18:00); stale after 72 h, no missed path, in-tab only; in `OPEN_RESOLVES` and
  `FOLLOW_UP_SESSION_TOOL`.

## Connected

- **Problem Solve** from *Something keeps getting in the way* on the not-yet card.
- **Problem Solve**'s confidence answers (*Build a small win*), its companion tools and two solution directions
  (`linkedToolId: 'build-mastery'`) resolve now (`BUILT`).
- **Tools page**: listed under Emotion Regulation; intent *Get one thing done*.
- No routing rows by design: it's for a steady moment, not a check-in result.

## Departures from the PRD

| PRD | Built | Why | Batch |
|---|---|---|---|
| Auto-adjust: done twice at a rung → offer the next; *not yet* twice → a smaller one | Every done offers the next one up (after *the same one again*), every partly and not yet a smaller one; the person picks. *Something keeps getting in the way* (Problem Solve) stands in for *not yet twice* | Counting past visits reads the log in a live flow (a profile slice never reads a log record) | ER-B5 part 2 |
| — | The heads-up comes after the area pick | A skill's first step is fixed; a flooded-only first screen needs a runtime start condition | ER-B5 part 2 |
| — | Keeping and then going round again (up, the same) shows no *kept* line | A keep on a step that doesn't reach an end card has no acknowledgement (runtime) | ER-B5 part 2 |
| The I can list is a view over done reps | `i_can` kept on a yes | Profile only on the person's yes (data layers); no rep to view | ER-B5 part 2 |
| `MasteryArea`, `MasteryStep`, `MasteryFlow` nodes | The skill's options (`SkillOption build_mastery:rung:<id>` with `area` and `rung`) | A skill's content lives in its options until a second reader needs the nodes | ER-B5 part 2 |
| `SkillPractice` reps (`skill: 'mastery'`), rungs-climbed metrics | Not built | Metrics read past visits | ER-B5 part 2 |
| Weekly *rung up?* card | Not built (the step card's *Try the next one up*) | One card per step is enough to start | ER-B5 part 2 |
| Entry points: low-energy result after Good things L1, MF-02 morning slot, ER-09 value steps as rungs | Problem Solve's links and the Tools list | The hosts aren't built, or read past visits | MF / ER-B5 part 2 |
| Fade: own rungs, then no reminders | *My own step* on every ladder | Fade reads past visits | ER-B5 part 2 |

## Safety

- Failure and shame: rungs sized to finish; *Not yet is a real answer*; *Smaller is still mastery*; no streaks,
  counts or scores anywhere.
- Perfectionism: *Done beats done well*; *Part of it counts* for partly, with the same I can offer and never *up*;
  *No rush* and *the same one again* first after a done; top rungs time-boxed.
- Bodies, carers and unsafe people: the body ladder is competence, not fitness, with *Go by what your body can do
  today*; caring names only someone safe, says another area may suit someone worn out, and that a step facing someone
  who hurts them isn't the step; admin warns that a letter can bring bad news.
- Repeated not-yets: *the step may be too big or life too full right now. Neither is a failing.*, and *Something keeps
  getting in the way* → Problem Solve.
- The I can list is never a scorecard: one item per ladder step, no dates or counts in Me.
- A carried flooded reading gets the body first or *Try it anyway*, never a lock: on a first visit after the area,
  and again before going back to the ladder from the card.
- *Talk to someone now* on every screen opens `safety.open`. The Today card is content-free.
