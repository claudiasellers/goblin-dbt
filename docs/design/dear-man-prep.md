# DEAR MAN's prep on the skill runtime (IE-B4, first PR)

Built 12 Nov 2026. PRD: `prd-interpersonal-effectiveness.md`, IE-01 Mode B (the full plan) and Mode C (the pocket card);
DBT IE Handouts 4, 5, 5a and 8 (the ask column's sizing, built 12 Nov: *How hard to push*, below). Plan rows: IE-01, IE-07 and IE-B4 in [`dbt-modules-plan.md`](dbt-modules-plan.md), D11
(three skills under the one `dear-man` id: this prep, [one message](one-message.md), [the debrief](dear-man-debrief.md)).
It reuses the debrief's and Say no's pieces: `PersonFirstSkill` ([`say-no.md`](say-no.md)), the picker and D4's safety
question ([`people.md`](people.md)), the `ask_outcome` card into the debrief.

## What it is

`/tool/dear-man` with no `mode` (the Tools card, Problem Solve's links, Check the Facts, Recover's *Ask them* when the
pull wasn't to chase, the check-in's cards). Who it's with comes first (`PersonPicker`, the prep's question and safety
heading), then the `dear_man_prep` skill (`scripts/skills/dear_man_prep.py`) on the player in the same visit.

```
/tool/dear-man ─► who's it with? (PersonPicker; the safety question when the answer isn't fresh)
   ├─ they might hurt or control me / rather not say ─► the safety screen, never the skill (and saveDearManSession refuses)
   ├─ it tends to go badly ─► $ctx.frame = heads_up (the heads-up title; asks to be heard dropped)
   └─ else ─► dear_man_prep, $ctx.personId; refused: validation once the debrief has counted a refused ask to be heard

situation  what kind of conversation is it? (DEAR MAN's four; Recover's hand-off puts *something that happened* first)
           links: I've already had the conversation → the debrief; a carried flooded reading → Settle my body first
matters    what matters most here? getting it · the relationship · my self-respect      (IE-07's ask column, one pick)
hard       what makes this hard? (barriers, up to 3, own words)
thought    do any of these thoughts show up too? (IE-12, up to 2, optional)
   ├─ I'm scared of what they'd do ─► scared: the other_person resources, safety.open, Ending (frame=careful); no plan,
   │                                  no close
   ├─ parts on ─► who: does a part of you have a stake in this? (the parts slice; partAnchor)
describe   what happened, the way a camera would see it (filtered by situation, own words)
express    how does it feel? (the mirror line for the description as a line, *Only keep what fits*; Recover's or the
           check-in's word first, never picked)
assert     what you're asking for (filtered by situation; heads_up drops asks to be heard;
           refused + address / pattern → FAST's Let go offered beside them)
   ├─ an ask with a blank ─► fill: the blank in a few words (two starters, own words)
   ├─ a carried flooded reading ─► reinforce (no sizing)
size       how hard to push on this ask? five yes · not sure · no questions (Handout 8's ask column, below)
level      the named level as the title; That fits · A bit softer · A bit firmer
reinforce  what's in it for them (up to 2)
mindful    what do you need to hear in that moment? (a thought's line first, else the barrier picked first's coaching)
phrase     the line to hold on to (filtered by that need)
confident  how you'll carry yourself (ConfidenceCue, optional)
middle     what you'd settle for (the title follows what matters most; the final level as a line)
walk       when you'd stop for today
card       the pocket card: Say it · Stay steady · If they push (one PaperCard each, Copy)
   ├─ stirred or flooded reading ─► hot: take the edge off first (breathPacer) or I'm ready → the card again
   │                                (flooded: Settle my body first, a link)
when       *When is the conversation?* today · tomorrow · this week · not sure (ask_outcome: the card opens the debrief)
           offer: Rehearse it → Cope Ahead (situationId=conversation, partId = the part picked in who)
           offer: Notice them next time, with curiosity → Notice them (IE-10, the PRD's *their side*; situationId=notice)
```

Exits: `debrief` (the first screen's link), `let_go` (FAST, `frame=let_go`), `cool_down` (flooded), `cope_ahead`
(*Rehearse it*, its `partId` read from the run as the exit is taken: `$a.part`, a runtime addition), `notice_them` (*their side*, with the person), `ending_careful`
and `safety_open` (scared), `done`. The visit names the feelings picked as emotion words (`emotionFields: express`, each
chip's `emotion` prop), as the old page did with the chips' labels.

## Content

Every option is DEAR MAN's own graph node (`PRESENTS` → `DearManSituationType`, `DearManBarrier`,
`DearManDescribeOption`, `DearManFeelingChip`, `DearManAssertOption`, `DearManReinforceOption`, `DearManAnchorNeed`,
`DearManAnchorPhrase`, `ConfidenceCue`, `DearManNegotiateOption`), read from `scripts/dear-man/content.py` at build
time. Labels are re-voiced in the skill where the graph's predate the house voice; the graph keeps its text.

## The thoughts about asking (IE-12, built 12 Nov)

After *What makes this hard?*, its own optional screen: *Do any of these thoughts show up too?* (up to two, or none).
Seven chips: five from DBT IE Handout 2a's myths (*I don't deserve it*, *Asking makes me look weak*, *If they say no,
it means I don't matter*, *My needs come last*, *If I can't fix it alone, I'm not good enough*), *I need to know
they'll say yes first* (Handout 2a's *I have to know they'll say yes*), and the PRD's own *They'd know if they cared*
(its *They should already know*, reworded to keep *should* out). The PRD's *saying no is mean* belongs to Say no
(IE-04) and waits there. Each is a `DearManBarrier` node with `kind: 'myth'` (`MYTHS` in
`scripts/dear-man/content.py`), so the old page's barrier query skips them (`kind IS NULL`); the screen never says
*myth*. It's a screen of its own, not a second field under the barriers, so *I'm scared of what they'd do* keeps its
banner right under it (Gate 2), and the scared path never reaches it.

A picked thought's line leads the anchor screen, received and hedged rather than argued (*A no can be about this ask,
on this day. It doesn't decide what you're worth.*). The graph tags each one onto the anchor need it answers: `need_permission` (deserve,
weak, last, alone), `need_different` (matter, sure; with *I can hear a no and still be okay*) and `need_matters`
(know). The skill doesn't steer the need step by those tags yet (ordering options by an overlap is a runtime change,
part 2). Three new phrases: *Needing things is human, not weak*, *A no to this ask isn't a no to me*, *Saying it clearly is
kinder than hoping they guess*. The phrase step filters by the need picked, so a thought reaches a phrase through its
need. The projection keeps them as their own list, `askThoughts`, never inside `barriers`. Parts holds each one
(`HELD`, a belief, not a protective move).

Own-word caps went down so the longest record still fits ext's 4 KB: barriers 35 → 30 characters, reinforce, middle
ground and walk-away 40 → 35.

Part 2 (not built): IE-03's past results with this person on *if they say no it means I don't matter* (*Last three
nos from them…*), the calm-time sort and the person's own counter lines (`own_counter_line`), WS1's pros and cons
after *decided not to* twice, `MythCategory` and `IMPLEMENTS → dbt_dear_man`, the need step ordered by the thoughts
picked, Check the Facts inline and `pileSort`. All land in IE-B5 (IE-03's results need its interaction history, the
sort needs `pileSort` from ER-B4, Check the Facts inline needs ER-B5's inline mini-card, the ordering needs a
`runtime:` PR); the Check the Facts and DT-10 edges stay deferred until then.

## How hard to push (IE-07, Handout 8's ask column, built 12 Nov)

After the ask (and its blank), *How firmly to ask?*: five questions, each *Yes · Not sure · No*. Can they actually give
you this (capability), does it matter a lot to you right now (priorities), is it reasonable to ask this of them (rights,
relationship and give and take in one plain question), is this a good time (timing), do you know what you want and have
the facts straight (homework). The same counting method as Say no's "no" column (R10), with the ask column's own
factors: yes counts 1, not sure half, no nothing, and the total is looked up in `tables.ask_level` (`$d.ask_level`):
*hint* (below 1: a light first mention may fit, or waiting; asking is still okay), *gentle* (from 1), *plain*, *firm*,
*firm_hold* (4.5 and up: ask firmly and keep coming back to it, which still negotiates). The level screen shows the named
level as its title (never a number; *plain* if nothing matched), and a nudge (*That fits · A bit softer · A bit firmer*)
moves it one step (`$d.ask_final`, the five fields plus the nudge); neither end offers the direction that can't move.
With someone it tends to go badly with (`heads_up`) the two firm levels read *Ask firmly once, and say it again calmly if
you need to. With them, you don't have to keep pushing.* (Handout 8: a shaky relationship is a reason to ask less hard).
The middle-ground screen bridges from the final level (`ask_middle_*`) rather than repeating it. A carried flooded
reading skips both screens (the short path).

Departures: Handout 8's ask column has about ten factors. Self-respect and the relationship are what *what matters most*
already asks; authority, long term vs short term and give and take are dropped (give and take is folded into
*reasonable*), to keep it to one phone screen. The level isn't on the pocket card or in the projection yet.

## The pocket card (`pocketCard`, Mode C)

`src/components/skillPlayer/PocketCard.tsx` over the pure `src/lib/pocketCard.ts`. Three sides, built from the run's
answers (`say`: describe, express, assert with its blank filled, reinforce; `steady`: phrase, confident; `push`:
middle, walk); an empty side is dropped. The feelings join into one sentence (*I felt hurt and unheard.*), the middle
ground and the walk-away carry small labels (*Middle ground I could live with*, *I won't accept*), and the steady card
ends with Handout 5's Mindful: *If it drifts: say the ask again, same words* and *If they attack: you don't have to
answer it. Come back to the ask.* (only when the person picked something for it). One paper card at a time with dots,
*Previous card* / *Next card* (never disabled under focus) and a live line naming the card in view; Copy puts all
three on the clipboard, or selects the whole plan where the clipboard is blocked. The quiet way on before the last
card is *Done with the cards*. It reports `seen_all` and `copied` as `card_how`. No input on the card itself.

## What it writes

The run is `ToolSession.ext.run`, own words encrypted at close as every skill's are. The projection
(`functions/src/dearMan/prepProjection.ts`, inside `PROJECTIONS['dear-man']`) writes the legacy
`DearManSession {type: 'prep', mode: 'plan', source: 'skill:dear_man_prep'}` once the run reached `card`: id = the
ToolSession's, `DETAIL` from it, `WITH_PERSON` (and `lastUsedAt`) unless the person is on the safety route. Option ids
only, in the old prep's field names (`situationType`, `priorities`, `barriers`, `describeId`, `feelings`, `assertId(s)`,
`reinforceIds`, `anchorNeedId`, `anchorId`, `confidenceCueId`, `middleGroundId`, `walkAwayId`) plus `situationPicked`,
`assertFilled`, `cardHow` and `hotChoice`; a single answer in own words is `own`, never the words. `situationType` is the
class the debrief counts a refusal by, from the ask as One message's is (an ask to be heard → address, or pattern when
it was one; a practical ask about something that happened or keeps happening → ask; else the situation picked);
`situationPicked` keeps what the person chose. The debrief finds the plan through
the `ask_outcome` card this visit booked (`DEBRIEF_PREP_QUERY`), so the person and the refusal counts carry over;
History labels it *Prep*.

## Where it departs from the old page

- **Priorities**: the old drag-to-rank of three became one pick, *what matters most* (IE-07's ask column). The middle
  ground's title follows it.
- **Anchors**: the old ranking of phrases by barrier became need → phrases (`mindful`, then `phrase`); the coaching
  for the barrier picked first is a line on the need step.
- **Band**: the old `BandGate` and P2 hand-off are replaced by the player's built-in *too much* link, *Settle my body
  first* on the first screen for a carried flooded reading (the `BandRule dear-man flooded → handoff` as a link, never
  a gate), and a `hot` step after the card for a carried stirred or flooded reading. The carried reading now also
  comes from a check-in through the player, not only Recover. No capacity question (it stays out).
- **One ask**: the old multi-select of asks with notes is one ask (one clear ask; its blank filled on the next
  screen). `assertIds` holds that one.
- **Describe**: the old text box, seeded from a chip to edit, is a chip (camera wording) or own words (60
  characters). A seeded box would keep the words and lose the option id the mirror line and the record read.
- **Scared of them**: a new barrier chip, *I'm scared of what they'd do*, ends the plan on the other-person resources
  (D4 inside the flow, as Say no's).
- **Dropped**: the relationship-type question (`relationshipType`); the scenario's typical feelings first on the
  feelings screen (the carried word comes first instead); the *you just used DEAR MAN* reveal; *See my plans*; the
  explicit *Save this plan* (the plan is saved once the card is reached, as every skill's run is); the part's anchor
  line on the summary (the parts step shows it); *with {name}* on the card.
- **Entry**: the old first screen's prep-or-debrief choice is a quiet link on the first screen.
- **Summary and AskOutcome**: replaced by the pocket card and the `when` hand-off.
- **Own words**: shorter caps than the old page (the record has to fit `ext`'s 4 KB with every field at its cap); no
  own words for the feelings (22 chips, plus the carried word) or the phrase beyond 30 characters.
- **Not yet**: the parts hurt chip from Recover's
  angry card (`dearManHurt.ts`) isn't carried; the debrief opened from the `ask_outcome` card doesn't get the part
  (`ext.er.copeAheadPartId` isn't written, so its *who showed up* stays in its general form for these plans; a C8
  amendment); History shows no anchor preview (the old prep stored the phrase's text, this one its id), and a plan
  whose ask was in own words shows no *Asking for*; the rep source for the prep isn't set.

## The hand-built page is gone (IE-B4, 12 Nov)

`DearManPrep` and the `PREP_ON_PLAYER` rollback are deleted: `src/pages/tools/DearMan.tsx` only picks the mode
(prep, `?mode=debrief`, `?mode=one`). With them went the old page's device-only resume draft
(`src/lib/dearManResume.ts`), its band gate, summary heads-up and hand-off prefill (`src/lib/dearManSafety.ts` keeps
only Recover's `withBand`), `debriefLink` / `offerLetGo` / `ASK_OUTCOME_CHIPS` (the skills carry these now),
`withAnswer` and `dearManRepSource`. An old `?resume=<sessionId>` link (a 24-hour token on one device) opens the
prep fresh. The callables `getDearManContent` and `saveDearManSession` stay deployed for open tabs of the old page;
nothing in the app calls them. Kept for ports still open: `src/lib/dearManHurt.ts` (the parts hurt chip, above)
and `src/lib/copeAhead.ts` with `CopeAheadStep` (Cope Ahead's hand-built page and the parts review use them).
The old page's source pins went with it; what they guarded on the skill is pinned in `tests/dear-man-prep.test.mjs`.

What the old page did that the skill now does too (Gate 3 on the deletion):
- **The visit's answers.** `PersonFirstSkill` folds each answer given this visit into the kept list (`withAnswer`,
  restored from the old page). Without that, *This is about someone else* after a harm answer offered the old fresh
  *Yes*, and the prep ran for someone just named as dangerous. This holds for every person-first skill.
- **No plan with someone on the safety route.** The projection writes nothing then, as `saveDearManSession` refused.
- **Scared of them.** *I'm scared of what they'd do* sets the person's `safetyRecheckAt`, as Say no and Give do, so
  the next visit asks again.
- **Flooded.** *Who might show up* (parts) is skipped on a carried flooded reading, as `showCopeAhead` did.
- **Much quieter.** A P2 reread of *much quieter* drops the carried band, so the heads-up never says it's still loud
  (R3; the player does this for every skill).
- **Old drafts.** An old `?resume=` link drops its device draft as it opens, as the old page did.

No per-step parity test against the old page (C8.5): it is deleted, and what its pins guarded that still matters is
pinned on the skill (never a lock, scared, Rehearse it, `ask_outcome`, Let go after a refusal, the carried band).
`copeReady` / `copeExt` in `src/lib/copeAhead.ts` are kept with that file (only tests read them now) for the parts
review's DEAR MAN surface until the parts port decides it.

Not carried: the *Carried over* card from Recover (the situation and feeling chips are offered instead), and Recover's
word kept as own words when no chip matches.

## Still in IE-B4

Recover drops `boundaryLocked` and `tooHot` (built 12 Nov, the second PR: [`recover-from-invalidation.md`](recover-from-invalidation.md)); IE-06 Keep it warm (built 12 Nov, [`give.md`](give.md)); IE-12's thoughts about asking (built 12 Nov, above); Let go inline (built 12 Nov, [`fast.md`](fast.md));
and DEAR MAN's hand-built page is deleted (above).
