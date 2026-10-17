# Check the Facts: handover for the session that builds it

Written 17 Oct 2026 for a fresh Claude session. Check the Facts is designed and every open question is
settled, but no code exists yet. Read this first, then `docs/design/check-the-facts.md`, all of it.
That doc's *Decisions for the build (17 Oct)* override anything above them in it. This handover adds
the build contract (types, helpers, props), the facts already checked against the code, the files to
copy the pattern from, and the checks and deploy steps.

## How it got here

- Claudia picked Check the Facts as the next tool after Cope Ahead, and the spec and its decisions were
  written on 17 Oct (`check-the-facts.md`).
- The build was first split across four parallel worktrees in the session that built Parts, Wise mind
  and Cope Ahead (PR #49). Claudia then said: *"This feels like it should go to a different lane or be a
  handoff document to a new session. Let's get your work merged."*
- Every worktree stopped before writing anything. No Check the Facts code was committed anywhere, so
  you start clean.
- PR #49 is merged, so start a new branch from the default branch.

## What to build (one line each; the spec has the detail)

1. **What are you feeling?** Carried emotions first, then the curated `feelChips`, then *Something
   else*, which opens the grid list.
2. **What happened?** Event-kind chips, then own words.
3. **The story.** Up to two picks, own words counting as one.
4. **Other ways to see it.** Alternatives grouped by story; any number, none is fine.
5. **The threat.** Only for fear, anger and shame, or when a chosen story `predicts`. Then how likely
   (four words) and getting through, with a quiet Cope Ahead link.
6. **Does it fit?** The parent's `fitsTheFactsWhen` list from the graph, with four answers.
7. **What helps from here.** One card from the answer, with offers named from `src/data/tools.ts`, then
   the regulation close.

There are two ways in: the tool list and its intent, and a quiet link on Do the Opposite's fits step.
The check-in routing rows exist but stay off.

## Build contract

### `src/data/checkFactsTypes.ts`, exactly this text

```ts
/** Check the Facts (docs/design/check-the-facts.md): the shipped content (`check-the-facts.json`) and the visit's answers. */

export type FitsFacts = 'fits' | 'partly' | 'doesnt_fit' | 'unsure';
export type Likely = 'very' | 'either' | 'not_that' | 'unknown';
export type GetThrough = 'yes' | 'unsure';
export type EventKind = 'said' | 'didnt' | 'saw' | 'thought' | 'cant_name';
/** The story sets: five DBT parents with their own rows, and `general` for every other word. */
export type StorySet = 'fear' | 'anger' | 'sadness' | 'shame' | 'guilt' | 'general';
/** Where screen 7 can send the person (ids from src/data/tools.ts), or Done. */
export type CfOffer = 'problem-solve' | 'dear-man' | 'opposite-action' | 'wise-mind';
export type CfHandoff = CfOffer | 'done' | 'cope-ahead';

export interface CfChip { id: string; label: string }
export interface CfStory {
  id: string;
  set: StorySet;
  label: string;
  /** The story predicts something, so screen 5 (the threat) is shown even outside fear, anger and shame. */
  predicts: boolean;
  alternatives: CfChip[];
}
export interface CfThreat extends CfChip {
  /** DBT parents it is offered for; `cant_say` and `none` list every parent. */
  parents: string[];
}

export interface CheckFactsContent {
  /** Screen 1's curated grid words, in order (grid ids). */
  feelChips: string[];
  /** Grid word id → its DBT parent (HAS_REGULATION_CONTENT). A word not listed has none. */
  parentOf: Record<string, string>;
  /** DBT parent → the ERC label and its `fitsTheFactsWhen`, read from the graph, unchanged. */
  fitsWhen: Record<string, { label: string; lines: string[] }>;
  eventKinds: Array<{ id: EventKind; label: string }>;
  stories: CfStory[];
  /** The alternatives offered for a story given only in the person's own words. */
  ownStoryAlternatives: CfChip[];
  threats: CfThreat[];
  /** CheckFactsFlow: every screen key in the doc's Copy table, plus the decisions' additions. */
  copy: Record<string, string>;
}

/** The visit's answers (`ToolSession.ext.cf`; `fitsFacts` rides as the ask-fresh field, not in here). */
export interface CfExt {
  emotionId: string | null;
  eventKind: EventKind | null;
  eventOwn: string | null;
  storyIds: string[];
  storyOwn: string | null;
  altIds: string[];
  altOwn: string | null;
  threatId: string | null;
  threatOwn: string | null;
  likely: Likely | null;
  getThrough: GetThrough | null;
  handoff: CfHandoff | null;
  unblendShown: boolean;
}
```

Mirror it in `functions/src/checkFacts/types.ts`, as Cope Ahead mirrors `copeAheadTypes.ts`.

### Pure helpers

`src/lib/checkFactsTool.ts` is the step machine. It sets the screen order, skips screen 5, caps stories
at two, and drops the alternatives of a story that has been un-picked. It also exports:

- `storySet(content, emotionId): StorySet`. The word's parent maps to its set; `hot_shame` and
  `cold_shame` give `shame`. Any parent without rows (envy, jealousy, disgust, love), or no parent at all,
  gives `general`.
- `fitsParent(content, emotionId): string | null`. The parent if `fitsWhen` has it, else null.
- `showsThreat(content, emotionId, storyIds): boolean`. True for the fear, anger and shame sets, or if any
  chosen story `predicts`.
- `threatsFor(content, emotionId): CfThreat[]`. The threats whose `parents` include the word's parent,
  or all of them when there's no parent. `cant_say` and `none` always come last.

`src/lib/checkFactsHandoff.ts`:

```ts
export function handoffFor(fits: FitsFacts, eventKind: EventKind | null): { lineKey: string; offers: CfOffer[]; done: boolean };
```

| fits | lineKey | offers |
|---|---|---|
| `fits` | `next_fits` | `['problem-solve']`, plus `'dear-man'` when `eventKind` is `said` or `didnt` |
| `partly` | `next_partly` | `['opposite-action', 'problem-solve']`, in that order |
| `doesnt_fit` | `next_no` | `['opposite-action']` |
| `unsure` | `next_unsure` | `['wise-mind']` |

`done` is always true: there is always a *Done*.

`src/lib/checkFactsEntry.ts`:

```ts
export function checkFactsLink(o: { emotionId?: string }): string;   // /tool/check-the-facts?feel=<id>
export function parseCheckFactsEntry(search: string, gridIds: ReadonlySet<string>): { firstEmotionId: string | null };
```

`parseCheckFactsEntry` drops any id that isn't a grid word. Follow `src/lib/copeAheadEntry.ts`.

### Screen components (presentational)

These go in `src/components/tools/checkFacts/`. They take copy from the content type and emit choices.
They never save anything or touch the session; the page does that.

```ts
interface StoryScreenProps {
  content: CheckFactsContent;
  set: StorySet;
  storyIds: string[];
  storyOwn: string;
  /** Up to two in total; own words count as one. */
  onChange: (next: { storyIds: string[]; storyOwn: string }) => void;
  /** The parts unblend line, or null. The page decides; this screen only places it under the chips. */
  unblend: React.ReactNode | null;
  onNext: () => void;
}
interface AlternativesScreenProps {
  content: CheckFactsContent;
  storyIds: string[];
  storyOwn: string;
  altIds: string[];
  altOwn: string;
  onChange: (next: { altIds: string[]; altOwn: string }) => void;
  onNext: () => void;
}
interface ThreatScreenProps {
  content: CheckFactsContent;
  threats: CfThreat[];   // threatsFor(...)
  value: { threatId: string | null; threatOwn: string; likely: Likely | null; getThrough: GetThrough | null };
  onChange: (next: ThreatScreenProps['value']) => void;
  /** The quiet "Plan for it with Cope Ahead" link: the page records it and navigates. */
  onCopeAhead: () => void;
  onNext: () => void;
}
interface FitsScreenProps {
  content: CheckFactsContent;
  /** The word as the grid shows it, lower-case ("let down"). */
  feeling: string;
  /** fitsParent(...): with a parent, its list; null → `fits_title_general` and no list. */
  parent: string | null;
  value: FitsFacts | null;
  onChange: (v: FitsFacts) => void;
  onNext: () => void;
}
interface HandoffCardProps {
  content: CheckFactsContent;
  fits: FitsFacts;
  eventKind: EventKind | null;
  onOffer: (o: CfOffer) => void;
  onDone: () => void;
}
```

#### Story

- Once two stories are picked, the other chips stay tappable. A tap swaps out the older pick, so the
  person never gets stuck.
- The `unblend` slot sits under the chips. When it's null, the space stays empty and nothing shifts.

#### Alternatives

- Each chosen story's alternatives sit in a group labelled by that story, in the serif, written as the
  person's own sentence.
- A story in own words gets `ownStoryAlternatives`.
- The person can add an alternative in their own words.
- *Next* is always enabled.
- `alt_note` is always shown, as quiet text under the picks.
- No alternative is ever marked as right.

#### Threat

The screen has three parts that appear in turn: the threat, then `likely_q` once a threat is chosen or
written, then `through_q` once a likelihood is picked.

- *Nothing like that* (`none`) hides the other two parts.
- `through_cope_ahead` is a quiet text link under either answer to the getting-through question. It's
  never a button.
- Each new part arrives as a polite live line, and focus stays where the person tapped.
- *Next* works from any point.

#### Fits

- With a parent, the parent's `fitsWhen.lines` show as a plain list in the serif, unchanged, em dashes
  included.
- Without a parent, use `fits_title_general` and show no list.
- All four answers look the same. *Yes, it fits* gets no warning colour.
- *Next* is enabled once an answer is picked.

#### Hand-off

- It's one card: the line in the serif, and the offers as buttons named from `src/data/tools.ts`.
- It looks like the check-in result's cards (`RecommendationCards.tsx`), with no swap.
- The first offer is primary, and *Done* is quiet.

## Facts already checked against the code (17 Oct)

### Content and graph

- Every grid word's DBT parent is set in `schema/opposite-action-data.cypher`, by UNWIND, as
  `(Emotion)-[:HAS_REGULATION_CONTENT]->(EmotionRegulationContent {dbtParent})`. That's the mapping Do the
  Opposite reads. `getOppositeActionContent` reads `fitsTheFactsWhen` from the same nodes.
- `fitsTheFactsWhen` is read from the graph and never copied: no file in `scripts/check-the-facts/` may
  carry those lines.

### Ways in and out

- Cope Ahead has the situation `other` (*Something else*), so the screen-5 link is
  `copeAheadLink({ situationId: 'other' })` from `src/lib/copeAheadEntry.ts`.
- Wise mind's `parseWiseEntry` (`src/lib/wiseMind.ts`) accepts `?first=wm_q_next`.
- DEAR MAN's display name in `src/data/tools.ts` is *Ask for what you need*.
- The intents are `allIntents` in `src/data/tools.ts`.
- The quiet entry-link pattern to copy is `src/components/tools/copeAhead/CopeAheadEntryLink.tsx`, mounted
  in `DearMan.tsx` and `TodayCard.tsx`.
- Do the Opposite's fits check is in `src/pages/tools/OppositeAction.tsx`: the check card around
  `draft.facts` and the result card that shows `fitsFactsGuidance`. The new link goes under its detail,
  and the step itself doesn't change.

### Spine and data

- The spine already has `closeKind: 'regulation_down'` (`cool-down`, `find-the-feeling`). Check the Facts
  is `{ module: 'er', closeKind: 'regulation_down' }` in both `functions/src/spine/tools.ts` and
  `src/lib/spine/close.ts`; a test enforces that they match.
- Find the feeling asks the regulation close before its hand-offs leave, in `src/pages/tools/FindTheFeeling.tsx`
  (`thenVsNowFromFtf`, `toolSession.close`). Match it. If it differs from the spec, follow FTF and say so
  in the PR.
- The `ownWords` profile slice is a stub, and `FOUND_WORD` is read only in `functions/src/profile/me.ts`.
  That's why screen 1 uses curated chips (decision 1).
- `fitsFacts` is already an ask-fresh field (`functions/src/userdata/layers.ts` `ASK_FRESH_FIELDS`). Save
  it on the close, never in `ext.cf`.

### Routing

- The routing concept `dbt_check_facts` is in `scripts/recommendations/content.py` `PLANNED`, with
  switched-off rows:
  - *annoyed*;
  - the anticipatory words (*anxious*, *nervous*);
  - *worry*;
  - self-worth, at priority 1.5;
  - grievance;
  - guilt.
- Give it `appToolId = 'check-the-facts'` and take it out of `PLANNED`.
- The rows stay off and stay drafts. Claudia signs them off row by row.
- Rebuild, then refresh `tests/fixtures/recommendation-graph.json` with `fixture.py`.

## Files to copy the pattern from (Cope Ahead)

### Content

Commit `383cd3f` (*cope ahead: content in the graph, shipped as a file*) touched every file the content
needs. Make the same set for Check the Facts:

- `scripts/check-the-facts/{content,build,fixture}.py` → `schema/check-the-facts.cypher` and
  `tests/fixtures/check-the-facts-content.json`.
  - The nodes are in the spec's *Content and data*.
  - The general story set has no `EmotionRegulationContent`. Hang it off the `CheckFactsFlow` node and say
    so in the doc.
- The constraints go in `schema/constraints.cypher`.
- `check-the-facts` goes in `LOAD_ORDER` (`scripts/load-graph.mjs`), after `cope-ahead` and before
  `recommended-for`.
- Register the cypher in `scripts/voice-lint.mjs`, as Cope Ahead's is.
- `functions/src/checkFacts/{index,types}.ts`: `getCheckFactsContent`, which is public.
  - Its `parentOf` comes from `HAS_REGULATION_CONTENT`, over every grid word.
  - Its `fitsWhen` covers every ERC.
- Wire the function through:
  - `functions/src/index.ts`;
  - `functions/test/fixtures/endpoints.json`;
  - `functions/test/unit/auth-matrix.test.cjs`;
  - a unit test.
- `scripts/content-snapshot/build.mjs` writes `src/data/content/check-the-facts.json`, mirroring the
  function's Cypher. `tests/content-snapshot.test.mjs` pins it to the fixture.
- `src/services/checkFacts.ts` is a lazily loaded chunk, like `src/services/copeAhead.ts`.

### Registration

- `src/data/tools.ts`: the `check-the-facts` tool.
  - It goes under Emotion Regulation and is listed for everyone.
  - Its basis is "DBT ER Handout 8".
  - Add the intent *"I can't tell if I'm overreacting"*.
- Register it in the spine, `extSchemas.ts` (`ext.cf` matching `CfExt`) and `scripts/recommendations/content.py`.
  - The enums are closed sets.
  - The `*Own` fields are length-checked only, at 140 characters or fewer, and never linted.

### The page

`17c0a8d` and the later Cope Ahead commits are the template. The page goes in
`src/pages/tools/CheckTheFacts.tsx`, lazily loaded and registered in `src/pages/ToolPage.tsx`.

- Every screen carries `TooMuchLink`.
- `setEmotionIds` takes the word from screen 1.
- Hand-offs record `ext.cf.handoff` and leave through `linkTo`.
  - Problem Solve, Do the Opposite and DEAR MAN carry the emotion.
  - Wise mind gets `?first=wm_q_next`.

### Review harness

`dev/review/` holds the screenshot and accessibility harness. Build it with
`npx vite build --config dev/vite.harness.config.ts`, then run `node dev/review/check.mjs` and
`node dev/review/a11y.mjs --only <surface>`. Cope Ahead's surfaces show how to add new ones.

Add these surfaces:

- **`check-the-facts`** covers the whole flow:
  - every screen;
  - screen 5 both skipped and shown;
  - each fits answer and its hand-off;
  - a word with no parent;
  - own words at 140 characters;
  - parts on and off;
  - reduced motion.
- **`check-facts-entries`** covers each hand-off card, plus Do the Opposite's step with the link. Check
  that the hrefs are well-formed.

## The one parts line

`cf_unblend` reads *"This story might come from a part of you that's trying to protect you."* It sits
under screen 3's chips.

1. Add it to `scripts/parts/content.py` (flow `cf`). Run `build.py`, then `fixture.py`.
2. Export `CF_UNBLEND_REQUIRED` and add its surface to `scripts/parts/review.mjs`.
3. Show it the way Do the Opposite and Find the feeling show theirs (`useUnblendLine`,
   `ext.cf.unblendShown`). With parts off, or the line not shipped, nothing renders.

Every other parts line was signed off on 17 Oct. Claudia's words: *"ship it all. We literally don't have
any users so it doesn't matter."* So the default is to sign this one off too, with
`node scripts/parts/sign-off.mjs --ids cf_unblend`, and say so in the PR. A new line is a draft until
then, and `parts.json` leaves it out. Signing off never switches the trail offers on.

## Never

These are the spec's rules, repeated here because they are easy to break by accident.

- Never say which story is true.
- Never say "overreacting" in the flow. The intent label is the person's own words.
- Never ask the person to prove what happened.
- No scale, score or percentage. Likelihood is four words, and no colour ranks them.
- Never treat a feeling that fits as a problem.
- Never pre-fill a past visit's answers. Each visit is asked fresh.
- Never name a part.
- Copy always comes from `check-the-facts.json`, never hard-coded. Offer labels come from `tools.ts`.
- Accessibility:
  - focus moves to each screen's heading;
  - chips use `aria-pressed`;
  - targets are 44 px;
  - polite live lines announce what appears;
  - reduced motion is respected;
  - contrast holds in all six rooms.

Claudia's standing direction is *"focus more on features than safety features that block people from
using the features"*. Nothing here is gated on a sign-off apart from the routing rows.

## Checks before the PR is ready

- `npm test`. It runs root and functions; use the glob, because `node --test tests/` fails on Node 22.
- `npm run build` and the functions build.
- `node scripts/ci/lint-budget.mjs`, which allows 4 existing errors and no new ones.
- `node scripts/voice-lint.mjs`.
- The Cypher lint, from `CLAUDE.md`'s Testing section.
- The review harness: `check.mjs`, and `a11y.mjs --only` for each new surface.

CI runs both builds, `npm test` and the lint budget.

Commit `src/data/content/check-the-facts.json` regenerated from the schema. A load on Claudia's Mac
refreshes it again from Aura.

## The PR and the deploy

- The PR description ends with a **Deploy** section, per `CLAUDE.md`.
- When Claudia says it's merged, reply with the exact commands in order, from `~/Documents/goblin-dbt`:
  1. `git pull`
  2. `node scripts/load-graph.mjs --only constraints`
  3. `node scripts/load-graph.mjs --only check-the-facts`
  4. `node scripts/load-graph.mjs --only recommended-for`
  5. `node scripts/load-graph.mjs --only parts`, only if `cf_unblend` was added.
  6. Commit any change the loads made in `src/data/content/`.
  7. `firebase deploy --only functions`
  8. `firebase deploy --only hosting`
  9. There is no migration.
- The order matters. Constraints go first so the MERGEs are unique. Functions go before hosting, because
  the server must accept `ext.cf` and the new tool id before the app sends them.
- Add a Product Changelog entry in Claudia's Obsidian vault (`CLAUDE.md`, *Product Changelog*). If the
  vault isn't reachable from the session, give her the text to paste.
