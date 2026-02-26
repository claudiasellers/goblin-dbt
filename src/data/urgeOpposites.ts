import type { DBTParentEmotion } from './dbt-parent-mapping';

export interface ActionUrge {
  id: string;
  label: string;
  small: string;
  medium: string;
  bigger: string;
}

export interface ParentUrges {
  parent: DBTParentEmotion;
  acknowledgment: string;
  bodyOpposite: string;
  defaultOpposites: { small: string; medium: string; bigger: string };
  urges: ActionUrge[];
}

const allUrges: ParentUrges[] = [
  {
    parent: 'fear',
    acknowledgment: 'Fear is trying to keep you safe by pulling you away from the threat. When the threat isn\'t real, avoidance keeps the fear alive.',
    bodyOpposite: 'Relax your jaw and hands. Open your posture. Breathe slowly and deeply. Speak in a steady voice.',
    defaultOpposites: {
      small: 'Stay with the discomfort a little longer — even 2 minutes',
      medium: 'Take one step toward what you\'re avoiding',
      bigger: 'Do the thing fully, without escape plans',
    },
    urges: [
      {
        id: 'fear-avoid',
        label: 'Avoid it entirely',
        small: 'Stay in the room 2 more minutes',
        medium: 'Approach the thing for 10 minutes, then reassess',
        bigger: 'Do the thing you\'ve been avoiding, start to finish',
      },
      {
        id: 'fear-escape',
        label: 'Run away or escape',
        small: 'Plant your feet and take 3 slow breaths',
        medium: 'Stay until the fear drops one notch',
        bigger: 'Stay until the fear passes on its own',
      },
      {
        id: 'fear-cancel',
        label: 'Cancel plans',
        small: 'Don\'t cancel yet — wait 30 minutes and decide then',
        medium: 'Go but give yourself permission to leave early',
        bigger: 'Go and stay the whole time',
      },
      {
        id: 'fear-freeze',
        label: 'Freeze and do nothing',
        small: 'Move one part of your body — stand up, stretch',
        medium: 'Take one small action related to what you\'re avoiding',
        bigger: 'Start the task fully, even imperfectly',
      },
    ],
  },
  {
    parent: 'anger',
    acknowledgment: 'Anger is mobilizing you to fight back or push against something that feels wrong. When the situation doesn\'t call for a fight, that energy needs somewhere else to go.',
    bodyOpposite: 'Relax your face, unclench your fists, drop your shoulders. Speak softly and slowly. Half-smile. Keep your hands open.',
    defaultOpposites: {
      small: 'Pause for 10 seconds before doing anything',
      medium: 'Try to see the situation from the other person\'s perspective',
      bigger: 'Do something genuinely kind for the person you\'re angry at',
    },
    urges: [
      {
        id: 'anger-lash',
        label: 'Lash out or say something cutting',
        small: 'Pause and count to 10 before responding',
        medium: 'Write down what you want to say, then set it aside for an hour',
        bigger: 'Say something kind to the person instead',
      },
      {
        id: 'anger-stonewall',
        label: 'Shut someone out',
        small: 'Don\'t block or unfriend — just pause',
        medium: 'Send a brief, neutral message acknowledging them',
        bigger: 'Have an honest, gentle conversation about what happened',
      },
      {
        id: 'anger-destroy',
        label: 'Break or throw something',
        small: 'Squeeze ice in your hands for 30 seconds',
        medium: 'Do 30 jumping jacks or a brisk walk around the block',
        bigger: 'Channel the energy into cleaning, building, or creating something',
      },
      {
        id: 'anger-criticize',
        label: 'Criticize or blame someone',
        small: 'Pause and name one thing they might be going through',
        medium: 'Ask a genuine question about their perspective',
        bigger: 'Offer an honest compliment or acknowledgment',
      },
    ],
  },
  {
    parent: 'sadness',
    acknowledgment: 'Sadness is pulling you inward, away from the world. When the withdrawal becomes the thing keeping you stuck, small movements outward can shift everything.',
    bodyOpposite: 'Sit or stand upright. Look up, not down. Move with purpose even if you\'re faking it. Speak at a normal volume.',
    defaultOpposites: {
      small: 'Do one tiny thing — sit up, open the blinds, send one text',
      medium: 'Get up and do something active for 10 minutes',
      bigger: 'Go be around people, even if you don\'t feel like it',
    },
    urges: [
      {
        id: 'sad-bed',
        label: 'Stay in bed and do nothing',
        small: 'Sit up and open the blinds',
        medium: 'Take a shower and get dressed',
        bigger: 'Go for a 10-minute walk outside',
      },
      {
        id: 'sad-isolate',
        label: 'Cancel plans and isolate',
        small: 'Text one person back',
        medium: 'Keep one plan today',
        bigger: 'Call someone and talk for 5 minutes',
      },
      {
        id: 'sad-give-up',
        label: 'Give up on something that matters',
        small: 'Do the tiniest next step — open the file, write one sentence',
        medium: 'Work on it for 10 minutes, then stop if you need to',
        bigger: 'Complete one meaningful piece of it',
      },
      {
        id: 'sad-scroll',
        label: 'Scroll mindlessly or zone out',
        small: 'Put the phone in another room for 15 minutes',
        medium: 'Do one small task you\'ve been putting off',
        bigger: 'Spend 30 minutes doing something that requires your full attention',
      },
    ],
  },
  {
    parent: 'disgust',
    acknowledgment: 'Disgust is pushing you to reject and distance yourself. When the reaction is stronger than the situation warrants, leaning in — even a little — can change the feeling.',
    bodyOpposite: 'Relax your upper lip and nose. Open your hands. Lean in slightly rather than recoiling. Keep a neutral expression.',
    defaultOpposites: {
      small: 'Stay present for 2 more minutes',
      medium: 'Find one thing to appreciate about the situation',
      bigger: 'Engage fully, as if the disgust weren\'t there',
    },
    urges: [
      {
        id: 'disgust-push',
        label: 'Push this person or thing away',
        small: 'Stay present for 2 more minutes',
        medium: 'Find one small thing to appreciate about the situation',
        bigger: 'Engage fully without the disgust filter',
      },
      {
        id: 'disgust-leave',
        label: 'Leave the situation',
        small: 'Stay, but shift your attention to something neutral',
        medium: 'Stay and participate, even minimally',
        bigger: 'Stay and engage as if the disgust isn\'t there',
      },
      {
        id: 'disgust-judge',
        label: 'Judge or condemn',
        small: 'Notice the judgment and label it as a judgment, not a fact',
        medium: 'Consider one reason this makes sense from their perspective',
        bigger: 'Actively practice empathy — imagine their full experience',
      },
    ],
  },
  {
    parent: 'shame',
    acknowledgment: 'Shame is telling you to hide — that if people saw the real you, they\'d reject you. When shame is lying about your worth, hiding feeds it. Visibility starves it.',
    bodyOpposite: 'Stand up straight, shoulders back. Lift your chin. Make eye contact. Speak clearly and at full volume. Take up space.',
    defaultOpposites: {
      small: 'Stay where you are instead of leaving',
      medium: 'Make eye contact and speak at your normal volume',
      bigger: 'Tell someone you trust what happened, with your head held high',
    },
    urges: [
      {
        id: 'shame-hide',
        label: 'Hide or disappear',
        small: 'Stay where you are instead of leaving',
        medium: 'Make eye contact with one person',
        bigger: 'Stand tall, shoulders back, and take up space',
      },
      {
        id: 'shame-secret',
        label: 'Keep it secret',
        small: 'Write it down, even just for yourself',
        medium: 'Tell one trusted person a small piece of it',
        bigger: 'Share openly with someone you trust, looking them in the eye',
      },
      {
        id: 'shame-shrink',
        label: 'Make yourself small',
        small: 'Uncross your arms and take up your normal space',
        medium: 'Speak at your normal volume — don\'t mumble or trail off',
        bigger: 'Share your opinion or ask for what you need out loud',
      },
      {
        id: 'shame-avoid-people',
        label: 'Avoid people who might notice',
        small: 'Don\'t cancel your next social plan',
        medium: 'Go where people are, even briefly',
        bigger: 'Initiate contact with someone — text, call, or show up',
      },
    ],
  },
  {
    parent: 'guilt',
    acknowledgment: 'Guilt is urging you to make amends or punish yourself. When you didn\'t actually violate your values, the self-punishment is just suffering without purpose.',
    bodyOpposite: 'Stand normally — don\'t hunch or grovel. Keep a calm, steady voice. Don\'t wring your hands.',
    defaultOpposites: {
      small: 'Notice the self-punishment urge and don\'t act on it',
      medium: 'Do something neutral instead of punishing yourself',
      bigger: 'Act freely, as if you did nothing wrong — because you didn\'t',
    },
    urges: [
      {
        id: 'guilt-apologize',
        label: 'Apologize again (or excessively)',
        small: 'Notice the urge to apologize and don\'t act on it',
        medium: 'If you\'ve already apologized once, let that be enough',
        bigger: 'Act freely, without hedging or seeking reassurance',
      },
      {
        id: 'guilt-punish',
        label: 'Punish yourself',
        small: 'Notice the self-punishment urge and name it out loud',
        medium: 'Do something neutral — a walk, a glass of water',
        bigger: 'Do something kind for yourself — the direct opposite of punishment',
      },
      {
        id: 'guilt-avoid',
        label: 'Avoid the person you think you wronged',
        small: 'Don\'t change your route or routine to avoid them',
        medium: 'Make brief, normal contact — a wave, a hello',
        bigger: 'Engage with them normally, without excessive guilt or apology',
      },
    ],
  },
  {
    parent: 'jealousy',
    acknowledgment: 'Jealousy is tightening your grip — urging you to monitor, control, and hold on tighter. Loosening that grip is what actually builds the trust you\'re craving.',
    bodyOpposite: 'Relax your grip — literally and figuratively. Open hands, soft face. Put down the phone.',
    defaultOpposites: {
      small: 'Put your phone down for 10 minutes',
      medium: 'Ask once, then accept the answer',
      bigger: 'Give them genuine freedom and space — and mean it',
    },
    urges: [
      {
        id: 'jealousy-check',
        label: 'Check their phone, social media, or whereabouts',
        small: 'Put your phone down for 10 minutes',
        medium: 'Delete the checking app from your home screen for today',
        bigger: 'Go a full day without checking',
      },
      {
        id: 'jealousy-interrogate',
        label: 'Interrogate or ask repeatedly',
        small: 'Ask once, then accept the answer',
        medium: 'Notice the urge to ask again and do something else instead',
        bigger: 'Say "have fun" and genuinely mean it',
      },
      {
        id: 'jealousy-cling',
        label: 'Cling or demand more attention',
        small: 'Give them 30 minutes of uninterrupted space',
        medium: 'Make plans with someone else',
        bigger: 'Encourage them to spend time with others and enjoy yourself meanwhile',
      },
    ],
  },
  {
    parent: 'envy',
    acknowledgment: 'Envy is narrowing your focus to what someone else has and what you lack. Shifting toward what you have — and what you can build — opens it back up.',
    bodyOpposite: 'Soften your face. Let go of the tight jaw and narrowed eyes. Smile genuinely when acknowledging others.',
    defaultOpposites: {
      small: 'Catch the comparison and name it as envy',
      medium: 'List 3 things you\'re grateful for right now',
      bigger: 'Celebrate their success genuinely, then take one step toward your own goals',
    },
    urges: [
      {
        id: 'envy-tear-down',
        label: 'Tear them down (in your head or out loud)',
        small: 'Catch the thought and label it as envy, not truth',
        medium: 'Say one genuinely kind thing about them',
        bigger: 'Celebrate their success as if it were your own',
      },
      {
        id: 'envy-compare',
        label: 'Compare and despair',
        small: 'Notice the comparison and redirect your attention',
        medium: 'List 3 things you have that you\'re genuinely grateful for',
        bigger: 'Use the envy as information — what does it tell you about what YOU want? Take one step toward that',
      },
      {
        id: 'envy-give-up',
        label: 'Give up on your own goals',
        small: 'Name one small thing you\'ve accomplished recently',
        medium: 'Take one tiny step toward something you want',
        bigger: 'Make a plan for getting what envy is pointing you toward',
      },
    ],
  },
  {
    parent: 'love',
    acknowledgment: 'Love is pulling you toward connection — but when someone is unavailable, harmful, or gone, each contact resets the clock. Distance is how this attachment fades.',
    bodyOpposite: 'When you feel the pull to reach out, put your hands in your lap. Turn away from your phone. Take a breath and ground yourself.',
    defaultOpposites: {
      small: 'Write what you want to say, but don\'t send it',
      medium: 'Put your phone away and do something that requires your full attention',
      bigger: 'Go no-contact and fill the space with something that builds YOUR life',
    },
    urges: [
      {
        id: 'love-reach-out',
        label: 'Text, call, or reach out to them',
        small: 'Write the message but don\'t send it — wait 1 hour',
        medium: 'Put your phone in another room for an hour',
        bigger: 'Delete the draft, close the app, do something that demands your full attention',
      },
      {
        id: 'love-stalk',
        label: 'Check their social media',
        small: 'Notice the urge and set a 10-minute timer before deciding',
        medium: 'Mute or unfollow them',
        bigger: 'Block or remove them from your feed entirely',
      },
      {
        id: 'love-proximity',
        label: 'Go places they might be',
        small: 'Choose a different route or venue today',
        medium: 'Make plans that have nothing to do with them',
        bigger: 'Fill the time you\'d spend thinking about them with something that builds your life',
      },
      {
        id: 'love-idealize',
        label: 'Idealize them and ignore red flags',
        small: 'Write down one realistic negative',
        medium: 'Write the full honest picture — good and bad',
        bigger: 'Talk to a friend about the reality, not the fantasy',
      },
    ],
  },
];

// --- Lookup ---

const urgesByParent = new Map(allUrges.map(u => [u.parent, u]));

export function getUrgesForParent(parent: DBTParentEmotion): ParentUrges | undefined {
  return urgesByParent.get(parent);
}
