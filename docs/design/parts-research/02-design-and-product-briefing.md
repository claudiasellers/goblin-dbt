# Goblin DBT: design and product briefing for an IFS "parts" feature

I only read files and changed nothing. Citations are `path:line`. Quoted copy is verbatim.

**A caution before you start:** the design docs were written in layers, and some code still has the older look:
- **Fonts:** the Sep 13 plan (Fraunces and DM Sans, "Cool Steel") was replaced by the "Den" pass (Hanken Grotesk and Newsreader, six "rooms").
- **Older chrome still in the code:** several things the design plan rejects still ship, for example the 🌿 emoji logo, the glass header, the tracked-caps date line, accent-filled Reflect tabs and the faded-in Insights placeholders.

Build the new feature to the **stated rules**, not to whatever the nearest existing screen does.

---

## 0. The headline for IFS specifically

1. **IFS already has a set place in the product, and it is narrow.** `docs/design/alexithymia-first-interaction.md:83-92`, "Anger: the angry part (IFS envelope)", is the only product decision about IFS. It is agreed but **not built** (grep finds no `PartsCopy`, `ProtectedHurt` or angry-part code). It is four screens, about 45 seconds, one decision each:
   1. **Unblend.** "A part of you is furious right now." The word sits beside a small figure, set apart from *you*. (Stage room: the part is its own little figure on the stage.)
   2. **What it protects.** "It's trying to protect something. What?" Chips: *being brushed off · being made small · being left out · not mattering · being laughed at · being alone in this*.
   3. **Vote of confidence.** Distanced self-talk in the person's own name, held for 4 s: "[Name], this part is angry because being taken seriously matters to you. You don't have to let it drive, and you don't have to leave it behind. [Name] can handle this conversation."
   4. **Speak for it, not from it.** The plan's *I felt…* line swaps the anger word for the hurt ("I felt brushed off").

   **Rationale (line 92):** IFS "makes three separate techniques one move": unblending is the distance, protector and exile is the hurt under the anger, and Self-energy is the vote of confidence. It cites Kross 2014 and Mischkowski, Kross & Bushman 2012.

   **The guardrail, quoted exactly:**
   > "Guardrail: protector level only, never the hurt's memories, never unburdening (IFS evidence is Preliminary; solo exile work can flood). Breathing stays as the alternative; venting and "burn it off" exercise stay out. Content (`PartsCopy`, `ProtectedHurt` → existing Emotion ids) lives in the graph. Spec: the Interpersonal-Wound PRD, §5 *Angry part*."

   - The PRD it names is **not in the repo**.
   - It must come **after** the flooded band ("flooded still goes body-first", line 85).
   - In DEAR MAN it would become the default heads-up for the *fire back* urge (line 67).

2. **The graph already models IFS** (`schema/knowledge-graph.cypher:900-1063`, `schema/relationships.cypher:412-445, 840-874, 990-1024, 1566-1594`):
   - **Modality** `TherapyModality {id:"ifs"}`, with core assumptions "The mind is naturally multiple", "Everyone has a Self", "All parts have good intentions".
   - **Concepts:** `ifs_exile` (role wounded_part), `ifs_firefighter` (reactive_protector; common_behaviors includes self-harm, substance use, dissociation and rage), `ifs_manager` (proactive_protector), `ifs_self` (the "8 C's", mPFC, ventral vagal), `ifs_protector`, `ifs_unburdening`, `ifs_blending`, `ifs_unblending`, `ifs_trailhead`.
   - **Part hierarchy:** firefighter and manager are each `TYPE_OF` protector.
   - **Parts to emotions:**
     - exile `CARRIES` cold_shame, fear, loneliness and sadness.
     - firefighter `RESPONDS_TO` fear, cold_shame and overwhelm.
     - manager `PREVENTS` cold_shame, fear and rejection.
   - **Bridges to other modalities:**
     - `ifs_self` `CONCEPTUALLY_RELATED_TO {functional_equivalent}` `dbt_wise_mind` and `pv_ventral_vagal`.
     - `ifs_unblending` ↔ `act_defusion` ↔ `mbct_decentering`.
   - **Neural mappings:** Self `NEURAL_HUB` mPFC and `INHIBITS` amygdala; Unblending `ACTIVATES` mPFC and ACC.
   - **RDoC:** `rdoc_self_perception` is the "Neurobiological anchor for IFS Self-energy, ACT Observing Self, DBT Wise Mind" (knowledge-graph.cypher:2270).
   - `schema/validation-queries.cypher:101-118` checks that the Self↔Wise Mind↔Ventral Vagal and Unblending↔Defusion↔Decentering bridges exist.
   - None of this has an `appToolId`, so no IFS concept is routable today.

3. **Wise Mind is planned, not built.**
   - `scripts/recommendations/content.py:128` tags `"wise-mind": {"concept": "dbt_wise_mind", "side": "both", "skillKind": "naming", "direction": "neutral"}`.
   - It has a switched-off row (line 252; `recommended-for.cypher:67`, `rf_chronic_vigilance_words_watchful_wise-mind`, "Planned: Wise Mind as the alternative for suspicion and judgement") for the words persecuted, critical, skeptical, dismissive and jealous.
   - `docs/design/checkin-routing-review.md:11-17` lists Wise Mind among the PLANNED tools. "The routing is what the modules get built around": shipping one means giving its concept an `appToolId` and dropping it from `PLANNED`.
   - `wiseMindAnswer` is already an **ask-fresh** field (`functions/src/userdata/layers.ts:80-82`). Any Wise Mind or Self-check answer must be asked every time and never pre-filled.

4. **Parts language already in the witness corpus** (all drafts, not served):
   - `scripts/witness/content.py:195` `tp_gave_in`: "Giving in made sense in that moment. Part of you was keeping things safe."
   - `:303` `ci_l3_shame_rejection` (level 3): "Maybe part of this is a fear of being pushed away."
   - `:192` "Your body was trying to protect you. That isn't weakness."
   - `:255` "If hiding kept you safe before, wanting to hide now makes sense."

   So "protective function" framing is already in the voice.

5. **No mascot in the shipped product.** The brand says the goblin is "implied … rather than depicted" (§2). For a parts feature, personifying parts as little goblin characters would cut across several explicit decisions:
   - no talking mascot;
   - no faces with teeth;
   - no cuteness (the Finch comparison);
   - the goblin is the companion, not a part.

   The closest sanctioned form is Stage's "small figure" for a part (alexithymia-first-interaction.md:87).

---

## 1. Design docs: principles, decisions and rejections

### docs/design/app-design-plan.md (13 Sep 2026; the app-wide token plan)

**Core thesis (lines 28-39):**
1. "Make meaning out of shape and color. Options are rounded and tappable. Coaching is plain text. Keepsakes are square paper. Accent means one thing: this moves you forward."
2. "Give the person's language a typeface. The serif marks words about this person … the sans is the tool talking. That is affect labeling made visible."
3. "Strip the template chrome. Tracked caps eyebrows, arrows on links, spaced em dashes, middle-dot meta strings, fade-in on every step, glass panels, emoji as iconography."

**Colour roles (176-196):**
- Page / Paper ("Keepsakes only") / Ink / Voice ("the tool talking") / Action ("Primary button. One per screen. Nothing else.") / quadrant and feeling hues / Danger ("Crisis resources only").
- "**Accent means 'this moves you forward.'** Not selection, not tabs, not nav, not links, not display numbers, not disclosure toggles."
- "**Selection is weight, not color.** Ink outline (1.5px), medium text, check glyph."

**Type (200-219):**
- "One display moment per screen, always in the serif."
- The serif "never appears in an instruction, a button, or a page title. It appears only when the words are about this person" (314-318).
- Measure: under 70 characters for sans body, under 60 for serif body.
- "Retired: tracked caps."

**Structure table (223-239):**

| Object | Radius | Surface | Border | Shadow |
|---|---|---|---|---|
| Chip | pill | — | — | — |
| Option (a sentence) | 8px | — | 1px | — |
| Coaching / insight | none | none | none | — |
| Settings group (Profile) | 8px | card | 1px | — |
| Keepsake | 0 | paper | — | `--shadow-lg`, "the only shadow" |

- "Boxes inside boxes go to zero everywhere."

**Progress (241-247):**
- One `StepTrack`: a thin segmented bar with Back on the same row.
- "Segments are unlabeled by default so acronym reveals (STOP, DEAR MAN) survive."

**Motion (249-258):**
- "Nothing animates on entry."
- "One earned moment per flow … Everything else answers a tap."
- Keep the pacing visuals of GuidedActivity (the breathing circle).

**Layout (260-265):**
- Left-aligned.
- Only the signed-out landing and the bailout micro-step are centred.
- Primary buttons are full width at the bottom.

**Copy (267-277):**
- "Buttons say what happens … Never 'Next: [destination]' or 'Almost there'. No arrows in text. No middle dots … Spaced em dashes … become commas, periods, or colons. … Empty states name the action, in one line, not a card."
- Keep as written: "the state headlines, the formulation copy, the mirror text, the barrier coaching, 'That feels like too much right now', 'That's okay. Let's go smaller.', the DEAR MAN reveal."

**Decisions and rejections:**
- Iconography is monochrome line icons (decided, 345).
- The Tools directory becomes seven rows (decided).
- Rejected: restyled History charts (now gated by data); a "compact card" for Tools (322-332).
- Open: data-gated charts; removing the date eyebrow; the palette (348-362).
- Its sections on Profile and Me: "quiet and mostly fine … the content is settings, where a bordered group is honest structure" (149-153).

**Mentions of IFS, parts, Self or Wise Mind:** none.

### docs/design/alexithymia-first-interaction.md (agreed direction: no rating scales; Stage, Shape, Tune)

**Why (11-15):** the people this app is for "often have alexithymia… every scale asks for the one thing they can't do."

**Principles (17-30):**
1. "**Recognise, don't rate.** People pick between concrete things … never a number or a slider. Comparison ('which is closer?') replaces magnitude."
2. "**Capacity, not intensity.**" (The probe itself has since been removed; see CLAUDE.md:49-53.)
3. "**The word is a hypothesis.** … 'I don't know' is always a complete answer."
4. "**The body does the regulating.**"
5. "**Words are the game.** Every accepted word joins one collection, shown three ways (shelf, strings, scenes)."
6. "**Graph first.**"

**Rooms (32-41):**
- **Stage** (theatre): "Rebuild the moment with figures on a tiny 3D stage"; relational events.
- **Shape** (gallery): a sculpture you shape by forced choice, then smooth or warm.
- **Tune** (music room): warmer/colder sound search; breathe detuned strings back into tune.
- "Each room keeps its own art direction, but they share type, colour tokens, controls and transitions so they read as one house, not three apps."

**Shared mechanics (43-59):** forced-choice sculpting, urge loops, slow-stroke smoothing, breath-tuning strings, step back / zoom out (visual self-distancing), "Set it how you wanted", enacted opposite action, ambient descent, and "Then vs. now: comparison close instead of re-rating" for every tool.

**"Never lock people out" (79-81):**
> "A lock on something the person just built (a plan, a message) punishes the effort … the pattern is a **heads-up plus a choice** … Safety blocks, such as never offering Ask for a person marked unsafe, are a different thing and stay."

**Engineering (102-112):**
- One 3D runtime (three, R3F, drei), lazy per room, DPR capped at 2, no postprocessing.
- A **2D fallback for every mechanic** (reduced motion, failed WebGL).
- Audio off until turned on; every Tune step works muted.

**Before shipping (129-138):** clinical sign-off, phone tuning, and user sessions with people who score high on alexithymia measures.

**IFS:** the angry-part section (see §0).

### docs/design/den-rooms.md (the current token pass)

- **"Rooms replace palettes."** Six rooms, each one mode. Dark: Velvet (default) and Dusk. Light: Tinted, Pastel, Pastel mix and Daylight.
- `applyRoom` sets `data-palette` and `data-theme` (9-15).
- **Type:** "Hanken Grotesk is the tool talking (body, buttons, labels); Newsreader is the voice (every `h1`/`h2`, weight 400)." DM Sans is kept only for the Tune room's CSS (22-24).
- **Shape:** radii of 14 / 18 / 22px.
- **Pressable controls:** `lift-primary` sits on a lip in `--color-accent-lip` and "presses down into it" (about 150 buttons) (25-30).
- **The wall:** a fixed background layer, `--color-wall` (31-32).
- **Text on colour:** `--color-on-accent`, `--color-on-quadrant`, `--color-on-danger` replace hard-coded white (33-35).
- **Room-only tokens:** `--color-fam-{dt,er,ie}` with `-text` and `-lip` ("teal: get through it; lavender: shift it; rose: with other people") (37-42).
- **Editing a room:** change `scripts/rooms/build.py`, which refuses any text pair under 4.5:1 (44-54).
- **Next (66-78):**
  - PR 2: drop the admin frame for a top bar and labelled bottom nav; a persistent Help now; line icons; skill-family colour coding; tint the room from the check-in.
  - Later comfort settings: day and night rooms, tint on/off, quieter colour, reduce motion, text size, pinned tools.

**The square (80-139):**
- One question, "How is it in there?", on a continuous square. "Place, then adjust."
- "The room takes the colour of the touch" (`.feeling-tint`).
- Up to three spots ("+ Add another spot" → "And the other part?"; on the words screen, "Something else in there too?"). This multiplicity language already exists and is a natural doorway to parts.
- Two ways out: "I can't tell" (lavender) opens Find the feeling; "Start with my body" (teal).
- **Help now** is on both screens.
- **Result:** the pattern label in the serif, then the witness beat, then one recommendation and one swap, colour-coded by skill family.
- **Removed:** `QuadrantGrid` (the four boxes).

### docs/design/branding-kit.md

- **Brand position (12-19):**
  > "Goblin is the small, unbothered creature that sits with you when your brain is loud, and helps you find the word for it and the next thing to do. It is not pretty and it is not a tracker; it is plain, warm, and practical, and it never asks you to be presentable first. … quiet at rest, one clear move forward per screen, and the person's own words the only decoration."
- **Evidence (21-57):** colour effects are small and the field is immature; lightness matters more than hue; distressed users ask for restraint and to avoid red and orange.
  - "Alexithymia: nothing on colour … Do not claim the palette helps people with alexithymia. What does help them is the thing the app already does: offering words."
  - Implications: the high-unpleasant corner is not fire-engine red; crimson is reserved for crisis; don't let the high-unpleasant corner be the brightest thing at 8 out of 10.
- **What not to copy (59-78):**
  - Finch: "The cuteness. Goblin is a creature too, and must not land here."
  - Woebot: "a mascot that talks".
  - Daylio: "the traffic-light valence scale. It grades feelings".
  - Headspace: orange plus blobs.
  - Calm: blue = calm app.
  - DBT Coach: "DBT content presented as a syllabus".
- **The name (80-93):** folklore goblin = the small creature in the house that is up at night. "Goblin mode" = "unapologetically unpolished, rejecting the performance of being fine … come as you are."
  > "The risk is the third meaning, the greedy trickster. The brand stays safe by never drawing a face with teeth, never drawing green skin, keeping the word lowercase and small, and letting the goblin be implied (ears, a lantern, a shape in the dark) rather than depicted."
- **Mark directions (95-112):** the lantern; "the field with ears" ("The creature *is* the field: the four quadrants are its face without a face"); the split leaf, whose vein forks "for the dialectic (two things true at once)". The 🌿 emoji should go.
- **Wordmark (114-123):** Fraunces 600, lowercase `goblin`.
- **Palettes A–E (125-455):** A, B, C, C2, D and E, plus a recommendation for E, Giverny. Superseded by the rooms.

### docs/design/body-map.md (steps 1-5 built)

**Decisions (7-44):**
- **Heat figure:** marks glow in feeling-square colours. "The colour is never skin temperature."
- Both sides by default; Left / Right only for paired places.
- One screen with an optional strength bar. The "sensation pad" was **built and dropped** because "it made the step something you scroll to."
- **The body mirror:** "Not sure? See where *anxious* often shows up" draws a ghost layer (dashed, hatched). Tapping one makes it yours, pre-filled: "Change anything that isn't true for you." "Add all of these."
- **Several feelings:** at most three tabs, plus Together, which stripes shared places.
- "**Marks are never tied to a feeling.** … tense shoulders don't have to be 'because of anxiety'. Sensations belong to the whole check-in." This is a relevant principle: don't attribute body states to one part.
- **Rejected:** "particle or point-cloud figures, anatomy-chart segments, and a single flat word list for every place."

**Content rules:** all content is drafts until `SIGNED_OFF` (signed 2 Oct after a physiology review).

**Open (306-316):** state names, a summary before Continue, and "Body data stays out of recommendations in this project."

**Shipped disclaimer** (`BodyMirror.tsx:128`): "This is where many people feel it, not where you're supposed to. Only keep what's true for you."

### docs/design/find-the-feeling.md (built, not deployed)

- **What it is:** "You never rate anything and never have to produce a word … the app offers a word you can accept or refuse."
- **Flow (31-43):** find it (5 forced choices / sound search), urge ("What does it want to do?"), regulate (gated), word ("Yes / Close / Not that", up to 3 offers), set off (optional), then vs now (side by side), where to next (≤2 tools, or "Nothing else needed. Finding it was the work."), collection.
- **Ambient descent (45-66):** the sound and shape drift calmer below notice (8% per step, at most 45%). Blank runs brighter. The found snapshot is never drifted. Honesty in copy: "not binaural beats … 'the sound slows down with you'". Record `ambientDescent` because it biases then-vs-now.
- **Gates (68-79):**
  - flooded → regulate first, bottom-up only.
  - blank → activate, never calm.
  - **flooded + blank → regulate, orient, skip the word** (the graph's `flooding_triggered_shutdown` contraindicates `affect_labeling`). Copy: "Let's skip the word today. Getting back into the room is the whole job right now."
  - Regulation always has "That's enough for now" after 20 s, and a press-and-hold alternative to every gesture.
- **Offering words (81-99):** 27 words in 7 families, pleasant ones included ("a tool that only offers pain words teaches that feelings are always bad news"). The signatures are "hypotheses for offering, not a classifier", `evidenceGrade: 'Preliminary'`. After three refusals: "Not knowing the word is fine."

### docs/design/recover-from-invalidation.md

- v1 flow: Settle → Name it → Validate (self-validation by name; secure-base prime; self-compassion break) → Need (Williams' four social needs; "About this person": safe? how many times already asked?) → Move (Ask→DEAR MAN, Let it land, Do the opposite, Park the replay, Must→prefer) → Close.
- Sessions store **ids and numbers only, no free text** (35).
- The save callable rejects an ask when "the person isn't safe or has refused twice, or when a mocking state is deliberate" (29).
- **v2 "Stage it" (102-132, not built):** rebuild the moment with figures (sandtray / family sculpting). Pull is read from dragging your own figure (toward slowly = chase, flick = fight, off the edge = hide, "it won't move" = blank). "Step back from it" lifts the camera. "Set it the way you wanted it" maps to an `UnmetNeed`. Opposite action is acted out by your figure.
  - **This is the most parts-ready interaction model in the codebase:** figures, spatial distance, a "you" figure and "others".

### docs/design/opposite-action-guided-flow.md

- "Free text is never analyzed or diagnosed by this version."
- "The app does not decide that a user's interpretation is objectively true. Shame and guilt keep their original emotion identity; there is no inferred conversion between them" (19).
- "Explicit saves only; no localStorage, logging of exercise text, or LLM calls" (21).
- Future LLM insights (33-43): server-side; user reports flagged "not verified facts"; "Do not infer causality … or present fabricated personalized insight."
- v2: "one decision per card, taps instead of typing, no required free text"; a somatic circuit-breaker (hold a body cue about 3 s); a follow-up loop (≤48h, content-free `.ics`).

### docs/design/dear-man-design-review.md and dear-man-token-plan.md

- Part A, app-wide: three object types (tappable options / quiet coaching / the keepsake). "The person's language becoming visibly different from the interface's is the point of affect labeling." Hue as information. One motion moment per flow.
- Part B: "Make the plan the hero … a physical object"; "The vernacular is a cue card, not a dashboard."
- Keep: the mirror text, the barrier coaching, "By the way, you just used DEAR MAN."
- Token plan rejections: coaching's thin left rule was removed ("whitespace does the job"); the anchor phrase moved to the top of the keepsake.

### docs/design/checkin-routing-review.md (rf-v2, switched on 5 Oct 2026)

**Decisions (9-35):**
- Missing tools stay in the routing as switched-off rows (Wise Mind among them).
- "The square's side is the boundary."
- "Anger has its own pattern; one word never raises the crisis banner" (anger words → Ready to fight, `reactive_aggression`: Pause, then Cool Down; "Intense exercise lowers arousal; it isn't framed as a release").
- "Spiraling is the doorway to Flooded."
- No capacity split.
- "A hurt word puts Recover first everywhere but Flooded."
- Do the Opposite is `CONTRAINDICATED_FOR` dissociation.

### Other docs
- **icon-prompts.md:** line-icon prompts. Mark #24 is "The small companion": "A tiny round creature … two dot eyes and two short pointed ears … friendly and calm, no mouth." "Icons never carry color."
- **2026-09-14-palette-picker.md:** the five-palette picker (superseded by rooms).
- **docs/superpowers/specs and plans (Mar 2026):**
  - **Check-in accordion-grid redesign**, since replaced by the square. Explicit rejections: varying circle sizes, family labels in the UI ("backend-only clustering"), search/custom input, emotion definitions ("too cluttered … The affect labeling value comes from the selection itself"), tooltips ("visual noise").
  - **Tools-page revamp:** "Only built tools shown", no placeholders; grouped by DBT module; "Check the Facts is not a standalone tool."
- **.cursor/plans/neo4j_graph_features…plan.md:** the early "Neuroscience-Powered Smart Recommendations" plan.
  - Philosophy: "This is NOT another emotion tracking app … Solutions-focused … Reduce cognitive load … Affect labeling … Neural mechanism targeting."
  - UX: "Don't overwhelm: 2-3 recommendations max … Explain the 'why' … No pressure."
  - Its Tool / NeuralProfile nodes were not built as written.
- **.superpowers/brainstorm HTML (Mar 2026):** brain-visualization explorations.
  - `brain-viz-styles.html`: A abstract network, B anatomical silhouette, C hybrid, D minimal constellation.
  - `brain-concepts.html`: placement options (post-check-in viz / tool explainer / standalone "My Brain" explorer / layered) and insight types (personal insights / knowledge base / research hub / combo).
  - `brain-a-vs-c.html` (two copies): recommends A after check-in, because "The post-check-in moment is about quick emotional insight, not anatomy class," and puts anatomy in a later explorer.
  - None shipped. The current result screen uses plain headlines.

---

## 2. The goblin concept

- **What it is:** a brand persona and a name, not an on-screen character.
  - It is the "small, unbothered creature that sits with you" (branding-kit.md:14), with a goblin-mode "come as you are" ethos.
  - It is to be "implied (ears, a lantern, a shape in the dark) rather than depicted" (branding-kit.md:88-93).
- **Shipped mark:** a sprig on Velvet's plum wall with lamp light (`scripts/icons/build.py:1-17`, `public/favicon.svg`), "An original drawing on purpose: the old favicon was the 🌿 emoji."
  - The sidebar still shows "🌿 Goblin" (`src/components/Sidebar.tsx:53-57`), as does the compact header (`DashboardLayout.tsx:61-62`).
  - The manifest name is "Goblin"; the `<title>` is still "DBT Tools" (`index.html`).
- **Mascot:** only in a prototype, and unused there. `prototypes/goblin-lab/src/Goblin.tsx` is an "Original Goblin mascot: a small leaf-sprout creature. Mood drives brows, eyes and mouth" (moods neutral, concerned, calm, glad and listening), with CSS vars `--goblin`, `--leaf` and `--cheek`. Nothing imports it, and the lab's own SPEC bans "a mascot talking" (`SPEC.md:6`).
- **Implication for parts:** personifying parts as goblins conflicts with the brand guardrails (no depicted goblin, no faces with teeth, not cute, no talking mascot). The sanctioned forms are:
  - a small, faceless **figure** on the Stage (the angry-part spec);
  - the user's own serif-set words;
  - a feeling's "shape" or "sound" (Shape and Tune).

---

## 3. The Me surface (`src/pages/Profile.tsx`, `src/components/me/*`)

**Page structure (`Profile.tsx:43-81`):**
- `max-w-2xl`, `space-y-6`.
- An h2 "Me" (h2s render in the Newsreader serif at weight 400 via the global rule, `index.css:716-724`), then `<MeSection/>`.
- An h2 "Settings", then the accordion `SectionCard`s: "Basic Info", "Appearance" (Room radio cards with five-dot swatches; preview before saving, "Previewing. Save to keep it."), "Reminders", "Privacy & Data" (retention, export, delete with "Are you sure? This cannot be undone.").
- Signed out: "Sign in to see what the app keeps for you, and your settings."
- The nav label is "Me" (D-10, `Sidebar.tsx:85-104, 127-130`). The route is `/profile`.

**MeSection (`MeSection.tsx`):**
- **Registry-driven from `getMe`.** Areas shown in Phase A (line 15): `about_me`, `my_body`, `my_words`, `my_patterns`. `my_patterns` appears only once it has items or an offer (46-48).
- **Layout:**
  - Each area is a bordered card: `p-4 rounded-xl border bg-card`, an h3 `text-sm font-semibold`, then the blurb in `text-xs` tertiary (96-99).
  - Rows are separated by `border-t`. A row shows the title (sm medium), the summary (secondary) and, if set aside, an xs "Set aside" (54-61).
- **Stale items** float to the top in a section **"A few things to check"**, with an accent border (90-95).
- **Area copy** (from `scripts/profile-layer/content.py:13-21`):
  - About me — "What you'd like the app to call you, and what matters to you."
  - My people — "The people you want help with. Nothing here unless you add it." (reserved, hidden)
  - My body — "Things about your body and your day the tools should respect."
  - My words — "Words you've found for your feelings, and lines you've kept."
  - My plans — "Plans you've made ahead of time." (reserved)
  - My patterns — "Things that seem to help you, once you've said yes to them."
  - My progress — "How your practice is going." (reserved)
- **About me:** "The app calls you **{firstName}**. Change it under Basic info." or "No name yet. Add one under Basic info." (100-104).
- **My body:** the "Set quiet hours" link opens `QuietHoursEditor` (time inputs; "Pick a start and an end that differ."; "Couldn't save. Try again?").
- **My words (found words, read-only):**
  - "Words you've found: {comma list}", or the empty state "Words you find with Find the feeling land here." (115-121).
  - "Lines you kept" lists witness lines saved with "Keep this line" (122-131).
  - `OwnLine` items ("say it my way") have **Set aside** (68-73).
- **Set aside / Restore:** underlined text buttons (`min-h-11`). Restore appears only on set-aside items (62-67).

**StillTrue (`StillTrue.tsx`):**
- `prompt === 'ask'` (past `revisitAt`): an elevated inset box with the question (default "Still true?") and three bordered 44px buttons, **Yes · Not any more · Change** (165-186).
- `quiet` (fresh): a small underlined "Change" link.
- Comment: "'Not any more' sets the item aside; it is never deleted silently and can be restored from Me."
- Kind copy (content.py:24-31):
  - quiet_hours: "Are these still your quiet hours?" (revisit 180 days); set-aside line "Set aside. Reminders can come at any time until you set new ones."
  - what_helps: "Is this still true for you?" (60 days); "Set aside. It won't shape suggestions any more."
  - own_line: never stale; "Set aside."

**PatternOfferCard (`PatternOfferCard.tsx`):**
- "A pattern the app noticed, offered (never promoted) to My patterns (rule 4). Yes keeps it; not now asks again after a cooldown; no means never for this pattern."
- A section labelled "Something we noticed" on an elevated bordered card, holding the statement (medium weight), the offerCopy, and three buttons: **"Yes, keep it" · "Not now" · "No"**.
- Rule copy (`profile-layer/content.py:37-48`): statement "{toolName} tends to help you when this happens." and offer "Want to keep this in Me? You can change it any time."
- The rule is `enabled: False` until there are 4 weeks of data. 3 of the last 4 closes better within 30 days; 14-day cooldown.
- It also renders in the Today stack.

**Types and consent mechanics:**
- `src/data/profileTypes.ts`:
  - Areas are a closed union.
  - The slices list reserves `people`, `values`, `ownWords`, `crisisKit`, `safetyPlan` and others.
  - **`PROFILE_NEEDS` is code** ("a content load can never widen what a tool reads"): `checkin: ['patterns']`, `witness: ['name','ownLines','savedLines']` (server-only), and so on.
- A new parts area would mean extending `ProfileAreaId`, adding an `AREAS` row, `ProfileKind`s, a label registered in `layers.ts`, and a `PROFILE_NEEDS` entry.

---

## 4. The witness system (the voice contract)

**Source:** `scripts/witness/content.py`, generated into `schema/witness.cypher` by `build.py`. The build also writes `ToolMoment` and `VoiceRule` nodes, which mirror `voice-rules.json` "for traceability".

**Voice, as stated in the header (`content.py:6-10`):**
> "a flat, warm witness. Second person ("you"), or the user's name in the {N} form. No cheer, no "!", no emoji, no "should", no "just", no "but" taking a clause back, no diagnosis words, no physiology claims, never an interpretation of what the other person meant. At most 90 characters; lines allowed at `flooded` are level 1-2 and at most 8 words."

**Levels (Linehan, 12-15):**

| Level | Meaning |
|---|---|
| 1 | pace / presence |
| 2 | echo, the user's own words |
| 3 | a tentative guess at what's underneath (must carry an UNDERNEATH emotion; served with "Close · Not that") |
| 4 | makes sense given history or how you're built |
| 5 | makes sense now, for anyone |
| 6 | treated as capable: "tone, never flattery" |

**Kinds:** receive, urge, both, after_miss, after_louder, self, function.

**ToolMoments (35-45):** checkin_result, recover_validate, oa_start, ps_define, dearman_describe, debrief_turning_point, missed_followup, urge_louder, crisis ("level 1 only").

**Status:**
- live / draft / retired. Live needs `reviewStatus: reviewed` + `reviewedAt`, set through `SIGNED_OFF`.
- **`SIGNED_OFF = {}` today**, so only Recover's 16 lines (reviewed 2026-09-30) are live. The check-in corpus of about 84 lines, plus the OA, PS and DEAR MAN lines, are drafts and never served.
- Lines are retired, never deleted.

**`scripts/witness/voice-rules.json` (regex rules, severity per scope):**

| Rule | What it bans | Scopes |
|---|---|---|
| `no_interpretation` | "you're right", "they were wrong", "it was (unkind\|wrong)", "this was wrong", "they don't care", "they meant" | validation error |
| `no_cheer` | "great job", "amazing", "proud of you", "awesome", "well done", "!" | error in validation and feeling_copy; warn in user_copy |
| `no_emoji` | emoji | validation and feeling_copy |
| `and_not_but` | `[,.;:] but` ("a second clause never takes the first one back") | validation |
| `no_minimising` | "at least", "don't worry", **"just"**, "everything happens", "it'll be fine", "calm down" | validation |
| `no_should` | "should" | error in validation; warn elsewhere |
| `no_diagnosis` | "overreact*", "oversensitiv*" | validation |
| `no_physiology` | vagus/vagal, ventral, dorsal, offline, hijack*, amygdala, cortex, nervous system, neuroscience, language centres, alarm system(s) | error in validation; report-only elsewhere |
| `voice_distance` | I / my / me / I'm, I've, I'll, I'd | validation ("App lines speak as a witness (you, or the user's name); first person only in lines the user writes") |

**Structural rules:**
- `max_length` 90 characters (a slot counts as 8).
- `flooded_short`: level 1-2 and ≤8 words.
- Slots: only `{N} {word} {phrase} {need}`.
- `level3_tentative`.
- `level6_capacity`: bans strong, brave, amazing, special, worthy, deserve* (`voice-lint.mjs:46`).
- `reviewed_live`.
- `receive_before_change` (flow: a receive step precedes any change step; dormant until a flow declares step kinds).
- `skip_always` ("The receive beat always renders skip, none of these fit and say it my way").

**`scripts/voice-lint.mjs`:**
- Runs in `npm test` and gates `load-graph.mjs` (exit 5).
- Lints flow docs against a shrink-only baseline (currently empty) for `find-the-feeling`, `invalidation-recovery`, `capacity`, `opposite-action-flow` and `practice-spine`.
- `--report` scans JSX text (never fails).
- **"Never linted: anything the user writes (OwnLine text)."** Own lines are capped at 140 characters, "stored as written, never linted or interpreted" (`functions/src/witness/types.ts:33`).

**Representative lines across levels:**
- **L1, flooded:** "A lot, right now." · "No rush here." · "Slow is fine here." (`content.py:323-328`)
- **L2, flooded:** "It feels like too much." · "Loud inside, right now."
- **L3:** "Maybe some of this anger is hurt underneath." (301) · "Maybe numb is what too much at once feels like." · "Maybe part of this is a fear of being pushed away." (303)
- **L4:** "If hiding kept you safe before, wanting to hide now makes sense." (255) · "If you've had to protect yourself before, this anger makes sense." · "Giving in made sense in that moment. Part of you was keeping things safe." (195) · "Your body was trying to protect you. That isn't weakness." (192)
- **L5:** "Of course you're angry. Something mattered to you." (234) · "Feeling small right now doesn't make you small." (117) · "Shame says something is wrong with you. Feeling it doesn't make it true." (178) · "The alarm is loud. That doesn't mean the relationship is over." (139) · "What you're feeling makes sense." (343)
- **L6:** "You can feel this and still choose your next step." (312) · "You can hold this fear without chasing." (137) · "You can know this hurt without needing them to be the villain." (110)
- **The {N} form:** "{N} can hold this fear without chasing." (the angry-part vote of confidence would use this).

**WitnessBeat UI (`src/components/witness/WitnessBeat.tsx`):**
- The user's words are echoed alone for 600 ms, then one line in `font-light italic` (a different weight).
- Optional "Did that land?" with Yes / Sort of / No (never at flooded, `src/lib/witness.ts:59-63`). After a second No: "That's okay. It doesn't need the right words right now."
- Always present as text links: "Keep this line", "None of these fit", "Say it my way" (textarea "In your own words", max 140), "Skip".
- "It never blocks the host … No confetti, no colour change, no emoji. Reduced motion: no fade, no wait."
- **Fade stages** (`functions/src/witness/rank.ts:73`): over time the user's own lines replace the app's (stage 2 after the first own line or 8 landed yeses).

---

## 5. Visual system

**Fonts (`src/index.css:21-27`, `index.html`):**
- `--font-sans` Hanken Grotesk ("the tool talking").
- `--font-serif` Newsreader ("the voice (headlines, the app's reading of the person)").
- DM Sans is loaded for the Tune room.
- h1/h2 are globally serif, weight 400, -0.015em (716-724). Uppercase headings fall back to sans.
- Serif italic is used for the person's words: `.fs-tag`, `.body-mirror__word`.

**Colour architecture (31-48):**
- Three layers: PALETTE (`--pal-*-light/dark`, generated per room between `ROOMS:BEGIN/END`, lines 50-447), THEME (resolves `--color-*`), and DERIVED (color-mix tints).
- "Components only ever use --color-*."
- Room-only tokens: `--color-wall`, `--color-accent-lip`, `--color-lip`, `--color-on-quadrant`, `--color-fam-{dt,er,ie}[-text|-lip]`, `--square-*`.

**Rooms (headers and key hexes):**

| Room | Mode | Description | Page | Action | Quadrant HU / HP / LU / LP |
|---|---|---|---|---|---|
| Velvet (default) | dark | "deep plum walls, warm lamp light, brass action" | #231827 | #E8B56E | #EE6A55 / #F4BC48 / #5E7FEA / #3FBF8E |
| Dusk | dark | "cool slate, muted colour, one warm brass light" | #2E3542 | #D8B48C | muted versions |
| Tinted | light | "warm plaster, colour washing in from the corners" | #E8DFD1 | #7A5B2E | — |
| Pastel | light | "blush into sky, candy corners, coral action" | — | #FFA898 | — |
| Pastel mix | light | periwinkle action | — | #B3C1FF | — |
| Daylight | light | indigo action | — | #2F3FA8 | — |

- Velvet's families: dt #2B4A4D / er #3A3160 / ie #4A2A3A.
- Picker taglines are in `src/data/palettes.ts:39-76` (for example Velvet: "Deep plum walls and warm lamp light.").

**Skill families (`src/data/skillFamilies.ts`):**

| Key | Colour | Label | Module |
|---|---|---|---|
| dt | teal | "Get through it" | distress tolerance |
| er | lavender | "Shift it" | emotion regulation |
| ie | rose | "With other people" | interpersonal |
| (none) | none yet | "Notice it" | mindfulness |

- `.tool-card[data-family]` uses the family colours (`index.css:1043-1064`).
- An IFS or Wise Mind tool would likely sit under mindfulness ("Notice it", no colour yet) or emotion regulation.

**Controls (`index.css`):**
- `.lift-primary` / `.lift-secondary`: pressable lips (860-890).
- `.den-chip`: 54px pressable choice; `--small` is 44px; `--er` and `--dt` variants (998-1040).
- `.add-spot`: dashed invitation, "Something else in there too?" (1066-1093).
- `.help-now`: "always the same outlined pill, so it is findable at a glance" (1113-1137).
- `.seg`: segmented control.
- Hit targets are consistently `min-h-11` (44px).

**Motion:**
- Easings: `--ease-default`, `--ease-enter`, `--ease-exit`.
- Keyframes: fadeIn, stepEnter, popIn, breathing, ripple, bloom.
- Global `prefers-reduced-motion` kills animation (749-755).
- The `motion` library is used through `LazyMotion` and `domAnimation`.
- Rule: no entry animation except one earned moment per flow. Legacy code still uses `animate-fade-in` in places.

**Find the feeling rooms (`src/components/tools/findTheFeeling/`, lazy-loaded):**
- **Shape it** (`shape/ShapeRoom.tsx`, `Scene3D`, `blobMaterial.ts`, `Stage2D.tsx`, `Regulate.tsx`):
  - A three.js `MeshPhysicalMaterial` blob whose vertices are displaced by five "feel" dims: sharp, heat, weight, buzz, clench (plus a derived grey).
  - Five rounds of "Which is closer to what's inside?" with Roman-numeral counters (sharp/soft, hot/cool, heavy/light, buzzing/still, clenched/hollow; "can't tell" keeps a dimension neutral).
  - Falls back to an SVG/2D stage if WebGL fails (`GLBoundary`).
  - Regulate: "Smooth it down. Slowly. / Stroke it gently with your finger." Slow strokes in the C-tactile band calm it; fast ones make it flinch ("Slower, like stroking a sleeping cat."). In shutdown: "Warm it up. Rub it briskly, like cold hands."
  - Always "Or press and hold here" and "That's enough for now".
  - Collection: "Your shelf".
- **Tune it** (`tune/TuneRoom.tsx`, `audio.ts`, `Instrument.tsx`, `Harp.tsx`):
  - Web Audio with "two detuned strings + filtered noise + tremolo + a generated-impulse reverb. Only ever created from a user gesture (the Sound switch)."
  - Search: "Is this closer to how it feels, or further?" with Closer / Further / That's it.
  - Regulate: "Breathe them back into tune. Hold anywhere while you breathe in." "Wake the strings. Pluck them."
  - Collection: "Your strings", a canvas harp, one string per word.
  - Ambient descent drifts the sound calmer.
- **Word step:** "Things shaped like this are often called…" with Yes / Close / Not that. Then "Not knowing the word is fine. You found it without one, and that counts."
- **Close:** "Which is closer to how you feel right now?" Then / Somewhere between / Now / Now, and even calmer.
- All copy is in `src/data/content/find-the-feeling.json` (generated from the graph).

**Body map (`components/checkin/body/`):**
- `HeatFigure`: a soft silhouette (`.heat-figure__body` is a neutral mix); drag to a place, lift to choose. Glows are blurred, coloured by the word's home quadrant (`bodyMark.ts`), and sized by strength.
- `StrengthBar`: a vertical slider beside the figure.
- `BodyMirror`: map tabs (at most 3) plus Together (stripes); ghost places dashed and hatched; chips under "Sound familiar? Tap any that fit"; "+ Add all of these"; the disclaimer.
- Card: "My chest feels…", Both / Your left / Your right.

**Prototypes:**
- **goblin-lab** (`prototypes/goblin-lab/`): reference prototypes for Stage / Shape / Tune, built for "Recover from a hurtful moment".
  - SPEC: "Every idea here must be an interaction paradigm you do NOT see in wellness apps. Banned: chat bubbles, swipe decks, mood weather, emoji faces, sliders, 1–10 or any numeric/graded scale, progress-percent, streaks, confetti, a mascot talking." "Recognise, don't rate."
  - Stage: a 3D diorama with figures you, them and o1-o3, read live into a scenario and pull, using GSAP. Shape: a shader sculpture. Tune: canvas strings with a Web Audio synth.
  - The shared `script.ts` holds the scenarios, validation ("Of course that got to you. You got {phrase}, and that stings for anyone."), exits and close.
  - Known prototype bug: it sends every blank to activation.
- **somatic-lab** (`prototypes/somatic-lab/`): nine vanilla HTML Wave-1 body-tool sketches.
  - The tools: Press and push · Hand on heart · Squeeze and drop · Voice room ("Hum to grow a moss creature") · Outside-in scan · Shake and stomp · Pocket stone ("You don't have to feel better to do this… something even slightly okay") · Sound compass + Edge glow · Yuck or queasy.
  - Each is tagged with the bands it suits (for example "safe default for flooded + blank and far away").
  - Mic analysed on device only. "Copy, gates and the 'what we'd log' output are placeholders."

---

## 6. Navigation, Today, Reflect and safety

**Routes (`src/App.tsx`, HashRouter):**
- `/login`, `/signup`.
- Inside `DashboardLayout`: `/` CheckIn; `/tools`; `/history` (Reflect; `/insights` redirects there); `/profile` (Me); `/tool/:toolId` (ToolPage, with slug redirects such as `circuit-breaker`).
- Nav (`Sidebar.tsx:5-7`): Check-in · Tools · Reflect, then Me at the bottom. Labelled bottom tabs on mobile.
- Exercise pages and Tools use a "focused" layout: no greeting, no side panel (`DashboardLayout.tsx:10-26`).

**Today stack (`components/today/TodayStack.tsx`):**
- At most 3 cards plus "N more": follow-ups, tool outcomes, OA plans, pattern offers.
- Shown in the desktop side panel (`InsightsSidePanel`) and, below lg, behind a header Today button.
- Hidden during a check-in (`useHideToday`) "so it is never beside a result or the crisis banner."
- **A flooded band collapses it:** "Your plans will keep." / "Show them".
- Follow-up copy is in `scripts/practice-spine/content.py` (for example "Yesterday's hurtful moment / Compared to yesterday, it's…", "Something we noticed / Want to keep this in Me?", "Still true? / Something you told us a while ago.").

**Session close (`SessionClose.tsx`, `practice-spine/content.py:28-59`):**
- One tap, skip always present.
- "Compared to when you started, it's…" Louder / About the same / Quieter / Much quieter.
- Orient: Further away … More here.
- "Did you act on the urge?"
- Saved: "Noted."

**Reflect (`src/pages/History.tsx`, `Insights.tsx`):**
- Tabs: Insights · History · DEAR MAN (accent-filled, a legacy style).
- Insights:
  - `FormulationCard`: the pattern headline, body, a "Why certain tools help" mechanism, and "What's been working for you" tool pills.
  - `ProactiveAlert` ("Heads up" plus a "Try {tool}" link).
  - `GrowthEvidence`, `SomaticCorrelation` (body regions), `ToolEffectiveness`.
  - Empty slots are dashed placeholder cards with emoji (for example "We're still building a picture of your dominant nervous system pattern").
  - The design plan wants these replaced by one-line empty states.
- Data comes from `getInsightsData` (outcomes are the spine's then-vs-now).

**Safety system (principles for any deep-processing feature):**
- **CrisisBanner** (`components/safety/CrisisBanner.tsx`, `src/lib/crisisBanner.ts`): "Crisis resources as a non-blocking banner … resources sit alongside the tools, never instead of them."
  - Copy: "We hear you" / "When it gets this intense, you don't have to carry it alone. You can talk to someone right now, any time." / "Call 988 (Suicide & Crisis Lifeline)" / "Text HOME to 741741".
  - It "Must work for someone who is flooded but not suicidal."
  - A server-side `TRIGGERS_SAFETY` flag only. "One word never raises the crisis banner."
- **Help now** (`HelpNowInterim.tsx`):
  - From both check-in screens: one safe body micro-step, "I did it", "Show me something else", and quiet links to Circuit Breaker and 5-4-3-2-1. "That counts." / "Back to check-in".
  - No check-in, no routing call. It records a `help-now` ToolSession.
- **TooMuchLink** (`capacity/TooMuchLink.tsx`):
  - A quiet "This is too much right now" on every screen of a gated tool.
  - Opens P2 as a full-screen overlay; the host stays mounted and resumes the same step.
- **BreakdownHandoff** (P2):
  - Card → primitive (sigh `BreathOrb` / orient) → reread → resume, or a second primitive, or "come back later".
  - "Never a third primitive, never a lock: 'Keep going anyway' is always there."
  - Copy (`scripts/capacity/content.py:43-61`): "This is a body moment, not a thinking moment. That's not you failing; it's what brains do when they're this loud." / "Keep going anyway" / "Thinking may feel slippery right now. Short answers are fine." / "Picking up where we were." / "You can stop here. Nothing is lost." / "Saved for later. It will keep."
- **BandGate:** now renders nothing. It carries a reading under 20 minutes old or continues with no band. The capacity probe is removed: "Don't bring it back, or a reworded version" (CLAUDE.md:49-53).

**Flooded handling everywhere:**
- Recommendations go body / orient only.
- The witness beat becomes one line of 8 words or fewer, merged into the header, with no question.
- FTF regulates before the word, and flooded + blank skips the word.
- Today collapses.
- In DEAR MAN the BandRule for flooded is "handoff".

**Implied rules for a parts feature:**
1. Gate deep work behind non-flooded.
2. Body first when flooded.
3. Never activate exile or memory content solo ("protector level only").
4. Always offer TooMuchLink and P2.
5. Never lock; use heads-up plus choice.
6. The crisis banner sits alongside, never replaces.
7. "I don't know" is always complete.
8. Receive before change.
9. Clinical sign-off and `SIGNED_OFF` for all copy.

---

## 7. Data consent: quoted principles

- **CLAUDE.md:127-135:**
  - **Ask-fresh:** "Changes within a day → always asked, never pre-filled from memory. The one carry is the client-only `band.current()` (≤20 min, never read back from the server)" (fields include `wiseMindAnswer`).
  - **Log:** "Describes a moment. Append-only and **finalise-once** … Never used to pre-fill a live flow."
  - **Profile:** "Would make the user re-answer next time → profile, pre-filled with 'still true?'. **Nothing moves log → profile without the user's yes**."
  - "`FOUND_WORD` (User → Emotion) is a log aggregate, not a profile edge: it accumulates without a yes."
  - "Retention deletes log records only, never profile items."
- **`functions/src/profile/items.ts:1-4`:** "Scheduled code must never import this module (rule 4: nothing moves log → profile without the user's yes; a grep test enforces it)."
- **`functions/src/profile/patternOffers.ts:1-6`:** "The app offers, the user decides (rule 4): a rule over the log creates a PatternOffer (log); only answerPatternOffer's 'yes' creates a MyPattern (profile)."
- **`functions/src/userdata/layers.ts:1-20, 63-75`:**
  - Ask-fresh fields are "Never a node, never on User, never on a ProfileItem, never in a profile slice."
  - `SAVED_LINE` is a profile edge "on an explicit keep".
- **`StillTrue.tsx`:** "'Not any more' sets the item aside; it is never deleted silently and can be restored from Me."
- **`profileTypes.ts`:** "PROFILE_NEEDS is code, reviewed per PR: a content load can never widen what a tool reads."
- **Own words:** "stored as written, never linted or interpreted."
- **Recover:** sessions store "ids and numbers only, no free text."
- **OA:** "Explicit saves only; no localStorage, logging of exercise text, or LLM calls."
- **The body mirror's pre-fill** is only from typical maps, with "Change anything that isn't true for you" and an explicit "Keep this place" (`fromMirror: true`).
- **`UserProfileContext`** is settings only: "profile-layer data never goes here."

**Implication:** a user's named parts (for example "the Critic") would be **profile** items, created only on the user's explicit yes, revisited with "still true?", set aside rather than deleted, and readable only through `PROFILE_NEEDS`. Per-moment answers (which part is up now, how blended) would be **ask-fresh** or log, and never pre-filled.

---

## 8. Tool catalog (`src/data/tools.ts`)

CLAUDE.md calls the grouping field `category`; in code it is `module`.

| id | name | module | tagline |
|---|---|---|---|
| `cool-down` | Circuit Breaker | distress-tolerance | "Use temperature to calm fast" (TIP; slug `circuit-breaker`; `bare`) |
| `pause` | Pause | distress-tolerance | "Stop before you act" (STOP) |
| `five-senses` | 5-4-3-2-1 | distress-tolerance | "Ground yourself through your senses" |
| `urge-surfing` | Urge Surfing | distress-tolerance | "Ride the wave without acting" |
| `opposite-action` | Do the Opposite | emotion-regulation | "Act opposite to unhelpful urges" |
| `find-the-feeling` | Find the feeling | emotion-regulation | "When something's there but you can't tell what" |
| `problem-solve` | Problem Solve | emotion-regulation | "Address the cause of distress" |
| `dear-man` | Ask for what you need | interpersonal-effectiveness | "A step-by-step script for hard conversations (DEAR MAN)" |
| `recovering-from-invalidation` | Recover from a hurtful moment | interpersonal-effectiveness | "When someone brushed you off, mocked you, left you out, or pulled away" |

- No mindfulness tool exists yet.
- **Intents** (`tools.ts:124-134`), the plain-language entry layer:
  - "I can't tell what I'm feeling"
  - "Recover from a hurtful moment"
  - "Calm down fast"
  - "Pause before reacting"
  - "Ground myself"
  - "Ride out an urge"
  - "Shift a feeling that isn't helping"
  - "Work through a problem"
  - "Ask someone for what I need"
- **Adding a tool** means:
  - a `toolComponents` entry (`ToolPage.tsx:17-27`);
  - a close kind in `functions/src/spine/tools.ts` and `src/lib/spine/close.ts`;
  - `PROFILE_NEEDS`;
  - to be routable, a concept `appToolId` and `RECOMMENDED_FOR` rows in `scripts/recommendations/content.py`.

---

### Key files for the parts feature
- `/home/claude/goblin-dbt/docs/design/alexithymia-first-interaction.md` (lines 79-92)
- `/home/claude/goblin-dbt/docs/design/recover-from-invalidation.md` (lines 102-132)
- `/home/claude/goblin-dbt/docs/design/branding-kit.md`
- `/home/claude/goblin-dbt/docs/design/app-design-plan.md`
- `/home/claude/goblin-dbt/docs/design/den-rooms.md`
- `/home/claude/goblin-dbt/schema/knowledge-graph.cypher` (lines 900-1063)
- `/home/claude/goblin-dbt/schema/relationships.cypher`
- `/home/claude/goblin-dbt/scripts/witness/content.py`
- `/home/claude/goblin-dbt/scripts/witness/voice-rules.json`
- `/home/claude/goblin-dbt/scripts/voice-lint.mjs`
- `/home/claude/goblin-dbt/scripts/profile-layer/content.py`
- `/home/claude/goblin-dbt/src/data/profileTypes.ts`
- `/home/claude/goblin-dbt/functions/src/userdata/layers.ts`
- `/home/claude/goblin-dbt/src/components/me/MeSection.tsx`, `StillTrue.tsx`, `PatternOfferCard.tsx`
- `/home/claude/goblin-dbt/src/components/witness/WitnessBeat.tsx`
- `/home/claude/goblin-dbt/src/components/capacity/`
- `/home/claude/goblin-dbt/src/components/safety/CrisisBanner.tsx`
- `/home/claude/goblin-dbt/src/index.css`
- `/home/claude/goblin-dbt/src/data/skillFamilies.ts`
- `/home/claude/goblin-dbt/src/data/tools.ts`
- `/home/claude/goblin-dbt/scripts/recommendations/content.py` (line 128, the Wise Mind tag; line 252, the switched-off row)
- `/home/claude/goblin-dbt/prototypes/goblin-lab/` (Stage figures; the unused `Goblin.tsx` mascot)