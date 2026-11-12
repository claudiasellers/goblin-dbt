# Keep it warm (GIVE)

DBT IE Handouts 6 and 6a; PRD IE-06 (`prd-interpersonal-effectiveness.md`). Built 12 Nov 2026 (IE-B4, third PR) as the
`give` skill on the skill runtime, under the new `give` tool id. Listed under Interpersonal Effectiveness for everyone,
with the Tools intent *Repair things after a fight, or keep it warm*.

Source: `scripts/skills/give.py` → `schema/skills.cypher`, `src/data/content/skills.json`. Page:
`src/pages/tools/Give.tsx` over `PersonFirstSkill`. Projection: `functions/src/give/projection.ts`.

## Who it's for

"I'm right, and it comes out as an attack." "They came to me upset and I got defensive." "We had a fight and I want to
repair it." "It's heating up and I need to step away." GIVE is the relationship side of interpersonal effectiveness:
keeping someone close while you hear them, repair, or ask. FAST stays co-present throughout, so warmth never turns into
self-abandonment.

## The page before the skill

Who it's with first: `PersonFirstSkill`, the same picker and safety question as DEAR MAN and Say no (people.md, D4).

- *They might hurt or control me* or *I'd rather not say* → the safety screen with Keep it warm's heading, *Keeping it
  warm isn't your job with {who}. Your safety comes first.*, and never the skill (PRD: GIVE is not offered with someone
  who isn't safe).
- *It tends to go badly* → `$ctx.frame = heads_up`: the before-an-ask screen keeps it short and plain; the repair's
  sent card suggests short and in writing.
- Two or more refused asks to be heard by them (`Person.refusalsValidation`, counted by the debrief on the person's own
  answer) → `$ctx.refused = validation`: the before-an-ask screen says GIVE is for practical asks with them, never a
  way to earn being heard (PRD's `invalidating` rule). Say no and One message use one refusal for Let go; this rule is
  the PRD's two.
- `?person=<kept id>` presets the picker (fresh safety answer only); `?situationId=` puts a way in first, never picked.

## The skill

```
what ─┬─ brought (angry → safe with them? scared ─► scared) ─► theirs ─► yours ─► b_card (pocketCard) ─► b_end
      ├─ repair ──► fight ─┬─ physical / scared ─► scared (other_person, Ending careful, safety.open, no close)
      │                    └─ no ───► guilt ─┬─ mine / partly ─► owning ─► r_msg (messageComposer) ─► r_sent
      │                                      ├─ unsure ─► unsure ─┬─ own the part I'm sure of ─► owning
      │                                      │                        └─ something warm ─► no_sorry
      │                                      └─ not mine ─► no_sorry ─► ns_card (boundaryLine) ─► ns_end
      ├─ heated ──► break ─► b_line (boundaryLine) ─► b_set
      └─ before_ask ─► gentle ─► soft (bodyCard willing) ─► g_card (pocketCard) ─► g_end

repair_outcome card ─► repaired ─┬─ yes ─► between ─┬─ unsafe ─► scared
                                 │                  └─ else ─► r_end (not okay → Let go)
                                 ├─ not yet ─► r_later
                                 └─ they weren't ready ─► r_wait (Let go)
break_return card ─► back ─┬─ yes ─► still_ok ─┬─ unsafe ─► scared
                           │                   └─ else ─► back_end (shaky → the repair)
                           ├─ not yet ─► more (another time, another card) ─► more_set
                           ├─ they didn't want to ─► refused (Let go)
                           ├─ not going back to it for now ─► no_back (no card)
                           └─ I don't feel safe going back ─► scared
```

**What's going on with them?** One tap: *They brought something to me*, *We had a fight and I want to repair it*,
*It's heating up and I need a break*, *I want to ask for something and keep it warm*.

**A carried flooded reading** (band, ≤ 20 min, never asked): only *It's heating up* is offered, with the title *Your
body's running hot. A break you come back from is the kind move right now.* and *Settle my body first* as a link (PRD:
break and return only; you can't validate from flooded). **Stirred**: the brought, repair and before-an-ask screens open
with *This is a lot to hold. Your side matters too, and it gets its turn.* (PRD: GIVE after a one-line self-validation).

### Someone brought something to me

What they brought (a complaint about me, a request, upset about something else, angry at me) sets which lines show.
*They're angry at me* adds *Are you safe with them right now?* on the same screen (required): *I'm scared of how
angry they are* goes to `scared`.
**Their side first**: one validation line for how they feel (Validate; own words allowed), one question (Interested). One
line, never a stack (the PRD's parentification risk). The hint: *Their feeling can make sense even when you see the
facts differently* (validate the feeling, not the point). **Then yours**: *You can hear them and still disagree* (FAST),
where you stand, and optionally something of yours (*I'm sorry for my part* only when you agree with some of it).
The pocket card: *First, theirs* · *Stay steady* (where I stand, *Let them finish before you answer*, *If it heats up:
Can I take a minute and come back to this?*) · *Then mine*. The end card offers One message for an ask of your own and,
when you see it differently, FAST.

### Repair after a fight

**Safety first**: *Did it get physical, or are you scared of them now?* (not *hurt*, which after a fight reads as hurt
feelings and would route an ordinary repair to the danger screen). *It got physical* or *I'm scared of them*
(`danger: other`) shows the other-person
resources, goes to an end card with Ending (`frame=careful`) and `safety.open`, writes no repair and asks no close; the
projection makes the person's safety answer stale (`safetyRecheckAt`), so their next visit asks the safety question
again. A fight can have been more than a fight.

**The guilt check** (PRD: ER's, via Check the Facts' inline mini-card once ER-B5 ships; asked plainly until then):
*Looking back, was some of it yours?* Yes, some of it, not really, not sure. Not sure is a choice, never a forced
sorry: *Own the part I'm sure of* or *Say something warm, without a sorry*, with *Check the facts first* as a link.

- Yours or partly: **one acknowledgement, for what you did. One sorry is enough** (FAST: one apology, no grovelling),
  an optional line for how it was for them, an optional line for what you'll do differently (Linehan's repair:
  acknowledge, repair, commit), an optional question about what would help, under the hint *Keep it to what you did*.
  The message card (no *Take the sorry out* here: the sorry is the point). Then *Want me
  to ask how it went?* (`repair_outcome`).
- Not yours: **You don't owe an apology for having a need, or for a fair no.** Something warm without a sorry, on the
  boundary card. FAST offered.

### Break and return

*Say when you'll come back. A return time helps a break feel less like leaving.* (Unannounced breaks read as
abandonment, PRD KB §4.6.) How long (half an hour, an hour, till tomorrow), then a line that says that time, copied from
the boundary card. The `break_return` card comes at that time and reopens the run at *Did you go back?*: yes → *How are
things between you now?* (shaky or not okay → the repair, with the person); not yet → another time and another card;
they didn't want to → *You came back. That part was yours, and you did it.* and FAST's Let go; *I'm not going back to
it for now* → an end with no card. Every one of these visits, and the break screen itself (a quiet link), has a way
out for someone who isn't safe with them: *I don't feel safe going back* / *with them* → `scared`, the safety answer
made stale, nothing logged. The pocket card's break line says when: *I need half an hour. I'm coming back to this.* The PRD's 20 minutes is half an
hour here: the server's window list has 30 and 60 (`m30`, `m60`), and 20 minutes is the low end of what the break
needs anyway.

### Before an ask

GIVE's four rows, every one optional: Gentle (sharp words and their softer swap), Interested (a question to ask them),
Validate (a line for their side), Easy manner (lighter, warmth, plain; never sarcasm). Willing hands for twenty seconds
(`bodyCard` kind `willing`). The pocket card (*Say* · *How* · *Ask about them*; skipped when nothing was picked), then
One message with the person (one button: the prep is DEAR MAN's own way in, and two buttons would both read *Ask for
what you need*). After two refused asks to be heard, FAST's Let go sits beside it. The four rows stay on one screen
(the PRD's under-30-seconds inline layer), a named departure from one question per screen.

## Ways in

- Tools: listed under Interpersonal Effectiveness; the intent *Repair things after a fight, or keep it warm*. The PRD
  says no intent row (reached through IE-01's situation list); with the inline layer not built yet, the intent is how
  it's found (default to connected, 12 Nov).
- DEAR MAN's debrief: *still okay between you* shaky or not → Keep it warm, `situationId=repair`, with the person.
- Ending: *hard right now, try to change it first*, when safe.
- Problem Solve: every `give` link (the old page's dead `/tool/give`).
- Its own back-from-a-break card: still shaky → the repair.

## Routing

Tagged (`change`, `relational`, `neutral`), with one word row, live: *remorseful* (On replay) gets the repair beside
Check the Facts (`rf_rumination_loop_words_repair_give`): is the guilt justified, then repair with the person. Not
*guilty*, which is often about the self with nobody to repair with. The Oct 2026 review planned two other rows, and
neither fits what was built:
*let down* already shows DEAR MAN beside Recover (a GIVE row there is a second relational card the diversity rule never
shows), and *lonely* / *isolated* asks for reaching out to people, which this skill doesn't do: it is for one person you
already have something going on with. Both rows were dropped from `scripts/recommendations/content.py`.

## What's saved

- `ToolSession.ext.run`: option ids, own words encrypted at close. Close kind `none`.
- `Interaction` (log, `WITH` the person, ids only): `kind: 'repair'` once a `repair_outcome` visit answers *Did you
  get to say it?*; `kind: 'break_return'` once a `break_return` visit answers *Did you go back?*; with `outcome`,
  `between` and (repair) `guilt`. Never for someone on the safety route, and nothing for a visit that said it isn't
  safe with them (that person's `safetyRecheckAt` is set instead).
- The rep: `followup_offphone` when either afterwards is *Yes*, none otherwise (`OFF_PHONE_SKILLS.give`).
- Follow-ups: `break_return` (chips `m30`, `m60`, `tomorrow`; copy *Time to go back?*) and `repair_outcome` (*How did
  it go?*). Both session-bound (only a Keep it warm visit books them), opened is resolved, and the copy names no one.

## Not yet

Each with where it lands. The two-refusals rule is the count alone (the person's own answers in the debrief), not the
PRD's `risk: 'invalidating'` and the count: the refusals are the evidence, and the risk answer is about safety. It shows
the practical-asks line and offers Let go beside the ask; it doesn't hide the brought or repair paths.

- The inline layer inside DEAR MAN's prep, Say no's opener and Ending (PRD: four rows in under 30 s). The standalone
  *before an ask* path is the same four rows (IE-B5).
- Check the Facts' inline mini-card for the guilt check (ER-B5); a link until then.
- WMP's `forOther` witness corpus: the validation lines ship in the skill (D16) until it exists (the WMP batch).
- Fade (lines that led to *still okay* become "lines that work with {label}"; Validate opens empty after three reps),
  the reps `validated_other` / `break_returned`, the weekly *one GIVE rep*, three nos → GIVE from Say no, People's
  *repair with {label}*, IE-02 rehearsal (planned exit) (IE-B5).
- The stirred branch's Angry part when the urge is to fire back (parts are gated; with the parts batch).
- IE-01's situation list gaining *repair* and *keep it warm* entries in DEAR MAN's prep (IE-B5).
- Do the Opposite's guilt-that-fits → the repair here (ER-B5, with Check the Facts' mini-card).
- The PRD's `ADDRESSES` edges (anger, irritation, guilt, jealousy) on `dbt_give` (with the next routing review).
- Own words on the no-sorry line, *yours to say* and the break line: the run's worst case sits near ext's 4 KB, so
  these wait on the ext budget (IE-B5).
