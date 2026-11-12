import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getMicroStep, type MicroStep } from '../../data/microSteps';
import { getToolById } from '../../data/tools';
import { useOfficialNames } from '../../hooks/useOfficialNames';
import { recordToolSession } from '../../services/spine';
import { newId } from '../../lib/spine/ids';
import { HELP_NOW_MICRO_STEP_SET, HELP_NOW_QUERY, HELP_NOW_TOOL_IDS, helpNowLinkState } from '../../lib/spine/helpNow';

/**
 * "Help me now" from the check-in grid (PR-C2, D-08 interim). One safe body step, a way to get
 * another, and two quiet links (Cool Down to calm, 5-4-3-2-1 to come back into the room).
 * Records one `help-now` ToolSession when signed in; never a check-in, never a routing call.
 */
export function HelpNowInterim({ onDone }: { onDone: () => void }) {
  const { label } = useOfficialNames();
  const { user } = useAuth();
  const [pick, setPick] = useState<{ step: MicroStep; index: number }>(() => getMicroStep(HELP_NOW_MICRO_STEP_SET));
  const [sessionId] = useState(() => newId());
  const [done, setDone] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const record = (status: 'completed' | 'exited_early') => {
    if (!user || recorded) return;
    setRecorded(true);
    void recordToolSession({
      id: sessionId, toolId: 'help-now', entry: 'checkin_grid', status,
      ext: { core: { microStepId: pick.step.id } },
    }).catch(() => { /* best effort */ });
  };

  if (done) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] px-6">
        <div className="text-center animate-fade-in space-y-6">
          <p className="text-xl text-[var(--color-text-secondary)] font-medium leading-relaxed">That counts.</p>
          <button type="button" onClick={onDone}
            className="min-h-11 text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
            Back to check-in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6">
      <div className="text-center mb-10 max-w-sm">
        <p className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-primary)] leading-snug mb-4">{pick.step.text}</p>
        {pick.step.subtext && <p className="text-base text-[var(--color-text-tertiary)] leading-relaxed">{pick.step.subtext}</p>}
      </div>
      <button type="button" onClick={() => { record('completed'); setDone(true); }}
        className="w-full max-w-xs py-4 px-6 rounded-xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium text-lg lift-primary">
        I did it
      </button>
      <button type="button" onClick={() => setPick(getMicroStep(HELP_NOW_MICRO_STEP_SET, pick.index))}
        className="mt-4 min-h-11 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
        Show me something else
      </button>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        {HELP_NOW_TOOL_IDS.map((id) => {
          const tool = getToolById(id);
          if (!tool) return null;
          return (
            <Link key={id} to={`/tool/${id}${HELP_NOW_QUERY[id] ? `?${HELP_NOW_QUERY[id]}` : ''}`} state={helpNowLinkState(user ? sessionId : null)}
              onClick={() => record('exited_early')}
              className="min-h-11 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] underline underline-offset-2 hover:text-[var(--color-text-primary)]">
              <span aria-hidden="true">{tool.emoji}</span> {label(tool)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
