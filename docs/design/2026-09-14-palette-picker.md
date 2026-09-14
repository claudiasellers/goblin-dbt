# Palette picker

**Status:** Implemented 2026-09-14 (all three sequencing steps in one change). Decisions taken: Signal ships with the ink button (kit C2); Clouds keeps Claudia's rust hexes and the dark-theme crisis button uses ink text via the new `--color-on-danger` token. Cloud Functions must be deployed for the setting to persist server-side.
**Decided 2026-09-14 by Claudia:** instead of choosing one palette, the app
offers a few and the user picks. The choice maps onto the entire site,
both themes.

## The five palettes

| Id | Name | Source |
|---|---|---|
| `cool-steel` | Cool Steel (default) | Today's `src/index.css`, unchanged. What the app looks like now. |
| `slate-spruce` | Slate & Spruce | `branding-kit.md` section A |
| `signal` | Signal | `branding-kit.md` section C or C2, see open question 1 |
| `giverny` | Giverny | `branding-kit.md` section E |
| `clouds` | Water Lilies in the Clouds | Reference strip G1 with Claudia's edits, tokens below |

Cool Steel is the default for existing users and for anyone signed out, so
shipping this changes nothing until a person opts in.

### Water Lilies in the Clouds, as edited

| Token | Light | Dark |
|---|---|---|
| Page | `#EEF3F5` | `#1B2229` |
| Paper | `#F8FAFC` | `#292F36` |
| Ink | `#232D37` | `#F3F7F8` |
| Secondary text | `#4E5A66` | `#B7C0C8` |
| Action (navy) | `#303C4A` | `#68717B` |
| Danger (rust) | `#C0613A` | `#D08B6F` |
| HU pink | `#EFB3B2` (text `#8A3F3E`) | `#EFB3B2` |
| HP peach | `#F7D3BA` (text `#7A4A22`) | `#F7D3BA` |
| LU steel blue | `#4F6D9A` (text `#33507A`) | `#4F6D9A` (text `#9AB0D8`) |
| LP mint | `#AFD6C4` (text `#2A6650`) | `#AFD6C4` |

Contrast flags on the edits, computed: white on the rust danger is 4.2:1
in light (AA needs 4.5) and 2.8:1 in dark. The crisis "Call 988" button is
the one place danger is a fill with white text. Options: darken light rust
to about `#B25A35`, or give the dark crisis button ink text on rust. Steel
blue as text in dark theme needs `#9AB0D8`; as a fill it is fine.

## How it works

### One attribute, two layers of tokens

Today the theme is `data-theme="light|dark|system"` on `<html>`, set by
`UserProfileContext`, and every token is written out three times in
`index.css`: light on `:root`, dark on `:root[data-theme="dark"]`, and
dark again inside a `prefers-color-scheme` block for `system`. That is 328
token lines for one palette. Five palettes that way would be 1,600 lines
and a maintenance trap.

The plan is a second attribute and a split:

- `data-palette="cool-steel|slate-spruce|signal|giverny|clouds"` on
  `<html>`, next to `data-theme`.
- **Palette layer.** Each palette is one CSS block that defines raw values
  for both themes as paired custom properties: `--pal-page-light`,
  `--pal-page-dark`, `--pal-ink-light`, `--pal-ink-dark`, and so on. About
  26 pairs per palette. Nothing in the app reads these directly.
- **Theme layer.** The existing three theme blocks stop holding hex values
  and instead resolve each `--color-*` token to the light or dark member
  of the pair: `--color-bg-primary: var(--pal-page-light)` in `:root`,
  `var(--pal-page-dark)` in the dark blocks. Written once, works for every
  palette.
- **Derived layer.** Tokens that are today hand-typed tints (the 28
  quadrant `-bg`, `-border`, `-shadow` variants, the 15 category-card
  tints, accent-muted and accent-subtle, the glass panels) become
  `color-mix()` of a base token. `--color-q-hu-bg` becomes
  `color-mix(in srgb, var(--color-q-hu-fill) 6%, transparent)`. Written
  once, correct for every palette.

Adding a sixth palette later is one block of 26 pairs. Every component
keeps using `--color-*` exactly as it does now; nothing in `src/` outside
`index.css` changes for the switch itself.

### Base tokens each palette defines

Page, page-secondary, card, card-hover, elevated, input; border,
border-subtle, border-accent; text primary, secondary, tertiary, muted;
accent, accent-hover, on-accent; success, warning, danger, info; the four
quadrant fills and their four text colors; sidebar background; picker
field background and foreground. Optional: the five feeling-group tag
colors (default to a derivation from the quadrant fills if a palette
leaves them out) and a hairline color (Giverny's mauve; defaults to a mix
of ink and page).

### Persistence

`UserProfile` gets a `palette` field with the five ids and the default
`cool-steel`. Three touch points:

- `functions/src/index.ts`: add `palette` to `DEFAULT_PROFILE` and to the
  `updateUserProfile` allowlist (today `displayName`, `photoURL`,
  `theme`). Stored as a property on the `User` node like `theme` is.
- `src/services/neo4j.ts`: the `UserProfile` type and default.
- `UserProfileContext`: apply `document.documentElement.dataset.palette`
  the same way `theme` is applied, including the cache-seeded early apply.

Signed-out visitors keep the default; the setting lives with the account.
To avoid a flash of Cool Steel before the profile loads, a three-line
inline script in `index.html` reads the cached profile from localStorage
and stamps both attributes before React mounts. Today's theme has the same
flash and gets fixed by the same script.

### Settings UI

In Profile, Appearance, under Theme: a "Color palette" control with five
options. Each option is a small card: the palette name and a five-dot
swatch (page, ink, action, high-unpleasant, low-pleasant) drawn from that
palette's own light values, so the picker previews every palette without
switching. Selected state per the design plan: ink outline and medium
text, not a filled accent. Choosing applies instantly and saves through
`updateProfile`, same as Theme.

### Colors that would escape the switch

A palette picker only works if nothing bypasses the tokens. Three files
do:

| File | What | Fix |
|---|---|---|
| `src/pages/tools/DearMan.tsx` | 12 Tailwind `amber-*` classes on the debrief "still activated" notice | `--color-warning` tint tokens |
| `src/pages/History.tsx` | 10 Tailwind `blue-*` / `purple-*` classes on Prep and Debrief pills | quadrant or tag tokens |
| `src/components/activities/GuidedActivity.tsx` | one `bg-blue-400` on the count-down visual | `--color-info` |

These are the same items the app design plan already lists.

### Verification

A small script, `scripts/check-palettes.mjs`, reads the palette blocks
from `index.css` and prints WCAG ratios for every palette in both themes:
ink on page, white on action, white on danger, each quadrant text on its
tint, secondary on page. It fails the build if anything drops under 4.5.
Then a manual pass: each palette in light and dark on the check-in, the
result screen, one tool step, the DEAR MAN summary, and Reflect.

## Open questions

1. **Signal: which button?** Section C has the violet action Claudia said
   she does not like; C2 is the same palette with an ink button that
   inverts to paper in dark theme. Recommendation: C2, because a
   user-selectable purple button is still a purple button. Say which.
2. **Clouds danger contrast.** Keep `#C0613A` / `#D08B6F` and give the
   dark crisis button ink text, or darken. Recommendation: keep the hexes,
   ink text in dark.
3. **Does the picker field ground follow the palette?** Giverny and Signal
   define their own dark field; Cool Steel and Slate keep navy. Assumed
   yes: each palette names its field ground.

## Sequencing

1. **Token refactor, no visual change.** Split `index.css` into palette,
   theme, and derived layers with Cool Steel as the only palette. Add the
   contrast script. Ship; the app should look identical.
2. **Four more palettes plus the picker.** Palette blocks for Slate &
   Spruce, Signal, Giverny, Clouds; the `palette` profile field end to
   end; the Appearance control; the pre-paint script.
3. **Escaping colors.** The three files above move to tokens.

Step 1 also does most of the work the app design plan needs for the
DEAR MAN pilot, so the two efforts share a foundation rather than
colliding.
