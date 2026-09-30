# Editable source for schema/recommended-for.cypher (plan E4-2): what the check-in result recommends,
# by activation pattern × capacity band. Regenerate with build.py after editing:
#
#   python3 scripts/recommendations/build.py > /tmp/rf.cypher && mv /tmp/rf.cypher schema/recommended-for.cypher
#   python3 scripts/recommendations/fixture.py
#
# REVIEW (D-02, D-13): every row, tag and the policy are DRAFTS (reviewStatus "draft") for Claudia's
# clinical sign-off. The table is E4 §2.8 as drafted, with the D-02 defaults:
#   - flooded + blank → no Cool Down (the engine drops `down` tools for blank states; no row needed);
#   - reactive_aggression rows are authored but the pattern is not a check-in candidate yet (it waits);
#   - Pause active (A0-2 fixed its copy); Urge Surfing rows ship active: False until DT-05 rebuilds it;
#   - DEAR MAN has no rows until IE-01's "is it safe with them?" question ships (safety batch, R9).
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

VERSION = "rf-v1"
# Sign-off: add a row id (or the policy id "checkin_result") with its review date; that row is then
# `reviewStatus: "approved"`, everything else stays "draft".
SIGNED_OFF = {}  # e.g. {"rf_acute_alarm_steady_opposite-action": "2026-10-05"}
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
INACTIVE_TOOLS = {"urge-surfing": "DT-05: the 1-10 slider is a rebuild, not a patch (R8, D-02)"}
# Tools that must have no rows at all yet.
NO_ROWS = {"dear-man": "IE-01's 'is it safe with them?' question ships with the safety batch (R9, D-02)"}

# "Blank" patterns: never calmed (no `down` tool); CORE Arch §5.1 R5, Somatic Gaps §A rule 7.
BLANK_PATTERNS = {
    "conservation_freeze": True, "dissociation_overmodulation": True, "reward_drive_low": True,
    "acute_alarm": False, "chronic_vigilance": False, "emotional_flooding": False, "social_threat_shame": False,
    "rumination_loop": False, "reactive_aggression": False, "grief_yearning": False,
}

P, S = 1.0, 2.0  # primary, swap (lower first)


def swap(tool, **over):
    """A swap row with per-use overrides (requiresPrior, direction, side)."""
    return dict(tool=tool, **over)


# Pattern × band → (primary, swap or None, rationale). E4 §2.8.
TABLE = {
    "acute_alarm": {
        "steady":  ("opposite-action", "five-senses", "Approach vs unjustified fear (check the facts takes the lead when ER-02 ships); orienting to present safety is the non-change swap."),
        "stirred": ("five-senses", "cool-down", "Alarm protocol orients to present safety first (pattern-co-occurrence.cypher alarm sequencing); body regulation as the swap."),
        "flooded": ("cool-down", "five-senses", "Flooded: bottom-up only."),
    },
    "chronic_vigilance": {
        "steady":  ("five-senses", "problem-solve", "Outward attention (stand-in for MF-01 Listen) and Problem Solve for a solvable worry (cope ahead later; Index §5.2 B)."),
        "stirred": ("five-senses", "urge-surfing", "Orient, then sit with the checking / reassurance urge (Urge Surfing inactive until DT-05)."),
        "flooded": ("cool-down", "five-senses", "Flooded: DT-01 body first."),
    },
    "emotional_flooding": {
        "steady":  ("five-senses", "pause", "Body first, no cognitive tools (pattern clinicalNotes). Crisis banner shows above on check-in."),
        "stirred": ("cool-down", "pause", "Body first; Pause catches the act-now urge."),
        "flooded": ("cool-down", "five-senses", "Flooded: bottom-up only."),
    },
    "social_threat_shame": {
        "steady":  ("opposite-action", "recovering-from-invalidation", "OA for hide / attack urges; Recover as the validating alternative."),
        "stirred": ("recovering-from-invalidation", "pause", "Recover is body-first then self-validation; Pause catches the send / lash-out urge."),
        "flooded": ("cool-down", "five-senses", "Flooded: bottom-up only."),
    },
    "reactive_aggression": {
        "steady":  ("opposite-action", "urge-surfing", "Authored for when the pattern becomes a candidate (not yet: D-02). Arousal-decreasing, never 'burn it off' (Somatic Gaps §F bug 3)."),
        "stirred": ("pause", "cool-down", "Stop before acting; then bring arousal down."),
        "flooded": ("cool-down", "five-senses", "Flooded: bottom-up only."),
    },
    "rumination_loop": {
        "steady":  ("problem-solve", "five-senses", "Problem Solve (its barrier flow is the rumination guard) with an external-attention swap (Index §5.2 C)."),
        "stirred": ("five-senses", None, "External focus (DT-06 later); the guided attention-shift stays the primary CTA."),
        "flooded": ("cool-down", "five-senses", "Flooded: bottom-up only."),
    },
    "reward_drive_low": {
        "steady":  ("opposite-action", "five-senses", "OA as 'get active' for sadness / withdrawal (good things L0/L1 replace it when ER-04 ships); never calming."),
        "stirred": ("opposite-action", "five-senses", "As steady (D-02 open point: lead with 5-4-3-2-1 instead?)."),
        "flooded": ("five-senses", None, "Flooded + blank: orient only (no Cool Down, D-02)."),
    },
    "conservation_freeze": {
        "steady":  ("five-senses", swap("opposite-action", requiresPrior="up_regulation", direction="up"),
                    "No OA without prior activation (ER PRD ER-03 item 9): shown as 'once you've moved a little'. Guided gentle-movement stays the primary CTA."),
        "stirred": ("five-senses", None, "Orient; guided gentle-movement stays the primary CTA."),
        "flooded": ("five-senses", None, "Flooded + blank: orient only (no Cool Down, D-02)."),
    },
    "dissociation_overmodulation": {
        "steady":  ("five-senses", None, "Orient first; no OA, no check the facts, no wave (ER-06 table). 5-4-3-2-1 is eyes-open since A0-1."),
        "stirred": ("five-senses", None, "Orient first."),
        "flooded": ("five-senses", None, "Orient first."),
    },
}

# Emotion-gated rows. `addresses`: fires only when one of the user's words is in the concept's
# ADDRESSES/REDUCES/TARGETS set; `none_named`: only when no emotion was named.
GATES = [
    {"tool": "recovering-from-invalidation", "gate": "addresses", "priority": 0.0, "bands": ["steady", "stirred"],
     "patterns": ["acute_alarm", "chronic_vigilance", "emotional_flooding", "rumination_loop"],
     "why": "A wound word was named (hurt, humiliated, rejected, excluded, abandoned): Recover leads whatever the pattern (CORE routing table R7)."},
    {"tool": "find-the-feeling", "gate": "none_named", "priority": 1.5, "bands": ["steady", "stirred"],
     "patterns": ["acute_alarm", "chronic_vigilance", "social_threat_shame", "rumination_loop"],
     "why": "Nothing was named (somatic skip): offer to find the word as the swap (R9)."},
]

# CORE's routing policy: the kill switch (enabled False → today's legacy ranker), card count,
# the fallback when every row is filtered, the band assumed when none was given.
POLICY = {
    "version": VERSION,
    "enabled": False,          # R7: ships dark; flip after D-02 sign-off and A4-3 / A0-1 / A0-2 are live
    "maxCards": 2,
    "fallbackConceptId": "se_orienting",
    "defaultBand": "stirred",
    "floodedPatterns": ["emotional_flooding"],
}


def review_status(id_):
    return "approved" if id_ in SIGNED_OFF else "draft"


def rows():
    """Every RECOMMENDED_FOR row, in a stable order (pattern, band, priority)."""
    out = []
    for pattern, cells in TABLE.items():
        for band in BANDS:
            primary, second, why = cells[band]
            for slot, spec in (("P", primary), ("S", second)):
                if spec is None:
                    continue
                spec = spec if isinstance(spec, dict) else {"tool": spec}
                tool = spec["tool"]
                out.append({
                    "id": f"rf_{pattern}_{band}_{tool}", "tool": tool, "pattern": pattern, "bands": [band],
                    "priority": P if slot == "P" else S, "direction": spec.get("direction", CONCEPT_TAGS[tool]["direction"]),
                    "requiresPrior": spec.get("requiresPrior"), "side": spec.get("side"), "emotionGate": None,
                    "active": tool not in INACTIVE_TOOLS, "why": why,
                })
    for g in GATES:
        for pattern in g["patterns"]:
            out.append({
                "id": f"rf_{pattern}_{g['gate']}_{g['tool']}", "tool": g["tool"], "pattern": pattern, "bands": g["bands"],
                "priority": g["priority"], "direction": CONCEPT_TAGS[g["tool"]]["direction"], "requiresPrior": None,
                "side": None, "emotionGate": g["gate"], "active": g["tool"] not in INACTIVE_TOOLS, "why": g["why"],
            })
    for r in out:
        r["reviewStatus"] = review_status(r["id"])
    return out
