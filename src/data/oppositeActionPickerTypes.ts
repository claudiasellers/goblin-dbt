/**
 * Shape of src/data/content/opposite-action-picker.json (scripts/content-snapshot/build.mjs,
 * buildOppositeActionPicker). Graph content: which DBT parent each word works on, and each parent's
 * label, acknowledgment and urges. Never hand-edited.
 */
export interface PickerUrge {
  id: string;
  label: string;
}

export interface PickerParent {
  /** The DBT parent (`EmotionRegulationContent.dbtParent`): fear, anger, shame, … */
  id: string;
  label: string;
  acknowledgment: string;
  /** In the graph's order: the first is the parent's most typical urge. */
  urges: PickerUrge[];
  /** Grid and graph words Opposite Action works on through this parent. */
  wordIds: string[];
}

export interface PickerWord {
  applicable: boolean;
  parent: string | null;
  /** Where to go instead when Opposite Action isn't the skill for this word. */
  alternativeSkill: string | null;
}

export interface OppositeActionPickerContent {
  parents: PickerParent[];
  words: Record<string, PickerWord>;
}
