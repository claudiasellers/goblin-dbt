import { useEffect, useRef } from 'react';
import { useToolSession } from '../../hooks/useToolSession';
import { SkillPlayer } from './SkillPlayer';
import type { EmbedProps } from './embeds';

/**
 * One skill run inside another's screen (R8, plan C3b `inlineSkill`, runtime-owned; first host FAST's Let go running
 * Let it be, IE-B4). The sub-run is the player in `mode="inline"`: its own ToolSession inside the host's, its own
 * steps, no close question of its own; it gives back on its hand-off or on *Back to where I was*.
 *
 * A hand-off gives back at once, so whatever that card would have shown (a crisis slot, its offers) is the host's to
 * show: the output ids are the skill's `inline.ends` outcome for where it ended (`finished` when the step isn't named,
 * `left` when the person went back early), then each `inline.flags` id that held (`unsafe`), and the host's
 * transitions branch on them.
 *
 * Output: `finished`, `left`, `stopped`, `body`, `unsafe`.
 */
export function InlineSkillEmbed({ props, onShown, onDone, covered }: EmbedProps) {
  const toolSession = useToolSession();
  const shown = useRef(false);
  useEffect(() => {
    if (!shown.current) {
      shown.current = true;
      onShown();
    }
  }, [onShown]);
  const skillId = typeof props.skill === 'string' ? props.skill : '';
  const enterAt = typeof props.enterAt === 'string' ? props.enterAt : undefined;
  if (!skillId || !toolSession.id) return null;
  return (
    <div data-testid="inline-skill" data-inline-skill={skillId}>
      <SkillPlayer skillId={skillId} mode="inline" enterAt={enterAt} hostSessionId={toolSession.id} covered={covered}
        onReturn={(r) => onDone?.({ ids: r.ids })} />
    </div>
  );
}
