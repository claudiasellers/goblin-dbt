# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Goblin DBT is a neuroscience-informed DBT (Dialectical Behavior Therapy) app. It is NOT an emotion tracker — it is solutions-focused. The user is feeling something, and the app helps them (1) develop better language for their experience (affect labeling, which itself is therapeutic), and (2) find tools that target underlying neural mechanisms, not just surface symptoms.
The knowledge graph is the brain of the app. It encodes relationships between emotions, brain structures, functional networks, neurochemical systems, therapy concepts, and tools across multiple modalities (DBT, IFS, CBT, ACT, EMDR, Somatic Experiencing, CPT, MBCT, Polyvagal Theory).


## Architecture

**Three-tier: React frontend → Firebase Cloud Functions → Neo4j graph database**

- **Frontend** (`/src`): React 19 + TypeScript + Vite + Tailwind CSS. Uses HashRouter. State managed via Context API (`AuthContext`, `UserProfileContext`) — no Redux.
- **Auth** Firebase Authentication (email/password)
- **Cloud Functions** (`/functions/src/index.ts`): All backend logic in a single file (~1074 lines). Handles check-ins, user management, analysis/recommendations, and tool usage tracking. Neo4j driver uses lazy singleton pattern. User IDs extracted from Firebase Auth tokens server-side.
- **Graph Database** (`/schema/*.cypher`):Neo4j Aura (knowledge graph + user data) Neo4j with nodes for User and all of the emotion / therapy / modality information. Again, this is the brain of the app.
- **Data layer** (`/src/data/`): Static TypeScript files for UI presentation metadata only — emotions (display names, families, emojis), tools (names, categories, taglines), body regions, micro-steps. All emotion knowledge and clinical content comes from the graph via Cloud Functions.
- **Hosting** Firebase Hosting
- **Deployment** firebase deploy


## Key Architecture Decisions

1. **The frontend never connects to Neo4j directly.** All graph queries go through Firebase Cloud Functions. Neo4j credentials are stored as Firebase secrets (`NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`) and never exposed to the browser.

2. **User identity is handled by Firebase Auth.** Cloud Functions extract the user ID from `request.auth.uid` — the frontend never sends user IDs as parameters.

3. **The knowledge graph powers recommendations.** Check-in data → emotion nodes → brain structures (via `ACTIVATES_DURING`) → activation patterns → therapy concepts (via `MODULATES`) → tools (via `IMPLEMENTS`). This is the core traversal that makes the app work.

4. **Incremental schema loading with MERGE.** All Cypher scripts use `MERGE` instead of `CREATE` so they're idempotent — safe to re-run without duplicating data. Properties are overwritten via `SET` after `MERGE`.

5. **8 activation patterns** drive the recommendation engine: `acute_alarm`, `chronic_vigilance`, `emotional_flooding`, `reactive_aggression`, `conservation_freeze`, `dissociation_overmodulation`, `rumination_loop`, `reward_drive_low`, `social_threat_shame`. Each maps to specific brain structures (overactive/suppressed) and specific tool recommendations.

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

Emotion nodes in the graph have a `dbtParent` property that maps child emotions to their DBT parent category (e.g., `anxiety` → `fear`, `irritation` → `anger`). The 9 DBT parent emotions are: **fear, anger, disgust, envy, jealousy, love, sadness, shame, guilt**.

`EmotionRegulationContent` nodes (one per DBT parent) are linked via `HAS_REGULATION_CONTENT`. They hold `label` and `fitsTheFactsWhen` (array of first-person "when this emotion fits the facts" statements). The Opposite Action tool uses a single source of truth: **ActionUrge** nodes (linked via `HAS_ACTION_URGE`) supply urge labels and graduated opposite steps (small/medium/bigger); protocol metadata on `EmotionRegulationContent` (from `schema/opposite-action-data.cypher`) supplies `fitsFactsGuidance`, `whyItWorks`, `acknowledgment`, `bodyOpposite`, and default opposite steps. All content is written in conversational first-person voice so the user immediately recognizes their experience.

## Data: Micro-Steps

`src/data/microSteps.ts` contains the lowest-difficulty interventions, keyed by activation pattern ID. These are served when a user presses "That feels like too much right now" on the StateResult screen. They are NOT random — different neural states require fundamentally different interventions (e.g., high arousal gets autonomic input, freeze gets gentle proprioceptive up-regulation).

---

## Key Files

| File | Purpose |
|------|---------|
| `src/pages/CheckIn.tsx` | Multi-step check-in flow (quadrant → emotion → intensity → body) |
| `src/components/StateResult.tsx` | Shows activation pattern + recommended tools after check-in |
| `src/pages/tools/ToolPage.tsx` | Tool detail page with interactive component routing |
| `src/pages/tools/OppositeAction.tsx` | Interactive opposite action flow |
| `src/data/tools.ts` | Tool display metadata (names, emojis, categories) |
| `src/data/microSteps.ts` | Activation-pattern-keyed micro-interventions |
| `src/services/neo4j.ts` | Cloud Function call wrappers |
| `src/services/firebase.ts` | Firebase init, auth functions |
| `src/contexts/AuthContext.tsx` | Firebase auth state provider |
| `src/contexts/UserProfileContext.tsx` | User profile with caching |
| `functions/src/index.ts` | All Cloud Functions (graph queries, check-in CRUD) |
| `schema/knowledge-graph.cypher` | Full graph schema (nodes) |
| `schema/relationships.cypher` | All graph relationships |
| `schema/emotion-regulation-content.cypher` | EmotionRegulationContent base (label, fitsTheFactsWhen) |
| `schema/opposite-action-data.cypher` | Protocol metadata + ActionUrge nodes (OA tool source of truth) |

---

## Neo4j Conventions

- All Cypher files use `MERGE` for idempotency — safe to re-run
- Properties overwritten via `SET` after `MERGE`
- Node labels are PascalCase (`BrainStructure`, `ActivationPattern`)
- Relationship types are SCREAMING_SNAKE (`ACTIVATES_DURING`, `MODULATES`, `FELT_AS`)
- Every node has an `id` property (snake_case) used for `MATCH`
- Evidence grades: `"Strong"`, `"Moderate"`, `"Preliminary"`
- Schema files are chunked and self-contained (no assumed variable persistence across executions — Aura requirement)
