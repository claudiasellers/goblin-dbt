# Check the Facts

A tool for when a feeling is strong and you're not sure it matches what happened. You name the feeling,
set down what a camera would have caught, notice the story you're telling about it, and look for other
ways to see it. If there's a threat in it, you check how likely it is and whether you could get through
it. Then you look at when this feeling fits the facts, and the tool hands you to the skill that fits your
answer.

Status: **designed, not built (17 Oct 2026); handed to a new session.** Claudia picked it as the next tool
after Cope Ahead, then moved the build to its own session. Start with `check-the-facts-handover.md`, which has the
build contract (types, helpers, props), the facts checked against the code and the deploy steps.
*Decisions for the build* at the end override anything above them.

---

## Why this tool

- **DBT.** Check the Facts is Emotion Regulation Handout 8 (with Worksheet 5). Its six questions are:
  1. What emotion do I want to change?
  2. What is the event prompting it?
  3. What are my interpretations and assumptions?
  4. Am I assuming a threat?
  5. What's the catastrophe?
  6. Does my emotion, or its intensity, fit the facts?

  The answer to 6 decides what comes next. If the emotion fits, the move is to work on the situation
  (Problem Solving, Handout 12). If it doesn't fit, the move is to act opposite to its urge (Opposite
  Action, Handouts 9–10).
- **The evidence it borrows.** Cognitive reappraisal, reinterpreting a situation to change what it means
  emotionally, lowers felt negative emotion and amygdala response more reliably than suppression does.
  - Gross & John 2003 (individual differences in reappraisal and suppression).
  - Ochsner & Gross 2005 (the neural basis of reappraisal).
  - Webb, Miles & Sheeran 2012 (a meta-analysis that finds reappraisal effective, especially reappraising
    the emotional stimulus itself).

  Generating alternative interpretations is the active ingredient, so step 4 is the tool's core.
- **The app already asks for it.**
  - The routing review gives Check the Facts the lead for low-grade anger (*annoyed*) and for worry
    (*worried* and the watchful words), and makes it the alternative to Cope Ahead for anticipatory
    anxiety. These rows exist, switched off in `PLANNED`.
  - Do the Opposite has a one-question fits-the-facts step that stands in for it. That step stays as it
    is; Check the Facts is the long form, on its own.
- **Its content is already in the graph.** `EmotionRegulationContent.fitsTheFactsWhen` (one list per DBT
  parent, first person) is the step-6 reference, unchanged. `fitsFacts` is already an ask-fresh field.

---

## The flow

There are seven short screens, and each one moves on with a tap. Curated chips come first, with your own
words as the escape hatch: ≤ 140 characters, never linted, never shown back outside this visit.
`TooMuchLink` sits on every screen. There's no band gate.

### 1. What are you feeling?

*"What's the feeling you want to check?"*

- One word. If a check-in or hand-off carried emotions in, those come first, as chips, and are not
  pre-selected.
- Otherwise the grid words the person has used most lately come first (`FOUND_WORD`, read-only), then
  *Something else*, which opens the grid word list.
- The word maps to its DBT parent through `HAS_REGULATION_CONTENT`. A word with no parent uses the
  general set for steps 3–5.

### 2. What happened?

*"What happened, as a camera would have caught it?"*

- What kind of thing (one chip):
  - *Someone said something*
  - *Someone didn't do something*
  - *Something I saw or read*
  - *A thought or a memory*
  - *I can't name it*
- Then own words (optional), with the placeholder *"Only what happened, no why."*
- There is no "prove it". *I can't name it* is a complete answer and the flow goes on.

### 3. The story

*"What's the story you're telling yourself about it?"*

- 3–4 chips from the parent's `Interpretation`s, plus own words. Pick one or two.
- **Parts on:** the shared unblend line sits under the chips, *"This story might come from a part of you
  that's trying to protect you."*
  - It's parts copy (`cf_unblend`), gated with the rest.
  - It's recorded as `ext.cf.unblendShown`.
  - No part is named here. The spine's tag row after a better close is where "Was this a part you know?"
    happens, as everywhere else.

### 4. Other ways to see it

*"What else could explain it?"*

- For each chosen story, 2–3 `Alternative` chips (`ALTERNATIVE_TO`), plus own words.
- The person picks any that *might* be true. Picking none is fine.
- The screen never says which one is right. Under the picks: *"You don't have to believe them.
  Notice that they're possible."*

### 5. The threat (fear, anxiety, anger, shame, or any story that predicts something)

*"What are you afraid will happen?"*

- Threat chips from the parent:
  - *Being hurt*
  - *Being left*
  - *Being embarrassed*
  - *Losing something I need*
  - *Being treated unfairly again*
  - *I can't say*

  Plus own words. *Nothing like that* skips the rest of this screen.
- *"How likely is it, really?"*: *Very likely* · *Could go either way* · *Not that likely* · *I don't
  know*. This is never a scale or a percentage.
- *"If it did happen, could you get through it?"*: *I'd get through it, even if it's hard* · *I'm not
  sure I would*.
  - Either answer offers a quiet link, *"Plan for it with Cope Ahead"* →
    `copeAheadLink({ situationId: 'other' })`. This is the handout's "imagine coping well with the
    catastrophe", and the app has a tool for exactly that.
  - It's offered, never pushed, and the flow goes on.

### 6. Does it fit?

*"Here's when {feeling} fits the facts. Does one of these match what happened?"*

- It shows the parent's `fitsTheFactsWhen` list, unchanged, from the graph.
- The answers:
  - *Yes, it fits*
  - *It fits, and it's bigger than this*
  - *Not really*
  - *I'm not sure*
- This sets the ask-fresh `fitsFacts` (`fits` / `partly` / `doesnt_fit` / `unsure`).
- A feeling that fits is never treated as a problem. The screen's line for *fits* says so.

### 7. What helps from here

One card, picked from the answer:

| Answer | Line | Offers |
|---|---|---|
| fits | *"When a feeling fits, the move is to work on the situation."* | *Problem Solve*; with *Someone said / didn't do something*, also *Ask for what you need* (DEAR MAN) |
| partly | *"The feeling makes sense, and it's turned up loud. Bring the volume down, then work on what's left."* | *Do the Opposite* (emotion carried), then *Problem Solve* |
| doesnt_fit | *"The feeling is bigger than the facts. Acting opposite to its urge helps it settle."* | *Do the Opposite* (emotion carried) |
| unsure | *"That's all right. Sometimes the facts come later."* | *Wise mind* (`?first=wm_q_next`), or *Done* |

Since v1.2, *unsure* goes by one more screen first: one fact to find out and an optional *ask me later* chip
(`check_fact`; see `skill-runtime.md`, *v1.2*). The PRD's *Park it* waits for DT/MF's postponement skill.

Then the regulation close: *"How strong is it now, compared to when you started?"* (`closeKind:
'regulation_down'`, module `er`). It counts toward what helps the way every regulation tool does.

---

## Where it starts

- **Tools:** Emotion Regulation, listed for everyone.
- **Intents:** *"I can't tell if I'm overreacting"* → Check the Facts.
- **Do the Opposite:** its fits step gains a quiet link under the detail, *"Go through it slowly with
  Check the Facts"*, which carries the emotion. The step itself is unchanged.
- **The check-in result:** the planned rows (*annoyed*, *worried* and the watchful words, the anticipatory
  alternative) are live since 12 Nov (Claudia: default to connected).

## Content and data

- **Content lives in the graph**, as Cope Ahead's does: `scripts/check-the-facts/content.py` → `build.py`
  → `schema/check-the-facts.cypher`.
  - It's MERGE-only, with constraints, and goes in `LOAD_ORDER` after `cope-ahead`, before
    `recommended-for`.
  - It's served by a public `getCheckFactsContent` and shipped as `src/data/content/check-the-facts.json`.
  - **Nodes:**
    - `FactsEventKind`;
    - `Interpretation` (`dbtParent`, `label`), hung off `EmotionRegulationContent` with `HAS_INTERPRETATION`;
    - `Alternative`, linked with `ALTERNATIVE_TO`;
    - `ThreatChip` (`dbtParents`);
    - `CheckFactsFlow` (screen copy, the step-7 table).
  - `fitsTheFactsWhen` is read from the existing nodes and never copied.
  - The copy is voice-linted. It isn't gated on sign-off, the same as Wise mind and Cope Ahead. The one
    parts line (`cf_unblend`) is a draft until it's signed off (every other parts line was, 17 Oct).
- **The concept:** `dbt_check_facts.appToolId = 'check-the-facts'`, taken out of `PLANNED`. Its routing
  rows are live (12 Nov).
- **The visit:** a `ToolSession` with `ext.cf`:
  - `emotionId`;
  - `eventKind`, `eventOwn`;
  - `storyIds`, `storyOwn`;
  - `altIds`, `altOwn`;
  - `threatId`, `threatOwn`;
  - `likely` (`very` | `either` | `not_that` | `unknown`);
  - `getThrough` (`yes` | `unsure`);
  - `handoff`;
  - `unblendShown`.

  It also has `fitsFacts`, the existing ask-fresh field. It is registered in `extSchemas.ts`, and the
  `*Own` fields are length-checked only. `setEmotionIds` takes the step-1 word.

## Copy (the source for `content.py`)

The wording below is the copy to ship. Slots are in braces. Any change a voice-lint rule forces is
reported back, not reworded silently.

### Event kinds (`FactsEventKind`)

`said` *Someone said something* · `didnt` *Someone didn't do something* · `saw` *Something I saw or read*
· `thought` *A thought or a memory* · `cant_name` *I can't name it*

### Stories (`Interpretation`) and other ways to see them (`Alternative`)

| parent | id | story | alternatives |
|---|---|---|---|
| fear | `fear_bad_coming` | Something bad is about to happen | Nothing bad has happened yet · It could go several ways · I'd see it coming and could act |
| fear | `fear_wont_cope` | I won't be able to handle it | I've handled hard things before · I'd have help · I won't know until I'm there |
| fear | `fear_theyll_leave` | They're going to leave me | They're busy, not leaving · One moment isn't the whole relationship · I could ask them |
| fear | `fear_theyll_see` | Everyone will see I'm not good enough | Most people are thinking about themselves · One mistake isn't who I am · Someone might not notice at all |
| anger | `anger_on_purpose` | They did it on purpose | They were distracted or stressed · They didn't know it mattered to me · I don't know why yet |
| anger | `anger_no_respect` | They don't respect me | They were thinking about something else · They show respect in other ways · I could ask what they meant |
| anger | `anger_always` | This always happens | It's happened before, not every time · This time has its own details · Something can change |
| anger | `anger_unfair` | It isn't fair | It might be unfair, and I can act on that · There's something I don't know · Both can be true |
| sadness | `sad_gone` | It's gone for good | Some of it might come back · What it meant to me stays · I don't know yet |
| sadness | `sad_nobody_cares` | Nobody cares about me | Some people do, even if not right now · They may not know how I feel · I could reach out to one person |
| sadness | `sad_never_better` | It'll never get better | Feelings move, even slowly · It has changed before · I don't know what's ahead |
| shame | `shame_wrong_with_me` | There's something wrong with me | I did something; I'm not something · I'd be kinder to a friend than this · Most people feel this sometimes |
| shame | `shame_think_less` | They think less of me now | I don't know what they think · One moment doesn't define me to them · They might not have noticed |
| shame | `shame_if_they_knew` | If they knew, they'd turn away | Some people would understand · I could share a small part · I'm worth something without hiding |
| guilt | `guilt_hurt_them` | I hurt someone | I might have, and I can repair it · They may see it differently · I could ask them |
| guilt | `guilt_not_enough` | I didn't do enough | I did what I could with what I knew · There may still be something I can do · It wasn't all on me |
| guilt | `guilt_bad_person` | I'm a bad person | I did something I regret; I'm not all bad · Regret means I care · I can make it right |
| general | `gen_my_fault` | It's my fault | Other things played a part · I can own my part, not all of it · I don't know the whole picture |
| general | `gen_go_wrong` | It's going to go wrong | It might go fine · I can't know yet · I'd cope if it did |
| general | `gen_against_me` | They're against me | They might be against the situation, not me · They might be dealing with their own thing · I could check |

*Envy*, *jealousy*, *disgust* and *love* take the general set until their own rows are written and
reviewed. *hot_shame* and *cold_shame* both use *shame*.

### Threats (`ThreatChip`)

`hurt` *Being hurt* (fear, anger) · `left` *Being left* (fear, sadness, jealousy) · `embarrassed` *Being
embarrassed* (shame, fear) · `lose` *Losing something I need* (fear, sadness, envy) · `unfair` *Being
treated unfairly again* (anger) · `cant_say` *I can't say* (all) · `none` *Nothing like that* (all)

### Screens (`CheckFactsFlow`)

| key | text |
|---|---|
| `feel_title` | What's the feeling you want to check? |
| `feel_more` | Something else |
| `event_title` | What happened, as a camera would have caught it? |
| `event_own_hint` | Only what happened, no why. |
| `story_title` | What's the story you're telling yourself about it? |
| `story_hint` | Pick one or two. |
| `alt_title` | What else could explain it? |
| `alt_note` | You don't have to believe them. Notice that they're possible. |
| `threat_title` | What are you afraid will happen? |
| `likely_q` | How likely is it, really? |
| `likely_very` / `likely_either` / `likely_not` / `likely_unknown` | Very likely · Could go either way · Not that likely · I don't know |
| `through_q` | If it did happen, could you get through it? |
| `through_yes` / `through_unsure` | I'd get through it, even if it's hard · I'm not sure I would |
| `through_cope_ahead` | Plan for it with Cope Ahead |
| `fits_title` | Here's when {feeling} fits the facts. Does one of these match what happened? |
| `fits_yes` / `fits_partly` / `fits_no` / `fits_unsure` | Yes, it fits · It fits, and it's bigger than this · Not really · I'm not sure |
| `next_fits` | When a feeling fits, the move is to work on the situation. |
| `next_partly` | The feeling makes sense, and it's turned up loud. Bring the volume down, then work on what's left. |
| `next_no` | The feeling is bigger than the facts. Acting opposite to its urge helps it settle. |
| `next_unsure` | That's all right. Sometimes the facts come later. |
| `own_hint` | Say it your way |
| `not_sure` | Not sure |
| `next` / `done` | Next · Done |
| `entry_oa` | Go through it slowly with Check the Facts |

The parts line `cf_unblend` (*This story might come from a part of you that's trying to protect you.*) goes in
`scripts/parts/content.py` as a draft, gated on sign-off with the other parts lines.

## Never

- Never says which story is true, never says "overreacting", and never asks the person to prove what
  happened.
- No scale, score or percentage. Likelihood is four words.
- Never treats a feeling that fits as a problem. *Fits* leads to changing the situation, not the feeling.
- Never pre-fills a past visit's story or answers. Each visit is asked fresh.
- Never names a part. The unblend line says "a part of you".

---

## Decisions for the build (17 Oct)

These were settled when the build was split across the lanes. Where they differ from the sections above,
they win.

1. **Screen 1's chips are curated, not the person's most-used words.**
   - `FOUND_WORD` is a log aggregate. Ordering a live flow by it would cross the data-layer rule
     ("never used to pre-fill a live flow"), and it has no read path outside Me.
   - The chips are *anxious*, *worried*, *annoyed*, *angry*, *hurt*, *guilty*, *ashamed* and
     *embarrassed* (`feelChips`, all grid words).
   - Emotions carried in by a link or hand-off come first. They aren't pre-selected.
   - *Something else* opens the grid word list.
2. **A word's parent** comes from `HAS_REGULATION_CONTENT` for every grid word. That's the mapping Do the
   Opposite reads, and it ships in the json as `parentOf`.
   - The story sets are *fear*, *anger*, *sadness*, *shame* (both `hot_shame` and `cold_shame`) and
     *guilt*.
   - Every other parent, and a word with no parent, takes *general*.
3. **Screen 6's title:** *"Here's when feeling {feeling} fits the facts. Does one of these match what
   happened?"*. The grid words are adjectives, so "when anxious fits" doesn't read.
   - When the word has no parent with a `fitsTheFactsWhen` list, the screen asks *"Does feeling
     {feeling} fit what happened?"* (`fits_title_general`), with no list and the same four answers.
4. **A story in the person's own words** gets three alternatives of its own (`ownStoryAlternatives`):
   - `own_alt_unknown`: *There's something I don't know yet*;
   - `own_alt_other_view`: *Someone else might see it differently*;
   - `own_alt_meaning`: *It might not mean what it feels like it means*.
5. **Screen 5 shows** for the fear, anger and shame sets, or when any chosen story `predicts`. Otherwise
   it's skipped.
   - `predicts` is true for all four fear stories, `anger_always`, `sad_never_better`,
     `shame_if_they_knew`, `gen_go_wrong` and `gen_against_me`.
6. **The Cope Ahead link** on screen 5 opens `copeAheadLink({ situationId: 'other' })`. `'other'` is
   Cope Ahead's *Something else*. Taking it records `handoff: 'cope-ahead'` and leaves through `linkTo`,
   like every hand-off.
7. **Screen 7's offers** are named from `src/data/tools.ts`: *Problem Solve*, *Do the Opposite*, *Ask for
   what you need* and *Wise mind*.
   - Problem Solve, Do the Opposite and Ask for what you need carry the emotion through `linkTo`.
   - Wise mind opens with `?first=wm_q_next`.
   - `ext.cf.handoff` records the choice (`CfHandoff`). The regulation close is asked before the person
     leaves, as in Find the feeling's hand-offs.
8. **The entry contract** is `/tool/check-the-facts?feel=<grid id>` (`src/lib/checkFactsEntry.ts`).
   - An unknown id is dropped.
   - The word comes first on screen 1 and isn't pre-selected.
   - Do the Opposite's fits step passes its emotion.

The shared types and every screen's props are in `check-the-facts-handover.md` (*Build contract*); the types
file, `src/data/checkFactsTypes.ts`, is written from it.
