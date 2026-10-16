# Parts

Status: proposal, 6 Oct 2026 (updated 16 Oct). Not agreed, not built. Nothing here is signed off.
Dev harness: `npm run dev`, then `http://localhost:5173/dev/parts.html` (Meet a part, the den, the part
card, a trail offer; draft copy in `dev/parts-fixture.ts`; `?view=`, `?move=`, `?palette=`).
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

## Blocker before Phase 2: there is no flood signal

Since the capacity probe came out (30 Sep), nothing records a band:

- `band.record` is called only from Find the feeling (`FindTheFeeling.tsx:78`), and FTF now saves
  `band: null`.
- So `BandGate` carries nothing.
- Every "not when flooded" rule in this doc therefore needs another source:
  - **Server-side gates** read what *is* stored on recent check-ins: `activationPatternId`
    (`emotional_flooding`, `dissociation_overmodulation`, `conservation_freeze`), `routingBand`,
    `safetyFlagId`, and the spiraling answer `hu_exp_flooding`.
  - **On entry to a parts flow, if a check-in in the last 2 h matched flooding or carried a crisis
    flag**, the flow opens on the P2 hand-off (sigh or orient, then reread). *Keep going anyway* stays
    available. That is the house's heads-up-plus-choice; the crisis banner sits alongside.
  - **The client entry gate is Claudia's decision, and it is open.** It must not be the removed probe or
    a reworded version of it (CLAUDE.md). Until it's decided, parts flows can only start from calm
    surfaces: Me, Today, Settings. They never start from a check-in result or the inside of a tool.

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
| The angry part (agreed, not built): Unblend → What it protects → Vote of confidence → Speak for it, not from it | The first parts flow, and the template for the rest. |
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
`vocabulary.py`'s `SIGNALS` table: a reviewed mapping, drafts until `SIGNED_OFF`.

`(:ProtectiveMove {id, label, unblendPhrase, kind: 'proactive' | 'reactive' | 'either', offerable, safetyLine, reviewStatus})`

- `label` is the chip text in the person's register.
- `unblendPhrase` is the second-person phrase that follows "A part of you…".
- Every module's existing ids map to a move with `(x)-[:EXPRESSES]->(:ProtectiveMove)`.

| Move | Label | `unblendPhrase` | Kind | Expressed by (existing ids) |
|---|---|---|---|---|
| `hit_back` | Hit back | wants to hit back | reactive | FTF `fight`; Recover `fight`; `anger-lash`, `anger-criticize`, `anger-destroy`, `envy-tear-down`; DEAR MAN `mr_got_loud`, `tp_escalated` |
| `chase` | Chase it, fix it now | wants to chase this down | reactive | FTF `chase`; Recover `chase`; `jealousy-check`, `jealousy-interrogate`, `jealousy-cling`, `love-stalk` |
| `hide` | Hide | wants to hide | either | FTF `hide`; Recover `hide`; `shame-hide`, `shame-secret`, `shame-avoid-people`, `sad-isolate`, `fear-cancel`, `fear-escape`, `anger-stonewall`, `disgust-leave`; DEAR MAN `mr_left`, `mr_went_quiet` |
| `go_blank` | Go blank | (none: never shown) | reactive | FTF `blank`; Recover `freeze`; `fear-freeze`; DEAR MAN `mr_froze`, `tp_no_words`, `bs_numb`; check-in `lu_mind_faraway` |
| `zone_out` | Zone out | (none: never shown) | reactive | `sad-scroll`, `sad-bed` |
| `keep_the_peace` | Keep the peace | wants to keep the peace | proactive | DEAR MAN `tp_gave_in`, `tp_apologized`, `mr_agreed`, `barrier_angry`; `guilt-apologize` |
| `turn_on_myself` | Turn on myself | is turning on you | proactive | DEAR MAN `thought_my_fault`, `thought_too_much`; `guilt-punish`, `envy-compare` |
| `take_less_room` | Take up less room | wants you to take up less room | proactive | DEAR MAN `barrier_no_right`, `barrier_guilty`, `thought_dont_deserve`; PS `person-no-right-to-speak`; `shame-shrink` |
| `keep_watch` | Keep watch | is keeping watch | proactive | check-in `hu_exp_vigilance`, `hu_exp_social`; DEAR MAN `thought_wrong`, `thought_will_leave` |
| `put_it_off` | Put it off | wants to put this off | proactive | `fear-avoid`, `sad-give-up`, `envy-give-up`; PS `cant-keep-putting-off`, `cant-afraid-aftermath`, `cant-ambivalent`; DEAR MAN `thought_not_worth` |

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
- **At most one offer a week, shared with `what_helps`** (the existing `OFFER_EVERY_DAYS` budget).
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
[Yes, a part of me]   [More than one]   [It's just what happens]   [Not me]
```

| Answer | What happens |
|---|---|
| **Yes** | *Meet a part*, with this trail as the trailhead |
| **More than one** | "Which of these feels like its own thing?" Each kept half becomes a `PartCandidate` (log). On a rule C trail this goes to *Two pulls* |
| **It's just what happens** | The trail stays a plain pattern in Reflect. It is respected as an answer |
| **Not me** | Declined for that rule + moves + context |
| **Not now** | Cooldown |

- No probability, confidence score or "the app thinks". 51% of people are uncomfortable being categorised
  (Pew 2019). Showing the receipts is the honest substitute.
- Rows are ids rendered as labels. No free text appears on an offer.
- **Its own callable.** `answerTrailOffer` takes the five answers and the evidence step.
  `answerPatternOffer` and `patternOfferItems` stay as they are.

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

---

## Meet a part

A new tool, `meet-a-part`, in module `mf` ("Notice it", which has no tool yet). It is the six Fs rebuilt
from the house's own mechanics: one decision per screen, chips first, "add your own" as the escape
hatch, no free text required, no scale anywhere.

**Entries.** All require parts on, except the angry-part card's own link:

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

| # | Step | Screen | Copy (draft) | Options |
|---|---|---|---|---|
| 1 | Find | What's here | "What's showing up?" | Chips from the trailhead (e.g. "The pull to hide"), parts they know, "Something else" |
| 2 | Focus | Where | "Where do you notice it?" | The heat figure, one mark. "Nowhere I can find" is a complete answer |
| 3 | Flesh out | Shape | "Which is closer to it?" | Shape it's five forced choices, no regulate step. The result is the part's figure. Tune it is the alternative |
| 3b | Flesh out | Age | "How old does it seem?" | school age · teenage · about your age · older · can't tell · **little** → "It sounds young. Want to keep it gentle?" Yes moves to the tender path |
| 3c | Flesh out | Voice | "Does it say anything?" | Chips from the move (`hide`: "Don't let them see", "Get out before they leave", "It's safer alone"), "In my words", "Nothing" |
| 4 | Feel toward | Gate | "How do you feel toward it right now?" | **Self-like:** curious · steady · warm toward it · open → 5. **Not Self-like:** annoyed · scared of it · want it gone · ashamed of it · tired of it → 4b. **not sure** → 5. **nothing** → grounding (below) |
| 4b | Unblend | Room | "That reaction is a part too. Can it give you some room, for now?" | It eased off · It's still here · Not sure |
| 5 | Befriend | Job | "What's it trying to do for you?" | Chips from `PartJob` for the move (`hide`: "Keep me out of sight", "Keep me from being pushed out", "Keep me from making it worse"), "In my words" |
| 5b | Befriend | The job | "Does it like this job?" | It's tired · It's proud of it · Not sure |
| 6 | Fears | Fear | "What's it afraid would happen if it stopped?" | `PartFear` chips; some flagged `tender` or `danger`. "In my words" always takes the conservative branch |
| 7 | Update | Now | "Does it know how old you are now?" | Yes · It doesn't seem to · Not sure. If not: "Show it something you can do now." Chips: I can leave a room · I can ask for help · I have people now · I can say no · In my words |
| 8 | Appreciate | Thanks | "Thank it for trying to protect you." | Press and hold. **The one earned moment:** the lamp's light reaches its figure |
| 8b | Befriend | Would rather | "If it didn't have to do this, what would it rather do?" | `PreferredRole` chips (`hit_back`: "Tell me when something matters", "Help me stand up for myself, steady and out loud"), "Not sure yet" |
| 9 | Keep | Name | "Want to give it a name?" | Text, up to 40 characters. Suggestions describe, never archetypes or numbers: "the one who hides". "Not yet" |
| 9b | Keep | Profile | "Keep it in Parts of me?" | Yes, keep it · Not now. **This is rule 4's yes** |
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
  close.
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
  - Nothing offers to go further, now or later.
  - Own words are never parsed. Unread text is treated as the riskier case, not the safer one.
- **`danger` fear, or a move with `safetyLine`.** This covers fears such as "it would hurt me" or "I'd do
  something I can't take back", and own words at 3c or 5 on a `safetyLine` move.
  - Crisis resources render alongside, through the check-in's seam.
  - The flow goes straight to Thank it and close.
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
  - `steppedBack`, `stopReason`, `exitStep`
  - own-words text, as written and never linted or interpreted
- **The close lives on the ToolSession, not duplicated.** The close kind is `orienting`, and
  `meet-a-part` is **excluded from `what_helps` rules and from Insights' "went well"**. "More here" after
  meeting a part is not the same claim as "it calmed me".
- **Profile writes happen only at 9b**, through `keepPart`, the sole writer of `Part`. They cover the
  figure, places, jobs, fears, preferred roles and name. The person's own-words job and fear are copied
  into the Part only there, on that yes.

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
           Shows up when someone pulls away, mostly evenings
           Where: chest, throat
           Its job, in your words: keep me from being pushed out
           Afraid that: I'd be too much and they'd leave
           Would rather: let me know when I need someone

           What's helped it settle
           Pause helped 3 of the 4 times            ← shown only with ≥3 tagged closes

           How you've felt toward it
           In August: tired of it. Lately: curious.  ← comparison, never a number or chart

           [Spend time with it]   Rename   Rest it
```

- **"How you've felt toward it"** is the integration readout. It aggregates the part's `feelTowardIds`
  from `PartSession`s, in the app's then-and-now grammar. It needs at least 3 answers in each half.
- **"What's helped"** counts tagged closes for this part. Counts are fine; there are no scores and no
  part numbers.
- **The hue is computed when the card is read** (the home quadrant of the most-tagged words). It is never
  stored on the part.

### Still true? = checking back with protectors

The profile's revisit mechanic becomes the IFS check-back.

- Kind `part`, revisited after 30 days.
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

### Deleting

**Delete my parts** (Privacy & Data) removes, in one confirmed step:

- the `Part`, `PartLink`, `DenSnapshot`, `PartCandidate` and `PartTag` records;
- any `TrailOffer` that points at them;
- any open `part_checkback` follow-up.

It **asks separately** about kept *Two pulls* lines in My words that contain part names: "Also remove 2
kept lines that name your parts?"

`PartSession` own-words are log records and follow retention. Delete my parts removes them too.

---

## The den

The map, at Me → Parts of me → *See them together*.

- **The room.** Seen from above, in the room's wall colour, with a warm pool of lamp light in the middle.
  - **The light is you.** It is not labelled "Self". It is not a node and it can't be tapped.
  - One line under the room: *"Everyone here is in your house."*
- **Parts are small, faceless figures.** The brand rule is no face and no teeth.
  - The figure is the Stage capsule, wearing the part's Shape signature (the same render as the FTF shelf
    object).
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
- **Fallbacks.** A 2D SVG for reduced motion or failed WebGL, and a plain list one tap away.

**Rejected:**

- A radial map with Self at the hub: it makes Self one more part.
- Lotus leaves: someone else's metaphor, and it reads as a calm app.
- Goblins as parts: this breaks the brand's "implied, never depicted" rule and invites cute.
- Archetype art.
- Collection mechanics of any kind.

---

## Two pulls (polarities)

The dialectics flow, built on Stage. It starts from a rule C trail, from "More than one", or from the
den. **It has the same gates as Meet a part:** parts on, the flooding / crisis and dissociation checks,
`TooMuchLink` on every screen, and the tender and danger branches for any chip or own words.

1. **Set them out.** Two figures face each other. The person places *themselves*, a soft light, wherever
   feels right.
2. **Feel toward, both.** "How do you feel toward each of them?" uses the step-4 chips, once per side.
   - A non-Self answer to either side gets one 4b.
   - If it is still non-Self, the flow ends: *"One of them needs its own time first."* It then offers to
     meet that part another time.
3. **Step back.** Each held breath lifts the camera. This is Stage's visual self-distancing (Kross &
   Ayduk), and the meta-position InnerPond had to build a pond for.
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

---

## In every module

All of the parts behaviour below requires parts to be on. The one exception is the angry-part card,
which is agreed and which the person chooses.

| Module | In the moment | After | Over weeks |
|---|---|---|---|
| **Check-in** | Nothing new. The check-in never asks for an urge, so the app has nothing of the person's own to unblend from. **Keep the per-spot words** (data fix 1): two spots mean two parts present | Tag row after a better close of a tool started from the result | Episodes |
| **Find the feeling** | After the pull step: "A part of you {unblendPhrase} right now." | Tag row | "Use this shape for {name}?" when they tag a part |
| **Do the Opposite** | After the urge: the unblend line | On the goal screen, one optional line: *"Part of you wants to {move}. It's worried about {hurt}. You want {goal}."* | Practiced steps per part |
| **Ask for what you need (DEAR MAN)** | The angry-part card for *fire back* (agreed) | Debrief: "Who showed up?" from `MomentResponse` / `ThoughtPattern` | **Cope ahead per part.** Prep asks "Who might show up in this conversation?" A chosen part brings its `anchorLineId`: *"If {name} shows up: {anchor}."* The person sets the anchor there, from kept lines or their own words |
| **Recover** | After the pull: the unblend line | Tag row | Recover's next-day check also asks about a tagged part |
| **Problem Solve** | — | `cant-ambivalent` queues a candidate (on yes). **Save barrier and ambivalence ids** (data fix 2) | Rule A source for `put_it_off` |
| **Circuit Breaker, Pause, 5-4-3-2-1, Urge Surfing** | Body first. Nothing added | Tag row only after a better close | "Pause helped 3 of the 4 times" on the card. Urge Surfing asks *which* urge (data fix 4) |
| **Help now, micro-steps** | Nothing | Nothing | Nothing |
| **Witness** | Unchanged in the moment. **No part names in the moment** | A `part` kind for after and over-weeks moments (check-backs, the card), with a `{name}` slot | — |
| **Today** | Collapses with flooding signals (as now) | `part_checkback`: "How's {name} today?" Settled · Same · Louder · Skip | One trail offer a week at most; protector check-backs |
| **Reflect** | — | — | Per-part view: where, when, what helped. Rule B sequences as plain patterns. Rule D batch "Was this {name}?" |
| **Wise Mind** (planned) | — | — | The parts-aware step back. `wiseMindAnswer` stays ask-fresh |

**Louder after a meeting.**

- If the check-back answer is *Louder*, the app offers the body tools and says *"Things can get louder
  after time with a part."* It makes no prediction and no promise.
- It doesn't offer more of that part for 72 h.
- This counts as a harm signal (below).

---

## Safety

| Risk | What the design does |
|---|---|
| **No band** | Server-side gates on stored flooding / crisis / dissociation signals. Calm-surface entries only until the client gate is decided (the blocker above) |
| **Flooding** | P2 first after flooding signals; `TooMuchLink` everywhere; the tender stop; a second non-Self answer ends the session |
| **Backlash** | Next-day `part_checkback`. *Louder* → body tools, a 72 h pause on that part, and a review signal |
| **Exile contact and memories** | Protector level only. No question about the past. The tender path is presence only. Own words take the conservative branch |
| **Dissociation and plural experience** | Off by default, switched on in Settings with the dissociation lines. Shutdown moves are never offered or paired. Dissociation history blocks offers and adds a heads-up on entry. No "everyone has parts" script |
| **Self-harm** | `safetyLine` moves, `danger` fears and own words on those moves show crisis resources alongside, through one seam. No update or would-rather steps alone |
| **Suicidal-ideation echo** | No "disappear" from the app's side; `unblendPhrase` is reviewed per move |
| **Reification, self-diagnosis** | Trails, not parts. No roles, no archetypes, no part numbers. Three or more parts made in 7 days → one line: *"You don't need to get to know everyone at once."* |
| **Accountability** | "A part of you wanted to ___, and you ___". The `no_part_blame` lint |
| **Rumination** | One offer a week, no streaks, reflection pulled by the person. Nothing on check-in results |
| **Privacy** | No part names or moves in notifications. Delete my parts is separate from deleting the account |
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
  trailhead live in code and content only. Add a rule to `voice-rules.json`, using the file's format:

  ```json
  {
    "id": "no_role_labels",
    "pattern": "\\b(exiles?|firefighters?|unburden\\w*|legacy burdens?|self-energy|trailheads?)\\b",
    "flags": "i",
    "severity": { "parts_prompt": "error", "parts_chip": "error", "validation": "error", "user_copy": "warn" },
    "message": "Parts are known by what they do, in the person's words; the model's role words stay internal."
  },
  {
    "id": "no_role_manager",
    "pattern": "\\bmanagers?\\b",
    "flags": "i",
    "severity": { "parts_prompt": "error", "parts_chip": "error" },
    "message": "\"Manager\" is a role label in parts copy (and a boss everywhere else)."
  },
  {
    "id": "no_part_blame",
    "pattern": "\\bpart( of you)? (made|forced) you\\b",
    "flags": "i",
    "severity": { "parts_prompt": "error", "parts_chip": "error", "validation": "error" },
    "message": "A part wanted something; the person acted. Never the part did it."
  }
  ```

  Plain "burden" is allowed. DEAR MAN's anchor "Asking isn't a burden. Guessing is." stays, and "I'd be a
  burden" is a real protector-fear chip.
- **Two lint scopes.**
  - `parts_prompt` is the app's questions. It takes every validation rule, `voice_distance` included.
  - `parts_chip` is the chips the person picks, in their own voice ("I can say no"). It takes everything
    except `voice_distance`.
- **Slots.** The structural `slots` rule allows only `{N} {word} {phrase} {need}`. This adds `{name}`,
  `{move}` (renders `unblendPhrase`), `{hurt}`, `{goal}`, `{context}`, `{A}`, `{B}`, `{anchor}`, each with
  a fixed 8-character length count.
- **Names belong to the person.** Suggestions describe ("the one who hides"). Never "the Critic", "Inner
  Child", a number or an archetype. People on MyPTSD called numbered parts "dehumanizing".
- **"Part" itself.** Plural young people found "parts" invalidating for alters (Parry, Eve & Myers 2022).
  That is one more reason the feature is opt-in and the dissociation lines exist.

---

## Data model

These follow the Data layers rules in CLAUDE.md.

### Graph content: `schema/parts.cypher`, built from `scripts/parts/content.py`

| Node / edge | Purpose |
|---|---|
| `ProtectiveMove {id, label, unblendPhrase, kind, offerable, safetyLine, reviewStatus}` | The shared vocabulary |
| `(:ActionUrge \| :MomentResponse \| :ThoughtPattern \| :TurningPoint \| :DearManBarrier \| :BarrierSubResponse \| :QuestionResponse)-[:EXPRESSES]->(:ProtectiveMove)` | Every module's ids, mapped; drafts until `SIGNED_OFF` |
| `PullOption {id, flow}`: `ftf:fight`, `ftf:chase`, `ftf:hide`, `ftf:blank`, `recover:fight`, `recover:chase`, `recover:hide`, `recover:freeze`; each `-[:EXPRESSES]->` a move | FTF and Recover pulls live in their flow JSON, not as nodes |
| `(:BodySignal)-[:AT_PLACE]->(:BodyRegion)` | DEAR MAN body signals → the body map's 15 places |
| `ProtectedHurt {id, label}`; `(:ProtectiveMove)-[:OFTEN_GUARDS]->`; `(:ProtectedHurt)-[:SAME_AS]->(:UnmetNeed \| :InvalidationEvent)` | "What's it protecting?" hypotheses. `SAME_AS` is an addition to the agreed angry-part spec |
| `PartPrompt {id, step, copy}`; `PartOption {id, step, label, moveIds[], flag: 'tender' \| 'danger' \| null, selfLike: true \| false \| null}` | Every screen's copy and chips |
| `PolarityPair {id, a, b, bothWant[], worryA[], worryB[]}` | Two pulls content; offerable moves only (a build check) |
| `TrailRule {id, shape: 'A' \| 'B' \| 'C' \| 'D', minEpisodes, minSpanDays, minTools, contextShare, lift, windowDays, cooldownDays, enabled}` | Its own label, off until reviewed |
| `PartsPolicy {id:'parts', offersEnabled}` | The offers kill switch |
| `TherapyConcept {id:'parts_meet', appToolId:'meet-a-part'}`, **no `RECOMMENDED_FOR` rows** | Gives the tool a concept without making it routable |

**Fix while here:**

- `(:TherapyModality {id:'ifs'})-[:TREATS]->(:ClinicalConstruct {id:'bpd'})` claims more than the
  evidence. A 2026 systematic review found no IFS studies in BPD. Drop it, or add
  `evidenceGrade: 'Preliminary'` to every IFS `TREATS` edge and to the modality.
- `ifs_self → dbt_wise_mind` and `ifs_self → pv_ventral_vagal` are typed `functional_equivalent`. They are
  parallels: Wise Mind is reached by practice, while IFS's Self is posited as innate. Retype both to
  `parallel`.

### User data

| Label | Layer | Fields / edges | Notes |
|---|---|---|---|
| `Part` | Profile | `kind:'part'`, `area:'my_parts'`, `name`, `status` (active / resting / set_aside), `source` (made / offer / candidate), `tender`, `shapeSig[5]`, `soundSig[4]?`, `places[]`, `ageId`, `voiceIds[]`, `ownVoice?`, `jobIds[]`, `ownJob?`, `fearIds[]`, `ownFear?`, `preferredRoleIds[]`, `jobHistoryJson`, `anchorLineId?`, `mapX`, `mapY`, `confirmedAt`, `revisitAt`, `lastVisitedAt`. Profile edges `-[:USES {confirmedAt, source}]->(:ProtectiveMove)`, `-[:GUARDS]->(:ProtectedHurt)`, `-[:ACCEPTED_FROM]->(:TrailOffer \| :PartCandidate)` | **`keepPart` is the only writer.** Add a grep test like the `MyPattern` one |
| `PartLink` | Profile | `kind: 'two_pulls' \| 'covers_for'`, `aId`, `bId`, `bothWantId?` | Written only on a yes in the den or in Two pulls |
| `DenSnapshot` | Profile | `takenAt`, `layoutJson` | — |
| `PartSession` | Log | As in *What's saved* | `ToolSession -DETAIL->` |
| `PartTag` | Log | `at`, `source` (close / debrief / batch), `-[:TAGS]->(:CheckIn \| :ToolSession)`, `-[:OF_PART]->(:Part)` | An incoming edge only, so finalise-once holds |
| `PartCandidate` | Log | `origin` (new_one / worried_part / split / ps_ambivalence / angry_card), `moveIds[]`, `createdAt`, `status` | Written only on a yes. Read in Me the way `PatternOffer` is |
| `TrailOffer` | Log | `ruleId`, `moveIds`, `contextKey`, `evidenceKeys`, `status`, `offeredAt`, `cooldownUntil` | `id = ruleId:moves:context`. Shares the weekly budget with `PatternOffer` |

**Registration and tests.**

- Register every label in `userdata/layers.ts` with its `exportAs`. Add the `<label>_key` constraints.
  Add `feelTowardIds` to `ASK_FRESH_FIELDS`.
- `PROFILE_NEEDS` and the tests that pin it (`tests/profile-layer.test.mjs`):
  - Add slice `parts` to `SLICE_IDS`. It returns active and resting parts' id, name and moves only.
  - Add slice `partDetail` (jobs, fears, voice, preferred roles, anchor), declared only for `meet-a-part`
    and Me.
  - Declare:
    - `'meet-a-part': ['name','parts','partDetail']`
    - `'today': ['quietHours','parts']`
    - `'dear-man': ['parts']`
    - `'opposite-action': ['parts']`
    - `'find-the-feeling': ['name','parts']`
    - `'recovering-from-invalidation': ['name','parts']`
    - `'witness': ['name','ownLines','savedLines','parts']`
  - The tag row reads through its host tool's needs, so there is no `'spine-close'` consumer.
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
- **Callables in `functions/src/parts/`:**
  - `startPartSession` / `savePartSession`
  - `keepPart`
  - `tagPart`
  - `answerTrailOffer`
  - `answerPartCandidate`
  - `updatePartLayout`, `restPart`, `setPartTender`, `linkParts`
  - `deleteMyParts`
  - Content ships as a generated `src/data/content/parts.json`, like the other content files.
- **Trail evaluation.** It joins the Today prepare step as a second rule family. `readRules` filters by
  kind, and the family imports nothing from `profile/items.ts`.

### Data fixes this needs first (no UI)

1. Keep the check-in's per-spot words: `spots: [{wordIds[], x, y}]` on `CheckIn`.
2. Problem Solve saves `barrierTypeId`, `barrierSubId`, `ambivalenceId` and `confidence` in `ext.er` (ids
   only).
3. Do the Opposite saves a minimal record when the urge was judged helpful. That is a protector doing its
   job well.
4. Urge Surfing asks which urge (FTF's four pulls as chips), filling `ToolSession.urgeIds`.
5. Clients send `ToolSession.emotionIds`. It is validated today but always `[]`.
6. Content: `BodySignal-[:AT_PLACE]->BodyRegion`.

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
| **5. The den + Two pulls** | The map, snapshots, links, the Stage polarity flow, the keepsake | Needs Stage (Recover v2) built |
| **6. Wise Mind** | The parts-aware step back | Shares Wise Mind's planned rows |

Each phase is gated on the previous phase's harm signals.

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

1. **The flood signal.** What replaces the band at the entry to parts flows, given that the probe and its
   rewordings are out?
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
Blocker: no flood signal since the capacity probe came out; parts flows need a decided entry gate.
Open: clinical reviewer (DBT + IFS + dissociation), angry card before opt-in, tender parts, My people
timing, trail thresholds, trademark counsel, plural co-design.
```
