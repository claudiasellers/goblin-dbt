# Goblin DBT: every plan, in one place

As of 11 Nov 2026 (`main` at `fce0195`). This page indexes plans; it doesn't restate them. Each row says
where the plan lives and whether it is **shipped** (in the app), **partial** (some of it is in the app, or
an interim stands in), **spec only** (written, no code on `main`) or **dead** (retired or overtaken; kept
for reference). Where a row is "spec only" but code exists on a branch, the note says which.

Three plans set the direction, newest first:

1. [dbt-modules-plan.md](design/dbt-modules-plan.md) (approved 10 Nov): finishing Distress Tolerance,
   Interpersonal Effectiveness and Emotion Regulation on the skill runtime, in three lanes, with 17
   decisions and three review gates. **This is the plan being built now.**
2. [Goblin DBT: where it stands and the path forward](https://claude.ai/artifact/QnR4Q9J8HEucUZXsPdq4T2)
   (3 Nov): keep the stack, add the skill runtime and one router. Threads 1–3 are done (this index,
   [skill-runtime.md](design/skill-runtime.md), auto-deploy); the router and Library are still ahead.
3. The Obsidian **DBT Module PRDs – Index** (30 Sep, 72 features): the master list and the evidence
   ranking. Every feature spec is still there.

**Where a doc belongs from now on**

| Kind of doc | Home |
|---|---|
| Anything that drives code (design specs, handovers, runbooks) | this repo, `docs/` |
| Product record, clinical research, module PRDs, morning recaps | Obsidian vault `Claudia-mac-mini/Goblin DBT/` |
| The project's shared folder (`/mnt/project-files/`) | hand-offs between threads (PRD copies, resume notes, screenshots) and the old claude.ai copies; not a home for plans |
| This index | here, `docs/README.md`. Update a row when a plan's status changes |

Paths below that start with `Goblin DBT/` are in the Obsidian vault (open them from the vault on the Mac).
Paths that start with `/mnt/project-files/` are in the project's shared folder (the Library in the
Claude project).

---

## 1. Where it stands

- **The master plan: 72 features.** 11 shipped, 19 partial, 41 spec only, 1 dead (table in §2).
- **The skill runtime is real.** Skills are graph data (`scripts/skills/`), one player runs them, and five
  skills run on it: Check the Facts, It isn't working, Keep your self-respect (FAST), Rebel without the
  wreckage and Rewrite the nightmare. Problem Solve (PR #71) and Ending a relationship (PR #70) are open.
- **Deploys run on merge** since PR #52 (10 Nov), through the merge lane on the Mac (PR #60). "Shipped" on
  this page means merged to `main`.
- **Built off the plan:** Parts (IFS), Find the feeling, the body map, the Den, Reflect R1, Circuit
  Breaker and the palette picker (§3). Parts is the largest piece of code added since 1 Oct.
- **The safety batch (CORE-01, CORE-02, DT-03, the IE-01 safety question) is paused** (your call, 10 Nov).
  Where it stopped: `/mnt/project-files/handoffs/safety-plan-resume.md`. Until it resumes, a skill's
  `safety.open` exit opens the crisis banner as a full screen (modules plan D5). The check-in's optional
  self-harm question still waits on `routing/ties-weights-safety-question` (PR #47; §6).
- **Two decisions sat in closed, unmerged PRs and never reached `main`:** your witness-voice corpus
  rewrite with rule 4 (PR #25, `fix/voice-rules-lighter`: no line validates the intensity of a negative
  feeling, and a lighter lint) and the Running low (PLEASE) tool (PR #33). `main` still has the 1 Oct
  corpus and the strict lint, and none of the 110 check-in and tool-moment witness lines is signed off
  (16 Recover lines are live). See §6.

---

## 2. The master plan: the 72 features

Source: `Goblin DBT/DBT Module PRDs/DBT Module PRDs – Index.md`, §3 (order, evidence, dependencies). Each
feature's full spec is in its module's PRD: `Goblin DBT/DBT Module PRDs/PRD – <module>.md`. Status checked
against `main` (11 Nov) and the Product Changelog; the 1 Oct Master List (`DBT Skills in Goblin – Master List.md`)
is behind by Wise mind, Cope Ahead and the routing switch-on.

Waves follow the index: 1 safety floor and platform, 2 validation and the transformation core,
3 structure, urges and the between-moments half, 4 depth, curriculum and fade.

| # | ID | Feature | Status | What's there / what's missing |
|---|---|---|---|---|
| | | **Wave 1** | | |
| 1 | CORE-01 | Safety route: ask, route, local help | partial | Crisis banner (M0), and `safety.open` opens it full screen from any skill. Never asks. Spiral-path question on PR #47. Batch paused 10 Nov: `/mnt/project-files/handoffs/safety-plan-resume.md` |
| 2 | CORE-02 | Safety plan (Stanley–Brown) | spec only | Safety batch, paused 10 Nov (see CORE-01) |
| 3 | DT-01 | First, the body (Help me now + TIP) | partial | Help me now interim (`HelpNowInterim.tsx`: one safe step, Cool Down / 5-4-3-2-1); Circuit Breaker (PR #46). No `dt.regulate` primitive |
| 4 | ER-01 | Capacity band + breakdown hand-off | partial | Band store, gate, P2 hand-off and too-much link ship; the question was removed 30 Sep (CLAUDE.md). DEAR MAN is the only host |
| 5 | CORE-03 | Practice spine and Today | shipped | Phase A M2 |
| 6 | CORE-05 | Check-in continuity | shipped | Phase A M2: saves when the result renders |
| 7 | IE-03 | People (`Person`) | spec only | DEAR MAN asks who, remembers no one |
| 8 | IE-01 | Ask for what you need v2 (DEAR MAN) | partial | DEAR MAN, debrief and band gate shipped; the "is it safe with them?" question is in the safety batch |
| 9 | WMP-02 | Recover fidelity pass v1.1, then v2 on Stage | partial | v1 shipped 30 Sep; v2 on Stage spec only (`docs/design/recover-from-invalidation.md`) |
| 10 | DT-02 | Hold to wait (STOP rebuilt) | spec only | Pause is the old STOP. Phone prototype on local branch `dev/hold-to-wait`, never pushed (Changelog 6 Oct) |
| 11 | DT-03 | My crisis kit | spec only | Safety batch, paused 10 Nov. Contract in modules plan §2.1 |
| | | **Wave 2** | | |
| 12 | WMP-01 | Witness voice (validation layer) | partial | Built (A5). 16 Recover lines live; 110 lines drafts, none signed off; your corpus rewrite is on PR #25, closed unmerged |
| 13 | ER-02 | Check the facts | shipped | First skill on the runtime: [check-the-facts.md](design/check-the-facts.md), [skill-runtime.md](design/skill-runtime.md), `scripts/skills/check_the_facts.py`. Missing-fact step and safety chips added in ER-B1 (PRs #58, #67) |
| 14 | ER-03 | Opposite Action fidelity pass (flow v3) | partial | OA v2 shipped (PR #12). Feeling doors / multi-emotion on PR #48 (open, conflicts) |
| 15 | ER-06 | Route ER by state + engine change | shipped | rf-v2 switched on 5 Oct (PR #43); [checkin-routing-review.md](design/checkin-routing-review.md) |
| 16 | MF-01 | Notice it, name it (observe → describe) | partial | Inside the check-in, body step and Find the feeling; no practice of its own |
| 17 | MF-02 | Practice home, daily rep, fade | spec only | |
| 18 | WMP-04 | Middle-path router v0 (receive first) | shipped | `receiveFirst` + side labels, on with rf-v2 |
| 19 | MF-03 | Unpack a judgment | spec only | |
| 20 | MF-08 | What works here (effectively) | spec only | |
| | | **Wave 3** | | |
| 21 | ER-05 | Cope ahead | shipped | 17 Oct (PR #49); [cope-ahead.md](design/cope-ahead.md). Routing row off |
| 22 | CORE-04 | Diary card without numbers | spec only | |
| 23 | CORE-07 | Help me now router + shared routing table | partial | Interim screen only; no router |
| 24 | ER-04 | Good things + "things I like" | partial | Tiny-win activity on low-energy results only |
| 25 | WMP-05 | Small steps, real rewards (ladder) | spec only | |
| 26 | DT-05 | Ride it out (urge surfing rebuilt) | partial | Old Urge Surfing ships (copy fixed in M0); rebuild not done |
| 27 | IE-02 | Rehearse it (Stage) | partial | First-person rehearsal inside Cope Ahead; DEAR MAN's *Rehearse it* links there. No Stage runtime |
| 28 | CORE-06 | Day 0: orientation, commitment, goals | spec only | |
| 29 | ER-07 | PLEASE check | spec only | Built as *Running low* on PR #33, closed unmerged 2 Oct (§6) |
| 30 | DT-04 | Let it be (radical acceptance family) | spec only | Problem Solve and routing rows already point at it |
| 31 | WMP-03 | Say it to yourself (self-validation) | partial | Recover's self-compassion step; own lines in My words |
| 32 | DT-10 | Pros and cons | spec only | |
| 33 | CORE-11 | Missing-links analysis | spec only | |
| 34 | CORE-08 | Chain + solution analysis | spec only | |
| 35 | WMP-06 | Louder before it quits (extinction burst) | spec only | Parts' *Louder* pause is a different thing |
| 36 | IE-04 | Say no | spec only | |
| 37 | IE-05 | FAST | shipped | Keep your self-respect, two skills under tool id `fast` (PR #59): [fast.md](design/fast.md) |
| 38 | ER-08 | Let it be a wave (mindfulness of current emotion) | spec only | |
| 39 | ER-09 | What matters to me (values) | spec only | |
| 40 | IE-06 | GIVE | spec only | Routing row planned, off |
| 41 | DT-06 | ACCEPTS + attention ladder | partial | Attention-shift activity on low-energy results only |
| 42 | ER-12 | Problem Solve completion | partial | Problem Solve ships; saves nothing, no follow-up. On the runtime in PR #71 (open) |
| 43 | MF-04 | Wise mind | shipped | 17 Oct (PR #49); [wise-mind.md](design/wise-mind.md). Routing row off |
| 44 | IE-07 | What matters most (`SizeIt`) | partial | Embedded in DEAR MAN; no standalone |
| 45 | DT-11 | Alternate rebellion | shipped | Rebel without the wreckage on the runtime (PRs #57, #65): [alternate-rebellion.md](design/alternate-rebellion.md) |
| 46 | IE-08 | Ending a relationship that's hurting you | spec only | Built in PR #70 (open): safety first, nothing kept, quick exit. Unparked 10 Nov (modules plan D14) |
| 47 | IE-11 | When it didn't work (troubleshooting) | partial | DEAR MAN's debrief |
| 48 | MF-05 | One thing (one-mindfully) | spec only | |
| 49 | WMP-07 | Both can be true (dialectics) | spec only | Parts' Two pulls covers some of the ground for parts-on people |
| | | **Wave 4** | | |
| 50 | CORE-10 | Weekly review | spec only | |
| 51 | CORE-09 | Curriculum and module cycling | spec only | |
| 52 | ER-10 | Know this feeling (emotion guide) | partial | `FOUND_WORD` / My words ship; no guide |
| 53 | DT-07 | Held (self-soothe, body scan) | spec only | |
| 54 | ER-11 | Build mastery | spec only | |
| 55 | ER-13 | Sleep reset | spec only | |
| 56 | MF-06 | Kind wishes (loving-kindness) | spec only | |
| 57 | DT-09 | When it's a habit (addiction skills) | spec only | |
| 58 | IE-09 | Find your people | spec only | |
| 59 | MF-07 | Take a moment apart | spec only | |
| 60 | WMP-08 | Validate them | spec only | |
| 61 | CORE-12 | Outcomes, fade and graduation | spec only | Reflect shows what helped; no outcomes or fade |
| 62 | DT-08 | Thoughts passing through | spec only | |
| 63 | IE-10 | Notice them | spec only | |
| 64 | MF-09 | Doing mind, being mind | spec only | |
| 65 | ER-14 | It isn't working (ER troubleshooting) | shipped | On the runtime (PRs #58, #67): [er-troubleshoot.md](design/er-troubleshoot.md) |
| 66 | WMP-09 | Where am I swinging? | spec only | |
| 67 | IE-12 | What gets in the way (myths) | partial | DEAR MAN's barrier coaching |
| 68 | MF-10 | Join in (participate) | spec only | |
| 69 | WMP-10 | Change the pattern with them | spec only | |
| 70 | ER-15 | Rewrite the nightmare | shipped | On the runtime (PR #69), unparked 10 Nov (D14): [nightmare-rescript.md](design/nightmare-rescript.md) |
| 71 | CORE-13 | Optional clinician sharing | spec only | Export exists in Me; no sharing |
| 72 | MF-11 | Find the middle | dead | Retired into WMP-09 |

The rest of the PRD Index is reference for anyone building across modules: live defects (§4), ownership
rulings (§5), the connective map (§7), shared objects (§8), data layers (§8a) and the **shared primitives
registry (§9)**, which is the starting design for the flow runtime.

---

## 3. Built off the plan

| Plan | Status | Source |
|---|---|---|
| Skill runtime: skills as graph data, one player, the attempt record | shipped (4–10 Nov; five skills on it) | [skill-runtime.md](design/skill-runtime.md); content `scripts/skills/` |
| Finishing DT, IE and ER (lanes, contracts C1–C8, gates, decisions D1–D17) | in progress: approved 10 Nov, F1/F2 merged, lanes building | [dbt-modules-plan.md](design/dbt-modules-plan.md); read-only PRD copies for the lanes in `/mnt/project-files/handoffs/prds/` |
| The user profile: what's kept, what it powers, keep / edit / delete | partial: P1 and half of P2 shipped (PR #55); own-words migration, Me's delete UI to do | [user-profile.md](design/user-profile.md) |
| Parts (IFS): Meet a part, the den, a part's story, Two pulls, trails, offers | shipped (17 Oct; fixes #50 / #51); trail offers off until the dry run | [parts.md](design/parts.md), [parts-handover.md](design/parts-handover.md), [parts-research/](design/parts-research/); sign-off pack `/mnt/project-files/parts/parts-copy-review.md` (snapshot, regenerate with `node scripts/parts/review.mjs`) |
| Find the feeling (Shape it, Tune it) | shipped (30 Sep) | [find-the-feeling.md](design/find-the-feeling.md); `Goblin DBT/Specs/Find the Feeling – Shape it + Tune it.md` |
| Alexithymia-first direction: Stage, Shape, Tune | partial: Shape and Tune shipped, Stage spec only | [alexithymia-first-interaction.md](design/alexithymia-first-interaction.md); `Goblin DBT/Direction/Alexithymia-First Interaction – Stage, Shape, Tune.md`; `Goblin DBT/Direction/Decisions Log – Alexithymia-First Build (Sep 2026).md`; prototypes `prototypes/goblin-lab/` |
| Body map (heat figure, drag, strength, body mirror, several feelings) | shipped (steps 1–5, 5 Oct) | [body-map.md](design/body-map.md) |
| The Den (rooms, type, feeling square, result cards) | shipped (PR #23) | [den-rooms.md](design/den-rooms.md) |
| Check-in routing review rf-v2 | shipped (on 5 Oct) | [checkin-routing-review.md](design/checkin-routing-review.md) |
| Reflect R1: true numbers | shipped (PR #42); R2+ spec only | `/mnt/project-files/knowledge/claude/specs/reflect.md` (only copy; decisions in "Reflect decisions.xlsx") |
| Circuit Breaker (Cool Down rebuilt) | shipped (PR #46) | Product Changelog, 5 Oct |
| Palette picker | shipped (14 Sep) | [2026-09-14-palette-picker.md](design/2026-09-14-palette-picker.md) |
| App design pass, DEAR MAN review + token plan, branding kit, icon prompts | partial: tokens shipped, superseded by the Den for look; line icons not made | [app-design-plan.md](design/app-design-plan.md), [dear-man-design-review.md](design/dear-man-design-review.md), [dear-man-token-plan.md](design/dear-man-token-plan.md), [branding-kit.md](design/branding-kit.md), [icon-prompts.md](design/icon-prompts.md) |
| Opposite Action guided practice v2 | shipped (PR #12, 24 Sep) | [opposite-action-guided-flow.md](design/opposite-action-guided-flow.md); `Goblin DBT/Specs/Opposite Action – Guided Practice v2.md`, `… – Design Record (repo).md` |
| Opposite Action next plans (multi-emotion, "Not sure?" mirroring, doors) | spec only; doors built on PR #48 (open) | `Goblin DBT/Specs/Opposite Action – Next Plans.md` |
| Recover from a hurtful moment | v1 shipped; v2 on Stage spec only | [recover-from-invalidation.md](design/recover-from-invalidation.md); `Goblin DBT/Specs/Recover from a Hurtful Moment – Design Record (repo).md` |
| Interpersonal-wound interventions: Wound Path, The Ask, Angry part | partial: the Angry part card ships inside Recover (parts) | `Goblin DBT/Specs/PRD Interpersonal-Wound Interventions — Integration & Gamification.md`; `Goblin DBT/Research/Interventions for the Interpersonal-Wound Cluster.md` |
| Check-in emotion-selection redesign (Mar) | dead: replaced by the feeling square | [specs](superpowers/specs/2026-03-19-checkin-emotion-selection-redesign.md), [plan](superpowers/plans/2026-03-19-checkin-emotion-selection-redesign.md) |
| Tools page revamp (Mar) | dead: overtaken; the path forward replaces the Tools page with a Library | [specs](superpowers/specs/2026-03-23-tools-page-revamp.md), [plan](superpowers/plans/2026-03-23-tools-page-revamp.md) |

---

## 4. Platform and process plans

| Plan | Status | Source |
|---|---|---|
| Phase A build plan (E1 foundations, E2 spine/profile/check-in, E3 band/witness, E4 engine; 34 PRs) | shipped (30 Sep–5 Oct) | `Goblin DBT/DBT Module PRDs/Build Plan/` (Build Plan – Phase A, E1–E4, Deploy Guide, Merge & Deploy Runbook) |
| App as built, user-workflow map | dead as a status record (written at `1ef08b9`, 30 Sep); keep for its errata | `Goblin DBT/DBT Module PRDs/App Architecture – UX & Workflow Map.md` |
| Auto-deploy on merge, and the merge lane | shipped (PR #52, #60, #64, #68; 10–11 Nov) | `.github/workflows/`; the merge lane runs on the Mac |
| The path forward: flow runtime, skill catalogue as data, one router, Library | partial: index, runtime and auto-deploy done; catalogue as data, router and Library ahead | [Goblin DBT: where it stands and the path forward](https://claude.ai/artifact/QnR4Q9J8HEucUZXsPdq4T2) |
| RAG and generation direction | spec only; sits on top of the router (path-forward, after thread 5) | `Goblin DBT/Direction/RAG and Generation Direction.md` (same as `/mnt/project-files/knowledge/claude/rag-and-generation-direction.md`) |
| Slack crew (plan + six agent specs) | dead: project threads do this job; nothing was built | `Goblin DBT/Direction/Slack Crew – Plan.md`, `Goblin DBT/Specs/Slack Crew/`; copies in `/mnt/project-files/knowledge/claude/` (`slack-agents-plan.md`, `specs/{lead,graph,goblin,voice,lit,pulse}.md`) |
| Custom follow-up questions: where the data lives | shipped (generated content files) | `Goblin DBT/Data Considerations/Custom Follow-up Questions – Where the Data Lives.md` |
| Product Changelog | living: the status record for every product change | `Goblin DBT/Product Changelog.md` |
| Idea Backlog (loved ideas from the morning recaps) | living: 3 loved (light steps, put the dot down again, notice how the dot was placed), none specced | `Goblin DBT/Idea Backlog.md`; recaps in `Goblin DBT/Morning Recaps/` (29 Sep–7 Oct) |
| Parts changelog entries (Phase 0, 16 Oct decisions) | dead: already pasted into the Product Changelog (16 Oct entries) | `/mnt/project-files/parts/changelog-phase0.md`, `changelog-16oct-decisions.md` |
| Safety plan resume note (CORE-01/02, paused 10 Nov) | living: where the safety batch stopped | `/mnt/project-files/handoffs/safety-plan-resume.md` |
| Check the Facts handover (project copy) | dead: duplicate of the repo copy | `/mnt/project-files/handoffs/check-the-facts-handover.md` → use [design/check-the-facts-handover.md](design/check-the-facts-handover.md) |
| Opposite Action specs (project copies) | dead: duplicates of the Obsidian notes | `/mnt/project-files/knowledge/claude/specs/opposite-action-*.md` |

---

## 5. Research (feeds plans; no status)

All in `Goblin DBT/Research/` unless noted.

| Area | Start with | Also |
|---|---|---|
| DBT clinical reference | `Goblin DBT/DBT Module PRDs/Knowledge Base – <module>.md` (six) | `Architecture Map – <module>.md` (six): how each module wires to the others |
| Intervention library | `Intervention Library – Synthesis.md` (its "operating system" rules are the router's spec) | `Interventions – Fear, Overwhelm, Disgust.md`, `– Anger, Jealousy, Envy.md`, `– Sadness, Grief, Longing.md`, `– Shame, Guilt, Numbness, Rumination.md`; copies in `/mnt/project-files/knowledge/claude/research/` |
| Somatic | `Somatic – Phone-Only Priority Matrix.md` (current build order for somatic work) | Synthesis & Roadmap, Catalog, Digital Delivery & Mechanics, Tech Stack, Existing Coverage & Gaps, Beyond Breath (6 Oct), Field Survey + its seven source notes |
| EMDR and perceptual hacks | `Somatic – Perceptual Exploits (Mirror-Box & EMDR Classes).md` | `EMDR – Creative Integration.md`, `Perceptual Hacks – Illusions & Cross-Modal Overrides.md`; prototypes `Goblin DBT/Specs/exploit-prototypes/` and branch `labs/exploits` |
| Parts (IFS) | [parts-research/](design/parts-research/) | |
| Emotions list | `Goblin DBT/Graph/october second emotions list.md` | the words now live in `scripts/emotions/content.py` |
| Your notes | `Goblin DBT/Claudia Notes/` | alternate rebellion, attention redirection tasks, alexithymia feedback, the buddy system |

---

## 6. Branches

Checked 11 Nov. 20 branches are not in `main`. Besides the active thread branches, none is safe to merge
as it stands: each one conflicts with `main`, is overtaken, or was never meant for it. You approved the
cleanup on 3 Nov; this session can't delete branches (pushes are limited to its own branch), so
`/mnt/project-files/branch-cleanup/cleanup.sh` (in the project's Library)
does it from `~/Documents/goblin-dbt`: it archives the overtaken branches as `archive/…` tags, then
deletes them and the merged ones.

| Branch | PR | Last commit | Call | Why |
|---|---|---|---|---|
| `claude/project-thread-d9xzcy`, `claude/project-thread-u7okch` | #70, #71 open | 11 Nov | **active** | IE-08 and Problem Solve lanes |
| `claude/project-thread-jfrnbz` | #53 open | 11 Nov | **active** | This index |
| `routing/ties-weights-safety-question` | #47 open | 5 Oct | **keep → safety batch** | The only safety-batch code (optional self-harm question on the spiral path, ties go to your words). One conflict (`discriminating-questions.json`, regenerate). Rebase when the batch resumes |
| `fix/voice-rules-lighter` | #25 closed, unmerged | 1 Oct | **keep, decide** | Your corpus rewrite, rule 4 (never validate the intensity of a negative feeling) and a lighter lint. Never reached `main`. 8 conflicting files. If rule 4 stands, redo it on `main` as a small PR and close this |
| `feat/please-running-low` | #33 closed, unmerged | 2 Oct | **keep, park** | *Running low* (ER-07 PLEASE), copy unsigned, 10 conflicts. Content source for ER-07 on the runtime |
| `feat/oa-doors` | #48 open | 6 Oct | **keep, park** | OA feeling doors, three ways in, up to three feelings. 3 conflicts. Port when OA moves to the runtime |
| `labs/exploits` | none | 29 Sep | **keep** | Exploits Lab v3 prototypes, "not for main yet" |
| `claude/project-thread-dt1q1d` | #54 closed | 10 Nov | close | Only merge commits left; the skill runtime reached `main` another way |
| `docs/parts-design` | none | 14 Oct | close | Overtaken: every file is on `main` in a later form |
| `design/den-rooms` | none | 30 Sep | close | Overtaken: landed as PR #23 (`design/den`) |
| `wip` | none | 23 Sep | close | The April Firestore migration and Neo4j audit-agent drafts; `main` stayed on Neo4j |
| `phase-a/m0-harm-patches`, `phase-a/m1-foundations`, `phase-a/m2-platform`, `phase-a/m3-band-witness` | #14–#17 merged | 30 Sep | close | Only the stacked-PR merge commit; all content is on `main` |
| `barbie-ui`, `checkin-avail-963f5`, `cursor/development-environment-setup-e68d`, `emotionquadrants` | old | Feb–Mar | close | From before `main`'s history restarted (no common ancestor); merged then as PRs #1–#11 |

**Merged and left behind (delete):** `claude/fix-ifs-den-parts-saving-v67ryh`, `content/body-map-signoff`,
`design/den`, `feat/body-map-content`, `feat/body-map-drag`, `feat/body-map-figure`, `feat/body-mirror`,
`feat/checkin-no-waits`, `feat/circuit-breaker`, `feat/content-from-file`, `feat/felt-as-source`,
`feat/graph-export-filters`, `feat/home-screen-app`, `feat/one-word-list`, `feat/routing-on`,
`feat/routing-review`, `feat/today-off-the-square`, `fix/body-drag-touch`, `fix/body-map-load-error`,
`fix/body-outlines-thumb`, `fix/continue-instant`, `fix/dearman-gate-close`, `fix/den-review`,
`fix/den-test-clock`, `fix/lane-base-check`, `phase-a/m4-engine`, `phase-a/review-fixes`, `plan/body-map`,
`reflect/r1-true-numbers`, `remove-capacity-question`, `ui-usability-prd`. Every commit on these is in
`main`. Merged `claude/project-thread-*` branches and `lane/merge-queue` are left alone: their threads
and the merge lane may still use them.
