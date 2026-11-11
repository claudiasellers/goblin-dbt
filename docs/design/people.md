# People and the safety question (IE-03 minimal, D4)

Status: **built 11 Nov 2026** (IE-B2, first PR). Owner: IE. Sources: PRD IE-03 and IE-01 *Step 0*
(`/mnt/project-files/handoffs/prds/prd-interpersonal-effectiveness.md`), plan rows IE-03, IE-B2, C6.6 and D4
(`docs/design/dbt-modules-plan.md`), `docs/design/user-profile.md` §4.2.

## What this is

The same people cause most hard moments. IE-03 lets the app remember who they are, so the person isn't asked to
re-explain someone each time, and so a safety answer about them carries from one visit to the next.

D4 brought one piece forward from the paused safety batch: DEAR MAN could build a confrontation plan for someone
dangerous. Its prep now opens with *Who is this conversation with?* and *Is it safe to bring hard things up with
them?*, and someone who might hurt or control the person gets no plan, the other-person resources, and Ending a
relationship that's hurting you, offered and never pushed.

## The flow (DEAR MAN prep, scene step 0)

```
Who is this conversation with?
  [Sam · Parent] [Jo · Boss] [+ Someone new]      Things changed with someone?
     │                          │
     │ fresh answer             └─ What do you call them? (optional, "No real names needed")
     │   → straight on              Who are they to you? (role chip) → Go on
     │ never / > 90 days /
     │ Things changed
     ▼
Is it safe to bring hard things up with {who}?
  Yes, mostly → on to the plan
  No / Not sure → Is it more that they might hurt or control you, or that it tends to go badly?
                    They might hurt or control me ─┐
                    I'd rather not say ────────────┴─► safety route
                    It tends to go badly ──────────► on to the plan, with the heads-up
```

- **Safety route** (`PersonSafetyRoute`): "Planning a hard talk with {who} can wait. Your safety comes first."
  Quick exit on the screen (the other person may be close by); `CrisisBanner variant="other_person"` (911, the DV Hotline, 988; still the only file with the
  numbers); *Thinking about ending the relationship* (not "ending things", which reads as suicide under 988) → `ending-relationships?frame=careful` (its safety branch,
  whatever the person answers there); *This is about someone else* back to the picker. Nothing that composes words
  to them is offered (no FAST line, no Cope Ahead rehearsal, no plan). Nothing locks: the person can leave any way.
- **Heads-up** (*it tends to go badly*): one line on the situation step: "When talks with them tend to go badly, it can
  help to keep it short, about one thing, and in writing if that suits." Every situation stays open (see *Open questions*).
- **Signed out**: the picker opens on *Someone new*, says "This stays on this screen only", keeps nothing, and asks
  the safety question every time.

## What is kept, and when

| What | Layer | Written by | When |
|---|---|---|---|
| `Person` {label, role, safe, risk, safeAskedAt} | profile (`HAS_PERSON`) | `keepProfileItem` / `editProfileItem` (kind `person`) | Someone new, **named**, signed in: the screen shows "The app will remember {who} for next time: the name you gave, who they are to you, and your answer about safety. Nothing else." before the tap (C2: the tap is the yes). A kept person asked again: the new answer |
| `Person.lastUsedAt` | server field on the item | `saveDearManSession` | A saved plan with them (orders the picker; no content) |
| `DearManSession.personId` + `WITH_PERSON` | log → profile edge | `saveDearManSession` | A saved plan with a kept person |

- `label` is the person's own words: encrypted at rest (`ownFields: ['label']`), decrypted only for them (the
  `people` slice, Me). A label that no longer decrypts is left out of the picker rather than shown blank.
- The safety answer is profile, not ask-fresh: it is re-asked after `PEOPLE_SAFE_REASK_DAYS` (90) or on *Things
  changed*, never shown back as a label on the person, and never shown in Me.
- Me → **My people** lists them (name and role), with *Set aside* (out of the picker, restorable) and a two-step
  *Forget them* (`deleteProfileItem`: the person and their `WITH_PERSON` links go, and `personId` is cleared on
  their plans; plans keep the role). Export and
  delete-everything cover `Person` through the layer registry.

## Rules (one seam)

`functions/src/safety/personSafety.ts`, mirrored in `src/lib/personSafety.ts` (test-equal):

- `personRoute(risk)`: `harm` / `unstated` → `safety`; `invalidating` → `heads_up`; else `ok`.
- `needsSafetyAsk({safe, safeAskedAt}, now)`: never answered, unreadable, or older than 90 days.
- **Server-side as well as in the flow** (plan C6.6): `saveDearManSession` refuses a prep for a kept person whose
  stored risk is on the safety route (`failed-precondition`). An id that isn't the caller's own person is not linked.
  This covers kept people only: a plan for *Someone new* has no id to check (the flow still routes it on screen),
  which fits "nothing locks".

The picker's steps are pure (`src/lib/people.ts`), rendered by `src/components/people/PersonPicker.tsx`, with its
copy in `DearManSafetyCopy` (`scripts/dear-man/content.py` `SAFETY_COPY`). The picker renders only when every key
ships (`pickerCopy`); an older graph keeps the old role chips.

## Resume and errors

- A resumed DEAR MAN draft carries the picked person (never one on the safety route). A draft with no person (from
  before the picker) resumes at the picker, so the question comes before any plan step.
- If the `people` slice fails to load, the picker opens on *Someone new* and keeps nothing this visit (no
  duplicates); the safety question is still asked.

## Also in this PR

- **Body Reminder from the graph**: `ConfidenceCue` (Appear confident, H5: body and voice) nodes `IMPLEMENTS
  dbt_dear_man`, returned by `getDearManContent` as `confidenceCues`, replace the hard-coded line on the plan card.
- **Done for now** at the end of the debrief goes to `/` (it went to a blank category route).
- **Recover passes the person**: `DearManHandoff` has no person yet, because Recover doesn't ask who (WMP's Recover v2
  does). Until then, a Recover hand-off opens on the picker like any prep, so the safety question is still asked.

## Departures from the PRD

- **Name optional.** The PRD's new-person form takes a label and a role. Here the name is optional: without one the
  person isn't kept (there'd be nothing to show back), and the safety question is still asked. This keeps the
  picker at two taps for someone who doesn't want to type a name.
- **No "step away without saying anything"** on the safety route. The PRD names IE-05's boundary option there, but
  FAST's Let go composes a boundary line, which is words to the person. Left out until IE-05 has a no-message form.
- **Refusal counters** (`Person.refusalsValidation` / `refusalsPractical`) and `Interaction` came with the debrief
  (IE-B2's second PR, [`dear-man-debrief.md`](dear-man-debrief.md)), which writes the outcome they count from; the
  `people` slice carries `refusalsValidation`. `witness`, `status` (ending) and discreet mode wait for
  their owners (WMP, IE-08's follow-ups, the safety batch).

## Decided (Claudia, 11 Nov: "go with your recommendations for all")

1. Re-ask every 90 days **and** on *Things changed* (as built).
2. *It tends to go badly*: a heads-up only, every situation open; once the debrief has counted a refused ask to be
   heard (address, pattern), the next such prep with that person offers FAST's Let go (built in the debrief PR).
3. The debrief asks who first, and someone on the safety route gets the same safety screen as the prep.

## Waits on the safety batch

Region-appropriate DV resources and SafetyPlan (the banner is US-first today), discreet mode, and a hotline chat
link. The clinician review of the safety route's wording joins IE-08's (D14).
