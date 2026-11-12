# Check-in routing review (Oct 2026, rf-v2)

What the check-in result recommends once `RoutingPolicy` is switched on, after Claudia's review of the
55-row table and the 85 word links (5 Oct 2026). Source: `scripts/recommendations/content.py`
(rows) and `vocabulary.py` (each word's pattern). **Switched on 5 Oct 2026** (Claudia: "switch it on for
now we can always come back to it"): every active row and every word's pattern is signed off; the
planned rows stay drafts until their tool ships. Switched off, the check-in routes as it did before.

## Decisions

1. **Missing tools stay in the routing.** Where the review named a tool the app doesn't have yet, its
   row is written now, switched off, at the place the review gave it (`PLANNED`: Check the Facts, Cope
   Ahead, Running low / PLEASE, ACCEPTS, Radical Acceptance, Wise Mind, FAST, GIVE). Until a module ships,
   the word gets the closest existing tool (Check the Facts → Do the Opposite, whose fits-the-facts step
   is the nearest thing; otherwise the review's next pick, otherwise the pattern's own). Shipping a module:
   give its concept an `appToolId`, drop it from `PLANNED`, rebuild, load. The routing is what the
   modules get built around.
2. **The square's side is the boundary.** Where the dot goes decides which patterns are possible; a
   word's reviewed pattern is always on its own side. Where the review crossed sides, the closest pattern
   on the word's side is used and the review's tool comes through a word rule. Distant and Withdrawn are
   on the high side already: freeze with high arousal underneath, so Alarm (orient first, then Cool Down).
3. **Anger has its own pattern; one word never raises the crisis banner.** The anger words signal Ready
   to fight (`reactive_aggression`, a candidate only while the policy is on, no crisis flag): Pause, then
   Cool Down. Intense exercise lowers arousal; it isn't framed as a release. Overwhelmed and Out of control
   stay on Alarm (Pause, Cool Down). No word signals Flooded.
4. **Spiraling is the doorway to Flooded.** The answer "Everything hitting at once" is now **"I'm
   spiraling and can't stop it"** (strong evidence for Flooded, as before). "Shaking, crying, or
   overwhelmed" is now **"Shaking or crying, can't stop"**, a moderate signal for Flooded and Alarm alike:
   with spiraling it reaches Flooded, alone it doesn't. The crisis banner never blocks a tool; it sits
   above the normal result.
5. **No capacity split.** Nothing sets "steady" since the capacity question went, so each pattern has
   one row set for every band but flooded, with the thinking tools no longer held back. Flooded rows are
   as approved: body / orient only.
6. **A hurt word puts Recover first everywhere but Flooded** (R7). Flooded stays body first.

## How it works

- **Pattern:** each unpleasant grid word has one reviewed pattern,
  `(:Emotion)-[:SIGNALS]->(:ActivationPattern)`, which is its only match in scoring while the policy is
  on (a strong edge). The discriminating answers still outweigh a word.
- **Tools:** the pattern's rows, plus per-word rules (`emotionGate: "words"`, ranked above the
  pattern's own rows), the R7 hurt-word gate and the R9 nothing-named gate; then the hard filters
  (flooded: body / orient; blank: nothing calming; contraindications) and the diversity rule (one
  suggestion plus one of a different kind, never two change tools).
- **Safety additions:** Do the Opposite is `CONTRAINDICATED_FOR` Disconnected, primary or alongside;
  Alarm keeps 5-4-3-2-1 as a backup row, so alarm with dissociation alongside gets 5-4-3-2-1 alone.

## Where the build differs from the sheet

- **Hurt, Abandoned** (low side): On replay, Recover first (the sheet had Alarm / Social threat).
- **Bad, Sad, Depressed, Lonely, Isolated** (low side): Low drive, Do the Opposite as "get active" (the
  sheet had Alarm / Social threat for Bad, Lonely, Isolated); GIVE is the planned alternative for Lonely
  and Isolated.
- **Weak, Worthless** (high side): Social threat, Recover then Do the Opposite. On the wheel they sit under
  worthless / insignificant (shame), not fatigue; the sheet had Low drive / PLEASE.
- **Helpless** (high side): On guard, Problem Solve (Radical Acceptance planned). The sheet's Low drive is
  on the other side.
- **Ridiculed**: Social threat with Recover (the sheet had the generic Alarm / Check the Facts note).
- **Embarrassed, Ashamed** (low side): On replay, Recover then Do the Opposite. The sheet's Cool Down
  isn't used on the low side: the person marked low energy, and Cool Down brings it down further.
- **Humiliated**: Recover first (a wound word, R7), the review's Cool Down second.
- **Nervous**: kept with Anxious (On guard). The Google Sheet's dive-reflex note landed on Nervous's row
  by mistake; it belongs to Exposed.
- **Low drive** never shows 5-4-3-2-1 (the review: not for vegetative states); its words get one card
  (Do the Opposite) and the guided Micro win until Running low ships. *(12 Nov: Running low leads Low drive, Do the Opposite the swap.)*
- **Numb** with the "numb or disconnected" answer now lands on Shut down with Disconnected alongside
  (the graph's freeze + dissociation co-occurrence), so 5-4-3-2-1 alone; it was Disconnected.

## Every word, one-word check-in

| Word | Energy | Pattern | With the routing on | Today |
|---|---|---|---|---|
| Fearful | More | Alarm | Cool Down, Do the Opposite | Cool Down, Do the Opposite |
| Scared | More | Alarm | Cool Down, Do the Opposite | Cool Down, Do the Opposite |
| Anxious | More | On guard | Do the Opposite, 5-4-3-2-1 | Cool Down, Do the Opposite |
| Insecure | More | Social threat | Recover, Do the Opposite | Cool Down, Do the Opposite |
| Weak | More | Social threat | Recover, Do the Opposite | Cool Down, Do the Opposite |
| Rejected | More | Social threat | Recover, Do the Opposite | Cool Down, Do the Opposite |
| Helpless | More | On guard | Problem Solve, 5-4-3-2-1 | Cool Down, Do the Opposite |
| Frightened | More | Alarm | Cool Down, Do the Opposite | Cool Down, Do the Opposite |
| Worried | More | On guard | Do the Opposite, 5-4-3-2-1 | Cool Down, Do the Opposite |
| Overwhelmed | More | Alarm | Pause, Cool Down | Cool Down, Do the Opposite |
| Inadequate | More | Social threat | Recover, Do the Opposite | Cool Down, Do the Opposite |
| Inferior | More | Social threat | Recover, Do the Opposite | Cool Down, Do the Opposite |
| Worthless | More | Social threat | Recover, Do the Opposite | Cool Down, Do the Opposite |
| Insignificant | More | Social threat | Recover, Do the Opposite | Cool Down, Do the Opposite |
| Excluded | More | Social threat | Recover, Do the Opposite | Cool Down, Do the Opposite |
| Persecuted | More | On guard | Do the Opposite, 5-4-3-2-1 | Cool Down, Do the Opposite |
| Nervous | More | On guard | Do the Opposite, 5-4-3-2-1 | Cool Down, Do the Opposite |
| Exposed | More | Social threat | Cool Down, Recover | Cool Down, Do the Opposite |
| Angry | More | Ready to fight | Pause, Cool Down | Cool Down, Do the Opposite |
| Threatened | More | Alarm | Cool Down, Do the Opposite | Cool Down, Do the Opposite |
| Let down | More | Social threat | Recover, Do the Opposite | Cool Down, Do the Opposite |
| Humiliated | More | Social threat | Recover, Cool Down | Cool Down, Do the Opposite |
| Bitter | More | Ready to fight | Do the Opposite, Pause | Cool Down, Do the Opposite |
| Mad | More | Ready to fight | Pause, Cool Down | Cool Down, Do the Opposite |
| Aggressive | More | Ready to fight | Pause, Cool Down | Cool Down, Do the Opposite |
| Frustrated | More | Alarm | Problem Solve, Cool Down | Cool Down, Do the Opposite |
| Distant | More | Alarm | 5-4-3-2-1, Cool Down | Cool Down, Do the Opposite |
| Critical | More | On guard | Do the Opposite, 5-4-3-2-1 | Cool Down, Do the Opposite |
| Betrayed | More | Social threat | Recover, Do the Opposite | Cool Down, Do the Opposite |
| Resentful | More | Ready to fight | Do the Opposite, Pause | Cool Down, Do the Opposite |
| Disrespected | More | Social threat | Recover, Do the Opposite | Cool Down, Do the Opposite |
| Ridiculed | More | Social threat | Recover, Do the Opposite | Cool Down, Do the Opposite |
| Indignant | More | Ready to fight | Pause, Cool Down | Cool Down, Do the Opposite |
| Violated | More | Social threat | Recover, Do the Opposite | Cool Down, Do the Opposite |
| Furious | More | Ready to fight | Pause, Cool Down | Cool Down, Do the Opposite |
| Jealous | More | On guard | Do the Opposite, 5-4-3-2-1 | Cool Down, Do the Opposite |
| Provoked | More | Ready to fight | Pause, Cool Down | Cool Down, Do the Opposite |
| Hostile | More | Ready to fight | Pause, Cool Down | Cool Down, Do the Opposite |
| Infuriated | More | Ready to fight | Pause, Cool Down | Cool Down, Do the Opposite |
| Annoyed | More | Alarm | Do the Opposite, Cool Down | Cool Down, Do the Opposite |
| Withdrawn | More | Alarm | 5-4-3-2-1, Cool Down | Cool Down, Do the Opposite |
| Skeptical | More | On guard | Do the Opposite, 5-4-3-2-1 | Cool Down, Do the Opposite |
| Dismissive | More | On guard | Do the Opposite, 5-4-3-2-1 | Cool Down, Do the Opposite |
| Stressed | More | Alarm | Problem Solve, Cool Down | Cool Down, Do the Opposite |
| Busy | More | Alarm | Problem Solve, Cool Down | Cool Down, Do the Opposite |
| Rushed | More | Alarm | Problem Solve, Cool Down | Cool Down, Do the Opposite |
| Pressured | More | Alarm | Problem Solve, Cool Down | Cool Down, Do the Opposite |
| Out of control | More | Alarm | Pause, Cool Down | Cool Down, Do the Opposite |
| Bad | Less | Low drive | Do the Opposite | Do the Opposite |
| Tired | Less | Low drive | Do the Opposite | Do the Opposite |
| Bored | Less | Low drive | Do the Opposite | Do the Opposite |
| Sleepy | Less | Low drive | Do the Opposite | Do the Opposite |
| Unfocused | Less | Low drive | Do the Opposite | Do the Opposite |
| Apathetic | Less | Low drive | Do the Opposite | Do the Opposite |
| Indifferent | Less | Low drive | Do the Opposite | Do the Opposite |
| Disgusted | Less | On replay | Do the Opposite, 5-4-3-2-1 | Do the Opposite |
| Disapproving | Less | On replay | Do the Opposite, 5-4-3-2-1 | Do the Opposite |
| Disappointed | Less | On replay | Do the Opposite, 5-4-3-2-1 | Do the Opposite |
| Awful | Less | On replay | Do the Opposite, 5-4-3-2-1 | Do the Opposite |
| Repelled | Less | On replay | Do the Opposite, 5-4-3-2-1 | Do the Opposite |
| Judgmental | Less | On replay | Do the Opposite, 5-4-3-2-1 | Do the Opposite |
| Embarrassed | Less | On replay | Recover, Do the Opposite | Do the Opposite |
| Appalled | Less | On replay | Do the Opposite, 5-4-3-2-1 | Do the Opposite |
| Revolted | Less | On replay | Do the Opposite, 5-4-3-2-1 | Do the Opposite |
| Nauseated | Less | On replay | Do the Opposite, 5-4-3-2-1 | Do the Opposite |
| Detestable | Less | On replay | Do the Opposite, 5-4-3-2-1 | Do the Opposite |
| Horrified | Less | On replay | Do the Opposite, 5-4-3-2-1 | Do the Opposite |
| Hesitant | Less | On replay | Do the Opposite, 5-4-3-2-1 | Do the Opposite |
| Sad | Less | Low drive | Do the Opposite | Do the Opposite |
| Lonely | Less | Low drive | Do the Opposite | Do the Opposite |
| Vulnerable | Less | Low drive | Problem Solve | Do the Opposite |
| Despair | Less | Shut down | 5-4-3-2-1, Do the Opposite (once moved) | Do the Opposite |
| Guilty | Less | On replay | Do the Opposite, 5-4-3-2-1 | Do the Opposite |
| Depressed | Less | Low drive | Do the Opposite | Do the Opposite |
| Hurt | Less | On replay | Recover, Problem Solve | Do the Opposite |
| Isolated | Less | Low drive | Do the Opposite | Do the Opposite |
| Abandoned | Less | On replay | Recover, Problem Solve | Do the Opposite |
| Victimized | Less | On replay | Recover, Problem Solve | Do the Opposite |
| Fragile | Less | Low drive | Problem Solve | Do the Opposite |
| Grief | Less | Shut down | 5-4-3-2-1, Do the Opposite (once moved) | Do the Opposite |
| Powerless | Less | Low drive | Problem Solve | Do the Opposite |
| Ashamed | Less | On replay | Recover, Do the Opposite | Do the Opposite |
| Remorseful | Less | On replay | Do the Opposite, 5-4-3-2-1 | Do the Opposite |
| Empty | Less | Shut down | 5-4-3-2-1, Do the Opposite (once moved) | Do the Opposite |
| Numb | Less | Shut down | 5-4-3-2-1, Do the Opposite (once moved) | Do the Opposite |

## To go live (done 5 Oct 2026)

1. Sign off: row ids into `content.py` `SIGNED_OFF`, words into `vocabulary.py` `SIGNED_OFF`, and
   `SIGNED_OFF["checkin_result"]` for the policy; set `POLICY["enabled"] = True`; rebuild
   (`build.py`, `fixture.py`).
2. `node scripts/load-graph.mjs --only discriminating-questions` and
   `node scripts/load-graph.mjs --only recommended-for --verify`, after the functions deploy that reads
   `SIGNALS` and `words`. Rollback: `enabled` back to False and reload.

To revisit a row later: take its id out of `SIGNED_OFF` and change it (or switch the policy off while
you do; `build.py` won't build an enabled policy with an active draft), rebuild, reload `recommended-for`.

## Addendum, 12 Nov 2026: reviewed pairs fill the second card

Some rows written as "beside X" never showed: the swap rule (a different skill kind, never two change skills)
dropped them. Check the Facts on *anxious* / *nervous* beside Cope Ahead (this review's own reasoning: rehearse,
then test the prediction) and Say no on *pressured* beside Problem Solve (signed off 12 Nov, after this review) are
two. A word rule can now name the leads it sits `beside` (`scripts/recommendations/content.py`,
`RECOMMENDED_FOR.beside`, both ways round for the anxious pair); when one of them is the first card, `select.ts` lets
that tool fill the swap past both checks.

- Only on a plain result. A blank result or a co-occurring pattern keeps the rule, so Alarm with dissociation
  alongside still gets 5-4-3-2-1 as its second card, and On guard with rumination alongside never gets two thinking
  skills.
- Every other row keeps the rule, so a fallback row written "until X ships" never becomes a second change card.
- The hard filters (Flooded → body / orient only, blank, contraindications) apply to every row, and `build.py`
  refuses `beside` on anything but a word rule, on a flooded band, or naming an unknown tool.
- What changes in the one-word table above (October's snapshot, left as it was): *Anxious* and *Nervous* show Cope
  Ahead, Check the Facts (Cope Ahead had already replaced Do the Opposite when it went live); *Pressured* shows Problem
  Solve, Say no, so Cool Down leaves that result and stays one tap away through *That feels like too much*.
- FAST got there another way (#90: its own skill kind, `values`). DEAR MAN on *let down* / *left out* sits beside
  Recover the same way (One message, `beside: ["recovering-from-invalidation"]`).
