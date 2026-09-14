# DEAR MAN design pass: token plan

Written 2026-09-13 on branch `design/dear-man-token-pass`, off `main` at
`1cc3c52`. This is step 2 of the sequencing in
`dear-man-design-review.md`: the token plan, reviewed for genericness,
before any code. Nothing in `src/` changes until this is approved.

The plan was written against the deployed site (goblindbt.web.app), clicked
through from entry to the saved-plan summary, and against `DearMan.tsx`,
`index.css`, `ToolPage.tsx`, `History.tsx`, and the shared tool components.

## What the frontend-design skill says about DEAR MAN today

The review's diagnosis holds up on screen. Four things the screenshots add:

1. **The tool header eats the viewport.** On every one of the 23 steps, the
   emoji, title, tagline, and "When to use this" box take the top 200px. On a
   short viewport the question is below the fold. This is `ToolPage.tsx`,
   so it is app-wide, but DEAR MAN feels it most because it has the most
   steps.
2. **Selection and primary action are the same color and shape.** A chosen
   chip is a filled teal pill; the Continue button is a filled teal bar. On
   the barriers step, three filled teal objects sit within 100px of each
   other and only one of them moves you forward.
3. **The summary is the least designed screen in the module.** It is the
   same grey box as the coaching cards, with eight tracked-caps labels, two
   hairlines, and the anchor phrase set in the same italic as the step
   insights. It is the only screen the user will come back to, and it looks
   like a form receipt.
4. **A clinical string lives in the frontend.** "Shoulders back, steady
   voice, feet on the ground." is hard-coded in the summary. It duplicates
   `content.confidentCoaching` from the graph and breaks the data-layer
   rule. Move it into the graph as part of this pass.

Everything the review says to keep still stands: the information
architecture, free-text-first steps, the mirror, the anchor generator,
multi-select asserts, and the graph-driven content.

## Subject

A person rehearsing something hard to say to someone they care about. The
audience is someone who may have alexithymia or be in a moment of high
arousal, so the interface's job is to get out of the way and let their own
words be the loudest thing on screen. The design's primary job: every step
is a workshop, and the plan at the end is the one physical object they take
into the room. The vernacular is a cue card, not a dashboard.

## Token plan

### Color

No new palette. The picker spec deferred the palette to a broader UI
conversation, and this pass respects that. Every color below already exists
in `index.css`; what changes is what each one is allowed to mean.

| Role | Light | Dark | Rule |
|---|---|---|---|
| Page | `#F6F7FA` bg-primary | `#0C0D12` | Steps sit directly on this. No boxes. |
| Paper (keepsake only) | `#FFFFFF` bg-card | `#16171F` | The only filled surface in the module. |
| Ink | `#1A1D27` text-primary | existing | Headings, the user's words, selected-state outline. |
| Voice (secondary) | `#5A5F72` text-secondary | existing | Interface copy, coaching, labels. |
| Action | `#127A5E` accent-fill | existing | Primary button only. Never selection, never links, never toggles. |
| Feeling families | existing tag and quadrant fills | existing | Hue means feeling family. Kept from v2. |

Two rules replace a dozen one-off decisions:

- **Accent means "this moves you forward."** One accent object per screen.
  Disclosure toggles, links, and "+ Something else" become ink or voice.
- **Selection is weight, not color.** A selected option gets an ink outline
  (1.5px), medium-weight text, and a check glyph. Feeling chips keep their
  family hue at full strength when selected, tinted when not, as today.

### Type

Two families, each with one job.

- **DM Sans** stays for everything the interface says. Scale on a 1.25
  ratio from a 16px base: 13 / 16 / 20 / 25. Question headings move from
  18px to 20px semibold, line-height 1.3. Body 16/1.5. Helper 13/1.45.
- **Fraunces** (variable serif, already chosen for the picker's bubble words)
  appears only when the words are the user's own or when the object is a
  keepsake. It is exposed as `--font-voice`; the picker's
  `--font-picker-word` aliases to it when that branch merges. Uses in DEAR
  MAN: the text the user typed or chose, shown back to them in the
  summary; the anchor phrase; the moment plan in the debrief; the
  reflection paragraph the graph writes about their conversation.
- **The one display moment:** the anchor phrase, Fraunces 600 at 28px,
  line-height 1.25, optical size auto. Nothing else in the module goes
  above 25px.
- Measure: interface copy under 70 characters (the current 42rem column at
  16px is about 75, so the step column narrows to 36rem). The keepsake
  narrows further to 32rem, serif body at 18/1.6, which lands around 60
  characters.
- Retired: tracked all-caps labels (eight on the summary, plus the feeling
  group names and "Sound familiar?"). Labels become sentence case at 13px
  in the voice color. The feeling group names keep their colored dot.

### Structure

Three object types, and shape encodes which one you are looking at.

| Object | Shape | Surface | Border | Shadow |
|---|---|---|---|---|
| Option (tappable) | Rounded: pill for one or two words, 8px radius for a sentence | none | 1px border, ink 1.5px when selected | none |
| Coaching, insight, helper | none | none | none | none |
| Keepsake | Square corners, the only square object in the app | paper | none | `--shadow-lg`, the only shadow in the module |

- Coaching becomes plain text: title in medium weight, body in voice color,
  separated from neighbors by space alone. The review allowed a thin left
  rule; the plan drops it, because a rule is one more piece of chrome and
  the two coaching passages on the mindful step separate fine on whitespace.
- The mirror panel and the anchor generator stop being boxes inside the
  page. They become inline disclosures: a text toggle in ink, and when open,
  their content flows in the page column at the same left edge.
- Nested boxes go to zero. Today the deepest nesting on the mindful step is
  page, elevated card, inner chip row.

### Progress

The prep flow is a real sequence, so it earns a track. One thin bar under
the tool header, segmented 4 / 4 / 3 with a small gap between groups:
about the conversation (who, kind, priorities, barriers), your script
(describe, express, assert, reinforce), getting ready (mindful, confident,
negotiate). Segments are unlabeled on purpose: naming the middle four D, E,
A, R would spoil the "you just used DEAR MAN" reveal, which is the best line
in the module. The Back control sits at the left end of the same row, so
the track and the way back are one device. Filled segments use the tertiary
text color, not the accent. A screen-reader line reads "Step 6 of 11."

The debrief gets its own track, 12 segments, same component.

### Motion

One moment per flow. When the summary arrives, the card's lines appear in
the order the user wrote them, 60ms apart, about 600ms total, anchor last.
That is the plan assembling from the pieces they chose. Nothing else
animates on entry, and the existing tap and hover transitions stay. Under
`prefers-reduced-motion` the card appears whole. This needs no library; it
is CSS keyframes with a per-line delay, so `motion` (on the picker branch,
not on main) is not a dependency here.

### Layout

Everything left-aligned to one edge, including the track and helper text
that is centered today. Primary button stays full width at the bottom of
the column for thumb reach.

Step screen:

```
Goblin                                    (compact app header)

← Back  ▮▮▮▯ ▯▯▯▯ ▯▯▯                      (track, one row)

What happened?                             (20px semibold)

┌──────────────────────────────────────┐
│ Type or answer… just the facts.      │   (input, the one bordered
│                                      │    object that isn't an option)
└──────────────────────────────────────┘

Or start with a template:                  (13px voice)

( I need help with something and haven't asked yet      )
( Something about how we do things isn't working for me )
( I need time, space, or flexibility for something      )

Specific asks are easier to say yes to.    (insight, plain italic)

[            Continue                  ]   (the only accent object)
```

Summary screen:

```
← Back  ▮▮▮▮ ▮▮▮▮ ▮▮▮

┌────────────────────────────────────┐     square corners, paper,
│                                    │     shadow-lg, 32rem measure
│  Asking isn't a burden.            │     ← anchor, Fraunces 600 28px
│  Guessing is.                      │
│                                    │
│  For your partner                  │     13px voice
│                                    │
│  The situation                     │     13px voice labels,
│  Something about how we do things  │     sentence case
│  isn't working for me.             │     ← user's words, Fraunces 18/1.6
│                                    │
│  How I feel                        │
│  Unheard, frustrated.              │
│                                    │
│  What I'm asking for               │
│  I need you to just listen and     │
│  support me right now.             │
│  I'd like help with the dishes on  │
│  weeknights.                       │
│                                    │
│  Why it matters                    │
│  We'd fight less about this.       │
│                                    │
│  If they push back                 │
│  I could live with: they do part   │
│  of it, not everything.            │
│  I won't compromise on: being told │
│  my feelings don't matter.         │
│                                    │
│  Shoulders back, steady voice,     │     body reminder from the graph,
│  feet on the ground.               │     voice color, no label
└────────────────────────────────────┘

[         Save this plan             ]     Start over  (text, voice)

By the way, you just used DEAR MAN.        ← open paragraph, no
Describe, Express, Assert, Reinforce…         disclosure, body size

After the conversation, come back and      (text link in ink)
tell me how it went.
```

"See my plans" in History shows this same card, collapsed to the anchor
line and "For your partner, Sat Sep 13", expanding to the full card. The
prep session card in `History.tsx` and the summary in `DearMan.tsx` become
one shared component.

### Copy

- Buttons say what happens. "Next: How you feel", "Next: What you need",
  "Next: Why it matters", "Next: Getting ready", "Almost there", "Last
  step" all become "Continue". "Let's build your script", "See your plan",
  "Save this plan", "Start over", "Prepare for it", "I tried it" stay; they
  already name the action.
- No arrows in text. "See my plans →" and "After the conversation → How did
  it go?" lose the glyph; the second becomes "After the conversation, come
  back and tell me how it went."
- Spaced em dashes come out of headings: "What are you asking for, or
  saying no to?" / "If they say no or push back" / "If this goes well,
  what's in it for them, or for the two of you?" / "What was underneath
  that?" / "Before we look back, how are you feeling right now?"
- Kept as written: the first-person mirror text, the barrier coaching, and
  "By the way, you just used DEAR MAN." The reveal loses its `+` disclosure
  and gets an open paragraph under the card.
- "Or, start with a template / select options:" becomes "Or start with a
  template:" on every step that has one.

## Genericness review

Checked against the five defaults the skill names, and against what a
generic "restyle this DBT tool" prompt would produce.

- Warm cream plus terracotta: no. The app stays in Cool Steel, and the
  palette conversation stays deferred.
- Dark plus one acid accent: no.
- Broadsheet hairlines and zero radius: partially. The keepsake has square
  corners. This is the one place it is a choice rather than a default:
  radius encodes "tappable," so the one object you read rather than tap is
  the one flat object. No hairline columns, no dense grid. Watch this
  during build; if the card starts to read as newsprint, the fix is more
  air, not more rules.
- SaaS card kit: this is what the pass removes. Filled boxes go from 21 to
  one; bordered rounded rectangles that are not options go to zero.
- Template chrome: all five tells are present today (caps eyebrows,
  middle dots in "fits what you said," spaced em dashes, arrows on links)
  and all come out.

Two things a generic pass would also propose, and why they are still here:

- **Serif for the human voice, sans for the interface.** Common pairing.
  What makes it specific is the rule, not the fonts: Fraunces appears only
  when the words are the user's own. The interface never borrows it, not
  for headings, not for the tool title. That is affect labeling made
  visible, and it is already the picker's decision.
- **A progress bar.** The specific part is 4 / 4 / 3 with unlabeled
  segments, chosen to protect the reveal.

Two things changed from a first draft of this plan:

- Coaching had a thin left rule. Removed. It was the one piece of chrome the
  plan added rather than took away, and whitespace does the job.
- The anchor sat at the bottom of the card, mirroring the flow order. Moved
  to the top as the card's headline. In a hallway before the conversation,
  the anchor is the line you need in one glance; the script is what you
  read after.

## What this pass does not touch

The check-in flow, the other tools, `ToolPage.tsx`'s header, and the
palette. The shared pieces built here (track, option styles, coaching
style, keepsake) are built as shared components so the rest of the app can
adopt them without a second design pass. The app-wide findings and the
shared token rules live in `app-design-plan.md`; this document is that
plan's pilot. One rule there is wider than here: the serif also marks the
app's reading of the person (the result headline, the Reflect formulation),
not only the person's own words.

## Implementation outline (for approval, not started)

1. `index.html`: add Fraunces. The picker branch adds the same line; the
   merge is trivial.
2. `src/index.css`: `--font-voice`, `--color-keepsake-bg`,
   `--shadow-keepsake`, `--color-track` and `--color-track-fill`, plus
   `.option`, `.option[aria-pressed="true"]`, `.keepsake`, `.track`, and an
   `assemble` keyframe. All values resolve to existing tokens.
3. New in `src/components/tools/`: `StepTrack.tsx`, `OptionButton.tsx`,
   `Coaching.tsx`, `ConversationPlanCard.tsx`.
4. `src/pages/tools/DearMan.tsx`: swap classes to the shared pieces, flatten
   the mirror and anchor generator, replace `SceneDots` with the track,
   replace the summary with `ConversationPlanCard`, copy pass.
5. `src/pages/History.tsx`: prep sessions render `ConversationPlanCard`.
6. Graph: move the body reminder string into the DEAR MAN content Cypher as
   a property on the confident-step content, and read it through
   `getDearManContent`.
7. Click through prep and debrief on the dev server in both themes, at
   400px and desktop, with reduced motion on and off.

Estimated diff: one new Cypher property, four new small components, and a
mostly class-level rewrite of `DearMan.tsx` with no changes to its state or
phase logic.
