# Editable source for the witness corpus (WMP-01, plan A5-1): ValidationLine, ToolMoment, VoiceRule.
# Regenerate schema/witness.cypher with build.py after editing, and schema/invalidation-recovery.cypher
# too when a Recover line changes (Recover's RecoveryProtocol.validationLines is a projection of the
# recover_validate lines below; scripts/invalidation-recovery/content.py imports witness_lines()).
#
# THE LINT (scripts/witness/voice-rules.json; runs in npm test and before every load). Blocks a load:
#   magnitude words (ban 4 below), diagnosis words ("oversensitive", "overreacting"), and broken
#   structure (unknown slots, a level-3 line with nothing underneath, a live line nobody signed off).
#   Warns: "!", emoji, "should", "I/my". Reports only: "but", interpreting the other person.
#   Second person ("you"), or the user's name in the {N} form.
#
# STRICT BEHAVIORAL BANS:
#   1. NO spatial metaphors for cognitive processing ("hold space", "unpack"). 
#   2. NO internal emotional justification for Reinforce (focus on external reward for the other).
#   3. THE CAMERA TEST: Never use words describing an internal state for a conflict (e.g., use 
#      "They raised their voice" not "They were aggressive").
#   4. NO MAGNITUDE WORDS: Never validate the *intensity* or *volume* of an emotion (e.g., 
#      crushing, heavy, furious, massive, extreme). Validate the trigger and the presence of the 
#      feeling. Volume validation fuels the panic spiral.
#   5. NO FLATTERY OR CHEERLEADING: For Level 6 validation, do not use identity words ("you are 
#      strong") or comparative invalidation ("you've been through worse"). De-couple emotion from 
#      action. State their track record (the math) and give explicit permission to feel terrible 
#      while executing the behavior.
#
# LEVELS (Linehan's validation levels, WMP-01):
#   1 pace / presence       2 echo, the user's own words      3 a tentative guess at what's underneath
#   4 makes sense given history or how you're built           5 makes sense now, for anyone
#   6 treated as capable: tone, never flattery (The Receipts)
#
# FIELDS per line (line() below):
#   id, text (you-voice; never {N}), named ({N} form, voice "name"; None for voice "you"/"none"),
#   level, kind (receive | urge | both | after_miss | after_louder | self | function), bands,
#   moments (ToolMoment ids; none = usable anywhere), situations [(Label, id)], words (Emotion ids,
#   VALIDATES), families (DBT parents, VALIDATES_FAMILY → EmotionRegulationContent), underneath
#   (Emotion ids, level 3), urges (ActionUrge ids), status, review.

VERSION = "witness-v1"

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

SOURCE_IDS = ["shenk_fruzzetti_2011", "linehan_skills_2015"]
LEVELS = (1, 2, 3, 4, 5, 6)
KINDS = ("receive", "urge", "both", "after_miss", "after_louder", "self", "function")
BANDS = ("steady", "stirred", "flooded")
STATUSES = ("live", "draft", "retired")
FAMILIES = ("fear", "anger", "disgust", "envy", "jealousy", "love", "sadness", "shame", "guilt")

LINES = []
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

_RV = dict(moments=["recover_validate"], reviewed_at="2026-09-30")

def _rv(protocol, n, text, named, level, kind, note=None):
    line(f"rv_{protocol}_{n}", text, level, kind, named=named, situations=[("RecoveryProtocol", protocol)], note=note, **_RV)

_rv("not_received", 1, "Of course that stung. You tried to speak and hit a wall.",
    "{N}, of course that stung. You tried to speak and hit a wall.", 5, "receive")
_rv("not_received", 2, "It hurts to be ignored. Anyone would feel this.", None, 5, "receive")
_rv("not_received", 3, "The hurt is real. The story you are spinning about it might not be.",
    "The hurt is real. The story {N} is spinning about it might not be.", 5, "both")
_rv("not_received", 4, "They didn't hear you. You can accept that without turning them into a monster.",
    "They didn't hear {N}. {N} can accept that without turning them into a monster.", 6, "both")

_rv("diminished_self", 1, "That landed on you. It is normal to feel rattled.",
    "{N}, that landed on you. It is normal to feel rattled.", 5, "receive")
_rv("diminished_self", 2, "The hit was real. It doesn't mean you are broken.",
    "The hit was real. It doesn't mean {N} is broken.", 5, "receive")
_rv("diminished_self", 3, "Feeling small right now does not make you small.",
    "Feeling small right now does not make {N} small.", 5, "receive")
_rv("diminished_self", 4, "You are sensitive to this, and it actually hurt. Both are true.",
    "{N} is sensitive to this, and it actually hurt. Both are true.", 5, "both")

_rv("blocked_wronged", 1, "Something mattered and it got blocked. The anger makes complete sense.",
    "{N}, something mattered and it got blocked. The anger makes complete sense.", 5, "receive")
_rv("blocked_wronged", 2, "You know this was unfair. You do not need to replay it all night to prove it.",
    "{N} knows this was unfair. {N} does not need to replay it all night to prove it.", 6, "both")
_rv("blocked_wronged", 3, "The anger is justified. You still have to decide the next move.",
    "The anger is justified. {N} still has to decide the next move.", 5, "receive")
_rv("blocked_wronged", 4, "That felt unfair. You still get to choose the next move.",
    "That felt unfair. {N} still gets to choose the next move.", 5, "both")

_rv("attachment_alarm", 1, "Of course you are scared. Losing connection trips a survival wire.",
    "{N}, of course you are scared. Losing connection trips a survival wire.", 4, "receive")
_rv("attachment_alarm", 2, "This is real pain. Being pushed away hurts everyone.", None, 5, "receive")
_rv("attachment_alarm", 3, "You can feel this fear without chasing them down.",
    "{N} can feel this fear without chasing them down.", 6, "both")
_rv("attachment_alarm", 4, "You are scared of losing them. That does not mean the relationship is over.", None, 5, "both")

def witness_lines(moment, protocol):
    return [l["textNamed"] or l["text"] for l in LINES
            if moment in l["moments"] and ["RecoveryProtocol", protocol] in l["situations"] and l["status"] != "retired"]

_DRAFT = dict(status="draft", review="draft")

for _fam, _text in [
    ("fear", "Fear wants you to run. It thinks it is keeping you alive."),
    ("anger", "Anger is arming you for a fight because a boundary got crossed."),
    ("sadness", "Sadness is shutting you down. Something real is gone."),
    ("disgust", "Disgust is physically rejecting this. It says this is toxic."),
    ("shame", "Shame wants you to hide so you survive the group. It makes sense."),
    ("guilt", "Guilt is a compass. It says you violated your own rules."),
    ("jealousy", "Jealousy is trying to grip a connection that feels threatened."),
    ("envy", "Envy is pointing at what you do not have. Wanting it is normal."),
    ("love", "Love is a magnet. Of course you feel pulled toward them."),
]:
    line(f"oa_{_fam}_function", _text, 5, "function", moments=["oa_start"], families=[_fam], **_DRAFT)

for _fam, _lvl, _text in [
    ("fear", 5, "The threat is real. Your fear is pointing at it."),
    ("anger", 5, "A boundary got crossed. The anger is just math."),
    ("sadness", 5, "You lost something. The sadness fits the facts."),
    ("guilt", 4, "You broke a rule you actually care about. Listen to the guilt."),
    ("shame", 5, "Shame says you are defective. You feel it, but it is not a fact."),
    ("disgust", 5, "Something crossed a hard line. Disgust is the correct alarm."),
    ("envy", 5, "You want what they have. That is entirely human."),
    ("jealousy", 4, "This connection matters. The jealousy is trying to guard it."),
    ("love", 5, "The love is real. The obstacle is also real."),
]:
    line(f"ps_{_fam}_receive", _text, _lvl, "receive", moments=["ps_define"], families=[_fam], **_DRAFT)

for _tp, _lvl, _kind, _text in [
    ("tp_defensive", 5, "after_miss", "They got defensive. Let them. You do not have to fix their feelings."),
    ("tp_crying_shutdown", 4, "after_miss", "Your nervous system hit the brakes to protect you. That is not a failure."),
    ("tp_apologized", 5, "after_miss", "Guilt showed up, and you held your ground anyway. That is how the muscle is built."),
    ("tp_no_words", 5, "after_miss", "You lost your words. It happens. The boundary still stands."),
    ("tp_gave_in", 4, "after_miss", "You folded because your brain prioritized immediate safety. It makes sense."),
    ("tp_escalated", 5, "after_miss", "It got hot. You survived it. Now walk away and reset your nervous system."),
    ("tp_went_okay", 6, "receive", "It went okay. You executed the behavior and proved the math."),
    ("tp_something_else", 5, "receive", "The script didn't survive contact. What matters is that you tried it."),
]:
    line(f"dm_{_tp}", _text, _lvl, _kind, moments=["debrief_turning_point"], situations=[("TurningPoint", _tp)], **_DRAFT)

_CI = dict(moments=["checkin_result"], status="draft", review="draft")

_FAMILY_LINES = {
    "fear": (
        ["You have been burned before. Of course you are bracing.",
         "Your system remembers this. The fear makes sense.",
         "Uncertainty is a threat response. You are reacting normally."],
        ["It makes sense to be scared when you have no control.",
         "Anyone in the dark here would be on edge.",
         "You don't know what is next. That is terrifying."],
    ),
    "anger": (
        ["You had to fight before. The anger is muscle memory.",
         "When things are unfair, anger is the correct alarm.",
         "You are protecting yourself. That makes sense."],
        ["Something you care about got blocked. Anger is the math.",
         "Anyone taking this hit would be angry.",
         "Of course you are mad. Something mattered here."],
    ),
    "sadness": (
        ["You have carried this a long time. The fatigue makes sense.",
         "Old losses attach to new ones. This reaction is normal.",
         "Hope got dropped. Sadness is what follows."],
        ["Something real is gone. The grief fits the facts.",
         "Anyone missing this would feel exactly like this.",
         "Of course it hurts. It actually mattered."],
    ),
    "disgust": (
        ["You took a hit like this before. Pulling away is survival.",
         "This left a mark last time. Disgust is guarding you.",
         "Your boundaries are being pushed. Disgust is the wall."],
        ["Disgust is the body saying no. Listen to it.",
         "Anyone looking at this would want to walk away.",
         "Of course you want distance. It is toxic."],
    ),
    "shame": (
        ["You were judged harshly before. The shame is an echo.",
         "Mistakes used to cost you everything. Shame is bracing for impact.",
         "Hiding kept you safe in the past. It makes sense you want to run."],
        ["You feel exposed. Shame is the natural result.",
         "Anyone under this spotlight would want to disappear.",
         "You feel exposed, and shame is the alarm. It makes complete sense."],
    ),
    "guilt": (
        ["You actually care about doing right. That is why this hurts.",
         "You hold yourself to a standard. The guilt is the gap.",
         "You protect people. When you can't, guilt is what you feel."],
        ["You crossed your own line. The guilt is doing its job.",
         "Anyone with a conscience would feel this right now.",
         "Of course this stopped you in your tracks. You care about the impact."],
    ),
    "envy": (
        ["You have gone without for a long time. Envy is the bill.",
         "You wanted this, and they got it. The sting is real.",
         "A need has been starved. Envy is entirely logical."],
        ["They have what you want. Envy is the math of that.",
         "Anyone looking at what they have would want it too.",
         "Of course it hurts to watch someone else get it."],
    ),
    "jealousy": (
        ["You have been dropped before. Jealousy is guarding the door.",
         "Trust has cost you in the past. Your guard is up.",
         "You lost a connection once. Fearing it now makes sense."],
        ["This relationship is at risk. Jealousy is the alarm.",
         "Anyone facing this loss would want to hold on.",
         "Of course you want to hold on. They matter to you."],
    ),
    "love": (
        ["They have been a fixture for you. Love doesn't just turn off.",
         "This goes back a long way. Of course it still pulls.",
         "You have history here. It makes sense that you still care."],
        ["The love is a fact. This person matters to you.",
         "Anyone who cares this much would feel the pull.",
         "Of course you are drawn to them. The bond is real."],
    ),
}
for _fam, (_l4, _l5) in _FAMILY_LINES.items():
    for _i, _text in enumerate(_l4, 1):
        line(f"ci_{_fam}_l4_{_i}", _text, 4, families=[_fam], **_CI)
    for _i, _text in enumerate(_l5, 1):
        line(f"ci_{_fam}_l5_{_i}", _text, 5, families=[_fam], **_CI)

for _id, _text, _targets, _under in [
    ("ci_l3_anger_hurt", "Maybe some of this anger is hurt.", dict(families=["anger"]), ["hurt"]),
    ("ci_l3_anger_fear", "Anger is the armor. Fear is the thing wearing it.", dict(families=["anger"]), ["fear"]),
    ("ci_l3_shame_rejection", "You want to hide. That usually means you feel exposed.", dict(families=["shame"]), ["rejection"]),
    ("ci_l3_numb_overwhelm", "The circuit broke. Numb is just what overload feels like.", dict(words=["numb", "numbness"]), ["overwhelm"]),
    ("ci_l3_jealousy_fear", "Jealousy is the grip. The fear of losing them is the fuel.", dict(families=["jealousy"]), ["fear"]),
    ("ci_l3_envy_sadness", "Maybe there is sadness under the envy.", dict(families=["envy"]), ["sadness"]),
]:
    line(_id, _text, 3, bands=("steady",), underneath=_under, **_targets, **_CI)

for _i, _text in enumerate([
    "Your track record for surviving days like this is 100%. The math is on your side.",
    "You do not have to feel brave. You just have to execute the behavior.",
    "Your hands can shake while you do this. Just take the literal next step.",
    "You survived the initial hit. You know the mechanics from here.",
    "The feeling does not have to clear for you to make the right move.",
    "You have executed this before. You do not have to like it to do it.",
], 1):
    line(f"ci_l6_{_i}", _text, 6, bands=("steady",), **_CI)

for _i, (_lvl, _text) in enumerate([
    (1, "Brain is offline. Feet flat on the floor."),
    (1, "Drop the story. We aren't solving this today."),
    (1, "No thinking needed. Not yet."),
    (1, "Breathe out longer than you breathe in."),
    (1, "Stand up. Change your hand temperature."),
    (1, "Eyes up. Find a corner of the room."),
    (2, "Your body is reacting. Just breathe right now."),
    (2, "Step back. Reset. Nothing to solve."),
    (2, "Hold steady. You do not have to act."),
    (2, "A feeling is not an order. Do not answer it."),
    (2, "No decisions today. Just stay in the room."),
    (2, "Wait. This part passes."),
], 1):
    line(f"ci_flooded_{_i}", _text, _lvl, bands=("flooded",), **_CI)

for _id, _lvl, _text in [
    ("ci_generic_l4_1", 4, "You have been through a lot. The reaction is normal."),
    ("ci_generic_l4_2", 4, "This is a fast trigger for you. The reaction makes sense."),
    ("ci_generic_l4_3", 4, "This is an old groove. It makes sense you fell into it."),
    ("ci_generic_l5_1", 5, "What you are feeling is exactly right for the facts."),
    ("ci_generic_l5_2", 5, "Anyone standing where you are would feel this."),
    ("ci_generic_l5_3", 5, "You are feeling three things at once. That is normal."),
]:
    line(_id, _text, _lvl, **_CI)