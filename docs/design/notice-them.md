# Notice them (IE-10)

**Status:** part 1 built 12 Nov 2026 on the skill runtime (batch IE-B5 of [the modules plan](dbt-modules-plan.md), the
second of its three skills).
- **Tool:** `mindfulness-of-others`, listed under Interpersonal Effectiveness with the Tools intent *I was sure they meant it*.
- **Concept:** the new `dbt_mindfulness_of_others` (`appToolId: 'mindfulness-of-others'`, `PART_OF` `dbt_interpersonal_effectiveness`).
- **Source:** `scripts/skills/notice_them.py`.
- **Page:** `src/pages/tools/NoticeThem.tsx`, which uses `PersonFirstSkill`, so the picker and D4's safety question come first.
- **Test:** `tests/skill-notice-them.test.mjs`.
- **New follow-up type:** `notice_back`.
- **New embed:** `twoColumns` (`src/components/skillPlayer/TwoColumns.tsx`).
- **Close kind:** `none`.
- **No projection:** the PRD creates no `Interaction`, because this is not an ask.
- **Rolling back:** remove `'mindfulness-of-others'` from `PAGE_SKILLS` and `toolComponents`, and remove the tool from `src/data/tools.ts`.

**Spec:** PRD IE-10 in `PRD – Interpersonal Effectiveness.md`; DBT IE Handout 12 (mindfulness of others: observe, describe, participate, with curiosity, without judging); the Wound PRD's two-columns primitive.

## What it is for

The person says *I was sure they meant it*, or *I don't really listen, I'm planning my comeback*. The skill turns hostile certainty into two columns: *what they did* and *what I added*. It also builds a habit of noticing someone with curiosity instead of scanning them for threat.

It runs at three moments:
- as a calm-time practice;
- before a conversation (*Notice them next time*);
- the day after a misunderstanding (DEAR MAN's debrief). It never runs while flooded.

## Who first

The page asks *Who's it about?* with the person picker, then D4's safety question when that answer isn't fresh.
- If they might hurt or control the person, or the person would rather not say, the safety screen shows: *With {who}, noticing danger signs is the right kind of attention. Your safety comes first.* It shows the other-person resources and Ending with `frame=careful`, and never the skill. This is the PRD's *not available* for someone at risk of harm.
- *It tends to go badly* is the `heads_up` frame: *And what did you add?* reads *If anything. Nothing is an answer too.*, *They meant to hurt me* comes first on the not-knowing card, and Recover leads on `harm_seen`.
- *Someone new* with no name stands in for the PRD's *someone I'll see today*.

## The flow

| Step | What the person sees | PRD IE-10 |
|---|---|---|
| `way` | *What would help with them?* (*Curiosity, not checking on them.*) Notice them next time I'm with them · Look again at something that happened · Do one thing with them fully. `?situationId=` puts one option first: the debrief and *I couldn't* put *look_again* first. A carried flooded reading sees only *notice* and *fully*, with *Looking again at what happened works better once your body settles* and a *Settle my body first* link | Observe / describe / participate; never while flooded |
| `notice` | *Next time you're with them, notice one thing with curiosity.* (*Not checking whether they're upset. Noticing them, the way you'd notice a song you like.*) Their face · What they care about right now · What they're into lately · Something that makes them laugh · Something they're good at · Something I hadn't noticed before | 1. Observe, off-phone; the hypervigilance guard |
| `fully` | *Pick one thing to do with them fully.* (*No phone, and go with it. If your mind drifts, come back to them.*) A meal · A walk · A conversation · Watching something together · Something they like doing, or own words | 3. Participate |
| `when` | *When will you see them?* Later today · Tomorrow · In a few days · Sometime this week. *Want me to ask how it went?* Yes books `notice_back` | → FollowUp |
| `set` | *That's the practice.* *Notice yourself too: how you are when you look at them this way.* If the reminder was booked, *I'll ask how it went.* comes first | The *notice yourself too* cue |
| `did` | *What did they actually say or do?* (*What a camera would have caught.*) Up to three: said something short or sharp · didn't reply, or replied late · interrupted me · raised their voice · said no · forgot something · looked at their phone · criticised something · walked away · **threatened me, or scared me** · **hurt me, or grabbed me**, or own words. Either danger pick shows the other-person resources on the screen and goes to `unsafe` | 2. Describe: column one |
| `added` | *And what did you add?* (*The meaning you put on it. Most of us add something.*) Up to three: they don't care · they're angry with me · they did it on purpose · they think less of me · it's always like this · they're pulling away · *Nothing. I took it as it was*, or own words | Column two |
| `sure` | *How sure are you of what you added?* Sure · I think so · Not sure. *Sure* goes to `trust` only when what they did outweighs what was added (a counting derive: each *did* pick +1, each meaning −1, own words not counted); otherwise the not-knowing card | The PRD's rule: most chips in *what they did*, and certainty *sure* |
| `not_knowing` | *What might have been going on for them?* (*A guess. You can't know for sure, and that's allowed.*) They were tired · stressed about something else · didn't notice · see it differently · felt defensive · **meant to hurt me** · I don't know | The not-knowing card |
| `columns` | *What happened, and what you added.* Both columns on the paper (`twoColumns`), with *Maybe: {guess}* under them, and the hint *Notice yourself too: how is it to see them side by side?* | Two columns |
| `end` | *Two columns.* Then *Holding your reading a bit looser can make the next conversation easier.* On *not sure* or *I don't know*, the line starts *Not knowing leaves room.* One message is offered | |
| `harm_seen` | *They meant to hurt me* leads here: *That's a real answer.* *You don't have to find a kinder reading. Looking after yourself with them comes first.* *If they might hurt or control you, there's help for that too.* FAST's Let go, Recover and Ending (`frame=careful`) are offered; no close | Routes to FAST/Let go, not to more empathy |
| `trust` → `trust_end` | *Sure* (when what they did outweighs what was added), or *Nothing* on its own, shows the two columns, then *You're sure.* *You don't have to argue yourself out of it. What they did is on the left; what it meant to you is on the right.* with FAST's Let go. For *Nothing*: *You took it as it was.* *That's the practice.* | Never asks the person to doubt themselves, and never calls the meaning a fact |
| `unsafe` | A danger pick on `did`, or *I don't feel safe with them* on the card: *Your safety comes first.* *You don't have to work out what they meant. There's help for this, any time.* The other-person resources, Ending (`frame=careful`), no close | PRD: not available for someone at risk of harm |

### When the card comes back

The Today card for `notice_back` reads *Your practice: A practice in noticing someone you picked. How did it go?*. It never names the person or the practice. It reopens the run at `back` (R9 `reopens`), but only on a run that reached `when`.

| Step | What the person sees |
|---|---|
| `back` | *Did you get to notice them?* (or *Did you get to do it fully?*) Yes · I forgot · I couldn't · We didn't see each other · I don't feel safe with them (the other-person resources, then `unsafe`) |
| `noticed` | *What did you notice?* (*Anything counts, including about yourself.*), optional, then *That's mindfulness of someone else.* *Attention with curiosity, off the phone. It can get easier with practice.* |
| `again` | *I forgot* or *We didn't see each other*: *That's part of practising. Another go?* Pick a new time (a new card) · Leave it for now |
| `couldnt` | *That's a real answer.* *Some days it's too much to be curious about someone. That's allowed.* Recover first, then Notice them again with `situationId=look_again` |

*Talk to someone now* is on every screen.

## Saved

- `ToolSession.ext.run` holds the run. Own words are encrypted at close, as for every skill.
- The columns are option ids, so the counts the PRD asks for can be read from the run.
- No `Interaction` is written, because this is not an ask.
- *Yes* on the card logs `followup_offphone` (`OFF_PHONE_SKILLS.notice_them`, the PRD's `mindfulness_of_others`). Forgot, couldn't and not seen log nothing. The first visit keeps the close's own rep.

## Routing

`CONCEPT_TAGS['mindfulness-of-others']`: side both, skillKind relational, direction neutral.

One word row is live (12 Nov 2026):
- *critical* and *dismissive* on Watchful (`chronic_vigilance`) show Check the Facts first and Notice them beside it. Before this, Wise mind sat beside it.
- *skeptical*, *jealous* and *persecuted* keep Wise mind. *Persecuted* can mean real harm, where looking for another reading is the wrong thing to ask.
- The row never shows on a flooded result (steady and stirred only).
- It reads the words one at a time, so a check-in with *critical* and *persecuted* still shows Notice them beside Check the Facts (`tests/recommendation-reachability.test.mjs` pins it). That's acceptable here because the page asks the safety question first and *They meant to hurt me* and the danger picks are always offered. An `unlessWords` gate would be a change to the routing engine and isn't built.
- The concept has no `ADDRESSES` edges, for the same reason as Find your people's (the legacy ranker baseline).

## Entry points

- The Tools list and the intent *I was sure they meant it*.
- DEAR MAN's prep: the end card offers *Notice them next time, with curiosity* (`situationId=notice` and the person), the PRD's optional *their side* as an offer, not a step inside the plan.
- DEAR MAN's debrief: when the turning point was *They got defensive*, and not *It escalated quickly* or *I gave in to keep the peace*, and *between you* isn't *no* or *I don't feel safe*, the end card (`good` or `fix`) offers it with `situationId=look_again` and the person.
- The check-in result for critical / dismissive (Routing above).

## Departures from the PRD, and the batch that picks each up

| PRD | Part 1 | Later |
|---|---|---|
| Two columns: chips of the episode dealt one at a time and flicked to a column (`pileSort`) | Two picks, *what they did* then *what I added*, each with their own chips, laid side by side on the paper (`twoColumns`). There is no episode record to deal chips from | `pileSort` (ER-B4's family), once Recover v2 or the debrief can hand an episode over. `twoColumns` is IE's stand-in in plan C3b |
| Routes to FAST/Let go when most chips are in *what they did* and certainty is *sure* | Built as a counting derive (did +1, added −1, at least even). Own words aren't counted. *Nothing* added on its own also goes there | None planned |
| Columns saved as counts only | Option ids, plus own words on *what they did* / *what I added* / *something else* (encrypted at close, as every skill's). The project leads with chips and keeps *add your own* as the escape hatch; ids give the counts | A clinician review can drop `own` on `did` and `added` |
| THINK line (adolescent add-on) | Not built: the PRD's open question, and this is the adult app | If an adolescent mode comes |
| MF runtime: capped at one a day; fade guided → cue → off-phone; MF-02 rotation | Not built: MF's practice runtime doesn't exist yet (D3: the skill runtime is MF's runtime, and this skill runs on it) | MF batches |
| `OthersPractice`, `NotKnowingOption`, `ThinkLine` nodes `IMPLEMENTS` the concept | The skill's options (graph content through `skills.cypher`) | When a second surface needs them |
| Recover v2's *worth a second look* zone | Not wired: Recover v2 isn't built | WMP |
| Metrics: within-person change in *sure they meant it* answers in Recover | Not wired | Insights |
| Metric: how often the debrief's *they got defensive* is followed by a *what might be going on* pick | Not measurable yet: the Notice them visit doesn't record which debrief opened it | Insights (a `hostSessionId` in the exit's context) |

## Risks (PRD) and what answers them

- **Excusing harm:** the safety route before the skill; *Threatened me* / *Hurt me* and the card's *I don't feel safe with them* go to `unsafe` with the other-person resources; *They meant to hurt me* is always an option and goes to `harm_seen`; *Sure* goes to `trust`, never to the not-knowing card.
- **Hypervigilance:** the observe copy is curiosity, not monitoring (*Not checking whether they're upset*; no *how they're doing* chip), and *notice yourself too* closes each practice.
- **Self-gaslighting after real invalidation:** never while flooded (no *look again*), and Recover is offered on `harm_seen`. Recover owns the acute path.
