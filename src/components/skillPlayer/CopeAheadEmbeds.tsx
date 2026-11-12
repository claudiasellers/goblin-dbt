import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { CopeAheadContent } from '../../data/copeAheadTypes';
import type { PartsContent } from '../../data/partsContentTypes';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { useProfileContext } from '../../hooks/useProfileContext';
import { anchorLead, copeAheadPartsReady, keptLines } from '../../lib/copeAhead';
import { fieldAnswer, planLine, runPlanCa, type PlanParts } from '../../lib/copeAheadPlan';
import { capFirst } from '../../lib/partsContent';
import { partChipLabel } from '../../lib/partTag';
import { profileCache } from '../../lib/profileCache';
import { getCopeAheadContent } from '../../services/copeAhead';
import { getPartsContent } from '../../services/partsContent';
import { PaperCard, paperLine } from '../shared/PaperCard';
import { PlanSentence } from '../tools/copeAhead/PlanSentence';
import { Rehearse } from '../tools/copeAhead/Rehearse';
import type { EmbedProps } from './embeds';

/**
 * Cope Ahead's embeds on the skill runtime (ER-B2; docs/design/cope-ahead.md, the skill `cope_ahead`): the plan line
 * as it is built (`planSentence`), the rehearsal (`rehearsal`, a whole screen), the plan on the keepsake paper
 * (`keepCard`) and, parts on, the part's anchor under the plan (`partAnchor`). Each composes the plan with
 * `planLine` (src/lib/copeAheadPlan.ts) over cope-ahead.json from the run's answers, so the screens, the after card
 * and Me say the same words. The field props name the run's fields (build.py checks them).
 */

// The anchor saves through DEAR MAN's setPartAnchor: fetched only when a part is picked (parts on).
const LazyPlanAnchor = lazy(() => import('../tools/copeAhead/PlanAnchor').then((m) => ({ default: m.PlanAnchor })));

function useCopeContent(): CopeAheadContent | null {
  const [c, setC] = useState<CopeAheadContent | null>(null);
  useEffect(() => {
    let live = true;
    getCopeAheadContent().then((x) => { if (live) setC(x); }).catch(() => { /* nothing to show */ });
    return () => { live = false; };
  }, []);
  return c;
}

function usePlan(p: EmbedProps, pass: 1 | 2 = 1): { content: CopeAheadContent | null; plan: PlanParts | null } {
  const content = useCopeContent();
  const ca = runPlanCa(p, pass);
  const key = JSON.stringify(ca);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => (content ? planLine(content, ca) : null), [content, key]);
  return { content, plan };
}

/** The plan line in the serif as the person builds it (a slot under the plan step's title). Nothing until it reads. */
export function PlanSentenceEmbed(p: EmbedProps) {
  const { content, plan } = usePlan(p);
  const text = plan?.text ?? '';
  const { onShown } = p;
  useEffect(() => { if (text) onShown(); }, [text, onShown]);
  if (!content || !plan || !text) return null;
  return (
    <p className="font-serif text-xl leading-snug text-[var(--color-text-primary)] break-words" data-testid="ca-plan-line" aria-live="polite">
      <PlanSentence content={content} plan={plan} />.
    </p>
  );
}

/** The rehearsal, the whole screen: Cope Ahead's beats with the run's moment and plan; its last Next is `done`. */
export function RehearsalEmbed(p: EmbedProps) {
  const pass: 1 | 2 = p.props.pass === 2 ? 2 : 1;
  const { content, plan } = usePlan(p, pass);
  const { onShown } = p;
  const ready = !!content && !!plan;
  useEffect(() => { if (ready) onShown(); }, [ready, onShown]);
  if (!content || !plan) return null;
  const m = fieldAnswer(p, p.props.momentField);
  const moment = m.own ?? content.hardMoments.find((x) => x.id === m.ids[0])?.ifText ?? '';
  return <Rehearse content={content} moment={moment} plan={plan} pass={pass} onDone={() => p.onDone?.({ ids: ['done'] })} />;
}

/** Parts on and Cope Ahead's parts copy shipping: the parts content, else null (nothing about a part shows). */
function usePartsCopy(): PartsContent | null {
  const partsOn = useUserProfile().profile.partsEnabled === true;
  const [c, setC] = useState<PartsContent | null>(null);
  useEffect(() => {
    if (!partsOn) return;
    let live = true;
    getPartsContent().then((x) => { if (live) setC(x); }).catch(() => { /* no parts lines */ });
    return () => { live = false; };
  }, [partsOn]);
  return partsOn && copeAheadPartsReady(c) ? c : null;
}

/** The part the run picked, from the person's own kept parts (never a part id they don't have). */
function usePickedPart(p: EmbedProps, partsCopy: PartsContent | null) {
  const profile = useProfileContext('cope-ahead', { enabled: !!partsCopy });
  const slices = profile.slices;
  const id = fieldAnswer(p, p.props.partField).ids[0] ?? null;
  const part = partsCopy && id ? (slices?.parts.find((x) => x.id === id) ?? null) : null;
  return { part, slices };
}

/**
 * The plan on the keepsake paper (a slot under the keep step's title), with the part's anchor under it when a part
 * was picked and has one: "If {name} shows up: {anchor}". The step's *Keep this* chip is the yes (R4).
 */
export function KeepCardEmbed(p: EmbedProps) {
  const { content, plan } = usePlan(p);
  const partsCopy = usePartsCopy();
  const { part, slices } = usePickedPart(p, partsCopy);
  const text = plan?.text ?? '';
  const { onShown } = p;
  useEffect(() => { if (text) onShown(); }, [text, onShown]);
  if (!content || !plan || !text) return null;
  const anchor = part && partsCopy ? slices?.partAnchors?.[part.id] ?? null : null;
  const lead = part && partsCopy ? (anchorLead(partsCopy, part.name).trim() || `${capFirst(partChipLabel(part, partsCopy))}:`) : '';
  const anchorLine = anchor ? `${lead} ${anchor.trim()}` : null;
  return (
    <PaperCard label={anchorLine ? `${text} ${anchorLine}` : text} data={{ 'data-plan-card': '' }}>
      <p className={paperLine}><PlanSentence content={content} plan={plan} />.</p>
      {anchorLine && <p className="font-serif text-lg leading-snug text-[var(--color-text-secondary)] text-balance" data-anchor="">{anchorLine}</p>}
    </PaperCard>
  );
}

/**
 * Parts on, a part picked: its anchor under the plan, and setting or changing it (DEAR MAN's setPartAnchor, its
 * signed-off cope copy). A slot under the plan's moves. Nothing without a part, or without the copy.
 */
export function PartAnchorEmbed(p: EmbedProps) {
  const partsCopy = usePartsCopy();
  const { part, slices } = usePickedPart(p, partsCopy);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const lines = useMemo(() => keptLines(slices?.ownLines, slices?.savedLines), [slices]);
  const { onShown } = p;
  const shown = !!(part && partsCopy);
  useEffect(() => { if (shown) onShown(); }, [shown, onShown]);
  if (!part || !partsCopy) return null;
  const anchor = saved[part.id] ?? slices?.partAnchors?.[part.id] ?? null;
  return (
    <Suspense fallback={null}>
      <LazyPlanAnchor content={partsCopy} part={part} anchor={anchor} lines={lines}
        onAnchor={(id, text, version) => { setSaved((a) => ({ ...a, [id]: text })); profileCache.bump(version); }} />
    </Suspense>
  );
}
