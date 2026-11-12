import { useEffect, useState } from 'react';
import type { OppositeActionPickerContent } from '../../data/oppositeActionPickerTypes';
import { addWords, type Pick } from '../../lib/oppositeActionPicker';
import { getOppositeActionPickerContent } from '../../services/oppositeActionPicker';
import { OppositeActionStart } from '../tools/oppositeAction/OppositeActionStart';
import { ToolLoading } from '../tools/ToolLoading';
import type { EmbedProps } from './embeds';

/**
 * Do the Opposite's doors as a whole-screen embed (`doorPicker`, ER-03, the skill's first step): #48's start screen,
 * unchanged. One door per DBT parent, three other ways in, up to three feelings, loudest first. Words a link or
 * hand-off carried arrive picked (the person still taps on); words Do the Opposite doesn't work on are said so.
 * Reports the picks' grid word ids in order, loudest first (EMBED_OUTPUTS `emotions: 3`: the machine keeps only grid
 * words). The doors' content ships with the app (opposite-action-picker.json, generated from the graph).
 */
export function DoorPickerEmbed({ carried, onShown, onDone }: EmbedProps) {
  const [content, setContent] = useState<OppositeActionPickerContent | null>(null);
  const [failed, setFailed] = useState(false);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  // The carried words seed the picks once, on arrival.
  const [initial] = useState(() => [...(carried ?? [])]);

  useEffect(() => {
    let live = true;
    getOppositeActionPickerContent()
      .then((c) => {
        if (!live) return;
        setContent(c);
        if (initial.length) {
          const r = addWords([], c, initial);
          setPicks(r.picks);
          setSkipped(r.skipped);
        }
      })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [initial]);

  useEffect(() => { if (content) onShown(); }, [content, onShown]);

  if (failed) {
    return (
      <p role="alert" className="text-[var(--color-text-secondary)]">
        The feelings could not load. Check your connection and try again.
      </p>
    );
  }
  if (!content) return <ToolLoading label="Loading…" />;
  return (
    <OppositeActionStart
      content={content}
      picks={picks}
      onPicks={setPicks}
      skipped={skipped}
      onSkipped={setSkipped}
      onStart={(ordered) => { if (ordered.length) onDone?.({ ids: ordered.map((p) => p.wordId) }); }}
      loading={false}
      error=""
    />
  );
}
