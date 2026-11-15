# Join in (MF-10)

**Status:** built 15 Nov 2026 on the skill runtime (MF-B9; [the modules plan](dbt-modules-plan.md) §5.3a). Tool
`join-in` on the existing concept `dbt_participate` (DBT Mindfulness Handouts 4, 4c), listed under Mindfulness with the
intent *Stop watching myself and join in*, and on the Practice home as *Join in* (`mfOrder` 7, after What works; Kind
wishes moves to 8). Source: `scripts/skills/join_in.py`. Tests: `tests/skill-join-in.test.mjs`. New embed: `beatPulse`
(`src/components/skillPlayer/BeatPulse.tsx` over `src/lib/beatPulse.ts`). Rolling back is removing `'join-in'` from
`src/lib/skillRuntime/playerTools.ts`, its entry and intent in `src/data/tools.ts`, its `MF_SEQUENCE` row and Notice
what's here's blank-frame link.

## What it is

PRD MF-10: self-conscious watching of yourself (social anxiety, shame), and blank states where observing fails because
nothing registers. Participate asks for full engagement, which needs no words; Linehan's endpoint for it is doing a
thing without narrating it. Body before words by design.

## The flow

| Step | What the person sees | PRD MF-10 |
|---|---|---|
| `pick` | *Pick something to throw yourself into.* (*Move in whatever way your body can. Sitting is fine.*) Move to a song · Sing or hum along · Tap a rhythm · A game with someone · A chore with music · Something of my own (no words asked) · I'm wound up or angry right now. A blank frame says *The beat runs a little quicker today, in short rounds. Sitting is fine.* | Step 1 |
| (gated) | A carried flooded reading (*Your body's loud right now. This one turns things up. Settle your body first, or try something slower.*) or a carried anger word (*This one turns things up. Today's a day to bring things down first.*): *Bring it down first* is the one chip. It, and *I'm wound up or angry right now* on an ungated screen, go to `gate_end` (*Not now is fine.* or *Then bring it down first.*, *Join in will be here on a calmer day.*) with *My body first* (First, the body) and *Something slower: listen for a minute* (Notice what's here, `frame=listen`); no rep | Not offered flooded (DT first) or angry (Kjærvik & Bushman 2024) |
| `play` / `play_calm` | The three on-phone picks: `beatPulse`, titled with the pick's way in (*Move to the beat, or to a song of your own.* · *Hum or sing along to the beat. Any tune, any words.* · *Tap along, on the circle, a table or your knees.*) and the one instruction: *Throw yourself in. When you catch yourself watching yourself, drop back in.* A minute at 100 bpm; a carried stirred reading 84 bpm | Step 2; stirred → a moderate tempo |
| `play_blank` / `settle` / `play_blank2` | A blank frame (Notice what's here's blank branch, Doing mind's drifting): 25 s at 112 bpm, *Let it settle for a moment. Another round?*, a second round (*Move on* before it counts the first round and goes to the close) | Faster for blank; 15–30 s doses with a settle between |
| `away` | The off-phone picks: *Throw yourself in.* the instruction, *Put the phone down. Come back when you're done.*, I'm back | Step 2, off the phone |
| `with` / `end` | *How much were you in it?* In it · Half in · Watching myself, each answered plainly (*Watching yourself is the thing you practise dropping. Noticing it is the start.*). *You joined in.* with *Join in at something with someone soon? I'll ask how it went.* (tomorrow or in a few days) | Steps 3 and 4 |
| `social` | The `join_in_social` card reopens the run: *Did you get to join in at something with someone?* Yes · Sort of · Not yet; yes is an off-phone rep | The off-phone social rep |
| `skip_end` | *Move on* before the beat started: *Not this time. It'll be here when you want it.* Not complete, no rep | |

**The beat** (`beatPulse`): a circle that swells on every beat and settles back within it, and is the tap-along target (taps are a measure in the
report, never shown or counted on screen). Sound is off until the person presses *Sound* (MF rule 8); while on, a soft
tick follows the beat. Reduced motion: the circle brightens on the beat instead of swelling, at the same timing. The
screen stays awake while it runs (the deadline timer); *Move on* is always there; a dialog over the step
(*Talk to someone now*, P2) stops the beat and ends the round as it was, with no *That's the round.* A short buzz at the
end, for anyone moving with their eyes off the screen; focus goes to the end line, not to Next, so a key still tapping
along doesn't press it.

*Talk to someone now* (`safety.open`) is on every screen. Close kind `none`: *How much were you in it?* is the close.
A completed visit is a `participate` rep (a new `PracticeSkill`, Preliminary, `defaultFor ['join-in']`).

## Where it departs from the PRD

- **Its own tool now.** The PRD's lean is the participate framing on DT's somatic activation tools when they ship
  (shake and stomp, pluck awake), with its own practice card. Those aren't built, so Join in is its own tool with a
  simple beat; when the somatic rhythm engine ships, the beat can hand over to it.
- **A simple beat, not the somatic engine.** No motion input, no pluck; the Tune room's audio is part 2.
- **Anger is read from a carried word** (the angry family's high-energy words), since the band alone doesn't say anger.
  Any carried anger word gates it, whatever the band. No entry carries the check-in's words yet (the Tools card, the
  intent, the Practice home, the hosts), so the pick screen also has *I'm wound up or angry right now*.
- **No vestibular opt-outs** beyond *Sitting is fine*: the somatic opt-outs don't exist yet.
- **Blank** comes from a host's `frame=blank`: Doing mind's drifting week sends it. Notice what's here's blank-frame
  link is built but waits for a host that sends it `frame=blank`; a check-in result doesn't send it yet.
- **No routing row**: the PRD's entry points are the library, the Practice rotation and the two hosts.

## Part 2 (deferred)

| Item | Why it waits |
|---|---|
| The somatic rhythm engine (motion input, pluck, 2D and muted fallbacks) | DT/somatic owns it |
| Fade: beat only, the person's own music, the off-phone rep reported next day | The Practice home's fade levels |
| Practice rotation for people whose check-ins resolve to low drive or freeze often | Cross-visit reads (MF-02 part 2) |
| The participate framing on DT's activation tools | Those tools |
| Metrics: *in it* share over reps; off-phone social reps | Reflect's MF section |
