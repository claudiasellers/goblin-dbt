import { useEffect, useState } from 'react';
import { useUserProfile } from '../contexts/UserProfileContext';
import type { PartsContent } from '../data/partsContentTypes';
import { oaGoalLine, type OaGoalLineInput } from '../lib/oaGoalLine';
import { getPartsContent } from '../services/partsContent';
import { useToolSession } from './useToolSession';

/**
 * Do the Opposite's goal line (src/lib/oaGoalLine.ts): only with parts on, only while the host says it may
 * show (`show`: the effectiveness card), and only when both lines resolve. The first time it renders,
 * `ext.er.goalLineShown` is set on the visit's ToolSession. Parts content is read only with parts on; a
 * failed read is no line.
 */
export function useOaGoalLine(input: OaGoalLineInput, show: boolean): [string, string] | null {
  const partsOn = useUserProfile().profile.partsEnabled;
  const [content, setContent] = useState<PartsContent | null>(null);
  useEffect(() => {
    if (!partsOn) return;
    let live = true;
    getPartsContent().then((c) => { if (live) setContent(c); }).catch(() => { /* no line */ });
    return () => { live = false; };
  }, [partsOn]);
  const lines = partsOn && show ? oaGoalLine(content, input) : null;
  const shown = lines !== null;
  const toolSession = useToolSession();
  useEffect(() => {
    if (shown) toolSession.setExt({ er: { goalLineShown: true } });
  }, [shown, toolSession]);
  return lines;
}
