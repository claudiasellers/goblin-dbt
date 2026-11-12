# DEAR MAN's prep on the skill runtime (IE-B4, first PR)

Built 12 Nov 2026. PRD: `prd-interpersonal-effectiveness.md`, IE-01 Mode B (the full plan) and Mode C (the pocket card);
DBT IE Handouts 4, 5 and 5a (Handout 8's intensity sizing isn't in it yet: see below). Plan rows: IE-01, IE-07 and IE-B4 in [`dbt-modules-plan.md`](dbt-modules-plan.md), D11
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
   ├─ I'm scared of what they'd do ─► scared: the other_person resources, safety.open, Ending (frame=careful); no plan,
   │                                  no close
   ├─ parts on ─► who: does a part of you have a stake in this? (the parts slice; partAnchor)
describe   what happened, the way a camera would see it (filtered by situation, own words)
express    how does it feel? (the mirror line for the description as a line, *Only keep what fits*; Recover's or the
           check-in's word first, never picked)
assert     what you're asking for (filtered by situation; heads_up drops asks to be heard;
           refused + address / pattern → FAST's Let go offered beside them)
   ├─ an ask with a blank ─► fill: the blank in a few words (two starters, own words)
reinforce  what's in it for them (up to 2)
mindful    what do you need to hear in that moment? (the coaching for the barrier picked first, as a line)
phrase     the line to hold on to (filtered by that need)
confident  how you'll carry yourself (ConfidenceCue, optional)
middle     what you'd settle for (the title follows what matters most)
walk       when you'd stop for today
card       the pocket card: Say it · Stay steady · If they push (one PaperCard each, Copy)
   ├─ stirred or flooded reading ─► hot: take the edge off first (breathPacer) or I'm ready → the card again
   │                                (flooded: Settle my body first, a link)
when       *When is the conversation?* today · tomorrow · this week · not sure (ask_outcome: the card opens the debrief)
           offer: Rehearse it → Cope Ahead (situationId=conversation, partId = the part picked in who)
```

Exits: `debrief` (the first screen's link), `let_go` (FAST, `frame=let_go`), `cool_down` (flooded), `cope_ahead`
(*Rehearse it*, its `partId` read from the run as the exit is taken: `$a.part`, a runtime addition), `ending_careful`
and `safety_open` (scared), `done`. The visit names the feelings picked as emotion words (`emotionFields: express`, each
chip's `emotion` prop), as the old page did with the chips' labels.

## Content

Every option is DEAR MAN's own graph node (`PRESENTS` → `DearManSituationType`, `DearManBarrier`,
`DearManDescribeOption`, `DearManFeelingChip`, `DearManAssertOption`, `DearManReinforceOption`, `DearManAnchorNeed`,
`DearManAnchorPhrase`, `ConfidenceCue`, `DearManNegotiateOption`), read from `scripts/dear-man/content.py` at build
time. Labels are re-voiced in the skill where the graph's predate the house voice; the graph keeps its text.

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
- **Not yet**: Handout 8's intensity sizing for the ask (Say no has the "no" column); the parts hurt chip from Recover's
  angry card (`dearManHurt.ts`) isn't carried; the debrief opened from the `ask_outcome` card doesn't get the part
  (`ext.er.copeAheadPartId` isn't written, so its *who showed up* stays in its general form for these plans; a C8
  amendment); History shows no anchor preview (the old prep stored the phrase's text, this one its id), and a plan
  whose ask was in own words shows no *Asking for*; device-only `?resume=<sessionId>` drafts still open the old page
  until their tokens age out; the rep source for the prep isn't set; per-step parity tests against the old page
  (C8.5): the old page's own tests stay with it until it's deleted.

## Rolling back

`PREP_ON_PLAYER` in `src/lib/dearManPrep.ts` (false → the hand-built `DearManPrep` again, unchanged). The skill's
content and projection stay; with the flag off nothing opens the skill.

## Still in IE-B4

Recover drops `boundaryLocked` and `tooHot` (built 12 Nov, the second PR: [`recover-from-invalidation.md`](recover-from-invalidation.md)); IE-06 Keep it warm; IE-12's myths into the barrier step; Let go inline;
then DEAR MAN's hand-built page can be deleted.
