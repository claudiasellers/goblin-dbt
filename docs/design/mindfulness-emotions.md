# Let it be a wave (ER-08)

**Status:** part 1 built 13 Nov 2026 on the skill runtime (ER-B5; [the modules plan](dbt-modules-plan.md) §5.1, D3:
the skill runtime is MF's practice runtime). New tool `mindfulness-emotions` (the id ~53 graph routes already point at,
PRD open question 1), named *Let it be a wave*, listed under Emotion Regulation with the Tools intent *Let a feeling
be*. New concept `dbt_mindfulness_current_emotion` (`PART_OF dbt_emotion_regulation_module`, `appToolId:
'mindfulness-emotions'`). Source: `scripts/skills/mindfulness_emotions.py`. Tests:
`tests/skill-mindfulness-emotions.test.mjs`. No new embed: the wave is DT-05's `urgeWave` with the feeling's copy (the
shared engine the plan names). There was no old page. Rolling back is removing `'mindfulness-emotions'` from
`src/lib/skillRuntime/playerTools.ts` and the tool from `src/data/tools.ts`, and marking the hosts' exits `planned`
again (Check the Facts, It isn't working, Problem Solve) or dropping them (Do the Opposite's keep card, the lid's
reopen).

## What it is

PRD ER-08 (mindfulness of current emotion, DBT ER Handout 22) for a steady or stirred moment when a feeling fits,
can't be fixed, and the person is fighting it: ashamed of being angry, afraid of the fear, shoving the sadness away.
Or a good feeling they can't let themselves have. The person becomes the container that receives the feeling without
blocking or amplifying it (absorb turned inward); the wave gives it a beginning, a crest and an end (transform). About
two minutes.

## The flow

| Step | What the person sees | PRD ER-08 |
|---|---|---|
| `feel` | *What's the feeling?* Carried words first, nine common ones (sad, scared, angry, ashamed, guilty, lonely, hurt, happy, loving), any word behind *More words* | Entry: the word the host carried |
| `blank` | numb, empty, apathetic or indifferent: *When a feeling is hard to reach, coming back to the room comes first.* 5-4-3-2-1 (and someone to talk to for numb and empty, safety-screen words); no wave, no close. Before the flooded heads-up | Blank / numb / dissociated: not offered |
| `heads_up` | A carried flooded reading: *Your body's loud right now.* My body first → `settle` (First, the body, no close) · Try it anyway → `where` | Flooded → ER-01 first |
| `where` | *Where do you notice it in your body?* The 15 places (the options present the `BodyRegion` nodes the check-in marks), one or two, or *I can't find it* (a full answer). A safety-screen word (worthless, despair, helpless, powerless) adds the line about thoughts of not being here, never a gate | Step 1 (quick shape: tap the body) |
| `wave` | *Don't push it away. Don't hold on to it.* and *Pushing tends to make a feeling stick, and holding on makes it bigger. Let it rise and fall on its own. Eyes open is fine.* The wave (`urgeWave`): a soft check every 30 s (*Still here · Easing · Gone · Bigger*), four at most, *Stop here*; no digits or durations | Steps 2–3, the two errors in words |
| `bigger` | Bigger twice: *It's getting bigger.* (*That can happen when you stop pushing a feeling away.*) Something for my body → `switch` (First, the body, no close) · Keep watching it → `wave2` (from where it was; bigger twice again → `switch`) | Overwhelm: always an exit |
| `close` | *You're the one noticing it.* (*There's the feeling, and there's you, watching it. You're more than this feeling.*) above *How is the feeling now?* Louder · About the same · A bit quieter · Much quieter (`askFresh: 'thenVsNow'`) | Steps 4 and 6 |
| `louder` | *Letting a feeling in can make it louder for a bit. That happens.* First, the body | Close |
| `end` | About the same: *It doesn't have to go anywhere. You let it be here, and that's the skill.* Quieter: *You let it rise and fall without pushing it away. You can do this again, anywhere.* (the heavy line after either, for a safety-screen word) | Step 6, PRD's line |
| `savour_wave` | A good feeling (the happy family on both pleasant quadrants, and amazed, excited, astonished, awe, eager, energetic, surprised): *Let it be as big as it is. You don't have to make it last.* and *If a worry about it ending shows up, notice it, and come back to the feeling.* The same wave, no bigger branch | Savouring mode (H15) |
| `savour_end` | *You let a good feeling be here, without needing it to last. That counts.* Good things on `frame=savour`; no then-vs-now | Savouring's close offers ER-04 |

*Talk to someone now* on every screen. Nothing asks the person to close their eyes or go back to a memory: the wave is
for the feeling now.

## The links that now open it

- Check the Facts' verdict: *fits* (with Let it be) and *doesn't fit* (beside Do the Opposite), carrying the word. The
  verdict lines say so (*While it can't change, you can let the feeling be.* / *…or you can let it rise and fall.*).
- Do the Opposite's keep card (*No, I want to keep it*): beside Problem Solve, DEAR MAN and Ride it out, carrying the
  word; the line is now *Want help acting on it well, or a minute to let it be here?*
- Problem Solve's not-an-emotion words whose alternative skill is the wave (`not_fit` other), carrying the word.
- It isn't working's *it fits* fix, between Problem Solve and Let it be.
- Give your mind a job's lid reopen: *can't be changed* offers the wave beside Let it be (PRD: what DT puts away while
  flooded comes back here when steady).

## What it records

`ext.run` (the runtime's attempt record): the path, the word (`feel`, the visit's emotion), the places (`where`), the
wave's samples in order and how it ended, the bigger choice. `thenVsNow` (ask-fresh) from the close; none on the
savouring path. No keep, no follow-up.

## Routing

Tagged (`acceptance`, `hold`, `neutral`) and `CONTRAINDICATED_FOR` dissociation (primary or alongside). No row yet:
the hosts that carry a word to it are where it's reached in part 1. A row is one line in
`scripts/recommendations/content.py`.

## Deferred (ER-08 part 2)

- The push and grab gestures (flick bounces back, pinch makes it grow) and FTF's rooms as the visual (`waveRoom`).
- *A time it was different* (steady, from the word collection's previous instance).
- The DT containment return as an entry (the lid reopen links here now; a dedicated return card does not exist).
- FTF's *Stay with it for a minute?* and the positive-state result as entries; MF-02's practice home.
- Louder twice running → It isn't working (needs the last visit's close).
- Savouring's *keep it* (ER-04's directory), the follow-up from Check the Facts (*check in on this tomorrow?*), the
  stirred 60 s / room-sound variant, distanced self-talk in the person's name, fade (words only, timer, off-phone cue),
  the `SkillPractice` rep and push / grab counts.

## Departures from the PRD

- The two errors are said, not taught by gesture (part 1 has no gesture embed); they head the wave rather than a screen
  of their own, so every screen keeps its quiet link.
- *You're the one noticing it* heads the close on the same screen (an ask step's quiet links live on its fields).
- Savouring has no then-vs-now: a good feeling getting quieter isn't the outcome.
- A blank word gets grounding even with a flooded reading (the body's heads-up would offer calming to someone far away).
- Surprises that aren't good feelings (startled, confused, shocked, dismayed, disillusioned, perplexed) get the wave,
  not savouring.

## Clinician pass (open)

The heavy line's placement, the blank list, and whether *About the same* should ever offer Check the Facts.
