# Held (DT-07)

**Status:** built 12 Nov 2026 on the skill runtime (DT-B5, part 1; [the modules plan](dbt-modules-plan.md) §5.1).
New tool `soothe`, listed under Distress Tolerance with the Tools intent *Be kind to myself for a minute*. New
concept `dbt_self_soothe` (`PART_OF dbt_distress_tolerance`, `appToolId: 'soothe'`). Source:
`scripts/skills/held.py`. Tests: `tests/skill-held.test.mjs`. No new embed: the holds are `bodyCard` (kind
`hand_heart`) and `doseTimer`, the kind words are on `boundaryLine`. There was no old page. Rolling back is removing
`'soothe'` from `src/lib/skillRuntime/playerTools.ts` and the tool from `src/data/tools.ts`, and putting the
`planned` flags back on Hold to wait's `held` and Let it be's `soothe` exits (and dropping Hold to wait's *A hand on
my heart* move).

## What it is

PRD DT-07 (self-soothe with the five senses, DBT DT Handouts 8 and 8a; hand on heart, Somatic M29) for feeling raw,
worn out, ashamed or alone, or the end of a bad night. Being met with kindness is itself information ("this deserves
care"); the person's own hand, words and things take over from the app's, and the app points outward to real people.

## The flow

| Step | What the person sees | PRD DT-07 |
|---|---|---|
| `pick` | *This deserves some care. How would you like to be looked after for a minute?* (the witness line folded into the question, as Let it be does) A hand on my heart · Something warm · Something for one of my senses · Kind words · I don't deserve this. A carried flooded reading shows only the hand, warmth and the chip | Step 1; capacity: flooded |
| `deserve` → `try` | *You don't have to deserve it. Try thirty seconds, as an experiment.* Try it (a 30 s `hand_heart` card, then the close) · Not today → `not_today` (*That's okay. It's here for another time.*, no close) | Step 2's chip |
| `where` → `hold_<where>` | *Where would your hands like to rest?* (*If touch doesn't feel right, hold something instead.*) On my chest, over my heart · Around a warm mug · Holding something soft · Flat on my thighs. Each its own 60 s card (`bodyCard` kind `hand_heart`) with its own three lines, which ask the person to notice, never tell them what they'll feel. Flooded: the chest or the mug only | Hand on heart, touch-free ways first-class |
| `warm` → `warm_hold` | *What's warm nearby?* (*Warm, not hot.*) A warm drink · A blanket or a jumper · Warm water over my hands · A warm spot: sun, a radiator, a pet (flooded: the drink or the blanket). Then 60 s (`doseTimer`) | Warmth |
| `way` → `sense_pick` → `sense_hold` | *What would help more right now?* Settling · Waking up a bit, then one thing for one sense in that direction (settling: something beautiful, a slow song, a smell I like, a slow warm sip, something soft; waking: far out of a window, an upbeat song, mint or citrus or coffee, something sour or a cold drink, cold water on the wrists), or own words. Then 60 s | A sense; blank's *activating* soothing |
| `words` → `words_card` → `land` | *What would you like to hear?* Five borrowed lines (*This is hard, and I'm doing what I can.* …) or their own (72 characters), read once on paper (`boundaryLine`, copyable), then 60 s with a hand on the heart while they land | A voice, in text (D13) |
| `close` | *How is it now?* Much easier · A bit easier · About the same · Stirred up (easier, not warmer, so it fits the waking-up path too) (the session's close, `askFresh: 'thenVsNow'`, `regulation_down`) | Step 3 |
| `stirred` | *That happens. Kindness can stir things up.* Only my breath (`light`, 30 s, hands wherever they like, then `again`) · It feels like I don't deserve it (`light_deserve`: the same lighter hold under *You don't have to deserve it.*) · Something for my body instead → `stirred_end` with First, the body · Someone to talk to now → `stirred_end` with the safety screen · Stop here → `stirred_end` (*You stopped when it got to be too much. That's looking after yourself too.*). Every backdraft end card adds *Talking it through with someone can help* and offers the safety screen as a button | Backdraft |
| `again` | *And now?* A bit easier → `reach` · Still stirred up → `lighter` (*Kindness can be hard to take in right now. That's common, and it can change.* + the talk line; First, the body and the safety screen offered) | Two backdrafts in a row |
| `reach` → `end` | *Is there someone you could call or text?* (*Only if you'd like to.*) Yes → *Even a short message counts.* · Not right now (a real answer, so Next waits for one of the two). The end card names what happened (warmer, the same, eased) | Step 4, outward |

*Talk to someone now* is on every screen. Nothing asks the person to close their eyes.

**Opened from Hold to wait's *Hurt myself*** (its *A hand on my heart* move, `?frame=hurt`): the crisis banner shows on
every screen (plan C6.5: a DT hold runs alongside resources, never instead of them), and *Stirred up* offers only
the body, someone to talk to or stop, with no lighter hold first.

## The links that now open it

Hold to wait's *Hurt myself* path has a new move, *A hand on my heart* (PRD DT-02 step 5: my kit · hand on heart ·
call or text someone), whose end card offers Held in its `hurt` frame, so the crisis banner stays on every Held screen. Let it be's grief step,
when it's too much, offers Held beside First, the body. Both exits were planned until now.

## What it records

`ToolSession.ext.run` (every answer and the path; each hold's `done` / `partly` / `skipped` with seconds held) and
the spine's `thenVsNow`, direction down. Own words (a soother, kind words) are capped at 72 characters (the record's worst case must fit 4 KB) and encrypted
at close like every `ext` text field. Nothing is kept to the profile in part 1.

## Routing

One word row, live with the module (connected by default, 12 Nov 2026): *ashamed* or *embarrassed* on replay
(`rumination_loop`) gets Held beside Recover (`beside: ['recovering-from-invalidation']`), ahead of Do the Opposite's
unhiding, which asks more than a low-energy moment has. The concept's tags are `side: acceptance`, `skillKind: body`,
`direction: down`: it calms, so the blank-pattern ban keeps it off every blank result (a blank primary, or a blank
pattern alongside), and it never shows when flooded (no flooded row). Loneliness (*lonely*, *isolated*) sits on Low
drive, a blank pattern, so it gets no Held row. `tests/recommendation-select.test.mjs` pins all of it.

## Deferred (DT-07 part 2)

- ~~**The outside-in body scan**~~ **Built 14 Nov 2026** as a fifth way to be held (*Notice my body, from the outside
  in*), not a tool of its own: a contact point first (feet, the seat, the back, the hands: `bodyCard` *still*, 30 s),
  then the outside of the body (clothes, air on the skin: `doseTimer`, 30 s), then *Right now, how here are you?*
  (*Here · Partly here · Far away*). Here goes a little further in (the hands, breath at the nose, 30 s); partly here
  presses the feet (`bodyCard` *press*, 20 s); both then the close. Far away goes back outside, never further in:
  5-4-3-2-1 or First, the body, with a line to tell a doctor or therapist if it happens often, no close. Eyes open is
  said on the first screen; nothing asks to close them or hold a breath. Not on a carried flooded reading's first
  screen (the PRD's steady / stirred only); opened at its entry (`?enterAt=scan`) while flooded, it says the body's
  loud and offers a hand on the heart first, and *here* presses the feet rather than going further in. Problem Solve's *body scan* for numb and Do the Opposite's numb
  alternative open it at the entry (`body-scan` is no longer a dangling link). Still part 2: the night variant.
- **The Held hands visual** (Shape room: the person's shape held by two cast hands, rocking ~6 a minute, warm hum
  opt-in; PRD open question 1).
- **Voice**: the trusted-voice memo and their own recorded encouragement (D13: text only for now).
- **The soothe list** kept in the kit (DT-03's *soothe* section, built) offered back here.
- DT-01's swap (`soothe?mode=hand`), the kit cards, MF-06's backdraft close, ER's night mode and Recover's
  self-compassion step as hosts. **Built (14 Nov 2026):** the entry `?enterAt=hand` opens straight at where the
  hands rest; First, the body's *someone* card (not quieter twice) offers *A hand on my heart* after the people and
  the kit, and Hold to wait's move opens there too (its banner stays).
- The WMP witness embed in place of the folded-in witness line (as Let it be defers it).
- The fade: the diary card's *soothed yourself without the app?*; IE-06 as a host.
- Backdraft counted across visits (part 1 counts within one visit), the calm-day follow-up after a night use (**built 14 Nov 2026** after any use that helped: once the close is *a bit* or *much easier* and the outward step is answered, *Want to practise this once when things are calmer?* with *Tomorrow · In a few days*, skippable; `held_practice` opens a fresh visit to Held (`?frame=practice`, which never asks to book another), content-free, resolved by opening it; never after Hurt myself), the
  `soothe` / `body_scan` reps, the PRD's graph content as its own nodes (`SootheOption` with touch-aversion
  alternatives, `HeldFlow`; the options carry the `SootheOption` label now), `affective_touch`'s grade and
  `IMPLEMENTS` edge.

## Departures from the PRD

| PRD | Built | Why |
|---|---|---|
| Witness line, then *Pick how you'd like to be held* | One title: *This deserves some care. How would you like to be looked after for a minute?* | No witness embed on the runtime yet; Let it be folds its line in the same way |
| Close: *warmer · same · stirred up* | *Much easier · A bit easier · About the same · Stirred up* | The spine's in-flow close is exactly four (worse / same / better / much better); *easier* fits the waking-up path too |
| Backdraft: the hand and the breath, or DT-01 press | Also *It feels like I don't deserve it*, *Someone to talk to now* and *Stop here* | Backdraft often shows up as that thought; the safety screen and stopping are always first-class |
| *Stirred up*, then easier after the lighter hold | The session's `thenVsNow` stays *worse* | `again` isn't the close; Reflect counts the visit as worse, which matches the backdraft-rate metric |
| Flooded: hand on heart or warmth only | Three choices on the first screen (the hand, warmth, *I don't deserve this*), then two | The chip is an escape hatch, not a tool, and it matters most for shame; T8's two after it |
| 60–120 s hold | 60 s everywhere (30 s for the experiment and the lighter hold) | One length per card; the PRD's flooded 60 fits everyone, and the timer can be stopped |
| A voice (memo) | Kind words in text, read once, then a hand on the heart | D13 |
| Let the goblin hold it (Held hands) | Not offered | Part 2 (PRD open question 1) |
| *I don't deserve this* at any point | On the first screen | Embeds have no chips; the first screen is where the hesitation shows |
| Backdraft: *just the hand and the breath* | *Only my hand and my breath* | House voice: no *just* |
| Blank: activating soothing instead of calming | A *Settling · Waking up a bit* choice on the sense path | The runtime doesn't carry the check-in's blank flag; the person picks |
| *Someone you could call or text?* lists kit people / CORE contacts | Yes / Not right now, with a line | The kit (DT-03) and contacts aren't built |
| Two backdraft closes in a row | Within one visit (stirred, then still stirred after the lighter hold) | Across visits needs part 2's record |

## DBT handouts, step by step

| Steps | Source |
|---|---|
| `where`, `hold_*`, `try`, `land`, `light` | Hand on heart (Somatic M29; self-soothing touch, Dreisoerner 2021); DT Handout 8, touch |
| `warm`, `warm_hold` | DT Handout 8, touch (warmth) |
| `way`, `sense_pick`, `sense_hold` | DT Handout 8 (vision, hearing, smell, taste, touch); 8a's ideas, with the addictive ones left out |
| `words`, `words_card` | DT Handout 9, IMPROVE: Encouragement, in the person's own voice where they want it |
| `stirred`, `again`, `lighter` | Compassion backdraft (Germer & Neff): smaller doses, and someone to talk to |
| `reach` | The PRD's internalize step: familiar people carry most of the effect (Coan 2006) |

## Clinician pass (open)

- The borrowed kind words, and whether *I deserve care, even now* lands for someone who says they don't deserve it.
- The waking-up soothers (cold water on the wrists, something sour) on a flat day, and whether any need a caution.
- Whether *Stirred up* should also offer the safety screen directly, beyond the quiet *Talk to someone now* link.
- Hold to wait's *A hand on my heart* after *Hurt myself, safe for now*: Held has no crisis banner of its own; the
  quiet link is on every screen.
