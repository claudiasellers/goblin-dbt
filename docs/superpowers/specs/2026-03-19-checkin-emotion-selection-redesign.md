# Check-In Emotion Selection Redesign

## Problem

The current EmotionPlane component collapses quadrant navigation and emotion selection into a single screen. When zoomed out, tiny circles are crammed into four quadrant regions. When zoomed in, ~40 emotions appear in a uniform grid with no structure. Neither layer works well — the quadrants are cluttered and the emotions aren't navigable.

**Core problem:** Navigation clarity. The app serves users with alexithymia — richer vocabulary is a feature, not a bug. The fix is making the emotions navigable, not simpler.

## Approved Design

### Single-Screen Accordion Grid

Replace the current two-state (zoomed-out / zoomed-in) EmotionPlane with a single-screen accordion grid where each quadrant independently expands through three levels.

**Reference mockup:** `.superpowers/brainstorm/96667-1773860324/accordion-v4.html`

### Three Levels Per Quadrant

**Level 0 — Label only:**
- Quadrant cell shows the label text ("High Energy Unpleasant", etc.)
- Tap the cell to expand to Level 1
- Min-height: 140px, centered text, quadrant background color

**Level 1 — Core emotions:**
- Label disappears entirely (not shrunk — gone)
- ~6-9 core emotions shown as uniform circles
- "hide" button (left) and "more +" button (right) appear below circles
- Circles use the quadrant's color with a staggered pop-in animation

**Level 2 — All emotions:**
- All ~35-50 emotions for that quadrant shown as uniform circles
- "more +" changes to "less −"
- "hide" collapses back to Level 0

Each quadrant operates independently. At any point, different quadrants can be at different levels.

### Global Controls

**"Show all emotions" button:**
- Appears above the quadrant grid, below the selected/related panels
- Expands all four quadrants to Level 1 at once
- Toggles to "Hide all emotions" when all quadrants are at L1+
- Tapping "Hide all" collapses all quadrants back to Level 0

### Emotion Circles

- **Uniform size only.** All circles are the same size (52px on mobile, 64px on desktop). No size differentiation between core and non-core emotions.
- **Color is the only visual differentiator.** Each quadrant has its own fill color. No bold/weight differences, no family labels, no visual hierarchy beyond color.
- **Family labels are not shown in the UI.** The `family` field on emotions is used only for backend clustering (related emotions, graph queries). It does not appear in the UI.
- **Staggered pop-in animation** when circles appear (~20ms stagger, scale 0.7→1 + opacity).
- **Selection state:** White ring (2.5px) + subtle glow shadow + slight scale-up (1.05).

### Quadrant Colors

Using existing CSS custom properties from the design system:

| Quadrant | Fill | Background |
|----------|------|------------|
| High Unpleasant | `rgba(196,112,122,0.5)` | `rgba(196,112,122,0.12)` |
| High Pleasant | `rgba(201,165,90,0.5)` | `rgba(201,165,90,0.12)` |
| Low Unpleasant | `rgba(123,142,196,0.5)` | `rgba(123,142,196,0.12)` |
| Low Pleasant | `rgba(107,168,154,0.5)` | `rgba(107,168,154,0.12)` |

### Selected Emotions Bar

Appears above the grid when 1+ emotions are selected:

- Shows selected emotion names as removable tags (× to deselect)
- Tags use the quadrant's color (background + border)
- Tap × to deselect (also deselects the circle in the grid)

### Related Emotions Panel

Appears below the selected bar, above "Show all emotions," when 1+ emotions are selected:

- Header: "People who feel **[first selected emotion]** also describe:"
- Tappable pills showing: quadrant color dot + emotion name + "+"
- Hint line: "Tap to add · [reason]"
- Reasons include: "related feeling", "often occurs together", "similar body response", "opposite emotion"
- Powered by existing `getRelatedEmotions()` Cloud Function + local `getRelatedEmotionIds()` + `getOppositeEmotionIds()`
- Already-selected emotions are filtered out of the suggestions

### Screen Layout (top to bottom)

1. Header: "How are you feeling?"
2. Selected emotions bar (hidden if nothing selected)
3. Related emotions panel (hidden if nothing selected)
4. "Show all emotions" / "Hide all emotions" toggle button
5. 2×2 quadrant grid

### No Search

The search/custom emotion input from the current EmotionPlane is removed.

### No Emotion Definitions

Definitions were considered but rejected to keep the UI uncluttered. The affect labeling value comes from the selection itself. The related emotions panel already helps users find the right word.

## What Changes

### New Components

- **`QuadrantGrid`** — The accordion grid managing four quadrant cells with independent level state
- **`QuadrantCell`** — Individual quadrant cell handling L0/L1/L2 display, expand/collapse

### Modified Components

- **`CheckIn.tsx`** — Wire up the new components in place of `EmotionPlane`. The check-in step type may not need a new step (`'quadrant'`) since the accordion grid handles the quadrant-to-emotion flow internally on one screen.
- **`EmotionPlane.tsx`** — Replaced by `QuadrantGrid`. Can be deleted or kept for reference during migration.

### Unchanged

- Selected emotions state management (stays in CheckIn.tsx)
- Related emotions fetching (same Cloud Function calls, same ranking logic)
- The rest of the check-in flow (discriminating questions, body map, analysis, result)
- The somatic entry path (bypasses emotion selection)
- All graph queries, Cloud Functions, and data layer
- The design system (Quiet Intelligence) for the rest of the app

## Data Requirements

### Core vs. Non-Core Emotions

The existing `core: true` flag on emotions in `src/data/emotions.ts` determines which emotions appear at Level 1 vs. Level 2. Currently ~36 emotions are marked core (~9 per quadrant). These should be reviewed:

- Level 1 should show the most universally recognized emotions per quadrant
- 6-9 per quadrant is the target (fits well in a half-width grid cell)
- The remaining emotions appear only at Level 2

### No New Data Needed

- Emotion data: already has `quadrant`, `family`, `core` fields
- Related emotions: existing Cloud Function + local helpers
- Quadrant colors: existing CSS custom properties

## Responsive Behavior

- **Mobile (< 640px):** 52px circles, 10px grid gap, 12px quadrant padding
- **Desktop (≥ 640px):** 64px circles, 14px grid gap, 16px quadrant padding
- The 2×2 grid layout works at all sizes — no breakpoint changes needed
- Grid cells grow/shrink naturally as quadrants expand (no fixed cell sizes)

## Transitions & Animation

- **Level changes:** CSS transition on the quadrant cell (height, padding). Content fades in.
- **Circle appearance:** Staggered `popIn` keyframe animation (opacity 0→1, scale 0.7→1, ~20ms stagger per circle)
- **Selection:** Scale pulse on tap (1→1.05), white ring + glow appears
- **No animation library required.** All animations are CSS-only using existing easing variables from the design system.

## What Was Explicitly Rejected

- Varying circle sizes (core larger, family smaller) — user wants uniformity
- Family labels in the UI — backend-only clustering
- Search / custom emotion input — removed
- Emotion definitions on selection — too cluttered
- Fixed-size grid cells with overflow/scroll — user preferred natural flex
- Separate quadrant selection screen — replaced by the accordion grid's L0 state
- Tooltip popups on hover/tap — visual noise
