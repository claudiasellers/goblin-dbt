# Practice home (MF-02, MF-B3)

Status: **built 15 Nov 2026** (MF-B3). Source: `PRD – Mindfulness.md` §MF-02, *Practice (home, daily rep, reps, fade)*;
the modules plan §5.3a. Route `/practice`.

DBT's mindfulness is learned in small, frequent practice while it's calm. Skills *use* is the best-supported mediator
in DBT's outcomes (Neacsiu et al. 2010; Barnicot et al. 2016; practice time tracked change in Soler 2012: Moderate,
secondary analyses). Until now the app met skills only in the moment. The Practice home is the calm-time door.

## What it does

| Part | What happens | Where |
|---|---|---|
| Setup (first signed-in visit, three screens, ≤60 s) | **Why**: *Skills practised when it's calm are the ones you can reach when it's loud.* Four chips from MF Worksheet 1's structure, tap any (nothing saved from them). **When**: *Morning · Midday · Evening*, or a cue (*After I brush my teeth · When the kettle's on · On the bus or train · When I sit down at my desk · My own*, an implementation intention), or *No reminder*. **Breath**: *Is it okay if some practices use your breath? Yes · Not sure · No* (not sure counts as no; eyes stay open in every practice). *Not now* on every screen. Done keeps `practice_prefs` | `Setup` in `src/pages/Practice.tsx` |
| Today's practice | One practice from the MF sequence (graph: `PracticeSkill.mfOrder`): the skill practised least, earlier in the sequence on a tie, never the tool used last; *A different kind* swaps to the next skill with a different tool. One tap opens the tool | `dailyPick` in `src/lib/practiceHome.ts` |
| Caught one? | *Caught a judgment* (a `nonjudge` rep, source `catch`) and *Did one without the app* (an off-phone `observe` rep). One tap each, *Counted.* Linehan's H5a clicker in phone form | `recordCatch` in `src/services/practice.ts`, a `recordToolSession` one-shot under the reserved tool `practice` |
| This week | A ring of this week's reps (seven fills it), labelled for screen readers, **no number**. *Reps count whenever they happen. Nothing resets.* | `ProgressRing`, `weekFraction` |
| Your skills | Each MF skill with a level of five dots (Recover's 1 / 3 / 7 / 15 / 30 reps, never decaying; *Not tried yet* / *Level n* / *Well practised*) and its practices as links. *Nothing is locked. Pick any.* | `library`, `levelOf` |
| Off the phone | *Some of your practice happens without the app now.* once any rep was off-phone or caught | |
| Change when | Opens the setup at *When* | |
| A flooded reading | A carried flooded band puts *First, the body* above everything (*Your body's loud right now. Practice works better once it has settled.*), with *Try the practice anyway*; nothing hidden | `DailyCard` |
| Signed out | The Mindfulness practices from the Tools list and a line to sign in | `SignedOut` |

## The daily card (`practice_daily`)

No longer reserved: a live `FollowUpType` (`ownerModule: mf`, tier `practice`, deep link
`/practice?followUp={followUpId}`, content-free copy *A minute, when you're ready*, choice *Not today*, stale after 12 h).
Windows `morning` 08:30, `midday` 12:30, `evening` 19:30 (the next one still ahead), `next_local` in the client's
`dueAtFor`. The server accepts the new `midday` window.

It **rolls** instead of recurring: every visit to the home books the next card when a time of day is set and no card is
waiting (`shouldBookDaily`), and opening a card resolves it (`resolveFollowUp` status `done`) before the home reads, so
the read sees none waiting and books the next. *Waiting* means scheduled and not yet stale, so a missed day never blocks
the next card and produces nothing else: no *you missed*, no reset. A cue books nothing (the cue is the reminder).

## What's saved

- `practice_prefs`: a `ProfileFact` kind (About me → *My practice*, area `my_progress`, one per person, a re-save
  replaces it): `time` **or** `cue` (never both; the validator refuses), `cueOwn` only with *My own* (own words,
  encrypted, ≤ 60), `breath` (defaults to `no`). Read through the `practicePrefs` slice, `PROFILE_NEEDS.practice` only.
- Reps: the shared `SkillPractice` log. Catches are logged `self_report`. The read counts a visit once (Notice what's here
  logs `observe` and `describe` from one session), so the ring is visits, the skill cards are per skill.
- `getPracticeHome` (new callable, `functions/src/practice/`): the MF skills by `mfOrder`, the caller's own reps of them,
  and whether a daily card is waiting, in one read transaction; `compute.ts` is pure. Aggregates only: nothing it reads
  pre-fills a flow.

## The MF sequence in the graph

`scripts/practice-spine/content.py` `MF_SEQUENCE` sets `mfOrder`, the library's plain name (`practiceLabel`) and extra
tools on existing `PracticeSkill`s: Notice (`observe`, 1, also `five-senses`), Name (`describe`, 2, also
`find-the-feeling`), Without judging (`nonjudge`, 3), Wise mind (`wise_mind`, 5). Order 4 is left for one-mindfully
(MF-05) so the sequence reads as the PRD's (observe → describe → nonjudgment → one-mindfully → wise mind → effectively →
participate). A new MF skill joins the home by getting an `mfOrder`, no client change. `five-senses` and Find the
feeling now log `observe` / `describe` reps (the PRD's *PracticeSkill rows for existing tools*).

## Entry points

Tools → Mindfulness → *Practice* (the module heading's link); the positive-state result's quiet line *While it's calm: a
one-minute practice?* under *Keep this one* (ER-04 stays primary, never beside a crisis banner); the daily card on Today.

## Where it departs from the PRD

| PRD | Built | Why |
|---|---|---|
| A recurring `practice_daily` follow-up | A rolling one, booked by each visit | The spine has no recurrence rule; the rolling card behaves the same for a person who comes back and never piles up for one who doesn't |
| `PracticeProfile` node | `practice_prefs` `ProfileFact` kind | The profile layer's generic write path (kinds registry, own words encrypted, Me's still-true) covers it with no new label |
| Daily pick weighted by profile, flags, recent closes and fade level | Least practised in the sequence, not yesterday's tool | No fade levels or stirred / calm tags yet (part 2) |
| Stirred restricts the pick to stirred-okay practices | Not built | Needs the stirred / calm tags on practices (part 2); the tools themselves already gate on a carried reading |
| Library shows duration and *good when calm / okay when stirred* | Names and levels only | Same tags |
| Today's practice on the check-in screen | On Today (panel / header sheet) as the `practice_daily` card | Today moved off the check-in screen in Oct 2026 |
| Practice settings in Profile | *Change when* on the home; Me lists the kept setup | One place for now |
| Copy as graph nodes (`PracticeCue`, pros/cons chips) | `src/data/practiceHome.ts` | Presentation copy, not emotion knowledge; ids pinned to the validator by a test |
| *steady* result line | positive-state only | No steady band since D1 (no probe) |
| Breath preference used by practices | Stored only | No MF practice uses the breath yet; later practices read it |

## Part 2

| Piece | Batch |
|---|---|
| Fade: per-skill guidance control, *Want to try this one with less of me?*, week-3 favourites, a few days a week, level 3's *Did one without me today?* | MF part 2, after MF-B9 (needs the practices to fade) |
| Stirred / calm tags on practices, the stirred pick and the library's tags | MF part 2 (each new practice ships with its tag from MF-B4 on) |
| Reflect's Practice tab, qualitative mirrors, the *my words* shelf | MF part 2 |
| Push for the daily card (FCM), spiritual framing, external-only mode | open (PRD open questions) |
| Embedded MF-01 card for other hosts | MF part 2 |

## Tests

`tests/practice-home.test.mjs` (the mirror, compute, the pick, booking, levels, catches, the kind, the graph rows, no
counts on screen), `functions/test/unit/practiceHome.test.cjs` (the callable over the fake driver),
`tests/spine-validation.test.mjs` (reserved id mirror), the auth matrix and pinned endpoints.
