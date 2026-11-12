# Recover from a hurtful moment (Walking the Middle Path: recovering from invalidation)

Tool id `recovering-from-invalidation`. Graph concept `dbt_recovering_from_invalidation`, which sits under `dbt_walking_middle_path`, which sits under `dbt_interpersonal_effectiveness`. It is listed under Interpersonal Effectiveness, next to DEAR MAN.

## What it does

The flow runs through fixed stages, body first. It is written for the moment right after someone dismissed you, mocked you, made you feel small, left you out or pulled away.

- **Settle.** The person picks what happened (8 options), how intense it is (0–10), and which way the urge pulls: fight, chase, hide or shut down. That choice decides the arousal gate:
  - Fight or chase at 7 or above: a hold-to-lock "don't send", then cyclic sighs.
  - At 9 or above, or when the person was mocked: a cold reset first.
  - Hiding at 7 or above, and any shutdown: orient and move. People who are hiding or shut down are never given a calming routine.
- **Name it.** One tap picks the emotion; "Another word" opens the full picker.
- **Validate.** Self-validation, spoken to yourself by name (up to 2 lines). Attachment states also get a secure-base prime. Feeling small gets a self-compassion break.
- **Need.** The unmet need maps to Williams' four social needs. Invalidation states also get a certainty dial. Every state gets "About this person": whether they're safe, and how many times the person has already asked them.
- **Move.** Five exits:
  - **Ask:** hands off to DEAR MAN.
  - **Let it land:** grieve, an optional boundary, then meet the need elsewhere.
  - **Do the opposite:** matched to the urge.
  - **Park the replay.**
  - **Must → prefer.**
- **Close.** Re-rate, see the urge change and a skill-deck card, then optional follow-ups.

## Rules and where they live

- **All wording and clinical content lives in the graph.** `schema/invalidation-recovery.cypher` is generated from `scripts/invalidation-recovery/content.py` by `build.py`. Edit `content.py`, never the `.cypher` file. A test fails if the two drift apart.
- **Thresholds live in `flow.gates`:** downshift at 7, cold reset at 9, a heads-up on asking above 5 (`askMax`, never a lock since IE-B4), a 60-minute wait when the chosen opposite action is waiting instead of chasing (a timer the person opts into), certainty cut-offs of 80 and 40. `waitMinutes` (20) is no longer used to lock anything: DEAR MAN never locks the plan. If the latest rating is still above `askMax`, the DEAR MAN skill the ask opens cools down too: One message's cooling screen for the chase pull, the prep's hot step for the rest (both never lock).
  - `gateFor()` (client) and `expectedRecoveryGate()` (server) implement the same rule, and a test checks they agree.
  - The save callable recomputes the gate. It rejects an ask when the person isn't safe or has refused twice, or when a mocking state is deliberate. Above `askMax` the ask is allowed (IE-B4): the route shows *Ask them* open, never first (chase leads with its opposite action, waiting; other pulls with the next exit), with a heads-up under it (*Words can come out sharper than you mean. A minute with your body first can help, and the choice is yours.*) and *Breathe first* / *Move first* beside it, which re-rates and comes back to the route.
  - *Let it land*'s boundary line is FAST's `boundaryLine` card: copyable at any rating (the old `boundaryLocked` copy lock is gone), with *I don't need to say anything* as the way on until it's copied. The old copy keys (`locks.tooHot`, `route.unlockBreathe` / `unlockOrient`, `land.boundaryLocked`) stay in the graph for one release, read only by the pre-IE-B4 page in an open tab or before hosting deploys; a follow-up removes them.
- **Ask hands off to DEAR MAN.** The handoff carries the emotion, the need, the close intensity, the wait minutes, whether it's one message only, and the wait copy (`src/data/dearManHandoff.ts`).
  - DEAR MAN re-checks intensity if the close rating is above `askMax`.
  - DEAR MAN's own entry, and entries from check-in, now start with an intensity check. Its copy is in `schema/dear-man-safety-gates.cypher`.
- **Check-in recommendation.** `getStateAndTools` ranks `dbt_*` concepts by `ADDRESSES` edges into the pattern's emotions. This concept addresses `rejection` and `hot_shame`, among others, so it is recommended for `social_threat_shame` alongside Do the Opposite. With the current graph, no other pattern changes. This change needs clinical sign-off.
- **Saving.** Sessions (`InvalidationRecoverySession`) save once, at the end. They store ids and numbers only, no free text. Export and delete include them, along with DearManSession and ToolUsage.

## Graph

- New labels:
  - `InvalidationEvent`
  - `RecoveryProtocol`
  - `UnmetNeed`
  - `SocialNeed` (it also names the PracticeSkill credited for meeting the need elsewhere)
  - `RecoveryExit`
  - `PracticeSkill`
  - `InvalidationRecoveryFlow` (the versioned copy and threshold document, `recovery-v1`)
  - `InvalidationRecoverySession`
  - `DearManSafetyCopy`
- New TherapyConcepts:
  - `dbt_walking_middle_path`
  - `self_validation`
  - `affect_labeling`
  - `distanced_self_talk`
  - `self_compassion_break`
  - `security_priming`
  - `cyclic_sighing`
  - `rumination_postponement`
  - `need_restoration`
  - `dbt_recovering_from_invalidation`
- Everything else links to existing Emotion, ActivationPattern, TherapyConcept and ClinicalSource nodes. Before each list is re-linked, its edges are deleted, so re-running the migration is idempotent.

## Code map

| Area | Files |
|---|---|
| Page | `src/pages/tools/InvalidationRecovery.tsx` |
| Flow-specific UI | `src/components/tools/invalidationRecovery/` |
| Shared regulation UI (also used by DEAR MAN) | `src/components/tools/regulation/`: BreathOrb, ColdReset, Orient, WaitLock, ProgressRing |
| Pure logic | `src/lib/invalidationRecovery.ts` (gates, routing, mastery), `src/lib/invalidationRecoveryFlow.ts` (step machine with snapshot history) |
| DEAR MAN | `src/lib/dearManSafety.ts`, changes in `src/pages/tools/DearMan.tsx` |
| Backend | `getInvalidationRecoveryContent`, `saveInvalidationRecoverySession`, `getInvalidationRecoveryProgress` and `getDearManContent` (adds `safetyGates` and `safetyCopy`) in `functions/src/index.ts`; `functions/src/invalidationRecoveryValidation.ts` |
| Tests | `tests/invalidation-recovery.test.mjs`, `tests/dear-man-handoff.test.mjs` |
| Dependency | `motion`, loaded through `LazyMotion` + `domAnimation` |

## Deploy order

1. **Functions** (new callables plus the updated getDearManContent, exportUserData and deleteUserData). The old frontend ignores them.
2. **Hosting.** If the graph isn't loaded yet, the new tool shows its retry error and fails safely. DEAR MAN skips its gates.
3. **Graph:**
   - `node scripts/load-graph.mjs --only invalidation-recovery`
   - `node scripts/load-graph.mjs --only dear-man-safety-gates`
   
   Load the graph last. Loading it before hosting makes check-in recommend a tool the old frontend doesn't know. Run it outside peak hours: the delete-then-re-link statements are separate auto-commits.
4. **Smoke test on staging first:**
   - content loads
   - one path per exit saves once
   - a second save returns `already-exists`
   - export and delete include the new session types
   - DEAR MAN plan opens with the "still loud" heads-up when the latest rating is above askMax (never locked)

## Not done on this branch

- The Practice page (skill deck, evidence log, visibility ladder). Skill cards currently appear only at close.
- Phase 3 fixes to other tools:
  - Opposite Action: interpersonal urges, and validation before check-the-facts.
  - Problem Solve: links to unregistered tools.
  - Pause: breath pacer.
  - Urge Surfing: the peak bug.
- Back doesn't restore validation picks, or a mid-band certainty answer.
- Clinical review of the copy, the evidence grades, and the US-only safety numbers.

## v2: Stage it

Status: agreed direction, not built. Prototype: `prototypes/goblin-lab/src/directions/Stage`.
Umbrella: [alexithymia-first-interaction.md](alexithymia-first-interaction.md).

recovery-v1 asks people to describe the moment from a list and rate it 0–10 several times. v2 lets them
**rebuild the moment** with figures on a small 3D stage (sandtray / family sculpting) and replaces every
number with the capacity band.

| v1 step | v2 |
|---|---|
| What happened? (list) | **Set the scene.** Drag Them away, tap to turn them, resize, add others, add a jagged speech burst. The arrangement is read live into an `InvalidationEvent` ("Looks like: they turned away from you"); the list stays as "not quite?" |
| How loud (0–10) + pull | **Capacity band** (Them holds up a phone; three replies). **Pull by dragging your own figure**: slowly toward = chase, flick toward = fight, off the edge = hide, "it won't move" = blank |
| Downshift / cold / breathe | **Step back from it**: each held breath lifts the camera until your stage is one lit stage among many (visual self-distancing, Kross & Ayduk). Cold reset stays as an explicit offer when flooded |
| Orient (freeze) | **Come back into the room**: lights come up as you find something blue, something round, the highest thing |
| Label (list) | Short **Find the feeling** (shape or ear), or the scene's words offered in third person: "Someone standing here might feel…" |
| Need (list) | **Set it the way you wanted it**: turn them to face you, same height, others make room. The arrangement maps to an `UnmetNeed` and is handed to DEAR MAN |
| Exits | Same three exits and locks, with `askUnlocked = band === 'steady' && pull !== 'blank'` replacing `askMax`. Opposite action is **acted out** by your figure |
| Close (two numbers) | **Then vs. now**: the starting stage and the current one side by side |

Graph changes (recovery-v2, in `scripts/invalidation-recovery/content.py`):

- `FLOW.version = "recovery-v2"`; `gates` become band-based (`regulateBands`, `askBands`, `coldOffer`)
  instead of `downshiftAt`/`coldAt`/`askMax`. `dear-man-safety-gates.cypher` reads the same bands.
- `InvalidationEvent.stageCues`: which arrangement features read as this event (turned, far, taller,
  excluded, speech) so the stage reading is content, not code.
- `UnmetNeed.stageCues`: which "how you wanted it" arrangement expresses each need.
- `InvalidationRecoverySession` adds `band`, `stage` (start and end arrangement snapshots), `close`;
  the validator and `expectedRecoveryGate` move to bands. v1 sessions stay readable.

Open: Stage's drag-speed thresholds (chase vs. fight) need tuning on real phones before this ships.
