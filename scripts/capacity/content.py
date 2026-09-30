# Editable content for the capacity band (ER-01, plan A4-1). Regenerate schema/capacity.cypher
# with build.py after editing. The band replaces 0–10 scales: steady · stirred · flooded.
#
# ONE editable source for the probe: scripts/find-the-feeling/content.py imports PROBE_DEFAULT and
# BAND_INTENSITY from here, so schema/find-the-feeling.cypher regenerates byte-identical.
#
# REVIEW (D-07): the relational wording, "I can't tell", and all hand-off copy are drafts
# (reviewStatus "draft") until Claudia signs them off. The default wording is FTF's shipped copy.
# Voice rules (E3 §A5.2.4): no cheer, no "should", no "just", no numbers.

VERSION = "capacity-v1"
REVIEW_STATUS = "draft"
FRESH_MINUTES = 20  # Index §5.1 #9: a reading is "current" for 20 minutes (client-only carry, R1)

BANDS = ["steady", "stirred", "flooded"]

# CheckIn.intensityY compatibility (FTF precedent; getStateAndTools' y-heuristic until E4-3).
BAND_INTENSITY = {"steady": 0.35, "stirred": 0.6, "flooded": 0.85}

# The probe. `default` is FTF's shipped copy (key order matters: FTF's file is generated from it).
PROBE_DEFAULT = {
    "prompt": "If someone asked you for a favour right now, you'd…",
    "incoming": "hey, could you help me with something?",
    "options": {"steady": "Say yes like normal", "stirred": "Say yes, but with an edge", "flooded": "Couldn't answer, or would regret it"},
}
# Relational variant (IE/WMP): {label} is a Person's label; `someone` is used whenever there is no
# Person or the person isn't safe. Phase A has no Person, so DEAR MAN always gets `someone`.
PROBE_RELATIONAL = {
    "prompt": "If {label} texted you right now, you'd…",
    "someone": "If they texted you right now, you'd…",
    "incoming": "hey, can we talk?",
    "options": {"steady": "Reply like normal", "stirred": "Reply with an edge", "flooded": "Couldn't reply, or would regret it"},
}
CANT_TELL = "I can't tell"  # D-07: shared component only (-> stirred); FTF's rooms keep three options

# Then-vs-now after a hand-off primitive (ruling R3: canonical ids, `down` wording).
THEN_VS_NOW = ["worse", "same", "better", "much_better"]
REREAD_DOWN = {"worse": "Louder", "same": "About the same", "better": "Quieter", "much_better": "Much quieter"}

HANDOFF = {
    "card": {
        "body": "This is a body moment, not a thinking moment. That's not you failing; it's what brains do when they're this loud.",
        "start": "Start",
        "keepGoing": "Keep going anyway",
        "keepGoingHeadsUp": "Thinking may feel slippery right now. Short answers are fine.",
    },
    "reread": {"prompt": "Compared to a minute ago, it's…", "options": REREAD_DOWN},
    "resumeLine": "Picking up where we were.",
    "secondLead": "One more, a different way.",
    "resumeStale": "You were in the middle of something earlier.",
    "later": {
        "offer": "Come back to this later",
        "options": [{"id": "1h", "label": "In an hour"}, {"id": "evening", "label": "This evening"}, {"id": "tomorrow", "label": "Tomorrow"}],
        "scheduled": "Saved for later. It will keep.",
        "holding": "You can stop here. Nothing is lost.",
    },
    "tooMuchLink": "This is too much right now",
}

# Hand-off primitives (interim until DT-01's dt.regulate). Both are built and reviewed already:
# sigh = Recover's breathe step (BreathOrb), orient = FTF's orient step (Orient). The copy is
# duplicated from those files; tests/capacity-content.test.mjs guards drift until WMP-02 moves
# Recover onto HandoffPrimitive.
SIGH_COPY = {
    "title": "Let the air out slowly",
    "sub": "Two breaths in through the nose, then a long exhale through the mouth. Three rounds.",
    "phases": [{"key": "in", "label": "In through your nose", "ms": 2200}, {"key": "sip", "label": "Sip a little more", "ms": 900}, {"key": "out", "label": "Long, slow exhale", "ms": 5600}],
    "cycles": 3,
    "start": "Start · about {seconds} seconds",
    "skip": "I'm calmer, skip ahead",
    "done": "Good.",
}
ORIENT_COPY = {
    "title": "Come back into the room", "sub": "Before any words. Just get your bearings.",
    "look": "Look around slowly. Each time something catches your eye, tap a circle.",
    "move": "Stand up and shake out your hands", "moveSeconds": 20, "startMove": "Start", "skip": "Skip this", "seen": "{n} of 3 found",
}
PRIMITIVES = [
    # id, component, direction, bands, blank, rank, conceptId, copy
    ("sigh", "breath_orb", "calm", BANDS, "any", 0, "cyclic_sighing", SIGH_COPY),
    ("orient", "orient", "orient", BANDS, "any", 1, "se_orienting", ORIENT_COPY),
]

# Band rules: only what Phase A reads (A4-4 DEAR MAN). Other tools seed theirs in their passes.
# mode: full | short | handoff | notOffered; headsUp: which heads-up the host shows.
BAND_RULES = [
    ("dear-man", "dbt_dear_man", "steady", "full", None),
    ("dear-man", "dbt_dear_man", "stirred", "full", "summary"),
    ("dear-man", "dbt_dear_man", "flooded", "handoff", None),
]

SOURCES = [
    ("arnsten_2009", "Arnsten (2009), Nature Reviews Neuroscience — stress signalling pathways that impair prefrontal cortex structure and function", "https://doi.org/10.1038/nrn2648"),
    ("suvak_2011", "Suvak et al. (2011), Journal of Abnormal Psychology — emotional granularity and borderline personality disorder", "https://doi.org/10.1037/a0021808"),
]
PROBE_SOURCE_IDS = ["arnsten_2009", "suvak_2011", "linehan_skills_2015"]
