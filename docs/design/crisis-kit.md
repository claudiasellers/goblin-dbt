# My crisis kit (DT-03)

**Status:** built 12 Nov 2026 on the skill runtime (the safety batch's first PR; [the modules plan](dbt-modules-plan.md)
§5.1). New tool `crisis-kit`, listed under Distress Tolerance with two Tools intents, *Open my crisis kit* and *Make my
crisis kit for hard nights* (`?frame=build`), and the third tool on Help me now. New concept
`dbt_crisis_survival_kit` (`PART_OF dbt_distress_tolerance`, `appToolId: 'crisis-kit'`). Source:
`scripts/skills/crisis_kit.py`. Tests: `tests/skill-crisis-kit.test.mjs`. New embed `kitDeck`
(`src/components/skillPlayer/KitDeck.tsx` over the pure `src/lib/crisisKit.ts`). New profile kind `crisis_kit`
(slice `crisisKit`). There was no old page.

Rolling back is removing `'crisis-kit'` from `src/lib/skillRuntime/playerTools.ts`, `src/data/tools.ts` and
`HELP_NOW_TOOL_IDS`, and putting the `planned` flags back on the six host exits (five skills) listed below. A kept kit stays in Me
(it is profile data) and can be deleted from there.

## What it is

PRD DT-03 (DBT DT crisis survival skills: TIP, ACCEPTS, self-soothe, IMPROVE). At 2 a.m. the person can't remember
what helps, can't come up with ideas and can't read a list. The kit is their own thinking from a better day, handed
back one card at a time. It never stands in for help: *Talk to someone now* is on every screen of both skills, and the
last screen of every visit asks about people.

Two skills under the one tool id (as FAST's two; `crisisKitSkillFor` in `src/lib/crisisKit.ts` picks, the page is
`src/pages/tools/CrisisKit.tsx`, `PAGE_SKILLS['crisis-kit']`):

- **Open it** (`crisis_kit_use`, the default).
- **Make it** (`crisis_kit_build`, `?frame=build`).

## Open it

| Step | What the person sees | PRD DT-03 |
|---|---|---|
| `deck` | *One card at a time.* The `kitDeck` embed: their kept kit, or the starter kit (*A few to start with. You can make the kit yours later.*) when they have none (signed out, or never made one). One card on the paper (`PaperCard`): the section (*For your body*, *Keep your hands busy*, *Something soothing*, *Words for you*, *Your safe place*, *Your reasons to get through tonight*, *Your pros & cons card*), the card, one instruction line, and cold's caution line. *Another card* · *That's enough for now* | One card at a time; *next* changes modality |
| `close` | *Compared with when you opened it?* Much easier · A bit easier · About the same · Harder (`askFresh: 'thenVsNow'`, no `SessionClose` after it) | Then-vs-now (once per visit, see Departures) |
| `harder` | *Is there anyone you could call or text, even for a few minutes?* *That happens, and it's worth saying. Someone to talk to, or something for your body, could come next.* Offers *Talk to someone now*, then First, the body | Still ends with people |
| `reach` | *Is there anyone you could call or text, even for a few minutes?* *You don't have to explain everything. Hearing a voice can help.* Offers *Talk to someone now*; with no kept kit, and only on a visit opened from Tools (no frame): *Make it yours* (`?frame=build`) | "Anyone you could call?" |

**The deck** (`kitCards`, `deckOrder`, both pure):

- Cards are grouped by section in the kit's order (body first). Within a section, their own words come first.
- *Another card* takes the next section's card, round the sections, then round again, so each tap changes the kind of
  card.
- The safe place is one card (their words if they described it, else the pick's name). Reasons are one list card,
  read under *You wrote these on a calmer day.*
- Up to two kept pros & cons cards (`prosCons` slice, newest first) go last, each as its reasons not to (`keptLines`),
  under the pros & cons skill's own `card_reasons` line, never copied.
- **A carried flooded reading** (`ctx.band`) shows body cards only: the first, and one swap. A kept kit with fewer
  than two body cards is topped up from the starter's (`playDeck`), so the deck is never empty.
- Signed in, the deck waits up to 2.5 s for the profile, then shows the starter cards rather than nothing. The deck is
  made once and never changes under the person: a profile that arrives later is used next time.
- Each new card takes focus as one group (section, card, instruction, caution); a list card reads its instruction
  first.
- It reports the kinds of card shown (plus `starter`), how many and how long it was open. Measurements, never a
  rating.

**Card ids are a contract** (`section:optionId`, e.g. `body:cold`; their own words are `section:own`). Two cards
gather a section: the safe place is `place:place` and the reasons list is `reasons`; CORE-02 refers to a single reason
or place by the kept item's `<section>Ids`, not the card. CORE-02's safety plan step 2 will point at them. An option
is retired, never renamed or deleted; the test pins the shipped ids.

## Make it

One section per screen, every one skippable, curated chips plus *In my words* (80 characters, counts as a pick):

| Step | Title | Max | Starter cards |
|---|---|---|---|
| `body` | *Let's make your kit. What helps your body when it's loud?* | 3 | Cold water on my face, Breathing out longer than in, Squeezing and letting go (plus Marching on the spot, Pressing my feet into the floor) |
| `heads_up` | A carried flooded reading, after the body screen (the lane's pattern; the runtime has no conditional start): *Your body's loud right now. A kit is easier to make on a calmer day.* Open a starter kit now · Settle my body first (both → `settle`: *The kit can wait for a steadier moment.*, open the kit or First, the body; exits are offered from a hand-off, so either is one tap) · Keep making it | 1 | |
| `hands` | *What keeps your hands and head busy?* | 3 | Counting back in threes (*Lose count? Pick any number and carry on.*), Finding five blue things |
| `soothe` | *What feels soothing?* (by what you can touch, smell, hear or see) | 3 | Holding something warm, A hand on my heart |
| `words` | *What would you want to hear on a hard night?* (*Your words count most.*) | 3 | *You're getting through this minute.*, *This is a feeling. It isn't the whole of you.* (*You've got through nights like this before.* is a pick, not a starter: on a first crisis it may not be true) |
| `place` | *Is there a place you go to in your mind that feels safe?* (*Describe it*) | 1 | none: the place is the person's own |
| `reasons` | *What are your reasons to get through a hard night?* | 4 | none |
| `keep` | *Keep this kit? It opens from Help me now and from Tools.* (with a kept kit: *It replaces the one you have now.*) *Your pros & cons cards go in by themselves.* Keep it · Not this time | 1 | |
| `end` | Kept: *Try one card on an ordinary hard day this week, so it feels familiar when you need it.* Then *Open my kit* | | |

Nothing picked skips the keep and says the starter kit is there. Second person on the cards (the kit speaks to them;
Kross 2014, distanced self-talk), first person on the chips (it's their kit).

**The keep** (R4, the *Keep it* tap is the yes): `crisis_kit`, a `ProfileFact` kind under My plans, `many: false`
(id = kind, so making it again replaces it). Fields: `<section>Ids` (option ids, capped per section as above) and
`<section>Own` (encrypted, `ownFields`); the validator refuses unknown fields and an empty kit. The `crisisKit` slice
(`PROFILE_NEEDS['crisis-kit']: ['crisisKit', 'prosCons']`) decrypts the own words. Me shows it as `KeptCrisisKit`:
how many cards, *Open it*, *Change it* (`?frame=build`), set aside.

## Safety

- **The kit never stands in for help** (PRD; CORE-01's rule). *Talk to someone now* (`safety.open`) on every screen of
  both skills. From a crisis route (`?frame=crisis`) the crisis banner sits **above** every card of the use skill,
  never in its place. The last screen asks about people, always; *Make it yours* is never offered from a crisis frame.
- No soother or busy-hands card is food, alcohol, shopping or scrolling (C6.7); no words card promises how long a
  feeling lasts. Both pinned by the test.
- Cold carries First, the body's caution line, read from `first_body.py` (one source; D4 as changed 12 Nov: a
  caution, no self-check), and the card says *not ice straight on skin*. The breathing card says *Dizzy or tingly? Stop
  and breathe normally.*
- Help me now opens the kit with `frame=now`: no *Make it yours* while someone is in it. Only a Tools visit offers it.
- The safe place is text only (D13), the person's own, and *Another card* leaves it at any time (*You can come back
  from it whenever you like.*).
- Reasons to get through tonight are not CORE-02's reasons for living, which the safety plan owns.
- Not a part-tag host (`NEVER_HOSTS`): a crisis visit is not the moment for *Was this a part you know?*

## The links that now open it

Each was a `planned` exit; all now open `crisis-kit` with `frame=crisis` (except Hold to wait's `kit`), and on reach /
someone / harm cards the offer order is *Talk to someone now* first, then the kit:

- Hold to wait (`crisis_kit` and `kit`): the not-safe someone card, the hurt-myself-but-safe end card (`hurt_end`),
  and (`kit`, no frame) the use pull's next card.
- Ride it out: the not-safe ending and `hurt_end`.
- First, the body: the someone-on-screen card.
- Pros & cons card: the reach card.
- When it's a habit: the harm route.
- Help me now: the third tool (`HELP_NOW_TOOL_IDS`, `frame=now`).

## Runtime addition

An exit may carry `label`, a copy key that names the offer button instead of the target tool's name (*Open my kit*,
*Make it yours*: both exits point at this same tool). Carried through `build.py` (checked against the skill's copy),
`fixture.py`, `getSkillContent`, the content snapshot and `SkillPlayer`. The cypher always sets `label` (null when an
exit has none), so dropping one later clears it. It ships inside this skill PR rather than a separate `runtime:` PR
(plan C7): it is additive, optional, and has no consumer but this skill; recorded here as the departure.

## What it records

The ToolSession (`ext.run`): the sections shown, how many cards, the duration, the close (ask-fresh `thenVsNow`).
Close kind `regulation_down`, asked in the flow. Make-it visits record their picks in `ext.run` like any skill; the
kit itself is only the profile item.

## Routing

No routing rows by design: the kit opens from crisis routes, Help me now and Tools, never as a check-in card.

## Departures from the PRD

| PRD | Built | Why |
|---|---|---|
| Voice memos, photos | Text only | D13 |
| Then-vs-now after each card | Once per visit, after the deck | One question at 2 a.m., not one per card; the deck's measurements say which kinds were shown |
| Review and reorder cards | Make it again (replaces) | Part 1 keeps one path; the order is the kit's own (body first) |
| A people section | The last screen asks about people; no contacts kept here | CORE-02's safety plan owns contacts |
| Pre-fill from DT-01 history | Not read | Profile slices never read a log; the person picks |
| One-week practice nudge | A line on the end screen | No follow-up type for one line; revisit with the safety plan |
| Lock-screen export | Not built | Platform work, later |

## Deferred

- The kit's cards inside CORE-02's safety plan (step 2 references `section:optionId`) and from CORE-01's crisis
  screen: the next safety-batch PRs.
- ~~Alternate rebellion's menu card~~ built 15 Nov 2026 (DT-11 part 3, `alternate-rebellion.md`): kept rebellions (`rebellion_card`, the `rebellionCards` slice) play as up to two *A rebellion without the wreckage* cards, never on a crisis route's kit. Held's soothe cards as kit sources.
- Review / reorder, per-card then-vs-now, a practice nudge follow-up.

## DBT handouts, step by step

| Section | Handout |
|---|---|
| Body | DT 6 (TIP), 6a–6c |
| Hands | DT 7 (ACCEPTS) |
| Soothe | DT 8, 8a (self-soothe) |
| Words, place | DT 9 (IMPROVE: encouragement, imagery) |
| Reasons | DT 5 (pros and cons), 9 (meaning) |

## Clinician pass (open)

- The starter set (which seven cards someone gets before they make their own).
- The words cards' wording at 2 a.m.
- Whether the safe-place card needs a gentler exit line for people for whom imagery goes wrong.
- The close's wording (*Compared with when you opened it?*), and whether a crisis frame should skip it and go
  straight to people.
- The safe place's way out: *If it changes or stops feeling safe, open your eyes, name three things in the room, and
  tap Another card.* And *Somewhere with someone I trust* when that person is later marked unsafe (PRD: suspend the
  card with a heads-up; needs CORE-02's people).
- Soothe cards that can pull up grief (a jumper that smells like someone, a photo).
- Reasons that can turn in a crisis (*People I care about* → *they'd be better off*; *Showing myself I can* as
  pressure).
- Flooded order: cold is the first starter body card; squeeze or feet first, cold as the swap?
- *You're doing your best* and *Feelings rise and fall, even the big ones* at 2 a.m.
