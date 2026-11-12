# Editable source for schema/recommended-for.cypher (plan E4-2): what the check-in result recommends,
# by activation pattern × capacity band. Regenerate with build.py after editing:
#
#   python3 scripts/recommendations/build.py > /tmp/rf.cypher && mv /tmp/rf.cypher schema/recommended-for.cypher
#   python3 scripts/recommendations/fixture.py
#
# REVIEW (D-02, D-13): every row, tag and the policy are DRAFTS (reviewStatus "draft") for Claudia's
# clinical sign-off. rf-v2 is her routing review (Oct 2026, docs/design/checkin-routing-review.md):
#   - no capacity split: one row set per pattern for every band but flooded (nothing sets "steady"
#     since the capacity question went), with the thinking tools no longer held back; flooded as approved;
#   - a hurt word puts Recover first on every pattern but Flooded (R7 everywhere);
#   - per-word rules (WORD_RULES, gate "words") carry the review's per-word first pick / alternative;
#   - tools the review named that aren't built yet (PLANNED) are written switched off where they go;
#   - Ready to fight (reactive_aggression) is a check-in candidate while the policy is on: the anger words;
#   - flooded + blank → no Cool Down (the engine drops `down` tools for blank states; no row needed);
#   - Pause active (A0-2 fixed its copy); Urge Surfing rows ship active: False until DT-05 rebuilds it;
#   - DEAR MAN has no rows until IE-01's "is it safe with them?" question ships (safety batch, R9);
#   - Do the Opposite is contraindicated for dissociation, primary or alongside (ER-06).
# D-13: Find the feeling is `acceptance`; Cool Down is `both`.
#
# The engine (functions/src/recommendation/select.ts, E4-3) reads these only when
# POLICY["enabled"] is True. To switch it on after review: add the reviewed row ids to SIGNED_OFF,
# set POLICY["enabled"] = True, build, `node scripts/load-graph.mjs --only recommended-for`.
# build.py refuses to enable the policy while any active row is still a draft.
# Rollback without a deploy: set enabled back to False here and reload (or SET it in Workspace,
# then commit the same change here so the next load doesn't undo it).
#
# `rationale` strings are clinician-facing (never shown to users).

VERSION = "rf-v2"  # rf-v2: Oct 2026 routing review (no capacity bands, word rules, planned tools)
# Earlier versions whose rows a load removes whole (their ids changed).
RETIRED_VERSIONS = ["rf-v1"]
# Sign-off: add a row id (or the policy id "checkin_result") with its review date; that row is then
# `reviewStatus: "approved"`, everything else stays "draft".
# Claudia, 5 Oct 2026: "switch it on for now we can always come back to it" (after the round-2 sheet,
# Check-in routing round 2.xlsx). Every ACTIVE row plus the policy; planned (inactive) rows stay drafts
# until their tool ships and they're reviewed. To revisit a row: take it out of here and either
# fix it or set POLICY["enabled"] back to False (build.py won't enable with a draft active row).
SIGNED_OFF = {
    "checkin_result": "2026-10-05",
    # Claudia, 12 Nov 2026: default to connected, so built tools' rows go live (Cope Ahead, Check the Facts).
    "rf_acute_alarm_words_annoyed_check-the-facts": "2026-11-12",
    "rf_chronic_vigilance_words_anticipatory_cope-ahead": "2026-11-12",
    "rf_chronic_vigilance_words_anticipatory_check-the-facts": "2026-11-12",
    "rf_chronic_vigilance_words_worry_check-the-facts": "2026-11-12",
    "rf_social_threat_shame_words_self-worth_check-the-facts": "2026-11-12",
    "rf_reactive_aggression_words_grievance_check-the-facts": "2026-11-12",
    "rf_rumination_loop_words_guilt_check-the-facts": "2026-11-12",
    # Same rule (12 Nov): FAST and Wise mind.
    "rf_social_threat_shame_words_self-respect_fast": "2026-11-12",
    "rf_reactive_aggression_words_grievance_fast": "2026-11-12",
    "rf_chronic_vigilance_words_watchful_wise-mind": "2026-11-12",
    "rf_acute_alarm_backup_five-senses": "2026-10-05",
    "rf_acute_alarm_default_cool-down": "2026-10-05",
    "rf_acute_alarm_default_opposite-action": "2026-10-05",
    "rf_acute_alarm_flooded_cool-down": "2026-10-05",
    "rf_acute_alarm_flooded_five-senses": "2026-10-05",
    "rf_chronic_vigilance_default_five-senses": "2026-10-05",
    "rf_chronic_vigilance_default_problem-solve": "2026-10-05",
    "rf_chronic_vigilance_flooded_cool-down": "2026-10-05",
    "rf_chronic_vigilance_flooded_five-senses": "2026-10-05",
    "rf_emotional_flooding_flooded_cool-down": "2026-10-05",
    "rf_emotional_flooding_flooded_five-senses": "2026-10-05",
    "rf_social_threat_shame_default_recovering-from-invalidation": "2026-10-05",
    "rf_social_threat_shame_default_opposite-action": "2026-10-05",
    "rf_social_threat_shame_flooded_cool-down": "2026-10-05",
    "rf_social_threat_shame_flooded_five-senses": "2026-10-05",
    "rf_reactive_aggression_default_pause": "2026-10-05",
    "rf_reactive_aggression_default_cool-down": "2026-10-05",
    "rf_reactive_aggression_flooded_cool-down": "2026-10-05",
    "rf_reactive_aggression_flooded_five-senses": "2026-10-05",
    "rf_rumination_loop_default_problem-solve": "2026-10-05",
    "rf_rumination_loop_default_five-senses": "2026-10-05",
    "rf_rumination_loop_flooded_cool-down": "2026-10-05",
    "rf_rumination_loop_flooded_five-senses": "2026-10-05",
    "rf_reward_drive_low_default_opposite-action": "2026-10-05",
    "rf_reward_drive_low_flooded_five-senses": "2026-10-05",
    "rf_conservation_freeze_default_five-senses": "2026-10-05",
    "rf_conservation_freeze_default_opposite-action": "2026-10-05",
    "rf_conservation_freeze_flooded_five-senses": "2026-10-05",
    "rf_dissociation_overmodulation_default_five-senses": "2026-10-05",
    "rf_dissociation_overmodulation_flooded_five-senses": "2026-10-05",
    "rf_acute_alarm_addresses_recovering-from-invalidation": "2026-10-05",
    "rf_chronic_vigilance_addresses_recovering-from-invalidation": "2026-10-05",
    "rf_social_threat_shame_addresses_recovering-from-invalidation": "2026-10-05",
    "rf_reactive_aggression_addresses_recovering-from-invalidation": "2026-10-05",
    "rf_rumination_loop_addresses_recovering-from-invalidation": "2026-10-05",
    "rf_reward_drive_low_addresses_recovering-from-invalidation": "2026-10-05",
    "rf_conservation_freeze_addresses_recovering-from-invalidation": "2026-10-05",
    "rf_dissociation_overmodulation_addresses_recovering-from-invalidation": "2026-10-05",
    "rf_acute_alarm_none_named_find-the-feeling": "2026-10-05",
    "rf_chronic_vigilance_none_named_find-the-feeling": "2026-10-05",
    "rf_social_threat_shame_none_named_find-the-feeling": "2026-10-05",
    "rf_rumination_loop_none_named_find-the-feeling": "2026-10-05",
    "rf_acute_alarm_words_overwhelm_pause": "2026-10-05",
    "rf_acute_alarm_words_stress_problem-solve": "2026-10-05",
    "rf_acute_alarm_words_annoyed_opposite-action": "2026-10-05",
    "rf_acute_alarm_words_freeze_five-senses": "2026-10-05",
    "rf_chronic_vigilance_words_anticipatory_opposite-action": "2026-10-05",
    "rf_chronic_vigilance_words_worry_opposite-action": "2026-10-05",
    "rf_chronic_vigilance_words_helpless_problem-solve": "2026-10-05",
    "rf_social_threat_shame_words_exposed_cool-down": "2026-10-05",
    "rf_reactive_aggression_words_grievance_opposite-action": "2026-10-05",
    "rf_rumination_loop_words_aversion_opposite-action": "2026-10-05",
    "rf_rumination_loop_words_low-shame_recovering-from-invalidation": "2026-10-05",
    "rf_rumination_loop_words_low-shame_opposite-action": "2026-10-05",
    "rf_reward_drive_low_words_fragile_problem-solve": "2026-10-05",
    # Rebel without the wreckage (DT-11), Pause's swap on provoked / indignant: signed off 10 Nov (Claudia).
    "rf_reactive_aggression_words_rebel_alternate-rebellion": "2026-11-10",
    # Connected by default (Claudia, 12 Nov: "why are we leaving things disconnected and hedging by default at ALL?"):
    # FAST's two word rows and Say no's row go live with the module.
    "rf_social_threat_shame_words_self-respect_fast": "2026-11-12",
    "rf_reactive_aggression_words_grievance_fast": "2026-11-12",
    "rf_acute_alarm_words_demand_say-no": "2026-11-12",
}
BANDS = ["steady", "stirred", "flooded"]

# WMP-04 v0 side tags, the engine's diversity key (skillKind) and the tool's intrinsic arousal
# direction (DT vocabulary: down · up · orient · neutral). appToolId → concept id + tags.
CONCEPT_TAGS = {
    "cool-down":                    {"concept": "dbt_tipp",                         "side": "both",       "skillKind": "body",       "direction": "down"},
    "pause":                        {"concept": "dbt_stop",                         "side": "both",       "skillKind": "hold",       "direction": "down"},
    "five-senses":                  {"concept": "se_orienting",                     "side": "acceptance", "skillKind": "orient",     "direction": "orient"},
    "urge-surfing":                 {"concept": "urge_surfing",                     "side": "acceptance", "skillKind": "hold",       "direction": "neutral"},
    "opposite-action":              {"concept": "dbt_opposite_action",              "side": "change",     "skillKind": "change",     "direction": "neutral"},
    "find-the-feeling":             {"concept": "dbt_find_the_feeling",             "side": "acceptance", "skillKind": "naming",     "direction": "neutral"},
    "problem-solve":                {"concept": "dbt_problem_solving",              "side": "change",     "skillKind": "change",     "direction": "neutral"},
    "dear-man":                     {"concept": "dbt_dear_man",                     "side": "change",     "skillKind": "relational", "direction": "neutral"},
    "recovering-from-invalidation": {"concept": "dbt_recovering_from_invalidation", "side": "both",       "skillKind": "relational", "direction": "neutral"},
}

# Tools whose rows are authored but switched off (content kill switch per row).
INACTIVE_TOOLS: dict = {}
# Tools that must have no rows at all yet.
NO_ROWS = {"dear-man": "IE-01's 'is it safe with them?' question ships with the safety batch (R9, D-02)"}

# Planned tools (Oct 2026 review): the routing names them now; each concept is in the graph but has no
# app module yet, so its rows are written switched off (and the routing slice skips concepts without an
# appToolId anyway). When a module ships: give the concept its appToolId (app-tool-ids.cypher), drop it
# from PLANNED and its rows go live where the review put them. Wise mind's module has shipped (its
# concept has appToolId 'wise-mind'): out of PLANNED, its watchful row live (Claudia, 12 Nov: default to connected).
CONCEPT_TAGS["wise-mind"] = {"concept": "dbt_wise_mind", "side": "both", "skillKind": "naming", "direction": "neutral"}
# Cope Ahead's module has shipped too (appToolId 'cope-ahead', docs/design/cope-ahead.md): it is out of
# PLANNED, and its anticipatory row is live (Claudia, 12 Nov: default to connected).
CONCEPT_TAGS["cope-ahead"] = {"concept": "dbt_cope_ahead", "side": "change", "skillKind": "change", "direction": "neutral"}
# Check the Facts has shipped on the skill runtime (appToolId 'check-the-facts', docs/design/skill-runtime.md):
# out of PLANNED; its six rows are live (Claudia, 12 Nov: default to connected).
CONCEPT_TAGS["check-the-facts"] = {"concept": "dbt_check_facts", "side": "change", "skillKind": "change", "direction": "neutral"}
# Rebel without the wreckage (DT-11) has shipped on the skill runtime (appToolId 'alternate-rebellion'): its one
# row was signed off on 10 Nov (plan D15) and is live. Its skillKind is `redirect` (the
# urge acted on in a harmless form), not `hold` (sitting with it without acting, Pause's kind): with `hold` the
# diversity rule could never set it beside Pause, and its one row could never show.
CONCEPT_TAGS["alternate-rebellion"] = {"concept": "dbt_alternate_rebellion", "side": "acceptance", "skillKind": "redirect", "direction": "neutral"}
# Keep your self-respect (FAST) has shipped on the skill runtime (appToolId 'fast', docs/design/fast.md, IE-B1):
# out of PLANNED; its two word rows are live (Claudia, 12 Nov: default to connected). Its tags are what let them
# show: it is always the alternative, to Recover (relational) on betrayed / disrespected and to Check the Facts
# (change) on bitter / resentful, so it can be neither `relational` nor change-side, or the diversity rule
# rejects it every time (as Rebel's `hold` did). skillKind `values` (the review asks what you stand for, F-A-S-T);
# side `both` (the review, then Let go when nothing can be done).
CONCEPT_TAGS["fast"] = {"concept": "dbt_fast", "side": "both", "skillKind": "values", "direction": "neutral"}
# Say no (IE-04, appToolId 'say-no', docs/design/say-no.md): one word row, live with the module (connected by default).
CONCEPT_TAGS["say-no"] = {"concept": "dbt_saying_no", "side": "change", "skillKind": "relational", "direction": "neutral"}

# It isn't working (ER-14, appToolId 'er-troubleshoot', docs/design/er-troubleshoot.md) has no RECOMMENDED_FOR rows
# by design: it answers "I did a skill and it didn't help", which no check-in state names. Its entries are skill
# readouts (Do the Opposite, the wave), the Tools intent and later Reflect, so no concept tags either.
# Rewrite the nightmare (ER-15, appToolId 'nightmare-rescript', docs/design/nightmare-rescript.md) has none either, by
# design: a recurring nightmare is not a check-in state, and the PRD's entries are the Tools intent, Sleep reset
# (ER-13) and Running low's sleep row (ER-07), never the check-in and never night mode.
# Pros & cons card (DT-10, appToolId 'pros-cons', docs/design/pros-cons.md) has none either, by design: it is made in
# calm for a pull that keeps coming back, so a check-in state is the wrong moment to offer it. Its entries are the Tools
# intent, Hold to wait's replay and later the kit (DT-03) and CORE-11's commitment step.
# Ending a relationship that's hurting you (IE-08, appToolId 'ending-relationships',
# docs/design/ending-relationships.md) has none either, by design (PRD: "No intent row"): ending a relationship is a
# decision made at a calm time, never a card a feeling word earns, and a check-in that surfaced it unasked could be
# seen by the other person. Its entries are the Tools list, Problem Solve's and Rebel's links.
# Let it be (DT-04, appToolId 'let-it-be', D6: routing's planned `radical-acceptance` renamed,
# docs/design/let-it-be.md) has shipped on the skill runtime: out of PLANNED; its three rows stay switched off and
# drafts until Claudia signs them off (D15).
CONCEPT_TAGS["let-it-be"] = {"concept": "dbt_radical_acceptance", "side": "acceptance", "skillKind": "hold", "direction": "neutral"}
BUILT_NOT_SIGNED_OFF = {
    # DT-05: the slider is gone (rebuilt as Ride it out on the skill runtime, DT-B3); its rows stay off and drafts.
    "let-it-be": "built on the skill runtime; its rows go live on Claudia's sign-off, row by row (docs/design/let-it-be.md)",
    "urge-surfing": "rebuilt on the skill runtime as Ride it out; its rows go live on Claudia's sign-off (docs/design/ride-it-out.md)",
}
PLANNED = {
    "running-low":        {"concept": "dbt_please",             "side": "both",       "skillKind": "body",       "direction": "neutral"},
    "accepts":            {"concept": "dbt_accepts",            "side": "acceptance", "skillKind": "hold",       "direction": "neutral"},
    "give":               {"concept": "dbt_give",               "side": "change",     "skillKind": "relational", "direction": "neutral"},
}
CONCEPT_TAGS.update(PLANNED)
INACTIVE_TOOLS.update({t: "not built yet (planned, Oct 2026 review)" for t in PLANNED})
INACTIVE_TOOLS.update(BUILT_NOT_SIGNED_OFF)

# "Blank" patterns: never calmed (no `down` tool); CORE Arch §5.1 R5, Somatic Gaps §A rule 7.
BLANK_PATTERNS = {
    "conservation_freeze": True, "dissociation_overmodulation": True, "reward_drive_low": True,
    "acute_alarm": False, "chronic_vigilance": False, "emotional_flooding": False, "social_threat_shame": False,
    "rumination_loop": False, "reactive_aggression": False, "grief_yearning": False,
}

P, S = 1.0, 2.0  # first pick, alternative (lower first)
WORD_LEAD, WORD_NEXT = 0.5, 0.6  # per-word rules rank above the pattern's own rows


def swap(tool, **over):
    """An alternative with per-use overrides (requiresPrior, direction, side)."""
    return dict(tool=tool, **over)


# Pattern → (first pick, alternative or None, rationale) for "default" (any band but flooded) and
# "flooded". Oct 2026 review (Claudia): the capacity bands steady / stirred are one row set now (nothing
# sets "steady" since the capacity question went), with the thinking tools no longer held back; the
# flooded rows are as approved. Flooded is always "flooded" (RoutingPolicy.floodedPatterns), so it has
# no default row. Ready to fight is a check-in candidate while the policy is on (the anger words).
TABLE = {
    "acute_alarm": {
        "default": ("cool-down", "opposite-action", "Acute fear needs regulation followed by approach (review, Oct 2026): Cool Down, then Do the Opposite (its fits-the-facts step stands in for Check the Facts)."),
        "backup": ("five-senses", "Orienting stays available when Cool Down and Do the Opposite are both filtered (alarm with dissociation alongside: blank, and no Do the Opposite)."),
        "flooded": ("cool-down", "five-senses", "Flooded: bottom-up only."),
    },
    "chronic_vigilance": {
        "default": ("five-senses", "problem-solve", "Outward attention and Problem Solve for a solvable worry; the anxiety words lead with Do the Opposite (word rules below)."),
        "flooded": ("cool-down", "five-senses", "Flooded: DT-01 body first."),
    },
    "emotional_flooding": {
        "flooded": ("cool-down", "five-senses", "Flooded: bottom-up only. Crisis banner shows above on check-in."),
    },
    "social_threat_shame": {
        "default": ("recovering-from-invalidation", "opposite-action", "Recover (self-validation) first, Do the Opposite (unhiding) as the alternative (review, Oct 2026)."),
        "flooded": ("cool-down", "five-senses", "Flooded: bottom-up only."),
    },
    "reactive_aggression": {
        "default": ("pause", "cool-down", "Stop before acting (STOP), then bring arousal down (TIPP). Arousal-decreasing, never 'burn it off' (Somatic Gaps §F bug 3); intense exercise lowers arousal, it isn't a release."),
        "flooded": ("cool-down", "five-senses", "Flooded: bottom-up only."),
    },
    "rumination_loop": {
        "default": ("problem-solve", "five-senses", "Problem Solve (its barrier flow is the rumination guard) with an external-attention alternative (Index §5.2 C)."),
        "flooded": ("cool-down", "five-senses", "Flooded: bottom-up only."),
    },
    "reward_drive_low": {
        "default": ("opposite-action", None, "Do the Opposite as 'get active' (behavioural activation) until Running low (PLEASE) ships; never calming, and no 5-4-3-2-1 for vegetative states (review, Oct 2026). The guided Micro win shows above."),
        "flooded": ("five-senses", None, "Flooded + blank: orient only (no Cool Down, D-02)."),
    },
    "conservation_freeze": {
        "default": ("five-senses", swap("opposite-action", requiresPrior="up_regulation", direction="up"),
                    "Orient; Do the Opposite only once you've moved a little (ER PRD ER-03 item 9). Guided gentle-movement stays the primary CTA."),
        "flooded": ("five-senses", None, "Flooded + blank: orient only (no Cool Down, D-02)."),
    },
    "dissociation_overmodulation": {
        "default": ("five-senses", None, "Orient first; no OA, no check the facts, no wave (ER-06 table). 5-4-3-2-1 is eyes-open since A0-1."),
        "flooded": ("five-senses", None, "Orient first."),
    },
}
DEFAULT_BANDS = ["steady", "stirred"]
BACKUP = 3.0  # a pattern's backup row, used only when its first pick and alternative are filtered

# CONTRAINDICATED_FOR (the engine's hook: the primary OR the co-occurring pattern): tool → patterns.
# Do the Opposite never runs while someone is dissociated (ER-06), also when dissociation sits
# alongside another pattern.
CONTRAINDICATIONS = {"opposite-action": ["dissociation_overmodulation"]}

# Emotion-gated rows. `addresses`: fires only when one of the user's words is in the concept's
# ADDRESSES/REDUCES/TARGETS set; `none_named`: only when no emotion was named.
GATES = [
    {"tool": "recovering-from-invalidation", "gate": "addresses", "priority": 0.0, "bands": DEFAULT_BANDS,
     "patterns": ["acute_alarm", "chronic_vigilance", "social_threat_shame", "reactive_aggression", "rumination_loop",
                  "reward_drive_low", "conservation_freeze", "dissociation_overmodulation"],
     "why": "A wound word was named (hurt, humiliated, rejected, excluded, abandoned): Recover leads whatever the pattern (CORE routing table R7; everywhere, Oct 2026 review). Not when flooded: body first."},
    {"tool": "find-the-feeling", "gate": "none_named", "priority": 1.5, "bands": DEFAULT_BANDS,
     "patterns": ["acute_alarm", "chronic_vigilance", "social_threat_shame", "rumination_loop"],
     "why": "Nothing was named (somatic skip): offer to find the word as the alternative (R9)."},
]

DISGUST_WORDS = ["disgusted", "disapproving", "disappointed", "awful", "repelled", "judgmental", "appalled", "revolted",
                 "nauseated", "detestable", "horrified"]
STRESS_WORDS = ["frustrated", "stressed", "busy", "rushed", "pressured"]
WATCHFUL_WORDS = ["persecuted", "critical", "skeptical", "dismissive", "jealous"]

# Per-word rules (Oct 2026 review): when one of the words is picked, this tool ranks above the pattern's
# own rows. Each row's `why` is the review's reasoning. Planned tools (PLANNED) are written switched off
# with the priority the review gave them, so they take their place the day the module ships.
WORD_RULES = [
    # --- Alarm ---
    {"key": "overwhelm", "pattern": "acute_alarm", "tool": "pause", "priority": WORD_LEAD, "words": ["overwhelmed", "out_of_control"],
     "why": "Capacity saturation needs a behavioural halt: Pause (STOP), then Cool Down (TIPP). Overwhelmed stays on Alarm, not Flooded: one everyday word doesn't raise the crisis banner."},
    {"key": "stress", "pattern": "acute_alarm", "tool": "problem-solve", "priority": WORD_LEAD, "words": STRESS_WORDS,
     "why": "Bridge high agitation: distraction (ACCEPTS, planned) then Problem Solve; until ACCEPTS ships, Problem Solve leads and Cool Down follows."},
    {"key": "stress", "pattern": "acute_alarm", "tool": "accepts", "priority": 0.4, "words": STRESS_WORDS,
     "why": "Planned: ACCEPTS (distract) leads for strain words once built."},
    {"key": "demand", "pattern": "acute_alarm", "tool": "say-no", "priority": WORD_NEXT, "words": ["pressured"],
     "why": "Pressure from someone's demands: Say no (IE-04) beside Problem Solve, so the person can turn the ask down instead of absorbing it."},
    {"key": "annoyed", "pattern": "acute_alarm", "tool": "opposite-action", "priority": WORD_LEAD, "words": ["annoyed"],
     "why": "Check the Facts on low-grade anger (planned); Do the Opposite's fits-the-facts step until then."},
    {"key": "annoyed", "pattern": "acute_alarm", "tool": "check-the-facts", "priority": 0.4, "words": ["annoyed"],
     "why": "Planned: Check the Facts leads for low-grade anger."},
    {"key": "annoyed", "pattern": "acute_alarm", "tool": "accepts", "priority": WORD_NEXT, "words": ["annoyed"],
     "why": "Planned: ACCEPTS as the alternative."},
    {"key": "freeze", "pattern": "acute_alarm", "tool": "five-senses", "priority": WORD_LEAD, "words": ["distant", "withdrawn"],
     "why": "Freeze with high arousal underneath (review, Oct 2026): orient to present safety first, then Cool Down."},
    # --- On guard ---
    {"key": "anticipatory", "pattern": "chronic_vigilance", "tool": "opposite-action", "priority": WORD_LEAD, "words": ["anxious", "nervous"],
     "why": "Anticipatory anxiety needs rehearsal and evaluation: Cope Ahead, then Check the Facts (both planned); Do the Opposite (approach, fits-the-facts step) until then."},
    {"key": "anticipatory", "pattern": "chronic_vigilance", "tool": "cope-ahead", "priority": 0.4, "words": ["anxious", "nervous"],
     "why": "Planned: Cope Ahead leads for anticipatory anxiety."},
    {"key": "anticipatory", "pattern": "chronic_vigilance", "tool": "check-the-facts", "priority": 0.45, "words": ["anxious", "nervous"],
     "why": "Planned: Check the Facts as the alternative."},
    {"key": "worry", "pattern": "chronic_vigilance", "tool": "opposite-action", "priority": WORD_LEAD, "words": ["worried"] + WATCHFUL_WORDS,
     "why": "Check the Facts first (planned); Do the Opposite's fits-the-facts step until then."},
    {"key": "worry", "pattern": "chronic_vigilance", "tool": "check-the-facts", "priority": 0.4, "words": ["worried"] + WATCHFUL_WORDS,
     "why": "Planned: Check the Facts leads."},
    {"key": "worry", "pattern": "chronic_vigilance", "tool": "urge-surfing", "priority": WORD_NEXT, "words": ["worried"],
     "why": "Ride it out (DT-05, rebuilt on the skill runtime) for the checking / reassurance urge; off until signed off."},
    {"key": "watchful", "pattern": "chronic_vigilance", "tool": "wise-mind", "priority": WORD_NEXT, "words": WATCHFUL_WORDS,
     "why": "Wise Mind as the alternative for suspicion and judgement."},
    {"key": "helpless", "pattern": "chronic_vigilance", "tool": "problem-solve", "priority": WORD_LEAD, "words": ["helpless"],
     "why": "Let it be (built, row off until signed off), then Problem Solve in micro-steps; Problem Solve leads until then."},
    {"key": "helpless", "pattern": "chronic_vigilance", "tool": "let-it-be", "priority": 0.4, "words": ["helpless"],
     "why": "Let it be (radical acceptance) leads for helplessness."},
    # --- Social threat ---
    {"key": "exposed", "pattern": "social_threat_shame", "tool": "cool-down", "priority": WORD_LEAD, "words": ["exposed", "humiliated"],
     "why": "Hot shame: Cool Down (TIPP cold water triggers the dive reflex, slowing the heart and narrowing peripheral blood vessels), then Recover. Humiliated is a wound word, so Recover still leads it (R7)."},
    {"key": "self-worth", "pattern": "social_threat_shame", "tool": "check-the-facts", "priority": 1.5, "words": ["insecure", "inadequate", "inferior", "insignificant", "weak", "worthless"],
     "why": "Planned: Check the Facts beside Do the Opposite (unhiding) for shame about the self."},
    {"key": "let-down", "pattern": "social_threat_shame", "tool": "give", "priority": 1.5, "words": ["let_down"],
     "why": "Planned: GIVE (keep the relationship) as the alternative to Recover."},
    {"key": "self-respect", "pattern": "social_threat_shame", "tool": "fast", "priority": 1.5, "words": ["betrayed", "disrespected"],
     "why": "FAST (keep self-respect) as the alternative to Recover. Not violated (Claudia, 10 Nov, IE-B1): the review opens on what the person did, which reads as self-blame after a violation."},
    # --- Ready to fight ---
    {"key": "grievance", "pattern": "reactive_aggression", "tool": "opposite-action", "priority": WORD_LEAD, "words": ["bitter", "resentful"],
     "why": "Settled resentment: Check the Facts (planned), FAST as the alternative; Do the Opposite until then, Pause after it."},
    {"key": "grievance", "pattern": "reactive_aggression", "tool": "check-the-facts", "priority": 0.4, "words": ["bitter", "resentful"],
     "why": "Planned: Check the Facts leads for resentment."},
    {"key": "grievance", "pattern": "reactive_aggression", "tool": "fast", "priority": WORD_NEXT, "words": ["bitter", "resentful"],
     "why": "FAST as the alternative."},
    {"key": "rebel", "pattern": "reactive_aggression", "tool": "alternate-rebellion", "priority": 1.5,
     "words": ["provoked", "indignant"],
     "why": "DT-11 (PRD): the push-back words, where a rebellion function is likely, get Rebel without the wreckage as the alternative to Pause; never flooded (body first). Anger alone doesn't imply a rebellion function (the PRD's open question), so not every anger word. Not resentful or bitter: their grievance rows (Do the Opposite, Check the Facts, FAST) lead there, and Pause would always take the swap."},
    # --- On replay ---
    {"key": "aversion", "pattern": "rumination_loop", "tool": "opposite-action", "priority": WORD_LEAD, "words": DISGUST_WORDS + ["hesitant", "guilty", "remorseful"],
     "why": "Disgust: Do the Opposite (towards acceptance); guilt: Check the Facts (is it justified?) then repair; hesitation: approach. Do the Opposite leads until Check the Facts ships."},
    {"key": "aversion", "pattern": "rumination_loop", "tool": "accepts", "priority": WORD_NEXT, "words": DISGUST_WORDS + ["hesitant"],
     "why": "Planned: ACCEPTS as the alternative."},
    {"key": "guilt", "pattern": "rumination_loop", "tool": "check-the-facts", "priority": 0.4, "words": ["guilty", "remorseful", "hesitant"],
     "why": "Planned: Check the Facts leads for guilt (is it justified?) and hesitation."},
    {"key": "low-shame", "pattern": "rumination_loop", "tool": "recovering-from-invalidation", "priority": WORD_LEAD, "words": ["embarrassed", "ashamed", "victimized"],
     "why": "Low-energy shame: Recover (self-validation) first. The review's Cool Down isn't used on this side: the person marked low energy and Cool Down brings it down further."},
    {"key": "low-shame", "pattern": "rumination_loop", "tool": "opposite-action", "priority": WORD_NEXT, "words": ["embarrassed", "ashamed"],
     "why": "Do the Opposite (unhiding) as the alternative for shame."},
    # --- Low drive ---
    {"key": "fragile", "pattern": "reward_drive_low", "tool": "problem-solve", "priority": WORD_LEAD, "words": ["vulnerable", "fragile", "powerless"],
     "why": "Let it be (built, row off until signed off), then Problem Solve in micro-steps; Problem Solve until then."},
    {"key": "fragile", "pattern": "reward_drive_low", "tool": "let-it-be", "priority": 0.4, "words": ["vulnerable", "fragile", "powerless"],
     "why": "Let it be (radical acceptance) leads."},
    {"key": "connection", "pattern": "reward_drive_low", "tool": "give", "priority": 0.85, "words": ["lonely", "isolated"],
     "why": "Planned: GIVE (reaching towards people) leads for loneliness once built, Running low after it; Do the Opposite until then."},
]

# Planned pattern-level rows (no word gate): the review's intended first pick for the pattern.
PLANNED_ROWS = [
    {"pattern": "reward_drive_low", "tool": "running-low", "priority": 0.9,
     "why": "Planned: Running low (PLEASE: address the body's vulnerability) leads Low drive, Do the Opposite after it."},
    {"pattern": "conservation_freeze", "tool": "let-it-be", "priority": 1.5,
     "why": "Let it be (radical acceptance) after gentle movement for despair, grief, emptiness and numbness."},
]


# CORE's routing policy: the kill switch (enabled False → today's legacy ranker), card count,
# the fallback when every row is filtered, the band assumed when none was given.
POLICY = {
    "version": VERSION,
    "enabled": True,           # on 5 Oct 2026 (Claudia); False = the legacy ranker, the kill switch
    "maxCards": 2,
    "fallbackConceptId": "se_orienting",
    "defaultBand": "stirred",
    "floodedPatterns": ["emotional_flooding"],
}


def review_status(id_):
    return "approved" if id_ in SIGNED_OFF else "draft"


def rows():
    """Every RECOMMENDED_FOR row, in a stable order (pattern table, gates, word rules, planned)."""
    out = []

    def add(id_, tool, pattern, bands, priority, why, gate=None, words=None, spec=None):
        spec = spec or {}
        out.append({
            "id": id_, "tool": tool, "pattern": pattern, "bands": bands, "priority": priority,
            "direction": spec.get("direction", CONCEPT_TAGS[tool]["direction"]), "requiresPrior": spec.get("requiresPrior"),
            "side": spec.get("side"), "emotionGate": gate, "words": words or [], "active": tool not in INACTIVE_TOOLS,
            "why": why,
        })

    for pattern, cells in TABLE.items():
        if "backup" in cells:
            tool, why = cells["backup"]
            add(f"rf_{pattern}_backup_{tool}", tool, pattern, DEFAULT_BANDS, BACKUP, why)
        for cell, bands in (("default", DEFAULT_BANDS), ("flooded", ["flooded"])):
            if cell not in cells:
                continue
            primary, second, why = cells[cell]
            for slot, spec in (("P", primary), ("S", second)):
                if spec is None:
                    continue
                spec = spec if isinstance(spec, dict) else {"tool": spec}
                add(f"rf_{pattern}_{cell}_{spec['tool']}", spec["tool"], pattern, bands, P if slot == "P" else S, why, spec=spec)
    for g in GATES:
        for pattern in g["patterns"]:
            add(f"rf_{pattern}_{g['gate']}_{g['tool']}", g["tool"], pattern, g["bands"], g["priority"], g["why"], gate=g["gate"])
    for w in WORD_RULES:
        add(f"rf_{w['pattern']}_words_{w['key']}_{w['tool']}", w["tool"], w["pattern"], DEFAULT_BANDS, w["priority"], w["why"],
            gate="words", words=w["words"])
    for pr in PLANNED_ROWS:
        add(f"rf_{pr['pattern']}_planned_{pr['tool']}", pr["tool"], pr["pattern"], DEFAULT_BANDS, pr["priority"], pr["why"])
    for r in out:
        r["reviewStatus"] = review_status(r["id"])
    return out
