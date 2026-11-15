# Wise mind

A mindfulness tool for when you're torn: hear what your feelings say and what your thinking says, drop in
for a few breaths, and listen for the quieter answer underneath. With parts on, the same tool becomes the
parts-aware step back from `parts.md` (*Skills are how you look after a part*, phase 6): *"Ask everyone
to take one step back. From here, what's the wise next step?"*

Status: **built 17 Oct 2026**. The minds form is listed for everyone; the parts-aware step back (2p) is
built behind the parts copy sign-off (*As built*, below). Claudia's steer the same night: features
first, no new gates.

---

## Why this tool, and why now

- **DBT.** Wise mind is the synthesis of emotion mind and reasonable mind (Linehan, *DBT Skills Training
  Handouts*, Mindfulness 3 and 3a). It is a state you reach by practice, not a part of you and not an
  answer the app supplies. Handout 3a's practices are short and bodily: a stone flake settling on the
  bottom of a clear lake; walking down an inner spiral staircase; breathing "wise" in and "mind" out;
  asking wise mind a question on the in-breath and listening on the out-breath; resting in the pause
  between breaths. Its check is felt: wise mind tends to feel calm and settled; emotion mind dressed up
  as wisdom tends to feel pushed and urgent.
- **The app has nothing for "what now?"** that isn't a protocol (Problem Solve, DEAR MAN). The routing
  review already wrote Wise Mind's row (watchful words → `chronic_vigilance` → `wise-mind`, switched off
  in `PLANNED`), and `wiseMindAnswer` has been an ask-fresh field since the data layers were drawn.
- **Parts.** IFS's Self and DBT's wise mind are parallel, not equivalent (`functional_parallel` in the
  graph: one is posited, the other practised). The tool keeps that line. The parts-aware form asks the
  parts who are here to step back so *you* can listen. It never calls the result Self, and the app never
  speaks as it. It is also where Two pulls should end: *"I can hear both of them, and choose what I do
  next"* needs a place to choose from.

---

## The flow

Six short screens, each one tap to move on, each skippable except the practice. Curated chips first,
own words as the escape hatch (≤ 140 characters, never linted, never shown back outside this visit and
My words). `TooMuchLink` on every screen, as in the other tools. No band gate.

### 1. The question

*"What would you like wise mind's help with?"*

Chips: *What to do next* · *Whether to say something* · *Whether to let it go* · *What I actually need* ·
*Whether to trust this feeling* · *Nothing in particular, I want to settle* · own words.

The entry may put one chip first (from Two pulls: *What to do next*; from DEAR MAN's prep: *Whether to say
something*), never pre-selected.

### 2. Both minds (the default form)

The screen is DBT's diagram drawn as light: two overlapping soft circles in the room's colours, warm
on the left (*emotion mind*), cool on the right (*reasonable mind*), the overlap barely lit.

- Tap a circle: *"Emotion mind says…"* / *"Reasonable mind says…"*, each with 3–4 chips **for the question
  picked** plus own words. Either may be left empty (*Nothing comes*).
- After both (or one and *Nothing comes*): one witness line, *"Both make sense from where they stand."*
  Neither circle is marked as wrong.

Example, *Whether to say something*: emotion mind *Say it now* · *Don't, it'll go badly* · *They should
already know*; reasonable mind *Wait until you're calm* · *It's not worth the fight* · *Get the facts
first*.

### 2p. The step back (the parts-aware form)

Shown instead of 2 when parts are on, the person has at least one active or resting part, and the
`wise_mind` parts copy ships. A quiet link, *"Use the two minds instead"*, switches back.

- The room from the den, small: the light in the middle. *"Who's here about this?"* The person's parts
  as `PartFigure`s with their names (tender ones covered), plus *A part I haven't met* and *No one in
  particular*. Tapping places a figure near the light.
- *"Ask everyone to take one step back."* One `LightHold`: as it fills, the figures move to the room's
  edge and the light widens. Reduced motion: they step back in one move.
- A figure can be tapped for *It won't step back* → *"That's fine. It might need its own time."* with
  *Meet it another time* (a kept part: link to Meet a part for it; *A part I haven't met*: queue a
  `PartCandidate`, origin `wise_mind`, on that tap). The flow goes on either way.
- The parts the person placed get a `PartTag {source: 'wise_mind'}` on this session (their tap is the
  yes; one tag per session per source, as `tag.ts` already does).
- A placed part with the safety flag: `CrisisBanner` compact under the room, alongside (the seam).

### 3. Drop in

*"Choose a way in."* Three cards, one highlighted by default (*Ask and listen* when there's a question;
*Stone on the lake* for *Nothing in particular*):

- **Stone on the lake.** A flat stone drifts down through clear water and settles on the sand. Three
  lines over about forty seconds. 2D, in the room's colours; reduced motion: three still frames.
- **Wise in, mind out.** Five breaths. Press and hold on the in-breath (*wise*), let go on the out-breath
  (*mind*), the same press as `LightHold`, with a hands-free tap mode.
- **Ask and listen.** Three breaths. In: the question, in the person's words or the chip's. Out:
  *"Listen."* Nothing is shown during the out-breath.

No countdown numbers and no progress score. *I'm here* is always on screen to move on early.

### 4. What comes

*"What does wise mind say?"*

Chips: *I already know what to do* · *Wait, not now* · *Say it, kindly* · *Let this one go* · *Ask someone
for help* · *Look after myself first* · *Nothing yet* · own words.

- *Nothing yet* → *"Wise mind is often quiet. It can arrive later, on a walk or in the shower."* → close.
- The answer is `wiseMindAnswer` (ask-fresh: stored on this visit only, never pre-filled).

### 5. Is this wise mind?

*"How does it feel?"* *Calm, settled* · *Pushed, urgent* · *Not sure*.

- *Calm, settled* → *"That sounds like wise mind."*
- *Pushed, urgent* → *"That might be emotion mind talking."* (parts form: *"A part might still be
  close."*) with *Drop in once more* (back to 3, once) and *Keep it anyway*. Never a block.
- *Not sure* → *"Keep it and see how it sits."*

### 6. One next step, and keep it

*"What's one thing you'll do with it?"* A short list from the answer's `nextToolIds` (e.g. *Say it,
kindly* → Ask for what you need; *Look after myself first* → Circuit Breaker, 5-4-3-2-1; *Let this one go*
→ Pause), plus *This is enough for now*. A tool hands off through `linkTo`.

*Keep what wise mind said* saves one line to My words, in the person's voice: *"Wise mind said: wait, not
now."* (chip) or their own words. Same store My words already reads for kept lines; on that tap only.

**Close:** the spine's `orienting` close (*Further away … More here*), unless the visit handed off.

---

## Where it starts

- **Tools**, Mindfulness (*Notice it*), listed for everyone.
- **Intents:** *"I'm torn about what to do"* → Wise mind.
- **Two pulls**, after the keepsake: *"Ask wise mind what's next"*, opening the parts form with both
  figures already in the room.
- **The check-in result:** only when Claudia signs off the watchful row (it stays switched off until
  then; I'll ask once the tool lands).

---

## Content and data

- **Content in the graph**, like Find the feeling's: `scripts/wise-mind/content.py` → `build.py` →
  `schema/wise-mind.cypher` (MERGE-only, constraints, `LOAD_ORDER`), served by a public
  `getWiseMindContent` and shipped as the generated `src/data/content/wise-mind.json`
  (`scripts/content-snapshot/`). Nodes: `WiseMindQuestion`, `MindVoice {mind: 'emotion'|'reason'}` linked
  to the questions it answers, `WiseMindPractice` (lines, breaths) hung off `dbt_wise_mind`,
  `WiseMindAnswer` (`nextToolIds`), and the flow copy. Voice-linted. Not gated on sign-off (like Find the
  feeling and Recover); the parts form's lines are parts copy (`scripts/parts/content.py`, flow
  `wise_mind`) and wait for the parts sign-off like every other parts line.
- **The concept:** `dbt_wise_mind.appToolId = 'wise-mind'`. Its routing row stays switched off.
- **The visit:** a `ToolSession` (`closeKind: 'orienting'`, module `mf`) with `ext.wm`: `questionId`,
  `questionOwn`, `form` (`minds` | `parts`), `emotionSaysIds` / `emotionSaysOwn`, `reasonSaysIds` /
  `reasonSaysOwn`, `partIds`, `stillCloseIds`, `practiceId`, `answerOwn`, `feel` (`calm` | `pushed` |
  `unsure`), `onceMore`, `nextToolId`, `kept`. `wiseMindAnswer` is the top-level ask-fresh field.
  Registered in `extSchemas.ts`; `wm` own-words fields are length-checked only.
- **Counts toward what helps:** yes. Wise mind is a skill, like 5-4-3-2-1, and a *More here* after it
  means the skill helped (unlike meeting a part).

## Never

- Never tells the person what wise mind says, and never calls the answer right.
- Never names it Self, never draws the person as a figure, never speaks as them.
- No scale, score, streak or "how wise" rating.
- Never asks a part to leave or stop: *a step back*, so you can listen.

---

## As built (17 Oct)

**Since 15 Nov (MF-B6):** the tool has a second form, the check on the skill player (`?frame=check`, the Tools card
*Check a decision with wise mind*, the intent *Help me decide before I act*, and the look-back card's reopened run),
in [wise-mind-check.md](wise-mind-check.md). This page stays the default.

- **Where:**
  - `src/pages/tools/WiseMind.tsx` (lazy), `src/components/tools/wiseMind/` (`TwoMinds`, `Practices`,
    `bits`), the pure flow in `src/lib/wiseMind.ts`.
  - Listed under Mindfulness for everyone, and the intent *"I'm torn about what to do"*.
  - Spine: `wise-mind` is `{ module: 'mf', closeKind: 'orienting' }`. Wise mind is in the tag row's
    `NEVER_HOSTS`, so a parts tag row never follows it.
- **Content:**
  - `scripts/wise-mind/content.py` → `schema/wise-mind.cypher` (`LOAD_ORDER` after `parts`, before
    `recommended-for`; five constraints).
  - 6 questions, each with a default practice. 36 `MindVoice`s (3 per mind per question). 3 practices
    (*Stone on the lake*, *Wise in, mind out*, *Ask and listen*) hung off `dbt_wise_mind`. 7 answers
    with real `nextToolIds` (*Nothing yet* is the quiet kind). `WiseMindFlow` for the screen copy.
  - Voice-linted (flow-doc files).
  - The public `getWiseMindContent` serves it, and `src/data/content/wise-mind.json` ships it. A
    refresh that finds no Wise mind content keeps the committed file and warns (`KEPT_WHEN_MISSING`);
    a wrong version throws.
  - `dbt_wise_mind.appToolId = 'wise-mind'`. The concept stays in `PLANNED`, and the watchful row
    stays off and a draft (test-pinned). `PracticeSkill wise_mind` (Preliminary) is in practice-spine.
- **Both minds:**
  - Once heard, a circle shows what it said under its name: the chip label, or the person's own words
    clamped to two lines. *Nothing comes* shows as "…".
  - Tapping a heard circle reopens its chips with the pick marked.
  - When both have been heard, the overlap brightens one static step.
- **Practices:**
  - *Wise in, mind out* uses the shared `HoldButton`: a hold per in-breath, plus a hands-free tap
    mode.
  - Reduced motion shows the stone as still frames.
  - Focus stays in the screen, never dropping to the page, after the hold, the close, a hand-off and
    *This is enough for now*.
- **The visit:**
  - `ext.wm` is registered in `extSchemas.ts`, with a `text` type on the `*Own` keys (1–140,
    length-checked only).
  - `wiseMindAnswer` is set through `setWiseMindAnswer`, kept only for `wise-mind`.
  - *Keep what wise mind said* goes through `recordWitnessBeat` with moment `wise_mind` (no band needed
    when no witness line was shown), into My words.
- **The seam for 2p:**
  - `form: 'minds' | 'parts'`.
  - Step `stepBack` renders `StepBackSlot.Room`.
  - The pushed line has a parts form.
  - `?a=&b=` presets the parts (from Two pulls' *Ask wise mind what's next*).
- **The step back (2p), built:**
  - `src/lib/wiseMindParts.ts` (pure: the gate, copy, room state, what it writes) and
    `src/components/tools/wiseMind/parts/` (`StepBackScreen`, `StepBackRoom`), mounted through
    `useStepBackSlot`, so the minds form never loads parts code.
  - It shows when parts are on, there's ≥ 1 active or resting part and every `WISE_MIND_PARTS_REQUIRED`
    line ships. Otherwise the two minds show, as before.
  - With parts brought in from Two pulls, *Skip* on screen 1 opens the step back rather than the
    practice.
  - It writes part ids only: `ext.wm.partIds` and `stillCloseIds`.
  - One `PartTag {source: 'wise_mind'}` goes on the visit per placed kept part, open or closed.
  - *A part I haven't met* → *It won't step back* → *Meet it another time* queues a `PartCandidate`
    with origin `wise_mind`.
- **Entry links:** `?first=<question id>` puts that question chip first, not pressed. Only Two pulls
  sends one today (`wm_q_next`). `?a=&b=` places the two parts.
- **Review:** `dev/review/wiseMindParts.tsx` is the step back's own surface and pack, `wise_mind_parts`.
  `dev/review/wiseMind.tsx` is the review page's Wise mind surface (pack `wise_mind`,
  every screen and branch). It reads `wise-mind.json` directly, and `check.mjs` checks each branch's
  expected and absent lines.
