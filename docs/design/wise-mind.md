# Wise mind

A mindfulness tool for when you're torn: hear what your feelings say and what your thinking says, drop in
for a few breaths, and listen for the quieter answer underneath. With parts on, the same tool becomes the
parts-aware step back from `parts.md` (*Skills are how you look after a part*, phase 6): *"Ask everyone
to take one step back. From here, what's the wise next step?"*

Status: **designed 17 Oct 2026, not built.** Claudia's steer the same night: features first, no new gates.

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
