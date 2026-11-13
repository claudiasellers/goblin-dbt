# Good things (ER-04)

**Status:** part 1 built 12 Nov 2026; level 2 (*Plan the week*) built 13 Nov 2026 on the skill runtime (batch ER-B4 of [the modules plan](dbt-modules-plan.md), the
second of its three skills). Tool `good-things`, listed under Emotion Regulation with the Tools intent *Find something
good*, on the existing concept `dbt_accumulate_positives` (`appToolId: 'good-things'`). Source:
`scripts/skills/good_things.py`. Tests: `tests/skill-good-things.test.mjs`. New profile kind `thing_i_like` and its
slice `thingsILike`, new follow-up type `good_thing`. No new embed: the find is `orientFind`, the savour a timed
`holdRing`. Close kind `none`: the outcome is the `good_thing` card's answer. Rolling back is removing `'good-things'`
from `src/lib/skillRuntime/playerTools.ts` and the tool from `src/data/tools.ts`, and putting the positive-state
result's copy back.

Spec: PRD ER-04 in `PRD – Emotion Regulation.md` (§5), DBT ER Handouts 15–16 (accumulating positive emotions in the
short term), savouring (Bryant & Veroff 2007), behavioural activation.

## What it is for

Low energy, nothing sounds good, the sense of self all negative. Before this, a pleasant check-in ended on *No action
needed right now. Enjoy this moment.* and a low one on a micro-win that recorded nothing. Claudia's note sets the shape:
neutral attention graduates into positive attention, then into doing and planning good things, and what was good is
kept in a list of things I like, a visible, growing "me that likes things", built slowly or it won't land.

## The flow

| Step | What the person sees | PRD ER-04 |
|---|---|---|
| `start` | *Where do you want to start?* (*A minute is enough.*) Find one okay thing around me · Pick one good thing for today. From a pleasant check-in (`?frame=savour`, the result having just asked): *Stay with this good moment* first | Entry points; every level reachable from day one |
| `heads_up` | A carried flooded reading: *Your body's loud right now.* (*Good things land better once it settles a little.*) Look after the next few minutes first → `settle` (First, the body) · Try it anyway | Not for flooded |
| `find` | *Look around.* *Find one thing that's even a little okay: a colour you like, something soft, a sound, a window. Cold water or something sour counts too.* `orientFind`, one find | Level 0 |
| `stay` | *Stay with it for a few seconds. Notice one thing you like about it.* (from a good moment: *Stay with what's good for a few seconds.* …) A 15 s timed `holdRing`, hint *Let it be as big as it is; it doesn't have to last.*, no breath instruction | Level 0: "three breaths", no breath instruction |
| `name` | *What was it?* (from a good moment, first: A moment, or how I felt) A colour · Something soft or comfortable · A sound · A taste or smell · A view · A person · An animal, or a few words; *Add it to Things I like?* Keep it · Not this time | Level 0: keep it, a short chip label |
| `name_end` | *Found one.* Kept: *It's in Things I like. A list like that grows slowly, one thing at a time.* Else: *You found one. Noticing it is the practice.* | Built slowly |
| `energy` | *How much energy have you got right now?* Hardly any · A little · Some | Level 1: energy needed |
| `pick` | *Pick one good thing.* (*If nothing sounds good, that's part of feeling low. Pick the one that sounds least bad.*) The person's own things I like first, then the catalogue for that energy, or own words | Level 1; anhedonia: validation first; own directory first (fade) |
| `when` | *When will you do it?* Now · This afternoon · This evening · Tomorrow; *Want me to ask how it went?* Yes books `good_thing` at that time (now: an hour on) | Level 1: now · later (time chip) → FollowUp |
| `set` | *Your good thing: {pick}.* *Doing it counts, whether or not you enjoy it.* | Reps, not feelings |

### When the card comes back

`good_thing` (Today card *Your good thing*: *Something good you picked earlier. Did it happen?*, never naming it)
reopens the run at `back` (R9 `reopens`, only on a run that reached `when`):

| Step | What the person sees |
|---|---|
| `back` | *Earlier you picked: {pick}.* *Did it happen?* Yes · Partly · Not today |
| `after` | *Compared to before, how are you?* Lighter · About the same · Heavier; *Was your mind mostly here, or somewhere else?* Mostly here · Partly · Somewhere else (optional) |
| `keep_more` | Lighter, and a listed pick that isn't already in Things I like (never own words, until CORE can check them): *Add it to Things I like?* (*Things that helped once are worth finding again.*) |
| `after_end` | *You gave it a go.* Then the first that fits: *It's in Things I like.* · Heavier: *That happens sometimes. It isn't a sign you did it wrong.* with First, the body and Running low · *If 'it won't last' or 'I don't deserve this' shows up next time, notice it and come back to what you're doing. That's part of the skill.* (H16, being unmindful of worries) · *Something lifted. That's worth noticing.* · *Enjoying it comes later. Doing it is the rep.* (the PRD's line for *didn't enjoy it*) |
| `not_today` | *That's okay. A smaller one tomorrow still counts. If energy's been low for a while, Running low looks at sleep, food and the body.* and Running low |

*Talk to someone now* is on every screen.

### Plan the week (level 2, part 2a, built 13 Nov 2026)

*Plan a few for this week* on the start screen. Every level stays a choice from the start (no graduation yet).

| Step | What the person sees |
|---|---|
| `week_1` | *Pick a good thing for this week.* (*If nothing sounds good, that's part of feeling low. Pick one that feels doable. One is plenty.*) The person's things I like, then the whole catalogue (the energy on the day isn't known yet), or own words; *Which day? I'll check in that evening.* Today · Tomorrow · The day after tomorrow · In a few days · In about a week; *Another one?* That's enough for now · Add another. Next books `good_week_one` for that day: the card is the plan, so there's no separate yes |
| `week_2`, `week_3` | *And another?* / *One more?*, the same, never offering a thing picked in an earlier slot, kept or catalogue (`options.notIn`, a runtime addition: `where` filters only the skill's own list). Three at most |
| `picture` | One planned: *{wk1}: picture the best ten seconds of it.*; more: *Pick one of your good things. Picture the best ten seconds of it.* A 10 s timed `holdRing` (*Where you are, what you can see and hear, the bit you'd like most. If nothing comes, picturing where you'll be is enough.*) |
| `week_set` | *Your good things are planned.* (one: *Your good thing is planned.*) *I'll check in on the evening of each day. Doing it counts, whether or not you enjoy it.* No list: catalogue labels carry commas and colons, and the person has just picked them |
| `back_w1`–`back_w3` | The day's card reopens the run at its own step: *The good thing you planned: {wk<n>}.* (never *today*: a card can sit on Today after its day) *Did it happen?*, then the same `after`, keep and end cards as level 1 (`keep_more_w<n>` keeps `wk<n>`, stored as a pick) |

**Cards.** `good_week_one`–`good_week_three` (*Your good thing*: *A good thing you planned.* / *Another good thing you planned.* /
*One more good thing you planned.* then *Did it happen?*, never naming it or the day, and never alike on one evening):
chips `evening` (today, 20:00) and `tomorrow` / `day_after` / `few_days` / `this_week` at 18:00, 1, 2, 3 and 6 days on;
stale after 24 h; opening resolves them; bound to `good-things`. One type per slot, as Give has one per reopens
step, so no new deep-link variable. The server accepts the new `day_after` chip.

**Runtime.** Each card's step clears every review answer (one reopened round is about one good thing), and a run
reopened at any of them keeps the path up to the latest plan step (`skill-runtime.md`, `reopens`), so reviewing the
second thing first never stops the first or third card from reopening.

**Not yet (from the gates):** moving a missed good thing to another day (*Not today* gets the kind line and Running low, as at level 1); weekday names on the day chips (chip labels are fixed). `thing_i_like` accepts `wk1`–`wk3` and stores
them as `pick`, one at a time.

### The catalogue

Paraphrasing H16's range, no verbatim list. Each carries the least energy it takes; *Hardly any* shows the first five,
*A little* adds eight, *Some* adds four.

| Energy | Good things |
|---|---|
| Hardly any | a song you like; a window or a patch of sun; a photo of a place or a day you liked; one clip that's made you laugh before; a smell you like |
| A little | a warm shower or bath; an animal; a message to someone you like; five minutes outside; make something for ten minutes; a few pages of something you enjoy; a plant or a garden; ten minutes reading about something you're curious about |
| Some | a short walk somewhere you like; dance to one song; call or see someone you're easy with; somewhere you like being (a park, a library, a bench) |

No food, drink, shopping or scrolling (the PRD keeps impulsive pleasures out), no gratitude push, no streaks. Photos are a place or a day, never people (they can sting in grief); the screen items are bounded (one clip, ten minutes); no place that costs money.

## Saved

- **`thing_i_like`** (`ProfileFact`, many (60), My words, own words encrypted; `functions/src/profile/kinds.ts`): kept
  on *Keep it* (`kindIds` / `kindOwn`) or *Add it* (`pickIds` / `pickOwn`), linked `KEPT_FROM` the visit. The
  **`thingsILike`** slice (`PROFILE_NEEDS['good-things']`) returns each active one that's a thing to do with its label:
  the person's own words, else the good thing's label read from the graph (`SkillOption good_things:activity:<id>`,
  never a copy). A thing kept only as a chip (*A colour*) isn't one: it stays in Me, out of the pick list.
  **`thingsILikePicks`** is the catalogue ids kept that way, so the catalogue drops its copy and *Add it* isn't
  offered twice. Me lists every one under My words, named the same way (chips by `good_things:kind:<id>`), with
  *Set aside*.
- **`ext.run`** (plan D2): the visit's answers, kept ids and booked follow-up; a kept thing picked again is its id, never
  its label (its label can be decrypted own words). No `SkillPractice` rep of its own.
- **`good_thing`** (`scripts/practice-spine/content.py`): chips `hour` (60 min), `afternoon` (16:00), `evening` (20:00),
  `tomorrow` (18:00 next day); stale after 24 h, no missed path, in-tab only; in `OPEN_RESOLVES` and
  `FOLLOW_UP_SESSION_TOOL`.

**Runtime (R3, with this batch):** a field that lists a profile slice names its pick in a title slot by what the
person kept (`labelOfValue` / `titleSlots`), display only; a kept thing that's gone or set aside since reads as the
skill's `profile_unnamed` copy, never its id or a raw `{slot}` (agreed with the plan thread, 12 Nov).

## Connected

- **The positive-state result** (`src/components/checkin/StateResult.tsx`): *Want to stay with it a moment, and keep
  it?* with *Keep this one* (Good things, `frame=savour`) and *Done*.
- **Check-in routing** (`scripts/recommendations/content.py`): Low drive's *bored*, *apathetic* and *indifferent* get
  Good things as the second card after Running low (`rf_reward_drive_low_words_flat_good-things`, signed off 12 Nov under
  *default to connected*). Tagged change / redirect / up: never on a flooded result (default bands only), and fine on a
  blank one. The rest of Low drive keeps Do the Opposite as its swap.
- **Let it be's *one small thing*** (what's still in my hands) opens it; the exit is built.
- **Tools page**: listed under Emotion Regulation; intent *Find something good*.

## Departures from the PRD

| PRD | Built | Why | Batch |
|---|---|---|---|
| Levels unlock by reps (level 1 after three kept items, level 2 after five completions with *lighter* twice, level 3 after ten), offered, never pushed | Every level is a choice from the start, level 0 first | Counting reps is a server read over past visits; the PRD's own rule is that every level stays reachable | ER-B4 part 2 |
| Level 2: plan good things for the week (`weekPlanner`, one FollowUp each, the best ten seconds pictured) | Built 13 Nov as three plan steps, no embed (see *Plan the week*) | Placing things on a week grid is more than the moment holds; a day chip per thing does the job | — |
| Level 3: the directory as a mirror (by kind, times done, a *lighter* count, the monthly card at ten items) | Things I like is a plain list in Me | Counts on a kept thing move log → profile; they wait for part 2's yes | ER-B4 part 2 |
| `PleasantActivity` nodes with `GOOD_FOR` edges; three shown, *show others* swaps modality | The catalogue is this skill's options (graph content through `skills.cypher`, each with its energy); one short list per energy | A skill's content lives in its options until a second reader needs the nodes | ER-B4 part 2 |
| Level 0 only while the last three check-ins are Low drive or Shut down; numb prompts favour strong sensory input | One find prompt for everyone | Needs a read of past check-ins | ER-B4 part 2 |
| `micro-win` migrated into the graph as a level-0 variant | The low-energy result keeps its micro-win guided activity | The result screen's activity is CORE's (guided activities) | CORE |
| Own additions matching CORE target behaviours get a gentle note | Not built; meanwhile an own-words pick is never offered for Things I like on *Lighter* | CORE-04's target behaviours don't exist yet | CORE |
| Level 1 only from `steady`; level 0 for `stirred` | Every band but flooded gets both | The band is optional on a carried reading; a stirred person can still pick level 0 first | ER-B4 part 2 |
| The low-energy result (`conservation_freeze`) as an entry point | Not routed; Low drive's flat words are | Shut down's cell already carries two signed-off cards | ER-B4 part 2 |
| `ADDRESSES` edges to apathy, boredom and the rest | None; the routing word rule names the words | ER-06's emotion links | ER-06 |
| A `PositiveExperience` → `SkillPractice` rep | No rep (see Saved) | Reps wait for part 2's counts | ER-B4 part 2 |
| `ThingILike.source` / `firstAt` / `lastAt` | A `ProfileFact` with `source` and `confirmedAt` only | Times done and last done are part 2's mirror | ER-B4 part 2 |
| Three shown, *show others* | The whole list for that energy (up to 17) | Needs a *show more* in the runtime's chip field | ER-B4 part 2 |
| MF-07 *Keep it*, MF-02's practice home, ER-09's values step, DT-06 level 3 as entry points | Not built | Those hosts aren't built | MF / ER-B4 (ER-09) / DT-06 part 2 |

## Safety

- Not for flooded: a carried flooded reading gets the body first or *Try it anyway*, never a lock.
- Anhedonia: the validation line is on the pick screen; *didn't enjoy it* is data, with the reps line, never a failure.
- Heavier after trying: no blame, and First, the body and Running low on the end card beside *Talk to someone now*.
- No impulsive pleasures in the catalogue; no gratitude push; nothing negative is said about what wasn't done.
- Hopelessness: *Talk to someone now* on every screen opens `safety.open`.
- The Today card is content-free.
