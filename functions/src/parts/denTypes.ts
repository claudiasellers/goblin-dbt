/**
 * The den (docs/design/parts.md, "The den"): links, where the person put each part, the room, its snapshots.
 * Pure, no imports. Mirrored in src/data/partsTypes.ts (tests/parts-entry.test.mjs asserts the text appears there).
 */

/** `covers_for`: `aId` stands in front of `bId`. `two_pulls`: the two pull against each other (Two pulls writes it). */
export type PartLinkKind = 'covers_for' | 'two_pulls';
export const PART_LINK_KINDS: readonly PartLinkKind[] = ['covers_for', 'two_pulls'];

/** On the person's yes. Both parts theirs (active or resting), never the same part. */
export interface LinkPartsRequest {
  kind: PartLinkKind;
  aId: string;
  bId: string;
  /** `two_pulls` only: the PolarityPair's both-want option the person picked. */
  bothWantId?: string | null;
}
/**
 * The link's id is derived from its kind and the pair (one link per pair and kind): a repeat finds it.
 * `created` is false for a repeat, which keeps the latest answer (the direction, the both-want).
 */
export interface LinkPartsResponse { id: string; created: boolean; version: number }

export interface UnlinkPartsRequest { linkId: string }
/** `removed` is false when there was nothing to remove (a repeat). */
export interface UnlinkPartsResponse { removed: boolean; version: number }

/** Where the person put a part in the room: 0..1 across and down. */
export interface PartLayoutPosition { partId: string; mapX: number; mapY: number }
/** Any number of the caller's active or resting parts in one call (at most PART_LAYOUT_MAX). */
export interface UpdatePartLayoutRequest { positions: PartLayoutPosition[] }
export interface UpdatePartLayoutResponse { version: number }
export const PART_LAYOUT_MAX = 50;

/** How recently the person spent time with a part (a visit, a tag, a check-back answer). Never a date or a count. */
export type DenRecency = 'near' | 'a_while' | 'not_lately';
export const DEN_RECENCY: readonly DenRecency[] = ['near', 'a_while', 'not_lately'];

/** A part in the room: active or resting only. Never a fear, a job or own words. */
export interface DenPart {
  id: string;
  name: string | null;
  status: 'active' | 'resting';
  tender: boolean;
  /** The figure (PartFigure); its fill comes from it too, as on the Me card. */
  shapeSig: number[] | null;
  /** Where the person put it; null until they do (the room places it at the edge of the light). */
  mapX: number | null;
  mapY: number | null;
  recency: DenRecency;
  /** The part safety flag: CrisisBanner alongside, never instead. */
  safety: boolean;
}

/** A confirmed link whose two parts are both in the room. */
export interface DenLink { id: string; kind: PartLinkKind; aId: string; bId: string; bothWantId: string | null }

/** A saved layout, newest first ("How it looked in {month}"). */
export interface DenSnapshotRef { id: string; takenAt: string }

export interface GetDenResponse { parts: DenPart[]; links: DenLink[]; snapshots: DenSnapshotRef[] }

export interface GetDenSnapshotRequest { id: string }
/** One part as it stood then: ids, places, status and tender only (no names, no own words). */
export interface DenSnapshotPart { id: string; mapX: number | null; mapY: number | null; status: 'active' | 'resting'; tender: boolean }
/** Empty when the snapshot isn't the caller's (or parts are off). */
export interface GetDenSnapshotResponse { parts: DenSnapshotPart[]; takenAt?: string }
