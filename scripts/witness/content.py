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

# Sign-off (A5-4): Claudia's review of draft lines. A line id here goes live with this reviewedAt on
# the next build (status "live", reviewStatus "reviewed"); remove it to take the line back to draft.
# e.g. SIGNED_OFF = {"ci_fear_l5_1": "2026-10-05", "ci_flooded_1": "2026-10-05"}
SIGNED_OFF = {}


def line(id, text, level, kind="receive", *, named=None, bands=("steady", "stirred"), moments=(), situations=(),
         words=(), families=(), underneath=(), urges=(), for_other=False, status="live", review="reviewed",
         reviewed_at=None, note=None):
    voice = "name" if named else ("you" if _has_you(text) else "none")
    if id in SIGNED_OFF:
        status, review, reviewed_at = "live", "reviewed", SIGNED_OFF[id]
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


# ---------------------------------------------------------------------------------------------
# Check-in result corpus (plan A5-4, E3 §A5.2.5): ~84 lines for the beat under the pattern label.
# Drafted by the Phase A builder under the voice lint; every line is reviewStatus "draft" and
# status "draft" (loaded, never served) until Claudia signs it off: set status="live",
# review="reviewed", reviewed_at="<date>" per line, rebuild, then `--only witness`.
# No slots: the echo above the line already carries the user's own word(s).
#
#   9 DBT families x (level 4 x3, level 5 x3)   54   steady + stirred
#   level 3 guesses (UNDERNEATH), steady only    6
#   level 6 capacity, steady only                6
#   flooded, level 1-2, <= 8 words              12
#   generic level 4/5 (no family, or several)    6
# ---------------------------------------------------------------------------------------------
_CI = dict(moments=["checkin_result"], status="draft", review="draft")

_FAMILY_LINES = {
    "fear": (
        ["If things have gone wrong before, of course you're bracing now.",
         "If you've been caught off guard before, fear can show up early.",
         "Some people pick up on danger faster than others. Fear showing up makes sense."],
        ["Anyone facing something this uncertain could feel scared.",
         "Fear makes sense when something matters and you can't control it.",
         "Of course you're on edge. Something feels unsafe or unsure."],
    ),
    "anger": (
        ["If you've had to fight to be heard before, this anger makes sense.",
         "If things have felt unfair for a while, anger can come fast.",
         "If you've had to protect yourself before, this anger makes sense."],
        ["Anger makes sense when something you care about gets blocked.",
         "Anyone in your spot could feel this angry.",
         "Of course you're angry. Something mattered to you."],
    ),
    "sadness": (
        ["If you've been carrying a lot, sadness makes sense.",
         "If you've lost things before, a new loss can bring the old ones with it.",
         "If hope has been let down before, sadness can come on heavy."],
        ["Sadness makes sense when something that mattered is gone or out of reach.",
         "Anyone missing something important could feel this sad.",
         "Of course this hurts. It mattered to you."],
    ),
    "disgust": (
        ["If something like this has hurt you before, pulling away makes sense.",
         "If something like this has left a bad taste before, the disgust makes sense.",
         "If your values have been pushed on before, disgust can come up fast."],
        ["Disgust makes sense when something feels wrong to take in.",
         "Anyone who ran into this could want to pull back.",
         "Of course you want some distance from this."],
    ),
    "shame": (
        ["If you've been judged harshly before, shame can show up fast.",
         "If mistakes used to cost you a lot, shame can come on fast.",
         "If hiding kept you safe before, wanting to hide now makes sense."],
        ["Wanting to hide makes sense when you feel exposed.",
         "Anyone who felt this exposed could feel shame.",
         "Shame is a painful feeling. It makes sense that it's this heavy."],
    ),
    "guilt": (
        ["You care about doing right. That's part of why this guilt shows up.",
         "If you've worked hard to be good to people, guilt can hit hard.",
         "If you hold yourself to a high standard, guilt can come easily."],
        ["Guilt makes sense when something doesn't sit right with your values.",
         "Anyone who cares about the people around them could feel this.",
         "Of course this weighs on you. It matters to you."],
    ),
    "envy": (
        ["If you've gone without for a while, envy makes sense.",
         "If you've wanted something for a long time, seeing it elsewhere stings.",
         "If a want has gone unmet for a while, envy makes sense."],
        ["Envy makes sense when someone has something you want.",
         "Anyone who wants this could feel envy.",
         "Of course it stings to see someone else have it."],
    ),
    "jealousy": (
        ["If you've been left or let down before, jealousy makes sense.",
         "If you've lost a connection before, fearing that again makes sense.",
         "If trust has been hurt before, jealousy can come on strong."],
        ["Jealousy makes sense when a relationship matters and feels at risk.",
         "Anyone who could lose someone important could feel this.",
         "Of course you want to hold on. They matter to you."],
    ),
    "love": (
        ["If this person has meant a lot to you, the pull toward them makes sense.",
         "When someone has been part of your life, love doesn't switch off.",
         "If this love goes back a long way, it makes sense that it runs deep."],
        ["Love makes sense. This person matters to you.",
         "Anyone who cares this much could feel this.",
         "Of course you feel pulled toward them."],
    ),
}
for _fam, (_l4, _l5) in _FAMILY_LINES.items():
    for _i, _text in enumerate(_l4, 1):
        line(f"ci_{_fam}_l4_{_i}", _text, 4, families=[_fam], **_CI)
    for _i, _text in enumerate(_l5, 1):
        line(f"ci_{_fam}_l5_{_i}", _text, 5, families=[_fam], **_CI)

# Level 3: a tentative guess at what's underneath, served with "close · not that", steady only.
for _id, _text, _targets, _under in [
    ("ci_l3_anger_hurt", "Maybe some of this anger is hurt underneath.", dict(families=["anger"]), ["hurt"]),
    ("ci_l3_anger_fear", "There might be some fear under the anger too.", dict(families=["anger"]), ["fear"]),
    ("ci_l3_shame_rejection", "Maybe part of this is a fear of being pushed away.", dict(families=["shame"]), ["rejection"]),
    ("ci_l3_numb_overwhelm", "Maybe numb is what too much at once feels like.", dict(words=["numb", "numbness"]), ["overwhelm"]),
    ("ci_l3_jealousy_fear", "Maybe under the jealousy is a fear of losing them.", dict(families=["jealousy"]), ["fear"]),
    ("ci_l3_envy_sadness", "Maybe some of this is sadness about what's been missing.", dict(families=["envy"]), ["sadness"]),
]:
    line(_id, _text, 3, bands=("steady",), underneath=_under, **_targets, **_CI)

# Level 6: treated as capable. Tone, never flattery or worth; steady only.
for _i, _text in enumerate([
    "You can feel this and still choose your next step.",
    "You can let this be here for a few minutes.",
    "You know yourself. You can pick what helps from here.",
    "You get to decide what this moment needs.",
    "You can take this one small step at a time.",
    "This is hard, and you can meet it your own way.",
], 1):
    line(f"ci_l6_{_i}", _text, 6, bands=("steady",), **_CI)

# Flooded: pace and echo only, at most 8 words, merged into the result's header. No question.
for _i, (_lvl, _text) in enumerate([
    (1, "A lot, right now."),
    (1, "This is a lot."),
    (1, "No rush here."),
    (1, "Nothing to figure out yet."),
    (1, "It can be loud for a moment."),
    (1, "Slow is fine here."),
    (2, "It feels like too much."),
    (2, "Big and fast, all at once."),
    (2, "Hard to think right now."),
    (2, "Everything is turned up right now."),
    (2, "So much, so fast."),
    (2, "Loud inside, right now."),
], 1):
    line(f"ci_flooded_{_i}", _text, _lvl, bands=("flooded",), **_CI)

# Generic level 4/5: no DBT family (tired, numb at stirred, …) or several at once.
for _id, _lvl, _text in [
    ("ci_generic_l4_1", 4, "If you've been through a lot, this feeling makes sense."),
    ("ci_generic_l4_2", 4, "If you tend to feel things fast and big, this makes sense."),
    ("ci_generic_l4_3", 4, "If this feeling is an old one, it makes sense that it came back."),
    ("ci_generic_l5_1", 5, "What you're feeling makes sense."),
    ("ci_generic_l5_2", 5, "Anyone in your spot could feel this."),
    ("ci_generic_l5_3", 5, "It makes sense to feel more than one thing at once."),
]:
    line(_id, _text, _lvl, **_CI)
