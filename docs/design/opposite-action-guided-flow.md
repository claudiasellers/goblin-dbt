# Opposite Action: guided practice and future retrieval

## What changed

The original exercise combined multiple emotion protocols, routed uncertainty straight into opposite action, and treated a commitment as a completed practice. The new exercise focuses on one emotion and urge, separates facts from interpretation, asks about effectiveness, and produces a plan before asking about an actual attempt.

Inputs carry forward: emotion → graph protocol and urges; selected urge → graduated actions; goal → decision and plan; safety/facts/effectiveness → response branch; barrier → backup requirement; actual attempt and intensity → reflection. A custom urge is explicitly paired with general examples, not represented as an AI interpretation. Free text is never analyzed or diagnosed by this version.

The underlying skill follows Linehan's Emotion Regulation Handouts 9–11 and Worksheet 7 concepts. App wording is original. Goal selection, obstacle planning, separate planned/practiced states, and structured observations are product extensions rather than claims about workbook content. Clinical content review is still needed before public clinical release.

Sources:
- Marsha M. Linehan, *DBT Skills Training Handouts and Worksheets*, second edition: https://www.guilford.com/books/DBT-Skills-Training-Handouts-and-Worksheets/Marsha-Linehan/9781572307810
- Jill Rathus, Psychwire, *Opposite Action Steps For Sadness*: https://psychwire.com/free-resources/therapy-demonstrations/resource-1y329mm/opposite-action-steps-for-sadness

## Architecture

Existing Emotion → HAS_REGULATION_CONTENT → EmotionRegulationContent → HAS_ACTION_URGE → ActionUrge traversal remains the source of emotion-specific suggestions. New OppositeActionFlow owns the cross-emotion protocol copy, choices, and decision table in Neo4j. Its contentJson is a versioned UI protocol document; relationships connect the protocol to source and emotion-content nodes. Frontend TypeScript contains shapes and navigation, not a second emotion knowledge base.

Uncertainty in safety blocks practice; uncertainty in facts or effectiveness routes to clarification. Safe + unhelpful urge permits opposite action whether the feeling fits, is excessive, or does not fit. A helpful urge routes to addressing the situation, except when the feeling doesn't fit the facts: then it goes to clarify (it may be serving a different goal; clarify opens Check the Facts; ER-03 items 5–6, Nov 2026). The app does not decide that a user's interpretation is objectively true. Shame and guilt keep their original emotion identity; there is no inferred conversion between them.

Saved OppositeActionSession nodes use a unique user-scoped key, Firebase-authenticated identity, parameterized Cypher, input limits, graph-validated emotion/urge provenance, server-owned source IDs, and transactional upserts. Saving a reflection updates the same plan; repeating practice starts a new session. Per-session snapshots preserve wording and contentVersion. Explicit saves only; no localStorage, logging of exercise text, or LLM calls. Account export/deletion includes these new nodes. Saving records evidence; it does not yet add an Opposite Action history screen or automatic resumption after closing the page.

## Deployment order

1. On the existing Neo4j database, run `schema/opposite-action-flow.cypher` after the existing `emotion-regulation-content.cypher` and `opposite-action-data.cypher`. Do not rerun the base content afterward without rerunning this migration; it corrects two absolute efficacy claims. Migration is idempotent and adds a session-key uniqueness constraint.
2. `npm ci --prefix functions && npm run build --prefix functions`.
3. Deploy `getOppositeActionContent`, `saveOppositeActionSession`, `exportUserData`, and `deleteUserData` through the existing Firebase workflow.
4. `npm ci && npm run build`, then deploy Firebase Hosting.
5. Smoke-test against authenticated staging: load content; save plan then reflection; confirm one upserted session; export; delete test account data. Check all nine emotion protocols and alternative-skill mappings on the actual graph.

Deploy backend and graph first. The old frontend tolerates the additive `flow` response. The new frontend shows a retryable error if the migration or compatible callable is absent. No database mutation or Firebase deployment was performed while authoring this change.

## Future graph-grounded generation

Use a server-side callable, not Neo4j credentials or an LLM API key in the browser. Explicitly request an insight. Resolve the authenticated user's session with `(u:User {id: $authUid})-[:COMPLETED_SESSION]->(s:OppositeActionSession {id: $sessionId})`; do not retrieve by client-supplied user ID or globally by emotion. Follow FOCUSED_ON, TARGETED_URGE, USED_PROTOCOL and GROUNDED_IN for curated context. Historical contentVersion and dataJson remain authoritative for what was actually presented.

A retrieval envelope should contain:
- `session`: typed observations, interpretation, goal, safety/facts/effectiveness answers, action, obstacle, and outcome; flag these as user reports, not verified facts.
- `evidence`: only the relevant graph nodes with IDs, source metadata, clinical review status, and supported relationships; explicitly distinguish neuroscience hypotheses from established skill guidance.
- `decision`: deterministic route and any safety constraints. Generation must not override these.
- `history`: optional, limited to this authenticated user and purpose, with planned sessions excluded from effectiveness calculations.

Have the model return structured `insight`, `suggestedAdjustment`, `evidenceIds`, and `uncertainty`. Validate cited IDs against retrieved nodes; reject unsupported claims and never run model-generated Cypher. Treat user text and graph text as data rather than instructions. Keep a curated fallback when retrieval or generation fails. Do not infer causality from a before/after rating or present fabricated personalized insight. No model/provider is selected or connected in this PR.

## Verification

- `node --test tests/opposite-action.test.mjs`: all 12 decision combinations, safety/unknown input routing, reflection precedence, validation and malformed/oversized submissions.
- `npm run build` and `npm run build --prefix functions`.
- Scoped ESLint on the new frontend files.
- Chromium browser checks passed at 390px mobile and 1280px desktop widths: safety blocking, uncertainty, problem-solving, plan save, save failure/retry, practiced reflection, repeated attempt, and unsafe outcome. No horizontal overflow or runtime errors. Graph and save responses were mocked; live Firebase/Neo4j integration requires the staging smoke test above.

## v2 (`oa-guided-v2`)

The migration in `schema/opposite-action-flow.cypher` replaces the v1 flow content; `getOppositeActionContent` now accepts only `flow.version === 'oa-guided-v2'`.

**What changed and why**
- **Compression.** Roughly 10 screens became about 6 for someone in high distress: one decision per card, taps instead of typing, no required free text. Situation and snag planning are optional, and a backup plan is never required, even when the user picks a snag. The v1 willingness choice was removed. Safety runs first and the graph route table is unchanged: unsafe or unsure goes to support, and uncertain facts or effectiveness go to clarify (doesn't fit + helpful too, since Nov 2026; problem is for a feeling that fits).
- **Somatic circuit-breaker.** Before planning, the user holds at least one body cue for about 3 seconds (posture, face or muscle tension, which is the "all the way" part of opposite action). The cues come from the graph: `EmotionRegulationContent.somaticCues` per parent, plus optional urge-level cues on `ActionUrge`. `somaticCues` (a list) is shown before the parent defaults. When `somaticReplace` is true, only the urge's cues are shown: `fear-freeze` and `sad-bed` need up-regulation such as standing or sitting up, not relaxation. `getOppositeActionContent` returns `somaticCues` (default `[]`) and `somaticReplace` (default `false`) for each urge. An escape swaps in a smaller micro-step, which the user still holds.
- **Urge metric.** The headline number is urge strength ("how strong is the pull to {urge}"), 0–10: `urgeBefore` → `urgeAfterBody` → `urgeAfter`. Emotion intensity is optional and secondary, and the readout never leads with a flat emotion number.
- **Follow-up loop.** A plan for later is saved with a `dueAt` no more than 48h ahead. Home shows a follow-up card, and the user can download a content-free `.ics` reminder. The follow-up reflection (did / partly / didn't, with a reason) updates the same session.

**New fields.** The session is `schemaVersion: 2` (see `src/data/oppositeActionTypes.ts` and `functions/src/oppositeActionValidation.ts`). New fields: `urgeLabel`, `urgeBefore`, `urgeAfterBody`, `urgeAfter`, `bodyCues[]`, `cueId` (`now|today|next_time`), `dueAt`, `missedReason` and `status: 'missed'`. `OppositeActionSession` nodes also store `schemaVersion`, `urgeBefore`, `urgeAfterBody`, `urgeAfter`, `missedReason`, `cueId`, and `dueAt` (a Neo4j `datetime`, indexed, or null). Scores (`urge*`, `intensity*`) and `schemaVersion` are stored on the node as Neo4j integers. The `dataJson` snapshot always carries the latest status and the server's `sourceIds`. The read callables return scores from `dataJson`, as JSON numbers, never from the node integers.

**Save semantics.** The upsert key stays `${uid}:${id}`, inside one write transaction. It runs the same knowledge check as v1: the flow version matches, the emotion is applicable, the urge belongs to the parent unless it is custom, and the route is `opposite`. Allowed status transitions on the same node:
- `planned` can move to `practiced` or `missed`.
- `missed` can move to `practiced`, when the user did it later.
- `practiced` is final.

Any other transition, including any move back to `planned`, is rejected with `failed-precondition`. Payloads are never logged.

**New callables.** All three require auth and return only the caller's own schema v2 sessions. Each item is the parsed `dataJson` with the node's `status`, `createdAt` and `updatedAt`. Unparseable records are skipped.
- `getOppositeActionSessions({ limit?: 1..50 = 20 })` returns `{ sessions }`, newest `updatedAt` first.
- `getOppositeActionSession({ id })` returns `{ session | null }`. It is used for follow-up deep links, and matches on key `${uid}:${id}`, so another user's ID resolves to null.
- `getOppositeActionFollowUps({})` returns `{ sessions, copy }`:
  - `sessions`: planned sessions whose `dueAt` is later than 7 days ago, soonest first, at most 10.
  - `copy`: the `followUpCard*`, `notificationBody` and `calendar*` strings from the flow copy, or `{}` if the flow node is missing. Export and delete already cover `OppositeActionSession`.

**Deployment order**
1. Run `schema/opposite-action-flow.cypher` on Aura. It sets the v2 flow, somatic cues, urge overrides and the `dueAt` index.
2. `firebase deploy --only functions`. This includes the updated `getOppositeActionContent` and `saveOppositeActionSession` and the new `getOppositeActionSessions`, `getOppositeActionSession` and `getOppositeActionFollowUps`.
3. `firebase deploy --only hosting`.

Between steps 1 and 3, saves from the v1 frontend fail with `failed-precondition`, because their `contentVersion` no longer matches the flow node. Deploy the three steps close together.

**Not implemented yet.** Push notifications (FCM tokens plus a scheduled function that queries planned sessions by `dueAt`) are the next layer. Today the loop relies on the in-app follow-up card and the optional calendar file.

**Verification.** `node --test tests/*.mjs` covers:
- the v2 validator: valid planned-later, planned-now, practiced and missed sessions, rejection cases, and stripping of client-supplied `userId`/`sourceIds`
- `urgeReadout`, `capacityDefaultSize`, `fill` and `urgePhrase`
- follow-up timing and states
- the `.ics` file containing no action or emotion text
- the required copy keys, and a check that no copy overpromises
- somatic cue coverage for all 9 parents, each urge override ID, `replace: true` on freeze and bed urges, and no relaxing cues on freeze
