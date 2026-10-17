# Cope Ahead

A tool for something hard that's coming: name it, say what might show up, pick what you'll do at the
hardest moment, rehearse it in your mind as if it's happening, settle, and keep the plan. Afterwards,
Today asks how it went.

Status: **built 17 Oct 2026**, listed under Emotion Regulation for everyone. Its content isn't gated on
sign-off; the parts step waits for the parts copy like every parts surface. It was the recommended
answer on Claudia's "what next" card and was built while the card was open. *As built* is at the end.

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

- *"What might you feel there?"* offers the situation's four `likelyFeelings` as chips; the person
  picks up to two. These are check-in grid words, so the person's own vocabulary carries over.
  *Something else* opens the grid word list (the same picker Recover's "I felt" uses, or the check-in's
  word list, whichever exists as a reusable component), and *Not sure* is also offered.
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
- **A danger chip** shows `CrisisBanner` compact under the screen, alongside, never instead, and the
  flow goes on. Two of them:
  - *They might hurt me* (on *A conversation I'm dreading* and *Seeing someone in particular*): the
    plan's first move becomes *Leave and get somewhere safe*. The banner is the `other_person` variant,
    because a crisis line is the wrong first call when the danger is another person: *"If you're in danger
    now, call 911."*, then the National Domestic Violence Hotline (call or text), with 988 last.
  - *I might hurt myself* (on *A day that's hard every year* and *Being on my own*): the first move
    becomes *Call or text someone who can help, now*. The banner is the default one.

  The person can still change the move. Nothing is blocked, and the visit saves as usual.

### 4. If it happens, I'll…

The plan is one if-then line built from taps:

> **If** *I go blank* **, I'll** *breathe out longer than in* **and** *say “Give me a minute.”*

- **If:** the hardest moment from screen 3, or the pull from screen 2 ("If I start to shut down").
  The person can switch between them.
- **I'll:** 1–2 moves from `CopeMove`, filtered by the pull and the situation. A move is either:
  - **body** — *Breathe out longer than in*, *Feel my feet on the floor*, *Cold water on my hands*;
  - **words** — *Say “Give me a minute”*, *Say the one thing I came to say*;
  - **action** — *Step out for five minutes*, *Text someone I trust*, *Leave and get somewhere safe*;
  - **a tool**, linked by `appToolId` — *Pause*, *5-4-3-2-1*, *Circuit Breaker*, *Urge Surfing*
    (only tools that work in the moment; DEAR MAN is prep, not a move).

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
- *Used it, it helped* counts toward what helps **for Cope Ahead** in Reflect: a visit whose after card says
  so is a visit that went well. It doesn't credit the move's tool (*Pause*, *5-4-3-2-1*): the app
  never saw that tool used, and crediting it would inflate it with uses nobody opened.
- With parts on and a chosen part, it also counts toward the part's *what's helped it settle*, through a
  `PartTag {source: 'cope_ahead'}` written on that answer (one per ToolSession, `tag.ts`), because the
  person named the part. `stats.ts` counts `cope_ahead` tags with the close tags for *helped*.

---

## Where it starts

- **Tools:** Emotion Regulation, listed for everyone.
- **Intents:** *"Something's coming up that I'm dreading"* → Cope Ahead.
- **The link contract** (`src/lib/copeAheadEntry.ts`): `/tool/cope-ahead?first=<situationId>&part=<partId>`.
  The situation chip comes first, never pressed. The part is preset in the parts step only if it's one of
  the person's kept parts, and they can change it.
- **DEAR MAN:** on the summary, *"Rehearse it"* opens Cope Ahead with *A conversation I'm dreading*
  first (not pre-selected) and the person's chosen part carried in (parts on only).
- **Recover:** *Rehearse the next time* (`recover_rehearse` on Today) gains a link, *"Walk through it
  with Cope Ahead"*, with *Seeing someone in particular* first. The follow-up itself is unchanged.
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
  - `rehearsed` (1 | 2), `newMomentId`, `newMomentOwn`, `newMoveIds`, `newMoveOwn` (the once-more
    pass), `settle` (`breath` | `five_senses` | `ok`), `kept`, `followUp`.

  It is registered in `extSchemas.ts`. The `*Own` fields are length-checked only.
- **The follow-up:** a new `FollowUpType` `cope_ahead_after` in practice-spine content.
  - Its window is a chip, the way `ps_step`'s is: today at 20:00, tomorrow at 18:00, this week at +4
    days 18:00, later at +7 days 18:00.
  - It's resolved inline. Both answers are stored on the follow-up as log fields.
  - The plan line it shows comes from the session, never pre-filled into a new visit.
- **The after answers** are log fields on the follow-up: `howItWent` (`better` | `as_expected` |
  `harder`; *It hasn't happened yet* snoozes 24 h and stores nothing) and `planHelped` (`helped` |
  `unsure` | `unused`; *Skip* stores null). Resolved inline, like `ps_step`.
- **The plan line** is one pure function, `planLine(content, ca)` in `src/lib/copeAheadPlan.ts`. The keep
  card, the rehearsal's plan beat and the after card all call it, so the wording can't drift between
  them. The after card composes it from the session's `ext.ca` ids and `cope-ahead.json`, never from a
  stored string.
- **Counts toward what helps:** yes, through the after card's *Used it, it helped*, the only outcome
  this tool records (Cope Ahead itself, as above).

## Copy (the source for `content.py`)

Every line below is the shipped wording, not a placeholder. Slots are in braces. The lane writes it into
`scripts/cope-ahead/content.py` as is; any change a voice-lint rule forces is reported back, not
reworded silently.

### Situations (`CopeSituation`)

`afterName` is how the after card names it ("How did {afterName} go?").

| id | label | afterName | likelyFeelings (grid ids) | hardMoments (in order) |
|---|---|---|---|---|
| `conversation` | A conversation I'm dreading | the conversation | anxious, nervous, angry, hurt | voice_raised, go_blank, not_heard, start_crying, *might_hurt* |
| `someone` | Seeing someone in particular | seeing them | nervous, hurt, angry, embarrassed | bring_up_past, cold_with_me, old_role, go_blank, *might_hurt* |
| `work_school` | Something at work or school | it | anxious, pressured, inadequate, exposed | go_blank, criticised, mistake_seen, cant_answer |
| `place_event` | A place or an event | it | nervous, excluded, overwhelmed, embarrassed | nobody_talks, too_much, want_leave, see_someone |
| `hard_day` | A day that's hard every year | the day | sad, grief, lonely, numb | wave_hits, others_normal, reminder, start_crying, *might_hurt_self* |
| `alone` | Being on my own | being on your own | lonely, empty, anxious, bored | evening_stretches, cant_stop_checking, thoughts_loop, old_habit, *might_hurt_self* |
| `other` | Something else | it | anxious, nervous, sad, angry | go_blank, start_crying, want_leave, voice_raised |

Italic ids are danger moments (`dangerMomentIds`), shown last.

### Hard moments (`HardMoment`)

`label` is the chip; `ifText` follows "If" in the plan line.

| id | label | ifText |
|---|---|---|
| `voice_raised` | They raise their voice | they raise their voice |
| `go_blank` | I go blank | I go blank |
| `not_heard` | They don't listen | they don't listen |
| `start_crying` | I start crying | I start crying |
| `bring_up_past` | They bring up the past | they bring up the past |
| `cold_with_me` | They're cold with me | they're cold with me |
| `old_role` | I slip into an old role | I slip into an old role |
| `criticised` | Someone criticises me | someone criticises me |
| `mistake_seen` | I make a mistake in front of people | I make a mistake in front of people |
| `cant_answer` | I'm asked something I can't answer | I'm asked something I can't answer |
| `nobody_talks` | Nobody talks to me | nobody talks to me |
| `too_much` | It gets too loud or too much | it gets too loud or too much |
| `want_leave` | I want to leave straight away | I want to leave straight away |
| `see_someone` | I see someone I'd rather not | I see someone I'd rather not |
| `wave_hits` | A wave of it hits | a wave of it hits |
| `others_normal` | Everyone acts like it's a normal day | everyone acts like it's a normal day |
| `reminder` | Something reminds me out of nowhere | something reminds me out of nowhere |
| `evening_stretches` | The evening stretches out | the evening stretches out |
| `cant_stop_checking` | I can't stop scrolling or checking | I can't stop scrolling or checking |
| `thoughts_loop` | The same thoughts go round | the same thoughts go round |
| `old_habit` | I want to do the thing I'm trying not to | I want to do the thing I'm trying not to |
| `might_hurt` | They might hurt me | they start to frighten me |
| `might_hurt_self` | I might hurt myself | I feel like hurting myself |

### The pull as the "If" (`CopeAheadFlow.pullIf`, keyed by Find the feeling's pull ids)

| pull | ifText |
|---|---|
| `fight` | I want to say something sharp |
| `chase` | I want to text them over and over |
| `hide` | I want to disappear |
| `blank` | I start to shut down |

### Moves (`CopeMove`)

`label` is the chip; `line` follows "I'll" in the plan line. `forPulls` filters by the screen-2 pull;
`general: true` moves show when no pull was picked or *Not sure*. `forMoments` moves show only for
those moments, first.

| id | kind | label | line | forPulls | general | appToolId / forMoments |
|---|---|---|---|---|---|---|
| `long_out` | body | Breathe out longer than in | breathe out longer than in | fight, chase, hide | yes | |
| `feet` | body | Feel my feet on the floor | feel my feet on the floor | hide, blank, fight | yes | |
| `cold_water` | body | Cold water on my hands | put cold water on my hands | fight, chase, blank | | |
| `hold_something` | body | Hold something in my pocket | hold something in my pocket | blank, hide | | |
| `give_minute` | words | Say “Give me a minute” | say “Give me a minute” | fight, blank, chase | yes | |
| `come_back` | words | Say “I'll come back to you on that” | say “I'll come back to you on that” | fight, chase | | |
| `say_hard` | words | Say “This is hard for me” | say “This is hard for me” | hide, blank | yes | |
| `one_thing` | words | Say the one thing I came to say | say the one thing I came to say | hide, chase | | |
| `step_out` | action | Step out for five minutes | step out for five minutes | fight, chase, hide | yes | |
| `stay_ten` | action | Stay ten more minutes, then decide | stay ten more minutes, then decide | hide | | |
| `text_trust` | action | Text someone I trust | text someone I trust | hide, blank | yes | |
| `phone_away` | action | Put my phone in another room | put my phone in another room | chase | | |
| `leave_safe` | action | Leave and get somewhere safe | leave and get somewhere safe | | | forMoments: might_hurt |
| `reach_help` | action | Call or text someone who can help, now | call or text someone who can help, now | | | forMoments: might_hurt_self |
| `pause` | tool | Pause | open Pause | fight, chase | | pause |
| `five_senses` | tool | 5-4-3-2-1 | do 5-4-3-2-1 | blank, hide, fight | yes | five-senses |
| `cool_down` | tool | Circuit Breaker | do Circuit Breaker | fight, chase | | cool-down |
| `urge_surfing` | tool | Urge Surfing | use Urge Surfing | chase, fight | | urge-surfing |

The plan line: **If** {ifText}, **I'll** {line}[ **and** {line}]. A tool move's `label` is the tool's
display name in `src/data/tools.ts` (`cool-down` is *Circuit Breaker*); a test pins label = name so a
rename fails loudly instead of drifting.

### Screens (`CopeAheadFlow`)

| key | text |
|---|---|
| `what_title` | What's coming up? |
| `what_own_hint` | Say it your way |
| `when_title` | When is it? |
| `when_today` / `when_tomorrow` / `when_week` / `when_later` | Today · Tomorrow · This week · Later, or not sure |
| `feel_title` | What might you feel there? |
| `feel_hint` | Pick up to two. |
| `feel_more` | Something else |
| `pull_title` | What might you want to do? |
| `not_sure` | Not sure |
| `moment_title` | What's the moment you're most worried about? |
| `moment_own_hint` | Say it your way |
| `plan_title` | If it happens, I'll… |
| `plan_if` / `plan_ill` / `plan_and` | If · I'll · and |
| `plan_use_pull` | Plan for the pull instead |
| `plan_use_moment` | Plan for the moment instead |
| `plan_add` | Add one more |
| `plan_own_hint` | Say it your way |
| `rehearse_intro` | Picture it as if it's happening now. You're in it, not watching. |
| `rehearse_next` | Next |
| `rehearse_again_q` | Once more, with something you didn't expect? |
| `rehearse_again_yes` / `rehearse_again_no` | Yes · That's enough |
| `rehearse_new_problem` | Something you didn't plan for happens. |
| `rehearse_keep_move` / `rehearse_change_move` | Keep the same plan · Change what I'll do |
| `settle_title` | Let your body come back to now. |
| `settle_breath` / `settle_five` / `settle_ok` | Three long breaths out · 5-4-3-2-1 · I'm OK |
| `settle_hold` | Hold while you breathe out, slowly. |
| `settle_hold_hint` | Three times. Let go between them. |
| `keep_title` | Here's your plan. |
| `keep_yes` / `keep_no` | Keep this · Not now |
| `keep_failed` | Couldn't save that. Try again. |
| `keep_done` | Kept in My words. |
| `ask_after_q` | Want me to ask how it went? |
| `ask_after_yes` / `ask_after_no` | Yes · No thanks |
| `done` | Done |
| `entry_dear_man` | Rehearse it |
| `entry_recover` | Walk through it with Cope Ahead |

### Rehearsal beats (`RehearsalBeat`, in order)

| order | id | text |
|---|---|---|
| 1 | `arrive` | You're arriving. Picture where it happens. |
| 2 | `around` | Notice what's around you: what you see, what you hear, your feet. |
| 3 | `moment` | Then it happens: {moment}. |
| 4 | `notice` | You feel it rise. You know this moment. You planned for it. |
| 5 | `plan` | You do your plan: {plan}. |
| 6 | `through` | It's still hard, and you keep going. |
| 7 | `over` | Then it's over. |

`{moment}` is the chosen moment's `ifText` (or own words); `{plan}` is the move lines joined with
"and". Beat 7 shows under beat 6 on the same screen. The *once more* pass runs beats 3–7 with
`rehearse_new_problem` above beat 3.

### The after card (`cope_ahead_after`)

| key | text |
|---|---|
| `after_q` | How did {afterName} go? |
| `after_better` / `after_expected` / `after_harder` / `after_not_yet` | Better than I feared · About what I expected · Harder than I expected · It hasn't happened yet |
| `after_plan_q` | Did your plan help? |
| `after_plan_helped` / `after_plan_unsure` / `after_plan_unused` / `after_skip` | Used it, it helped · Used it, not sure · Didn't use it · Skip |
| `after_plan_line` | Your plan: {plan} |

## Never

- Never predicts how it will go, and never reassures (*"It'll be fine"*).
- Never asks for more than one hardest moment. The rehearsal always ends with getting through it.
- No scale, score, streak or "confidence".
- Never pre-fills a past plan into a new visit. A kept plan is in My words, where the person can find it.
- Never shows a part's name outside the parts step and the person's own plan card.

---

## As built (17 Oct)

- **Where:**
  - `src/pages/tools/CopeAhead.tsx` (lazy) and `src/components/tools/copeAhead/`:
    - `PlanScreens` (screens 1–4 and once more);
    - `PlanAnchor`;
    - `Rehearse`, `Settle` and `KeepCard`, which are presentational;
    - `PlanSentence`;
    - `CopeAheadEntryLink`.
  - The pure step machine is `src/lib/copeAheadTool.ts`. It handles the order, the If toggle, moves by
    pull, the danger move first, two moves at most, own words in every slot, and once more.
  - Listed under Emotion Regulation, with the intent *"Something's coming up that I'm dreading"*.
- **One plan sentence.** `planLine(content, ca)` in `src/lib/copeAheadPlan.ts` returns
  `PlanParts { ifText, moves, text }`. The keep card, the rehearsal's plan beat and the after card all
  call it.
- **Content:**
  - `scripts/cope-ahead/content.py` → `schema/cope-ahead.cypher` (five constraints, loaded after
    `wise-mind`).
  - `getCopeAheadContent` serves it, and `src/data/content/cope-ahead.json` ships it.
  - The Copy section above, as written. The voice lint needed no changes.
  - `dbt_cope_ahead.appToolId = 'cope-ahead'`, out of `PLANNED`. The anticipatory row stays off and a
    draft.
- **The visit:**
  - `ext.ca` is registered, with a closed-set `one` type for `when`, `ifFrom`, `rehearsed` and `settle`.
  - The page sends every unset field as null and the server drops them, so a cleared answer doesn't
    linger after the per-namespace merge.
  - `PROFILE_NEEDS['cope-ahead']` reads the parts anchors.
  - *Keep this* saves the plan line to My words through `recordWitnessBeat`, as the `cope_ahead` moment
    (own-line limit 360).
- **Safety:** a danger moment shows `CrisisBanner` compact under screens 3 and 4. The flow goes on.
  `dangerBanner` in `copeAheadTool.ts` picks the variant: `other_person` for *They might hurt me*, the
  default for *I might hurt myself*. A test fails if a new danger moment isn't placed in one of the two.
- **Keep:** after *Keep this* saves, *"Kept in My words."* (`keep_done`) replaces the two buttons as a
  polite status line.
- **The after card:**
  - `cope_ahead_after`, with chips `today` / `tomorrow` / `this_week` / `later`.
  - The card holds the first answer on the device. The second tap sends both in one `resolveFollowUp`
    (`choiceId` + `planHelped`). Skipping or leaving sends the first alone.
  - Reflect credits `planHelped: 'helped'` to Cope Ahead only.
  - With a part, the server writes `PartTag {source: 'cope_ahead'}`, which counts for *helped* and never
    for *when*.
  - There's a `PracticeSkill` for Cope Ahead.
- **Ways in:**
  - `src/lib/copeAheadEntry.ts` holds `copeAheadLink`, `parseCopeAheadEntry` and `situationsWithFirst`.
  - DEAR MAN's summary shows *Rehearse it* above *How did it go?*, carrying the part only with parts on.
  - Recover's `recover_rehearse` card on Today shows *Walk through it with Cope Ahead*.
- **Review:**
  - `dev/review/copeAhead.tsx` is the whole flow, with 47 branches.
  - `cope-ahead-closing` covers the three closing components, `cope-ahead-entries` the links, and
    `cope-ahead-after` the Today card.
  - a11y is clean on each.
- **The parts step's own question.** Cope Ahead asks *"Who might show up there?"* (`cope_title_any`, a
  parts draft). `CopeAheadStep` takes it as `titleId`, and the step's gate is `COPE_AHEAD_PARTS_REQUIRED`
  (DEAR MAN's set plus that prompt). DEAR MAN keeps *"Who might show up in this conversation?"*.
- **Anchors stay one line.** `anchorableLine` (`functions/src/parts/keepTypes.ts`, mirrored in
  `src/data/partsTypes.ts`) allows a kept line as an anchor only if it is at most 90 characters and isn't
  an own line kept from the `cope_ahead` moment. DEAR MAN's anchor picker filters by it, and
  `setPartAnchor` refuses any other line, so a whole plan stays in My words and is never offered as an
  anchor.
