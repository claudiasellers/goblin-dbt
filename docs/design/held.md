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
| `pick` | *How would you like to be looked after for a minute?* A hand on my heart · Something warm · Something for one of my senses · Kind words · I don't deserve this. A carried flooded reading shows only the hand, warmth and the chip (T8) | Step 1; capacity: flooded |
| `deserve` → `try` | *You don't have to deserve it. Try thirty seconds, as an experiment.* Try thirty seconds (a 30 s `hand_heart` card, then the close) · Not today → `not_today` (*That's okay. It's here for another time.*, no close) | Step 2's chip |
| `where` → `hold_<where>` | *Where would your hands like to rest?* (*If touch doesn't feel right, hold something instead.*) On my chest, over my heart · Around a warm mug · Holding something soft · Flat on my thighs. Each its own 60 s card (`bodyCard` kind `hand_heart`) with its own three lines | Hand on heart, touch-free ways first-class |
| `warm` → `warm_hold` | *What's warm nearby?* (*Warm, not hot.*) A warm drink · A blanket or a jumper · Warm water over my hands · A warm spot: sun, a radiator, a pet. Then 60 s (`doseTimer`) | Warmth |
| `way` → `sense_pick` → `sense_hold` | *What would help more right now?* Settling · Waking up a bit, then one thing for one sense in that direction (settling: something beautiful, a slow song, a smell I like, a slow warm sip, something soft; waking: far out of a window, an upbeat song, mint or citrus or coffee, something sour or a cold drink, cold water on the wrists), or own words. Then 60 s | A sense; blank's *activating* soothing |
| `words` → `words_card` → `land` | *What would you like to hear?* Five borrowed lines (*This is hard, and I'm doing what I can.* …) or their own (90 characters), read once on paper (`boundaryLine`, copyable), then 60 s with a hand on the heart while they land | A voice, in text (D13) |
| `close` | *How is it now?* Much warmer · A bit warmer · About the same · Stirred up (the session's close, `askFresh: 'thenVsNow'`, `regulation_down`) | Step 3 |
| `stirred` | *That happens. Kindness can stir things up.* Only my hand and my breath (`light`, 30 s, then `again`) · Press something instead → `stirred_end` with First, the body · Stop here → `stirred_end` (*You stopped when it got to be too much. That's looking after yourself too.*). Both end cards add *Talking it through with someone can help* | Backdraft |
| `again` | *And now?* A bit easier → `reach` · Still stirred up → `lighter` (*Kindness can be hard to take in right now. That's common, and it can change.* + the talk line, First, the body offered) | Two backdrafts in a row |
| `reach` → `end` | *Is there someone you could call or text?* (*Only if you'd like to.*, optional) Yes → *Even a short message counts.* · Not right now. The end card names what happened (warmer, the same, eased) | Step 4, outward |

*Talk to someone now* is on every screen. Nothing asks the person to close their eyes.

## The links that now open it

Hold to wait's *Hurt myself* path has a new move, *A hand on my heart* (PRD DT-02 step 5: my kit · hand on heart ·
call or text someone), whose end card offers Held; the crisis banner stays on that card. Let it be's grief step,
when it's too much, offers Held beside First, the body. Both exits were planned until now.

## What it records

`ToolSession.ext.run` (every answer and the path; each hold's `done` / `partly` / `skipped` with seconds held) and
the spine's `thenVsNow`, direction down. Own words (a soother, kind words) are capped at 90 characters and encrypted
at close like every `ext` text field. Nothing is kept to the profile in part 1.

## Routing

No `RECOMMENDED_FOR` rows, following the PRD: its entry points are the hosts above, DT-01's swap, the kit and the
Tools intent, never a check-in card. `skill_type: self_soothing` is on the concept for when a row is wanted (likely
candidates: the low-energy shame and loneliness words, beside Recover or Do the Opposite).

## Deferred (DT-07 part 2)

- **The outside-in body scan** (`body-scan`, `trauma_sensitive_body_scan`; steady / stirred only, eyes open, contact
  points first, *here · partly · far away*, the night variant). Problem Solve's dangling `body-scan` link waits for
  it.
- **The Held hands visual** (Shape room: the person's shape held by two cast hands, rocking ~6 a minute, warm hum
  opt-in; PRD open question 1).
- **Voice**: the trusted-voice memo and their own recorded encouragement (D13: text only for now).
- **The soothe list** kept as kit cards (DT-03's *soothe* section) and offered back here.
- DT-01's swap (`soothe?mode=hand`), the kit cards, MF-06's backdraft close, ER's night mode and Recover's
  self-compassion step as hosts; an `enterAt` to open straight at the hand.
- Backdraft counted across visits (part 1 counts within one visit), the calm-day follow-up after a night use, the
  `soothe` / `body_scan` reps, the PRD's graph content as its own nodes (`SootheOption` with touch-aversion
  alternatives, `HeldFlow`; the options carry the `SootheOption` label now), `affective_touch`'s grade and
  `IMPLEMENTS` edge.

## Departures from the PRD

| PRD | Built | Why |
|---|---|---|
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
