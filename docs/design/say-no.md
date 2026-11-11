# Say no on the skill runtime (IE-B3)

Built 11 Nov 2026. PRD: `prd-interpersonal-effectiveness.md`, IE-04 (Say no) with IE-07's sizing in its "no" form
(DBT IE Handouts 5 and 8). Plan rows: IE-04, IE-07 and IE-B3 in [`dbt-modules-plan.md`](dbt-modules-plan.md). People
and the safety question: [`people.md`](people.md). This is IE-B3's first PR: Say no, the `messageComposer` embed and
the sizing. One message (IE-01 Mode A, with `wise_mind_check` and `waitLock`) is the second.

## What it is

`/tool/say-no` (listed under Interpersonal Effectiveness for everyone; intent *Say no to someone*). The page asks
who's asking first (`PersonPicker`, the same component, copy and safety question as DEAR MAN's prep and debrief),
then plays the `say_no` skill (`scripts/skills/say_no.py`) on the skill player in the same visit.

```
/tool/say-no ─► who's asking? (PersonPicker; the safety question when the answer isn't fresh)
   ├─ they might hurt or control me / rather not say ─► the safety screen (PersonSafetyRoute, Say no's heading), never the skill
   ├─ it tends to go badly ─► the skill with $ctx.frame = heads_up
   └─ else ─► say_no, $ctx.personId (a kept person, or `none`)

ask        what are they asking for? (you're allowed to say no; a carried flooded reading → *Settle my body first*)
pressure   what do you think happens if you say no? (≤ 3)
   ├─ *I'm scared of what they'd do*, or *something sexual or physical* ─► No is enough
   │     enough (one-line refusals) ─► safe_card (boundaryLine) ─► safe_end (no close); other_person resources on
   │     every one of them, Talk to someone now and Ending with frame=careful on the end card
   ├─ a carried flooded reading ─► compose (no sizing)
   └─ else ─► why ─► firm ─► level ─► compose
why        what matters most here: keeping my no · them still feeling okay about me · me feeling okay about me
firm       five yes / not sure / no questions (Handout 8's factors for saying no)
level      the named level, then *Does that sit right?* (that fits · a bit softer · a bit firmer)
compose    a warm line first (optional) · your no (lines that fit the level) · one reason (optional) · something else
message    the messageComposer card: one message, the FAST strip, the line to repeat, Copy / Open messages
predict    how will they take it? how sure? message or in person?
sent       *Want me to ask how it went?* (no_outcome) ─► rehearse (planned) when in person
```

Afterwards the `no_outcome` card on Today (*How did it go?*, chips this evening · tomorrow · in a few days) reopens
the same run at `said` (R9: `?run=&at=said`), with `said`, `held` and `proud` cleared so they're always asked fresh:

```
said ─┬─ not yet ─► not_said (the line is still here)
      ├─ I said maybe ─► partly (a maybe buys time)
      └─ yes ─► held ─┬─ I gave in ─► gave_in (met flatly; rehearse (planned), Check the Facts for the guilt)
                      └─ yes / they didn't push ─► proud ─► held_end (not proud → FAST)
```

## The sizing (IE-07, "no" column)

A counting derive (R10), never a number on screen. Each *yes* counts 1, *not sure* half, *no* nothing; the questions
are phrased so *yes* leans toward refusing:

| Field | Question (Handout 8) |
|---|---|
| `f_cost` | Would saying yes cost you something you can't spare, like time, money or energy? |
| `f_values` | Would saying yes go against what matters to you? |
| `f_fair` | Is it more than they have a right to ask of you? |
| `f_given` | Have you already given a lot in this relationship lately? |
| `f_later` | Would a yes now make things harder later, for you or for them? |

`level` (the five) and `final` (the five plus the nudge, −1 / 0 / +1) look the total up in one table: below 1.5
*yes, or yes to part of it*; 1.5 *gently, or not yet*; 2.5 *no, and offer something else*; 3.5 *firmly, and hold
it*; 4.5 *firmly, and don't reconsider*. The level screen names `level`; the compose screen's no lines are filtered
by `final` (each `no` option carries the levels it fits, `$opt.levels`), so *a bit firmer* drops *I'd rather not*
and *a bit softer* brings *Not this time* back. Unsized (flooded), every line shows.

## The message card (`messageComposer`)

`src/components/skillPlayer/MessageComposer.tsx` over the pure `src/lib/messageComposer.ts`. Props name the run's
fields: `field` (the no, required), `opener`, `reason`, `alt`. It puts the picks together in that order as one
message on the keepsake paper (`PaperCard`), each part ending as a sentence. Under it, the FAST strip (Handout 7):

- an apology anywhere in the message gets *There's a sorry in there. You don't owe one for saying no.* and *Take the
  sorry out*, which removes the apology and keeps the rest of the sentence (*I'm so sorry, but I can't* → *I can't*;
  *I'm sorry to hear that, but no* → *No*), from the line to repeat too;
- a reason over 70 characters gets *One reason is enough. A long one can sound like it's up for debate.*

Then *If they push, say it again:* with the no on its own, Copy (select-to-copy when there's no clipboard) and Open
messages (`sms:?&body=`). The app never sends. It reports `copied`, `opened` and `dropped_sorry`, never the words.
Nothing is locked, at any band. One message (IE-01 Mode A) reuses the card.

## Records

- **`ext.run`** on the visit's ToolSession, as every skill. Close kind `none` (no then-vs-now question); the end
  cards close the session. Own words are encrypted at close (`spine/extOwn.ts`).
- **`Interaction`** (log, IE-03; `functions/src/sayNo/projection.ts`, `PROJECTIONS['say-no']`), written in the
  close's transaction once *Did you say no?* is answered: `kind: 'no'`, `source: 'say-no'`, `requestKind`,
  `pressureIds`, `prediction`, `said`, `held`, `selfRespect` (option ids only; own words become `own`), `WITH` the
  person. The first visit never asks `said`, so it writes nothing; the reopened visit doesn't carry `$ctx` (R9), so
  the projection reads the person from the first visit's run (its session `SCHEDULED` the card this visit is
  `RESOLVING`). Someone on the safety route is never linked.
- ***I'm scared of what they'd do*** sets that person's `safetyRecheckAt` (as the debrief's *I don't feel safe with
  them*), so the next visit with them asks the safety question again.
- **The rep**: *said yes* is `followup_offphone` (`OFF_PHONE_SKILLS.say_no`); *partly* / *not yet* log none; the first
  visit keeps the close's own (`unansweredKeepsOwn`).
- **`no_outcome`** (`scripts/practice-spine/content.py`; `FOLLOW_UP_SESSION_TOOL`: only a Say no session books it;
  `OPEN_RESOLVES`: opening its link resolves it). Stale after 120 h, no push.
- The profile cache is cleared after a Say no close (`PROFILE_WRITING_CLOSES`), so the picker shows the recheck.

## Safety inside the run (Gate 3)

- Before the skill: the safety question and route (D4), shared with DEAR MAN through `PersonFirstSkill`; the skill
  never runs without the picker's copy (fail closed).
- A reopened visit (`?run=`, the `no_outcome` card) skips the picker only once the run has loaded and is one the
  player will reopen (`reopenGate`, `src/lib/personFirst.ts`: same skill, same version). Nothing to reopen (offline,
  retention, a stale or edited link, a new version) is the picker, never a fresh run without it. A person moved onto
  the safety route since the first visit gets the safety screen, not *Did you say no?* (Gates 1 and 3). This covers
  DEAR MAN's debrief too.
- *I'm scared of what they'd do* is a danger option (`danger: other`): the `other_person` crisis slot on every
  screen after it, no sizing, no reasons, no negotiation, Ending a relationship with `frame=careful` and
  `safety.open` on the end card, no close question.
- *Something sexual or physical* always goes to No is enough, pressure or not (the PRD's open question, answered
  with its recommendation): nothing about it is weighed or sized, and it gets the same resources and Ending offer
  as *scared* (it can be coercion).
- *I gave in* is met flatly (*That happens. Your line is still here if you want it again.*), never a push to try
  again.
- A carried flooded reading: Cool Down offered on the first screen, no sizing, a short plain compose.

## Decisions to confirm (routed to Claudia)

1. *Something sexual or physical* always gets No is enough (the PRD's recommendation, built).
2. *I'm scared of what they'd do* marks the person for a fresh safety question next time, and doesn't set
   `Person.safe` to *not sure* on its own (the PRD's idea; nothing moves to the profile without the person's yes).

## Departures from the plan

- **No conflict card.** The PRD's "you've said yes to them a lot lately" card needs Interaction history that
  doesn't exist yet; it comes once Say no and GIVE have written some.
- **`predictOutcome` is three plain asks** (how they'll take it, how sure, message or in person), not an embed. A
  liking variant comes with IE-09.
- **No "three nos in a row → GIVE" rule.** GIVE (IE-06) isn't built; it is recorded as planned in IE-B4.
- **`wise_mind_check` moves to One message** (IE-B3's second PR), its first real consumer.
- **No `IMPLEMENTS` edges** for the skill's steps; the concept `dbt_saying_no` is `PART_OF` interpersonal
  effectiveness and joined by `appToolId` (`say-no`). No routing rows: Say no opens from Tools and its intent, like Ending a relationship.
