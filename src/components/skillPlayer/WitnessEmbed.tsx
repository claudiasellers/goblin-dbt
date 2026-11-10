import { useCallback, useEffect, useRef, useState } from 'react';
import { BANDS, type Band } from '../../data/capacityTypes';
import type { WitnessLine, WitnessMoment } from '../../data/witnessTypes';
import { useToolSession } from '../../hooks/useToolSession';
import { profileCache } from '../../lib/profileCache';
import { beatRequest, witnessOutcome, type WitnessResult } from '../../lib/witness';
import { recordWitnessBeat } from '../../services/witness';
import { WitnessBeat } from '../witness/WitnessBeat';
import { primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * witness (docs/design/dbt-modules-plan.md C3b; foundation, F2): the receive beat, WitnessBeat as it is, in a
 * skill. The echo is the labels of `wordsFrom` (a field of the skill); `emotionsFrom` sends that field's ids so
 * the server can pick a line for them; `$ctx.urgeId` / `$ctx.situationId` go with it; the band is the run's
 * (`$ctx.band`, else stirred; flooded is the one-line header with no question). The beat is logged against this
 * visit's ToolSession (host `tool_session`) once the session is written, every answer again, as the check-in
 * does. As a slot it sits under its field and never gates anything; as a whole step, the way on (`next`) is
 * there from the start and answers with what the person did (`witnessOutcome`).
 */
export function WitnessEmbed({ props, ctx, picked, answerIds, onShown, onDone }: EmbedProps) {
  const session = useToolSession();
  const moment = String(props.moment ?? '') as WitnessMoment;
  const wordsFrom = typeof props.wordsFrom === 'string' ? props.wordsFrom : null;
  const emotionsFrom = typeof props.emotionsFrom === 'string' ? props.emotionsFrom : null;
  const words = wordsFrom ? [...(picked?.[wordsFrom] ?? [])] : [];
  const emotionIds = emotionsFrom ? [...(answerIds?.[emotionsFrom] ?? [])] : [];
  const band: Band = (BANDS as readonly string[]).includes(ctx?.band ?? '') ? (ctx?.band as Band) : 'stirred';
  const [result, setResult] = useState<WitnessResult | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const shown = useRef(false);

  // The words and emotions are read once: the beat is about what the person said before it, not after.
  const [fixed] = useState(() => ({ words, emotionIds }));

  const log = useCallback((r: WitnessResult, lines: WitnessLine[]) => {
    if (!session.persisted) return;
    const req = beatRequest({ checkInId: session.id, hostKind: 'tool_session', moment, band, lines, result: r, emotionIds: fixed.emotionIds });
    queue.current = queue.current
      .then(() => session.ready())
      .then((ok) => (ok ? recordWitnessBeat(req) : null))
      .then((res) => { if (res?.profileVersion != null) profileCache.bump(res.profileVersion); })
      .catch(() => { /* the beat is a nicety: the run goes on */ });
  }, [session, moment, band, fixed]);

  const onLine = useCallback((r: WitnessResult, lines: WitnessLine[]) => {
    if (!shown.current) { shown.current = true; onShown(); }
    log(r, lines);
  }, [log, onShown]);
  const onAnswer = useCallback((r: WitnessResult, lines: WitnessLine[]) => { setResult(r); log(r, lines); }, [log]);

  // The echo alone (no line served) still counts as shown once the person's words are on screen.
  useEffect(() => {
    if (fixed.words.length && !shown.current) { shown.current = true; onShown(); }
  }, [fixed.words.length, onShown]);

  return (
    <div className="space-y-2">
      <WitnessBeat hostToolId={session.toolId || 'skill'} moment={moment} band={band} words={fixed.words}
        emotionIds={fixed.emotionIds} urgeId={ctx?.urgeId} situationId={ctx?.situationId}
        onShown={onLine} onDone={onAnswer} />
      {onDone && (
        <button type="button" className={primaryButton} onClick={() => onDone({ ids: [witnessOutcome(result)] })}>
          {String(props.next ?? '')}
        </button>
      )}
    </div>
  );
}
