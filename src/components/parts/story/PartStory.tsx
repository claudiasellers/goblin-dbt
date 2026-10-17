import { useEffect, useState } from 'react';
import type { PartsContent } from '../../../data/partsContentTypes';
import type { GetPartStoryResponse } from '../../../data/partsTypes';
import { getPartStory } from '../../../services/parts';
import { getToolById } from '../../../data/tools';
import { monthName } from '../../../lib/partStats';
import { placeParts } from '../../../lib/den';
import { storyView, type PartStoryCopy, type StoryView } from '../../../lib/partStory';
import { DenRoom, type RoomPart } from '../den/DenRoom';

const deps = { toolName: (id: string) => getToolById(id)?.name ?? null, monthName: (m: string) => monthName(m) };

/**
 * A part's story (docs/design/parts.md, "The part card"): opened in place from its card in Parts of me,
 * or from its figure in the den. One read (getPartStory); while it loads, or if it fails, nothing (Me's
 * rule: no message). `initial` skips the read (the review harness).
 */
export function PartStory({ partId, tender, content, copy, initial }: {
  partId: string;
  tender: boolean;
  content: PartsContent;
  copy: PartStoryCopy;
  initial?: GetPartStoryResponse;
}) {
  const [story, setStory] = useState<GetPartStoryResponse | null>(initial ?? null);

  useEffect(() => {
    if (initial) return;
    let live = true;
    getPartStory({ partId }).then((s) => { if (live) setStory(s); }).catch(() => { /* nothing to show */ });
    return () => { live = false; };
  }, [partId, initial]);

  if (!story) return null;
  return <StoryBody partId={partId} view={storyView(story, content, copy, deps, tender)} whereTitle={copy.story_where} />;
}

function StoryBody({ partId, view, whereTitle }: { partId: string; view: StoryView; whereTitle: string }) {
  const where = view.sections.find((s) => s.key === 'where');
  const others = view.sections.filter((s) => s.key !== 'where');
  return (
    <div className="mt-2 p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] space-y-3" data-part-story="">
      {view.lines.length > 0 && (
        <ul className="space-y-1">
          {view.lines.map((l) => (
            <li key={l.key} className="text-sm text-[var(--color-text-primary)] break-words">
              {l.kind === 'text' ? l.text : (
                <>
                  {l.before}
                  {/* The job as the card shows it: own words in the serif at body size, chip labels as they are. */}
                  <span className={l.own ? 'font-serif text-base leading-snug' : undefined}>{l.words}</span>
                  {l.after}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {others.map((s) => (
        <div key={s.key}>
          <h5 className="text-xs text-[var(--color-text-secondary)]">{s.title}</h5>
          <ul>{s.lines.map((l) => <li key={l} className="text-sm text-[var(--color-text-primary)] break-words">{l}</li>)}</ul>
        </div>
      ))}
      {(where || view.rooms) && (
        <div>
          <h5 className="text-xs text-[var(--color-text-secondary)]">{where?.title ?? whereTitle}</h5>
          {where && <ul>{where.lines.map((l) => <li key={l} className="text-sm text-[var(--color-text-primary)] break-words">{l}</li>)}</ul>}
          {view.rooms && <StoryRooms partId={partId} rooms={view.rooms} />}
        </div>
      )}
    </div>
  );
}

/** That month's room beside today's, small and still, the story's part marked; the parts that are still here, drawn as they are now. */
function StoryRooms({ partId, rooms }: { partId: string; rooms: NonNullable<StoryView['rooms']> }) {
  const now = new Map(rooms.now.map((p) => [p.id, p]));
  const roomPart = (id: string, resting: boolean, tender: boolean): RoomPart => {
    const p = now.get(id)!;
    return { id, name: p.name ?? '', tender: tender || p.tender, resting, shapeSig: p.shapeSig, recency: null };
  };
  const past = rooms.then.filter((p) => now.has(p.id));
  const ids = new Set(past.map((p) => p.id));
  return (
    <div className="mt-2 grid grid-cols-2 gap-3">
      <figure>
        <DenRoom small label={rooms.thenLabel} selected={[partId]} spots={placeParts(past)}
          parts={past.map((p) => roomPart(p.id, p.status === 'resting', p.tender))}
          links={rooms.links.filter((l) => ids.has(l.aId) && ids.has(l.bId))} />
        <figcaption className="mt-1 text-xs text-center text-[var(--color-text-secondary)]">{rooms.thenLabel}</figcaption>
      </figure>
      <figure>
        <DenRoom small label={rooms.nowLabel} selected={[partId]} spots={placeParts(rooms.now)}
          parts={rooms.now.map((p) => roomPart(p.id, p.status === 'resting', p.tender))} links={rooms.links} />
        <figcaption className="mt-1 text-xs text-center text-[var(--color-text-secondary)]">{rooms.nowLabel}</figcaption>
      </figure>
    </div>
  );
}
