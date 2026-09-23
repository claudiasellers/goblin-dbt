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

Uncertainty in safety blocks practice; uncertainty in facts or effectiveness routes to clarification. Safe + unhelpful urge permits opposite action whether the feeling fits, is excessive, or does not fit. A helpful urge routes to addressing the situation. The app does not decide that a user's interpretation is objectively true. Shame and guilt keep their original emotion identity; there is no inferred conversion between them.

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
