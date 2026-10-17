/**
 * A part's story (docs/design/parts.md, "The part card" and "The den"): how it has changed, by month.
 * Pure, no imports. Mirrored in src/data/partsTypes.ts (tests/parts-entry.test.mjs asserts the text appears there).
 */

export interface GetPartStoryRequest { partId: string }

/** A job as the card shows it: chip ids (meet's job or rather options), or the person's own words. */
export interface PartStoryJob { jobIds: string[]; ownJob: string | null }

/** One moment, by month (`YYYY-MM` in the person's time zone). Never a date. */
export type PartStoryMoment =
  | { kind: 'met'; month: string }
  | { kind: 'rested'; month: string }
  | { kind: 'back'; month: string }
  /** It took up a new job: the first job it had, and the one it has now. Never on a tender part. */
  | { kind: 'job'; month: string; then: PartStoryJob; now: PartStoryJob };

/** A confirmed den link, from this part's side: it stands in front of, or behind, the other; or they pull against each other. */
export interface PartStoryLink { role: 'front' | 'behind' | 'pulls'; otherId: string; otherName: string | null }

/** A part as the story's small rooms draw it (the den's renderer). */
export interface PartStoryRoomPart {
  id: string;
  name: string | null;
  status: 'active' | 'resting';
  tender: boolean;
  shapeSig: number[] | null;
  mapX: number | null;
  mapY: number | null;
}

/** An earlier month's room beside today's: only when a snapshot from before this month holds this part. */
export interface PartStoryRooms {
  /** `YYYY-MM`: the earliest such month. */
  thenMonth: string;
  /** That month's layout: ids, places, status and tender (no names). */
  then: Array<{ id: string; mapX: number | null; mapY: number | null; status: 'active' | 'resting'; tender: boolean }>;
  now: PartStoryRoomPart[];
  /** Today's confirmed links between parts in the room. */
  links: Array<{ id: string; kind: 'covers_for' | 'two_pulls'; aId: string; bId: string; bothWantId: string | null }>;
}

/** Empty with parts off. No date, score or percentage: months, ids and the readout's own counts. */
export interface GetPartStoryResponse {
  /** Oldest first. */
  moments: PartStoryMoment[];
  /** What's helped it settle: the card's readout (≥ 3 close tags), else empty. */
  helped: Array<{ toolId: string; n: number }>;
  /** Steps that helped: the card's readout (graph labels, never own words), else empty. */
  steps: Array<{ stepId: string; label: string; n: number }>;
  links: PartStoryLink[];
  /** How they've felt toward it: the card's readout, when it says something. */
  felt?: { month: string; then: string | null; now: string };
  rooms?: PartStoryRooms;
}
