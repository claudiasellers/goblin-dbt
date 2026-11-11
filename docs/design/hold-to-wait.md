# Hold to wait (DT-02)

**Status:** built 11 Nov 2026 on the skill runtime (DT-B1; [the modules plan](dbt-modules-plan.md) §5.1). It
replaces the old STOP page (`Pause.tsx`, kept in the tree, unrouted, until Claudia has used the new one: C8) under
the same tool id, `pause`, now named *Hold to wait* (D6). Listed under Distress Tolerance for everyone, with the
Tools intent *Pause before reacting*. Source: `scripts/skills/hold_to_wait.py`. Tests:
`tests/skill-hold-to-wait.test.mjs`. Routing: Pause's existing signed-off rows keep pointing at `pause`, so the
check-in now opens Hold to wait wherever it opened Pause; no new rows.

## What it is

DBT DT Handout 4, STOP (Linehan 2015): **S**top (freeze, don't act), **T**ake a step back, **O**bserve, **P**roceed
mindfully. The rebuild puts the hand to work for S (a press-and-hold ring, the shared `holdRing`), makes T a
physical move, keeps O to one tap each, and turns P into the pull's own next moves.

Evidence: the PRD's (DT-02); STOP is a core DBT distress-tolerance skill (Linehan 2015). The app claims nothing on
screen.

## The flow

| # | Step | What the person sees | PRD DT-02 |
|---|---|---|---|
| 1 | `pull` | *What's pulling at you?* Send or say something · Check their page, or my phone · **Hurt myself** · Hit, throw or slam · Leave, run or disappear · Use, drink, binge or buy · Say it your way (90 characters). Hint: *Pick the closest. There's no wrong answer here.* *Talk to someone now* under the chips | Step 1. Hurt myself on the first row (D5) |
| — | `safe` | Only after *Hurt myself*. On arrival the resources open over the skill first (`safetyFirst` → `safety.open`), every time; back from them: *Thank you for saying it. Right now, are you safe from acting on it?* Yes, I'm safe for now · I'm not sure · No. Hint: *You can answer honestly. Whatever you say, the support stays on the screen.* The crisis banner sits on it and on every screen after (above an embed or card; below a question's choices, so a tapped chip never moves) | C6.5: self-harm to `safety.open` first |
| 2 | `hold` | The witness line (*That's a strong pull. It makes sense it's this strong.*; flooded: *Your body's loud. Hold here for a moment.*), then `holdRing` press, 90 s: *Hold here*, *Your hand has a job now* while held; letting go keeps what was held, and after one try *Next* appears. *Talk to someone now* under it | Step 2 (S) |
| — | `reach` | Not sure or no, straight from the question (S9: nothing offered in place of crisis support): the banner, *Please reach out to someone now, using the support on this screen. You don't have to hold this alone.*, Done (My crisis kit planned, DT-03). No second button competing with the banner. No close question | C6.5 |
| 3 | `step_back` | *Now take one step back.* Sit down · Leave the room · Step outside · Hands in my lap · Put the phone down for ten minutes. Hint: *Pick one and do it. The screen waits.* Flooded: only Sit down · Hands in my lap (T8). After *Hurt myself*: no phone-down (it would take the support out of reach) | Step 3 (T) |
| — | `wait` | The phone down: `waitLock`, ten minutes, a ring with *Waiting* inside and no digits; *I'm back* from the first second (never locks). A come-back card on Today ten minutes later (`hold_come_back`; never after *Hurt myself*) | Step 3's phone-down |
| 4 | `observe` | *What do you notice?* In your body: Hot · Tight · Shaky · Heavy · Buzzing · Can't tell (up to 3). What set it off: Someone said or did something · Something I saw · A thought · Nothing I can point to. Skippable | Step 4 (O); MF-01's card as plain chips until it's built |
| 5 | `proceed` | *What matters most right now?* Get through this without making it worse · Get what I want · Keep the relationship · Keep my self-respect. *One next move*: only the pull's own moves (below) | Step 5 (P) |
| 6 | `next` | The move's own line (e.g. *Saving it for later is a choice. The message will still be there when you're steadier.*) or *You gave the pull some room. What you do next is yours.*; the move's tool as the one offer; Done (the button, when there's nothing to hand on to) | Step 6 |
| — | `hurt_end` | *Hurt myself*, safe for now: *You gave it some room. If it comes back, your support is right here.* (flooded: *Your body's loud. Settle it first. …*), the move's tool (or First, the body when flooded), the banner, Done. **No close question** (a *Yes* to *did you act on it?* would get only *Noted.*) | Gate 3 |
| — | close | Two-part (`urge_change`, R7): *Did you act on it?* No · Partly · Yes; then *And the pull now, compared to when you started?* Louder · About the same · Quieter · Much quieter | Step 7 |

**The moves** (`ProceedOption`, `FOR_URGE` → the pull's `ActionUrge`):

| Pull | Moves (→ the tool the end card offers) |
|---|---|
| Send or say something | Save it, and look again when I'm steadier · Tell it to someone safe first · Plan how to ask for it, later (→ DEAR MAN) |
| Check their page, or my phone | Put the phone in another room · Look once, later, at a time I pick |
| Hurt myself | Cool my body down first (→ First, the body) · Call or text someone (→ Talk to someone now) |
| Hit, throw or slam | Cool my body down first · Rebel, without the wreckage (→ DT-11). No confrontation line while aroused enough to hit |
| Leave, run or disappear | Say one line to hold my ground (→ FAST) · Step out for ten minutes, then come back · Rebel, without the wreckage |
| Use, drink, binge or buy | Cool my body down first · Ride it out (→ Ride it out) · Tell it: not now |
| Own words | Cool my body down first · Ride it out |

Moves into tools not built yet (My crisis kit DT-03, Held DT-07, Give your mind a job DT-06) are planned exits on
the end card and are never chips until their tools ship.

**The flooded short path.** No band is asked (C6.2). A carried flooded reading (`$ctx.band`: a hand-off's, else the person's own `band.current()`, ≤ 20 min) shows the flooded
hold line, then the step back (two choices), then `settle`: *Your body's loud. Settle it first. The rest can wait, and Today will
ask you about it later.* → First, the body (after *Hurt myself*: `hurt_end`). Observe and Proceed wait for the come-back card. Any other band, or
none, takes the standard path (D1).

**The come-back.** `hold_come_back` (practice tier, in-tab only, 10 minutes after, stale after 6 h): *A little
later — Quieter now? Want to decide what to do with the pull?* · *Not now*. It reopens that visit at the step back
(`/tool/pause?run=<visit>&at=step_back&followUp=…`, R9), whose Next goes on to Observe and Proceed; a visit that
never closed (the phone-down wait still on screen) can't be reopened, so the link starts a fresh one. Opening it
resolves it (`startToolSession`, like `resume_skill`). It never names the urge.

## What it records

A completed hold (or wait) marks the visit practiced, so leaving before the last card still counts as a rep. A
`noClose` ending dismisses Today's outcome card for the visit too. `ToolSession.ext.run` (the runtime's record, in place of the PRD's `UrgeEpisode` (C1, D2): answers as ids, own words encrypted at close), `urgeIds` (the pull's
`ActionUrge` id, ask-fresh; own words record none), and the two-part close (`actedOnUrge`, then-vs-now). The old
page's `ext.dt.stepsDone` stays readable for old sessions (plan C7).

## Safety

- *Hurt myself* opens `safety.open` before anything else (the step's `safetyFirst`, checked on every arrival, a
  resumed run landing on the step included), then one plain question with the banner on the screen. The banner
  stays on every screen for the rest of the visit. Not sure or no: straight to someone to talk to, no close
  question. Safe for now: no phone-down step, and its own end card with no close question.
- *Talk to someone now* on every ask step, the hold and the end cards.
- Nothing locks: the hold has a way past after one try; the wait has *I'm back* from the first second; *This is too
  much right now* sits under every screen (the player).
- No move is food, drink, shopping or scrolling (C6.7).

## What the runtime gained

- **`safetyFirst`** (step key, a condition): when the run arrives at the step and it holds, the player opens
  `safety.open` over it (record `safety_open` shown) before the step can be answered. `build.py` requires the
  `safety_open` exit and a crisis slot on the step.
- **Option `urge`** (prop): the `ActionUrge` id a picked option stands for; the player puts the run's urge ids on the
  session (`setUrgeIds`, ask-fresh). `build.py` checks every `urge` and `forUrges` id is an `ActionUrge`.
- **`waitLock`** embed (C3b, DT-owned): `WaitLock` as a whole-screen step, `clock={false}` (no digits, no padlock;
  a short `waitingShort` word inside the ring, also its accessible name); output `waited` · `back_early` with `durationSec`.
- **Behaviour urges** (C5): `ActionUrge` `send`, `check`, `hit`, `leave`, `use`, `self_harm` (`kind: behaviour`,
  `module: dt`; `self_harm` `lifeThreatening`), in `schema/opposite-action-data.cypher` with no
  `HAS_ACTION_URGE`, so Do the Opposite never lists them. Parts coverage: all six `HELD` for now; the proposed
  moves (check → chase, hit → hit back, leave → hide) wait for parts sign-off.

## Departures from the PRD, and what waits

| PRD | Here | Why |
|---|---|---|
| A fast path for a steady band (skip O) | Not built | No band is asked (C6.2), and a carried steady reading is rare; the standard path is short already |
| The hold grows within a visit (×1.5 per completed hold, max 15 min) | One 90 s hold per visit | One hold per visit, so there's nothing to grow into; growth across visits (the PRD's open question 1) needs a profile read of past holds (no kind yet) |
| A next-morning check after *Yes* | Not built; the close's *Yes* is recorded | Needs CORE-04's look-back; a reminder after a lapse needs its own clinical review |
| The person's own hold line | Not built | A keep kind; after the clinician pass |
| MF-01's body card on Observe | Plain chips | MF-01 isn't built |
| DT-10's pros & cons replay for a frequent urge | Not built | DT-10 is DT-B2 (`prosConsReplay`) |
| Inline entry from hosts (`enterAt`, `$ctx.urgeId`) | Not yet | The hosts (OA, Recover's *Don't send yet*, FTF, IE composer) wire it when they move to the runtime |
| *Yes*: *Thanks for telling me. That's useful, not a failure.* · *No*: *Held.* after the close | Not shown (*Noted.*) | The close question is the spine's; a per-answer line needs a close-copy extension. Worth it for *Yes* first |
| Behaviour urges' DBT parents | None | They're behaviours, not emotions |
| Binge and buy as their own chips and urges (C5) | One *Use, drink, binge or buy* chip, urge `use` | Kept to six chips on one screen; splitting is open for Claudia (C5 lists them separately; D14 only parks DT-09) |
| MF-04's optional wise-mind check on Proceed | Not built | A link to Wise mind fits after the clinician pass; Wise mind has no inline entry yet |
| Three steps back for the same person → The Ask leads | Not built | Needs IE-03 and a per-person read |
| Witness lines per urge family (`StopFlow`) | One witness line | The witness corpus has no per-urge rows yet |
| The `hold` alias concept | Not added | Routing keeps `dbt_stop`; no row needs the alias |
| A notification to come back | In-tab only (`hold_come_back`) | Push waits on the notification work (D-series); in-tab is the safe default |
| The DT-11 chip (*blow it all up · quit · end it*) | A *Rebel, without the wreckage* move on hit and leave | One pull list for every visit; "end it" belongs with hurt myself, not a rebellion |
| *Not safe where you are? Get somewhere safe first* | Not shown; *Talk to someone now* on the hold | `safety.open` shows the suicide and crisis lines; danger from another person needs `CrisisBanner`'s `other_person` variant, which a link can't choose yet |
| Own words that name self-harm | Get the general moves and *Talk to someone now*, no safety question | No keyword screening on own words (house rule: never lint what the person writes); for the clinician pass |

**For the clinician pass** (Gate 3 notes kept, not changed here): *Look once, later* for checking can feed
reassurance-seeking; *Leave, run or disappear* can be the wise move (from danger), and *step out, then come back*
assumes coming back is safe; check First, the body's cold-water steps carry a warning for alcohol or substances
before *Cool my body down first* is offered for *use*; the interim safety question doesn't ask about intent, plan or
means (CORE-01 owns it).
