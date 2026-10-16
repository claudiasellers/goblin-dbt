import { useEffect, useState } from 'react';
import { useUserProfile } from '../contexts/UserProfileContext';
import type { PartsContent } from '../data/partsContentTypes';
import { UNBLEND_EXT_NS, unblendLine, type UnblendSource } from '../lib/unblendLine';
import { getPartsContent } from '../services/partsContent';
import { useToolSession } from './useToolSession';

/**
 * The unblend line for a host (src/lib/unblendLine.ts): only with parts on, only while the host says it
 * may show (`show`: right after the pick, never while P2 is open), and only when the line resolves.
 * The first time it renders, `ext.<ns>.unblendShown` is set on the visit's ToolSession. Parts content is
 * read only with parts on; a failed read is no line.
 */
export function useUnblendLine(source: UnblendSource, ids: string | readonly string[] | null, show: boolean): string | null {
  const partsOn = useUserProfile().profile.partsEnabled;
  const [content, setContent] = useState<PartsContent | null>(null);
  useEffect(() => {
    if (!partsOn) return;
    let live = true;
    getPartsContent().then((c) => { if (live) setContent(c); }).catch(() => { /* no line */ });
    return () => { live = false; };
  }, [partsOn]);
  const line = partsOn && show ? unblendLine(content, source, ids) : null;
  const toolSession = useToolSession();
  const ns = UNBLEND_EXT_NS[source];
  useEffect(() => {
    if (line) toolSession.setExt({ [ns]: { unblendShown: true } });
  }, [line, ns, toolSession]);
  return line;
}
