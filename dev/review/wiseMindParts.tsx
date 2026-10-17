/**
 * Wise mind's step back (lane 4, wise-mind-parts): the room as StepBackRoom draws it, over the invented
 * person's parts (./data.ts slices), driven by the same reducer the tool uses (src/lib/wiseMindParts.ts).
 * What the tool would write (the `wise_mind` tags, the candidate, `ext.wm`) goes to the saved log. Kept in
 * its own file so other lanes' blocks in ./surfaces.tsx don't collide (./wiseMind.tsx is lane 1's minds form).
 */
import { useEffect, useReducer, useState } from 'react';
import type { PartsContent } from '../../src/data/partsContentTypes';
import { getPartsContent } from '../../src/services/partsContent';
import { StepBackRoom } from '../../src/components/tools/wiseMind/parts/StepBackRoom';
import {
  UNMET, roomParts, stepBackCandidate, stepBackExt, stepBackReducer, stepBackStart, stepBackTags, wiseMindPartsCopy,
  type StepBackState,
} from '../../src/lib/wiseMindParts';
import { logEvent } from './backend';
import { PART_IDS, slices } from './data';
import type { Surface } from './surfaces';

const mockNote = 'text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]';
const TOOL_SESSION = '00000000-0000-4000-8000-000000000901';
let n = 0;
const newId = () => `00000000-0000-4000-8000-${String(950 + (n++ % 40)).padStart(12, '0')}`;

/** Each branch's room as the tool would hold it on arrival. */
function start(branch: string): StepBackState {
  const s = (o: Partial<StepBackState>): StepBackState => ({ ...stepBackStart(), ...o });
  switch (branch) {
    case 'placed': return s({ placed: [PART_IDS.chase, PART_IDS.hide] });
    case 'stepped': case 'wont': return s({ placed: [PART_IDS.chase, PART_IDS.hide, PART_IDS.unnamed], held: true });
    case 'wont_unmet': return s({ placed: [PART_IDS.chase, UNMET], held: true });
    case 'tender': return s({ placed: [PART_IDS.little, PART_IDS.peace], held: true });
    case 'safety': return s({ placed: [PART_IDS.hide, PART_IDS.chase] });
    default: return stepBackStart();
  }
}

function WiseMindHost({ branch }: { branch: string }) {
  const [content, setContent] = useState<PartsContent | null>(null);
  useEffect(() => { getPartsContent().then(setContent).catch(() => { /* stays empty */ }); }, []);
  const [state, dispatch] = useReducer(stepBackReducer, branch, start);
  const [note, setNote] = useState<string | null>(null);
  const copy = wiseMindPartsCopy(content);
  if (!content || !copy) return null;
  // The safety branch: the part that hides has a danger fear on file (the server's part safety flag).
  const sliceParts = slices().parts.map((p) => (branch === 'safety' && p.id === PART_IDS.hide ? { ...p, safety: true } : p));
  const parts = roomParts(sliceParts, content, copy);
  return (
    <section className="space-y-2">
      <p className={mockNote}>Wise mind, screen 2 with parts on (after “What would you like wise mind’s help with?”)</p>
      <StepBackRoom parts={parts} copy={copy} state={state}
        onToggle={(id) => dispatch({ type: 'toggle', id })}
        onNoOne={() => setNote('No one in particular: on to “Choose a way in.”')}
        onHeld={() => dispatch({ type: 'held' })}
        onOpen={(id) => dispatch({ type: 'open', id })}
        onWont={(id) => dispatch({ type: 'wont', id })}
        onUnmetLater={() => { logEvent('queuePartCandidate', stepBackCandidate(newId())); dispatch({ type: 'unmet_later' }); }}
        onDone={(held) => {
          for (const t of stepBackTags(state, TOOL_SESSION, newId)) logEvent('tagPart', t);
          logEvent('ext.wm', { ...stepBackExt(state), form: 'parts', held });
          setNote('Next: on to “Choose a way in.”');
        }}
        onUseMinds={() => setNote('Use the two minds instead: screen 2 as the two circles.')} />
      {note && <p className={mockNote}>{note}</p>}
    </section>
  );
}

export const WISE_MIND_PARTS_SURFACE: Surface = {
  id: 'wise_mind_parts', pack: 'wise_mind_parts', title: 'Wise mind: the step back (parts form, 2p)',
  who: 'Parts on, at least one kept part: Wise mind’s second screen. Tap a part to place it near the light; hold to ask everyone to step back; then tap a figure that won’t.',
  branches: [
    { id: 'who', label: 'Who’s here about this? (the shelf: named, unnamed, resting, tender covered, A part I haven’t met)' },
    { id: 'placed', label: 'Two placed (as from Two pulls, ?a=&b=): the step back' },
    { id: 'stepped', label: 'Stepped back: everyone at the edge, the light wide' },
    { id: 'wont', label: 'It won’t step back, a kept part: Meet it another time (Meet a part)', steps: [{ tap: 'the one who chases' }, { opt: 'wm_wont' }] },
    { id: 'wont_unmet', label: 'It won’t step back, A part I haven’t met: Meet it another time (queued)', steps: [{ opt: 'wm_unmet' }, { opt: 'wm_wont' }, { opt: 'wm_meet_later' }] },
    { id: 'tender', label: 'A tender part placed (covered) and a resting one, stepped back' },
    { id: 'safety', label: 'A placed part with the safety flag: crisis resources under the room' },
  ],
  render: ({ branch }) => <WiseMindHost branch={branch} />,
};
