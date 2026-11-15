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
fuels shame and secondary emotions (acceptance without judgment predicted NSSI change in DBT skills training,
Krantz, McMain & Kuo 2018). The skill receives the judgment as said, sees it as a judgment, and translates it into a
description plus the preference under it. That is a *describe* operation, not a reappraisal: nothing asks whether the
judgment is true or offers a better thought (KB 5.5; the 2026-09-24 decision to park cognitive CBT). Two to three
minutes; one judgment a visit.

## The flow

| Step | What the person sees | PRD MF-03 |
|---|---|---|
| `about` | *What's the judgment about?* (*A judgment is a verdict in a few words, like “I'm too much” or “they don't care”.*) Me · A feeling I'm having · Someone else · How things are, and *It's more than a judgment. I'm thinking about hurting myself or not being here* and *Someone threatened me, scared me or hurt me* as chips (→ `harm`, → `danger`, both before the flooded set-down) | Step 1, the targets; the always-visible safety chips |
| `harm` | The crisis banner, *Thank you for saying it. That's more than a judgment. Someone to talk to comes first.*, Talk to someone now. No unpacking | CORE's route |
| `set_down` | A carried flooded reading, straight from `about` (no naming the verdict first): *A judgment can wait. Your body's loud right now. Body first, then come back to it if you want.* First, the body | Flooded: not run |
| `judge` | *What's the judgment?* The PRD's chips for that target (*I'm too much · I'm pathetic · I ruin everything · I'm lazy · Something's wrong with me*; *I shouldn't feel this · I'm overreacting · I'm being dramatic*; *They're selfish · They don't care · They're doing it on purpose*; *This shouldn't be happening · It's not fair*) or their own words | Step 1 |
| `see` | The judgment in quotes, exactly as said; a witness line for its target (*That's a heavy thing to be carrying.*; for someone else *Something they did got to you. Setting the verdict down isn't agreeing with what they did.*); *That's a judgment, a verdict in a few words. Minds make them all the time. You can set it down for a few minutes and look at what's under it.* Set it down and look under it · It feels like a fact · *They threatened me, scared me or hurt me* for someone else, *Someone threatened me, scared me or hurt me* for every other target (→ `danger`, so the short path has it too: a verdict about me or how things are can be someone's words taken in, or harm that keeps happening) | Steps 1–2 |
| `facts` | *It feels like a fact* with shame or guilt (the chip's hint, or a carried shame or guilt word for a verdict about me, a feeling or in own words), unless Do the Opposite's facts just said it doesn't fit (`frame=after_facts`): *It feels like a fact. Shame or guilt can fit what happened, and then it asks for something to be done. Checking the facts looks at the feeling, not at whether the verdict is true.* Check the facts on the feeling · Look at what's under it anyway | Step 2, the justified branch |
| `facts_go` | *Check the Facts, then. It looks at the feeling and what happened. Nothing in it decides whether you're a bad person.* Check the Facts | |
| `pick` | A carried stirred reading: *Which would help most to look at?* What I feel · What I wanted | Stirred: one pile |
| `happened` | *What happened, the way a camera would see it?* Up to two of six per target (*I was late.*, *They didn't reply.*, *A plan fell through.*), or own words; skippable. *They threatened me, scared me or hurt me.* (someone else) or *Someone threatened me, scared me or hurt me.* (the other targets) goes to `danger` | Step 3, facts |
| `danger` | The `other_person` banner, *That's about your safety, not a judgment to unpack. Your read of danger is the one that counts here.* Ending (careful), Talk to someone now | Risks: never a softening move |
| `cost` | *What did it cost, or what could it cost?* Up to two, by target: for someone else or how things are, what the event cost the person (*I had to sort it out on my own.*) as well as their own reactions; own words; skippable | Step 3, consequence |
| `feel` | *What might you be feeling, under the judgment?* Grid words as guesses, led by the target (shame first for me, anger and hurt first for someone else, disappointment first for how things are), a carried word first, *Something else* for the full list; up to two; skippable. These are the session's emotion ids | Step 3, feeling as hypotheses |
| `want` | *What did you want, or what matters to you here?* Six or seven preference and value chips per target, one first (*To be safe*, then *For it to stop* and *To have some distance*, for someone else; *To be safe* is offered for every target); *Not judging isn't agreeing. What you wanted still matters.* for someone else; skippable | Step 3, preference and value |
| `rebuild` | `describeCard`: *Here's what you found.* The picks as plain first-person lines on the paper (*I didn't go. I missed out on something. I feel ashamed. I wanted to be someone who shows up.*) | Step 4 |
| `sit` | *How does that sit, next to the judgment?* (*It isn't truer or better. It's described.*) That's closer · Not quite · I'll keep the judgment for now | Step 4 |
| `fix` | Not quite (once a visit): *Which part would you change?* One pile, then straight back to the rebuild; a change that empties the last pile lands on `noticed` | Step 4, edit |
| `kept` | *That's okay. You noticed it as a judgment. That's the skill.* | Step 4 |
| `noticed` | Every pile skipped: *You noticed it as a judgment. That's the skill, even without taking it apart today.* | |
| `hands_q` → `hands` | Closer, not on the short path: *To finish, twenty seconds with your hands open? Willing hands: palms up, letting this moment be what it is. It doesn't mean what happened was okay.* `bodyCard` kind `willing`, 20 s, half-smile never required | Step 5 (DT's willing hands) |
| `end` | *You took it apart instead of carrying it whole.* A line by what was found, with the practice (*Next time, noticing the judgment is the practice.*); What matters to me when something mattered, Recover when it was about someone else | Step 5 |

After `about`, every screen carries *Thoughts of hurting myself or not being here* as a link (the danger and harm cards
offer someone to talk to themselves). With a heavy carried word (*worthless*, *despair*, *helpless*, *powerless*) the
end cards (`kept`, `noticed`, `end`) keep their own line and add *Heavy feelings can come with thoughts of not being
here. If they do, talk to someone now.* (combined `*_heavy` copy, as Let it be a wave does, since a hand-off shows one
line), with Talk to someone now as an offer. Every screen from `see` to `fix` carries *Back to the room* (Five senses), the rebuild
included, where reading it back can sting. No *unpack another* and one *Not quite*: one judgment a visit, no loop over
the card (PRD: shame spiral).

## The describe card

`describeCard` (MF-owned, C3b) puts the person's picks on the keepsake paper (`PaperCard`): one line per thing that
happened and per cost (each chip is a sentence already), one line for the feelings after `feelLead` (*I feel ashamed
and hurt.*), one per thing that mattered after `wantLead` (*I wanted to be respected.*). Own words get a capital first
letter and a closing full stop; an own-words want gets the lead only when it reads on from it (*to …*), so *I need them
to stop* or *Sam to call me* stand as written; *I* is never lower-cased. No Copy: it isn't a message. Nothing picked
can't reach it (a change that empties the last pile lands on `noticed`); the card still has a way on. Reports `read`.
The paper takes no group label, so a screen reader reads the lines once. The lines are pure (`describeLines`), shared
by the card and the tests.

## Reps, routing, links

- **Rep.** A completed visit (`kept`, `noticed` or `end`) logs a `nonjudge` rep (new `PracticeSkill`,
  `defaultFor: ['unpack-a-judgment']`). Graded Preliminary, not the PRD's Moderate: the one study behind it (Krantz,
  McMain & Kuo 2018) is a 20-week DBT skills group, not a two-minute exercise (Wise mind's precedent). The routes
  (`harm`, `set_down`, `facts_go`, `danger`) don't complete the visit, so they log none. Close kind `none`: the
  rebuild's answer is the outcome.
- **Routing.** One word row, live (default to connected): Social threat's self-worth words (*insecure, inadequate,
  inferior, insignificant, weak, worthless*) get Unpack a judgment as the swap beside Recover. **This takes Check the
  Facts' card off those six words** (signed off 12 Nov): a result shows two cards, and Unpack ranks above it. Why
  that's acceptable: the words are verdicts about the self, the PRD's case for MF-03, and Check the Facts is still one
  tap away as Unpack's justified branch (*It feels like a fact*). Check the Facts' row stays in the table as the
  fallback should Unpack's row come off; today it never shows on these words. `CONTRAINDICATED_FOR` dissociation and
  freeze (primary or alongside) is a guard: a secondary pattern comes from the same quadrant, so neither can sit beside
  Social threat now, but the edge holds if that changes. Its reason: a
  self-focused verdict exercise never during shame collapse (social threat with freeze: *do not start with
  self-focused tools*, `schema/pattern-co-occurrence.cypher`) or far away (KB). Tags: acceptance, naming, neutral. No
  `ADDRESSES` edges, so the legacy ranker behind the kill switch is unchanged.
- **Ways in:** Tools, the intent, the check-in row, and Do the Opposite's clarify card for shame or guilt that doesn't
  fit (not flooded; it passes `frame=after_facts`, so *It feels like a fact* never sends the person back to Check the
  Facts).
- **Exits:** First, the body, Check the Facts, Five senses, What matters to me (it starts fresh: what was picked under
  *what I wanted* isn't carried), Recover, Ending (careful), `safety.open`.
- **Ways in still to come** (`module-edges.json`): DEAR MAN Describe's embedded card (MF-B3, a hosted variant); Recover,
  only when the must is a verdict about the other person, with WMP-07's both-and card (Index §5.1 #5: *Loosen the
  must* is replaced by WMP-07, not by MF-03).

## Where it departs from the PRD

- **No capacity probe** (D1): the band is a carried reading only. With no band the full path runs; a carried stirred
  reading gets the one-pile path, a carried flooded reading sets it down from the first screen (after the target, so
  the harm chip is asked first; not at P4's `gate` before anything).
- **No blank-band gate.** The PRD offers it on a blank pattern only after an activation step. Its one routing row is
  on `social_threat_shame`, never a blank pattern, and it's contraindicated for dissociation and freeze; blank isn't a
  carried band (D1), so the Tools list and the intent aren't gated, like every skill.
- **Narrower routing.** The PRD surfaces it when shame, guilt or self-disgust is picked, and as a second card on
  social threat at steady and stirred. Only the six self-worth words get it: *ashamed* and *embarrassed* already show
  Recover with Held, *guilty* and *remorseful* Check the Facts with Five senses or Keep it warm, *humiliated* Recover
  with First, the body (all signed off), and `ADDRESSES` edges would move the legacy ranker.
- **What it's about first.** The PRD groups the chips by target on one screen. The runtime has no headed groups, and
  the target is needed for own words too (which facts, which value leads), so it's its own tap.
- **No shelf object.** *Set it down and look under it* is a choice, not an object to hold and shelve (Shape's gallery
  is part 2).
- **The witness line** is a line on the seeing screen, not a three-second hold before it.
- **Danger from a person.** No person picker, so `Person.safe` isn't read; instead *They threatened me, scared me or
  hurt me* is a chip on the first screen (so a flooded reading has it), a choice on the seeing screen and a fact chip,
  for every target, that opens the danger route; *To be safe*, *For it to stop* and *To have some distance* lead the
  values for someone else, and *To be safe* is offered for every target.
- **The justified branch is a choice.** *It feels like a fact* with shame or guilt offers Check the Facts or *Look at
  what's under it anyway*: every self-verdict chip carries a shame or guilt hint, and feeling like a fact isn't the
  same as fitting the facts.
- **The kept value** isn't written to a `Goal/Value` and books no next-day act: the end card offers What matters to me
  (ER-09), which keeps values. *Caught one* waits for the Practice home (MF-B3).
- **Save custom judgment text?** (the PRD's open question): no. Own words are encrypted in the visit's record like
  every skill's (`ext.run`); the PRD's *keep this* for the judgment text isn't built.
- **About them at launch** (the PRD's open question): included, with the danger choice and safety first.
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
