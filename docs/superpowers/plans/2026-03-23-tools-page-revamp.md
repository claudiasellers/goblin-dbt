# Tools Page Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 59-tool placeholder-heavy Tools page with a focused 7-tool page organized by DBT module, clean up duplicate emoji maps and tool ID normalization, and remove dead category infrastructure.

**Architecture:** Rewrite the data layer (tools.ts → 7 tools with `module` field, new modules.ts), add outbound ID normalization in Cloud Functions, rewrite the Tools page as a flat grid, and clean up all downstream consumers (StateResult emoji maps, insights fallbacks, Profile focus categories).

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Firebase Cloud Functions, Neo4j

**Spec:** `docs/superpowers/specs/2026-03-23-tools-page-revamp.md`

**Verification:** No test framework. Use `npm run build` (tsc + vite) to catch type errors and broken imports. Manual verification in browser for UI.

---

## File Map

### Create
- `src/data/modules.ts` — 4 DBT module definitions

### Delete
- `src/data/categories.ts`
- `src/pages/CategoryPage.tsx`
- `src/pages/Home.tsx`
- `src/components/CategoryCard.tsx`
- `src/components/SubcategorySection.tsx`

### Modify
- `src/data/tools.ts` — prune to 7, new schema
- `src/pages/Tools.tsx` — full rewrite
- `src/pages/ToolPage.tsx` — remove category deps
- `src/components/ToolCard.tsx` — update Tool type usage (minor)
- `src/components/checkin/StateResult.tsx` — remove emoji map
- `src/components/checkin/LowEnergyStateResult.tsx` — remove emoji map
- `src/components/insights/ToolEffectiveness.tsx` — add fallback
- `src/components/insights/FormulationCard.tsx` — add fallback
- `src/components/insights/ContinuityCard.tsx` — add fallback
- `src/components/insights/ProactiveAlert.tsx` — add fallback
- `src/pages/Profile.tsx` — use modules instead of categories
- `src/App.tsx` — remove category route and imports
- `functions/src/index.ts` — add normalizeToolId helper, apply outbound

---

### Task 1: Create modules.ts and rewrite tools.ts

**Files:**
- Create: `src/data/modules.ts`
- Modify: `src/data/tools.ts`

- [ ] **Step 1: Create `src/data/modules.ts`**

```ts
export type ModuleId = 'distress-tolerance' | 'emotion-regulation' | 'interpersonal-effectiveness' | 'mindfulness';

export interface Module {
  id: ModuleId;
  name: string;
  order: number;
}

export const modules: Module[] = [
  { id: 'distress-tolerance', name: 'Distress Tolerance', order: 1 },
  { id: 'emotion-regulation', name: 'Emotion Regulation', order: 2 },
  { id: 'interpersonal-effectiveness', name: 'Interpersonal Effectiveness', order: 3 },
  { id: 'mindfulness', name: 'Mindfulness', order: 4 },
];

export function getModuleById(id: string): Module | undefined {
  return modules.find(m => m.id === id);
}
```

- [ ] **Step 2: Rewrite `src/data/tools.ts`**

Replace the entire file. New `Tool` interface uses `module` instead of `categoryId`/`subcategoryId`. Only 7 tools. New helper `getToolsByModule()`.

```ts
import type { ModuleId } from './modules';

export interface Tool {
  id: string;
  name: string;
  tagline: string;
  description: string;
  whenToUse: string;
  module: ModuleId;
  dbtBasis?: string;
  emoji: string;
}

export const tools: Tool[] = [
  // Distress Tolerance
  {
    id: 'cool-down',
    name: 'Cool Down',
    tagline: 'Use temperature to calm fast',
    description: 'Cold water or ice can quickly shift your body out of crisis mode by triggering your dive reflex.',
    whenToUse: 'When emotions are at a 7+ out of 10 and you need fast relief.',
    module: 'distress-tolerance',
    dbtBasis: 'TIP - Temperature',
    emoji: '🧊',
  },
  {
    id: 'pause',
    name: 'Pause',
    tagline: 'Stop before you act',
    description: 'A quick mental checklist to interrupt impulsive reactions and give yourself space to choose your response.',
    whenToUse: 'When you\'re about to say or do something you might regret.',
    module: 'distress-tolerance',
    dbtBasis: 'STOP Skill',
    emoji: '✋',
  },
  {
    id: 'five-senses',
    name: '5-4-3-2-1',
    tagline: 'Ground yourself through your senses',
    description: 'Notice things around you using each of your five senses to anchor yourself in the present moment.',
    whenToUse: 'When you feel disconnected, anxious, or caught up in racing thoughts.',
    module: 'distress-tolerance',
    dbtBasis: '5-4-3-2-1 Grounding',
    emoji: '👁️',
  },
  {
    id: 'urge-surfing',
    name: 'Urge Surfing',
    tagline: 'Ride the wave without acting',
    description: 'Observe your urges like waves that rise, peak, and fall—without needing to act on them.',
    whenToUse: 'When you have a strong urge to do something harmful or unhelpful.',
    module: 'distress-tolerance',
    dbtBasis: 'Urge Surfing / Distress Tolerance',
    emoji: '🌊',
  },
  // Emotion Regulation
  {
    id: 'opposite-action',
    name: 'Do the Opposite',
    tagline: 'Act opposite to unhelpful urges',
    description: 'When an emotion\'s action urge isn\'t helpful, doing the opposite can shift how you feel.',
    whenToUse: 'When your emotion is pushing you toward something that won\'t help.',
    module: 'emotion-regulation',
    dbtBasis: 'Opposite Action',
    emoji: '🔄',
  },
  {
    id: 'problem-solve',
    name: 'Problem Solve',
    tagline: 'Address the cause of distress',
    description: 'When the emotion fits the facts and the situation can be changed, problem-solving is the right move. Break the problem into steps and take action.',
    whenToUse: 'When your distress is about a real problem that has a solution.',
    module: 'emotion-regulation',
    dbtBasis: 'Problem Solving',
    emoji: '🛠️',
  },
  // Interpersonal Effectiveness
  {
    id: 'dear-man',
    name: 'DEAR MAN',
    tagline: 'Ask for what you need effectively',
    description: 'A step-by-step framework: Describe the situation, Express feelings, Assert your need, Reinforce why it matters. Stay Mindful, Appear confident, Negotiate if needed.',
    whenToUse: 'When you need to ask for something important and want to be heard.',
    module: 'interpersonal-effectiveness',
    dbtBasis: 'DEAR MAN',
    emoji: '🗣️',
  },
];

export function getToolById(id: string): Tool | undefined {
  return tools.find(t => t.id === id);
}

export function getToolsByModule(moduleId: string): Tool[] {
  return tools.filter(t => t.module === moduleId);
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Type errors in files that still import `categoryId`, `subcategoryId`, `getToolsByCategory`, `getToolsBySubcategory`, or `categories.ts`. This is expected — we'll fix those files in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add src/data/modules.ts src/data/tools.ts
git commit -m "feat: rewrite tools.ts to 7 tools with DBT modules, create modules.ts"
```

---

### Task 2: Delete dead files (except categories.ts) and clean up routing

**Files:**
- Delete: `src/pages/CategoryPage.tsx`, `src/pages/Home.tsx`, `src/components/CategoryCard.tsx`, `src/components/SubcategorySection.tsx`
- Modify: `src/App.tsx`

**Note:** `src/data/categories.ts` is NOT deleted yet — it's still imported by `ToolPage.tsx` (Task 4) and `Profile.tsx` (Task 7). It gets deleted in Task 7 after all imports are removed.

- [ ] **Step 1: Delete 4 dead files**

```bash
rm src/pages/CategoryPage.tsx
rm src/pages/Home.tsx
rm src/components/CategoryCard.tsx
rm src/components/SubcategorySection.tsx
```

- [ ] **Step 2: Update `src/App.tsx`**

Remove the `CategoryPage` import (line 8) and the `/category/:categoryId` route (line 26).

The file should look like:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { CheckIn } from './pages/CheckIn';
import { Tools } from './pages/Tools';
import { History } from './pages/History';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ToolPage } from './pages/ToolPage';
import { Profile } from './pages/Profile';

function App() {
  return (
    <Routes>
      {/* Auth routes (standalone, no sidebar) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Main app with dashboard layout (sidebar + header) */}
      <Route element={<DashboardLayout />}>
        <Route index element={<CheckIn />} />
        <Route path="/insights" element={<Navigate to="/history" replace />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/tool/:toolId" element={<ToolPage />} />
      </Route>
    </Routes>
  );
}

export default App;
```

- [ ] **Step 3: Commit**

```bash
git rm src/pages/CategoryPage.tsx src/pages/Home.tsx src/components/CategoryCard.tsx src/components/SubcategorySection.tsx
git add src/App.tsx
git commit -m "chore: delete dead CategoryPage, Home, CategoryCard, SubcategorySection, clean up routes"
```

---

### Task 3: Rewrite Tools page

**Files:**
- Modify: `src/pages/Tools.tsx`
- Modify: `src/components/ToolCard.tsx` (minor — verify it works with new Tool type)

- [ ] **Step 1: Verify `src/components/ToolCard.tsx` works with new Tool type**

Read the file. It imports `type { Tool }` from `../data/tools` and uses `tool.id`, `tool.emoji`, `tool.name`, `tool.tagline`. All of these fields are preserved in the new Tool interface. No changes needed to ToolCard — just verify the import still works.

- [ ] **Step 2: Rewrite `src/pages/Tools.tsx`**

Replace the entire file:

```tsx
import { modules } from '../data/modules';
import { getToolsByModule } from '../data/tools';
import { ToolCard } from '../components/ToolCard';

export function Tools() {
  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
          Tools
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Skills you can use right now
        </p>
      </div>

      {/* Module sections */}
      <div className="space-y-8">
        {modules.map(mod => {
          const modTools = getToolsByModule(mod.id);

          return (
            <div key={mod.id}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-3 px-1">
                {mod.name}
              </h2>

              {modTools.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {modTools.map(tool => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-[var(--color-border)] text-center">
                  <span className="text-sm text-[var(--color-text-muted)]">Coming soon</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: May still have errors from other files (Profile, ToolPage) that reference old categories. Tools.tsx itself should compile cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Tools.tsx src/components/ToolCard.tsx
git commit -m "feat: rewrite Tools page as flat grid with DBT module sections"
```

---

### Task 4: Update ToolPage — remove category dependencies

**Files:**
- Modify: `src/pages/ToolPage.tsx`

- [ ] **Step 1: Update `src/pages/ToolPage.tsx`**

Changes:
- Remove `import { getCategoryById } from '../data/categories'` (line 4)
- Remove `normalizeGraphToolId()` function (lines 29-32)
- Simplify tool lookup: `const tool = toolId ? getToolById(toolId) : undefined` (remove the `?? getToolById(normalizeGraphToolId(toolId))` fallback)
- Remove `const category = tool ? getCategoryById(tool.categoryId) : undefined` (line 40)
- Update guard clause from `if (!tool || !category)` to `if (!tool)` (line 50)
- Update back link from `← {category.name}` linking to `/category/${category.id}` to `← Tools` linking to `/tools` (line 73-77)
- Remove DBT basis section reference to `tool.dbtBasis` — this field is unchanged but check it still works

The updated file:

```tsx
import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getToolById } from '../data/tools';
import { useAuth } from '../contexts/AuthContext';
import { trackToolUsage } from '../services/neo4j';

// Import tool components
import { CoolDown } from './tools/CoolDown';
import { FiveSenses } from './tools/FiveSenses';
import { Pause } from './tools/Pause';
import { UrgeSurfing } from './tools/UrgeSurfing';
import { OppositeAction } from './tools/OppositeAction';
import { DearMan } from './tools/DearMan';
import { ProblemSolve } from './tools/ProblemSolve';

// Map tool IDs to their interactive components
const toolComponents: Record<string, React.ComponentType> = {
  'cool-down': CoolDown,
  'five-senses': FiveSenses,
  'pause': Pause,
  'urge-surfing': UrgeSurfing,
  'opposite-action': OppositeAction,
  'dear-man': DearMan,
  'problem-solve': ProblemSolve,
};

export function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const { user } = useAuth();
  const tool = toolId ? getToolById(toolId) : undefined;

  // Track tool usage when the page mounts (fire-and-forget)
  const idToTrack = tool?.id ?? toolId;
  useEffect(() => {
    if (user && idToTrack) {
      trackToolUsage(idToTrack);
    }
  }, [user, idToTrack]);

  if (!tool) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-text-secondary)]">
          Tool not found.
        </p>
        <Link
          to="/tools"
          className="mt-4 inline-block text-[var(--color-text-secondary)] underline hover:no-underline"
        >
          ← Tools
        </Link>
      </div>
    );
  }

  const ToolComponent = toolComponents[tool.id];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        to="/tools"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <span>←</span>
        <span>Tools</span>
      </Link>

      {/* Tool header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl" role="img" aria-hidden="true">
            {tool.emoji}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
            {tool.name}
          </h1>
        </div>
        <p className="text-lg text-[var(--color-text-secondary)]">
          {tool.tagline}
        </p>
      </div>

      {/* When to use */}
      <div className="mb-8 p-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
        <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          When to use this
        </p>
        <p className="text-[var(--color-text-primary)]">
          {tool.whenToUse}
        </p>
      </div>

      {/* Interactive tool component */}
      <div className="mb-8">
        {ToolComponent ? (
          <ToolComponent />
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-[var(--color-border)] text-center">
            <p className="text-[var(--color-text-tertiary)] italic">
              Interactive tool coming soon...
            </p>
          </div>
        )}
      </div>

      {/* DBT context (collapsible) */}
      {tool.dbtBasis && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
            <span className="group-open:hidden">+ What this is based on</span>
            <span className="hidden group-open:inline">− What this is based on</span>
          </summary>
          <div className="mt-2 p-4 rounded-lg bg-[var(--color-bg-elevated)]/50 text-sm text-[var(--color-text-secondary)]">
            <p>
              This tool is based on <strong>{tool.dbtBasis}</strong>, a skill from Dialectical Behavior Therapy (DBT).
            </p>
          </div>
        </details>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/pages/ToolPage.tsx
git commit -m "refactor: remove category deps and normalizeGraphToolId from ToolPage"
```

---

### Task 5: Fix duplicate emoji maps in StateResult and LowEnergyStateResult

**Files:**
- Modify: `src/components/checkin/StateResult.tsx`
- Modify: `src/components/checkin/LowEnergyStateResult.tsx`

**Note:** The `'🔧'` fallback emoji will be the common case for tool recommendations from `getQuickTools` — the graph recommends tools like `dbt_behavioral_activation` which, even after normalization, are not in the pruned 7-tool list. The `ToolRecommendation` object still carries its own `name` and `description` from the graph, so the card renders fine — it's just the emoji that falls back.

- [ ] **Step 1: Update `src/components/checkin/StateResult.tsx`**

Add import at top (after existing imports):
```ts
import { getToolById } from '../../data/tools';
```

Delete the `getToolEmoji()` function (lines 325-345).

Replace the call at line 304 inside `ToolCard`:
```tsx
// Before:
{getToolEmoji(tool.id)}

// After:
{getToolById(tool.id)?.emoji || '🔧'}
```

- [ ] **Step 2: Update `src/components/checkin/LowEnergyStateResult.tsx`**

Add import at top:
```ts
import { getToolById } from '../../data/tools';
```

In the `ToolCardCompact` component, delete the `toolEmoji` map (lines 261-278).

Replace the usage at line 287:
```tsx
// Before:
<span className="text-lg flex-shrink-0">{toolEmoji[tool.id] || '🔧'}</span>

// After:
<span className="text-lg flex-shrink-0">{getToolById(tool.id)?.emoji || '🔧'}</span>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/checkin/StateResult.tsx src/components/checkin/LowEnergyStateResult.tsx
git commit -m "refactor: remove duplicate emoji maps, use tools.ts as single source of truth"
```

---

### Task 6: Add fallbacks to insights components

**Files:**
- Modify: `src/components/insights/ToolEffectiveness.tsx`
- Modify: `src/components/insights/FormulationCard.tsx`
- Modify: `src/components/insights/ContinuityCard.tsx`
- Modify: `src/components/insights/ProactiveAlert.tsx`

These components do `.find()` lookups against tools.ts. After pruning to 7 tools, historical data may reference tools that no longer exist in the list. Each needs a fallback so it doesn't break or hide data.

- [ ] **Step 1: Update `src/components/insights/ToolEffectiveness.tsx`**

Find the lookup around line 29:
```ts
const tool = toolsData.find((td) => td.id === t.toolId);
```

Ensure the rendering after this handles `tool` being undefined — show `t.toolId` as the name and `🔧` as emoji when `tool` is null. Check the existing rendering code and add fallback if not already present.

- [ ] **Step 2: Update `src/components/insights/FormulationCard.tsx`**

Find the lookup around line 62:
```ts
const tool = toolsData.find((t) => t.id === toolId);
```

Same pattern: if `tool` is undefined, display `toolId` as the label and `🔧` as emoji.

- [ ] **Step 3: Update `src/components/insights/ContinuityCard.tsx`**

Find the lookup around line 35:
```ts
const tool = toolsData.find((t) => t.id === prompt.toolId);
```

Currently uses `tool?.name || 'that tool'` as fallback. Update to use `prompt.toolId` instead of `'that tool'` so the user sees the actual ID.

- [ ] **Step 4: Update `src/components/insights/ProactiveAlert.tsx`**

Find the lookup around line 11:
```ts
const tool = toolsData.find((t) => t.id === alert.suggestedTool);
```

Currently hides the tool link entirely when `tool` is falsy. Update to show the link with `alert.suggestedTool` as the name and `🔧` as emoji when the tool isn't in the pruned list.

**Note:** Most proactive alert `suggestedTool` values (e.g., `self-compassion-break`, `gentle-movement`) are NOT in the pruned 7-tool list. The fallback is the normal path here, not an edge case. These IDs are already in frontend format (no `dbt_` prefix), so normalization in Cloud Functions is a harmless no-op for them.

- [ ] **Step 5: Verify build**

Run: `npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/components/insights/ToolEffectiveness.tsx src/components/insights/FormulationCard.tsx src/components/insights/ContinuityCard.tsx src/components/insights/ProactiveAlert.tsx
git commit -m "fix: add fallbacks for unknown tool IDs in insights components"
```

---

### Task 7: Update Profile to use modules, delete categories.ts

**Files:**
- Modify: `src/pages/Profile.tsx`
- Delete: `src/data/categories.ts` (last file that imported it was ToolPage, fixed in Task 4)

- [ ] **Step 1: Update `src/pages/Profile.tsx`**

Replace the import (line 4):
```ts
// Before:
import { categories } from '../data/categories';

// After:
import { modules } from '../data/modules';
```

Update the Focus Categories section (around lines 369-387). Replace `categories.map(...)` with `modules.map(...)`. The `cat` variable becomes `mod`. Update field references: `mod.id`, `mod.name`. Modules don't have emojis — remove the emoji span or add a simple mapping.

```tsx
{modules.map((mod) => (
  <button
    key={mod.id}
    onClick={() => {
      const newCats = focusCategories.includes(mod.id)
        ? focusCategories.filter((c) => c !== mod.id)
        : [...focusCategories, mod.id];
      onUpdate({ focusCategories: newCats });
    }}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
      focusCategories.includes(mod.id)
        ? 'bg-[var(--color-accent-muted)] border-[var(--color-accent)] text-[var(--color-accent)]'
        : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-[var(--color-border-accent)]'
    }`}
  >
    {mod.name}
  </button>
))}
```

- [ ] **Step 2: Delete `src/data/categories.ts`**

All imports have now been removed (ToolPage in Task 4, Profile in this step). Safe to delete.

```bash
rm src/data/categories.ts
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Clean build — all category references should now be resolved.

- [ ] **Step 4: Commit**

```bash
git rm src/data/categories.ts
git add src/pages/Profile.tsx
git commit -m "refactor: update Profile focus categories to use DBT modules, delete categories.ts"
```

---

### Task 8: Add outbound ID normalization in Cloud Functions

**Files:**
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Add `normalizeToolId` helper near the top of the file** (after imports, before the first Cloud Function)

```ts
/** Convert graph tool IDs (dbt_opposite_action) to frontend format (opposite-action). */
function normalizeToolId(graphId: string): string {
  if (!graphId) return graphId;
  return graphId.replace(/^dbt_/, '').replace(/_/g, '-');
}
```

- [ ] **Step 2: Apply to `getStateAndTools`**

Find the tool mapping around line 1605:
```ts
// Before:
id: rec.get('id'),

// After:
id: normalizeToolId(rec.get('id')),
```

Also update the name fallback on the same line:
```ts
// Before:
name: rec.get('name') || rec.get('id').replace('dbt_', '').replace(/_/g, ' '),

// After:
name: rec.get('name') || normalizeToolId(rec.get('id')).replace(/-/g, ' '),
```

- [ ] **Step 3: Apply to `getQuickTools`**

Find the tool mapping around line 2602:
```ts
// Before:
id: rec.get('id'),

// After:
id: normalizeToolId(rec.get('id')),
```

Same name fallback pattern as step 2.

- [ ] **Step 4: Apply to `getInsightsData` outbound fields**

Find `proactiveAlert` construction (around line 1005) where `suggestedTool` is set:
```ts
// Before:
suggestedTool: rec.get('suggestedTool'),

// After:
suggestedTool: normalizeToolId(rec.get('suggestedTool')),
```

**Note:** This normalization is defensive — `suggestedTool` values in the graph are already in frontend format (e.g., `self-compassion-break`). `normalizeToolId()` is a no-op for these, but applying it is consistent and protects against future graph data that might use the `dbt_` convention.

Note: `toolEffectiveness` and `continuityPrompt` read `tu.toolId` from `ToolUsage` nodes, which already store frontend-format IDs. No normalization needed for those — they're already in the right format.

- [ ] **Step 5: Verify Cloud Functions build**

Run: `cd functions && npm run build`
Expected: Clean build.

- [ ] **Step 6: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: add outbound tool ID normalization in Cloud Functions"
```

---

### Task 9: Full build verification and manual smoke test

- [ ] **Step 1: Full frontend build**

Run: `npm run build`
Expected: Clean build with zero errors.

- [ ] **Step 2: Full Cloud Functions build**

Run: `cd functions && npm run build`
Expected: Clean build with zero errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`

Verify in browser:
1. `/tools` — shows 4 DBT module sections, 7 tool cards, Mindfulness "coming soon"
2. Click a tool card → goes to `/tool/:id` → back link says "← Tools" and goes to `/tools`
3. `/category/anything` — should show a 404 or redirect (route removed)
4. Check-in flow → reach StateResult → tool cards show correct emojis (from tools.ts, not hardcoded map)
5. `/profile` → Focus Categories shows 4 DBT module buttons
6. Desktop: tool cards in 2-column grid. Mobile: single column.

- [ ] **Step 4: Commit any final adjustments if needed**
