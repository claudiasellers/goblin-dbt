# Goblin app design pass: findings and token plan

Written 2026-09-13 on branch `design/dear-man-token-pass`. Companion to
`dear-man-design-review.md` (the DEAR MAN brief) and
`dear-man-token-plan.md` (the DEAR MAN pilot). This document is the
app-wide layer those two assumed: what the frontend-design skill says about
every surface, and the shared token system the pilot and every later
surface build on. Nothing in `src/` changes until this is approved.

Reviewed against the deployed site at goblindbt.web.app, signed in, in
light and dark theme, desktop width: check-in home, quadrant and emotion
selection, body map, sensation details, the result screen, the Tools
directory, all seven tool pages, the DEAR MAN prep flow end to end, Reflect
(Insights, History, DEAR MAN tabs), Profile, and Login. Phone width was
not captured (the window would not resize under automation), so mobile
findings come from the code, not screenshots.

## The short version

The bones are right and the writing is often excellent. The visual layer
is one component repeated everywhere: a rounded box with a hairline
border, in a system that says color is earned but then spends its only
accent on selection, navigation, tabs, links, and buttons alike. Nothing
tells you which screen you are on by shape. The app's one real idea for a
visual identity, the person's own language becoming visibly theirs, has
not been given a form yet, except in the picker spec that is in flight.

Three moves fix most of it:

1. **Make meaning out of shape and color.** Options are rounded and
   tappable. Coaching is plain text. Keepsakes are square paper. Accent
   means one thing: this moves you forward.
2. **Give the person's language a typeface.** The serif marks words about
   this person: the words they choose or type, and the app's reading of
   their state. The sans is the tool talking. That is affect labeling made
   visible, and it is the through-line from picker to plan to Reflect.
3. **Strip the template chrome.** Tracked caps eyebrows, arrows on links,
   spaced em dashes, middle-dot meta strings, fade-in on every step, glass
   panels, emoji as iconography. All present, all removable.

## Part 1: Findings by surface

### The shell (`DashboardLayout`, `Sidebar`, header, footer, side panel)

- The header leads with a tracked all-caps date eyebrow above the greeting.
  The date is low-value on a check-in app and the treatment is the most
  common tell the skill names.
- The header and the History cards use "glass" tokens (backdrop blur,
  translucent panels). Eighteen uses. In a system described as cool,
  quiet, and almost monochromatic, blur is decoration.
- The side panel shows "Check in now" on the check-in page itself. It is
  the right panel on Reflect and Profile and redundant on the index route.
- Sidebar active state uses the accent. Under the rule that accent means
  action, navigation state should be ink weight plus the existing bar.
- A footer with two taglines on an app shell reads as website chrome.
  Keep the line "Simple tools for when things feel too big" for the signed-
  out landing and remove the footer from the signed-in shell.
- Two back affordances on exercise pages: "Goblin" in the compact header
  and "All tools" under it.

### Check-in

The emotion picker is being replaced by the How We Feel field (spec dated
2026-09-13) and is not re-reviewed here. The rest of the flow:

- Every step fades and slides in (`step-enter` on the wrapper, plus
  `animate-fade-in` inside components). This is the default entrance the
  skill calls out.
- The two-segment "Start here" progress bar is centered with its label
  under it. It is the fifth progress device in the app (the others: scene
  dots in DEAR MAN, `ExerciseProgress` dots, `GuidedActivity` pills, Pause's
  letter tabs).
- The body map silhouette is filled with the low-pleasant quadrant green.
  It is the largest color field in the app and the hue means nothing
  there. It also reads as "calm" to a user who arrived at 8 out of 10.
- Body map, sensation details, and the result are all center-aligned while
  the rest of the app is left-aligned.
- The result screen has the app's best headline copy ("Your brain's alarm
  system is activated right now") set at 20px bold, the same size as the
  DEAR MAN step questions. It deserves the display slot.
- **Bug:** the recommended-tool cards on the result screen render the
  literal text `→` instead of an arrow. `StateResult.tsx:320` and
  `LowEnergyStateResult.tsx:277` put the escape inside JSX text, where it
  is not interpreted. Under this plan the arrow goes away; either way it
  should not ship as-is.
- The evidence grade ("medium") sits under the tool title in 12px lowercase
  italic with no label. It reads as a stray word.

### Tools directory

- The seven intents and the seven tools are the same seven things listed
  twice with different labels. The March revamp chose intent phrasing as
  the entry layer, which is right; the fix is one list where the intent is
  the title and the tool name is the subtitle, grouped by module, so the
  page is seven rows instead of fourteen cards.
- Two tracked-caps eyebrows, centered title, and full-color emoji as the
  leading visual on every card. The emoji are the loudest objects on a
  page whose design system says it is quiet at rest.

### Tool page shell (`ToolPage`) and the short tools

- The header block (emoji, title, tagline, "When to use this" box) takes
  the top 200px on every step of every tool. On a 685px-tall viewport,
  step content starts below the fold. After the first interaction the
  header should collapse to a single title line.
- Pause runs three progress devices at once: "Step 1 of 4: Stop", four
  dots, and S T O P letter tabs. One would do, and the letters spoil the
  STOP acronym reveal the same way D E A R would in DEAR MAN.
- Buttons that name destinations rather than actions: "Next: Take a
  breath", "I've noticed them, continue". Emoji inside a button ("Start
  surfing 🏄").
- Bold single words inside body copy in Do the Opposite ("action urge",
  "urge") and the "How this works" box before every tool: the accenting-
  one-phrase tell, and the box is the card kit again.
- Cool Down's timer is a 48px accent number; Urge Surfing's intensity is a
  24px accent number. Accent-as-display is a third meaning for the one
  color.
- Problem Solve has 21 large rounded boxes and Do the Opposite 11. Same
  shape as DEAR MAN's problem, same fix.
- `GuidedActivity`'s pacing visuals (breathing circle, ripple, countdown)
  are motion that shows what to do and should stay. Its per-step fade-in
  should not.

### Reflect

- Tabs are a segmented control where the active tab is a filled accent
  block. Same accent-means-selection problem, now on navigation.
- The formulation card is the best content in Reflect and the most
  templated container: 16px radius, drop shadow, an emoji in a tinted
  square, a caps eyebrow, then a grey box inside it with another caps
  eyebrow. The headline ("Your alarm system is working overtime") should
  be the page's display moment, unboxed.
- For a light user, three of five insight slots are dashed-border
  placeholder cards at 70% opacity with an emoji each, staggered fade-in.
  Five grey boxes saying "not yet" is not an invitation to act. One line
  per missing insight, with the action, under the insights that exist.
- History shows six charts for two check-ins. A mood-over-time line with
  two points and a quadrant distribution of 50 / 0 / 50 / 0 with 30px
  numbers is the "big number, small label" default applied to no data.
  Charts should appear as data earns them: feed first, calendar at 3+
  days, distribution at 5+ check-ins, trend at 7+.
- The feed's date headers are 10px tracked caps. The DEAR MAN session rows
  use Tailwind's raw blue and purple palettes for the Prep and Debrief
  pills, the only off-token colors in the app, and join meta with a middle
  dot.

### Profile and Login

Both are quiet and mostly fine. Profile's accordion cards are the card kit
but the content is settings, where a bordered group is honest structure.
Login has an arrow on "Continue without an account". The signed-out
check-in landing (leaf, "What would help right now?") is a good first
screen and should keep its centered treatment as the one centered page.

### Counts across `src/` (for the before/after)

| Tell | Count | Where it concentrates |
|---|---|---|
| Spaced em dashes in UI text | 86 | DEAR MAN, Problem Solve, check-in copy |
| Tracked caps eyebrows | 13 files | DEAR MAN, insights cards, Tools, header |
| Arrows in text or links | 11 files | result cards, ToolPage, Login, Signup |
| Large rounded boxes (12px+) | 95 | Problem Solve 21, DEAR MAN 12, Opposite Action 11 |
| Glass tokens | 18 uses | header, History charts and feed |
| Entrance animations | 16 uses | check-in wrapper, insights, guided activity |
| Center-aligned blocks | 100+ | check-in, results, tools directory |

## Part 2: App-wide token plan

### Color

The values below are the current Cool Steel palette, used here as the
placeholder until a palette is chosen from `branding-kit.md`. The rules are
what matter and they hold for any palette: what each color is permitted to
mean.

| Role | Light | Dark | Rule |
|---|---|---|---|
| Page | `#F6F7FA` | `#0C0D12` | Everything sits on this. Containers are the exception, not the default. |
| Paper | `#FFFFFF` | `#16171F` | Keepsakes only: a saved plan, a moment plan, the check-in state card. |
| Ink | `#1A1D27` | existing | Headings, the person's words, selected-state outline, active nav. |
| Voice | `#5A5F72` | existing | The tool talking: coaching, labels, helper text. |
| Action | `#127A5E` | existing | Primary button. One per screen. Nothing else. |
| Quadrant and feeling hues | existing fills | existing | Hue means emotional position or feeling family. Charts inherit these. |
| Danger | `#C45454` | existing | Crisis resources only. |

Rules:

- **Accent means "this moves you forward."** Not selection, not tabs, not
  nav, not links, not display numbers, not disclosure toggles.
- **Selection is weight, not color.** Ink outline (1.5px), medium text,
  check glyph. Feeling and quadrant chips keep their hue at full strength
  when selected, tinted when not.
- **Navigation state is ink.** Sidebar and tabs: ink text, medium weight,
  the existing 2px bar in ink.
- **Retire the glass tokens.** Header becomes an opaque page-colored bar
  with a hairline. History panels become unframed sections.

### Type

Two families, one job each.

- **DM Sans** is the tool's voice: questions, instructions, buttons,
  labels, coaching. Scale on a 1.25 ratio from 16px: 13 / 16 / 20 / 25.
  Step questions 20/1.3 semibold. Body 16/1.5. Helper 13/1.45. Page
  titles 25/1.2 semibold. Nothing in the sans above 25px.
- **Fraunces** (already chosen for the picker) is the person's voice: words
  about this person. The vocabulary in the picker field and the word on
  its card. The person's own text shown back to them. The anchor phrase.
  The state headline on the result screen and the formulation headline in
  Reflect, because those are the app reading this person, not instructing
  them. Exposed as `--font-voice`; the picker's `--font-picker-word`
  aliases to it.
- **One display moment per screen**, always in the serif: the picker field
  on check-in, the state headline on the result (28px), the keepsake's
  headline at the end of a tool (28px), the formulation headline on
  Reflect (25px).
- Measure under 70 characters for sans body, under 60 for serif body.
  Step columns narrow from 42rem to 36rem.
- Retired: tracked caps. Labels are sentence case, 13px, voice color.

### Structure

Shape encodes what a thing is.

| Object | Radius | Surface | Border | Shadow |
|---|---|---|---|---|
| Chip (one or two words) | pill | none, or family tint | 1px; ink 1.5px selected | none |
| Option (a sentence) | 8px | none | 1px; ink 1.5px selected | none |
| Control (input, button) | 8px | input bg / accent | 1px / none | none |
| Coaching, insight, helper | none | none | none | none |
| Settings group (Profile) | 8px | card | 1px | none |
| Keepsake | 0 | paper | none | `--shadow-lg`, the only shadow |
| Charts and feeds | none | none | none | none |

- Boxes inside boxes go to zero everywhere.
- "How this works" intro boxes become two sentences of plain text under
  the tool title.
- The tool header collapses to one line after the first interaction; the
  "When to use this" text merges into the intro state.

### Progress

One `StepTrack` component replaces the five current devices: a thin
segmented bar, filled segments in tertiary text color, Back at the left
end of the same row, screen-reader text "Step n of m". Segments are
unlabeled by default so acronym reveals (STOP, DEAR MAN) survive. The
picker step shows no track; the field is the whole screen.

### Motion

- Nothing animates on entry. Remove `step-enter`, `animate-fade-in`, and
  the insights stagger.
- One earned moment per flow: the picker's staggered field entrance (in
  the spec), the result screen's state headline settling in, the keepsake
  assembling line by line at the end of a tool. CSS keyframes; `motion` is
  only loaded by the picker.
- Keep `GuidedActivity`'s pacing visuals. They show what to do.
- Everything else answers a tap.

### Layout

Left-aligned to one edge, including progress and helper text. Two
exceptions keep their centered treatment: the signed-out landing and the
bailout micro-step, which are one-sentence screens where centering is the
point. Primary buttons stay full width at the bottom of the column.

### Copy

- Buttons say what happens: "Continue", "Save this plan", "Add sensation",
  "I did it". Never "Next: [destination]" or "Almost there".
- No arrows in text. No middle dots in meta strings (use commas). Spaced
  em dashes in headings and body become commas, periods, or colons.
- No eyebrow unless the label adds information the content does not.
- Empty states name the action, in one line, not a card.
- Keep as written: the state headlines, the formulation copy, the mirror
  text, the barrier coaching, "That feels like too much right now",
  "That's okay. Let's go smaller.", the DEAR MAN reveal.

### Iconography: a decision for you

The app's iconography is full-color emoji everywhere except four line
icons in the sidebar. Emoji render differently per platform, cannot be
tinted to the system, and are the strongest "assembled from parts" signal
in the screenshots. Two honest options:

1. **Line icons, monochrome.** Extend the sidebar's inline SVG set to
   cover the seven tools and the activation patterns. Ink or voice color.
   Recommended: it matches "quiet at rest" and the icons become part of
   the identity.
2. **Commit to emoji.** Keep them, but one per screen, never as the
   leading visual on a list of seven, never inside buttons.

The plan below assumes option 1 but nothing else depends on it.

## Part 3: Genericness review

Checked against the five defaults the skill names and against what a
generic "restyle this wellness app" would produce.

- Warm cream and terracotta: no. Cool Steel stays; the palette
  conversation stays deferred.
- Dark with one acid accent: no.
- Broadsheet hairlines and zero radius: partially, and on purpose. The
  keepsake is square because radius encodes "tappable" and the keepsake is
  the one object you read rather than tap. No hairline columns, no dense
  grids.
- SaaS card kit: this is what the pass removes. About 95 large rounded
  boxes go to a handful of keepsakes and Profile's settings groups.
- Template chrome: every listed tell is present and comes out.

Two things a generic pass would also propose, kept because the reason is
specific:

- **Serif for the human, sans for the tool.** Common pairing; specific
  rule. The serif never appears in an instruction, a button, or a page
  title. It appears only when the words are about this person. That is
  the app's thesis (build better language for the experience), not a
  style.
- **A progress track.** Specific in that segments are unlabeled to protect
  the acronym reveals, and one component replaces five.

Changed during this review:

- A first draft kept the History charts and restyled them. Cut to
  data-gated charts instead: two check-ins should show a feed, not six
  panels.
- A first draft proposed a "compact card" for the Tools directory. Cut the
  card entirely: seven rows with intent as title and tool as subtitle.
- The DEAR MAN plan said the serif marks only the user's own words. This
  document widens it to include the app's reading of the person (state
  headline, formulation headline). Same idea, and it gives the result
  screen and Reflect a display moment they otherwise lack.

## Part 4: What stays

Information architecture, all flows, the graph-driven content, the
check-in picker spec, the free-text-first steps, the bailout micro-steps,
the crisis path, the sidebar structure, the guided-activity pacing visuals,
and nearly all of the writing.

## Part 5: Decisions

Answered 2026-09-13:

1. Iconography: monochrome line icons. Draft prompts in `icon-prompts.md`.
3. Tools directory as seven rows: yes.

Still open:

2. Data-gated charts in History. Meaning: today the History tab shows all
   six charts no matter how much data exists, so two check-ins produce a
   two-point line and a 50 / 0 / 50 / 0 grid. The proposal is that each
   chart appears only once there is enough data for it to say something:
   the feed always, the calendar after 3 days with check-ins, quadrant
   distribution after 5 check-ins, the trend line after 7. Until then, one
   line under the feed says what will appear and when.
4. Header date eyebrow. Meaning: the small tracked all-caps line "SUNDAY,
   SEPTEMBER 13" above "Good evening, claudia" in the app header. Proposal
   is to remove it; the greeting already carries the time of day.
5. Palette: no longer deferred. Three proposals are being researched in
   `branding-kit.md`; the token rules above are palette-independent and
   apply to whichever is chosen.

## Part 6: Sequencing

1. **Foundation** (`index.html`, `index.css`, four shared components):
   Fraunces; `--font-voice`, keepsake, track, and selection tokens;
   `StepTrack`, `OptionButton`, `Coaching`, `KeepsakeCard`. Retire glass
   tokens and entrance keyframes. Fix the `→` bug while there.
2. **DEAR MAN pilot**, per `dear-man-token-plan.md`.
3. **Tool shell and short tools**: collapsing header, intro text instead
   of box, one progress device, copy pass on Pause, 5-4-3-2-1, Cool Down,
   Urge Surfing.
4. **Check-in result and body steps**: state headline as display moment,
   left alignment, silhouette in a neutral tint, unframed tool
   recommendations. Picker lands from its own branch.
5. **Reflect**: unboxed formulation, one-line empty states, ink tabs,
   data-gated charts, feed restyle, DEAR MAN tab shows the keepsake.
6. **Tools directory and iconography**, once decision 1 is made.
7. **Opposite Action and Problem Solve**: apply the shared pieces; these
   are class-level rewrites with no flow changes.
8. Profile and Login: remove the arrow, nothing else.

Each step is a separate PR off this branch or its successor. Nothing here
changes a Cloud Function except moving the DEAR MAN body-reminder string
into the graph.
