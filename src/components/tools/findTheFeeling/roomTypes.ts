import type { ReactNode } from 'react';
import type { CollectedWord, FindTheFeelingContent } from '../../../data/findTheFeelingTypes';
import type { Action, FlowState } from '../../../lib/findTheFeelingFlow';

/**
 * What the page hands a room (Shape or Tune). A room renders every step of the flow in its own
 * art direction; the page owns loading, saving, routing and the steps that are shared.
 *
 * Contract:
 * - All copy comes from `content.flow.copy`; all words from `content.families`; urges from
 *   `content.urges`. Rooms hold no clinical content of their own.
 * - Rooms move the flow only through `dispatch`. They never decide gates: `state.regulation`
 *   says which regulation to render (smooth / warm for Shape, tune / wake for Tune).
 * - The word step and the "then" side of the close use `state.found` (the snapshot), never the
 *   drifted or regulated state.
 * - Ambient descent: rooms read `ambientDescent(...)` from lib/findTheFeeling each render and apply
 *   `driftShape` / `driftSound` to what they display (not to `state.found`).
 * - `slots.orient` is rendered in the orient step; `slots.next` in the next step; `slots.saveStatus`
 *   in the collection step. `slots.back` is a Back control or null. `slots.unblend` is the parts
 *   unblend line (text, already resolved) or null: a room shows it as one quiet line near the top.
 * - Everything must work with reduced motion, with a finger and a mouse, and (Tune) with sound off.
 */
export interface RoomProps {
  content: FindTheFeelingContent;
  state: FlowState;
  dispatch: (a: Action) => void;
  /** First name for distanced copy, or null. */
  name: string | null;
  collection: CollectedWord[];
  reducedMotion: boolean;
  slots: { orient: ReactNode; next: ReactNode; back: ReactNode | null; saveStatus: ReactNode; unblend: string | null };
}
