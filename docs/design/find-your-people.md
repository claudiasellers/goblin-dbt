# Find your people (IE-09)

**Status:** part 1 built 12 Nov 2026 on the skill runtime (batch IE-B5 of [the modules plan](dbt-modules-plan.md), the
first of its three skills). Tool `finding-connection`, listed under Interpersonal Effectiveness with the Tools intent
*Feel less alone*, on the new concept `dbt_building_relationships` (`appToolId: 'finding-connection'`, `PART_OF`
`dbt_interpersonal_effectiveness`). Source: `scripts/skills/finding_connection.py`. Tests:
`tests/skill-finding-connection.test.mjs`, `functions/test/unit/findingConnection.test.cjs`. New follow-up type
`reach_out_outcome`, new projection `PROJECTIONS['finding-connection']` (`functions/src/findingConnection/projection.ts`:
the `Interaction {kind: 'reach_out'}`). No new embed (the rehearsal is a timed `holdRing`). Close kind `none`: the outcome is the card's answer. Rolling back
is removing `'finding-connection'` from `src/lib/skillRuntime/playerTools.ts` and the tool from `src/data/tools.ts`, and
putting `"planned": True` back on the four exits below.

Spec: PRD IE-09 in `PRD – Interpersonal Effectiveness.md`, DBT IE Handouts 10–11 (finding and keeping friends:
proximity, similarity, conversation skills, joining in), the liking gap (Boothby, Cooney, Sandstrom & Clark 2018).

## What it is for

"I don't have anyone to ask." "Everyone would say no." Before this, four skills offered *Find your people* as a planned
link that never showed: FAST's Let go (*meet it elsewhere*), Ending a relationship's after check-in, the DEAR MAN
debrief's fix for *What I wanted isn't something they can give*, and Problem Solve's *Find someone to lean on*. The skill
turns *no one would want me* into one small experiment with a guess before and a check after, done off the phone.

## The flow

| Step | What the person sees | PRD IE-09 |
|---|---|---|
| `start` | *Where do you want to start?* (*Feeling cut off from people is common, and it can shift in small steps. Pick the one that feels most possible.*) Being around people · Finding people like me · Starting or keeping a conversation going · Keeping a friendship going · Joining something. Opened after a no or an ending (`?frame=elsewhere`), first: *This is about other people in your life, not the one this was about.* | 1. Where to start |
| `heads_up` | A carried flooded reading: *Your body's loud right now.* (*Reaching out lands better once it settles a little.*) Look after the next few minutes first → `settle` (First, the body) · Try a small one anyway | Band: flooded → not offered (a departure, below) |
| `step` | *Pick one small step.* (*Smallest first. A small one done counts for more than a big one planned.*, replaced by the smaller-step or low line when one shows) Four to six steps for the area, smallest first, or own words. A stirred reading, flooded and trying anyway, or a Low drive / Freeze card (`?frame=low`) sees the smallest only, with *The smallest ones for now. Bigger ones are here on a steadier day.*; *Pick a smaller step* from `again` sees the smallest only too, with *The smallest ones. Any of these counts.* | 2. Graded chips; stirred → smallest tier |
| `predict` | *Before you do it: how do you think it'll go?* (*A guess is enough. You'll check it afterwards.*) Well · Mixed · Badly · No one will respond; optional *If you talk to someone, how much do you think they'll like you?* Not much · Some · A lot. A step with nobody on the other end (`predict_solo`: *ten minutes somewhere with people around*, *look up one group*, *find one thing that meets*, …) gets Well · Mixed · Badly only, and no liking question | 3. Predict, two taps |
| `picture` | *Picture it for a few seconds: {step}.* with the guidance on screen (*Where you are, the first thing you do or say, and you doing it anyway if it feels awkward.*), then a 15 s timed `holdRing`, no breath instruction; done: *Pictured. That's a rehearsal.* | Not in the PRD: a short rehearsal (H11's practice, Cope Ahead's move), the flow's one moment that isn't chips (plan §6 Gate 2) |
| `when` | *When will you do it?* Later today · This evening · Tomorrow · In a few days · Sometime this week; *Want me to ask how it went?* Yes books `reach_out_outcome` | 4. When → FollowUp |
| `set` | *Your step: {step}.* *Doing it is the experiment. How it goes is information, not a verdict about you.* (with the reminder: *I'll ask how it went.* first) | Data, not verdict |

### The steps

Paraphrasing H10–11's range. Tier 1 is what a stirred reading sees.

| Area | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Being around people | ten minutes somewhere with people around; hello to one person you see anyway | the same place at the same time twice this week | somewhere people do a thing together, twenty minutes |
| Finding people like me | look up one group or class; reply to one post in a group | one online meetup, camera off is fine | go once to a group or class |
| A conversation | reply to one message; ask one question back | one extra sentence to someone you see anyway; one small true thing about your day | start a conversation with someone you half-know |
| A friendship | a message that says you thought of them; reply to someone you owe a message | ask how something they told you about went | invite someone to something low-key |
| Joining something | find one thing that meets regularly; look at what's on near you this week | sign up for one thing; offer to help once | go once, and stay to the end |

Every step is an outward action. None asks someone whether they still like you (reassurance-seeking) and none is
*vent to a friend* (co-rumination); a test pins both.

### When the card comes back

`reach_out_outcome` (Today card *Your small step*: *A step towards people you picked. Did you do it?*, never naming the
step or anyone) reopens the run at `back` (R9 `reopens`, only on a run that reached `when`). The prediction reads back
with the run, so the gap is the run's own.

| Step | What the person sees |
|---|---|
| `back` | *Earlier you picked: {step}. Your guess: {guess}.* (the prediction, read back before the check) *Did you do it?* I did it · Not yet · I decided not to |
| `went` | *How did it go?* Well · Mixed · Badly · No one responded; optional *How much did they seem to like you?* Not much · Some · A lot · Can't tell. A solo step (`went_solo`): Well · Mixed · Badly, no liking question |
| `gap` / `gap_hard` | The title compares, the first that fits: *No response yet.* · *It went better than you predicted.* (someone responded after a guess of no one, unless it went badly) · *That was hard, and you did it.* (predicted badly, went badly: never read back as proof) · *It went about how you predicted.* · *It went worse than you predicted.* · else *You did it.* Then one line, the first that fits: no response → *People miss messages, get busy, forget. It says little about you.*; worse, or went badly → *One try is information, not a verdict about you.* (and Recover when it went badly); they seemed to like you more than you guessed → *They seemed to like you more than you guessed. People often guess low on that.*; better → *That gap is worth noticing.*; else *Each try tells you a bit more about how people actually respond.* After *Badly* or *No one responded* the screen is `gap_hard`, whose safety link reads *I might hurt myself* (a rejection is a risk moment, and a low-energy check-in carries no crisis banner); every other screen has *Talk to someone now* |
| `again` | Not yet: *Not yet is fine.* Pick a new time (a new card) · Pick a smaller step · Leave it for now |
| `not_doing` | *That's a real answer.* *Deciding not to is allowed. Your step is here when you want it.* |

*Talk to someone now* is on every screen but `gap_hard`, where the same exit reads *I might hurt myself*.

## Saved

- `ToolSession.ext.run` (the run); own words encrypted at close as for every skill.
- `Interaction {kind: 'reach_out', source: 'finding-connection'}` (log, `HAS_INTERACTION`) on the card's visit when it
  answers *I did it* or *I decided not to*: `area`, `stepId` (null for own words), `happened`, `predicted`,
  `likingPrediction`, `outcome`, `liked`. Ids only. No `WITH` edge: the skill has no person picker yet.
- The rep: *I did it* logs `followup_offphone` (`OFF_PHONE_SKILLS.finding_connection`, the PRD's `reached_out`); *Not
  yet* and *I decided not to* log none; the first visit keeps the close's own.

## Routing

`CONCEPT_TAGS['finding-connection']`: side change, skillKind relational, direction up. One word row, live with the
module (connected by default, 12 Nov 2026): *lonely* / *isolated* on Low drive (`reward_drive_low`, their reviewed
pattern) lead with Find your people, and Running low (the pattern's lead) is the second card. Never on a flooded result
(the row is steady and stirred only). The concept has no `ADDRESSES` edges: the legacy ranker counts any `dbt_*`
concept that reaches a pattern's emotions, so an edge would move the kill-switch baseline; the word row does the
routing. Keep it warm's note in `scripts/recommendations/content.py` had set these two words aside for this skill.

## Entry points

- Tools list and the intent *Feel less alone*.
- FAST's Let go: the *meet it elsewhere* hand-offs (`after`, `elsewhere`), with `?frame=elsewhere`.
- Ending a relationship's after check-in, on *Holding steady* or *Pulled back toward them*, with `?frame=elsewhere` (the PRD's Ending risk: the urge to reach out to them gets the opposite action, so the screen says first that this is about other people).
- DEAR MAN's debrief, the fix for *What I wanted isn't something they can give*, with `?frame=elsewhere`.
- Problem Solve's companion links (*Find someone to lean on*).
- The check-in result for lonely / isolated (above). The card opens `?frame=low` on Low drive and Freeze (`CARD_FRAMES` in `src/lib/recommendation.ts`), so a low-energy pattern sees the smallest steps.

## Departures from the PRD, and the batch that picks each up

| PRD | Part 1 | Later |
|---|---|---|
| Psychoeducation after three experiments, only if the person's own data matches | The liking line on the gap screen, from this run's own answers | Part 2: needs a count of the person's `reach_out` outcomes (a server read, like the debrief's refusal counts) |
| *Add them to your people?* (IE-03), *do they get you?* (Witness) | Not offered | Part 2, with the picker on the outcome; Witness with WMP |
| Fade: a tier advances after two experiments; after eight, the person's own next step and the list collapses; the Insights card monthly | Not built: every tier is a choice (the band limits it) | Part 2, with the same count |
| `ConnectionFlow` / `ConnectionArea` / `ConnectionStep` / `ConnectionPsychoed` nodes | The skill's options (graph content through `skills.cypher`, each step with `area` and `tier`) | When a second surface needs the steps |
| *find people like me*: interest chips from `Goal` / `Value` | General steps; the person's own words | With ER-04's things I like directory (the PRD's open question) |
| `ADDRESSES → loneliness, emptiness, rejection` | None (Routing above) | If the legacy ranker is retired |
| People (*add someone new*), Insights weekly card entry points | Not wired | IE-03's Me surface, Insights |
| Low-energy patterns (freeze, low reward) see the first tier only | The check-in card on Low drive or Freeze opens with `?frame=low` (smallest only), and a stirred or flooded reading sees tier 1 only. Other ways in carry no pattern | Pass the pattern in when hand-offs carry it (a `pattern` ctx key is a runtime change, C7) |
| Band: flooded → not offered | Offered, after a heads-up: *Look after the next few minutes first* (First, the body) or *Try a small one anyway*, which sees the smallest only. Nothing in the app is a lock (D1), and a hard refusal is the message this skill exists to answer | None planned |
| Flooded is asked before anything else | The heads-up comes after *Where do you want to start?*: the runtime has no conditional start step, and Good things and Values put it in the same place | If the runtime gets a conditional start |
| *Will they like you…* more than you think · about what you think · less than you think | An absolute guess (*Not much · Some · A lot*) before, and *How much did they seem to like you?* after; the skill works out the gap from the two, so the person never has to hold a comparison in mind | None planned |
| The same prediction for every step | Steps with nobody on the other end (*sit somewhere with people around*, *look up one group*) get no *No one will respond* and no liking question: asking how much people liked you after sitting in a café invites approval-scanning | None planned |

## Risks (PRD) and what answers them

- A real rejection confirms the belief: *information, not a verdict*; Recover on *badly*; *No response yet* never called worse.
- Reassurance-seeking disguised as connection, co-rumination: the step list (test-pinned). Own words aren't screened for either: nothing in the app lints what a person writes.
- Reaching back to the person who refused them or the one they ended things with: hand-offs from FAST, Ending and the debrief open with *This is about other people in your life*.
- Thwarted belonging after a rejection or no reply: `gap_hard`'s safety link reads *I might hurt myself*.
- The liking prediction is kept on the `Interaction` (`likingPrediction`) as the person's own guess, an id from a three-word scale; nothing reads it as a score.
- Social anxiety at clinical levels: the smallest steps first and only on a stirred reading; *I decided not to* is a full answer; *Not yet* offers a smaller step.
