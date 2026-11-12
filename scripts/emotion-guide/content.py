"""Know this feeling (ER-10; DBT ER Handouts 3-6): the feeling guide, the ONE editable source for
schema/emotion-guide.cypher. Spec: docs/design/emotion-guide.md.

One FeelingGuide per DBT emotion family: the nine with EmotionRegulationContent (linked GUIDES, so the card's
urges are that parent's emotion ActionUrges and its words are the parent's words) and happiness, which has no
EmotionRegulationContent on purpose: adding one would grow every loop over parents (Do the Opposite's doors,
parentOf, Problem Solve, Insights, the witness corpus). Happiness words are linked IN_GUIDE instead.

Each guide:
  label      the family's name on the card ("Fear")
  function   what the feeling is for (H3, paraphrased): one flat sentence, no "should"
  prompts    what often sets it off (H6's prompting events, paraphrased): recognition, never criteria
  ladder     grid words, milder to stronger (the differentiation tap; empty when the family has one word)
  body_map   the BodyMap whose signed-off places the card shows (None: no body section)
  held       emotion urges the card never lists, each with a reason

Regenerate:  python3 scripts/emotion-guide/build.py   (--check for freshness)
"""

VERSION = "eg-v1"

# (id, label, function, prompts, ladder, body_map, held urges {id: reason})
GUIDES = [
    ("fear", "Fear",
     "Fear warns you about danger and gets your body ready to protect you.",
     ["Something could hurt you or someone you love", "You might lose something or someone that matters",
      "Something new or uncertain is coming"],
     ["worried", "nervous", "scared", "frightened"], "fear", {}),
    ("anger", "Anger",
     "Anger tells you something is in the way or unfair, and gives you energy to stand up to it.",
     ["Something you want is blocked", "You or someone you care about is treated unfairly",
      "Someone crosses a line that matters to you"],
     ["annoyed", "frustrated", "angry", "furious"], "anger", {}),
    ("sadness", "Sadness",
     "Sadness tells you something that matters is lost, and helps you slow down and reach for others.",
     ["Losing someone or something you care about", "Things not turning out the way you hoped",
      "Missing someone who isn't here"],
     ["disappointed", "sad", "despair"], "sadness", {}),
    ("shame", "Shame",
     "Shame warns you that something you did, or something about you, could get you pushed out, and pulls you to hide.",
     ["Feeling others would turn away if they knew", "Being laughed at or put down",
      "Being criticized in front of people"],
     ["embarrassed", "ashamed", "humiliated"], "shame",
     # Next to humiliated, "disappear" reads close to not wanting to exist (gate 3); Do the Opposite still lists it.
     {"shame-hide": "ideation-adjacent next to humiliated; Do the Opposite still lists it"}),
    ("guilt", "Guilt",
     "Guilt tells you something you did goes against your own values, and pulls you to make it right.",
     ["Doing or saying something you think was wrong", "Not doing something you said you would",
      "Hurting someone, even by accident"],
     ["guilty", "remorseful"], "guilt",
     # Self-harm adjacent: Do the Opposite opens safety.open over it; a recognition card doesn't list it (gate 3).
     {"guilt-punish": "self-harm adjacent; Do the Opposite meets it with safety.open"}),
    ("disgust", "Disgust",
     "Disgust protects you from things that feel dirty or wrong, and pulls you away from them.",
     ["Something that seems rotten or unclean", "Someone acting in a way you find wrong",
      "Being too close to something you want away from"],
     ["disapproving", "disgusted", "revolted"], "disgust", {}),
    ("jealousy", "Jealousy",
     "Jealousy tells you a relationship you value might be taken away, and pulls you to guard it.",
     ["Someone getting close to a person you care about", "Being left out by someone who matters to you",
      "Fearing you'll lose someone's attention"],
     [], "fear", {}),
    ("envy", "Envy",
     "Envy tells you someone has something you want, and can push you to work for it.",
     ["Someone having something you want and don't have", "Seeing others get what you hoped for",
      "Comparing yourself and coming up short"],
     [], None, {}),
    ("love", "Love",
     "Love draws you toward people and things that matter to you, and helps you stay close.",
     ["Someone being kind or caring toward you", "Time with someone you feel close to",
      "Thinking about someone who means a lot to you"],
     ["tender", "loving"], "love",
     # Shown as an ordinary pull of love, it can normalise pursuing someone who said no (gate 3, next to love-stalk).
     {"love-proximity": "pursuit-adjacent next to love-stalk; Do the Opposite still lists it"}),
    ("happiness", "Happiness",
     "Happiness tells you something is going well, and pulls you to do more of it and share it.",
     ["Something going better than you expected", "Doing something you enjoy", "Being with people you like"],
     ["content", "happy", "joyful"], "joy", {}),
]

# Grid words in the happiness family (DBT's happiness words: joy, contentment, pride, optimism, eagerness,
# excitement, satisfaction). Calm words (calm, relaxed, peaceful) and surprise words stay without a guide.
HAPPINESS_WORDS = ["happy", "joyful", "playful", "proud", "optimistic", "hopeful", "content", "satisfied",
                   "excited", "eager"]

# How many signed-off body places and emotion urges a card shows (the strongest / first by order).
BODY_PLACES = 3
URGES = 3
