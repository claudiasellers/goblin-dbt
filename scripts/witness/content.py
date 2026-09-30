# Editable source for the witness corpus (WMP-01, plan A5-1): ValidationLine, ToolMoment, VoiceRule.
# Regenerate schema/witness.cypher with build.py after editing, and schema/invalidation-recovery.cypher
# too when a Recover line changes (Recover's RecoveryProtocol.validationLines is a projection of the
# recover_validate lines below; scripts/invalidation-recovery/content.py imports witness_lines()).
#
# THE VOICE (scripts/witness/voice-rules.json; the lint runs in npm test and before every load):
#   a flat, warm witness. Second person ("you"), or the user's name in the {N} form. No cheer, no
#   "!", no emoji, no "should", no "just", no "but" taking a clause back, no diagnosis words, no
#   physiology claims, never an interpretation of what the other person meant. At most 90
#   characters; lines allowed at `flooded` are level 1-2 and at most 8 words.
#
# LEVELS (Linehan's validation levels, WMP-01):
#   1 pace / presence       2 echo, the user's own words      3 a tentative guess at what's underneath
#   4 makes sense given history or how you're built           5 makes sense now, for anyone
#   6 treated as capable: tone, never flattery
#
# FIELDS per line (line() below):
#   id, text (you-voice; never {N}), named ({N} form, voice "name"; None for voice "you"/"none"),
#   level, kind (receive | urge | both | after_miss | after_louder | self | function), bands,
#   moments (ToolMoment ids; none = usable anywhere), situations [(Label, id)], words (Emotion ids,
#   VALIDATES), families (DBT parents, VALIDATES_FAMILY → EmotionRegulationContent), underneath
#   (Emotion ids, level 3), urges (ActionUrge ids), status, review.
#
# STATUS / REVIEW:
#   status "live" is served; "draft" is loaded but never served (getWitnessLines filters live), so
#   Claudia can review drafts in the source or the graph; "retired" is kept for history.
#   review "reviewed" + reviewed_at is required for live (lint rule reviewed_live);
#   review "draft" marks a line for Claudia's review (reviewStatus "draft").
#   Lines removed from this file are marked retired on the next load, never deleted (SHOWED_LINE
#   history points at them).

VERSION = "witness-v1"

# ToolMoment: where a beat can be served (WMP-01 embed points). hostToolId is the app tool id.
MOMENTS = [
    ("checkin_result", "checkin", "Check-in result"),
    ("recover_validate", "recovering-from-invalidation", "Recover: this makes sense"),
    ("oa_start", "opposite-action", "Opposite Action: before the urge"),
    ("ps_define", "problem-solve", "Problem Solve: before defining the problem"),
    ("dearman_describe", "dear-man", "DEAR MAN: before Describe"),
    ("debrief_turning_point", "dear-man", "DEAR MAN debrief: the turning point"),
    ("missed_followup", "today", "A follow-up that didn't happen"),
    ("urge_louder", "opposite-action", "The urge went up"),
    ("crisis", "checkin", "Crisis banner (level 1 only; CORE-01)"),
]

# Every line is grounded in these (existing ClinicalSource nodes, loaded by invalidation-recovery.cypher).
SOURCE_IDS = ["shenk_fruzzetti_2011", "linehan_skills_2015"]

LEVELS = (1, 2, 3, 4, 5, 6)
KINDS = ("receive", "urge", "both", "after_miss", "after_louder", "self", "function")
BANDS = ("steady", "stirred", "flooded")
STATUSES = ("live", "draft", "retired")
FAMILIES = ("fear", "anger", "disgust", "envy", "jealousy", "love", "sadness", "shame", "guilt")

LINES = []


def line(id, text, level, kind="receive", *, named=None, bands=("steady", "stirred"), moments=(), situations=(),
         words=(), families=(), underneath=(), urges=(), for_other=False, status="live", review="reviewed",
         reviewed_at=None, note=None):
    voice = "name" if named else ("you" if _has_you(text) else "none")
    LINES.append({
        "id": id, "text": text, "textNamed": named, "level": level, "voice": voice, "bands": list(bands),
        "kind": kind, "forOther": for_other, "tentative": level == 3, "status": status,
        "reviewStatus": review, "reviewedAt": reviewed_at, "moments": list(moments),
        "situations": [list(s) for s in situations], "words": list(words), "families": list(families),
        "underneath": list(underneath), "urges": list(urges), "note": note,
    })


def _has_you(t):
    import re
    return re.search(r"\b(you|your|you're|yourself)\b", t, re.I) is not None


# ---------------------------------------------------------------------------------------------
# Recover from a hurtful moment: the 16 validation lines (were RecoveryProtocol.validationLines),
# now tagged by level and kind. Recover's UI is unchanged: it still renders the {N} form with its
# name/you switch (renderValidationLine) until WMP-02 moves it onto the WitnessBeat.
#
# D-04 (approved as proposed under the recommended defaults, 2026-09-30): three lines edited because
# they failed the voice contract:
#   ds_4 "…, and it was unkind."                        (asserted an interpretation) → "…, and it hurt."
#   bw_4 "…: this was wrong, and {N} gets to decide what to do with it." (interpretation)
#        → "…: this felt wrong, and {N} gets to decide what happens next."
#   aa_2 "This is real pain, not oversensitivity. Rejection sets off alarm systems that overlap with
#        physical pain." (diagnosis word, physiology, 105 chars) → "This is real pain. Being pushed away hurts anyone."
# The level tags are proposals Claudia confirms at the M3 gate.
# ---------------------------------------------------------------------------------------------
_RV = dict(moments=["recover_validate"], reviewed_at="2026-09-30")


def _rv(protocol, n, text, named, level, kind, note=None):
    line(f"rv_{protocol}_{n}", text, level, kind, named=named, situations=[("RecoveryProtocol", protocol)], note=note, **_RV)


_rv("not_received", 1, "Of course that stung. You were trying to be heard and got {phrase}.",
    "{N}, of course that stung. You were trying to be heard and got {phrase}.", 5, "receive")
_rv("not_received", 2, "Anyone who wanted to be understood would feel this.", None, 5, "receive")
_rv("not_received", 3, "Your hurt makes sense. The story about it might not.",
    "{N}'s hurt makes sense. The story about it might not.", 5, "both")
_rv("not_received", 4, "You can know this hurt without needing them to be the villain.",
    "{N} can know this hurt without needing them to be the villain.", 6, "both")

_rv("diminished_self", 1, "This is a moment of hurt. Being {phrase} hurts anyone.",
    "{N}, this is a moment of hurt. Being {phrase} hurts anyone.", 5, "receive")
_rv("diminished_self", 2, "Your feeling is real. It isn't a verdict on you.",
    "{N}'s feeling is real. It isn't a verdict on {N}.", 5, "receive")
_rv("diminished_self", 3, "Feeling small right now doesn't make you small.",
    "Feeling small right now doesn't make {N} small.", 5, "receive")
_rv("diminished_self", 4, "Both can be true: you are sensitive to this, and it hurt.",
    "Both can be true: {N} is sensitive to this, and it hurt.", 5, "both",
    note="D-04 edit; was '…, and it was unkind.'")

_rv("blocked_wronged", 1, "It makes sense you're furious. Something mattered and got {phrase}.",
    "{N}, it makes sense you're furious. Something mattered and got {phrase}.", 5, "receive")
_rv("blocked_wronged", 2, "You can know this was unfair without replaying it all night.",
    "{N} can know this was unfair without replaying it all night.", 6, "both")
_rv("blocked_wronged", 3, "It's understandable you are angry. You choose the next move.",
    "It's understandable {N} is angry. {N} chooses the next move.", 5, "receive")
_rv("blocked_wronged", 4, "Both can be true: this felt wrong, and you get to decide what happens next.",
    "Both can be true: this felt wrong, and {N} gets to decide what happens next.", 5, "both",
    note="D-04 edit; was 'this was wrong, and {N} gets to decide what to do with it.'")

_rv("attachment_alarm", 1, "Of course you're scared. Losing connection sets off a real alarm.",
    "{N}, of course you're scared. Losing connection sets off a real alarm.", 4, "receive")
_rv("attachment_alarm", 2, "This is real pain. Being pushed away hurts anyone.", None, 5, "receive",
    note="D-04 edit; was 'This is real pain, not oversensitivity. Rejection sets off alarm systems that overlap with physical pain.'")
_rv("attachment_alarm", 3, "You can hold this fear without chasing.",
    "{N} can hold this fear without chasing.", 6, "both")
_rv("attachment_alarm", 4, "The alarm is loud. That doesn't mean the relationship is over.", None, 5, "both")


def witness_lines(moment, protocol):
    """Recover's projection: the {N} form (or the plain line) of a protocol's lines, in order."""
    return [l["textNamed"] or l["text"] for l in LINES
            if moment in l["moments"] and ["RecoveryProtocol", protocol] in l["situations"] and l["status"] != "retired"]


# ---------------------------------------------------------------------------------------------
# Drafts for other hosts (E3 §A5.2.5). Not served: getWitnessLines serves `live` only, and these
# hosts don't embed the beat until their fidelity passes. Each pass flips its lines live after
# review and removes the legacy property in the same PR, so no host ever has two live sources.
# Written by the A5-1 builder from the legacy strings; reviewStatus "draft" throughout.
# ---------------------------------------------------------------------------------------------
_DRAFT = dict(status="draft", review="draft")

# Opposite Action (ER-03): the *function* half of EmotionRegulationContent.acknowledgment (all 9 were
# over 90 characters and pivoted to change in the same breath). The change frame stays OA's copy.
for _fam, _text in [
    ("fear", "Fear is trying to keep you safe. It pulls you away from what feels like a threat."),
    ("anger", "Anger showed up because something felt wrong. It's getting you ready to push back."),
    ("sadness", "Sadness pulls you inward. That's what it does after something that mattered."),
    ("disgust", "Disgust is pushing you away from something that feels wrong to take in."),
    ("shame", "Shame wants you to hide so you don't get pushed out. The pull makes sense."),
    ("guilt", "Guilt is pointing at your values. It wants you to put something right."),
    ("jealousy", "Jealousy is trying to hold on to a connection that matters to you."),
    ("envy", "Envy is pointing at something you want. Wanting it makes sense."),
    ("love", "Love keeps pulling you toward someone who matters. Of course it does."),
]:
    line(f"oa_{_fam}_function", _text, 5, "function", moments=["oa_start"], families=[_fam],
         note="ER-03 draft from EmotionRegulationContent.acknowledgment (function half)", **_DRAFT)

# Problem Solve (ER-12): the receive half of psAcknowledgment; PS keeps its framing sentence.
for _fam, _lvl, _text in [
    ("fear", 5, "Your fear is pointing at something real."),
    ("anger", 5, "Something that mattered got crossed. Your anger makes sense."),
    ("sadness", 5, "You lost something real, or it didn't go the way you needed. The sadness fits."),
    ("guilt", 4, "This doesn't sit right with your values. The guilt is worth listening to."),
    ("shame", 5, "Shame says something is wrong with you. Feeling it doesn't make it true."),
    ("disgust", 5, "Something crossed a line for you. Your disgust is saying this isn't okay."),
    ("envy", 5, "Your envy is pointing at something you want. There's nothing wrong with wanting it."),
    ("jealousy", 4, "This relationship matters to you. Your jealousy is trying to protect it."),
    ("love", 5, "The love is real. Something is getting in its way."),
]:
    line(f"ps_{_fam}_receive", _text, _lvl, "receive", moments=["ps_define"], families=[_fam],
         note="ER-12 draft from psAcknowledgment (receive half)", **_DRAFT)

# DEAR MAN debrief (IE-01 / IE-11): TurningPoint.validationText, re-voiced. tp_no_words loses its
# neuroscience claim; tp_went_okay loses the coaching pivot; tp_escalated no longer asserts what
# was at stake for the other person.
for _tp, _lvl, _kind, _text in [
    ("tp_defensive", 5, "after_miss", "They got defensive. That's one of the hardest things to stay steady through."),
    ("tp_crying_shutdown", 4, "after_miss", "Your body was trying to protect you. That isn't weakness."),
    ("tp_apologized", 5, "after_miss", "Holding your ground is hard when guilt shows up. Lots of people fold there."),
    ("tp_no_words", 5, "after_miss", "When feelings run this high, words get hard to find. That isn't failure."),
    ("tp_gave_in", 4, "after_miss", "Giving in made sense in that moment. Part of you was keeping things safe."),
    ("tp_escalated", 5, "after_miss", "It got heated. That usually means something mattered a lot."),
    ("tp_went_okay", 6, "receive", "It went okay. You did a hard thing."),
    ("tp_something_else", 5, "receive", "Every conversation has its own shape. What happened for you counts."),
]:
    line(f"dm_{_tp}", _text, _lvl, _kind, moments=["debrief_turning_point"], situations=[("TurningPoint", _tp)],
         note="IE draft from TurningPoint.validationText", **_DRAFT)
