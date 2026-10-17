# Cope Ahead

A tool for something hard that's coming: name it, say what might show up, pick what you'll do at the
hardest moment, rehearse it in your mind as if it's happening, settle, and keep the plan. Afterwards,
Today asks how it went.

Status: **designed 17 Oct 2026, not built.** It's the recommended answer on Claudia's "what next" card.
Work starts on it while the card is open, and it stops if she picks another option.

---

## Why this tool

- **DBT.** Cope Ahead is Emotion Regulation Handout 19 (Linehan, *DBT Skills Training Handouts*). It has
  five steps:
  1. Describe the situation, and the emotions and actions likely to get in the way.
  2. Decide what skills to use, specifically.
  3. Imagine the situation vividly, *in it, not watching it*.
  4. Rehearse coping effectively, including with the worst thing that could happen.
  5. Practise relaxation afterwards.

  It reduces vulnerability, so it is used *before* the moment, when there is room to think.
- **The evidence it borrows:**
  - **If-then plans** (implementation intentions) have a medium-to-large effect on reaching goals
    (Gollwitzer & Sheeran 2006, d ≈ 0.65). They also work for emotion regulation: an if-then plan beats
    a goal alone at down-regulating disgust and spider fear (Schweiger Gallo, Keil, McCulloch,
    Rockstroh & Gollwitzer 2009).
  - **Imagery moves emotion more than words do, and field-perspective imagery more than observer
    imagery** (Holmes & Mathews 2010; Holmes, Coughtrey & Connor 2008). That is why step 3 says *in it,
    not watching*.

  The tool's core is therefore one if-then line, rehearsed once in the first person.
- **The app already asks for it.**
  - The routing review gives Cope Ahead the lead for anticipatory anxiety. The *anxious* and
    *nervous* rows send it to `cope-ahead`, switched off in `PLANNED`.
  - DEAR MAN has a per-part cope ahead in its prep, and Recover has *Rehearse the next time*.
  - Each is a piece of this tool, tied to one module. Cope Ahead makes it a skill on its own, for any
    situation.
- **Parts.** "Who might show up?" from DEAR MAN works for any hard situation, not only a conversation.
  With parts on, a part's anchor line ("If {name} shows up: …") becomes part of the plan. This is
  *Skills are how you look after a part* (parts.md, decision 5): the person, not the part, decides
  what to do when it arrives.

---

## The flow

Seven short screens, each a tap to move on. Curated chips come first, with own words as the escape
hatch (≤ 140 characters, never linted, never shown back outside this visit, My words and its Today
card). `TooMuchLink` sits on every screen. There is no band gate, as in Wise mind.

### 1. What's coming?

*"What's coming up?"*

Chips:
- *A conversation I'm dreading*
- *Seeing someone in particular*
- *Something at work or school*
- *A place or an event*
- *A day that's hard every year*
- *Being on my own*
- *Something else*, with own words

Then: *"When is it?"* — *Today* · *Tomorrow* · *This week* · *Later, or not sure*. This sets when
Today asks afterwards (screen 7).

### 2. What might show up?

- *"What might you feel there?"* offers up to two chips from the situation's `likelyFeelings`. These
  are check-in grid words, so the person's own vocabulary carries over. *Something else* opens the
  word list, and *Not sure* is also offered.
- *"What might you want to do?"* offers Find the feeling's four pulls (the same as Urge Surfing's
  "What does it want to do?"), plus *Not sure*.
- **Parts on, with at least one kept part:** *"Who might show up?"* is DEAR MAN's cope ahead step,
  reused as is (`CopeAheadStep`, `COPE_REQUIRED`, `showCopeAhead`). The `partAnchors` slice is
  declared for `cope-ahead` too, in `PROFILE_NEEDS`. A chosen part brings its anchor line into the plan
  on screen 4. It shows only when the parts copy ships, like everywhere else.

### 3. The hardest moment

*"What's the moment you're most worried about?"* offers 3–4 chips from the situation's `hardMoments`
(*They raise their voice*, *I go blank*, *Nobody talks to me*, *I start crying*), plus own words.

- This is the handout's "rehearse coping with your worst fear". The app asks for one moment, never a
  list.
- **A danger chip** (*They might hurt me*, on *Seeing someone in particular* and *A conversation I'm
  dreading*) shows `CrisisBanner` compact under the screen, alongside, never instead. The plan's
  first move becomes *Leave and get somewhere safe*, and the flow goes on.

### 4. If it happens, I'll…

The plan is one if-then line built from taps:

> **If** *I go blank* **, I'll** *breathe out longer than in* **and** *say "Give me a minute."*

- **If:** the hardest moment from screen 3, or the pull from screen 2 ("If I start to shut down").
  The person can switch between them.
- **I'll:** 1–2 moves from `CopeMove`, filtered by the pull and the situation. A move is either:
  - **body** — *Breathe out longer than in*, *Feel my feet on the floor*, *Cold water on my hands*;
  - **words** — *Say "Give me a minute"*, *Say the one thing I came to say*;
  - **action** — *Step out for five minutes*, *Text someone I trust*, *Leave and get somewhere safe*;
  - **a tool**, linked by `appToolId` — *Pause*, *5-4-3-2-1*, *Circuit Breaker*, *Ask for what you
    need*.

  Own words are allowed (≤ 90).
- **Parts on, with a part chosen:** its anchor appears under the plan as *"If {name} shows up: {anchor}."*
  The person can set or change the anchor there, through DEAR MAN's `setPartAnchor`.
- The line reads back in the serif as the person builds it. It's one plan, not a checklist.

### 5. Rehearse it

*"Picture it as if it's happening now. You're in it, not watching."*

- Six beats, each one tap (*Next*), with no timer:
  1. Arriving.
  2. What's around you.
  3. The hardest moment begins (their chip, in their words).
  4. You notice the pull.
  5. You do your plan (their line).
  6. *"It's still hard, and you keep going."* then *"Then it's over."*
- 2D: a dim scene that brightens a step on the plan beat. Reduced motion: still frames.
- Then: *"Once more, with something you didn't expect?"* (*Yes* / *That's enough*).
  - *Yes* runs beats 3–6 again with *"Something you didn't plan for happens."* The person picks one of
    two other hard moments, or *Something else*, and keeps or changes the plan's move.
  - This is the handout's "rehearse coping with new problems". It is offered once.
- The rehearsal ends with getting through it (coping), never with it going well (mastery). The app
  doesn't predict the outcome.

### 6. Settle

*"Let your body come back to now."* The person chooses one:
- **Three long out-breaths**, the same hold as Wise mind's *Wise in, mind out* (`HoldButton`,
  hands-free tap mode);
- **5-4-3-2-1** through `linkTo`, with the plan already saved;
- *I'm OK*.

This is the handout's relaxation step. It's never skipped silently: *I'm OK* is a choice the person
makes.

### 7. Keep it

- **The plan card:** square paper with the line from screen 4 (and the part's anchor, if any), the
  same paper as Two pulls' keepsake.
  - *Keep this* saves it to My words, in the person's voice ("If I go blank, I'll breathe out longer
    than in.").
  - *Not now* is also offered.
- *"Want me to ask how it went?"* *Yes* schedules `cope_ahead_after` for the time from screen 1.
  *No* schedules nothing.
- **Close:** none (`closeKind: 'none'`). The spine's `plan` question (*"When will you take the next
  step?"*) doesn't fit, and screen 1 already asked when. The visit's outcome is the after card.

**Today, afterwards** (`cope_ahead_after`):
- *"How did {situation} go?"* — *Better than I feared* · *About what I expected* · *Harder than I
  expected* · *It hasn't happened yet* (snooze 24 h).
- Then *"Did your plan help?"* — *Used it, it helped* · *Used it, not sure* · *Didn't use it* · *Skip*.
- *Used it, it helped* counts toward what helps for the move's tool when it has one. With parts on and
  a chosen part, it also counts toward the part's *what's helped it settle*, through a `PartTag
  {source: 'cope_ahead'}` written on that answer, because the person named the part.

---

## Where it starts

- **Tools:** Emotion Regulation, listed for everyone.
- **Intents:** *"Something's coming up that I'm dreading"* → Cope Ahead.
- **DEAR MAN:** on the summary, *"Rehearse it"* opens Cope Ahead with *A conversation I'm dreading*
  first (not pre-selected) and the person's chosen part carried in.
- **Recover:** *Rehearse the next time* (`recover_rehearse` on Today) gains a link, *"Walk through it
  with Cope Ahead"*. The follow-up itself is unchanged.
- **The check-in result:** the anticipatory row (*anxious*, *nervous* → `cope-ahead`) goes live only
  when Claudia signs off that row, as with Wise mind. The tool lands with the row still switched off.

---

## Content and data

- **Content lives in the graph**, as Wise mind's does: `scripts/cope-ahead/content.py` → `build.py` →
  `schema/cope-ahead.cypher` (MERGE-only, constraints, `LOAD_ORDER` after `wise-mind`, before
  `recommended-for`). It is served by a public `getCopeAheadContent` and shipped as the generated
  `src/data/content/cope-ahead.json`.
  - **Nodes:** `CopeSituation` (`label`, `likelyFeelings` grid ids, `hardMoments`, `dangerMomentIds`),
    `HardMoment`, `CopeMove` (`kind`, `appToolId?`, `forPulls`, `line`), `RehearsalBeat`,
    `CopeAheadFlow` (screen copy).
  - `HAS_PRACTICE`-style edges hang off `dbt_cope_ahead`.
  - The copy is voice-linted. It is **not gated on sign-off**, like Wise mind and Find the feeling.
  - The parts step and the anchor line are parts copy (`COPE_REQUIRED`), and they wait for the parts
    sign-off.
- **The concept:** `dbt_cope_ahead.appToolId = 'cope-ahead'`, taken out of `PLANNED`. Its routing row
  stays off and a draft.
- **The visit:** a `ToolSession` (`closeKind: 'none'`, module `er`) with `ext.ca`:
  - `situationId`, `situationOwn`, `when`;
  - `feelIds`, `pullIds`, `partId`;
  - `hardMomentId`, `hardMomentOwn`, `ifFrom` (`moment` | `pull`);
  - `moveIds`, `moveOwn`;
  - `rehearsed` (1 | 2), `newMomentId`, `settle` (`breath` | `five_senses` | `ok`), `kept`,
    `followUp`.

  It is registered in `extSchemas.ts`. The `*Own` fields are length-checked only.
- **The follow-up:** a new `FollowUpType` `cope_ahead_after` in practice-spine content.
  - Its window is a chip, the way `ps_step`'s is: today at 20:00, tomorrow at 18:00, this week at +4
    days 18:00, later at +7 days 18:00.
  - It's resolved inline. Both answers are stored on the follow-up as log fields.
  - The plan line it shows comes from the session, never pre-filled into a new visit.
- **Counts toward what helps:** yes, through the after card's *Used it, it helped*, the only outcome
  this tool records.

## Never

- Never predicts how it will go, and never reassures (*"It'll be fine"*).
- Never asks for more than one hardest moment. The rehearsal always ends with getting through it.
- No scale, score, streak or "confidence".
- Never pre-fills a past plan into a new visit. A kept plan is in My words, where the person can find it.
- Never shows a part's name outside the parts step and the person's own plan card.
