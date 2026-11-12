# DEAR MAN's debrief on the skill runtime (IE-B2, second PR)

Built 11 Nov 2026. PRD: `prd-interpersonal-effectiveness.md`, IE-01 Mode D and IE-11 (DBT IE Handouts 5 and 9).
Plan rows: IE-01, IE-03, IE-11 and IE-B2 in [`dbt-modules-plan.md`](dbt-modules-plan.md). People and the safety
question: [`people.md`](people.md).

## What it is

*I just had a conversation* (DEAR MAN's entry), the prep summary's *After the conversation → How did it go?* and
the new `ask_outcome` card all open `/tool/dear-man?mode=debrief`. The page asks who it was with, then plays the
`dear_man_debrief` skill (`scripts/skills/dear_man_debrief.py`) on the skill player. The hand-built debrief
phases in `DearMan.tsx` are gone; since IE-B4 the hand-built prep is too, and `DearMan` only chooses the mode once
per visit.

```
?mode=debrief ─► who was it with? (PersonPicker, the safety question when the answer isn't fresh)
   ├─ they might hurt or control me / rather not say ─► the safety screen (PersonSafetyRoute, the debrief's heading)
   └─ else ─► dear_man_debrief, $ctx.personId (kept people only), $ctx.partId (from the prep's cope ahead)

feel (≤ 3; shaky / wound up → *Settle my body first*, Cool Down)
happened ─┬─ not yet ─► a prep, Cope Ahead (`first=conversation`), rehearse (planned)
          ├─ I decided not to ─► accepted, no rescue, no offers
          └─ yes ─► outcome (got it · partly · no · no answer yet) ─► still okay between you?
                      ├─ I don't feel safe with them ─► unsafe (other_person resources, Ending careful, Talk to someone now)
                      └─ proud of how you did it?
                          ├─ shaky / wound up (first step) ─► later (no recall now; Cool Down; ask again?)
                          ├─ no answer yet ─► look at how it went (the chain) or leave it (ask again?)
                          ├─ got it ─► the readout ─┬─ look at what worked ─► the chain
                          │                          └─ enough for now ─► good (GIVE planned when it's shaky between you;
                          │                                               FAST when not proud of how)
                          └─ partly / no ─► factor (IE-11, one chip) ─┬─ look at what happened first ─► the chain
                                                                       └─ a factor ─► fix
chain: moment → response → body → thought (own words) → underneath → who showed up (parts) → reflection → what to
       try → rehearse it → the moment plan (boundaryLine, list) ─► factor again (bad outcome) or good
```

## IE-11: what got in the way

Handout 9's factors, phrased as things that happen (`TROUBLESHOOT_FACTORS` in `scripts/dear-man/content.py`, nodes
`TroubleshootFactor` that `IMPLEMENTS dbt_dear_man`, `SUGGESTS_FACTOR` from the turning points that point at them):

| Factor | The fix (one line) | Offers |
|---|---|---|
| I couldn't find the words | a line ready ahead of time, said out loud | rehearse (planned), Cope Ahead, try again |
| I wasn't sure what I wanted | pick the one thing first | try again |
| My feelings took over | a plan for the moment, and a check before | Cope Ahead, try again |
| A worry or belief stopped me | worries can be checked | Check the Facts, Thoughts passing through, try again |
| I settled for ending it fast | keep self-respect in view | FAST, try again |
| They hold more power | a smaller ask, another route, or the relationship itself | FAST, Ending a relationship, Let it be |
| They can't give it | the need is real, maybe met elsewhere | FAST's Let go, Find your people (built 12 Nov) |
| I asked well, and they still said no | asking skilfully doesn't decide their answer | FAST, FAST's Let go |

When the turning point was *They got defensive*, the end card (`good` or `fix`) also offers Notice them (IE-10) with `situationId=look_again` and the person: what they did, what I added, and what might have been going on for them (12 Nov).

One chip. The chain is reachable from the factor step (*look at what happened first*) and comes back to it, which
asks again (`clears: ['factor']`), since the chain can change the answer.

## Records

- **`ext.run`** on the visit's ToolSession, as every skill.
- **Projection** (`functions/src/dearMan/debriefProjection.ts`, `PROJECTIONS['dear-man']`, in the close's
  transaction): the legacy `DearManSession {type: 'debrief'}` (id = the ToolSession's; `DETAIL` from it, so
  history, parts moves and trails read it as before), with the old fields mapped (`debriefOverall` from the
  outcome, the chain's ids, `copeAheadId`, `reflectionLanded`) plus `happened`, `outcome`, `relationshipOk`,
  `selfRespect`, `factorId`, and the thought's own words encrypted (`thoughtOwn`). `WITH_PERSON` the kept person;
  `DEBRIEFS` the prep it is about: the prep whose `ask_outcome` card opened it (only when that prep is with the same
  person), else the person's latest prep in 14 days. When the picker was used and nobody kept (`$ctx.personId` is
  `none`), no prep's person is borrowed. A person on the safety route (stored risk harm or rather not say) is never
  linked or counted, as `saveDearManSession` refuses a plan for them. A debrief about a prep resolves that prep's
  open `ask_outcome` card, however the debrief was opened, so Today never asks twice.
- **`Interaction`** (new log label, `HAS_INTERACTION`, exported as `interactions`): one per debrief with an answered
  outcome. Ids only: outcome, situation type, still okay between you, proud, factor. `WITH` the person.
- **Refusal counts** on the `Person` (`refusalsValidation`, `refusalsPractical`): written only when the Interaction
  is first created (a re-close never counts twice), only with a prep to say what was asked and a kept person. A
  refused ask (*No*) adds one to its kind; *I got it* or *Partly* sets that kind back to zero; *No answer yet*
  changes nothing. The
  person's own answer is the yes (plan §C2.5): no resolver reads a log; the `people` slice reads the field.
- **The rep** is self-reported off the phone (`followup_offphone`, as the old debrief's) when the conversation
  happened, and none when it didn't (`runRep` in `functions/src/skills/projections.ts`).

## Safety inside the run (Gate 3)

The picker's answer can be from before the conversation (a fresh answer skips the question), so the run has its
own: *I don't feel safe with them* on *Is it still okay between you?* shows the other-person resources and ends on
Ending a relationship (`frame=careful`) and *Talk to someone now*, never a retry, rehearsal or Cope Ahead; the
projection sets `Person.safetyRecheckAt`, so the next prep or debrief asks the safety question again
(`needsSafetyAsk`, both mirrors). *Hurt* or *Defeated* on the first step and *I can't handle this* among the thoughts
add *Talk to someone now*. Without the picker's copy the page shows the load error, never the skill without it. These replace the old
debrief's silent check-in, whose crisis banner came from `getStateAndTools` on the debrief's feelings.
*Not yet*, *No answer yet* and the shaky deferral each offer *Want me to ask again?* (ask_outcome).

## The prep↔debrief link

- **`ask_outcome`** (switched on; `scripts/practice-spine/content.py`): the saved plan asks *When is the
  conversation? I can ask how it went, after.* (later today · tomorrow · this week). The card opens
  `?mode=debrief&followUp=…`; opening it resolves it (`OPEN_RESOLVES`); only a DEAR MAN visit can schedule one
  (`FOLLOW_UP_SESSION_TOOL`). The card names no one.
- **The summary link** carries the kept person (`person=`) and the cope-ahead part (`partId=`). A kept person with a
  fresh, not-safety answer skips the picker.
- **Let go** (Claudia, 11 Nov): once the debrief has counted a refused ask to be heard by someone
  (`refusalsValidation ≥ 1`), the next prep for an ask to be heard (address, pattern) with them offers FAST's Let go,
  above the priorities. Offered, never in the way. *It tends to go badly* stays a heads-up only.

## Decisions (Claudia, 11 Nov: "go with your recommendations for all")

- Re-ask the safety question after 90 days and on *Things changed* (built in the first PR, kept).
- *It tends to go badly*: the heads-up only, with Let go after the first refused ask to be heard, once the debrief
  counts them (this PR).
- The old debrief's end cards (*That took courage* with the check-in's tool cards) and its silent check-in
  (`saveCheckIn` from the debrief's feelings, `getStateAndTools`) are dropped. How they feel now is the first step;
  the shaky and wound-up answers offer Cool Down there.
- An unsafe person's debrief gets the same safety screen as the prep, with its own heading (*Thank you for telling
  me. With {who}, your safety comes first.*).

## Departures from the plan

- **The picker is the page's, not an embed.** `personPicker` as an embed would need an embed that writes `$ctx`;
  the page asks first and passes the result into the player (`SkillPlayer`'s new `ctx` prop), in the same visit, so
  the ToolSession and a card's `RESOLVING` edge stay. The safety route is therefore never inside the skill at all.
- **`whoShowedUp`** is the embed's report in `ext.run.out` now, not `ext.er.whoShowedUp` (nothing read it).
- **Reflections and rehearsals are re-voiced** in the skill (no physiology, no *just*); the `Reflection` and
  `CopeAhead` nodes keep their text for older readers. `getDearManDebriefContent` and `getDearManReflection` stay
  deployed, unread by the app.
- **No routing rows**, as before (`NO_ROWS`).
