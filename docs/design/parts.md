# Parts

Status: proposal, 6 Oct 2026 (updated 16 Oct). Not agreed. Nothing here is signed off. Phase 0 is built
(PR #49): the vocabulary and all parts copy as draft graph content (`scripts/parts/content.py` →
`schema/parts.cypher`), the parts voice lint, and all six data fixes. Claudia decided three things on
16 Oct: the flood signal is the **blending check** (below; built as content and in the harness), and
data fixes 3 and 4 go ahead (built). The angry-part card is being built as a component with no host
yet; where it lives is her open call. Phase 2's server and profile groundwork (no UI) is in progress.
Dev harness: `npm run dev`, then `http://localhost:5173/dev/parts.html` (Meet a part, the den, the part
card, a trail offer). Its copy comes from the generated `tests/fixtures/parts-content.json`; the invented
example person is `dev/parts-example.ts`. `?view=`, `?move=`, `?palette=`, `?blend=0` (skip the blending check).
Umbrella: [alexithymia-first-interaction.md](alexithymia-first-interaction.md). Its *angry part* section is
the one IFS decision already agreed, and this proposal grows out of it.
Related: [recover-from-invalidation.md](recover-from-invalidation.md) (v2 *Stage it*), [den-rooms.md](den-rooms.md),
[app-design-plan.md](app-design-plan.md), [checkin-routing-review.md](checkin-routing-review.md).

This is how Goblin could take on Internal Family Systems:

- parts kept on the profile;
- found partly through patterns in what the modules already log;
- helped, over time, toward a calmer inner household.

IFS supplies the stance: every part is trying to help, and there is a *you* that can lead them. DBT
supplies the skills and the behavioural honesty. The design puts those together. It does not add a
second therapy beside the first.

---

## The short version

1. **The app finds trails. You name parts.**
   - The machine's object is a *trail*: a recurring protective move in a recurring situation, with its
     evidence attached.
   - A trail becomes a part only when the person says "that's a part of me" and names it.
   - No app on the market does this. The ones that infer parts do it from AI chat or questionnaires, and
     assign roles automatically.
2. **Three timescales.**
   - **In the moment, unblend.** One line, and only for a move the person picked themselves.
   - **Afterwards, befriend.** *Meet a part*.
   - **Over weeks, integrate.** Check-backs, updated jobs, two pulls brought together.

   The app never befriends mid-urge and never mines patterns mid-distress.
3. **Protector level only.** The app helps people get to know the parts that *do* things: chase, hide,
   hit back, keep the peace, put it off, keep watch.
   - It never goes after what those parts protect.
   - No witnessing of old hurts, no do-over, no unburdening, no memory prompts.
   - When a protector's fear points at something tender, the flow stops kindly.
4. **Self is the light, not a figure.** On the map, parts are small faceless figures in a dark room. You
   are the lamp. You are never drawn as a node among them.
5. **Skills are how you look after a part.** Every DBT skill is a way of leading the part's job yourself:
   - Circuit Breaker means the part doesn't have to put the fire out alone.
   - DEAR MAN lets you speak *for* the part instead of *from* it.
   - Each part card shows which skills helped *that* part, from the person's own then-vs-now closes.
6. **It runs on the house's rules.**
   - Recognise, don't rate.
   - Nothing moves log → profile without a yes.
   - "I don't know" is a complete answer.
   - Never lock; give a heads-up plus a choice.
   - One earned moment of motion per flow.
   - The person's words appear in the serif.
   - All content lives in the graph, as drafts until signed off.
7. **Parts are opt-in.** One switch in Settings, off by default. The only parts language anyone sees
   before turning it on is the angry-part card, and only when they choose it.

## The flood signal: the blending check (decided 16 Oct)

Since the capacity probe came out (30 Sep), nothing records a band:

- `band.record` is called only from Find the feeling (`FindTheFeeling.tsx:78`), and FTF now saves
  `band: null`.
- So `BandGate` carries nothing, and every "not when flooded" rule here needed another source.

Two signals now cover it, in this order:

1. **Stored signals (server-side, on entry).** If a check-in in the last 2 h matched flooding
   (`activationPatternId` `emotional_flooding`, or the spiraling answer `hu_exp_flooding`) or carried a
   crisis flag (`safetyFlagId`), the flow opens on the P2 hand-off (sigh or orient, then reread), with
   *Keep going anyway* always there and the crisis banner alongside. Dissociation history (2 or more
   `dissociation_overmodulation` / `conservation_freeze` matches in 14 days) adds the far-away
   heads-up instead. These need a read the profile path can't do (`slices.ts` never reads a
   `:LogRecord`), so they come from a small parts entry callable, `getPartsEntry`. A Recover session
   in the window that read at or over its own flooded line (`downshiftAt`, 7) at start or end counts
   as flooding too. When dissociation history fired alongside a P2 outcome, P2 leads with orienting,
   not the sigh: slowing the breath can deepen shutdown for someone who goes far away.
2. **The blending check (client, every time).** *"Right now, can you notice it, or is it running
   things?"* · I can notice it · It's running things · Not sure.
   - **Where.** Right after the person says what's there (Meet a part step 1), because "it" needs
     something to point at; first, when the entry already names it (an offer, a candidate, a known
     part). Two pulls asks *"Right now, can you notice them both, or is one of them running things?"*
     on its first screen.
   - **Running things** opens the P2 body hand-off, card first (band `stirred`; `flooded` when a stored
     signal said so). Quieter → *"Picking up where we were."* and on to the next step, without asking
     again. *Keep going anyway* is always there. Not quieter after two primitives → *come back later*
     or *you can stop here*. If P2 already ran on entry (signal 1), *running things* goes straight to
     those last two choices rather than a second full hand-off. *Come back later* ends the session
     **without** the orienting close: P2 has just asked its own "compared to a minute ago", and a
     second question on the way out reads as a quiz (decided 16 Oct). The spine still closes, with no
     then-vs-now and `exitStep: 'blend'`.
   - **I can notice it / Not sure** go on. "Not sure" is a complete answer; it never slows the flow.
   - **Saved** as `blendCheck` (`notice` | `running` | `not_sure`) on the session record, plus the P2
     result in the existing `handoffs` shape. Ask-fresh: never pre-filled, never carried to another
     flow, never a profile write.

**Why it isn't the removed probe.** The probe asked about social capacity in general ("If someone asked
you for a favour right now…") and Claudia took it out because it measured social style more than state.
The blending check asks how close the person is to a part they've just named, which is IFS's own
blended / unblended distinction. It is shown only inside parts flows, only with parts on, is never stored
as a band, never carried, and never read by check-in routing.

The angry-part card doesn't use it: wherever it's hosted, the host already has a loudness signal
(Recover's reading, or the band DEAR MAN is handed), and the card comes only once that is under the
flooded line.

---

## The angry-part card as built (16 Oct, behind sign-off)

- **Component** `src/components/parts/AngryPartCard.tsx` (logic `src/lib/angryPart.ts`), host-agnostic:
  unblend (the light, and a small figure set apart) → what it protects (the six hurts, ordered by the
  host's Recover event through `CAN_TOUCH`, then `hit_back`'s `OFTEN_GUARDS`) → the vote of confidence,
  held for 4 s (the light reaches the figure as the hold completes; letting go early shows *Next*,
  never a penalty) → "speak for it, not from it" with the person's sentence in the serif
  ("I felt brushed off."). Back on screens 2–4, the host's *too much* on every screen.
- **Two wordings.** Every line has a `_plain` twin with no parts language ("The anger is loud right
  now, and you're here too."), so the card reaches people who haven't turned parts on. A build check
  and a test keep the word "part" out of every plain line. The vote line reads "{name}, it's angry
  because {matters} matters to you." (plain: "{name}, you're angry because {matters} matters.");
  `ProtectedHurt.matters` fills `{matters}`. "I felt {felt}." is lint kind `first_person` (chip rules,
  90 characters, only `{felt}`), since the prompt scope's "no I" rule would reject it.
- **Host (recommended placement, Claudia's card still open): Recover's *Fight back*.** A step `angry`
  in the Name phase, before *What hit hardest?*: offered only when the pull is `fight`, the latest
  reading is under `downshiftAt` (after the body steps, only if the re-rating came under the line), the
  copy in the person's wording is in `parts.json`, and it hasn't been offered in this visit. *Not now*
  (`angry_not_now`) skips it. Recorded on the visit as `ext.wmp.angryHurtId` / `angryVoteHeld` /
  `angryExit`; nothing goes to the profile. Going on to *Ask them* carries the hurt into DEAR MAN as the
  first, unselected "I felt" chip: the felt phrase, capitalised like the other chips ("Brushed off"),
  the same for parts on and off, and saved as the hurt id (not mapped to DEAR MAN's own feeling chips,
  which would turn "brushed off" back into "Hurt, Disrespected").
- The "Spend a minute with it later?" line (a `PartCandidate`) shows only with parts on: it names a
  part, and nothing parts-related is written for someone who hasn't turned parts on.

---

## Where I'd change the brief

**"Discover parts through patterns."** I'd discover *trails* and let people claim parts.

- **Clinically**, auto-naming someone's parts is the move dissociation clinicians warn about. Twombly
  calls "we've all got parts" "profoundly scary" for dissociative clients, and a DBT app's users skew
  toward that group.
- **Statistically**, within-person variance runs 2–4× larger than between-person variance (Fisher,
  Medaglia & Jeronimus 2018). Population patterns can't name *this* person's parts.
- **For the product**, a claimed part is the person's own work and holds up. An assigned one is a
  horoscope.

The trail engine still does what you wanted: it notices, gathers the evidence and offers a doorway. It
just doesn't walk through on the person's behalf.

**"Toward integration."** The word means different things in different places.

- In IFS it means a Self-led system: parts still exist, they trust you, and they take jobs they prefer.
- In dissociation treatment it can mean fusion of alters. That is contested, and not ours to aim at.

Here it means **one house**: parts known by name, jobs updated to who you are now, opposing pulls that can
sit at the same table, and you leading. All of that can be measured without a single rating scale (see
*Measuring it*).

---

## What already exists

The app already has a parts substrate. It just doesn't use the word.

| Already in the app | What it is, in parts terms |
|---|---|
| The square's "+ Add another spot" → "And the other part?" (up to 3 spots) | Two parts at once. **The per-spot words are discarded on save** (`CheckIn.tsx handleWordsContinue`). |
| Find the feeling's pull: "What does it want to do?" fight / chase / hide / blank | A protector's move, asked in the person's own terms. |
| Recover's pull: fight / chase / hide / freeze; *Under this, I needed…* (`UnmetNeed`) | The protector, and what it guards. |
| Do the Opposite: `ActionUrge` (31 urges across 9 parents), `goal`, `interpretation` | The move, the person's goal, and the story that comes with the urge. |
| DEAR MAN barriers: "I don't feel like I have the right to ask", "I feel guilty asking". Debrief: `ThoughtPattern`, `MomentResponse`, `Underneath` | Managers speaking; protector behaviour under pressure; the tender thing underneath. |
| Problem Solve `cant-ambivalent` "Part of me doesn't actually want this to change"; ambivalence "What does staying the same protect you from?" | A protector's-fear question, almost word for word. **None of it is saved today.** |
| Witness: "Giving in made sense in that moment. Part of you was keeping things safe." (`tp_gave_in`); level 3 UNDERNEATH guesses | Protective-function language, already in the house voice (drafts). |
| The angry part (agreed; built 16 Oct behind sign-off, see *The angry-part card as built*): Unblend → What it protects → Vote of confidence → Speak for it, not from it | The first parts flow, and the template for the rest. |
| Stage (v2 Recover, not built): figures; "Step back from it" lifts the camera | Externalised figures, plus visual self-distancing (the meta-position). |
| Shape it: 5 forced choices → a sculpted object; Tune it: a sound | A way to *flesh out* a part without words or scales. |
| Body map: 15 places, sensation words, strength | *Where do you notice it?* (the second F). |
| Pattern offers: offer → yes / not now / no → `MyPattern`; *still true?* revisits; set aside and restore | Consent-based promotion from log to profile. Built, switched off. |
| Spine: then-vs-now close, `FollowUp` types, Recover's next-day check | Aftercare, and a way to catch backlash. |
| Graph: `TherapyModality ifs`; `ifs_exile`, `ifs_firefighter`, `ifs_manager`, `ifs_self`, `ifs_protector`, `ifs_blending`, `ifs_unblending`, `ifs_trailhead`; bridges to Wise Mind, defusion and decentering | The concepts exist, but none has an `appToolId`. |

---

## Five decisions

### 1. The app finds trails; you name parts

- **Trail (log).** A computed, evidence-backed recurrence: *when someone pulls away, the pull is to
  chase, then to hide; 5 times in 3 weeks, across Recover and Find the feeling*. A trail has no name, no
  role and no personality.
- **Part (profile).** Something the person said yes to and named. It can start from a trail, from a
  moment ("Was this a part you know?"), or from nothing ("Get to know a part").

Keeping these two apart is where most of the safety comes from.

### 2. Three timescales, three moves

| When | State | Move | Never |
|---|---|---|---|
| **In the moment** (inside a tool, right after the person picks an urge or pull) | Possibly vulnerable | **Unblend.** One line, built from a move *the person picked this session*: "A part of you wants to hit back right now." Nothing else, except the agreed angry-part card, which also asks *what it protects* and gives the vote of confidence. Flooded still goes body-first | Naming a specific part. Inferring the move from check-in words. Offers. Showing it to anyone not opted in (except the angry-part card when chosen) |
| **Afterwards** (from Me, Today or Settings, never from a check-in result) | An opening: no flooding or crisis signal in the last 2 h | **Befriend.** *Meet a part* (the six Fs, protector level) | Going under the protector |
| **Over weeks** (Today, Me, Reflect) | Calm, reflective | **Integrate.** Check-backs, jobs updated, two pulls, the den | Pushing; more than one offer a week |

This is the JITAI distinction between states of vulnerability and states of opportunity (Nahum-Shani
2018), applied to parts work. The agreed angry-part spec does a short protector exchange in the heat:
unblend, one question about what it protects, then a vote of confidence. This proposal keeps that card as
agreed. It allows nothing beyond the unblend line anywhere else in the moment.

### 3. Protector level only

The app works with protectors. What they guard is acknowledged and left alone.

- No screen asks what happened, when something started, or what a part remembers.
- When a protector's fear points at something tender, or the person types their own fear, the flow takes
  the conservative branch (see *Meet a part*). It says *"It's guarding something tender. We'll leave that
  be."* and nothing promises a return.
- A person can mark a part **tender** ("this part feels young or hurt"). Choosing *little* for a part's
  age offers the same. A tender part gets one practice only: *let it know you're here*. It never gets
  questions.
- None of the following, ever: unburdening, legacy burdens, "unattached burdens".

Why:

- IFS's own trauma and dissociation trainers say solo exile work can flood, and that backlash "can be
  extensive, can be dangerous" (Twombly).
- Self-help sources broadly agree: befriending protectors is fine alone; exile work belongs in therapy.
- The IFS Institute says it won't treat "recovered" memories as fact until corroborated (4 Nov 2025). An
  app that never asks about the past can't produce any.
- The angry-part spec already set this line: "protector level only, never the hurt's memories, never
  unburdening".

### 4. Self is the light, not a figure

On every surface, the person is the space and the light the parts sit in, never a sibling node.

- The InnerPond team found that metaphor "shapes relationality before interaction begins" (CHI 2026).
- Booth's illustrated IFS guide draws Self as the sun behind the clouds, not as one of the clouds.
- The app already has the right objects: a room, a lamp, Velvet's "warm lamp light", and the brand's
  lantern creature, implied and never drawn.

The goblin is neither Self nor a part. It stays what the brand says: the small companion up at night. The
light belongs to the person. App copy *witnesses* parts in the house voice. It never speaks as the
person's Self.

### 5. Skills are how you look after a part

| DBT | IFS reading | In the product | Strength of the mapping |
|---|---|---|---|
| Chain analysis | A trailhead is where a chain starts | Trails are the first links of a chain: situation → move. They have no vulnerability factors and no consequences. Reflect can offer "Look at this as a chain" later | Parallel, partial |
| Opposite action | The part has a worry; you have a goal | On Do the Opposite's goal screen, one optional line: *"Part of you wants to {move}. It's worried about {hurt}. You want {goal}."* The opposite step serves **your goal**. It respects the part's worry without obeying it. Opposite action still means acting against an urge that doesn't fit the facts or isn't effective | Complementary |
| Distress tolerance | The part doesn't have to put the fire out alone | After a *better* close, the part card shows "When {name} is up, Pause helped 3 of the 4 times" | Complementary |
| Validation | The app witnesses a part's intent, not its method | Witness lines can refer to a *move* ("Part of you was keeping things safe"). The person's own named parts appear only in after and over-weeks copy | Parallel |
| Wise Mind | Leading from the lamp | The planned Wise Mind tool gets a parts-aware form: *"Ask everyone to take one step back. From here, what's the wise next step?"* | Parallel, not equivalent (see *Fix while here*) |
| Dialectics, "and" not "but" | Two pulls, both trying to help | *Two pulls*: a both-and keepsake. The voice contract already bans a "but" that takes back the first clause | Strong |
| Check the facts | IFS *updating* is its own move, its closest DBT relative | "Does it know how old you are now?" is labelled updating, not Check the Facts | Kin, not the same |
| Behavioural ownership | Accountability stays | Copy always reads "A part of you wanted to ___, and you ___". Never "the part did it" | Required |

IFS says firefighters can't be eliminated, only relieved. DBT keeps its behavioural targets. Both are true
here: the part is welcome, and the behaviour is still yours to change.

---

## The vocabulary: protective moves

Discovery needs one vocabulary across modules that ask about urges in their own words. It works like
`vocabulary.py`'s `SIGNALS` table: a reviewed mapping, drafts until `SIGNED_OFF`. The source is
`scripts/parts/content.py` (built into `schema/parts.cypher`); the table below is a summary of it.

`(:ProtectiveMove {id, label, unblendPhrase, trailPhrase, nameHint, kind: 'proactive' | 'reactive' | 'either', offerable, safetyLine, reviewStatus})`

- `label` is the chip text in the person's register.
- `unblendPhrase` is the second-person phrase that follows "A part of you…" (the `{move}` slot).
- `trailPhrase` is the second-person infinitive a trail statement uses ("the pull is to {pull}").
- `nameHint` is a describing name suggestion ("the one who hides"), never an archetype.
- Every module's existing ids map to a move with `(x)-[:EXPRESSES]->(:ProtectiveMove)`, **or are held
  with a reason** (`HELD` in content.py). A test fails when a module gains an id that is neither, so a new
  urge can't silently stay out of the vocabulary or silently join it.
- FTF's pulls are already `FeelingUrge` nodes. Only Recover's pulls, which live in its flow JSON, get
  `PullOption` nodes (`recover_fight`, `recover_chase`, `recover_hide`, `recover_freeze`).

| Move | Label | `unblendPhrase` | Kind | Expressed by (existing ids) |
|---|---|---|---|---|
| `hit_back` | Hit back | wants to hit back | reactive | FTF `fight`; Recover `fight`; `anger-lash`, `anger-criticize`, `anger-destroy`, `envy-tear-down`, `disgust-judge`; DEAR MAN `mr_got_loud` |
| `chase` | Chase it, fix it now | wants to chase this down | reactive | FTF `chase`; Recover `chase`; `jealousy-check`, `jealousy-interrogate`, `jealousy-cling`, `love-stalk`, `love-reach-out`, `love-proximity` |
| `hide` | Hide | wants to hide | either | FTF `hide`; Recover `hide`; `shame-hide`, `shame-secret`, `shame-avoid-people`, `sad-isolate`, `fear-cancel`, `fear-escape`, `anger-stonewall`, `disgust-leave`, `guilt-avoid`; DEAR MAN `mr_left`, `mr_went_quiet`, `mr_changed_subject`; check-in `hu_body_shame` |
| `go_blank` | Go blank | (none: never shown) | reactive | FTF `blank`; Recover `freeze`; `fear-freeze`; DEAR MAN `mr_froze`, `tp_no_words`, `tp_crying_shutdown`; check-in `lu_mind_faraway`, `lu_mind_blank`, `lu_body_numb` |
| `zone_out` | Zone out | (none: never shown) | reactive | `sad-scroll`, `sad-bed` |
| `keep_the_peace` | Keep the peace | wants to keep the peace | proactive | DEAR MAN `tp_gave_in`, `tp_apologized`, `mr_agreed`, `barrier_angry`, `thought_not_worth`; PS `person-scared-reaction`; `guilt-apologize` |
| `turn_on_myself` | Turn on myself | is turning on you | proactive | DEAR MAN `thought_my_fault`, `thought_too_much`; `guilt-punish`, `envy-compare` |
| `take_less_room` | Take up less room | wants you to take up less room | proactive | DEAR MAN `barrier_no_right`, `barrier_guilty`, `thought_dont_deserve`; PS `person-no-right-to-speak`; `shame-shrink` |
| `keep_watch` | Keep watch | is keeping watch | proactive | check-in `hu_exp_vigilance`, `hu_exp_social`; DEAR MAN `thought_wrong`, `thought_will_leave`; PS `tried-thinking-constantly` |
| `put_it_off` | Put it off | wants to put this off | proactive | `fear-avoid`, `sad-give-up`, `envy-give-up`; PS `cant-keep-putting-off`, `cant-afraid-aftermath`, `cant-ambivalent` |

Changes from the first draft of this table, all for review:

- `tp_escalated` ("It escalated quickly") is held: it doesn't say whose move it was.
- `thought_not_worth` ("This isn't worth the fight") is *keep the peace*, not *put it off*: in DEAR MAN it
  means dropping the ask to avoid the conflict.
- `bs_numb` is a body signal, so it gets a place (`AT_PLACE` → `body`), not a move.
- Held with a reason, among others: `disgust-push` (a boundary as often as a protector), `love-idealize`,
  `mr_cried` (a feeling arriving), `mr_stayed_course` (the person leading), `hu_exp_flooding` (a flood
  signal the gates read, never a move), `barrier_emotional` (a fear of flooding).

Notes on the vocabulary:

- **No move is called "disappear".** In a high-distress moment, "A part of you wants to disappear" reads
  as the app echoing suicidal ideation. FTF's existing chip text "Disappear" stays the person's choice,
  and the app answers with *hide*.
- **`go_blank` and `zone_out` are `offerable: false`.** They never become trails or unblend lines. They
  never appear in a *Two pulls* pair. Shutdown and far-away states are where dissociation lives, and where
  parts language most often harms. They still feed the stats of a part the person made themselves.
- **`safetyLine: true` on `turn_on_myself`** (`guilt-punish` "Punish yourself"). A part whose moves
  include it always shows crisis resources alongside, never instead. This goes through one seam, the way
  `checkinSafetyFlag.ts` works.
- **Moves describe what a part does, never what it is.** No manager / firefighter / exile label appears
  anywhere the person can see. `kind` exists only for rule logic. Ocean (an IFS therapist with lived OSDD
  experience): "There's a huge difference between saying parts are managers or firefighters versus
  noticing they're taking protective roles."
- **`(:ProtectiveMove)-[:OFTEN_GUARDS]->(:ProtectedHurt)`.** `ProtectedHurt` is the angry-part spec's
  node (being brushed off, made small, left out, not mattering, laughed at, alone in this). That spec maps
  it to Emotion ids. This proposal **adds** `SAME_AS` edges to the existing `UnmetNeed` and
  `InvalidationEvent` ids, which changes the agreed spec. These edges are *offering hypotheses* for the
  "What's it protecting?" chips, never a reading of the person.
- **A known gap.** Nothing logs a *push harder* move (taskmaster, perfectionist), which Earley's critic
  types say matters. Until a tool asks about it, it can only come from *Meet a part* chips.

---

## Discovery: trails

### Episodes

The evaluator turns log records into **episodes**: `{at, moveIds[], context, sourceTools[], recordKeys[]}`.

- **Records within 2 hours of each other merge into one episode first.** A check-in that hands off to FTF,
  or FTF that hands off to Recover, is one moment, not two pieces of evidence.
- Context fields come only from data that is already stored:

| Context | Source |
|---|---|
| `trigger` | FTF `setOff` (someone / situation / body / nothing); Recover → someone; DEAR MAN → someone |
| `person` | DEAR MAN `relationshipType`; later the reserved **My people** slice. Never free text |
| `family` | Emotion family of the episode's emotion ids (via `HAS_REGULATION_CONTENT`) |
| `place` | Body regions (check-in `BodySensation.region`; DEAR MAN `BodySignal` → place, data fix 6) |
| `timeBand` | morning / afternoon / evening / night, from `timestamp` and `User.timeZone` |
| `guards` | Recover `needId`, DEAR MAN `underneathIds` → `ProtectedHurt` |

**As built (17 Oct, `functions/src/parts/trails/`, switched off).** `episodes.ts` is pure. Records within
`episodeMergeHours` of an episode's **first** record merge, so a busy day can't chain into one episode.
Each context takes the first non-null value in time order; a later record that disagrees is counted as a
conflict, never guessed. `timeBand` comes from the first record in `User.timeZone`. Only closed sessions
count, and an episode's time is its first ToolSession's start. Where moves come from (one predicate,
`parts/sessionMoves.ts`, shared with `queuePartCandidate`; approved `EXPRESSES` edges only):

| Tool | Moves | Context |
|---|---|---|
| Do the Opposite | `ToolSession.urgeIds`, the plan's `urgeId` | — |
| Urge Surfing | `urgeIds` → `FeelingUrge` | — |
| Find the feeling | `DETAIL` session's `pull` → `FeelingUrge` | `setOff` → trigger (an exact `dataJson` match, test-pinned) |
| Recover | `DETAIL` session's `pull` → `PullOption` | `stateId` → event; trigger someone |
| DEAR MAN | moment response, turning point, thought pattern and barrier ids | trigger someone |
| Problem Solve | `ext.er.barrierSubId` (its ambivalence id has no `EXPRESSES`) | — |
| Check-in | follow-up answer ids (`discResponseIds`) | — |

A detail session with no ToolSession counts as its own record. Meet a part is never read. No free text is
ever read (`trails/ownWords.ts` lists the own-words properties the query must not return, test-enforced).

### Rules

`TrailRule` is graph content with its **own label**. The existing evaluator hardcodes `PatternRule` and
`what_helps`, so `readRules` gains a kind filter rather than sharing the label. Every rule is off until
reviewed. The thresholds below are a starting guess; Claudia sets the real counts after looking at real
data.

| Rule | Shape | Fires when | Statement |
|---|---|---|---|
| **A. A move in a situation** | One offerable move, one shared context | ≥4 episodes in 42 days, spread over ≥14 days, from **≥2 different tools**, with ≥60% sharing one context value | "When {context}, the pull is to {move}." |
| **B. Sequence** | Move A, then move B in a **separate** episode within 24 h | ≥3 times in 42 days, and B at least twice as likely in the 24 h after A as in other 24 h windows with app use | "After {A}, {B} often comes next." |
| **C. Two pulls** | A `PolarityPair` of two offerable moves: chase ↔ hide, hit back ↔ keep the peace, take less room ↔ hit back | Both moves ≥3 episodes sharing a context value | "When {context}, two pulls: to {A}, and to {B}." |
| **D. A part you know** | Untagged episodes matching a claimed part's moves | ≥3 since it was last visited | Never a push. Shown in Reflect as "Was this {name}?", answered in a batch |

Why the rules look like this:

- **≥2 tools** is triangulation. One tool repeated is a tool habit.
- **Event-anchored windows in rule B.** Schema-mode experience sampling found mode-to-mode transitions
  (Vulnerable Child → Critical Parent; Berger et al. 2026). The authors suspect their fixed intervals
  missed the fast ones.
- **Rule B is how the classic loop surfaces:** *hit back* in the evening, *turn on myself* the next
  morning.
- **Rule C is where dialectics live.** Fisher describes borderline dynamics as parts that attach versus
  parts that flee or fight.
- **No rule outputs a role, a type, an age or a name.**
- **Rule D reads claimed parts' moves.** That is a profile read, so it goes through
  `readProfileSlices(tx, uid, 'today')` with `parts` declared for `today`. It never touches the Part node
  directly.

**As built (17 Oct, every rule `enabled: false`).** `rules.ts` evaluates the four shapes; `evaluate.ts`
removes blocked trails before it picks each trail's best context. The choices:

- **A** counts only records that express the move, for its episodes and for its tools. It may name
  `turn_on_myself` and carries `safetyLine` when it does; Today never offers those (below).
- **B** windows run start to start, and its two moves are sorted for the offer id and the block, so
  both orders are one trail.
- **C** gives one candidate per polarity pair.
- **D** is blocked by rule and part; "since it was last visited" falls back to when the part was kept.
  The `parts` slice carries `lastVisitedAt` and `pausedUntil` for it. D goes to Reflect only, never to
  Today.
- **The dry run** (`scripts/parts/trails-dry-run.mjs`, read-only, after `npm --prefix functions run
  build`) treats every rule as on and prints what each would find: `--uid <uid>` for one person
  (episodes, candidates, statements, evidence), `--all` for aggregates with no uid, `--drafts` to count
  draft `EXPRESSES` edges too, `--set <rule>.<field>=<n>` to try a threshold, and `--records <file>`
  offline. Sources print as graph labels and a part as ‹part id›; nothing the person wrote.
- **Rule D in Reflect (built, `offers/review.ts`).** `getReflectTrails` returns at most two D blocks
  ("Was this {name}?", each with its moments), through `offerGate` without the weekly budget (D is never
  a push, so a D batch has no `offeredAt`), and the plain patterns: offers answered *It's how things
  go*, shown with parts on and every phrase signed off. `answerKnownPartReview` takes the batch on the
  caller's own live part, and only moments that are still its D episodes. *Yes* writes a
  `PartTag {source: 'review'}` per record (`taggedKey <recordKey>:review`). *No* writes a D `TrailOffer`,
  answered, with `noKeys` (its id is the client's batch UUID, cooling down for the rule's 14 days), and a
  moment with a *No* for that part never comes back for it (`knownPartEpisodes`). *Done* and *Not now*
  save what was answered and cool the part down. `removeTrailPattern` (×) sets `patternRemovedAt`
  (`GUARDS.TrailOffer.removePattern`). A part with the safety flag gets the compact crisis banner beside
  its block. Copy: `review_yes` / `review_no` / `review_not_sure` / `review_done` / `review_not_now`,
  `review_noname` ("Was this that part?"), `patterns_title` ("How things tend to go"), `patterns_remove`;
  `KNOWN_PART_REVIEW_REQUIRED`, `PLAIN_PATTERNS_REQUIRED`.

### When an offer may appear

An offer is an intervention, so it waits for an opening:

- **Only on Today.** Never inside a flow, never on a check-in result.
- **Only when parts are on in Settings.**
- **Gates checked when the card renders**, not only when the day's evaluation runs:
  - not within 2 h of a check-in matched to `emotional_flooding`, or carrying `hu_exp_flooding` or a
    crisis flag;
  - not within 48 h of a crisis flag;
  - not after **2 or more** `dissociation_overmodulation` / `conservation_freeze` results in the last
    14 days (history, not just the latest check-in).
- **At most one offer a week, shared with `what_helps`** (the existing `OFFER_EVERY_DAYS` budget). The
  week runs from the later of an offer's `offeredAt` and `answeredAt` (`offerBudgetAt`, in both
  readers), and no new offer is made while one is still on Today, including a *Not now* back from its
  cooldown (`showableOffer`).
- Quiet hours are respected. **No part name or move ever appears in a push notification.** Pushes say only
  "Something on Today".
- `PartsPolicy {offersEnabled}` is the kill switch. It turns off **offers only**, never anyone's parts.

### The offer card

```
Something keeps showing up                         ← the existing "Something we noticed" pattern
When someone pulls away, two pulls: to chase it,   ← serif: it's about the person
and to hide.
Want to take a look?

[Show me]   [Not now]   [No]
```

**Show me** opens the evidence:

```
What the app saw
Tue 14 Sep   Recover            They pulled away         Chase them
Sat 18 Sep   Find the feeling   Something with someone   Chase it
Wed 22 Sep   Recover            They pulled away         Hide
Mon 27 Sep   DEAR MAN debrief   Partner                  I went quiet
Fri 1 Oct    Find the feeling   Something with someone   Disappear

Does this feel like a part of you?
[Yes, a part of me]   [More than one]   [It's how things go]   [Not me]
```

| Answer | What happens |
|---|---|
| **Yes** | *Meet a part*, with this trail as the trailhead |
| **More than one** | "Which of these feels like its own thing?" Each kept half becomes a `PartCandidate` (log). On a rule C trail this goes to *Two pulls* |
| **It's how things go** | The trail stays a plain pattern in Reflect. It is respected as an answer |
| **Not me** | Declined for that rule + moves + context |
| **Not now** | Cooldown |

- No probability, confidence score or "the app thinks". 51% of people are uncomfortable being categorised
  (Pew 2019). Showing the receipts is the honest substitute.
- Rows are ids rendered as labels. No free text appears on an offer.
- **Its own callable.** `answerTrailOffer` takes the five answers and the evidence step.
  `answerPatternOffer` and `patternOfferItems` stay as they are.

**As built (17 Oct, switched off; `functions/src/parts/offers/`, `TrailOfferCard`).**

- **The prepare step** runs once a day (`User.trailsEvaluatedAt`): `readTrailState`, then the engine
  with the person's blocked trails. It offers shapes **A to C only**: D is filtered out before the top
  candidate is picked. Safety-line A trails are skipped too: whether they are ever offered, with the
  crisis banner alongside, is a question for the clinical review.
- **`writeTrailOffer`** (`offers/record.ts`) is the one writer of a `TrailOffer`, test-enforced.
- **`offerGate`** (`offers/gate.ts`, pure, exported so Reflect can share it) checks parts on, offers on
  and the rule on; flooding or a crisis flag within `floodGateHours`; a crisis within
  `crisisPauseHours`; repeated dissociation; any harm signal (`parts/harmRows.ts`, shared with
  `harm.ts`); and one weekly budget shared with `what_helps` (`profile/offerBudget.ts`). The windows
  include both ends.
- **Today** shows at most one offer, the newest open one, only when every phrase its statement needs is
  signed off, and drops it on a flooded band.
- **The callables.** `getTrailOfferEvidence` marks the offer seen and returns rows of date, tool,
  context phrase and graph labels. `answerTrailOffer`: *Yes* opens Meet a part on the `offer` trailhead,
  and `keepPart` records `ACCEPTED_FROM` (the offer's moves join the session's); *More than one* writes
  `PartCandidate`s (origin `trail`) after "Which of these feels like its own thing?" and *Keep these*
  (`offer_split_keep`); *It's how things go* and *Not me* close it; *Not now* keeps it open and cools it
  down. It refuses a D offer, and accepts answers with offers off, so an open card can still be closed.
- **Blocking** (`offers/blocked.ts`): *Not me*, every other final answer and an offer still open block
  that trail for good; *Not now* blocks until `cooldownUntil` (the rule's `cooldownDays`, else 28).

### "Was this a part you know?" — the stronger signal

The person's own recognition is better evidence than inference. Once someone has a part, a **better** or
**much better** close gets one more quiet, skippable row:

```
Was this a part you know?
[the one who chases]  [the critic at night]  [A new one]  [Skip]
```

- **Never** shown after Help now, a micro-step, a *same* or *louder* close, or to anyone with parts off.
- A tag writes a `PartTag` log record. It never writes an edge out of the tagged record, because a
  finalised record accepts only incoming edges (`lifecycle.ts`):
  - `(:PartTag)-[:TAGS]->(:CheckIn|:ToolSession)`
  - `(:PartTag)-[:OF_PART]->(:Part)`
- **A new one** asks: "Want to come back to it later?" Only a yes writes a `PartCandidate`, which the
  person finds in Me.
- Rule D's batch review in Reflect writes `PartTag`s the same way, weeks later. That is allowed because
  the tag is the new record.
- Nick Barr's practice partner was best at exactly this question ("Is this a new part, or one of the
  existing parts?"). He called it "the kind of question that only a very engaged therapist or close
  friend would be in a position to ask."

**As built (16 Oct, behind sign-off).**

- **Hosts:** every tool whose close asks then-vs-now (Cool Down, 5-4-3-2-1, Find the feeling) and every
  urge close answered *Held off* (Pause, Urge Surfing: holding off **is** their better close; never
  *Partly*, *Went ahead* or *Still deciding*), through one component, `PartTagSlot`, which holds the only gate. A test derives the host list from
  `TOOL_CLOSE_KIND` (both close kinds), so a new tool can't miss it. `meet-a-part` is never a host. Each host declares
  `parts` in `PROFILE_NEEDS`.
- **Gate:** parts on, the close saved, better or much better, every tag line and both unnamed-part lines
  signed off, and at least one active or resting part. The server (`tagPart`) refuses everything else
  itself: parts off, someone else's or an open session, a same / worse close, a Meet a part session, a
  set-aside part.
- **One tag per ToolSession per source**: a read inside the write returns the first tag, and a
  `taggedKey` uniqueness constraint catches a race. Only `ToolSession` targets so far (no `CheckIn` tags
  yet).
- **Sources**: `tagPart` takes `source`. `close` is everything above. `debrief` is DEAR MAN's *who showed
  up*: the caller's own `dear-man` ToolSession, open or closed (the tag is the new record, so the edge
  into the session stays incoming), with `strength` `yes` or `a_bit`, keyed `<session key>:debrief` so a
  close tag and a debrief tag can sit on one session. Only close tags count toward *helped* and *when*.
- **Chips:** up to four parts, most recently visited first: a small figure and the name in the serif, or
  for an unnamed part *"The one in your {place}"* / *"One you haven't named"*. Then *A new one*, *Skip*.
  One tap folds the row away with nothing said.
- **A new one** → *"Want to come back to it later?"* Yes / No thanks. Yes writes a candidate with
  `toolSessionId`: the server derives its moves from that session's urge / pull ids through approved
  `EXPRESSES` edges and links `(:PartCandidate)-[:FROM_SESSION]->(:ToolSession)`.

---

## Meet a part

A new tool, `meet-a-part`, in module `mf` ("Notice it", which has no tool yet). It is the six Fs rebuilt
from the house's own mechanics: one decision per screen, chips first, "add your own" as the escape
hatch, no free text required, no scale anywhere.

**Entries.** All require parts on. (The angry-part card itself reaches people with parts off, in its
plain wording; its "later" line below is shown only with parts on.)

- an offer's *Yes*;
- Me → Parts of me → "Get to know a part";
- a `PartCandidate` in Me;
- Settings, right after turning parts on;
- the angry-part card's last screen ("Spend a minute with it later?"). This queues a candidate; it does
  not open the flow.
- a Problem Solve exit at `cant-ambivalent`. This queues "the part that doesn't want change" as a
  candidate; it does not open the flow mid-tool.

**Never from a check-in result or a routing card.** Meet a part gets no `RECOMMENDED_FOR` rows. On
`rumination_loop` it would feed the loop it is meant to help with.

**Gates:**

- **Flooding / crisis in the last 2 h:** the P2 hand-off first. *Keep going anyway* stays available.
- **Dissociation history** (2 or more matches in 14 days): one heads-up, *"If you start to feel far
  away, stop any time. Coming back into the room comes first."*, plus a 5-4-3-2-1 link, then the
  choice.
- **`TooMuchLink` on every screen.** It never locks.
- **The blending check** (decided 16 Oct; see *The flood signal*). Asked right after step 1, or first
  when the entry names the part. *Running things* opens the P2 body hand-off, with *keep going* still
  there.

| # | Step | Screen | Copy (draft) | Options |
|---|---|---|---|---|
| 1 | Find | What's here | "What's showing up?" | Chips from the trailhead (e.g. "The pull to hide"), parts they know, "Something else" |
| 2 | Focus | Where | "Where do you notice it?" | The heat figure, one mark. "Nowhere I can find" is a complete answer |
| 3 | Flesh out | Shape | "Which is closer to it?" | Shape it's five forced choices, no regulate step. The result is the part's figure. Tune it is the alternative |
| 3b | Flesh out | Age | "How old does it seem?" | school age · teenage · about my age · older · can't tell · **little** → "It sounds young. Want to keep it gentle?" Yes moves to the tender path |
| 3c | Flesh out | Voice | "Does it say anything?" | Chips from the move (`hide`: "Don't let them see", "Get out before they leave", "It's safer alone"), "In my words", "Nothing" |
| 4 | Feel toward | Gate | "How do you feel toward it right now?" | **Self-like:** curious · steady · warm toward it · open → 5. **Not Self-like:** annoyed · scared of it · want it gone · ashamed of it · tired of it → 4b. **not sure** → 5. **nothing** → grounding (below) |
| 4b | Unblend | Room | "That reaction might be another part. Can it give you some room, for now?" | It eased off · It's still here · Not sure |
| 5 | Befriend | Job | "What's it trying to do for you?" | Chips from `PartJob` for the move (`hide`: "Keep me out of sight", "Keep me from being pushed out", "Keep me from making it worse"), "In my words" |
| 5b | Befriend | The job | "Does it like this job?" | It's tired · It's proud of it · Not sure |
| 5c | Befriend | Guards | "What do you think it's protecting?" | The move's `OFTEN_GUARDS` hurts in rank order (the agreed angry card's six: being brushed off · made small · left out · not mattering · laughed at · alone in this) · Not sure. A category, never a memory: no follow-up question about it. Saved as the part's `GUARDS` on 9b's yes |
| 5d | Befriend | In front | "Does it stand in front of another part you know?" | Their other active or resting parts by name, then *No one I know* · *Not sure*. A part picked writes `PartLink {kind:'covers_for'}` (this part in front) on keep, server-side through `links.ts` (`frontLink.ts`). Asked only when they keep another part; skipped until its copy is signed off |
| 6 | Fears | Fear | "What's it afraid would happen if it stopped?" | `PartFear` chips; some flagged `tender` or `danger`. "In my words" always takes the conservative branch |
| 7 | Update | Now | "Does it know how old you are now?" | Yes · It doesn't seem to · Not sure. If not: "Show it something you can do now." Chips: I can leave a room · I can ask for help · I have people now · I can say no · In my words |
| 8 | Appreciate | Thanks | "Thank it for trying to protect you." | Press and hold. **The one earned moment:** the lamp's light reaches its figure |
| 8b | Befriend | Would rather | "If it didn't have to do this, what would it rather do?" | `PreferredRole` chips (`hit_back`: "Tell me when something matters", "Help me stand up for myself, steady and out loud"), "Not sure yet" |
| 9 | Keep | Name | "Want to give it a name?" | Text, up to 40 characters. Suggestions describe, never archetypes or numbers: "the one who hides". "Not yet" |
| 9b | Keep | Profile | "Keep it, so you can come back to it?" | Yes, keep it · Not now. **This is rule 4's yes** |
| 10 | Close | Then vs. now | The spine's orienting close: "Further away … More here" | `part_checkback` follow-up tomorrow (on yes) |

### Branches

- **4 → 4b.** At most twice. After the second non-Self answer:
  - The screen says *"That's enough for today. The part that's worried about it counts too."*
  - Then it asks *"Want to get to know that one another time?"* Only a yes writes a `PartCandidate`.
  - *Not sure* never ends a session. The house rule is that "I don't know" is complete. The gate never
    certifies Self: an IFS-fluent person can type curiosity while a Self-like manager drives, and Parts
    Companion found that raw Self-energy estimates "inflate for IFS-fluent clients". It only ever
    *pauses* on a non-Self answer.
- **Nothing at 4.** That can be numbing, not a part. The flow does not call it one. It says *"Sometimes
  there's nothing there yet. That's fine."*, offers 5-4-3-2-1 or a body primitive, then Thank it and
  close. There is no Name or Keep: nothing was found, so nothing is kept.
- **The conservative branch at 6** covers a `tender` fear ("I'd feel the old hurt", "Something would come
  up I can't handle") **or anything in the person's own words**:

  ```
  It's guarding something tender.
  We'll leave that be. You found the guard, and that counts.
  If you see a therapist, this is a good thing to bring.
  [Thank it]   [Something for my body first]
  ```

  - It skips 7 and 8b.
  - It records `stopReason: 'tender'` (or `own_words`).
  - Name and Keep are still offered: the person found the guard, and keeping it (marked `tender`) is how
    they come back to it gently.
  - Nothing offers to go further, now or later.
  - Own words are never parsed. Unread text is treated as the riskier case, not the safer one.
- **`danger` fear, or a move with `safetyLine`.** This covers fears such as "it would hurt me" or "I'd do
  something I can't take back", and own words at 3c or 5 on a `safetyLine` move.
  - Crisis resources render alongside, through the check-in's seam.
  - The flow goes straight to Thank it and close, **without Name or Keep**: a moment that showed danger
    adds no commitment and no profile write. The person can meet it again on a calmer day.
  - These parts never get 7 or 8b on their own.
- **The tender path** (marked tender, or "little" accepted at 3b). One screen replaces 3c–8b:

  ```
  Can you let it know you're here?
  You don't need to do anything else.
  [press and hold]
  ```

  This is presence without witnessing, and it never asks a question.

### What's saved

- **`PartSession` (log, finalise-once).** The spine's `ToolSession` links to it with `DETAIL`, as the
  other tools do in `wrap.ts`. It holds:
  - `partId?`, `candidateId?`, `trailheadKind`
  - `stepIds{}`: the ids chosen at each step
  - `feelTowardIds[]`, in the order asked (ask-fresh: in `ASK_FRESH_FIELDS`, never pre-filled)
  - `blendCheck` (`notice` | `running` | `not_sure`) and, when P2 ran, `handoffs` (ask-fresh, log only)
  - `steppedBack`, `stopReason`, `exitStep`
  - own-words text, as written and never linted or interpreted
- **The close lives on the ToolSession, not duplicated.** The close kind is `orienting`, and
  `meet-a-part` is **excluded from `what_helps` rules and from Insights' "went well"**. "More here" after
  meeting a part is not the same claim as "it calmed me".
- **Profile writes happen only at 9b**, through `keepPart`, the sole writer of `Part`. They cover the
  figure, places, jobs, fears, preferred roles and name. The person's own-words job and fear are copied
  into the Part only there, on that yes.
  - **Built from the stored session, never from the client** (`keepPart({ sessionId, partId, name? })`):
    accepted while the session is open, or saved within 12 h (a slow network or a closed tab, nothing
    longer). Non-answer chips (*Not sure*, *Nothing*, *Can't tell*, *Not yet*, *In my words*) are never
    stored as ids on a Part. `feelTowardIds`, `blendCheck` and `handoffs` are never copied.
  - `tender` is set when the tender path ran, *little* was accepted, or the visit stopped on `tender` or
    `own_words`. `source` is `candidate`, `offer` or `made`.
  - **A visit to a part already kept** updates it on the yes: ids and places are unioned (a visit never
    removes anything), own words and the shape replace the old ones only when this visit gave new ones,
    the name stays unless a new one is given, and **a newer age answer replaces the old one** (a part's
    felt age can change as it learns it's not then any more; a non-answer keeps the old one). `tender` is
    never cleared by a visit.
  - `ACCEPTED_FROM` a `TrailOffer` waits for that label (Phase 4); a candidate's is written now.
- **The tool as built** (`src/pages/tools/MeetAPart.tsx`, screens in `src/components/parts/meet/`, the step
  machine `src/lib/meetAPart.ts`, shared with the review harness): registered with `listed: false`, so it
  is reached only by link, and the page shows "not found" unless parts are on and its copy ships.
  - Entry: `p2` opens the body hand-off first (orienting first with dissociation history; the crisis
    banner alongside when flagged); *later* there saves a final session (`exitStep: 'entry'`,
    `stopReason: 'later'`) and closes the visit as left early, with no closing question. `far_away` shows
    the heads-up with the 5-4-3-2-1 link. *You don't need to get to know everyone at once.* shows once when
    three parts were made in seven days; a paused part gets its own line. After an entry P2, a *running
    things* answer opens the hand-off at its last two choices (`BreakdownHandoff`'s `startLater`).
  - The `PartSession` starts once *Find* is answered (or on the first screen when the entry names the
    part), so a move picked at *Find* is never lost. Leaving mid-visit closes the ToolSession without a
    `DETAIL` link, like the other wrapped tools.
  - The last screen says *"You can come back to this any time."* After a keep, the close asks *"Check back
    with it tomorrow?"* (see *Louder after a meeting*).

---

## Parts of me (Me)

**The switch.** It lives under Settings → Privacy & Data: *Parts*, off by default.

- Two lines sit beside it, each 90 characters or fewer:
  - *"Some people feel their parts as separate people, or lose time."*
  - *"If that's you, this works best with a therapist who knows dissociation."*
- Turning it off hides everything parts-related and stops offers.
- It deletes nothing. Delete is its own action.

**The area.** `my_parts`, **Parts of me**: *"The parts of you you've gotten to know. Only the ones you've
named."* It appears when parts are on, as a single line until it has a part or candidate: "Get to know a
part".

### The part card

A profile item, not a keepsake: no paper, no shadow. It is rendered by `getMe`, which already reads log
aggregates (`FOUND_WORD`, offers). Stats come from there, never from a profile slice.

```
[figure]   the one who hides                     ← serif: the person's name for it
           Mostly evenings
           Where: chest, throat
           Its job, in your words: keep me from being pushed out
           Afraid that: I'd be too much and they'd leave
           Would rather: let me know when I need someone

           What's helped it settle
           Pause helped 3 times                     ← shown only with ≥3 tagged closes

           How you've felt toward it
           In August: tired of it. Lately: curious.  ← comparison, never a number or chart

           [Spend time with it]   Rename   Rest it
```

- **"How you've felt toward it"** is the integration readout. It aggregates the part's `feelTowardIds`
  from `PartSession`s, in the app's then-and-now grammar. It needs at least 3 answers in each half.
- **"What's helped"** counts tagged closes for this part. Counts are fine; there are no scores and no
  part numbers. It is a count, not "3 of the 4 times": tags are only asked after a better close, so every
  tagged close is a better one and a ratio would be dishonest.
- **As built** (`functions/src/parts/stats.ts`, pure, shared by Reflect and the card; all time, not
  Reflect's range):
  - *helped*: ≥ 3 **close** tags for the part (a DEAR MAN debrief tag says the part was there, not that
    a tool helped it settle); tools by count (ties: most recently tagged), at most 3. An urge close
    answered *Held off* counts like a better close ("Pause helped 3 times").
  - *felt*: each visit counts its **first** feel-toward answer (how the person arrived, which is what
    changes as the relationship does); a first answer that is a non-answer (*not sure*, *nothing*,
    *can't tell*: `keepPlan.ts`'s `NON_ANSWER`) doesn't count as a visit, because "Lately: not sure"
    would read as a verdict when it's the absence of one; ≥ 3 visits in each half; the most common per half (ties: the later
    one); *"In {month}: {then}. Lately: {now}."*, or *"Since {month}: {now}."* when they agree.
  - *when*: ≥ 3 close tags (a debrief tag is dated by the debrief, not the moment) and one of four bands (05–12, 12–17, 17–22, 22–05, in `User.timeZone`) holding more
    than half: *"Mostly evenings"*. The mock's "Shows up when someone pulls away" needs contexts, which
    wait for trails (Phase 4).
  - Below a threshold the line is simply absent. A failed read never takes Reflect down.
- **The readouts on the card (built)**: *Mostly {when}* sits under the name; *What's helped it settle*
  and *How you've felt toward it* follow *Would rather*. `getMe` attaches `stats` to active and resting
  parts (none when set aside or with parts off), in one read for all parts. Each line shows only when it
  was computed and its copy ships (`statsReady` in `src/lib/partStats.ts`, which Reflect's gate builds
  on). Tender parts show them too: they're about the relationship, not its fears.
- **The card as built**: *Spend time with it* · Rename (inline, serif, 40 characters) · Rest it (or
  *It's back* on a resting part) · Set aside (no confirm: it's restorable; set-aside rows get *Bring it
  back*) · *It feels young or hurt* (only on a part that isn't tender; there is no unmark yet). A fear
  chip flagged `tender` or `danger` is never shown on any card, a tender part shows no fears at all, and
  `ownFear` never leaves the server. Unnamed parts are headed "A part".
- **To come back to**: up to three open candidates after the cards, *"The one that {unblendPhrase}"* (or
  *"One you wanted to come back to"*), with *Get to know it* (Meet a part from the candidate) and *Not any
  more* (`answerPartCandidate`, dismissed). Right after turning parts on, Settings shows *Get to know a
  part* once.
- **The hue is computed when the card is read** (the home quadrant of the most-tagged words). It is never
  stored on the part.
- **Layout (built):** every row is stacked, a small muted label over its value in the body style (*Where*,
  *Its job*, *Afraid that*, *Would rather*, the readouts), one spacing step between rows. The person's own
  words keep the serif at body size; chip-picked values stay in the sans; *Mostly {when}* is a quiet line
  under the name.
- **Steps that helped (built):** under *What's helped it settle*: *"Steps that helped: {step} (3 times)
  · {step} (twice) · {step}"*. These are up to 3 step ids from the part's tagged sessions, most used
  then most recent: Do the Opposite's step size, Recover's path. The line needs at least 2 tagged
  sessions with a step, and it caps at 2 steps when a label runs past 60 characters (`stats.steps`).
- **Its story (built):** *Its story* on the card opens in place, and one figure tapped in the den opens
  it too (`getPartStory`, `src/lib/partStory.ts`). Oldest first, in months only (`User.timeZone`):
  - met, rested and back;
  - its job then and now (from `jobHistoryJson`; never for a tender part, and a job chip flagged tender
    or danger is never named);
  - the card's readouts;
  - where it stands with the parts it's linked to (*Stands behind…*, *Pulls against…*);
  - a small room from the earliest earlier month beside now.

  A line shows only when its data and its words exist. There is never a fear, and no number but the
  readout's own counts.
- *See them together* sits above the cards with 2 or more active or resting parts, and opens the den.

### Still true? = checking back with protectors

The profile's revisit mechanic becomes the IFS check-back.

- Kind `part`, revisited after 30 days. A resting part keeps its check-back (resting is live; the
  check-back is how it wakes or stays quiet), with its own copy: *"{name} has been resting. Still quiet?"*
- The prompt: *"Is {name} still doing the same job?"*
- The answers:
  - **Yes**
  - **Less than before**
  - **It's doing something new** — the would-rather chips. The old job is kept in `jobHistoryJson`.
  - **It's resting** — a new status `resting`. Parts go quiet, not gone.
- The off-today `profile_revisit` card can propose rest ("{name} has been quiet since July. Still doing
  its job?") after 60 days without a tag.
- Today reads part names through `readProfileSlices(tx, uid, 'today')` with `parts` declared for `today`.
  `spine/` never imports `profile/`.
- **As built**: the check-back sits on the card itself, not in Me's generic "A few things to check" (whose
  row can't fill `{name}`). `answerPartRevisit` takes `same` · `less` · `new` · `resting` (or, for a
  resting part, `still_quiet` · `back`); every answer confirms the part and sets the next revisit. `new`
  takes 1–3 would-rather ids: the old job goes into `jobHistoryJson` (newest 10 kept), the chosen ids
  become its job and leave `preferredRoleIds`, the one place a part's ids are removed, and only because
  the person said so. Every answer is logged once as a `PartRevisit`, so "less than before" over time can
  be read later.

### Deleting

**Delete your parts** (Privacy & Data; the app says "your", per the voice contract) removes, in one
confirmed step (`deleteMyParts`, which works with parts off):

- the `Part`, `PartLink`, `DenSnapshot`, `PartCandidate` and `PartTag` records;
- every `TrailOffer`;
- every `part_checkback` follow-up, open or answered (both carry `partId`).

It leaves `ToolSession.ext.er.copeAheadPartId` and `whoShowedUp` alone: they are opaque ids and enums on
finalised log records, pointing at nothing once the part is gone, and rewriting a finalised record is
retention's job, not this one's.

It **asks separately** about kept *Two pulls* lines in My words that contain part names: "Also remove 2
kept lines that name your parts?"

`PartSession` own-words are log records and follow retention. Delete your parts removes them too.

---

## The den

The map, at Me → Parts of me → *See them together*.

- **The room.** Seen from above, in the room's wall colour, with a warm pool of lamp light in the middle.
  - **The light is you.** It is not labelled "Self". It is not a node and it can't be tapped.
  - One line under the room: *"Everyone here is in your house."*
- **Parts are small, faceless figures.** The brand rule is no face and no teeth.
  - The figure is the Stage capsule, wearing the part's Shape signature (the same render as the FTF shelf
    object). **Built first in 2D** (17 Oct): the `PartFigure` from its `shapeSig`, the one Me and Meet a
    part already draw.
  - It is coloured by the part's computed hue, and the name sits below it in the serif.
  - Tender parts sit wrapped, under a soft cover. They are never exposed.
- **Light on a figure** shows how recently you spent time with it: a meeting, a tag or a check-back.
  Figures you haven't visited lately sit in the dusk at the edge. Dusk means "not met lately", not bad.
  There is no score, no ring and no percentage.
- **The person places the parts.** Drag to arrange. There is no auto-layout and no "most central part":
  network centrality is shaky (Bringmann 2019), and a hierarchy is a claim the app shouldn't make. New
  parts arrive at the edge of the light.
- **Threads appear only when confirmed.** Select two figures and choose one:
  - *These two pull against each other*, which opens *Two pulls*;
  - *This one stands in front of that one*, which writes a `PartLink {kind:'covers_for'}` on a yes. The
    one behind is wrapped if it is tender.
- **Then and now.** "How the den looked in July" can sit beside today. Snapshots are saved when a part is
  added, rested or re-jobbed.
- **Motion.** None on entry. The earned moment belongs to *Meet a part*.
- **Fallbacks.** A plain list one tap away. (The 2D SVG room is the first build; it stays the fallback
  for reduced motion or failed WebGL once Stage renders it.)

**As built (17 Oct, 2D).**
- **Route and gate.** `#/me/parts/den` (`src/components/parts/den/`, a lazy chunk), reached from *See them
  together* above the cards in Parts of me when the person has 2 or more active or resting parts. Its
  gate is parts on plus `DEN_REQUIRED` through `surfaceReady`.
- **The room.**
  - The read is `getDen`, the `den` slice, declared for `'me'` only. It returns every active and resting
    part's id, name, `shapeSig`, tender, status, `mapX` / `mapY`, safety flag and a **recency bucket**
    (`near` / `a_while` / `not_lately`, from the latest of a visit, a tag and a check-back answer). No
    dates or counts reach the client.
  - The person's links, and the snapshot list, come with it.
- **Placing.**
  - Drag, or use the keyboard: focus a figure, Enter or Space picks it up, the arrows move it, Enter
    drops it, Escape cancels.
  - A drop saves through `updatePartLayout`, which lives in `keep.ts` and doesn't touch `lastVisitedAt`
    or the still-true dates.
  - A part with no position arrives at the edge of the light, spread out.
- **Threads.**
  - Tapping one figure, then another, opens the sheet:
    - *These two pull against each other* goes to Two pulls (`?a=&b=`);
    - *This one stands in front of that one* asks "Which one stands in front?" and writes the
      `covers_for` link on that tap (`linkParts`).
  - Each confirmed line has a remove (`unlinkParts`).
  - Tapping one figure alone offers *Its story* and *Spend time with it* (Meet a part for that part).
- **Links and snapshots.**
  - `functions/src/parts/links.ts` is `PartLink`'s only writer. The id is derived from kind + pair, so
    there is one link per pair and kind. Two pulls' keepsake writes through it too.
  - `denSnapshot.ts` is `DenSnapshot`'s only writer. The server takes one when a part is kept, rested,
    woken or given a new job: `den_<UTC day>`, the day's latest wins, holding ids, positions, status and
    tender, never names.
  - *How it looked in {month}* sets the earliest earlier month beside today: side by side on wide
    screens, a toggle on a phone (`getDenSnapshot`).
- `CrisisBanner` sits compact under the room when any placed part carries the safety flag.

**Rejected:**

- A radial map with Self at the hub: it makes Self one more part.
- Lotus leaves: someone else's metaphor, and it reads as a calm app.
- Goblins as parts: this breaks the brand's "implied, never depicted" rule and invites cute.
- Archetype art.
- Collection mechanics of any kind.

---

## Two pulls (polarities)

The dialectics flow, built first in 2D (17 Oct) and on Stage later. It starts from a rule C trail, from "More than one", or from the
den. **It has the same gates as Meet a part:** parts on, the flooding / crisis and dissociation checks,
the blending check (its own wording, about both figures) on the first screen, `TooMuchLink` on every
screen, and the tender and danger branches for any chip or own words.

1. **Set them out.** Two figures face each other. The person places *themselves*, a soft light, wherever
   feels right.
2. **Feel toward, both.** "How do you feel toward each of them?" uses the step-4 chips, once per side.
   - A non-Self answer to either side gets one 4b.
   - If it is still non-Self, the flow ends: *"One of them needs its own time first."* It then offers to
     meet that part another time.
3. **Step back.** Each held breath lifts the camera (in 2D: the stage zooms out a step; reduced motion:
   it steps). This is Stage's visual self-distancing (Kross & Ayduk), and the meta-position InnerPond
   had to build a pond for.
4. **Each side's worry, in turn.** "What is {A} worried would happen if {B} got its way?" Chips from the
   pair's content, plus own words (own words → the conservative branch). Then the same for B. Equal size,
   equal time, neither one marked as the problem.
5. **What they both want.** "What do they both want for you?" The chips come from `PolarityPair.bothWant`.
   For chase ↔ hide: *not to be left* · *to stay safe in it* · *to matter to someone*.
6. **The keepsake.** Square paper, the only shadow:

   > *the one who chases* and *the one who hides* both want me not to be left.
   > I can hear both of them, and choose what I do next.

   It is built and-not-but. It is kept in My words **only on "Keep this"**.
7. **Close.** The orienting close, and on yes, a check-back for both parts in a week.

The flow never asks either part to stop and never names a winner. This is DBT's synthesis and IFS's
"neither protector has to win" in one move.

**As built (17 Oct, 2D).**
- **Route and gate.** A hidden tool, `two-pulls` (`listed: false`, lazy). It opens at
  `#/tool/two-pulls?a=<partId>&b=<partId>` from the den, or `?pair=<polarityPairId>&offer=<id>` from a
  rule C trail's *More than one*. That answer now opens Two pulls on the pair instead of asking which
  one feels like its own thing. Other shapes are unchanged.
  - With a pair only, the figures are neutral and named by their moves' `unblendPhrase`.
  - An address it can't use shows ToolPage's "Tool not found." (`ToolNotFound`).
  - Its gate is parts on and `TWO_PULLS_REQUIRED`.
- **The flow** is the pure step machine `src/lib/twoPulls.ts`, with `src/pages/tools/TwoPulls.tsx` and
  `src/components/parts/pulls/`. It opens with the entry gate and the blending check about both
  (*running things* → P2 with resume).
  - **Set out:** the person's light is dragged, or moved with the arrows; its position is a log field.
  - **Feel toward, both:** there is no *nothing* chip. A non-Self answer gets one unblend; if it's still
    there, *"One of them needs its own time first"* with *Meet it another time*: Meet a part for a kept
    part, or a `PartCandidate` (origin `two_pulls`) on the tap for a pair.
  - **Step back:** a `LightHold` that zooms the stage out a step per breath.
  - **Worries, in turn:** own words take the conservative stop.
  - **Both want, then the keepsake.**
- **Any two parts.** Two kept parts with no `PolarityPair` of their own get the general chips: four
  worries offered to each side and four both-wants (`PULLS_GENERAL_REQUIRED`, optional, drafts). So
  every visit reaches a keepsake.
- **The keepsake.** *Keep this* saves the two lines to My words. With two kept parts, it also writes
  `PartLink {kind:'two_pulls', bothWantId}` through `links.ts`, in the same transaction
  (`keepPullsKeepsake`).
- **The close** is orienting. On its yes, `two_pulls_checkback` is scheduled for both in a week
  (`schedulePullsCheckback`), and Today's check-back card handles both types. *Louder* on it is a harm
  signal and pauses neither part.
- **The session** is `PullsSession` (log, `HAS_PULLS_SESSION`, finalise-once, `pulls_session_key`;
  `startPullsSession` / `savePullsSession`), with the ask-fresh fields as in Meet a part.
- **Deleting your parts** leaves the keepsake lines in My words, unless the person ticks *Also remove
  {n} kept lines* (`deleteMyParts({ keptLines: true })`, counted by `countMyPartsLines`).

---

## Say something to it (built 17 Oct, behind sign-off)

IFS heals through the relationship between the person and each part, not through insight about it. Most
of the app's parts surfaces *observe* a part. This is the smallest way to *speak* to one, between visits.

- **Where.**
  - **Parts of me:** each active or resting card has a *Say something to it* text button. Under the
    readouts, *"You told it: …"* shows the latest message.
  - **Meet a part:** on a visit to a kept part, the same step comes after Thanks, or after the tender
    path's hold. It is skipped after *nothing there* and the danger branch, which go straight to close,
    and while the copy isn't signed off.
- **What.**
  - Five chips (flow `say`).
  - A tender part gets the gentle set instead (step `say_tender`: *I'm here*, *You're safe with me now*,
    *I'm listening*).
  - Or own words, ≤ 140, kept as written and never linted.
- **A part's story** adds one line a month, *"In {month} you told it: …"*. It waits for its own line's
  sign-off; the rest of the story doesn't wait on it.
- **Data.** `sayToPart` (`parts/say.ts`) writes a `PartMessage`:
  - log, `HAS_PART_MESSAGE`, `part_message_key`;
  - `(:PartMessage)-[:TO_PART]->(:Part)`, with the edge running out of the new message only. The Part
    is never written, so `keep.ts` stays the only Part writer.
  - Created once; the same id again writes nothing.
  - Parts on only, to the caller's active or resting part.
  - Covered by `deleteMyParts` and export.
- **Never.** No reply from the part, no suggested wording beyond the chips, no count of how often, no
  reminder to say something.

---

## In every module

All of the parts behaviour below requires parts to be on. The one exception is the angry-part card,
which is agreed and which the person chooses.

| Module | In the moment | After | Over weeks |
|---|---|---|---|
| **Check-in** | Nothing new. The check-in never asks for an urge, so the app has nothing of the person's own to unblend from. **Keep the per-spot words** (data fix 1): two spots mean two parts present | Tag row after a better close of a tool started from the result | Episodes |
| **Find the feeling** | After the pull step: "A part of you {unblendPhrase} right now." (built: the tool's Shape and Tune rooms only, never inside the check-in) | Tag row (built) | "Use this shape for {name}?" when they tag a part |
| **Do the Opposite** | After the urge: the unblend line (built; not for "My urge is different") | On the check's effectiveness card (built), above *If you follow this urge…*: *"A part of you {unblendPhrase}, and it's trying to help."* / *"You want to {goal}."* ({goal}: the goal choice's own label). No `{hurt}`: nothing in the visit says what this part fears, and a guess would put words in the person's mouth. Never for a safety-line move or *My urge is different*; `ext.er.goalLineShown` | Practiced steps per part |
| **Ask for what you need (DEAR MAN)** | The angry-part card for *fire back* (agreed) | Debrief (built): its own step after *What was underneath*, before the reflection, so the thought → feeling chain isn't interrupted. *"Did {name} show up?"* (Yes · A bit · No · Skip) when this visit's cope ahead chose a part that's still active or resting; otherwise *"Was one of your parts there?"* with the tag row's chips. Yes / A bit / a chip write a `PartTag {source:'debrief'}`; *No* and *Skip* write nothing; the named form records `ext.er.whoShowedUp`. A debrief started on its own can't reach its prep, so it asks the general form | **Cope ahead per part.** Prep asks "Who might show up in this conversation?" A chosen part brings its `anchorLineId`: *"If {name} shows up: {anchor}."* The person sets the anchor there, from kept lines or their own words. Built: `setPartAnchor` (a kept line, `anchorLineId`, or their words, `anchorOwn`, ≤ 90, never linted), a `partAnchors` slice declared for `dear-man` only, the anchor shown again on the script screen and under *Why It Matters* in the summary, `copeAheadPartId` in the visit's `ext`. The `cope` step sits between *What makes this hard?* and Describe; a flooded hand-over skips it; a failed save says *"Couldn't save that. Try again."* and keeps the form |
| **Recover** | After the pull: the unblend line (built; not on *fight* while the angry card may still come) | Tag row | Recover's next-day check also asks about a tagged part |
| **Problem Solve** | — | `cant-ambivalent` queues a candidate (on yes; built: one quiet text button after the ambivalence answer, *"Want to get to know that part another time?"*, tapping it is the yes, then *"It's in Me when you want it."*; `ext.er.psLater`). **Save barrier and ambivalence ids** (data fix 2) | Rule A source for `put_it_off` |
| **Circuit Breaker, Pause, 5-4-3-2-1, Urge Surfing** | Body first. Nothing added | Tag row only after a better close, or *Held off* on an urge close (built) | "Pause helped 3 times" on the card. Urge Surfing asks *which* urge (data fix 4) |
| **Help now, micro-steps** | Nothing | Nothing | Nothing |
| **Witness** | Unchanged in the moment. **No part names in the moment** | A `part` kind for after and over-weeks moments (check-backs, the card), with a `{name}` slot | — |
| **Today** | Collapses with flooding signals (as now) | `part_checkback`: "How's {name} today?" Settled · Same · Louder · Skip | One trail offer a week at most; protector check-backs |
| **Reflect** | — | — | Per-part view: where, when, what helped. Rule B sequences as plain patterns. Rule D batch "Was this {name}?". Built: one line above the per-part blocks, how the person has met their parts lately: the most common first feel-toward answer across every active or resting part's Meet a part visits in the last 30 days, and the 30 days before when it differs (≥ 4 answers in a half, the most common holding 40%, non-answers not counted; `feelAcross` in `parts/stats.ts`). No count of parts, score or direction |
| **Wise Mind** (planned) | — | — | The parts-aware step back. `wiseMindAnswer` stays ask-fresh |

**Louder after a meeting.**

- If the check-back answer is *Louder*, the app offers the body tools and says *"Things can get louder
  after time with a part."* It makes no prediction and no promise.
- It doesn't offer more of that part for 72 h.
- This counts as a harm signal (below).
- **As built**: `answerPartCheckback` resolves the follow-up, marks it `harmSignal` and sets the part's
  `pausedUntil` in one transaction. A paused part is never refused a visit (nothing locks), but no
  check-back is scheduled for it, and Meet a part opens with *"Things got louder after last time. Going
  gently is fine, or come back another day."* The check-back is scheduled only after a keep (or a visit to
  a kept part), on a yes to *"Check back with it tomorrow?"*, never after P2's *later* or a danger ending;
  one open check-back per part. It has no push or in-tab reminder (they would bypass the parts-on gate).

---

## Safety

| Risk | What the design does |
|---|---|
| **No band** | Stored flooding / crisis / dissociation signals on entry, then the blending check every time (*The flood signal*) |
| **Flooding** | P2 first after flooding signals; `TooMuchLink` everywhere; the tender stop; a second non-Self answer ends the session |
| **Backlash** | Next-day `part_checkback`. *Louder* → body tools, a 72 h pause on that part, and a review signal |
| **Exile contact and memories** | Protector level only. No question about the past. The tender path is presence only. Own words take the conservative branch |
| **Dissociation and plural experience** | Off by default, switched on in Settings with the dissociation lines. Shutdown moves are never offered or paired. Dissociation history blocks offers and adds a heads-up on entry. No "everyone has parts" script |
| **Self-harm** | `safetyLine` moves, `danger` fears and own words on those moves show crisis resources alongside, through one seam. No update or would-rather steps alone. **As built:** `partSafetyFlag` (`functions/src/safety/partSafetyFlag.ts`, mirrored in `src/lib/partSafetyFlag.ts`, agreement test-pinned) reads `ProtectiveMove.safetyLine` and the `danger` fear flag from content. The `parts` / `partDetail` slices and getMe carry one boolean, `safety`, computed server-side, so a tender part's hidden fears still flag it. The app's `CrisisBanner` (its `compact` form on cards) shows under the part's card actions in Me (beside its 30-day check-back, which sits in the card), under the Today check-back's answers and its Louder aftercare, and on every screen of a visit to that part in Meet a part, never instead of them. The tag row is the one place it doesn't (a chip row after a better close isn't the moment), and a set-aside row offers only "Bring it back". The seam ignores review status: content can only add a banner, never take one away |
| **Suicidal-ideation echo** | No "disappear" from the app's side; `unblendPhrase` is reviewed per move |
| **Reification, self-diagnosis** | Trails, not parts. No roles, no archetypes, no part numbers. Three or more parts made in 7 days → one line: *"You don't need to get to know everyone at once."* |
| **Accountability** | "A part of you wanted to ___, and you ___". The `no_part_blame` lint |
| **Rumination** | One offer a week, no streaks, reflection pulled by the person. Nothing on check-in results |
| **Privacy** | No part names or moves in notifications. Delete your parts is separate from deleting the account |
| **AI** | None in v1. If an LLM ever joins, it reflects only. It never speaks as a part or as the person's Self (Barr: a "complementary cognitive artifact") |

---

## Language

- **No "IFS" or "Internal Family Systems" in any feature name or UI copy.**
  - The IFS Institute claims "Internal Family Systems℠", "IFS℠" and the "IFS Trained / IFS Informed"
    designations, and its terms bar uses "likely to cause confusion".
  - Avoid "IFS-informed" as a product claim.
  - Put one line in an *About this* sheet: *"Draws on ideas from Internal Family Systems, developed by
    Richard Schwartz. Not affiliated with or endorsed by the IFS Institute."*
  - Get trademark counsel before shipping. This is not legal advice.
- **Internal vocabulary stays internal.** Manager, firefighter, exile, burden language, Self-energy and
  trailhead live in code and content only. The voice contract (`scripts/witness/voice-rules.json`,
  `scripts/voice-lint.mjs`) enforces it, and `load-graph.mjs` refuses to load parts copy that fails it.
- **Three lint scopes.** Every user-visible string in `schema/parts.cypher` is written to a
  `// @parts-copy-json` row with its kind:

  | Kind | Scope | Max | Slots | Rules |
  |---|---|---|---|---|
  | prompt (the app's questions) | `parts_prompt` | 90 | all parts slots | every validation rule, `voice_distance` included |
  | chip (what the person taps) | `parts_chip` | 60 | none | every validation rule except `voice_distance` |
  | voice (what a part says) | `parts_voice` | 40 | none | safety only: cheer, emoji, role labels, part blame, ideation echo |
  | keepsake | `parts_chip` | 90 | `{A}` `{B}` `{want}` | as chip |
  | first_person (the person's own sentence, "I felt {felt}.") | `parts_chip` | 90 | `{felt}` | as chip |

  A part's voice is deliberately unsoftened ("Just agree", "You always do this"), so the softening rules
  don't apply to it; the safety rules do.
- **Four new rules.**
  - `no_role_labels`: exile, firefighter, unburden, legacy burden, Self-energy, trailhead. Error in parts
    scopes and validation, warn in user copy. Plain "burden" stays allowed (DEAR MAN's "Asking isn't a
    burden. Guessing is." and the fear chip "I'd be a burden").
  - `no_role_manager`: "manager", in parts scopes only (a boss everywhere else).
  - `no_part_blame`: "a part (of you) made / forced you". A part wanted something; the person acted.
  - `no_ideation_echo`: disappear, vanish, die, dead, kill, suicide, "end it all", "not wake up", "better
    off without me". Error in parts scopes and validation; report-only in user copy, where Recover's and
    FTF's "disappear" are the person's own words for an urge. This is why hit back's fear chip "I'd
    disappear" became "I'd stop mattering".
- **Slots.** Parts slots count at a realistic width, not the witness lint's 8: `{name}` `{A}` `{B}` 24,
  `{move}` 32, `{pull}` `{pull2}` 18, `{hurt}` 28, `{goal}` 32, `{context}` 24, `{anchor}` 40, `{month}` 9,
  `{want}` 20, `{N}` 2. The content tests check every fragment (`unblendPhrase`, `trailPhrase`,
  `nameHint`, …) fits its slot.
- **No crisis numbers in parts copy.** Crisis resources come from the crisis seam, alongside the flow.
- **Names belong to the person.** Suggestions describe ("the one who hides"). Never "the Critic", "Inner
  Child", a number or an archetype. People on MyPTSD called numbered parts "dehumanizing".
- **"Part" itself.** Plural young people found "parts" invalidating for alters (Parry, Eve & Myers 2022).
  That is one more reason the feature is opt-in and the dissociation lines exist.

---

## Data model

These follow the Data layers rules in CLAUDE.md.

### Graph content: `schema/parts.cypher`, built from `scripts/parts/content.py`

Phase 0 builds this part (drafts, nothing served). Every node and edge carries `reviewStatus`.

| Node / edge | Purpose |
|---|---|
| `ProtectiveMove {id, label, unblendPhrase, trailPhrase, nameHint, kind, offerable, safetyLine}` | The shared vocabulary |
| `(:ActionUrge \| :FeelingUrge \| :PullOption \| :MomentResponse \| :TurningPoint \| :ThoughtPattern \| :DearManBarrier \| :BarrierSubResponse \| :QuestionResponse)-[:EXPRESSES {why}]->(:ProtectiveMove)` | Every module's ids, mapped or held; drafts until `SIGNED_OFF` |
| `PullOption {id, flow, pullId, label}`: `recover_fight`, `recover_chase`, `recover_hide`, `recover_freeze` | Recover's pulls live in its flow JSON; FTF's are `FeelingUrge` nodes already. `label` is imported from Recover's own `content.py` (one source; `build.py` asserts every PullOption has one), so evidence rows name the pull |
| `(:BodySignal)-[:AT_PLACE]->(:BodyRegion)` | DEAR MAN body signals → the body map's 15 places (data fix 6) |
| `ProtectedHurt {id, label, hurtPhrase, feltPhrase}`; `-[:NAMED_AS]->(:Emotion)`; `(:ProtectiveMove)-[:OFTEN_GUARDS {rank}]->` | The angry card's six hurts, as the agreed spec maps them to Emotion ids; "What's it protecting?" hypotheses |
| `(:InvalidationEvent)-[:CAN_TOUCH]->`, `(:UnmetNeed)-[:ANSWERS]->`, `(:Underneath)-[:SAME_AS]->(:ProtectedHurt)` | Recover's and DEAR MAN's ids for the same hurts, mapped or held. An addition to the agreed angry-part spec |
| `PartPrompt {id, flow, step, order, copy}`; `PartOption {id, flow, step, order, label, kind, flag, selfLike, branch}`; `(:PartOption)-[:OFFERED_FOR {order}]->(:ProtectiveMove)`; `(:PartOption)-[:SAME_AS]->(:ThoughtPattern \| :AmbivalenceOption)` | Every screen's copy and chips. `branch` says what a pick does. Voice chips reuse DEAR MAN's thought labels word for word, and *put it off*'s fears reuse Problem Solve's ambivalence options, so evidence from those tools can pre-order the chips |
| `PolarityPair {id, a, b}`; `-[:HAS_SIDE {side}]->(:ProtectiveMove)`; `-[:BOTH_WANT {order}]->` / `-[:WORRY {side, order}]->(:PartOption)` | Two pulls content; offerable moves only (a build check) |
| `TrailRule {id, shape, minEpisodes, windowDays, …, statementTemplate, enabled}`; `TrailContext {id, key, value, phrase}` | Its own label, off until reviewed; what fills `{context}` |
| `PartsPolicy {id:'parts', offersEnabled, episodeMergeHours, floodGateHours, crisisPauseHours, dissociationCount, dissociationDays, louderPauseHours, maxNonSelfAnswers, tooManyPartsCount, tooManyPartsDays, nameMaxChars, harmWindowDays, tenderRepeatCount}` | The offers kill switch and every safety number in one tunable place |
| `TherapyConcept {id:'parts_meet', appToolId:'meet-a-part'}`, **no `RECOMMENDED_FOR` rows** | Phase 2, with the tool. Gives it a concept without making it routable |

**Fixed while here (16 Oct, `schema/relationships.cypher`):**

- Every IFS `TREATS` edge now carries `evidenceGrade: "Preliminary"` and an `evidenceNote`; the BPD one
  says no IFS studies exist in BPD (Francis, Fino & Heym 2026).
- `ifs_self → dbt_wise_mind`, `ifs_self → pv_ventral_vagal` and `act_self_context → ifs_self` are typed
  `functional_parallel`: Wise Mind is reached by practice, while IFS's Self is posited as innate.

### User data

| Label | Layer | Fields / edges | Notes |
|---|---|---|---|
| `Part` | Profile | `kind:'part'`, `area:'my_parts'`, `name`, `status` (active / resting / set_aside), `source` (made / offer / candidate), `tender`, `shapeSig[5]`, `soundSig[4]?`, `places[]`, `ageId`, `voiceIds[]`, `ownVoice?`, `jobIds[]`, `ownJob?`, `fearIds[]`, `ownFear?`, `preferredRoleIds[]`, `jobHistoryJson`, `anchorLineId?`, `anchorOwn?`, `pausedUntil?`, `shapeFrom?` (the visit whose Find the feeling shape it carries), `mapX`, `mapY`, `confirmedAt`, `revisitAt`, `lastVisitedAt`. Profile edges `-[:USES {confirmedAt, source}]->(:ProtectiveMove)`, `-[:GUARDS]->(:ProtectedHurt)`, `-[:ACCEPTED_FROM]->(:TrailOffer \| :PartCandidate)` | **`keepPart` is the only writer.** Add a grep test like the `MyPattern` one |
| `PartLink` | Profile | `kind: 'two_pulls' \| 'covers_for'`, `aId`, `bId` (for `covers_for`, `aId` stands in front), `bothWantId?`, `confirmedAt`, `source`; `-[:LINKS]->(:Part)` ×2 | Written only on a yes in the den, Meet a part 5d or Two pulls' keepsake. **`links.ts` is the only writer** (test-enforced); one per pair and kind |
| `DenSnapshot` | Profile | `takenAt`, `layoutJson` (ids, positions, status, tender; no names or own words) | Written by the server (`denSnapshot.ts`) on a keep, rest, wake or new job; `den_<UTC day>`, one per day |
| `PullsSession` | Log | Two pulls' visit: the parts or pair, the light's position, feel-toward per side, worries, both-want, keepsake kept | `HAS_PULLS_SESSION`, finalise-once |
| `PartSession` | Log | As in *What's saved* | `ToolSession -DETAIL->` |
| `PartTag` | Log | `at`, `source` (close / debrief / review: Rule D's "Was this {name}?"), `strength` (debrief: yes / a_bit), `taggedKey` (one per tagged record per source), `-[:TAGS]->(:CheckIn \| :ToolSession)`, `-[:OF_PART]->(:Part)` | An incoming edge only, so finalise-once holds |
| `PartRevisit` | Log | `partId`, `answer`, `ratherIds`, `-[:OF_PART]->(:Part)` | The 30-day check-back's answer, written once |
| `PartCandidate` | Log | `origin` (new_one / worried_part / split / ps_ambivalence / angry_card), `moveIds[]`, `createdAt`, `status` (open / accepted / dismissed), `-[:FROM_SESSION]->(:ToolSession)?`; `(:PartSession)-[:QUEUED]->` | Written only on a yes. Read in Me the way `PatternOffer` is |
| `TrailOffer` | Log | `ruleId`, `shape`, `moveIds` (sorted), `pullIds` (statement order), `contextId`, `pairId`, `partId`, `evidenceKeys`, `evidenceJson` (dates, tool ids, record keys, move and context ids; never text), `status` (offered → seen → answered), `answer`, `offeredAt`, `seenAt`, `answeredAt`, `cooldownUntil`; `-[:EVIDENCE]->(record)`, `-[:ABOUT_PART]->(:Part)` (rule D) | `HAS_TRAIL_OFFER`. `writeTrailOffer` is the one writer; edges run out of it only. Shares the weekly budget with `PatternOffer` |

**Registration and tests.**

- Register every label in `userdata/layers.ts` with its `exportAs` and ownership rel (`Part` →
  `HAS_PART`, `PartSession` → `HAS_PART_SESSION`, `PartCandidate` → `HAS_PART_CANDIDATE`; the others
  when their phase lands). Add the `<label>_key` constraints. Add `feelTowardIds` and `blendCheck` to
  `ASK_FRESH_FIELDS`.
- **The switch** is a setting, `partsEnabled` on the user's settings profile (`account/`
  get/updateUserProfile, `UserProfileContext`), default false. Profile-layer data never goes there;
  only the switch does.
- **The entry gate** is `getPartsEntry` in `functions/src/parts/` (signal 1 of *The flood signal*):
  it reads the caller's own check-ins (flooding or a crisis flag in `floodGateHours`, dissociation
  matches in `dissociationDays`) and returns only `{ open: 'p2' | 'far_away' | 'clear', band?, crisis? }`.
  Every outcome lets the person continue.
- `PROFILE_NEEDS` and the tests that pin it (`tests/profile-layer.test.mjs`):
  - Add slice `parts` to `SLICE_IDS`. It returns active and resting parts' id, name and moves only.
  - Add slice `partDetail` (jobs, fears, voice, preferred roles, anchor), declared only for `meet-a-part`
    and Me.
  - Both slices return nothing unless the person has parts on (`User.partsEnabled`). `parts` also
    carries `tender`, so any consumer that speaks to a part knows to stay gentle with it.
  - Declare each consumer in the phase that first renders parts, never before (a tool must not read
    parts it doesn't show):
    - Phase 2: `'meet-a-part': ['name','parts','partDetail']`; `'today': ['quietHours','parts']` with
      `part_checkback`
    - Phase 3: `'dear-man': ['parts']`, `'opposite-action': ['parts']`, `'find-the-feeling': ['name','parts']`,
      `'recovering-from-invalidation': ['name','parts']`, `'witness': ['name','ownLines','savedLines','parts']`
  - The tag row reads through its host tool's needs, so there is no `'spine-close'` consumer.
  - **As built:** `'meet-a-part': ['name','parts','partDetail']`, `'today': [..., 'parts']`, the tag row's
    hosts `['parts']`, `'dear-man': ['parts','ownLines','savedLines','partAnchors']` (never `partDetail`:
    DEAR MAN shows no fears), and `'me': ['den']`. The `parts` slice also carries `firstPlace` and
    `shapeSig` for the chips.
  - Update the pinned expectations in `tests/profile-layer.test.mjs`.
- **The area and status types.**
  - Add `my_parts` to `ProfileAreaId`, `PROFILE_AREAS` and the `AREAS` content, and update the "7 areas"
    assertion.
  - Add `resting` to `ProfileItemMeta.status`.
  - Add the `part` kind to `KINDS`: revisit after 30 days.
- **Tools.**
  - Add `meet-a-part` to `src/data/tools.ts`, `toolComponents`, `functions/src/spine/tools.ts` and
    `src/lib/spine/close.ts`, with close kind `orienting`.
  - Exclude it in `evaluateRule` and in Insights' went-well.
- **Follow-ups.** New `FollowUpType`s `part_checkback` and `two_pulls_checkback`.
- **Callables in `functions/src/parts/`** (built by 16 Oct unless marked):
  - `getPartsEntry` (also `tooMany`, and `paused` for a given part), `startPartSession` / `savePartSession`
  - `keepPart` and every other Part writer in `keep.ts`: `renamePart`, `restPart`, `setAsidePart`,
    `restorePart`, `setPartTender` (true only), `answerPartRevisit`, `setPartAnchor`, the Louder pause,
    `setPartShape` (Find the feeling's "Use this shape for {name}?": writes `shapeSig` and `shapeFrom`,
    once per part per visit, active or resting parts only)
  - `queuePartCandidate`, `answerPartCandidate`, `tagPart`
  - `schedulePartCheckback`, `answerPartCheckback` (spine's `resolveFollowUp` refuses this type; spine's
    `scheduleFollowUp` and `snoozeFollowUp` refuse any parts follow-up while parts are off, as not found)
  - `deleteMyParts`
  - Phase 4, switched off: `getTrailOfferEvidence`, `answerTrailOffer`; Reflect's `getReflectTrails`,
    `answerKnownPartReview`, `removeTrailPattern`
  - Phase 5: the den's `getDen`, `getDenSnapshot`, `updatePartLayout` (in `keep.ts`), `linkParts`,
    `unlinkParts`; `getPartStory` (`story.ts`, `storyBuild.ts` pure); Two pulls' `startPullsSession`,
    `savePullsSession`, `keepPullsKeepsake`, `schedulePullsCheckback`; `countMyPartsLines`. Every reader
    returns empty with parts off (`READERS_EMPTY`), and every writer throws `partsOff()`.
  - Content ships as a generated `src/data/content/parts.json`, like the other content files, holding
    **approved rows only** (moves, prompts, options, hurts, `canTouch`, `expresses`; never trail rules or
    contexts, and of the policy only `limits` (`nameMaxChars`, `maxNonSelfAnswers`) once it is signed
    off). Screens read it through `getPartsContent()` and render only when `flowReady` finds every
    line they need, so nothing parts-related appears until its copy is signed off. An approved option
    may name a move that isn't signed off yet; completeness is `flowReady`'s job. **Only the fields a
    screen uses ship**, through one list, `scripts/content-snapshot/partsAllowlist.mjs`, which the
    snapshot build and the fixture projection both read: moves `id, label, unblendPhrase, nameHint,
    safetyLine`; prompts `copy`; options `id, label, flag, selfLike, branch, order, moves`; hurts `id,
    label, feltPhrase, matters, order, namedAs, guardedBy {moveId, rank}`; `canTouch` / `expresses` as
    ids. Move kinds and trail phrases, prompt flow / step / order, option kind / `sameAs` and the hurt
    phrase stay in the graph.
  - `meet-a-part` is in `NOT_WHAT_HELPS` (`spine/tools.ts`): its orienting answer is stored but never
    counted as "it helped" (what-helps rules, Insights, Today's outcome card, `ToolUsage.outcome`).
- **Trail evaluation.** It joins the Today prepare step as a second rule family. `readRules` filters by
  kind, and the family imports nothing from `profile/items.ts`. **As built:** see *Discovery: trails*.

### Data fixes this needs first (no UI)

1. **Built (16 Oct).** Keep the check-in's per-spot words. A grid check-in with 2 or 3 filled spots
   sends `spots: [{x, y, emotionIds[]}]`; the server keeps only real Emotion ids and stores
   `CheckIn.spotsJson` (log layer). Anything invalid drops the field, never the save.
2. **Built (16 Oct).** Problem Solve saves `barrierTypeId`, `barrierSubId`, `ambivalenceId` and
   `confidence` in `ext.er` (ids only; the four confidence values are checked by the client).
3. **Built (16 Oct, approved by Claudia).** Do the Opposite records the urge picked in this visit on the
   visit's `ToolSession` (`urgeIds`, through `setUrgeIds`; the custom urge sends none, and a follow-up
   visit that reloads a saved plan sends none) and the check's result as ids in `ext.er`: `oaFacts`,
   `oaEffect`, `oaRoute` (`support` records the route alone). Recheck or going back clears them. This
   keeps the case where the urge fits the facts and would help (route `problem`): a protector doing its
   job well. That visit still closes as `exited_early`: closing it `completed` would write an Opposite
   action rep (`PracticeSkill.defaultFor`), which it isn't.
4. **Built (16 Oct, approved by Claudia).** Urge Surfing asks "What does it want to do?" with FTF's
   four pulls (label and sub, from the generated `find-the-feeling.json`), one optional tap, filling
   `ToolSession.urgeIds`. It sits on the surfing screen, between the wave and the update slider, not
   before Start: on the first screen it pushed Start below the fold for someone mid-urge.
5. **Built (16 Oct).** Tool sessions carry `emotionIds`: from the hand-off's `checkinEmotions` at start,
   or set once on close from what the person picked inside the tool (Problem Solve, Do the Opposite,
   Recover, Find the feeling, DEAR MAN's Express chips). A hand-off's ids are never replaced.
6. **Built as content (16 Oct).** `BodySignal-[:AT_PLACE]->BodyRegion`, in `schema/parts.cypher`.

---

## Measuring it

There are no rating scales in the product. The integration signal comes from answers people already give:

| Signal | Source | Reads as |
|---|---|---|
| Feel-toward shift per part | `PartSession.feelTowardIds`, then vs. now | The relationship to the part (the core signal) |
| Named in the moment | An unblend line followed by a tag; "speak for it" lines kept | Unblending in daily life |
| "More here" after Meet a part | Orienting close | Immediate presence |
| Skills used per part | `PartTag`s | Skills as care |
| Jobs updated, parts resting | Check-backs | Protectors relaxing |
| Two pulls lines kept | My words | Synthesis |

**Harm signals** pause **offers** for that person, never their parts, and go to review:

- *Louder* check-backs;
- a crisis flag within 48 h of a Meet a part session;
- `stopReason: 'tender'` or `own_words` repeating;
- a high "Not me" rate.

These are **watched, not acted on**: three or more parts in 7 days, and parts deleted or turned off. They
are choices, not harms. Global numbers need aggregate telemetry that doesn't exist yet. This proposal
doesn't add any.

**As built** (16 Oct). The definitions live once, in `functions/src/parts/harm.ts` (pure,
`harmSignalsFor(rows, now, policy)`), and the review report reads the same numbers from `PartsPolicy`
(a test pins the two together), so the report and the offer gate can never disagree:

- the window is `harmWindowDays` (28), both ends inclusive;
- *Louder*: check-backs answered Louder, dated by the answer;
- *crisis after a meeting*: a Meet a part session followed by a crisis-flagged check-in strictly after
  it started and within `crisisPauseHours` (48); each session counts once;
- *tender or own words repeating*: 2 or more of those stops (`tenderRepeatCount`);
- *not Self repeating*: 2 or more `not_self` endings, counted apart from tender;
- watched, not harms: sessions where P2 opened, *running things* at the blending check, and 3 or more
  parts made in 7 days.
- Not recorded, so not counted: parts deleted (`deleteMyParts` removes the records) and parts turned off
  (the setting keeps only its current value; the report counts people with parts and the setting off
  now). No tracking was added for either. The "Not me" rate waits for offers.

`scripts/parts/report.cypher` is read-only, run by hand
(`node scripts/load-graph.mjs --file scripts/parts/report.cypher --no-content-refresh`, or in Aura
Workspace; it needs APOC core, which Aura has). Statement 1 is one row per person with any harm signal,
keyed by the first 12 characters of a sha256 of the account id (never the id, a name, an email or
anything the person wrote). Statement 2 is aggregates only: parts kept / resting / set aside / tender,
visits, the feel-toward shift (by each feel option's `selfLike`), unblend lines shown, tags by source,
check-back answers and the Louder share, still-true answers, candidates, and the watched counts. A test
fails if it returns a name, own words, an anchor or line text.

One tension with the house rules: the only free validated proxy for how someone relates to their parts,
the Self-Compassion Scale short form, is a rating scale. If you want an outcome study, run it outside the
app, with consent. Don't put it in the product.

---

## Build order

| Phase | What | Why this order |
|---|---|---|
| **0. Data and decisions** | The six data fixes; `ProtectiveMove` + `EXPRESSES` + review; the lint scopes and slots; **the flood-signal decision** | Trails need episodes; the gates need a signal |
| **1. The angry part** | Build the agreed card as specified | Agreed already; it introduces parts language at protector level, by choice |
| **2. Meet a part + Parts of me** | The tool, the Settings switch, the `my_parts` area, the part card (no stats yet), the tender path, `part_checkback`, deletion | Hand-made parts first, to test whether people want this before any inference |
| **3. Tags and per-part help** | The tag row, card stats, Reflect per-part, DEAR MAN cope-ahead per part, unblend lines in FTF / OA / Recover, the OA goal line | The person's labels before the machine's guesses |
| **4. Trails** | Rules A and D, then B and C; evidence offers; `PartsPolicy` | Only after 4+ weeks of tagged data to sanity-check thresholds |
| **5. The den + Two pulls** | The map, snapshots, links, the polarity flow, the keepsake | 2D first (17 Oct); Stage (Recover v2) can take over the rendering later |
| **6. Wise Mind** | The Wise mind tool and its parts-aware step back (`docs/design/wise-mind.md`) | Shares Wise Mind's planned rows |

Each phase is gated on the previous phase's harm signals.

**Where it stands (17 Oct).** Phases 0–3 are built, every line a draft: nothing shows until its copy is
signed off (*Sign-off*, below). Phase 4's engine and Today's offer card are built **switched off**
(`TrailRule.enabled` and `PartsPolicy.offersEnabled` false), with a read-only dry run so Claudia can see
what each rule would find on real data and set the counts before anything is offered; switching it on
stays gated on Phase 3's harm signals. Every parts callable has had a security review (ownership by key,
the same not-found for someone else's record, parts-off refusals, limits, logs, lifecycle guards, export
and delete; `functions/test/unit/partsDataCoverage.test.cjs` builds the parts labels from `layers.ts`
and checks both paths cover each). **Phase 5 is built in 2D, without Stage** (Claudia, 17 Oct:
features first): the den, a part's story, Meet a part 5d and Two pulls, as SVG rooms with
`PartFigure`s; Stage can replace the renderer later. Trail offers stay off until Claudia has looked at
the dry run (her choice, 17 Oct). **Phase 6:** Wise mind is built and listed for everyone
(`docs/design/wise-mind.md`), and so is its parts-aware step back (2p, behind sign-off).
*Say something to it* is built (above). Not built
from the module table: Recover's next-day question about a tagged part (it would duplicate the part's own
check-back) and the witness `part` kind (no moment needs it yet).

## Sign-off

1. Add each id to `SIGNED_OFF` in `scripts/parts/content.py` with its review date.
2. Rebuild (`python3 scripts/parts/build.py > schema/parts.cypher`, `python3 scripts/parts/fixture.py`),
   commit, load `--only parts` (which refreshes the app's copy), deploy hosting.
3. A surface lights up only when every id it needs is signed off and the person has parts on (the angry
   card's plain wording is the one exception: it reaches people with parts off).

Steps 1 and 2 in one command: `node scripts/parts/sign-off.mjs --all`, `--surface <id>` (repeatable, a
pack surface: its lines and the vocabulary it shows through) or `--ids <id>,…`, with `--date` and
`--dry-run`; it skips `PENDING` ids and never changes `enabled` / `offersEnabled`.

Every surface declares the ids it needs as one exported constant (`*_REQUIRED` / `*Required`), and its
gate checks that constant through `surfaceReady`, so the review can't drift from the code.
`node scripts/parts/review.mjs` writes the sign-off pack from the content and those constants: totals,
then each surface from the most exposed (the unblend line, the angry card) to the least, with every line
it needs (id, text, plain twin, kind, lint scope, status, the other surfaces that share it), the
vocabulary the lines lean on (moves, hurts, `EXPRESSES` with its why, `CAN_TOUCH`), the `PartsPolicy`
numbers, and the lines no surface shows yet. `tests/parts-review.test.mjs` fails if a required id is
missing from the pack.

**The review page** (`dev/parts-review.html`) renders every surface and branch with the real components,
the fixture copy treated as signed off, an invented person and nothing saved. Its index is driven by the
pack's surface list, so it can't miss a surface. Build it with `npx vite build --config
dev/vite.harness.config.ts`; `node dev/review/check.mjs [shots dir]` opens every branch at 390×844 and
fails on a console or page error, a failed request, a branch it couldn't reach, or a screen without its
line. A static build is published as a private artifact for the reviewer. Surfaces and branches are
addressed by hash (`#s=<surface>…`, never a query string), so the page works inside the artifact frame.

**Accessibility (checked 17 Oct).** `npx vite build --config dev/vite.harness.config.ts && node
dev/review/a11y.mjs [--only <surface>] [--jobs <n>]` walks every review screen at 390×844: names,
a keyboard walk, focus after each step change (`src/components/parts/stepFocus.ts`: the new step's
heading takes focus, the app's convention), polite live lines, 44 px targets, reduced motion and holds,
Escape, and contrast in all six rooms (`tests/parts-a11y.test.mjs`). Saving sets `aria-disabled`; a
failed save is a polite status line. Every hold works by Space or Enter held, or a quick tap or switch
click that fills hands-free over the same time.

**Loading.** Parts code loads only where it is used: Today's parts cards, Me's Parts of me, the parts
settings, the tag row, Recover's angry card, DEAR MAN's cope ahead and debrief, Problem Solve's line,
Reflect's parts sections and the parts callables are each lazy, and Meet a part is the only lazily
loaded tool (`tests/parts-lazy-hosts.test.mjs`). About 4.6 KB gzip of parts code stays in the entry
chunk: the gate helpers, the unblend line, the OA goal line and the tag slot.

## Never

- Exile witnessing, do-over, retrieval or unburdening. Legacy or "unattached" burdens.
- Questions about the past, or a suggested origin story.
- Visible manager / firefighter / exile labels, archetype names or numbered parts.
- Creating a part automatically, or inferring a role.
- Naming a specific part in the moment.
- Parts on check-in results or routing cards.
- An AI speaking as a part, or as the person's Self.
- Collection mechanics, streaks, "parts discovered" counts or shareable cards.
- Parts language by default.

Each item is a describe block in `tests/parts-never.test.mjs`. Prompts are the app's voice (second
person, never *I* / *me* / *my*); a part's words exist only as `PartOption` chips the person picks. With
parts off every parts writer throws `partsOff()` and every reader returns empty and writes nothing
(`READERS_EMPTY`).

### Why never

Not every rule is equally firm. Rules 1, 2, 5 and 8 are hard lines. Rules 3, 4, 6 and 9 are firm
positions that a clinical reviewer could argue with. Rule 7 holds until there is a flood signal. Rule 10
is a judgment call to test.

1. **Exile witnessing, do-over, retrieval, unburdening.** The strongest case comes from DBT itself.
   - DBT is staged. Trauma processing waits for Stage 2, after stability criteria are met, and most of
     this app's users are Stage 1: still working on behavioural control.
   - The IFS method for exiles needs an observing position held steady, with a therapist who notices
     blending and steps in. An app can do neither reliably.
   - Backlash lands on DBT's own targets (self-harm, bingeing, rage, shutdown), often hours later, when
     nobody is watching. Twombly calls it "extensive" and "dangerous".
   - There are no data on unaccompanied unburdening.
   - The cost is real: this is not complete IFS. What survives is the part that is safe alone:
     unblending, compassion for protectors, polarities softening, updating. Only a clinician-in-the-loop
     mode could change this rule.
2. **Questions about the past, or a suggested origin.** Origin questions are the doorway to exiles.
   - Memory recalled under activation, with a leading question and an inviting frame, is unreliable
     (imagination inflation). The Castlewood lawsuits are what this looks like at scale.
   - The IFS Institute itself won't treat recovered memories as fact without corroboration (4 Nov 2025).
     An app can't corroborate, so it never elicits.
   - What stays: updating ("Show it something you can do now") looks forward, and the age chip asks for
     a felt sense ("How old does it seem?"), not a memory.
3. **Manager, firefighter and exile on screen.** They are interpretations, and DBT's *describe* skill
   leaves interpretations out.
   - The same behaviour is a manager one day and a firefighter the next.
   - The labels carry valence. They turn into identities and rankings ("I'm all firefighters").
   - "Exile" pulls straight toward rule 1.
   - This binds the app's copy only. A person may name a part "my firefighter". A glossary in *About
     this* is fine.
4. **Archetype names or numbered parts.** Naming is the therapeutic act. It is the affect-labelling
   thesis the whole app rests on.
   - Archetypes are Barnum-effect population guesses that pre-load content. "Inner Child" presupposes a
     wounded exile. "The Critic" sets up an enemy before anyone has befriended it.
   - Numbers dehumanise (MyPTSD users said so) and echo the labelling of alters in DID.
   - A tension remains: the descriptive suggestions ("the one who hides") still put words in the mouth.
     They stay because a blank field is hard for alexithymic users. A stricter version would cut them.
5. **Creating a part automatically, or inferring a role.**
   - Behaviour maps to parts many-to-many, and only the felt sense tells them apart.
   - Within-person variance is 2–4× between-person variance (Fisher, Medaglia & Jeronimus 2018).
   - 56.5% of students with a diagnosis felt their tracked data said something negative about them
     (Kelley et al. 2017).
   - The costs of a wrong guess are lopsided. A missed trail costs nothing; a wrong part costs trust and
     self-concept. So the system proposes and the person decides (Horvitz 1999; the profile's rule 4).
   - Roles are worse than parts: a part's intent is only knowable by asking it.
6. **Naming a specific part in the moment.** This is rule 5 at the worst time: a guess made while the
   person is blended, with no way to check it, where a wrong guess lands as invalidation.
   - The generic line ("A part of you wants to hit back right now") gets Kross's self-distancing benefit
     from the move the person just picked.
   - Naming a known part in the heat invites judgement toward it, which is blending with a concerned part
     the app can't catch.
   - Could relax to a person-initiated "Who's here?" once Phase 3 data shows how tags are used.
7. **Parts on check-in results or routing cards.**
   - The result screen has one job, plus the crisis banner.
   - The routing table is a reviewed clinical decision, made on a band the app no longer has.
   - On `rumination_loop` it would add inward focus to a loop of inward focus.
   - Frequency reifies: "meet the part behind this" on every result is *Inside Out*, not therapy.
   - Revisit for steady, opted-in users once there is a flood signal.
8. **An AI speaking as a part, or as the person's Self.**
   - Voicing a part writes the person's inner life for them. Confabulation becomes self-knowledge, and
     sycophancy plus suggestibility is the recovered-memory risk in new clothes. InnerPond saw persona
     loops.
   - Voicing Self replaces the capacity the method exists to build: a competitive cognitive artifact
     instead of a complementary one (Barr, after Krakauer).
   - Illinois and Nevada now restrict AI therapy.
   - Allowed: the app witnessing *to* the person ("Part of you was keeping things safe").
9. **Collections, streaks, "parts discovered" counts, shareable cards.**
   - Collections reward inventory: fragmentation by incentive. Words can be collected because
     granularity is the good; parts can't.
   - Streaks punish the normal lapse and produce exactly the shame these protectors manage. The goblin-lab
     spec already bans them.
   - Shareable cards turn parts into identity content, and parts data is more sensitive than mood data.
10. **Parts language by default.**
    - It reaches the people it harms most, and the app can't screen for them (Twombly's clients who
      didn't come back; Parry, Eve & Myers 2022; reality-testing concerns).
    - For alexithymic users, parts can replace feeling words instead of building on them.
    - This is the softest rule: default-off cuts reach. Two things would let it flip: a dissociation
      screen Claudia is comfortable with (the same kind of clinical decision as the removed probe), and
      co-design with dissociative and plural users.

---

## Open questions

1. ~~**The flood signal.**~~ Decided 16 Oct: the blending check, on top of stored signals.
2. **The clinical reviewer.** Someone trained in both DBT and IFS, with dissociation experience, should
   review before any copy is signed off. The angry-part spec cites an "Interpersonal-Wound PRD" that isn't
   in the repo. Where is it?
3. **The angry-part card before opt-in.** It is agreed as the default heads-up for *fire back*. Should it
   stay the default for everyone, or appear only when parts are on (with breathing as the default
   otherwise)?
4. **Tender parts.** Should a person be able to make one directly? I lean towards yes, with presence only:
   people will do it anyway, and a kind, limited home is safer than none.
5. **My people.** Trails tied to a person are the most useful kind. Does My people ship before Phase 4?
6. **Thresholds.** Rule A's 4 episodes / 14 days / 2 tools / 60% are a starting guess.
7. **Trademark.** Counsel to confirm the naming and the About line.
8. **Plural users.** Run co-design sessions with people with dissociative or plural experience before
   Phase 2, as Hellblade's team did with voice-hearers.

---

## Sources

**IFS mechanics and scope**
- Schwartz & Sweezy, *Internal Family Systems Therapy*, 2nd ed. (Guilford 2020): [contents](https://www.cms.guilford.com/books/Internal-Family-Systems-Therapy/Schwartz-Sweezy/9781462541461/contents)
- IFS Institute, Level 1 learning objectives (2024): [PDF](https://ifs-institute.com/sites/default/files/inline-files/Learning%20Objectives%20IFS%20Level%201%20Training%20with%204%20multi-day%20sessions%20and%202%20single-day%20sessions%206.10.24.pdf)
- Anderson, the 6 Fs (PESI): [post](https://pesi.com/blog/details/1511/6-step-ifs-process-to-jumpstart-healing)
- Klinger, IFS handouts (UNC): [PDF](https://cls.unc.edu/wp-content/uploads/sites/3019/2020/03/Handouts-for-IFS.pdf)
- Booth, protector fears (IFS Institute training): [PDF](https://ifs-institute.com/sites/default/files/inline-files/SATURDAY_Direct%20Access_Fran%20Booth%20(2).pdf)
- Earley, *Self-Therapy* (summaries): [Matuschak](https://notes.andymatuschak.org/zCAUiGe5aHakEY2F6YMdamU), [Buteau](https://www.antoinebuteau.com/self-therapy-book-summary/)
- Earley, *The Pattern System*: [PDF](https://s3.amazonaws.com/STJ/E14-PDF-The-Pattern-System.pdf); Earley & Weiss, seven inner critics: [PDF](https://static1.squarespace.com/static/5c03ced75ffd204418037b7a/t/5c3fe62b7ba7fc1e43005c7f/1547691563363/Seven+Types+of+Inner+Critics.pdf)
- Taeubert, polarization sequence (PESI): [outline](https://www.pesicanada.ca/item/ifs-polarization-172578)
- Twombly, trauma- and dissociation-informed IFS: [transcript](https://internalfamilysystems.pt/sites/default/files/2022/docs/media/Trauma%20and%20Dissociation%20Informed%20IFS%20with%20Joanne%20Twombly-transcript.pdf)
- Schwartz and Ocean Morgan on plurality: [The One Inside](https://theoneinside.substack.com/p/were-all-multiples-bridging-ifs-and-710)
- IFS Institute, response to New York Magazine (4 Nov 2025): [statement](https://ifs-institute.com/news-events/news/response-new-york-magazine-article)
- IFS Institute, Terms of Use (marks): [terms](https://ifs-institute.com/terms-use)

**Evidence and critique**
- Shadick et al. 2013, rheumatoid arthritis RCT: [J Rheumatol](https://www.jrheum.org/content/40/11/1831)
- Haddock et al. 2017, depression pilot RCT: [IFS-I](https://Ifs-institute.com/resources/research/efficacy-internal-family-systems-therapy-treatment-depression-among-female)
- Hodgdon et al. 2021, PTSD pilot: [IFS-I](https://ifs-institute.com/resources/research/internal-family-systems-ifs-therapy-posttraumatic-stress-disorder-ptsd-among)
- PARTS online group RCT (2026): [Foundation summary](https://foundationifs.org/about/news/268-another-foundation-funded-study-published-randomized-controlled-trial-on-the-effects-of-the-ifs-focused-program-for-alleviating-and-resolving-trauma-and-stress-parts)
- Francis, Fino & Heym 2026, DBT / MBT / IFS for BPD review: [NTU](https://irep.ntu.ac.uk/id/eprint/55128/)
- Brownstone, Hunsicker & Greene 2024: [Society for the Advancement of Psychotherapy](https://societyforpsychotherapy.org/internal-family-systems-exploring-its-problematic-popularity/)
- Lobbestael et al. 2010, Schema Mode Inventory: [PDF](https://www.maastrichtuniversity.nl/sites/default/files/ppp/70009612/SMI%20validation_Lobbestael%2Cvreeswijk%2Cspinhoven%2Cschouten%2Cartnz_BCP2010.pdf)
- Parts Companion (process measurement): [research](https://partscompanion.org/research)

**Design precedents**
- Barr, "Enhancing Self-Therapy with IFS and AI" (2023): [allbein.gs](https://allbein.gs/ifs/)
- Jeon et al., InnerPond (CHI 2026): [arXiv](https://arxiv.org/html/2603.27563)
- IFS Guide: [App Store](https://apps.apple.com/us/app/ifs-guide/id1559214994); All My Parts: [App Store](https://apps.apple.com/app/id6777243778)
- Fisher on borderline dynamics: [How We Can Heal](https://howwecanheal.buzzsprout.com/1889915/episodes/18827705-borderline-dynamics-through-a-trauma-dissociation-informed-lens-with-dr-janina-fisher)
- IFS on a CAT map: [ACAT](https://www.acat.org.uk/resources/reformulation-articles/integrating-ideas-from-internal-family-systems-therapy-into-cognitive-analytic-therapy)
- Parry, Eve & Myers 2022: [PDF](https://e-space.mmu.ac.uk/627948/10/Parry2021_Article_ExploringTheUtilityAndPersonal.pdf)

**Pattern detection and reflection**
- Fisher, Medaglia & Jeronimus 2018 (PNAS): [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6142277)
- Berger et al. 2026, schema-mode transitions: [Guilford](https://guilfordjournals.com/doi/10.1521/jscp.2026.45.2.133)
- Nahum-Shani et al. 2018, JITAI: [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5364076)
- Bringmann et al. 2019, centrality: [PDF](https://research-collection.ethz.ch/bitstream/20.500.11850/383309.1/1/Bringmannetal.2019JAP.pdf)
- Horvitz 1999, mixed-initiative principles: [PDF](https://erichorvitz.com/chi99horvitz.pdf)
- Kelley et al. 2017, self-tracking and mental wellness: [PDF](https://microsoft.com/en-us/research/wp-content/uploads/2017/02/Self-Tracking4MentalWellness-CHI2017.pdf)
- Kross et al. 2014 and Mischkowski, Kross & Bushman 2012 (self-distancing): cited in the angry-part spec

---

## Changelog entry (for the Obsidian Product Changelog)

```
## Parts (IFS) proposal: planned
Date: 6 Oct 2026 · Status: planned · Doc: docs/design/parts.md
What: Parts kept on the profile (Me → Parts of me, opt-in in Settings), found through "trails" the app
detects in existing logs and claimed by the person; a Meet a part tool (the six Fs, protector level only);
a den map with the person as the light; Two pulls (polarities) on Stage; per-part "what helps" from
tagged sessions.
Why: The app already asks parts questions without the word (the square's other part, pulls, urges,
barriers, "Part of me doesn't want this to change"). IFS gives those answers a relationship; DBT keeps
the skills and the ownership.
Thinking / rejected: Auto-naming parts and roles (reification, dissociation risk, within-person variance);
exile and memory work (flooding, backlash, recovered-memory risk); Self as a node; goblins as parts; AI
voicing parts; parts on check-in results; any rating scale, including the SCS-SF in-app.
Decided 16 Oct: the flood signal is the blending check ("can you notice it, or is it running
things?"), asked inside parts flows only, plus stored check-in signals on entry; Do the Opposite keeps
the urge when it fits the facts; Urge Surfing asks which pull it is.
Open: clinical reviewer (DBT + IFS + dissociation), angry card before opt-in, tender parts, My people
timing, trail thresholds, trademark counsel, plural co-design.
```
