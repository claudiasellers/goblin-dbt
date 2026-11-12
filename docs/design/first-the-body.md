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
| `state` | *What's it like right now?* A wave · Restless or buzzing · I want to do something · Frozen or numb · Far away · My mind won't stop · **Chest pain or feeling faint** | Step 1 |
| `medical` | Chest pain or feeling faint: the `medical` banner (911 first; UK 999, Ireland and the EU 112, Canada 911, Australia 000, New Zealand 111), *Sit or lie down. Even if it eases, get it checked today.* No close | Medical triage |
| `urge` | I want to do something: *First, a way to wait it out.* → `pause`, which asks about hurting yourself first (C6.5). No *Done* here, so the way on is Hold to wait. No close | State → DT-02 |
| `cold_near` | A wave: *Is there cold water, or something cold, near you?* No → squeeze | — |
| `cold` | *Circuit Breaker: cold on your face.* *Wet a cloth with cold water, or wrap a cold pack in a cloth.* · *Lean forward. Hold it on your forehead, eyes and upper cheeks.* · *Breathe out slowly, or hold your breath if that's comfortable.* The caution line (*Skip this with heart trouble, fainting, an eating disorder, pregnancy, a cold allergy, or after drinking or using today. Never in a shower or a bath. Cold, not ice-cold.*), a 3-second lead-in, a 30-second ring (`doseTimer`). *Cold like that can slow your heart for a bit.* No face in water | TIP-T |
| `squeeze` → `tight` | *Squeeze, then let it drop.* Three rounds, press and hold to squeeze, the drop on the out-breath (`squeezeRelease`). Then *How does your body feel now?* Tight · Loose · Can't tell (nothing hangs on it) | TIP-P, the contrast |
| `move` | Restless or buzzing: *Move fast for a minute.* *Stand up and march on the spot, knees high.* · *Or go up and down the stairs.* *Go at your own pace. Slow down or stop if anything hurts.* A 3-second lead-in, a 60-second ring (`doseTimer`). *That's a minute. Let your breath settle.* The swap is the long out-breath. Never offered for anger (*A wave*) | TIP-I, the move burst |
| `press` | Frozen: *Press the phone hard between your palms.* *Keep a thumb on the circle while you press. Letting go early still counts.* Three 10-second holds (`holdRing`) | Frozen first (the PRD's "press the phone between the palms") |
| `orient` | Far away: *Eyes open. Look around you.* Today's date and time on screen, find three things (`orientFind`) | Far away first |
| `find` | My mind won't stop: *Give your eyes a job.* Five blue things | Loop first |
| `check1` | *Compared to when you started, it's…* Louder · About the same · Quieter · Much quieter (frozen and far away: Further away · About the same · A bit more here · More here). This **is** the session's close (`askFresh: 'thenVsNow'`) | Close |
| swap | Not quieter: the wave gets the long out-breath (`exhale`, 4 in / 7 out, 90 s, `breathPacer`, with *Dizzy or tingly? Stop and breathe normally.*: dizzy goes to a squeeze and drop with no paced breath, `squeeze_still`, if squeeze hasn't run); frozen gets *Wake your hands up* (`bodyCard`); far away gets *Something strong* (*Hold something cold, or smell something strong. Feet into the floor.*); the loop gets *Now give your ears one* | Swap |
| `check2` | The same question again (it overwrites the close) | — |
| `lower` → `someone` | Second time not quieter: *You don't have to make this go away. Let's get through the next two minutes.* A plain two-minute ring that starts on its own and isn't stopped by a tap. A wave or a loop: *Nothing to do. Watch the ring and breathe however you breathe.* Frozen or far away (`lower_here`): *Nothing to do. Eyes open, feet on the floor.* (nothing passive, C6.3). Then the crisis banner and *If you want someone with you right now, you can call or text one of these.* The kit's people are planned (DT-03) | Lower the demand |
| `fork` → `end` | Quieter: *Can anything be done about this right now?* Yes → Problem Solve, DEAR MAN, Do the Opposite · No, it's how things are → Let it be (DT-04, built 11 Nov) · Not right now → Give your mind a job (planned, DT-06) · I needed to get through it → *You got through it. That's the skill.* | The fork |

*Talk to someone now* (`safety.open`) is on every screen but two: the medical card, whose banner is the emergency number, and the someone card, which shows the crisis banner itself. It is and the player's *This is too much right now* is under every
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

- **Cold carries its caution line** (D4, changed 12 Nov: no self-check). The line names who should skip it, *drinking
  or using today* included. Never a shower or bath, never ice water.
- **Direction is never wrong** (C6.3). Frozen gets press and wake up; far away gets eyes-open orienting and something
  strong. Neither is offered a calming mode. The long out-breath is only ever the wave's swap, and it has a stop rule.
- **Chest pain or feeling faint** is on the first screen and goes to the emergency number, never a body mode. Its line never reads as permission to skip care once it eases.
- **A pull to do something** goes to Hold to wait, which asks about hurting yourself first.
- **Nothing locks.** Every body embed's way on is a quiet link from the start and the button once it's done. Press
  uses Hold to wait's `holdRing`, whose quiet way on appears after the first try, held or let go.
- No chip is food, drink, shopping or scrolling as a comfort (C6.7).

## Deferred to DT-01 part 2

- `CrisisState` and `Intervention` graph nodes with `ROUTES_TO`; moving `src/data/microSteps.ts` (clinical content in
  the frontend) into them.
- The hosts: Help me now (`HelpNowInterim`, entered as flooded), StateResult's *That feels like too much right now*,
  the inline `regulate` mode in other skills, and `five-senses` folded in as the orient mode.
- Reps per mode and the fade (*Your usual: press*), and the two-far-away-visits referral line. The referral is an
  aggregate over sessions, so it waits on the fade's read path.
- The rhythm pulse under the hold ring, with its optional audio twin.
- Also part 2 (the hosts batch), from the PRD and not built here: the fork carrying the emotion and context into the
  tool it opens; the *get through* check-back and the follow-ups (DT-04, DT-06, CORE's next-day card); hand on heart
  as a swap; the flooded + blank short path; steady's *practise when calm*; the `dbt_crisis_survival` / `help-now`
  concept, the `escalation_suggested_tool` fix and the `PracticeSkill` cold grade. They need the hosts or the spine
  pieces those PRs bring.

## Departures from the PRD

| PRD | Built | Why |
|---|---|---|
| Pictograms on the state cards and cold steps | Plain short labels; the cold mode has the Circuit Breaker face art | No pictogram set exists yet. A design task, not a flow change |
| Move burst (TIP-I) never at night outside, with a metronome | Built for *Restless or buzzing* with no gate: *Go at your own pace. Slow down or stop if anything hurts.* Marching on the spot or stairs, indoors. No metronome | Claudia, 11 Nov: fitness apps suggest marching all the time; a pace line is enough. The pulse audio is part 2 |
| `wave_numb` state | Not a separate card | Frozen or numb covers it |
| Medical screen once per profile | No screen and no self-check (D4, changed 12 Nov): the cold card's caution line names who should skip it | — |
| Medical: the emergency number, *then orient* | The number and *Sit or lie down. Even if it eases, get it checked today.* No orient offer | Orienting reads as "carry on" after a possible cardiac event; Gate 3 asked for the line instead |
| Direction per state (up for frozen) | Stored as `regulation_down` for every state | The close kind is per tool. See the runtime change above |
| Sound | The dose's end chime only (the deadline timer's); no rhythm pulse or audio twin | The PRD's pulse audio is off by default anyway |
