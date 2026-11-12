# One message on the skill runtime (IE-B3, second PR)

Built 12 Nov 2026. PRD: `prd-interpersonal-effectiveness.md`, IE-01 Mode A (*The Ask*, adopted from the Wound PRD
§4.3 with its deltas; DBT IE Handouts 5 and 7). Plan rows: IE-01 and IE-B3 in [`dbt-modules-plan.md`](dbt-modules-plan.md),
D11 (three skills under the one `dear-man` id: the prep, one message, the debrief). It reuses Say no's pieces
([`say-no.md`](say-no.md)): `PersonFirstSkill`, the `messageComposer` card, the plain prediction asks. People and the
safety question: [`people.md`](people.md).

## What it is

`/tool/dear-man?mode=one`, from the Tools intent *Send someone one clear message*, and from Recover's *Ask them* when
the pull was to chase (Recover used to send that case to the full prep with a "one message only" line). Who it's for
comes first (`PersonPicker`, One message's question and safety heading), then the `dear_man_one` skill
(`scripts/skills/dear_man_one.py`) on the player in the same visit.

```
/tool/dear-man?mode=one ─► who's it for? (PersonPicker; the safety question when the answer isn't fresh)
   ├─ they might hurt or control me / rather not say ─► the safety screen (One message's heading), never the skill
   ├─ it tends to go badly ─► $ctx.frame = heads_up (short, written, one practical thing)
   └─ else ─► dear_man_one, $ctx.personId; refused: validation once the debrief has counted a refused ask to be heard

source     where's this coming from? calm · mostly hurt or angry · not sure        (wise_mind_check; flooded → Settle my body first)
about      something I need · something that happened · something that keeps happening   (DEAR MAN's situation types)
fact       what happened, the way a camera would see it                          (Describe; chips follow `about`, or own words)
felt       I felt…                                                               (Express: feelings, never what they meant;
                                                                                  Recover's word first, never picked)
give       a warm line (optional)                                                (GIVE in one line; chips follow `about`)
ask        the ONE thing you're asking for                                       (Assert; heads_up drops asks to be heard;
                                                                                  refused → Let go offered beside them)
why        why it matters (optional)                                             (Reinforce)
   ├─ calm, and no stirred or flooded body ─► message
   └─ else ─► cool (BEFORE the card and its Copy): read it aloud (the card) · hold it for ten minutes (waitLock, then
              the card) · save it and remind me · settle my body first (saved with a reminder, First, the body offered)
              · I'm good to send it (the card); sending is never locked
message    the messageComposer card in that order: the FAST strip (Take the sorry out), Copy / Open messages
predict    how will they take it? well · mixed · badly · won't answer
sure       how sure are you? (optional, its own screen)
sent       *One message, said once. Give them room to answer.*  Want me to ask how it went? (ask_outcome)
```

*Save it and remind me* and *Settle my body first* end the visit on `later` (*Pick a time and a reminder brings it back.
It won't say who it's for or what it says.*; settling has its own line and offers First, the body) with the `ask_delayed` chips (in an hour · this evening · tomorrow). Its card (*Something you saved*) reopens the run at
`back` (R9: `?mode=one&run=&at=back`):

```
back ─┬─ yes, show me the message ─► resend (the card) ─► predict ─► sure ─► sent
      ├─ not yet ─► later (another reminder)
      └─ I've changed my mind ─► dropped (a real choice too; no rescue)
```

## The message card

The same `messageComposer` as Say no, with a new optional prop, `parts`: the fields in the order they're said
(`fact`, `felt`, `give`, `ask`, `why`). Without it the card keeps Say no's fixed order. One message sets no
`repeatLabel` (one message, said once: there's no line to repeat). The FAST strip's sorry line is One message's own
(*Asking for something isn't a wrong. Keep it only if it's for something you did.*: Handout 7 drops the unwarranted
sorry, not every one). The line shows only beside *Take the sorry out*, and that now also takes out own words' usual
"Sorry to ask / to bring this up". The app never sends.

## Records

- **`ext.run`** on the visit's ToolSession, as every skill; `emotionId` and `refused` steer the run and aren't kept
  (`RECORDED_CTX`), like `band`.
- **The reopened visit** carries the person and frame its first visit recorded (`recordedPersonCtx`), so a second *Not
  yet* still reopens through the safety check and its record still names the person.
- **`DearManSession {type: 'prep', mode: 'one_message'}`** (`functions/src/dearMan/oneProjection.ts`, inside
  `PROJECTIONS['dear-man']` beside the debrief's), written at close once the prediction is answered: `situationType`
  for the debrief's refusal counts, from the ask itself (an ask to be heard is `address`, or `pattern`; a practical ask
  is `ask`; own words fall back to `about`), `aboutId` (the `about` answer), the option ids picked (own words become `own`, never copied), `coolId`, `prediction`,
  `predictionConfidence`, `sentHow` (copied / opened / dropped_sorry), `DETAIL` from the ToolSession and `WITH_PERSON`.
  That is the record the debrief reads: the `ask_outcome` card this visit booked opens `?mode=debrief`, whose projection
  finds the prep through the card (`DEBRIEF_PREP_QUERY`), so the person and what was asked carry over and a refused ask
  to be heard is counted as for a prep. A visit `ask_delayed` reopened reads the person from the first visit's run.
  Someone on the safety route is never linked. History (`getDearManSessions` returns `mode`) labels it *One message*.
- **`ask_delayed`** (`scripts/practice-spine/content.py`; `FOLLOW_UP_SESSION_TOOL`: only a DEAR MAN visit books it;
  `OPEN_RESOLVES`). Stale after 48 h, no push; its copy names no one and says nothing about a message (tech safety).
- **`ask_outcome`** as the prep books it (chips this evening · tomorrow · in a few days).

## Safety

- The picker and safety route before the skill (D4), shared through `PersonFirstSkill`; a reopened `?run=` goes
  through the same `reopenGate` as Say no.
- *It tends to go badly*: the heading *Keep it short, written, and about one thing. What's it about?*, and no asks to
  be heard (PRD step 0); practical asks stay.
- A person who has turned down an ask to be heard (`refusalsValidation ≥ 1`): Let go (FAST, `frame=let_go`) is a link on
  the ask screen when the message is about something that happened or keeps happening. Every ask is still there: a route, never a gate on the person's words (PRD step 3).
- Hot or stirred: the cooling screen before the card, never a lock. Flooded: Settle my body first on the first screen;
  on the cooling screen it keeps the message (saved, with a reminder), so settling never costs the draft.

## Routing

DEAR MAN's one check-in row (12 Nov, connected by default; `NO_ROWS` is empty since the safety question shipped in
IE-B2): Social threat, *let down* or *left out*, beside Recover (`rf_social_threat_shame_words_ask-for-it_dear-man`).
It opens the prep (picker first). Not on *rejected* or *humiliated* (a wound to recover from first), never Flooded.
The same PR lets a reviewed per-word row fill the second card past the swap rule (`select.ts`): before it, the rule (a
different skill kind, never two change skills) kept this row, FAST's and Say no's off the card they were written for.

## Departures from the plan

- **`wise_mind_check` is an ask step**, not an embed: three chips, the runtime's own ask. MF can lift it into an embed
  when it has a second consumer. Its answer isn't the session's ask-fresh `wiseMindAnswer`: it steers this message only.
- **No `Interaction` at send.** The PRD has Mode A write one; the debrief writes it when the outcome is answered, as for
  a prep, so one ask is one Interaction. The prediction is on the prep record for the debrief's readout later.
- **No *talk to the angry part*** on the cooling screen yet: Recover's angry-part card runs before the hand-off.
- **No predicted-vs-actual readout** in the debrief yet (the prediction is stored for it).
- **The prediction is required** (the PRD has it skippable): it is what makes the visit a prep the debrief can look
  back on. *How sure* is optional.
- **No receive beat** (WMP-01) when opened straight from Tools (PRD Index §7c #31); Recover's hand-off has had its own.
- **`$ctx.emotionId` is one word**, not R2's `emotionIds`: Recover hands over one word, and `firstFrom` puts one
  option first.
- **Not yet:** `sentWhile`, the `asked_steady` / `held` reps (the visit counts DEAR MAN's default rep, saved or
  dropped too), and the paper card filling in line by line as the person builds it (Gate 2).
