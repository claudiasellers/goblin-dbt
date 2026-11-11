# Ride it out (DT-05)

**Status:** built 11 Nov 2026 on the skill runtime (DT-B3, the DT-05 half; [the modules plan](dbt-modules-plan.md)
§5.1). The tool keeps its id, `urge-surfing` (D6), renamed *Ride it out* (the PRD's lean; *urge surfing* stays in
"what this is based on"). Source: `scripts/skills/ride_it_out.py`. Embeds: `urgeWave` and `waveTrace` in
`src/components/skillPlayer/UrgeWave.tsx` over the pure `src/lib/urgeWave.ts`. Tests:
`tests/skill-ride-it-out.test.mjs`. The old slider page `src/pages/tools/UrgeSurfing.tsx` stays in the tree, unrouted
(C8); rolling back is removing `'urge-surfing'` from `src/lib/skillRuntime/playerTools.ts`.

## What it is

PRD DT-05 (urge surfing, MBRP; DBT DT Handout 21 adaptive denial; Linehan 2015) for an urge that won't settle when
the person isn't about to act this second (that's Hold to wait) but needs to get through the next stretch. The urge is
an object on the screen, watched, not fought. Time gets a shape (rise, crest, fall) without anyone promising how long
it lasts. The 1–10 slider is gone: every sample is a tap on *still here · fading · gone · bigger* (plan C1 rule 2).

## The flow

| Step | What the person sees | PRD DT-05 |
|---|---|---|
| `pull` | *What's the urge?* Hold to wait's six pulls (same ids and `urge` props, so `urgeIds` match) or own words | Step 1 |
| `safe` | Hurt myself: `safetyFirst` opens `safety.open`, then *Right now, are you safe from acting on it?* Not sure / no → `reach` (someone to talk to, no ride, no close). The crisis banner stays on every screen after | Risks (C6.5) |
| `heads_up` | A carried flooded reading: *Your body's loud right now. It can help to settle it first.* My body first → First, the body · A way to wait first → Hold to wait (never after hurt myself) · Ride it now | Capacity: flooded |
| `ride` | *Urges rise and fall. The job is not to act while it's high.* The object (`urgeWave`), *Watch it. You don't have to do anything with it.* Every 75 s on the deadline clock (R13), a soft check: *How is it now?* Still here · Fading · Gone · Bigger. The object swells, softens or settles. *Tell it: not now* is there the whole time, and so is *Stop here* | Steps 2–3 |
| `bigger` | Bigger twice in a row: *It's getting bigger. Want to try something else for a bit?* Something for my body · A way to wait · Keep riding it | Step 3 (bigger ×2) |
| `not_now` | *Tell it: not now. Want something else instead?* Swaps for the pull (below), or five minutes with nothing else | Step 4 (H21) |
| `round` → `after_round` | *Not now. A walk for five minutes, even round the room.* (the title names the swap) A 3-second lead-in, a 5-minute ring (`doseTimer`). Then *How is it now?* Gone or fading → `passed` · Five more minutes → `round2` (once) · Still here → `ride2` | Step 4, renewable |
| `ride2` | The wave again, with no *not now* (a round was had, or *keep riding* picked). Bigger twice again → `switch` | — |
| `shape` | *Here's the wave you rode.* The trace as a line without axes (`waveTrace`), with *It rose, crested and came down.* when the last check was gone or fading, else *You rode it as far as it went today.* | Step 5 |
| `end` / `passed` | *You watched it come down without acting on it.* · *You told it not now, and it eased.* · *You stayed with it. That's the skill.* Offer: the Pros & cons card for this pull. Then the two-part close (R7: *Did you act on it?*, then-vs-now) | Step 5 |
| `switch` | *Let's change what you're doing. Your body first, or a way to wait.* First, the body · Hold to wait (not after hurt myself). No close: the next tool is the next step | Bigger ×2 |
| `hurt_end` | Hurt myself, safe for now: *You stayed with it. The support is still here if it comes back.* First, the body; the crisis kit (planned). No *did you act on it?* (as Hold to wait) | C6.5 |

The swaps, per pull (never food, drink, shopping or scrolling, C6.7): a walk, even round the room · cold water on my
hands or face · call or text someone (not for *send*, where texting is the pull) · hold something cold (hurt, hit,
use) · squeeze a pillow or a ball (hurt, hit) · put the phone in another room (send, check) · give my hands a job
(send, check, use, own words) · five minutes, nothing else.

## The wave (`urgeWave`, `waveTrace`)

- **No digits, no countdown.** The object's size and opacity follow a level from 0 to 1 that starts high (0.7: the
  person came because it's loud). Bigger +0.15, fading −0.18, gone → 0, still here holds; fading never empties it.
- **The clock is the deadline timer** (`useDeadlineTimer`, R13), so a locked phone or throttled tab can't stretch the
  wait. A soft buzz when a check is due; no chime. The screen stays awake while riding (`useKeepAwake`). Covered by
  `safety.open` or P2, the clock runs and the check waits on the screen.
- **Ends:** gone · bigger twice in a row · ten checks (`ended_long`) · *Tell it: not now* · *Stop here*
  (`ended_left`). Reduced motion: no pulse, no size transition.
- **Output** (`ext.run.out.<step>`): the samples in order, then how it ended, at most 12 ids (11 samples + the end);
  `durationSec` and `doneCount` (checks answered). The trace is categorical; there is no number the person gave.
- **`waveTrace`** reads the ride's answers (`rideField`, `againField`) and draws them as one smooth path, no axes, with
  its line as the image's label for a screen reader.

## What it records

`ToolSession.ext.run` (every answer, the path, each wave's samples and end, the rounds' `done` / `partly` /
`skipped` with seconds), the spine's `urgeIds` from the pull, and the two-part close (`actedOnUrge`, `thenVsNow`;
`closeKind: 'urge_change'` in `src/lib/spine/close.ts` and `functions/src/spine/tools.ts`). `switch`, `settle`,
`hurt_end` and `reach` are not closes.

## Routing

`urge-surfing`'s rows (today one: chronic vigilance, *worried*) move from the slider's off switch to
`BUILT_NOT_SIGNED_OFF`: still switched off and drafts, live on Claudia's sign-off. The generated
`schema/recommended-for.cypher` is unchanged by the move.

## Safety

- **Hurt myself opens `safety.open` first**, then *are you safe?*; not sure or no ends on someone to talk to with
  nothing to ride. The banner stays on every screen once hurt myself is picked. After hurt myself, the switch offers
  the body only (no phone-down wait), and the end card has no *did you act on it?*.
- **Flooded gets the body first** as a choice, never a lock. *This is too much right now* is under every screen.
- **No promised durations** (PRD risk line). Only the round the person starts says *five minutes*; a test holds every
  other line to no numbers, minutes or "it will pass".
- **No swap is food or drink** (C6.7). *Talk to someone now* is on every screen but `reach`, whose banner is the way.

## Deferred

- The person's own Find the feeling shape as the object (Shape room's urge loop), Tune's sound gesture, and the shared
  motion engine with ER-08's `waveRoom`: the 2D fallback ships now. The body anchor (*where is it?*).
- Backgrounded checks with a notification at each one (stirred, 5–20 min) and the morning card (*Last night: rode it
  out*); they need the follow-up action's push path.
- A host's pull (`urgeId` from Hold to wait's *Ride it out*, FTF's chase, OA's urge up): asked again until the hosts
  batch, as DT-10's is.
- Between checks: the optional hold ring and MF-01's noticing card (MF-01 isn't built).
- `NotNowSwap` graph nodes `FOR_URGE`, `UrgeSurfFlow` copy and `HELPS_WITH_URGE`: the swaps are skill options for now.
- The `UrgeEpisode` shared with DT-02, the `rode_it_out` rep, the per-urge trend, timestamps on samples, the fade
  (fewer checks over time), steady's *practise on a small urge*, DT-09's lapse plan on an acted *yes*.

## Departures from the PRD

| PRD | Built | Why |
|---|---|---|
| Swaps *a mint · a cold fizzy drink · something sour · a walk · a shower* | Walk, cold water on hands or face, call or text, hold something cold, squeeze, phone away, hands a job | C6.7: no food or drink as a comfort, and *Use, drink, binge or buy* is a pull |
| Wave trace with timestamps | Samples in order, no timestamps; the cadence is the step's `checkSec` | `ext.run.out` holds ids and measures only. A clinician can ask for offsets later |
| The user's FTF shape, Tune's sound | A neutral blob | Shared engine with ER-08 lands with ER-08 |
| Not now renewable | Renewable once, then the wave again | Keeps the flow finite in the runtime; a third round is a second ride |
| Bigger twice → DT-01 body mode or DT-02 hold | Both offered on a handoff, or keep riding | As the PRD, with *keep riding* added so it isn't a push away |

## Clinician pass (open)

- The swap list per pull, and whether *hold something cold* and *squeeze* belong under hurt myself.
- The check cadence (75 s) and the ten-check ceiling.
- Whether hurt myself should ride at all once safe for now, or go to Hold to wait.
- *Ride it out* vs *Urge Surfing* on the card.
