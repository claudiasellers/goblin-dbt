# Wise mind check (MF-04's check and look-back)

**Status:** built 15 Nov 2026 on the skill runtime (MF-B6; [the modules plan](dbt-modules-plan.md) §5.3a). A second
form of the existing `wise-mind` tool: the hand-built practice ([wise-mind.md](wise-mind.md)) stays its default, and
the check plays on the skill player at `?frame=check` (Tools card *Check a decision with wise mind*, intent *Check a
decision before I act*) or when a run is reopened (`?run=`, the look-back card). Source:
`scripts/skills/wise_mind_check.py`. Tests: `tests/skill-wise-mind-check.test.mjs`. New embed: `stoneSink`
(`src/components/skillPlayer/StoneSink.tsx`, over Wise mind's own Stone on the lake). Rolling back is removing
`wise_mind_check` from `PAGE_SKILLS` and `isWiseMindCheck` from `src/pages/ToolPage.tsx` (the practice is untouched),
the intent and card from `src/data/tools.ts`, and the `wise` option and step from `scripts/skills/dear_man_one.py`.

## What it is

PRD MF-04's *check*: costly decisions get made in emotion mind (send, quit, leave, act on an urge) or in a cold
reasonable mind that overrides needs, and there's no place to decide *from*. Under a minute: what you're deciding,
which mind is steering, the stone, what comes back, a yes checked for urgency, then a look back tomorrow, which is how
the person learns what their wise mind feels like (the internalisation step). It's also the small check a host runs
inline (R8) before a decision: plan C3c's MF P2 primitive, taken over from One message's ask step.

## The flow

| Step | What the person sees | PRD MF-04 |
|---|---|---|
| `decision` | *What are you deciding?* (*Wise mind is the part of you that knows what fits. It can take a minute to hear.*) Send a message · Say something to someone · Leave · Quit something · Buy or use something · Something else (own words) · Get away from someone who might hurt me · Hurting myself | Step 1 |
| `hurt` | The crisis banner, *Thank you for saying it. That's not a decision to make alone. Someone to talk to comes first.*, Talk to someone now, opened straight away (`safetyFirst`). No check, no close | Hard rule: a self-harm decision never reaches a wise mind check |
| `away` | *Getting safe comes first. When someone might hurt you, wanting out fast isn't emotion mind. These can help you get away safely.* The `other_person` resources, Talk to someone now and *Leaving someone who might hurt me* (Ending, `frame=careful`). No check, no wait, no close | PRD risk: urgency to get away from danger is not emotion mind |
| `cues` | *Which mind is steering right now? Tap any.* (*There's no wrong answer. It's only to notice.*) It has to happen now · The facts don't matter right now · My feelings don't count here · I'm sure, and I'm fired up · I'm calm, and it still feels right · I can't tell · I need to get away from someone (→ `away`, whatever else is tapped). A carried flooded reading keeps the question and adds *Wise mind is hard to reach this loud. Body first, then ask. Or ask anyway.* with *My body first* (First, the body) as a link; inside a host, no link, and the line says they can go back to where they were | Step 2; flooded: DT first, never a gate |
| `settle` | The read, stated plainly: *Sounds like emotion mind is driving. It isn't wrong. It decides fast.* (any emotion-mind cue) · *reasonable mind … can leave your feelings out* · *could be wise mind. Ask it and see.* (calm, and not flooded) · *Hard to tell which mind is driving. That's common.* Then the stone (`stoneSink`): *Hold your choice in mind. Let the stone go into clear water.* (*Ask yourself what to do as the stone goes down.*) *Let it go*, it drifts down through clear water and rests on the sand, a line per third, 20 s; *Move on* is always there, and takes focus once the stone is let go | Steps 2, 3 |
| `answer` | *What came back?* (*Nothing yet is an answer too.*) A quiet yes · A quiet no · Wait · Nothing yet | Step 4 |
| `yes_check` | A quiet yes with an emotion-mind cue or a stirred or flooded body: *Is the yes calm, or urgent?* (*Emotion mind can sound like a yes. A wise yes can wait a minute.*) Calm · Urgent · I can't tell. On a carried flooded reading even a calm yes goes on to the wait (*A yes. With your body this loud, a short wait is worth it. How long?*), go ahead anyway always there | Step 5 |
| `wait_pick` | On its own, when waiting is the answer (wait, nothing yet, an urgent or unclear yes): *Then give it some time. How long?* A minute and a half (`holdRing`, timed) · Twenty minutes (`waitLock`) · Sleep on it · Go ahead anyway. After a wait, `after_wait` asks again and that answer stands; a yes there is checked once more (`yes_after`: calm or urgent, no second wait) | Step 5's wait (the open question's 90 s, 20 min, tomorrow) |
| `look` | The answer said plainly (*A calm yes. That's yours to act on.* · *A quiet no. That's worth listening to.* · *Then waiting is the wise answer for now.* · *An urgent yes is worth a wait.* · going ahead anyway, sleeping on it) and *Look back on it tomorrow?* (optional: *Yes, ask me tomorrow*) booking `wise_mind_lookback`. Going ahead anyway reads *You're going ahead. That's yours to decide.* | Step 6; look-back |
| `end` | *Whatever you decide, you checked first.* *Next time, the stone and one question are enough.* | |
| `lookback` | Reopened from the card: *You checked with wise mind about this: {decision}* (no *yesterday*: the card lasts 72 h) What did you do in the end? (waited · went ahead · decided not to · didn't decide) and Looking back, did that come from wise mind? (yes · sort of · no · can't tell) | Look-back |
| `sign` | After yes or sort of: *What tells you it's wise mind?* Quiet · Still · Sure, without rushing · own words | Internalize: the person's own sign |
| `back_end` | A line for the look-back answer (*That's what your wise mind feels like. Worth remembering.* …) | |

*Talk to someone now* (`safety.open`) is on every screen. Close: none asked (`noClose`): the answer is the outcome.
Every completed check logs a `wise_mind` rep (the PracticeSkill's `defaultFor ['wise-mind']`), standalone or inline.
The look-back logs none (`OFF_PHONE_SKILLS.wise_mind_check` with no yes id): it's neither a check nor a practice.

## Inline (R8)

`inline.enterAt: ['cues']`, the decision seeded from `situationId` (`enterWhen`: only with a decision), `frame:
hosted` (no wait screens, no body-first link: the host owns the wait and the draft). It gives back at `end` with its
own outcomes: `go` (a calm yes, or going ahead anyway), `wait` (wait, nothing yet, an urgent or unclear yes) or
`no_go` (a quiet no), and `unsafe` for *Hurting myself* or danger from someone (`hurt` and `away` end `stopped`). The look-back offer is on `look`, an
ask step, so an inline check books it too (the sub-run is its own `wise-mind` ToolSession, which the card reopens on the
Wise mind page).

**First host: One message.** The cooling screen (hot, not sure or a stirred body, before the card) gets *Check it with
wise mind first* (`wise`, the `inlineSkill` embed with `{situationId: send, frame: hosted, band}`), listed before *I'm
good to send it*. `unsafe` first → `wise_unsafe` (the `other_person` resources, Talk to someone now, Ending careful; no
reminder, no card), `no_go` → `quiet_no` (*A quiet no. Want to keep the message for later?*: *Save it and remind me*
or *Show me the message anyway*), `wait` → *Hold it for ten minutes*, a yes → the card. One message's own first step (*where's this coming from?*) stays: it decides the
cooling screen.

## The look-back card

`wise_mind_lookback` (new `FollowUpType`, owner `mf`, tier `practice`, deep link
`/tool/wise-mind?run={sourceSessionId}&at=lookback&followUp={followUpId}`, chip `tomorrow` at 09:30, stale after 72 h:
missed look-backs expire silently, *Not this time*). Opening it resolves it (`OPEN_RESOLVES`); only a wise mind check
can book it (`FOLLOW_UP_SESSION_TOOL`); only a run that reached `look` reopens (`reopens: {after: 'look'}`).

## Where it departs from the PRD

- **No `WiseMindCheck` node, `StateOfMind` / `MindCue` nodes or `EVIDENCE_FOR` weights.** The record is the run
  (`ToolSession.ext.run`, log). The cues are skill options carrying the `MindCue` label (their mind as a prop), the
  decisions `DecisionType`; the read is a fixed rule (any emotion-mind cue first, then reasonable, then wise only when
  calm and not flooded), not weighted evidence. Weights wait for content.
- **The host reports no outcome.** The look-back asks what the person did in the end, instead of a host-reported
  `waited / went_ahead / didnt_decide`.
- **One host.** DEAR MAN's prep summary, Recover's Ask, Do the Opposite's *Pick a step*, Problem Solve's commit and
  pros & cons are part 2; each switches its exit to inline in its own PR (plan C3c).
- **No DISSOC swap.** No signal for far away reaches the check, so sinking imagery isn't swapped for an outside-in
  anchor; the stone has reduced-motion still frames and *Move on* is always one tap away.
- **The look-back is opt-in** (the PRD books it after every check): a reminder nobody asked for after a hard decision
  reads as being watched. The chip says *Yes, ask me tomorrow*.
- **No walking variant** (stone on the lake while walking): the practice page's job, part 2.
- **Additions the PRD doesn't spell out, from the gate reviews:** the danger route (`away`), the flooded yes offered a
  wait, the yes after a wait checked once more (step 5's *look again after*), and One message's `quiet_no` choice.
- **The practice is unchanged** (the hand-built page's variants: stone on the lake, wise in mind out, ask and listen);
  the stairs, the pause between breaths and the spiritual framing wait.

## Part 2 (deferred)

| Item | Why it waits |
|---|---|
| Fade: own read → *Wise mind?* with the sign word → the sign word alone in hosts | The Practice home's fade levels |
| The other hosts (DEAR MAN prep, Recover Ask, OA, Problem Solve, pros & cons) | Each host's PR (C3c) |
| `StateOfMind` / `MindCue` weights, the descending tone | Content |
| The look-backs in Reflect (*This week you waited twice…*) | Reflect's MF section |
