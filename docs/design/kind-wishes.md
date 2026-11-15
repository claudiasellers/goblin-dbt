# Kind wishes (MF-06)

**Status:** built 15 Nov 2026 on the skill runtime (MF-B8; [the modules plan](dbt-modules-plan.md) §5.3a). Tool
`kind-wishes` on the new concept `dbt_loving_kindness` (DBT Mindfulness, loving kindness), listed under Mindfulness
with the intent *Practise being kind, to someone or to me*, and on the Practice home as *Kind wishes* (`mfOrder` 7).
Source: `scripts/skills/kind_wishes.py`. Tests: `tests/skill-kind-wishes.test.mjs`. New embed: `wishOffer`
(`src/components/skillPlayer/WishOffer.tsx` over `src/lib/kindWishes.ts`). Rolling back is removing `'kind-wishes'`
from `src/lib/skillRuntime/playerTools.ts`, its entry and intent in `src/data/tools.ts`, and its `MF_SEQUENCE` row.

## What it is

PRD MF-06: a strong negative self-sense with almost no positive one, and hostility after rejection. Loving-kindness
practises warmth on purpose, without needing to feel it. A calm-time practice, two to three minutes. The rep is the
offering, never the feeling: *The wishes don't need to feel true. Offering them is the practice.* Backdraft (warmth
waking old hurt; Germer & Neff) is named plainly and held, never treated as failure.

## The flow

| Step | What the person sees | PRD MF-06 |
|---|---|---|
| `who` | *Who will you send kind wishes to?* (*Someone easy is a good place to start.*) Someone easy to like, a friend or a pet · Someone I saw today and don't know well · Me · Someone I find difficult · Everyone around me right now. A carried stirred reading lists easy and neutral (everyone around me can include someone difficult) with *With things stirred up, wishes for yourself or someone difficult can wait for a steadier day.* A carried flooded reading titles the screen *Kind wishes work best on a calmer day.* (*Your body's loud right now. Settle it first, or offer them to someone easy.*), lists someone easy only, and links My body first (First, the body) and A hand on my heart (Held), before anyone is picked | Step 1; capacity branching; not offered flooded, never a lock |
| `check` | Someone difficult: *Has this person ever threatened you, scared you or hurt you, or could they?* (*Someone annoying or hard to be around is fine to pick. Kind wishes are never owed to someone who hurts or scares you.*) No, they're hard to be around · Yes · I'm not sure | Risk: the difficult tier with abusers |
| `not_them` | Yes or not sure: *Then not this one. Your safety comes first.* The `other_person` resources, *Leaving someone who might hurt me* (Ending, `frame=careful`), and To someone easy instead · To me instead · Not today (→ `stop_safe`: *Stopping here is a real answer.*, the resources again, no rep) | Arch Map row 29: never warmth toward an unsafe person |
| `wishes` | *Pick up to three wishes for them* (for someone easy, for yourself, for everyone around you). Be safe · Be at ease · Be looked after · Rest · Be free from pain, or *My own wish*, with a line saying own words finish *May you…* (*May I…* for me; for everyone, *Leave out anyone who hurts or scares you.*) | Step 2 |
| `offer_other` / `offer_self` / `offer_all` | `wishOffer`: one wish at a time in large type (*May you be safe.* · *May I rest.* · *May everyone around me be at ease.*), each with its own ring: a tap offers it and the ring fills over 30 s, with a short buzz at its end for eyes-closed practice; the next wish waits for its own tap. The ring's name is the wish (*May you rest. Offer it*). *Move on* is always there; moving on before any wish → `skip_end` (*Not this time. The wishes will keep for another day.*, no rep). Own words that already say who (*I'm enough*, *You deserve rest*) are shown as typed. Covered by *Talk to someone now*, the ring stops where it was | Step 3 (60–120 s) |
| `came` | *What came up?* (*Any of these is fine.*) Some warmth · Nothing much · Sadness · Stirred up or angry · (for me) It felt like I don't deserve it | Step 4 |
| `backdraft` | Sadness, stirred or *I don't deserve it* (with *You don't have to deserve it. Offering is the practice, not believing it.*): *That's common. Warmth can wake old hurts. It's called backdraft, and it isn't failure.* A hand on my heart (`bodyCard` `hand_heart`, 30 s, the mug alternative) · Try someone easier (not from the easy tier) · Stop here | Step 4's backdraft close |
| `offer_again` / `came_again` | Someone easier: *Picture someone easy, and offer them the same wishes.* (the chip wishes only: own words written for me don't carry; *Be at ease* when there are none), then *What came up?* again | Step back to an easier recipient |
| `twice` | Backdraft again: *Warmth keeps stirring things up today. That happens. It's worth talking through with someone you trust. Next time, a hand on your heart first, then someone easy.* A hand on my heart (Held, `enterAt=hand`) · Talk to someone now | Two backdraft closes in a row |
| `end` | *You offered kind wishes. That's the practice.* *Next time, try your own words, or someone a little less easy.* after the easy, neutral or self tiers; *Next time, try them in your own words.* after everyone or someone difficult (after backdraft: *Next time, someone easy is a good place to begin.*; after Stop here: *You stopped when it got heavy. That's looking after yourself.*) | Celebrates reps, never feelings; the fade's next step |

*Talk to someone now* (`safety.open`) is on every screen. Close kind `none`: *What came up?* is the close, in the flow
(`noClose`). A completed visit is a `kind_wishes` rep (a new `PracticeSkill`, Preliminary, `defaultFor
['kind-wishes']`), backdraft or not. The record is the run: the tier (never a name), the wishes (own words encrypted at
close), what came up, and the backdraft answers.

**Evidence.** Preliminary. The PRD grades loving-kindness Moderate in general (Petrovic et al. 2024, 23 RCTs; Galante
et al. 2014) and Preliminary in BPD (Feliu-Soler et al. 2017), and the app's population is the second.

## Where it departs from the PRD

- **No tier progression from history.** The PRD suggests the next tier after three reps without backdraft, and keeps
  someone on easy recipients after two backdraft closes in a row across visits. The runtime reads no earlier visit, so
  all tiers are listed with *Someone easy is a good place to start.* (the PRD's own recommendation for its open
  question) and the end line suggests the next step; two backdraft closes in a row are counted within a visit (the
  second offering, to someone easier), with the talk-it-through line. The Practice card's next-tier suggestion is part 2.
- **The difficult tier asks, it doesn't read `Person.safe`.** Picking a kept person would put a name near the practice;
  instead *Has this person ever threatened you, scared you or hurt you, or could they?* is asked every time, and yes or not sure never reaches the wishes
  for them (the People seam's own answer: harm or not sure → the safety route).
- **A tap, not a hold.** Each wish's ring starts with a tap and fills hands-free over 30 s (a 30 s press three times is
  hard on hands and switches); a second tap stops it. No auto-advance between wishes.
- **No hum.** The PRD's optional hum (muted by default) waits for the Tune room's audio; the screen is silent.
- **No Witness deck** for the easy tier (not built), and **no offer from Recover's close** yet: Recover's close is the
  hand-built page, and its offers change in their own PR. The Practice home brings it in (last in the MF order, so the
  daily pick reaches it once the earlier skills have reps, close to the Arch Map's week 3).
- **Blank results** aren't detected (no signal reaches the tool); a flooded reading is.

## Part 2 (deferred)

| Item | Why it waits |
|---|---|
| Fade: own words as the default, a silent timer, the off-phone rep (*offer one wish to someone you pass today*) | The Practice home's fade levels |
| Next-tier suggestion on the Practice card; easy-only after two backdraft visits | Cross-visit reads (MF-02 part 2) |
| The hum and ambient descent | The Tune room's audio |
| Easy tier from the Witness deck; Recover's close offer | WMP / Recover PRs |
| Metrics: tier chosen, backdraft rate by tier, self-tier reps | Reflect's MF section |
