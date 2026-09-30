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
- **Cloud Functions** (`/functions/src`, Node 22): one directory per domain, each `index.ts` exporting its callables (table below). `functions/src/index.ts` only re-exports the 30 deployed callables by name (never `export *`); the export name is the deploy name. Shared helpers live in `functions/src/shared/` (Neo4j driver singleton + `withSession`/`readTx`/`writeTx`, `requireUid`, pure validators, error mapping, and `callable()` for new callables). Input validation for the tool sessions sits in `functions/src/*Validation.ts`. User IDs come from Firebase Auth tokens server-side (`request.auth.uid`).
- **Graph Database** (`/schema/*.cypher`):Neo4j Aura (knowledge graph + user data) Neo4j with nodes for User and all of the emotion / therapy / modality information. Again, this is the brain of the app.
- **Data layer** (`/src/data/`): Static TypeScript files for UI presentation metadata only — emotions (display names, families, emojis), tools (names, categories, taglines), body regions, micro-steps. All emotion knowledge and clinical content comes from the graph via Cloud Functions.
- **Hosting** Firebase Hosting
- **Deployment** `firebase deploy` (`--only functions` / `--only hosting`; hosting's `predeploy` runs the build). There is no `npm run deploy` (the old gh-pages script is gone).

Functions modules (`functions/src/<domain>/index.ts`; reserved for Phase A: `capacity/`, `witness/`, `spine/`, `profile/`, `userdata/`, `safety/`):

| Module | Callables |
|---|---|
| `checkin/` | `saveCheckIn`, `getCheckInsByUser` |
| `account/` | `ensureUserExists`, `getUserProfile`, `updateUserProfile`, `deleteUserData`, `exportUserData` (settings-style profile; `profile/` is reserved for the three-layer "Me") |
| `toolUsage/` | `trackToolUsage`, `recordToolOutcome` |
| `insights/` | `getInsightsData` |
| `recommendation/` | `getStateAndTools`, `getDiscriminatingQuestions`, `getRelatedEmotions` |
| `oppositeAction/` | `getOppositeActionContent`, `saveOppositeActionSession`, `getOppositeActionSessions`, `getOppositeActionSession`, `getOppositeActionFollowUps` |
| `dearMan/` | `getDearManContent`, `saveDearManSession`, `getDearManDebriefContent`, `getDearManReflection`, `getDearManSessions` |
| `problemSolve/` | `getProblemSolveContent` |
| `invalidationRecovery/` | `getInvalidationRecoveryContent`, `saveInvalidationRecoverySession`, `getInvalidationRecoveryProgress` |
| `findTheFeeling/` | `getFindTheFeelingContent`, `saveFindTheFeelingSession`, `getFeelingCollection` |

Adding a callable: export it from its domain module, add one line to `functions/src/index.ts`, add it to `functions/test/fixtures/endpoints.json` and the auth matrix (`functions/test/unit/auth-matrix.test.cjs`). Prefer `callable({ auth, label }, handler)` from `shared/callable.ts`.


## Key Architecture Decisions

1. **The frontend never connects to Neo4j directly.** All graph queries go through Firebase Cloud Functions. Neo4j credentials are stored as Firebase secrets (`NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`) and never exposed to the browser.

2. **User identity is handled by Firebase Auth.** Cloud Functions extract the user ID from `request.auth.uid` — the frontend never sends user IDs as parameters.

3. **The knowledge graph powers recommendations.** What `getStateAndTools` (`functions/src/recommendation/index.ts`) actually runs: the quadrant picks 4 candidate patterns (high-unpleasant: `acute_alarm`, `chronic_vigilance`, `emotional_flooding`, `social_threat_shame`; low-unpleasant: `conservation_freeze`, `dissociation_overmodulation`, `rumination_loop`, `reward_drive_low`; pleasant quadrants return a synthetic `positive_state` with no query). Each candidate is scored from `(ActivationPattern)-[:ASSOCIATED_WITH]->(Emotion)` for the check-in's emotion ids plus `(QuestionResponse)-[:EVIDENCE_FOR]->(ActivationPattern)` for discriminating answers; `CO_OCCURS_WITH` may add a secondary pattern. Tools are the top 2 `TherapyConcept`s (`id STARTS WITH 'dbt_'`) ranked by how many of the pattern's emotions they reach via `ADDRESSES|REDUCES|TARGETS`, joined to app tools via `TherapyConcept.appToolId`. A `TRIGGERS_SAFETY` crisis flag (skipped for low-unpleasant) shows the crisis banner above the result; low-unpleasant adds a guided activity. Known gap (plan F1, fixed in E4-6): the grid sends lower-cased display names (`anxious`) that no pattern edge uses (`anxiety`), so grid emotions don't move the pattern yet. E4-3 replaces the tool step with pattern × band → `RECOMMENDED_FOR`.

4. **Idempotent schema loading with MERGE.** Every loaded Cypher file is MERGE-only (enforced by `tests/schema-idempotency.test.mjs`), so a full load is safe to re-run and two runs give identical totals. Conventions are under Neo4j Conventions below.

5. **Activation patterns** drive the recommendation engine. The graph has 10 `ActivationPattern` nodes: `acute_alarm`, `chronic_vigilance`, `emotional_flooding`, `social_threat_shame`, `conservation_freeze`, `dissociation_overmodulation`, `rumination_loop`, `reward_drive_low`, plus Phase-2 `grief_yearning` and `reactive_aggression`. The engine's quadrant map considers the first 8, so `grief_yearning` and `reactive_aggression` are never selected. `positive_state` is not a graph pattern: it is the synthetic pleasant-quadrant result (and `saveCheckIn` MERGEs a stub node for it). Each pattern maps to brain structures (overactive/suppressed) and tool recommendations.

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

- Body sensations (`FELT_AS` relationships)
- Brain structures activated (`ACTIVATES_DURING`)
- Activation patterns and their neural signatures
- Opposite emotions (`OPPOSITE_OF`)
- Action urges (per-emotion)
- Fits-the-facts criteria (per-emotion)
- Opposite action steps (basic and all-the-way)
- Problem-solve actions (per-emotion)
- Any other emotion-level clinical content

**Frontend data files must NOT duplicate graph content.** If a component needs emotion knowledge, it calls a Cloud Function. No exceptions. Duplicate sources of truth will drift, cause bugs, and make content updates (like humanizing clinical language) fail silently.

### Known tech debt (to be consolidated into graph)

- **`src/data/sensationMappings.ts`** — Maps body sensations → emotions with frontend scoring logic. Duplicates the graph's `FELT_AS` relationships. Should be replaced by a Cloud Function.

---

## Data: Tools

Tools are defined in `src/data/tools.ts`. Each tool has:

- `id` (kebab-case, e.g., `"opposite-action"`)
- `name`, `emoji`, `tagline`, `description`
- `category` (one of: `"distress-tolerance"`, `"emotion-regulation"`, `"mindfulness"`, `"interpersonal"`)
- `basis` (optional, e.g., `"DBT Handout 11"`)

Interactive tool components live in `src/pages/tools/` and are registered in the `toolComponents` map in `ToolPage.tsx`. The `ToolPage` component handles the routing: it looks up the tool by ID from the URL, checks `toolComponents` for an interactive component, and renders either the interactive version or a static info page.

## Data: Emotions

Child emotions map to their DBT parent category (e.g., `anxiety` → `fear`, `irritation` → `anger`) through `(Emotion)-[:HAS_REGULATION_CONTENT]->(EmotionRegulationContent {dbtParent})`. No schema file sets an `Emotion.dbtParent` property, so don't read one (plan F12). The 9 DBT parent emotions are: **fear, anger, disgust, envy, jealousy, love, sadness, shame, guilt**; `shame`, `envy` and `jealousy` aren't `Emotion` nodes in the base schema (`shame` is `hot_shame`/`cold_shame`).

`EmotionRegulationContent` nodes (one per DBT parent) are linked via `HAS_REGULATION_CONTENT`. They hold `label` and `fitsTheFactsWhen` (array of first-person "when this emotion fits the facts" statements). The Opposite Action tool uses a single source of truth: **ActionUrge** nodes (linked via `HAS_ACTION_URGE`) supply urge labels and graduated opposite steps (small/medium/bigger); protocol metadata on `EmotionRegulationContent` (from `schema/opposite-action-data.cypher`) supplies `fitsFactsGuidance`, `whyItWorks`, `acknowledgment`, `bodyOpposite`, and default opposite steps. All content is written in conversational first-person voice so the user immediately recognizes their experience.

## Data: Micro-Steps

`src/data/microSteps.ts` contains the lowest-difficulty interventions, keyed by activation pattern ID. These are served when a user presses "That feels like too much right now" on the StateResult screen. They are NOT random — different neural states require fundamentally different interventions (e.g., high arousal gets autonomic input, freeze gets gentle proprioceptive up-regulation).

---

## Key Files

| File | Purpose |
|------|---------|
| `src/pages/CheckIn.tsx` | Multi-step check-in flow: emotion (quadrant grid) → find → discriminating → body → sensation → suggestion → analyzing → result |
| `src/components/checkin/StateResult.tsx` | Shows activation pattern + recommended tools after check-in (`LowEnergyStateResult.tsx` for low-unpleasant) |
| `src/components/safety/CrisisBanner.tsx` | Crisis resources as a non-blocking banner above the normal result (never a replacement screen) |
| `src/pages/tools/ToolPage.tsx` | Tool detail page with interactive component routing |
| `src/pages/tools/OppositeAction.tsx` | Interactive opposite action flow |
| `src/pages/tools/InvalidationRecovery.tsx` | "Recover from a hurtful moment" (Walking the Middle Path); see `docs/design/recover-from-invalidation.md` |
| `scripts/invalidation-recovery/content.py` | Editable source for `schema/invalidation-recovery.cypher` (regenerate with `build.py`) |
| `docs/design/alexithymia-first-interaction.md` | Agreed direction: no rating scales anywhere; Stage / Shape / Tune rooms, shared mechanics, order of work |
| `scripts/find-the-feeling/content.py` | Editable source for `schema/find-the-feeling.cypher` (Find the feeling: word signatures, urge routing, `appToolId`); regenerate with `build.py` |
| `src/pages/tools/FindTheFeeling.tsx` | "Find the feeling" (Shape it / Tune it): page shell, save, routing, check-in handoff; rooms in `src/components/tools/findTheFeeling/{shape,tune}` (lazy, three.js / Web Audio); logic in `src/lib/findTheFeeling*.ts`; spec `docs/design/find-the-feeling.md` |
| `schema/app-tool-ids.cypher` | `TherapyConcept.appToolId`: join key from graph concepts to app tool ids (preferred over `normalizeToolId`) |
| `dev/find-the-feeling.html` | Dev-only harness for the rooms with fixture content (`tests/fixtures/find-the-feeling-content.json`, regenerate with `scripts/find-the-feeling/fixture.py`); not part of the app build |
| `prototypes/goblin-lab/` | Reference prototypes for Stage it / Shape it / Tune it. Not part of the app build; hard-codes content production must read from the graph |
| `src/data/tools.ts` | Tool display metadata (names, emojis, categories) |
| `src/data/microSteps.ts` | Activation-pattern-keyed micro-interventions |
| `src/services/neo4j.ts` | Cloud Function call wrappers |
| `src/services/firebase.ts` | Firebase init, auth functions |
| `src/contexts/AuthContext.tsx` | Firebase auth state provider |
| `src/contexts/UserProfileContext.tsx` | User profile with caching |
| `functions/src/index.ts` | The deploy surface: named re-exports of every callable (module table above) |
| `functions/src/shared/` | Driver + sessions (`neo4j.ts`), `auth.ts`, `validate.ts`, `errors.ts`, `callable.ts` |
| `functions/test/` | Unit tests (fake driver), pinned `fixtures/endpoints.json`, emulator golden suite, local Neo4j compose file |
| `schema/constraints.cypher` | Every constraint and index; loaded first |
| `schema/knowledge-graph.cypher` | Base graph nodes (MERGE by id; no relationships) |
| `schema/relationships.cypher` | Base graph relationships |
| `schema/maintenance/` | Dedupe dry run + relationship-only apply (run by hand, never loaded) |
| `scripts/load-graph.mjs` | Loads `schema/` in `LOAD_ORDER`; `--verify`, `--only`, `--file`, `--dry-run` |
| `scripts/verify-live-routing.mjs` | Read-only live-graph routing check; `--compare tests/fixtures/live-routing-2026-09-30.json` |
| `schema/emotion-regulation-content.cypher` | EmotionRegulationContent base (label, fitsTheFactsWhen) |
| `schema/opposite-action-data.cypher` | Protocol metadata + ActionUrge nodes (OA tool source of truth) |

---

## Testing

- `npm test`: Tier 1, no network: `node --test tests/*.test.mjs` (pure logic, schema and content checks; two freshness tests shell out to `python3`) then `npm --prefix functions test` (builds, then the fake-driver unit tests in `functions/test/unit/`: pinned exports + deploy manifest, auth matrix, handler pins, shared helpers). `node --test tests/` does NOT work on Node 22; use the glob.
- `npm run test:emulator`: Tier 2 goldens against the Auth + Functions emulators and a local Neo4j. Needs Docker: `npm run graph:test:up`, `npm run graph:test:load`, `cp functions/.secret.local.example functions/.secret.local`. Record with `UPDATE_GOLDEN=1`.
- Lint: `npx eslint .` still reports 7 pre-existing errors; don't add any (`node scripts/ci/lint-budget.mjs`, also run by CI).
- Cypher syntax: `npx -y -p @neo4j-cypher/language-support@2.0.0-next.6 node scripts/lint-cypher.mjs`.
- CI: `.github/workflows/ci.yml` runs both builds, `npm test` and the lint budget on every PR (Node 22, no secrets).

---

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
