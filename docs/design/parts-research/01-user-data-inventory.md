# Goblin DBT: inventory of per-user data, for detecting IFS parts

No files were modified. Paths are relative to `/home/claude/goblin-dbt`. `file:line` citations are exact unless marked ≈.

---

## 0. Rules that limit any parts feature (read first)

- **Layer registry** is `functions/src/userdata/layers.ts:42-62`:
  - **Log** (`:X:UserData:LogRecord`): CheckIn, BodySensation, ToolUsage, OppositeActionSession, InvalidationRecoverySession, DearManSession, FindTheFeelingSession, ToolSession, SkillPractice, FollowUp, PatternOffer.
  - **Profile** (`:X:UserData:ProfileItem`): ProfileFact, MyPattern, OwnLine.
  - **System**: PushToken.
  - **Profile edges**: `SAVED_LINE` only (`:69`).
  - **Log-aggregate edges**: `FOUND_WORD` (`:72`).
- **Ask-fresh fields** (`layers.ts:79-82`): `band*`, `thenVsNow`, `thenVsNowDir`, `actedOnUrge`, `urgeIds`, `fitsFacts`, `wiseMindAnswer`, `readiness`, `eventIds`.
  - They may only sit on log records. They are never put on a ProfileItem or in a profile slice, and never pre-filled.
  - Most urge and fits-the-facts signals fall under this. A "part" built from urges therefore has to be a new ProfileItem reached through an offer the user says yes to. The raw field can't be copied across.
- **Rule 4:** nothing moves from log to profile without the user's yes.
  - `profile/items.ts` header: scheduled code may not import it, and a grep test enforces that.
  - `answerPatternOffer` is "the only writer of MyPattern" (`patternOffers.ts:166-169`).
- **Log records are frozen after they finish** (`lifecycle.ts:26-58`). The CheckIn guard is `:29-33` (writable for 2 h, or until a next action is set).
- **Retention deletes log records only** (`userdata/exportDelete.ts:91-107`), when the user sets `dataRetentionDays`. Pattern history can therefore disappear; profile items survive.
- **`ToolSession.ext` cannot hold free text or numeric scales** (`spine/extSchemas.ts:80-86`). It allows ids, enums and booleans; integers only on `*Sec` / `*Count` keys; at most 4 KB.
- **Graph content never points at user data.** User data points at graph content.
- **Several user-data → content links are id arrays, not edges.** CheckIn emotionIds, BodySensation region / sensationIds, DearManSession ids, MyPattern toolId / patternId. Traversing to them needs `WHERE x.id IN …`.

---

## 1. Check-in (`CheckIn` + child `BodySensation`): Log

**Files.** Validation is `functions/src/checkin/validation.ts`. Handlers are in `functions/src/checkin/index.ts`: `saveCheckIn` at `:34`, `setCheckInNextAction` at `:136`, `getCheckInsByUser` at `≈:164`. The client is `src/pages/CheckIn.tsx`; the payload builder is `src/lib/spine/checkInPayload.ts`.

### 1.1 CheckIn fields

Input is defined at `validation.ts:49-76` and validated at `:162-204`. The SET is at `index.ts:56-77`.

| Field | Type / allowed values | Meaning |
|---|---|---|
| `id`, `key`, `ownerId`, `createdAt`, `schemaVersion` = 2 | — | Standard user-data fields |
| `timestamp` | datetime | Client start time if within 12 h back to 5 min ahead (`:86-93`), else server time. Sent as UTC ISO (`toISOString`). Local time of day needs `User.timeZone` (a settings field). |
| `emotion` | string ≤500 | Display words joined with `", "`, or the quadrant when no word was picked (`checkInPayload.ts:95`) |
| `emotionIds` | string[] ≤20 | Graph Emotion ids, filtered to existing nodes (`index.ts:233-238`). **No edge to Emotion.** |
| `quadrant` | `high-unpleasant` / `low-unpleasant` / `high-pleasant` / `low-pleasant` (`:14`) | The only required field. Inferred from the words (unpleasant wins ties, `CheckIn.tsx` `inferQuadrant`). |
| `intensityX`, `intensityY` | 0–1, default 0.5 | Point on the feeling square: x = pleasantness, y = energy (`src/lib/feelingSquare.ts:4-18`). Only the lead spot's point is saved. |
| `note` | string ≤2000 | **Always `''` in today's UI.** The one exception is the DEAR MAN debrief check-in, which sets `'From DEAR MAN debrief'` (`DearMan.tsx:332`). |
| `source` | `grid` / `ftf` / `body` / `dear_man_debrief` (`:12`) | Entry path |
| `activationPatternId`, `confidence` | graph id; 0–1 | Routing result. `positive_state` for pleasant check-ins. Also an edge `MATCHED_PATTERN` → ActivationPattern (`index.ts:83`). |
| `secondaryPatternId`, `coOccurrenceLabel` | id; string ≤200 | Co-occurring pattern. No edge. |
| `discQuestionIds`, `discResponseIds` | parallel arrays ≤10 | Discriminating answers. **No edge** to QuestionResponse. |
| `recommendedToolIds` (≤2), `routingVersion`, `routingBand`, `routingBandSource` (`probe` / `ftf` / `carried` / `inferred`) | — | What the result showed |
| `guidedActivityId`, `safetyFlagId` | ids | Low-energy activity offered; crisis banner shown |
| `band`, `bandSource`, `bandViaCantTell`, `bandAt`, `bandJson` | `steady` / `stirred` / `flooded` | Ask-fresh. Only a carried reading (≤20 min) or FTF's; the probe question was removed 30 Sep. |
| `resultShownAt` | datetime | When the result rendered |
| `nextActionKind` (`tool` / `micro_step` / `activity` / `activity_partial` / `done`), `nextActionToolId`, `nextActionAt` | — | What the user did next. Setting it finalises the check-in. |
| `embeddedToolSessionIds` (≤3) | uuids | Plus `EMBEDDED` → ToolSession (`:96`) |

**Edges into the CheckIn:** `ToolSession -FROM_CHECKIN->` (`:102`), `ToolUsage -FOLLOWED_CHECKIN->` (`:106`), and `User -LOGGED->`.

### 1.2 BodySensation (child of CheckIn): Log

Built from `validation.ts:34-44` and `:136-156`; created at `index.ts:89-93`. On every re-save the old sensations are DETACH-deleted and recreated.

| Field | Meaning |
|---|---|
| `region` | Place id, one of 15: `head`, `face`, `jaw`, `throat`, `neck`, `shoulders`, `chest`, `upper_back`, `stomach`, `lower_back`, `arms`, `hands`, `legs`, `feet`, `body`. Old names are mapped by `LEGACY_REGIONS` (`:124-134`). |
| `side` | `both` / `left` / `right` / null |
| `sensationIds` (≤20) | SensationType ids, 40 of them (from `src/data/content/body-map.json`): tension "Tight", pressure, raised_up, clenched, racing_heart, pounding, heat, burning, constriction "Closing up", shaking, restlessness, knotted, churning, buzzing, heaviness, numbness_sensation, drained, weakness, cold_sensation, hollow, sinking, foggy, lump, slumped, achy, butterflies, tingly, lightness, warmth, expansion, fizzy, bouncy, smiling, energised, settled, loose, soft, groundedness, easy_breathing, rested |
| `tags` | Display labels of those words |
| `strength` | 0–1 or null, from the optional strength bar |
| `fromMirror` | true when the user kept a typical place offered by the body mirror |
| `x`, `y` | 0–1 position on the figure |
| `intensityX`, `intensityY` | Legacy values, default 0.5 |

**There are no edges to BodyRegion or SensationType nodes.**

### 1.3 What the check-in UI asks

- **Square:** "How is it in there?" / "And the other part?" (`CheckInSquare.tsx:105`). Up to 3 spots (`MAX_SPOTS`, `feelingSquare.ts:152`) for mixed feelings, via "+ Add another spot".
- **Words:** "Continue with …" / "Continue without a word", "None of these fit" (opens FTF), "Add another spot on the square" (`WordPick.tsx:128-150`).
- **Other entries:** "I can't tell" (FTF), "Start with my body", "Help me now" (`EmotionGrid.tsx:309`).
- **Discriminating questions** (`src/data/content/discriminating-questions.json`):
  - High-unpleasant, "What's happening feels like...":
    - `hu_exp_alarm` "My alarm went off"
    - `hu_exp_vigilance` "A worry that won't turn off"
    - `hu_exp_social` "About what others think of me"
    - `hu_exp_flooding` "I'm spiraling and can't stop it"
    - `hu_exp_unsure`
  - High-unpleasant, "In my body right now...": racing, tense / scanning, overwhelmed (shaking / crying), shame ("Heat in face or chest, want to hide"), unclear.
  - Low-unpleasant, "Right now, my mind feels...": `lu_mind_looping` "Stuck on replay", blank, faraway "Far away or unreal", unsure.
  - Low-unpleasant, "My body feels...": heavy, flat, numb, unclear.
- **Body step** (`BodyStep.tsx`):
  - "Where do you feel it?" / "Let's start with your body" (`:224`).
  - "Touch and drag to a place, then lift." (`:227`)
  - "My {place} feels…" (`:373`)
  - "How strong in your {place}" (`:250`)
  - Mirror: "Many people notice {words} in places like these." (`BodyMirror.tsx:137`)

### 1.4 Free text

None. `note` is never collected.

### 1.5 Lost data

- The **per-spot structure of a mixed feeling** (which words sat in which spot, and the other spots' points) is discarded.
- All words go into one list, and only the lead spot's x/y is saved (`CheckIn.tsx` `handleWordsContinue`).

### 1.6 Parts signal

This is the richest source.

- Recurring word sets, body place plus sensation word plus strength, time of day / weekday, and energy × pleasantness are all available.
- Discriminating answers act like role signatures:
  - "worry that won't turn off" / vigilance → manager-like.
  - "spiraling" / flooding, or "far away / numb" / dissociative → firefighter-like.
  - "Heat in face, want to hide" → shame (exile or hiding protector).
- `nextActionKind` = done versus opening a tool shows avoidance or engagement.
- Mixed spots would be the best "two parts at once" signal, but they aren't stored.

---

## 2. Witness beat: `SHOWED_LINE` edges, plus OwnLine / SAVED_LINE in the profile

**Files.** Validation `functions/src/witness/validation.ts:53-88`; types `witness/types.ts`; handler `recordWitnessBeat` at `witness/index.ts:134`. The UI is `src/components/witness/WitnessBeat.tsx`, used only by the check-in result (`StateResult`, `LowEnergyStateResult`). The log call is in `CheckIn.tsx` `logBeat`.

### 2.1 Request

| Field | Allowed values |
|---|---|
| `hostKind` | `checkin` / `tool_session` |
| `hostId` | uuid |
| `moment` | `checkin_result`, `recover_validate`, `oa_start`, `ps_define`, `dearman_describe`, `debrief_turning_point`, `missed_followup`, `urge_louder`, `crisis` (`types.ts:14-17`) |
| `band` | band enum |
| `shown` | ≤3 of `{lineId, landed: yes / sort_of / no / null}` (`LANDED`, `:21`) |
| `skipped`, `noneFit` | bool |
| `ownLineShownId` | uuid |
| `keepLineId` | must be one of the lines shown |
| `ownLine` | `{id, text 1–140 chars (cleanOwnLineText :45), emotionIds ≤5, situationId?}` |

### 2.2 Writes

- **Log:** `(CheckIn|ToolSession)-[:SHOWED_LINE {at, moment, level, band, landed, skipped, noneFit}]->(ValidationLine)` (`index.ts:155-164`), written only while the host is still writable.
- **Profile:** `OwnLine` (`:180-196`) with `{kind:'own_line', area:'my_words', status, source:'witness', text, emotionIds, situationId, moment, uses, lastUsedAt, lastHostKey, confirmedAt}`. Use counts are bumped at `:169-177`.
- **Profile edge:** `User-[:SAVED_LINE {confirmedAt, source:'witness_keep', lastAt}]->ValidationLine` (`:198-208`).

### 2.3 UI copy and free text

- Copy: "Did that land?" Yes / Sort of / No; "Close" / "Not that" for tentative level-3 guesses; "Keep this line"; "None of these fit"; "Say it my way"; "In your own words"; "Skip"; postpone line "That's okay. It doesn't need the right words right now." (`WitnessBeat.tsx:36`, `:145-178`).
- **Free text:** `OwnLine.text`, stored verbatim and never linted.

### 2.4 Parts signal

- Self-voiced validation the user writes or keeps (Self-energy, or which part needs witnessing).
- Lines marked "no" or "None of these fit" could flag a protector rejecting validation.
- Corpus line kinds include `self`, `function` and `UNDERNEATH` level-3 guesses (`underneathEmotionId`), which look like an exile beneath a protector.
- Existing parts language in content:
  - DEAR MAN `tp_gave_in`: "Part of you was keeping things safe." (`scripts/witness/content.py:195`)
  - OA `oa_{family}_function` lines on what each emotion is protecting, e.g. "Shame wants you to hide so you don't get pushed out." (`:158-170`, draft)

---

## 3. Find the feeling (`FindTheFeelingSession`): Log

**Files.** Validation `functions/src/findTheFeelingValidation.ts:10-30` and `:75-109`; gates `:115-124`. Save at `findTheFeeling/index.ts:88`, CREATE at `:114-119`. Content in `scripts/find-the-feeling/content.py`.

### 3.1 Fields

| Field | Allowed values / meaning |
|---|---|
| `entry` | `tool` / `checkin` / `recover` |
| `way` | `shape` / `tune` |
| `switchedWay` | bool |
| `shape` | 5 numbers, −1..1: `[sharp, heat, weight, buzz, clench]` (`src/lib/findTheFeeling.ts:10`). Rounds are "sharp/soft, hot/cool, heavy/light, buzzing/still, clenched/hollow". |
| `sound` | 4 numbers, 0..1: `[rough, grit, register, pulse]` |
| `band` | null since 30 Sep |
| `pull` | `fight` / `chase` / `hide` / `blank`, the urge (`:7`) |
| `regulation` | `smooth` / `warm` / `tune` / `wake` / `skipped` / `none` |
| `offered` (≤8), `word`, `wordAccepted` | Words offered and the one accepted |
| `setOff` | `someone` / `situation` / `body` / `nothing` / `not_sure` / null, the trigger category |
| `close` | `louder` / `same` / `quieter` / `much` |
| `routedTo` (≤2 tool ids), `ambientDescent` | — |

- Top-level node properties: `entry`, `way`, `band`, `pull`, `regulation`, `word`, `close`, `ambientDescent`, plus `dataJson` (the whole input).
- **Edges:** `-[:USED_FLOW]->FindTheFeelingFlow`, `-[:FOUND]->Emotion` (`:123`).
- **`User-[:FOUND_WORD {firstAt, lastAt, count, ways[]}]->Emotion`** (`:124-127`), a log aggregate. This is the only writer of FOUND_WORD.
- The spine side, a ToolSession with detail `find_the_feeling`, is in section 9.

### 3.2 What the UI asks

From `content.py`:

- Pull: "What does it want to do?" (`:169`). Options (`:73-77`):
  - fight: "Say something sharp" (prove them wrong, snap)
  - chase: "Text someone a lot" (explain, fix it, now)
  - hide: "Disappear" (cancel, go quiet)
  - blank: "Nothing. I'm blank" (numb, heavy, far away)
- Trigger: "Do you know what set it off?" with "Something with someone", "A situation", "Tired, hungry or sore", "Nothing I can see", "Not sure" (`:171`).
- Close: "Which is closer to how you feel right now?"

### 3.3 Free text

None.

### 3.4 Parts signal

- `pull` is a ready-made protector taxonomy:
  - fight → aggressive firefighter.
  - chase → pursuing / attachment protector.
  - hide → withdrawing / shame protector.
  - blank → dissociative firefighter.
- `setOff = someone` is an interpersonal trigger.
- The shape vector gives a felt "image" of the part (a trailhead): hot / sharp versus hollow / cold.

---

## 4. Do the Opposite / Opposite Action (`OppositeActionSession`, v2): Log

**Files.** Validation `functions/src/oppositeActionValidation.ts` (v2 at `:114-211`). Save `oppositeAction/index.ts:203`, MERGE `:259-282`, FollowUp mirror `:288-308`. Flow content (choices and copy) is JSON in `schema/opposite-action-flow.cypher:12`. Client types are `src/data/oppositeActionTypes.ts`.

### 4.1 Save gates

- A session is saved only when `safety = safe` and `effectiveness = unhelpful` (route `opposite`, checked at `index.ts:229-231`).
- **Sessions where the user judged the urge helpful, unsafe or unsure are never stored.**

### 4.2 Fields

All strings are ≤1500 characters. Most are in `dataJson`; some are also top-level properties.

| Field | Allowed values / meaning |
|---|---|
| `emotionId`, `parentId` | Parent is a DBT parent id |
| `urgeId` | ActionUrge id or `custom` |
| `urgeLabel` | Snapshot of the urge wording |
| `customUrge` | **Free text.** Prompt: "What is the urge pushing you to do?" |
| `situation` | Always `''` in v2 (`OppositeAction.tsx:181`). v1 enum: relationship / work / change / self / other. |
| `observation` | **Free text**, "What did you observe? (optional)" / "What could a camera or microphone capture?" |
| `interpretation` | **Free text**, "What meaning or prediction did you add? (optional)". Assumed meaning, a candidate for self-critical thoughts. |
| `goal` | `connection` / `boundary` / `progress` / `repair` / `self_respect`. Prompt: "What do you want this moment to help you do?" |
| `safety` | `safe` |
| `facts` | `fits` / `excessive` / `not_fit`. Prompt: "how well do the emotion and its intensity or duration fit…" |
| `effectiveness` | `unhelpful` |
| `urgeBefore` | 0–10 int. Prompt: "How strong is the pull to {urge} right now?" |
| `urgeAfterBody` | 0–10 / null, after the body reset |
| `urgeAfter` | 0–10 / null |
| `intensityBefore`, `intensityAfter` | 0–10 / null, the optional feeling rating |
| `bodyCues` | 1–6 strings: the somatic cue wording the user held (the in-flow somatic step, not the Circuit Breaker tool) |
| `actionSize` | `small` / `medium` / `bigger` / `custom` |
| `action` | Step text; **free text** when custom ("What will you do differently, while keeping it safe?") |
| `cueId` | `now` / `today` / `next_time` |
| `cue` | Label snapshot |
| `dueAt` | ISO, ≤48 h ahead |
| `barrier` | `''` / `none` / `too_big` / `forget` / `emotion` / `other` ("Plan for a snag"). Labels: "The step feels too big", "I might forget in the moment", "The feeling might take over", "Something else". |
| `backup` | **Free text**, "If that happens, what smaller step or support will you use?" |
| `status` | `planned` / `practiced` / `missed` |
| `outcome` | `toward_goal` / `partial` / `unclear` / `unsafe` |
| `missedReason` | `too_strong` / `no_moment` / `forgot` / `chose_not`. Prompt: "What got in the way?" |
| `reflection` | **Free text**: "What did you notice or learn?", or for `chose_not`, "What made it not worth it this time? (optional)" |

- Top-level properties: `status`, `emotionId`, `urgeId`, `contentVersion`, `dataJson`, `intensityBefore/After`, `outcome`, `schemaVersion`, `urgeBefore`, `urgeAfterBody`, `urgeAfter`, `missedReason`, `cueId`, `dueAt` (`:263-269`).
- **Edges:** `-[:FOCUSED_ON]->Emotion`, `-[:USED_PROTOCOL]->OppositeActionFlow`, `-[:TARGETED_URGE]->ActionUrge`. There is no ActionUrge edge for custom urges.
- **Follow-ups:** a plan with a due time is mirrored as `FollowUp {type:'oa_plan', id = session id}` with status scheduled / done / partly / didnt and `missedReason`, plus `-[:DETAIL]->session` (`:288-308`).
- **State machine:** planned → practiced | missed; missed → practiced (`:174-179`).
- The ToolSession closes with `detail: opposite_action`. A rep is logged only when practiced (`src/lib/spine/wrap.ts:31`).

### 4.3 Parts signal

- This is the most direct firefighter data: the urge chosen, how strong it was, whether it gave way after the body cue, and `missedReason = too_strong` / `chose_not`.
- `interpretation` holds the protector's story.
- `goal` holds the part's positive intent (connection, boundary, self-respect).
- `barrier = emotion` ("The feeling might take over") is blending.
- Note: "helpful urge" sessions, which could show a protector working well, are lost.

---

## 5. DEAR MAN / "Ask for what you need" (`DearManSession`): Log

**Files.** `functions/src/dearMan/index.ts`: `DearManSessionData` at `:339-370`; `saveDearManSession` at `:372`, CREATE at `:386-423`. **There is no server-side validation;** the shape is saved as sent. The UI is `src/pages/tools/DearMan.tsx`.

### 5.1 Fields

- `type`: `prep` / `debrief`.
- `relationshipType` (UI-only list, `DearMan.tsx:59-67`): partner, boss, friend, parent, roommate, coworker, other. Prompts: "Who is this conversation with?" (prep `:741`) and "Who was this conversation with?" (debrief `:1668`).
- `situationType` (`schema/dear-man-content.cypher:52-72`), "What kind of conversation is this?":
  - `ask` "I need to ask for something"
  - `boundary`
  - `address`
  - `pattern` "I need to address an ongoing pattern"
- `priorities`: an ordered array of `objective` / `relationship` / `self-respect` (`:69-73`). Prompt: "What matters most to you here?"
- `describeId`: e.g. `addr_dismissed` "I told them how I felt and they dismissed it", `patt_shuts_down`, `bound_pressure`. `describeCustom` is **free text**: "What happened?" / "just the facts, like a camera would see it."
- `feelings`: DearManFeelingChip ids. `feelingCustom` ("I also feel...") is **not saved**.
- `assertId`, `assertIds`, `assertDetailsJson` (**free-text** detail per option), `assertCustom` (**free text**). Prompt: "What specifically are you asking for — or saying no to?"
- `reinforceIds`. `reinforceCustom` ("Why it would help...") is **not saved**.
- `anchorPhrase`: **free text**. Prompt: "What's one thing you can tell yourself if it gets hard?"
- `middleGroundId` / `middleGroundCustom` ("A compromise I could accept..."), `walkAwayId` / `walkAwayCustom` ("My non-negotiable...").
- **Debrief:**
  - `debriefOverall`: `better` / `mixed` / `not_well` / `didnt_have` (`:89-94`)
  - `debriefCurrentFeelings`: chip ids. These also create a CheckIn with `source = dear_man_debrief` (`:321-340`).
  - `turningPointIds`, "Was there a moment where things shifted?": tp_defensive, tp_crying_shutdown, tp_apologized, tp_no_words, tp_gave_in "I gave in to keep the peace", tp_escalated, tp_went_okay, tp_something_else.
  - `momentResponseIds`, "What did you do in that moment?": mr_froze, mr_got_loud, mr_went_quiet, mr_cried, mr_changed_subject, mr_agreed, mr_left, mr_stayed_course.
  - `bodySignalIds`, "What was happening in your body?": bs_chest_tight, bs_stomach_drop, bs_face_hot, bs_hands_shaking, bs_throat_closed, bs_numb, bs_heart_racing, bs_jaw_clenched, bs_shoulders_up, bs_none.
  - `thoughtPatternIds`, "What thoughts showed up?" (each has a `theme`):
    - thought_not_worth "This isn't worth the fight" (avoidance)
    - thought_my_fault (self_blame)
    - thought_never_listen (hopelessness)
    - thought_too_much "I'm being too much" (self_invalidation)
    - thought_cant_handle (overwhelm)
    - thought_dont_deserve "I don't deserve to ask" (unworthiness)
    - thought_should_know (expectation)
    - thought_wrong "What if I'm wrong?" (doubt)
    - thought_will_leave "They're going to leave" (abandonment)
    - thought_something_else. Its free text ("What was the thought?") is **not saved**.
  - `underneathIds`, "Underneath that — what was the deeper feeling?": under_fear_rejection, under_shame, under_grief, under_powerlessness, under_loneliness, under_not_sure.
  - `copeAheadId` (CopeAhead ids, ca_*), `reflectionLanded`: yes / sort_of / not_really.
  - Content for all of these is in `schema/dear-man-debrief-content.cypher` ≈`:22-225`.
- **Edges:** none to content; everything is stored as id arrays.

### 5.2 What stops the user / fears about asking

- `barriers`: DearManBarrier ids (`dear-man-content.cypher:214-219`), prompt "What makes this hard?":
  - `barrier_angry` "I'm afraid they'll get angry"
  - `barrier_dont_know` "I don't know how to say it"
  - `barrier_guilty` "I feel guilty asking"
  - `barrier_tried_before` "I've tried before and it didn't work"
  - `barrier_emotional` "I'm worried I'll get emotional"
  - `barrier_no_right` "I don't feel like I have the right to ask"
- `barriersCustom` is **free text**, kept in sync with the chips (`DearMan.tsx:479-498`).
- Also: the "What might pull you off track?" coaching cards, and the debrief `tpToBarrierMap` (`≈:1607`) that carries a turning point forward as a barrier.

### 5.3 Parts signal

- Barriers and thought patterns are textbook manager voices (guilt, no right, too much, my fault) and exile beliefs (don't deserve, will leave).
- Moment responses are protector behaviours: froze / went quiet / agreed are fawn or freeze; got loud is a firefighter.
- `underneathIds` names the exile directly.
- `relationshipType` lets parts be tied to a person category.

---

## 6. Problem Solve: no session node

### 6.1 What is stored

- Only the spine ToolSession with `ext.er = {problemTypeId, directionId, size}` (`ProblemSolve.tsx:96-102`; schema at `extSchemas.ts:34-37`).
- `exitStep` = the phase where the user left: intro, identify, readiness_check, define_problem, triage, barrier_assessment, barrier_sub, ambivalence, confidence_ruler, decompose, solutions, commit, complete (`:20-34`).
- `practiced` becomes true at define_problem.
- A `ps_step` FollowUp from the close (`<SessionClose planType="ps_step" />`, `:1290`), asked as "When will you take the next step?" (Today / Tomorrow / This week). It resolves as did_it / did_part / didnt.

### 6.2 Collected in the UI but NOT saved

- The problem text ("What's the actual problem?")
- The custom step ("What's the step you already know you need to take?")
- The barrier type and sub-response
- The ambivalence option
- The confidence level
- The decomposition buckets

### 6.3 Barriers (`schema/problem-solve-barriers.cypher`)

Prompt: "What's standing between you and doing something about this?"

**BarrierType** (`:59-91`):

- `know-but-cant` "I know what to do, I just can't make myself do it"
- `involves-person` "It involves another person and I don't know how to get through to them"
- `not-sure-what` "I'm not sure what the right move is"
- `outside-control` "This feels completely outside my control"
- `tried-nothing-works` "I've tried things and nothing has worked"

**BarrierSubResponse:**

- Under know-but-cant:
  - `cant-afraid-aftermath` "I'm afraid of what happens after"
  - `cant-no-energy`
  - **`cant-ambivalent` "Part of me doesn't actually want this to change".** Its therapeutic response: "…the part that wants change AND the part that doesn't. Let's look at what staying the same protects you from." (`:169-175`)
  - `cant-keep-putting-off` "Avoidance usually protects you from something…"
- Under involves-person:
  - `person-dont-know-what-to-say`
  - `person-scared-reaction`
  - `person-tried-they-dont-listen`
  - `person-no-right-to-speak`
- Under tried-nothing-works:
  - `tried-talked-to-them`
  - `tried-thinking-constantly`
  - `tried-different-approaches`
  - `tried-exhausted`

**AmbivalenceOption**, "What does staying the same protect you from?" (`:608-630`):

- `ambiv-hard-conversation`
- `ambiv-change-might-not-help`
- `ambiv-losing-something`
- `ambiv-admitting-need-help`

**Confidence ruler:** high / medium / low / none.

### 6.4 Parts signal

- These are the clearest manager / protector prompts in the app, and they use explicit "part" language.
- Today none of them persist. Only `exitStep` (e.g. leaving at `barrier_sub` or `ambivalence`) and `problemTypeId` survive.

---

## 7. Recover from a hurtful moment (`InvalidationRecoverySession`): Log

**Files.** Validation `functions/src/invalidationRecoveryValidation.ts:6-103`. Save `invalidationRecovery/index.ts:119`, writes at `:169-186`. Content in `scripts/invalidation-recovery/content.py`.

### 7.1 Fields

| Field | Allowed values / meaning |
|---|---|
| `stateId` | InvalidationEvent, "What happened?" (`:71-78`): `brushed` "They brushed off what I said", `unheard`, `mocked`, `small` "They made me feel small", `ignored` "I was ignored or left out", `leaving` "They pulled away and I'm scared they'll leave", `blocked`, `stewing` "It keeps happening and I can't let it go" |
| `pull` | `fight` "Fight back" / `chase` "Chase them" / `hide` "Hide" / `freeze` "Shut down". Prompt: "It's pulling me to…" |
| `gate` | `downshift` / `downshift-cold` / `orient` / `none` |
| `emotionId` | "What hit hardest?" |
| `needId` | "Under this, I needed…": heard, respected, included, matter, safe, fair, say |
| `exitId` | `ask` / `land` / `opposite` / `park` / `prefer` |
| `zone` | `real` / `both` / `check` (from "How sure are you they meant it?" and "Has this happened before with them?") |
| `safe` | yes / no ("Is it safe to bring this up with them?") |
| `asks` | 0 / 1 / 2 ("Have you already asked them to hear you on this?") |
| `startIntensity`, `startUrge`, `readings[2..8]`, `endIntensity`, `endUrge` | 0–10 |
| `skills[]` | PracticeSkill ids |
| `followUps` | `tomorrow` / `rehearse` / `experiment` |

- **Edges:** `-[:ABOUT]->InvalidationEvent`, `-[:FOCUSED_ON]->Emotion`, `-[:NAMED_NEED]->UnmetNeed`, `-[:TOOK_EXIT]->RecoveryExit`, `-[:USED_PROTOCOL]->`, `-[:PRACTICED]->PracticeSkill`.
- Follow-ups become FollowUp `recover_next_day` / `recover_rehearse` / `recover_log` (section 9).

### 7.2 Who / free text

- **"Who" is not captured.** There is no person or relationship field, only `safe` and `asks` about "this person".
- **There is no free text** ("drafted messages never leave the device", `:4`).
- Not saved:
  - The certainty percentage
  - The secure-base figure picked
  - The "must" picked in Loosen the must (e.g. "They must listen to me")
  - The values picked
  - The self-compassion step. Its copy is relevant: "The self-critic can wait"; "The fierce part counts too".

### 7.3 Parts signal

- pull × stateId × need maps to protector role × trigger × exile need. For example, `leaving` + chase + "To matter" is an attachment exile with a pursuer protector.
- `zone = check` ("Old wounds can turn up the volume") hints at exile activation.

---

## 8. Regulation tools, Help me now, micro-steps, guided activities

All of these are recorded only as ToolSession records (section 9). The close kinds come from `functions/src/spine/tools.ts:13-30`.

### 8.1 Circuit Breaker (`cool-down`)

- **What "Circuit Breaker" means:** the `feat/circuit-breaker` merge (`8ee4568`, PR #46) is "Cool Down rebuilt as cold on the face, one screen".
  - The tool id stays `cool-down`; the URL slug is `circuit-breaker` (`src/data/tools.ts:144-146`).
  - The display name is "Circuit Breaker".
  - `public/tools/circuit-breaker/` holds only the `face.png` and `hands.png` art (`CoolDown.tsx:40`).
  - It is separate from the OA "somatic circuit-breaker" step (the `bodyCues` in section 4).
- **What it stores** (`CoolDown.tsx:200-223`):
  - `ext.dt.techniqueId = 'ice-face'`
  - `skillIds ['cold']`
  - `thenVsNow` from "Check in. Reset?": Still Loud → `same` (not `worse`), About the Same → `same`, Quieter → `better`
  - A non-"quieter" answer closes this session and remounts a fresh one, so each round is its own ToolSession.
- Close kind is regulation_down.

### 8.2 Pause (STOP), urge close

- Free text in the O and P steps ("What do you notice right now?", "What's one thing you could do that would help?") is **not saved**; the screen says "Nothing you wrote here is saved." (`Pause.tsx:80`).
- Stores `exitStep` `step_t` / `step_o` / `step_p` and `actedOnUrge`.
- Close copy: "And the urge?" Held off = no, Went ahead = yes, Still deciding = not_yet (`scripts/practice-spine/content.py:50-56`).
- The `ext.dt.stepsDone` key is registered but never written.

### 8.3 5-4-3-2-1 (`five-senses`), orienting close

- Stores `ext.dt.sensesDone` (see / touch / hear / smell / taste) and thenVsNow in the orient direction ("Further away" … "More here").
- Typed items are not saved.

### 8.4 Urge Surfing, urge close

- The 1–10 slider and peak are **not stored** (`UrgeSurfing.tsx:11`).
- **It never asks which urge.** Only `actedOnUrge` is stored ("Did you act on the urge?" No / Partly / Yes).

### 8.5 Help me now

- `HelpNowInterim.tsx:23-29` records ToolSession `help-now`, entry `checkin_grid`, `ext.core.microStepId`, status completed or exited_early (when the user taps Circuit Breaker or 5-4-3-2-1).
- No check-in is created.

### 8.6 Micro-step and guided activity

- One-shot ToolSessions from the check-in result (`CheckIn.tsx` `recordOneShot`).
- `ext.core = {patternId, microStepId | activityId}`.

### 8.7 Parts signal

- Frequency and time of day of Help me now / Circuit Breaker use measure firefighter activation.
- `actedOnUrge = yes` on Pause and Urge Surfing means a firefighter won. But the urge itself is unnamed.

---

## 9. Spine: ToolSession, SkillPractice, FollowUp, ToolUsage, Today (all Log)

### 9.1 ToolSession

Start is validated at `spine/validation.ts:26-39, 41`; created at `toolSession.ts:41-100` (ON CREATE `:47-54`). Close is validated at `:65-83, 86`; written at `toolSession.ts:103-187` (SET `:129-141`).

| Field | Meaning |
|---|---|
| `toolId`, `module` | Module is `mf` / `dt` / `er` / `ie` / `wmp` / `core` |
| `closeKind` | `regulation_down` / `orienting` / `regulation_up` / `urge` / `plan` / `none` |
| `flowVersion` | — |
| `entry` | `checkin_result`, `checkin_grid`, `tools`, `followup`, `today`, `handoff`, `embedded`, `insights`, `direct` |
| `startedAt`, `endedAt` | — |
| `status` | `open` / `completed` / `exited_early`. Abandoned is derived after 2 h (`lifecycle.ts toolSessionState`). |
| `practiced`, `exitStep`, `durationSec` | — |
| `patternId` | Set only from the check-in result link state (`ToolSessionContext.tsx:26-32`) |
| `emotionIds` | **Validated, but the client never sends it**, so it is always `[]` |
| `checkInId` | — |
| `bandAtStart*`, `bandAtEnd*` | Ask-fresh |
| `thenVsNow`, `thenVsNowDir` | `worse` / `same` / `better` / `much_better`; direction `down` / `orient`. Ask-fresh. |
| `actedOnUrge` | `no` / `partly` / `yes` / `not_yet` (`types.ts:24`). Ask-fresh. |
| `answeredAt`, `outcomeAskDismissed` | — |
| **`urgeIds`** | ≤10 graph ids, ask-fresh. **No client ever passes it**, so it is always `[]` in practice. This is the ready slot for urge tagging. |
| `ext` | JSON string, schemas below |

**`ext` schemas** (`extSchemas.ts:22-49`):

- `core`: `{microStepId, patternId, activityId, routing:{slot, ruleId}}`. The routing slot is carried in link state but not written (`src/lib/spine/toolLink.ts:16`).
- `dt`: `{techniqueId, sensesDone[≤5], stepsDone[≤10]}`
- `er`: `{problemTypeId, directionId, size, handoffs[≤4]{primitiveId, completed, durationSec, thenVsNow, resumed, overridden}}`. `handoffs` is used by DEAR MAN's P2 breakdown hand-off (`DearMan.tsx:404`).
- `ie`, `wmp`, `mf`: empty.

**ToolSession edges:**

- `-FROM_CHECKIN->CheckIn`
- `-HANDED_OFF_FROM->ToolSession` (a tool opened from another tool)
- `-RESOLVING->FollowUp`
- `-COMPAT_USAGE->ToolUsage`
- `-DETAIL->` OA / Recover / DEAR MAN / FTF session (`:143-145`). There is no Problem Solve detail.
- `-SCHEDULED->FollowUp`
- `-LOGGED_REP->SkillPractice`
- Incoming `CheckIn-EMBEDDED->`

### 9.2 SkillPractice

Created at `toolSession.ts:163-180`.

- Fields: `skillIds[1]`, `practiceId`, `module`, `source` (`standalone` / `embedded` / `help_now` / `followup_offphone`), `hostTool`, `bandAtStart`.
- `flagBlank` (pattern in conservation_freeze / dissociation_overmodulation / reward_drive_low) and `flagDissoc`.
- `durationSec`, `exitedEarly`, `thenVsNow`, `actedOnUrge`, `offPhone`, `logged`, `fadeLevel = 0`.
- Edge `-[:PRACTICED]->PracticeSkill`.

### 9.3 FollowUp

Created at `followUp.ts:23-56`; resolved at `:86-129`; snoozed at `:131-142`.

- Fields: `type`, `ownerModule`, `priorityTier`, `status` (scheduled → done / partly / didnt / dismissed / cancelled), `dueAt`, `window`, `cueId`, `attempts`, `sourceToolId`, `sourceSessionId`, `notify*`, `snoozedUntil`, `resolvedAt`, `missedReason`.
- `outcome` is JSON `{choiceId, thenVsNow?, thenVsNowDir?}`.

**FollowUpType registry** (`scripts/practice-spine/content.py:74-189`):

| Type | Status | Choices |
|---|---|---|
| `oa_plan` | on | — |
| `recover_next_day` | on | "Compared to yesterday, it's…" (then-vs-now down) |
| `recover_rehearse` | on | did_it / not_yet / skip |
| `recover_log` | on | better / as_expected / worse / not_yet: "Compared to what you expected" |
| `ps_step` | on | did_it / did_part / didnt |
| `tool_outcome` | on, derived | — |
| `regulation_recheck` | **off** | — |
| `pattern_offer` | on | — |
| `profile_revisit` | **off** | — |
| `resume_skill` | on | — |

Reserved and off: `safety_checkin`, `chain_nextday`, `missed_step`, `diary_daily`, `practice_daily`, `ask_outcome`.

### 9.4 ToolUsage (compat)

- `trackToolUsage` (`toolUsage/index.ts:16`) and `recordToolOutcome` (`:73`). Since the spine it is created by `startTx` (`toolSession.ts:72-76`).
- Fields: `toolId`, `timestamp`, `toolSessionId`, `outcome` (`helped` / `somewhat` / `not_really`, mapped by `legacyOutcome`, `capacity/reading.ts:90`), `outcomeTimestamp`.
- Edge `-FOLLOWED_CHECKIN->` (the given check-in, else the latest one before it).

### 9.5 Today

`getToday`, `spine/today.ts:125`. It reads only:

- Scheduled follow-ups (`:48-90`)
- One derived "did it help?" card for the latest unanswered session with a regulation / orient / urge close within 12 h (`:93-123`)
- Pattern offers, via a registered source (`patternOffers.ts:140-164`)

The client filters reminders using the `quietHours` slice (`TodayContext.tsx:28`).

### 9.6 Parts signal

- Which tools are used, when (the hour), from which entry, and whether they were abandoned or exited early.
- `HANDED_OFF_FROM` chains (e.g. Recover → DEAR MAN).
- Follow-up misses (`didnt`, OA `missedReason`) suggest protector resistance.

---

## 10. Profile layer and the pattern-offer mechanism

### 10.1 Areas and kinds

From `scripts/profile-layer/content.py`.

**AREAS** (`:13-21`):

- `about_me` "What you'd like the app to call you, and what matters to you."
- `my_people` "…Nothing here unless you add it."
- `my_body` "Things about your body and your day the tools should respect."
- `my_words`, `my_plans`, `my_patterns` "Things that seem to help you, once you've said yes to them.", `my_progress`

Only about_me, my_body, my_words and my_patterns are shown (`MeSection.tsx:15`).

**KINDS** (`:24-31`):

- `quiet_hours` (area my_body, revisit 180 days): still-true copy "Are these still your quiet hours?"; set-aside copy "Set aside. Reminders can come at any time until you set new ones."
- `what_helps` (my_patterns, revisit 60 days): "Is this still true for you?" / "Set aside. It won't shape suggestions any more."
- `own_line` (my_words, never revisited): set-aside copy "Set aside."

**What each area holds today:**

- **About me** holds only `User.displayName` (an account setting): "The app calls you {name}. Change it under Basic info." (`MeSection.tsx:100-102`).
- **My body** holds only quiet hours: `ProfileFact {kind:'quiet_hours', valueJson {start, end HH:MM}}`, validated in `FACT_VALUES` (`profile/items.ts:22-30`).
- **My words** holds `FOUND_WORD` (read-only), `OwnLine`s and `SAVED_LINE`s.

### 10.2 PatternRule (`content.py:37-49`), quoted

```python
RULES = [
    {
        "id": "what_helps_better",
        "patternKind": "what_helps",
        "windowDays": 30,
        "minEvidence": 3,
        "ofLast": 4,
        "cooldownDays": 14,
        "enabled": False,
        "statementTemplate": "{toolName} tends to help you when this happens.",
        "offerCopy": "Want to keep this in Me? You can change it any time.",
    },
]
```

This is the only rule, and it is **switched off**: D-10 says to turn it on after four weeks of ToolSession data.

### 10.3 How offers are generated

From `functions/src/profile/patternOffers.ts`.

1. `evaluatePatternOffers` (`:89-137`) runs as a Today *prepare* step, at most once a day per user (`User.patternsEvaluatedAt`).
2. It reads ToolSessions with `thenVsNow` inside the largest rule window, and every existing PatternOffer.
3. `evaluateRule` (`:48-74`) groups sessions by (toolId, patternId) and takes the last `ofLast` answered closes. If at least `minEvidence` were better / much_better, that group is a candidate.
4. Limits:
   - At most one new offer a week app-wide (`OFFER_EVERY_DAYS = 7`, `:40`).
   - A (rule, tool, pattern) group is blocked if its offer was accepted, declined, or is pending without an elapsed cooldown.
   - It returns the single strongest candidate, then the most recent.
5. The offer is written as a `PatternOffer` (Log) with `id = ruleId:toolId:patternId`, `{ruleId, patternKind, toolId, patternId, evidenceIds, status:'offered', offeredAt, cooldownUntil, answeredAt}`.
   - Because the id is deterministic, a re-offer after a cooldown resurfaces the same node.

**Effective reach.** Only tools that store `thenVsNow` (cool-down, five-senses, find-the-feeling) **and** carry a `patternId` (opened from a check-in result card) can ever qualify. Urge-close tools, OA, DEAR MAN, Recover and Problem Solve cannot.

### 10.4 How offers are shown

- **Today card** (`patternOfferItems`, `:140-161`): title = `statementTemplate` with `{toolName}` filled on the client; body = `offerCopy`; tier `skills`; at most one at a time. Choices come from `FollowUpType pattern_offer`: "Yes, keep it" / "Not now" / "No". Header copy: "Something we noticed" / "Want to keep this in Me?" (`practice-spine/content.py:145-151`).
- **Me:** `getMe` offers (`me.ts:64-68`), rendered by `PatternOfferCard.tsx`.

### 10.5 What the user answers (`answerPatternOffer`, `:170-215`)

- **yes:**
  - The offer becomes `accepted`.
  - A `MyPattern` ProfileItem is created with `{id = offer id, kind = patternKind, area, patternKind, toolId, patternId, statementId = ruleId, status:'active', source:'offer', confirmedAt, revisitAt = now + 60 d, reviewCount: 0}`.
  - Edges `User-[:HAS_PATTERN]->`, `MyPattern-[:ACCEPTED_FROM]->PatternOffer`; `profileVersion` goes up by one.
  - MyPattern has **no edge** to ActivationPattern or TherapyConcept, only ids.
- **not_now:** `cooldownUntil = now + cooldownDays` (default 14).
- **no:** `declined`, never offered again for that rule + tool + pattern.

### 10.6 Still true? / set aside / restore

From `items.ts:81-99` and `meta.ts:7-14`.

- `profileItemPrompt` returns `ask` once past `revisitAt`, `quiet` while fresh, `none` with no policy or when set aside.
- `StillTrue.tsx` offers "Yes" / "Not any more" / "Change":
  - `confirmProfileItem`: refreshes `confirmedAt`, `lastReviewedAt`, increments `reviewCount`, sets the next `revisitAt`.
  - `setAsideProfileItem`: `status:'set_aside'`, excluded from slices (they filter `status:'active'`) but listed in `getMe` and restorable.
  - `restoreProfileItem`: back to active with a new revisit date.
- `getMe` returns `staleCount` (items whose prompt is `ask`).
- The `profile_revisit` Today card type exists but is **off**.

### 10.7 PROFILE_NEEDS and getProfileContext

Quoted from `profile/types.ts:64-72`:

```ts
export const PROFILE_NEEDS = {
  'recovering-from-invalidation': ['name'],   // later + 'people'
  'find-the-feeling': ['name'],
  'opposite-action': [],                      // later 'values', 'patterns'
  'cool-down': [],                            // DT-01: 'bodyFlags'
  'checkin': ['patterns'],                    // the router's tie-break (E4)
  'today': ['quietHours'],
  'witness': ['name', 'ownLines', 'savedLines'],
} as const satisfies Record<string, readonly SliceId[]>;
```

- `getProfileContext` (`profile/index.ts`) rejects unknown consumers and `witness` (server-only).
- **Slices** (`SLICE_IDS`, `:13-17`):
  - Implemented (`slices.ts:15-29`): `name`, `quietHours`, `patterns`, `ownLines`, `savedLines`.
  - Reserved, returning empty: `people`, `bodyFlags`, `values`, `goals`, `copeAheadPlans`, `boundaryLines`, `practicePrefs`, `fadeLevels`, `ownWords`, `thingsILike`, `crisisKit`, `safetyPlan`, `country`.
- **Who actually reads:**
  - `today` reads quietHours (`TodayContext.tsx:28`).
  - Recover and FTF read the first name (`InvalidationRecovery.tsx:66`, `FindTheFeeling.tsx:63`).
  - Witness reads server-side (`witness/index.ts:107`).
  - **The `checkin` → `patterns` slice is declared but nothing consumes it**, so MyPattern currently affects nothing.
- A future `parts` slice would be added to `SLICE_IDS` / `PROFILE_NEEDS` in code. Resolvers must never touch a `:LogRecord` (test-enforced).

### 10.8 FOUND_WORD

- A log aggregate. It accumulates without a yes and is shown read-only under My words.

### 10.9 User node (settings, not the profile layer)

- `displayName`, `photoURL`, `theme`, `palette`, `checkInReminder`, `reminderTime`, `reminderDays`, `weeklyDigest`, `dataRetentionDays`, `shareAnonymousData`, `timeZone` (`account/index.ts:166-169`).
- Plus `profileVersion`, `patternsEvaluatedAt`, `email`, `createdAt`.

---

## 11. Insights / Reflect (`getInsightsData`): reads only

**Queries** (`insights/queries.ts`):

- `CHECKINS_QUERY` (`:16-33`): timestamp, emotion / emotionIds, quadrant, intensity, band, pattern, body regions, sensation ids / tags, DBT families via `HAS_REGULATION_CONTENT`.
- `SESSIONS_QUERY` (`:39-50`): toolId, pattern (the session's own, else its check-in's), at, closeKind, thenVsNow, actedOnUrge.
- `LEGACY_USAGES_QUERY` (`:53-62`).

**Computed** (`insights/compute.ts`, `handler.ts`), with thresholds per range (`thresholdsFor` `:39`):

- Pattern tally: dominant and secondary pattern, frequencies (`:87`).
- **Formulation:** graph copy for the co-occurring pair (`CO_OCCURS_WITH.combined_formulation_*`) or for a single pattern, plus `effectiveTools` and an episode count.
- **Proactive alert:** `CAN_ESCALATE_TO.escalation_narrative` when the dominant pattern repeats or its intensity trends up.
- **Somatic correlation:** body region × pattern / quadrant counts, with narrative (`:287`).
- **Tool effectiveness:** answered count and wentWell count. wentWell means better or much_better for then-vs-now closes, and actedOnUrge = no for urge closes.
- **Growth evidence** (`:192-280`): emotion vocabulary, family breadth, catching-earlier (intensity drop), pattern diversity, sensation richness, body awareness, tool follow-through, tool repertoire, positive outcomes. Each compares the newer half of the range with the older half.
- `totalCheckIns`.

**Parts signal:** a template for parts statistics (dominant recurring state + body + what helps), but it has no part-level grouping.

The History page charts check-ins on the client (top emotions, body region frequency, quadrant distribution, mood timeline, calendar).

---

## 12. ActionUrge nodes (`schema/opposite-action-data.cypher:126-237`), firefighter candidates

Each urge has small / medium / bigger opposite steps. Urge-level somatic cues are in `opposite-action-flow.cypher:55-65`; `replace: true` for fear-freeze and sad-bed.

| Parent | Urges |
|---|---|
| fear | `fear-avoid` "Avoid it entirely"; `fear-escape` "Run away or escape"; `fear-cancel` "Cancel plans"; `fear-freeze` "Freeze and do nothing" |
| anger | `anger-lash` "Lash out or say something cutting"; `anger-stonewall` "Shut someone out"; `anger-destroy` "Break or throw something"; `anger-criticize` "Criticize or blame someone" |
| sadness | `sad-bed` "Stay in bed and do nothing"; `sad-isolate` "Cancel plans and isolate"; `sad-give-up` "Give up on something that matters"; `sad-scroll` "Scroll mindlessly or zone out" |
| disgust | `disgust-push` "Push this person or thing away"; `disgust-leave` "Leave the situation"; `disgust-judge` "Judge or condemn" |
| shame | `shame-hide` "Hide or disappear"; `shame-secret` "Keep it secret"; `shame-shrink` "Make yourself small"; `shame-avoid-people` "Avoid people who might notice" |
| guilt | `guilt-apologize` "Apologize again (or excessively)"; `guilt-punish` "Punish yourself"; `guilt-avoid` "Avoid the person you think you wronged" |
| jealousy | `jealousy-check` "Check their phone, social media, or whereabouts"; `jealousy-interrogate` "Interrogate or ask repeatedly"; `jealousy-cling` "Cling or demand more attention" |
| envy | `envy-tear-down` "Tear them down (in your head or out loud)"; `envy-compare` "Compare and despair"; `envy-give-up` "Give up on your own goals" |
| love | `love-reach-out` "Text, call, or reach out to them"; `love-stalk` "Check their social media"; `love-proximity` "Go places they might be"; `love-idealize` "Idealize them and ignore red flags" |

Related urge sets elsewhere:

- FTF pulls: fight / chase / hide / blank.
- Recover pulls: fight / chase / hide / freeze.
- These two lists aren't linked to ActionUrge in the graph.

---

## 13. Existing IFS content in the graph, quoted

**`schema/knowledge-graph.cypher:904-917`**

```
MERGE (ifs:TherapyModality {id: "ifs"})
SET ifs += {
  name: "Internal Family Systems",
  abbreviation: "IFS",
  founder: "Richard Schwartz",
  description: "Model of psychotherapy based on subpersonalities or 'parts'",
  core_assumptions: [
    "The mind is naturally multiple",
    "Everyone has a Self",
    "All parts have good intentions",
    "Parts take on extreme roles to protect"
  ]
};
```

**`knowledge-graph.cypher:987-1065`**

```
// IFS CONCEPTS
MERGE (exile:TherapyConcept {id: "ifs_exile"})
SET exile += {
  name: "Exile",
  description: "Young parts carrying pain, trauma, shame—often hidden away by protectors",
  modality: "IFS",
  role: "wounded_part"
};
MERGE (firefighter:TherapyConcept {id: "ifs_firefighter"})
SET firefighter += {
  name: "Firefighter",
  description: "Reactive protector parts that act impulsively to extinguish emotional pain",
  modality: "IFS",
  role: "reactive_protector",
  common_behaviors: ["substance use", "self-harm", "binge eating", "dissociation", "rage"]
};
MERGE (manager_ifs:TherapyConcept {id: "ifs_manager"})
SET manager_ifs += {
  name: "Manager",
  description: "Proactive protector parts that try to control and prevent pain",
  modality: "IFS",
  role: "proactive_protector",
  common_behaviors: ["perfectionism", "people-pleasing", "overworking", "controlling", "caretaking"]
};
MERGE (self_energy:TherapyConcept {id: "ifs_self"})
SET self_energy += {
  name: "Self",
  description: "Core, undamaged essence characterized by the 8 C's; neurobiologically corresponds to mPFC activation and ventral vagal tone",
  modality: "IFS",
  role: "core_self",
  qualities: ["Curiosity", "Calm", "Clarity", "Compassion", "Confidence", "Courage", "Creativity", "Connectedness"],
  neurochemical_markers: ["serotonin", "oxytocin"],
  physiological_correlate: "ventral_vagal_tone",
  neural_hub: "mPFC",
  mechanism: "mPFC sends inhibitory signals to amygdala, quieting alarm system and enabling CEN activation"
};
MERGE (protector:TherapyConcept {id: "ifs_protector"})
SET protector += {
  name: "Protector",
  description: "Parts that protect the system from exile pain (managers and firefighters)",
  modality: "IFS",
  role: "protector"
};
MERGE (unburdening:TherapyConcept {id: "ifs_unburdening"})
SET unburdening += { name: "Unburdening", description: "Process of releasing extreme beliefs and emotions from exiled parts", modality: "IFS", process_type: "healing" };
MERGE (blending:TherapyConcept {id: "ifs_blending"})
SET blending += { name: "Blending", description: "When a part's feelings or beliefs take over, and we lose Self-leadership", modality: "IFS" };
MERGE (unblending:TherapyConcept {id: "ifs_unblending"})
SET unblending += { name: "Unblending", description: "Creating separation between Self and parts to restore perspective", modality: "IFS" };
MERGE (trailhead:TherapyConcept {id: "ifs_trailhead"})
SET trailhead += { name: "Trailhead", description: "Entry point for accessing parts—a feeling, thought, sensation, or image", modality: "IFS" };
```

**`knowledge-graph.cypher:2264-2280`**

```
MERGE (rdoc_self_perception:RDoCConstruct {id: "rdoc_self_perception"})
SET rdoc_self_perception += { name: "Perception and Understanding of Self", domain: "Systems for Social Processes",
  description: "Processes involved in perceiving, knowing about, and understanding the self",
  neural_circuit: ["mPFC", "PCC", "insula"],
  notes: "Neurobiological anchor for IFS Self-energy, ACT Observing Self, DBT Wise Mind" };
MERGE (rdoc_affiliation:RDoCConstruct {id: "rdoc_affiliation"})
SET rdoc_affiliation += { name: "Affiliation and Attachment", domain: "Systems for Social Processes",
  description: "Engagement in positive social interactions and formation of social bonds",
  neural_circuit: ["hypothalamus", "mPFC", "nucleus_accumbens"], neurochemical: ["oxytocin", "dopamine"],
  therapeutic_targets: ["IFS", "Polyvagal co-regulation"] };
```

**`schema/relationships.cypher:412-445`**

- All 9 of these `-[:BELONGS_TO]->(:TherapyModality {id:"ifs"})`: `ifs_exile`, `ifs_firefighter`, `ifs_manager`, `ifs_self`, `ifs_protector`, `ifs_unburdening`, `ifs_blending`, `ifs_unblending`, `ifs_trailhead`.
- Part hierarchy:

```
MATCH (ff:TherapyConcept {id: "ifs_firefighter"}), (p:TherapyConcept {id: "ifs_protector"}) MERGE (ff)-[:TYPE_OF]->(p);
MATCH (mgr:TherapyConcept {id: "ifs_manager"}), (p:TherapyConcept {id: "ifs_protector"}) MERGE (mgr)-[:TYPE_OF]->(p);
```

**`relationships.cypher:778-785`**: `(ifs)-[:TREATS]->` ClinicalConstruct `cptsd`, `dissociation`, `bpd`.

**`relationships.cypher:838-870`** (IFS parts → emotions):

```
ifs_exile       -[:CARRIES]->     cold_shame, fear, loneliness, sadness
ifs_firefighter -[:RESPONDS_TO]-> fear, cold_shame, overwhelm
ifs_manager     -[:PREVENTS]->    cold_shame, fear, rejection
```

These point at base-graph emotion ids (`cold_shame`, `loneliness`, `overwhelm`, `rejection`). Those are pattern-vocabulary words, not necessarily grid words, so grid words reach them only through `SCORES_AS` aliases.

**`relationships.cypher:991-1089`**, cross-modality bridges, all `CONCEPTUALLY_RELATED_TO {type}`:

```
ifs_self -> dbt_wise_mind {functional_equivalent}
ifs_self -> pv_ventral_vagal {functional_equivalent}
act_self_context -> ifs_self {functional_equivalent}
ifs_unblending -> act_defusion {functional_equivalent}
mbct_decentering -> ifs_unblending {functional_equivalent}
ifs_exile -> pv_dorsal_vagal {state_parallel}
ifs_firefighter -> pv_sympathetic {state_parallel}
ifs_manager -> (:FunctionalNetwork {id:"cen"}) {functional_parallel}
pv_neuroception -> ifs_trailhead {functional_parallel}
ifs_exile -> (:ClinicalConstruct {id:"emotional_dysregulation"}) {overlapping_construct}
```

**`relationships.cypher:1291`**: `(rdoc_self_perception)-[:NEUROBIOLOGICAL_ANCHOR_FOR]->(ifs_self)`

**`relationships.cypher:1566-1594`**:

```
ifs_self -[:NEURAL_HUB {mechanism:"metacognitive magic, balances neurochemicals"}]-> (:BrainStructure {id:"mpfc"})
ifs_self -[:ASSOCIATED_WITH {role:"calm stabilizer"}]-> (:NeurochemicalSystem {id:"serotonin"})
ifs_self -[:ASSOCIATED_WITH {role:"trust between Self and parts"}]-> (:NeurochemicalSystem {id:"oxytocin"})
ifs_self -[:INHIBITS {mechanism:"inhibitory signals quiet alarm system"}]-> (:BrainStructure {id:"amygdala"})
ifs_unblending -[:ACTIVATES]-> mpfc
ifs_unblending -[:ACTIVATES {role:"conflict manager, releases serotonin"}]-> acc
```

**Elsewhere:**

- `schema/validation-queries.cypher:102,112` reference `ifs_self` and `ifs_unblending`.
- No IFS concept has an `appToolId`, a `RECOMMENDED_FOR` row, or a link to ActivationPattern, ActionUrge, BodyRegion or any user data.

---

## 14. Asked in the UI but not saved

These are gaps a parts feature would probably want to close.

| Tool | Collected but discarded |
|---|---|
| Check-in | Per-spot word groupings of mixed feelings (two parts at once); `note` is never asked |
| Problem Solve | Problem text, BarrierType / sub-response (including "Part of me doesn't actually want this to change"), ambivalence option ("what staying the same protects you from"), confidence level, decomposition, custom step |
| Recover | The person, certainty %, secure-base figure, the "must" chosen, values, self-compassion step |
| DEAR MAN | `feelingCustom`, `reinforceCustom`, thought "something else" text |
| Opposite Action | Sessions routed to problem / clarify / unsafe (helpful-urge cases) |
| Urge Surfing | Which urge, and its intensity |
| Pause | O and P free text |
| 5-4-3-2-1 | Items typed |
| ToolSession | `urgeIds` and `emotionIds` are never populated; `ext.core.routing` is never written |

---

## 15. Quick map: which signal comes from where

| Signal | Sources |
|---|---|
| **Recurring urge** (firefighter) | OA `urgeId` / `urgeLabel` / `customUrge` + `urgeBefore→After` + `missedReason`; FTF `pull`; Recover `pull`; Pause / Urge-surf `actedOnUrge`; DEAR MAN `momentResponseIds` (got_loud, left); check-in "spiraling" / "far away" answers |
| **Protective / manager behaviour** | DEAR MAN `barriers` / `barriersCustom` / `thoughtPatternIds` (my_fault, too_much, dont_deserve, not_worth) / `momentResponseIds` (agreed, apologized, went_quiet); check-in "worry that won't turn off"; OA `interpretation`; PS barriers (not stored) |
| **Exile / underneath** | DEAR MAN `underneathIds`; Recover `needId` + `stateId`; FTF words (lonely, abandoned, ashamed); witness `UNDERNEATH` lines; IFS `CARRIES` emotions |
| **Body location** | BodySensation `region` / `side` / `sensationIds` / `strength`; DEAR MAN `bodySignalIds`; OA `bodyCues` held; FTF shape vector |
| **Time of day** | CheckIn `timestamp`, ToolSession `startedAt`, FollowUp `dueAt`, with `User.timeZone` |
| **Trigger** | FTF `setOff`; Recover `stateId`; DEAR MAN `situationType` / `describeId` / `relationshipType`; OA `situation` (v1 only) |
| **Self-critical thought** | DEAR MAN `thoughtPatternIds` (+ theme); OA `interpretation`; `OwnLine.text` |
| **Interpersonal script** | DEAR MAN `relationshipType` × `situationType` × `turningPointIds` × `momentResponseIds`; Recover `stateId` × `pull` × `exitId` × `zone` / `safe` / `asks` |
| **Self-energy / what helps** | MyPattern (what_helps), `thenVsNow` better, SAVED_LINE / OwnLine, `landed = yes` |
