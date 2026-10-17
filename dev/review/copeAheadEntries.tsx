/**
 * The ways into Cope Ahead on the review page (lane 2, cope-ahead-entries): DEAR MAN's summary *Rehearse it*
 * and Today's *Rehearse the next time* (Recover's `recover_rehearse`) with *Walk through it with Cope Ahead*.
 * The links are the app's CopeAheadEntryLink (src/components/tools/copeAhead/), labels from
 * src/data/content/cope-ahead.json; Today's card is the app's TodayCard with the spine's own copy. Each
 * frame names the href its link must have, and dev/review/check.mjs checks every Cope Ahead href's shape and
 * that it is the one the branch expects (COPE_ENTRY_HREF). Not a parts surface.
 */
import CA from '../../src/data/content/cope-ahead.json';
import SPINE from '../../src/data/content/spine.json';
import type { CopeAheadContent } from '../../src/data/copeAheadTypes';
import type { TodayItem } from '../../src/services/spine';
import { CopeAheadEntryLink } from '../../src/components/tools/copeAhead/CopeAheadEntryLink';
import { TodayCard } from '../../src/components/today/TodayCard';
import { copeAheadLink } from '../../src/lib/copeAheadEntry';
import { RECOVER_FOLLOW_UP_TYPES } from '../../src/lib/spine/wrap';
import { COPE_AHEAD_PACK } from './copeAheadClosing';
import { PART_IDS } from './data';
import { logEvent } from './backend';
import type { Branch, Surface } from './surfaces';

const C = CA.content as unknown as CopeAheadContent;
const copy = (k: string) => C.copy[k] ?? '';

interface Row extends Branch {
  kind: 'dear_man' | 'today';
  /** DEAR MAN: parts on with a part picked in prep (cope ahead step). */
  part?: boolean;
  compact?: boolean;
  /** The line the branch is there to show, and the href its link must have. */
  expect: string; href: string;
}

const ROWS: Row[] = [
  { id: 'dear_man', label: 'DEAR MAN summary: Rehearse it (no part, or parts off)', kind: 'dear_man',
    expect: copy('entry_dear_man'), href: copeAheadLink({ situationId: 'conversation' }) },
  { id: 'dear_man_part', label: 'DEAR MAN summary: Rehearse it, the part picked in prep carried in (parts on)', kind: 'dear_man', part: true,
    expect: copy('entry_dear_man'), href: copeAheadLink({ situationId: 'conversation', partId: PART_IDS.chase }) },
  { id: 'today', label: 'Today: Rehearse the next time (Recover), with Walk through it with Cope Ahead', kind: 'today',
    expect: copy('entry_recover'), href: copeAheadLink({ situationId: 'someone' }) },
  { id: 'today_compact', label: 'Today, in the header sheet (compact)', kind: 'today', compact: true,
    expect: copy('entry_recover'), href: copeAheadLink({ situationId: 'someone' }) },
];

const mockNote = 'text-[11px] tracking-wide text-[var(--color-text-tertiary)]';

/** The DEAR MAN summary's foot as the page draws it: the plan card above, then the quiet next steps. */
function DearManFoot({ row }: { row: Row }) {
  return (
    <div className="space-y-6">
      <p className={mockNote}>… Your Conversation Plan, saved or not, above …</p>
      <CopeAheadEntryLink copyKey="entry_dear_man" situationId="conversation" partId={row.part ? PART_IDS.chase : null} />
      <button type="button" onClick={() => logEvent('DEAR MAN debrief', {})}
        className="w-full min-h-11 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
        After the conversation &rarr; How did it go?
      </button>
    </div>
  );
}

const rehearseType = SPINE.content.followUpTypes.find((t) => t.id === RECOVER_FOLLOW_UP_TYPES.rehearse)!;
const REHEARSE_ITEM: TodayItem = {
  id: '00000000-0000-4000-8000-000000000701', kind: 'follow_up', type: rehearseType.id, tier: 'quality', state: 'due',
  dueAt: '2026-10-17T18:00:00.000Z', resolveMode: 'inline', deepLink: null,
  choices: rehearseType.choices as TodayItem['choices'], copy: rehearseType.copy,
};

export const COPE_ENTRIES_SURFACE: Surface = {
  id: 'cope-ahead-entries', pack: COPE_AHEAD_PACK.id, title: 'Cope Ahead: the ways in (DEAR MAN, Today)',
  who: 'Everyone: DEAR MAN’s summary (the part only with parts on), and Today’s Rehearse the next time after Recover. The link’s href shows under each frame.',
  branches: ROWS.map(({ id, label }) => ({ id, label })),
  render: ({ branch }) => {
    const row = ROWS.find((r) => r.id === branch) ?? ROWS[0];
    return (
      <div className="space-y-3">
        {row.kind === 'dear_man'
          ? <DearManFoot row={row} />
          : <TodayCard item={REHEARSE_ITEM} compact={row.compact === true} onDone={(id) => logEvent('Today onDone', { id })} />}
        <p className={mockNote}>Link: <code>{row.href}</code></p>
      </div>
    );
  },
};

/** The line each branch is there to show (dev/review/check.mjs), and the href its link must have. */
export const COPE_ENTRIES_EXPECT: Record<string, string> = Object.fromEntries(ROWS.map((r) => [`cope-ahead-entries/${r.id}`, r.expect]));
export const COPE_ENTRY_HREF: Record<string, string> = Object.fromEntries(ROWS.map((r) => [`cope-ahead-entries/${r.id}`, r.href]));
