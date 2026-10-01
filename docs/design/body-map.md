# Body map: plan

Status: **step 1 built** (content and function; nothing served until signed off). Oct 2026. Design source: the "Goblin UI directions" canvas, rows T to Z
(sensation pad W, body mirror X, heat figure Y, several feelings Z). Product record: Product
Changelog, "Body step redesign: the sensation pad".

## What we decided

- **Figure: Heat.** A soft silhouette. Marks glow inside it like a heat map. Warm colours mean more
  energy, cool colours mean less. That follows Nummenmaa et al. 2014 (*Bodily maps of emotions*,
  PNAS), where "less" states such as sadness and depression show as cooled limbs.
- **Both sides by default.** Shoulders, arms, hands, legs and feet are one place each. Both / Left /
  Right appears only for those paired places, never for the midline.
- **The sensation pad.** Tapping a place opens a small feeling square under the figure. Its dot sets
  how intense (up) and how pleasant (right) that sensation is. A line says it back ("More intense,
  unpleasant"). Word chips follow the dot: tight, raised up or clenched in the unpleasant half;
  settled, warm or loose in the pleasant half. The mark's colour on the body is the pad's colour
  (`squareColor`), so the body uses the same colour language as the check-in square.
- **The body mirror.** It follows DEAR MAN's "Not sure? See how this might typically make someone
  feel". "Not sure? See where *anxious* often shows up" draws the typical map for the check-in's
  words as a ghost layer (dashed, hatched, labelled).
  - Tapping a ghost makes it yours (solid) and opens the pad pre-filled: "Change anything that
    isn't true for you."
  - "Add all of these" is there. The disclaimer is DEAR MAN's.
- **Several feelings.**
  - Words are grouped into one map per family. *Anxious* and *overwhelmed* share the fear map.
  - There is one tab per group, in the words' colours, at most three (matching spots). The first tab
    is the group the check-in routes on.
  - A "Together" tab stripes the places two maps share.
- **Marks are never tied to a feeling.** With five feelings set, tense shoulders don't have to be
  "because of anxiety". Sensations belong to the whole check-in, and tabs are only hint views. A
  mark's colour comes from the pad, not from a tab. Patterns come later, from co-occurrence across
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
  - `intensity` is the pad point. It's stored for real now, as `intensityX` (pleasant) and
    `intensityY` (intensity).
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
| `components/checkin/body/HeatFigure.tsx` | the `BodyMap` SVG | Silhouette and clip-path; one blurred glow per mark in `squareColor(mark.pad)`; ghost layer (dashed, hatched); stripes for "Together"; zoom to a region when the pad is open |
| `components/checkin/body/SensationPad.tsx` | `SensationDetails` | `FeelingSquare` at pad size (a `size` prop; today it's either full size or the label-free `small` reminder); the read-back line; chips filtered by the pad's quadrant and region; Both / Left / Right for paired places; Done / Remove |
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
3. **Sensation pad.**
   - `SensationPad` adds the small square: real intensity, chips filtered by the pad's quarter,
     mark colour from the pad, Both / Left / Right.
4. **Body mirror, one map.**
   - A ghost layer for the routing group's map, a pre-filled pad on tap, "Add all of these", and
     `fromMirror` saved.
5. **Several feelings.**
   - Tabs per map (max 3) in the words' colours, and Together stripes.
   - Marks stay put across tabs and never take a tab's colour.

A dev harness, `dev/body-map.html` with fixture content, shows the figure, pad and mirror without
signing in, in the way `dev/find-the-feeling.html` does.

## Open questions (Claudia)

1. **State names on the pad.** For example, "Braced for impact" for tight, raised shoulders. It would
   be graph content per (region, quadrant). Shipping without names first and adding them later is
   the lower-risk path.
2. **Summary before Continue** (canvas Z4, "Your body right now"). It could be a step 5 add-on, or
   left out if the marks list on the step already does the job.
3. **Routing.** Body data stays out of recommendations in this project. Using it later would be its
   own decision (the evidence for body → pattern is thinner than for words).
4. **The disclaimer and mirror copy** go through the voice lint, and the maps through sign-off.
   Nothing is served as a draft.
