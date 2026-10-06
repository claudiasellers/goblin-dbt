/**
 * Do the Opposite's doors: presentation metadata only. Which parents exist, what they're called,
 * their urges and which words belong to each come from the graph (opposite-action-picker.json).
 *
 * - order: the order the doors appear in
 * - tint: mixed into the room's own surfaces (never used as a text colour). Fear, anger, sadness and
 *   disgust reuse the old picker's group tints.
 * - anchorWordId: the word a door stands for when someone taps the door itself rather than a word.
 *   tests/opposite-action-picker.test.mjs checks each one belongs to its parent in the graph.
 */
export interface OppositeActionDoor {
  parent: string;
  tint: string;
  anchorWordId: string;
}

export const OPPOSITE_ACTION_DOORS: OppositeActionDoor[] = [
  { parent: 'fear', tint: '#9785b5', anchorWordId: 'fearful' },
  { parent: 'anger', tint: '#bf866c', anchorWordId: 'angry' },
  { parent: 'sadness', tint: '#739bb9', anchorWordId: 'sad' },
  { parent: 'shame', tint: '#b67a9c', anchorWordId: 'ashamed' },
  { parent: 'guilt', tint: '#b59a5a', anchorWordId: 'guilty' },
  { parent: 'disgust', tint: '#8d9b78', anchorWordId: 'disgusted' },
  { parent: 'jealousy', tint: '#5fa196', anchorWordId: 'jealous' },
  { parent: 'love', tint: '#c97c84', anchorWordId: 'loving' },
];

/** Up to this many feelings are worked on together. */
export const MAX_FEELINGS = 3;
