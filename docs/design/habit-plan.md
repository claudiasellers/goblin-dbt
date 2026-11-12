# When it's a habit (DT-09)

**Status:** built 12 Nov 2026 on the skill runtime (DT-B5; [the modules plan](dbt-modules-plan.md) §5.1). D14 decided
(Claudia, 12 Nov: *"lets build the app to the depths and darkness people ACTUALLY deal with, and we will build safety
measures ON TOP of that"*): substances are in, with the withdrawal line. New tool `habit-plan`, listed under Distress
Tolerance with the Tools intent *Something I keep doing*. New concept `dbt_dialectical_abstinence` (`PART_OF
dbt_distress_tolerance`, `appToolId: 'habit-plan'`). Source: `scripts/skills/habit_plan.py`. Tests:
`tests/skill-habit-plan.test.mjs`. No new embed: the plan on paper is `boundaryLine` (list), the competing image is a
30 s `doseTimer`. New profile kind `abstinence_plan` (the minimal TargetBehavior until CORE-04 owns one) and new
follow-up type `habit_renew`. Close kind `none`: the outcome is the renewal. Rolling back is removing `'habit-plan'`
from `src/lib/skillRuntime/playerTools.ts` and the tool from `src/data/tools.ts`, and dropping the `habit_plan` exits
from Hold to wait and Ride it out.

## What it is

PRD DT-09 (DBT-SUD: dialectical abstinence, burning and building bridges, adaptive denial, community reinforcement;
DT Handouts 16–21, Linehan 2015; Dimeff & Linehan 2008; the abstinence-violation effect, Marlatt & Gordon 1985) for
something the person keeps going back to despite the cost: drinking, using, smoking or vaping, bingeing or purging,
gambling, spending, scrolling or gaming, checking someone's page, porn, or their own words. Built while steady. The
dialectic is said plainly, because the PRD's main risk is harm reduction heard as permission: **all in on not doing
it, and a plan ready if you slip. Both at once.**

## The flow

| Step | What the person sees | PRD DT-09 |
|---|---|---|
| `what` | *What do you keep going back to?* Nine behaviours or their own words (60 characters), plus *Hurting myself* → `harm` | Step 1 |
| `harm` | `safetyFirst` (the resources open over the card), the crisis banner, *Hurting yourself needs more care than a habit plan can give. Someone to talk to comes first.* No plan, no close | Step 1: self-harm belongs to CORE, never here; voice.md S9 |
| `heads_up` | A carried flooded reading: *Your body's loud right now.* Two choices (T8): *Look after the next few minutes first* → `settle` (First, the body, Ride it out) · *Make the plan anyway* | Capacity: flooded → DT-01 |
| `medical` | Drink, drugs or own words (which could be a substance; worded *If this is alcohol, benzos or opioids: …*): *Stopping alcohol, benzos or opioids all at once can be dangerous. A doctor can help you come off safely.* (*Cutting down with a doctor's plan counts as a commitment too. Shaking, sweating, seeing things or a seizure after stopping: get help now.*) One optional tap: *I've got support with this* · *I'll talk to someone about it* | Step 7, the medical heads-up |
| `eating` | Bingeing or purging: *This plan is about not bingeing or purging. It never means not eating.* Regular meals, and a doctor or eating disorder service. The same optional tap | Step 1, eating |
| `span` | *How long can you fully commit to not doing it?* (drink or drugs: *…or to a doctor's plan for cutting down?*) The next hour · The rest of today · Three days · A week | Step 2: commit for a span you can keep |
| `lapse` | *If you slip, what will you do first?* (*Planning for a slip isn't planning to slip.*) Up to three: tell someone, look after my body, recommit straight away, look at what led to it the next day, get rid of what's left, talk to myself like a friend would, own words. Bingeing: *eat my next meal at the usual time* instead of *recommit* and *get rid of* (they echo restriction and purging). Required | Step 2: the lapse plan, written now |
| `burn` | *What could you make harder to get to?* Per behaviour (the dealer's number, gambling blocks with the bank, saved cards, a content blocker, …); own words get the general ones. Optional, up to three | Step 3: burning bridges |
| `risky` | *What tends to lead you back, without seeming to?* Per behaviour (keeping some spare, *one won't hurt*, payday, alone / tired / hungry, …). Optional | Step 3: apparently irrelevant behaviours |
| `build` → `imagine` | *When a craving comes, what will you turn to?* Up to two (a picture, cold, ride it out, give my mind a job, a walk (never for bingeing), text someone I trust); never food, drink or shopping. The picture is rehearsed now for 30 s | Step 4: building new bridges |
| `reinforce` | *What do you get back when you're not doing it?* Optional | Step 5: community reinforcement (the directory part waits for ER) |
| `card` | *If you slip, this is your plan. Read it through once.* The lapse plan on paper (`boundaryLine`, list); the same card comes back after a slip | — |
| `remind` | *Want a check-in when the stretch ends?* Yes books `habit_renew`, timed by `span` | Renewal prompt at the end of each span |
| `keep` | *Keep this plan in Me?* (`abstinence_plan`) | What's saved |
| `end` | The dialectic, and Ride it out and the pros & cons card | — |

### The renewal

`habit_renew` (Today card *Your stretch is up*, never names the behaviour) reopens the run at `renew` (R9 `reopens`):

| Step | What the person sees |
|---|---|
| `renew` | *Your stretch is up. How did it go?* (*Whatever happened, there's a next step.*) I kept to it · I slipped · I'm not ready to go again |
| `after_use` | Drink, drugs or own words only: *After a break, your body can't take what it used to.* (*If you've used, try not to be alone, and get emergency help if someone's hard to wake or breathing slowly.*) The `medical` banner; one optional tap |
| `slipped` | *A slip isn't a relapse. Here's what you planned.* The first visit's lapse plan, on paper |
| `again` | *What's the next stretch you can keep?* (after a slip: *What stretch can you keep from here?*). Books `habit_renew` again |
| `again_end` | Kept: *You kept the last one. The next one starts now.* Slipped: *You're choosing it again. A slip is information, not who you are.* and Ride it out |
| `stop` | *That's okay. Your plan stays here for when you're ready.* Ride it out, the pros & cons card |

Nothing counts days, says *relapse* about the person, or asks how much. *Talk to someone now* is on every screen.

## The links that now open it

- Hold to wait's next card, for the *use* and *check* pulls.
- Ride it out's end cards (`passed`, `end`), for the *use* and *check* pulls, beside the pros & cons card.

## What it records

`ToolSession.ext.run` (the behaviour, the stretch, the plan, the embeds' results), own words encrypted at close.
*Keep it in Me* keeps `abstinence_plan` (`ProfileFact`, many, max 6, own words encrypted; `hurt` refused by the
validator). Me shows it as the behaviour, *When a craving comes* and *If I slip* (`KeptHabitPlan`). The chosen
behaviour sets the session's `urgeIds` (`use` / `check`), as the other DT pulls do.

## Routing

No rows, by design: the plan is made in calm for one behaviour, and the vocabulary has no word for a habit.

## Deferred (DT-09 part 2)

- **The weekly clear-mind check** (PRD step 6, `MindSign` nodes) and its follow-up type.
- **The lapse plan inside Hold to wait / Ride it out** after an acted *yes* on the same behaviour (needs an
  `abstinencePlans` slice and the urge close's acted answer).
- **CORE-04 `TargetBehavior`** as the owner of the behaviour (this kind is the minimal one; a migration moves it), and
  CORE-08's next-day chain (*look at what led to it* is a self-action for now).
- **The graph content as nodes:** `BridgeTemplate` per behaviour, `MindSign`, the other four concepts
  (`dbt_clear_mind`, `dbt_community_reinforcement`, `dbt_burning_bridges`, `dbt_adaptive_denial`), `ClinicalSource`s.
- The visuospatial puzzle added to the kit (DT-03), ER's reinforcement directory, *until [day]* and own spans.

## Departures from the PRD

| PRD | Built | Why |
|---|---|---|
| *Pick the behaviour (CORE TargetBehavior, or chips)* | Chips or own words, kept as `abstinence_plan` | CORE-04 isn't built; the coordinator agreed a minimal TargetBehavior inside DT-09 |
| Self-harm *not handled here* | A *Hurting myself* chip that routes to the crisis banner and someone to talk to | People pick it here anyway; a route catches them instead of a dead end |
| Medical heads-up: alcohol or benzodiazepines | Alcohol, benzos or opioids | Opioid withdrawal is dangerous too; the line is the same job |
| Spans: *the next hour · today · until [day] · my own* | The next hour · the rest of today · three days · a week | The spans are the renewal's chips; a free date waits for a date chip in the runtime |
| Lapse plan shown whenever an acted *yes* is logged | Shown at the renewal on *I slipped* | No slice or acted-yes hook yet (part 2) |
| Burning bridges: done toggles | Picks, kept with the plan | No checklist embed yet |
| Open question: substances at all? | Included | D14, Claudia, 12 Nov |
| Flooded → DT-01 | A heads-up: the next few minutes first (the body, Ride it out) or make the plan anyway | The person decides; nothing locks |
| Community reinforcement in ER's directory, relationships routed to IE | Optional reinforcer picks, kept with the plan | No directory yet (part 2) |
| `dbt_clear_mind`, `dbt_community_reinforcement`, `dbt_burning_bridges`, `dbt_adaptive_denial`, `ClinicalSource`s | Only `dbt_dialectical_abstinence` | One concept carries the tool; the rest come with their content (part 2) |

## DBT handouts, step by step

| Steps | Source |
|---|---|
| `span`, `renew`, `again` | DT Handout 17 (dialectical abstinence) |
| `lapse`, `slipped` | DT Handout 17; Marlatt & Gordon 1985 (abstinence-violation effect) |
| `burn`, `risky` | DT Handouts 18, 20 (burning bridges; apparently irrelevant behaviours) |
| `build`, `imagine` | DT Handout 20 (building new bridges) |
| `reinforce` | DT Handout 19 (community reinforcement; Roozen 2004) |
| `medical`, `eating`, `harm` | PRD DT-09 risks; voice.md S9 |

## Gate changes

The clinical review added the overdose line after a slip on drink or drugs (tolerance drops after a break) with the
`medical` banner, the danger signs on the withdrawal line, *or a doctor's plan* on the stretch for drink and drugs, the
withdrawal line for own words, and removed the bingeing chips that echo purging, restriction or compensation (*get rid
of what's left*, *recommit straight away*, *one won't hurt*, *keeping some spare*, a walk; *binge foods in bulk*
became single portions). It also asked for two choices on the flooded heads-up (T8), a softer slip line, *Porn, more
than I want to*, and *Pour away what's here, once it's safe to stop*. The UI review shortened the cold chip and named
Me's lists for screen readers. Adaptive denial (H21) is Ride it out's *Tell it: not now*, not this skill.

## Clinician pass (open)

- A gambling helpline on a `medical`-style step for gambling (gambling harm carries a high suicide risk).
- Own words that read as self-harm (*cutting*) offering the `harm` route, as a route and never a block.
- First, the body's cold caution on the *cold water* chip; a nicotine support line for smoking.
- *Checking someone's page* when that person is someone they're scared of: Ending in its careful frame.
- The withdrawal and overdose lines' wording, and whether naloxone belongs on the overdose line.
- Whether *Porn, more than I want to* belongs in the chip list or in own words only.
- Whether the renewal's *I slipped* also offers CORE-08's chain once it exists.
