import { useEffect, useState } from 'react';
import { getEmotionById, getEmotionByName, getRelatedEmotionIds } from '../data/emotions';
import { getRelatedEmotions, type RelatedEmotion } from '../services/neo4j';
import { formatEmotionName, rankRelatedEmotions } from '../lib/feelingSquare';

/**
 * Words the graph relates to `word` (getRelatedEmotions), as display names, minus anything in
 * `exclude`. Same-family neighbours only fill in when the graph returns too few or can't be reached.
 */
export function useRelatedWords(word: string | undefined, exclude: string[], count = 3): string[] {
  // Keyed by the word it was fetched for, so a stale list never shows for a new word.
  const [fetched, setFetched] = useState<{ word: string; list: RelatedEmotion[] } | null>(null);

  useEffect(() => {
    if (!word) return;
    let live = true;
    const id = getEmotionByName(word)?.id ?? word.toLowerCase().replace(/\s+/g, '_');
    const family = getRelatedEmotionIds(id).map((rid) => ({
      id: rid,
      name: getEmotionById(rid)?.name ?? rid,
      reason: 'related feeling',
    }));
    getRelatedEmotions(id)
      .then((graph) => live && setFetched({ word, list: rankRelatedEmotions([...graph, ...family], [word], 12) }))
      .catch(() => live && setFetched({ word, list: rankRelatedEmotions(family, [word], 12) }));
    return () => {
      live = false;
    };
  }, [word]);

  const related = word && fetched?.word === word ? fetched.list : [];
  const skip = new Set(exclude.map((w) => w.toLowerCase()));
  const out: string[] = [];
  for (const r of related) {
    const name = getEmotionByName(formatEmotionName(r.name))?.name ?? getEmotionById(r.id)?.name ?? formatEmotionName(r.name);
    if (skip.has(name.toLowerCase()) || out.includes(name)) continue;
    out.push(name);
    if (out.length === count) break;
  }
  return out;
}
