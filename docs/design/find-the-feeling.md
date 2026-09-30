# Find the feeling (Shape it / Tune it)

> **30 Sep 2026:** the capacity question ("If someone asked you for a favour right now…") is removed from every flow until there is a better way to ask it; see CLAUDE.md, "The capacity question is out". The Capacity step below is historical.

Status: built on `feat/someone-got-to-me` (tool, Cloud Functions, collection, check-in entry). Not deployed. Needs real-phone checks and clinical sign-off before release.
Umbrella: [alexithymia-first-interaction.md](alexithymia-first-interaction.md).
Prototype: `prototypes/goblin-lab/src/directions/Shape` and `.../Tune`.

## What it is

An Emotion Regulation tool for the step every other tool assumes: knowing what you feel. It is DBT's
observing, describing and naming emotions, rebuilt for alexithymia. You never rate anything and never have
to produce a word. You match the feeling to something you can see or hear, and the app offers a word you
can accept or refuse.

One tool (`find-the-feeling`, concept `dbt_find_the_feeling`) with two ways in:

- **By shape** (default, silent, works in public). A clay object on a plinth, shaped by five forced choices.
- **By ear** (offered as "Try it by ear instead", headphones hint). Two strings, a warmer/colder search.

Listed on the Emotion Regulation page as one card. Also reachable from:

- **Check-in:** a new option, "I can't tell what I'm feeling". Runs the short version (shape, capacity,
  word) and returns an emotion id + band to the normal check-in result.
- **Recommendations:** `getStateAndTools` can recommend it for the "can't tell / muddled" emotions it
  ADDRESSES (confused, perplexed, indifferent, apathetic).
- **Recover from a hurtful moment:** its "what's inside" step embeds the short version.

## Flow

| Step | Shape | Tune | Record |
|---|---|---|---|
| 1. Find it | Five "which is closer to what's inside?" rounds: sharp/soft, hot/cool, heavy/light, buzzing/still, clenched/hollow. "can't tell" keeps a dimension neutral | "Closer / Further / That's it" adaptive search over rough, grit, register, pulse; converges in 6–10 taps | `shape` (5 values) or `sound` (4 values) |
| 2. Capacity | Notification card: "hey, could you help me with something?" + three replies | same | `band` |
| 3. Urge | "What does it want to do?" Four copies of your object acting out the urges | Four sound gestures | `pull` |
| 4. Regulate (gated) | flooded: *smooth it down slowly* (strokes 45–380 px/s count, >600 px/s flinches). blank: *warm it up* (brisk rubbing) | flooded: *breathe them back into tune* (holds ≥2.8 s; ~5 breaths). blank: *wake the strings* (6 plucks) | `regulation`: `smooth` / `warm` / `tune` / `wake` / `skipped` |
| 5. Word | "Things shaped like this are often called…" Yes / Close / Not that, up to three offers | "Sounds like this often get called…" | `word`, `wordAccepted`, `offered[]` |
| 6. Set off (optional) | "Do you know what set it off?" someone / a situation / tired-hungry-sore / nothing I can see / not sure | same | `setOff` |
| 7. Then vs. now | Start object and current object side by side | Replay then / now | `close` |
| 8. Where to next | Up to two tools from routing (below), or "Nothing else needed. Finding it was the work." | same | `routedTo[]` |
| 9. Collection | Shelf gains the object with its word | Harp gains a string | writes `FOUND_WORD` |

"Try it by ear / by shape instead" is available at step 1 only. Everything works with sound off.

### Ambient descent

The best-received thing in the Tune prototype: over the whole session the sound slowly drifts calmer, and
people are settled without noticing they're being settled. That becomes a deliberate mechanic in both ways:

- **Tune:** after the capacity step, every step eases the strings a little toward the tuned state (less
  detune so the beating slows, less grit, slower tremolo). `gates.ambientDescent`: 8% per step, at most 45%
  of the distance, so the found sound is still recognisably theirs.
- **Shape:** the object cools and softens by the same schedule.
- **Blank runs the other way** (brighter, warmer, a little more motion), because shutdown needs
  activation. Flooded + blank still calms.
- The found sound and shape are kept as a snapshot; the word step and "then" replay use the snapshot, never
  the drifted state.

Two things to be honest about in copy and marketing. First, this is not binaural beats. Binaural beats need
a different tone in each ear through headphones, and their evidence is weak and mixed. What Tune does is
ordinary beating between two strings in the same sound (works on a speaker), and the calming more likely
comes from the slowing: slower tempo and smoother sound lower arousal, and breathing and heart rate tend to
follow tempo (Bernardi, Porta & Sleight 2006, Heart; added as a ClinicalSource). Describe it as "the sound slows down with you", not as
brainwave entrainment. Second, the descent biases then-vs-now: "now" sounds calmer partly because the
app made it calmer. Record `ambientDescent: true|false` on every session and A/B it in testing, so the
close still tells you something about the person and not just the audio.

## Gates (in `FindTheFeelingFlow.contentJson.gates`)

- `flooded` → regulate before the word. Bottom-up only (stroke, breath).
- `blank` (and not flooded) → activate (warm, pluck). Never calming.
- **`flooded` + `blank` → regulate, then orient, and skip the word step.** This is the graph's
  `flooding_triggered_shutdown` co-occurrence: its `contraindicatedTools` include `affect_labeling`, and its
  sequencing note says autonomic down-regulation first, no cognitive tools, no interoceptive reconnection
  while flooded. The prototypes got this wrong (they sent every blank to activation); production must not.
  Copy: "Let's skip the word today. Getting back into the room is the whole job right now."
  Routing then offers Cool Down or 5-4-3-2-1 only.
- Regulation always has an escape ("That's enough for now") after 20 s, and a press-and-hold button
  alternative to every gesture.

## Offering words

Word signatures live in the graph: `(:Emotion)-[:HAS_FEELING_SIGNATURE]->(:FeelingSignature {shape, sound})`,
grouped by `(:FeelingFamily)-[:INCLUDES {offer}]->(:FeelingSignature)`. 27 words in 7 families, including
pleasant ones (content, peaceful, hopeful, excited). People with alexithymia struggle with those too, and
a tool that only offers pain words teaches that feelings are always bad news.

Algorithm (server-side, in `getFindTheFeelingContent` or computed client-side from its payload):

1. Distance from the found shape (or sound) to every signature (squared Euclidean on the shared dims).
2. Rank families by their nearest member; offer the nearest word in the nearest family.
3. **Close** means "close enough" and accepts the word (the prototype's reading, which reduces friction).
   If testing shows people use Close to mean "near but not it", switch Close to "next word in this family".
4. **Not that** jumps to the nearest word in the next family.
5. After three refusals: `word = null`, "Not knowing the word is fine. You found its shape, and that counts."

The signatures are hypotheses for offering, not a classifier. Every signature carries
`evidenceGrade: 'Preliminary'` and `reviewStatus: 'needs_clinical_review'`. Log `offered[]` and
`wordAccepted` so the table can be re-tuned from real acceptances.

## Routing ("Where to next")

1. **Word routes.** TherapyConcepts with an `appToolId` that ADDRESS the accepted Emotion (e.g. hurt,
   humiliated, rejected → Recover from a hurtful moment). Only when `setOff` isn't "nothing I can see".
2. **Urge routes.** `(:FeelingUrge)-[:ROUTES_TO {rank}]->(:TherapyConcept)`:
   fight → Pause, Do the Opposite · chase → Urge Surfing, Pause · hide → Do the Opposite ·
   blank → 5-4-3-2-1.
3. **Opposite Action prefill.** When routing to Do the Opposite with an accepted word, pass the word's
   `dbtParent` so OA opens on the right emotion's urges.
4. At most two tools. Steady + no strong urge → "Nothing else needed."
5. flooded + blank → Cool Down or 5-4-3-2-1 only.

The join uses `TherapyConcept.appToolId` (set by this migration for every concept the app can open), not
`normalizeToolId`.

## Graph

`schema/find-the-feeling.cypher`, generated by `scripts/find-the-feeling/build.py` from
`scripts/find-the-feeling/content.py` (edit content.py, never the .cypher). Load order: after
`invalidation-recovery.cypher` (reuses `linehan_skills_2015` and `affect_labeling`).

| Node / edge | Purpose |
|---|---|
| `TherapyConcept dbt_find_the_feeling` | PART_OF Emotion Regulation; USES dbt_describe, affect_labeling (so the co-occurrence contraindication applies), cross_modal_matching, affective_touch, resonance_breathing, se_orienting; ADDRESSES the "can't tell" emotions |
| `TherapyConcept urge_surfing`, `cross_modal_matching`, `affective_touch`, `resonance_breathing` | New concepts this tool and its routing need |
| `TherapyConcept.appToolId` | Join key to `src/data/tools.ts` for 9 concepts |
| `FeelingFamily`, `FeelingSignature`, `HAS_FEELING_SIGNATURE`, `INCLUDES {offer}` | Word signatures |
| `FeelingUrge`, `ROUTES_TO {rank}` | Urge routing |
| `FindTheFeelingFlow {version: 'find-v1', contentJson}` | Copy + gates; GROUNDED_IN 10 ClinicalSources |
| `FindTheFeelingSession` (constraint on `key`, index on `createdAt`) | User data, written by the save function |
| `(:User)-[:FOUND_WORD {firstAt, lastAt, count, ways}]->(:Emotion)` | Shared collection (no schema needed) |

Sources added: Nummenmaa 2014 (bodily maps), Juslin & Laukka 2003 (emotion in music and voice), Palmer 2013
(cross-modal emotion mediation), Lieberman 2007 (affect labelling), Kashdan 2015 (differentiation), Brewer
2016 (alexithymia and interoception), Löken 2009 (C-tactile touch), Lehrer & Gevirtz 2014 (resonance
breathing), Bernardi 2006 (tempo and arousal).

## Cloud Functions (phase 1)

- `getFindTheFeelingContent()` → flow JSON, families with signatures and offer order, urges with routes
  (as `appToolId`s), and the user's collection (`FOUND_WORD` words with their signatures, for the shelf
  and the harp). One `executeRead`, sequential queries.
- `saveFindTheFeelingSession(session)` → validates (`functions/src/findTheFeelingValidation.ts`: enum
  checks, signature vector lengths and ranges, graph ids exist, gate consistency re-checked on the
  server: flooded+blank must have `word = null` and `regulation != 'skipped'` unless escaped), idempotent
  on `key`, writes the session and upserts `FOUND_WORD`. Maps already-exists like the other save functions.
- `getFeelingCollection()` → the collection for the Collection page.
- Export and delete must include `FindTheFeelingSession` and `FOUND_WORD`.

Session record:

```ts
interface FindTheFeelingSession {
  schemaVersion: 1; id: string; contentVersion: 'find-v1';
  entry: 'tool' | 'checkin' | 'recover';
  way: 'shape' | 'tune'; switchedWay: boolean;
  shape?: [number, number, number, number, number];   // sharp, heat, weight, buzz, clench
  sound?: [number, number, number, number];           // rough, grit, register, pulse
  band: 'steady' | 'stirred' | 'flooded';
  pull: 'fight' | 'chase' | 'hide' | 'blank';
  regulation: 'smooth' | 'warm' | 'tune' | 'wake' | 'skipped' | 'none';
  offered: string[]; word: string | null; wordAccepted: boolean;
  setOff: 'someone' | 'situation' | 'body' | 'nothing' | 'not_sure' | null;
  close: 'louder' | 'same' | 'quieter' | 'much';
  routedTo: string[];                                  // appToolIds
  ambientDescent: boolean;                             // for the A/B; see Ambient descent
}
```

## Frontend code map (phase 1)

- `src/pages/tools/FindTheFeeling.tsx`: entry, way switch, step machine (reducer like `invalidationRecoveryFlow`).
- `src/components/rooms/shape/*`, `src/components/rooms/tune/*`: ported from the prototype, content from
  props (no word tables, no copy in code), each with a 2D fallback.
- `src/components/rooms/shared/*`: capacity probe, urge picker, then-vs-now, collection views.
- `src/data/tools.ts`: tool `find-the-feeling`, module `emotion-regulation`, and the check-in shortcut
  `{ id: 'cant-tell', label: "I can't tell what I'm feeling", toolId: 'find-the-feeling' }`.
- `src/services/neo4j.ts`: wrappers for the three callables.
- `tests/find-the-feeling.test.mjs`: migration checks (already written). Add validator + flow tests.

## Deploy order

1. `npm install` (adds three / @react-three/fiber / @react-three/drei), then deploy functions:
   `firebase deploy --only functions:getFindTheFeelingContent,functions:saveFindTheFeelingSession,functions:getFeelingCollection,functions:getStateAndTools,functions:getQuickTools,functions:getInsightsData,functions:exportUserData,functions:deleteUserData`
   (`getStateAndTools` and `getQuickTools` use the appToolId join; `getInsightsData` uses it for the proactive alert).
2. Graph, in the same release as hosting:
   `node scripts/load-graph.mjs --only app-tool-ids` then `node scripts/load-graph.mjs --only find-the-feeling`.
   `app-tool-ids` is safe on its own and fixes the tipp / stop / problem-solving cards immediately.
3. `firebase deploy --only hosting`.

## Developing the rooms

`npx vite build --config dev/vite.harness.config.ts && (cd dev-dist && python3 -m http.server 4321)`, then open
`http://localhost:4321/dev/find-the-feeling.html?way=shape` (or `way=tune`, `entry=checkin`, `name=…`). The harness uses the
fixture payload and the real reducer; `window.__ftf` exposes state and dispatch.

## Open questions

- Should Close accept, or walk the family? (Default: accept. Measure.)
- Sound defaults: off everywhere, or on in the tool page when the device isn't muted? (Default: off.)
- Minimum age / content rating for the Tune sound design (loud rough sounds for "furious").
