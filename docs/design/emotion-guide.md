# Know this feeling (ER-10)

DBT Emotion Regulation Handouts 3–6: what emotions do, the model of emotions, ways to describe them. Tool
`emotion-guide` ("Know This Feeling"), concept `dbt_model_of_emotions` (module Emotion Regulation), skill
`emotion_guide` on the skill runtime. Listed under Emotion Regulation for everyone, with the Tools intent *Get to
know a feeling*.

Part 1 (built 12 Nov 2026) is the feeling card and the ladder; part 2 (built 12 Nov 2026) is Walk the wave and part 4
(built 12 Nov 2026) the myth cards, below. Part 3's first half, words everywhere's writes, is built (13 Nov); the rest
is under *Not yet*.

## What it is for

Affect labelling is the app's first job: the person names a feeling, and a closer word takes some of the edge
off. The check-in and Find the feeling get someone to a word. This tool makes the word a known thing: what the
feeling is for, what often sets it off, where it often shows up in the body, and the pull it can bring. Then one
tap trains differentiation: *Which of these is closest?*, the family's words from milder to stronger.

The card is recognition, never criteria. Nothing asks the person to match a list, nothing scores them, and the
pull is framed as something that comes with the feeling, not something to do (*A pull comes with the feeling. You
don't have to act on it.*).

## The flow (`scripts/skills/emotion_guide.py`)

1. **feel**: *Which feeling do you want to know better?* One word. A chip per family (the family's most common
   word: scared, angry, sad, ashamed, guilty, disgusted, jealous, loving, happy), carried words first (never
   pre-picked), any grid word under *More words*. A word with no guide (calm, surprised, tired, numb…) goes to
   **none**. No grid word is in the envy family yet, so envy's card ships but nothing opens it until one is.
2. **heads_up** (a carried flooded reading only): *Your body's loud right now.* *Settle my body first* → First,
   the body; *Show me anyway* → the card. A heads-up, never a lock, as Build mastery.
3. **card**: the `feelingCard` embed, titled *Feeling {word}*. Its family (*Part of the fear family.*), what it's
   for, what often sets it off, where it often shows up (up to three signed-off body places, one chip per place, as
   *Chest · heavy, closing up*),
   the pull it can bring (up to three of the parent's emotion urges). Each part shows only when the graph has it;
   with no row at all (content drift) the card shows only *Next*.
4. **ladder**: *You picked {word}. Is one of these closer?* The family's ladder. Not required: *Your word is fine
   too, and so is none.* Skipped for a family with one word (jealousy, envy).
5. **end**: *You named it: {closest}.* (or *You know this feeling a little better now.*). A closer word picked:
   *Putting a closer word to a feeling can take some of the edge off.*; none picked: *Knowing what a feeling is for
   can make it easier to be with.* (neither for happiness: there is no edge to take off joy). A safety-screen word
   (worthless, empty, despair, helpless, powerless) named or picked puts *Heavy feelings can come with thoughts of
   not being here. If they do, talk to someone now.* first, a line and never a gate. Then by family: for the nine
   DBT parents with fit statements, *Check the Facts looks at whether it fits. Do the Opposite helps when acting on
   it won't.* with both offers, each carrying the closer word when one was picked, else the word they came with; for happiness, Good things in its `savour` frame (*stay
   with it a little longer*).
6. **none**: *There's no card for “{word}” yet.* → Find the feeling, carrying the word. A hand-off can't go back to
   a step, so there's no *Pick another word* here yet (part 3).

*Talk to someone now* on every screen, the card included. Close kind `none` (knowing a feeling isn't a state change
to rate), no keep, no follow-up, no routing rows by design. `emotionFields`: `feel` and `closest`, so both are the
visit's emotions.

## Content (`scripts/emotion-guide/content.py` → `schema/emotion-guide.cypher`)

One `FeelingGuide` per family: the nine DBT parents and happiness. Each has its label, one function line (H3,
paraphrased, flat, no *should*), three prompting events (H6, paraphrased), the ladder, and the `BodyMap` whose
places it shows. `build.py` checks: ten guides; every ladder is the family's own grid words, none twice, never a
single word; every body map is signed off; every held urge is one of the parent's; the happiness words are grid
words with no DBT parent. The function lines and prompts are voice-linted as flow copy.

Edges:

- `(:FeelingGuide)-[:GUIDES]->(:EmotionRegulationContent)` for the nine parents: the card's urges are that parent's
  `HAS_ACTION_URGE` urges, and its words are the parent's words through `HAS_REGULATION_CONTENT`.
- `(:FeelingGuide)-[:FELT_LIKE]->(:BodyMap)`: the places are computed from the `FELT_AS` rows of the emotions the map
  `GROUPS`, live rows only, with `placesFromFelt` (the body mirror's own computation). Jealousy uses the fear map;
  envy has none and shows no body section.
- `(:Emotion)-[:IN_GUIDE]->(:FeelingGuide {id: 'happiness'})` for happy, joyful, playful, proud, optimistic, hopeful,
  content, satisfied, excited and eager.

**Held** (`urgesHeld`, Gate 3): guilt's *punish myself* (it sits next to self-harm, and Do the Opposite meets it
with `safety.open` first), shame's *hide or disappear* (next to *humiliated*, *disappear* reads close to not wanting
to exist) and love's *go places they might be* (shown as an ordinary pull of love it can normalise pursuing someone
who said no). Do the Opposite still lists all three, where the steps meet them. Jealousy's and love's *check their
phone / social media* stay: as recognition they are the feeling's own pulls, while the DT `check` urge is the act. The DT behaviour urges (send, check, hit, leave, use, self_harm) are
never on the card either: only `kind: 'emotion'` urges reach it.

## Walk the wave (`scripts/skills/walk_the_wave.py`, part 2)

DBT ER Handout 5, the model of emotions: one episode laid out start to finish, in calm. A third skill, `walk_the_wave`,
under the same tool: `?frame=wave` picks it (`emotionGuideSkillFor`). Opened from a card on the tool's page (*Walk the
wave*) and the Tools intent *Look back at a feeling, start to finish*.

1. **start**: *Where do you want to start?* what happened · my body · the urge · what I did · from the beginning.
   Starting at the body or the urge is for someone who can't name the feeling yet (the PRD's alexithymia path).
2. **heads_up** (a carried flooded reading only, after the start): the body first or *Walk it anyway*, back to the
   slot they chose. Never a lock.
3. **the seven slots**, the start slot first, then the others in the model's order: *before* (what was already
   wearing you down: Running low's rows in plain words), *what happened* (Check the Facts' event kinds, same ids,
   danger ones included), *what your mind said*, *your body*, *the urge* (Hold to wait's six pulls with their ActionUrge
   ids, so the visit records `urgeIds`, plus six of the feeling's own pulls), *what you did*, *after* (a second
   feeling about the first lives here). Chips and own words; none required (*Skip any you're not sure of*).
4. **name**: *If you had to guess, what was the feeling?* One grid word, or none. The guess is the visit's emotion
   (`emotionFields`).
5. **strip**: the `episodeStrip` embed: the seven slots on the paper in the model's order whatever the start, a
   skipped slot marked *Skipped*, the guess under them (*Maybe: frustrated*). Read, then on.
6. **end**: *A feeling has a beginning, a middle and an end.* Then the guess's card (*Get to know this feeling*,
   carrying it), Check the Facts when the mind said something (*Check the story your mind told*, carrying the guess),
   and Cope Ahead (*Plan for next time*).

Safety:
- Danger from a person among what happened opens the `other_person` slot on every screen after it. The end is titled
  *Thank you for laying that out.* and offers only someone to talk to and Ending in its careful frame (no plan to face
  them, no card, no story check).
- *Hurt myself* among the urges does what every sibling with that pull does: the resources open over the next screen
  first (`safetyFirst`), then *Are you safe right now?* *Not sure* or *No* goes straight to someone to talk to and
  Done; *safe for now* goes on with the walk, the crisis banner on every screen after. The end says *talk to someone
  now* and offers only that (no feeling card, story check or plan while the pull may be live, even with a guess named).
- Both: the `other_person` banner (it lists 988 too) and one line naming both.
- *This is bringing it back* (First, the body) beside *Talk to someone now* on every slot: a way out mid-walk.
- *Talk to someone now* on every screen, as a link or, where it's the way on, the offer itself. No close, no keep, no follow-up: the episode is the run (`ext.run`).

## The myth cards (`scripts/skills/emotion_myths.py`, part 4)

DBT ER Handout 3's myths about emotions, and It isn't working's belief check (H24). A second skill, `emotion_myths`,
under the same tool: `?frame=myths` picks it (`emotionGuideSkillFor` in `src/lib/emotionGuide.ts`; the page
`src/pages/tools/EmotionGuide.tsx` plays one skill or the other, the crisis kit's pattern, since the runtime has no
conditional start). It's opened by It isn't working's belief card, a card on the tool's page (*Beliefs about
feelings*) and the Tools intent *A belief about feelings is in the way*.

The screens never say *myth*: a belief the person holds isn't called wrong. The card offers the other side to look
at, and every answer to *How does that sit with you?* counts.

1. **myth**: *Which belief about feelings sounds most like yours?* Eleven beliefs in plain words: It isn't working's
   three (*Having this feeling means I'm failing*, *I'm meant to be past this by now*, *If I feel it this strongly,
   it must be true*, same ids, so a later host can carry the pick) and eight of H3's. Own words count as the pick.
2. **heads_up** (a carried flooded reading only): *Your body's loud right now.* The body first (First, the body) or
   *Look anyway*. Never a lock.
3. **look**: *A belief can feel like a fact.* The belief's other side (H3's challenge, paraphrased, no *should*),
   or for own words a general line. Then *How does that sit with you?* with *Some of it fits*, *Not yet* or
   *Not sure*. All three go on. The other sides keep DBT's point: a feeling may or may not fit the facts, so *it
   must be true* is met with *strength alone can't tell you which*, never *it isn't true*.
4. **end**: a title by answer (*Not yet is fine.*, then *A belief that's been around a while takes more than one look.*), one
   small way to test the belief this week, and where that belief goes next, whatever the answer: *it must be true*
   → Check the Facts; *failing*, *a right way to feel*, *painful feelings are bad*, *makes no sense* → Know this
   feeling (offered as *What a feeling is for*; the card has what often sets it off); *past this by now* → Let it
   be; *big reactions are the only way* → DEAR MAN; *out of control* → Hold to wait; *wrong to feel it if others
   don't approve* → Recover. *Weak* and *best ignored* end on the test and Done.

**Own words are never read**, so they can't raise the crisis slot. The look screen says *If it's about hurting
yourself or not wanting to be here, talk to someone now.* and the end card offers someone to talk to beside Done
(gate 3; It isn't working's belief card does the same for own words).

**Hopelessness is not a myth card.** *Nothing will ever help me* isn't on the list. It isn't working sends it to
someone to talk to and Done, and never here, because answering it with an opposing belief would argue with
someone in pain.

*Talk to someone now* on every screen. No close (close kind `none` for the tool), no keep, no follow-up, no routing
rows. `emotionFields` is empty: a belief is not a feeling word.

Not yet: carrying It isn't working's pick in, so the person doesn't choose twice. Exit queries can read an answer
(`$a.belief`), but the skill can't start past its first step on a context value without a runtime change.

## The runtime additions (approved on the plan thread)

- Two shared tables, `feelingOf` and `feelingGuideOf` ([`skill-runtime.md`](skill-runtime.md)), served by
  `getSkillContent` and shipped in `skills.json` by the snapshot build, both through
  `functions/src/skills/feelingOf.ts`.
- A derive may take one `field` of a `feelingOf` row (the ladder), and `emotionsFrom` may name it.
- An embed prop of type `row`: the player resolves the ref and hands the embed the table's row
  (`sharedRow` in `machine.ts`). The card reads its row this way; nothing emotion-level is copied into the skill.

## Words everywhere (part 3, the writes; `functions/src/userdata/foundWords.ts`)

Every save that records an accepted word adds it to the person's words, `(:User)-[:FOUND_WORD]->(:Emotion)`, the log
aggregate Me → My words shows (D-10: it accumulates without a yes, read-only, exported and deleted with the person).
Before this only Find the feeling wrote it.

- **The check-in**: its words once the result has rendered (`resultShown`), source `checkin`.
- **A tool's close**: the words picked in the visit (`setEmotionIds`, never a hand-off's), source the tool id. That
  covers Recover, Do the Opposite, Cope Ahead, Know this feeling, Walk the wave's guess, Check the Facts and every
  skill with `emotionFields`. A one-shot `recordToolSession` writes none: its ids are the hand-off's, already counted.
- **Find the feeling**: its own save, as before, now with `sources`; its close doesn't count the word again.

Once per record and word: the record gets a `FOUND` edge to the word the first time, and only a new `FOUND` edge
counts, so the check-in's re-saves and a replayed close never count twice. `FOUND_WORD` gains `sources` (`checkin`,
`find-the-feeling`, `invalidation-recovery`, …) beside FTF's `ways`; the PRD's `{count, ways, sources[], firstAt,
lastAt}`. Nothing reads `sources` yet: it is for granularity (distinct words per month, by where they were named).

## Departures from the PRD

- **Happiness is not a tenth `EmotionRegulationContent`.** The PRD added it as a parent. That would grow every loop
  over parents: Do the Opposite's doors (`opposite-action-picker.json`), `parentOf`, Problem Solve, Insights and the
  witness corpus. The guide is its own label instead, and happiness words reach it by `IN_GUIDE`. A test pins the
  doors at nine and keeps happiness out of `parentOf` and `fitsWhen`.
- **The card is a tool of its own for now**, opened from the Tools list. Hosts showing it after naming (check-in,
  Find the feeling) come with part 3.
- **The ladder is milder to stronger as written**, the content's reviewed judgement, not computed from the square.

## Not yet

- Walk the wave, part 2: CORE-08's chain analysis embedding the strip; an `EmotionEpisode` record (the PRD's proposal)
  once something reads episodes back; ladder taps as `SkillPractice`.
- Part 3, the rest of words everywhere: own words first in the word pickers (the PRD's *once they have five*; it
  crosses the data-layer rule Check the Facts' build decision 1 kept, so it waits on Claudia), and the card after
  naming in the check-in and Find the feeling (the PRD's open question: automatic with one tap to dismiss, or on tap).

## Tests

`tests/skill-emotion-guide.test.mjs`: freshness, load order and constraint, the voice lint, the pins (body places
equal the body map's live places; urges equal the picker's minus the held one, no behaviour urge; the doors stay
nine and happiness stays out of the parent tables; ladders), the wiring, and the flow (worried → its card, row and
ladder → Check the Facts and Do the Opposite; proud → Good things; jealous skips the ladder; calm → Find the
feeling; a carried word first; flooded → the heads-up; the safety link on every screen). The shipped `feelingOf`
equals the fixture in `tests/skill-runtime.test.mjs`.
