# Ending a relationship that's hurting you (IE-08)

Built 10 Nov 2026 on the skill runtime (`docs/design/skill-runtime.md`) as `ending_relationships`, tool id
`ending-relationships`, concept `dbt_ending_relationships` under `dbt_interpersonal_effectiveness`. Source:
`scripts/skills/ending_relationships.py`. Spec: PRD IE-08 (Claudia's vault, *PRD – Interpersonal Effectiveness*;
copy in the project files). Linehan, *DBT Skills Training Handouts and Worksheets*, 2nd ed., IE Handout 13
(Ending relationships) and Worksheet 9.

Claudia unparked it on 10 Nov ("build them now"), on the existing safety pieces (`CrisisBanner`, its
`other_person` variant), with all three gate reviews (their fixes are in). The PRD's open question, a blocking review of the safety branch
by a DV specialist (plan D14), is still open. Claudia listed it anyway on 11 Nov, with that review to follow: see *Listing and the clinical review* below.

## The flow

| Step | What it asks | Where it goes |
|---|---|---|
| `safety` | *Before anything: would ending this, or even talking about it, put you at risk?* (hint: *For example, they've hurt or threatened you, or you're scared of how they'd react. Whatever you answer, you can still think it through and decide here.*) No · Maybe · Yes · I'd rather not say. From Rebel's *someone I'm scared of* (`?frame=careful`): *Earlier you said you're scared of them…*, and the safety branch whatever the answer | anything but No, or `careful` → `safe_first`; flooded → `steady`; else `what` |
| `safe_first` | Plain lines (ending things with someone who might hurt you can be the most dangerous time; people who do this every day can plan it with you, in confidence), the other-person resources, a note on privacy and phone history. *Think it through here* · *That's enough for now* | enough → `safe_done`; else on, still with the resources |
| `steady` | Flooded (a carried or host band only): *Big decisions go better from steady. Everything stays here.* Links to Circuit Breaker and Pause, or *Keep going anyway* | `what` |
| `what` | *What is this relationship doing to you?* It harms me (destructive) · It keeps me from things that matter (interfering) · It's hard right now, and it isn't bad for me · I'm not sure. *Not sure* links to Wise mind (pros and cons planned), only when safe | interfering or hard, when safe → `try_first`; else `decide` |
| `try_first` | *It might be worth trying to change it first. Do you want to?* | try → `change` (DEAR MAN, Problem Solve; GIVE planned; **only when safe**); still → `decide` |
| `decide` | End it · Step back, with less contact · Stay and work on it · Not yet (*Not yet is a real answer, and so is staying*). A *Check it with Wise mind first* link, when safe | unsafe → `save`; stay → `change`; not yet → `not_yet`; else `channel` |
| `save` | Safety branch only: *Do you want any of this saved?* Leave it unsaved (first) · Save it to my account | `advocate`: advocates, never a script; no close question |
| `not_yet` | *Do you want a check-in in two weeks?* | `ending_revisit`, a fresh visit (safety asked again) |
| `channel` → `open_line` → `decision_line` → `practical` | A message · A call · In person (*a message is fine, and often the wisest way*; after *It harms me* the question adds *If you're worried how they'll react, a message is often safer than in person*); one opening line; the decision said plainly (lines filtered to the decision); logistics only, optional. Own words everywhere | `card` |
| `card` | The `boundaryLine` card with the three picks as one paragraph, Copy, never locked | `checkin` |
| `checkin` → `when` | *Do you want a check-in after you've told them?* (opt-in), then *When are you thinking of doing it?* Today · This week · Not sure yet (it sets the check-in's day) | `ahead`: Cope Ahead (`first=conversation`), Rehearse (planned) |
| `after` | Re-entered by the check-in (`resumeAt`): Holding steady · Pulled back toward them · I went back · I haven't done it yet · I don't feel safe · I'm in a really bad place; *Another check-in?* week · month; a quiet *I might hurt myself* link (`safety_open`) | `after_next` (Do the Opposite on a pull; Find your people and Let it be planned), `after_unsafe` (other-person resources, nothing from this check-in saved) or `after_low` (the crisis slot and `safety_open`) |

No close question (`closeKind: 'none'`): a rating after deciding about a relationship isn't evidence of anything,
and a quiet end keeps the visit quiet. No routing rows, by design (PRD: "No intent row"; the note sits in
`scripts/recommendations/content.py`): it is calm-time, decision-level work no feeling word should surface, and a
check-in card about it could be seen by the other person. Its ways in are Problem Solve's *Decide if this can be repaired* (`jealousy-trust-decide`, a dead link until now)
and Rebel's *someone I'm scared of* (live now, never DEAR MAN or FAST there, D4).

## Fidelity to IE Handout 13

| Handout 13 | Here |
|---|---|
| Decide to end from wise mind, not from a mood | Wise mind link on the decision (and on *not sure*); flooded → body first, with the decision steps still there; *Not yet* honoured with a check-in |
| Destructive relationships (quality, safety) vs interfering ones (goals, other relationships) | The `what` chips are the two categories (`category` on the options), plus *hard right now* |
| If it isn't destructive, problem solve and repair before ending | *Interfering* or *hard right now* → *worth trying to change it first?*, and *Stay and work on it* on the decision → DEAR MAN / Problem Solve (GIVE when built). Never in the safety branch |
| Use cope ahead to practise ending | `ahead` hands off to Cope Ahead (Rehearse when IE-02 ships) |
| Be direct: DEAR MAN, GIVE, FAST | Describe in one line; Assert the decision with nothing to negotiate; Negotiate logistics only; the opening lines include a kind one (GIVE) never first; no over-explaining and no apology for deciding (FAST, hint on the decision step) |
| Practise opposite action for love when ending a relationship you love | After: the pull back → Do the Opposite (OA's love urges; ER's new `love-check` urge waits on ER) |
| Safety first if the relationship is dangerous | The first screen, always; the safety branch (below) |

Copy never says the person should leave. *Not yet*, *Step back* and *Stay and work on it* are equal answers.

## The safety branch

Separation is the most dangerous time in an abusive relationship (Campbell et al. 2003, *AJPH* 93(7):1089–97,
doi 10.2105/AJPH.93.7.1089). So:

- **Asked first, every visit.** Any answer but *No* (including *I'd rather not say*) is the branch, and so is any
  visit from Rebel's *someone I'm scared of*, whatever the answer here. A revisit two weeks later starts from the
  first screen again, with nothing filled in from before. The after check-in asks *How's it going?* with *I don't
  feel safe* among the answers, and that answer saves nothing from the check-in (`nothingWhen`).
- **Resources on every screen after it.** `CrisisBanner variant="other_person"` through the skill's crisis slot:
  911 first, the National Domestic Violence Hotline (call or text), 988 last. US only, like the rest of the app.
- **No script, no rehearsal, no Cope Ahead for their reaction, no check-in.** The branch skips the plan steps
  entirely; DEAR MAN, GIVE and Problem Solve are never offered (the change offers hold only when safe). It ends on
  advocates: people who plan this every day can help with when, where and how.
- **Nothing locked.** The person can still think it through and decide; only the scripts are gone.
- **Nothing saved** unless they pick *Save it to my account* (below; the PRD's *save privately*, renamed so it
  promises no more privacy than a normal save gives).
- **No links that save.** Wise mind and pros and cons aren't offered in the branch: Wise mind keeps what's written
  there. Circuit Breaker and Pause (flooded) save no words.
- **Quick exit on every screen** (below).

## Persist-nothing (R15)

Plan R15, built here as a runtime contract any skill can declare:

- A skill's `persist: { after, nothingWhen }` (generated into `Skill.runtimeJson`, served by `getSkillContent` and
  `skills.json`). `persistence(ctx, run)` (machine.ts) is `wait` until the run has left `after`, then `nothing`
  while `nothingWhen` holds, else `save`. Ending's: after `safety`, nothing while unsafe and not saved, and nothing from a check-in answered *I don't feel
  safe*.
- The tool is mounted `deferStart` (`tools.ts` `deferSession: true`, `ToolPage`). `ToolSessionProvider` writes
  nothing at mount; the player calls `begin()` only when there's something to keep and the run may save: when the
  run reaches its end (a `complete` hand-off) or a step schedules a check-in. So a visit left half-way saves
  nothing, safe or not, and a safety-branch visit that isn't saved writes **no ToolSession and no compat
  ToolUsage**: there is no record the tool was opened.
- `keepFor` and `followUpFor` return nothing unless `save`; `build.py` refuses a keep or follow-up at or before
  `after`, a `persist` without `quickExit`, and a `nothingWhen` naming fields the skill doesn't have.
- Edge: a session that has begun (the run reached a check-in step) and then goes back to the first screen closes
  *bare* (status only, no run, no answers) unless the run is back on a saving path: going back alone is enough,
  before any new answer. The session itself, and any check-in already scheduled, stay. Reaching a check-in step
  takes several screens past the safety answer, so this is rare.
- What it can't take back: a run saved on an earlier visit (the safe path) stays saved when a later check-in says
  *I don't feel safe*. Deleting one's own past runs is a CORE / Me feature, not built yet.
- Leaving through a link (Wise mind, Circuit Breaker, Pause) opens that tool's own visit, which is saved as usual.
  It carries no answer from here.

## Quick exit

`src/lib/quickExit.ts`, `src/components/safety/QuickExit.tsx`: a fixed *Quick exit* button on every screen of a
skill that declares `quickExit`. It replaces the page with a neutral one (a weather search), so Back doesn't land on
it. What it can't do: earlier pages in the tab stay in history, nothing is cleared from the device, and a session
that had begun stays open (read as abandoned). The architecture map gives `quickExit()` to CORE; it starts here
and CORE's safety batch takes it over.

## Check-ins

Three follow-up types (`scripts/practice-spine/content.py`), all opt-in, in-tab only (never a push or a calendar
file), and content-free: *A check-in you asked for* / *Open it when you're ready.*

| Type | Scheduled by | Opens |
|---|---|---|
| `ending_after` | `when`, on a yes; today → tomorrow 10:00, this week / not sure → a week | the run at `after` (`?run=…&at=after`), off its path: the skill's `resumeAt` |
| `ending_again` | `after`, unless *I don't feel safe*; a week or a month | `after` again, its own answers asked fresh (a re-entry step never restores them) |
| `ending_revisit` | `not_yet`, on a yes; two weeks, 10:00 | a fresh visit from the first screen |

All three are session-bound (`FOLLOW_UP_SESSION_TOOL`): the server takes them only from an Ending session. Opening
one resolves it once its visit saves (`startToolSession` `OPEN_RESOLVES`, as for `resume_skill`); a visit that
saves nothing leaves the card until it goes stale (168 h) or the person dismisses it. A run reopens up to 45 days
back for this tool (`getSkillRun` `RESUME_DAYS_FOR`), since `ending_again` can be a month out.

## Departures from the PRD

- The after check-ins are one opt-in at a time, chained (`ending_after`, then *Another check-in?*), not the PRD's
  automatic +1 day / +1 week / +1 month: three unasked cards about a break-up are a lot to have on Today, and each
  is visible to whoever opens the app.
- No check-in at all in the safety branch, where the PRD allows an opt-in one: the content-free copy still puts a
  card on Today that someone checking the phone could open.
- *Stay and work on it* added to the decision (Gate 3): without it, *Not yet* framed staying as a postponement.
- *Interfering* also tries repair first (H13), where the PRD names only *hard right now*.
- The PRD's metric *safety-branch resource taps* can't be measured: R15 writes nothing there.

## Runtime changes this batch makes (for review)

- **R15 and quick exit**, above. The runtime contract (C7) asks for these in a separate `runtime:` PR; this lane has
  one branch, so they are one PR, listed here for review against the R table (`persist`, `quickExit`, `resumeAt` on `SkillDef`, mirrored in
  `functions/src/skills/types.ts`; the provider's `deferStart` / `begin` / `setBare`).
- **`resumeAt`**: a step a check-in re-enters even off the run's path; the review page's paths reach it after the
  deepest step that schedules a follow-up.
- **`boundaryLine` takes `field2` / `field3`**: a line card can be a short paragraph built from up to three picks,
  in field order.
- **The carried band reaches every skill that accepts it.** The player now reads `band.current()` (≤ 20 min, C6.2)
  when the link carries none. Rebel without the wreckage and It isn't working accept `band` too, so a person with
  a fresh flooded reading now gets their body-first paths without a host passing the band. That's the plan's rule
  (C6.2: "a host's or the carried reading"); it wasn't wired before.

## Deferred, and why

| What | Why it waits |
|---|---|
| People and `Person.status → ended`, `Interaction {kind:'end'}`, the People entry and IE-03's quiet card | IE-03 People isn't built |
| Discreet mode | CORE's; no app-wide discreet setting exists |
| *Add a trusted person* (CORE SafetyPlan) | The safety batch (CORE-01/02) is paused |
| The MF-04 wise-mind check as an embed | A link to Wise mind for now |
| Pros and cons of staying vs ending | DT-10 isn't built (planned exit) |
| Rehearse it | IE-02 (planned exit) |
| GIVE's *ending kindly* lines | IE-06 (planned exit); one kind opening line stands in |
| Size it (IE-07) on the channel | IE-07 isn't built |
| Let-go grief lines, *meet it elsewhere* | WMP / IE-09 (Find your people and Let it be are planned exits) |
| ER's `love-check` urge | ER to add; Do the Opposite's existing love urges serve now |
| An `EndingSession` label | Not needed: the run is `ext.run` when saved (plan D2) |
| Region lines beyond the US | The app is US-only |
| A hotline chat link in `CrisisBanner` | The banner's numbers are the one place they live; adding chat is a banner change for its own review |

## Listing and the clinical review

The PRD recommends a DV specialist review the safety branch before launch (D14), and Gates 1 and 3 both flagged
listing it before that. Claudia's call (11 Nov): list it now under Interpersonal Effectiveness, and have a clinician
review and tweak the copy and the safety branch after, so the module set is built and connected first. It also opens
from Problem Solve's *Decide if this can be repaired* and Rebel's *someone I'm scared of*. The review is still owed;
its changes are content edits in `scripts/skills/ending_relationships.py`.

## Tests

`tests/skill-ending.test.mjs` (the flow, the safety branch, Rebel's careful frame, R15, the check-ins, re-entry,
the after paths, quick exit), `tests/skill-runtime.test.mjs` (build.py's R15 checks), `tests/skill-contracts.test.mjs`
and `tests/skills-review.test.mjs` (re-entry steps count as reachable), `tests/module-edges.test.mjs`
(`tests/fixtures/module-edges.json`: Arch #26, #33–37, #42, C6.5 and DT-11's IE-08 edge now built), functions
`spine.test.cjs` (opening an Ending check-in resolves it), `skills.test.cjs` (the runtime switches served, 45-day
resume), `copeAheadAfter.test.cjs` (session-bound types).
