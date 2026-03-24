# Check-In Emotion Selection Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current EmotionPlane (zoom-in/zoom-out model) with a single-screen accordion grid where each quadrant independently expands through three levels (label → core emotions → all emotions).

**Architecture:** Two new components (`QuadrantCell`, `QuadrantGrid`) replace `EmotionPlane`. `QuadrantGrid` manages quadrant level state, selected emotions, related emotions fetching, and all controls. `QuadrantCell` handles the three-level rendering of a single quadrant. `CheckIn.tsx` swaps `EmotionPlane` for `QuadrantGrid` with the same prop interface.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, CSS custom properties (no animation libraries)

**Spec:** `docs/superpowers/specs/2026-03-19-checkin-emotion-selection-redesign.md`

**Visual source of truth:** `.superpowers/brainstorm/96667-1773860324/accordion-v4.html` — implementation MUST match this mockup exactly.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/checkin/QuadrantCell.tsx` | Create | Single quadrant: L0 (label), L1 (core circles), L2 (all circles). Handles expand/collapse buttons, circle rendering, selection highlighting. |
| `src/components/checkin/QuadrantGrid.tsx` | Create | Full emotion selection screen: selected bar, related panel, show/hide all button, 2×2 grid of QuadrantCells, continue button, secondary links. Manages quadrant levels, selected emotions, related emotions fetching. |
| `src/pages/CheckIn.tsx` | Modify | Replace `EmotionPlane` import and rendering with `QuadrantGrid`. Same props interface. |

---

### Task 1: Create QuadrantCell Component

**Files:**
- Create: `src/components/checkin/QuadrantCell.tsx`

This is the building block. It renders one quadrant at Level 0, 1, or 2.

- [ ] **Step 1: Create QuadrantCell with Level 0 rendering**

Create `src/components/checkin/QuadrantCell.tsx`. Start with just Level 0 — a tappable cell showing the quadrant label.

```typescript
// Props interface:
interface QuadrantCellProps {
  quadrantId: string;           // 'high-unpleasant' | 'high-pleasant' | 'low-unpleasant' | 'low-pleasant'
  level: 0 | 1 | 2;
  selectedEmotions: string[];
  onToggleEmotion: (name: string) => void;
  onLevelChange: (level: 0 | 1 | 2) => void;
}
```

Level 0 rendering:
- Min-height 140px, centered, quadrant background color via `var(--color-q-{abbr}-bg)` and border via `var(--color-q-{abbr}-border)`
- Label text (e.g., "High Energy\nUnpleasant") in quadrant text color via `var(--color-q-{abbr}-text)`
- `onClick` → calls `onLevelChange(1)`
- Use a `quadrantAbbr` map: `{ 'high-unpleasant': 'hu', 'high-pleasant': 'hp', 'low-unpleasant': 'lu', 'low-pleasant': 'lp' }`
- Use a `quadrantLabels` map for display text: `{ 'high-unpleasant': 'High Energy\nUnpleasant', ... }`

- [ ] **Step 2: Add Level 1 rendering (core emotions)**

When `level === 1`:
- Label is hidden (not rendered)
- Render circles for `getCoreEmotionsByQuadrant(quadrantId)` from `src/data/emotions.ts`
- Each circle: 52px on mobile, 64px on desktop (use Tailwind `w-[52px] h-[52px] sm:w-[64px] sm:h-[64px]`)
- Circle background: `var(--color-q-{abbr}-fill)` at 50% opacity → use inline style `backgroundColor: color-mix(in srgb, var(--color-q-{abbr}-fill) 50%, transparent)`
- Circle border: `var(--color-q-{abbr}-fill)` at 60% opacity
- Circle text: light color, 8.5px font, centered, `line-height: 1.15`
- Circles in a flex-wrap container with `gap-1.5`, `justify-center`
- Selected state: white ring (`box-shadow: 0 0 0 2.5px #fff, 0 0 14px rgba(255,255,255,0.25)`), `scale(1.05)`
- `onClick` on circle → `onToggleEmotion(emotion.name)`
- Staggered pop-in: each circle gets `animation: popIn 0.2s ease-out backwards` with `animation-delay: ${index * 20}ms`
- Add `popIn` keyframe to component or index.css: `from { opacity: 0; transform: scale(0.7) } to { opacity: 1; transform: scale(1) }`
- Below circles: action buttons row with "hide" (left, lower opacity) and "more +" (right)
  - "hide" → `onLevelChange(0)`
  - "more +" → `onLevelChange(2)`
  - Button text color matches quadrant: `var(--color-q-{abbr}-text)`

- [ ] **Step 3: Add Level 2 rendering (all emotions)**

When `level === 2`:
- Same as Level 1 but render `getEmotionsByQuadrant(quadrantId)` (all emotions, not just core)
- "more +" button text changes to "less −"
- "less −" → `onLevelChange(1)`
- "hide" still → `onLevelChange(0)`
- Same circle styling, same stagger animation
- Note: High Unpleasant has 49 emotions — verify layout looks right in a half-width cell

- [ ] **Step 4: Verify QuadrantCell renders correctly**

Run: `npm run dev`

Open the app. QuadrantCell won't be wired in yet, but verify no TypeScript errors by checking the terminal output. We'll do visual verification after Task 2.

- [ ] **Step 5: Commit**

```bash
git add src/components/checkin/QuadrantCell.tsx
git commit -m "feat: add QuadrantCell component with L0/L1/L2 rendering"
```

---

### Task 2: Create QuadrantGrid Component

**Files:**
- Create: `src/components/checkin/QuadrantGrid.tsx`

This is the full emotion selection screen that replaces EmotionPlane.

- [ ] **Step 1: Create QuadrantGrid with props interface and quadrant level state**

```typescript
// Props interface — same shape as EmotionPlane:
interface QuadrantGridProps {
  onSelect: (emotions: string[]) => void;
  onHelpMeNow?: () => void;
  onSomaticEntry?: () => void;
}
```

Local state:
- `levels: Record<string, 0 | 1 | 2>` — initialized with all four quadrants at 0
- `selectedEmotions: string[]`
- `relatedEmotions: RelatedEmotion[]`

Render the screen layout (top to bottom):
1. Header `<h2>` "How are you feeling?"
2. Placeholder for selected bar (next step)
3. Placeholder for related panel (next step)
4. "Show all emotions" / "Hide all emotions" button
5. 2×2 grid: `grid grid-cols-2 gap-2.5` containing four `<QuadrantCell>` components
6. Continue button (disabled if no selections)
7. Secondary links

Wire up the grid:
- Pass `level={levels[quadrantId]}` to each QuadrantCell
- `onLevelChange` updates `levels` state for that quadrant
- Pass `selectedEmotions` and `onToggleEmotion` through

Wire up "Show all" / "Hide all" toggle:
- Compute `allExpanded = Object.values(levels).every(l => l >= 1)`
- If not all expanded: button says "Show all emotions", onClick sets all to 1
- If all expanded: button says "Hide all emotions", onClick sets all to 0

Wire up Continue button:
- Shows count: "Continue with {n} emotion{s}"
- `onClick` → `onSelect(selectedEmotions)`
- Only visible when `selectedEmotions.length > 0`

Wire up secondary links:
- "I don't know — start with my body" → `onSomaticEntry?.()`
- "Help me now" → `onHelpMeNow?.()`

- [ ] **Step 2: Add selected emotions bar**

Render between header and related panel when `selectedEmotions.length > 0`:

- Container: subtle background (`bg-[var(--color-bg-card-hover)]`), border, rounded-xl, padding
- Label: "Selected:" in secondary text color
- Tags: flex-wrap row of selected emotion names
  - Each tag: rounded-full pill with quadrant color background/border
  - Get quadrant from `getEmotionByName(name)?.quadrant` (from `src/data/emotions.ts`)
  - Use `var(--color-q-{abbr}-fill)` at 30% opacity for background, 50% for border
  - "×" button on each tag → calls `onToggleEmotion(name)` to deselect

- [ ] **Step 3: Add related emotions panel**

Port the related emotions logic from `EmotionPlane.tsx` lines 176-206. This is a `useEffect` that:
1. Watches `selectedEmotions`
2. Gets first selected emotion's ID
3. Calls `getRelatedEmotionIds()` (local family), `getOppositeEmotionIds()` (local opposites), `getRelatedEmotions()` (Cloud Function)
4. Merges and ranks with `rankRelatedEmotions()`

Copy the `rankRelatedEmotions` function from EmotionPlane.tsx (lines 61-100).

Render the panel between selected bar and "Show all" button when `selectedEmotions.length > 0 && relatedEmotions.length > 0`:

- Container: subtle background, border, rounded-xl
- Header: "People who feel **{firstEmotion}** also describe:"
- Pills: flex-wrap row of related emotions
  - Each pill: quadrant color dot (7px circle) + emotion name + "+" icon
  - `onClick` → add to selectedEmotions (if not already selected)
  - Get quadrant color from `getEmotionByName(formatEmotionName(related.name))?.quadrant`
- Hint: "Tap to add · {reason}" in muted text

Import `formatEmotionName` utility — check if it exists in EmotionPlane or create it (capitalizes first letter of each word).

Import `getRelatedEmotions` from `src/services/neo4j.ts`.

- [ ] **Step 4: Verify QuadrantGrid renders standalone**

Run: `npm run dev`

QuadrantGrid isn't wired into CheckIn yet. Temporarily render it somewhere accessible (or proceed to Task 3 to wire it in). Check terminal for TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/checkin/QuadrantGrid.tsx
git commit -m "feat: add QuadrantGrid component with selection, related emotions, and controls"
```

---

### Task 3: Wire QuadrantGrid into CheckIn.tsx

**Files:**
- Modify: `src/pages/CheckIn.tsx` (lines 421-427)

- [ ] **Step 1: Replace EmotionPlane with QuadrantGrid**

In `CheckIn.tsx`:
1. Change import: replace `EmotionPlane` import with `QuadrantGrid`
   - Remove: `import { EmotionPlane } from '../components/checkin/EmotionPlane';` (line 4, named import)
   - Add: `import { QuadrantGrid } from '../components/checkin/QuadrantGrid';`
2. Replace the rendering block (around lines 421-427):
   ```typescript
   // Before:
   {step === 'emotion' && (
     <EmotionPlane
       onSelect={handleEmotionSelect}
       onHelpMeNow={handleHelpMeNow}
       onSomaticEntry={handleSomaticEntry}
     />
   )}
   // After:
   {step === 'emotion' && (
     <QuadrantGrid
       onSelect={handleEmotionSelect}
       onHelpMeNow={handleHelpMeNow}
       onSomaticEntry={handleSomaticEntry}
     />
   )}
   ```

That's it — the props interface is identical. Use named exports in both new components to match the codebase convention.

- [ ] **Step 2: Visual verification against mockup**

Run: `npm run dev`

Open the app, navigate to check-in. Verify against the mockup (`.superpowers/brainstorm/96667-1773860324/accordion-v4.html`):

1. **Level 0**: Four quadrant cells with labels in 2×2 grid. Tap one → expands to L1.
2. **Level 1**: Label gone. Core emotion circles appear with staggered animation. "hide" on left, "more +" on right.
3. **Level 2**: All emotions appear. "more +" becomes "less −".
4. **Show all emotions**: Expands all to L1. Toggles to "Hide all emotions".
5. **Selection**: Tap circle → white ring + glow. Selected bar appears at top with colored tags.
6. **Related emotions**: Panel appears below selected bar. "People who feel X also describe:" with pills.
7. **Continue**: Button appears with count. Links to body map / help me now still work.
8. **Colors**: Each quadrant uses its correct color from CSS custom properties.
9. **Responsive**: Check both mobile width (390px in devtools) and desktop.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CheckIn.tsx
git commit -m "feat: replace EmotionPlane with QuadrantGrid in check-in flow"
```

---

### Task 4: Add Animations and Visual Polish

**Files:**
- Modify: `src/index.css` (add popIn keyframe if not already added inline)
- Modify: `src/components/checkin/QuadrantCell.tsx` (polish)

- [ ] **Step 1: Add popIn keyframe to index.css**

Add to the keyframes section (after the existing `stepEnter` animation, around line 547):

```css
@keyframes popIn {
  from { opacity: 0; transform: scale(0.7); }
  to { opacity: 1; transform: scale(1); }
}
```

- [ ] **Step 2: Polish circle hover/active states**

In QuadrantCell, ensure emotion circles have:
- Hover: `scale(1.08)`, `brightness(1.15)` — use Tailwind `hover:scale-[1.08] hover:brightness-110`
- Active/tap: `scale(0.95)` — use Tailwind `active:scale-95`
- Transition: `transition-all duration-150`

- [ ] **Step 3: Polish quadrant cell transitions**

When a quadrant changes level, the height change should be smooth:
- Add `transition-all duration-300 ease-[var(--ease-default)]` to the quadrant cell container

- [ ] **Step 4: Verify animations**

Run: `npm run dev`

Check:
- Circles pop in with stagger when expanding L0→L1 and L1→L2
- Hover/tap states feel responsive
- Quadrant height changes are smooth, not jarring
- No layout jumps when other quadrants resize

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components/checkin/QuadrantCell.tsx
git commit -m "feat: add popIn animation and polish hover/transition states"
```

---

### Task 5: Cleanup

**Files:**
- Modify: `src/components/checkin/EmotionPlane.tsx` (delete or keep)

- [ ] **Step 1: Verify nothing else imports EmotionPlane**

Search the codebase for `EmotionPlane` imports. If only the old CheckIn.tsx import existed (now removed), it's safe to delete.

- [ ] **Step 2: Delete EmotionPlane.tsx and update barrel file**

Remove: `src/components/checkin/EmotionPlane.tsx`

Update: `src/components/checkin/index.ts` — remove the `export { EmotionPlane } from './EmotionPlane';` line (line 3). Optionally add exports for the new components:
```typescript
export { QuadrantGrid } from './QuadrantGrid';
export { QuadrantCell } from './QuadrantCell';
```

If any utility functions from EmotionPlane are reused in QuadrantGrid (like `rankRelatedEmotions` or `formatEmotionName`), make sure they've been properly copied or extracted.

- [ ] **Step 3: Final end-to-end verification**

Run: `npm run dev`

Walk through the complete check-in flow:
1. Tap a quadrant → L1 → select emotions → related suggestions appear → continue
2. Verify discriminating questions still appear for low-unpleasant
3. Verify body map step works
4. Verify analysis and result screen work
5. Try "Help me now" from the emotion screen
6. Try "Start with my body" from the emotion screen
7. Check both light and dark theme

- [ ] **Step 4: Commit**

```bash
git rm src/components/checkin/EmotionPlane.tsx
git commit -m "chore: remove EmotionPlane, replaced by QuadrantGrid"
```

- [ ] **Step 5: Build check**

Run: `npm run build`

Verify no TypeScript errors or build failures.
