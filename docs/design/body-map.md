# Body map: plan

Status: **steps 1–3 built** (content and function; heat figure, both sides, graph words, body-first suggestions; the one-screen body step: drag, optional strength bar, words in one row). Nothing is served until the content is signed off. Oct 2026. Design source: the "Goblin UI directions" canvas, rows T to AA
(sensation pad W, body mirror X, heat figure Y, several feelings Z, one screen with a strength bar AA). Product record: Product
Changelog, "Body step redesign: the sensation pad".

## What we decided

- **Figure: Heat.** A soft silhouette. Marks glow inside it like a heat map. Warm colours mean more
  energy, cool colours mean less. That follows Nummenmaa et al. 2014 (*Bodily maps of emotions*,
  PNAS), where "less" states such as sadness and depression show as cooled limbs.
- **Both sides by default.** Shoulders, arms, hands, legs and feet are one place each. Both / Left /
  Right appears only for those paired places, never for the midline.
- **One screen, no pad (canvas row AA, Oct 2).** The sensation pad (a small feeling square in the
  place panel) was built and dropped: it made the step something you scroll to. Instead:
  - Drag on the body to a place and lift (a tap still works).
  - The place's words sit in one swipeable row under the body.
  - An optional **strength bar** beside the body, as tall as the figure (strong at the top, faint at
    the bottom). Shown by default; a "Strength" toggle hides it, remembered per device.
  - Colour comes from the words: each pad word is `more` (tight, racing) or `less` (heavy, numb), so
    a mark glows warm, cool, or a blend of both; no words, a warm mid-tone. Strength sets how big
    and bright the glow is.
- **The body mirror.** It follows DEAR MAN's "Not sure? See how this might typically make someone
  feel". "Not sure? See where *anxious* often shows up" draws the typical map for the check-in's
  words as a ghost layer (dashed, hatched, labelled).
  - Tapping a ghost makes it yours (solid) and opens the place's card pre-filled (its word picked,
    and the strength bar set from the map's weight when the bar is on): "Change anything that
    isn't true for you."
  - "Add all of these" is there. The disclaimer is DEAR MAN's.
- **Several feelings.**
  - Words are grouped into one map per family. *Anxious* and *overwhelmed* share the fear map.
  - There is one tab per group, in the words' colours, at most three (matching spots). The first tab
    is the group the check-in routes on.
  - A "Together" tab stripes the places two maps share.
- **Marks are never tied to a feeling.** With five feelings set, tense shoulders don't have to be
  "because of anxiety". Sensations belong to the whole check-in, and tabs are only hint views. A
  mark's colour comes from its words, not from a tab. Patterns come later, from co-occurrence across
  check-ins.
- **Rejected:** particle or point-cloud figures, anatomy-chart segments, and a single flat word list
  for every place.

## What exists today

| Piece | Where | State |
|---|---|---|
| Body step | `src/components/checkin/BodyMap.tsx` | 20 one-sided segments (`left-shoulder` …), tap → `SensationDetails` |
| Sensation words | `src/data/bodyRegions.ts` `sensationTags` | One fixed list of 20, the same for every place |
| Sensation intensity | `SensationDetails.tsx` | Hard-coded `{0.5, 0.5}` ("no longer asked") |
| Saving | `functions/src/checkin/validation.ts` `sensation()`, `checkin/index.ts` | `BodySensation {x, y, region, intensityX, intensityY, tags}`, region is free text ≤ 64, as a Title Case name ("Left Shoulder") |
| Graph | `schema/relationships.cypher`, `low-unpleasant-associations-patch.cypher` | `(:Emotion)-[:FELT_AS {region}]->(:SensationType)` for 22 vocabulary emotions, 15 sensation types, 13 region strings (`chest`, `shoulders`, `throat` …) |
| Word → graph | `SCORES_AS` (`scripts/recommendations/vocabulary.py`) | 78 unpleasant grid words alias to vocabulary emotions; 7 anger words are held; pleasant words have no path |
| Body-first path | `EmotionSuggestion.tsx` + `src/data/sensationMappings.ts` | Frontend scoring from (region, tag) to emotions: known tech debt that duplicates `FELT_AS` |
| Readers | `History.tsx`, `history/BodyRegionFrequency.tsx`, `insights/SomaticCorrelation.tsx`, `functions/src/insights` | Key on the Title Case region names (`toRegionKey`) |
| Routing | `functions/src/recommendation` | Accepts `bodySensations` but never reads them. That stays true in this project |

## Design

### Content (graph, via a Cloud Function)

All of this is emotion knowledge, so it lives in the graph (CLAUDE.md hard rule). It gets one
editable source, `scripts/body-map/content.py`, which generates `schema/body-map.cypher` through
`build.py` (the same pattern as find-the-feeling, witness and recommendations). It has drafts and a
`SIGNED_OFF` list like the witness corpus, so nothing is served until Claudia approves it.

1. **Region vocabulary.** These are ids that the graph and the figure share: `head`, `face`, `jaw`,
   `throat`, `neck`, `shoulders`, `chest`, `upper_back`, `stomach`, `lower_back`, `arms`, `hands`,
   `legs`, `feet`, `body` (whole body). They're stored on `BodyMapContent.regions`. From step 2 a
   test checks that every graph region exists in the figure, and the reverse. Geometry and "paired"
   stay in the frontend because they are presentation. The old `FELT_AS` region strings (`back`,
   `hands` …) are left alone; nothing new reads them.
2. **Pad words.** `SensationType` grows from 15 to 40 (the 15 existing ids keep their `name`), each with
   `padLabel` ("Tight", "Raised up", "Fluttery", "Settled"), `zones` (which pad quadrants it
   belongs to: `hu`, `hp`, `lu`, `lp`), an optional `regions` restriction (e.g. "Raised up" only for
   shoulders), `energy` (`more` / `less`) and `padRank` (pad order). Every place has at least one
   word in every quarter of the pad (build check). A word removed from `content.py` is marked
   `padStatus: 'retired'` (the shared node stays) and is never served.
3. **Body maps (the mirror).** Twelve `(:BodyMap {id, label, wordIds})` nodes: `fear`, `anger`,
   `sadness`, `shame`, `guilt`, `disgust`, `depleted` ("Drained or numb"), `love`, `joy`,
   `excitement`, `surprise`, `calm`.
   - DBT parents are used where they exist, plus pleasant families and a low-energy map, following
     Nummenmaa's 14 maps (which include depression as its own cooled map).
   - Each place is a node: `(:BodyMap)-[:SHOWS]->(:BodyMapPlace {id, region, weight})-[:FEELS_AS]->(:SensationType)`,
     3 to 6 per map. A place can't be an edge keyed on its region: only `FELT_AS` may merge on a
     property, and one map can show the same sensation in two places (anger: hot head, hot face).
   - `wordIds` lists the grid words (`src/data/emotions.ts` ids) each map mirrors. Every grid word
     is in exactly one map (test), including pleasant words and the held anger words, which
     `SCORES_AS` can't reach. It's a list, not edges: 18 calm-side grid words (*relaxed*, *cozy* …)
     aren't `Emotion` nodes in the graph.
   - The existing `FELT_AS` edges informed the maps and are left as they are.

**Callable:** `getBodyMapContent({ emotionIds? })` in a new `functions/src/bodyMap/` module (public,
like `getCapacityContent`). It returns
`{ padWords: [{id, label, zones, regions, energy}], maps: [{id, label, emotionIds, places: [{region, sensationId, label, energy, weight}]}] }`.
The maps are only the ones reached from the given ids, in the order the client sends them. The
client caches the pad words for the session. Follow the callable checklist in CLAUDE.md
(`functions/src/index.ts`, `endpoints.json`, auth matrix).

### Saving

- `BodySensation` keeps its shape and gains `side` (`both` | `left` | `right`) and `fromMirror`
  (boolean: the user accepted a ghost).
  - `region` becomes a region id (`shoulders`).
  - `strength` (0–1, or null when the bar wasn't used) is new in step 3. `intensity` keeps its
    shape but the body step no longer sets it (the pad is gone), so it stays 0.5 / 0.5.
  - `tags` are the picked pad words' labels (for display), and a new `sensationIds` holds their
    stable `SensationType` ids (for any graph lookup; labels are copy and can change). Old records
    keep tags only. Nothing reads sensation ids from history: suggestions use the check-in in
    progress.
- `validation.ts`: `side`, `fromMirror` and `sensationIds` are optional (`side` defaults to `both`).
  Old clients are unchanged. It stays a log record (append-only, no profile).
- Old records move to the new names once, with a migration
  (`schema/migrations/2026-10-body-regions.cypher`, run with step 2's deploy): `Left Shoulder` →
  `shoulders` + `left`, `Chest` → `chest`, and so on. The Insights query already counts each region
  once per check-in (`collect(DISTINCT s.region)`), so a check-in that had both shoulders counts
  once. Readers then only know the new ids: `shoulders` with `both` lights both shoulders, `left`
  lights one (`src/data/bodyFigure.ts`).

### Frontend

| New | Replaces | What |
|---|---|---|
| `src/data/bodyFigure.ts` | `bodyRegions.ts` (kept for the legacy map) | Silhouette path, each region's hit area and centroid, `paired`, and the legacy-name map |
| `components/checkin/body/HeatFigure.tsx` | the `BodyMap` SVG | Silhouette and clip-path; drag to choose; one blurred glow per mark, warm / cool from its words, sized by strength; ghost layer (dashed, hatched); stripes for "Together" |
| `components/checkin/body/StrengthBar.tsx` + the card in `BodyStep` | `SensationDetails` | The optional strength bar beside the body (step 3, replacing the pad); the chosen place's words in one row; Both / Left / Right for paired places; Done / Remove |
| `components/checkin/body/BodyMirror.tsx` | none | "Not sure? See where *word* often shows up"; tabs per map (max 3) plus Together; ghost places; "Add all of these"; disclaimer |
| `components/checkin/body/BodyStep.tsx` | `BodyMap` | The step: figure, list of your marks, mirror entry, Continue / Skip; same props contract as `BodyMap` so `CheckIn.tsx` barely changes |

The flow stays as it is: square → words → (discriminating questions) → **body** → result. The
body-first path ("Start with my body") runs the same `BodyStep` with no mirror (there are no words
yet), then the suggestions.

## Build order

Each step renders on its own and goes in as its own PR. Content comes first, because every later
step reads it.

1. **Content and function (no UI change).**
   - Write the region vocabulary, pad words and body maps in `content.py`, then `build.py` and
     `fixture.py` (for `tests/fixtures/body-map-content.json`).
   - Build `getBodyMapContent`.
   - Tests: every grid word mirrors exactly one map, every map has 3 to 6 places on known regions,
     every place has pad words in every quarter, only signed-off content is live, the type mirror,
     and the callable (fake driver).
   - **Claudia:** review the maps and pad words (a readable list, like the witness lines).
   - Deploy: load the graph (`--only body-map`), then functions.
2. **Heat figure, both sides, and body-first suggestions from the graph.** These ship together:
   the new place names and pad words no longer match `sensationMappings.ts`, so the "Start with my
   body" suggestions would break in between.
   - Build `bodyFigure.ts`, `HeatFigure` and `BodyStep`. Tapping a place shows the graph's pad
     words for that place as plain chips (the pad square comes in step 3).
   - Save region ids with `side`, and `sensationIds`. Update the validation and the readers, and run
     the region migration.
   - A `suggestEmotionsFromBody` callable: the marks (region + sensation id) scored against each
     map's places, returning maps with their words; `EmotionSuggestion` uses it. Delete
     `sensationMappings.ts`, closing the CLAUDE.md tech debt.
   - Deploy: functions, the migration, then hosting.
3. **One screen: drag, the strength bar, words in one row** (canvas row AA).
   - Drag on the figure: a glow follows the finger, the place under it reads back live, lifting
     chooses it.
   - The optional strength bar beside the body; the chosen place's words in one row; warm / cool
     from the words; `strength` saved.
   - Deploy: functions (the server accepts and stores `strength`), then hosting.
4. **The body mirror, one map** (canvas Y1–Y3, fitted to the AA layout). Mock Y2 and Y3 in the
   one-screen layout first: the mirror panel has to fit without scrolling too.
   - Y1: under the body, "Not sure? See where *anxious* often shows up" (only when the check-in has
     words; "Start with my body" has none yet). Y1's "It's all over" is the Whole body place;
     "Nothing I notice" could replace "Skip this step".
   - Y2: a ghost layer for the routing group's map, hatched and dashed with small labels ("tight
     chest"); under the body, the mirror panel: one line about the map, "Sound familiar? Tap any that
     fit" chips, "Add all of these", and DEAR MAN's disclaimer. The one line is new graph copy (a
     `description` per map in `content.py`, signed off like the rest).
   - Y3: tapping a ghost (or its chip) opens the place's card pre-filled: its word picked, the bar set
     from the map's weight when the bar is on. "Filled in from how *anxious* often feels. Change
     anything that isn't true for you." Saves `fromMirror`.
   - Already covered: Y4 (cool is "less") by step 3's colour rule; Y5 (your body right now) by the
     marks row under the body; Y6 (light room) by the rooms.
5. **Several feelings** (canvas Z).
   - Tabs per map (max 3) above the body, in the words' colours; the first is the group the check-in
     routes on. A Together tab stripes the places two maps share.
   - Marks stay put across tabs and never take a tab's colour. Z4's summary is the marks row.

Not built (yet): a `dev/body-map.html` harness like `dev/find-the-feeling.html`. Until the content is
signed off, the step can be seen locally only with the content stubbed (the fixture treats drafts as
live).

### Step 2 as built

- `src/data/bodyFigure.ts`: the place ids (a test keeps them equal to the graph's), labels, paired
  places, tap shapes and glows on a front view (the person's left on the figure's right).
- `components/checkin/body/HeatFigure.tsx` and `BodyStep.tsx`: the step is self-contained (the
  check-in's old `sensation` step is gone). Places the front view can't show (jaw, back of the
  neck, upper and lower back, whole body) are a "More places" row. The place panel offers Both
  sides / Your left / Your right for paired places and the graph's words for that place, grouped
  Uncomfortable / Comfortable; if the words can't load, the place can still be marked. One mark
  per place. Until the pad (step 3), marks glow one warm mid-tone; places behind the front view
  glow fainter.
- `suggestEmotionsFromBody` (pure scoring in `functions/src/bodyMap/suggest.ts`): each mark counts
  once per map against its best place × weight (same place and word 1, word elsewhere 0.4, place
  alone 0.25); the strongest 3 maps with their words. `EmotionSuggestion` stays small, because
  someone who starts with their body usually can't find words yet: one best guess ("That often goes
  with fear and worry.", with the places it's based on above it) and its three most common words,
  one word from each of the next two maps under "Or maybe", and the full list behind "Something
  else". At most five chips. A map's first common word stands for it, so `content.py` lists the
  most representative word first.
- The migration maps the old figure's Thigh / Knee / Calf to `legs` and Hips to `lower_back`, and
  keeps the old name as `legacyRegion`.
- **Deploy order:** load the graph (`--only constraints`, then `--only body-map`), deploy
  functions, run `schema/migrations/2026-10-body-regions.cypher`, then deploy hosting. The body
  step and suggestions show words only once the content is signed off; before that, places can
  be marked without words and "Start with my body" offers the full word list.

### Step 3 as built (canvas row AA)

Built first with the sensation pad (a small feeling square in the place panel). Claudia dropped
it the same day: the pad made the step something you scroll to. Rebuilt as one screen.

- **Drag on the body** (`HeatFigure`): a wrapper div takes the pointer (`touch-action: none`, the
  finger mapped from the svg's box, not `getScreenCTM`, which was unreliable on phones; the tap shapes have
  `pointer-events: none` and stay focusable buttons for the keyboard and screen readers). Pressing
  anywhere on the figure and moving shows a glow under the finger and names the place it would
  choose above the figure ("Throat", or "Not on the body"); lifting chooses it, and a plain tap
  still works. No outline is drawn round places; only keyboard focus shows one. `regionAt(x, y)` in `bodyFigure.ts` is pure: where tap shapes overlap the
  smaller place wins (a hand over the end of an arm, the face over the bottom of the head); off
  every shape, the nearest within 14 units (the seams and the silhouette's edges); further out,
  nothing. The figure blocks page scroll under the finger (`touch-action: none`), like the
  check-in square.
- **Layout** (`BodyStep`): a three-column grid, the figure in the middle (up to 172px wide) and the
  bar's column on the right, so the bar spans the figure's full height and is centred on it. The
  "Strength" toggle sits above the bar's column, level with the place read-back.
- **The strength bar** (`StrengthBar`): shown by default; the toggle hides it
  (`goblin.body.strengthBarHidden` in this device's storage, a display preference, not profile
  data). Drag or press anywhere on it;
  arrows and Home / End from the keyboard (`role="slider"`, vertical). With no place chosen it
  shows but can't be used. The thumb always shows: in the middle and softer until the bar is
  touched for this place; until then the place's strength is saved as null.
- **The card**: "My chest feels…", Both / Your left / Your right for paired places, and the graph's
  words for the place in one row that swipes sideways (graph order; a saved word that's no longer
  served still shows so it can be taken off). Buttons: Cancel or Remove, and Add this place / Done.
- **Colour** (`src/lib/bodyMark.ts`): warm (`--color-q-hu-fill`) for `more` words, cool
  (`--color-q-lu-fill`) for `less`, a blend for both, the warm mid-tone for none. Strength scales
  the glow (0.6–1.1× size, 0.35–0.95 opacity); unset is a middle glow. Picked chips take the
  mark's colour. The figure follows the card live (side, words, strength).
- **No scrolling**: with nothing chosen, your marks and the places the figure can't show share one
  wrapping group; once something is marked, those places sit behind "+ More places".
- **Saved**: `strength` on each `BodySensation` (0–1 or null). Old clients send none.
- **Deploy:** functions, then hosting.

## Open questions (Claudia)

1. **State names** (canvas Y3's "Revving"). For example, "Braced for impact" for tight, raised shoulders. It would
   be graph content per (region, quadrant). Shipping without names first and adding them later is
   the lower-risk path.
2. **Summary before Continue** (canvas Z4, "Your body right now"). It could be a step 5 add-on, or
   left out if the marks list on the step already does the job.
3. **Routing.** Body data stays out of recommendations in this project. Using it later would be its
   own decision (the evidence for body → pattern is thinner than for words).
4. **The disclaimer and mirror copy** go through the voice lint, and the maps through sign-off.
   Nothing is served as a draft.
