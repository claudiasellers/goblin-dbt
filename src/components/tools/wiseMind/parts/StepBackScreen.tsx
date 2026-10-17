import { useReducer } from 'react';
import type { PartsContent } from '../../../../data/partsContentTypes';
import type { ProfileSlices } from '../../../../data/profileTypes';
import type { StepBackRoomProps } from '../../../../lib/wiseMind';
import { newId } from '../../../../lib/spine/ids';
import {
  presetPartIds, roomParts, stepBackCandidate, stepBackExt, stepBackReducer, stepBackStart, stepBackTags,
  type WiseMindPartsCopy,
} from '../../../../lib/wiseMindParts';
import { queuePartCandidate, tagPart } from '../../../../services/parts';
import { StepBackRoom } from './StepBackRoom';

/**
 * Screen 2p in Wise mind's step machine: the room's state (src/lib/wiseMindParts.ts), the parts a link
 * put in it (`?a=&b=`, the caller's own only), and its writes. Placing a part is the yes to a
 * `wise_mind` tag on this visit (sent when the step back is done, one per placed part); *Meet it another
 * time* on *A part I haven't met* queues a candidate on that tap. Writes never hold the flow up.
 */
export function StepBackScreen({ presetPartIds: preset, sessionId, onDone, onUseMinds, parts: sliceParts, content, copy }: StepBackRoomProps & {
  parts: ProfileSlices['parts'];
  content: PartsContent;
  copy: WiseMindPartsCopy;
}) {
  const [state, dispatch] = useReducer(stepBackReducer, undefined, () => stepBackStart(presetPartIds(preset, sliceParts)));
  const parts = roomParts(sliceParts, content, copy);

  const done = () => {
    if (sessionId) for (const t of stepBackTags(state, sessionId, newId)) tagPart(t).catch(() => { /* a tag is never worth a stop */ });
    onDone(stepBackExt(state));
  };
  return (
    <StepBackRoom parts={parts} copy={copy} state={state}
      onToggle={(id) => dispatch({ type: 'toggle', id })}
      onNoOne={() => onDone({ partIds: [], stillCloseIds: [] })}
      onHeld={() => dispatch({ type: 'held' })}
      onOpen={(id) => dispatch({ type: 'open', id })}
      onWont={(id) => dispatch({ type: 'wont', id })}
      onUnmetLater={() => {
        // "It's in Me for another time" only once it is; a failed write leaves the link to tap again.
        queuePartCandidate(stepBackCandidate(newId())).then(() => dispatch({ type: 'unmet_later' })).catch(() => { /* stays offered */ });
      }}
      onDone={done}
      onUseMinds={onUseMinds} />
  );
}
