# Rewrite the nightmare (ER-15)

**Status:** built 10 Nov 2026 on the skill runtime (ER-B6; [the modules plan](dbt-modules-plan.md) §5.3). Listed
under Emotion Regulation for everyone, with the Tools intent *The same nightmare keeps coming back*. Source:
`scripts/skills/nightmare_rescript.py`. Tests: `tests/skill-nightmare-rescript.test.mjs`.

Claudia unparked it on 10 Nov (D14): build now, on the existing crisis banner and *Talk to someone now*, without
waiting for a clinician in the loop. That decision is why the safety shape below is strict.

## What it is

DBT ER Handout 20a, the nightmare protocol: imagery rehearsal. Pick a nightmare that keeps coming back, change it
before the bad part, give it a new ending, and rehearse the new version while awake, once a day.

Evidence (PRD ER-15): **Strong** for imagery rehearsal in nightmare disorder (Krakow et al. 2001, JAMA; Casement &
Swanson 2012, Clin Psychol Rev, meta-analysis; AASM position paper, Morgenthaler et al. 2018); **Preliminary** in
BPD (Sayk 2025). The app claims none of this on screen: no promised durations or outcomes, and nothing says it
treats PTSD.

## The flow

| # | Step | What the person sees | Handout 20a / PRD |
|---|---|---|---|
| 1 | `replay` | *Is this nightmare a replay of something that happened to you?* Yes, it replays something that happened · Partly · No, it's its own thing · I'm not sure. Hint: best in the daytime, eyes open, stop at any point. Note, for everyone: *When nightmares follow something that happened to you, a clinician can help with that.* | PRD gating. The plan's ER-B6 gate: one plain clinician line |
| — | `clinician` | Yes or partly. *Nightmares that replay something real are best worked on with a clinician, who can go at your pace. For tonight, settling your body and the room around you can help.* Offers 5-4-3-2-1, Sleep reset (planned, ER-13), Talk to someone now, Done. No close question. | PRD: *no rescripting* of replays |
| 2 | `settle` | `holdRing`, settle variant: three short holds, *notice your feet on the floor*. With *I'm not sure*, the title adds *If it starts to feel like a memory, you can stop there.* | PRD step 1 (absorb first). Grounding, not slow breathing (C6.3) |
| 3 | `start` | *Where does it start?* Somewhere like home · Outside · Somewhere like school or work · Travelling somewhere · Somewhere I don't know · Say it your way (60 characters). Hint: *Pick one that keeps coming back, not the worst one. You don't need to say what happens.* | H20a "choose a nightmare"; PRD step 2–3 (setting only) |
| 4 | `turn` | *Before it turns bad, what changes?* I get bigger and stronger · Someone on my side arrives · A door appears, and I go through it · It turns silly · I say stop, and it stops · I can leave, and I do · Say it your way | H20a "change the nightmare any way you wish"; PRD step 4 (`RescriptChange`) |
| 5 | `ending` | *How does it end now?* *Write your own, or start from one of these.* The own-words box is open (*Write your ending*) and nothing is picked; the chips are starters: I end up somewhere safe · I'm with someone I trust · It fades out quietly · I wake up calm | H20a "the changed nightmare"; the ER-B6 gate: the person writes the new ending |
| 6 | `rehearse` | `rescriptCard`: the new version on the square paper (*It starts* / *Then* / *It ends*), *Read it through*: a minute, eyes open, a thin line filling with no number, *Stop* always there; *I'd rather stop here* before starting | H20a "rehearse the changed nightmare"; PRD steps 5–6 |
| — | `stopped` | Stop, not feeling safe, or far away. *Stopping is part of this. You can come back on another day, or leave it here.* (far away: *Stopping here is fine. Coming back to the room around you can help.*) Offers 5-4-3-2-1 and Talk to someone now (first when not safe), Done. No close question. Never back into the dream. | The coordinator's ask: a clear stop / overwhelm exit |
| 7 | `after` | *How was that?* That was all right · It stirred me up · It started to feel like a memory (→ the clinician card) · I went far away or foggy (→ `stopped`, 5-4-3-2-1 first: orient, C6.3) · I'm not feeling safe (→ the crisis banner, then `stopped`) | PRD risks: re-exposure, flooding, dissociation |
| 8 | `settle_again` | `holdRing` again | PRD step 6 (settle after) |
| 9 | `plan` | *Keep this new version?* Keep it in Me · Not this time. *Want a reminder to read it through?* Tonight, before bed · Tomorrow, in the day. Hint: *Reading it through once a day, for a while, can help the new version take hold.* After *It stirred me up*, only *Tomorrow, in the day*: rehearse awake, away from sleep onset | H20a "rehearse every night before sleep"; PRD step 7 |
| 10 | `close` | *It's in Me* (when kept) or *You wrote a new way for it to go. Each read-through is practice for it.* | |

**A read-through visit.** The reminder (`nightmare_rehearse`, on Today, *Your new version — A read-through you
asked for. A minute, eyes open.*) opens `/tool/nightmare-rescript?run=<that visit>&at=rehearse&enterAt=rehearse`.
The player reopens that visit's run at the card (R9), with only the answers up to the card read back, so
nothing after it is pre-filled. After the read-through it goes the way a first visit does: *How was that?* (a
memory to the clinician card, not safe to the crisis banner, far away to orienting), then a settle, and then,
since `$ctx.enterAt` says it was reopened, the `again` card instead of the keep step: *That's one more
read-through*, with its own reminder chip (R5 on a hand-off). The person sets each next read-through, one at a
time, for as long as they want. Opening the link resolves the reminder; *Not today* dismisses it. The resume
window is 14 days from the visit that set the reminder, and each read-through visit starts a new window. When
the run can't be reopened (older than that, another version, a failed read), the player drops `enterAt` and the
fresh run is a whole first visit, keep step included.

## Safety, as built

- **Not for replays.** Yes or partly on the first screen, or *It started to feel like a memory* after a
  read-through: the clinician card. Nothing is rewritten.
- **Nothing asks what happened.** The only questions are where it starts (places only), what changes before the
  bad part, and how it ends now. The test greps the copy for *describe*, *what happens in*, *tell me about*.
- **Stop.** The player's *This is too much right now* under every screen (P2, C6.1). The card's own *Stop* and
  *I'd rather stop here* go to the stop card: grounding and someone to talk to, never the dream.
- **Someone to talk to on every screen.** A quiet *Talk to someone now* on every screen: on every ask step's
  first field, and as a step link under the holds, the read-through card and the end cards; an offer on the
  clinician and stop cards. Every step declares the crisis slot. It shows when *I'm not feeling safe* is picked
  (`danger: self`, C6.4), and stays on the stop card that follows, with someone to talk to as the first offer.
  Own words are never read, so they can't raise it.
- **A carried flooded band** (C6.2, only from a host): the first screen says it's one for a calmer moment and
  offers *Settle first* (5-4-3-2-1). Going on stays possible (C6.1).
- **Daytime.** The hint says it's best in the daytime, eyes open. Night mode is CORE's (ER-13), and the PRD
  never enters from it. No entry to this tool exists in night mode because night mode doesn't exist yet.
- **No routing rows,** by design: a recurring nightmare is not a check-in state. Entries are the Tools intent
  now, and Sleep reset's morning log and Running low's sleep row later (ER-13, ER-07).

## What's saved

- `ToolSession.ext.run`: the answers (own words encrypted), the card's report (`read` / `stopped`, seconds
  read), and the reminder scheduled. Close kind `none`: *how strong is it now?* means nothing after rewriting a
  dream.
- Profile `nightmare_script` (`functions/src/profile/kinds.ts`; a `ProfileFact` like quiet hours, so no new label
  per plan D2): `settingIds|settingOwn`, `turnIds|turnOwn`, `endingIds|endingOwn`, own words encrypted. Only on
  *Keep it in Me*. Me lists it under *My plans* (an area Me shows once it holds something) as *A nightmare I rewrote*, with the ending when they wrote it,
  and *Set aside*. At most 5.
- `FollowUp nightmare_rehearse` (practice tier). The copy and the notification never name the nightmare.

## Departures from the PRD

- **No sketch of the nightmare** (PRD step 3's *what happens* and *the point where it turns bad*). The ER-B6
  gate says no field asks what happened. Where it starts is the only anchor; the change comes *before the bad
  part* without naming it.
- **No voice note.** No audio storage exists. Own words cover the same need.
- **Rehearsal is one reminder at a time**, set by the person, not a two-week daily schedule. The spine has no
  recurring follow-up, and asking each time keeps it the person's choice.
- **No morning log or two-week review** (PRD steps 8–9: *it came · it came changed · it didn't come*). Both
  belong with Sleep reset's morning log (ER-13, ER-B5), which owns the sleep record.
- **No CORE dissociation or recent-crisis gate.** CORE has neither flag yet. The first screen's clinician line,
  the replay gate and *It started to feel like a memory* stand in until it does.
- **`NightmareScript` is a `ProfileFact` kind,** not a new label (plan D2).
- **A carried flooded band goes on** (the PRD says *steady only*). C6.1 never locks a tool, so the first screen
  says it's one for a calmer moment and offers *Settle first* (5-4-3-2-1) as a quiet link; going on stays the
  default. Flooded only ever arrives carried from a host (C6.2).
- **No settle before a read-through visit's card.** The reopened run starts at the card, eyes open, read when
  ready; *How was that?* and the settle come after it, as on a first visit. Reopening earlier would mean asking
  the questions again.
- **A *Tonight* reminder picked late** falls due an hour later (the spine's rule for a time already past), so
  near midnight it can land after bedtime. A per-type latest time is a spine change for every follow-up, left for
  the safety batch's night-mode work (ER-13).
- **The referral exit** (*Out: referral*) has no target until CORE's clinician-in-the-loop; the clinician card
  says a clinician can help and offers grounding and someone to talk to.
- **Rehearsing from Me waits.** A kept version lists in Me; reading it through from there needs a profile read
  of its answers into the card, a later step. Today's reminder reopens the visit's own run instead.

## Runtime changes it needed

- **Step-level quiet links** on embed and hand-off steps (`runtime:` commit), so *Talk to someone now* sits under
  the holds, the card and the end cards too.
- **A link's `enterAt` holds only for the run it reopens** (`runtime:` commit): a failed resume is a whole first
  visit.
- **R9 resume reads back only the steps up to the one reopened.** A later step is asked again, never pre-filled.
  Without this, a read-through visit would come back with last time's reminder chip picked and schedule it
  unasked. A field that books a reminder (a step's `followUp.whenFrom`) is never read back at all, even at
  the step reopened, since `scheduled` isn't restored. `tests/skill-contracts.test.mjs` pins both.
- **Opening a `nightmare_rehearse` link resolves it**, as for `resume_skill` (`functions/src/spine/toolSession.ts`).
- One new embed, `rescriptCard` (ER-owned; `src/components/skillPlayer/RescriptCard.tsx`), on the shared paper.
