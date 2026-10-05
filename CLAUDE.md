# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Goblin DBT is a neuroscience-informed DBT (Dialectical Behavior Therapy) app. It is NOT an emotion tracker — it is solutions-focused. The user is feeling something, and the app helps them (1) develop better language for their experience (affect labeling, which itself is therapeutic), and (2) find tools that target underlying neural mechanisms, not just surface symptoms.
The knowledge graph is the brain of the app. It encodes relationships between emotions, brain structures, functional networks, neurochemical systems, therapy concepts, and tools across multiple modalities (DBT, IFS, CBT, ACT, EMDR, Somatic Experiencing, CPT, MBCT, Polyvagal Theory).

As a general guiding principle, every phase and tool should lead with curated, tappable options based on what they've already told us, with "add your own" as an escape hatch — not the other way around.

## Architecture

**Three-tier: React frontend → Firebase Cloud Functions → Neo4j graph database**

- **Frontend** (`/src`): React 19 + TypeScript + Vite + Tailwind CSS. Uses HashRouter. State managed via Context API (`AuthContext`, `UserProfileContext`) — no Redux.
- **Auth** Firebase Authentication (email/password)
- **Cloud Functions** (`/functions/src`, Node 22): one directory per domain, each `index.ts` exporting its callables (table below). `functions/src/index.ts` only re-exports the deployed functions by name (never `export *`); the export name is the deploy name. Shared helpers live in `functions/src/shared/` (Neo4j driver singleton + `withSession`/`readTx`/`writeTx`, `requireUid`, pure validators, error mapping, and `callable()` for new callables). Input validation for the tool sessions sits in `functions/src/*Validation.ts`. User IDs come from Firebase Auth tokens server-side (`request.auth.uid`).
- **Graph Database** (`/schema/*.cypher`):Neo4j Aura (knowledge graph + user data) Neo4j with nodes for User and all of the emotion / therapy / modality information. Again, this is the brain of the app.
- **Data layer** (`/src/data/`): Static TypeScript files for UI presentation metadata only — emotions (display names, families, emojis), tools (names, categories, taglines), body regions, micro-steps. All emotion knowledge and clinical content comes from the graph via Cloud Functions.
- **Hosting** Firebase Hosting
- **Deployment** `firebase deploy` (`--only functions` / `--only hosting`; hosting's `predeploy` runs the build). There is no `npm run deploy` (the old gh-pages script is gone).

Functions modules (`functions/src/<domain>/index.ts`; reserved for Phase A: `capacity/`, `witness/`, `spine/`, `profile/`, `userdata/`, `safety/`):

| Module | Callables |
|---|---|
| `checkin/` | `saveCheckIn` (idempotent upsert by client id; saved when the result renders), `setCheckInNextAction`, `getCheckInsByUser`; `validation.ts` |
| `account/` | `ensureUserExists`, `getUserProfile`, `updateUserProfile`, `deleteUserData` (+ Auth user with `deleteAuth`), `exportUserData`; triggers `onUserCreated` / `onUserDeleted` (`account/triggers.ts`) (settings-style profile; `profile/` is reserved for the three-layer "Me") |
| `toolUsage/` | `trackToolUsage`, `recordToolOutcome` |
| `insights/` | `getInsightsData` (Reflect). `handler.ts` is pure orchestration over an injected query layer (`queries.ts`); `compute.ts` is the numbers, pure (`tests/reflect-insights.test.mjs`). Outcomes are the spine's close answers (`ToolSession.thenVsNow` / `actedOnUrge`; "went well" = better or much better, the `what_helps` rule's line), not the compat `ToolUsage.outcome`; words are counted one by one, not as the `CheckIn.emotion` join |
| `recommendation/` | `getStateAndTools`, `getDiscriminatingQuestions`, `getRelatedEmotions` (both still deployed; the app reads `src/data/content/discriminating-questions.json` and `related-words.json` instead) |
| `oppositeAction/` | `getOppositeActionContent`, `saveOppositeActionSession`, `getOppositeActionSessions`, `getOppositeActionSession`, `getOppositeActionFollowUps` |
| `dearMan/` | `getDearManContent`, `saveDearManSession`, `getDearManDebriefContent`, `getDearManReflection`, `getDearManSessions` |
| `problemSolve/` | `getProblemSolveContent` |
| `invalidationRecovery/` | `getInvalidationRecoveryContent`, `saveInvalidationRecoverySession`, `getInvalidationRecoveryProgress` |
| `findTheFeeling/` | `getFindTheFeelingContent` (still deployed; the app reads `src/data/content/find-the-feeling.json`), `saveFindTheFeelingSession`, `getFeelingCollection` |
| `spine/` | `startToolSession`, `closeToolSession`, `recordToolSession`, `answerToolOutcome`, `scheduleFollowUp`, `resolveFollowUp`, `snoozeFollowUp`, `getToday`, `getSpineContent` (public); `todayOrder.ts` (derived due/stale/upcoming + ordering), `tools.ts` (every tool's module + close kind; mirrored in `src/lib/spine/close.ts`), `extSchemas.ts` (namespaced `ToolSession.ext`, R18), `validation.ts` |
| `profile/` | `getProfileContext` (the single profile read path: only the slices `PROFILE_NEEDS` declares per tool, in code), `getMe`, `upsertProfileFact`, `confirmProfileItem`, `setAsideProfileItem`, `restoreProfileItem`, `answerPatternOffer` (the only writer of `MyPattern`); `slices.ts` resolvers never read a `:LogRecord` (test-enforced) |
| `capacity/` | `getCapacityContent` (public); `types.ts` (band, canonical then-vs-now R3, mirrored in `src/data/capacityTypes.ts`), `reading.ts` (`validateCapacityReading`, `readingProps`) |
| `bodyMap/` | `getBodyMapContent` (public): signed-off sensation words, and the body-mirror maps the sent grid words `MIRRORS`, in their order, each with places computed from the `FELT_AS` rows of the emotions it `GROUPS` (`places.ts`, pure; `docs/design/body-map.md`); `suggestEmotionsFromBody` (public): body-first suggestions, the marked places scored against the signed-off maps (`suggest.ts`, pure); `types.ts` mirrored in `src/data/bodyMapTypes.ts`. Both still deployed; the app reads `src/data/content/body-map.json` and scores with the same `suggest.ts` |
| `witness/` | `getWitnessLines` (public; signed in it also reads own / kept lines via `readProfileSlices(tx, uid, 'witness')` and the `SHOWED_LINE` history), `recordWitnessBeat` (host must be the caller's, found by key; `SHOWED_LINE` follows the host's lifecycle guard; `OwnLine` / `SAVED_LINE` are profile writes); `rank.ts` (pure ranking, fade stage, when to ask "did that land?"), `types.ts` (mirrored in `src/data/witnessTypes.ts`), `validation.ts` (own-line text is length-checked only, never linted) |

`userdata/` (no callables) holds the data-layer registry, ownership helpers, lifecycle guards and generic export/delete (see Data layers).

Adding a callable: export it from its domain module, add one line to `functions/src/index.ts`, add it to `functions/test/fixtures/endpoints.json` and the auth matrix (`functions/test/unit/auth-matrix.test.cjs`). Prefer `callable({ auth, label }, handler)` from `shared/callable.ts`.


## The capacity question is out (30 Sep 2026)

The band probe ("If someone asked you for a favour right now, you'd…" and its relational "If they texted you…" form) is not shown anywhere: not in the check-in, Find the feeling or DEAR MAN, and `CapacityProbe` is deleted. Claudia's call: it measured social style more than state, and nobody could say what it adds over the quadrant, emotions and body map. Don't bring it back, or a reworded version, until the clinical dimension it's for has been decided.

What still works without it: unpleasant check-ins carry a current (≤ 20 min, non-flooded) reading or have no band, and `getStateAndTools` infers one (`flooded` for flooding patterns, else `stirred`). FTF sessions save `band: null` (validation accepts it; old sessions keep theirs); with no band only the pull sets regulation (blank → warm/wake; the flooded calm-first and flooded+blank paths need a band). DEAR MAN, P2 hand-offs, the too-much link and Recover's hand-off band are unchanged. The probe copy is still in the graph (`schema/capacity.cypher`, FTF's `copy.capacity`) and not served to any screen.

## Key Architecture Decisions

1. **The frontend never connects to Neo4j directly.** All graph queries go through Firebase Cloud Functions. Neo4j credentials are stored as Firebase secrets (`NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`) and never exposed to the browser.

2. **User identity is handled by Firebase Auth.** Cloud Functions extract the user ID from `request.auth.uid` — the frontend never sends user IDs as parameters.

3. **The knowledge graph powers recommendations: pattern × band → `RECOMMENDED_FOR` → concept `appToolId`.** What `getStateAndTools` (signed-in only; `functions/src/recommendation/`) runs: the quadrant picks 4 candidate patterns (high-unpleasant: `acute_alarm`, `chronic_vigilance`, `emotional_flooding`, `social_threat_shame`; low-unpleasant: `conservation_freeze`, `dissociation_overmodulation`, `rumination_loop`, `reward_drive_low`; pleasant quadrants return a synthetic `positive_state` with no query). Each candidate is scored from `(ActivationPattern)-[:ASSOCIATED_WITH]->(Emotion)` for the check-in's emotion ids plus `(QuestionResponse)-[:EVIDENCE_FOR]->(ActivationPattern)` for discriminating answers; `CO_OCCURS_WITH` may add a secondary pattern (`patternScoring.ts`). The tool step (`select.ts`): the winning pattern's `(TherapyConcept)-[:RECOMMENDED_FOR {bands, priority, emotionGate, requiresPrior, active}]->(ActivationPattern)` rows for the check-in's capacity band (the request's band, else inferred: `flooded` for flooding, else `stirred`) → emotion gates → hard filters (flooded: body/orient only; blank patterns: nothing `down`; the `CONTRAINDICATED_FOR` hook) → one card plus one swap of a different `skillKind` (never two change skills), ranked by priority then emotion overlap; the concept's `appToolId` is the card id. All of that is graph content from `scripts/recommendations/content.py`. `RoutingPolicy {id: 'checkin_result'}.enabled` is the kill switch: off (or missing) runs the legacy ranker (`legacy.ts`: top 2 `dbt_*` concepts by how many of the pattern's emotions they reach via `ADDRESSES|REDUCES|TARGETS`). Every non-positive result carries `routing` (version, band, bandSource, blank, ruleIds, filtered, receiveFirst). A `TRIGGERS_SAFETY` crisis flag (skipped for low-unpleasant; one seam, `functions/src/safety/checkinSafetyFlag.ts`) shows the crisis banner above the result; low-unpleasant adds a guided activity. Grid words (sent as lower-cased display names, `anxious`, `let_down`) reach the pattern vocabulary (`anxiety`, `rejection`) through `(:Emotion)-[:SCORES_AS]->(:Emotion)` aliases the scoring query reads (E4-6, `scripts/recommendations/vocabulary.py`; before it, plan F1, no grid word moved the pattern); plain anger words are held (no alias), so one anger word never lands on crisis-flagged `emotional_flooding`. Both unpleasant quadrants ask their discriminating questions. The aliases and the high-unpleasant answers count only while `RoutingPolicy` is enabled, so the kill switch restores today's routing whole.

4. **Idempotent schema loading with MERGE.** Every loaded Cypher file is MERGE-only (enforced by `tests/schema-idempotency.test.mjs`), so a full load is safe to re-run and two runs give identical totals. Conventions are under Neo4j Conventions below.

5. **Activation patterns** drive the recommendation engine. The graph has 10 `ActivationPattern` nodes: `acute_alarm`, `chronic_vigilance`, `emotional_flooding`, `social_threat_shame`, `conservation_freeze`, `dissociation_overmodulation`, `rumination_loop`, `reward_drive_low`, plus Phase-2 `grief_yearning` and `reactive_aggression`. The engine's quadrant map considers the first 8, so `grief_yearning` and `reactive_aggression` are never selected. `positive_state` is not a graph pattern: it is the synthetic pleasant-quadrant result (`saveCheckIn` stores it as `activationPatternId` only; it never creates content nodes). Each pattern maps to brain structures (overactive/suppressed) and tool recommendations.

---

## Data Layer Principles — What Goes Where

> **This is the single most important architectural rule in the project.** When adding any new feature or content, use this to decide where data lives.

### Frontend static files (`src/data/`) — Presentation metadata ONLY

Tool names, emojis, taglines, category labels, descriptions, route mappings. Think "CMS content." If you swapped the entire backend, the app would still need this to render tool cards. This data has no relationships, needs no traversal, and doesn't change based on who the user is or what they're feeling.

**The test:** Does this data describe *how to display something*? → `src/data/`

### Neo4j graph (via Cloud Functions only) — All emotion and clinical knowledge

Relational, contextual knowledge that needs to be traversed or queried based on user state. The graph earns its keep when the answer requires following connections: emotion → brain structure → therapy concept → tool.

**The test:** Does this data describe *what an emotion IS* or *what to DO about it*? → Graph.

### Cloud Functions (`functions/src/`) — The query layer

Traverses the graph and returns shaped results to the frontend. The frontend calls these functions; it never touches Neo4j directly. When adding a new feature that needs graph data, add a new Cloud Function that queries for exactly what the component needs and returns it in one call.

### The join pattern

The graph recommends *which* tool (by ID). The frontend looks up *how to display it* from `src/data/tools.ts` using that ID. The graph owns the "what's clinically appropriate" decision, the frontend owns the presentation.

### ⚠️ HARD RULE: Emotion knowledge lives in the graph. Nowhere else.

This includes:

- Body sensations (`FELT_AS` relationships: one source, `scripts/body-map/content.py`)
- Brain structures activated (`ACTIVATES_DURING`)
- Activation patterns and their neural signatures
- Opposite emotions (`OPPOSITE_OF`)
- Action urges (per-emotion)
- Fits-the-facts criteria (per-emotion)
- Opposite action steps (basic and all-the-way)
- Problem-solve actions (per-emotion)
- Any other emotion-level clinical content

**Frontend data files must NOT duplicate graph content.** If a component needs emotion knowledge, it calls a Cloud Function. The one exception is generated files (below): never a hand-written copy. Duplicate sources of truth will drift, cause bugs, and make content updates (like humanizing clinical language) fail silently.

### Generated content files (`src/data/content/`): graph content the app ships

Read-only content that is the same for everyone can ship with the app as a file **generated from the graph**, so the screen never waits on a Cloud Function (a cold one took 2.8 s for "Often alongside"). Today: related words, body map (content + body-first suggestions), Find the feeling content, the check-in's follow-up (discriminating) questions. The graph stays the source; the files are derived copies, never edited by hand.

- `scripts/content-snapshot/build.mjs` turns a `graph-export.mjs --content-only` export into the files, mirroring the Cypher of the function each replaces. It refuses any other export: a single `User` / `UserData` / `LogRecord` / `ProfileItem` / `System` node stops it (the files are public once deployed).
- `scripts/load-graph.mjs` refreshes them after every successful load against Aura (`scripts/content-snapshot/refresh.mjs`: export, then build); never from a local graph, and not with `--dry-run` / `--no-content-refresh`. By hand: `npm run content:refresh`. Commit `src/data/content/` with the content change.
- The app reads them in `src/services/neo4j.ts` (`getRelatedEmotions`, `getFindTheFeelingContent`, `getDiscriminatingQuestions`) and `src/services/bodyMap.ts`, each file its own lazily loaded chunk; the check-in preloads related words and the follow-up questions when it opens (`preloadCheckInContent`). Body-first scoring is the functions' own `scoreBodyMaps` (imported, not copied).
- `tests/content-snapshot.test.mjs` pins the guard, that related words never include `OPPOSITE_OF` rows, that the follow-up questions carry no clinical notes (rationale, citations, signals) and cover every answer the engine scores, and that the shipped body map / Find the feeling / question ids equal the schema fixtures (a failure there: content changed without a graph load).
- Not for: user data, anything per person, the recommendation engine and crisis flag (one versioned decision on the server, with a live kill switch), or anything that must change without a hosting deploy.

---

## Data layers

Every piece of user data belongs to exactly one layer. The registry is `functions/src/userdata/layers.ts`; `tests/user-data-layers.test.mjs` enforces it.

| Layer | Stored as | Rule | Read by |
|---|---|---|---|
| **Ask-fresh** | Fields on a log record only (`ASK_FRESH_FIELDS`: `band*`, `thenVsNow`, `thenVsNowDir`, `actedOnUrge`, `urgeIds`, `fitsFacts`, `wiseMindAnswer`, `readiness`, `eventIds`) | Changes within a day → always asked, never pre-filled from memory. The one carry is the client-only `band.current()` (≤20 min, never read back from the server) | Aggregates only |
| **Log** | `:<Label>:UserData:LogRecord` | Describes a moment. Append-only and **finalise-once** (`userdata/lifecycle.ts`: upsert by `key` only during its episode, forward only, then frozen; writers put `GUARDS.<Label>.<op>` in their `WHERE`) | Aggregates (Insights, Today, review). Never used to pre-fill a live flow |
| **Profile** | `:<Label>:UserData:ProfileItem`, or a profile edge to graph content carrying `confirmedAt` + `source` | Would make the user re-answer next time → profile, pre-filled with "still true?". Nothing moves log → profile without the user's yes | `getProfileContext(toolId)` and the Me surface only |
| (system) | `:<Label>:UserData:System` | App infrastructure (push tokens) | Deleted with the user, never exported |

- Every `:UserData` node has `id` (client UUID unless noted), `ownerId` (Firebase uid), `key = ownerId + ':' + id` (unique per label in `schema/constraints.cypher`), `createdAt`, `schemaVersion`. Writes `MERGE` on `key`, never on `id`, and start with `MERGE (u:User {id: $uid})` (`userdata/ownership.ts`).
- Ownership edges run `User → UserData` and `UserData → UserData`. User data may point at graph content; graph content never points at user data. Schema files never write user data.
- A new user-data label: register it in `layers.ts` with its `exportAs`, add its `<label>_key` constraint, write it with its layer label. Export (`records.<exportAs>`, `formatVersion: 2`, `links` with edge properties) and delete (`DETACH DELETE` by `ownerId`, then the Auth user when `deleteAuth`) cover it automatically (`userdata/exportDelete.ts`). Retention deletes log records only, never profile items.
- `FOUND_WORD` (User → Emotion) is a log aggregate, not a profile edge: it accumulates without a yes.
- Pre-convention nodes (`CheckIn`, `BodySensation`, `ToolUsage`, the 4 session labels) were adopted by `schema/migrations/2026-10-user-data-backfill.cypher` (D-16 a).

---

## Data: Tools

Tools are defined in `src/data/tools.ts`. Each tool has:

- `id` (kebab-case, e.g., `"opposite-action"`)
- `name`, `emoji`, `tagline`, `description`
- `category` (one of: `"distress-tolerance"`, `"emotion-regulation"`, `"mindfulness"`, `"interpersonal"`)
- `basis` (optional, e.g., `"DBT Handout 11"`)

Interactive tool components live in `src/pages/tools/` and are registered in the `toolComponents` map in `ToolPage.tsx`. The `ToolPage` component handles the routing: it looks up the tool by ID from the URL, checks `toolComponents` for an interactive component, and renders either the interactive version or a static info page.

## Data: Emotions

**Every check-in word is a graph node, and both lists come from one source.** `scripts/emotions/content.py` is the only place to add, move or rename a word: `python3 scripts/emotions/build.py` regenerates the list block in `src/data/emotions.ts` (where each word sits on the square: x, y, quadrant, family, core) and the whole of `schema/emotion-wheel-sync.cypher` (the `Emotion` nodes, family-core `RELATED_TO`, family `OPPOSITE_OF`). Never edit either copy by hand: `tests/emotion-wheel-sync.test.mjs` fails if they're stale, if a square word is missing from the graph, or if the graph has a word that is neither on the square nor in `GRAPH_ONLY` (graph-only words, each with a reason; today: `free`, awaiting a decision). Ids are permanent (check-ins and found words point at them): rename the display name, or move a word to `GRAPH_ONLY`, never delete it. A word the graph doesn't have is a word nothing can be said about (routing aliases, body maps, related words).

Child emotions map to their DBT parent category (e.g., `anxiety` → `fear`, `irritation` → `anger`) through `(Emotion)-[:HAS_REGULATION_CONTENT]->(EmotionRegulationContent {dbtParent})`. No schema file sets an `Emotion.dbtParent` property, so don't read one (plan F12). The 9 DBT parent emotions are: **fear, anger, disgust, envy, jealousy, love, sadness, shame, guilt**; `shame`, `envy` and `jealousy` aren't `Emotion` nodes in the base schema (`shame` is `hot_shame`/`cold_shame`).

`EmotionRegulationContent` nodes (one per DBT parent) are linked via `HAS_REGULATION_CONTENT`. They hold `label` and `fitsTheFactsWhen` (array of first-person "when this emotion fits the facts" statements). The Opposite Action tool uses a single source of truth: **ActionUrge** nodes (linked via `HAS_ACTION_URGE`) supply urge labels and graduated opposite steps (small/medium/bigger); protocol metadata on `EmotionRegulationContent` (from `schema/opposite-action-data.cypher`) supplies `fitsFactsGuidance`, `whyItWorks`, `acknowledgment`, `bodyOpposite`, and default opposite steps. All content is written in conversational first-person voice so the user immediately recognizes their experience.

## Data: Micro-Steps

`src/data/microSteps.ts` contains the lowest-difficulty interventions, keyed by activation pattern ID. These are served when a user presses "That feels like too much right now" on the StateResult screen. They are NOT random — different neural states require fundamentally different interventions (e.g., high arousal gets autonomic input, freeze gets gentle proprioceptive up-regulation).

---

## Key Files

| File | Purpose |
|------|---------|
| `src/pages/CheckIn.tsx` | Multi-step check-in flow: emotion (feeling square) → word → find → discriminating → body (`components/checkin/body/BodyStep.tsx`: heat figure + place panel) → suggestion (body-first: `suggestEmotionsFromBody`) → analyzing → result. Saves the check-in when the result renders (PR-C1); Today stack above the square (PR-S5); Help me now → `HelpNowInterim` (PR-C2: safe step + Cool Down / 5-4-3-2-1, no check-in, no routing call) |
| `src/components/checkin/FeelingSquare.tsx` | The continuous check-in square (touch, drag, lift; arrow keys); `CheckInSquare.tsx` and `WordPick.tsx` are its two screens; logic in `src/lib/feelingSquare.ts`; see `docs/design/den-rooms.md` |
| `src/data/skillFamilies.ts` | Skill-family label and colour key per tool module (teal get through it, lavender shift it, rose with other people); used by `RecommendationCards.tsx` |
| `scripts/rooms/build.py` | Source for the room colour blocks in `src/index.css` (six rooms, `--square-*` tokens, contrast check) |
| `src/components/checkin/StateResult.tsx` | Shows activation pattern + recommended tools after check-in (`LowEnergyStateResult.tsx` for low-unpleasant); the witness beat renders under the label, below the crisis banner, above the tools (R21) |
| `src/components/checkin/RecommendationCards.tsx`, `src/lib/recommendation.ts`, `src/data/routingLabels.ts` | The result's cards (E4-4): one recommendation + one swap, named from `src/data/tools.ts` (unknown ids dropped, no graph names or relevance words), WMP-04 v0 side labels. `shownToolIds` is what the check-in stores as `recommendedToolIds` (with `routingVersion`, `routingBand`, `routingBandSource`); used by both result screens and the DEAR MAN debrief |
| `src/components/witness/WitnessBeat.tsx`, `src/lib/witness.ts` | The receive beat (WMP-01): echo of the user's word(s), one witness line from `getWitnessLines`, optional *did that land?*, always skip · none of these fit · say it my way, explicit keep. Never gates the host. The check-in logs it via `recordWitnessBeat`, queued after the render save and before the next action (`CheckIn.tsx` `beatQueue`) |
| `src/components/safety/CrisisBanner.tsx` | Crisis resources as a non-blocking banner above the normal result (never a replacement screen) |
| `src/pages/ToolPage.tsx` | Tool detail page with interactive component routing |
| `src/pages/tools/OppositeAction.tsx` | Interactive opposite action flow |
| `src/pages/tools/InvalidationRecovery.tsx` | "Recover from a hurtful moment" (Walking the Middle Path); see `docs/design/recover-from-invalidation.md` |
| `scripts/invalidation-recovery/content.py` | Editable source for `schema/invalidation-recovery.cypher` (regenerate with `build.py`) |
| `docs/design/body-map.md` | Body map plan (steps 1–3 built; content on `FELT_AS`, body-map-v2): heat figure, drag, strength bar, body mirror, several feelings; content in the graph (`FELT_AS`, sensation words, `BodyMap` groupings), build order |
| `src/data/bodyFigure.ts`, `src/components/checkin/body/`, `src/lib/bodyMark.ts` | The body step's figure: place ids (equal to the graph's, test-enforced), labels, paired places, tap shapes, glows, `regionAt` (the drag); `HeatFigure` (drag to a place, lift to choose), `StrengthBar` (beside the body, shown by default, hidden with the Strength toggle; saves `strength`) and `BodyStep` (one screen: the chosen place's words in one row; a mark glows in its words' home-quarter colour from the feeling square (`zones[0]`, never temperature), sized by strength). Presentation only: words and typical maps come from the graph |
| `schema/migrations/2026-10-body-regions.cypher` | One-off: old Title Case `BodySensation.region` names → place ids + `side` (run after step 2's functions deploy) |
| `scripts/body-map/content.py` | Editable source for `schema/body-map.cypher`: `BodyRegion` (the 15 places), sensation words on `SensationType`, **all `FELT_AS`** (where each emotion is felt: the one source; no other schema file may write it, test-enforced), and `BodyMap` groupings (`GROUPS` emotions, `MIRRORS` grid words; no stored places). New rows are drafts until listed in `SIGNED_OFF`; regenerate with `build.py`, then `fixture.py` |
| `docs/design/alexithymia-first-interaction.md` | Agreed direction: no rating scales anywhere; Stage / Shape / Tune rooms, shared mechanics, order of work |
| `scripts/find-the-feeling/content.py` | Editable source for `schema/find-the-feeling.cypher` (Find the feeling: word signatures, urge routing, `appToolId`); regenerate with `build.py` |
| `src/pages/tools/FindTheFeeling.tsx` | "Find the feeling" (Shape it / Tune it): page shell, save, routing, check-in handoff; rooms in `src/components/tools/findTheFeeling/{shape,tune}` (lazy, three.js / Web Audio); logic in `src/lib/findTheFeeling*.ts`; spec `docs/design/find-the-feeling.md` |
| `scripts/practice-spine/content.py` | Editable source for `schema/practice-spine.cypher`: `FollowUpType` registry, `SessionCloseFlow` (then-vs-now copy per direction), `PracticeSkill.defaultFor` / `displayLabel`; regenerate with `build.py` |
| `scripts/capacity/content.py` | Editable source for `schema/capacity.cypher` (probe wordings, hand-off copy, primitives, `BandRule`s) and for FTF's probe copy (FTF's `content.py` imports it); regenerate both with their `build.py` |
| `src/contexts/ToolSessionContext.tsx`, `src/hooks/useToolSession.ts` | One `ToolSession` per tool visit (ToolPage mounts the provider); tools call `useToolSession()` (`setStep`, `markPracticed`, `markComplete`, `setExt`, `close`, `linkTo`). A new tool declares its close kind in `functions/src/spine/tools.ts` + `src/lib/spine/close.ts` (a test enforces it) |
| `src/components/today/TodayStack.tsx`, `src/contexts/TodayContext.tsx` | Today stack on the check-in screen (≤3 cards + more; OA plans via OA's own card; flooded collapses); the desktop `ContinuityCard` reads the same `tool_outcome` item |
| `src/lib/spine/wrap.ts` | How OA / Recover / DEAR MAN / FTF sessions join the spine: their own session nodes and readers are unchanged; the `ToolSession` links to them with `DETAIL`, reps and Recover's follow-ups ride on the close, OA plans are mirrored server-side as `FollowUp oa_plan` |
| `src/components/spine/SessionClose.tsx` | The one-tap close question (graph copy, skip always there) |
| `scripts/profile-layer/content.py` | Editable source for `schema/profile-layer.cypher`: Me areas, `ProfileKind` (still-true copy, revisit days), `PatternRule` (off until reviewed) |
| `src/hooks/useProfileContext.ts` | How a tool reads the profile: `useProfileContext(toolId).slices` (in-memory cache, never localStorage). A new tool declares `PROFILE_NEEDS[toolId]` |
| `src/lib/band.ts`, `src/lib/resumeToken.ts` | Capacity band logic (freshness, hand-off plan, reread) and device-only resume tokens |
| `src/contexts/BandContext.tsx`, `src/hooks/useBand.ts`, `src/lib/bandStore.ts` | The band store: `useBand()` (`current`, `record`, `carry`, content). Client-only (R1): memory + `sessionStorage` `goblin.band.v1`, 20 min, per uid, cleared with resume tokens on sign-out |
| `src/components/capacity/` | `BandGate` (`band.ask()` without the question: carries a current reading or goes on with no band; `force` / `reaskIfFlooded` mean "don't carry"), `BreakdownHandoff` (P2: card → sigh / orient → reread → resume or come back later; never a lock), `TooMuchLink` (P2 as an overlay; host stays mounted). A tool that gates on the band wraps its first screen in `BandGate` and puts `TooMuchLink` on its screens; DEAR MAN is the first host (A4-4: `src/lib/dearManSafety.ts` `dearManBandGate`, device-only resume draft `src/lib/dearManResume.ts`, `?resume=<sessionId>`) |
| `scripts/witness/content.py` | Editable source for `schema/witness.cypher`: the witness corpus (`ValidationLine` levels 1–6, `ToolMoment`, `VoiceRule`). Recover's `RecoveryProtocol.validationLines` is a projection of its `recover_validate` lines (Recover's `content.py` imports them), so rebuild both. `status: live` needs `reviewStatus: reviewed` + `reviewedAt`; drafts are loaded but never served. Sign a draft off by adding its id to `SIGNED_OFF` (id → review date) and rebuilding. `scripts/witness/report.cypher`: landed share per line (retirement stays a human edit) |
| `scripts/voice-lint.mjs`, `scripts/witness/voice-rules.json` | The voice contract (flat, warm witness; no cheer, should, just, but, diagnosis or physiology on validation lines; ≤90 chars; flooded ≤8 words at level 1–2). Runs in `npm test` and gates `load-graph.mjs` (exit 5; `--skip-voice-lint`); `npm run lint:voice` reports legacy copy. Flow-doc copy is checked against the shrink-only `scripts/witness/voice-baseline.json`. Never lints what the user writes |
| `dev/capacity.html` | Dev-only harness for the gate (carry only), P2 and the too-much overlay (`tests/fixtures/capacity-content.json`, regenerate with `scripts/capacity/fixture.py`) |
| `schema/app-tool-ids.cypher` | `TherapyConcept.appToolId`: join key from graph concepts to app tool ids (preferred over `normalizeToolId`) |
| `dev/find-the-feeling.html` | Dev-only harness for the rooms with fixture content (`tests/fixtures/find-the-feeling-content.json`, regenerate with `scripts/find-the-feeling/fixture.py`); not part of the app build |
| `prototypes/goblin-lab/` | Reference prototypes for Stage it / Shape it / Tune it. Not part of the app build; hard-codes content production must read from the graph |
| `scripts/emotions/content.py`, `build.py` | The one editable source for the check-in words: generates the list in `src/data/emotions.ts` and `schema/emotion-wheel-sync.cypher` (`--check` for freshness, `--json` for tests) |
| `src/data/tools.ts` | Tool display metadata (names, emojis, categories) |
| `src/data/microSteps.ts` | Activation-pattern-keyed micro-interventions |
| `src/services/neo4j.ts` | Cloud Function call wrappers (related words, Find the feeling content and the follow-up questions read `src/data/content/` instead) |
| `scripts/content-snapshot/`, `src/data/content/` | Generated content files the app ships (see Generated content files): `build.mjs`, `refresh.mjs` (run by `load-graph.mjs`), `npm run content:refresh` |
| `src/services/firebase.ts` | Firebase init, auth functions |
| `src/contexts/AuthContext.tsx` | Firebase auth state provider |
| `src/contexts/UserProfileContext.tsx` | App settings (theme, palette, reminders, retention, displayName) with a localStorage cache for the theme paint. Settings only: profile-layer data never goes here |
| `src/pages/Profile.tsx` + `src/components/me/` | "Me" (nav label, D-10): the profile layer (About me, My body: quiet hours, My words: found words read-only, My patterns once an offer exists; still-true, set aside / restore, pattern offers) above the settings |
| `functions/src/index.ts` | The deploy surface: named re-exports of every callable (module table above) |
| `functions/src/shared/` | Driver + sessions (`neo4j.ts`), `auth.ts`, `validate.ts`, `errors.ts`, `callable.ts` |
| `functions/src/userdata/` | Data layers: `layers.ts` (registry), `ownership.ts`, `lifecycle.ts` (finalise-once guards), `exportDelete.ts` |
| `schema/migrations/` | One-off data migrations, run with `--file` (never loaded): `2026-10-user-data-backfill.cypher`, then after the M2 deploy `2026-10-remove-goal-fields.cypher` and `2026-10-remove-positive-state-stub.cypher` (the bare `ActivationPattern {id:'positive_state'}` the pre-PR-C1 `saveCheckIn` MERGEd on pleasant check-ins) |
| `functions/test/` | Unit tests (fake driver), pinned `fixtures/endpoints.json`, emulator golden suite, local Neo4j compose file |
| `schema/constraints.cypher` | Every constraint and index; loaded first |
| `schema/knowledge-graph.cypher` | Base graph nodes (MERGE by id; no relationships) |
| `schema/relationships.cypher` | Base graph relationships |
| `schema/maintenance/` | Dedupe dry run + relationship-only apply (run by hand, never loaded) |
| `scripts/load-graph.mjs` | Loads `schema/` in `LOAD_ORDER`; `--verify`, `--only`, `--file`, `--dry-run`; voice-lints the witness corpus and flow docs before sending (`--skip-voice-lint`) |
| `scripts/verify-live-routing.mjs` | Read-only live-graph routing check; `--compare tests/fixtures/live-routing-2026-09-30.json` (a committed live summary) or `--compare tests/fixtures/recommendation-graph.json` (what the schema says) |
| `functions/src/recommendation/` | The check-in engine. `handler.ts` is pure orchestration over an injected query layer (`queries.ts` in production); `patternScoring.ts` (pattern selection), `band.ts` (routing band), `select.ts` (pattern × band selector, hard filters, diversity rule, WMP-04 v0 `receiveFirst`), `legacy.ts` (the kill-switch ranker), `validation.ts`; the crisis flag is one seam, `functions/src/safety/checkinSafetyFlag.ts` |
| `scripts/recommendations/content.py` | Editable source for `schema/recommended-for.cypher` (regenerate with `build.py`, then `fixture.py`): the pattern × band `RECOMMENDED_FOR` table, emotion-gated rows, concept tags (`side`, `skillKind`, `direction`), blank patterns and the `RoutingPolicy` kill switch (`enabled`). Rows are drafts until listed in `SIGNED_OFF`; `build.py` refuses to enable the policy while an active row is a draft. A new tool becomes recommendable by adding its tags and rows here, no engine code |
| `scripts/recommendations/vocabulary.py` | Editable source for the `SCORES_AS` aliases in `schema/recommended-for.cypher` (same `build.py`): every unpleasant grid word → its 1–2 closest pattern-vocabulary emotions, with a rationale, or `HELD` (no alias yet, with a reason); drafts until listed in `SIGNED_OFF`. `tests/recommendation-reachability.test.mjs` pins the held words, that every other word reaches a pattern, and the one-word distribution |
| `scripts/recommendations/schema_graph.py`, `fixture.py` | Replays `schema/*.cypher` (LOAD_ORDER) in memory and writes `tests/fixtures/recommendation-graph.json`, the graph slice routing reads. Regenerate after any schema change that touches patterns, concepts, emotions or evidence; `tests/recommendation-*.test.mjs` run whole check-ins over it (`tests/lib/recommendationFixture.mjs`) and check it against the live summary |
| `schema/emotion-regulation-content.cypher` | EmotionRegulationContent base (label, fitsTheFactsWhen) |
| `schema/opposite-action-data.cypher` | Protocol metadata + ActionUrge nodes (OA tool source of truth) |

---

## Testing

- `npm test`: Tier 1, no network: `node --test tests/*.test.mjs` (pure logic, schema and content checks; two freshness tests shell out to `python3`) then `npm --prefix functions test` (builds, then the fake-driver unit tests in `functions/test/unit/`: pinned exports + deploy manifest, auth matrix, handler pins, shared helpers). `node --test tests/` does NOT work on Node 22; use the glob.
- `npm run test:emulator`: Tier 2 goldens against the Auth + Functions emulators and a local Neo4j. Needs Docker: `npm run graph:test:up`, `npm run graph:test:load`, `cp functions/.secret.local.example functions/.secret.local`. Record with `UPDATE_GOLDEN=1`.
- Phase A rehearsal (Docker, runbook §0b): `node scripts/rehearsal/rehearse-phase-a.mjs [--goldens] [--keep]` from a worktree of `phase-a/m4-engine` at `.rehearsal/runner`. Copies production into the local Neo4j (Aura opened READ-only), replays M1–M4's migrations and loads on the copy, `--goldens` records the Tier-2 goldens. Every write and child process is pinned to `bolt://127.0.0.1:7687` (`scripts/rehearsal/lib.mjs`, pinned by `tests/rehearsal.test.mjs`). Output: `.rehearsal/report.json`, `.rehearsal/rehearsal.log` (gitignored)
- Lint: `npx eslint .` still reports 4 pre-existing errors; don't add any (`node scripts/ci/lint-budget.mjs`, also run by CI).
- Cypher syntax: `npx -y -p @neo4j-cypher/language-support@2.0.0-next.6 node scripts/lint-cypher.mjs`.
- CI: `.github/workflows/ci.yml` runs both builds, `npm test` and the lint budget on every PR (Node 22, no secrets).

---

## After a PR merges: tell Claudia the deploy steps

Claudia runs every deploy and graph load herself, on her Mac (`~/Documents/goblin-dbt`); sessions have
no `.env` or bolt access. Every PR description ends with a **Deploy** section, and when she says a PR is
merged, reply with the exact commands in order, even when the answer is "nothing to run":
`git pull`, then any graph loads (`node scripts/load-graph.mjs --only <file>`, constraints first; each load refreshes `src/data/content/`, so commit any change it makes there and deploy hosting), then
`firebase deploy --only functions` (before hosting whenever the server must accept something new), then
any one-off migration (`--file schema/migrations/…`) the PR says runs after functions, then
`firebase deploy --only hosting`. Say which steps are not needed, and why it matters if the order slips.

## Product Changelog (Obsidian)

The product-level record of every change and the thinking behind it lives in Claudia's Obsidian vault:
`~/Obsidian/Claudia-mac-mini/Goblin DBT/Product Changelog.md` (newest first, template at the bottom).
When a chat changes the product (a feature, a reversal, a new principle), add or update an entry there before
the chat ends: what changed, why, the thinking (including what was rejected), open questions, commit/PR, and
status (`planned` / `built` / `shipped` / `reverted`). If the vault isn't reachable from the session, say so and
give Claudia the entry text to paste.

---

## Neo4j Conventions

- Every loaded Cypher file is MERGE-only, safe to re-run (tests enforce it; no `CREATE (`)
- Nodes: `MERGE (x:Label {id: "…"}) SET x += {…};` Always `+=`, never `=`: later files add properties (`TherapyConcept.appToolId`, `ActivationPattern.formulation_*`, …) that `=` would wipe. Merge on exactly one key, `id` (or `key` for user data); the one natural-key exception is `EmotionRegulationContent {dbtParent}`
- Relationships: `MATCH (a:A {id: "…"}), (b:B {id: "…"}) MERGE (a)-[r:TYPE]->(b) SET r += {…};` The merge key is `(a, TYPE, b)`; only `FELT_AS` also merges on `{region}` (a real multi-edge). No other property ever goes inside a MERGE pattern
- Every label MERGEd by `id`/`key` has a uniqueness constraint in `schema/constraints.cypher` (loaded first; the loader stops with exit 3 if one can't be created). New files add their constraints there and their name to `LOAD_ORDER`
- Load with `node scripts/load-graph.mjs [--verify]` (full load; `--verify` fails on duplicates). Never `--only knowledge-graph` (it refuses without `--force`): later files override its properties. One-off migrations go in `schema/migrations/` and run with `--file`
- Node labels are PascalCase (`BrainStructure`, `ActivationPattern`)
- Relationship types are SCREAMING_SNAKE (`ACTIVATES_DURING`, `MODULATES`, `FELT_AS`)
- Every content node has an `id` property (snake_case) used for `MATCH` (`EmotionRegulationContent` is matched by `dbtParent`; session records by `key`)
- Evidence grades: `"Strong"`, `"Moderate"`, `"Preliminary"`
- Schema files are chunked and self-contained (no assumed variable persistence across executions — Aura requirement)
