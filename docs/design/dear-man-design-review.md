# DEAR MAN design review

Critique of the DEAR MAN module (`src/pages/tools/DearMan.tsx`) against the
`frontend-design` skill, written 2026-09-13 on branch `feat/dear-man-ux-v2`.
Intended as the brief for a follow-up design pass. Start that pass with a
token plan (palette, type, layout, principles), review it for genericness,
then build. DEAR MAN is the pilot; the app-wide items roll out to the other
tools afterward.

## The short version

The module is functionally strong and clinically thoughtful, but visually it is
the "SaaS card kit": 23 screens that all look like the same form. Nothing on
screen says "hard conversation." Spend boldness in one place, make the plan
itself the hero, and strip the template chrome everywhere else.

---

## Part A: app-wide findings (shared tokens, every tool)

These live in `src/index.css` and the shared components. Fixing them in DEAR
MAN alone would make it inconsistent with the rest of the app.

### Findings

- **One radius, one border, one shadow on everything.** The module uses 52
  medium-radius boxes, 12 large ones, and 14 pills. A coaching card, a
  selectable option, the final plan, and an error notice all read as the same
  object. Structure should encode meaning: options look tappable, coaching
  looks like a quiet aside, the plan looks like a keepsake.
- **Template chrome.** Tracked-out all-caps eyebrow labels above content
  ("THE SITUATION", "HOW I FEEL"), spaced em dashes in headings, and arrows
  appended to link and button text. All three are named tells in the skill.
- **Color carries no meaning.** The accent green is used for selection,
  primary buttons, links, and disclosure toggles alike. The new color-coded
  feeling groups are the first place hue encodes information; that should be
  the pattern, not the exception.
- **No progress device for sequences.** The content genuinely is a sequence,
  which is the one case where progress or numbering is earned. Today the
  scene phase has four dots and the seven DEAR steps have none.
- **No typographic contrast between the interface's words and the user's.**
  The app is set entirely in DM Sans. The person's own language coming back
  to them (their describe line, their asks, their anchor) looks identical to
  the UI copy.

### Proposals

- **Three object types, not one.**
  1. Tappable options: clear affordance, a selected state that is not just a
     filled accent block.
  2. Coaching and insights: quiet, unboxed text, at most a thin left rule.
  3. The keepsake (a saved plan, a moment plan, a check-in result): its own
     surface tone and type treatment.
  Cut boxes-inside-boxes.
- **One paired typeface, reserved for two uses only:** the user's own words
  when shown back to them, and the keepsake object. Keep DM Sans for
  everything else. The person's language becoming visibly different from the
  interface's is the point of affect labeling.
- **A single continuous progress track** for any multi-step flow, with the
  back affordance built into it. Replace the scene dots.
- **Hue as information.** Define where color means something (feeling
  family, quadrant, selection) and keep the accent for primary action only.
- **Motion in one place per flow.** Nothing animates on entry. One earned
  moment per flow, when the result assembles. Everything else answers a tap.
- **Copy rules.** Buttons say what happens ("Save this plan", "Continue"),
  not where you are going ("Next: How you feel") or how close you are
  ("Almost there", "Last step"). Sentence case. No eyebrow labels unless the
  label adds information the content does not.

---

## Part B: DEAR MAN specific

### Findings

- **No subject-matter identity.** The subject is a person rehearsing
  something scary to say to someone they care about. The vernacular of that
  world (a script, a note card in your pocket, a rehearsal) never appears.
  The one place it could, the "Your Conversation Plan" summary, is styled
  like every other card.
- **Sequence signalled inconsistently.** Four dots for the scene, none for
  the seven DEAR MAN steps, none for the twelve debrief steps.
- **Nested boxes.** The mirror panel sits inside an elevated card inside the
  page; the anchor generator does the same.
- **Copy misses.** "Almost there" followed by "Last step" followed by another
  step breaks its own promise. Several buttons name the destination rather
  than the action.
- **Copy that works and should stay.** The first-person mirror text, the
  barrier coaching, and the reveal line "By the way, you just used DEAR MAN"
  are the best writing in the module. The reveal deserves more room.

### Proposals

- **Make the plan the hero.** Design the summary as a physical object: a
  narrow script set in larger type with generous line height, the anchor
  phrase as the single bold typographic moment on the page, a different
  surface tone from the rest of the app. Everything before it is the
  workshop; this is what they take into the room. "See my plans" should show
  this object, not a collapsed history row.
- **The one motion moment:** the summary assembling from the pieces the user
  chose, once, on arrival.
- **Progress:** one thin track across all nine prep steps; a separate track
  for the debrief chain.
- **Flatten the panels.** Mirror and anchor generator become disclosures in
  the page flow, not cards within cards.
- **Copy pass.** "Next: How you feel" becomes "Continue". Retire "Almost
  there" and "Last step". Keep the mirror text and the reveal as written.

---

## What to leave alone

The information architecture, the free-text-first steps with template chips,
the mirroring panel, the anchor generator, the multi-select asserts, and the
graph-driven content are the right shape. This is a restyle and a copy pass,
not a re-flow.

## Sequencing

1. Land `feat/dear-man-ux-v2`: load `dear-man-content-v2.cypher`, deploy
   functions and hosting, click through prep once, merge.
2. New branch off main. Write the token plan first (Part A), review it
   against this document for genericness, then build DEAR MAN as the pilot.
3. Roll the shared changes out to the check-in flow and the other tools.
