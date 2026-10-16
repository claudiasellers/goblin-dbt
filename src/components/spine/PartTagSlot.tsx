import { useEffect, useState } from 'react';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { getPartsContent } from '../../services/partsContent';
import type { PartsContent } from '../../data/partsContentTypes';
import type { ThenVsNow } from '../../data/capacityTypes';
import { isTagRowTool, tagRowGate, TAG_CLOSES } from '../../lib/partTag';
import { PartTagRow } from './PartTagRow';

/**
 * Where a host's close puts "Was this a part you know?" (PartTagRow): under the saved answer, never in
 * the way out. Every host (src/lib/partTag.ts TAG_ROW_TOOLS) mounts this one component, through
 * SessionClose or its own close screen, so the gate is the same everywhere: parts on, the close saved
 * with better or much better, a host tool, every line shipped (tagRowGate). The parts content is read
 * only once everything but the content already holds; the person's parts only once the row mounts.
 */
export function PartTagSlot({ toolId, toolSessionId, thenVsNow, saved, onGone }: {
  toolId: string;
  /** The host's ToolSession (tagPart refuses one that isn't closed). */
  toolSessionId: string | null | undefined;
  /** The answer the close saved (null: none, or a question with no then-vs-now). */
  thenVsNow: ThenVsNow | null | undefined;
  /** The close has reached the server (the close call resolved with a session). */
  saved: boolean;
  /** The row folded away (a tap, Skip or No thanks): a host that shows it in two places hides both. */
  onGone?: () => void;
}) {
  const partsOn = useUserProfile().profile.partsEnabled;
  const [parts, setParts] = useState<PartsContent | null>(null);
  const wantsRow = partsOn && saved && !!toolSessionId && isTagRowTool(toolId) && !!thenVsNow && TAG_CLOSES.includes(thenVsNow);
  useEffect(() => {
    if (!wantsRow || parts) return;
    let live = true;
    getPartsContent().then((p) => { if (live) setParts(p); }).catch(() => { /* no row */ });
    return () => { live = false; };
  }, [wantsRow, parts]);

  if (!wantsRow || !toolSessionId || !isTagRowTool(toolId) || !parts) return null;
  if (!tagRowGate({ partsOn, toolId, thenVsNow, saved, content: parts })) return null;
  return <PartTagRow toolId={toolId} toolSessionId={toolSessionId} content={parts} onGone={onGone} />;
}
