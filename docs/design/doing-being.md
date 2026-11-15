# Doing mind, being mind (MF-09)

**Status:** built 15 Nov 2026 on the skill runtime (MF-B9; [the modules plan](dbt-modules-plan.md) §5.3a). Tool
`doing-being` on the new concept `dbt_skillful_means` (DBT Mindfulness Handout 9, read with MBCT's doing and being
modes), listed under Mindfulness with the intent *I keep trying to fix how I feel* (`enterAt=mode`). Source:
`scripts/skills/doing_being.py`. Tests: `tests/skill-doing-being.test.mjs`. Rolling back is removing `'doing-being'`
from `src/lib/skillRuntime/playerTools.ts`, its entry and intent in `src/data/tools.ts`, Problem Solve's
`doing_being` link and the Practice home's week line.

## What it is

PRD MF-09: rumination is often doing mode aimed at a feeling, trying to solve it like a task. Drifting is the other
imbalance: days with no doing at all, which feeds low reward and shame. Both modes are needed, and wise mind uses each
when it fits. The PRD calls it "mostly embedded": One thing's rumination variant already asks the mode card inside its
own run (MF-B4, `scripts/skills/one_thing.py`). This skill is the library entry, the card on its own for hosts that open
it, and the weekly shape.

## The flow

| Step | What the person sees | PRD MF-09 |
|---|---|---|
| `about` | The library entry: *Doing mind, being mind.* *Doing mind works things out, plans and fixes. Being mind notices and lets things be.* *Both are needed. Wise mind uses each one when it fits.* Which would help now? Is my mind stuck trying to fix something? · How did this week feel? | The one-screen explainer (MF H9 paraphrased) |
| `heads_up` | A carried flooded reading, from the library: *Your body's loud right now.* My body first (First, the body) · Go on anyway. Opened straight at the card or the week, the same line sits on that screen with *My body first* as a link | Any band but flooded; never a lock |
| `mode` | *Is your mind trying to fix a feeling like a task?* (*Going over it, working it out, trying to make it stop.*) Yes · Maybe · No | Step 1, the mode card (One thing's words) |
| `switch` | Yes: *That sounds like doing mind. Feelings don't get solved like tasks.* (maybe: *That might be…*) *Doing mind is useful. A minute of being mind can give it a rest.* One minute of being mind? A minute of listening · Not now; *One thing, done fully, instead* as a link | Step 2: one pick, one swap |
| `listen` | The `pebbleBowl` for 60 s, eyes open: a pebble for each new sound or each time you catch yourself back in the problem | MF-01 Listen |
| `listen_end` / `not_now` / `mode_no` | *That was being mind. Doing mind will still be there when you need it.* · *Not now is fine. Noticing it was doing mind is already a step outside it.* · No: *Then there's nothing to switch. Carry on.* | No: back to the host with nothing added |
| `week` | `?enterAt=week` (the Practice home's *How did this week feel?*): *This week felt…* Mostly doing · Mostly being · Mixed · Drifting | Step 3, the weekly shape |
| `cue` / `cue_end` | Mostly doing: *One being break a day, then?* at a moment you already have (when I sit down for a break, make a drink, wash my hands, get in the car or on the bus, get into bed, or my own moment), then *Your being break: {cue}.* with *Ask me tomorrow how it went?* (morning or evening) | One being break a day as a One thing cue |
| `back` | The `being_break` card reopens the run: *Your being break: {cue}. Did you get to take one?* Yes · Sort of · Not yet; yes is an off-phone rep | Follow-up: an off-phone rep |
| `drift` | Drifting: *One small doing could help.* *Something you can finish today, however small. Done beats done well.* One small thing to finish (Build mastery); a blank frame leads with *Move to something first* (Join in, `frame=blank`) | Drifting → ER activation; blank → MF-10, never a being practice |
| `being_end` / `mixed_end` | Mostly being: *Rest counts.* and one small doing as an offer. Mixed: *Sounds balanced.* | Mixed → nothing else |

*Talk to someone now* (`safety.open`) is on every screen. Close kind `none`: every answer is plain. A completed visit
(the card answered, the switch taken or not, or the week's shape) is a `skillful_means` rep (a new `PracticeSkill`,
Preliminary, `defaultFor ['doing-being']`), not in the Practice home's MF sequence (the PRD's sequence has no skillful
means). Answering *no* or *not now* completes it too: the PRD's rep records the answer and whether the switch was taken.

**Hosts.** Problem Solve's *I've been thinking about it constantly* links the card (*Is my mind trying to fix a
feeling?*, `enterAt=mode`): the rumination guard, rebuilt without a loop counter. One thing's rumination variant keeps
its own copy of the card in its run. The Practice home's week ring has *How did this week feel? Doing, being or
drifting* (`enterAt=week`), a line to tap when the person chooses, never asked.

## Where it departs from the PRD

- **No fade from a count.** The PRD offers the switch directly after five answers. The runtime reads no earlier visit,
  so the question is always asked (it is one tap). Part 2, with the Practice home's fade levels.
- **The minute is here, One thing is the swap.** The PRD's *MF-01 Listen or MF-05* is a minute of listening on the
  pebble bowl in this run (so the switch is recorded with the answer), with One thing a link away.
- **Mostly being** has no branch in the PRD; it gets *Rest counts.* and one small doing as an offer, never a push.
- **The weekly shape lives on the Practice home** (the PRD's open question: CORE's weekly review doesn't exist yet), as
  a line, not a weekly prompt.
- **No eating moment** among the cues (*sit down for a break*, not *lunch*), so Running low's food setting never needs
  reading here.

## Part 2 (deferred)

| Item | Why it waits |
|---|---|
| The card's fade (the switch offered directly after five answers) | Cross-visit reads (MF-02 part 2) |
| The weekly shape inside CORE's weekly review | CORE's review |
| Drifting's follow-up handed to ER activation | ER's activation follow-up |
| Metrics: yes/maybe share that reaches a finished minute; week shapes over months | Reflect's MF section |
