import { newId } from '../../lib/spine/ids';
import { tagPart } from '../../services/parts';
import type { PartsContent } from '../../data/partsContentTypes';
import type { ProfileSlices } from '../../data/profileTypes';
import { debriefForm, debriefTag, generalQuestion, namedCopy, type WhoShowedUp } from '../../lib/debriefWho';
import { PartTagRow } from '../spine/PartTagRow';
import { markTagRowAnswered } from '../../lib/tagRowOnce';

const chip = 'min-h-11 px-4 py-2 rounded-full border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)] transition-colors';
const quiet = 'min-h-11 px-3 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]';

/**
 * DEAR MAN's debrief: who showed up? (src/lib/debriefWho.ts). The debrief skill's `debriefWho` embed mounts it
 * only when the gate holds. Every tap moves on (`onDone`); writes are fire and forget, so nothing here
 * ever holds up the debrief. The named form reports its answer (`onAnswer`, for ext); the general form
 * is the tag row itself (its chips, A new one → later, Skip), with the debrief's question.
 */
export function DebriefWho({ content, parts, copeAheadPartId, toolSessionId, onAnswer, onDone }: {
  content: PartsContent;
  parts: ProfileSlices['parts'];
  copeAheadPartId: string | null;
  toolSessionId: string;
  onAnswer(answer: WhoShowedUp): void;
  onDone(): void;
}) {
  const form = debriefForm(copeAheadPartId, parts);
  if (form.kind === 'general') {
    return <PartTagRow toolId="dear-man" toolSessionId={toolSessionId} content={content} question={generalQuestion(content)} debrief onGone={onDone} />;
  }
  const copy = namedCopy(content, form.name);
  // Answered (Skip too) once per session on this page: DEAR MAN doesn't ask again on Back.
  const skip = () => { markTagRowAnswered(toolSessionId, 'debrief'); onDone(); };
  const answer = (a: WhoShowedUp) => {
    markTagRowAnswered(toolSessionId, 'debrief');
    if (a !== 'no') tagPart(debriefTag(newId(), form.partId, toolSessionId, a)).catch(() => { /* a missed tag is only a missed signal */ });
    onAnswer(a);
    onDone();
  };
  return (
    <section aria-label={copy.question} className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{copy.question}</h3>
      <div className="flex flex-wrap items-center gap-2">
        {copy.answers.map((a) => (
          <button key={a.id} type="button" className={chip} onClick={() => answer(a.id)}>{a.label}</button>
        ))}
        <button type="button" className={quiet} onClick={skip}>{copy.skip}</button>
      </div>
    </section>
  );
}
