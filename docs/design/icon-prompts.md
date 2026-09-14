# Icon prompts

Prompts for an AI image generator to draft Goblin's monochrome line icon
set. Decision taken 2026-09-13: line icons replace emoji as the app's
iconography. These images are drafts for direction; the shipped icons will
be redrawn as inline SVG on a 24px grid to match the four sidebar icons
that already exist in `src/components/Sidebar.tsx`.

## How to use these

- Run every prompt with the same style block appended, so the set reads as
  one hand. Generate 4 candidates per icon and keep the simplest.
- Ask for a square image, white background. Ignore any shading or gradient
  the generator adds; the SVG redraw will flatten it.
- The metaphors avoid the obvious clip-art choice for each concept where
  the obvious choice is either a cliché (a brain, a heart, a lotus) or
  wrong for the audience (a thermometer for arousal, a lightning bolt
  for panic).

### Style block (append to every prompt)

> Single-weight line icon, uniform 2px stroke, rounded line caps and
> joins, charcoal ink on plain white, no fill, no shading, no gradient, no
> color, no text, no background shape, centered with generous margin, flat
> geometric construction as if drawn on a 24-pixel grid, the visual
> language of a system icon set, minimal.

## The seven tools

1. **Cool Down** (temperature). Prompt: "A single drop of water with two
   short horizontal lines to its left suggesting cold, drawn as one
   continuous outline; nothing else."
2. **Pause** (STOP skill). Prompt: "An open palm seen straight on, four
   fingers and thumb as simple rounded outlines, no wrist detail, the hand
   held up as if to say wait."
3. **5-4-3-2-1** (senses grounding). Prompt: "Five small circles arranged
   in a shallow arc like the tips of fingers, with a short vertical tick
   under the center one, suggesting things noticed one by one."
4. **Urge Surfing**. Prompt: "One wave drawn as a single rising and
   falling line with a small dot riding on the crest, the line continuing
   past the crest and flattening out; no water below the line."
5. **Do the Opposite** (opposite action). Prompt: "Two short arrows on the
   same horizontal axis pointing away from each other, with a small gap
   between their tails, both arrows the same weight."
6. **Problem Solve**. Prompt: "A simple square knot in a single line,
   drawn loosely so the path of the rope can be followed, with one loose
   end trailing out to the right."
7. **Ask for what you need** (DEAR MAN). Prompt: "Two speech bubbles,
   one slightly overlapping the other, the front bubble with a single
   short horizontal line inside it, the back bubble empty."

## The activation patterns (result screen)

These sit next to the state headline on the check-in result. Keep them
quieter than the tool icons: less detail, more negative space.

8. **Acute alarm**. Prompt: "A small bell drawn as a simple outline, with
   two short curved lines on each side suggesting it has just rung."
9. **Chronic vigilance**. Prompt: "A single eye drawn as an almond outline
   with a round pupil, and one short line above it like a raised brow."
10. **Emotional flooding**. Prompt: "Three stacked horizontal wavy lines,
    the top one rising above a straight horizontal line that represents a
    rim or edge."
11. **Reactive aggression**. Prompt: "A single flame outline with a sharp
    tip, drawn tight and narrow, leaning slightly to one side."
12. **Conservation freeze**. Prompt: "A six-pointed snowflake made of six
    short straight lines from a center point, with no branches or
    ornament."
13. **Dissociation, overmodulation**. Prompt: "A circle drawn as a dashed
    outline, with a smaller solid-outline circle floating slightly off
    center inside it."
14. **Rumination loop**. Prompt: "A single line that spirals inward three
    turns and stops, with a short arrowhead at the inner end."
15. **Low reward drive**. Prompt: "A simple battery outline with one short
    bar at its base and the rest empty, no lightning symbol."
16. **Social threat, shame**. Prompt: "A simple face drawn as a circle with
    two dots for eyes and a hand outline covering the lower half, the hand
    reduced to a rounded shape with three finger lines."
17. **Grief, yearning**. Prompt: "A heart outline with a single clean
    horizontal gap in its left side, as if a piece were missing, no crack
    lines."
18. **Positive state**. Prompt: "A small four-pointed star drawn as a
    single outline, with one dot floating to the upper right."

## Navigation (already exist as SVG; regenerate only if the set needs
## re-drawing together)

19. **Check-in**. Prompt: "A circle with a short line from its center to
    the two o'clock position and a dot at the center, a clock face without
    numerals."
20. **Tools**. Prompt: "A single wrench drawn as one outline, angled at 45
    degrees."
21. **Reflect**. Prompt: "A circle with a short counterclockwise arrow
    curving along its upper left edge, an arrowhead at the arrow's end."
22. **Profile**. Prompt: "A circle above a wider rounded arc, a person seen
    as head and shoulders, no facial features."

## The mark

Three directions to try. The branding research in `branding-kit.md`
weighs in on whether the leaf stays; generate all three and compare.

23. **The leaf, redrawn**. Prompt: "A single leaf drawn as one continuous
    line, with the midrib as a second line that stops short of the tip, on
    a slight diagonal."
24. **The small companion**. Prompt: "A tiny round creature made of two
    overlapping circles with two dot eyes and two short pointed ears, drawn
    as an outline, friendly and calm, no mouth."
25. **The anchor phrase**. Prompt: "A single short horizontal line with a
    small circle centered above it, like a dot over a baseline, suggesting
    one word held steady."

## Notes for the redraw

- Match the existing sidebar icons: 24×24 viewBox, `stroke-width` 1.8,
  round caps and joins, `fill="none"`, `currentColor`.
- One shared component (`Icon`) with a name prop, so the seven tool icons
  replace the `emoji` field in `src/data/tools.ts` via an `icon` id rather
  than an emoji string.
- Icons never carry color. Hue stays with quadrants and feeling families.
