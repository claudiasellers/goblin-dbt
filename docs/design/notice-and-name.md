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
| `way` | *Pick a way to notice.* (*Eyes open, a minute or so. Your mind will wander. Coming back is the practice.*) Look · Listen · Touch · Feet on the floor · Inside the body. A host's `frame` lists one first, never picks it: `listen` (a watchful result's card), `far` (Look first, and no Inside), `blank` (Feet first). A carried flooded reading: *Your body's loud right now.*, Look or Listen only, and *My body first* (First, the body) as a link | Steps 1–2; the gate table (Inside steady only, never far away; flooded → Look or Listen after a heads-up) |
| `look_what` → `look` | *Find three things that are…* blue · round · soft · old, then `orientFind`: today's date and time on screen, a tap for each find | Look (neutral finds) |
| `listen` | `pebbleBowl`, a minute: *Each time a new sound arrives, tap.* | Listen |
| `touch` | `pebbleBowl`, 45 s: *Is it warm or cool? Smooth or rough? When your mind wanders, tap, and come back to it.* | Touch |
| `contact` | `squeezeRelease`, three rounds: *press your feet down into the floor*, then *let go, and notice the difference* | Contact (the press and release) |
| `inside_where` → `inside` | *Start where you touch the chair or the floor. Then a little further in.* One of the body map's places (`BodyRegion`) or *Nothing stands out*; then `pebbleBowl`, 30 s on that place | Inside (outside-in scan, contact points first) |
| `name` | *What was it like?* Up to two quality words for that way of noticing, offered as guesses (Inside: the check-in's sensation words, the same `SensationType` nodes), *My own word* (40 characters) or *No words today*, a full answer. Skipped on a carried flooded reading | Step 4, words as hypotheses |
| `else` | *What else showed up while you did this?* A thought · A feeling · A body sensation · An urge · Nothing much. Optional | Step 4, describe as Linehan frames it |
| `close` | *Compared to when you started, you feel…* Further away · About the same · A bit more here · More here (`askFresh: 'thenVsNow'`, the orienting close) | Step 5 |
| `room` → `far` | Further away: *Back to the room.* (`orientFind`, three things you can see), then *Feeling further away can happen when you notice. It isn't a failure. Looking and listening, eyes open, tend to suit better for now.* and *If feeling far away comes with thoughts of hurting yourself, or happens a lot, talk to someone.* Talk to someone now on both screens | Rule 5, *far away* runs Back to the room |
| `end` | *Wandering is the practice. Each time you came back, that was the skill.* A feeling that showed up → Find the feeling; a thought → Thoughts passing through (neither on a carried flooded reading). Optional chips: *Try one without the app?* Tomorrow morning · Tomorrow evening books `offphone_rep` | Step 6, the off-phone rep |
| `offphone` → `offphone_end` | The card reopens the run (R9 `reopens`, only a run that reached `end`): *Did you get to notice something without the app?* Yes · Sort of · Not yet, each with its line, no close | Fade level 3's next-day report |

## The pebble bowl

`pebbleBowl` is the PRD's *came back* target: a big round button that drops a pebble into a soft SVG bowl, with the
time as a faint line along the rim. Returns are marks, never a number (PRD §4 rule 6): the count is the embed's
`doneCount` measure and appears nowhere on screen, and the screen reader hears *A pebble in the bowl.*, not how many.
Nothing locks: the way on is a quiet link from the start and the button once the time is up. No chime (rule 8, sound off
by default). Reduced motion: pebbles appear in place. The bowl shows 24 pebbles at most; later taps still count.
Outputs: `done` (the whole time), `partly`, `skipped` (never started), `durationSec`, `doneCount`.

## Reps, routing, links

- **Reps.** A completed visit logs an `observe` and a `describe` rep (new `PracticeSkill`s, `defaultFor:
  ['notice-and-name']`; `observe` also lists `five-senses`, PRD §2.2 note 2: Five senses is an observe practice filed
  under DT). The off-phone *Yes* is an off-phone rep (`OFF_PHONE_SKILLS.notice_and_name` in
  `functions/src/skills/projections.ts`, `followup_offphone`); *Sort of* and *Not yet* log none.
- **Routing.** A watchful result (`chronic_vigilance`, any band but flooded) leads with it, opened on Listen
  (`CARD_FRAMES`), Problem Solve beside it, Five senses the backup row (PRD MF-01 entry points: Listen in a non-threat
  framing for a watchful state, which had no MF card). Tags: acceptance, orient, orient. The anxiety and worry words still
  lead with their own rows. Flooded stays body first.
- **Exits:** First, the body (`cool_down`), Find the feeling, Thoughts passing through, `safety.open`.

## Where it departs from the PRD

- **No capacity probe** (D1): the band is a carried reading only. Flooded comes from `band.current()` or a host.
- **The close.** The PRD's *here · partly here · far away* plus then-vs-now becomes the orienting then-vs-now asked in
  the flow (*Further away … More here*), the close every MF tool uses. *Further away* runs Back to the room as the PRD's
  *far away* does. The two-strike rule (two far-away closes in a row → external only for two weeks) needs the log and
  waits for MF-02.
- **The off-phone rep** is offered on every end card, not only at fade level 3, because there are no fade levels yet.
- **Words.** The PRD's *Yes · Close · Not that* per offered word is a pick of up to two; contrasting pairs sit side by
  side. `DescribeWord`, `ObserveChannel`, `LookPrompt` and `MentalEventType` are the options' clinical labels, not graph
  nodes yet; Inside's words present the existing `SensationType` nodes.

## Part 2 (deferred)

Fade levels 0–3 and the my-words shelf (MF-02's `PracticeProfile`), the Practice home's daily card, the graduation to
pleasant finds (never before three neutral reps, never flooded or on low-mood patterns), Listen's sound dots (Tune's
audio engine), the Inside silhouette (Shape), the Breath channel (opt-in), `attention-shift` and `sensory-anchor` as
presets, the positive-state and steady practice line, the embedded card for other tools, the dissociation calm-time row.
