# Parts (IFS): runbook and handover

Written 14 Oct 2026 for whoever picks this up next, human or a fresh Claude session. It covers what was
asked, what direction was given, how the work was done, everything that was produced, where it lives,
and what to do next. Read this first, then `parts.md`.

**16 Oct update.** Phase 0 is built on PR #49 (branch `claude/project-thread-2wmq14`): the vocabulary and
all parts copy as draft graph content, the parts voice lint, and data fixes 1, 2 and 5. The harness now
reads `tests/fixtures/parts-content.json` (`dev/parts-fixture.ts` became `dev/parts-example.ts`). Where
this doc and `parts.md` differ, `parts.md` is current.

---

## 1. The brief, as given

Claudia's request (6 Oct 2026), verbatim in substance:

> I want to incorporate IFS into Goblin DBT. I'm thinking that we can store "parts" on the profile,
> and we could potentially discover them through patterns. Use Claude in Chrome, online research, and
> creative thinking / design to REALLY think about how we could implement this in a sophisticated way,
> both in terms of sophisticated design and sophisticated IFS therapy. Think about how we could
> incorporate the information we could pull from the modules we have in the app into discovering /
> helping / etc those parts, ultimately helping toward integration. Use whatever resources you need:
> subagents, anything else.

Direction given during the session:

- "Can you give me your thinking for all of these?" (the ten *Never* rules). Answered in chat; the
  substance is now §6 of this doc and should be folded into `parts.md` (see Next steps).
- "I switched to the branch and ran npm run dev but don't see anything" → she wanted to *see* it, so a
  dev harness was built.
- The stop hook on her side (`~/.claude/stop-hook-git-check.sh`) requires every commit pushed and no
  untracked files before a session ends. Work on a branch, never main; push after every commit.

Standing rules from `CLAUDE.md` that shaped everything:

- Recognise, don't rate: no rating scales anywhere (`alexithymia-first-interaction.md`).
- Nothing moves log → profile without the user's yes (rule 4). Ask-fresh fields never on a profile item.
- The capacity probe is out (30 Sep); don't bring it back or reword it.
- All clinical content in the graph as drafts until `SIGNED_OFF`; voice contract in
  `scripts/witness/voice-rules.json`.
- Every PR ends with a Deploy section; Claudia runs every deploy and graph load herself.
- Product changes get an Obsidian changelog entry (vault not reachable from sessions; give her the
  text).

---

## 2. What was produced, and where it lives

Everything is on branch **`docs/parts-design`** (pushed to `origin`, no PR opened). `main` is untouched.

| Artefact | Path | Commit |
|---|---|---|
| **The design spec** (968 lines) | `docs/design/parts.md` | 99af73d, updated in 1db659c |
| **Dev harness** (Meet a part, den, part card, trail offer) | `dev/parts.html`, `dev/parts-harness.tsx`, `dev/parts-fixture.ts`; registered in `dev/vite.harness.config.ts` | 1db659c |
| **Research briefs** (4 subagent reports, ~240 KB) | `docs/design/parts-research/01–04` | this commit |
| **Independent review** of the first draft (25 findings, all folded in) | `docs/design/parts-research/05-independent-review.md` | this commit |
| **This runbook / handover** | `docs/design/parts-handover.md` | this commit |
| **Visual companion page** (published artifact, not in the repo) | claude.ai artifact "Goblin Parts" (den map with July/now snapshots, phone mockups of the flow, trail offer, pipeline, build order). HTML source was at the session scratchpad `goblin-parts.html`; it is **not** in git | — |
| **Changelog entry** for Obsidian | bottom of `parts.md` ("Changelog entry") | — |

To see the harness on the Mac:

```
cd ~/Documents/goblin-dbt
git switch docs/parts-design      # not origin/docs/parts-design
git pull
npm run dev
# open http://localhost:5173/dev/parts.html  (the app at / is unchanged)
```

URL params: `?view=meet|den|card|offer`, `?move=hide|chase|hit_back|keep_the_peace|turn_on_myself`,
`?palette=velvet|dusk|tinted|pastel|pastel-mix|daylight`. The page shows, after each run, what would be
saved split into log vs profile. If `git pull` refuses over `dev/vite.harness.config.ts` (Claudia had
local edits to it): `git stash; git pull; git stash pop`, keep both `input:` entries.

---

## 3. How the work was done (the runbook)

Reproducible sequence, so the same approach can be reused for another modality or feature.

### 3.1 Ground in the repo first (≈15 min)

1. `list_repos` → attach `claudiasellers/goblin-dbt` → shallow clone → `register_repo_root` (loads
   `CLAUDE.md`).
2. Grep for prior art: `ifs|internal family|parts|exile|firefighter|self-energy` across `schema/`,
   `docs/design/`, `src/`, `scripts/`. Found: 9 `ifs_*` TherapyConcepts with no `appToolId`, the
   agreed-but-unbuilt *angry part* envelope in `alexithymia-first-interaction.md`, the *Stage it* v2
   Recover direction, Problem Solve's "Part of me doesn't actually want this to change", DEAR MAN's
   `underneathIds`, the witness line "Part of you was keeping things safe."
3. Read the angry-part section, Stage it, `scripts/profile-layer/content.py` (pattern offers), and the
   Velvet/Tinted room tokens in `src/index.css`.

### 3.2 Fan out research in parallel (4 subagents, one message)

| Agent | Question | Output |
|---|---|---|
| Inventory | Every per-user field each module saves, with file:line, layer, edges, UI copy, and what it could signal about a part | `01-user-data-inventory.md` |
| Design | Design docs, principles, rejections, the goblin brand, Me surface, witness voice contract, visual system, safety system, consent principles, tool catalog | `02-design-and-product-briefing.md` |
| Clinical | IFS mechanics (6 Fs, feel-toward, protector fears, polarisations, unburdening), self-guided safety scope, IFS Institute AI/trademark positions, evidence base and critiques, IFS×DBT integration, schema modes, measurement instruments | `03-ifs-clinical-research.md` |
| Landscape | Existing IFS apps, community harms, parts-map representations, fiction/game precedents, EMA/idiographic/JITAI literature, mixed-initiative HCI, ethics | `04-apps-landscape-and-design-patterns.md` |

Reddit was blocked for every route tried (subagents, the proxy, and Claude in Chrome on Claudia's own
machine: "This site is not allowed due to safety restrictions"). The landscape brief lists the hand
searches to run on r/InternalFamilySystems.

Chrome *was* used for two primary sources the agents had summarised: Nick Barr's "Enhancing
Self-Therapy with IFS and AI" (allbein.gs/ifs) and the InnerPond CHI 2026 paper (arxiv 2603.27563).
Both shaped the design (complementary vs competitive cognitive artifact; metaphor shapes relationality;
"provisional starting points").

### 3.3 Design, write, verify

1. Wrote `parts.md` in the house's own doc format (status line, umbrella links, decisions, rejected,
   data model, build order, sources, changelog entry).
2. **Verified every repo fact cited**: grep for each node label and id (`ActionUrge`, `MomentResponse`,
   `TurningPoint`, `DearManBarrier`, `BarrierSubResponse`, `QuestionResponse`, `BodySignal`, every
   `tp_*`/`mr_*`/`thought_*` id, `OFFER_EVERY_DAYS`, `lifecycle.ts` guards, `patternOffers.ts`
   hardcoding, `band.record` call sites). Two corrections came out of this (DEAR MAN node labels; FTF
   and Recover pulls aren't nodes).
3. **Ran the house voice rules** over every proposed line of user-facing copy with a small Node script
   against `scripts/witness/voice-rules.json` (+ the 90-char structural rule). Two lines failed and were
   rewritten.
4. **Independent review**: a fresh agent reviewed the draft cold as clinician + engineer + designer.
   25 findings, several safety-critical (no flood signal exists; unblend line broke opt-in; "disappear"
   echoes ideation; own words skipped the tender stop). All folded into a full rewrite. See
   `05-independent-review.md`.
5. Re-linted the new copy; one 92-char line shortened.

### 3.4 Make it visible

1. Published the "Goblin Parts" artifact page (hand-built HTML, Velvet tokens, interactive den and
   press-and-hold moment), checked at desktop and phone width with Playwright (no overflow, no errors).
2. Built the in-repo harness from real components: `SvgBlob` (Shape room object), `HeatFigure` (body
   map), `TooMuchLink` (P2 overlay), `den-chip` / `lift-primary` classes, all six rooms. Fixture copy in
   `dev/parts-fixture.ts`. Typechecked with `tsc --noEmit`, walked end to end with Playwright at 420px
   (the body place is picked by keyboard in the script because the SVG intercepts clicks), lint budget
   unchanged at 4.

### 3.5 Git hygiene

- Branch `docs/parts-design` from `origin/main`; commit with the session's attribution trailer; push
  with `-u`. The stop hook fires on a stale remote-tracking ref in shallow clones; `git update-ref
  refs/remotes/origin/<branch> <sha>` after confirming with `git ls-remote` quiets it.

---

## 4. The design in one page

For the full thing read `parts.md`. The shape:

1. **The app finds trails; the person names parts.** A *trail* (log) is a recurring protective move in a
   recurring situation, ≥4 episodes, ≥2 tools, with the evidence shown as receipts. A *part* (profile)
   exists only after the person says "that's a part of me" and names it. No app on the market does this;
   those that infer parts do it from chat or questionnaires and assign roles automatically.
2. **Three timescales.** In the moment: one unblend line, only from a move the person just picked
   ("A part of you wants to hit back right now"). Afterwards: *Meet a part* (the six Fs rebuilt from
   Shape it, the body map and chips; feel-toward only ever pauses, never certifies Self). Over weeks:
   check-backs ("Is {name} still doing the same job?"), updated jobs, *Two pulls* on Stage ending in a
   both-and keepsake.
3. **Protector level only.** No exile witnessing, no memory questions, no unburdening. Tender fears or
   own words stop kindly; tender parts get presence only.
4. **Self is the light, not a figure.** The den: faceless figures in lamp light; you are the lamp.
5. **Skills are how you look after a part.** Per-part "what helped" from tagged closes; DEAR MAN
   cope-ahead per part; OA's goal line; the behaviour stays the person's own.
6. **Opt-in** in Settings → Privacy & Data, with dissociation lines. Shutdown moves are never offered.
7. **Vocabulary**: 10 `ProtectiveMove`s mapped from every module's existing ids via `EXPRESSES`
   (mirrors `vocabulary.py`'s `SIGNALS`).
8. **Build order**: 0 data fixes + flood-signal decision → 1 angry part → 2 Meet a part + Parts of me →
   3 tags + per-part help → 4 trails → 5 den + Two pulls (needs Stage) → 6 Wise Mind.

---

## 5. Key findings a new session must not re-discover

- **There is no flood signal.** `band.record` is called only in `FindTheFeeling.tsx:78` and FTF saves
  `band: null`. `BandGate` carries nothing. Every "not when flooded" rule needs server-side gates on
  stored `CheckIn.activationPatternId` / `routingBand` / `safetyFlagId` / `hu_exp_flooding`, and the
  client entry gate is **Claudia's open decision** (not the probe, not a rewording).
- **Data the design needs is thrown away today**: per-spot words of a mixed check-in
  (`CheckIn.tsx handleWordsContinue`), Problem Solve's barrier/ambivalence/confidence answers, OA
  sessions where the urge was judged helpful, Urge Surfing's urge, `ToolSession.emotionIds`/`urgeIds`
  (validated, always `[]`). Six data fixes listed in `parts.md`.
- **The graph overclaims**: `(ifs)-[:TREATS]->(bpd)` with zero IFS studies in BPD (Francis, Fino & Heym
  2026); `ifs_self ↔ dbt_wise_mind` typed `functional_equivalent` (should be `parallel`).
- **Finalise-once** (`lifecycle.ts`): a finalised log record accepts only *incoming* edges. Tags must be
  their own log record (`PartTag -[:TAGS]-> record`).
- **The pattern-offer evaluator hardcodes `PatternRule` / `what_helps`** (`patternOffers.ts:76-81`);
  trail rules need their own label and a kind filter.
- **Trademark**: IFS Institute claims "Internal Family Systems℠", "IFS℠" and the "IFS Trained /
  Informed" designations; no "IFS" in feature names; non-affiliation line; counsel before shipping.
- **No IFS Institute statement on AI or apps was found** (searched through Oct 2026). Report as "none
  found", not "none exists".
- **Evidence**: one small RA RCT, one PTSD RCT with parity vs active control, no mechanism data, no
  BPD data, adverse events unstudied. Position IFS as a reflective layer on DBT, never a treatment claim.

---

## 6. Why the ten "Never" rules (Claudia asked; now also `parts.md` → *Why never*)

Firmness: 1, 2, 5, 8 are hard lines; 3, 4, 6, 9 firm positions; 7 holds until there's a flood signal;
10 is a judgment call to test.

1. **Exile witnessing, do-over, unburdening.** DBT is staged: trauma processing waits for Stage 2 and
   stability criteria; the app's users are largely Stage 1. The method needs an observing position with a
   therapist as backup; an app can neither detect blending reliably nor step in. Backlash lands on DBT's
   own targets (self-harm, bingeing, rage, shutdown) hours later when nobody is watching. No data on
   unaccompanied unburdening. Costs real IFS completeness; what survives is unblending, compassion for
   protectors, polarities softening, updating. Only a clinician-in-the-loop mode could change it.
2. **Any question about the past.** Origin questions are the doorway to exiles. Memory under activation
   + leading question + inviting frame is unreliable (imagination inflation); Castlewood lawsuits; the
   Institute's own corroboration rule (4 Nov 2025). An app can't corroborate, so it never elicits.
   Updating stays ("show it something you can do now"), the age chip stays (felt sense, not memory).
3. **Manager / firefighter / exile on screen.** They're interpretations (DBT "describe" leaves those
   out); the same behaviour is managerial one day, firefighting the next; the labels carry valence and
   become identities and rankings; "exile" pulls toward rule 1. Binds the app's copy only: a person may
   name a part "my firefighter". A glossary in About is fine.
4. **Archetype names or numbered parts.** Naming is the therapeutic act (affect labelling thesis);
   archetypes are Barnum-effect population guesses that pre-load content ("Inner Child" presupposes a
   wounded exile; "the Critic" sets up an enemy before befriending); numbers dehumanise (MyPTSD) and echo
   DID alter labelling. Tension: the descriptive suggestions ("the one who hides") still put words in the
   mouth; kept because a blank field is hard for alexithymic users; cut them for the stricter version.
5. **Automatic parts or roles.** Behaviour→part is many-to-many and only the felt sense disambiguates;
   within-person variance is 2–4× between-person (Fisher 2018); 56.5% of students with a diagnosis felt
   tracked data said something negative about them (Kelley 2017); wrong-guess costs are lopsided
   (missed trail costs nothing, wrong part costs trust and self-concept) → system proposes, person
   decides (Horvitz; rule 4). Roles are worse: intent is only knowable by asking the part.
6. **A specific part named in the moment.** Rule 5 at the worst time: a guess while blended, with no
   check; a wrong guess is invalidation. The generic line gets Kross's self-distancing benefit with the
   move the person just picked. Naming a known part invites judgement toward it (blending with a
   concerned part the app can't catch). Relaxable to person-initiated "who's here?" after Phase 3 data.
7. **Parts on check-in results or routing.** The result screen has one job and the crisis banner; the
   routing table is a reviewed clinical decision on a band the app no longer has; `rumination_loop`
   would get more inward focus; frequency reifies ("meet the part behind this" on every result = Inside
   Out). Revisit for steady, opted-in users once there's a flood signal.
8. **AI as a part or as Self.** Voicing a part writes the inner life for them (confabulation becomes
   self-knowledge, sycophancy + suggestibility = recovered-memory risk in new clothes; InnerPond found
   persona loops). Voicing Self replaces the capacity the method builds (Barr/Krakauer: competitive vs
   complementary cognitive artifact). Illinois/Nevada AI-therapy laws. Allowed: the app witnessing *to*
   you ("Part of you was keeping things safe").
9. **Collections, streaks, shareable cards.** Collections reward inventory (fragmentation by
   incentive; words can be collected because granularity is the good, parts can't); streaks punish the
   normal lapse and produce the shame half these protectors manage (goblin-lab spec already bans them);
   shareable cards make identity content and parts data is more sensitive than mood data.
10. **Parts language by default.** Reaches the people it harms most and the app can't screen them
    (Twombly's clients who didn't return; Parry 2022; reality-testing concerns); for alexithymic users
    parts can replace feeling words instead of building on them. Softest rule: default-off cuts reach.
    Prerequisites to flip it: a dissociation screen Claudia is comfortable with (same clinical decision
    as the removed probe) and co-design with dissociative/plural users.

---

## 7. State of play and next steps

**Done**: spec, harness, research saved, review folded in, all pushed to `docs/parts-design`.
**Not done**: no PR; nothing signed off; nothing in the graph; Obsidian changelog entry not pasted
(vault unreachable from sessions; text is at the bottom of `parts.md`).

Suggested order:

1. **Claudia reads `parts.md` and plays the harness.** Decide the eight open questions at the end of
   the spec, above all **the flood signal** (blocker) and **opt-in default**.
2. **Fold §6 above into `parts.md`** as a "Why never" section (the DBT-staging argument for rule 1 isn't
   in the spec yet and is the strongest case).
3. **Open the PR** for `docs/parts-design` (docs + dev harness only; Deploy section: nothing to run).
   Link: https://github.com/claudiasellers/goblin-dbt/pull/new/docs/parts-design
4. **Paste the changelog entry** into Obsidian (`Goblin DBT/Product Changelog.md`), status `planned`.
5. **Phase 0** (no UI): the six data fixes; `scripts/parts/content.py` + `build.py` producing
   `schema/parts.cypher` (`ProtectiveMove`, `EXPRESSES`, `PullOption`, `ProtectedHurt`, prompts/options,
   `PolarityPair`, `TrailRule`, `PartsPolicy`); `parts_prompt` / `parts_chip` lint scopes and the slot
   additions in `voice-lint.mjs`; the two graph fixes (IFS `TREATS` evidence grade; retype
   `functional_equivalent` → `parallel`). Move the harness fixture to a generated
   `tests/fixtures/parts-content.json` like the others.
6. **Clinical reviewer** (DBT + IFS + dissociation) before any copy goes in `SIGNED_OFF`; trademark
   counsel on naming; co-design sessions with plural/dissociative users before Phase 2 ships.
7. Then Phase 1 (the agreed angry-part card) and Phase 2 (Meet a part + Parts of me), each gated on
   the previous phase's harm signals.

---

## 8. Prompt for a fresh session

Paste this to pick up where this left off:

> Read `docs/design/parts-handover.md`, then `docs/design/parts.md`, in the `claudiasellers/goblin-dbt`
> repo on branch `docs/parts-design`. The research briefs are in `docs/design/parts-research/`. The dev
> harness is `dev/parts.html` (`npm run dev` → `/dev/parts.html`). Nothing is signed off; the blocker is
> that no flood signal exists since the capacity probe came out. Work on the branch, never main; push
> after every commit (the stop hook requires it). Follow CLAUDE.md's data-layer rules and voice
> contract; verify every repo fact you cite with grep; lint any new copy against
> `scripts/witness/voice-rules.json`. Then: [what you want next].
