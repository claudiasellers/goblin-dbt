# The safety route (CORE-01) and safety plan (CORE-02)

**Status:** PR 1 of 4 built 12 Nov 2026: content, the server side and the record, **switched off**. Nothing a person
sees changes until PR 4 turns `SafetyPolicy {id: 'safety_route'}.enabled` on. Source of truth for the PRD:
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
| 2 | Screens A (the question), B (strong thoughts), C (a plan or an act), the exit, the morning check; *Help & safety* in the header on every screen; Help me now's *I might hurt myself*; signed out on the device; offline. `safety.open()` replaces `SafetyOpen.tsx`'s interim. `core_safety_route.appToolId = 'safety'` with the page | Behind the switch |
| 3 | CORE-02: the `safety_plan` profile kind, build mode (steady / stirred) and use mode (any band), step 2 reading the crisis kit's card ids (`section:optionId`, `docs/design/crisis-kit.md`), the quick plan as a draft plan, `safety_plan_review` at +30 days | Behind the switch |
| 4 | The switch on; the auto-crisis banner from a pattern retired (StateResult / LowEnergyStateResult); the dead low-energy crisis branch removed | Yes |

CrisisBanner stays the only hand-written file with numbers (its `other_person` and `medical` variants are unchanged);
the route's lines are generated content. One user-facing switch, in the last PR.

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

The question's answer never goes on the saved check-in (PR #47's rule, kept). CORE-05's `safetyCheckId` on the check-in
comes with PR 2.

## Helplines

Hand-curated (open question 1's default), not ThroughLine: US (988 call / text / chat, Crisis Text Line, Poison Control),
Canada (9-8-8), the UK (Samaritans, Shout, NHS 111's mental health option for England, Scotland and Wales, Lifeline for
Northern Ireland), Ireland (Samaritans, Text About It), Australia (Lifeline call and text, Poisons Information Centre),
New Zealand (1737, Lifeline Aotearoa, National Poisons Centre), France (3114), Germany (TelefonSeelsorge), Spain (024),
the Netherlands (113), Sweden (Självmordslinjen), India (Tele-MANAS), and Italy with its emergency number only (Find A
Helpline for a line). `emergencyAlt` sits beside the emergency number where people know a second one (Ireland's 999)
or the medical one matters (France's 15, SAMU).

Every line carries `checkedAt` (looked up 12 Nov 2026) and no `verifiedAt` until a person has confirmed it with the
service; `source` is the service's site; none of the three ships to the app. **A checked line shows.** The PRD's "no
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
