# Tools Page Revamp

## Problem

The Tools page lists 59 tools across 5 need-based categories, but only 7 have interactive components built. The other 52 show "coming soon" placeholders. Tool IDs are inconsistent between the graph (`dbt_opposite_action`) and the frontend (`opposite-action`), with normalization happening ad-hoc in one component. Emoji maps are duplicated in 3 places. The category/subcategory drill-down system is unnecessary overhead for 7 tools.

## Goals

1. Tools page shows only the 7 built interactive tools — no placeholders
2. Organized by DBT module (Distress Tolerance, Emotion Regulation, Interpersonal Effectiveness, Mindfulness)
3. Clean data layer: single source of truth for tool metadata, no duplicate maps
4. Tool ID normalization at the Cloud Functions boundary, not scattered across frontend
5. Remove dead category/subcategory infrastructure
6. Desktop layout uses full page width (2-column grid within modules)

## Design Decisions

- **Only built tools shown.** The 52 tools without interactive components are removed from `tools.ts`. They're preserved in git history.
- **DBT module grouping.** 4 modules replace the 5 need-based categories. Mindfulness shows with a "coming soon" state until a tool is built for it.
- **Check the Facts is not a standalone tool.** It's a step within the Opposite Action flow. It does not appear as a separate entry on the Tools page.
- **Problem Solve is standalone.** It has its own full interactive flow. Opposite Action can route to it, but it's an independent tool.
- **Flat page, no drill-down.** With 7 tools, everything fits on one page. No CategoryPage needed.
- **Tool ID normalization at the API boundary (outbound only).** Cloud Functions normalize graph IDs (`dbt_opposite_action` → `opposite-action`) when sending tool data to the frontend. Inbound tracking (`trackToolUsage`) continues storing frontend-format IDs — `ToolUsage.toolId` is only used for display joins with `tools.ts`, not for graph traversals, so keeping it in frontend format avoids a mixed-format data problem with historical records.

## The 7 Tools by Module

| Module | Tool ID | Display Name | Emoji |
|--------|---------|-------------|-------|
| Distress Tolerance | `cool-down` | Cool Down | 🧊 |
| Distress Tolerance | `pause` | Pause | ✋ |
| Distress Tolerance | `five-senses` | 5-4-3-2-1 | 👁️ |
| Distress Tolerance | `urge-surfing` | Urge Surfing | 🌊 |
| Emotion Regulation | `opposite-action` | Do the Opposite | 🔄 |
| Emotion Regulation | `problem-solve` | Problem Solve | 🛠️ |
| Interpersonal Effectiveness | `dear-man` | DEAR MAN | 🗣️ |

## Architecture Changes

### Data Layer

**`src/data/tools.ts`** — Pruned from 59 to 7 entries. Schema changes:
- Remove `categoryId` and `subcategoryId` fields
- Add `module` field: `'distress-tolerance' | 'emotion-regulation' | 'interpersonal-effectiveness' | 'mindfulness'`
- Keep: `id`, `name`, `tagline`, `description`, `whenToUse`, `dbtBasis`, `emoji`
- Remove `getToolsByCategory()` and `getToolsBySubcategory()` helpers
- Add `getToolsByModule()` helper
- Keep `getToolById()`

**`src/data/modules.ts`** — New file, replaces `categories.ts`. Defines the 4 DBT modules:
```ts
interface Module {
  id: string;       // 'distress-tolerance' | 'emotion-regulation' | ...
  name: string;     // 'Distress Tolerance' | ...
  order: number;    // display order
}
```
Minimal — just enough for rendering the Tools page section headers.

**`src/data/categories.ts`** — Deleted.

### Pages & Components

**`src/pages/Tools.tsx`** — Rewritten. Single flat page with 4 module sections, 2-column card grid on desktop, single column on mobile. Imports modules and tools, renders directly. No drill-down.

**`src/pages/ToolPage.tsx`** — Updated:
- Remove import of `getCategoryById` from categories.ts
- Remove `normalizeGraphToolId()` function (no longer needed — Cloud Functions normalize outbound IDs)
- Update guard clause from `if (!tool || !category)` to `if (!tool)`
- Remove `category` variable
- Back link changes from `← {category.name}` to `← Tools` linking to `/tools`
- `toolComponents` map stays as-is (still maps tool IDs to interactive components)

**`src/pages/Home.tsx`** — Deleted. Dead code — not referenced in any route (index route points to `CheckIn`).

**`src/pages/CategoryPage.tsx`** — Deleted.

**`src/components/CategoryCard.tsx`** — Deleted.

**`src/components/SubcategorySection.tsx`** — Deleted.

**`src/components/ToolCard.tsx`** — Kept but simplified. Used by the new Tools page to render each tool card.

**`src/App.tsx`** — Remove `/category/:categoryId` route.

### Check-in Result Components

**`src/components/checkin/StateResult.tsx`**:
- Delete `getToolEmoji()` hardcoded map
- Import `getToolById` from `tools.ts` and use `tool.emoji` instead
- Fallback to a default emoji (🔧) for unknown tool IDs

**`src/components/checkin/LowEnergyStateResult.tsx`**:
- Same change — delete duplicate emoji map, import from `tools.ts`

### Insights Components

**`src/components/insights/ToolEffectiveness.tsx`**:
- Already joins with `tools.ts` correctly via `.find()`
- Make resilient: if a tool ID isn't found in the pruned list, show the raw ID as the name and a default emoji. This handles historical data from tools that were used before the prune.

**`src/components/insights/FormulationCard.tsx`**:
- Same resilience pattern for tool lookups

**`src/components/insights/ContinuityCard.tsx`**:
- Same resilience pattern — imports `getToolById`, falls back to raw ID + default emoji for unknown tools

**`src/components/insights/ProactiveAlert.tsx`**:
- Same resilience pattern — currently hides the tool link when `.find()` fails; update to show tool with raw ID fallback instead of hiding

### Profile

**`src/pages/Profile.tsx`**:
- Update "Focus Categories" to reference modules instead of old categories
- Import from `modules.ts` instead of `categories.ts`

### Cloud Functions

**`functions/src/index.ts`** — Add outbound ID normalization at the API boundary:

1. **Outbound (graph → frontend):** Where `ToolRecommendation` objects are built from graph query results, normalize the `id` field:
   - Strip `dbt_` prefix
   - Replace `_` with `-`
   - This applies in `getStateAndTools()`, `getQuickTools()`, and `getInsightsData()` (which returns tool IDs in `toolEffectiveness`, `continuityPrompt`, and `proactiveAlert.suggestedTool`)
   - Create a shared `normalizeToolId(graphId)` helper within the Cloud Functions file for consistency

2. **Inbound — no change.** `trackToolUsage()` already stores frontend-format IDs (e.g., `opposite-action`). Keep this behavior. Do NOT denormalize inbound IDs — this avoids creating mixed-format data in `ToolUsage` nodes.

3. **Internal queries** that hardcode tool ID arrays (like `getQuickToolsForQuadrant` with `['dbt_tipp', 'dbt_paced_breathing']`) stay as-is — they talk to the graph directly.

### Routing

| Before | After |
|--------|-------|
| `/tools` → Tools page (category cards) | `/tools` → Tools page (flat module grid) |
| `/category/:categoryId` → CategoryPage | Removed |
| `/tool/:toolId` → ToolPage | Unchanged |

### Files to Delete

- `src/data/categories.ts`
- `src/pages/CategoryPage.tsx`
- `src/pages/Home.tsx` (dead code — not referenced in any route)
- `src/components/CategoryCard.tsx`
- `src/components/SubcategorySection.tsx`

### Files to Create

- `src/data/modules.ts`

### Files to Modify

- `src/data/tools.ts` — prune to 7 tools, replace categoryId/subcategoryId with module
- `src/pages/Tools.tsx` — rewrite to flat module grid
- `src/pages/ToolPage.tsx` — remove category import, remove normalizeGraphToolId, update guard clause, update back link
- `src/components/checkin/StateResult.tsx` — remove duplicate emoji map, import from tools.ts
- `src/components/checkin/LowEnergyStateResult.tsx` — remove duplicate emoji map, import from tools.ts
- `src/components/insights/ToolEffectiveness.tsx` — add fallback for unknown tool IDs
- `src/components/insights/FormulationCard.tsx` — add fallback for unknown tool IDs
- `src/components/insights/ContinuityCard.tsx` — add fallback for unknown tool IDs
- `src/components/insights/ProactiveAlert.tsx` — add fallback for unknown tool IDs (currently hides link)
- `src/pages/Profile.tsx` — update Focus Categories to use modules
- `src/App.tsx` — remove category route
- `functions/src/index.ts` — add outbound ID normalization in getStateAndTools, getQuickTools, and getInsightsData
- `src/components/ToolCard.tsx` — simplify (remove subcategory references if any)

## Desktop Layout

2-column card grid within each module section. Distress Tolerance renders as a 2x2 grid. Emotion Regulation fills one row of 2. Interpersonal Effectiveness and Mindfulness share a row at the bottom (1 tool + coming soon). Stacks to single column on mobile via CSS grid responsive breakpoint.

## What This Does NOT Change

- The 7 interactive tool components themselves (`src/pages/tools/*.tsx`) — untouched
- The check-in flow (`CheckIn.tsx`) — still works the same way
- The graph schema — TherapyConcept nodes keep their `dbt_` prefix IDs
- The recommendation engine in Cloud Functions — same queries, just normalizes the output IDs
- Micro-steps (`microSteps.ts`) — keyed by activation pattern, not affected
- Emotion data (`emotions.ts`) — not affected
