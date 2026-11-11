# First, the body (DT-01)

**Status:** built 11 Nov 2026 on the skill runtime (DT-B2; [the modules plan](dbt-modules-plan.md) §5.1). The tool
keeps its id, `cool-down` (D6), renamed *First, the body*; *Circuit Breaker* is its cold mode and keeps that name.
Source: `scripts/skills/first_body.py`. Embeds: `src/components/skillPlayer/BodyEmbeds.tsx` over the pure
`src/lib/bodyModes.ts`. Tests: `tests/skill-first-body.test.mjs`. The old page `src/pages/tools/CoolDown.tsx` stays in
the tree, unrouted (C8); rolling back is removing `'cool-down'` from `src/lib/skillRuntime/playerTools.ts`.

This is DT-01 part 1: the skill, its modes and its close. Help me now, the too-much link and the other hosts still
open what they opened before (part 2, below).

## What it is

PRD DT-01 (DBT DT Handouts 1–3 and 6, TIP; Linehan 2015) for a moment when someone can tap once or twice and can't
read. One tap says what it's like. The body gets one mode, one per screen. A one-tap *Quieter?* says what comes next:
the fork when it's quieter, one swap to a different mode when it isn't, and after a second *not quieter*, lowering the
demand (*You don't have to make this go away*) with someone to talk to on the screen.

## The flow

| Step | What the person sees | PRD DT-01 |
|---|---|---|
| `state` | *What's it like right now?* A wave · I want to do something · Frozen or numb · Far away · My mind won't stop · **Chest pain or fainting** | Step 1 |
| `medical` | Chest pain or fainting: the `medical` banner (911 first; UK 999, Ireland and the EU 112, Canada 911, Australia 000, New Zealand 111), *If it's chest pain, fainting or you can't get your breath, call now. If it passes, come back here.* No close | Medical triage |
| `urge` | I want to do something: *Your hand needs a job first. Hold to wait gives it one.* → `pause`, which asks about hurting yourself first (C6.5). No close | State → DT-02 |
| `screen` | A wave: the one-tap self-check (D4). *Cold on your face can slow your heart. Is any of this true for you?* Heart trouble or fainting · an eating disorder or very low weight · pregnant · Raynaud's or a cold allergy · drinking or using today. Yes, one of these → squeeze · None of these · Not sure | Medical screen (part) |
| `cold_near` | *Is there cold water, or something cold, near you?* No → squeeze | — |
| `cold` | *Circuit Breaker: cold on your face.* Three steps, the caution (*Never in a shower or a bath. Cold, not ice-cold.*), a 3-second lead-in, a 30-second ring (`doseTimer`). *Your heart slowed for a bit. That's what cold does.* | TIP-T |
| `cool` | Not sure on the self-check: *A cool cloth, gently.* 15 seconds, with a caution line | *Not sure* rule |
| `squeeze` → `tight` | *Squeeze, then let it drop.* Three rounds, press and hold to squeeze, the drop on the out-breath (`squeezeRelease`). Then *How does your body feel now?* Tight · Loose · Can't tell (nothing hangs on it) | TIP-P, the contrast |
| `press` | Frozen: *Press the phone hard between your palms.* *Keep a thumb on the circle while you press. Letting go early still counts.* Three 10-second holds (`holdRing`) | Frozen first (the PRD's "press the phone between the palms") |
| `orient` | Far away: *Eyes open. Look around you.* Today's date and time on screen, find three things (`orientFind`) | Far away first |
| `find` | My mind won't stop: *Give your eyes a job.* Five blue things | Loop first |
| `check1` | *Compared to when you started, it's…* Louder · About the same · Quieter · Much quieter (frozen and far away: Further away · About the same · A bit more here · More here). This **is** the session's close (`askFresh: 'thenVsNow'`) | Close |
| swap | Not quieter: the wave gets the long out-breath (`exhale`, 4 in / 7 out, 90 s, `breathPacer`, with *Dizzy or tingly? Stop and breathe normally.*: dizzy goes to squeeze if it hasn't run); frozen gets *Wake your hands up* (`bodyCard`); far away gets *Something strong*; the loop gets *Now give your ears one* | Swap |
| `check2` | The same question again (it overwrites the close) | — |
| `lower` → `someone` | Second time not quieter: *You don't have to make this go away. Let's get through the next two minutes.* A plain two-minute ring that starts on its own (a tap stops it), nothing to do. Then the crisis banner and *If you want someone with you right now, the support is here on the screen.* The kit's people are planned (DT-03) | Lower the demand |
| `fork` → `end` | Quieter: *Can anything be done about this right now?* Yes → Problem Solve, DEAR MAN, Do the Opposite · No, it's how things are → Let it be (planned, DT-04) · Not right now → Give your mind a job (planned, DT-06) · I needed to get through it → *You got through it. That's the skill.* | The fork |

*Talk to someone now* (`safety.open`) is on every screen, and the player's *This is too much right now* is under every
screen. No band is asked (C6.2). The skill accepts a carried `band` but steers on nothing yet.

## Runtime changes (C7, this branch)

All three are documented in [`skill-runtime.md`](skill-runtime.md).

- **The close, asked in the flow.** A field with `askFresh: 'thenVsNow'` is the session's close. `build.py` holds it to
  the spine's four values (worse, same, better, much_better), max 1, required, no own words. The player sends the
  newest answer as `thenVsNow` with the close and doesn't ask `SessionClose` after it; a later answer (the second
  check) overwrites the first. The parts tag row (`PartTagSlot`) shows after a saved better close, as it does after
  `SessionClose`. The server's direction comes from the tool's close kind (`cool-down` stays `regulation_down`), so
  *A bit more here* for frozen is stored as `better` with direction down. That's the same simplification the old
  page made; part 2 can give frozen and far away their own direction.
- **The `medical` crisis slot.** `danger: 'medical'` on an option opens the `medical` banner (`CrisisBanner`
  `variant="medical"`: the emergency number for a body emergency, not 988).
- **An embed step's `hint` shows.** Embed steps dropped it before; press needs its instruction on screen.

## What it records

`ToolSession.ext.run` (the runtime's record: every answer, the path and each embed's output: `done` / `partly` /
`skipped` with `durationSec`; squeeze and find also `doneCount`; the out-breath also `dizzy`) and the spine's
`thenVsNow` from the in-flow check. The medical and urge hand-offs and `someone` are not closes.

## Safety

- **Cold only after the self-check** (D4). Any yes rules cold out for squeeze and drop; *not sure* gets a cool cloth,
  15 seconds, gently, with a caution. Never a shower or bath, never ice water, and *drinking or using today* is on the
  check itself.
- **Direction is never wrong** (C6.3). Frozen gets press and wake up; far away gets eyes-open orienting and something
  strong. Neither is offered a calming mode. The long out-breath is only ever the wave's swap, and it has a stop rule.
- **Chest pain or fainting** is on the first screen and goes to the emergency number, never a body mode.
- **A pull to do something** goes to Hold to wait, which asks about hurting yourself first.
- **Nothing locks.** Every body embed's way on is a quiet link from the start and the button once it's done. Press
  uses Hold to wait's `holdRing`, whose quiet way on appears after the first try, held or let go.
- No chip is food, drink, shopping or scrolling as a comfort (C6.7).

## Deferred to DT-01 part 2

- `CrisisState` and `Intervention` graph nodes with `ROUTES_TO`; moving `src/data/microSteps.ts` (clinical content in
  the frontend) into them.
- The hosts: Help me now (`HelpNowInterim`, entered as flooded), StateResult's *That feels like too much right now*,
  the inline `regulate` mode in other skills, and `five-senses` folded in as the orient mode.
- The full medical screen, once per profile and editable in Me (`body_flags`), with the asthma, seizure and injury
  flags. It belongs to the safety batch.
- Reps per mode and the fade (*Your usual: press*), and the two-far-away-visits referral line. The referral is an
  aggregate over sessions, so it waits on the fade's read path.
- The rhythm pulse under the hold ring, with its optional audio twin.

## Departures from the PRD

| PRD | Built | Why |
|---|---|---|
| Pictograms on the state cards and cold steps | Plain short labels; the cold mode has the Circuit Breaker face art | No pictogram set exists yet. A design task, not a flow change |
| Move burst (TIP-I) | Not shipped | It needs the full medical screen (cardiac, pregnancy, asthma, ED, injury) to be safe. Back with the safety batch |
| `wave_numb` state | Not a separate card | Frozen or numb covers it. A clinician can split it later |
| Medical screen once per profile | A one-tap self-check every time cold is next (D4) | Nothing is stored yet, so asking each time is the safe default |
| *Not sure* on the screen | Warns (a cool cloth, gently), doesn't block | As the PRD says. Kept as a question for the clinician pass |
| Direction per state (up for frozen) | Stored as `regulation_down` for every state | The close kind is per tool. See the runtime change above |
| Sound | Off; no audio twin built | Sound is off by default in the PRD too |

## Clinician pass (open)

- The self-check list and wording, and whether *not sure* should block cold rather than warn.
- The two-minute *lower the demand* card: its length, and whether to name a person from the kit there once DT-03
  ships.
- Splitting *Frozen or numb* into two cards.
