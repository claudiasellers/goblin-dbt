# Pros & cons card (DT-10)

**Status:** built 11 Nov 2026 on the skill runtime (DT-B2; [the modules plan](dbt-modules-plan.md) §5.1). New tool
`pros-cons`, *Pros & cons card*, listed under Distress Tolerance for everyone, with the Tools intent *Make a card for
a pull that keeps coming back*. Source: `scripts/skills/pros_cons.py`. Card: `src/components/skillPlayer/ProsConsCard.tsx`
(`prosConsCard`, `prosConsReplay`). Tests: `tests/skill-pros-cons.test.mjs`. No routing rows, by design (below).

## What it is

DBT DT Handout 5, pros and cons (Linehan 2015), built for one pull while the person is steady, and handed back
to them in a hard moment. The PRD's design follows Miller & Rose (2015): a neutral four-cell list lowers
commitment in people who are torn, so the card leans on the person's own reasons to hold off. What acting on it
gives is acknowledged, not argued with ("It works fast. That's why it pulls").

Evidence: the PRD's (DT-10): expert consensus, with a Moderate caution on neutral decisional balance that shapes
the design. The app claims nothing on screen.

## The flow

| # | Step | What the person sees | PRD DT-10 |
|---|---|---|---|
| 1 | `pull` | *Which pull is this card for?* Hold to wait's six pulls, same ids (Send or say something · Check their page, or my phone · **Hurt myself** · Hit, throw or slam · Leave, run or disappear · Use, drink, binge or buy) · Say it your way (90 characters) | Step 1 |
| — | `safe` | Only after *Hurt myself*: `safety.open` first (`safetyFirst`), then *Right now, are you safe from acting on it?*; the crisis banner on every screen after | C6.5 |
| — | `heads_up` | Only with a carried flooded reading: *Your body's loud right now. This card is easier to make when things are calmer.* Settle first · Make it now. Settle → `settle`: Hold to wait (not after *Hurt myself*), First, the body | Built in calm |
| 2 | `long` | *Thinking further ahead, what are your reasons not to?* The pull's own reasons (or the general ones for own words), up to 3, or their words. Required | Step 2, own reasons first |
| 3 | `gives` | *And what does doing it give you, in the moment?* *It works fast. That's why it pulls.* Up to 2. *Hurt myself*: one line (*It does something for you in the moment. That's real, and it's why the pull is strong.*) and nothing to pick | Step 3; C6.7 |
| 4 | `cost` | *What does holding off cost you?* Feeling it for longer · No relief right now · Not knowing, for now · It takes effort. Optional | Step 4 |
| 4 | `keeps` | *And what does holding off give you?* No regret in the morning · Keeping my word to myself · Knowing I can get through it · Choosing what I do next · Keeping people's trust. Optional | Step 4 |
| 5 | `lean` | *Reading it back, which way do you lean?* Holding off · Doing it · Not sure yet. *Hurt myself* + *Doing it* → `reach` | Step 5 |
| 6 | `card` | The card on the square paper: *My reasons not to* (two, their own words first) and *And yes, it pulls because* (one pro, or *It does something for me in the moment.*). *Next* | Step 6 |
| — | `keep` | *Keep this card in Me? Hold to wait will show it next time this pull comes up.* Keep it in Me · Not this time | Saved |
| — | `end` | Its line by the lean and the keep; *Doing it* or *Not sure yet* offers Wise mind; Done | — |
| — | `reach` | Not sure or no after *Hurt myself*, or leaning towards it: the banner, *Please reach out to someone now…*, Done. No close | C6.5, S9 |

**The replay.** Kept, the card is `pros_cons` (a `ProfileFact`, many, own words encrypted), read back by the
`prosCons` slice. Hold to wait (`PROFILE_NEEDS.pause`) shows the newest card for the pull picked there on its
proceed step, between *What matters most right now?* and the moves (`prosConsReplay`, recorded as
`pros_cons_replay` only when a card showed). Own-words pulls have no chip to match, so their cards live in Me.

## What it records

`ToolSession.ext.run` (the runtime's record; the PRD's proposed `ProsConsCard` is the profile item instead, plan
D2), `urgeIds` from the pull's `urge` prop (ask-fresh), and the card read (`prosConsCard`: `read`, seconds open;
it marks the visit practiced). Close kind `none`: it's made in calm, so "how strong is it now?" asks nothing
useful; its outcome is Hold to wait's own close after a replay. The replay count is the `pros_cons_replay` record
on Hold to wait's sessions (an aggregate, never read back into a flow).

## Safety

- *Hurt myself* opens `safety.open` before anything else, then the one question; the banner stays for the visit.
  Not sure or no: straight to someone to talk to. No pro is ever listed for it (C6.7), and leaning towards doing it
  ends on someone to talk to, not a card.
- A carried flooded reading gets a heads-up and a choice; nothing locks; *This is too much right now* under every
  screen (the player). No band is asked (C6.2).
- No chip is food, drink, shopping or scrolling as a comfort, no amounts, nothing about getting stronger (C6.7).

## Runtime changes (C7)

- **Embeds get the tool's profile slices** (`EmbedProps.profile`): the same `$p.*` the conditions read, read-only.
  For an embed that shows something kept (the replay).
- **A planned exit can wait for a frame.** An exit to a built skill stays planned when it asks for a `frame` the
  skill doesn't accept yet (`build.py`, `tests/skill-contracts.test.mjs`). Ending a relationship's *Weigh it up*
  is the first: `{frame: 'stay_or_end'}`, planned until DT-10 has a stay-or-end frame. This card leans towards
  holding off, the wrong lean for deciding whether to leave a relationship that's hurting you.

## Departures from the PRD, and what waits

| PRD | Here | Why |
|---|---|---|
| Built from DT-02's most frequent urge (*Want to make a card for …?*) | The Tools intent; nothing offers it after a hold | Frequency is an aggregate over past visits, which a live flow never reads; a Today card or router can own it |
| The commitment frame and an inline builder (`dt.prosCons({frame})`, CORE-11, IE-08, ER-12 hosts) | Not built; `accepts` is `band` only | No host is ready (CORE-11 isn't built; IE-08 and ER-12 need a decision frame, not this one). Ending's link waits, planned, for that frame |
| Replay inside the hold (a 20 s replay card) | On the proceed step, as a still card | The hold is a whole-screen press; reading while pressing splits attention. Proceed is where the PRD's step 5 puts it |
| Fade: full card → one line → none | Full card every time | Needs `fade_levels` (CORE-12) |
| After a lapse: *Want to add what actually happened?* | Not built | Needs the close's *Yes* to open an edit of the kept card; after the clinician pass |
| The kit (section `pros_cons`) | Not built | DT-03, the safety batch |
| `ProsConsItem` graph nodes per urge | `SkillOption:ProsConsItem` options with `forUrges` and `cell` | The runtime's options are the graph content; the `FOR_URGE` edges make them queryable |
| A card can be edited in Me | Set aside or kept; not edited in place | No editor kind yet; make a new one |

**For the clinician pass:** reasons not to for *Hurt myself* (*There are people I want to stay well for* can
read as guilt); the replay of a self-harm card inside Hold to wait after *safe for now*; *Doing it* for other pulls
ends on Wise mind and the card, with no further check; *Leave, run or disappear* can be the wise move, and the card
leans against it.
