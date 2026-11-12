import { useEffect, useState } from 'react';
import { useUserProfile } from '../../contexts/UserProfileContext';
import type { PartsContent } from '../../data/partsContentTypes';
import { partsLineText } from '../../lib/skillRuntime/partsLine';
import { getPartsContent } from '../../services/partsContent';
import { Prompt } from '../tools/wiseMind/bits';
import type { EmbedProps } from './embeds';

/**
 * A parts line (parts copy, `promptId`): only with parts on and only when the line ships in parts.json.
 * Nothing renders otherwise. Names no part. `as: 'heading'` sets it as the screen's question (a slot under the
 * title of a step whose question is parts copy, like Cope Ahead's *Who might show up there?*).
 */
export function PartsLine({ props, onShown }: EmbedProps) {
  const partsOn = useUserProfile().profile.partsEnabled;
  const [content, setContent] = useState<PartsContent | null>(null);
  useEffect(() => {
    if (!partsOn) return;
    let live = true;
    getPartsContent().then((c) => { if (live) setContent(c); }).catch(() => { /* no line */ });
    return () => { live = false; };
  }, [partsOn]);
  const line = partsOn ? partsLineText(content, String(props.promptId ?? '')) : null;
  useEffect(() => { if (line) onShown(); }, [line, onShown]);
  if (!line) return null;
  if (props.as === 'heading') return <Prompt>{line}</Prompt>;
  return <p role="status" className="text-sm text-[var(--color-text-secondary)] italic">{line}</p>;
}
