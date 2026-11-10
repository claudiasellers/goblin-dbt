# It isn't working (ER-14)

Written 10 Nov 2026. Status: **built on the skill runtime** (batch ER-B1 of
[the modules plan](dbt-modules-plan.md), first PR, F1 only). Source: `scripts/skills/er_troubleshoot.py`;
played by the skill player (`src/lib/skillRuntime/playerTools.ts`); tests `tests/skill-er-troubleshoot.test.mjs`.
Spec: PRD ER-14 in `PRD – Emotion Regulation.md` (§5), DBT ER Handout 24 (troubleshooting emotion
regulation skills).

## What it is for

"I did the skill and nothing changed." Without a reason, a skill that didn't help turns into "nothing works
for me", and people stop. This is the calm-time look at what got in the way, one tap at a time, ending on one
thing to try. "I didn't do it" is CORE-11's (missing links, not built); this is for "I did it and it didn't help"
(PRD Index §5.1 #12).

## The flow

The first screen opens with the validation line (absorb), then Handout 24's checks, one per screen, one tap
each. The first *yes* goes to that check's fix, a hand-off card with one move and *Done*. A *not sure* goes on
to the next check, except on *Did the feeling fit the facts?*, where not sure is the cue to check the facts.

| # | Check (H24) | Yes | Fix | Move |
|---|---|---|---|---|
| — | Validation: "When a skill doesn't help, that's information. It isn't proof you can't do this." | | | |
| 1 | Body: could your body be turning the volume up? (PLEASE) | *Maybe, yes* | Low body, louder feelings; looking after one counts as a skill | Running low (`please-skill`, planned) |
| 2 | The right skill: did the feeling fit the facts? | *Yes, it fit* | The move is the situation, or making room for the feeling | Problem Solve; the wave and Let it be (planned) |
| | | *I'm not sure* | Checking the facts shows which kind of skill fits | Check the Facts |
| 3 | All the way, or partly while still protecting yourself? | *Partly* | A smaller step done all the way | The line itself: retry the same skill |
| 4 | Is something around you rewarding the old way? | *People back off when I get angry*, *I get out of things when I go quiet*, *Someone steps in when I'm struggling* | The old way is doing a job; find another way to get it | Problem Solve |
| 5 | Willing, or was part of you not up for it? | *Part of me wasn't up for it* | Willingness comes and goes; make room first | Let it be (`let-it-be`, planned) |
| 6 | Too much at once? | *Yes, a lot at once* | One skill gets buried; pick one thing | Problem Solve, or 5-4-3-2-1 (grounding) |
| 7 | A belief in the way? (myths, ER Handout 3) | a myth chip or own words | A belief can feel like a fact | Myth cards (`emotion-guide`, planned) |
| — | Nothing stood out | | "That's information too … that isn't on you" | Missing links (`missing-links`, planned) |

Planned moves are written as planned exits (plan C4.4): the edge is in the graph, the card doesn't show it,
and the tool's own PR flips it when it ships. Until then those cards show the line and *Done*.

## Safety

- **Hopelessness.** *Nothing will ever help me* is a belief chip with `danger: 'self'`: while it's picked the
  belief screen shows the crisis slot, and its fix card keeps the banner, says "That sounds heavy to carry.
  After trying this much, it makes sense to feel it. You don't have to hold it alone." (no reappraisal: voice.md
  S9) and offers only *Talk to someone now* (`safety_open`) and Done.
- **Own words aren't read,** so a belief typed in them can't raise the slot: the belief screen always has a
  quiet *Talk to someone now* while that chip isn't picked (the banner replaces it when it is).
- **Flooded.** A calm-time conversation. The skill never asks or infers a band (D1, C6.2). When a host carries a
  flooded band, the first screen shows a quiet *You could ground yourself first* link to 5-4-3-2-1; going on
  stays the default, nothing locks. `TooMuchLink` is under every screen (the player).
- **No cold water.** Neither the overload fix nor the flooded link offers Circuit Breaker (`cool-down`): with no
  medical self-check yet (DT-B2) and no way to know the person isn't shut down, grounding is the direction-safe
  move (C6.3, C6.7). Switch to First, the body when DT-01's filters exist.
- **No effort-blame.** Willingness is asked as "part of you wasn't up for it", never as not trying hard enough;
  the none card says "that isn't on you". Body examples use no amounts.

## The record

One `ToolSession` with `ext.run` (plan C1, D2): the path (checks answered, then the fix), each check's option id,
what the card offered and the exit taken. Close kind `none`: the outcome that matters is the next skill's close,
linked by `hostSessionId`. No new label, no ask-fresh field, no profile write.

## Entry

- Tools: listed under Emotion Regulation for everyone, and the intent *My skills aren't working*.
- Not routed from the check-in: no check-in state means "a skill didn't help", so it has no `RECOMMENDED_FOR`
  rows (recorded in `scripts/recommendations/content.py`).
- Later, by their owners' batches (`tests/fixtures/module-edges.json`): Do the Opposite's readout after the third
  *same / louder* in a week or *too strong* twice (ER-B3), the wave's close answered *louder* twice (ER-B5), and
  Reflect when a used skill keeps ending *not really*.

## Departures from the PRD

- **The checks stop at the first yes.** The PRD lets the rest be answered after the fix. A hand-off can't go back
  into the checks without a runtime capability, and one fix at a time is the point. Revisit if people want it.
- **No follow-up yet.** "One next move + FollowUp" needs the follow-up action (R5, F2). Lands with the rest of
  ER-B1 after F2.
- **No "last three times it was the body".** That is an aggregate over past runs; a live flow never reads the log
  (data layers). Reflect can show it from `ext.run` when the router or Reflect work picks it up.
- **Flooded is a quiet grounding link, not P2 first.** The PRD says "flooded → ER-01 first". P2 is the
  `TooMuchLink` under every screen; forcing it first would gate the flow on a band, which C6.1 forbids.
- **All the way offers no tool.** The PRD's fix is a line ("try a smaller step, but all of it"); the skill to
  retry is the one that didn't help, which the skill can't know yet (no host id in context). Sending everyone
  to Do the Opposite was dropped: it's contraindicated for dissociation and wrong after Problem Solve.
- **Four fix cards end on Done** (body, all the way, willingness, belief) and so does *nothing stood out*,
  until Running low, Let it be, the myth cards, missing links and F2's follow-up ("try it again another day")
  land. Their lines are the move meanwhile.
- **The check for reinforcers offers Problem Solve,** since the PRD's target is WMP behaviour-change content that
  doesn't exist as a tool. The line carries the explanation.
- **`ToolSession` + `ext.run`, not a `SkillPractice` rep** (D2).
- **Fade** (checks → one-screen checklist → the person names the cause first) is not built.
