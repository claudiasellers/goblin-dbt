# Notice what's here (MF-01 Notice it, name it)

**Status:** built 15 Nov 2026 on the skill runtime (MF-B1, the first Mindfulness batch; [the modules plan](dbt-modules-plan.md)
D3: the skill runtime is MF's practice runtime). New tool `notice-and-name`, listed under Mindfulness as *Notice what's
here*, on the existing concept `dbt_observe` (`appToolId: 'notice-and-name'`). No intent line (PRD MF-01: MF adds only
two intents, *Get out of my head* and *I'm being hard on myself*). Source: `scripts/skills/notice_and_name.py`. Tests:
`tests/skill-notice-and-name.test.mjs`. New embed: `pebbleBowl` (`src/components/skillPlayer/PebbleBowl.tsx` over the
pure `src/lib/pebbleBowl.ts`). Mindfulness is now listed first on Tools (PRD §2.2 note 9, Q11). Rolling back is removing
`'notice-and-name'` from `src/lib/skillRuntime/playerTools.ts` and the tool from `src/data/tools.ts`, and putting
`five-senses` back as the watchful default row in `scripts/recommendations/content.py`.

## What it is

PRD MF-01 (observe and describe, DBT Mindfulness Handouts 4, 4a, 4b) for "I can't tell what's going on in me", "my head
is loud", or a minute's practice while it's calm. Attention gets a small job with a word or two at the end, without
anyone asking for an emotion the person can't find. One to three minutes, eyes open, outside in (the PRD's runtime
rules: eyes open, outside in, short, external anchors, a stop that lands, categorical closes, breath opt-in).

## The flow

| Step | What the person sees | PRD MF-01 |
|---|---|---|
| `way` | *Pick a way to notice.* (*Eyes open, a minute or so. Your mind will wander. Coming back is the practice.*) Look · Listen · Touch · Feet on the floor · Inside the body. A host's `frame` lists one first, never picks it: `listen` (a watchful result's card: Listen first and no Inside), `far` (Look first, no Inside), `blank` (Feet first, and *Another way: something with movement* as a link to Join in, MF-B9). A carried flooded reading: *Your body's loud right now.*, Look or Listen only, and *My body first* (First, the body) as a link | Steps 1–2; the gate table |
| `look_what` → `look` | *Find three things that are…* blue · round · soft · old, then `orientFind`: today's date and time on screen, a tap for each find | Look (neutral finds) |
| `listen` | `pebbleBowl`, a minute: *Let sounds come to you. Near or far, loud or soft. No need to find them. When your mind wanders, tap, and come back to listening.* | Listen, as receiving, not detecting (a watchful state shouldn't rehearse scanning) |
| `touch` | `pebbleBowl`, 45 s: *Notice if it's warm or cool, smooth or rough. When your mind wanders, tap, and come back to it.* | Touch |
| `contact` | `squeezeRelease`, three rounds: *press your feet down into the floor*, then *let go, and notice the difference* | Contact (the press and release) |
| `inside_where` → `inside` | *Where is something most noticeable right now?* (*Start where you touch the chair or the floor, then a little further in. … If you start to feel far away, the room is one tap away.*) The body map's places outside in (feet, legs, hands, lower back, …; never the chest, throat or whole body) or *Nothing stands out*; then `pebbleBowl`, 30 s, *{Place}. Stay with it for a little while.* with *Eyes open* first | Inside (outside-in, contact points first; heartbeat never a channel) |
| `room_stop` → `room_end` | The bowl's quiet *Back to the room* while noticing (Listen, Touch, Inside): three things you can see, then *Back in the room.* *Stopping when it's too much is part of it too.* Five senses and *If it comes with thoughts of hurting yourself* (safety.open). No word step, no close | Rule 3, a stop that lands |
| `name` | *What was it like?* One quality word for that way of noticing, offered as a guess (Inside: the check-in's sensation words, the same `SensationType` nodes), *My own word* (40 characters) or *No words today*, a full answer. Skipped on a carried flooded reading and after a bowl never started | Step 4; one word at most (stirred) |
| `else` | *What else showed up while you did this?* A thought · A feeling · A body sensation · An urge · Nothing much. Optional | Step 4, describe as Linehan frames it |
| `close` | *Compared to when you started, you feel…* Further away · About the same · A bit more here · More here (`askFresh: 'thenVsNow'`, the orienting close) | Step 5 |
| `room` → `far` | Further away: *Back to the room.* (three things you can see), then *Feeling further away can happen when attention turns in.* *Sometimes the mind steps back when things are a lot. Next time, looking or listening, eyes open, may suit you better. If it happens a lot, a doctor or therapist can help with it.* Five senses, and *If it comes with thoughts of hurting yourself* (safety.open) | Rule 5 |
| `end` | Title by the way: *Wandering is the practice. Each time you came back, that was the skill.* (the bowl) or *You noticed what was here. That counts.* (Look, the feet). A feeling that showed up → Find the feeling; a thought → Thoughts passing through, never on a watchful or far-away entry (rumination alongside contraindicates it: `schema/pattern-co-occurrence.cypher`, `thoughts-passing.md`); an urge → *If the urge is to hurt yourself*. Optional chips: *Try one without the app?* Tomorrow morning · Tomorrow evening books `offphone_rep` | Step 6, the off-phone rep |
| `end_flooded` | A carried flooded reading: *You noticed something while your body was loud. That counts.* No offers and no off-phone rep (a flooded entry runs at level 0) | Flooded |
| `offphone` → `offphone_end` | The card reopens the run (R9 `reopens`, only a run that reached `end`): *Did you get to notice something without the app?* Yes · Sort of · Not yet, each with a plain line, no close | Fade level 3's next-day report |

## The pebble bowl

`pebbleBowl` (MF-owned, C3b) is the PRD's *came back* target: a big round button (accent-tinted, accent ring) that drops
a pebble into a soft SVG bowl, with the time as a line along the rim. A pebble is always a return, never a new sound
(rule 6). The count is the embed's `doneCount` measure and appears nowhere on screen; the screen reader hears *A pebble
in the bowl.*, not how many. The heap itself is a visible amount (up to 24 pebbles; past that each tap gives the bowl a
small settle): the PRD leaves *show the pebbles at all, or keep returns invisible?* open, and this PR settles it as
"show them, never count them" for Claudia to confirm. Nothing locks: *Move on* is a quiet link from the start, the
button once the time is up, and *Back to the room* (`room`) while running. No chime (rule 8). While something covers
the step the end makes no buzz and takes no focus; focus moves to the tap target on Start and to Next at the end.
Reduced motion: pebbles appear in place. Outputs: `done`, `partly`, `skipped`, `room`, `durationSec`, `doneCount`.

## Reps, routing, links

- **Reps.** A completed visit logs an `observe` and a `describe` rep (new `PracticeSkill`s, Moderate as the PRD grades
  MF-01, `defaultFor: ['notice-and-name']`). A carried flooded visit skips the word step and still logs `describe`
  (the runtime sets reps per tool, not per path); accepted for part 1. Five senses counting as observe (PRD §2.2 note
  2) is left to MF-B3 with the DT lane, so its Reflect counts don't change here. The off-phone *Yes* is an off-phone
  rep (`OFF_PHONE_SKILLS.notice_and_name`, `followup_offphone`); *Sort of* and *Not yet* log none.
- **Routing.** A watchful result (`chronic_vigilance`, any band but flooded) leads with it, Listen listed first
  (`CARD_FRAMES`), Problem Solve beside it, Five senses the backup row (PRD MF-01 entry points; the Arch Map's "steady,
  no named trigger" is every unflooded watchful result under D1). The anxiety and worry words still lead with their own
  rows. Flooded stays body first. Tags: acceptance, orient, orient. DT lane: Five senses moves from this pattern's
  first card to its backup.
- **Exits:** First, the body (`cool_down`), Find the feeling, Thoughts passing through, Five senses, `safety.open`.
- **Ways in still to come** (`module-edges.json`, state MF-B3): First, the body's quieter close (frame `far`), Held,
  and the MF-01 card inside Hold to wait and Ride it out. Until then no host sends `far` or `blank`; the frames are
  ready for them.
- **Not a part-tag host.** Its close is orienting, but *Was this a part you know?* after a noticing practice would turn
  it inward, so it sits with Wise mind and Rehearse it in `NEVER_HOSTS` (`tests/part-tag.test.mjs`).

## Where it departs from the PRD

- **No capacity probe** (D1): the band is a carried reading only. Flooded comes from `band.current()` or a host.
- **Inside on the standard path.** The PRD offers Inside at `steady` only, and with D1 the no-band path is *stirred*.
  Hiding it everywhere would remove the only inward channel from a skill people open in calm, so it stays on the
  standard path with three guards instead: never flooded, far away or watchful; places outside in with no chest, throat
  or whole body; and *Back to the room* one tap away while noticing, said on the screen before it. The PRD's rule that
  turns Inside off for people whose check-ins are mostly alarm needs the log (MF-B3).
- **Five ways, not three curated cards.** All five are listed (Inside hidden as above), one listed first by the frame.
  Choosing three by history needs the Practice profile (MF-B3).
- **Eight word offers per way** instead of three hypotheses with *Yes · Close · Not that*: one pick, contrasting pairs
  side by side; the per-word verdict is part of the fade ladder (MF-B3).
- **What else showed up from the first rep.** The PRD holds it until fade level 1; here it is optional from the start
  (no fade levels yet).
- **The close.** The PRD's *here · partly here · far away* plus then-vs-now becomes the orienting then-vs-now asked in
  the flow, the close every MF tool uses. *Further away* runs Back to the room as the PRD's *far away* does. The
  two-strike rule (two far-away closes in a row → external only for two weeks) needs the log (MF-B3).
- **No pebble echo** (*You came back [pebbles]*) on the end card: the title names returns without a number. No *set up
  a daily practice* offer until the Practice home exists (MF-B3).
- **The off-phone rep** is offered on every unflooded end card, not only at fade level 3.
- **Find the feeling** is an end-card exit, not an embedded word step returning an emotion id (Arch Map row 12): the
  embed is ER's to build.
- **Blank's fast press.** `blank` lists Feet first; the PRD's faster cadence for it waits on `squeezeRelease` taking a
  cadence prop (DT-owned).
- **Words as graph nodes.** `DescribeWord`, `ObserveChannel`, `LookPrompt` and `MentalEventType` are the options'
  clinical labels, not nodes yet; Inside's words present the existing `SensationType` nodes.

## Part 2 (deferred)

| Item | Why it waits | Batch |
|---|---|---|
| Fade levels 0–3, the my-words shelf, choosing three ways by history, the two-strike rule, the alarm-history Inside rule | Need `PracticeProfile` and the log | MF-B3 (MF-02) |
| The daily card, the positive-state and steady practice line, *set up a daily practice* | The Practice home hosts them | MF-B3 |
| `attention-shift` and `sensory-anchor` as presets (and sensory-anchor's ending) | Graph-served guided activities | MF-B3 |
| The embedded MF-01 card for Hold to wait, Ride it out, DEAR MAN Describe and chain links | The card is a hosted variant of this skill | MF-B3 |
| Pleasant finds (never before three neutral reps, never flooded or on low-mood patterns) | Needs rep history; ends at ER-04's things I like | MF-B7 (MF-07) |
| The dissociation calm-time row | Needs the two-strike rule first | MF-B3 |
| Listen's sound dots (Tune's audio engine), the Inside silhouette (Shape), the Breath channel (opt-in) | Room work and the opt-in setting | after MF-B9 |
