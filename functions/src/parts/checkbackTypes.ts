/**
 * The next-day check-back after a meeting (docs/design/parts.md, Meet a part step 10). Pure, no imports.
 * Mirrored in src/data/partsTypes.ts (tests/parts-entry.test.mjs asserts the text appears there).
 */

/** The FollowUpType id (scripts/practice-spine/content.py). */
export const PART_CHECKBACK_TYPE = 'part_checkback';

/** On the close's yes ("Check back with it tomorrow?"), for the part this visit kept. */
export interface SchedulePartCheckbackRequest {
  /** A client UUID for the follow-up. */
  id: string;
  /** The Meet a part visit (its PartSession) that kept the part. */
  sessionId: string;
  /** Tomorrow at 10:00 local (the type's window), computed on the device. */
  dueAt: string;
}
/** The open check-back's id: this one, or the one already open for that part (at most one). */
export interface SchedulePartCheckbackResponse { id: string | null }

/** "How's {name} today?": Settled · Same · Louder · Skip. */
export type PartCheckbackAnswer = 'settled' | 'same' | 'louder' | 'skip';
export const PART_CHECKBACK_ANSWERS: readonly PartCheckbackAnswer[] = ['settled', 'same', 'louder', 'skip'];
export interface AnswerPartCheckbackRequest { id: string; answer: PartCheckbackAnswer }
/** `aftercare`: Louder was saved, so the card shows aftercare_louder (the part is paused). */
export interface AnswerPartCheckbackResponse { status: string; aftercare: boolean }

/** What a check-back card carries about its part (name and tenderness from the profile slice). */
export interface TodayPartRef { id: string; name: string | null; tender: boolean }
