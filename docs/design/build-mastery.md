# Build mastery (ER-11)

**Status:** built 12 Nov 2026 on the skill runtime (batch ER-B5 of [the modules plan](dbt-modules-plan.md)). Tool
`build-mastery`, listed under Emotion Regulation with the Tools intent *Get one thing done*, on the existing concept
`dbt_build_mastery` (`appToolId: 'build-mastery'`, PART_OF reducing vulnerability). Source:
`scripts/skills/build_mastery.py`. Tests: `tests/skill-build-mastery.test.mjs`. New profile kind `i_can` (no slice: Me
reads it), new follow-up type `mastery_step`. No new embed. Close kind `none`: the outcome is the `mastery_step` card's
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
| `start` | *Get one thing done.* (*Something small enough to finish. Done beats done well.*) *Which part of life?* My body · Home · Making something · Learning · Work or study · Caring for someone · Admin and paperwork, or *Something else* | Step 1, `MasteryArea` |
| `heads_up` | A carried flooded reading: *Your body's loud right now.* Look after the next few minutes first → `settle` (First, the body) · Try it anyway | `flooded` → not offered (here a heads-up, never a lock) |
| `rung` | *Pick one that's a stretch you can manage today.* (*They go from easier to harder. Smaller is still mastery.*) That area's three rungs, an own-words area's three general ones, or *My own step* | Step 2, `MasteryStep` easy / medium / harder |
| `when` | *When could you do it?* Later today · Tomorrow · In a few days; *Want me to ask how it went?* Yes books `mastery_step` | Step 3 → FollowUp |
| `set` | *Your step: {rung}.* *Done beats done well. Doing part of it counts.* | Perfectionism risk |

### When the card comes back

`mastery_step` (Today card *Your step*: *A step you picked to get one thing done. How did it go?*, never naming it)
reopens the run at `back` (R9 `reopens`, only on a run that reached `when`):

| Step | What the person sees |
|---|---|
| `back` | *Earlier you picked: {rung}.* *How did it go?* Done · Partly · Not yet |
| `back_done` | Done: *You did it.* Partly: *Part of it counts.* (*That's evidence you can do hard things.*) *Add it to your I can list?* Yes, add it · Not now; *What next?* Try the next one up (not from the top rung) · The same one again · That's enough for now |
| `back_not` | *Not yet is a real answer.* (*Smaller is still mastery.*) Pick a smaller one (not from the bottom rung) · Try the same one again · Not now |
| `back_end` | *It's on your I can list in Me.* when kept; *It'll keep. Come back to it any time.* |

Up and smaller go back to the ladder with last time's rung, when and reminder cleared, so the person picks afresh (an
own-words rung keeps both). The same one again goes straight to *When?*. *Talk to someone now* is on every screen.

### The ladders

Seven areas, three rungs each, every rung sized to finish today; nothing names what wasn't done. Admin, from the PRD:
*Open one letter · Reply to one email · Sort one pile*. Work or study starts at *Open the file I need*. An area in
their own words gets *Spend five minutes on it · Do the first small part of it · Spend twenty minutes on it*.

## Saved

- **`i_can`** (`ProfileFact`, many, About me, own words encrypted; `functions/src/profile/kinds.ts`): kept on the
  done card's *Yes, add it* (`rungIds`, the rung's option id, or `rungOwn`). Me lists each under About me, named from
  the graph's option (`SkillOption build_mastery:rung:<id>`) or their words, with *Set aside*. No slice: nothing in a
  flow reads it yet.
- **`ext.run`** (plan D2): the visit's answers and the booked follow-up. No `SkillPractice` rep of its own.
- **`mastery_step`** (`scripts/practice-spine/content.py`): chips `today` (20:00), `tomorrow` (next day 18:00),
  `few_days` (three days, 18:00); stale after 72 h, no missed path, in-tab only; in `OPEN_RESOLVES` and
  `FOLLOW_UP_SESSION_TOOL`.

## Connected

- **Problem Solve**'s confidence answers (*Build a small win*), its companion tools and two solution directions
  (`linkedToolId: 'build-mastery'`) resolve now (`BUILT`).
- **Tools page**: listed under Emotion Regulation; intent *Get one thing done*.
- No routing rows by design: it's for a steady moment, not a check-in result.

## Departures from the PRD

| PRD | Built | Why | Batch |
|---|---|---|---|
| Auto-adjust: done twice at a rung → offer the next; *not yet* twice → a smaller one | Every done offers the next one up and every not yet a smaller one; the person picks | Counting past visits reads the log in a live flow (a profile slice never reads a log record) | ER-B5 part 2 |
| The I can list is a view over done reps | `i_can` kept on a yes | Profile only on the person's yes (data layers); no rep to view | ER-B5 part 2 |
| `MasteryArea`, `MasteryStep`, `MasteryFlow` nodes | The skill's options (`SkillOption build_mastery:rung:<id>` with `area` and `rung`) | A skill's content lives in its options until a second reader needs the nodes | ER-B5 part 2 |
| `SkillPractice` reps (`skill: 'mastery'`), rungs-climbed metrics | Not built | Metrics read past visits | ER-B5 part 2 |
| Weekly *rung up?* card | Not built (the step card's *Try the next one up*) | One card per step is enough to start | ER-B5 part 2 |
| Entry points: low-energy result after Good things L1, MF-02 morning slot, ER-09 value steps as rungs | Problem Solve's links and the Tools list | The hosts aren't built, or read past visits | MF / ER-B5 part 2 |
| Fade: own rungs, then no reminders | *My own step* on every ladder | Fade reads past visits | ER-B5 part 2 |

## Safety

- Failure and shame: rungs sized to finish; *Not yet is a real answer*; *Smaller is still mastery*; no streaks,
  counts or scores anywhere.
- Perfectionism: *Done beats done well*; *Part of it counts* for partly, with the same I can offer.
- A carried flooded reading gets the body first or *Try it anyway*, never a lock.
- *Talk to someone now* on every screen opens `safety.open`. The Today card is content-free.
