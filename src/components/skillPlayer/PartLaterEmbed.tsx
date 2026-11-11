import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useUserProfile } from '../../contexts/UserProfileContext';
import type { PartsContent } from '../../data/partsContentTypes';
import { psLaterCandidate, psLaterCopy, PS_AMBIVALENCE_BARRIER } from '../../lib/psAmbivalence';
import { newId } from '../../lib/spine/ids';
import { getPartsContent } from '../../services/partsContent';
import type { EmbedProps } from './embeds';

// Parts' callables and the line load on demand: only with parts on, after the one barrier this follows.
const queuePartCandidate: typeof import('../../services/parts').queuePartCandidate = (req) => import('../../services/parts').then((m) => m.queuePartCandidate(req));
const loadLater = () => import('../parts/PartLaterLine');
const LazyPartLaterLine = lazy(() => loadLater().then((m) => ({ default: m.PartLaterLine })));

/**
 * Problem Solve's "the part that doesn't want change" (the `partLater` embed; src/lib/psAmbivalence.ts,
 * docs/design/parts.md "Meet a part → Entries"): parts on, after *Part of me doesn't actually want this to change*,
 * one quiet line offers to come back to that part another time. The tap is the yes: a PartCandidate for put_it_off
 * is queued, and the line says it's in Me. Nothing renders with parts off or before its copy ships. Names no part.
 * The slot shows it only after that barrier; the barrier is checked here too, from the run's answers.
 */
export function PartLaterEmbed({ answerIds, onShown }: EmbedProps) {
  const partsOn = useUserProfile().profile.partsEnabled;
  const sub = answerIds?.sub?.[0] ?? null;
  const wants = partsOn && sub === PS_AMBIVALENCE_BARRIER;
  const [content, setContent] = useState<PartsContent | null>(null);
  useEffect(() => {
    if (!wants) return;
    let live = true;
    Promise.all([getPartsContent(), loadLater()]).then(([c]) => { if (live) setContent(c); }).catch(() => { /* no line */ });
    return () => { live = false; };
  }, [wants]);
  const copy = psLaterCopy(content, partsOn, sub);
  useEffect(() => { if (copy) onShown(); }, [copy, onShown]);
  const id = useRef<string | null>(null);
  if (!copy) return null;
  const later = async () => {
    id.current ??= newId();
    await queuePartCandidate(psLaterCandidate(id.current));
  };
  return <Suspense fallback={null}><LazyPartLaterLine ask={copy.ask} done={copy.done} onLater={later} /></Suspense>;
}
