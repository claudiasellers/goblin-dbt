# Editable content for the profile layer (PR-P1): the Me areas, the profile kinds (with their
# "still true?" copy and revisit policy) and the pattern-offer rules. Regenerate
# schema/profile-layer.cypher with build.py after editing.
#
# REVIEW: all copy is reviewStatus "draft" until Claudia signs it off (area/kind copy and revisit
# periods are hers). Which slices a tool may read is NOT here: that is code
# (functions/src/profile/slices.ts), so a content load can never widen what a tool reads.

VERSION = "profile-v1"
REVIEW_STATUS = "draft"

# id, label, blurb (Me surface). Order is the order on the page.
AREAS = [
    ("about_me", "About me", "What you'd like the app to call you, and what matters to you."),
    ("my_people", "My people", "The people you want help with. Nothing here unless you add it."),
    ("my_body", "My body", "Things about your body and your day the tools should respect."),
    ("my_words", "My words", "Words you've found for your feelings, and lines you've kept."),
    ("my_plans", "My plans", "Plans you've made ahead of time."),
    ("my_patterns", "My patterns", "Things that seem to help you, once you've said yes to them."),
    ("my_parts", "Parts of me", "The parts of you you've gotten to know. Only the ones you've named."),
    ("my_progress", "My progress", "How your practice is going."),
]

# id, area, label, revisitAfterDays (None = never stale), stillTrue question, setAside confirmation
KINDS = [
    ("quiet_hours", "my_body", "Quiet hours", 180,
     "Are these still your quiet hours?", "Set aside. Reminders can come at any time until you set new ones."),
    ("what_helps", "my_patterns", "What helps", 60,
     "Is this still true for you?", "Set aside. It won't shape suggestions any more."),
    ("own_line", "my_words", "Lines in my own words", None,
     "", "Set aside."),
    # Phase 2 (docs/design/parts.md, "Still true? = checking back with protectors"). {name} is the
    # person's name for the part; the part check-back flow fills it (Me's generic still-true row
    # doesn't fill slots today).
    ("part", "my_parts", "A part", 30,
     "Is {name} still doing the same job?", "Set aside. You can bring it back any time."),
    # Rewrite the nightmare (ER-15): a new version the person kept. Never stale: it is theirs until they set it aside.
    ("nightmare_script", "my_plans", "A nightmare I rewrote", None,
     "", "Set aside. It stays out of the way until you bring it back."),
]

# Pattern rules (CORE-owned). Evaluated lazily when Today loads, at most once a day per user.
# what_helps_better (ruling R3): the same tool closed better / much better at least 3 of the last 4
# times for the same pattern, within 30 days. OFF until there are 4 weeks of ToolSession data
# (D-10); Claudia enables it after reviewing real counts.
RULES = [
    {
        "id": "what_helps_better",
        "patternKind": "what_helps",
        "windowDays": 30,
        "minEvidence": 3,
        "ofLast": 4,
        "cooldownDays": 14,
        "enabled": False,
        "statementTemplate": "{toolName} tends to help you when this happens.",
        "offerCopy": "Want to keep this in Me? You can change it any time.",
    },
]
