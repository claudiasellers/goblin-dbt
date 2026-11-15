# One thing (MF-05 one-mindfully, with MF-09's mode card)

**Status:** built 15 Nov 2026 on the skill runtime (MF-B4; [the modules plan](dbt-modules-plan.md) §5.3a). New tool
`one-thing`, listed under Mindfulness as *One thing*, on the existing concept `dbt_one_mindfully`
(`appToolId: 'one-thing'`). Intent *Get out of my head* (the PRD's new intent for MF-05). Source:
`scripts/skills/one_thing.py`. Tests: `tests/skill-one-thing.test.mjs`. No new embed: the doing step is MF-01's
`pebbleBowl`, the rumination variant's minute outside is `orientFind` or the bowl. Rolling back is removing
`'one-thing'` from `src/lib/skillRuntime/playerTools.ts`, the tool and its intent from `src/data/tools.ts`, and its
routing row from `scripts/recommendations/content.py` (Five senses goes back to the looping cell's default).

## What it is

PRD MF-05 (DBT Mindfulness Handouts 5, 5c: one-mindfully) for attention split and looping: rumination, worry, doing
five things badly, "I can't get out of my head". One ordinary activity, chosen, done with the whole of your attention
for a bounded time; wandering and coming back is the practice. One to five minutes on the phone, unbounded off it.
From a looping head it starts with a minute outside the head (MF-01's Look or Listen) and MF-09's mode card (*Is your
mind trying to fix a feeling like a task?*: doing mind and being mind, MBCT's distinction; Strong at course dose,
Preliminary at app dose, so it ships as one card inside this path). Evidence for one-mindfulness on its own is
Preliminary (Linehan 2015's skills manual; no trial isolates it).

## The flow

| Step | What the person sees | PRD MF-05 |
|---|---|---|
| `outside` | The rumination variant's entry (`?enterAt=outside&frame=ruminate`: the looping result's card, the intent): *First, a minute outside your head.* (*Eyes open. Pick one.*) Look · Listen | Rumination variant, the external task |
| `look` / `listen` | `orientFind`: five things you can see, with the date on screen; or the `pebbleBowl`: a minute of sounds, a pebble each time you come back | MF-01 Look or Listen |
| `mode` | *Is your mind trying to fix a feeling like a task?* (*Going over it, working it out, trying to make it stop.*) Yes · Maybe · No | MF-09's mode card |
| `mode_yes` | Yes or maybe: *That's doing mind. Feelings don't get solved like tasks.* *Both minds are useful. Right now, a minute of being mind might help: one thing, done fully.* One thing · Not now (straight to the loop) | MF-09 |
| `mode_no` | *Then one thing, done fully, can still give your head a rest.* One thing · Not now | |
| `thing` | The plain start. *Pick one thing to do with your whole attention.* (*Something ordinary you could do now or soon.*) Wash my hands · Make a drink · Brush my teeth · Walk somewhere · Eat a few bites · Have a shower · Listen to one song · Wash up · Something else (a few words). A blank frame lists *Walk somewhere* first | Step 1; blank: movement first |
| `length` | *For how long?* One minute · One song · Until it's done | Step 2 |
| `how` | *With the phone, or without it?* (*Without it is the goal. With it, the screen stays quiet and you tap each time you come back.*) | Step 3 |
| `do_minute` / `do_song` / `do_done` | With the phone: the pebble bowl for 60 s, about a song (3½ min) or up to five minutes, titled with the activity's one instruction (*The temperature of the water. Then the soap.*; own words: *{thing}. All of your attention on it.*). Never locked; *Move on* is always there | Step 4 |
| `away` | Without the phone: the instruction, *Put the phone down. Come back when you're done.*, I'm back | Step 3, without the phone |
| `with` | *How much were you with it?* Mostly with it · In and out · Mostly elsewhere, all answered the same way | Step 5 |
| `loop` | The rumination variant's close, asked in the flow (`askFresh: 'thenVsNow'`): *The loop in your head now?* Louder · About the same · Quieter · Much quieter | Step 5, then-vs-now for the loop |
| `louder` | *It got louder. That happens.* *When your head is this loud, something for the body or a job for your mind can help first.* First, the body · Give your mind a job | Stirred → DT |
| `end` / `end_loop` | *One thing, done fully. That's the skill.* *In and out is the practice. Each time you came back, that was it.* (after a quieter loop: *One thing at a time is a way out of it you can use anywhere.*). *Same thing tomorrow? I'll ask how it went.* Tomorrow morning · Tomorrow evening (optional) | Step 6 |
| `end_short` | The rumination variant after *Not now*: *A minute outside your head. That counts.* | |
| `again` | Reopened from the `one_thing_again` card: *Did you get to do {thing} with your whole attention?* Yes · Sort of · Not yet | The off-phone rep |
| `again_end` | Yes: *That's one-mindfulness off the phone. It goes wherever you do.* Sort of: *Some of it counts. Coming back is the practice.* Not yet: *Not yet is fine. It'll be there next time.* | |

A carried flooded reading puts *Your body's loud right now.* in the title of `outside` and `thing`, with *This works
better once your body settles. You can start with your body, or try it anyway.* and *My body first* (First, the body)
as a link; it can still go on (PRD: DT first, never a lock). Open-ended writing is never offered: the only own words
are the activity, 40 characters (the PRD: it can raise distress in high ruminators). Nothing on screen counts.

## Reps, routing, links

- **Reps.** Every completed visit logs a `one_thing` rep (new `PracticeSkill one_thing`, *One-mindfully*, Preliminary,
  `PRACTICES dbt_one_mindfully`, `defaultFor ['one-thing']`). *Yes* on the `again` card is the off-phone rep
  (`OFF_PHONE_SKILLS.one_thing`, `runRep`), counted on the Practice home's *done without the app*.
- **The Practice home.** `one_thing` joins the MF sequence at `mfOrder` 4 (*One thing*), the place MF-B3 left for it,
  so the daily pick and the library reach it with no client change.
- **The card.** `one_thing_again` (new `FollowUpType`, owner `mf`, tier `practice`, deep link
  `/tool/one-thing?run={sourceSessionId}&at=again&followUp={followUpId}`, chips tomorrow 09:00 / 19:00, stale after
  48 h, *Not this time*). Opening it resolves it (`OPEN_RESOLVES`). Only a run that reached an end card with a thing
  picked reopens (`reopens: {after: 'end'}`).
- **Routing.** The looping cell (`rumination_loop`, every band but flooded) leads with One thing, Problem Solve beside it
  (rows `rf_rumination_loop_default_one-thing` and the existing Problem Solve row; Five senses moves to the backup,
  `rf_rumination_loop_backup_five-senses`). Its card opens the rumination variant (`CARD_FRAMES['one-thing']`, whose
  value is the whole query `enterAt=outside&frame=ruminate`; `cardHref` passes a value with `=` through). Tags:
  acceptance, redirect, neutral. On replay's hurt words still get Recover first; the swap beside it is One thing.
- **Profile.** `PROFILE_NEEDS['one-thing'] = ['pleaseRows']`: *Eat a few bites* is never listed for someone who left
  food out of Running low in Me.
- **Exits.** First, the body (flooded, or the loop got louder) and Give your mind a job (louder). Recorded in
  `tests/fixtures/module-edges.json`, with the two hosts that wait: Problem Solve's rumination guard (MF-B9, with MF-09)
  and *one thing in the moment* inside DEAR MAN and IMPROVE (part 2).

## Where it departs from the PRD

- **No `OneThingActivity` / `MindfulnessPractice` nodes.** The activities and their instructions are skill options and
  copy (one instruction each, no fade levels yet). The options carry the `OneThingActivity` label so the graph has them.
- **The eating exclusion** reads Running low's left-out rows (`pleaseRows`), the one profile signal the app has, until
  CORE's safety intake sets a flag.
- **The follow-up** is its own `one_thing_again` card with the activity in its question, not the generic
  `offphone_rep` (MF-01's card asks about noticing, not the activity).
- **The rumination variant's external task** is one minute, not two: MF-01's Look (five finds) or Listen (60 s), the
  same embeds and lengths as Notice what's here.
- **The mode card has no rep of its own.** It is one card inside this path (MF-09 at app dose); MF-09's own skill and
  its reps come with MF-B9.
- **`attention-shift`** (the looping result's guided activity) stays as it is; becoming an MF-01 preset is part 2.
- **A plain visit has no close card.** *How much were you with it?* is the close (all answers equal); the rumination
  variant asks the loop's then-vs-now in the flow, so the close kind is `regulation_down`.
- **No dimmed screen.** With the phone, the pebble bowl's quiet screen and big *Came back* target stand in for the
  PRD's slow pulse.

## Part 2 (deferred)

| Item | Why it waits | Batch |
|---|---|---|
| Fade: phone → no phone, one instruction → none, app-picked → the person's own cue, next-day ask → nothing | Needs the fade levels on the Practice home | MF part 2 |
| *One thing in the moment* embedded in DT's IMPROVE and as the M in DEAR MAN | A hosted variant of this skill | MF part 2 |
| Problem Solve's rumination guard (re-entering *define* on a looping result offers One thing) | With MF-09's own skill | MF-B9 |
| `attention-shift` as an MF-01 preset | The guided activity's rewrite | MF part 2 |
| `OneThingActivity` nodes with per-level instructions | Fade | MF part 2 |
