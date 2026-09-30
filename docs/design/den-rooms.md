# The Den: rooms, type and pressable controls (PR 1 of 3)

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
- **PR 3, the square:** the continuous gradient field replaces the four
  quadrant boxes, with the pick-a-word, result and before/now screens.
- **Later, comfort settings:** day room and night room, tint-with-my-check-in
  on/off, quieter colour, reduce motion, text size, pinned tools. Each is an
  attribute next to `data-palette`.
