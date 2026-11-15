# Unpack a judgment (MF-03 Nonjudgmentally)

**Status:** built 15 Nov 2026 on the skill runtime (MF-B2; [the modules plan](dbt-modules-plan.md) §5.3a). New tool
`unpack-a-judgment`, listed under Mindfulness as *Unpack a judgment*, on the existing concept `dbt_nonjudgmental`
(`appToolId: 'unpack-a-judgment'`). Intent *I'm being hard on myself* (the second of the two intents MF adds, PRD
§2.2). Source: `scripts/skills/unpack_a_judgment.py`. Tests: `tests/skill-unpack-a-judgment.test.mjs`. New embed:
`describeCard` (`src/components/skillPlayer/DescribeCard.tsx` over the pure `src/lib/describeCard.ts`). Rolling back is
removing `'unpack-a-judgment'` from `src/lib/skillRuntime/playerTools.ts`, the tool and its intent from
`src/data/tools.ts`, and its word row from `scripts/recommendations/content.py`.

## What it is

PRD MF-03 (DBT Mindfulness Handouts 5, 5a: nonjudgmentally) for "I'm pathetic", "I shouldn't feel this", "they're
selfish", "this shouldn't be happening". For many people a judgment is the only word they have for a state, and it
fuels shame and secondary emotions (acceptance without judgment mediated NSSI reduction in DBT skills training,
Krantz, McMain & Kuo 2018). The skill receives the judgment as said, sees it as a judgment, and translates it into a
description plus the preference under it. That is a *describe* operation, not a reappraisal: nothing asks whether the
judgment is true or offers a better thought (KB 5.5; the 2026-09-24 decision to park cognitive CBT). Two to three
minutes; one judgment a visit.

## The flow

| Step | What the person sees | PRD MF-03 |
|---|---|---|
| `about` | *Who's the judgment about?* Me · A feeling I'm having · Someone else · How things are, and *It's more than a judgment. I'm thinking about hurting myself* as a chip | Step 1, the targets; the always-visible safety chip |
| `harm` | The crisis banner, *Thank you for saying it. That's more than a judgment. Someone to talk to comes first.*, Talk to someone now. No unpacking | CORE's route |
| `judge` | *What's the judgment?* The PRD's chips for that target (*I'm too much · I'm pathetic · I ruin everything · I'm lazy · Something's wrong with me*; *I shouldn't feel this · I'm overreacting · I'm being dramatic*; *They're selfish · They don't care · They're doing it on purpose*; *This shouldn't be happening · It's not fair*) or their own words | Step 1 |
| `set_down` | A carried flooded reading: *That's a judgment. It can wait. Your body's loud right now. Body first, then come back to it if you want.* First, the body | Flooded: not run |
| `see` | The judgment in quotes, exactly as said; a witness line for its target (*That's a heavy thing to be carrying.*); *That's a judgment, a verdict in a few words. You can set it down for a few minutes and look at what's under it.* Set it down for now · It feels like a fact | Steps 1–2 |
| `facts` | *It feels like a fact* with shame or guilt (the chip's hint, or a carried shame or guilt word): *When it feels like a fact, the facts come first.* Check the Facts | Step 2, the justified branch |
| `pick` | A carried stirred reading: *Which would help most to look at?* What I feel · What I wanted | Stirred: one pile |
| `happened` | *What happened, the way a camera would see it?* Up to two, per target (*I didn't go.*, *They didn't reply.*, *A plan fell through.*), or own words; skippable. *They threatened me or hurt me.* goes to `danger` | Step 3, facts |
| `danger` | The `other_person` banner, *That's about your safety, not a judgment to unpack. Your read of danger is the one that counts here.* Ending (careful), Talk to someone now | Risks: never a softening move |
| `cost` | *What did it cost, or what could it cost?* Up to two, or own words; skippable | Step 3, consequence |
| `feel` | *What might you be feeling, under the judgment?* Ten grid words as guesses, a carried word first, *Something else* for the full list; up to two; skippable. These are the session's emotion ids | Step 3, feeling as hypotheses |
| `want` | *What did you want, or what matters to you here?* Ten preference and value chips, one first by target (*To be safe* for someone else); *Not judging isn't agreeing. What you wanted still matters.* for someone else; skippable | Step 3, preference and value |
| `rebuild` | `describeCard`: *Here's what you found.* The picks as plain first-person lines on the paper (*I didn't go. I missed out on something. I feel ashamed. I wanted to be someone who shows up.*) | Step 4 |
| `sit` | *How does that sit, next to the judgment?* (*It isn't truer or better. It's described.*) That's closer · Not quite · I'll keep the judgment for now | Step 4 |
| `fix` | Not quite: *Which part would you change?* One pile, then straight back to the rebuild | Step 4, edit |
| `kept` | *That's okay. You noticed it as a judgment. That's the skill.* | Step 4 |
| `noticed` | Every pile skipped: *You noticed it as a judgment. That's the skill, even without taking it apart today.* | |
| `hands_q` → `hands` | Closer, not on the short path: *To finish, twenty seconds with your hands open?* `bodyCard` kind `willing`, 20 s, half-smile never required | Step 5 (DT's willing hands) |
| `end` | *You took it apart instead of carrying it whole.* A line by what was found; What matters to me when something mattered, Recover when it was about someone else | Step 5 |

Every screen from `judge` on carries the safety chip as a link; every unpacking screen (`see` to `want`) carries *Back
to the room* (Five senses). No *unpack another*: one judgment a visit (PRD: shame spiral).

## The describe card

`describeCard` (MF-owned, C3b) puts the person's picks on the keepsake paper (`PaperCard`): one line per thing that
happened and per cost (each chip is a sentence already), one line for the feelings after `feelLead` (*I feel ashamed
and hurt.*), one per thing that mattered after `wantLead` (*I wanted to be respected.*). Own words are kept as written,
with a closing full stop added when they have none, and *I* is never lower-cased. No Copy: it isn't a message.
Nothing picked: a quiet way on, never a stranded screen. Reports `read`. The lines are pure (`describeLines`), shared
by the card and the tests.

## Reps, routing, links

- **Rep.** A completed visit (`kept`, `noticed` or `end`) logs a `nonjudge` rep (new `PracticeSkill`, Moderate as the
  PRD grades MF-03, `defaultFor: ['unpack-a-judgment']`). The routes (`harm`, `set_down`, `facts`, `danger`) don't
  complete the visit, so they log none. Close kind `none`: the rebuild's answer is the outcome.
- **Routing.** One word row, live (default to connected): Social threat's self-worth words (*insecure, inadequate,
  inferior, insignificant, weak, worthless*) get Unpack a judgment as the swap beside Recover. These words are verdicts
  about the self, the PRD's case for MF-03. Check the Facts' row for the same words stays, one place lower, and is
  Unpack's justified branch. Tags: acceptance, naming, neutral. No `ADDRESSES` edges, so the legacy ranker behind the
  kill switch is unchanged.
- **Ways in:** Tools, the intent, the check-in row, and Do the Opposite's clarify card for shame or guilt that doesn't
  fit (not flooded).
- **Exits:** First, the body, Check the Facts, Five senses, What matters to me, Recover, Ending (careful),
  `safety.open`.
- **Ways in still to come** (`module-edges.json`): DEAR MAN Describe's embedded card (MF-B3, a hosted variant); Recover,
  only when the must is a verdict about the other person, with WMP-07's both-and card (Index §5.1 #5: *Loosen the
  must* is replaced by WMP-07, not by MF-03).

## Where it departs from the PRD

- **No capacity probe** (D1): the band is a carried reading only. With no band the full path runs; a carried stirred
  reading gets the one-pile path, a carried flooded reading sets it down.
- **Who it's about first.** The PRD groups the chips by target on one screen. The runtime has no headed groups, and
  the target is needed for own words too (which facts, which value leads), so it's its own tap.
- **No shelf object.** *Set it down for now* is a choice, not an object to hold and shelve (Shape's gallery is part 2).
- **The witness line** is a line on the seeing screen, not a three-second hold before it.
- **Danger from a person.** No person picker, so `Person.safe` isn't read; instead *They threatened me or hurt me* is a
  fact chip for someone else that opens the danger route, and *To be safe* leads their values.
- **The kept value** isn't written to a `Goal/Value` and books no next-day act: the end card offers What matters to me
  (ER-09), which keeps values. *Caught one* waits for the Practice home (MF-B3).
- **Own words** are encrypted in the visit's record like every skill's (`ext.run`); the PRD's *keep this* for the
  judgment text isn't built.
- **About them at launch** (the PRD's open question): included, with the danger chip and *To be safe* first.
- **Words as options**, not `JudgmentChip` / `JudgmentTarget` nodes yet; witness lines are skill copy, not WMP line ids.
- **The voice check.** The judgment chips quote the person's verdicts (*I shouldn't feel this*, *I'm overreacting*), so
  `build.py`'s house-voice word check skips that one option list (`voiceQuotes`); the skill's own copy is still checked.

## Part 2 (deferred)

| Item | Why it waits | Batch |
|---|---|---|
| Fade levels 0–3 (earlier unpackings offered first, *what mattered?* alone, catch taps only, the weekly *any on your own?*) | Need `PracticeProfile` and the log | MF-B3 (MF-02) |
| *Caught one* on the Practice home, catches as zero-duration reps | The Practice home hosts it | MF-B3 |
| The embedded card for DEAR MAN Describe, OA, Recover and CORE's diary card | The card is a hosted variant of this skill | MF-B3 |
| A kept value written to `Goal/Value` and its next-day act | ER-09's values work owns kept values | with ER-09 part 2 |
| The judgment as a shelf object (Shape's gallery), sort trays | Room work | after MF-B9 |
| `JudgmentChip`, `JudgmentTarget`, rebuild templates as graph nodes; `ADDRESSES` edges | Options are labels for now; edges would move the legacy ranker | MF-B3 |
