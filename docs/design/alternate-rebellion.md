# Rebel without the wreckage (DT-11, alternate rebellion)

Written 10 Nov 2026. Status: **built on the skill runtime** (DT lane, batch DT-B1, first PR; revised after its
three review gates the same day). It merges and deploys **after #55** (own-words encryption, C1 rule 7). Source: PRD DT-11
(Claudia's vault, `DBT Module PRDs/PRD – Distress Tolerance.md` §5; a read-only copy is in the project files,
`handoffs/prds/`), [the modules plan](dbt-modules-plan.md) §2.1 and §5.1, and Claudia's alternate rebellion note:
for when someone wants to "blow up their life or their relationship or just feel stuck and overwhelmed and want to
rebel", a place for rebellion that doesn't cost them.

Tool id `alternate-rebellion` (the id the engine already produced from `dbt_alternate_rebellion`, now set
explicitly in `schema/app-tool-ids.cypher`). Listed under Distress Tolerance for everyone, with the Tools intent
*I want to blow it all up*. The skill is `scripts/skills/alternate_rebellion.py`; the page is one line,
`<SkillPlayer skillId="alternate_rebellion" />`.

## The flow

| # | Screen | What it does | DBT (Linehan 2015, DT Handout 21) / PRD |
|---|---|---|---|
| 1 | **Open** | *Wanting to rebel usually means something's squeezing you. That's worth listening to.* (one line, no hint) | PRD step 1 (the witness: validate before directing). Absorb: the push-back is honoured, not suppressed |
| 1f | Open, flooded | Only with a carried or host band of `flooded` (plan C6.2): *Your body's loud. Settle it a little first.* (8 words), quiet links to Cool Down and Pause, and *Keep going anyway* | PRD capacity branching: DT-01 / DT-02 first, continue anyway |
| 2 | **What's squeezing you?** | Up to two (the oldest swaps out), or own words. No hint. Short labels, packed two to a row, so the quiet links and the too-much link stay above the fold with the other-person resources showing. Quiet link: *If the urge is to hurt yourself* → `safety_open` | PRD step 2. H21: rebellion is a response to feeling controlled or constrained |
| 3 | **What would blowing it up give you?** | One function: freedom, being seen, control back, a break, proving them wrong, feeling alive | PRD step 3 (the function). H21's point: the need under the urge is legitimate |
| 4 | **Pick one that gives you that, without the wreckage.** | Three to six curated rebellions matched to the function (graph `RebellionOption`, each `SERVES` its functions), or own words with *Will this cost you tomorrow?* (and, with *Someone I'm scared of*, *Would they notice it?*). With *Someone I'm scared of*: only quiet ones, titled *…and that nobody else has to see*. With *Treatment I didn't pick*: none that skip something or are exercise. No hint. The safety link is here too | PRD step 4. H21 (paraphrased): rebel in a way that doesn't wreck your life, with alternate behaviours that satisfy the urge |
| 4b | **Heads-up** (own words, *costs: yes*, or *they'd notice: yes / not sure*) | *That one might cost you tomorrow. Keep it, or pick something lighter?* (or *If they'd notice it, it could cost you. Keep it, or pick a quiet one?*) | PRD step 4's cost check: a heads-up and a choice, never a block |
| 5 | **The card** | Titled *Here's your rebellion. When will you do it?*: the rebellion on the square paper, *against* the squeeze, *for* the function; then now · later today · this week as chips | PRD step 5. The rich moment: a keepsake object, not a form |
| 6 | **Did it scratch the itch?** (now only) | *Go and do it first. This screen waits.* yes · a bit · no · not yet | PRD step 6, first half |
| 7 | **And the squeeze itself. Is it something you want to work on?** | could change · someone I want to say something to · won't change · not now | PRD step 6: don't minimise a real squeeze; route it to change |
| 8 | **Hand-off** | A line for the answer; offers below; Done | PRD step 6's routes |
| close | **And the urge to blow it all up?** | Held off · Went ahead · Still deciding (the spine's `urge` close, `actedOnUrge`) | PRD: the acted answer on the destructive urge |

### Hand-offs

| Answer | Offers | Notes |
|---|---|---|
| It could change | Problem Solve | |
| Someone I want to say something to | DEAR MAN; FAST (planned, IE-05) | |
| It won't change | Let it be (DT-04, built 11 Nov) | Done is always there. Never with *Someone I'm scared of* (no radical acceptance of a situation with someone they fear) |
| Not right now | — | Done |
| *Someone I'm scared of* was a squeeze | Ending a relationship (IE-08, built 10 Nov 2026; it asks about safety first) only | Never DEAR MAN, FAST or Let it be for someone they're scared of (decision D4, plan C6.6). The other-person resources show on every screen from 2 on |

## Safety

- **Someone I'm scared of** carries `danger: other`: `CrisisBanner variant="other_person"` (911, the National
  Domestic Violence Hotline, 988 last) shows, compact, on every screen from the squeeze to the hand-off (a test
  walks them all), and DEAR MAN, FAST and Let it be are never offered. Screen 4 offers only `quiet` rebellions:
  inside the person's head or out of sight and earshot, never leaving the home, breaking an enforced routine,
  putting the phone away or changing the way home (defiance they can see can raise the risk). Each function keeps
  at least three, with treatment too; a test pins it. An own rebellion is also asked *Would they notice it?*, and
  *yes* or *not sure* gets the heads-up. *Someone controlling me* alone shows nothing: being controlled by a boss or a parent isn't
  danger, and an alarm there would be wrong.
- **Self-harm.** DT-11's entries exclude self-harm (PRD), and nothing in it asks about one. The quiet
  *If the urge is to hurt yourself* link on screens 2 and 4 opens `safety_open` (the interim crisis screen, D5) over the
  run, always visible (plan C6.5's spirit; the self-harm *chip* belongs to DT-02's urge list, DT-B1).
- **Treatment.** *Treatment I didn't pick* is a squeeze, never a rebellion: screen 4's title becomes
  *Treatment you didn't pick is a real squeeze. Changing it is a talk with your care team first. Pick a
  rebellion built not to cost you tomorrow.* (PRD risk; validate, then direct; with *scared* too, it ends *Pick
  one nobody else has to see.*). No rebellion that `skips` something (say no, cancel a plan, skip a chore) is
  offered, so an appointment or a dose never reads as optional, and none that `exerts` (eating-disorder treatment
  often restricts exercise). No rebellion anywhere is framed as a secret or hides an object: secrecy from a care
  team is a relapse marker, and a hidden object found by a controlling partner can escalate.
  The *someone I want to say something to* route then offers DEAR MAN.
- **Curated, reversible, costless.** Every rebellion is reversible with `cost: none`, and bounded: nothing whose
  cost depends on what the person fills in (an earlier *do a small version of the thing they said you couldn't*
  is gone for this reason). Plan C6.7: no food, alcohol, shopping or scrolling, no amounts. A test pins the list.
- **Overwhelm.** `TooMuchLink` under every screen (the player). No band is asked or inferred; the flooded opening
  only comes from a carried or host band.

## Departures from the PRD

1. **Irreversible rebellions are not offered yet.** The PRD's tattoo, shaved head and big purchase need the
   *sleep on it* 24-hour check, a follow-up (R5, F2). Until then the list is reversible only.
2. **The witness line is the skill's own copy**, not the `witness` embed (F2, D16). When F2 ships, screen 1
   becomes the embed with this line as a signed-off host line; the skill already works with it absent.
3. **Two squeeze chips the PRD doesn't list:** *Someone I'm scared of* (C6.4: an option that can carry danger
   from another person gets its own chip and slot, rather than putting an alarm on *someone controlling me*) and
   *Treatment I didn't pick* (the PRD's treatment risk, made a visible route).
4. **The close asks the acted answer only.** The PRD's then-vs-now on the blow-up urge needs the two-part
   `urge_change` close (R7, F2). The close is the spine's `urge` kind with its own wording until then.
5. **The itch question adds *Not yet*** to the PRD's *yes · a bit · no*: the screen comes straight after *Now*, and
   someone who hasn't done it yet needs a true answer.
6. **No *dessert first*.** Plan C6.7 excludes food from rebellions.
7. **The real-squeeze routes are `SkillExit`s**, not the PRD's `ROUTES_TO` edges (plan C4: every hand-on is an
   exit, `OPENS` its tool).
8. **The check-in entry is narrower than the PRD's** (*provoked, indignant* on Ready to fight, not the PRD's anger,
   frustration, irritation, angsty edges): see Routing. It answers the PRD's open question narrowly.
9. **"Later" isn't scheduled yet.** *Later today* and *This week* are recorded (`when` in `ext.run`), and the
   follow-up that asks how it went waits for R5 (F2).

## Deferred (with the batch that lands it)

| What | Needs | Lands |
|---|---|---|
| Scheduled rebellions and the 24-hour check on irreversible ones; irreversible options | R5 follow-up action, a `FollowUpType` row | DT lane, after F2 |
| Witness embed on screen 1 | F2 `witness`, Claudia's sign-off of the line (D16) | after F2 |
| Then-vs-now on the blow-up urge | R7 `urge_change` | after F2 (DT-02 brings R7's first use) |
| The rebellion menu (kit cards, section `rebellion`), own rebellions kept | R4 keep, `kit_card` kind | Safety batch (DT-03) |
| Entry from DT-02's *blow it all up · quit · end it* chip (`urgeId`); *end it* can read as suicidal, so that entry carries `safety_open` from screen 1 | DT-02 | DT-B1, second PR |
| Entry from IE when the urge is to end a relationship impulsively (PRD) | IE's entry point | IE lane |
| Carried band from the band store (`band.current()`) into the run | the player reading it (R2) | F2 (today only a host can pass it) |
| `dbt_adaptive_denial` sibling concept (PRD graph content, for DT-05) | — | DT-B3 with DT-05 |
| Diary card fade question (*rebelled without wrecking anything?*) | CORE-04 | outside the lanes |

## Waits on the safety batch (C6.8)

- ~~**IE-08 Ending a relationship**~~ built 10 Nov 2026 (`docs/design/ending-relationships.md`): the *Someone
  I'm scared of* route now offers it, beside the other-person resources and Done.
- **Fuller domestic-violence resources** than the banner's (CORE-01's helpline list, D5).
- **DEAR MAN's safety question** (*Is it safe to bring hard things up with them?*, IE-01, D4, IE-B2). Until it
  exists, *Someone controlling me* + *Someone I want to say something to* still offers DEAR MAN; coercive control
  can mean danger, and that question is what catches it.
- **CORE-01's safety route** replaces the interim `safety.open` screen (D5).

## Data

One `ToolSession` per visit with `ext.run` (plan C1): the path, the picks (`squeeze`, `function`, `pick`, `cost`,
`heads_up`, `itch`, `real`, and `when` from the card), own words only as `valueOwn`, the offered and taken exits.
Own words are encrypted at close by #55 (`spine/extOwn.ts`), which is why this merges and deploys after it. The itch
answer stays in `ext.run`, not on the spine: it's this skill's own question about the rebellion, not a
then-vs-now on the urge, and nothing outside the skill reads it. The close writes `actedOnUrge`. No new label, no profile write.

## Routing

One row, signed off by Claudia on 10 Nov 2026 and live (D15): `rf_reactive_aggression_words_rebel_alternate-rebellion`, the
alternative (priority 1.5) to Pause on Ready to fight for *provoked, indignant*: the push-back words, where a
rebellion function is likely. Never flooded. Not every anger word: the PRD's open question (anger alone doesn't
imply a rebellion function) is answered narrowly, as signed off. Not *resentful, bitter*: their
grievance rows lead there and Pause always takes the swap, so the row could never show. Concept tags: `side:
acceptance`, `skillKind: redirect` (a new kind: the urge acted on in a harmless form; with `hold`, Pause's kind,
the diversity rule could never set it beside Pause; approved 10 Nov), `direction: neutral`. A test checks it shows
as Pause's swap for both words, never when flooded, and that switched off the swap is Cool Down again.

**Signed off (Claudia, 10 Nov 2026):** the opening line (`open_title`, kept as the skill's own copy until the D16
witness lines replace it), the `redirect` kind, and the routing row (in `SIGNED_OFF` in
`scripts/recommendations/content.py`). The rest of the copy isn't sign-off gated (the Check the Facts and Cope Ahead
precedent).

With the kill switch off, the legacy ranker can now return this card (it used to drop it as unknown): that is
the intended effect of the tool existing.
