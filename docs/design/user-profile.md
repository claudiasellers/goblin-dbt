# The user profile: what we keep about a person, what it powers, and how they control it

Status: approved 10 Nov 2026 (§10). The same PR builds §9 P1 (the kind registry and keep / edit / delete) and the cheaper half of P2: retention as a daily job, App Check staged, own-words encryption in the keep path and on `ToolSession.ext`, and the crew's content-only copy. Still to do: migrating existing own words, Me's delete UI, the settings-cache pin test. Owner of this contract: the profile thread. The
**attempt record** (what one skill run writes on the spine) is owned by the runtime plan,
[`dbt-modules-plan.md` §C1](dbt-modules-plan.md), which extends
[`skill-runtime.md` "The attempt record"](skill-runtime.md) (PR #54). This doc links to it and does not
restate it. Everything a router reads *about a person across runs* is defined here (§6).

---

## 1. Do we already have content for this?

**Yes, most of it. The profile is designed and its platform is built; what's missing is one place that
ties it together, the shapes of the kinds the modules will add, the personal-ranking design, and a
privacy pass.**

| What | Where | State |
|---|---|---|
| The three layers (ask-fresh / log / profile) and the four rules | `CLAUDE.md` *Data layers*; Obsidian `Build Plan – Phase A` §5; `DBT Module PRDs – Index` §8a | **Built** (Phase A, Sep–Oct): `functions/src/userdata/layers.ts`, enforced by `tests/user-data-layers.test.mjs` |
| The profile layer: `ProfileItem` meta, *still true?*, set aside / restore, `getProfileContext(toolId)` with per-tool `PROFILE_NEEDS`, `getMe` | Obsidian `E2 – Spine, Profile, Check-in` §P; `functions/src/profile/` | **Built.** Kinds live today: `quiet_hours` (`ProfileFact`), `what_helps` (`MyPattern`), `OwnLine`, `SAVED_LINE`. 13 slices reserved and returning empty |
| Pattern promotion (log → offer → yes → profile) | `profile/patternOffers.ts`, `scripts/profile-layer/content.py` | **Built, switched off** (`what_helps_better` `enabled: false`) |
| Me surface | `src/pages/Profile.tsx`, `src/components/me/` | **Built** for About me, My body, My words, My patterns, Parts of me. My people / My plans / My progress hidden until their kinds exist |
| Parts on the profile | `docs/design/parts.md` (Data model), PRs #49–51 | **Built**: `Part`, `PartLink`, `DenSnapshot` are profile items with their own writers (`parts/keep.ts`, `parts/links.ts`) |
| Export, delete, retention | `userdata/exportDelete.ts`, `account/` | **Built**: generic over `:UserData {ownerId}`, `formatVersion: 2`, Auth user deleted with `deleteAuth`; retention covers every `:LogRecord`, never profile |
| Every future profile object (Person, Goal/value, CopeAheadPlan, SafetyPlan, KitCard, ThingILike, BodySafetyFlags, PracticeProfile, BoundaryLine, ProsConsCard, AcceptanceTarget, …) with owner and fields | `DBT Module PRDs – Index` §8 (shared object registry) | **Spec only.** Fields are merged across PRDs; none is in the repo |
| The attempt record | `skill-runtime.md` (PR #54), `dbt-modules-plan.md` §C1 | **Spec**, owned by the runtime thread |
| Personal ranking ("router tie-break 0: the user's own better closes") | `Build Plan – Phase A` §9; Index §5.1 #8 | **Named only.** `PROFILE_NEEDS.checkin = ['patterns']` is declared, but `getStateAndTools` reads no profile or history today (checked: nothing in `functions/src/recommendation/` calls `readProfileSlices`) |
| Safety plan | `PRD – DBT Structure` CORE-02; `/mnt/project-files/handoffs/safety-plan-resume.md` | **Paused** (10 Nov). Slice `safetyPlan` reserved |

Project-file specs `graph.md`, `pulse.md`, `goblin.md`, `lead.md` are the Slack crew's agents, not the app;
they touch the profile only in two places this plan uses: `goblin.md`'s "prior outcome" weighting question
(§6) and `graph.md`'s open question about hiding user data from the crew's read-only credential (§8).
`reflect.md` fixes the line this plan keeps: *Reflect is the log's mirror; Me is the profile.*

**Firestore vs Neo4j.** There is no Firestore in this app: every piece of user data is in Neo4j Aura,
behind Cloud Functions. This plan keeps it that way (§3).

---

## 2. What "the profile" means here

Three things get called "profile". Only the first is the profile layer.

1. **The profile layer** (`:ProfileItem`): what stays true about a person across visits and would
   otherwise be re-asked. The person said yes to each item. Pre-fills flows with *still true?*.
2. **History** (`:LogRecord`): what happened, one record per moment. Check-ins, `ToolSession`s (the
   attempt record), follow-ups, parts sessions. Read in aggregate only (Reflect, Today, offers, the
   personal ranking in §6), never to pre-fill a live flow.
3. **Settings** (`User` properties): theme, palette, reminders, retention, `displayName`, `timeZone`,
   `partsEnabled`. Not profile layer; cached on the device for the theme paint.

The rule that joins them is unchanged: **nothing moves from history to the profile without the person's
yes** (an offer, or a tap on *Keep this*).

---

## 3. Where it's stored

**Everything stays in Neo4j, in the person's own subgraph. No second store for now.** Claudia asked
(10 Nov) whether user data belongs in Neo4j at all, or whether it should move to Firestore while the graph
keeps only content. Here is the comparison.

### 3.1 Is Neo4j an unusual place for user data?

Partly, yes. Most apps keep user data in a document or relational store and use a graph only for the
relationships it's best at. Starting from nothing today, "content graph in Neo4j, user data in Firestore"
would be a reasonable design. Neo4j still isn't a *bad* place for it: it's a transactional database
(ACID, constraints, one transaction across several writes), and this app reaches it only through Cloud
Functions. The question that matters is whether moving now pays for itself.

### 3.2 What moving to Firestore would involve

| | Today (Neo4j only) | Profile and history in Firestore, content in Neo4j |
|---|---|---|
| **What's live** | 25 user-data labels (`layers.ts`), written and read by 40 function files (~8,000 lines) and covered by ~7,800 lines of fake-driver unit tests | All 40 files rewritten. Live data is small (one person), so the data migration is easy; the cost is the code |
| **Joins with content** | 25 of those 40 files join user data to graph content inside one query: parts to `ProtectiveMove` / `ProtectedHurt` (the safety flag, trails, stats, the den), `FOUND_WORD` and check-ins to `Emotion`, `SAVED_LINE` / `SHOWED_LINE` to `ValidationLine`, offers to `PatternRule`, sessions to `PracticeSkill` / `FollowUpType` | Every one of those becomes "read Firestore, read Neo4j, join in code". Parts would take the longest: `partSafetyCypher`, trails rules A–D and `sessionMoves.ts` are graph walks over the person's sessions and the move vocabulary |
| **Finalise-once and "only on a yes"** | `GUARDS.<Label>` in each write's `WHERE`, in the same transaction as the write; test-enforced | Possible with Firestore transactions, but every guard and its tests get rewritten |
| **Export / delete / retention** | One generic query each over `:UserData {ownerId}`; a new label is covered once it's registered | Two of each, kept in step. Firestore TTL policies handle retention well; delete has to succeed in both stores or report a partial failure |
| **Security rules** | Client has no database access at all; Functions check the uid | Rules would be "client may read own docs, never write". Writes still have to go through Functions, because of validation, finalise-once and the yes rule. Gain: direct reads |
| **Speed** | Every read is a callable; a cold one has taken 2.8 s | Me and profile slices could read straight from the client with an offline cache. **This is the one real user-facing gain** |
| **Offline / signed out** | Signed out has no profile, by design | Offline helps signed-in people only. Signed out would still need anonymous auth plus a merge on sign-up |
| **Crew read-only login sees user data** | Real gap (§8 #2) | Closed by the split |
| **Personal ranking** | One read transaction: the person's closes for this pattern plus graph priority | Works the same: the ranking is a per-person count of closes by tool and pattern, which needs no graph join (§6). Neither store wins here |

On "preferences + history + an algorithm + the graph, like a RAG model": that *is* the plan in §5–§6,
and it works the same whichever store holds the history. It isn't RAG, which means retrieving text for a
language model to write from. It's a recommender: graph rules pick the candidates, and your own
confirmed history reorders them. No model ever reads user data (§8).

### 3.3 Recommendation

**Don't migrate now.** It means rewriting most of the functions layer and its tests for one user-facing
gain (faster Me and profile reads). The other gains can be had more cheaply:

- **Crew exposure:** take the crew off the production database. It reads its own Neo4j database loaded
  from a content-only export (`scripts/crew/load-content-copy.mjs`, which refuses the same user labels
  `build.mjs` does, a target that is the production URI, and a target that holds any `User` node).
- **Retention:** a daily scheduled function (§8 #1). Firestore isn't needed for that.
- **Speed:** keep the warm-up pattern (`{ warm: true }`), and let Me prefetch on app open.

**When to look again** (any one of these): more than a handful of real users and Aura cost or latency
shows up; signed-in offline becomes a requirement (e.g. the safety plan has to open with no signal and
device-only isn't enough); or the crew, or anyone else, needs prod access that Aura's roles can't limit
to content. If the move happens, it happens whole (all user labels, through `layers.ts`), never as a
second store for "new" data only. Half in each store is the worst outcome: two exports, two deletes,
and joins in code.

### 3.4 Layout

| Data | Stored as | Example |
|---|---|---|
| Profile item | `:<Label>:UserData:ProfileItem`, `HAS_<X>` from `User` | `ProfileFact {kind: 'quiet_hours'}`, `MyPattern`, `OwnLine`, `Part` |
| Profile edge to graph content | `User -[:SAVED_LINE {confirmedAt, source}]-> ValidationLine` | a kept witness line |
| History | `:<Label>:UserData:LogRecord` | `CheckIn`, `ToolSession`, `PatternOffer`, `PartSession` |
| Settings | `User` properties | `theme`, `dataRetentionDays`, `partsEnabled` |
| System | `:<Label>:UserData:System` | `PushToken` (reserved) |
| Device only | `sessionStorage` / `localStorage` | `goblin.band.v1` (≤ 20 min); DEAR MAN resume tokens (`src/lib/resumeToken.ts`, ≤ 24 h, holding a draft **with own words**: `describeCustom`, `assertCustom`, `anchorPhrase`, …); the settings cache |

Mandatory on every `:UserData` node (unchanged): `id`, `ownerId`, `key = ownerId:id` (unique per label),
`createdAt`, `schemaVersion`; writes `MERGE` on `key`. Profile items add the meta:
`kind, area, status (active | resting | set_aside), source, confirmedAt, revisitAt, lastReviewedAt,
reviewCount, updatedAt`.

**One exception, offered later:** the safety plan and crisis kit may be kept device-only for people who
don't want them on a server (Index §8: `SafetyPlan.storage account | device`). A device copy is never
exported or synced and is lost with the device; the Me surface says so in one line.

---

## 4. What's stored: the kind registry

### 4.1 Live today

| Kind | Label | Area | Written by | Revisit | Slice / readers |
|---|---|---|---|---|---|
| name | `User.displayName` (setting, exposed as a slice) | About me | `updateUserProfile` | — | `name`: Recover, FTF, witness, Meet a part |
| quiet_hours | `ProfileFact` | My body | `upsertProfileFact` (Me editor) | 180 d | `quietHours`: Today |
| what_helps | `MyPattern` | My patterns | `answerPatternOffer` *yes* only | 60 d | `patterns`: declared for the check-in, not yet read (§6) |
| own_line | `OwnLine` | My words | `recordWitnessBeat` (*say it my way*), Wise mind / Cope Ahead / Two pulls *Keep* | none | `ownLines`: witness, DEAR MAN, Cope Ahead |
| saved line | `SAVED_LINE` edge | My words | witness *keep* | none | `savedLines` |
| part | `Part` (+ `PartLink`, `DenSnapshot`) | Parts of me | `parts/keep.ts`, `parts/links.ts`, `parts/denSnapshot.ts` only | 30 d (`PartRevisit`) | `parts`, `partDetail`, `partAnchors`, `den`; empty unless `partsEnabled` |
| found words | `FOUND_WORD` edge (**log aggregate**, not profile) | My words, read-only | FTF, check-in | — | Me only |

### 4.2 Coming with the modules: one registry, one write path

Today each kind has its own writer (`upsertProfileFact` for facts, the witness for lines, parts for parts).
That doesn't scale to the ~12 kinds the DT / IE / ER / CORE modules add, and the runtime's generic *keep*
step needs one thing to call. So:

**`functions/src/profile/kinds.ts`**, a registry in code (reviewed per PR, like `PROFILE_NEEDS`; a content
load can never add a kind or widen a reader):

```ts
interface ProfileKindDef {
  kind: string;                 // 'cope_ahead_plan'
  label: string;                // Neo4j label, whitelisted: 'CopeAheadPlan'
  area: ProfileAreaId;          // 'my_plans'
  slice: SliceId;               // 'copeAheadPlans'
  owner: 'CORE' | 'ER' | 'IE' | 'DT' | 'MF' | 'WMP';
  validate(value: unknown): Record<string, unknown>;   // throws ValidationError; strips ask-fresh fields
  many: boolean;                // one per person (ProfileFact-style, id = kind) or many
  maxItems: number;             // per person
  editor: string | null;        // which Me editor opens on "change"
  graphRefs?: Record<string, string>; // value field → graph label it must point at (moveIds → CopeMove)
}
```

Copy (title, *still true?* wording, set-aside confirmation) and `revisitAfterDays` stay in the graph
(`ProfileKind`, `scripts/profile-layer/content.py`), as today.

**Writers** (`functions/src/profile/items.ts`, generalising what's there):

| Callable | Does | Notes |
|---|---|---|
| `keepProfileItem({kind, value, sourceSessionId?})` | Creates the item, `source: 'tool:<toolId>'`, `KEPT_FROM → ToolSession` (the caller's own, checked), bumps `profileVersion` | **The runtime's keep step calls this.** The person's tap is the yes |
| `editProfileItem({ref, value})` | Replaces the value through the kind's validator; `confirmedAt = now` | Me editors and in-flow *change* |
| `confirmProfileItem` / `setAsideProfileItem` / `restoreProfileItem` | Exist; *still true?* | `ITEM_LABELS` becomes the registry's labels |
| `deleteProfileItem({ref})` | **New.** Hard-deletes one item and its outgoing edges | Set aside stays the default; delete is an explicit choice in Me (§7) |
| `answerPatternOffer` | Unchanged, the only `MyPattern` writer | |

`upsertProfileFact` becomes `keepProfileItem` / `editProfileItem` for `many: false` kinds; its one caller
moves in the same PR.

**Kinds and their owners** (fields from Index §8; each owner writes its validator, slice resolver and
`PROFILE_NEEDS` lines in the PR that ships the tool, never before):

| Kind (label) | Area | Owner | First tool that keeps it | Readers (planned) |
|---|---|---|---|---|
| `person` (`Person`) | My people | IE | IE-03 picker; Recover's "is this person safe?" if unset | IE, Recover, router hard filter `personSafe`, kit / trusted voice |
| `boundary_line` (`BoundaryLine`) | My plans | IE | FAST / DEAR MAN | IE, Recover's *let it land* |
| `cope_ahead_plan` (`ProfileFact`, many, own words encrypted) | My plans | ER | **Built (ER-B2, 11 Nov):** Cope Ahead on the skill runtime, on *Keep this*: the plan's ids and own words (situation, hardest moment, the If from the pull, the pull, one or two moves), never a sentence or a part; Me composes it with `planLine`. Plans kept before stay `OwnLine`s | Me only for now; DEAR MAN, follow-ups and CORE-08 can read it once they declare a slice |
| `thing_i_like` (`ProfileFact`, many, own words encrypted) | My words | ER | **Built:** ER-04 Good things part 1, on *Keep it* (a found thing) and *Add it* (a good thing that left them lighter) (`docs/design/good-things.md`); DT-06 / DT-04 sources later | the `thingsILike` slice: Good things' pick step (own things first); Me. Later DT-06, WMP-05, diary |
| `values` (`ProfileFact`, one per person, own words encrypted; `goal` later, CORE) | About me | ER (values), CORE (goal) | **Built:** ER-09 What matters to me (`docs/design/values.md`): the sort (`mine`) and up to three kept for now (`kept`), on *Save*; a re-sort replaces it; revisited monthly (*Are these still yours?*). CORE-06 goals later | the `values` slice (the kept ones, named): What matters to me's start screen and step picker; Me. Later OA, IE FAST, safety plan reasons |
| ~~`kit_card` (`KitCard` under `CrisisKit`)~~ | My plans | DT | **Superseded by `crisis_kit`** (DT-03): one item; a card is `section:optionId` (ids never renamed), which CORE-02's step 2 will reference | CORE-02, CORE-01 |
| `pros_cons` (`ProsConsCard`) | My plans | DT | DT-10 | CORE-04/10 |
| `acceptance_target` (`AcceptanceTarget`) | My plans | DT | DT-04 | CORE-11, ER-04 |
| `body_flags` (`ProfileFact`) | My body | DT | DT-01 "remember this?" (the per-visit check stays ask-fresh) | Cool Down, every cold/exertion primitive, router `medicalFlagFilter` |
| `practice_prefs` (`PracticeProfile`) | My body | MF | MF-02 | MF runtime |
| `safety_plan` (`SafetyPlan`) | My plans | CORE | CORE-02 (paused) | `safety.open`, server-side only |
| `fade_levels` (`ProfileFact`) | My progress | CORE | CORE-12, via a fade offer (*yes*) | witness, MF |
| `country` (`ProfileFact`) | About me | CORE | CORE-01 helplines | `CrisisBanner` |
| `nightmare_script` (`ProfileFact`, many, own words encrypted) | My plans | ER | **Built:** ER-15 Rewrite the nightmare, on *Keep it in Me* (`docs/design/nightmare-rescript.md`) | Me only (a read-through reopens the visit's run, not the item) |
| `pros_cons` (`ProfileFact`, many, own words encrypted) | My plans | DT | **Built:** DT-10 Pros & cons card, on *Keep it in Me* (`docs/design/pros-cons.md`) | the `prosCons` slice: Hold to wait (its replay); Me |
| `crisis_kit` (`ProfileFact`, one, own words encrypted) | My plans | DT | **Built:** DT-03 My crisis kit, on *Keep it* (`docs/design/crisis-kit.md`); keeping it again replaces it | `crisisKit` (`crisis-kit`: the kit plays it one card at a time); Me |
| `abstinence_plan` (`ProfileFact`, many, own words encrypted) | My plans | DT | **Built:** DT-09 When it's a habit, on *Keep it in Me* (`docs/design/habit-plan.md`); the minimal TargetBehavior until CORE-04 | Me only (the renewal reopens the visit's run, not the item) |

**Outside the registry, on purpose:** `Part` / `PartLink` / `DenSnapshot` (parts keep their own writers,
test-enforced, because a part is built from the stored session, never from client fields) and a
device-only `SafetyPlan`.

**What a kept item may never contain:** ask-fresh fields (`band*`, `thenVsNow`, `urgeIds`, `fitsFacts`, …).
The validator strips them and `tests/user-data-layers.test.mjs` gains a case per kind.

---

## 5. What the profile powers

| Consumer | Reads | How | State |
|---|---|---|---|
| **Tools, in flow** | Their declared slices | `useProfileContext(toolId)`; pre-filled values show `StillTrue` | Built (Recover, FTF, DEAR MAN, Cope Ahead, Wise mind, Meet a part, tag rows) |
| **Witness** | name, own lines, saved lines | server-side `readProfileSlices(…, 'witness')` | Built |
| **Today** | quiet hours, parts | slices + log (follow-ups, offers) | Built |
| **Check-in router** | confirmed `what_helps` patterns; later body flags, people | §6 | **Not built** |
| **Reflect** | the log only; the parts section reads parts stats | `getInsightsData` | Built (R1). Reflect shows evidence; it never states a conclusion about the person. An offer is how a conclusion reaches Me |
| **Parts discovery** | log (episodes) → `TrailOffer` → *yes* → `Part` | `parts/trails`, `parts/offers` | Built, offers off until Claudia sees the dry run |
| **Pattern offers** | log (`ToolSession` closes) → `PatternOffer` → *yes* → `MyPattern` | `patternOffers.ts` (lazy, on Today) | Built, rule off |
| **Safety plan** (later) | `safetyPlan` slice, server-side; seeded from history only as offers ("These came up before a hard night. Add them as warning signs?") | CORE-02 | Paused |
| **Runtime keep step** | writes, doesn't read | `keepProfileItem` | §4.2 |

The flow is always one direction: **history → offer → yes → profile → pre-fill → new history**. Nothing in
the profile is inferred silently.

---

## 6. Personal ranking: what the router reads about this person

The attempt record (runtime §C1) is the raw material. This section is the **read model** over it; the
router reads this, not raw `ToolSession`s.

### 6.1 Two signals, different weights

1. **Confirmed patterns** (`MyPattern what_helps {toolId, patternId}`, status active). The person said
   *yes, that helps me*. Strong.
2. **Recent evidence** (log aggregate, computed at read time in `getStateAndTools`'s read transaction):
   for this person, this pattern, each candidate tool, over the last 90 days of answered closes:
   `{runs, better (better | much_better | held off the urge), worse, lastAt}`. Weak, and only counts at
   `runs ≥ 3`. Embedded sub-skill runs (runtime §C1) count toward their own tool, not the host's.

`functions/src/recommendation/personal.ts` (pure) turns both into one number per candidate:

```ts
interface PersonalSignal { toolId: string; confirmed: boolean; runs: number; betterShare: number; worse: number }
function personalBoost(s: PersonalSignal): number   // 0 … 1; confirmed = 1; evidence ≤ 0.5; any 2 'worse' in the last 3 → 0
```

### 6.2 Where it sits in selection (and where it never sits)

Order in `select.ts` (Index §5.1 #8, unchanged before step 4):

1. Hard filters: flooded body-only, blank → nothing `down`, `CONTRAINDICATED_FOR`, later body flags and
   `Person.safe`. **Personal data never brings back a filtered tool.**
2. Emotion gates.
3. Graph `priority`.
4. **Personal boost, within a priority tier only** (default; decision P2 below). It reorders equals; it
   never lifts a tool above a higher-priority row.
5. Emotion overlap, then the diversity rule (one card + one swap of a different `skillKind`).

Every result records it: `routing.ruleIds` gains `personal:<toolId>` when the boost changed the order, and
`routing.personal = { applied, source: 'confirmed' | 'evidence' }`, so Reflect and the dry runs can see it.
**Kill switch:** `RoutingPolicy.personalEnabled` (graph, default false), independent of `enabled`.

### 6.3 What the person sees

A card picked because of a **confirmed** pattern may carry one line from the graph ("You said this one
helps"). Evidence alone changes the order silently: saying "this helped you 3 times" on the result
screen would be a statement about the person they never agreed to (the `reflect.md` rule).

### 6.4 Build up history first (Claudia, 10 Nov)

Personal ranking stays **observe-only** until there's enough history to trust it. Phase 1: compute the
boost on every check-in and record it on the result (`routing.personal = { applied: false, wouldReorder }`)
without changing the cards. Patterns the person confirms (*you said this helps*) collect through the
offer in the meantime. It switches on only after Claudia has looked at the dry run, and when it does, only
confirmed patterns count at first. Evidence-only boosting is a later, separate switch
(`RoutingPolicy.personalEvidenceEnabled`).

### 6.5 Before switching it on

Replay it over Claudia's own history read-only (`scripts/recommendations/personal-dry-run.mjs`, opaque
keys, the way `trails-dry-run.mjs` works) and over the fixtures, and pin in tests: a contraindicated tool
with a perfect record stays filtered; flooded stays body-only; two *worse* closes zero the boost.

---

## 7. What the person can do: view, edit, export, delete

All in **Me** (`#/profile`), which already lists areas from `getMe`.

| Feature | Today | Plan |
|---|---|---|
| **See everything kept** | Areas with items; stale items float up; set-aside items listed for restore | Areas appear as their first kind ships (My people with IE-03, My plans with Cope Ahead's port / DT-03, My progress with CORE-12). Each area lists items only; no counts, no scores |
| **See what reads it** | — | Each area gets a quiet "Used by" line built from `PROFILE_NEEDS` (e.g. *My people: Recover, Ask for what you need*). Generated from code, so it can't drift |
| **Still true?** | Yes · not any more · change (quiet hours, patterns, parts' 30-day check) | Every kind with `revisitAfterDays` |
| **Edit** | Quiet hours; part rename / anchor / shape | One editor per kind (`editor` in the registry), reusing the tool's own screens where possible (a cope-ahead plan opens in Cope Ahead) |
| **Set aside / restore** | Built | Unchanged: the default "not any more" |
| **Delete one thing** | Parts only (`deleteMyParts`, all parts) | `deleteProfileItem` behind a two-step confirm on any item; Parts keeps its own *Delete your parts* |
| **Export** | JSON of everything (`formatVersion: 2`, records + links) | Keep it. Add a **readable copy** (one printable page: Me's areas in plain words, own words as written) for taking to a therapist. Safety plan and crisis kit get their own print / lock-screen export when they ship |
| **Delete everything** | Built: graph subgraph + Auth user | Unchanged |
| **Retention** | Setting: log records older than N days are deleted; profile never | Move the job off the profile read path onto a daily schedule (§8). Say in Settings that retention never removes what they kept in Me |
| **Turn parts off** | Built; hides, deletes nothing | Unchanged |

Signed-out use stays first-class: nothing in a live flow requires a profile. Signed out, *Keep this*
explains it needs an account and offers device-only only where §3 allows it.

---

## 8. Privacy and security

What already holds (keep it):

- The browser never touches Neo4j; credentials are Firebase secrets; the uid comes from the Auth token,
  never from the client; every query anchors on `User {id: $uid}` or `key`.
- Per-tool reads are declared in code (`PROFILE_NEEDS`); slice resolvers never read a `:LogRecord`
  (test-enforced). Scheduled code can't import profile writers (grep test).
- Own words are stored as written, never linted, **never sent to a model**, never in content snapshots
  (`build.mjs` refuses any export with a `User` / `UserData` node).
- Profile slices are cached in memory only. `localStorage` holds the settings cache and one exception: a DEAR MAN resume draft, written only when the person leaves mid-flow through the too-much hand-off, read back once (`takeResumeToken` removes it), expired after 24 h, and cleared on sign-out (`clearResumeTokens` in `BandContext`).
- Graph content never points at user data; export and delete are generic, so a new label can't be missed.

Gaps to close (in order of risk):

| # | Gap | Fix |
|---|---|---|
| 1 | Retention runs only when `getUserProfile` loads, so a person who stops opening the app keeps their history forever, against their setting | **Built:** `applyRetentionDaily` (`userdata/retention.ts`), every day 03:30 UTC, log records only; `getUserProfile` no longer runs it |
| 2 | The Slack crew's read-only Aura credential can read user data (`graph.md` open question) | Give the crew no production credential. **Built:** `scripts/crew/load-content-copy.mjs` loads a `--content-only` export into the crew's own database (Aura Free). Still to do: revoke the crew's prod login once it reads the copy; `pulse` gets counts from a function that returns numbers only (§3.3) |
| 3 | No App Check on callables | **Staged:** every callable takes `CALL_OPTS` (`shared/callOptions.ts`); the app sends App Check tokens once `VITE_APP_CHECK_SITE_KEY` is set (reCAPTCHA Enterprise). Enforcing is one constant, `APP_CHECK_ENFORCED`, flipped in its own PR after the metrics show every request carries a token |
| 4 | Sensitive free text (own lines, part own words, `ext.run` own words, later `Person` labels and safety-plan contacts) is plaintext in Aura (encrypted at rest by Aura, readable by anyone with DB access) | **Decided (P5), built for new writes** (`shared/crypto.ts`): envelope encryption, one AES-256 data key per person, created on first use and stored on their `User` node wrapped (AES-256-GCM, uid as additional data) by a master key held as the Firebase secret `OWN_WORDS_KEY`, which only Functions can read. Unwrapped keys are cached per function instance. Values are stored as `enc:v1:…`, also bound to the uid, so a value copied onto another person's record won't open. Encrypted now: kept profile items' own-words fields (each kind's `ownFields`) and every text field of `ToolSession.ext` at close (the `*Own` answers). Length limits apply to the plaintext. Reads pass a plain string through unchanged, so existing own words (own lines, part own words, DEAR MAN customs) keep working until a one-off migration encrypts them (still to do). Export decrypts for the person and never includes the wrapped key. Cost: microseconds per field and one unwrap per person per warm instance. Encrypted fields can't be searched, ordered or counted in Cypher, which is fine because own words are only shown back. What it protects: anyone reading the database, a database export, or the crew without the Functions secret. What it doesn't: Aura backups hold the wrapped key next to the text, so deleting a person doesn't make their backed-up text unreadable to someone who also holds the master key (gap 7 still applies). The master key sits behind a `KeyProvider` interface so Cloud KMS can replace it later by rewrapping the keys, with no change to stored values |
| 5 | `localStorage` holds the settings cache (incl. `partsEnabled`) and DEAR MAN resume drafts with own words (≤ 24 h, cleared on sign-out; an expired draft that is never read stays until sign-out or the next read) | Pin the settings cache's field list in a test; sweep expired resume tokens on app start; any new runtime resume draft (the skill player) uses the same token store and rules, and never holds ask-fresh fields |
| 6 | Function logs | Keep `errorTag`-only logging; a test that no profile write logs its payload |
| 7 | Deleted data survives in Aura backups until they expire | Say so in the privacy copy with the backup window; no code |
| 8 | Notifications | Push (when built) stays content-free; `discreetMode` (CORE) hides tool names on Today |

Clinician sharing (CORE-13 `ShareGrant`) is out of scope here; when it comes it reads the readable export,
scoped per area, revocable.

---

## 9. Order of work

| Step | What | Depends on |
|---|---|---|
| P1 | `kinds.ts` registry + `keepProfileItem` / `editProfileItem` / `deleteProfileItem`; move `quiet_hours` onto it; Me's delete and "Used by" | **Server built** (this PR); Me's delete and "Used by" UI still to do |
| P2 | Retention on a schedule; settings-cache pin test; crew off the production database; own-words encryption helper (`shared/crypto.ts`) and the migration for existing own words; App Check | **Built** (this PR): retention job, crypto + keep path + ext, crew loader, App Check staged. Still to do: the migration for existing own words, the settings-cache pin test, enforcing App Check |
| P3 | Personal ranking read model, observe-only (§6.4), plus its dry run | Enough answered closes; the runtime's `ext.run` for skills on the player |
| P4 | Dry-run `what_helps_better` on real counts, then switch it on (D-10 said after four weeks; it's been five, with one user) | Claudia's look at the counts |
| P5 | First module kinds: `cope_ahead_plan` (Cope Ahead's port), `body_flags` (DT-01), `person` (IE-03) | Their module lanes |
| P6 | Readable export | P1 |
| — | `safety_plan`, `kit_card`, `country` | The safety batch resuming |

---

## 10. Decisions for Claudia

Answered 10 Nov.

| # | Decision | Answer |
|---|---|---|
| P1 | Keep every piece of user data in Neo4j (no Firestore) | **Stay in Neo4j** (Claudia, 10 Nov, after the §3 comparison); revisit on the triggers in §3.3 |
| P2 | How much can your own history move a recommendation? | **Agreed:** reorders tools of equal priority only, never above a higher-priority row, never past a safety filter |
| P3 | Can a result card say *why* from your history? | **Agreed:** only for a pattern you confirmed. Also: build up the history first; observe-only until then (§6.4) |
| P4 | A real "delete this" on single items in Me | **Agreed**, two-step confirm |
| P5 | Encrypt free text at the application layer | **Yes, from the start of the module lanes** (§8 #4), not later |
| P6 | Cope Ahead's kept plan moves to a `CopeAheadPlan` | **Agreed**, when Cope Ahead moves onto the runtime |
