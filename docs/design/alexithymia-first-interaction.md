# Alexithymia-first interaction: Stage, Shape, Tune

Status: agreed direction, not built. Prototypes: `prototypes/goblin-lab/` (run with `npm i && npx vite`).
Tool specs: [find-the-feeling.md](find-the-feeling.md) (Shape it + Tune it) and
[recover-from-invalidation.md](recover-from-invalidation.md#v2-stage-it) (Stage it).

## Why

The app was built on self-report scales: a 2D intensity grid at check-in, 0–10 urge buttons in Opposite
Action and DEAR MAN, a 1–10 slider in Urge Surfing, and 0–10 readings throughout Recover from a hurtful
moment. The people this app is for often have alexithymia. They can't reliably name what they feel, let
alone grade it, so every scale asks for the one thing they can't do, and the gates built on those numbers
rest on noise.

## Principles

1. **Recognise, don't rate.** People pick between concrete things (a situation, a shape, a sound, a reply
   they'd send), never a number or a slider. Comparison ("which is closer?") replaces magnitude.
2. **Capacity, not intensity.** Arousal gates use a behavioural probe with three bands instead of 0–10:
   "If someone asked you for a favour right now, you'd… say yes like normal / say yes with an edge /
   couldn't answer, or would regret it" → `steady` / `stirred` / `flooded`.
3. **The word is a hypothesis.** The app offers a word ("things shaped like this are often called…") and the
   person says yes, close or not that. "I don't know" is always a complete answer.
4. **The body does the regulating.** Calming and waking are direct manipulation with a physiological
   rationale (slow stroking, breath holds that tune strings, zooming out), not instructions to read.
5. **Words are the game.** Every accepted word joins one collection, shown three ways (shelf, strings,
   scenes). Emotional granularity is the skill; the collection makes it visible.
6. **Graph first.** Word signatures, routing, gates and copy live in Neo4j; the frontend renders.

## The three rooms

| Room | Paradigm | What it's best at | Where it lives |
|---|---|---|---|
| **Stage** (theatre) | Rebuild the moment with figures on a tiny 3D stage | Relational events: what happened between people, what you needed from them, rehearsing the opposite action | Recover from a hurtful moment (spine); DEAR MAN and Do the Opposite (rehearsal) |
| **Shape** (gallery) | The feeling becomes a sculpture you shape by forced choice, then smooth or warm by hand | Finding a feeling silently, anywhere | Find the feeling (default way in); check-in "I can't tell what I'm feeling" |
| **Tune** (music room) | Find the feeling as a sound by warmer/colder search; breathe detuned strings back into tune | Finding a feeling by ear; paced breathing | Find the feeling (second way in); Cool Down, Pause |

Each room keeps its own art direction, but they share type, colour tokens, controls and transitions so
they read as one house, not three apps.

## Mechanics as shared components

The rooms are made of separable mechanics that other tools can use:

| Mechanic | Room | Clinical job | Also used by |
|---|---|---|---|
| Forced-choice sculpting | Shape | Identify a feeling | Check-in |
| Warmer/colder sound search | Tune | Identify a feeling | — |
| Urge loops (lunge / cling / sink / grey out) | Shape, Tune | Recognise the action urge | Urge Surfing (the urge rises and fades on your own object) |
| Slow-stroke smoothing | Shape | Down-regulate (affective touch) | Cool Down |
| Breath-tuning strings | Tune | Down-regulate (paced breathing) | Cool Down, Pause |
| Step back / zoom out | Stage | Down-regulate (visual self-distancing) | Cool Down |
| Rub warm / pluck awake / find three things | Shape, Tune, Stage | Activate out of shutdown | 5-4-3-2-1 |
| Set the scene / set it how you wanted | Stage | Recognise the event; express the need spatially | DEAR MAN (need arrives pre-filled) |
| Enacted opposite action | Stage | Rehearse | Do the Opposite |
| Ambient descent (the room drifts calmer below notice; brighter for shutdown) | Tune, Shape, Stage (lighting) | Down-regulate without asking for effort | every regulation-bearing tool |
| Then vs. now | all | Comparison close instead of re-rating | every tool |

## Where every scale goes

| Today | Replaced by |
|---|---|
| Check-in intensity grid (`IntensityGrid`, x = pleasantness, y = intensity) | Capacity band. `y` is written from `bandIntensity` (steady 0.35 / stirred 0.6 / flooded 0.85); `x` comes from the chosen emotion's quadrant. New option: "I can't tell what I'm feeling" → short Find the feeling → emotion id + band |
| Opposite Action `UrgeScale` 0–10 before/after | Urge loop on the person's own object; close is then-vs-now comparison |
| DEAR MAN intensity check + `dearManSafety` 0–10 gates | Capacity band; `gateFor(band)` replaces `gateFor(number)` |
| Urge Surfing 1–10 slider | The urge as a moving object that visibly peaks and fades; "still here / fading / gone" |
| Recover from a hurtful moment 0–10 readings, rerate | Capacity band + Stage; see recovery-v2 |

Gate translation (same clinical thresholds, no numbers on screen): `flooded` ≈ old ≥7 (downshift),
`stirred` ≈ 6, `steady` ≈ ≤5 (ask allowed). The old cold-reset threshold (≥9) becomes an explicit offer
inside the flooded regulation step ("still too hot to think?") rather than a number.

Analytics note: growth insights ("catching it earlier") average `intensityY`. Bands keep them working but
coarser (three levels). The replacement signal is the then-vs-now close, which is a better outcome measure
anyway; add it to the insight queries in phase 1.

## One collection, three views

`(:User)-[:FOUND_WORD {firstAt, lastAt, count, ways}]->(:Emotion)`, written by every save function that
records an accepted word (Find the feeling, Recover, check-in). The Collection page has three rooms over the
same data: shelf (each word's shape signature rendered as a small object), strings (each word's sound
signature as a harp string), scenes (Stage sessions labelled with their word). A word found by shape
appears on the harp too, which quietly teaches that it's the same feeling.

## Engineering

- **One 3D runtime.** three + @react-three/fiber + drei, loaded only by the tools that need it
  (`React.lazy` per room). No postprocessing chains. DPR capped at 2.
- **2D fallback for every mechanic.** Low-power devices, `prefers-reduced-motion`, and failed WebGL
  context get a canvas/SVG version with the same gestures and outcomes. Required before phase 1 ships.
- **Frame budget.** Measure on a mid Android and an older iPhone before phase 1 ships; Shape's vertex
  shader is the heaviest piece.
- **Audio.** Web Audio, off until the person turns it on, and every Tune step works muted.
- **Graph-driven content.** Prototype code hard-codes word tables and copy; the production version reads
  them from `getFindTheFeelingContent` (see find-the-feeling.md). No emotion knowledge in `src/data/`.

## Order of work

0. **Fix the tool-id join (bug, independent of this work).** `getStateAndTools` turns graph ids into app ids
   with `normalizeToolId` (strip `dbt_`, `_`→`-`). That yields `tipp`, `stop` and `problem-solving`, which
   don't exist in `src/data/tools.ts`; recommended cards for those show a wrench and route nowhere. The
   find-the-feeling migration adds `appToolId` on the concepts; `getStateAndTools` should read
   `coalesce(tc.appToolId, <normalized>)`.
1. **Foundations + Find the feeling + check-in.** Shared mechanics with 2D fallbacks, the FOUND_WORD
   collection, `schema/find-the-feeling.cypher`, Cloud Functions, the tool, and the check-in entry.
2. **Recover from a hurtful moment v2 on Stage**, with a short Shape/Tune at its "what's inside" step and
   the need handed to DEAR MAN. Content bump to recovery-v2 (bands replace every number).
3. **Distress tolerance adopts the mechanics:** Cool Down (stroke / tune / step back), 5-4-3-2-1 (find
   three things, pluck awake), Urge Surfing (urge object), Pause (one tuning breath).
4. **Opposite Action and DEAR MAN** swap scales for bands and gain Stage rehearsal.

## Before anything ships

- Clinical sign-off on: word signatures and families, capacity probe wording, gate translation, every
  regulation mechanic's copy, the flooded+blank rule, and the routing table.
- Hands-on tuning on real phones: Stage's drag-speed thresholds (chase vs. fight), Shape's stroke speed
  band, Tune's breath-hold length.
- A person listens to Tune's sound design.
- User sessions with people who score high on alexithymia measures: does picking a shape or sound get to an
  accepted word more often than the emotion wheel does? Log `way`, `wordAccepted`, words offered before
  acceptance.
