# Thoughts passing through (DT-08)

**Status:** built 12 Nov 2026 on the skill runtime (DT-B5; [the modules plan](dbt-modules-plan.md) §5.1, D3: the skill
runtime is MF's practice runtime). New tool `thoughts-passing`, listed under Distress Tolerance with the Tools intent
*A thought feels like a fact*. New concept `dbt_mindfulness_current_thoughts` (`PART_OF dbt_distress_tolerance`,
`appToolId: 'thoughts-passing'`). Source: `scripts/skills/thoughts_passing.py`. Tests:
`tests/skill-thoughts-passing.test.mjs`. No new embed: the moves are `boundaryLine` (the thought on paper) and
`doseTimer`, the way back is `orientFind`. There was no old page. Rolling back is removing `'thoughts-passing'` from
`src/lib/skillRuntime/playerTools.ts` and the tool from `src/data/tools.ts`, and dropping the `thoughts` exits from Let
it be and the DEAR MAN debrief.

## What it is

PRD DT-08 (mindfulness of current thoughts, DBT DT Handout 15; defusion, Levin 2012, Masuda 2004) for a steady or
stirred moment when a thought is being treated as a fact or a command (*I'm too much*, *they hate me*, *I have to do
something right now*). The thought is received without argument, becomes an event with a start and an end, and
stepping back from it becomes a habit. About two minutes. Not for hot rumination: that is Give your mind a job and
(later) MF-05.

## The flow

| Step | What the person sees | PRD DT-08 |
|---|---|---|
| `catch` | *What's the thought?* Five of the DEAR MAN debrief's `ThoughtPattern`s, the ones that read outside an ask (the options present those nodes: *I'm being too much*, *This is probably my fault*, *I can't handle this*, …) and four general ones (*They hate me*, *I have to do something right now*, *I'm going to mess this up*, *Nothing will ever change*), or their own words (60 characters) | Step 1 |
| `heads_up` | A carried flooded reading only, once the thought is named: *Your body's loud right now.* My body first → `settle` (First, the body, no close) · Try it anyway → `file` | Flooded → DT-01 with a heads-up |
| `file` | *What kind of thought is it?* (*Naming the kind can give a little distance.*) A judgement · A prediction · An 'ought to' or a 'have to' · About me · About them · A memory, then three routes: A memory that feels like it's happening now → `replay` · It doesn't feel like my own thought → `not_mine` · About hurting myself or not being here → `harm` | Step 2; the PRD's two capacity routes, plus S9 |
| `replay` | *A memory that feels like it's happening now needs grounding first, not watching. If it happens a lot, someone trained in trauma can help.* Offers 5-4-3-2-1 and someone to talk to; no close | Intrusive trauma memory → orient and the referral line |
| `not_mine` | *Thoughts that don't feel like your own are worth talking through with a doctor, or your care team if you have one. For now, something steady around you can help.* Offers 5-4-3-2-1 and someone to talk to; no close | Psychotic experiences → the referral line |
| `harm` | The crisis banner, *That's a heavy thought to carry. Someone to talk to comes first.* and someone to talk to; no exercise, no close | voice.md S9: a crisis thought gets no coping tool |
| `move` | *Pick one way to hold it a little further off.* (*Nothing to argue with. Only a little distance.*) Put words in front of it · Slow it down · Set it on a leaf · Watch it on a screen | Step 3 |
| `having` → `frame` | The thought on paper (`boundaryLine`, their words or the chip), then 20 s saying *“I'm having the thought that”*, then the thought, then once more with *“I notice I'm having the thought that”* | "I'm having the thought that…" |
| `slow` / `leaf` / `screen` | `slow` and `leaf` are the `thoughtDrift` embed with the caught thought on screen (part 2, below): its words arriving one at a time with wide gaps (30 s); on a leaf floating across a stream at its own pace, *Another leaf* when it stays or comes back (45 s). `screen` stays a `doseTimer`: words on a screen across the room, like subtitles, staying or scrolling off in their own time (45 s). Each has its own running label (*Slowly*, *Floating*, *Watching*) | The other three moves |
| `room` | *Back to the room.* Find three things you can see (`orientFind`, eyes open) | Step 4 (MF's rule: every practice ends outward) |
| `close` | *How is the thought now?* Louder · About as loud · A bit further away · Much further away (`askFresh: 'thenVsNow'`, `regulation_down`) | Step 5, plus *louder* (the spine's in-flow close is exactly four) |
| `louder` | *Watching a thought can make it louder for a bit. That happens.* Offers First, the body | — |
| `end` | About as loud: *you noticed it as a thought. That's the skill, even when it doesn't shift*, and for a judgement, prediction, ought-to or about-them / about-me thought, *If you want to look at what it rests on, checking the facts can help* with Check the Facts. Further away: *You held it as a thought, something passing through. You can do this again, anywhere.* | — |

*Talk to someone now* is on every screen. Nothing argues with the thought, calls it untrue or distorted, or asks the
person to close their eyes.

## The links that now open it

- Let it be's end card, when the person named a willful threat (*what happens if I accept it*, PRD DT-04 step 3), offers
  it beside the other next steps (not after *Louder*, which gets the body first): the threat as a thought to watch, not
  argue with.
- The DEAR MAN debrief's fix card for *A worry or belief stopped me* (IE-11 factor `belief`, whose `opens` now lists it)
  offers it beside Check the Facts.

CORE-08's chain-analysis thought links and MF's practice library are not built, so they wait.

## What it records

`ToolSession.ext.run` (the thought, its kind, the move, each embed's result) and the spine's `thenVsNow`, direction
down. The thought in own words is capped at 60 characters and encrypted at close like every `ext` text field. Nothing is
kept to the profile.

## Routing

The concept is tagged (`side: acceptance`, `skillKind: hold`, `direction: neutral`) so a row is one line, but it has no
row yet. The two words where it fits best, the self-worth words on social threat (*worthless*, *inadequate*,
*insecure*, …) and *worried* on chronic vigilance, already show two signed-off cards (Recover + Check the Facts; Check
the Facts + Ride it out), and a row would displace one of them. The vocabulary has no sticky or intrusive-thought word, and rows gate on words, not on the rumination answers. The only free second slots are on Low drive (*tired*, *bored*, *lonely*, …), where a thought taken as a fact isn't the moment. So no row (12 Nov 2026): it is reached from Tools, Let it be and the DEAR MAN debrief, and a row is one line once a fitting word exists. Such a row must also add `CONTRAINDICATED_FOR` the vigilance +
rumination and dissociation + rumination co-occurrences, whose `contraindicatedTools` already list
`mindfulness_of_thoughts` (`schema/pattern-co-occurrence.cypher`).

## Part 2: the thought on screen (15 Nov 2026)

*Slow it down* and *Set it on a leaf* show the person's own thought (`catch`: the chip's words or their own) through
one embed, `thoughtDrift` (`src/components/skillPlayer/ThoughtDrift.tsx` over the pure `src/lib/thoughtDrift.ts`),
`variant` `slow` or `leaf`, on the deadline clock (tap to start, tap again to stop; the way on there from the start).

- **slow**: the words arrive one at a time across the first 80% of the dose, wide gaps and spaced letters, then the
  whole line sits. At most 24 words (a long paragraph turns it into reading).
- **leaf**: a stream with the thought already resting on a leaf upstream (cut at a word to 48 characters); start sets
  it floating. A leaf crosses in about 30 s, slow on purpose, whole in view for most of the way and drifting out past
  the edge at the end. *Another leaf* puts the thought on the next one any time while it runs, and the one before keeps
  floating: a new leaf never takes an old one off the water (H15a: if it stays or comes back, that's okay; up to four
  on the water). An empty stream while it runs says *The stream keeps going. If the thought comes back, it gets another
  leaf.* `doneCount` is how many leaves went on the water (a restart's fresh leaf included), a measurement, never shown.
- **Reduced motion**: the words appear without fading; the leaf rests mid-stream and a new leaf replaces it in place
  (nothing can drift, so nothing piles up).
- **Long thoughts**: an unbroken own-words thought wraps anywhere rather than scrolling the page; a screen reader hears
  the slowed thought once, whole (the arriving words are hidden from it), and the stream as the thought's label.
- Departures from the deferred note: no dragging the thought onto the leaf (it is on one already: one gesture fewer,
  and dragging your own painful sentence reads as handling it); the screen move stays a timer (subtitles already sit
  still; nothing to show that the three lines don't). *Slow it down* starts from an empty card, since the arrival is
  the exercise.
- Copy: the steps now describe what's on screen (*Your thought arrives one word at a time.*, *Your thought is on a
  leaf, on a stream.*); `leaf_another` *Another leaf*. Nothing pushes it away: no *float off*, test-pinned.

## Deferred (DT-08 part 2)

- ~~The stretching words and the drifting leaf as embeds~~: built 15 Nov 2026 as `thoughtDrift` (below).
- **MF's practice home and fade** (reps through CORE's `SkillPractice`, *caught one* off-phone).
- **CORE-08's chain links** and the **MF practice library** as hosts; the debrief's *Thoughts* step itself as a host
  (part 1 hands on from its fix card).
- **The graph content as nodes**: `DefusionMove` (with `excludedFor` emotion families; the options carry the label now),
  `MindfulnessPractice`, and `clinical_referral_psychosis` as a referral node (part 1 has the line in the copy).

## Departures from the PRD

| PRD | Built | Why |
|---|---|---|
| File it: *… a 'should' …* | *An 'ought to' or a 'have to'* | House voice: no *should*, even quoted |
| Silly voices excluded for shame-family users (graph flag) | Left out for everyone | A thought here is often about the self; the flag needs `DefusionMove.excludedFor` and the carried emotion family, neither on the runtime |
| Close: *as loud and true · a bit further away · much further away* | *Louder · About as loud · …* | The spine's in-flow close is exactly four; watching a thought can turn it up, and that needs the body. *And true* asked the person to rate the thought as true, which the close shouldn't |
| Flooded → DT-01 with a heads-up | A heads-up screen: the body, or try it anyway | The person decides; the body is offered first |
| Psychotic experiences → `clinical_referral_psychosis` | *It doesn't feel like my own thought* → a doctor / care team line and grounding | No referral node yet; the line is the same job |
| Not for hot rumination (MF-05, DT-06 first) | No rumination screen; reached from Tools and two hosts, never routed to a rumination result | No carried rumination signal on the runtime; the clinician pass asks whether to offer Give your mind a job |
| A short path for stirred | Stirred gets the full flow | Two minutes is already the short path |
| Runs on MF's practice runtime | The skill runtime | D3: they are the same runtime |

## DBT handouts, step by step

| Steps | Source |
|---|---|
| `catch`, `file` | DT Handout 15 (observe thoughts as thoughts; label them) |
| `having`, `frame` | DT Handout 15a ("I'm having the thought that…"); ACT defusion (Hayes) |
| `slow`, `leaf` | DT Handout 15a (say it slowly; leaves on a stream) |
| `screen` | ACT (Harris: thoughts as words on a screen) |
| `room` | MF's outward ending; SE orienting |
| `replay`, `not_mine`, `harm` | The PRD's capacity routes (intrusive memory, psychotic experience); voice.md S9 |

## Clinician pass (open)

- Whether *A memory that feels like it's happening now* and *It doesn't feel like my own thought* are the right words
  for the two routes, and whether either should open the safety screen directly.
- Whether *Louder* should go to the body (built) or to Give your mind a job.
- The hopelessness chips (*Nothing will ever change*, *I can't handle this*): should picking one show the crisis slot, as It isn't working does?
- Whether plain *A memory* needs a lighter heads-up, and whether a flooded *Try it anyway* should skip the imagery moves (leaf, screen).
- Whether the move step should offer *My mind won't stop* → Give your mind a job for hot rumination.
- Whether silly voices can come back for people not in the shame family once the flag exists.
