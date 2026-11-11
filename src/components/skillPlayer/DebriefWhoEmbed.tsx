import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useUserProfile } from '../../contexts/UserProfileContext';
import type { PartsContent } from '../../data/partsContentTypes';
import { useProfileContext } from '../../hooks/useProfileContext';
import { useToolSession } from '../../hooks/useToolSession';
import { debriefWhoReady, showDebriefWho, type WhoShowedUp } from '../../lib/debriefWho';
import { tagRowAnswered } from '../../lib/tagRowOnce';
import { getPartsContent } from '../../services/partsContent';
import type { EmbedProps } from './embeds';

// The screen and its tag row load on demand: only with parts on.
const loadWho = () => import('../parts/DebriefWho');
const LazyDebriefWho = lazy(() => loadWho().then((m) => ({ default: m.DebriefWho })));

/**
 * DEAR MAN's debrief: who showed up? (the `debriefWho` embed, a whole-screen step of `dear_man_debrief`;
 * src/lib/debriefWho.ts, docs/design/parts.md, the DEAR MAN row). It shows only with parts on, at least one kept part,
 * every line shipped and not answered in this visit; otherwise it moves the run on at once (`not_shown`), so a
 * parts-off person never sees the step. Named when the prep that opened the debrief chose a part (`$ctx.partId`).
 * Reports the named form's answer (an id, never the name); the general form is the tag row, which writes its own tag
 * (`general`). Writes are fire and forget inside DebriefWho: nothing here holds up the debrief.
 */
export function DebriefWhoEmbed({ ctx, onShown, onDone }: EmbedProps) {
  const partsOn = useUserProfile().profile.partsEnabled;
  const session = useToolSession();
  const profile = useProfileContext('dear-man', { enabled: partsOn });
  const [content, setContent] = useState<PartsContent | null | undefined>(partsOn ? undefined : null);
  useEffect(() => {
    if (!partsOn) return;
    let live = true;
    Promise.all([getPartsContent(), loadWho()]).then(([c]) => { if (live) setContent(c); }).catch(() => { if (live) setContent(null); });
    return () => { live = false; };
  }, [partsOn]);
  const settled = !partsOn || (content !== undefined && profile.status !== 'loading');
  const shown = settled && showDebriefWho({
    partsOn, partCount: profile.slices?.parts.length ?? 0, ready: debriefWhoReady(content ?? null),
    answered: tagRowAnswered(session.id, 'debrief'),
  });
  const done = useRef(false);
  const answer = useRef<WhoShowedUp | null>(null);
  const finish = (id: string) => {
    if (done.current) return;
    done.current = true;
    onDone?.({ ids: [id] });
  };
  useEffect(() => { if (settled && !shown) finish('not_shown'); });
  useEffect(() => { if (shown) onShown(); }, [shown, onShown]);
  if (!shown || !content || !profile.slices) return null;
  return (
    <Suspense fallback={null}><LazyDebriefWho content={content} parts={profile.slices.parts} copeAheadPartId={ctx?.partId ?? null} toolSessionId={session.id}
        onAnswer={(a) => { answer.current = a; }}
        onDone={() => finish(answer.current ?? (ctx?.partId ? 'skip' : 'general'))} /></Suspense>
  );
}
