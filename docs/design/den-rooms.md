# The Den: rooms, type, pressable controls and the square

Branch `design/den-rooms`. Design source: the "Goblin UI directions" canvas
(direction D, The Den, and its rooms). This is the token pass only: colour,
type and shape change everywhere, layouts and flows do not.

## What changed

- **Rooms replace palettes.** Six rooms, each a complete colour set with one
  mode. Velvet (default) and Dusk are dark; Tinted, Pastel, Pastel mix and
  Daylight are light. Applying a room sets both `data-palette` and
  `data-theme` on `<html>` (`applyRoom` in `src/data/palettes.ts`), so the
  Find the feeling rooms, which read `data-theme`, match the app. The saved
  `theme` field is kept for compatibility but no longer drives the page, and
  the Theme buttons are gone from Profile > Appearance.
- **Legacy palettes map to rooms** on read: cool-steel → Tinted,
  slate-spruce → Dusk, signal → Daylight, giverny → Pastel mix,
  clouds → Pastel. The Cloud Function now accepts only room ids on write.
- **Type.** Hanken Grotesk is the tool talking (body, buttons, labels);
  Newsreader is the voice (every `h1`/`h2`, weight 400). All-caps headings
  stay in the sans. DM Sans is still loaded for the Tune room's own CSS.
- **Shape.** `rounded-lg`/`xl`/`2xl` are larger (14 / 18 / 22 px) through
  Tailwind's radius variables.
- **Pressable controls.** `lift-primary` sits on a lip in the room's
  `--color-accent-lip` and presses down into it; `lift-secondary` gets a
  quieter `--color-lip`. That covers about 150 buttons.
- **The wall.** Each room's background (lamp light, corner washes) is a fixed
  layer behind the page, `--color-wall`.
- **Text on colour.** 99 `text-white` on accent fills became
  `--color-on-accent`; selected emotion chips use `--color-on-quadrant`;
  the delete button uses `--color-on-danger`. Light rooms have light action
  colours (pastel coral, periwinkle), so hard-coded white failed contrast.

## Room-only tokens (set per room, not light/dark paired)

`--color-wall`, `--color-accent-lip`, `--color-lip`, `--color-on-quadrant`,
and the skill-family colours `--color-fam-{dt,er,ie}` with `-text` and
`-lip` (teal: get through it; lavender: shift it; rose: with other people).
The family colours are defined now and used in PR 2.

## Editing a room

Change the spec in `scripts/rooms/build.py` and run
`python3 scripts/rooms/build.py`. It rewrites the block between
`ROOMS:BEGIN` and `ROOMS:END` in `src/index.css` and refuses to write if any
text pair drops under 4.5:1 (ink, secondary and tertiary text, text on the
action colour, quadrant text on cards, family text on its tile, and the
on-quadrant colour on each quadrant fill). Then update the swatch in
`src/data/palettes.ts`, `ROOM_MODES` in `index.html` if you add a room, and
the allow-list in `functions/src/index.ts` (`updateUserProfile`).
`npm run check:palettes` still runs over the result.

## Deploy note

Frontend and functions must ship together. Without the functions deploy,
saving a room from Profile is rejected server-side ("Unknown palette").

## Next

- **PR 2, shell and icons:** drop the admin frame (sidebar, date eyebrow,
  right rail, footer) for the Den's top bar and labelled bottom nav; a
  persistent Help now; line icons instead of emoji; colour-code tools by
  skill family (`data-category`); tint the room from the check-in
  (`data-quadrant`); retire tracked-caps eyebrows; fix the literal `→`
  on the result cards.
- **PR 3, the square:** built on this branch (see below), except the
  before/now screen.
- **Later, comfort settings:** day room and night room, tint-with-my-check-in
  on/off, quieter colour, reduce motion, text size, pinned tools. Each is an
  attribute next to `data-palette`.

## PR 3: the check-in square

The check-in's first screen is one question ("How is it in there?") and one
continuous square. Pleasantness runs left to right and energy bottom to top.
The colour is the room's four quadrant fills blended across the whole
surface, so there are no box borders to land on the wrong side of.

- **Place, adjust, then confirm.** Touching places the dot and lifting
  leaves it there; touch or drag again to move it as often as you like. The
  caption reads the place back in plain words as it moves, and "That's about
  right" (its space reserved, so nothing jumps) sets `intensity {x, y}` and
  opens the words. Keyboard: the arrow keys move the point (hold Shift for
  bigger steps), and Enter or Space confirms.
  `src/components/checkin/FeelingSquare.tsx`.
- **The room takes the colour of the touch.** A wash from the top of the
  page, `.feeling-tint`, is mixed in CSS from the room's fills (`squareColor`
  in `src/lib/feelingSquare.ts`). It stays on for the rest of the check-in.
- **Words under the square.** Once the dot is down, the three nearest words
  appear under it and can be picked right there. Each pick brings up the
  words the graph relates to it (`getRelatedEmotions`, via
  `src/hooks/useRelatedWords.ts`) as "+" chips. From here: "View more words"
  (the full list), "+ Add another spot", or "Continue with …". Continue only
  appears once a word is picked, so it never duplicates "View more words"
  (Enter on the focused square also opens the full list).
- **More than one feeling.** A check-in holds up to three spots
  (`Spot` in `src/lib/feelingSquare.ts`), each a point plus its words.
  - "+ Add another spot" (under the square, and as "Something else in there
    too?" on the words screen) keeps the current spot and asks "And the other
    part?". Earlier spots stay on the square, dimmer, tagged with their first
    word. "Never mind" drops a new spot that has no words.
  - On the words screen, other spots' words sit above as removable pills; a
    spot whose last word is removed goes too.
  - Continuing sends every word. The routing quadrant still comes from the
    words (`inferQuadrant`: unpleasant, then high energy, wins ties), and
    intensity comes from the spot those words sit in (`leadSpot`). Spots
    without words are dropped.
- **Which word is closest?** (the full list) Eight words, nearest the point
  first, ranked by the x/y already in `src/data/emotions.ts`. Common (`core`)
  words are pulled a little closer. A picked chip takes its own quadrant's
  fill. "More words" pages outward. "None of these fit" opens Find the
  feeling. "Continue without a word" is allowed; the quadrant then comes from
  the point. The small square at the top reads the place back in plain words
  (`describePlace`); tapping it goes back to move the point.
- **Two ways out** on the first screen:
  - "I can't tell" is lavender and opens Find the feeling.
  - "Start with my body" is teal and starts the body-first path.
- **Help now** is on both screens.
  - It fixes a bug: it used to do nothing on the first screen, because there
    was no quadrant yet.
  - It now uses the picked words, else the point, else assumes the loud end
    (high-unpleasant). That is when people reach for it.
- **Result.** Your words show as pills in their quadrant colours, then the
  pattern label in the serif. The one or two tools are colour-coded by skill
  family (`src/data/skillFamilies.ts`, `.tool-card[data-family]`). This also
  fixes the literal `\u2192` that showed on the tool cards.
- **Removed:** `QuadrantGrid` and `QuadrantCell` (the four boxes).

Per-room look of the square (halo, centre shade, Tinted's glaze, dot, tint
strength) is a set of `--square-*` tokens in `scripts/rooms/build.py`. The
build now also checks ink and secondary text on the family tiles.
