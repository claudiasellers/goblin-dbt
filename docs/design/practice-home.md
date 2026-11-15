# Practice home (MF-02, MF-B3)

Status: **built 15 Nov 2026** (MF-B3). Source: `PRD – Mindfulness.md` §MF-02, *Practice (home, daily rep, reps, fade)*;
the modules plan §5.3a. Route `/practice`.

DBT's mindfulness is learned in small, frequent practice while it's calm. Skills use mediated DBT's outcomes in
secondary analyses (Neacsiu et al. 2010; Barnicot et al. 2016: Moderate), and in Soler et al. 2012 more mindfulness
practice time went with more change (Preliminary: one trial, correlational). Until now the app met skills only in the moment. The Practice home is the calm-time door.

## What it does

| Part | What happens | Where |
|---|---|---|
| Setup (first signed-in visit, three screens, ≤60 s; never over a carried flooded reading) | **Why**: *Skills practised when it's calm are the ones you can reach when it's loud.* Four chips from MF Worksheet 1's structure, tap any (nothing saved from them). **When**: *Morning · Midday · Evening*, or a cue (*After I brush my teeth · When the kettle's on · On the bus or train · When I sit down at my desk · My own*, an implementation intention), or *No reminder*. **Breath**: *Is it okay if some practices use your breath? Yes · Not sure · No* (not sure counts as no; eyes stay open in every practice). *Not now* on every screen; on the first setup it's remembered on the device, per person, and after it the setup opens only from *Change my reminder*. *When* and *Breath* are radio groups. Done keeps `practice_prefs` | `Setup` in `src/pages/Practice.tsx` |
| Today's practice | One practice from the MF sequence (graph: `PracticeSkill.mfOrder`): the skill practised least, earlier in the sequence on a tie, never the tool used last; *A different kind* swaps to the next skill with a different tool. One tap opens the tool. After a Notice what's here that closed *further away*, it opens outside-only (`?frame=far`, no Inside; `noticeFar`) | `dailyPick` in `src/lib/practiceHome.ts` |
| Caught one? | *Caught a judgment* (a `nonjudge` rep, source `catch`) and *Did one without the app* (an off-phone `observe` rep). One tap each, *Noticed. That's the skill.* / *One without the app, noted.*, and after a judgment *Unpack it, if it's still there*. Linehan's H5a clicker in phone form. Nothing else rides on a catch (no feelings, follow-ups, words or detail: the validator refuses them) | `recordCatch` in `src/services/practice.ts`, a `recordToolSession` one-shot under the reserved tool `practice` |
| This week | A ring of this week's reps (three fill it: *a few days a week*, so a full ring is in reach), read in words for screen readers (*Nothing yet this week · Some practice this week · A full week*), **no number**. *Reps count whenever they happen. Levels never go down.* | `ProgressRing` (`valueText`), `weekFraction` |
| Your skills | Each MF skill with a level of five dots (Recover's 1 / 3 / 7 / 15 / 30 reps, never decaying; *Not tried yet* / *Level n* / *Well practised*) and its practices as links. *Any of these, any time. Nothing is locked.* | `library`, `levelOf` |
| Off the phone | *Some of your practice happens without the app now.* once any rep was off-phone or caught | |
| Change my reminder | Opens the setup at *When*. A changed time (or none) dismisses the waiting card; the next read books the new one | |
| A flooded reading | A carried flooded band puts *First, the body* above everything (*Your body's loud right now. Practice works better once it has settled.*); today's practice stays below it, quieter, with *Or try today's practice anyway. It's still here.* Nothing hidden, and no setup asked | `BodyFirst`, `DailyCard` |
| Signed out | The Mindfulness practices from the Tools list and a line to sign in | `SignedOut` |

## The daily card (`practice_daily`)

No longer reserved: a live `FollowUpType` (`ownerModule: mf`, tier `practice`, deep link
`/practice?followUp={followUpId}`, content-free copy *A minute, when you're ready*, choice *Not today*, stale after 12 h).
Windows `morning` 08:30, `midday` 12:30, `evening` 19:30 (the next one still ahead), `next_local` in the client's
`dueAtFor`. The server accepts the new `midday` window.

It **rolls** instead of recurring: every visit to the home books the next card when a time of day is set and no card is
waiting (`shouldBookDaily`), and opening a card resolves it (`resolveFollowUp` status `done`) before the home reads, so
the read sees none waiting and books the next. *Waiting* means scheduled and not yet stale, so a missed day never blocks
the next card and produces nothing else: no *you missed*, no reset. The read lists booked cards past their 12 h
(`staleDailyIds`) and the home dismisses them, so nothing piles up on Today. A cue books nothing (the cue is the
reminder).

## What's saved

- `practice_prefs`: a `ProfileFact` kind (About me → *My practice*, area `about_me`, one per person, a re-save
  replaces it): `time` **or** `cue` (never both; the validator refuses), `cueOwn` only with *My own* (own words,
  encrypted, ≤ 60), `breath` (defaults to `no`). Read through the `practicePrefs` slice, by `PROFILE_NEEDS.practice` and
  `PROFILE_NEEDS['wise-mind']` (the breath). Me can set it aside (no daily card until the setup is done again).
- Reps: the shared `SkillPractice` log. Catches are logged `self_report`. The read counts a visit once (Notice what's here
  logs `observe` and `describe` from one session), so the ring is visits, the skill cards are per skill.
- `getPracticeHome` (new callable, `functions/src/practice/`): the MF skills by `mfOrder`, the caller's own reps of them,
  the booked daily cards (waiting or stale) and the last Notice what's here close, in one read transaction; `compute.ts`
  is pure. Aggregates only: nothing it reads
  pre-fills a flow.

## The MF sequence in the graph

`scripts/practice-spine/content.py` `MF_SEQUENCE` sets `mfOrder`, the library's plain name (`practiceLabel`) and extra
tools on existing `PracticeSkill`s: Notice (`observe`, 1, also `five-senses`), Name (`describe`, 2, Find the feeling
first through `MF_LEADS`, so its daily practice isn't Notice what's here again), Without judging (`nonjudge`, 3), Wise
mind (`wise_mind`, 5). One thing (`one_thing`, 4) joined with
MF-B4 (MF-05), so the sequence reads as the PRD's (observe → describe → nonjudgment → one-mindfully → wise mind → effectively →
participate). A new MF skill joins the home by getting an `mfOrder`, no client change. `five-senses` and Find the
feeling now log `observe` / `describe` reps (the PRD's *PracticeSkill rows for existing tools*).

## Entry points

Tools → Mindfulness → *Practice* (the module heading's link); the positive-state result's quiet line *While it's calm: a
one-minute practice?* under *Keep this one* (ER-04 stays primary, never beside a crisis banner); the daily card on Today.

Out to Notice what's here (MF Arch Map §2 rows 3–4): First, the body's end card, which only a quieter close reaches,
offers *A minute noticing what's around you* (`frame=far`, outward only) unless the fork said something can be done;
Held's end card offers it after a close that helped, never after Hurt myself.

## Where it departs from the PRD

| PRD | Built | Why |
|---|---|---|
| A recurring `practice_daily` follow-up | A rolling one, booked by each visit | The spine has no recurrence rule; the rolling card behaves the same for a person who comes back and never piles up for one who doesn't |
| `PracticeProfile` node | `practice_prefs` `ProfileFact` kind | The profile layer's generic write path (kinds registry, own words encrypted, Me's still-true) covers it with no new label |
| Daily pick weighted by profile, flags, recent closes and fade level | Least practised in the sequence, not yesterday's tool | No fade levels or stirred / calm tags yet (part 2) |
| Stirred restricts the pick to stirred-okay practices | Not built | Needs the stirred / calm tags on practices (part 2); the tools themselves already gate on a carried reading |
| Library shows duration and *good when calm / okay when stirred* | Names and levels only | Same tags |
| Today's practice on the check-in screen | On Today (panel / header sheet) as the `practice_daily` card | Today moved off the check-in screen in Oct 2026 |
| Practice settings in Profile | *Change my reminder* on the home; Me lists the kept setup and can set it aside | One place for now |
| Copy as graph nodes (`PracticeCue`, pros/cons chips) | `src/data/practiceHome.ts` | Presentation copy, not emotion knowledge; ids pinned to the validator by a test |
| *steady* result line | positive-state only | No steady band since D1 (no probe) |
| Breath preference used by practices | Wise mind reads it: without a yes, its default practice is *Stone on the lake* (no breath counting); the other two stay one tap away | The later practices read it as they ship |
| Weekly goal | Three reps fill the ring | The PRD's *a few days a week*; seven made a full ring rare for a busy week |
| Clinical rules on the home: two *further away* closes in a row, Inside on an alarm reading, a dissociation reading | One rule built: after *further away*, the next Notice opens outside-only | The rest need the reading history on the home (part 2) |

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
counts on screen), `functions/test/unit/practiceHome.test.cjs` (the callable over the fake driver, and
startToolSession / closeToolSession refusing a catch), `tests/skill-first-body.test.mjs` and `tests/skill-held.test.mjs`
(the noticing offers),
`tests/spine-validation.test.mjs` (reserved id mirror), the auth matrix and pinned endpoints.
