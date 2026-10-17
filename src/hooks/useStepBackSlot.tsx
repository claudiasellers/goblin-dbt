import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useProfileContext } from './useProfileContext';
import { getPartsContent } from '../services/partsContent';
import { partsFormOn, wiseMindPartsCopy, PUSHED_PARTS_LINE } from '../lib/wiseMindParts';
import type { PartsContent } from '../data/partsContentTypes';
import type { StepBackRoomProps, StepBackSlot } from '../lib/wiseMind';

// The step back's room, loaded on demand: only once the gate below holds (parts on, a part, copy shipped).
const loadStepBack = () => import('../components/tools/wiseMind/parts/StepBackScreen');
const LazyStepBackScreen = lazy(() => loadStepBack().then((m) => ({ default: m.StepBackScreen })));

/**
 * Wise mind's parts form (docs/design/wise-mind.md, 2p): the slot the page runs screen 2p with, or null
 * for the two minds. Parts on, at least one active or resting part (the `wise-mind` profile slice) and
 * every line of it shipped; anything else, a failed read included, is the two minds. `pending` while a
 * parts-on person's slice and copy load (the page decides its form once, at the start); with parts off
 * there is nothing to wait for and nothing parts is fetched.
 */
export function useStepBackSlot(): { pending: boolean; slot: StepBackSlot | null } {
  const partsOn = useUserProfile().profile.partsEnabled === true;
  const ctx = useProfileContext('wise-mind', { enabled: partsOn });
  const [content, setContent] = useState<PartsContent | null | 'failed'>(null);
  useEffect(() => {
    if (!partsOn) return;
    let live = true;
    getPartsContent().then((c) => { if (live) setContent(c); }).catch(() => { if (live) setContent('failed'); });
    return () => { live = false; };
  }, [partsOn]);

  const parts = ctx.status === 'ready' ? ctx.slices?.parts ?? null : null;
  const loaded = content === 'failed' ? null : content;
  const on = partsOn && partsFormOn({ partsOn, parts, content: loaded });
  useEffect(() => { if (on) void loadStepBack(); }, [on]);

  const slot = useMemo<StepBackSlot | null>(() => {
    if (!on || !parts || !loaded) return null;
    const copy = wiseMindPartsCopy(loaded);
    if (!copy) return null;
    function Room(p: StepBackRoomProps) {
      return <Suspense fallback={null}><LazyStepBackScreen {...p} parts={parts!} content={loaded!} copy={copy!} /></Suspense>;
    }
    return { Room, pushedLine: copy[PUSHED_PARTS_LINE] };
  }, [on, parts, loaded]);

  const pending = partsOn && (ctx.status === 'loading' || content === null);
  return { pending, slot };
}
