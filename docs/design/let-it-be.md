# Let it be (DT-04)

**Status:** built 11 Nov 2026 on the skill runtime (DT-B4, part 1; [the modules plan](dbt-modules-plan.md) §5.1).
New tool `let-it-be` (D6: routing's planned `radical-acceptance` renamed), listed under Distress Tolerance with the
Tools intent *Stop fighting something I can't change*. Source: `scripts/skills/let_it_be.py`. Tests:
`tests/skill-let-it-be.test.mjs`. There was no old page. Rolling back is removing `'let-it-be'` from
`src/lib/skillRuntime/playerTools.ts` and the tool from `src/data/tools.ts`, and putting the `planned` flags back
on the exits below.

## What it is

PRD DT-04 (radical acceptance, turning the mind, willingness, willing hands; DBT DT Handouts 10–14; Linehan 2015)
for "they won't apologise", "they're not coming back", "it happened and I can't make it not have happened". The
problem has been checked and it can't change now; what's left is the fight with it. Validation comes first, and
acceptance is never offered for something still happening to the person.

## The flow

| Step | What the person sees | PRD DT-04 |
|---|---|---|
| `checked` | *Have you checked whether any of this can change?* Yes, it can't change right now · Not sure | Risks: premature acceptance |
| `check_first` | Not sure: *It can help to sort what might change from what can't, first.* A link to Problem Solve, and *Continue anyway* | Risks |
| `heads_up` | A carried flooded reading: *This works better once your body's quieter.* My body first → First, the body · Try it now (the short path) | Capacity: flooded |
| `what` | *It makes sense you're fighting this. It matters to you. What is it you can't change?* It happened · They won't change · They won't give me this · I lost something or someone · A limit (body, money, time) · Something unfair · own words | Steps 1–2 |
| `still` | Person- or harm-related (happened, won't change, won't give, unfair, own words): *Is this still happening to you?* No, it's in the past · Yes · Sometimes | Step 2's danger check |
| `still_line` | Yes or sometimes: *Accepting that it happened isn't accepting you have to stay in it.* The `other_person` crisis slot from here to the end; Ending a relationship that's hurting you (careful frame); *Go on, for what's already happened* | Step 2 |
| `fight` | *How does the fight with it show up?* Replaying it · "It shouldn't be this way" · Bitter · Checking for a change · Arguing in my head · Going numb · Can't tell (up to four) | Step 3 |
| `willing` | *Right now, are you willing to let it be, or digging in against it?* Willing · Digging in · Not sure | Step 3 |
| `threat` → `threat_line` | Digging in: *What feels like it would happen if you let this be?* It means they win · it was my fault · it'll never change · I'll be alone · I'll lose myself · something else. Each gets its own line, under the distinction *Accepting isn't approving. It isn't giving up on what can change.* An optional *That helps · Not really* | Step 3 (willingness) |
| `hands` | *Willing hands.* Arms loose, palms up, fingers relaxed, 45 s (`bodyCard` kind `willing`). *If it feels right, let your face soften too. You don't have to smile.* | Step 4 |
| `statement` → `statement_card` | Category-matched lines first (*It hurts because it mattered.*, *They are who they are right now. I can't make them change.*, …) and the PRD's three for every category, or their own words; then the line on paper (`boundaryLine`), copyable | Step 5 |
| `grief` | *If sadness comes, it's allowed. It isn't going backwards.* Okay · Hand on my heart (`bodyCard` 30 s) · It's a lot right now → `too_much` (First, the body; Held planned; no close) | Step 6 |
| `hands_still` | *What's still in your hands?* Meet the need somewhere else (Recover) · A line to hold my ground (FAST) · One small thing that matters to me · Look after my body tonight · Nothing right now, and that's okay | Step 7 |
| `close` | *Compared to when you started, the fight with it is…* Louder · About the same · Quieter · Much quieter (the session's close, `askFresh: 'thenVsNow'`; `regulation_down`) | Step 8 |
| `end` | The line for what's in their hands, and its tool offered | Step 8 |

Stirred (a carried reading) and *Try it now* after the flooded heads-up take the short path, the PRD's ★ steps: no
`fight`, `willing` or `grief`. *Talk to someone now* is on every screen; *This is too much right now* under every one.

## The links that now open it

The planned `let_it_be` exits in First, the body's fork (*No, it's how things are*), Check the Facts (fits but can't
change), FAST's Let go, It isn't working (fit, willingness), DEAR MAN's debrief (*They had more power*), Rebel without
the wreckage (*I can't change it*), Ending (the after check-in) and Problem Solve (*nothing in yours*, `let-it-be`)
are built now. Problem Solve's `willingness` and `turning-the-mind` links stay planned (below).

## What it records

`ToolSession.ext.run` (every answer and the path; the hands and heart cards' `done` / `partly` / `skipped` with
seconds; whether the statement was copied) and the spine's `thenVsNow` on the fight, direction down. The still
answer is recorded as asked (`no` / `yes` / `sometimes`), never who.

## Routing

The three planned `radical-acceptance` rows (helpless; vulnerable / fragile / powerless; despair after gentle
movement) are `let-it-be` rows now, built, switched off and drafts (`BUILT_NOT_SIGNED_OFF`).
`schema/app-tool-ids.cypher` gives `dbt_radical_acceptance` its `appToolId`.

## Deferred (DT-04 part 2, with DT-B4's rest)

- **Turning the mind**: the 60 s card (`turnFork`, the Stage fork with footprints), the *When will the fight come
  back?* cue and its reminders (a `FollowUpType`), and the `turning-the-mind` tool id Problem Solve links to.
- **The acceptance target** (`acceptance_target`, R4 keep): turns logged per target, *resting* after three quieter
  turns, the weekly review.
- **Willingness as its own entry** (`willingness`, entering at the fight): needs a page-level `enterAt`.
- **Inline mode** for FAST's Let go and Recover's *Let it land* (R8; IE-B4 switches them over).
- **The witness embed** (WMP lines with the 4 s receive hold): its lines are drafts awaiting sign-off (D16); the
  PRD's own line opens the `what` step until then.
- Holding the statement 4 s, recording it in their own voice (D13), hand on heart as its own `PracticeSkill`, the
  `accept` / `willing_hands` reps, host pre-fill (the person, the need, the event) and host entries skipping
  `checked`, the graph nodes (`AcceptanceCategory`, `NonAcceptanceSign`, `WillfulnessThreat`, `AcceptanceStatement`,
  `StillInMyHands`, `AcceptanceFlow`; the options carry those labels now), the fade, CORE's crisis-context exclusion.

## Departures from the PRD

| PRD | Built | Why |
|---|---|---|
| Blank / dissociated: orient first (DT-01), then ★ steps | Not separate: only a carried flooded or stirred band changes the path | No band is asked (C6.2), and a blank reading isn't carried yet |
| Still happening → "CORE resources and IE options" | The `other_person` crisis slot and Ending (careful frame) | CORE's resources are the crisis slot; Ending is the IE option for staying somewhere you're hurt |
| Willful → "willful" | *Digging in* on the chip | Plainer; "willful" reads as a telling-off |
| The statement held for 4 s | On paper, read once, copyable | The hold needs the witness hold mechanics (part 2) |
| One small thing → ER values / positives; body → PLEASE | Lines only; the tools are planned exits | ER-04 and ER-07 aren't built |

## Clinician pass (open)

- The category list and which ones ask *still happening*; whether *sometimes* should go further (the safety batch).
- The threat lines, one by one, and the willful chip's wording.
- Willing hands at 45 s; the half-smile line.
- Whether the Tools entry's *Continue anyway* is right for something changeable.
