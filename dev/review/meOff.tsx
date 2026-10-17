/**
 * Me with parts off (lane 4, parts-reachable): the quiet card with the parts switch where Parts of me
 * would be, and what turning it on there shows. The card, its gate and Parts of me are the app's own;
 * the host stands in for MeSection's state (the setting, the card's "turned on here", getMe bringing the
 * area a moment later). Kept in its own file so other lanes' blocks in ./surfaces.tsx don't collide.
 */
import { useEffect, useState } from 'react';
import type { PartsContent } from '../../src/data/partsContentTypes';
import { getPartsContent } from '../../src/services/partsContent';
import { dismissCandidateRequest, partsOfMeCopy } from '../../src/lib/partsOfMe';
import { partsMeOffCopy, partsOffCardShown } from '../../src/lib/partsSettings';
import { answerPartCandidate } from '../../src/services/parts';
import { PartsOffCard } from '../../src/components/parts/PartsOffCard';
import { PartsOfMe } from '../../src/components/me/PartsOfMe';
import { logEvent } from './backend';
import { CANDIDATES, ME_ITEMS } from './data';
import type { Surface } from './surfaces';

const mockNote = 'text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]';

function MeOffHost({ on }: { on: boolean }) {
  const [content, setContent] = useState<PartsContent | null>(null);
  const [partsOn, setPartsOn] = useState(on);
  const [turnedOnHere, setTurnedOnHere] = useState(false);
  const [areaShown, setAreaShown] = useState(on);
  useEffect(() => { getPartsContent().then(setContent).catch(() => { /* stays empty */ }); }, []);
  // getMe again once the setting lands: the area arrives a moment later, as in Me.
  useEffect(() => {
    const t = setTimeout(() => setAreaShown(partsOn), 300);
    return () => clearTimeout(t);
  }, [partsOn]);
  const offCopy = partsMeOffCopy(content);
  const partsCopy = partsOn ? partsOfMeCopy(content) : null;
  const area = areaShown && partsOn && partsCopy !== null;
  if (!content) return null;
  return (
    <section className="space-y-2">
      <p className={mockNote}>Me (parts {partsOn ? 'on' : 'off'}), after My patterns</p>
      {area && partsCopy && (
        <section aria-label="Parts of me" className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Parts of me</h3>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-2">The area's name and blurb come from getMe (profile-layer content).</p>
          <PartsOfMe items={ME_ITEMS} candidates={CANDIDATES} content={content} copy={partsCopy}
            onWrite={(p) => p.then(() => undefined)}
            onDismiss={async (id) => { await answerPartCandidate(dismissCandidateRequest(id)); }} />
        </section>
      )}
      {offCopy && partsOffCardShown({ copyReady: true, partsOn, turnedOnHere, partsAreaShown: area }) && (
        <PartsOffCard copy={offCopy} enabled={partsOn} onToggle={(v) => {
          if (v) setTurnedOnHere(true);
          logEvent('updateUserProfile', { partsEnabled: v });
          setPartsOn(v);
        }} />
      )}
    </section>
  );
}

export const ME_OFF_SURFACE: Surface = {
  id: 'me_off', pack: 'me', title: 'Me with parts off: the parts switch',
  who: 'Signed in, parts off: Me, where Parts of me would be. The switch is the one in Settings (one write); turning it on here brings Parts of me in its place.',
  branches: [
    { id: 'off', label: 'Parts off: the card' },
    { id: 'on', label: 'After turning it on: Parts of me in its place' },
  ],
  render: ({ branch }) => <MeOffHost on={branch === 'on'} />,
};
