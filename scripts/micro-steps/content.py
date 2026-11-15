"""The micro-steps (DT-01 part 2, docs/design/first-the-body.md): the lowest-difficulty interventions in the app.

The one editable source. `python3 scripts/micro-steps/build.py` writes schema/micro-steps.cypher (the graph is the source
of truth: `Intervention` nodes, `ROUTES_TO` from each `ActivationPattern` or `CrisisState`), and `fixture.py`
writes tests/fixtures/micro-steps-content.json. The file the app ships, src/data/content/micro-steps.json, is made by
scripts/content-snapshot/build.mjs (`buildMicroSteps`) from the live graph after every load (`npm run content:refresh`),
or from the schema replay (`schema_export.py`, then `build.mjs --from`) before one. They used to be hand-written in src/data/microSteps.ts (clinical content in the
frontend, plan F-rule); that file is gone.

They are served when someone taps *That feels like too much right now* on a check-in result (StateResult,
LowEnergyStateResult), on Help me now's first screen (`fallback`) and in Do the Opposite's old page's escape hatch.

CRITICAL: they are NOT random. They are keyed by the activation pattern the check-in found, because different neural
states need fundamentally different interventions:

- High arousal (acute_alarm, emotional_flooding, reactive_aggression): bottom-up autonomic / sensory input. PFC is
  compromised: no thinking tasks. Based on TIP (Linehan), the dive reflex, isometric discharge.
- Freeze / shutdown (conservation_freeze): gentle proprioceptive up-regulation. Calming tools WORSEN this state.
  Roelofs (2017), the defence-cascade literature, micro-movement titration.
- Dissociation (dissociation_overmodulation): gentle sensory anchoring to reconnect body signals. Lanius (2010, 2012),
  Somatic Experiencing.
- Vigilance (chronic_vigilance): present-moment anchoring to disengage the threat-scanning loop (BNST, attentional
  retraining).
- Rumination (rumination_loop): external focus tasks engage the task-positive network (reciprocally inhibits the DMN).
  Hamilton et al. (2015).
- Social threat / shame (social_threat_shame): outward focus and self-compassion touch, NOT self-reflection. Neff &
  Germer.
- Low reward drive (reward_drive_low): the tiniest possible behavioural activation. The enemy is inertia.

Content rules for every micro-step (build.py checks the first and the modality):
1. At most 8 words in the main instruction (parseable in one glance).
2. No failure mode (doing the thing at all is success).
3. Accessible in any physical context unless `requires_environment` (the *show me something else* rotation can skip
   those).
4. Zero cognitive load: sensory, motor or autonomic where possible.

`modality` is internal (never shown): sensory (exteroception), proprioceptive (body position, movement), autonomic
(shifts the ANS directly: cold, breath, muscle tension), attentional (redirects attention outward). It keeps
contributors clinically honest.

Ids are permanent (nothing stores them yet, but a rep or a fade will): change the words, never the id.
"""

VERSION = "micro-steps-v1"

MODALITIES = ("sensory", "proprioceptive", "autonomic", "attentional")

# Sets that aren't an activation pattern: a `CrisisState` each. `fallback`: no pattern matched, and Help me now's set
# (src/lib/spine/helpNow.ts HELP_NOW_MICRO_STEP_SET): universally safe, low-load, environment-independent.
CRISIS_STATES = {"fallback": "No pattern matched, or Help me now: universally safe, low-load steps that need nothing"}

# set id → [(id, text, subtext, modality, requires_environment)], most universally accessible first. 3–5 per set, so
# *show me something else* can rotate without repeating.
SETS = {

    # HIGH AROUSAL STATES
    # PFC compromised. Only bottom-up, autonomic/sensory input.
    # Cognitive tasks (naming, counting, listing) will FAIL here.
    "acute_alarm": [
        ("aa-1", "Push your feet into the floor.", "Press down hard. Feel the pressure.", "proprioceptive", False),
        ("aa-2", "Hold something cold.", "A glass, a can, ice — anything cool.", "autonomic", True),
        ("aa-3", "Press your palms against the wall.", "Push hard. Hold it there.", "proprioceptive", True),
        ("aa-4", "Squeeze your hands into fists.", "Hold tight. Then let go.", "autonomic", False),
        ("aa-5", "Splash cold water on your face.", "Even a few drops will do.", "autonomic", True),
    ],

    # MOST compromised state. Even simpler than acute_alarm.
    # Safety constraint: "present tools immediately with minimal cognitive demand"
    # These are purely physical — zero thought required.
    "emotional_flooding": [
        ("ef-1", "Squeeze your hands tight.", "That’s it. Just squeeze.", "autonomic", False),
        ("ef-2", "Hold something cold.", "Ice, cold water, a cold can.", "autonomic", True),
        ("ef-3", "Push your feet into the floor.", "Press down. Feel the ground.", "proprioceptive", False),
        ("ef-4", "Put your hands under cold water.", "Just let it run over them.", "autonomic", True),
    ],

    # Need to safely discharge sympathetic energy.
    # Isometric muscle engagement is key.
    "reactive_aggression": [
        ("ra-1", "Push your palms together hard.", "Hold it. Feel the effort.", "autonomic", False),
        ("ra-2", "Squeeze your hands into fists.", "Tight as you can. Then release.", "autonomic", False),
        ("ra-3", "Press your palms against the wall.", "Push hard. Hold it.", "proprioceptive", True),
        ("ra-4", "Push your feet into the floor.", "Hard. Feel the resistance.", "proprioceptive", False),
        ("ra-5", "Hold something cold.", "Cold can, ice — anything.", "autonomic", True),
    ],

    # FREEZE / SHUTDOWN
    # CRITICAL: Calming tools WORSEN this state.
    # Do NOT recommend breathing exercises or meditation.
    # Need gentle UP-regulation via proprioceptive micro-movements.
    # "Pulling out too quickly can trigger rebound panic."
    "conservation_freeze": [
        ("cf-1", "Wiggle your toes.", "Just your toes. That’s all.", "proprioceptive", False),
        ("cf-2", "Rub your hands together slowly.", "Feel the warmth build.", "proprioceptive", False),
        ("cf-3", "Press your feet into the floor.", "Gently. Notice the pressure.", "proprioceptive", False),
        ("cf-4", "Move your fingers one at a time.", "Slowly. There’s no rush.", "proprioceptive", False),
        ("cf-5", "Tap your knees gently.", "Left, right, left, right.", "proprioceptive", False),
    ],

    # DISSOCIATION / OVERMODULATION
    # PFC is OVER-active suppressing the body.
    # Need gentle sensory reconnection — titrated, not intense.
    # "Somatic Experiencing and gentle proprioceptive input are safer entry points"
    "dissociation_overmodulation": [
        ("do-1", "Touch the surface nearest to you.", "What does it feel like?", "sensory", False),
        ("do-2", "Take a sip of something.", "Notice the temperature in your mouth.", "sensory", True),
        ("do-3", "Rub your thumb across your fingertips.", "Slowly. Feel each one.", "sensory", False),
        ("do-4", "Feel the weight of your hands.", "Just notice them resting.", "proprioceptive", False),
        ("do-5", "Press your feet into the floor.", "Notice the feeling of being here.", "proprioceptive", False),
    ],

    # CHRONIC VIGILANCE
    # Attention is locked onto threat scanning (BNST-driven).
    # Need present-moment anchoring to disengage the scan.
    # NOT the same as rumination — this is external/environmental threat focus.
    "chronic_vigilance": [
        ("cv-1", "Feel your feet on the ground.", "You’re here. Right here.", "proprioceptive", False),
        ("cv-2", "Name one thing you can hear.", "Just one. That’s enough.", "attentional", False),
        ("cv-3", "Touch the surface nearest to you.", "Notice how it feels.", "sensory", False),
        ("cv-4", "Look around. Find something soft.", "Just notice it’s there.", "attentional", False),
    ],

    # RUMINATION LOOP
    # DMN hyperactivity — stuck in self-referential processing.
    # Need external focus tasks to engage task-positive network.
    # "Break the link via task-positive activities requiring external focus."
    # "Mindfulness can backfire by increasing internal focus."
    "rumination_loop": [
        ("rl-1", "Look around. Find something blue.", "Any shade counts.", "attentional", False),
        ("rl-2", "Listen. What’s the farthest sound?", "Just notice it.", "attentional", False),
        ("rl-3", "Count backwards from ten.", "Out loud or in your head.", "attentional", False),
        ("rl-4", "Name three things you can see.", "Anything at all.", "attentional", False),
        ("rl-5", "Touch something nearby. Describe it.", "Smooth? Rough? Cool? Warm?", "sensory", False),
    ],

    # SOCIAL THREAT / SHAME
    # Behavioral inhibition system active (urge to hide).
    # Self-focused attention makes it WORSE.
    # Need outward-directed sensory contact + self-compassion.
    # "Avoid tools that increase self-focus (journaling may amplify shame)"
    "social_threat_shame": [
        ("ss-1", "Put your hand on your chest.", "Just hold it there. Gently.", "proprioceptive", False),
        ("ss-2", "Feel your feet on the ground.", "You’re here. That’s enough.", "proprioceptive", False),
        ("ss-3", "Look out a window if you can.", "Just look. Nothing else.", "attentional", True),
        ("ss-4", "Touch the surface nearest to you.", "Feel something outside yourself.", "sensory", False),
        ("ss-5", "Wrap your arms around yourself.", "Hold gently. You’re okay.", "proprioceptive", False),
    ],

    # LOW REWARD DRIVE
    # NAc/dopamine pathways underactive. The enemy is inertia.
    # Need the tiniest possible behavioral activation.
    "reward_drive_low": [
        ("rd-1", "Stretch your arms above your head.", "Just for a second.", "proprioceptive", False),
        ("rd-2", "Take a sip of water.", "That’s one thing you did.", "sensory", True),
        ("rd-3", "Move one part of your body.", "Anything. A finger. Your head.", "proprioceptive", False),
        ("rd-4", "Look at something nearby.", "Just let your eyes rest on it.", "attentional", False),
    ],

    # GRIEF / YEARNING (Phase 2 pattern)
    # Attachment system reaching. Needs grounding + gentle compassion.
    # "Never use 'moving on' language"
    "grief_yearning": [
        ("gy-1", "Put your hand on your chest.", "Feel your heartbeat. You’re here.", "proprioceptive", False),
        ("gy-2", "Feel the weight of your body.", "Wherever you are. Just notice.", "proprioceptive", False),
        ("gy-3", "Touch something soft.", "A sleeve, a blanket, anything.", "sensory", False),
    ],

    # FALLBACK
    # Used when no pattern ID matches (shouldn't happen in practice,
    # but safety net for edge cases). These are universally safe,
    # low-cognitive-load, environment-independent steps.
    "fallback": [
        ("fb-1", "Press your feet into the floor.", "Feel the ground under you.", "proprioceptive", False),
        ("fb-2", "Squeeze your hands, then let go.", "Notice the difference.", "autonomic", False),
        ("fb-3", "Touch the surface nearest to you.", "Just feel it.", "sensory", False),
        ("fb-4", "Take one breath. Just one.", "You don’t have to do it a special way.", "autonomic", False),
    ],
}
