export interface Tool {
  id: string;
  name: string;
  tagline: string;
  description: string;
  whenToUse: string;
  categoryId: string;
  subcategoryId: string;
  dbtBasis?: string; // Optional: the DBT skill this is based on
  emoji: string;
}

export const tools: Tool[] = [
  // ============================================
  // 🆘 I NEED HELP RIGHT NOW (Distress Tolerance)
  // ============================================

  // --- Quick calming techniques ---
  {
    id: 'cool-down',
    name: 'Cool Down',
    tagline: 'Use temperature to calm fast',
    description: 'Cold water or ice can quickly shift your body out of crisis mode by triggering your dive reflex.',
    whenToUse: 'When emotions are at a 7+ out of 10 and you need fast relief.',
    categoryId: 'help-right-now',
    subcategoryId: 'quick-calming',
    dbtBasis: 'TIP - Temperature',
    emoji: '🧊',
  },
  {
    id: 'intense-exercise',
    name: 'Burn It Off',
    tagline: 'Use intense exercise to reset',
    description: 'Short bursts of intense physical activity metabolize stress hormones and shift your nervous system out of fight-or-flight.',
    whenToUse: 'When you\'re flooded with anger, anxiety, or restless energy that won\'t settle.',
    categoryId: 'help-right-now',
    subcategoryId: 'quick-calming',
    dbtBasis: 'TIP - Intense Exercise',
    emoji: '🏃',
  },
  {
    id: 'paced-breathing',
    name: 'Paced Breathing',
    tagline: 'Slow your breath, slow your mind',
    description: 'Breathing out longer than you breathe in activates your parasympathetic nervous system, signaling safety to your body.',
    whenToUse: 'When your heart is racing, you feel panicky, or you can\'t think clearly.',
    categoryId: 'help-right-now',
    subcategoryId: 'quick-calming',
    dbtBasis: 'TIP - Paced Breathing',
    emoji: '🌬️',
  },
  {
    id: 'paired-muscle-relax',
    name: 'Tense & Release',
    tagline: 'Release tension from your body',
    description: 'Systematically tensing and releasing muscle groups while breathing helps your body let go of the physical grip of stress.',
    whenToUse: 'When your body is tight, clenched, or holding stress you can\'t shake.',
    categoryId: 'help-right-now',
    subcategoryId: 'quick-calming',
    dbtBasis: 'TIP - Paired Muscle Relaxation',
    emoji: '💪',
  },

  // --- Grounding exercises ---
  {
    id: 'five-senses',
    name: '5-4-3-2-1',
    tagline: 'Ground yourself through your senses',
    description: 'Notice things around you using each of your five senses to anchor yourself in the present moment.',
    whenToUse: 'When you feel disconnected, anxious, or caught up in racing thoughts.',
    categoryId: 'help-right-now',
    subcategoryId: 'grounding',
    dbtBasis: '5-4-3-2-1 Grounding',
    emoji: '👁️',
  },
  {
    id: 'body-scan',
    name: 'Body Scan',
    tagline: 'Notice what your body is telling you',
    description: 'Slowly move your attention through each part of your body, noticing sensations without trying to change them. This reconnects mind and body.',
    whenToUse: 'When you feel numb, disconnected, or need to come back into your body.',
    categoryId: 'help-right-now',
    subcategoryId: 'grounding',
    dbtBasis: 'Body Scan Meditation',
    emoji: '🧘',
  },
  {
    id: 'self-soothe',
    name: 'Self-Soothe',
    tagline: 'Comfort yourself through your senses',
    description: 'Deliberately engage each of your five senses with something comforting — a soft blanket, calming music, a warm drink. Different from grounding: this is about comfort, not anchoring.',
    whenToUse: 'When you need gentleness and comfort, not just distraction.',
    categoryId: 'help-right-now',
    subcategoryId: 'grounding',
    dbtBasis: 'Self-Soothing with Five Senses',
    emoji: '🫶',
  },

  // --- Emergency coping strategies ---
  {
    id: 'pause',
    name: 'Pause',
    tagline: 'Stop before you act',
    description: 'A quick mental checklist to interrupt impulsive reactions and give yourself space to choose your response.',
    whenToUse: 'When you\'re about to say or do something you might regret.',
    categoryId: 'help-right-now',
    subcategoryId: 'emergency-coping',
    dbtBasis: 'STOP Skill',
    emoji: '✋',
  },
  {
    id: 'pros-and-cons',
    name: 'Pros & Cons',
    tagline: 'Think through the crisis urge',
    description: 'List the pros and cons of acting on a crisis urge AND of resisting it. Seeing it on paper makes the wise choice clearer.',
    whenToUse: 'When you have a strong urge to do something destructive and need perspective.',
    categoryId: 'help-right-now',
    subcategoryId: 'emergency-coping',
    dbtBasis: 'Pros and Cons (Crisis)',
    emoji: '⚖️',
  },
  {
    id: 'wise-mind-accepts',
    name: 'ACCEPTS',
    tagline: 'Distract yourself skillfully',
    description: 'Seven healthy distraction strategies: Activities, Contributing, Comparisons, Emotions (opposite), Pushing away, Thoughts, and Sensations.',
    whenToUse: 'When you need to get through a rough moment and direct coping isn\'t working yet.',
    categoryId: 'help-right-now',
    subcategoryId: 'emergency-coping',
    dbtBasis: 'Wise Mind ACCEPTS',
    emoji: '🎯',
  },

  // --- Ride-out-the-wave tools ---
  {
    id: 'urge-surfing',
    name: 'Urge Surfing',
    tagline: 'Ride the wave without acting',
    description: 'Observe your urges like waves that rise, peak, and fall—without needing to act on them.',
    whenToUse: 'When you have a strong urge to do something harmful or unhelpful.',
    categoryId: 'help-right-now',
    subcategoryId: 'ride-the-wave',
    dbtBasis: 'Urge Surfing / Distress Tolerance',
    emoji: '🌊',
  },
  {
    id: 'improve-moment',
    name: 'IMPROVE the Moment',
    tagline: 'Make right now more bearable',
    description: 'Seven ways to improve a painful moment: Imagery, Meaning, Prayer/meditation, Relaxation, One thing at a time, Vacation (brief), and Encouragement.',
    whenToUse: 'When you\'re stuck in a painful situation you can\'t leave and need to make it through.',
    categoryId: 'help-right-now',
    subcategoryId: 'ride-the-wave',
    dbtBasis: 'IMPROVE the Moment',
    emoji: '🌈',
  },

  // ============================================
  // 💚 I WANT TO FEEL BETTER (Emotion Regulation)
  // ============================================

  // --- Understanding my emotions ---
  {
    id: 'name-it',
    name: 'Name It',
    tagline: 'Identify what you\'re feeling',
    description: 'Naming your emotion precisely can reduce its intensity. "Name it to tame it."',
    whenToUse: 'When you\'re feeling something intense but aren\'t sure exactly what.',
    categoryId: 'feel-better',
    subcategoryId: 'understanding-emotions',
    dbtBasis: 'Emotion Labeling',
    emoji: '🏷️',
  },
  {
    id: 'emotion-functions',
    name: 'What Emotions Do',
    tagline: 'Understand why you feel this way',
    description: 'Every emotion has a function — it communicates something, motivates action, or signals a need. Understanding this reduces the feeling that emotions are random or broken.',
    whenToUse: 'When an emotion feels irrational or you\'re frustrated with yourself for feeling it.',
    categoryId: 'feel-better',
    subcategoryId: 'understanding-emotions',
    dbtBasis: 'Functions of Emotions',
    emoji: '🔬',
  },
  {
    id: 'emotion-myths',
    name: 'Emotion Myths',
    tagline: 'Challenge beliefs about feelings',
    description: 'Common myths like "I shouldn\'t feel this way" or "showing emotion is weakness" keep us stuck. Identifying and challenging these myths frees you to respond more wisely.',
    whenToUse: 'When you\'re judging yourself for having feelings or trying to suppress them.',
    categoryId: 'feel-better',
    subcategoryId: 'understanding-emotions',
    dbtBasis: 'Myths About Emotions',
    emoji: '💭',
  },
  {
    id: 'check-the-facts',
    name: 'Check the Facts',
    tagline: 'Is this emotion fitting the situation?',
    description: 'Walk through what actually happened versus what your emotion is telling you. Often the intensity doesn\'t match the facts — and seeing that clearly changes everything.',
    whenToUse: 'When your emotional reaction feels bigger than the situation warrants.',
    categoryId: 'feel-better',
    subcategoryId: 'understanding-emotions',
    dbtBasis: 'Check the Facts',
    emoji: '🔍',
  },

  // --- Changing how I feel ---
  {
    id: 'opposite-action',
    name: 'Do the Opposite',
    tagline: 'Act opposite to unhelpful urges',
    description: 'When an emotion\'s action urge isn\'t helpful, doing the opposite can shift how you feel.',
    whenToUse: 'When your emotion is pushing you toward something that won\'t help.',
    categoryId: 'feel-better',
    subcategoryId: 'changing-feelings',
    dbtBasis: 'Opposite Action',
    emoji: '🔄',
  },
  {
    id: 'problem-solve',
    name: 'Problem Solve',
    tagline: 'Address the cause of distress',
    description: 'When the emotion fits the facts and the situation can be changed, problem-solving is the right move. Break the problem into steps and take action.',
    whenToUse: 'When your distress is about a real problem that has a solution.',
    categoryId: 'feel-better',
    subcategoryId: 'changing-feelings',
    dbtBasis: 'Problem Solving',
    emoji: '🛠️',
  },
  {
    id: 'cope-ahead',
    name: 'Cope Ahead',
    tagline: 'Plan for difficult situations',
    description: 'Mentally rehearse how you\'ll handle an upcoming stressful situation using your skills. Like a fire drill for emotions — you practice so you\'re ready.',
    whenToUse: 'Before a situation you know will be emotionally difficult.',
    categoryId: 'feel-better',
    subcategoryId: 'changing-feelings',
    dbtBasis: 'Cope Ahead',
    emoji: '🗺️',
  },

  // --- Accepting what I can't change ---
  {
    id: 'let-it-be',
    name: 'Let It Be',
    tagline: 'Accept this moment as it is',
    description: 'Sometimes fighting reality causes more suffering than the reality itself. This tool helps you practice acceptance.',
    whenToUse: 'When you\'re struggling against something you cannot change.',
    categoryId: 'feel-better',
    subcategoryId: 'accepting',
    dbtBasis: 'Radical Acceptance',
    emoji: '🍃',
  },
  {
    id: 'turning-the-mind',
    name: 'Turning the Mind',
    tagline: 'Choose acceptance again and again',
    description: 'Acceptance isn\'t a one-time decision — it\'s a choice you make repeatedly. Each time your mind drifts back to fighting reality, gently turn it back toward acceptance.',
    whenToUse: 'When you\'ve accepted something but keep getting pulled back into anger or denial.',
    categoryId: 'feel-better',
    subcategoryId: 'accepting',
    dbtBasis: 'Turning the Mind',
    emoji: '🔁',
  },
  {
    id: 'willingness',
    name: 'Willingness',
    tagline: 'Open yourself to what is',
    description: 'Willingness means participating fully in life as it is, rather than fighting or withdrawing. The opposite — willfulness — is refusing to tolerate the moment or insisting it be different.',
    whenToUse: 'When you notice yourself shutting down, giving up, or stubbornly refusing to cope.',
    categoryId: 'feel-better',
    subcategoryId: 'accepting',
    dbtBasis: 'Willingness vs. Willfulness',
    emoji: '🚪',
  },
  {
    id: 'half-smile',
    name: 'Half-Smile & Willing Hands',
    tagline: 'Use your body to soften your mind',
    description: 'A slight smile and open, relaxed hands send signals to your brain that you\'re safe and willing. Your body posture changes your emotional state.',
    whenToUse: 'When you\'re tense, resistant, or bracing against a difficult feeling.',
    categoryId: 'feel-better',
    subcategoryId: 'accepting',
    dbtBasis: 'Half-Smiling and Willing Hands',
    emoji: '😌',
  },
  {
    id: 'mindfulness-emotions',
    name: 'Sit With It',
    tagline: 'Observe your emotion without reacting',
    description: 'Watch your emotion like a wave — notice it, name it, feel where it lives in your body, and let it pass without pushing it away or holding on.',
    whenToUse: 'When a painful emotion is present and you want to process it rather than avoid it.',
    categoryId: 'feel-better',
    subcategoryId: 'accepting',
    dbtBasis: 'Mindfulness of Current Emotions',
    emoji: '🪷',
  },
  {
    id: 'mindfulness-thoughts',
    name: 'Watch Your Thoughts',
    tagline: 'See thoughts as thoughts, not facts',
    description: 'Practice observing your thoughts like clouds passing through the sky — they come and go, but they aren\'t you and they aren\'t necessarily true.',
    whenToUse: 'When you\'re caught in rumination, worry spirals, or self-critical thinking.',
    categoryId: 'feel-better',
    subcategoryId: 'accepting',
    dbtBasis: 'Mindfulness of Current Thoughts',
    emoji: '☁️',
  },

  // --- Building positive experiences ---
  {
    id: 'one-good-thing',
    name: 'One Good Thing',
    tagline: 'Add a small positive to your day',
    description: 'Intentionally doing one pleasant activity, no matter how small, builds positive emotions over time.',
    whenToUse: 'When you need a mood boost or want to build more joy into your life.',
    categoryId: 'feel-better',
    subcategoryId: 'positive-experiences',
    dbtBasis: 'Accumulate Positives (Short-Term)',
    emoji: '✨',
  },
  {
    id: 'long-term-positives',
    name: 'Build Toward What Matters',
    tagline: 'Pursue goals aligned with your values',
    description: 'Identify values-driven goals and take small steps toward them. Long-term positive experiences come from building a life that feels meaningful, not just pleasant.',
    whenToUse: 'When you want to invest in lasting wellbeing, not just temporary relief.',
    categoryId: 'feel-better',
    subcategoryId: 'positive-experiences',
    dbtBasis: 'Accumulate Positives (Long-Term)',
    emoji: '🎯',
  },

  // ============================================
  // 🤝 I WANT BETTER RELATIONSHIPS (Interpersonal Effectiveness)
  // ============================================

  // --- Asking for what I need ---
  {
    id: 'dear-man',
    name: 'DEAR MAN',
    tagline: 'Ask for what you need effectively',
    description: 'A step-by-step framework: Describe the situation, Express feelings, Assert your need, Reinforce why it matters. Stay Mindful, Appear confident, Negotiate if needed.',
    whenToUse: 'When you need to ask for something important and want to be heard.',
    categoryId: 'better-relationships',
    subcategoryId: 'asking-needs',
    dbtBasis: 'DEAR MAN',
    emoji: '🗣️',
  },
  {
    id: 'clarify-goals',
    name: 'Clarify Your Goals',
    tagline: 'Know what you\'re really asking for',
    description: 'Before a conversation, get clear on three things: What\'s my objective? What relationship do I want to maintain? What self-respect do I need to keep? This prevents mixed signals.',
    whenToUse: 'Before a difficult conversation when you\'re unsure what outcome you want.',
    categoryId: 'better-relationships',
    subcategoryId: 'asking-needs',
    dbtBasis: 'Clarifying Priorities (Objectives Effectiveness)',
    emoji: '🎯',
  },
  {
    id: 'dime-game',
    name: 'How Hard to Push',
    tagline: 'Gauge how strongly to ask or say no',
    description: 'Rate factors like capability, authority, relationship, and your rights to decide how firmly to make your request or hold your boundary. Not every situation calls for the same intensity.',
    whenToUse: 'When you\'re unsure whether to push harder or back off in a request.',
    categoryId: 'better-relationships',
    subcategoryId: 'asking-needs',
    dbtBasis: 'DIME Game (Intensity of Asking/Saying No)',
    emoji: '🎚️',
  },

  // --- Setting boundaries ---
  {
    id: 'fast',
    name: 'FAST',
    tagline: 'Keep your self-respect while saying no',
    description: 'Be Fair to yourself and others, don\'t Apologize excessively, Stick to your values, and be Truthful. Saying no doesn\'t make you a bad person.',
    whenToUse: 'When you need to set a boundary but feel guilty or afraid of judgment.',
    categoryId: 'better-relationships',
    subcategoryId: 'setting-boundaries',
    dbtBasis: 'FAST',
    emoji: '🛡️',
  },
  {
    id: 'self-validate',
    name: 'Self-Validation',
    tagline: 'Acknowledge your own experience',
    description: 'Validate your own emotions, thoughts, and needs — especially when others don\'t. You don\'t need permission to feel what you feel.',
    whenToUse: 'When you\'re doubting yourself, minimizing your feelings, or waiting for someone else to say it\'s okay to feel this way.',
    categoryId: 'better-relationships',
    subcategoryId: 'setting-boundaries',
    dbtBasis: 'Self-Validation',
    emoji: '💛',
  },

  // --- Handling conflict ---
  {
    id: 'give',
    name: 'GIVE',
    tagline: 'Keep the relationship while being honest',
    description: 'Be Gentle (no attacks), act Interested (listen), Validate their perspective, use an Easy manner (lighten up). This protects the relationship during hard conversations.',
    whenToUse: 'When you need to address something difficult without damaging the relationship.',
    categoryId: 'better-relationships',
    subcategoryId: 'handling-conflict',
    dbtBasis: 'GIVE',
    emoji: '🤲',
  },
  {
    id: 'dialectics',
    name: 'Both/And Thinking',
    tagline: 'Hold two truths at once',
    description: 'Replace "but" with "and." Two things can be true at the same time: I can be angry AND love this person. I can be doing my best AND need to do better. This is dialectics.',
    whenToUse: 'When you\'re stuck in all-or-nothing thinking about a person or situation.',
    categoryId: 'better-relationships',
    subcategoryId: 'handling-conflict',
    dbtBasis: 'Dialectics / Walking the Middle Path',
    emoji: '⚖️',
  },
  {
    id: 'recover-invalidation',
    name: 'Recover from Invalidation',
    tagline: 'Bounce back when you feel dismissed',
    description: 'When someone dismisses or minimizes your experience, it hurts. This skill helps you acknowledge the sting, validate yourself, and decide how to respond.',
    whenToUse: 'When someone made you feel like your feelings don\'t matter.',
    categoryId: 'better-relationships',
    subcategoryId: 'handling-conflict',
    dbtBasis: 'Recovering from Invalidation',
    emoji: '🧱',
  },

  // --- Staying connected while disagreeing ---
  {
    id: 'validate-others',
    name: 'Validate Others',
    tagline: 'Show you understand their perspective',
    description: 'Validation doesn\'t mean agreeing — it means communicating that the other person\'s feelings make sense given their experience. This is the fastest way to de-escalate.',
    whenToUse: 'When someone is upset and you want to show you hear them, even if you disagree.',
    categoryId: 'better-relationships',
    subcategoryId: 'staying-connected',
    dbtBasis: 'Validation',
    emoji: '👂',
  },
  {
    id: 'mindfulness-of-others',
    name: 'Mindfulness of Others',
    tagline: 'Really see the person in front of you',
    description: 'Pay attention to what the other person is actually saying, feeling, and needing — without planning your response or making assumptions.',
    whenToUse: 'When you notice you\'re more focused on being right than on understanding.',
    categoryId: 'better-relationships',
    subcategoryId: 'staying-connected',
    dbtBasis: 'Mindfulness of Others',
    emoji: '🪞',
  },
  {
    id: 'finding-connection',
    name: 'Finding Connection',
    tagline: 'Build and strengthen social bonds',
    description: 'Practical strategies for finding people, building rapport, and nurturing relationships. Connection is a skill, not just luck.',
    whenToUse: 'When you feel isolated or want to strengthen your social network.',
    categoryId: 'better-relationships',
    subcategoryId: 'staying-connected',
    dbtBasis: 'Finding and Getting People to Like You',
    emoji: '🌐',
  },
  {
    id: 'ending-relationships',
    name: 'Ending Well',
    tagline: 'Let go of relationships with grace',
    description: 'Some relationships need to end. This skill helps you decide when it\'s time and how to do it in a way that respects both people.',
    whenToUse: 'When a relationship is consistently harmful and you\'re considering leaving.',
    categoryId: 'better-relationships',
    subcategoryId: 'staying-connected',
    dbtBasis: 'Ending Destructive Relationships',
    emoji: '🚶',
  },

  // ============================================
  // 🔍 I WANT TO UNDERSTAND MYSELF (Mindfulness + General)
  // ============================================

  // --- Why do I react this way? ---
  {
    id: 'chain-analysis',
    name: 'Chain Analysis',
    tagline: 'Trace back what led to this moment',
    description: 'Walk backward from a behavior to uncover the chain of events, thoughts, emotions, and body sensations that led up to it. Understanding the chain is the first step to breaking it.',
    whenToUse: 'After a reaction you want to understand — what happened and why.',
    categoryId: 'understand-myself',
    subcategoryId: 'why-react',
    dbtBasis: 'Chain Analysis',
    emoji: '🔗',
  },
  {
    id: 'missing-links',
    name: 'Missing Links',
    tagline: 'Figure out why you didn\'t use a skill',
    description: 'When you knew what to do but didn\'t do it, this analysis helps identify what got in the way — was it not knowing, not caring, mood interference, or environmental barriers?',
    whenToUse: 'When you had the skills but didn\'t use them and want to understand why.',
    categoryId: 'understand-myself',
    subcategoryId: 'why-react',
    dbtBasis: 'Missing-Links Analysis',
    emoji: '🧩',
  },
  {
    id: 'unpleasant-events',
    name: 'Unpleasant Events Calendar',
    tagline: 'Track patterns in difficult experiences',
    description: 'Notice and record one unpleasant experience each day — what happened, what you felt, what you thought. Over time, patterns emerge that help you understand your triggers.',
    whenToUse: 'When the same painful situations keep showing up and you want to see why.',
    categoryId: 'understand-myself',
    subcategoryId: 'why-react',
    dbtBasis: 'Mindfulness of Unpleasant Events',
    emoji: '📓',
  },

  // --- Tuning into myself ---
  {
    id: 'wise-mind',
    name: 'Wise Mind',
    tagline: 'Find the place where knowing meets feeling',
    description: 'Wise Mind is the overlap between Emotion Mind (feeling-driven) and Reasonable Mind (logic-driven). It\'s intuitive knowing — that quiet inner voice that integrates both.',
    whenToUse: 'When you\'re torn between what you feel and what you think — and need a deeper answer.',
    categoryId: 'understand-myself',
    subcategoryId: 'tuning-in',
    dbtBasis: 'Wise Mind',
    emoji: '🧠',
  },
  {
    id: 'observe',
    name: 'Observe',
    tagline: 'Notice without getting caught up',
    description: 'Just notice what\'s happening — in your body, your thoughts, your surroundings — without trying to change it, label it, or react. Pure awareness.',
    whenToUse: 'When you\'re on autopilot and want to reconnect with what\'s actually happening.',
    categoryId: 'understand-myself',
    subcategoryId: 'tuning-in',
    dbtBasis: 'Observe (Mindfulness "What" Skill)',
    emoji: '👁️‍🗨️',
  },
  {
    id: 'describe',
    name: 'Describe',
    tagline: 'Put words to your experience',
    description: 'Put words to what you observe — "I notice tension in my shoulders," "I\'m having the thought that I\'m not good enough." Describing separates you from the experience.',
    whenToUse: 'When feelings are overwhelming and you need to create some distance from them.',
    categoryId: 'understand-myself',
    subcategoryId: 'tuning-in',
    dbtBasis: 'Describe (Mindfulness "What" Skill)',
    emoji: '📝',
  },
  {
    id: 'participate',
    name: 'Participate',
    tagline: 'Throw yourself fully into the moment',
    description: 'Let go of self-consciousness and enter the experience completely. Dance like no one\'s watching. Engage fully without analyzing.',
    whenToUse: 'When overthinking is keeping you from living — you\'re watching your life instead of being in it.',
    categoryId: 'understand-myself',
    subcategoryId: 'tuning-in',
    dbtBasis: 'Participate (Mindfulness "What" Skill)',
    emoji: '🎭',
  },
  {
    id: 'one-mindfully',
    name: 'One-Mindfully',
    tagline: 'Do one thing at a time, fully',
    description: 'Give your full attention to whatever you\'re doing right now. When your mind wanders, gently bring it back. One task, one conversation, one moment at a time.',
    whenToUse: 'When you\'re scattered, multitasking, or can\'t focus on anything.',
    categoryId: 'understand-myself',
    subcategoryId: 'tuning-in',
    dbtBasis: 'One-Mindfully (Mindfulness "How" Skill)',
    emoji: '🎯',
  },

  // --- Being kinder to myself ---
  {
    id: 'non-judgmental',
    name: 'Non-Judgmental Stance',
    tagline: 'Describe, don\'t evaluate',
    description: 'Replace judgments ("I\'m so stupid," "This is terrible") with descriptions ("I made an error," "This is painful"). Judgments add suffering; descriptions stay with the facts.',
    whenToUse: 'When you catch yourself labeling things as good/bad, right/wrong, or judging yourself harshly.',
    categoryId: 'understand-myself',
    subcategoryId: 'being-kinder',
    dbtBasis: 'Nonjudgmental Stance (Mindfulness "How" Skill)',
    emoji: '🪶',
  },
  {
    id: 'loving-kindness',
    name: 'Loving Kindness',
    tagline: 'Send warmth to yourself and others',
    description: 'A meditation practice where you silently repeat phrases of goodwill — "May I be safe, may I be happy" — first to yourself, then expanding outward to others.',
    whenToUse: 'When you\'re being hard on yourself or holding resentment toward someone.',
    categoryId: 'understand-myself',
    subcategoryId: 'being-kinder',
    dbtBasis: 'Loving Kindness Meditation',
    emoji: '💗',
  },

  // ============================================
  // 🌱 I WANT TO BUILD A BETTER LIFE (Long-term Growth)
  // ============================================

  // --- Daily habits that help ---
  {
    id: 'please-skill',
    name: 'PLEASE',
    tagline: 'Take care of your vulnerability factors',
    description: 'Treat PhysicaL illness, balance Eating, Avoid mood-altering substances, balance Sleep, get Exercise. When your body is depleted, every emotion hits harder.',
    whenToUse: 'When you\'re more emotionally reactive than usual and suspect physical factors.',
    categoryId: 'build-better-life',
    subcategoryId: 'daily-habits',
    dbtBasis: 'PLEASE Skill (Reduce Vulnerability)',
    emoji: '🏥',
  },
  {
    id: 'sleep-hygiene',
    name: 'Sleep Hygiene',
    tagline: 'Build a foundation of good rest',
    description: 'Practical strategies for falling asleep and staying asleep: consistent schedule, wind-down routine, managing screens, and what to do when you can\'t sleep.',
    whenToUse: 'When poor sleep is affecting your mood, focus, or ability to cope.',
    categoryId: 'build-better-life',
    subcategoryId: 'daily-habits',
    dbtBasis: 'Sleep Hygiene Protocol',
    emoji: '😴',
  },

  // --- Living by my values ---
  {
    id: 'values-clarification',
    name: 'Values Clarification',
    tagline: 'Discover what truly matters to you',
    description: 'Identify your core values across life domains — relationships, work, health, growth. When you know your values, decisions become clearer and life feels more purposeful.',
    whenToUse: 'When you feel lost, unmotivated, or disconnected from what matters.',
    categoryId: 'build-better-life',
    subcategoryId: 'living-values',
    dbtBasis: 'Values and Priorities',
    emoji: '🧭',
  },

  // --- Building confidence and skills ---
  {
    id: 'build-mastery',
    name: 'Build Mastery',
    tagline: 'Do one hard thing each day',
    description: 'Each day, do something that gives you a sense of accomplishment or competence. Start small and build up. Mastery experiences are the antidote to helplessness.',
    whenToUse: 'When you feel incapable, stuck, or like nothing will ever get better.',
    categoryId: 'build-better-life',
    subcategoryId: 'building-confidence',
    dbtBasis: 'Build Mastery',
    emoji: '🏆',
  },
  {
    id: 'effectiveness',
    name: 'Be Effective',
    tagline: 'Do what works, not what\'s "right"',
    description: 'Focus on what actually works in the situation rather than what you think "should" work or what feels fair. Play the hand you\'re dealt, not the hand you wish you had.',
    whenToUse: 'When you\'re stuck on principle and it\'s getting in the way of progress.',
    categoryId: 'build-better-life',
    subcategoryId: 'building-confidence',
    dbtBasis: 'Effectiveness (Mindfulness "How" Skill)',
    emoji: '🎯',
  },

  // --- Creating meaning ---
  {
    id: 'doing-being-mind',
    name: 'Doing Mind & Being Mind',
    tagline: 'Balance action with presence',
    description: 'Doing Mind is goal-focused: planning, fixing, achieving. Being Mind is present-focused: noticing, accepting, experiencing. A meaningful life needs both.',
    whenToUse: 'When you\'re burned out from doing or stuck in passive avoidance.',
    categoryId: 'build-better-life',
    subcategoryId: 'creating-meaning',
    dbtBasis: 'Balancing Doing Mind and Being Mind',
    emoji: '☯️',
  },
  {
    id: 'nightmare-protocol',
    name: 'Nightmare Protocol',
    tagline: 'Change the ending of bad dreams',
    description: 'A structured practice for reducing recurring nightmares: rehearse a changed version of the dream while awake, replacing the distressing ending with a new one.',
    whenToUse: 'When recurring nightmares are disrupting your sleep and emotional recovery.',
    categoryId: 'build-better-life',
    subcategoryId: 'daily-habits',
    dbtBasis: 'Nightmare Protocol',
    emoji: '🌙',
  },
];

export function getToolById(id: string): Tool | undefined {
  return tools.find(t => t.id === id);
}

export function getToolsByCategory(categoryId: string): Tool[] {
  return tools.filter(t => t.categoryId === categoryId);
}

export function getToolsBySubcategory(categoryId: string, subcategoryId: string): Tool[] {
  return tools.filter(t => t.categoryId === categoryId && t.subcategoryId === subcategoryId);
}
