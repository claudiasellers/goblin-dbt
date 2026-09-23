# Orphaned Node Audit — 2026-05-18

Live query: `MATCH (n) WHERE NOT (n)--() RETURN labels(n)[0] AS label, count(n) AS count ORDER BY count DESC`

**Total orphaned nodes: 130 across 23 labels**

---

## Summary Table

| Label | Orphaned | Notes |
|-------|----------|-------|
| `DearManFeelingChip` | 23 | All nodes orphaned |
| `DearManDebriefOption` | 16 | All nodes orphaned |
| `DearManBodySignal` | 10 | All nodes orphaned |
| `DearManThoughtPattern` | 10 | All nodes orphaned |
| `BodySignal` | 10 | All nodes orphaned |
| `ThoughtPattern` | 10 | All nodes orphaned |
| `BodyRegion` | 8 | All nodes orphaned |
| `DearManReinforceOption` | 8 | All nodes orphaned |
| `DearManNegotiateOption` | 7 | All nodes orphaned |
| `Underneath` | 6 | All nodes orphaned |
| `CopeAhead` | 2 of 11 | Partial — 9 nodes are connected |
| `DearManAnchorPhrase` | 4 | All nodes orphaned |
| `DearManStepInsight` | 4 | All nodes orphaned |
| `SomaticQuadrantNarrative` | 4 | All nodes orphaned |
| `ClinicalConstruct` | 2 of many | `flashback`, `hypervigilance` specifically orphaned |
| `RDoCDomain` | 1 | `rdoc_sensorimotor` orphaned |
| `BrainStructure` | 1 of many | `visual_cortex` specifically orphaned |
| `ActivationPattern` | 1 of many | `grief_yearning` (phase 2) specifically orphaned |
| `SafetyFlag` | 1 of 5 | Partial — 4 nodes are connected |
| `Emotion` | 1 of many | `hostility` specifically orphaned |
| `DearManBarrierCoaching` | 1 | `coaching_default` orphaned |
| `DearManTurningPoint` | 1 of 8 | Partial — 7 nodes are connected |
| `Reflection` | 1 of 15 | Partial — 14 nodes are connected |

---

## Detailed Node Inventory

---

### `DearManFeelingChip` — 23 orphaned (all)

Emotion chip labels used in the DEAR MAN flow. Properties: `id`, `label`, `sortOrder`.

| id | label | sortOrder |
|----|-------|-----------|
| defeated | Defeated | 23 |
| drained | Drained | 19 |
| feel_angry | Angry | 5 |
| feel_anxious | Anxious | 3 |
| feel_confused | Confused | 15 |
| feel_disappointed | Disappointed | 9 |
| feel_disrespected | Disrespected | 12 |
| feel_embarrassed | Embarrassed | 11 |
| feel_exhausted | Exhausted | 17 |
| feel_frustrated | Frustrated | 2 |
| feel_helpless | Helpless | 16 |
| feel_hurt | Hurt | 1 |
| feel_invisible | Invisible | 14 |
| feel_lonely | Lonely | 6 |
| feel_overwhelmed | Overwhelmed | 7 |
| feel_resentful | Resentful | 10 |
| feel_sad | Sad | 4 |
| feel_scared | Scared | 8 |
| feel_trapped | Trapped | 18 |
| feel_unheard | Unheard | 13 |
| numb | Numb | 20 |
| shaky | Shaky | 21 |
| wound_up | Wound up | 22 |

---

### `DearManDebriefOption` — 16 orphaned (all)

Post-session debrief options. Properties: `id`, `label`, `sortOrder`, `type` (`went_well` or `to_change`).

| id | label | type | sortOrder |
|----|-------|------|-----------|
| debrief_better_time | Pick a better time | to_change | 5 |
| debrief_breathe | Take a breath when I felt overwhelmed | to_change | 8 |
| debrief_compromised | We found a compromise | went_well | 6 |
| debrief_didnt_back_down | I didn't back down | went_well | 4 |
| debrief_kept_facts | I kept it about the facts | went_well | 5 |
| debrief_less_apologizing | Not apologize so much | to_change | 6 |
| debrief_more_specific | Get more specific about what I need | to_change | 1 |
| debrief_name_feelings | Name my feelings earlier | to_change | 2 |
| debrief_no_old_stuff | Not bring up old stuff | to_change | 4 |
| debrief_no_over_apologize | I didn't apologize for having needs | went_well | 7 |
| debrief_plan_b | Have a plan B ready | to_change | 7 |
| debrief_said_it | I said what I needed to say | went_well | 2 |
| debrief_stay_with_defense | Stay with it when they got defensive | to_change | 3 |
| debrief_stayed_calm | I stayed calm | went_well | 1 |
| debrief_they_listened | They actually listened | went_well | 3 |
| debrief_used_anchor | I used my anchor phrase | went_well | 8 |

---

### `DearManBodySignal` — 10 orphaned (all)

Body signals during a DEAR MAN conversation. Properties: `id`, `label`, `sortOrder`.

| id | label | sortOrder |
|----|-------|-----------|
| body_chest | Chest got heavy or tight | 2 |
| body_hands | Hands clenched or shaky | 7 |
| body_heart | Heart racing | 6 |
| body_hot | Felt hot — face, neck, ears | 4 |
| body_nothing | I didn't notice anything | 10 |
| body_numb | Went numb or disconnected | 5 |
| body_restless | Restless — needed to move | 9 |
| body_small | Felt physically smaller | 8 |
| body_stomach | Stomach dropped or clenched | 3 |
| body_throat | Throat tightened | 1 |

---

### `DearManThoughtPattern` — 10 orphaned (all)

Thought patterns during a DEAR MAN conversation. Properties: `id`, `label`, `sortOrder`, `theme`.

| id | label | theme | sortOrder |
|----|-------|-------|-----------|
| thought_always | This always happens | hopelessness | 10 |
| thought_cant | I can't do this | overwhelm | 5 |
| thought_dont_care | They don't care anyway | hopelessness | 6 |
| thought_make_worse | I'm going to make it worse | fear | 4 |
| thought_my_fault | Maybe this is my fault | self_blame | 7 |
| thought_never_change | They'll never change | hopelessness | 3 |
| thought_not_worth | This isn't worth it | withdrawal | 1 |
| thought_too_much | I'm being too much | self_blame | 2 |
| thought_unsafe | This doesn't feel safe | fear | 9 |
| thought_wrong | I shouldn't have said anything | regret | 8 |

---

### `BodySignal` — 10 orphaned (all)

Generic body signal nodes — appear to be a non-prefixed duplicate of `DearManBodySignal`. Properties: `id`, `label`, `sortOrder`.

| id | label | sortOrder |
|----|-------|-----------|
| bs_chest_tight | Chest got tight | 1 |
| bs_face_hot | Face got hot | 3 |
| bs_hands_shaking | Hands were shaking | 4 |
| bs_heart_racing | Heart was racing | 7 |
| bs_jaw_clenched | Jaw clenched | 8 |
| bs_none | I didn't notice anything | 10 |
| bs_numb | Went numb | 6 |
| bs_shoulders_up | Shoulders went up | 9 |
| bs_stomach_drop | Stomach dropped | 2 |
| bs_throat_closed | Throat closed up | 5 |

**Note:** Near-identical semantic content to `DearManBodySignal` but with `bs_` id prefix and slightly different label phrasing. Likely a renamed/replaced version.

---

### `ThoughtPattern` — 10 orphaned (all)

Generic thought pattern nodes — appear to be a non-prefixed duplicate of `DearManThoughtPattern`. Properties: `id`, `label`, `sortOrder`, `theme`.

| id | label | theme | sortOrder |
|----|-------|-------|-----------|
| thought_cant_handle | I can't handle this | overwhelm | 5 |
| thought_dont_deserve | I don't deserve to ask | unworthiness | 6 |
| thought_my_fault | This is probably my fault | self_blame | 2 |
| thought_never_listen | They never listen | hopelessness | 3 |
| thought_not_worth | This isn't worth the fight | avoidance | 1 |
| thought_should_know | They should just know | expectation | 7 |
| thought_something_else | Something else | other | 10 |
| thought_too_much | I'm being too much | self_invalidation | 4 |
| thought_will_leave | They're going to leave | abandonment | 9 |
| thought_wrong | What if I'm wrong? | doubt | 8 |

**Note:** Slightly different content from `DearManThoughtPattern` — more themes, different phrasings. Likely the successor version that was never wired up or never had the old label cleaned up.

---

### `BodyRegion` — 8 orphaned (all)

Anatomical grouping nodes. Properties: `id`, `name`, `includes` (array of sub-regions). Introduced 2026-02-02 in commit `2a53ab2`, never had relationships defined.

| id | name | includes |
|----|------|---------|
| arms | Arms/Hands | arms, hands, fingers |
| back | Back | lower back, mid back, spine |
| chest | Chest | heart area, lungs, sternum |
| head | Head | forehead, temples, scalp, face |
| legs | Legs/Feet | legs, knees, feet, toes |
| shoulders | Shoulders | shoulders, upper back |
| stomach | Stomach/Gut | stomach, solar plexus, abdomen, gut |
| throat | Throat/Neck | throat, neck, jaw |

**Note:** Intended as anatomical groupings for `SensationType` nodes (e.g., `tension LOCATED_IN chest`). Relationships never written in any schema file.

---

### `DearManReinforceOption` — 8 orphaned (all)

Reinforce-step options for the DEAR MAN flow. Properties: `id`, `label`, `sortOrder`.

| id | label | sortOrder |
|----|-------|-----------|
| reinf_closer | We'd actually be closer | 7 |
| reinf_less_fighting | We'd fight less about this | 1 |
| reinf_less_pressure | It would take pressure off both of us | 5 |
| reinf_less_resentment | I wouldn't be resentful | 8 |
| reinf_more_relaxed | Our time together would be more relaxed | 2 |
| reinf_more_respected | We'd both feel more respected | 4 |
| reinf_more_trust | I'd be able to trust them more | 6 |
| reinf_stop_bringing_up | I'd stop bringing it up | 3 |

---

### `DearManNegotiateOption` — 7 orphaned (all)

Negotiate-step options. Properties: `id`, `label`, `sortOrder`, `type` (`walk_away` or `middle_ground`).

| id | label | type | sortOrder |
|----|-------|------|-----------|
| neg_feelings_dismissed | Being told my feelings don't matter | walk_away | 1 |
| neg_give_up_ask | Giving up on the ask entirely | walk_away | 4 |
| neg_no_change | Having the same thing happen again with no change | walk_away | 3 |
| neg_partial | They do part of it — not everything | middle_ground | 1 |
| neg_third_option | We find a third option together | middle_ground | 3 |
| neg_trial | They try for a set period and we check back in | middle_ground | 2 |
| neg_yelled_at | Being yelled at or shut down | walk_away | 2 |

---

### `Underneath` — 6 orphaned (all)

Underlying emotional drivers beneath the surface emotion. Properties: `id`, `label`, `sortOrder`.

| id | label | sortOrder |
|----|-------|-----------|
| under_fear_rejection | Fear of rejection | 1 |
| under_grief | Grief — for how it should be | 3 |
| under_loneliness | Loneliness | 5 |
| under_not_sure | I'm not sure | 6 |
| under_powerlessness | Powerlessness | 4 |
| under_shame | Shame | 2 |

---

### `DearManAnchorPhrase` — 4 orphaned (all)

Grounding anchor phrases for DEAR MAN sessions. Properties: `id`, `label`, `sortOrder`.

| id | label | sortOrder |
|----|-------|-----------|
| anchor_allowed | I'm allowed to want this | 4 |
| anchor_needs_valid | My needs are valid | 1 |
| anchor_stay_with | I can stay with this | 2 |
| anchor_worth_saying | This is worth saying | 3 |

---

### `DearManStepInsight` — 4 orphaned (all)

Educational insight text per DEAR MAN step. Properties: `id`, `step`, `text`.

| id | step | text |
|----|------|------|
| insight_assert | assert | Specific asks are easier to say yes to. 'Text me if you'll be late' beats 'be more considerate.' |
| insight_describe | describe | Facts are harder to argue with than judgments. 'You raised your voice' lands differently than 'you were being rude.' |
| insight_express | express | Naming feelings isn't weakness — it's what makes the other person understand this matters to you. |
| insight_reinforce | reinforce | This is the step most people skip. It's what makes the other person want to listen instead of defend. |

---

### `SomaticQuadrantNarrative` — 4 orphaned (all)

Psychoeducational narrative text per valence/arousal quadrant. Properties: `id`, `narrative`.

| id | narrative (truncated) |
|----|----------------------|
| high-pleasant | "Positive arousal has a body signature too — most people just never learn theirs because they only pay attention to what hurts…" |
| high-unpleasant | "Your body registers stress before your prefrontal cortex has time to appraise the situation — the amygdala is faster…" |
| low-pleasant | "This is what your nervous system feels like when it's in ventral vagal mode — regulated, safe, present…" |
| low-unpleasant | "Low-arousal difficult states don't set off alarms — they're more like a slow leak…" |

---

### `ClinicalConstruct` — 2 orphaned (of many)

Two symptom-level constructs with no graph connections. Properties: `id`, `name`, `description`, `construct_type`.

| id | name | construct_type | description |
|----|------|----------------|-------------|
| flashback | Flashback | symptom | Vivid re-experiencing of traumatic event as if happening now |
| hypervigilance | Hypervigilance | symptom | Heightened state of sensory sensitivity and scanning for threat |

---

### `CopeAhead` — 2 orphaned (of 11 total)

Cope-ahead strategies for DEAR MAN. 9 of 11 are connected. The 2 orphans are not identified by id in this query — requires a follow-up query with the `WHERE NOT (n)--()` filter to identify which two.

All 11 nodes:

| id | label | isUniversal |
|----|-------|-------------|
| ca_apology_check | Add an apology checkpoint | false |
| ca_body_anchor | Anchor in your body first | true |
| ca_broken_record | Use the broken record technique | false |
| ca_name_the_dynamic | Name what's happening | false |
| ca_pause_phrase | Have a pause phrase ready | true |
| ca_planned_exit | Plan your exit line in advance | false |
| ca_success_anchor | Anchor to what worked this time | false |
| ca_tears_plan | Make a tears-are-okay plan | false |
| ca_time_limit | Set a time limit for the conversation | false |
| ca_validate_first | Lead with validation | false |
| ca_write_it_down | Write your key points down | false |

---

### `RDoCDomain` — 1 orphaned

| id | name | description | constructs |
|----|------|-------------|------------|
| rdoc_sensorimotor | Sensorimotor Systems | Systems responsible for motor behavior control | Motor Actions, Agency and Ownership |

---

### `BrainStructure` — 1 orphaned (of many)

| id | name | level | description |
|----|------|-------|-------------|
| visual_cortex | Visual Cortex | cortical | Occipital cortex; visual processing; involved in mental imagery of critical observers (shame) |

---

### `ActivationPattern` — 1 orphaned (of many)

| id | userFacingLabel | phaseRelease | evidenceGrade |
|----|-----------------|--------------|---------------|
| grief_yearning | Your attachment system is reaching for who is gone | phase_2 | Moderate |

**Note:** Phase 2 pattern — intentionally deferred, but was created in the graph without any brain structure or tool relationships. `clinicalNotes`: "NAc findings specific to PROLONGED/COMPLICATED grief. Do not generalize to all grief."

---

### `SafetyFlag` — 1 orphaned (of 5 total)

4 of 5 SafetyFlag nodes are connected. The orphan is not identified by id here — requires follow-up query.

All 5 nodes:

| id | type | trigger | action |
|----|------|---------|--------|
| crisis_suicidal | crisis | Suicidal ideation in any pattern | Immediate cessation of tool recommendation; present safety resources |
| crisis_self_harm | crisis | Self-harm urges + 'out of control' | Safety anchor (crisis line, emergency contact) BEFORE any tool |
| clinical_referral_shutdown | clinical_referral | Persistent shutdown (7+ consecutive days of numb/empty) | Flag potential chronic dysfunction; recommend professional evaluation |
| clinical_referral_psychosis | clinical_referral | Psychotic symptoms (hallucinations, delusions) | Acknowledge experience without validating; offer referral |
| clinical_referral_severe_dissociation | clinical_referral | Severe dissociation (user cannot orient to present) | Gentle grounding only; redirect to professional support |

---

### `Emotion` — 1 orphaned (of many)

| id | name | valence | arousal | quadrant |
|----|------|---------|---------|----------|
| hostility | Hostility | negative | high | high-unpleasant |

---

### `DearManBarrierCoaching` — 1 orphaned (all)

| id | title | isDefault | body |
|----|-------|-----------|------|
| coaching_default | Staying present | true | The hardest part of any conversation is staying with it when it gets uncomfortable. If your mind starts racing or shutting down, come back to your anchor phrase. |

---

### `DearManTurningPoint` — 1 orphaned (of 8 total)

7 of 8 nodes are connected. The 1 orphan is unidentified — requires follow-up query.

All 8 nodes:

| id | label | sortOrder |
|----|-------|-----------|
| tp_defensive | When they got defensive or angry | 1 |
| tp_apologized | When I started apologizing or backing down | 2 |
| tp_old_stuff | When old stuff got brought up | 3 |
| tp_no_words | When I couldn't find the words | 4 |
| tp_crying_shutdown | When I started crying or shutting down | 5 |
| tp_dismissed | When they dismissed what I was saying | 6 |
| tp_never_started | It never really got off the ground | 7 |
| tp_went_okay | Honestly it went okay — I just want to process | 8 |

---

### `Reflection` — 1 orphaned (of 15 total)

14 of 15 nodes are connected. The 1 orphan is unidentified — requires follow-up query.

All 15 nodes:

| id | isDefault |
|----|-----------|
| ref_defensive_froze | false |
| ref_defensive_loud | false |
| ref_defensive_quiet | false |
| ref_crying_froze | false |
| ref_crying_cried | false |
| ref_apologized_agreed | false |
| ref_apologized_quiet | false |
| ref_nowords_froze | false |
| ref_nowords_changed | false |
| ref_gavein_agreed | false |
| ref_gavein_left | false |
| ref_escalated_loud | false |
| ref_escalated_left | false |
| ref_okay_stayed | false |
| ref_default | true |

---

## Follow-up Queries Needed

For labels with partial orphans, run these to identify the specific disconnected nodes:

```cypher
-- CopeAhead (2 of 11 orphaned)
MATCH (n:CopeAhead) WHERE NOT (n)--() RETURN n.id, n.label

-- SafetyFlag (1 of 5 orphaned)
MATCH (n:SafetyFlag) WHERE NOT (n)--() RETURN n.id, n.type, n.trigger

-- DearManTurningPoint (1 of 8 orphaned)
MATCH (n:DearManTurningPoint) WHERE NOT (n)--() RETURN n.id, n.label

-- Reflection (1 of 15 orphaned)
MATCH (n:Reflection) WHERE NOT (n)--() RETURN n.id, n.isDefault
```
