# The safety route (CORE-01) and safety plan (CORE-02)

**Status:** PR 1 built 12 Nov 2026 (content, the server side and the record). PR 2 (12 Nov 2026) adds the screens and
**switches the route on** (`SafetyPolicy {id: 'safety_route'}.routeOn`, PR 4 folded in: build and connect, a clinician
tweaks after).

**No crisis gap at any deploy step.** The switch is a new field, `routeOn`, read only by PR 2's functions; `enabled`
(what older functions read) stays `false`, so between the graph load and the functions deploy the old banner still
fires. And the route only applies when the client says it can show it: the check-in sends `safetyRoute: true` to
`getStateAndTools`, and without it the server leaves the caller's uid out of `graphDeps`, so `safetyRoute()` returns
null and the old crisis flag decides. An old client on new functions keeps the banner; nobody gets neither the
question nor the banner. PR 3, the safety plan, is next. Source of truth for the PRD:
*PRD Structure & Behavioural Analysis* §CORE-01 / §CORE-02 and the architecture map's safety sections (Arch §4.1, §6.2).

## Why

Today the crisis path is wrong in both directions. Every `emotional_flooding` result raises a US-only 988 banner
(over-triggering), low-unpleasant results are never checked (`checksSafety` skips them, which is where hopelessness,
emptiness and numbness live), the clinician's `SafetyFlag.action` text is in the payload, and there's no question, no
plan, no exit and no morning after. Asking about suicide does not raise ideation (Dazzi 2014; Law 2015, Moderate); not
asking is the live risk. The route asks plainly once, puts the right local people one tap away, and builds safety on top
of the darker places people actually go (Claudia, 12 Nov: build to the depths, safety on top).

## The four PRs

| PR | What | Visible? |
|---|---|---|
| 1 (this) | `scripts/safety/` → `schema/safety-route.cypher` and `src/data/content/safety.json`: the question and every screen's copy, countries and crisis lines, `ASKS_SAFETY`, `Emotion.safetyScreen`, the SafetyFlag rewrite, `SafetyPolicy` (off). `getStateAndTools` decides whether to ask (`safetyAsk`) while the policy is on. `SafetyCheck` (log) and `saveSafetyCheck`. The `safety_checkin` follow-up type | No |
| 2 | The screens (`src/lib/safetyRoute.ts`, the pure step machine; `src/components/safety/SafetyRoute.tsx`; `SafetyPeople.tsx`): the question, passing, rather not say, strong thoughts (means first), a plan or an act (*Have you already done something?* → medical first, first aid only after a known injury), the quick plan (three lines, on the device until PR 3), the exit, the morning check (`/safety?checkin=`). `/safety` is *Help & safety*, linked from the header on every screen; Help me now's *I'm thinking about hurting myself* (`?say=1&from=help_now`); every skill's `safety.open` (`SafetyOpen.tsx`, source `module:<toolId>`). The check-in asks before its result (once per browser session) and saves `safetyCheckId`. Clinical notes show `SafetyFlag.userCopy`. **The switch on** (PR 4 folded in). No `appToolId`: the route is a page, not a tool | Yes |
| 3 | CORE-02, the safety plan (below) | Yes |

With the switch on the server never returns a crisis flag, so the old auto banner on StateResult / LowEnergyStateResult
never shows; its code stays as the kill switch's fallback (switching the policy off restores it whole).

CrisisBanner stays the only hand-written file with numbers (its `other_person` and `medical` variants are unchanged);
the route's lines are generated content. One user-facing switch, in the last PR.

## The safety plan (CORE-02, PR 3)

Stanley & Brown's plan, built in calm and used in one tap. Copy and chips are `FLOW.plan` in `scripts/safety/content.py`
(shipped in `safety.json`; chip ids are a contract with the kept plan: retire, never rename).

- **Build mode** (`/safety/plan`, `SafetyPlanBuild.tsx`): nine steps, one per screen, each skippable, in Stanley–Brown's
  order: warning signs (four chip groups, own words), things I can do (step 2 **is the crisis kit**: `kit: true`
  references it, never copies it; no kit → *Make my crisis kit*, which opens the kit builder and comes back, the build
  kept in `sessionStorage`; coping chips with a `toolId` open that tool), people and places, people to ask (name,
  number, the message they'd send, reorderable, five at most), professionals and lines (the country's lines shown,
  plus therapist / doctor / care team), a safer space (CORE-01's calm wording, the medicine line, the firearm chip and
  line only where `Country.firearmPrompt`), reasons, what I'd want to hear (one line), and the review card. A carried
  flooded reading gets a heads-up first (*easier on a calmer day*; start anyway or not now). Changing a kept plan opens
  it in the same steps.
- **Use mode** (`?use=1`, `SafetyPlanUse.tsx`): any state, one step per screen, the person's own line first, then each
  step with something in it (the lines always). The plan's people with a number and the emergency number are pinned
  above every step; step 4 calls or texts with their message; step 2 opens the kit (`frame=crisis`) or a tool and comes
  back to the same step. *I did this* and *Next step* both move on; nothing is required.
- **Kept** as `safety_plan` (`functions/src/profile/kinds.ts`, `ProfileFact`, `my_plans`, one per person: a re-save
  replaces it). Chip ids and own words per step; the people and the professionals are one own-words field each
  (`peopleOwn`, `prosOwn`, a JSON list), so names, numbers and messages are encrypted together. Read through the
  `safetyPlan` slice, which only `PROFILE_NEEDS.safety` reads (Help & safety and the route; the plan isn't browsed from
  other tools, PRD open question 2). Signed out it stays on the device (`goblin.safety.plan.v1`); signed in later, Help &
  safety offers *Save this plan to your account?*.
- **The quick plan** (CORE-01, three lines on the device) is the plan's draft: build mode starts from it, and Help &
  safety says *Finish your safety plan* until a plan is saved.
- **Help & safety** shows *My safety plan* first once there is one, its people under it. In the route, *Open your plan*
  plays use mode in place, and the plan's people sit under the lines on every screen (*Someone from your plan*).
- **Review**: saving books `safety_plan_review` a month on (10:00, safety tier, content-free), which opens
  `/safety/plan?review=<id>`: *Did anything on it help? Anything to change?* (keep as is · change something). The
  server's follow-up horizon is 32 days now (it was 14, which also refused Ending's *In a month*).
- **Me** lists *My safety plan* with *Open it* and *Set aside*, never its contents.

Part 2 (not built): `SafetyPlanUse` as a log record, the review after a use or a *strong* answer and its thinning to 90
days, the Today card after a first *passing* answer, warning signs suggested from the person's own check-ins, the coping
list seeded from tools with *quieter* closes, the Contact Picker, photos and voice notes on the device, offline caching.

## When the check-in asks (`functions/src/safety/safetyAsk.ts`)

Only while the policy is on, only on unpleasant results, when any of:

- **pattern**: the winning or co-occurring pattern `ASKS_SAFETY` (emotional flooding, dissociation, rumination,
  conservation freeze, low reward drive: the five with a `TRIGGERS_SAFETY` edge, the low-unpleasant ones now included);
- **word**: a picked word has `Emotion.safetyScreen` (worthless, empty, despair, numb, and helpless / powerless standing
  in for the PRD's hopeless / trapped, which aren't check-in words; self-hatred has no stand-in);
- **flooded_history**: the band is flooded and the person has ever answered above *no*;
- **recent_answer**: their last answer, within 72 h, was anything but *no*. This one asks on any unpleasant check-in,
  triggered or not: a departure from the PRD (where 72 h only lifts the 12-hour limit), so someone who said *strong*
  this morning is asked again tonight even on a word that wouldn't trigger.

Never within 12 h of a *no*. *I'd rather not say* counts as above no (shown as *passing*, recorded `declined`); "never
re-asked in the same session" is the client's (PR 2). A life-threatening `TargetBehavior` trigger waits for CORE-04's
targets; the habit plan has no self-harm plan by design.

With the policy on, the result's `safetyFlag` is a **clinical referral only** (the pattern's first, with its new
`userCopy`, every unpleasant quadrant, so the shutdown note finally reaches low-unpleasant results). A crisis flag is
never returned: the question asks instead. Off, `safetyFlag` is exactly as before and there is no `safetyAsk`, so the
switch restores today whole.

## What's saved

`SafetyCheck` (log, `HAS_SAFETY_CHECK`, the PRD's fields): `id`, `at`, `source` (`checkin` · `diary` ·
`help_now` · `header` · `followup` · `module:<toolId>`), `sourceSessionId`, `answer` (`no` · `declined` · `passing` ·
`strong` · `plan` · `act`), `medical`, `meansAsked`, `meansActions[]`, `contacted`, `usedPlan`, `exit`, `morningCheck`,
`country`, `status`. Ids and enums only: no own words and **nothing about method**, not even whether something was taken
or an injury (that only picks the screen). Finalise-once: created on the first answer; for 2 h, until the exit, the answer
only rises (plan → act), set-once fields stay set, means actions only grow, contacted only moves up; the exit closes it.
The next-morning check is a FollowUp `safety_checkin` (09:30 the next day, content-free card and notification, the
`safety` tier so it sorts first), scheduled by the route after the person's yes through `scheduleFollowUp`.

The question's answer never goes on the saved check-in (PR #47's rule, kept). The check-in carries only the visit's id,
`CheckIn.safetyCheckId` (CORE-05; set once, never cleared). The check-in is saved as its result is decided, so leaving
mid-route keeps it, and saved again with the id when the route ends. A second check-in in the same browser session that
would ask again shows the people and *Help & safety* above its result instead (the old banner never shows while the
switch is on). The exit is sent with the morning question's answer in one save, since the exit closes the record.

## Helplines

Hand-curated (open question 1's default), not ThroughLine: US (988 call / text / chat, Crisis Text Line, Poison Control),
Canada (9-8-8), the UK (Samaritans, Shout, NHS 111's mental health option for England, Scotland and Wales, Lifeline for
Northern Ireland), Ireland (Samaritans, Text About It), Australia (Lifeline call and text, Poisons Information Centre),
New Zealand (1737, Lifeline Aotearoa, National Poisons Centre), France (3114), Germany (TelefonSeelsorge), Spain (024),
the Netherlands (113), Sweden (Självmordslinjen), India (Tele-MANAS), and Italy with its emergency number only (Find A
Helpline for a line). `emergencyAlt` sits beside the emergency number where people know a second one (Ireland's 999)
or the medical one matters (France's 15, SAMU).

Every line carries `checkedAt` (looked up 12 Nov 2026) and no `verifiedAt` until a person has confirmed it with the
service (recorded in `content.py`'s `VERIFIED`, so a reload never erases it); `source` is the service's site; none of the three ships to the app. **A checked line shows.** The PRD's "no
verified line → emergency number and Find A Helpline" reads, in this build, as "no line in the graph"; `verifiedAt` is
the audit (target: every line ≤ 90 days), not a gate, because gating on it today would show no line anywhere. Crisis
Text Line's keyword is `HOME` (their published one); CrisisBanner still says `HELLO` (both reach a counsellor; aligned
when PR 4 retires the banner's crisis use). An unknown country shows "your local emergency number" and Find A Helpline.

## The five open questions (PRD), with the defaults built

1. **Helpline data**: hand-curated, refreshed by hand quarterly, `verifiedAt` the audit (above).
2. **Next-morning check**: on by default at the route's exit, one *No thanks*; opt-in after *passing*.
3. **Which words screen**: the PRD's list where the words exist, helpless and powerless standing in (above).
4. **Passing twice in 7 days**: a Today card for the plan builder (*A plan for hard nights, 5 minutes, whenever you're
   ready*), PR 3.
5. **Copy**: every string is a draft for the clinician pass (`reviewStatus: draft`); the switch still goes on in PR 4
   (build and connect, a clinician tweaks after).

## PR #47

The old branch (`routing/ties-weights-safety-question`, not this lane's) asked on the spiraling path only and kept the
answer off the check-in. Its safety question is superseded by this route; its rf-v2.1 tie-break is a routing change
Claudia still has to decide on its own.

## Clinician pass (open)

- Every string in `scripts/safety/content.py` (B and C first), the first-aid line, the medicine line.
- `ASK_PATTERNS` and `SCREEN_EMOTIONS`; whether `depressed` and `ashamed` should screen too.
- The `recent_answer` departure (above).
- Whether the morning check should run two mornings after *strong* or higher.
