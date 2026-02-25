// ============================================================
// EMOTION WHEEL SYNC
// Syncs graph Emotion nodes to the frontend emotion wheel.
// Safe to run repeatedly (uses MERGE).
// ============================================================

UNWIND [
  // Happy family
  {id: "happy", name: "Happy", quadrant: "high-pleasant", family: "happy"},
  {id: "playful", name: "Playful", quadrant: "high-pleasant", family: "happy"},
  {id: "content", name: "Content", quadrant: "low-pleasant", family: "happy"},
  {id: "interested", name: "Interested", quadrant: "high-pleasant", family: "happy"},
  {id: "proud", name: "Proud", quadrant: "high-pleasant", family: "happy"},
  {id: "accepted", name: "Accepted", quadrant: "high-pleasant", family: "happy"},
  {id: "powerful", name: "Powerful", quadrant: "high-pleasant", family: "happy"},
  {id: "peaceful", name: "Peaceful", quadrant: "low-pleasant", family: "happy"},
  {id: "trusting", name: "Trusting", quadrant: "low-pleasant", family: "happy"},
  {id: "optimistic", name: "Optimistic", quadrant: "high-pleasant", family: "happy"},
  {id: "aroused", name: "Aroused", quadrant: "high-pleasant", family: "happy"},
  {id: "cheeky", name: "Cheeky", quadrant: "high-pleasant", family: "happy"},
  {id: "free", name: "Free", quadrant: "low-pleasant", family: "happy"},
  {id: "joyful", name: "Joyful", quadrant: "high-pleasant", family: "happy"},
  {id: "curious", name: "Curious", quadrant: "high-pleasant", family: "happy"},
  {id: "inquisitive", name: "Inquisitive", quadrant: "high-pleasant", family: "happy"},
  {id: "successful", name: "Successful", quadrant: "high-pleasant", family: "happy"},
  {id: "confident", name: "Confident", quadrant: "high-pleasant", family: "happy"},
  {id: "respected", name: "Respected", quadrant: "high-pleasant", family: "happy"},
  {id: "valued", name: "Valued", quadrant: "high-pleasant", family: "happy"},
  {id: "courageous", name: "Courageous", quadrant: "high-pleasant", family: "happy"},
  {id: "creative", name: "Creative", quadrant: "high-pleasant", family: "happy"},
  {id: "loving", name: "Loving", quadrant: "low-pleasant", family: "happy"},
  {id: "thankful", name: "Thankful", quadrant: "low-pleasant", family: "happy"},
  {id: "sensitive", name: "Sensitive", quadrant: "low-pleasant", family: "happy"},
  {id: "intimate", name: "Intimate", quadrant: "low-pleasant", family: "happy"},
  {id: "hopeful", name: "Hopeful", quadrant: "high-pleasant", family: "happy"},
  {id: "inspired", name: "Inspired", quadrant: "high-pleasant", family: "happy"},

  // Surprised family
  {id: "surprised", name: "Surprised", quadrant: "high-pleasant", family: "surprised"},
  {id: "startled", name: "Startled", quadrant: "high-pleasant", family: "surprised"},
  {id: "confused", name: "Confused", quadrant: "high-pleasant", family: "surprised"},
  {id: "amazed", name: "Amazed", quadrant: "high-pleasant", family: "surprised"},
  {id: "excited", name: "Excited", quadrant: "high-pleasant", family: "surprised"},
  {id: "shocked", name: "Shocked", quadrant: "high-pleasant", family: "surprised"},
  {id: "dismayed", name: "Dismayed", quadrant: "high-pleasant", family: "surprised"},
  {id: "disillusioned", name: "Disillusioned", quadrant: "high-pleasant", family: "surprised"},
  {id: "perplexed", name: "Perplexed", quadrant: "high-pleasant", family: "surprised"},
  {id: "astonished", name: "Astonished", quadrant: "high-pleasant", family: "surprised"},
  {id: "awe", name: "Awe", quadrant: "high-pleasant", family: "surprised"},
  {id: "eager", name: "Eager", quadrant: "high-pleasant", family: "surprised"},
  {id: "energetic", name: "Energetic", quadrant: "high-pleasant", family: "surprised"},

  // Bad family
  {id: "bad", name: "Bad", quadrant: "low-unpleasant", family: "bad"},
  {id: "tired", name: "Tired", quadrant: "low-unpleasant", family: "bad"},
  {id: "stressed", name: "Stressed", quadrant: "high-unpleasant", family: "bad"},
  {id: "busy", name: "Busy", quadrant: "high-unpleasant", family: "bad"},
  {id: "bored", name: "Bored", quadrant: "low-unpleasant", family: "bad"},
  {id: "sleepy", name: "Sleepy", quadrant: "low-unpleasant", family: "bad"},
  {id: "unfocused", name: "Unfocused", quadrant: "low-unpleasant", family: "bad"},
  {id: "out_of_control", name: "Out of control", quadrant: "high-unpleasant", family: "bad"},
  {id: "overwhelmed", name: "Overwhelmed", quadrant: "high-unpleasant", family: "bad"},
  {id: "rushed", name: "Rushed", quadrant: "high-unpleasant", family: "bad"},
  {id: "pressured", name: "Pressured", quadrant: "high-unpleasant", family: "bad"},
  {id: "apathetic", name: "Apathetic", quadrant: "low-unpleasant", family: "bad"},
  {id: "indifferent", name: "Indifferent", quadrant: "low-unpleasant", family: "bad"},

  // Fearful family
  {id: "fearful", name: "Fearful", quadrant: "high-unpleasant", family: "fearful"},
  {id: "scared", name: "Scared", quadrant: "high-unpleasant", family: "fearful"},
  {id: "anxious", name: "Anxious", quadrant: "high-unpleasant", family: "fearful"},
  {id: "insecure", name: "Insecure", quadrant: "high-unpleasant", family: "fearful"},
  {id: "weak", name: "Weak", quadrant: "high-unpleasant", family: "fearful"},
  {id: "rejected", name: "Rejected", quadrant: "high-unpleasant", family: "fearful"},
  {id: "helpless", name: "Helpless", quadrant: "high-unpleasant", family: "fearful"},
  {id: "frightened", name: "Frightened", quadrant: "high-unpleasant", family: "fearful"},
  {id: "worried", name: "Worried", quadrant: "high-unpleasant", family: "fearful"},
  {id: "inadequate", name: "Inadequate", quadrant: "high-unpleasant", family: "fearful"},
  {id: "inferior", name: "Inferior", quadrant: "high-unpleasant", family: "fearful"},
  {id: "worthless", name: "Worthless", quadrant: "high-unpleasant", family: "fearful"},
  {id: "insignificant", name: "Insignificant", quadrant: "high-unpleasant", family: "fearful"},
  {id: "excluded", name: "Excluded", quadrant: "high-unpleasant", family: "fearful"},
  {id: "persecuted", name: "Persecuted", quadrant: "high-unpleasant", family: "fearful"},
  {id: "nervous", name: "Nervous", quadrant: "high-unpleasant", family: "fearful"},
  {id: "exposed", name: "Exposed", quadrant: "high-unpleasant", family: "fearful"},

  // Angry family
  {id: "angry", name: "Angry", quadrant: "high-unpleasant", family: "angry"},
  {id: "threatened", name: "Threatened", quadrant: "high-unpleasant", family: "angry"},
  {id: "let_down", name: "Let down", quadrant: "high-unpleasant", family: "angry"},
  {id: "humiliated", name: "Humiliated", quadrant: "high-unpleasant", family: "angry"},
  {id: "bitter", name: "Bitter", quadrant: "high-unpleasant", family: "angry"},
  {id: "mad", name: "Mad", quadrant: "high-unpleasant", family: "angry"},
  {id: "aggressive", name: "Aggressive", quadrant: "high-unpleasant", family: "angry"},
  {id: "frustrated", name: "Frustrated", quadrant: "high-unpleasant", family: "angry"},
  {id: "distant", name: "Distant", quadrant: "high-unpleasant", family: "angry"},
  {id: "critical", name: "Critical", quadrant: "high-unpleasant", family: "angry"},
  {id: "betrayed", name: "Betrayed", quadrant: "high-unpleasant", family: "angry"},
  {id: "resentful", name: "Resentful", quadrant: "high-unpleasant", family: "angry"},
  {id: "disrespected", name: "Disrespected", quadrant: "high-unpleasant", family: "angry"},
  {id: "ridiculed", name: "Ridiculed", quadrant: "high-unpleasant", family: "angry"},
  {id: "indignant", name: "Indignant", quadrant: "high-unpleasant", family: "angry"},
  {id: "violated", name: "Violated", quadrant: "high-unpleasant", family: "angry"},
  {id: "furious", name: "Furious", quadrant: "high-unpleasant", family: "angry"},
  {id: "jealous", name: "Jealous", quadrant: "high-unpleasant", family: "angry"},
  {id: "provoked", name: "Provoked", quadrant: "high-unpleasant", family: "angry"},
  {id: "hostile", name: "Hostile", quadrant: "high-unpleasant", family: "angry"},
  {id: "infuriated", name: "Infuriated", quadrant: "high-unpleasant", family: "angry"},
  {id: "annoyed", name: "Annoyed", quadrant: "high-unpleasant", family: "angry"},
  {id: "withdrawn", name: "Withdrawn", quadrant: "high-unpleasant", family: "angry"},
  {id: "numb", name: "Numb", quadrant: "high-unpleasant", family: "angry"},
  {id: "skeptical", name: "Skeptical", quadrant: "high-unpleasant", family: "angry"},
  {id: "dismissive", name: "Dismissive", quadrant: "high-unpleasant", family: "angry"},

  // Disgusted family
  {id: "disgusted", name: "Disgusted", quadrant: "low-unpleasant", family: "disgusted"},
  {id: "disapproving", name: "Disapproving", quadrant: "low-unpleasant", family: "disgusted"},
  {id: "disappointed", name: "Disappointed", quadrant: "low-unpleasant", family: "disgusted"},
  {id: "awful", name: "Awful", quadrant: "low-unpleasant", family: "disgusted"},
  {id: "repelled", name: "Repelled", quadrant: "low-unpleasant", family: "disgusted"},
  {id: "judgmental", name: "Judgmental", quadrant: "low-unpleasant", family: "disgusted"},
  {id: "embarrassed", name: "Embarrassed", quadrant: "low-unpleasant", family: "disgusted"},
  {id: "appalled", name: "Appalled", quadrant: "low-unpleasant", family: "disgusted"},
  {id: "revolted", name: "Revolted", quadrant: "low-unpleasant", family: "disgusted"},
  {id: "nauseated", name: "Nauseated", quadrant: "low-unpleasant", family: "disgusted"},
  {id: "detestable", name: "Detestable", quadrant: "low-unpleasant", family: "disgusted"},
  {id: "horrified", name: "Horrified", quadrant: "low-unpleasant", family: "disgusted"},
  {id: "hesitant", name: "Hesitant", quadrant: "low-unpleasant", family: "disgusted"},

  // Sad family
  {id: "sad", name: "Sad", quadrant: "low-unpleasant", family: "sad"},
  {id: "lonely", name: "Lonely", quadrant: "low-unpleasant", family: "sad"},
  {id: "vulnerable", name: "Vulnerable", quadrant: "low-unpleasant", family: "sad"},
  {id: "despair", name: "Despair", quadrant: "low-unpleasant", family: "sad"},
  {id: "guilty", name: "Guilty", quadrant: "low-unpleasant", family: "sad"},
  {id: "depressed", name: "Depressed", quadrant: "low-unpleasant", family: "sad"},
  {id: "hurt", name: "Hurt", quadrant: "low-unpleasant", family: "sad"},
  {id: "isolated", name: "Isolated", quadrant: "low-unpleasant", family: "sad"},
  {id: "abandoned", name: "Abandoned", quadrant: "low-unpleasant", family: "sad"},
  {id: "victimized", name: "Victimized", quadrant: "low-unpleasant", family: "sad"},
  {id: "fragile", name: "Fragile", quadrant: "low-unpleasant", family: "sad"},
  {id: "grief", name: "Grief", quadrant: "low-unpleasant", family: "sad"},
  {id: "powerless", name: "Powerless", quadrant: "low-unpleasant", family: "sad"},
  {id: "ashamed", name: "Ashamed", quadrant: "low-unpleasant", family: "sad"},
  {id: "remorseful", name: "Remorseful", quadrant: "low-unpleasant", family: "sad"},
  {id: "empty", name: "Empty", quadrant: "low-unpleasant", family: "sad"}
] AS emotion
MERGE (e:Emotion {id: emotion.id})
SET e.name = emotion.name,
    e.quadrant = emotion.quadrant,
    e.family = emotion.family;

// Related emotions: tie each family to its core emotion.
UNWIND [
  {family: "happy", core: "happy"},
  {family: "surprised", core: "surprised"},
  {family: "bad", core: "bad"},
  {family: "fearful", core: "fearful"},
  {family: "angry", core: "angry"},
  {family: "disgusted", core: "disgusted"},
  {family: "sad", core: "sad"}
] AS familyCore
MATCH (core:Emotion {id: familyCore.core})
MATCH (member:Emotion {family: familyCore.family})
WHERE member.id <> core.id
MERGE (core)-[:RELATED_TO]->(member)
MERGE (member)-[:RELATED_TO]->(core);

// Opposite families.
UNWIND [
  {left: "happy", right: "sad"},
  {left: "surprised", right: "disgusted"},
  {left: "fearful", right: "angry"},
  {left: "bad", right: "happy"}
] AS pair
MATCH (a:Emotion {family: pair.left})
MATCH (b:Emotion {family: pair.right})
WHERE a.id <> b.id
MERGE (a)-[:OPPOSITE_OF]->(b)
MERGE (b)-[:OPPOSITE_OF]->(a);
